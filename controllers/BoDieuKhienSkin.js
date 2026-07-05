import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';

import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed, layMauCanhGioi } from '../views/BoTaoEmbed.js';
import { Skin } from '../models/Skin.js';
import { Item } from '../models/Item.js';
import { Inventory } from '../models/Inventory.js';
import { Op } from 'sequelize';

class BoDieuKhienSkin extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhSkin = {
    data: new SlashCommandBuilder()
      .setName('skin')
      .setDescription('Cửa Hàng Skin — Mua các skin, nền ảnh và vầng sáng độc quyền bằng VND'),

    execute: async (interaction) => {
      await interaction.deferReply();
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      const color = layMauCanhGioi(tuSi.canhGioi);

      // Load all available skins
      const now = new Date();
      const availableSkins = await Skin.findAll({
        where: {
          [Op.and]: [
            {
              [Op.or]: [
                { ngayMoBan: null },
                { ngayMoBan: { [Op.lte]: now } }
              ]
            },
            {
              [Op.or]: [
                { ngayTatBan: null },
                { ngayTatBan: { [Op.gte]: now } }
              ]
            }
          ]
        }
      });

      if (availableSkins.length === 0) {
        return await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setTitle('🏪 Cửa Hàng Skin & Thời Trang')
            .setColor(color)
            .setDescription('> 🕯️ *Cửa hàng hiện đang đóng cửa hoặc chưa có skin nào được mở bán.*')
            .setTimestamp()]
        });
      }

      let selectedSkinId = null;

      const buildShopPayload = async () => {
        const embed = new EmbedBuilder()
          .setTitle('🏪 Cửa Hàng Skin & Thời Trang')
          .setColor(color)
          .setDescription(`Chào mừng đạo hữu đến với Tiên Các Thời Trang!\n` +
            `• **Số dư VND**: \`${(tuSi.vnd || 0).toLocaleString()}\` 💵\n\n` +
            `Chọn skin bên dưới để xem chi tiết và mua hàng.`)
          .setTimestamp()
          .setFooter({ text: 'Thiên Đạo Tu Tiên RPG • Skin Shop' });

        const rows = [];

        // Select menu for skins
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('skin_shop_select')
          .setPlaceholder('🔽 Chọn skin muốn xem...');

        const options = availableSkins.map(sk => {
          const loaiText = sk.loai === 'background' ? 'Nền' : sk.loai === 'aura' ? 'Vòng sáng' : 'Trang phục';
          return {
            label: sk.ten.slice(0, 100),
            value: sk.id,
            description: `${loaiText} | Giới tính: ${sk.gioiTinh} | Giá: ${sk.giaVnd.toLocaleString()} VND`.slice(0, 100),
            emoji: sk.loai === 'background' ? '🖼️' : sk.loai === 'aura' ? '✨' : '👕',
            default: sk.id === selectedSkinId
          };
        });

        selectMenu.addOptions(options);
        rows.push(new ActionRowBuilder().addComponents(selectMenu));

        let detailEmbed = null;
        if (selectedSkinId) {
          const skin = availableSkins.find(s => s.id === selectedSkinId);
          if (skin) {
            const loaiText = skin.loai === 'background' ? '🖼️ Nền ảnh' : skin.loai === 'aura' ? '✨ Vầng sáng' : '👕 Trang phục';
            detailEmbed = new EmbedBuilder()
              .setTitle(`🎭 Chi Tiết Skin: ${skin.ten}`)
              .setColor(color)
              .setDescription(
                `• **Loại**: \`${loaiText}\`\n` +
                `• **Giới tính**: \`${skin.gioiTinh}\`\n` +
                `• **Giá bán**: \`${skin.giaVnd.toLocaleString()} VND\` 💵\n` +
                `• **Mô tả**: _${skin.moTa || 'Không có mô tả.'}_`
              );

            // Action buttons
            const rowButtons = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('skin_shop_buy')
                .setLabel('💰 Mua Skin')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId('skin_shop_close')
                .setLabel('❌ Đóng Cửa Hàng')
                .setStyle(ButtonStyle.Secondary)
            );
            rows.push(rowButtons);
          }
        } else {
          // If no skin is selected yet, just show a close button
          const rowClose = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('skin_shop_close')
              .setLabel('❌ Đóng Cửa Hàng')
              .setStyle(ButtonStyle.Secondary)
          );
          rows.push(rowClose);
        }

        const embeds = [embed];
        if (detailEmbed) embeds.unshift(detailEmbed);

        return {
          embeds,
          components: rows
        };
      };

      const msg = await interaction.editReply(await buildShopPayload());

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 120_000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();

        if (i.customId === 'skin_shop_close') {
          collector.stop('closed');
          return;
        }

        if (i.customId === 'skin_shop_select') {
          selectedSkinId = i.values[0];
          await i.editReply(await buildShopPayload());
          return;
        }

        if (i.customId === 'skin_shop_buy') {
          if (!selectedSkinId) return;

          const skin = availableSkins.find(s => s.id === selectedSkinId);
          if (!skin) return;

          // 1. Reload player state
          const freshTuSi = await this.layTuSi(interaction.user.id);
          if (!freshTuSi) {
            collector.stop('error');
            return;
          }

          // 2. Check duplicate skin ownership
          const owned = await Inventory.findOne({
            where: {
              idNguoiDung: freshTuSi.idNguoiDung,
              itemId: skin.id
            }
          });

          if (owned) {
            await i.followUp({
              embeds: [BoTaoEmbed.loi(`Đạo hữu đã sở hữu skin **${skin.ten}** trong túi đồ rồi! Không cần mua thêm.`)],
              ephemeral: true
            });
            return;
          }

          // 3. Check VND balance
          if (freshTuSi.vnd < skin.giaVnd) {
            await i.followUp({
              embeds: [BoTaoEmbed.loi(`Số dư VND không đủ! Yêu cầu: \`${skin.giaVnd.toLocaleString()} VND\`, Hiện có: \`${(freshTuSi.vnd || 0).toLocaleString()} VND\`.`)],
              ephemeral: true
            });
            return;
          }

          // 4. Deduct VND & Award skin
          freshTuSi.vnd -= skin.giaVnd;
          await freshTuSi.save();

          await Inventory.addVatPham(freshTuSi.idNguoiDung, skin.id, 1);

          // Update local tuSi reference for rendering balance correctly
          tuSi.vnd = freshTuSi.vnd;

          await i.followUp({
            embeds: [BoTaoEmbed.thanhCong('🎉 Mua Skin Thành Công', `Đạo hữu đã mua thành công **${skin.ten}** với giá \`${skin.giaVnd.toLocaleString()} VND\`. Skin đã được gửi vào hòm đồ!`)],
            ephemeral: true
          });

          selectedSkinId = null; // Clear selection after buying
          await i.editReply(await buildShopPayload());
        }
      });

      collector.on('end', async (_, reason) => {
        try {
          if (reason === 'closed') {
            await interaction.editReply({
              embeds: [new EmbedBuilder()
                .setTitle('🏪 Cửa Hàng Skin — Đã Đóng')
                .setDescription('Đạo hữu đã rời khỏi Tiên Các Thời Trang.')
                .setColor(0x7f8c8d)
                .setTimestamp()],
              components: []
            });
          } else {
            // Disable all components on timeout
            const disabledPayload = await buildShopPayload();
            for (const row of disabledPayload.components) {
              for (const comp of row.components) {
                comp.setDisabled(true);
              }
            }
            await interaction.editReply(disabledPayload);
          }
        } catch (_) {}
      });
    }
  };
}

const controller = new BoDieuKhienSkin();
export const danhSachLenhSkin = [controller.lenhSkin];
export { controller as boDieuKhienSkin };
