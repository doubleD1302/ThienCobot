import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder,
  EmbedBuilder
} from 'discord.js';
import { Jimp, loadFont, measureText } from 'jimp';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import fs from 'fs';
import { Skin } from '../models/Skin.js';

GlobalFonts.registerFromPath('./fonts/TuTienFont.ttf', 'TuTienFont');
import { Op } from 'sequelize';
import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed, layMauCanhGioi, layKhungPhamChat, renderProgressEmoji } from '../views/BoTaoEmbed.js';
import { GiaoDienTaoNhanVat } from '../views/GiaoDienTaoNhanVat.js';
import * as config from '../config.js';

function removeAccents(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

class BoDieuKhienTuSi extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  async veNhanVatSkin(tuSi) {
    const canvas = new Jimp({ width: 384, height: 576, color: 0x00000000 });

    const scaleToFit = (img, maxWidth, maxHeight) => {
      const originalWidth = img.bitmap.width;
      const originalHeight = img.bitmap.height;
      const widthRatio = maxWidth / originalWidth;
      const heightRatio = maxHeight / originalHeight;
      const scale = Math.min(widthRatio, heightRatio);

      let w = originalWidth;
      let h = originalHeight;
      if (scale < 1 || originalWidth > maxWidth || originalHeight > maxHeight) {
        w = Math.round(originalWidth * scale);
        h = Math.round(originalHeight * scale);
      }
      img.resize({ w, h });
      return { w, h };
    };

    // 1. Draw background
    if (tuSi.equippedBackground) {
      const bgSkin = await Skin.findByPk(tuSi.equippedBackground);
      if (bgSkin) {
        const bgPath = `public/image/skin/background/${bgSkin.fileAnh}`;
        if (fs.existsSync(bgPath)) {
          const bgImg = await Jimp.read(bgPath);
          const { w, h } = scaleToFit(bgImg, 384, 576);
          const x = Math.round((384 - w) / 2);
          const y = Math.round((576 - h) / 2);
          canvas.composite(bgImg, x, y);
        }
      }
    }

    // 2. Draw aura
    if (tuSi.equippedAura) {
      const auraSkin = await Skin.findByPk(tuSi.equippedAura);
      if (auraSkin) {
        const auraPath = `public/image/skin/aura/${auraSkin.fileAnh}`;
        if (fs.existsSync(auraPath)) {
          const auraImg = await Jimp.read(auraPath);
          const { w, h } = scaleToFit(auraImg, 292, 438);
          const targetX = 46;
          const targetY = 44; // Shifted up by 25px from 69
          const x = Math.round(targetX + (292 - w) / 2);
          const y = Math.round(targetY + (438 - h) / 2);
          canvas.composite(auraImg, x, y);
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
          const { w, h } = scaleToFit(skinImg, 230, 304);
          const targetX = 77;
          const targetY = 203;
          const x = Math.round(targetX + (230 - w) / 2);
          const y = Math.round(targetY + (304 - h)); // Bottom-aligned inside target bounding box
          canvas.composite(skinImg, x, y);
        }
      }
    }

    return await canvas.getBuffer('image/png');
  }

  async getEmojiCanvasImage(emojiStr) {
    const match = emojiStr.match(/:(\d+)>/);
    if (!match) return null;
    const id = match[1];
    const cachedPath = `public/image/cache/emojis/${id}.png`;
    
    if (fs.existsSync(cachedPath)) {
      try {
        return await loadImage(cachedPath);
      } catch (e) {
        console.error('Failed to read cached emoji with Canvas:', id, e.message);
      }
    }
    
    try {
      const url = `https://cdn.discordapp.com/emojis/${id}.png`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.mkdirSync('public/image/cache/emojis', { recursive: true });
      fs.writeFileSync(cachedPath, buffer);
      return await loadImage(buffer);
    } catch (e) {
      console.error('Failed to download emoji with Canvas:', id, e.message);
      return null;
    }
  }

  async veAnhProfileMain(tuSi, user, equippedItems, guildName) {
    const isPhysical = tuSi.huongTu === 'The Tu';
    const bgPath = isPhysical 
      ? 'public/image/view/profile/profile_THE_main.png'
      : 'public/image/view/profile/profile_PHAP_main.png';
      
    if (!fs.existsSync(bgPath)) {
      throw new Error(`Profile template not found: ${bgPath}`);
    }

    const background = await loadImage(bgPath);
    const canvas = createCanvas(background.width, background.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(background, 0, 0);

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const drawCenteredText = (text, xStart, xEnd, y, fontSize = 20) => {
      ctx.font = `bold ${fontSize}px "TuTienFont"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const xCenter = xStart + (xEnd - xStart) / 2;
      ctx.fillText(String(text), xCenter, y + 14);
    };

    const drawLeftText = (text, xStart, y, fontSize = 32) => {
      ctx.font = `bold ${fontSize}px "TuTienFont"`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(text), xStart, y + 14);
    };

    // 1. Tên tu sĩ
    const nameX = 430;
    drawLeftText(tuSi.ten, nameX, 95, 32);

    // 2. Chân Nguyên & Khí Huyết
    const stats = await tuSi.layChiSoDayDu();
    drawCenteredText(`${tuSi.mp}/${stats.max_mp}`, 135, 305, 266, 20);
    drawCenteredText(`${tuSi.hp}/${stats.max_hp}`, 325, 495, 266, 20);

    // 3. Avatar
    if (user && typeof user.displayAvatarURL === 'function') {
      try {
        const avatarUrl = user.displayAvatarURL({ forceStatic: true, extension: 'png', size: 256 });
        const avatarImg = await loadImage(avatarUrl);
        ctx.drawImage(avatarImg, 512, 177, 120, 120);
      } catch (e) {
        console.error('Failed to load avatar:', e.message);
      }
    }

    // 4. Linh Căn & Đạo Pháp (5 boxes)
    const boxesY = isPhysical ? 420 : 340;
    const emojiY = isPhysical ? 405 : 325;

    drawCenteredText(tuSi.gioiTinh, 150, 220, boxesY, 20);
    
    const isThienDao = String(tuSi.idNguoiDung) === '541474154130571264';
    if (isThienDao) {
      drawCenteredText('Thien Dao', 275, 345, boxesY, 20);
    }
    
    const pathName = config.HUONG_DI[tuSi.huongTu]?.name || 'Chua ro';
    drawCenteredText(pathName, 400, 470, boxesY, 20);
    
    const lcKey = Object.keys(config.NGUON_LINH_CAN).find(k => config.NGUON_LINH_CAN[k].name === tuSi.linhCan);
    const lcEmojiStr = config.NGUON_LINH_CAN[lcKey]?.emoji;
    if (lcEmojiStr) {
      const lcImg = await this.getEmojiCanvasImage(lcEmojiStr);
      if (lcImg) {
        ctx.drawImage(lcImg, 535, emojiY, 50, 50);
      }
    }
    
    if (tuSi.huyetMach) {
      const hmEmojiStr = config.HUYET_MACH[tuSi.huyetMach]?.emoji;
      if (hmEmojiStr) {
        const hmImg = await this.getEmojiCanvasImage(hmEmojiStr);
        if (hmImg) {
          ctx.drawImage(hmImg, 660, emojiY, 50, 50);
        }
      }
    }

    // 5. Cảnh giới
    const cgY = isPhysical ? 597 : 540;
    drawCenteredText(`${tuSi.canhGioi} Tang ${tuSi.tang} (Cap ${tuSi.capDo})`, 135, 635, cgY, 20);

    // 6. 12 equipment slots
    const slots = [
      { type: 'Vũ khí', col: 0, row: 0 },
      { type: 'Giáp', col: 1, row: 0 },
      { type: 'Ngọc Bội', col: 2, row: 0 },
      { type: 'Cổ Bảo Chủ Động', col: 3, row: 0 },
      { type: 'Pháp Bảo', col: 0, row: 1 },
      { type: 'Pháp Bảo', col: 1, row: 1 },
      { type: 'Pháp Bảo', col: 2, row: 1 },
      { type: 'Pháp Bảo', col: 3, row: 1 },
      { type: 'Pháp Bảo', col: 0, row: 2 },
      { type: 'Pháp Bảo', col: 1, row: 2 },
      { type: 'Pháp Bảo', col: 2, row: 2 },
      { type: 'Pháp Bảo', col: 3, row: 2 }
    ];

    const weapons = equippedItems.filter(x => x.detail.loai === 'Vũ khí');
    const armors = equippedItems.filter(x => x.detail.loai === 'Giáp');
    const ornaments = equippedItems.filter(x => x.detail.loai === 'Ngọc Bội');
    const activeTreasures = equippedItems.filter(x => x.detail.loai === 'Cổ Bảo Chủ Động');
    const dharmaTreasures = equippedItems.filter(x => x.detail.loai === 'Pháp Bảo');

    const findItemForSlot = (slot, index) => {
      if (slot.type === 'Vũ khí') return weapons[0];
      if (slot.type === 'Giáp') return armors[0];
      if (slot.type === 'Ngọc Bội') return ornaments[0];
      if (slot.type === 'Cổ Bảo Chủ Động') return activeTreasures[index - 3];
      if (slot.type === 'Pháp Bảo') return dharmaTreasures[index - 4];
      return null;
    };

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const itemObj = findItemForSlot(slot, i);
      if (itemObj) {
        const { detail } = itemObj;
        const itemImg = await this.getEmojiCanvasImage(detail.emoji);

        const boxX = 135 + slot.col * 130;
        const boxY = 890 + slot.row * 120;

        if (itemImg) {
          ctx.drawImage(itemImg, boxX + 10, boxY + 10, 80, 80);
        }
      }
    }

    // 7. Máy Chủ
    if (guildName) {
      drawCenteredText(guildName, 220, 600, 1300, 20);
    }

    return await canvas.encode('png');
  }

  async veAnhProfileChiso(tuSi, user, chiSo, guildName) {
    const isPhysical = tuSi.huongTu === 'The Tu';
    const bgPath = isPhysical 
      ? 'public/image/view/profile/profile_THE_chiso.png'
      : 'public/image/view/profile/profile_PHAP_chiso.png';
      
    if (!fs.existsSync(bgPath)) {
      throw new Error(`Profile chiso template not found: ${bgPath}`);
    }

    const background = await loadImage(bgPath);
    const canvas = createCanvas(background.width, background.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(background, 0, 0);

    ctx.fillStyle = '#ffffff';

    const drawCenteredText = (text, xStart, xEnd, y, fontSize = 20) => {
      ctx.font = `bold ${fontSize}px "TuTienFont"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const xCenter = xStart + (xEnd - xStart) / 2;
      ctx.fillText(String(text), xCenter, y + 14);
    };

    const drawLeftText = (text, xStart, y, fontSize = 32) => {
      ctx.font = `bold ${fontSize}px "TuTienFont"`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(text), xStart, y + 14);
    };

    const formatStat = (val) => {
      if (val === undefined || val === null) return '0';
      return Number(val).toLocaleString('en-US');
    };

    // 1. Tên tu sĩ
    const nameX = 430;
    drawLeftText(tuSi.ten, nameX, 95, 32);

    // 2. Chân Nguyên & Khí Huyết
    drawCenteredText(`${formatStat(tuSi.mp)}/${formatStat(chiSo.max_mp)}`, 135, 305, 266, 20);
    drawCenteredText(`${formatStat(tuSi.hp)}/${formatStat(chiSo.max_hp)}`, 325, 495, 266, 20);

    // 3. Avatar
    if (user && typeof user.displayAvatarURL === 'function') {
      try {
        const avatarUrl = user.displayAvatarURL({ forceStatic: true, extension: 'png', size: 256 });
        const avatarImg = await loadImage(avatarUrl);
        ctx.drawImage(avatarImg, 512, 177, 120, 120);
      } catch (e) {
        console.error('Failed to load avatar:', e.message);
      }
    }

    // Coords configuration based on direction (unified coordinates as templates are identical in layout)
    const coords = {
      vat_cong_y: 416,
      phap_cong_y: 476,
      ho_giap_y: 654,
      linh_phong_y: 714,
      hut_mau_y: 774,
      speed_y: 990,
      crit_dmg_y: 1054,
      xuyen_giap_y: 1118,
      id_y: 1266,
      guild_y: 1306
    };

    // 4. Basic Attack
    drawCenteredText(formatStat(chiSo.vat_cong), 270, 635, coords.vat_cong_y, 20);
    drawCenteredText(formatStat(chiSo.phap_cong), 270, 635, coords.phap_cong_y, 20);

    // 5. Defense & Recovery
    drawCenteredText(formatStat(chiSo.giap), 270, 365, coords.ho_giap_y, 20);
    drawCenteredText(formatStat(chiSo.vat_phong), 540, 635, coords.ho_giap_y, 20);
    drawCenteredText(formatStat(chiSo.linh_phong), 270, 365, coords.linh_phong_y, 20);
    drawCenteredText(formatStat(chiSo.phap_phong), 540, 635, coords.linh_phong_y, 20);
    drawCenteredText(`${Math.round((chiSo.lifesteal || 0) * 100)}%`, 270, 365, coords.hut_mau_y, 20);

    // 6. Special Stats
    drawCenteredText(formatStat(Math.floor(chiSo.speed || 100)), 270, 365, coords.speed_y, 20);
    drawCenteredText(`${Math.round((chiSo.crit_rate || 0) * 100)}%`, 540, 635, coords.speed_y, 20);
    drawCenteredText(`${Math.round((chiSo.crit_dmg || 0) * 100)}%`, 270, 365, coords.crit_dmg_y, 20);
    drawCenteredText(`${Math.round((chiSo.ne || 0) * 100)}%`, 540, 635, coords.crit_dmg_y, 20);
    drawCenteredText(formatStat(chiSo.xuyen_giap), 270, 365, coords.xuyen_giap_y, 20);

    // 7. Guild Name & ID Code
    drawCenteredText(tuSi.idNguoiDung, 220, 500, coords.id_y, 20);
    if (guildName) {
      drawCenteredText(guildName, 220, 500, coords.guild_y, 20);
    }

    return await canvas.encode('png');
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

      const color = layMauCanhGioi(tuSi.canhGioi);

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

      let tocDoTuLuyenFinal = tocDoTuLuyen;
      if (tuSi.duyenType && tuSi.duyenUserId) {
        const partner = await this.layTuSi(tuSi.duyenUserId);
        if (partner && String(partner.duyenUserId) === String(tuSi.idNguoiDung) && partner.duyenType === tuSi.duyenType) {
          const abodeB = await Abode.findByPk(partner.idNguoiDung);
          const lvDongPhuB = abodeB ? abodeB.level : 0;
          let activePetB = await Pet.findOne({ where: { userId: partner.idNguoiDung, isActive: true } });
          if (activePetB) {
            const checkB = config.checkHuyetMachApChe(partner.capDo, activePetB.rarity);
            if (!checkB.allowed) activePetB = null;
          }
          const cgB = await CanhGioi.findByPk(partner.capDo);
          const tocDoCoBanB = cgB ? cgB.tocDoCoBan : 100;
          const heSoTuLuyenB = partner.layHeSoTuLuyen(activePetB);
          const rawSpeedB = Math.floor(tocDoCoBanB * heSoTuLuyenB * (1 + lvDongPhuB));

          const factor = tuSi.duyenType === 'hon_phu' ? 1.50 : 1.30;
          tocDoTuLuyenFinal = Math.floor(factor * (tocDoTuLuyen + rawSpeedB) / 2);
        }
      }

      const reqExp = cg ? cg.linhLucYeuCau : config.layLinhLucYeuCau(tuSi.capDo);

      let guildName = 'Thiên Cơ';
      if (interaction.guild) {
        guildName = interaction.guild.name;
      }
      
      const mainBuffer = await this.veAnhProfileMain(tuSi, targetUser, equippedItems, guildName);
      const attachment = new AttachmentBuilder(mainBuffer, { name: 'profile_main.png' });
      const embed = BoTaoEmbed.hoSoMain(tuSi, targetUser, daoNien, tocDoTuLuyenFinal, reqExp, equippedItems, 'attachment://profile_main.png');

      const components = [];
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('nv_view_chiso')
          .setLabel('📊 Chỉ Số')
          .setStyle(ButtonStyle.Primary)
      );
      if (targetUser.id === interaction.user.id) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('nv_fashion_open')
            .setLabel('👕 Thời Trang')
            .setStyle(ButtonStyle.Secondary)
        );
      }
      components.push(row);

      const msg = await interaction.editReply({
        embeds: [embed],
        components,
        files: [attachment]
      });

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
        const ownedSkinsAll = await Skin.findAll({
          where: {
            id: { [Op.in]: ownedSkinIds },
            loai: currentSheet
          }
        });

        const playerGender = String(tuSi.gioiTinh || 'Nam').normalize('NFC').toLowerCase().trim();
        const isPlayerNu = playerGender === 'nữ' || playerGender === 'nu' || playerGender === 'female';

        const ownedSkins = ownedSkinsAll.filter(sk => {
          const skinGender = String(sk.gioiTinh || 'Cả hai').normalize('NFC').toLowerCase().trim();
          if (skinGender === 'cả hai' || skinGender === 'ca hai') return true;
          const isSkinNu = skinGender === 'nữ' || skinGender === 'nu' || skinGender === 'female';
          return isPlayerNu === isSkinNu;
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

        if (i.customId === 'nv_view_chiso') {
          const freshTuSi = await this.layTuSi(targetUser.id);
          const equippedInv = await Inventory.findAll({
            where: { idNguoiDung: freshTuSi.idNguoiDung, trangBi: true }
          });
          let activePet = await Pet.findOne({ where: { userId: freshTuSi.idNguoiDung, isActive: true } });
          if (activePet) {
            const check = config.checkHuyetMachApChe(freshTuSi.capDo, activePet.rarity);
            if (!check.allowed) activePet = null;
          }
          const stats = freshTuSi.layChiSo(equippedInv, activePet);

          let guildName = 'Thiên Cơ';
          if (interaction.guild) {
            guildName = interaction.guild.name;
          }

          const chisoBuffer = await this.veAnhProfileChiso(freshTuSi, targetUser, stats, guildName);
          const chisoAttachment = new AttachmentBuilder(chisoBuffer, { name: 'profile_chiso.png' });
          const chisoEmbed = BoTaoEmbed.hoSoChiso(freshTuSi, targetUser, daoNien, 'attachment://profile_chiso.png');

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('nv_view_main')
              .setLabel('📜 Hồ Sơ')
              .setStyle(ButtonStyle.Primary)
          );
          if (targetUser.id === interaction.user.id) {
            row.addComponents(
              new ButtonBuilder()
                .setCustomId('nv_fashion_open')
                .setLabel('👕 Thời Trang')
                .setStyle(ButtonStyle.Secondary)
            );
          }

          await i.editReply({
            embeds: [chisoEmbed],
            components: [row],
            files: [chisoAttachment]
          });
          return;
        }

        if (i.customId === 'nv_view_main') {
          const freshTuSi = await this.layTuSi(targetUser.id);
          const equippedInv = await Inventory.findAll({
            where: { idNguoiDung: freshTuSi.idNguoiDung, trangBi: true }
          });
          const equippedItems = [];
          for (const eq of equippedInv) {
            const detail = await Item.findByPk(eq.itemId);
            if (detail) {
              eq.item = detail;
              equippedItems.push({ eq, detail });
            }
          }
          let activePet = await Pet.findOne({ where: { userId: freshTuSi.idNguoiDung, isActive: true } });
          if (activePet) {
            const check = config.checkHuyetMachApChe(freshTuSi.capDo, activePet.rarity);
            if (!check.allowed) activePet = null;
          }

          const { CanhGioi } = await import('../models/CanhGioi.js');
          const cg = await CanhGioi.findByPk(freshTuSi.capDo);
          const tocDoCoBan = cg ? cg.tocDoCoBan : 100;
          const heSoTuLuyen = freshTuSi.layHeSoTuLuyen(activePet);
          const tocDoTuLuyen = Math.floor(tocDoCoBan * heSoTuLuyen * (1 + lvDongPhu));

          let tocDoTuLuyenFinal = tocDoTuLuyen;
          if (freshTuSi.duyenType && freshTuSi.duyenUserId) {
            const partner = await this.layTuSi(freshTuSi.duyenUserId);
            if (partner && String(partner.duyenUserId) === String(freshTuSi.idNguoiDung) && partner.duyenType === freshTuSi.duyenType) {
              const abodeB = await Abode.findByPk(partner.idNguoiDung);
              const lvDongPhuB = abodeB ? abodeB.level : 0;
              let activePetB = await Pet.findOne({ where: { userId: partner.idNguoiDung, isActive: true } });
              if (activePetB) {
                const checkB = config.checkHuyetMachApChe(partner.capDo, activePetB.rarity);
                if (!checkB.allowed) activePetB = null;
              }
              const cgB = await CanhGioi.findByPk(partner.capDo);
              const tocDoCoBanB = cgB ? cgB.tocDoCoBan : 100;
              const heSoTuLuyenB = partner.layHeSoTuLuyen(activePetB);
              const rawSpeedB = Math.floor(tocDoCoBanB * heSoTuLuyenB * (1 + lvDongPhuB));

              const factor = freshTuSi.duyenType === 'hon_phu' ? 1.50 : 1.30;
              tocDoTuLuyenFinal = Math.floor(factor * (tocDoTuLuyen + rawSpeedB) / 2);
            }
          }

          let guildName = 'Thiên Cơ';
          if (interaction.guild) {
            guildName = interaction.guild.name;
          }

          const mainBuffer = await this.veAnhProfileMain(freshTuSi, targetUser, equippedItems, guildName);
          const mainAttachment = new AttachmentBuilder(mainBuffer, { name: 'profile_main.png' });
          const embed = BoTaoEmbed.hoSoMain(freshTuSi, targetUser, daoNien, tocDoTuLuyenFinal, reqExp, equippedItems, 'attachment://profile_main.png');

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('nv_view_chiso')
              .setLabel('📊 Chỉ Số')
              .setStyle(ButtonStyle.Primary)
          );
          if (targetUser.id === interaction.user.id) {
            row.addComponents(
              new ButtonBuilder()
                .setCustomId('nv_fashion_open')
                .setLabel('👕 Thời Trang')
                .setStyle(ButtonStyle.Secondary)
            );
          }

          await i.editReply({
            embeds: [embed],
            components: [row],
            files: [mainAttachment]
          });
          return;
        }

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
          const freshTuSi = await this.layTuSi(targetUser.id);
          const equippedInv = await Inventory.findAll({
            where: { idNguoiDung: freshTuSi.idNguoiDung, trangBi: true }
          });
          const equippedItems = [];
          for (const eq of equippedInv) {
            const detail = await Item.findByPk(eq.itemId);
            if (detail) {
              eq.item = detail;
              equippedItems.push({ eq, detail });
            }
          }
          let activePet = await Pet.findOne({ where: { userId: freshTuSi.idNguoiDung, isActive: true } });
          if (activePet) {
            const check = config.checkHuyetMachApChe(freshTuSi.capDo, activePet.rarity);
            if (!check.allowed) activePet = null;
          }

          const { CanhGioi } = await import('../models/CanhGioi.js');
          const cg = await CanhGioi.findByPk(freshTuSi.capDo);
          const tocDoCoBan = cg ? cg.tocDoCoBan : 100;
          const heSoTuLuyen = freshTuSi.layHeSoTuLuyen(activePet);
          const tocDoTuLuyen = Math.floor(tocDoCoBan * heSoTuLuyen * (1 + lvDongPhu));

          let tocDoTuLuyenFinal = tocDoTuLuyen;
          if (freshTuSi.duyenType && freshTuSi.duyenUserId) {
            const partner = await this.layTuSi(freshTuSi.duyenUserId);
            if (partner && String(partner.duyenUserId) === String(freshTuSi.idNguoiDung) && partner.duyenType === freshTuSi.duyenType) {
              const abodeB = await Abode.findByPk(partner.idNguoiDung);
              const lvDongPhuB = abodeB ? abodeB.level : 0;
              let activePetB = await Pet.findOne({ where: { userId: partner.idNguoiDung, isActive: true } });
              if (activePetB) {
                const checkB = config.checkHuyetMachApChe(partner.capDo, activePetB.rarity);
                if (!checkB.allowed) activePetB = null;
              }
              const cgB = await CanhGioi.findByPk(partner.capDo);
              const tocDoCoBanB = cgB ? cgB.tocDoCoBan : 100;
              const heSoTuLuyenB = partner.layHeSoTuLuyen(activePetB);
              const rawSpeedB = Math.floor(tocDoCoBanB * heSoTuLuyenB * (1 + lvDongPhuB));

              const factor = freshTuSi.duyenType === 'hon_phu' ? 1.50 : 1.30;
              tocDoTuLuyenFinal = Math.floor(factor * (tocDoTuLuyen + rawSpeedB) / 2);
            }
          }

          let guildName = 'Thiên Cơ';
          if (interaction.guild) {
            guildName = interaction.guild.name;
          }

          const mainBuffer = await this.veAnhProfileMain(freshTuSi, targetUser, equippedItems, guildName);
          const mainAttachment = new AttachmentBuilder(mainBuffer, { name: 'profile_main.png' });
          const embed = BoTaoEmbed.hoSoMain(freshTuSi, targetUser, daoNien, tocDoTuLuyenFinal, reqExp, equippedItems, 'attachment://profile_main.png');

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('nv_view_chiso')
              .setLabel('📊 Chỉ Số')
              .setStyle(ButtonStyle.Primary)
          );
          if (targetUser.id === interaction.user.id) {
            row.addComponents(
              new ButtonBuilder()
                .setCustomId('nv_fashion_open')
                .setLabel('👕 Thời Trang')
                .setStyle(ButtonStyle.Secondary)
            );
          }

          await i.editReply({
            embeds: [embed],
            components: [row],
            files: [mainAttachment]
          });
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
        try {
          if (reason !== 'closed') {
            await interaction.editReply({ components: [] });
          }
        } catch (_) {}
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

    if (usage && giftCode.code.toUpperCase() !== 'ISEKAI') {
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
      candidatePBs = candidatePBs.filter(x => config.checkTrangBiPhuHopHuongTu(x, tuSi.huongTu));

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
        candidatePBs = candidatePBs.filter(x => config.checkTrangBiPhuHopHuongTu(x, tuSi.huongTu));
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
      candidates = candidates.filter(x => config.checkTrangBiPhuHopHuongTu(x, tuSi.huongTu));

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
        candidates = candidates.filter(x => config.checkTrangBiPhuHopHuongTu(x, tuSi.huongTu));
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
            ["Ngọc Bội".normalize('NFC')]: ["max_hp", "max_mp", "ne", "lifesteal", "speed"],
            ["Cổ Bảo Chủ Động".normalize('NFC')]: ["vat_cong", "phap_cong", "vat_phong", "phap_phong", "max_hp", "max_mp", "ne", "lifesteal", "speed"],
            ["Pháp Bảo".normalize('NFC')]: [
              "vat_cong", "phap_cong", "vat_phong", "phap_phong", "max_hp", "max_mp", "ne", "lifesteal",
              "crit_rate_pb", "crit_dmg_pb", "sat_thuong_pb", "phap_thuong_pb", "khien_pb", "speed"
            ]
          };

          const pool = [...(POOLS[loaiNormalized] || ["vat_cong", "phap_cong", "vat_phong", "phap_phong", "max_hp", "max_mp", "ne", "lifesteal", "speed"])];
          const generalStats = ["max_hp", "max_mp", "ne", "lifesteal", "vat_phong", "phap_phong", "speed"];
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
            "khien_pb": "Hộ tẫn Hấp thụ Pháp bảo",
            "speed": "Tốc độ"
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
    if (giftCode.code.toUpperCase() !== 'ISEKAI') {
      await PlayerGiftCode.create({
        userId: tuSi.idNguoiDung,
        code: giftCode.code
      });
    }

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
