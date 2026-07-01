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
import { ChannelRestriction } from '../models/ChannelRestriction.js';

class BoDieuKhienHelp extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhHelp = {
    data: new SlashCommandBuilder()
      .setName('help')
      .setDescription('Xem hướng dẫn chơi và danh sách các lệnh có thể dùng tại kênh này'),

    execute: async (interaction) => {
      await interaction.deferReply({ ephemeral: true });

      // Truy vấn giới hạn lệnh tại kênh hiện tại
      const restriction = await ChannelRestriction.findByPk(interaction.channelId);
      const allowedCmds = restriction ? restriction.allowedCommands : null;

      // Danh mục hướng dẫn chi tiết của từng lệnh
      const allCommandsInfo = {
        start: { label: '`/start [tên]`', desc: 'Khởi đầu nhân duyên, đặt tên đạo hiệu cho nhân vật của bạn.' },
        nv: { label: '`/nv` hoặc `/profile`', desc: 'Xem thông tin nhân vật, cảnh giới, cấp độ, Công/Thủ/Né/Hút máu, và thể lực còn lại.' },
        tuluyen: { label: '`/tuluyen`', desc: 'Tĩnh tọa hấp thu linh khí bát hoang để tích lũy linh lực và đột phá cảnh giới.' },
        nghi: { label: '`/nghi`', desc: 'Trở về động phủ tĩnh dưỡng, hồi phục đầy chỉ số máu (HP) và pháp lực (MP).' },
        bxh: { label: '`/bxh`', desc: 'Xem bảng vàng tôn vinh TOP 10 Tu Sĩ tu vi cao nhất và TOP 10 Phú Hào linh thạch.' },
        balo: { label: '`/balo`', desc: 'Mở túi trữ vật. Xem/tháo/mặc trang bị và sử dụng linh đan hồi phục bằng nút bấm.' },
        skill: { label: '`/skill`', desc: 'Mở Tàng Kinh Các để xem chiêu thức võ công phép thuật đã học và chọn lĩnh hội chiêu thức mới.' },
        shop: { label: '`/shop`', desc: 'Ghé thăm tiên nhân thương hội để mua linh đan, hạt giống linh thảo, hoặc bán dược liệu.' },
        bc: { label: '`/bc`', desc: 'Khiêu chiến phó bản bí cảnh. Diệt yêu thú để săn linh thạch, hạt giống và trang bị xịn.' },
        lichluyen: { label: '`/lichluyen`', desc: 'Rời động phủ chu du thiên hạ, đón nhận đại cơ duyên ngẫu nhiên hoặc chịu phạt.' },
        boss: { label: '`/boss`', desc: 'Kiểm tra tình trạng Cự Thú Hoang Cổ, chung sức tiêu diệt Boss để chia phần thưởng.' },
        thiendaoluc: { label: '`/thiendaoluc`', desc: 'Xem ký sự lịch sử của tiên giới ghi nhận các biến chuyển lớn của tu sĩ.' },
        dongphu: { label: '`/dongphu`', desc: 'Quản lý động phủ. Nâng cấp linh mạch, trồng dược thảo, luyện đan, rèn binh khí, nuôi linh thú.' },
        damdao: { label: '`/damdao`', desc: 'Tham gia trò chơi giải trí đàm đạo tiên giới (Tài Xỉu, Blackjack, Ngũ Hành) để cá cược linh thạch.' },
        tuongtac: { label: '`/tuongtac`', desc: 'Giao dịch vật phẩm, tỷ thí võ công, hoặc mời tu sĩ song tu cộng hưởng.' },
        admin: { label: '`/admin`', desc: 'Cấu hình giới hạn lệnh theo kênh Discord (Chỉ Admin).' }
      };

      const categoriesDef = [
        { id: 'cat_basic', label: 'Cơ Bản & Tu Luyện', emoji: '🧘', commands: ['start', 'nv', 'tuluyen', 'nghi', 'bxh'], color: 0x3498db },
        { id: 'cat_inventory', label: 'Hành Trang & Linh Bảo', emoji: '🎒', commands: ['balo', 'skill', 'shop'], color: 0x2ecc71 },
        { id: 'cat_explore', label: 'Khám Phá & Trừ Yêu', emoji: '🗻', commands: ['bc', 'lichluyen', 'boss', 'thiendaoluc'], color: 0xe67e22 },
        { id: 'cat_interaction', label: 'Đàm Đạo & Gia Viên', emoji: '🎰', commands: ['dongphu', 'damdao', 'tuongtac', 'admin'], color: 0x9b59b6 }
      ];

      // Lọc danh mục để chỉ giữ lại các lệnh được cho phép tại kênh này
      const filteredCategories = [];
      for (const cat of categoriesDef) {
        const allowedInCat = allowedCmds 
          ? cat.commands.filter(cmdName => allowedCmds.includes(cmdName))
          : cat.commands;
        
        if (allowedInCat.length > 0) {
          const lines = allowedInCat.map(cmdName => {
            const info = allCommandsInfo[cmdName];
            return `• ${info.label}: ${info.desc}`;
          });

          filteredCategories.push({
            id: cat.id,
            label: cat.label,
            emoji: cat.emoji,
            color: cat.color,
            description: lines.join('\n')
          });
        }
      }

      let currentCategory = filteredCategories.length > 0 ? filteredCategories[0].id : null;

      const buildEmbed = () => {
        if (filteredCategories.length === 0) {
          return new EmbedBuilder()
            .setTitle(`📖 Tiên Đạo Thư Viện — Kênh Bị Khóa`)
            .setColor(0xe74c3c)
            .setDescription(
              `⚠️ **Cảnh báo**: Kênh này hiện đã bị Admin **khóa toàn bộ lệnh**.\n` +
              `Đạo hữu vui lòng di chuyển sang các kênh tu luyện khác để tiếp tục hành trình!`
            )
            .setTimestamp();
        }

        const cat = filteredCategories.find(c => c.id === currentCategory) || filteredCategories[0];
        return new EmbedBuilder()
          .setTitle(`📖 Tiên Đạo Thư Viện — Hướng Dẫn Kênh Hiện Tại`)
          .setColor(cat.color)
          .setDescription(
            `Tại kênh <#${interaction.channelId}>, đạo hữu chỉ có quyền sử dụng các câu lệnh sau:\n\n` +
            `### ${cat.emoji} Nhóm Lệnh: ${cat.label}\n` +
            `${cat.description}`
          )
          .setTimestamp()
          .setFooter({ text: 'Sử dụng menu hoặc nút bấm để chuyển danh mục hướng dẫn.' });
      };

      const buildComponents = (disabled = false) => {
        if (filteredCategories.length === 0) {
          return [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('btn_help_close')
                .setLabel('❌ Đóng')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(disabled)
            )
          ];
        }

        const selectMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('🔽 Chọn nhóm lệnh muốn xem hướng dẫn...')
            .setDisabled(disabled)
            .addOptions(filteredCategories.map(cat => ({
              label: cat.label,
              value: cat.id,
              emoji: cat.emoji,
              default: currentCategory === cat.id
            })))
        );

        const buttonsRow = new ActionRowBuilder();
        for (const cat of filteredCategories) {
          buttonsRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`btn_${cat.id}`)
              .setLabel(cat.label.split(' & ')[0])
              .setStyle(currentCategory === cat.id ? ButtonStyle.Primary : ButtonStyle.Secondary)
              .setDisabled(disabled)
          );
        }
        buttonsRow.addComponents(
          new ButtonBuilder()
            .setCustomId('btn_help_close')
            .setLabel('❌ Đóng')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
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
