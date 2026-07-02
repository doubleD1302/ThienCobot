import { SlashCommandBuilder } from 'discord.js';
import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';
import { GiaoDienTaoNhanVat } from '../views/GiaoDienTaoNhanVat.js';
import * as config from '../config.js';

class BoDieuKhienTuSi extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  // Lệnh /start: Tạo nhân vật mới, chọn giới tính, hướng đi và roll Linh Căn
  lenhNhapThe = {
    data: new SlashCommandBuilder()
      .setName('start')
      .setDescription('Tạo nhân vật mới, chọn giới tính, hướng đi và roll Linh Căn')
      .addStringOption(option =>
        option.setName('ten')
          .setDescription('Tên tu sĩ của ngươi (tối đa 20 ký tự)')
          .setRequired(true)
      ),
    execute: async (interaction) => {
      const ten = interaction.options.getString('ten');

      // 1. Kiểm tra độ dài tên
      if (ten.length > 20) {
        return await interaction.reply({
          embeds: [BoTaoEmbed.loi("Tên tu sĩ quá dài! Vui lòng chọn tên dưới 20 ký tự.")],
          ephemeral: true
        });
      }

      // 2. Kiểm tra tu sĩ đã tồn tại chưa
      const tuSi = await this.layTuSi(interaction.user.id);
      if (tuSi) {
        return await interaction.reply({
          embeds: [BoTaoEmbed.loi("Ngươi đã gia nhập thế giới tu tiên từ trước! Hãy gõ `/nv` để xem thông tin.")],
          ephemeral: true
        });
      }

      // 3. Lấy Đạo Niên hiện tại của Guild
      let daoNien = null;
      if (interaction.guildId) {
        const guildConfig = await this.layHoacTaoCauHinhGuild(interaction.guildId);
        if (guildConfig) {
          daoNien = guildConfig.layDaoNienHienTai();
        }
      }

      // 4. Khởi tạo trình tạo nhân vật trực quan
      const trinhTao = new GiaoDienTaoNhanVat(interaction.user, ten, daoNien);
      const message = await interaction.reply({
        embeds: [trinhTao.getEmbed()],
        components: trinhTao.getComponents(),
        fetchReply: true
      });

      await trinhTao.startCollector(interaction, message);
    }
  };

  // Lệnh /nv: Xem hồ sơ nhân vật tu sĩ
  lenhHoSo = {
    data: new SlashCommandBuilder()
      .setName('nv')
      .setDescription('Xem hồ sơ nhân vật tu sĩ')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('Đạo hữu muốn xem thông tin')
          .setRequired(false)
      ),
    execute: async (interaction) => {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const tuSi = await this.layTuSi(targetUser.id);
      if (!tuSi) {
        const isSelf = targetUser.id === interaction.user.id;
        const msg = isSelf
          ? "Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên."
          : "Đạo hữu này chưa gia nhập hồng trần tu tiên!";
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(msg)]
        });
      }

      // Nhận phần thưởng tu vi nếu đã tu luyện xong
      const { completed, exp, stones } = await this.kiemTraVaNhanTuVi(tuSi);
      if (completed) {
        const embedReward = BoTaoEmbed.thanhCong(
          "🧘 Thiền Định Hoàn Tất",
          `Đạo hữu đã hoàn thành thiền định!\n` +
          `• **Linh lực nhận được**: \`+${exp}\` ✨\n` +
          `• **Linh thạch nhận được**: \`+${stones}\` 💎`
        );
        if (interaction.channel) {
          await interaction.channel.send({ content: `<@${tuSi.idNguoiDung}>`, embeds: [embedReward] }).catch(err => console.error(err));
        }
      }

      const { Inventory } = await import('../models/Inventory.js');
      const { Item } = await import('../models/Item.js');
      const { Pet } = await import('../models/Pet.js');
      const { Abode } = await import('../models/Abode.js');

      const activePet = await Pet.findOne({ where: { userId: tuSi.idNguoiDung, isActive: true } });
      const abode = await Abode.findByPk(tuSi.idNguoiDung);
      const lvDongPhu = abode ? abode.level : 0;

      const equippedInv = await Inventory.findAll({
        where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true }
      });
      const equippedItems = [];
      for (const eq of equippedInv) {
        const detail = await Item.findByPk(eq.itemId);
        if (detail) {
          eq.item = detail;
          equippedItems.push({ eq, detail });
        }
      }

      const stats = tuSi.layChiSo(equippedInv, activePet);
      
      // Khôi phục chỉ số động khi thay đổi căn cơ phạt cực đại
      let updated = false;
      if (tuSi.hp > stats.max_hp) {
        tuSi.hp = stats.max_hp;
        updated = true;
      }
      if (tuSi.mp > stats.max_mp) {
        tuSi.mp = stats.max_mp;
        updated = true;
      }
      if (updated) {
        await tuSi.save();
      }

      let daoNien = null;
      if (interaction.guildId) {
        const guildConfig = await this.layHoacTaoCauHinhGuild(interaction.guildId);
        if (guildConfig) {
          daoNien = guildConfig.layDaoNienHienTai();
        }
      }

      // Lấy tốc độ tu luyện và Linh lực yêu cầu từ CanhGioi
      const { CanhGioi } = await import('../models/CanhGioi.js');
      const cg = await CanhGioi.findByPk(tuSi.capDo);
      const tocDoCoBan = cg ? cg.tocDoCoBan : 100;
      const heSoTuLuyen = tuSi.layHeSoTuLuyen(activePet);
      
      // Nhân thêm tốc độ từ Động phủ
      const tocDoTuLuyen = Math.floor(tocDoCoBan * heSoTuLuyen * (1 + lvDongPhu));
      const reqExp = cg ? cg.linhLucYeuCau : config.layLinhLucYeuCau(tuSi.capDo);

      const embed = BoTaoEmbed.hoSo(tuSi, targetUser, stats, daoNien, tocDoTuLuyen, reqExp, equippedItems);
      await interaction.editReply({ embeds: [embed] });
    }
  };

  // Lệnh /canhu: Xem căn cơ tu luyện
  lenhCanCo = {
    data: new SlashCommandBuilder()
      .setName('canhu')
      .setDescription('Xem căn cơ, linh căn và hệ số tu luyện'),
    execute: async (interaction) => {
      await interaction.deferReply();
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      let daoNien = null;
      if (interaction.guildId) {
        const guildConfig = await this.layHoacTaoCauHinhGuild(interaction.guildId);
        if (guildConfig) {
          daoNien = guildConfig.layDaoNienHienTai();
        }
      }

      const embed = BoTaoEmbed.canCo(tuSi, daoNien);
      await interaction.editReply({ embeds: [embed] });
    }
  };

  // Logic thực thi nhập code
  async _thucHienNhapCode(tuSi, codeInput) {
    const { GiftCode } = await import('../models/GiftCode.js');
    const { PlayerGiftCode } = await import('../models/PlayerGiftCode.js');
    const { Inventory } = await import('../models/Inventory.js');
    const { Item } = await import('../models/Item.js');
    const { sequelize } = await import('../database.js');

    // Tìm kiếm gift code không phân biệt hoa thường
    const giftCode = await GiftCode.findOne({
      where: sequelize.where(
        sequelize.fn('lower', sequelize.col('code')),
        codeInput.toLowerCase()
      )
    });

    if (!giftCode) {
      return { ok: false, msg: "Mã Gift Code không tồn tại hoặc đã hết hạn sử dụng!" };
    }

    // Kiểm tra xem gift code đã hết hạn chưa
    if (giftCode.expiredAt && new Date(giftCode.expiredAt) < new Date()) {
      return { ok: false, msg: "Mã Gift Code này đã hết hạn sử dụng!" };
    }

    // Kiểm tra xem người chơi đã sử dụng mã code này chưa
    const usage = await PlayerGiftCode.findOne({
      where: {
        userId: tuSi.idNguoiDung,
        code: giftCode.code
      }
    });

    if (usage) {
      return { ok: false, msg: "Đạo hữu đã sử dụng mã Gift Code này rồi. Mỗi người chơi chỉ được sử dụng mỗi code 1 lần!" };
    }

    // Trao thưởng
    let rewardDesc = '';
    if (giftCode.linhThach > 0) {
      tuSi.linhThach = (tuSi.linhThach || 0) + giftCode.linhThach;
      rewardDesc += `• **Linh thạch**: \`+${giftCode.linhThach.toLocaleString()}\` 🪙\n`;
    }
    if (giftCode.linhLuc > 0) {
      tuSi.linhLuc = (tuSi.linhLuc || 0) + giftCode.linhLuc;
      rewardDesc += `• **Linh lực**: \`+${giftCode.linhLuc.toLocaleString()}\` ✨\n`;
    }
    if (giftCode.vnd > 0) {
      tuSi.vnd = (tuSi.vnd || 0) + giftCode.vnd;
      rewardDesc += `• **VND**: \`+${giftCode.vnd.toLocaleString()}\` 💸\n`;
    }

    const rewardItems = giftCode.items;
    if (rewardItems && rewardItems.length > 0) {
      rewardDesc += `• **Vật phẩm**: \n`;
      for (const rewardItem of rewardItems) {
        const itemDetail = await Item.findByPk(rewardItem.itemId);
        const itemName = itemDetail ? itemDetail.ten : rewardItem.itemId;
        await Inventory.addVatPham(tuSi.idNguoiDung, rewardItem.itemId, rewardItem.soLuong);
        rewardDesc += `   + **${itemName}** x${rewardItem.soLuong}\n`;
      }
    }

    // Đặc biệt: Code TANTHU tặng thêm 6 Pháp Bảo ngẫu nhiên phù hợp cảnh giới hiện tại
    if (giftCode.code.toUpperCase() === 'TANTHU') {
      const config = await import('../config.js');
      const realmInfo = config.layThongTinCanhGioi(tuSi.capDo);
      const realmObj = config.CANH_GIOI_LIST.find(r => r.name === realmInfo.realmName) || config.CANH_GIOI_LIST[0];
      const minLvl = realmObj.min_level;
      const maxLvl = realmObj.max_level;

      // Tìm các Pháp Bảo có yeuCauCanhGioi nằm trong khoảng cấp độ của cảnh giới hiện tại
      const { Op } = sequelize.Sequelize || sequelize;
      let candidatePBs = await Item.findAll({
        where: {
          loai: 'Pháp Bảo',
          yeuCauCanhGioi: {
            [Op.between]: [minLvl, maxLvl]
          }
        }
      });

      // Nếu cảnh giới hiện tại chưa có Pháp Bảo tương ứng, lấy tất cả Pháp Bảo yêu cầu cấp <= nhân vật
      if (candidatePBs.length === 0) {
        candidatePBs = await Item.findAll({
          where: {
            loai: 'Pháp Bảo',
            yeuCauCanhGioi: {
              [Op.lte]: tuSi.capDo
            }
          }
        });
      }

      if (candidatePBs.length > 0) {
        rewardDesc += `• **Quà Pháp Bảo Tân Thủ (${realmInfo.realmName})**: \n`;
        for (let i = 0; i < 6; i++) {
          const drawn = candidatePBs[Math.floor(Math.random() * candidatePBs.length)];
          await Inventory.addVatPham(tuSi.idNguoiDung, drawn.id, 1);
          rewardDesc += `   + **${drawn.ten}** (${drawn.doHiem})\n`;
        }
      }
    }

    // Lưu trạng thái nhân vật và ghi nhận lịch sử dùng code
    await tuSi.save();
    await PlayerGiftCode.create({
      userId: tuSi.idNguoiDung,
      code: giftCode.code
    });

    return { ok: true, code: giftCode.code, rewardDesc };
  }

  // Lệnh /code: Nhập mã gift code
  lenhNhapCode = {
    data: new SlashCommandBuilder()
      .setName('code')
      .setDescription('Nhập mã Gift Code để nhận quà tặng')
      .addStringOption(option =>
        option.setName('ma')
          .setDescription('Nhập mã Gift Code')
          .setRequired(true)
      ),
    execute: async (interaction) => {
      await interaction.deferReply();
      const codeInput = interaction.options.getString('ma').trim();
      
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      const result = await this._thucHienNhapCode(tuSi, codeInput);
      if (!result.ok) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(result.msg)]
        });
      }

      const embed = BoTaoEmbed.thanhCong(
        "🎁 Nhập Mã Gift Code Thành Công",
        `Đạo hữu **${tuSi.ten}** đã kích hoạt thành công mã quà tặng \`${result.code}\`!\n\n` +
        `**Phần quà nhận được:**\n${result.rewardDesc || '• Không có phần quà nào.'}`
      );

      await interaction.editReply({ embeds: [embed] });
    }
  };
}

const controller = new BoDieuKhienTuSi();
export const danhSachLenhTuSi = [
  controller.lenhNhapThe,
  controller.lenhHoSo,
  controller.lenhCanCo,
  controller.lenhNhapCode
];
export { controller as boDieuKhienTuSi };
