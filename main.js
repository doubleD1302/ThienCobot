import { Client, GatewayIntentBits, ActivityType, Collection } from 'discord.js';
import { sequelize } from './database.js';
import { DISCORD_TOKEN } from './config.js';
import { danhSachLenhTuSi } from './controllers/BoDieuKhienTuSi.js';
import { danhSachLenhTuLuyen } from './controllers/BoDieuKhienTuLuyen.js';

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

const tatCaLenh = [...danhSachLenhTuSi, ...danhSachLenhTuLuyen];
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

  // Thiết lập vòng lặp quét CSDL phát thông báo tu luyện xong chủ động (mỗi 15 giây)
  setInterval(async () => {
    try {
      const { ThoiGianCho } = await import('./models/ThoiGianCho.js');
      const { TuSi } = await import('./models/TuSi.js');
      const { CauHinhGuild } = await import('./models/CauHinhGuild.js');
      const { BoTaoEmbed } = await import('./views/BoTaoEmbed.js');
      const { Op } = await import('sequelize');
      const config = await import('./config.js');

      // Tìm tất cả các cooldown 'cultivate' đã hết hạn
      const expiredCooldowns = await ThoiGianCho.findAll({
        where: {
          hanhDong: 'cultivate',
          hetHan: {
            [Op.lte]: new Date()
          }
        }
      });

      for (const cd of expiredCooldowns) {
        const userId = cd.idNguoiDung;
        const tuSi = await TuSi.findByPk(userId);

        if (tuSi) {
          const duLieu = cd.duLieu || {};
          const daoNien = duLieu.dao_nien || 1;
          const channelId = duLieu.channelId;

          // 1. Tính toán phần thưởng
          const { CanhGioi } = await import('./models/CanhGioi.js');
          const cg = await CanhGioi.findByPk(tuSi.capDo);
          const tocDoCoBan = cg ? cg.tocDoCoBan : config.BASE_EXP_PER_DAO_NIEN;
          const multiplier = tuSi.layHeSoTuLuyen();
          const gainedExp = Math.floor(tocDoCoBan * multiplier * daoNien);
          const gainedStones = Math.floor(10 * tuSi.capDo * daoNien);

          // 2. Cộng thưởng & Hồi phục
          tuSi.linhLuc += gainedExp;
          tuSi.linhThach += gainedStones;
          const stats = tuSi.layChiSo();
          tuSi.hp = Math.min(stats.max_hp, tuSi.hp + Math.floor(stats.max_hp * 0.20 * daoNien));
          tuSi.mp = Math.min(stats.max_mp, tuSi.mp + Math.floor(stats.max_mp * 0.20 * daoNien));

          // 3. Xóa cooldown & Lưu
          await cd.destroy();
          await tuSi.save();

          // 4. Lấy Đạo Niên của Guild để hiển thị
          let guildDaoNien = 1;
          if (channelId) {
            try {
              const channel = await client.channels.fetch(channelId).catch(() => null);
              if (channel && channel.guildId) {
                const setting = await CauHinhGuild.findOne({ where: { idGuild: channel.guildId } });
                if (setting) {
                  guildDaoNien = setting.layDaoNienHienTai();
                } else {
                  // Nếu chưa có cấu hình, tạo mới tại chỗ
                  const newSetting = await CauHinhGuild.create({ idGuild: channel.guildId });
                  guildDaoNien = newSetting.layDaoNienHienTai();
                }
              }

              if (channel) {
                const embed = BoTaoEmbed.thongBaoTuLuyenXong(tuSi, guildDaoNien, gainedExp, gainedStones);
                await channel.send({
                  content: `🔔 Đạo hữu <@${userId}> đã hoàn tất đại chu thiên!`,
                  embeds: [embed]
                }).catch(err => console.error(`Lỗi gửi tin nhắn thông báo tu luyện xong cho user ${userId}:`, err));
              }
            } catch (err) {
              console.error(`Lỗi xử lý gửi thông báo cho channel ${channelId}:`, err);
            }
          }
        } else {
          // Tu sĩ không tồn tại, chỉ xóa cooldown
          await cd.destroy();
        }
      }
    } catch (error) {
      console.error('Lỗi khi chạy quét thời gian chờ tu luyện ngầm:', error);
    }
  }, 15000);
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

// Lắng nghe các tương tác lệnh (Slash Commands)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const lenh = client.commands.get(interaction.commandName);
  if (!lenh) {
    console.error(`Không tìm thấy xử lý cho lệnh: ${interaction.commandName}`);
    return;
  }

  try {
    await lenh.execute(interaction);
  } catch (error) {
    console.error(`Lỗi khi thực thi lệnh ${interaction.commandName}:`, error);

    const tinNhanLoi = {
      content: 'Đã có lỗi xảy ra khi thực thi lệnh này!',
      ephemeral: true
    };

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
    await sequelize.sync();
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
