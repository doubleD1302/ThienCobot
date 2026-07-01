import { Client, GatewayIntentBits, ActivityType, Collection, EmbedBuilder } from 'discord.js';
import { sequelize } from './database.js';
import { DISCORD_TOKEN } from './config.js';
import { danhSachLenhTuSi } from './controllers/BoDieuKhienTuSi.js';
import { danhSachLenhTuLuyen } from './controllers/BoDieuKhienTuLuyen.js';
import { danhSachLenhBicanh } from './controllers/BoDieuKhienBicanh.js';
import { danhSachLenhVatPham } from './controllers/BoDieuKhienVatPham.js';
import { danhSachLenhKyNang } from './controllers/BoDieuKhienKyNang.js';
import { danhSachLenhThienDaoLuc } from './controllers/BoDieuKhienThienDaoLuc.js';
import { danhSachLenhLichLuyen } from './controllers/BoDieuKhienLichLuyen.js';
import { danhSachLenhShop } from './controllers/BoDieuKhienShop.js';
import { danhSachLenhLeaderboard } from './controllers/BoDieuKhienLeaderboard.js';
import { danhSachLenhDongPhu } from './controllers/BoDieuKhienDongPhu.js';
import { danhSachLenhDamDao } from './controllers/BoDieuKhienDamDao.js';
import { danhSachLenhTuongTac } from './controllers/BoDieuKhienTuongTac.js';
import { danhSachLenhAdmin } from './controllers/BoDieuKhienAdmin.js';
import { danhSachLenhBoss, boDieuKhienBoss } from './controllers/BoDieuKhienBoss.js';

// Đăng ký các model mới để sequelize đồng bộ
import './models/Item.js';
import './models/Inventory.js';
import './models/Skill.js';
import './models/PlayerSkill.js';
import './models/Dungeon.js';
import './models/ThienDaoLuc.js';
import './models/AdventureEvent.js';
import './models/ShopItem.js';
import './models/LichSuMua.js';
import './models/Abode.js';
import './models/GardenPlot.js';
import './models/Pet.js';
import './models/ChannelRestriction.js';
import './models/WorldBoss.js';

// Khởi tạo Discord Client với các Intents cần thiết
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Thiết lập danh sách lệnh
client.commands = new Collection();

const tatCaLenh = [
  ...danhSachLenhTuSi,
  ...danhSachLenhTuLuyen,
  ...danhSachLenhBicanh,
  ...danhSachLenhVatPham,
  ...danhSachLenhKyNang,
  ...danhSachLenhThienDaoLuc,
  ...danhSachLenhLichLuyen,
  ...danhSachLenhShop,
  ...danhSachLenhLeaderboard,
  ...danhSachLenhDongPhu,
  ...danhSachLenhDamDao,
  ...danhSachLenhTuongTac,
  ...danhSachLenhAdmin,
  ...danhSachLenhBoss
];
for (const lenh of tatCaLenh) {
  client.commands.set(lenh.data.name, lenh);
}

client.once('ready', async () => {
  console.log(`[Bot Ready] Đã đăng nhập dưới danh tính: ${client.user.tag} (${client.user.id})`);

  // Đồng bộ hóa Slash Commands lên Discord
  try {
    console.log('Đang đồng bộ lệnh slash (/) commands...');
    const commandsData = tatCaLenh.map(cmd => cmd.data.toJSON());
    await client.application.commands.set(commandsData);
    console.log(`Đã đăng ký thành công ${commandsData.length} lệnh slash (/) lên hệ thống Discord.`);
  } catch (error) {
    console.error('Lỗi khi đồng bộ slash commands:', error);
  }

  // Cấu hình trạng thái hoạt động của bot
  client.user.setPresence({
    status: 'online',
    activities: [{
      name: 'Thiên Đạo Tu Tiên RPG',
      type: ActivityType.Playing
    }]
  });

  // Khởi động tiến trình quản lý Cự Thú
  boDieuKhienBoss.khoiThaoBossSchedule(client);
  // Khởi động tiến trình gửi Bảng Xếp Hạng tự động mỗi 10 phút
  khoiDongBxhAutoSchedule(client);
});

// Lắng nghe khi bot được thêm vào máy chủ mới để khởi tạo Đạo Niên
client.on('guildCreate', async (guild) => {
  console.log(`[Bot Joined Guild] Đã tham gia máy chủ: ${guild.name} (${guild.id})`);
  try {
    const { CauHinhGuild } = await import('./models/CauHinhGuild.js');
    await CauHinhGuild.findOrCreate({
      where: { idGuild: guild.id },
      defaults: { ngayKhoiTao: new Date() }
    });
    console.log(`Đã khởi tạo mốc thời gian Đạo Niên cho máy chủ: ${guild.name}`);
  } catch (error) {
    console.error('Lỗi khi khởi tạo cấu hình Guild mới:', error);
  }
});

// Hàm kiểm tra lỗi kết nối đến CSDL / Hosting
function isDbConnectionError(error) {
  if (!error) return false;
  const name = error.name || '';
  const message = error.message || '';
  return name.includes('Connection') || 
         name.includes('Host') || 
         name.includes('AccessDenied') ||
         message.includes('EAI_AGAIN') || 
         message.includes('ETIMEDOUT') ||
         message.includes('connection') ||
         message.includes('database') ||
         message.includes('unreachable');
}

// Lắng nghe các tương tác lệnh (Slash Commands)
client.on('interactionCreate', async interaction => {
  // Xử lý các nút bấm tương tác Cự Thú thế giới
  if (interaction.isButton() && interaction.customId.startsWith('boss_')) {
    try {
      await boDieuKhienBoss.handleInteraction(interaction);
    } catch (err) {
      console.error('Lỗi khi xử lý tương tác nút Boss:', err);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const lenh = client.commands.get(interaction.commandName);
  if (!lenh) {
    console.error(`Không tìm thấy xử lý cho lệnh: ${interaction.commandName}`);
    return;
  }

  // ── Kiểm tra giới hạn lệnh theo kênh (lấy từ Database) ─────────────────
  try {
    const { ChannelRestriction } = await import('./models/ChannelRestriction.js');
    const restriction = await ChannelRestriction.findByPk(interaction.channelId);
    if (restriction) {
      const allowedCommands = restriction.allowedCommands;
      if (!allowedCommands.includes(interaction.commandName)) {
        const allowedList = allowedCommands.map(c => `\`/${c}\``).join(', ') || '*Không có lệnh nào*';
        return await interaction.reply({
          content: `🚫 **Kênh này chỉ cho phép sử dụng**: ${allowedList}\nHãy đến kênh phù hợp để dùng lệnh \`/${interaction.commandName}\`.`,
          ephemeral: true
        });
      }
    }
  } catch (_) {}

  try {
    await lenh.execute(interaction);
  } catch (error) {
    console.error(`Lỗi khi thực thi lệnh ${interaction.commandName}:`, error);

    let tinNhanLoi;
    if (isDbConnectionError(error)) {
      try {
        const { BoTaoEmbed } = await import('./views/BoTaoEmbed.js');
        tinNhanLoi = {
          embeds: [BoTaoEmbed.loiBaoTriHosting()],
          ephemeral: true
        };
      } catch (importErr) {
        console.error('Không thể import BoTaoEmbed:', importErr);
        tinNhanLoi = {
          content: '🌌 Thiên địa chấn động, linh mạch gián đoạn! Kết nối đến bí cảnh (database/hosting) thất bại. Xin vui lòng tĩnh tọa dưỡng thần và thử lại sau.',
          ephemeral: true
        };
      }
    } else {
      tinNhanLoi = {
        content: 'Đã có lỗi xảy ra khi thực thi lệnh này!',
        ephemeral: true
      };
    }

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(tinNhanLoi).catch(err => console.error('Failed to send error reply:', err));
    } else {
      await interaction.reply(tinNhanLoi).catch(err => console.error('Failed to send error reply:', err));
    }
  }
});

async function start() {
  try {
    console.log('Khởi tạo cơ sở dữ liệu...');
    await sequelize.authenticate();
    // Chỉ đồng bộ thay đổi (alter) riêng cho bảng abodes để bổ sung các cột mới
    const { Abode } = await import('./models/Abode.js');
    await Abode.sync({ alter: true });
    const { TuSi } = await import('./models/TuSi.js');
    await TuSi.sync({ alter: true });

    console.log('Cơ sở dữ liệu được đồng bộ hóa thành công.');

    // Khắc phục lỗi schema cũ (autoIncrement trên primary key) & dọn dẹp các bản ghi rác
    try {
      const { DataTypes } = await import('sequelize');
      const queryInterface = sequelize.getQueryInterface();
      
      const playersDesc = await queryInterface.describeTable('players');
      if (playersDesc.user_id && playersDesc.user_id.autoIncrement) {
        console.log('Phát hiện cột user_id trong bảng players có thuộc tính autoIncrement. Tiến hành sửa đổi schema...');
        await queryInterface.changeColumn('players', 'user_id', {
          type: DataTypes.BIGINT,
          primaryKey: true,
          allowNull: false,
          autoIncrement: false
        });
        console.log('Đã sửa đổi cột user_id trong bảng players thành công.');
      }

      if (!playersDesc.last_update_tuvi) {
        console.log('Phát hiện thiếu cột last_update_tuvi. Tiến hành thêm vào bảng players...');
        await queryInterface.addColumn('players', 'last_update_tuvi', {
          type: DataTypes.DATE,
          allowNull: true
        });
      }
      if (!playersDesc.linh_luc_du) {
        console.log('Phát hiện thiếu cột linh_luc_du. Tiến hành thêm vào bảng players...');
        await queryInterface.addColumn('players', 'linh_luc_du', {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0.0
        });
      }
      if (!playersDesc.linh_thach_du) {
        console.log('Phát hiện thiếu cột linh_thach_du. Tiến hành thêm vào bảng players...');
        await queryInterface.addColumn('players', 'linh_thach_du', {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0.0
        });
      }
      
      const cooldownsDesc = await queryInterface.describeTable('cooldowns');
      if (cooldownsDesc.user_id && cooldownsDesc.user_id.autoIncrement) {
        console.log('Phát hiện cột user_id trong bảng cooldowns có thuộc tính autoIncrement. Tiến hành sửa đổi schema...');
        await queryInterface.changeColumn('cooldowns', 'user_id', {
          type: DataTypes.BIGINT,
          primaryKey: true,
          allowNull: false,
          autoIncrement: false
        });
        console.log('Đã sửa đổi cột user_id trong bảng cooldowns thành công.');
      }

      // Dọn dẹp các bản ghi rác từ lỗi autoIncrement trước đó (nếu có)
      const { TuSi } = await import('./models/TuSi.js');
      const { Op } = await import('sequelize');
      const deletedCount = await TuSi.destroy({
        where: {
          idNguoiDung: {
            [Op.lt]: "10000000000000000"
          }
        }
      });
      if (deletedCount > 0) {
        console.log(`Đã dọn dẹp ${deletedCount} bản ghi nhân vật lỗi (ID tự tăng) từ cơ sở dữ liệu.`);
      }

      // Khắc phục lỗi schema cũ cho guild_settings
      const guildSettingsDesc = await queryInterface.describeTable('guild_settings');
      if (guildSettingsDesc.guild_id && guildSettingsDesc.guild_id.autoIncrement) {
        console.log('Phát hiện cột guild_id trong bảng guild_settings có thuộc tính autoIncrement. Tiến hành sửa đổi schema...');
        await queryInterface.changeColumn('guild_settings', 'guild_id', {
          type: DataTypes.BIGINT,
          primaryKey: true,
          allowNull: false,
          autoIncrement: false
        });
        console.log('Đã sửa đổi cột guild_id trong bảng guild_settings thành công.');
      }

      // Dọn dẹp cấu hình guild lỗi (nếu có)
      const { CauHinhGuild } = await import('./models/CauHinhGuild.js');
      const deletedGuildsCount = await CauHinhGuild.destroy({
        where: {
          idGuild: {
            [Op.lt]: "10000000000000000"
          }
        }
      });
      if (deletedGuildsCount > 0) {
        console.log(`Đã dọn dẹp ${deletedGuildsCount} bản ghi cấu hình guild lỗi (ID tự tăng) từ cơ sở dữ liệu.`);
      }

      // Khởi tạo dữ liệu mẫu cho bảng realms (CanhGioi)
      const { CanhGioi } = await import('./models/CanhGioi.js');
      const realmsCount = await CanhGioi.count();
      if (realmsCount === 0) {
        console.log('Khởi tạo dữ liệu mẫu cho bảng realms (CanhGioi)...');
        const config = await import('./config.js');
        const seedData = [];
        for (let lvl = 1; lvl <= 31; lvl++) {
          const { realmName, stageName } = config.layThongTinCanhGioi(lvl);
          const reqExp = config.layLinhLucYeuCau(lvl);
          const baseSpeed = Math.floor(100 * (1.10 ** (lvl - 1)));
          seedData.push({
            capDo: lvl,
            tenCanhGioi: realmName,
            tenTang: stageName,
            linhLucYeuCau: reqExp,
            tocDoCoBan: baseSpeed
          });
        }
        await CanhGioi.bulkCreate(seedData);
        console.log('Đã tạo thành công dữ liệu cảnh giới cho 31 cấp độ.');
      }

      // Khởi tạo và đồng bộ dữ liệu mẫu cho bảng items
      const { Item } = await import('./models/Item.js');
      const config = await import('./config.js');
      for (const item of config.ITEMS) {
        await Item.upsert({
          id: item.id,
          ten: item.ten,
          loai: item.loai,
          doHiem: item.doHiem,
          giaCoSo: item.giaCoSo,
          chiSoJson: item.chiSoJson,
          yeuCauCanhGioi: item.yeuCauCanhGioi || 1,
          moTa: item.moTa
        });
      }
      console.log(`Đã đồng bộ thành công ${config.ITEMS.length} vật phẩm mẫu vào CSDL.`);

      // Khởi tạo và đồng bộ dữ liệu mẫu cho bảng skills
      const { Skill } = await import('./models/Skill.js');
      for (const sk of config.SKILLS) {
        await Skill.upsert({
          id: sk.id,
          ten: sk.ten,
          loai: sk.loai,
          satThuong: sk.satThuong,
          cooldown: sk.cooldown,
          yeuCauCanhGioi: sk.yeuCauCanhGioi,
          congPhapId: sk.congPhapId,
          moTa: sk.moTa
        });
      }
      console.log(`Đã đồng bộ thành công ${config.SKILLS.length} kỹ năng mẫu vào CSDL.`);

      // Khởi tạo và đồng bộ dữ liệu mẫu cho bảng dungeons
      const { Dungeon } = await import('./models/Dungeon.js');
      for (const dg of config.DUNGEONS) {
        await Dungeon.upsert({
          id: dg.id,
          ten: dg.ten,
          capDoYeuCau: dg.capDoYeuCau,
          canhGioiYeuCauText: dg.canhGioiYeuCauText,
          quaiVatJson: JSON.stringify(dg.quaiVat),
          thuongJson: JSON.stringify(dg.thuong),
          dropsJson: JSON.stringify(dg.drops)
        });
      }
      console.log(`Đã đồng bộ thành công ${config.DUNGEONS.length} bí cảnh phụ bản mẫu vào CSDL.`);

      // Khởi tạo dữ liệu mẫu cho bảng adventure_events
      const { AdventureEvent } = await import('./models/AdventureEvent.js');
      const adventureEventsCount = await AdventureEvent.count();
      if (adventureEventsCount === 0) {
        console.log('Khởi tạo dữ liệu mẫu cho bảng adventure_events...');
        const config = await import('./config.js');
        const seedAdventureEvents = config.ADVENTURE_EVENTS.map(evt => ({
          id: evt.id,
          ten: evt.ten,
          moTa: evt.moTa,
          loai: evt.loai,
          hieuUngJson: evt.hieuUngJson
        }));
        await AdventureEvent.bulkCreate(seedAdventureEvents);
        console.log(`Đã tạo thành công ${seedAdventureEvents.length} sự kiện cơ duyên mẫu.`);
      }
    } catch (err) {
      console.error('Không thể tự động sửa đổi schema hoặc dọn dẹp bản ghi rác/seeding:', err);
    }

    console.log('Đang đăng nhập vào Discord...');
    await client.login(DISCORD_TOKEN);

    // Khởi tạo một HTTP server nhỏ phục vụ Health Check cho Koyeb/Render
    import('http').then(({ default: http }) => {
      const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Thiên Đạo Tu Tiên RPG Bot đang hoạt động!');
      });
      const PORT = process.env.PORT || 8000;
      server.listen(PORT, () => {
        console.log(`[Health Check] HTTP Server đang lắng nghe trên cổng ${PORT}`);
      });
    }).catch(err => console.error('Lỗi khi khởi chạy HTTP health check server:', err));

  } catch (error) {
    console.error('Khởi chạy bot thất bại:', error);
    process.exit(1);
  }
}

start();

async function khoiDongBxhAutoSchedule(client) {
  console.log('[BXH Auto] Khởi động tiến trình gửi bảng xếp hạng tự động...');

  // Chạy lần đầu sau 10 giây để tránh nghẽn lúc khởi động, sau đó cứ mỗi 10 phút
  setTimeout(() => {
    guiBxhAuto(client).catch(err => console.error('[BXH Auto] Lỗi khi gửi bxh:', err));
  }, 10_000);

  setInterval(async () => {
    await guiBxhAuto(client).catch(err => console.error('[BXH Auto] Lỗi khi gửi bxh:', err));
  }, 10 * 60 * 1000);
}

async function guiBxhAuto(client) {
  const { TuSi } = await import('./models/TuSi.js');

  // 1. Tạo embed Tu Vi
  const playersTuVi = await TuSi.findAll({
    order: [['level', 'DESC'], ['linhLuc', 'DESC']],
    limit: 10
  });
  const descTuVi = playersTuVi.map((p, idx) => {
    const crown = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🔹';
    return `${crown} **TOP ${idx + 1}.** **${p.ten}**\n` +
           `   *Cảnh giới:* \`${p.canhGioi} - Tầng ${p.tang}\` (Cấp ${p.capDo}) · Exp: \`${p.linhLuc}\``;
  }).join('\n\n');

  const embedTuVi = new EmbedBuilder()
    .setTitle('🏆 Thiên Bảng Tu Vi — TOP Cao Nhân Tu Tiên')
    .setColor(0xf1c40f)
    .setDescription(descTuVi || '_Thiên địa sơ khai, chưa có tu sĩ nào ghi danh._')
    .setTimestamp()
    .setFooter({ text: 'Bảng xếp hạng cập nhật tự động mỗi 10 phút.' });

  // 2. Tạo embed Linh Thach
  const playersLinhThach = await TuSi.findAll({
    order: [['linhThach', 'DESC']],
    limit: 10
  });
  const descLinhThach = playersLinhThach.map((p, idx) => {
    const crown = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🔹';
    return `${crown} **TOP ${idx + 1}.** **${p.ten}**\n` +
           `   *Tài phú:* \`${p.linhThach.toLocaleString()}\` 🪙 Linh Thạch`;
  }).join('\n\n');

  const embedLinhThach = new EmbedBuilder()
    .setTitle('🪙 Phú Hào Bảng — TOP Đại Gia Linh Thạch')
    .setColor(0x3498db)
    .setDescription(descLinhThach || '_Thiên địa sơ khai, chưa có tu sĩ nào ghi danh._')
    .setTimestamp()
    .setFooter({ text: 'Bảng xếp hạng cập nhật tự động mỗi 10 phút.' });

  // 3. Quét toàn bộ Guild của client để tìm kênh tên "bxh"
  const guilds = client.guilds.cache;
  for (const [_, guild] of guilds) {
    try {
      const channels = await guild.channels.fetch().catch(() => null);
      if (!channels) continue;

      const bxhChannel = channels.find(ch => ch && ch.isTextBased() && ch.name && ch.name.toLowerCase() === 'bxh');
      if (bxhChannel) {
        // Dọn dẹp tin nhắn cũ của bot trong kênh này để tránh trôi tin nhắn
        const messages = await bxhChannel.messages.fetch({ limit: 50 }).catch(() => null);
        if (messages) {
          const oldBotMsgs = messages.filter(msg => msg.author.id === client.user.id);
          for (const m of oldBotMsgs.values()) {
            await m.delete().catch(() => null);
          }
        }

        // Gửi 2 bảng xếp hạng mới
        await bxhChannel.send({ embeds: [embedTuVi, embedLinhThach] }).catch(err => {
          console.error(`[BXH Auto] Không thể gửi tin nhắn đến kênh bxh của guild ${guild.name}:`, err);
        });
      }
    } catch (e) {
      console.error(`[BXH Auto] Lỗi khi xử lý guild ${guild.name}:`, e);
    }
  }
}
