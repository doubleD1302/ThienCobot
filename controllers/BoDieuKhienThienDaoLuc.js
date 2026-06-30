import { SlashCommandBuilder } from 'discord.js';
import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';
import { ThienDaoLuc } from '../models/ThienDaoLuc.js';

class BoDieuKhienThienDaoLuc extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhThienDaoLuc = {
    data: new SlashCommandBuilder()
      .setName('thiendaoluc')
      .setDescription('Tra cứu Thiên Đạo Lục - Ký Sự Thiên Địa lưu danh thiên cổ'),
    execute: async (interaction) => {
      await interaction.deferReply();
      const records = await ThienDaoLuc.findAll({
        order: [['id', 'DESC']],
        limit: 15
      });

      if (records.length === 0) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.thongTin(
            "📜 Thiên Đạo Lục - Bát Hoang Vô Sự",
            "🌌 *Thiên địa sơ khai, hồng hoang hỗn độn. Hiện tại Thiên Đạo Lục chưa ghi nhận biến động chấn thế nào.*"
          )]
        });
      }

      // Đảo ngược danh sách để hiển thị theo dòng thời gian xuôi
      const sortedRecords = [...records].reverse();
      const content = sortedRecords.map(r => `📅 **Đạo Niên thứ ${r.daoNien}**\n👉 ${r.suKien}`).join('\n\n');

      const embed = BoTaoEmbed.thongTin("📜 Thiên Đạo Ký Sự - Bát Hoang Lưu Danh", content);
      embed.setColor(0xf1c40f); // Màu vàng hoàng kim
      return await interaction.editReply({ embeds: [embed] });
    }
  };
}

const controller = new BoDieuKhienThienDaoLuc();
export const danhSachLenhThienDaoLuc = [controller.lenhThienDaoLuc];
export { controller as boDieuKhienThienDaoLuc };
