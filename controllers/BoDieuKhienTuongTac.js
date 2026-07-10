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

  // Trạng thái hiệu ứng Luyện Khí
  let tuKhiActiveA = 0;
  let chienYStacksA = 0;
  let chienYDurationA = 0;
  let linhPhaoDebuffA = 0;

  let tuKhiActiveB = 0;
  let chienYStacksB = 0;
  let chienYDurationB = 0;
  let linhPhaoDebuffB = 0;

  // Trạng thái hiệu ứng Thần thú A
  let toLongBuffActiveA = false;
  let playerLifestealRoundsA = 0;
  let stunnedRoundsB = 0;
  let petSkillCooldownLeftA = 0;
  let huyenVuBuffActiveA = false;
  let huyenVuCritActiveA = false;
  let critDmgRedPctA = 0;
  let poisonRoundsB = 0;
  let poisonStacksB = 0;
  let poisonDmgPerStackB = 0;
  let bachHoBuffActiveA = false;
  let weakenRoundsB = 0;
  let weakenPctB = 0;
  let playerImmuneRoundsA = 0;
  let kyLanBuffActiveA = false;
  let kyLanCumulativeDmgA = 0;
  let kyLanBurstTriggeredA = false;
  let phoenixTriggeredA = false;
  let phoenixRegenRoundsA = 0;

  // Trạng thái hiệu ứng Thần thú B
  let toLongBuffActiveB = false;
  let playerLifestealRoundsB = 0;
  let stunnedRoundsA = 0;
  let petSkillCooldownLeftB = 0;
  let huyenVuBuffActiveB = false;
  let huyenVuCritActiveB = false;
  let critDmgRedPctB = 0;
  let poisonRoundsA = 0;
  let poisonStacksA = 0;
  let poisonDmgPerStackA = 0;
  let bachHoBuffActiveB = false;
  let weakenRoundsA = 0;
  let weakenPctA = 0;
  let playerImmuneRoundsB = 0;
  let kyLanBuffActiveB = false;
  let kyLanCumulativeDmgB = 0;
  let kyLanBurstTriggeredB = false;
  let phoenixTriggeredB = false;
  let phoenixRegenRoundsB = 0;

  const originalMaxHpA = statsA.max_hp;
  const originalMaxHpB = statsB.max_hp;
  const petTemplateA = petA ? config.PET_TEMPLATES[petA.type] : null;
  const petTemplateB = petB ? config.PET_TEMPLATES[petB.type] : null;
  const isHuyenVuActiveA = petTemplateA && petTemplateA.species === 'huyen_vu';
  const isHuyenVuActiveB = petTemplateB && petTemplateB.species === 'huyen_vu';

  // Kích hoạt Thần thú A khi vào trận
  if (petA && hpB > 0) {
    const template = config.PET_TEMPLATES[petA.type];
    if (template && template.group === 'than_thu') {
      const totalEvolves = config.getPetTotalEvolves(petA);
      const evoMult = Math.pow(1.05, totalEvolves);

      if (template.species === 'to_long') {
        const dmg = Math.floor(statsA.phap_cong * 1.2 * evoMult);
        hpB = Math.max(0, hpB - dmg);
        toLongBuffActiveA = true;
        playerLifestealRoundsA = (petA.tienHoa >= 6) ? 3 : 2;
        stunnedRoundsB = 2;
        petSkillCooldownLeftA = 5;
        battleLogs.push(`🐉 **Thần Thú Kích Hoạt**: **${petA.name}** của **${tuSiA.ten}** thi triển **Phước lành chân long 🐉**, gây \`${dmg.toLocaleString()}\` sát thương pháp thuật lên **${tuSiB.ten}** (HP còn: \`${hpB.toLocaleString()}\`). Khiến đối phương bị **Choáng trong 2 lượt** và tăng **50% hút máu** cho chủ nhân trong \`${playerLifestealRoundsA}\` lượt!`);
      } else if (template.species === 'huyen_vu') {
        const shieldAmt = Math.floor(statsA.max_hp * 0.25 * evoMult);
        shieldA = (shieldA || 0) + shieldAmt;
        huyenVuBuffActiveA = true;
        huyenVuCritActiveA = true;
        critDmgRedPctA = Math.min(0.50, 0.20 + (petA.tienHoa || 0) * 0.03);

        poisonRoundsB = 3;
        poisonStacksB = 1;
        poisonDmgPerStackB = Math.floor(statsA.max_hp * Math.min(0.10, 0.05 + (petA.tienHoa || 0) * 0.005));
        const poisonDmgInitial = poisonDmgPerStackB * poisonStacksB;
        petSkillCooldownLeftA = 5;

        battleLogs.push(`🐢 **Thần Thú Kích Hoạt**: **${petA.name}** của **${tuSiA.ten}** thi triển **Cự Thần Hồng Hoang 🐢**, tạo lớp lá chắn kiên cố \`${shieldAmt.toLocaleString()}\` HP hộ mệnh, đồng thời phun chất độc gây \`${poisonDmgInitial.toLocaleString()}\` sát thương độc lực đầu mỗi lượt lên **${tuSiB.ten}**. Khi đối phương bạo kích, chủ nhân giảm \`${Math.floor(critDmgRedPctA * 100)}%\` sát thương gánh chịu và phản lại 25% sát thương gánh chịu!`);
      } else if (template.species === 'bach_ho') {
        const dmg = Math.floor(statsA.vat_cong * 1.2 * evoMult);
        hpB = Math.max(0, hpB - dmg);
        bachHoBuffActiveA = true;
        
        weakenRoundsB = 2;
        weakenPctB = Math.min(0.50, 0.20 + (petA.tienHoa || 0) * 0.03);
        playerImmuneRoundsA = 2;
        petSkillCooldownLeftA = 5;
        battleLogs.push(`🐅 **Thần Thú Kích Hoạt**: **${petA.name}** của **${tuSiA.ten}** thi triển **Bạch Hổ Sát Chiêu 🐅**, trảo kích gây \`${dmg.toLocaleString()}\` sát thương vật lý lên **${tuSiB.ten}** (HP còn: \`${hpB.toLocaleString()}\`). Khiến đối phương bị **Suy yếu giảm ${Math.floor(weakenPctB * 100)}% song công** trong 2 lượt, giải trừ và kháng toàn bộ hiệu ứng bất lợi trong 2 lượt!`);
      } else if (template.species === 'phuong_hoang') {
        const baseDmg = (statsA.vat_cong + statsA.phap_cong) * evoMult;
        const addHits = Math.floor(statsA.crit_dmg / 0.8);
        const totalHits = 1 + addHits;
        let totalPetDmg = 0;
        let currentHitDmg = baseDmg;
        for (let h = 0; h < totalHits; h++) {
          totalPetDmg += currentHitDmg;
          currentHitDmg = currentHitDmg * 1.2;
        }
        totalPetDmg = Math.floor(totalPetDmg);
        hpB = Math.max(0, hpB - totalPetDmg);
        petSkillCooldownLeftA = 5;
        battleLogs.push(`<:phung:1522635618377662484> **Thần Thú Kích Hoạt**: **${petA.name}** của **${tuSiA.ten}** thi triển **Hỏa Phượng Liệt Diễm**, liên hoàn oanh kích **${totalHits} lần** lên **${tuSiB.ten}**, gây tổng cộng \`${totalPetDmg.toLocaleString()}\` sát thương (HP còn: \`${hpB.toLocaleString()}\`).`);
      } else if (template.species === 'ky_lan') {
        petSkillCooldownLeftA = 0;
      }
    }
  }

  // Kích hoạt Thần thú B khi vào trận
  if (petB && hpA > 0) {
    const template = config.PET_TEMPLATES[petB.type];
    if (template && template.group === 'than_thu') {
      const totalEvolves = config.getPetTotalEvolves(petB);
      const evoMult = Math.pow(1.05, totalEvolves);

      if (template.species === 'to_long') {
        const dmg = Math.floor(statsB.phap_cong * 1.2 * evoMult);
        hpA = Math.max(0, hpA - dmg);
        toLongBuffActiveB = true;
        playerLifestealRoundsB = (petB.tienHoa >= 6) ? 3 : 2;
        stunnedRoundsA = 2;
        petSkillCooldownLeftB = 5;
        battleLogs.push(`🐉 **Thần Thú Kích Hoạt**: **${petB.name}** của **${tuSiB.ten}** thi triển **Phước lành chân long 🐉**, gây \`${dmg.toLocaleString()}\` sát thương pháp thuật lên **${tuSiA.ten}** (HP còn: \`${hpA.toLocaleString()}\`). Khiến đối phương bị **Choáng trong 2 lượt** và tăng **50% hút máu** cho chủ nhân trong \`${playerLifestealRoundsB}\` lượt!`);
      } else if (template.species === 'huyen_vu') {
        const shieldAmt = Math.floor(statsB.max_hp * 0.25 * evoMult);
        shieldB = (shieldB || 0) + shieldAmt;
        huyenVuBuffActiveB = true;
        huyenVuCritActiveB = true;
        critDmgRedPctB = Math.min(0.50, 0.20 + (petB.tienHoa || 0) * 0.03);

        poisonRoundsA = 3;
        poisonStacksA = 1;
        poisonDmgPerStackA = Math.floor(statsB.max_hp * Math.min(0.10, 0.05 + (petB.tienHoa || 0) * 0.005));
        const poisonDmgInitial = poisonDmgPerStackA * poisonStacksA;
        petSkillCooldownLeftB = 5;

        battleLogs.push(`🐢 **Thần Thú Kích Hoạt**: **${petB.name}** của **${tuSiB.ten}** thi triển **Cự Thần Hồng Hoang 🐢**, tạo lớp lá chắn kiên cố \`${shieldAmt.toLocaleString()}\` HP hộ mệnh, đồng thời phun chất độc gây \`${poisonDmgInitial.toLocaleString()}\` sát thương độc lực đầu mỗi lượt lên **${tuSiA.ten}**. Khi đối phương bạo kích, chủ nhân giảm \`${Math.floor(critDmgRedPctB * 100)}%\` sát thương gánh chịu và phản lại 25% sát thương gánh chịu!`);
      } else if (template.species === 'bach_ho') {
        const dmg = Math.floor(statsB.vat_cong * 1.2 * evoMult);
        hpA = Math.max(0, hpA - dmg);
        bachHoBuffActiveB = true;
        
        weakenRoundsA = 2;
        weakenPctB = Math.min(0.50, 0.20 + (petB.tienHoa || 0) * 0.03);
        playerImmuneRoundsB = 2;
        petSkillCooldownLeftB = 5;
        battleLogs.push(`🐅 **Thần Thú Kích Hoạt**: **${petB.name}** của **${tuSiB.ten}** thi triển **Bạch Hổ Sát Chiêu 🐅**, trảo kích gây \`${dmg.toLocaleString()}\` sát thương vật lý lên **${tuSiA.ten}** (HP còn: \`${hpA.toLocaleString()}\`). Khiến đối phương bị **Suy yếu giảm ${Math.floor(weakenPctB * 100)}% song công** trong 2 lượt, giải trừ và kháng toàn bộ hiệu ứng bất lợi trong 2 lượt!`);
      } else if (template.species === 'phuong_hoang') {
        const baseDmg = (statsB.vat_cong + statsB.phap_cong) * evoMult;
        const addHits = Math.floor(statsB.crit_dmg / 0.8);
        const totalHits = 1 + addHits;
        let totalPetDmg = 0;
        let currentHitDmg = baseDmg;
        for (let h = 0; h < totalHits; h++) {
          totalPetDmg += currentHitDmg;
          currentHitDmg = currentHitDmg * 1.2;
        }
        totalPetDmg = Math.floor(totalPetDmg);
        hpA = Math.max(0, hpA - totalPetDmg);
        petSkillCooldownLeftB = 5;
        battleLogs.push(`<:phung:1522635618377662484> **Thần Thú Kích Hoạt**: **${petB.name}** của **${tuSiB.ten}** thi triển **Hỏa Phượng Liệt Diễm**, liên hoàn oanh kích **${totalHits} lần** lên **${tuSiA.ten}**, gây tổng cộng \`${totalPetDmg.toLocaleString()}\` sát thương (HP còn: \`${hpA.toLocaleString()}\`).`);
      } else if (template.species === 'ky_lan') {
        petSkillCooldownLeftB = 0;
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
    const dynamicBaseAvB = 10000 / currentSpeedB;

    if (avPlayerA <= avPlayerB) {
      // Lượt của Player A
      const elapsed = avPlayerA;
      avPlayerB -= elapsed;
      avPlayerA = dynamicBaseAvA;

      // Hồi Niết Bàn của A
      if (phoenixRegenRoundsA > 0) {
        const regenAmt = Math.floor(statsA.max_hp * 0.05);
        hpA = Math.min(statsA.max_hp, hpA + regenAmt);
        battleLogs.push(`<:phung:1522635618377662484> **Phượng Hoàng Hộ Thể**: **${tuSiA.ten}** hồi phục \`+${regenAmt}\` HP từ Niết Bàn (Hiện tại: \`${hpA}/${statsA.max_hp}\`).`);
        phoenixRegenRoundsA--;
      }

      if (isHuyenVuActiveA) {
        const healAmt = Math.floor(statsA.max_hp * 0.05);
        hpA = Math.min(statsA.max_hp, hpA + healAmt);
        const maxHpBuff = Math.floor(originalMaxHpA * 0.05);
        statsA.max_hp += maxHpBuff;
        battleLogs.push(`🐢 **Huyền Vũ Hồi Phục**: **${tuSiA.ten}** hồi phục \`+${healAmt.toLocaleString()}\` HP và gia tăng giới hạn HP tối đa thêm \`+${maxHpBuff.toLocaleString()}\` (HP hiện tại: \`${hpA}/${statsA.max_hp}\`).`);
      }

      // Độc lực của Huyền Vũ tác dụng lên A (nếu B xài Huyền Vũ)
      if (poisonRoundsA > 0 && poisonStacksA > 0) {
        const poisonDmg = poisonDmgPerStackA * poisonStacksA;
        hpA = Math.max(0, hpA - poisonDmg);
        battleLogs.push(`🤢 **Trúng độc**: **${tuSiA.ten}** chịu \`-${poisonDmg.toLocaleString()}\` sát thương độc lực từ Thần thú của **${tuSiB.ten}** (HP còn: \`${hpA}\`).`);
        poisonRoundsA--;
        if (poisonRoundsA === 0) poisonStacksA = 0;
        if (hpA <= 0) {
          winner = tuSiB;
          break;
        }
      }

      if (stunnedRoundsA > 0) {
        battleLogs.push(`💤 **Choáng**: **${tuSiA.ten}** bị choáng không thể hành động trong lượt này!`);
        stunnedRoundsA--;
      } else {
        // A tấn công B
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
          }
        }
        if (toLongBuffActiveA) roundAtkAMult += 0.10;
        if (isHuyenVuActiveA) {
          const huyenVuBuffA = actionCountA * 0.02;
          roundAtkAMult += huyenVuBuffA;
        }
        let currentRoundAtkA = Math.floor(atkA * roundAtkAMult);

        // Suy yếu của B giảm công của A
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
          }
          if (skill.id === 'bat_hoang_toai_thach_kich') {
            const ignorePct = Math.min(1.0, 0.10 * (1 + (capDo - 1) * 0.01));
            targetDefB = Math.floor(defB * (1 - ignorePct));
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
            battleLogs.push(`🔥 **${skill.ten}**: **${tuSiA.ten}** thiêu đốt \`-${hpSacrifice.toLocaleString()}\` HP hiện tại, tích lũy 1 tầng **[Chiến Ý]** (Hiện tại: \`${chienYStacksA}/3\` tầng, kéo dài 3 hiệp).`);
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
          }
          dmgA = Math.max(1, Math.floor(rawDmg) - targetDefB);
          castMsgA = `đánh thường`;
        }

        // B né tránh đòn A
        let roundNeB = statsB.ne;
        if (kyLanBuffActiveB) roundNeB = Math.min(0.90, roundNeB + 0.15);

        if (Math.random() <= roundNeB) {
          battleLogs.push(`⚡ **Hiệp ${combatRound}** (Lượt ${actionCountA + 1} của **${tuSiA.ten}**, AV: ${elapsed.toFixed(0)}): **${tuSiA.ten}** ${castMsgA} nhưng **${tuSiB.ten}** né tránh thành công!`);
        } else {
          // B gánh chịu sát thương, bạo kích Huyền Vũ giảm bạo/phản đòn
          if (isCritA && huyenVuCritActiveB) {
            const redAmt = Math.floor(dmgA * critDmgRedPctB);
            dmgA -= redAmt;
            const reflectDmg = Math.floor(dmgA * 0.25);
            hpA = Math.max(0, hpA - reflectDmg);
            battleLogs.push(`🐢 **Huyền Vũ Giảm Bạo**: **${tuSiB.ten}** giảm \`-${Math.floor(critDmgRedPctB * 100)}%\` sát thương bạo kích gánh chịu, phản hồi \`+${reflectDmg.toLocaleString()}\` sát thương ngược lại **${tuSiA.ten}** (HP còn: \`${hpA.toLocaleString()}\`).`);
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

            // Hút máu của A
            let roundLifestealA = statsA.lifesteal;
            if (kyLanBuffActiveA) roundLifestealA += 0.10;
            if (playerLifestealRoundsA > 0) roundLifestealA += 0.50;
            if (roundLifestealA > 0) {
              const healed = Math.floor(dmgA * roundLifestealA);
              if (healed > 0) {
                hpA = Math.min(statsA.max_hp, hpA + healed);
                battleLogs.push(`🩸 **Hút máu**: **${tuSiA.ten}** hồi phục \`+${healed}\` HP (Hiện tại: \`${hpA}/${statsA.max_hp}\`).`);
              }
            }
          }
        }

        if (hpB <= 0) {
          winner = tuSiA;
          break;
        }

        // Kỳ Lân của A đánh mỗi lượt của A
        if (petA) {
          const template = config.PET_TEMPLATES[petA.type];
          if (template && template.group === 'than_thu') {
            const totalEvolves = config.getPetTotalEvolves(petA);
            const evoMult = Math.pow(1.05, totalEvolves);

            if (template.species === 'ky_lan') {
              const pct = Math.min(0.30, 0.25 + (petA.tienHoa || 0) * 0.005);
              const isPhap = tuSiA.huongTu === 'Phap Tu' || tuSiA.huongTu === 'Pháp Tu';
              const dmgTypeVal = isPhap ? statsA.phap_cong : statsA.vat_cong;
              let petDmg = Math.floor(dmgTypeVal * pct * evoMult);
              hpB = Math.max(0, hpB - petDmg);
              kyLanCumulativeDmgA = (kyLanCumulativeDmgA || 0) + petDmg;
              battleLogs.push(`🦄 **Thần Thú Kích Hoạt**: **${petA.name}** oanh kích gây \`${petDmg.toLocaleString()}\` sát thương ${isPhap ? 'pháp thuật' : 'vật lý'} lên **${tuSiB.ten}** (HP còn: \`${hpB.toLocaleString()}\`).`);

              const limit = statsA.max_hp * Math.min(0.70, 0.50 + (petA.tienHoa || 0) * 0.02);
              if (!kyLanBurstTriggeredA && kyLanCumulativeDmgA >= limit) {
                const burstDmg = Math.floor(limit * 2);
                hpB = Math.max(0, hpB - burstDmg);
                kyLanBurstTriggeredA = true;
                battleLogs.push(`🦄 **Kỳ Lân Bộc Phá**: Tích lũy sát thương đạt mốc, **${petA.name}** bộc phát cuồng nộ x2 sát thương giới hạn, giáng thêm \`-${burstDmg.toLocaleString()}\` sát thương chí mạng lên **${tuSiB.ten}** (HP còn: \`${hpB.toLocaleString()}\`)!`);
              }
              if (hpB <= 0) {
                winner = tuSiA;
                break;
              }
            } else {
              // Thần thú khác của A chủ động (20%)
              if (petSkillCooldownLeftA === 0 && Math.random() <= 0.20) {
                petSkillCooldownLeftA = 5;
                if (template.species === 'to_long') {
                  const petDmg = Math.floor(statsA.phap_cong * 1.2 * evoMult);
                  hpB = Math.max(0, hpB - petDmg);
                  toLongBuffActiveA = true;
                  playerLifestealRoundsA = (petA.tienHoa >= 6) ? 3 : 2;
                  stunnedRoundsB = 2;
                  battleLogs.push(`🐉 **Thần Thú Kích Hoạt**: **${petA.name}** thi triển **Phước lành chân long 🐉** gây \`${petDmg.toLocaleString()}\` sát thương pháp thuật lên **${tuSiB.ten}** (HP còn: \`${hpB.toLocaleString()}\`). Đối phương bị **Choáng trong 2 lượt** và tăng **50% hút máu** cho chủ nhân trong \`${playerLifestealRoundsA}\` lượt!`);
                  if (hpB <= 0) {
                    winner = tuSiA;
                    break;
                  }
                } else if (template.species === 'huyen_vu') {
                  const petShield = Math.floor(statsA.max_hp * 0.25 * evoMult);
                  shieldA += petShield;
                  
                  poisonRoundsB = 3;
                  poisonStacksB = Math.min(3, (poisonStacksB || 0) + 1);
                  poisonDmgPerStackB = Math.floor(statsA.max_hp * Math.min(0.10, 0.05 + (petA.tienHoa || 0) * 0.005));
                  const poisonDmgTotal = poisonDmgPerStackB * poisonStacksB;

                  huyenVuBuffActiveA = true;
                  huyenVuCritActiveA = true;
                  critDmgRedPctA = Math.min(0.50, 0.20 + (petA.tienHoa || 0) * 0.03);

                  battleLogs.push(`🐢 **Thần Thú Kích Hoạt**: **${petA.name}** thi triển **Cự Thần Hồng Hoang 🐢**, tạo lá chắn \`${petShield.toLocaleString()}\` HP bảo vệ, và giải độc lực gây \`${poisonDmgTotal.toLocaleString()}\` sát thương độc mỗi lượt lên đối thủ.`);
                  if (hpB <= 0) {
                    winner = tuSiA;
                    break;
                  }
                } else if (template.species === 'bach_ho') {
                  const petDmg = Math.floor(statsA.vat_cong * 1.2 * evoMult);
                  hpB = Math.max(0, hpB - petDmg);
                  
                  weakenRoundsB = 2;
                  weakenPctB = Math.min(0.50, 0.20 + (petA.tienHoa || 0) * 0.03);
                  playerImmuneRoundsA = 2;
                  bachHoBuffActiveA = true;

                  battleLogs.push(`🐅 **Thần Thú Kích Hoạt**: **${petA.name}** thi triển **Bạch Hổ Sát Chiêu 🐅**, trảo kích gây \`${petDmg.toLocaleString()}\` sát thương vật lý lên **${tuSiB.ten}** (HP còn: \`${hpB.toLocaleString()}\`). Khiến đối phương bị **Suy yếu giảm ${Math.floor(weakenPctB * 100)}% song công** trong 2 lượt, chủ nhân kháng toàn bộ hiệu ứng bất lợi trong 2 lượt!`);
                  if (hpB <= 0) {
                    winner = tuSiA;
                    break;
                  }
                } else if (template.species === 'phuong_hoang') {
                  const baseDmg = (statsA.vat_cong + statsA.phap_cong) * evoMult;
                  const addHits = Math.floor(statsA.crit_dmg / 0.8);
                  const totalHits = 1 + addHits;
                  let totalPetDmg = 0;
                  let currentHitDmg = baseDmg;
                  for (let h = 0; h < totalHits; h++) {
                    totalPetDmg += currentHitDmg;
                    currentHitDmg = currentHitDmg * 1.2;
                  }
                  totalPetDmg = Math.floor(totalPetDmg);
                  hpB = Math.max(0, hpB - totalPetDmg);
                  battleLogs.push(`<:phung:1522635618377662484> **Thần Thú Kích Hoạt**: **${petA.name}** thi triển **Hỏa Phượng Liệt Diễm**, liên hoàn oanh kích **${totalHits} lần** lên đối thủ, gây tổng cộng \`${totalPetDmg.toLocaleString()}\` sát thương.`);
                  if (hpB <= 0) {
                    winner = tuSiA;
                    break;
                  }
                }
              }
            }
          }
        }
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

      if (petSkillCooldownLeftA > 0) petSkillCooldownLeftA--;
      if (playerLifestealRoundsA > 0) playerLifestealRoundsA--;
      if (playerImmuneRoundsA > 0) playerImmuneRoundsA--;
      if (weakenRoundsA > 0) weakenRoundsA--;
      if (slowRoundsA > 0) slowRoundsA--;

      actionCountA++;
      combatRound++;
    } else {
      // Lượt của Player B
      const elapsed = avPlayerB;
      avPlayerA -= elapsed;
      avPlayerB = dynamicBaseAvB;

      // Hồi Niết Bàn của B
      if (phoenixRegenRoundsB > 0) {
        const regenAmt = Math.floor(statsB.max_hp * 0.05);
        hpB = Math.min(statsB.max_hp, hpB + regenAmt);
        battleLogs.push(`<:phung:1522635618377662484> **Phượng Hoàng Hộ Thể**: **${tuSiB.ten}** hồi phục \`+${regenAmt}\` HP từ Niết Bàn (Hiện tại: \`${hpB}/${statsB.max_hp}\`).`);
        phoenixRegenRoundsB--;
      }

      if (isHuyenVuActiveB) {
        const healAmt = Math.floor(statsB.max_hp * 0.05);
        hpB = Math.min(statsB.max_hp, hpB + healAmt);
        const maxHpBuff = Math.floor(originalMaxHpB * 0.05);
        statsB.max_hp += maxHpBuff;
        battleLogs.push(`🐢 **Huyền Vũ Hồi Phục**: **${tuSiB.ten}** hồi phục \`+${healAmt.toLocaleString()}\` HP và gia tăng giới hạn HP tối đa thêm \`+${maxHpBuff.toLocaleString()}\` (HP hiện tại: \`${hpB}/${statsB.max_hp}\`).`);
      }

      // Độc lực của Huyền Vũ tác dụng lên B (nếu A xài Huyền Vũ)
      if (poisonRoundsB > 0 && poisonStacksB > 0) {
        const poisonDmg = poisonDmgPerStackB * poisonStacksB;
        hpB = Math.max(0, hpB - poisonDmg);
        battleLogs.push(`🤢 **Trúng độc**: **${tuSiB.ten}** chịu \`-${poisonDmg.toLocaleString()}\` sát thương độc lực từ Thần thú của **${tuSiA.ten}** (HP còn: \`${hpB}\`).`);
        poisonRoundsB--;
        if (poisonRoundsB === 0) poisonStacksB = 0;
        if (hpB <= 0) {
          winner = tuSiA;
          break;
        }
      }

      if (stunnedRoundsB > 0) {
        battleLogs.push(`💤 **Choáng**: **${tuSiB.ten}** bị choáng không thể hành động trong lượt này!`);
        stunnedRoundsB--;
      } else {
        // B tấn công A
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
          }
        }
        if (toLongBuffActiveB) roundAtkBMult += 0.10;
        if (isHuyenVuActiveB) {
          const huyenVuBuffB = actionCountB * 0.02;
          roundAtkBMult += huyenVuBuffB;
        }
        let currentRoundAtkB = Math.floor(atkB * roundAtkBMult);

        // Suy yếu của A giảm công của B
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

          // Combo / Hiệu ứng kỹ năng Luyện Khí B
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
          }
          if (skill.id === 'bat_hoang_toai_thach_kich') {
            const ignorePct = Math.min(1.0, 0.10 * (1 + (capDo - 1) * 0.01));
            targetDefA = Math.floor(defA * (1 - ignorePct));
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
            battleLogs.push(`🔥 **${skill.ten}**: **${tuSiB.ten}** thiêu đốt \`-${hpSacrifice.toLocaleString()}\` HP hiện tại, tích lũy 1 tầng **[Chiến Ý]** (Hiện tại: \`${chienYStacksB}/3\` tầng, kéo dài 3 hiệp).`);
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
          }
          dmgB = Math.max(1, Math.floor(rawDmg) - targetDefA);
          castMsgB = `phản kích đánh thường`;
        }

        // A né tránh đòn B
        let roundNeA = statsA.ne;
        if (kyLanBuffActiveA) roundNeA = Math.min(0.90, roundNeA + 0.15);

        if (Math.random() <= roundNeA) {
          battleLogs.push(`⚡ **Hiệp ${combatRound}** (Lượt ${actionCountB + 1} của **${tuSiB.ten}**, AV: ${elapsed.toFixed(0)}): **${tuSiB.ten}** ${castMsgB} nhưng **${tuSiA.ten}** né tránh thành công!`);
        } else {
          // A gánh chịu sát thương, bạo kích Huyền Vũ giảm bạo/phản đòn
          if (isCritB && huyenVuCritActiveA) {
            const redAmt = Math.floor(dmgB * critDmgRedPctA);
            dmgB -= redAmt;
            const reflectDmg = Math.floor(dmgB * 0.25);
            hpB = Math.max(0, hpB - reflectDmg);
            battleLogs.push(`🐢 **Huyền Vũ Giảm Bạo**: **${tuSiA.ten}** giảm \`-${Math.floor(critDmgRedPctA * 100)}%\` sát thương bạo kích gánh chịu, phản hồi \`+${reflectDmg.toLocaleString()}\` sát thương ngược lại **${tuSiB.ten}** (HP còn: \`${hpB.toLocaleString()}\`).`);
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

            // Hút máu của B
            let roundLifestealB = statsB.lifesteal;
            if (kyLanBuffActiveB) roundLifestealB += 0.10;
            if (playerLifestealRoundsB > 0) roundLifestealB += 0.50;
            if (roundLifestealB > 0) {
              const healed = Math.floor(dmgB * roundLifestealB);
              if (healed > 0) {
                hpB = Math.min(statsB.max_hp, hpB + healed);
                battleLogs.push(`🩸 **Hút máu**: **${tuSiB.ten}** hồi phục \`+${healed}\` HP (Hiện tại: \`${hpB}/${statsB.max_hp}\`).`);
              }
            }
          }
        }

        if (hpA <= 0) {
          winner = tuSiB;
          break;
        }

        // Kỳ Lân của B đánh mỗi lượt của B
        if (petB) {
          const template = config.PET_TEMPLATES[petB.type];
          if (template && template.group === 'than_thu') {
            const totalEvolves = config.getPetTotalEvolves(petB);
            const evoMult = Math.pow(1.05, totalEvolves);

            if (template.species === 'ky_lan') {
              const pct = Math.min(0.30, 0.25 + (petB.tienHoa || 0) * 0.005);
              const isPhap = tuSiB.huongTu === 'Phap Tu' || tuSiB.huongTu === 'Pháp Tu';
              const dmgTypeVal = isPhap ? statsB.phap_cong : statsB.vat_cong;
              let petDmg = Math.floor(dmgTypeVal * pct * evoMult);
              hpA = Math.max(0, hpA - petDmg);
              kyLanCumulativeDmgB = (kyLanCumulativeDmgB || 0) + petDmg;
              battleLogs.push(`🦄 **Thần Thú Kích Hoạt**: **${petB.name}** oanh kích gây \`${petDmg.toLocaleString()}\` sát thương ${isPhap ? 'pháp thuật' : 'vật lý'} lên **${tuSiA.ten}** (HP còn: \`${hpA.toLocaleString()}\`).`);

              const limit = statsB.max_hp * Math.min(0.70, 0.50 + (petB.tienHoa || 0) * 0.02);
              if (!kyLanBurstTriggeredB && kyLanCumulativeDmgB >= limit) {
                const burstDmg = Math.floor(limit * 2);
                hpA = Math.max(0, hpA - burstDmg);
                kyLanBurstTriggeredB = true;
                battleLogs.push(`🦄 **Kỳ Lân Bộc Phá**: Tích lũy sát thương đạt mốc, **${petB.name}** bộc phát cuồng nộ x2 sát thương giới hạn, giáng thêm \`-${burstDmg.toLocaleString()}\` sát thương chí mạng lên **${tuSiA.ten}** (HP còn: \`${hpA.toLocaleString()}\`)!`);
              }
              if (hpA <= 0) {
                winner = tuSiB;
                break;
              }
            } else {
              // Thần thú khác của B chủ động (20%)
              if (petSkillCooldownLeftB === 0 && Math.random() <= 0.20) {
                petSkillCooldownLeftB = 5;
                if (template.species === 'to_long') {
                  const petDmg = Math.floor(statsB.phap_cong * 1.2 * evoMult);
                  hpA = Math.max(0, hpA - petDmg);
                  toLongBuffActiveB = true;
                  playerLifestealRoundsB = (petB.tienHoa >= 6) ? 3 : 2;
                  stunnedRoundsA = 2;
                  battleLogs.push(`🐉 **Thần Thú Kích Hoạt**: **${petB.name}** thi triển **Phước lành chân long 🐉** gây \`${petDmg.toLocaleString()}\` sát thương pháp thuật lên **${tuSiA.ten}** (HP còn: \`${hpA.toLocaleString()}\`). Đối phương bị **Choáng trong 2 lượt** và tăng **50% hút máu** cho chủ nhân trong \`${playerLifestealRoundsB}\` lượt!`);
                  if (hpA <= 0) {
                    winner = tuSiB;
                    break;
                  }
                } else if (template.species === 'huyen_vu') {
                  const petShield = Math.floor(statsB.max_hp * 0.25 * evoMult);
                  shieldB += petShield;
                  
                  poisonRoundsA = 3;
                  poisonStacksA = Math.min(3, (poisonStacksA || 0) + 1);
                  poisonDmgPerStackA = Math.floor(statsB.max_hp * Math.min(0.10, 0.05 + (petB.tienHoa || 0) * 0.005));
                  const poisonDmgTotal = poisonDmgPerStackA * poisonStacksA;

                  huyenVuBuffActiveB = true;
                  huyenVuCritActiveB = true;
                  critDmgRedPctB = Math.min(0.50, 0.20 + (petB.tienHoa || 0) * 0.03);

                  battleLogs.push(`🐢 **Thần Thú Kích Hoạt**: **${petB.name}** thi triển **Cự Thần Hồng Hoang 🐢**, tạo lá chắn \`${petShield.toLocaleString()}\` HP bảo vệ, và giải độc lực gây \`${poisonDmgTotal.toLocaleString()}\` sát thương độc mỗi lượt lên đối thủ.`);
                  if (hpA <= 0) {
                    winner = tuSiB;
                    break;
                  }
                } else if (template.species === 'bach_ho') {
                  const petDmg = Math.floor(statsB.vat_cong * 1.2 * evoMult);
                  hpA = Math.max(0, hpA - petDmg);
                  
                  weakenRoundsA = 2;
                  weakenPctA = Math.min(0.50, 0.20 + (petB.tienHoa || 0) * 0.03);
                  playerImmuneRoundsB = 2;
                  bachHoBuffActiveB = true;

                  battleLogs.push(`🐅 **Thần Thú Kích Hoạt**: **${petB.name}** thi triển **Bạch Hổ Sát Chiêu 🐅**, trảo kích gây \`${petDmg.toLocaleString()}\` sát thương vật lý lên **${tuSiA.ten}** (HP còn: \`${hpA.toLocaleString()}\`). Khiến đối phương bị **Suy yếu giảm ${Math.floor(weakenPctA * 100)}% song công** trong 2 lượt, chủ nhân kháng toàn bộ hiệu ứng bất lợi trong 2 lượt!`);
                  if (hpA <= 0) {
                    winner = tuSiB;
                    break;
                  }
                } else if (template.species === 'phuong_hoang') {
                  const baseDmg = (statsB.vat_cong + statsB.phap_cong) * evoMult;
                  const addHits = Math.floor(statsB.crit_dmg / 0.8);
                  const totalHits = 1 + addHits;
                  let totalPetDmg = 0;
                  let currentHitDmg = baseDmg;
                  for (let h = 0; h < totalHits; h++) {
                    totalPetDmg += currentHitDmg;
                    currentHitDmg = currentHitDmg * 1.2;
                  }
                  totalPetDmg = Math.floor(totalPetDmg);
                  hpA = Math.max(0, hpA - totalPetDmg);
                  battleLogs.push(`<:phung:1522635618377662484> **Thần Thú Kích Hoạt**: **${petB.name}** thi triển **Hỏa Phượng Liệt Diễm**, liên hoàn oanh kích **${totalHits} lần** lên đối thủ, gây tổng cộng \`${totalPetDmg.toLocaleString()}\` sát thương.`);
                  if (hpA <= 0) {
                    winner = tuSiB;
                    break;
                  }
                }
              }
            }
          }
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

      if (petSkillCooldownLeftB > 0) petSkillCooldownLeftB--;
      if (playerLifestealRoundsB > 0) playerLifestealRoundsB--;
      if (playerImmuneRoundsB > 0) playerImmuneRoundsB--;
      if (weakenRoundsB > 0) weakenRoundsB--;
      if (slowRoundsB > 0) slowRoundsB--;

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
