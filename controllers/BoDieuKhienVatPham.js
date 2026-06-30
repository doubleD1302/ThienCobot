import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';

import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';
import { Inventory } from '../models/Inventory.js';
import { Item } from '../models/Item.js';

// Loại item nào có thể trang bị
const EQUIP_TYPES  = ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'];
// Loại item nào có thể dùng (tiêu hao)
const USABLE_TYPES = ['Đan dược'];

/**
 * Giải mã giá trị option toolbar thành object { invId, itemId, loai }.
 * Format: "<invId>|<itemId>|<loaiIndex>"
 * Dùng | và index số nguyên để tránh vấn đề với tiếng Việt trong split.
 */
const ALL_TYPES = [...EQUIP_TYPES, ...USABLE_TYPES];

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
  const loai = ALL_TYPES[loaiIdx] ?? null;
  return { invId: parseInt(invIdStr, 10), itemId, loai };
}

// ── Helper: reload inventory list ────────────────────────────────────────────
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

class BoDieuKhienVatPham extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhBalo = {
    data: new SlashCommandBuilder()
      .setName('balo')
      .setDescription('Mở túi trữ vật, quản lý trang bị và sử dụng linh dược')
      .addSubcommand(sub =>
        sub.setName('xem')
          .setDescription('Xem toàn bộ vật phẩm trong túi đồ của ngươi')
      )
      .addSubcommand(sub =>
        sub.setName('dung')
          .setDescription('Sử dụng đan dược để hồi phục thể trạng')
          .addStringOption(opt =>
            opt.setName('item_id')
              .setDescription('Mã vật phẩm đan dược muốn sử dụng (VD: dan_hp_1)')
              .setRequired(true)
          )
      )
      .addSubcommand(sub =>
        sub.setName('trangbi')
          .setDescription('Trang bị vũ khí hoặc linh giáp bảo vệ cơ thể')
          .addStringOption(opt =>
            opt.setName('item_id')
              .setDescription('Mã trang bị muốn mặc (VD: kiem_go)')
              .setRequired(true)
          )
      )
      .addSubcommand(sub =>
        sub.setName('thao')
          .setDescription('Tháo trang bị đang mặc trên người')
          .addStringOption(opt =>
            opt.setName('item_id')
              .setDescription('Mã trang bị muốn tháo (VD: kiem_go)')
              .setRequired(true)
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

      // ─── Helper: load tất cả trang bị đang mặc ───────────────────────────
      const loadEquipped = async () => {
        const equippedInv = await Inventory.findAll({
          where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true }
        });
        for (const eq of equippedInv) {
          eq.item = await Item.findByPk(eq.itemId);
        }
        return equippedInv.filter(eq => eq.item !== null);
      };

      // ═══════════════════════════════════════════════════════════════
      //  SUBCOMMAND: xem — giao diện balo dạng bảng nhiều sheet
      // ═══════════════════════════════════════════════════════════════
      if (subcommand === 'xem') {
        // 1. Load toàn bộ inventory
        const itemsList = await reloadItemsList(tuSi.idNguoiDung);
        const sheets    = BoTaoEmbed.baloSheets(tuSi, itemsList);

        // Trạng thái UI
        let sheetIdx       = 0;     // tab sheet hiện tại
        let pageIdx        = 0;     // trang trong sheet
        let showToolbar    = false;  // đang hiển thị toolbar hay không
        let selectedVal    = null;   // encoded toolbar value hiện tại

        // ── Helpers xây component rows ────────────────────────────────

        /** Row 1: Select menu chọn sheet (tab) */
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

        /** Row 2: Nút điều hướng + Công Cụ + Đóng */
        const buildControlRow = (si, pi, tbShowing, disabled = false) => {
          const totalPages = sheets[si].pages.length;
          return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('balo_prev')
              .setLabel('◀ Trang trước')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(disabled || pi === 0),
            new ButtonBuilder()
              .setCustomId('balo_next')
              .setLabel('Trang sau ▶')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(disabled || pi >= totalPages - 1),
            new ButtonBuilder()
              .setCustomId('balo_toolbar_toggle')
              .setLabel(tbShowing ? '📦 Ẩn Công Cụ' : '🛠️ Công Cụ')
              .setStyle(tbShowing ? ButtonStyle.Primary : ButtonStyle.Success)
              .setDisabled(disabled),
            new ButtonBuilder()
              .setCustomId('balo_close')
              .setLabel('❌ Đóng')
              .setStyle(ButtonStyle.Danger)
              .setDisabled(disabled)
          );
        };

        /**
         * Row 3: Dropdown chọn item khả dụng trong toolbar.
         * - Đan dược (số lượng > 0) → có thể Sử Dụng
         * - Trang bị chưa mặc → có thể Trang Bị
         * Mỗi option dùng invId làm key độc nhất (kể cả 2 Kiếm Gỗ trùng tên).
         */
        const buildToolbarSelectRow = (curVal) => {
          const usableItems = itemsList.filter(obj =>
            USABLE_TYPES.includes(obj.item.loai) && obj.soLuong > 0
          );
          const equipItems = itemsList.filter(obj =>
            EQUIP_TYPES.includes(obj.item.loai) && !obj.trangBi
          );
          const khaDung = [...usableItems, ...equipItems];

          if (khaDung.length === 0) {
            return new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('balo_item_select')
                .setPlaceholder('⚠️ Không có vật phẩm khả dụng')
                .setDisabled(true)
                .addOptions([{ label: '(Kho trống)', value: '__empty__' }])
            );
          }

          // Discord giới hạn tối đa 25 options
          const limited = khaDung.slice(0, 25);
          return new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('balo_item_select')
              .setPlaceholder('🔍 Chọn vật phẩm muốn dùng/trang bị...')
              .addOptions(limited.map(obj => {
                const isEquipType = EQUIP_TYPES.includes(obj.item.loai);
                const encodedVal  = encodeToolbarValue(obj.invId, obj.item.id, obj.item.loai);
                return {
                  label:       obj.item.ten.slice(0, 100),
                  value:       encodedVal,
                  emoji:       isEquipType ? '🛡️' : '💊',
                  description: `${obj.item.loai} | x${obj.soLuong} | #${obj.invId}`.slice(0, 100),
                  default:     encodedVal === curVal
                };
              }))
          );
        };

        /**
         * Row 4: Nút hành động (Trang Bị / Sử Dụng / Bỏ Chọn).
         * Chỉ hiện khi người dùng đã chọn item trong toolbar.
         */
        const buildActionRow = (curVal) => {
          if (!curVal) return null;
          const decoded = decodeToolbarValue(curVal);
          if (!decoded) return null;

          const { loai } = decoded;
          const isEquip  = EQUIP_TYPES.includes(loai);
          const isUsable = USABLE_TYPES.includes(loai);

          const components = [];
          if (isEquip) {
            components.push(
              new ButtonBuilder()
                .setCustomId('balo_action_equip')
                .setLabel('⚔️ Trang Bị')
                .setStyle(ButtonStyle.Primary)
            );
          }
          if (isUsable) {
            components.push(
              new ButtonBuilder()
                .setCustomId('balo_action_use')
                .setLabel('💊 Sử Dụng')
                .setStyle(ButtonStyle.Success)
            );
          }
          components.push(
            new ButtonBuilder()
              .setCustomId('balo_action_cancel')
              .setLabel('↩️ Bỏ Chọn')
              .setStyle(ButtonStyle.Secondary)
          );
          return new ActionRowBuilder().addComponents(components);
        };

        /** Tổng hợp tất cả component rows (tối đa 5 theo giới hạn Discord) */
        const buildAllComponents = (si, pi, tbShowing, curVal, disabled = false) => {
          const rows = [];
          rows.push(buildSheetSelectRow(si, disabled));              // row 1: tabs
          rows.push(buildControlRow(si, pi, tbShowing, disabled));   // row 2: nav + công cụ + đóng
          if (tbShowing && !disabled) {
            rows.push(buildToolbarSelectRow(curVal));                // row 3: item select
            const actionRow = buildActionRow(curVal);
            if (actionRow) rows.push(actionRow);                    // row 4: hành động
          }
          return rows;
        };

        const currentEmbed = () => sheets[sheetIdx].pages[pageIdx];

        // ── Gửi reply ban đầu ──────────────────────────────────────────
        const msg = await interaction.editReply({
          embeds:     [currentEmbed()],
          components: buildAllComponents(sheetIdx, pageIdx, showToolbar, selectedVal)
        });

        // ── Collector 3 phút, chỉ người gọi lệnh ──────────────────────
        const collector = msg.createMessageComponentCollector({
          filter: i => i.user.id === interaction.user.id,
          time:   180_000
        });

        /** Helper: reload inventory & rebuild sheets sau mỗi hành động */
        const refreshInventory = async () => {
          const fresh = await reloadItemsList(tuSi.idNguoiDung);
          itemsList.length = 0;
          itemsList.push(...fresh);
          const newSheets = BoTaoEmbed.baloSheets(tuSi, itemsList);
          sheets.length = 0;
          sheets.push(...newSheets);
          sheetIdx = Math.min(sheetIdx, sheets.length - 1);
          pageIdx  = 0;
          selectedVal = null;
        };

        collector.on('collect', async i => {
          await i.deferUpdate();

          switch (i.customId) {

            // ── Điều hướng sheet (tab) ──────────────────────────────────
            case 'balo_sheet_select': {
              sheetIdx    = sheets.findIndex(s => s.value === i.values[0]);
              pageIdx     = 0;
              selectedVal = null;
              break;
            }
            case 'balo_prev': {
              pageIdx = Math.max(0, pageIdx - 1);
              break;
            }
            case 'balo_next': {
              pageIdx = Math.min(sheets[sheetIdx].pages.length - 1, pageIdx + 1);
              break;
            }

            // ── Hiện/ẩn toolbar ─────────────────────────────────────────
            case 'balo_toolbar_toggle': {
              showToolbar = !showToolbar;
              selectedVal = null;
              break;
            }

            // ── Chọn item trong toolbar ──────────────────────────────────
            case 'balo_item_select': {
              selectedVal = i.values[0];
              break;
            }

            // ── Bỏ chọn item ────────────────────────────────────────────
            case 'balo_action_cancel': {
              selectedVal = null;
              break;
            }

            // ── Đóng balo ───────────────────────────────────────────────
            case 'balo_close': {
              collector.stop('closed');
              return;
            }

            // ── Trang bị item (dùng invId để định danh chính xác) ────────
            case 'balo_action_equip': {
              if (!selectedVal) break;
              const decoded = decodeToolbarValue(selectedVal);
              if (!decoded) break;

              const result = await this._xuLyTrangBiByInvId(tuSi, decoded.invId, decoded.itemId, loadEquipped);
              await refreshInventory();
              await i.editReply({
                embeds:     result.ok
                  ? [BoTaoEmbed.thanhCong('⚔️ Trang Bị Thành Công', result.msg), currentEmbed()]
                  : [BoTaoEmbed.loi(result.msg), currentEmbed()],
                components: buildAllComponents(sheetIdx, pageIdx, showToolbar, selectedVal)
              });
              return;
            }

            // ── Sử dụng đan dược (dùng invId để định danh chính xác) ─────
            case 'balo_action_use': {
              if (!selectedVal) break;
              const decoded = decodeToolbarValue(selectedVal);
              if (!decoded) break;

              const result = await this._xuLyDungItemByInvId(tuSi, decoded.invId, decoded.itemId, loadEquipped);
              await refreshInventory();
              await i.editReply({
                embeds:     result.ok
                  ? [BoTaoEmbed.thanhCong('💊 Sử Dụng Thành Công', result.msg), currentEmbed()]
                  : [BoTaoEmbed.loi(result.msg), currentEmbed()],
                components: buildAllComponents(sheetIdx, pageIdx, showToolbar, selectedVal)
              });
              return;
            }

            default: break;
          }

          // Cập nhật UI thông thường (không phải action)
          await i.editReply({
            embeds:     [currentEmbed()],
            components: buildAllComponents(sheetIdx, pageIdx, showToolbar, selectedVal)
          });
        });

        collector.on('end', async (_, reason) => {
          try {
            if (reason === 'closed') {
              await interaction.editReply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle('🎒 Túi Trữ Vật — Đã Đóng')
                    .setDescription('Ngươi đã cất túi đồ vào nơi an toàn.')
                    .setColor(0x7f8c8d)
                    .setTimestamp()
                    .setFooter({ text: 'Dùng /balo xem để mở lại.' })
                ],
                components: []
              });
            } else {
              // Hết giờ — disable tất cả component
              await interaction.editReply({
                components: buildAllComponents(sheetIdx, pageIdx, false, null, true)
              });
            }
          } catch (_) { /* message đã bị xoá */ }
        });

        return;
      }

      // ═══════════════════════════════════════════════════════════════
      //  SUBCOMMAND: dung — gọi trực tiếp qua slash command
      // ═══════════════════════════════════════════════════════════════
      const itemId = interaction.options.getString('item_id');

      if (subcommand === 'dung') {
        const result = await this._xuLyDungItemByItemId(tuSi, itemId, loadEquipped);
        return await interaction.editReply({
          embeds: [result.ok
            ? BoTaoEmbed.thanhCong('💊 Sử Dụng Linh Đan Thành Công', result.msg)
            : BoTaoEmbed.loi(result.msg)]
        });
      }

      // ═══════════════════════════════════════════════════════════════
      //  SUBCOMMAND: trangbi — gọi trực tiếp qua slash command
      // ═══════════════════════════════════════════════════════════════
      if (subcommand === 'trangbi') {
        const result = await this._xuLyTrangBiByItemId(tuSi, itemId, loadEquipped);
        return await interaction.editReply({
          embeds: [result.ok
            ? BoTaoEmbed.thanhCong('🛡️ Khoác Lên Trang Bị', result.msg)
            : BoTaoEmbed.loi(result.msg)]
        });
      }

      // ═══════════════════════════════════════════════════════════════
      //  SUBCOMMAND: thao
      // ═══════════════════════════════════════════════════════════════
      if (subcommand === 'thao') {
        const inv = await Inventory.findOne({
          where: { idNguoiDung: tuSi.idNguoiDung, itemId: itemId, trangBi: true }
        });

        if (!inv) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Đạo hữu hiện đang không mặc trang bị có mã ID \`${itemId}\`.`)]
          });
        }

        const itemDetail = await Item.findByPk(itemId);
        inv.trangBi = false;
        await inv.save();

        return await interaction.editReply({
          embeds: [
            BoTaoEmbed.thanhCong(
              "Tháo Trang Bị",
              `Đạo hữu **${tuSi.ten}** đã tháo bỏ **${itemDetail ? itemDetail.ten : itemId}** xuống.`
            )
          ]
        });
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Sử dụng đan dược qua TOOLBAR — xác định chính xác bằng invId.
   * Đảm bảo không nhầm lẫn giữa 2 stack đan dược cùng loại (nếu có).
   */
  async _xuLyDungItemByInvId(tuSi, invId, itemId, loadEquipped) {
    const inv = await Inventory.findOne({
      where: { id: invId, idNguoiDung: tuSi.idNguoiDung }
    });
    if (!inv || inv.soLuong <= 0) {
      return { ok: false, msg: `Không tìm thấy vật phẩm #${invId} trong balo của ngươi.` };
    }
    return this._thucHienDungItem(tuSi, inv, itemId, loadEquipped);
  }

  /**
   * Sử dụng đan dược qua SLASH COMMAND — tìm bất kỳ stack nào của itemId.
   */
  async _xuLyDungItemByItemId(tuSi, itemId, loadEquipped) {
    const inv = await Inventory.findOne({
      where: { idNguoiDung: tuSi.idNguoiDung, itemId }
    });
    if (!inv || inv.soLuong <= 0) {
      return { ok: false, msg: `Không tìm thấy đan dược nào có mã ID \`${itemId}\` trong balo.` };
    }
    return this._thucHienDungItem(tuSi, inv, itemId, loadEquipped);
  }

  /** Logic thực thi sử dụng đan dược — dùng chung cho cả 2 đường trên */
  async _thucHienDungItem(tuSi, inv, itemId, loadEquipped) {
    const itemDetail = await Item.findByPk(inv.itemId ?? itemId);
    if (!itemDetail || itemDetail.loai !== 'Đan dược') {
      return { ok: false, msg: `Vật phẩm này không phải đan dược có thể sử dụng.` };
    }

    if (tuSi.capDo < (itemDetail.yeuCauCanhGioi || 1)) {
      const { layThongTinCanhGioi } = await import('../config.js');
      const cgReq = layThongTinCanhGioi(itemDetail.yeuCauCanhGioi || 1);
      return {
        ok: false,
        msg: `Cảnh giới bất túc! Vật phẩm này yêu cầu tu vi tối thiểu: **${cgReq.realmName} - ${cgReq.stageName}** (Hiện tại: **${tuSi.canhGioi}**).`
      };
    }

    const stats  = tuSi.layChiSo(await loadEquipped());
    const effect = itemDetail.chiSo;
    let recoveryMsg = '';

    if (effect.hp_hoi) {
      const prevHp = tuSi.hp;
      tuSi.hp = Math.min(stats.max_hp, tuSi.hp + effect.hp_hoi);
      recoveryMsg += `• **HP**: \`+${tuSi.hp - prevHp}\` (${tuSi.hp}/${stats.max_hp})\n`;
    }
    if (effect.mp_hoi) {
      const prevMp = tuSi.mp;
      tuSi.mp = Math.min(stats.max_mp, tuSi.mp + effect.mp_hoi);
      recoveryMsg += `• **MP**: \`+${tuSi.mp - prevMp}\` (${tuSi.mp}/${stats.max_mp})\n`;
    }

    inv.soLuong -= 1;
    if (inv.soLuong <= 0) {
      await inv.destroy();
    } else {
      await inv.save();
    }
    await tuSi.save();

    return {
      ok:  true,
      msg: `Đạo hữu **${tuSi.ten}** đã dùng **${itemDetail.ten}**:\n${recoveryMsg || '• Không có hiệu ứng hồi phục nào.'}`
    };
  }

  /**
   * Trang bị item qua TOOLBAR — xác định chính xác bằng invId (PK inventory).
   * Giải quyết trường hợp 2 Kiếm Gỗ cùng loại mà cần trang bị đúng cái.
   */
  async _xuLyTrangBiByInvId(tuSi, invId, itemId, loadEquipped) {
    const inv = await Inventory.findOne({
      where: { id: invId, idNguoiDung: tuSi.idNguoiDung, trangBi: false }
    });
    if (!inv) {
      return { ok: false, msg: `Không tìm thấy trang bị #${invId} (hoặc nó đã được mặc rồi).` };
    }
    return this._thucHienTrangBi(tuSi, inv, itemId, loadEquipped);
  }

  /**
   * Trang bị item qua SLASH COMMAND — tìm bất kỳ bản copy nào chưa mặc.
   */
  async _xuLyTrangBiByItemId(tuSi, itemId, loadEquipped) {
    const hasIt = await Inventory.findOne({
      where: { idNguoiDung: tuSi.idNguoiDung, itemId }
    });
    if (!hasIt) {
      return { ok: false, msg: `Ngươi không sở hữu trang bị nào có mã ID \`${itemId}\` trong balo.` };
    }

    const inv = await Inventory.findOne({
      where: { idNguoiDung: tuSi.idNguoiDung, itemId, trangBi: false }
    });
    if (!inv) {
      return { ok: false, msg: `Trang bị \`${itemId}\` đã được mặc sẵn và ngươi không còn chiếc nào khác chưa mặc.` };
    }
    return this._thucHienTrangBi(tuSi, inv, itemId, loadEquipped);
  }

  /** Logic thực thi trang bị — dùng chung cho cả 2 đường trên */
  async _thucHienTrangBi(tuSi, inv, itemId, loadEquipped) {
    const itemDetail = await Item.findByPk(inv.itemId ?? itemId);
    const allowedEquipTypes = ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'];
    if (!itemDetail || !allowedEquipTypes.includes(itemDetail.loai)) {
      return { ok: false, msg: `Vật phẩm này không phải Trang bị có thể mặc.` };
    }

    if (tuSi.capDo < (itemDetail.yeuCauCanhGioi || 1)) {
      const { layThongTinCanhGioi } = await import('../config.js');
      const cgReq = layThongTinCanhGioi(itemDetail.yeuCauCanhGioi || 1);
      return {
        ok: false,
        msg: `Cảnh giới bất túc! Trang bị này yêu cầu tu vi tối thiểu: **${cgReq.realmName} - ${cgReq.stageName}** (Hiện tại: **${tuSi.canhGioi}**).`
      };
    }

    // Kiểm tra giới hạn ô trang bị và tự tháo cũ nếu cần
    const currentEquipped = await Inventory.findAll({
      where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true }
    });

    const equippedItems = [];
    for (const eq of currentEquipped) {
      const eqItem = await Item.findByPk(eq.itemId);
      if (eqItem) equippedItems.push({ eq, detail: eqItem });
    }

    const sameTypeEquipped = equippedItems.filter(x => x.detail.loai === itemDetail.loai);
    let extraMsg = '';

    if (['Vũ khí', 'Giáp', 'Ngọc Bội'].includes(itemDetail.loai)) {
      if (sameTypeEquipped.length > 0) {
        const oldEq = sameTypeEquipped[0];
        oldEq.eq.trangBi = false;
        await oldEq.eq.save();
        extraMsg = `\n*(Đã tháo trang bị cũ: **${oldEq.detail.ten}** #${oldEq.eq.id})*`;
      }
    } else if (itemDetail.loai === 'Cổ Bảo Chủ Động') {
      if (sameTypeEquipped.length >= 3) {
        return { ok: false, msg: `Giới hạn tối đa 3 Cổ Bảo Chủ Động! Vui lòng dùng \`/balo thao\` bớt trước.` };
      }
    } else if (itemDetail.loai === 'Pháp Bảo') {
      if (sameTypeEquipped.length >= 6) {
        return { ok: false, msg: `Giới hạn tối đa 6 Pháp Bảo! Vui lòng dùng \`/balo thao\` bớt trước.` };
      }
    }

    inv.trangBi = true;
    await inv.save();

    return {
      ok:  true,
      msg: `Đạo hữu **${tuSi.ten}** đã trang bị **${itemDetail.ten}** (Mã vật phẩm: #${inv.id}) thành công!${extraMsg}`
    };
  }
}

const controller = new BoDieuKhienVatPham();
export const danhSachLenhVatPham = [controller.lenhBalo];
export { controller as boDieuKhienVatPham };
