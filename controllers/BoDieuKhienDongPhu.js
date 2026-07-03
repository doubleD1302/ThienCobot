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

// Phẩm chất màu sắc
const QUALITY_EMOJIS = {
  'trang': '⚪ Phế phẩm',
  'luc':   '🟢 Phàm phẩm',
  'lam':   '🔵 Ưu phẩm',
  'tim':   '🟣 Siêu phẩm',
  'vang':  '🟡 Tuyệt phẩm',
  'do':    '🔴 Tiên phẩm'
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
      let actionMessage = null;     // Lưu thông báo kết quả hành động

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
            const petText = activePet ? `${PET_TEMPLATES[activePet.type]?.name} (Cấp ${activePet.level})` : '*Chưa xuất chiến*';
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
          const desc = myPets.map((p, idx) => {
            const activeTag = p.isActive ? ' 🟢 **[Xuất Chiến]**' : '';
            const rarityTag = ` · ${getPetRarityText(p.rarity)}`;
            const template = config.PET_TEMPLATES[p.type];
            const speciesName = template ? template.name : p.type;
            const effectDesc = template ? template.desc : '';
            return `**${idx + 1}.** **${p.name}**${rarityTag}${activeTag}\n` +
                   `   *Loài:* ${speciesName} · *Cấp:* \`${p.level}\` · *Tư chất:* \`${p.tuChat} / 250\`\n` +
                   `   *Hiệu ứng:* ${effectDesc}`;
          }).join('\n\n') || '_Đạo hữu chưa nuôi dưỡng sủng vật nào. Hãy khám phá bí cảnh để tìm kiếm trứng linh thú!_';

          const embed = new EmbedBuilder()
            .setTitle(`🐅 Thú Xá Sủng Vật: ${tuSi.ten}`)
            .setColor(0xe67e22)
            .setDescription(desc);
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

            const hoTheMult = Math.pow(1.1, totalEvolves);
            const hoTheBonusPct = ((hoTheMult - 1) * 100).toFixed(1);
            let evoTxt = ` (+${hoTheBonusPct}% Hộ Thể)`;

            const isThan = template && template.group === 'than_thu';
            if (isThan) {
              const skillMult = Math.pow(1.1, totalEvolves);
              const skillBonusPct = ((skillMult - 1) * 100).toFixed(1);
              evoTxt = ` (+${hoTheBonusPct}% Hộ Thể & +${skillBonusPct}% Kỹ Năng)`;
            }

            const speciesName = template ? template.name : pet.type;
            let skillText = '';
            if (isThan) {
              let skillName = 'Chưa rõ';
              let skillDesc = 'Chưa rõ';
              if (template.species === 'to_long') {
                skillName = 'Long Thần Chi Nộ 🐉';
                skillDesc = `Phát động Long Thần Chi Nộ gây sát thương bằng 15% HP tối đa của bản thân (x${hoTheMult.toFixed(2)} từ tiến hóa).`;
              } else if (template.species === 'phuong_hoang') {
                skillName = 'Niết Bàn Trùng Sinh 🐦';
                skillDesc = `Hồi sinh lập tức khi HP về 0, khôi phục 30% HP tối đa (x${hoTheMult.toFixed(2)} từ tiến hóa).`;
              } else if (template.species === 'ky_lan') {
                skillName = 'Kỳ Lân Hộ Thể 🦄';
                skillDesc = `Tạo lá chắn bằng 20% HP tối đa (x${hoTheMult.toFixed(2)} từ tiến hóa).`;
              } else if (template.species === 'huyen_vu') {
                skillName = 'Huyền Vũ Bảo Vệ 🐢';
                skillDesc = `Tạo lá chắn bằng 25% HP tối đa (x${hoTheMult.toFixed(2)} từ tiến hóa).`;
              } else if (template.species === 'bach_ho') {
                skillName = 'Bạch Hổ Sát Chiêu 🐅';
                skillDesc = `Phát động Bạch Hổ Sát Chiêu gây sát thương bằng 18% HP tối đa (x${hoTheMult.toFixed(2)} từ tiến hóa).`;
              }
              skillText = `\n• **Kỹ năng Thần Thú**: **${skillName}**\n  *Mô tả*: ${skillDesc}`;
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
                `• **Hiệu ứng hộ thể**: ${template ? template.desc : ''}${evoTxt}${skillText}`
              );
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
            { label: '🗡️ Tiên Kiếm Tân Thủ (Cần Kiếm Gỗ + 200 Linh Thạch)', value: 'kiem_go::kiem_tien_tan_thu' },
            { label: '🎋 Linh Trượng Tân Thủ (Cần Mộc Trượng + 200 Linh Thạch)', value: 'truong_go::truong_tien_tan_thu' },
            { label: '🥋 Tiên Giáp Tân Thủ (Cần Đạo Bào Vải + 200 Linh Thạch)', value: 'ao_vai::giap_tien_tan_thu' }
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
          if (myPets.length > 0) {
            rows.push(
              new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId('pet_select')
                  .setPlaceholder('🐾 Chọn sủng vật để chăm sóc/lệnh xuất chiến...')
                  .addOptions(myPets.map(p => ({
                    label: p.name,
                    value: String(p.id)
                  })))
              )
            );
          }

          // Trứng ấp sủng vật
          const eggs = sellableList.filter(e => e.item.id.startsWith('trung_linh_thu') || e.item.id === 'trung_than_thu');
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

          // Hàng 2: Menu chọn đồ ăn
          if (foods.length > 0) {
            rows.push(
              new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId('pet_action_feed_menu')
                  .setPlaceholder('🍼 Chọn thức ăn để tăng EXP cho sủng vật...')
                  .addOptions(foods.map(f => ({
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
                  .setPlaceholder('⚠️ Bạn không có thức ăn (Linh thảo/Vạn yêu quả) nào')
                  .setDisabled(true)
                  .addOptions([{ label: '(Trống)', value: '__empty__' }])
              )
            );
          }

          // Hàng 3: Nút tăng tư chất, tiến hóa
          const actionRow3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('pet_action_enhance')
              .setLabel('✨ Tăng Tư Chất (Tốn 500 🪙)')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(tuSi.linhThach < 500 || (pet?.tuChat ?? 200) >= 250)
          );

          if (pet) {
            const isThan = ['to_long_1', 'to_long_2', 'phuong_hoang_1', 'phuong_hoang_2', 'ky_lan_1', 'ky_lan_2', 'huyen_vu_1', 'huyen_vu_2', 'bach_ho_1', 'bach_ho_2'].includes(pet.type);
            const q = config.getPetQualityIndex(pet.rarity);
            const p = pet.tienHoa;
            const nextLvl = (q * 110) + (p + 1) * 10;

            if (!pet.isMax) {
              const cost = config.getPetEvolutionCost(pet);
              const label = p < 10 ? `🧬 Tiến Hóa +${p+1} (Cấp ${nextLvl})` : `🧬 Đột Phá Huyết Mạch (Cấp ${nextLvl})`;
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
      let myPets      = await Pet.findAll({ where: { userId: tuSi.idNguoiDung } });

      const msg = await interaction.editReply({
        embeds:     await buildEmbeds(),
        components: await buildComponents(myInventory, myPets)
      });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time:   300_000 // Tương tác Động phủ trong 5 phút
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
          selectedSlotIndex = null;
          selectedPetId = null;
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
            menuStack.push('PET_DETAIL');
          } else if (i.customId === 'pet_egg_hatch') {
            const eggId = i.values[0];
            const hasVideo = eggId === 'trung_linh_thu_tien' || eggId === 'trung_linh_thu_than' || eggId === 'trung_than_thu';

            if (hasVideo) {
              const { AttachmentBuilder } = await import('discord.js');
              const videoPath = eggId === 'trung_linh_thu_tien'
                ? './public/video/pet/dap_trung.mp4'
                : './public/video/pet/dap_trung_than.mp4';
              const eggNameText = eggId === 'trung_linh_thu_tien' ? 'Trứng Linh Thú (Tiên)' : 'Trứng Linh Thú (Thần)';

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
                await Pet.update({ isActive: false }, { where: { userId: tuSi.idNguoiDung } });
                pet.isActive = true;
                await pet.save();
                actionMessage = BoTaoEmbed.thanhCong('⚔️ Sủng vật xuất chiến', `**${pet.name}** đã xuất chiến hộ mệnh đạo hữu.`);
              }
            } else if (i.customId === 'pet_action_renounce') {
              await pet.destroy();
              actionMessage = BoTaoEmbed.thanhCong('💥 Thả sủng vật', `Đạo hữu đã phóng sinh sủng vật thành công.`);
              menuStack.pop();
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
                const cost = config.getPetEvolutionCost(pet);
                if (tuSi.linhThach < cost) {
                  actionMessage = BoTaoEmbed.thatBai('🧬 Tiến Hóa Thất Bại', `Không đủ linh thạch (Cần ${cost.toLocaleString()}).`);
                } else {
                  tuSi.linhThach -= cost;
                  await tuSi.save();

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
                    '🧬 Sủng Vật Tiến Hóa',
                    `**${pet.name}** đã hoàn tất đột phá tiến hóa! Tư chất tăng mạnh.${upgradeMsg}` +
                    (lvlUpAfterEvo ? `\n🎉 Lượng exp tích lũy giúp sủng vật thăng lên **Cấp ${pet.level}!**` : '')
                  );
                }
              }
            } else if (i.customId === 'pet_action_reset') {
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

        // Reload data cho lần render kế tiếp
        myInventory = await loadPlayerInventory(tuSi.idNguoiDung);
        myPets      = await Pet.findAll({ where: { userId: tuSi.idNguoiDung } });

        // Helper set action result embed
        function actionResultEmbed(result) {
          actionMessage = result.ok
            ? BoTaoEmbed.thanhCong('✨ Thành Công', result.msg)
            : BoTaoEmbed.loi(result.msg);
        }

        await i.editReply({
          embeds:     await buildEmbeds(),
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
        } catch (_) {}
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
      ok:  true,
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
      'dan_tu_vi_luc':   8,
      'dan_tu_vi_lam':   16,
      'dan_tu_vi_tim':   32,
      'dan_tu_vi_vang':  64,
      'dan_tu_vi_do':    128
    };

    const countDaoNien = pillBonusMap[pillId] || 4;
    const gainedExp = Math.floor(tocDoGoc * countDaoNien);

    tuSi.linhLuc += gainedExp;
    await tuSi.save();

    abode.pillCount += 1;
    await abode.save();

    const pillItem = config.ITEMS.find(e => e.id === pillId);

    return {
      ok:  true,
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

    if (tuSi.linhThach < 200) {
      return { ok: false, msg: 'Linh thạch bất túc! Cần 200 Linh thạch để đốt lò đúc khí.' };
    }

    // Tiêu hao
    await invOld.destroy();
    tuSi.linhThach -= 200;
    await tuSi.save();

    // 2. Chế tạo trang bị mới
    const record = await Inventory.addVatPham(tuSi.idNguoiDung, newId, 1);
    const newItem = config.ITEMS.find(e => e.id === newId);

    return {
      ok:  true,
      msg: `Luyện Khí Thành Công! Bạn đã luyện đúc thành công **${newItem?.ten ?? newId}** (Mã: #${record.id})!`
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

    let rollThanThuRate = 0; // Tỷ lệ nở ra Thần Thú

    if (eggId === 'trung_linh_thu_than' || eggId === 'trung_than_thu') {
      rollThanThuRate = 50;
    } else if (eggId === 'trung_linh_thu_tien') {
      rollThanThuRate = 3;
    } else if (eggId === 'trung_linh_thu_linh') {
      rollThanThuRate = 1;
    } else if (eggId === 'trung_linh_thu_pham' || eggId === 'trung_linh_thu') {
      rollThanThuRate = 0;
    }

    const roll = Math.random() * 100;
    const isThan = roll < rollThanThuRate;

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
      userId:  tuSi.idNguoiDung,
      name:    formattedName,
      type:    selectedTemplate.id,
      rarity:  rarity,
      level:   1,
      exp:     0,
      tuChat:  100 + Math.floor(Math.random() * 30),
      isActive: false
    });

    const displaySpecies = config.PET_TEMPLATES[pet.type]?.name || pet.type;
    return {
      ok:  true,
      msg: `Ấp Trứng Thành Công! Quả trứng vỡ ra, một chú **${displaySpecies}** nhỏ bé đáng yêu chui ra chào đạo hữu!`
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
        ok:  true,
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
        herbId   = 'linh_chi_luc';
        herbName = 'U Minh Linh Chi (Phàm) 🍄';
      } else if (age < 16) {
        herbId   = 'linh_chi_lam';
        herbName = 'U Minh Linh Chi (Ưu) 🍄';
      } else if (age < 32) {
        herbId   = 'linh_chi_tim';
        herbName = 'U Minh Linh Chi (Siêu) 🍄';
      } else if (age < 64) {
        herbId   = 'linh_chi_vang';
        herbName = 'U Minh Linh Chi (Tuyệt) 🍄';
      } else {
        herbId   = 'linh_chi_do';
        herbName = 'U Minh Linh Chi (Tiên) 🍄';
      }
    } else if (isNhanSam) {
      if (age < 8) {
        herbId   = 'nhan_sam_luc';
        herbName = 'Tuyết Sơn Nhân Sâm (Phàm) 🥕';
      } else if (age < 16) {
        herbId   = 'nhan_sam_lam';
        herbName = 'Tuyết Sơn Nhân Sâm (Ưu) 🥕';
      } else if (age < 32) {
        herbId   = 'nhan_sam_tim';
        herbName = 'Tuyết Sơn Nhân Sâm (Siêu) 🥕';
      } else if (age < 64) {
        herbId   = 'nhan_sam_vang';
        herbName = 'Tuyết Sơn Nhân Sâm (Tuyệt) 🥕';
      } else {
        herbId   = 'nhan_sam_do';
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
