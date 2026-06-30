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
        for (const eq of equippedInv) {
          eq.item = await Item.findByPk(eq.itemId);
        }
        return equippedInv.filter(eq => eq.item !== null);
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
              nangCapSao: inv.nangCapSao,
              dongChiSoJson: inv.dongChiSoJson
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

        if (tuSi.capDo < (itemDetail.yeuCauCanhGioi || 1)) {
          const { layThongTinCanhGioi } = await import('../config.js');
          const cgReq = layThongTinCanhGioi(itemDetail.yeuCauCanhGioi || 1);
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Cảnh giới bất túc! Vật phẩm này yêu cầu tu vi tối thiểu: **${cgReq.realmName} - ${cgReq.stageName}** (Hiện tại của ngươi: **${tuSi.canhGioi}**).`)]
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
        const hasIt = await Inventory.findOne({
          where: { idNguoiDung: tuSi.idNguoiDung, itemId: itemId }
        });

        if (!hasIt) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Ngươi không sở hữu trang bị nào có mã ID \`${itemId}\` trong balo.`)]
          });
        }

        let inv = await Inventory.findOne({
          where: { idNguoiDung: tuSi.idNguoiDung, itemId: itemId, trangBi: false }
        });

        if (!inv) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Trang bị \`${itemId}\` đã được mặc sẵn trên người và ngươi không còn chiếc nào khác chưa mặc.`)]
          });
        }

        const itemDetail = await Item.findByPk(itemId);
        const allowedEquipTypes = ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'];
        if (!itemDetail || !allowedEquipTypes.includes(itemDetail.loai)) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Mã \`${itemId}\` không phải là Trang bị có thể mặc.`)]
          });
        }

        if (tuSi.capDo < (itemDetail.yeuCauCanhGioi || 1)) {
          const { layThongTinCanhGioi } = await import('../config.js');
          const cgReq = layThongTinCanhGioi(itemDetail.yeuCauCanhGioi || 1);
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Cảnh giới bất túc! Trang bị này yêu cầu tu vi tối thiểu: **${cgReq.realmName} - ${cgReq.stageName}** (Hiện tại của ngươi: **${tuSi.canhGioi}**).`)]
          });
        }

        // Tự động kiểm tra và tháo trang bị cùng loại đang mặc
        const currentEquipped = await Inventory.findAll({
          where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true }
        });

        const equippedItems = [];
        for (const eq of currentEquipped) {
          const eqItem = await Item.findByPk(eq.itemId);
          if (eqItem) {
            equippedItems.push({ eq, detail: eqItem });
          }
        }

        const sameTypeEquipped = equippedItems.filter(x => x.detail.loai === itemDetail.loai);
        let extraMsg = '';

        if (['Vũ khí', 'Giáp', 'Ngọc Bội'].includes(itemDetail.loai)) {
          if (sameTypeEquipped.length > 0) {
            const oldEq = sameTypeEquipped[0];
            oldEq.eq.trangBi = false;
            await oldEq.eq.save();
            extraMsg = `(Đã tháo trang bị cũ: **${oldEq.detail.ten}**)`;
          }
        } else if (itemDetail.loai === 'Cổ Bảo Chủ Động') {
          if (sameTypeEquipped.length >= 3) {
            return await interaction.editReply({
              embeds: [BoTaoEmbed.loi(`Giới hạn tối đa 3 Cổ Bảo Chủ Động! Đạo hữu đã trang bị đủ 3 ô, vui lòng dùng \`/balo thao\` bớt trước.`)]
            });
          }
        } else if (itemDetail.loai === 'Pháp Bảo') {
          if (sameTypeEquipped.length >= 6) {
            return await interaction.editReply({
              embeds: [BoTaoEmbed.loi(`Giới hạn tối đa 6 Pháp Bảo! Đạo hữu đã trang bị đủ 6 ô, vui lòng dùng \`/balo thao\` bớt trước.`)]
            });
          }
        }

        // Mặc trang bị mới
        inv.trangBi = true;
        await inv.save();

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
