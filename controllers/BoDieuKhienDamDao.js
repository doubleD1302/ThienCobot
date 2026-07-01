import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';

import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed, layMauCanhGioi } from '../views/BoTaoEmbed.js';
import * as config from '../config.js';

class BoDieuKhienDamDao extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  applyDamDaoTuVi(tuSi, goldChange) {
    let tuViChange = 0;
    if (goldChange > 0) {
      // Thắng: +1 tuvi mỗi 1k vàng kiếm được
      tuViChange = goldChange / 1000.0;
    } else if (goldChange < 0) {
      // Thua: -0.9 tuvi mỗi 1k vàng mất đi
      const goldLost = Math.abs(goldChange);
      tuViChange = -0.9 * (goldLost / 1000.0);
    }

    // Cập nhật tu vi và tu vi dư
    const currentRaw = tuSi.linhLuc + (tuSi.linhLucDu || 0.0);
    let nextRaw = currentRaw + tuViChange;
    if (nextRaw < 0) {
      nextRaw = 0;
    }

    const nextLinhLuc = Math.floor(nextRaw);
    tuSi.linhLuc = nextLinhLuc;
    tuSi.linhLucDu = nextRaw - nextLinhLuc;

    return tuViChange;
  }

  lenhDamDao = {
    data: new SlashCommandBuilder()
      .setName('damdao')
      .setDescription('Đàm đạo đỏ đen với cơ duyên thiên địa để thử vận may linh thạch')
      .addIntegerOption(option =>
        option.setName('linhthach')
          .setDescription('Số lượng linh thạch đặt cược')
          .setRequired(true)
          .setMinValue(100)
      ),

    execute: async (interaction) => {
      await interaction.deferReply();

      const bet = interaction.options.getInteger('linhthach');
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      if (tuSi.linhThach < bet) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(`Linh thạch bất túc! Ngươi chỉ có \`${tuSi.linhThach.toLocaleString()}\` 🪙 Linh thạch, không đủ cược \`${bet.toLocaleString()}\` 🪙.`)]
        });
      }

      const color = layMauCanhGioi(tuSi.canhGioi);
      let step = 'CHOOSE_GAME'; // CHOOSE_GAME, TAI_XIU, KIEM_GIAP_PHAP, BLACKJACK, NGU_HANH

      // State Blackjack
      let playerHand = [];
      let botHand = [];

      // ── Helper: Tạo giao diện lựa chọn game ─────────────────────────────────
      const buildChooseEmbed = () => {
        return new EmbedBuilder()
          .setTitle('🌌 Thiên Cơ Đàm Đạo')
          .setColor(color)
          .setDescription(
            `Đạo hữu **${tuSi.ten}** tiến vào sảnh đàm đạo nhân duyên.\n` +
            `🪙 **Linh thạch cược**: \`${bet.toLocaleString()}\` 🪙\n` +
            `🪙 **Linh thạch hiện có**: \`${tuSi.linhThach.toLocaleString()}\` 🪙\n\n` +
            `Hãy chọn trò chơi đỏ đen muốn đàm đạo dưới đây:`
          )
          .setTimestamp();
      };

      const buildChooseButtons = () => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('game_taixiu')
            .setLabel('🎲 Linh Khí Tài Xỉu')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('game_kiemgiap')
            .setLabel('🗡️ Kiếm - Giáp - Pháp')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('game_blackjack')
            .setLabel('🃏 Nhị Thập Nhất Lực (21)')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('game_nguhanh')
            .setLabel('🔮 Thiên Mệnh Ngũ Hành')
            .setStyle(ButtonStyle.Primary)
        );
      };

      const buildChooseRow2 = () => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('game_cancel')
            .setLabel('❌ Rút Lui')
            .setStyle(ButtonStyle.Danger)
        );
      };

      // Gửi tin nhắn chào mừng
      const msg = await interaction.editReply({
        embeds:     [buildChooseEmbed()],
        components: [buildChooseButtons(), buildChooseRow2()]
      });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time:   120_000 // Tăng thời gian chờ lên 2 phút
      });

      collector.on('collect', async i => {
        await i.deferUpdate();

        // Kiểm tra số dư linh thạch liên tục
        await tuSi.reload();
        if (tuSi.linhThach < bet) {
          collector.stop('insufficient_funds');
          return;
        }

        const getSum = (hand) => {
          let sum = hand.reduce((a, b) => a + b, 0);
          // Cơ chế tính Ách (1 hoặc 11)
          let aces = hand.filter(x => x === 11).length;
          while (sum > 21 && aces > 0) {
            sum -= 10;
            aces -= 1;
          }
          return sum;
        };

        // ══════════════════════════════════════════════════════════════
        // 1. GIAI ĐOẠN LỰA CHỌN TRÒ CHƠI
        // ══════════════════════════════════════════════════════════════
        if (step === 'CHOOSE_GAME') {
          if (i.customId === 'game_taixiu') {
            step = 'TAI_XIU';
            const embed = new EmbedBuilder()
              .setTitle('🎲 Linh Khí Tài Xỉu')
              .setColor(0x9b59b6)
              .setDescription(
                `Hệ thống sẽ gieo **3 viên Linh Xúc Xắc** (mỗi viên từ 1 đến 6).\n` +
                `• **Xỉu**: Tổng số điểm từ 3 đến 10.\n` +
                `• **Tài**: Tổng số điểm từ 11 đến 18.\n` +
                `• Tỷ lệ thắng: **1 ăn 1**.\n\n` +
                `Đạo hữu hãy đặt cửa thắng của mình:`
              );

            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('tx_tai').setLabel('🔴 Tài (11-18)').setStyle(ButtonStyle.Success),
              new ButtonBuilder().setCustomId('tx_xiu').setLabel('🔵 Xỉu (3-10)').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId('tx_cancel').setLabel('↩️ Trở Lại').setStyle(ButtonStyle.Secondary)
            );

            await i.editReply({ embeds: [embed], components: [row] });
          }

          else if (i.customId === 'game_kiemgiap') {
            step = 'KIEM_GIAP_PHAP';
            const embed = new EmbedBuilder()
              .setTitle('🗡️ Quyết Đấu: Kiếm - Giáp - Pháp')
              .setColor(0xe67e22)
              .setDescription(
                `Quy luật ngũ hành khắc chế:\n` +
                `• 🗡️ **Kiếm** chém rách 📜 **Pháp Bùa**.\n` +
                `• 🛡️ **Giáp** cản phá 🗡️ **Kiếm**.\n` +
                `• 📜 **Pháp Bùa** khắc chế 🛡️ **Giáp**.\n` +
                `• Tỷ lệ: Thắng nhận 1:1, Hòa hoàn trả cược.\n\n` +
                `Chọn thế võ thần thông của đạo hữu:`
              );

            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('kgp_kiem').setLabel('🗡️ Kiếm').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId('kgp_giap').setLabel('🛡️ Giáp').setStyle(ButtonStyle.Success),
              new ButtonBuilder().setCustomId('kgp_phap').setLabel('📜 Pháp Bùa').setStyle(ButtonStyle.Warning),
              new ButtonBuilder().setCustomId('kgp_cancel').setLabel('↩️ Trở Lại').setStyle(ButtonStyle.Secondary)
            );

            await i.editReply({ embeds: [embed], components: [row] });
          }

          else if (i.customId === 'game_blackjack') {
            step = 'BLACKJACK';
            
            // Chia bài ban đầu
            const drawCard = () => {
              const r = Math.floor(Math.random() * 10) + 1; // 1 đến 10
              return r === 1 ? 11 : r; // Quân 1 (Ách) tạm thời tính 11 điểm
            };

            playerHand = [drawCard(), drawCard()];
            botHand = [drawCard(), drawCard()];

            const pSum = getSum(playerHand);
            
            const embed = new EmbedBuilder()
              .setTitle('🃏 Nhị Thập Nhất Lực (Blackjack 21)')
              .setColor(0x3498db)
              .setDescription(
                `Đạo hữu cướp thời cơ rút linh bài đạt gần mốc 21 điểm nhất.\n\n` +
                `• **BÀI CỦA BẠN**: \`[ ${playerHand.join(' ] · [ ')} ]\` (Tổng điểm: **${pSum}**)\n` +
                `• **BÀI THIÊN ĐẠO**: \`[ ${botHand[0]} ] · [ ❓ ]\`\n\n` +
                `Chọn rút thêm linh bài hoặc dừng bài để phân thắng bại:`
              );

            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('bj_hit').setLabel('➕ Rút Thêm').setStyle(ButtonStyle.Success).setDisabled(pSum >= 21),
              new ButtonBuilder().setCustomId('bj_stand').setLabel('✋ Dừng Bài').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId('bj_cancel').setLabel('↩️ Trở Lại').setStyle(ButtonStyle.Secondary)
            );

            await i.editReply({ embeds: [embed], components: [row] });
          }

          else if (i.customId === 'game_nguhanh') {
            step = 'NGU_HANH';
            const embed = new EmbedBuilder()
              .setTitle('🔮 Thiên Mệnh Ngũ Hành')
              .setColor(0x1abc9c)
              .setDescription(
                `Đạo hữu hãy dự đoán khí kình của trời đất sẽ rơi vào hành nào trong Ngũ Hành.\n` +
                `• Dự đoán trúng sẽ nhận tỉ lệ thắng lớn **1 ăn 4**!\n\n` +
                `Chọn cung mệnh để đặt cược:`
              );

            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('nh_kim').setLabel('⚪ Kim').setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId('nh_moc').setLabel('🟢 Mộc').setStyle(ButtonStyle.Success),
              new ButtonBuilder().setCustomId('nh_thuy').setLabel('🔵 Thủy').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId('nh_hoa').setLabel('🔴 Hỏa').setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId('nh_tho').setLabel('🟡 Thổ').setStyle(ButtonStyle.Warning)
            );

            await i.editReply({ embeds: [embed], components: [row] });
          }

          else if (i.customId === 'game_cancel') {
            collector.stop('cancelled');
          }
        }

        // ══════════════════════════════════════════════════════════════
        // 2. CHƠI TÀI XỈU
        // ══════════════════════════════════════════════════════════════
        else if (step === 'TAI_XIU') {
          if (i.customId === 'tx_cancel') {
            step = 'CHOOSE_GAME';
            await i.editReply({ embeds: [buildChooseEmbed()], components: [buildChooseButtons(), buildChooseRow2()] });
            return;
          }

          const choice = i.customId === 'tx_tai' ? 'Tài' : 'Xỉu';
          const d1 = Math.floor(Math.random() * 6) + 1;
          const d2 = Math.floor(Math.random() * 6) + 1;
          const d3 = Math.floor(Math.random() * 6) + 1;
          const sum = d1 + d2 + d3;
          const result = sum >= 11 ? 'Tài' : 'Xỉu';
          const isWin = choice === result;

          let tuViChange = 0;
          if (isWin) {
            tuSi.linhThach += bet;
            tuViChange = this.applyDamDaoTuVi(tuSi, bet);
          } else {
            tuSi.linhThach -= bet;
            tuViChange = this.applyDamDaoTuVi(tuSi, -bet);
          }
          await tuSi.save();

          const resultEmbed = new EmbedBuilder()
            .setTitle(isWin ? '🎉 Thiên Vận Phù Hộ (Thắng!)' : '💀 Thiên Đạo Vô Tình (Thua!)')
            .setColor(isWin ? 0x2ecc71 : 0xe74c3c)
            .setDescription(
              `Đạo hữu đặt cửa: **${choice}**\n\n` +
              `🎲 Kết quả gieo xúc xắc:\n` +
              `• Xúc xắc: \`[ ${d1} ] · [ ${d2} ] · [ ${d3} ]\`\n` +
              `• Tổng điểm: \`${sum}\` ➔ **${result}**\n\n` +
              (isWin
                ? `🚀 Đại cát đại lợi! Đạo hữu thắng cuộc nhận thêm \`+${bet.toLocaleString()}\` 🪙 Linh thạch.`
                : `💔 Cơ duyên cạn kiệt! Đạo hữu thất bại tổn hao \`-${bet.toLocaleString()}\` 🪙 Linh thạch.`) +
              `\n\n⚡ **Tu vi biến động**: \`${tuViChange >= 0 ? '+' : ''}${tuViChange.toFixed(1)}\` Linh Lực (Thắng: +1/1k vàng kiếm được, Thua: -0.9/1k vàng mất đi).\n` +
              `🪙 **Số dư hiện tại**: \`${tuSi.linhThach.toLocaleString()}\` Linh Thạch.`
            )
            .setTimestamp();

          await i.editReply({ embeds: [resultEmbed], components: [] });
          collector.stop('finished');
        }

        // ══════════════════════════════════════════════════════════════
        // 3. CHƠI KIẾM - GIÁP - PHÁP
        // ══════════════════════════════════════════════════════════════
        else if (step === 'KIEM_GIAP_PHAP') {
          if (i.customId === 'kgp_cancel') {
            step = 'CHOOSE_GAME';
            await i.editReply({ embeds: [buildChooseEmbed()], components: [buildChooseButtons(), buildChooseRow2()] });
            return;
          }

          const choices = {
            'kgp_kiem': { name: '🗡️ Kiếm', beats: '📜 Pháp Bùa' },
            'kgp_giap': { name: '🛡️ Giáp', beats: '🗡️ Kiếm' },
            'kgp_phap': { name: '📜 Pháp Bùa', beats: '🛡️ Giáp' }
          };

          const playerChoice = choices[i.customId];
          const botOptions = Object.keys(choices);
          const botChoiceId = botOptions[Math.floor(Math.random() * botOptions.length)];
          const botChoice = choices[botChoiceId];

          let outcome = 'TIE';
          if (playerChoice.name === botChoice.name) {
            outcome = 'TIE';
          } else if (playerChoice.beats === botChoice.name) {
            outcome = 'WIN';
          } else {
            outcome = 'LOSE';
          }

          let tuViChange = 0;
          if (outcome === 'WIN') {
            tuSi.linhThach += bet;
            tuViChange = this.applyDamDaoTuVi(tuSi, bet);
            await tuSi.save();
          } else if (outcome === 'LOSE') {
            tuSi.linhThach -= bet;
            tuViChange = this.applyDamDaoTuVi(tuSi, -bet);
            await tuSi.save();
          }

          let outcomeTitle = '';
          let outcomeColor = 0;
          let outcomeDesc = '';

          if (outcome === 'WIN') {
            outcomeTitle = '⚔️ Thắng Trận Đàm Đạo';
            outcomeColor = 0x2ecc71;
            outcomeDesc = `🚀 Đạo hữu dùng **${playerChoice.name}** khắc chế hoàn hảo **${botChoice.name}** của phân thân, thắng nhận \`+${bet.toLocaleString()}\` 🪙 Linh thạch.`;
          } else if (outcome === 'LOSE') {
            outcomeTitle = '💀 Bại Trận Đàm Đạo';
            outcomeColor = 0xe74c3c;
            outcomeDesc = `💔 Phân thân xuất chiêu **${botChoice.name}** khắc chế **${playerChoice.name}** của đạo hữu, cống nạp \`-${bet.toLocaleString()}\` 🪙 Linh thạch.`;
          } else {
            outcomeTitle = '⚖️ Lưỡng Bại Câu Thương';
            outcomeColor = 0xf1c40f;
            outcomeDesc = `Cả hai cùng ra **${playerChoice.name}**, khí kình đối xung bất phân thắng bại! Cược \`${bet.toLocaleString()}\` 🪙 được hoàn trả vẹn nguyên.`;
          }

          const expText = outcome !== 'TIE' ? `\n\n⚡ **Tu vi biến động**: \`${tuViChange >= 0 ? '+' : ''}${tuViChange.toFixed(1)}\` Linh Lực (Thắng: +1/1k vàng kiếm được, Thua: -0.9/1k vàng mất đi).` : '';

          const resultEmbed = new EmbedBuilder()
            .setTitle(outcomeTitle)
            .setColor(outcomeColor)
            .setDescription(
              `• **Đạo hữu ra chiêu**: **${playerChoice.name}**\n` +
              `• **Thiên Đạo ra chiêu**: **${botChoice.name}**\n\n` +
              outcomeDesc +
              expText +
              `\n\n🪙 **Số dư hiện tại**: \`${tuSi.linhThach.toLocaleString()}\` Linh Thạch.`
            )
            .setTimestamp();

          await i.editReply({ embeds: [resultEmbed], components: [] });
          collector.stop('finished');
        }

        // ══════════════════════════════════════════════════════════════
        // 4. CHƠI NHỊ THẬP NHẤT LỰC (BLACKJACK)
        // ══════════════════════════════════════════════════════════════
        else if (step === 'BLACKJACK') {
          if (i.customId === 'bj_cancel') {
            step = 'CHOOSE_GAME';
            await i.editReply({ embeds: [buildChooseEmbed()], components: [buildChooseButtons(), buildChooseRow2()] });
            return;
          }

          if (i.customId === 'bj_hit') {
            const drawCard = () => {
              const r = Math.floor(Math.random() * 10) + 1;
              return r === 1 ? 11 : r;
            };

            playerHand.push(drawCard());
            const pSum = getSum(playerHand);

            if (pSum > 21) {
              // Bị bùng bài (bust) - Thua ngay
              tuSi.linhThach -= bet;
              const tuViChange = this.applyDamDaoTuVi(tuSi, -bet);
              await tuSi.save();

              const resultEmbed = new EmbedBuilder()
                .setTitle('💀 Linh Khí Bạo Tạc (Thua!)')
                .setColor(0xe74c3c)
                .setDescription(
                  `Bài của đạo hữu đã vượt quá 21 điểm!\n\n` +
                  `• **BÀI CỦA BẠN**: \`[ ${playerHand.join(' ] · [ ')} ]\` (Tổng điểm: **${pSum}**)\n` +
                  `• **BÀI THIÊN ĐẠO**: \`[ ${botHand.join(' ] · [ ')} ]\` (Tổng: **${getSum(botHand)}**)\n\n` +
                  `💔 Cường lượng bạo liệt! Đạo hữu nung bài quá tay tổn hao \`-${bet.toLocaleString()}\` 🪙 Linh thạch.\n` +
                  `⚡ **Tu vi biến động**: \`${tuViChange.toFixed(1)}\` Linh Lực (Thắng: +1/1k vàng kiếm được, Thua: -0.9/1k vàng mất đi).\n` +
                  `🪙 **Số dư hiện tại**: \`${tuSi.linhThach.toLocaleString()}\` Linh Thạch.`
                )
                .setTimestamp();

              await i.editReply({ embeds: [resultEmbed], components: [] });
              collector.stop('finished');
            } else {
              // Vẫn có thể rút tiếp
              const embed = new EmbedBuilder()
                .setTitle('🃏 Nhị Thập Nhất Lực (Blackjack 21)')
                .setColor(0x3498db)
                .setDescription(
                  `• **BÀI CỦA BẠN**: \`[ ${playerHand.join(' ] · [ ')} ]\` (Tổng điểm: **${pSum}**)\n` +
                  `• **BÀI THIÊN ĐẠO**: \`[ ${botHand[0]} ] · [ ❓ ]\`\n\n` +
                  `Chọn rút thêm linh bài hoặc dừng bài để phân thắng bại:`
                );

              const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('bj_hit').setLabel('➕ Rút Thêm').setStyle(ButtonStyle.Success).setDisabled(pSum >= 21),
                new ButtonBuilder().setCustomId('bj_stand').setLabel('✋ Dừng Bài').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('bj_cancel').setLabel('↩️ Trở Lại').setStyle(ButtonStyle.Secondary)
              );

              await i.editReply({ embeds: [embed], components: [row] });
            }
          }

          else if (i.customId === 'bj_stand') {
            // Lượt Thiên Đạo rút bài
            const drawCard = () => {
              const r = Math.floor(Math.random() * 10) + 1;
              return r === 1 ? 11 : r;
            };

            let bSum = getSum(botHand);
            while (bSum < 16) {
              botHand.push(drawCard());
              bSum = getSum(botHand);
            }

            const pSum = getSum(playerHand);
            let isWin = false;
            let isTie = false;

            if (bSum > 21) {
              isWin = true; // Bot bùng bài
            } else if (pSum > bSum) {
              isWin = true;
            } else if (pSum === bSum) {
              isTie = true;
            }

            let tuViChange = 0;
            if (isTie) {
              // Hòa
            } else if (isWin) {
              tuSi.linhThach += bet;
              tuViChange = this.applyDamDaoTuVi(tuSi, bet);
              await tuSi.save();
            } else {
              tuSi.linhThach -= bet;
              tuViChange = this.applyDamDaoTuVi(tuSi, -bet);
              await tuSi.save();
            }

            let title = '';
            let colorCode = 0;
            let desc = '';

            if (isTie) {
              title = '⚖️ Kỳ Phùng Địch Thủ (Hòa)';
              colorCode = 0xf1c40f;
              desc = `Cả hai bên cùng đạt điểm số ngang nhau. Linh thạch cược được hoàn trả đầy đủ.`;
            } else if (isWin) {
              title = '🎉 Thần Thông Áp Đảo (Thắng!)';
              colorCode = 0x2ecc71;
              desc = `🚀 Đạo hữu thắng cuộc nhận thêm \`+${bet.toLocaleString()}\` 🪙 Linh thạch.`;
            } else {
              title = '💀 Khí Vận Bại Thối (Thua!)';
              colorCode = 0xe74c3c;
              desc = `💔 Đạo hữu bại trận tổn hao \`-${bet.toLocaleString()}\` 🪙 Linh thạch.`;
            }

            const expText = !isTie ? `\n\n⚡ **Tu vi biến động**: \`${tuViChange >= 0 ? '+' : ''}${tuViChange.toFixed(1)}\` Linh Lực (Thắng: +1/1k vàng kiếm được, Thua: -0.9/1k vàng mất đi).` : '';

            const resultEmbed = new EmbedBuilder()
              .setTitle(title)
              .setColor(colorCode)
              .setDescription(
                `• **BÀI CỦA BẠN**: \`[ ${playerHand.join(' ] · [ ')} ]\` (Tổng điểm: **${pSum}**)\n` +
                `• **BÀI THIÊN ĐẠO**: \`[ ${botHand.join(' ] · [ ')} ]\` (Tổng điểm: **${bSum}**)\n\n` +
                desc +
                expText +
                `\n\n🪙 **Số dư hiện tại**: \`${tuSi.linhThach.toLocaleString()}\` Linh Thạch.`
              )
              .setTimestamp();

            await i.editReply({ embeds: [resultEmbed], components: [] });
            collector.stop('finished');
          }
        }

        // ══════════════════════════════════════════════════════════════
        // 5. CHƠI THIÊN MỆNH NGŨ HÀNH (ROULETTE / COLOR)
        // ══════════════════════════════════════════════════════════════
        else if (step === 'NGU_HANH') {
          const elementsMap = {
            'nh_kim':  { name: '⚪ Kim',  color: 0xdcdde1 },
            'nh_moc':  { name: '🟢 Mộc',  color: 0x2ecc71 },
            'nh_thuy': { name: '🔵 Thủy', color: 0x3498db },
            'nh_hoa':  { name: '🔴 Hỏa',  color: 0xe74c3c },
            'nh_tho':  { name: '🟡 Thổ',  color: 0xf1c40f }
          };

          // ── Guard: bỏ qua nếu customId không phải nút Ngũ Hành ────────────
          const playerChoice = elementsMap[i.customId];
          if (!playerChoice) return; // Tránh crash khi click button lạ

          const choicesList = Object.values(elementsMap);
          const rollChoice  = choicesList[Math.floor(Math.random() * choicesList.length)];
          const isWin       = playerChoice.name === rollChoice.name;

          let tuViChange = 0;
          const MAX_STONES = 2_000_000_000; // Giới hạn an toàn dưới MySQL INT max
          if (isWin) {
            const reward = bet * 3;
            tuSi.linhThach = Math.min(MAX_STONES, tuSi.linhThach + reward);
            tuViChange = this.applyDamDaoTuVi(tuSi, reward);
            await tuSi.save();
          } else {
            tuSi.linhThach = Math.max(0, tuSi.linhThach - bet);
            tuViChange = this.applyDamDaoTuVi(tuSi, -bet);
            await tuSi.save();
          }

          const resultEmbed = new EmbedBuilder()
            .setTitle(isWin ? '🌟 Thiên Mệnh Linh Ứng (Đại Thắng!)' : '⛈️ Ngũ Hành Khắc Chế (Thua)')
            .setColor(isWin ? 0x2ecc71 : 0xe74c3c)
            .setDescription(
              `• **Đạo hữu đặt hành**: **${playerChoice.name}**\n` +
              `• **Trời đất hội tụ hành**: **${rollChoice.name}**\n\n` +
              (isWin
                ? `🚀 Ngũ hành tương sinh! Dự đoán thần sầu giúp đạo hữu đại thắng nhận \`+${(bet * 3).toLocaleString()}\` 🪙 Linh thạch (Nhân 4 tổng cược).`
                : `💔 Khí thế tương khắc! Ngũ hành nghịch chuyển khiến đạo hữu tổn hao \`-${bet.toLocaleString()}\` 🪙 Linh thạch.`) +
              `\n\n⚡ **Tu vi biến động**: \`${tuViChange >= 0 ? '+' : ''}${tuViChange.toFixed(1)}\` Linh Lực (Thắng: +1/1k vàng kiếm được, Thua: -0.9/1k vàng mất đi).\n` +
              `🪙 **Số dư hiện tại**: \`${tuSi.linhThach.toLocaleString()}\` Linh Thạch.`
            )
            .setTimestamp();

          await i.editReply({ embeds: [resultEmbed], components: [] });
          collector.stop('finished');
        }
      });

      collector.on('end', async (_, reason) => {
        try {
          if (reason === 'cancelled') {
            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle('🌌 Thiên Cơ Đàm Đạo — Đóng')
                  .setDescription('Ngươi đã chọn rút lui an toàn khỏi sảnh đàm đạo.')
                  .setColor(0x7f8c8d)
                  .setTimestamp()
              ],
              components: []
            });
          } else if (reason === 'insufficient_funds') {
            await interaction.editReply({
              embeds: [BoTaoEmbed.loi('Linh thạch biến động không đủ cược! Tiến trình đàm đạo đã bị hủy.')],
              components: []
            });
          } else if (reason !== 'finished') {
            await interaction.editReply({
              components: []
            });
          }
        } catch (_) {}
      });
    }
  };
}

const controller = new BoDieuKhienDamDao();
export const danhSachLenhDamDao = [controller.lenhDamDao];
export { controller as boDieuKhienDamDao };
