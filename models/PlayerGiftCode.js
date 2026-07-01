import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class PlayerGiftCode extends Model {}

PlayerGiftCode.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'user_id'
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'code'
  }
}, {
  sequelize,
  modelName: 'PlayerGiftCode',
  tableName: 'player_gift_codes',
  timestamps: true,
  createdAt: 'used_at',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'code']
    }
  ]
});

export { PlayerGiftCode };
