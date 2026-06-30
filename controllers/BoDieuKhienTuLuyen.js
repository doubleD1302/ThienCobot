import { SlashCommandBuilder } from 'discord.js';
import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';
import { ThoiGianCho } from '../models/ThoiGianCho.js';
import * as config from '../config.js';

class BoDieuKhienTuLuyen extends BoDieuKhienGoc {
  constructor() {
    super();
  }


  // Lệnh /tuvi: Xem chi tiết tu vi và tiến độ đột phá
  lenhXemTuVi = {
    data: new SlashCommandBuilder()
      .setName('tuvi')
      .setDescription('Xem chi tiết tu vi hiện tại và tiến độ đột phá'),
    execute: async (interaction) => {
      await interaction.deferReply();
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      // 1. Nhận phần thưởng tu vi tự động
      const { completed, exp, stones } = await this.kiemTraVaNhanTuVi(tuSi);
      if (completed) {
        const embedReward = BoTaoEmbed.thanhCong(
          "🌱 Tự Động Tu Luyện",
          `Tu vi của đạo hữu đã tự động tích lũy thêm!\n` +
          `• **Linh lực nhận được**: \`+${exp}\` ✨\n` +
          `• **Linh thạch nhận được**: \`+${stones}\` 💎`
        );
        if (interaction.channel) {
          await interaction.channel.send({ content: `<@${tuSi.idNguoiDung}>`, embeds: [embedReward] }).catch(err => console.error('Failed to send reward message:', err));
        }
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
      const reqExp = cg ? cg.linhLucYeuCau : config.layLinhLucYeuCau(tuSi.capDo);
      const tocDoCoBan = cg ? cg.tocDoCoBan : 100;
      const heSoTuLuyen = tuSi.layHeSoTuLuyen();
      const tocDoTuLuyen = Math.floor(tocDoCoBan * heSoTuLuyen);

      const embed = BoTaoEmbed.tuVi(tuSi, null, daoNien, reqExp, tocDoTuLuyen);
      await interaction.editReply({ embeds: [embed] });
    }
  };

  // Lệnh /dotpha: Đột phá lên tiểu tầng hoặc đại cảnh giới mới
  lenhDotPha = {
    data: new SlashCommandBuilder()
      .setName('dotpha')
      .setDescription('Thử đột phá lên tầng/cảnh giới tiếp theo'),
    execute: async (interaction) => {
      await interaction.deferReply();
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      // Kiểm tra khóa vết thương đột phá
      const btLock = await this.kiemTraThoiGianCho(tuSi.idNguoiDung, 'breakthrough_lock');
      if (btLock) {
        const hetHanTime = new Date(btLock.hetHan).getTime();
        const secondsLeft = Math.max(0, Math.floor((hetHanTime - Date.now()) / 1000));
        const minutes = Math.floor(secondsLeft / 60);
        const seconds = secondsLeft % 60;
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(
            `Căn cơ chưa hồi phục sau đột phá thất bại! Vui lòng tĩnh dưỡng thêm \`${minutes}m ${seconds}s\`.`
          )]
        });
      }

      // Kiểm tra cấp độ giới hạn tối đa
      if (tuSi.capDo >= 31) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Cảnh giới đã đạt đến đỉnh phong Tiên Nhân Chân Tiên, không thể đột phá thêm!")]
        });
      }

      // Kiểm tra điều kiện linh lực
      const { CanhGioi } = await import('../models/CanhGioi.js');
      const cg = await CanhGioi.findByPk(tuSi.capDo);
      const reqExp = cg ? cg.linhLucYeuCau : config.layLinhLucYeuCau(tuSi.capDo);
      if (tuSi.linhLuc < reqExp) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(
            `Linh lực bất túc! Cần \`${reqExp}\` Linh lực (Hiện có: \`${tuSi.linhLuc}\`). Hãy tiếp tục tu luyện.`
          )]
        });
      }

      // Kiểm tra linh thạch yêu cầu đối với đột phá Đại Cảnh Giới
      const currentRealmName = config.layThongTinCanhGioi(tuSi.capDo).realmName;
      const nextRealmName = config.layThongTinCanhGioi(tuSi.capDo + 1).realmName;

      const isMajor = currentRealmName !== nextRealmName;
      let stoneCost = 0;

      if (isMajor) {
        stoneCost = tuSi.capDo * 100;
        if (tuSi.linhThach < stoneCost) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(
              `Đột phá Cảnh giới lớn yêu cầu linh thạch đột phá đan trận!\n` +
              `• **Yêu cầu**: \`${stoneCost}\` Linh thạch 💎\n` +
              `• **Hiện có**: \`${tuSi.linhThach}\` Linh thạch 💎`
            )]
          });
        }
      }

      // Thực thi vòng quay đột phá
      const chance = config.layTiLeDotPha(tuSi.capDo);
      const roll = Math.random();

      if (roll <= chance) {
        // ĐỘT PHÁ THÀNH CÔNG
        tuSi.capDo += 1;
        tuSi.linhLuc -= reqExp;
        if (tuSi.linhLuc < 0) {
          tuSi.linhLuc = 0;
        }

        if (isMajor) {
          tuSi.linhThach -= stoneCost;
        }

        tuSi.dongBoCanhGioi();
        const { realmName: newRealmName, stageName: newStage } = config.layThongTinCanhGioi(tuSi.capDo);

        // Hồi phục toàn mãn trạng thái
        const stats = tuSi.layChiSo();
        tuSi.hp = stats.max_hp;
        tuSi.mp = stats.max_mp;

        await tuSi.save();

        try {
          const { ThienDaoLuc } = await import('../models/ThienDaoLuc.js');
          const { TuSi: ModelTuSi } = await import('../models/TuSi.js');
          const { Op } = await import('sequelize');
          const count = await ModelTuSi.count({
            where: {
              capDo: { [Op.gte]: tuSi.capDo },
              idNguoiDung: { [Op.ne]: tuSi.idNguoiDung }
            }
          });

          if (count === 0) {
            await ThienDaoLuc.ghiLuc(
              `⚡ **Thiên Địa Chấn Động**: Tu sĩ **${tuSi.ten}** vượt qua thiên kiếp, thành công trở thành **người đầu tiên** đột phá cảnh giới **${newRealmName} (${newStage})**!`,
              'Realm'
            );
          } else if (isMajor) {
            await ThienDaoLuc.ghiLuc(
              `🌀 **Đại Phá Cảnh Giới**: Tu sĩ **${tuSi.ten}** nghịch thiên cải mệnh, thăng cấp đại cảnh giới lên **${newRealmName} (${newStage})**!`,
              'Realm'
            );
          }
        } catch (err) {
          console.error('Lỗi khi ghi Thiên Đạo Lục đột phá thành công:', err);
        }

        const congratsEmbed = BoTaoEmbed.thanhCong(
          "🎉 Đột Phá Thành Công! 🎉",
          `Đạo hữu **${tuSi.ten}** đã nghịch thiên thăng cấp thành công!\n` +
          `• **Cảnh giới cũ**: \`${currentRealmName}\`\n` +
          `• **Cảnh giới mới**: ✨ **${newRealmName} - ${newStage}** ✨\n` +
          `• **Chỉ số sinh mệnh**: HP/MP khôi phục toàn mãn!`
        );
        congratsEmbed.addFields(
          { name: "❤️ Máu tối đa", value: `\`${stats.max_hp}\``, inline: true },
          { name: "⚔️ Sức mạnh công kích", value: `Vật công: \`${stats.vat_cong}\` | Pháp công: \`${stats.phap_cong}\``, inline: false }
        );

        await interaction.editReply({ embeds: [congratsEmbed] });
      } else {
        // ĐỘT PHÁ THẤT BẠI
        const [statDamaged, penaltyPct] = tuSi.nhanPhatDotPhaThatBai();

        // Khấu trừ linh lực tích lũy (mất 30%) và linh thạch (mất 50% chi phí thăng cảnh giới nếu có)
        tuSi.linhLuc = Math.floor(tuSi.linhLuc * 0.70);
        if (isMajor) {
          tuSi.linhThach -= Math.floor(stoneCost * 0.50);
        }

        // Tạo khóa thời gian chờ vết thương: 1 Đạo Niên (config.DAO_NIEN_SECONDS)
        const expiresAt = new Date(Date.now() + config.DAO_NIEN_SECONDS * 1000);
        await this.datThoiGianCho(tuSi.idNguoiDung, 'breakthrough_lock', expiresAt);
        await tuSi.save();

        try {
          const { ThienDaoLuc } = await import('../models/ThienDaoLuc.js');
          if (isMajor) {
            await ThienDaoLuc.ghiLuc(
              `💥 **Thiên Kiếp Giáng Thế**: Đạo hữu **${tuSi.ten}** khi đột phá đại cảnh giới **${currentRealmName}** đã bị tâm ma cắn trả, đứt gãy kinh mạch, căn cơ bị tổn hao nặng nề!`,
              'BreakthroughFail'
            );
          }
        } catch (err) {
          console.error('Lỗi khi ghi Thiên Đạo Lục đột phá thất bại:', err);
        }

        const statMap = {
          hp: "Máu tối đa (Max HP)",
          mp: "Pháp lực tối đa (Max MP)",
          vatCong: "Sức Vật Công",
          phapCong: "Sức Pháp Công",
        };

        const failEmbed = BoTaoEmbed.loi(
          `💥 Đột Phá Thất Bại! 💥\n` +
          `Tâm ma bùng phát, đạo hữu **${tuSi.ten}** bị cắn trả nghiêm trọng!\n\n` +
          `• **Hậu quả**: Bị tụt về cảnh giới \`${tuSi.canhGioi} - ${config.layThongTinCanhGioi(tuSi.capDo).stageName}\`\n` +
          `• **Tổn thương căn cơ**: Giảm vĩnh viễn **${penaltyPct}%** \`${statMap[statDamaged]}\` giới hạn!\n` +
          `• **Trạng thái**: Trọng thương (HP/MP giảm còn 10%)\n` +
          `• **Bế quan tĩnh dưỡng**: Kinh mạch hỗn loạn, bị khóa đột phá trong \`1 Đạo Niên\` (15 phút).`
        );

        await interaction.editReply({ embeds: [failEmbed] });
      }
    }
  };

  // Lệnh /nghi: Nghỉ ngơi tĩnh dưỡng khôi phục thể trạng
  lenhNghiNgoi = {
    data: new SlashCommandBuilder()
      .setName('nghi')
      .setDescription('Nghỉ ngơi tĩnh dưỡng, hồi phục HP/MP và giảm thời gian tổn thương căn cơ'),
    execute: async (interaction) => {
      await interaction.deferReply();
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      // Kiểm tra thời gian chờ nghỉ ngơi (tránh spam)
      const restCooldown = await this.kiemTraThoiGianCho(tuSi.idNguoiDung, 'rest');
      if (restCooldown) {
        const hetHanTime = new Date(restCooldown.hetHan).getTime();
        const secondsLeft = Math.max(0, Math.floor((hetHanTime - Date.now()) / 1000));
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(`Đạo hữu vừa nghỉ ngơi xong, thần sắc còn tốt! Cần đợi \`${secondsLeft} giây\` mới có thể tĩnh dưỡng tiếp.`)]
        });
      }

      // Khôi phục HP/MP toàn mãn
      const stats = tuSi.layChiSo();
      tuSi.hp = stats.max_hp;
      tuSi.mp = stats.max_mp;

      // Giảm thời gian khóa vết thương đi 1 Đạo Niên (15 phút thực tế)
      const btLock = await ThoiGianCho.findOne({
        where: {
          idNguoiDung: tuSi.idNguoiDung,
          hanhDong: 'breakthrough_lock'
        }
      });

      let lockReduced = false;
      if (btLock) {
        const currentExpiry = new Date(btLock.hetHan).getTime();
        const newExpiryTime = currentExpiry - config.DAO_NIEN_SECONDS * 1000;

        if (newExpiryTime <= Date.now()) {
          await btLock.destroy();
          lockReduced = "completely_removed";
        } else {
          btLock.hetHan = new Date(newExpiryTime);
          await btLock.save();
          lockReduced = "reduced";
        }
      }

      // Cooldown nghỉ ngơi: 5 phút (300 giây). Nếu debug mode thì 10 giây
      const restCooldownDuration = config.DEBUG_MODE ? 10 : 300;
      const expiresAt = new Date(Date.now() + restCooldownDuration * 1000);
      await this.datThoiGianCho(tuSi.idNguoiDung, 'rest', expiresAt);

      await tuSi.save();

      let desc = "Đạo hữu đã tĩnh dưỡng nghỉ ngơi!\n• **Khôi phục**: ❤️ HP và 💙 MP được phục hồi đầy đủ.";
      if (lockReduced === "completely_removed") {
        desc += "\n• **Vết thương căn cơ**: Kinh mạch đã ổn định hoàn toàn, có thể đột phá ngay lập tức!";
      } else if (lockReduced === "reduced") {
        desc += "\n• **Vết thương căn cơ**: Giảm thời gian tĩnh dưỡng vết thương đi \`1 Đạo Niên\` (15 phút).";
      }

      await interaction.editReply({
        embeds: [BoTaoEmbed.thanhCong("🥋 Tĩnh Dưỡng Hồi Phục", desc)]
      });
    }
  };
}

const controller = new BoDieuKhienTuLuyen();
export const danhSachLenhTuLuyen = [
  controller.lenhXemTuVi,
  controller.lenhDotPha,
  controller.lenhNghiNgoi
];
export { controller as boDieuKhienTuLuyen };
