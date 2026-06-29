import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class CauHinhGuild extends Model {
  layDaoNienHienTai() {
    const start = new Date(this.ngayKhoiTao).getTime();
    const minutesPassed = (Date.now() - start) / (1000 * 60);
    return Math.floor(minutesPassed / 15) + 1;
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
  }
}, {
  sequelize,
  modelName: 'CauHinhGuild',
  tableName: 'guild_settings',
  timestamps: false
});

export { CauHinhGuild };
