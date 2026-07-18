import { Sequelize } from 'sequelize';
import * as config from './config.js';

if (process.env.NODE_ENV !== 'test') {
  if (process.env.PORT && !process.env.DATABASE_URL) {
    console.warn("\x1b[33m%s\x1b[0m", "⚠️  CẢNH BÁO MẤT DỮ LIỆU:");
    console.warn("\x1b[33m%s\x1b[0m", "Bạn đang chạy bot trên máy chủ Cloud/Pterodactyl (phát hiện cổng PORT) nhưng chưa cấu hình biến môi trường DATABASE_URL.");
    console.warn("\x1b[33m%s\x1b[0m", "Bot đang tự động sử dụng SQLite fallback ('thienco.db').");
    console.warn("\x1b[33m%s\x1b[0m", "LƯU Ý: Mọi dữ liệu SQLite (nhân vật, cooldown,...) sẽ bị XÓA SẠCH hoàn toàn khi bạn cập nhật code (git clean, redeploy, rebuild, reinstall) do file thienco.db bị xóa.");
    console.warn("\x1b[36m%s\x1b[0m", "👉 KHUYẾN NGHỊ: Hãy thiết lập biến môi trường DATABASE_URL trên bảng điều khiển hosting của bạn (ví dụ: Koyeb, Render, Pterodactyl) trỏ đến một cơ sở dữ liệu MySQL/TiDB Cloud lâu dài để bảo toàn dữ liệu.\n");
  }
}

let sequelize;

if (process.env.NODE_ENV === 'test') {
  // SQLite in-memory for unit tests
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  });
} else if (config.DATABASE_URL.startsWith('mysql:') || config.DATABASE_URL.startsWith('mysql2:') || config.DATABASE_URL.startsWith('mariadb:')) {
  // MySQL / TiDB connection
  sequelize = new Sequelize(config.DATABASE_URL, {
    dialect: 'mysql',
    timezone: '+00:00', // Ensure dates match SQLite and UTC standard, avoiding timezone shifts on cloud hostings
    dialectOptions: {
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false // Required for TiDB Cloud connections to work seamlessly without downloading local CA file
      }
    },
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    },
    retry: {
      max: 5,
      match: [
        /ETIMEDOUT/,
        /EAI_AGAIN/,
        /ECONNRESET/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /TimeoutError/
      ]
    },
    logging: false
  });
} else {
  // SQLite fallback for local development
  const sqliteFile = config.DATABASE_URL.startsWith('sqlite:')
    ? config.DATABASE_URL.replace('sqlite:', '')
    : 'thienco.db';

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqliteFile || 'thienco.db',
    logging: false
  });
}

export { sequelize };
