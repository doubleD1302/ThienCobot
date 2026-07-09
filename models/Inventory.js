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
    
    const { Skin } = await import('./Skin.js');
    const skin = await Skin.findByPk(itemId);
    let item = null;
    let isSkin = false;

    if (skin) {
      isSkin = true;
      item = skin;
      await Item.findOrCreate({
        where: { id: itemId },
        defaults: {
          ten: skin.ten,
          loai: 'Skin',
          doHiem: 'Thường',
          giaCoSo: skin.giaVnd,
          chiSoJson: '{}',
          moTa: skin.moTa
        }
      });
    } else {
      item = await Item.findByPk(itemId);
    }

    if (!item) return null;

    const isCard = ['the_vinh_vien', 'the_quy', 'the_thang'].includes(itemId);
    if (isCard) {
      const existing = await Inventory.findOne({
        where: { idNguoiDung, itemId }
      });
      
      const durationMap = {
        'the_thang': 30 * 24 * 60 * 60 * 1000,
        'the_quy': 90 * 24 * 60 * 60 * 1000,
        'the_vinh_vien': null
      };
      
      const duration = durationMap[itemId];
      
      if (existing) {
        let meta = {};
        if (existing.dongChiSoJson) {
          try {
            meta = JSON.parse(existing.dongChiSoJson);
          } catch (e) {}
        }
        
        if (duration !== null) {
          const now = Date.now();
          let currentExpire = meta.expireAt ? Number(meta.expireAt) : now;
          if (currentExpire < now) {
            currentExpire = now;
          }
          meta.expireAt = currentExpire + duration * soLuong;
        }
        
        existing.dongChiSoJson = JSON.stringify(meta);
        existing.soLuong = 1;
        await existing.save();
        return existing;
      } else {
        let meta = {};
        if (duration !== null) {
          meta.expireAt = Date.now() + duration * soLuong;
        }
        const record = await Inventory.create({
          idNguoiDung,
          itemId,
          soLuong: 1,
          trangBi: false,
          nangCapSao: 0,
          dongChiSoJson: JSON.stringify(meta)
        });
        return record;
      }
    }

    const isEquipable = !isSkin && ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'].includes(item.loai);
    const isBreakthroughPill = !isSkin && item.id.startsWith('dan_dot_pha_');
    const isMaterial = !isSkin && item.loai === 'Nguyên liệu';

    if (isEquipable) {
      // Mỗi trang bị chiếm 1 dòng duy nhất, sinh chỉ số ngẫu nhiên
      const records = [];
      for (let i = 0; i < soLuong; i++) {
        let metaObj = null;
        if (item.yeuCauCanhGioi >= 13) {
          let q = options.quality;
          if (!q) {
            const r = Math.random() * 100;
            if (r < 0.5) q = 'Thần Thoại';
            else if (r < 5.0) q = 'Sử Thi';
            else if (r < 20.0) q = 'Hiếm';
            else if (r < 60.0) q = 'Thường';
            else q = 'Phế Phẩm';
          }
          let p = 0;
          if (q === 'Phế Phẩm') p = -5 + Math.random() * 5;
          else if (q === 'Thường') p = Math.random() * 5;
          else if (q === 'Hiếm') p = 5 + Math.random() * 5;
          else if (q === 'Sử Thi') p = 10 + Math.random() * 5;
          else if (q === 'Thần Thoại') p = 15 + Math.random() * 5;

          const chiSoChinhMult = parseFloat((1.0 + p / 100).toFixed(3));
          metaObj = { metadata: true, phamChatTrangBi: q, chiSoChinhMult };
        }

        let finalStats;
        if (options.dongChiSoOverride) {
          // Sử dụng chỉ số được truyền vào (ví dụ từ boss drop)
          finalStats = Array.isArray(options.dongChiSoOverride) ? [...options.dongChiSoOverride] : options.dongChiSoOverride;
          if (metaObj) {
            finalStats = [metaObj, ...finalStats.filter(x => x && !x.metadata)];
          }
        } else {
          finalStats = rollDynamicStats(item, { phamChatTrangBi: metaObj ? metaObj.phamChatTrangBi : null });
          if (metaObj) {
            finalStats.unshift(metaObj);
          }
        }

        const record = await Inventory.create({
          idNguoiDung,
          itemId,
          soLuong: 1,
          trangBi: false,
          nangCapSao: 0,
          dongChiSoJson: JSON.stringify(finalStats)
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
    } else if (isMaterial) {
      // Nguyên liệu cộng dồn theo phẩm chất
      const { rollMaterialQuality } = await import('../config.js');
      const matQuality = options.quality || rollMaterialQuality();
      const dongChiSoJson = JSON.stringify({ phamChat: matQuality });

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
