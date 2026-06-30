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

// ── Hằng số ────────────────────────────────────────────────────────────────
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
  { value: 'tat_ca',    label: 'Tất Cả',        emoji: '🏪', loai: null },
  { value: 'vu_khi',   label: 'Vũ Khí & Giáp', emoji: '⚔️', loai: ['Vũ khí', 'Giáp', 'Ngọc Bội'] },
  { value: 'phap_bao', label: 'Cổ Bảo & Pháp Bảo', emoji: '🔮', loai: ['Cổ Bảo Chủ Động', 'Pháp Bảo'] },
  { value: 'tieu_hao', label: 'Đan Dược',       emoji: '💊', loai: ['Đan dược', 'Linh thảo'] }
];

const ITEMS_PER_PAGE = 8; // số item trên mỗi trang

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

// ── Helper: tạo embed trang shop ───────────────────────────────────────────
function buildShopEmbed(tuSi, entries, pageIdx, totalPages, tabLabel) {
  const color = layMauCanhGioi(tuSi.canhGioi);

  const lines = entries.map((e, i) => {
    const { shop, item } = e;
    const idx      = pageIdx * ITEMS_PER_PAGE + i + 1;
    const doHiemEm = DO_HIEM_EMOJI[item.doHiem] || '⚪';
    const loaiEm   = LOAI_EMOJI[item.loai] || '📦';
    const giaText  = `🪙 \`${shop.giaBan.toLocaleString()}\` Linh Thạch`;
    const tonText  = shop.soLuongTon === -1 ? '' : ` · Còn \`${shop.soLuongTon}\``;
    const reqText  = shop.yeuCauCapDo > 1
      ? ` · ⚠️ Yêu cầu Cấp **${shop.yeuCauCapDo}**`
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
      `> 🪙 **Linh thạch của ngươi**: \`${tuSi.linhThach.toLocaleString()}\`  |  📋 **Danh mục**: ${tabLabel}` +
      (totalPages > 1 ? `  |  📄 Trang ${pageIdx + 1}/${totalPages}` : '') +
      `\n${'─'.repeat(38)}\n${desc}`
    )
    .setTimestamp()
    .setFooter({ text: 'Dùng menu bên dưới để chọn hàng → bấm 🛒 Mua · Thiên Đạo Tu Tiên RPG' });
}

// ── Helper: embed chi tiết 1 item đang được chọn ───────────────────────────
function buildItemDetailEmbed(tuSi, shopEntry) {
  const { shop, item } = shopEntry;
  const color     = layMauCanhGioi(tuSi.canhGioi);
  const doHiemEm  = DO_HIEM_EMOJI[item.doHiem] || '⚪';
  const loaiEm    = LOAI_EMOJI[item.loai] || '📦';

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
    .setTitle(`${doHiemEm}${loaiEm} ${item.ten}`)
    .setColor(canAfford && canLevel && inStock ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      { name: '📦 Phân Loại', value: `${item.loai} · ${item.doHiem}`, inline: true },
      { name: '🪙 Giá Bán',  value: `\`${shop.giaBan.toLocaleString()}\` Linh Thạch`, inline: true },
      { name: '📦 Tồn Kho',  value: shop.soLuongTon === -1 ? '∞ Vô hạn' : `\`${shop.soLuongTon}\``, inline: true },
      { name: '⚠️ Yêu Cầu', value: reqText, inline: true },
      { name: '💰 Ví Của Ngươi', value: `\`${tuSi.linhThach.toLocaleString()}\` Linh Thạch`, inline: true },
      { name: '✅ Đủ Điều Kiện', value: canAfford && canLevel && inStock ? '🟢 Có thể mua' : '🔴 Không đủ điều kiện', inline: true },
      { name: '📊 Chỉ Số', value: statsText, inline: false },
      { name: '📖 Mô Tả', value: item.moTa || '_Không có mô tả._', inline: false }
    )
    .setFooter({ text: `ID vật phẩm: ${item.id}` });
}

// ──────────────────────────────────────────────────────────────────────────
//  CONTROLLER
// ──────────────────────────────────────────────────────────────────────────
class BoDieuKhienShop extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhShop = {
    data: new SlashCommandBuilder()
      .setName('shop')
      .setDescription('Mở Linh Bảo Các — Cửa hàng vật phẩm tu tiên')
      .addSubcommand(sub =>
        sub.setName('xem')
          .setDescription('Duyệt hàng hoá cửa hàng')
      )
      .addSubcommand(sub =>
        sub.setName('mua')
          .setDescription('Mua trực tiếp một vật phẩm qua lệnh')
          .addStringOption(opt =>
            opt.setName('item_id')
              .setDescription('Mã vật phẩm muốn mua (VD: dan_hp_1)')
              .setRequired(true)
          )
          .addIntegerOption(opt =>
            opt.setName('so_luong')
              .setDescription('Số lượng muốn mua (mặc định: 1)')
              .setMinValue(1)
              .setMaxValue(99)
          )
      )
      .addSubcommand(sub =>
        sub.setName('lichsu')
          .setDescription('Xem lịch sử mua hàng gần đây')
      )
      .addSubcommand(sub =>
        sub.setName('ban')
          .setDescription('Bán vật phẩm từ túi đồ (giá bằng 30% giá cơ sở)')
          .addStringOption(opt =>
            opt.setName('item_id')
              .setDescription('Mã vật phẩm muốn bán (VD: kiem_go)')
              .setRequired(true)
          )
          .addIntegerOption(opt =>
            opt.setName('so_luong')
              .setDescription('Số lượng muốn bán (mặc định: 1, trang bị chỉ bán đồ chưa mặc)')
              .setMinValue(1)
          )
      ),

    execute: async (interaction) => {
      await interaction.deferReply();

      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      const subcommand = interaction.options.getSubcommand();

      // ═══════════════════════════════════════════════════════════════
      //  XEM — giao diện shop tương tác
      // ═══════════════════════════════════════════════════════════════
      if (subcommand === 'xem') {
        const catalog = await loadShopCatalog();

        // Trạng thái UI
        let curTab        = 'tat_ca';
        let pageIdx       = 0;
        let selectedShopId = null;  // id (PK) của shop_items đang chọn

        // ── Helpers build UI ─────────────────────────────────────────

        const getPageEntries = (tab, pi) => {
          const filtered = filterByTab(catalog, tab);
          const start = pi * ITEMS_PER_PAGE;
          return filtered.slice(start, start + ITEMS_PER_PAGE);
        };

        const getTotalPages = (tab) => {
          const filtered = filterByTab(catalog, tab);
          return Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
        };

        /** Row 1: Select tab danh mục */
        const buildTabRow = (disabled = false) =>
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('shop_tab')
              .setPlaceholder('🏪 Chọn danh mục hàng hoá...')
              .setDisabled(disabled)
              .addOptions(SHOP_TABS.map(t => ({
                label:   t.label,
                value:   t.value,
                emoji:   t.emoji,
                default: t.value === curTab
              })))
          );

        /** Row 2: Select chọn item trên trang hiện tại */
        const buildItemSelectRow = (entries, disabled = false) => {
          if (entries.length === 0) {
            return new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('shop_item_select')
                .setPlaceholder('⚠️ Không có hàng hoá trong danh mục này')
                .setDisabled(true)
                .addOptions([{ label: '(Trống)', value: '__empty__' }])
            );
          }
          return new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('shop_item_select')
              .setPlaceholder('🔍 Chọn vật phẩm muốn xem chi tiết...')
              .setDisabled(disabled)
              .addOptions(entries.map((e, i) => {
                const doHiemEm = DO_HIEM_EMOJI[e.item.doHiem] || '⚪';
                const giaStr   = e.shop.giaBan.toLocaleString();
                return {
                  label:       e.item.ten.slice(0, 100),
                  value:       String(e.shop.id),
                  emoji:       doHiemEm,
                  description: `${e.item.loai} · ${giaStr} Linh Thạch`.slice(0, 100),
                  default:     String(e.shop.id) === String(selectedShopId)
                };
              }))
          );
        };

        /** Row 3: Nút phân trang + Đóng */
        const buildNavRow = (disabled = false) => {
          const total = getTotalPages(curTab);
          return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('shop_prev')
              .setLabel('◀ Trang trước')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(disabled || pageIdx === 0),
            new ButtonBuilder()
              .setCustomId('shop_next')
              .setLabel('Trang sau ▶')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(disabled || pageIdx >= total - 1),
            new ButtonBuilder()
              .setCustomId('shop_close')
              .setLabel('❌ Đóng')
              .setStyle(ButtonStyle.Danger)
              .setDisabled(disabled)
          );
        };

        /** Row 4 (chỉ hiện khi đã chọn item): Nút mua */
        const buildBuyRow = (shopId, disabled = false) => {
          if (!shopId) return null;
          return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('shop_buy_1')
              .setLabel('🛒 Mua x1')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(disabled),
            new ButtonBuilder()
              .setCustomId('shop_buy_5')
              .setLabel('🛒 Mua x5')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(disabled),
            new ButtonBuilder()
              .setCustomId('shop_buy_10')
              .setLabel('🛒 Mua x10')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(disabled),
            new ButtonBuilder()
              .setCustomId('shop_deselect')
              .setLabel('↩️ Bỏ Chọn')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(disabled)
          );
        };

        const buildAllComponents = (disabled = false) => {
          const entries = getPageEntries(curTab, pageIdx);
          const rows = [];
          rows.push(buildTabRow(disabled));
          rows.push(buildItemSelectRow(entries, disabled));
          rows.push(buildNavRow(disabled));
          const buyRow = buildBuyRow(selectedShopId, disabled);
          if (buyRow) rows.push(buyRow);
          return rows;
        };

        const buildEmbeds = () => {
          const entries = getPageEntries(curTab, pageIdx);
          const total   = getTotalPages(curTab);
          const tabLabel = SHOP_TABS.find(t => t.value === curTab)?.label ?? 'Tất Cả';
          const mainEmbed = buildShopEmbed(tuSi, entries, pageIdx, total, tabLabel);
          if (selectedShopId) {
            const shopEntry = catalog.find(e => String(e.shop.id) === String(selectedShopId));
            if (shopEntry) {
              return [mainEmbed, buildItemDetailEmbed(tuSi, shopEntry)];
            }
          }
          return [mainEmbed];
        };

        // Gửi reply ban đầu
        const msg = await interaction.editReply({
          embeds:     buildEmbeds(),
          components: buildAllComponents()
        });

        const collector = msg.createMessageComponentCollector({
          filter: i => i.user.id === interaction.user.id,
          time:   180_000
        });

        collector.on('collect', async i => {
          await i.deferUpdate();

          switch (i.customId) {

            case 'shop_tab': {
              curTab         = i.values[0];
              pageIdx        = 0;
              selectedShopId = null;
              break;
            }
            case 'shop_prev': {
              pageIdx = Math.max(0, pageIdx - 1);
              selectedShopId = null;
              break;
            }
            case 'shop_next': {
              pageIdx = Math.min(getTotalPages(curTab) - 1, pageIdx + 1);
              selectedShopId = null;
              break;
            }
            case 'shop_item_select': {
              selectedShopId = i.values[0];
              break;
            }
            case 'shop_deselect': {
              selectedShopId = null;
              break;
            }
            case 'shop_close': {
              collector.stop('closed');
              return;
            }

            // ── Mua hàng ──────────────────────────────────────────────
            case 'shop_buy_1':
            case 'shop_buy_5':
            case 'shop_buy_10': {
              if (!selectedShopId) break;
              const qty = i.customId === 'shop_buy_1' ? 1
                        : i.customId === 'shop_buy_5' ? 5 : 10;
              const shopEntry = catalog.find(e => String(e.shop.id) === String(selectedShopId));
              if (!shopEntry) break;

              const result = await this._thucHienMua(tuSi, shopEntry, qty);

              // Cập nhật lại tồn kho trong catalog (nếu có giới hạn)
              if (result.ok && shopEntry.shop.soLuongTon !== -1) {
                shopEntry.shop.soLuongTon -= qty;
              }
              selectedShopId = null;

              const resEmbed = result.ok
                ? BoTaoEmbed.thanhCong('🛒 Mua Hàng Thành Công', result.msg)
                : BoTaoEmbed.loi(result.msg);

              await i.editReply({
                embeds:     [...buildEmbeds(), resEmbed],
                components: buildAllComponents()
              });
              return;
            }

            default: break;
          }

          await i.editReply({
            embeds:     buildEmbeds(),
            components: buildAllComponents()
          });
        });

        collector.on('end', async (_, reason) => {
          try {
            if (reason === 'closed') {
              await interaction.editReply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle('🏪 Linh Bảo Các — Đã Đóng Cửa')
                    .setDescription('Ngươi đã rời khỏi cửa hàng. Hẹn gặp lại!')
                    .setColor(0x7f8c8d)
                    .setTimestamp()
                    .setFooter({ text: 'Dùng /shop xem để quay lại.' })
                ],
                components: []
              });
            } else {
              await interaction.editReply({ components: buildAllComponents(true) });
            }
          } catch (_) { /* message đã bị xoá */ }
        });

        return;
      }

      // ═══════════════════════════════════════════════════════════════
      //  MUA — slash command trực tiếp
      // ═══════════════════════════════════════════════════════════════
      if (subcommand === 'mua') {
        const itemId  = interaction.options.getString('item_id');
        const soLuong = interaction.options.getInteger('so_luong') ?? 1;

        const shopEntry_row = await ShopItem.findOne({
          where: { itemId, hienThi: true }
        });
        if (!shopEntry_row) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Không tìm thấy vật phẩm \`${itemId}\` trong cửa hàng.`)]
          });
        }
        const itemDetail = await Item.findByPk(itemId);
        const shopEntry  = { shop: shopEntry_row, item: itemDetail };

        const result = await this._thucHienMua(tuSi, shopEntry, soLuong);
        return await interaction.editReply({
          embeds: [result.ok
            ? BoTaoEmbed.thanhCong('🛒 Mua Hàng Thành Công', result.msg)
            : BoTaoEmbed.loi(result.msg)]
        });
      }

      // ═══════════════════════════════════════════════════════════════
      //  LỊCH SỬ — 10 giao dịch gần nhất
      // ═══════════════════════════════════════════════════════════════
      if (subcommand === 'lichsu') {
        const { Op } = await import('sequelize');
        const records = await LichSuMua.findAll({
          where:  { idNguoiDung: tuSi.idNguoiDung },
          order:  [['muaLuc', 'DESC']],
          limit:  15
        });

        if (records.length === 0) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.thongTin(
              '📜 Lịch Sử Mua Hàng',
              `${tuSi.ten} chưa mua bất kỳ vật phẩm nào từ cửa hàng.`
            )]
          });
        }

        const lines = await Promise.all(records.map(async (r, i) => {
          const d = await Item.findByPk(r.itemId);
          const name = d ? d.ten : r.itemId;
          const time = new Date(r.muaLuc).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
          return `**${i + 1}.** ${name} x${r.soLuong} — 🪙 \`${r.giaDaTra.toLocaleString()}\` — \`${time}\``;
        }));

        const embed = new EmbedBuilder()
          .setTitle(`📜 Lịch Sử Mua Hàng: ${tuSi.ten}`)
          .setColor(layMauCanhGioi(tuSi.canhGioi))
          .setDescription(lines.join('\n'))
          .setTimestamp()
          .setFooter({ text: '15 giao dịch gần nhất · Thiên Đạo Tu Tiên RPG' });

        return await interaction.editReply({ embeds: [embed] });
      }

      // ═══════════════════════════════════════════════════════════════
      //  BAN — slash command bán đồ
      // ═══════════════════════════════════════════════════════════════
      if (subcommand === 'ban') {
        const itemId  = interaction.options.getString('item_id');
        const soLuong = interaction.options.getInteger('so_luong') ?? 1;

        const result = await this._thucHienBan(tuSi, itemId, soLuong);
        return await interaction.editReply({
          embeds: [result.ok
            ? BoTaoEmbed.thanhCong('🛍️ Bán Vật Phẩm Thành Công', result.msg)
            : BoTaoEmbed.loi(result.msg)]
        });
      }
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
      msg: `Đạo hữu **${tuSi.ten}** đã mua **${item.ten}** x${soLuong} với giá \`${tongGia.toLocaleString()}\` 🪙.\n` +
           `• Linh thạch còn lại: \`${tuSi.linhThach.toLocaleString()}\` 🪙\n` +
           `• Vật phẩm đã được thêm vào túi đồ!`
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPER: thực hiện giao dịch bán hàng
  // ─────────────────────────────────────────────────────────────────────────
  async _thucHienBan(tuSi, itemId, soLuong = 1) {
    const itemDetail = await Item.findByPk(itemId);
    if (!itemDetail) {
      return { ok: false, msg: `Không tìm thấy vật phẩm có mã ID \`${itemId}\` trong tiên giới.` };
    }

    if (!itemDetail.giaCoSo || itemDetail.giaCoSo <= 0) {
      return { ok: false, msg: `Vật phẩm **${itemDetail.ten}** không có giá trị cơ sở, không thể bán!` };
    }

    const donGia = Math.floor(itemDetail.giaCoSo * 0.3);
    const tongGia = donGia * soLuong;

    const isEquipable = ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'].includes(itemDetail.loai);

    if (isEquipable) {
      // Đối với trang bị, tìm các bản ghi chưa mặc (trangBi = false)
      const records = await Inventory.findAll({
        where: {
          idNguoiDung: tuSi.idNguoiDung,
          itemId: itemId,
          trangBi: false
        },
        limit: soLuong
      });

      if (records.length < soLuong) {
        return {
          ok: false,
          msg: `Số lượng trang bị **${itemDetail.ten}** chưa mặc trong túi của ngươi không đủ! (Có: \`${records.length}\` / Cần bán: \`${soLuong}\`).`
        };
      }

      // Xóa các bản ghi trang bị này
      for (const rec of records) {
        await rec.destroy();
      }
    } else {
      // Đối với vật phẩm cộng dồn (đan dược, linh thảo...)
      const inv = await Inventory.findOne({
        where: {
          idNguoiDung: tuSi.idNguoiDung,
          itemId: itemId,
          trangBi: false
        }
      });

      if (!inv || inv.soLuong < soLuong) {
        const hienCo = inv ? inv.soLuong : 0;
        return {
          ok: false,
          msg: `Số lượng vật phẩm **${itemDetail.ten}** trong túi không đủ! (Có: \`${hienCo}\` / Cần bán: \`${soLuong}\`).`
        };
      }

      inv.soLuong -= soLuong;
      if (inv.soLuong <= 0) {
        await inv.destroy();
      } else {
        await inv.save();
      }
    }

    // Cộng linh thạch cho tu sĩ
    tuSi.linhThach += tongGia;
    await tuSi.save();

    return {
      ok: true,
      msg: `Đạo hữu **${tuSi.ten}** đã bán thành công **${itemDetail.ten}** x${soLuong} thu về \`${tongGia.toLocaleString()}\` 🪙 Linh Thạch (Đơn giá 30%: \`${donGia}\` 🪙).\n` +
           `• Linh thạch hiện tại: \`${tuSi.linhThach.toLocaleString()}\` 🪙`
    };
  }
}

const controller = new BoDieuKhienShop();
export const danhSachLenhShop = [controller.lenhShop];
export { controller as boDieuKhienShop };
