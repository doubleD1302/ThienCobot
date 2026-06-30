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

// Danh sách TẤT CẢ các lệnh của bot
const TAT_CA_LENH = [
  { name: 'start',     emoji: '🌟', mo_ta: 'Tạo nhân vật' },
  { name: 'nv',        emoji: '👤', mo_ta: 'Xem hồ sơ nhân vật' },
  { name: 'tuluyen',   emoji: '🧘', mo_ta: 'Tu luyện tăng kinh nghiệm' },
  { name: 'nghi',      emoji: '💤', mo_ta: 'Nghỉ ngơi hồi HP/MP' },
  { name: 'balo',      emoji: '🎒', mo_ta: 'Túi trữ vật, trang bị' },
  { name: 'bc',        emoji: '🗻', mo_ta: 'Bí cảnh phụ bản chiến đấu' },
  { name: 'shop',      emoji: '🏪', mo_ta: 'Cửa hàng mua vật phẩm' },
  { name: 'lichluyen', emoji: '📅', mo_ta: 'Lịch luyện hàng ngày' },
  { name: 'dongphu',   emoji: '🏯', mo_ta: 'Động phủ tu tiên' },
  { name: 'bxh',       emoji: '🏆', mo_ta: 'Bảng xếp hạng tu sĩ' },
  { name: 'damdao',    emoji: '🎰', mo_ta: 'Đàm đạo cờ bạc' },
  { name: 'tuongtac',  emoji: '🤝', mo_ta: 'Tương tác đạo hữu' },
  { name: 'kynang',    emoji: '✨', mo_ta: 'Xem kỹ năng tu tiên' },
  { name: 'tdl',       emoji: '📜', mo_ta: 'Thiên Đạo Lục điểm danh' },
  { name: 'admin',     emoji: '🛡️', mo_ta: 'Bảng điều khiển admin' },
];

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

      // ── Embed bước 2 ADD: luôn hiển thị danh sách lệnh đang pending ─────────
      const buildAddEmbed = () => {
        const selected = pendingCmds.length > 0
          ? pendingCmds.map(c => {
              const info = TAT_CA_LENH.find(x => x.name === c);
              return `${info?.emoji || '▪️'} \`/${c}\``;
            }).join('\n')
          : '*Chưa có lệnh nào được thêm*';

        const unselected = TAT_CA_LENH.filter(x => !pendingCmds.includes(x.name));
        const available  = unselected.length > 0
          ? `*${unselected.length} lệnh chưa được thêm*`
          : '*Tất cả lệnh đã được thêm*';

        return new EmbedBuilder()
          .setTitle('➕ Cấu Hình Giới Hạn Lệnh')
          .setColor(0x2ecc71)
          .addFields(
            { name: '📌 Kênh',                  value: `<#${pendingChannelId}>`, inline: true },
            { name: '🔢 Số lệnh đã chọn',        value: `**${pendingCmds.length}** lệnh`,   inline: true },
            { name: '✅ Lệnh được phép dùng',    value: selected,  inline: false },
            { name: '📦 Lệnh chưa thêm',         value: available, inline: false },
          )
          .setDescription('**Bước 2 / 2** — Dùng 2 dropdown bên dưới để **Thêm** hoặc **Bỏ** từng lệnh. Sau đó bấm **💾 Lưu**.')
          .setFooter({ text: 'Thêm: chọn lệnh từ "Thêm lệnh". Bỏ: chọn lệnh từ "Bỏ lệnh".' })
          .setTimestamp();
      };

      // ── Dropdown THÊM: chỉ hiển thị lệnh chưa có trong pendingCmds ──────────
      const buildAddCmdSelect = () => {
        const available = TAT_CA_LENH.filter(x => !pendingCmds.includes(x.name));
        if (available.length === 0) {
          return new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('adm_cmd_add')
              .setPlaceholder('✅ Đã thêm tất cả lệnh rồi')
              .setDisabled(true)
              .addOptions([{ label: '(Không còn lệnh nào)', value: '__none__' }])
          );
        }
        return new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('adm_cmd_add')
            .setPlaceholder('➕ Chọn lệnh muốn THÊM vào danh sách cho phép...')
            .addOptions(available.map(cmd => ({
              label:       `/${cmd.name}`,
              value:       cmd.name,
              emoji:       cmd.emoji,
              description: cmd.mo_ta
            })))
        );
      };

      // ── Dropdown BỎ: chỉ hiển thị lệnh đã có trong pendingCmds ─────────────
      const buildRemoveCmdSelect = () => {
        if (pendingCmds.length === 0) {
          return new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('adm_cmd_remove')
              .setPlaceholder('⚠️ Chưa có lệnh nào để bỏ')
              .setDisabled(true)
              .addOptions([{ label: '(Danh sách trống)', value: '__none__' }])
          );
        }
        return new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('adm_cmd_remove')
            .setPlaceholder('➖ Chọn lệnh muốn BỎ khỏi danh sách cho phép...')
            .addOptions(pendingCmds.map(name => {
              const info = TAT_CA_LENH.find(x => x.name === name);
              return {
                label:       `/${name}`,
                value:       name,
                emoji:       info?.emoji || '▪️',
                description: info?.mo_ta || ''
              };
            }))
        );
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

        // ── ADD — Bước 2: chọn lệnh (thêm / bỏ riêng biệt) ──────────────────
        if (mode === 'ADD' && pendingChannelId) {
          return {
            embeds: [buildAddEmbed()],
            components: [
              tabRow,
              buildAddCmdSelect(),
              buildRemoveCmdSelect(),
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('adm_save')
                  .setLabel('💾 Lưu Thay Đổi')
                  .setStyle(ButtonStyle.Success)
                  .setDisabled(pendingCmds.length === 0),
                new ButtonBuilder()
                  .setCustomId('adm_reset_channel')
                  .setLabel('📌 Đổi Kênh')
                  .setStyle(ButtonStyle.Secondary)
              )
            ]
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

        // ── Thêm lệnh (dropdown đơn — SINGLE select, ổn định 100%) ─────────────
        if (i.customId === 'adm_cmd_add') {
          const cmd = i.values[0];
          if (cmd !== '__none__' && !pendingCmds.includes(cmd)) {
            pendingCmds.push(cmd);
          }
        }

        // ── Bỏ lệnh (dropdown đơn — SINGLE select) ──────────────────────────────
        if (i.customId === 'adm_cmd_remove') {
          const cmd = i.values[0];
          pendingCmds = pendingCmds.filter(c => c !== cmd);
        }

        // ── Lưu ─────────────────────────────────────────────────────────────────
        if (i.customId === 'adm_save') {
          if (!pendingChannelId || pendingCmds.length === 0) {
            await i.editReply({
              embeds: [new EmbedBuilder().setColor(0xe74c3c).setDescription('⚠️ Vui lòng thêm ít nhất 1 lệnh vào danh sách trước khi lưu!')],
              components: []
            });
            return;
          }
          await ChannelRestriction.upsert({
            channelId:       pendingChannelId,
            channelName:     pendingChannelName,
            allowedCommands: pendingCmds
          });

          const savedCmds = pendingCmds.map(c => `\`/${c}\``).join(', ');
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
