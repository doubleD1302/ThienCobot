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
import { PlayerShop } from '../models/PlayerShop.js';
import { LichSuMua } from '../models/LichSuMua.js';
import { Item } from '../models/Item.js';
import { Inventory } from '../models/Inventory.js';
import * as config from '../config.js';

const SELL_ITEMS_PER_PAGE = 23;

// ── Hằng số hiển thị ────────────────────────────────────────────────────────
const DO_HIEM_EMOJI = {
  'Thường':    '⚪',
  'Hiếm':     '🟢',
  'Cực hiếm': '🔵',
  'Huyền thoại': '🟣',
  'Thần cấp':  '🟡'
};

const LOAI_EMOJI = {
  'Vũ khí':           '🗡️',
  'Giáp':             '🥋',
  'Ngọc Bội':        '📿',
  'Cổ Bảo Chủ Động': '🏺',
  'Pháp Bảo':        '📿',
  'Đan dược':        '💊',
  'Linh thảo':       '🌱',
  'Nguyên liệu':     '⚙️'
};

const SHOP_TABS = [
  { value: 'tat_ca',    label: 'Cửa Hàng Cá Nhân', emoji: '🏪' },
  { value: 'pet',      label: 'Tiên Thú (Công Đức)', emoji: '🐾' }
];

function getRefreshCost(refreshCount) {
  return Math.floor(1000 * Math.pow(1.5, refreshCount));
}

function getRealmStartLevel(level) {
  if (level >= 31) return 31;
  if (level >= 28) return 28;
  if (level >= 25) return 25;
  if (level >= 22) return 22;
  if (level >= 19) return 19;
  if (level >= 16) return 16;
  if (level >= 13) return 13;
  if (level >= 10) return 10;
  return 1;
}

async function generatePlayerShop(tuSi) {
  const items = [];
  
  for (let i = 0; i < 10; i++) {
    const cat = Math.floor(Math.random() * 3); // 0 = Material, 1 = Pill, 2 = Equipment
    let chosenItem = null;
    
    if (cat === 0) {
      // Forge Materials (Thường, Hiếm, Cực hiếm)
      const roll = Math.random() * 100;
      let doHiem = 'Thường';
      if (roll < 2) {
        doHiem = 'Cực hiếm';
      } else if (roll < 32) {
        doHiem = 'Hiếm';
      }
      
      let eligible = config.ITEMS.filter(x => x.loai === 'Nguyên liệu' && x.doHiem === doHiem);
      if (eligible.length === 0) {
        eligible = config.ITEMS.filter(x => x.loai === 'Nguyên liệu');
      }
      if (eligible.length > 0) {
        chosenItem = eligible[Math.floor(Math.random() * eligible.length)];
      }
    } else if (cat === 1) {
      // Tu Vi Pills (Thường, Hiếm, Cực hiếm, Huyền thoại)
      const roll = Math.random() * 100;
      let doHiem = 'Thường';
      if (roll < 2) {
        doHiem = 'Huyền thoại';
      } else if (roll < 12) {
        doHiem = 'Cực hiếm';
      } else if (roll < 40) {
        doHiem = 'Hiếm';
      }
      
      let eligible = config.ITEMS.filter(x => x.id.startsWith('dan_tu_vi_') && x.doHiem === doHiem);
      if (eligible.length === 0) {
        eligible = config.ITEMS.filter(x => x.id.startsWith('dan_tu_vi_'));
      }
      if (eligible.length > 0) {
        chosenItem = eligible[Math.floor(Math.random() * eligible.length)];
      }
    } else {
      // Equipment (Thường, Hiếm, Cực hiếm)
      const roll = Math.random() * 100;
      let doHiem = 'Thường';
      if (roll < 1) {
        doHiem = 'Cực hiếm';
      } else if (roll < 31) {
        doHiem = 'Hiếm';
      }
      
      const realmStart = getRealmStartLevel(tuSi.capDo);
      let eligible = config.ITEMS.filter(x => 
        ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Pháp Bảo'].includes(x.loai) && 
        x.doHiem === doHiem &&
        x.yeuCauCanhGioi === realmStart &&
        config.checkTrangBiPhuHopHuongTu(x, tuSi.huongTu)
      );
      if (eligible.length === 0) {
        eligible = config.ITEMS.filter(x => 
          ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Pháp Bảo'].includes(x.loai) && 
          x.yeuCauCanhGioi === realmStart &&
          config.checkTrangBiPhuHopHuongTu(x, tuSi.huongTu)
        );
      }
      if (eligible.length === 0) {
        eligible = config.ITEMS.filter(x => 
          ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Pháp Bảo'].includes(x.loai) && 
          x.yeuCauCanhGioi <= tuSi.capDo &&
          x.doHiem === doHiem &&
          config.checkTrangBiPhuHopHuongTu(x, tuSi.huongTu)
        );
      }
      if (eligible.length === 0) {
        eligible = config.ITEMS.filter(x => 
          ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Pháp Bảo'].includes(x.loai) && 
          x.yeuCauCanhGioi <= tuSi.capDo &&
          config.checkTrangBiPhuHopHuongTu(x, tuSi.huongTu)
        );
      }
      
      if (eligible.length > 0) {
        chosenItem = eligible[Math.floor(Math.random() * eligible.length)];
      }
    }
    
    if (chosenItem) {
      items.push({
        slotIndex: i + 1,
        itemId: chosenItem.id,
        giaBan: chosenItem.giaCoSo || 1000,
        bought: false
      });
    }
  }
  return items;
}

async function getOrInitPlayerShop(tuSi) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  let pShop = await PlayerShop.findByPk(tuSi.idNguoiDung);
  if (!pShop) {
    const items = await generatePlayerShop(tuSi);
    pShop = await PlayerShop.create({
      userId: tuSi.idNguoiDung,
      itemsJson: JSON.stringify(items),
      refreshCount: 0,
      lastRefreshed: todayStr
    });
  } else if (pShop.lastRefreshed !== todayStr) {
    pShop.refreshCount = 0;
    pShop.lastRefreshed = todayStr;
    const items = await generatePlayerShop(tuSi);
    pShop.itemsJson = JSON.stringify(items);
    await pShop.save();
  }
  return pShop;
}

function buildPersonalShopEmbed(tuSi, shopItems, pShop) {
  const color = layMauCanhGioi(tuSi.canhGioi);
  
  const lines = shopItems.map((e) => {
    const itemDetail = config.ITEMS.find(x => x.id === e.itemId);
    if (!itemDetail) return `**${e.slotIndex}.** Vật phẩm không tồn tại`;
    
    const doHiemEm = DO_HIEM_EMOJI[itemDetail.doHiem] || '⚪';
    const loaiEm   = itemDetail.emoji || LOAI_EMOJI[itemDetail.loai] || '📦';
    const statusText = e.bought 
      ? '~~[Đã Bán Hết]~~ 🔴'
      : `🪙 \`${e.giaBan.toLocaleString()}\` Linh Thạch`;
      
    let statsText = '';
    try {
      const stats = JSON.parse(itemDetail.chiSoJson || '{}');
      const parts = [];
      if (stats.vat_cong)  parts.push(`+${stats.vat_cong} Vật Công`);
      if (stats.phap_cong) parts.push(`+${stats.phap_cong} Pháp Công`);
      if (stats.vat_phong) parts.push(`+${stats.vat_phong} Vật Phòng`);
      if (stats.phap_phong)parts.push(`+${stats.phap_phong} Pháp Phòng`);
      if (stats.hp)        parts.push(`+${stats.hp} HP`);
      if (stats.mp)        parts.push(`+${stats.mp} MP`);
      if (parts.length > 0) statsText = `\n   *(${parts.join(', ')})*`;
    } catch (_) {}

    return `**${e.slotIndex}.** ${doHiemEm}${loaiEm} **${itemDetail.ten}** — ${statusText}${statsText}`;
  });

  const nextCost = pShop.refreshCount < 10 ? getRefreshCost(pShop.refreshCount) : 0;
  const refreshText = pShop.refreshCount < 10 
    ? `Làm mới tiếp theo: \`${nextCost.toLocaleString()}\` 🪙`
    : `Đã hết lượt làm mới hôm nay`;

  return new EmbedBuilder()
    .setTitle(`🏪 Linh Bảo Các — Shop Cá Nhân`)
    .setColor(color)
    .setDescription(
      `> 🪙 **Linh thạch của ngươi**: \`${tuSi.linhThach.toLocaleString()}\` 🪙\n` +
      `> 🔄 **Số lượt làm mới hôm nay**: \`${pShop.refreshCount}/10\` (${refreshText})\n` +
      `${'─'.repeat(38)}\n${lines.join('\n\n')}`
    )
    .setTimestamp()
    .setFooter({ text: 'Chọn ô vật phẩm bên dưới để xem chi tiết và mua.' });
}

function buildPersonalItemDetailEmbed(tuSi, shopSlot) {
  const itemDetail = config.ITEMS.find(x => x.id === shopSlot.itemId);
  if (!itemDetail) return null;
  
  const color     = layMauCanhGioi(tuSi.canhGioi);
  const doHiemEm  = DO_HIEM_EMOJI[itemDetail.doHiem] || '⚪';
  const loaiEm    = itemDetail.emoji || LOAI_EMOJI[itemDetail.loai] || '📦';

  let statsText = '_Không có chỉ số_';
  try {
    const stats = JSON.parse(itemDetail.chiSoJson || '{}');
    const parts = [];
    if (stats.vat_cong)  parts.push(`• **Vật Công**: \`+${stats.vat_cong}\``);
    if (stats.phap_cong) parts.push(`• **Pháp Công**: \`+${stats.phap_cong}\``);
    if (stats.vat_phong) parts.push(`• **Vật Phòng**: \`+${stats.vat_phong}\``);
    if (stats.phap_phong)parts.push(`• **Pháp Phòng**: \`+${stats.phap_phong}\``);
    if (stats.hp)        parts.push(`• **HP tối đa**: \`+${stats.hp}\``);
    if (stats.mp)        parts.push(`• **MP tối đa**: \`+${stats.mp}\``);
    if (parts.length > 0) statsText = parts.join('\n');
  } catch (_) {}

  const canAfford = tuSi.linhThach >= shopSlot.giaBan;
  const isBought  = shopSlot.bought;
  const reqText = itemDetail.yeuCauCanhGioi > 1
    ? config.layThongTinCanhGioi(itemDetail.yeuCauCanhGioi).realmName + ` (Cấp ${itemDetail.yeuCauCanhGioi})`
    : 'Không yêu cầu';
  const canLevel = tuSi.capDo >= itemDetail.yeuCauCanhGioi;

  return new EmbedBuilder()
    .setTitle(`${doHiemEm}${loaiEm} Chi Tiết Ô ${shopSlot.slotIndex}: ${itemDetail.ten}`)
    .setColor(canAfford && canLevel && !isBought ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      { name: '📦 Phân Loại', value: `${itemDetail.loai} · ${itemDetail.doHiem}`, inline: true },
      { name: '🪙 Giá Bán',  value: `\`${shopSlot.giaBan.toLocaleString()}\` Linh Thạch`, inline: true },
      { name: '⚠️ Yêu Cầu Cấp', value: reqText, inline: true },
      { name: '💰 Ví Của Ngươi', value: `\`${tuSi.linhThach.toLocaleString()}\` Linh Thạch`, inline: true },
      { name: '✅ Trạng Thái', value: isBought ? '🔴 Đã bán hết' : (canAfford && canLevel ? '🟢 Đủ điều kiện mua' : '🔴 Không đủ điều kiện'), inline: true },
      { name: '📊 Chỉ Số', value: statsText, inline: false },
      { name: '📖 Mô Tả', value: itemDetail.moTa || '_Không có mô tả._', inline: false }
    )
    .setFooter({ text: `Mã vật phẩm: ${itemDetail.id}` });
}

function buildSellEmbed(tuSi, entries, pageIdx, totalPages) {
  const color = layMauCanhGioi(tuSi.canhGioi);

  const lines = entries.map((e, i) => {
    const idx      = pageIdx * SELL_ITEMS_PER_PAGE + i + 1;
    const doHiemEm = DO_HIEM_EMOJI[e.item.doHiem] || '⚪';
    const loaiEm   = e.item.emoji || LOAI_EMOJI[e.item.loai] || '📦';
    const donGia   = Math.floor(e.item.giaCoSo * 0.3);
    const tongGia  = donGia * e.soLuong;

    return `**${idx}.** ${doHiemEm}${loaiEm} **${e.item.ten}** x\`${e.soLuong}\`\n` +
           `   *Giá cơ sở:* \`${e.item.giaCoSo}\` 🪙 · *Bán thu về:* \`${donGia}\` 🪙/cái (Tổng: \`${tongGia}\` 🪙)`;
  });

  const desc = entries.length > 0
    ? lines.join('\n\n')
    : '_Túi đồ của ngươi không có vật phẩm nào chưa trang bị có thể bán lấy Linh Thạch._';

  return new EmbedBuilder()
    .setTitle(`🛍️ Tiệm Cầm Đồ Thiên Cơ — Bán Vật Phẩm`)
    .setColor(color)
    .setDescription(
      `> 🪙 **Linh thạch hiện có**: \`${tuSi.linhThach.toLocaleString()}\`  |  *(Shop mua lại với giá bằng 30% giá cơ sở)*\n` +
      (totalPages > 1 ? `> 📄 Trang ${pageIdx + 1}/${totalPages}\n` : '') +
      `${'─'.repeat(38)}\n${desc}`
    )
    .setTimestamp()
    .setFooter({ text: 'Chọn vật phẩm từ túi đồ bên dưới → Chọn số lượng muốn bán.' });
}

function buildSellItemDetailEmbed(tuSi, invEntry) {
  const { item, soLuong, invId } = invEntry;
  const color     = layMauCanhGioi(tuSi.canhGioi);
  const doHiemEm  = DO_HIEM_EMOJI[item.doHiem] || '⚪';
  const loaiEm    = item.emoji || LOAI_EMOJI[item.loai] || '📦';
  const donGia    = Math.floor(item.giaCoSo * 0.3);

  let statsText = '_Không có chỉ số_';
  try {
    const stats = JSON.parse(item.chiSoJson || '{}');
    const parts = [];
    if (stats.vat_cong)  parts.push(`• **Vật Công**: \`+${stats.vat_cong}\``);
    if (stats.phap_cong) parts.push(`• **Pháp Công**: \`+${stats.phap_cong}\``);
    if (stats.vat_phong) parts.push(`• **Vật Phòng**: \`+${stats.vat_phong}\``);
    if (stats.phap_phong)parts.push(`• **Pháp Phòng**: \`+${stats.phap_phong}\``);
    if (stats.hp)        parts.push(`• **HP tối đa**: \`+${stats.hp}\``);
    if (stats.mp)        parts.push(`• **MP tối đa**: \`+${stats.mp}\``);
    if (parts.length > 0) statsText = parts.join('\n');
  } catch (_) {}

  return new EmbedBuilder()
    .setTitle(`${doHiemEm}${loaiEm} Chi Tiết Bán: ${item.ten}`)
    .setColor(0xe67e22)
    .addFields(
      { name: '📦 Phân Loại', value: `${item.loai} · ${item.doHiem}`, inline: true },
      { name: '🪙 Giá Cơ Sở', value: `\`${item.giaCoSo.toLocaleString()}\` Linh Thạch`, inline: true },
      { name: '💰 Giá Bán (30%)', value: `\`${donGia.toLocaleString()}\` Linh Thạch/cái`, inline: true },
      { name: '🎒 Số Lượng Có', value: `x\`${soLuong}\` trong túi`, inline: true },
      { name: '📊 Chỉ Số', value: statsText, inline: false },
      { name: '📖 Mô Tả', value: item.moTa || '_Không có mô tả._', inline: false }
    )
    .setFooter({ text: `Mã túi đồ: #${invId} · Mã vật phẩm: ${item.id}` });
}

class BoDieuKhienShop extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhShop = {
    data: new SlashCommandBuilder()
      .setName('shop')
      .setDescription('Mở Linh Bảo Các — Mua bán vật phẩm tu tiên và xem lịch sử giao dịch'),

    execute: async (interaction) => {
      await interaction.deferReply();

      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      // Trạng thái giao diện tương tác
      let currentMode        = 'BUY'; // 'BUY', 'SELL', 'HISTORY'
      
      // State cho Mode MUA
      let shopTab            = 'tat_ca';
      let selectedShopId     = null; // slotIndex hoặc buy_pet_egg_linh

      // State cho Mode BÁN
      let sellPageIdx        = 0;
      let selectedInventoryId = null;

      const loadSellableInventory = async () => {
        const invList = await Inventory.findAll({
          where: { idNguoiDung: tuSi.idNguoiDung, trangBi: false }
        });

        const sellable = [];
        for (const inv of invList) {
          const itemDetail = await Item.findByPk(inv.itemId);
          if (itemDetail && itemDetail.loai !== 'Skin' && itemDetail.giaCoSo > 0) {
            if (inv.khoa) continue;
            if (itemDetail.loai === 'Chí bảo') continue;
            if (itemDetail.food === 0) continue; // Vật phẩm bị khóa giao dịch

            sellable.push({
              invId:         inv.id,
              item:          itemDetail,
              soLuong:       inv.soLuong,
              trangBi:       inv.trangBi,
              nangCapSao:    inv.nangCapSao,
              dongChiSoJson: inv.dongChiSoJson
            });
          }
        }
        return sellable;
      };

      const buildModeRow = (disabled = false, pShop = null) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('mode_buy')
            .setLabel('🛒 Cửa Hàng (Mua)')
            .setStyle(currentMode === 'BUY' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(disabled || currentMode === 'BUY'),
          new ButtonBuilder()
            .setCustomId('mode_sell')
            .setLabel('💰 Tiệm Cầm Đồ (Bán)')
            .setStyle(currentMode === 'SELL' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(disabled || currentMode === 'SELL'),
          new ButtonBuilder()
            .setCustomId('mode_history')
            .setLabel('📜 Lịch Sử Giao Dịch')
            .setStyle(currentMode === 'HISTORY' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(disabled || currentMode === 'HISTORY'),
          new ButtonBuilder()
            .setCustomId('mode_close')
            .setLabel('❌ Đóng')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
        );
      };

      const buildBuyComponents = (pShop, disabled = false) => {
        const rows = [buildModeRow(disabled, pShop)];

        // Row 2: Chọn danh mục
        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('buy_tab_select')
              .setPlaceholder('📋 Chọn danh mục hàng hoá...')
              .setDisabled(disabled)
              .addOptions(SHOP_TABS.map(t => ({
                label:   t.label,
                value:   t.value,
                emoji:   t.emoji,
                default: t.value === shopTab
              })))
          )
        );

        if (shopTab === 'pet') {
          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('buy_item_select')
                .setPlaceholder('🔍 Chọn trứng linh thú...')
                .setDisabled(disabled)
                .addOptions([
                  {
                    label: 'Trứng Linh Thú (Linh)',
                    value: 'buy_pet_egg_linh',
                    emoji: '🥚',
                    description: 'Đổi bằng 2 Điểm Công Đức',
                    default: selectedShopId === 'buy_pet_egg_linh'
                  }
                ])
            )
          );
        } else {
          // Shop cá nhân - hiển thị 10 vật phẩm
          const shopItems = JSON.parse(pShop.itemsJson);
          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('buy_item_select')
                .setPlaceholder('🔍 Chọn ô vật phẩm trong shop cá nhân...')
                .setDisabled(disabled)
                .addOptions(shopItems.map(e => {
                  const itemDetail = config.ITEMS.find(x => x.id === e.itemId);
                  const label = itemDetail ? itemDetail.ten : e.itemId;
                  const statusText = e.bought ? '[Đã Mua]' : `${e.giaBan.toLocaleString()} Linh Thạch`;
                  return {
                    label: `[Ô ${e.slotIndex}] ${label}`.slice(0, 100),
                    value: String(e.slotIndex),
                    emoji: itemDetail ? (DO_HIEM_EMOJI[itemDetail.doHiem] || '⚪') : '⚪',
                    description: statusText,
                    default: String(e.slotIndex) === String(selectedShopId)
                  };
                }))
            )
          );

          // Row 4: Nút làm mới shop cá nhân
          const refreshCost = getRefreshCost(pShop.refreshCount);
          const btnRefresh = new ButtonBuilder()
            .setCustomId('buy_refresh_shop')
            .setLabel(pShop.refreshCount >= 10 ? '🔄 Hết lượt làm mới' : `🔄 Làm mới (${refreshCost.toLocaleString()} 🪙)`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled || pShop.refreshCount >= 10);
          
          rows.push(new ActionRowBuilder().addComponents(btnRefresh));
        }

        // Row 5: Nút Mua (chỉ hiển thị khi chọn item)
        if (selectedShopId && !disabled) {
          const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('buy_action_execute')
              .setLabel('🛒 Xác Nhận Mua')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('buy_deselect')
              .setLabel('↩️ Bỏ chọn')
              .setStyle(ButtonStyle.Secondary)
          );
          rows.push(actionRow);
        }

        return rows;
      };

      const buildSellComponents = (sellableList, disabled = false) => {
        const totalPages = Math.max(1, Math.ceil(sellableList.length / SELL_ITEMS_PER_PAGE));
        const start = sellPageIdx * SELL_ITEMS_PER_PAGE;
        const pageEntries = sellableList.slice(start, start + SELL_ITEMS_PER_PAGE);

        const rows = [buildModeRow(disabled)];

        if (pageEntries.length === 0) {
          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('sell_item_select')
                .setPlaceholder('🎒 Túi đồ không có gì bán được')
                .setDisabled(true)
                .addOptions([{ label: '(Trống)', value: '__empty__' }])
            )
          );
        } else {
          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('sell_item_select')
                .setPlaceholder('🔍 Chọn vật phẩm muốn bán...')
                .setDisabled(disabled)
                .addOptions(pageEntries.map(e => {
                  const donGia = Math.floor(e.item.giaCoSo * 0.3);
                  return {
                    label:       `${e.item.ten} x${e.soLuong}`.slice(0, 100),
                    value:       String(e.invId),
                    emoji:       DO_HIEM_EMOJI[e.item.doHiem] || '⚪',
                    description: `Bán: ${donGia} Linh Thạch/cái · #${e.invId}`.slice(0, 100),
                    default:     String(e.invId) === String(selectedInventoryId)
                  };
                }))
            )
          );
        }

        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('sell_prev')
              .setLabel('◀ Trang trước')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(disabled || sellPageIdx === 0),
            new ButtonBuilder()
              .setCustomId('sell_next')
              .setLabel('Trang sau ▶')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(disabled || sellPageIdx >= totalPages - 1)
          )
        );

        if (selectedInventoryId && !disabled) {
          const selectedInv = sellableList.find(e => String(e.invId) === String(selectedInventoryId));
          const maxQty = selectedInv ? selectedInv.soLuong : 1;

          const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('sell_action_1')
              .setLabel('💰 Bán x1')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('sell_deselect')
              .setLabel('↩️ Bỏ chọn')
              .setStyle(ButtonStyle.Secondary)
          );

          if (maxQty >= 5) {
            actionRow.addComponents(
              new ButtonBuilder()
                .setCustomId('sell_action_5')
                .setLabel('💰 Bán x5')
                .setStyle(ButtonStyle.Danger)
            );
          }
          actionRow.addComponents(
            new ButtonBuilder()
              .setCustomId('sell_action_all')
              .setLabel(`💰 Bán Hết (x${maxQty})`)
              .setStyle(ButtonStyle.Danger)
          );

          rows.push(actionRow);
        }

        return rows;
      };

      const buildAllEmbeds = async (sellableList, pShop = null) => {
        if (currentMode === 'BUY') {
          if (shopTab === 'pet') {
            const lines = [
              `**1.** 🟢🥚 **Trứng Linh Thú (Linh)** — \`2\` Điểm Công Đức\n   *(Trứng linh thú phẩm chất Linh. Ấp nở tại Động Phủ để nhận được linh thú trung thành. Có 1% tỷ lệ nở ra Thần Thú.)*`
            ];
            const embeds = [
              new EmbedBuilder()
                .setTitle(`Linh Bảo Các — Tiên Thú`)
                .setColor(layMauCanhGioi(tuSi.canhGioi))
                .setDescription(
                  `> 🌟 **Điểm Công Đức hiện có**: \`${tuSi.congDuc || 0}\`  |  📋 **Danh mục**: Tiên Thú\n` +
                  `${'─'.repeat(38)}\n${lines.join('\n\n')}`
                )
                .setTimestamp()
                .setFooter({ text: 'Chọn vật phẩm bên dưới → Bấm nút Mua phía dưới cùng để giao dịch.' })
            ];

            if (selectedShopId === 'buy_pet_egg_linh') {
              const canAfford = (tuSi.congDuc || 0) >= 2;
              embeds.push(
                new EmbedBuilder()
                  .setTitle(`🟢🥚 Chi Tiết: Trứng Linh Thú (Linh)`)
                  .setColor(canAfford ? 0x2ecc71 : 0xe74c3c)
                  .addFields(
                    { name: '📦 Phân Loại', value: 'Linh thảo · Hiếm', inline: true },
                    { name: '🌟 Giá Bán', value: '`2` Điểm Công Đức', inline: true },
                    { name: '📦 Tồn Kho', value: '∞ Vô hạn', inline: true },
                    { name: '🌟 Điểm Công Đức Của Ngươi', value: `\`${tuSi.congDuc || 0}\` Công Đức`, inline: true },
                    { name: '✅ Trạng Thái', value: canAfford ? '🟢 Đủ điều kiện mua' : '🔴 Không đủ điều kiện', inline: true },
                    { name: '📖 Mô Tả', value: 'Trứng linh thú phẩm chất Linh. Ấp nở tại Động Phủ để nhận được linh thú trung thành. Có 1% tỷ lệ nở ra Thần Thú.', inline: false }
                  )
                  .setFooter({ text: 'Mã vật phẩm: trung_linh_thu_linh' })
              );
            }
            return embeds;
          } else {
            // Shop cá nhân
            const shopItems = JSON.parse(pShop.itemsJson);
            const embeds = [buildPersonalShopEmbed(tuSi, shopItems, pShop)];
            
            if (selectedShopId && selectedShopId !== 'buy_pet_egg_linh') {
              const idx = parseInt(selectedShopId, 10);
              const slot = shopItems.find(x => x.slotIndex === idx);
              if (slot) {
                const det = buildPersonalItemDetailEmbed(tuSi, slot);
                if (det) embeds.push(det);
              }
            }
            return embeds;
          }
        }

        if (currentMode === 'SELL') {
          const total = Math.max(1, Math.ceil(sellableList.length / SELL_ITEMS_PER_PAGE));
          const start = sellPageIdx * SELL_ITEMS_PER_PAGE;
          const pageEntries = sellableList.slice(start, start + SELL_ITEMS_PER_PAGE);

          const embeds = [buildSellEmbed(tuSi, pageEntries, sellPageIdx, total)];

          if (selectedInventoryId) {
            const entry = sellableList.find(e => String(e.invId) === String(selectedInventoryId));
            if (entry) {
              embeds.push(buildSellItemDetailEmbed(tuSi, entry));
            }
          }
          return embeds;
        }

        if (currentMode === 'HISTORY') {
          const records = await LichSuMua.findAll({
            where:  { idNguoiDung: tuSi.idNguoiDung },
            order:  [['muaLuc', 'DESC']],
            limit:  15
          });

          if (records.length === 0) {
            return [BoTaoEmbed.thongTin(
              '📜 Lịch Sử Giao Dịch',
              `Đạo hữu **${tuSi.ten}** chưa thực hiện bất kỳ giao dịch mua hay bán nào tại Linh Bảo Các.`
            )];
          }

          const lines = await Promise.all(records.map(async (r, i) => {
            const d = await Item.findByPk(r.itemId);
            const name = d ? d.ten : r.itemId;
            const time = new Date(r.muaLuc).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
            
            if (r.soLuong < 0) {
              return `**${i + 1}.** 🟢 **BÁN**: ${name} x\`${-r.soLuong}\` ➔ \`+${(-r.giaDaTra).toLocaleString()}\` 🪙 · \`${time}\``;
            } else {
              return `**${i + 1}.** 🔴 **MUA**: ${name} x\`${r.soLuong}\` ➔ \`-${r.giaDaTra.toLocaleString()}\` 🪙 · \`${time}\``;
            }
          }));

          const embed = new EmbedBuilder()
            .setTitle(`📜 Lịch Sử Mua Bán: ${tuSi.ten}`)
            .setColor(layMauCanhGioi(tuSi.canhGioi))
            .setDescription(
              `> 💰 **Tài sản hiện tại**: \`${tuSi.linhThach.toLocaleString()}\` 🪙\n` +
              `${'─'.repeat(38)}\n${lines.join('\n')}`
            )
            .setTimestamp()
            .setFooter({ text: 'Lưu giữ 15 giao dịch gần đây nhất.' });

          return [embed];
        }

        return [];
      };

      // Initial get player shop
      let pShop = await getOrInitPlayerShop(tuSi);
      let sellableList = await loadSellableInventory();

      const msg = await interaction.editReply({
        embeds:     await buildAllEmbeds(sellableList, pShop),
        components: buildBuyComponents(pShop)
      });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time:   240_000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();

        let actionResultEmbed = null;

        // Reload player & shop objects dynamically
        await tuSi.reload();
        pShop = await getOrInitPlayerShop(tuSi);

        switch (i.customId) {
          // ── MODE SWITCHING ─────────────────────────────────────────────────
          case 'mode_buy': {
            currentMode = 'BUY';
            selectedShopId = null;
            break;
          }
          case 'mode_sell': {
            currentMode = 'SELL';
            selectedInventoryId = null;
            sellPageIdx = 0;
            sellableList = await loadSellableInventory();
            break;
          }
          case 'mode_history': {
            currentMode = 'HISTORY';
            break;
          }
          case 'mode_close': {
            collector.stop('closed');
            return;
          }

          // ── BUY MODE INTERACTIONS ──────────────────────────────────────────
          case 'buy_tab_select': {
            shopTab = i.values[0];
            selectedShopId = null;
            break;
          }
          case 'buy_item_select': {
            selectedShopId = i.values[0];
            break;
          }
          case 'buy_deselect': {
            selectedShopId = null;
            break;
          }
          case 'buy_refresh_shop': {
            if (pShop.refreshCount >= 10) {
              actionResultEmbed = BoTaoEmbed.loi('Hôm nay ngươi đã làm mới tối đa 10 lần rồi!');
              break;
            }
            const cost = getRefreshCost(pShop.refreshCount);
            if (tuSi.linhThach < cost) {
              actionResultEmbed = BoTaoEmbed.loi(`Ngươi không có đủ ${cost.toLocaleString()} Linh Thạch để làm mới shop!`);
              break;
            }

            // Deduct Linh Thach and increment count
            tuSi.linhThach -= cost;
            await tuSi.save();

            pShop.refreshCount += 1;
            const items = await generatePlayerShop(tuSi);
            pShop.itemsJson = JSON.stringify(items);
            await pShop.save();

            selectedShopId = null;
            actionResultEmbed = BoTaoEmbed.thanhCong('🔄 Làm Mới Thành Công', `Đã làm mới shop cá nhân. Tiêu hao \`-${cost.toLocaleString()}\` Linh Thạch.`);
            break;
          }
          case 'buy_action_1':
          case 'buy_action_5':
          case 'buy_action_10':
          case 'buy_action_execute': {
            if (!selectedShopId) break;
            const qty = i.customId === 'buy_action_5' ? 5 : (i.customId === 'buy_action_10' ? 10 : 1);

            if (selectedShopId === 'buy_pet_egg_linh') {
              const res = await this._thucHienMuaPetEggLinh(tuSi, qty);
              actionResultEmbed = res.ok
                ? BoTaoEmbed.thanhCong('🛒 Mua Hàng Thành Công', res.msg)
                : BoTaoEmbed.loi(res.msg);
              selectedShopId = null;
            } else {
              const idx = parseInt(selectedShopId, 10);
              const shopItems = JSON.parse(pShop.itemsJson);
              const slot = shopItems.find(x => x.slotIndex === idx);
              
              if (!slot) {
                actionResultEmbed = BoTaoEmbed.loi('Không tìm thấy ô vật phẩm này.');
                break;
              }
              if (slot.bought) {
                actionResultEmbed = BoTaoEmbed.loi('Vật phẩm tại ô này đã bán hết.');
                break;
              }

              const itemDetail = config.ITEMS.find(x => x.id === slot.itemId);
              if (!itemDetail) {
                actionResultEmbed = BoTaoEmbed.loi('Vật phẩm không tồn tại trong điển tịch.');
                break;
              }
              if (tuSi.capDo < itemDetail.yeuCauCanhGioi) {
                actionResultEmbed = BoTaoEmbed.loi(`Cấp độ của ngươi (cấp ${tuSi.capDo}) không đủ để sử dụng vật phẩm này (yêu cầu cấp ${itemDetail.yeuCauCanhGioi}).`);
                break;
              }
              if (tuSi.linhThach < slot.giaBan) {
                actionResultEmbed = BoTaoEmbed.loi('Ngươi không đủ Linh thạch để mua vật phẩm này.');
                break;
              }

              // Deduct Linh Thach
              tuSi.linhThach -= slot.giaBan;
              await tuSi.save();

              // Add item to inventory
              await Inventory.addVatPham(tuSi.idNguoiDung, slot.itemId, 1);

              // Log to transaction history
              await LichSuMua.create({
                idNguoiDung: tuSi.idNguoiDung,
                itemId:      slot.itemId,
                soLuong:     1,
                giaDaTra:    slot.giaBan,
                muaLuc:      new Date()
              });

              // Mark slot as bought
              slot.bought = true;
              pShop.itemsJson = JSON.stringify(shopItems);
              await pShop.save();

              actionResultEmbed = BoTaoEmbed.thanhCong('🛒 Mua Hàng Thành Công', `Ngươi đã mua thành công **${itemDetail.ten}** với giá \`${slot.giaBan.toLocaleString()}\` Linh Thạch.`);
              selectedShopId = null;
            }
            break;
          }

          // ── SELL MODE INTERACTIONS ─────────────────────────────────────────
          case 'sell_item_select': {
            selectedInventoryId = i.values[0];
            break;
          }
          case 'sell_prev': {
            sellPageIdx = Math.max(0, sellPageIdx - 1);
            selectedInventoryId = null;
            break;
          }
          case 'sell_next': {
            const total = Math.max(1, Math.ceil(sellableList.length / SELL_ITEMS_PER_PAGE));
            sellPageIdx = Math.min(total - 1, sellPageIdx + 1);
            selectedInventoryId = null;
            break;
          }
          case 'sell_deselect': {
            selectedInventoryId = null;
            break;
          }
          case 'sell_action_1':
          case 'sell_action_5':
          case 'sell_action_all': {
            if (!selectedInventoryId) break;
            const invRecord = await Inventory.findByPk(selectedInventoryId);
            if (!invRecord || invRecord.idNguoiDung !== tuSi.idNguoiDung) {
              actionResultEmbed = BoTaoEmbed.loi('Vật phẩm không hợp lệ.');
              selectedInventoryId = null;
              break;
            }

            const itemDetail = await Item.findByPk(invRecord.itemId);
            if (!itemDetail) {
              actionResultEmbed = BoTaoEmbed.loi('Vật phẩm không tồn tại.');
              selectedInventoryId = null;
              break;
            }

            const maxQty = invRecord.soLuong;
            let qty = 1;
            if (i.customId === 'sell_action_5') qty = Math.min(5, maxQty);
            else if (i.customId === 'sell_action_all') qty = maxQty;

            const res = await this._thucHienBanByInvId(tuSi, invRecord.id, qty);
            actionResultEmbed = res.ok
              ? BoTaoEmbed.thanhCong('💰 Bán Hàng Thành Công', res.msg)
              : BoTaoEmbed.loi(res.msg);

            selectedInventoryId = null;
            sellableList = await loadSellableInventory();
            break;
          }
        }

        const nextPayload = {
          embeds:     await buildAllEmbeds(sellableList, pShop),
          components: currentMode === 'BUY' ? buildBuyComponents(pShop) : buildSellComponents(sellableList)
        };
        if (actionResultEmbed) {
          nextPayload.embeds.push(actionResultEmbed);
        }
        await i.editReply(nextPayload);
      });

      collector.on('end', async (_, reason) => {
        try {
          if (reason === 'closed') {
            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle('🏪 Linh Bảo Các — Đã Đóng')
                  .setDescription('Cửa tiệm đã đóng kết giới. Chúc đạo hữu tu hành tiến bộ!')
                  .setColor(0x7f8c8d)
                  .setTimestamp()
              ],
              components: []
            });
          } else {
            await interaction.editReply({
              components: currentMode === 'BUY' ? buildBuyComponents(pShop, true) : buildSellComponents(sellableList, true)
            });
          }
        } catch (_) { }
      });
    }
  };

  async _thucHienMuaPetEggLinh(tuSi, qty) {
    if ((tuSi.congDuc || 0) < 2 * qty) {
      return { ok: false, msg: `Đạo hữu không đủ Điểm Công Đức để quy đổi x${qty} Trứng Linh Thú (Linh) (yêu cầu \`${2 * qty}\` Điểm, hiện có \`${tuSi.congDuc || 0}\`).` };
    }

    tuSi.congDuc -= 2 * qty;
    await tuSi.save();

    await Inventory.addVatPham(tuSi.idNguoiDung, 'trung_linh_thu_linh', qty);

    await LichSuMua.create({
      idNguoiDung: tuSi.idNguoiDung,
      itemId:      'trung_linh_thu_linh',
      soLuong:     qty,
      giaDaTra:    0,
      muaLuc:      new Date()
    });

    return { ok: true, msg: `Đạo hữu đã quy đổi thành công **Trứng Linh Thú (Linh)** x\`${qty}\`!` };
  }

  async _thucHienBanByInvId(tuSi, invId, soLuong = 1) {
    const invRecord = await Inventory.findOne({
      where: {
        id: invId,
        idNguoiDung: tuSi.idNguoiDung,
        trangBi: false
      }
    });

    if (!invRecord) {
      return { ok: false, msg: `Không tìm thấy vật phẩm có mã định danh #${invId} trong túi đồ.` };
    }

    const itemDetail = await Item.findByPk(invRecord.itemId);
    if (!itemDetail || itemDetail.loai === 'Skin') {
      return { ok: false, msg: `Không thể bán trang phục thời trang / skin tại Linh Bảo Các.` };
    }

    if (invRecord.khoa) {
      return { ok: false, msg: `Vật phẩm **${itemDetail.ten}** đã bị khóa, không thể bán!` };
    }

    if (itemDetail.loai === 'Chí bảo') {
      return { ok: false, msg: `Vật phẩm **${itemDetail.ten}** là Chí bảo thượng cổ, không thể bán!` };
    }

    if (itemDetail.food === 0) {
      return { ok: false, msg: `Vật phẩm **${itemDetail.ten}** không thể mua bán hay giao dịch!` };
    }

    if (!itemDetail.giaCoSo || itemDetail.giaCoSo <= 0) {
      return { ok: false, msg: `Vật phẩm **${itemDetail.ten}** không có giá trị cơ sở, không bán được!` };
    }

    const donGia = Math.floor(itemDetail.giaCoSo * 0.3);
    const tongGia = donGia * soLuong;

    if (invRecord.soLuong < soLuong) {
      return {
        ok: false,
        msg: `Số lượng **${itemDetail.ten}** trong túi không đủ!`
      };
    }

    // Deduct quantity
    invRecord.soLuong -= soLuong;
    if (invRecord.soLuong <= 0) {
      await invRecord.destroy();
    } else {
      await invRecord.save();
    }

    // Add Linh Thach
    tuSi.linhThach += tongGia;
    await tuSi.save();

    // Log history (negative quantity / value for sell records)
    await LichSuMua.create({
      idNguoiDung: tuSi.idNguoiDung,
      itemId:      itemDetail.id,
      soLuong:     -soLuong,
      giaDaTra:    -tongGia,
      muaLuc:      new Date()
    });

    return {
      ok: true,
      msg: `Đạo hữu đã bán thành công **${itemDetail.ten}** x${soLuong} thu về \`+${tongGia.toLocaleString()}\` Linh Thạch.`
    };
  }
}

export const boDieuKhienShop = new BoDieuKhienShop();
export const danhSachLenhShop = [boDieuKhienShop.lenhShop];
export { getRefreshCost, getRealmStartLevel, generatePlayerShop, getOrInitPlayerShop };
