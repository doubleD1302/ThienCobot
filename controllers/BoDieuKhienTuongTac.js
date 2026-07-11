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
            { name: '💖 Song Tu Đồng Đạo', value: 'Cùng tu luyện gia tăng lượng lớn tu vi linh lực (Tối đa 1 lần/ngày).' },
            { name: '🧬 Kết Duyên Tiên Nhân', value: 'Kết duyên Huynh Đệ/Tỷ Muội (10 Lương Duyên) hoặc Hôn Phu (10 Lương Duyên & 500k Linh Thạch).' }
          )
          .setTimestamp();
      };

      const buildMainButtons = () => {
        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tt_tythi').setLabel('⚔️ Tỷ Thí').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('tt_truyencong').setLabel('🤝 Truyền Công').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('tt_tangqua').setLabel('💵 Tặng Quà VND').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('tt_cuopdoat').setLabel('👹 Cướp Đoạt').setStyle(ButtonStyle.Primary)
        );
        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tt_songtu').setLabel('💖 Song Tu').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('tt_ketduyen').setLabel('🧬 Kết Duyên').setStyle(ButtonStyle.Success)
        );
        return [row1, row2];
      };

      // Gửi tin nhắn chính
      const msg = await interaction.editReply({
        embeds:     [buildMainEmbed()],
        components: buildMainButtons()
      });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id || 
                    ((selectedOption === 'SONG_TU_INVITE' || (selectedOption && selectedOption.startsWith('KET_DUYEN_INVITE_'))) && i.user.id === targetUser.id),
        time:   60_000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();

        // ══════════════════════════════════════════════════════════════
        // 1. TỶ THÍ GIAO HỮU (DIRECT DUEL SIMULATION)
        // ══════════════════════════════════════════════════════════════
        if (i.customId === 'tt_tythi') {
          collector.stop('finished');

          // Check spouse protection
          let combatTarget = tuSiB;
          let interceptMsg = '';
          if (tuSiB.duyenType === 'hon_phu' && tuSiB.duyenUserId && String(tuSiB.duyenUserId) !== String(tuSiA.idNguoiDung)) {
            const { TuSi } = await import('../models/TuSi.js');
            const spouse = await TuSi.findOne({ where: { idNguoiDung: tuSiB.duyenUserId } });
            if (spouse && String(spouse.duyenUserId) === String(tuSiB.idNguoiDung) && spouse.duyenType === 'hon_phu') {
              combatTarget = spouse;
              interceptMsg = `⚔️ Đạo hữu **${tuSiA.ten}** khiêu chiến **${tuSiB.ten}**, nhưng nương tử/phu quân của họ là **${combatTarget.ten}** đã bước lên chặn trước mặt bảo vệ phu thê và đại diện tỉ thí!\n\n`;
            }
          }

          const { winner, battleLogs, round } = await _simCombat(tuSiA, combatTarget);

          const totalPages = Math.ceil(battleLogs.length / 15);
          let currentPageIdx = 0;

          const renderPage = (pageIdx) => {
            const start = pageIdx * 15;
            const end = start + 15;
            const pageLogs = battleLogs.slice(start, end).join('\n') || 'Trận đấu không có nhật ký ở trang này.';

            const embed = new EmbedBuilder()
              .setTitle(`⚔️ Kết Quả Tỷ Thí Giao Hữu (Trang ${pageIdx + 1}/${totalPages})`)
              .setColor(0x3498db)
              .setDescription(
                interceptMsg +
                `⚔️ Cuộc tỷ thí long trời lở đất kết thúc sau ${round - 1} hiệp!\n\n` +
                `🏆 **Người chiến thắng**: **${winner.ten}**\n\n` +
                `📝 **Nhật ký tỷ thí**:\n` +
                pageLogs
              )
              .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('btn_prev')
                .setLabel('◀️ Trang Trước')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pageIdx === 0),
              new ButtonBuilder()
                .setCustomId('btn_next')
                .setLabel('Trang Sau ▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pageIdx === totalPages - 1)
            );

            return { embeds: [embed], components: totalPages > 1 ? [row] : [] };
          };

          const replyMsg = await i.editReply(renderPage(currentPageIdx));

          if (totalPages > 1) {
            const pageCollector = replyMsg.createMessageComponentCollector({
              filter: btnInt => btnInt.user.id === interaction.user.id,
              time: 180_000
            });

            pageCollector.on('collect', async btnInt => {
              await btnInt.deferUpdate();
              if (btnInt.customId === 'btn_prev') {
                currentPageIdx = Math.max(0, currentPageIdx - 1);
              } else if (btnInt.customId === 'btn_next') {
                currentPageIdx = Math.min(totalPages - 1, currentPageIdx + 1);
              }
              await btnInt.editReply(renderPage(currentPageIdx));
            });

            pageCollector.on('end', async () => {
              try {
                const finalState = renderPage(currentPageIdx);
                if (finalState.components.length > 0) {
                  const disabledRow = new ActionRowBuilder().addComponents(
                    finalState.components[0].components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
                  );
                  await interaction.editReply({ components: [disabledRow] });
                }
              } catch (e) {
                // Ignore errors
              }
            });
          }
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
            await i.editReply({ embeds: [buildMainEmbed()], components: buildMainButtons() });
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

          const newAffinity = await config.tangLuongDuyen(tuSiA.idNguoiDung, tuSiB.idNguoiDung, 1);

          const resultEmbed = new EmbedBuilder()
            .setTitle('🤝 Truyền Công Thành Công')
            .setColor(0x2ecc71)
            .setDescription(
              `**${tuSiA.ten}** ngồi xếp bằng thi triển thần thông truyền pháp, đem \`${amount.toLocaleString()}\` Linh Lực truyền sang người **${tuSiB.ten}**.\n\n` +
              `• **${tuSiA.ten}**: Trừ \`-${amount.toLocaleString()}\` Linh lực.\n` +
              `• **${tuSiB.ten}**: Nhận thực tế \`+${received.toLocaleString()}\` Linh lực.\n\n` +
              `✨ Điểm lương duyên giữa cả hai tăng thêm **+1**! (Hiện tại: \`${newAffinity}\` điểm)`
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
            await i.editReply({ embeds: [buildMainEmbed()], components: buildMainButtons() });
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

          // Check spouse protection
          let spouse = null;
          if (tuSiB.duyenType === 'hon_phu' && tuSiB.duyenUserId && String(tuSiB.duyenUserId) !== String(tuSiA.idNguoiDung)) {
            const { TuSi } = await import('../models/TuSi.js');
            const foundSpouse = await TuSi.findOne({ where: { idNguoiDung: tuSiB.duyenUserId } });
            if (foundSpouse && String(foundSpouse.duyenUserId) === String(tuSiB.idNguoiDung) && foundSpouse.duyenType === 'hon_phu') {
              spouse = foundSpouse;
            }
          }

          if (spouse) {
            // Run duel with spouse S
            const { winner, battleLogs, round } = await _simCombat(tuSiA, spouse);

            const totalPages = Math.ceil(battleLogs.length / 15);
            let currentPageIdx = 0;

            let title = '';
            let color = 0;
            let description = '';

            if (winner.idNguoiDung === tuSiA.idNguoiDung) {
              title = '👹 Cướp Đoạt Thành Công (Đả Bại Phu Thê)';
              color = 0x2ecc71;
              const stolen = Math.min(100000, Math.floor(tuSiB.linhThach * 0.10));
              tuSiB.linhThach -= stolen;
              tuSiA.linhThach += stolen;
              await tuSiA.save();
              await tuSiB.save();

              description = `💥 Đạo hữu **${tuSiA.ten}** định cướp đoạt **${tuSiB.ten}**, phu quân/nương tử **${spouse.ten}** phát hiện và lao vào ngăn chặn nhưng đáng tiếc bị đánh bại!\n` +
                `🏆 **Cướp đoạt thành công!** Kẻ ác nhân **${tuSiA.ten}** thắng cuộc và lấy đi tài vật!\n\n` +
                `• **Số linh thạch cướp được**: \`+${stolen.toLocaleString()}\` Linh thạch từ **${tuSiB.ten}**.\n\n`;
            } else {
              title = '💀 Cướp Đoạt Thất Bại (Bị Phu Thê Đánh Bại)';
              color = 0xe74c3c;
              const penalty = Math.floor(tuSiA.linhThach * 0.05);
              const eqA = await loadEquippedItems(tuSiA.idNguoiDung);
              const statsA = tuSiA.layChiSo(eqA.inv);

              tuSiA.linhThach -= penalty;
              spouse.linhThach += penalty; // Send penalty to spouse S
              tuSiA.hp = Math.max(1, tuSiA.hp - Math.floor(statsA.max_hp * 0.30));

              await tuSiA.save();
              await spouse.save();

              description = `💥 Đạo hữu **${tuSiA.ten}** định cướp đoạt **${tuSiB.ten}**, nhưng phu quân/nương tử của họ là **${spouse.ten}** đã kịp thời xuất hiện ngăn cản và ra tay tỉ thí!\n` +
                `🏆 **Phu thê thủ hộ thành công!** **${spouse.ten}** đánh bại kẻ xấu xa **${tuSiA.ten}**!\n\n` +
                `• **Bồi thường phạt tổn hại**: Khấu trừ \`-${penalty.toLocaleString()}\` Linh thạch chuyển cho **${spouse.ten}**.\n` +
                `• **Tổn thương nhận lấy**: Trừ \`-30% HP\` tối đa.\n\n`;
            }

            const renderPage = (pageIdx) => {
              const start = pageIdx * 15;
              const end = start + 15;
              const pageLogs = battleLogs.slice(start, end).join('\n') || 'Trận đấu không có nhật ký ở trang này.';

              const embed = new EmbedBuilder()
                .setTitle(`${title} (Trang ${pageIdx + 1}/${totalPages})`)
                .setColor(color)
                .setDescription(
                  description +
                  `⚔️ Cuộc tỷ thí ngăn chặn cướp đoạt kết thúc sau ${round - 1} hiệp!\n\n` +
                  `📜 **Nhật ký chiến đấu**:\n` +
                  pageLogs
                )
                .setTimestamp();

              const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('btn_prev')
                  .setLabel('◀️ Trang Trước')
                  .setStyle(ButtonStyle.Primary)
                  .setDisabled(pageIdx === 0),
                new ButtonBuilder()
                  .setCustomId('btn_next')
                  .setLabel('Trang Sau ▶️')
                  .setStyle(ButtonStyle.Primary)
                  .setDisabled(pageIdx === totalPages - 1)
              );

              return { embeds: [embed], components: totalPages > 1 ? [row] : [] };
            };

            const replyMsg = await i.editReply(renderPage(currentPageIdx));

            if (totalPages > 1) {
              const pageCollector = replyMsg.createMessageComponentCollector({
                filter: btnInt => btnInt.user.id === interaction.user.id,
                time: 180_000
              });

              pageCollector.on('collect', async btnInt => {
                await btnInt.deferUpdate();
                if (btnInt.customId === 'btn_prev') {
                  currentPageIdx = Math.max(0, currentPageIdx - 1);
                } else if (btnInt.customId === 'btn_next') {
                  currentPageIdx = Math.min(totalPages - 1, currentPageIdx + 1);
                }
                await btnInt.editReply(renderPage(currentPageIdx));
              });

              pageCollector.on('end', async () => {
                try {
                  const finalState = renderPage(currentPageIdx);
                  if (finalState.components.length > 0) {
                    const disabledRow = new ActionRowBuilder().addComponents(
                      finalState.components[0].components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
                    );
                    await interaction.editReply({ components: [disabledRow] });
                  }
                } catch (e) {
                  // Ignore errors
                }
              });
            }
          } else {
            // Normal plunder logic
            const levelDiff = tuSiA.capDo - tuSiB.capDo;
            let successChance = 0.40 + (levelDiff * 0.05);
            successChance = Math.max(0.05, Math.min(0.50, successChance));

            const roll = Math.random();
            if (roll <= successChance) {
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
              const penalty = Math.floor(tuSiA.linhThach * 0.05);
              const eqA = await loadEquippedItems(tuSiA.idNguoiDung);
              const statsA = tuSiA.layChiSo(eqA.inv);

              tuSiA.linhThach -= penalty;
              tuSiB.linhThach += penalty;
              tuSiA.hp = Math.max(1, tuSiA.hp - Math.floor(statsA.max_hp * 0.30));

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
        }

        else if (i.customId === 'tt_songtu') {
          // Check spouse protection
          let spouse = null;
          if (tuSiB.duyenType === 'hon_phu' && tuSiB.duyenUserId && String(tuSiB.duyenUserId) !== String(tuSiA.idNguoiDung)) {
            const { TuSi } = await import('../models/TuSi.js');
            const foundSpouse = await TuSi.findOne({ where: { idNguoiDung: tuSiB.duyenUserId } });
            if (foundSpouse && String(foundSpouse.duyenUserId) === String(tuSiB.idNguoiDung) && foundSpouse.duyenType === 'hon_phu') {
              spouse = foundSpouse;
            }
          }

          if (spouse) {
            collector.stop('finished');

            const { winner, battleLogs, round } = await _simCombat(tuSiA, spouse);

            const totalPages = Math.ceil(battleLogs.length / 15);
            let currentPageIdx = 0;

            let title = '';
            let color = 0;
            let description = '';

            if (winner.idNguoiDung === spouse.idNguoiDung) {
              title = '💢 Ngăn Chặn Song Tu (Phu Thê Chiến Thắng)';
              color = 0xe74c3c;
              description = `💢 Đạo hữu **${tuSiA.ten}** định gạ gẫm song tu với **${tuSiB.ten}** nhưng đã bị phu quân/nương tử của họ là **${spouse.ten}** phát hiện kịp thời và đánh cho một trận tơi tả!\n\n`;
            } else {
              title = '💢 Phá Vỡ Song Tu (Kẻ Gạ Gẫm Chiến Thắng)';
              color = 0xe67e22;
              description = `💢 Đạo hữu **${tuSiA.ten}** định gạ gẫm song tu với **${tuSiB.ten}**. Phu quân/nương tử **${spouse.ten}** lao vào ngăn cản nhưng đáng tiếc bị đánh bại! Dẫu vậy, mối giao tình song tu vẫn bị phá vỡ.\n\n`;
            }

            const renderPage = (pageIdx) => {
              const start = pageIdx * 15;
              const end = start + 15;
              const pageLogs = battleLogs.slice(start, end).join('\n') || 'Trận đấu không có nhật ký ở trang này.';

              const embed = new EmbedBuilder()
                .setTitle(`${title} (Trang ${pageIdx + 1}/${totalPages})`)
                .setColor(color)
                .setDescription(
                  description +
                  `⚔️ Trận đánh ghen kết thúc sau ${round - 1} hiệp!\n\n` +
                  `📜 **Nhật ký chiến đấu**:\n` +
                  pageLogs
                )
                .setTimestamp();

              const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('btn_prev')
                  .setLabel('◀️ Trang Trước')
                  .setStyle(ButtonStyle.Primary)
                  .setDisabled(pageIdx === 0),
                new ButtonBuilder()
                  .setCustomId('btn_next')
                  .setLabel('Trang Sau ▶️')
                  .setStyle(ButtonStyle.Primary)
                  .setDisabled(pageIdx === totalPages - 1)
              );

              return { embeds: [embed], components: totalPages > 1 ? [row] : [] };
            };

            const replyMsg = await i.editReply(renderPage(currentPageIdx));

            if (totalPages > 1) {
              const pageCollector = replyMsg.createMessageComponentCollector({
                filter: btnInt => btnInt.user.id === interaction.user.id,
                time: 180_000
              });

              pageCollector.on('collect', async btnInt => {
                await btnInt.deferUpdate();
                if (btnInt.customId === 'btn_prev') {
                  currentPageIdx = Math.max(0, currentPageIdx - 1);
                } else if (btnInt.customId === 'btn_next') {
                  currentPageIdx = Math.min(totalPages - 1, currentPageIdx + 1);
                }
                await btnInt.editReply(renderPage(currentPageIdx));
              });

              pageCollector.on('end', async () => {
                try {
                  const finalState = renderPage(currentPageIdx);
                  if (finalState.components.length > 0) {
                    const disabledRow = new ActionRowBuilder().addComponents(
                      finalState.components[0].components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
                    );
                    await interaction.editReply({ components: [disabledRow] });
                  }
                } catch (e) {
                  // Ignore errors
                }
              });
            }
          } else {
            // Normal song tu logic
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

            const newAffinity = await config.tangLuongDuyen(tuSiA.idNguoiDung, tuSiB.idNguoiDung, 1);

            const resultEmbed = new EmbedBuilder()
              .setTitle('💖 Song Tu Đại Điển Thành Công')
              .setColor(0x2ecc71)
              .setDescription(
                `☯️ Đạo hóa lưỡng nghi! **${tuSiA.ten}** và **${tuSiB.ten}** ngồi đối diện tâm linh hòa quyện, linh lực lưu chuyển thông suốt 36 chu thiên!\n\n` +
                `• **${tuSiA.ten}** nhận được: \`+${bonusA.toLocaleString()}\` EXP Linh Lực.\n` +
                `• **${tuSiB.ten}** nhận được: \`+${bonusB.toLocaleString()}\` EXP Linh Lực.\n\n` +
                `✨ Điểm lương duyên giữa cả hai tăng thêm **+1**! (Hiện tại: \`${newAffinity}\` điểm)`
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

        // ══════════════════════════════════════════════════════════════
        // 6. KẾT DUYÊN TIÊN NHÂN (RELATIONSHIPS)
        // ══════════════════════════════════════════════════════════════
        else if (i.customId === 'tt_ketduyen') {
          // 1. Kiểm tra xem 2 bên đã có mối duyên chưa
          if (tuSiA.duyenType && tuSiA.duyenUserId) {
            await i.editReply({
              embeds: [BoTaoEmbed.loi("Đạo hữu đã có mối duyên khắc ghi trên tiên phả! Muốn kết duyên mới phải cắt đứt mối duyên cũ.")],
              components: []
            });
            collector.stop('finished');
            return;
          }
          if (tuSiB.duyenType && tuSiB.duyenUserId) {
            await i.editReply({
              embeds: [BoTaoEmbed.loi(`Đạo hữu **${tuSiB.ten}** đã có mối duyên khắc ghi trên tiên phả!`)],
              components: []
            });
            collector.stop('finished');
            return;
          }

          selectedOption = 'KET_DUYEN_CHOOSE';
          const affinity = await config.layLuongDuyen(tuSiA.idNguoiDung, tuSiB.idNguoiDung);

          const embed = new EmbedBuilder()
            .setTitle('🧬 Kết Duyên Tiên Nhân')
            .setColor(0xe84393)
            .setDescription(
              `Muốn kết duyên cùng đạo hữu **${tuSiB.ten}** phải đạt điều kiện cần thiết:\n\n` +
              `• **Lương duyên hiện tại**: \`${affinity} / 10\` điểm (Tích lũy qua Truyền công hoặc Song tu).\n` +
              `• **Huynh Đệ / Tỷ Muội**: Cần \`10\` Lương duyên.\n` +
              `• **Hôn Phu**: Cần \`10\` Lương duyên & \`500,000\` Linh Thạch làm hồi môn.\n\n` +
              `Hãy chọn hình thức kết duyên dưới đây:`
            );

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('kd_huynhde')
              .setLabel('🤝 Huynh Đệ (10 Lương Duyên)')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(affinity < 10),
            new ButtonBuilder()
              .setCustomId('kd_tymuoi')
              .setLabel('🌸 Tỷ Muội (10 Lương Duyên)')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(affinity < 10),
            new ButtonBuilder()
              .setCustomId('kd_honphu')
              .setLabel('💍 Hôn Phu (10 Lương Duyên & 500k)')
              .setStyle(ButtonStyle.Success)
              .setDisabled(affinity < 10 || tuSiA.linhThach < 500000),
            new ButtonBuilder()
              .setCustomId('kd_cancel')
              .setLabel('↩️ Quay Lại')
              .setStyle(ButtonStyle.Danger)
          );

          await i.editReply({ embeds: [embed], components: [row] });
        }

        else if (selectedOption === 'KET_DUYEN_CHOOSE') {
          if (i.customId === 'kd_cancel') {
            selectedOption = null;
            await i.editReply({ embeds: [buildMainEmbed()], components: buildMainButtons() });
            return;
          }

          let typeLabel = '';
          let chosenType = '';
          if (i.customId === 'kd_huynhde') {
            chosenType = 'huynh_de';
            typeLabel = 'Huynh Đệ 🤝';
          } else if (i.customId === 'kd_tymuoi') {
            chosenType = 'ty_muoi';
            typeLabel = 'Tỷ Muội 🌸';
          } else if (i.customId === 'kd_honphu') {
            chosenType = 'hon_phu';
            typeLabel = 'Hôn Phu 💍';
          }

          selectedOption = `KET_DUYEN_INVITE_${chosenType}`;

          const embed = new EmbedBuilder()
            .setTitle('🧬 Lời Cầu Duyên Tiên Môn')
            .setColor(0xe84393)
            .setDescription(
              `Đạo hữu **${tuSiA.ten}** long trọng gửi lời mời kết duyên **${typeLabel}** tới **${tuSiB.ten}**!\n` +
              (chosenType === 'hon_phu' ? `• **Sính lễ/Hồi môn**: \`500,000\` Linh Thạch.\n` : '') +
              `Hai bên kết duyên sẽ đồng tâm tương trợ, kích hoạt hiệu ứng gia tăng tu vi vĩnh viễn.\n\n` +
              `*Lưu ý: Chỉ có đạo hữu được mời <@${tuSiB.idNguoiDung}> mới có quyền bấm đồng ý.*`
            );

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('kd_accept').setLabel('🤝 Đồng Ý').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('kd_decline').setLabel('❌ Từ Chối').setStyle(ButtonStyle.Danger)
          );

          await i.editReply({ embeds: [embed], components: [row] });
        }

        else if (selectedOption && selectedOption.startsWith('KET_DUYEN_INVITE_') && i.user.id === targetUser.id) {
          const chosenType = selectedOption.replace('KET_DUYEN_INVITE_', '');
          collector.stop('finished');

          if (i.customId === 'kd_accept') {
            // Tái kiểm tra sính lễ và cờ duyên
            await tuSiA.reload();
            await tuSiB.reload();

            if (tuSiA.duyenType || tuSiB.duyenType) {
              await i.editReply({ embeds: [BoTaoEmbed.loi("Đã có một trong hai vị đạo hữu đã kết duyên từ trước.")], components: [] });
              return;
            }

            const affinity = await config.layLuongDuyen(tuSiA.idNguoiDung, tuSiB.idNguoiDung);
            if (affinity < 10) {
              await i.editReply({ embeds: [BoTaoEmbed.loi("Lương duyên tích lũy bất túc (Cần 10 điểm).")], components: [] });
              return;
            }

            if (chosenType === 'hon_phu' && tuSiA.linhThach < 500000) {
              await i.editReply({ embeds: [BoTaoEmbed.loi(`Đạo hữu **${tuSiA.ten}** không đủ 500,000 Linh Thạch để chi trả hồi môn.`)], components: [] });
              return;
            }

            // Thực hiện kết duyên
            if (chosenType === 'hon_phu') {
              tuSiA.linhThach -= 500000;
            }
            tuSiA.duyenType = chosenType;
            tuSiA.duyenUserId = tuSiB.idNguoiDung;
            tuSiB.duyenType = chosenType;
            tuSiB.duyenUserId = tuSiA.idNguoiDung;

            await tuSiA.save();
            await tuSiB.save();

            let typeLabel = '';
            let buffLabel = '';
            if (chosenType === 'huynh_de') {
              typeLabel = 'Huynh Đệ Đồng Tâm 🤝';
              buffLabel = 'Huynh Đệ Đồng Tâm (+30% trung bình cộng tu tốc)';
            } else if (chosenType === 'ty_muoi') {
              typeLabel = 'Tỷ Muội Kim Lan 🌸';
              buffLabel = 'Tỷ Muội Kim Lan (+30% trung bình cộng tu tốc)';
            } else if (chosenType === 'hon_phu') {
              typeLabel = 'Đồng Tâm Hiệp Lực 💍';
              buffLabel = 'Đồng Tâm Hiệp Lực (+50% trung bình cộng tu tốc)';
            }

            const resultEmbed = new EmbedBuilder()
              .setTitle('💖 Tiên Duyên Gắn Kết Thành Công')
              .setColor(0x2ecc71)
              .setDescription(
                `🎉 Giao thề kết nghĩa! **${tuSiA.ten}** và **${tuSiB.ten}** đã chính thức kết duyên thành công!\n\n` +
                `• **Mối nhân duyên**: \`${typeLabel}\`\n` +
                `• **Hiệu ứng kích hoạt**: \`${buffLabel}\` vĩnh viễn.\n` +
                (chosenType === 'hon_phu' ? `• **Phí hồi môn khấu trừ**: \`-500,000 Linh Thạch\` từ **${tuSiA.ten}**.` : '')
              )
              .setTimestamp();

            await i.editReply({ embeds: [resultEmbed], components: [] });
          } else {
            const resultEmbed = new EmbedBuilder()
              .setTitle('❌ Lời Mời Cầu Duyên Bị Từ Chối')
              .setColor(0xe74c3c)
              .setDescription(`Đạo hữu **${tuSiB.ten}** đã khéo léo từ chối đề nghị kết duyên lần này.`)
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

  lenhBoThi = {
    data: new SlashCommandBuilder()
      .setName('bothi')
      .setDescription('Bố thí/Chuyển giao Linh Thạch cho đạo hữu khác')
      .addUserOption(option => 
        option.setName('user')
          .setDescription('Người nhận Linh Thạch')
          .setRequired(true)
      )
      .addStringOption(option =>
        option.setName('luong')
          .setDescription('Số lượng Linh Thạch (hỗ trợ viết tắt k, m, b, ví dụ: 100k, 2.5m, 1b)')
          .setRequired(true)
      ),

    execute: async (interaction) => {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user');
      const amountStr = interaction.options.getString('luong');

      if (targetUser.id === interaction.user.id) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Đạo hữu không thể tự bố thí cho bản thân!")]
        });
      }

      const tuSiSender = await this.layTuSi(interaction.user.id);
      if (!tuSiSender) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      const tuSiReceiver = await this.layTuSi(targetUser.id);
      if (!tuSiReceiver) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Đối phương chưa tham gia Tiên Giới (chưa tạo nhân vật).")]
        });
      }

      const amount = parseLinhThachAmount(amountStr);
      if (amount === null || amount <= 0) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Số lượng Linh Thạch không hợp lệ. Vui lòng nhập số dương (hỗ trợ viết tắt k, m, b, ví dụ: 100k, 2.5m, 1b).")]
        });
      }

      if (tuSiSender.linhThach < amount) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(`Đạo hữu không có đủ Linh Thạch! Số dư hiện tại: \`${tuSiSender.linhThach.toLocaleString()}\` 🪙 Linh Thạch.`)]
        });
      }

      tuSiSender.linhThach -= amount;
      tuSiReceiver.linhThach += amount;
      await tuSiSender.save();
      await tuSiReceiver.save();

      const embed = new EmbedBuilder()
        .setTitle('🤝 Bố Thí Linh Thạch Thành Công!')
        .setColor(0x2ecc71)
        .setDescription(
          `✨ Nhân quả tuần hoàn! **${tuSiSender.ten}** đã bố thí thành công cho **${tuSiReceiver.ten}**:\n\n` +
          `• **Lượng chuyển giao**: \`+${amount.toLocaleString()}\` 🪙 Linh Thạch.\n` +
          `• **Số dư của ngươi**: \`${tuSiSender.linhThach.toLocaleString()}\` 🪙 Linh Thạch.`
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  };
}

function parseLinhThachAmount(str) {
  if (!str) return null;
  const clean = str.trim().toLowerCase();
  
  const match = clean.match(/^([\d.]+)\s*([kmb]?)$/);
  if (!match) return null;
  
  const numPart = parseFloat(match[1]);
  if (isNaN(numPart) || numPart <= 0) return null;
  
  const suffix = match[2];
  let multiplier = 1;
  if (suffix === 'k') multiplier = 1000;
  else if (suffix === 'm') multiplier = 1000000;
  else if (suffix === 'b') multiplier = 1000000000;
  
  return Math.floor(numPart * multiplier);
}

// Helper giả lập giao chiến theo hiệp (turn-based) giữa 2 tu sĩ
async function _simCombat(tuSiA, tuSiB) {
  const { PlayerSkill } = await import('../models/PlayerSkill.js');
  const { Skill } = await import('../models/Skill.js');
  const { Pet } = await import('../models/Pet.js');
  const { Inventory } = await import('../models/Inventory.js');
  const { Item } = await import('../models/Item.js');
  const config = await import('../config.js');

  const eqA = await loadEquippedItems(tuSiA.idNguoiDung);
  const eqB = await loadEquippedItems(tuSiB.idNguoiDung);
  let petA = await Pet.findOne({ where: { userId: tuSiA.idNguoiDung, isActive: true } });
  let petB = await Pet.findOne({ where: { userId: tuSiB.idNguoiDung, isActive: true } });
  if (petA) {
    const check = config.checkHuyetMachApChe(tuSiA.capDo, petA.rarity);
    if (!check.allowed) petA = null;
  }
  if (petB) {
    const check = config.checkHuyetMachApChe(tuSiB.capDo, petB.rarity);
    if (!check.allowed) petB = null;
  }

  const statsA = tuSiA.layChiSo(eqA.inv, petA);
  const statsB = tuSiB.layChiSo(eqB.inv, petB);

  let hpA = statsA.max_hp;
  let hpB = statsB.max_hp;

  const learnedA = await PlayerSkill.findAll({ where: { idNguoiDung: tuSiA.idNguoiDung, trangBi: true } });
  const skillsA = [];
  for (const psk of learnedA) {
    const detail = await Skill.findByPk(psk.skillId);
    if (detail) {
      skillsA.push({ detail, capDo: psk.capDo, nextRoundAvailable: 1 });
    }
  }

  const learnedB = await PlayerSkill.findAll({ where: { idNguoiDung: tuSiB.idNguoiDung, trangBi: true } });
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

  const activeBuffsA = [];
  const activeBuffsB = [];
  let shieldA = 0;
  let shieldB = 0;
  let mpA = statsA.max_mp;
  let mpB = statsB.max_mp;
  let slowRoundsA = 0;
  let slowPctA = 0;
  let slowRoundsB = 0;
  let slowPctB = 0;
  let stunnedRoundsA = 0;
  let stunnedRoundsB = 0;
  let weakenRoundsA = 0;
  let weakenPctA = 0;
  let weakenRoundsB = 0;
  let weakenPctB = 0;
  let linhiPhaoDebuffA = 0;
  let linhiPhaoDebuffB = 0;
  let tuKhiActiveA = 0;
  let chienYStacksA = 0;
  let chienYDurationA = 0;
  let linhPhaoDebuffA = 0;
  let tuKhiActiveB = 0;
  let chienYStacksB = 0;
  let chienYDurationB = 0;
  let linhPhaoDebuffB = 0;

  // Player A Pet States
  const petStateA = { cooldown: 0 };
  let bleedA = null;
  let blindA = 0;
  let slowA = 0;
  let tebutA = 0;
  let nightmareA = 0;
  let hoitoA = 0;
  let caituA = 0;
  let caituTriggeredA = false;
  let critImmuneA = false;
  let reflectA = false;
  let tanKhiRoundsA = 0;
  let tanKhiPctA = 0;

  // Player B Pet States
  const petStateB = { cooldown: 0 };
  let bleedB = null;
  let blindB = 0;
  let slowB = 0;
  let tebutB = 0;
  let nightmareB = 0;
  let hoitoB = 0;
  let caituB = 0;
  let caituTriggeredB = false;
  let critImmuneB = false;
  let reflectB = false;
  let tanKhiRoundsB = 0;
  let tanKhiPctB = 0;

  // Pháp bảo chủ động A
  const dharmaA = eqA.inv.filter(x => x.item.loai === 'Pháp Bảo');
  for (const eq of dharmaA) {
    const activeSkill = config.layKyNangPhapBaoActive(eq.item || eq.itemId, statsA);
    if (activeSkill) {
      if (activeSkill.loai === 'tan_cong') {
        hpB = Math.max(0, hpB - activeSkill.triGia);
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiA.ten}** kích hoạt **${activeSkill.ten}**, gây \`${activeSkill.triGia}\` sát thương lên **${tuSiB.ten}** (HP còn: \`${hpB}\`).`);
      } else if (activeSkill.loai === 'hoi_mau_pct') {
        const healAmt = Math.floor(statsA.max_hp * (activeSkill.triGia / 100));
        hpA = Math.min(statsA.max_hp, hpA + healAmt);
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiA.ten}** kích hoạt **${activeSkill.ten}**, hồi phục \`+${healAmt}\` HP (Hiện tại: \`${hpA}/${statsA.max_hp}\`).`);
      } else if (activeSkill.loai === 'tang_cong_pct') {
        if (activeSkill.ten.includes("Cuồng Hóa Chiến Ý")) {
          const hpSacrifice = Math.floor(hpA * 0.10);
          hpA = Math.max(1, hpA - hpSacrifice);
          battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiA.ten}** kích hoạt **${activeSkill.ten}**, tiêu hao \`-${hpSacrifice}\` HP.`);
        }
        activeBuffsA.push({
          ten: activeSkill.ten,
          pbTen: eq.item.ten,
          loai: 'tang_cong_pct',
          triGia: activeSkill.triGia,
          roundsLeft: activeSkill.duration
        });
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiA.ten}** kích hoạt **${activeSkill.ten}**, gia tăng \`+${activeSkill.triGia}%\` Công kích trong \`${activeSkill.duration}\` hiệp.`);
      } else if (activeSkill.loai === 'khien') {
        shieldA = (shieldA || 0) + activeSkill.triGia;
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiA.ten}** kích hoạt **${activeSkill.ten}**, tạo khiên chắn \`+${activeSkill.triGia}\` HP (Khiên hiện tại: \`${shieldA}\`).`);
      } else if (activeSkill.loai === 'hon_hop') {
        hpB = Math.max(0, hpB - activeSkill.triGia);
        shieldA = (shieldA || 0) + activeSkill.triGiaKhien;
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiA.ten}** kích hoạt **${activeSkill.ten}**, gây \`${activeSkill.triGia}\` sát thương lên **${tuSiB.ten}** (HP còn: \`${hpB}\`) và tạo khiên chắn \`+${activeSkill.triGiaKhien}\` HP (Khiên hiện tại: \`${shieldA}\`).`);
      } else if (activeSkill.loai === 'khong_che') {
        if (Math.random() <= activeSkill.chance) {
          stunnedRoundsB = activeSkill.duration;
          battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiA.ten}** kích hoạt **${activeSkill.ten}**, khiến đối phương bị **Đóng Băng (mất lượt) trong ${activeSkill.duration} hiệp**!`);
        } else {
          battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiA.ten}** kích hoạt **${activeSkill.ten}** nhưng bị đối phương kháng cự!`);
        }
      } else if (activeSkill.loai === 'hoi_hp') {
        hpA = Math.min(statsA.max_hp, hpA + activeSkill.triGia);
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiA.ten}** kích hoạt **${activeSkill.ten}**, hồi phục lập tức \`+${activeSkill.triGia}\` HP (Hiện tại: \`${hpA}/${statsA.max_hp}\`).`);
      } else if (activeSkill.loai === 'hoi_mp') {
        mpA = Math.min(statsA.max_mp, mpA + activeSkill.triGia);
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiA.ten}** kích hoạt **${activeSkill.ten}**, hồi phục lập tức \`+${activeSkill.triGia}\` MP (Hiện tại: \`${mpA}/${statsA.max_mp}\`).`);
      } else if (activeSkill.loai === 'tu_khi_ky') {
        activeBuffsA.push({
          ten: activeSkill.ten,
          pbTen: eq.item.ten,
          loai: 'tu_khi_ky',
          triGia: activeSkill.triGia,
          speedBonus: activeSkill.speedBonus,
          roundsLeft: activeSkill.duration
        });
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiA.ten}** kích hoạt **${activeSkill.ten}**, tăng \`+${activeSkill.triGia}%\` Pháp Công và \`+${activeSkill.speedBonus}\` Tốc độ trong \`${activeSkill.duration}\` hiệp.`);
      } else if (activeSkill.loai === 'thach_phu_thuan') {
        shieldA = (shieldA || 0) + activeSkill.triGia;
        activeBuffsA.push({
          ten: activeSkill.ten,
          pbTen: eq.item.ten,
          loai: 'thach_phu_thuan',
          roundsLeft: activeSkill.duration
        });
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiA.ten}** kích hoạt **${activeSkill.ten}**, tạo khiên \`+${activeSkill.triGia}\` HP và tăng \`+30%\` Phòng thủ trong \`${activeSkill.duration}\` hiệp.`);
      } else if (activeSkill.loai === 'u_thiet_lien') {
        const dmg = activeSkill.triGia;
        hpB = Math.max(0, hpB - dmg);
        activeBuffsB.push({
          ten: activeSkill.ten,
          pbTen: eq.item.ten,
          loai: 'u_thiet_lien_debuff',
          roundsLeft: activeSkill.duration
        });
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiA.ten}** kích hoạt **${activeSkill.ten}**, gây \`${dmg}\` sát thương và giảm \`5\` Tốc độ của đối phương trong \`${activeSkill.duration}\` hiệp.`);
      } else if (activeSkill.loai === 'chien_co') {
        activeBuffsA.push({
          ten: activeSkill.ten,
          pbTen: eq.item.ten,
          loai: 'chien_co',
          triGia: activeSkill.triGia,
          roundsLeft: activeSkill.duration
        });
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiA.ten}** kích hoạt **${activeSkill.ten}**, tăng \`+${activeSkill.triGia}%\` Vật Công và \`+5%\` Bạo kích trong \`${activeSkill.duration}\` hiệp.`);
      }
    }
  }

  // Pháp bảo chủ động B
  const dharmaB = eqB.inv.filter(x => x.item.loai === 'Pháp Bảo');
  for (const eq of dharmaB) {
    const activeSkill = config.layKyNangPhapBaoActive(eq.item || eq.itemId, statsB);
    if (activeSkill) {
      if (activeSkill.loai === 'tan_cong') {
        hpA = Math.max(0, hpA - activeSkill.triGia);
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiB.ten}** kích hoạt **${activeSkill.ten}**, gây \`${activeSkill.triGia}\` sát thương lên **${tuSiA.ten}** (HP còn: \`${hpA}\`).`);
      } else if (activeSkill.loai === 'hoi_mau_pct') {
        const healAmt = Math.floor(statsB.max_hp * (activeSkill.triGia / 100));
        hpB = Math.min(statsB.max_hp, hpB + healAmt);
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiB.ten}** kích hoạt **${activeSkill.ten}**, hồi phục \`+${healAmt}\` HP (Hiện tại: \`${hpB}/${statsB.max_hp}\`).`);
      } else if (activeSkill.loai === 'tang_cong_pct') {
        if (activeSkill.ten.includes("Cuồng Hóa Chiến Ý")) {
          const hpSacrifice = Math.floor(hpB * 0.10);
          hpB = Math.max(1, hpB - hpSacrifice);
          battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiB.ten}** kích hoạt **${activeSkill.ten}**, tiêu hao \`-${hpSacrifice}\` HP.`);
        }
        activeBuffsB.push({
          ten: activeSkill.ten,
          pbTen: eq.item.ten,
          loai: 'tang_cong_pct',
          triGia: activeSkill.triGia,
          roundsLeft: activeSkill.duration
        });
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiB.ten}** kích hoạt **${activeSkill.ten}**, gia tăng \`+${activeSkill.triGia}%\` Công kích trong \`${activeSkill.duration}\` hiệp.`);
      } else if (activeSkill.loai === 'khien') {
        shieldB = (shieldB || 0) + activeSkill.triGia;
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiB.ten}** kích hoạt **${activeSkill.ten}**, tạo khiên chắn \`+${activeSkill.triGia}\` HP (Khiên hiện tại: \`${shieldB}\`).`);
      } else if (activeSkill.loai === 'hon_hop') {
        hpA = Math.max(0, hpA - activeSkill.triGia);
        shieldB = (shieldB || 0) + activeSkill.triGiaKhien;
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiB.ten}** kích hoạt **${activeSkill.ten}**, gây \`${activeSkill.triGia}\` sát thương lên **${tuSiA.ten}** (HP còn: \`${hpA}\`) và tạo khiên chắn \`+${activeSkill.triGiaKhien}\` HP (Khiên hiện tại: \`${shieldB}\`).`);
      } else if (activeSkill.loai === 'khong_che') {
        if (Math.random() <= activeSkill.chance) {
          stunnedRoundsA = activeSkill.duration;
          battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiB.ten}** kích hoạt **${activeSkill.ten}**, khiến đối phương bị **Đóng Băng (mất lượt) trong ${activeSkill.duration} hiệp**!`);
        } else {
          battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiB.ten}** kích hoạt **${activeSkill.ten}** nhưng bị đối phương kháng cự!`);
        }
      } else if (activeSkill.loai === 'hoi_hp') {
        hpB = Math.min(statsB.max_hp, hpB + activeSkill.triGia);
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiB.ten}** kích hoạt **${activeSkill.ten}**, hồi phục lập tức \`+${activeSkill.triGia}\` HP (Hiện tại: \`${hpB}/${statsB.max_hp}\`).`);
      } else if (activeSkill.loai === 'hoi_mp') {
        mpB = Math.min(statsB.max_mp, mpB + activeSkill.triGia);
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiB.ten}** kích hoạt **${activeSkill.ten}**, hồi phục lập tức \`+${activeSkill.triGia}\` MP (Hiện tại: \`${mpB}/${statsB.max_mp}\`).`);
      } else if (activeSkill.loai === 'tu_khi_ky') {
        activeBuffsB.push({
          ten: activeSkill.ten,
          pbTen: eq.item.ten,
          loai: 'tu_khi_ky',
          triGia: activeSkill.triGia,
          speedBonus: activeSkill.speedBonus,
          roundsLeft: activeSkill.duration
        });
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiB.ten}** kích hoạt **${activeSkill.ten}**, tăng \`+${activeSkill.triGia}%\` Pháp Công và \`+${activeSkill.speedBonus}\` Tốc độ trong \`${activeSkill.duration}\` hiệp.`);
      } else if (activeSkill.loai === 'thach_phu_thuan') {
        shieldB = (shieldB || 0) + activeSkill.triGia;
        activeBuffsB.push({
          ten: activeSkill.ten,
          pbTen: eq.item.ten,
          loai: 'thach_phu_thuan',
          roundsLeft: activeSkill.duration
        });
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiB.ten}** kích hoạt **${activeSkill.ten}**, tạo khiên \`+${activeSkill.triGia}\` HP và tăng \`+30%\` Phòng thủ trong \`${activeSkill.duration}\` hiệp.`);
      } else if (activeSkill.loai === 'u_thiet_lien') {
        const dmg = activeSkill.triGia;
        hpA = Math.max(0, hpA - dmg);
        activeBuffsA.push({
          ten: activeSkill.ten,
          pbTen: eq.item.ten,
          loai: 'u_thiet_lien_debuff',
          roundsLeft: activeSkill.duration
        });
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiB.ten}** kích hoạt **${activeSkill.ten}**, gây \`${dmg}\` sát thương và giảm \`5\` Tốc độ của đối phương trong \`${activeSkill.duration}\` hiệp.`);
      } else if (activeSkill.loai === 'chien_co') {
        activeBuffsB.push({
          ten: activeSkill.ten,
          pbTen: eq.item.ten,
          loai: 'chien_co',
          triGia: activeSkill.triGia,
          roundsLeft: activeSkill.duration
        });
        battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** của **${tuSiB.ten}** kích hoạt **${activeSkill.ten}**, tăng \`+${activeSkill.triGia}%\` Vật Công và \`+5%\` Bạo kích trong \`${activeSkill.duration}\` hiệp.`);
      }
    }
  }

  if (hpA <= 0 || hpB <= 0) {
    if (hpA <= 0 && hpB <= 0) {
      winner = hpA >= hpB ? tuSiA : tuSiB;
    } else if (hpA <= 0) {
      winner = tuSiB;
    } else {
      winner = tuSiA;
    }
  }

  const atkA = tuSiA.huongTu === 'The Tu' ? statsA.vat_cong : statsA.phap_cong;
  const defB = tuSiA.huongTu === 'The Tu' ? statsB.vat_phong : statsB.phap_phong;
  const atkB = tuSiB.huongTu === 'The Tu' ? statsB.vat_cong : statsB.phap_cong;
  const defA = tuSiB.huongTu === 'The Tu' ? statsA.vat_phong : statsA.phap_phong;

  // Điểm hành động (AV)
  const speedA = statsA.speed || 100;
  const speedB = statsB.speed || 100;

  let avPlayerA = 10000 / speedA;
  let avPlayerB = 10000 / speedB;

  const baseAvA = avPlayerA;
  const baseAvB = avPlayerB;

  let combatRound = 1;
  let actionCountA = 0;
  let actionCountB = 0;

  while (hpA > 0 && hpB > 0 && (actionCountA + actionCountB) < 300) {
    // Recalculate dynamic speed for Player A
    let currentSpeedA = statsA.speed || 100;
    for (const buff of activeBuffsA) {
      if (buff.loai === 'huyet_mach_cuong_hoa' && buff.roundsLeft > 0) {
        currentSpeedA += buff.speedBonus;
      }
      if (buff.loai === 'tu_khi_ky' && buff.roundsLeft > 0) {
        currentSpeedA += buff.speedBonus;
      }
      if (buff.loai === 'bat_hoang_bo_buff' && buff.roundsLeft > 0) {
        currentSpeedA += buff.speedBonus;
      }
      if (buff.loai === 'u_thiet_lien_debuff' && buff.roundsLeft > 0) {
        currentSpeedA = Math.max(10, currentSpeedA - 5);
      }
    }
    if (chienYStacksA > 0 && chienYDurationA > 0) {
      const skillHKPTA = skillsA.find(s => s.detail.id === 'huyet_khi_phun_trao');
      const capDoHKPTA = skillHKPTA ? skillHKPTA.capDo : 1;
      const speedBonusPerStackA = Math.floor(2 * (1 + (capDoHKPTA - 1) * 0.01));
      currentSpeedA += chienYStacksA * speedBonusPerStackA;
    }
    if (linhPhaoDebuffA > 0) {
      currentSpeedA = Math.max(10, currentSpeedA - 3);
    }
    if (slowRoundsA > 0) {
      currentSpeedA = Math.max(10, Math.floor(currentSpeedA * (1 - slowPctA)));
    }
    if (slowA > 0) {
      currentSpeedA = Math.max(10, Math.floor(currentSpeedA * 0.85));
    }
    const dynamicBaseAvA = 10000 / currentSpeedA;

    // Recalculate dynamic speed for Player B
    let currentSpeedB = statsB.speed || 100;
    for (const buff of activeBuffsB) {
      if (buff.loai === 'huyet_mach_cuong_hoa' && buff.roundsLeft > 0) {
        currentSpeedB += buff.speedBonus;
      }
      if (buff.loai === 'tu_khi_ky' && buff.roundsLeft > 0) {
        currentSpeedB += buff.speedBonus;
      }
      if (buff.loai === 'bat_hoang_bo_buff' && buff.roundsLeft > 0) {
        currentSpeedB += buff.speedBonus;
      }
      if (buff.loai === 'u_thiet_lien_debuff' && buff.roundsLeft > 0) {
        currentSpeedB = Math.max(10, currentSpeedB - 5);
      }
    }
    if (chienYStacksB > 0 && chienYDurationB > 0) {
      const skillHKPTB = skillsB.find(s => s.detail.id === 'huyet_khi_phun_trao');
      const capDoHKPTB = skillHKPTB ? skillHKPTB.capDo : 1;
      const speedBonusPerStackB = Math.floor(2 * (1 + (capDoHKPTB - 1) * 0.01));
      currentSpeedB += chienYStacksB * speedBonusPerStackB;
    }
    if (linhPhaoDebuffB > 0) {
      currentSpeedB = Math.max(10, currentSpeedB - 3);
    }
    if (slowRoundsB > 0) {
      currentSpeedB = Math.max(10, Math.floor(currentSpeedB * (1 - slowPctB)));
    }
    if (slowB > 0) {
      currentSpeedB = Math.max(10, Math.floor(currentSpeedB * 0.85));
    }
    const dynamicBaseAvB = 10000 / currentSpeedB;

    if (avPlayerA <= avPlayerB) {
      // Lượt của Player A
      const elapsed = avPlayerA;
      avPlayerB -= elapsed;
      avPlayerA = dynamicBaseAvA;

      if (blindA > 0) blindA--;
      if (slowA > 0) slowA--;
      if (tebutA > 0) tebutA--;
      if (caituA > 0) caituA--;

      if (bleedA && bleedA.turns > 0) {
        const bleedDmg = bleedA.dmg;
        hpA = Math.max(0, hpA - bleedDmg);
        battleLogs.push(`🩸 **Chảy máu**: **${tuSiA.ten}** mất \`-${bleedDmg.toLocaleString()}\` HP do vết thương chảy máu (HP còn: \`${hpA.toLocaleString()}\`).`);
        bleedA.turns--;
        if (bleedA.turns <= 0) bleedA = null;
        if (hpA <= 0) {
          if (caituA > 0 && !caituTriggeredA) {
            caituTriggeredA = true;
            hpA = Math.floor(statsA.max_hp * 0.15);
            battleLogs.push(`😇 **Cải Tử Hoàn Sinh**: **${tuSiA.ten}** được cứu mạng bởi Linh thú, hồi phục lại \`${hpA.toLocaleString()}\` HP!`);
          } else {
            winner = tuSiB;
            break;
          }
        }
      }

      if (hoitoA > 0) {
        const healAmt = Math.floor(statsA.max_hp * 0.03);
        hpA = Math.min(statsA.max_hp, hpA + healAmt);
        battleLogs.push(`🌱 **Hồi Thổ**: **${tuSiA.ten}** hồi phục \`+${healAmt.toLocaleString()}\` HP (HP hiện tại: \`${hpA.toLocaleString()}\`).`);
        hoitoA--;
      }

      if (nightmareA > 0) {
        const mpLost = Math.floor(statsA.max_mp * 0.10);
        mpA = Math.max(0, mpA - mpLost);
        battleLogs.push(`💤 **Mộng Yểm**: **${tuSiA.ten}** bị chìm trong ác mộng, mất lượt hành động và tổn hao \`-${mpLost.toLocaleString()}\` MP!`);
        nightmareA--;
        actionCountA++;
        combatRound++;
        continue;
      }

      if (blindA > 0 && Math.random() <= 0.50) {
        battleLogs.push(`👁️ **Mù mắt**: **${tuSiA.ten}** đang bị [Mù], chiêu thức chệch hướng hoàn toàn!`);
        actionCountA++;
        combatRound++;
        continue;
      }

      // Active Pet A Skill Trigger
      if (petA && hpA > 0 && hpB > 0) {
        if (petStateA.cooldown > 0) petStateA.cooldown--;
        if (petStateA.cooldown === 0) {
          const res = config.handlePetCombatSkill(petA, petStateA, statsA, statsB, battleLogs, tuSiA.ten, tuSiB.ten, bleedB);
          if (res) {
            battleLogs.push(res.log);
            if (res.damage > 0) {
              let finalDmg = res.damage;
              if (res.ignoreDef) {
                const targetDef = statsB.vat_phong * (1.0 - res.ignoreDef);
                finalDmg = Math.max(1, Math.floor(finalDmg - targetDef));
              } else {
                finalDmg = Math.max(1, Math.floor(finalDmg - statsB.vat_phong));
              }
              if (res.checkTebutBonus && tebutB > 0) {
                const bonusTrue = Math.floor(hpB * 0.05);
                finalDmg += bonusTrue;
                battleLogs.push(`❄️ **Tê Buốt Kích Phát**: Sát thương sủng vật tăng thêm \`+${bonusTrue.toLocaleString()}\` sát thương chuẩn!`);
              }

              if (shieldB > 0) {
                const absorbed = Math.min(shieldB, finalDmg);
                shieldB -= absorbed;
                finalDmg -= absorbed;
                battleLogs.push(`🛡️ **Khiên chặn**: Khiên của **${tuSiB.ten}** hấp thụ \`${absorbed.toLocaleString()}\` sát thương (Khiên còn: \`${shieldB.toLocaleString()}\`).`);
              }
              if (finalDmg > 0) {
                hpB = Math.max(0, hpB - finalDmg);
                battleLogs.push(`💥 **Sát thương sủng vật**: **${tuSiB.ten}** nhận \`${finalDmg.toLocaleString()}\` sát thương sủng vật (HP còn: \`${hpB.toLocaleString()}\`).`);
                if (reflectB) {
                  const refDmg = Math.floor(finalDmg * 0.35);
                  hpA = Math.max(0, hpA - refDmg);
                  battleLogs.push(`🪞 **Phản đòn**: **${tuSiA.ten}** gánh chịu \`-${refDmg.toLocaleString()}\` sát thương phản chấn (HP còn: \`${hpA.toLocaleString()}\`).`);
                  if (hpA <= 0) {
                    if (caituA > 0 && !caituTriggeredA) {
                      caituTriggeredA = true;
                      hpA = Math.floor(statsA.max_hp * 0.15);
                      battleLogs.push(`😇 **Cải Tử Hoàn Sinh**: **${tuSiA.ten}** được cứu mạng bởi Linh thú, hồi phục lại \`${hpA.toLocaleString()}\` HP!`);
                    }
                  }
                }
              }
              if (res.execute && hpB > 0 && hpB < statsB.max_hp * 0.15) {
                hpB = 0;
                battleLogs.push(`💀 **KẾT LIỄU**: Sủng vật lập tức kết liễu **${tuSiB.ten}** dưới 15% HP!`);
              }
            }
            if (res.healHp > 0) {
              hpA = Math.min(statsA.max_hp, hpA + res.healHp);
              battleLogs.push(`💚 **Hồi phục**: **${tuSiA.ten}** hồi phục \`${res.healHp.toLocaleString()}\` HP.`);
            }
            if (res.healMp > 0) {
              mpA = Math.min(statsA.max_mp, mpA + res.healMp);
              battleLogs.push(`💙 **Hồi phục**: **${tuSiA.ten}** hồi phục \`${res.healMp.toLocaleString()}\` MP.`);
            }
            if (res.shield > 0) {
              shieldA = res.shield;
              if (res.critImmune) critImmuneA = true;
              if (res.reflectDmg) reflectA = true;
            }
            if (res.clearBleed) {
              bleedB = null;
            }
            if (res.applyBleed) bleedB = res.applyBleed;
            if (res.applyBlind) blindB = res.applyBlind.turns;
            if (res.applySlow) {
              slowB = res.applySlow.turns;
            }
            if (res.applyTebut) tebutB = res.applyTebut.turns;
            if (res.applyNightmare) nightmareB = res.applyNightmare.turns;
            if (res.applyHoito) hoitoA = res.applyHoito.turns;
            if (res.applyCaituhoansinh) caituA = res.applyCaituhoansinh.turns;
          }
        }
      }

      if (hpB <= 0) {
        if (caituB > 0 && !caituTriggeredB) {
          caituTriggeredB = true;
          hpB = Math.floor(statsB.max_hp * 0.15);
          battleLogs.push(`😇 **Cải Tử Hoàn Sinh**: **${tuSiB.ten}** được cứu mạng bởi Linh thú, hồi phục lại \`${hpB.toLocaleString()}\` HP!`);
        } else {
          winner = tuSiA;
          break;
        }
      }

      // Pháp Tướng Kim Cang Regen A
      for (const buff of activeBuffsA) {
        if (buff.loai === 'phap_tuong_kim_cang_regen' && buff.roundsLeft > 0) {
          const healAmt = Math.floor(statsA.max_hp * buff.triGia);
          hpA = Math.min(statsA.max_hp, hpA + healAmt);
          battleLogs.push(`❇️ **Pháp Tướng Kim Cang**: **${tuSiA.ten}** hồi phục \`+${healAmt.toLocaleString()}\` HP từ hư ảnh hộ pháp (HP hiện tại: \`${hpA}/${statsA.max_hp}\`).`);
        }
      }

      // Hỏa Lôi Đạp burn damage A -> B
      for (const buff of activeBuffsA) {
        if (buff.loai === 'hoa_loi_dap' && buff.roundsLeft > 0) {
          const burnDmg = Math.floor(statsA.vat_cong * buff.triGia);
          hpB = Math.max(0, hpB - burnDmg);
          battleLogs.push(`🔥 **Hỏa Lôi Đạp**: **${tuSiB.ten}** bị thiêu đốt chịu \`-${burnDmg.toLocaleString()}\` sát thương vật lý (HP còn: \`${hpB.toLocaleString()}\`).`);
        }
      }
      if (hpB <= 0) {
        if (caituB > 0 && !caituTriggeredB) {
          caituTriggeredB = true;
          hpB = Math.floor(statsB.max_hp * 0.15);
          battleLogs.push(`😇 **Cải Tử Hoàn Sinh**: **${tuSiB.ten}** được cứu mạng bởi Linh thú, hồi phục lại \`${hpB.toLocaleString()}\` HP!`);
        } else {
          winner = tuSiA;
          break;
        }
      }

      if (stunnedRoundsA > 0) {
        battleLogs.push(`💤 **Choáng**: **${tuSiA.ten}** bị choáng không thể hành động trong lượt này!`);
        stunnedRoundsA--;
      } else {
        // A hành động (chiêu thức hoặc đánh thường)
        let roundAtkAMult = 1.0;
        for (const buff of activeBuffsA) {
          if (buff.loai === 'tang_cong_pct' && buff.roundsLeft > 0) {
            roundAtkAMult += buff.triGia / 100;
          } else if (buff.loai === 'huyet_mach_cuong_hoa' && buff.roundsLeft > 0) {
            roundAtkAMult += buff.triGia;
          } else if (buff.loai === 'tu_khi_ky' && buff.roundsLeft > 0) {
            roundAtkAMult += buff.triGia / 100;
          } else if (buff.loai === 'chien_co' && buff.roundsLeft > 0) {
            roundAtkAMult += buff.triGia / 100;
          } else if (buff.loai === 'tu_duong_chuong' && buff.roundsLeft > 0) {
            roundAtkAMult += buff.triGia;
          } else if (buff.loai === 'hong_hoang_kich_buff' && buff.roundsLeft > 0) {
            roundAtkAMult += buff.triGia;
          }
        }
        let currentRoundAtkA = Math.floor(atkA * roundAtkAMult);

        if (weakenRoundsA > 0) {
          currentRoundAtkA = Math.floor(currentRoundAtkA * (1 - weakenPctA));
        }

        const readySkillA = skillsA.find(s => {
          const cost = config.getSkillMpCost(s.detail);
          return s.nextRoundAvailable <= actionCountA + 1 && mpA >= cost;
        });
        let dmgA = 0;
        let castMsgA = '';
        
        let critRateA = statsA.crit_rate;
        for (const buff of activeBuffsA) {
          if (buff.loai === 'chien_co' && buff.roundsLeft > 0) {
            critRateA += 0.05;
          }
        }
        let isCritA = Math.random() <= critRateA;

        if (readySkillA) {
          const skill = readySkillA.detail;
          const capDo = readySkillA.capDo;
          const cost = config.getSkillMpCost(skill);
          mpA = Math.max(0, mpA - cost);

          const isKimDan = skill.yeuCauCanhGioi === 13;
          const isLuyenKhi = ['tu_khi_thuat', 'linh_phao_thuat', 'huyet_khi_phun_trao', 'bang_son_quyen'].includes(skill.id);
          const levelBonus = (isKimDan || isLuyenKhi) ? 0.01 : 0.1;
          const skillMult = (skill.satThuong / 100) * (1 + (capDo - 1) * levelBonus);
          let rawDmg = currentRoundAtkA * skillMult;

          castMsgA = `thi triển **${skill.ten} (Cấp ${capDo})**`;

          // Combo / Hiệu ứng kỹ năng Luyện Khí
          if (skill.loai === 'Phép thuật' && tuKhiActiveA > 0) {
            const skillTKTA = skillsA.find(s => s.detail.id === 'tu_khi_thuat');
            const capDoTKTA = skillTKTA ? skillTKTA.capDo : 1;
            const bonusPct = 0.20 * (1 + (capDoTKTA - 1) * 0.01);
            rawDmg = rawDmg * (1 + bonusPct);
            
            if (skill.id === 'linh_phao_thuat') {
              const slowChance = 0.15 * (1 + (capDo - 1) * 0.01);
              if (Math.random() <= slowChance) {
                linhPhaoDebuffB = 2;
                battleLogs.push(`💥 **Linh Pháo Kích Nổ**: Kích hoạt combo Tụ Khí, gây thêm 30% sát thương lan và làm giảm \`3\` Tốc độ của **${tuSiB.ten}** trong 2 hiệp!`);
              } else {
                battleLogs.push(`💥 **Linh Pháo Kích Nổ**: Kích hoạt combo Tụ Khí, gây thêm 30% sát thương lan!`);
              }
              rawDmg = rawDmg * 1.30;
            } else {
              battleLogs.push(`🌀 **Tụ Khí Kích Phát**: Sát thương của chiêu thức phép thuật này tăng thêm \`+${Math.round(bonusPct * 100)}%\`!`);
            }
            tuKhiActiveA = 0; // Tiêu hao trạng thái Tụ Khí
          }

          if (skill.id === 'bang_son_quyen' && chienYStacksA >= 2) {
            const critBonus = 0.20 * (1 + (capDo - 1) * 0.01);
            critRateA += critBonus;
            isCritA = Math.random() <= critRateA;
            stunnedRoundsB = 1;
            chienYStacksA = 0;
            chienYDurationA = 0;
            castMsgA = `thi triển **Toái Đỉnh Quyền (Cấp ${capDo})**`;
            battleLogs.push(`👊 **Toái Đỉnh Quyền**: Tiêu hao toàn bộ tầng Chiến Ý chuyển hóa Băng Sơn Quyền, tăng \`+${Math.round(critBonus * 100)}%\` tỷ lệ bạo kích và khiến **${tuSiB.ten}** bị **[Choáng]** trong 1 hiệp!`);
          }

          if (isCritA) rawDmg = rawDmg * statsA.crit_dmg;

          let targetDefB = defB;
          for (const buff of activeBuffsB) {
            if (buff.loai === 'thach_phu_thuan' && buff.roundsLeft > 0) {
              targetDefB = Math.floor(targetDefB * 1.30);
            }
            if (buff.loai === 'phap_tuong_kim_cang_shield' && buff.roundsLeft > 0) {
              targetDefB = Math.floor(targetDefB * (1 + buff.defBonus));
            }
          }
          if (skill.id === 'bat_hoang_toai_thach_kich') {
            const ignorePct = Math.min(1.0, 0.10 * (1 + (capDo - 1) * 0.01));
            targetDefB = Math.floor(targetDefB * (1 - ignorePct));
          }
          if (tanKhiRoundsB > 0) {
            targetDefB = Math.floor(targetDefB * (1 - tanKhiPctB));
          }
          dmgA = Math.max(1, Math.floor(rawDmg) - targetDefB);
          if (skill.satThuong === 0) dmgA = 0;

          const cooldownRounds = Math.max(1, Math.ceil(skill.cooldown / 3));
          readySkillA.nextRoundAvailable = actionCountA + 1 + cooldownRounds;

           // Xử lý hiệu ứng đặc biệt của kỹ năng Luyện Khí
          if (skill.id === 'tu_khi_thuat') {
            const mpRecPct = 0.15 * (1 + (capDo - 1) * 0.01);
            const mpRecAmt = Math.floor(statsA.max_mp * mpRecPct);
            mpA = Math.min(statsA.max_mp, mpA + mpRecAmt);
            tuKhiActiveA = 2;
            battleLogs.push(`🌀 **${skill.ten}**: **${tuSiA.ten}** dẫn dắt linh khí hồi phục \`+${mpRecAmt.toLocaleString()}\` MP và nhận trạng thái **[Tụ Khí]** trong 2 hiệp.`);
          }
          if (skill.id === 'huyet_khi_phun_trao') {
            const hpSacrifice = Math.floor(hpA * 0.10);
            hpA = Math.max(1, hpA - hpSacrifice);
            chienYStacksA = Math.min(3, (chienYStacksA || 0) + 1);
            chienYDurationA = 3;
            battleLogs.push(`🔥 **${skill.ten}**: **${tuSiA.ten}** thiêu đốt \`-${hpSacrifice.toLocaleString()}\` HP hiện tại, tích luỹ 1 tầng **[Chiến Ý]** (Hiện tại: \`${chienYStacksA}/3\` tầng, kéo dài 3 hiệp).`);
          }

          // Xử lý hiệu ứng đặc biệt của kỹ năng Trúc Cơ
          if (skill.id === 'tu_duong_chuong') {
            const phapCongBonus = 0.10 * (1 + (capDo - 1) * 0.01);
            activeBuffsA.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'tu_duong_chuong',
              triGia: phapCongBonus,
              roundsLeft: 3
            });
            const tanKhiChance = 0.35 * (1 + (capDo - 1) * 0.01);
            if (Math.random() <= tanKhiChance) {
              tanKhiRoundsB = 2;
              tanKhiPctB = 0.15 * (1 + (capDo - 1) * 0.01);
              battleLogs.push(`🔥 **${skill.ten}**: Gây trạng thái **[Tán Khí]** làm giảm \`-${Math.round(tanKhiPctB * 100)}%\` Kháng Pháp của **${tuSiB.ten}** trong 2 hiệp.`);
            }
          }
          if (skill.id === 'phap_tuong_kim_cang') {
            const hpHealPct = 0.08 * (1 + (capDo - 1) * 0.01);
            const defBonusPct = 0.30 * (1 + (capDo - 1) * 0.01);
            const hoTheReduction = 0.15 * (1 + (capDo - 1) * 0.01);
            activeBuffsA.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'phap_tuong_kim_cang_regen',
              triGia: hpHealPct,
              roundsLeft: 5
            });
            activeBuffsA.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'phap_tuong_kim_cang_shield',
              defBonus: defBonusPct,
              reduction: hoTheReduction,
              roundsLeft: 5
            });
            battleLogs.push(`🛡️ **${skill.ten}**: Triệu hồi Pháp Tướng, tăng cường phòng ngự và hồi phục tự thân.`);
          }
          if (skill.id === 'hong_hoang_kich') {
            const hpHealAmt = Math.floor(statsA.max_hp * 0.05);
            hpA = Math.min(statsA.max_hp, hpA + hpHealAmt);
            const vatCongBonus = 0.15 * (1 + (capDo - 1) * 0.01);
            activeBuffsA.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'hong_hoang_kich_buff',
              triGia: vatCongBonus,
              roundsLeft: 2
            });
            battleLogs.push(`🩸 **${skill.ten}**: Hồi phục \`+${hpHealAmt.toLocaleString()}\` HP, tăng \`+${Math.round(vatCongBonus * 100)}%\` Vật công trong 2 hiệp.`);
            
            if (hpB / statsB.max_hp >= 0.70) {
              isCritA = true;
              battleLogs.push(`💥 **${skill.ten}**: **${tuSiB.ten}** dồi dào huyết khí, kích hoạt chắc chắn bạo kích!`);
            }
            const stunChance = 0.30 * (1 + (capDo - 1) * 0.01);
            if (Math.random() <= stunChance) {
              stunnedRoundsB = 1;
              battleLogs.push(`💤 **${skill.ten}**: Gây trạng thái **[Định Thân]** khiến **${tuSiB.ten}** mất lượt!`);
            }
          }
          if (skill.id === 'bat_hoang_bo') {
            const hpHealAmt = Math.floor(statsA.max_hp * 0.10);
            hpA = Math.min(statsA.max_hp, hpA + hpHealAmt);
            const speedBonus = Math.floor((statsA.speed || 100) * 0.30 * (1 + (capDo - 1) * 0.01));
            const neBonus = 0.20 * (1 + (capDo - 1) * 0.01);
            activeBuffsA.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'bat_hoang_bo_buff',
              speedBonus: speedBonus,
              neBonus: neBonus,
              roundsLeft: 4
            });
            activeBuffsA.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'hoa_loi_dap',
              triGia: 0.40 * (1 + (capDo - 1) * 0.01),
              roundsLeft: 4
            });
            battleLogs.push(`👟 **${skill.ten}**: Hồi \`+${hpHealAmt.toLocaleString()}\` HP, tăng tốc độ và khả năng né tránh, kích hoạt trạng thái **[Hỏa Lôi Đạp]**.`);
          }

          // Xử lý hiệu ứng đặc biệt của kỹ năng Kim Đan
          if (skill.id === 'cuu_long_ba_the_tran') {
            const shieldPct = 0.20 * (1 + (capDo - 1) * 0.01);
            const shieldAmt = Math.floor(statsA.max_hp * shieldPct);
            shieldA = (shieldA || 0) + shieldAmt;
            battleLogs.push(`🛡️ **${skill.ten}**: **${tuSiA.ten}** tạo lá chắn vững chắc \`+${shieldAmt.toLocaleString()}\` HP.`);
          }
          if (skill.id === 'huyet_mach_cuong_hoa') {
            const hpSacrifice = Math.floor(hpA * 0.10);
            hpA = Math.max(1, hpA - hpSacrifice);
            const atkBonusPct = 0.30 * (1 + (capDo - 1) * 0.01);
            const speedBonus = Math.floor(20 * (1 + (capDo - 1) * 0.01));
            activeBuffsA.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'huyet_mach_cuong_hoa',
              triGia: atkBonusPct,
              speedBonus: speedBonus,
              roundsLeft: 3
            });
            battleLogs.push(`🔥 **${skill.ten}**: **${tuSiA.ten}** thiêu đốt \`-${hpSacrifice}\` HP hiện tại, tăng \`+${Math.floor(atkBonusPct * 100)}%\` Vật Công và \`+${speedBonus}\` Tốc độ trong 3 hiệp.`);
          }
          if (skill.id === 'thai_hu_van_kiem_quyet') {
            const speedRedPct = 0.10 * (1 + (capDo - 1) * 0.01);
            slowRoundsB = 3;
            slowPctB = speedRedPct;
            battleLogs.push(`❄️ **${skill.ten}**: **${tuSiA.ten}** làm chậm \`+${Math.floor(speedRedPct * 100)}%\` Tốc độ của đối phương.`);
          }
          if (skill.id === 'ngu_loi_oanh_dinh') {
            const stunChance = 0.20 * (1 + (capDo - 1) * 0.01);
            if (Math.random() <= stunChance) {
              stunnedRoundsB = 1;
              battleLogs.push(`⚡ **${skill.ten}**: Gây trạng thái **Tê Liệt (Choáng)** cho **${tuSiB.ten}** trong 1 hiệp!`);
            }
          }
          if (skill.id === 'dai_tu_linh_tran') {
            const mpHealPct = 0.30 * (1 + (capDo - 1) * 0.01);
            const mpAmt = Math.floor(statsA.max_mp * mpHealPct);
            mpA = Math.min(statsA.max_mp, mpA + mpAmt);
            for (const s of skillsA) {
              if (s.detail.id !== 'dai_tu_linh_tran') {
                s.nextRoundAvailable = Math.max(1, s.nextRoundAvailable - 1);
              }
            }
            battleLogs.push(`✨ **${skill.ten}**: Hồi phục \`+${mpAmt}\` Chân Khí (MP) cho **${tuSiA.ten}**, giảm thời gian hồi chiêu của các kỹ năng khác đi 1 lượt.`);
          }
        } else {
          let rawDmg = currentRoundAtkA;
          if (isCritA) rawDmg = rawDmg * statsA.crit_dmg;
          let targetDefB = defB;
          for (const buff of activeBuffsB) {
            if (buff.loai === 'thach_phu_thuan' && buff.roundsLeft > 0) {
              targetDefB = Math.floor(targetDefB * 1.30);
            }
            if (buff.loai === 'phap_tuong_kim_cang_shield' && buff.roundsLeft > 0) {
              targetDefB = Math.floor(targetDefB * (1 + buff.defBonus));
            }
          }
          if (tanKhiRoundsB > 0) {
            targetDefB = Math.floor(targetDefB * (1 - tanKhiPctB));
          }
          dmgA = Math.max(1, Math.floor(rawDmg) - targetDefB);
          castMsgA = 'đánh thường';
        }

        // B né tránh đòn A
        let roundNeB = statsB.ne;
        for (const buff of activeBuffsB) {
          if (buff.loai === 'bat_hoang_bo_buff' && buff.roundsLeft > 0) {
            roundNeB = Math.min(0.90, roundNeB + buff.neBonus);
          }
        }
        if (Math.random() <= roundNeB) {
          battleLogs.push(`⚡ **Hiệp ${combatRound}** (Lượt ${actionCountA + 1} của **${tuSiA.ten}**, AV: ${elapsed.toFixed(0)}): **${tuSiA.ten}** ${castMsgA} nhưng **${tuSiB.ten}** né tránh thành công!`);
        } else {
          if (isCritA && critImmuneB) {
            // crit immune
          }

          let hoTheRedB = 0;
          for (const buff of activeBuffsB) {
            if (buff.loai === 'phap_tuong_kim_cang_shield' && buff.roundsLeft > 0) {
              hoTheRedB = Math.max(hoTheRedB, buff.reduction);
            }
          }
          if (hoTheRedB > 0) {
            dmgA = Math.floor(dmgA * (1 - hoTheRedB));
          }

          if (shieldB > 0) {
            if (shieldB >= dmgA) {
              shieldB -= dmgA;
              battleLogs.push(`🛡️ **Lá Chắn**: Khiên của **${tuSiB.ten}** hấp thụ toàn bộ \`${dmgA}\` sát thương (Khiên còn: \`${shieldB}\`).`);
              dmgA = 0;
            } else {
              dmgA -= shieldB;
              battleLogs.push(`🛡️ **Lá Chắn**: Khiên của **${tuSiB.ten}** hấp thụ \`${shieldB}\` sát thương rồi vỡ! Sát thương lọt qua: \`${dmgA}\`.`);
              shieldB = 0;
            }
          }

          if (dmgA > 0) {
            hpB = Math.max(0, hpB - dmgA);
            battleLogs.push(`⚡ **Hiệp ${combatRound}** (Lượt ${actionCountA + 1} của **${tuSiA.ten}**, AV: ${elapsed.toFixed(0)}): **${tuSiA.ten}** ${castMsgA} gây \`${dmgA}\`${isCritA ? ' 💥 (Bạo!)' : ''} sát thương lên **${tuSiB.ten}** (HP còn: \`${hpB}\`).`);

            if (reflectB) {
              const refDmg = Math.floor(dmgA * 0.35);
              hpA = Math.max(0, hpA - refDmg);
              battleLogs.push(`🪞 **Phản đòn**: **${tuSiA.ten}** gánh chịu \`-${refDmg.toLocaleString()}\` sát thương phản chấn (HP còn: \`${hpA.toLocaleString()}\`).`);
            }

            let roundLifestealA = statsA.lifesteal;
            if (roundLifestealA > 0) {
              const healed = Math.floor(dmgA * roundLifestealA);
              if (healed > 0) {
                hpA = Math.min(statsA.max_hp, hpA + healed);
                battleLogs.push(`🩸 **Hút máu**: **${tuSiA.ten}** hồi phục \`+${healed}\` HP (Hiện tại: \`${hpA}/${statsA.max_hp}\`).`);
              }
            }
          }
        }
      }

      if (hpB <= 0) {
        if (caituB > 0 && !caituTriggeredB) {
          caituTriggeredB = true;
          hpB = Math.floor(statsB.max_hp * 0.15);
          battleLogs.push(`😇 **Cải Tử Hoàn Sinh**: **${tuSiB.ten}** được cứu mạng bởi Linh thú, hồi phục lại \`${hpB.toLocaleString()}\` HP!`);
        } else {
          winner = tuSiA;
          break;
        }
      }

      if (hpA <= 0) {
        if (caituA > 0 && !caituTriggeredA) {
          caituTriggeredA = true;
          hpA = Math.floor(statsA.max_hp * 0.15);
          battleLogs.push(`😇 **Cải Tử Hoàn Sinh**: **${tuSiA.ten}** được cứu mạng bởi Linh thú, hồi phục lại \`${hpA.toLocaleString()}\` HP!`);
        } else {
          winner = tuSiB;
          break;
        }
      }

      // Giảm buff thời hạn Luyện Khí của A
      if (tuKhiActiveA > 0) {
        tuKhiActiveA--;
        if (tuKhiActiveA === 0) {
          battleLogs.push(`✨ Hiệu ứng [Tụ Khí] của **${tuSiA.ten}** đã hết tác dụng.`);
        }
      }
      if (chienYDurationA > 0) {
        chienYDurationA--;
        if (chienYDurationA === 0) {
          chienYStacksA = 0;
          battleLogs.push(`✨ Hiệu ứng [Chiến Ý] của **${tuSiA.ten}** đã hết tác dụng.`);
        }
      }
      if (linhPhaoDebuffA > 0) {
        linhPhaoDebuffA--;
      }

      // Giảm buff thời hạn Pháp bảo của A
      for (const buff of activeBuffsA) {
        if (buff.roundsLeft > 0) {
          buff.roundsLeft--;
          if (buff.roundsLeft === 0) {
            battleLogs.push(`✨ Hiệu ứng [${buff.ten}] của **${buff.pbTen}** (${tuSiA.ten}) đã hết tác dụng.`);
          }
        }
      }

      if (slowRoundsA > 0) slowRoundsA--;
      if (weakenRoundsA > 0) weakenRoundsA--;
      if (tanKhiRoundsA > 0) tanKhiRoundsA--;
      if (shieldA <= 0) {
        critImmuneA = false;
        reflectA = false;
      }

      actionCountA++;
      combatRound++;
    } else {
      // Lượt của Player B
      const elapsed = avPlayerB;
      avPlayerA -= elapsed;
      avPlayerB = dynamicBaseAvB;

      if (blindB > 0) blindB--;
      if (slowB > 0) slowB--;
      if (tebutB > 0) tebutB--;
      if (caituB > 0) caituB--;

      if (bleedB && bleedB.turns > 0) {
        const bleedDmg = bleedB.dmg;
        hpB = Math.max(0, hpB - bleedDmg);
        battleLogs.push(`🩸 **Chảy máu**: **${tuSiB.ten}** mất \`-${bleedDmg.toLocaleString()}\` HP do vết thương chảy máu (HP còn: \`${hpB.toLocaleString()}\`).`);
        bleedB.turns--;
        if (bleedB.turns <= 0) bleedB = null;
        if (hpB <= 0) {
          if (caituB > 0 && !caituTriggeredB) {
            caituTriggeredB = true;
            hpB = Math.floor(statsB.max_hp * 0.15);
            battleLogs.push(`😇 **Cải Tử Hoàn Sinh**: **${tuSiB.ten}** được cứu mạng bởi Linh thú, hồi phục lại \`${hpB.toLocaleString()}\` HP!`);
          } else {
            winner = tuSiA;
            break;
          }
        }
      }

      if (hoitoB > 0) {
        const healAmt = Math.floor(statsB.max_hp * 0.03);
        hpB = Math.min(statsB.max_hp, hpB + healAmt);
        battleLogs.push(`🌱 **Hồi Thổ**: **${tuSiB.ten}** hồi phục \`+${healAmt.toLocaleString()}\` HP (HP hiện tại: \`${hpB.toLocaleString()}\`).`);
        hoitoB--;
      }

      if (nightmareB > 0) {
        const mpLost = Math.floor(statsB.max_mp * 0.10);
        mpB = Math.max(0, mpB - mpLost);
        battleLogs.push(`💤 **Mộng Yểm**: **${tuSiB.ten}** bị chìm trong ác mộng, mất lượt hành động và tổn hao \`-${mpLost.toLocaleString()}\` MP!`);
        nightmareB--;
        actionCountB++;
        combatRound++;
        continue;
      }

      if (blindB > 0 && Math.random() <= 0.50) {
        battleLogs.push(`👁️ **Mù mắt**: **${tuSiB.ten}** đang bị [Mù], chiêu thức chệch hướng hoàn toàn!`);
        actionCountB++;
        combatRound++;
        continue;
      }

      // Active Pet B Skill Trigger
      if (petB && hpB > 0 && hpA > 0) {
        if (petStateB.cooldown > 0) petStateB.cooldown--;
        if (petStateB.cooldown === 0) {
          const res = config.handlePetCombatSkill(petB, petStateB, statsB, statsA, battleLogs, tuSiB.ten, tuSiA.ten, bleedA);
          if (res) {
            battleLogs.push(res.log);
            if (res.damage > 0) {
              let finalDmg = res.damage;
              if (res.ignoreDef) {
                const targetDef = statsA.vat_phong * (1.0 - res.ignoreDef);
                finalDmg = Math.max(1, Math.floor(finalDmg - targetDef));
              } else {
                finalDmg = Math.max(1, Math.floor(finalDmg - statsA.vat_phong));
              }
              if (res.checkTebutBonus && tebutA > 0) {
                const bonusTrue = Math.floor(hpA * 0.05);
                finalDmg += bonusTrue;
                battleLogs.push(`❄️ **Tê Buốt Kích Phát**: Sát thương sủng vật tăng thêm \`+${bonusTrue.toLocaleString()}\` sát thương chuẩn!`);
              }

              if (shieldA > 0) {
                const absorbed = Math.min(shieldA, finalDmg);
                shieldA -= absorbed;
                finalDmg -= absorbed;
                battleLogs.push(`🛡️ **Khiên chặn**: Khiên của **${tuSiA.ten}** hấp thụ \`${absorbed.toLocaleString()}\` sát thương (Khiên còn: \`${shieldA.toLocaleString()}\`).`);
              }
              if (finalDmg > 0) {
                hpA = Math.max(0, hpA - finalDmg);
                battleLogs.push(`💥 **Sát thương sủng vật**: **${tuSiA.ten}** nhận \`${finalDmg.toLocaleString()}\` sát thương sủng vật (HP còn: \`${hpA.toLocaleString()}\`).`);
                if (reflectA) {
                  const refDmg = Math.floor(finalDmg * 0.35);
                  hpB = Math.max(0, hpB - refDmg);
                  battleLogs.push(`🪞 **Phản đòn**: **${tuSiB.ten}** gánh chịu \`-${refDmg.toLocaleString()}\` sát thương phản chấn (HP còn: \`${hpB.toLocaleString()}\`).`);
                  if (hpB <= 0) {
                    if (caituB > 0 && !caituTriggeredB) {
                      caituTriggeredB = true;
                      hpB = Math.floor(statsB.max_hp * 0.15);
                      battleLogs.push(`😇 **Cải Tử Hoàn Sinh**: **${tuSiB.ten}** được cứu mạng bởi Linh thú, hồi phục lại \`${hpB.toLocaleString()}\` HP!`);
                    }
                  }
                }
              }
              if (res.execute && hpA > 0 && hpA < statsA.max_hp * 0.15) {
                hpA = 0;
                battleLogs.push(`💀 **KẾT LIỄU**: Sủng vật lập tức kết liễu **${tuSiA.ten}** dưới 15% HP!`);
              }
            }
            if (res.healHp > 0) {
              hpB = Math.min(statsB.max_hp, hpB + res.healHp);
              battleLogs.push(`💚 **Hồi phục**: **${tuSiB.ten}** hồi phục \`${res.healHp.toLocaleString()}\` HP.`);
            }
            if (res.healMp > 0) {
              mpB = Math.min(statsB.max_mp, mpB + res.healMp);
              battleLogs.push(`💙 **Hồi phục**: **${tuSiB.ten}** hồi phục \`${res.healMp.toLocaleString()}\` MP.`);
            }
            if (res.shield > 0) {
              shieldB = res.shield;
              if (res.critImmune) critImmuneB = true;
              if (res.reflectDmg) reflectB = true;
            }
            if (res.clearBleed) {
              bleedA = null;
            }
            if (res.applyBleed) bleedA = res.applyBleed;
            if (res.applyBlind) blindA = res.applyBlind.turns;
            if (res.applySlow) {
              slowA = res.applySlow.turns;
            }
            if (res.applyTebut) tebutA = res.applyTebut.turns;
            if (res.applyNightmare) nightmareA = res.applyNightmare.turns;
            if (res.applyHoito) hoitoB = res.applyHoito.turns;
            if (res.applyCaituhoansinh) caituB = res.applyCaituhoansinh.turns;
          }
        }
      }

      if (hpA <= 0) {
        if (caituA > 0 && !caituTriggeredA) {
          caituTriggeredA = true;
          hpA = Math.floor(statsA.max_hp * 0.15);
          battleLogs.push(`😇 **Cải Tử Hoàn Sinh**: **${tuSiA.ten}** được cứu mạng bởi Linh thú, hồi phục lại \`${hpA.toLocaleString()}\` HP!`);
        } else {
          winner = tuSiB;
          break;
        }
      }

      // Pháp Tướng Kim Cang Regen B
      for (const buff of activeBuffsB) {
        if (buff.loai === 'phap_tuong_kim_cang_regen' && buff.roundsLeft > 0) {
          const healAmt = Math.floor(statsB.max_hp * buff.triGia);
          hpB = Math.min(statsB.max_hp, hpB + healAmt);
          battleLogs.push(`❇️ **Pháp Tướng Kim Cang**: **${tuSiB.ten}** hồi phục \`+${healAmt.toLocaleString()}\` HP từ hư ảnh hộ pháp (HP hiện tại: \`${hpB}/${statsB.max_hp}\`).`);
        }
      }

      // Hỏa Lôi Đạp burn damage B -> A
      for (const buff of activeBuffsB) {
        if (buff.loai === 'hoa_loi_dap' && buff.roundsLeft > 0) {
          const burnDmg = Math.floor(statsB.vat_cong * buff.triGia);
          hpA = Math.max(0, hpA - burnDmg);
          battleLogs.push(`🔥 **Hỏa Lôi Đạp**: **${tuSiA.ten}** bị thiêu đốt chịu \`-${burnDmg.toLocaleString()}\` sát thương vật lý (HP còn: \`${hpA.toLocaleString()}\`).`);
        }
      }
      if (hpA <= 0) {
        if (caituA > 0 && !caituTriggeredA) {
          caituTriggeredA = true;
          hpA = Math.floor(statsA.max_hp * 0.15);
          battleLogs.push(`😇 **Cải Tử Hoàn Sinh**: **${tuSiA.ten}** được cứu mạng bởi Linh thú, hồi phục lại \`${hpA.toLocaleString()}\` HP!`);
        } else {
          winner = tuSiB;
          break;
        }
      }

      if (stunnedRoundsB > 0) {
        battleLogs.push(`💤 **Choáng**: **${tuSiB.ten}** bị choáng không thể hành động trong lượt này!`);
        stunnedRoundsB--;
      } else {
        // B hành động (chiêu thức hoặc đánh thường)
        let roundAtkBMult = 1.0;
        for (const buff of activeBuffsB) {
          if (buff.loai === 'tang_cong_pct' && buff.roundsLeft > 0) {
            roundAtkBMult += buff.triGia / 100;
          } else if (buff.loai === 'huyet_mach_cuong_hoa' && buff.roundsLeft > 0) {
            roundAtkBMult += buff.triGia;
          } else if (buff.loai === 'tu_khi_ky' && buff.roundsLeft > 0) {
            roundAtkBMult += buff.triGia / 100;
          } else if (buff.loai === 'chien_co' && buff.roundsLeft > 0) {
            roundAtkBMult += buff.triGia / 100;
          } else if (buff.loai === 'tu_duong_chuong' && buff.roundsLeft > 0) {
            roundAtkBMult += buff.triGia;
          } else if (buff.loai === 'hong_hoang_kich_buff' && buff.roundsLeft > 0) {
            roundAtkBMult += buff.triGia;
          }
        }
        let currentRoundAtkB = Math.floor(atkB * roundAtkBMult);

        if (weakenRoundsB > 0) {
          currentRoundAtkB = Math.floor(currentRoundAtkB * (1 - weakenPctB));
        }

        const readySkillB = skillsB.find(s => {
          const cost = config.getSkillMpCost(s.detail);
          return s.nextRoundAvailable <= actionCountB + 1 && mpB >= cost;
        });
        let dmgB = 0;
        let castMsgB = '';
        
        let critRateB = statsB.crit_rate;
        for (const buff of activeBuffsB) {
          if (buff.loai === 'chien_co' && buff.roundsLeft > 0) {
            critRateB += 0.05;
          }
        }
        let isCritB = Math.random() <= critRateB;

        if (readySkillB) {
          const skill = readySkillB.detail;
          const capDo = readySkillB.capDo;
          const cost = config.getSkillMpCost(skill);
          mpB = Math.max(0, mpB - cost);

          const isKimDan = skill.yeuCauCanhGioi === 13;
          const isLuyenKhi = ['tu_khi_thuat', 'linh_phao_thuat', 'huyet_khi_phun_trao', 'bang_son_quyen'].includes(skill.id);
          const levelBonus = (isKimDan || isLuyenKhi) ? 0.01 : 0.1;
          const skillMult = (skill.satThuong / 100) * (1 + (capDo - 1) * levelBonus);
          let rawDmg = currentRoundAtkB * skillMult;

          castMsgB = `thi triển **${skill.ten} (Cấp ${capDo})**`;

          // Combo / Hiệu ứng kỹ năng Luyện Khí
          if (skill.loai === 'Phép thuật' && tuKhiActiveB > 0) {
            const skillTKTB = skillsB.find(s => s.detail.id === 'tu_khi_thuat');
            const capDoTKTB = skillTKTB ? skillTKTB.capDo : 1;
            const bonusPct = 0.20 * (1 + (capDoTKTB - 1) * 0.01);
            rawDmg = rawDmg * (1 + bonusPct);
            
            if (skill.id === 'linh_phao_thuat') {
              const slowChance = 0.15 * (1 + (capDo - 1) * 0.01);
              if (Math.random() <= slowChance) {
                linhPhaoDebuffA = 2;
                battleLogs.push(`💥 **Linh Pháo Kích Nổ**: Kích hoạt combo Tụ Khí, gây thêm 30% sát thương lan và làm giảm \`3\` Tốc độ của **${tuSiA.ten}** trong 2 hiệp!`);
              } else {
                battleLogs.push(`💥 **Linh Pháo Kích Nổ**: Kích hoạt combo Tụ Khí, gây thêm 30% sát thương lan!`);
              }
              rawDmg = rawDmg * 1.30;
            } else {
              battleLogs.push(`🌀 **Tụ Khí Kích Phát**: Sát thương của chiêu thức phép thuật này tăng thêm \`+${Math.round(bonusPct * 100)}%\`!`);
            }
            tuKhiActiveB = 0; // Tiêu hao trạng thái Tụ Khí
          }

          if (skill.id === 'bang_son_quyen' && chienYStacksB >= 2) {
            const critBonus = 0.20 * (1 + (capDo - 1) * 0.01);
            critRateB += critBonus;
            isCritB = Math.random() <= critRateB;
            stunnedRoundsA = 1;
            chienYStacksB = 0;
            chienYDurationB = 0;
            castMsgB = `thi triển **Toái Đỉnh Quyền (Cấp ${capDo})**`;
            battleLogs.push(`👊 **Toái Đỉnh Quyền**: Tiêu hao toàn bộ tầng Chiến Ý chuyển hóa Băng Sơn Quyền, tăng \`+${Math.round(critBonus * 100)}%\` tỷ lệ bạo kích và khiến **${tuSiA.ten}** bị **[Choáng]** trong 1 hiệp!`);
          }

          if (isCritB) rawDmg = rawDmg * statsB.crit_dmg;

          let targetDefA = defA;
          for (const buff of activeBuffsA) {
            if (buff.loai === 'thach_phu_thuan' && buff.roundsLeft > 0) {
              targetDefA = Math.floor(targetDefA * 1.30);
            }
            if (buff.loai === 'phap_tuong_kim_cang_shield' && buff.roundsLeft > 0) {
              targetDefA = Math.floor(targetDefA * (1 + buff.defBonus));
            }
          }
          if (skill.id === 'bat_hoang_toai_thach_kich') {
            const ignorePct = Math.min(1.0, 0.10 * (1 + (capDo - 1) * 0.01));
            targetDefA = Math.floor(targetDefA * (1 - ignorePct));
          }
          if (tanKhiRoundsA > 0) {
            targetDefA = Math.floor(targetDefA * (1 - tanKhiPctA));
          }
          dmgB = Math.max(1, Math.floor(rawDmg) - targetDefA);
          if (skill.satThuong === 0) dmgB = 0;

          const cooldownRounds = Math.max(1, Math.ceil(skill.cooldown / 3));
          readySkillB.nextRoundAvailable = actionCountB + 1 + cooldownRounds;

           // Xử lý hiệu ứng đặc biệt của kỹ năng Luyện Khí
          if (skill.id === 'tu_khi_thuat') {
            const mpRecPct = 0.15 * (1 + (capDo - 1) * 0.01);
            const mpRecAmt = Math.floor(statsB.max_mp * mpRecPct);
            mpB = Math.min(statsB.max_mp, mpB + mpRecAmt);
            tuKhiActiveB = 2;
            battleLogs.push(`🌀 **${skill.ten}**: **${tuSiB.ten}** dẫn dắt linh khí hồi phục \`+${mpRecAmt.toLocaleString()}\` MP và nhận trạng thái **[Tụ Khí]** trong 2 hiệp.`);
          }
          if (skill.id === 'huyet_khi_phun_trao') {
            const hpSacrifice = Math.floor(hpB * 0.10);
            hpB = Math.max(1, hpB - hpSacrifice);
            chienYStacksB = Math.min(3, (chienYStacksB || 0) + 1);
            chienYDurationB = 3;
            battleLogs.push(`🔥 **${skill.ten}**: **${tuSiB.ten}** thiêu đốt \`-${hpSacrifice.toLocaleString()}\` HP hiện tại, tích luỹ 1 tầng **[Chiến Ý]** (Hiện tại: \`${chienYStacksB}/3\` tầng, kéo dài 3 hiệp).`);
          }

          // Xử lý hiệu ứng đặc biệt của kỹ năng Trúc Cơ
          if (skill.id === 'tu_duong_chuong') {
            const phapCongBonus = 0.10 * (1 + (capDo - 1) * 0.01);
            activeBuffsB.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'tu_duong_chuong',
              triGia: phapCongBonus,
              roundsLeft: 3
            });
            const tanKhiChance = 0.35 * (1 + (capDo - 1) * 0.01);
            if (Math.random() <= tanKhiChance) {
              tanKhiRoundsA = 2;
              tanKhiPctA = 0.15 * (1 + (capDo - 1) * 0.01);
              battleLogs.push(`🔥 **${skill.ten}**: Gây trạng thái **[Tán Khí]** làm giảm \`-${Math.round(tanKhiPctA * 100)}%\` Kháng Pháp của **${tuSiA.ten}** trong 2 hiệp.`);
            }
          }
          if (skill.id === 'phap_tuong_kim_cang') {
            const hpHealPct = 0.08 * (1 + (capDo - 1) * 0.01);
            const defBonusPct = 0.30 * (1 + (capDo - 1) * 0.01);
            const hoTheReduction = 0.15 * (1 + (capDo - 1) * 0.01);
            activeBuffsB.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'phap_tuong_kim_cang_regen',
              triGia: hpHealPct,
              roundsLeft: 5
            });
            activeBuffsB.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'phap_tuong_kim_cang_shield',
              defBonus: defBonusPct,
              reduction: hoTheReduction,
              roundsLeft: 5
            });
            battleLogs.push(`🛡️ **${skill.ten}**: Triệu hồi Pháp Tướng, tăng cường phòng ngự và hồi phục tự thân.`);
          }
          if (skill.id === 'hong_hoang_kich') {
            const hpHealAmt = Math.floor(statsB.max_hp * 0.05);
            hpB = Math.min(statsB.max_hp, hpB + hpHealAmt);
            const vatCongBonus = 0.15 * (1 + (capDo - 1) * 0.01);
            activeBuffsB.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'hong_hoang_kich_buff',
              triGia: vatCongBonus,
              roundsLeft: 2
            });
            battleLogs.push(`🩸 **${skill.ten}**: Hồi phục \`+${hpHealAmt.toLocaleString()}\` HP, tăng \`+${Math.round(vatCongBonus * 100)}%\` Vật công trong 2 hiệp.`);
            
            if (hpA / statsA.max_hp >= 0.70) {
              isCritB = true;
              battleLogs.push(`💥 **${skill.ten}**: **${tuSiA.ten}** dồi dào huyết khí, kích hoạt chắc chắn bạo kích!`);
            }
            const stunChance = 0.30 * (1 + (capDo - 1) * 0.01);
            if (Math.random() <= stunChance) {
              stunnedRoundsA = 1;
              battleLogs.push(`💤 **${skill.ten}**: Gây trạng thái **[Định Thân]** khiến **${tuSiA.ten}** mất lượt!`);
            }
          }
          if (skill.id === 'bat_hoang_bo') {
            const hpHealAmt = Math.floor(statsB.max_hp * 0.10);
            hpB = Math.min(statsB.max_hp, hpB + hpHealAmt);
            const speedBonus = Math.floor((statsB.speed || 100) * 0.30 * (1 + (capDo - 1) * 0.01));
            const neBonus = 0.20 * (1 + (capDo - 1) * 0.01);
            activeBuffsB.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'bat_hoang_bo_buff',
              speedBonus: speedBonus,
              neBonus: neBonus,
              roundsLeft: 4
            });
            activeBuffsB.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'hoa_loi_dap',
              triGia: 0.40 * (1 + (capDo - 1) * 0.01),
              roundsLeft: 4
            });
            battleLogs.push(`👟 **${skill.ten}**: Hồi \`+${hpHealAmt.toLocaleString()}\` HP, tăng tốc độ và khả năng né tránh, kích hoạt trạng thái **[Hỏa Lôi Đạp]**.`);
          }

          // Xử lý hiệu ứng đặc biệt của kỹ năng Kim Đan
          if (skill.id === 'cuu_long_ba_the_tran') {
            const shieldPct = 0.20 * (1 + (capDo - 1) * 0.01);
            const shieldAmt = Math.floor(statsB.max_hp * shieldPct);
            shieldB = (shieldB || 0) + shieldAmt;
            battleLogs.push(`🛡️ **${skill.ten}**: **${tuSiB.ten}** tạo lá chắn vững chắc \`+${shieldAmt.toLocaleString()}\` HP.`);
          }
          if (skill.id === 'huyet_mach_cuong_hoa') {
            const hpSacrifice = Math.floor(hpB * 0.10);
            hpB = Math.max(1, hpB - hpSacrifice);
            const atkBonusPct = 0.30 * (1 + (capDo - 1) * 0.01);
            const speedBonus = Math.floor(20 * (1 + (capDo - 1) * 0.01));
            activeBuffsB.push({
              ten: skill.ten,
              pbTen: skill.ten,
              loai: 'huyet_mach_cuong_hoa',
              triGia: atkBonusPct,
              speedBonus: speedBonus,
              roundsLeft: 3
            });
            battleLogs.push(`🔥 **${skill.ten}**: **${tuSiB.ten}** thiêu đốt \`-${hpSacrifice}\` HP hiện tại, tăng \`+${Math.floor(atkBonusPct * 100)}%\` Vật Công và \`+${speedBonus}\` Tốc độ trong 3 hiệp.`);
          }
          if (skill.id === 'thai_hu_van_kiem_quyet') {
            const speedRedPct = 0.10 * (1 + (capDo - 1) * 0.01);
            slowRoundsA = 3;
            slowPctA = speedRedPct;
            battleLogs.push(`❄️ **${skill.ten}**: **${tuSiB.ten}** làm chậm \`+${Math.floor(speedRedPct * 100)}%\` Tốc độ của đối phương.`);
          }
          if (skill.id === 'ngu_loi_oanh_dinh') {
            const stunChance = 0.20 * (1 + (capDo - 1) * 0.01);
            if (Math.random() <= stunChance) {
              stunnedRoundsA = 1;
              battleLogs.push(`⚡ **${skill.ten}**: Gây trạng thái **Tê Liệt (Choáng)** cho **${tuSiA.ten}** trong 1 hiệp!`);
            }
          }
          if (skill.id === 'dai_tu_linh_tran') {
            const mpHealPct = 0.30 * (1 + (capDo - 1) * 0.01);
            const mpAmt = Math.floor(statsB.max_mp * mpHealPct);
            mpB = Math.min(statsB.max_mp, mpB + mpAmt);
            for (const s of skillsB) {
              if (s.detail.id !== 'dai_tu_linh_tran') {
                s.nextRoundAvailable = Math.max(1, s.nextRoundAvailable - 1);
              }
            }
            battleLogs.push(`✨ **${skill.ten}**: Hồi phục \`+${mpAmt}\` Chân Khí (MP) cho **${tuSiB.ten}**, giảm thời gian hồi chiêu của các kỹ năng khác đi 1 lượt.`);
          }
        } else {
          let rawDmg = currentRoundAtkB;
          if (isCritB) rawDmg = rawDmg * statsB.crit_dmg;
          let targetDefA = defA;
          for (const buff of activeBuffsA) {
            if (buff.loai === 'thach_phu_thuan' && buff.roundsLeft > 0) {
              targetDefA = Math.floor(targetDefA * 1.30);
            }
            if (buff.loai === 'phap_tuong_kim_cang_shield' && buff.roundsLeft > 0) {
              targetDefA = Math.floor(targetDefA * (1 + buff.defBonus));
            }
          }
          if (tanKhiRoundsA > 0) {
            targetDefA = Math.floor(targetDefA * (1 - tanKhiPctA));
          }
          dmgB = Math.max(1, Math.floor(rawDmg) - targetDefA);
          castMsgB = 'đánh thường';
        }

        // A né tránh đòn B
        let roundNeA = statsA.ne;
        for (const buff of activeBuffsA) {
          if (buff.loai === 'bat_hoang_bo_buff' && buff.roundsLeft > 0) {
            roundNeA = Math.min(0.90, roundNeA + buff.neBonus);
          }
        }
        if (Math.random() <= roundNeA) {
          battleLogs.push(`⚡ **Hiệp ${combatRound}** (Lượt ${actionCountB + 1} của **${tuSiB.ten}**, AV: ${elapsed.toFixed(0)}): **${tuSiB.ten}** ${castMsgB} nhưng **${tuSiA.ten}** né tránh thành công!`);
        } else {
          if (isCritB && critImmuneA) {
            // crit immune
          }

          let hoTheRedA = 0;
          for (const buff of activeBuffsA) {
            if (buff.loai === 'phap_tuong_kim_cang_shield' && buff.roundsLeft > 0) {
              hoTheRedA = Math.max(hoTheRedA, buff.reduction);
            }
          }
          if (hoTheRedA > 0) {
            dmgB = Math.floor(dmgB * (1 - hoTheRedA));
          }

          if (shieldA > 0) {
            if (shieldA >= dmgB) {
              shieldA -= dmgB;
              battleLogs.push(`🛡️ **Lá Chắn**: Khiên của **${tuSiA.ten}** hấp thụ toàn bộ \`${dmgB}\` sát thương (Khiên còn: \`${shieldA}\`).`);
              dmgB = 0;
            } else {
              dmgB -= shieldA;
              battleLogs.push(`🛡️ **Lá Chắn**: Khiên của **${tuSiA.ten}** hấp thụ \`${shieldA}\` sát thương rồi vỡ! Sát thương lọt qua: \`${dmgB}\`.`);
              shieldA = 0;
            }
          }

          if (dmgB > 0) {
            hpA = Math.max(0, hpA - dmgB);
            battleLogs.push(`⚡ **Hiệp ${combatRound}** (Lượt ${actionCountB + 1} của **${tuSiB.ten}**, AV: ${elapsed.toFixed(0)}): **${tuSiB.ten}** ${castMsgB} gây \`${dmgB}\`${isCritB ? ' 💥 (Bạo!)' : ''} sát thương lên **${tuSiA.ten}** (HP còn: \`${hpA}\`).`);

            if (reflectA) {
              const refDmg = Math.floor(dmgB * 0.35);
              hpB = Math.max(0, hpB - refDmg);
              battleLogs.push(`🪞 **Phản đòn**: **${tuSiB.ten}** gánh chịu \`-${refDmg.toLocaleString()}\` sát thương phản chấn (HP còn: \`${hpB.toLocaleString()}\`).`);
            }

            let roundLifestealB = statsB.lifesteal;
            if (roundLifestealB > 0) {
              const healed = Math.floor(dmgB * roundLifestealB);
              if (healed > 0) {
                hpB = Math.min(statsB.max_hp, hpB + healed);
                battleLogs.push(`🩸 **Hút máu**: **${tuSiB.ten}** hồi phục \`+${healed}\` HP (Hiện tại: \`${hpB}/${statsB.max_hp}\`).`);
              }
            }
          }
        }
      }

      if (hpA <= 0) {
        if (caituA > 0 && !caituTriggeredA) {
          caituTriggeredA = true;
          hpA = Math.floor(statsA.max_hp * 0.15);
          battleLogs.push(`😇 **Cải Tử Hoàn Sinh**: **${tuSiA.ten}** được cứu mạng bởi Linh thú, hồi phục lại \`${hpA.toLocaleString()}\` HP!`);
        } else {
          winner = tuSiB;
          break;
        }
      }

      if (hpB <= 0) {
        if (caituB > 0 && !caituTriggeredB) {
          caituTriggeredB = true;
          hpB = Math.floor(statsB.max_hp * 0.15);
          battleLogs.push(`😇 **Cải Tử Hoàn Sinh**: **${tuSiB.ten}** được cứu mạng bởi Linh thú, hồi phục lại \`${hpB.toLocaleString()}\` HP!`);
        } else {
          winner = tuSiA;
          break;
        }
      }

      // Giảm buff thời hạn Luyện Khí của B
      if (tuKhiActiveB > 0) {
        tuKhiActiveB--;
        if (tuKhiActiveB === 0) {
          battleLogs.push(`✨ Hiệu ứng [Tụ Khí] của **${tuSiB.ten}** đã hết tác dụng.`);
        }
      }
      if (chienYDurationB > 0) {
        chienYDurationB--;
        if (chienYDurationB === 0) {
          chienYStacksB = 0;
          battleLogs.push(`✨ Hiệu ứng [Chiến Ý] của **${tuSiB.ten}** đã hết tác dụng.`);
        }
      }
      if (linhPhaoDebuffB > 0) {
        linhPhaoDebuffB--;
      }

      // Giảm buff thời hạn Pháp bảo của B
      for (const buff of activeBuffsB) {
        if (buff.roundsLeft > 0) {
          buff.roundsLeft--;
          if (buff.roundsLeft === 0) {
            battleLogs.push(`✨ Hiệu ứng [${buff.ten}] của **${buff.pbTen}** (${tuSiB.ten}) đã hết tác dụng.`);
          }
        }
      }

      if (slowRoundsB > 0) slowRoundsB--;
      if (weakenRoundsB > 0) weakenRoundsB--;
      if (tanKhiRoundsB > 0) tanKhiRoundsB--;
      if (shieldB <= 0) {
        critImmuneB = false;
        reflectB = false;
      }

      actionCountB++;
      combatRound++;
    }
  }

  return { winner, battleLogs, round };
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
export const danhSachLenhTuongTac = [controller.lenhTuongTac, controller.lenhBoThi];
export { controller as boDieuKhienTuongTac, _simCombat };
