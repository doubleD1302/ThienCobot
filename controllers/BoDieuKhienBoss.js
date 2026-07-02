import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType
} from 'discord.js';

import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed, layMauCanhGioi } from '../views/BoTaoEmbed.js';
import { WorldBoss } from '../models/WorldBoss.js';
import { ChannelRestriction } from '../models/ChannelRestriction.js';
import { Inventory } from '../models/Inventory.js';
import { Item } from '../models/Item.js';
import * as config from '../config.js';
import { Op } from 'sequelize';

// Danh sách các loài boss truyền thuyết
const BOSS_TEMPLATES = [
  { ten: '👾 Hỏa Lân Yêu Thú', linhCan: 'Hoa', moTa: 'Thần thú thời thái cổ mang ngọn lửa rực cháy thiêu rụi vạn vật.' },
  { ten: '🐉 Hắc Long Ma Tổ', linhCan: 'Loi', moTa: 'Thượng cổ Ma Long thức tỉnh từ vực thẳm u tối vô tận.' },
  { ten: '🦍 Tử Tinh Bạo Viên', linhCan: 'Tho', moTa: 'Linh hầu hộ vệ mang sức mạnh phòng ngự kiên cố như bàn thạch.' },
  { ten: '🦊 Cửu Vĩ Thiên Hồ', linhCan: 'Thuy', moTa: 'Hồ ly ngàn năm mang linh lực huyền bí biến hóa khôn lường.' },
  { ten: '🐅 Thôn Phạn Ma Hổ', linhCan: 'Kim', moTa: 'Yêu hổ hung tàn sở hữu nanh vuốt xé rách mọi giáp trụ.' }
];

// Helper: Lấy thông tin cảnh giới từ cấp độ
function layRealmNameTuCapDo(capDo) {
  const { realmName } = config.layThongTinCanhGioi(capDo);
  return realmName;
}

// Helper: Sinh dòng linh khí (chỉ số ẩn) chất lượng cao cho Boss drops (90% Cam Thần Thoại 15-20%, 10% Đỏ Thần Cấp 30-50%)
function rollBossDropStats(item, isRed) {
  const loai = item.loai;
  const POOLS = {
    "Vũ khí": ["vat_cong", "phap_cong", "crit_rate", "crit_dmg", "xuyen_giap"],
    "Giáp": ["vat_phong", "phap_phong", "max_mp", "max_hp"],
    "Ngọc Bội": ["max_hp", "max_mp", "ne", "lifesteal"],
    "Cổ Bảo Chủ Động": ["vat_cong", "phap_cong", "vat_phong", "phap_phong", "max_hp", "max_mp", "ne", "lifesteal"],
    "Pháp Bảo": [
      "vat_cong", "phap_cong", "vat_phong", "phap_phong", "max_hp", "max_mp", "ne", "lifesteal",
      "crit_rate_pb", "crit_dmg_pb", "sat_thuong_pb", "phap_thuong_pb", "khien_pb"
    ]
  };

  const pool = POOLS[loai];
  if (!pool) return null;

  const numLines = Math.floor(Math.random() * 4) + 1;
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selectedStats = shuffled.slice(0, Math.min(numLines, pool.length));

  const NAME_MAP = {
    "vat_cong": "Sát thương Vật lý",
    "phap_cong": "Sát thương Pháp thuật",
    "crit_rate": "Tỷ lệ Bạo kích",
    "crit_dmg": "Sát thương Bạo kích",
    "xuyen_giap": "Xuyên giáp hộ thể",
    "vat_phong": "Vật phòng nhục thân",
    "phap_phong": "Pháp phòng khí hải",
    "max_mp": "Chân nguyên linh khí (MP)",
    "max_hp": "Khí huyết cơ bản (HP)",
    "ne": "Né tránh yêu pháp",
    "lifesteal": "Hút máu sinh cơ",
    "crit_rate_pb": "Bạo kích Pháp bảo",
    "crit_dmg_pb": "Bạo thương Pháp bảo",
    "sat_thuong_pb": "Sát thương Pháp bảo",
    "phap_thuong_pb": "Pháp thương Pháp bảo",
    "khien_pb": "Hộ tẫn Hấp thụ Pháp bảo"
  };

  const lines = [];
  for (const stat of selectedStats) {
    let quality, color, minPercent, maxPercent;
    if (isRed) {
      quality = "Thần Cấp";
      color = "do";
      minPercent = 30;
      maxPercent = 50;
    } else {
      quality = "Thần Thoại";
      color = "cam";
      minPercent = 15;
      maxPercent = 20;
    }

    const value = parseFloat((minPercent + Math.random() * (maxPercent - minPercent)).toFixed(1));
    lines.push({
      thuocTinh: stat,
      ten: NAME_MAP[stat] || stat,
      mau: color,
      phamChat: quality,
      phanTram: value
    });
  }

  return lines;
}

// Helper: Phân bổ phần thưởng khi boss bị tiêu diệt
async function phanBoPhanThuongBoss(client, boss, guild, lastHitterId) {
  const dealers = boss.damageDealers;
  const ids = Object.keys(dealers);
  if (ids.length === 0) return 'Không có tu sĩ nào tham gia khiêu chiến.';

  // Sắp xếp danh sách damage giảm dần
  const sorted = ids.map(id => ({ id, dmg: dealers[id] }))
    .sort((a, b) => b.dmg - a.dmg);

  // Tìm cảnh giới của boss để thưởng trang bị
  const bossLevel = boss.level;
  const realmInfo = config.layThongTinCanhGioi(bossLevel);
  
  // Tìm tất cả item có yeuCauCanhGioi phù hợp
  // Tìm các cấp độ tối thiểu và tối đa của cảnh giới này
  const realmObj = config.CANH_GIOI_LIST.find(r => r.name === realmInfo.realmName) || config.CANH_GIOI_LIST[0];
  const minLvl = realmObj.min_level;
  const maxLvl = realmObj.max_level;

  const candidateItems = await Item.findAll({
    where: {
      yeuCauCanhGioi: {
        [Op.between]: [minLvl, maxLvl]
      },
      loai: {
        [Op.in]: ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo']
      }
    }
  });

  const fallbackItems = await Item.findAll({
    where: {
      loai: {
        [Op.in]: ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo']
      }
    }
  });
  const getGiftItem = () => {
    if (candidateItems.length > 0) {
      return candidateItems[Math.floor(Math.random() * candidateItems.length)];
    }
    return fallbackItems[Math.floor(Math.random() * fallbackItems.length)];
  };

  const { TuSi } = await import('../models/TuSi.js');

  // Trao phần thưởng đặc biệt cho người kích sát (Last Hitter)
  let lastHitterMsg = '';
  if (lastHitterId) {
    const lhTuSi = await TuSi.findOne({ where: { idNguoiDung: lastHitterId } });
    if (lhTuSi) {
      const extraStones = boss.level * 10000;
      lhTuSi.linhThach = Math.min(2_000_000_000, lhTuSi.linhThach + extraStones);
      
      const gift = getGiftItem();
      let giftName = '';
      if (gift) {
        const isRed = Math.random() <= 0.10;
        const isEquipable = ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'].includes(gift.loai);
        let dongChiSoJson = null;
        if (isEquipable) {
          const stats = rollBossDropStats(gift, isRed);
          dongChiSoJson = JSON.stringify(stats);
        }

        await Inventory.create({
          idNguoiDung: lastHitterId,
          itemId:      gift.id,
          soLuong:     1,
          trangBi:     false,
          dongChiSoJson: dongChiSoJson
        });
        const rarityText = isRed ? 'Thần Cấp 🔴' : 'Thần Thoại 🟠';
        giftName = ` & nhận **${gift.ten}** (${rarityText})`;
      }
      
      await lhTuSi.save();
      lastHitterMsg = `🏆 **Người Kích Sát**: <@${lastHitterId}> nhận thêm \`+${extraStones.toLocaleString()}\` 🪙 Linh thạch${giftName}!\n\n`;
    }
  }

  let report = lastHitterMsg + `⚔️ **Bảng Vàng Tiêu Diệt Cự Thú — ${boss.ten}**\n\n`;

  for (let index = 0; index < sorted.length; index++) {
    const entry = sorted[index];
    const tuSi = await TuSi.findOne({ where: { idNguoiDung: entry.id } });
    if (!tuSi) continue;

    // Tính toán Linh thạch & Exp nhận được theo lượng sát thương đóng góp
    const ratio = entry.dmg / boss.maxHp;
    const baseStones = boss.level * 2000;
    const baseExp = boss.level * 500;

    // Linh lực & Linh thạch nhận được tối thiểu là 10% base
    const gainedStones = Math.max(50, Math.floor(baseStones * ratio) + Math.floor(Math.random() * 200));
    const gainedExp = Math.max(10, Math.floor(baseExp * ratio) + Math.floor(Math.random() * 50));

    tuSi.linhThach = Math.min(2_000_000_000, tuSi.linhThach + gainedStones);
    tuSi.linhLuc += gainedExp;
    
    let giftMsg = '';
    // Top 1 được chắc chắn nhận 1 trang bị ngẫu nhiên của Cảnh Giới hiện tại
    // Các vị trí khác có tỉ lệ (Top 2: 50%, Top 3: 30%, khác: 5%)
    let dropChance = 0.05;
    if (index === 0) dropChance = 1.0;
    else if (index === 1) dropChance = 0.50;
    else if (index === 2) dropChance = 0.30;

    if (Math.random() <= dropChance) {
      const gift = getGiftItem();
      if (gift) {
        const isRed = Math.random() <= 0.10;
        const isEquipable = ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'].includes(gift.loai);
        let dongChiSoJson = null;
        if (isEquipable) {
          const stats = rollBossDropStats(gift, isRed);
          dongChiSoJson = JSON.stringify(stats);
        }

        await Inventory.create({
          idNguoiDung: tuSi.idNguoiDung,
          itemId:      gift.id,
          soLuong:     1,
          trangBi:     false,
          dongChiSoJson: dongChiSoJson
        });
        const rarityText = isRed ? 'Thần Cấp 🔴' : 'Thần Thoại 🟠';
        giftMsg = ` 🎁 Nhận được: **${gift.ten}** (${rarityText})`;
      }
    }

    await tuSi.save();

    const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
    report += `${rankEmoji} **Top ${index + 1}**: <@${entry.id}> gây \`${entry.dmg.toLocaleString()}\` sát thương.\n`;
    report += `   → Nhận \`+${gainedStones.toLocaleString()}\` 🪙 Linh thạch, \`+${gainedExp.toLocaleString()}\` ⚡ Linh lực.${giftMsg}\n\n`;
  }

  return report.trim();
}

// Helper: Xây dựng Embed trạng thái boss hiện tại
function buildBossEmbed(boss) {
  const hpPercent = Math.max(0, Math.floor((boss.hp / boss.maxHp) * 100));
  const filledBars = Math.round(hpPercent / 10);
  const hpBar = '🟩'.repeat(filledBars) + '⬜'.repeat(10 - filledBars);

  const realmName = layRealmNameTuCapDo(boss.level);

  // Tạo top danh sách sát thương
  const dealers = boss.damageDealers;
  const sorted = Object.keys(dealers)
    .map(id => ({ id, dmg: dealers[id] }))
    .sort((a, b) => b.dmg - a.dmg)
    .slice(0, 5);

  let leaderBoard = '';
  if (sorted.length === 0) {
    leaderBoard = '*Chưa có tu sĩ nào xuất thủ.*';
  } else {
    leaderBoard = sorted.map((d, i) => `${i === 0 ? '🥇' : '🔹'} <@${d.id}>: \`${d.dmg.toLocaleString()}\` ST`).join('\n');
  }

  const minutesLeft = Math.max(0, Math.ceil((new Date(boss.hetHan).getTime() - Date.now()) / 60000));

  return new EmbedBuilder()
    .setTitle(`👹 CỰ THÚ XUẤT THẾ: ${boss.ten}`)
    .setColor(0xff3838)
    .setDescription(
      `*Địa điểm xuất hiện: <#${boss.channelId}>*\n` +
      `*Mô tả: Thú triều nghịch chuyển, khí vận biến hóa sinh ra yêu nghiệt tàn sát sinh linh.*`
    )
    .addFields(
      { name: '📊 Chỉ Số Cự Thú', value: `• **Cảnh giới**: \`${realmName} (Cấp ${boss.level})\`\n• **Giáp**: \`${boss.giap}\` | **Phòng ngự**: \`${boss.vatPhong}\``, inline: false },
      { name: `❤️ Sinh Mệnh: ${hpPercent}% (${boss.hp.toLocaleString()} / ${boss.maxHp.toLocaleString()})`, value: `${hpBar}`, inline: false },
      { name: '⚔️ Sát Thương Đóng Góp (Top 5)', value: leaderBoard, inline: true },
      { name: '⏳ Thời Gian Còn Lại', value: `\`${minutesLeft} phút\` (Sẽ rút lui khi hết giờ)`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Nhấn nút Tấn Công để góp sức tiêu diệt!' });
}

// Helper: Xây dựng các nút hành động cho Boss
function buildBossButtons(boss) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`boss_attack_${boss.idGuild}`)
      .setLabel('⚔️ Tấn Công Cự Thú')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!boss.active || boss.hp <= 0),
    new ButtonBuilder()
      .setCustomId(`boss_refresh_${boss.idGuild}`)
      .setLabel('🔄 Làm Mới Trạng Thái')
      .setStyle(ButtonStyle.Secondary)
  );
}

class BoDieuKhienBoss extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  // Khởi động vòng lặp kiểm tra tự động sinh Boss
  khoiThaoBossSchedule(client) {
    console.log('[Boss System] Khởi động tiến trình quản lý Cự Thú...');
    
    // Kiểm tra mỗi 1 phút
    setInterval(async () => {
      try {
        const now = new Date();
        
        // 1. Kiểm tra và dọn dẹp Boss đã quá giờ
        const activeBosses = await WorldBoss.findAll({ where: { active: true } });
        for (const boss of activeBosses) {
          if (new Date(boss.hetHan) < now) {
            boss.active = false;
            await boss.save();

            // Sửa lại tin nhắn thông báo ban đầu nếu tìm thấy kênh và tin nhắn
            try {
              const channel = await client.channels.fetch(boss.channelId).catch(() => null);
              if (channel && boss.messageId) {
                const originalMsg = await channel.messages.fetch(boss.messageId).catch(() => null);
                if (originalMsg) {
                  await originalMsg.edit({
                    embeds: [
                      new EmbedBuilder()
                        .setTitle(`🏃‍♂️ CỰ THÚ ĐÃ RÚT LUI: ${boss.ten}`)
                        .setColor(0x7f8c8d)
                        .setDescription(`Do không có tu sĩ nào tiêu diệt kịp thời, Cự Thú đã rút lui về hoang cổ bí cảnh. Hẹn gặp lại chư vị đạo hữu lần sau.`)
                        .setTimestamp()
                    ],
                    components: []
                  });
                }
              }
            } catch (err) {
              console.error('[Boss System] Lỗi khi dọn dẹp boss hết hạn:', err);
            }
          }
        }

        // 2. Tự động sinh Boss ngẫu nhiên cho các Server hoạt động
        const guilds = client.guilds.cache;
        for (const [guildId, guild] of guilds) {
          // Kiểm tra xem Guild này đã có Boss đang active chưa
          const hasActive = await WorldBoss.findOne({ where: { idGuild: guildId, active: true } });
          if (hasActive) continue;

          // Xác định tỉ lệ xuất hiện Boss (Mỗi phút có 1.5% tỉ lệ xuất hiện Boss)
          if (Math.random() <= 0.015) {
            await this.trieuHoiWorldBossTuDong(client, guildId, guild);
          }
        }

      } catch (err) {
        console.error('[Boss System] Lỗi tiến trình tự động sinh boss:', err);
      }
    }, 60000);
  }

  // Hàm triệu hồi Boss tự động cho Guild
  async trieuHoiWorldBossTuDong(client, guildId, guild) {
    try {
      // Tìm các kênh được cấp phép dùng bot (kênh có đăng ký trong ChannelRestriction)
      const restrictions = await ChannelRestriction.findAll();
      const guildChannels = restrictions.filter(r => guild.channels.cache.has(r.channelId));

      let targetChannelId = null;
      if (guildChannels.length > 0) {
        // Chọn ngẫu nhiên một kênh được đăng ký
        targetChannelId = guildChannels[Math.floor(Math.random() * guildChannels.length)].channelId;
      } else {
        // Fallback: Tìm kênh văn bản đầu tiên có quyền gửi tin nhắn
        const textChannel = guild.channels.cache.find(c => 
          c.type === ChannelType.GuildText && 
          c.permissionsFor(guild.members.me).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])
        );
        if (!textChannel) return;
        targetChannelId = textChannel.id;
      }

      // Đọc cấu hình đạo niên để tính toán sức mạnh Boss
      const guildConfig = await this.layHoacTaoCauHinhGuild(guildId);
      const daoNien = guildConfig.layDaoNienHienTai();
      
      // Sức mạnh boss tỷ lệ thuận với Đạo Niên của Server
      const bossLevel = Math.min(30, Math.floor(daoNien / 2) + 1);

      // Chọn ngẫu nhiên một loài Boss
      const tpl = BOSS_TEMPLATES[Math.floor(Math.random() * BOSS_TEMPLATES.length)];

      const maxHp = Math.ceil((bossLevel * 50000 + 50000) / 1000);
      const vatCong = Math.ceil((bossLevel * 300 + 100) / 1000) * 100;
      const phapCong = Math.ceil((bossLevel * 300 + 100) / 1000) * 100;
      const vatPhong = bossLevel * 100 + 50;
      const phapPhong = bossLevel * 100 + 50;
      const giap = bossLevel * 50 + 20;

      // Hạn giờ biến mất: 30 phút
      const hetHan = new Date(Date.now() + 30 * 60000);

      // Xóa boss cũ của Guild này nếu có để tránh lỗi trùng khóa chính (PRIMARY KEY unique violation)
      await WorldBoss.destroy({ where: { idGuild: guildId } });

      // Tạo đối tượng Boss lưu vào Database
      const boss = await WorldBoss.create({
        idGuild: guildId,
        channelId: targetChannelId,
        ten: tpl.ten,
        level: bossLevel,
        maxHp,
        hp: maxHp,
        vatCong,
        phapCong,
        vatPhong,
        phapPhong,
        giap,
        damageDealers: {},
        hetHan,
        active: true
      });

      // Gửi tin nhắn thông báo vào kênh đích
      const channel = await client.channels.fetch(targetChannelId).catch(() => null);
      if (channel) {
        const msg = await channel.send({
          content: '🔔 **[WORLD BOSS] Cự Thú Thái Cổ đã giáng thế!**',
          embeds: [buildBossEmbed(boss)],
          components: [buildBossButtons(boss)]
        });
        boss.messageId = msg.id;
        await boss.save();
      }

      console.log(`[Boss System] Triệu hồi Boss ${tpl.ten} (Cấp ${bossLevel}) thành công tại Guild ${guild.name} (Kênh: #${channel?.name || targetChannelId})`);
    } catch (err) {
      console.error('[Boss System] Lỗi khi tạo boss tự động:', err);
    }
  }

  // Lệnh Slash /boss để xem trạng thái hiện tại hoặc cho phép admin triệu hồi
  lenhBoss = {
    data: new SlashCommandBuilder()
      .setName('boss')
      .setDescription('Khiêu chiến Cự Thú thế giới bảo vệ đại địa tông môn'),

    execute: async (interaction) => {
      await interaction.deferReply();

      const guildId = interaction.guildId;
      let boss = await WorldBoss.findOne({ where: { idGuild: guildId, active: true } });

      if (boss) {
        // Kiểm tra xem Boss đã quá giờ chưa
        if (new Date(boss.hetHan) < new Date()) {
          boss.active = false;
          await boss.save();
          return await interaction.editReply({
            embeds: [BoTaoEmbed.thongTin('🌌 Cự Thú Rút Lui', 'Cự Thú thế giới đã ẩn dật trở lại bí cảnh hoang cổ do chư vị tu sĩ không tiêu diệt kịp thời.')]
          });
        }

        // Hiển thị giao diện chiến đấu boss hiện tại
        return await interaction.editReply({
          embeds: [buildBossEmbed(boss)],
          components: [buildBossButtons(boss)]
        });
      }

      // Nếu không có boss đang hoạt động và người gọi lệnh là Admin Server
      const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
      if (isAdmin) {
        const embed = new EmbedBuilder()
          .setTitle('👾 Triệu Hồi Cự Thú Thế Giới')
          .setColor(0xe67e22)
          .setDescription('Hiện tại không có Cự Thú nào thức tỉnh.\n\nLà Quản trị viên máy chủ, đạo hữu có muốn trực tiếp **triệu hồi** một Cự Thú để bắt đầu săn lùng thiên tài địa bảo không?');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`boss_admin_spawn_${guildId}`)
            .setLabel('👹 Triệu Hồi Cự Thú')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('boss_cancel')
            .setLabel('❌ Hủy')
            .setStyle(ButtonStyle.Secondary)
        );

        return await interaction.editReply({ embeds: [embed], components: [row] });
      }

      return await interaction.editReply({
        embeds: [BoTaoEmbed.thongTin('🌌 Thái Bình Thịnh Thế', 'Yêu thú lánh đời, đất trời yên ả. Hiện tại không có Cự Thú thế giới nào giáng lâm.')]
      });
    }
  };

  // Tương tác khi người dùng click vào nút của Cự Thú
  async handleInteraction(interaction) {
    const customId = interaction.customId;
    const guildId = interaction.guildId;

    // 1. Admin bấm triệu hồi Boss
    if (customId === `boss_admin_spawn_${guildId}`) {
      await interaction.deferUpdate();
      
      const client = interaction.client;
      const guild = interaction.guild;
      
      // Hủy tin nhắn triệu hồi
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription('⏳ Đang tiến hành triệu hồi Cự Thú Thái Cổ...')],
        components: []
      });

      await this.trieuHoiWorldBossTuDong(client, guildId, guild);
      
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription('✅ Triệu hồi thành công! Hãy theo dõi thông báo tại kênh giới hạn.')],
        components: []
      });
      return;
    }

    if (customId === 'boss_cancel') {
      await interaction.deferUpdate();
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x7f8c8d).setDescription('Đã hủy yêu cầu.')],
        components: []
      });
      return;
    }

    // 2. Làm mới trạng thái Boss
    if (customId === `boss_refresh_${guildId}`) {
      await interaction.deferUpdate();
      const boss = await WorldBoss.findOne({ where: { idGuild: guildId, active: true } });
      if (!boss) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.thongTin('🌌 Cự Thú Biến Mất', 'Cự Thú thế giới đã bị tiêu diệt hoặc đã rút lui.')],
          components: []
        });
      }
      await interaction.editReply({
        embeds: [buildBossEmbed(boss)],
        components: [buildBossButtons(boss)]
      });
      return;
    }

    // 3. Tấn công Boss
    if (customId === `boss_attack_${guildId}`) {
      await interaction.deferReply({ ephemeral: true });

      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      const boss = await WorldBoss.findOne({ where: { idGuild: guildId, active: true } });
      if (!boss || boss.hp <= 0) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi('Cự Thú đã bị tiêu diệt từ trước!')]
        });
      }

      const stats = await tuSi.layChiSoDayDu();

      // Yêu cầu thể trạng
      if (tuSi.hp <= Math.floor(stats.max_hp * 0.10)) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi('Trạng thái kiệt quệ! Đạo hữu hãy tĩnh dưỡng hồi HP (`/nghi`) hoặc uống thuốc để hồi phục khí huyết trước khi xuất chiến.')]
        });
      }

      // Kích hoạt kỹ năng chủ động của Pháp Bảo khi vào chiến đấu
      let playerAtkMult = 1.0;
      let pbExtraDmg = 0;
      const pbLogs = [];
      const equippedInv = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true } });
      const dharmaTreasures = [];
      for (const eq of equippedInv) {
        const detail = await Item.findByPk(eq.itemId);
        if (detail && detail.loai === 'Pháp Bảo') {
          eq.item = detail;
          dharmaTreasures.push(eq);
        }
      }

      for (const eq of dharmaTreasures) {
        const activeSkill = config.layKyNangPhapBaoActive(eq.item || eq.itemId);
        if (activeSkill) {
          if (activeSkill.loai === 'tan_cong') {
            pbExtraDmg += activeSkill.triGia;
            pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Gây thêm \`+${activeSkill.triGia}\` sát thương.`);
          } else if (activeSkill.loai === 'hoi_mau_pct') {
            const healAmt = Math.floor(stats.max_hp * (activeSkill.triGia / 100));
            tuSi.hp = Math.min(stats.max_hp, tuSi.hp + healAmt);
            pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Hồi phục \`+${healAmt}\` HP (Hiện tại: \`${tuSi.hp}/${stats.max_hp}\`).`);
          } else if (activeSkill.loai === 'tang_cong_pct') {
            playerAtkMult += activeSkill.triGia / 100;
            pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Gia tăng \`+${activeSkill.triGia}%\` Công kích.`);
          }
        }
      }

      // Tính toán sát thương gây ra
      const isPhysical = tuSi.huongTu === 'Thể Tu';
      const playerAtk = Math.floor((isPhysical ? stats.vat_cong : stats.phap_cong) * playerAtkMult);
      const bossDef = isPhysical ? boss.vatPhong : boss.phapPhong;

      // Tải kỹ năng đã học để dùng khi đánh Boss
      const { PlayerSkill } = await import('../models/PlayerSkill.js');
      const { Skill } = await import('../models/Skill.js');

      const learned = await PlayerSkill.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true } });
      const skills = [];
      for (const psk of learned) {
        const detail = await Skill.findByPk(psk.skillId);
        if (detail) {
          skills.push({ detail, capDo: psk.capDo });
        }
      }

      let pDmg = 0;
      const isCrit = Math.random() <= stats.crit_rate;
      let castMsg = '';

      if (skills.length > 0 && Math.random() <= 0.60) {
        const selected = skills[Math.floor(Math.random() * skills.length)];
        const skill = selected.detail;
        const capDo = selected.capDo;
        const skillMult = (skill.satThuong / 100) * (1 + (capDo - 1) * 0.1);
        let rawDmg = playerAtk * skillMult;

        if (isCrit) rawDmg = rawDmg * stats.crit_dmg;
        pDmg = Math.max(10, Math.floor(rawDmg) - bossDef);

        castMsg = `thi triển **${skill.ten} (Cấp ${capDo})**`;
      } else {
        let rawDmg = playerAtk;
        if (isCrit) rawDmg = rawDmg * stats.crit_dmg;
        pDmg = Math.max(10, Math.floor(rawDmg) - bossDef);

        castMsg = `đánh thường`;
      }

      // Giảm máu Boss
      const finalPlayerDmg = pDmg + pbExtraDmg;
      boss.hp = Math.max(0, boss.hp - finalPlayerDmg);

      // Ghi nhận đóng góp sát thương
      const dealers = boss.damageDealers;
      dealers[tuSi.idNguoiDung] = (dealers[tuSi.idNguoiDung] || 0) + finalPlayerDmg;
      boss.damageDealers = dealers; // Save getter/setter JSON

      // Cự Thú phản công tu sĩ
      let bossDmg = Math.max(1, boss.vatCong - stats.vat_phong);
      const isDodge = Math.random() <= stats.ne;
      let dodgeMsg = '';

      if (isDodge) {
        bossDmg = 0;
        dodgeMsg = `💨 Đạo hữu nhanh nhẹn né tránh hoàn hảo đòn vồ!`;
      } else {
        tuSi.hp = Math.max(0, tuSi.hp - bossDmg);
      }

      // Lưu thay đổi tu sĩ
      await tuSi.save();
      await boss.save();

      // Kiểm tra Cự Thú đã bị tiêu diệt hay chưa
      if (boss.hp <= 0) {
        boss.active = false;
        await boss.save();

        const lastHitterId = tuSi.idNguoiDung;

        // Tiến hành phân bổ phần thưởng
        const report = await phanBoPhanThuongBoss(interaction.client, boss, interaction.guild, lastHitterId);

        // Phát thông báo thắng cuộc vào kênh chung
        const channel = await interaction.client.channels.fetch(boss.channelId).catch(() => null);
        if (channel) {
          const finishedEmbed = new EmbedBuilder()
            .setTitle(`🎉 THIÊN ĐẠO CHẤN ĐỘNG: TIÊU DIỆT ${boss.ten}!`)
            .setColor(0x2ecc71)
            .setDescription(
              `✨ **Thiên Đạo hiển hiện** ✨\n` +
              `Cự thú thế giới đã gục ngã dưới sự đồng lòng hiệp lực của các vị đồng đạo tông môn!\n\n` +
              report
            )
            .setTimestamp();

          // Sửa tin nhắn thông báo gốc (để dọn dẹp các nút bấm)
          if (boss.messageId) {
            const originalMsg = await channel.messages.fetch(boss.messageId).catch(() => null);
            if (originalMsg) {
              await originalMsg.edit({
                embeds: [new EmbedBuilder().setTitle(`🎉 ${boss.ten} Đã Bị Tiêu Diệt!`).setColor(0x2ecc71).setDescription(`Cự thú đã bị tiêu diệt thành công bởi các vị đạo hữu! Xem chi tiết ở tin nhắn mới nhất.`)],
                components: []
              });
            }
          }

          // Gửi tin nhắn mới tinh đính kèm tag @everyone để thông báo cho toàn máy chủ
          await channel.send({
            content: '@everyone 📢 **THIÊN ĐẠO THÔNG BÁO: CỰ THÚ ĐÃ BỊ HẠ GỤC!**',
            embeds: [finishedEmbed]
          });
        }

        return await interaction.editReply({
          embeds: [BoTaoEmbed.thanhCong('⚔️ Đại Thắng Cự Thú!', `Đạo hữu gây sát thương quyết định tiêu diệt **${boss.ten}**!\nNhận thưởng kích sát đặc biệt và phần quà toàn Server đã được trao.`)]
        });
      }

      // Nếu Boss chưa chết, cập nhật giao diện tin nhắn chung
      try {
        const channel = await interaction.client.channels.fetch(boss.channelId).catch(() => null);
        if (channel && boss.messageId) {
          const originalMsg = await channel.messages.fetch(boss.messageId).catch(() => null);
          if (originalMsg) {
            await originalMsg.edit({
              embeds: [buildBossEmbed(boss)],
              components: [buildBossButtons(boss)]
            });
          }
        }
      } catch (err) {
        console.error('[Boss System] Lỗi update message gốc:', err);
      }

      // Trả lời kết quả tấn công riêng tư (ephemeral)
      const logs = [];
      if (pbLogs.length > 0) {
        logs.push(pbLogs.join('\n'));
      }
      logs.push(`💥 Đạo hữu **${tuSi.ten}** ${castMsg} lên **${boss.ten}** gây \`${finalPlayerDmg.toLocaleString()}\` sát thương.${isCrit ? ' **(BẠO KÍCH!)**' : ''}`);
      logs.push(dodgeMsg ? dodgeMsg : `👹 Cự thú giận dữ tát lại, gây \`-${bossDmg}\` sát thương (HP của ngươi: \`${tuSi.hp}/${stats.max_hp}\`).`);

      return await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⚔️ Kết Quả Hiệp Đấu')
            .setColor(0xe74c3c)
            .setDescription(logs.join('\n\n'))
            .setTimestamp()
        ]
      });
    }
  }
}

const controller = new BoDieuKhienBoss();
export const danhSachLenhBoss = [controller.lenhBoss];
export { controller as boDieuKhienBoss, phanBoPhanThuongBoss };
