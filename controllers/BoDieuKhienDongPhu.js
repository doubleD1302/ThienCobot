import fs from 'fs';
import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder
} from 'discord.js';

import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed, layMauCanhGioi } from '../views/BoTaoEmbed.js';
import { Abode } from '../models/Abode.js';
import { GardenPlot } from '../models/GardenPlot.js';
import { Pet } from '../models/Pet.js';
import { Inventory } from '../models/Inventory.js';
import { Item } from '../models/Item.js';
import * as config from '../config.js';

// ── Hằng Số Cấu Hình ───────────────────────────────────────────────────────
const ABODE_UPGRADE_BASE_COST = 10000; // Cấp 1 tốn 10k, x10 mỗi cấp tiếp theo
const MAX_ABODE_LEVEL = 10;
const MAX_GARDEN_PLOTS = 26;
const WATERING_COST_BASE = 50000; // Lần tưới có phí đầu tiên tốn 50k, x10 mỗi lần sau

const getPetRarityText = (rarity) => config.PET_QUALITY_LABELS[rarity] || rarity;

function canBeFodder(mainPet, fodder) {
  if (!mainPet || !fodder) return false;
  if (fodder.id === mainPet.id) return false;
  if (fodder.isActive) return false;

  const mainTemplate = config.PET_TEMPLATES[mainPet.type];
  const fodderTemplate = config.PET_TEMPLATES[fodder.type];
  if (!mainTemplate || !fodderTemplate) return false;

  // Must be same group (linh_thu vs than_thu)
  if (mainTemplate.group !== fodderTemplate.group) return false;

  // Check quality index
  const mainQ = config.getPetQualityIndex(mainPet.rarity);
  const fodderQ = config.getPetQualityIndex(fodder.rarity);

  return fodderQ >= mainQ;
}

// Phẩm chất màu sắc
const QUALITY_EMOJIS = {
  'trang': '⚪ Phế phẩm',
  'luc': '🟢 Phàm phẩm',
  'lam': '🔵 Ưu phẩm',
  'tim': '🟣 Siêu phẩm',
  'vang': '🟡 Tuyệt phẩm',
  'do': '🔴 Tiên phẩm'
};

// Tỉ lệ luyện chế theo phẩm chất nguyên liệu (phải khớp với config.js rollForgedQuality)
const FORGE_RATE_TABLE = {
  'Phế Phẩm': { fail: 50, thuong: 30, hiem: 20, suThi: 0, thanThoai: 0 },
  'Thường': { fail: 10, thuong: 50, hiem: 40, suThi: 0, thanThoai: 0 },
  'Hiếm': { fail: 0, thuong: 40, hiem: 55, suThi: 5, thanThoai: 0 },
  'Sử Thi': { fail: 0, thuong: 30, hiem: 55, suThi: 10, thanThoai: 5 },
  'Thần Thoại': { fail: 0, thuong: 0, hiem: 55, suThi: 35, thanThoai: 10 }
};

function getForgeRateText(matQuality) {
  const r = FORGE_RATE_TABLE[matQuality];
  if (!r) return '*Không rõ phẩm chất nguyên liệu.*';
  const lines = [];
  if (r.fail > 0) lines.push(`• 💥 Thất bại: \`${r.fail}%\``);
  if (r.thuong > 0) lines.push(`• 🟢 Thường: \`${r.thuong}%\``);
  if (r.hiem > 0) lines.push(`• 🔵 Hiếm: \`${r.hiem}%\``);
  if (r.suThi > 0) lines.push(`• 🟣 Sử Thi: \`${r.suThi}%\``);
  if (r.thanThoai > 0) lines.push(`• 🟠 Thần Thoại: \`${r.thanThoai}%\``);
  if (r.fail === 0) lines.unshift(`• 💥 Thất bại: \`0%\` ✅`);
  return lines.join('\n');
}

class BoDieuKhienDongPhu extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhDongPhu = {
    data: new SlashCommandBuilder()
      .setName('dongphu')
      .setDescription('Mở động phủ tu chân của ngươi để trồng trọt, luyện đan, rèn khí và nuôi sủng vật'),

    execute: async (interaction) => {
      await this._thucHienDongPhu(interaction, ['MAIN']);
    }
  };

  lenhPet = {
    data: new SlashCommandBuilder()
      .setName('pet')
      .setDescription('Quản lý, chăm sóc và tiến hóa sủng vật của ngươi'),

    execute: async (interaction) => {
      await this._thucHienDongPhu(interaction, ['PETS']);
    }
  };

  async _thucHienDongPhu(interaction, initialStack = ['MAIN']) {
    await interaction.deferReply();

    const tuSi = await this.layTuSi(interaction.user.id);
    if (!tuSi) {
      return await interaction.editReply({
        embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
      });
    }

    // ── Khởi tạo Động phủ trong database nếu chưa có ──────────────────────────
    let [abode, created] = await Abode.findOrCreate({
      where: { userId: tuSi.idNguoiDung },
      defaults: { level: 0, gardenLevel: 1, waterCount: 0 }
    });

    // Trạng thái UI
    let menuStack = [...initialStack]; // Stack màn hình tuỳ chỉnh để back/quay lại
    let selectedSlotIndex = null; // Ô đất đang chọn
    let selectedPetId = null;     // Sủng vật đang chọn để thao tác
    let selectedFusePetId = null; // Sủng vật nguyên liệu được chọn để dung hợp
    let selectedFodderIds = [];   // Phôi sủng vật được chọn để tiến hóa
    let foodPage = 0;             // Trang phân trang menu thức ăn sủng vật
    let petPage = 0;              // Trang phân trang danh sách sủng vật
    let fusionPage = 0;           // Trang phân trang sủng vật dung hợp
    let gardenPage = 0;           // Trang phân trang ô đất dược viên
    let seedPage = 0;             // Trang phân trang hạt giống
    let herbPage = 0;             // Trang phân trang linh thảo luyện đan
    let pillPage = 0;             // Trang phân trang đan dược tiêu thụ
    let actionMessage = null;     // Lưu thông báo kết quả hành động
    let releaseFilterSpecies = 'all';
    let releaseFilterBloodline = 'all';
    let selectedEggId = null;         // Loại trứng đang chọn để ấp nhanh

    // Kiểm tra reset ngày tưới nước/ăn đan dược
    const todayStr = new Date().toISOString().split('T')[0];
    if (abode.lastWatered !== todayStr) {
      abode.waterCount = 0;
      abode.lastWatered = todayStr;
      await abode.save();
    }
    if (abode.lastPill !== todayStr) {
      abode.pillCount = 0;
      abode.lastPill = todayStr;
      await abode.save();
    }

    // ── HELPER GENERATE EMBED & ROW COMPONENTS ─────────────────────────────

    const getCurrentMenu = () => menuStack[menuStack.length - 1];

    const buildEmbeds = async () => {
      const embeds = [];
      const color = layMauCanhGioi(tuSi.canhGioi);
      const menu = getCurrentMenu();

      // ══════════════════════════════════════════════════════════════
      // 1. MÀN HÌNH CHÍNH (MAIN)
      // ══════════════════════════════════════════════════════════════
      if (menu === 'MAIN') {
        if (abode.level === 0) {
          const mainEmbed = new EmbedBuilder()
            .setTitle('🌋 Khai Sơn Lập Phủ')
            .setColor(color)
            .setDescription(
              `Đạo hữu **${tuSi.ten}** hiện tại vẫn chưa xây dựng Động Phủ tu tiên riêng.\n\n` +
              `⚡ **Yêu cầu khai hoang**: \`10,000\` Linh Thạch.\n` +
              `✨ **Lợi ích Động Phủ Cấp 1**: Mở khoá Dược Viên (2 ô đất trồng trọt) và tăng **+100% tốc độ tu luyện** nền.`
            )
            .setTimestamp();
          embeds.push(mainEmbed);
        } else {
          const activePet = await Pet.findOne({ where: { userId: tuSi.idNguoiDung, isActive: true } });
          const petText = activePet ? `${config.PET_TEMPLATES[activePet.type]?.name} (Cấp ${activePet.level})` : '*Chưa xuất chiến*';
          const cost = ABODE_UPGRADE_BASE_COST * Math.pow(10, abode.level);

          const mainEmbed = new EmbedBuilder()
            .setTitle(`🏰 Động Phủ Tu Tiên: ${tuSi.ten}`)
            .setColor(color)
            .setDescription(
              `> ⚡ **Cấp Động phủ**: \`Cấp ${abode.level} / 10\`\n` +
              `> 🚀 **Tốc độ tu luyện**: \`+${abode.level * 100}%\` (x${abode.level + 1} tốc độ gốc)\n` +
              `> 🐯 **Thần thú hộ thể**: ${petText}\n` +
              `> 🪙 **Linh thạch hiện có**: \`${tuSi.linhThach.toLocaleString()}\` 🪙\n\n` +
              `Chào mừng đạo hữu trở về động phủ tĩnh tọa tu luyện. Hãy lựa chọn khu vực hoạt động bên dưới.`
            )
            .setTimestamp();

          if (abode.level < MAX_ABODE_LEVEL) {
            mainEmbed.addFields({
              name: '⚡ Nâng cấp Động Phủ',
              value: `• Chi phí nâng lên cấp \`${abode.level + 1}\`: \`${cost.toLocaleString()}\` Linh Thạch.`
            });
          } else {
            mainEmbed.addFields({ name: '⚡ Nâng cấp Động Phủ', value: '🟢 Đã đạt cấp độ tối đa (Cấp 10).' });
          }
          embeds.push(mainEmbed);
        }
      }

      // ══════════════════════════════════════════════════════════════
      // 2. DƯỢC VIÊN (GARDEN)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'GARDEN') {
        // Động phủ cấp 1 mở 2 ô đất mặc định
        const plots = await GardenPlot.findAll({ where: { userId: tuSi.idNguoiDung } });
        const countPlots = plots.length;

        // Chi phí mở ô tiếp theo
        const slotCost = 10000 * Math.pow(10, countPlots - 2);

        const descLines = [];
        for (let i = 0; i < countPlots; i++) {
          const plot = plots.find(p => p.slotIndex === i);
          if (!plot || plot.status === 'EMPTY') {
            descLines.push(`**Ô ${i + 1}:** 🟫 [Đất Trống]`);
          } else {
            const ageResult = getPlotAgeAndHerb(plot);
            const statusSymbol = ageResult.ready ? '🟢' : '⏳';
            descLines.push(
              `**Ô ${i + 1}:** ${statusSymbol} [Đang trồng: ${ageResult.seedName}]\n` +
              `   *Tuổi cây:* \`${ageResult.age.toFixed(1)} Đạo Niên\` ➔ Thu hoạch: **${ageResult.herbName}**`
            );
          }
        }

        // Hiển thị tối đa 26 ô
        if (countPlots < MAX_GARDEN_PLOTS) {
          descLines.push(`**Ô ${countPlots + 1}:** 🔒 *Chưa khai khẩn* (Phí mở khoá: \`${slotCost.toLocaleString()}\` 🪙)`);
        }

        // Tưới nước
        const waterCount = abode.waterCount || 0;
        const waterCost = WATERING_COST_BASE * Math.pow(10, waterCount - 3);
        const waterText = waterCount < 3
          ? `Miễn phí (Đã dùng \`${waterCount}/3\` lần)`
          : `Tốn \`${waterCost.toLocaleString()}\` 🪙 (Đã dùng \`${waterCount}\` lần)`;

        let quickSeedText = '_Chưa cài đặt_';
        if (abode.quickSeedId) {
          const sItem = config.ITEMS.find(e => e.id === abode.quickSeedId);
          if (sItem) {
            const quickSeedInv = myInventory.find(e => e.item.id === abode.quickSeedId);
            const quickSeedQty = quickSeedInv ? quickSeedInv.soLuong : 0;
            quickSeedText = `**${sItem.ten}** (Có: \`${quickSeedQty}\` hạt)`;
          }
        }

        const embed = new EmbedBuilder()
          .setTitle(`🌱 Linh Dược Viên: ${tuSi.ten}`)
          .setColor(0x2ecc71)
          .setDescription(
            `> 🧑‍🌾 **Số ô đất**: \`${countPlots} / 26\`\n` +
            `> 💦 **Tưới nước hôm nay**: ${waterText}\n` +
            `> ⚙️ **Hạt giống trồng nhanh**: ${quickSeedText}\n` +
            `*(Mỗi lần tưới nước giúp rút ngắn thời gian sinh trưởng của toàn bộ cây đi 20 Đạo Niên)*\n\n` +
            `${'─'.repeat(38)}\n` +
            descLines.join('\n\n')
          );
        embeds.push(embed);
      }

      // ══════════════════════════════════════════════════════════════
      // 3. CHI TIẾT Ô ĐẤT (GARDEN_SLOT)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'GARDEN_SLOT') {
        const plot = await GardenPlot.findOne({ where: { userId: tuSi.idNguoiDung, slotIndex: selectedSlotIndex } });
        const ageResult = getPlotAgeAndHerb(plot);

        const embed = new EmbedBuilder()
          .setTitle(`🌱 Chi Tiết Ô Đất Số ${selectedSlotIndex + 1}`)
          .setColor(0x2ecc71)
          .setDescription(
            `• **Trạng thái**: \`${plot.status === 'EMPTY' ? 'Đất Trống' : 'Đang Trồng'}\`\n` +
            `• **Vật phẩm gieo**: ${ageResult.seedName || '_Không có_'}\n` +
            `• **Thời gian sinh trưởng**: \`${ageResult.age.toFixed(1)} Đạo Niên\`\n` +
            `• **Phẩm chất thu hoạch dự kiến**: **${ageResult.herbName || '_Không có_'}**\n\n` +
            `*Lưu ý: Thời gian sinh trưởng càng lâu thì cây linh thảo thu về càng nhiều năm tuổi, phẩm chất đan dược chế tạo ra càng cao!*`
          );
        embeds.push(embed);
      }

      // ══════════════════════════════════════════════════════════════
      // 3.1 CÀI ĐẶT TRỒNG NHANH (GARDEN_CONFIG_QUICK)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'GARDEN_CONFIG_QUICK') {
        let currentSeedText = '_Chưa cài đặt_';
        if (abode.quickSeedId) {
          const sItem = config.ITEMS.find(e => e.id === abode.quickSeedId);
          if (sItem) {
            currentSeedText = `**${sItem.ten}**`;
          }
        }

        const embed = new EmbedBuilder()
          .setTitle('⚙️ Cài Đặt Trồng Nhanh')
          .setColor(0x2ecc71)
          .setDescription(
            `• **Hạt giống trồng nhanh hiện tại**: ${currentSeedText}\n\n` +
            `Vui lòng chọn loại hạt giống dưới đây để làm hạt giống mặc định khi nhấn nút **Trồng Nhanh**.`
          );
        embeds.push(embed);
      }

      // ══════════════════════════════════════════════════════════════
      // 4. LUYỆN ĐAN (ALCHEMY)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'ALCHEMY') {
        const limitUsed = abode.pillCount || 0;
        const dailyLimit = config.layGioiHanDanDaily(tuSi.capDo, abode.level);
        const embed = new EmbedBuilder()
          .setTitle(`🔮 Lò Luyện Đan Dược: ${tuSi.ten}`)
          .setColor(0x9b59b6)
          .setDescription(
            `> 💊 **Giới hạn ăn đan dược hôm nay**: \`${limitUsed} / ${dailyLimit}\` viên\n\n` +
            `Chọn một loại linh thảo thu hoạch từ dược viên bên dưới làm nguyên liệu để tiến hành luyện đan.\n` +
            `• **Luyện đan tu vi**: Tăng trực tiếp một lượng tu vi lớn khi ăn vào. Phẩm chất linh thảo càng cao thì tỉ lệ đan dược ra phẩm Siêu/Tuyệt/Tiên càng lớn!`
          );
        embeds.push(embed);
      }

      // ══════════════════════════════════════════════════════════════
      // 5. LUYỆN KHÍ (FORGE)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'FORGE') {
        // Đọc nguyên liệu tốt nhất người chơi đang có để hiển thị tỉ lệ
        const qualityOrder = { 'Thần Thoại': 5, 'Sử Thi': 4, 'Hiếm': 3, 'Thường': 2, 'Phế Phẩm': 1 };
        let bestMatQuality = null;
        try {
          // Bước 1: lấy danh sách itemId thuộc loại Nguyên liệu
          const matItems = await Item.findAll({ where: { loai: 'Nguyên liệu' } });
          const matItemIds = matItems.map(it => it.id);
          if (matItemIds.length > 0) {
            // Bước 2: tìm trong balo người chơi
            const { Op } = await import('sequelize');
            const allMats = await Inventory.findAll({
              where: { idNguoiDung: tuSi.idNguoiDung, itemId: { [Op.in]: matItemIds } }
            });
            for (const m of allMats) {
              if (!m.dongChiSoJson) continue;
              let q = null;
              try { q = JSON.parse(m.dongChiSoJson).phamChat || null; } catch (e) { }
              if (q && (bestMatQuality === null || (qualityOrder[q] || 0) > (qualityOrder[bestMatQuality] || 0))) {
                bestMatQuality = q;
              }
            }
          }
        } catch (e) { }

        const rateEmoji = { 'Phế Phẩm': '⚪', 'Thường': '🟢', 'Hiếm': '🔵', 'Sử Thi': '🟣', 'Thần Thoại': '🟠' };
        let rateSection = '';
        if (bestMatQuality) {
          rateSection = `\n\n📊 **Tỉ Lệ Luyện Chế** *(nguyên liệu tốt nhất: ${rateEmoji[bestMatQuality] || ''} ${bestMatQuality})*:\n${getForgeRateText(bestMatQuality)}`;
        } else {
          rateSection = `\n\n📊 **Tỉ Lệ Luyện Chế**: *Đạo hữu chưa có nguyên liệu nào trong balo.*`;
        }

        const embed = new EmbedBuilder()
          .setTitle(`🔨 Rèn Đúc Linh Khí: ${tuSi.ten}`)
          .setColor(0x34495e)
          .setDescription(
            `Dùng trang bị cũ trong balo kết hợp với linh thảo từ dược viên làm chất xúc tác để đúc tiên binh phẩm chất cao.\n` +
            `• **Quy luật đúc khí**: Phẩm chất trang bị luyện ra phụ thuộc vào **phẩm chất nguyên liệu** bỏ vào.\n` +
            `• Sử dụng nguyên liệu phẩm chất cao hơn để tăng cơ hội nhận trang bị chất lượng cao.${rateSection}\n\n` +
            `*Chọn một công thức đúc khí từ danh sách bên dưới.*`
          );
        embeds.push(embed);
      }


      // ══════════════════════════════════════════════════════════════
      // 6. SỦNG VẬT (PETS)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'PETS') {
        const myPets = await Pet.findAll({ where: { userId: tuSi.idNguoiDung } });
        const PET_PAGE_SIZE = 10;
        const totalPetPages = myPets.length > 0 ? Math.ceil(myPets.length / PET_PAGE_SIZE) : 1;
        if (petPage >= totalPetPages) petPage = Math.max(0, totalPetPages - 1);
        const petsThisPage = myPets.slice(petPage * PET_PAGE_SIZE, (petPage + 1) * PET_PAGE_SIZE);

        const desc = petsThisPage.map((p, idx) => {
          const activeTag = p.isActive ? ' 🟢 **[Xuất Chiến]**' : '';
          const rarityTag = ` · ${getPetRarityText(p.rarity)}`;
          const template = config.PET_TEMPLATES[p.type];
          const speciesName = template ? template.name : p.type;
          const effectDesc = template ? template.desc : '';
          const globalIdx = petPage * PET_PAGE_SIZE + idx;
          return `**${globalIdx + 1}.** **${p.name}**${rarityTag}${activeTag}\n` +
            `   *Loài:* ${speciesName} · *Cấp:* \`${p.level}\` · *Tư chất:* \`${p.tuChat} / 250\`\n` +
            `   *Hiệu ứng:* ${effectDesc}`;
        }).join('\n\n') || '_Đạo hữu chưa nuôi dưỡng sủng vật nào. Hãy khám phá bí cảnh để tìm kiếm trứng linh thú!_';

        const embed = new EmbedBuilder()
          .setTitle(`🐅 Thú Xá Sủng Vật: ${tuSi.ten}`)
          .setColor(0xe67e22)
          .setDescription(desc)
          .setFooter({ text: `Trang ${petPage + 1}/${totalPetPages} · Tổng số sủng vật: ${myPets.length}` });
        embeds.push(embed);
      }

      else if (menu === 'PET_QUICK_RELEASE') {
        const myPets = await Pet.findAll({ where: { userId: tuSi.idNguoiDung } });
        const matchedPets = myPets.filter(p => !p.isActive &&
          (releaseFilterSpecies === 'all' || config.PET_TEMPLATES[p.type]?.species === releaseFilterSpecies) &&
          (releaseFilterBloodline === 'all' || p.rarity === releaseFilterBloodline)
        );

        const filterSpeciesName = releaseFilterSpecies === 'all' ? 'Tất cả' : (config.PET_TEMPLATES_SEED.find(t => t.species === releaseFilterSpecies)?.name || releaseFilterSpecies);
        const filterBloodlineName = releaseFilterBloodline === 'all' ? 'Tất cả' : (config.PET_QUALITY_LABELS[releaseFilterBloodline] || releaseFilterBloodline);

        const petListText = matchedPets.slice(0, 20).map((p, idx) => `**${idx + 1}.** **${p.name}** · Cấp ${p.level} · *Huyết mạch:* ${getPetRarityText(p.rarity)}`).join('\n') +
          (matchedPets.length > 20 ? `\n... và ${matchedPets.length - 20} sủng vật khác.` : '') || '_Không có sủng vật nào khớp bộ lọc._';

        const embed = new EmbedBuilder()
          .setTitle('💥 Phóng Sinh Nhanh Sủng Vật')
          .setColor(0xc0392b)
          .setDescription(
            `*Thiết lập bộ lọc để phóng sinh hàng loạt sủng vật không sử dụng. Sủng vật đang xuất chiến sẽ được tự động bỏ qua để đảm bảo an toàn.*\n\n` +
            `⚡ **BỘ LỌC HIỆN TẠI**:\n` +
            `• Chủng loài: **${filterSpeciesName}**\n` +
            `• Huyết mạch: **${filterBloodlineName}**\n\n` +
            `📋 **DANH SÁCH SỦNG VẬT BỊ PHÓNG SINH (${matchedPets.length} con):**\n` +
            `${petListText}\n\n` +
            `🚨 **CẢNH BÁO**: Toàn bộ sủng vật trong danh sách trên sẽ bị **phóng sinh vĩnh viễn** khỏi động phủ. Thao tác này không thể hoàn tác!`
          )
          .setTimestamp();
        embeds.push(embed);
      }

      // ══════════════════════════════════════════════════════════════
      // 7. CHI TIẾT SỦNG VẬT (PET_DETAIL)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'PET_DETAIL') {
        const pet = await Pet.findByPk(selectedPetId);
        if (pet) {
          const activeTag = pet.isActive ? ' 🟢 [Đang Xuất Chiến]' : ' 💤 [Đang Nghỉ Ngơi]';
          const rarityTag = ` ${config.PET_BLOODLINE_LABELS[pet.rarity] || pet.rarity}`;

          const stage = config.getPetStage(pet.rarity);
          const lineage = config.NEW_PET_LINEAGES[pet.type];
          const stageConf = lineage?.stages[stage];
          const speciesName = lineage?.name || pet.type;
          const stageName = stageConf ? stageConf.name : pet.name;

          const nextLvlExp = pet.level * 100;

          const realms = ['Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần', 'Phản Hư', 'Hợp Thể', 'Đại Thừa', 'Tiên Nhân'];
          const R = config.getRealmIndex(pet.level);
          const realmName = realms[R];

          const petStats = config.getPetCurrentStats(pet);
          const parts = [];
          for (const [key, val] of Object.entries(petStats)) {
            const pct = (val * 100).toFixed(1);
            let label = '';
            if (key === 'vat_cong') label = 'Vật Công';
            else if (key === 'phap_cong') label = 'Pháp Công';
            else if (key === 'max_hp') label = 'HP';
            else if (key === 'max_mp') label = 'MP';
            else if (key === 'vat_phong') label = 'Vật Phòng';
            else if (key === 'phap_phong') label = 'Pháp Phòng';
            else if (key === 'ne') label = 'Né tránh';
            else if (key === 'crit_rate') label = 'Bạo kích';
            else if (key === 'speed') label = 'Tốc độ';
            else if (key === 'xuyen_giap') label = 'Xuyên giáp';
            else if (key === 'giam_sat_thuong') label = 'Giảm sát thương';
            else if (key === 'khang_hieu_ung') label = 'Kháng hiệu ứng';
            else if (key === 'hieu_ung_cx') label = 'Hiệu ứng chính xác';

            if (key === 'speed') {
              parts.push(`+${val} ${label}`);
            } else {
              parts.push(`+${pct}% ${label}`);
            }
          }
          const hoTheDesc = parts.join(' & ');

          const skillDesc = config.getPetStageSkillDescription(pet.type, stage);
          const skillText = `\n• **Kỹ năng Chủ Động (${stageName})**:\n  *Mô tả*: ${skillDesc}`;

          const embed = new EmbedBuilder()
            .setTitle(`🐯 Sủng Vật: ${pet.name}`)
            .setColor(0xe67e22)
            .setDescription(
              `• **Chủng loại**: ${speciesName}\n` +
              `• **Hiện diện**: **${stageName}** (Giai đoạn ${stage}/4)\n` +
              `• **Huyết mạch**: ${rarityTag} (Tiến hóa: Cấp ${pet.tienHoa || 1}/10)\n` +
              `• **Trạng thái**: **${activeTag}**\n` +
              `• **Cảnh giới**: \`${realmName} Cảnh (Cấp ${pet.level})\` (EXP: \`${pet.exp} / ${nextLvlExp}\`)\n` +
              `• **Tư chất**: \`${pet.tuChat} / 5000\` *(Tư chất tối đa 5000)*\n` +
              `• **Hiệu ứng hộ thể**: ${hoTheDesc}${skillText}`
            );

          if (stageConf) {
            embed.setImage(`attachment://${stageConf.image}`);
          }
          embeds.push(embed);
        }
      }

      else if (menu === 'PET_RESET_CONFIRM') {
        const pet = await Pet.findByPk(selectedPetId);
        if (pet) {
          const embed = new EmbedBuilder()
            .setTitle('🔄 Xác Nhận Trùng Sinh (Reset) Linh Thú')
            .setDescription(
              `⚠️ Đạo hữu có chắc chắn muốn **Trùng Sinh** Linh Thú **${pet.name}** về Cấp 1 hay không?\n\n` +
              `• Toàn bộ Đá Tiến Hóa tiêu hao sẽ được hoàn trả.\n` +
              `• Toàn bộ EXP tích lũy sẽ quy đổi thành **Vạn Yêu Quả** hoàn trả tương ứng.\n\n` +
              `*Lưu ý: Thao tác này không thể hoàn tác sau khi đồng ý.*`
            )
            .setColor(0xe67e22)
            .setTimestamp();
          embeds.push(embed);
        }
      }
      else if (menu === 'PET_RENOUNCE_CONFIRM') {
        const pet = await Pet.findByPk(selectedPetId);
        if (pet) {
          const embed = new EmbedBuilder()
            .setTitle('💥 Xác Nhận Phóng Sinh (Thả) Linh Thú')
            .setDescription(
              `🚨 **CẢNH BÁO CỰC KỲ QUAN TRỌNG** 🚨\n\n` +
              `Đạo hữu có chắc chắn muốn **PHÓNG SINH** Linh Thú **${pet.name}** hay không?\n\n` +
              `🔥 **HẬU QUẢ VĨNH VIỄN**:\n` +
              `• Linh Thú sẽ bị **xóa hoàn toàn** khỏi tiên giới.\n` +
              `• Không thể khôi phục, không được hoàn trả bất kỳ tài nguyên hay vật phẩm nào.\n\n` +
              `*Hãy suy nghĩ kỹ trước khi quyết định.*`
            )
            .setColor(0xc0392b)
            .setTimestamp();
          embeds.push(embed);
        }
      }

      // ══════════════════════════════════════════════════════════════
      // 7.1. CHỌN LINH THÚ DUNG HỢP (PET_FUSION_SELECT)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'PET_FUSION_SELECT') {
        const petA = await Pet.findByPk(selectedPetId);
        if (petA) {
          const templateA = config.PET_TEMPLATES[petA.type];
          const statsA = config.getPetCurrentStats(petA);
          const statsTextA = config.formatFusedStats(statsA);
          const speciesA = templateA?.name || petA.type;

          const embed = new EmbedBuilder()
            .setTitle('🧬 Dung Hợp Linh Thú')
            .setColor(0xe67e22)
            .setDescription(
              `Đạo hữu đang chọn **Linh Thú chính**:\n` +
              `• **Tên**: **${petA.name}**\n` +
              `• **Chủng loài**: ${speciesA}\n` +
              `• **Chỉ số hiện tại**: \`${statsTextA}\`\n\n` +
              `Hãy chọn **Linh Thú thứ hai** (sẽ bị tiêu hao) từ danh sách bên dưới để tiến hành dung hợp.`
            );
          embeds.push(embed);
        }
      }

      // ══════════════════════════════════════════════════════════════
      // 7.2. XÁC NHẬN DUNG HỢP (PET_FUSION_CONFIRM)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'PET_FUSION_CONFIRM') {
        const petA = await Pet.findByPk(selectedPetId);
        const petB = await Pet.findByPk(selectedFusePetId);
        if (petA && petB) {
          const templateA = config.PET_TEMPLATES[petA.type];
          const templateB = config.PET_TEMPLATES[petB.type];
          const statsA = config.getPetCurrentStats(petA);
          const statsB = config.getPetCurrentStats(petB);

          const statsTextA = config.formatFusedStats(statsA);
          const statsTextB = config.formatFusedStats(statsB);

          const isThanA = ['to_long_1', 'to_long_2', 'phuong_hoang_1', 'phuong_hoang_2', 'ky_lan_1', 'ky_lan_2', 'huyen_vu_1', 'huyen_vu_2', 'bach_ho_1', 'bach_ho_2'].includes(petA.type);
          const isThanB = ['to_long_1', 'to_long_2', 'phuong_hoang_1', 'phuong_hoang_2', 'ky_lan_1', 'ky_lan_2', 'huyen_vu_1', 'huyen_vu_2', 'bach_ho_1', 'bach_ho_2'].includes(petB.type);
          const cost = (isThanA || isThanB) ? 100000 : 5000;

          const embed = new EmbedBuilder()
            .setTitle('🧬 Xác Nhận Dung Hợp Linh Thú')
            .setColor(0xe67e22)
            .setDescription(
              `Đạo hữu có chắc chắn muốn tiến hành dung hợp hai Linh Thú sau?\n\n` +
              `🔥 **Linh Thú 1**: **${petA.name}** (${templateA?.name || petA.type})\n` +
              `   *Chỉ số*: \`${statsTextA}\`\n\n` +
              `🧪 **Linh Thú 2**: **${petB.name}** (${templateB?.name || petB.type})\n` +
              `   *Chỉ số*: \`${statsTextB}\`\n\n` +
              `💰 **Chi phí**: \`${cost.toLocaleString()}\` Linh Thạch\n` +
              `🪙 **Hiện có**: \`${tuSi.linhThach.toLocaleString()}\` Linh Thạch\n\n` +
              `🚨 **CẢNH BÁO QUAN TRỌNG VỀ DUNG HỢP** 🚨\n` +
              `• Cả hai Linh Thú gốc sẽ **BIẾN MẤT VĨNH VIỄN** sau khi dung hợp.\n` +
              `• Linh Thú mới sinh ra sẽ có **chủng tộc ngẫu nhiên** (chọn 1 trong 2 Linh Thú gốc).\n` +
              `• **Chỉ số hộ thể mới sẽ ngẫu nhiên** kế thừa từ một trong hai Linh Thú gốc (cộng thêm 10% chỉ số) [Có 1% cơ hội thừa hưởng và cộng dồn toàn bộ chỉ số của cả hai].\n` +
              `• Linh thú mới bắt đầu từ Cấp 1.`
            );
          embeds.push(embed);
        }
      }

      else if (menu === 'PET_EVOLVE_CONFIRM') {
        const pet = await Pet.findByPk(selectedPetId);
        if (pet) {
          const reqs = config.getBloodlineUpgradeReqs(pet.rarity, pet.tienHoa, pet.type);
          if (reqs) {
            const phachConf = config.ITEMS.find(item => item.id === reqs.phachId);
            const phachName = phachConf ? phachConf.ten : reqs.phachId;
            const phachEmoji = phachConf ? phachConf.emoji : '💎';

            const phachInv = await Inventory.findOne({
              where: { idNguoiDung: tuSi.idNguoiDung, itemId: reqs.phachId }
            });
            const phachOwned = phachInv ? phachInv.soLuong : 0;
            const reqPhachCount = reqs.type === 'minor' ? reqs.count : reqs.phachCount;
            const phachOk = phachOwned >= reqPhachCount;

            let reqsText = `• **Nguyên liệu**: ${phachEmoji} **${phachName}** (\`${phachOwned}/${reqPhachCount}\`) ${phachOk ? '✅' : '❌'}\n`;

            let copiesOk = true;
            let copiesOwned = 0;
            let fodderSelectionText = '';
            if (reqs.type === 'major') {
              const potentialOk = pet.tuChat >= reqs.potentialReq;
              reqsText += `• **Tư chất yêu cầu**: \`${pet.tuChat}/${reqs.potentialReq}\` ${potentialOk ? '✅' : '❌'}\n`;

              const allMyPets = await Pet.findAll({ where: { userId: tuSi.idNguoiDung } });
              const candidates = allMyPets.filter(fodder => fodder.type === pet.type && !fodder.isActive && fodder.id !== pet.id);
              copiesOwned = candidates.length;
              copiesOk = copiesOwned >= reqs.copiesReq;

              reqsText += `• **Phôi yêu cầu**: ${reqs.copiesReq} Linh Thú cùng dòng \`(${copiesOwned}/${reqs.copiesReq})\` ${copiesOk ? '✅' : '❌'}\n`;

              if (reqs.copiesReq > 0) {
                if (selectedFodderIds.length > 0) {
                  const chosenPets = allMyPets.filter(f => selectedFodderIds.includes(f.id));
                  fodderSelectionText = `\n\n📋 **Danh sách phôi đã chọn (${chosenPets.length}/${reqs.copiesReq})**:\n` +
                    chosenPets.map(f => `- **${f.name}** (${config.PET_BLOODLINE_LABELS[f.rarity]} · Cấp ${f.level})`).join('\n');
                } else {
                  fodderSelectionText = `\n\n⚠️ *Chưa chọn phôi. Hãy nhấn "Tự động chọn phôi" hoặc chọn từ danh sách bên dưới.*`;
                }
              }
            }

            const embed = new EmbedBuilder()
              .setTitle(`🧬 Xác Nhận Nâng Cấp Huyết Mạch`)
              .setColor(0xe67e22)
              .setDescription(
                `Đạo hữu đang tiến hành nâng cấp sủng vật:\n\n` +
                `🐯 **Sủng Vật**: **${pet.name}**\n` +
                `• **Huyết mạch hiện tại**: ${config.PET_BLOODLINE_LABELS[pet.rarity]} (Cấp ${pet.tienHoa}/10)\n\n` +
                `🚨 **Yêu cầu nâng cấp**:\n` +
                reqsText +
                fodderSelectionText
              )
              .setTimestamp();
            embeds.push(embed);
          }
        }
      }

      // ══════════════════════════════════════════════════════════════
      // 8. ĐẬP ĐÁ CẦU MAY (STONE_SMASH)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'STONE_SMASH') {
        const embed = new EmbedBuilder()
          .setTitle(`💎 Tiệm Đổ Thạch Cổ`)
          .setColor(0x9b59b6)
          .setDescription(
            `Chào mừng đạo hữu đến với sòng bạc tiên môn! Hãy lựa chọn cấp độ linh thạch để đập thạch cầu may:\n\n` +
            `• **Đá Thường (100k Linh Thạch)**: 12% ra trứng sủng vật (90% Thường, 10% Thần Thú Cổ). 88% ra Exp/Linh thạch/vật phẩm phàm phẩm.\n` +
            `• **Đá Quý (1M Linh Thạch)**: 15% ra trứng sủng vật. 85% ra vật phẩm ưu phẩm, linh dược cấp cao.\n` +
            `• **Đá Thượng Cổ (10M Linh Thạch)**: 20% ra trứng sủng vật. 80% ra vật phẩm cực phẩm, tiên thảo quý hiếm.\n\n` +
            `*Hãy chọn loại đá muốn mua để bắt đầu.*`
          );
        embeds.push(embed);
      }

      // Nếu có thông báo hành động vừa thực hiện, đính kèm thêm embed thông báo
      if (actionMessage) {
        embeds.push(actionMessage);
        actionMessage = null; // Clear sau khi render
      }

      return embeds;
    };

    // ── BUILD ACTIONS ROWS ──────────────────────────────────────────────────

    const buildComponents = async (sellableList = [], myPets = []) => {
      const menu = getCurrentMenu();
      const rows = [];

      // ══════════════════════════════════════════════════════════════
      // 1. MÀN HÌNH CHÍNH (MAIN)
      // ══════════════════════════════════════════════════════════════
      if (menu === 'MAIN') {
        if (abode.level === 0) {
          rows.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('main_build')
                .setLabel('🔨 Xây Dựng Động Phủ (10,000 Linh Thạch)')
                .setStyle(ButtonStyle.Success)
                .setDisabled(tuSi.linhThach < 10000),
              new ButtonBuilder()
                .setCustomId('main_close')
                .setLabel('❌ Hủy')
                .setStyle(ButtonStyle.Danger)
            )
          );
        } else {
          rows.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('btn_garden')
                .setLabel('🌱 Dược Viên')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId('btn_alchemy')
                .setLabel('💊 Luyện Đan')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId('btn_forge')
                .setLabel('🔨 Luyện Khí')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId('btn_pets')
                .setLabel('🐯 Sủng Vật')
                .setStyle(ButtonStyle.Primary)
            )
          );

          const cost = ABODE_UPGRADE_BASE_COST * Math.pow(10, abode.level);
          rows.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('main_upgrade')
                .setLabel(`⚡ Nâng Cấp Động Phủ (Cấp ${abode.level + 1})`)
                .setStyle(ButtonStyle.Success)
                .setDisabled(abode.level >= MAX_ABODE_LEVEL || tuSi.linhThach < cost),
              new ButtonBuilder()
                .setCustomId('btn_stone_smash')
                .setLabel('💎 Đổ Thạch Cầu May')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId('main_close')
                .setLabel('❌ Rời Khỏi')
                .setStyle(ButtonStyle.Danger)
            )
          );
        }
      }

      // ══════════════════════════════════════════════════════════════
      // 2. DƯỢC VIÊN (GARDEN)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'GARDEN') {
        const plots = await GardenPlot.findAll({ where: { userId: tuSi.idNguoiDung } });
        const countPlots = plots.length;

        // Dropdown chọn ô đất (phân trang, tối đa 23 ô/trang để còn chỗ cho nút điều hướng)
        const GARDEN_PAGE_SIZE = 23;
        const totalGardenPages = Math.ceil(plots.length / GARDEN_PAGE_SIZE) || 1;
        if (gardenPage >= totalGardenPages) gardenPage = Math.max(0, totalGardenPages - 1);
        const plotsThisPage = plots.slice(gardenPage * GARDEN_PAGE_SIZE, (gardenPage + 1) * GARDEN_PAGE_SIZE);

        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('garden_slot_select')
              .setPlaceholder(`🌾 Chọn ô đất muốn thao tác... (Trang ${gardenPage + 1}/${totalGardenPages})`)
              .addOptions(plotsThisPage.map(p => {
                const statusText = p.status === 'EMPTY' ? 'Đất Trống' : 'Có cây';
                return {
                  label: `Ô Đất Số ${p.slotIndex + 1} (${statusText})`,
                  value: String(p.slotIndex)
                };
              }))
          )
        );

        if (totalGardenPages > 1) {
          rows.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('garden_page_prev')
                .setLabel('◀ Trang Trước')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(gardenPage === 0),
              new ButtonBuilder()
                .setCustomId('garden_page_next')
                .setLabel('Trang Sau ▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(gardenPage >= totalGardenPages - 1)
            )
          );
        }

        // Nút tưới nước & Mở ô đất
        const slotCost = 10000 * Math.pow(10, countPlots - 2);
        const waterCount = abode.waterCount || 0;
        const waterCost = WATERING_COST_BASE * Math.pow(10, waterCount - 3);

        const btnWater = new ButtonBuilder()
          .setCustomId('garden_water')
          .setLabel('💦 Tưới Nước')
          .setStyle(ButtonStyle.Success);
        if (waterCount >= 3 && tuSi.linhThach < waterCost) {
          btnWater.setDisabled(true);
        }

        rows.push(
          new ActionRowBuilder().addComponents(
            btnWater,
            new ButtonBuilder()
              .setCustomId('garden_buy_slot')
              .setLabel(`🔓 Mở Ô Đất Mới (Tốn ${slotCost.toLocaleString()} 🪙)`)
              .setStyle(ButtonStyle.Primary)
              .setDisabled(countPlots >= MAX_GARDEN_PLOTS || tuSi.linhThach < slotCost),
            new ButtonBuilder()
              .setCustomId('btn_back')
              .setLabel('↩️ Quay Lại')
              .setStyle(ButtonStyle.Secondary)
          )
        );

        // Nút Trồng Nhanh, Thu Hoạch Nhanh, Cài Đặt
        const hasQuickSeed = !!abode.quickSeedId;
        const quickSeedInvCheck = hasQuickSeed ? sellableList.find(e => e.item.id === abode.quickSeedId) : null;
        const hasQuickSeedInBag = quickSeedInvCheck && quickSeedInvCheck.soLuong > 0;
        const emptyPlots = plots.filter(p => p.status === 'EMPTY');
        const readyPlots = plots.filter(p => {
          const r = getPlotAgeAndHerb(p);
          return p.status === 'PLANTED' && r.ready;
        });

        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('garden_quick_plant')
              .setLabel('🌱 Trồng Nhanh')
              .setStyle(ButtonStyle.Success)
              .setDisabled(!hasQuickSeed || !hasQuickSeedInBag || emptyPlots.length === 0),
            new ButtonBuilder()
              .setCustomId('garden_quick_harvest')
              .setLabel('🌾 Thu Hoạch Nhanh')
              .setStyle(ButtonStyle.Success)
              .setDisabled(readyPlots.length === 0),
            new ButtonBuilder()
              .setCustomId('garden_config_quick')
              .setLabel('⚙️ Cài Đặt Trồng Nhanh')
              .setStyle(ButtonStyle.Secondary)
          )
        );
      }

      // ══════════════════════════════════════════════════════════════
      // 3. CHI TIẾT Ô ĐẤT (GARDEN_SLOT)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'GARDEN_SLOT') {
        const plot = await GardenPlot.findOne({ where: { userId: tuSi.idNguoiDung, slotIndex: selectedSlotIndex } });
        const ageResult = getPlotAgeAndHerb(plot);

        if (plot.status === 'EMPTY') {
          // Hiển thị danh sách hạt giống trong túi để trồng
          const seeds = sellableList.filter(e => e.item.loai === 'Linh thảo' && e.item.id.startsWith('hat_giong_'));
          if (seeds.length === 0) {
            rows.push(
              new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId('garden_plant_seed')
                  .setPlaceholder('⚠️ Bạn không có hạt giống nào để gieo')
                  .setDisabled(true)
                  .addOptions([{ label: '(Trống)', value: '__empty__' }])
              )
            );
          } else {
            const SEED_PAGE_SIZE = 22;
            const totalSeedPages = Math.ceil(seeds.length / SEED_PAGE_SIZE) || 1;
            if (seedPage >= totalSeedPages) seedPage = Math.max(0, totalSeedPages - 1);
            const seedsThisPage = seeds.slice(seedPage * SEED_PAGE_SIZE, (seedPage + 1) * SEED_PAGE_SIZE);

            rows.push(
              new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId('garden_plant_seed')
                  .setPlaceholder(`🌱 Chọn hạt giống để gieo... (Trang ${seedPage + 1}/${totalSeedPages})`)
                  .addOptions(seedsThisPage.map(s => ({
                    label: `${s.item.ten} (Có: ${s.soLuong})`,
                    value: s.item.id
                  })))
              )
            );

            if (totalSeedPages > 1) {
              rows.push(
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId('seed_page_prev')
                    .setLabel('◀ Trang Trước')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(seedPage === 0),
                  new ButtonBuilder()
                    .setCustomId('seed_page_next')
                    .setLabel('Trang Sau ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(seedPage >= totalSeedPages - 1)
                )
              );
            }
          }
        } else {
          // Nút thu hoạch
          rows.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('garden_harvest')
                .setLabel('🌾 Thu Hoạch Linh Thảo')
                .setStyle(ButtonStyle.Success)
                .setDisabled(!ageResult.ready)
            )
          );
        }

        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('btn_back')
              .setLabel('↩️ Quay Lại')
              .setStyle(ButtonStyle.Secondary)
          )
        );
      }

      // ══════════════════════════════════════════════════════════════
      // 3.1 CÀI ĐẶT TRỒNG NHANH (GARDEN_CONFIG_QUICK)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'GARDEN_CONFIG_QUICK') {
        const allSeeds = config.ITEMS.filter(e => e.loai === 'Linh thảo' && e.id.startsWith('hat_giong_'));
        const QUICK_SEED_PAGE_SIZE = 24;
        const totalQuickSeedPages = Math.ceil(allSeeds.length / QUICK_SEED_PAGE_SIZE) || 1;
        if (seedPage >= totalQuickSeedPages) seedPage = Math.max(0, totalQuickSeedPages - 1);
        const seedsThisPage = allSeeds.slice(seedPage * QUICK_SEED_PAGE_SIZE, (seedPage + 1) * QUICK_SEED_PAGE_SIZE);

        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('garden_select_quick_seed')
              .setPlaceholder(`🌰 Chọn hạt giống trồng nhanh... (Trang ${seedPage + 1}/${totalQuickSeedPages})`)
              .addOptions(seedsThisPage.map(s => {
                const invEntry = sellableList.find(e => e.item.id === s.id);
                const qty = invEntry ? invEntry.soLuong : 0;
                return {
                  label: s.ten.length > 100 ? s.ten.substring(0, 97) + '...' : s.ten,
                  description: `Đang có: ${qty} hạt trong túi`,
                  value: s.id,
                  default: s.id === abode.quickSeedId
                };
              }))
          )
        );

        if (totalQuickSeedPages > 1) {
          rows.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('seed_page_prev')
                .setLabel('◀ Trang Trước')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(seedPage === 0),
              new ButtonBuilder()
                .setCustomId('seed_page_next')
                .setLabel('Trang Sau ▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(seedPage >= totalQuickSeedPages - 1)
            )
          );
        }

        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('btn_back')
              .setLabel('↩️ Quay Lại')
              .setStyle(ButtonStyle.Secondary)
          )
        );
      }

      // ══════════════════════════════════════════════════════════════
      // 4. LUYỆN ĐAN (ALCHEMY)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'ALCHEMY') {
        // Lọc ra các loại linh thảo có trong balo
        const herbs = sellableList.filter(e => e.item.loai === 'Linh thảo' && e.item.id.includes('_'));
        if (herbs.length === 0) {
          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('alchemy_craft_pills')
                .setPlaceholder('⚠️ Không có linh thảo trong túi đồ')
                .setDisabled(true)
                .addOptions([{ label: '(Trống)', value: '__empty__' }])
            )
          );
        } else {
          const HERB_PAGE_SIZE = 22;
          const totalHerbPages = Math.ceil(herbs.length / HERB_PAGE_SIZE) || 1;
          if (herbPage >= totalHerbPages) herbPage = Math.max(0, totalHerbPages - 1);
          const herbsThisPage = herbs.slice(herbPage * HERB_PAGE_SIZE, (herbPage + 1) * HERB_PAGE_SIZE);

          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('alchemy_craft_pills')
                .setPlaceholder(`🔮 Chọn linh thảo chế luyện Đan Tu Vi... (Trang ${herbPage + 1}/${totalHerbPages})`)
                .addOptions(herbsThisPage.map(h => ({
                  label: `${h.item.ten} (Có: ${h.soLuong})`,
                  value: h.item.id
                })))
            )
          );

          if (totalHerbPages > 1) {
            rows.push(
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('herb_page_prev')
                  .setLabel('◀ Linh Thảo Trước')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(herbPage === 0),
                new ButtonBuilder()
                  .setCustomId('herb_page_next')
                  .setLabel('Linh Thảo Sau ▶')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(herbPage >= totalHerbPages - 1)
              )
            );
          }
        }

        // Lọc ra các đan dược Tu Vi trong balo để ăn
        const pills = sellableList.filter(e => e.item.id.startsWith('dan_tu_vi_'));
        if (pills.length > 0) {
          const PILL_PAGE_SIZE = 22;
          const totalPillPages = Math.ceil(pills.length / PILL_PAGE_SIZE) || 1;
          if (pillPage >= totalPillPages) pillPage = Math.max(0, totalPillPages - 1);
          const pillsThisPage = pills.slice(pillPage * PILL_PAGE_SIZE, (pillPage + 1) * PILL_PAGE_SIZE);

          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('alchemy_consume_pill')
                .setPlaceholder(`💊 Ăn Đan Dược gia tăng Tu Vi... (Trang ${pillPage + 1}/${totalPillPages})`)
                .addOptions(pillsThisPage.map(p => ({
                  label: `${p.item.ten} (Có: ${p.soLuong})`,
                  value: p.item.id
                })))
            )
          );

          if (totalPillPages > 1) {
            rows.push(
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('pill_page_prev')
                  .setLabel('◀ Đan Dược Trước')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(pillPage === 0),
                new ButtonBuilder()
                  .setCustomId('pill_page_next')
                  .setLabel('Đan Dược Sau ▶')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(pillPage >= totalPillPages - 1)
              )
            );
          }
        }

        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('btn_back')
              .setLabel('↩️ Quay Lại')
              .setStyle(ButtonStyle.Secondary)
          )
        );
      }

      // ══════════════════════════════════════════════════════════════
      // 5. LUYỆN KHÍ (FORGE)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'FORGE') {
        // Công thức rèn đúc
        const recipes = [
          // Luyện Khí - Pháp Tu
          { label: '🗡️ Thanh Phong Kiếm (5 Sơ Cấp Thiết Quặng + 2000 LT)', value: 'thanh_phong_kiem::thanh_phong_kiem', capDoMin: 1, capDoMax: 9, heTu: 'Phap Tu' },
          { label: '🥋 Đạo Bào Thanh Vân (5 Thô Linh Đàn Ty + 2000 LT)', value: 'dao_bao_thanh_van::dao_bao_thanh_van', capDoMin: 1, capDoMax: 9, heTu: 'Phap Tu' },
          { label: '🔮 Thủy Linh Bội (5 Linh Khí Toái Thạch + 2000 LT)', value: 'thuy_linh_boi::thuy_linh_boi', capDoMin: 1, capDoMax: 9, heTu: 'Phap Tu' },
          { label: '🪡 Linh Phong Châm (5 Nham Hỏa Tinh Hoa + 2000 LT)', value: 'pb_lk_linh_phong_cham::pb_lk_linh_phong_cham', capDoMin: 1, capDoMax: 9, heTu: 'Phap Tu' },
          { label: '⚡ Dẫn Lôi Phù (5 Sét Đánh Mộc + 2000 LT)', value: 'pb_lk_dan_loi_phu::pb_lk_dan_loi_phu', capDoMin: 1, capDoMax: 9, heTu: 'Phap Tu' },
          { label: '🛡️ Hộ Thân Kính (5 Kiên Thạch Tâm + 2000 LT)', value: 'pb_lk_ho_than_kinh::pb_lk_ho_than_kinh', capDoMin: 1, capDoMax: 9, heTu: 'Phap Tu' },
          { label: '🌀 Định Thân Phù (5 Thiết Đằng Man + 2000 LT)', value: 'pb_lk_dinh_than_phu::pb_lk_dinh_than_phu', capDoMin: 1, capDoMax: 9, heTu: 'Phap Tu' },
          { label: '💧 Thanh Linh Bình (5 Linh Tuyền Thủy + 2000 LT)', value: 'pb_lk_thanh_linh_binh::pb_lk_thanh_linh_binh', capDoMin: 1, capDoMax: 9, heTu: 'Phap Tu' },
          { label: '🚩 Tụ Khí Kỳ (5 Yêu Thú Huyết + 2000 LT)', value: 'pb_lk_tu_khi_ky::pb_lk_tu_khi_ky', capDoMin: 1, capDoMax: 9, heTu: 'Phap Tu' },

          // Luyện Khí - Thể Tu
          { label: '🗡️ Thiết Cốt Đao (5 Sơ Cấp Thiết Quặng + 2000 LT)', value: 'thiet_cot_dao::thiet_cot_dao', capDoMin: 1, capDoMax: 9, heTu: 'The Tu' },
          { label: '🥋 Thô Bố Trực Cư (5 Thô Linh Đàn Ty + 2000 LT)', value: 'tho_bo_thuc_cu::tho_bo_thuc_cu', capDoMin: 1, capDoMax: 9, heTu: 'The Tu' },
          { label: '🔮 Khương Thạch Bội (5 Linh Khí Toái Thạch + 2000 LT)', value: 'khuong_thach_boi::khuong_thach_boi', capDoMin: 1, capDoMax: 9, heTu: 'The Tu' },
          { label: '🔨 Toái Thạch Ấn (5 Nham Hỏa Tinh Hoa + 2000 LT)', value: 'pb_lk_toai_thach_an::pb_lk_toai_thach_an', capDoMin: 1, capDoMax: 9, heTu: 'The Tu' },
          { label: '🔥 Hỏa Tinh Đỉnh (5 Sét Đánh Mộc + 2000 LT)', value: 'pb_lk_hoa_tinh_dinh::pb_lk_hoa_tinh_dinh', capDoMin: 1, capDoMax: 9, heTu: 'The Tu' },
          { label: '🛡️ Thạch Phù Thuẫn (5 Kiên Thạch Tâm + 2000 LT)', value: 'pb_lk_thach_phu_thuan::pb_lk_thach_phu_thuan', capDoMin: 1, capDoMax: 9, heTu: 'The Tu' },
          { label: '⛓️ U Thiết Liên (5 Thiết Đằng Man + 2000 LT)', value: 'pb_lk_u_thiet_lien::pb_lk_u_thiet_lien', capDoMin: 1, capDoMax: 9, heTu: 'The Tu' },
          { label: '🥕 Dã Sơn Sâm (5 Linh Tuyền Thủy + 2000 LT)', value: 'pb_lk_da_son_sam::pb_lk_da_son_sam', capDoMin: 1, capDoMax: 9, heTu: 'The Tu' },
          { label: '🥁 Chiến Cổ (5 Yêu Thú Huyết + 2000 LT)', value: 'pb_lk_chien_co::pb_lk_chien_co', capDoMin: 1, capDoMax: 9, heTu: 'The Tu' },

          // Trúc Cơ - Pháp Tu
          { label: '🗡️ Tử Tiêu Tiên Kiếm (5 Huyền Thiết Tinh Sa + 4000 LT)', value: 'thanh_phong_kiem::vk_phap_truc_co', heTu: 'Phap Tu', capDoMin: 10, capDoMax: 12 },
          { label: '🥋 Tử Vân Pháp Bào (5 Lục Ngọc Thạch + 4000 LT)', value: 'dao_bao_thanh_van::giap_phap_truc_co', heTu: 'Phap Tu', capDoMin: 10, capDoMax: 12 },
          { label: '🔮 Tử Tinh Linh Bội (5 Âm Dương Đồng Chương + 4000 LT)', value: 'thuy_linh_boi::nb_phap_truc_co', heTu: 'Phap Tu', capDoMin: 10, capDoMax: 12 },
          { label: '🏺 Linh Tuyết Phục Nguyên Bình (5 Địa Xích Linh Chi + 4000 LT)', value: 'pb_lk_thanh_linh_binh::pb_hoi_phap_truc_co', heTu: 'Phap Tu', capDoMin: 10, capDoMax: 12 },
          { label: '🛡️ Tử Quang Hộ Thân Kính (5 Bích Hải Băng Tinh + 4000 LT)', value: 'pb_lk_ho_than_kinh::pb_def_phap_truc_co', heTu: 'Phap Tu', capDoMin: 10, capDoMax: 12 },
          { label: '⚡ Cửu Thiên Lôi Vân Phù (5 Cửu Thiên Tử Cát + 4000 LT)', value: 'pb_lk_dan_loi_phu::pb_aoe_phap_truc_co', heTu: 'Phap Tu', capDoMin: 10, capDoMax: 12 },
          { label: '💥 Tử Dương Linh Pháo (5 Địa Hỏa Chi Tinh + 4000 LT)', value: 'pb_lk_linh_phong_cham::pb_don_phap_truc_co', heTu: 'Phap Tu', capDoMin: 10, capDoMax: 12 },
          { label: '❄️ Huyền Băng Thần Tiên (5 Khổn Tiên Đằng Mộc + 4000 LT)', value: 'pb_lk_dinh_than_phu::pb_cc_phap_truc_co', heTu: 'Phap Tu', capDoMin: 10, capDoMax: 12 },
          { label: '🪭 Tụ Linh Tiên Phiến (5 Thanh Vũ Linh Sa + 4000 LT)', value: 'pb_lk_tu_khi_ky::pb_buff_phap_truc_co', heTu: 'Phap Tu', capDoMin: 10, capDoMax: 12 },

          // Trúc Cơ - Thể Tu & Chung
          { label: '⚔️ Thiết Kiếm (5 Huyền Thiết Tinh Sa + 4000 LT)', value: 'kiem_sat_nang::kiem_sat', capDoMin: 10, capDoMax: 12 },
          { label: '🎋 Trúc Trượng (5 Huyền Thiết Tinh Sa + 4000 LT)', value: 'truong_truc_thuong::truong_truc', capDoMin: 10, capDoMax: 12 },
          { label: '🛡️ Thú Bì Giáp (5 Lục Ngọc Thạch + 4000 LT)', value: 'ao_vai_day::ao_da', capDoMin: 10, capDoMax: 12 },
          { label: '🪓 Huyền Thiết Chiến Phủ (5 Huyền Thiết Tinh Sa + 4000 LT)', value: 'thiet_cot_dao::vk_the_truc_co', heTu: 'The Tu', capDoMin: 10, capDoMax: 12 },
          { label: '🛡️ Kim Giáp Hoàng Lân (5 Lục Ngọc Thạch + 4000 LT)', value: 'tho_bo_thuc_cu::giap_the_truc_co', heTu: 'The Tu', capDoMin: 10, capDoMax: 12 },
          { label: '📿 Huyết Thạch Linh Bội (5 Âm Dương Đồng Chương + 4000 LT)', value: 'khuong_thach_boi::nb_the_truc_co', heTu: 'The Tu', capDoMin: 10, capDoMax: 12 },
          { label: '❇️ Huyết Hồn Linh Chi (5 Địa Xích Linh Chi + 4000 LT)', value: 'pb_lk_da_son_sam::pb_hoi_the_truc_co', heTu: 'The Tu', capDoMin: 10, capDoMax: 12 },
          { label: '🛡️ Huyền Vũ Bảo Thuẫn (5 Bích Hải Băng Tinh + 4000 LT)', value: 'pb_lk_thach_phu_thuan::pb_def_the_truc_co', heTu: 'The Tu', capDoMin: 10, capDoMax: 12 },
          { label: '🔥 Kinh Hồn Tiên Chuông (5 Cửu Thiên Tử Cát + 4000 LT)', value: 'pb_lk_hoa_tinh_dinh::pb_aoe_the_truc_co', heTu: 'The Tu', capDoMin: 10, capDoMax: 12 },
          { label: '🔨 Xích Hỏa Thương (5 Địa Hỏa Chi Tinh + 4000 LT)', value: 'pb_lk_toai_thach_an::pb_don_the_truc_co', heTu: 'The Tu', capDoMin: 10, capDoMax: 12 },
          { label: '⛓️ Huyền Băng Tiên Thương (5 Khổn Tiên Đằng Mộc + 4000 LT)', value: 'pb_lk_u_thiet_lien::pb_cc_the_truc_co', heTu: 'The Tu', capDoMin: 10, capDoMax: 12 },
          { label: '🥁 Bá Vương Chiến Kỳ (5 Thanh Vũ Linh Sa + 4000 LT)', value: 'pb_lk_chien_co::pb_buff_the_truc_co', heTu: 'The Tu', capDoMin: 10, capDoMax: 12 },

          // Kim Đan
          { label: 'Bát Hoang Cự Chùy (5 Vạn Năm Huyền Thiết + 2000 LT)', value: 'kiem_kim_dan_thuong::kiem_kim_dan', emoji: { id: '1524821321651982407' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Thái Hư Phi Kiếm (5 Vạn Năm Huyền Thiết + 2000 LT)', value: 'truong_kim_dan_thuong::truong_kim_dan', emoji: { id: '1524815980134531223' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Cửu Long Bá Thể Giáp (5 Thiên Tàm Linh Ty + 2000 LT)', value: 'ao_kim_dan_thuong::ao_kim_dan', emoji: { id: '1524821316845174824' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Lưu Ly Pháp Bào (5 Thiên Tàm Linh Ty + 2000 LT)', value: 'ao_kim_dan_thuong::ao_kim_dan_phap', emoji: { id: '1524815977685057586' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Huyết Ngọc Tủy (5 Hồn Tinh Huyết Nguyệt + 2000 LT)', value: 'ngoc_boi_linh_ngoc::ngoc_boi_kim_dan_the', emoji: { id: '1524821295785574591' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Tụ Linh Ngọc (5 Hồn Tinh Huyết Nguyệt + 2000 LT)', value: 'ngoc_boi_linh_ngoc::ngoc_boi_kim_dan_phap', emoji: { id: '1524815970739290302' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Diệt Ma Châm (5 Cực Dương Hỏa Thạch + 2000 LT)', value: 'phap_bao_ho_than::pb_kd_diet_ma_cham', emoji: { id: '1524815973251682335' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Ngũ Lôi Châu (5 Lôi Trì Băng Tinh + 2000 LT)', value: 'phap_bao_ho_than::pb_kd_ngu_loi_chau', emoji: { id: '1524815975457886290' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Bát Quái Kính (5 Hậu Thổ Chi Lõi + 2000 LT)', value: 'phap_bao_ho_than::pb_kd_bat_quai_kinh', emoji: { id: '1524815987986272317' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Khổn Tiên Tố (5 U Minh Tế Trúc + 2000 LT)', value: 'phap_bao_ho_than::pb_kd_khon_tien_to', emoji: { id: '1524815966905569504' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Cam Lộ Bình (5 Sinh Sinh Tạo Hóa Dịch + 2000 LT)', value: 'phap_bao_ho_than::pb_kd_cam_lo_binh', emoji: { id: '1524815985066901595' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Thất Tinh Đăng (5 Tinh Không Lưu Sa + 2000 LT)', value: 'phap_bao_ho_than::pb_kd_that_tinh_dang', emoji: { id: '1524815982881669342' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Chấn Sơn Ấn (5 Cực Dương Hỏa Thạch + 2000 LT)', value: 'phap_bao_ho_than::pb_kd_chan_son_an', emoji: { id: '1524821300747436142' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Phần Thiên Đỉnh (5 Lôi Trì Băng Tinh + 2000 LT)', value: 'phap_bao_ho_than::pb_kd_phan_thien_dinh', emoji: { id: '1524821303012622507' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Huyền Vũ Thuẫn (5 Hậu Thổ Chi Lõi + 2000 LT)', value: 'phap_bao_ho_than::pb_kd_huyen_vu_thuan', emoji: { id: '1524821312000757942' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Tỏa Hồn Liên (5 U Minh Tế Trúc + 2000 LT)', value: 'phap_bao_ho_than::pb_kd_toa_hon_lien', emoji: { id: '1524821308440055899' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Huyết Bồ Đề (5 Sinh Sinh Tạo Hóa Dịch + 2000 LT)', value: 'phap_bao_ho_than::pb_kd_huyet_bo_de', emoji: { id: '1524821298729979998' }, capDoMin: 13, capDoMax: 15 },
          { label: 'Man Hoang Cổ (5 Tinh Không Lưu Sa + 2000 LT)', value: 'phap_bao_ho_than::pb_kd_man_hoang_co', emoji: { id: '1524821305613094942' }, capDoMin: 13, capDoMax: 15 },

          // Nguyên Anh
          { label: '⚔️ Nguyên Anh Phá Thiên Kiếm (5 Nguyên Anh Hỏa Tinh + 2000 LT)', value: 'kiem_nguyen_anh_thuong::kiem_nguyen_anh', capDoMin: 16, capDoMax: 18 },
          { label: '⚡ Nguyên Thần Tiên Trượng (5 Nguyên Anh Hỏa Tinh + 2000 LT)', value: 'truong_nguyen_anh_thuong::truong_nguyen_anh', capDoMin: 16, capDoMax: 18 },
          { label: '🛡️ Nguyên Anh Hộ Thể Giáp (5 Nguyên Anh Hỏa Tinh + 2000 LT)', value: 'ao_nguyen_anh_thuong::ao_nguyen_anh', capDoMin: 16, capDoMax: 18 },

          // Hóa Thần
          { label: '🗡️ Huyền Thiết Trọng Kiếm (5 Thần Ma Chi Tinh + 2000 LT)', value: 'kiem_sat_co_khi::kiem_huyen_thiet', capDoMin: 19, capDoMax: 999 },
          { label: '🔮 Huyền Môn Ngọc Bội (5 Thần Ma Chi Tinh + 2000 LT)', value: 'truong_go_co_loi::phap_bao_huyen_mon', capDoMin: 19, capDoMax: 999 },
          { label: '🥋 Huyền Thiết Linh Giáp (5 Thần Ma Chi Tinh + 2000 LT)', value: 'ao_da_co_lan::giap_huyen_thiet', capDoMin: 19, capDoMax: 999 }
        ];

        const filteredRecipes = recipes.filter(r => {
          if (tuSi.capDo < r.capDoMin || tuSi.capDo > r.capDoMax) return false;
          if (r.heTu && r.heTu !== tuSi.huongTu) return false;
          return true;
        });

        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('forge_recipe_select')
              .setPlaceholder('🔨 Chọn công thức rèn đúc tiên binh...')
              .addOptions(filteredRecipes)
          )
        );

        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('btn_back')
              .setLabel('↩️ Quay Lại')
              .setStyle(ButtonStyle.Secondary)
          )
        );
      }

      // ══════════════════════════════════════════════════════════════
      // 6. SỦNG VẬT (PETS)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'PETS') {
        const PET_PAGE_SIZE = 10;
        const totalPetPages = myPets.length > 0 ? Math.ceil(myPets.length / PET_PAGE_SIZE) : 1;
        if (petPage >= totalPetPages) petPage = Math.max(0, totalPetPages - 1);
        const petsThisPage = myPets.slice(petPage * PET_PAGE_SIZE, (petPage + 1) * PET_PAGE_SIZE);

        if (petsThisPage.length > 0) {
          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('pet_select')
                .setPlaceholder(`🐾 Chọn sủng vật để chăm sóc/lệnh xuất chiến... (Trang ${petPage + 1}/${totalPetPages})`)
                .addOptions(petsThisPage.map(p => ({
                  label: p.name,
                  value: String(p.id)
                })))
            )
          );
        }

        if (totalPetPages > 1) {
          rows.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('pet_page_prev')
                .setLabel('◀ Trang Trước')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(petPage === 0),
              new ButtonBuilder()
                .setCustomId('pet_page_next')
                .setLabel('Trang Sau ▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(petPage >= totalPetPages - 1)
            )
          );
        }

        // Trứng ấp sủng vật
        const eggs = sellableList.filter(e => e.item.id.startsWith('trung_linh_thu'));
        if (eggs.length > 0) {
          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('pet_egg_hatch')
                .setPlaceholder('🥚 Ấp trứng sủng vật...')
                .addOptions(eggs.map(e => ({
                  label: `${e.item.ten} (Có: ${e.soLuong})`,
                  value: e.item.id
                })))
            )
          );

          // Nút ấp nhanh tất cả trứng cùng loại
          const quickHatchEgg = selectedEggId
            ? eggs.find(e => e.item.id === selectedEggId)
            : null;
          const quickHatchCount = quickHatchEgg ? quickHatchEgg.soLuong : 0;
          const quickHatchLabel = quickHatchEgg
            ? `⚡ Ấp Nhanh Tất Cả (${quickHatchCount} trứng ${quickHatchEgg.item.ten})`
            : '⚡ Ấp Nhanh (Chọn loại trứng trước)';
          rows.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('pet_egg_hatch_all')
                .setLabel(quickHatchLabel.slice(0, 80))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!selectedEggId || quickHatchCount === 0)
            )
          );
        }

        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('btn_back')
            .setLabel('↩️ Quay Lại')
            .setStyle(ButtonStyle.Secondary)
        );
        if (myPets.length > 0) {
          actionRow.addComponents(
            new ButtonBuilder()
              .setCustomId('pet_quick_release_menu')
              .setLabel('💥 Phóng Sinh Nhanh')
              .setStyle(ButtonStyle.Danger)
          );
        }
        rows.push(actionRow);
      }

      else if (menu === 'PET_QUICK_RELEASE') {
        const matchedPets = myPets.filter(p => !p.isActive &&
          (releaseFilterSpecies === 'all' || config.PET_TEMPLATES[p.type]?.species === releaseFilterSpecies) &&
          (releaseFilterBloodline === 'all' || p.rarity === releaseFilterBloodline)
        );

        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('pet_release_filter_species')
              .setPlaceholder('Chọn chủng loài cần lọc...')
              .addOptions([
                { label: '🐾 Tất cả chủng loài', value: 'all' },
                { label: '🐺 Lang (Ma Lang)', value: 'ma_lang' },
                { label: '🦋 Điệp (Lôi Điệp)', value: 'loi_diep' },
                { label: '🦍 Viên (Thần Viên)', value: 'than_vien' },
                { label: '🐯 Hổ (Linh Hổ)', value: 'linh_ho' },
                { label: '🦊 Hồ (Linh Hồ)', value: 'linh_ho_fox' },
                { label: '🐉 Long (Tổ Long)', value: 'to_long' },
                { label: '🦅 Phượng (Phượng Hoàng)', value: 'phuong_hoang' },
                { label: '🦄 Lân (Kỳ Lân)', value: 'ky_lan' },
                { label: '🐢 Vũ (Huyền Vũ)', value: 'huyen_vu' },
                { label: '🐅 Hổ Thần (Bạch Hổ)', value: 'bach_ho' }
              ])
          )
        );

        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('pet_release_filter_bloodline')
              .setPlaceholder('Chọn phẩm cấp huyết mạch...')
              .addOptions([
                { label: '✨ Tất cả huyết mạch', value: 'all' },
                { label: '🐾 Hoang Dã (LT_1)', value: 'LT_1' },
                { label: '✨ Linh Thuần (LT_2)', value: 'LT_2' },
                { label: '👑 Vương Giả (LT_3)', value: 'LT_3' },
                { label: '🌟 Hoàng Kim (LT_4)', value: 'LT_4' },
                { label: '🦖 Thái Cổ (TT_1)', value: 'TT_1' },
                { label: '🌀 Hỗn Độn (TT_2)', value: 'TT_2' },
                { label: '🌋 Hồng Hoang (TT_3)', value: 'TT_3' },
                { label: '🌌 Khởi Nguyên (TT_4)', value: 'TT_4' }
              ])
          )
        );

        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('pet_release_execute')
              .setLabel(`💥 Phóng Sinh ${matchedPets.length} Linh Thú`)
              .setStyle(ButtonStyle.Danger)
              .setDisabled(matchedPets.length === 0),
            new ButtonBuilder()
              .setCustomId('btn_back')
              .setLabel('↩️ Hủy Bỏ')
              .setStyle(ButtonStyle.Secondary)
          )
        );
      }

      // ══════════════════════════════════════════════════════════════
      // 7. CHI TIẾT SỦNG VẬT (PET_DETAIL)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'PET_DETAIL') {
        const pet = myPets.find(p => String(p.id) === String(selectedPetId));
        const foods = sellableList.filter(e => e.item.id.startsWith('van_yeu_qua_') || e.item.id === 'hoa_than_dan');

        const actionRow1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('pet_action_active')
            .setLabel(pet?.isActive ? '💤 Cho Nghỉ Ngơi' : '⚔️ Cho Xuất Chiến')
            .setStyle(pet?.isActive ? ButtonStyle.Secondary : ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('pet_action_reset')
            .setLabel('🔄 Trùng Sinh (Reset)')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('pet_action_renounce')
            .setLabel('💥 Phóng Sinh (Thả)')
            .setStyle(ButtonStyle.Danger)
        );
        rows.push(actionRow1);

        const FOOD_PAGE_SIZE = 23;
        const totalFoodPages = foods.length > 0 ? Math.ceil(foods.length / FOOD_PAGE_SIZE) : 1;
        if (foodPage >= totalFoodPages) foodPage = Math.max(0, totalFoodPages - 1);
        const foodsThisPage = foods.slice(foodPage * FOOD_PAGE_SIZE, (foodPage + 1) * FOOD_PAGE_SIZE);

        if (foods.length > 0) {
          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('pet_action_feed_menu')
                .setPlaceholder(`🍼 Chọn thức ăn... (Trang ${foodPage + 1}/${totalFoodPages})`)
                .addOptions(foodsThisPage.map(f => ({
                  label: `${f.item.ten} (Có: ${f.soLuong})`,
                  value: f.item.id
                })))
            )
          );
        } else {
          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('pet_action_feed_menu_disabled')
                .setPlaceholder('⚠️ Bạn không có thức ăn (Vạn yêu quả/Hoá thần đan) nào')
                .setDisabled(true)
                .addOptions([{ label: '(Trống)', value: '__empty__' }])
            )
          );
        }

        const enhanceCost = pet ? config.getPotentialUpgradeCost(pet.tuChat) : 500;
        const enhanceLabel = (pet && pet.tuChat >= 5000)
          ? `✨ Tư Chất Cực Hạn (5000)`
          : `✨ Tăng Tư Chất (+10) [Tốn ${enhanceCost.toLocaleString()} 🪙]`;

        const actionRow3 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('btn_back')
            .setLabel('↩️ Quay Lại')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('pet_action_enhance')
            .setLabel(enhanceLabel)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!pet || tuSi.linhThach < enhanceCost || pet.tuChat >= 5000)
        );

        if (pet) {
          const reqs = config.getBloodlineUpgradeReqs(pet.rarity, pet.tienHoa, pet.type);
          if (!reqs) {
            actionRow3.addComponents(
              new ButtonBuilder()
                .setCustomId('pet_action_evolve_disabled')
                .setLabel('🧬 Huyết Mạch Cực Hạn (MAX)')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true)
            );
          } else if (reqs.type === 'minor') {
            const phachConf = config.ITEMS.find(item => item.id === reqs.phachId);
            actionRow3.addComponents(
              new ButtonBuilder()
                .setCustomId('pet_action_evolve')
                .setLabel(`🧬 Nâng Cấp [Cần ${reqs.count} ${phachConf?.ten || reqs.phachId}]`)
                .setStyle(ButtonStyle.Success)
            );
          } else {
            const phachConf = config.ITEMS.find(item => item.id === reqs.phachId);
            const nextGradeLabel = config.PET_BLOODLINE_LABELS[reqs.nextGrade];
            const copiesLabel = reqs.copiesReq > 0 ? ` & ${reqs.copiesReq} Phôi` : '';
            actionRow3.addComponents(
              new ButtonBuilder()
                .setCustomId('pet_action_evolve')
                .setLabel(`🧬 Đột Phá -> ${nextGradeLabel} [Cần ${reqs.phachCount} Phách${copiesLabel}]`)
                .setStyle(ButtonStyle.Success)
            );
          }
        }
        rows.push(actionRow3);
      }

      else if (menu === 'PET_RESET_CONFIRM') {
        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('pet_reset_confirm_yes')
              .setLabel('🔄 Đồng Ý Trùng Sinh')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('pet_reset_confirm_no')
              .setLabel('↩️ Hủy Bỏ')
              .setStyle(ButtonStyle.Secondary)
          )
        );
      }
      else if (menu === 'PET_RENOUNCE_CONFIRM') {
        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('pet_renounce_confirm_yes')
              .setLabel('💥 Đồng Ý Phóng Sinh')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('pet_renounce_confirm_no')
              .setLabel('↩️ Hủy Bỏ')
              .setStyle(ButtonStyle.Secondary)
          )
        );
      }

      // ══════════════════════════════════════════════════════════════
      // 7.1. CHỌN LINH THÚ DUNG HỢP (PET_FUSION_SELECT)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'PET_FUSION_SELECT') {
        const otherPets = myPets.filter(p => {
          const isThan = ['to_long_1', 'to_long_2', 'phuong_hoang_1', 'phuong_hoang_2', 'ky_lan_1', 'ky_lan_2', 'huyen_vu_1', 'huyen_vu_2', 'bach_ho_1', 'bach_ho_2'].includes(p.type);
          return String(p.id) !== String(selectedPetId) && !p.isActive && !isThan;
        });
        const FUSION_PAGE_SIZE = 15;
        const totalFusionPages = otherPets.length > 0 ? Math.ceil(otherPets.length / FUSION_PAGE_SIZE) : 1;
        if (fusionPage >= totalFusionPages) fusionPage = Math.max(0, totalFusionPages - 1);
        const fusionPetsThisPage = otherPets.slice(fusionPage * FUSION_PAGE_SIZE, (fusionPage + 1) * FUSION_PAGE_SIZE);

        if (fusionPetsThisPage.length > 0) {
          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('pet_fusion_target_select')
                .setPlaceholder(`🐾 Chọn Linh Thú nguyên liệu... (Trang ${fusionPage + 1}/${totalFusionPages})`)
                .addOptions(fusionPetsThisPage.map(p => ({
                  label: p.name,
                  value: String(p.id),
                  description: `Cấp ${p.level} · ${config.PET_TEMPLATES[p.type]?.name || p.type}`.substring(0, 100)
                })))
            )
          );
        } else {
          rows.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('dummy_no_pets')
                .setLabel('Không còn Linh Thú khác')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            )
          );
        }

        if (totalFusionPages > 1) {
          rows.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('pet_fusion_page_prev')
                .setLabel('◀ Trang Trước')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(fusionPage === 0),
              new ButtonBuilder()
                .setCustomId('pet_fusion_page_next')
                .setLabel('Trang Sau ▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(fusionPage >= totalFusionPages - 1)
            )
          );
        }

        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('btn_back')
              .setLabel('↩️ Quay Lại')
              .setStyle(ButtonStyle.Secondary)
          )
        );
      }

      // ══════════════════════════════════════════════════════════════
      // 7.2. XÁC NHẬN DUNG HỢP (PET_FUSION_CONFIRM)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'PET_FUSION_CONFIRM') {
        const petA = myPets.find(p => String(p.id) === String(selectedPetId));
        const petB = myPets.find(p => String(p.id) === String(selectedFusePetId));

        let canFuse = false;
        if (petA && petB) {
          const isThanA = ['to_long_1', 'to_long_2', 'phuong_hoang_1', 'phuong_hoang_2', 'ky_lan_1', 'ky_lan_2', 'huyen_vu_1', 'huyen_vu_2', 'bach_ho_1', 'bach_ho_2'].includes(petA.type);
          const isThanB = ['to_long_1', 'to_long_2', 'phuong_hoang_1', 'phuong_hoang_2', 'ky_lan_1', 'ky_lan_2', 'huyen_vu_1', 'huyen_vu_2', 'bach_ho_1', 'bach_ho_2'].includes(petB.type);
          const cost = (isThanA || isThanB) ? 100000 : 5000;
          canFuse = tuSi.linhThach >= cost && !petA.isActive && !petB.isActive;
        }

        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('btn_back')
              .setLabel('❌ Hủy Bỏ')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId('pet_action_fuse_confirm')
              .setLabel('🔥 Xác Nhận Dung Hợp')
              .setStyle(ButtonStyle.Danger)
              .setDisabled(!canFuse)
          )
        );
      }

      else if (menu === 'PET_EVOLVE_CONFIRM') {
        const pet = myPets.find(p => String(p.id) === String(selectedPetId));
        if (pet) {
          const reqs = config.getBloodlineUpgradeReqs(pet.rarity, pet.tienHoa, pet.type);
          if (reqs) {
            const phachInv = await Inventory.findOne({
              where: { idNguoiDung: tuSi.idNguoiDung, itemId: reqs.phachId }
            });
            const phachOwned = phachInv ? phachInv.soLuong : 0;
            const reqPhachCount = reqs.type === 'minor' ? reqs.count : reqs.phachCount;
            const hasEnoughPhach = phachOwned >= reqPhachCount;

            const candidates = myPets.filter(fodder => fodder.type === pet.type && !fodder.isActive && fodder.id !== pet.id);
            const reqCopies = reqs.type === 'major' ? reqs.copiesReq : 0;
            const isSelectionComplete = selectedFodderIds.length === reqCopies;

            const isPotentialOk = reqs.type === 'minor' || pet.tuChat >= reqs.potentialReq;

            if (reqCopies > 0 && !isSelectionComplete) {
              const availableFodder = candidates.filter(c => !selectedFodderIds.includes(c.id));
              if (availableFodder.length > 0) {
                const selectOptions = availableFodder.slice(0, 25).map(c => ({
                  label: c.name.substring(0, 50),
                  value: String(c.id),
                  description: `Cấp ${c.level} | ${config.PET_BLOODLINE_LABELS[c.rarity] || c.rarity}`.substring(0, 100)
                }));
                rows.push(
                  new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                      .setCustomId('pet_evolve_fodder_select')
                      .setPlaceholder(`Chọn phôi sủng vật làm nguyên liệu (Cần ${reqCopies} phôi)...`)
                      .addOptions(selectOptions)
                  )
                );
              }
            }

            const btnRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('pet_evolve_cancel')
                .setLabel('❌ Hủy Bỏ')
                .setStyle(ButtonStyle.Secondary)
            );

            if (reqCopies > 0 && !isSelectionComplete) {
              btnRow.addComponents(
                new ButtonBuilder()
                  .setCustomId('pet_evolve_auto_select')
                  .setLabel('🤖 Tự Động Chọn Phôi')
                  .setStyle(ButtonStyle.Primary)
                  .setDisabled(candidates.length < reqCopies)
              );
            } else {
              btnRow.addComponents(
                new ButtonBuilder()
                  .setCustomId('pet_evolve_confirm')
                  .setLabel(reqs.type === 'minor' ? '🔥 Xác Nhận Nâng Cấp' : '🔥 Xác Nhận Đột Phá')
                  .setStyle(ButtonStyle.Danger)
                  .setDisabled(!hasEnoughPhach || !isPotentialOk)
              );

              if (reqCopies > 0) {
                btnRow.addComponents(
                  new ButtonBuilder()
                    .setCustomId('pet_evolve_reset_fodder')
                    .setLabel('🔄 Chọn Lại')
                    .setStyle(ButtonStyle.Secondary)
                );
              }
            }

            rows.push(btnRow);
          }
        }
      }

      // ══════════════════════════════════════════════════════════════
      // 8. ĐẬP ĐÁ (STONE_SMASH)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'STONE_SMASH') {
        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('smash_normal')
              .setLabel('💎 Đá Thường (100k)')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(tuSi.linhThach < 100000),
            new ButtonBuilder()
              .setCustomId('smash_epic')
              .setLabel('💎 Đá Quý (1M)')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(tuSi.linhThach < 1000000),
            new ButtonBuilder()
              .setCustomId('smash_ancient')
              .setLabel('💎 Đá Cổ (10M)')
              .setStyle(ButtonStyle.Success)
              .setDisabled(tuSi.linhThach < 10000000)
          )
        );

        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('btn_back')
              .setLabel('↩️ Quay Lại')
              .setStyle(ButtonStyle.Secondary)
          )
        );
      }

      return rows;
    };

    // ── TIẾN HÀNH RENDER VÀ LẮNG NGHE TƯƠNG TÁC ───────────────────────────────
    const getFilesToSend = async () => {
      const filesToSend = [];
      const pet = await Pet.findByPk(selectedPetId);
      if (pet && getCurrentMenu() === 'PET_DETAIL') {
        const stage = config.getPetStage(pet.rarity);
        const lineage = config.NEW_PET_LINEAGES[pet.type];
        const stageConf = lineage?.stages[stage];
        if (stageConf) {
          let subDir = '';
          if (pet.type === 'hoa_hau') subDir = 'xich_yeu_hau';
          else if (pet.type === 'bang_dieu') subDir = 'bang_vu_dieu';
          else if (pet.type === 'nham_giap') subDir = 'nham_giap_thu';
          else if (pet.type === 'da_mieu') subDir = 'da_mieu';
          else if (pet.type === 'thanh_loc') subDir = 'thanh_loc';

          const imgPath = `public/image/pet/${subDir}/${stageConf.image}`;
          if (fs.existsSync(imgPath)) {
            filesToSend.push(new AttachmentBuilder(imgPath));
          }
        }
      }
      return filesToSend;
    };

    let myInventory = await loadPlayerInventory(tuSi.idNguoiDung);
    let myPets = await Pet.findAll({ where: { userId: tuSi.idNguoiDung } });

    const msg = await interaction.editReply({
      embeds: await buildEmbeds(),
      components: await buildComponents(myInventory, myPets),
      files: await getFilesToSend()
    });

    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 300_000 // Tương tác Động phủ trong 5 phút
    });

    collector.on('collect', async i => {
      await i.deferUpdate();

      const currentMenu = getCurrentMenu();

      // ── XỬ LÝ NÚT BACK ───────────────────────────────────────────────────
      if (i.customId === 'btn_back') {
        if (menuStack.length > 1) {
          menuStack.pop();
        } else {
          collector.stop('closed');
          return;
        }
        const nextMenu = getCurrentMenu();
        if (nextMenu !== 'PET_DETAIL' && nextMenu !== 'PET_FUSION_SELECT' && nextMenu !== 'PET_EVOLVE_CONFIRM') {
          selectedPetId = null;
          selectedFodderIds = [];
        }
        if (nextMenu !== 'PET_FUSION_CONFIRM') {
          selectedFusePetId = null;
        }
        if (nextMenu !== 'PET_QUICK_RELEASE') {
          releaseFilterSpecies = 'all';
          releaseFilterBloodline = 'all';
        }
        selectedSlotIndex = null;
        foodPage = 0; // Reset trang thức ăn khi quay lại
      }

      // ── XỬ LÝ MAIN MENU ──────────────────────────────────────────────────
      else if (currentMenu === 'MAIN') {
        if (i.customId === 'main_build') {
          if (tuSi.linhThach >= 10000) {
            tuSi.linhThach -= 10000;
            tuSi.theLucMax = (tuSi.theLucMax || 200) + 1;
            tuSi.theLuc = (tuSi.theLuc || 200) + 1;
            await tuSi.save();
            abode.level = 1;
            await abode.save();

            // Tạo sẵn 2 ô đất đầu tiên
            await GardenPlot.findOrCreate({ where: { userId: tuSi.idNguoiDung, slotIndex: 0 } });
            await GardenPlot.findOrCreate({ where: { userId: tuSi.idNguoiDung, slotIndex: 1 } });

            actionMessage = BoTaoEmbed.thanhCong('🏰 Xây Dựng Động Phủ Thành Công', 'Chúc mừng đạo hữu đã chính thức khai hoang lập phủ!');
          }
        } else if (i.customId === 'main_upgrade') {
          const cost = ABODE_UPGRADE_BASE_COST * Math.pow(10, abode.level);
          if (tuSi.linhThach >= cost && abode.level < MAX_ABODE_LEVEL) {
            tuSi.linhThach -= cost;
            tuSi.theLucMax = (tuSi.theLucMax || 200) + 1;
            tuSi.theLuc = (tuSi.theLuc || 200) + 1;
            await tuSi.save();
            abode.level += 1;
            await abode.save();
            actionMessage = BoTaoEmbed.thanhCong('⚡ Nâng Cấp Thành Công', `Động phủ đã đạt Cấp ${abode.level}! Tốc độ tu luyện tăng mạnh.`);
          }
        } else if (i.customId === 'btn_garden') {
          menuStack.push('GARDEN');
        } else if (i.customId === 'btn_alchemy') {
          menuStack.push('ALCHEMY');
        } else if (i.customId === 'btn_forge') {
          menuStack.push('FORGE');
        } else if (i.customId === 'btn_pets') {
          menuStack.push('PETS');
          petPage = 0;
        } else if (i.customId === 'btn_stone_smash') {
          menuStack.push('STONE_SMASH');
        } else if (i.customId === 'main_close') {
          collector.stop('closed');
          return;
        }
      }

      // ── XỬ LÝ DƯỢC VIÊN (GARDEN) ──────────────────────────────────────────
      else if (currentMenu === 'GARDEN') {
        if (i.customId === 'garden_slot_select') {
          selectedSlotIndex = parseInt(i.values[0], 10);
          seedPage = 0; // Reset trang hạt giống khi vào ô mới
          menuStack.push('GARDEN_SLOT');
        } else if (i.customId === 'garden_page_prev') {
          gardenPage = Math.max(0, gardenPage - 1);
        } else if (i.customId === 'garden_page_next') {
          gardenPage += 1;
        } else if (i.customId === 'garden_water') {
          const waterCount = abode.waterCount || 0;
          const waterCost = WATERING_COST_BASE * Math.pow(10, waterCount - 3);

          let proceedWater = false;
          if (waterCount < 3) {
            proceedWater = true;
          } else if (tuSi.linhThach >= waterCost) {
            tuSi.linhThach -= waterCost;
            await tuSi.save();
            proceedWater = true;
          }

          if (proceedWater) {
            abode.waterCount += 1;
            await abode.save();

            // Tưới nước: đẩy mốc planted_at của toàn bộ ô lùi về quá khứ 300 phút (tương đương 20 Đạo Niên)
            const plots = await GardenPlot.findAll({ where: { userId: tuSi.idNguoiDung, status: 'PLANTED' } });
            for (const p of plots) {
              const newPlantedTime = new Date(new Date(p.plantedAt).getTime() - 300 * 60 * 1000);
              p.plantedAt = newPlantedTime;
              await p.save();
            }

            actionMessage = BoTaoEmbed.thanhCong('💦 Tưới Nước Linh Thảo', 'Linh dịch ngọt lành đã thẩm thấu, rút ngắn thời gian sinh trưởng đi 20 Đạo Niên!');
          }
        } else if (i.customId === 'garden_buy_slot') {
          const plots = await GardenPlot.findAll({ where: { userId: tuSi.idNguoiDung } });
          const currentPlots = plots.length;
          const slotCost = 10000 * Math.pow(10, currentPlots - 2);

          if (tuSi.linhThach >= slotCost && currentPlots < MAX_GARDEN_PLOTS) {
            tuSi.linhThach -= slotCost;
            await tuSi.save();

            await GardenPlot.create({
              userId: tuSi.idNguoiDung,
              slotIndex: currentPlots,
              status: 'EMPTY'
            });

            actionMessage = BoTaoEmbed.thanhCong('🔓 Mở Ô Đất Mới', `Đã khai hoang thêm ô đất số ${currentPlots + 1} thành công.`);
          }
        } else if (i.customId === 'garden_quick_plant') {
          // Trồng nhanh: gieo hạt giống đã cài đặt lên toàn bộ ô đất trống
          if (abode.quickSeedId) {
            const allPlots = await GardenPlot.findAll({ where: { userId: tuSi.idNguoiDung } });
            const emptyPlotsQ = allPlots.filter(p => p.status === 'EMPTY');
            const seedInv = await Inventory.findOne({ where: { idNguoiDung: tuSi.idNguoiDung, itemId: abode.quickSeedId } });
            if (emptyPlotsQ.length > 0 && seedInv && seedInv.soLuong > 0) {
              const plantCount = Math.min(emptyPlotsQ.length, seedInv.soLuong);
              for (let idx = 0; idx < plantCount; idx++) {
                emptyPlotsQ[idx].seedItemId = abode.quickSeedId;
                emptyPlotsQ[idx].plantedAt = new Date();
                emptyPlotsQ[idx].status = 'PLANTED';
                await emptyPlotsQ[idx].save();
              }
              seedInv.soLuong -= plantCount;
              if (seedInv.soLuong <= 0) await seedInv.destroy();
              else await seedInv.save();
              const seedItem = config.ITEMS.find(e => e.id === abode.quickSeedId);
              actionMessage = BoTaoEmbed.thanhCong(
                '🌱 Trồng Nhanh Thành Công',
                `Đã gieo **${plantCount}** hạt giống **${seedItem?.ten ?? abode.quickSeedId}** vào ${plantCount} ô đất trống.`
              );
            } else if (emptyPlotsQ.length === 0) {
              actionMessage = BoTaoEmbed.loi('Không còn ô đất trống nào để trồng!');
            } else {
              actionMessage = BoTaoEmbed.loi('Không đủ hạt giống trong túi đồ để trồng nhanh!');
            }
          }
        } else if (i.customId === 'garden_quick_harvest') {
          // Thu hoạch nhanh: thu toàn bộ ô đất đã sẵn sàng thu hoạch
          const allPlots = await GardenPlot.findAll({ where: { userId: tuSi.idNguoiDung } });
          const harvested = [];
          for (const p of allPlots) {
            const ageRes = getPlotAgeAndHerb(p);
            if (p.status === 'PLANTED' && ageRes.ready && ageRes.herbId) {
              await Inventory.addVatPham(tuSi.idNguoiDung, ageRes.herbId, 1);
              harvested.push(ageRes.herbName);
              p.seedItemId = null;
              p.plantedAt = null;
              p.status = 'EMPTY';
              await p.save();
            }
          }
          if (harvested.length > 0) {
            // Gom nhóm thu hoạch cho đẹp
            const tally = {};
            for (const name of harvested) tally[name] = (tally[name] || 0) + 1;
            const harvestLines = Object.entries(tally).map(([name, cnt]) => `• **${name}** x${cnt}`).join('\n');
            actionMessage = BoTaoEmbed.thanhCong(
              '🌾 Thu Hoạch Nhanh Thành Công',
              `Đã thu hoạch **${harvested.length}** ô đất:\n${harvestLines}`
            );
          } else {
            actionMessage = BoTaoEmbed.loi('Không có ô đất nào đã sẵn sàng thu hoạch!');
          }
        } else if (i.customId === 'garden_config_quick') {
          // Chuyển sang menu cài đặt trồng nhanh
          seedPage = 0;
          menuStack.push('GARDEN_CONFIG_QUICK');
        }
      }

      // ── XỬ LÝ CHI TIẾT Ô ĐẤT (GARDEN_SLOT) ─────────────────────────────────
      else if (currentMenu === 'GARDEN_SLOT') {
        const plot = await GardenPlot.findOne({ where: { userId: tuSi.idNguoiDung, slotIndex: selectedSlotIndex } });

        if (i.customId === 'seed_page_prev') {
          seedPage = Math.max(0, seedPage - 1);
        } else if (i.customId === 'seed_page_next') {
          seedPage += 1;
        } else if (i.customId === 'garden_plant_seed') {
          const seedId = i.values[0];
          const inv = await Inventory.findOne({ where: { idNguoiDung: tuSi.idNguoiDung, itemId: seedId } });
          if (inv && inv.soLuong > 0) {
            inv.soLuong -= 1;
            if (inv.soLuong <= 0) await inv.destroy();
            else await inv.save();

            plot.seedItemId = seedId;
            plot.plantedAt = new Date();
            plot.status = 'PLANTED';
            await plot.save();

            actionMessage = BoTaoEmbed.thanhCong('🌱 Gieo Hạt Thành Công', 'Linh chủng đã được chôn vào đất ẩm, hãy chờ đợi thu hoạch.');
            menuStack.pop(); // quay lại garden
          }
        } else if (i.customId === 'garden_harvest') {
          const ageResult = getPlotAgeAndHerb(plot);
          if (plot.status === 'PLANTED' && ageResult.ready) {
            // Thêm linh thảo vào balo
            await Inventory.addVatPham(tuSi.idNguoiDung, ageResult.herbId, 1);

            // Reset ô đất
            plot.seedItemId = null;
            plot.plantedAt = null;
            plot.status = 'EMPTY';
            await plot.save();

            actionMessage = BoTaoEmbed.thanhCong(
              '🌾 Thu Hoạch Linh Thảo',
              `Chúc mừng đạo hữu thu hoạch được **${ageResult.herbName}** và cất vào túi trữ vật!`
            );
            menuStack.pop();
          }
        }
      }

      // ── XỬ LÝ CÀI ĐẶT TRỒNG NHANH (GARDEN_CONFIG_QUICK) ─────────────────────
      else if (currentMenu === 'GARDEN_CONFIG_QUICK') {
        if (i.customId === 'seed_page_prev') {
          seedPage = Math.max(0, seedPage - 1);
        } else if (i.customId === 'seed_page_next') {
          seedPage += 1;
        } else if (i.customId === 'garden_select_quick_seed') {
          const selectedSeedId = i.values[0];
          abode.quickSeedId = selectedSeedId;
          await abode.save();
          const selectedSeedItem = config.ITEMS.find(e => e.id === selectedSeedId);
          actionMessage = BoTaoEmbed.thanhCong(
            '⚙️ Cài Đặt Thành Công',
            `Đã thiết lập **${selectedSeedItem?.ten ?? selectedSeedId}** làm hạt giống trồng nhanh mặc định.`
          );
          menuStack.pop(); // Quay lại GARDEN
        }
      }

      // ── XỬ LÝ LUYỆN ĐAN (ALCHEMY) ─────────────────────────────────────────
      else if (currentMenu === 'ALCHEMY') {
        if (i.customId === 'herb_page_prev') {
          herbPage = Math.max(0, herbPage - 1);
        } else if (i.customId === 'herb_page_next') {
          herbPage += 1;
        } else if (i.customId === 'pill_page_prev') {
          pillPage = Math.max(0, pillPage - 1);
        } else if (i.customId === 'pill_page_next') {
          pillPage += 1;
        } else if (i.customId === 'alchemy_craft_pills') {
          const herbId = i.values[0];
          const result = await this._processAlchemy(tuSi, herbId);
          actionResultEmbed(result);
        } else if (i.customId === 'alchemy_consume_pill') {
          const pillId = i.values[0];
          const result = await this._processConsumePill(tuSi, abode, pillId);
          actionResultEmbed(result);
        }
      }

      // ── XỬ LÝ LUYỆN KHÍ (FORGE) ───────────────────────────────────────────
      else if (currentMenu === 'FORGE') {
        if (i.customId === 'forge_recipe_select') {
          const recipeVal = i.values[0];
          const [oldId, newId] = recipeVal.split('::');
          const result = await this._processForge(tuSi, oldId, newId);
          actionResultEmbed(result);
        }
      }

      // ── XỬ LÝ SỦNG VẬT (PETS) ─────────────────────────────────────────────
      else if (currentMenu === 'PETS') {
        if (i.customId === 'pet_select') {
          selectedPetId = parseInt(i.values[0], 10);
          foodPage = 0; // Reset trang thức ăn khi chọn sủng vật mới
          menuStack.push('PET_DETAIL');
        } else if (i.customId === 'pet_page_prev') {
          petPage = Math.max(0, petPage - 1);
        } else if (i.customId === 'pet_page_next') {
          const PET_PAGE_SIZE = 10;
          const maxPage = Math.ceil(myPets.length / PET_PAGE_SIZE) - 1;
          petPage = Math.min(maxPage, petPage + 1);
        } else if (i.customId === 'pet_quick_release_menu') {
          menuStack.push('PET_QUICK_RELEASE');
          releaseFilterSpecies = 'all';
          releaseFilterBloodline = 'all';
        } else if (i.customId === 'pet_egg_hatch') {
          const eggId = i.values[0];
          // Ghi nhớ loại trứng người chơi đã chọn để ấp nhanh
          selectedEggId = eggId;
          const hasVideo = eggId === 'trung_linh_thu_tien' || eggId === 'trung_linh_thu_than';

          if (hasVideo) {
            const { AttachmentBuilder } = await import('discord.js');
            const videoPath = eggId === 'trung_linh_thu_tien'
              ? './public/video/pet/dap_trung.mp4'
              : './public/video/pet/dap_trung_than.mp4';
            const eggNameText = eggId === 'trung_linh_thu_tien' ? 'Trứng Linh Thú (Tiên)'
              : 'Trứng Linh Thú (Thần)';

            // Tạm thời disable các components và gửi video kèm thông báo chờ
            const tempEmbed = new EmbedBuilder()
              .setTitle('🥚 Tiến Trình Ấp Trứng')
              .setDescription(`Đang tiến hành ấp **${eggNameText}**, đạo hữu hãy kiên nhẫn chờ trong giây lát...`)
              .setColor(0xf39c12)
              .setTimestamp();

            await i.editReply({
              embeds: [tempEmbed],
              files: [new AttachmentBuilder(videoPath)],
              components: await buildComponents(myInventory, myPets, true) // Disable all components during animation
            });

            // Chờ 4 giây (để chạy video ấp trứng)
            await new Promise(resolve => setTimeout(resolve, 4000));

            // Tiến hành ấp trứng
            const result = await this._processHatchEgg(tuSi, eggId);

            // Cập nhật lại kho đồ & sủng vật sau khi ấp trứng thành công
            myInventory = await loadPlayerInventory(tuSi.idNguoiDung);
            myPets = await Pet.findAll({ where: { userId: tuSi.idNguoiDung } });

            // Thiết lập actionMessage
            actionMessage = result.ok
              ? BoTaoEmbed.thanhCong('🐣 Ấp Trứng Thành Công', result.msg)
              : BoTaoEmbed.loi(result.msg);

            // Update reply gốc (xóa files cũ)
            await i.editReply({
              embeds: await buildEmbeds(),
              files: [], // Xóa file video cũ để tránh lag
              components: await buildComponents(myInventory, myPets)
            });
            return;
          } else {
            const result = await this._processHatchEgg(tuSi, eggId);
            actionResultEmbed(result);
          }

        } else if (i.customId === 'pet_egg_hatch_all') {
          // ── ẤP NHANH TẤT CẢ TRỨNG CÙNG LOẠI ──────────────────────────────
          if (!selectedEggId) {
            actionMessage = BoTaoEmbed.loi('Đạo hữu chưa chọn loại trứng. Hãy chọn loại trứng từ menu thả xuống trước.');
          } else {
            const invEgg = await Inventory.findOne({ where: { idNguoiDung: tuSi.idNguoiDung, itemId: selectedEggId } });
            if (!invEgg || invEgg.soLuong <= 0) {
              actionMessage = BoTaoEmbed.loi('Đạo hữu không còn trứng loại này trong balo.');
              selectedEggId = null;
            } else {
              const totalEggs = invEgg.soLuong;
              const hatchResults = [];
              let successCount = 0;

              // Ấp từng quả một (không có video cho ấp nhanh)
              for (let idx = 0; idx < totalEggs; idx++) {
                const result = await this._processHatchEgg(tuSi, selectedEggId);
                if (result.ok) {
                  successCount++;
                  if (result.pet) hatchResults.push(result.pet);
                } else {
                  break; // Hết trứng
                }
              }

              myInventory = await loadPlayerInventory(tuSi.idNguoiDung);
              myPets = await Pet.findAll({ where: { userId: tuSi.idNguoiDung } });

              if (successCount === 0) {
                actionMessage = BoTaoEmbed.loi('Không ấp được quả trứng nào.');
              } else {
                const eggInv = myInventory.find(e => e.item.id === selectedEggId);
                const eggName = eggInv?.item?.ten || selectedEggId;
                actionMessage = BoTaoEmbed.thanhCong(
                  '⚡ Ấp Nhanh Hoàn Tất',
                  `Đạo hữu đã ấp thành công **${successCount}** quả **${eggName}**!\n` +
                  `Linh thú mới đã được thêm vào danh sách sủng vật. Hãy vào **Sủng Vật** để xem và quản lý.`
                );
                selectedEggId = null;
              }
            }
          }
        }
      }

      // ── XỬ LÝ CHI TIẾT SỦNG VẬT (PET_DETAIL) ──────────────────────────────
      else if (currentMenu === 'PET_DETAIL') {
        const pet = await Pet.findByPk(selectedPetId);

        if (pet) {
          const template = config.PET_TEMPLATES[pet.type];
          if (i.customId === 'pet_action_active') {
            if (pet.isActive) {
              pet.isActive = false;
              await pet.save();
              actionMessage = BoTaoEmbed.thanhCong('💤 Sủng vật thu hồi', `Đã cho **${pet.name}** về nghỉ ngơi.`);
            } else {
              const check = config.checkHuyetMachApChe(tuSi.capDo, pet.rarity);
              if (!check.allowed) {
                actionMessage = BoTaoEmbed.thatBai('🚫 Áp Chế Huyết Mạch', check.msg);
              } else {
                await Pet.update({ isActive: false }, { where: { userId: tuSi.idNguoiDung } });
                pet.isActive = true;
                await pet.save();
                actionMessage = BoTaoEmbed.thanhCong('⚔️ Sủng vật xuất chiến', `**${pet.name}** đã xuất chiến hộ mệnh đạo hữu.`);
              }
            }
          } else if (i.customId === 'pet_food_prev') {
            foodPage = Math.max(0, foodPage - 1);
          } else if (i.customId === 'pet_food_next') {
            const allFoods = myInventory.filter(e => e.item.id.startsWith('van_yeu_qua_') || e.item.id === 'hoa_than_dan');
            const maxPage = Math.ceil(allFoods.length / 23) - 1;
            foodPage = Math.min(maxPage, foodPage + 1);
          } else if (i.customId === 'pet_action_renounce') {
            menuStack.push('PET_RENOUNCE_CONFIRM');
          } else if (i.customId === 'pet_action_quick_feed') {
            const filterId = i.values[0];
            const levelCap = config.getPetLevelCap(pet);

            if (pet.level >= levelCap) {
              actionMessage = BoTaoEmbed.loi(`Sủng vật đã đạt cấp độ giới hạn ${levelCap}. Hãy tiến hóa để mở khóa giới hạn.`);
            } else {
              const allFoods = myInventory.filter(e => {
                if (e.item.food !== 1) return false;

                const isVanYeuQua = e.item.id.startsWith('van_yeu_qua_');
                if (!isVanYeuQua) return false;

                if (filterId === 'van_yeu_qua') return isVanYeuQua;
                if (filterId === 'linh_thao') return false;

                const expMap = {
                  van_yeu_qua_phe: 500,
                  van_yeu_qua_ha: 1000,
                  van_yeu_qua_trung: 2000,
                  van_yeu_qua_thuong: 4000,
                  van_yeu_qua_tien: 8000,
                  van_yeu_qua_than: 16000
                };
                let exp = expMap[e.item.id] || 500;

                if (filterId === 'quality_low') return exp < 2000;
                if (filterId === 'quality_high') return exp >= 2000;

                return true; // filter === 'all'
              });

              if (allFoods.length === 0) {
                actionMessage = BoTaoEmbed.loi('Không tìm thấy thức ăn nào trong balo khớp với bộ lọc đã chọn.');
              } else {
                let totalExpGained = 0;
                let startLevel = pet.level;
                let consumedItems = [];

                const getFoodExp = (foodId) => {
                  const expMap = {
                    van_yeu_qua_phe: 500,
                    van_yeu_qua_ha: 1000,
                    van_yeu_qua_trung: 2000,
                    van_yeu_qua_thuong: 4000,
                    van_yeu_qua_tien: 8000,
                    van_yeu_qua_than: 16000
                  };
                  if (foodId.startsWith('van_yeu_qua_')) {
                    return expMap[foodId] || 500;
                  }
                  const legacyExpMap = { luc: 20, lam: 60, tim: 200, vang: 600, do: 2000 };
                  const colorCode = foodId.split('_').pop();
                  return legacyExpMap[colorCode] || 20;
                };

                for (const food of allFoods) {
                  if (pet.level >= levelCap) break;

                  const expPerFood = getFoodExp(food.item.id);
                  let countToConsume = 0;

                  for (let k = 0; k < food.soLuong; k++) {
                    if (pet.level >= levelCap) break;

                    pet.exp += expPerFood;
                    totalExpGained += expPerFood;
                    countToConsume++;

                    while (pet.level < levelCap && pet.exp >= pet.level * 100) {
                      pet.exp -= pet.level * 100;
                      pet.level += 1;
                    }
                  }

                  if (countToConsume > 0) {
                    consumedItems.push({ inventoryItem: food, count: countToConsume });
                  }
                }

                if (totalExpGained === 0) {
                  actionMessage = BoTaoEmbed.loi('Không có thức ăn nào được tiêu thụ (có thể do sủng vật đã đạt cấp giới hạn).');
                } else {
                  for (const { inventoryItem, count } of consumedItems) {
                    const inv = await Inventory.findByPk(inventoryItem.invId);
                    if (inv) {
                      inv.soLuong -= count;
                      if (inv.soLuong <= 0) {
                        await inv.destroy();
                      } else {
                        await inv.save();
                      }
                    }
                  }
                  await pet.save();

                  const lvlUpCount = pet.level - startLevel;
                  actionMessage = BoTaoEmbed.thanhCong(
                    '⚡ Ăn Nhanh Thành Công',
                    `Cho **${pet.name}** ăn nhanh thành công:\n` +
                    `• Tiêu thụ: ${consumedItems.map(c => `**${c.inventoryItem.item.ten}** x${c.count}`).join(', ')}\n` +
                    `• Tổng EXP nhận được: \`+${totalExpGained.toLocaleString()} EXP\`\n` +
                    (lvlUpCount > 0 ? `• **Thăng cấp**: Từ Cấp **${startLevel}** lên Cấp **${pet.level}**! 🎉\n` : '') +
                    (pet.level === levelCap ? `• ⚠️ **Sủng vật đã chạm giới hạn Cấp ${levelCap}. Hãy tiến hóa.**` : '')
                  );
                }
              }
            }
          } else if (i.customId === 'pet_action_feed_menu') {
            const foodId = i.values[0];
            const inv = await Inventory.findOne({ where: { idNguoiDung: tuSi.idNguoiDung, itemId: foodId } });

            if (inv && inv.soLuong > 0) {
              const foodConf = config.ITEMS.find(item => item.id === foodId);
              const levelCap = config.getPetLevelCap(pet);

              if (foodId === 'hoa_than_dan') {
                if (pet.level >= 31) {
                  actionMessage = BoTaoEmbed.loi('Sủng vật đã đạt Cảnh Giới tối đa (Cấp 31)!');
                } else {
                  inv.soLuong -= 1;
                  if (inv.soLuong <= 0) await inv.destroy();
                  else await inv.save();

                  pet.level += 1;
                  await pet.save();
                  actionMessage = BoTaoEmbed.thanhCong(
                    '💊 Đột Phá Thành Công',
                    `Cho **${pet.name}** uống **${foodConf?.ten || 'Hóa Thần Đan'}** giúp sủng vật đột phá cảnh giới lên **Cấp ${pet.level}**! 🎉`
                  );
                }
              } else {
                // van_yeu_qua
                if (pet.level >= levelCap) {
                  actionMessage = BoTaoEmbed.loi(`Sủng vật đã đạt cấp độ giới hạn ${levelCap}. Hãy tiến hóa để mở khóa giới hạn.`);
                } else {
                  inv.soLuong -= 1;
                  if (inv.soLuong <= 0) await inv.destroy();
                  else await inv.save();

                  const expMap = {
                    van_yeu_qua_phe: 500,
                    van_yeu_qua_ha: 1000,
                    van_yeu_qua_trung: 2000,
                    van_yeu_qua_thuong: 4000,
                    van_yeu_qua_tien: 8000,
                    van_yeu_qua_than: 16000
                  };
                  const expGained = expMap[foodId] || 500;
                  pet.exp += expGained;
                  let lvlUp = false;
                  while (pet.level < levelCap && pet.exp >= pet.level * 100) {
                    pet.exp -= pet.level * 100;
                    pet.level += 1;
                    lvlUp = true;
                  }
                  await pet.save();
                  actionMessage = BoTaoEmbed.thanhCong(
                    '🍼 Cho Ăn Thành Công',
                    `Cho **${pet.name}** ăn **${foodConf?.ten || 'Vạn Yêu Quả'}** nhận \`+${expGained.toLocaleString()} EXP\`.` +
                    (lvlUp ? `\n🎉 **Sủng vật thăng lên Cấp ${pet.level}!**` : '') +
                    (pet.level === levelCap ? `\n⚠️ **Sủng vật đã chạm giới hạn Cấp ${levelCap}. Hãy tiến hóa.**` : '')
                  );
                }
              }
            } else {
              actionMessage = BoTaoEmbed.loi('Không tìm thấy thức ăn này trong hành trang.');
            }
          } else if (i.customId === 'pet_action_enhance') {
            const enhanceCost = config.getPotentialUpgradeCost(pet.tuChat);
            if (tuSi.linhThach >= enhanceCost && pet.tuChat < 5000) {
              tuSi.linhThach -= enhanceCost;
              await tuSi.save();

              pet.tuChat = Math.min(5000, pet.tuChat + 10);
              await pet.save();

              actionMessage = BoTaoEmbed.thanhCong(
                '✨ Tăng Cường Tư Chất',
                `Tư chất **${pet.name}** tăng thêm \`+10\` điểm (Hiện tại: \`${pet.tuChat}/5000\`).`
              );
            } else {
              actionMessage = BoTaoEmbed.thatBai('Tăng Tư Chất Thất Bại', 'Không đủ linh thạch hoặc đã đạt tư chất cực hạn.');
            }
          } else if (i.customId === 'pet_action_evolve') {
            menuStack.push('PET_EVOLVE_CONFIRM');
            selectedFodderIds = [];
          } else if (i.customId === 'pet_action_reset') {
            menuStack.push('PET_RESET_CONFIRM');
          }
        }
      }

      // ── XỬ LÝ XÁC NHẬN TRÙNG SINH (PET_RESET_CONFIRM) ─────────────────────
      else if (currentMenu === 'PET_RESET_CONFIRM') {
        const pet = await Pet.findByPk(selectedPetId);
        if (i.customId === 'pet_reset_confirm_yes') {
          if (pet) {
            let refundedStones = 0;
            const totalUpgrades = Math.floor((pet.tuChat - 100) / 10);
            for (let step = 0; step < totalUpgrades; step++) {
              refundedStones += Math.floor(500 * Math.pow(1.05, step));
            }
            tuSi.linhThach += refundedStones;

            const refundedPhach = {};
            let currentRarity = 'ha_pham';
            let currentTier = 1;
            while (currentRarity !== pet.rarity || currentTier !== pet.tienHoa) {
              const reqs = config.getBloodlineUpgradeReqs(currentRarity, currentTier, pet.type);
              if (!reqs) break;

              const phachId = reqs.phachId;
              const count = reqs.type === 'minor' ? reqs.count : reqs.phachCount;
              refundedPhach[phachId] = (refundedPhach[phachId] || 0) + count;

              if (reqs.type === 'minor') {
                currentTier = reqs.nextTier;
              } else {
                currentRarity = reqs.nextGrade;
                currentTier = reqs.nextTier;
              }
            }

            let refundListMsg = '';
            for (const [phachId, count] of Object.entries(refundedPhach)) {
              if (count > 0) {
                await Inventory.addVatPham(tuSi.idNguoiDung, phachId, count);
                const fDetail = config.ITEMS.find(item => item.id === phachId);
                refundListMsg += `\n• **${fDetail?.ten || phachId}** x${count}`;
              }
            }

            const totalExp = 50 * pet.level * (pet.level - 1) + pet.exp;
            const refundFruitsCount = Math.floor(totalExp / 500);
            if (refundFruitsCount > 0) {
              await Inventory.addVatPham(tuSi.idNguoiDung, 'van_yeu_qua', refundFruitsCount);
              refundListMsg += `\n• **Vạn Yêu Quả** x${refundFruitsCount}`;
            }

            await tuSi.save();

            pet.level = 1;
            pet.exp = 0;
            pet.tienHoa = 1;
            pet.tuChat = 100;
            pet.isMax = false;
            pet.rarity = 'ha_pham';
            const cleanName = pet.name.replace(/(\s\+\d+|\[MAX\]|\[Tiến\s*[Hh]óa\]\s*)/g, '').trim();
            pet.name = config.getFormattedPetName(cleanName, 'ha_pham', 1, false);
            await pet.save();

            actionMessage = BoTaoEmbed.thanhCong(
              '🔄 Trùng Sinh Sủng Vật Thành Công',
              `Đã trùng sinh **${pet.name}** thành công về Cấp 1.\n` +
              `**Hoàn trả**: \`+${refundedStones.toLocaleString()} Linh thạch\` 🪙${refundListMsg}`
            );
          }
          menuStack.pop();
        } else if (i.customId === 'pet_reset_confirm_no') {
          menuStack.pop();
        }
      }

      else if (currentMenu === 'PET_EVOLVE_CONFIRM') {
        const pet = await Pet.findByPk(selectedPetId);
        if (pet) {
          const reqs = config.getBloodlineUpgradeReqs(pet.rarity, pet.tienHoa, pet.type);
          const reqCopies = reqs?.type === 'major' ? reqs.copiesReq : 0;

          if (i.customId === 'pet_evolve_cancel') {
            menuStack.pop();
            selectedFodderIds = [];
          } else if (i.customId === 'pet_evolve_reset_fodder') {
            selectedFodderIds = [];
          } else if (i.customId === 'pet_evolve_auto_select') {
            const allMyPets = await Pet.findAll({ where: { userId: tuSi.idNguoiDung } });
            const candidates = allMyPets.filter(fodder => fodder.type === pet.type && !fodder.isActive && fodder.id !== pet.id);
            candidates.sort((a, b) => a.level - b.level);
            selectedFodderIds = candidates.slice(0, reqCopies).map(c => c.id);
          } else if (i.customId === 'pet_evolve_fodder_select') {
            const fid = parseInt(i.values[0], 10);
            if (!selectedFodderIds.includes(fid)) {
              selectedFodderIds.push(fid);
            }
          } else if (i.customId === 'pet_evolve_confirm') {
            if (!reqs) {
              actionMessage = BoTaoEmbed.thatBai('🧬 Tiến Hóa Thất Bại', 'Huyết mạch đã đạt cực hạn.');
            } else {
              const phachId = reqs.phachId;
              const reqPhachCount = reqs.type === 'minor' ? reqs.count : reqs.phachCount;

              const phachInv = await Inventory.findOne({
                where: { idNguoiDung: tuSi.idNguoiDung, itemId: phachId }
              });
              if (!phachInv || phachInv.soLuong < reqPhachCount) {
                actionMessage = BoTaoEmbed.thatBai('🧬 Tiến Hóa Thất Bại', 'Số lượng Yêu Phách không đủ.');
              } else if (reqs.type === 'major' && selectedFodderIds.length < reqs.copiesReq) {
                actionMessage = BoTaoEmbed.thatBai('🧬 Tiến Hóa Thất Bại', `Cần chọn đủ ${reqs.copiesReq} phôi sủng vật.`);
              } else if (reqs.type === 'major' && pet.tuChat < reqs.potentialReq) {
                actionMessage = BoTaoEmbed.thatBai('🧬 Tiến Hóa Thất Bại', `Cần tư chất sủng vật đạt tối thiểu ${reqs.potentialReq}.`);
              } else {
                phachInv.soLuong -= reqPhachCount;
                if (phachInv.soLuong <= 0) await phachInv.destroy();
                else await phachInv.save();

                const consumedList = [];
                if (reqs.type === 'major' && reqs.copiesReq > 0) {
                  for (const fid of selectedFodderIds) {
                    const fodder = await Pet.findByPk(fid);
                    if (fodder) {
                      consumedList.push(fodder.name);
                      await fodder.destroy();
                    }
                  }
                }

                let upgradeMsg = '';
                if (reqs.type === 'minor') {
                  pet.tienHoa = reqs.nextTier;
                  upgradeMsg = `Huyết mạch tiến hóa lên Cấp ${pet.tienHoa}/10!`;
                } else {
                  pet.rarity = reqs.nextGrade;
                  pet.tienHoa = reqs.nextTier;
                  upgradeMsg = `🎉 **ĐỘT PHÁ THÀNH CÔNG!** Huyết mạch thăng cấp lên **${config.PET_BLOODLINE_LABELS[pet.rarity]}**!`;
                }

                const cleanName = pet.name.replace(/(\s\+\d+|\[MAX\]|\[Tiến\s*[Hh]óa\]\s*)/g, '').trim();
                pet.name = config.getFormattedPetName(cleanName, pet.rarity, pet.tienHoa, false);
                await pet.save();

                actionMessage = BoTaoEmbed.thanhCong(
                  '🧬 Nâng Cấp Huyết Mạch Thành Công',
                  `Linh thú **${pet.name}** đã nâng cấp huyết mạch thành công!\n` +
                  `• ${upgradeMsg}\n` +
                  (consumedList.length > 0 ? `• **Đã tiêu thụ phôi**: ${consumedList.join(', ')}` : '')
                );

                selectedFodderIds = [];
                menuStack.pop();
              }
            }
          }
        }
      }

      // ── XỬ LÝ XÁC NHẬN PHÓNG SINH (PET_RENOUNCE_CONFIRM) ───────────────────
      else if (currentMenu === 'PET_RENOUNCE_CONFIRM') {
        const pet = await Pet.findByPk(selectedPetId);
        if (i.customId === 'pet_renounce_confirm_yes') {
          if (pet) {
            await pet.destroy();
            tuSi.congDuc = (tuSi.congDuc || 0) + 1;
            await tuSi.save();
            actionMessage = BoTaoEmbed.thanhCong('💥 Thả sủng vật', `Đạo hữu đã phóng sinh sủng vật thành công. Nhận được **+1** Điểm Công Đức!`);
          }
          menuStack.pop(); // Pop PET_RENOUNCE_CONFIRM
          menuStack.pop(); // Pop PET_DETAIL (Quay lại PETS)
          selectedPetId = null;
        } else if (i.customId === 'pet_renounce_confirm_no') {
          menuStack.pop(); // Quay lại PET_DETAIL
        }
      }

      // ── XỬ LÝ CHỌN LINH THÚ DUNG HỢP (PET_FUSION_SELECT) ──────────────────
      else if (currentMenu === 'PET_FUSION_SELECT') {
        if (i.customId === 'pet_fusion_target_select') {
          selectedFusePetId = parseInt(i.values[0], 10);
          const petB = myPets.find(p => p.id === selectedFusePetId);
          if (petB && petB.isActive) {
            actionMessage = BoTaoEmbed.thatBai('🧬 Dung Hợp Thất Bại', 'Không thể dung hợp Linh Thú đang xuất chiến. Hãy cho sủng vật nghỉ ngơi trước.');
            selectedFusePetId = null;
          } else {
            menuStack.push('PET_FUSION_CONFIRM');
          }
        } else if (i.customId === 'pet_fusion_page_prev') {
          fusionPage = Math.max(0, fusionPage - 1);
        } else if (i.customId === 'pet_fusion_page_next') {
          const otherPets = myPets.filter(p => String(p.id) !== String(selectedPetId));
          const FUSION_PAGE_SIZE = 15;
          const maxPage = Math.ceil(otherPets.length / FUSION_PAGE_SIZE) - 1;
          fusionPage = Math.min(maxPage, fusionPage + 1);
        }
      }

      // ── XỬ LÝ XÁC NHẬN DUNG HỢP (PET_FUSION_CONFIRM) ─────────────────────
      else if (currentMenu === 'PET_FUSION_CONFIRM') {
        if (i.customId === 'pet_action_fuse_confirm') {
          const petA = await Pet.findByPk(selectedPetId);
          const petB = await Pet.findByPk(selectedFusePetId);
          if (!petA || !petB) {
            actionMessage = BoTaoEmbed.thatBai('🧬 Dung Hợp Thất Bại', 'Không tìm thấy Linh Thú để tiến hành dung hợp.');
            menuStack = ['MAIN', 'PETS'];
            selectedPetId = null;
            selectedFusePetId = null;
          } else if (petA.isActive || petB.isActive) {
            actionMessage = BoTaoEmbed.thatBai('🧬 Dung Hợp Thất Bại', 'Không thể dung hợp Linh Thú đang xuất chiến. Hãy cho sủng vật nghỉ ngơi trước.');
            menuStack.pop(); // Go back to SELECT
            selectedFusePetId = null;
          } else {
            const isThanA = ['to_long_1', 'to_long_2', 'phuong_hoang_1', 'phuong_hoang_2', 'ky_lan_1', 'ky_lan_2', 'huyen_vu_1', 'huyen_vu_2', 'bach_ho_1', 'bach_ho_2'].includes(petA.type);
            const isThanB = ['to_long_1', 'to_long_2', 'phuong_hoang_1', 'phuong_hoang_2', 'ky_lan_1', 'ky_lan_2', 'huyen_vu_1', 'huyen_vu_2', 'bach_ho_1', 'bach_ho_2'].includes(petB.type);

            if (isThanA || isThanB) {
              actionMessage = BoTaoEmbed.thatBai('🧬 Dung Hợp Thất Bại', 'Thần Thú thượng cổ có huyết mạch tối cao, không thể tiến hành dung hợp!');
              menuStack = ['MAIN', 'PETS'];
              selectedPetId = null;
              selectedFusePetId = null;
            } else if (tuSi.linhThach < 5000) {
              actionMessage = BoTaoEmbed.thatBai('🧬 Dung Hợp Thất Bại', 'Không đủ linh thạch (Cần 5,000 Linh Thạch).');
            } else {
              tuSi.linhThach -= 5000;
              await tuSi.save();

              const statsA = config.getPetCurrentStats(petA);
              const statsB = config.getPetCurrentStats(petB);

              let newStats = {};
              const isSuperRare = Math.random() < 0.01; // 1%

              if (isSuperRare) {
                const allKeys = new Set([...Object.keys(statsA), ...Object.keys(statsB)]);
                for (const key of allKeys) {
                  const valA = statsA[key] || 0;
                  const valB = statsB[key] || 0;
                  newStats[key] = parseFloat(((valA + valB) * 1.10).toFixed(4));
                }
              } else {
                const chosenParentStats = Math.random() < 0.5 ? statsA : statsB;
                for (const [key, val] of Object.entries(chosenParentStats)) {
                  newStats[key] = parseFloat((val * 1.10).toFixed(4));
                }
              }

              // Randomly choose species
              const speciesProvider = Math.random() < 0.5 ? petA : petB;
              const newType = speciesProvider.type;
              const template = config.PET_TEMPLATES[newType];
              const newRarity = template.group === 'than_thu' ? 'TT_1' : 'LT_1';
              const newTuChat = Math.max(petA.tuChat, petB.tuChat);
              const newName = config.getFormattedPetName(template.name, newRarity, 0, false);

              // Create fused pet
              const fusedPet = await Pet.create({
                userId: tuSi.idNguoiDung,
                name: newName,
                type: newType,
                rarity: newRarity,
                level: 1,
                exp: 0,
                tuChat: newTuChat,
                tienHoa: 0,
                extraEvo: 0,
                isMax: false,
                isActive: false,
                fusedStats: JSON.stringify(newStats)
              });

              // Destroy parents
              await petA.destroy();
              await petB.destroy();

              const statsText = config.formatFusedStats(newStats);
              let rateMsg = '';
              if (isSuperRare) {
                rateMsg = `\n\n✨ **SIÊU HIẾM (1%)**: Linh thú mới đã hấp thụ tinh hoa và thừa hưởng toàn bộ chỉ số của cả hai Linh Thú gốc! (+10% chỉ số)`;
              } else {
                rateMsg = `\n\n📈 Linh thú mới đã kế thừa chỉ số của 1 trong 2 Linh Thú gốc và được cộng 10% chỉ số.`;
              }

              actionMessage = BoTaoEmbed.thanhCong(
                '🧬 Dung Hợp Linh Thú Thành Công',
                `Đạo hữu đã dung hợp thành công **${petA.name}** và **${petB.name}**!\n\n` +
                `• **Linh thú mới**: **${fusedPet.name}**\n` +
                `• **Chủng loài**: \`${template.name}\`\n` +
                `• **Tư chất**: \`${newTuChat}/250\`\n` +
                `• **Chỉ số hộ thể mới**: \`${statsText}\`${rateMsg}`
              );

              // Go back to PETS
              menuStack = ['MAIN', 'PETS'];
              selectedPetId = null;
              selectedFusePetId = null;
            }
          }
        }
      }

      // ── XỬ LÝ ĐẬP ĐÁ (STONE_SMASH) ────────────────────────────────────────
      else if (currentMenu === 'STONE_SMASH') {
        let cost = 0;
        let tier = '';
        if (i.customId === 'smash_normal') { cost = 100000; tier = 'NORMAL'; }
        else if (i.customId === 'smash_epic') { cost = 1000000; tier = 'EPIC'; }
        else if (i.customId === 'smash_ancient') { cost = 10000000; tier = 'ANCIENT'; }

        if (cost > 0 && tuSi.linhThach >= cost) {
          tuSi.linhThach -= cost;
          await tuSi.save();

          const result = await this._processStoneSmash(tuSi, tier, cost);
          actionResultEmbed(result);
        }
      }

      // ── XỬ LÝ PHÓNG SINH NHANH (PET_QUICK_RELEASE) ────────────────────────
      else if (currentMenu === 'PET_QUICK_RELEASE') {
        if (i.customId === 'pet_release_filter_species') {
          releaseFilterSpecies = i.values[0];
        } else if (i.customId === 'pet_release_filter_bloodline') {
          releaseFilterBloodline = i.values[0];
        } else if (i.customId === 'pet_release_execute') {
          const matchedPets = myPets.filter(p => !p.isActive &&
            (releaseFilterSpecies === 'all' || config.PET_TEMPLATES[p.type]?.species === releaseFilterSpecies) &&
            (releaseFilterBloodline === 'all' || p.rarity === releaseFilterBloodline)
          );

          if (matchedPets.length > 0) {
            const count = matchedPets.length;
            for (const p of matchedPets) {
              await p.destroy();
            }
            tuSi.congDuc = (tuSi.congDuc || 0) + count;
            await tuSi.save();
            menuStack.pop();
            actionMessage = BoTaoEmbed.thanhCong('💥 Phóng Sinh Hàng Loạt Thành Công', `Đạo hữu đã phóng sinh thành công **${count}** sủng vật hợp bộ lọc. Nhận được **+${count}** Điểm Công Đức!`);
          }
        }
      }

      // Reload data cho lần render kế tiếp
      myInventory = await loadPlayerInventory(tuSi.idNguoiDung);
      myPets = await Pet.findAll({ where: { userId: tuSi.idNguoiDung } });

      // Helper set action result embed
      function actionResultEmbed(result) {
        actionMessage = result.ok
          ? BoTaoEmbed.thanhCong('✨ Thành Công', result.msg)
          : BoTaoEmbed.loi(result.msg);
      }

      await i.editReply({
        embeds: await buildEmbeds(),
        components: await buildComponents(myInventory, myPets),
        files: await getFilesToSend()
      });
    });

    collector.on('end', async (_, reason) => {
      try {
        if (reason === 'closed') {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setTitle('🏰 Động Phủ Tu Chân — Đã Đóng')
                .setDescription('Cửa động phủ đã đóng kết界. Hẹn gặp lại đạo hữu!')
                .setColor(0x7f8c8d)
                .setTimestamp()
            ],
            components: []
          });
        } else {
          await interaction.editReply({
            components: await buildComponents(myInventory, myPets, true)
          });
        }
      } catch (_) { }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPER: XỬ LÝ LUYỆN ĐAN
  // ─────────────────────────────────────────────────────────────────────────
  async _processAlchemy(tuSi, herbId) {
    const inv = await Inventory.findOne({ where: { idNguoiDung: tuSi.idNguoiDung, itemId: herbId } });
    if (!inv || inv.soLuong < 3) {
      return { ok: false, msg: 'Cần ít nhất 3 Linh thảo cùng phẩm chất để tiến hành luyện đan.' };
    }
    if (tuSi.linhThach < 50) {
      return { ok: false, msg: 'Cần thêm 50 Linh thạch chi phí nung nấu đan lò.' };
    }

    // Trừ nguyên liệu
    inv.soLuong -= 3;
    if (inv.soLuong <= 0) await inv.destroy();
    else await inv.save();

    tuSi.linhThach -= 50;
    await tuSi.save();

    // Xác định phẩm chất dựa theo nguyên liệu linh thảo đầu vào
    const isBreakthroughHerb = herbId.startsWith('linh_thao_');
    if (isBreakthroughHerb) {
      const mapping = {
        'linh_thao_luyen_khi': 'dan_dot_pha_1',
        'linh_thao_truc_co': 'dan_dot_pha_2',
        'linh_thao_kim_dan': 'dan_dot_pha_3',
        'linh_thao_nguyen_anh': 'dan_dot_pha_4',
        'linh_thao_hoa_than': 'dan_dot_pha_5',
        'linh_thao_phan_hu': 'dan_dot_pha_6',
        'linh_thao_hop_the': 'dan_dot_pha_7',
        'linh_thao_dai_thua': 'dan_dot_pha_8'
      };
      const targetPillId = mapping[herbId];
      if (!targetPillId) {
        return { ok: false, msg: 'Không tìm thấy công thức luyện đan cho linh thảo này.' };
      }

      const roll = Math.random() * 100;
      let phamChat = 'Phế phẩm';
      let phanTramHoTro = 5;
      if (roll <= 1) { phamChat = 'Tiên phẩm'; phanTramHoTro = 35; }
      else if (roll <= 5) { phamChat = 'Tuyệt phẩm'; phanTramHoTro = 25; }
      else if (roll <= 15) { phamChat = 'Siêu phẩm'; phanTramHoTro = 20; }
      else if (roll <= 30) { phamChat = 'Ưu phẩm'; phanTramHoTro = 15; }
      else if (roll <= 60) { phamChat = 'Phàm phẩm'; phanTramHoTro = 10; }

      const qualityInfo = { phamChat, phanTramHoTro };
      await Inventory.addVatPham(tuSi.idNguoiDung, targetPillId, 1, { quality: qualityInfo });
      const targetItem = config.ITEMS.find(e => e.id === targetPillId);

      return {
        ok: true,
        msg: `Luyện đan hoàn tất! Đạo hữu luyện chế ra: **${targetItem?.ten ?? targetPillId} (${phamChat} +${phanTramHoTro}%)**.`
      };
    }

    const tuViRecipeMap = {
      'ngoc_lo_sinh_co_thao': 'dan_tu_vi_truc_co',
      'kim_o_tu_dan_hoa': 'dan_tu_vi_kim_dan',
      'tu_van_hoa_anh_thao': 'dan_tu_vi_nguyen_anh'
    };

    let targetPillId = tuViRecipeMap[herbId];
    if (!targetPillId) {
      if (herbId.startsWith('tu_linh_thao_')) {
        targetPillId = 'dan_tu_vi_luyen_khi';
      }
    }

    if (!targetPillId) {
      return { ok: false, msg: 'Không tìm thấy công thức luyện đan cho linh thảo này.' };
    }

    await Inventory.addVatPham(tuSi.idNguoiDung, targetPillId, 1);
    const targetItem = config.ITEMS.find(e => e.id === targetPillId);

    return {
      ok: true,
      msg: `Luyện đan hoàn tất! Đạo hữu luyện chế ra: **${targetItem?.ten ?? targetPillId} ${targetItem?.emoji || ''}**.`
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPER: ĂN ĐAN DƯỢC TĂNG TU VI
  // ─────────────────────────────────────────────────────────────────────────
  async _processConsumePill(tuSi, abode, pillId) {
    const dailyLimit = config.layGioiHanDanDaily(tuSi.capDo, abode.level);
    if (abode.pillCount >= dailyLimit) {
      return { ok: false, msg: `Cơ thể đạo hữu đã đạt giới hạn kháng dược! Hôm nay không thể ăn thêm đan dược tu vi nữa (Tối đa ${dailyLimit} viên/ngày).` };
    }

    const inv = await Inventory.findOne({ where: { idNguoiDung: tuSi.idNguoiDung, itemId: pillId } });
    if (!inv || inv.soLuong <= 0) {
      return { ok: false, msg: 'Không tìm thấy đan dược tương ứng trong túi đồ.' };
    }

    // Khấu trừ thuốc
    inv.soLuong -= 1;
    if (inv.soLuong <= 0) await inv.destroy();
    else await inv.save();

    // Tính tu vi gốc từ cảnh giới hiện tại
    const { CanhGioi } = await import('../models/CanhGioi.js');
    const cg = await CanhGioi.findByPk(tuSi.capDo);
    const tocDoGoc = cg ? cg.tocDoCoBan : config.BASE_EXP_PER_DAO_NIEN;

    const { tinhTuViNhanDuoc } = config;
    const { gainedExp, multiplier } = tinhTuViNhanDuoc(pillId, tuSi.canhGioi, tocDoGoc);

    tuSi.linhLuc += gainedExp;
    await tuSi.save();

    abode.pillCount += 1;
    await abode.save();

    const pillItem = config.ITEMS.find(e => e.id === pillId);

    let msg = `Hóa Dược Nhập Thể! Đạo hữu ăn **${pillItem?.ten}** dược lực tan ra, lập tức nhận được \`+${gainedExp.toLocaleString()}\` Linh Lực.`;
    if (multiplier < 1.0) {
      msg += `\n*(Do cảnh giới thấp hơn đại cảnh giới của đạo hữu, hiệu quả đan dược giảm còn ${multiplier * 100}%).*`;
    }

    return {
      ok: true,
      msg
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPER: XỬ LÝ LUYỆN KHÍ
  // ─────────────────────────────────────────────────────────────────────────
  async _processForge(tuSi, oldId, newId) {
    // Bản đồ nguyên liệu cho từng dòng trang bị nâng cấp
    const FORGE_MATERIALS = {
      // Luyện Khí - Pháp Tu
      'thanh_phong_kiem': { materialId: 'so_cap_thiet_quang', count: 5, matName: 'Sơ Cấp Thiết Quặng <:so_cap_thiet_quang:1525076114295492679>' },
      'dao_bao_thanh_van': { materialId: 'tho_linh_dan_ty', count: 5, matName: 'Thô Linh Đàn Ty <:tho_linh_dan_ty:1525076109887148144>' },
      'thuy_linh_boi': { materialId: 'linh_khi_toai_thach', count: 5, matName: 'Linh Khí Toái Thạch <:linh_khi_toai_thach:1525076112382623754>' },
      'pb_lk_linh_phong_cham': { materialId: 'nham_hoa_tinh_hoa', count: 5, matName: 'Nham Hỏa Tinh Hoa <:nham_hoa_tinh_hoa:1525076107509108776>' },
      'pb_lk_dan_loi_phu': { materialId: 'sat_danh_moc', count: 5, matName: 'Sét Đánh Mộc <:sat_danh_moc:1525076096213581945>' },
      'pb_lk_ho_than_kinh': { materialId: 'kien_thach_tam', count: 5, matName: 'Kiên Thạch Tâm <:kien_thach_tam:1525076100655354038>' },
      'pb_lk_dinh_than_phu': { materialId: 'thiet_dang_man', count: 5, matName: 'Thiết Đằng Man <:thiet_dang_man:1525076105302773760>' },
      'pb_lk_thanh_linh_binh': { materialId: 'linh_tuyen_thuy', count: 5, matName: 'Linh Tuyền Thủy <:linh_tuyen_thuy:1525076102870073426>' },
      'pb_lk_tu_khi_ky': { materialId: 'yeu_thu_huyet', count: 5, matName: 'Yêu Thú Huyết <:yeu_thu_huyet:1525076098302345277>' },

      // Luyện Khí - Thể Tu
      'thiet_cot_dao': { materialId: 'so_cap_thiet_quang', count: 5, matName: 'Sơ Cấp Thiết Quặng <:so_cap_thiet_quang:1525076114295492679>' },
      'tho_bo_thuc_cu': { materialId: 'tho_linh_dan_ty', count: 5, matName: 'Thô Linh Đàn Ty <:tho_linh_dan_ty:1525076109887148144>' },
      'khuong_thach_boi': { materialId: 'linh_khi_toai_thach', count: 5, matName: 'Linh Khí Toái Thạch <:linh_khi_toai_thach:1525076112382623754>' },
      'pb_lk_toai_thach_an': { materialId: 'nham_hoa_tinh_hoa', count: 5, matName: 'Nham Hỏa Tinh Hoa <:nham_hoa_tinh_hoa:1525076107509108776>' },
      'pb_lk_hoa_tinh_dinh': { materialId: 'sat_danh_moc', count: 5, matName: 'Sét Đánh Mộc <:sat_danh_moc:1525076096213581945>' },
      'pb_lk_thach_phu_thuan': { materialId: 'kien_thach_tam', count: 5, matName: 'Kiên Thạch Tâm <:kien_thach_tam:1525076100655354038>' },
      'pb_lk_u_thiet_lien': { materialId: 'thiet_dang_man', count: 5, matName: 'Thiết Đằng Man <:thiet_dang_man:1525076105302773760>' },
      'pb_lk_da_son_sam': { materialId: 'linh_tuyen_thuy', count: 5, matName: 'Linh Tuyền Thủy <:linh_tuyen_thuy:1525076102870073426>' },
      'pb_lk_chien_co': { materialId: 'yeu_thu_huyet', count: 5, matName: 'Yêu Thú Huyết <:yeu_thu_huyet:1525076098302345277>' },

      // Trúc Cơ
      'kiem_sat': { materialId: 'huyen_thiet_tinh_sa', count: 5, matName: 'Huyền Thiết Tinh Sa <:_nglieu_Truc_co_1:1525418027472916671>' },
      'truong_truc': { materialId: 'huyen_thiet_tinh_sa', count: 5, matName: 'Huyền Thiết Tinh Sa <:_nglieu_Truc_co_1:1525418027472916671>' },
      'ao_da': { materialId: 'luc_ngoc_thach', count: 5, matName: 'Lục Ngọc Thạch <:_nglieu_Truc_co_2:1525418029650022400>' },

      // Trúc Cơ - Pháp Tu
      'vk_phap_truc_co': { materialId: 'huyen_thiet_tinh_sa', count: 5, matName: 'Huyền Thiết Tinh Sa <:_nglieu_Truc_co_1:1525418027472916671>' },
      'giap_phap_truc_co': { materialId: 'luc_ngoc_thach', count: 5, matName: 'Lục Ngọc Thạch <:_nglieu_Truc_co_2:1525418029650022400>' },
      'nb_phap_truc_co': { materialId: 'am_duong_dong_chuong', count: 5, matName: 'Âm Dương Đồng Chương <:_nglieu_Truc_co_9:1525418025715761232>' },
      'pb_hoi_phap_truc_co': { materialId: 'dia_xich_linh_chi', count: 5, matName: 'Địa Xích Linh Chi <:_nglieu_Truc_co_6:1525418014290215042>' },
      'pb_def_phap_truc_co': { materialId: 'bich_hai_bang_tinh', count: 5, matName: 'Bích Hải Băng Tinh <:_nglieu_Truc_co_4:1525418022070653019>' },
      'pb_aoe_phap_truc_co': { materialId: 'cuu_thien_tu_cat', count: 5, matName: 'Cửu Thiên Tử Cát <:_nglieu_Truc_co_5:1525418023685718116>' },
      'pb_don_phap_truc_co': { materialId: 'dia_hoa_chi_tinh', count: 5, matName: 'Địa Hỏa Chi Tinh <:_nglieu_Truc_co_3:1525418020137078794>' },
      'pb_cc_phap_truc_co': { materialId: 'khon_tien_dang_moc', count: 5, matName: 'Khổn Tiên Đằng Mộc <:_nglieu_Truc_co_7:1525418016169398393>' },
      'pb_buff_phap_truc_co': { materialId: 'thanh_vu_linh_sa', count: 5, matName: 'Thanh Vũ Linh Sa <:_nglieu_Truc_co_8:1525418018124071054>' },

      // Trúc Cơ - Thể Tu
      'vk_the_truc_co': { materialId: 'huyen_thiet_tinh_sa', count: 5, matName: 'Huyền Thiết Tinh Sa <:_nglieu_Truc_co_1:1525418027472916671>' },
      'giap_the_truc_co': { materialId: 'luc_ngoc_thach', count: 5, matName: 'Lục Ngọc Thạch <:_nglieu_Truc_co_2:1525418029650022400>' },
      'nb_the_truc_co': { materialId: 'am_duong_dong_chuong', count: 5, matName: 'Âm Dương Đồng Chương <:_nglieu_Truc_co_9:1525418025715761232>' },
      'pb_hoi_the_truc_co': { materialId: 'dia_xich_linh_chi', count: 5, matName: 'Địa Xích Linh Chi <:_nglieu_Truc_co_6:1525418014290215042>' },
      'pb_def_the_truc_co': { materialId: 'bich_hai_bang_tinh', count: 5, matName: 'Bích Hải Băng Tinh <:_nglieu_Truc_co_4:1525418022070653019>' },
      'pb_aoe_the_truc_co': { materialId: 'cuu_thien_tu_cat', count: 5, matName: 'Cửu Thiên Tử Cát <:_nglieu_Truc_co_5:1525418023685718116>' },
      'pb_don_the_truc_co': { materialId: 'dia_hoa_chi_tinh', count: 5, matName: 'Địa Hỏa Chi Tinh <:_nglieu_Truc_co_3:1525418020137078794>' },
      'pb_cc_the_truc_co': { materialId: 'khon_tien_dang_moc', count: 5, matName: 'Khổn Tiên Đằng Mộc <:_nglieu_Truc_co_7:1525418016169398393>' },
      'pb_buff_the_truc_co': { materialId: 'thanh_vu_linh_sa', count: 5, matName: 'Thanh Vũ Linh Sa <:_nglieu_Truc_co_8:1525418018124071054>' },

      // Kim Đan
      'kiem_kim_dan': { materialId: 'huyen_thiet_van_nam', count: 5, matName: 'Vạn Năm Huyền Thiết <:Huyen_thiet_van_nam:1524812777347092560>' },
      'truong_kim_dan': { materialId: 'huyen_thiet_van_nam', count: 5, matName: 'Vạn Năm Huyền Thiết <:Huyen_thiet_van_nam:1524812777347092560>' },
      'ao_kim_dan': { materialId: 'Thien_Tam_Linh_ty', count: 5, matName: 'Thiên Tàm Linh Ty <:Thien_Tam_Linh_ty:1524812779503226950>' },
      'ao_kim_dan_phap': { materialId: 'Thien_Tam_Linh_ty', count: 5, matName: 'Thiên Tàm Linh Ty <:Thien_Tam_Linh_ty:1524812779503226950>' },
      'ngoc_boi_kim_dan_the': { materialId: 'hon_tinh_huyet_nguyet', count: 5, matName: 'Hồn Tinh Huyết Nguyệt <:hon_tinh_huyet_nguyet:1524812781730140190>' },
      'ngoc_boi_kim_dan_phap': { materialId: 'hon_tinh_huyet_nguyet', count: 5, matName: 'Hồn Tinh Huyết Nguyệt <:hon_tinh_huyet_nguyet:1524812781730140190>' },
      'pb_kd_diet_ma_cham': { materialId: 'cuc_duong_hoa_thach', count: 5, matName: 'Cực Dương Hỏa Thạch <:cuc_duong_hoa_thach:1524812775325434139>' },
      'pb_kd_chan_son_an': { materialId: 'cuc_duong_hoa_thach', count: 5, matName: 'Cực Dương Hỏa Thạch <:cuc_duong_hoa_thach:1524812775325434139>' },
      'pb_kd_ngu_loi_chau': { materialId: 'loi_tri_bang_tinh', count: 5, matName: 'Lôi Trì Băng Tinh <:loi_tri_bang_tinh:1524812766144364677>' },
      'pb_kd_phan_thien_dinh': { materialId: 'loi_tri_bang_tinh', count: 5, matName: 'Lôi Trì Băng Tinh <:loi_tri_bang_tinh:1524812766144364677>' },
      'pb_kd_bat_quai_kinh': { materialId: 'Hau_tho_chi_loi', count: 5, matName: 'Hậu Thổ Chi Lõi <:Hau_tho_chi_loi:1524812773077422332>' },
      'pb_kd_huyen_vu_thuan': { materialId: 'Hau_tho_chi_loi', count: 5, matName: 'Hậu Thổ Chi Lõi <:Hau_tho_chi_loi:1524812773077422332>' },
      'pb_kd_khon_tien_to': { materialId: 'u_minh_te_truc', count: 5, matName: 'U Minh Tế Trúc <:u_minh_te_truc:1524812770569228418>' },
      'pb_kd_toa_hon_lien': { materialId: 'u_minh_te_truc', count: 5, matName: 'U Minh Tế Trúc <:u_minh_te_truc:1524812770569228418>' },
      'pb_kd_cam_lo_binh': { materialId: 'sinh_sinh_tao_hoa_dich', count: 5, matName: 'Sinh Sinh Tạo Hóa Dịch <:sinh_sinh_tao_hoa_dich:1524812768191189012>' },
      'pb_kd_huyet_bo_de': { materialId: 'sinh_sinh_tao_hoa_dich', count: 5, matName: 'Sinh Sinh Tạo Hóa Dịch <:sinh_sinh_tao_hoa_dich:1524812768191189012>' },
      'pb_kd_that_tinh_dang': { materialId: 'tinh_khong_luu_sa', count: 5, matName: 'Tinh Không Lưu Sa <:tinh_khong_luu_sa:1524812764076572882>' },
      'pb_kd_man_hoang_co': { materialId: 'tinh_khong_luu_sa', count: 5, matName: 'Tinh Không Lưu Sa <:tinh_khong_luu_sa:1524812764076572882>' },

      // Nguyên Anh
      'kiem_nguyen_anh': { materialId: 'nguyen_lieu_nguyen_anh', count: 5, matName: 'Nguyên Anh Hỏa Tinh ☄️' },
      'truong_nguyen_anh': { materialId: 'nguyen_lieu_nguyen_anh', count: 5, matName: 'Nguyên Anh Hỏa Tinh ☄️' },
      'ao_nguyen_anh': { materialId: 'nguyen_lieu_nguyen_anh', count: 5, matName: 'Nguyên Anh Hỏa Tinh ☄️' },

      // Hóa Thần
      'kiem_huyen_thiet': { materialId: 'nguyen_lieu_hoa_than', count: 5, matName: 'Thần Ma Chi Tinh ✨' },
      'phap_bao_huyen_mon': { materialId: 'nguyen_lieu_hoa_than', count: 5, matName: 'Thần Ma Chi Tinh ✨' },
      'giap_huyen_thiet': { materialId: 'nguyen_lieu_hoa_than', count: 5, matName: 'Thần Ma Chi Tinh ✨' }
    };

    const reqMat = FORGE_MATERIALS[newId];
    let invMat = null;
    let matQuality = 'Thường';

    if (reqMat) {
      const mats = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, itemId: reqMat.materialId } });
      const possibleMats = mats.filter(m => m.soLuong >= reqMat.count);
      if (possibleMats.length === 0) {
        return { ok: false, msg: `Thiếu nguyên liệu rèn! Đạo hữu cần có ít nhất **${reqMat.count}** chiếc **${reqMat.matName}** cùng phẩm chất.` };
      }

      const qualityOrder = { 'Thần Thoại': 5, 'Sử Thi': 4, 'Hiếm': 3, 'Thường': 2, 'Phế Phẩm': 1 };
      possibleMats.sort((a, b) => {
        let qA = 'Thường';
        let qB = 'Thường';
        try {
          if (a.dongChiSoJson) qA = JSON.parse(a.dongChiSoJson).phamChat || 'Thường';
          if (b.dongChiSoJson) qB = JSON.parse(b.dongChiSoJson).phamChat || 'Thường';
        } catch (e) { }
        return (qualityOrder[qB] || 0) - (qualityOrder[qA] || 0);
      });

      invMat = possibleMats[0];
      try {
        if (invMat.dongChiSoJson) {
          const parsed = JSON.parse(invMat.dongChiSoJson);
          if (parsed && parsed.phamChat) {
            matQuality = parsed.phamChat;
          }
        }
      } catch (e) { }
    }

    let cost = 2000;
    const newItem = config.ITEMS.find(e => e.id === newId);
    if (newItem && newItem.yeuCauCanhGioi === 10) {
      cost = 4000;
    }

    if (tuSi.linhThach < cost) {
      return { ok: false, msg: `Linh thạch bất túc! Cần ${cost} Linh thạch để đốt lò đúc khí.` };
    }

    if (reqMat && invMat) {
      invMat.soLuong -= reqMat.count;
      if (invMat.soLuong <= 0) await invMat.destroy();
      else await invMat.save();
    }

    tuSi.linhThach -= cost;
    await tuSi.save();

    const eqQuality = config.rollForgedQuality(matQuality);
    if (eqQuality === 'fail') {
      return {
        ok: false,
        msg: `💥 **Luyện Chế Thất Bại!** Linh hỏa bộc phát không ổn định làm nguyên liệu **${reqMat?.matName || 'rèn'}** hóa thành tro bụi... Đạo hữu tổn thất ${cost} Linh thạch.`
      };
    }

    const record = await Inventory.addVatPham(tuSi.idNguoiDung, newId, 1, { quality: eqQuality });

    const qualityEmojis = { 'Thần Thoại': '🟠', 'Sử Thi': '🟣', 'Hiếm': '🔵', 'Thường': '🟢', 'Phế Phẩm': '⚪' };
    const qEmoji = qualityEmojis[eqQuality] || '';

    return {
      ok: true,
      msg: `Luyện Khí Thành Công! Bạn đã tiêu hao nguyên liệu và luyện đúc thành công **${newItem?.ten ?? newId}** [${qEmoji} ${eqQuality}] (Mã: #${record.id})!`
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPER: ẤP TRỨNG
  // ─────────────────────────────────────────────────────────────────────────
  async _processHatchEgg(tuSi, eggId) {
    const inv = await Inventory.findOne({ where: { idNguoiDung: tuSi.idNguoiDung, itemId: eggId } });
    if (!inv || inv.soLuong <= 0) {
      return { ok: false, msg: 'Đạo hữu không có trứng tương ứng trong balo.' };
    }

    inv.soLuong -= 1;
    if (inv.soLuong <= 0) await inv.destroy();
    else await inv.save();

    // Các loại trứng: roll theo tỷ lệ
    let isThan = false;
    let rollThanThuRate = 0; // Tỷ lệ nở ra Thần Thú
    if (eggId === 'trung_linh_thu_than') {
      rollThanThuRate = 50;
    } else if (eggId === 'trung_linh_thu_tien') {
      rollThanThuRate = 3;
    } else if (eggId === 'trung_linh_thu_linh') {
      rollThanThuRate = 1;
    } else if (eggId === 'trung_linh_thu_pham' || eggId === 'trung_linh_thu') {
      rollThanThuRate = 0;
    }
    const roll = Math.random() * 100;
    isThan = roll < rollThanThuRate;

    let selectedTemplate = null;
    if (isThan) {
      const templates = config.PET_TEMPLATES_SEED.filter(t => t.group === 'than_thu');
      selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
    } else {
      const templates = config.PET_TEMPLATES_SEED.filter(t => t.group === 'linh_thu');
      selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
    }

    const rarity = 'ha_pham';
    const cleanName = selectedTemplate.name;
    const formattedName = config.getFormattedPetName(cleanName, rarity, 0, false);

    const pet = await Pet.create({
      userId: tuSi.idNguoiDung,
      name: formattedName,
      type: selectedTemplate.id,
      rarity: rarity,
      level: 1,
      exp: 0,
      tuChat: 100 + Math.floor(Math.random() * 30),
      isActive: false
    });

    const displaySpecies = config.PET_TEMPLATES[pet.type]?.name || pet.type;
    return {
      ok: true,
      msg: `Ấp Trứng Thành Công! Quả trứng vỡ ra, một chú **${displaySpecies}** nhỏ bé đáng yêu chui ra chào đạo hữu!`,
      pet
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPER: ĐẬP ĐÁ CẦU MAY (ĐỔ THẠCH)
  // ─────────────────────────────────────────────────────────────────────────
  async _processStoneSmash(tuSi, tier, cost) {
    const roll = Math.random() * 100;

    // Trứng Linh thú chiếm ít nhất 10% (12%)
    if (roll <= 12.0) {
      const eggRoll = Math.random() * 100;
      let targetEggId = 'trung_linh_thu';
      // 10% cơ hội trứng thần
      if (eggRoll <= 10.0) {
        targetEggId = 'trung_linh_thu_than';
      }

      await Inventory.addVatPham(tuSi.idNguoiDung, targetEggId, 1);
      const eggItem = config.ITEMS.find(e => e.id === targetEggId);

      return {
        ok: true,
        msg: `💥 Oành! Đập thạch vỡ tan, đạo hữu tìm thấy: **${eggItem?.ten ?? targetEggId}** ẩn giấu bên trong!`
      };
    }

    // 88% nhận vật phẩm ngẫu nhiên khác
    if (tier === 'NORMAL') {
      // Đá thường: hạt giống linh chi, linh chi sơ, phản hồi linh thạch
      const seedRoll = Math.random() * 100;
      if (seedRoll <= 40) {
        await Inventory.addVatPham(tuSi.idNguoiDung, 'hat_giong_linh_chi', 1);
        return { ok: true, msg: '💥 Nhận được: **Hạt Giống Linh Chi 🌰**.' };
      } else if (seedRoll <= 80) {
        await Inventory.addVatPham(tuSi.idNguoiDung, 'linh_chi_luc', 1);
        return { ok: true, msg: '💥 Nhận được: **U Minh Linh Chi (Phàm) 🍄**.' };
      } else {
        const cashback = 20000 + Math.floor(Math.random() * 30000);
        tuSi.linhThach += cashback;
        await tuSi.save();
        return { ok: true, msg: `💥 Đá rỗng! Chỉ thu nhặt được vỏ vụn linh thạch giá trị \`${cashback.toLocaleString()}\` 🪙.` };
      }
    } else if (tier === 'EPIC') {
      // Đá quý: hạt giống nhân sâm, sâm lục/lam, phản hồi linh thạch
      const seedRoll = Math.random() * 100;
      if (seedRoll <= 40) {
        await Inventory.addVatPham(tuSi.idNguoiDung, 'hat_giong_nhan_sam', 1);
        return { ok: true, msg: '💥 Nhận được: **Hạt Giống Nhân Sâm 🌰**.' };
      } else if (seedRoll <= 75) {
        await Inventory.addVatPham(tuSi.idNguoiDung, 'nhan_sam_lam', 1);
        return { ok: true, msg: '💥 Nhận được: **Tuyết Sơn Nhân Sâm (Ưu) 🥕**.' };
      } else {
        const cashback = 200000 + Math.floor(Math.random() * 300000);
        tuSi.linhThach += cashback;
        await tuSi.save();
        return { ok: true, msg: `💥 Nhận lại \`${cashback.toLocaleString()}\` 🪙 Linh thạch vụn từ quặng quý.` };
      }
    } else {
      // Đá cổ: sâm/chi tím/vàng/đỏ, hoàn tiền lớn
      const seedRoll = Math.random() * 100;
      if (seedRoll <= 30) {
        await Inventory.addVatPham(tuSi.idNguoiDung, 'linh_chi_tim', 1);
        return { ok: true, msg: '💥 Nhận được cực phẩm: **U Minh Linh Chi (Siêu) 🍄**!' };
      } else if (seedRoll <= 60) {
        await Inventory.addVatPham(tuSi.idNguoiDung, 'nhan_sam_tim', 1);
        return { ok: true, msg: '💥 Nhận được cực phẩm: **Tuyết Sơn Nhân Sâm (Siêu) 🥕**!' };
      } else if (seedRoll <= 80) {
        await Inventory.addVatPham(tuSi.idNguoiDung, 'nhan_sam_vang', 1);
        return { ok: true, msg: '💥 Nhận được thần thảo: **Tuyết Sơn Nhân Sâm (Tuyệt) 🥕**!' };
      } else {
        const cashback = 2000000 + Math.floor(Math.random() * 3000000);
        tuSi.linhThach += cashback;
        await tuSi.save();
        return { ok: true, msg: `💥 Quặng thiêng chấn động, đạo hữu nhặt lại được \`${cashback.toLocaleString()}\` 🪙 Linh thạch!` };
      }
    }
  }
}

// ── UTILS FUNCTIONS ─────────────────────────────────────────────────────────

async function loadPlayerInventory(userId) {
  const invList = await Inventory.findAll({ where: { idNguoiDung: userId } });
  const list = [];
  for (const inv of invList) {
    const d = await Item.findByPk(inv.itemId);
    if (d) {
      list.push({ invId: inv.id, item: d, soLuong: inv.soLuong, trangBi: inv.trangBi });
    }
  }
  return list;
}

function getPlotAgeAndHerb(plot) {
  if (!plot || plot.status === 'EMPTY' || !plot.plantedAt) {
    return { age: 0, ready: false, seedName: '', herbId: '', herbName: '' };
  }

  // Tuổi tính theo Đạo Niên (1 Đạo Niên = 15 phút)
  const elapsedMs = Date.now() - new Date(plot.plantedAt).getTime();
  const elapsedMins = elapsedMs / 60000;
  const age = elapsedMins / (config.DAO_NIEN_SECONDS / 60);

  const isTuLinhThao = plot.seedItemId === 'hat_giong_tu_linh_thao';
  const isLinhChi = plot.seedItemId === 'hat_giong_linh_chi';
  const isNhanSam = plot.seedItemId === 'hat_giong_nhan_sam';

  const SEED_TO_HERB_MAP = {
    'hat_giong_luyen_khi_thao': { herbId: 'linh_thao_luyen_khi', name: 'Luyện Khí Thảo 🌿' },
    'hat_giong_truc_co_thao': { herbId: 'linh_thao_truc_co', name: 'Trúc Cơ Thảo 🌿' },
    'hat_giong_kim_dan_hoa': { herbId: 'linh_thao_kim_dan', name: 'Kim Đan Hoa 🌸' },
    'hat_giong_nguyen_anh_qua': { herbId: 'linh_thao_nguyen_anh', name: 'Nguyên Anh Linh Quả 🍒' },
    'hat_giong_hoa_than_chi': { herbId: 'linh_thao_hoa_than', name: 'Hóa Thần Chi 🍄' },
    'hat_giong_phan_hu_dang': { herbId: 'linh_thao_phan_hu', name: 'Phản Hư Đằng 🍀' },
    'hat_giong_hop_the_lien': { herbId: 'linh_thao_hop_the', name: 'Hợp Thể Liên 💮' },
    'hat_giong_dai_thua_qua': { herbId: 'linh_thao_dai_thua', name: 'Đại Thừa Tinh Quả 🍇' },
    'hat_giong_ngoc_lo_sinh_co': { herbId: 'ngoc_lo_sinh_co_thao', name: 'Ngọc Lộ Sinh Cơ Thảo 🌿' },
    'hat_giong_kim_o_tudan': { herbId: 'kim_o_tu_dan_hoa', name: 'Kim Ô Tụ Đan Hoa 🌸' },
    'hat_giong_tu_van_hoa_anh': { herbId: 'tu_van_hoa_anh_thao', name: 'Tử Vận Hóa Anh Thảo 🍒' }
  };

  let seedName = 'Hạt giống Linh Thảo 🌰';
  if (isTuLinhThao) {
    seedName = 'Hạt giống Tụ Linh Thảo 🌰';
  } else if (isLinhChi) {
    seedName = 'Hạt giống Linh Chi 🌰';
  } else if (isNhanSam) {
    seedName = 'Hạt giống Nhân Sâm 🌰';
  } else if (SEED_TO_HERB_MAP[plot.seedItemId]) {
    seedName = `Hạt giống ${SEED_TO_HERB_MAP[plot.seedItemId].name.replace(/🌿|🌸|🍒|🍄|🍀|💮|🍇/, '').trim()} 🌰`;
  }

  let herbId = '';
  let herbName = '';
  let ready = false;

  // Cấu hình thời gian trồng và phẩm chất thu hoạch
  if (age >= 4) {
    ready = true;
    if (isTuLinhThao) {
      if (age < 8) {
        herbId = 'tu_linh_thao_luc';
        herbName = 'Tụ Linh Thảo (Phàm) <:tu_linh_thao:1525174737687548114>';
      } else if (age < 16) {
        herbId = 'tu_linh_thao_lam';
        herbName = 'Tụ Linh Thảo (Ưu) <:tu_linh_thao:1525174737687548114>';
      } else if (age < 32) {
        herbId = 'tu_linh_thao_tim';
        herbName = 'Tụ Linh Thảo (Siêu) <:tu_linh_thao:1525174737687548114>';
      } else if (age < 64) {
        herbId = 'tu_linh_thao_vang';
        herbName = 'Tụ Linh Thảo (Tuyệt) <:tu_linh_thao:1525174737687548114>';
      } else {
        herbId = 'tu_linh_thao_do';
        herbName = 'Tụ Linh Thảo (Tiên) <:tu_linh_thao:1525174737687548114>';
      }
    } else if (isLinhChi) {
      if (age < 8) {
        herbId = 'linh_chi_luc';
        herbName = 'U Minh Linh Chi (Phàm) 🍄';
      } else if (age < 16) {
        herbId = 'linh_chi_lam';
        herbName = 'U Minh Linh Chi (Ưu) 🍄';
      } else if (age < 32) {
        herbId = 'linh_chi_tim';
        herbName = 'U Minh Linh Chi (Siêu) 🍄';
      } else if (age < 64) {
        herbId = 'linh_chi_vang';
        herbName = 'U Minh Linh Chi (Tuyệt) 🍄';
      } else {
        herbId = 'linh_chi_do';
        herbName = 'U Minh Linh Chi (Tiên) 🍄';
      }
    } else if (isNhanSam) {
      if (age < 8) {
        herbId = 'nhan_sam_luc';
        herbName = 'Tuyết Sơn Nhân Sâm (Phàm) 🥕';
      } else if (age < 16) {
        herbId = 'nhan_sam_lam';
        herbName = 'Tuyết Sơn Nhân Sâm (Ưu) 🥕';
      } else if (age < 32) {
        herbId = 'nhan_sam_tim';
        herbName = 'Tuyết Sơn Nhân Sâm (Siêu) 🥕';
      } else if (age < 64) {
        herbId = 'nhan_sam_vang';
        herbName = 'Tuyết Sơn Nhân Sâm (Tuyệt) 🥕';
      } else {
        herbId = 'nhan_sam_do';
        herbName = 'Tuyết Sơn Nhân Sâm (Tiên) 🥕';
      }
    } else if (SEED_TO_HERB_MAP[plot.seedItemId]) {
      herbId = SEED_TO_HERB_MAP[plot.seedItemId].herbId;
      herbName = SEED_TO_HERB_MAP[plot.seedItemId].name;
    }
  }

  return { age, ready, seedName, herbId, herbName };
}

const controller = new BoDieuKhienDongPhu();
export const danhSachLenhDongPhu = [controller.lenhDongPhu, controller.lenhPet];
export { controller as boDieuKhienDongPhu };
