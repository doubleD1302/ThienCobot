import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';

import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed, layMauCanhGioi } from '../views/BoTaoEmbed.js';
import { TuSi } from '../models/TuSi.js';
import { Op } from 'sequelize';
import * as config from '../config.js';

class BoDieuKhienLeaderboard extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhLeaderboard = {
    data: new SlashCommandBuilder()
      .setName('bxh')
      .setDescription('Xem Bảng Xếp Hạng tu sĩ trong thiên hạ'),

    execute: async (interaction) => {
      await interaction.deferReply();

      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      let currentTab = 'tuvi'; // 'tuvi' hoặc 'linhthach'

      // ── Helper: tạo embed bảng xếp hạng ─────────────────────────────────────
      const buildLeaderboardEmbed = async (tab) => {
        let title = '';
        let desc = '';
        const color = layMauCanhGioi(tuSi.canhGioi);

        if (tab === 'tuvi') {
          title = '🏆 Thiên Bảng Tu Vi — TOP Cao Nhân Tu Tiên';
          const players = await TuSi.findAll({
            where: {
              idNguoiDung: { [Op.ne]: '541474154130571264' }
            },
            order: [['level', 'DESC'], ['linhLuc', 'DESC']],
            limit: 10
          });

          desc = players.map((p, idx) => {
            const crown = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🔹';
            const highlight = p.idNguoiDung === tuSi.idNguoiDung ? ' **(Ngươi)**' : '';
            return `${crown} **TOP ${idx + 1}.** **${p.ten}**${highlight}\n` +
                   `   *Cảnh giới:* \`${p.canhGioi} - Tầng ${p.tang}\` (Cấp ${p.capDo}) · Exp: \`${p.linhLuc}\``;
          }).join('\n\n');
        } else {
          title = '🪙 Phú Hào Bảng — TOP Đại Gia Linh Thạch';
          const players = await TuSi.findAll({
            where: {
              idNguoiDung: { [Op.ne]: '541474154130571264' }
            },
            order: [['linhThach', 'DESC']],
            limit: 10
          });

          desc = players.map((p, idx) => {
            const crown = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🔹';
            const highlight = p.idNguoiDung === tuSi.idNguoiDung ? ' **(Ngươi)**' : '';
            return `${crown} **TOP ${idx + 1}.** **${p.ten}**${highlight}\n` +
                   `   *Tài phú:* \`${p.linhThach.toLocaleString()}\` 🪙 Linh Thạch`;
          }).join('\n\n');
        }

        return new EmbedBuilder()
          .setTitle(title)
          .setColor(color)
          .setDescription(desc || '_Thiên địa sơ khai, chưa có tu sĩ nào ghi danh._')
          .setTimestamp()
          .setFooter({ text: 'Bảng xếp hạng cập nhật thời gian thực.' });
      };

      // ── Helper: tạo hàng nút tương tác ──────────────────────────────────────
      const buildButtons = (tab, disabled = false) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('bxh_tab_tuvi')
            .setLabel('🏆 Tu Vi')
            .setStyle(tab === 'tuvi' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(disabled || tab === 'tuvi'),
          new ButtonBuilder()
            .setCustomId('bxh_tab_linhthach')
            .setLabel('🪙 Linh Thạch')
            .setStyle(tab === 'linhthach' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(disabled || tab === 'linhthach'),
          new ButtonBuilder()
            .setCustomId('bxh_close')
            .setLabel('❌ Đóng')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
        );
      };

      const msg = await interaction.editReply({
        embeds:     [await buildLeaderboardEmbed(currentTab)],
        components: [buildButtons(currentTab)]
      });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time:   120_000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();

        if (i.customId === 'bxh_tab_tuvi') {
          currentTab = 'tuvi';
        } else if (i.customId === 'bxh_tab_linhthach') {
          currentTab = 'linhthach';
        } else if (i.customId === 'bxh_close') {
          collector.stop('closed');
          return;
        }

        await i.editReply({
          embeds:     [await buildLeaderboardEmbed(currentTab)],
          components: [buildButtons(currentTab)]
        });
      });

      collector.on('end', async (_, reason) => {
        try {
          if (reason === 'closed') {
            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle('🏆 Bảng Xếp Hạng — Đã Đóng')
                  .setDescription('Cơ duyên ghi danh thiên bảng vẫn còn rộng mở.')
                  .setColor(0x7f8c8d)
                  .setTimestamp()
              ],
              components: []
            });
          } else {
            await interaction.editReply({
              components: [buildButtons(currentTab, true)]
            });
          }
        } catch (_) {}
      });
    }
  };
}

const controller = new BoDieuKhienLeaderboard();
export const danhSachLenhLeaderboard = [controller.lenhLeaderboard];
export { controller as boDieuKhienLeaderboard };
