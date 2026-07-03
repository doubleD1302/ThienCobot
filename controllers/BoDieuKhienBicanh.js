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

      if (tuSi.theLuc < 1) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(`Thể lực bất túc! Đạo hữu hôm nay đã cạn kiệt thể lực (Hiện có: \`0/${tuSi.theLucMax}\`). Hãy quay lại vào ngày mai.`)]
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
        embeds: [embedList],
        components: [row]
      });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 60_000
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

        // 1. Kiểm tra thể lực
        await tuSi.reload();
        if (tuSi.theLuc < 1) {
          await i.editReply({
            embeds: [BoTaoEmbed.loi(`Thể lực bất túc! Đạo hữu hôm nay đã cạn kiệt thể lực (Hiện có: \`0/${tuSi.theLucMax}\`).`)],
            components: []
          });
          collector.stop('no_stamina');
          return;
        }

        // 2. Kiểm tra cooldown khiêu chiến (30 giây)
        const activeCooldown = await this.kiemTraThoiGianCho(tuSi.idNguoiDung, 'dungeon');
        if (activeCooldown) {
          const hetHanTime = new Date(activeCooldown.hetHan).getTime();
          const secondsLeft = Math.max(0, Math.floor((hetHanTime - Date.now()) / 1000));
          await i.editReply({
            embeds: [BoTaoEmbed.loi(`Lực kiệt khí hư! Đạo hữu cần tĩnh dưỡng thêm \`${secondsLeft} giây\` trước khi tiếp tục khiêu chiến bí cảnh.`)],
            components: []
          });
          collector.stop('cooldown');
          return;
        }

        collector.stop('combating');

        // 2. Tải trang bị và thần thú xuất chiến để tính chỉ số và giả lập chiến đấu
        const { Inventory } = await import('../models/Inventory.js');
        const { Item } = await import('../models/Item.js');
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
        const stats = tuSi.layChiSo(equippedItems, activePet);

        // Yêu cầu HP tối thiểu
        if (tuSi.hp <= Math.floor(stats.max_hp * 0.10)) {
          return await i.editReply({
            embeds: [BoTaoEmbed.loi("Trạng thái kiệt quệ! Khí huyết của đạo hữu dưới 10%, không đủ sức khiêu chiến yêu thú. Hãy dùng `/nghi` hoặc đan dược trước.")],
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
        let phoenixRegenRounds = 0;

        let toLongBuffActive = false;
        let bachHoBuffActive = false;
        let kyLanBuffActive = false;
        let huyenVuBuffActive = false;

        const isPhysical = tuSi.huongTu === 'The Tu';
        const playerAtk = isPhysical ? stats.vat_cong : stats.phap_cong;
        const monsterDef = isPhysical ? monster.vatPhong : monster.phapPhong;

        // Phân loại trang bị chủ động
        const activeTreasures = equippedItems.filter(x => x.item.loai === 'Cổ Bảo Chủ Động');
        const dharmaTreasures = equippedItems.filter(x => x.item.loai === 'Pháp Bảo');

        // Kích hoạt kỹ năng chủ động của Pháp Bảo khi vào chiến đấu
        const activeBuffs = [];
        for (const eq of dharmaTreasures) {
          const activeSkill = config.layKyNangPhapBaoActive(eq.item || eq.itemId);
          if (activeSkill) {
            if (activeSkill.loai === 'tan_cong') {
              monsterHp = Math.max(0, monsterHp - activeSkill.triGia);
              battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}**, gây \`${activeSkill.triGia}\` sát thương lên **${monster.ten}** (HP còn: \`${monsterHp}\`).`);
            } else if (activeSkill.loai === 'hoi_mau_pct') {
              const healAmt = Math.floor(stats.max_hp * (activeSkill.triGia / 100));
              playerHp = Math.min(stats.max_hp, playerHp + healAmt);
              battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}**, hồi phục \`+${healAmt}\` HP (Hiện tại: \`${playerHp}/${stats.max_hp}\`).`);
            } else if (activeSkill.loai === 'tang_cong_pct') {
              activeBuffs.push({
                ten: activeSkill.ten,
                pbTen: eq.item.ten,
                loai: 'tang_cong_pct',
                triGia: activeSkill.triGia,
                roundsLeft: activeSkill.duration
              });
              battleLogs.push(`🔮 **Pháp Bảo Chủ Động**: **${eq.item.ten}** kích hoạt **${activeSkill.ten}**, gia tăng \`+${activeSkill.triGia}%\` Công kích trong \`${activeSkill.duration}\` hiệp.`);
            }
          }
        }

        if (monsterHp <= 0) {
          isWin = true;
        }

        // Kích hoạt kỹ năng chủ động của Thần Thú khi vào trận chiến
        if (activePet && monsterHp > 0) {
          const template = config.PET_TEMPLATES[activePet.type];
          if (template && template.group === 'than_thu') {
            const totalEvolves = config.getPetTotalEvolves(activePet);
            const evoMult = Math.pow(1.1, totalEvolves);

            if (template.species === 'to_long') {
              const dmg = Math.floor(stats.max_hp * 0.15 * evoMult);
              monsterHp = Math.max(0, monsterHp - dmg);
              toLongBuffActive = true;
              battleLogs.push(`🐉 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Long Thần Chi Nộ 🐉**, oanh tạc gây \`${dmg.toLocaleString()}\` sát thương cố định lên **${monster.ten}** (HP còn: \`${monsterHp.toLocaleString()}\`). Đồng thời tăng **10% công kích** cho tu sĩ đến hết trận!`);
            } else if (template.species === 'ky_lan') {
              const shieldAmt = Math.floor(stats.max_hp * 0.20 * evoMult);
              playerShield = (playerShield || 0) + shieldAmt;
              kyLanBuffActive = true;
              battleLogs.push(`🦄 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Kỳ Lân Hộ Thể 🦄**, tạo lớp lá chắn \`${shieldAmt.toLocaleString()}\` HP hộ thể. Đồng thời tăng **15% né tránh** & **10% hút máu** cho tu sĩ đến hết trận!`);
            } else if (template.species === 'huyen_vu') {
              const shieldAmt = Math.floor(stats.max_hp * 0.25 * evoMult);
              playerShield = (playerShield || 0) + shieldAmt;
              huyenVuBuffActive = true;
              battleLogs.push(`🐢 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Huyền Vũ Bảo Vệ 🐢**, tạo lớp lá chắn kiên cố \`${shieldAmt.toLocaleString()}\` HP hộ mệnh. Đồng thời tăng hiệu ứng **giảm 15% sát thương gánh chịu** cho tu sĩ đến hết trận!`);
            } else if (template.species === 'bach_ho') {
              const dmg = Math.floor(stats.max_hp * 0.18 * evoMult);
              monsterHp = Math.max(0, monsterHp - dmg);
              bachHoBuffActive = true;
              battleLogs.push(`🐅 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Bạch Hổ Sát Chiêu 🐅**, trảo kích gây \`${dmg.toLocaleString()}\` sát thương cố định lên **${monster.ten}** (HP còn: \`${monsterHp.toLocaleString()}\`). Đồng thời tăng **15% tỷ lệ bạo kích** & **30% sát thương bạo kích** cho tu sĩ đến hết trận!`);
            }

            if (monsterHp <= 0) {
              isWin = true;
            }
          }
        }

        // Tải kỹ năng đã học để dùng trong Bí Cảnh
        const { PlayerSkill } = await import('../models/PlayerSkill.js');
        const { Skill } = await import('../models/Skill.js');

        const learned = await PlayerSkill.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true } });
        const skills = [];
        for (const psk of learned) {
          const detail = await Skill.findByPk(psk.skillId);
          if (detail) {
            skills.push({ detail, capDo: psk.capDo, nextRoundAvailable: 1 });
          }
        }

        while (monsterHp > 0 && playerHp > 0 && round <= 15) {
          if (phoenixRegenRounds > 0) {
            const regenAmt = Math.floor(stats.max_hp * 0.05);
            playerHp = Math.min(stats.max_hp, playerHp + regenAmt);
            battleLogs.push(`🐦 **Phượng Hoàng Hộ Thể**: Hồi phục \`+${regenAmt}\` HP từ hiệu ứng Niết Bàn (Hiện tại: \`${playerHp}/${stats.max_hp}\`).`);
            phoenixRegenRounds--;
          }

          // Tính công kích thực tế dựa trên buff Pháp Bảo và Tổ Long
          let roundAtkMult = 1.0;
          for (const buff of activeBuffs) {
            if (buff.loai === 'tang_cong_pct' && buff.roundsLeft > 0) {
              roundAtkMult += buff.triGia / 100;
            }
          }
          if (toLongBuffActive) {
            roundAtkMult += 0.10;
          }
          const currentRoundPlayerAtk = Math.floor(playerAtk * roundAtkMult);

          // Lượt chơi: Người tấn công trước
          let roundCritRate = stats.crit_rate;
          let roundCritDmg = stats.crit_dmg;
          if (bachHoBuffActive) {
            roundCritRate = Math.min(1.0, roundCritRate + 0.15);
            roundCritDmg += 0.30;
          }
          const readySkill = skills.find(s => s.nextRoundAvailable <= round);
          let pDmg = 0;
          let isCrit = Math.random() <= roundCritRate;
          let castMsg = '';

          if (readySkill) {
            const skill = readySkill.detail;
            const capDo = readySkill.capDo;
            const skillMult = (skill.satThuong / 100) * (1 + (capDo - 1) * 0.1);
            let rawDmg = currentRoundPlayerAtk * skillMult;

            if (isCrit) rawDmg = rawDmg * roundCritDmg;
            pDmg = Math.max(1, Math.floor(rawDmg) - monsterDef);

            // Cooldown: /3 rounds
            const cooldownRounds = Math.max(1, Math.ceil(skill.cooldown / 3));
            readySkill.nextRoundAvailable = round + cooldownRounds;

            castMsg = `thi triển **${skill.ten} (Cấp ${capDo})**`;
          } else {
            let rawDmg = currentRoundPlayerAtk;
            if (isCrit) rawDmg = rawDmg * roundCritDmg;
            pDmg = Math.max(1, Math.floor(rawDmg) - monsterDef);

            castMsg = `đánh thường`;
          }

          monsterHp = Math.max(0, monsterHp - pDmg);
          battleLogs.push(`🗡️ **Hiệp ${round}**: **${tuSi.ten}** ${castMsg} gây \`${pDmg}\`${isCrit ? ' 💥 (Bạo!)' : ''} sát thương lên **${monster.ten}** (HP: \`${monsterHp}\`).`);

          // Hút máu nếu có
          let roundLifesteal = stats.lifesteal;
          if (kyLanBuffActive) {
            roundLifesteal += 0.10;
          }
          if (roundLifesteal > 0 && monsterHp > 0) {
            const healed = Math.floor(pDmg * roundLifesteal);
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

          // Giảm thời gian hiệu lực của Pháp Bảo ở cuối mỗi hiệp
          for (const buff of activeBuffs) {
            if (buff.roundsLeft > 0) {
              buff.roundsLeft--;
              if (buff.roundsLeft === 0) {
                battleLogs.push(`✨ Hiệu ứng [${buff.ten}] của **${buff.pbTen}** đã hết tác dụng.`);
              }
            }
          }

          if (isWin) break;

          // Sủng Vật Thần Thú chủ động (20%)
          if (activePet && Math.random() <= 0.20) {
            const template = config.PET_TEMPLATES[activePet.type];
            if (template && template.group === 'than_thu') {
              const totalEvolves = config.getPetTotalEvolves(activePet);
              const evoMult = Math.pow(1.1, totalEvolves);

              if (template.species === 'to_long') {
                const petDmg = Math.floor(stats.max_hp * 0.15 * evoMult);
                monsterHp = Math.max(0, monsterHp - petDmg);
                let buffMsg = '';
                if (!toLongBuffActive) {
                  toLongBuffActive = true;
                  buffMsg = ` Đồng thời tăng **10% công kích** cho tu sĩ đến hết trận!`;
                }
                battleLogs.push(`🐉 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Long Thần Chi Nộ 🐉**, phun trào Long lực gây \`${petDmg.toLocaleString()}\` sát thương lên yêu thú!${buffMsg} (HP còn: \`${monsterHp.toLocaleString()}\`).`);
                if (monsterHp <= 0) {
                  isWin = true;
                  break;
                }
              } else if (template.species === 'ky_lan') {
                const petShield = Math.floor(stats.max_hp * 0.20 * evoMult);
                playerShield += petShield;
                let buffMsg = '';
                if (!kyLanBuffActive) {
                  kyLanBuffActive = true;
                  buffMsg = ` Đồng thời tăng **15% né tránh** & **10% hút máu** cho tu sĩ đến hết trận!`;
                }
                battleLogs.push(`🦄 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Kỳ Lân Hộ Thể 🦄**, ngưng tụ lá chắn \`${petShield.toLocaleString()}\` HP bảo vệ.${buffMsg}`);
              } else if (template.species === 'huyen_vu') {
                const petShield = Math.floor(stats.max_hp * 0.25 * evoMult);
                playerShield += petShield;
                let buffMsg = '';
                if (!huyenVuBuffActive) {
                  huyenVuBuffActive = true;
                  buffMsg = ` Đồng thời tăng hiệu ứng **giảm 15% sát thương gánh chịu** cho tu sĩ đến hết trận!`;
                }
                battleLogs.push(`🐢 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Huyền Vũ Bảo Vệ 🐢**, tạo lá chắn dày \`${petShield.toLocaleString()}\` HP hộ vệ.${buffMsg}`);
              } else if (template.species === 'bach_ho') {
                const petDmg = Math.floor(stats.max_hp * 0.18 * evoMult);
                monsterHp = Math.max(0, monsterHp - petDmg);
                let buffMsg = '';
                if (!bachHoBuffActive) {
                  bachHoBuffActive = true;
                  buffMsg = ` Đồng thời tăng **15% tỷ lệ bạo kích** & **30% sát thương bạo kích** cho tu sĩ đến hết trận!`;
                }
                battleLogs.push(`🐅 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Bạch Hổ Sát Chiêu 🐅**, trảo kích chém thẳng gây \`${petDmg.toLocaleString()}\` sát thương lên yêu thú!${buffMsg} (HP còn: \`${monsterHp.toLocaleString()}\`).`);
                if (monsterHp <= 0) {
                  isWin = true;
                  break;
                }
              }
            }
          }

          // Lượt quái tấn công
          const mAtk = Math.max(monster.vatCong, monster.phapCong);
          const pDef = monster.vatCong > monster.phapCong ? stats.vat_phong : stats.phap_phong;
          let mDmg = Math.max(1, mAtk - pDef);

          let roundNe = stats.ne;
          if (kyLanBuffActive) {
            roundNe = Math.min(0.90, roundNe + 0.15);
          }
          if (Math.random() <= roundNe) {
            battleLogs.push(`💨 **Né tránh**: **${tuSi.ten}** ảo ảnh lướt tránh hoàn toàn đòn đánh của **${monster.ten}**!`);
          } else {
            if (huyenVuBuffActive) {
              mDmg = Math.floor(mDmg * 0.85);
            }
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
            const template = activePet ? config.PET_TEMPLATES[activePet.type] : null;
            if (template && template.species === 'phuong_hoang' && !phoenixTriggered) {
              phoenixTriggered = true;
              const totalEvolves = config.getPetTotalEvolves(activePet);
              const evoMult = Math.pow(1.1, totalEvolves);
              playerHp = Math.floor(stats.max_hp * 0.30 * evoMult);
              phoenixRegenRounds = 3;
              battleLogs.push(`🐦 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Niết Bàn Trùng Sinh 🐦**, hồi sinh đạo hữu từ cõi chết với \`${playerHp.toLocaleString()}\` HP, đồng thời kích hoạt hồi phục **5% Max HP mỗi hiệp** trong 3 hiệp tiếp theo!`);
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
        let droppedCoDuyenLenh = false;
        let droppedBreakthrough = null;
        let droppedVanYeuQua = null;
        let droppedEgg = null;

        const thienDao = await tuSi.layHeSoThienDao();

        if (isWin) {
          gainedExp = Math.floor((dungeon.thuong.expMin + Math.random() * (dungeon.thuong.expMax - dungeon.thuong.expMin)) * thienDao.expMult);
          gainedStones = Math.floor((dungeon.thuong.stonesMin + Math.random() * (dungeon.thuong.stonesMax - dungeon.thuong.stonesMin)) * thienDao.stoneMult);

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

          // 15% cơ hội rơi nguyên liệu hoặc đan đột phá phù hợp cảnh giới
          const btData = config.layVatPhamDotPhaTheoCapDo(tuSi.capDo);
          if (btData && Math.random() <= 0.15) {
            const randType = Math.random();
            let targetId = btData.seedId;
            if (randType >= 0.85) {
              targetId = btData.pillId;
            } else if (randType >= 0.50) {
              targetId = btData.herbId;
            }
            const itemDetail = await Item.findByPk(targetId);
            if (itemDetail) {
              droppedBreakthrough = itemDetail;
              await Inventory.addVatPham(tuSi.idNguoiDung, targetId, 1);
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

          // 3% rơi Cơ Duyên Lệnh
          if (Math.random() <= 0.03) {
            const cdDetail = await Item.findByPk('co_duyen_lenh');
            if (cdDetail) {
              droppedCoDuyenLenh = true;
              await Inventory.addVatPham(tuSi.idNguoiDung, 'co_duyen_lenh', 1);
            }
          }

          // Rơi Vạn Yêu Quả (phẩm cấp giảm dần)
          const vyqRoll = Math.random() * 100;
          let targetVyqId = null;
          if (vyqRoll <= 0.1) targetVyqId = 'van_yeu_qua_than';
          else if (vyqRoll <= 0.6) targetVyqId = 'van_yeu_qua_tien';
          else if (vyqRoll <= 1.6) targetVyqId = 'van_yeu_qua_thuong';
          else if (vyqRoll <= 3.6) targetVyqId = 'van_yeu_qua_trung';
          else if (vyqRoll <= 8.6) targetVyqId = 'van_yeu_qua_ha';
          else if (vyqRoll <= 18.6) targetVyqId = 'van_yeu_qua_phe';

          if (targetVyqId) {
            const vyqDetail = await Item.findByPk(targetVyqId);
            if (vyqDetail) {
              droppedVanYeuQua = vyqDetail;
              await Inventory.addVatPham(tuSi.idNguoiDung, targetVyqId, 1);
            }
          }

          // Rơi Trứng Linh Thú (Phàm: 5%, Linh: 3%, Tiên: 1%)
          const eggRollVal = Math.random() * 100;
          let targetEggId = null;
          if (eggRollVal <= 1.0) targetEggId = 'trung_linh_thu_tien';
          else if (eggRollVal <= 4.0) targetEggId = 'trung_linh_thu_linh';
          else if (eggRollVal <= 9.0) targetEggId = 'trung_linh_thu_pham';

          if (targetEggId) {
            const eggDetail = await Item.findByPk(targetEggId);
            if (eggDetail) {
              droppedEgg = eggDetail;
              await Inventory.addVatPham(tuSi.idNguoiDung, targetEggId, 1);
            }
          }

          tuSi.linhLuc += gainedExp;
          tuSi.linhThach += gainedStones;
          tuSi.hp = playerHp;
        } else {
          // HP suy kiệt sau trận thua
          tuSi.hp = Math.max(1, Math.floor(tuSi.hp - stats.max_hp * 0.30));
        }
        tuSi.theLuc = Math.max(0, tuSi.theLuc - 1);

        await tuSi.save();

        // Ghi nhận thiên đạo lục nếu nhặt được đồ hiếm
        if (droppedItem && (droppedItem.doHiem === 'Hiếm' || droppedItem.doHiem === 'Cực hiếm' || droppedItem.doHiem === 'Huyền thoại')) {
          try {
            const { ThienDaoLuc } = await import('../models/ThienDaoLuc.js');
            await ThienDaoLuc.ghiLuc(
              `🎁 **Cơ Duyên Xảo Hợp**: Đạo hữu **${tuSi.ten}** khám phá **${dungeon.ten}** may mắn phát hiện đại cơ duyên, nhặt được bảo vật **${droppedItem.ten}** (\`${droppedItem.doHiem}\`)!`,
              'Drop'
            );
          } catch (err) { }
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
          droppedSeed,
          thienDao,
          droppedCoDuyenLenh,
          droppedBreakthrough,
          droppedVanYeuQua,
          droppedEgg
        );

        await i.editReply({
          embeds: [embedResult],
          components: []
        });
      });

      collector.on('end', async (_, reason) => {
        try {
          if (reason === 'cancelled') {
            await interaction.editReply({
              embeds: [BoTaoEmbed.thongTin('🗻 Bí Cảnh Hoang Cổ', 'Đạo hữu đã rút lui an toàn khỏi cửa bí cảnh.')],
              components: []
            });
          } else if (reason === 'time') {
            await interaction.editReply({
              components: []
            });
          }
        } catch (_) { }
      });
    }
  };
}

const controller = new BoDieuKhienBicanh();
export const danhSachLenhBicanh = [controller.lenhBicanh];
export { controller as boDieuKhienBicanh };
