import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class GardenPlot extends Model {}

GardenPlot.init({
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true
  },
  userId: {
    type:      DataTypes.BIGINT,
    allowNull: false,
    field:     'user_id'
  },
  slotIndex: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    field:     'slot_index'
  },
  seedItemId: {
    type:      DataTypes.STRING(50),
    allowNull: true,
    field:     'seed_item_id'
  },
  plantedAt: {
    type:      DataTypes.DATE,
    allowNull: true,
    field:     'planted_at'
  },
  status: {
    type:         DataTypes.STRING(20),
    allowNull:    false,
    defaultValue: 'EMPTY', // 'EMPTY', 'PLANTED', 'READY'
    field:        'status'
  }
}, {
  sequelize,
  modelName:  'GardenPlot',
  tableName:  'garden_plots',
  timestamps: false
});

export { GardenPlot };
