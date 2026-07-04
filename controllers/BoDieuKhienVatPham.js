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
import { Inventory } from '../models/Inventory.js';
import { Item } from '../models/Item.js';
import * as config from '../config.js';

// Loại item nào có thể trang bị / sử dụng
const EQUIP_TYPES  = ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'];
const USABLE_TYPES = ['Đan dược', 'Linh thảo', 'Chí bảo'];
const ALL_TYPES    = [...EQUIP_TYPES, ...USABLE_TYPES];

// ── Encode/decode toolbar value ──────────────────────────────────────────────
function encodeToolbarValue(invId, itemId, loai) {
  const loaiIdx = ALL_TYPES.indexOf(loai);
  return `${invId}|${itemId}|${loaiIdx}`;
}
function decodeToolbarValue(val) {
  if (!val) return null;
  const parts = val.split('|');
  if (parts.length < 3) return null;
  const [invIdStr, itemId, loaiIdxStr] = parts;
  const loaiIdx = parseInt(loaiIdxStr, 10);
  return { invId: parseInt(invIdStr, 10), itemId, loai: ALL_TYPES[loaiIdx] ?? null };
}

// ── Tải lại toàn bộ inventory ─────────────────────────────────────────────────
async function reloadItemsList(idNguoiDung, capDo = 1) {
  const freshInvList = await Inventory.findAll({ where: { idNguoiDung } });
  const result = [];
  for (const inv of freshInvList) {
    const d = await Item.findByPk(inv.itemId);
    if (d) result.push({
      invId:         inv.id,
      item:          d,
      soLuong:       inv.soLuong,
      trangBi:       inv.trangBi,
      nangCapSao:    inv.nangCapSao,
      dongChiSoJson: inv.dongChiSoJson,
      khoa:          inv.khoa
    });
  }

  // Sắp xếp: Ưu tiên đồ thuộc cảnh giới hiện tại, sau đó đến đồ mới nhận (invId giảm dần)
  const realmInfo = config.layThongTinCanhGioi(capDo);
  const realmObj = config.CANH_GIOI_LIST.find(r => r.name === realmInfo.realmName) || config.CANH_GIOI_LIST[0];
  const minLvl = realmObj.min_level;
  const maxLvl = realmObj.max_level;

  result.sort((a, b) => {
    const aIsCurrent = a.item.yeuCauCanhGioi >= minLvl && a.item.yeuCauCanhGioi <= maxLvl;
    const bIsCurrent = b.item.yeuCauCanhGioi >= minLvl && b.item.yeuCauCanhGioi <= maxLvl;

    if (aIsCurrent && !bIsCurrent) return -1;
    if (!aIsCurrent && bIsCurrent) return 1;

    // Ưu tiên đồ mới nhận (invId giảm dần)
    return b.invId - a.invId;
  });

  return result;
}

// ── Tải danh sách trang bị đang mặc (có kèm Item) ──────────────────────────────
async function loadEquippedFull(idNguoiDung) {
  const equippedInv = await Inventory.findAll({
    where: { idNguoiDung, trangBi: true }
  });
  const result = [];
  for (const eq of equippedInv) {
    const d = await Item.findByPk(eq.itemId);
    if (d) result.push({ inv: eq, item: d });
  }
  return result;
}

class BoDieuKhienVatPham extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhBalo = {
    data: new SlashCommandBuilder()
      .setName('balo')
      .setDescription('Mở túi trữ vật — Xem, trang bị, tháo giáp và dùng linh đan hoàn toàn bằng nút bấm'),

    execute: async (interaction) => {
      await interaction.deferReply();
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      await this.kiemTraVaNhanTuVi(tuSi);
      const color = layMauCanhGioi(tuSi.canhGioi);

      // ── Trạng thái UI ─────────────────────────────────────────────────────
      let itemsList   = await reloadItemsList(tuSi.idNguoiDung, tuSi.capDo);
      let sheets      = BoTaoEmbed.baloSheets(tuSi, itemsList);
      let sheetIdx    = 0;
      let pageIdx     = 0;
      let showToolbar = false;
      let selectedVal = null;
      let selectedEquippedInvId = null;
      let mode        = 'VIEW'; // 'VIEW' | 'EQUIPPED' | 'QUICK_SELL'

      // State cho Bán Nhanh
      let qsRarity = 'tat_ca';
      let qsRealm  = 'tat_ca';
      let qsType   = 'tat_ca';

      // ── Helper: trang bị đang mặc → embed ────────────────────────────────
      const buildEquippedEmbed = async () => {
        const equipped = await loadEquippedFull(tuSi.idNguoiDung);
        if (equipped.length === 0) {
          return new EmbedBuilder()
            .setTitle('🛡️ Trang Bị Đang Mặc')
            .setColor(color)
            .setDescription('Đạo hữu chưa mặc bất kỳ trang bị nào!\nHãy vào tab **Kho Đồ** và bấm **🛠️ Công Cụ** để trang bị.');
        }

        const groups = {};
        for (const { item } of equipped) {
          if (!groups[item.loai]) groups[item.loai] = [];
          groups[item.loai].push(item);
        }

        const loaiIcon = {
          'Vũ khí':          '⚔️',
          'Giáp':            '🛡️',
          'Ngọc Bội':        '💎',
          'Cổ Bảo Chủ Động': '🏺',
          'Pháp Bảo':        '📿'
        };

        let desc = '';
        for (const [loai, items] of Object.entries(groups)) {
          desc += `**${loaiIcon[loai] || '🔹'} ${loai}**\n`;
          for (const it of items) {
            desc += `• ${it.ten} — *${it.doHiem}*\n`;
          }
          desc += '\n';
        }

        return new EmbedBuilder()
          .setTitle(`🛡️ Trang Bị Đang Mặc — ${tuSi.ten}`)
          .setColor(color)
          .setDescription(desc.trim())
          .setFooter({ text: 'Chọn trang bị muốn tháo từ danh sách bên dưới.' })
          .setTimestamp();
      };

      // ── Helper: select menu tháo trang bị ─────────────────────────────────
      const buildUnequipSelect = async () => {
        const equipped = await loadEquippedFull(tuSi.idNguoiDung);
        if (equipped.length === 0) {
          return new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('balo_unequip_select')
              .setPlaceholder('⚠️ Không có trang bị đang mặc')
              .setDisabled(true)
              .addOptions([{ label: '(Trống)', value: '__empty__' }])
          );
        }
        return new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('balo_unequip_select')
            .setPlaceholder('🔽 Chọn trang bị muốn tháo...')
            .addOptions(equipped.slice(0, 25).map(({ inv, item }) => ({
              label:       item.ten.slice(0, 100),
              value:       String(inv.id),
              emoji:       '🔓',
              description: `${item.loai} | ${item.doHiem}`.slice(0, 100)
            })))
        );
      };

      // ── Helper: tạo các select menu và nút lọc Bán Nhanh ─────────────────
      const buildQuickSellComponents = (disabled = false) => {
        const rowRarity = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('qs_filter_rarity')
            .setPlaceholder('💎 Chọn phẩm chất cần lọc...')
            .setDisabled(disabled)
            .addOptions([
              { label: 'Tất Cả Phẩm Chất', value: 'tat_ca', default: qsRarity === 'tat_ca' },
              { label: '⚪ Thường', value: 'Thường', default: qsRarity === 'Thường' },
              { label: '🟢 Hiếm', value: 'Hiếm', default: qsRarity === 'Hiếm' },
              { label: '🔵 Cực hiếm', value: 'Cực hiếm', default: qsRarity === 'Cực hiếm' },
              { label: '🟣 Huyền thoại', value: 'Huyền thoại', default: qsRarity === 'Huyền thoại' },
              { label: '🟡 Thần cấp', value: 'Thần cấp', default: qsRarity === 'Thần cấp' }
            ])
        );

        const rowRealm = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('qs_filter_realm')
            .setPlaceholder('⛩️ Chọn cảnh giới trang bị cần lọc...')
            .setDisabled(disabled)
            .addOptions([
              { label: 'Tất Cả Cảnh Giới', value: 'tat_ca', default: qsRealm === 'tat_ca' },
              { label: 'Luyện Khí (Cấp 1-9)', value: 'luyen_khi', default: qsRealm === 'luyen_khi' },
              { label: 'Trúc Cơ (Cấp 10-18)', value: 'truc_co', default: qsRealm === 'truc_co' },
              { label: 'Hóa Thần trở lên (Cấp 19+)', value: 'hoa_than', default: qsRealm === 'hoa_than' }
            ])
        );

        const rowType = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('qs_filter_type')
            .setPlaceholder('📦 Chọn loại vật phẩm cần lọc...')
            .setDisabled(disabled)
            .addOptions([
              { label: 'Tất Cả Loại Vật Phẩm', value: 'tat_ca', default: qsType === 'tat_ca' },
              { label: '🗡️ Vũ khí', value: 'Vũ khí', default: qsType === 'Vũ khí' },
              { label: '🥋 Giáp', value: 'Giáp', default: qsType === 'Giáp' },
              { label: '🔮 Ngọc Bội', value: 'Ngọc Bội', default: qsType === 'Ngọc Bội' },
              { label: '🏺 Cổ Bảo Chủ Động', value: 'Cổ Bảo Chủ Động', default: qsType === 'Cổ Bảo Chủ Động' },
              { label: '📿 Pháp Bảo', value: 'Pháp Bảo', default: qsType === 'Pháp Bảo' },
              { label: '💊 Đan dược', value: 'Đan dược', default: qsType === 'Đan dược' },
              { label: '🌱 Linh thảo', value: 'Linh thảo', default: qsType === 'Linh thảo' }
            ])
        );

        const rowButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('qs_confirm')
            .setLabel('🔥 Xác Nhận Bán Hết')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled),
          new ButtonBuilder()
            .setCustomId('qs_cancel')
            .setLabel('↩️ Quay Lại Balo')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
        );

        return [rowRarity, rowRealm, rowType, rowButtons];
      };

      // ── Helper: tính toán và tạo embed hiển thị lọc Bán Nhanh ──────────────
      const buildQuickSellEmbed = async () => {
        const allInv = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, trangBi: false } });
        const matchingItems = [];
        let totalSellValue = 0;

        for (const inv of allInv) {
          const item = await Item.findByPk(inv.itemId);
          if (!item) continue;

          if (qsRarity !== 'tat_ca' && item.doHiem !== qsRarity) continue;

          if (qsRealm !== 'tat_ca') {
            const req = item.yeuCauCanhGioi || 1;
            if (qsRealm === 'luyen_khi' && req >= 10) continue;
            if (qsRealm === 'truc_co' && (req < 10 || req >= 19)) continue;
            if (qsRealm === 'hoa_than' && req < 19) continue;
          }

          if (qsType !== 'tat_ca' && item.loai !== qsType) continue;

          if (inv.khoa) continue;
          if (item.loai === 'Chí bảo') continue;

          if (item.giaCoSo > 0) {
            matchingItems.push({ inv, item });
            const donGia = Math.floor(item.giaCoSo * 0.3);
            totalSellValue += donGia * inv.soLuong;
          }
        }

        const rarityText = qsRarity === 'tat_ca' ? 'Tất cả' : `\`${qsRarity}\``;
        const realmText = qsRealm === 'tat_ca' ? 'Tất cả' : qsRealm === 'luyen_khi' ? 'Luyện Khí' : qsRealm === 'truc_co' ? 'Trúc Cơ' : 'Hóa Thần+';
        const typeText = qsType === 'tat_ca' ? 'Tất cả' : `\`${qsType}\``;

        const embed = new EmbedBuilder()
          .setTitle('💰 Tiệm Cầm Đồ: Bán Nhanh Vật Phẩm 💰')
          .setColor(0xe67e22)
          .setDescription(
            `Đạo hữu đang thiết lập bộ lọc để thanh lý nhanh vật phẩm không trang bị.\n\n` +
            `• **Bộ lọc hiện tại**:\n` +
            `  * Phẩm chất: **${rarityText}**\n` +
            `  * Cảnh giới: **\`${realmText}\`**\n` +
            `  * Phân loại: **${typeText}**\n\n` +
            `• **Số vật phẩm khớp bộ lọc**: \`${matchingItems.length}\` nhóm vật phẩm\n` +
            `• **Ước tính thu về**: 🪙 \`${totalSellValue.toLocaleString()}\` Linh Thạch\n\n` +
            `*Chọn các mục bên dưới để thay đổi bộ lọc, sau đó bấm nút "Xác Nhận Bán Hết" để tiến hành bán.*`
          )
          .setTimestamp()
          .setFooter({ text: 'Chú ý: Hành động này không thể hoàn tác, vật phẩm đang trang bị sẽ được bảo vệ.' });

        return { embed, matchingItems, totalSellValue };
      };

      // ── Builder: Tab-bar nút chính ─────────────────────────────────────────
      const buildTabRow = (disabled = false) =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('balo_tab_view')
            .setLabel('🎒 Kho Đồ')
            .setStyle(mode === 'VIEW' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(disabled),
          new ButtonBuilder()
            .setCustomId('balo_tab_equipped')
            .setLabel('🛡️ Đang Mặc')
            .setStyle(mode === 'EQUIPPED' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(disabled),
          new ButtonBuilder()
            .setCustomId('balo_close')
            .setLabel('❌ Đóng')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
        );

      // ── Builder: Sheet-select cho tab Kho Đồ ──────────────────────────────
      const buildSheetSelectRow = (si, disabled = false) =>
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('balo_sheet_select')
            .setPlaceholder('📋 Chọn danh mục vật phẩm...')
            .setDisabled(disabled)
            .addOptions(sheets.map((s, i) => ({
              label:       s.label,
              value:       s.value,
              emoji:       s.emoji,
              description: s.description,
              default:     i === si
            })))
        );

      // ── Builder: Điều hướng trang + nút Công Cụ ───────────────────────────
      const buildNavRow = (si, pi, tbShowing, disabled = false) => {
        const totalPages = sheets[si].pages.length;
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('balo_prev')
            .setLabel('◀ Trước')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || pi === 0),
          new ButtonBuilder()
            .setCustomId('balo_next')
            .setLabel('Sau ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || pi >= totalPages - 1),
          new ButtonBuilder()
            .setCustomId('balo_quick_sell_mode')
            .setLabel('💰 Bán Nhanh')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled),
          new ButtonBuilder()
            .setCustomId('balo_toolbar_toggle')
            .setLabel(tbShowing ? '📦 Ẩn Công Cụ' : '🛠️ Công Cụ')
            .setStyle(tbShowing ? ButtonStyle.Primary : ButtonStyle.Success)
            .setDisabled(disabled)
        );
      };

      // ── Builder: Dropdown chọn vật phẩm để dùng/trang bị ──────────────────
      const buildToolbarSelectRow = (curVal) => {
        const activeSheet = sheets[sheetIdx];
        if (!activeSheet) return null;

        let khaDung = [];
        if (activeSheet.value === 'trangbi') {
          khaDung = itemsList.filter(o => ['Vũ khí', 'Giáp', 'Ngọc Bội'].includes(o.item.loai) && !o.trangBi);
        } else if (activeSheet.value === 'cobao') {
          khaDung = itemsList.filter(o => ['Cổ Bảo Chủ Động', 'Pháp Bảo'].includes(o.item.loai) && !o.trangBi);
        } else if (activeSheet.value === 'danduo') {
          khaDung = itemsList.filter(o => o.item.loai === 'Đan dược' && o.soLuong > 0);
        } else if (activeSheet.value === 'linhthao') {
          khaDung = itemsList.filter(o => !['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo', 'Đan dược'].includes(o.item.loai) && o.soLuong > 0);
        }

        if (khaDung.length === 0) {
          return new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('balo_item_select_empty')
              .setPlaceholder('🎒 Danh mục này trống...')
              .setDisabled(true)
              .addOptions([{ label: '(Trống)', value: '__empty__' }])
          );
        }

        return new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('balo_item_select')
            .setPlaceholder('🔍 Chọn vật phẩm muốn dùng / trang bị...')
            .addOptions(khaDung.slice(0, 25).map(obj => {
              const isEquip    = EQUIP_TYPES.includes(obj.item.loai);
              const encodedVal = encodeToolbarValue(obj.invId, obj.item.id, obj.item.loai);
              return {
                label:       `${obj.item.ten} [#${obj.invId}]`.slice(0, 100),
                value:       encodedVal,
                emoji:       obj.item.emoji || (isEquip ? '🛡️' : '💊'),
                description: `${obj.item.loai} | Mã: #${obj.invId} · Số lượng: ${obj.soLuong}`.slice(0, 100),
                default:     encodedVal === curVal
              };
            }))
        );
      };

      // ── Builder: Nút hành động sau khi chọn item ──────────────────────────
      const buildActionRow = (curVal) => {
        if (!curVal) return null;
        const decoded = decodeToolbarValue(curVal);
        if (!decoded) return null;
        const { invId, loai, itemId } = decoded;
        const isEgg    = itemId === 'trung_linh_thu' || itemId === 'trung_than_thu';
        const isEquip  = EQUIP_TYPES.includes(loai);
        const isUsable = loai === 'Đan dược' || loai === 'Chí bảo' || isEgg;
        const selectedItem = itemsList.find(o => o.invId === invId);
        const isLocked = selectedItem ? selectedItem.khoa : false;

        const components = [];
        components.push(new ButtonBuilder().setCustomId('balo_action_detail').setLabel('🔍 Chi Tiết').setStyle(ButtonStyle.Secondary));
        if (isEquip)  {
          components.push(new ButtonBuilder().setCustomId('balo_action_equip').setLabel('⚔️ Trang Bị').setStyle(ButtonStyle.Primary));
          components.push(
            new ButtonBuilder()
              .setCustomId('balo_action_lock')
              .setLabel(isLocked ? '🔓 Mở Khóa' : '🔒 Khóa')
              .setStyle(isLocked ? ButtonStyle.Success : ButtonStyle.Danger)
          );
        }
        if (isUsable) components.push(new ButtonBuilder().setCustomId('balo_action_use').setLabel(isEgg ? '🥚 Ấp Trứng' : '💊 Sử Dụng').setStyle(ButtonStyle.Success));
        components.push(new ButtonBuilder().setCustomId('balo_action_cancel').setLabel('↩️ Bỏ Chọn').setStyle(ButtonStyle.Secondary));
        return new ActionRowBuilder().addComponents(components);
      };

      // ── Tổng hợp tất cả rows theo mode ────────────────────────────────────
      const buildAllComponents = (disabled = false) => {
        const rows = [];
        rows.push(buildTabRow(disabled));   // Row 1: Tab chuyển đổi

        if (mode === 'VIEW') {
          rows.push(buildSheetSelectRow(sheetIdx, disabled));                  // Row 2: Sheet select
          rows.push(buildNavRow(sheetIdx, pageIdx, showToolbar, disabled));    // Row 3: Nav + Công cụ
          if (showToolbar && !disabled) {
            rows.push(buildToolbarSelectRow(selectedVal));                     // Row 4: Item select
            const ar = buildActionRow(selectedVal);
            if (ar) rows.push(ar);                                             // Row 5: Hành động
          }
        }
        // Mode EQUIPPED: unequip select được thêm vào async — dùng helper riêng
        return rows;
      };

      // ── Helper: refresh inventory sau mỗi hành động ─────────────────────
      const refreshInventory = async () => {
        itemsList = await reloadItemsList(tuSi.idNguoiDung, tuSi.capDo);
        sheets    = BoTaoEmbed.baloSheets(tuSi, itemsList);
        sheetIdx  = Math.min(sheetIdx, sheets.length - 1);
        pageIdx   = 0;
        selectedVal = null;
        selectedEquippedInvId = null;
      };

      // ── Helper: gửi/cập nhật tin nhắn theo mode ─────────────────────────
      const buildPayload = async (disabled = false) => {
        if (mode === 'QUICK_SELL') {
          const { embed } = await buildQuickSellEmbed();
          return {
            embeds: [embed],
            components: buildQuickSellComponents(disabled)
          };
        }

        if (mode === 'EQUIPPED') {
          const rows = [buildTabRow(disabled)];
          if (!disabled) rows.push(await buildUnequipSelect());
          
          const embeds = [await buildEquippedEmbed()];
          if (selectedEquippedInvId && !disabled) {
            const equippedItemObj = itemsList.find(o => o.invId === selectedEquippedInvId);
            if (equippedItemObj) {
              const detailEmbed = BoTaoEmbed.chiTietVatPham(tuSi, equippedItemObj);
              embeds.unshift(detailEmbed); // Đưa chi tiết lên đầu hiển thị phía trên list đồ
              
              rows.push(
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId('balo_equipped_unequip')
                    .setLabel('🔓 Tháo Trang Bị')
                    .setStyle(ButtonStyle.Danger),
                  new ButtonBuilder()
                    .setCustomId('balo_equipped_close')
                    .setLabel('✅ Xác Nhận / Đóng')
                    .setStyle(ButtonStyle.Secondary)
                )
              );
            }
          }

          return {
            embeds,
            components: rows
          };
        }

        const embeds = [sheets[sheetIdx].pages[pageIdx]];
        if (selectedVal) {
          const decoded = decodeToolbarValue(selectedVal);
          if (decoded) {
            const selectedItemObj = itemsList.find(o => o.invId === decoded.invId);
            if (selectedItemObj) {
              const detailEmbed = BoTaoEmbed.chiTietVatPham(tuSi, selectedItemObj);
              embeds.unshift(detailEmbed); // Đưa chi tiết lên đầu để hiển thị phía trên list đồ
            }
          }
        }

        return {
          embeds,
          components: buildAllComponents(disabled)
        };
      };

      // ── Gửi reply ban đầu ─────────────────────────────────────────────────
      const msg = await interaction.editReply(await buildPayload());

      // ── Collector (3 phút) ────────────────────────────────────────────────
      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time:   180_000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();

        // ── Chuyển Tab ──────────────────────────────────────────────────────
        if (i.customId === 'balo_tab_view') {
          mode        = 'VIEW';
          showToolbar = false;
          selectedVal = null;
          selectedEquippedInvId = null;
          await i.editReply(await buildPayload());
          return;
        }
        if (i.customId === 'balo_tab_equipped') {
          mode        = 'EQUIPPED';
          showToolbar = false;
          selectedVal = null;
          selectedEquippedInvId = null;
          await i.editReply(await buildPayload());
          return;
        }

        // ── Đóng Balo ───────────────────────────────────────────────────────
        if (i.customId === 'balo_close') {
          collector.stop('closed');
          return;
        }

        if (i.customId === 'balo_quick_sell_mode') {
          mode = 'QUICK_SELL';
          await i.editReply(await buildPayload());
          return;
        }

        // ══ MODE: QUICK_SELL ══════════════════════════════════════════════════
        if (mode === 'QUICK_SELL') {
          if (i.customId === 'qs_filter_rarity') {
            qsRarity = i.values[0];
            await i.editReply(await buildPayload());
          }
          else if (i.customId === 'qs_filter_realm') {
            qsRealm = i.values[0];
            await i.editReply(await buildPayload());
          }
          else if (i.customId === 'qs_filter_type') {
            qsType = i.values[0];
            await i.editReply(await buildPayload());
          }
          else if (i.customId === 'qs_cancel') {
            mode = 'VIEW';
            await i.editReply(await buildPayload());
          }
          else if (i.customId === 'qs_confirm') {
            const { matchingItems, totalSellValue } = await buildQuickSellEmbed();
            if (matchingItems.length === 0) {
              await i.followUp({
                embeds: [BoTaoEmbed.loi('Không tìm thấy vật phẩm nào khớp với bộ lọc đã chọn!')],
                ephemeral: true
              });
              return;
            }

            const recordIds = matchingItems.map(x => x.inv.id);
            const { Op } = await import('sequelize');
            await Inventory.destroy({
              where: { id: { [Op.in]: recordIds } }
            });

            tuSi.linhThach += totalSellValue;
            await tuSi.save();

            // Refresh itemsList and sheets pages
            await refreshInventory();

            await i.followUp({
              embeds: [BoTaoEmbed.thanhCong('💰 Thanh Lý Bán Nhanh', `Thanh lý thành công **${matchingItems.length}** loại vật phẩm, nhận về **+${totalSellValue.toLocaleString()}** Linh Thạch!`)],
              ephemeral: true
            });

            mode = 'VIEW';
            await i.editReply(await buildPayload());
          }
          return;
        }

        // ══ MODE: EQUIPPED ════════════════════════════════════════════════════
        if (mode === 'EQUIPPED') {
          if (i.customId === 'balo_unequip_select') {
            selectedEquippedInvId = parseInt(i.values[0], 10);
            await i.editReply(await buildPayload());
          }
          else if (i.customId === 'balo_equipped_close') {
            selectedEquippedInvId = null;
            await i.editReply(await buildPayload());
          }
          else if (i.customId === 'balo_equipped_unequip') {
            if (!selectedEquippedInvId) return;
            const inv = await Inventory.findOne({ where: { id: selectedEquippedInvId, idNguoiDung: tuSi.idNguoiDung, trangBi: true } });
            if (!inv) {
              await i.editReply({ embeds: [BoTaoEmbed.loi('Không tìm thấy trang bị này hoặc đã được tháo rồi.')], components: [] });
              collector.stop('finished');
              return;
            }
            const itemDetail = await Item.findByPk(inv.itemId);
            inv.trangBi = false;
            await inv.save();
            await refreshInventory();
            selectedEquippedInvId = null;

            await i.editReply({
              embeds: [
                BoTaoEmbed.thanhCong('🔓 Tháo Trang Bị Thành Công', `Đạo hữu **${tuSi.ten}** đã tháo **${itemDetail ? itemDetail.ten : inv.itemId}** khỏi người.`),
                await buildEquippedEmbed()
              ],
              components: (await buildPayload()).components
            });
          }
          return;
        }

        // ══ MODE: VIEW ════════════════════════════════════════════════════════

        // ── Điều hướng sheet ─────────────────────────────────────────────────
        if (i.customId === 'balo_sheet_select') {
          sheetIdx    = sheets.findIndex(s => s.value === i.values[0]);
          pageIdx     = 0;
          selectedVal = null;
        }
        else if (i.customId === 'balo_prev')  pageIdx = Math.max(0, pageIdx - 1);
        else if (i.customId === 'balo_next')  pageIdx = Math.min(sheets[sheetIdx].pages.length - 1, pageIdx + 1);
        else if (i.customId === 'balo_toolbar_toggle') { showToolbar = !showToolbar; selectedVal = null; }
        else if (i.customId === 'balo_item_select')    selectedVal = i.values[0];
        else if (i.customId === 'balo_action_cancel')  selectedVal = null;

        // ── Xem Chi Tiết ──────────────────────────────────────────────────────
        else if (i.customId === 'balo_action_detail') {
          if (!selectedVal) { await i.editReply(await buildPayload()); return; }
          const decoded = decodeToolbarValue(selectedVal);
          if (!decoded)   { await i.editReply(await buildPayload()); return; }

          const invObj = await Inventory.findOne({ where: { id: decoded.invId, idNguoiDung: tuSi.idNguoiDung } });
          if (!invObj) {
            await i.editReply({
              embeds: [BoTaoEmbed.loi(`Không tìm thấy vật phẩm trong túi đồ.`), sheets[sheetIdx].pages[pageIdx]],
              components: buildAllComponents()
            });
            return;
          }

          const itemDetail = await Item.findByPk(invObj.itemId);
          const detailEmbed = BoTaoEmbed.chiTietVatPham(tuSi, {
            item: itemDetail,
            nangCapSao: invObj.nangCapSao,
            dongChiSoJson: invObj.dongChiSoJson
          });

          await i.editReply({
            embeds: [detailEmbed, sheets[sheetIdx].pages[pageIdx]],
            components: buildAllComponents()
          });
          return;
        }

        // ── Trang Bị ─────────────────────────────────────────────────────────
        else if (i.customId === 'balo_action_equip') {
          if (!selectedVal) { await i.editReply(await buildPayload()); return; }
          const decoded = decodeToolbarValue(selectedVal);
          if (!decoded)   { await i.editReply(await buildPayload()); return; }

          const result = await this._xuLyTrangBiByInvId(tuSi, decoded.invId, decoded.itemId);
          await refreshInventory();
          await i.editReply({
            embeds: [
              result.ok
                ? BoTaoEmbed.thanhCong('⚔️ Trang Bị Thành Công', result.msg)
                : BoTaoEmbed.loi(result.msg),
              sheets[sheetIdx].pages[pageIdx]
            ],
            components: buildAllComponents()
          });
          return;
        }

        // ── Sử Dụng Đan Dược ─────────────────────────────────────────────────
        else if (i.customId === 'balo_action_use') {
          if (!selectedVal) { await i.editReply(await buildPayload()); return; }
          const decoded = decodeToolbarValue(selectedVal);
          if (!decoded)   { await i.editReply(await buildPayload()); return; }

          const result = await this._xuLyDungItemByInvId(tuSi, decoded.invId, decoded.itemId);
          await refreshInventory();
          await i.editReply({
            embeds: [
              result.ok
                ? BoTaoEmbed.thanhCong('💊 Sử Dụng Thành Công', result.msg)
                : BoTaoEmbed.loi(result.msg),
              sheets[sheetIdx].pages[pageIdx]
            ],
            components: buildAllComponents()
          });
          return;
        }
        else if (i.customId === 'balo_action_lock') {
          if (!selectedVal) { await i.editReply(await buildPayload()); return; }
          const decoded = decodeToolbarValue(selectedVal);
          if (!decoded)   { await i.editReply(await buildPayload()); return; }

          const invObj = await Inventory.findOne({ where: { id: decoded.invId, idNguoiDung: tuSi.idNguoiDung } });
          if (!invObj) {
            await i.editReply({
              embeds: [BoTaoEmbed.loi(`Không tìm thấy vật phẩm trong túi đồ.`), sheets[sheetIdx].pages[pageIdx]],
              components: buildAllComponents()
            });
            return;
          }

          invObj.khoa = !invObj.khoa;
          await invObj.save();
          await refreshInventory();

          const statusText = invObj.khoa ? '🔒 Khóa' : '🔓 Mở Khóa';
          const msgText = invObj.khoa
            ? `Đạo hữu đã **Khóa** trang bị thành công. Trang bị này sẽ không thể bị bán.`
            : `Đạo hữu đã **Mở Khóa** trang bị thành công.`;

          await i.editReply({
            embeds: [
              BoTaoEmbed.thanhCong(`${statusText} Thành Công`, msgText),
              sheets[sheetIdx].pages[pageIdx]
            ],
            components: buildAllComponents()
          });
          return;
        }

        // Cập nhật UI thông thường
        await i.editReply(await buildPayload());
      });

      collector.on('end', async (_, reason) => {
        try {
          if (reason === 'closed') {
            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle('🎒 Túi Trữ Vật — Đã Đóng')
                  .setDescription('Đạo hữu đã cất túi đồ vào nơi an toàn.')
                  .setColor(0x7f8c8d)
                  .setTimestamp()
                  .setFooter({ text: 'Dùng /balo để mở lại.' })
              ],
              components: []
            });
          } else {
            await interaction.editReply({ components: await (async () => {
              const p = await buildPayload(true);
              return p.components;
            })() });
          }
        } catch (_) {}
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /** Sử dụng đan dược qua toolbar — xác định bằng invId */
  async _xuLyDungItemByInvId(tuSi, invId, itemId) {
    const inv = await Inventory.findOne({ where: { id: invId, idNguoiDung: tuSi.idNguoiDung } });
    if (!inv || inv.soLuong <= 0) return { ok: false, msg: `Không tìm thấy vật phẩm #${invId} trong balo của ngươi.` };
    return this._thucHienDungItem(tuSi, inv, itemId);
  }

  /** Logic thực thi sử dụng đan dược */
  async _thucHienDungItem(tuSi, inv, itemId) {
    const itemDetail = await Item.findByPk(inv.itemId ?? itemId);
    if (!itemDetail) return { ok: false, msg: 'Không tìm thấy thông tin vật phẩm.' };

    const isEgg = itemDetail.id === 'trung_linh_thu' || itemDetail.id === 'trung_than_thu';

    if (itemDetail.loai !== 'Đan dược' && itemDetail.loai !== 'Chí bảo' && !isEgg) {
      return { ok: false, msg: `Vật phẩm này không phải đan dược, chí bảo hay trứng linh thú có thể sử dụng.` };
    }
    if (tuSi.capDo < (itemDetail.yeuCauCanhGioi || 1)) {
      const { layThongTinCanhGioi } = await import('../config.js');
      const cgReq = layThongTinCanhGioi(itemDetail.yeuCauCanhGioi || 1);
      return { ok: false, msg: `Cảnh giới bất túc! Vật phẩm này yêu cầu tu vi tối thiểu: **${cgReq.realmName} - ${cgReq.stageName}** (Hiện tại: **${tuSi.canhGioi}**).` };
    }

    // Xử lý ấp trứng linh thú
    if (isEgg) {
      const { Pet } = await import('../models/Pet.js');
      const { PET_TEMPLATES } = await import('../config.js');

      let targetType = 'ma_lang';
      let rarity = 'NORMAL';
      let defaultName = 'Ma Lang 🐺';
      let tuChat = 100;

      const roll = Math.random() * 100;
      const eggId = itemDetail.id;

      if (eggId === 'trung_linh_thu') {
        tuChat = 100 + Math.floor(Math.random() * 61); // Tư chất bất kỳ: 100 - 160
        if (roll <= 33) {
          targetType = 'ma_lang';
          defaultName = 'U Minh Ma Lang 🐺';
        } else if (roll <= 66) {
          targetType = 'loi_diep';
          defaultName = 'Lôi Điệp 🦋';
        } else {
          targetType = 'than_vien';
          defaultName = 'Thần Viên 🦍';
        }
      } else {
        rarity = 'ANCIENT';
        tuChat = 150 + Math.floor(Math.random() * 71); // Tư chất bất kỳ: 150 - 220
        if (roll <= 33) {
          targetType = 'to_long';
          defaultName = 'Tổ Long 🐉';
        } else if (roll <= 66) {
          targetType = 'phuong_hoang';
          defaultName = 'Hỏa Phượng 🐦';
        } else {
          targetType = 'ky_lan';
          defaultName = 'Kỳ Lân 🦄';
        }
      }

      // Khởi tạo linh thú
      const pet = await Pet.create({
        userId:  tuSi.idNguoiDung,
        name:    defaultName,
        type:    targetType,
        rarity:  rarity,
        level:   1,
        exp:     0,
        tuChat:  tuChat,
        isActive: false
      });

      // Tiêu hao trứng
      inv.soLuong -= 1;
      if (inv.soLuong <= 0) await inv.destroy();
      else await inv.save();

      const petNameInTpl = PET_TEMPLATES[targetType]?.name || defaultName;

      return {
        ok:  true,
        msg: `🐣 **Ấp Trứng Thành Công!**\nQuả trứng vỡ ra, một chú **${petNameInTpl}** nhỏ bé chui ra chào đạo hữu!\n\n` +
             `• **Tên linh thú**: \`${pet.name}\`\n` +
             `• **Tư chất**: \`${pet.tuChat}\` *(chỉ số bất kỳ theo phẩm chất trứng)*\n` +
             `*Đạo hữu hãy gõ lệnh \`/dongphu\` (mục Linh Thú) để quản lý hoặc trang bị (cho xuất chiến) linh thú này.*`
      };
    }

    // Xử lý Bình Tinh Hải
    if (itemDetail.id === 'binh_tinh_hai') {
      const today = new Date().toISOString().split('T')[0];
      if (tuSi.lastUseBinhTinhHai === today) {
        return { ok: false, msg: `Hôm nay đạo hữu đã trích xuất sinh cơ từ **Bình Tinh Hải 🏺** rồi, hãy đợi ngày mai!` };
      }
      
      await Inventory.addVatPham(tuSi.idNguoiDung, 'dan_than_pham', 2);
      tuSi.lastUseBinhTinhHai = today;
      await tuSi.save();
      
      return {
        ok: true,
        msg: `Đạo hữu **${tuSi.ten}** đã sử dụng **Bình Tinh Hải 🏺** để trích xuất ra **2 viên Đan Thần Phẩm 🔴**! Bình Tinh Hải không bị tiêu hao.`
      };
    }

    // Xử lý Chuyển Sinh Đan
    if (itemDetail.id === 'chuyen_sinh_dan') {
      const id = tuSi.idNguoiDung;

      const { Inventory } = await import('../models/Inventory.js');
      const { PlayerSkill } = await import('../models/PlayerSkill.js');
      const { Pet } = await import('../models/Pet.js');
      const { GardenPlot } = await import('../models/GardenPlot.js');
      const { PlayerGiftCode } = await import('../models/PlayerGiftCode.js');
      const { ThoiGianCho } = await import('../models/ThoiGianCho.js');
      const { Abode } = await import('../models/Abode.js');
      const { LichSuMua } = await import('../models/LichSuMua.js');
      const { DongGopEmoji } = await import('../models/DongGopEmoji.js');
      const { AuctionListing } = await import('../models/AuctionListing.js');

      await Inventory.destroy({ where: { idNguoiDung: id } });
      await PlayerSkill.destroy({ where: { idNguoiDung: id } });
      await Pet.destroy({ where: { userId: id } });
      await GardenPlot.destroy({ where: { userId: id } });
      await PlayerGiftCode.destroy({ where: { userId: id } });
      await ThoiGianCho.destroy({ where: { idNguoiDung: id } });
      await Abode.destroy({ where: { userId: id } });
      await LichSuMua.destroy({ where: { idNguoiDung: id } });
      await DongGopEmoji.destroy({ where: { idNguoiDung: id } });
      await AuctionListing.destroy({ where: { sellerId: id } });
      await AuctionListing.destroy({ where: { currentBidderId: id } });

      await tuSi.destroy();

      return {
        ok: true,
        msg: `🌀 **Nghịch Thiên Cải Mệnh - Luân Hồi Chuyển Sinh!** 🌀\n` +
             `Đạo hữu **${tuSi.ten}** đã nuốt **${itemDetail.ten}**!\n` +
             `Nhục thân hóa thành cát bụi, nguyên anh tan biến giữa thiên địa. Linh phách đạo hữu tiến vào luân hồi lục đạo, xóa sạch mọi trần duyên kiếp trước.\n` +
             `Toàn bộ tu vi, vật phẩm, sủng vật, động phủ... đã hoàn toàn tiêu biến.\n` +
             `Đạo hữu hãy dùng lệnh \`/start [tên]\` để bắt đầu một kiếp tu tiên mới!`
      };
    }

    // Xử lý Đan Thần Phẩm
    if (itemDetail.id === 'dan_than_pham') {
      const { CanhGioi } = await import('../models/CanhGioi.js');
      const { Abode } = await import('../models/Abode.js');
      const { Pet } = await import('../models/Pet.js');

      const cg = await CanhGioi.findByPk(tuSi.capDo);
      const tocDoCoBan = cg ? cg.tocDoCoBan : 100;

      let activePet = await Pet.findOne({ where: { userId: tuSi.idNguoiDung, isActive: true } });
      if (activePet) {
        const check = config.checkHuyetMachApChe(tuSi.capDo, activePet.rarity);
        if (!check.allowed) activePet = null;
      }
      const multiplier = tuSi.layHeSoTuLuyen(activePet);

      const abode = await Abode.findByPk(tuSi.idNguoiDung);
      const lvDongPhu = abode ? abode.level : 0;
      const speedMult = 1 + lvDongPhu;

      const thienDao = await tuSi.layHeSoThienDao();
      const expGained = Math.floor(128 * tocDoCoBan * multiplier * speedMult * thienDao.expMult);

      tuSi.linhLuc += expGained;
      await tuSi.save();

      inv.soLuong -= 1;
      if (inv.soLuong <= 0) await inv.destroy();
      else await inv.save();

      return {
        ok: true,
        msg: `Đạo hữu **${tuSi.ten}** đã nuốt **${itemDetail.ten} 🔴**! Cảm nhận linh khí bộc phát, tu vi gia tăng thần tốc **+${expGained.toLocaleString()} Linh Lực** *(tương đương 128 Đạo Niên tu luyện)*.`
      };
    }

    const stats  = await tuSi.layChiSoDayDu();
    const effect = itemDetail.chiSo;
    let recoveryMsg = '';

    if (effect.hp_hoi) {
      const prev = tuSi.hp;
      tuSi.hp = Math.min(stats.max_hp, tuSi.hp + effect.hp_hoi * 10);
      recoveryMsg += `• **HP**: \`+${tuSi.hp - prev}\` (${tuSi.hp}/${stats.max_hp})\n`;
    }
    if (effect.mp_hoi) {
      const prev = tuSi.mp;
      tuSi.mp = Math.min(stats.max_mp, tuSi.mp + effect.mp_hoi);
      recoveryMsg += `• **MP**: \`+${tuSi.mp - prev}\` (${tuSi.mp}/${stats.max_mp})\n`;
    }
    if (effect.exp_bonus) {
      tuSi.linhLuc += effect.exp_bonus;
      recoveryMsg += `• **Linh Lực**: \`+${effect.exp_bonus}\`\n`;
    }

    inv.soLuong -= 1;
    if (inv.soLuong <= 0) await inv.destroy();
    else await inv.save();
    await tuSi.save();

    return {
      ok:  true,
      msg: `Đạo hữu **${tuSi.ten}** đã dùng **${itemDetail.ten}**:\n${recoveryMsg || '• Không có hiệu ứng nào.'}`
    };
  }

  /** Trang bị item qua toolbar — xác định bằng invId */
  async _xuLyTrangBiByInvId(tuSi, invId, itemId) {
    const inv = await Inventory.findOne({ where: { id: invId, idNguoiDung: tuSi.idNguoiDung, trangBi: false } });
    if (!inv) return { ok: false, msg: `Không tìm thấy trang bị #${invId} (hoặc nó đã được mặc rồi).` };
    return this._thucHienTrangBi(tuSi, inv, itemId);
  }

  /** Logic thực thi trang bị */
  async _thucHienTrangBi(tuSi, inv, itemId) {
    const itemDetail = await Item.findByPk(inv.itemId ?? itemId);
    if (!itemDetail || !EQUIP_TYPES.includes(itemDetail.loai)) {
      return { ok: false, msg: `Vật phẩm này không phải trang bị có thể mặc.` };
    }
    if (tuSi.capDo < (itemDetail.yeuCauCanhGioi || 1)) {
      const { layThongTinCanhGioi } = await import('../config.js');
      const cgReq = layThongTinCanhGioi(itemDetail.yeuCauCanhGioi || 1);
      return { ok: false, msg: `Cảnh giới bất túc! Trang bị này yêu cầu tu vi tối thiểu: **${cgReq.realmName} - ${cgReq.stageName}** (Hiện tại: **${tuSi.canhGioi}**).` };
    }

    const currentEquipped = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true } });
    const equippedItems = [];
    for (const eq of currentEquipped) {
      const eqItem = await Item.findByPk(eq.itemId);
      if (eqItem) equippedItems.push({ eq, detail: eqItem });
    }

    const sameType = equippedItems.filter(x => x.detail.loai === itemDetail.loai);
    let extraMsg   = '';

    if (['Vũ khí', 'Giáp', 'Ngọc Bội'].includes(itemDetail.loai)) {
      if (sameType.length > 0) {
        const old = sameType[0];
        old.eq.trangBi = false;
        await old.eq.save();
        extraMsg = `\n*(Đã tháo trang bị cũ: **${old.detail.ten}**)*`;
      }
    } else if (itemDetail.loai === 'Cổ Bảo Chủ Động' && sameType.length >= 3) {
      return { ok: false, msg: `Giới hạn tối đa 3 Cổ Bảo Chủ Động! Hãy vào tab **🛡️ Đang Mặc** để tháo bớt.` };
    } else if (itemDetail.loai === 'Pháp Bảo' && sameType.length >= 6) {
      return { ok: false, msg: `Giới hạn tối đa 6 Pháp Bảo! Hãy vào tab **🛡️ Đang Mặc** để tháo bớt.` };
    }

    inv.trangBi = true;
    await inv.save();

    return {
      ok:  true,
      msg: `Đạo hữu **${tuSi.ten}** đã trang bị **${itemDetail.ten}** thành công!${extraMsg}`
    };
  }
}

const controller = new BoDieuKhienVatPham();
export const danhSachLenhVatPham = [controller.lenhBalo];
export { controller as boDieuKhienVatPham };
