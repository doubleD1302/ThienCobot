import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

/**
 * Lưu danh sách giới hạn lệnh theo kênh Discord.
 * Mỗi record = 1 kênh bị giới hạn.
 */
class ChannelRestriction extends Model {}

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
