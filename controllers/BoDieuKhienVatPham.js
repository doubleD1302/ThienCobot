import { SlashCommandBuilder } from 'discord.js';
import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';
import { Inventory } from '../models/Inventory.js';
import { Item } from '../models/Item.js';

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

      // Load all equipped items for correct stat calculations
      const loadEquipped = async () => {
        const equippedInv = await Inventory.findAll({
          where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true }
        });
        const items = [];
        for (const eq of equippedInv) {
          const detail = await Item.findByPk(eq.itemId);
          if (detail) items.push(detail);
        }
        return items;
      };

      if (subcommand === 'xem') {
        const invList = await Inventory.findAll({
          where: { idNguoiDung: tuSi.idNguoiDung }
        });

        const itemsList = [];
        for (const inv of invList) {
          const itemDetail = await Item.findByPk(inv.itemId);
          if (itemDetail) {
            itemsList.push({
              invId: inv.id,
              item: itemDetail,
              soLuong: inv.soLuong,
              trangBi: inv.trangBi,
              nangCapSao: inv.nangCapSao
            });
          }
        }

        const embed = BoTaoEmbed.balo(tuSi, itemsList);
        return await interaction.editReply({ embeds: [embed] });
      }

      const itemId = interaction.options.getString('item_id');

      if (subcommand === 'dung') {
        const inv = await Inventory.findOne({
          where: { idNguoiDung: tuSi.idNguoiDung, itemId: itemId }
        });

        if (!inv || inv.soLuong <= 0) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Không tìm thấy đan dược nào có mã ID \`${itemId}\` trong balo.`)]
          });
        }

        const itemDetail = await Item.findByPk(itemId);
        if (!itemDetail || itemDetail.loai !== 'Đan dược') {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Vật phẩm \`${itemId}\` không phải là đan dược có thể sử dụng.`)]
          });
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

        // Tiêu hao vật phẩm
        inv.soLuong -= 1;
        if (inv.soLuong <= 0) {
          await inv.destroy();
        } else {
          await inv.save();
        }
        await tuSi.save();

        return await interaction.editReply({
          embeds: [
            BoTaoEmbed.thanhCong(
              "💊 Sử Dụng Linh Đan Thành Công",
              `Đạo hữu **${tuSi.ten}** đã dùng **${itemDetail.ten}**:\n${recoveryMsg}`
            )
          ]
        });
      }

      if (subcommand === 'trangbi') {
        const inv = await Inventory.findOne({
          where: { idNguoiDung: tuSi.idNguoiDung, itemId: itemId }
        });

        if (!inv) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Ngươi không sở hữu trang bị nào có mã ID \`${itemId}\`.`)]
          });
        }

        if (inv.trangBi) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Trang bị \`${itemId}\` đã được mặc sẵn trên người.`)]
          });
        }

        const itemDetail = await Item.findByPk(itemId);
        if (!itemDetail || (itemDetail.loai !== 'Vũ khí' && itemDetail.loai !== 'Giáp')) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Mã \`${itemId}\` không phải là Trang bị (Vũ khí/Giáp).`)]
          });
        }

        // Tự động tháo trang bị cùng loại đang mặc
        const currentEquipped = await Inventory.findAll({
          where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true }
        });

        let unequippedName = '';
        for (const eq of currentEquipped) {
          const eqItem = await Item.findByPk(eq.itemId);
          if (eqItem && eqItem.loai === itemDetail.loai) {
            eq.trangBi = false;
            await eq.save();
            unequippedName = eqItem.ten;
            break;
          }
        }

        // Mặc trang bị mới
        inv.trangBi = true;
        await inv.save();

        const extraMsg = unequippedName ? `(Đã tháo trang bị cũ: **${unequippedName}**)` : '';
        return await interaction.editReply({
          embeds: [
            BoTaoEmbed.thanhCong(
              "🛡️ Khoác Lên Trang Bị",
              `Đạo hữu **${tuSi.ten}** đã trang bị **${itemDetail.ten}** thành công! ${extraMsg}`
            )
          ]
        });
      }

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
}

const controller = new BoDieuKhienVatPham();
export const danhSachLenhVatPham = [controller.lenhBalo];
export { controller as boDieuKhienVatPham };
