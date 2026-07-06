import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

function rollPillQuality() {
  const roll = Math.random() * 100;
  if (roll <= 1) return { phamChat: 'Tiên phẩm', phanTramHoTro: 35 };
  if (roll <= 5) return { phamChat: 'Tuyệt phẩm', phanTramHoTro: 25 };
  if (roll <= 15) return { phamChat: 'Siêu phẩm', phanTramHoTro: 20 };
  if (roll <= 30) return { phamChat: 'Ưu phẩm', phanTramHoTro: 15 };
  if (roll <= 60) return { phamChat: 'Phàm phẩm', phanTramHoTro: 10 };
  return { phamChat: 'Phế phẩm', phanTramHoTro: 5 };
}

class Inventory extends Model {
  static async addVatPham(idNguoiDung, itemId, soLuong = 1, options = {}) {
    const { Item } = await import('./Item.js');
    const { rollDynamicStats } = await import('../config.js');
    
    let item = await Item.findByPk(itemId);
    let isSkin = false;
    if (!item) {
      const { Skin } = await import('./Skin.js');
      const skin = await Skin.findByPk(itemId);
      if (!skin) return null;
      isSkin = true;
      item = skin;
    }

    const isEquipable = !isSkin && ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'].includes(item.loai);
    const isBreakthroughPill = !isSkin && item.id.startsWith('dan_dot_pha_');

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
    } else if (isBreakthroughPill) {
      // Đan đột phá cộng dồn theo phẩm chất (dongChiSoJson)
      const qualityObj = options.quality || rollPillQuality();
      const dongChiSoJson = JSON.stringify(qualityObj);

      const [record, created] = await Inventory.findOrCreate({
        where: { idNguoiDung, itemId, trangBi: false, dongChiSoJson },
        defaults: { soLuong, nangCapSao: 0, dongChiSoJson }
      });
      if (!created) {
        record.soLuong += soLuong;
        await record.save();
      }
      return record;
    } else {
      // Các vật phẩm thường (Đan dược, Linh thảo) cộng dồn số lượng
      const [record, created] = await Inventory.findOrCreate({
        where: { idNguoiDung, itemId, trangBi: false, dongChiSoJson: null },
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
  },
  khoa: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'khoa'
  }
}, {
  sequelize,
  modelName: 'Inventory',
  tableName: 'inventory',
  timestamps: false
});

export { Inventory };
