import dotenv from 'dotenv';
dotenv.config();

// Discord Bot Token
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Database configuration
export const DATABASE_URL = process.env.DATABASE_URL || 'sqlite:thienco.db';

// Time configuration: 1 Đạo Niên = 15 minutes of real time (900 seconds)
export const DEBUG_MODE = String(process.env.DEBUG_MODE || 'false').toLowerCase() === 'true' || process.env.DEBUG_MODE === '1';
export const DAO_NIEN_SECONDS = DEBUG_MODE ? 15 : 900;

// Base cultivation stats
export const BASE_EXP_PER_DAO_NIEN = 100; // Base linh lực (exp) gained per Đạo Niên of cultivation

// Paths/Directions of cultivation (Hướng đi tu tiên)
export const HUONG_DI = {
  "The Tu": {
    name: "Thể Tu",
    desc: "Thiên về rèn luyện nhục thân, HP cao, Vật công mạnh, Vật phòng lớn, Giáp dày.",
    base_stats: {
      hp: 200,
      mp: 50,
      vat_cong: 25,
      phap_cong: 5,
      vat_phong: 18,
      phap_phong: 8,
      giap: 12,
      xuyen_giap: 5,
      crit_rate: 0.05,  // 5%
      crit_dmg: 1.50,   // 150%
    },
    growth: {
      hp: 30,
      mp: 5,
      vat_cong: 5,
      phap_cong: 1,
      vat_phong: 4,
      phap_phong: 1,
      giap: 3,
      xuyen_giap: 1,
      crit_rate: 0.002,
      crit_dmg: 0.02,
    }
  },
  "Phap Tu": {
    name: "Pháp Tu",
    desc: "Thiên về nội công pháp thuật, MP dồi dào, Pháp công cực mạnh, Pháp phòng lớn, Xuyên giáp cao.",
    base_stats: {
      hp: 120,
      mp: 150,
      vat_cong: 5,
      phap_cong: 25,
      vat_phong: 8,
      phap_phong: 18,
      giap: 5,
      xuyen_giap: 8,
      crit_rate: 0.08,  // 8%
      crit_dmg: 1.60,   // 160%
    },
    growth: {
      hp: 15,
      mp: 25,
      vat_cong: 1,
      phap_cong: 6,
      vat_phong: 1,
      phap_phong: 4,
      giap: 1,
      xuyen_giap: 2,
      crit_rate: 0.003,
      crit_dmg: 0.03,
    }
  }
};

// Elements / Linh Can (Nguồn gốc Linh Căn)
export const NGUON_LINH_CAN = {
  Hoa: { name: "Hỏa Linh Căn", desc: "Tu tốc x1.5, bạo kích mạnh", tu_toc: 1.5, crit_rate: 0.05 },
  Thuy: { name: "Thủy Linh Căn", desc: "HP/MP cao, hồi phục tốt", hp_mult: 1.15, mp_mult: 1.15 },
  Moc: { name: "Mộc Linh Căn", desc: "Cường hóa đan dược, dược hiệu tăng 30%", dan_duoc_mult: 1.3 },
  Kim: { name: "Kim Linh Căn", desc: "Sát thương vật lý +20%", vat_cong_mult: 1.20 },
  Tho: { name: "Thổ Linh Căn", desc: "Phòng thủ tối thượng, HP cao", vat_phong_mult: 1.20, hp_mult: 1.10 },
  Loi: { name: "Lôi Linh Căn", desc: "Hiếm (1%): kỹ năng lôi hệ mạnh, tu tốc x2.0, bạo thương +30%", tu_toc: 2.0, crit_dmg: 0.30 },
};

// Levels and realms mapping (Danh sách Cảnh Giới)
export const CANH_GIOI_LIST = [
  { min_level: 1, max_level: 9, name: "Luyện Khí", stages: ["Tầng 1", "Tầng 2", "Tầng 3", "Tầng 4", "Tầng 5", "Tầng 6", "Tầng 7", "Tầng 8", "Tầng 9"] },
  { min_level: 10, max_level: 12, name: "Trúc Cơ", stages: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
  { min_level: 13, max_level: 15, name: "Kim Đan", stages: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
  { min_level: 16, max_level: 18, name: "Nguyên Anh", stages: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
  { min_level: 19, max_level: 21, name: "Hóa Thần", stages: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
  { min_level: 22, max_level: 24, name: "Phản Hư", stages: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
  { min_level: 25, max_level: 27, name: "Hợp Thể", stages: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
  { min_level: 28, max_level: 30, name: "Đại Thừa", stages: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
  { min_level: 31, max_level: 999, name: "Tiên Nhân", stages: ["Chân Tiên"] },
];

export function layThongTinCanhGioi(level) {
  for (const realm of CANH_GIOI_LIST) {
    if (level >= realm.min_level && level <= realm.max_level) {
      let index = level - realm.min_level;
      if (index >= realm.stages.length) {
        index = realm.stages.length - 1;
      }
      return { realmName: realm.name, stageName: realm.stages[index] };
    }
  }
  return { realmName: "Phàm Nhân", stageName: "Vô Danh" };
}

export function layLinhLucYeuCau(level) {
  if (level >= 31) {
    return 999999999; // Cấp tối đa
  }
  return Math.floor(100 * (1.30 ** (level - 1)));
}

export function layTiLeDotPha(level) {
  if (level < 10) {
    return 1.0 - (level - 1) * 0.025;
  } else if (level < 13) {
    return 0.75 - (level - 10) * 0.05;
  } else if (level < 16) {
    return 0.60 - (level - 13) * 0.05;
  } else if (level < 19) {
    return 0.48 - (level - 16) * 0.05;
  } else if (level < 22) {
    return 0.38 - (level - 19) * 0.05;
  } else if (level < 25) {
    return 0.28 - (level - 22) * 0.05;
  } else if (level < 28) {
    return 0.18 - (level - 25) * 0.04;
  } else {
    return 0.10 - (level - 28) * 0.02;
  }
}

export function rollLinhCan() {
  const roll = Math.random() * 100.0;
  const elementPool = ["Hoa", "Thuy", "Moc", "Kim", "Tho"];

  if (roll <= 0.1) {
    return {
      elements: [...elementPool],
      displayName: "Ngũ Linh Căn"
    };
  } else if (roll <= 1.1) {
    return {
      elements: ["Loi"],
      displayName: "Lôi Linh Căn"
    };
  } else if (roll <= 2.1) {
    const selected = selectRandom(elementPool, 4);
    const names = selected.map(el => NGUON_LINH_CAN[el].name.replace(" Linh Căn", ""));
    return {
      elements: selected,
      displayName: `Tứ Linh Căn (${names.join('/')})`
    };
  } else if (roll <= 5.1) {
    const selected = selectRandom(elementPool, 3);
    const names = selected.map(el => NGUON_LINH_CAN[el].name.replace(" Linh Căn", ""));
    return {
      elements: selected,
      displayName: `Tam Linh Căn (${names.join('/')})`
    };
  } else if (roll <= 15.1) {
    const selected = selectRandom(elementPool, 2);
    const names = selected.map(el => NGUON_LINH_CAN[el].name.replace(" Linh Căn", ""));
    return {
      elements: selected,
      displayName: `Song Linh Căn (${names.join('/')})`
    };
  } else {
    const selected = [elementPool[Math.floor(Math.random() * elementPool.length)]];
    return {
      elements: selected,
      displayName: NGUON_LINH_CAN[selected[0]].name
    };
  }
}

function selectRandom(array, num) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, num);
}
