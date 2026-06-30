import { SlashCommandBuilder } from 'discord.js';
import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';
import { PlayerSkill } from '../models/PlayerSkill.js';
import { Skill } from '../models/Skill.js';

class BoDieuKhienKyNang extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhKyNang = {
    data: new SlashCommandBuilder()
      .setName('skill')
      .setDescription('Quản lý chiêu thức phép thuật và luyện tập công pháp bí truyền')
      .addSubcommand(sub =>
        sub.setName('xem')
          .setDescription('Xem danh sách kỹ năng hiện có và các chiêu thức có thể học')
      )
      .addSubcommand(sub =>
        sub.setName('hoc')
          .setDescription('Lĩnh hội chiêu thức mới khi đạt đủ Cảnh giới')
          .addStringOption(opt =>
            opt.setName('skill_id')
              .setDescription('Mã kỹ năng muốn học (VD: thanh_phong_quyen)')
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
      const playerClass = tuSi.huongTu || 'Phap Tu'; // 'The Tu' hoặc 'Phap Tu'

      if (subcommand === 'xem') {
        // 1. Lấy kỹ năng người chơi đã học
        const learned = await PlayerSkill.findAll({
          where: { idNguoiDung: tuSi.idNguoiDung }
        });

        const playerSkillsList = [];
        const learnedIds = new Set();
        for (const psk of learned) {
          const detail = await Skill.findByPk(psk.skillId);
          if (detail) {
            playerSkillsList.push({
              id: detail.id,
              ten: detail.ten,
              loai: detail.loai,
              satThuong: detail.satThuong,
              cooldown: detail.cooldown,
              capDo: psk.capDo,
              moTa: detail.moTa
            });
            learnedIds.add(detail.id);
          }
        }

        // 2. Lấy kỹ năng có thể học của phái tương ứng
        // Thể Tu học kỹ năng 'Vật lý', Pháp Tu học kỹ năng 'Phép thuật'
        const expectedType = playerClass === 'The Tu' ? 'Vật lý' : 'Phép thuật';
        const allSkills = await Skill.findAll({
          where: { loai: expectedType }
        });

        const availableSkills = [];
        for (const sk of allSkills) {
          if (!learnedIds.has(sk.id)) {
            availableSkills.push(sk);
          }
        }

        const embed = BoTaoEmbed.kyNang(tuSi, playerSkillsList, availableSkills);
        return await interaction.editReply({ embeds: [embed] });
      }

      if (subcommand === 'hoc') {
        const skillId = interaction.options.getString('skill_id');
        const skillDetail = await Skill.findByPk(skillId);

        if (!skillDetail) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Không tìm thấy bí tịch chiêu thức nào có mã ID \`${skillId}\`.`)]
          });
        }

        // Kiểm tra loại kỹ năng tương thích với phái
        const expectedType = playerClass === 'The Tu' ? 'Vật lý' : 'Phép thuật';
        if (skillDetail.loai !== expectedType && skillDetail.congPhapId === null) {
          // Lỗi nếu là kỹ năng phái khác (chỉ cho học tự do nếu đó là công pháp bí truyền rớt ra từ quái/boss - tạm thời check congPhapId)
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Chiêu thức \`${skillDetail.ten}\` thuộc loại **${skillDetail.loai}**, không phù hợp với hướng tu **${tuSi.huongTu}** của đạo hữu.`)]
          });
        }

        // Kiểm tra xem đã học chưa
        const existing = await PlayerSkill.findOne({
          where: { idNguoiDung: tuSi.idNguoiDung, skillId: skillId }
        });
        if (existing) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Đạo hữu đã lĩnh hội chiêu thức **${skillDetail.ten}** rồi.`)]
          });
        }

        // Kiểm tra cảnh giới (level) yêu cầu
        if (tuSi.capDo < skillDetail.yeuCauCanhGioi) {
          const { layThongTinCanhGioi } = await import('../config.js');
          const { stageName } = layThongTinCanhGioi(skillDetail.yeuCauCanhGioi);
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Căn cơ bất túc! Để lĩnh hội chiêu thức này, đạo hữu cần đạt cảnh giới tối thiểu là **${stageName}** (Cấp ${skillDetail.yeuCauCanhGioi}).`)]
          });
        }

        // Học kỹ năng
        await PlayerSkill.create({
          idNguoiDung: tuSi.idNguoiDung,
          skillId: skillId,
          capDo: 1,
          kinhNghiemSkill: 0
        });

        return await interaction.editReply({
          embeds: [
            BoTaoEmbed.thanhCong(
              "🥋 Lĩnh Hội Chiêu Thức Mới",
              `Chúc mừng đạo hữu **${tuSi.ten}** đã ngộ ra đạo lý sâu xa, thành công học được chiêu thức **${skillDetail.ten}**!`
            )
          ]
        });
      }
    }
  };
}

const controller = new BoDieuKhienKyNang();
export const danhSachLenhKyNang = [controller.lenhKyNang];
export { controller as boDieuKhienKyNang };
