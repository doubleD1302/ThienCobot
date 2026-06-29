import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ComponentType } from 'discord.js';
import * as config from '../config.js';
import { TuSi } from '../models/TuSi.js';

export class GiaoDienTaoNhanVat {
  constructor(author, name) {
    this.author = author;
    this.name = name;
    this.gender = null; // 'Nam' or 'Nữ'
    this.path = null;   // 'The Tu' or 'Phap Tu'
    this.rolledLinhCan = null;
    this.rolledLinhCanList = [];
    this.step = 1;
  }

  getEmbed() {
    if (this.step === 1) {
      return new EmbedBuilder()
        .setTitle("🌀 Thiết Lập Nhân Vật Mới")
        .setDescription("Hãy chọn Giới tính và Hướng tu luyện của ngươi trước khi thức tỉnh Linh Căn.")
        .setColor(0x3498db)
        .addFields(
          { name: "👤 Tên Tu Sĩ", value: `\`${this.name}\``, inline: false },
          { name: "♂️ Giới tính", value: `\`${this.gender || 'Chưa chọn'}\``, inline: true },
          { name: "🔮 Hướng tu", value: `\`${this.path ? config.HUONG_DI[this.path].name : 'Chưa chọn'}\``, inline: true }
        )
        .setFooter({ text: "Thiên Đạo Tu Tiên RPG" });
    } else {
      const pathName = config.HUONG_DI[this.path]?.name || '';
      const details = this.rolledLinhCanList.map(el => {
        const info = config.NGUON_LINH_CAN[el];
        return info ? `• **${info.name}**: ${info.desc}` : '';
      }).filter(Boolean).join('\n');

      return new EmbedBuilder()
        .setTitle("🌀 Kết Quả Thức Tỉnh Linh Căn")
        .setDescription("Linh hồn của ngươi đã cộng hưởng với thiên địa linh khí và thức tỉnh Linh Căn dưới đây.")
        .setColor(0x9b59b6)
        .addFields(
          { name: "👤 Tên Tu Sĩ", value: `\`${this.name}\``, inline: true },
          { name: "♂️ Giới tính", value: `\`${this.gender}\``, inline: true },
          { name: "🥋 Hướng tu", value: `\`${pathName}\``, inline: true },
          { name: "🌱 Linh Căn Thức Tỉnh", value: `✨ **${this.rolledLinhCan}**`, inline: false },
          { name: "⚡ Thuộc tính Linh Căn", value: details || '• Không có linh căn thụ động.', inline: false }
        )
        .setFooter({ text: "Nhấn [Xác nhận] để bước vào thế giới tu tiên, hoặc [Làm lại] để roll lại linh căn." });
    }
  }

  getComponents() {
    const rows = [];
    if (this.step === 1) {
      // Dòng 0: Chọn giới tính
      const row0 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('gender_nam')
          .setLabel('Nam ♂️')
          .setStyle(this.gender === 'Nam' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('gender_nu')
          .setLabel('Nữ ♀️')
          .setStyle(this.gender === 'Nữ' ? ButtonStyle.Success : ButtonStyle.Secondary)
      );
      // Dòng 1: Chọn hướng tu
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('path_the')
          .setLabel('Thể Tu ⚔️')
          .setStyle(this.path === 'The Tu' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('path_phap')
          .setLabel('Pháp Tu 🔮')
          .setStyle(this.path === 'Phap Tu' ? ButtonStyle.Success : ButtonStyle.Secondary)
      );
      // Dòng 2: Thao tác
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('action_roll')
          .setLabel('Thức Tỉnh Linh Căn 🌀')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!(this.gender && this.path)),
        new ButtonBuilder()
          .setCustomId('action_cancel')
          .setLabel('Hủy Bỏ ❌')
          .setStyle(ButtonStyle.Danger)
      );
      rows.push(row0, row1, row2);
    } else {
      const row0 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('action_confirm')
          .setLabel('Xác Nhận Nhập Thế ✅')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('action_reroll')
          .setLabel('Làm Lại Lịch Kiếp 🔄')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('action_cancel')
          .setLabel('Hủy Bỏ ❌')
          .setStyle(ButtonStyle.Danger)
      );
      rows.push(row0);
    }
    return rows;
  }

  async startCollector(interaction, message) {
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000 // 120 giây
    });

    collector.on('collect', async i => {
      // 1. Kiểm tra chính chủ
      if (i.user.id !== this.author.id) {
        await i.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("⚠️ Thiên Cơ Bất Khả Lộ")
              .setDescription("Ngươi không phải là người định đoạt mệnh số này!")
              .setColor(0xe74c3c)
          ],
          ephemeral: true
        });
        return;
      }

      // 2. Xử lý sự kiện nhấn nút
      if (i.customId === 'gender_nam') {
        this.gender = 'Nam';
      } else if (i.customId === 'gender_nu') {
        this.gender = 'Nữ';
      } else if (i.customId === 'path_the') {
        this.path = 'The Tu';
      } else if (i.customId === 'path_phap') {
        this.path = 'Phap Tu';
      } else if (i.customId === 'action_roll') {
        this.step = 2;
        const roll = config.rollLinhCan();
        this.rolledLinhCan = roll.displayName;
        this.rolledLinhCanList = roll.elements;
      } else if (i.customId === 'action_reroll') {
        const roll = config.rollLinhCan();
        this.rolledLinhCan = roll.displayName;
        this.rolledLinhCanList = roll.elements;
      } else if (i.customId === 'action_cancel') {
        collector.stop('cancelled');
        return;
      } else if (i.customId === 'action_confirm') {
        await i.deferUpdate();
        try {
          // Kiểm tra nhân vật đã tồn tại chưa
          let tuSi = await TuSi.findByPk(this.author.id);
          if (tuSi) {
            await i.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle("⚠️ Nhân Quả Đã Định")
                  .setDescription("Ngươi đã nhập thế tu hành rồi, không thể tái sinh nhân vật!")
                  .setColor(0xe74c3c)
              ],
              components: []
            });
            collector.stop('already_exists');
            return;
          }

          // Khởi tạo tu sĩ mới
          tuSi = TuSi.build({
            idNguoiDung: this.author.id,
            ten: this.name,
            gioiTinh: this.gender,
            huongTu: this.path,
            linhCan: this.rolledLinhCan,
          });
          tuSi.linhCanList = this.rolledLinhCanList;
          tuSi.dongBoCanhGioi();

          const stats = tuSi.layChiSo();
          tuSi.hp = stats.max_hp;
          tuSi.mp = stats.max_mp;
          tuSi.linhLuc = 0;
          tuSi.linhThach = 500; // Tặng linh thạch ban đầu

          await tuSi.save();

          const pathName = config.HUONG_DI[this.path]?.name || '';
          await i.editReply({
            embeds: [
              new EmbedBuilder()
                .setTitle("✨ Nhập Thế Thành Công ✨")
                .setDescription(`Chúc mừng Đạo Hữu **${this.name}** chính thức bước vào con đường tu tiên cứu kiếp!`)
                .setColor(0x2ecc71)
                .addFields(
                  { name: "🥋 Hướng tu", value: `\`${pathName}\``, inline: true },
                  { name: "🌱 Linh Căn", value: `\`${this.rolledLinhCan}\``, inline: true },
                  { name: "💎 Linh thạch tặng kèm", value: "`500` 💎", inline: true }
                )
                .setFooter({ text: "Gõ lệnh /nv để xem hồ sơ tu sĩ." })
            ],
            components: []
          });
          collector.stop('confirmed');
        } catch (e) {
          console.error(e);
          await i.editReply({
            embeds: [
              new EmbedBuilder()
                .setTitle("⚠️ Thiên địa chấn động")
                .setDescription("Đã có lỗi xảy ra trong quá trình nhập thế. Vui lòng thử lại sau.")
                .setColor(0xe74c3c)
            ],
            components: []
          });
          collector.stop('error');
        }
        return;
      }

      // Cập nhật lại giao diện tin nhắn
      await i.update({
        embeds: [this.getEmbed()],
        components: this.getComponents()
      });
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'cancelled') {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Lịch Kiếp Bị Hủy")
              .setDescription("Ngươi đã từ bỏ nhân duyên tu tiên lần này.")
              .setColor(0xe74c3c)
          ],
          components: []
        });
      } else if (reason === 'time') {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Thiên Cơ Trôi Qua")
              .setDescription("Thời gian thiết lập đã hết, nhân duyên tu tiên này bị hủy bỏ.")
              .setColor(0xe74c3c)
          ],
          components: []
        });
      }
    });
  }
}
