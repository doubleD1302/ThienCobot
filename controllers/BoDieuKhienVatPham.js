import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';
import { Inventory } from '../models/Inventory.js';
import { Item } from '../models/Item.js';

// Loại item nào có thể trang bị
const EQUIP_TYPES  = ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'];
// Loại item nào có thể dùng (tiêu hao)
const USABLE_TYPES = ['Đan dược'];

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
        const invList = await Inventory.findAll({
          where: { idNguoiDung: tuSi.idNguoiDung }
        });

        const itemsList = [];
        for (const inv of invList) {
          const itemDetail = await Item.findByPk(inv.itemId);
          if (itemDetail) {
            itemsList.push({
              invId:         inv.id,
              item:          itemDetail,
              soLuong:       inv.soLuong,
              trangBi:       inv.trangBi,
              nangCapSao:    inv.nangCapSao,
              dongChiSoJson: inv.dongChiSoJson
            });
          }
        }

        const sheets = BoTaoEmbed.baloSheets(tuSi, itemsList);

        // Trạng thái UI
        let sheetIdx    = 0;   // tab sheet hiện tại
        let pageIdx     = 0;   // trang trong sheet
        let showToolbar = false; // đang hiển thị toolbar hay không
        let selectedItemId = null; // item đang được chọn trong toolbar

        // ── Helpers xây component rows ────────────────────────────────

        /**
         * Row 1: Select menu chọn sheet (tab)
         */
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

        /**
         * Row 2: Nút ◀ Trang trước | Trang sau ▶ | 🛠️ Công Cụ | ❌ Đóng
         */
        const buildControlRow = (si, pi, tbShowing, disabled = false) => {
          const totalPages = sheets[si].pages.length;
          return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('balo_prev')
              .setLabel('◀')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(disabled || pi === 0),
            new ButtonBuilder()
              .setCustomId('balo_next')
              .setLabel('▶')
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
         * Row 3 (tuỳ chọn): Select menu chọn item trong toolbar
         * Chỉ hiện ra khi showToolbar === true
         * Lọc: item có thể dùng hoặc trang bị (chưa mặc, hoặc đan dược số lượng > 0)
         */
        const buildToolbarSelectRow = () => {
          const usableItems = itemsList.filter(obj =>
            USABLE_TYPES.includes(obj.item.loai) && obj.soLuong > 0
          );
          const equipItems = itemsList.filter(obj =>
            EQUIP_TYPES.includes(obj.item.loai) && !obj.trangBi
          );
          const khaDung = [...usableItems, ...equipItems];

          if (khaDung.length === 0) {
            // Vẫn cần trả về row nhưng hiển thị disabled
            return new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('balo_item_select')
                .setPlaceholder('⚠️ Không có item khả dụng')
                .setDisabled(true)
                .addOptions([{ label: '(Trống)', value: '__empty__' }])
            );
          }

          // Giới hạn 25 options (Discord max)
          const limited = khaDung.slice(0, 25);
          return new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('balo_item_select')
              .setPlaceholder('🔍 Chọn item muốn dùng/trang bị...')
              .addOptions(limited.map(obj => {
                const isEquipType = EQUIP_TYPES.includes(obj.item.loai);
                return {
                  label:       obj.item.ten.slice(0, 100),
                  value:       `${obj.invId}::${obj.item.id}::${obj.item.loai}`,
                  emoji:       isEquipType ? '🛡️' : '💊',
                  description: `${obj.item.loai} | x${obj.soLuong} | ID: ${obj.item.id}`.slice(0, 100)
                };
              }))
          );
        };

        /**
         * Row 4 (tuỳ chọn): Nút Dùng / Trang Bị / Tháo
         * Chỉ hiện khi selectedItemId không null
         */
        const buildActionRow = (selValue) => {
          if (!selValue) return null;
          const [, , loai] = selValue.split('::');
          const isEquip = EQUIP_TYPES.includes(loai);
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

        /**
         * Gom tất cả rows lại — Discord tối đa 5 ActionRow
         */
        const buildAllComponents = (si, pi, tbShowing, selValue, disabled = false) => {
          const rows = [];
          rows.push(buildSheetSelectRow(si, disabled));        // row 1: sheet tabs
          rows.push(buildControlRow(si, pi, tbShowing, disabled)); // row 2: nav + toolbar btn + close
          if (tbShowing && !disabled) {
            rows.push(buildToolbarSelectRow());                // row 3: item select
            const actionRow = buildActionRow(selValue);
            if (actionRow) rows.push(actionRow);              // row 4: dùng/trang bị
          }
          return rows;
        };

        const currentEmbed = () => sheets[sheetIdx].pages[pageIdx];

        // ── Gửi reply ban đầu ─────────────────────────────────────────
        const msg = await interaction.editReply({
          embeds:     [currentEmbed()],
          components: buildAllComponents(sheetIdx, pageIdx, showToolbar, selectedItemId)
        });

        // ── Collector 3 phút, chỉ người gọi ──────────────────────────
        const collector = msg.createMessageComponentCollector({
          filter: i => i.user.id === interaction.user.id,
          time:   180_000
        });

        collector.on('collect', async i => {
          await i.deferUpdate();

          // ── Điều hướng sheet ──────────────────────────────────────
          if (i.customId === 'balo_sheet_select') {
            const val = i.values[0];
            sheetIdx = sheets.findIndex(s => s.value === val);
            pageIdx  = 0;
            selectedItemId = null;

          } else if (i.customId === 'balo_prev') {
            pageIdx = Math.max(0, pageIdx - 1);

          } else if (i.customId === 'balo_next') {
            pageIdx = Math.min(sheets[sheetIdx].pages.length - 1, pageIdx + 1);

          // ── Toolbar toggle ─────────────────────────────────────────
          } else if (i.customId === 'balo_toolbar_toggle') {
            showToolbar    = !showToolbar;
            selectedItemId = null;

          // ── Chọn item trong toolbar ───────────────────────────────
          } else if (i.customId === 'balo_item_select') {
            selectedItemId = i.values[0];

          // ── Bỏ chọn item ─────────────────────────────────────────
          } else if (i.customId === 'balo_action_cancel') {
            selectedItemId = null;

          // ── Đóng balo ────────────────────────────────────────────
          } else if (i.customId === 'balo_close') {
            collector.stop('closed');
            return;

          // ── Trang bị item ─────────────────────────────────────────
          } else if (i.customId === 'balo_action_equip' && selectedItemId) {
            const [invIdStr, itemId] = selectedItemId.split('::');
            const result = await this._xuLyTrangBi(tuSi, itemId, loadEquipped);
            if (result.ok) {
              // Reload inventory sau hành động
              const freshInvList = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung } });
              itemsList.length = 0;
              for (const inv of freshInvList) {
                const d = await Item.findByPk(inv.itemId);
                if (d) itemsList.push({ invId: inv.id, item: d, soLuong: inv.soLuong, trangBi: inv.trangBi, nangCapSao: inv.nangCapSao, dongChiSoJson: inv.dongChiSoJson });
              }
              sheets.length = 0;
              sheets.push(...BoTaoEmbed.baloSheets(tuSi, itemsList));
              sheetIdx = Math.min(sheetIdx, sheets.length - 1);
              pageIdx  = 0;
              selectedItemId = null;
              await i.editReply({
                embeds:     [BoTaoEmbed.thanhCong('⚔️ Trang Bị Thành Công', result.msg), currentEmbed()],
                components: buildAllComponents(sheetIdx, pageIdx, showToolbar, selectedItemId)
              });
              return;
            } else {
              await i.editReply({
                embeds:     [BoTaoEmbed.loi(result.msg), currentEmbed()],
                components: buildAllComponents(sheetIdx, pageIdx, showToolbar, selectedItemId)
              });
              return;
            }

          // ── Sử dụng item ──────────────────────────────────────────
          } else if (i.customId === 'balo_action_use' && selectedItemId) {
            const [, itemId] = selectedItemId.split('::');
            const result = await this._xuLyDungItem(tuSi, itemId, loadEquipped);
            if (result.ok) {
              const freshInvList = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung } });
              itemsList.length = 0;
              for (const inv of freshInvList) {
                const d = await Item.findByPk(inv.itemId);
                if (d) itemsList.push({ invId: inv.id, item: d, soLuong: inv.soLuong, trangBi: inv.trangBi, nangCapSao: inv.nangCapSao, dongChiSoJson: inv.dongChiSoJson });
              }
              sheets.length = 0;
              sheets.push(...BoTaoEmbed.baloSheets(tuSi, itemsList));
              sheetIdx = Math.min(sheetIdx, sheets.length - 1);
              pageIdx  = 0;
              selectedItemId = null;
              await i.editReply({
                embeds:     [BoTaoEmbed.thanhCong('💊 Sử Dụng Thành Công', result.msg), currentEmbed()],
                components: buildAllComponents(sheetIdx, pageIdx, showToolbar, selectedItemId)
              });
              return;
            } else {
              await i.editReply({
                embeds:     [BoTaoEmbed.loi(result.msg), currentEmbed()],
                components: buildAllComponents(sheetIdx, pageIdx, showToolbar, selectedItemId)
              });
              return;
            }
          }

          // ── Cập nhật UI thông thường ──────────────────────────────
          await i.editReply({
            embeds:     [currentEmbed()],
            components: buildAllComponents(sheetIdx, pageIdx, showToolbar, selectedItemId)
          });
        });

        collector.on('end', async (_, reason) => {
          try {
            const isClosed = reason === 'closed';
            const disabledComponents = buildAllComponents(sheetIdx, pageIdx, false, null, true);
            const footerEmbed = sheets[sheetIdx].pages[pageIdx];
            if (isClosed) {
              await interaction.editReply({
                embeds: [
                  new (await import('discord.js')).EmbedBuilder()
                    .setTitle('🎒 Túi Trữ Vật — Đã Đóng')
                    .setDescription('Ngươi đã cất túi đồ vào nơi an toàn.')
                    .setColor(0x7f8c8d)
                    .setTimestamp()
                    .setFooter({ text: 'Dùng /balo xem để mở lại.' })
                ],
                components: []
              });
            } else {
              await interaction.editReply({ components: disabledComponents });
            }
          } catch (_) { /* message đã bị xoá */ }
        });

        return;
      }

      // ═══════════════════════════════════════════════════════════════
      //  SUBCOMMAND: dung (giữ lại gọi trực tiếp qua slash command)
      // ═══════════════════════════════════════════════════════════════
      const itemId = interaction.options.getString('item_id');

      if (subcommand === 'dung') {
        const result = await this._xuLyDungItem(tuSi, itemId, loadEquipped);
        return await interaction.editReply({
          embeds: [result.ok
            ? BoTaoEmbed.thanhCong('💊 Sử Dụng Linh Đan Thành Công', result.msg)
            : BoTaoEmbed.loi(result.msg)]
        });
      }

      // ═══════════════════════════════════════════════════════════════
      //  SUBCOMMAND: trangbi
      // ═══════════════════════════════════════════════════════════════
      if (subcommand === 'trangbi') {
        const result = await this._xuLyTrangBi(tuSi, itemId, loadEquipped);
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
  //  Private helpers — dùng chung cho cả slash command và toolbar action
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Xử lý logic sử dụng đan dược.
   * @returns {{ ok: boolean, msg: string }}
   */
  async _xuLyDungItem(tuSi, itemId, loadEquipped) {
    const inv = await Inventory.findOne({
      where: { idNguoiDung: tuSi.idNguoiDung, itemId: itemId }
    });

    if (!inv || inv.soLuong <= 0) {
      return { ok: false, msg: `Không tìm thấy đan dược nào có mã ID \`${itemId}\` trong balo.` };
    }

    const itemDetail = await Item.findByPk(itemId);
    if (!itemDetail || itemDetail.loai !== 'Đan dược') {
      return { ok: false, msg: `Vật phẩm \`${itemId}\` không phải là đan dược có thể sử dụng.` };
    }

    if (tuSi.capDo < (itemDetail.yeuCauCanhGioi || 1)) {
      const { layThongTinCanhGioi } = await import('../config.js');
      const cgReq = layThongTinCanhGioi(itemDetail.yeuCauCanhGioi || 1);
      return { ok: false, msg: `Cảnh giới bất túc! Vật phẩm này yêu cầu tu vi tối thiểu: **${cgReq.realmName} - ${cgReq.stageName}** (Hiện tại: **${tuSi.canhGioi}**).` };
    }

    const stats = tuSi.layChiSo(await loadEquipped());
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
   * Xử lý logic trang bị một item.
   * @returns {{ ok: boolean, msg: string }}
   */
  async _xuLyTrangBi(tuSi, itemId, loadEquipped) {
    const hasIt = await Inventory.findOne({
      where: { idNguoiDung: tuSi.idNguoiDung, itemId: itemId }
    });

    if (!hasIt) {
      return { ok: false, msg: `Ngươi không sở hữu trang bị nào có mã ID \`${itemId}\` trong balo.` };
    }

    let inv = await Inventory.findOne({
      where: { idNguoiDung: tuSi.idNguoiDung, itemId: itemId, trangBi: false }
    });

    if (!inv) {
      return { ok: false, msg: `Trang bị \`${itemId}\` đã được mặc sẵn và ngươi không còn chiếc nào khác chưa mặc.` };
    }

    const itemDetail = await Item.findByPk(itemId);
    const allowedEquipTypes = ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'];
    if (!itemDetail || !allowedEquipTypes.includes(itemDetail.loai)) {
      return { ok: false, msg: `Mã \`${itemId}\` không phải là Trang bị có thể mặc.` };
    }

    if (tuSi.capDo < (itemDetail.yeuCauCanhGioi || 1)) {
      const { layThongTinCanhGioi } = await import('../config.js');
      const cgReq = layThongTinCanhGioi(itemDetail.yeuCauCanhGioi || 1);
      return { ok: false, msg: `Cảnh giới bất túc! Trang bị này yêu cầu tu vi tối thiểu: **${cgReq.realmName} - ${cgReq.stageName}** (Hiện tại: **${tuSi.canhGioi}**).` };
    }

    // Tự động kiểm tra và tháo trang bị cùng loại đang mặc
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
        extraMsg = `\n*(Đã tháo trang bị cũ: **${oldEq.detail.ten}**)*`;
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
      msg: `Đạo hữu **${tuSi.ten}** đã trang bị **${itemDetail.ten}** thành công!${extraMsg}`
    };
  }
}

const controller = new BoDieuKhienVatPham();
export const danhSachLenhVatPham = [controller.lenhBalo];
export { controller as boDieuKhienVatPham };
