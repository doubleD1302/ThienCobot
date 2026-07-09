import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';

import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';
import { ThoiGianCho } from '../models/ThoiGianCho.js';
import { Inventory } from '../models/Inventory.js';
import { Item } from '../models/Item.js';
import * as config from '../config.js';

function getNguyenLieuLuyenKhiTheoCapDo(capDo, loai, itemId) {
  if (capDo >= 19) return 'nguyen_lieu_hoa_than';
  if (capDo >= 16) return 'nguyen_lieu_nguyen_anh';
  if (capDo >= 13) {
    if (loai === 'Vũ khí') return 'huyen_thiet_van_nam';
    if (loai === 'Giáp') return 'Thien_Tam_Linh_ty';
    if (loai === 'Ngọc Bội') return 'hon_tinh_huyet_nguyet';
    const pbMats = [
      'cuc_duong_hoa_thach',
      'loi_tri_bang_tinh',
      'Hau_tho_chi_loi',
      'u_minh_te_truc',
      'sinh_sinh_tao_hoa_dich',
      'tinh_khong_luu_sa'
    ];
    let sum = 0;
    const str = itemId || '';
    for (let c = 0; c < str.length; c++) {
      sum += str.charCodeAt(c);
    }
    return pbMats[sum % pbMats.length];
  }
  if (capDo >= 10) return 'nguyen_lieu_truc_co';
  return 'nguyen_lieu_luyen_khi';
}

class BoDieuKhienBicanh extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhBicanh = {
    data: new SlashCommandBuilder()
      .setName('bc')
      .setDescription('Khiêu chiến phó bản bí cảnh hoang cổ săn lùng bảo vật tông môn'),

    execute: async (interaction) => {
      await interaction.deferReply();
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      if (tuSi.theLuc < 1) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(`Thể lực bất túc! Đạo hữu hôm nay đã cạn kiệt thể lực (Hiện có: \`0/${tuSi.theLucMax}\`). Hãy quay lại vào ngày mai.`)]
        });
      }

      const { Dungeon } = await import('../models/Dungeon.js');
      const dungeons = await Dungeon.findAll();

      if (dungeons.length === 0) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Hiện tại các bí cảnh hoang cổ đóng cửa phong ấn, vui lòng quay lại sau!")]
        });
      }

      // Tạo embed hiển thị danh sách các bí cảnh
      const embedList = BoTaoEmbed.thongTin(
        "🗻 Phó Bản Bí Cảnh Hoang Cổ",
        `Đạo hữu **${tuSi.ten}** hãy lựa chọn một bí cảnh hoang cổ để dấn thân thám hiểm:\n\n` +
        dungeons.map(dg => {
          const monster = dg.quaiVat;
          const reward = dg.thuong;
          const status = tuSi.capDo >= dg.capDoYeuCau ? '🟢 Khả dụng' : '🔒 Khóa';
          return `• **${dg.ten}** (${status} · Cấp yêu cầu: \`${dg.capDoYeuCau}\`)\n` +
            `  *Quái gác cổng*: **${monster.ten}** (HP: \`${monster.hp}\`)\n` +
            `  *Chiến lợi phẩm*: Exp (\`${reward.expMin}-${reward.expMax}\`), Linh thạch (\`${reward.stonesMin}-${reward.stonesMax}\`)\n`;
        }).join('\n')
      );

      // Tạo các nút thám hiểm dựa theo dữ liệu bí cảnh
      const row = new ActionRowBuilder();
      for (const dg of dungeons) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`dg_play_${dg.id}`)
            .setLabel(`⚔️ Vượt Ải: ${dg.ten}`)
            .setStyle(ButtonStyle.Danger)
            .setDisabled(tuSi.capDo < dg.capDoYeuCau)
        );
      }
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('dg_cancel')
          .setLabel('❌ Hủy')
          .setStyle(ButtonStyle.Secondary)
      );

      const msg = await interaction.editReply({
        embeds: [embedList],
        components: [row]
      });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 60_000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();

        if (i.customId === 'dg_cancel') {
          collector.stop('cancelled');
          return;
        }

        const dungeonId = i.customId.replace('dg_play_', '');
        const dungeon = dungeons.find(dg => dg.id === dungeonId);

        if (!dungeon) {
          collector.stop('not_found');
          return;
        }

        // 1. Kiểm tra thể lực
        await tuSi.reload();
        if (tuSi.theLuc < 1) {
          await i.editReply({
            embeds: [BoTaoEmbed.loi(`Thể lực bất túc! Đạo hữu hôm nay đã cạn kiệt thể lực (Hiện có: \`0/${tuSi.theLucMax}\`).`)],
            components: []
          });
          collector.stop('no_stamina');
          return;
        }

        // 2. Kiểm tra cooldown khiêu chiến (30 giây)
        const activeCooldown = await this.kiemTraThoiGianCho(tuSi.idNguoiDung, 'dungeon');
        if (activeCooldown) {
          const hetHanTime = new Date(activeCooldown.hetHan).getTime();
          const secondsLeft = Math.max(0, Math.floor((hetHanTime - Date.now()) / 1000));
          await i.editReply({
            embeds: [BoTaoEmbed.loi(`Lực kiệt khí hư! Đạo hữu cần tĩnh dưỡng thêm \`${secondsLeft} giây\` trước khi tiếp tục khiêu chiến bí cảnh.`)],
            components: []
          });
          collector.stop('cooldown');
          return;
        }

        collector.stop('combating');

        // 2. Tải trang bị và thần thú xuất chiến để tính chỉ số và giả lập chiến đấu
        const { Inventory } = await import('../models/Inventory.js');
        const { Item } = await import('../models/Item.js');
        const equippedInv = await Inventory.findAll({
          where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true }
        });
        const equippedItems = [];
        for (const eq of equippedInv) {
          const detail = await Item.findByPk(eq.itemId);
          if (detail) {
            eq.item = detail;
            equippedItems.push(eq);
          }
        }
        const { Pet } = await import('../models/Pet.js');
        let activePet = await Pet.findOne({ where: { userId: tuSi.idNguoiDung, isActive: true } });
        if (activePet) {
          const check = config.checkHuyetMachApChe(tuSi.capDo, activePet.rarity);
          if (!check.allowed) activePet = null;
        }
        const stats = tuSi.layChiSo(equippedItems, activePet);

        // Yêu cầu HP tối thiểu
        if (tuSi.hp <= Math.floor(stats.max_hp * 0.10)) {
          return await i.editReply({
            embeds: [BoTaoEmbed.loi("Trạng thái kiệt quệ! Khí huyết của đạo hữu dưới 10%, không đủ sức khiêu chiến yêu thú. Hãy dùng `/nghi` hoặc đan dược trước.")],
            components: []
          });
        }

        // 3. Khởi chạy mô phỏng chiến đấu
        const monster = { ...dungeon.quaiVat };
        let monsterHp = monster.hp;
        let playerHp = tuSi.hp;
        let playerShield = 0;
        const originalMaxHp = stats.max_hp;
        const petTemplate = activePet ? config.PET_TEMPLATES[activePet.type] : null;
        const isHuyenVuActive = petTemplate && petTemplate.species === 'huyen_vu';
        const battleLogs = [];
        let isWin = false;
        let round = 1;
        let phoenixTriggered = false;
        let phoenixRegenRounds = 0;
        let petSkillCooldownLeft = 0;

        let toLongBuffActive = false;
        let bachHoBuffActive = false;
        let kyLanBuffActive = false;
        let huyenVuBuffActive = false;

        let bossPoisonRounds = 0;
        let bossPoisonStacks = 0;
        let bossPoisonDmgPerStack = 0;
        let bossStunnedRounds = 0;
        let playerLifestealRounds = 0;
        let critDmgRedPct = 0;
        let huyenVuCritActive = false;
        let bossWeakenRounds = 0;
        let bossWeakenPct = 0;
        let playerImmuneRounds = 0;

        const isPhysical = tuSi.huongTu === 'The Tu';
        const playerAtk = isPhysical ? stats.vat_cong : stats.phap_cong;
        const monsterDef = isPhysical ? monster.vatPhong : monster.phapPhong;

        // Phân loại trang bị chủ động
        const activeTreasures = equippedItems.filter(x => x.item.loai === 'Cổ Bảo Chủ Động');
        const dharmaTreasures = equippedItems.filter(x => x.item.loai === 'Pháp Bảo');

        // Kích hoạt kỹ năng chủ động của Pháp Bảo khi vào chiến đấu
        const activeBuffs = [];
        for (const eq of dharmaTreasures) {
          const activeSkill = config.layKyNangPhapBaoActive(eq.item || eq.itemId, stats);
          if (activeSkill) {
            if (activeSkill.loai === 'tan_cong') {
              monsterHp = Math.max(0, monsterHp - activeSkill.triGia);
              battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}**, gây \`${activeSkill.triGia}\` sát thương lên **${monster.ten}** (HP còn: \`${monsterHp}\`).`);
            } else if (activeSkill.loai === 'hoi_mau_pct') {
              const healAmt = Math.floor(stats.max_hp * (activeSkill.triGia / 100));
              playerHp = Math.min(stats.max_hp, playerHp + healAmt);
              battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}**, hồi phục \`+${healAmt}\` HP (Hiện tại: \`${playerHp}/${stats.max_hp}\`).`);
            } else if (activeSkill.loai === 'tang_cong_pct') {
              if (activeSkill.ten.includes("Cuồng Hóa Chiến Ý")) {
                const hpSacrifice = Math.floor(playerHp * 0.10);
                playerHp = Math.max(1, playerHp - hpSacrifice);
                battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}**, tiêu hao \`-${hpSacrifice}\` HP.`);
              }
              activeBuffs.push({
                ten: activeSkill.ten,
                pbTen: eq.item.ten,
                loai: 'tang_cong_pct',
                triGia: activeSkill.triGia,
                roundsLeft: activeSkill.duration
              });
              battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}**, gia tăng \`+${activeSkill.triGia}%\` Công kích trong \`${activeSkill.duration}\` hiệp.`);
            } else if (activeSkill.loai === 'khien') {
              playerShield = (playerShield || 0) + activeSkill.triGia;
              battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}**, tạo khiên chắn vững chắc \`+${activeSkill.triGia}\` HP (Khiên hiện tại: \`${playerShield}\`).`);
            } else if (activeSkill.loai === 'hon_hop') {
              monsterHp = Math.max(0, monsterHp - activeSkill.triGia);
              playerShield = (playerShield || 0) + activeSkill.triGiaKhien;
              battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}**, gây \`${activeSkill.triGia}\` sát thương lên **${monster.ten}** (HP còn: \`${monsterHp}\`) và tạo khiên chắn \`+${activeSkill.triGiaKhien}\` HP (Khiên hiện tại: \`${playerShield}\`).`);
            }
          }
        }

        if (monsterHp <= 0) {
          isWin = true;
        }

        // Kích hoạt kỹ năng chủ động của Thần Thú khi vào trận chiến
        let kyLanCumulativeDmg = 0;
        let kyLanBurstTriggered = false;

        if (activePet && monsterHp > 0) {
          const template = config.PET_TEMPLATES[activePet.type];
          if (template && template.group === 'than_thu') {
            const totalEvolves = config.getPetTotalEvolves(activePet);
            const evoMult = Math.pow(1.05, totalEvolves);

            if (template.species === 'to_long') {
              const dmg = Math.floor(stats.phap_cong * 1.2 * evoMult);
              monsterHp = Math.max(0, monsterHp - dmg);
              toLongBuffActive = true;
              playerLifestealRounds = (activePet.tienHoa >= 6) ? 3 : 2;
              bossStunnedRounds = 2;
              petSkillCooldownLeft = 5;
              battleLogs.push(`🐉 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Phước lành chân long 🐉**, gây \`${dmg.toLocaleString()}\` sát thương pháp thuật lên **${monster.ten}** (HP còn: \`${monsterHp.toLocaleString()}\`). Khiến yêu thú bị **Choáng trong 2 lượt** và tăng **50% hút máu** cho tu sĩ trong \`${playerLifestealRounds}\` lượt!`);
            } else if (template.species === 'huyen_vu') {
              const shieldAmt = Math.floor(stats.max_hp * 0.25 * evoMult);
              playerShield = (playerShield || 0) + shieldAmt;
              huyenVuBuffActive = true;
              huyenVuCritActive = true;
              critDmgRedPct = Math.min(0.50, 0.20 + (activePet.tienHoa || 0) * 0.03);

              bossPoisonRounds = 3;
              bossPoisonStacks = 1;
              bossPoisonDmgPerStack = Math.floor(stats.max_hp * Math.min(0.10, 0.05 + (activePet.tienHoa || 0) * 0.005));
              const poisonDmgInitial = bossPoisonDmgPerStack * bossPoisonStacks;
              petSkillCooldownLeft = 5;

              battleLogs.push(`🐢 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Cự Thần Hồng Hoang 🐢**, tạo lớp lá chắn kiên cố \`${shieldAmt.toLocaleString()}\` HP hộ mệnh, đồng thời phun chất độc gây \`${poisonDmgInitial.toLocaleString()}\` sát thương độc lực đầu mỗi lượt (kéo dài 3 hiệp, cộng dồn tối đa 3 lần). Khi kẻ địch bạo kích, tu sĩ giảm \`${Math.floor(critDmgRedPct * 100)}%\` sát thương gánh chịu và phản lại 25% sát thương gánh chịu!`);
            } else if (template.species === 'bach_ho') {
              const dmg = Math.floor(stats.vat_cong * 1.2 * evoMult);
              monsterHp = Math.max(0, monsterHp - dmg);
              bachHoBuffActive = true;
              
              bossWeakenRounds = 2;
              bossWeakenPct = Math.min(0.50, 0.20 + (activePet.tienHoa || 0) * 0.03);
              playerImmuneRounds = 2;
              petSkillCooldownLeft = 5;
              battleLogs.push(`🐅 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Bạch Hổ Sát Chiêu 🐅**, trảo kích gây \`${dmg.toLocaleString()}\` sát thương vật lý lên **${monster.ten}** (HP còn: \`${monsterHp.toLocaleString()}\`). Khiến yêu thú bị **Suy yếu giảm ${Math.floor(bossWeakenPct * 100)}% song công** trong 2 lượt, tu sĩ giải trừ và kháng toàn bộ hiệu ứng bất lợi trong 2 lượt!`);
            } else if (template.species === 'phuong_hoang') {
              const baseDmg = (stats.vat_cong + stats.phap_cong) * evoMult;
              const addHits = Math.floor(stats.crit_dmg / 0.8);
              const totalHits = 1 + addHits;
              let totalPetDmg = 0;
              let currentHitDmg = baseDmg;
              for (let h = 0; h < totalHits; h++) {
                totalPetDmg += currentHitDmg;
                currentHitDmg = currentHitDmg * 1.2;
              }
              totalPetDmg = Math.floor(totalPetDmg);
              monsterHp = Math.max(0, monsterHp - totalPetDmg);
              petSkillCooldownLeft = 5;
              battleLogs.push(`<:phung:1522635618377662484> **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Hỏa Phượng Liệt Diễm**, liên hoàn oanh kích **${totalHits} lần** (sát thương song công tăng tiến 20% mỗi lần), gây tổng cộng \`${totalPetDmg.toLocaleString()}\` sát thương lên **${monster.ten}** (HP còn: \`${monsterHp.toLocaleString()}\`).`);
            } else if (template.species === 'ky_lan') {
              petSkillCooldownLeft = 0;
            }

            if (monsterHp <= 0) {
              isWin = true;
            }
          }
        }

        // Tải kỹ năng đã học để dùng trong Bí Cảnh
        const { PlayerSkill } = await import('../models/PlayerSkill.js');
        const { Skill } = await import('../models/Skill.js');

        const learned = await PlayerSkill.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true } });
        const skills = [];
        for (const psk of learned) {
          const detail = await Skill.findByPk(psk.skillId);
          if (detail) {
            skills.push({ detail, capDo: psk.capDo, nextRoundAvailable: 1 });
          }
        }

              // Tốc độ và Điểm hành động (AV)
      const playerSpeed = stats.speed || 100;
      const bossSpeed = 100;

      let avPlayer = 10000 / playerSpeed;
      let avBoss = 10000 / bossSpeed;

      const baseAvPlayer = avPlayer;
      const baseAvBoss = avBoss;

      let playerActionCount = 0;
      let combatRound = 1;

      while (monsterHp > 0 && playerHp > 0 && playerActionCount < 15) {
        if (avPlayer <= avBoss) {
          // Lượt của người chơi
          const elapsed = avPlayer;
          avBoss -= elapsed;
          avPlayer = baseAvPlayer;

          if (phoenixRegenRounds > 0) {
            const regenAmt = Math.floor(stats.max_hp * 0.05);
            playerHp = Math.min(stats.max_hp, playerHp + regenAmt);
            battleLogs.push(`<:phung:1522635618377662484> **Phượng Hoàng Hộ Thể**: Hồi phục \`+${regenAmt}\` HP từ hiệu ứng Niết Bàn (Hiện tại: \`${playerHp}/${stats.max_hp}\`).`);
            phoenixRegenRounds--;
          }

          if (isHuyenVuActive) {
            const healAmt = Math.floor(stats.max_hp * 0.05);
            playerHp = Math.min(stats.max_hp, playerHp + healAmt);
            const maxHpBuff = Math.floor(originalMaxHp * 0.05);
            stats.max_hp += maxHpBuff;
            battleLogs.push(`🐢 **Huyền Vũ Hồi Phục**: Hồi phục \`+${healAmt.toLocaleString()}\` HP và gia tăng giới hạn HP tối đa thêm \`+${maxHpBuff.toLocaleString()}\` (HP hiện tại: \`${playerHp}/${stats.max_hp}\`).`);
          }

          // Sát thương độc lực của Huyền Vũ (đầu lượt)
          if (bossPoisonRounds > 0 && bossPoisonStacks > 0) {
            const poisonDmgTotal = bossPoisonDmgPerStack * bossPoisonStacks;
            monsterHp = Math.max(0, monsterHp - poisonDmgTotal);
            battleLogs.push(`🤢 **Trúng độc**: Yêu thú chịu \`-${poisonDmgTotal.toLocaleString()}\` sát thương độc lực (cộng dồn x${bossPoisonStacks}) (HP còn: \`${monsterHp.toLocaleString()}\`).`);
            bossPoisonRounds--;
            if (bossPoisonRounds === 0) {
              bossPoisonStacks = 0;
            }
            if (monsterHp <= 0) {
              isWin = true;
              break;
            }
          }

          let roundAtkMult = 1.0;
          for (const buff of activeBuffs) {
            if (buff.loai === 'tang_cong_pct' && buff.roundsLeft > 0) {
              roundAtkMult += buff.triGia / 100;
            }
          }
          if (toLongBuffActive) {
            roundAtkMult += 0.10;
          }
          if (isHuyenVuActive) {
            const huyenVuBuff = playerActionCount * 0.02;
            roundAtkMult += huyenVuBuff;
          }
          const currentRoundPlayerAtk = Math.floor(playerAtk * roundAtkMult);

          let roundCritRate = stats.crit_rate;
          let roundCritDmg = stats.crit_dmg;
          if (bachHoBuffActive) {
            roundCritRate = Math.min(1.0, roundCritRate + 0.15);
            roundCritDmg += 0.30;
          }
          const readySkill = skills.find(s => s.nextRoundAvailable <= playerActionCount + 1);
          let pDmg = 0;
          let isCrit = Math.random() <= roundCritRate;
          let castMsg = '';

          if (readySkill) {
            const skill = readySkill.detail;
            const capDo = readySkill.capDo;
            const skillMult = (skill.satThuong / 100) * (1 + (capDo - 1) * 0.1);
            let rawDmg = currentRoundPlayerAtk * skillMult;

            if (isCrit) rawDmg = rawDmg * roundCritDmg;
            pDmg = Math.max(1, Math.floor(rawDmg) - monsterDef);

            const cooldownRounds = Math.max(1, Math.ceil(skill.cooldown / 3));
            readySkill.nextRoundAvailable = playerActionCount + 1 + cooldownRounds;

            castMsg = `thi triển **${skill.ten} (Cấp ${capDo})**`;
          } else {
            let rawDmg = currentRoundPlayerAtk;
            if (isCrit) rawDmg = rawDmg * roundCritDmg;
            pDmg = Math.max(1, Math.floor(rawDmg) - monsterDef);

            castMsg = `đánh thường`;
          }

          monsterHp = Math.max(0, monsterHp - pDmg);
          battleLogs.push(`💥 **Hiệp ${combatRound}** (Lượt ${playerActionCount + 1}, AV: ${elapsed.toFixed(0)}): **${tuSi.ten}** ${castMsg} gây \`${pDmg}\`${isCrit ? ' 💥 (Bạo!)' : ''} sát thương lên **${monster.ten}** (HP còn: \`${monsterHp}\`).`);

          // Hút máu nếu có
          let roundLifesteal = stats.lifesteal;
          if (kyLanBuffActive) {
            roundLifesteal += 0.10;
          }
          if (playerLifestealRounds > 0) {
            roundLifesteal += 0.50; // Phước lành chân long hút máu
          }
          if (roundLifesteal > 0 && monsterHp > 0) {
            const healed = Math.floor(pDmg * roundLifesteal);
            if (healed > 0) {
              playerHp = Math.min(stats.max_hp, playerHp + healed);
              battleLogs.push(`🩸 **Hút máu**: Hồi phục \`+${healed}\` HP (Hiện tại: \`${playerHp}/${stats.max_hp}\`).`);
            }
          }

          if (monsterHp <= 0) {
            isWin = true;
            break;
          }

          // Cổ Bảo Chủ Động (30%)
          for (const eq of activeTreasures) {
            if (Math.random() <= 0.30) {
              const kynang = config.KYNANG_TRANGBI[eq.itemId];
              if (kynang && kynang.baseDmg) {
                const cbDmg = Math.max(1, kynang.baseDmg - monsterDef);
                monsterHp = Math.max(0, monsterHp - cbDmg);
                battleLogs.push(`🏺 **Cổ Bảo**: **${eq.item.ten}** thi triển **${kynang.ten}** bồi thêm \`${cbDmg}\` sát thương (HP còn: \`${monsterHp}\`).`);
                if (monsterHp <= 0) {
                  isWin = true;
                  break;
                }
              }
            }
          }

          if (isWin) break;

          // Kỳ Lân active skill mỗi lượt của chủ nhân
          if (activePet) {
            const template = config.PET_TEMPLATES[activePet.type];
            if (template && template.group === 'than_thu') {
              const totalEvolves = config.getPetTotalEvolves(activePet);
              const evoMult = Math.pow(1.05, totalEvolves);

              if (template.species === 'ky_lan') {
                const pct = Math.min(0.30, 0.25 + (activePet.tienHoa || 0) * 0.005);
                const isPhap = tuSi.huongTu === 'Phap Tu' || tuSi.huongTu === 'Pháp Tu';
                const dmgTypeVal = isPhap ? stats.phap_cong : stats.vat_cong;
                let petDmg = Math.floor(dmgTypeVal * pct * evoMult);
                monsterHp = Math.max(0, monsterHp - petDmg);
                kyLanCumulativeDmg = (kyLanCumulativeDmg || 0) + petDmg;
                battleLogs.push(`🦄 **Thần Thú Kích Hoạt**: **${activePet.name}** oanh kích gây \`${petDmg.toLocaleString()}\` sát thương ${isPhap ? 'pháp thuật' : 'vật lý'} lên yêu thú (HP còn: \`${monsterHp.toLocaleString()}\`).`);

                const limit = stats.max_hp * Math.min(0.70, 0.50 + (activePet.tienHoa || 0) * 0.02);
                if (!kyLanBurstTriggered && kyLanCumulativeDmg >= limit) {
                  const burstDmg = Math.floor(limit * 2);
                  monsterHp = Math.max(0, monsterHp - burstDmg);
                  kyLanBurstTriggered = true;
                  battleLogs.push(`🦄 **Kỳ Lân Bộc Phá**: Tích lũy sát thương đạt mốc, **${activePet.name}** bộc phát cuồng nộ x2 sát thương giới hạn, giáng thêm \`-${burstDmg.toLocaleString()}\` sát thương chí mạng lên yêu thú (HP còn: \`${monsterHp.toLocaleString()}\`)!`);
                }
                if (monsterHp <= 0) {
                  isWin = true;
                  break;
                }
              } else {
                // Thần thú khác (Tổ Long, Huyền Vũ, Bạch Hổ, Phượng Hoàng)
                if (petSkillCooldownLeft === 0 && Math.random() <= 0.20) {
                  petSkillCooldownLeft = 5;
                  if (template.species === 'to_long') {
                    const petDmg = Math.floor(stats.phap_cong * 1.2 * evoMult);
                    monsterHp = Math.max(0, monsterHp - petDmg);
                    toLongBuffActive = true;
                    playerLifestealRounds = (activePet.tienHoa >= 6) ? 3 : 2;
                    bossStunnedRounds = 2;
                    battleLogs.push(`🐉 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Phước lành chân long 🐉** gây \`${petDmg.toLocaleString()}\` sát thương pháp thuật lên yêu thú (HP còn: \`${monsterHp.toLocaleString()}\`). Yêu thú bị **Choáng trong 2 lượt** và tu sĩ tăng **50% hút máu** trong \`${playerLifestealRounds}\` lượt!`);
                    if (monsterHp <= 0) {
                      isWin = true;
                      break;
                    }
                  } else if (template.species === 'huyen_vu') {
                    const petShield = Math.floor(stats.max_hp * 0.25 * evoMult);
                    playerShield += petShield;
                    
                    bossPoisonRounds = 3;
                    bossPoisonStacks = Math.min(3, (bossPoisonStacks || 0) + 1);
                    bossPoisonDmgPerStack = Math.floor(stats.max_hp * Math.min(0.10, 0.05 + (activePet.tienHoa || 0) * 0.005));
                    const poisonDmgTotal = bossPoisonDmgPerStack * bossPoisonStacks;

                    huyenVuBuffActive = true;
                    huyenVuCritActive = true;
                    critDmgRedPct = Math.min(0.50, 0.20 + (activePet.tienHoa || 0) * 0.03);

                    battleLogs.push(`🐢 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Cự Thần Hồng Hoang 🐢**, tạo lá chắn \`${petShield.toLocaleString()}\` HP bảo vệ, và giải độc lực gây \`${poisonDmgTotal.toLocaleString()}\` sát thương độc mỗi lượt (cộng dồn lớp độc thứ \`${bossPoisonStacks}\`).`);
                    if (monsterHp <= 0) {
                      isWin = true;
                      break;
                    }
                  } else if (template.species === 'bach_ho') {
                    const petDmg = Math.floor(stats.vat_cong * 1.2 * evoMult);
                    monsterHp = Math.max(0, monsterHp - petDmg);
                    
                    bossWeakenRounds = 2;
                    bossWeakenPct = Math.min(0.50, 0.20 + (activePet.tienHoa || 0) * 0.03);
                    playerImmuneRounds = 2;
                    bachHoBuffActive = true;

                    battleLogs.push(`🐅 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Bạch Hổ Sát Chiêu 🐅**, trảo kích gây \`${petDmg.toLocaleString()}\` sát thương vật lý lên yêu thú (HP còn: \`${monsterHp.toLocaleString()}\`). Khiến Boss bị **Suy yếu giảm ${Math.floor(bossWeakenPct * 100)}% song công** trong 2 lượt, tu sĩ kháng toàn bộ hiệu ứng bất lợi trong 2 lượt!`);
                    if (monsterHp <= 0) {
                      isWin = true;
                      break;
                    }
                  } else if (template.species === 'phuong_hoang') {
                    const baseDmg = (stats.vat_cong + stats.phap_cong) * evoMult;
                    const addHits = Math.floor(stats.crit_dmg / 0.8);
                    const totalHits = 1 + addHits;
                    let totalPetDmg = 0;
                    let currentHitDmg = baseDmg;
                    for (let h = 0; h < totalHits; h++) {
                      totalPetDmg += currentHitDmg;
                      currentHitDmg = currentHitDmg * 1.2;
                    }
                    totalPetDmg = Math.floor(totalPetDmg);
                    monsterHp = Math.max(0, monsterHp - totalPetDmg);
                    battleLogs.push(`<:phung:1522635618377662484> **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Hỏa Phượng Liệt Diễm**, liên hoàn oanh kích **${totalHits} lần** (sát thương song công tăng tiến 20% mỗi lần), gây tổng cộng \`${totalPetDmg.toLocaleString()}\` sát thương lên yêu thú! (HP còn: \`${monsterHp.toLocaleString()}\`).`);
                    if (monsterHp <= 0) {
                      isWin = true;
                      break;
                    }
                  }
                }
              }
            }
          }

          // Giảm thời gian hiệu lực của Pháp Bảo ở cuối mỗi hiệp
          for (const buff of activeBuffs) {
            if (buff.roundsLeft > 0) {
              buff.roundsLeft--;
              if (buff.roundsLeft === 0) {
                battleLogs.push(`✨ Hiệu ứng [${buff.ten}] của **${buff.pbTen}** đã hết tác dụng.`);
              }
            }
          }

          if (petSkillCooldownLeft > 0) {
            petSkillCooldownLeft--;
          }
          if (playerLifestealRounds > 0) playerLifestealRounds--;
          if (playerImmuneRounds > 0) playerImmuneRounds--;

          playerActionCount++;
          combatRound++;
        } else {
          // Lượt của quái
          const elapsed = avBoss;
          avPlayer -= elapsed;
          avBoss = baseAvBoss;

          if (bossStunnedRounds > 0) {
            battleLogs.push(`💤 **Choáng**: Yêu thú bị choáng không thể phản công trong hiệp này!`);
          } else {
            const mAtk = Math.max(monster.vatCong, monster.phapCong);
            const pDef = monster.vatCong > monster.phapCong ? stats.vat_phong : stats.phap_phong;
            let mDmg = Math.max(1, mAtk - pDef);
            if (stats.dmg_red) {
              mDmg = Math.floor(mDmg * (1 - stats.dmg_red));
            }

            if (bossWeakenRounds > 0) {
              mDmg = Math.floor(mDmg * (1 - bossWeakenPct));
              battleLogs.push(`✨ **Suy yếu**: Yêu thú bị suy yếu, sát thương phản công giảm đi \`-${Math.floor(bossWeakenPct * 100)}%\`.`);
            }

            const isMonsterCrit = Math.random() <= 0.15;
            let monsterCritMsg = '';
            if (isMonsterCrit) {
              mDmg = Math.floor(mDmg * 1.5);
              monsterCritMsg = ` (BẠO KÍCH! 💥)`;
            }

            if (isMonsterCrit && huyenVuCritActive) {
              const redAmt = Math.floor(mDmg * critDmgRedPct);
              mDmg -= redAmt;
              const reflectDmg = Math.floor(mDmg * 0.25);
              monsterHp = Math.max(0, monsterHp - reflectDmg);
              battleLogs.push(`🐢 **Huyền Vũ Giảm Bạo**: Giảm \`-${Math.floor(critDmgRedPct * 100)}%\` sát thương bạo kích gánh chịu, phản hồi \`+${reflectDmg.toLocaleString()}\` sát thương ngược lại yêu thú (HP còn: \`${monsterHp.toLocaleString()}\`).`);
              if (monsterHp <= 0) {
                isWin = true;
              }
            }

            let roundNe = stats.ne;
            if (kyLanBuffActive) {
              roundNe = Math.min(0.90, roundNe + 0.15);
            }
            if (Math.random() <= roundNe) {
              battleLogs.push(`💨 **Né tránh**: **${tuSi.ten}** ảo ảnh lướt tránh hoàn toàn đòn đánh của **${monster.ten}**!`);
            } else {
              if (playerShield > 0) {
                if (playerShield >= mDmg) {
                  playerShield -= mDmg;
                  battleLogs.push(`🛡️ **Lá Chắn**: Khiên hấp thụ toàn bộ \`${mDmg}\`${monsterCritMsg} sát thương (Khiên còn: \`${playerShield}\`).`);
                  mDmg = 0;
                } else {
                  mDmg -= playerShield;
                  battleLogs.push(`🛡️ **Lá Chắn**: Khiên hấp thụ \`${playerShield}\`${monsterCritMsg} sát thương rồi vỡ! Sát thương lọt qua: \`${mDmg}\`.`);
                  playerShield = 0;
                }
              }

              if (mDmg > 0) {
                playerHp = Math.max(0, playerHp - mDmg);
                battleLogs.push(`🐾 **Yêu Thú** (AV: ${elapsed.toFixed(0)}): **${monster.ten}** phản kích gây \`-${mDmg}\`${monsterCritMsg} sát thương lên **${tuSi.ten}** (HP còn: \`${playerHp}\`).`);
              }
            }
          }

          if (bossStunnedRounds > 0) bossStunnedRounds--;
          if (bossWeakenRounds > 0) bossWeakenRounds--;

          combatRound++;
        }
      }

      if (playerHp <= 0) {
        isWin = false;
      }

      if (playerActionCount >= 15 && monsterHp > 0 && playerHp > 0) {
        isWin = false;
        battleLogs.push(`⏳ **Kết quả**: Hai bên giao chiến ròng rã 15 hiệp bất phân thắng bại, tu sĩ rút lui do cạn kiệt linh lực.`);
      }


        let gainedExp = 0;
        let gainedStones = 0;
        let droppedItem = null;
        let droppedSeed = null;
        let droppedCoDuyenLenh = false;
        let droppedBreakthrough = null;
        let droppedVanYeuQua = null;
        let droppedEgg = null;

        const thienDao = await tuSi.layHeSoThienDao();

        if (isWin) {
          gainedExp = Math.floor((dungeon.thuong.expMin + Math.random() * (dungeon.thuong.expMax - dungeon.thuong.expMin)) * thienDao.expMult);
          gainedStones = Math.floor((dungeon.thuong.stonesMin + Math.random() * (dungeon.thuong.stonesMax - dungeon.thuong.stonesMin)) * thienDao.stoneMult);

          // Rơi trang bị/vật phẩm
          for (const drop of dungeon.drops) {
            if (Math.random() <= drop.tile) {
              const targetId = drop.replaceId && Math.random() < 0.5 ? drop.replaceId : drop.itemId;
              const itemDetail = await Item.findByPk(targetId);
              if (itemDetail) {
                if (itemDetail.doHiem === 'Huyền thoại' || itemDetail.doHiem === 'Thần cấp' || targetId === 'trung_than_thu') {
                  // Chặn không rơi
                } else {
                  const isEquip = ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'].includes(itemDetail.loai);
                  if (isEquip) {
                    const matId = getNguyenLieuLuyenKhiTheoCapDo(itemDetail.yeuCauCanhGioi || tuSi.capDo, itemDetail.loai, itemDetail.id);
                    const matDetail = await Item.findByPk(matId);
                    if (matDetail) {
                      droppedItem = matDetail;
                      await Inventory.addVatPham(tuSi.idNguoiDung, matId, 1);
                      break;
                    }
                  } else {
                    droppedItem = itemDetail;
                    await Inventory.addVatPham(tuSi.idNguoiDung, targetId, 1);
                    break;
                  }
                }
              }
            }
          }

          // 15% cơ hội rơi nguyên liệu hoặc đan đột phá phù hợp cảnh giới
          const btData = config.layVatPhamDotPhaTheoCapDo(tuSi.capDo);
          if (btData && Math.random() <= 0.15) {
            const randType = Math.random();
            let targetId = btData.seedId;
            if (randType >= 0.85) {
              targetId = btData.pillId;
              if (targetId === 'dan_dot_pha_5') {
                targetId = btData.herbId;
              }
            } else if (randType >= 0.50) {
              targetId = btData.herbId;
            }
            const itemDetail = await Item.findByPk(targetId);
            if (itemDetail) {
              if (itemDetail.doHiem === 'Huyền thoại' || itemDetail.doHiem === 'Thần cấp' || targetId === 'trung_than_thu') {
                // Chặn không rơi
              } else {
                droppedBreakthrough = itemDetail;
                await Inventory.addVatPham(tuSi.idNguoiDung, targetId, 1);
              }
            }
          }

          // 20% rơi hạt giống dược viên
          if (Math.random() <= 0.20) {
            const seedId = Math.random() < 0.5 ? 'hat_giong_linh_chi' : 'hat_giong_nhan_sam';
            const seedDetail = await Item.findByPk(seedId);
            if (seedDetail) {
              if (seedDetail.doHiem === 'Huyền thoại' || seedDetail.doHiem === 'Thần cấp' || seedId === 'trung_than_thu') {
                // Chặn không rơi
              } else {
                droppedSeed = seedDetail;
                await Inventory.addVatPham(tuSi.idNguoiDung, seedId, 1);
              }
            }
          }

          // 3% rơi Cơ Duyên Lệnh
          if (Math.random() <= 0.03) {
            const cdDetail = await Item.findByPk('co_duyen_lenh');
            if (cdDetail) {
              if (cdDetail.doHiem === 'Huyền thoại' || cdDetail.doHiem === 'Thần cấp') {
                // Chặn không rơi
              } else {
                droppedCoDuyenLenh = true;
                await Inventory.addVatPham(tuSi.idNguoiDung, 'co_duyen_lenh', 1);
              }
            }
          }

          // Rơi Vạn Yêu Quả (phẩm cấp giảm dần)
          const vyqRoll = Math.random() * 100;
          let targetVyqId = null;
          if (vyqRoll <= 0.1) targetVyqId = 'van_yeu_qua_than';
          else if (vyqRoll <= 0.6) targetVyqId = 'van_yeu_qua_tien';
          else if (vyqRoll <= 1.6) targetVyqId = 'van_yeu_qua_thuong';
          else if (vyqRoll <= 3.6) targetVyqId = 'van_yeu_qua_trung';
          else if (vyqRoll <= 8.6) targetVyqId = 'van_yeu_qua_ha';
          else if (vyqRoll <= 18.6) targetVyqId = 'van_yeu_qua_phe';

          if (targetVyqId) {
            const vyqDetail = await Item.findByPk(targetVyqId);
            if (vyqDetail) {
              if (vyqDetail.doHiem === 'Huyền thoại' || vyqDetail.doHiem === 'Thần cấp' || targetVyqId === 'trung_than_thu') {
                // Thay thế van_yeu_qua_than bằng van_yeu_qua_tien
                if (targetVyqId === 'van_yeu_qua_than') {
                  const fallbackVyq = await Item.findByPk('van_yeu_qua_tien');
                  if (fallbackVyq) {
                    droppedVanYeuQua = fallbackVyq;
                    await Inventory.addVatPham(tuSi.idNguoiDung, 'van_yeu_qua_tien', 1);
                  }
                }
              } else {
                droppedVanYeuQua = vyqDetail;
                await Inventory.addVatPham(tuSi.idNguoiDung, targetVyqId, 1);
              }
            }
          }

          // Rơi Trứng Linh Thú (Phàm: 5%, Linh: 3%, Tiên: 1%)
          const eggRollVal = Math.random() * 100;
          let targetEggId = null;
          if (eggRollVal <= 1.0) targetEggId = 'trung_linh_thu_tien';
          else if (eggRollVal <= 4.0) targetEggId = 'trung_linh_thu_linh';
          else if (eggRollVal <= 9.0) targetEggId = 'trung_linh_thu_pham';

          if (targetEggId) {
            const eggDetail = await Item.findByPk(targetEggId);
            if (eggDetail) {
              if (eggDetail.doHiem === 'Huyền thoại' || eggDetail.doHiem === 'Thần cấp' || targetEggId === 'trung_than_thu') {
                // Chặn không rơi
              } else {
                droppedEgg = eggDetail;
                await Inventory.addVatPham(tuSi.idNguoiDung, targetEggId, 1);
              }
            }
          }

          tuSi.linhLuc += gainedExp;
          tuSi.linhThach += gainedStones;
          tuSi.hp = playerHp;
        } else {
          // HP suy kiệt sau trận thua
          tuSi.hp = Math.max(1, Math.floor(tuSi.hp - stats.max_hp * 0.30));
        }
        tuSi.theLuc = Math.max(0, tuSi.theLuc - 1);

        await tuSi.save();

        // Ghi nhận thiên đạo lục nếu nhặt được đồ hiếm
        if (droppedItem && (droppedItem.doHiem === 'Hiếm' || droppedItem.doHiem === 'Cực hiếm' || droppedItem.doHiem === 'Huyền thoại')) {
          try {
            const { ThienDaoLuc } = await import('../models/ThienDaoLuc.js');
            await ThienDaoLuc.ghiLuc(
              `🎁 **Cơ Duyên Xảo Hợp**: Đạo hữu **${tuSi.ten}** khám phá **${dungeon.ten}** may mắn phát hiện đại cơ duyên, nhặt được bảo vật **${droppedItem.ten}** (\`${droppedItem.doHiem}\`)!`,
              'Drop'
            );
          } catch (err) { }
        }

        // Đặt thời gian chờ khiêu chiến mới
        const expiresAt = new Date(Date.now() + 30 * 1000);
        await this.datThoiGianCho(tuSi.idNguoiDung, 'dungeon', expiresAt);

        const embedResult = BoTaoEmbed.tranDauBiCanh(
          tuSi,
          dungeon,
          battleLogs,
          isWin,
          gainedExp,
          gainedStones,
          droppedItem,
          droppedSeed,
          thienDao,
          droppedCoDuyenLenh,
          droppedBreakthrough,
          droppedVanYeuQua,
          droppedEgg
        );

        await i.editReply({
          embeds: [embedResult],
          components: []
        });
      });

      collector.on('end', async (_, reason) => {
        try {
          if (reason === 'cancelled') {
            await interaction.editReply({
              embeds: [BoTaoEmbed.thongTin('🗻 Bí Cảnh Hoang Cổ', 'Đạo hữu đã rút lui an toàn khỏi cửa bí cảnh.')],
              components: []
            });
          } else if (reason === 'time') {
            await interaction.editReply({
              components: []
            });
          }
        } catch (_) { }
      });
    }
  };
}

const controller = new BoDieuKhienBicanh();
export const danhSachLenhBicanh = [controller.lenhBicanh];
export { controller as boDieuKhienBicanh };
