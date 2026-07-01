import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

/**
 * ShopItem — Bảng shop_items
 * Mỗi bản ghi = 1 dòng hàng hoá trong cửa hàng.
 * item_id tham chiếu đến bảng items (vật phẩm tĩnh).
 */
class ShopItem extends Model {}

ShopItem.init({
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true
  },
  itemId: {
    type:      DataTypes.STRING(50),
    allowNull: false,
    field:     'item_id'
  },
  giaBan: {
    type:         DataTypes.BIGINT,
    allowNull:    false,
    defaultValue: 0,
    field:        'gia_ban'
  },
  /** Loại tiền tệ: 'linh_thach' (mở rộng sau nếu muốn thêm loại khác) */
  giaLoai: {
    type:         DataTypes.STRING(20),
    allowNull:    false,
    defaultValue: 'linh_thach',
    field:        'gia_loai'
  },
  /** -1 = vô hạn */
  soLuongTon: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: -1,
    field:        'so_luong_ton'
  },
  yeuCauCapDo: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 1,
    field:        'yeu_cau_cap_do'
  },
  /** 1 = hiển thị, 0 = ẩn */
  hienThi: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: true,
    field:        'hien_thi'
  },
  /** Số thứ tự sắp xếp hiển thị (nhỏ → trước) */
  thuTu: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0,
    field:        'thu_tu'
  }
}, {
  sequelize,
  modelName:  'ShopItem',
  tableName:  'shop_items',
  timestamps: false
});

export { ShopItem };
