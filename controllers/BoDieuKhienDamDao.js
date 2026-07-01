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



  lenhDamDao = {
    data: new SlashCommandBuilder()
      .setName('damdao')
      .setDescription('Đàm đạo nhân sinh, đỏ đen bằng VND')
      .addIntegerOption(option =>
        option.setName('vnd')
          .setDescription('Số lượng VND cược')
          .setRequired(true)
          .setMinValue(100)
      ),

    execute: async (interaction) => {
      await interaction.deferReply();

      const bet = interaction.options.getInteger('vnd');
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      if (tuSi.vnd < bet) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(`VND bất túc! Ngươi chỉ có \`${tuSi.vnd.toLocaleString()}\` VND, không đủ cược \`${bet.toLocaleString()}\` VND.`)]
        });
      }

      const color = layMauCanhGioi(tuSi.canhGioi);
      let step = 'CHOOSE_GAME'; // CHOOSE_GAME, TAI_XIU, KIEM_GIAP_PHAP, BLACKJACK, NGU_HANH

      // State Blackjack
      let playerHand = [];
      let botHand = [];

      const SUITS = ['♠️', '♦️', '♥️', '♣️'];
      const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const drawCard = () => {
        const value = VALUES[Math.floor(Math.random() * VALUES.length)];
        const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
        return `${value}${suit}`;
      };

      // ── Helper: Tạo giao diện lựa chọn game ─────────────────────────────────
      const buildChooseEmbed = () => {
        return new EmbedBuilder()
          .setTitle('🌌 Thiên Cơ Đàm Đạo')
          .setColor(color)
          .setDescription(
            `Đạo hữu **${tuSi.ten}** tiến vào sảnh đàm đạo nhân duyên.\n` +
            `💵 **VND cược**: \`${bet.toLocaleString()}\` VND\n` +
            `💵 **VND hiện có**: \`${tuSi.vnd.toLocaleString()}\` VND\n\n` +
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
            .setCustomId('game_baucua')
            .setLabel('🦀 Bầu Cua Tôm Cá')
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

        // Kiểm tra số dư VND liên tục
        await tuSi.reload();
        if (tuSi.vnd < bet) {
          collector.stop('insufficient_funds');
          return;
        }

        const getCardValue = (card) => {
          const match = String(card).match(/^([AJQK2-9]|10)/);
          if (!match) return 0;
          const val = match[1];
          if (val === 'A') return 11;
          if (['J', 'Q', 'K'].includes(val)) return 10;
          return parseInt(val, 10);
        };

        const getSum = (hand) => {
          let sum = hand.reduce((a, card) => a + getCardValue(card), 0);
          let aces = hand.filter(x => String(x).startsWith('A')).length;
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

          else if (i.customId === 'game_baucua') {
            step = 'BAU_CUA';
            const embed = new EmbedBuilder()
              .setTitle('🦀 Bầu Cua Tôm Cá')
              .setColor(0x1abc9c)
              .setDescription(
                `Đạo hữu hãy dự đoán linh thú nào sẽ xuất hiện trong 3 mặt Linh Xúc Xắc.\n` +
                `• **Tỷ lệ nhận thưởng**:\n` +
                `   - Xuất hiện 1 xúc xắc: **1 ăn 1**.\n` +
                `   - Xuất hiện 2 xúc xắc: **1 ăn 2**.\n` +
                `   - Xuất hiện 3 xúc xắc: **1 ăn 3**.\n\n` +
                `Chọn linh thú để đặt cược:`
              );

            const row1 = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('bc_bau').setLabel('🪵 Bầu').setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId('bc_cua').setLabel('🦀 Cua').setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId('bc_tom').setLabel('🦐 Tôm').setStyle(ButtonStyle.Secondary)
            );

            const row2 = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('bc_ca').setLabel('🐟 Cá').setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId('bc_ga').setLabel('🐓 Gà').setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId('bc_nai').setLabel('🦌 Nai').setStyle(ButtonStyle.Secondary)
            );

            const row3 = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('bc_cancel').setLabel('↩️ Trở Lại').setStyle(ButtonStyle.Danger)
            );

            await i.editReply({ embeds: [embed], components: [row1, row2, row3] });
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

          if (isWin) {
            tuSi.vnd += bet;
          } else {
            tuSi.vnd -= bet;
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
                ? `🚀 Đại cát đại lợi! Đạo hữu thắng cuộc nhận thêm \`+${bet.toLocaleString()}\` VND.`
                : `💔 Cơ duyên cạn kiệt! Đạo hữu thất bại tổn hao \`-${bet.toLocaleString()}\` VND.`) +
              `\n\n🪙 **Số dư hiện tại**: \`${tuSi.vnd.toLocaleString()}\` VND.`
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

          if (outcome === 'WIN') {
            tuSi.vnd += bet;
            await tuSi.save();
          } else if (outcome === 'LOSE') {
            tuSi.vnd -= bet;
            await tuSi.save();
          }

          let outcomeTitle = '';
          let outcomeColor = 0;
          let outcomeDesc = '';

          if (outcome === 'WIN') {
            outcomeTitle = '...';
            outcomeTitle = '⚔️ Thắng Trận Đàm Đạo';
            outcomeColor = 0x2ecc71;
            outcomeDesc = `🚀 Đạo hữu dùng **${playerChoice.name}** khắc chế hoàn hảo **${botChoice.name}** của phân thân, thắng nhận \`+${bet.toLocaleString()}\` VND.`;
          } else if (outcome === 'LOSE') {
            outcomeTitle = '💀 Bại Trận Đàm Đạo';
            outcomeColor = 0xe74c3c;
            outcomeDesc = `💔 Phân thân xuất chiêu **${botChoice.name}** khắc chế **${playerChoice.name}** của đạo hữu, cống nạp \`-${bet.toLocaleString()}\` VND.`;
          } else {
            outcomeTitle = '⚖️ Lưỡng Bại Câu Thương';
            outcomeColor = 0xf1c40f;
            outcomeDesc = `Cả hai cùng ra **${playerChoice.name}**, khí kình đối xung bất phân thắng bại! Cược \`${bet.toLocaleString()}\` VND được hoàn trả vẹn nguyên.`;
          }

          const resultEmbed = new EmbedBuilder()
            .setTitle(outcomeTitle)
            .setColor(outcomeColor)
            .setDescription(
              `• **Đạo hữu ra chiêu**: **${playerChoice.name}**\n` +
              `• **Thiên Đạo ra chiêu**: **${botChoice.name}**\n\n` +
              outcomeDesc +
              `\n\n🪙 **Số dư hiện tại**: \`${tuSi.vnd.toLocaleString()}\` VND.`
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
            playerHand.push(drawCard());
            const pSum = getSum(playerHand);

            if (pSum > 21) {
              // Bị bùng bài (bust) - Thua ngay
              tuSi.vnd -= bet;
              await tuSi.save();

              const resultEmbed = new EmbedBuilder()
                .setTitle('💀 Linh Khí Bạo Tạc (Thua!)')
                .setColor(0xe74c3c)
                .setDescription(
                  `Bài của đạo hữu đã vượt quá 21 điểm!\n\n` +
                  `• **BÀI CỦA BẠN**: \`[ ${playerHand.join(' ] · [ ')} ]\` (Tổng điểm: **${pSum}**)\n` +
                  `• **BÀI THIÊN ĐẠO**: \`[ ${botHand.join(' ] · [ ')} ]\` (Tổng: **${getSum(botHand)}**)\n\n` +
                  `💔 Cường lượng bạo liệt! Đạo hữu nung bài quá tay tổn hao \`-${bet.toLocaleString()}\` VND.\n` +
                  `🪙 **Số dư hiện tại**: \`${tuSi.vnd.toLocaleString()}\` VND.`
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

            if (isTie) {
              // Hòa
            } else if (isWin) {
              tuSi.vnd += bet;
              await tuSi.save();
            } else {
              tuSi.vnd -= bet;
              await tuSi.save();
            }

            let title = '';
            let colorCode = 0;
            let desc = '';

            if (isTie) {
              title = '⚖️ Kỳ Phùng Địch Thủ (Hòa)';
              colorCode = 0xf1c40f;
              desc = `Cả hai bên cùng đạt điểm số ngang nhau. VND cược được hoàn trả đầy đủ.`;
            } else if (isWin) {
              title = '🎉 Thần Thông Áp Đảo (Thắng!)';
              colorCode = 0x2ecc71;
              desc = `🚀 Đạo hữu thắng cuộc nhận thêm \`+${bet.toLocaleString()}\` VND.`;
            } else {
              title = '💀 Khí Vận Bại Thối (Thua!)';
              colorCode = 0xe74c3c;
              desc = `💔 Đạo hữu bại trận tổn hao \`-${bet.toLocaleString()}\` VND.`;
            }

            const resultEmbed = new EmbedBuilder()
              .setTitle(title)
              .setColor(colorCode)
              .setDescription(
                `• **BÀI CỦA BẠN**: \`[ ${playerHand.join(' ] · [ ')} ]\` (Tổng điểm: **${pSum}**)\n` +
                `• **BÀI THIÊN ĐẠO**: \`[ ${botHand.join(' ] · [ ')} ]\` (Tổng điểm: **${bSum}**)\n\n` +
                desc +
                `\n\n🪙 **Số dư hiện tại**: \`${tuSi.vnd.toLocaleString()}\` VND.`
              )
              .setTimestamp();

            await i.editReply({ embeds: [resultEmbed], components: [] });
            collector.stop('finished');
          }
        }

        // ══════════════════════════════════════════════════════════════
        // 5. CHƠI BẦU CUA TÔM CÁ
        // ══════════════════════════════════════════════════════════════
        else if (step === 'BAU_CUA') {
          if (i.customId === 'bc_cancel') {
            step = 'CHOOSE_GAME';
            await i.editReply({ embeds: [buildChooseEmbed()], components: [buildChooseButtons(), buildChooseRow2()] });
            return;
          }

          const animalsMap = {
            'bc_bau': { name: 'Bầu 🪵', emoji: '🪵' },
            'bc_cua': { name: 'Cua 🦀', emoji: '🦀' },
            'bc_tom': { name: 'Tôm 🦐', emoji: '🦐' },
            'bc_ca':  { name: 'Cá 🐟',  emoji: '🐟' },
            'bc_ga':  { name: 'Gà 🐓',  emoji: '🐓' },
            'bc_nai': { name: 'Nai 🦌',  emoji: '🦌' }
          };

          const playerChoice = animalsMap[i.customId];
          if (!playerChoice) return;

          const animalsList = Object.values(animalsMap);

          // Gieo 3 viên xúc xắc
          const roll1 = animalsList[Math.floor(Math.random() * animalsList.length)];
          const roll2 = animalsList[Math.floor(Math.random() * animalsList.length)];
          const roll3 = animalsList[Math.floor(Math.random() * animalsList.length)];

          const rolls = [roll1, roll2, roll3];
          const count = rolls.filter(r => r.name === playerChoice.name).length;
          const isWin = count > 0;

          const MAX_STONES = 2_000_000_000;
          if (isWin) {
            const reward = bet * count;
            tuSi.vnd = Math.min(MAX_STONES, tuSi.vnd + reward);
            await tuSi.save();
          } else {
            tuSi.vnd = Math.max(0, tuSi.vnd - bet);
            await tuSi.save();
          }

          const resultEmbed = new EmbedBuilder()
            .setTitle(isWin ? '🌟 Linh Thú Linh Ứng (Đại Thắng!)' : '⛈️ Linh Vận Trầm Luân (Thua)')
            .setColor(isWin ? 0x2ecc71 : 0xe74c3c)
            .setDescription(
              `• **Đạo hữu đặt cược**: **${playerChoice.name}**\n` +
              `• **Kết quả gieo xúc xắc**: [ **${roll1.emoji} ${roll1.name.split(' ')[0]}** ] · [ **${roll2.emoji} ${roll2.name.split(' ')[0]}** ] · [ **${roll3.emoji} ${roll3.name.split(' ')[0]}** ]\n\n` +
              (isWin
                ? `🚀 Tuyệt vời! **${playerChoice.name.split(' ')[0]}** xuất hiện **${count}** lần, đạo hữu thắng nhận \`+${(bet * count).toLocaleString()}\` VND (tỉ lệ 1 ăn ${count}).`
                : `💔 Không có **${playerChoice.name.split(' ')[0]}** nào xuất hiện! Đạo hữu tổn hao \`-${bet.toLocaleString()}\` VND.`) +
              `\n\n🪙 **Số dư hiện tại**: \`${tuSi.vnd.toLocaleString()}\` VND.`
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
              embeds: [BoTaoEmbed.loi('VND biến động không đủ cược! Tiến trình đàm đạo đã bị hủy.')],
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
