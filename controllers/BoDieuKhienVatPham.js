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

// Loại item nào có thể trang bị / sử dụng
const EQUIP_TYPES  = ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'];
const USABLE_TYPES = ['Đan dược'];
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
async function reloadItemsList(idNguoiDung) {
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
      dongChiSoJson: inv.dongChiSoJson
    });
  }
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
      let itemsList   = await reloadItemsList(tuSi.idNguoiDung);
      let sheets      = BoTaoEmbed.baloSheets(tuSi, itemsList);
      let sheetIdx    = 0;
      let pageIdx     = 0;
      let showToolbar = false;
      let selectedVal = null;
      let mode        = 'VIEW'; // 'VIEW' | 'EQUIPPED'

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
            .setCustomId('balo_toolbar_toggle')
            .setLabel(tbShowing ? '📦 Ẩn Công Cụ' : '🛠️ Công Cụ')
            .setStyle(tbShowing ? ButtonStyle.Primary : ButtonStyle.Success)
            .setDisabled(disabled)
        );
      };

      // ── Builder: Dropdown chọn vật phẩm để dùng/trang bị ──────────────────
      const buildToolbarSelectRow = (curVal) => {
        const usableItems = itemsList.filter(o => USABLE_TYPES.includes(o.item.loai) && o.soLuong > 0);
        const equipItems  = itemsList.filter(o => EQUIP_TYPES.includes(o.item.loai) && !o.trangBi);
        const khaDung     = [...usableItems, ...equipItems];

        if (khaDung.length === 0) {
          return new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('balo_item_select')
              .setPlaceholder('⚠️ Không có vật phẩm khả dụng')
              .setDisabled(true)
              .addOptions([{ label: '(Kho trống)', value: '__empty__' }])
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
                label:       obj.item.ten.slice(0, 100),
                value:       encodedVal,
                emoji:       isEquip ? '🛡️' : '💊',
                description: `${obj.item.loai} | x${obj.soLuong}`.slice(0, 100),
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
        const { loai } = decoded;
        const isEquip  = EQUIP_TYPES.includes(loai);
        const isUsable = USABLE_TYPES.includes(loai);
        const components = [];
        if (isEquip)  components.push(new ButtonBuilder().setCustomId('balo_action_equip').setLabel('⚔️ Trang Bị').setStyle(ButtonStyle.Primary));
        if (isUsable) components.push(new ButtonBuilder().setCustomId('balo_action_use').setLabel('💊 Sử Dụng').setStyle(ButtonStyle.Success));
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
        itemsList = await reloadItemsList(tuSi.idNguoiDung);
        sheets    = BoTaoEmbed.baloSheets(tuSi, itemsList);
        sheetIdx  = Math.min(sheetIdx, sheets.length - 1);
        pageIdx   = 0;
        selectedVal = null;
      };

      // ── Helper: gửi/cập nhật tin nhắn theo mode ─────────────────────────
      const buildPayload = async (disabled = false) => {
        if (mode === 'EQUIPPED') {
          const rows = [buildTabRow(disabled)];
          if (!disabled) rows.push(await buildUnequipSelect());
          return {
            embeds:     [await buildEquippedEmbed()],
            components: rows
          };
        }
        return {
          embeds:     [sheets[sheetIdx].pages[pageIdx]],
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
          await i.editReply(await buildPayload());
          return;
        }
        if (i.customId === 'balo_tab_equipped') {
          mode        = 'EQUIPPED';
          showToolbar = false;
          selectedVal = null;
          await i.editReply(await buildPayload());
          return;
        }

        // ── Đóng Balo ───────────────────────────────────────────────────────
        if (i.customId === 'balo_close') {
          collector.stop('closed');
          return;
        }

        // ══ MODE: EQUIPPED ════════════════════════════════════════════════════
        if (mode === 'EQUIPPED') {
          if (i.customId === 'balo_unequip_select') {
            const invId = parseInt(i.values[0], 10);
            const inv   = await Inventory.findOne({ where: { id: invId, idNguoiDung: tuSi.idNguoiDung, trangBi: true } });
            if (!inv) {
              await i.editReply({ embeds: [BoTaoEmbed.loi('Không tìm thấy trang bị này hoặc đã được tháo rồi.')], components: [] });
              collector.stop('finished');
              return;
            }
            const itemDetail = await Item.findByPk(inv.itemId);
            inv.trangBi = false;
            await inv.save();
            await refreshInventory();

            const rows = [buildTabRow()];
            rows.push(await buildUnequipSelect());
            await i.editReply({
              embeds: [
                BoTaoEmbed.thanhCong('🔓 Tháo Trang Bị Thành Công', `Đạo hữu **${tuSi.ten}** đã tháo **${itemDetail ? itemDetail.ten : inv.itemId}** khỏi người.`),
                await buildEquippedEmbed()
              ],
              components: rows
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
    if (!itemDetail || itemDetail.loai !== 'Đan dược') {
      return { ok: false, msg: `Vật phẩm này không phải đan dược có thể sử dụng.` };
    }
    if (tuSi.capDo < (itemDetail.yeuCauCanhGioi || 1)) {
      const { layThongTinCanhGioi } = await import('../config.js');
      const cgReq = layThongTinCanhGioi(itemDetail.yeuCauCanhGioi || 1);
      return { ok: false, msg: `Cảnh giới bất túc! Vật phẩm này yêu cầu tu vi tối thiểu: **${cgReq.realmName} - ${cgReq.stageName}** (Hiện tại: **${tuSi.canhGioi}**).` };
    }

    const equippedInv = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true } });
    const stats  = tuSi.layChiSo(equippedInv);
    const effect = itemDetail.chiSo;
    let recoveryMsg = '';

    if (effect.hp_hoi) {
      const prev = tuSi.hp;
      tuSi.hp = Math.min(stats.max_hp, tuSi.hp + effect.hp_hoi);
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
