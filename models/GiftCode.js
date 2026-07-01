import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class GiftCode extends Model {
  get items() {
    try {
      return JSON.parse(this.itemsJson || '[]');
    } catch (e) {
      return [];
    }
  }

  set items(value) {
    this.itemsJson = JSON.stringify(value || []);
  }
}

GiftCode.init({
  code: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false
  },
  linhThach: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'linh_thach'
  },
  linhLuc: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'linh_luc'
  },
  vnd: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'vnd'
  },
  itemsJson: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    field: 'items_json'
  },
  expiredAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expired_at'
  }
}, {
  sequelize,
  modelName: 'GiftCode',
  tableName: 'gift_codes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

export { GiftCode };
