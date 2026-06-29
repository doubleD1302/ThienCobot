import { Sequelize } from 'sequelize';
import * as config from './config.js';

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
