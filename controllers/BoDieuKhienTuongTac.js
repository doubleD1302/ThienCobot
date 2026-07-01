import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';

import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed, layMauCanhGioi } from '../views/BoTaoEmbed.js';
import { Abode } from '../models/Abode.js';
import { Inventory } from '../models/Inventory.js';
import { Item } from '../models/Item.js';
import { Pet } from '../models/Pet.js';
import * as config from '../config.js';

class BoDieuKhienTuongTac extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhTuongTac = {
    data: new SlashCommandBuilder()
      .setName('tuongtac')
      .setDescription('Tương tác trực tiếp với các đạo hữu khác trong server')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('Đạo hữu muốn tương tác')
          .setRequired(true)
      ),

    execute: async (interaction) => {
      await interaction.deferReply();

      const targetUser = interaction.options.getUser('user');
      if (targetUser.id === interaction.user.id) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Đạo hữu không thể tự tương tác với bản thân!")]
        });
      }

      // 1. Tải dữ liệu tu sĩ hai bên
      const tuSiA = await this.layTuSi(interaction.user.id);
      const tuSiB = await this.layTuSi(targetUser.id);

      if (!tuSiA) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }
      if (!tuSiB) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(`Đạo hữu **${targetUser.username}** chưa gia nhập thế giới tu tiên!`)]
        });
      }

      // Đảm bảo đồng bộ tu vi nếu lâu ngày không hoạt động
      await this.kiemTraVaNhanTuVi(tuSiA);
      await this.kiemTraVaNhanTuVi(tuSiB);

      // Tải động phủ để kiểm tra cờ song tu
      let [abodeA] = await Abode.findOrCreate({ where: { userId: tuSiA.idNguoiDung } });
      let [abodeB] = await Abode.findOrCreate({ where: { userId: tuSiB.idNguoiDung } });

      const colorA = layMauCanhGioi(tuSiA.canhGioi);
      let selectedOption = null; // 'CHOOSE', 'TRUYEN_CONG', 'TANG_QUA', 'SONG_TU_INVITE'

      // ── HELPER RENDER EMBED ────────────────────────────────────────────────
      const buildMainEmbed = () => {
        return new EmbedBuilder()
          .setTitle(`☯️ Tiên Nhân Tương Tác: ${tuSiA.ten} ➔ ${tuSiB.ten}`)
          .setColor(colorA)
          .setDescription(
            `Đạo hữu **${tuSiA.ten}** muốn giao thiệp với đạo hữu **${tuSiB.ten}**.\n` +
            `Hãy lựa chọn một hình thức tương tác thần thông dưới đây:`
          )
          .addFields(
            { name: '⚔️ Tỷ Thí Giao Hữu', value: 'Thách đấu tỉ thí pháp thuật phân cao thấp (không tốn HP).' },
            { name: '🤝 Truyền Công Thụ Pháp', value: 'Truyền một phần Linh Lực của bản thân cho đối phương (hao hụt 20%).' },
            { name: '💵 Tặng Quà VND', value: 'Tặng VND của mình làm quà gặp mặt đạo hữu.' },
            { name: '👹 Cướp Đoạt Tài Phú', value: 'Cướp đoạt Linh Thạch đối phương (dựa trên chênh lệch cảnh giới, thất bại bị phản phệ phạt nặng).' },
            { name: '💖 Song Tu Đồng Đạo', value: 'Cùng tu luyện gia tăng lượng lớn tu vi linh lực (Tối đa 1 lần/ngày).' }
          )
          .setTimestamp();
      };

      const buildMainButtons = () => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tt_tythi').setLabel('⚔️ Tỷ Thí').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('tt_truyencong').setLabel('🤝 Truyền Công').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('tt_tangqua').setLabel('💵 Tặng Quà VND').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('tt_cuopdoat').setLabel('👹 Cướp Đoạt').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('tt_songtu').setLabel('💖 Song Tu').setStyle(ButtonStyle.Primary)
        );
      };

      // Gửi tin nhắn chính
      const msg = await interaction.editReply({
        embeds:     [buildMainEmbed()],
        components: [buildMainButtons()]
      });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id || (selectedOption === 'SONG_TU_INVITE' && i.user.id === targetUser.id),
        time:   60_000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();

        // ══════════════════════════════════════════════════════════════
        // 1. TỶ THÍ GIAO HỮU (DIRECT DUEL SIMULATION)
        // ══════════════════════════════════════════════════════════════
        if (i.customId === 'tt_tythi') {
          collector.stop('finished');

          // Tải trang bị và pet
          const eqA = await loadEquippedItems(tuSiA.idNguoiDung);
          const eqB = await loadEquippedItems(tuSiB.idNguoiDung);
          const petA = await Pet.findOne({ where: { userId: tuSiA.idNguoiDung, isActive: true } });
          const petB = await Pet.findOne({ where: { userId: tuSiB.idNguoiDung, isActive: true } });

          const statsA = tuSiA.layChiSo(eqA.inv, petA);
          const statsB = tuSiB.layChiSo(eqB.inv, petB);

          let hpA = statsA.max_hp;
          let hpB = statsB.max_hp;

          // Tải kỹ năng đã học cho cả A và B
          const { PlayerSkill } = await import('../models/PlayerSkill.js');
          const { Skill } = await import('../models/Skill.js');

          const learnedA = await PlayerSkill.findAll({ where: { idNguoiDung: tuSiA.idNguoiDung } });
          const skillsA = [];
          for (const psk of learnedA) {
            const detail = await Skill.findByPk(psk.skillId);
            if (detail) {
              skillsA.push({ detail, capDo: psk.capDo, nextRoundAvailable: 1 });
            }
          }

          const learnedB = await PlayerSkill.findAll({ where: { idNguoiDung: tuSiB.idNguoiDung } });
          const skillsB = [];
          for (const psk of learnedB) {
            const detail = await Skill.findByPk(psk.skillId);
            if (detail) {
              skillsB.push({ detail, capDo: psk.capDo, nextRoundAvailable: 1 });
            }
          }

          const battleLogs = [];
          let round = 1;
          let winner = null;

          const atkA = tuSiA.huongTu === 'The Tu' ? statsA.vat_cong : statsA.phap_cong;
          const defB = tuSiA.huongTu === 'The Tu' ? statsB.vat_phong : statsB.phap_phong;

          const atkB = tuSiB.huongTu === 'The Tu' ? statsB.vat_cong : statsB.phap_cong;
          const defA = tuSiB.huongTu === 'The Tu' ? statsA.vat_phong : statsA.phap_phong;

          while (hpA > 0 && hpB > 0 && round <= 15) {
            // Lượt A đánh B
            const readySkillA = skillsA.find(s => s.nextRoundAvailable <= round);
            let dmgA = 0;
            let castMsgA = '';
            let isCritA = Math.random() <= statsA.crit_rate;

            if (readySkillA) {
              const skill = readySkillA.detail;
              const capDo = readySkillA.capDo;
              const skillMult = (skill.satThuong / 100) * (1 + (capDo - 1) * 0.1);
              let rawDmg = atkA * skillMult;

              if (isCritA) rawDmg = rawDmg * statsA.crit_dmg;
              dmgA = Math.max(1, Math.floor(rawDmg) - defB);

              const cooldownRounds = Math.max(1, Math.ceil(skill.cooldown / 3));
              readySkillA.nextRoundAvailable = round + cooldownRounds;

              castMsgA = `thi triển **${skill.ten} (Cấp ${capDo})**`;
            } else {
              let rawDmg = atkA;
              if (isCritA) rawDmg = rawDmg * statsA.crit_dmg;
              dmgA = Math.max(1, Math.floor(rawDmg) - defB);

              castMsgA = `đánh thường`;
            }

            if (Math.random() <= statsB.ne) {
              battleLogs.push(`⚡ **Hiệp ${round}**: **${tuSiA.ten}** ${castMsgA} nhưng **${tuSiB.ten}** ảo ảnh lướt nhẹ né tránh thành công!`);
            } else {
              hpB = Math.max(0, hpB - dmgA);
              battleLogs.push(`⚡ **Hiệp ${round}**: **${tuSiA.ten}** ${castMsgA} gây \`${dmgA}\`${isCritA ? ' 💥 (Bạo!)' : ''} sát thương lên **${tuSiB.ten}** (HP còn: \`${hpB}\`).`);
            }

            if (hpB <= 0) {
              winner = tuSiA;
              break;
            }

            // Lượt B đánh A
            const readySkillB = skillsB.find(s => s.nextRoundAvailable <= round);
            let dmgB = 0;
            let castMsgB = '';
            let isCritB = Math.random() <= statsB.crit_rate;

            if (readySkillB) {
              const skill = readySkillB.detail;
              const capDo = readySkillB.capDo;
              const skillMult = (skill.satThuong / 100) * (1 + (capDo - 1) * 0.1);
              let rawDmg = atkB * skillMult;

              if (isCritB) rawDmg = rawDmg * statsB.crit_dmg;
              dmgB = Math.max(1, Math.floor(rawDmg) - defA);

              const cooldownRounds = Math.max(1, Math.ceil(skill.cooldown / 3));
              readySkillB.nextRoundAvailable = round + cooldownRounds;

              castMsgB = `thi triển **${skill.ten} (Cấp ${capDo})**`;
            } else {
              let rawDmg = atkB;
              if (isCritB) rawDmg = rawDmg * statsB.crit_dmg;
              dmgB = Math.max(1, Math.floor(rawDmg) - defA);

              castMsgB = `phản kích đánh thường`;
            }

            if (Math.random() <= statsA.ne) {
              battleLogs.push(`⚡ **Hiệp ${round}**: **${tuSiB.ten}** ${castMsgB} nhưng **${tuSiA.ten}** né tránh thành công!`);
            } else {
              hpA = Math.max(0, hpA - dmgB);
              battleLogs.push(`⚡ **Hiệp ${round}**: **${tuSiB.ten}** ${castMsgB} gây \`${dmgB}\`${isCritB ? ' 💥 (Bạo!)' : ''} sát thương lên **${tuSiA.ten}** (HP còn: \`${hpA}\`).`);
            }

            if (hpA <= 0) {
              winner = tuSiB;
              break;
            }

            round++;
          }

          if (!winner) {
            winner = hpA >= hpB ? tuSiA : tuSiB;
            battleLogs.push(`⏳ Bất phân thắng bại sau 15 hiệp! Xét lượng khí huyết còn lại để định đoạt.`);
          }

          const resultEmbed = new EmbedBuilder()
            .setTitle(`⚔️ Kết Quả Tỷ Thí Giao Hữu`)
            .setColor(0x3498db)
            .setDescription(
              `⚔️ Cuộc tỷ thí long trời lở đất giữa hai vị đạo hữu kết thúc!\n\n` +
              `🏆 **Người chiến thắng**: **${winner.ten}**\n\n` +
              `📝 **Nhật ký tỷ thí**:\n` +
              (battleLogs.length > 8 ? battleLogs.slice(-8).join('\n') : battleLogs.join('\n'))
            )
            .setTimestamp();

          await i.editReply({ embeds: [resultEmbed], components: [] });
        }

        // ══════════════════════════════════════════════════════════════
        // 2. TRUYỀN CÔNG THỰ THUẬT (TRANSMISSION)
        // ══════════════════════════════════════════════════════════════
        else if (i.customId === 'tt_truyencong') {
          selectedOption = 'TRUYEN_CONG';
          const embed = new EmbedBuilder()
            .setTitle('🤝 Truyền Công Thụ Pháp')
            .setColor(0x9b59b6)
            .setDescription(
              `Đạo hữu muốn tiêu hao bao nhiêu Linh Lực tu luyện tích lũy của bản thân để truyền thụ cho **${tuSiB.ten}**?\n` +
              `*(Quá trình truyền công hao tổn kinh mạch, người nhận chỉ thực nhận 80% lượng chuyển)*`
            );

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tc_1000').setLabel('🤝 1,000 Linh Lực').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tc_5000').setLabel('🤝 5,000 Linh Lực').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tc_10000').setLabel('🤝 10,000 Linh Lực').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tc_50000').setLabel('🤝 50,000 Linh Lực').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tc_cancel').setLabel('↩️ Hủy').setStyle(ButtonStyle.Danger)
          );

          await i.editReply({ embeds: [embed], components: [row] });
        }

        else if (selectedOption === 'TRUYEN_CONG') {
          if (i.customId === 'tc_cancel') {
            selectedOption = null;
            await i.editReply({ embeds: [buildMainEmbed()], components: [buildMainButtons()] });
            return;
          }

          const amount = parseInt(i.customId.replace('tc_', ''), 10);
          if (tuSiA.linhLuc < amount) {
            await i.editReply({
              embeds: [BoTaoEmbed.loi(`Linh lực tích lũy bất túc! Ngươi chỉ có \`${tuSiA.linhLuc.toLocaleString()}\` EXP, không đủ truyền \`${amount.toLocaleString()}\`.`)],
              components: []
            });
            collector.stop('finished');
            return;
          }

          // Trừ A, cộng B
          const received = Math.floor(amount * 0.80);
          tuSiA.linhLuc -= amount;
          tuSiB.linhLuc += received;
          await tuSiA.save();
          await tuSiB.save();

          const resultEmbed = new EmbedBuilder()
            .setTitle('🤝 Truyền Công Thành Công')
            .setColor(0x2ecc71)
            .setDescription(
              `**${tuSiA.ten}** ngồi xếp bằng thi triển thần thông truyền pháp, đem \`${amount.toLocaleString()}\` Linh Lực truyền sang người **${tuSiB.ten}**.\n\n` +
              `• **${tuSiA.ten}**: Trừ \`-${amount.toLocaleString()}\` Linh lực.\n` +
              `• **${tuSiB.ten}**: Nhận thực tế \`+${received.toLocaleString()}\` Linh lực.`
            )
            .setTimestamp();

          await i.editReply({ embeds: [resultEmbed], components: [] });
          collector.stop('finished');
        }

        // ══════════════════════════════════════════════════════════════
        // 3. TẶNG QUÀ LINH THẠCH (GIFTING)
        // ══════════════════════════════════════════════════════════════
        else if (i.customId === 'tt_tangqua') {
          selectedOption = 'TANG_QUA';
          const embed = new EmbedBuilder()
            .setTitle('💵 Tặng Quà VND')
            .setColor(0xf1c40f)
            .setDescription(`Chọn số lượng VND muốn trao tặng cho đạo hữu **${tuSiB.ten}**:`);

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tq_1000').setLabel('💵 1,000 VND').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('tq_10000').setLabel('💵 10,000 VND').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('tq_50000').setLabel('💵 50,000 VND').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('tq_100000').setLabel('💵 100,000 VND').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('tq_cancel').setLabel('↩️ Hủy').setStyle(ButtonStyle.Danger)
          );

          await i.editReply({ embeds: [embed], components: [row] });
        }

        else if (selectedOption === 'TANG_QUA') {
          if (i.customId === 'tq_cancel') {
            selectedOption = null;
            await i.editReply({ embeds: [buildMainEmbed()], components: [buildMainButtons()] });
            return;
          }

          const amount = parseInt(i.customId.replace('tq_', ''), 10);
          if (tuSiA.vnd < amount) {
            await i.editReply({
              embeds: [BoTaoEmbed.loi(`VND bất túc! Ngươi không đủ \`${amount.toLocaleString()}\` VND để trao tặng.`)],
              components: []
            });
            collector.stop('finished');
            return;
          }

          tuSiA.vnd -= amount;
          tuSiB.vnd += amount;
          await tuSiA.save();
          await tuSiB.save();

          const resultEmbed = new EmbedBuilder()
            .setTitle('💵 Tặng Quà VND Hoàn Tất')
            .setColor(0x2ecc71)
            .setDescription(
              `Đạo hữu **${tuSiA.ten}** đã gửi tặng túi trữ vật chứa **${amount.toLocaleString()}** VND đến tay **${tuSiB.ten}**.\n\n` +
              `*Tình nghĩa giao hảo của chư vị chốn tiên môn ngày một sâu đậm!*`
            )
            .setTimestamp();

          await i.editReply({ embeds: [resultEmbed], components: [] });
          collector.stop('finished');
        }

        // ══════════════════════════════════════════════════════════════
        // 4. CƯỚP ĐOẠT TÀI PHÚ (ROB/PLUNDER)
        // ══════════════════════════════════════════════════════════════
        else if (i.customId === 'tt_cuopdoat') {
          collector.stop('finished');

          // Tính toán tỷ lệ thành công dựa theo chênh lệch cấp độ
          const levelDiff = tuSiA.capDo - tuSiB.capDo;
          let successChance = 0.40 + (levelDiff * 0.05);
          successChance = Math.max(0.05, Math.min(0.90, successChance)); // Min 5%, Max 90%

          const roll = Math.random();
          if (roll <= successChance) {
            // Thành công cướp 10% linh thạch đối thủ (tối đa 100k)
            const stolen = Math.min(100000, Math.floor(tuSiB.linhThach * 0.10));
            
            tuSiB.linhThach -= stolen;
            tuSiA.linhThach += stolen;
            await tuSiA.save();
            await tuSiB.save();

            const resultEmbed = new EmbedBuilder()
              .setTitle('👹 Cướp Đoạt Thành Công!')
              .setColor(0x2ecc71)
              .setDescription(
                `🔥 Đạo cao một thước! **${tuSiA.ten}** nhân lúc **${tuSiB.ten}** sơ hở thi triển di ảnh cướp đoạt túi trữ vật thành công!\n\n` +
                `• **Số linh thạch cướp được**: \`+${stolen.toLocaleString()}\` 🪙 Linh thạch.\n` +
                `• Tỷ lệ thành công lúc xuất chiêu: \`${Math.floor(successChance * 100)}%\``
              )
              .setTimestamp();

            await i.editReply({ embeds: [resultEmbed], components: [] });
          } else {
            // Thất bại: Pháp trận hộ thể phản phệ
            const penalty = Math.floor(tuSiA.linhThach * 0.05); // Phạt 5% bồi thường
            const eqA = await loadEquippedItems(tuSiA.idNguoiDung);
            const statsA = tuSiA.layChiSo(eqA.inv);

            tuSiA.linhThach -= penalty;
            tuSiB.linhThach += penalty;
            tuSiA.hp = Math.max(1, tuSiA.hp - Math.floor(statsA.max_hp * 0.30)); // Trừ 30% HP

            await tuSiA.save();
            await tuSiB.save();

            const resultEmbed = new EmbedBuilder()
              .setTitle('💀 Cướp Đoạt Thất Bại!')
              .setColor(0xe74c3c)
              .setDescription(
                `⛈️ Khởi loạn tiên môn! **${tuSiA.ten}** tiếp cận bất thành, chạm phải Hộ trận tông môn cực mạnh của **${tuSiB.ten}** phát nổ phản phệ!\n\n` +
                `• **Tổn thương nhận lấy**: Trừ \`-30% HP\` tối đa.\n` +
                `• **Bồi thường phạt tổn hại**: Khấu trừ \`-${penalty.toLocaleString()}\` 🪙 chuyển cho **${tuSiB.ten}**.`
              )
              .setTimestamp();

            await i.editReply({ embeds: [resultEmbed], components: [] });
          }
        }

        // ══════════════════════════════════════════════════════════════
        // 5. SONG TU ĐỒNG ĐẠO (DUAL CULTIVATION)
        // ══════════════════════════════════════════════════════════════
        else if (i.customId === 'tt_songtu') {
          const today = new Date().toISOString().split('T')[0];

          if (abodeA.lastSongTu === today) {
            await i.editReply({
              embeds: [BoTaoEmbed.loi("Đạo hữu hôm nay đã tiến hành song tu rồi, dục tốc bất đạt! Hãy đợi ngày mai.")],
              components: []
            });
            collector.stop('finished');
            return;
          }
          if (abodeB.lastSongTu === today) {
            await i.editReply({
              embeds: [BoTaoEmbed.loi(`Đạo hữu **${tuSiB.ten}** hôm nay đã song tu linh khí cùng người khác mất rồi!`)],
              components: []
            });
            collector.stop('finished');
            return;
          }

          selectedOption = 'SONG_TU_INVITE';

          const embed = new EmbedBuilder()
            .setTitle('💖 Mời Song Tu Đồng Đạo')
            .setColor(0xff7675)
            .setDescription(
              `Đạo hữu **${tuSiA.ten}** gửi lời mời Song Tu Linh Khí đến **${tuSiB.ten}**!\n` +
              `Hai bên âm dương hòa hợp, dung nạp ngũ hành sẽ nhận được lượng lớn Linh Lực gia tăng cơ sở tu vi.\n\n` +
              `*Lưu ý: Chỉ có đạo hữu được mời <@${tuSiB.idNguoiDung}> mới có quyền bấm đồng ý.*`
            );

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('st_accept').setLabel('🤝 Đồng Ý Song Tu').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('st_decline').setLabel('❌ Từ Chối').setStyle(ButtonStyle.Danger)
          );

          await i.editReply({ embeds: [embed], components: [row] });
        }

        else if (selectedOption === 'SONG_TU_INVITE' && i.user.id === targetUser.id) {
          collector.stop('finished');

          if (i.customId === 'st_accept') {
            const today = new Date().toISOString().split('T')[0];

            // Tái kiểm tra cờ song tu lần nữa để phòng double-spending
            await abodeA.reload();
            await abodeB.reload();
            if (abodeA.lastSongTu === today || abodeB.lastSongTu === today) {
              await i.editReply({ embeds: [BoTaoEmbed.loi("Đã có một trong hai vị đạo hữu tiến hành song tu hôm nay.")], components: [] });
              return;
            }

            // Phần thưởng exp = cấp độ nhân vật * 800
            const bonusA = tuSiA.capDo * 800;
            const bonusB = tuSiB.capDo * 800;

            tuSiA.linhLuc += bonusA;
            tuSiB.linhLuc += bonusB;
            await tuSiA.save();
            await tuSiB.save();

            abodeA.lastSongTu = today;
            abodeB.lastSongTu = today;
            await abodeA.save();
            await abodeB.save();

            const resultEmbed = new EmbedBuilder()
              .setTitle('💖 Song Tu Đại Điển Thành Công')
              .setColor(0x2ecc71)
              .setDescription(
                `☯️ Đạo hóa lưỡng nghi! **${tuSiA.ten}** và **${tuSiB.ten}** ngồi đối diện tâm linh hòa quyện, linh lực lưu chuyển thông suốt 36 chu thiên!\n\n` +
                `• **${tuSiA.ten}** nhận được: \`+${bonusA.toLocaleString()}\` EXP Linh Lực.\n` +
                `• **${tuSiB.ten}** nhận được: \`+${bonusB.toLocaleString()}\` EXP Linh Lực.`
              )
              .setTimestamp();

            await i.editReply({ embeds: [resultEmbed], components: [] });
          } else {
            const resultEmbed = new EmbedBuilder()
              .setTitle('❌ Lời Mời Bị Từ Chối')
              .setColor(0xe74c3c)
              .setDescription(`Đạo hữu **${tuSiB.ten}** đã khéo léo chối từ lời đề nghị song tu lần này.`)
              .setTimestamp();

            await i.editReply({ embeds: [resultEmbed], components: [] });
          }
        }
      });

      collector.on('end', async (_, reason) => {
        try {
          if (reason === 'time') {
            await interaction.editReply({
              embeds: [new EmbedBuilder().setTitle('🌌 Đàm đạo kết thúc').setDescription('Thời gian giao hội đã hết hiệu lực.').setColor(0x7f8c8d)],
              components: []
            });
          }
        } catch (_) {}
      });
    }
  };
}

// Helper tải danh sách trang bị nhanh
async function loadEquippedItems(userId) {
  const invList = await Inventory.findAll({ where: { idNguoiDung: userId, trangBi: true } });
  const inv = [];
  const items = [];
  for (const record of invList) {
    const detail = await Item.findByPk(record.itemId);
    if (detail) {
      record.item = detail;
      inv.push(record);
      items.push(detail);
    }
  }
  return { inv, items };
}

const controller = new BoDieuKhienTuongTac();
export const danhSachLenhTuongTac = [controller.lenhTuongTac];
export { controller as boDieuKhienTuongTac };
