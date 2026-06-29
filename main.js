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

    console.log('Đang đăng nhập vào Discord...');
    await client.login(DISCORD_TOKEN);
  } catch (error) {
    console.error('Khởi chạy bot thất bại:', error);
    process.exit(1);
  }
}

start();
