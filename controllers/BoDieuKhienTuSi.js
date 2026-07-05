import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder,
  EmbedBuilder
} from 'discord.js';
import { Jimp } from 'jimp';
import fs from 'fs';
import { Skin } from '../models/Skin.js';
import { Op } from 'sequelize';
import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';
import { GiaoDienTaoNhanVat } from '../views/GiaoDienTaoNhanVat.js';
import * as config from '../config.js';

class BoDieuKhienTuSi extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  async veNhanVatSkin(tuSi) {
    let canvas = null;

    // 1. Draw background
    if (tuSi.equippedBackground) {
      const bgSkin = await Skin.findByPk(tuSi.equippedBackground);
      if (bgSkin) {
        const bgPath = `public/image/skin/background/${bgSkin.fileAnh}`;
        if (fs.existsSync(bgPath)) {
          canvas = await Jimp.read(bgPath);
          canvas.resize({ w: 384, h: 576 });
        }
      }
    }

    if (!canvas) {
      canvas = new Jimp({ width: 384, height: 576, color: 0x00000000 });
    }

    // 2. Draw aura
    if (tuSi.equippedAura) {
      const auraSkin = await Skin.findByPk(tuSi.equippedAura);
      if (auraSkin) {
        const auraPath = `public/image/skin/aura/${auraSkin.fileAnh}`;
        if (fs.existsSync(auraPath)) {
          const auraImg = await Jimp.read(auraPath);
          auraImg.resize({ w: 292, h: 438 });
          canvas.composite(auraImg, 46, 69);
        }
      }
    }

    // 3. Draw skin
    if (tuSi.equippedSkin) {
      const skinSkin = await Skin.findByPk(tuSi.equippedSkin);
      if (skinSkin) {
        const dir = String(skinSkin.gioiTinh).toLowerCase() === 'nữ' ? 'nu' : 'nam';
        const skinPath = `public/image/skin/skin/${dir}/${skinSkin.fileAnh}`;
        if (fs.existsSync(skinPath)) {
          const skinImg = await Jimp.read(skinPath);
          skinImg.resize({ w: 230, h: 304 });
          canvas.composite(skinImg, 77, 203);
        }
      }
    }

    return await canvas.getBuffer('image/png');
  }

  // Lệnh /start: Tạo nhân vật mới, chọn giới tính, hướng đi và roll Linh Căn
  lenhNhapThe = {
    data: new SlashCommandBuilder()
      .setName('start')
      .setDescription('Tạo nhân vật mới, chọn giới tính, hướng đi và roll Linh Căn')
      .addStringOption(option =>
        option.setName('ten')
          .setDescription('Tên tu sĩ của ngươi (tối đa 20 ký tự)')
          .setRequired(true)
      ),
    execute: async (interaction) => {
      const ten = interaction.options.getString('ten');

      // 1. Kiểm tra độ dài tên
      if (ten.length > 20) {
        return await interaction.reply({
          embeds: [BoTaoEmbed.loi("Tên tu sĩ quá dài! Vui lòng chọn tên dưới 20 ký tự.")],
          ephemeral: true
        });
      }

      // 2. Kiểm tra tu sĩ đã tồn tại chưa
      const tuSi = await this.layTuSi(interaction.user.id);
      if (tuSi) {
        return await interaction.reply({
          embeds: [BoTaoEmbed.loi("Ngươi đã gia nhập thế giới tu tiên từ trước! Hãy gõ `/nv` để xem thông tin.")],
          ephemeral: true
        });
      }

      // 3. Lấy Đạo Niên hiện tại của Guild
      let daoNien = null;
      if (interaction.guildId) {
        const guildConfig = await this.layHoacTaoCauHinhGuild(interaction.guildId);
        if (guildConfig) {
          daoNien = guildConfig.layDaoNienHienTai();
        }
      }

      // 4. Khởi tạo trình tạo nhân vật trực quan
      const trinhTao = new GiaoDienTaoNhanVat(interaction.user, ten, daoNien);
      const message = await interaction.reply({
        embeds: [trinhTao.getEmbed()],
        components: trinhTao.getComponents(),
        fetchReply: true
      });

      await trinhTao.startCollector(interaction, message);
    }
  };

  // Lệnh /nv: Xem hồ sơ nhân vật tu sĩ
  lenhHoSo = {
    data: new SlashCommandBuilder()
      .setName('nv')
      .setDescription('Xem hồ sơ nhân vật tu sĩ')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('Đạo hữu muốn xem thông tin')
          .setRequired(false)
      ),
    execute: async (interaction) => {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const tuSi = await this.layTuSi(targetUser.id);
      if (!tuSi) {
        const isSelf = targetUser.id === interaction.user.id;
        const msg = isSelf
          ? "Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên."
          : "Đạo hữu này chưa gia nhập hồng trần tu tiên!";
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(msg)]
        });
      }

      // Nhận phần thưởng tu vi nếu đã tu luyện xong
      const { completed, exp, stones } = await this.kiemTraVaNhanTuVi(tuSi);
      if (completed) {
        const embedReward = BoTaoEmbed.thanhCong(
          "🧘 Thiền Định Hoàn Tất",
          `Đạo hữu đã hoàn thành thiền định!\n` +
          `• **Linh lực nhận được**: \`+${exp}\` ✨\n` +
          `• **Linh thạch nhận được**: \`+${stones}\` 💎`
        );
        if (interaction.channel) {
          await interaction.channel.send({ content: `<@${tuSi.idNguoiDung}>`, embeds: [embedReward] }).catch(err => console.error(err));
        }
      }

      const { Inventory } = await import('../models/Inventory.js');
      const { Item } = await import('../models/Item.js');
      const { Pet } = await import('../models/Pet.js');
      const { Abode } = await import('../models/Abode.js');

      let activePet = await Pet.findOne({ where: { userId: tuSi.idNguoiDung, isActive: true } });
      if (activePet) {
        const check = config.checkHuyetMachApChe(tuSi.capDo, activePet.rarity);
        if (!check.allowed) activePet = null;
      }
      const abode = await Abode.findByPk(tuSi.idNguoiDung);
      const lvDongPhu = abode ? abode.level : 0;

      const equippedInv = await Inventory.findAll({
        where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true }
      });
      const equippedItems = [];
      for (const eq of equippedInv) {
        const detail = await Item.findByPk(eq.itemId);
        if (detail) {
          eq.item = detail;
          equippedItems.push({ eq, detail });
        }
      }

      const stats = tuSi.layChiSo(equippedInv, activePet);
      
      // Khôi phục chỉ số động khi thay đổi căn cơ phạt cực đại
      let updated = false;
      if (tuSi.hp > stats.max_hp) {
        tuSi.hp = stats.max_hp;
        updated = true;
      }
      if (tuSi.mp > stats.max_mp) {
        tuSi.mp = stats.max_mp;
        updated = true;
      }
      if (updated) {
        await tuSi.save();
      }

      let daoNien = null;
      if (interaction.guildId) {
        const guildConfig = await this.layHoacTaoCauHinhGuild(interaction.guildId);
        if (guildConfig) {
          daoNien = guildConfig.layDaoNienHienTai();
        }
      }

      // Lấy tốc độ tu luyện và Linh lực yêu cầu từ CanhGioi
      const { CanhGioi } = await import('../models/CanhGioi.js');
      const cg = await CanhGioi.findByPk(tuSi.capDo);
      const tocDoCoBan = cg ? cg.tocDoCoBan : 100;
      const heSoTuLuyen = tuSi.layHeSoTuLuyen(activePet);
      // Nhân thêm tốc độ từ Động phủ
      const tocDoTuLuyen = Math.floor(tocDoCoBan * heSoTuLuyen * (1 + lvDongPhu));
      const reqExp = cg ? cg.linhLucYeuCau : config.layLinhLucYeuCau(tuSi.capDo);

      // Check if equipped skin exists
      let attachment = null;
      let skinImageUrl = null;
      if (tuSi.equippedSkin) {
        try {
          const buffer = await this.veNhanVatSkin(tuSi);
          if (buffer) {
            attachment = new AttachmentBuilder(buffer, { name: 'character_skin.png' });
            skinImageUrl = 'attachment://character_skin.png';
          }
        } catch (err) {
          console.error('Lỗi dựng ảnh skin:', err);
        }
      }

      const embed = BoTaoEmbed.hoSo(tuSi, targetUser, stats, daoNien, tocDoTuLuyen, reqExp, equippedItems, skinImageUrl);

      // Components (Buttons) for /nv
      const components = [];
      if (targetUser.id === interaction.user.id) {
        components.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('nv_fashion_open')
              .setLabel('👕 Thời Trang')
              .setStyle(ButtonStyle.Primary)
          )
        );
      }

      const payload = { embeds: [embed], components };
      if (attachment) {
        payload.files = [attachment];
      }

      const msg = await interaction.editReply(payload);

      if (targetUser.id !== interaction.user.id) return; // Only allow self customization

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 180_000
      });

      let currentSheet = 'skin'; // 'background' | 'aura' | 'skin'
      let selectedCustomizerSkinId = null;

      // Helper function to build fashion menu payload
      const buildFashionPayload = async () => {
        // Query player owned skins of the current category from inventory
        const { Inventory } = await import('../models/Inventory.js');
        const ownedInv = await Inventory.findAll({
          where: { idNguoiDung: tuSi.idNguoiDung }
        });

        const ownedSkinIds = ownedInv.map(inv => inv.itemId);
        // Find corresponding Skins in Skin database
        const ownedSkins = await Skin.findAll({
          where: {
            id: { [Op.in]: ownedSkinIds },
            loai: currentSheet
          }
        });

        const currentBg = tuSi.equippedBackground ? (await Skin.findByPk(tuSi.equippedBackground))?.ten || tuSi.equippedBackground : 'Chưa trang bị';
        const currentAura = tuSi.equippedAura ? (await Skin.findByPk(tuSi.equippedAura))?.ten || tuSi.equippedAura : 'Chưa trang bị';
        const currentSkin = tuSi.equippedSkin ? (await Skin.findByPk(tuSi.equippedSkin))?.ten || tuSi.equippedSkin : 'Chưa trang bị';

        const embedCustom = new EmbedBuilder()
          .setTitle('👕 Tiên Các Thời Trang')
          .setColor(color)
          .setDescription(
            `Trang hoàng ngoại hình của tu sĩ để hiển thị trên profile!\n\n` +
            `• **Nền ảnh**: \`${currentBg}\`\n` +
            `• **Vầng sáng**: \`${currentAura}\`\n` +
            `• **Trang phục**: \`${currentSkin}\`\n\n` +
            `Chọn tab bên dưới để thay đổi trang bị.`
          )
          .setTimestamp();

        const rows = [];

        // Tab buttons
        const rowTabs = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('fashion_tab_bg')
            .setLabel('🖼️ Nền Ảnh')
            .setStyle(currentSheet === 'background' ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('fashion_tab_aura')
            .setLabel('✨ Vầng Sáng')
            .setStyle(currentSheet === 'aura' ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('fashion_tab_skin')
            .setLabel('👕 Trang Phục')
            .setStyle(currentSheet === 'skin' ? ButtonStyle.Success : ButtonStyle.Secondary)
        );
        rows.push(rowTabs);

        // Select menu for owned skins in the active tab
        if (ownedSkins.length > 0) {
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('fashion_item_select')
            .setPlaceholder(`🔽 Chọn ${currentSheet === 'background' ? 'nền ảnh' : currentSheet === 'aura' ? 'vầng sáng' : 'trang phục'}...`);

          selectMenu.addOptions(
            ownedSkins.slice(0, 25).map(sk => ({
              label: sk.ten.slice(0, 100),
              value: sk.id,
              description: sk.moTa ? sk.moTa.slice(0, 100) : undefined,
              default: sk.id === selectedCustomizerSkinId
            }))
          );
          rows.push(new ActionRowBuilder().addComponents(selectMenu));
        } else {
          embedCustom.addFields({
            name: '⚠️ Trống Không',
            value: `Đạo hữu chưa sở hữu bất kỳ ${currentSheet === 'background' ? 'nền ảnh' : currentSheet === 'aura' ? 'vầng sáng' : 'trang phục'} nào thuộc danh mục này.`
          });
        }

        // Action buttons
        const isEquipped = selectedCustomizerSkinId && (
          tuSi.equippedBackground === selectedCustomizerSkinId ||
          tuSi.equippedAura === selectedCustomizerSkinId ||
          tuSi.equippedSkin === selectedCustomizerSkinId
        );

        const rowActions = new ActionRowBuilder();

        if (selectedCustomizerSkinId) {
          rowActions.addComponents(
            new ButtonBuilder()
              .setCustomId('fashion_action_equip')
              .setLabel(isEquipped ? '🏷️ Đang Trang Bị' : '🔧 Trang Bị')
              .setStyle(ButtonStyle.Success)
              .setDisabled(isEquipped),
            new ButtonBuilder()
              .setCustomId('fashion_action_unequip')
              .setLabel('🔓 Tháo')
              .setStyle(ButtonStyle.Danger)
              .setDisabled(currentSheet === 'skin') // Skin is mandatory: can only unequip bg and aura
          );
        }

        rowActions.addComponents(
          new ButtonBuilder()
            .setCustomId('fashion_action_back')
            .setLabel('↩️ Trở Về Hồ Sơ')
            .setStyle(ButtonStyle.Secondary)
        );

        rows.push(rowActions);

        // If a skin is selected, show details
        let detailEmbed = null;
        if (selectedCustomizerSkinId) {
          const detail = ownedSkins.find(s => s.id === selectedCustomizerSkinId);
          if (detail) {
            detailEmbed = new EmbedBuilder()
              .setTitle(`🔍 Xem Chi Tiết: ${detail.ten}`)
              .setColor(color)
              .setDescription(`*${detail.moTa || 'Không có mô tả.'}*`);
          }
        }

        const embeds = [embedCustom];
        if (detailEmbed) embeds.unshift(detailEmbed);

        return {
          embeds,
          components: rows,
          files: [] // Clear any attached file for hoSo image when customizing
        };
      };

      collector.on('collect', async i => {
        await i.deferUpdate();

        if (i.customId === 'nv_fashion_open') {
          selectedCustomizerSkinId = null;
          await i.editReply(await buildFashionPayload());
          return;
        }

        if (i.customId === 'fashion_tab_bg') {
          currentSheet = 'background';
          selectedCustomizerSkinId = null;
          await i.editReply(await buildFashionPayload());
          return;
        }

        if (i.customId === 'fashion_tab_aura') {
          currentSheet = 'aura';
          selectedCustomizerSkinId = null;
          await i.editReply(await buildFashionPayload());
          return;
        }

        if (i.customId === 'fashion_tab_skin') {
          currentSheet = 'skin';
          selectedCustomizerSkinId = null;
          await i.editReply(await buildFashionPayload());
          return;
        }

        if (i.customId === 'fashion_item_select') {
          selectedCustomizerSkinId = i.values[0];
          await i.editReply(await buildFashionPayload());
          return;
        }

        if (i.customId === 'fashion_action_back') {
          collector.stop('back_to_profile');
          return;
        }

        if (i.customId === 'fashion_action_equip') {
          if (!selectedCustomizerSkinId) return;

          // Perform equip
          if (currentSheet === 'background') {
            tuSi.equippedBackground = selectedCustomizerSkinId;
          } else if (currentSheet === 'aura') {
            tuSi.equippedAura = selectedCustomizerSkinId;
          } else if (currentSheet === 'skin') {
            tuSi.equippedSkin = selectedCustomizerSkinId;
          }
          await tuSi.save();

          await i.followUp({
            embeds: [BoTaoEmbed.thanhCong('🔧 Trang Bị Thành Công', `Đã trang bị thành công món thời trang này cho nhân vật.`)],
            ephemeral: true
          });

          await i.editReply(await buildFashionPayload());
          return;
        }

        if (i.customId === 'fashion_action_unequip') {
          if (!selectedCustomizerSkinId) return;

          // Perform unequip
          if (currentSheet === 'background') {
            if (tuSi.equippedBackground === selectedCustomizerSkinId) {
              tuSi.equippedBackground = null;
            }
          } else if (currentSheet === 'aura') {
            if (tuSi.equippedAura === selectedCustomizerSkinId) {
              tuSi.equippedAura = null;
            }
          } else if (currentSheet === 'skin') {
            // Cannot unequip outfit (skin)
            return;
          }
          await tuSi.save();

          await i.followUp({
            embeds: [BoTaoEmbed.thanhCong('🔓 Tháo Thành Công', `Đã tháo trang bị thời trang này khỏi nhân vật.`)],
            ephemeral: true
          });

          selectedCustomizerSkinId = null;
          await i.editReply(await buildFashionPayload());
        }
      });

      collector.on('end', async (_, reason) => {
        if (reason === 'back_to_profile') {
          // Restart command execution to render profile with new skins and new attachment
          await interaction.followUp({
            content: '🔄 Đang cập nhật lại hồ sơ tiên hữu...',
            ephemeral: true
          });

          // Call command execute again to show profile with updated skin
          await this.lenhHoSo.execute(interaction);
        } else {
          // Disable components
          try {
            if (reason !== 'closed') {
              await interaction.editReply({ components: [] });
            }
          } catch (_) {}
        }
      });
    }
  };

  // Lệnh /canhu: Xem căn cơ tu luyện
  lenhCanCo = {
    data: new SlashCommandBuilder()
      .setName('canhu')
      .setDescription('Xem căn cơ, linh căn và hệ số tu luyện'),
    execute: async (interaction) => {
      await interaction.deferReply();
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      let daoNien = null;
      if (interaction.guildId) {
        const guildConfig = await this.layHoacTaoCauHinhGuild(interaction.guildId);
        if (guildConfig) {
          daoNien = guildConfig.layDaoNienHienTai();
        }
      }

      const { Abode } = await import('../models/Abode.js');
      const abode = await Abode.findByPk(tuSi.idNguoiDung);
      const lvDongPhu = abode ? abode.level : 0;

      const embed = BoTaoEmbed.canCo(tuSi, daoNien, lvDongPhu);
      await interaction.editReply({ embeds: [embed] });
    }
  };

  // Logic thực thi nhập code
  async _thucHienNhapCode(tuSi, codeInput) {
    const { GiftCode } = await import('../models/GiftCode.js');
    const { PlayerGiftCode } = await import('../models/PlayerGiftCode.js');
    const { Inventory } = await import('../models/Inventory.js');
    const { Item } = await import('../models/Item.js');
    const { sequelize } = await import('../database.js');

    // Tìm kiếm gift code không phân biệt hoa thường
    const giftCode = await GiftCode.findOne({
      where: sequelize.where(
        sequelize.fn('lower', sequelize.col('code')),
        codeInput.toLowerCase()
      )
    });

    if (!giftCode) {
      return { ok: false, msg: "Mã Gift Code không tồn tại hoặc đã hết hạn sử dụng!" };
    }

    // Kiểm tra xem gift code đã hết hạn chưa
    if (giftCode.expiredAt && new Date(giftCode.expiredAt) < new Date()) {
      return { ok: false, msg: "Mã Gift Code này đã hết hạn sử dụng!" };
    }

    // Kiểm tra xem người chơi đã sử dụng mã code này chưa
    const usage = await PlayerGiftCode.findOne({
      where: {
        userId: tuSi.idNguoiDung,
        code: giftCode.code
      }
    });

    if (usage) {
      return { ok: false, msg: "Đạo hữu đã sử dụng mã Gift Code này rồi. Mỗi người chơi chỉ được sử dụng mỗi code 1 lần!" };
    }

    // Trao thưởng
    let rewardDesc = '';
    if (giftCode.linhThach > 0) {
      tuSi.linhThach = (tuSi.linhThach || 0) + giftCode.linhThach;
      rewardDesc += `• **Linh thạch**: \`+${giftCode.linhThach.toLocaleString()}\` 🪙\n`;
    }
    if (giftCode.linhLuc > 0) {
      tuSi.linhLuc = (tuSi.linhLuc || 0) + giftCode.linhLuc;
      rewardDesc += `• **Linh lực**: \`+${giftCode.linhLuc.toLocaleString()}\` ✨\n`;
    }
    if (giftCode.vnd > 0) {
      tuSi.vnd = (tuSi.vnd || 0) + giftCode.vnd;
      rewardDesc += `• **VND**: \`+${giftCode.vnd.toLocaleString()}\` 💸\n`;
    }

    const rewardItems = giftCode.items;
    if (rewardItems && rewardItems.length > 0) {
      rewardDesc += `• **Vật phẩm**: \n`;
      for (const rewardItem of rewardItems) {
        const itemDetail = await Item.findByPk(rewardItem.itemId);
        const itemName = itemDetail ? itemDetail.ten : rewardItem.itemId;
        await Inventory.addVatPham(tuSi.idNguoiDung, rewardItem.itemId, rewardItem.soLuong);
        rewardDesc += `   + **${itemName}** x${rewardItem.soLuong}\n`;
      }
    }

    // Đặc biệt: Code TANTHU tặng thêm 6 Pháp Bảo ngẫu nhiên phù hợp cảnh giới hiện tại
    if (giftCode.code.toUpperCase() === 'TANTHU') {
      const config = await import('../config.js');
      const realmInfo = config.layThongTinCanhGioi(tuSi.capDo);
      const realmObj = config.CANH_GIOI_LIST.find(r => r.name === realmInfo.realmName) || config.CANH_GIOI_LIST[0];
      const minLvl = realmObj.min_level;
      const maxLvl = realmObj.max_level;

      // Tìm các Pháp Bảo có yeuCauCanhGioi nằm trong khoảng cấp độ của cảnh giới hiện tại và <= cấp độ nhân vật
      const { Op } = await import('sequelize');
      let candidatePBs = await Item.findAll({
        where: {
          loai: 'Pháp Bảo',
          yeuCauCanhGioi: {
            [Op.between]: [minLvl, Math.min(maxLvl, tuSi.capDo)]
          }
        }
      });

      // Nếu cảnh giới hiện tại chưa có Pháp Bảo tương ứng, lấy tất cả Pháp Bảo yêu cầu cấp <= nhân vật
      if (candidatePBs.length === 0) {
        candidatePBs = await Item.findAll({
          where: {
            loai: 'Pháp Bảo',
            yeuCauCanhGioi: {
              [Op.lte]: tuSi.capDo
            }
          }
        });
      }

      if (candidatePBs.length > 0) {
        rewardDesc += `• **Quà Pháp Bảo Tân Thủ (${realmInfo.realmName})**: \n`;
        for (let i = 0; i < 6; i++) {
          const drawn = candidatePBs[Math.floor(Math.random() * candidatePBs.length)];
          await Inventory.addVatPham(tuSi.idNguoiDung, drawn.id, 1);
          rewardDesc += `   + **${drawn.ten}** (${drawn.doHiem})\n`;
        }
      }
    }

    // Đặc biệt: Code BOSS cung cấp cho người chơi đồ Truyền Thuyết với 5 dòng đỏ ngẫu nhiên phù hợp phái tu và cảnh giới
    if (giftCode.code.toUpperCase() === 'BOSS') {
      const config = await import('../config.js');
      const realmInfo = config.layThongTinCanhGioi(tuSi.capDo);
      const realmObj = config.CANH_GIOI_LIST.find(r => r.name === realmInfo.realmName) || config.CANH_GIOI_LIST[0];
      const minLvl = realmObj.min_level;
      const maxLvl = realmObj.max_level;

      const { Op } = await import('sequelize');
      const { Inventory } = await import('../models/Inventory.js');
      const { Item } = await import('../models/Item.js');

      // Tìm các vật phẩm trang bị có yeuCauCanhGioi nằm trong cảnh giới của người chơi
      let candidates = await Item.findAll({
        where: {
          loai: {
            [Op.in]: ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo']
          },
          yeuCauCanhGioi: {
            [Op.between]: [minLvl, Math.min(maxLvl, tuSi.capDo)]
          }
        }
      });

      if (candidates.length === 0) {
        candidates = await Item.findAll({
          where: {
            loai: {
              [Op.in]: ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo']
            },
            yeuCauCanhGioi: {
              [Op.lte]: tuSi.capDo
            }
          }
        });
      }

      // Lọc theo phái tu (Thể Tu vs Pháp Tu)
      const huongTu = (tuSi.huongTu || 'Phap Tu').normalize('NFC');
      const isPhysical = huongTu.includes('The Tu') || huongTu.includes('Thể Tu');

      const filteredCandidates = candidates.filter(item => {
        if (item.loai !== 'Vũ khí') return true;
        // Lọc vũ khí dựa trên chỉ số có sẵn
        const statsStr = item.chiSoJson || '{}';
        if (isPhysical) {
          return statsStr.includes('vat_cong');
        } else {
          return statsStr.includes('phap_cong');
        }
      });

      // Nếu bộ lọc quá khắt khe khiến không có vật phẩm nào, sử dụng danh sách gốc
      const finalCandidates = filteredCandidates.length > 0 ? filteredCandidates : candidates;

      if (finalCandidates.length > 0) {
        // Xác định số lượng đồ thần phẩm nhận được dựa trên xác suất:
        // 1% nhận được 4 đồ, 5% nhận được 3 đồ, 10% nhận được 2 đồ, còn lại 1 đồ
        let count = 1;
        const roll = Math.random();
        if (roll <= 0.01) {
          count = 4;
        } else if (roll <= 0.01 + 0.05) {
          count = 3;
        } else if (roll <= 0.01 + 0.05 + 0.10) {
          count = 2;
        }

        rewardDesc += `• **Quà BOSS Truyền Thuyết (${realmInfo.realmName})**: \n`;

        for (let cIdx = 0; cIdx < count; cIdx++) {
          const drawn = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
          
          // Tạo 5 dòng chỉ số đỏ (Truyền Thuyết) ngẫu nhiên
          const loaiNormalized = drawn.loai ? drawn.loai.normalize('NFC') : '';
          const POOLS = {
            ["Vũ khí".normalize('NFC')]: ["vat_cong", "phap_cong", "crit_rate", "crit_dmg", "xuyen_giap"],
            ["Giáp".normalize('NFC')]: ["vat_phong", "phap_phong", "max_mp", "max_hp"],
            ["Ngọc Bội".normalize('NFC')]: ["max_hp", "max_mp", "ne", "lifesteal"],
            ["Cổ Bảo Chủ Động".normalize('NFC')]: ["vat_cong", "phap_cong", "vat_phong", "phap_phong", "max_hp", "max_mp", "ne", "lifesteal"],
            ["Pháp Bảo".normalize('NFC')]: [
              "vat_cong", "phap_cong", "vat_phong", "phap_phong", "max_hp", "max_mp", "ne", "lifesteal",
              "crit_rate_pb", "crit_dmg_pb", "sat_thuong_pb", "phap_thuong_pb", "khien_pb"
            ]
          };

          const pool = [...(POOLS[loaiNormalized] || ["vat_cong", "phap_cong", "vat_phong", "phap_phong", "max_hp", "max_mp", "ne", "lifesteal"])];
          const generalStats = ["max_hp", "max_mp", "ne", "lifesteal", "vat_phong", "phap_phong"];
          for (const g of generalStats) {
            if (pool.length >= 5) break;
            if (!pool.includes(g)) pool.push(g);
          }

          const shuffled = [...pool].sort(() => 0.5 - Math.random());
          const selectedStats = shuffled.slice(0, 5);

          const NAME_MAP = {
            "vat_cong": "Sát thương Vật lý",
            "phap_cong": "Sát thương Pháp thuật",
            "crit_rate": "Tỷ lệ Bạo kích",
            "crit_dmg": "Sát thương Bạo kích",
            "xuyen_giap": "Xuyên giáp hộ thể",
            "vat_phong": "Vật phòng nhục thân",
            "phap_phong": "Pháp phòng khí hải",
            "max_mp": "Chân nguyên linh khí (MP)",
            "max_hp": "Khí huyết cơ bản (HP)",
            "ne": "Né tránh yêu pháp",
            "lifesteal": "Hút máu sinh cơ",
            "crit_rate_pb": "Bạo kích Pháp bảo",
            "crit_dmg_pb": "Bạo thương Pháp bảo",
            "sat_thuong_pb": "Sát thương Pháp bảo",
            "phap_thuong_pb": "Pháp thương Pháp bảo",
            "khien_pb": "Hộ tẫn Hấp thụ Pháp bảo"
          };

          const customLines = [];
          for (const stat of selectedStats) {
            const value = parseFloat((30 + Math.random() * 20).toFixed(1)); // 30% - 50%
            customLines.push({
              thuocTinh: stat,
              ten: NAME_MAP[stat] || stat,
              mau: "do",
              phamChat: "Truyền Thuyết",
              phanTram: value
            });
          }

          const dongChiSoJson = JSON.stringify(customLines);

          await Inventory.create({
            idNguoiDung: tuSi.idNguoiDung,
            itemId: drawn.id,
            soLuong: 1,
            trangBi: false,
            dongChiSoJson: dongChiSoJson
          });

          rewardDesc += `   + **${drawn.ten}** (5 Dòng Truyền Thuyết 🔴)\n`;
        }
      }
    }

    // Lưu trạng thái nhân vật và ghi nhận lịch sử dùng code
    await tuSi.save();
    await PlayerGiftCode.create({
      userId: tuSi.idNguoiDung,
      code: giftCode.code
    });

    return { ok: true, code: giftCode.code, rewardDesc };
  }

  // Lệnh /code: Nhập mã gift code
  lenhNhapCode = {
    data: new SlashCommandBuilder()
      .setName('code')
      .setDescription('Nhập mã Gift Code để nhận quà tặng')
      .addStringOption(option =>
        option.setName('ma')
          .setDescription('Nhập mã Gift Code')
          .setRequired(true)
      ),
    execute: async (interaction) => {
      await interaction.deferReply();
      const codeInput = interaction.options.getString('ma').trim();
      
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      const result = await this._thucHienNhapCode(tuSi, codeInput);
      if (!result.ok) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(result.msg)]
        });
      }

      const embed = BoTaoEmbed.thanhCong(
        "🎁 Nhập Mã Gift Code Thành Công",
        `Đạo hữu **${tuSi.ten}** đã kích hoạt thành công mã quà tặng \`${result.code}\`!\n\n` +
        `**Phần quà nhận được:**\n${result.rewardDesc || '• Không có phần quà nào.'}`
      );

      await interaction.editReply({ embeds: [embed] });
    }
  };
}

const controller = new BoDieuKhienTuSi();
export const danhSachLenhTuSi = [
  controller.lenhNhapThe,
  controller.lenhHoSo,
  controller.lenhCanCo,
  controller.lenhNhapCode
];
export { controller as boDieuKhienTuSi };
