import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder
} from 'discord.js';
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
      const { Abode } = await import('../models/Abode.js');
      const cg = await CanhGioi.findByPk(tuSi.capDo);
      const reqExp = cg ? cg.linhLucYeuCau : config.layLinhLucYeuCau(tuSi.capDo);
      const tocDoCoBan = cg ? cg.tocDoCoBan : 100;
      const heSoTuLuyen = tuSi.layHeSoTuLuyen();
      
      const abode = await Abode.findByPk(tuSi.idNguoiDung);
      const lvDongPhu = abode ? abode.level : 0;
      const tocDoTuLuyen = Math.floor(tocDoCoBan * heSoTuLuyen * (1 + lvDongPhu));

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
      const currentRealmInfo = config.layThongTinCanhGioi(tuSi.capDo);
      const nextRealmInfo = config.layThongTinCanhGioi(tuSi.capDo + 1);
      const currentRealmName = currentRealmInfo.realmName;
      const nextRealmName = nextRealmInfo.realmName;

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

      const { Inventory } = await import('../models/Inventory.js');
      const { Item } = await import('../models/Item.js');

      // Tỉ lệ gốc
      const baseChance = config.layTiLeDotPha(tuSi.capDo);
      const btData = config.layVatPhamDotPhaTheoCapDo(tuSi.capDo);
      const requiredPillId = btData ? btData.pillId : null;
      const requiredPillItem = requiredPillId ? await Item.findByPk(requiredPillId) : null;

      // Chuẩn bị Embed xác nhận
      const buildConfirmEmbed = (selectedPillData = null) => {
        let title = '⚡ THIÊN KIẾP XÁC NHẬN ĐỘT PHÁ ⚡';
        let color = 0xf39c12; // Orange
        let desc = 
          `Đạo hữu **${tuSi.ten}**,\n` +
          `Ngươi đang chuẩn bị đột phá cảnh giới:\n` +
          `• **Hiện tại**: \`${currentRealmName} - ${currentRealmInfo.stageName}\`\n` +
          `• **Mục tiêu**: ✨ **${nextRealmName} - ${nextRealmInfo.stageName}** ✨\n\n` +
          `📊 **Tỉ lệ thành công gốc**: \`${(baseChance * 100).toFixed(0)}%\`\n`;

        if (selectedPillData) {
          const finalChance = Math.min(1.0, baseChance + (selectedPillData.phanTramHoTro / 100));
          desc += 
            `💊 **Đan dược hỗ trợ**: **${selectedPillData.ten}** (${selectedPillData.phamChat} +${selectedPillData.phanTramHoTro}%)\n` +
            `📈 **Tỉ lệ thành công thực tế**: 🔥 **${(finalChance * 100).toFixed(0)}%** 🔥\n\n`;
        } else {
          desc += `📈 **Tỉ lệ thành công thực tế**: \`${(baseChance * 100).toFixed(0)}%\`\n\n`;
        }

        desc += 
          `⚠️ **THIÊN PHẠT THẤT BẠI (Nếu thất bại)**:\n` +
          `• 🌪️ **Linh lực tán loạn**: Khấu trừ \`30%\` linh lực tích lũy của cảnh hiện tại.\n` +
          `• ⏳ **Tâm ma quấn thân**: Thần trí bất ổn, phạt tĩnh dưỡng \`2 Đạo Niên\` (30 phút) không thể đột phá.\n\n` +
          `*Đạo hữu có muốn sử dụng Đan Đột Phá hỗ trợ để gia tăng tỉ lệ thành công không?*`;

        return new EmbedBuilder()
          .setTitle(title)
          .setDescription(desc)
          .setColor(color)
          .setTimestamp()
          .setFooter({ text: 'Thiên Đạo Tu Tiên RPG Breakthrough System' });
      };

      // Helper thực hiện đột phá thực sự
      const executeBreakthroughAction = async (pillInvId = null) => {
        let finalChance = baseChance;
        let consumedPillText = '';
        let pillRecord = null;

        if (pillInvId) {
          pillRecord = await Inventory.findOne({ where: { id: pillInvId, idNguoiDung: tuSi.idNguoiDung } });
          if (!pillRecord || pillRecord.soLuong <= 0) {
            return { ok: false, msg: 'Không tìm thấy đan dược đột phá được chọn trong túi đồ hoặc đã bị sử dụng.' };
          }
          const pillItem = await Item.findByPk(pillRecord.itemId);
          const pillInfo = JSON.parse(pillRecord.dongChiSoJson || '{}');
          finalChance = Math.min(1.0, baseChance + ((pillInfo.phanTramHoTro || 0) / 100));
          consumedPillText = `\n• **Đan dược đã dùng**: **${pillItem.ten}** (${pillInfo.phamChat} +${pillInfo.phanTramHoTro}%)`;
        }

        // Trừ tiền / Linh lực
        const roll = Math.random();
        if (roll <= finalChance) {
          // ĐỘT PHÁ THÀNH CÔNG
          // Tiêu hao pill
          if (pillRecord) {
            pillRecord.soLuong -= 1;
            if (pillRecord.soLuong <= 0) await pillRecord.destroy();
            else await pillRecord.save();
          }

          tuSi.capDo += 1;
          tuSi.linhLuc -= reqExp;
          if (tuSi.linhLuc < 0) {
            tuSi.linhLuc = 0;
          }

          if (isMajor) {
            tuSi.linhThach -= stoneCost;
            try {
              const { Abode } = await import('../models/Abode.js');
              let abode = await Abode.findByPk(tuSi.idNguoiDung);
              if (abode) {
                abode.pillCount = 0;
                await abode.save();
              }
            } catch (abodeErr) {
              console.error('[Breakthrough] Lỗi reset pillCount:', abodeErr);
            }
          }

          tuSi.dongBoCanhGioi();
          tuSi.theLucMax = (tuSi.theLucMax || 200) + 1;
          tuSi.theLuc = (tuSi.theLuc || 200) + 1;
          const { realmName: newRealmName, stageName: newStage } = config.layThongTinCanhGioi(tuSi.capDo);

          // Hồi phục toàn mãn trạng thái
          const stats = await tuSi.layChiSoDayDu();
          tuSi.hp = stats.max_hp;
          tuSi.mp = stats.max_mp;

          await tuSi.save();

          // Thiên Đạo Lục
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
            console.error('Lỗi Thiên Đạo Lục:', err);
          }

          const congratsEmbed = BoTaoEmbed.thanhCong(
            "🎉 ĐỘT PHÁ THÀNH CÔNG! 🎉",
            `Đạo hữu **${tuSi.ten}** đã nghịch thiên thăng cấp thành công!\n` +
            `• **Cảnh giới cũ**: \`${currentRealmName} - ${currentRealmInfo.stageName}\`\n` +
            `• **Cảnh giới mới**: ✨ **${newRealmName} - ${newStage}** ✨${consumedPillText}\n` +
            `• **Chỉ số sinh mệnh**: HP/MP khôi phục toàn mãn!`
          );
          congratsEmbed.addFields(
            { name: "❤️ Máu tối đa", value: `\`${stats.max_hp}\``, inline: true },
            { name: "⚔️ Sức mạnh công kích", value: `Vật công: \`${stats.vat_cong}\` | Pháp công: \`${stats.phap_cong}\``, inline: false }
          );

          return { ok: true, embed: congratsEmbed };
        } else {
          // ĐỘT PHÁ THẤT BẠI
          if (pillRecord) {
            pillRecord.soLuong -= 1;
            if (pillRecord.soLuong <= 0) await pillRecord.destroy();
            else await pillRecord.save();
          }

          const [statDamaged, penaltyPct] = tuSi.nhanPhatDotPhaThatBai();

          // Khấu trừ linh lực tích lũy (chỉ trừ 30% tu vi của cảnh hiện tại)
          const baseLinhLuc = tuSi.capDo > 1 ? config.layLinhLucYeuCau(tuSi.capDo - 1) : 0;
          const currentRealmExp = Math.max(0, tuSi.linhLuc - baseLinhLuc);
          const penaltyExp = Math.floor(currentRealmExp * 0.30);
          tuSi.linhLuc -= penaltyExp;

          if (isMajor) {
            tuSi.linhThach -= Math.floor(stoneCost * 0.50);
          }

          // Tạo khóa thời gian chờ vết thương: 2 Đạo Niên (2 * config.DAO_NIEN_SECONDS)
          const expiresAt = new Date(Date.now() + 2 * config.DAO_NIEN_SECONDS * 1000);
          await this.datThoiGianCho(tuSi.idNguoiDung, 'breakthrough_lock', expiresAt);
          await tuSi.save();

          try {
            const { ThienDaoLuc } = await import('../models/ThienDaoLuc.js');
            if (isMajor) {
              await ThienDaoLuc.ghiLuc(
                `💥 **Thiên Kiếp Giáng Thế**: Đạo hữu **${tuSi.ten}** khi đột phá đại cảnh giới **${currentRealmName}** đã bị thiên kiếp cản trở thất bại, nhưng nhờ hộ thân kịp thời nên căn cơ vẫn nguyên vẹn!`,
                'BreakthroughFail'
              );
            }
          } catch (err) {
            console.error('Lỗi Thiên Đạo Lục đột phá thất bại:', err);
          }

          const timeText = config.DAO_NIEN_SECONDS === 15 ? '30 giây' : '30 phút';

          const failEmbed = BoTaoEmbed.loi(
            `💥 **Đột Phá Thất Bại!** 💥\n\n` +
            `Đạo hữu **${tuSi.ten}** đã thất bại khi cố gắng đột phá cảnh giới!\n` +
            `• **Cảnh giới hiện tại**: \`${currentRealmName} - ${currentRealmInfo.stageName}\` (Không bị thối lui cảnh giới)\n` +
            `• **Căn cơ bảo toàn**: Không bị tổn hại thuộc tính vĩnh viễn.\n` +
            `• **Hệ quả**: Khấu trừ \`-${penaltyExp.toLocaleString()}\` Linh lực (30% linh lực tích lũy của cảnh hiện tại), HP/MP kiệt quệ.${consumedPillText}\n` +
            `• **Trạng thái**: Kinh mạch chấn động! Cần tĩnh dưỡng trong \`${timeText}\` (2 Đạo Niên) để có thể tiếp tục đột phá.`
          );

          return { ok: true, embed: failEmbed };
        }
      };

      // ── Hiển thị UI ban đầu ────────────────────────────────────────────────
      const mainRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_use_pill')
          .setLabel('🟢 Có, Dùng Đan')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('confirm_no_pill')
          .setLabel('🔴 Không, Đột Phá Ngay')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('confirm_cancel')
          .setLabel('❌ Hủy Bỏ')
          .setStyle(ButtonStyle.Secondary)
      );

      const msg = await interaction.editReply({
        embeds: [buildConfirmEmbed()],
        components: [mainRow]
      });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 60000
      });

      collector.on('collect', async (i) => {
        await i.deferUpdate();

        if (i.customId === 'confirm_cancel') {
          collector.stop('cancelled');
          await interaction.editReply({
            embeds: [BoTaoEmbed.thongTin('⚡ Đột Phá Cảnh Giới', 'Đạo hữu đã quyết định bảo toàn tu vi, hủy bỏ đột phá.')],
            components: []
          });
          return;
        }

        if (i.customId === 'confirm_no_pill') {
          collector.stop('done');
          const res = await executeBreakthroughAction();
          await interaction.editReply({
            embeds: [res.embed],
            components: []
          });
          return;
        }

        if (i.customId === 'confirm_use_pill') {
          // Tìm đan dược trong túi đồ phù hợp
          if (!requiredPillId) {
            return await interaction.followUp({
              embeds: [BoTaoEmbed.loi('Không có đan dược đột phá khả dụng cho cảnh giới này!')],
              ephemeral: true
            });
          }

          const userPills = await Inventory.findAll({
            where: { idNguoiDung: tuSi.idNguoiDung, itemId: requiredPillId, trangBi: false }
          });

          if (userPills.length === 0) {
            return await interaction.followUp({
              embeds: [BoTaoEmbed.loi(
                `Đạo hữu không có **${requiredPillItem?.ten || 'Đan Đột Phá phù hợp'}** trong túi đồ!\n` +
                `Hãy đi **Mua tại /shop** hoặc **Luyện tại Lò luyện đan** ở động phủ.`
              )],
              ephemeral: true
            });
          }

          // Build select menu
          const selectOptions = userPills.map(p => {
            const info = JSON.parse(p.dongChiSoJson || '{}');
            return {
              label: `${requiredPillItem?.ten || 'Đan'} [${info.phamChat} +${info.phanTramHoTro}%]`,
              description: `Tỉ lệ hỗ trợ: +${info.phanTramHoTro}% | Đang có: ${p.soLuong}`,
              value: p.id.toString()
            };
          });

          const selectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('select_breakthrough_pill')
              .setPlaceholder('🔮 Chọn viên đan đột phá muốn dùng...')
              .addOptions(selectOptions)
          );

          const cancelRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('btn_back_confirm')
              .setLabel('↩️ Quay Lại')
              .setStyle(ButtonStyle.Secondary)
          );

          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setTitle('💊 SỬ DỤNG ĐAN DƯỢC HỖ TRỢ ĐỘT PHÁ 💊')
                .setColor(0x9b59b6)
                .setDescription(
                  `Đạo hữu **${tuSi.ten}** đang chuẩn bị đột phá cảnh giới từ \`${currentRealmName}\` lên \`${nextRealmName}\`.\n` +
                  `Vui lòng chọn viên Đan Dược hỗ trợ đột phá dưới đây để gia tăng tỉ lệ thành công:`
                )
            ],
            components: [selectRow, cancelRow]
          });
          return;
        }

        if (i.customId === 'btn_back_confirm') {
          await interaction.editReply({
            embeds: [buildConfirmEmbed()],
            components: [mainRow]
          });
          return;
        }

        if (i.customId === 'select_breakthrough_pill') {
          const pillInvId = parseInt(i.values[0], 10);
          const pillRecord = await Inventory.findOne({ where: { id: pillInvId, idNguoiDung: tuSi.idNguoiDung } });
          if (!pillRecord) {
            return await interaction.followUp({
              embeds: [BoTaoEmbed.loi('Không tìm thấy viên đan dược tương ứng!')],
              ephemeral: true
            });
          }

          const pillInfo = JSON.parse(pillRecord.dongChiSoJson || '{}');
          const pillItem = await Item.findByPk(pillRecord.itemId);

          const pillData = {
            ten: pillItem.ten,
            phamChat: pillInfo.phamChat,
            phanTramHoTro: pillInfo.phanTramHoTro
          };

          const finalConfirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`execute_breakthrough::${pillInvId}`)
              .setLabel('⚡ Tiến Hành Đột Phá')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('btn_back_confirm')
              .setLabel('↩️ Chọn Lại')
              .setStyle(ButtonStyle.Secondary)
          );

          await interaction.editReply({
            embeds: [buildConfirmEmbed(pillData)],
            components: [finalConfirmRow]
          });
          return;
        }

        if (i.customId.startsWith('execute_breakthrough::')) {
          collector.stop('done');
          const pillInvId = parseInt(i.customId.split('::')[1], 10);
          const res = await executeBreakthroughAction(pillInvId);
          await interaction.editReply({
            embeds: [res.embed],
            components: []
          });
          return;
        }
      });

      collector.on('end', async (_, reason) => {
        if (reason === 'time') {
          try {
            await interaction.editReply({
              embeds: [BoTaoEmbed.thongTin('⚡ Đột Phá Cảnh Giới', 'Đã hết thời gian chờ xác nhận đột phá.')],
              components: []
            });
          } catch (e) {}
        }
      });
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
      const stats = await tuSi.layChiSoDayDu();
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
