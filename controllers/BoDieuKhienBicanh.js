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

  // Luyện Khí
  if (loai === 'Vũ khí') return 'so_cap_thiet_quang';
  if (loai === 'Giáp') return 'tho_linh_dan_ty';
  if (loai === 'Ngọc Bội') return 'linh_khi_toai_thach';
  if (loai === 'Pháp Bảo') {
    if (itemId === 'pb_lk_linh_phong_cham' || itemId === 'pb_lk_toai_thach_an') return 'nham_hoa_tinh_hoa';
    if (itemId === 'pb_lk_dan_loi_phu' || itemId === 'pb_lk_hoa_tinh_dinh') return 'sat_danh_moc';
    if (itemId === 'pb_lk_ho_than_kinh' || itemId === 'pb_lk_thach_phu_thuan') return 'kien_thach_tam';
    if (itemId === 'pb_lk_dinh_than_phu' || itemId === 'pb_lk_u_thiet_lien') return 'thiet_dang_man';
    if (itemId === 'pb_lk_thanh_linh_binh' || itemId === 'pb_lk_da_son_sam') return 'linh_tuyen_thuy';
    if (itemId === 'pb_lk_tu_khi_ky' || itemId === 'pb_lk_chien_co') return 'yeu_thu_huyet';
    const lkPbMats = ['nham_hoa_tinh_hoa', 'sat_danh_moc', 'kien_thach_tam', 'thiet_dang_man', 'linh_tuyen_thuy', 'yeu_thu_huyet'];
    let sum = 0;
    const str = itemId || '';
    for (let c = 0; c < str.length; c++) {
      sum += str.charCodeAt(c);
    }
    return lkPbMats[sum % lkPbMats.length];
  }
  return 'so_cap_thiet_quang';
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
        let playerMp = tuSi.mp;
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
            } else if (activeSkill.loai === 'khong_che') {
              if (Math.random() <= activeSkill.chance) {
                bossStunnedRounds = activeSkill.duration;
                battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}**, khiến đối phương bị **Đóng Băng (mất lượt) trong ${activeSkill.duration} hiệp**!`);
              } else {
                battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}** nhưng bị đối phương kháng cự!`);
              }
            } else if (activeSkill.loai === 'hoi_hp') {
              playerHp = Math.min(stats.max_hp, playerHp + activeSkill.triGia);
              battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}**, hồi phục lập tức \`+${activeSkill.triGia}\` HP (Hiện tại: \`${playerHp}/${stats.max_hp}\`).`);
            } else if (activeSkill.loai === 'hoi_mp') {
              playerMp = Math.min(stats.max_mp, playerMp + activeSkill.triGia);
              battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}**, hồi phục lập tức \`+${activeSkill.triGia}\` MP (Hiện tại: \`${playerMp}/${stats.max_mp}\`).`);
            } else if (activeSkill.loai === 'tu_khi_ky') {
              activeBuffs.push({
                ten: activeSkill.ten,
                pbTen: eq.item.ten,
                loai: 'tu_khi_ky',
                triGia: activeSkill.triGia,
                speedBonus: activeSkill.speedBonus,
                roundsLeft: activeSkill.duration
              });
              battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}**, tăng \`+${activeSkill.triGia}%\` Pháp Công và \`+${activeSkill.speedBonus}\` Tốc độ trong \`${activeSkill.duration}\` hiệp.`);
            } else if (activeSkill.loai === 'thach_phu_thuan') {
              playerShield = (playerShield || 0) + activeSkill.triGia;
              activeBuffs.push({
                ten: activeSkill.ten,
                pbTen: eq.item.ten,
                loai: 'thach_phu_thuan',
                roundsLeft: activeSkill.duration
              });
              battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}**, tạo khiên \`+${activeSkill.triGia}\` HP và tăng \`+30%\` Phòng thủ trong \`${activeSkill.duration}\` hiệp.`);
            } else if (activeSkill.loai === 'u_thiet_lien') {
              const dmg = activeSkill.triGia;
              monsterHp = Math.max(0, monsterHp - dmg);
              bossSlowRounds = activeSkill.duration;
              bossSlowPctVal = 0.05;
              activeBuffs.push({
                ten: activeSkill.ten,
                pbTen: eq.item.ten,
                loai: 'u_thiet_lien_debuff',
                roundsLeft: activeSkill.duration
              });
              battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}**, gây \`${dmg}\` sát thương và giảm \`5\` Tốc độ của đối phương trong \`${activeSkill.duration}\` hiệp.`);
            } else if (activeSkill.loai === 'chien_co') {
              activeBuffs.push({
                ten: activeSkill.ten,
                pbTen: eq.item.ten,
                loai: 'chien_co',
                triGia: activeSkill.triGia,
                roundsLeft: activeSkill.duration
              });
              battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}**, tăng \`+${activeSkill.triGia}%\` Vật Công và \`+5%\` Bạo kích trong \`${activeSkill.duration}\` hiệp.`);
            }
          }
        }

        if (monsterHp <= 0) {
          isWin = true;
        }

        // Trạng thái hiệu ứng Luyện Khí
        let tuKhiActive = 0;
        let chienYStacks = 0;
        let chienYDuration = 0;
        let linhPhaoDebuff = 0;

        // Kích hoạt kỹ năng chủ động của Thần Thú khi vào trận chiến
        let kyLanCumulativeDmg = 0;
        let kyLanBurstTriggered = false;

        if (activePet && false && monsterHp > 0) {
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
      let bossSlowRounds = 0;
      let bossSlowPctVal = 0;



      const petState = { cooldown: 0 };
      let bleed = null;
      let blind = 0;
      let slow = 0;
      let tebut = 0;
      let nightmare = 0;
      let hoito = 0;
      let caitu = 0;
      
      let caituTriggered = false;
      let critImmune = false;
      let reflect = false;

      let monsterBleed = null;
      let monsterBlind = 0;
      let monsterSlow = 0;
      let monsterTebut = 0;
      let monsterNightmare = 0;
      let monsterTanKhiRounds = 0;
      let monsterTanKhiPct = 0;

      while (monsterHp > 0 && playerHp > 0 && playerActionCount < 15) {
        // Tính toán tốc độ hành động động của người chơi theo buff
        let currentPlaySpeed = stats.speed || 100;
        for (const buff of activeBuffs) {
          if (buff.loai === 'huyet_mach_cuong_hoa' && buff.roundsLeft > 0) {
            currentPlaySpeed += buff.speedBonus;
          }
          if (buff.loai === 'tu_khi_ky' && buff.roundsLeft > 0) {
            currentPlaySpeed += buff.speedBonus;
          }
          if (buff.loai === 'bat_hoang_bo_buff' && buff.roundsLeft > 0) {
            currentPlaySpeed += buff.speedBonus;
          }
        }
        if (chienYStacks > 0 && chienYDuration > 0) {
          const skillHKPT = skills.find(s => s.detail.id === 'huyet_khi_phun_trao');
          const capDoHKPT = skillHKPT ? skillHKPT.capDo : 1;
          const speedBonusPerStack = Math.floor(2 * (1 + (capDoHKPT - 1) * 0.01));
          currentPlaySpeed += chienYStacks * speedBonusPerStack;
        }
        const dynamicBaseAvPlayer = 10000 / currentPlaySpeed;

        if (avPlayer <= avBoss) {
          // Lượt của người chơi
          const elapsed = avPlayer;
          avBoss -= elapsed;
          avPlayer = dynamicBaseAvPlayer;

          // --- NEW PET SYSTEM PLAYER TURN ---
          if (bleed && bleed.turns > 0) {
            const dmg = bleed.dmg;
            playerHp = Math.max(0, playerHp - dmg);
            bleed.turns -= 1;
            battleLogs.push(`🩸 **Chảy Máu**: Bạn mất \`${dmg.toLocaleString()}\` HP từ vết thương chảy máu (HP còn: \`${playerHp.toLocaleString()}\`).`);
            if (bleed.turns <= 0) bleed = null;
            if (playerHp <= 0) {
              if (caitu > 0 && !caituTriggered) {
                playerHp = Math.floor(stats.max_hp * 0.30);
                caituTriggered = true;
                caitu = 0;
                battleLogs.push(`😇 **CẢI TỬ HOÀN SINH**: Ấn ký bảo mệnh hồi sinh bạn với \`${playerHp.toLocaleString()}\` HP!`);
              } else {
                break;
              }
            }
          }

          if (hoito > 0) {
            hoito -= 1;
            const heal = Math.floor(stats.max_hp * 0.05);
            playerHp = Math.min(stats.max_hp, playerHp + heal);
            battleLogs.push(`🌿 **Hồi Tô**: Bạn tự hồi phục \`${heal.toLocaleString()}\` HP đầu hiệp (HP hiện tại: \`${playerHp.toLocaleString()}\`).`);
          }

          if (nightmare > 0) {
            nightmare -= 1;
            const mpLost = Math.floor(playerMp * 0.10);
            playerMp = Math.max(0, playerMp - mpLost);
            battleLogs.push(`💤 **Mộng Yểm**: Bạn bị chìm trong ác mộng, mất lượt hành động và tổn hao \`${mpLost.toLocaleString()}\` MP!`);
            playerActionCount++;
            combatRound++;
            continue;
          }

          // Active Pet Skill execution
          if (activePet && playerHp > 0 && monsterHp > 0) {
            if (petState.cooldown > 0) petState.cooldown -= 1;
            if (petState.cooldown === 0) {
              const dummyBossStats = { max_hp: monsterHp, vat_cong: monster.vatCong || 100, phap_cong: monster.vatCong || 100, vat_phong: monster.giap || 10, phap_phong: monster.giap || 10, speed: 100 };
              const res = config.handlePetCombatSkill(activePet, petState, stats, dummyBossStats, battleLogs, tuSi.ten, monster.ten, monsterBleed);
              if (res) {
                battleLogs.push(res.log);
                if (res.damage > 0) {
                  let finalDmg = res.damage;
                  if (res.ignoreDef) {
                    const targetDef = monster.giap * (1.0 - res.ignoreDef);
                    finalDmg = Math.max(1, Math.floor(finalDmg - targetDef));
                  } else {
                    finalDmg = Math.max(1, Math.floor(finalDmg - monster.giap));
                  }
                  
                  if (res.checkTebutBonus && monsterTebut > 0) {
                    const bonusTrue = Math.floor(monsterHp * 0.05);
                    finalDmg += bonusTrue;
                    battleLogs.push(`❄️ **Tê Buốt Kích Phát**: Sát thương sủng vật tăng thêm \`+${bonusTrue.toLocaleString()}\` sát thương chuẩn!`);
                  }

                  monsterHp = Math.max(0, monsterHp - finalDmg);
                  battleLogs.push(`💥 **Sát thương sủng vật**: **${monster.ten}** nhận \`${finalDmg.toLocaleString()}\` sát thương sủng vật (HP còn: \`${monsterHp.toLocaleString()}\`).`);

                  if (res.execute && monsterHp > 0 && monsterHp < monster.hp * 0.15) {
                    monsterHp = 0;
                    battleLogs.push(`💀 **KẾT LIỄU**: Sủng vật lập tức kết liễu **${monster.ten}** dưới 15% HP!`);
                  }
                }
                if (res.healHp > 0) {
                  playerHp = Math.min(stats.max_hp, playerHp + res.healHp);
                  battleLogs.push(`💚 **Hồi phục**: Bạn hồi phục \`${res.healHp.toLocaleString()}\` HP.`);
                }
                if (res.healMp > 0) {
                  playerMp = Math.min(stats.max_mp, playerMp + res.healMp);
                  battleLogs.push(`💙 **Hồi phục**: Bạn hồi phục \`${res.healMp.toLocaleString()}\` MP.`);
                }
                if (res.shield > 0) {
                  playerShield = res.shield;
                  if (res.critImmune) critImmune = true;
                  if (res.reflectDmg) reflect = true;
                }
                if (res.clearBleed) {
                  monsterBleed = null;
                }
                if (res.applyBleed) monsterBleed = res.applyBleed;
                if (res.applyBlind) monsterBlind = res.applyBlind.turns;
                if (res.applySlow) {
                  bossSlowRounds = res.applySlow.turns;
                  bossSlowPctVal = 0.15;
                }
                if (res.applyTebut) monsterTebut = res.applyTebut.turns;
                if (res.applyNightmare) monsterNightmare = res.applyNightmare.turns;
                if (res.applyHoito) hoito = res.applyHoito.turns;
                if (res.applyCaituhoansinh) caitu = res.applyCaituhoansinh.turns;
              }
            }
          }

          if (blind > 0) blind--;
          if (slow > 0) slow--;
          if (tebut > 0) tebut--;
          if (caitu > 0) caitu--;
          if (playerShield <= 0) {
            critImmune = false;
            reflect = false;
          }

          if (blind > 0 && Math.random() <= 0.50) {
            battleLogs.push(`👁️ **Mù mắt**: Bạn đang bị [Mù], chiêu thức chệch hướng hoàn toàn!`);
            playerActionCount++;
            combatRound++;
            continue;
          }

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

          // Pháp Tướng Kim Cang Regen
          for (const buff of activeBuffs) {
            if (buff.loai === 'phap_tuong_kim_cang_regen' && buff.roundsLeft > 0) {
              const healAmt = Math.floor(stats.max_hp * buff.triGia);
              playerHp = Math.min(stats.max_hp, playerHp + healAmt);
              battleLogs.push(`❇️ **Pháp Tướng Kim Cang**: Hồi phục \`+${healAmt.toLocaleString()}\` HP từ hư ảnh hộ pháp (HP hiện tại: \`${playerHp}/${stats.max_hp}\`).`);
            }
          }

          // Hỏa Lôi Đạp burn damage
          for (const buff of activeBuffs) {
            if (buff.loai === 'hoa_loi_dap' && buff.roundsLeft > 0) {
              const burnDmg = Math.floor(stats.vat_cong * buff.triGia);
              monsterHp = Math.max(0, monsterHp - burnDmg);
              battleLogs.push(`🔥 **Hỏa Lôi Đạp**: Yêu thú bị thiêu đốt chịu \`-${burnDmg.toLocaleString()}\` sát thương vật lý (HP còn: \`${monsterHp.toLocaleString()}\`).`);
            }
          }
          if (monsterHp <= 0) {
            isWin = true;
            break;
          }

          let roundAtkMult = 1.0;
          for (const buff of activeBuffs) {
            if (buff.loai === 'tang_cong_pct' && buff.roundsLeft > 0) {
              roundAtkMult += buff.triGia / 100;
            } else if (buff.loai === 'huyet_mach_cuong_hoa' && buff.roundsLeft > 0) {
              roundAtkMult += buff.triGia;
            } else if (buff.loai === 'tu_khi_ky' && buff.roundsLeft > 0) {
              roundAtkMult += buff.triGia / 100;
            } else if (buff.loai === 'chien_co' && buff.roundsLeft > 0) {
              roundAtkMult += buff.triGia / 100;
            } else if (buff.loai === 'tu_duong_chuong' && buff.roundsLeft > 0) {
              roundAtkMult += buff.triGia;
            } else if (buff.loai === 'hong_hoang_kich_buff' && buff.roundsLeft > 0) {
              roundAtkMult += buff.triGia;
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
          for (const buff of activeBuffs) {
            if (buff.loai === 'chien_co' && buff.roundsLeft > 0) {
              roundCritRate += 0.05;
            }
          }

          // Tìm kỹ năng sẵn sàng và đủ MP
          const readySkill = skills.find(s => {
            const cost = config.getSkillMpCost(s.detail);
            return s.nextRoundAvailable <= playerActionCount + 1 && playerMp >= cost;
          });
          let pDmg = 0;
          let isCrit = Math.random() <= roundCritRate;
          let castMsg = '';

          if (readySkill) {
            const skill = readySkill.detail;
            const capDo = readySkill.capDo;
            const cost = config.getSkillMpCost(skill);
            playerMp = Math.max(0, playerMp - cost);

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
                const slowChance = 0.15 * (1 + (capDo - 1) * 0.01);
                if (Math.random() <= slowChance) {
                  linhPhaoDebuff = 2;
                  battleLogs.push(`💥 **Linh Pháo Kích Nổ**: Kích hoạt combo Tụ Khí, gây thêm 30% sát thương lan và làm giảm \`3\` Tốc độ của yêu thú trong 2 hiệp!`);
                } else {
                  battleLogs.push(`💥 **Linh Pháo Kích Nổ**: Kích hoạt combo Tụ Khí, gây thêm 30% sát thương lan!`);
                }
                rawDmg = rawDmg * 1.30;
              } else {
                battleLogs.push(`🌀 **Tụ Khí Kích Phát**: Sát thương của chiêu thức phép thuật này tăng thêm \`+${Math.round(bonusPct * 100)}%\`!`);
              }
              tuKhiActive = 0; // Tiêu hao trạng thái Tụ Khí
            }

            if (skill.id === 'bang_son_quyen' && chienYStacks >= 2) {
              const critBonus = 0.20 * (1 + (capDo - 1) * 0.01);
              roundCritRate += critBonus;
              isCrit = Math.random() <= roundCritRate;
              bossStunnedRounds = 1;
              chienYStacks = 0;
              chienYDuration = 0;
              castMsg = `thi triển **Toái Đỉnh Quyền (Cấp ${capDo})**`;
              battleLogs.push(`👊 **Toái Đỉnh Quyền**: Tiêu hao toàn bộ tầng Chiến Ý chuyển hóa Băng Sơn Quyền, tăng \`+${Math.round(critBonus * 100)}%\` tỷ lệ bạo kích và khiến yêu thú bị **[Choáng]** trong 1 hiệp!`);
            }

            if (isCrit) rawDmg = rawDmg * roundCritDmg;

            let targetDef = monsterDef;
            if (skill.id === 'bat_hoang_toai_thach_kich') {
              const ignorePct = Math.min(1.0, 0.10 * (1 + (capDo - 1) * 0.01));
              targetDef = Math.floor(monsterDef * (1 - ignorePct));
            }
            if (monsterTanKhiRounds > 0) {
              targetDef = Math.floor(targetDef * (1 - monsterTanKhiPct));
            }
            pDmg = Math.max(1, Math.floor(rawDmg) - targetDef);
            if (skill.satThuong === 0) pDmg = 0;

            const cooldownRounds = Math.max(1, Math.ceil(skill.cooldown / 3));
            readySkill.nextRoundAvailable = playerActionCount + 1 + cooldownRounds;

             // Xử lý hiệu ứng đặc biệt của kỹ năng Luyện Khí
            if (skill.id === 'tu_khi_thuat') {
              const mpRecPct = 0.15 * (1 + (capDo - 1) * 0.01);
              const mpRecAmt = Math.floor(stats.max_mp * mpRecPct);
              playerMp = Math.min(stats.max_mp, playerMp + mpRecAmt);
              tuKhiActive = 2;
              battleLogs.push(`🌀 **${skill.ten}**: Dẫn dắt linh khí hồi phục \`+${mpRecAmt.toLocaleString()}\` MP và nhận trạng thái **[Tụ Khí]** trong 2 hiệp.`);
            }
            if (skill.id === 'huyet_khi_phun_trao') {
              const hpSacrifice = Math.floor(playerHp * 0.10);
              playerHp = Math.max(1, playerHp - hpSacrifice);
              chienYStacks = Math.min(3, (chienYStacks || 0) + 1);
              chienYDuration = 3;
              battleLogs.push(`🔥 **${skill.ten}**: Thiêu đốt \`-${hpSacrifice.toLocaleString()}\` HP hiện tại, tích lũy 1 tầng **[Chiến Ý]** (Hiện tại: \`${chienYStacks}/3\` tầng, kéo dài 3 hiệp).`);
            }

            // Xử lý hiệu ứng đặc biệt của kỹ năng Trúc Cơ
            if (skill.id === 'tu_duong_chuong') {
              const phapCongBonus = 0.10 * (1 + (capDo - 1) * 0.01);
              activeBuffs.push({
                ten: skill.ten,
                pbTen: skill.ten,
                loai: 'tu_duong_chuong',
                triGia: phapCongBonus,
                roundsLeft: 3
              });
              const tanKhiChance = 0.35 * (1 + (capDo - 1) * 0.01);
              if (Math.random() <= tanKhiChance) {
                monsterTanKhiRounds = 2;
                monsterTanKhiPct = 0.15 * (1 + (capDo - 1) * 0.01);
                battleLogs.push(`🔥 **${skill.ten}**: Gây trạng thái **[Tán Khí]** làm giảm \`-${Math.round(monsterTanKhiPct * 100)}%\` Kháng Pháp của đối phương trong 2 hiệp.`);
              }
            }
            if (skill.id === 'phap_tuong_kim_cang') {
              const hpHealPct = 0.08 * (1 + (capDo - 1) * 0.01);
              const defBonusPct = 0.30 * (1 + (capDo - 1) * 0.01);
              const hoTheReduction = 0.15 * (1 + (capDo - 1) * 0.01);
              activeBuffs.push({
                ten: skill.ten,
                pbTen: skill.ten,
                loai: 'phap_tuong_kim_cang_regen',
                triGia: hpHealPct,
                roundsLeft: 5
              });
              activeBuffs.push({
                ten: skill.ten,
                pbTen: skill.ten,
                loai: 'phap_tuong_kim_cang_shield',
                defBonus: defBonusPct,
                reduction: hoTheReduction,
                roundsLeft: 5
              });
              battleLogs.push(`🛡️ **${skill.ten}**: Triệu hồi Pháp Tướng, tăng cường phòng ngự và hồi phục tự thân.`);
            }
            if (skill.id === 'hong_hoang_kich') {
              const hpHealAmt = Math.floor(stats.max_hp * 0.05);
              playerHp = Math.min(stats.max_hp, playerHp + hpHealAmt);
              const vatCongBonus = 0.15 * (1 + (capDo - 1) * 0.01);
              activeBuffs.push({
                ten: skill.ten,
                pbTen: skill.ten,
                loai: 'hong_hoang_kich_buff',
                triGia: vatCongBonus,
                roundsLeft: 2
              });
              battleLogs.push(`🩸 **${skill.ten}**: Hồi phục \`+${hpHealAmt.toLocaleString()}\` HP, tăng \`+${Math.round(vatCongBonus * 100)}%\` Vật công trong 2 hiệp.`);
              
              if (monsterHp / monster.hp >= 0.70) {
                isCrit = true;
                battleLogs.push(`💥 **${skill.ten}**: Mục tiêu dồi dào huyết khí, kích hoạt chắc chắn bạo kích!`);
              }
              const stunChance = 0.30 * (1 + (capDo - 1) * 0.01);
              if (Math.random() <= stunChance) {
                bossStunnedRounds = 1;
                battleLogs.push(`💤 **${skill.ten}**: Gây trạng thái **[Định Thân]** khiến yêu thú mất lượt!`);
              }
            }
            if (skill.id === 'bat_hoang_bo') {
              const hpHealAmt = Math.floor(stats.max_hp * 0.10);
              playerHp = Math.min(stats.max_hp, playerHp + hpHealAmt);
              const speedBonus = Math.floor((stats.speed || 100) * 0.30 * (1 + (capDo - 1) * 0.01));
              const neBonus = 0.20 * (1 + (capDo - 1) * 0.01);
              activeBuffs.push({
                ten: skill.ten,
                pbTen: skill.ten,
                loai: 'bat_hoang_bo_buff',
                speedBonus: speedBonus,
                neBonus: neBonus,
                roundsLeft: 4
              });
              activeBuffs.push({
                ten: skill.ten,
                pbTen: skill.ten,
                loai: 'hoa_loi_dap',
                triGia: 0.40 * (1 + (capDo - 1) * 0.01),
                roundsLeft: 4
              });
              battleLogs.push(`👟 **${skill.ten}**: Hồi \`+${hpHealAmt.toLocaleString()}\` HP, tăng tốc độ và khả năng né tránh, kích hoạt trạng thái **[Hỏa Lôi Đạp]**.`);
            }

            // Xử lý hiệu ứng đặc biệt của kỹ năng Kim Đan
            if (skill.id === 'cuu_long_ba_the_tran') {
              const shieldPct = 0.20 * (1 + (capDo - 1) * 0.01);
              const shieldAmt = Math.floor(stats.max_hp * shieldPct);
              playerShield = (playerShield || 0) + shieldAmt;
              battleLogs.push(`🛡️ **${skill.ten}**: Tạo lá chắn vững chắc \`+${shieldAmt.toLocaleString()}\` HP.`);
            }
            if (skill.id === 'huyet_mach_cuong_hoa') {
              const hpSacrifice = Math.floor(playerHp * 0.10);
              playerHp = Math.max(1, playerHp - hpSacrifice);
              const atkBonusPct = 0.30 * (1 + (capDo - 1) * 0.01);
              const speedBonus = Math.floor(20 * (1 + (capDo - 1) * 0.01));
              activeBuffs.push({
                ten: skill.ten,
                pbTen: skill.ten,
                loai: 'huyet_mach_cuong_hoa',
                triGia: atkBonusPct,
                speedBonus: speedBonus,
                roundsLeft: 3
              });
              battleLogs.push(`🔥 **${skill.ten}**: Thiêu đốt \`-${hpSacrifice}\` HP hiện tại, tăng \`+${Math.floor(atkBonusPct * 100)}%\` Vật Công và \`+${speedBonus}\` Tốc độ trong 3 hiệp.`);
            }
            if (skill.id === 'thai_hu_van_kiem_quyet') {
              const speedRedPct = 0.10 * (1 + (capDo - 1) * 0.01);
              bossSlowRounds = 3;
              bossSlowPctVal = speedRedPct;
              battleLogs.push(`❄️ **${skill.ten}**: Làm chậm \`+${Math.floor(speedRedPct * 100)}%\` Tốc độ của đối phương.`);
            }
            if (skill.id === 'ngu_loi_oanh_dinh') {
              const stunChance = 0.20 * (1 + (capDo - 1) * 0.01);
              if (Math.random() <= stunChance) {
                bossStunnedRounds = 1;
                battleLogs.push(`⚡ **${skill.ten}**: Gây trạng thái **Tê Liệt (Choáng)** cho đối phương trong 1 hiệp!`);
              }
            }
            if (skill.id === 'dai_tu_linh_tran') {
              const mpHealPct = 0.30 * (1 + (capDo - 1) * 0.01);
              const mpAmt = Math.floor(stats.max_mp * mpHealPct);
              playerMp = Math.min(stats.max_mp, playerMp + mpAmt);
              for (const s of skills) {
                if (s.detail.id !== 'dai_tu_linh_tran') {
                  s.nextRoundAvailable = Math.max(1, s.nextRoundAvailable - 1);
                }
              }
              battleLogs.push(`✨ **${skill.ten}**: Hồi phục \`+${mpAmt}\` Chân Khí (MP), giảm thời gian hồi chiêu của các kỹ năng khác đi 1 lượt.`);
            }
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

          // Giảm buff thời hạn Luyện Khí
          if (tuKhiActive > 0) {
            tuKhiActive--;
            if (tuKhiActive === 0) {
              battleLogs.push(`✨ Hiệu ứng [Tụ Khí] đã hết tác dụng.`);
            }
          }
          if (chienYDuration > 0) {
            chienYDuration--;
            if (chienYDuration === 0) {
              chienYStacks = 0;
              battleLogs.push(`✨ Hiệu ứng [Chiến Ý] đã hết tác dụng.`);
            }
          }
          if (linhPhaoDebuff > 0) {
            linhPhaoDebuff--;
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

          // --- NEW PET SYSTEM BOSS TURN ---
          if (monsterBleed && monsterBleed.turns > 0) {
            const dmg = monsterBleed.dmg;
            monsterHp = Math.max(0, monsterHp - dmg);
            monsterBleed.turns -= 1;
            battleLogs.push(`🩸 **Chảy Máu**: **${monster.ten}** chịu \`-${dmg.toLocaleString()}\` sát thương chảy máu (HP còn: \`${monsterHp.toLocaleString()}\`).`);
            if (monsterBleed.turns <= 0) monsterBleed = null;
            if (monsterHp <= 0) {
              isWin = true;
              break;
            }
          }

          if (monsterNightmare > 0) {
            monsterNightmare -= 1;
            battleLogs.push(`💤 **Mộng Yểm**: **${monster.ten}** bị chìm trong ác mộng không thể hành động!`);
            combatRound++;
            continue;
          }

          if (monsterBlind > 0 && Math.random() <= 0.50) {
            battleLogs.push(`👁️ **Mù mắt**: **${monster.ten}** bị [Mù], đòn đánh hụt hoàn toàn!`);
            monsterBlind--;
            combatRound++;
            continue;
          }

          if (monsterBlind > 0) monsterBlind--;
          if (monsterSlow > 0) monsterSlow--;
          if (monsterTebut > 0) monsterTebut--;
          if (monsterTanKhiRounds > 0) monsterTanKhiRounds--;
          
          let currentBossSpeed = 100;
          if (bossSlowRounds > 0) {
            currentBossSpeed = Math.max(10, Math.floor(currentBossSpeed * (1 - bossSlowPctVal)));
          }
          if (linhPhaoDebuff > 0) {
            currentBossSpeed = Math.max(10, currentBossSpeed - 3);
          }
          for (const buff of activeBuffs) {
            if (buff.loai === 'u_thiet_lien_debuff' && buff.roundsLeft > 0) {
              currentBossSpeed = Math.max(10, currentBossSpeed - 5);
            }
          }
          avBoss = 10000 / currentBossSpeed;

          if (bossStunnedRounds > 0) {
            battleLogs.push(`💤 **Choáng**: Yêu thú bị choáng không thể phản công trong hiệp này!`);
          } else {
            const mAtk = Math.max(monster.vatCong, monster.phapCong);
            let pDef = monster.vatCong > monster.phapCong ? stats.vat_phong : stats.phap_phong;
            for (const buff of activeBuffs) {
              if (buff.loai === 'thach_phu_thuan' && buff.roundsLeft > 0) {
                pDef = Math.floor(pDef * 1.30);
              }
              if (buff.loai === 'phap_tuong_kim_cang_shield' && buff.roundsLeft > 0) {
                pDef = Math.floor(pDef * (1 + buff.defBonus));
              }
            }
            let mDmg = Math.max(1, mAtk - pDef);
            if (stats.dmg_red) {
              mDmg = Math.floor(mDmg * (1 - stats.dmg_red));
            }
            let hoTheRed = 0;
            for (const buff of activeBuffs) {
              if (buff.loai === 'phap_tuong_kim_cang_shield' && buff.roundsLeft > 0) {
                hoTheRed = Math.max(hoTheRed, buff.reduction);
              }
            }
            if (hoTheRed > 0) {
              mDmg = Math.floor(mDmg * (1 - hoTheRed));
            }

            if (bossWeakenRounds > 0) {
              mDmg = Math.floor(mDmg * (1 - bossWeakenPct));
              battleLogs.push(`✨ **Suy yếu**: Yêu thú bị suy yếu, sát thương phản công giảm đi \`-${Math.floor(bossWeakenPct * 100)}%\`.`);
            }

            const isMonsterCrit = critImmune ? false : (Math.random() <= 0.15);
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
            for (const buff of activeBuffs) {
              if (buff.loai === 'bat_hoang_bo_buff' && buff.roundsLeft > 0) {
                roundNe = Math.min(0.90, roundNe + buff.neBonus);
              }
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
                
                if (reflect && playerShield > 0) {
                  const refl = Math.floor(mDmg * 0.30);
                  monsterHp = Math.max(0, monsterHp - refl);
                  battleLogs.push(`🛡️ **Phản Đòn**: Thần Trận Sơn Thần phản hồi \`+${refl.toLocaleString()}\` sát thương ngược lại **${monster.ten}** (HP còn: \`${monsterHp.toLocaleString()}\`).`);
                  if (monsterHp <= 0) {
                    isWin = true;
                  }
                }
                
                if (playerHp <= 0) {
                  if (caitu > 0 && !caituTriggered) {
                    playerHp = Math.floor(stats.max_hp * 0.30);
                    caituTriggered = true;
                    caitu = 0;
                    battleLogs.push(`😇 **CẢI TỬ HOÀN SINH**: Ấn ký bảo mệnh cứu mạng đạo hữu, hồi sinh lại với \`${playerHp.toLocaleString()}\` HP!`);
                  }
                }
              }
            }
          }

          if (bossStunnedRounds > 0) bossStunnedRounds--;
          if (bossWeakenRounds > 0) bossWeakenRounds--;
          if (bossSlowRounds > 0) bossSlowRounds--;

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
                if (itemDetail.doHiem === 'Huyền thoại' || itemDetail.doHiem === 'Thần cấp' || targetId === 'trung_than_thu' || targetId === 'chuyen_sinh_dan') {
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
              if (itemDetail.doHiem === 'Huyền thoại' || itemDetail.doHiem === 'Thần cấp' || targetId === 'trung_than_thu' || targetId === 'chuyen_sinh_dan') {
                // Chặn không rơi
              } else {
                droppedBreakthrough = itemDetail;
                await Inventory.addVatPham(tuSi.idNguoiDung, targetId, 1);
              }
            }
          }

          // 20% rơi hạt giống dược viên
          if (Math.random() <= 0.20) {
            const seedId = 'hat_giong_tu_linh_thao';
            const seedDetail = await Item.findByPk(seedId);
            if (seedDetail) {
              if (seedDetail.doHiem === 'Huyền thoại' || seedDetail.doHiem === 'Thần cấp' || seedId === 'trung_than_thu' || seedId === 'chuyen_sinh_dan') {
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
              if (eggDetail.doHiem === 'Huyền thoại' || eggDetail.doHiem === 'Thần cấp' || targetEggId === 'trung_than_thu' || targetEggId === 'chuyen_sinh_dan') {
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
          tuSi.mp = Math.min(stats.max_mp, playerMp);
        } else {
          // HP suy kiệt sau trận thua
          tuSi.hp = Math.max(1, Math.floor(tuSi.hp - stats.max_hp * 0.30));
          tuSi.mp = Math.min(stats.max_mp, playerMp);
        }
        tuSi.theLuc = Math.max(0, tuSi.theLuc - 1);

        await tuSi.save();

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
