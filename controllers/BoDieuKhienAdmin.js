import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  StringSelectMenuBuilder
} from 'discord.js';

import { ChannelRestriction } from '../models/ChannelRestriction.js';

// Bản đồ emoji cho các lệnh phổ biến (tự động fallback nếu thêm lệnh mới)
const EMOJI_MAP = {
  start: '🌟',
  nv: '👤',
  tuluyen: '🧘',
  nghi: '💤',
  balo: '🎒',
  bc: '🗻',
  shop: '🏪',
  lichluyen: '📅',
  dongphu: '🏯',
  bxh: '🏆',
  damdao: '🎰',
  tuongtac: '🤝',
  skill: '✨',
  thiendaoluc: '📜',
  admin: '🛡️',
  boss: '👹',
  canhu: '🌱',
  dotpha: '⚡',
  tuvi: '☯️'
};

// ── Helper: embed danh sách kênh đang bị giới hạn ────────────────────────────
async function buildListEmbed(guild) {
  const records = await ChannelRestriction.findAll();
  const embed   = new EmbedBuilder()
    .setTitle('🛡️ Bảng Điều Khiển Admin — Giới Hạn Lệnh Theo Kênh')
    .setColor(0xe74c3c)
    .setTimestamp()
    .setFooter({ text: `Server: ${guild?.name || 'N/A'}` });

  if (records.length === 0) {
    return embed.setDescription('✅ **Chưa có kênh nào bị giới hạn lệnh.**\nTất cả kênh đang cho phép sử dụng mọi lệnh.');
  }

  let desc = `📋 **${records.length} kênh đang được giới hạn:**\n\n`;
  for (const rec of records) {
    const cmdList = rec.allowedCommands.length > 0
      ? rec.allowedCommands.map(c => `\`/${c}\``).join(', ')
      : '*Không có lệnh nào*';
    desc += `<#${rec.channelId}>\n→ ${cmdList}\n\n`;
  }
  return embed.setDescription(desc.trim());
}

class BoDieuKhienAdmin {
  lenhAdmin = {
    data: new SlashCommandBuilder()
      .setName('admin')
      .setDescription('Bảng điều khiển quản trị máy chủ (Chỉ dành cho Admin)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    execute: async (interaction) => {
      await interaction.deferReply({ ephemeral: true });

      // Lấy danh sách lệnh động trực tiếp từ Client của Discord
      const clientCommands = Array.from(interaction.client.commands.values());
      const tatCaLenh = clientCommands.map(cmd => {
        const name = cmd.data.name;
        return {
          name,
          emoji: EMOJI_MAP[name] || '⚙️'
        };
      }).sort((a, b) => a.name.localeCompare(b.name));

      let mode             = 'LIST'; // 'LIST' | 'ADD' | 'DELETE'
      let pendingChannelId   = null;
      let pendingChannelName = null;
      let pendingCmds        = []; // danh sách lệnh đã được chọn trong bước hiện tại

      // ── Tab row ─────────────────────────────────────────────────────────────
      const buildTabRow = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('adm_tab_list')
            .setLabel('📋 Danh Sách')
            .setStyle(mode === 'LIST' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('adm_tab_add')
             .setLabel('➕ Thêm / Sửa Kênh')
            .setStyle(mode === 'ADD' ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('adm_tab_delete')
            .setLabel('🗑️ Xóa Kênh')
            .setStyle(mode === 'DELETE' ? ButtonStyle.Danger : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('adm_close')
            .setLabel('❌ Đóng').setStyle(ButtonStyle.Danger)
        );

      // ── Embed bước 2 ADD: danh sách lệnh đang pending ──────────────────────
      const buildAddEmbed = () => {
        const selected = pendingCmds.length > 0
          ? pendingCmds.map(c => `• 🟢 \`/${c}\``).join('\n')
          : '*Chưa có lệnh nào được phép (Kênh sẽ bị khóa tất cả lệnh)*';

        return new EmbedBuilder()
          .setTitle('➕ Cấu Hình Giới Hạn Lệnh')
          .setColor(0x2ecc71)
          .addFields(
            { name: '📌 Kênh đang cấu hình',   value: `<#${pendingChannelId}>`, inline: true },
            { name: '🔢 Lệnh được phép',       value: `**${pendingCmds.length}** lệnh`,   inline: true },
            { name: '📋 Danh sách hiện tại',    value: selected,  inline: false },
          )
          .setDescription('Nhấn vào các nút lệnh bên dưới để **Bật (Xanh)** hoặc **Tắt (Xám)**. Bấm **💾 Lưu** sau khi hoàn thành.')
          .setTimestamp();
      };

      // ── Tổng hợp payload theo mode ───────────────────────────────────────────
      const buildPayload = async () => {
        const tabRow = buildTabRow();

        // ── LIST ──────────────────────────────────────────────────────────────
        if (mode === 'LIST') {
          return { embeds: [await buildListEmbed(interaction.guild)], components: [tabRow] };
        }

        // ── ADD — Bước 1: chọn kênh ───────────────────────────────────────────
        if (mode === 'ADD' && !pendingChannelId) {
          return {
            embeds: [
              new EmbedBuilder()
                .setTitle('➕ Thêm / Sửa Giới Hạn Lệnh')
                .setColor(0x2ecc71)
                .setDescription('**Bước 1 / 2** — Chọn kênh Discord muốn đặt giới hạn lệnh:')
                .setTimestamp()
            ],
            components: [
              tabRow,
              new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                  .setCustomId('adm_channel_select')
                  .setPlaceholder('📌 Chọn kênh Discord...')
                  .setChannelTypes(ChannelType.GuildText)
              )
            ]
          };
        }

        // ── ADD — Bước 2: chọn lệnh bằng Select Menu đa chọn (Hợp lệ, dưới 5 ActionRows) ──
        if (mode === 'ADD' && pendingChannelId) {
          const rows = [
            tabRow,
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('adm_cmds_select')
                .setPlaceholder('🔽 Chọn các lệnh được phép hoạt động...')
                .setMinValues(0)
                .setMaxValues(tatCaLenh.length)
                .addOptions(tatCaLenh.map(cmd => ({
                  label: `/${cmd.name}`,
                  value: cmd.name,
                  emoji: cmd.emoji,
                  default: pendingCmds.includes(cmd.name)
                })))
            ),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('adm_save')
                .setLabel('💾 Lưu Thay Đổi')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId('adm_reset_channel')
                .setLabel('📌 Đổi Kênh')
                .setStyle(ButtonStyle.Secondary)
            )
          ];
          return {
            embeds: [buildAddEmbed()],
            components: rows
          };
        }

        // ── DELETE ─────────────────────────────────────────────────────────────
        if (mode === 'DELETE') {
          const records = await ChannelRestriction.findAll();
          const embed   = new EmbedBuilder()
            .setTitle('🗑️ Xóa Giới Hạn Lệnh Của Kênh')
            .setColor(0xe74c3c)
            .setDescription(
              records.length === 0
                ? '✅ Không có kênh nào đang bị giới hạn.'
                : 'Chọn kênh muốn **gỡ bỏ toàn bộ giới hạn** từ menu bên dưới:'
            )
            .setTimestamp();

          const rows = [tabRow];
          if (records.length > 0) {
            rows.push(new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('adm_delete_select')
                .setPlaceholder('🗑️ Chọn kênh muốn xóa giới hạn...')
                .addOptions(records.map(r => ({
                  label:       r.channelName || r.channelId,
                  value:       r.channelId,
                  emoji:       '🔓',
                  description: `Cho phép: ${r.allowedCommands.slice(0, 5).map(c => `/${c}`).join(', ')}${r.allowedCommands.length > 5 ? '...' : ''}`
                })))
            ));
          }
          return { embeds: [embed], components: rows };
        }

        return { embeds: [], components: [tabRow] };
      };

      // ── Gửi tin nhắn ban đầu ─────────────────────────────────────────────────
      const msg = await interaction.editReply(await buildPayload());

      // ── Collector 10 phút ────────────────────────────────────────────────────
      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time:   600_000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();

        // ── Đóng ────────────────────────────────────────────────────────────────
        if (i.customId === 'adm_close') { collector.stop('closed'); return; }

        // ── Chuyển Tab ──────────────────────────────────────────────────────────
        if (i.customId === 'adm_tab_list')      { mode = 'LIST';   pendingChannelId = null; pendingCmds = []; }
        if (i.customId === 'adm_tab_add')       { mode = 'ADD';    pendingChannelId = null; pendingCmds = []; }
        if (i.customId === 'adm_tab_delete')    { mode = 'DELETE'; pendingChannelId = null; pendingCmds = []; }
        if (i.customId === 'adm_reset_channel') { pendingChannelId = null; pendingCmds = []; }

        // ── Chọn Kênh (Bước 1) ──────────────────────────────────────────────────
        if (i.customId === 'adm_channel_select') {
          pendingChannelId   = i.values[0];
          const ch           = interaction.guild?.channels?.cache.get(pendingChannelId);
          pendingChannelName = ch?.name || pendingChannelId;
          const existing     = await ChannelRestriction.findByPk(pendingChannelId);
          pendingCmds        = existing ? [...existing.allowedCommands] : [];
        }

        // ── Chọn Lệnh (Bước 2) ──────────────────────────────────────────────────
        if (i.customId === 'adm_cmds_select') {
          pendingCmds = i.values || [];
        }

        // ── Lưu ─────────────────────────────────────────────────────────────────
        if (i.customId === 'adm_save') {
          if (!pendingChannelId) {
            await i.editReply({
              embeds: [new EmbedBuilder().setColor(0xe74c3c).setDescription('⚠️ Vui lòng cấu hình kênh hợp lệ trước khi lưu!')],
              components: []
            });
            return;
          }
          await ChannelRestriction.upsert({
            channelId:       pendingChannelId,
            channelName:     pendingChannelName,
            allowedCommands: pendingCmds
          });

          const savedCmds = pendingCmds.length > 0 
            ? pendingCmds.map(c => `\`/${c}\``).join(', ')
            : '*Không có lệnh nào (Khóa toàn bộ lệnh)*';
          const savedChannel = pendingChannelId;
          mode = 'LIST'; pendingChannelId = null; pendingCmds = [];

          const payload = await buildPayload();
          payload.embeds.unshift(
            new EmbedBuilder()
              .setTitle('✅ Đã Lưu Thành Công')
              .setColor(0x2ecc71)
              .setDescription(`Kênh <#${savedChannel}> chỉ được phép dùng:\n${savedCmds}`)
              .setTimestamp()
          );
          await i.editReply(payload);
          return;
        }

        // ── Xóa kênh khỏi danh sách ─────────────────────────────────────────────
        if (i.customId === 'adm_delete_select') {
          const targetId = i.values[0];
          const record   = await ChannelRestriction.findByPk(targetId);
          if (record) await record.destroy();

          mode = 'LIST';
          const payload = await buildPayload();
          payload.embeds.unshift(
            new EmbedBuilder()
              .setTitle('🗑️ Đã Xóa Giới Hạn')
              .setColor(0xe67e22)
              .setDescription(`Kênh <#${targetId}> đã được **gỡ bỏ hoàn toàn giới hạn lệnh**.`)
              .setTimestamp()
          );
          await i.editReply(payload);
          return;
        }

        await i.editReply(await buildPayload());
      });

      collector.on('end', async () => {
        try { await interaction.editReply({ components: [] }); } catch (_) {}
      });

    }
  };
}

const controller = new BoDieuKhienAdmin();
export const danhSachLenhAdmin = [controller.lenhAdmin];
export { controller as boDieuKhienAdmin };
