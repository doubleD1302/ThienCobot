import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class PetTemplate extends Model { }

PetTemplate.init({
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  emoji: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  group: {
    type: DataTypes.STRING(20), // 'linh_thu' or 'than_thu'
    allowNull: false
  },
  species: {
    type: DataTypes.STRING(50), // 'ma_lang', 'loi_diep', etc.
    allowNull: false
  },
  statType: {
    type: DataTypes.STRING(30), // 'vat_cong', 'crit_rate', etc.
    allowNull: false
  },
  statValue: {
    type: DataTypes.FLOAT, // base stats addition percentage (e.g. 0.10)
    allowNull: false
  },
  desc: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'PetTemplate',
  tableName: 'pet_templates',
  timestamps: false
});

export { PetTemplate };
