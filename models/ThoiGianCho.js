import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class ThoiGianCho extends Model {
  get duLieu() {
    try {
      return JSON.parse(this.duLieuJson || '{}');
    } catch (e) {
      return {};
    }
  }

  set duLieu(value) {
    this.duLieuJson = JSON.stringify(value || {});
  }
}

ThoiGianCho.init({
  idNguoiDung: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    allowNull: false,
    field: 'user_id'
  },
  hanhDong: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false,
    field: 'hanh_dong'
  },
  hetHan: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'het_han'
  },
  duLieuJson: {
    type: DataTypes.STRING(500),
    allowNull: false,
    defaultValue: '{}',
    field: 'data_json'
  }
}, {
  sequelize,
  modelName: 'ThoiGianCho',
  tableName: 'cooldowns',
  timestamps: false
});

export { ThoiGianCho };
