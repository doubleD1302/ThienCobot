import { Client, GatewayIntentBits } from 'discord.js';
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
import { danhSachLenhBoss } from './controllers/BoDieuKhienBoss.js';
import { danhSachLenhHelp } from './controllers/BoDieuKhienHelp.js';
import { danhSachLenhLiXi } from './controllers/BoDieuKhienLiXi.js';
import { danhSachLenhGacha } from './controllers/BoDieuKhienGacha.js';
import { danhSachLenhAuto } from './controllers/BoDieuKhienAuto.js';
import { danhSachLenhDongGop } from './controllers/BoDieuKhienDongGop.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

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
  ...danhSachLenhDongGop
];

client.once('ready', async () => {
  console.log(`[Refresh Tool] Đang đăng nhập dưới danh tính: ${client.user.tag}`);

  try {
    // 1. Xoá tất cả lệnh Global cũ
    console.log('1. Đang xoá toàn bộ lệnh Global cũ...');
    await client.application.commands.set([]);
    console.log('➔ Đã xoá sạch lệnh Global.');

    // 2. Xoá tất cả lệnh Guild cũ ở mọi Server bot đang tham gia
    console.log('2. Đang quét và xoá toàn bộ lệnh riêng trong các Guild (Server)...');
    const guilds = await client.guilds.fetch();
    for (const [guildId, oauthGuild] of guilds) {
      const guild = await oauthGuild.fetch();
      console.log(`   ➔ Đang dọn dẹp lệnh tại Server: ${guild.name} (${guild.id})...`);
      await guild.commands.set([]);
    }
    console.log('➔ Đã xoá sạch toàn bộ lệnh Guild.');

    // 3. Đăng ký lại lệnh Global mới tinh (bao gồm cả lệnh /shop mới gộp)
    console.log('3. Đang đăng ký lại hệ thống lệnh mới lên Global...');
    const commandsData = tatCaLenh.map(cmd => cmd.data.toJSON());
    await client.application.commands.set(commandsData);
    console.log(`➔ Đã đăng ký thành công ${commandsData.length} lệnh mới tinh!`);

    console.log('\n✅ HOÀN TẤT! Bạn hãy tắt tool này và chạy bot bình thường. Nhớ khởi động lại ứng dụng Discord (hoặc nhấn Ctrl + R) để thấy thay đổi ngay lập tức.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi dọn dẹp và đồng bộ lệnh:', error);
    process.exit(1);
  }
});

client.login(DISCORD_TOKEN);
