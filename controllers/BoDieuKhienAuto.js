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
      `• **Thể lực còn lại**: \`${tuSi.theLuc || 0} / ${tuSi.theLucMax || 200}\` 🔋\n` +
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
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('auto_harvest')
      .setLabel('🌾 Thu Hoạch')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!tuSi.kichHoatAuto)
  );
  return [row];
};

export async function creditAutoRewards(freshTuSi) {
  const statsObj = freshTuSi.thongKeAuto || {};
  const expGained = statsObj.exp || 0;
  const stonesGained = statsObj.stones || 0;
  const itemsMap = statsObj.items || {};

  const hasRewards = expGained > 0 || stonesGained > 0 || Object.keys(itemsMap).length > 0;
  if (!hasRewards) {
    return null;
  }

  // 1. Credit EXP and Linh thach
  freshTuSi.linhLuc += expGained;
  freshTuSi.linhThach += stonesGained;

  // 2. Credit Items and build lines
  let itemLines = '';
  for (const [itemId, qty] of Object.entries(itemsMap)) {
    if (qty <= 0) continue;

    await Inventory.addVatPham(freshTuSi.idNguoiDung, itemId, qty);

    const itemDetail = await Item.findByPk(itemId);
    const nameText = itemDetail ? itemDetail.ten : itemId;
    itemLines += `• **${nameText}** x${qty}\n`;
  }
  if (!itemLines) itemLines = '_Không thu hoạch được vật phẩm nào._';

  // 3. Reset stats
  freshTuSi.thongKeAuto = { activeMinutes: 0, exp: 0, stones: 0, items: {} };
  await freshTuSi.save();

  return {
    expGained,
    stonesGained,
    itemLines,
    activeMins: statsObj.activeMinutes || 0
  };
}

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

            const res = await creditAutoRewards(freshTuSi);
            if (res) {
              const reportEmbed = new EmbedBuilder()
                .setTitle('📝 BÁO CÁO KẾT QUẢ TỰ ĐỘNG TU LUYỆN 📝')
                .setColor(0x3498db)
                .setDescription(
                  `Đạo hữu **${freshTuSi.ten}** đã dừng auto.\n` +
                  `Trong thời gian **${res.activeMins} phút** sử dụng Tự Tại Tu Hành Lệnh, đạo hữu đã thu thập được:\n\n` +
                  `• **Tu vi tích lũy**: \`+${res.expGained}\` Exp ✨\n` +
                  `• **Linh thạch nhận được**: \`+${res.stonesGained.toLocaleString()}\` Linh Thạch 💎\n\n` +
                  `**Vật phẩm thu hoạch**:\n${res.itemLines}`
                )
                .setTimestamp()
                .setFooter({ text: 'Thiên Đạo Tu Tiên RPG Auto System' });

              await i.followUp({
                embeds: [reportEmbed],
                ephemeral: false
              });
            } else {
              await i.followUp({
                content: 'ℹ️ Đã dừng tự động tu luyện. Không có tích lũy nào để kết toán.',
                ephemeral: true
              });
            }
          } else {
            if (freshTuSi.thoiGianAuto <= 0) {
              await i.followUp({
                content: '❌ Đạo hữu chưa nạp thời gian Tự Tại Tu Hành Lệnh, không thể kích hoạt auto!',
                ephemeral: true
              });
              return;
            }
            const res = await creditAutoRewards(freshTuSi);
            if (res) {
              const leftoverEmbed = new EmbedBuilder()
                .setTitle('🌾 KẾT TOÁN TÍCH LŨY CŨ 🌾')
                .setColor(0x9b59b6)
                .setDescription(
                  `Phát hiện phần thưởng cũ chưa thu hoạch của đạo hữu **${freshTuSi.ten}**:\n\n` +
                  `• **Tu vi nhận được**: \`+${res.expGained}\` Exp ✨\n` +
                  `• **Linh thạch nhận được**: \`+${res.stonesGained.toLocaleString()}\` Linh Thạch 💎\n\n` +
                  `**Vật phẩm nhận được**:\n${res.itemLines}`
                )
                .setTimestamp();
              await i.followUp({ embeds: [leftoverEmbed] });
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
        } else if (i.customId === 'auto_harvest') {
          if (!freshTuSi.kichHoatAuto) {
            await i.followUp({
              content: '❌ Hệ thống đang tạm dừng, không có chiến lợi phẩm cần thu hoạch!',
              ephemeral: true
            });
            return;
          }

          const res = await creditAutoRewards(freshTuSi);
          if (res) {
            const reportEmbed = new EmbedBuilder()
              .setTitle('🌾 BÁO CÁO THU HOẠCH CHIẾN LỢI PHẨM 🌾')
              .setColor(0x2ecc71)
              .setDescription(
                `Đạo hữu **${freshTuSi.ten}** đã tiến hành thu hoạch chiến lợi phẩm tích lũy:\n\n` +
                `• **Thời gian tích lũy**: \`${res.activeMins} phút\` ⏳\n` +
                `• **Tu vi nhận được**: \`+${res.expGained}\` Exp ✨\n` +
                `• **Linh thạch nhận được**: \`+${res.stonesGained.toLocaleString()}\` Linh Thạch 💎\n\n` +
                `**Vật phẩm thu hoạch**:\n${res.itemLines}`
              )
              .setTimestamp()
              .setFooter({ text: 'Thiên Đạo Tu Tiên RPG Auto System' });

            await i.followUp({
              embeds: [reportEmbed],
              ephemeral: false
            });
          } else {
            await i.followUp({
              content: 'ℹ️ Hiện tại chưa tích lũy được chiến lợi phẩm nào mới.',
              ephemeral: true
            });
          }
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
    let phoenixRegenRounds = 0;
    let petSkillCooldownLeft = 0;

    let toLongBuffActive = false;
    let bachHoBuffActive = false;
    let kyLanBuffActive = false;
    let huyenVuBuffActive = false;

    // Trạng thái hiệu ứng mới
    let playerLifestealRounds = 0;   // Hút máu tăng cường của Tổ Long
    let bossStunnedRounds = 0;       // Yêu thú bị choáng
    let bossWeakenRounds = 0;        // Yêu thú bị suy yếu
    let bossWeakenPct = 0;           // Tỷ lệ suy yếu của Bạch Hổ
    let playerImmuneRounds = 0;      // Người chơi kháng hiệu ứng bất lợi
    let bossPoisonRounds = 0;        // Hiệp độc của Huyền Vũ
    let bossPoisonStacks = 0;        // Tích độc của Huyền Vũ
    let bossPoisonDmgPerStack = 0;   // Sát thương độc mỗi tích
    let huyenVuCritActive = false;   // Huyền Vũ giảm bạo & phản đòn
    let critDmgRedPct = 0;           // Tỷ lệ giảm sát thương bạo

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
    let activePet = await Pet.findOne({ where: { userId: tuSi.idNguoiDung, isActive: true } });
    if (activePet) {
      const check = config.checkHuyetMachApChe(tuSi.capDo, activePet.rarity);
      if (!check.allowed) activePet = null;
    }

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
        } else if (activeSkill.loai === 'khien') {
          playerShield = (playerShield || 0) + activeSkill.triGia;
        } else if (activeSkill.loai === 'hon_hop') {
          monsterHp = Math.max(0, monsterHp - activeSkill.triGia);
          playerShield = (playerShield || 0) + activeSkill.triGiaKhien;
        }
      }
    }

    if (monsterHp <= 0) {
      isWin = true;
    }

    // Kích hoạt kỹ năng chủ động của Thần Thú khi vào trận chiến (Auto)
    let kyLanCumulativeDmg = 0;
    let kyLanBurstTriggered = false;
    const battleLogs = [];

    if (activePet && monsterHp > 0) {
      const template = config.PET_TEMPLATES[activePet.type];
      if (template && template.group === 'than_thu') {
        const totalEvolves = config.getPetTotalEvolves(activePet);
        const evoMult = Math.pow(1.1, totalEvolves);

        if (template.species === 'to_long') {
          const dmg = Math.floor(stats.phap_cong * 1.5 * evoMult);
          monsterHp = Math.max(0, monsterHp - dmg);
          toLongBuffActive = true;
          playerLifestealRounds = (activePet.tienHoa >= 6) ? 3 : 2;
          bossStunnedRounds = 2;
          petSkillCooldownLeft = 5;
        } else if (template.species === 'huyen_vu') {
          const shieldAmt = Math.floor(stats.max_hp * 0.25 * evoMult);
          playerShield = (playerShield || 0) + shieldAmt;
          huyenVuBuffActive = true;
          huyenVuCritActive = true;
          critDmgRedPct = Math.min(0.50, 0.20 + (activePet.tienHoa || 0) * 0.03);

          bossPoisonRounds = 3;
          bossPoisonStacks = 1;
          bossPoisonDmgPerStack = Math.floor(stats.max_hp * Math.min(0.10, 0.05 + (activePet.tienHoa || 0) * 0.005));
          petSkillCooldownLeft = 5;
        } else if (template.species === 'bach_ho') {
          const dmg = Math.floor(stats.vat_cong * 1.5 * evoMult);
          monsterHp = Math.max(0, monsterHp - dmg);
          bachHoBuffActive = true;
          
          bossWeakenRounds = 2;
          bossWeakenPct = Math.min(0.50, 0.20 + (activePet.tienHoa || 0) * 0.03);
          playerImmuneRounds = 2;
          petSkillCooldownLeft = 5;
        } else if (template.species === 'phuong_hoang') {
          const baseDmg = (stats.vat_cong + stats.phap_cong) * evoMult;
          const addHits = Math.floor(stats.crit_dmg / 0.8);
          const totalHits = 1 + addHits;
          let totalPetDmg = 0;
          let currentHitDmg = baseDmg;
          for (let h = 0; h < totalHits; h++) {
            totalPetDmg += currentHitDmg;
            currentHitDmg = currentHitDmg * 1.2;
          }
          totalPetDmg = Math.floor(totalPetDmg);
          monsterHp = Math.max(0, monsterHp - totalPetDmg);
          petSkillCooldownLeft = 5;
        } else if (template.species === 'ky_lan') {
          petSkillCooldownLeft = 0;
        }

        if (monsterHp <= 0) {
          isWin = true;
        }
      }
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

          // Tốc độ và Điểm hành động (AV)
      const playerSpeed = stats.speed || 100;
      const bossSpeed = 100;

      let avPlayer = 10000 / playerSpeed;
      let avBoss = 10000 / bossSpeed;

      const baseAvPlayer = avPlayer;
      const baseAvBoss = avBoss;

      let playerActionCount = 0;
      let combatRound = 1;

      const skills = skillsList;

      while (monsterHp > 0 && playerHp > 0 && playerActionCount < 15) {
        if (avPlayer <= avBoss) {
          // Lượt của người chơi
          const elapsed = avPlayer;
          avBoss -= elapsed;
          avPlayer = baseAvPlayer;

          if (phoenixRegenRounds > 0) {
            const regenAmt = Math.floor(stats.max_hp * 0.05);
            playerHp = Math.min(stats.max_hp, playerHp + regenAmt);
            battleLogs.push(`<:phung:1522635618377662484> **Phượng Hoàng Hộ Thể**: Hồi phục \`+${regenAmt}\` HP từ hiệu ứng Niết Bàn (Hiện tại: \`${playerHp}/${stats.max_hp}\`).`);
            phoenixRegenRounds--;
          }

          // Sát thương độc lực của Huyền Vũ (đầu lượt)
          if (bossPoisonRounds > 0 && bossPoisonStacks > 0) {
            const poisonDmgTotal = bossPoisonDmgPerStack * bossPoisonStacks;
            monsterHp = Math.max(0, monsterHp - poisonDmgTotal);
            battleLogs.push(`🤢 **Trúng độc**: Yêu thú chịu \`-${poisonDmgTotal.toLocaleString()}\` sát thương độc lực (cộng dồn x${bossPoisonStacks}) (HP còn: \`${monsterHp.toLocaleString()}\`).`);
            bossPoisonRounds--;
            if (bossPoisonRounds === 0) {
              bossPoisonStacks = 0;
            }
            if (monsterHp <= 0) {
              isWin = true;
              break;
            }
          }

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

          let roundCritRate = stats.crit_rate;
          let roundCritDmg = stats.crit_dmg;
          if (bachHoBuffActive) {
            roundCritRate = Math.min(1.0, roundCritRate + 0.15);
            roundCritDmg += 0.30;
          }
          const readySkill = skills.find(s => s.nextRoundAvailable <= playerActionCount + 1);
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

            const cooldownRounds = Math.max(1, Math.ceil(skill.cooldown / 3));
            readySkill.nextRoundAvailable = playerActionCount + 1 + cooldownRounds;

            castMsg = `thi triển **${skill.ten} (Cấp ${capDo})**`;
          } else {
            let rawDmg = currentRoundPlayerAtk;
            if (isCrit) rawDmg = rawDmg * roundCritDmg;
            pDmg = Math.max(1, Math.floor(rawDmg) - monsterDef);

            castMsg = `đánh thường`;
          }

          monsterHp = Math.max(0, monsterHp - pDmg);
          battleLogs.push(`💥 **Hiệp ${combatRound}** (Lượt ${playerActionCount + 1}, AV: ${elapsed.toFixed(0)}): **${tuSi.ten}** ${castMsg} gây \`${pDmg}\`${isCrit ? ' 💥 (Bạo!)' : ''} sát thương lên **${monster.ten}** (HP còn: \`${monsterHp}\`).`);

          // Hút máu nếu có
          let roundLifesteal = stats.lifesteal;
          if (kyLanBuffActive) {
            roundLifesteal += 0.10;
          }
          if (playerLifestealRounds > 0) {
            roundLifesteal += 0.50; // Phước lành chân long hút máu
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
                battleLogs.push(`🏺 **Cổ Bảo**: **${eq.item.ten}** thi triển **${kynang.ten}** bồi thêm \`${cbDmg}\` sát thương (HP còn: \`${monsterHp}\`).`);
                if (monsterHp <= 0) {
                  isWin = true;
                  break;
                }
              }
            }
          }

          if (isWin) break;

          // Kỳ Lân active skill mỗi lượt của chủ nhân
          if (activePet) {
            const template = config.PET_TEMPLATES[activePet.type];
            if (template && template.group === 'than_thu') {
              const totalEvolves = config.getPetTotalEvolves(activePet);
              const evoMult = Math.pow(1.1, totalEvolves);

              if (template.species === 'ky_lan') {
                const pct = Math.min(0.30, 0.25 + (activePet.tienHoa || 0) * 0.005);
                const isPhap = tuSi.huongTu === 'Phap Tu' || tuSi.huongTu === 'Pháp Tu';
                const dmgTypeVal = isPhap ? stats.phap_cong : stats.vat_cong;
                let petDmg = Math.floor(dmgTypeVal * pct * evoMult);
                monsterHp = Math.max(0, monsterHp - petDmg);
                kyLanCumulativeDmg = (kyLanCumulativeDmg || 0) + petDmg;
                battleLogs.push(`🦄 **Thần Thú Kích Hoạt**: **${activePet.name}** oanh kích gây \`${petDmg.toLocaleString()}\` sát thương ${isPhap ? 'pháp thuật' : 'vật lý'} lên yêu thú (HP còn: \`${monsterHp.toLocaleString()}\`).`);

                const limit = stats.max_hp * Math.min(0.70, 0.50 + (activePet.tienHoa || 0) * 0.02);
                if (!kyLanBurstTriggered && kyLanCumulativeDmg >= limit) {
                  const burstDmg = Math.floor(limit * 2);
                  monsterHp = Math.max(0, monsterHp - burstDmg);
                  kyLanBurstTriggered = true;
                  battleLogs.push(`🦄 **Kỳ Lân Bộc Phá**: Tích lũy sát thương đạt mốc, **${activePet.name}** bộc phát cuồng nộ x2 sát thương giới hạn, giáng thêm \`-${burstDmg.toLocaleString()}\` sát thương chí mạng lên yêu thú (HP còn: \`${monsterHp.toLocaleString()}\`)!`);
                }
                if (monsterHp <= 0) {
                  isWin = true;
                  break;
                }
              } else {
                // Thần thú khác (Tổ Long, Huyền Vũ, Bạch Hổ, Phượng Hoàng)
                if (petSkillCooldownLeft === 0 && Math.random() <= 0.20) {
                  petSkillCooldownLeft = 5;
                  if (template.species === 'to_long') {
                    const petDmg = Math.floor(stats.phap_cong * 1.5 * evoMult);
                    monsterHp = Math.max(0, monsterHp - petDmg);
                    toLongBuffActive = true;
                    playerLifestealRounds = (activePet.tienHoa >= 6) ? 3 : 2;
                    bossStunnedRounds = 2;
                    battleLogs.push(`🐉 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Phước lành chân long 🐉** gây \`${petDmg.toLocaleString()}\` sát thương pháp thuật lên yêu thú (HP còn: \`${monsterHp.toLocaleString()}\`). Yêu thú bị **Choáng trong 2 lượt** và tu sĩ tăng **50% hút máu** trong \`${playerLifestealRounds}\` lượt!`);
                    if (monsterHp <= 0) {
                      isWin = true;
                      break;
                    }
                  } else if (template.species === 'huyen_vu') {
                    const petShield = Math.floor(stats.max_hp * 0.25 * evoMult);
                    playerShield += petShield;
                    
                    bossPoisonRounds = 3;
                    bossPoisonStacks = Math.min(3, (bossPoisonStacks || 0) + 1);
                    bossPoisonDmgPerStack = Math.floor(stats.max_hp * Math.min(0.10, 0.05 + (activePet.tienHoa || 0) * 0.005));
                    const poisonDmgTotal = bossPoisonDmgPerStack * bossPoisonStacks;

                    huyenVuBuffActive = true;
                    huyenVuCritActive = true;
                    critDmgRedPct = Math.min(0.50, 0.20 + (activePet.tienHoa || 0) * 0.03);

                    battleLogs.push(`🐢 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Cự Thần Hồng Hoang 🐢**, tạo lá chắn \`${petShield.toLocaleString()}\` HP bảo vệ, và giải độc lực gây \`${poisonDmgTotal.toLocaleString()}\` sát thương độc mỗi lượt (cộng dồn lớp độc thứ \`${bossPoisonStacks}\`).`);
                    if (monsterHp <= 0) {
                      isWin = true;
                      break;
                    }
                  } else if (template.species === 'bach_ho') {
                    const petDmg = Math.floor(stats.vat_cong * 1.5 * evoMult);
                    monsterHp = Math.max(0, monsterHp - petDmg);
                    
                    bossWeakenRounds = 2;
                    bossWeakenPct = Math.min(0.50, 0.20 + (activePet.tienHoa || 0) * 0.03);
                    playerImmuneRounds = 2;
                    bachHoBuffActive = true;

                    battleLogs.push(`🐅 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Bạch Hổ Sát Chiêu 🐅**, trảo kích gây \`${petDmg.toLocaleString()}\` sát thương vật lý lên yêu thú (HP còn: \`${monsterHp.toLocaleString()}\`). Khiến Boss bị **Suy yếu giảm ${Math.floor(bossWeakenPct * 100)}% song công** trong 2 lượt, tu sĩ kháng toàn bộ hiệu ứng bất lợi trong 2 lượt!`);
                    if (monsterHp <= 0) {
                      isWin = true;
                      break;
                    }
                  } else if (template.species === 'phuong_hoang') {
                    const baseDmg = (stats.vat_cong + stats.phap_cong) * evoMult;
                    const addHits = Math.floor(stats.crit_dmg / 0.8);
                    const totalHits = 1 + addHits;
                    let totalPetDmg = 0;
                    let currentHitDmg = baseDmg;
                    for (let h = 0; h < totalHits; h++) {
                      totalPetDmg += currentHitDmg;
                      currentHitDmg = currentHitDmg * 1.2;
                    }
                    totalPetDmg = Math.floor(totalPetDmg);
                    monsterHp = Math.max(0, monsterHp - totalPetDmg);
                    battleLogs.push(`<:phung:1522635618377662484> **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Hỏa Phượng Liệt Diễm**, liên hoàn oanh kích **${totalHits} lần** (sát thương song công tăng tiến 20% mỗi lần), gây tổng cộng \`${totalPetDmg.toLocaleString()}\` sát thương lên yêu thú! (HP còn: \`${monsterHp.toLocaleString()}\`).`);
                    if (monsterHp <= 0) {
                      isWin = true;
                      break;
                    }
                  }
                }
              }
            }
          }

          // Giảm thời gian hiệu lực của Pháp Bảo ở cuối mỗi hiệp
          for (const buff of activeBuffs) {
            if (buff.roundsLeft > 0) {
              buff.roundsLeft--;
            }
          }

          if (petSkillCooldownLeft > 0) {
            petSkillCooldownLeft--;
          }
          if (playerLifestealRounds > 0) playerLifestealRounds--;
          if (playerImmuneRounds > 0) playerImmuneRounds--;

          playerActionCount++;
          combatRound++;
        } else {
          // Lượt của quái
          const elapsed = avBoss;
          avPlayer -= elapsed;
          avBoss = baseAvBoss;

          if (bossStunnedRounds > 0) {
            battleLogs.push(`💤 **Choáng**: Yêu thú bị choáng không thể phản công trong hiệp này!`);
          } else {
            const mAtk = Math.max(monster.vatCong, monster.phapCong);
            const pDef = monster.vatCong > monster.phapCong ? stats.vat_phong : stats.phap_phong;
            let mDmg = Math.max(1, mAtk - pDef);

            if (bossWeakenRounds > 0) {
              mDmg = Math.floor(mDmg * (1 - bossWeakenPct));
              battleLogs.push(`✨ **Suy yếu**: Yêu thú bị suy yếu, sát thương phản công giảm đi \`-${Math.floor(bossWeakenPct * 100)}%\`.`);
            }

            const isMonsterCrit = Math.random() <= 0.15;
            let monsterCritMsg = '';
            if (isMonsterCrit) {
              mDmg = Math.floor(mDmg * 1.5);
              monsterCritMsg = ` (BẠO KÍCH! 💥)`;
            }

            if (isMonsterCrit && huyenVuCritActive) {
              const redAmt = Math.floor(mDmg * critDmgRedPct);
              mDmg -= redAmt;
              const reflectDmg = Math.floor(mDmg * 0.25);
              monsterHp = Math.max(0, monsterHp - reflectDmg);
              battleLogs.push(`🐢 **Huyền Vũ Giảm Bạo**: Giảm \`-${Math.floor(critDmgRedPct * 100)}%\` sát thương bạo kích gánh chịu, phản hồi \`+${reflectDmg.toLocaleString()}\` sát thương ngược lại yêu thú (HP còn: \`${monsterHp.toLocaleString()}\`).`);
              if (monsterHp <= 0) {
                isWin = true;
              }
            }

            let roundNe = stats.ne;
            if (kyLanBuffActive) {
              roundNe = Math.min(0.90, roundNe + 0.15);
            }
            if (Math.random() <= roundNe) {
              battleLogs.push(`💨 **Né tránh**: **${tuSi.ten}** ảo ảnh lướt tránh hoàn toàn đòn đánh của **${monster.ten}**!`);
            } else {
              if (playerShield > 0) {
                if (playerShield >= mDmg) {
                  playerShield -= mDmg;
                  battleLogs.push(`🛡️ **Lá Chắn**: Khiên hấp thụ toàn bộ \`${mDmg}\`${monsterCritMsg} sát thương (Khiên còn: \`${playerShield}\`).`);
                  mDmg = 0;
                } else {
                  mDmg -= playerShield;
                  battleLogs.push(`🛡️ **Lá Chắn**: Khiên hấp thụ \`${playerShield}\`${monsterCritMsg} sát thương rồi vỡ! Sát thương lọt qua: \`${mDmg}\`.`);
                  playerShield = 0;
                }
              }

              if (mDmg > 0) {
                playerHp = Math.max(0, playerHp - mDmg);
                battleLogs.push(`🐾 **Yêu Thú** (AV: ${elapsed.toFixed(0)}): **${monster.ten}** phản kích gây \`-${mDmg}\`${monsterCritMsg} sát thương lên **${tuSi.ten}** (HP còn: \`${playerHp}\`).`);
              }
            }
          }

          if (bossStunnedRounds > 0) bossStunnedRounds--;
          if (bossWeakenRounds > 0) bossWeakenRounds--;

          combatRound++;
        }
      }

      if (playerHp <= 0) {
        isWin = false;
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
            itemsMap[targetId] = (itemsMap[targetId] || 0) + 1;
            break;
          }
        }
      }

      if (Math.random() <= 0.20) {
        const seedId = Math.random() < 0.5 ? 'hat_giong_linh_chi' : 'hat_giong_nhan_sam';
        itemsMap[seedId] = (itemsMap[seedId] || 0) + 1;
      }

      // 15% cơ hội rơi nguyên liệu hoặc đan đột phá phù hợp cảnh giới
      const btData = config.layVatPhamDotPhaTheoCapDo(tuSi.capDo);
      if (btData && Math.random() <= 0.15) {
        const randType = Math.random();
        let targetId = btData.seedId;
        if (randType >= 0.85) {
          targetId = btData.pillId;
          if (targetId === 'dan_dot_pha_5') {
            targetId = btData.herbId;
          }
        } else if (randType >= 0.50) {
          targetId = btData.herbId;
        }
        const itemDetail = await Item.findByPk(targetId);
        if (itemDetail) {
          itemsMap[targetId] = (itemsMap[targetId] || 0) + 1;
        }
      }

      if (Math.random() <= 0.03) {
        itemsMap['co_duyen_lenh'] = (itemsMap['co_duyen_lenh'] || 0) + 1;
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
          itemsMap[targetVyqId] = (itemsMap[targetVyqId] || 0) + 1;
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
          itemsMap[targetEggId] = (itemsMap[targetEggId] || 0) + 1;
        }
      }

      statsObj.items = itemsMap;
      tuSi.thongKeAuto = statsObj;

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
      statsObj.exp = (statsObj.exp || 0) + addedExp;
    }
    if (effects.stones) {
      const minStones = effects.stones.min || 5;
      const maxStones = effects.stones.max || 15;
      const addedStones = Math.floor((minStones + Math.random() * (maxStones - minStones)) * thienDao.stoneMult);
      statsObj.stones = (statsObj.stones || 0) + addedStones;
    }
    if (effects.itemRandomEligible) {
      const allItems = await Item.findAll();
      const eligibleItems = allItems.filter(item => item.doHiem === 'Thường' || item.doHiem === 'Hiếm');
      const itemDropped = eligibleItems[Math.floor(Math.random() * eligibleItems.length)];
      if (itemDropped) {
        itemsMap[itemDropped.id] = (itemsMap[itemDropped.id] || 0) + 1;
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
        itemsMap[itemDropped.id] = (itemsMap[itemDropped.id] || 0) + 1;
      }
    }
    if (effects.itemSpecified) {
      const itemDropped = await Item.findByPk(effects.itemSpecified.itemId);
      if (itemDropped) {
        const qty = effects.itemSpecified.quantity || 1;
        itemsMap[itemDropped.id] = (itemsMap[itemDropped.id] || 0) + qty;
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
      itemsMap[seedId] = (itemsMap[seedId] || 0) + 1;
    }

    // 10% cơ hội rơi nguyên liệu hoặc đan đột phá phù hợp cảnh giới
    const btData = config.layVatPhamDotPhaTheoCapDo(tuSi.capDo);
    if (btData && Math.random() <= 0.10) {
      const randType = Math.random();
      let targetId = btData.seedId;
      if (randType >= 0.85) {
        targetId = btData.pillId;
        if (targetId === 'dan_dot_pha_5') {
          targetId = btData.herbId;
        }
      } else if (randType >= 0.50) {
        targetId = btData.herbId;
      }
      const itemDetail = await Item.findByPk(targetId);
      if (itemDetail) {
        itemsMap[targetId] = (itemsMap[targetId] || 0) + 1;
      }
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
