import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class Inventory extends Model {}

Inventory.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  idNguoiDung: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'user_id'
  },
  itemId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'item_id'
  },
  soLuong: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'so_luong'
  },
  trangBi: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'trang_bi'
  },
  nangCapSao: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'nang_cap_sao'
  }
}, {
  sequelize,
  modelName: 'Inventory',
  tableName: 'inventory',
  timestamps: false
});

export { Inventory };
