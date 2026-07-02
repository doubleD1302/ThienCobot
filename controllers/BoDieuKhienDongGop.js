import {
  SlashCommandBuilder,
  EmbedBuilder
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
      .setDescription('Đóng góp hình ảnh hoặc emoji riêng để hiển thị trên Bot')
      .addStringOption(option =>
        option.setName('ten')
          .setDescription('Tên hiển thị/tên gợi nhớ của emoji hoặc hình ảnh')
          .setRequired(true)
      )
      .addStringOption(option =>
        option.setName('emoji')
          .setDescription('Nhập emoji riêng muốn đóng góp (ví dụ: <:pepe:12345678>)')
          .setRequired(false)
      )
      .addAttachmentOption(option =>
        option.setName('file')
          .setDescription('Đính kèm trực tiếp hình ảnh/GIF muốn đóng góp')
          .setRequired(false)
      ),

    execute: async (interaction) => {
      await interaction.deferReply();
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      const ten = interaction.options.getString('ten').trim();
      const emojiInput = interaction.options.getString('emoji');
      const fileInput = interaction.options.getAttachment('file');

      if (!emojiInput && !fileInput) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Đạo hữu cần cung cấp ít nhất một tùy chọn: nhập Emoji riêng hoặc Đính kèm File hình ảnh/GIF!")]
        });
      }

      let rawEmoji = null;
      let imageUrl = null;
      let loaiDongGop = '';

      if (fileInput) {
        // Ưu tiên xử lý file đính kèm trước
        const contentTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        if (!contentTypes.includes(fileInput.contentType)) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi("File đính kèm không đúng định dạng ảnh hoặc GIF! Vui lòng chọn file JPG, PNG, WEBP hoặc GIF.")]
          });
        }
        imageUrl = fileInput.url;
        loaiDongGop = 'Hình ảnh đính kèm 🖼️';
      } else if (emojiInput) {
        // Xử lý emoji riêng
        const cleanEmoji = emojiInput.trim();
        const match = cleanEmoji.match(/<(a?):([a-zA-Z0-9_]+):([0-9]+)>/);
        if (!match) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi("Emoji riêng không đúng định dạng! Hướng dẫn: Đạo hữu hãy nhập emoji riêng của server dạng `<:tên:id>` hoặc `<a:tên:id>`")]
          });
        }
        rawEmoji = match[0];
        const isAnimated = match[1] === 'a';
        const emojiId = match[3];
        const ext = isAnimated ? 'gif' : 'png';
        imageUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}`;
        loaiDongGop = `Emoji riêng ${rawEmoji}`;
      }

      // Lưu trữ trực tiếp vào cơ sở dữ liệu
      const dongGop = await DongGopEmoji.create({
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
          `Đóng góp của đạo hữu đã được gửi đến ban quản trị phê duyệt để hiển thị trên Bot.\n\n` +
          `• **Tên đóng góp**: \`${ten}\`\n` +
          `• **Loại đóng góp**: ${loaiDongGop}\n` +
          `• **Trạng thái phê duyệt**: ⏳ **Đang chờ duyệt (PENDING)**\n\n` +
          `*Cảm tạ tấm lòng hướng về tiên lộ của đạo hữu!*`
        )
        .setThumbnail(imageUrl)
        .setTimestamp()
        .setFooter({ text: 'Thiên Đạo Tu Tiên RPG Contribution System' });

      await interaction.editReply({
        embeds: [confirmEmbed]
      });
    }
  };
}

const controller = new BoDieuKhienDongGop();
export const danhSachLenhDongGop = [controller.lenhDongGop];
export { controller as boDieuKhienDongGop };
