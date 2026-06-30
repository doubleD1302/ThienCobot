import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class Abode extends Model {}

Abode.init({
  userId: {
    type:       DataTypes.BIGINT,
    primaryKey: true,
    allowNull:  false,
    field:      'user_id'
  },
  level: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0, // 0 = chưa xây dựng, 1-10 = cấp động phủ
    field:        'level'
  },
  gardenLevel: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 1,
    field:        'garden_level'
  },
  waterCount: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0,
    field:        'water_count'
  },
  lastWatered: {
    type:      DataTypes.DATEONLY,
    allowNull: true,
    field:     'last_watered'
  },
  pillCount: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0,
    field:        'pill_count'
  },
  lastPill: {
    type:      DataTypes.DATEONLY,
    allowNull: true,
    field:     'last_pill'
  }
}, {
  sequelize,
  modelName:  'Abode',
  tableName:  'abodes',
  timestamps: true,
  createdAt:  'created_at',
  updatedAt:  false
});

export { Abode };
