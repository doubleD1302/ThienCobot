import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class AdventureEvent extends Model {
  get hieuUng() {
    try {
      return JSON.parse(this.hieuUngJson || '{}');
    } catch (e) {
      return {};
    }
  }

  set hieuUng(value) {
    this.hieuUngJson = JSON.stringify(value || {});
  }
}

AdventureEvent.init({
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false
  },
  ten: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  moTa: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'mo_ta'
  },
  loai: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  hieuUngJson: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '{}',
    field: 'hieu_ung_json'
  }
}, {
  sequelize,
  modelName: 'AdventureEvent',
  tableName: 'adventure_events',
  timestamps: false
});

export { AdventureEvent };
