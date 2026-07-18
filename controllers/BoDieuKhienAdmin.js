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

export async function backupState(tuSi) {
  if (tuSi.originalStateJson) return;

  const { Inventory } = await import('../models/Inventory.js');
  const { Pet } = await import('../models/Pet.js');
  const { PlayerSkill } = await import('../models/PlayerSkill.js');

  const currentInvIds = (await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung } })).map(x => x.id);
  const currentPetIds = (await Pet.findAll({ where: { userId: tuSi.idNguoiDung } })).map(x => x.id);
  const currentSkillIds = (await PlayerSkill.findAll({ where: { idNguoiDung: tuSi.idNguoiDung } })).map(x => x.id);

  const backup = {
    stats: {
      capDo: tuSi.capDo,
      canhGioi: tuSi.canhGioi,
      tang: tuSi.tang,
      linhLuc: tuSi.linhLuc,
      linhThach: tuSi.linhThach,
      vnd: tuSi.vnd,
      theLuc: tuSi.theLuc,
      theLucMax: tuSi.theLucMax,
      hp: tuSi.hp,
      mp: tuSi.mp
    },
    inventoryIds: currentInvIds,
    petIds: currentPetIds,
    skillIds: currentSkillIds
  };

  tuSi.originalStateJson = JSON.stringify(backup);
  await tuSi.save();
}

export async function restoreState(tuSi) {
  if (!tuSi.originalStateJson) return false;

  const { Op } = await import('sequelize');
  const { Inventory } = await import('../models/Inventory.js');
  const { Pet } = await import('../models/Pet.js');
  const { PlayerSkill } = await import('../models/PlayerSkill.js');

  const backup = JSON.parse(tuSi.originalStateJson);

  // Restore stats
  tuSi.capDo = backup.stats.capDo;
  tuSi.canhGioi = backup.stats.canhGioi;
  tuSi.tang = backup.stats.tang;
  tuSi.linhLuc = backup.stats.linhLuc;
  tuSi.linhThach = backup.stats.linhThach;
  tuSi.vnd = backup.stats.vnd;
  tuSi.theLuc = backup.stats.theLuc;
  tuSi.theLucMax = backup.stats.theLucMax;
  tuSi.hp = backup.stats.hp;
  tuSi.mp = backup.stats.mp;

  // Clean items created during test
  await Inventory.destroy({
    where: {
      idNguoiDung: tuSi.idNguoiDung,
      id: { [Op.notIn]: backup.inventoryIds }
    }
  });

  // Clean pets created during test
  await Pet.destroy({
    where: {
      userId: tuSi.idNguoiDung,
      id: { [Op.notIn]: backup.petIds }
    }
  });

  // Clean skills created during test
  await PlayerSkill.destroy({
    where: {
      idNguoiDung: tuSi.idNguoiDung,
      id: { [Op.notIn]: backup.skillIds }
    }
  });

  tuSi.originalStateJson = null;
  await tuSi.save();
  return true;
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
      )
      .addUserOption(option => option.setName('target2').setDescription('Đạo hữu cần điều chỉnh 2').setRequired(false))
      .addUserOption(option => option.setName('target3').setDescription('Đạo hữu cần điều chỉnh 3').setRequired(false))
      .addUserOption(option => option.setName('target4').setDescription('Đạo hữu cần điều chỉnh 4').setRequired(false))
      .addUserOption(option => option.setName('target5').setDescription('Đạo hữu cần điều chỉnh 5').setRequired(false))
      .addUserOption(option => option.setName('target6').setDescription('Đạo hữu cần điều chỉnh 6').setRequired(false))
      .addUserOption(option => option.setName('target7').setDescription('Đạo hữu cần điều chỉnh 7').setRequired(false))
      .addUserOption(option => option.setName('target8').setDescription('Đạo hữu cần điều chỉnh 8').setRequired(false))
      .addUserOption(option => option.setName('target9').setDescription('Đạo hữu cần điều chỉnh 9').setRequired(false))
      .addUserOption(option => option.setName('target10').setDescription('Đạo hữu cần điều chỉnh 10').setRequired(false)),

    execute: async (interaction) => {
      if (interaction.user.username !== 'wiine5100') {
        return interaction.reply({
          content: '❌ **Vô pháp vô thiên!** Quyền hạn bất túc để sử dụng thiên đạo lệnh này!',
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const targetUsers = [];
      const targetOptionNames = ['target', 'target2', 'target3', 'target4', 'target5', 'target6', 'target7', 'target8', 'target9', 'target10'];
      for (const name of targetOptionNames) {
        const u = interaction.options.getUser(name);
        if (u) {
          if (!targetUsers.some(existing => existing.id === u.id)) {
            targetUsers.push(u);
          }
        }
      }

      const { TuSi } = await import('../models/TuSi.js');
      const { Inventory } = await import('../models/Inventory.js');
      const { Item } = await import('../models/Item.js');
      const config = await import('../config.js');

      const tuSiList = [];
      const invalidUsers = [];
      for (const user of targetUsers) {
        const ts = await TuSi.findOne({ where: { idNguoiDung: user.id } });
        if (!ts) {
          invalidUsers.push(user.username);
        } else {
          tuSiList.push(ts);
        }
      }

      if (invalidUsers.length > 0) {
        return interaction.editReply({
          content: `❌ Các đạo hữu sau chưa khởi đầu kiếp tu tiên (\`/start\`): **${invalidUsers.join(', ')}**.`
        });
      }

      let currentMenu = 'MAIN'; // 'MAIN', 'EDIT_STATS', 'GIFT_ITEM', 'REVOKE_ITEM'
      let selectedCategory = null;
      let selectedItemToGift = null;
      let selectedInvRecordToRevoke = null;
      let giftItemPage = 0;
      let revokeItemPage = 0;
      let statusMessage = null;

      const sendPublicLog = async (actionText) => {
        try {
          const targetsText = tuSiList.map(ts => `**${ts.ten}** (<@${ts.idNguoiDung}>)`).join(', ');
          await interaction.channel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('📢 Thiên Đạo Chi Chỉ')
                .setColor(0x9b59b6)
                .setDescription(`⚡ **Thiên đạo** vừa tác động lên tu sĩ ${targetsText}:\n→ *${actionText}*`)
                .setTimestamp()
            ]
          });
        } catch (_) {}
      };

      const parseSignedAmount = (str) => {
        if (!str) return null;
        const clean = str.trim().toLowerCase();

        const match = clean.match(/^([+-]?)\s*([\d.]+)\s*([kmb]?)$/);
        if (!match) return null;

        const sign = match[1];
        const numPart = parseFloat(match[2]);
        if (isNaN(numPart) || numPart < 0) return null;

        const suffix = match[3];
        let multiplier = 1;
        if (suffix === 'k') multiplier = 1000;
        else if (suffix === 'm') multiplier = 1000000;
        else if (suffix === 'b') multiplier = 1000000000;

        const finalValue = Math.floor(numPart * multiplier);
        return {
          value: finalValue,
          sign: sign || '+'
        };
      };

      // Helper to build Payload (Embed + ActionRows)
      const buildPayload = async () => {
        for (const ts of tuSiList) {
          await ts.reload();
        }

        const namesFooter = tuSiList.map(ts => ts.ten).join(', ');
        const embed = new EmbedBuilder()
          .setTimestamp()
          .setFooter({ text: `Đang thao tác trên: ${namesFooter.substring(0, 100)}` });

        const rows = [];

        if (currentMenu === 'MAIN') {
          let desc = '';
          if (tuSiList.length === 1) {
            const tuSi = tuSiList[0];
            desc = `• **Đạo hiệu**: **${tuSi.ten}**\n` +
                   `• **Cảnh giới**: \`${tuSi.canhGioi}\` (Cấp \`${tuSi.capDo}\`)\n` +
                   `• **Linh Lực**: \`${tuSi.linhLuc.toLocaleString()}\`\n` +
                   `• **Linh Thạch**: \`🪙 ${tuSi.linhThach.toLocaleString()}\`\n` +
                   `• **VND**: \`💵 ${tuSi.vnd.toLocaleString()}\`\n` +
                   `• **HP**: \`${tuSi.hp}\` | **MP**: \`${tuSi.mp}\`\n` +
                   `• **Quyền /test**: \`${tuSi.isTester ? '🟢 Đã Cấp' : '🔴 Chưa Cấp'}\`\n\n`;
          } else {
            desc = `• **Danh sách đạo hữu (${tuSiList.length})**:\n` +
                   tuSiList.map(ts => `  - **${ts.ten}** (<@${ts.idNguoiDung}>): \`${ts.canhGioi}\` (Linh Lực: \`${ts.linhLuc.toLocaleString()}\`, Linh Thạch: \`${ts.linhThach.toLocaleString()}\`)`).join('\n') + `\n\n`;
          }
          if (statusMessage) {
            desc = `🔔 **Thiên Đạo Báo**: ${statusMessage}\n\n` + desc;
          }
          const mainTitle = tuSiList.length === 1 ? `🛠️ Bảng Thiên Đạo Điều Phối — ${tuSiList[0].ten}` : `🛠️ Bảng Thiên Đạo Điều Phối (Hàng Loạt)`;
          embed.setTitle(mainTitle)
            .setColor(0x9b59b6)
            .setDescription(desc + `*Vui lòng sử dụng các nút tương tác bên dưới để chỉnh sửa.*`);

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('edit_btn_stats').setLabel('☯️ Chỉ Số / Tiền').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('edit_btn_gift').setLabel('🎁 Tặng Vật').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('edit_btn_revoke').setLabel('🗑️ Thu Hồi').setStyle(ButtonStyle.Danger).setDisabled(tuSiList.length > 1),
            new ButtonBuilder().setCustomId('edit_btn_boss').setLabel('👹 Cài Đặt Cự Thú').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('edit_btn_close').setLabel('❌ Đóng').setStyle(ButtonStyle.Secondary)
          );
          rows.push(row);

          const testBtnLabel = tuSiList.length === 1 && tuSiList[0].isTester ? '🧪 Thu Hồi Quyền /test' : '🧪 Cấp Quyền /test';
          const testBtnStyle = tuSiList.length === 1 && tuSiList[0].isTester ? ButtonStyle.Danger : ButtonStyle.Success;
          const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('edit_btn_toggle_test').setLabel(testBtnLabel).setStyle(testBtnStyle)
          );
          rows.push(row2);

        } else if (currentMenu === 'BOSS_SETTINGS') {
          const { CauHinhGuild } = await import('../models/CauHinhGuild.js');
          let guildConfig = await CauHinhGuild.findByPk(interaction.guildId);
          if (!guildConfig) {
            guildConfig = await CauHinhGuild.create({ idGuild: interaction.guildId });
          }

          let lastSpawnStr = 'Chưa triệu hồi lần nào';
          if (guildConfig.bossLastSpawnAt) {
            lastSpawnStr = new Date(guildConfig.bossLastSpawnAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
          }

          const spawnTypeDisplay = guildConfig.bossSpawnType === 'chu_ky' ? 'Chu kỳ (phút)' : 'Mốc giờ cố định';
          const spawnValDisplay = guildConfig.bossSpawnType === 'chu_ky' ? `Mỗi ${guildConfig.bossSpawnValue} phút` : guildConfig.bossSpawnValue;
          const rewardsDisplay = guildConfig.bossRewardsEnabled !== false ? '🟢 ĐANG BẬT' : '🔴 ĐANG TẮT';

          embed.setTitle(`👹 Cài Đặt Cự Thú & Hệ Thống 👹`)
            .setColor(0xe74c3c);
          let desc = `*Cấu hình tần suất hoặc thời gian tự động xuất hiện của Boss thế giới tại Server này.*\n\n` +
                     `• **Đạo Niên Hiện Tại**: \`Năm thứ ${guildConfig.layDaoNienHienTai()}\`\n` +
                     `• **Kiểu triệu hồi**: \`${spawnTypeDisplay}\`\n` +
                     `• **Giá trị cấu hình**: \`${spawnValDisplay}\`\n` +
                     `• **Lần triệu hồi cuối**: \`${lastSpawnStr}\`\n` +
                     `• **Phần thưởng Boss**: \`${rewardsDisplay}\`\n\n`;

          if (statusMessage) {
            desc = `🔔 **Thiên Đạo Báo**: ${statusMessage}\n\n` + desc;
          }
          embed.setDescription(desc);

          const rewardsBtnLabel = guildConfig.bossRewardsEnabled !== false ? '🎁 Quà Boss: BẬT' : '🎁 Quà Boss: TẮT';
          const rewardsBtnStyle = guildConfig.bossRewardsEnabled !== false ? ButtonStyle.Success : ButtonStyle.Danger;

          const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('edit_boss_set_cycle').setLabel('⏳ Chu Kỳ').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('edit_boss_set_hours').setLabel('⏰ Mốc Giờ').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('edit_boss_toggle_rewards').setLabel(rewardsBtnLabel).setStyle(rewardsBtnStyle),
            new ButtonBuilder().setCustomId('edit_boss_spawn_now').setLabel('👹 Gọi Boss').setStyle(ButtonStyle.Danger)
          );
          const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('edit_boss_reset_daonien').setLabel('⏳ Reset Đạo Niên').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('edit_boss_back').setLabel('🔙 Quay Lại').setStyle(ButtonStyle.Secondary)
          );
          rows.push(row1, row2);

        } else if (currentMenu === 'EDIT_STATS') {
          let desc = '';
          if (tuSiList.length === 1) {
            const tuSi = tuSiList[0];
            desc = `• **Linh Lực**: \`${tuSi.linhLuc.toLocaleString()}\`\n` +
                   `• **Linh Thạch**: \`🪙 ${tuSi.linhThach.toLocaleString()}\`\n` +
                   `• **VND**: \`💵 ${tuSi.vnd.toLocaleString()}\`\n` +
                   `• **Cảnh giới**: \`${tuSi.canhGioi}\` (Cấp \`${tuSi.capDo}\`)\n` +
                   `• **HP**: \`${tuSi.hp}\` | **MP**: \`${tuSi.mp}\``;
          } else {
            desc = `• **Danh sách đạo hữu (${tuSiList.length})**:\n` +
                   tuSiList.map(ts => `  - **${ts.ten}**: LL \`${ts.linhLuc.toLocaleString()}\` | LT \`${ts.linhThach.toLocaleString()}\` | VND \`${ts.vnd.toLocaleString()}\``).join('\n');
          }
          if (statusMessage) {
            desc = `🔔 **Thiên Đạo Báo**: ${statusMessage}\n\n` + desc;
          }
          const editTitle = tuSiList.length === 1 ? `☯️ Thiên Đạo Điều Chỉnh Chỉ Số — ${tuSiList[0].ten}` : `☯️ Thiên Đạo Điều Chỉnh Chỉ Số (Hàng Loạt)`;
          embed.setTitle(editTitle)
            .setColor(0xf1c40f)
            .setDescription(desc);

          const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('edit_stat_mod_ll').setLabel('☯️ Chỉnh Linh Lực').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('edit_stat_mod_lt').setLabel('🪙 Chỉnh Linh Thạch').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('edit_stat_mod_vnd').setLabel('💵 Chỉnh VND').setStyle(ButtonStyle.Danger)
          );

          const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('edit_stat_cg_p1').setLabel('Cảnh Giới +1 Cấp').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('edit_stat_cg_m1').setLabel('Cảnh Giới -1 Cấp').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('edit_stat_reset_hpmp').setLabel('Hồi Phục HP/MP').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('edit_stat_back').setLabel('🔙 Quay Lại').setStyle(ButtonStyle.Secondary)
          );

          rows.push(row1, row2);

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

          const giftTitle = tuSiList.length === 1 ? `🎁 Thiên Đạo Ban Tặng Vật Phẩm — ${tuSiList[0].ten}` : `🎁 Thiên Đạo Ban Tặng Vật Phẩm (Hàng Loạt)`;
          embed.setTitle(giftTitle)
            .setColor(0x2ecc71);
          let desc = `*Hãy chọn danh mục vật phẩm, chọn vật phẩm cụ thể và bấm số lượng tặng.*\n\n` +
                     `• Đang chọn tặng cho: ${tuSiList.map(ts => `**${ts.ten}**`).join(', ')}\n` +
                     `• Danh mục hiện tại: **${selectedCategory || 'Chưa chọn'}**\n` +
                     `• ${itemDetails}`;
          if (statusMessage) {
            desc = `🔔 **Thiên Đạo Báo**: ${statusMessage}\n\n` + desc;
          }
          embed.setDescription(desc);

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

            const matchedItems = config.ITEMS.filter(filterFunc);
            const ITEMS_PER_PAGE = 25;
            const totalGiftPages = Math.ceil(matchedItems.length / ITEMS_PER_PAGE);
            giftItemPage = Math.max(0, Math.min(giftItemPage, totalGiftPages - 1));

            const pageStart = matchedItems.length === 0 ? 0 : (giftItemPage * ITEMS_PER_PAGE) + 1;
            const pageEnd = Math.min(matchedItems.length, (giftItemPage + 1) * ITEMS_PER_PAGE);

            if (matchedItems.length > 0) {
              const slicedItems = matchedItems.slice(giftItemPage * ITEMS_PER_PAGE, (giftItemPage + 1) * ITEMS_PER_PAGE);
              const itemOptions = slicedItems.map(item => ({
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

              if (totalGiftPages > 1) {
                const paginationRow = new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId('edit_gift_prev')
                    .setLabel('◀ Trang trước')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(giftItemPage === 0),
                  new ButtonBuilder()
                    .setCustomId('edit_gift_indicator')
                    .setLabel(`Trang ${giftItemPage + 1}/${totalGiftPages} (${pageStart}-${pageEnd}/${matchedItems.length})`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                  new ButtonBuilder()
                    .setCustomId('edit_gift_next')
                    .setLabel('Trang sau ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(giftItemPage >= totalGiftPages - 1)
                );
                rows.push(paginationRow);
              }
            } else {
              embed.setDescription(embed.data.description + `\n⚠️ *Không tìm thấy vật phẩm nào trong danh mục này.*`);
            }
          }

          // Gift quantity buttons
          const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('edit_gift_x1').setLabel('Tặng x1').setStyle(ButtonStyle.Success).setDisabled(!selectedItemToGift),
            new ButtonBuilder().setCustomId('edit_gift_x10').setLabel('Tặng x10').setStyle(ButtonStyle.Success).setDisabled(!selectedItemToGift),
            new ButtonBuilder().setCustomId('edit_gift_x100').setLabel('Tặng x100').setStyle(ButtonStyle.Success).setDisabled(!selectedItemToGift),
            new ButtonBuilder().setCustomId('edit_gift_custom').setLabel('✏️ Nhập Số Lượng').setStyle(ButtonStyle.Primary).setDisabled(!selectedItemToGift),
            new ButtonBuilder().setCustomId('edit_gift_back').setLabel('🔙 Quay Lại').setStyle(ButtonStyle.Secondary)
          );
          rows.push(actionRow);

        } else if (currentMenu === 'REVOKE_ITEM') {
          const firstTuSi = tuSiList[0];
          // Load target inventory
          const freshInvList = await Inventory.findAll({ where: { idNguoiDung: firstTuSi.idNguoiDung } });
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

          embed.setTitle(`🗑️ Thiên Đạo Thu Hồi Vật Phẩm — ${firstTuSi.ten}`)
            .setColor(0xe74c3c);
          let desc = `*Hãy chọn một dòng vật phẩm trong balo của người chơi dưới đây và bấm số lượng thu hồi.*\n\n` +
                     `• ${invDetails}`;
          if (statusMessage) {
            desc = `🔔 **Thiên Đạo Báo**: ${statusMessage}\n\n` + desc;
          }
          embed.setDescription(desc);

          if (freshInvList.length > 0) {
            const ITEMS_PER_PAGE = 25;
            const totalRevokePages = Math.ceil(freshInvList.length / ITEMS_PER_PAGE);
            revokeItemPage = Math.max(0, Math.min(revokeItemPage, totalRevokePages - 1));

            const pageStart = (revokeItemPage * ITEMS_PER_PAGE) + 1;
            const pageEnd = Math.min(freshInvList.length, (revokeItemPage + 1) * ITEMS_PER_PAGE);

            const matchedOptions = [];
            const slicedList = freshInvList.slice(revokeItemPage * ITEMS_PER_PAGE, (revokeItemPage + 1) * ITEMS_PER_PAGE);
            for (const record of slicedList) {
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

            if (totalRevokePages > 1) {
              const paginationRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('edit_revoke_prev')
                  .setLabel('◀ Trang trước')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(revokeItemPage === 0),
                new ButtonBuilder()
                  .setCustomId('edit_revoke_indicator')
                  .setLabel(`Trang ${revokeItemPage + 1}/${totalRevokePages} (${pageStart}-${pageEnd}/${freshInvList.length})`)
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(true),
                new ButtonBuilder()
                  .setCustomId('edit_revoke_next')
                  .setLabel('Trang sau ▶')
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(revokeItemPage >= totalRevokePages - 1)
              );
              rows.push(paginationRow);
            }
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
        const customId = i.customId;

        if (['edit_stat_mod_ll', 'edit_stat_mod_lt', 'edit_stat_mod_vnd'].includes(customId)) {
          const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');

          let modalTitle = '';
          let labelText = '';
          if (customId === 'edit_stat_mod_ll') {
            modalTitle = '☯️ Điều Chỉnh Linh Lực';
            labelText = 'Cộng/Trừ Linh Lực (vd: +100M, -50M, 1B)';
          } else if (customId === 'edit_stat_mod_lt') {
            modalTitle = '🪙 Điều Chỉnh Linh Thạch';
            labelText = 'Cộng/Trừ Linh Thạch (vd: +1M, -500K, 10M)';
          } else if (customId === 'edit_stat_mod_vnd') {
            modalTitle = '💵 Điều Chỉnh VND';
            labelText = 'Cộng/Trừ VND (vd: +100K, -50K, 1M)';
          }

          const firstTuSi = tuSiList[0];
          const modal = new ModalBuilder()
            .setCustomId(`modal_${customId}_${firstTuSi.idNguoiDung}`)
            .setTitle(modalTitle);

          const amountInput = new TextInputBuilder()
            .setCustomId('amount_input')
            .setLabel(labelText.substring(0, 45))
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('Ví dụ: +100M hoặc -50M');

          modal.addComponents(new ActionRowBuilder().addComponents(amountInput));

          try {
            await i.showModal(modal);

            const submitted = await i.awaitModalSubmit({
              filter: submitInteraction => submitInteraction.customId === `modal_${customId}_${firstTuSi.idNguoiDung}` && submitInteraction.user.id === interaction.user.id,
              time: 60000
            });

            await submitted.deferUpdate();

            const rawVal = submitted.fields.getTextInputValue('amount_input');
            const parsed = parseSignedAmount(rawVal);
            if (!parsed) {
              statusMessage = `❌ Định dạng số lượng nhập không hợp lệ: "${rawVal}"`;
            } else {
              const { value, sign } = parsed;
              for (const tuSi of tuSiList) {
                if (customId === 'edit_stat_mod_ll') {
                  if (sign === '+') {
                    tuSi.linhLuc += value;
                  } else {
                    tuSi.linhLuc = Math.max(0, Number(tuSi.linhLuc) - value);
                  }
                } else if (customId === 'edit_stat_mod_lt') {
                  if (sign === '+') {
                    tuSi.linhThach += value;
                  } else {
                    tuSi.linhThach = Math.max(0, Number(tuSi.linhThach) - value);
                  }
                } else if (customId === 'edit_stat_mod_vnd') {
                  if (sign === '+') {
                    tuSi.vnd += value;
                  } else {
                    tuSi.vnd = Math.max(0, Number(tuSi.vnd) - value);
                  }
                }
                await tuSi.save();
              }

              if (customId === 'edit_stat_mod_ll') {
                statusMessage = sign === '+' ? `✅ Đã cộng **${value.toLocaleString()} Linh Lực** cho tất cả!` : `✅ Đã trừ **${value.toLocaleString()} Linh Lực** của tất cả!`;
                await sendPublicLog(`${sign === '+' ? 'Cộng' : 'Khấu trừ'} ${value.toLocaleString()} Linh Lực`);
              } else if (customId === 'edit_stat_mod_lt') {
                statusMessage = sign === '+' ? `✅ Đã cộng **${value.toLocaleString()} Linh Thạch** cho tất cả!` : `✅ Đã trừ **${value.toLocaleString()} Linh Thạch** của tất cả!`;
                await sendPublicLog(`${sign === '+' ? 'Cộng' : 'Khấu trừ'} ${value.toLocaleString()} Linh Thạch`);
              } else if (customId === 'edit_stat_mod_vnd') {
                statusMessage = sign === '+' ? `✅ Đã cộng **${value.toLocaleString()} VND** cho tất cả!` : `✅ Đã trừ **${value.toLocaleString()} VND** của tất cả!`;
                await sendPublicLog(`${sign === '+' ? 'Cộng' : 'Khấu trừ'} ${value.toLocaleString()} VND`);
              }
            }

            const nextPayload = await buildPayload();
            await interaction.editReply(nextPayload);
          } catch (err) {
            // modal submit timeout/cancel
          }
          return;
        }

        if (customId === 'edit_boss_set_cycle') {
          const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');
          const modal = new ModalBuilder()
            .setCustomId(`modal_boss_cycle_${interaction.guildId}`)
            .setTitle('⏳ Cấu Hình Chu Kỳ Cự Thú');

          const input = new TextInputBuilder()
            .setCustomId('cycle_input')
            .setLabel('Nhập số phút chu kỳ (ví dụ: 60, 120)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('Nhập số phút chu kỳ...');

          modal.addComponents(new ActionRowBuilder().addComponents(input));

          try {
            await i.showModal(modal);

            const submitted = await i.awaitModalSubmit({
              filter: submitInteraction => submitInteraction.customId === `modal_boss_cycle_${interaction.guildId}` && submitInteraction.user.id === interaction.user.id,
              time: 60000
            });

            await submitted.deferUpdate();

            const rawVal = submitted.fields.getTextInputValue('cycle_input');
            const minutes = parseInt(rawVal.trim(), 10);
            if (isNaN(minutes) || minutes <= 0) {
              statusMessage = `❌ Số phút nhập không hợp lệ: "${rawVal}"`;
            } else {
              const { CauHinhGuild } = await import('../models/CauHinhGuild.js');
              let guildConfig = await CauHinhGuild.findByPk(interaction.guildId);
              if (!guildConfig) {
                guildConfig = await CauHinhGuild.create({ idGuild: interaction.guildId });
              }
              guildConfig.bossSpawnType = 'chu_ky';
              guildConfig.bossSpawnValue = String(minutes);
              await guildConfig.save();
              statusMessage = `✅ Cập nhật chu kỳ triệu hồi cự thú: **Mỗi ${minutes} phút**!`;
            }

            const nextPayload = await buildPayload();
            await interaction.editReply(nextPayload);
          } catch (err) {
            // modal submit timeout/cancel
          }
          return;
        }

        if (customId === 'edit_boss_set_hours') {
          const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');
          const modal = new ModalBuilder()
            .setCustomId(`modal_boss_hours_${interaction.guildId}`)
            .setTitle('⏰ Cấu Hình Mốc Giờ Cố Định');

          const input = new TextInputBuilder()
            .setCustomId('hours_input')
            .setLabel('Mốc giờ (tối đa 10, vd: 06:00,12:00)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('Nhập tối đa 10 mốc giờ, cách nhau bằng dấu phẩy');

          modal.addComponents(new ActionRowBuilder().addComponents(input));

          try {
            await i.showModal(modal);

            const submitted = await i.awaitModalSubmit({
              filter: submitInteraction => submitInteraction.customId === `modal_boss_hours_${interaction.guildId}` && submitInteraction.user.id === interaction.user.id,
              time: 60000
            });

            await submitted.deferUpdate();

            const rawVal = submitted.fields.getTextInputValue('hours_input');
            const parts = rawVal.split(',')
              .map(t => t.trim())
              .filter(Boolean);

            const invalidParts = parts.filter(t => !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(t));
            if (parts.length > 10) {
              statusMessage = `❌ Vượt quá giới hạn 10 mốc giờ (hiện tại: ${parts.length} mốc).`;
            } else if (invalidParts.length > 0) {
              statusMessage = `❌ Mốc giờ không hợp lệ: "${invalidParts.join(', ')}" (phải đúng định dạng HH:MM, ví dụ: 06:00).`;
            } else if (parts.length === 0) {
              statusMessage = `❌ Vui lòng nhập ít nhất 1 mốc giờ hợp lệ.`;
            } else {
              const { CauHinhGuild } = await import('../models/CauHinhGuild.js');
              let guildConfig = await CauHinhGuild.findByPk(interaction.guildId);
              if (!guildConfig) {
                guildConfig = await CauHinhGuild.create({ idGuild: interaction.guildId });
              }
              guildConfig.bossSpawnType = 'moc_gio';
              guildConfig.bossSpawnValue = parts.join(',');
              await guildConfig.save();
              statusMessage = `✅ Cập nhật mốc giờ triệu hồi cự thú: **${parts.join(', ')}**!`;
            }

            const nextPayload = await buildPayload();
            await interaction.editReply(nextPayload);
          } catch (err) {
            // modal submit timeout/cancel
          }
          return;
        }

        // ── Nhập số lượng tặng tuỳ chọn (phải đứng trước deferUpdate) ──
        if (customId === 'edit_gift_custom') {
          if (!selectedItemToGift) {
            // Không có vật phẩm được chọn — deferUpdate rồi báo lỗi
            try { await i.deferUpdate(); } catch (_) { return; }
            statusMessage = `❌ Hãy chọn vật phẩm trước khi nhập số lượng.`;
            const nextPayload = await buildPayload();
            await interaction.editReply(nextPayload);
            return;
          }

          const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');
          const configItem = config.ITEMS.find(item => item.id === selectedItemToGift);
          const nameText = configItem ? configItem.ten : selectedItemToGift;

          const modal = new ModalBuilder()
            .setCustomId(`modal_gift_custom_${interaction.user.id}`)
            .setTitle(`🎁 Tặng Vật Phẩm: ${nameText.substring(0, 40)}`);

          const qtyInput = new TextInputBuilder()
            .setCustomId('gift_qty_input')
            .setLabel('Số lượng cần tặng (vd: 100, 1k, 5m)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('Nhập số lượng... (vd: 50, 500, 1000)');

          modal.addComponents(new ActionRowBuilder().addComponents(qtyInput));

          try {
            await i.showModal(modal);

            const submitted = await i.awaitModalSubmit({
              filter: sub => sub.customId === `modal_gift_custom_${interaction.user.id}` && sub.user.id === interaction.user.id,
              time: 60000
            });

            await submitted.deferUpdate();

            const rawVal = submitted.fields.getTextInputValue('gift_qty_input');
            const match = rawVal.trim().toLowerCase().match(/^([\d.]+)\s*([kmb]?)$/);
            if (!match) {
              statusMessage = `❌ Định dạng số lượng không hợp lệ: "${rawVal}"`;
            } else {
              const numPart = parseFloat(match[1]);
              const suffix = match[2];
              let multiplier = 1;
              if (suffix === 'k') multiplier = 1000;
              else if (suffix === 'm') multiplier = 1000000;
              else if (suffix === 'b') multiplier = 1000000000;
              const qty = Math.floor(numPart * multiplier);

              if (isNaN(qty) || qty <= 0) {
                statusMessage = `❌ Số lượng phải là số dương hợp lệ.`;
              } else {
                for (const tuSi of tuSiList) {
                  await Inventory.addVatPham(tuSi.idNguoiDung, selectedItemToGift, qty);
                }
                statusMessage = `🎁 Đã tặng thành công **x${qty.toLocaleString()} ${nameText}** cho tất cả!`;
                await sendPublicLog(`Tặng x${qty.toLocaleString()} ${nameText}`);
                selectedItemToGift = null;
              }
            }

            const nextPayload = await buildPayload();
            await interaction.editReply(nextPayload);
          } catch (err) {
            // modal submit timeout/cancel
          }
          return;
        }

        try {
          await i.deferUpdate();
        } catch (_) {
          return;
        }

        // Navigation
        if (customId === 'edit_btn_stats') {
          currentMenu = 'EDIT_STATS';
        } else if (customId === 'edit_btn_gift') {
          currentMenu = 'GIFT_ITEM';
          selectedCategory = null;
          selectedItemToGift = null;
          giftItemPage = 0;
        } else if (customId === 'edit_btn_revoke') {
          currentMenu = 'REVOKE_ITEM';
          selectedInvRecordToRevoke = null;
          revokeItemPage = 0;
        } else if (customId === 'edit_btn_boss') {
          currentMenu = 'BOSS_SETTINGS';
          statusMessage = null;
        } else if (customId === 'edit_btn_toggle_test') {
          try {
            for (const ts of tuSiList) {
              ts.isTester = !ts.isTester;
              await ts.save();
            }
            statusMessage = `🧪 Đã cập nhật trạng thái quyền thử nghiệm (/test) thành công!`;
          } catch (err) {
            console.error('[Admin Edit] Lỗi khi đổi quyền test:', err);
            statusMessage = `❌ Lỗi khi cập nhật quyền thử nghiệm.`;
          }
        } else if (customId === 'edit_boss_toggle_rewards') {
          try {
            const { CauHinhGuild } = await import('../models/CauHinhGuild.js');
            let guildConfig = await CauHinhGuild.findByPk(interaction.guildId);
            if (!guildConfig) {
              guildConfig = await CauHinhGuild.create({ idGuild: interaction.guildId });
            }
            guildConfig.bossRewardsEnabled = guildConfig.bossRewardsEnabled === false;
            await guildConfig.save();
            statusMessage = `✅ Đã ${guildConfig.bossRewardsEnabled ? 'BẬT' : 'TẮT'} phần thưởng Cự Thú thế giới cho Server này!`;
          } catch (err) {
            console.error('[Admin Edit] Lỗi toggle boss rewards:', err);
            statusMessage = `❌ Lỗi khi thay đổi cấu hình phần thưởng Boss.`;
          }
        } else if (customId === 'edit_boss_spawn_now') {
          try {
            const { boDieuKhienBoss } = await import('./BoDieuKhienBoss.js');
            const { WorldBoss } = await import('../models/WorldBoss.js');

            // Tính lại chỉ số boss từ dữ liệu người chơi hiện tại trước khi spawn
            await boDieuKhienBoss.tinhVaLuuChiSoBoss(interaction.guildId);

            // Spawn từng realm riêng — chỉ skip realm nào đang còn boss sống
            const realms = ['Luyện Khí', 'Trúc Cơ', 'Kim Đan'];
            const spawned = [];
            const skipped = [];
            for (const realm of realms) {
              const hasActive = await WorldBoss.findOne({ where: { idGuild: interaction.guildId, realm, active: true } });
              if (hasActive && new Date(hasActive.hetHan) > new Date()) {
                skipped.push(`${realm} (\`${hasActive.ten}\`)`);
              } else {
                await boDieuKhienBoss.trieuHoiWorldBossTuDong(interaction.client, interaction.guildId, interaction.guild, realm);
                spawned.push(realm);
              }
            }
            const spawnedMsg = spawned.length > 0 ? `✅ Đã triệu hồi: **${spawned.join(', ')}**` : '';
            const skippedMsg = skipped.length > 0 ? `\n⚠️ Đang có boss: ${skipped.join(', ')}` : '';
            statusMessage = `👹 ${spawnedMsg}${skippedMsg}`;
          } catch (spawnErr) {
            console.error('[Admin Command] Lỗi triệu hồi boss:', spawnErr);
            statusMessage = `❌ Thao tác triệu hồi gặp lỗi linh lực bất túc.`;
          }

        } else if (customId === 'edit_boss_reset_daonien') {
          try {
            const { CauHinhGuild } = await import('../models/CauHinhGuild.js');
            let guildConfig = await CauHinhGuild.findByPk(interaction.guildId);
            if (!guildConfig) {
              guildConfig = await CauHinhGuild.create({ idGuild: interaction.guildId });
            }
            guildConfig.ngayKhoiTao = new Date();
            await guildConfig.save();
            statusMessage = `⏳ Đã khôi phục Đạo Niên của máy chủ về năm thứ 1!`;
            await sendPublicLog(`Khôi phục Đạo Niên của máy chủ về năm thứ 1`);
          } catch (resetErr) {
            console.error('[Admin Command] Lỗi reset Đạo Niên:', resetErr);
            statusMessage = `❌ Lỗi khi thiết lập lại Đạo Niên.`;
          }
        } else if (customId === 'edit_btn_close') {
          collector.stop('closed');
          return;
        } else if (['edit_stat_back', 'edit_gift_back', 'edit_revoke_back', 'edit_boss_back'].includes(customId)) {
          currentMenu = 'MAIN';
        } else if (customId === 'edit_gift_prev') {
          giftItemPage = Math.max(0, giftItemPage - 1);
        } else if (customId === 'edit_gift_next') {
          giftItemPage = giftItemPage + 1;
        } else if (customId === 'edit_revoke_prev') {
          revokeItemPage = Math.max(0, revokeItemPage - 1);
        } else if (customId === 'edit_revoke_next') {
          revokeItemPage = revokeItemPage + 1;
        }

        // Stats editing operations
        else if (customId === 'edit_stat_reset_hpmp') {
          for (const tuSi of tuSiList) {
            const stats = await tuSi.layChiSoDayDu();
            tuSi.hp = stats.max_hp;
            tuSi.mp = stats.max_mp;
            await tuSi.save();
          }
          statusMessage = '✅ Đã hồi phục đầy HP/MP cho tất cả!';
          await sendPublicLog('Khôi phục toàn bộ trạng thái HP/MP');
        } else if (customId === 'edit_stat_cg_p1') {
          for (const tuSi of tuSiList) {
            tuSi.capDo = Math.min(31, tuSi.capDo + 1);
            const cg = config.layThongTinCanhGioi(tuSi.capDo);
            tuSi.canhGioi = `${cg.realmName} - ${cg.stageName}`;
            await tuSi.save();
          }
          statusMessage = `✅ Đã tăng cảnh giới lên 1 cấp cho tất cả!`;
          await sendPublicLog(`Tăng cảnh giới lên 1 cấp`);
        } else if (customId === 'edit_stat_cg_m1') {
          for (const tuSi of tuSiList) {
            tuSi.capDo = Math.max(1, tuSi.capDo - 1);
            const cg = config.layThongTinCanhGioi(tuSi.capDo);
            tuSi.canhGioi = `${cg.realmName} - ${cg.stageName}`;
            await tuSi.save();
          }
          statusMessage = `✅ Đã giảm cảnh giới xuống 1 cấp cho tất cả!`;
          await sendPublicLog(`Hạ cảnh giới xuống 1 cấp`);
        }

        // Gift operations
        else if (customId === 'edit_gift_cat_select') {
          selectedCategory = i.values[0];
          selectedItemToGift = null;
          giftItemPage = 0;
        } else if (customId === 'edit_gift_item_select') {
          selectedItemToGift = i.values[0];
        } else if (customId.startsWith('edit_gift_x')) {
          const qty = parseInt(customId.replace('edit_gift_x', ''), 10);
          if (selectedItemToGift) {
            const configItem = config.ITEMS.find(item => item.id === selectedItemToGift);
            const nameText = configItem ? configItem.ten : selectedItemToGift;
            for (const tuSi of tuSiList) {
              await Inventory.addVatPham(tuSi.idNguoiDung, selectedItemToGift, qty);
            }
            statusMessage = `🎁 Đã tặng thành công **x${qty} ${nameText}** cho tất cả!`;
            await sendPublicLog(`Tặng x${qty} ${nameText}`);
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
              const configItem = config.ITEMS.find(item => item.id === record.itemId);
              const nameText = configItem ? configItem.ten : record.itemId;
              if (mode === 'all') {
                const oldQty = record.soLuong;
                await record.destroy();
                statusMessage = `🗑️ Đã thu hồi toàn bộ **x${oldQty} ${nameText}**!`;
                await sendPublicLog(`Thu hồi toàn bộ x${oldQty} ${nameText}`);
                selectedInvRecordToRevoke = null;
              } else {
                const qty = parseInt(mode.replace('x', ''), 10);
                if (record.soLuong <= qty) {
                  const oldQty = record.soLuong;
                  await record.destroy();
                  statusMessage = `🗑️ Đã thu hồi toàn bộ **x${oldQty} ${nameText}**!`;
                  await sendPublicLog(`Thu hồi toàn bộ x${oldQty} ${nameText}`);
                  selectedInvRecordToRevoke = null;
                } else {
                  record.soLuong -= qty;
                  await record.save();
                  statusMessage = `🗑️ Đã thu hồi **x${qty} ${nameText}**! (Còn lại x${record.soLuong})`;
                  await sendPublicLog(`Thu hồi x${qty} ${nameText}`);
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

  lenhTb = {
    data: new SlashCommandBuilder()
      .setName('tb')
      .setDescription('Gửi thông báo đến kênh 📢┃ᴛʜôɴɢ-ʙáᴏ (Chỉ dành cho wiine5100)'),

    execute: async (interaction) => {
      if (interaction.user.username !== 'wiine5100') {
        return interaction.reply({
          content: '❌ **Vô pháp vô thiên!** Quyền hạn bất túc để sử dụng thiên đạo lệnh này!',
          ephemeral: true
        });
      }

      const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');

      const modal = new ModalBuilder()
        .setCustomId('tb_modal')
        .setTitle('Gửi Thông Báo Tiên Giới');

      const contentInput = new TextInputBuilder()
        .setCustomId('tb_content')
        .setLabel('Nội dung thông báo')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Nhập nội dung thông báo tại đây...')
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(contentInput);
      modal.addComponents(firstActionRow);

      await interaction.showModal(modal);
    }
  };

  async handleTbModalSubmit(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (interaction.user.username !== 'wiine5100') {
      return interaction.editReply({
        content: '❌ **Vô pháp vô thiên!** Quyền hạn bất túc để sử dụng thiên đạo lệnh này!'
      });
    }

    const content = interaction.fields.getTextInputValue('tb_content');
    if (!content) {
      return interaction.editReply({
        content: '❌ Nội dung thông báo không được để trống!'
      });
    }

    const guild = interaction.guild;
    if (!guild) {
      return interaction.editReply({
        content: '❌ Lệnh này chỉ có thể thực hiện trong máy chủ!'
      });
    }

    const channels = await guild.channels.fetch().catch(() => null);
    if (!channels) {
      return interaction.editReply({
        content: '❌ Không thể truy xuất danh sách kênh của máy chủ!'
      });
    }

    const tbChannel = channels.find(ch => {
      if (!ch || !ch.isTextBased() || !ch.name) return false;
      const name = ch.name.toLowerCase();
      const normalized = name
        .replace(/ᴛ/g, 't')
        .replace(/ʜ/g, 'h')
        .replace(/ô/g, 'o')
        .replace(/n/g, 'n') // Đề phòng
        .replace(/ɴ/g, 'n')
        .replace(/ɢ/g, 'g')
        .replace(/ʙ/g, 'b')
        .replace(/á/g, 'a')
        .replace(/ᴏ/g, 'o')
        .replace(/[^a-z0-9]/g, '');
      return normalized === 'thongbao' || name.includes('thong-bao') || name.includes('thông-báo') || name === '📢┃ᴛʜôɴɢ-ʙáᴏ';
    });

    if (!tbChannel) {
      return interaction.editReply({
        content: '❌ Không tìm thấy kênh thông báo `📢┃ᴛʜôɴɢ-ʙáᴏ`!'
      });
    }

    const MAX_LENGTH = 1900;
    const chunks = [];
    
    if (content.length <= MAX_LENGTH) {
      chunks.push(content);
    } else {
      let temp = content;
      while (temp.length > 0) {
        if (temp.length <= MAX_LENGTH) {
          chunks.push(temp);
          break;
        }
        
        let cutIndex = temp.lastIndexOf('\n', MAX_LENGTH);
        if (cutIndex === -1 || cutIndex < MAX_LENGTH * 0.7) {
          cutIndex = temp.lastIndexOf(' ', MAX_LENGTH);
        }
        if (cutIndex === -1 || cutIndex < MAX_LENGTH * 0.7) {
          cutIndex = MAX_LENGTH;
        }

        chunks.push(temp.substring(0, cutIndex).trim());
        temp = temp.substring(cutIndex).trim();
      }
    }

    try {
      for (const chunk of chunks) {
        await tbChannel.send(chunk);
      }
      return interaction.editReply({
        content: `✅ Đã gửi thông báo thành công lên kênh ${tbChannel} (${chunks.length} tin nhắn).`
      });
    } catch (err) {
      console.error('Lỗi khi gửi thông báo:', err);
      return interaction.editReply({
        content: `❌ Lỗi khi gửi thông báo lên kênh: ${err.message}`
      });
    }
  }

  lenhTest = {
    data: new SlashCommandBuilder()
      .setName('test')
      .setDescription('Bảng điều khiển thử nghiệm nhanh (Chỉ dành cho Tester)'),

    execute: async (interaction) => {
      const { TuSi } = await import('../models/TuSi.js');
      const tuSi = await TuSi.findOne({ where: { idNguoiDung: interaction.user.id } });
      if (!tuSi) {
        return interaction.reply({
          content: '❌ Đạo hữu chưa khởi đầu kiếp tu tiên. Hãy gõ `/start` trước.',
          ephemeral: true
        });
      }

      if (interaction.user.username !== 'wiine5100' && !tuSi.isTester) {
        return interaction.reply({
          content: '❌ Quyền hạn bất túc! Chỉ những Tester được Admin cấp quyền mới được dùng.',
          ephemeral: true
        });
      }

      await backupState(tuSi);

      await interaction.deferReply({ ephemeral: true });

      const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = await import('discord.js');
      const { Inventory } = await import('../models/Inventory.js');
      const { Pet } = await import('../models/Pet.js');
      const { PlayerSkill } = await import('../models/PlayerSkill.js');
      const { Skill } = await import('../models/Skill.js');
      const config = await import('../config.js');

      let statusMsg = '';
      let showRealmMenu = false;
      let showItemMenu = false;
      let selectedItemCategory = null;
      let selectedItemToTest = null;
      let itemTestPage = 0;

      const buildPayload = () => {
        if (showRealmMenu) {
          const embed = new EmbedBuilder()
            .setTitle('🎒 Chọn Cảnh Giới Nhận Nguyên Liệu Rèn 🎒')
            .setColor(0xe67e22)
            .setDescription(
              (statusMsg ? `🔔 **Thiên Đạo Báo**: ${statusMsg}\n\n` : '') +
              `Chọn cảnh giới dưới đây để nhận **x99 nguyên liệu rèn đúc** của cảnh giới đó thuộc **mọi phẩm chất** (Phế Phẩm, Thường, Hiếm, Sử Thi, Thần Thoại):`
            );

          const selectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('test_sel_realm_mats')
              .setPlaceholder('Chọn cảnh giới để nhận nguyên liệu...')
              .addOptions([
                { label: '🟢 Luyện Khí (Realm 1)', value: 'realm_1' },
                { label: '🔵 Trúc Cơ (Realm 2)', value: 'realm_2' },
                { label: '🟣 Kim Đan (Realm 3)', value: 'realm_3' },
                { label: '🟡 Nguyên Anh (Realm 4)', value: 'realm_4' },
                { label: '🔴 Hóa Thần (Realm 5)', value: 'realm_5' }
              ])
          );

          const backRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('test_btn_realm_back').setLabel('🔙 Quay Lại').setStyle(ButtonStyle.Secondary)
          );

          return { embeds: [embed], components: [selectRow, backRow] };
        }

        if (showItemMenu) {
          let itemDetails = '_Chưa chọn vật phẩm để nhận._';
          if (selectedItemToTest) {
            const configItem = config.ITEMS.find(item => item.id === selectedItemToTest);
            if (configItem) {
              itemDetails = `**Vật phẩm đang chọn**: ${configItem.emoji || '📦'} **${configItem.ten}**\n` +
                            `• Loại: \`${configItem.loai}\` | Độ hiếm: \`${configItem.doHiem}\`\n` +
                            `• Mô tả: *${configItem.moTa || 'Không có'}*`;
            }
          }

          const embed = new EmbedBuilder()
            .setTitle('📦 Chọn Vật Phẩm Thử Nghiệm Tự Chọn 📦')
            .setColor(0xe67e22)
            .setDescription(
              (statusMsg ? `🔔 **Thiên Đạo Báo**: ${statusMsg}\n\n` : '') +
              `*Hãy chọn danh mục, vật phẩm cụ thể và số lượng cần nhận. Tất cả vật phẩm nhận được ở đây chỉ là tạm thời và sẽ bị thu hồi khi gõ \`/endtest\`.*\n\n` +
              `• Danh mục hiện tại: **${selectedItemCategory || 'Chưa chọn'}**\n` +
              `• ${itemDetails}`
            );

          const rws = [];
          
          // Row 1: Select Category
          const catSelect = new StringSelectMenuBuilder()
            .setCustomId('test_gift_cat_select')
            .setPlaceholder('Chọn danh mục vật phẩm...')
            .addOptions([
              { label: '💊 Đan dược', value: 'Đan dược' },
              { label: '🌱 Linh thảo & Trứng', value: 'Linh thảo' },
              { label: '🗡️ Trang bị (Vũ khí/Giáp/Bội)', value: 'Trang bi' },
              { label: '🔮 Cổ bảo & Pháp bảo', value: 'Phap bao' },
              { label: '🏺 Chí bảo', value: 'Chí bảo' },
              { label: '🎭 Trang phục (Skin)', value: 'Skin' }
            ]);
          rws.push(new ActionRowBuilder().addComponents(catSelect));

          // Row 2: Select Item if category is selected
          if (selectedItemCategory) {
            let filterFunc = item => item.loai === selectedItemCategory;
            if (selectedItemCategory === 'Trang bi') {
              filterFunc = item => ['Vũ khí', 'Giáp', 'Ngọc Bội'].includes(item.loai);
            } else if (selectedItemCategory === 'Phap bao') {
              filterFunc = item => ['Cổ Bảo Chủ Động', 'Pháp Bảo'].includes(item.loai);
            }

            const matchedItems = config.ITEMS.filter(filterFunc);
            const ITEMS_PER_PAGE = 25;
            const totalTestPages = Math.ceil(matchedItems.length / ITEMS_PER_PAGE);
            itemTestPage = Math.max(0, Math.min(itemTestPage, totalTestPages - 1));

            const pageStart = matchedItems.length === 0 ? 0 : (itemTestPage * ITEMS_PER_PAGE) + 1;
            const pageEnd = Math.min(matchedItems.length, (itemTestPage + 1) * ITEMS_PER_PAGE);

            if (matchedItems.length > 0) {
              const slicedItems = matchedItems.slice(itemTestPage * ITEMS_PER_PAGE, (itemTestPage + 1) * ITEMS_PER_PAGE);
              const itemOptions = slicedItems.map(item => ({
                label: item.ten.substring(0, 50),
                value: item.id,
                description: `${item.loai} | ${item.doHiem} | ID: ${item.id}`.substring(0, 100)
              }));

              const itemSelect = new StringSelectMenuBuilder()
                .setCustomId('test_gift_item_select')
                .setPlaceholder('Chọn vật phẩm cụ thể...')
                .addOptions(itemOptions);
              rws.push(new ActionRowBuilder().addComponents(itemSelect));

              if (totalTestPages > 1) {
                const paginationRow = new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId('test_gift_prev')
                    .setLabel('◀ Trang trước')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(itemTestPage === 0),
                  new ButtonBuilder()
                    .setCustomId('test_gift_indicator')
                    .setLabel(`Trang ${itemTestPage + 1}/${totalTestPages} (${pageStart}-${pageEnd}/${matchedItems.length})`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                  new ButtonBuilder()
                    .setCustomId('test_gift_next')
                    .setLabel('Trang sau ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(itemTestPage >= totalTestPages - 1)
                );
                rws.push(paginationRow);
              }
            } else {
              embed.setDescription(embed.data.description + `\n⚠️ *Không tìm thấy vật phẩm nào trong danh mục này.*`);
            }
          }

          // Row 3: Action Buttons
          const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('test_gift_x1').setLabel('Nhận x1').setStyle(ButtonStyle.Success).setDisabled(!selectedItemToTest),
            new ButtonBuilder().setCustomId('test_gift_x10').setLabel('Nhận x10').setStyle(ButtonStyle.Success).setDisabled(!selectedItemToTest),
            new ButtonBuilder().setCustomId('test_gift_x100').setLabel('Nhận x100').setStyle(ButtonStyle.Success).setDisabled(!selectedItemToTest),
            new ButtonBuilder().setCustomId('test_gift_custom').setLabel('✏️ Nhập Số Lượng').setStyle(ButtonStyle.Primary).setDisabled(!selectedItemToTest),
            new ButtonBuilder().setCustomId('test_btn_item_back').setLabel('🔙 Quay Lại').setStyle(ButtonStyle.Secondary)
          );
          rws.push(actionRow);

          return { embeds: [embed], components: rws };
        }

        const embed = new EmbedBuilder()
          .setTitle('🧪 Thiên Đạo Thử Nghiệm (Tester Panel) 🧪')
          .setColor(0xe67e22)
          .setDescription(
            (statusMsg ? `🔔 **Thiên Đạo Báo**: ${statusMsg}\n\n` : '') +
            `Chào mừng đạo hữu **${tuSi.ten}** đến với bảng thử nghiệm nhanh.\n` +
            `*Lưu ý: Các chỉ số và vật phẩm test chỉ là tạm thời, khi người chơi dùng lệnh \`/endtest\` thì sẽ phục hồi chỉ số và hiện trạng tài khoản chính.*\n\n` +
            `Hãy chọn gói thử nghiệm dưới đây:`
          );

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('test_btn_maxout').setLabel('⚡ Max Tài Nguyên').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('test_btn_items').setLabel('⚔️ Tiên Binh Thần Thoại').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('test_btn_pet').setLabel('🐉 Thần Thú Cấp 100').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('test_btn_skills').setLabel('📚 Đầy Thần Thông').setStyle(ButtonStyle.Primary)
        );
        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('test_btn_realm_mats').setLabel('🎒 NL Rèn Theo Cảnh').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('test_btn_materials').setLabel('🧪 Đan Dược/Hạt Giống').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('test_btn_quick_auto').setLabel('🌾 Nhận X Giờ Auto').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('test_btn_quick_cultivate').setLabel('✨ Nhận X Giờ Tu Luyện').setStyle(ButtonStyle.Success)
        );
        const row3 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('test_btn_custom_item').setLabel('📦 Nhận Item Tự Chọn').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('test_btn_close').setLabel('❌ Đóng').setStyle(ButtonStyle.Secondary)
        );

        return { embeds: [embed], components: [row1, row2, row3] };
      };


      const response = await interaction.editReply(buildPayload());

      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 300000 // 5 minutes
      });

      collector.on('collect', async i => {
        const customId = i.customId;

        if (customId === 'test_sel_realm_mats') {
          try {
            await i.deferUpdate();
            const realmNum = i.values[0].replace('realm_', '');
            const realmMats = {
              '1': ['so_cap_thiet_quang', 'tho_linh_dan_ty', 'linh_khi_toai_thach', 'nham_hoa_tinh_hoa', 'sat_danh_moc', 'kien_thach_tam', 'thiet_dang_man', 'linh_tuyen_thuy', 'yeu_thu_huyet'],
              '2': ['huyen_thiet_tinh_sa', 'luc_ngoc_thach', 'am_duong_dong_chuong', 'dia_xich_linh_chi', 'bich_hai_bang_tinh', 'cuu_thien_tu_cat', 'dia_hoa_chi_tinh', 'khon_tien_dang_moc', 'thanh_vu_linh_sa'],
              '3': ['huyen_thiet_van_nam', 'Thien_Tam_Linh_ty', 'hon_tinh_huyet_nguyet', 'cuc_duong_hoa_thach', 'loi_tri_bang_tinh', 'Hau_tho_chi_loi', 'u_minh_te_truc', 'sinh_sinh_tao_hoa_dich', 'tinh_khong_luu_sa'],
              '4': ['nguyen_lieu_nguyen_anh'],
              '5': ['nguyen_lieu_hoa_than']
            };
            const targetMats = realmMats[realmNum] || [];
            const qualities = ['Phế Phẩm', 'Thường', 'Hiếm', 'Sử Thi', 'Thần Thoại'];
            for (const mId of targetMats) {
              for (const q of qualities) {
                await Inventory.addVatPham(tuSi.idNguoiDung, mId, 99, { quality: q });
              }
            }
            const realmNameMap = { '1': 'Luyện Khí', '2': 'Trúc Cơ', '3': 'Kim Đan', '4': 'Nguyên Anh', '5': 'Hóa Thần' };
            statusMsg = `✅ Đã nhận thành công x99 nguyên liệu luyện khí tất cả các phẩm chất của cảnh giới **${realmNameMap[realmNum]}**!`;
            showRealmMenu = false;
          } catch (err) {
            console.error('[Test Command] Lỗi nhận nguyên liệu cảnh giới:', err);
            statusMsg = `❌ Lỗi khi nhận nguyên liệu cảnh giới.`;
          }
          await interaction.editReply(buildPayload());
          return;
        }

        if (customId === 'test_btn_quick_auto') {
          const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');
          const modal = new ModalBuilder()
            .setCustomId(`modal_test_auto_${interaction.user.id}`)
            .setTitle('🌾 Nhận Nhanh X Giờ Auto');

          const input = new TextInputBuilder()
            .setCustomId('auto_hours_input')
            .setLabel('Nhập số giờ auto muốn nhận nhanh tài nguyên')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('Ví dụ: 1, 2, 8, 24');

          modal.addComponents(new ActionRowBuilder().addComponents(input));

          try {
            await i.showModal(modal);

            const submitted = await i.awaitModalSubmit({
              filter: sub => sub.customId === `modal_test_auto_${interaction.user.id}` && sub.user.id === interaction.user.id,
              time: 60000
            });

            await submitted.deferUpdate();

            const rawVal = submitted.fields.getTextInputValue('auto_hours_input');
            const hours = parseInt(rawVal.trim(), 10);
            if (isNaN(hours) || hours <= 0) {
              statusMsg = `❌ Số giờ không hợp lệ: "${rawVal}"`;
            } else {
              const minutes = hours * 60;
              const { creditAutoRewards, autoDiBiCanh, autoDiLichLuyen } = await import('./BoDieuKhienAuto.js');
              const { ThoiGianCho } = await import('../models/ThoiGianCho.js');
              
              const originalTheLuc = tuSi.theLuc;
              const loops = Math.ceil(minutes / 5);
              
              tuSi.thongKeAuto = { activeMinutes: 0, exp: 0, stones: 0, items: {} };
              await tuSi.save();

              for (let l = 0; l < loops; l++) {
                await tuSi.reload();
                const stats = await tuSi.layChiSoDayDu();
                tuSi.hp = stats.max_hp;
                tuSi.mp = stats.max_mp;
                tuSi.theLuc = 100;
                
                const statsObj = tuSi.thongKeAuto;
                statsObj.activeMinutes = (statsObj.activeMinutes || 0) + 5;
                tuSi.thongKeAuto = statsObj;
                await tuSi.save();

                await ThoiGianCho.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });

                await autoDiBiCanh(tuSi);
                await autoDiLichLuyen(tuSi);
              }

              await tuSi.reload();
              tuSi.theLuc = originalTheLuc;
              await tuSi.save();

              const harvest = await creditAutoRewards(tuSi);
              if (harvest) {
                statusMsg = `🌾 Nhận nhanh thành công **${hours} giờ** auto!\n` +
                            `• Linh lực tăng thêm: **+${harvest.expGained.toLocaleString()}** Exp\n` +
                            `• Linh thạch nhận được: **+${harvest.stonesGained.toLocaleString()}** 🪙\n` +
                            `• Vật phẩm thu hoạch:\n${harvest.itemLines}`;
              } else {
                statusMsg = `🌾 Nhận nhanh thành công **${hours} giờ** auto, nhưng không nhận được phần thưởng nào.`;
              }
            }
            await interaction.editReply(buildPayload());
          } catch (err) {
            // modal submit timeout/cancel
          }
          return;
        }

        if (customId === 'test_btn_quick_cultivate') {
          const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');
          const modal = new ModalBuilder()
            .setCustomId(`modal_test_cultivate_${interaction.user.id}`)
            .setTitle('✨ Nhận Nhanh Tu Luyện');

          const input = new TextInputBuilder()
            .setCustomId('cultivate_hours_input')
            .setLabel('Nhập số giờ tu luyện muốn nhận nhanh')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('Ví dụ: 1, 4, 12, 24');

          modal.addComponents(new ActionRowBuilder().addComponents(input));

          try {
            await i.showModal(modal);

            const submitted = await i.awaitModalSubmit({
              filter: sub => sub.customId === `modal_test_cultivate_${interaction.user.id}` && sub.user.id === interaction.user.id,
              time: 60000
            });

            await submitted.deferUpdate();

            const rawVal = submitted.fields.getTextInputValue('cultivate_hours_input');
            const hours = parseInt(rawVal.trim(), 10);
            if (isNaN(hours) || hours <= 0) {
              statusMsg = `❌ Số giờ không hợp lệ: "${rawVal}"`;
            } else {
              await tuSi.reload();
              tuSi.lastUpdateTuVi = new Date(Date.now() - hours * 3600 * 1000);
              await tuSi.save();

              const { BoDieuKhienGoc } = await import('./BoDieuKhienGoc.js');
              const baseController = new BoDieuKhienGoc();
              const res = await baseController.kiemTraVaNhanTuVi(tuSi);
              if (res && res.completed) {
                statusMsg = `✨ Nhận nhanh thành công **${hours} giờ** tu luyện!\n` +
                            `• Tu vi tăng thêm: **+${res.exp.toLocaleString()}** Exp ✨\n` +
                            `• Linh thạch nhận được: **+${res.stones.toLocaleString()}** 🪙`;
              } else {
                statusMsg = `❌ Không thể nhận nhanh tu vi hoặc chưa đủ thời gian tích lũy.`;
              }
            }
            await interaction.editReply(buildPayload());
          } catch (err) {
            // modal submit timeout/cancel
          }
          return;
        }

        if (customId === 'test_gift_custom') {
          if (!selectedItemToTest) {
            try { await i.deferUpdate(); } catch (_) {}
            statusMsg = `❌ Hãy chọn vật phẩm trước khi nhập số lượng.`;
            await interaction.editReply(buildPayload());
            return;
          }

          const { ModalBuilder, TextInputBuilder, TextInputStyle } = await import('discord.js');
          const configItem = config.ITEMS.find(item => item.id === selectedItemToTest);
          const nameText = configItem ? configItem.ten : selectedItemToTest;

          const modal = new ModalBuilder()
            .setCustomId(`modal_test_custom_${interaction.user.id}`)
            .setTitle(`Nhận Vật Phẩm: ${nameText.substring(0, 40)}`);

          const qtyInput = new TextInputBuilder()
            .setCustomId('test_qty_input')
            .setLabel('Số lượng muốn nhận (vd: 100, 1k, 5m)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('Nhập số lượng... (vd: 50, 500, 1000)');

          modal.addComponents(new ActionRowBuilder().addComponents(qtyInput));

          try {
            await i.showModal(modal);

            const submitted = await i.awaitModalSubmit({
              filter: sub => sub.customId === `modal_test_custom_${interaction.user.id}` && sub.user.id === interaction.user.id,
              time: 60000
            });

            await submitted.deferUpdate();

            const rawVal = submitted.fields.getTextInputValue('test_qty_input');
            const match = rawVal.trim().toLowerCase().match(/^([\d.]+)\s*([kmb]?)$/);
            if (!match) {
              statusMsg = `❌ Định dạng số lượng không hợp lệ: "${rawVal}"`;
            } else {
              const numPart = parseFloat(match[1]);
              const suffix = match[2];
              let multiplier = 1;
              if (suffix === 'k') multiplier = 1000;
              else if (suffix === 'm') multiplier = 1000000;
              else if (suffix === 'b') multiplier = 1000000000;
              const qty = Math.floor(numPart * multiplier);

              if (isNaN(qty) || qty <= 0) {
                statusMsg = `❌ Số lượng phải là số dương hợp lệ.`;
              } else {
                await Inventory.addVatPham(tuSi.idNguoiDung, selectedItemToTest, qty);
                statusMsg = `✅ Đã nhận thành công **x${qty.toLocaleString()} ${nameText}**!`;
                selectedItemToTest = null;
              }
            }

            await interaction.editReply(buildPayload());
          } catch (err) {
            // modal submit timeout/cancel
          }
          return;
        }

        try {
          await i.deferUpdate();
        } catch (_) {
          return;
        }

        if (customId === 'test_btn_custom_item') {
          showItemMenu = true;
          selectedItemCategory = null;
          selectedItemToTest = null;
          itemTestPage = 0;
        }

        else if (customId === 'test_btn_item_back') {
          showItemMenu = false;
          selectedItemCategory = null;
          selectedItemToTest = null;
          itemTestPage = 0;
        }

        else if (customId === 'test_gift_cat_select') {
          selectedItemCategory = i.values[0];
          selectedItemToTest = null;
          itemTestPage = 0;
        }

        else if (customId === 'test_gift_item_select') {
          selectedItemToTest = i.values[0];
        }

        else if (customId === 'test_gift_prev') {
          itemTestPage--;
        }

        else if (customId === 'test_gift_next') {
          itemTestPage++;
        }

        else if (['test_gift_x1', 'test_gift_x10', 'test_gift_x100'].includes(customId)) {
          let qty = 1;
          if (customId === 'test_gift_x10') qty = 10;
          if (customId === 'test_gift_x100') qty = 100;
          const configItem = config.ITEMS.find(item => item.id === selectedItemToTest);
          const nameText = configItem ? configItem.ten : selectedItemToTest;
          await Inventory.addVatPham(tuSi.idNguoiDung, selectedItemToTest, qty);
          statusMsg = `✅ Đã nhận thành công **x${qty} ${nameText}**!`;
          selectedItemToTest = null;
        }

        else if (customId === 'test_btn_realm_mats') {
          showRealmMenu = true;
        } 
        
        else if (customId === 'test_btn_realm_back') {
          showRealmMenu = false;
        }

        else if (customId === 'test_btn_maxout') {
          try {
            await tuSi.reload();
            tuSi.capDo = 31;
            const cg = config.layThongTinCanhGioi(tuSi.capDo);
            tuSi.canhGioi = `${cg.realmName} - ${cg.stageName}`;
            tuSi.linhLuc = 10000000;
            tuSi.linhThach = 100000000;
            tuSi.vnd = 10000000;
            tuSi.theLuc = 200;
            tuSi.theLucMax = 200;
            const stats = await tuSi.layChiSoDayDu();
            tuSi.hp = stats.max_hp;
            tuSi.mp = stats.max_mp;
            await tuSi.save();
            statusMsg = `⚡ Đã nâng cấp nhân vật lên cảnh giới **Tiên Nhân - Chân Tiên**, Linh Lực: 10M, Linh Thạch: 100M, VND: 10M, Thể Lực: 200/200, hồi phục HP/MP!`;
          } catch (err) {
            console.error('[Test Command] Lỗi maxout:', err);
            statusMsg = `❌ Lỗi khi thực hiện max out cảnh giới.`;
          }
        } 
        
        else if (customId === 'test_btn_items') {
          try {
            const itemsToGift = ['kiem_huyen_thiet', 'giap_huyen_thiet', 'phap_bao_huyen_mon', 'can_khon_dinh', 'binh_tinh_hai'];
            for (const itemId of itemsToGift) {
              await Inventory.addVatPham(tuSi.idNguoiDung, itemId, 1, { quality: 'Thần Thoại' });
            }
            await Inventory.addVatPham(tuSi.idNguoiDung, 'ngoc_boi_kim_dan_the', 1, { quality: 'Thần Thoại' });
            await Inventory.addVatPham(tuSi.idNguoiDung, 'the_vinh_vien', 1);

            statusMsg = `⚔️ Đã tặng trọn bộ trang bị/pháp bảo Hóa Thần Thần Thoại, Chí Bảo Càn Khôn Đỉnh, Bình Tinh Hải và Thẻ Vĩnh Viễn!`;
          } catch (err) {
            console.error('[Test Command] Lỗi items:', err);
            statusMsg = `❌ Lỗi khi tặng trang bị.`;
          }
        } 
        
        else if (customId === 'test_btn_pet') {
          try {
            const template = config.PET_TEMPLATES_SEED[0]; // Hỏa Hầu
            const cleanName = template.name;
            const rarity = 'than_pham_5';
            const formattedName = config.getFormattedPetName(cleanName, rarity, 10, false);

            await Pet.create({
              userId: tuSi.idNguoiDung,
              name: formattedName,
              type: template.id,
              rarity: rarity,
              level: 100,
              exp: 0,
              tuChat: 250,
              tienHoa: 10,
              extraEvo: 5,
              isActive: false
            });

            statusMsg = `🐉 Đã sinh một chú Linh Thú Hỏa Hầu (Thần Phẩm +5, Cấp 100, max Tư Chất 250) trong sủng vật viên!`;
          } catch (err) {
            console.error('[Test Command] Lỗi pet:', err);
            statusMsg = `❌ Lỗi khi tạo thú cưng thử nghiệm.`;
          }
        } 
        
        else if (customId === 'test_btn_skills') {
          try {
            const playerClass = tuSi.huongTu || 'Phap Tu';
            const expectedType = playerClass === 'The Tu' ? 'Vật lý' : 'Phép thuật';
            const allSkills = await Skill.findAll({ where: { loai: expectedType } });
            
            await PlayerSkill.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });

            for (const sk of allSkills) {
              await PlayerSkill.create({
                idNguoiDung: tuSi.idNguoiDung,
                skillId: sk.id,
                capDo: 10,
                kinhNghiemSkill: 0,
                trangBi: false
              });
            }

            statusMsg = `📚 Đã lĩnh hội toàn bộ thần thông bậc 10 thuộc hướng ${expectedType} (hãy gõ \`/kynang\` để trang bị)!`;
          } catch (err) {
            console.error('[Test Command] Lỗi skills:', err);
            statusMsg = `❌ Lỗi khi lĩnh hội kỹ năng.`;
          }
        } 
        
        else if (customId === 'test_btn_materials') {
          try {
            const mats = [
              'hat_giong_luyen_khi_thao', 'hat_giong_truc_co_thao', 'hat_giong_kim_dan_hoa', 'hat_giong_nguyen_anh_qua',
              'hat_giong_hoa_than_chi', 'hat_giong_phan_hu_dang', 'hat_giong_hop_the_lien', 'hat_giong_dai_thua_qua',
              'linh_thao_luyen_khi', 'linh_thao_truc_co', 'linh_thao_kim_dan', 'linh_thao_nguyen_anh',
              'linh_thao_hoa_than', 'linh_thao_phan_hu', 'linh_thao_hop_the', 'linh_thao_dai_thua',
              'co_duyen_lenh', 'linh_sung_lenh'
            ];

            for (const mId of mats) {
              await Inventory.addVatPham(tuSi.idNguoiDung, mId, 99, { quality: 'Thần Thoại' });
            }

            for (let num = 1; num <= 8; num++) {
              await Inventory.addVatPham(tuSi.idNguoiDung, `dan_dot_pha_${num}`, 10, {
                quality: { phamChat: 'Thần thoại', phanTramHoTro: 40 }
              });
            }

            statusMsg = `🎒 Đã đổ đầy túi với x99 nguyên liệu rèn/hạt giống/thảo dược Thần Thoại và x10 đan dược đột phá Thần Thoại từ Luyện Khí đến Đại Thừa!`;
          } catch (err) {
            console.error('[Test Command] Lỗi materials:', err);
            statusMsg = `❌ Lỗi khi tặng nguyên liệu.`;
          }
        } 
        
        else if (customId === 'test_btn_close') {
          collector.stop('closed');
          return;
        }

        await interaction.editReply(buildPayload());
      });

      collector.on('end', async (_, reason) => {
        if (reason !== 'closed') {
          try {
            await interaction.editReply({ components: [] });
          } catch (_) {}
        } else {
          try {
            await interaction.editReply({ content: '🧪 Bảng thử nghiệm Thiên Đạo đã đóng.', embeds: [], components: [] });
          } catch (_) {}
        }
      });
    }
  };

  lenhTestEnd = {
    data: new SlashCommandBuilder()
      .setName('testend')
      .setDescription('Kết thúc thử nghiệm nhanh và khôi phục trạng thái tài khoản gốc'),

    execute: async (interaction) => {
      const { TuSi } = await import('../models/TuSi.js');
      const tuSi = await TuSi.findOne({ where: { idNguoiDung: interaction.user.id } });
      if (!tuSi) {
        return interaction.reply({
          content: '❌ Đạo hữu chưa khởi đầu kiếp tu tiên.',
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });
      const restored = await restoreState(tuSi);
      if (restored) {
        return interaction.editReply({
          content: '✅ Đã kết thúc thử nghiệm và khôi phục thành công toàn bộ chỉ số, trang bị, sủng vật và thần thông về trạng thái gốc!'
        });
      } else {
        return interaction.editReply({
          content: '❌ Đạo hữu hiện không ở trong trạng thái thử nghiệm (hoặc không có dữ liệu sao lưu gốc).'
        });
      }
    }
  };

  lenhTestEng = {
    data: new SlashCommandBuilder()
      .setName('testeng')
      .setDescription('Kết thúc thử nghiệm nhanh và khôi phục trạng thái tài khoản gốc (Bản gõ Telex)'),

    execute: async (interaction) => {
      const { TuSi } = await import('../models/TuSi.js');
      const tuSi = await TuSi.findOne({ where: { idNguoiDung: interaction.user.id } });
      if (!tuSi) {
        return interaction.reply({
          content: '❌ Đạo hữu chưa khởi đầu kiếp tu tiên.',
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });
      const restored = await restoreState(tuSi);
      if (restored) {
        return interaction.editReply({
          content: '✅ Đã kết thúc thử nghiệm và khôi phục thành công toàn bộ chỉ số, trang bị, sủng vật và thần thông về trạng thái gốc!'
        });
      } else {
        return interaction.editReply({
          content: '❌ Đạo hữu hiện không ở trong trạng thái thử nghiệm (hoặc không có dữ liệu sao lưu gốc).'
        });
      }
    }
  };

  lenhEndTest = {
    data: new SlashCommandBuilder()
      .setName('endtest')
      .setDescription('Kết thúc thử nghiệm nhanh và khôi phục trạng thái tài khoản gốc'),

    execute: async (interaction) => {
      const { TuSi } = await import('../models/TuSi.js');
      const tuSi = await TuSi.findOne({ where: { idNguoiDung: interaction.user.id } });
      if (!tuSi) {
        return interaction.reply({
          content: '❌ Đạo hữu chưa khởi đầu kiếp tu tiên.',
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });
      const restored = await restoreState(tuSi);
      if (restored) {
        return interaction.editReply({
          content: '✅ Đã kết thúc thử nghiệm và khôi phục thành công toàn bộ chỉ số, trang bị, sủng vật và thần thông về trạng thái gốc!'
        });
      } else {
        return interaction.editReply({
          content: '❌ Đạo hữu hiện không ở trong trạng thái thử nghiệm (hoặc không có dữ liệu sao lưu gốc).'
        });
      }
    }
  };
}

const controller = new BoDieuKhienAdmin();
export const danhSachLenhAdmin = [
  controller.lenhAdmin,
  controller.lenhEdit,
  controller.lenhTb,
  controller.lenhTest,
  controller.lenhTestEnd,
  controller.lenhTestEng,
  controller.lenhEndTest
];
export { controller as boDieuKhienAdmin };
