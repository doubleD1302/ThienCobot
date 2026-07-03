import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed, layMauCanhGioi } from '../views/BoTaoEmbed.js';

const MAX_GAME_BET = 1000000;
const ROOM_IDLE_TIME = 300000;

const GAME_META = {
  TAI_XIU: {
    title: '🎲 Linh Khí Tài Xỉu',
    color: 0x9b59b6,
    label: 'Linh Khí Tài Xỉu'
  },
  KIEM_GIAP_PHAP: {
    title: '🗡️ Quyết Đấu: Kiếm - Giáp - Pháp',
    color: 0xe67e22,
    label: 'Kiếm - Giáp - Pháp'
  },
  BAU_CUA: {
    title: '🦀 Bầu Cua Tôm Cá',
    color: 0x1abc9c,
    label: 'Bầu Cua Tôm Cá'
  }
};

const TAI_XIU_CHOICES = {
  tx_tai: { id: 'tx_tai', name: '🔴 Tài', short: 'Tài', label: '🔴 Tài (11-18)' },
  tx_xiu: { id: 'tx_xiu', name: '🔵 Xỉu', short: 'Xỉu', label: '🔵 Xỉu (3-10)' }
};

const KIEM_GIAP_CHOICES = {
  kgp_kiem: { id: 'kgp_kiem', name: '🗡️ Kiếm', short: 'Kiếm', label: '🗡️ Kiếm' },
  kgp_giap: { id: 'kgp_giap', name: '🛡️ Giáp', short: 'Giáp', label: '🛡️ Giáp' },
  kgp_phap: { id: 'kgp_phap', name: '📜 Pháp Bùa', short: 'Pháp Bùa', label: '📜 Pháp Bùa' }
};

const BAU_CUA_CHOICES = {
  bc_bau: { id: 'bc_bau', name: '🪵 Bầu', short: 'Bầu', label: '🪵 Bầu' },
  bc_cua: { id: 'bc_cua', name: '🦀 Cua', short: 'Cua', label: '🦀 Cua' },
  bc_tom: { id: 'bc_tom', name: '🦐 Tôm', short: 'Tôm', label: '🦐 Tôm' },
  bc_ca: { id: 'bc_ca', name: '🐟 Cá', short: 'Cá', label: '🐟 Cá' },
  bc_ga: { id: 'bc_ga', name: '🐓 Gà', short: 'Gà', label: '🐓 Gà' },
  bc_nai: { id: 'bc_nai', name: '🦌 Nai', short: 'Nai', label: '🦌 Nai' }
};

const getChoiceMeta = (game, choiceId) => {
  if (game === 'TAI_XIU') return TAI_XIU_CHOICES[choiceId] || null;
  if (game === 'KIEM_GIAP_PHAP') return KIEM_GIAP_CHOICES[choiceId] || null;
  if (game === 'BAU_CUA') return BAU_CUA_CHOICES[choiceId] || null;
  return null;
};

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
          .setDescription('Số lượng VND cược (Tối đa 1.000.000)')
          .setRequired(true)
          .setMinValue(100)
          .setMaxValue(MAX_GAME_BET)
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

      if (bet > MAX_GAME_BET) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(`Mức cược tối đa là ${MAX_GAME_BET.toLocaleString()} VND / Linh Thạch!`)]
        });
      }

      if (tuSi.vnd < bet) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(`VND bất túc! Ngươi chỉ có \`${tuSi.vnd.toLocaleString()}\` VND, không đủ cược \`${bet.toLocaleString()}\` VND.`)]
        });
      }

      const color = layMauCanhGioi(tuSi.canhGioi);
      let step = 'CHOOSE_GAME';

      let playerHand = [];
      let botHand = [];

      const SUITS = ['♠️', '♦️', '♥️', '♣️'];
      const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const drawCard = () => {
        const value = VALUES[Math.floor(Math.random() * VALUES.length)];
        const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
        return `${value}${suit}`;
      };

      let selectedGame = null;
      let selectedChoiceId = null;
      const roomState = {
        active: false,
        game: null,
        choiceId: null,
        hostId: interaction.user.id,
        hostName: interaction.user.username,
        hostBet: bet,
        players: new Map()
      };

      const getCurrentChoiceMeta = () => getChoiceMeta(selectedGame, selectedChoiceId);

      const buildChoiceRows = (game) => {
        if (game === 'TAI_XIU') {
          return [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('tx_tai').setLabel('🔴 Tài (11-18)').setStyle(selectedChoiceId === 'tx_tai' ? ButtonStyle.Success : ButtonStyle.Primary),
              new ButtonBuilder().setCustomId('tx_xiu').setLabel('🔵 Xỉu (3-10)').setStyle(selectedChoiceId === 'tx_xiu' ? ButtonStyle.Success : ButtonStyle.Secondary)
            )
          ];
        }

        if (game === 'KIEM_GIAP_PHAP') {
          return [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('kgp_kiem').setLabel('🗡️ Kiếm').setStyle(selectedChoiceId === 'kgp_kiem' ? ButtonStyle.Success : ButtonStyle.Primary),
              new ButtonBuilder().setCustomId('kgp_giap').setLabel('🛡️ Giáp').setStyle(selectedChoiceId === 'kgp_giap' ? ButtonStyle.Success : ButtonStyle.Primary),
              new ButtonBuilder().setCustomId('kgp_phap').setLabel('📜 Pháp Bùa').setStyle(selectedChoiceId === 'kgp_phap' ? ButtonStyle.Success : ButtonStyle.Secondary)
            )
          ];
        }

        if (game === 'BAU_CUA') {
          return [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('bc_bau').setLabel('🪵 Bầu').setStyle(selectedChoiceId === 'bc_bau' ? ButtonStyle.Success : ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId('bc_cua').setLabel('🦀 Cua').setStyle(selectedChoiceId === 'bc_cua' ? ButtonStyle.Success : ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId('bc_tom').setLabel('🦐 Tôm').setStyle(selectedChoiceId === 'bc_tom' ? ButtonStyle.Success : ButtonStyle.Secondary)
            ),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('bc_ca').setLabel('🐟 Cá').setStyle(selectedChoiceId === 'bc_ca' ? ButtonStyle.Success : ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId('bc_ga').setLabel('🐓 Gà').setStyle(selectedChoiceId === 'bc_ga' ? ButtonStyle.Success : ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId('bc_nai').setLabel('🦌 Nai').setStyle(selectedChoiceId === 'bc_nai' ? ButtonStyle.Success : ButtonStyle.Secondary)
            )
          ];
        }

        return [];
      };

      const buildActionRows = (game, forRoom = false) => {
        const canAct = Boolean(selectedChoiceId || forRoom);
        return [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(forRoom ? 'room_start' : 'game_play_now').setLabel(forRoom ? '🚀 Bắt Đầu' : '🎮 Chơi Ngay').setStyle(ButtonStyle.Success).setDisabled(!canAct),
            new ButtonBuilder().setCustomId(forRoom ? 'room_join' : 'game_create_room').setLabel(forRoom ? '🤝 Tham Gia' : '🛎️ Lập Sòng').setStyle(ButtonStyle.Primary).setDisabled(!canAct),
            new ButtonBuilder().setCustomId(forRoom ? 'room_cancel' : 'game_cancel').setLabel('❌ Hủy').setStyle(ButtonStyle.Danger)
          )
        ];
      };

      const buildGameEmbed = (game) => {
        const meta = GAME_META[game];
        const choiceMeta = getChoiceMeta(game, selectedChoiceId);
        const choiceText = choiceMeta ? `**${choiceMeta.name}**` : '*Chưa chọn*';
        const roomLine = roomState.active
          ? `\n🛎️ **Sòng đang mở**: ${roomState.players.size} người tham gia.`
          : '';

        return new EmbedBuilder()
          .setTitle(meta.title)
          .setColor(meta.color)
          .setDescription(
            `Đạo hữu **${tuSi.ten}** đang xem sảnh **${meta.label}**.\n` +
            `💵 **VND cược**: \`${bet.toLocaleString()}\` VND\n` +
            `💵 **VND hiện có**: \`${tuSi.vnd.toLocaleString()}\` VND\n\n` +
            `• **Cửa đã chọn**: ${choiceText}${roomLine}\n\n` +
            `Hãy chọn cửa rồi bấm **Chơi Ngay** hoặc **Lập Sòng**.`
          )
          .setTimestamp();
      };

      const buildRoomEmbed = () => {
        const meta = GAME_META[roomState.game];
        const choiceMeta = getChoiceMeta(roomState.game, roomState.choiceId);
        const playerLines = Array.from(roomState.players.values()).map((player, index) => `**${index + 1}.** <@${player.userId}> · \`${player.bet.toLocaleString()}\` VND`).join('\n') || '_Chưa có ai tham gia._';

        return new EmbedBuilder()
          .setTitle(`🏮 Sòng ${meta.label} Đã Lập`)
          .setColor(meta.color)
          .setDescription(
            `• **Chủ sòng**: <@${roomState.hostId}>\n` +
            `• **Cửa của sòng**: **${choiceMeta?.name || 'Chưa xác định'}**\n` +
            `• **Cược gốc của chủ sòng**: \`${roomState.hostBet.toLocaleString()}\` VND\n` +
            `• **Tổng người chơi**: **${roomState.players.size}**\n\n` +
            `**Danh sách người chơi:**\n${playerLines}\n\n` +
            `Bấm **🤝 Tham Gia** để vào sòng và nhập số tiền cược của ngươi.`
          )
          .setTimestamp();
      };

      const buildRoomComponents = () => [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('room_join').setLabel('🤝 Tham Gia').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('room_start').setLabel('🚀 Bắt Đầu').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('room_cancel').setLabel('❌ Hủy Sòng').setStyle(ButtonStyle.Danger)
        )
      ];

      const getGameOutcome = (game) => {
        if (game === 'TAI_XIU') {
          const d1 = Math.floor(Math.random() * 6) + 1;
          const d2 = Math.floor(Math.random() * 6) + 1;
          const d3 = Math.floor(Math.random() * 6) + 1;
          const sum = d1 + d2 + d3;
          const result = sum >= 11 ? 'tx_tai' : 'tx_xiu';
          return { d1, d2, d3, sum, result };
        }

        if (game === 'KIEM_GIAP_PHAP') {
          const choices = Object.keys(KIEM_GIAP_CHOICES);
          const botChoiceId = choices[Math.floor(Math.random() * choices.length)];
          return { botChoiceId };
        }

        if (game === 'BAU_CUA') {
          const allChoices = Object.values(BAU_CUA_CHOICES);
          const roll1 = allChoices[Math.floor(Math.random() * allChoices.length)];
          const roll2 = allChoices[Math.floor(Math.random() * allChoices.length)];
          const roll3 = allChoices[Math.floor(Math.random() * allChoices.length)];
          return { roll1, roll2, roll3 };
        }

        return {};
      };

      const resolvePlayerOutcome = (game, choiceId, wager, outcome) => {
        if (game === 'TAI_XIU') {
          const isWin = choiceId === outcome.result;
          return {
            delta: isWin ? wager : -wager,
            title: isWin ? '🎉 Thiên Vận Phù Hộ (Thắng!)' : '💀 Thiên Đạo Vô Tình (Thua!)',
            color: isWin ? 0x2ecc71 : 0xe74c3c,
            detail: isWin
              ? `🚀 Đại cát đại lợi! Nhận thêm \`+${wager.toLocaleString()}\` VND.`
              : `💔 Cơ duyên cạn kiệt! Tổn hao \`-${wager.toLocaleString()}\` VND.`,
            isWin
          };
        }

        if (game === 'KIEM_GIAP_PHAP') {
          const choices = {
            kgp_kiem: { name: '🗡️ Kiếm', beats: 'kgp_phap' },
            kgp_giap: { name: '🛡️ Giáp', beats: 'kgp_kiem' },
            kgp_phap: { name: '📜 Pháp Bùa', beats: 'kgp_giap' }
          };
          const playerChoice = choices[choiceId];
          const botChoice = choices[outcome.botChoiceId];
          let delta = 0;
          let title = '⚖️ Lưỡng Bại Câu Thương';
          let color = 0xf1c40f;
          let detail = `Cả hai cùng ra **${playerChoice.name}**, cược được hoàn trả.`;
          let result = 'TIE';

          if (choiceId === outcome.botChoiceId) {
            result = 'TIE';
          } else if (playerChoice.beats === outcome.botChoiceId) {
            result = 'WIN';
            delta = wager;
            title = '⚔️ Thắng Trận Đàm Đạo';
            color = 0x2ecc71;
            detail = `🚀 Đạo hữu dùng **${playerChoice.name}** khắc chế **${botChoice.name}**, thắng nhận \`+${wager.toLocaleString()}\` VND.`;
          } else {
            result = 'LOSE';
            delta = -wager;
            title = '💀 Bại Trận Đàm Đạo';
            color = 0xe74c3c;
            detail = `💔 **${botChoice.name}** khắc chế **${playerChoice.name}**, cống nạp \`-${wager.toLocaleString()}\` VND.`;
          }

          return { delta, title, color, detail, result, playerChoice: playerChoice.name, botChoice: botChoice.name };
        }

        if (game === 'BAU_CUA') {
          const rolls = [outcome.roll1, outcome.roll2, outcome.roll3];
          const count = rolls.filter(r => r.id === choiceId).length;
          const isWin = count > 0;
          return {
            delta: isWin ? wager * count : -wager,
            title: isWin ? '🌟 Linh Thú Linh Ứng (Đại Thắng!)' : '⛈️ Linh Vận Trầm Luân (Thua)',
            color: isWin ? 0x2ecc71 : 0xe74c3c,
            detail: isWin
              ? `🚀 **${getChoiceMeta(game, choiceId)?.short || choiceId}** xuất hiện **${count}** lần, thắng nhận \`+${(wager * count).toLocaleString()}\` VND.`
              : `💔 Không có **${getChoiceMeta(game, choiceId)?.short || choiceId}** nào xuất hiện! Tổn hao \`-${wager.toLocaleString()}\` VND.`,
            count,
            rolls,
            isWin
          };
        }

        return { delta: 0, title: 'Không xác định', color: 0x7f8c8d, detail: 'Không có kết quả.' };
      }; // <-- Đã fix lỗi thiếu đóng ngoặc tại đây

      const buildRoomResultEmbed = (game, outcome, results) => {
        const meta = GAME_META[game];
        const detailLines = results.map(r => `• <@${r.userId}>: ${r.delta >= 0 ? '+' : ''}${r.delta.toLocaleString()} VND (còn \`${r.newBalance.toLocaleString()}\`)`).join('\n');
        let outcomeText = '';

        if (game === 'TAI_XIU') {
          outcomeText = `🎲 Xúc xắc: \`[ ${outcome.d1} ] · [ ${outcome.d2} ] · [ ${outcome.d3} ]\`\n• Tổng điểm: **${outcome.sum}** → **${outcome.result === 'tx_tai' ? 'Tài' : 'Xỉu'}**`;
        } else if (game === 'KIEM_GIAP_PHAP') {
          outcomeText = `⚔️ Thiên Đạo ra chiêu: **${getChoiceMeta(game, outcome.botChoiceId)?.name || outcome.botChoiceId}**`;
        } else if (game === 'BAU_CUA') {
          // Đã fix lỗi undefined rolls map & gộp lấy name
          const rollText = [outcome.roll1, outcome.roll2, outcome.roll3].map(r => r.name).join(' · ');
          outcomeText = `🎲 Kết quả gieo: [ ${rollText} ]`;
        }

        return new EmbedBuilder()
          .setTitle(`🏮 ${meta.label} Kết Quả Sòng`)
          .setColor(results.some(r => r.delta > 0) ? 0x2ecc71 : 0xe74c3c)
          .setDescription(
            `${outcomeText}\n\n` +
            `**Diễn biến:**\n${results.length > 0 ? detailLines : '_Không có người chơi hợp lệ._'}`
          )
          .setTimestamp();
      };

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

      const msg = await interaction.editReply({
        embeds: [buildChooseEmbed()],
        components: [buildChooseButtons(), buildChooseRow2()]
      });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.message.id === msg.id,
        idle: ROOM_IDLE_TIME
      });

      collector.on('collect', async i => {
        if (roomState.active && i.customId === 'room_join') {
          const modal = new ModalBuilder()
            .setCustomId('modal_room_bet')
            .setTitle('Nhập Số Tiền Cược');

          const betInput = new TextInputBuilder()
            .setCustomId('input_room_bet')
            .setLabel('Số tiền cược muốn tham gia')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ví dụ: 5000')
            .setRequired(true);

          modal.addComponents(new ActionRowBuilder().addComponents(betInput));
          await i.showModal(modal);

          try {
            const submission = await i.awaitModalSubmit({
              filter: sub => sub.customId === 'modal_room_bet' && sub.user.id === i.user.id,
              time: 60000
            });

            await submission.deferReply({ ephemeral: true });

            const rawBet = submission.fields.getTextInputValue('input_room_bet').trim();
            const roomBet = Number.parseInt(rawBet, 10);

            if (!Number.isFinite(roomBet) || roomBet < 100) {
              await submission.editReply({ embeds: [BoTaoEmbed.loi('Mức cược tối thiểu là 100 VND!')] });
              return;
            }

            if (roomBet > MAX_GAME_BET) {
              await submission.editReply({ embeds: [BoTaoEmbed.loi(`Mức cược tối đa là ${MAX_GAME_BET.toLocaleString()} VND!`)] });
              return;
            }

            const playerTuSi = await this.layTuSi(submission.user.id);
            if (!playerTuSi) {
              await submission.editReply({ embeds: [BoTaoEmbed.loi('Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.')] });
              return;
            }

            if (playerTuSi.vnd < roomBet) {
              await submission.editReply({ embeds: [BoTaoEmbed.loi(`VND bất túc! Ngươi chỉ có \`${playerTuSi.vnd.toLocaleString()}\` VND, không đủ cược \`${roomBet.toLocaleString()}\` VND.`)] });
              return;
            }

            roomState.players.set(submission.user.id, {
              userId: submission.user.id,
              userName: submission.user.username,
              bet: roomBet
            });

            await interaction.editReply({ embeds: [buildRoomEmbed()], components: buildRoomComponents() });
            await submission.editReply({ embeds: [BoTaoEmbed.thanhCong('🤝 Đã Tham Gia Sòng', `Ngươi đã tham gia sòng với mức cược \`${roomBet.toLocaleString()}\` VND.`)] });
          } catch (_) { }

          return;
        }

        await i.deferUpdate();

        if (!roomState.active && i.user.id !== interaction.user.id) {
          await i.followUp({
            ephemeral: true,
            content: 'Chỉ chủ sòng mới có thể chọn cửa hoặc lập sòng ở màn hình này.'
          });
          return;
        }

        if (roomState.active) {
          if (i.customId === 'room_start') {
            if (i.user.id !== roomState.hostId) {
              await i.editReply({ embeds: [BoTaoEmbed.loi('Chỉ chủ sòng mới có thể bấm bắt đầu!')], components: buildRoomComponents() });
              return;
            }

            const outcome = getGameOutcome(roomState.game);
            const results = [];

            for (const player of roomState.players.values()) {
              const playerTuSi = await this.layTuSi(player.userId);
              if (!playerTuSi) continue;

              const playerOutcome = resolvePlayerOutcome(roomState.game, roomState.choiceId, player.bet, outcome);
              playerTuSi.vnd = Math.max(0, playerTuSi.vnd + playerOutcome.delta);
              await playerTuSi.save();

              results.push({
                userId: player.userId,
                delta: playerOutcome.delta,
                newBalance: playerTuSi.vnd
              });
            }

            const resultEmbed = buildRoomResultEmbed(roomState.game, outcome, results);
            roomState.active = false;
            roomState.game = null;
            roomState.choiceId = null;
            roomState.players.clear();
            selectedGame = null;
            selectedChoiceId = null;

            await i.editReply({ embeds: [resultEmbed], components: [] });
            collector.stop('finished');
            return;
          }

          if (i.customId === 'room_cancel') {
            if (i.user.id !== roomState.hostId) {
              await i.editReply({ embeds: [BoTaoEmbed.loi('Chỉ chủ sòng mới có thể hủy sòng!')], components: buildRoomComponents() });
              return;
            }

            roomState.active = false;
            roomState.game = null;
            roomState.choiceId = null;
            roomState.players.clear();
            selectedGame = null;
            selectedChoiceId = null;
            collector.stop('cancelled');
            return;
          }
        }

        await tuSi.reload();
        if (!roomState.active && tuSi.vnd < bet) {
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

        if (step === 'CHOOSE_GAME') {
          if (i.customId === 'game_taixiu') {
            step = 'TAI_XIU';
            selectedGame = 'TAI_XIU';
            selectedChoiceId = null;

            await i.editReply({
              embeds: [buildGameEmbed('TAI_XIU')],
              components: [...buildChoiceRows('TAI_XIU'), ...buildActionRows('TAI_XIU')]
            });
          }
          else if (i.customId === 'game_kiemgiap') {
            step = 'KIEM_GIAP_PHAP';
            selectedGame = 'KIEM_GIAP_PHAP';
            selectedChoiceId = null;

            await i.editReply({
              embeds: [buildGameEmbed('KIEM_GIAP_PHAP')],
              components: [...buildChoiceRows('KIEM_GIAP_PHAP'), ...buildActionRows('KIEM_GIAP_PHAP')]
            });
          }
          else if (i.customId === 'game_blackjack') {
            step = 'BLACKJACK';

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
              new ButtonBuilder().setCustomId('bj_stand').setLabel('✋ Dừng Bài').setStyle(ButtonStyle.Primary)
            );

            await i.editReply({ embeds: [embed], components: [row] });
          }
          else if (i.customId === 'game_baucua') {
            step = 'BAU_CUA';
            selectedGame = 'BAU_CUA';
            selectedChoiceId = null;

            await i.editReply({
              embeds: [buildGameEmbed('BAU_CUA')],
              components: [...buildChoiceRows('BAU_CUA'), ...buildActionRows('BAU_CUA')]
            });
          }
          else if (i.customId === 'game_cancel') {
            collector.stop('cancelled');
          }
        }

        else if (step === 'TAI_XIU') {
          if (i.customId === 'tx_tai' || i.customId === 'tx_xiu') {
            selectedChoiceId = i.customId;
            await i.editReply({
              embeds: [buildGameEmbed('TAI_XIU')],
              components: [...buildChoiceRows('TAI_XIU'), ...buildActionRows('TAI_XIU')]
            });
            return;
          }

          if (i.customId === 'game_create_room') {
            if (!selectedChoiceId) {
              await i.editReply({ embeds: [BoTaoEmbed.loi('Hãy chọn cửa trước khi lập sòng!')], components: [...buildChoiceRows('TAI_XIU'), ...buildActionRows('TAI_XIU')] });
              return;
            }

            roomState.active = true;
            roomState.game = 'TAI_XIU';
            roomState.choiceId = selectedChoiceId;
            roomState.players.clear();
            roomState.players.set(interaction.user.id, { userId: interaction.user.id, userName: interaction.user.username, bet });
            await i.editReply({ embeds: [buildRoomEmbed()], components: buildRoomComponents() });
            return;
          }

          if (i.customId === 'game_play_now') {
            if (!selectedChoiceId) {
              await i.editReply({ embeds: [BoTaoEmbed.loi('Hãy chọn cửa trước khi chơi!')], components: [...buildChoiceRows('TAI_XIU'), ...buildActionRows('TAI_XIU')] });
              return;
            }

            const outcome = getGameOutcome('TAI_XIU');
            const choiceMeta = getChoiceMeta('TAI_XIU', selectedChoiceId);
            const playerOutcome = resolvePlayerOutcome('TAI_XIU', selectedChoiceId, bet, outcome);
            tuSi.vnd = Math.max(0, tuSi.vnd + playerOutcome.delta);
            await tuSi.save();

            const resultEmbed = new EmbedBuilder()
              .setTitle(playerOutcome.title)
              .setColor(playerOutcome.color)
              .setDescription(
                `Đạo hữu đặt cửa: **${choiceMeta?.name || selectedChoiceId}**\n\n` +
                `🎲 Kết quả gieo xúc xắc:\n` +
                `• Xúc xắc: \`[ ${outcome.d1} ] · [ ${outcome.d2} ] · [ ${outcome.d3} ]\`\n` +
                `• Tổng điểm: \`${outcome.sum}\` ➔ **${outcome.result === 'tx_tai' ? 'Tài' : 'Xỉu'}**\n\n` +
                `${playerOutcome.detail}\n\n🪙 **Số dư hiện tại**: \`${tuSi.vnd.toLocaleString()}\` VND.`
              )
              .setTimestamp();

            await i.editReply({ embeds: [resultEmbed], components: [] });
            collector.stop('finished');
            return;
          }

          if (i.customId === 'game_cancel') {
            collector.stop('cancelled');
            return;
          }
        }

        else if (step === 'KIEM_GIAP_PHAP') {
          if (i.customId === 'kgp_kiem' || i.customId === 'kgp_giap' || i.customId === 'kgp_phap') {
            selectedChoiceId = i.customId;
            await i.editReply({
              embeds: [buildGameEmbed('KIEM_GIAP_PHAP')],
              components: [...buildChoiceRows('KIEM_GIAP_PHAP'), ...buildActionRows('KIEM_GIAP_PHAP')]
            });
            return;
          }

          if (i.customId === 'game_create_room') {
            if (!selectedChoiceId) {
              await i.editReply({ embeds: [BoTaoEmbed.loi('Hãy chọn cửa trước khi lập sòng!')], components: [...buildChoiceRows('KIEM_GIAP_PHAP'), ...buildActionRows('KIEM_GIAP_PHAP')] });
              return;
            }

            roomState.active = true;
            roomState.game = 'KIEM_GIAP_PHAP';
            roomState.choiceId = selectedChoiceId;
            roomState.players.clear();
            roomState.players.set(interaction.user.id, { userId: interaction.user.id, userName: interaction.user.username, bet });
            await i.editReply({ embeds: [buildRoomEmbed()], components: buildRoomComponents() });
            return;
          }

          if (i.customId === 'game_play_now') {
            if (!selectedChoiceId) {
              await i.editReply({ embeds: [BoTaoEmbed.loi('Hãy chọn cửa trước khi chơi!')], components: [...buildChoiceRows('KIEM_GIAP_PHAP'), ...buildActionRows('KIEM_GIAP_PHAP')] });
              return;
            }

            const outcome = getGameOutcome('KIEM_GIAP_PHAP');
            const playerOutcome = resolvePlayerOutcome('KIEM_GIAP_PHAP', selectedChoiceId, bet, outcome);
            tuSi.vnd = Math.max(0, tuSi.vnd + playerOutcome.delta);
            await tuSi.save();

            const resultEmbed = new EmbedBuilder()
              .setTitle(playerOutcome.title)
              .setColor(playerOutcome.color)
              .setDescription(
                `• **Đạo hữu ra chiêu**: **${playerOutcome.playerChoice}**\n` +
                `• **Thiên Đạo ra chiêu**: **${playerOutcome.botChoice}**\n\n` +
                `${playerOutcome.detail}\n\n🪙 **Số dư hiện tại**: \`${tuSi.vnd.toLocaleString()}\` VND.`
              )
              .setTimestamp();

            await i.editReply({ embeds: [resultEmbed], components: [] });
            collector.stop('finished');
            return;
          }

          if (i.customId === 'game_cancel') {
            collector.stop('cancelled');
            return;
          }
        }

        else if (step === 'BLACKJACK') {
          if (i.customId === 'bj_hit') {
            playerHand.push(drawCard());
            const pSum = getSum(playerHand);

            if (pSum > 21) {
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
                new ButtonBuilder().setCustomId('bj_stand').setLabel('✋ Dừng Bài').setStyle(ButtonStyle.Primary)
              );

              await i.editReply({ embeds: [embed], components: [row] });
            }
          }

          else if (i.customId === 'bj_stand') {
            let bSum = getSum(botHand);
            while (bSum < 17) { // <-- Đã fix nhà cái bắt buộc rút đến 17
              botHand.push(drawCard());
              bSum = getSum(botHand);
            }

            const pSum = getSum(playerHand);
            let isWin = false;
            let isTie = false;

            if (bSum > 21) {
              isWin = true;
            } else if (pSum > bSum) {
              isWin = true;
            } else if (pSum === bSum) {
              isTie = true;
            }

            if (isTie) {
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

        else if (step === 'BAU_CUA') {
          if (i.customId in BAU_CUA_CHOICES) {
            selectedChoiceId = i.customId;
            await i.editReply({
              embeds: [buildGameEmbed('BAU_CUA')],
              components: [...buildChoiceRows('BAU_CUA'), ...buildActionRows('BAU_CUA')]
            });
            return;
          }

          if (i.customId === 'game_create_room') {
            if (!selectedChoiceId) {
              await i.editReply({ embeds: [BoTaoEmbed.loi('Hãy chọn linh thú trước khi lập sòng!')], components: [...buildChoiceRows('BAU_CUA'), ...buildActionRows('BAU_CUA')] });
              return;
            }

            roomState.active = true;
            roomState.game = 'BAU_CUA';
            roomState.choiceId = selectedChoiceId;
            roomState.players.clear();
            roomState.players.set(interaction.user.id, { userId: interaction.user.id, userName: interaction.user.username, bet });
            await i.editReply({ embeds: [buildRoomEmbed()], components: buildRoomComponents() });
            return;
          }

          if (i.customId === 'game_play_now') {
            if (!selectedChoiceId) {
              await i.editReply({ embeds: [BoTaoEmbed.loi('Hãy chọn linh thú trước khi chơi!')], components: [...buildChoiceRows('BAU_CUA'), ...buildActionRows('BAU_CUA')] });
              return;
            }

            const outcome = getGameOutcome('BAU_CUA');
            const playerOutcome = resolvePlayerOutcome('BAU_CUA', selectedChoiceId, bet, outcome);
            tuSi.vnd = Math.max(0, tuSi.vnd + playerOutcome.delta);
            await tuSi.save();

            const playerChoice = getChoiceMeta('BAU_CUA', selectedChoiceId);
            // Đã fix lỗi r.emoji
            const rollText = playerOutcome.rolls.map(r => r.name).join(' · ');
            const resultEmbed = new EmbedBuilder()
              .setTitle(playerOutcome.title)
              .setColor(playerOutcome.color)
              .setDescription(
                `• **Đạo hữu đặt cược**: **${playerChoice?.name || selectedChoiceId}**\n` +
                `• **Kết quả gieo xúc xắc**: [ ${rollText} ]\n\n` +
                `${playerOutcome.detail}\n\n🪙 **Số dư hiện tại**: \`${tuSi.vnd.toLocaleString()}\` VND.`
              )
              .setTimestamp();

            await i.editReply({ embeds: [resultEmbed], components: [] });
            collector.stop('finished');
            return;
          }

          if (i.customId === 'game_cancel') {
            collector.stop('cancelled');
            return;
          }
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
              embeds: [
                new EmbedBuilder()
                  .setTitle('🌌 Thiên Cơ Đàm Đạo — Hết Giờ')
                  .setDescription('Tiến trình đàm đạo đã tự động đóng do quá lâu không có phản hồi.')
                  .setColor(0x7f8c8d)
                  .setTimestamp()
              ],
              components: []
            });
          }
        } catch (_) { }
      });
    } // <-- Đã fix lỗi thiếu đóng ngoặc tại đây
  }; // <-- Đã fix lỗi thiếu đóng ngoặc tại đây
} // <-- Đã fix lỗi thiếu đóng ngoặc tại đây

const controller = new BoDieuKhienDamDao();
export const danhSachLenhDamDao = [controller.lenhDamDao];
export { controller as boDieuKhienDamDao };