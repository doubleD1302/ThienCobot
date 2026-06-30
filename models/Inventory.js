import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class Inventory extends Model {
  static async addVatPham(idNguoiDung, itemId, soLuong = 1) {
    const { Item } = await import('./Item.js');
    const { rollDynamicStats } = await import('../config.js');
    
    const item = await Item.findByPk(itemId);
    if (!item) return null;

    const isEquipable = ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'].includes(item.loai);

    if (isEquipable) {
      // Mỗi trang bị chiếm 1 dòng duy nhất, sinh chỉ số ngẫu nhiên
      const records = [];
      for (let i = 0; i < soLuong; i++) {
        const chiSoNgauNhien = rollDynamicStats(item);
        const record = await Inventory.create({
          idNguoiDung,
          itemId,
          soLuong: 1,
          trangBi: false,
          nangCapSao: 0,
          dongChiSoJson: JSON.stringify(chiSoNgauNhien)
        });
        records.push(record);
      }
      return records[0];
    } else {
      // Các vật phẩm thường (Đan dược, Linh thảo) cộng dồn số lượng
      const [record, created] = await Inventory.findOrCreate({
        where: { idNguoiDung, itemId, trangBi: false },
        defaults: { soLuong, nangCapSao: 0, dongChiSoJson: null }
      });
      if (!created) {
        record.soLuong += soLuong;
        await record.save();
      }
      return record;
    }
  }
}

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
  },
  dongChiSoJson: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    field: 'dong_chi_so_json'
  }
}, {
  sequelize,
  modelName: 'Inventory',
  tableName: 'inventory',
  timestamps: false
});

export { Inventory };
