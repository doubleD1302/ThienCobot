import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class Pet extends Model {}

Pet.init({
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
  name: {
    type:      DataTypes.STRING(100),
    allowNull: false
  },
  type: {
    type:      DataTypes.STRING(50),
    allowNull: false
  },
  rarity: {
    type:         DataTypes.STRING(20),
    allowNull:    false,
    defaultValue: 'NORMAL', // 'NORMAL', 'ANCIENT'
    field:        'rarity'
  },
  level: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 1,
    field:        'level'
  },
  exp: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0,
    field:        'exp'
  },
  tuChat: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 100, // Tư chất (ảnh hưởng đến lực lượng chỉ số gia tăng)
    field:        'tu_chat'
  },
  tienHoa: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0,
    field:        'tien_hoa'
  },
  extraEvo: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0,
    field:        'extra_evo'
  },
  isMax: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: false,
    field:        'is_max'
  },
  isActive: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: false,
    field:        'is_active'
  },
  fusedStats: {
    type:         DataTypes.TEXT,
    allowNull:    true,
    field:        'fused_stats'
  },
  cd: {
    type:         DataTypes.INTEGER,
    allowNull:    true,
    field:        'cd'
  }
}, {
  sequelize,
  modelName:  'Pet',
  tableName:  'pets',
  timestamps: false
});

export { Pet };
