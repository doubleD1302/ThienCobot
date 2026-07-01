import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class PlayerSkill extends Model {}

PlayerSkill.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  idNguoiDung: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'user_id'
  },
  skillId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'skill_id'
  },
  capDo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'cap_do'
  },
  kinhNghiemSkill: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'kinh_nghiem_skill'
  },
  trangBi: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'trang_bi'
  }
}, {
  sequelize,
  modelName: 'PlayerSkill',
  tableName: 'player_skills',
  timestamps: false
});

export { PlayerSkill };
