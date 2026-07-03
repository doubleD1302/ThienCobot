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
import { danhSachLenhHelp } from './controllers/BoDieuKhienHelp.js';
import { danhSachLenhLiXi } from './controllers/BoDieuKhienLiXi.js';
import { danhSachLenhGacha } from './controllers/BoDieuKhienGacha.js';
import { danhSachLenhAuto, khoiDongAutoSchedule } from './controllers/BoDieuKhienAuto.js';
import { danhSachLenhDongGop } from './controllers/BoDieuKhienDongGop.js';
import { danhSachLenhDmg } from './controllers/BoDieuKhienDmg.js';
import { danhSachLenhDauGia, khoiDongAuctionSchedule, handleAuctionInteraction } from './controllers/BoDieuKhienDauGia.js';

// Đăng ký các model mới để sequelize đồng bộ
import './models/DongGopEmoji.js';
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
import { ChannelRestriction } from './models/ChannelRestriction.js';
import './models/WorldBoss.js';
import './models/GiftCode.js';
import './models/PlayerGiftCode.js';
import './models/AuctionListing.js';
// Bắt các lỗi promise không được catch toàn cục, tránh crash bot
process.on('unhandledRejection', error => {
  if (error && error.code === 10062) {
    console.warn('[Warning] Phát hiện Unhandled Rejection (Unknown interaction) - Thao tác tương tác đã hết hạn hoặc bị hủy bởi Discord.');
    return;
  }
  console.error('Unhandled promise rejection:', error);
});

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
  ...danhSachLenhBoss,
  ...danhSachLenhHelp,
  ...danhSachLenhLiXi,
  ...danhSachLenhGacha,
  ...danhSachLenhAuto,
  ...danhSachLenhDongGop,
  ...danhSachLenhDmg,
  ...danhSachLenhDauGia
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

  // Đăng ký client vào model ThienDaoLuc để gửi thông báo tự động
  const { ThienDaoLuc } = await import('./models/ThienDaoLuc.js');
  ThienDaoLuc.clientInstance = client;

  // Tải giới hạn kênh vào bộ nhớ đệm
  const { ChannelRestriction } = await import('./models/ChannelRestriction.js');
  await ChannelRestriction.loadAllToCache();

  // Khởi động tiến trình quản lý Cự Thú
  boDieuKhienBoss.khoiThaoBossSchedule(client);
  // Khởi động tiến trình gửi Bảng Xếp Hạng tự động mỗi 10 phút
  khoiDongBxhAutoSchedule(client);
  // Khởi động tiến trình tự động tu luyện bát hoang
  khoiDongAutoSchedule(client);
  // Khởi động tiến trình kiểm tra phiên đấu giá hết hạn
  khoiDongAuctionSchedule(client);
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

  // Xử lý các nút bấm tương tác Giật Lì Xì
  if (interaction.isButton() && interaction.customId.startsWith('lixi_grab_')) {
    try {
      const { handleLixiGrab } = await import('./controllers/BoDieuKhienLiXi.js');
      await handleLixiGrab(interaction);
    } catch (err) {
      console.error('Lỗi khi xử lý tương tác nút Lì Xì:', err);
    }
    return;
  }

  // Xử lý các nút bấm tương tác Đấu Giá (và modal submit đấu giá)
  if (
    (interaction.isButton() && interaction.customId.startsWith('auction_')) ||
    (interaction.isModalSubmit() && interaction.customId.startsWith('auction_bid_modal_'))
  ) {
    try {
      await handleAuctionInteraction(interaction);
    } catch (err) {
      console.error('Lỗi khi xử lý tương tác Đấu Giá:', err);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const lenh = client.commands.get(interaction.commandName);
  if (!lenh) {
    console.error(`Không tìm thấy xử lý cho lệnh: ${interaction.commandName}`);
    return;
  }

  // ── Kiểm tra giới hạn lệnh theo kênh (lấy từ memory cache) ─────────────
  try {
    const allowedCommands = ChannelRestriction.getRestriction(interaction.channelId);
    if (allowedCommands) {
      if (!allowedCommands.includes(interaction.commandName)) {
        const allowedList = allowedCommands.map(c => `\`/${c}\``).join(', ') || '*Không có lệnh nào*';
        return await interaction.reply({
          content: `🚫 **Kênh này chỉ cho phép sử dụng**: ${allowedList}\nHãy đến kênh phù hợp để dùng lệnh \`/${interaction.commandName}\`.`,
          ephemeral: true
        });
      }
    }
  } catch (_) { }

  try {
    await lenh.execute(interaction);
  } catch (error) {
    if (error.code === 10062) {
      console.warn(`[Warning] Tương tác lệnh /${interaction.commandName} đã hết hạn trước khi phản hồi (Unknown interaction).`);
      return;
    }

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
      await interaction.followUp(tinNhanLoi).catch(err => {
        if (err.code !== 10062) console.error('Failed to send error reply:', err);
      });
    } else {
      await interaction.reply(tinNhanLoi).catch(err => {
        if (err.code !== 10062) console.error('Failed to send error reply:', err);
      });
    }
  }
});

async function start() {
  try {
    console.log('Khởi tạo cơ sở dữ liệu...');
    await sequelize.authenticate();
    // Khắc phục lỗi schema cũ cho pet_templates trước khi sync
    try {
      const queryInterface = sequelize.getQueryInterface();
      const tableNames = await queryInterface.showAllTables();
      const hasPetTemplates = tableNames.some(t => t.toLowerCase() === 'pet_templates');
      if (hasPetTemplates) {
        const petTemplatesDesc = await queryInterface.describeTable('pet_templates');
        if (!petTemplatesDesc.id) {
          console.log('Phát hiện bảng pet_templates bị lỗi schema (thiếu cột id). Tiến hành drop table để tái thiết lập...');
          await queryInterface.dropTable('pet_templates');
        }
      }
    } catch (e) {
      console.warn('[DB Init] Lỗi kiểm tra pet_templates:', e.message);
    }

    // Đồng bộ thay đổi (alter) cho tất cả các bảng để bổ sung các bảng/cột mới tự động
    await sequelize.sync({ alter: true });

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

      const itemsDesc = await queryInterface.describeTable('items');
      if (!itemsDesc.emoji) {
        console.log('Phát hiện thiếu cột emoji trong bảng items. Tiến hành thêm vào...');
        await queryInterface.addColumn('items', 'emoji', {
          type: DataTypes.STRING(100),
          allowNull: true,
          defaultValue: null
        });
      }

      // Sửa lỗi độ dài cột emoji trong bảng pet_templates thành VARCHAR(100)
      try {
        const petTemplatesDesc = await queryInterface.describeTable('pet_templates');
        if (petTemplatesDesc.emoji) {
          console.log('Tiến hành sửa độ dài cột emoji trong bảng pet_templates...');
          await queryInterface.changeColumn('pet_templates', 'emoji', {
            type: DataTypes.STRING(100),
            allowNull: false
          });
          console.log('Đảm bảo độ dài cột emoji trong bảng pet_templates là VARCHAR(100) thành công.');
        }
      } catch (e) {
        console.warn('Lỗi kiểm tra/sửa cột emoji bảng pet_templates:', e.message);
      }

      const petsDesc = await queryInterface.describeTable('pets');
      if (!petsDesc.tien_hoa) {
        console.log('Phát hiện thiếu cột tien_hoa. Tiến hành thêm vào bảng pets...');
        await queryInterface.addColumn('pets', 'tien_hoa', {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'tien_hoa'
        });
      }

      // Thực hiện migration cho các sủng vật đã tiến hóa từ trước
      try {
        const { Pet } = await import('./models/Pet.js');
        const petRarityOrder = ['NORMAL', 'RARE', 'LEGENDARY', 'MYTHIC', 'ANCIENT', 'SUPREME'];
        const allPets = await Pet.findAll();
        for (const pet of allPets) {
          let count = 0;
          const regex = /\[Tiến\s*[Hh]óa\]/g;
          const matches = pet.name.match(regex);
          if (matches) {
            count = matches.length;
          }

          if (count > 0) {
            console.log(`[Migration] Phát hiện sủng vật ${pet.name} có ${count} lần tiến hóa.`);
            let totalEvolves = count;
            let currentRarity = pet.rarity || 'NORMAL';

            if (!petRarityOrder.includes(currentRarity)) {
              currentRarity = 'NORMAL';
            }

            while (totalEvolves >= 10) {
              totalEvolves -= 10;
              const currentIndex = petRarityOrder.indexOf(currentRarity);
              if (currentIndex >= 0 && currentIndex < petRarityOrder.length - 1) {
                currentRarity = petRarityOrder[currentIndex + 1];
              }
            }

            pet.tienHoa = totalEvolves;
            pet.rarity = currentRarity;

            let cleanName = pet.name.replace(/(\s\+\d+|\[Tiến\s*[Hh]óa\]\s*)/g, '').trim();
            if (pet.tienHoa > 0) {
              pet.name = `${cleanName} +${pet.tienHoa}`;
            } else {
              pet.name = cleanName;
            }

            await pet.save();
            console.log(`[Migration] Đã cập nhật sủng vật thành: ${pet.name} (Rarity: ${pet.rarity}, tienHoa: ${pet.tienHoa})`);
          }
        }
      } catch (err) {
        console.error('[Migration] Lỗi khi di cư dữ liệu sủng vật:', err);
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
          moTa: item.moTa,
          emoji: item.emoji || null
        });
      }
      console.log(`Đã đồng bộ thành công ${config.ITEMS.length} vật phẩm mẫu vào CSDL.`);

      // Khởi tạo và đồng bộ dữ liệu mẫu cho bảng pet_templates
      const { PetTemplate } = await import('./models/PetTemplate.js');
      for (const t of config.PET_TEMPLATES_SEED) {
        await PetTemplate.upsert({
          id: t.id,
          name: t.name,
          emoji: t.emoji,
          group: t.group,
          species: t.species,
          statType: t.statType,
          statValue: t.statValue,
          desc: t.desc
        });
      }
      console.log(`Đã đồng bộ thành công ${config.PET_TEMPLATES_SEED.length} mẫu sủng vật vào CSDL.`);

      // Load pet templates cache
      const allTemplates = await PetTemplate.findAll();
      config.loadPetTemplatesIntoCache(allTemplates);

      // Thực hiện migration cho các sủng vật cũ sang hệ thống mới
      const { Pet } = await import('./models/Pet.js');
      const petsToMigrate = await Pet.findAll();
      let migratedCount = 0;
      for (const p of petsToMigrate) {
        if (!p.rarity.startsWith('LT_') && !p.rarity.startsWith('TT_')) {
          const oldType = p.type;
          let newType = oldType;
          let nextRarity = 'LT_1';

          // Bản đồ chuyển đổi chủng loại cũ sang mới
          const isLinh = ['ma_lang', 'loi_diep', 'than_vien'].includes(oldType);
          if (isLinh) {
            if (oldType === 'ma_lang') newType = 'ma_lang_2';
            else if (oldType === 'loi_diep') newType = 'loi_diep_2';
            else if (oldType === 'than_vien') newType = 'than_vien_2';

            if (p.rarity === 'NORMAL') nextRarity = 'LT_1';
            else if (p.rarity === 'RARE') nextRarity = 'LT_2';
            else if (p.rarity === 'LEGENDARY') nextRarity = 'LT_3';
            else nextRarity = 'LT_4';
          } else {
            // Thần Thú
            if (oldType === 'to_long') newType = 'to_long_2';
            else if (oldType === 'phuong_hoang') newType = 'phuong_hoang_1';
            else if (oldType === 'ky_lan') newType = 'ky_lan_1';

            if (p.rarity === 'NORMAL' || p.rarity === 'RARE' || p.rarity === 'LEGENDARY' || p.rarity === 'MYTHIC') nextRarity = 'TT_1';
            else if (p.rarity === 'ANCIENT') nextRarity = 'TT_2';
            else if (p.rarity === 'SUPREME') nextRarity = 'TT_3';
            else nextRarity = 'TT_4';
          }

          p.type = newType;
          p.rarity = nextRarity;
          p.extraEvo = 0;
          p.isMax = false;
          const cleanName = p.name.replace(/(\s\+\d+|\[MAX\]|\[Tiến\s*[Hh]óa\]\s*)/g, '').trim();
          p.name = config.getFormattedPetName(cleanName, nextRarity, p.tienHoa || 0, false);
          await p.save();
          migratedCount++;
        }
      }
      if (migratedCount > 0) {
        console.log(`Đã di trú thành công ${migratedCount} sủng vật cũ sang hệ thống mới.`);
      }

      // Đồng bộ ShopItem cho các hạt giống và đan dược đột phá mới
      const { ShopItem } = await import('./models/ShopItem.js');
      const breakthroughShopItems = [
        { itemId: 'hat_giong_luyen_khi_thao', giaBan: 200, yeuCauCapDo: 1 },
        { itemId: 'dan_dot_pha_1', giaBan: 2000, yeuCauCapDo: 1 },
        { itemId: 'hat_giong_truc_co_thao', giaBan: 200, yeuCauCapDo: 10 },
        { itemId: 'dan_dot_pha_2', giaBan: 2000, yeuCauCapDo: 10 },
        { itemId: 'hat_giong_kim_dan_hoa', giaBan: 200, yeuCauCapDo: 13 },
        { itemId: 'dan_dot_pha_3', giaBan: 2000, yeuCauCapDo: 13 },
        { itemId: 'hat_giong_nguyen_anh_qua', giaBan: 200, yeuCauCapDo: 16 },
        { itemId: 'dan_dot_pha_4', giaBan: 2000, yeuCauCapDo: 16 },
        { itemId: 'hat_giong_hoa_than_chi', giaBan: 200, yeuCauCapDo: 19 },
        { itemId: 'dan_dot_pha_5', giaBan: 2000, yeuCauCapDo: 19 },
        { itemId: 'hat_giong_phan_hu_dang', giaBan: 200, yeuCauCapDo: 22 },
        { itemId: 'dan_dot_pha_6', giaBan: 2000, yeuCauCapDo: 22 },
        { itemId: 'hat_giong_hop_the_lien', giaBan: 200, yeuCauCapDo: 25 },
        { itemId: 'dan_dot_pha_7', giaBan: 2000, yeuCauCapDo: 25 },
        { itemId: 'hat_giong_dai_thua_qua', giaBan: 200, yeuCauCapDo: 28 },
        { itemId: 'dan_dot_pha_8', giaBan: 2000, yeuCauCapDo: 28 },
        { itemId: 'hoa_than_linh_sung_dan', giaBan: 1000000, yeuCauCapDo: 1 },
        { itemId: 'trung_linh_thu_tien', giaBan: 100000, yeuCauCapDo: 1 }
      ];
      for (const entry of breakthroughShopItems) {
        await ShopItem.findOrCreate({
          where: { itemId: entry.itemId },
          defaults: {
            giaBan: entry.giaBan,
            giaLoai: 'Linh thạch',
            soLuongTon: -1,
            yeuCauCapDo: entry.yeuCauCapDo,
            hienThi: true,
            thuTu: 100
          }
        });
      }

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
      // Khởi tạo và đồng bộ Gift Code BOSS
      const { GiftCode } = await import('./models/GiftCode.js');
      await GiftCode.upsert({
        code: 'BOSS',
        linhThach: 0,
        linhLuc: 0,
        vnd: 0,
        itemsJson: '[]'
      });
      console.log('Đã đồng bộ thành công Gift Code BOSS vào CSDL.');
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
  const { Op } = await import('sequelize');

  // 1. Tạo embed Tu Vi
  const playersTuVi = await TuSi.findAll({
    where: {
      idNguoiDung: { [Op.ne]: '541474154130571264' }
    },
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
    where: {
      idNguoiDung: { [Op.ne]: '541474154130571264' }
    },
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

      const bxhChannel = channels.find(ch => {
        if (!ch || !ch.isTextBased() || !ch.name) return false;
        const normalized = ch.name
          .toLowerCase()
          .replace(/ʙ/g, 'b')
          .replace(/х/g, 'x') // Hỗ trợ chữ 'x' Cyrillic
          .replace(/ʜ/g, 'h')
          .replace(/[^a-z0-9]/g, '');
        return normalized === 'bxh' || normalized.includes('bangxephang');
      });
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
