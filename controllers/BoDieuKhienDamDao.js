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
      let step = 'CHOOSE_GAME'; // 'CHOOSE_GAME', 'TAI_XIU', 'KIEM_GIAP_PHAP'

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
            .setCustomId('game_cancel')
            .setLabel('❌ Rút Lui')
            .setStyle(ButtonStyle.Danger)
        );
      };

      // ── Gửi tin nhắn chào mừng ──────────────────────────────────────────────
      const msg = await interaction.editReply({
        embeds:     [buildChooseEmbed()],
        components: [buildChooseButtons()]
      });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time:   60_000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();

        // Kiểm tra số dư linh thạch liên tục đề phòng race conditions
        await tuSi.reload();
        if (tuSi.linhThach < bet) {
          collector.stop('insufficient_funds');
          return;
        }

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
              new ButtonBuilder()
                .setCustomId('tx_tai')
                .setLabel('🔴 Tài (11-18)')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId('tx_xiu')
                .setLabel('🔵 Xỉu (3-10)')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId('tx_cancel')
                .setLabel('↩️ Trở Lại')
                .setStyle(ButtonStyle.Secondary)
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
              new ButtonBuilder()
                .setCustomId('kgp_kiem')
                .setLabel('🗡️ Kiếm')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId('kgp_giap')
                .setLabel('🛡️ Giáp')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId('kgp_phap')
                .setLabel('📜 Pháp Bùa')
                .setStyle(ButtonStyle.Warning),
              new ButtonBuilder()
                .setCustomId('kgp_cancel')
                .setLabel('↩️ Trở Lại')
                .setStyle(ButtonStyle.Secondary)
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
            await i.editReply({ embeds: [buildChooseEmbed()], components: [buildChooseButtons()] });
            return;
          }

          const choice = i.customId === 'tx_tai' ? 'Tài' : 'Xỉu';

          // Gieo xúc xắc
          const d1 = Math.floor(Math.random() * 6) + 1;
          const d2 = Math.floor(Math.random() * 6) + 1;
          const d3 = Math.floor(Math.random() * 6) + 1;
          const sum = d1 + d2 + d3;
          const result = sum >= 11 ? 'Tài' : 'Xỉu';
          const isWin = choice === result;

          // Cập nhật database
          const baseExp = Math.floor(bet / 1000);
          const gainedExp = isWin ? baseExp * 2 : baseExp;

          tuSi.linhLuc += gainedExp;
          if (isWin) {
            tuSi.linhThach += bet;
          } else {
            tuSi.linhThach -= bet;
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
              `\n\n⚡ **Tu vi nhận được**: \`+${gainedExp.toLocaleString()}\` Linh Lực (Cứ 1k cược nhận 1 EXP, thắng nhận x2).\n` +
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
            await i.editReply({ embeds: [buildChooseEmbed()], components: [buildChooseButtons()] });
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

          let outcome = 'TIE'; // 'WIN', 'LOSE', 'TIE'
          if (playerChoice.name === botChoice.name) {
            outcome = 'TIE';
          } else if (playerChoice.beats === botChoice.name) {
            outcome = 'WIN';
          } else {
            outcome = 'LOSE';
          }

          // Cập nhật linh thạch và tu vi
          let gainedExp = 0;
          if (outcome === 'WIN') {
            gainedExp = Math.floor(bet / 1000) * 2;
            tuSi.linhThach += bet;
            tuSi.linhLuc += gainedExp;
            await tuSi.save();
          } else if (outcome === 'LOSE') {
            gainedExp = Math.floor(bet / 1000);
            tuSi.linhThach -= bet;
            tuSi.linhLuc += gainedExp;
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

          const expText = gainedExp > 0 ? `\n\n⚡ **Tu vi nhận được**: \`+${gainedExp.toLocaleString()}\` Linh Lực (Cứ 1k cược nhận 1 EXP, thắng nhận x2).` : '';

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
            // Hết thời gian chờ cược
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
