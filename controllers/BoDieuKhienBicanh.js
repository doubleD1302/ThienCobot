import { SlashCommandBuilder } from 'discord.js';
import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';
import { ThoiGianCho } from '../models/ThoiGianCho.js';
import { Inventory } from '../models/Inventory.js';
import { Item } from '../models/Item.js';
import * as config from '../config.js';

class BoDieuKhienBicanh extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhBicanh = {
    data: new SlashCommandBuilder()
      .setName('bc')
      .setDescription('Khiêu chiến phó bản bí cảnh hoang cổ để săn lùng thiên tài địa bảo')
      .addSubcommand(sub =>
        sub.setName('danhsach')
          .setDescription('Xem danh sách các bí cảnh phụ bản hiện có')
      )
      .addSubcommand(sub =>
        sub.setName('khieu_chien')
          .setDescription('Bắt đầu vượt ải đấu yêu thú đoạt bảo vật')
          .addStringOption(opt =>
            opt.setName('bicanh_id')
              .setDescription('Mã bí cảnh muốn khiêu chiến (VD: tan_thu_phu_ban)')
              .setRequired(true)
          )
      ),
    execute: async (interaction) => {
      await interaction.deferReply();
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'danhsach') {
        const { Dungeon } = await import('../models/Dungeon.js');
        const dungeons = await Dungeon.findAll();
        
        const embedList = BoTaoEmbed.thongTin(
          "🗻 Danh Sách Bí Cảnh Hoang Cổ",
          dungeons.map(dg => {
            const monster = dg.quaiVat;
            const reward = dg.thuong;
            return `• **${dg.ten}** (Cấp yêu cầu: \`${dg.capDoYeuCau}\` - Cảnh giới: **${dg.canhGioiYeuCauText}**)\n` +
                   `  *Yêu thú gác cổng*: **${monster.ten}** (HP: \`${monster.hp}\` | Công: \`${monster.vatCong || monster.phapCong}\`)\n` +
                   `  *Chiến lợi phẩm*: Exp (\`${reward.expMin} - ${reward.expMax}\`), Linh thạch (\`${reward.stonesMin} - ${reward.stonesMax}\`), và tỷ lệ rớt trang bị/linh dược.\n` +
                   `  *Mã ID*: \`${dg.id}\`\n`;
          }).join('\n')
        );
        return await interaction.editReply({ embeds: [embedList] });
      }

      if (subcommand === 'khieu_chien') {
        const dungeonId = interaction.options.getString('bicanh_id');
        const { Dungeon } = await import('../models/Dungeon.js');
        const dungeon = await Dungeon.findByPk(dungeonId);

        if (!dungeon) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Không tìm thấy bí cảnh nào có mã ID \`${dungeonId}\`.`)]
          });
        }

        // 1. Kiểm tra cảnh giới tối thiểu
        if (tuSi.capDo < dungeon.capDoYeuCau) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Tu vi không đủ! Bí cảnh này yêu cầu cấp độ tối thiểu là **${dungeon.capDoYeuCau}** (${dungeon.canhGioiYeuCauText}).`)]
          });
        }

        // 2. Kiểm tra cooldown khiêu chiến (3 phút)
        const activeCooldown = await this.kiemTraThoiGianCho(tuSi.idNguoiDung, 'dungeon');
        if (activeCooldown) {
          const hetHanTime = new Date(activeCooldown.hetHan).getTime();
          const secondsLeft = Math.max(0, Math.floor((hetHanTime - Date.now()) / 1000));
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi(`Lực kiệt khí hư! Đạo hữu cần tĩnh dưỡng thêm \`${secondsLeft} giây\` trước khi tiếp tục khiêu chiến bí cảnh.`)]
          });
        }

        // Load equipped items for correct stats
        const equippedInv = await Inventory.findAll({
          where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true }
        });
        const equippedItems = [];
        for (const eq of equippedInv) {
          const detail = await Item.findByPk(eq.itemId);
          if (detail) {
            eq.item = detail;
            equippedItems.push(eq);
          }
        }
        const stats = tuSi.layChiSo(equippedInv);

        // 3. Kiểm tra HP tối thiểu (10%)
        if (tuSi.hp <= Math.floor(stats.max_hp * 0.10)) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi("Trạng thái kiệt quệ! Khí huyết của đạo hữu dưới 10%, không đủ sức khiêu chiến yêu thú. Hãy dùng `/nghi` hoặc đan dược trước.")]
          });
        }

        // 4. Khởi chạy Trình mô phỏng trận đánh
        const monster = { ...dungeon.quaiVat };
        let monsterHp = monster.hp;
        let playerHp = tuSi.hp;
        let playerShield = 0;
        const battleLogs = [];
        let isWin = false;
        let round = 1;

        const isPhysical = tuSi.huongTu === 'The Tu';
        const playerAtk = isPhysical ? stats.vat_cong : stats.phap_cong;
        const monsterDef = isPhysical ? monster.vatPhong : monster.phapPhong;

        // Phân loại Cổ Bảo và Pháp Bảo
        const activeTreasures = equippedItems.filter(x => x.item.loai === 'Cổ Bảo Chủ Động');
        const dharmaTreasures = equippedItems.filter(x => x.item.loai === 'Pháp Bảo');

        while (monsterHp > 0 && playerHp > 0 && round <= 15) {
          // Lượt chơi: Người tấn công trước
          let pDmg = Math.max(1, playerAtk - monsterDef);
          const isCrit = Math.random() <= stats.crit_rate;
          if (isCrit) {
            pDmg = Math.floor(pDmg * stats.crit_dmg);
          }
          monsterHp = Math.max(0, monsterHp - pDmg);
          battleLogs.push(`🗡️ **Hiệp ${round}**: **${tuSi.ten}** gây \`${pDmg}\` sát thương ${isCrit ? '💥 (Bạo kích!)' : ''} lên **${monster.ten}** (Yêu thú HP: \`${monsterHp}\`).`);

          // Hút máu nếu có
          if (stats.lifesteal > 0 && monsterHp > 0) {
            const healed = Math.floor(pDmg * stats.lifesteal);
            if (healed > 0) {
              playerHp = Math.min(stats.max_hp, playerHp + healed);
              battleLogs.push(`🩸 **Hút máu**: Hút lấy sinh cơ yêu thú, đạo hữu hồi phục \`+${healed}\` HP (Hiện tại: \`${playerHp}/${stats.max_hp}\`).`);
            }
          }

          if (monsterHp <= 0) {
            isWin = true;
            break;
          }

          // Kích hoạt Cổ Bảo Chủ Động (30% mỗi món)
          for (const eq of activeTreasures) {
            if (Math.random() <= 0.30) {
              const kynang = config.KYNANG_TRANGBI[eq.itemId];
              if (kynang && kynang.baseDmg) {
                const cbDmg = Math.max(1, kynang.baseDmg - monsterDef);
                monsterHp = Math.max(0, monsterHp - cbDmg);
                battleLogs.push(`🏺 **Cổ Bảo**: **${eq.item.ten}** kích hoạt kỹ năng **${kynang.ten}**, nện thêm \`${cbDmg}\` sát thương (Yêu thú HP: \`${monsterHp}\`).`);
                if (monsterHp <= 0) {
                  isWin = true;
                  break;
                }
              }
            }
          }

          if (isWin) break;

          // Kích hoạt Pháp Bảo (25% mỗi món)
          for (const eq of dharmaTreasures) {
            if (Math.random() <= 0.25) {
              const kynang = config.KYNANG_TRANGBI[eq.itemId];
              if (kynang) {
                // Đọc chỉ số phụ trên Pháp bảo
                let pbCritRate = stats.crit_rate;
                let pbCritDmg = stats.crit_dmg;
                let pbDmgBonus = 1.0;
                let pbShieldBonus = 1.0;

                if (eq.dongChiSoJson) {
                  try {
                    const lines = JSON.parse(eq.dongChiSoJson);
                    for (const line of lines) {
                      if (line.thuocTinh === 'crit_rate_pb') pbCritRate += line.phanTram / 100;
                      if (line.thuocTinh === 'crit_dmg_pb') pbCritDmg += line.phanTram / 100;
                      if (line.thuocTinh === 'sat_thuong_pb' || line.thuocTinh === 'phap_thuong_pb') pbDmgBonus += line.phanTram / 100;
                      if (line.thuocTinh === 'khien_pb') pbShieldBonus += line.phanTram / 100;
                    }
                  } catch (e) {}
                }

                // Thực thi sát thương Pháp Bảo
                if (kynang.baseDmg) {
                  let pbDmg = Math.floor(kynang.baseDmg * pbDmgBonus);
                  const isPbCrit = Math.random() <= pbCritRate;
                  if (isPbCrit) {
                    pbDmg = Math.floor(pbDmg * pbCritDmg);
                  }
                  pbDmg = Math.max(1, pbDmg - monsterDef);
                  monsterHp = Math.max(0, monsterHp - pbDmg);
                  battleLogs.push(`📿 **Pháp Bảo**: **${eq.item.ten}** thi triển **${kynang.ten}**, oanh kích \`${pbDmg}\` sát thương ${isPbCrit ? '💥 (Bạo kích!)' : ''} (Yêu thú HP: \`${monsterHp}\`).`);
                  if (monsterHp <= 0) {
                    isWin = true;
                    break;
                  }
                }

                // Thực thi khiên Pháp Bảo
                if (kynang.baseShield) {
                  const pbShield = Math.floor(kynang.baseShield * pbShieldBonus);
                  playerShield += pbShield;
                  battleLogs.push(`📿 **Pháp Bảo**: **${eq.item.ten}** thi triển **${kynang.ten}** tạo kết giới bảo vệ hấp thụ \`${pbShield}\` sát thương.`);
                }
              }
            }
          }

          if (isWin) break;

          // Lượt quái: Quái tấn công lại
          const mAtk = Math.max(monster.vatCong, monster.phapCong);
          const pDef = monster.vatCong > monster.phapCong ? stats.vat_phong : stats.phap_phong;
          let mDmg = Math.max(1, mAtk - pDef);

          // Kiểm tra Né tránh của người chơi
          if (Math.random() <= stats.ne) {
            battleLogs.push(`💨 **Né tránh**: **${tuSi.ten}** lướt đi nhẹ nhàng, né tránh hoàn toàn đòn đánh của **${monster.ten}**!`);
          } else {
            // Kiểm tra hấp thụ khiên
            if (playerShield > 0) {
              if (playerShield >= mDmg) {
                playerShield -= mDmg;
                battleLogs.push(`🛡️ **Khiên bảo vệ**: Khiên hấp thụ toàn bộ \`${mDmg}\` sát thương từ **${monster.ten}** (Khiên còn: \`${playerShield}\`).`);
                mDmg = 0;
              } else {
                mDmg -= playerShield;
                battleLogs.push(`🛡️ **Khiên bảo vệ**: Khiên hấp thụ \`${playerShield}\` sát thương rồi vỡ tan! Sát thương lọt qua: \`${mDmg}\`.`);
                playerShield = 0;
              }
            }

            if (mDmg > 0) {
              playerHp = Math.max(0, playerHp - mDmg);
              battleLogs.push(`🐾 **Yêu Thú**: **${monster.ten}** phản kích gây \`${mDmg}\` sát thương lên **${tuSi.ten}** (HP còn: \`${playerHp}\`).`);
            }
          }

          if (playerHp <= 0) {
            isWin = false;
            break;
          }

          round++;
        }

        if (round > 15 && monsterHp > 0 && playerHp > 0) {
          // Bất phân thắng bại sau 15 hiệp, tính là thua
          isWin = false;
          battleLogs.push(`⏳ **Kết quả**: Hai bên giao chiến ròng rã 15 hiệp bất phân thắng bại, tu sĩ rút lui do cạn kiệt linh lực.`);
        }

        let gainedExp = 0;
        let gainedStones = 0;
        let droppedItem = null;

        if (isWin) {
          gainedExp = Math.floor(dungeon.thuong.expMin + Math.random() * (dungeon.thuong.expMax - dungeon.thuong.expMin));
          gainedStones = Math.floor(dungeon.thuong.stonesMin + Math.random() * (dungeon.thuong.stonesMax - dungeon.thuong.stonesMin));

          // Tính toán rơi đồ
          for (const drop of dungeon.drops) {
            if (Math.random() <= drop.tile) {
              const targetId = drop.replaceId && Math.random() < 0.5 ? drop.replaceId : drop.itemId;
              const itemDetail = await Item.findByPk(targetId);
              if (itemDetail) {
                droppedItem = itemDetail;
                
                // Lưu vào túi đồ bằng helper addVatPham
                await Inventory.addVatPham(tuSi.idNguoiDung, targetId, 1);
                break; // Chỉ cho rơi tối đa 1 món ngẫu nhiên
              }
            }
          }

          // Cập nhật tu sĩ
          tuSi.linhLuc += gainedExp;
          tuSi.linhThach += gainedStones;
          tuSi.hp = playerHp; // Giữ lượng HP sau trận thắng
        } else {
          // Thua phạt trừ HP
          tuSi.hp = Math.max(1, Math.floor(tuSi.hp - stats.max_hp * 0.30));
        }

        await tuSi.save();

        if (droppedItem && (droppedItem.doHiem === 'Hiếm' || droppedItem.doHiem === 'Cực hiếm' || droppedItem.doHiem === 'Huyền thoại')) {
          try {
            const { ThienDaoLuc } = await import('../models/ThienDaoLuc.js');
            await ThienDaoLuc.ghiLuc(
              `🎁 **Cơ Duyên Xảo Hợp**: Đạo hữu **${tuSi.ten}** khám phá **${dungeon.ten}** may mắn phát hiện đại cơ duyên, nhặt được bảo vật **${droppedItem.ten}** (\`${droppedItem.doHiem}\`)!`,
              'Drop'
            );
          } catch (err) {
            console.error('Lỗi khi ghi Thiên Đạo Lục nhặt đồ hiếm:', err);
          }
        }

        // Thiết lập cooldown khiêu chiến phụ bản mới (3 phút = 180 giây)
        const expiresAt = new Date(Date.now() + 180 * 1000);
        await this.datThoiGianCho(tuSi.idNguoiDung, 'dungeon', expiresAt);

        const embedResult = BoTaoEmbed.tranDauBiCanh(
          tuSi,
          dungeon,
          battleLogs,
          isWin,
          gainedExp,
          gainedStones,
          droppedItem
        );
        return await interaction.editReply({ embeds: [embedResult] });
      }
    }
  };
}

const controller = new BoDieuKhienBicanh();
export const danhSachLenhBicanh = [controller.lenhBicanh];
export { controller as boDieuKhienBicanh };
