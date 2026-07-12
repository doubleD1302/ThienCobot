import {
  SlashCommandBuilder,
  EmbedBuilder
} from 'discord.js';

import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed, layMauCanhGioi } from '../views/BoTaoEmbed.js';
import { WorldBoss } from '../models/WorldBoss.js';
import { TuSi } from '../models/TuSi.js';
import { Inventory } from '../models/Inventory.js';
import { Item } from '../models/Item.js';
import { PlayerSkill } from '../models/PlayerSkill.js';
import { Skill } from '../models/Skill.js';
import { Pet } from '../models/Pet.js';
import * as config from '../config.js';

class BoDieuKhienDmg extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhDmg = {
    data: new SlashCommandBuilder()
      .setName('dmg')
      .setDescription('Thử nghiệm sát thương lên hình nhân mô phỏng trong 15 hiệp')
      .addSubcommand(subcommand =>
        subcommand
          .setName('boss')
          .setDescription('Đánh thử nghiệm lên hình nhân mô phỏng World Boss hiện tại')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('pvp')
          .setDescription('Đánh thử nghiệm lên hình nhân mô phỏng người chơi khác')
          .addUserOption(option =>
            option.setName('user')
              .setDescription('Người chơi muốn mô phỏng')
              .setRequired(true)
          )
      ),

    execute: async (interaction) => {
      await interaction.deferReply();

      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      const subcommand = interaction.options.getSubcommand();
      let dummy = {
        ten: '',
        vatPhong: 0,
        phapPhong: 0,
        giap: 0,
        ne: 0
      };

      if (subcommand === 'boss') {
        let bossRealm = 'Luyện Khí';
        if (tuSi.capDo >= 13) bossRealm = 'Kim Đan';
        else if (tuSi.capDo >= 10) bossRealm = 'Trúc Cơ';
        const boss = await WorldBoss.findOne({ where: { idGuild: interaction.guildId, realm: bossRealm, active: true } });
        if (boss) {
          dummy.ten = `${boss.ten} [Hình Nhân]`;
          dummy.vatPhong = boss.vatPhong;
          dummy.phapPhong = boss.phapPhong;
          dummy.giap = boss.giap;
          dummy.ne = 0;
        } else {
          // Default level 10 boss dummy
          dummy.ten = 'Hình Nhân Cự Thú Thái Cổ (Mô Phỏng Cấp 10)';
          dummy.vatPhong = 10 * 100 + 50;
          dummy.phapPhong = 10 * 100 + 50;
          dummy.giap = 10 * 10 + 20;
          dummy.ne = 0;
        }
      } else if (subcommand === 'pvp') {
        const targetUser = interaction.options.getUser('user');
        if (targetUser.id === interaction.user.id) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi('Không thể tạo hình nhân mô phỏng chính bản thân mình!')]
          });
        }

        const targetTuSi = await TuSi.findOne({ where: { idNguoiDung: targetUser.id } });
        if (!targetTuSi) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi('Đối phương chưa có nhân vật, không thể mô phỏng!')]
          });
        }

        const targetEquipped = await Inventory.findAll({ where: { idNguoiDung: targetTuSi.idNguoiDung, trangBi: true } });
        const targetPet = await Pet.findOne({ where: { userId: targetTuSi.idNguoiDung, isActive: true } });
        const targetStats = await targetTuSi.layChiSoDayDu();

        dummy.ten = `Hình Nhân ${targetTuSi.ten}`;
        dummy.vatPhong = targetStats.vat_phong;
        dummy.phapPhong = targetStats.phap_phong;
        dummy.giap = targetStats.giap;
        dummy.ne = targetStats.ne || 0;
      }

      // Load attacker stats
      const equippedInv = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true } });
      const activePet = await Pet.findOne({ where: { userId: tuSi.idNguoiDung, isActive: true } });
      const stats = await tuSi.layChiSoDayDu();

      // Treasures
      const activeTreasures = [];
      for (const eq of equippedInv) {
        const detail = await Item.findByPk(eq.itemId);
        if (detail && detail.loai === 'Cổ Bảo Chủ Động') {
          eq.item = detail;
          activeTreasures.push(eq);
        }
      }

      // Pháp Bảo
      const dharmaTreasures = [];
      for (const eq of equippedInv) {
        const detail = await Item.findByPk(eq.itemId);
        if (detail && detail.loai === 'Pháp Bảo') {
          eq.item = detail;
          dharmaTreasures.push(eq);
        }
      }

      let playerAtkMult = 1.0;
      let pbExtraDmg = 0;
      const pbLogs = [];
      const activeBuffs = [];
      for (const eq of dharmaTreasures) {
        const activeSkill = config.layKyNangPhapBaoActive(eq.item || eq.itemId, stats);
        if (activeSkill) {
          if (activeSkill.loai === 'tan_cong' || activeSkill.loai === 'hon_hop') {
            pbExtraDmg += activeSkill.triGia;
            pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Gây thêm \`+${activeSkill.triGia}\` sát thương.`);
          } else if (activeSkill.loai === 'tang_cong_pct') {
            activeBuffs.push({
              ten: activeSkill.ten,
              pbTen: eq.item.ten,
              loai: 'tang_cong_pct',
              triGia: activeSkill.triGia,
              roundsLeft: activeSkill.duration
            });
            pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Tăng \`+${activeSkill.triGia}%\` Công trong \`${activeSkill.duration}\` hiệp.`);
          }
        }
      }

      // Skills
      const learned = await PlayerSkill.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true } });
      const skills = [];
      for (const psk of learned) {
        const detail = await Skill.findByPk(psk.skillId);
        if (detail) {
          skills.push({ detail, capDo: psk.capDo, nextRoundAvailable: 1 });
        }
      }

      let round = 1;
      let totalDmg = 0;
      let critCount = 0;
      let skillCastCount = 0;
      const battleLogs = [];
      const isPhysical = tuSi.huongTu === 'The Tu' || tuSi.huongTu === 'Thể Tu';
      const basePlayerAtk = isPhysical ? stats.vat_cong : stats.phap_cong;
      const targetDef = isPhysical ? dummy.vatPhong : dummy.phapPhong;

      const petTemplate = activePet ? config.PET_TEMPLATES[activePet.type] : null;
      const isKyLanActive = petTemplate && petTemplate.species === 'ky_lan';
      const isHuyenVuActive = petTemplate && petTemplate.species === 'huyen_vu';

      if (isHuyenVuActive) {
        battleLogs.push(`🐢 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Bảo vệ tích lũy 🐢**: Tăng \`+2%\` Công mỗi hiệp đấu trôi qua.`);
      }

      if (pbLogs.length > 0) {
        battleLogs.push(pbLogs.join('\n'));
      }

      let simMp = stats.max_mp;
      let tuKhiActive = 0;
      let chienYStacks = 0;
      let chienYDuration = 0;
      let monsterTanKhiRounds = 0;
      let monsterTanKhiPct = 0;

      while (round <= 15) {
        // Hỏa Lôi Đạp burn damage
        for (const buff of activeBuffs) {
          if (buff.loai === 'hoa_loi_dap' && buff.roundsLeft > 0) {
            const burnDmg = Math.floor(stats.vat_cong * buff.triGia);
            totalDmg += burnDmg;
            battleLogs.push(`🔥 **Hỏa Lôi Đạp**: Thiêu đốt đối phương gây \`+${burnDmg.toLocaleString()}\` sát thương vật lý.`);
          }
        }

        let roundAtkMult = playerAtkMult;
        for (const buff of activeBuffs) {
          if (buff.loai === 'tang_cong_pct' && buff.roundsLeft > 0) {
            roundAtkMult += buff.triGia / 100;
          } else if (buff.loai === 'huyet_mach_cuong_hoa' && buff.roundsLeft > 0) {
            roundAtkMult += buff.triGia;
          } else if (buff.loai === 'tu_duong_chuong' && buff.roundsLeft > 0) {
            roundAtkMult += buff.triGia;
          } else if (buff.loai === 'hong_hoang_kich_buff' && buff.roundsLeft > 0) {
            roundAtkMult += buff.triGia;
          }
        }
        if (chienYStacks > 0 && chienYDuration > 0) {
          const skillHKPT = skills.find(s => s.detail.id === 'huyet_khi_phun_trao');
          const capDoHKPT = skillHKPT ? skillHKPT.capDo : 1;
          const vatCongBonusPerStack = 0.08 * (1 + (capDoHKPT - 1) * 0.01);
          roundAtkMult += chienYStacks * vatCongBonusPerStack;
        }
        if (isHuyenVuActive) {
          const huyenVuBuff = (round - 1) * 0.02;
          roundAtkMult += huyenVuBuff;
        }
        const currentRoundPlayerAtk = Math.floor(basePlayerAtk * roundAtkMult);

        const readySkill = skills.find(s => {
          const cost = config.getSkillMpCost(s.detail);
          return s.nextRoundAvailable <= round && simMp >= cost;
        });
        let pDmg = 0;
        let isCrit = Math.random() <= stats.crit_rate;
        if (isCrit) critCount++;
        let castMsg = '';

        if (readySkill) {
          const skill = readySkill.detail;
          const capDo = readySkill.capDo;
          const cost = config.getSkillMpCost(skill);
          simMp = Math.max(0, simMp - cost);

          const isKimDan = skill.yeuCauCanhGioi === 13;
          const isLuyenKhi = ['tu_khi_thuat', 'linh_phao_thuat', 'huyet_khi_phun_trao', 'bang_son_quyen'].includes(skill.id);
          const levelBonus = (isKimDan || isLuyenKhi) ? 0.01 : 0.1;
          const skillMult = (skill.satThuong / 100) * (1 + (capDo - 1) * levelBonus);
          let rawDmg = currentRoundPlayerAtk * skillMult;

          castMsg = `thi triển **${skill.ten} (Cấp ${capDo})**`;

          // Combo / Hiệu ứng kỹ năng Luyện Khí
          if (skill.loai === 'Phép thuật' && tuKhiActive > 0) {
            const skillTKT = skills.find(s => s.detail.id === 'tu_khi_thuat');
            const capDoTKT = skillTKT ? skillTKT.capDo : 1;
            const bonusPct = 0.20 * (1 + (capDoTKT - 1) * 0.01);
            rawDmg = rawDmg * (1 + bonusPct);
            
            if (skill.id === 'linh_phao_thuat') {
              battleLogs.push(`   💥 **Linh Pháo Kích Nổ**: Kích hoạt combo Tụ Khí, gây thêm 30% sát thương lan!`);
              rawDmg = rawDmg * 1.30;
            } else {
              battleLogs.push(`   🌀 **Tụ Khí Kích Phát**: Sát thương của chiêu thức phép thuật này tăng thêm \`+${Math.round(bonusPct * 100)}%\`!`);
            }
            tuKhiActive = 0; // Tiêu hao trạng thái Tụ Khí
          }

          if (skill.id === 'bang_son_quyen' && chienYStacks >= 2) {
            const critBonus = 0.20 * (1 + (capDo - 1) * 0.01);
            stats.crit_rate += critBonus;
            isCrit = Math.random() <= stats.crit_rate;
            chienYStacks = 0;
            chienYDuration = 0;
            castMsg = `thi triển **Toái Đỉnh Quyền (Cấp ${capDo})**`;
            battleLogs.push(`   👊 **Toái Đỉnh Quyền**: Tiêu hao toàn bộ tầng Chiến Ý chuyển hóa Băng Sơn Quyền, tăng \`+${Math.round(critBonus * 100)}%\` tỷ lệ bạo kích và khiến mục tiêu bị **[Choáng]** trong 1 hiệp!`);
          }

          if (isCrit) rawDmg = rawDmg * stats.crit_dmg;

          let targetDefFinal = targetDef;
          if (skill.id === 'bat_hoang_toai_thach_kich') {
            const ignorePct = Math.min(1.0, 0.10 * (1 + (capDo - 1) * 0.01));
            targetDefFinal = Math.floor(targetDef * (1 - ignorePct));
          }
          if (monsterTanKhiRounds > 0) {
            targetDefFinal = Math.floor(targetDefFinal * (1 - monsterTanKhiPct));
          }
          pDmg = Math.max(1, Math.floor(rawDmg) - targetDefFinal);
          if (skill.satThuong === 0) pDmg = 0;

          const cooldownRounds = Math.max(1, Math.ceil(skill.cooldown / 3));
          readySkill.nextRoundAvailable = round + cooldownRounds;

          skillCastCount++;

          // Xử lý hiệu ứng đặc biệt giả lập
          if (skill.id === 'tu_khi_thuat') {
            const mpRecPct = 0.15 * (1 + (capDo - 1) * 0.01);
            const mpRecAmt = Math.floor(stats.max_mp * mpRecPct);
            simMp = Math.min(stats.max_mp, simMp + mpRecAmt);
            tuKhiActive = 2;
            pbLogs.push(`🌀 **${skill.ten}**: Hồi phục \`+${mpRecAmt.toLocaleString()}\` MP và nhận trạng thái **[Tụ Khí]** trong 2 hiệp giả lập.`);
          }
          if (skill.id === 'huyet_khi_phun_trao') {
            chienYStacks = Math.min(3, (chienYStacks || 0) + 1);
            chienYDuration = 3;
            pbLogs.push(`🔥 **${skill.ten}**: Tích lũy 1 tầng **[Chiến Ý]** (Hiện tại: \`${chienYStacks}/3\` tầng, kéo dài 3 hiệp giả lập).`);
          }
          if (skill.id === 'tu_duong_chuong') {
            const phapCongBonus = 0.10 * (1 + (capDo - 1) * 0.01);
            activeBuffs.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'tu_duong_chuong',
              triGia: phapCongBonus,
              roundsLeft: 3
            });
            monsterTanKhiRounds = 2;
            monsterTanKhiPct = 0.15 * (1 + (capDo - 1) * 0.01);
            pbLogs.push(`🔥 **${skill.ten}**: Gây [Tán Khí] giảm \`-${Math.round(monsterTanKhiPct * 100)}%\` Kháng Pháp đối phương, tăng \`+10%\` Pháp công bản thân.`);
          }
          if (skill.id === 'phap_tuong_kim_cang') {
            const hpHealPct = 0.08 * (1 + (capDo - 1) * 0.01);
            activeBuffs.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'phap_tuong_kim_cang_regen',
              triGia: hpHealPct,
              roundsLeft: 5
            });
            pbLogs.push(`🛡️ **${skill.ten}**: Triệu hồi Pháp Tướng tăng phòng ngự và regen.`);
          }
          if (skill.id === 'hong_hoang_kich') {
            const vatCongBonus = 0.15 * (1 + (capDo - 1) * 0.01);
            activeBuffs.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'hong_hoang_kich_buff',
              triGia: vatCongBonus,
              roundsLeft: 2
            });
            isCrit = true; // Chắc chắn bạo kích giả lập
            pbLogs.push(`🩸 **${skill.ten}**: Hồi máu, chắc chắn Bạo kích, tăng \`+15%\` Vật công trong 2 hiệp.`);
          }
          if (skill.id === 'bat_hoang_bo') {
            const speedBonus = Math.floor((stats.speed || 100) * 0.30 * (1 + (capDo - 1) * 0.01));
            activeBuffs.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'bat_hoang_bo_buff',
              speedBonus: speedBonus,
              neBonus: 0.20,
              roundsLeft: 4
            });
            activeBuffs.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'hoa_loi_dap',
              triGia: 0.40 * (1 + (capDo - 1) * 0.01),
              roundsLeft: 4
            });
            pbLogs.push(`👟 **${skill.ten}**: Tăng tốc, né tránh và kích hoạt trạng thái [Hỏa Lôi Đạp].`);
          }

          if (skill.id === 'cuu_long_ba_the_tran') {
            const shieldPct = 0.20 * (1 + (capDo - 1) * 0.01);
            const shieldAmt = Math.floor(stats.max_hp * shieldPct);
            pbLogs.push(`🛡️ **${skill.ten}**: Tạo lá chắn \`+${shieldAmt.toLocaleString()}\` HP giả lập.`);
          }
          if (skill.id === 'huyet_mach_cuong_hoa') {
            const atkBonusPct = 0.30 * (1 + (capDo - 1) * 0.01);
            activeBuffs.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'huyet_mach_cuong_hoa',
              triGia: atkBonusPct,
              roundsLeft: 3
            });
            pbLogs.push(`🔥 **${skill.ten}**: Tăng \`+${Math.floor(atkBonusPct * 100)}%\` Vật Công trong 3 hiệp giả lập.`);
          }
          if (skill.id === 'dai_tu_linh_tran') {
            const mpHealPct = 0.30 * (1 + (capDo - 1) * 0.01);
            const mpAmt = Math.floor(stats.max_mp * mpHealPct);
            simMp = Math.min(stats.max_mp, simMp + mpAmt);
            for (const s of skills) {
              if (s.detail.id !== 'dai_tu_linh_tran') {
                s.nextRoundAvailable = Math.max(1, s.nextRoundAvailable - 1);
              }
            }
            pbLogs.push(`✨ **${skill.ten}**: Hồi \`+${mpAmt}\` MP, giảm hồi chiêu các chiêu khác 1 lượt.`);
          }
        } else {
          let rawDmg = currentRoundPlayerAtk;
          if (isCrit) rawDmg = rawDmg * stats.crit_dmg;
          pDmg = Math.max(1, Math.floor(rawDmg) - targetDef);

          castMsg = `đánh thường`;
        }

        let cbExtraDmgTotal = 0;
        const cbProcs = [];
        for (const eq of activeTreasures) {
          if (Math.random() <= 0.30) {
            const kynang = config.KYNANG_TRANGBI[eq.itemId];
            if (kynang && kynang.baseDmg) {
              const cbDmg = Math.max(1, kynang.baseDmg - targetDef);
              cbExtraDmgTotal += cbDmg;
              cbProcs.push(`🏺 **Cổ Bảo** [${eq.item.ten}] bồi thêm \`${cbDmg.toLocaleString()}\` sát thương.`);
            }
          }
        }

        let roundFinalDmg = pDmg + pbExtraDmg + cbExtraDmgTotal;
        const isDodge = Math.random() <= dummy.ne;

        if (isDodge) {
          battleLogs.push(`⚡ **Hiệp ${round}**: Đạo hữu ${castMsg} nhưng **${dummy.ten}** né tránh thành công!`);
        } else {
          totalDmg += roundFinalDmg;
          let logMsg = `🗡️ **Hiệp ${round}**: Đạo hữu ${castMsg} gây \`${roundFinalDmg.toLocaleString()}\`${isCrit ? ' 💥 (Bạo!)' : ''} sát thương lên **${dummy.ten}**.`;
          if (cbProcs.length > 0) {
            logMsg += `\n   ➔ ` + cbProcs.join('\n   ➔ ');
          }
          if (isKyLanActive) {
            const lkChance = Math.min(1.0, 0.20 + (stats.speed || 100) / 3000);
            if (Math.random() <= lkChance) {
              const tienHoa = activePet ? (activePet.tienHoa || 0) : 0;
              let lkDmgMult = 0.50;
              for (let i = 1; i <= tienHoa; i++) {
                if (lkDmgMult < 1.0) {
                  lkDmgMult = lkDmgMult * 1.05;
                  if (lkDmgMult > 1.0) lkDmgMult = 1.0;
                }
              }
              const lkDmg = Math.max(1, Math.floor(currentRoundPlayerAtk * lkDmgMult) - targetDef);
              totalDmg += lkDmg;
              logMsg += `\n   ➔ 🐆 **Kỳ Lân Liên Kích**: Tung thêm đòn đánh phụ nhanh như chớp (Dame x${Math.floor(lkDmgMult * 100)}%) gây \`+${lkDmg.toLocaleString()}\` sát thương!`;
            }
          }
          battleLogs.push(logMsg);
        }

        // Giảm buff thời hạn Luyện Khí
        if (tuKhiActive > 0) {
          tuKhiActive--;
        }
        if (chienYDuration > 0) {
          chienYDuration--;
          if (chienYDuration === 0) {
            chienYStacks = 0;
          }
        }

        for (const buff of activeBuffs) {
          if (buff.roundsLeft > 0) {
            buff.roundsLeft--;
          }
        }
        if (monsterTanKhiRounds > 0) {
          monsterTanKhiRounds--;
        }

        round++;
      }

      const avgDmg = Math.floor(totalDmg / 15);
      const color = layMauCanhGioi(tuSi.canhGioi);

      let desc =
        `👤 **Đạo hữu**: **${tuSi.ten}**\n` +
        `🎯 **Mục tiêu mô phỏng**: **${dummy.ten}**\n` +
        `🛡️ **Chỉ số phòng thủ**: Giáp: \`${dummy.giap}\` | Vật Phòng: \`${dummy.vatPhong}\` | Pháp Phòng: \`${dummy.phapPhong}\` | Né: \`${(dummy.ne * 100).toFixed(0)}%\`\n\n` +
        `📋 **Nhật Ký Giao Chiến (15 Hiệp)**:\n` +
        battleLogs.join('\n');

      if (desc.length > 3900) {
        desc = desc.substring(0, 3850) + '\n\n*...[Một số dòng nhật ký đã được rút gọn do vượt quá giới hạn hiển thị]...*';
      }

      const reportEmbed = new EmbedBuilder()
        .setTitle('⚔️ KẾT QUẢ ĐO LƯỜNG SÁT THƯƠNG ⚔️')
        .setColor(color)
        .setDescription(desc)
        .addFields(
          { name: '🔥 Tổng sát thương', value: `\`${totalDmg.toLocaleString()}\` HP`, inline: true },
          { name: '📊 Trung bình/Hiệp', value: `\`${avgDmg.toLocaleString()}\` HP`, inline: true },
          { name: '☄️ Thống kê', value: `⚡ Số lần bạo kích: \`${critCount}/15\`\n🔮 Dùng kỹ năng: \`${skillCastCount}/15\``, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Thiên Đạo Tu Tiên RPG dummy simulation' });

      await interaction.editReply({ embeds: [reportEmbed] });
    }
  };
}

const controller = new BoDieuKhienDmg();
export const danhSachLenhDmg = [controller.lenhDmg];
export { controller as boDieuKhienDmg };
