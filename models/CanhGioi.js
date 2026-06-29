import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class CanhGioi extends Model {}

CanhGioi.init({
  capDo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    autoIncrement: false,
    field: 'level'
  },
  tenCanhGioi: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'realm_name'
  },
  tenTang: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'stage_name'
  },
  linhLucYeuCau: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'required_exp'
  },
  tocDoCoBan: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'base_speed'
  }
}, {
  sequelize,
  modelName: 'CanhGioi',
  tableName: 'realms',
  timestamps: false
});

export { CanhGioi };
