import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class WorldBoss extends Model {
  get damageDealers() {
    try {
      return JSON.parse(this.damageDealersJson || '{}');
    } catch {
      return {};
    }
  }

  set damageDealers(val) {
    this.damageDealersJson = JSON.stringify(val || {});
  }
}

WorldBoss.init({
  idGuild: {
    type: DataTypes.STRING(30),
    primaryKey: true,
    allowNull: false,
    field: 'guild_id'
  },
  channelId: {
    type: DataTypes.STRING(30),
    allowNull: false,
    field: 'channel_id'
  },
  messageId: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'message_id'
  },
  ten: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  maxHp: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'max_hp'
  },
  hp: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  vatCong: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
    field: 'vat_cong'
  },
  phapCong: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
    field: 'phap_cong'
  },
  vatPhong: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
    field: 'vat_phong'
  },
  phapPhong: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
    field: 'phap_phong'
  },
  giap: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10
  },
  damageDealersJson: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '{}',
    field: 'damage_dealers_json'
  },
  hetHan: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'het_han'
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'WorldBoss',
  tableName: 'world_bosses',
  timestamps: true
});

export { WorldBoss };
