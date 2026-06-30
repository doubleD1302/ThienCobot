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
      .setDescription('Xem hồ sơ nhân vật tu sĩ của ngươi'),
    execute: async (interaction) => {
      await interaction.deferReply();
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
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

      const embed = BoTaoEmbed.hoSo(tuSi, interaction.user, stats, daoNien, tocDoTuLuyen, reqExp, equippedItems);
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
}

const controller = new BoDieuKhienTuSi();
export const danhSachLenhTuSi = [
  controller.lenhNhapThe,
  controller.lenhHoSo,
  controller.lenhCanCo
];
export { controller as boDieuKhienTuSi };
