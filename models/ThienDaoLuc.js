import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';
import { EmbedBuilder } from 'discord.js';

class ThienDaoLuc extends Model {
  // Biến tĩnh chứa client instance để gửi thông báo Discord
  static clientInstance = null;

  static async ghiLuc(suKien, loai = 'System') {
    try {
      const { CauHinhGuild } = await import('./CauHinhGuild.js');
      // Lấy cấu hình guild đầu tiên để tính đạo niên
      const guildConf = await CauHinhGuild.findOne();
      let daoNien = 1;
      if (guildConf) {
        // Dùng method chuẩn của model để tính đạo niên từ ngayKhoiTao
        daoNien = guildConf.layDaoNienHienTai();

        // Tự động ghi nhận thông báo chuyển Đạo Niên mới nếu chưa có
        const lastSystemRecord = await ThienDaoLuc.findOne({
          where: { loai: 'System' },
          order: [['id', 'DESC']]
        });
        if (!lastSystemRecord || lastSystemRecord.daoNien < daoNien) {
          await ThienDaoLuc.create({
            daoNien,
            suKien: `🌌 **Thiên Thời Tuần Hoàn**: Tiên Giới chuyển dời, chính thức bước sang **Đạo Niên thứ ${daoNien}**! Linh khí bát hoang chấn động!`,
            loai: 'System'
          });
        }
      }
      
      await ThienDaoLuc.create({
        daoNien,
        suKien,
        loai
      });
      console.log(`[Thiên Đạo Lục] Ghi thành công: ${suKien}`);

      // Tự động gửi thông báo đến kênh 🕳️┃ᴛɪêɴ-ɢɪớɪ và tag everyone
      if (ThienDaoLuc.clientInstance) {
        const client = ThienDaoLuc.clientInstance;
        const guilds = client.guilds.cache;
        for (const [_, guild] of guilds) {
          try {
            const channels = await guild.channels.fetch().catch(() => null);
            if (!channels) continue;

            const targetChannel = channels.find(ch => {
              if (!ch || !ch.isTextBased() || !ch.name) return false;
              const normalized = ch.name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/ᴛ/g, 't')
                .replace(/ɪ/g, 'i')
                .replace(/ɴ/g, 'n')
                .replace(/ɢ/g, 'g')
                .replace(/[^a-z0-9-]/g, '');
              return normalized === 'tien-gioi' || ch.name.includes('ᴛɪêɴ-ɢɪớɪ');
            });

            if (targetChannel) {
              const embed = new EmbedBuilder()
                .setTitle('📜 Thiên Đạo Lục Ký Sự')
                .setDescription(suKien)
                .setColor(0x9b59b6)
                .setTimestamp()
                .setFooter({ text: `Đạo Niên thứ ${daoNien} · Thiên Đạo Lục` });

              await targetChannel.send({
                content: loai === 'Supreme' ? '@everyone' : undefined,
                embeds: [embed]
              }).catch(err => {
                console.error(`[Thiên Đạo Lục Broadcast] Không thể gửi tin nhắn đến guild ${guild.name}:`, err);
              });
            }
          } catch (err) {
            console.error(`[Thiên Đạo Lục Broadcast] Lỗi xử lý guild ${guild.name}:`, err);
          }
        }
      }
    } catch (e) {
      console.error('Lỗi khi ghi Thiên Đạo Lục:', e);
    }
  }
}

ThienDaoLuc.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  daoNien: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'dao_nien'
  },
  suKien: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'su_kien'
  },
  loai: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'System'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'ThienDaoLuc',
  tableName: 'thien_dao_luc',
  timestamps: false
});

export { ThienDaoLuc };
