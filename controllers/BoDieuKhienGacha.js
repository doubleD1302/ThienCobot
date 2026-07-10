import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder
} from 'discord.js';
import fs from 'fs';
import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';
import { Inventory } from '../models/Inventory.js';
import { Item } from '../models/Item.js';
import { ThienDaoLuc } from '../models/ThienDaoLuc.js';
import {
  GACHA_POOL_WEIGHTS,
  DB_ITEM_RARITY_WEIGHTS,
  mapGachaRarityToDbRarity,
  rollFromWeights,
  rollStonesAmount,
  rollVndAmount
} from '../config_gacha.js';

class BoDieuKhienGacha extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhGacha = {
    data: new SlashCommandBuilder()
      .setName('gacha')
      .setDescription('Quay Hồ Tạo Hóa thử cơ duyên nhận bảo vật cổ xưa'),

    execute: async (interaction) => {
      await interaction.deferReply();

      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      let ownsBinhTinhHai = await Inventory.findOne({
        where: { idNguoiDung: tuSi.idNguoiDung, itemId: 'binh_tinh_hai' }
      });

      const getCoDuyenLenhCount = async () => {
        const invRecord = await Inventory.findOne({
          where: { idNguoiDung: tuSi.idNguoiDung, itemId: 'co_duyen_lenh' }
        });
        return invRecord ? invRecord.soLuong : 0;
      };

      const buildMainPayload = (coDuyenLenhCount, hasBTH) => {
        const bannerFile = new AttachmentBuilder('public/image/gacha_banner/basic_gacha.png');
        const supremeText = hasBTH
          ? 'Chí Bảo Thượng Cổ **Càn Khôn Đỉnh <:can_khon_dinh:1523249412950855850>**'
          : 'Chí Bảo Thượng Cổ **Bình Tinh Hải <:binh_tinh_hai:1523244204333994016>**';
        const embed = new EmbedBuilder()
          .setTitle('🔮 Tạo Hóa Chi Hồ - Gacha 🔮')
          .setDescription(
            `Chào mừng đạo hữu đến với **Tạo Hóa Chi Hồ** chốn thượng giới!\n` +
            `Nơi đây dung hợp cơ duyên thiên địa, có thể quay ra các đạo cụ quý hiếm, Linh Thạch, VND và đặc biệt là ${supremeText}.\n\n` +
            `• **Vật phẩm tiêu hao**: **Cơ Duyên Lệnh 🎫** (1 Cơ Duyên Lệnh = 1 lượt quay)\n` +
            `• **Cơ Duyên Lệnh hiện có**: \`${coDuyenLenhCount.toLocaleString()}\` 🎫\n\n` +
            `Đạo hữu hãy chọn số lượt quay bên dưới:`
          )
          .setImage('attachment://basic_gacha.png')
          .setColor(0x9b59b6)
          .setTimestamp()
          .setFooter({ text: 'Thiên Cơ Đại Lục • Tạo Hóa Chi Hồ' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('gacha_roll_1')
            .setLabel('🔮 Quay x1')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(coDuyenLenhCount < 1),
          new ButtonBuilder()
            .setCustomId('gacha_roll_10')
            .setLabel('🔮 Quay x10')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(coDuyenLenhCount < 10),
          new ButtonBuilder()
            .setCustomId('gacha_close')
            .setLabel('❌ Đóng')
            .setStyle(ButtonStyle.Danger)
        );

        return { embeds: [embed], files: [bannerFile], components: [row] };
      };

      let currentCount = await getCoDuyenLenhCount();
      const payload = buildMainPayload(currentCount, !!ownsBinhTinhHai);

      const msg = await interaction.editReply(payload);

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 180_000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();

        if (i.customId === 'gacha_close') {
          collector.stop('closed');
          return;
        }

        const rollCount = i.customId === 'gacha_roll_1' ? 1 : 10;

        // Reload check
        const invRecord = await Inventory.findOne({
          where: { idNguoiDung: tuSi.idNguoiDung, itemId: 'co_duyen_lenh' }
        });
        if (!invRecord || invRecord.soLuong < rollCount) {
          await i.followUp({
            content: `❌ Đạo hữu không đủ Cơ Duyên Lệnh! Cần ${rollCount} lệnh, hiện có ${invRecord ? invRecord.soLuong : 0}.`,
            ephemeral: true
          });
          return;
        }

        // Deduct
        invRecord.soLuong -= rollCount;
        if (invRecord.soLuong <= 0) {
          await invRecord.destroy();
        } else {
          await invRecord.save();
        }

        // Animation Video Selection
        let videoPath = 'public/video/gacha/gacha10.mp4';
        if (rollCount === 1) {
          if (fs.existsSync('public/video/gacha/gacha1.mp4')) {
            videoPath = 'public/video/gacha/gacha1.mp4';
          }
        }

        const videoAttachment = new AttachmentBuilder(videoPath);

        await interaction.editReply({
          content: `✨ **Tạo Hóa Chi Hồ chuyển động, tinh vân tụ hội... Đạo hữu đang quay x${rollCount}!**`,
          embeds: [],
          components: [],
          files: [videoAttachment]
        });

        // Delay for video play simulation (x1 = 5s, x10 = 8s)
        await new Promise(resolve => setTimeout(resolve, rollCount === 1 ? 5000 : 8000));

        // Generate Results
        const rolledResults = [];
        let hitSupreme = false;
        let hitSupremeId = 'binh_tinh_hai';
        let hitSupremeName = 'Bình Tinh Hải';

        // Check ownership again before rolling to be dynamic
        ownsBinhTinhHai = await Inventory.findOne({
          where: { idNguoiDung: tuSi.idNguoiDung, itemId: 'binh_tinh_hai' }
        });
        const targetSupremeId = ownsBinhTinhHai ? 'can_khon_dinh' : 'binh_tinh_hai';
        const targetSupremeName = ownsBinhTinhHai ? 'Càn Khôn Đỉnh' : 'Bình Tinh Hải';

        for (let r = 0; r < rollCount; r++) {
          if (Math.random() <= 0.01) {
            rolledResults.push({ type: 'item', itemId: 'trung_linh_thu_than', ten: 'Trứng Linh Thú (Thần) 🥚', doHiem: 'Thần cấp' });
            continue;
          }
          const category = rollFromWeights(GACHA_POOL_WEIGHTS);
          if (category === 'supreme') {
            rolledResults.push({ type: 'supreme', itemId: targetSupremeId, ten: targetSupremeName });
            hitSupreme = true;
            hitSupremeId = targetSupremeId;
            hitSupremeName = targetSupremeName;
          } else if (category === 'stones') {
            const amount = rollStonesAmount();
            rolledResults.push({ type: 'stones', amount });
          } else if (category === 'vnd') {
            const amount = rollVndAmount();
            rolledResults.push({ type: 'vnd', amount });
          } else {
            // dbItems
            const gachaRarity = rollFromWeights(DB_ITEM_RARITY_WEIGHTS);
            const dbRarities = mapGachaRarityToDbRarity(gachaRarity);
            const { Op } = await import('sequelize');
            const eligibleItems = await Item.findAll({
              where: {
                doHiem: { [Op.in]: dbRarities },
                loai: { [Op.notIn]: ['Skin', 'skin', 'Aura', 'aura', 'Background', 'background'] }
              }
            });
            const selectedItem = eligibleItems.length > 0
              ? eligibleItems[Math.floor(Math.random() * eligibleItems.length)]
              : null;
            if (selectedItem) {
              rolledResults.push({ type: 'item', itemId: selectedItem.id, ten: selectedItem.ten, doHiem: selectedItem.doHiem });
            } else {
              rolledResults.push({ type: 'stones', amount: 5000 }); // fallback
            }
          }
        }

        // Distribute Rewards
        const rewardLines = [];
        for (const res of rolledResults) {
          if (res.type === 'supreme') {
            await Inventory.addVatPham(tuSi.idNguoiDung, res.itemId, 1);
            rewardLines.push(`🏺 **Chí Bảo**: **${res.ten}** x1 *(Đặc Biệt!)*`);
          } else if (res.type === 'stones') {
            tuSi.linhThach += res.amount;
            rewardLines.push(`🪙 **Linh Thạch**: \`+${res.amount.toLocaleString()}\` viên`);
          } else if (res.type === 'vnd') {
            tuSi.vnd += res.amount;
            rewardLines.push(`💵 **VND**: \`+${res.amount.toLocaleString()}\` VND`);
          } else if (res.type === 'item') {
            await Inventory.addVatPham(tuSi.idNguoiDung, res.itemId, 1);
            rewardLines.push(`🎁 **Vật phẩm**: **${res.ten}** (\`${res.doHiem}\`)`);
          }
        }
        await tuSi.save();

        let daoNien = 1;
        if (interaction.guildId) {
          const guildConfig = await this.layHoacTaoCauHinhGuild(interaction.guildId);
          if (guildConfig) {
            daoNien = guildConfig.layDaoNienHienTai();
          }
        }

        // Build Response Embed
        let responseEmbed;
        let filesToSend = [];
        if (hitSupreme) {
          const isBTH = (hitSupremeId === 'binh_tinh_hai');
          const supremeDisplay = isBTH
            ? `**<:binh_tinh_hai:1523244204333994016> BÌNH TINH HẢI <:binh_tinh_hai:1523244204333994016>**\n*(Mỗi ngày sử dụng để tạo hoá  2 viên Đan Thần Phẩm 🔴 cộng lượng lớn tu vi)*\n\n`
            : `**<:can_khon_dinh:1523249412950855850> CÀN KHÔN ĐỈNH <:can_khon_dinh:1523249412950855850>**\n*(Mỗi ngày sử dụng 2 lần để tái lập linh văn (chỉ số phụ) của trang bị đang mặc)*\n\n`;
          const thumbnailFile = isBTH ? 'binh_tinh_hai.png' : 'can_khon_dinh.png';
          const imagePath = isBTH ? 'public/image/chi_bao/binh_tinh_hai.png' : 'public/image/chi_bao/can_khon_dinh.png';

          responseEmbed = new EmbedBuilder()
            .setTitle('🏺 THIÊN ĐẠO DIỆU QUANG — TRÚNG CHÍ BẢO 🏺')
            .setColor(0xe74c3c)
            .setDescription(
              `🎉 **Chúc mừng đạo hữu ${tuSi.ten} đã xoay chuyển càn khôn, nhận được Chí Bảo Thượng Cổ:**\n\n` +
              supremeDisplay +
              `**Danh sách quà nhận được**:\n` +
              rewardLines.join('\n')
            )
            .setThumbnail(`attachment://${thumbnailFile}`)
            .setTimestamp();

          filesToSend.push(new AttachmentBuilder(imagePath));

          // Broadcast to Thien Dao Luc with tag @everyone
          const announceMsg = isBTH
            ? `🌌 **Thiên Địa Dị Tượng - Chí Bảo Xuất Thế** 🌌\n\n` +
              `Vào **Đạo Niên thứ ${daoNien}**, tại **Tạo Hóa Chi Hồ**, đạo hữu **${tuSi.ten}** vận khí ngút trời, dẫn động thiên địa dị tượng, thành công nhận được **Chí Bảo Thượng Cổ: Bình Tinh Hải <:binh_tinh_hai:1523244204333994016>**! \n` +
              `Linh quang vạn trượng chấn động bát hoang, chư vị đạo hữu hãy mau đến chiêm bái!`
            : `🌌 **Thiên Địa Dị Tượng - Chí Bảo Xuất Thế** 🌌\n\n` +
              `Vào **Đạo Niên thứ ${daoNien}**, tại **Tạo Hóa Chi Hồ**, đạo hữu **${tuSi.ten}** vận khí ngút trời, dẫn động thiên địa dị tượng, thành công nhận được **Chí Bảo Thượng Cổ: Càn Khôn Đỉnh <:can_khon_dinh:1523249412950855850>**! \n` +
              `Linh quang vạn trượng chấn động bát hoang, chư vị đạo hữu hãy mau đến chiêm bái!`;
          await ThienDaoLuc.ghiLuc(announceMsg, 'Supreme');
        } else {
          responseEmbed = new EmbedBuilder()
            .setTitle('🔮 Kết Quả Gacha: Tạo Hóa Chi Hồ 🔮')
            .setColor(0x2ecc71)
            .setDescription(
              `Đạo hữu **${tuSi.ten}** tiêu hao \`${rollCount}\` Cơ Duyên Lệnh và nhận được các kỳ ngộ sau:\n\n` +
              rewardLines.join('\n')
            )
            .setTimestamp();
        }

        // Show buttons again for further rolls
        const nextCount = await getCoDuyenLenhCount();
        ownsBinhTinhHai = await Inventory.findOne({
          where: { idNguoiDung: tuSi.idNguoiDung, itemId: 'binh_tinh_hai' }
        });
        const nextPayload = buildMainPayload(nextCount, !!ownsBinhTinhHai);

        // Edit reply, clearing content text and passing filesToSend array
        await interaction.editReply({
          content: null,
          embeds: [responseEmbed],
          components: nextPayload.components,
          files: filesToSend
        });
      });

      collector.on('end', async (_, reason) => {
        try {
          if (reason === 'closed') {
            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle('🔮 Tạo Hóa Chi Hồ — Đã Khép')
                  .setDescription('Cánh cổng Tạo Hóa Chi Hồ từ từ khép lại trong lớp sương mù dày đặc.')
                  .setColor(0x7f8c8d)
                  .setTimestamp()
              ],
              components: [],
              files: []
            });
          } else {
            const count = await getCoDuyenLenhCount();
            const disabledRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('gacha_roll_1').setLabel('🔮 Quay x1').setStyle(ButtonStyle.Primary).setDisabled(true),
              new ButtonBuilder().setCustomId('gacha_roll_10').setLabel('🔮 Quay x10').setStyle(ButtonStyle.Primary).setDisabled(true),
              new ButtonBuilder().setCustomId('gacha_close').setLabel('❌ Đóng').setStyle(ButtonStyle.Danger).setDisabled(true)
            );
            await interaction.editReply({
              components: [disabledRow]
            });
          }
        } catch (_) { }
      });
    }
  };
}

const controller = new BoDieuKhienGacha();
export const danhSachLenhGacha = [controller.lenhGacha];
export { controller as boDieuKhienGacha };
