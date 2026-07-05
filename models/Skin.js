import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class Skin extends Model {}

Skin.init({
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false
  },
  ten: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  loai: {
    type: DataTypes.STRING(20), // 'background', 'aura', 'skin'
    allowNull: false
  },
  gioiTinh: {
    type: DataTypes.STRING(10), // 'Nam', 'Nữ', 'Cả hai'
    allowNull: false,
    defaultValue: 'Cả hai',
    field: 'gioi_tinh'
  },
  fileAnh: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'file_anh'
  },
  giaVnd: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
    field: 'gia_vnd'
  },
  ngayMoBan: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'ngay_mo_ban'
  },
  ngayTatBan: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'ngay_tat_ban'
  },
  moTa: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'mo_ta'
  }
}, {
  sequelize,
  modelName: 'Skin',
  tableName: 'skins',
  timestamps: false
});

export { Skin };
