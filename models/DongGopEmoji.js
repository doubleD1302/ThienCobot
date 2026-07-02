import { DataTypes } from 'sequelize';
import { sequelize } from '../database.js';

export const DongGopEmoji = sequelize.define('DongGopEmoji', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  idNguoiDung: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tenEmoji: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rawEmoji: {
    type: DataTypes.STRING,
    allowNull: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  trangThai: {
    type: DataTypes.STRING,
    defaultValue: 'PENDING' // PENDING, APPROVED, REJECTED
  }
}, {
  tableName: 'dong_gop_emoji',
  timestamps: true
});
