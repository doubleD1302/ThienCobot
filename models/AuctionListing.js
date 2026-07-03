import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class AuctionListing extends Model {}

AuctionListing.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Người bán
  sellerId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'seller_id'
  },
  // ID bản ghi inventory gốc (dùng để tracking, item đã bị escrow)
  inventoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'inventory_id'
  },
  // Item ID
  itemId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'item_id'
  },
  // Snapshot đầy đủ thông tin item (JSON) tại thời điểm niêm yết
  itemSnapshot: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'item_snapshot'
  },
  // Chỉ số nâng sao
  nangCapSao: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'nang_cap_sao'
  },
  // Dòng chỉ số phụ (JSON)
  dongChiSoJson: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    field: 'dong_chi_so_json'
  },
  // Giá khởi điểm người bán đặt
  startPrice: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'start_price'
  },
  // Giá cao nhất hiện tại
  currentPrice: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'current_price'
  },
  // Người đang dẫn đầu đặt giá
  currentBidderId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    defaultValue: null,
    field: 'current_bidder_id'
  },
  // Trạng thái: 'active' | 'ended' | 'cancelled'
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'active'
  },
  // Thời điểm kết thúc phiên
  endsAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'ends_at'
  },
  // Discord message ID của embed thông báo đấu giá
  messageId: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
    field: 'message_id'
  },
  // Discord channel ID chứa tin nhắn đấu giá
  channelId: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
    field: 'channel_id'
  },
  // Discord guild ID
  guildId: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
    field: 'guild_id'
  }
}, {
  sequelize,
  modelName: 'AuctionListing',
  tableName: 'auction_listings',
  timestamps: true
});

export { AuctionListing };
