import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';
import { DongGopEmoji } from '../models/DongGopEmoji.js';

class BoDieuKhienDongGop extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhDongGop = {
    data: new SlashCommandBuilder()
      .setName('donggop')
      .setDescription('Mở giao diện đóng góp emoji và hình ảnh tương tác bằng nút bấm'),

    execute: async (interaction) => {
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.reply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")],
          ephemeral: true
        });
      }

      const buildMainMenuEmbed = () => {
        return new EmbedBuilder()
          .setTitle('🌾 ĐIỆN ĐÓNG GÓP THIÊN ĐẠO 🌾')
          .setColor(0xe67e22)
          .setDescription(
            `Đạo hữu **${tuSi.ten}** mến,\n` +
            `Nơi đây tiếp nhận các đóng góp linh tượng (hình ảnh) và biểu cảm (emoji riêng) từ chư vị tu sĩ để làm phong phú thêm tiên lộ.\n\n` +
            `• **😀 Đóng Góp Emoji**: Nhập biểu cảm riêng của các máy chủ.\n` +
            `• **🖼️ Đóng Góp Hình Ảnh**: Gửi trực tiếp file đính kèm/ảnh hoặc link tiên cảnh.\n` +
            `• **📜 Xem Lịch Sử**: Tra cứu trạng thái phê duyệt các đóng góp trước đây của đạo hữu.\n\n` +
            `*Mọi đóng góp sau khi được phê duyệt sẽ hiển thị trên hệ thống Bot!*`
          )
          .setTimestamp()
          .setFooter({ text: 'Hệ thống đóng góp tương tác hoàn toàn bằng nút bấm' });
      };

      const buildMenuComponents = () => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('btn_dg_emoji')
            .setLabel('😀 Đóng Góp Emoji')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('btn_dg_image')
            .setLabel('🖼️ Đóng Góp Ảnh/GIF')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('btn_dg_history')
            .setLabel('📜 Xem Lịch Sử')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('btn_dg_cancel')
            .setLabel('❌ Hủy Bỏ')
            .setStyle(ButtonStyle.Danger)
        );
      };

      const msg = await interaction.reply({
        embeds: [buildMainMenuEmbed()],
        components: [buildMenuComponents()],
        ephemeral: true
      });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 120000
      });

      collector.on('collect', async (i) => {
        if (i.customId === 'btn_dg_cancel') {
          collector.stop('cancelled');
          await i.update({
            embeds: [BoTaoEmbed.thongTin('🌾 Đóng Góp Thiên Đạo', 'Cảm tạ tấm lòng hướng về tiên lộ của đạo hữu, tương tác đã đóng.')],
            components: []
          });
          return;
        }

        if (i.customId === 'btn_dg_history') {
          await i.deferUpdate();
          const history = await DongGopEmoji.findAll({
            where: { idNguoiDung: interaction.user.id },
            order: [['createdAt', 'DESC']],
            limit: 10
          });

          let historyText = '';
          if (history.length === 0) {
            historyText = '*Đạo hữu chưa gửi đóng góp nào cho Thiên Đạo.*';
          } else {
            historyText = history.map((h, index) => {
              const statusEm = h.trangThai === 'APPROVED' ? '✅' : (h.trangThai === 'REJECTED' ? '❌' : '⏳');
              const typeStr = h.rawEmoji ? `Emoji \`${h.tenEmoji}\` (${h.rawEmoji})` : `Hình ảnh \`${h.tenEmoji}\``;
              return `\`${index + 1}.\` ${statusEm} **${typeStr}** - Trạng thái: *${h.trangThai}*`;
            }).join('\n');
          }

          const historyEmbed = new EmbedBuilder()
            .setTitle('📜 LỊCH SỬ ĐÓNG GÓP TIÊN KHÔI 📜')
            .setColor(0x9b59b6)
            .setDescription(
              `Dưới đây là 10 đóng góp gần nhất của đạo hữu **${tuSi.ten}**:\n\n` +
              `${historyText}\n\n` +
              `*Chú thích: ⏳ Chờ duyệt | ✅ Đã duyệt | ❌ Từ chối*`
            )
            .setTimestamp();

          const backRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('btn_dg_back')
              .setLabel('↩️ Quay Lại')
              .setStyle(ButtonStyle.Secondary)
          );

          await interaction.editReply({
            embeds: [historyEmbed],
            components: [backRow]
          });
          return;
        }

        if (i.customId === 'btn_dg_back') {
          await i.deferUpdate();
          await interaction.editReply({
            embeds: [buildMainMenuEmbed()],
            components: [buildMenuComponents()]
          });
          return;
        }

        if (i.customId === 'btn_dg_emoji') {
          const modal = new ModalBuilder()
            .setCustomId('modal_dg_emoji')
            .setTitle('Đóng Góp Emoji Riêng');

          const nameInput = new TextInputBuilder()
            .setCustomId('input_emoji_name')
            .setLabel('Tên Gợi Nhớ')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ví dụ: pepe_happy')
            .setRequired(true);

          const emojiInput = new TextInputBuilder()
            .setCustomId('input_emoji_raw')
            .setLabel('Chuỗi Emoji Riêng')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ví dụ: <:pepe:12345678> hoặc <a:pepe:12345678>')
            .setRequired(true);

          const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
          const secondActionRow = new ActionRowBuilder().addComponents(emojiInput);
          modal.addComponents(firstActionRow, secondActionRow);

          await i.showModal(modal);

          try {
            const submission = await i.awaitModalSubmit({
              filter: sub => sub.customId === 'modal_dg_emoji' && sub.user.id === interaction.user.id,
              time: 60000
            });

            await submission.deferReply({ ephemeral: true });

            const ten = submission.fields.getTextInputValue('input_emoji_name').trim();
            const cleanEmoji = submission.fields.getTextInputValue('input_emoji_raw').trim();

            const match = cleanEmoji.match(/<(a?):([a-zA-Z0-9_]+):([0-9]+)>/);
            if (!match) {
              return await submission.editReply({
                embeds: [BoTaoEmbed.loi("Emoji riêng không đúng định dạng! Hướng dẫn: Đạo hữu hãy nhập emoji riêng của server dạng `<:tên:id>` hoặc `<a:tên:id>`")]
              });
            }
            const rawEmoji = match[0];
            const isAnimated = match[1] === 'a';
            const emojiId = match[3];
            const ext = isAnimated ? 'gif' : 'png';
            const imageUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}`;

            await DongGopEmoji.create({
              idNguoiDung: interaction.user.id,
              tenEmoji: ten,
              rawEmoji: rawEmoji,
              imageUrl: imageUrl,
              trangThai: 'PENDING'
            });

            const confirmEmbed = new EmbedBuilder()
              .setTitle('🌾 TIÊN KHÔI ĐÓNG GÓP THÀNH CÔNG 🌾')
              .setColor(0x2ecc71)
              .setDescription(
                `Đạo hữu **${tuSi.ten}** kính mến,\n` +
                `Đóng góp biểu cảm của đạo hữu đã được gửi phê duyệt.\n\n` +
                `• **Tên đóng góp**: \`${ten}\`\n` +
                `• **Loại đóng góp**: Emoji riêng ${rawEmoji}\n` +
                `• **Trạng thái**: ⏳ **Đang chờ duyệt**\n\n` +
                `*Cảm tạ tấm lòng hướng về tiên lộ của đạo hữu!*`
              )
              .setThumbnail(imageUrl)
              .setTimestamp()
              .setFooter({ text: 'Thiên Đạo Tu Tiên RPG Contribution System' });

            await submission.editReply({ embeds: [confirmEmbed] });
          } catch (err) {
            console.error('Modal submission timed out or failed:', err);
          }
          return;
        }

        if (i.customId === 'btn_dg_image') {
          await i.deferUpdate();

          // Hỏi tên gợi nhớ trước
          const askNameEmbed = new EmbedBuilder()
            .setTitle('🖼️ Đóng Góp Hình Ảnh / GIF')
            .setColor(0x3498db)
            .setDescription('💬 **Bước 1**: Đạo hữu hãy nhập **Tên gợi nhớ** cho hình ảnh/GIF này vào chat:')
            .setFooter({ text: 'Thời gian chờ: 30 giây' });

          await interaction.editReply({
            embeds: [askNameEmbed],
            components: []
          });

          const nameCollector = interaction.channel.createMessageCollector({
            filter: msg => msg.author.id === interaction.user.id,
            max: 1,
            time: 30000
          });

          nameCollector.on('collect', async (nameMsg) => {
            const ten = nameMsg.content.trim();
            try { await nameMsg.delete(); } catch (e) {}

            // Hỏi file ảnh
            const askFileEmbed = new EmbedBuilder()
              .setTitle('🖼️ Đóng Góp Hình Ảnh / GIF')
              .setColor(0x3498db)
              .setDescription(
                `Tên đóng góp: \`${ten}\`\n\n` +
                `🖼️ **Bước 2**: Đạo hữu hãy **gửi đính kèm file ảnh/GIF** (hoặc dán link URL ảnh) vào chat:`
              )
              .setFooter({ text: 'Thời gian chờ: 45 giây' });

            await interaction.editReply({
              embeds: [askFileEmbed]
            });

            const fileCollector = interaction.channel.createMessageCollector({
              filter: msg => msg.author.id === interaction.user.id,
              max: 1,
              time: 45000
            });

            fileCollector.on('collect', async (fileMsg) => {
              try { await fileMsg.delete(); } catch (e) {}

              let imageUrl = null;
              if (fileMsg.attachments.size > 0) {
                const file = fileMsg.attachments.first();
                const contentTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
                if (!contentTypes.includes(file.contentType)) {
                  return await interaction.editReply({
                    embeds: [BoTaoEmbed.loi("File đính kèm không phải định dạng ảnh hoặc GIF hợp lệ! Vui lòng thử lại lệnh.")],
                    components: []
                  });
                }
                imageUrl = file.url;
              } else {
                const content = fileMsg.content.trim();
                if (content.startsWith('http://') || content.startsWith('https://')) {
                  imageUrl = content;
                }
              }

              if (!imageUrl) {
                return await interaction.editReply({
                  embeds: [BoTaoEmbed.loi("Không nhận được file đính kèm hoặc URL hợp lệ! Vui lòng thử lại lệnh.")],
                  components: []
                });
              }

              await DongGopEmoji.create({
                idNguoiDung: interaction.user.id,
                tenEmoji: ten,
                rawEmoji: null,
                imageUrl: imageUrl,
                trangThai: 'PENDING'
              });

              const confirmEmbed = new EmbedBuilder()
                .setTitle('🌾 TIÊN KHÔI ĐÓNG GÓP THÀNH CÔNG 🌾')
                .setColor(0x2ecc71)
                .setDescription(
                  `Đạo hữu **${tuSi.ten}** kính mến,\n` +
                  `Đóng góp hình ảnh của đạo hữu đã được gửi phê duyệt.\n\n` +
                  `• **Tên đóng góp**: \`${ten}\`\n` +
                  `• **Loại đóng góp**: Hình ảnh/GIF đính kèm 🖼️\n` +
                  `• **Trạng thái**: ⏳ **Đang chờ duyệt**\n\n` +
                  `*Cảm tạ tấm lòng hướng về tiên lộ của đạo hữu!*`
                )
                .setImage(imageUrl)
                .setTimestamp()
                .setFooter({ text: 'Thiên Đạo Tu Tiên RPG Contribution System' });

              await interaction.editReply({
                embeds: [confirmEmbed],
                components: []
              });
            });

            fileCollector.on('end', async (_, reason) => {
              if (reason === 'time') {
                try {
                  await interaction.editReply({
                    embeds: [BoTaoEmbed.loi("Hết thời gian chờ gửi file ảnh đột phá. Vui lòng thử lại.")],
                    components: []
                  });
                } catch(e) {}
              }
            });
          });

          nameCollector.on('end', async (_, reason) => {
            if (reason === 'time') {
              try {
                await interaction.editReply({
                  embeds: [BoTaoEmbed.loi("Hết thời gian chờ nhập tên gợi nhớ. Vui lòng thử lại.")],
                  components: []
                });
              } catch(e) {}
            }
          });
        }
      });

      collector.on('end', async (_, reason) => {
        if (reason === 'time') {
          try {
            await interaction.editReply({
              embeds: [BoTaoEmbed.thongTin('🌾 Đóng Góp Thiên Đạo', 'Tương tác đóng góp đã hết thời gian chờ.')],
              components: []
            });
          } catch (e) {}
        }
      });
    }
  };
}

const controller = new BoDieuKhienDongGop();
export const danhSachLenhDongGop = [controller.lenhDongGop];
export { controller as boDieuKhienDongGop };
