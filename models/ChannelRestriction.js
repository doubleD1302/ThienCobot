import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

/**
 * Lưu danh sách giới hạn lệnh theo kênh Discord.
 * Mỗi record = 1 kênh bị giới hạn.
 */
class ChannelRestriction extends Model {
  static cache = new Map(); // channelId -> allowedCommands array

  static async loadAllToCache() {
    try {
      const records = await ChannelRestriction.findAll();
      this.cache.clear();
      for (const rec of records) {
        this.cache.set(rec.channelId, rec.allowedCommands);
      }
      console.log(`[ChannelRestriction] Loaded ${this.cache.size} restriction(s) into memory cache.`);
    } catch (err) {
      console.error('[ChannelRestriction] Failed to load restrictions to cache:', err);
    }
  }

  static getRestriction(channelId) {
    return this.cache.get(channelId) || null;
  }
}

ChannelRestriction.init({
  channelId: {
    type: DataTypes.STRING(30),
    primaryKey: true,
    allowNull: false,
    field: 'channel_id'
  },
  channelName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'channel_name'
  },
  allowedCommands: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    field: 'allowed_commands',
    get() {
      try { return JSON.parse(this.getDataValue('allowedCommands') || '[]'); }
      catch { return []; }
    },
    set(val) {
      this.setDataValue('allowedCommands', JSON.stringify(val || []));
    }
  }
}, {
  sequelize,
  modelName:  'ChannelRestriction',
  tableName:  'channel_restrictions',
  timestamps: true
});

export { ChannelRestriction };
