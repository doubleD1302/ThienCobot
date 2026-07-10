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
import * as config from '../config.js';
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
      .setDescription('Quay gacha - Tạo Hóa Chi Hồ hoặc Triệu Gọi Linh Thú Vạn Thú Các'),

    execute: async (interaction) => {
      await interaction.deferReply();

      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      const getCoDuyenLenhCount = async () => {
        const invRecord = await Inventory.findOne({
          where: { idNguoiDung: tuSi.idNguoiDung, itemId: 'co_duyen_lenh' }
        });
        return invRecord ? invRecord.soLuong : 0;
      };

      const getLinhSungLenhCount = async () => {
        const invRecord = await Inventory.findOne({
          where: { idNguoiDung: tuSi.idNguoiDung, itemId: 'linh_sung_lenh' }
        });
        return invRecord ? invRecord.soLuong : 0;
      };

      const buildSelectionPayload = (coDuyenCount, linhSungCount) => {
        const embed = new EmbedBuilder()
          .setTitle('🏛️ THIÊN CƠ CẠN KHÔN CÁC — GACHA 🏛️')
          .setDescription(
            `Kính chào đạo hữu **${tuSi.ten}**!\n\n` +
            `Hôm nay đạo hữu muốn bước chân vào tầm bảo ở chốn nào?\n\n` +
            `1. **Tạo Hóa Chi Hồ 🔮**\n` +
            `   • Nơi quy tụ cơ duyên thiên địa, đạo cụ phi thăng và Chí Bảo Thượng Cổ.\n` +
            `   • Tiêu hao: **Cơ Duyên Lệnh 🎫** *(Hiện có: \`${coDuyenCount}\`)*\n\n` +
            `2. **Vạn Thú Các 🐾**\n` +
            `   • Nơi quần tụ linh sủng thượng cổ, các linh phách quý giá chốn linh sơn.\n` +
            `   • Tiêu hao: **Linh Sủng Lệnh 🎫** <:linh_sung_lenh:1525144632651153510> *(Hiện có: \`${linhSungCount}\`)*`
          )
          .setColor(0xe67e22)
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('select_tao_hoa')
            .setLabel('🔮 Tạo Hóa Chi Hồ')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('select_van_thu')
            .setLabel('🐾 Vạn Thú Các')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('gacha_close')
            .setLabel('❌ Đóng')
            .setStyle(ButtonStyle.Danger)
        );

        return { embeds: [embed], components: [row], files: [] };
      };

      const buildTaoHoaPayload = (coDuyenLenhCount, hasBTH) => {
        const bannerFile = new AttachmentBuilder('public/image/gacha_banner/basic_gacha.png');
        const supremeText = hasBTH
          ? 'Chí Bảo Thượng Cổ **Càn Khôn Đỉnh <:can_khon_dinh:1523249412950855850>**'
          : 'Chí Bảo Thượng Cổ **Bình Tinh Hải <:binh_tinh_hai:1523244204333994016>**';
        const embed = new EmbedBuilder()
          .setTitle('🔮 Tạo Hóa Chi Hồ - Gacha 🔮')
          .setDescription(
            `Chào mừng đạo hữu đến với **Tạo Hóa Chi Hồ** chốn thượng giới!\n` +
            `Nơi đây dung hợp cơ duyên thiên địa, có thể quay ra Linh Sủng Lệnh, Nguyên Liệu Luyện Khí theo cảnh giới, Linh Thạch, VND và đặc biệt là ${supremeText}.\n\n` +
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
            .setCustomId('select_back')
            .setLabel('⬅️ Trở Về')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('gacha_close')
            .setLabel('❌ Đóng')
            .setStyle(ButtonStyle.Danger)
        );

        return { embeds: [embed], files: [bannerFile], components: [row] };
      };

      const buildVanThuPayload = (linhSungCount) => {
        const embed = new EmbedBuilder()
          .setTitle('🐾 VẠN THÚ CÁC — TRIỆU GỌI LINH THÚ 🐾')
          .setDescription(
            `Đạo hữu đã bước chân vào **Vạn Thú Các**, nơi quần tụ của vạn loài linh thú!\n` +
            `Dùng **Linh Sủng Lệnh** để triệu gọi linh thú sơ sinh hoặc thu thập yêu phách cường hóa huyết mạch.\n\n` +
            `• **Vật phẩm tiêu hao**: **Linh Sủng Lệnh 🎫** <:linh_sung_lenh:1525144632651153510>\n` +
            `• **Linh Sủng Lệnh hiện có**: \`${linhSungCount}\` 🎫\n\n` +
            `• **Tỷ lệ nhận thưởng**:\n` +
            `  - 🐾 **3%**: Linh Thú Sơ Sinh (Hỏa Hầu, Băng Điểu, Nham Giáp, Dạ Miêu, Thanh Lộc)\n` +
            `  - 🟠 **10%**: Yêu Phách Thượng Phẩm\n` +
            `  - 🟢 **27%**: Yêu Phách Trung Phẩm\n` +
            `  - ⚪ **40%**: Yêu Phách Hạ Phẩm\n` +
            `  - 🍒 **20%**: Vạn Yêu Quả <:van_yeu_qua:1522610159497777174>`
          )
          .setColor(0x2ecc71)
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('van_thu_roll_1')
            .setLabel('🐾 Triệu Gọi x1')
            .setStyle(ButtonStyle.Success)
            .setDisabled(linhSungCount < 1),
          new ButtonBuilder()
            .setCustomId('van_thu_roll_10')
            .setLabel('🐾 Triệu Gọi x10')
            .setStyle(ButtonStyle.Success)
            .setDisabled(linhSungCount < 10),
          new ButtonBuilder()
            .setCustomId('select_back')
            .setLabel('⬅️ Trở Về')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('gacha_close')
            .setLabel('❌ Đóng')
            .setStyle(ButtonStyle.Danger)
        );

        return { embeds: [embed], components: [row], files: [] };
      };

      let ownsBinhTinhHai = await Inventory.findOne({
        where: { idNguoiDung: tuSi.idNguoiDung, itemId: 'binh_tinh_hai' }
      });
      let coDuyenCount = await getCoDuyenLenhCount();
      let linhSungCount = await getLinhSungLenhCount();

      const mainPayload = buildSelectionPayload(coDuyenCount, linhSungCount);
      const msg = await interaction.editReply(mainPayload);

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

        if (i.customId === 'select_back') {
          coDuyenCount = await getCoDuyenLenhCount();
          linhSungCount = await getLinhSungLenhCount();
          await interaction.editReply(buildSelectionPayload(coDuyenCount, linhSungCount));
          return;
        }

        if (i.customId === 'select_tao_hoa') {
          coDuyenCount = await getCoDuyenLenhCount();
          ownsBinhTinhHai = await Inventory.findOne({
            where: { idNguoiDung: tuSi.idNguoiDung, itemId: 'binh_tinh_hai' }
          });
          await interaction.editReply(buildTaoHoaPayload(coDuyenCount, !!ownsBinhTinhHai));
          return;
        }

        if (i.customId === 'select_van_thu') {
          linhSungCount = await getLinhSungLenhCount();
          await interaction.editReply(buildVanThuPayload(linhSungCount));
          return;
        }

        // Handle Tạo Hóa Chi Hồ Rolls
        if (i.customId.startsWith('gacha_roll_')) {
          const rollCount = i.customId === 'gacha_roll_1' ? 1 : 10;

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

          invRecord.soLuong -= rollCount;
          if (invRecord.soLuong <= 0) {
            await invRecord.destroy();
          } else {
            await invRecord.save();
          }

          let videoPath = 'public/video/gacha/gacha10.mp4';
          if (rollCount === 1 && fs.existsSync('public/video/gacha/gacha1.mp4')) {
            videoPath = 'public/video/gacha/gacha1.mp4';
          }
          const videoAttachment = new AttachmentBuilder(videoPath);

          await interaction.editReply({
            content: `✨ **Tạo Hóa Chi Hồ chuyển động, tinh vân tụ hội... Đạo hữu đang quay x${rollCount}!**`,
            embeds: [],
            components: [],
            files: [videoAttachment]
          });

          await new Promise(resolve => setTimeout(resolve, rollCount === 1 ? 5000 : 8000));

          const rolledResults = [];
          let hitSupreme = false;
          let hitSupremeId = 'binh_tinh_hai';
          let hitSupremeName = 'Bình Tinh Hải';

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
              if (Math.random() <= 0.05) {
                const itemDetail = config.ITEMS.find(item => item.id === 'linh_sung_lenh');
                const itemName = itemDetail ? itemDetail.ten : 'Linh Sủng Lệnh';
                rolledResults.push({ type: 'item', itemId: 'linh_sung_lenh', ten: itemName, doHiem: 'Hiếm' });
              } else {
                const realmInfo = config.layThongTinCanhGioi(tuSi.capDo);
                const realmObj = config.CANH_GIOI_LIST.find(r => r.name === realmInfo.realmName) || config.CANH_GIOI_LIST[0];
                const minLvl = realmObj.min_level;
                const maxLvl = realmObj.max_level;

                let finalMaterials = config.ITEMS.filter(item => 
                  item.loai === 'Nguyên liệu' && 
                  item.yeuCauCanhGioi >= minLvl && 
                  item.yeuCauCanhGioi <= maxLvl
                );

                if (finalMaterials.length === 0) {
                  finalMaterials = config.ITEMS.filter(item => 
                    item.loai === 'Nguyên liệu' && 
                    item.yeuCauCanhGioi <= tuSi.capDo
                  );
                }

                if (finalMaterials.length > 0) {
                  const getRarityWeight = (doHiem) => {
                    if (doHiem === 'Thường') return 100;
                    if (doHiem === 'Hiếm') return 20;
                    if (doHiem === 'Cực hiếm') return 4;
                    if (doHiem === 'Huyền thoại') return 1;
                    return 10;
                  };

                  const totalWeight = finalMaterials.reduce((sum, item) => sum + getRarityWeight(item.doHiem), 0);
                  let roll = Math.random() * totalWeight;
                  let selectedMaterial = finalMaterials[0];
                  for (const item of finalMaterials) {
                    const w = getRarityWeight(item.doHiem);
                    if (roll <= w) {
                      selectedMaterial = item;
                      break;
                    }
                    roll -= w;
                  }
                  rolledResults.push({ type: 'item', itemId: selectedMaterial.id, ten: selectedMaterial.ten, doHiem: selectedMaterial.doHiem });
                } else {
                  rolledResults.push({ type: 'stones', amount: 5000 });
                }
              }
            }
          }

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

          const nextCount = await getCoDuyenLenhCount();
          const nextPayload = buildTaoHoaPayload(nextCount, !!ownsBinhTinhHai);

          await interaction.editReply({
            content: null,
            embeds: [responseEmbed],
            components: nextPayload.components,
            files: filesToSend
          });
          return;
        }

        // Handle Vạn Thú Các Rolls
        if (i.customId.startsWith('van_thu_roll_')) {
          const rollCount = i.customId === 'van_thu_roll_1' ? 1 : 10;

          const invRecord = await Inventory.findOne({
            where: { idNguoiDung: tuSi.idNguoiDung, itemId: 'linh_sung_lenh' }
          });
          if (!invRecord || invRecord.soLuong < rollCount) {
            await i.followUp({
              content: `❌ Đạo hữu không đủ Linh Sủng Lệnh! Cần ${rollCount} lệnh, hiện có ${invRecord ? invRecord.soLuong : 0}.`,
              ephemeral: true
            });
            return;
          }

          invRecord.soLuong -= rollCount;
          if (invRecord.soLuong <= 0) {
            await invRecord.destroy();
          } else {
            await invRecord.save();
          }

          await interaction.editReply({
            content: `✨ **Vạn Thú Các tụ khởi càn khôn vân vụ, vạn thú gầm vang chấn động... Đạo hữu đang triệu gọi x${rollCount}!**`,
            embeds: [],
            components: [],
            files: []
          });

          await new Promise(resolve => setTimeout(resolve, rollCount === 1 ? 4000 : 7000));

          const rolledResults = [];
          const { Pet } = await import('../models/Pet.js');
          const petLineages = ['hoa_hau', 'bang_dieu', 'nham_giap', 'da_mieu', 'thanh_loc'];

          for (let r = 0; r < rollCount; r++) {
            const rnd = Math.random() * 100;
            if (rnd < 3) {
              // Roll 3% Linh thú
              const type = petLineages[Math.floor(Math.random() * petLineages.length)];
              const stage1Conf = config.NEW_PET_LINEAGES[type].stages[1];
              const cleanName = stage1Conf.name;
              const petName = config.getFormattedPetName(cleanName, 'ha_pham', 1, false);

              await Pet.create({
                userId: tuSi.idNguoiDung,
                type,
                name: petName,
                rarity: 'ha_pham',
                level: 1,
                exp: 0,
                tuChat: 100,
                tienHoa: 1,
                isActive: false
              });

              rolledResults.push({
                type: 'pet',
                name: petName,
                emoji: type === 'hoa_hau' ? '🐒' : type === 'bang_dieu' ? '🐦' : type === 'nham_giap' ? '🛡️' : type === 'da_mieu' ? '🐈' : '🦌'
              });
            } else if (rnd < 13) {
              // Roll 10% Yêu Phách Thượng Phẩm
              const itemId = ['kim_phach_thuong', 'tho_phach_thuong', 'moc_phac_thuong', 'thuy_phach_thuong', 'hoa_phach_thuong'][Math.floor(Math.random() * 5)];
              const itemConf = config.ITEMS.find(item => item.id === itemId);
              await Inventory.addVatPham(tuSi.idNguoiDung, itemId, 1);
              rolledResults.push({ type: 'item', itemId, ten: itemConf.ten, emoji: itemConf.emoji });
            } else if (rnd < 40) {
              // Roll 27% Yêu Phách Trung Phẩm
              const itemId = ['kim_phach_trung', 'tho_phach_trung', 'moc_phach_trung', 'thuy_phach_trung', 'hoa_phach_trung'][Math.floor(Math.random() * 5)];
              const itemConf = config.ITEMS.find(item => item.id === itemId);
              await Inventory.addVatPham(tuSi.idNguoiDung, itemId, 1);
              rolledResults.push({ type: 'item', itemId, ten: itemConf.ten, emoji: itemConf.emoji });
            } else if (rnd < 80) {
              // Roll 40% Yêu Phách Hạ Phẩm
              const itemId = ['kim_phach_ha', 'tho_phach_ha', 'moc_phach_ha', 'thuy_phac_ha', 'hoa_phach_ha'][Math.floor(Math.random() * 5)];
              const itemConf = config.ITEMS.find(item => item.id === itemId);
              await Inventory.addVatPham(tuSi.idNguoiDung, itemId, 1);
              rolledResults.push({ type: 'item', itemId, ten: itemConf.ten, emoji: itemConf.emoji });
            } else {
              // Roll 20% Vạn Yêu Quả
              const itemId = 'van_yeu_qua';
              const itemConf = config.ITEMS.find(item => item.id === itemId);
              await Inventory.addVatPham(tuSi.idNguoiDung, itemId, 1);
              rolledResults.push({ type: 'item', itemId, ten: itemConf ? itemConf.ten : 'Vạn Yêu Quả 🍒', emoji: itemConf ? itemConf.emoji : '<:van_yeu_qua:1522610159497777174>' });
            }
          }

          const rewardLines = rolledResults.map(res => {
            if (res.type === 'pet') {
              return `🐾 **Linh Thú Sơ Sinh**: **${res.name}** ${res.emoji} *(Ký hợp đồng!)*`;
            }
            return `${res.emoji} **Vật phẩm**: **${res.ten}** x1`;
          });

          const responseEmbed = new EmbedBuilder()
            .setTitle('🐾 Kết Quả Triệu Gọi: Vạn Thú Các 🐾')
            .setColor(0x2ecc71)
            .setDescription(
              `Đạo hữu **${tuSi.ten}** tiêu hao \`${rollCount}\` Linh Sủng Lệnh và nhận được các linh duyên sau:\n\n` +
              rewardLines.join('\n')
            )
            .setTimestamp();

          const nextCount = await getLinhSungLenhCount();
          const nextPayload = buildVanThuPayload(nextCount);

          await interaction.editReply({
            content: null,
            embeds: [responseEmbed],
            components: nextPayload.components
          });
          return;
        }
      });

      collector.on('end', async (_, reason) => {
        try {
          if (reason === 'closed') {
            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle('🏛️ Thiên Cơ Càn Khôn Các — Đã Khép')
                  .setDescription('Không gian bảo khố càn khôn từ từ khép lại.')
                  .setColor(0x7f8c8d)
                  .setTimestamp()
              ],
              components: [],
              files: []
            });
          } else {
            const disabledRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('select_tao_hoa').setLabel('🔮 Tạo Hóa Chi Hồ').setStyle(ButtonStyle.Primary).setDisabled(true),
              new ButtonBuilder().setCustomId('select_van_thu').setLabel('🐾 Vạn Thú Các').setStyle(ButtonStyle.Success).setDisabled(true),
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
