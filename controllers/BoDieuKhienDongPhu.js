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
const WATERING_COST_BASE = 10000; // Lần tưới có phí đầu tiên tốn 10k, x10 mỗi lần sau
const PILLS_DAILY_LIMIT = 5;

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

        const embed = new EmbedBuilder()
          .setTitle(`🌱 Linh Dược Viên: ${tuSi.ten}`)
          .setColor(0x2ecc71)
          .setDescription(
            `> 🧑‍🌾 **Số ô đất**: \`${countPlots} / 26\`\n` +
            `> 💦 **Tưới nước hôm nay**: ${waterText}\n` +
            `*(Mỗi lần tưới nước giúp rút ngắn thời gian sinh trưởng của toàn bộ cây đi 2 Đạo Niên)*\n\n` +
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
      // 4. LUYỆN ĐAN (ALCHEMY)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'ALCHEMY') {
        const limitUsed = abode.pillCount || 0;
        const embed = new EmbedBuilder()
          .setTitle(`🔮 Lò Luyện Đan Dược: ${tuSi.ten}`)
          .setColor(0x9b59b6)
          .setDescription(
            `> 💊 **Giới hạn ăn đan dược hôm nay**: \`${limitUsed} / ${PILLS_DAILY_LIMIT}\` viên\n\n` +
            `Chọn một loại linh thảo thu hoạch từ dược viên bên dưới làm nguyên liệu để tiến hành luyện đan.\n` +
            `• **Luyện đan tu vi**: Tăng trực tiếp một lượng tu vi lớn khi ăn vào. Phẩm chất linh thảo càng cao thì tỉ lệ đan dược ra phẩm Siêu/Tuyệt/Tiên càng lớn!`
          );
        embeds.push(embed);
      }

      // ══════════════════════════════════════════════════════════════
      // 5. LUYỆN KHÍ (FORGE)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'FORGE') {
        const embed = new EmbedBuilder()
          .setTitle(`🔨 Rèn Đúc Linh Khí: ${tuSi.ten}`)
          .setColor(0x34495e)
          .setDescription(
            `Dùng trang bị cũ trong balo kết hợp với linh thảo từ dược viên làm chất xúc tác để đúc tiên binh phẩm chất cao.\n` +
            `• **Quy luật đúc khí**: Trang bị phẩm chất cao hơn có chỉ số gốc tăng **120%** và nhân đôi cơ hội nhận các dòng phụ tố màu cam 🟠.\n\n` +
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
          const template = config.PET_TEMPLATES[pet.type];
          const activeTag = pet.isActive ? ' 🟢 [Đang Xuất Chiến]' : ' 💤 [Đang Nghỉ Ngơi]';
          const rarityTag = ` ${getPetRarityText(pet.rarity)}`;
          const nextLvlExp = pet.level * 100;
          const totalEvolves = config.getPetTotalEvolves(pet);

          const hoTheMult = Math.pow(1.05, totalEvolves);
          const hoTheBonusPct = ((hoTheMult - 1) * 100).toFixed(1);
          let evoTxt = ` (+${hoTheBonusPct}% Hộ Thể)`;

          const isThan = template && template.group === 'than_thu';
          if (isThan) {
            const skillMult = Math.pow(1.05, totalEvolves);
            const skillBonusPct = ((skillMult - 1) * 100).toFixed(1);
            evoTxt = ` (+${hoTheBonusPct}% Hộ Thể & +${skillBonusPct}% Kỹ Năng)`;
          }

          const speciesName = template ? template.name : pet.type;
          let skillText = '';
          if (isThan) {
            let skillName = 'Chưa rõ';
            let skillDesc = 'Chưa rõ';
            if (template.species === 'to_long') {
              skillName = 'Phước lành chân long 🐉';
              skillDesc = `Gây 150% pháp công (x${hoTheMult.toFixed(2)} từ tiến hóa) kèm 50% hút máu trong 2 lượt (tối đa 3 lượt) và choáng trong 2 lượt.`;
            } else if (template.species === 'phuong_hoang') {
              skillName = 'Hỏa Phượng Liệt Diễm';
              skillDesc = `Gây sát thương bằng 100% song công của chủ nhân (x${hoTheMult.toFixed(2)} từ tiến hóa), cộng thêm 1 lần tấn công với mỗi 80% bạo thương của chủ nhân (mỗi lần sau tăng 20% sát thương).`;
            } else if (template.species === 'ky_lan') {
              skillName = 'Kỳ Lân Hộ Thể 🦄';
              skillDesc = `Tạo lá chắn bằng 20% HP tối đa (x${hoTheMult.toFixed(2)} từ tiến hóa).`;
            } else if (template.species === 'huyen_vu') {
              skillName = 'Cự Thần Hồng Hoang 🐢';
              skillDesc = `Gây độc bằng 5% (tối đa 10%) máu tối đa của chủ nhân trong 3 hiệp (cộng dồn tối đa 3 lần), tạo lá chắn bằng 25% HP tối đa của chủ nhân (x${hoTheMult.toFixed(2)} từ tiến hóa); khi đối phương bạo kích, giảm 20% (tối đa 50%) sát thương gánh chịu và phản lại 25% sát thương.`;
            } else if (template.species === 'bach_ho') {
              skillName = 'Bạch Hổ Sát Chiêu 🐅';
              skillDesc = `Gây 150% vật công (x${hoTheMult.toFixed(2)} từ tiến hóa), sau đó gây suy yếu giảm 20% (tối đa 50%) song công của mục tiêu trong 2 lượt, đồng thời xoá bỏ và kháng hiệu ứng bất lợi trong 2 lượt.`;
            }
            skillText = `\n• **Kỹ năng Thần Thú**: **${skillName}**\n  *Mô tả*: ${skillDesc}`;
          }

          let hoTheDesc = '';
          if (pet.fusedStats) {
            try {
              const stats = JSON.parse(pet.fusedStats);
              const parts = [];
              for (const [key, val] of Object.entries(stats)) {
                const pct = (val * 100).toFixed(2);
                let label = '';
                if (key === 'vat_cong') label = 'Sát thương Vật lý nền';
                else if (key === 'phap_cong') label = 'Pháp Công nền';
                else if (key === 'max_hp') label = 'HP tối đa';
                else if (key === 'giap') label = 'Hộ giáp nền';
                else if (key === 'ne') label = 'Né tránh';
                else if (key === 'crit_rate') label = 'Bạo kích';
                else if (key === 'tu_toc') label = 'Tu tốc nền';
                parts.push(`+${pct}% ${label}`);
              }
              hoTheDesc = `Hộ thể (Dung hợp): ${parts.join(' & ')}`;
            } catch(e) {
              hoTheDesc = template ? template.desc : '';
            }
          } else {
            hoTheDesc = template ? template.desc : '';
          }

          const embed = new EmbedBuilder()
            .setTitle(`🐯 Sủng Vật: ${pet.name}`)
            .setColor(0xe67e22)
            .setDescription(
              `• **Chủng loại**: ${speciesName}\n` +
              `• **Phẩm cấp**: ${rarityTag}\n` +
              `• **Trạng thái**: **${activeTag}**\n` +
              `• **Cấp độ**: \`Cấp ${pet.level}\` (EXP: \`${pet.exp} / ${nextLvlExp}\`)\n` +
              `• **Tư chất**: \`${pet.tuChat} / 250\` *(Tư chất càng cao chỉ số cộng cho tu sĩ càng lớn)*\n` +
              `• **Hiệu ứng hộ thể**: ${hoTheDesc}${evoTxt}${skillText}`
            );
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
          const template = config.PET_TEMPLATES[pet.type];
          const isThan = template && template.group === 'than_thu';
          const q = config.getPetQualityIndex(pet.rarity);
          const p = pet.tienHoa;
          const nextLvl = (q * 110) + (p + 1) * 10;
          const cost = config.getPetEvolutionCost(pet);

          const reqCount = (p < 5) ? 1 : ((p < 10) ? 2 : 3);
          const reqRarityCode = isThan ? 'TT_' + (q + 1) : 'LT_' + (q + 1);
          const reqLabel = config.PET_QUALITY_LABELS[reqRarityCode] || reqRarityCode;

          const allMyPets = await Pet.findAll({ where: { userId: tuSi.idNguoiDung } });
          const candidates = allMyPets.filter(fodder => canBeFodder(pet, fodder));

          let fodderSelectionText = '';
          if (selectedFodderIds.length > 0) {
            const chosenPets = allMyPets.filter(f => selectedFodderIds.includes(f.id));
            fodderSelectionText = `\n\n📋 **Danh sách phôi đã chọn (${chosenPets.length}/${reqCount})**:\n` +
              chosenPets.map(f => `- **${f.name}** (${getPetRarityText(f.rarity)} · Cấp ${f.level})`).join('\n');
          } else {
            fodderSelectionText = `\n\n⚠️ *Chưa chọn phôi. Đạo hữu có thể chọn thủ công từ danh sách bên dưới hoặc nhấn "Tự động chọn phôi".*`;
          }

          const embed = new EmbedBuilder()
            .setTitle(`🧬 Xác Nhận Tiến Hóa Sủng Vật`)
            .setColor(0xe67e22)
            .setDescription(
              `Đạo hữu có chắc chắn muốn tiến hóa sủng vật sau?\n\n` +
              `🐯 **Sủng Vật**: **${pet.name}** (${template?.name || pet.type})\n` +
              `   *Cấp độ*: \`Cấp ${pet.level}\` (Yêu cầu: \`Cấp ${nextLvl}\`)\n` +
              `   *Huyết mạch*: ${getPetRarityText(pet.rarity)}\n\n` +
              `💰 **Chi phí**: \`${cost.toLocaleString()}\` Linh Thạch (Hiện có: \`${tuSi.linhThach.toLocaleString()}\` Linh Thạch)\n` +
              `🧬 **Yêu cầu phôi**: Cần **${reqCount} phôi** ${isThan ? 'Thần Thú' : 'Linh Thú'} có Huyết mạch từ **${reqLabel}** trở lên (Khả dụng trong thú xá: \`${candidates.length}\` phôi).\n` +
              fodderSelectionText +
              `\n\n*Lưu ý: Phôi bị tiêu thụ sẽ biến mất vĩnh viễn khỏi tiên giới.*`
            )
            .setTimestamp();
          embeds.push(embed);
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

        // Dropdown chọn ô đất
        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('garden_slot_select')
              .setPlaceholder('🌾 Chọn ô đất muốn thao tác...')
              .addOptions(plots.map(p => {
                const statusText = p.status === 'EMPTY' ? 'Đất Trống' : 'Có cây';
                return {
                  label: `Ô Đất Số ${p.slotIndex + 1} (${statusText})`,
                  value: String(p.slotIndex)
                };
              }))
          )
        );

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
            rows.push(
              new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId('garden_plant_seed')
                  .setPlaceholder('🌱 Chọn hạt giống để gieo vào ô đất...')
                  .addOptions(seeds.map(s => ({
                    label: `${s.item.ten} (Có: ${s.soLuong})`,
                    value: s.item.id
                  })))
              )
            );
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
          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('alchemy_craft_pills')
                .setPlaceholder('🔮 Chọn linh thảo chế luyện Đan Tu Vi (Tốn 50 Linh thạch)...')
                .addOptions(herbs.map(h => ({
                  label: `${h.item.ten} (Có: ${h.soLuong})`,
                  value: h.item.id
                })))
            )
          );
        }

        // Lọc ra các đan dược Tu Vi trong balo để ăn
        const pills = sellableList.filter(e => e.item.id.startsWith('dan_tu_vi_'));
        if (pills.length > 0) {
          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('alchemy_consume_pill')
                .setPlaceholder('💊 Ăn Đan Dược gia tăng Tu Vi...')
                .addOptions(pills.map(p => ({
                  label: `${p.item.ten} (Có: ${p.soLuong})`,
                  value: p.item.id
                })))
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
      // 5. LUYỆN KHÍ (FORGE)
      // ══════════════════════════════════════════════════════════════
      else if (menu === 'FORGE') {
        // Công thức rèn đúc
        const recipes = [
          { label: '🗡️ Tiên Kiếm Tân Thủ (Kiếm Gỗ + 5 Luyện Khí Thạch + 200 LT)', value: 'kiem_go::kiem_tien_tan_thu' },
          { label: '🎋 Linh Trượng Tân Thủ (Mộc Trượng + 5 Luyện Khí Thạch + 200 LT)', value: 'truong_go::truong_tien_tan_thu' },
          { label: '🥋 Tiên Giáp Tân Thủ (Đạo Bào Vải + 5 Luyện Khí Thạch + 200 LT)', value: 'ao_vai::giap_tien_tan_thu' },

          { label: '⚔️ Thiết Kiếm (Trọng Thiết Thiết Kiếm + 5 Huyền Thiết Thạch + 200 LT)', value: 'kiem_sat_nang::kiem_sat' },
          { label: '🎋 Trúc Trượng (Phàm Trúc Trượng + 5 Huyền Thiết Thạch + 200 LT)', value: 'truong_truc_thuong::truong_truc' },
          { label: '🛡️ Thú Bì Giáp (Đạo Bào Vải Dày + 5 Huyền Thiết Thạch + 200 LT)', value: 'ao_vai_day::ao_da' },

          { label: '⚔️ Kim Đan Chân Kiếm (Đan Hỏa Thiết Kiếm + 5 Kim Đan Linh Sa + 200 LT)', value: 'kiem_kim_dan_thuong::kiem_kim_dan' },
          { label: '🎋 Đan Linh Pháp Trượng (Kim Đan Tiên Trượng + 5 Kim Đan Linh Sa + 200 LT)', value: 'truong_kim_dan_thuong::truong_kim_dan' },
          { label: '🛡️ Kim Đan Pháp Y (Đan Vân Bào + 5 Kim Đan Linh Sa + 200 LT)', value: 'ao_kim_dan_thuong::ao_kim_dan' },

          { label: '⚔️ Nguyên Anh Phá Thiên Kiếm (Sơn Hà Trọng Kiếm + 5 Nguyên Anh Hỏa Tinh + 200 LT)', value: 'kiem_nguyen_anh_thuong::kiem_nguyen_anh' },
          { label: '⚡ Nguyên Thần Tiên Trượng (Dục Hỏa Linh Trượng + 5 Nguyên Anh Hỏa Tinh + 200 LT)', value: 'truong_nguyen_anh_thuong::truong_nguyen_anh' },
          { label: '🛡️ Nguyên Anh Hộ Thể Giáp (Tiêu Dao Linh Bào + 5 Nguyên Anh Hỏa Tinh + 200 LT)', value: 'ao_nguyen_anh_thuong::ao_nguyen_anh' },

          { label: '🗡️ Huyền Thiết Trọng Kiếm (Cổ Thiết Trọng Binh + 5 Thần Ma Chi Tinh + 200 LT)', value: 'kiem_sat_co_khi::kiem_huyen_thiet' },
          { label: '🔮 Huyền Môn Ngọc Bội (Cổ Mộc Lôi Trượng + 5 Thần Ma Chi Tinh + 200 LT)', value: 'truong_go_co_loi::phap_bao_huyen_mon' },
          { label: '🥋 Huyền Thiết Linh Giáp (Cổ Lân Thú Giáp + 5 Thần Ma Chi Tinh + 200 LT)', value: 'ao_da_co_lan::giap_huyen_thiet' }
        ];

        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('forge_recipe_select')
              .setPlaceholder('🔨 Chọn công thức rèn đúc tiên binh...')
              .addOptions(recipes)
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
        const eggs = sellableList.filter(e => e.item.id.startsWith('trung_linh_thu') || e.item.id === 'trung_than_thu' || e.item.id === 'trung_than');
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
        const foods = sellableList.filter(e => (e.item.loai === 'Linh thảo' && e.item.id.includes('_')) || e.item.id.startsWith('van_yeu_qua_'));

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

        // Hàng 2: Menu chọn đồ ăn (phân trang 23 items/trang vì Discord giới hạn 25 options)
        const FOOD_PAGE_SIZE = 23;
        const totalFoodPages = foods.length > 0 ? Math.ceil(foods.length / FOOD_PAGE_SIZE) : 1;
        // Đảm bảo foodPage không vượt quá số trang hiện tại
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

          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('pet_action_quick_feed')
                .setPlaceholder('⚡ Ăn nhanh bằng bộ lọc...')
                .addOptions([
                  { label: 'Nuốt tất cả thức ăn', value: 'all', description: 'Ăn toàn bộ linh thảo và vạn yêu quả hiện có' },
                  { label: 'Chỉ ăn Vạn Yêu Quả', value: 'van_yeu_qua', description: 'Chỉ ăn các loại quả tăng kinh nghiệm' },
                  { label: 'Chỉ ăn Linh Thảo', value: 'linh_thao', description: 'Chỉ ăn các loại linh thảo' },
                  { label: 'Chỉ ăn thức ăn Phẩm Thấp (<1000 EXP)', value: 'quality_low', description: 'Linh thảo Luc/Lam/Tim/Vang & Quả Phế' },
                  { label: 'Chỉ ăn thức ăn Phẩm Cao (>=1000 EXP)', value: 'quality_high', description: 'Linh thảo Đỏ & Quả Hạ/Trung/Thuong/Tien/Than' }
                ])
            )
          );

          // Nút điều hướng trang thức ăn (chỉ hiện khi có > 1 trang)
          if (totalFoodPages > 1) {
            rows.push(
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('pet_food_prev')
                  .setLabel('◀ Trang Trước')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(foodPage === 0),
                new ButtonBuilder()
                  .setCustomId('pet_food_next')
                  .setLabel('Trang Sau ▶')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(foodPage >= totalFoodPages - 1)
              )
            );
          }
        } else {
          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('pet_action_feed_menu_disabled')
                .setPlaceholder('⚠️ Bạn không có thức ăn (Linh thảo/Vạn yêu quả) nào')
                .setDisabled(true)
                .addOptions([{ label: '(Trống)', value: '__empty__' }])
            )
          );
        }

        // Hàng 3: Nút tăng tư chất, tiến hóa + Quay lại
        const actionRow3 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('btn_back')
            .setLabel('↩️ Quay Lại')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('pet_action_enhance')
            .setLabel('✨ Tăng Tư Chất (Tốn 500 🪙)')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(tuSi.linhThach < 500 || (pet?.tuChat ?? 200) >= 250)
        );

        if (pet) {
          actionRow3.addComponents(
            new ButtonBuilder()
              .setCustomId('pet_action_fuse')
              .setLabel('🧬 Dung Hợp')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(myPets.length <= 1)
          );

          const isThan = ['to_long_1', 'to_long_2', 'phuong_hoang_1', 'phuong_hoang_2', 'ky_lan_1', 'ky_lan_2', 'huyen_vu_1', 'huyen_vu_2', 'bach_ho_1', 'bach_ho_2'].includes(pet.type);
          const q = config.getPetQualityIndex(pet.rarity);
          const p = pet.tienHoa;
          const nextLvl = (q * 110) + (p + 1) * 10;

          if (!pet.isMax) {
            const cost = config.getPetEvolutionCost(pet);
            const label = p < 10 ? `🧬 Tiến Hóa +${p + 1} (Cấp ${nextLvl})` : `🧬 Đột Phá Huyết Mạch (Cấp ${nextLvl})`;
            actionRow3.addComponents(
              new ButtonBuilder()
                .setCustomId('pet_action_evolve')
                .setLabel(`${label} [Tốn ${cost.toLocaleString()} 🪙]`)
                .setStyle(ButtonStyle.Success)
                .setDisabled(pet.level < nextLvl || tuSi.linhThach < cost)
            );
          }

          if (pet.isMax && !isThan) {
            const hasPill = sellableList.some(e => e.item.id === 'hoa_than_linh_sung_dan');
            actionRow3.addComponents(
              new ButtonBuilder()
                .setCustomId('pet_action_god_evolve')
                .setLabel('🧬 Hóa Thần Thú (Cần Hóa Thần Đan)')
                .setStyle(ButtonStyle.Success)
                .setDisabled(!hasPill)
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
        const otherPets = myPets.filter(p => String(p.id) !== String(selectedPetId));
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
          const q = config.getPetQualityIndex(pet.rarity);
          const p = pet.tienHoa;
          const reqCount = (p < 5) ? 1 : ((p < 10) ? 2 : 3);
          const cost = config.getPetEvolutionCost(pet);

          const hasEnoughLinhThach = tuSi.linhThach >= cost;
          const candidates = myPets.filter(fodder => canBeFodder(pet, fodder));

          // If selection is complete
          const isSelectionComplete = selectedFodderIds.length === reqCount;

          // Select menu for manual select (only show if not complete and there are candidates not already selected)
          const availableFodder = candidates.filter(c => !selectedFodderIds.includes(c.id));

          if (!isSelectionComplete && availableFodder.length > 0) {
            const selectOptions = availableFodder.slice(0, 25).map(c => ({
              label: c.name.substring(0, 50),
              value: String(c.id),
              description: `${getPetRarityText(c.rarity)} | Cấp ${c.level} | Tư chất: ${c.tuChat}`.substring(0, 100)
            }));

            rows.push(
              new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId('pet_evolve_fodder_select')
                  .setPlaceholder(`Chọn phôi tiến hóa thủ công (Cần ${reqCount} phôi)...`)
                  .addOptions(selectOptions)
              )
            );
          }

          const btnRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('pet_evolve_cancel')
              .setLabel('❌ Hủy Bỏ')
              .setStyle(ButtonStyle.Secondary)
          );

          if (!isSelectionComplete) {
            btnRow.addComponents(
              new ButtonBuilder()
                .setCustomId('pet_evolve_auto_select')
                .setLabel('🤖 Tự Động Chọn Phôi')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(candidates.length < reqCount)
            );
          } else {
            btnRow.addComponents(
              new ButtonBuilder()
                .setCustomId('pet_evolve_confirm')
                .setLabel('🔥 Xác Nhận Tiến Hóa')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!hasEnoughLinhThach || pet.level < (q * 110 + (p + 1) * 10))
            );

            btnRow.addComponents(
              new ButtonBuilder()
                .setCustomId('pet_evolve_reset_fodder')
                .setLabel('🔄 Chọn Lại')
                .setStyle(ButtonStyle.Secondary)
            );
          }

          rows.push(btnRow);
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

    let myInventory = await loadPlayerInventory(tuSi.idNguoiDung);
    let myPets = await Pet.findAll({ where: { userId: tuSi.idNguoiDung } });

    const msg = await interaction.editReply({
      embeds: await buildEmbeds(),
      components: await buildComponents(myInventory, myPets)
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
          menuStack.push('GARDEN_SLOT');
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

            // Tưới nước: đẩy mốc planted_at của toàn bộ ô lùi về quá khứ 30 phút (tương đương 2 Đạo Niên)
            const plots = await GardenPlot.findAll({ where: { userId: tuSi.idNguoiDung, status: 'PLANTED' } });
            for (const p of plots) {
              const newPlantedTime = new Date(new Date(p.plantedAt).getTime() - 30 * 60 * 1000);
              p.plantedAt = newPlantedTime;
              await p.save();
            }

            actionMessage = BoTaoEmbed.thanhCong('💦 Tưới Nước Linh Thảo', 'Linh dịch ngọt lành đã thẩm thấu, rút ngắn thời gian sinh trưởng đi 2 Đạo Niên!');
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
        }
      }

      // ── XỬ LÝ CHI TIẾT Ô ĐẤT (GARDEN_SLOT) ─────────────────────────────────
      else if (currentMenu === 'GARDEN_SLOT') {
        const plot = await GardenPlot.findOne({ where: { userId: tuSi.idNguoiDung, slotIndex: selectedSlotIndex } });

        if (i.customId === 'garden_plant_seed') {
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

      // ── XỬ LÝ LUYỆN ĐAN (ALCHEMY) ─────────────────────────────────────────
      else if (currentMenu === 'ALCHEMY') {
        if (i.customId === 'alchemy_craft_pills') {
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
          const hasVideo = eggId === 'trung_linh_thu_tien' || eggId === 'trung_linh_thu_than' || eggId === 'trung_than_thu' || eggId === 'trung_than';

          if (hasVideo) {
            const { AttachmentBuilder } = await import('discord.js');
            const videoPath = eggId === 'trung_linh_thu_tien'
              ? './public/video/pet/dap_trung.mp4'
              : './public/video/pet/dap_trung_than.mp4';
            const eggNameText = eggId === 'trung_linh_thu_tien' ? 'Trứng Linh Thú (Tiên)'
              : eggId === 'trung_than' ? 'Trứng Thần Thú 🌟'
                : eggId === 'trung_than_thu' ? 'Trứng Thần Thú Thượng Cổ 🌟'
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
            const allFoods = myInventory.filter(e => (e.item.loai === 'Linh thảo' && e.item.id.includes('_')) || e.item.id.startsWith('van_yeu_qua_'));
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
                // Chỉ lấy items có food = 1 (được phép làm thức ăn)
                if (e.item.food !== 1) return false;

                const isLinhThao = e.item.loai === 'Linh thảo' && e.item.id.includes('_');
                const isVanYeuQua = e.item.id.startsWith('van_yeu_qua_');
                if (!isLinhThao && !isVanYeuQua) return false;

                if (filterId === 'van_yeu_qua') return isVanYeuQua;
                if (filterId === 'linh_thao') return isLinhThao;

                const expMap = {
                  van_yeu_qua_phe: 500,
                  van_yeu_qua_ha: 1000,
                  van_yeu_qua_trung: 2000,
                  van_yeu_qua_thuong: 4000,
                  van_yeu_qua_tien: 8000,
                  van_yeu_qua_than: 16000
                };
                let exp = 0;
                if (e.item.id.startsWith('van_yeu_qua_')) {
                  exp = expMap[e.item.id] || 500;
                } else {
                  const legacyExpMap = { luc: 20, lam: 60, tim: 200, vang: 600, do: 2000 };
                  const colorCode = e.item.id.split('_').pop();
                  exp = legacyExpMap[colorCode] || 20;
                }

                if (filterId === 'quality_low') return exp < 1000;
                if (filterId === 'quality_high') return exp >= 1000;

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
            const expMap = {
              van_yeu_qua_phe: 500,
              van_yeu_qua_ha: 1000,
              van_yeu_qua_trung: 2000,
              van_yeu_qua_thuong: 4000,
              van_yeu_qua_tien: 8000,
              van_yeu_qua_than: 16000
            };

            let expGained = 0;
            let foodDetail = null;
            if (foodId.startsWith('van_yeu_qua_')) {
              expGained = expMap[foodId] || 500;
              foodDetail = config.ITEMS.find(item => item.id === foodId);
            } else {
              const legacyExpMap = { luc: 20, lam: 60, tim: 200, vang: 600, do: 2000 };
              const colorCode = foodId.split('_').pop();
              expGained = legacyExpMap[colorCode] || 20;
              foodDetail = config.ITEMS.find(item => item.id === foodId);
            }

            if (foodDetail) {
              const inv = await Inventory.findOne({ where: { idNguoiDung: tuSi.idNguoiDung, itemId: foodId } });
              if (inv && inv.soLuong > 0) {
                inv.soLuong -= 1;
                if (inv.soLuong <= 0) await inv.destroy();
                else await inv.save();

                pet.exp += expGained;
                let lvlUp = false;
                const levelCap = config.getPetLevelCap(pet);

                while (pet.level < levelCap && pet.exp >= pet.level * 100) {
                  pet.exp -= pet.level * 100;
                  pet.level += 1;
                  lvlUp = true;
                }
                await pet.save();

                const foodName = foodDetail.ten;
                actionMessage = BoTaoEmbed.thanhCong(
                  '🍼 Cho Ăn Thành Công',
                  `Cho **${pet.name}** ăn **${foodName}** nhận \`+${expGained} EXP\`.` +
                  (lvlUp ? `\n🎉 **Sủng vật thăng lên Cấp ${pet.level}!**` : '') +
                  (pet.level === levelCap && pet.exp >= pet.level * 100 ? `\n⚠️ **Sủng vật đạt giới hạn cấp độ ${levelCap}. Hãy tiến hóa để mở khóa giới hạn.**` : '')
                );
              } else {
                actionMessage = BoTaoEmbed.thatBai('Cho Ăn Thất Bại', 'Số lượng thức ăn trong hành lý không đủ.');
              }
            }
          } else if (i.customId === 'pet_action_fuse') {
            if (pet.isActive) {
              actionMessage = BoTaoEmbed.thatBai('🧬 Dung Hợp Thất Bại', 'Không thể dung hợp Linh Thú đang xuất chiến. Hãy cho sủng vật nghỉ ngơi trước.');
            } else {
              menuStack.push('PET_FUSION_SELECT');
              fusionPage = 0;
            }
          } else if (i.customId === 'pet_action_enhance') {
            if (tuSi.linhThach >= 500 && pet.tuChat < 250) {
              tuSi.linhThach -= 500;
              await tuSi.save();

              const randEnhance = Math.floor(Math.random() * 5) + 1;
              pet.tuChat = Math.min(250, pet.tuChat + randEnhance);
              await pet.save();

              actionMessage = BoTaoEmbed.thanhCong(
                '✨ Tăng Cường Tư Chất',
                `Tư chất **${pet.name}** tăng thêm \`+${randEnhance}\` điểm (Hiện tại: \`${pet.tuChat}/250\`).`
              );
            }
          } else if (i.customId === 'pet_action_evolve') {
            const q = config.getPetQualityIndex(pet.rarity);
            const p = pet.tienHoa;
            const nextLvl = (q * 110) + (p + 1) * 10;

            if (pet.level < nextLvl) {
              actionMessage = BoTaoEmbed.thatBai('🧬 Tiến Hóa Thất Bại', `Cần sủng vật đạt tối thiểu cấp ${nextLvl} để tiến hóa.`);
            } else {
              menuStack.push('PET_EVOLVE_CONFIRM');
              selectedFodderIds = [];
            }
          } else if (i.customId === 'pet_action_reset') {
            menuStack.push('PET_RESET_CONFIRM');
          } else if (i.customId === 'pet_action_god_evolve') {
            const isThan = ['to_long_1', 'to_long_2', 'phuong_hoang_1', 'phuong_hoang_2', 'ky_lan_1', 'ky_lan_2', 'huyen_vu_1', 'huyen_vu_2', 'bach_ho_1', 'bach_ho_2'].includes(pet.type);
            if (!pet.isMax || isThan) {
              actionMessage = BoTaoEmbed.thatBai('🧬 Hóa Thần Thất Bại', 'Chỉ sủng vật Linh Thú đạt cấp độ MAX mới có thể Hóa Thần.');
            } else {
              const pillInv = await Inventory.findOne({ where: { idNguoiDung: tuSi.idNguoiDung, itemId: 'hoa_than_linh_sung_dan' } });
              if (!pillInv || pillInv.soLuong <= 0) {
                actionMessage = BoTaoEmbed.thatBai('🧬 Hóa Thần Thất Bại', 'Đạo hữu không có Hóa Thần Linh Sủng Đan.');
              } else {
                pillInv.soLuong -= 1;
                if (pillInv.soLuong <= 0) await pillInv.destroy();
                else await pillInv.save();

                const thanTemplates = config.PET_TEMPLATES_SEED.filter(t => t.group === 'than_thu');
                const randomThan = thanTemplates[Math.floor(Math.random() * thanTemplates.length)];

                const oldName = pet.name;
                pet.type = randomThan.id;
                pet.rarity = 'TT_4';
                pet.tienHoa = 10;
                pet.extraEvo = 1;
                pet.isMax = true;
                pet.name = config.getFormattedPetName(randomThan.name, 'TT_4', 10, true);
                await pet.save();

                actionMessage = BoTaoEmbed.thanhCong(
                  '🌌 Nghịch Thiên Hóa Thần',
                  `Chúc mừng! Linh thú **${oldName}** đã hóa thân thành công, lột xác thành **Thần Thú: ${pet.name}**! ` +
                  `Bảo lưu toàn bộ \`44\` lần tiến hóa cộng dồn trước đó.`
                );
              }
            }
          }
        }
      }

      // ── XỬ LÝ XÁC NHẬN TRÙNG SINH (PET_RESET_CONFIRM) ─────────────────────
      else if (currentMenu === 'PET_RESET_CONFIRM') {
        const pet = await Pet.findByPk(selectedPetId);
        if (i.customId === 'pet_reset_confirm_yes') {
          if (pet) {
            let refundedStones = 0;
            const isThan = ['to_long_1', 'to_long_2', 'phuong_hoang_1', 'phuong_hoang_2', 'ky_lan_1', 'ky_lan_2', 'huyen_vu_1', 'huyen_vu_2', 'bach_ho_1', 'bach_ho_2'].includes(pet.type);
            const baseCost = isThan ? 10000 : 1000;
            const totalEvolves = config.getPetTotalEvolves(pet);

            for (let step = 0; step < totalEvolves; step++) {
              refundedStones += Math.floor(baseCost * Math.pow(1.25, step));
            }

            let totalExp = 50 * pet.level * (pet.level - 1) + pet.exp;
            let expLeft = totalExp;
            const refundFruits = {
              van_yeu_qua_than: 0,
              van_yeu_qua_tien: 0,
              van_yeu_qua_thuong: 0,
              van_yeu_qua_trung: 0,
              van_yeu_qua_ha: 0,
              van_yeu_qua_phe: 0
            };

            refundFruits.van_yeu_qua_than = Math.floor(expLeft / 16000);
            expLeft %= 16000;

            refundFruits.van_yeu_qua_tien = Math.floor(expLeft / 8000);
            expLeft %= 8000;

            refundFruits.van_yeu_qua_thuong = Math.floor(expLeft / 4000);
            expLeft %= 4000;

            refundFruits.van_yeu_qua_trung = Math.floor(expLeft / 2000);
            expLeft %= 2000;

            refundFruits.van_yeu_qua_ha = Math.floor(expLeft / 1000);
            expLeft %= 1000;

            refundFruits.van_yeu_qua_phe = Math.ceil(expLeft / 500);

            tuSi.linhThach += refundedStones;
            await tuSi.save();

            let refundListMsg = '';
            for (const [fruitId, count] of Object.entries(refundFruits)) {
              if (count > 0) {
                await Inventory.addVatPham(tuSi.idNguoiDung, fruitId, count);
                const fDetail = config.ITEMS.find(item => item.id === fruitId);
                refundListMsg += `\n• **${fDetail?.ten || fruitId}** x${count}`;
              }
            }

            pet.level = 1;
            pet.exp = 0;
            pet.tienHoa = 0;
            pet.extraEvo = 0;
            pet.isMax = false;
            pet.rarity = isThan ? 'TT_1' : 'LT_1';
            const cleanName = pet.name.replace(/(\s\+\d+|\[MAX\]|\[Tiến\s*[Hh]óa\]\s*)/g, '').trim();
            pet.name = config.getFormattedPetName(cleanName, pet.rarity, 0, false);
            await pet.save();

            actionMessage = BoTaoEmbed.thanhCong(
              '🔄 Trùng Sinh Sủng Vật',
              `Đã trùng sinh sủng vật thành công về Cấp 1.\n` +
              `**Hoàn trả**: \`+${refundedStones.toLocaleString()} Linh thạch\` 🪙${refundListMsg}`
            );
          }
          menuStack.pop(); // Quay lại PET_DETAIL
        } else if (i.customId === 'pet_reset_confirm_no') {
          menuStack.pop(); // Quay lại PET_DETAIL
        }
      }

      else if (currentMenu === 'PET_EVOLVE_CONFIRM') {
        const pet = await Pet.findByPk(selectedPetId);
        if (pet) {
          const q = config.getPetQualityIndex(pet.rarity);
          const p = pet.tienHoa;
          const reqCount = (p < 5) ? 1 : ((p < 10) ? 2 : 3);
          const allMyPets = await Pet.findAll({ where: { userId: tuSi.idNguoiDung } });
          const candidates = allMyPets.filter(fodder => canBeFodder(pet, fodder));

          if (i.customId === 'pet_evolve_cancel') {
            menuStack.pop();
            selectedFodderIds = [];
          } else if (i.customId === 'pet_evolve_reset_fodder') {
            selectedFodderIds = [];
          } else if (i.customId === 'pet_evolve_auto_select') {
            // Sort candidates by quality, level, tuChat to consume weakest first
            candidates.sort((a, b) => {
              const qA = config.getPetQualityIndex(a.rarity);
              const qB = config.getPetQualityIndex(b.rarity);
              if (qA !== qB) return qA - qB;
              if (a.level !== b.level) return a.level - b.level;
              return a.tuChat - b.tuChat;
            });
            selectedFodderIds = candidates.slice(0, reqCount).map(c => c.id);
          } else if (i.customId === 'pet_evolve_fodder_select') {
            const fid = parseInt(i.values[0], 10);
            if (!selectedFodderIds.includes(fid)) {
              selectedFodderIds.push(fid);
            }
          } else if (i.customId === 'pet_evolve_confirm') {
            const cost = config.getPetEvolutionCost(pet);
            if (tuSi.linhThach < cost) {
              actionMessage = BoTaoEmbed.thatBai('🧬 Tiến Hóa Thất Bại', `Không đủ linh thạch (Cần ${cost.toLocaleString()}).`);
            } else if (selectedFodderIds.length < reqCount) {
              actionMessage = BoTaoEmbed.thatBai('🧬 Tiến Hóa Thất Bại', `Vui lòng chọn đủ ${reqCount} phôi sủng vật.`);
            } else {
              // Deduct cost
              tuSi.linhThach -= cost;
              await tuSi.save();

              // Consume fodder
              const consumedList = [];
              for (const fid of selectedFodderIds) {
                const fpet = await Pet.findByPk(fid);
                if (fpet) {
                  consumedList.push(fpet.name);
                  await fpet.destroy();
                }
              }

              // Do evolution
              let isBreakthrough = false;
              let upgradeMsg = '';

              if (pet.tienHoa < 10) {
                pet.tienHoa += 1;
                pet.tuChat = Math.min(250, pet.tuChat + 5);

                if (pet.tienHoa === 10) {
                  if (pet.rarity.endsWith('_4')) {
                    pet.isMax = true;
                    pet.extraEvo = 1;
                    pet.tuChat = Math.min(250, pet.tuChat + 15);
                    upgradeMsg = `\n🎉 **Huyết mạch đạt trạng thái cực hạn [MAX]!**`;
                  }
                }
              } else {
                const rarityPrefix = pet.rarity.slice(0, 3);
                const curQualityIndex = config.getPetQualityIndex(pet.rarity);
                if (curQualityIndex < 3) {
                  const nextQualityIndex = curQualityIndex + 2;
                  pet.rarity = `${rarityPrefix}${nextQualityIndex}`;
                  pet.tienHoa = 0;
                  pet.tuChat = Math.min(250, pet.tuChat + 15);
                  isBreakthrough = true;
                }
              }

              let lvlUpAfterEvo = false;
              const newLevelCap = config.getPetLevelCap(pet);
              while (pet.level < newLevelCap && pet.exp >= pet.level * 100) {
                pet.exp -= pet.level * 100;
                pet.level += 1;
                lvlUpAfterEvo = true;
              }

              const cleanName = pet.name.replace(/(\s\+\d+|\[MAX\]|\[Tiến\s*[Hh]óa\]\s*)/g, '').trim();
              pet.name = config.getFormattedPetName(cleanName, pet.rarity, pet.tienHoa, pet.isMax);
              await pet.save();

              const rarityText = getPetRarityText(pet.rarity);
              if (isBreakthrough) {
                upgradeMsg = `\n🎉 **Bộc phát tiềm năng!** Sủng vật đã đột phá huyết mạch lên **${rarityText}** và thiết lập lại cấp tiến hóa về \`+0\`!`;
              }

              actionMessage = BoTaoEmbed.thanhCong(
                '🧬 Sủng Vật Tiến Hóa Thành Công',
                `**${pet.name}** đã hoàn tất đột phá tiến hóa! Tư chất tăng mạnh.\n` +
                `🔥 **Đã tiêu thụ phôi**: ${consumedList.map(n => `**${n}**`).join(', ')}.\n` +
                `${upgradeMsg}` +
                (lvlUpAfterEvo ? `\n🎉 Lượng exp tích lũy giúp sủng vật thăng lên **Cấp ${pet.level}!**` : '')
              );

              selectedFodderIds = [];
              menuStack.pop();
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
            const cost = (isThanA || isThanB) ? 100000 : 5000;

            if (tuSi.linhThach < cost) {
              actionMessage = BoTaoEmbed.thatBai('🧬 Dung Hợp Thất Bại', `Không đủ linh thạch (Cần ${cost.toLocaleString()} Linh Thạch).`);
            } else {
              tuSi.linhThach -= cost;
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
        components: await buildComponents(myInventory, myPets)
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

    const colorCode = herbId.split('_').pop(); // 'luc', 'lam', 'tim', 'vang', 'do'
    const roll = Math.random() * 100;

    let targetPillId = 'dan_tu_vi_trang'; // Mặc định Trắng

    if (colorCode === 'luc') {
      if (roll <= 0.1) targetPillId = 'dan_tu_vi_do';
      else if (roll <= 1.0) targetPillId = 'dan_tu_vi_vang';
      else if (roll <= 10.0) targetPillId = 'dan_tu_vi_tim';
      else if (roll <= 30.0) targetPillId = 'dan_tu_vi_lam';
      else if (roll <= 60.0) targetPillId = 'dan_tu_vi_luc';
    } else if (colorCode === 'lam') {
      if (roll <= 0.5) targetPillId = 'dan_tu_vi_do';
      else if (roll <= 3.0) targetPillId = 'dan_tu_vi_vang';
      else if (roll <= 20.0) targetPillId = 'dan_tu_vi_tim';
      else if (roll <= 50.0) targetPillId = 'dan_tu_vi_lam';
      else targetPillId = 'dan_tu_vi_luc';
    } else if (colorCode === 'tim') {
      if (roll <= 2.0) targetPillId = 'dan_tu_vi_do';
      else if (roll <= 10.0) targetPillId = 'dan_tu_vi_vang';
      else if (roll <= 40.0) targetPillId = 'dan_tu_vi_tim';
      else targetPillId = 'dan_tu_vi_lam';
    } else if (colorCode === 'vang') {
      if (roll <= 10.0) targetPillId = 'dan_tu_vi_do';
      else if (roll <= 50.0) targetPillId = 'dan_tu_vi_vang';
      else targetPillId = 'dan_tu_vi_tim';
    } else if (colorCode === 'do') {
      if (roll <= 70.0) targetPillId = 'dan_tu_vi_do';
      else targetPillId = 'dan_tu_vi_vang';
    }

    await Inventory.addVatPham(tuSi.idNguoiDung, targetPillId, 1);
    const targetItem = config.ITEMS.find(e => e.id === targetPillId);

    return {
      ok: true,
      msg: `Luyện đan hoàn tất! Đạo hữu luyện chế ra: **${targetItem?.ten ?? targetPillId}**.`
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPER: ĂN ĐAN DƯỢC TĂNG TU VI
  // ─────────────────────────────────────────────────────────────────────────
  async _processConsumePill(tuSi, abode, pillId) {
    if (abode.pillCount >= PILLS_DAILY_LIMIT) {
      return { ok: false, msg: `Cơ thể đạo hữu đã đạt giới hạn kháng dược! Hôm nay không thể ăn thêm đan dược tu vi nữa (Tối đa ${PILLS_DAILY_LIMIT} viên/ngày).` };
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

    // Đan dược tu vi: Trắng x4 Đạo Niên, Lục x8, Lam x16, Tím x32, Vàng x64, Đỏ x128
    const pillBonusMap = {
      'dan_tu_vi_trang': 4,
      'dan_tu_vi_luc': 8,
      'dan_tu_vi_lam': 16,
      'dan_tu_vi_tim': 32,
      'dan_tu_vi_vang': 64,
      'dan_tu_vi_do': 128
    };

    const countDaoNien = pillBonusMap[pillId] || 4;
    const gainedExp = Math.floor(tocDoGoc * countDaoNien);

    tuSi.linhLuc += gainedExp;
    await tuSi.save();

    abode.pillCount += 1;
    await abode.save();

    const pillItem = config.ITEMS.find(e => e.id === pillId);

    return {
      ok: true,
      msg: `Hóa Dược Nhập Thể! Đạo hữu ăn **${pillItem?.ten}** dược lực tan ra, lập tức nhận được \`+${gainedExp.toLocaleString()}\` Linh Lực.`
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPER: XỬ LÝ LUYỆN KHÍ
  // ─────────────────────────────────────────────────────────────────────────
  async _processForge(tuSi, oldId, newId) {
    // 1. Kiểm tra phế khí trong balo (phải chưa trang bị)
    const invOld = await Inventory.findOne({ where: { idNguoiDung: tuSi.idNguoiDung, itemId: oldId, trangBi: false } });
    if (!invOld) {
      const oldItem = config.ITEMS.find(e => e.id === oldId);
      return { ok: false, msg: `Thiếu phế khí trong túi! Đạo hữu cần 1 chiếc **${oldItem?.ten ?? oldId}** chưa mặc.` };
    }

    // Bản đồ nguyên liệu cho từng dòng trang bị nâng cấp
    const FORGE_MATERIALS = {
      // Luyện Khí
      'kiem_tien_tan_thu': { materialId: 'nguyen_lieu_luyen_khi', count: 5, matName: 'Luyện Khí Thạch 💎' },
      'truong_tien_tan_thu': { materialId: 'nguyen_lieu_luyen_khi', count: 5, matName: 'Luyện Khí Thạch 💎' },
      'giap_tien_tan_thu': { materialId: 'nguyen_lieu_luyen_khi', count: 5, matName: 'Luyện Khí Thạch 💎' },

      // Trúc Cơ
      'kiem_sat': { materialId: 'nguyen_lieu_truc_co', count: 5, matName: 'Huyền Thiết Thạch 🪙' },
      'truong_truc': { materialId: 'nguyen_lieu_truc_co', count: 5, matName: 'Huyền Thiết Thạch 🪙' },
      'ao_da': { materialId: 'nguyen_lieu_truc_co', count: 5, matName: 'Huyền Thiết Thạch 🪙' },

      // Kim Đan
      'kiem_kim_dan': { materialId: 'nguyen_lieu_kim_dan', count: 5, matName: 'Kim Đan Linh Sa 🪨' },
      'truong_kim_dan': { materialId: 'nguyen_lieu_kim_dan', count: 5, matName: 'Kim Đan Linh Sa 🪨' },
      'ao_kim_dan': { materialId: 'nguyen_lieu_kim_dan', count: 5, matName: 'Kim Đan Linh Sa 🪨' },

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
    if (reqMat) {
      invMat = await Inventory.findOne({ where: { idNguoiDung: tuSi.idNguoiDung, itemId: reqMat.materialId } });
      if (!invMat || invMat.soLuong < reqMat.count) {
        return { ok: false, msg: `Thiếu nguyên liệu rèn! Đạo hữu cần có thêm **${reqMat.count}** chiếc **${reqMat.matName}**.` };
      }
    }

    if (tuSi.linhThach < 200) {
      return { ok: false, msg: 'Linh thạch bất túc! Cần 200 Linh thạch để đốt lò đúc khí.' };
    }

    // Tiêu hao phế khí
    await invOld.destroy();

    // Tiêu hao nguyên liệu luyện khí
    if (reqMat && invMat) {
      invMat.soLuong -= reqMat.count;
      if (invMat.soLuong <= 0) await invMat.destroy();
      else await invMat.save();
    }

    tuSi.linhThach -= 200;
    await tuSi.save();

    // 2. Chế tạo trang bị mới
    const record = await Inventory.addVatPham(tuSi.idNguoiDung, newId, 1);
    const newItem = config.ITEMS.find(e => e.id === newId);

    return {
      ok: true,
      msg: `Luyện Khí Thành Công! Bạn đã tiêu hao nguyên liệu và luyện đúc thành công **${newItem?.ten ?? newId}** (Mã: #${record.id})!`
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

    // Trứng Thần Thú Thượng Cổ: đảm bảo 100% ra Thần Thú Huyết Mạch Thái Cổ (TT_1)
    // Các loại trứng khác: roll theo tỷ lệ
    let isThan = false;

    if (eggId === 'trung_than_thu') {
      // 100% Thần Thú
      isThan = true;
    } else {
      let rollThanThuRate = 0; // Tỷ lệ nở ra Thần Thú
      if (eggId === 'trung_linh_thu_than' || eggId === 'trung_than') {
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
    }

    let selectedTemplate = null;
    if (isThan) {
      const templates = config.PET_TEMPLATES_SEED.filter(t => t.group === 'than_thu');
      selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
    } else {
      const templates = config.PET_TEMPLATES_SEED.filter(t => t.group === 'linh_thu');
      selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
    }

    const rarity = isThan ? 'TT_1' : 'LT_1';
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
      // 10% cơ hội trứng thượng cổ
      if (eggRoll <= 10.0) {
        targetEggId = 'trung_than_thu';
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
    'hat_giong_dai_thua_qua': { herbId: 'linh_thao_dai_thua', name: 'Đại Thừa Tinh Quả 🍇' }
  };

  let seedName = 'Hạt giống Linh Thảo 🌰';
  if (isLinhChi) seedName = 'Hạt giống Linh Chi 🌰';
  else if (isNhanSam) seedName = 'Hạt giống Nhân Sâm 🌰';
  else if (SEED_TO_HERB_MAP[plot.seedItemId]) {
    seedName = `Hạt giống ${SEED_TO_HERB_MAP[plot.seedItemId].name.replace(/🌿|🌸|🍒|🍄|🍀|💮|🍇/, '').trim()} 🌰`;
  }

  let herbId = '';
  let herbName = '';
  let ready = false;

  // Cấu hình thời gian trồng và phẩm chất thu hoạch
  if (age >= 4) {
    ready = true;
    if (isLinhChi) {
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
