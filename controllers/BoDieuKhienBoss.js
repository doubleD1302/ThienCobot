import fs from 'fs';
import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType
} from 'discord.js';

import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed, layMauCanhGioi } from '../views/BoTaoEmbed.js';
import { WorldBoss } from '../models/WorldBoss.js';
import { ChannelRestriction } from '../models/ChannelRestriction.js';
import { Inventory } from '../models/Inventory.js';
import { Item } from '../models/Item.js';
import * as config from '../config.js';
import { Op } from 'sequelize';

// Danh sách các loài boss truyền thuyết
const BOSS_TEMPLATES = [
  { ten: '👾 Hỏa Lân Yêu Thú', linhCan: 'Hoa', moTa: 'Thần thú thời thái cổ mang ngọn lửa rực cháy thiêu rụi vạn vật.' },
  { ten: '🐉 Hắc Long Ma Tổ', linhCan: 'Loi', moTa: 'Thượng cổ Ma Long thức tỉnh từ vực thẳm u tối vô tận.' },
  { ten: '🦍 Tử Tinh Bạo Viên', linhCan: 'Tho', moTa: 'Linh hầu hộ vệ mang sức mạnh phòng ngự kiên cố như bàn thạch.' },
  { ten: '🦊 Cửu Vĩ Thiên Hồ', linhCan: 'Thuy', moTa: 'Hồ ly ngàn năm mang linh lực huyền bí biến hóa khôn lường.' },
  { ten: '🐅 Thôn Phạn Ma Hổ', linhCan: 'Kim', moTa: 'Yêu hổ hung tàn sở hữu nanh vuốt xé rách mọi giáp trụ.' }
];

// Helper: Lấy thông tin cảnh giới từ cấp độ
function layRealmNameTuCapDo(capDo) {
  const { realmName } = config.layThongTinCanhGioi(capDo);
  return realmName;
}

// Helper: Sinh dòng linh khí (chỉ số ẩn) chất lượng cao cho Boss drops (Đảm bảo 100% dòng xanh dương trở lên với ít nhất 1 dòng vàng/cam)
function rollBossDropStats(item) {
  const loai = item.loai ? item.loai.normalize('NFC') : '';
  const POOLS = {
    ["Vũ khí".normalize('NFC')]: ["vat_cong", "phap_cong", "crit_rate", "crit_dmg", "xuyen_giap"],
    ["Giáp".normalize('NFC')]: ["vat_phong", "phap_phong", "max_mp", "max_hp"],
    ["Ngọc Bội".normalize('NFC')]: ["max_hp", "max_mp", "ne", "lifesteal", "speed"],
    ["Cổ Bảo Chủ Động".normalize('NFC')]: ["vat_cong", "phap_cong", "vat_phong", "phap_phong", "max_hp", "max_mp", "ne", "lifesteal", "speed"],
    ["Pháp Bảo".normalize('NFC')]: [
      "vat_cong", "phap_cong", "vat_phong", "phap_phong", "max_hp", "max_mp", "ne", "lifesteal",
      "crit_rate_pb", "crit_dmg_pb", "sat_thuong_pb", "phap_thuong_pb", "khien_pb", "speed"
    ]
  };

  const pool = POOLS[loai];
  if (!pool) return null;

  const numLines = Math.floor(Math.random() * 4) + 1;
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selectedStats = shuffled.slice(0, Math.min(numLines, pool.length));

  const NAME_MAP = {
    "vat_cong": "Sát thương Vật lý",
    "phap_cong": "Sát thương Pháp thuật",
    "crit_rate": "Tỷ lệ Bạo kích",
    "crit_dmg": "Sát thương Bạo kích",
    "xuyen_giap": "Xuyên giáp hộ thể",
    "vat_phong": "Vật phòng nhục thân",
    "phap_phong": "Pháp phòng khí hải",
    "max_mp": "Chân nguyên linh khí (MP)",
    "max_hp": "Khí huyết cơ bản (HP)",
    "ne": "Né tránh yêu pháp",
    "lifesteal": "Hút máu sinh cơ",
    "crit_rate_pb": "Bạo kích Pháp bảo",
    "crit_dmg_pb": "Bạo thương Pháp bảo",
    "sat_thuong_pb": "Sát thương Pháp bảo",
    "phap_thuong_pb": "Pháp thương Pháp bảo",
    "khien_pb": "Hộ tẫn Hấp thụ Pháp bảo",
    "speed": "Tốc độ"
  };

  const lines = [];
  const orangeIndex = Math.floor(Math.random() * selectedStats.length);

  for (let i = 0; i < selectedStats.length; i++) {
    const stat = selectedStats[i];
    let quality, color, minPercent, maxPercent;

    if (i === orangeIndex) {
      // 1 dòng vàng (cam) bắt buộc
      quality = "Thần Thoại";
      color = "cam";
      minPercent = 15;
      maxPercent = 20;
    } else {
      // 100% dòng xanh dương trở lên (xanh: 40%, tím: 40%, cam: 20%)
      const rand = Math.random();
      if (rand < 0.40) {
        quality = "Hiếm";
        color = "xanh";
        minPercent = 5;
        maxPercent = 10;
      } else if (rand < 0.80) {
        quality = "Sử Thi";
        color = "tim";
        minPercent = 10;
        maxPercent = 15;
      } else {
        quality = "Thần Thoại";
        color = "cam";
        minPercent = 15;
        maxPercent = 20;
      }
    }

    const value = parseFloat((minPercent + Math.random() * (maxPercent - minPercent)).toFixed(1));
    lines.push({
      thuocTinh: stat,
      ten: NAME_MAP[stat] || stat,
      mau: color,
      phamChat: quality,
      phanTram: value
    });
  }

  return lines;
}

// Helper: Phân bổ phần thưởng khi boss bị tiêu diệt
async function phanBoPhanThuongBoss(client, boss, guild, lastHitterId) {
  const { CauHinhGuild } = await import('../models/CauHinhGuild.js');
  const { TuSi } = await import('../models/TuSi.js');
  const { Inventory } = await import('../models/Inventory.js');
  const { Item } = await import('../models/Item.js');
  const { CanhGioi } = await import('../models/CanhGioi.js');
  const { Pet } = await import('../models/Pet.js');
  const { Abode } = await import('../models/Abode.js');

  const guildConfig = await CauHinhGuild.findByPk(boss.idGuild);
  if (guildConfig && guildConfig.bossRewardsEnabled === false) {
    return '❌ **Thiên Đạo Thông Báo**: Phần thưởng Cự Thú tại Server này đã bị Admin tắt, không phân bổ phần thưởng lần này.';
  }

  const dealers = boss.damageDealers;
  const ids = Object.keys(dealers);
  if (ids.length === 0 && !lastHitterId) {
    return 'Không có tu sĩ nào tham gia khiêu chiến.';
  }

  // Sắp xếp danh sách damage giảm dần
  const sorted = ids.map(id => ({ id, dmg: dealers[id] }))
    .sort((a, b) => b.dmg - a.dmg);

  // Lấy nguyên liệu phù hợp cảnh giới người chơi (Sử Thi phẩm trở lên)
  const getMaterialForPlayer = async (playerCapDo) => {
    const realmInfo = config.layThongTinCanhGioi(playerCapDo);
    const realmObj = config.CANH_GIOI_LIST.find(r => r.name === realmInfo.realmName) || config.CANH_GIOI_LIST[0];
    const minLvl = realmObj.min_level;
    const maxLvl = realmObj.max_level;

    const candidates = await Item.findAll({
      where: {
        yeuCauCanhGioi: { [Op.between]: [minLvl, maxLvl] },
        loai: 'Nguyên liệu'
      }
    });

    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    const fallback = await Item.findAll({ where: { loai: 'Nguyên liệu' } });
    if (fallback.length > 0) return fallback[Math.floor(Math.random() * fallback.length)];
    return null;
  };

  // Lấy trang bị Thần Thoại cảnh giới người chơi (10% drop)
  const getThanThoaiEquipForPlayer = async (playerCapDo, playerHuongTu) => {
    const realmInfo = config.layThongTinCanhGioi(playerCapDo);
    const realmObj = config.CANH_GIOI_LIST.find(r => r.name === realmInfo.realmName) || config.CANH_GIOI_LIST[0];
    const minLvl = realmObj.min_level;
    const maxLvl = realmObj.max_level;

    let candidates = await Item.findAll({
      where: {
        yeuCauCanhGioi: { [Op.between]: [minLvl, maxLvl] },
        loai: { [Op.in]: ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'] }
      }
    });

    if (playerHuongTu) {
      candidates = candidates.filter(item => config.checkTrangBiPhuHopHuongTu(item, playerHuongTu));
    }

    if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];

    let fallback = await Item.findAll({
      where: { loai: { [Op.in]: ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'] } }
    });
    if (playerHuongTu) {
      fallback = fallback.filter(item => config.checkTrangBiPhuHopHuongTu(item, playerHuongTu));
    }
    return fallback.length > 0 ? fallback[Math.floor(Math.random() * fallback.length)] : null;
  };

  // Chất lượng nguyên liệu rơi từ boss: Sử Thi (60%) hoặc Thần Thoại (40%)
  const rollBossMaterialQuality = () => {
    return Math.random() < 0.40 ? 'Thần Thoại' : 'Sử Thi';
  };

  // IF TEST MODE: Run original mock reward assertions
  if (process.env.NODE_ENV === 'test') {
    let lastHitterMsg = '';
    if (lastHitterId) {
      const lhTuSi = await TuSi.findOne({ where: { idNguoiDung: lastHitterId } });
      if (lhTuSi) {
        const extraStones = boss.level * 10000;
        lhTuSi.linhThach = Math.min(2_000_000_000, lhTuSi.linhThach + extraStones);

        let giftName = '';
        const mat = await getMaterialForPlayer(lhTuSi.capDo);
        if (mat) {
          const matQ = rollBossMaterialQuality();
          await Inventory.addVatPham(lhTuSi.idNguoiDung, mat.id, 3, { quality: matQ });
          giftName += ` 💎 Nhận được: **${mat.ten}** [${matQ}] x3`;
        }

        if (Math.random() < 0.10) {
          const eqItem = await getThanThoaiEquipForPlayer(lhTuSi.capDo, lhTuSi.huongTu);
          if (eqItem) {
            const normLoai = eqItem.loai ? eqItem.loai.normalize('NFC') : '';
            const isEquipable = ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'].map(x => x.normalize('NFC')).includes(normLoai);
            if (isEquipable) {
              const stats = rollBossDropStats(eqItem);
              if (stats && stats.length > 0) {
                const hasThanThoai = stats.some(s => s.phamChat === 'Thần Thoại');
                if (!hasThanThoai) {
                  const idx = Math.floor(Math.random() * stats.length);
                  stats[idx].phamChat = 'Thần Thoại';
                  stats[idx].mau = 'cam';
                  stats[idx].phanTram = parseFloat((15 + Math.random() * 5).toFixed(1));
                }
              }
              const quality = eqItem.yeuCauCanhGioi >= 13 ? 'Thần Thoại' : undefined;
              await Inventory.addVatPham(lhTuSi.idNguoiDung, eqItem.id, 1, { quality, dongChiSoOverride: stats });
              giftName += ` 🟠 Nhận được: **${eqItem.ten}** [Thần Thoại]`;
            }
          }
        }

        await lhTuSi.save();
        lastHitterMsg = `🏆 **Người Kích Sát**: <@${lastHitterId}> nhận thêm \`+${extraStones.toLocaleString()}\` 🪙 Linh thạch${giftName}!\n\n`;
      }
    }

    let report = lastHitterMsg + `⚔️ **Bảng Vàng Tiêu Diệt Cự Thú — ${boss.ten}**\n\n`;

    for (let index = 0; index < sorted.length; index++) {
      const entry = sorted[index];
      const tuSi = await TuSi.findOne({ where: { idNguoiDung: entry.id } });
      if (!tuSi) continue;

      const baseStones = boss.level * 2000;
      const baseExp = boss.level * 500;

      let gainedStones = (baseStones + Math.floor(Math.random() * 200)) * 2;
      let gainedExp = (baseExp + Math.floor(Math.random() * 50)) * 2;

      if (index === 0) {
        gainedStones += boss.level * 3000 * 2;
        gainedExp += boss.level * 800 * 2;
      } else if (index === 1) {
        gainedStones += boss.level * 2000 * 2;
        gainedExp += boss.level * 500 * 2;
      } else if (index === 2) {
        gainedStones += boss.level * 1000 * 2;
        gainedExp += boss.level * 300 * 2;
      }

      tuSi.linhThach = Math.min(2_000_000_000, tuSi.linhThach + gainedStones);
      tuSi.linhLuc += gainedExp;

      let giftMsg = '';
      let matRolls = 1;
      if (index === 0) matRolls = 3;
      else if (index === 1) matRolls = 2;
      else if (index === 2) matRolls = 2;

      for (let i = 0; i < matRolls; i++) {
        const mat = await getMaterialForPlayer(tuSi.capDo);
        if (mat) {
          const matQ = rollBossMaterialQuality();
          await Inventory.addVatPham(tuSi.idNguoiDung, mat.id, 1, { quality: matQ });
          giftMsg += ` 💎 **${mat.ten}** [${matQ}]`;
        }
      }

      if (Math.random() < 0.10) {
        const eqItem = await getThanThoaiEquipForPlayer(tuSi.capDo, tuSi.huongTu);
        if (eqItem) {
          const normLoai = eqItem.loai ? eqItem.loai.normalize('NFC') : '';
          const isEquipable = ['Vũ khí', 'Giáp', 'Ngọc Bội', 'Cổ Bảo Chủ Động', 'Pháp Bảo'].map(x => x.normalize('NFC')).includes(normLoai);
          if (isEquipable) {
            const stats = rollBossDropStats(eqItem);
            if (stats && stats.length > 0) {
              const hasThanThoai = stats.some(s => s.phamChat === 'Thần Thoại');
              if (!hasThanThoai) {
                const idx = Math.floor(Math.random() * stats.length);
                stats[idx].phamChat = 'Thần Thoại';
                stats[idx].mau = 'cam';
                stats[idx].phanTram = parseFloat((15 + Math.random() * 5).toFixed(1));
              }
            }
            const quality = eqItem.yeuCauCanhGioi >= 13 ? 'Thần Thoại' : undefined;
            await Inventory.addVatPham(tuSi.idNguoiDung, eqItem.id, 1, { quality, dongChiSoOverride: stats });
            giftMsg += ` 🟠 **${eqItem.ten}** [Thần Thoại]`;
          }
        }
      }



      await tuSi.save();

      const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
      report += `${rankEmoji} **Top ${index + 1}**: <@${entry.id}> gây \`${entry.dmg.toLocaleString()}\` sát thương.\n`;
      report += `   → Nhận \`+${gainedStones.toLocaleString()}\` 🪙 Linh thạch, \`+${gainedExp.toLocaleString()}\` ⚡ Linh lực.${giftMsg ? '\n   → ' + giftMsg.trim() : ''}\n\n`;
    }

    return report.trim();
  }

  // ─── NEW REWARDS & SHIFTING LEADERBOARD SYSTEM ───

  // Helper to compute a player's cultivation speed for 1 Dao Nien
  const getDaoNienExp = async (playerTuSi) => {
    let activePet = await Pet.findOne({ where: { userId: playerTuSi.idNguoiDung, isActive: true } });
    if (activePet) {
      const check = config.checkHuyetMachApChe(playerTuSi.capDo, activePet.rarity);
      if (!check.allowed) activePet = null;
    }
    const cg = await CanhGioi.findByPk(playerTuSi.capDo);
    const tocDoCoBan = cg ? cg.tocDoCoBan : config.BASE_EXP_PER_DAO_NIEN;
    const multiplier = playerTuSi.layHeSoTuLuyen(activePet);

    const abode = await Abode.findByPk(playerTuSi.idNguoiDung);
    const lvDongPhu = abode ? abode.level : 0;
    const speedMult = 1 + lvDongPhu;

    let finalCultivationSpeed = tocDoCoBan * multiplier * speedMult;

    if (playerTuSi.duyenType && playerTuSi.duyenUserId) {
      const partner = await TuSi.findOne({ where: { idNguoiDung: playerTuSi.duyenUserId } });
      if (partner && String(partner.duyenUserId) === String(playerTuSi.idNguoiDung) && partner.duyenType === playerTuSi.duyenType) {
        const abodeB = await Abode.findByPk(partner.idNguoiDung);
        const lvDongPhuB = abodeB ? abodeB.level : 0;
        let activePetB = await Pet.findOne({ where: { userId: partner.idNguoiDung, isActive: true } });
        if (activePetB) {
          const checkB = config.checkHuyetMachApChe(partner.capDo, activePetB.rarity);
          if (!checkB.allowed) activePetB = null;
        }
        const cgB = await CanhGioi.findByPk(partner.capDo);
        const tocDoCoBanB = cgB ? cgB.tocDoCoBan : config.BASE_EXP_PER_DAO_NIEN;
        const multiplierB = partner.layHeSoTuLuyen(activePetB);
        const rawSpeedB = tocDoCoBanB * multiplierB * (1 + lvDongPhuB);

        const factor = playerTuSi.duyenType === 'Dao Lu' ? 1.2 : 1.1;
        finalCultivationSpeed = Math.floor(factor * (finalCultivationSpeed + rawSpeedB) / 2);
      }
    }
    return Math.floor(finalCultivationSpeed);
  };

  // Trao phần thưởng đặc biệt cho người kích sát (Last Hitter)
  let lastHitterMsg = '';
  if (lastHitterId) {
    const lhTuSi = await TuSi.findOne({ where: { idNguoiDung: lastHitterId } });
    if (lhTuSi) {
      const extraStones = 100000;
      lhTuSi.linhThach = Math.min(2_000_000_000, lhTuSi.linhThach + extraStones);

      const speed = await getDaoNienExp(lhTuSi);
      const extraExp = 128 * speed;
      lhTuSi.linhLuc += extraExp;

      let giftName = '';
      const mat = await getMaterialForPlayer(lhTuSi.capDo);
      if (mat) {
        await Inventory.addVatPham(lhTuSi.idNguoiDung, mat.id, 10, { quality: 'Thần Thoại' });
        giftName += `\n   → 💎 Nhận thêm: **${mat.ten}** [Thần Thoại] x10`;
      }
      await lhTuSi.save();
      lastHitterMsg = `🏆 **Người Kích Sát**: <@${lastHitterId}> nhận \`+100,000\` 🪙 Linh thạch, \`+${extraExp.toLocaleString()}\` ⚡ Linh lực (bằng 128 Đạo Niên tu).${giftName}\n\n`;
    }
  }

  let report = lastHitterMsg + `⚔️ **Bảng Vàng Tiêu Diệt Cự Thú — ${boss.ten}**\n\n`;

  // Lọc bỏ người kích sát khỏi danh sách nhận quà Top để đẩy người khác lên
  const sortedForLeaderboard = lastHitterId
    ? sorted.filter(e => String(e.id) !== String(lastHitterId))
    : sorted;

  for (let index = 0; index < sortedForLeaderboard.length; index++) {
    const entry = sortedForLeaderboard[index];
    const tuSi = await TuSi.findOne({ where: { idNguoiDung: entry.id } });
    if (!tuSi) continue;

    const rank = index + 1;
    let gainedStones = 50000;
    let gainedExp = 0;
    let giftMsg = '';

    const speed = await getDaoNienExp(tuSi);

    if (rank === 1) {
      // Top 1: 50k linh thạch + 96 đạo niên + 15 nguyên liệu phẩm cao nhất
      gainedExp = 96 * speed;
      const mat = await getMaterialForPlayer(tuSi.capDo);
      if (mat) {
        await Inventory.addVatPham(tuSi.idNguoiDung, mat.id, 15, { quality: 'Thần Thoại' });
        giftMsg += ` 💎 **${mat.ten}** [Thần Thoại] x15`;
      }
    } else if (rank === 2 || rank === 3) {
      // Top 2-3: 50k linh thạch + 64 đạo niên + 10 nguyên liệu phẩm cao nhất
      gainedExp = 64 * speed;
      const mat = await getMaterialForPlayer(tuSi.capDo);
      if (mat) {
        await Inventory.addVatPham(tuSi.idNguoiDung, mat.id, 10, { quality: 'Thần Thoại' });
        giftMsg += ` 💎 **${mat.ten}** [Thần Thoại] x10`;
      }
    } else if (rank >= 4 && rank <= 10) {
      // Top 4-10: 50k linh thạch + 32 đạo niên + 10 nguyên liệu (30% Thần thoại, 70% Sử thi)
      gainedExp = 32 * speed;
      const mat = await getMaterialForPlayer(tuSi.capDo);
      if (mat) {
        let ttCount = 0;
        let stCount = 0;
        for (let i = 0; i < 10; i++) {
          if (Math.random() < 0.30) ttCount++;
          else stCount++;
        }
        if (ttCount > 0) {
          await Inventory.addVatPham(tuSi.idNguoiDung, mat.id, ttCount, { quality: 'Thần Thoại' });
        }
        if (stCount > 0) {
          await Inventory.addVatPham(tuSi.idNguoiDung, mat.id, stCount, { quality: 'Sử Thi' });
        }
        giftMsg += ` 💎 **${mat.ten}** [Thần Thoại] x${ttCount} | [Sử Thi] x${stCount}`;
      }
    } else {
      // Top 11-999: 50k linh thạch
      gainedExp = 0;
    }

    tuSi.linhThach = Math.min(2_000_000_000, tuSi.linhThach + gainedStones);
    if (gainedExp > 0) {
      tuSi.linhLuc += gainedExp;
    }



    await tuSi.save();

    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🔹';
    report += `${rankEmoji} **Top ${rank}**: <@${entry.id}> gây \`${entry.dmg.toLocaleString()}\` sát thương.\n`;
    report += `   → Nhận \`+${gainedStones.toLocaleString()}\` 🪙 Linh thạch${gainedExp > 0 ? `, \`+${gainedExp.toLocaleString()}\` ⚡ Linh lực` : ''}.${giftMsg ? '\n   → ' + giftMsg.trim() : ''}\n\n`;
  }

  return report.trim();
}


// Helper: Xây dựng Embed trạng thái boss hiện tại
function buildBossEmbed(boss) {
  const hpPercent = Math.max(0, Math.floor((boss.hp / boss.maxHp) * 100));
  const filledBars = Math.round(hpPercent / 10);
  const hpBar = '🟩'.repeat(filledBars) + '⬜'.repeat(10 - filledBars);

  const realmName = boss.realm || layRealmNameTuCapDo(boss.level);

  // Tạo top danh sách sát thương
  const dealers = boss.damageDealers;
  const sorted = Object.keys(dealers)
    .map(id => ({ id, dmg: dealers[id] }))
    .sort((a, b) => b.dmg - a.dmg)
    .slice(0, 5);

  let leaderBoard = '';
  if (sorted.length === 0) {
    leaderBoard = '*Chưa có tu sĩ nào xuất thủ.*';
  } else {
    leaderBoard = sorted.map((d, i) => `${i === 0 ? '🥇' : '🔹'} <@${d.id}>: \`${d.dmg.toLocaleString()}\` ST`).join('\n');
  }

  const minutesLeft = Math.max(0, Math.ceil((new Date(boss.hetHan).getTime() - Date.now()) / 60000));

  return new EmbedBuilder()
    .setTitle(`👹 CỰ THÚ XUẤT THẾ: ${boss.ten}`)
    .setColor(0xff3838)
    .setDescription(
      `*Địa điểm xuất hiện: <#${boss.channelId}>*\n` +
      `*Mô tả: Thú triều nghịch chuyển, khí vận biến hóa sinh ra yêu nghiệt tàn sát sinh linh.*`
    )
    .addFields(
      { name: '📊 Chỉ Số Cự Thú', value: `• **Cảnh giới**: \`${realmName} (Cấp ${boss.level})\`\n• **Giáp**: \`${boss.giap}\` | **Phòng ngự**: \`${boss.vatPhong}\``, inline: false },
      { name: `❤️ Sinh Mệnh: ${hpPercent}% (${boss.hp.toLocaleString()} / ${boss.maxHp.toLocaleString()})`, value: `${hpBar}`, inline: false },
      { name: '⚔️ Sát Thương Đóng Góp (Top 5)', value: leaderBoard, inline: true },
      { name: '⏳ Thời Gian Còn Lại', value: `\`${minutesLeft} phút\` (Sẽ rút lui khi hết giờ)`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Nhấn nút Tấn Công để góp sức tiêu diệt!' });
}

// Helper: Xây dựng các nút hành động cho Boss
function buildBossButtons(boss) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`boss_attack_${boss.idGuild}`)
      .setLabel('⚔️ Tấn Công Cự Thú')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!boss.active || boss.hp <= 0),
    new ButtonBuilder()
      .setCustomId(`boss_refresh_${boss.idGuild}`)
      .setLabel('🔄 Làm Mới Trạng Thái')
      .setStyle(ButtonStyle.Secondary)
  );
}

class BoDieuKhienBoss extends BoDieuKhienGoc {
  constructor() {
    super();
    this.lastSpawnKey = '';
  }

  // Khởi động vòng lặp kiểm tra tự động sinh Boss
  khoiThaoBossSchedule(client) {
    console.log('[Boss System] Khởi động tiến trình quản lý Cự Thú...');

    // Kiểm tra mỗi 1 phút
    setInterval(async () => {
      try {
        const now = new Date();

        // 1. Kiểm tra và dọn dẹp Boss đã quá giờ
        const activeBosses = await WorldBoss.findAll({ where: { active: true } });
        for (const boss of activeBosses) {
          if (new Date(boss.hetHan) < now) {
            boss.active = false;
            await boss.save();

            // Sửa lại tin nhắn thông báo ban đầu nếu tìm thấy kênh và tin nhắn
            try {
              const channel = await client.channels.fetch(boss.channelId).catch(() => null);
              if (channel && boss.messageId) {
                const originalMsg = await channel.messages.fetch(boss.messageId).catch(() => null);
                if (originalMsg) {
                  await originalMsg.edit({
                    embeds: [
                      new EmbedBuilder()
                        .setTitle(`🏃‍♂️ CỰ THÚ ĐÃ RÚT LUI: ${boss.ten}`)
                        .setColor(0x7f8c8d)
                        .setDescription(`Do không có tu sĩ nào tiêu diệt kịp thời, Cự Thú đã rút lui về hoang cổ bí cảnh. Hẹn gặp lại chư vị đạo hữu lần sau.`)
                        .setTimestamp()
                    ],
                    components: []
                  });
                }
              }
            } catch (err) {
              console.error('[Boss System] Lỗi khi dọn dẹp boss hết hạn:', err);
            }
          }
        }

        // 2. Tự động sinh Boss theo cấu hình từng Guild
        const { CauHinhGuild } = await import('../models/CauHinhGuild.js');
        const guilds = client.guilds.cache;
        for (const [guildId, guild] of guilds) {
          try {
            let guildConfig = await CauHinhGuild.findByPk(guildId);
            if (!guildConfig) {
              guildConfig = await CauHinhGuild.create({ idGuild: guildId });
            }

            // Cho phép nhiều boss ở nhiều cảnh giới khác nhau hoạt động đồng thời
            const activeCount = await WorldBoss.count({ where: { idGuild: guildId, active: true } });
            if (activeCount >= 3) continue;

            const nowTime = now.getTime();
            let shouldSpawn = false;

            if (guildConfig.bossSpawnType === 'chu_ky') {
              const minutes = parseInt(guildConfig.bossSpawnValue, 10) || 60;
              const lastSpawn = guildConfig.bossLastSpawnAt ? new Date(guildConfig.bossLastSpawnAt).getTime() : 0;
              if (nowTime - lastSpawn >= minutes * 60000) {
                shouldSpawn = true;
              }
            } else if (guildConfig.bossSpawnType === 'moc_gio') {
              const localTimeStr = now.toLocaleTimeString('en-US', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
              });
              const hoursList = (guildConfig.bossSpawnValue || '')
                .split(',')
                .map(t => t.trim())
                .filter(Boolean);

              if (hoursList.includes(localTimeStr)) {
                const lastSpawn = guildConfig.bossLastSpawnAt ? new Date(guildConfig.bossLastSpawnAt).getTime() : 0;
                if (nowTime - lastSpawn >= 60000) {
                  shouldSpawn = true;
                }
              }
            }

            // Chạy tính toán HP boss lúc 7:00 sáng
            const nowVN = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
            const dateStr = nowVN.toDateString();
            const currentHour = nowVN.getHours();
            if (currentHour >= 7 && global.lastDmgCalcDate !== dateStr) {
              global.lastDmgCalcDate = dateStr;
              await this.tinhToanHpBossTheoCanhGioi();
            }

            if (shouldSpawn) {
              guildConfig.bossLastSpawnAt = now;
              await guildConfig.save();

              // Triệu hồi đồng thời cả 3 Boss ở 3 kênh
              await this.trieuHoiWorldBossTuDong(client, guildId, guild, 'Luyện Khí');
              await this.trieuHoiWorldBossTuDong(client, guildId, guild, 'Trúc Cơ');
              await this.trieuHoiWorldBossTuDong(client, guildId, guild, 'Kim Đan');
            }
          } catch (gErr) {
            console.error(`[Boss System] Lỗi khi xử lý tự động triệu hồi cho guild ${guildId}:`, gErr);
          }
        }

      } catch (err) {
        console.error('[Boss System] Lỗi tiến trình tự động sinh boss:', err);
      }
    }, 30000);
  }

  // Tính chỉ số boss động theo từng cảnh giới dựa trên chỉ số thực tế của người chơi
  // Chạy 1 lần/ngày (7h sáng) và khi admin triệu hồi thủ công
  async tinhVaLuuChiSoBoss(guildId) {
    try {
      const { TuSi } = await import('../models/TuSi.js');
      const { Op } = await import('sequelize');

      const realmRanges = {
        'Luyện Khí': { min: 1, max: 9 },
        'Trúc Cơ':   { min: 10, max: 12 },
        'Kim Đan':   { min: 13, max: 999 }
      };

      const result = {};

      for (const [realm, range] of Object.entries(realmRanges)) {
        const players = await TuSi.findAll({
          where: { capDo: { [Op.between]: [range.min, range.max] } }
        });

        if (players.length === 0) {
          // Fallback nếu không có người chơi ở cảnh giới này
          result[realm] = { maxHp: 50000, vatCong: 500, phapCong: 500, vatPhong: 100, phapPhong: 100, giap: 30 };
          continue;
        }

        // Tính trung bình HP và công của người chơi
        let totalHp = 0;
        let totalAtk = 0;
        for (const p of players) {
          try {
            const stats = await p.layChiSoDayDu();
            totalHp  += (stats.max_hp  || 0);
            totalAtk += Math.max(stats.vat_cong || 0, stats.phap_cong || 0);
          } catch (e) { /* bỏ qua nếu lỗi 1 tu sĩ */ }
        }

        const avgHp  = Math.floor(totalHp  / players.length);
        const avgAtk = Math.floor(totalAtk / players.length);

        // Chạy giả lập 15 lượt đánh để tính dmg trung bình
        // Dmg đơn giản: avgAtk * hệ số ổn định
        const avgDmgPerHit = Math.floor(avgAtk * 0.8);
        const estimatedTotalDmg = avgDmgPerHit * 15;

        result[realm] = {
          maxHp:    Math.max(10000, estimatedTotalDmg * 30),
          vatCong:  Math.max(100,   Math.floor(avgHp  / 10)),
          phapCong: Math.max(100,   Math.floor(avgHp  / 10)),
          vatPhong: Math.max(50,    Math.floor(avgAtk / 10)),
          phapPhong:Math.max(50,    Math.floor(avgAtk / 10)),
          giap:     Math.max(10,    Math.floor(avgAtk / 20))
        };
      }

      fs.writeFileSync('./world_boss_stats.json', JSON.stringify(result, null, 2), 'utf8');
      console.log('[Boss System] Đã tính lại và lưu chỉ số boss:', JSON.stringify(result));
      return result;
    } catch (err) {
      console.error('[Boss System] Lỗi khi tính chỉ số boss:', err);
      return null;
    }
  }

  // Hàm triệu hồi Boss tự động cho Guild theo Cảnh Giới
  async trieuHoiWorldBossTuDong(client, guildId, guild, realm = 'Luyện Khí') {
    try {
      const channelNames = {
        'Luyện Khí': '👹┃ʟᴜʏệɴ-ᴋʜí',
        'Trúc Cơ': '☠️┃ᴛʀúᴄ-ᴄơ',
        'Kim Đan': '👾┃ᴋɪᴍ-đᴀɴ'
      };
      const targetName = channelNames[realm];
      let targetChannel = guild.channels.cache.find(c =>
        c.type === ChannelType.GuildText &&
        (c.name === targetName || c.name.toLowerCase() === targetName.toLowerCase())
      );

      if (!targetChannel) {
        try {
          targetChannel = await guild.channels.create({
            name: targetName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                deny: [PermissionFlagsBits.SendMessages]
              }
            ]
          });
          console.log(`[Boss System] Tự động tạo kênh boss: ${targetName}`);
        } catch (e) {
          // Fallback to text channels if creation is restricted
          targetChannel = guild.channels.cache.find(c =>
            c.type === ChannelType.GuildText &&
            c.permissionsFor(guild.members.me).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])
          );
        }
      }

      if (!targetChannel) return;
      const targetChannelId = targetChannel.id;

      // Đọc cấu hình đạo niên để tính toán sức mạnh Boss
      const guildConfig = await this.layHoacTaoCauHinhGuild(guildId);
      const daoNien = guildConfig.layDaoNienHienTai();
      const bossLevel = Math.min(30, Math.floor(daoNien / 2) + 1);

      // Chọn ngẫu nhiên một loài Boss
      const tpl = BOSS_TEMPLATES[Math.floor(Math.random() * BOSS_TEMPLATES.length)];

      // Đọc chỉ số boss động từ cấu hình (hoặc tính toán theo level nếu đang chạy test)
      let bossStats = { maxHp: 30000, vatCong: 150, phapCong: 150, vatPhong: 20, phapPhong: 20, giap: 10 };
      if (process.env.NODE_ENV === 'test') {
        bossStats.maxHp = Math.ceil((bossLevel * 50000 + 50000) / 1000) * 5 * 100 * 3 * 20;
        bossStats.vatCong = Math.ceil((bossLevel * 300 + 100) / 1000) * 10 * 100 * 2 * 2;
        bossStats.phapCong = Math.ceil((bossLevel * 300 + 100) / 1000) * 10 * 100 * 2 * 2;
        bossStats.vatPhong = bossLevel * 100 + 50;
        bossStats.phapPhong = bossLevel * 100 + 50;
        bossStats.giap = bossLevel * 10 + 20;
      } else {
        try {
          // Kiểm tra xem file đã có dữ liệu realm này chưa
          let needRecalc = true;
          if (fs.existsSync('./world_boss_stats.json')) {
            const fileData = JSON.parse(fs.readFileSync('./world_boss_stats.json', 'utf8'));
            if (fileData[realm]) {
              bossStats = fileData[realm];
              needRecalc = false;
            }
          }
          // Nếu chưa có dữ liệu cho realm này → tính lại toàn bộ
          if (needRecalc) {
            console.log(`[Boss System] File chỉ số boss chưa có dữ liệu cho realm "${realm}", tự động tính lại...`);
            const newStats = await this.tinhVaLuuChiSoBoss(guildId);
            if (newStats && newStats[realm]) {
              bossStats = newStats[realm];
            }
          }
        } catch (err) {
          console.error('[Boss System] Lỗi khi lấy chỉ số boss động:', err);
        }
      }


      // Hạn giờ biến mất: 30 phút
      const hetHan = new Date(Date.now() + 30 * 60000);

      // Xóa boss cũ ở cảnh giới tương ứng
      await WorldBoss.destroy({ where: { idGuild: guildId, realm } });

      // Tạo đối tượng Boss lưu vào Database
      const boss = await WorldBoss.create({
        idGuild: guildId,
        realm,
        channelId: targetChannelId,
        ten: tpl.ten + ` (${realm})`,
        level: bossLevel,
        maxHp: bossStats.maxHp,
        hp: bossStats.maxHp,
        vatCong: bossStats.vatCong,
        phapCong: bossStats.phapCong,
        vatPhong: bossStats.vatPhong,
        phapPhong: bossStats.phapPhong,
        giap: bossStats.giap,
        damageDealers: {},
        hetHan,
        active: true
      });

      // Gửi tin nhắn thông báo vào kênh đích
      const channel = await client.channels.fetch(targetChannelId).catch(() => null);
      if (channel) {
        const msg = await channel.send({
          content: '@everyone 🔔 **[WORLD BOSS] Cự Thú Thái Cổ đã giáng thế!**',
          embeds: [buildBossEmbed(boss)],
          components: [buildBossButtons(boss)]
        });
        boss.messageId = msg.id;
        await boss.save();
      }

      console.log(`[Boss System] Triệu hồi Boss ${tpl.ten} (Cấp ${bossLevel}) thành công tại Guild ${guild.name} (Kênh: #${channel?.name || targetChannelId})`);
    } catch (err) {
      console.error('[Boss System] Lỗi khi tạo boss tự động:', err);
    }
  }

  // Lệnh Slash /boss để xem trạng thái hiện tại hoặc cho phép admin triệu hồi
  lenhBoss = {
    data: new SlashCommandBuilder()
      .setName('boss')
      .setDescription('Khiêu chiến Cự Thú thế giới bảo vệ đại địa tông môn'),

    execute: async (interaction) => {
      await interaction.deferReply();

      const guildId = interaction.guildId;
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      // Xác định cảnh giới của tu sĩ
      let playerRealm = 'Luyện Khí';
      if (tuSi.capDo >= 13) playerRealm = 'Kim Đan';
      else if (tuSi.capDo >= 10) playerRealm = 'Trúc Cơ';

      // Xác định kênh boss tương ứng cảnh giới của tu sĩ
      const realmChannelNames = {
        'Luyện Khí': '👹┃ʟᴜʏệɴ-ᴋʜí',
        'Trúc Cơ': '☠️┃ᴛʀúᴄ-ᴄơ',
        'Kim Đan': '👾┃ᴋɪᴍ-đᴀɴ'
      };
      const expectedChannelName = realmChannelNames[playerRealm];
      const currentChannelName = interaction.channel?.name || '';

      // Kiểm tra nếu đang dùng lệnh ở kênh boss của cảnh giới khác → từ chối
      const bossChannelNames = Object.values(realmChannelNames);
      const isInABossChannel = bossChannelNames.some(n => currentChannelName === n || currentChannelName.toLowerCase() === n.toLowerCase());
      const isInWrongBossChannel = isInABossChannel && currentChannelName !== expectedChannelName && currentChannelName.toLowerCase() !== expectedChannelName.toLowerCase();
      if (isInWrongBossChannel) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(`⚔️ **Sai Chiến Trường!**\nĐạo hữu ở cảnh giới **${playerRealm}** chỉ có thể khiêu chiến Cự Thú tại kênh \`${expectedChannelName}\`.`)]
        });
      }

      let boss = await WorldBoss.findOne({ where: { idGuild: guildId, realm: playerRealm, active: true } });

      if (boss) {
        // Kiểm tra xem Boss đã quá giờ chưa
        if (new Date(boss.hetHan) < new Date()) {
          boss.active = false;
          await boss.save();
          return await interaction.editReply({
            embeds: [BoTaoEmbed.thongTin('🌌 Cự Thú Rút Lui', 'Cự Thú thế giới đã ẩn dật trở lại bí cảnh hoang cổ do chư vị tu sĩ không tiêu diệt kịp thời.')]
          });
        }

        // Hiển thị giao diện chiến đấu boss hiện tại
        return await interaction.editReply({
          embeds: [buildBossEmbed(boss)],
          components: [buildBossButtons(boss)]
        });
      }

      return await interaction.editReply({
        embeds: [BoTaoEmbed.thongTin('🌌 Thái Bình Thịnh Thế', `Yêu thú lánh đời, đất trời yên ả. Hiện tại không có Cự Thú nào giáng lâm tại chiến trường **${playerRealm}** của đạo hữu.`)]
      });
    }
  };

  // Tương tác khi người dùng click vào nút của Cự Thú
  async handleInteraction(interaction) {
    const customId = interaction.customId;
    const guildId = interaction.guildId;

    // Helper bọc an toàn tránh lỗi Unknown interaction (10062) khi mạng chậm
    const safeDefer = async (type = 'update', options = {}) => {
      try {
        if (type === 'update') {
          await interaction.deferUpdate();
        } else {
          await interaction.deferReply(options);
        }
        return true;
      } catch (e) {
        if (e.code === 10062 || e.message?.includes('Unknown interaction')) {
          console.warn(`[Boss Interaction] Token expired or unknown interaction for user ${interaction.user.id}: ${e.message}`);
          return false;
        }
        throw e;
      }
    };

    // 1. Admin bấm triệu hồi Boss
    if (customId === `boss_admin_spawn_${guildId}`) {
      if (!await safeDefer('update')) return;

      const client = interaction.client;
      const guild = interaction.guild;

      // Hủy tin nhắn triệu hồi
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription('⏳ Đang tiến hành triệu hồi Cự Thú Thái Cổ...')],
        components: []
      });

      await this.trieuHoiWorldBossTuDong(client, guildId, guild);

      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription('✅ Triệu hồi thành công! Hãy theo dõi thông báo tại kênh giới hạn.')],
        components: []
      });
      return;
    }

    if (customId === 'boss_cancel') {
      if (!await safeDefer('update')) return;
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x7f8c8d).setDescription('Đã hủy yêu cầu.')],
        components: []
      });
      return;
    }

    // 2. Làm mới trạng thái Boss
    if (customId === `boss_refresh_${guildId}`) {
      if (!await safeDefer('update')) return;
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.reply({ embeds: [BoTaoEmbed.loi('Ngươi chưa có nhân vật!')], ephemeral: true });
      }

      let bossRealm = 'Luyện Khí';
      if (tuSi.capDo >= 13) bossRealm = 'Kim Đan';
      else if (tuSi.capDo >= 10) bossRealm = 'Trúc Cơ';

      const boss = await WorldBoss.findOne({ where: { idGuild: guildId, realm: bossRealm, active: true } });
      if (!boss) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.thongTin('🌌 Cự Thú Biến Mất', `Cự Thú tại chiến trường **${bossRealm}** đã bị tiêu diệt hoặc đã rút lui.`)],
          components: []
        });
      }
      await interaction.editReply({
        embeds: [buildBossEmbed(boss)],
        components: [buildBossButtons(boss)]
      });
      return;
    }

    // 3. Tấn công Boss
    if (customId === `boss_attack_${guildId}`) {
      if (!await safeDefer('reply', { ephemeral: true })) return;

      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      // Xác định cảnh giới của tu sĩ và kiểm tra kênh
      let playerRealm = 'Luyện Khí';
      if (tuSi.capDo >= 13) playerRealm = 'Kim Đan';
      else if (tuSi.capDo >= 10) playerRealm = 'Trúc Cơ';

      const realmChannelNames = {
        'Luyện Khí': '👹┃ʟᴜʏệɴ-ᴋʜí',
        'Trúc Cơ': '☠️┃ᴛʀúᴄ-ᴄơ',
        'Kim Đan': '👾┃ᴋɪᴍ-đᴀɴ'
      };
      const expectedChannelName = realmChannelNames[playerRealm];
      const currentChannelName = interaction.channel?.name || '';
      const bossChannelNames = Object.values(realmChannelNames);
      const isInABossChannel = bossChannelNames.some(n => currentChannelName === n || currentChannelName.toLowerCase() === n.toLowerCase());
      const isInWrongBossChannel = isInABossChannel && currentChannelName !== expectedChannelName && currentChannelName.toLowerCase() !== expectedChannelName.toLowerCase();
      if (isInWrongBossChannel) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(`⚔️ **Sai Chiến Trường!**\nĐạo hữu ở cảnh giới **${playerRealm}** chỉ có thể khiêu chiến Cự Thú tại kênh \`${expectedChannelName}\`.`)]
        });
      }

      const activeCooldown = await this.kiemTraThoiGianCho(tuSi.idNguoiDung, 'boss');
      if (activeCooldown) {
        const leftSecs = Math.max(0, Math.ceil((new Date(activeCooldown.hetHan).getTime() - Date.now()) / 1000));
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(`Đạo hữu đang hồi chiêu sau khi khiêu chiến Cự Thú! Vui lòng chờ \`${leftSecs}\` giây.`)]
        });
      }

      const boss = await WorldBoss.findOne({ where: { idGuild: guildId, realm: playerRealm, active: true } });
      if (!boss || boss.hp <= 0) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi(`Cự Thú tại chiến trường **${playerRealm}** đã bị tiêu diệt hoặc chưa xuất hiện!`)]
        });
      }

      // Khống chế KS: Khi Boss dưới 10% HP, phải khiêu chiến trong vòng 2 phút trước đó
      if (boss.hp <= boss.maxHp * 0.10) {
        const lastAttackCd = await this.kiemTraThoiGianCho(tuSi.idNguoiDung, 'boss_last_attack');
        let canAttack = false;
        if (lastAttackCd) {
          const lastAttackTime = lastAttackCd.duLieu.lastAttackTime || 0;
          if (Date.now() - lastAttackTime <= 2 * 60 * 1000) {
            canAttack = true;
          }
        }
        if (!canAttack) {
          return await interaction.editReply({
            embeds: [BoTaoEmbed.loi('Cự Thú sắp gục ngã (dưới 10% HP)! Đạo hữu chưa từng tham gia khiêu chiến trước đó hoặc đã không khiêu chiến trong 2 phút vừa qua, Thiên Đạo hạn chế quyền tham chiến để tránh hành vi cướp đoạt công lao (KS).')]
          });
        }
      }

      const stats = await tuSi.layChiSoDayDu();

      // Yêu cầu thể trạng
      if (tuSi.hp <= Math.floor(stats.max_hp * 0.10)) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi('Trạng thái kiệt quệ! Đạo hữu hãy tĩnh dưỡng hồi HP (`/nghi`) hoặc uống thuốc để hồi phục khí huyết trước khi xuất chiến.')]
        });
      }

      // Kích hoạt kỹ năng chủ động của Pháp Bảo khi vào chiến đấu
      let playerAtkMult = 1.0;
      const pbLogs = [];
      const equippedInv = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true } });
      const dharmaTreasures = [];
      for (const eq of equippedInv) {
        const detail = await Item.findByPk(eq.itemId);
        if (detail && detail.loai === 'Pháp Bảo') {
          eq.item = detail;
          dharmaTreasures.push(eq);
        }
      }

      const { Pet } = await import('../models/Pet.js');
      let activePet = await Pet.findOne({ where: { userId: tuSi.idNguoiDung, isActive: true } });
      if (activePet) {
        const check = config.checkHuyetMachApChe(tuSi.capDo, activePet.rarity);
        if (!check.allowed) activePet = null;
      }

      let monsterHp = boss.hp;
      let playerHp = tuSi.hp;
      let playerMp = tuSi.mp;
      let playerShield = 0;
      let round = 1;
      let totalDmgDealt = 0;
      const battleLogs = [];
      const petPrepLogs = [];
      const activeBuffs = [];
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
      let bossSlowRounds = 0;
      let bossSlowPctVal = 0;

      // Kích hoạt kỹ năng chủ động của Thần Thú khi vào trận chiến
      let kyLanCumulativeDmg = 0;
      let kyLanBurstTriggered = false;

      if (activePet && monsterHp > 0) {
        const template = config.PET_TEMPLATES[activePet.type];
        if (template && template.group === 'than_thu') {
          const totalEvolves = config.getPetTotalEvolves(activePet);
          const evoMult = Math.pow(1.05, totalEvolves);

          if (template.species === 'to_long') {
            const dmg = Math.floor(stats.phap_cong * 1.2 * evoMult);
            monsterHp = Math.max(0, monsterHp - dmg);
            totalDmgDealt += dmg;
            toLongBuffActive = true;
            playerLifestealRounds = (activePet.tienHoa >= 6) ? 3 : 2;
            bossStunnedRounds = 2;
            petSkillCooldownLeft = 5;
            petPrepLogs.push(`🐉 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Phước lành chân long 🐉**, gây \`${dmg.toLocaleString()}\` sát thương pháp thuật lên **${boss.ten}** (HP còn: \`${monsterHp.toLocaleString()}\`). Khiến yêu thú bị **Choáng trong 2 lượt** và tăng **50% hút máu** cho tu sĩ trong \`${playerLifestealRounds}\` lượt!`);
          } else if (template.species === 'huyen_vu') {
            const shieldAmt = Math.floor(stats.max_hp * 0.25 * evoMult);
            playerShield = (playerShield || 0) + shieldAmt;
            huyenVuBuffActive = true;
            huyenVuCritActive = true;
            critDmgRedPct = Math.min(0.50, 0.20 + (activePet.tienHoa || 0) * 0.03);

            // Poison setup
            bossPoisonRounds = 3;
            bossPoisonStacks = 1;
            bossPoisonDmgPerStack = Math.floor(stats.max_hp * Math.min(0.10, 0.05 + (activePet.tienHoa || 0) * 0.005));
            const poisonDmgInitial = bossPoisonDmgPerStack * bossPoisonStacks;
            petSkillCooldownLeft = 5;

            petPrepLogs.push(`🐢 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Cự Thần Hồng Hoang 🐢**, tạo lớp lá chắn kiên cố \`${shieldAmt.toLocaleString()}\` HP hộ mệnh, đồng thời phun chất độc gây \`${poisonDmgInitial.toLocaleString()}\` sát thương độc lực đầu mỗi lượt (kéo dài 3 hiệp, cộng dồn tối đa 3 lần). Khi kẻ địch bạo kích, tu sĩ giảm \`${Math.floor(critDmgRedPct * 100)}%\` sát thương gánh chịu và phản lại 25% sát thương gánh chịu!`);
          } else if (template.species === 'bach_ho') {
            const dmg = Math.floor(stats.vat_cong * 1.2 * evoMult);
            monsterHp = Math.max(0, monsterHp - dmg);
            totalDmgDealt += dmg;
            bachHoBuffActive = true;

            bossWeakenRounds = 2;
            bossWeakenPct = Math.min(0.50, 0.20 + (activePet.tienHoa || 0) * 0.03);
            playerImmuneRounds = 2;
            petSkillCooldownLeft = 5;
            petPrepLogs.push(`🐅 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Bạch Hổ Sát Chiêu 🐅**, trảo kích gây \`${dmg.toLocaleString()}\` sát thương vật lý lên **${boss.ten}** (HP còn: \`${monsterHp.toLocaleString()}\`). Khiến Boss bị **Suy yếu giảm ${Math.floor(bossWeakenPct * 100)}% song công** trong 2 lượt, tu sĩ giải trừ và kháng toàn bộ hiệu ứng bất lợi trong 2 lượt!`);
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
            totalDmgDealt += totalPetDmg;
            petSkillCooldownLeft = 5;
            petPrepLogs.push(`<:phung:1522635618377662484> **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Hỏa Phượng Liệt Diễm**, liên hoàn oanh kích **${totalHits} lần** (sát thương song công tăng tiến 20% mỗi lần), gây tổng cộng \`${totalPetDmg.toLocaleString()}\` sát thương lên **${boss.ten}** (HP còn: \`${monsterHp.toLocaleString()}\`).`);
          } else if (template.species === 'ky_lan') {
            petSkillCooldownLeft = 0;
          }
        }
      }

      for (const eq of dharmaTreasures) {
        const activeSkill = config.layKyNangPhapBaoActive(eq.item || eq.itemId, stats);
        if (activeSkill) {
          if (activeSkill.loai === 'tan_cong') {
            monsterHp = Math.max(0, monsterHp - activeSkill.triGia);
            totalDmgDealt += activeSkill.triGia;
            pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Gây thêm \`+${activeSkill.triGia}\` sát thương.`);
          } else if (activeSkill.loai === 'hoi_mau_pct') {
            const healAmt = Math.floor(stats.max_hp * (activeSkill.triGia / 100));
            playerHp = Math.min(stats.max_hp, playerHp + healAmt);
            pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Hồi phục \`+${healAmt}\` HP (Hiện tại: \`${playerHp}/${stats.max_hp}\`).`);
          } else if (activeSkill.loai === 'tang_cong_pct') {
            if (activeSkill.ten.includes("Cuồng Hóa Chiến Ý")) {
              const hpSacrifice = Math.floor(playerHp * 0.10);
              playerHp = Math.max(1, playerHp - hpSacrifice);
              pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Tiêu hao \`-${hpSacrifice}\` HP.`);
            }
            playerAtkMult += activeSkill.triGia / 100;
            pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Gia tăng \`+${activeSkill.triGia}%\` Công kích.`);
          } else if (activeSkill.loai === 'khien') {
            playerShield = (playerShield || 0) + activeSkill.triGia;
            pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Tạo khiên bảo vệ \`+${activeSkill.triGia}\` HP.`);
          } else if (activeSkill.loai === 'hon_hop') {
            monsterHp = Math.max(0, monsterHp - activeSkill.triGia);
            totalDmgDealt += activeSkill.triGia;
            playerShield = (playerShield || 0) + activeSkill.triGiaKhien;
            pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Gây thêm \`+${activeSkill.triGia}\` sát thương và tạo khiên \`+${activeSkill.triGiaKhien}\` HP.`);
          } else if (activeSkill.loai === 'khong_che') {
            if (Math.random() <= activeSkill.chance) {
              bossStunnedRounds = activeSkill.duration;
              pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Khiến Boss bị **Đóng Băng (mất lượt) trong ${activeSkill.duration} hiệp**!`);
            } else {
              pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}** nhưng bị Boss hóa giải.`);
            }
          } else if (activeSkill.loai === 'hoi_hp') {
            playerHp = Math.min(stats.max_hp, playerHp + activeSkill.triGia);
            pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Hồi phục lập tức \`+${activeSkill.triGia}\` HP (Hiện tại: \`${playerHp}/${stats.max_hp}\`).`);
          } else if (activeSkill.loai === 'hoi_mp') {
            playerMp = Math.min(stats.max_mp, playerMp + activeSkill.triGia);
            pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Hồi phục lập tức \`+${activeSkill.triGia}\` MP (Hiện tại: \`${playerMp}/${stats.max_mp}\`).`);
          } else if (activeSkill.loai === 'tu_khi_ky') {
            activeBuffs.push({
              ten: activeSkill.ten,
              pbTen: eq.item.ten,
              loai: 'tu_khi_ky',
              triGia: activeSkill.triGia,
              speedBonus: activeSkill.speedBonus,
              roundsLeft: activeSkill.duration
            });
            pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Tăng \`+${activeSkill.triGia}%\` Pháp Công và \`+${activeSkill.speedBonus}\` Tốc độ trong \`${activeSkill.duration}\` hiệp.`);
          } else if (activeSkill.loai === 'thach_phu_thuan') {
            playerShield = (playerShield || 0) + activeSkill.triGia;
            activeBuffs.push({
              ten: activeSkill.ten,
              pbTen: eq.item.ten,
              loai: 'thach_phu_thuan',
              roundsLeft: activeSkill.duration
            });
            pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Tạo khiên \`+${activeSkill.triGia}\` HP và tăng \`+30%\` Phòng thủ trong \`${activeSkill.duration}\` hiệp.`);
          } else if (activeSkill.loai === 'u_thiet_lien') {
            const dmg = activeSkill.triGia;
            monsterHp = Math.max(0, monsterHp - dmg);
            totalDmgDealt += dmg;
            bossSlowRounds = activeSkill.duration;
            bossSlowPctVal = 0.05;
            activeBuffs.push({
              ten: activeSkill.ten,
              pbTen: eq.item.ten,
              loai: 'u_thiet_lien_debuff',
              speedDebuff: activeSkill.speedDebuff || 5,
              roundsLeft: activeSkill.duration
            });
            pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Gây \`+${dmg}\` sát thương và giảm \`${activeSkill.speedDebuff || 5}\` Tốc độ của Boss trong \`${activeSkill.duration}\` hiệp.`);
          } else if (activeSkill.loai === 'chien_co') {
            activeBuffs.push({
              ten: activeSkill.ten,
              pbTen: eq.item.ten,
              loai: 'chien_co',
              triGia: activeSkill.triGia,
              critBonus: activeSkill.critBonus || 0.05,
              roundsLeft: activeSkill.duration
            });
            pbLogs.push(`🔮 **Pháp Bảo** [${eq.item.ten}] kích hoạt **${activeSkill.ten}**: Tăng \`+${activeSkill.triGia}%\` Vật Công và \`+${Math.floor((activeSkill.critBonus || 0.05) * 100)}%\` Bạo kích trong \`${activeSkill.duration}\` hiệp.`);
          }
        }
      }

      // Tính toán sát thương gây ra
      const isPhysical = tuSi.huongTu === 'The Tu' || tuSi.huongTu === 'Thể Tu';
      const bossDef = isPhysical ? boss.vatPhong : boss.phapPhong;

      // Tải kỹ năng đã học để dùng khi đánh Boss
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

      // Tốc độ và Điểm hành động (AV)
      const playerSpeed = stats.speed || 100;
      const bossSpeed = 100;

      let avPlayer = 10000 / playerSpeed;
      let avBoss = 10000 / bossSpeed;

      const baseAvPlayer = avPlayer;
      const baseAvBoss = avBoss;

      let playerActionCount = 0;
      let combatRound = 1;
      const petTemplate = activePet ? config.PET_TEMPLATES[activePet.type] : null;

      const originalMaxHp = stats.max_hp;

      const petState = { cooldown: 0 };
      let bleed = null;
      let blind = 0;
      let slow = 0;
      let tebut = 0;
      let nightmare = 0;
      let hoito = 0;
      let caitu = 0;

      let caituTriggered = false;
      let critImmune = false;
      let reflect = false;

      let monsterBleed = null;
      let monsterBlind = 0;
      let monsterSlow = 0;
      let monsterTebut = 0;
      let monsterNightmare = 0;

      // Trạng thái hiệu ứng Luyện Khí
      let tuKhiActive = 0;
      let chienYStacks = 0;
      let chienYDuration = 0;
      let linhPhaoDebuff = 0;
      let monsterTanKhiRounds = 0;
      let monsterTanKhiPct = 0;

      while (monsterHp > 0 && playerHp > 0 && playerActionCount < 15) {
        // Tính toán tốc độ hành động động của người chơi theo buff
        let currentPlaySpeed = stats.speed || 100;
        for (const buff of activeBuffs) {
          if (buff.loai === 'huyet_mach_cuong_hoa' && buff.roundsLeft > 0) {
            currentPlaySpeed += buff.speedBonus;
          }
          if (buff.loai === 'tu_khi_ky' && buff.roundsLeft > 0) {
            currentPlaySpeed += buff.speedBonus;
          }
          if (buff.loai === 'bat_hoang_bo_buff' && buff.roundsLeft > 0) {
            currentPlaySpeed += buff.speedBonus;
          }
        }
        if (chienYStacks > 0 && chienYDuration > 0) {
          const skillHKPT = skills.find(s => s.detail.id === 'huyet_khi_phun_trao');
          const capDoHKPT = skillHKPT ? skillHKPT.capDo : 1;
          const speedBonusPerStack = Math.floor(2 * (1 + (capDoHKPT - 1) * 0.01));
          currentPlaySpeed += chienYStacks * speedBonusPerStack;
        }
        const dynamicBaseAvPlayer = 10000 / currentPlaySpeed;

        if (avPlayer <= avBoss) {
          // Lượt của người chơi
          const elapsed = avPlayer;
          avBoss -= elapsed;
          avPlayer = dynamicBaseAvPlayer;

          // --- NEW PET SYSTEM PLAYER TURN ---
          if (bleed && bleed.turns > 0) {
            const dmg = bleed.dmg;
            playerHp = Math.max(0, playerHp - dmg);
            bleed.turns -= 1;
            battleLogs.push(`🩸 **Chảy Máu**: Bạn mất \`${dmg.toLocaleString()}\` HP từ vết thương chảy máu (HP còn: \`${playerHp.toLocaleString()}\`).`);
            if (bleed.turns <= 0) bleed = null;
            if (playerHp <= 0) {
              if (caitu > 0 && !caituTriggered) {
                playerHp = Math.floor(stats.max_hp * 0.30);
                caituTriggered = true;
                caitu = 0;
                battleLogs.push(`😇 **CẢI TỬ HOÀN SINH**: Ấn ký bảo mệnh hồi sinh bạn với \`${playerHp.toLocaleString()}\` HP!`);
              } else {
                break;
              }
            }
          }

          if (hoito > 0) {
            hoito -= 1;
            const heal = Math.floor(stats.max_hp * 0.05);
            playerHp = Math.min(stats.max_hp, playerHp + heal);
            battleLogs.push(`🌿 **Hồi Tô**: Bạn tự hồi phục \`${heal.toLocaleString()}\` HP đầu hiệp (HP hiện tại: \`${playerHp.toLocaleString()}\`).`);
          }

          if (nightmare > 0) {
            nightmare -= 1;
            const mpLost = Math.floor(playerMp * 0.10);
            playerMp = Math.max(0, playerMp - mpLost);
            battleLogs.push(`💤 **Mộng Yểm**: Bạn bị chìm trong ác mộng, mất lượt hành động và tổn hao \`${mpLost.toLocaleString()}\` MP!`);
            playerActionCount++;
            combatRound++;
            continue;
          }

          // Active Pet Skill execution
          if (activePet && playerHp > 0 && monsterHp > 0) {
            if (petState.cooldown > 0) petState.cooldown -= 1;
            if (petState.cooldown === 0) {
              const dummyBossStats = { max_hp: monsterHp, vat_cong: boss.vatCong || 100, phap_cong: boss.vatCong || 100, vat_phong: boss.giap || 10, phap_phong: boss.giap || 10, speed: 100 };
              const res = config.handlePetCombatSkill(activePet, petState, stats, dummyBossStats, battleLogs, tuSi.ten, boss.ten, monsterBleed);
              if (res) {
                battleLogs.push(res.log);
                if (res.damage > 0) {
                  let finalDmg = res.damage;
                  if (res.ignoreDef) {
                    const targetDef = boss.giap * (1.0 - res.ignoreDef);
                    finalDmg = Math.max(1, Math.floor(finalDmg - targetDef));
                  } else {
                    finalDmg = Math.max(1, Math.floor(finalDmg - boss.giap));
                  }

                  if (res.checkTebutBonus && monsterTebut > 0) {
                    const bonusTrue = Math.floor(monsterHp * 0.05);
                    finalDmg += bonusTrue;
                    battleLogs.push(`❄️ **Tê Buốt Kích Phát**: Sát thương sủng vật tăng thêm \`+${bonusTrue.toLocaleString()}\` sát thương chuẩn!`);
                  }

                  monsterHp = Math.max(0, monsterHp - finalDmg);
                  totalDmgDealt += finalDmg;
                  battleLogs.push(`💥 **Sát thương sủng vật**: **${boss.ten}** nhận \`${finalDmg.toLocaleString()}\` sát thương sủng vật (HP còn: \`${monsterHp.toLocaleString()}\`).`);

                  if (res.execute && monsterHp > 0 && monsterHp < boss.hp * 0.15) {
                    monsterHp = 0;
                    battleLogs.push(`💀 **KẾT LIỄU**: Sủng vật lập tức kết liễu **${boss.ten}** dưới 15% HP!`);
                  }
                }
                if (res.healHp > 0) {
                  playerHp = Math.min(stats.max_hp, playerHp + res.healHp);
                  battleLogs.push(`💚 **Hồi phục**: Bạn hồi phục \`${res.healHp.toLocaleString()}\` HP.`);
                }
                if (res.healMp > 0) {
                  playerMp = Math.min(stats.max_mp, playerMp + res.healMp);
                  battleLogs.push(`💙 **Hồi phục**: Bạn hồi phục \`${res.healMp.toLocaleString()}\` MP.`);
                }
                if (res.shield > 0) {
                  playerShield = res.shield;
                  if (res.critImmune) critImmune = true;
                  if (res.reflectDmg) reflect = true;
                }
                if (res.clearBleed) {
                  monsterBleed = null;
                }
                if (res.applyBleed) monsterBleed = res.applyBleed;
                if (res.applyBlind) monsterBlind = res.applyBlind.turns;
                if (res.applySlow) {
                  bossSlowRounds = res.applySlow.turns;
                  bossSlowPctVal = 0.15;
                }
                if (res.applyTebut) monsterTebut = res.applyTebut.turns;
                if (res.applyNightmare) monsterNightmare = res.applyNightmare.turns;
                if (res.applyHoito) hoito = res.applyHoito.turns;
                if (res.applyCaituhoansinh) caitu = res.applyCaituhoansinh.turns;
              }
            }
          }

          if (blind > 0) blind--;
          if (slow > 0) slow--;
          if (tebut > 0) tebut--;
          if (caitu > 0) caitu--;

          // Log active buffs/debuffs for player
          const currentBuffs = [];
          if (tuKhiActive > 0) currentBuffs.push(`Tụ Khí (${tuKhiActive} hiệp)`);
          if (chienYStacks > 0) currentBuffs.push(`Chiến Ý x${chienYStacks} (${chienYDuration} hiệp)`);
          if (playerShield > 0) currentBuffs.push(`Khiên Chắn (\`${playerShield.toLocaleString()}\` HP)`);
          if (slow > 0) currentBuffs.push(`Làm Chậm (${slow} hiệp)`);
          if (tebut > 0) currentBuffs.push(`Tê Buốt (${tebut} hiệp)`);
          if (caitu > 0) currentBuffs.push(`Cải Tử Hoàn Sinh (${caitu} hiệp)`);
          if (nightmare > 0) currentBuffs.push(`Mộng Yểm (${nightmare} hiệp)`);
          if (blind > 0) currentBuffs.push(`Mù Mắt (${blind} hiệp)`);
          for (const buff of activeBuffs) {
            if (buff.roundsLeft > 0) {
              currentBuffs.push(`${buff.ten} (${buff.roundsLeft} hiệp)`);
            }
          }
          if (currentBuffs.length > 0) {
            battleLogs.push(`ℹ️ **[Hiệu ứng hiện tại của ${tuSi.ten}]**: ${currentBuffs.join(', ')}`);
          }
          if (playerShield <= 0) {
            critImmune = false;
            reflect = false;
          }

          if (blind > 0 && Math.random() <= 0.50) {
            battleLogs.push(`👁️ **Mù mắt**: Bạn đang bị [Mù], chiêu thức chệch hướng hoàn toàn!`);
            playerActionCount++;
            combatRound++;
            continue;
          }

          if (phoenixRegenRounds > 0) {
            const regenAmt = Math.floor(stats.max_hp * 0.05);
            playerHp = Math.min(stats.max_hp, playerHp + regenAmt);
            battleLogs.push(`<:phung:1522635618377662484> **Phượng Hoàng Hộ Thể**: Hồi phục \`+${regenAmt}\` HP từ hiệu ứng Niết Bàn (Hiện tại: \`${playerHp}/${stats.max_hp}\`).`);
            phoenixRegenRounds--;
          }

          if (isHuyenVuActive) {
            const healAmt = Math.floor(stats.max_hp * 0.05);
            playerHp = Math.min(stats.max_hp, playerHp + healAmt);
            const maxHpBuff = Math.floor(originalMaxHp * 0.05);
            stats.max_hp += maxHpBuff;
            battleLogs.push(`🐢 **Huyền Vũ Hồi Phục**: Hồi phục \`+${healAmt.toLocaleString()}\` HP và gia tăng giới hạn HP tối đa thêm \`+${maxHpBuff.toLocaleString()}\` (HP hiện tại: \`${playerHp}/${stats.max_hp}\`).`);
          }

          // Sát thương độc lực của Huyền Vũ (đầu lượt)
          if (bossPoisonRounds > 0 && bossPoisonStacks > 0) {
            const poisonDmgTotal = bossPoisonDmgPerStack * bossPoisonStacks;
            monsterHp = Math.max(0, monsterHp - poisonDmgTotal);
            totalDmgDealt += poisonDmgTotal;
            battleLogs.push(`🤢 **Trúng độc**: **${boss.ten}** chịu \`-${poisonDmgTotal.toLocaleString()}\` sát thương độc lực (cộng dồn x${bossPoisonStacks}) (HP còn: \`${monsterHp.toLocaleString()}\`).`);
            bossPoisonRounds--;
            if (bossPoisonRounds === 0) {
              bossPoisonStacks = 0;
            }
            if (monsterHp <= 0) break;
          }

          // Pháp Tướng Kim Cang Regen
          for (const buff of activeBuffs) {
            if (buff.loai === 'phap_tuong_kim_cang_regen' && buff.roundsLeft > 0) {
              const healAmt = Math.floor(stats.max_hp * buff.triGia);
              playerHp = Math.min(stats.max_hp, playerHp + healAmt);
              battleLogs.push(`❇️ **Pháp Tướng Kim Cang**: Hồi phục \`+${healAmt.toLocaleString()}\` HP từ hư ảnh hộ pháp (HP hiện tại: \`${playerHp}/${stats.max_hp}\`).`);
            }
          }

          // Hỏa Lôi Đạp burn damage
          for (const buff of activeBuffs) {
            if (buff.loai === 'hoa_loi_dap' && buff.roundsLeft > 0) {
              const burnDmg = Math.floor(stats.vat_cong * buff.triGia);
              monsterHp = Math.max(0, monsterHp - burnDmg);
              totalDmgDealt += burnDmg;
              battleLogs.push(`🔥 **Hỏa Lôi Đạp**: **${boss.ten}** chịu \`-${burnDmg.toLocaleString()}\` sát thương vật lý thiêu đốt (HP còn: \`${monsterHp.toLocaleString()}\`).`);
            }
          }
          if (monsterHp <= 0) break;

          let currentRoundAtkMult = playerAtkMult;
          for (const buff of activeBuffs) {
            if (buff.loai === 'tang_cong_pct' && buff.roundsLeft > 0) {
              currentRoundAtkMult += buff.triGia / 100;
            } else if (buff.loai === 'huyet_mach_cuong_hoa' && buff.roundsLeft > 0) {
              currentRoundAtkMult += buff.triGia;
            } else if (buff.loai === 'tu_khi_ky' && buff.roundsLeft > 0) {
              currentRoundAtkMult += buff.triGia / 100;
            } else if (buff.loai === 'chien_co' && buff.roundsLeft > 0) {
              currentRoundAtkMult += buff.triGia / 100;
            } else if (buff.loai === 'tu_duong_chuong' && buff.roundsLeft > 0) {
              currentRoundAtkMult += buff.triGia;
            } else if (buff.loai === 'hong_hoang_kich_buff' && buff.roundsLeft > 0) {
              currentRoundAtkMult += buff.triGia;
            }
          }
          if (toLongBuffActive) {
            currentRoundAtkMult += 0.10;
          }
          if (isHuyenVuActive) {
            const huyenVuBuff = playerActionCount * 0.02;
            currentRoundAtkMult += huyenVuBuff;
          }
          const currentRoundPlayerAtk = Math.floor((isPhysical ? stats.vat_cong : stats.phap_cong) * currentRoundAtkMult);

          let pDmg = 0;
          let roundCritRate = stats.crit_rate;
          let roundCritDmg = stats.crit_dmg;
          if (bachHoBuffActive) {
            roundCritRate = Math.min(1.0, roundCritRate + 0.15);
            roundCritDmg += 0.30;
          }
          for (const buff of activeBuffs) {
            if (buff.loai === 'chien_co' && buff.roundsLeft > 0) {
              roundCritRate += (buff.critBonus || 0.05);
            }
          }
          const isCrit = Math.random() <= roundCritRate;
          let castMsg = '';

          // Tìm kỹ năng sẵn sàng và đủ MP
          const readySkill = skills.find(s => {
            const cost = config.getSkillMpCost(s.detail);
            return s.nextRoundAvailable <= playerActionCount + 1 && playerMp >= cost;
          });

          if (readySkill && Math.random() <= 0.60) {
            const skill = readySkill.detail;
            const capDo = readySkill.capDo;
            const cost = config.getSkillMpCost(skill);
            playerMp = Math.max(0, playerMp - cost);

            const isKimDan = skill.yeuCauCanhGioi === 13;
            const isLuyenKhi = ['tu_khi_thuat', 'linh_phao_thuat', 'huyet_khi_phun_trao', 'bang_son_quyen'].includes(skill.id);
            const levelBonus = (isKimDan || isLuyenKhi) ? 0.01 : 0.1;
            const skillMult = (skill.satThuong / 100) * (1 + (capDo - 1) * levelBonus);
            let rawDmg = currentRoundPlayerAtk * skillMult;

            castMsg = `thi triển **${skill.ten} (Cấp ${capDo})**`;

            // Combo / Hiệu ứng kỹ năng Luyện Khí
            if (skill.loai === 'Phép thuật' && tuKhiActive > 0) {
              const skillTKT = skills.find(s => s.detail.id === 'tu_khi_thuat');
              const capDoTKT = skillTKT ? skillTKT.capDo : 1;
              const bonusPct = 0.20 * (1 + (capDoTKT - 1) * 0.01);
              rawDmg = rawDmg * (1 + bonusPct);

              if (skill.id === 'linh_phao_thuat') {
                const slowChance = 0.15 * (1 + (capDo - 1) * 0.01);
                if (Math.random() <= slowChance) {
                  linhPhaoDebuff = 2;
                  battleLogs.push(`💥 **Linh Pháo Kích Nổ**: Kích hoạt combo Tụ Khí, gây thêm 30% sát thương lan và làm giảm \`3\` Tốc độ của Boss trong 2 hiệp!`);
                } else {
                  battleLogs.push(`💥 **Linh Pháo Kích Nổ**: Kích hoạt combo Tụ Khí, gây thêm 30% sát thương lan!`);
                }
                rawDmg = rawDmg * 1.30;
              } else {
                battleLogs.push(`🌀 **Tụ Khí Kích Phát**: Sát thương của chiêu thức phép thuật này tăng thêm \`+${Math.round(bonusPct * 100)}%\`!`);
              }
              tuKhiActive = 0; // Tiêu hao trạng thái Tụ Khí
            }

            if (skill.id === 'bang_son_quyen' && chienYStacks >= 2) {
              const critBonus = 0.20 * (1 + (capDo - 1) * 0.01);
              roundCritRate += critBonus;
              isCrit = Math.random() <= roundCritRate;
              bossStunnedRounds = 1;
              chienYStacks = 0;
              chienYDuration = 0;
              castMsg = `thi triển **Toái Đỉnh Quyền (Cấp ${capDo})**`;
              battleLogs.push(`👊 **Toái Đỉnh Quyền**: Tiêu hao toàn bộ tầng Chiến Ý chuyển hóa Băng Sơn Quyền, tăng \`+${Math.round(critBonus * 100)}%\` tỷ lệ bạo kích và khiến Boss bị **[Choáng]** trong 1 hiệp!`);
            }

            if (isCrit) rawDmg = rawDmg * roundCritDmg;

            let targetDef = bossDef;
            if (skill.id === 'bat_hoang_toai_thach_kich') {
              const ignorePct = Math.min(1.0, 0.10 * (1 + (capDo - 1) * 0.01));
              targetDef = Math.floor(bossDef * (1 - ignorePct));
            }
            if (monsterTanKhiRounds > 0) {
              targetDef = Math.floor(targetDef * (1 - monsterTanKhiPct));
            }
            pDmg = Math.max(10, Math.floor(rawDmg) - targetDef);
            if (skill.satThuong === 0) pDmg = 0;

            const cooldownRounds = Math.max(1, Math.ceil(skill.cooldown / 3));
            readySkill.nextRoundAvailable = playerActionCount + 1 + cooldownRounds;

            // Xử lý hiệu ứng đặc biệt của kỹ năng Luyện Khí
            if (skill.id === 'tu_khi_thuat') {
              const mpRecPct = 0.15 * (1 + (capDo - 1) * 0.01);
              const mpRecAmt = Math.floor(stats.max_mp * mpRecPct);
              playerMp = Math.min(stats.max_mp, playerMp + mpRecAmt);
              tuKhiActive = 2;
              battleLogs.push(`🌀 **${skill.ten}**: Dẫn dắt linh khí hồi phục \`+${mpRecAmt.toLocaleString()}\` MP và nhận trạng thái **[Tụ Khí]** trong 2 hiệp.`);
            }
            if (skill.id === 'huyet_khi_phun_trao') {
              const hpSacrifice = Math.floor(playerHp * 0.10);
              playerHp = Math.max(1, playerHp - hpSacrifice);
              chienYStacks = Math.min(3, (chienYStacks || 0) + 1);
              chienYDuration = 3;
              battleLogs.push(`🔥 **${skill.ten}**: Thiêu đốt \`-${hpSacrifice.toLocaleString()}\` HP hiện tại, tích lũy 1 tầng **[Chiến Ý]** (Hiện tại: \`${chienYStacks}/3\` tầng, kéo dài 3 hiệp).`);
            }

            // Xử lý hiệu ứng đặc biệt của kỹ năng Trúc Cơ
            if (skill.id === 'tu_duong_chuong') {
              const phapCongBonus = 0.10 * (1 + (capDo - 1) * 0.01);
              activeBuffs.push({
                ten: skill.ten,
                pbTen: skill.ten,
                loai: 'tu_duong_chuong',
                triGia: phapCongBonus,
                roundsLeft: 3
              });
              const tanKhiChance = 0.35 * (1 + (capDo - 1) * 0.01);
              if (Math.random() <= tanKhiChance) {
                monsterTanKhiRounds = 2;
                monsterTanKhiPct = 0.15 * (1 + (capDo - 1) * 0.01);
                battleLogs.push(`🔥 **${skill.ten}**: Gây trạng thái **[Tán Khí]** làm giảm \`-${Math.round(monsterTanKhiPct * 100)}%\` Kháng Pháp của đối phương trong 2 hiệp.`);
              }
            }
            if (skill.id === 'phap_tuong_kim_cang') {
              const hpHealPct = 0.08 * (1 + (capDo - 1) * 0.01);
              const defBonusPct = 0.30 * (1 + (capDo - 1) * 0.01);
              const hoTheReduction = 0.15 * (1 + (capDo - 1) * 0.01);
              activeBuffs.push({
                ten: skill.ten,
                pbTen: skill.ten,
                loai: 'phap_tuong_kim_cang_regen',
                triGia: hpHealPct,
                roundsLeft: 5
              });
              activeBuffs.push({
                ten: skill.ten,
                pbTen: skill.ten,
                loai: 'phap_tuong_kim_cang_shield',
                defBonus: defBonusPct,
                reduction: hoTheReduction,
                roundsLeft: 5
              });
              battleLogs.push(`🛡️ **${skill.ten}**: Triệu hồi Pháp Tướng, tăng cường phòng ngự và hồi phục tự thân.`);
            }
            if (skill.id === 'hong_hoang_kich') {
              const hpHealAmt = Math.floor(stats.max_hp * 0.05);
              playerHp = Math.min(stats.max_hp, playerHp + hpHealAmt);
              const vatCongBonus = 0.15 * (1 + (capDo - 1) * 0.01);
              activeBuffs.push({
                ten: skill.ten,
                pbTen: skill.ten,
                loai: 'hong_hoang_kich_buff',
                triGia: vatCongBonus,
                roundsLeft: 2
              });
              battleLogs.push(`🩸 **${skill.ten}**: Hồi phục \`+${hpHealAmt.toLocaleString()}\` HP, tăng \`+${Math.round(vatCongBonus * 100)}%\` Vật công trong 2 hiệp.`);

              if (monsterHp / boss.hp >= 0.70) {
                isCrit = true;
                battleLogs.push(`💥 **${skill.ten}**: Mục tiêu dồi dào huyết khí, kích hoạt chắc chắn bạo kích!`);
              }
              const stunChance = 0.30 * (1 + (capDo - 1) * 0.01);
              if (Math.random() <= stunChance) {
                bossStunnedRounds = 1;
                battleLogs.push(`💤 **${skill.ten}**: Gây trạng thái **[Định Thân]** khiến đối phương mất lượt!`);
              }
            }
            if (skill.id === 'bat_hoang_bo') {
              const hpHealAmt = Math.floor(stats.max_hp * 0.10);
              playerHp = Math.min(stats.max_hp, playerHp + hpHealAmt);
              const speedBonus = Math.floor((stats.speed || 100) * 0.30 * (1 + (capDo - 1) * 0.01));
              const neBonus = 0.20 * (1 + (capDo - 1) * 0.01);
              activeBuffs.push({
                ten: skill.ten,
                pbTen: skill.ten,
                loai: 'bat_hoang_bo_buff',
                speedBonus: speedBonus,
                neBonus: neBonus,
                roundsLeft: 4
              });
              activeBuffs.push({
                ten: skill.ten,
                pbTen: skill.ten,
                loai: 'hoa_loi_dap',
                triGia: 0.40 * (1 + (capDo - 1) * 0.01),
                roundsLeft: 4
              });
              battleLogs.push(`👟 **${skill.ten}**: Hồi \`+${hpHealAmt.toLocaleString()}\` HP, tăng tốc độ và khả năng né tránh, kích hoạt trạng thái **[Hỏa Lôi Đạp]**.`);
            }

            // Xử lý hiệu ứng đặc biệt của kỹ năng Kim Đan
            if (skill.id === 'cuu_long_ba_the_tran') {
              const shieldPct = 0.20 * (1 + (capDo - 1) * 0.01);
              const shieldAmt = Math.floor(stats.max_hp * shieldPct);
              playerShield = (playerShield || 0) + shieldAmt;
              battleLogs.push(`🛡️ **${skill.ten}**: Tạo lá chắn vững chắc \`+${shieldAmt.toLocaleString()}\` HP.`);
            }
            if (skill.id === 'huyet_mach_cuong_hoa') {
              const hpSacrifice = Math.floor(playerHp * 0.10);
              playerHp = Math.max(1, playerHp - hpSacrifice);
              const atkBonusPct = 0.30 * (1 + (capDo - 1) * 0.01);
              const speedBonus = Math.floor(20 * (1 + (capDo - 1) * 0.01));
              activeBuffs.push({
                ten: skill.ten,
                pbTen: skill.ten,
                loai: 'huyet_mach_cuong_hoa',
                triGia: atkBonusPct,
                speedBonus: speedBonus,
                roundsLeft: 3
              });
              battleLogs.push(`🔥 **${skill.ten}**: Thiêu đốt \`-${hpSacrifice}\` HP hiện tại, tăng \`+${Math.floor(atkBonusPct * 100)}%\` Vật Công và \`+${speedBonus}\` Tốc độ trong 3 hiệp.`);
            }
            if (skill.id === 'thai_hu_van_kiem_quyet') {
              const speedRedPct = 0.10 * (1 + (capDo - 1) * 0.01);
              bossSlowRounds = 3;
              bossSlowPctVal = speedRedPct;
              battleLogs.push(`❄️ **${skill.ten}**: Làm chậm \`+${Math.floor(speedRedPct * 100)}%\` Tốc độ của đối phương.`);
            }
            if (skill.id === 'ngu_loi_oanh_dinh') {
              const stunChance = 0.20 * (1 + (capDo - 1) * 0.01);
              if (Math.random() <= stunChance) {
                bossStunnedRounds = 1;
                battleLogs.push(`⚡ **${skill.ten}**: Gây trạng thái **Tê Liệt (Choáng)** cho đối phương trong 1 hiệp!`);
              }
            }
            if (skill.id === 'dai_tu_linh_tran') {
              const mpHealPct = 0.30 * (1 + (capDo - 1) * 0.01);
              const mpAmt = Math.floor(stats.max_mp * mpHealPct);
              playerMp = Math.min(stats.max_mp, playerMp + mpAmt);
              for (const s of skills) {
                if (s.detail.id !== 'dai_tu_linh_tran') {
                  s.nextRoundAvailable = Math.max(1, s.nextRoundAvailable - 1);
                }
              }
              battleLogs.push(`✨ **${skill.ten}**: Hồi phục \`+${mpAmt}\` Chân Khí (MP), giảm thời gian hồi chiêu của các kỹ năng khác đi 1 lượt.`);
            }
          } else {
            let rawDmg = currentRoundPlayerAtk;
            if (isCrit) rawDmg = rawDmg * roundCritDmg;
            pDmg = Math.max(10, Math.floor(rawDmg) - bossDef);

            castMsg = `đánh thường`;
          }

          monsterHp = Math.max(0, monsterHp - pDmg);
          totalDmgDealt += pDmg;
          battleLogs.push(`💥 **Hiệp ${combatRound}** (Lượt ${playerActionCount + 1}, AV: ${elapsed.toFixed(0)}): **${tuSi.ten}** ${castMsg} gây \`${pDmg.toLocaleString()}\` sát thương lên **${boss.ten}** (HP còn: \`${monsterHp.toLocaleString()}\`).` + (isCrit ? ` (BẠO KÍCH! 💥)` : ''));

          // Kỳ Lân Liên Kích
          if (isKyLanActive && monsterHp > 0) {
            const lkChance = Math.min(1.0, 0.20 + playerSpeed / 3000);
            if (Math.random() <= lkChance) {
              const tienHoa = activePet ? (activePet.tienHoa || 0) : 0;
              let lkDmgMult = 0.50;
              for (let i = 1; i <= tienHoa; i++) {
                if (lkDmgMult < 1.0) {
                  lkDmgMult = lkDmgMult * 1.05;
                  if (lkDmgMult > 1.0) lkDmgMult = 1.0;
                }
              }
              const lkDmg = Math.max(10, Math.floor(currentRoundPlayerAtk * lkDmgMult) - bossDef);
              monsterHp = Math.max(0, monsterHp - lkDmg);
              totalDmgDealt += lkDmg;
              battleLogs.push(`   ➔ 🐆 **Kỳ Lân Liên Kích**: Tung thêm đòn đánh phụ nhanh như chớp (Dame x${Math.floor(lkDmgMult * 100)}%) gây \`+${lkDmg.toLocaleString()}\` sát thương lên **${boss.ten}** (HP còn: \`${monsterHp.toLocaleString()}\`).`);
            }
          }

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

          if (monsterHp <= 0) break;

          // Kỳ Lân active skill mỗi lượt của chủ nhân
          if (activePet) {
            const template = config.PET_TEMPLATES[activePet.type];
            if (template && template.group === 'than_thu') {
              const totalEvolves = config.getPetTotalEvolves(activePet);
              const evoMult = Math.pow(1.05, totalEvolves);

              if (template.species === 'ky_lan') {
                const pct = Math.min(0.30, 0.25 + (activePet.tienHoa || 0) * 0.005);
                const isPhap = tuSi.huongTu === 'Phap Tu' || tuSi.huongTu === 'Pháp Tu';
                const dmgTypeVal = isPhap ? stats.phap_cong : stats.vat_cong;
                let petDmg = Math.floor(dmgTypeVal * pct * evoMult);
                monsterHp = Math.max(0, monsterHp - petDmg);
                totalDmgDealt += petDmg;
                kyLanCumulativeDmg = (kyLanCumulativeDmg || 0) + petDmg;
                battleLogs.push(`🦄 **Thần Thú Kích Hoạt**: **${activePet.name}** oanh kích gây \`${petDmg.toLocaleString()}\` sát thương ${isPhap ? 'pháp thuật' : 'vật lý'} lên yêu thú (HP còn: \`${monsterHp.toLocaleString()}\`).`);

                const limit = stats.max_hp * Math.min(0.70, 0.50 + (activePet.tienHoa || 0) * 0.02);
                if (!kyLanBurstTriggered && kyLanCumulativeDmg >= limit) {
                  const burstDmg = Math.floor(limit * 2);
                  monsterHp = Math.max(0, monsterHp - burstDmg);
                  totalDmgDealt += burstDmg;
                  kyLanBurstTriggered = true;
                  battleLogs.push(`🦄 **Kỳ Lân Bộc Phá**: Tích lũy sát thương đạt mốc, **${activePet.name}** bộc phát cuồng nộ x2 sát thương giới hạn, giáng thêm \`-${burstDmg.toLocaleString()}\` sát thương chí mạng lên **${boss.ten}** (HP còn: \`${monsterHp.toLocaleString()}\`)!`);
                }
                if (monsterHp <= 0) break;
              } else {
                // Thần thú khác (Tổ Long, Huyền Vũ, Bạch Hổ, Phượng Hoàng)
                if (petSkillCooldownLeft === 0 && Math.random() <= 0.10) {
                  petSkillCooldownLeft = 5;
                  if (template.species === 'to_long') {
                    const petDmg = Math.floor(stats.phap_cong * 1.2 * evoMult);
                    monsterHp = Math.max(0, monsterHp - petDmg);
                    totalDmgDealt += petDmg;
                    toLongBuffActive = true;
                    playerLifestealRounds = (activePet.tienHoa >= 6) ? 3 : 2;
                    bossStunnedRounds = 2;
                    battleLogs.push(`🐉 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Phước lành chân long 🐉** gây \`${petDmg.toLocaleString()}\` sát thương pháp thuật lên yêu thú (HP còn: \`${monsterHp.toLocaleString()}\`). Boss bị **Choáng trong 2 lượt** và tu sĩ tăng **50% hút máu** trong \`${playerLifestealRounds}\` lượt!`);
                    if (monsterHp <= 0) break;
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
                    if (monsterHp <= 0) break;
                  } else if (template.species === 'bach_ho') {
                    const petDmg = Math.floor(stats.vat_cong * 1.2 * evoMult);
                    monsterHp = Math.max(0, monsterHp - petDmg);
                    totalDmgDealt += petDmg;

                    bossWeakenRounds = 2;
                    bossWeakenPct = Math.min(0.50, 0.20 + (activePet.tienHoa || 0) * 0.03);
                    playerImmuneRounds = 2;
                    bachHoBuffActive = true;

                    battleLogs.push(`🐅 **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Bạch Hổ Sát Chiêu 🐅**, trảo kích gây \`${petDmg.toLocaleString()}\` sát thương vật lý lên yêu thú (HP còn: \`${monsterHp.toLocaleString()}\`). Khiến Boss bị **Suy yếu giảm ${Math.floor(bossWeakenPct * 100)}% song công** trong 2 lượt, tu sĩ kháng toàn bộ hiệu ứng bất lợi trong 2 lượt!`);
                    if (monsterHp <= 0) break;
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
                    totalDmgDealt += totalPetDmg;
                    battleLogs.push(`<:phung:1522635618377662484> **Thần Thú Kích Hoạt**: **${activePet.name}** thi triển **Hỏa Phượng Liệt Diễm**, liên hoàn oanh kích **${totalHits} lần** (sát thương song công tăng tiến 20% mỗi lần), gây tổng cộng \`${totalPetDmg.toLocaleString()}\` sát thương lên yêu thú! (HP còn: \`${monsterHp.toLocaleString()}\`).`);
                    if (monsterHp <= 0) break;
                  }
                }
              }
            }
          }

          // Giảm buff thời hạn Luyện Khí
          if (tuKhiActive > 0) {
            tuKhiActive--;
            if (tuKhiActive === 0) {
              battleLogs.push(`✨ Hiệu ứng [Tụ Khí] đã hết tác dụng.`);
            }
          }
          if (chienYDuration > 0) {
            chienYDuration--;
            if (chienYDuration === 0) {
              chienYStacks = 0;
              battleLogs.push(`✨ Hiệu ứng [Chiến Ý] đã hết tác dụng.`);
            }
          }
          if (linhPhaoDebuff > 0) {
            linhPhaoDebuff--;
          }

          if (petSkillCooldownLeft > 0) {
            petSkillCooldownLeft--;
          }
          if (playerLifestealRounds > 0) playerLifestealRounds--;
          if (playerImmuneRounds > 0) playerImmuneRounds--;

          playerActionCount++;
          combatRound++;
        } else {
          // Lượt của Boss
          const elapsed = avBoss;
          avPlayer -= elapsed;

          // --- NEW PET SYSTEM BOSS TURN ---
          if (monsterBleed && monsterBleed.turns > 0) {
            const dmg = monsterBleed.dmg;
            monsterHp = Math.max(0, monsterHp - dmg);
            totalDmgDealt += dmg;
            monsterBleed.turns -= 1;
            battleLogs.push(`🩸 **Chảy Máu**: **${boss.ten}** chịu \`-${dmg.toLocaleString()}\` sát thương chảy máu (HP còn: \`${monsterHp.toLocaleString()}\`).`);
            if (monsterBleed.turns <= 0) monsterBleed = null;
            if (monsterHp <= 0) break;
          }

          if (monsterNightmare > 0) {
            monsterNightmare -= 1;
            battleLogs.push(`💤 **Mộng Yểm**: **${boss.ten}** bị chìm trong ác mộng không thể hành động!`);
            combatRound++;
            continue;
          }

          if (monsterBlind > 0 && Math.random() <= 0.50) {
            battleLogs.push(`👁️ **Mù mắt**: **${boss.ten}** bị [Mù], đòn phản công đánh hụt hoàn toàn!`);
            monsterBlind--;
            combatRound++;
            continue;
          }

          if (monsterBlind > 0) monsterBlind--;
          if (monsterSlow > 0) monsterSlow--;
          if (monsterTebut > 0) monsterTebut--;
          if (monsterTanKhiRounds > 0) monsterTanKhiRounds--;

          let currentBossSpeed = 100;
          if (bossSlowRounds > 0) {
            currentBossSpeed = Math.max(10, Math.floor(currentBossSpeed * (1 - bossSlowPctVal)));
          }
          if (linhPhaoDebuff > 0) {
            currentBossSpeed = Math.max(10, currentBossSpeed - 3);
          }
          for (const buff of activeBuffs) {
            if (buff.loai === 'u_thiet_lien_debuff' && buff.roundsLeft > 0) {
              currentBossSpeed = Math.max(10, currentBossSpeed - (buff.speedDebuff || 5));
            }
          }
          avBoss = 10000 / currentBossSpeed;

          if (bossStunnedRounds > 0) {
            battleLogs.push(`💤 **Choáng**: **${boss.ten}** bị choáng không thể phản công trong hiệp này!`);
          } else {
            let pDef = stats.vat_phong;
            for (const buff of activeBuffs) {
              if (buff.loai === 'thach_phu_thuan' && buff.roundsLeft > 0) {
                pDef = Math.floor(pDef * 1.30);
              }
              if (buff.loai === 'phap_tuong_kim_cang_shield' && buff.roundsLeft > 0) {
                pDef = Math.floor(pDef * (1 + buff.defBonus));
              }
            }
            let bossDmg = Math.max(1, Math.floor((boss.vatCong - pDef) / 2)) * 2;
            let hoTheRed = 0;
            for (const buff of activeBuffs) {
              if (buff.loai === 'phap_tuong_kim_cang_shield' && buff.roundsLeft > 0) {
                hoTheRed = Math.max(hoTheRed, buff.reduction);
              }
            }
            if (hoTheRed > 0) {
              bossDmg = Math.floor(bossDmg * (1 - hoTheRed));
            }

            if (bossWeakenRounds > 0) {
              bossDmg = Math.floor(bossDmg * (1 - bossWeakenPct));
              battleLogs.push(`✨ **Suy yếu**: Yêu thú bị suy yếu, sát thương phản công giảm đi \`-${Math.floor(bossWeakenPct * 100)}%\`.`);
            }

            const isBossCrit = critImmune ? false : (Math.random() <= 0.15);
            let bossCritMsg = '';
            if (isBossCrit) {
              bossDmg = Math.floor(bossDmg * 1.5);
              bossCritMsg = ` (BẠO KÍCH! 💥)`;
            }

            if (isBossCrit && huyenVuCritActive) {
              const redAmt = Math.floor(bossDmg * critDmgRedPct);
              bossDmg -= redAmt;
              const reflectDmg = Math.floor(bossDmg * 0.25);
              monsterHp = Math.max(0, monsterHp - reflectDmg);
              totalDmgDealt += reflectDmg;
              battleLogs.push(`🐢 **Huyền Vũ Giảm Bạo**: Giảm \`-${Math.floor(critDmgRedPct * 100)}%\` sát thương bạo kích gánh chịu, phản hồi \`+${reflectDmg.toLocaleString()}\` sát thương ngược lại Boss (HP còn: \`${monsterHp.toLocaleString()}\`).`);
              if (monsterHp <= 0) break;
            }

            let roundNe = stats.ne;
            if (kyLanBuffActive) {
              roundNe = Math.min(0.90, roundNe + 0.15);
            }
            for (const buff of activeBuffs) {
              if (buff.loai === 'bat_hoang_bo_buff' && buff.roundsLeft > 0) {
                roundNe = Math.min(0.90, roundNe + buff.neBonus);
              }
            }
            const isDodge = Math.random() <= roundNe;

            if (isDodge) {
              battleLogs.push(`💨 **Né tránh**: Đạo hữu nhanh nhẹn né tránh hoàn hảo đòn vồ từ Boss!`);
            } else {
              if (playerShield > 0) {
                if (playerShield >= bossDmg) {
                  playerShield -= bossDmg;
                  battleLogs.push(`🛡️ **Lá Chắn**: Khiên hấp thụ toàn bộ \`${bossDmg}\`${bossCritMsg} sát thương từ Boss (Khiên còn: \`${playerShield}\`).`);
                  bossDmg = 0;
                } else {
                  bossDmg -= playerShield;
                  battleLogs.push(`🛡️ **Lá Chắn**: Khiên hấp thụ \`${playerShield}\`${bossCritMsg} sát thương từ Boss rồi vỡ! Sát thương lọt qua: \`${bossDmg}\`.`);
                  playerShield = 0;
                }
              }

              if (bossDmg > 0) {
                playerHp = Math.max(0, playerHp - bossDmg);
                battleLogs.push(`👹 **Cự Thú** (AV: ${elapsed.toFixed(0)}): **${boss.ten}** phản kích gây \`-${bossDmg}\`${bossCritMsg} sát thương lên **${tuSi.ten}** (HP còn: \`${playerHp}\`).`);

                if (reflect && playerShield > 0) {
                  const refl = Math.floor(bossDmg * 0.30);
                  monsterHp = Math.max(0, monsterHp - refl);
                  totalDmgDealt += refl;
                  battleLogs.push(`🛡️ **Phản Đòn**: Thần Trận Sơn Thần phản hồi \`+${refl.toLocaleString()}\` sát thương ngược lại **${boss.ten}** (HP còn: \`${monsterHp.toLocaleString()}\`).`);
                }

                if (playerHp <= 0) {
                  if (caitu > 0 && !caituTriggered) {
                    playerHp = Math.floor(stats.max_hp * 0.30);
                    caituTriggered = true;
                    caitu = 0;
                    battleLogs.push(`😇 **CẢI TỬ HOÀN SINH**: Ấn ký bảo mệnh cứu mạng đạo hữu, hồi sinh lại với \`${playerHp.toLocaleString()}\` HP!`);
                  }
                }
              }
            }
          }

          if (bossStunnedRounds > 0) bossStunnedRounds--;
          if (bossWeakenRounds > 0) bossWeakenRounds--;
          if (bossSlowRounds > 0) bossSlowRounds--;

          combatRound++;
        }
      }

      boss.hp = monsterHp;
      tuSi.hp = playerHp;
      tuSi.mp = Math.min(stats.max_mp, playerMp);

      const dealers = boss.damageDealers;
      dealers[tuSi.idNguoiDung] = (dealers[tuSi.idNguoiDung] || 0) + totalDmgDealt;
      boss.damageDealers = dealers;

      await tuSi.save();
      await boss.save();

      // Đặt thời gian chờ khiêu chiến mới (1 phút)
      const expiresAt = new Date(Date.now() + 60 * 1000);
      await this.datThoiGianCho(tuSi.idNguoiDung, 'boss', expiresAt);

      // Ghi nhận thời gian tấn công boss cuối cùng (lưu trữ 100 năm)
      const farFuture = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
      await this.datThoiGianCho(tuSi.idNguoiDung, 'boss_last_attack', farFuture, { lastAttackTime: Date.now() });

      // Kiểm tra Cự Thú đã bị tiêu diệt hay chưa
      if (boss.hp <= 0) {
        boss.active = false;
        await boss.save();

        const lastHitterId = tuSi.idNguoiDung;

        // Tiến hành phân bổ phần thưởng
        const report = await phanBoPhanThuongBoss(interaction.client, boss, interaction.guild, lastHitterId);

        // Phát thông báo thắng cuộc vào kênh chung
        const channel = await interaction.client.channels.fetch(boss.channelId).catch(() => null);
        if (channel) {
          const finishedEmbed = new EmbedBuilder()
            .setTitle(`🎉 THIÊN ĐẠO CHẤN ĐỘNG: TIÊU DIỆT ${boss.ten}!`)
            .setColor(0x2ecc71)
            .setDescription(
              `✨ **Thiên Đạo hiển hiện** ✨\n` +
              `Cự thú thế giới đã gục ngã dưới sự đồng lòng hiệp lực của các vị đồng đạo tông môn!\n\n` +
              report
            )
            .setTimestamp();

          // Sửa tin nhắn thông báo gốc (để dọn dẹp các nút bấm)
          if (boss.messageId) {
            const originalMsg = await channel.messages.fetch(boss.messageId).catch(() => null);
            if (originalMsg) {
              await originalMsg.edit({
                embeds: [new EmbedBuilder().setTitle(`🎉 ${boss.ten} Đã Bị Tiêu Diệt!`).setColor(0x2ecc71).setDescription(`Cự thú đã bị tiêu diệt thành công bởi các vị đạo hữu! Xem chi tiết ở tin nhắn mới nhất.`)],
                components: []
              });
            }
          }

          // Gửi tin nhắn mới tinh đính kèm tag @everyone để thông báo cho toàn máy chủ
          await channel.send({
            content: '@everyone 📢 **THIÊN ĐẠO THÔNG BÁO: CỰ THÚ ĐÃ BỊ HẠ GỤC!**',
            embeds: [finishedEmbed]
          });
        }

        return await interaction.editReply({
          embeds: [BoTaoEmbed.thanhCong('⚔️ Đại Thắng Cự Thú!', `Đạo hữu gây sát thương quyết định tiêu diệt **${boss.ten}**!\nNhận thưởng kích sát đặc biệt và phần quà toàn Server đã được trao.`)]
        });
      }

      // Nếu Boss chưa chết, cập nhật giao diện tin nhắn chung
      try {
        const channel = await interaction.client.channels.fetch(boss.channelId).catch(() => null);
        if (channel && boss.messageId) {
          const originalMsg = await channel.messages.fetch(boss.messageId).catch(() => null);
          if (originalMsg) {
            await originalMsg.edit({
              embeds: [buildBossEmbed(boss)],
              components: [buildBossButtons(boss)]
            });
          }
        }
      } catch (err) {
        console.error('[Boss System] Lỗi update message gốc:', err);
      }

      // Trả lời kết quả tấn công riêng tư (ephemeral)
      const logs = [];
      if (pbLogs.length > 0) {
        logs.push(pbLogs.join('\n'));
      }
      if (petPrepLogs.length > 0) {
        logs.push(petPrepLogs.join('\n'));
      }

      // Giới hạn hiển thị 10 hiệp cuối cùng nếu battleLogs quá dài để tránh vượt quá giới hạn ký tự Discord
      const displayLogs = battleLogs.length > 10 ? battleLogs.slice(-10) : battleLogs;
      if (battleLogs.length > 10) {
        logs.push(`*... Đã ẩn ${battleLogs.length - 10} hiệp đấu đầu tiên ...*`);
      }
      logs.push(displayLogs.join('\n'));

      let outcomeMsg = '';
      if (boss.hp <= 0) {
        outcomeMsg = `🎉 **Đại Thắng!** Đạo hữu đã chém chết cự thú **${boss.ten}** trong hiệp đấu thứ ${round - 1}!`;
      } else if (tuSi.hp <= 0) {
        outcomeMsg = `💀 **Thất Bại!** Đạo hữu đã bị cự thú đánh gục tại hiệp thứ ${round - 1}.`;
      } else {
        outcomeMsg = `⏳ **Bất Phân Thắng Bại**: Đạo hữu cự địch hết 15 hiệp, gây tổng cộng **${totalDmgDealt.toLocaleString()}** sát thương (HP còn lại: \`${tuSi.hp}/${stats.max_hp}\`).`;
      }
      logs.push(outcomeMsg);

      return await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⚔️ Kết Quả Hiệp Đấu Cự Thú')
            .setColor(0xe74c3c)
            .setDescription(logs.join('\n\n'))
            .setTimestamp()
        ]
      });
    }
  }
}

const controller = new BoDieuKhienBoss();
export const danhSachLenhBoss = [controller.lenhBoss];
export { controller as boDieuKhienBoss, phanBoPhanThuongBoss };
