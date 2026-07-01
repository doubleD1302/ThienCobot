import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

/**
 * LichSuMua — Bảng lich_su_mua
 * Ghi lại lịch sử mua hàng của từng người chơi.
 */
class LichSuMua extends Model {}

LichSuMua.init({
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true
  },
  idNguoiDung: {
    type:      DataTypes.BIGINT,
    allowNull: false,
    field:     'user_id'
  },
  itemId: {
    type:      DataTypes.STRING(50),
    allowNull: false,
    field:     'item_id'
  },
  soLuong: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 1,
    field:        'so_luong'
  },
  giaDaTra: {
    type:         DataTypes.BIGINT,
    allowNull:    false,
    defaultValue: 0,
    field:        'gia_da_tra'
  },
  giaLoai: {
    type:         DataTypes.STRING(20),
    allowNull:    false,
    defaultValue: 'linh_thach',
    field:        'gia_loai'
  },
  muaLuc: {
    type:         DataTypes.DATE,
    allowNull:    false,
    defaultValue: DataTypes.NOW,
    field:        'mua_luc'
  }
}, {
  sequelize,
  modelName:  'LichSuMua',
  tableName:  'lich_su_mua',
  timestamps: false
});

export { LichSuMua };
