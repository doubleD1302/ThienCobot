import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed, layMauCanhGioi } from '../views/BoTaoEmbed.js';
import { AuctionListing } from '../models/AuctionListing.js';
import { Inventory } from '../models/Inventory.js';
import { Item } from '../models/Item.js';
import { TuSi } from '../models/TuSi.js';
import { Op } from 'sequelize';

// ── Hằng số ────────────────────────────────────────────────────────────────
const AUCTION_DURATION_MS = 30 * 60 * 1000; // 30 phút
const MAX_ACTIVE_AUCTIONS = 10;              // Tối đa 10 phiên song song
const MIN_BID_STEP_PCT = 0.05;              // Bước giá tối thiểu +5%
const COMMISSION_PCT = 0.05;               // Hoa hồng 5% khi bán thành công

// ── Helper: tìm kênh chợ đen trong guild ────────────────────────────────────
async function timKenhChoDen(guild) {
  const channels = await guild.channels.fetch().catch(() => null);
  if (!channels) return null;
  return channels.find(ch => {
    if (!ch || !ch.isTextBased() || !ch.name) return false;
    const name = ch.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return name.includes('choден') || name.includes('choden') || ch.name.includes('🎩┃ᴄʜợ-đᴇɴ') || ch.name.includes('cho-den');
  }) || null;
}

// ── Helper: lấy tên người dùng từ guild ────────────────────────────────────
async function layTenNguoiDung(client, userId) {
  try {
    const user = await client.users.fetch(String(userId));
    return user ? (user.displayName || user.username) : `Người dùng #${userId}`;
  } catch (e) {
    return `Người dùng #${userId}`;
  }
}

// ── Helper: tạo các nút hành động cho phiên đấu giá ───────────────────────
function buildAuctionButtons(listingId, isEnded = false) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`auction_bid_${listingId}`)
      .setLabel('💰 Đặt Giá')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isEnded),
    new ButtonBuilder()
      .setCustomId(`auction_refresh_${listingId}`)
      .setLabel('🔄 Làm Mới')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isEnded)
  );
  return [row];
}

// ── Helper: tạo nút làm mới danh sách ────────────────────────────────────
function buildListRefreshButton() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('auction_list_refresh')
      .setLabel('🔄 Làm Mới Danh Sách')
      .setStyle(ButtonStyle.Secondary)
  )];
}

// ── Helper: build embed danh sách phiên đang diễn ra ────────────────────
async function buildListEmbed(client) {
  const listings = await AuctionListing.findAll({
    where: { status: 'active' },
    order: [['endsAt', 'ASC']]
  });

  const embed = new EmbedBuilder()
    .setTitle('🎩 Sàn Đấu Giá Chợ Đen')
    .setColor(0x2c2f33)
    .setTimestamp()
    .setFooter({ text: `${listings.length}/${MAX_ACTIVE_AUCTIONS} phiên đang diễn ra • Thiên Đạo Tu Tiên RPG` });

  if (listings.length === 0) {
    embed.setDescription('> 🕯️ *Sàn đấu giá hiện trống. Hãy dùng `/daugia ban <mã> <giá>` để đưa đồ lên sàn!*');
    return embed;
  }

  const lines = [];
  for (const l of listings) {
    let snapshot = {};
    try { snapshot = JSON.parse(l.itemSnapshot); } catch (e) { }
    const starText = l.nangCapSao > 0 ? ` (+${l.nangCapSao}⭐)` : '';
    const timeLeft = Math.max(0, Math.ceil((new Date(l.endsAt).getTime() - Date.now()) / 60000));
    const bidInfo = l.currentBidderId ? `\`${Number(l.currentPrice).toLocaleString()}\` 🪙` : '*(Chưa có giá)*';
    lines.push(
      `**#${l.id}** ${snapshot.ten || l.itemId}${starText} — ${snapshot.doHiem || ''}\n` +
      `  💰 Giá hiện tại: ${bidInfo} | ⏳ Còn: \`${timeLeft} phút\``
    );
  }
  embed.setDescription(lines.join('\n\n'));
  return embed;
}

// ── Controller chính ────────────────────────────────────────────────────────
class BoDieuKhienDauGia extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhDauGia = {
    data: new SlashCommandBuilder()
      .setName('daugia')
      .setDescription('Sàn đấu giá chợ đen — mua bán vật phẩm theo thời gian thực')
      .addSubcommand(sub =>
        sub.setName('list')
          .setDescription('Xem danh sách phiên đấu giá đang diễn ra'))
      .addSubcommand(sub =>
        sub.setName('ban')
          .setDescription('Đưa vật phẩm từ balo lên sàn đấu giá')
          .addIntegerOption(opt =>
            opt.setName('ma')
              .setDescription('Mã ID vật phẩm trong balo (xem trong /balo)')
              .setRequired(true))
          .addIntegerOption(opt =>
            opt.setName('gia')
              .setDescription('Giá khởi điểm (Linh Thạch)')
              .setRequired(true)
              .setMinValue(100)))
      .addSubcommand(sub =>
        sub.setName('huy')
          .setDescription('Hủy phiên đấu giá của bạn (chỉ khi chưa có ai đặt giá)')
          .addIntegerOption(opt =>
            opt.setName('id')
              .setDescription('ID phiên đấu giá (xem trong /daugia list)')
              .setRequired(true))),

    execute: async (interaction) => {
      const sub = interaction.options.getSubcommand();

      if (sub === 'list') {
        await this._thucHienList(interaction);
      } else if (sub === 'ban') {
        await this._thucHienBan(interaction);
      } else if (sub === 'huy') {
        await this._thucHienHuy(interaction);
      }
    }
  };

  // ── /daugia list ───────────────────────────────────────────────────────────
  async _thucHienList(interaction) {
    await interaction.deferReply();
    const embed = await buildListEmbed(interaction.client);
    await interaction.editReply({
      embeds: [embed],
      components: buildListRefreshButton()
    });
  }

  // ── /daugia ban ───────────────────────────────────────────────────────────
  async _thucHienBan(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const tuSi = await this.layTuSi(interaction.user.id);
    if (!tuSi) {
      return interaction.editReply({ embeds: [BoTaoEmbed.loi('Ngươi chưa có nhân vật! Dùng `/start` để bắt đầu.')] });
    }

    // Kiểm tra số phiên đang diễn ra
    const activeCount = await AuctionListing.count({ where: { status: 'active' } });
    if (activeCount >= MAX_ACTIVE_AUCTIONS) {
      return interaction.editReply({ embeds: [BoTaoEmbed.loi(`Sàn đấu giá đang quá tải! Tối đa ${MAX_ACTIVE_AUCTIONS} phiên cùng lúc. Hãy chờ phiên khác kết thúc.`)] });
    }

    // Kiểm tra người này đã có phiên đang mở chưa
    const myActive = await AuctionListing.findOne({
      where: { sellerId: tuSi.idNguoiDung, status: 'active' }
    });
    if (myActive) {
      return interaction.editReply({ embeds: [BoTaoEmbed.loi(`Đạo hữu đang có phiên đấu giá #${myActive.id} chưa kết thúc! Mỗi người chỉ được mở 1 phiên cùng lúc.`)] });
    }

    const invId = interaction.options.getInteger('ma');
    const startPrice = interaction.options.getInteger('gia');

    // Lấy vật phẩm từ balo
    const invRecord = await Inventory.findOne({
      where: { id: invId, idNguoiDung: tuSi.idNguoiDung }
    });

    if (!invRecord) {
      return interaction.editReply({ embeds: [BoTaoEmbed.loi(`Không tìm thấy vật phẩm có mã \`#${invId}\` trong balo của ngươi.`)] });
    }
    if (invRecord.trangBi) {
      return interaction.editReply({ embeds: [BoTaoEmbed.loi('Không thể đấu giá vật phẩm đang được trang bị! Hãy tháo ra trước.')] });
    }
    if (invRecord.khoa) {
      return interaction.editReply({ embeds: [BoTaoEmbed.loi('Vật phẩm này đang bị khóa! Hãy mở khóa trước khi đấu giá.')] });
    }

    const item = await Item.findByPk(invRecord.itemId);
    if (!item) {
      return interaction.editReply({ embeds: [BoTaoEmbed.loi('Không tìm thấy thông tin vật phẩm này trong hệ thống.')] });
    }
    if (item.loai === 'Skin') {
      return interaction.editReply({ embeds: [BoTaoEmbed.loi('Không thể đấu giá skin hay trang phục thời trang!')] });
    }

    // Tạo snapshot đầy đủ
    const itemSnapshot = JSON.stringify({
      id: item.id,
      ten: item.ten,
      loai: item.loai,
      doHiem: item.doHiem,
      giaCoSo: item.giaCoSo,
      chiSoJson: item.chiSoJson,
      moTa: item.moTa,
      yeuCauCanhGioi: item.yeuCauCanhGioi,
      activeSkillJson: item.activeSkillJson
    });

    // Xóa vật phẩm khỏi balo (escrow)
    if (invRecord.soLuong <= 1) {
      await invRecord.destroy();
    } else {
      invRecord.soLuong -= 1;
      await invRecord.save();
    }

    // Tạo phiên đấu giá
    const endsAt = new Date(Date.now() + AUCTION_DURATION_MS);
    const listing = await AuctionListing.create({
      sellerId: tuSi.idNguoiDung,
      inventoryId: invId,
      itemId: item.id,
      itemSnapshot,
      nangCapSao: invRecord.nangCapSao || 0,
      dongChiSoJson: invRecord.dongChiSoJson || null,
      startPrice,
      currentPrice: startPrice,
      currentBidderId: null,
      status: 'active',
      endsAt
    });

    // Tìm kênh chợ đen và gửi thông báo
    let sentMsg = null;
    for (const [, guild] of interaction.client.guilds.cache) {
      const channel = await timKenhChoDen(guild);
      if (!channel) continue;

      const embed = BoTaoEmbed.dauGiaPhien(listing, tuSi.ten, null);
      const components = buildAuctionButtons(listing.id);

      try {
        sentMsg = await channel.send({
          content: '@everyone 🔨 **Phiên đấu giá mới vừa mở!** Nhanh tay trả giá trước khi hết thời gian!',
          embeds: [embed],
          components
        });
        // Lưu message ID để sau này edit
        listing.messageId = sentMsg.id;
        listing.channelId = channel.id;
        listing.guildId = guild.id;
        await listing.save();
        break;
      } catch (err) {
        console.error('[DauGia] Lỗi khi gửi thông báo đấu giá:', err);
      }
    }

    const starText = invRecord.nangCapSao > 0 ? ` (+${invRecord.nangCapSao}⭐)` : '';
    await interaction.editReply({
      embeds: [BoTaoEmbed.thanhCong(
        '✅ Đã Đưa Lên Sàn Đấu Giá',
        `**${item.ten}${starText}** đã được niêm yết thành công!\n\n` +
        `• **ID Phiên**: \`#${listing.id}\`\n` +
        `• **Giá khởi điểm**: \`${startPrice.toLocaleString()}\` 🪙\n` +
        `• **Kết thúc lúc**: <t:${Math.floor(endsAt.getTime() / 1000)}:R>\n` +
        `• **Hoa hồng**: 5% thu nhập sẽ bị trừ nếu bán thành công\n\n` +
        `${sentMsg ? '📢 Thông báo đã được gửi đến kênh chợ đen!' : '⚠️ Không tìm thấy kênh chợ đen để thông báo.'}`
      )]
    });
  }

  // ── /daugia huy ───────────────────────────────────────────────────────────
  async _thucHienHuy(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const tuSi = await this.layTuSi(interaction.user.id);
    if (!tuSi) {
      return interaction.editReply({ embeds: [BoTaoEmbed.loi('Ngươi chưa có nhân vật!')] });
    }

    const auctionId = interaction.options.getInteger('id');
    const listing = await AuctionListing.findByPk(auctionId);

    if (!listing || listing.status !== 'active') {
      return interaction.editReply({ embeds: [BoTaoEmbed.loi(`Không tìm thấy phiên đấu giá #${auctionId} đang hoạt động.`)] });
    }
    if (String(listing.sellerId) !== String(tuSi.idNguoiDung)) {
      return interaction.editReply({ embeds: [BoTaoEmbed.loi('Đây không phải phiên đấu giá của ngươi!')] });
    }
    if (listing.currentBidderId) {
      return interaction.editReply({ embeds: [BoTaoEmbed.loi('Không thể hủy phiên đã có người đặt giá! Hãy đợi phiên kết thúc tự nhiên.')] });
    }

    // Hoàn trả vật phẩm về balo người bán
    await _traVatPhamChoNguoiDung(listing.sellerId, listing);

    listing.status = 'cancelled';
    await listing.save();

    // Xóa/edit message cũ nếu còn
    await _xoaHoacEditMessage(interaction.client, listing, null, null, true);

    let snap = {};
    try { snap = JSON.parse(listing.itemSnapshot); } catch (e) { }

    await interaction.editReply({
      embeds: [BoTaoEmbed.thanhCong(
        '🚫 Đã Hủy Phiên Đấu Giá',
        `Phiên **#${auctionId}** đã bị hủy.\n**${snap.ten || listing.itemId}** đã được hoàn trả vào balo của ngươi.`
      )]
    });
  }
}

// ── Xử lý button interaction ─────────────────────────────────────────────
const controller = new BoDieuKhienDauGia();

export async function handleAuctionInteraction(interaction) {
  const id = interaction.customId;

  // ── Làm mới danh sách ─────────────────────────────────────────────────
  if (id === 'auction_list_refresh') {
    await interaction.deferUpdate();
    const embed = await buildListEmbed(interaction.client);
    await interaction.editReply({
      embeds: [embed],
      components: buildListRefreshButton()
    });
    return;
  }

  // ── Làm mới 1 phiên cụ thể ───────────────────────────────────────────
  if (id.startsWith('auction_refresh_')) {
    await interaction.deferUpdate();
    const listingId = parseInt(id.replace('auction_refresh_', ''));
    const listing = await AuctionListing.findByPk(listingId);

    if (!listing || listing.status !== 'active') {
      await interaction.followUp({ content: '⚠️ Phiên đấu giá này đã kết thúc hoặc không tồn tại.', ephemeral: true });
      return;
    }

    const sellerName = await layTenNguoiDung(interaction.client, listing.sellerId);
    const bidderName = listing.currentBidderId ? await layTenNguoiDung(interaction.client, listing.currentBidderId) : null;
    const embed = BoTaoEmbed.dauGiaPhien(listing, sellerName, bidderName);

    await interaction.editReply({
      embeds: [embed],
      components: buildAuctionButtons(listingId)
    });
    return;
  }

  // ── Đặt giá (button) ─────────────────────────────────────────────────
  if (id.startsWith('auction_bid_') && !id.startsWith('auction_bid_modal_')) {
    const listingId = parseInt(id.replace('auction_bid_', ''));
    const listing = await AuctionListing.findByPk(listingId);

    if (!listing || listing.status !== 'active') {
      return interaction.reply({ content: '⚠️ Phiên đấu giá này đã kết thúc hoặc không tồn tại.', ephemeral: true });
    }
    if (new Date() >= new Date(listing.endsAt)) {
      return interaction.reply({ content: '⌛ Phiên đấu giá này đã hết thời gian!', ephemeral: true });
    }
    if (String(listing.sellerId) === String(interaction.user.id)) {
      return interaction.reply({ content: '🚫 Ngươi không thể đặt giá cho phiên đấu giá của chính mình!', ephemeral: true });
    }

    const minBid = Math.ceil(Number(listing.currentPrice) * 1.05);

    // Hiện modal nhập giá
    const modal = new ModalBuilder()
      .setCustomId(`auction_bid_modal_${listingId}`)
      .setTitle(`💰 Đặt Giá Phiên #${listingId}`);

    const bidInput = new TextInputBuilder()
      .setCustomId('bid_amount')
      .setLabel(`Nhập giá (tối thiểu: ${minBid.toLocaleString()} 🪙)`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(`Ví dụ: ${minBid.toLocaleString()}`)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(bidInput));
    await interaction.showModal(modal);
    return;
  }

  // ── Xử lý modal submit đặt giá ────────────────────────────────────────
  if (id.startsWith('auction_bid_modal_')) {
    await interaction.deferReply({ ephemeral: true });
    const listingId = parseInt(id.replace('auction_bid_modal_', ''));
    const bidAmountStr = interaction.fields.getTextInputValue('bid_amount').replace(/[^0-9]/g, '');
    const bidAmount = parseInt(bidAmountStr);

    if (isNaN(bidAmount) || bidAmount <= 0) {
      return interaction.editReply({ content: '❌ Giá đặt không hợp lệ! Vui lòng nhập số nguyên dương.' });
    }

    const listing = await AuctionListing.findByPk(listingId);
    if (!listing || listing.status !== 'active') {
      return interaction.editReply({ content: '⚠️ Phiên đấu giá đã kết thúc!' });
    }
    if (new Date() >= new Date(listing.endsAt)) {
      return interaction.editReply({ content: '⌛ Phiên đấu giá đã hết thời gian!' });
    }
    if (String(listing.sellerId) === String(interaction.user.id)) {
      return interaction.editReply({ content: '🚫 Ngươi không thể đặt giá cho phiên đấu giá của chính mình!' });
    }

    const minBid = Math.ceil(Number(listing.currentPrice) * 1.05);
    if (bidAmount < minBid) {
      return interaction.editReply({ content: `❌ Giá đặt phải ít nhất \`${minBid.toLocaleString()}\` 🪙 (+5% so với giá hiện tại).` });
    }

    // Lấy người đặt giá
    const nguoiDat = await TuSi.findByPk(interaction.user.id);
    if (!nguoiDat) {
      return interaction.editReply({ content: '❌ Ngươi chưa có nhân vật! Hãy dùng `/start` để bắt đầu.' });
    }
    if (nguoiDat.linhThach < bidAmount) {
      return interaction.editReply({ content: `❌ Không đủ Linh Thạch! Ngươi có \`${nguoiDat.linhThach.toLocaleString()}\` 🪙 nhưng cần \`${bidAmount.toLocaleString()}\` 🪙.` });
    }

    // Hoàn tiền cho người dẫn đầu cũ (nếu có)
    if (listing.currentBidderId) {
      const nguoiCu = await TuSi.findByPk(listing.currentBidderId);
      if (nguoiCu) {
        nguoiCu.linhThach += Number(listing.currentPrice);
        await nguoiCu.save();
      }
    }

    // Trừ tiền người đặt mới
    nguoiDat.linhThach -= bidAmount;
    await nguoiDat.save();

    // Cập nhật phiên
    listing.currentPrice = bidAmount;
    listing.currentBidderId = nguoiDat.idNguoiDung;
    await listing.save();

    // Edit embed trong kênh
    const sellerName = await layTenNguoiDung(interaction.client, listing.sellerId);
    const embed = BoTaoEmbed.dauGiaPhien(listing, sellerName, nguoiDat.ten);

    await _capNhatEmbedPhien(interaction.client, listing, embed);

    await interaction.editReply({
      content: `✅ Đặt giá thành công **\`${bidAmount.toLocaleString()}\` 🪙** cho phiên **#${listingId}**!\n• Linh Thạch còn lại: \`${nguoiDat.linhThach.toLocaleString()}\` 🪙\n• Nếu có người trả giá cao hơn, tiền sẽ được hoàn lại tự động.`
    });
  }
}

// ── Helper nội bộ: cập nhật embed phiên trong Discord ─────────────────────
async function _capNhatEmbedPhien(client, listing, embed) {
  if (!listing.channelId || !listing.messageId) return;
  try {
    const channel = await client.channels.fetch(listing.channelId).catch(() => null);
    if (!channel) return;
    const msg = await channel.messages.fetch(listing.messageId).catch(() => null);
    if (!msg) return;
    const isEnded = listing.status !== 'active';
    await msg.edit({ embeds: [embed], components: buildAuctionButtons(listing.id, isEnded) });
  } catch (e) {
    console.error('[DauGia] Lỗi cập nhật embed:', e.message);
  }
}

// ── Helper nội bộ: xóa hoặc edit message kết thúc ─────────────────────────
async function _xoaHoacEditMessage(client, listing, sellerName, bidderName, isCancelled = false) {
  if (!listing.channelId || !listing.messageId) return;
  try {
    const channel = await client.channels.fetch(listing.channelId).catch(() => null);
    if (!channel) return;
    const msg = await channel.messages.fetch(listing.messageId).catch(() => null);
    if (!msg) return;

    let snap = {};
    try { snap = JSON.parse(listing.itemSnapshot); } catch (e) { }
    const starText = listing.nangCapSao > 0 ? ` (+${listing.nangCapSao}⭐)` : '';

    let resultEmbed;
    if (isCancelled) {
      resultEmbed = new EmbedBuilder()
        .setTitle(`🚫 Phiên Đấu Giá #${listing.id} Đã Bị Hủy`)
        .setColor(0x95a5a6)
        .setDescription(`**${snap.ten || listing.itemId}${starText}** đã bị người bán thu hồi.`)
        .setTimestamp();
    } else if (listing.currentBidderId) {
      const winner = bidderName || `<@${listing.currentBidderId}>`;
      const commission = Math.floor(Number(listing.currentPrice) * COMMISSION_PCT);
      const sellerReceives = Number(listing.currentPrice) - commission;
      resultEmbed = new EmbedBuilder()
        .setTitle(`🎉 Phiên Đấu Giá #${listing.id} Kết Thúc!`)
        .setColor(0x2ecc71)
        .setDescription(
          `**${snap.ten || listing.itemId}${starText}** đã được bán thành công!\n\n` +
          `🏆 **Người thắng**: **${winner}**\n` +
          `💰 **Giá thành**: \`${Number(listing.currentPrice).toLocaleString()}\` 🪙\n` +
          `🧧 **Người bán nhận**: \`${sellerReceives.toLocaleString()}\` 🪙 (sau 5% hoa hồng)`
        )
        .setTimestamp()
        .setFooter({ text: 'Thiên Đạo Tu Tiên RPG • Sàn Đấu Giá' });
    } else {
      resultEmbed = new EmbedBuilder()
        .setTitle(`⌛ Phiên Đấu Giá #${listing.id} Hết Hạn`)
        .setColor(0xe74c3c)
        .setDescription(`**${snap.ten || listing.itemId}${starText}** không có người mua, đã được hoàn trả cho người bán.`)
        .setTimestamp();
    }

    await msg.edit({ embeds: [resultEmbed], components: [] });
  } catch (e) {
    console.error('[DauGia] Lỗi cập nhật message kết thúc:', e.message);
  }
}

// ── Helper nội bộ: trả vật phẩm về balo người sở hữu ─────────────────────
async function _traVatPhamChoNguoiDung(userId, listing) {
  // Dùng Inventory.create trực tiếp để giữ nguyên chỉ số phụ và sao nâng cấp
  await Inventory.create({
    idNguoiDung: userId,
    itemId: listing.itemId,
    soLuong: 1,
    trangBi: false,
    nangCapSao: listing.nangCapSao || 0,
    dongChiSoJson: listing.dongChiSoJson || null,
    khoa: false
  });
}


// ── Scheduler kiểm tra phiên hết hạn ─────────────────────────────────────
async function _kiemTraPhienHetHan(client) {
  try {
    const expiredListings = await AuctionListing.findAll({
      where: {
        status: 'active',
        endsAt: { [Op.lte]: new Date() }
      }
    });

    for (const listing of expiredListings) {
      try {
        if (listing.currentBidderId) {
          // Có người thắng: chuyển item cho người thắng + tiền cho người bán
          await _traVatPhamChoNguoiDung(listing.currentBidderId, listing);
          const seller = await TuSi.findByPk(listing.sellerId);
          if (seller) {
            const commission = Math.floor(Number(listing.currentPrice) * COMMISSION_PCT);
            seller.linhThach += (Number(listing.currentPrice) - commission);
            await seller.save();
          }
          const sellerName = await layTenNguoiDung(client, listing.sellerId);
          const bidderName = await layTenNguoiDung(client, listing.currentBidderId);
          await _xoaHoacEditMessage(client, listing, sellerName, bidderName, false);
        } else {
          // Không có ai đặt: hoàn vật phẩm về người bán
          await _traVatPhamChoNguoiDung(listing.sellerId, listing);
          await _xoaHoacEditMessage(client, listing, null, null, false);
        }
        listing.status = 'ended';
        await listing.save();
      } catch (e) {
        console.error(`[DauGia] Lỗi xử lý phiên kết thúc #${listing.id}:`, e);
      }
    }
  } catch (err) {
    if (err && (err.name?.includes('Connection') || err.message?.includes('ETIMEDOUT') || err.message?.includes('EAI_AGAIN') || err.message?.includes('ECONNRESET'))) {
      console.warn('[DauGia] Không thể kết nối cơ sở dữ liệu để kiểm tra phiên hết hạn (Lỗi kết nối/Timeout).');
    } else {
      console.error('[DauGia] Lỗi khi kiểm tra phiên hết hạn:', err);
    }
  }
}

export function khoiDongAuctionSchedule(client) {
  console.log('[DauGia] Khởi động tiến trình kiểm tra phiên đấu giá hết hạn...');

  // Kiểm tra lần đầu sau 30 giây
  setTimeout(() => {
    _kiemTraPhienHetHan(client).catch(err => console.error('[DauGia] Lỗi lần chạy đầu:', err));
  }, 30000);

  // Kiểm tra mỗi 1 phút
  setInterval(() => {
    _kiemTraPhienHetHan(client).catch(err => console.error('[DauGia] Lỗi định kỳ:', err));
  }, 60 * 1000);
}

export const danhSachLenhDauGia = [controller.lenhDauGia];
export { controller as boDieuKhienDauGia };
