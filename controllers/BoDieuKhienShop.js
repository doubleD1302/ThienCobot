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
import { ShopItem } from '../models/ShopItem.js';
import { LichSuMua } from '../models/LichSuMua.js';
import { Item } from '../models/Item.js';
import { Inventory } from '../models/Inventory.js';
import * as config from '../config.js';

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
  'Linh thảo':       '🌱'
};

// Nhóm hiển thị trong shop (mỗi nhóm = 1 "tab" trong select menu)
const SHOP_TABS = [
  { value: 'tat_ca',    label: 'Tất Cả Hàng',   emoji: '🏪', loai: null },
  { value: 'vu_khi',   label: 'Vũ Khí & Giáp', emoji: '⚔️', loai: ['Vũ khí', 'Giáp', 'Ngọc Bội'] },
  { value: 'phap_bao', label: 'Cổ Bảo & Pháp Bảo', emoji: '🔮', loai: ['Cổ Bảo Chủ Động', 'Pháp Bảo'] },
  { value: 'tieu_hao', label: 'Đan Dược',       emoji: '💊', loai: ['Đan dược', 'Linh thảo'] }
];

const ITEMS_PER_PAGE = 8; // số item trên mỗi trang trong shop
const SELL_ITEMS_PER_PAGE = 8; // số item trên mỗi trang trong kho bán đồ

// ── Helper: load tất cả hàng hoá kèm chi tiết item ─────────────────────────
async function loadShopCatalog() {
  const shopRows = await ShopItem.findAll({
    where: { hienThi: true },
    order: [['thuTu', 'ASC'], ['id', 'ASC']]
  });

  const catalog = [];
  for (const row of shopRows) {
    const itemDetail = await Item.findByPk(row.itemId);
    if (itemDetail) {
      catalog.push({ shop: row, item: itemDetail });
    }
  }
  return catalog;
}

// ── Helper: lọc catalog theo tab ───────────────────────────────────────────
function filterByTab(catalog, tabValue) {
  const tab = SHOP_TABS.find(t => t.value === tabValue);
  if (!tab || !tab.loai) return catalog;
  return catalog.filter(e => tab.loai.includes(e.item.loai));
}

// ── Helper: tạo embed trang shop (mua đồ) ──────────────────────────────────
function buildShopEmbed(tuSi, entries, pageIdx, totalPages, tabLabel) {
  const color = layMauCanhGioi(tuSi.canhGioi);

  const lines = entries.map((e, i) => {
    const { shop, item } = e;
    const idx      = pageIdx * ITEMS_PER_PAGE + i + 1;
    const doHiemEm = DO_HIEM_EMOJI[item.doHiem] || '⚪';
    const loaiEm   = item.emoji || LOAI_EMOJI[item.loai] || '📦';
    const giaText  = `🪙 \`${shop.giaBan.toLocaleString()}\` Linh Thạch`;
    const tonText  = shop.soLuongTon === -1 ? '' : ` · Còn \`${shop.soLuongTon}\``;
    const reqText  = shop.yeuCauCapDo > 1
      ? ` · ⚠️ Cấp **${shop.yeuCauCapDo}**`
      : '';
    let statsText = '';
    try {
      const stats = JSON.parse(item.chiSoJson || '{}');
      const parts = [];
      if (stats.vat_cong)  parts.push(`+${stats.vat_cong} Vật Công`);
      if (stats.phap_cong) parts.push(`+${stats.phap_cong} Pháp Công`);
      if (stats.vat_phong) parts.push(`+${stats.vat_phong} Vật Phòng`);
      if (stats.phap_phong)parts.push(`+${stats.phap_phong} Pháp Phòng`);
      if (stats.hp)        parts.push(`+${stats.hp} HP`);
      if (stats.mp)        parts.push(`+${stats.mp} MP`);
      if (stats.hp_hoi)    parts.push(`Hồi ${stats.hp_hoi} HP`);
      if (stats.mp_hoi)    parts.push(`Hồi ${stats.mp_hoi} MP`);
      if (parts.length > 0) statsText = `\n   *(${parts.join(', ')})*`;
    } catch (_) {}

    return `**${idx}.** ${doHiemEm}${loaiEm} **${item.ten}** — ${giaText}${tonText}${reqText}${statsText}`;
  });

  const desc = entries.length > 0
    ? lines.join('\n\n')
    : '_Không có hàng hoá trong danh mục này._';

  return new EmbedBuilder()
    .setTitle(`🏪 Linh Bảo Các — Cửa Hàng Tu Tiên`)
    .setColor(color)
    .setDescription(
      `> 🪙 **Linh thạch hiện có**: \`${tuSi.linhThach.toLocaleString()}\`  |  📋 **Danh mục**: ${tabLabel}` +
      (totalPages > 1 ? `  |  📄 Trang ${pageIdx + 1}/${totalPages}` : '') +
      `\n${'─'.repeat(38)}\n${desc}`
    )
    .setTimestamp()
    .setFooter({ text: 'Chọn vật phẩm bên dưới → Bấm nút Mua phía dưới cùng để giao dịch.' });
}

// ── Helper: embed chi tiết 1 item đang được chọn để MUA ───────────────────
function buildItemDetailEmbed(tuSi, shopEntry) {
  const { shop, item } = shopEntry;
  const color     = layMauCanhGioi(tuSi.canhGioi);
  const doHiemEm  = DO_HIEM_EMOJI[item.doHiem] || '⚪';
  const loaiEm    = item.emoji || LOAI_EMOJI[item.loai] || '📦';

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
    if (stats.hp_hoi)    parts.push(`• **Hồi HP**: \`+${stats.hp_hoi}\``);
    if (stats.mp_hoi)    parts.push(`• **Hồi MP**: \`+${stats.mp_hoi}\``);
    if (parts.length > 0) statsText = parts.join('\n');
  } catch (_) {}

  const reqText = shop.yeuCauCapDo > 1
    ? config.layThongTinCanhGioi(shop.yeuCauCapDo).realmName + ` (Cấp ${shop.yeuCauCapDo})`
    : 'Không yêu cầu';

  const canAfford = tuSi.linhThach >= shop.giaBan;
  const canLevel  = tuSi.capDo >= shop.yeuCauCapDo;
  const inStock   = shop.soLuongTon === -1 || shop.soLuongTon > 0;

  return new EmbedBuilder()
    .setTitle(`${doHiemEm}${loaiEm} Chi Tiết: ${item.ten}`)
    .setColor(canAfford && canLevel && inStock ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      { name: '📦 Phân Loại', value: `${item.loai} · ${item.doHiem}`, inline: true },
      { name: '🪙 Giá Bán',  value: `\`${shop.giaBan.toLocaleString()}\` Linh Thạch`, inline: true },
      { name: '📦 Tồn Kho',  value: shop.soLuongTon === -1 ? '∞ Vô hạn' : `\`${shop.soLuongTon}\``, inline: true },
      { name: '⚠️ Yêu Cầu Cấp', value: reqText, inline: true },
      { name: '💰 Ví Của Ngươi', value: `\`${tuSi.linhThach.toLocaleString()}\` Linh Thạch`, inline: true },
      { name: '✅ Trạng Thái', value: canAfford && canLevel && inStock ? '🟢 Đủ điều kiện mua' : '🔴 Không đủ điều kiện', inline: true },
      { name: '📊 Chỉ Số', value: statsText, inline: false },
      { name: '📖 Mô Tả', value: item.moTa || '_Không có mô tả._', inline: false }
    )
    .setFooter({ text: `Mã vật phẩm: ${item.id}` });
}

// ── Helper: tạo embed trang bán đồ (sell) ──────────────────────────────────
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

// ── Helper: embed chi tiết 1 item trong túi đang được chọn để BÁN ───────────
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

      // Catalog hàng hóa tĩnh trong shop
      const catalog = await loadShopCatalog();

      // Trạng thái giao diện tương tác
      let currentMode        = 'BUY'; // 'BUY', 'SELL', 'HISTORY'
      
      // State cho Mode MUA
      let shopTab            = 'tat_ca';
      let shopPageIdx        = 0;
      let selectedShopId     = null;

      // State cho Mode BÁN
      let sellPageIdx        = 0;
      let selectedInventoryId = null;

      // ── Helper: load danh sách đồ có thể bán từ kho của người chơi ──────────
      const loadSellableInventory = async () => {
        const invList = await Inventory.findAll({
          where: { idNguoiDung: tuSi.idNguoiDung, trangBi: false }
        });

        const sellable = [];
        for (const inv of invList) {
          const itemDetail = await Item.findByPk(inv.itemId);
          if (itemDetail && itemDetail.giaCoSo > 0) {
            if (inv.khoa) continue;
            if (itemDetail.loai === 'Chí bảo') continue;

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

      // ── BUILD COMPONENTS ROWS ──────────────────────────────────────────────

      /** Row 1: Nút chuyển đổi Mode chính (luôn hiển thị) */
      const buildModeRow = (disabled = false) => {
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

      // ──────────────────────────────────────────
      //  COMPONENTS CHO MODE MUA (BUY)
      // ──────────────────────────────────────────
      const buildBuyComponents = (disabled = false) => {
        const filtered = filterByTab(catalog, shopTab);
        const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
        const start = shopPageIdx * ITEMS_PER_PAGE;
        const pageEntries = filtered.slice(start, start + ITEMS_PER_PAGE);

        const rows = [buildModeRow(disabled)];

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

        // Row 3: Chọn item trên trang hiện tại
        if (pageEntries.length === 0) {
          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('buy_item_select')
                .setPlaceholder('⚠️ Danh mục này hiện đang trống')
                .setDisabled(true)
                .addOptions([{ label: '(Trống)', value: '__empty__' }])
            )
          );
        } else {
          rows.push(
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('buy_item_select')
                .setPlaceholder('🔍 Chọn vật phẩm xem chi tiết...')
                .setDisabled(disabled)
                .addOptions(pageEntries.map(e => ({
                  label:       e.item.ten.slice(0, 100),
                  value:       String(e.shop.id),
                  emoji:       DO_HIEM_EMOJI[e.item.doHiem] || '⚪',
                  description: `${e.item.loai} · ${e.shop.giaBan.toLocaleString()} Linh Thạch`.slice(0, 100),
                  default:     String(e.shop.id) === String(selectedShopId)
                })))
            )
          );
        }

        // Row 4: Phân trang
        rows.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('buy_prev')
              .setLabel('◀ Trang trước')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(disabled || shopPageIdx === 0),
            new ButtonBuilder()
              .setCustomId('buy_next')
              .setLabel('Trang sau ▶')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(disabled || shopPageIdx >= totalPages - 1)
          )
        );

        // Row 5: Nút Mua (chỉ hiển thị khi chọn item)
        if (selectedShopId && !disabled) {
          rows.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('buy_action_1')
                .setLabel('🛒 Mua x1')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId('buy_action_5')
                .setLabel('🛒 Mua x5')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId('buy_action_10')
                .setLabel('🛒 Mua x10')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId('buy_deselect')
                .setLabel('↩️ Bỏ chọn')
                .setStyle(ButtonStyle.Secondary)
            )
          );
        }

        return rows;
      };

      // ──────────────────────────────────────────
      //  COMPONENTS CHO MODE BÁN (SELL)
      // ──────────────────────────────────────────
      const buildSellComponents = (sellableList, disabled = false) => {
        const totalPages = Math.max(1, Math.ceil(sellableList.length / SELL_ITEMS_PER_PAGE));
        const start = sellPageIdx * SELL_ITEMS_PER_PAGE;
        const pageEntries = sellableList.slice(start, start + SELL_ITEMS_PER_PAGE);

        const rows = [buildModeRow(disabled)];

        // Row 2: Dropdown chọn vật phẩm để bán từ túi
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

        // Row 3: Phân trang túi đồ bán
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

        // Row 4: Hành động Bán (chỉ hiện khi có item được chọn)
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

      // ── BUILD EMBEDS ───────────────────────────────────────────────────────
      const buildAllEmbeds = async (sellableList) => {
        if (currentMode === 'BUY') {
          const filtered = filterByTab(catalog, shopTab);
          const total = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
          const start = shopPageIdx * ITEMS_PER_PAGE;
          const pageEntries = filtered.slice(start, start + ITEMS_PER_PAGE);
          const tabLabel = SHOP_TABS.find(t => t.value === shopTab)?.label ?? 'Tất Cả';

          const embeds = [buildShopEmbed(tuSi, pageEntries, shopPageIdx, total, tabLabel)];

          if (selectedShopId) {
            const entry = catalog.find(e => String(e.shop.id) === String(selectedShopId));
            if (entry) {
              embeds.push(buildItemDetailEmbed(tuSi, entry));
            }
          }
          return embeds;
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
          // Mode lịch sử: Lấy 15 giao dịch mua và bán gần nhất
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
              // Bán hàng (soLuong âm, giaDaTra âm)
              return `**${i + 1}.** 🟢 **BÁN**: ${name} x\`${-r.soLuong}\` ➔ \`+${(-r.giaDaTra).toLocaleString()}\` 🪙 · \`${time}\``;
            } else {
              // Mua hàng (soLuong dương, giaDaTra dương)
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

      // ── INITIAL SEND ───────────────────────────────────────────────────────
      let sellableList = await loadSellableInventory();
      const msg = await interaction.editReply({
        embeds:     await buildAllEmbeds(sellableList),
        components: buildBuyComponents()
      });

      // ── COLLECTOR ──────────────────────────────────────────────────────────
      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time:   240_000 // Tăng lên 4 phút để tương tác thoải mái
      });

      collector.on('collect', async i => {
        await i.deferUpdate();

        let actionResultEmbed = null;

        switch (i.customId) {
          // ── MODE SWITCHING ─────────────────────────────────────────────────
          case 'mode_buy': {
            currentMode = 'BUY';
            selectedShopId = null;
            shopPageIdx = 0;
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
            shopPageIdx = 0;
            selectedShopId = null;
            break;
          }
          case 'buy_item_select': {
            selectedShopId = i.values[0];
            break;
          }
          case 'buy_prev': {
            shopPageIdx = Math.max(0, shopPageIdx - 1);
            selectedShopId = null;
            break;
          }
          case 'buy_next': {
            const filtered = filterByTab(catalog, shopTab);
            const total = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
            shopPageIdx = Math.min(total - 1, shopPageIdx + 1);
            selectedShopId = null;
            break;
          }
          case 'buy_deselect': {
            selectedShopId = null;
            break;
          }
          case 'buy_action_1':
          case 'buy_action_5':
          case 'buy_action_10': {
            if (!selectedShopId) break;
            const qty = i.customId === 'buy_action_1' ? 1
                      : i.customId === 'buy_action_5' ? 5 : 10;
            
            const shopEntry = catalog.find(e => String(e.shop.id) === String(selectedShopId));
            if (shopEntry) {
              const res = await this._thucHienMua(tuSi, shopEntry, qty);
              actionResultEmbed = res.ok
                ? BoTaoEmbed.thanhCong('🛒 Mua Hàng Thành Công', res.msg)
                : BoTaoEmbed.loi(res.msg);

              if (res.ok && shopEntry.shop.soLuongTon !== -1) {
                shopEntry.shop.soLuongTon -= qty;
              }
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
            
            const selectedInv = sellableList.find(e => String(e.invId) === String(selectedInventoryId));
            if (!selectedInv) break;

            const qty = i.customId === 'sell_action_1' ? 1
                      : i.customId === 'sell_action_5' ? 5 : selectedInv.soLuong;

            const res = await this._thucHienBanByInvId(tuSi, selectedInv.invId, qty);
            actionResultEmbed = res.ok
              ? BoTaoEmbed.thanhCong('🛍️ Bán Hàng Thành Công', res.msg)
              : BoTaoEmbed.loi(res.msg);

            selectedInventoryId = null;
            // Reload sellable inventory
            sellableList = await loadSellableInventory();
            const totalSellPages = Math.max(1, Math.ceil(sellableList.length / SELL_ITEMS_PER_PAGE));
            sellPageIdx = Math.min(sellPageIdx, totalSellPages - 1);
            break;
          }

          default: break;
        }

        // Tạo lại list components dựa trên Mode hiện tại
        let currentComponents = [];
        if (currentMode === 'BUY') {
          currentComponents = buildBuyComponents();
        } else if (currentMode === 'SELL') {
          currentComponents = buildSellComponents(sellableList);
        } else if (currentMode === 'HISTORY') {
          currentComponents = [buildModeRow()];
        }

        // Tạo embeds
        const embeds = await buildAllEmbeds(sellableList);
        if (actionResultEmbed) {
          embeds.push(actionResultEmbed);
        }

        await i.editReply({
          embeds,
          components: currentComponents
        });
      });

      collector.on('end', async (_, reason) => {
        try {
          if (reason === 'closed') {
            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle('🏪 Linh Bảo Các — Đã Đóng Cửa')
                  .setDescription('Đạo hữu đã cất bước rời khỏi Linh Bảo Các. Chúc đạo hữu tu hành thuận lợi!')
                  .setColor(0x7f8c8d)
                  .setTimestamp()
                  .setFooter({ text: 'Dùng lệnh /shop để mở lại.' })
              ],
              components: []
            });
          } else {
            // Hết giờ -> disable tất cả controls
            let finalComponents = [];
            if (currentMode === 'BUY') {
              finalComponents = buildBuyComponents(true);
            } else if (currentMode === 'SELL') {
              finalComponents = buildSellComponents(sellableList, true);
            } else {
              finalComponents = [buildModeRow(true)];
            }
            await interaction.editReply({
              components: finalComponents
            });
          }
        } catch (_) {}
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPER: thực hiện giao dịch mua hàng
  // ─────────────────────────────────────────────────────────────────────────
  async _thucHienMua(tuSi, shopEntry, soLuong = 1) {
    const { shop, item } = shopEntry;

    // 1. Kiểm tra cấp độ
    if (tuSi.capDo < shop.yeuCauCapDo) {
      const cgReq = config.layThongTinCanhGioi(shop.yeuCauCapDo);
      return {
        ok:  false,
        msg: `Cảnh giới bất túc! Vật phẩm này yêu cầu tu vi tối thiểu: **${cgReq.realmName}** (Cấp ${shop.yeuCauCapDo}). Hiện tại: **${tuSi.canhGioi}**.`
      };
    }

    // 2. Kiểm tra tồn kho
    if (shop.soLuongTon !== -1 && shop.soLuongTon < soLuong) {
      return {
        ok:  false,
        msg: `Tồn kho không đủ! Chỉ còn \`${shop.soLuongTon}\` cái trong kho.`
      };
    }

    // 3. Kiểm tra linh thạch
    const tongGia = shop.giaBan * soLuong;
    if (tuSi.linhThach < tongGia) {
      return {
        ok:  false,
        msg: `Linh thạch không đủ! Cần \`${tongGia.toLocaleString()}\` 🪙 (Ngươi đang có \`${tuSi.linhThach.toLocaleString()}\` 🪙).`
      };
    }

    // 4. Trừ tiền
    tuSi.linhThach -= tongGia;
    await tuSi.save();

    // 5. Thêm vật phẩm vào balo
    await Inventory.addVatPham(tuSi.idNguoiDung, item.id, soLuong);

    // 6. Trừ tồn kho (nếu có giới hạn)
    if (shop.soLuongTon !== -1) {
      shop.soLuongTon -= soLuong;
      await shop.save();
    }

    // 7. Ghi lịch sử
    await LichSuMua.create({
      idNguoiDung: tuSi.idNguoiDung,
      itemId:      item.id,
      soLuong,
      giaDaTra:    tongGia,
      giaLoai:     shop.giaLoai
    });

    return {
      ok:  true,
      msg: `Đạo hữu **${tuSi.ten}** đã mua thành công **${item.ten}** x${soLuong} tiêu hao \`${tongGia.toLocaleString()}\` 🪙 Linh Thạch.\n` +
           `• Linh thạch còn lại: \`${tuSi.linhThach.toLocaleString()}\` 🪙`
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPER: thực hiện giao dịch bán hàng bằng ID trong Inventory
  // ─────────────────────────────────────────────────────────────────────────
  async _thucHienBanByInvId(tuSi, invId, soLuong = 1) {
    const inv = await Inventory.findOne({
      where: {
        id: invId,
        idNguoiDung: tuSi.idNguoiDung,
        trangBi: false
      }
    });

    if (!inv) {
      return { ok: false, msg: `Không tìm thấy vật phẩm có mã định danh #${invId} trong túi đồ.` };
    }

    const itemDetail = await Item.findByPk(inv.itemId);
    if (!itemDetail) {
      return { ok: false, msg: `Thông tin vật phẩm tĩnh cho mã \`${inv.itemId}\` đã bị thất lạc.` };
    }

    if (inv.khoa) {
      return { ok: false, msg: `Vật phẩm **${itemDetail.ten}** đã bị khóa, không thể bán!` };
    }

    if (itemDetail.loai === 'Chí bảo') {
      return { ok: false, msg: `Vật phẩm **${itemDetail.ten}** là Chí bảo thượng cổ, không thể bán!` };
    }

    if (!itemDetail.giaCoSo || itemDetail.giaCoSo <= 0) {
      return { ok: false, msg: `Vật phẩm **${itemDetail.ten}** không có giá trị cơ sở, không bán được!` };
    }

    const donGia = Math.floor(itemDetail.giaCoSo * 0.3);
    const tongGia = donGia * soLuong;

    const isEquipable = ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'].includes(itemDetail.loai);

    if (isEquipable) {
      // Vì mỗi trang bị là 1 bản ghi riêng biệt, nếu yêu cầu bán nhiều hơn 1, cần tìm thêm các trang bị chưa mặc tương đương.
      const records = await Inventory.findAll({
        where: {
          idNguoiDung: tuSi.idNguoiDung,
          itemId: itemDetail.id,
          trangBi: false
        },
        limit: soLuong
      });

      if (records.length < soLuong) {
        return {
          ok: false,
          msg: `Số lượng trang bị **${itemDetail.ten}** chưa mặc trong túi không đủ! (Có: \`${records.length}\` / Yêu cầu bán: \`${soLuong}\`).`
        };
      }

      for (const rec of records) {
        await rec.destroy();
      }
    } else {
      // Đối với đan dược / linh thảo cộng dồn
      if (inv.soLuong < soLuong) {
        return {
          ok: false,
          msg: `Số lượng **${itemDetail.ten}** trong túi không đủ! (Có: \`${inv.soLuong}\` / Yêu cầu bán: \`${soLuong}\`).`
        };
      }

      inv.soLuong -= soLuong;
      if (inv.soLuong <= 0) {
        await inv.destroy();
      } else {
        await inv.save();
      }
    }

    // Cộng linh thạch
    tuSi.linhThach += tongGia;
    await tuSi.save();

    // Ghi lịch sử giao dịch bán đồ (soLuong âm, giaDaTra âm để phân biệt)
    await LichSuMua.create({
      idNguoiDung: tuSi.idNguoiDung,
      itemId:      itemDetail.id,
      soLuong:     -soLuong,
      giaDaTra:    -tongGia,
      giaLoai:     'linh_thach'
    });

    return {
      ok: true,
      msg: `Đạo hữu **${tuSi.ten}** đã bán thành công **${itemDetail.ten}** x${soLuong} thu về \`+${tongGia.toLocaleString()}\` 🪙 Linh Thạch.\n` +
           `• Giá thu mua (30%): \`${donGia}\` 🪙/cái\n` +
           `• Linh thạch hiện tại: \`${tuSi.linhThach.toLocaleString()}\` 🪙`
    };
  }
}

const controller = new BoDieuKhienShop();
export const danhSachLenhShop = [controller.lenhShop];
export { controller as boDieuKhienShop };
