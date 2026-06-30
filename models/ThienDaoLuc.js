import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';

class ThienDaoLuc extends Model {
  static async ghiLuc(suKien, loai = 'System') {
    try {
      const { CauHinhGuild } = await import('./CauHinhGuild.js');
      // Lấy cấu hình guild đầu tiên để tính đạo niên
      const guildConf = await CauHinhGuild.findOne();
      let daoNien = 1;
      if (guildConf) {
        const config = await import('../config.js');
        const elapsedSeconds = Math.floor((Date.now() - new Date(guildConf.created_at || guildConf.createdAt).getTime()) / 1000);
        daoNien = Math.floor(elapsedSeconds / config.DAO_NIEN_SECONDS) + 1;

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
