import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class Item extends Model {
  get chiSo() {
    try {
      return JSON.parse(this.chiSoJson || '{}');
    } catch (e) {
      return {};
    }
  }

  set chiSo(value) {
    this.chiSoJson = JSON.stringify(value || {});
  }
}

Item.init({
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
    type: DataTypes.STRING(30),
    allowNull: false
  },
  doHiem: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'do_hiem'
  },
  giaCoSo: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
    field: 'gia_co_so'
  },
  chiSoJson: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '{}',
    field: 'chi_so_json'
  },
  moTa: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'mo_ta'
  },
  yeuCauCanhGioi: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'yeu_cau_canh_gioi'
  }
}, {
  sequelize,
  modelName: 'Item',
  tableName: 'items',
  timestamps: false
});

export { Item };
