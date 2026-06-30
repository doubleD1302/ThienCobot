import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ChannelSelectMenuBuilder,
  ChannelType
} from 'discord.js';

import { ChannelRestriction } from '../models/ChannelRestriction.js';

// Danh sách TẤT CẢ các lệnh của bot (cập nhật nếu thêm lệnh mới)
const TAT_CA_LENH = [
  { name: 'start',       emoji: '🌟', mo_ta: 'Tạo nhân vật' },
  { name: 'nv',          emoji: '👤', mo_ta: 'Xem hồ sơ' },
  { name: 'tuluyen',     emoji: '🧘', mo_ta: 'Tu luyện' },
  { name: 'nghi',        emoji: '💤', mo_ta: 'Nghỉ ngơi hồi HP' },
  { name: 'balo',        emoji: '🎒', mo_ta: 'Túi trữ vật' },
  { name: 'bc',          emoji: '🗻', mo_ta: 'Bí cảnh phụ bản' },
  { name: 'shop',        emoji: '🏪', mo_ta: 'Cửa hàng' },
  { name: 'lichluyen',   emoji: '📅', mo_ta: 'Lịch luyện hàng ngày' },
  { name: 'dongphu',     emoji: '🏯', mo_ta: 'Động phủ tu tiên' },
  { name: 'bxh',         emoji: '🏆', mo_ta: 'Bảng xếp hạng' },
  { name: 'damdao',      emoji: '🎰', mo_ta: 'Đàm đạo đỏ đen' },
  { name: 'tuongtac',    emoji: '🤝', mo_ta: 'Tương tác đạo hữu' },
  { name: 'kynang',      emoji: '✨', mo_ta: 'Kỹ năng tu tiên' },
  { name: 'tdl',         emoji: '📜', mo_ta: 'Thiên Đạo Lục' },
  { name: 'admin',       emoji: '🛡️', mo_ta: 'Bảng điều khiển admin' },
];

// ── Helper: build embed danh sách kênh hiện tại ──────────────────────────────
async function buildListEmbed(guild) {
  const records = await ChannelRestriction.findAll();

  const embed = new EmbedBuilder()
    .setTitle('🛡️ Bảng Điều Khiển Admin — Giới Hạn Lệnh Theo Kênh')
    .setColor(0xe74c3c)
    .setTimestamp()
    .setFooter({ text: `Server: ${guild?.name || 'N/A'}` });

  if (records.length === 0) {
    embed.setDescription('✅ **Chưa có kênh nào bị giới hạn lệnh.**\nTất cả các kênh đang cho phép sử dụng mọi lệnh.');
    return embed;
  }

  let desc = `📋 **${records.length} kênh đang được giới hạn lệnh:**\n\n`;
  for (const rec of records) {
    const cmds = rec.allowedCommands;
    const channelMention = `<#${rec.channelId}>`;
    const cmdList = cmds.length > 0 ? cmds.map(c => `\`/${c}\``).join(', ') : '*Không có lệnh nào được phép*';
    desc += `${channelMention} (${rec.channelName || rec.channelId})\n→ Cho phép: ${cmdList}\n\n`;
  }

  embed.setDescription(desc.trim());
  return embed;
}

// ── Helper: build select menu chọn lệnh ─────────────────────────────────────
function buildCommandSelectMenu(selectedCommands = []) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('admin_cmd_select')
      .setPlaceholder('🔍 Chọn lệnh được phép trong kênh này (có thể chọn nhiều)...')
      .setMinValues(1)
      .setMaxValues(TAT_CA_LENH.length)
      .addOptions(TAT_CA_LENH.map(cmd => ({
        label:       `/${cmd.name}`,
        value:       cmd.name,
        emoji:       cmd.emoji,
        description: cmd.mo_ta,
        default:     selectedCommands.includes(cmd.name)
      })))
  );
}

class BoDieuKhienAdmin {
  lenhAdmin = {
    data: new SlashCommandBuilder()
      .setName('admin')
      .setDescription('Bảng điều khiển quản trị máy chủ (Chỉ dành cho Admin)')
      // CHỈ ADMIN SERVER mới thấy và dùng được lệnh này
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    execute: async (interaction) => {
      await interaction.deferReply({ ephemeral: true }); // Chỉ admin thấy

      let mode        = 'LIST';       // 'LIST' | 'ADD' | 'DELETE'
      let pendingChannelId   = null;
      let pendingChannelName = null;
      let pendingCmds        = [];

      // ── Builder: Row nút tab chính ─────────────────────────────────────────
      const buildTabRow = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('adm_tab_list')
            .setLabel('📋 Danh Sách')
            .setStyle(mode === 'LIST' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('adm_tab_add')
            .setLabel('➕ Thêm / Sửa Kênh')
            .setStyle(mode === 'ADD' ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('adm_tab_delete')
            .setLabel('🗑️ Xóa Kênh')
            .setStyle(mode === 'DELETE' ? ButtonStyle.Danger : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('adm_close')
            .setLabel('❌ Đóng')
            .setStyle(ButtonStyle.Danger)
        );

      // ── Builder: payload theo mode ─────────────────────────────────────────
      const buildPayload = async () => {
        const tabRow = buildTabRow();

        if (mode === 'LIST') {
          return {
            embeds:     [await buildListEmbed(interaction.guild)],
            components: [tabRow]
          };
        }

        if (mode === 'ADD') {
          const embed = new EmbedBuilder()
            .setTitle('➕ Thêm / Sửa Giới Hạn Lệnh Cho Kênh')
            .setColor(0x2ecc71)
            .setDescription(
              pendingChannelId
                ? `**Kênh được chọn**: <#${pendingChannelId}>\n\nBước 2: Chọn các lệnh được phép dùng trong kênh này, sau đó bấm **💾 Lưu**.`
                : 'Bước 1: Chọn kênh muốn đặt giới hạn lệnh từ menu bên dưới.'
            )
            .setTimestamp();

          const channelSelectRow = new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId('adm_channel_select')
              .setPlaceholder('📌 Chọn kênh Discord...')
              .setChannelTypes(ChannelType.GuildText)
          );

          const rows = [tabRow, channelSelectRow];

          if (pendingChannelId) {
            rows.push(buildCommandSelectMenu(pendingCmds));
            rows.push(
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('adm_save')
                  .setLabel('💾 Lưu Thay Đổi')
                  .setStyle(ButtonStyle.Success)
                  .setDisabled(pendingCmds.length === 0),
                new ButtonBuilder()
                  .setCustomId('adm_reset_channel')
                  .setLabel('↩️ Chọn Lại Kênh')
                  .setStyle(ButtonStyle.Secondary)
              )
            );
          }

          return { embeds: [embed], components: rows };
        }

        if (mode === 'DELETE') {
          const records = await ChannelRestriction.findAll();
          const embed   = new EmbedBuilder()
            .setTitle('🗑️ Xóa Giới Hạn Lệnh Của Kênh')
            .setColor(0xe74c3c)
            .setDescription(
              records.length === 0
                ? '✅ Không có kênh nào đang bị giới hạn. Không có gì để xóa.'
                : 'Chọn kênh muốn **gỡ bỏ toàn bộ giới hạn lệnh** từ menu bên dưới:'
            )
            .setTimestamp();

          const rows = [tabRow];
          if (records.length > 0) {
            rows.push(
              new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId('adm_delete_select')
                  .setPlaceholder('🗑️ Chọn kênh muốn xóa giới hạn...')
                  .addOptions(records.map(r => ({
                    label:       r.channelName || r.channelId,
                    value:       r.channelId,
                    emoji:       '🔓',
                    description: `Cho phép: ${r.allowedCommands.slice(0, 5).map(c => `/${c}`).join(', ')}${r.allowedCommands.length > 5 ? '...' : ''}`
                  })))
              )
            );
          }

          return { embeds: [embed], components: rows };
        }

        return { embeds: [], components: [tabRow] };
      };

      // ── Gửi tin nhắn ban đầu ───────────────────────────────────────────────
      const msg = await interaction.editReply(await buildPayload());

      // ── Collector (10 phút — đủ để admin làm việc) ──────────────────────────
      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time:   600_000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();

        // ── Đóng ──────────────────────────────────────────────────────────────
        if (i.customId === 'adm_close') {
          collector.stop('closed');
          return;
        }

        // ── Chuyển Tab ─────────────────────────────────────────────────────────
        if (i.customId === 'adm_tab_list')   { mode = 'LIST';   pendingChannelId = null; pendingCmds = []; }
        if (i.customId === 'adm_tab_add')    { mode = 'ADD';    pendingChannelId = null; pendingCmds = []; }
        if (i.customId === 'adm_tab_delete') { mode = 'DELETE'; pendingChannelId = null; pendingCmds = []; }
        if (i.customId === 'adm_reset_channel') { pendingChannelId = null; pendingCmds = []; }

        // ── Chọn Kênh (mode ADD) ───────────────────────────────────────────────
        if (i.customId === 'adm_channel_select') {
          pendingChannelId   = i.values[0];
          const ch = interaction.guild?.channels?.cache.get(pendingChannelId);
          pendingChannelName = ch?.name || pendingChannelId;

          // Nếu kênh đã có giới hạn → tải sẵn danh sách lệnh cũ để sửa
          const existing = await ChannelRestriction.findByPk(pendingChannelId);
          pendingCmds = existing ? [...existing.allowedCommands] : [];
        }

        // ── Chọn Lệnh (mode ADD) ───────────────────────────────────────────────
        if (i.customId === 'adm_cmd_select') {
          pendingCmds = i.values;
        }

        // ── Lưu (mode ADD) ─────────────────────────────────────────────────────
        if (i.customId === 'adm_save') {
          if (!pendingChannelId || pendingCmds.length === 0) {
            await i.editReply({ content: '⚠️ Chưa chọn kênh hoặc chưa chọn lệnh nào!' });
            return;
          }

          await ChannelRestriction.upsert({
            channelId:       pendingChannelId,
            channelName:     pendingChannelName,
            allowedCommands: pendingCmds
          });

          const cmdList = pendingCmds.map(c => `\`/${c}\``).join(', ');
          mode = 'LIST';
          const payload = await buildPayload();
          payload.embeds.unshift(
            new EmbedBuilder()
              .setTitle('✅ Đã Lưu Thành Công')
              .setColor(0x2ecc71)
              .setDescription(`Kênh <#${pendingChannelId}> chỉ được phép dùng:\n${cmdList}`)
              .setTimestamp()
          );
          pendingChannelId = null;
          pendingCmds = [];
          await i.editReply(payload);
          return;
        }

        // ── Xóa kênh khỏi danh sách (mode DELETE) ─────────────────────────────
        if (i.customId === 'adm_delete_select') {
          const targetChannelId = i.values[0];
          const record = await ChannelRestriction.findByPk(targetChannelId);
          if (record) await record.destroy();

          mode = 'LIST';
          const payload = await buildPayload();
          payload.embeds.unshift(
            new EmbedBuilder()
              .setTitle('🗑️ Đã Xóa Giới Hạn')
              .setColor(0xe67e22)
              .setDescription(`Kênh <#${targetChannelId}> đã được **gỡ bỏ hoàn toàn giới hạn lệnh**. Mọi người có thể dùng mọi lệnh trong kênh này.`)
              .setTimestamp()
          );
          await i.editReply(payload);
          return;
        }

        await i.editReply(await buildPayload());
      });

      collector.on('end', async (_, reason) => {
        try {
          await interaction.editReply({ components: [] });
        } catch (_) {}
      });
    }
  };
}

const controller = new BoDieuKhienAdmin();
export const danhSachLenhAdmin = [controller.lenhAdmin];
export { controller as boDieuKhienAdmin };
