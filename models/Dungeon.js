import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class Dungeon extends Model {
  get quaiVat() {
    try {
      return JSON.parse(this.quaiVatJson || '{}');
    } catch (e) {
      return {};
    }
  }

  set quaiVat(value) {
    this.quaiVatJson = JSON.stringify(value || {});
  }

  get thuong() {
    try {
      return JSON.parse(this.thuongJson || '{}');
    } catch (e) {
      return {};
    }
  }

  set thuong(value) {
    this.thuongJson = JSON.stringify(value || {});
  }

  get drops() {
    try {
      return JSON.parse(this.dropsJson || '[]');
    } catch (e) {
      return [];
    }
  }

  set drops(value) {
    this.dropsJson = JSON.stringify(value || []);
  }
}

Dungeon.init({
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false
  },
  ten: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  capDoYeuCau: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'cap_do_yeu_cau'
  },
  canhGioiYeuCauText: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'canh_gioi_yeu_cau_text'
  },
  quaiVatJson: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '{}',
    field: 'quai_vat_json'
  },
  thuongJson: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '{}',
    field: 'thuong_json'
  },
  dropsJson: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    field: 'drops_json'
  }
}, {
  sequelize,
  modelName: 'Dungeon',
  tableName: 'dungeons',
  timestamps: false
});

export { Dungeon };
