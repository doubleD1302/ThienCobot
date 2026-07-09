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
        const boss = await WorldBoss.findOne({ where: { idGuild: interaction.guildId, active: true } });
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
        const activeSkill = config.layKyNangPhapBaoActive(eq.item || eq.itemId);
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

      while (round <= 15) {
        let roundAtkMult = playerAtkMult;
        for (const buff of activeBuffs) {
          if (buff.loai === 'tang_cong_pct' && buff.roundsLeft > 0) {
            roundAtkMult += buff.triGia / 100;
          }
        }
        if (isHuyenVuActive) {
          const huyenVuBuff = (round - 1) * 0.02;
          roundAtkMult += huyenVuBuff;
        }
        const currentRoundPlayerAtk = Math.floor(basePlayerAtk * roundAtkMult);

        const readySkill = skills.find(s => s.nextRoundAvailable <= round);
        let pDmg = 0;
        let isCrit = Math.random() <= stats.crit_rate;
        if (isCrit) critCount++;
        let castMsg = '';

        if (readySkill) {
          const skill = readySkill.detail;
          const capDo = readySkill.capDo;
          const skillMult = (skill.satThuong / 100) * (1 + (capDo - 1) * 0.1);
          let rawDmg = currentRoundPlayerAtk * skillMult;

          if (isCrit) rawDmg = rawDmg * stats.crit_dmg;
          pDmg = Math.max(1, Math.floor(rawDmg) - targetDef);

          const cooldownRounds = Math.max(1, Math.ceil(skill.cooldown / 3));
          readySkill.nextRoundAvailable = round + cooldownRounds;

          castMsg = `thi triển **${skill.ten} (Cấp ${capDo})**`;
          skillCastCount++;
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
                  lkDmgMult = lkDmgMult * 1.10;
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

        for (const buff of activeBuffs) {
          if (buff.roundsLeft > 0) {
            buff.roundsLeft--;
          }
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
