import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';
import * as config from '../config.js';

class CauHinhGuild extends Model {
  layDaoNienHienTai() {
    const start = new Date(this.ngayKhoiTao).getTime();
    const secondsPassed = (Date.now() - start) / 1000;
    return Math.floor(secondsPassed / config.DAO_NIEN_SECONDS) + 1;
  }
}

CauHinhGuild.init({
  idGuild: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    allowNull: false,
    autoIncrement: false,
    field: 'guild_id'
  },
  ngayKhoiTao: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  huTaiXiu: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 1000000,
    field: 'hu_tai_xiu'
  },
  bossSpawnType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'moc_gio',
    field: 'boss_spawn_type'
  },
  bossSpawnValue: {
    type: DataTypes.STRING(200),
    allowNull: false,
    defaultValue: '06:00,12:00,22:00',
    field: 'boss_spawn_value'
  },
  bossLastSpawnAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'boss_last_spawn_at'
  }
}, {
  sequelize,
  modelName: 'CauHinhGuild',
  tableName: 'guild_settings',
  timestamps: false
});

export { CauHinhGuild };
