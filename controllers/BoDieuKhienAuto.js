import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';

import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';
import { TuSi } from '../models/TuSi.js';
import { Dungeon } from '../models/Dungeon.js';
import { Item } from '../models/Item.js';
import { Inventory } from '../models/Inventory.js';
import { ThienDaoLuc } from '../models/ThienDaoLuc.js';
import * as config from '../config.js';
import { Op } from 'sequelize';

// ── Embed & Components Builders ──────────────────────────────────────────
const buildAutoEmbed = (tuSi) => {
  const statusEmoji = tuSi.kichHoatAuto ? '🟢' : '🔴';
  const statusText = tuSi.kichHoatAuto ? 'Đang kích hoạt' : 'Đang tạm dừng';

  return new EmbedBuilder()
    .setTitle('🤖 HỆ THỐNG TU LUYỆN TỰ ĐỘNG (AUTO) 🤖')
    .setColor(tuSi.kichHoatAuto ? 0x2ecc71 : 0xe74c3c)
    .setDescription(
      `Đạo hữu **${tuSi.ten}** kính mến,\n` +
      `Hệ thống sẽ giúp đạo hữu tự động khiêu chiến bí cảnh và lịch luyện sau mỗi 5 phút thực tế khi tính năng này được kích hoạt.\n\n` +
      `• **Thời gian còn lại**: \`${tuSi.thoiGianAuto} phút\` ⏳\n` +
      `• **Trạng thái**: ${statusEmoji} **${statusText}**\n\n` +
      `*Lưu ý: Tự động tu luyện sẽ tiêu thụ thể lực và cần khí huyết trên 10% như bình thường.*`
    )
    .setTimestamp()
    .setFooter({ text: 'Thiên Đạo Tu Tiên RPG Auto System' });
};

const buildAutoComponents = (tuSi) => {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('auto_toggle')
      .setLabel(tuSi.kichHoatAuto ? '🔴 Dừng Auto' : '🟢 Kích Hoạt Auto')
      .setStyle(tuSi.kichHoatAuto ? ButtonStyle.Danger : ButtonStyle.Success)
      .setDisabled(!tuSi.kichHoatAuto && tuSi.thoiGianAuto <= 0),
    new ButtonBuilder()
      .setCustomId('auto_refill')
      .setLabel('⚡ Bổ Sung Thời Gian (10k Linh Thạch = +250 phút)')
      .setStyle(ButtonStyle.Primary)
  );
  return [row];
};

class BoDieuKhienAuto extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  lenhAuto = {
    data: new SlashCommandBuilder()
      .setName('auto')
      .setDescription('Mở bảng điều khiển hệ thống tu luyện tự động (Auto)'),

    execute: async (interaction) => {
      await interaction.deferReply();
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      const msg = await interaction.editReply({
        embeds: [buildAutoEmbed(tuSi)],
        components: buildAutoComponents(tuSi)
      });

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 120_000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();
        const freshTuSi = await TuSi.findByPk(tuSi.idNguoiDung);
        if (!freshTuSi) {
          collector.stop('not_found');
          return;
        }

        if (i.customId === 'auto_toggle') {
          if (freshTuSi.kichHoatAuto) {
            freshTuSi.kichHoatAuto = false;

            const statsObj = freshTuSi.thongKeAuto;
            const activeMins = statsObj.activeMinutes || 0;
            const expGained = statsObj.exp || 0;
            const stonesGained = statsObj.stones || 0;
            const itemsMap = statsObj.items || {};

            let itemLines = '';
            for (const [name, qty] of Object.entries(itemsMap)) {
              itemLines += `• **${name}** x${qty}\n`;
            }
            if (!itemLines) itemLines = '_Không thu hoạch được vật phẩm nào._';

            const reportEmbed = new EmbedBuilder()
              .setTitle('📝 BÁO CÁO KẾT QUẢ TỰ ĐỘNG TU LUYỆN 📝')
              .setColor(0x3498db)
              .setDescription(
                `Đạo hữu **${freshTuSi.ten}** đã dừng auto.\n` +
                `Trong thời gian **${activeMins} phút** sử dụng Tự Tại Tu Hành Lệnh, đạo hữu đã thu thập được:\n\n` +
                `• **Tu vi tích lũy**: \`+${expGained}\` Exp ✨\n` +
                `• **Linh thạch nhận được**: \`+${stonesGained.toLocaleString()}\` Linh Thạch 💎\n\n` +
                `**Vật phẩm thu hoạch**:\n${itemLines}`
              )
              .setTimestamp()
              .setFooter({ text: 'Thiên Đạo Tu Tiên RPG Auto System' });

            await i.followUp({
              embeds: [reportEmbed],
              ephemeral: false
            });

            freshTuSi.thongKeAuto = { activeMinutes: 0, exp: 0, stones: 0, items: {} };
          } else {
            if (freshTuSi.thoiGianAuto <= 0) {
              await i.followUp({
                content: '❌ Đạo hữu chưa nạp thời gian Tự Tại Tu Hành Lệnh, không thể kích hoạt auto!',
                ephemeral: true
              });
              return;
            }
            freshTuSi.kichHoatAuto = true;
            freshTuSi.thongKeAuto = { activeMinutes: 0, exp: 0, stones: 0, items: {} };
          }
          await freshTuSi.save();
        } else if (i.customId === 'auto_refill') {
          if (freshTuSi.linhThach < 10000) {
            await i.followUp({
              content: `❌ Linh thạch bất túc! Đạo hữu cần có ít nhất \`10,000\` Linh Thạch để mua thêm thời gian (Hiện có: \`${freshTuSi.linhThach.toLocaleString()}\` Linh Thạch).`,
              ephemeral: true
            });
            return;
          }
          freshTuSi.linhThach -= 10000;
          freshTuSi.thoiGianAuto += 250;
          await freshTuSi.save();
        }

        await i.editReply({
          embeds: [buildAutoEmbed(freshTuSi)],
          components: buildAutoComponents(freshTuSi)
        });
      });

      collector.on('end', async () => {
        try {
          const finalTuSi = await TuSi.findByPk(tuSi.idNguoiDung);
          if (finalTuSi) {
            await interaction.editReply({
              components: []
            });
          }
        } catch (_) {}
      });
    }
  };
}

const controller = new BoDieuKhienAuto();

// ── Background Auto Progress Actions ──────────────────────────────────────
async function autoDiBiCanh(tuSi) {
  try {
    await tuSi.reload();
    if (tuSi.theLuc < 1) return;

    // Check cooldown
    const activeCooldown = await controller.kiemTraThoiGianCho(tuSi.idNguoiDung, 'dungeon');
    if (activeCooldown) return;

    const stats = await tuSi.layChiSoDayDu();
    if (tuSi.hp <= Math.floor(stats.max_hp * 0.10)) return;

    const dungeons = await Dungeon.findAll();
    if (dungeons.length === 0) return;

    const eligibleDungeons = dungeons
      .filter(dg => tuSi.capDo >= dg.capDoYeuCau)
      .sort((a, b) => b.capDoYeuCau - a.capDoYeuCau);

    if (eligibleDungeons.length === 0) return;
    const dungeon = eligibleDungeons[0];

    // Combat simulation
    const monster = { ...dungeon.quaiVat };
    let monsterHp = monster.hp;
    let playerHp = tuSi.hp;
    let playerShield = 0;
    let isWin = false;
    let round = 1;
    let phoenixTriggered = false;

    const isPhysical = tuSi.huongTu === 'The Tu';
    const playerAtk = isPhysical ? stats.vat_cong : stats.phap_cong;
    const monsterDef = isPhysical ? monster.vatPhong : monster.phapPhong;

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

    const activeTreasures = equippedItems.filter(x => x.item.loai === 'Cổ Bảo Chủ Động');
    const dharmaTreasures = equippedItems.filter(x => x.item.loai === 'Pháp Bảo');

    const activeBuffs = [];
    for (const eq of dharmaTreasures) {
      const activeSkill = config.layKyNangPhapBaoActive(eq.item || eq.itemId);
      if (activeSkill) {
        if (activeSkill.loai === 'tan_cong') {
          monsterHp = Math.max(0, monsterHp - activeSkill.triGia);
        } else if (activeSkill.loai === 'hoi_mau_pct') {
          const healAmt = Math.floor(stats.max_hp * (activeSkill.triGia / 100));
          playerHp = Math.min(stats.max_hp, playerHp + healAmt);
        } else if (activeSkill.loai === 'tang_cong_pct') {
          activeBuffs.push({
            ten: activeSkill.ten,
            pbTen: eq.item.ten,
            loai: 'tang_cong_pct',
            triGia: activeSkill.triGia,
            roundsLeft: activeSkill.duration
          });
        }
      }
    }

    if (monsterHp <= 0) {
      isWin = true;
    }

    const { PlayerSkill } = await import('../models/PlayerSkill.js');
    const { Skill } = await import('../models/Skill.js');

    const learned = await PlayerSkill.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true } });
    const skillsList = [];
    for (const psk of learned) {
      const detail = await Skill.findByPk(psk.skillId);
      if (detail) {
        skillsList.push({ detail, capDo: psk.capDo, nextRoundAvailable: 1 });
      }
    }

    while (monsterHp > 0 && playerHp > 0 && round <= 15) {
      let roundAtkMult = 1.0;
      for (const buff of activeBuffs) {
        if (buff.loai === 'tang_cong_pct' && buff.roundsLeft > 0) {
          roundAtkMult += buff.triGia / 100;
        }
      }
      const currentRoundPlayerAtk = Math.floor(playerAtk * roundAtkMult);

      const readySkill = skillsList.find(s => s.nextRoundAvailable <= round);
      let pDmg = 0;
      let isCrit = Math.random() <= stats.crit_rate;

      if (readySkill) {
        const skill = readySkill.detail;
        const capDo = readySkill.capDo;
        const skillMult = (skill.satThuong / 100) * (1 + (capDo - 1) * 0.1);
        let rawDmg = currentRoundPlayerAtk * skillMult;

        if (isCrit) rawDmg = rawDmg * stats.crit_dmg;
        pDmg = Math.max(1, Math.floor(rawDmg) - monsterDef);

        const cooldownRounds = Math.max(1, Math.ceil(skill.cooldown / 3));
        readySkill.nextRoundAvailable = round + cooldownRounds;
      } else {
        let rawDmg = currentRoundPlayerAtk;
        if (isCrit) rawDmg = rawDmg * stats.crit_dmg;
        pDmg = Math.max(1, Math.floor(rawDmg) - monsterDef);
      }

      monsterHp = Math.max(0, monsterHp - pDmg);

      if (stats.lifesteal > 0 && monsterHp > 0) {
        const healed = Math.floor(pDmg * stats.lifesteal);
        if (healed > 0) {
          playerHp = Math.min(stats.max_hp, playerHp + healed);
        }
      }

      if (monsterHp <= 0) {
        isWin = true;
        break;
      }

      for (const eq of activeTreasures) {
        if (Math.random() <= 0.30) {
          const kynang = config.KYNANG_TRANGBI[eq.itemId];
          if (kynang && kynang.baseDmg) {
            const cbDmg = Math.max(1, kynang.baseDmg - monsterDef);
            monsterHp = Math.max(0, monsterHp - cbDmg);
            if (monsterHp <= 0) {
              isWin = true;
              break;
            }
          }
        }
      }

      if (isWin) break;

      for (const buff of activeBuffs) {
        if (buff.roundsLeft > 0) {
          buff.roundsLeft--;
        }
      }

      if (isWin) break;

      if (activePet && activePet.rarity === 'ANCIENT' && Math.random() <= 0.20) {
        if (activePet.type === 'to_long') {
          const petDmg = Math.floor(stats.max_hp * 0.15);
          monsterHp = Math.max(0, monsterHp - petDmg);
          if (monsterHp <= 0) {
            isWin = true;
            break;
          }
        } else if (activePet.type === 'ky_lan') {
          const petShield = Math.floor(stats.max_hp * 0.20);
          playerShield += petShield;
        }
      }

      const mAtk = Math.max(monster.vatCong, monster.phapCong);
      const pDef = monster.vatCong > monster.phapCong ? stats.vat_phong : stats.phap_phong;
      let mDmg = Math.max(1, mAtk - pDef);

      if (Math.random() <= stats.ne) {
        // dodged
      } else {
        if (playerShield > 0) {
          if (playerShield >= mDmg) {
            playerShield -= mDmg;
            mDmg = 0;
          } else {
            mDmg -= playerShield;
            playerShield = 0;
          }
        }

        if (mDmg > 0) {
          playerHp = Math.max(0, playerHp - mDmg);
        }
      }

      if (playerHp <= 0) {
        if (activePet && activePet.type === 'phuong_hoang' && !phoenixTriggered) {
          phoenixTriggered = true;
          playerHp = Math.floor(stats.max_hp * 0.30);
        } else {
          isWin = false;
          break;
        }
      }

      round++;
    }

    let gainedExp = 0;
    let gainedStones = 0;
    let droppedItem = null;

    const thienDao = await tuSi.layHeSoThienDao();

    if (isWin) {
      gainedExp = Math.floor((dungeon.thuong.expMin + Math.random() * (dungeon.thuong.expMax - dungeon.thuong.expMin)) * thienDao.expMult);
      gainedStones = Math.floor((dungeon.thuong.stonesMin + Math.random() * (dungeon.thuong.stonesMax - dungeon.thuong.stonesMin)) * thienDao.stoneMult);

      const statsObj = tuSi.thongKeAuto;
      statsObj.exp = (statsObj.exp || 0) + gainedExp;
      statsObj.stones = (statsObj.stones || 0) + gainedStones;
      const itemsMap = statsObj.items || {};

      for (const drop of dungeon.drops) {
        if (Math.random() <= drop.tile) {
          const targetId = drop.replaceId && Math.random() < 0.5 ? drop.replaceId : drop.itemId;
          const itemDetail = await Item.findByPk(targetId);
          if (itemDetail) {
            droppedItem = itemDetail;
            await Inventory.addVatPham(tuSi.idNguoiDung, targetId, 1);
            itemsMap[itemDetail.ten] = (itemsMap[itemDetail.ten] || 0) + 1;
            break;
          }
        }
      }

      if (Math.random() <= 0.20) {
        const seedId = Math.random() < 0.5 ? 'hat_giong_linh_chi' : 'hat_giong_nhan_sam';
        const seedName = seedId === 'hat_giong_linh_chi' ? 'Hạt Giống Linh Chi' : 'Hạt Giống Nhân Sâm';
        await Inventory.addVatPham(tuSi.idNguoiDung, seedId, 1);
        itemsMap[seedName] = (itemsMap[seedName] || 0) + 1;
      }

      if (Math.random() <= 0.03) {
        await Inventory.addVatPham(tuSi.idNguoiDung, 'co_duyen_lenh', 1);
        itemsMap['Cơ Duyên Lệnh'] = (itemsMap['Cơ Duyên Lệnh'] || 0) + 1;
      }

      statsObj.items = itemsMap;
      tuSi.thongKeAuto = statsObj;

      tuSi.linhLuc += gainedExp;
      tuSi.linhThach += gainedStones;
      tuSi.hp = playerHp;
    } else {
      tuSi.hp = Math.max(1, Math.floor(tuSi.hp - stats.max_hp * 0.30));
    }
    tuSi.theLuc = Math.max(0, tuSi.theLuc - 1);
    await tuSi.save();

    if (droppedItem && (droppedItem.doHiem === 'Hiếm' || droppedItem.doHiem === 'Cực hiếm' || droppedItem.doHiem === 'Huyền thoại')) {
      try {
        await ThienDaoLuc.ghiLuc(
          `🎁 **Cơ Duyên Xảo Hợp [AUTO]**: Đạo hữu **${tuSi.ten}** tự động thám hiểm **${dungeon.ten}** may mắn nhặt được bảo vật **${droppedItem.ten}** (\`${droppedItem.doHiem}\`)!`,
          'Drop'
        );
      } catch (err) {}
    }

    // Set cooldown
    const expiresAt = new Date(Date.now() + 30 * 1000);
    await controller.datThoiGianCho(tuSi.idNguoiDung, 'dungeon', expiresAt);

  } catch (err) {
    console.error(`[Auto Dungeon] Lỗi khi đi bí cảnh cho ${tuSi.ten}:`, err);
  }
}

async function autoDiLichLuyen(tuSi) {
  try {
    await tuSi.reload();
    if (tuSi.theLuc < 1) return;

    // Check cooldown
    const activeCooldown = await controller.kiemTraThoiGianCho(tuSi.idNguoiDung, 'lich_luyen');
    if (activeCooldown) return;

    const stats = await tuSi.layChiSoDayDu();
    if (tuSi.hp <= Math.floor(stats.max_hp * 0.10)) return;

    const { AdventureEvent } = await import('../models/AdventureEvent.js');
    const allEvents = await AdventureEvent.findAll();
    if (allEvents.length === 0) return;

    const selectedEvent = allEvents[Math.floor(Math.random() * allEvents.length)];
    const effects = selectedEvent.hieuUng;

    const thienDao = await tuSi.layHeSoThienDao();
    const statsObj = tuSi.thongKeAuto;
    const itemsMap = statsObj.items || {};

    if (effects.exp) {
      const minExp = effects.exp.min || 10;
      const maxExp = effects.exp.max || 20;
      const addedExp = Math.floor((minExp + Math.random() * (maxExp - minExp)) * thienDao.expMult);
      tuSi.linhLuc += addedExp;
      statsObj.exp = (statsObj.exp || 0) + addedExp;
    }
    if (effects.stones) {
      const minStones = effects.stones.min || 5;
      const maxStones = effects.stones.max || 15;
      const addedStones = Math.floor((minStones + Math.random() * (maxStones - minStones)) * thienDao.stoneMult);
      tuSi.linhThach += addedStones;
      statsObj.stones = (statsObj.stones || 0) + addedStones;
    }
    if (effects.itemRandomEligible) {
      const allItems = await Item.findAll();
      const eligibleItems = allItems.filter(item => item.doHiem === 'Thường' || item.doHiem === 'Hiếm');
      const itemDropped = eligibleItems[Math.floor(Math.random() * eligibleItems.length)];
      if (itemDropped) {
        await Inventory.addVatPham(tuSi.idNguoiDung, itemDropped.id, 1);
        itemsMap[itemDropped.ten] = (itemsMap[itemDropped.ten] || 0) + 1;
        if (effects.thienDaoLuc && effects.thienDaoLucMsg) {
          const formattedMsg = effects.thienDaoLucMsg
            .replace('{name}', `**${tuSi.ten}**`)
            .replace('{itemName}', `**${itemDropped.ten}**`);
          await ThienDaoLuc.ghiLuc(formattedMsg, 'Explore');
        }
      }
    }
    if (effects.itemRandom) {
      const allItems = await Item.findAll({ where: { loai: effects.itemRandom.loai } });
      const itemDropped = allItems.length > 0 ? allItems[Math.floor(Math.random() * allItems.length)] : null;
      if (itemDropped) {
        await Inventory.addVatPham(tuSi.idNguoiDung, itemDropped.id, 1);
        itemsMap[itemDropped.ten] = (itemsMap[itemDropped.ten] || 0) + 1;
      }
    }
    if (effects.itemSpecified) {
      const itemDropped = await Item.findByPk(effects.itemSpecified.itemId);
      if (itemDropped) {
        const qty = effects.itemSpecified.quantity || 1;
        await Inventory.addVatPham(tuSi.idNguoiDung, itemDropped.id, qty);
        itemsMap[itemDropped.ten] = (itemsMap[itemDropped.ten] || 0) + qty;
      }
    }
    if (effects.hpPhat) {
      const lostHp = Math.floor(stats.max_hp * effects.hpPhat);
      tuSi.hp = Math.max(1, tuSi.hp - lostHp);
    }
    if (effects.mpPhat) {
      const lostMp = Math.floor(stats.max_mp * effects.mpPhat);
      tuSi.mp = Math.max(0, tuSi.mp - lostMp);
    }

    if (Math.random() <= 0.20) {
      const seedId = Math.random() < 0.5 ? 'hat_giong_linh_chi' : 'hat_giong_nhan_sam';
      const seedName = seedId === 'hat_giong_linh_chi' ? 'Hạt Giống Linh Chi' : 'Hạt Giống Nhân Sâm';
      await Inventory.addVatPham(tuSi.idNguoiDung, seedId, 1);
      itemsMap[seedName] = (itemsMap[seedName] || 0) + 1;
    }

    if (effects.thienDaoLuc && effects.thienDaoLucMsg && !effects.itemRandomEligible) {
      const formattedMsg = effects.thienDaoLucMsg.replace('{name}', `**${tuSi.ten}**`);
      await ThienDaoLuc.ghiLuc(formattedMsg, 'Explore');
    }

    statsObj.items = itemsMap;
    tuSi.thongKeAuto = statsObj;

    tuSi.theLuc = Math.max(0, tuSi.theLuc - 1);
    await tuSi.save();

    // Set cooldown
    const expiresAt = new Date(Date.now() + 30 * 1000);
    await controller.datThoiGianCho(tuSi.idNguoiDung, 'lich_luyen', expiresAt);

  } catch (err) {
    console.error(`[Auto LichLuyen] Lỗi khi lịch luyện cho ${tuSi.ten}:`, err);
  }
}

export async function chayTienTrinhAuto() {
  const players = await TuSi.findAll({
    where: {
      kichHoatAuto: true,
      thoiGianAuto: { [Op.gt]: 0 }
    }
  });

  if (players.length === 0) return;

  console.log(`[Auto System] Đang chạy tự động cho ${players.length} tu sĩ...`);

  for (const tuSi of players) {
    try {
      // 1. Trừ thời gian tự hành (5 phút)
      tuSi.thoiGianAuto = Math.max(0, tuSi.thoiGianAuto - 5);
      if (tuSi.thoiGianAuto === 0) {
        tuSi.kichHoatAuto = false;
      }
      const statsObj = tuSi.thongKeAuto;
      statsObj.activeMinutes = (statsObj.activeMinutes || 0) + 5;
      tuSi.thongKeAuto = statsObj;
      await tuSi.save();

      // 2. Chạy Bí Cảnh
      await autoDiBiCanh(tuSi);

      // 3. Chạy Lịch Luyện
      await autoDiLichLuyen(tuSi);

    } catch (e) {
      console.error(`[Auto System] Lỗi khi chạy auto cho tu sĩ ${tuSi.ten}:`, e);
    }
  }
}

export function khoiDongAutoSchedule(client) {
  console.log('[Auto System] Khởi động tiến trình tự động tu luyện bát hoang...');

  // Chạy lần đầu sau 15 giây
  setTimeout(async () => {
    try {
      await chayTienTrinhAuto();
    } catch (err) {
      console.error('[Auto System] Lỗi trong tiến trình chạy auto khởi động:', err);
    }
  }, 15000);

  // Chạy định kỳ sau mỗi 5 phút
  setInterval(async () => {
    try {
      await chayTienTrinhAuto();
    } catch (err) {
      console.error('[Auto System] Lỗi trong tiến trình chạy auto định kỳ:', err);
    }
  }, 5 * 60 * 1000);
}

export const danhSachLenhAuto = [controller.lenhAuto];
export { controller as boDieuKhienAuto };
