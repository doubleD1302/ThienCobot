import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class PlayerShop extends Model {}

PlayerShop.init({
  userId: {
    type:          DataTypes.BIGINT,
    primaryKey:    true,
    allowNull:     false,
    field:         'user_id'
  },
  itemsJson: {
    type:          DataTypes.TEXT,
    allowNull:     false,
    field:         'items_json'
  },
  refreshCount: {
    type:          DataTypes.INTEGER,
    allowNull:     false,
    defaultValue: 0,
    field:         'refresh_count'
  },
  lastRefreshed: {
    type:          DataTypes.STRING(20),
    allowNull:     false,
    defaultValue: '',
    field:         'last_refreshed'
  }
}, {
  sequelize,
  modelName:  'PlayerShop',
  tableName:  'player_shops',
  timestamps: false
});

export { PlayerShop };
