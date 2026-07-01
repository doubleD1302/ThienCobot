import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';
import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';

class BoDieuKhienHelp extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  // Cấu hình các trang chi tiết
  trangChiTiet = {
    cat_basic: {
      title: '🧘 Nhóm Lệnh: Cơ Bản & Tu Luyện',
      color: 0x3498db,
      description: 
        `• \`/start [tên]\`: Khởi đầu nhân duyên, đặt tên đạo hiệu cho nhân vật của bạn.\n` +
        `• \`/nv\` hoặc \`/profile\`: Xem thông tin nhân vật, cảnh giới, cấp độ, thuộc tính Công/Thủ/Né/Hút máu, và thể lực còn lại.\n` +
        `• \`/tuluyen\`: Tĩnh tọa hấp thu linh khí bát hoang. Mỗi phút trôi qua offline hoặc online đều tích lũy linh lực. Khi đầy linh lực có thể đột phá cảnh giới.\n` +
        `• \`/nghi\`: Trở về động phủ tĩnh dưỡng, hồi phục chỉ số máu (HP) và pháp lực (MP).\n` +
        `• \`/bxh\`: Xem bảng vàng tôn vinh TOP 10 Tu Sĩ tu vi cao nhất và TOP 10 Phú Hào nhiều linh thạch nhất.`
    },
    cat_inventory: {
      title: '🎒 Nhóm Lệnh: Hành Trang & Linh Bảo',
      color: 0x2ecc71,
      description:
        `• \`/balo\`: Mở túi trữ vật. Cho phép xem, tháo/mặc trang bị (vũ khí, đạo bào, ngọc bội, cổ bảo, pháp bảo) và sử dụng linh đan hồi phục bằng nút bấm.\n` +
        `• \`/skill\`: Mở Tàng Kinh Các để xem danh sách chiêu thức võ công phép thuật đã học và chọn lĩnh hội chiêu thức mới khi đạt đủ cảnh giới.\n` +
        `• \`/shop\`: Ghé thăm tiên nhân thương hội để mua linh đan bổ trợ, hạt giống linh thảo, hoặc bán các dược liệu quý giá thu hoạch được.`
    },
    cat_explore: {
      title: '🗻 Nhóm Lệnh: Khám Phá & Trừ Yêu',
      color: 0xe67e22,
      description:
        `• \`/bc\`: Khiêu chiến phó bản bí cảnh. Lựa chọn phó bản phù hợp với cảnh giới để chiến đấu với yêu thú, săn tìm linh thạch, hạt giống và trang bị phẩm chất cao.\n` +
        `• \`/lichluyen\`: Rời động phủ đi chu du đại lục, gặp gỡ tiên duyên hoặc đối mặt với họa sát thân ngẫu nhiên để nhận phần thưởng hoặc chịu phạt.\n` +
        `• \`/boss\`: Kiểm tra tình trạng Cự Thú Hoang Cổ đang tàn phá máy chủ, cùng chung sức với các đồng đạo tiêu diệt Boss để chia phần thưởng lớn.\n` +
        `• \`/thiendaoluc\`: Xem ký sự lịch sử của tiên giới. Nơi khắc ghi các sự kiện lớn như chuyển giao Đạo Niên hoặc các tu sĩ đạt thành tựu đột phá.`
    },
    cat_interaction: {
      title: '🎰 Nhóm Lệnh: Đàm Đạo & Gia Viên',
      color: 0x9b59b6,
      description:
        `• \`/dongphu\`: Quản lý gia viên cá nhân. Nâng cấp linh mạch tăng tốc độ tu luyện, khai hoang linh điền trồng cây thuốc, luyện chế linh đan nâng cao, rèn đúc linh binh, hoặc ấp trứng linh thú nuôi pet.\n` +
        `• \`/damdao\`: Tham gia các trò chơi giải trí thử thách nhân phẩm đàm đạo cùng tiên giới (Tài Xỉu, Blackjack, Kéo Búa Bao, Ngũ Hành) để cá cược linh thạch và nhận tu vi thưởng.\n` +
        `• \`/tuongtac\`: Thực hiện giao dịch vật phẩm/linh thạch với tu sĩ khác, gửi lời khiêu chiến tỷ thí võ công thân hữu, hoặc mời tu sĩ cùng song tu cộng hưởng.`
    }
  };

  lenhHelp = {
    data: new SlashCommandBuilder()
      .setName('help')
      .setDescription('Mở Tiên Đạo Thư Viện để xem hướng dẫn chơi và danh sách câu lệnh'),

    execute: async (interaction) => {
      await interaction.deferReply({ ephemeral: true });

      let currentCategory = 'cat_basic';

      const buildEmbed = () => {
        const detail = this.trangChiTiet[currentCategory];
        return new EmbedBuilder()
          .setTitle(`📖 Tiên Đạo Thư Viện — Hướng Dẫn Tu Tiên`)
          .setColor(detail.color)
          .setDescription(
            `Chào mừng đạo hữu đến với thế giới **Thiên Đạo Tu Tiên RPG**!\n` +
            `Dưới đây là chi tiết các câu lệnh hoạt động trong tiên giới:\n\n` +
            `### ${detail.title}\n` +
            `${detail.description}`
          )
          .setTimestamp()
          .setFooter({ text: 'Sử dụng menu hoặc nút bấm để chuyển danh mục hướng dẫn.' });
      };

      const buildComponents = (disabled = false) => {
        const selectMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('🔽 Chọn nhóm lệnh muốn xem hướng dẫn...')
            .setDisabled(disabled)
            .addOptions([
              { label: 'Cơ Bản & Tu Luyện', value: 'cat_basic', emoji: '🧘', default: currentCategory === 'cat_basic' },
              { label: 'Hành Trang & Linh Bảo', value: 'cat_inventory', emoji: '🎒', default: currentCategory === 'cat_inventory' },
              { label: 'Khám Phá & Trừ Yêu', value: 'cat_explore', emoji: '🗻', default: currentCategory === 'cat_explore' },
              { label: 'Đàm Đạo & Gia Viên', value: 'cat_interaction', emoji: '🎰', default: currentCategory === 'cat_interaction' }
            ])
        );

        const buttonsRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_cat_basic').setLabel('🧘 Cơ Bản').setStyle(currentCategory === 'cat_basic' ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(disabled),
          new ButtonBuilder().setCustomId('btn_cat_inventory').setLabel('🎒 Hành Trang').setStyle(currentCategory === 'cat_inventory' ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(disabled),
          new ButtonBuilder().setCustomId('btn_cat_explore').setLabel('🗻 Khám Phá').setStyle(currentCategory === 'cat_explore' ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(disabled),
          new ButtonBuilder().setCustomId('btn_cat_interaction').setLabel('🎰 Đàm Đạo').setStyle(currentCategory === 'cat_interaction' ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(disabled),
          new ButtonBuilder().setCustomId('btn_help_close').setLabel('❌ Đóng').setStyle(ButtonStyle.Danger).setDisabled(disabled)
        );

        return [selectMenu, buttonsRow];
      };

      const msg = await interaction.editReply({
        embeds: [buildEmbed()],
        components: buildComponents()
      });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 120_000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();

        if (i.customId === 'btn_help_close') {
          collector.stop('closed');
          return;
        }

        if (i.customId === 'help_select') {
          currentCategory = i.values[0];
        } else if (i.customId.startsWith('btn_')) {
          currentCategory = i.customId.replace('btn_', '');
        }

        await interaction.editReply({
          embeds: [buildEmbed()],
          components: buildComponents()
        });
      });

      collector.on('end', async (_, reason) => {
        try {
          if (reason === 'closed') {
            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle('📖 Tiên Đạo Thư Viện — Đã Đóng')
                  .setDescription('Cảm ơn đạo hữu đã tham quan Tiên Đạo Thư Viện.')
                  .setColor(0x7f8c8d)
                  .setTimestamp()
              ],
              components: []
            });
          } else {
            await interaction.editReply({
              components: buildComponents(true)
            });
          }
        } catch (_) {}
      });
    }
  };
}

const controller = new BoDieuKhienHelp();
export const danhSachLenhHelp = [controller.lenhHelp];
export { controller as boDieuKhienHelp };
