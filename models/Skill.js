import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class Skill extends Model {}

Skill.init({
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false
  },
  ten: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  loai: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  satThuong: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'sat_thuong'
  },
  cooldown: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  yeuCauCanhGioi: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'yeu_cau_canh_gioi'
  },
  congPhapId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'cong_phap_id'
  },
  moTa: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'mo_ta'
  }
}, {
  sequelize,
  modelName: 'Skill',
  tableName: 'skills',
  timestamps: false
});

export { Skill };
