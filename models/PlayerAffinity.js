import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class PlayerAffinity extends Model {}

PlayerAffinity.init({
  userIdA: {
    type:      DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true,
    field:     'user_id_a'
  },
  userIdB: {
    type:      DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true,
    field:     'user_id_b'
  },
  points: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0,
    field:        'points'
  }
}, {
  sequelize,
  modelName:  'PlayerAffinity',
  tableName:  'player_affinities',
  timestamps: false
});

export { PlayerAffinity };
