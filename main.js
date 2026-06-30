import { Client, GatewayIntentBits, ActivityType, Collection } from 'discord.js';
import { sequelize } from './database.js';
import { DISCORD_TOKEN } from './config.js';
import { danhSachLenhTuSi } from './controllers/BoDieuKhienTuSi.js';
import { danhSachLenhTuLuyen } from './controllers/BoDieuKhienTuLuyen.js';
import { danhSachLenhBicanh } from './controllers/BoDieuKhienBicanh.js';
import { danhSachLenhVatPham } from './controllers/BoDieuKhienVatPham.js';
import { danhSachLenhKyNang } from './controllers/BoDieuKhienKyNang.js';
import { danhSachLenhThienDaoLuc } from './controllers/BoDieuKhienThienDaoLuc.js';
import { danhSachLenhLichLuyen } from './controllers/BoDieuKhienLichLuyen.js';

// Đăng ký các model mới để sequelize đồng bộ
import './models/Item.js';
import './models/Inventory.js';
import './models/Skill.js';
import './models/PlayerSkill.js';
import './models/Dungeon.js';
import './models/ThienDaoLuc.js';

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
  ...danhSachLenhLichLuyen
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

      // Khởi tạo dữ liệu mẫu cho bảng items
      const { Item } = await import('./models/Item.js');
      const itemsCount = await Item.count();
      if (itemsCount === 0) {
        console.log('Khởi tạo dữ liệu mẫu cho bảng items...');
        const config = await import('./config.js');
        const seedItems = config.ITEMS.map(item => ({
          id: item.id,
          ten: item.ten,
          loai: item.loai,
          doHiem: item.doHiem,
          giaCoSo: item.giaCoSo,
          chiSoJson: item.chiSoJson,
          moTa: item.moTa
        }));
        await Item.bulkCreate(seedItems);
        console.log(`Đã tạo thành công ${seedItems.length} vật phẩm mẫu.`);
      }

      // Khởi tạo dữ liệu mẫu cho bảng skills
      const { Skill } = await import('./models/Skill.js');
      const skillsCount = await Skill.count();
      if (skillsCount === 0) {
        console.log('Khởi tạo dữ liệu mẫu cho bảng skills...');
        const config = await import('./config.js');
        const seedSkills = config.SKILLS.map(sk => ({
          id: sk.id,
          ten: sk.ten,
          loai: sk.loai,
          satThuong: sk.satThuong,
          cooldown: sk.cooldown,
          yeuCauCanhGioi: sk.yeuCauCanhGioi,
          congPhapId: sk.congPhapId,
          moTa: sk.moTa
        }));
        await Skill.bulkCreate(seedSkills);
        console.log(`Đã tạo thành công ${seedSkills.length} kỹ năng mẫu.`);
      }

      // Khởi tạo dữ liệu mẫu cho bảng dungeons
      const { Dungeon } = await import('./models/Dungeon.js');
      const dungeonsCount = await Dungeon.count();
      if (dungeonsCount === 0) {
        console.log('Khởi tạo dữ liệu mẫu cho bảng dungeons...');
        const config = await import('./config.js');
        const seedDungeons = config.DUNGEONS.map(dg => ({
          id: dg.id,
          ten: dg.ten,
          capDoYeuCau: dg.capDoYeuCau,
          canhGioiYeuCauText: dg.canhGioiYeuCauText,
          quaiVatJson: JSON.stringify(dg.quaiVat),
          thuongJson: JSON.stringify(dg.thuong),
          dropsJson: JSON.stringify(dg.drops)
        }));
        await Dungeon.bulkCreate(seedDungeons);
        console.log(`Đã tạo thành công ${seedDungeons.length} bí cảnh phụ bản mẫu.`);
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
