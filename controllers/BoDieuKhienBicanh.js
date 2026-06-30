import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';

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
      .setDescription('Khiêu chiến phó bản bí cảnh hoang cổ săn lùng bảo vật tông môn'),

    execute: async (interaction) => {
      await interaction.deferReply();
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      const { Dungeon } = await import('../models/Dungeon.js');
      const dungeons = await Dungeon.findAll();

      if (dungeons.length === 0) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Hiện tại các bí cảnh hoang cổ đóng cửa phong ấn, vui lòng quay lại sau!")]
        });
      }

      // Tạo embed hiển thị danh sách các bí cảnh
      const embedList = BoTaoEmbed.thongTin(
        "🗻 Phó Bản Bí Cảnh Hoang Cổ",
        `Đạo hữu **${tuSi.ten}** hãy lựa chọn một bí cảnh hoang cổ để dấn thân thám hiểm:\n\n` +
        dungeons.map(dg => {
          const monster = dg.quaiVat;
          const reward = dg.thuong;
          const status = tuSi.capDo >= dg.capDoYeuCau ? '🟢 Khả dụng' : '🔒 Khóa';
          return `• **${dg.ten}** (${status} · Cấp yêu cầu: \`${dg.capDoYeuCau}\`)\n` +
                 `  *Quái gác cổng*: **${monster.ten}** (HP: \`${monster.hp}\`)\n` +
                 `  *Chiến lợi phẩm*: Exp (\`${reward.expMin}-${reward.expMax}\`), Linh thạch (\`${reward.stonesMin}-${reward.stonesMax}\`)\n`;
        }).join('\n')
      );

      // Tạo các nút thám hiểm dựa theo dữ liệu bí cảnh
      const row = new ActionRowBuilder();
      for (const dg of dungeons) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`dg_play_${dg.id}`)
            .setLabel(`⚔️ Vượt Ải: ${dg.ten}`)
            .setStyle(ButtonStyle.Danger)
            .setDisabled(tuSi.capDo < dg.capDoYeuCau)
        );
      }
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('dg_cancel')
          .setLabel('❌ Hủy')
          .setStyle(ButtonStyle.Secondary)
      );

      const msg = await interaction.editReply({
        embeds:     [embedList],
        components: [row]
      });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time:   60_000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();

        if (i.customId === 'dg_cancel') {
          collector.stop('cancelled');
          return;
        }

        const dungeonId = i.customId.replace('dg_play_', '');
        const dungeon = dungeons.find(dg => dg.id === dungeonId);

        if (!dungeon) {
          collector.stop('not_found');
          return;
        }

        // 1. Kiểm tra cooldown khiêu chiến (30 giây)
        const activeCooldown = await this.kiemTraThoiGianCho(tuSi.idNguoiDung, 'dungeon');
        if (activeCooldown) {
          const hetHanTime = new Date(activeCooldown.hetHan).getTime();
          const secondsLeft = Math.max(0, Math.floor((hetHanTime - Date.now()) / 1000));
          await i.editReply({
            embeds:     [BoTaoEmbed.loi(`Lực kiệt khí hư! Đạo hữu cần tĩnh dưỡng thêm \`${secondsLeft} giây\` trước khi tiếp tục khiêu chiến bí cảnh.`)],
            components: []
          });
          collector.stop('cooldown');
          return;
        }

        collector.stop('combating');

        // 2. Tải trang bị và thần thú xuất chiến
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
        const { Pet } = await import('../models/Pet.js');
        const activePet = await Pet.findOne({ where: { userId: tuSi.idNguoiDung, isActive: true } });
        const stats = tuSi.layChiSo(equippedInv, activePet);

        // Yêu cầu HP tối thiểu
        if (tuSi.hp <= Math.floor(stats.max_hp * 0.10)) {
          return await i.editReply({
            embeds:     [BoTaoEmbed.loi("Trạng thái kiệt quệ! Khí huyết của đạo hữu dưới 10%, không đủ sức khiêu chiến yêu thú. Hãy dùng `/nghi` hoặc đan dược trước.")],
            components: []
          });
        }

        // 3. Khởi chạy mô phỏng chiến đấu
        const monster = { ...dungeon.quaiVat };
        let monsterHp = monster.hp;
        let playerHp = tuSi.hp;
        let playerShield = 0;
        const battleLogs = [];
        let isWin = false;
        let round = 1;
        let phoenixTriggered = false;

        const isPhysical = tuSi.huongTu === 'The Tu';
        const playerAtk = isPhysical ? stats.vat_cong : stats.phap_cong;
        const monsterDef = isPhysical ? monster.vatPhong : monster.phapPhong;

        // Phân loại trang bị chủ động
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
          battleLogs.push(`🗡️ **Hiệp ${round}**: **${tuSi.ten}** gây \`${pDmg}\`${isCrit ? ' 💥 (Bạo!)' : ''} sát thương lên **${monster.ten}** (HP: \`${monsterHp}\`).`);

          // Hút máu nếu có
          if (stats.lifesteal > 0 && monsterHp > 0) {
            const healed = Math.floor(pDmg * stats.lifesteal);
            if (healed > 0) {
              playerHp = Math.min(stats.max_hp, playerHp + healed);
              battleLogs.push(`🩸 **Hút máu**: Hồi phục \`+${healed}\` HP (Hiện tại: \`${playerHp}/${stats.max_hp}\`).`);
            }
          }

          if (monsterHp <= 0) {
            isWin = true;
            break;
          }

          // Cổ Bảo Chủ Động (30%)
          for (const eq of activeTreasures) {
            if (Math.random() <= 0.30) {
              const kynang = config.KYNANG_TRANGBI[eq.itemId];
              if (kynang && kynang.baseDmg) {
                const cbDmg = Math.max(1, kynang.baseDmg - monsterDef);
                monsterHp = Math.max(0, monsterHp - cbDmg);
                battleLogs.push(`🏺 **Cổ Bảo**: **${eq.item.ten}** thi triển **${kynang.ten}** bồi thêm \`${cbDmg}\` sát thương (HP: \`${monsterHp}\`).`);
                if (monsterHp <= 0) {
                  isWin = true;
                  break;
                }
              }
            }
          }

          if (isWin) break;

          // Pháp Bảo (25%)
          for (const eq of dharmaTreasures) {
            if (Math.random() <= 0.25) {
              const kynang = config.KYNANG_TRANGBI[eq.itemId];
              if (kynang) {
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

                if (kynang.baseDmg) {
                  let pbDmg = Math.floor(kynang.baseDmg * pbDmgBonus);
                  const isPbCrit = Math.random() <= pbCritRate;
                  if (isPbCrit) pbDmg = Math.floor(pbDmg * pbCritDmg);
                  pbDmg = Math.max(1, pbDmg - monsterDef);
                  monsterHp = Math.max(0, monsterHp - pbDmg);
                  battleLogs.push(`📿 **Pháp Bảo**: **${eq.item.ten}** tung **${kynang.ten}** gây \`${pbDmg}\`${isPbCrit ? ' 💥 (Bạo!)' : ''} sát thương (HP: \`${monsterHp}\`).`);
                  if (monsterHp <= 0) {
                    isWin = true;
                    break;
                  }
                }

                if (kynang.baseShield) {
                  const pbShield = Math.floor(kynang.baseShield * pbShieldBonus);
                  playerShield += pbShield;
                  battleLogs.push(`📿 **Pháp Bảo**: **${eq.item.ten}** tạo kết giới hộ thể chặn \`${pbShield}\` sát thương.`);
                }
              }
            }
          }

          if (isWin) break;

          // Sủng Vật Thần Thú chủ động (20%)
          if (activePet && activePet.rarity === 'ANCIENT' && Math.random() <= 0.20) {
            if (activePet.type === 'to_long') {
              const petDmg = Math.floor(stats.max_hp * 0.15);
              monsterHp = Math.max(0, monsterHp - petDmg);
              battleLogs.push(`🐉 **Thần Thú [Tổ Long]** phẫn nộ thét gào, phun trào Long Thần Chi Nộ oanh kích \`${petDmg}\` sát thương chí mạng lên yêu thú! (HP: \`${monsterHp}\`).`);
              if (monsterHp <= 0) {
                isWin = true;
                break;
              }
            } else if (activePet.type === 'ky_lan') {
              const petShield = Math.floor(stats.max_hp * 0.20);
              playerShield += petShield;
              battleLogs.push(`🦄 **Thần Thú [Kỳ Lân]** thi triển Kỳ Lân Hộ Thể, ngưng tụ lá chắn thần thánh bảo vệ tu sĩ hấp thụ \`${petShield}\` sát thương.`);
            }
          }

          // Lượt quái tấn công
          const mAtk = Math.max(monster.vatCong, monster.phapCong);
          const pDef = monster.vatCong > monster.phapCong ? stats.vat_phong : stats.phap_phong;
          let mDmg = Math.max(1, mAtk - pDef);

          if (Math.random() <= stats.ne) {
            battleLogs.push(`💨 **Né tránh**: **${tuSi.ten}** ảo ảnh lướt tránh hoàn toàn đòn đánh của **${monster.ten}**!`);
          } else {
            if (playerShield > 0) {
              if (playerShield >= mDmg) {
                playerShield -= mDmg;
                battleLogs.push(`🛡️ **Lá Chắn**: Khiên hấp thụ toàn bộ \`${mDmg}\` sát thương (Khiên còn: \`${playerShield}\`).`);
                mDmg = 0;
              } else {
                mDmg -= playerShield;
                battleLogs.push(`🛡️ **Lá Chắn**: Khiên hấp thụ \`${playerShield}\` sát thương rồi vỡ! Sát thương lọt qua: \`${mDmg}\`.`);
                playerShield = 0;
              }
            }

            if (mDmg > 0) {
              playerHp = Math.max(0, playerHp - mDmg);
              battleLogs.push(`🐾 **Yêu Thú**: **${monster.ten}** phản kích gây \`${mDmg}\` sát thương lên **${tuSi.ten}** (HP còn: \`${playerHp}\`).`);
            }
          }

          if (playerHp <= 0) {
            if (activePet && activePet.type === 'phuong_hoang' && !phoenixTriggered) {
              phoenixTriggered = true;
              playerHp = Math.floor(stats.max_hp * 0.30);
              battleLogs.push(`🐦 **Thần Thú [Phượng Hoàng]** kích hoạt Niết Bàn Trùng Sinh, hy sinh thọ nguyên hồi sinh đạo hữu từ cõi chết với \`${playerHp}\` HP!`);
            } else {
              isWin = false;
              break;
            }
          }

          round++;
        }

        if (round > 15 && monsterHp > 0 && playerHp > 0) {
          isWin = false;
          battleLogs.push(`⏳ **Kết quả**: Hai bên giao chiến ròng rã 15 hiệp bất phân thắng bại, tu sĩ rút lui do cạn kiệt linh lực.`);
        }

        let gainedExp = 0;
        let gainedStones = 0;
        let droppedItem = null;
        let droppedSeed = null;

        if (isWin) {
          gainedExp = Math.floor(dungeon.thuong.expMin + Math.random() * (dungeon.thuong.expMax - dungeon.thuong.expMin));
          gainedStones = Math.floor(dungeon.thuong.stonesMin + Math.random() * (dungeon.thuong.stonesMax - dungeon.thuong.stonesMin));

          // Rơi trang bị/vật phẩm
          for (const drop of dungeon.drops) {
            if (Math.random() <= drop.tile) {
              const targetId = drop.replaceId && Math.random() < 0.5 ? drop.replaceId : drop.itemId;
              const itemDetail = await Item.findByPk(targetId);
              if (itemDetail) {
                droppedItem = itemDetail;
                await Inventory.addVatPham(tuSi.idNguoiDung, targetId, 1);
                break;
              }
            }
          }

          // 20% rơi hạt giống dược viên
          if (Math.random() <= 0.20) {
            const seedId = Math.random() < 0.5 ? 'hat_giong_linh_chi' : 'hat_giong_nhan_sam';
            const seedDetail = await Item.findByPk(seedId);
            if (seedDetail) {
              droppedSeed = seedDetail;
              await Inventory.addVatPham(tuSi.idNguoiDung, seedId, 1);
            }
          }

          tuSi.linhLuc += gainedExp;
          tuSi.linhThach += gainedStones;
          tuSi.hp = playerHp;
        } else {
          // HP suy kiệt sau trận thua
          tuSi.hp = Math.max(1, Math.floor(tuSi.hp - stats.max_hp * 0.30));
        }

        await tuSi.save();

        // Ghi nhận thiên đạo lục nếu nhặt được đồ hiếm
        if (droppedItem && (droppedItem.doHiem === 'Hiếm' || droppedItem.doHiem === 'Cực hiếm' || droppedItem.doHiem === 'Huyền thoại')) {
          try {
            const { ThienDaoLuc } = await import('../models/ThienDaoLuc.js');
            await ThienDaoLuc.ghiLuc(
              `🎁 **Cơ Duyên Xảo Hợp**: Đạo hữu **${tuSi.ten}** khám phá **${dungeon.ten}** may mắn phát hiện đại cơ duyên, nhặt được bảo vật **${droppedItem.ten}** (\`${droppedItem.doHiem}\`)!`,
              'Drop'
            );
          } catch (err) {}
        }

        // Đặt thời gian chờ khiêu chiến mới
        const expiresAt = new Date(Date.now() + 30 * 1000);
        await this.datThoiGianCho(tuSi.idNguoiDung, 'dungeon', expiresAt);

        const embedResult = BoTaoEmbed.tranDauBiCanh(
          tuSi,
          dungeon,
          battleLogs,
          isWin,
          gainedExp,
          gainedStones,
          droppedItem,
          droppedSeed
        );

        await i.editReply({
          embeds:     [embedResult],
          components: []
        });
      });

      collector.on('end', async (_, reason) => {
        try {
          if (reason === 'cancelled') {
            await interaction.editReply({
              embeds:     [BoTaoEmbed.thongTin('🗻 Bí Cảnh Hoang Cổ', 'Đạo hữu đã rút lui an toàn khỏi cửa bí cảnh.')],
              components: []
            });
          } else if (reason === 'time') {
            await interaction.editReply({
              components: []
            });
          }
        } catch (_) {}
      });
    }
  };
}

const controller = new BoDieuKhienBicanh();
export const danhSachLenhBicanh = [controller.lenhBicanh];
export { controller as boDieuKhienBicanh };
