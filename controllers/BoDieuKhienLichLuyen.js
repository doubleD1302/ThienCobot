import { SlashCommandBuilder } from 'discord.js';
import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';
import { Inventory } from '../models/Inventory.js';
import { Item } from '../models/Item.js';
import { ThienDaoLuc } from '../models/ThienDaoLuc.js';
import * as config from '../config.js';

class BoDieuKhienLichLuyen extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhLichLuyen = {
    data: new SlashCommandBuilder()
      .setName('lichluyen')
      .setDescription('Bắt đầu hành trình lịch luyện bát hoang, tầm bảo và tìm kiếm cơ duyên ngẫu nhiên'),
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

      const stats = await tuSi.layChiSoDayDu();

      if (tuSi.hp <= Math.floor(stats.max_hp * 0.10)) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Trạng thái kiệt quệ! Khí huyết đạo hữu quá thấp (dưới 10%). Hãy nghỉ ngơi bằng `/nghi` hoặc dùng đan dược trước khi đi lịch luyện.")]
        });
      }

      // 2. Kiểm tra cooldown (60 giây)
      const activeCooldown = await this.kiemTraThoiGianCho(tuSi.idNguoiDung, 'lich_luyen');
      if (activeCooldown) {
        const hetHanTime = new Date(activeCooldown.hetHan).getTime();
        const secondsLeft = Math.max(0, Math.floor((hetHanTime - Date.now()) / 1000));
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(`Thiên địa linh khí chưa dung hòa! Đạo hữu cần tĩnh tọa thêm \`${secondsLeft} giây\` trước khi tiếp tục lịch luyện.`)]
        });
      }

      // 3. Truy vấn các sự kiện cơ duyên từ database
      const { AdventureEvent } = await import('../models/AdventureEvent.js');
      const allEvents = await AdventureEvent.findAll();
      
      if (allEvents.length === 0) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Hiện tại bát hoang đại lục bình lặng, chưa có cơ duyên nào xuất thế.")]
        });
      }

      // Chọn ngẫu nhiên một sự kiện cơ duyên từ DB
      const selectedEvent = allEvents[Math.floor(Math.random() * allEvents.length)];
      const effects = selectedEvent.hieuUng;
      let rewardText = '';

      const thienDao = await tuSi.layHeSoThienDao();

      // Áp dụng các hiệu ứng ngẫu nhiên
      if (effects.exp) {
        const minExp = effects.exp.min || 10;
        const maxExp = effects.exp.max || 20;
        const addedExp = Math.floor((minExp + Math.random() * (maxExp - minExp)) * thienDao.expMult);
        tuSi.linhLuc += addedExp;
        rewardText += `• **Linh lực tích lũy**: \`+${addedExp}\` ✨\n`;
      }
      if (effects.stones) {
        const minStones = effects.stones.min || 5;
        const maxStones = effects.stones.max || 15;
        const addedStones = Math.floor((minStones + Math.random() * (maxStones - minStones)) * thienDao.stoneMult);
        tuSi.linhThach += addedStones;
        rewardText += `• **Linh thạch nhặt được**: \`+${addedStones}\` 💎\n`;
      }
      if (effects.itemRandomEligible) {
        const allItems = await Item.findAll();
        const eligibleItems = allItems.filter(item => item.doHiem === 'Thường' || item.doHiem === 'Hiếm');
        const itemDropped = eligibleItems[Math.floor(Math.random() * eligibleItems.length)];
        if (itemDropped) {
          await Inventory.addVatPham(tuSi.idNguoiDung, itemDropped.id, 1);
          rewardText += `• **Vật phẩm nhận được**: **${itemDropped.ten}** 🎁\n`;
        }
      }
      if (effects.itemRandom) {
        const allItems = await Item.findAll({ where: { loai: effects.itemRandom.loai } });
        const itemDropped = allItems.length > 0 ? allItems[Math.floor(Math.random() * allItems.length)] : null;
        if (itemDropped) {
          await Inventory.addVatPham(tuSi.idNguoiDung, itemDropped.id, 1);
          rewardText += `• **Nhận Linh thảo**: **${itemDropped.ten}** x1 🌿\n`;
        }
      }
      if (effects.itemSpecified) {
        const itemDropped = await Item.findByPk(effects.itemSpecified.itemId);
        if (itemDropped) {
          const qty = effects.itemSpecified.quantity || 1;
          await Inventory.addVatPham(tuSi.idNguoiDung, itemDropped.id, qty);
          rewardText += `• **Nhận vật phẩm**: **${itemDropped.ten}** x${qty} 🎁\n`;
        }
      }
      if (effects.hpPhat) {
        const lostHp = Math.floor(stats.max_hp * effects.hpPhat);
        tuSi.hp = Math.max(1, tuSi.hp - lostHp);
        rewardText += `• **Tổn thương**: Trừ \`-${lostHp}\` HP 💔 (Còn lại: ${tuSi.hp}/${stats.max_hp})\n`;
      }
      if (effects.mpPhat) {
        const lostMp = Math.floor(stats.max_mp * effects.mpPhat);
        tuSi.mp = Math.max(0, tuSi.mp - lostMp);
        rewardText += `• **Pháp lực tiêu hao**: Trừ \`-${lostMp}\` MP 💧 (Còn lại: ${tuSi.mp}/${stats.max_mp})\n`;
      }

      // 20% cơ hội nhặt được hạt giống khi đi lịch luyện
      if (Math.random() <= 0.20) {
        const seedId = 'hat_giong_tu_linh_thao';
        const seedDetail = await Item.findByPk(seedId);
        if (seedDetail) {
          await Inventory.addVatPham(tuSi.idNguoiDung, seedId, 1);
          rewardText += `• **Hạt giống nhặt được**: **${seedDetail.ten}** 🌰\n`;
        }
      }

      // 10% cơ hội rơi nguyên liệu hoặc đan đột phá phù hợp cảnh giới
      const btData = config.layVatPhamDotPhaTheoCapDo(tuSi.capDo);
      if (btData && Math.random() <= 0.10) {
        const randType = Math.random();
        let targetId = btData.seedId;
        let typeStr = 'Hạt giống';
        if (randType >= 0.85) {
          targetId = btData.pillId;
          if (targetId === 'dan_dot_pha_5') {
            targetId = btData.herbId;
            typeStr = 'Dược thảo';
          } else {
            typeStr = 'Đan dược';
          }
        } else if (randType >= 0.50) {
          targetId = btData.herbId;
          typeStr = 'Dược thảo';
        }
        const itemDetail = await Item.findByPk(targetId);
        if (itemDetail) {
          await Inventory.addVatPham(tuSi.idNguoiDung, targetId, 1);
          rewardText += `• **Phá cảnh phẩm**: Nhận được **${itemDetail.ten}** (${typeStr}) 🔮\n`;
        }
      }

      if (thienDao && (thienDao.expMult > 1.0 || thienDao.stoneMult > 1.0)) {
        rewardText += `• **Phù trì**: **${thienDao.name}** (${thienDao.expMult > 1.0 ? '+' + Math.floor((thienDao.expMult - 1) * 100) + '% Tu Vi' : '+' + Math.floor((thienDao.stoneMult - 1) * 100) + '% Linh Thạch'}) (Hạng ${thienDao.rank})\n`;
      }

      tuSi.theLuc = Math.max(0, tuSi.theLuc - 1);
      await tuSi.save();

      rewardText += `• **Tiêu hao thể lực**: \`-1\` 🔋 (Còn lại: \`${tuSi.theLuc}/${tuSi.theLucMax}\` 🔋)\n`;

      // Thiết lập cooldown lịch luyện (30 giây)
      const expiresAt = new Date(Date.now() + 30 * 1000);
      await this.datThoiGianCho(tuSi.idNguoiDung, 'lich_luyen', expiresAt);

      // Tạo embed hiển thị
      const colorMap = {
        tot: 0x3498db, // Xanh lam
        dai_co_duyen: 0xf1c40f, // Vàng kim
        xui_xeo: 0xe74c3c // Đỏ
      };

      const embedResult = BoTaoEmbed.thongTin(selectedEvent.ten, `**Mô tả**: ${selectedEvent.moTa}\n\n**Hậu quả / Chiến lợi phẩm**:\n${rewardText}`);
      embedResult.setColor(colorMap[selectedEvent.loai] || 0x2ecc71);
      embedResult.setFooter({ text: "Tiếp tục tích lũy căn cơ để đón nhận đại cơ duyên tiếp theo." });

      return await interaction.editReply({ embeds: [embedResult] });
    }
  };
}

const controller = new BoDieuKhienLichLuyen();
export const danhSachLenhLichLuyen = [controller.lenhLichLuyen];
export { controller as boDieuKhienLichLuyen };
