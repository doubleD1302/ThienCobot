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

      // 1. Kiểm tra trạng thái HP tối thiểu (HP > 10%)
      const equippedInv = await Inventory.findAll({
        where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true }
      });
      const equippedItems = [];
      for (const eq of equippedInv) {
        const detail = await Item.findByPk(eq.itemId);
        if (detail) equippedItems.push(detail);
      }
      const stats = tuSi.layChiSo(equippedItems);

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

      // 3. Khởi tạo danh sách các Cơ Duyên ngẫu nhiên
      const SU_KIEN_LIST = [
        {
          id: 'linh_khi_trieu_tich',
          ten: '⚡ Linh Khí Triều Tịch ⚡',
          loai: 'tot',
          run: async () => {
            const addedExp = Math.floor(40 + Math.random() * 60);
            tuSi.linhLuc += addedExp;
            await tuSi.save();
            return {
              desc: `Trong lúc leo lên đỉnh Ngọc Kinh Sơn, đạo hữu vô tình gặp một luồng linh khí trời đất bộc phát, cọ rửa kinh mạch, tu vi tiến triển nhanh chóng!`,
              reward: `• **Linh lực tích lũy**: \`+${addedExp}\` ✨`
            };
          }
        },
        {
          id: 'nhat_linh_thach',
          ten: '🪙 Linh Thạch Thượng Cổ 🪙',
          loai: 'tot',
          run: async () => {
            const addedStones = Math.floor(20 + Math.random() * 50);
            tuSi.linhThach += addedStones;
            await tuSi.save();
            return {
              desc: `Tại một lòng sông cạn dưới chân U Minh Cốc, đạo hữu vô tình phát hiện ra một số viên Linh Thạch thượng cổ bị chôn vùi dưới cát mịn.`,
              reward: `• **Linh thạch nhặt được**: \`+${addedStones}\` 💎`
            };
          }
        },
        {
          id: 'dong_phu_tien_boi',
          ten: '🏺 Động Phủ Tiền Bối 🏺',
          loai: 'dai_co_duyen',
          run: async () => {
            const allItems = await Item.findAll();
            // Lọc đan dược và trang bị phàm/hiếm
            const eligibleItems = allItems.filter(item => item.doHiem === 'Thường' || item.doHiem === 'Hiếm');
            const itemDropped = eligibleItems[Math.floor(Math.random() * eligibleItems.length)];

            if (itemDropped) {
              const [invRecord, created] = await Inventory.findOrCreate({
                where: { idNguoiDung: tuSi.idNguoiDung, itemId: itemDropped.id },
                defaults: { soLuong: 1, trangBi: false, nangCapSao: 0 }
              });
              if (!created) {
                invRecord.soLuong += 1;
                await invRecord.save();
              }

              // Ghi vào Thiên Đạo Lục vì đây là Đại Cơ Duyên
              await ThienDaoLuc.ghiLuc(
                `🏺 **Duyên Định Động Phủ**: Đạo hữu **${tuSi.ten}** trong lúc lịch luyện phát hiện động phủ cổ xưa của tiền bối, đạt được bảo vật **${itemDropped.ten}**!`,
                'Explore'
              );

              return {
                desc: `Đạo hữu vô tình bước qua kết giới, phát hiện một động phủ ẩn giấu của một vị tu sĩ cổ đại hóa trần. Trên bàn đá tĩnh tọa vẫn còn lưu lại di vật của người.`,
                reward: `• **Vật phẩm nhận được**: **${itemDropped.ten}** 🎁`
              };
            }

            // Fallback nếu không có item
            tuSi.linhThach += 100;
            await tuSi.save();
            return {
              desc: `Động phủ tiền bối trống trơn, chỉ còn lại một ít linh thạch rải rác trên sàn đá.`,
              reward: `• **Linh thạch nhặt được**: \`+100\` 💎`
            };
          }
        },
        {
          id: 'linh_thao_ki_ngo',
          ten: '🌱 Kỳ Ngộ Linh Thảo 🌱',
          loai: 'tot',
          run: async () => {
            const allItems = await Item.findAll({ where: { loai: 'Linh thảo' } });
            const itemDropped = allItems.length > 0 ? allItems[Math.floor(Math.random() * allItems.length)] : null;

            if (itemDropped) {
              const [invRecord, created] = await Inventory.findOrCreate({
                where: { idNguoiDung: tuSi.idNguoiDung, itemId: itemDropped.id },
                defaults: { soLuong: 1, trangBi: false, nangCapSao: 0 }
              });
              if (!created) {
                invRecord.soLuong += 1;
                await invRecord.save();
              }
              return {
                desc: `Bên vách núi dựng đứng cheo leo đầy sương mù, đạo hữu phát hiện một đóa linh chi quý hiếm đang hấp thụ tinh hoa nguyệt ảnh.`,
                reward: `• **Nhận Linh thảo**: **${itemDropped.ten}** x1 🌿`
              };
            }

            tuSi.linhLuc += 50;
            await tuSi.save();
            return {
              desc: `Linh thảo đã bị yêu thú gặm mất, chỉ còn lại chút linh khí tàn dư phát tán xung quanh.`,
              reward: `• **Linh lực nhận được**: \`+50\` ✨`
            };
          }
        },
        {
          id: 'cao_nhan_truyen_cong',
          ten: '🧙 Cao Nhân Chỉ Điểm 🧙',
          loai: 'dai_co_duyen',
          run: async () => {
            const addedExp = Math.floor(150 + Math.random() * 100);
            tuSi.linhLuc += addedExp;
            await tuSi.save();

            await ThienDaoLuc.ghiLuc(
              `🧙 **Tiên Nhân Chỉ Lộ**: Đạo hữu **${tuSi.ten}** kỳ ngộ cao nhân đắc đạo chỉ điểm mê tân, tu vi tăng tiến thần tốc!`,
              'Explore'
            );

            return {
              desc: `Đạo hữu gặp gỡ một lão giả râu tóc bạc phơ đang ngồi câu cá bên đầm lầy vô danh. Sau vài câu đàm đạo đạo lý thiên địa, lão giả vỗ vai truyền thụ linh lực rồi biến mất vào không hư.`,
              reward: `• **Linh lực truyền thụ**: \`+${addedExp}\` ✨`
            };
          }
        },
        {
          id: 'yeu_thu_phuc_kich',
          ten: '🐾 Yêu Thú Phục Kích 🐾',
          loai: 'xui_xeo',
          run: async () => {
            const lostHp = Math.floor(stats.max_hp * 0.15);
            tuSi.hp = Math.max(1, tuSi.hp - lostHp);
            await tuSi.save();
            return {
              desc: `Đang đi trong rừng trúc sương mù, đạo hữu bất ngờ bị một con Trúc Điệp Yêu thú từ trên cao phóng xuống tấn công. Trận chiến diễn ra chóng vánh, đạo hữu tuy chạy thoát nhưng bị thương tích đầy mình.`,
              reward: `• **Tổn thương**: Trừ \`-${lostHp}\` HP 💔 (Còn lại: ${tuSi.hp}/${stats.max_hp})`
            };
          }
        },
        {
          id: 'co_tran_phap',
          ten: '🌀 Cổ Trận Pháp Vây Hãm 🌀',
          loai: 'xui_xeo',
          run: async () => {
            const lostMp = Math.floor(stats.max_mp * 0.20);
            tuSi.mp = Math.max(0, tuSi.mp - lostMp);
            await tuSi.save();
            return {
              desc: `Đạo hữu vô tình giẫm phải trận pháp huyễn cảnh bị bỏ hoang từ thời thái cổ. Trận pháp điên cuồng hút lấy linh lực của đạo hữu trước khi tự động sụp đổ giải giới.`,
              reward: `• **Pháp lực tiêu hao**: Trừ \`-${lostMp}\` MP 💧 (Còn lại: ${tuSi.mp}/${stats.max_mp})`
            };
          }
        }
      ];

      // Chọn ngẫu nhiên một sự kiện cơ duyên
      const eventIdx = Math.floor(Math.random() * SU_KIEN_LIST.length);
      const selectedEvent = SU_KIEN_LIST[eventIdx];

      // Thực thi sự kiện
      const result = await selectedEvent.run();

      // Thiết lập cooldown lịch luyện (60 giây)
      const expiresAt = new Date(Date.now() + 60 * 1000);
      await this.datThoiGianCho(tuSi.idNguoiDung, 'lich_luyen', expiresAt);

      // Tạo embed hiển thị
      const colorMap = {
        tot: 0x3498db, // Xanh lam
        dai_co_duyen: 0xf1c40f, // Vàng kim
        xui_xeo: 0xe74c3c // Đỏ
      };

      const embedResult = BoTaoEmbed.thongTin(selectedEvent.ten, `**Mô tả**: ${result.desc}\n\n**Hậu quả / Chiến lợi phẩm**:\n${result.reward}`);
      embedResult.setColor(colorMap[selectedEvent.loai] || 0x2ecc71);
      embedResult.setFooter({ text: "Tiếp tục tích lũy căn cơ để đón nhận đại cơ duyên tiếp theo." });

      return await interaction.editReply({ embeds: [embedResult] });
    }
  };
}

const controller = new BoDieuKhienLichLuyen();
export const danhSachLenhLichLuyen = [controller.lenhLichLuyen];
export { controller as boDieuKhienLichLuyen };
