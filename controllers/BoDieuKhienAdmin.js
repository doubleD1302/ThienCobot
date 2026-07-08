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

const COMMANDS_PER_PAGE = 25;

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
      let commandPage        = 0;

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
      const buildAddEmbed = (descriptionSuffix = '') => {
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
            .setDescription(`Nhấn vào các nút lệnh bên dưới để **Bật (Xanh)** hoặc **Tắt (Xám)**. Bấm **💾 Lưu** sau khi hoàn thành.${descriptionSuffix}`)
          .setTimestamp();
      };

      const getCommandPages = () => {
        const pages = [];
        for (let index = 0; index < tatCaLenh.length; index += COMMANDS_PER_PAGE) {
          pages.push(tatCaLenh.slice(index, index + COMMANDS_PER_PAGE));
        }
        return pages.length > 0 ? pages : [[]];
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
          const commandPages = getCommandPages();
          const totalPages = commandPages.length;
          commandPage = Math.max(0, Math.min(commandPage, totalPages - 1));
          const availableCommands = commandPages[commandPage] || [];
          const pageStart = tatCaLenh.length === 0 ? 0 : (commandPage * COMMANDS_PER_PAGE) + 1;
          const pageEnd = Math.min(tatCaLenh.length, (commandPage + 1) * COMMANDS_PER_PAGE);
          const addEmbed = buildAddEmbed(`\n\n📄 Trang **${commandPage + 1}/${totalPages}** · Hiển thị lệnh **${pageStart}-${pageEnd}** trên tổng **${tatCaLenh.length}** lệnh.`);
          const rows = [
            tabRow,
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('adm_cmds_select')
                .setPlaceholder('🔽 Chọn các lệnh được phép hoạt động...')
                .setMinValues(0)
                .setMaxValues(Math.min(COMMANDS_PER_PAGE, availableCommands.length))
                .addOptions(availableCommands.map(cmd => ({
                  label: `/${cmd.name}`,
                  value: cmd.name,
                  emoji: cmd.emoji,
                  default: pendingCmds.includes(cmd.name)
                })))
            ),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('adm_cmd_prev')
                .setLabel('◀ Trang trước')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(commandPage === 0),
              new ButtonBuilder()
                .setCustomId('adm_cmd_page')
                .setLabel(`Trang ${commandPage + 1}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('adm_cmd_next')
                .setLabel('Trang sau ▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(commandPage >= totalPages - 1)
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
            embeds: [addEmbed],
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

        // ── Phân trang danh sách lệnh ─────────────────────────────────────────
        if (i.customId === 'adm_cmd_prev') {
          commandPage = Math.max(0, commandPage - 1);
        }
        if (i.customId === 'adm_cmd_next') {
          commandPage = commandPage + 1;
        }

        // ── Chuyển Tab ──────────────────────────────────────────────────────────
        if (i.customId === 'adm_tab_list')      { mode = 'LIST';   pendingChannelId = null; pendingCmds = []; commandPage = 0; }
        if (i.customId === 'adm_tab_add')       { mode = 'ADD';    pendingChannelId = null; pendingCmds = []; commandPage = 0; }
        if (i.customId === 'adm_tab_delete')    { mode = 'DELETE'; pendingChannelId = null; pendingCmds = []; commandPage = 0; }
        if (i.customId === 'adm_reset_channel') { pendingChannelId = null; pendingCmds = []; commandPage = 0; }

        // ── Chọn Kênh (Bước 1) ──────────────────────────────────────────────────
        if (i.customId === 'adm_channel_select') {
          pendingChannelId   = i.values[0];
          const ch           = interaction.guild?.channels?.cache.get(pendingChannelId);
          pendingChannelName = ch?.name || pendingChannelId;
          const existing     = await ChannelRestriction.findByPk(pendingChannelId);
          pendingCmds        = existing ? [...existing.allowedCommands] : [];
          commandPage        = 0;
        }

        // ── Chọn Lệnh (Bước 2) ──────────────────────────────────────────────────
        if (i.customId === 'adm_cmds_select') {
          const currentPageCommands = getCommandPages()[commandPage] || [];
          const currentPageNames = currentPageCommands.map(cmd => cmd.name);
          const currentSelections = new Set(i.values || []);

          pendingCmds = pendingCmds.filter(cmd => !currentPageNames.includes(cmd));
          pendingCmds.push(...currentPageNames.filter(cmd => currentSelections.has(cmd)));
          pendingCmds = [...new Set(pendingCmds)];
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
          await ChannelRestriction.loadAllToCache();

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
          if (record) {
            await record.destroy();
            await ChannelRestriction.loadAllToCache();
          }

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

  lenhEdit = {
    data: new SlashCommandBuilder()
      .setName('edit')
      .setDescription('Bảng điều chỉnh sửa thông tin người chơi (Chỉ dành cho wiine5100)')
      .addUserOption(option =>
        option.setName('target')
          .setDescription('Đạo hữu cần điều chỉnh')
          .setRequired(true)
      ),

    execute: async (interaction) => {
      if (interaction.user.username !== 'wiine5100') {
        return interaction.reply({
          content: '❌ **Vô pháp vô thiên!** Quyền hạn bất túc để sử dụng thiên đạo lệnh này!',
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const targetUser = interaction.options.getUser('target');
      
      const { TuSi } = await import('../models/TuSi.js');
      const { Inventory } = await import('../models/Inventory.js');
      const { Item } = await import('../models/Item.js');
      const config = await import('../config.js');

      let tuSi = await TuSi.findOne({ where: { idNguoiDung: targetUser.id } });
      if (!tuSi) {
        return interaction.editReply({
          content: `❌ Đạo hữu **${targetUser.username}** chưa khởi đầu kiếp tu tiên (\`/start\`).`
        });
      }

      let currentMenu = 'MAIN'; // 'MAIN', 'EDIT_STATS', 'GIFT_ITEM', 'REVOKE_ITEM'
      let selectedCategory = null;
      let selectedItemToGift = null;
      let selectedInvRecordToRevoke = null;

      // Helper to build Payload (Embed + ActionRows)
      const buildPayload = async () => {
        await tuSi.reload();

        const embed = new EmbedBuilder()
          .setTimestamp()
          .setFooter({ text: `Đang thao tác trên đạo hữu: ${tuSi.ten} (${tuSi.idNguoiDung})` });

        const rows = [];

        if (currentMenu === 'MAIN') {
          embed.setTitle(`🛠️ Bảng Thiên Đạo Điều Phối — ${tuSi.ten}`)
            .setColor(0x9b59b6)
            .setDescription(
              `• **Đạo hiệu**: **${tuSi.ten}**\n` +
              `• **Cảnh giới**: \`${tuSi.canhGioi}\` (Cấp \`${tuSi.capDo}\`)\n` +
              `• **Linh Lực**: \`${tuSi.linhLuc.toLocaleString()}\`\n` +
              `• **Linh Thạch**: \`🪙 ${tuSi.linhThach.toLocaleString()}\`\n` +
              `• **VND**: \`💵 ${tuSi.vnd.toLocaleString()}\`\n` +
              `• **HP**: \`${tuSi.hp}\` | **MP**: \`${tuSi.mp}\`\n\n` +
              `*Vui lòng sử dụng các nút tương tác bên dưới để chỉnh sửa.*`
            );

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('edit_btn_stats').setLabel('☯️ Chỉnh Chỉ Số / Tiền').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('edit_btn_gift').setLabel('🎁 Tặng Vật Phẩm').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('edit_btn_revoke').setLabel('🗑️ Thu Hồi Vật Phẩm').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('edit_btn_close').setLabel('❌ Đóng Bảng').setStyle(ButtonStyle.Secondary)
          );
          rows.push(row);

        } else if (currentMenu === 'EDIT_STATS') {
          embed.setTitle(`☯️ Thiên Đạo Điều Chỉnh Chỉ Số — ${tuSi.ten}`)
            .setColor(0xf1c40f)
            .setDescription(
              `• **Linh Lực**: \`${tuSi.linhLuc.toLocaleString()}\`\n` +
              `• **Linh Thạch**: \`🪙 ${tuSi.linhThach.toLocaleString()}\`\n` +
              `• **VND**: \`💵 ${tuSi.vnd.toLocaleString()}\`\n` +
              `• **Cảnh giới**: \`${tuSi.canhGioi}\` (Cấp \`${tuSi.capDo}\`)\n` +
              `• **HP**: \`${tuSi.hp}\` | **MP**: \`${tuSi.mp}\``
            );

          const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('edit_stat_ll_p100m').setLabel('Linh Lực +100M').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('edit_stat_ll_m100m').setLabel('Linh Lực -100M').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('edit_stat_ll_p1b').setLabel('Linh Lực +1B').setStyle(ButtonStyle.Primary)
          );

          const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('edit_stat_lt_p1m').setLabel('Linh Thạch +1M').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('edit_stat_lt_m1m').setLabel('Linh Thạch -1M').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('edit_stat_lt_p10m').setLabel('Linh Thạch +10M').setStyle(ButtonStyle.Success)
          );

          const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('edit_stat_vnd_p1m').setLabel('VND +1M').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('edit_stat_vnd_m1m').setLabel('VND -1M').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('edit_stat_vnd_p10m').setLabel('VND +10M').setStyle(ButtonStyle.Danger)
          );

          const row4 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('edit_stat_cg_p1').setLabel('Cảnh Giới +1 Cấp').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('edit_stat_cg_m1').setLabel('Cảnh Giới -1 Cấp').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('edit_stat_reset_hpmp').setLabel('Hồi Phục HP/MP').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('edit_stat_back').setLabel('🔙 Quay Lại').setStyle(ButtonStyle.Secondary)
          );

          rows.push(row1, row2, row3, row4);

        } else if (currentMenu === 'GIFT_ITEM') {
          let itemDetails = '_Chưa chọn vật phẩm để tặng._';
          if (selectedItemToGift) {
            const configItem = config.ITEMS.find(item => item.id === selectedItemToGift);
            if (configItem) {
              itemDetails = `**Vật phẩm đang chọn**: ${configItem.emoji || '📦'} **${configItem.ten}**\n` +
                            `• Loại: \`${configItem.loai}\` | Độ hiếm: \`${configItem.doHiem}\`\n` +
                            `• Mô tả: *${configItem.moTa || 'Không có'}*`;
            }
          }

          embed.setTitle(`🎁 Thiên Đạo Ban Tặng Vật Phẩm — ${tuSi.ten}`)
            .setColor(0x2ecc71)
            .setDescription(
              `*Hãy chọn danh mục vật phẩm, chọn vật phẩm cụ thể và bấm số lượng tặng.*\n\n` +
              `• Danh mục hiện tại: **${selectedCategory || 'Chưa chọn'}**\n` +
              `• ${itemDetails}`
            );

          // Select Category row
          const catRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('edit_gift_cat_select')
              .setPlaceholder('Chọn danh mục vật phẩm...')
              .addOptions([
                { label: '💊 Đan dược', value: 'Đan dược' },
                { label: '🌱 Linh thảo & Trứng', value: 'Linh thảo' },
                { label: '🗡️ Trang bị (Vũ khí/Giáp/Bội)', value: 'Trang bi' },
                { label: '🔮 Cổ bảo & Pháp bảo', value: 'Phap bao' },
                { label: '🏺 Chí bảo', value: 'Chí bảo' },
                { label: '🎭 Trang phục (Skin)', value: 'Skin' }
              ])
          );
          rows.push(catRow);

          // Filter and select items
          if (selectedCategory) {
            let filterFunc = item => item.loai === selectedCategory;
            if (selectedCategory === 'Trang bi') {
              filterFunc = item => ['Vũ khí', 'Giáp', 'Ngọc Bội'].includes(item.loai);
            } else if (selectedCategory === 'Phap bao') {
              filterFunc = item => ['Cổ Bảo Chủ Động', 'Pháp Bảo'].includes(item.loai);
            }

            const matchedItems = config.ITEMS.filter(filterFunc).slice(0, 25);
            if (matchedItems.length > 0) {
              const itemOptions = matchedItems.map(item => ({
                label: item.ten.substring(0, 50),
                value: item.id,
                description: `${item.loai} | ${item.doHiem} | ID: ${item.id}`.substring(0, 100)
              }));

              const itemRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId('edit_gift_item_select')
                  .setPlaceholder('Chọn vật phẩm cụ thể để tặng...')
                  .addOptions(itemOptions)
              );
              rows.push(itemRow);
            } else {
              embed.setDescription(embed.data.description + `\n⚠️ *Không tìm thấy vật phẩm nào trong danh mục này.*`);
            }
          }

          // Gift quantity buttons
          const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('edit_gift_x1').setLabel('Tặng x1').setStyle(ButtonStyle.Success).setDisabled(!selectedItemToGift),
            new ButtonBuilder().setCustomId('edit_gift_x5').setLabel('Tặng x5').setStyle(ButtonStyle.Success).setDisabled(!selectedItemToGift),
            new ButtonBuilder().setCustomId('edit_gift_x10').setLabel('Tặng x10').setStyle(ButtonStyle.Success).setDisabled(!selectedItemToGift),
            new ButtonBuilder().setCustomId('edit_gift_x50').setLabel('Tặng x50').setStyle(ButtonStyle.Success).setDisabled(!selectedItemToGift),
            new ButtonBuilder().setCustomId('edit_gift_back').setLabel('🔙 Quay Lại').setStyle(ButtonStyle.Secondary)
          );
          rows.push(actionRow);

        } else if (currentMenu === 'REVOKE_ITEM') {
          // Load target inventory
          const freshInvList = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung } });
          let invDetails = '_Chưa chọn vật phẩm để thu hồi._';
          
          if (selectedInvRecordToRevoke) {
            const record = freshInvList.find(r => r.id === selectedInvRecordToRevoke);
            if (record) {
              const configItem = config.ITEMS.find(item => item.id === record.itemId);
              const nameText = configItem ? configItem.ten : record.itemId;
              invDetails = `**Vật phẩm đang chọn**: **${nameText}**\n` +
                           `• Số lượng hiện tại: \`${record.soLuong}\`\n` +
                           `• Mã dòng balo: \`#${record.id}\``;
            } else {
              selectedInvRecordToRevoke = null;
            }
          }

          embed.setTitle(`🗑️ Thiên Đạo Thu Hồi Vật Phẩm — ${tuSi.ten}`)
            .setColor(0xe74c3c)
            .setDescription(
              `*Hãy chọn một dòng vật phẩm trong balo của người chơi dưới đây và bấm số lượng thu hồi.*\n\n` +
              `• ${invDetails}`
            );

          if (freshInvList.length > 0) {
            // Build options for select menu (limit 25)
            const matchedOptions = [];
            for (const record of freshInvList.slice(0, 25)) {
              const configItem = config.ITEMS.find(item => item.id === record.itemId);
              const nameText = configItem ? configItem.ten.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '').trim() : record.itemId;
              matchedOptions.push({
                label: `${nameText} x${record.soLuong} (#${record.id})`.substring(0, 50),
                value: String(record.id),
                description: `ID: ${record.itemId} | Mặc: ${record.trangBi ? 'Có' : 'Không'}`.substring(0, 100)
              });
            }

            const invRow = new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('edit_revoke_item_select')
                .setPlaceholder('Chọn dòng vật phẩm để thu hồi...')
                .addOptions(matchedOptions)
            );
            rows.push(invRow);
          } else {
            embed.setDescription(embed.data.description + `\n\n📦 *Balo của đạo hữu này trống rỗng.*`);
          }

          const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('edit_revoke_x1').setLabel('Thu Hồi 1').setStyle(ButtonStyle.Danger).setDisabled(!selectedInvRecordToRevoke),
            new ButtonBuilder().setCustomId('edit_revoke_x5').setLabel('Thu Hồi 5').setStyle(ButtonStyle.Danger).setDisabled(!selectedInvRecordToRevoke),
            new ButtonBuilder().setCustomId('edit_revoke_all').setLabel('Thu Hồi Tất Cả').setStyle(ButtonStyle.Danger).setDisabled(!selectedInvRecordToRevoke),
            new ButtonBuilder().setCustomId('edit_revoke_back').setLabel('🔙 Quay Lại').setStyle(ButtonStyle.Secondary)
          );
          rows.push(actionRow);
        }

        return { embeds: [embed], components: rows };
      };

      const payload = await buildPayload();
      const response = await interaction.editReply(payload);

      // Create component collector
      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 300000 // 5 minutes
      });

      collector.on('collect', async i => {
        try {
          await i.deferUpdate();
        } catch (_) {
          return;
        }

        const customId = i.customId;

        // Navigation
        if (customId === 'edit_btn_stats') {
          currentMenu = 'EDIT_STATS';
        } else if (customId === 'edit_btn_gift') {
          currentMenu = 'GIFT_ITEM';
          selectedCategory = null;
          selectedItemToGift = null;
        } else if (customId === 'edit_btn_revoke') {
          currentMenu = 'REVOKE_ITEM';
          selectedInvRecordToRevoke = null;
        } else if (customId === 'edit_btn_close') {
          collector.stop('closed');
          return;
        } else if (['edit_stat_back', 'edit_gift_back', 'edit_revoke_back'].includes(customId)) {
          currentMenu = 'MAIN';
        }

        // Stats editing operations
        else if (customId === 'edit_stat_ll_p100m') {
          tuSi.linhLuc += 100000000;
          await tuSi.save();
        } else if (customId === 'edit_stat_ll_m100m') {
          tuSi.linhLuc = Math.max(0, Number(tuSi.linhLuc) - 100000000);
          await tuSi.save();
        } else if (customId === 'edit_stat_ll_p1b') {
          tuSi.linhLuc += 1000000000;
          await tuSi.save();
        } else if (customId === 'edit_stat_lt_p1m') {
          tuSi.linhThach += 1000000;
          await tuSi.save();
        } else if (customId === 'edit_stat_lt_m1m') {
          tuSi.linhThach = Math.max(0, Number(tuSi.linhThach) - 1000000);
          await tuSi.save();
        } else if (customId === 'edit_stat_lt_p10m') {
          tuSi.linhThach += 10000000;
          await tuSi.save();
        } else if (customId === 'edit_stat_vnd_p1m') {
          tuSi.vnd += 1000000;
          await tuSi.save();
        } else if (customId === 'edit_stat_vnd_m1m') {
          tuSi.vnd = Math.max(0, Number(tuSi.vnd) - 1000000);
          await tuSi.save();
        } else if (customId === 'edit_stat_vnd_p10m') {
          tuSi.vnd += 10000000;
          await tuSi.save();
        } else if (customId === 'edit_stat_reset_hpmp') {
          const stats = await tuSi.layChiSoDayDu();
          tuSi.hp = stats.max_hp;
          tuSi.mp = stats.max_mp;
          await tuSi.save();
        } else if (customId === 'edit_stat_cg_p1') {
          tuSi.capDo = Math.min(31, tuSi.capDo + 1);
          const cg = config.layThongTinCanhGioi(tuSi.capDo);
          tuSi.canhGioi = `${cg.realmName} - ${cg.stageName}`;
          await tuSi.save();
        } else if (customId === 'edit_stat_cg_m1') {
          tuSi.capDo = Math.max(1, tuSi.capDo - 1);
          const cg = config.layThongTinCanhGioi(tuSi.capDo);
          tuSi.canhGioi = `${cg.realmName} - ${cg.stageName}`;
          await tuSi.save();
        }

        // Gift operations
        else if (customId === 'edit_gift_cat_select') {
          selectedCategory = i.values[0];
          selectedItemToGift = null;
        } else if (customId === 'edit_gift_item_select') {
          selectedItemToGift = i.values[0];
        } else if (customId.startsWith('edit_gift_x')) {
          const qty = parseInt(customId.replace('edit_gift_x', ''), 10);
          if (selectedItemToGift) {
            await Inventory.addVatPham(tuSi.idNguoiDung, selectedItemToGift, qty);
            selectedItemToGift = null; // reset select after gifting
          }
        }

        // Revoke operations
        else if (customId === 'edit_revoke_item_select') {
          selectedInvRecordToRevoke = parseInt(i.values[0], 10);
        } else if (customId.startsWith('edit_revoke_')) {
          const mode = customId.replace('edit_revoke_', '');
          if (selectedInvRecordToRevoke) {
            const record = await Inventory.findOne({ where: { id: selectedInvRecordToRevoke } });
            if (record) {
              if (mode === 'all') {
                await record.destroy();
                selectedInvRecordToRevoke = null;
              } else {
                const qty = parseInt(mode.replace('x', ''), 10);
                if (record.soLuong <= qty) {
                  await record.destroy();
                  selectedInvRecordToRevoke = null;
                } else {
                  record.soLuong -= qty;
                  await record.save();
                }
              }
            }
          }
        }

        const nextPayload = await buildPayload();
        await interaction.editReply(nextPayload);
      });

      collector.on('end', async (_, reason) => {
        try {
          if (reason === 'closed') {
            await interaction.editReply({
              content: '✅ **Đã đóng bảng thiên đạo.**',
              embeds: [],
              components: []
            });
          } else {
            await interaction.editReply({ components: [] });
          }
        } catch (_) {}
      });
    }
  };
}

const controller = new BoDieuKhienAdmin();
export const danhSachLenhAdmin = [controller.lenhAdmin, controller.lenhEdit];
export { controller as boDieuKhienAdmin };
