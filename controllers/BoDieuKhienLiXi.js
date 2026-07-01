import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';
import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';

// Lưu trữ các bao lì xì đang hoạt động trong bộ nhớ đệm (in-memory)
export const activeLixis = new Map();

class BoDieuKhienLiXi extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhLiXi = {
    data: new SlashCommandBuilder()
      .setName('lixi')
      .setDescription('Phát bao lì xì may mắn bằng VND vào kênh chat')
      .addIntegerOption(opt =>
        opt.setName('vnd')
          .setDescription('Tổng số VND bỏ vào bao lì xì')
          .setRequired(true)
          .setMinValue(100)
      )
      .addIntegerOption(opt =>
        opt.setName('soluong')
          .setDescription('Số người có thể giật bao lì xì này (Tối đa 10 người)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(10)
      ),

    execute: async (interaction) => {
      await interaction.deferReply();

      const vnd = interaction.options.getInteger('vnd');
      const count = interaction.options.getInteger('soluong');

      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      if (tuSi.vnd < vnd) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(`VND bất túc! Đạo hữu không đủ \`${vnd.toLocaleString()}\` VND để phát bao lì xì.`)]
        });
      }

      // Khấu trừ VND của người phát ngay lập tức
      tuSi.vnd -= vnd;
      await tuSi.save();

      const lixiId = `lixi_${Date.now()}_${tuSi.idNguoiDung}`;
      
      // Cấu trúc dữ liệu bao lì xì
      const lixiData = {
        id: lixiId,
        creatorId: tuSi.idNguoiDung,
        creatorName: tuSi.ten,
        totalAmount: vnd,
        remainingAmount: vnd,
        totalSlots: count,
        remainingSlots: count,
        grabbers: [] // Danh sách người đã giật: { userId, name, amount }
      };

      activeLixis.set(lixiId, lixiData);

      const embed = new EmbedBuilder()
        .setTitle('🧧 Bao Lì Xì Tiên Môn Xuất Thế! 🧧')
        .setColor(0xe74c3c)
        .setDescription(
          `Đạo hữu **${tuSi.ten}** hào sảng ném ra một bao lì xì trị giá **${vnd.toLocaleString()} VND**!\n` +
          `🧧 Chia làm: **${count} phần**\n\n` +
          `Chư vị đạo hữu hãy nhanh tay bấm nút **🧧 Giật Lì Xì** bên dưới để nhận cơ duyên tài lộc!`
        )
        .setFooter({ text: 'Lì xì sẽ hết hạn sau 5 phút.' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`lixi_grab_${lixiId}`)
          .setLabel('🧧 Giật Lì Xì')
          .setStyle(ButtonStyle.Danger)
      );

      const msg = await interaction.editReply({
        embeds: [embed],
        components: [row]
      });

      // Tự động đóng bao lì xì sau 5 phút
      setTimeout(async () => {
        const current = activeLixis.get(lixiId);
        if (current) {
          activeLixis.delete(lixiId);
          try {
            const updatedEmbed = new EmbedBuilder()
              .setTitle('🧧 Bao Lì Xì Đã Hết Hạn 🧧')
              .setColor(0x7f8c8d)
              .setDescription(
                `Bao lì xì trị giá **${current.totalAmount.toLocaleString()} VND** của **${current.creatorName}** đã hết hạn.\n\n` +
                `**Danh sách đạo hữu đã giật**:\n` +
                (current.grabbers.map((g, idx) => `${idx + 1}. **${g.name}**: \`+${g.amount.toLocaleString()} VND\` 🧧`).join('\n') || '• Không có ai giật.')
              )
              .setTimestamp();
            await msg.edit({ embeds: [updatedEmbed], components: [] });
          } catch (_) {}
        }
      }, 5 * 60 * 1000);
    }
  };
}

export async function handleLixiGrab(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const customId = interaction.customId;
  const lixiId = customId.replace('lixi_grab_', '');

  const lixi = activeLixis.get(lixiId);
  if (!lixi) {
    return await interaction.editReply({
      content: '❌ Bao lì xì này đã hết hạn hoặc không tồn tại!'
    });
  }

  if (lixi.remainingSlots <= 0) {
    return await interaction.editReply({
      content: '❌ Tiếc quá! Bao lì xì này đã bị giật hết sạch rồi!'
    });
  }

  // Check if this user already grabbed
  const hasGrabbed = lixi.grabbers.some(g => g.userId === interaction.user.id);
  if (hasGrabbed) {
    return await interaction.editReply({
      content: '❌ Đạo hữu đã giật bao lì xì này rồi, không thể giật thêm!'
    });
  }

  // Load user profile
  const { TuSi } = await import('../models/TuSi.js');
  const tuSi = await TuSi.findOne({ where: { idNguoiDung: interaction.user.id } });
  if (!tuSi) {
    return await interaction.editReply({
      content: '❌ Đạo hữu chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.'
    });
  }

  // Calculate amount to give
  let amount = 0;
  if (lixi.remainingSlots === 1) {
    amount = lixi.remainingAmount;
  } else {
    // WeChat Lucky Money distribution algorithm
    const max = Math.floor((lixi.remainingAmount / lixi.remainingSlots) * 2);
    amount = Math.floor(Math.random() * (max - 1)) + 1;
    if (amount >= lixi.remainingAmount) {
      amount = lixi.remainingAmount - 1;
    }
    if (amount <= 0) amount = 1;
  }

  // Update lixi state
  lixi.remainingAmount -= amount;
  lixi.remainingSlots -= 1;
  lixi.grabbers.push({
    userId: tuSi.idNguoiDung,
    name: tuSi.ten,
    amount: amount
  });

  // Save to database
  tuSi.vnd += amount;
  await tuSi.save();

  // Inform player
  await interaction.editReply({
    content: `🧧 Chúc mừng đạo hữu đã giật được **${amount.toLocaleString()} VND**! Số dư hiện tại: **${tuSi.vnd.toLocaleString()} VND**.`
  });

  // Update main message
  const originalMessage = interaction.message;
  
  const creatorTuSi = await TuSi.findOne({ where: { idNguoiDung: lixi.creatorId } });
  const creatorName = creatorTuSi ? creatorTuSi.ten : lixi.creatorName;

  const grabbersListText = lixi.grabbers.map((g, idx) => {
    return `${idx + 1}. **${g.name}**: \`+${g.amount.toLocaleString()} VND\` 🧧`;
  }).join('\n');

  if (lixi.remainingSlots === 0) {
    activeLixis.delete(lixiId);

    const embed = new EmbedBuilder()
      .setTitle('🧧 Bao Lì Xì Đã Bị Giật Sạch! 🧧')
      .setColor(0x2ecc71)
      .setDescription(
        `Bao lì xì trị giá **${lixi.totalAmount.toLocaleString()} VND** của **${creatorName}** đã được giật sạch!\n\n` +
        `**Danh sách đạo hữu may mắn**:\n${grabbersListText}`
      )
      .setTimestamp();

    await originalMessage.edit({
      embeds: [embed],
      components: []
    });
  } else {
    const embed = new EmbedBuilder()
      .setTitle('🧧 Bao Lì Xì Tiên Môn Xuất Thế! 🧧')
      .setColor(0xe74c3c)
      .setDescription(
        `Đạo hữu **${creatorName}** đã phát bao lì xì trị giá **${lixi.totalAmount.toLocaleString()} VND**!\n` +
        `🧧 Số phần: **${lixi.totalSlots} phần** (Còn lại: **${lixi.remainingSlots} phần**)\n\n` +
        `**Danh sách đạo hữu đã giật**:\n${grabbersListText}`
      )
      .setFooter({ text: 'Lì xì sẽ hết hạn sau 5 phút.' })
      .setTimestamp();

    await originalMessage.edit({
      embeds: [embed]
    });
  }
}

const controller = new BoDieuKhienLiXi();
export const danhSachLenhLiXi = [controller.lenhLiXi];
export { controller as boDieuKhienLiXi };
