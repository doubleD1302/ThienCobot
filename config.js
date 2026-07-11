import dotenv from 'dotenv';
dotenv.config();

// Discord Bot Token
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Database configuration
export const DATABASE_URL = process.env.DATABASE_URL || 'sqlite:thienco.db';

// ══════════════════════════════════════════════════════════════════════════════
//  GIỚI HẠN LỆNH THEO KÊNH (Channel Command Restrictions)
//  Cấu hình: key = ID kênh Discord, value = mảng tên lệnh được phép dùng.
//
//  Ví dụ:
//    '123456789012345678': ['bc', 'tuluyen', 'lichluyen'],  // Chỉ cho phép 3 lệnh này
//    '987654321098765432': ['shop', 'balo'],                // Chỉ cho phép shop và balo
//
//  Kênh KHÔNG có trong bảng này → không bị giới hạn, dùng được mọi lệnh.
//  Để tắt tính năng này hoàn toàn → để object rỗng: {}
// ══════════════════════════════════════════════════════════════════════════════
export const KENH_LENH_RIENG = {
  // 'ID_KENH_CUA_BAN': ['ten_lenh_1', 'ten_lenh_2'],
};

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
      hp: 15000,
      mp: 10000,
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
      hp: 2250,
      mp: 1000,
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
      hp: 10000,
      mp: 15000,
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
      hp: 1250,
      mp: 2500,
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
// Elements / Linh Can (Nguồn gốc Linh Căn)
export const NGUON_LINH_CAN = {
  Tho: { name: "Thổ Linh Căn", desc: "Tăng 5% HP, 5% Phòng thủ", emoji: "<:LC_Tho:1525066160326840330>", hp_mult: 1.05, def_mult: 1.05 },
  Hoa: { name: "Hỏa Linh Căn", desc: "Tăng 5% Tấn công, 5% Bạo thương", emoji: "<:LC_Hoa:1525066154081517650>", atk_mult: 1.05, crit_dmg: 0.05 },
  Thuy: { name: "Thủy Linh Căn", desc: "Tăng 5% HP, 5% MP", emoji: "<:LC_thuy:1525066156522733588>", hp_mult: 1.05, mp_mult: 1.05 },
  Moc: { name: "Mộc Linh Căn", desc: "Tăng 5% MP, 5% Phòng thủ", emoji: "<:LC_moc:1525067189227356270>", mp_mult: 1.05, def_mult: 1.05 },
  Kim: { name: "Kim Linh Căn", desc: "Tăng 5% Tấn công, 5% Tốc độ", emoji: "<:LC_kim:1525066151770718289>", atk_mult: 1.05, speed_mult: 1.05 },
  Phong: { name: "Phong Linh Căn", desc: "Tăng 5% Né tránh, 5% Tốc độ", emoji: "<:LC_phong:1525066162793086986>", ne: 0.05, speed_mult: 1.05 },
  Quang: { name: "Quang Linh Căn", desc: "Tăng 5% MP, 5% Tốc độ", emoji: "<:LC_Quang:1525067187008569384>", mp_mult: 1.05, speed_mult: 1.05 },
  Am: { name: "Ám Linh Căn", desc: "Tăng 5% Bạo kích, 5% Hút máu", emoji: "<:LC_am:1525066164454166631>", crit_rate: 0.05, lifesteal: 0.05 }
};

// Huyết Mạch (Bloodline)
export const HUYET_MACH = {
  LongToc: { name: "Long tộc", desc: "Tăng 10% HP (hoặc MP nếu là Pháp Tu) và 10% Tấn công", emoji: "<:long_toc:1525072213420539955>" },
  MaToc: { name: "Ma tộc", desc: "Tăng 10% Tấn công và 10% Bạo kích", emoji: "<:ma_toc:1525072206185627709>" },
  TienToc: { name: "Tiên tộc", desc: "Tăng 10% HP và 10% Phòng thủ", emoji: "<:tien_toc:1525072211281576087>" },
  NhanToc: { name: "Nhân tộc", desc: "Tăng 20% HP (hoặc MP nếu là Pháp Tu)", emoji: "<:nhan_toc:1525072208731570276>" },
  TinhLinh: { name: "Tinh linh tộc", desc: "Tăng 20% Tốc độ", emoji: "<:tinh_linh:1525072215274422272>" }
};

export function rollHuyetMach() {
  const keys = Object.keys(HUYET_MACH);
  return keys[Math.floor(Math.random() * keys.length)];
}

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

export const MAP_DAI_CANH_GIOI = {
  "Luyện Khí": 0,
  "Trúc Cơ": 1,
  "Kim Đan": 2,
  "Nguyên Anh": 3,
  "Hóa Thần": 4,
  "Phản Hư": 5,
  "Hợp Thể": 6,
  "Đại Thừa": 7,
  "Tiên Nhân": 8
};

export const MAP_PILL_TO_REALM = {
  'dan_tu_vi_luyen_khi': 'Luyện Khí',
  'dan_tu_vi_truc_co': 'Trúc Cơ',
  'dan_tu_vi_kim_dan': 'Kim Đan',
  'dan_tu_vi_nguyen_anh': 'Nguyên Anh'
};

export function layDanTuViTheoCapDo(level) {
  const { realmName } = layThongTinCanhGioi(level);
  if (realmName === 'Luyện Khí') return 'dan_tu_vi_luyen_khi';
  if (realmName === 'Trúc Cơ') return 'dan_tu_vi_truc_co';
  if (realmName === 'Kim Đan') return 'dan_tu_vi_kim_dan';
  return 'dan_tu_vi_nguyen_anh';
}

export function layGioiHanDanDaily(level, abodeLevel) {
  const { realmName } = layThongTinCanhGioi(level);
  const realmIndex = MAP_DAI_CANH_GIOI[realmName] || 0;
  return 10 + (abodeLevel || 0) + realmIndex;
}

export function tinhTuViNhanDuoc(pillId, playerCanhGioi, tocDoCoBan) {
  const pillBonusMap = {
    'dan_tu_vi_luyen_khi': 64,
    'dan_tu_vi_truc_co': 64,
    'dan_tu_vi_kim_dan': 64,
    'dan_tu_vi_nguyen_anh': 64
  };
  const countDaoNien = pillBonusMap[pillId] || 64;
  let multiplier = 1.0;
  const pillRealmName = MAP_PILL_TO_REALM[pillId];
  if (pillRealmName) {
    const playerRealmIdx = MAP_DAI_CANH_GIOI[playerCanhGioi] ?? 0;
    const pillRealmIdx = MAP_DAI_CANH_GIOI[pillRealmName] ?? 0;
    const diff = playerRealmIdx - pillRealmIdx;
    if (diff > 0) {
      multiplier = Math.pow(0.5, diff);
    }
  }
  const gainedExp = Math.floor(tocDoCoBan * countDaoNien * multiplier);
  return { gainedExp, multiplier };
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
  const elementPool = ["Tho", "Hoa", "Thuy", "Moc", "Kim", "Phong", "Quang", "Am"];
  const selected = elementPool[Math.floor(Math.random() * elementPool.length)];
  return {
    elements: [selected],
    displayName: NGUON_LINH_CAN[selected].name
  };
}

// ==========================================
// THÔNG TIN VẬT PHẨM MẪU (ITEMS)
// ==========================================
export const ITEMS = [
  // ==================== NGUYÊN LIỆU & ĐAN DƯỢC ĐỘT PHÁ ====================
  { id: 'hat_giong_luyen_khi_thao', ten: 'Hạt Giống Luyện Khí Thảo 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Hạt giống Luyện Khí Thảo, gieo trồng tại dược viên.', emoji: '<:hat_giong:1522644602266456275>', food: 0 },
  { id: 'linh_thao_luyen_khi', ten: 'Luyện Khí Thảo 🌿', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh thảo hấp thu khí thiên địa sơ khởi, nguyên liệu luyện chế Luyện Khí Phá Cảnh Đan.', emoji: '<:thuoc:1522632141698105354>', food: 0 },
  { id: 'dan_dot_pha_1', ten: 'Luyện Khí Phá Cảnh Đan 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Đan dược hỗ trợ đột phá cảnh giới Luyện Khí.', emoji: '<:dan_dotpha:1522644600030756947>', food: 0 },

  { id: 'hat_giong_truc_co_thao', ten: 'Hạt Giống Trúc Cơ Thảo 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Hạt giống Trúc Cơ Thảo, gieo trồng tại dược viên.', emoji: '<:hat_giong:1522644602266456275>', food: 0 },
  { id: 'linh_thao_truc_co', ten: 'Trúc Cơ Thảo 🌿', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Thảo dược ngưng tụ linh lực làm nền móng nhục thân, nguyên liệu luyện chế Trúc Cơ Phá Cảnh Đan.', emoji: '<:thuoc:1522632141698105354>', food: 0 },
  { id: 'dan_dot_pha_2', ten: 'Trúc Cơ Phá Cảnh Đan 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Đan dược hỗ trợ đột phá cảnh giới Trúc Cơ.', emoji: '<:dan_dotpha:1522644600030756947>', food: 0 },

  { id: 'hat_giong_kim_dan_hoa', ten: 'Hạt Giống Kim Đan Hoa 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Hạt giống Kim Đan Hoa, gieo trồng tại dược viên.', emoji: '<:hat_giong:1522644602266456275>', food: 0 },
  { id: 'linh_thao_kim_dan', ten: 'Kim Đan Hoa 🌸', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Kỳ hoa ngưng kết lực quy nhất nội đan, nguyên liệu luyện chế Kim Đan Phá Cảnh Đan.', emoji: '<:thuoc:1522632141698105354>', food: 0 },
  { id: 'dan_dot_pha_3', ten: 'Kim Đan Phá Cảnh Đan 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Đan dược hỗ trợ đột phá cảnh giới Kim Đan.', emoji: '<:dan_dotpha:1522644600030756947>', food: 0 },

  { id: 'hat_giong_nguyen_anh_qua', ten: 'Hạt Giống Nguyên Anh Quả 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 16, moTa: 'Hạt giống Nguyên Anh Linh Quả, gieo trồng tại dược viên.', emoji: '<:hat_giong:1522644602266456275>', food: 0 },
  { id: 'linh_thao_nguyen_anh', ten: 'Nguyên Anh Linh Quả 🍒', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 16, moTa: 'Linh quả dựng dục nguyên thần anh nhi linh phách, nguyên liệu luyện chế Nguyên Anh Phá Cảnh Đan.', emoji: '<:thuoc:1522632141698105354>', food: 0 },
  { id: 'dan_dot_pha_4', ten: 'Nguyên Anh Phá Cảnh Đan 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 16, moTa: 'Đan dược hỗ trợ đột phá cảnh giới Nguyên Anh.', emoji: '<:dan_dotpha:1522644600030756947>', food: 0 },

  { id: 'hat_giong_hoa_than_chi', ten: 'Hạt Giống Hóa Thần Chi 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 19, moTa: 'Hạt giống Hóa Thần Chi, gieo trồng tại dược viên.', emoji: '<:hat_giong:1522644602266456275>', food: 0 },
  { id: 'linh_thao_hoa_than', ten: 'Hóa Thần Chi 🍄', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 19, moTa: 'Nấm thiêng dung hòa thân thần thức tỉnh ngộ đạo, nguyên liệu luyện chế Hóa Thần Phá Cảnh Đan.', emoji: '<:linh_chi:1522610150853316778>', food: 0 },
  { id: 'dan_dot_pha_5', ten: 'Hóa Thần Phá Cảnh Đan 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 19, moTa: 'Đan dược hỗ trợ đột phá cảnh giới Hóa Thần.', emoji: '<:dan_dotpha:1522644600030756947>', food: 0 },

  { id: 'hat_giong_phan_hu_dang', ten: 'Hạt Giống Phản Hư Đằng 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 22, moTa: 'Hạt giống Phản Hư Đằng, gieo trồng tại dược viên.', emoji: '<:hat_giong:1522644602266456275>', food: 0 },
  { id: 'linh_thao_phan_hu', ten: 'Phản Hư Đằng 🍀', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 22, moTa: 'Dây leo cổ linh ngưng tụ pháp thân thoát ly trần thế, nguyên liệu luyện chế Phản Hư Phá Cảnh Đan.', emoji: '<:thuoc:1522632141698105354>', food: 0 },
  { id: 'dan_dot_pha_6', ten: 'Phản Hư Phá Cảnh Đan 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 22, moTa: 'Đan dược hỗ trợ đột phá cảnh giới Phản Hư.', emoji: '<:dan_dotpha:1522644600030756947>', food: 0 },

  { id: 'hat_giong_hop_the_lien', ten: 'Hạt Giống Hợp Thể Liên 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 25, moTa: 'Hạt giống Hợp Thể Liên, gieo trồng tại dược viên.', emoji: '<:hat_giong:1522644602266456275>', food: 0 },
  { id: 'linh_thao_hop_the', ten: 'Hợp Thể Liên 💮', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 25, moTa: 'Tòa sen hợp nhất nguyên thần và nhục thân hoàn mỹ, nguyên liệu luyện chế Hợp Thể Phá Cảnh Đan.', emoji: '<:thuoc:1522632141698105354>', food: 0 },
  { id: 'dan_dot_pha_7', ten: 'Hợp Thể Phá Cảnh Đan 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 25, moTa: 'Đan dược hỗ trợ đột phá cảnh giới Hợp Thể.', emoji: '<:dan_dotpha:1522644600030756947>', food: 0 },

  { id: 'hat_giong_dai_thua_qua', ten: 'Hạt Giống Đại Thừa Quả 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 28, moTa: 'Hạt giống Đại Thừa Tinh Quả, gieo trồng tại dược viên.', emoji: '<:hat_giong:1522644602266456275>', food: 0 },
  { id: 'linh_thao_dai_thua', ten: 'Đại Thừa Tinh Quả 🍇', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 28, moTa: 'Quả chín ngưng tụ thiên đạo quy nguyên phi thăng chi cơ, nguyên liệu luyện chế Đại Thừa Phá Cảnh Đan.', emoji: '<:thuoc:1522632141698105354>', food: 0 },
  { id: 'dan_dot_pha_8', ten: 'Đại Thừa Phá Cảnh Đan 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 28, moTa: 'Đan dược hỗ trợ đột phá cảnh giới Đại Thừa.', emoji: '<:dan_dotpha:1522644600030756947>', food: 0 },

  // ==================== CẢNH GIỚI: LUYỆN KHÍ (YÊU CẦU CẤP 1) ====================
  // --- HỆ PHÁP TU ---
  { id: 'thanh_phong_kiem', ten: 'Thanh Phong Kiếm', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 500, chiSoJson: '{"phap_cong":500,"crit_rate":0.03}', yeuCauCanhGioi: 1, moTa: 'Kiếm linh hoạt, tụ linh pháp thuật.', emoji: '<:thanh_phong_kiem:1525080282670301314>', food: 0 },
  { id: 'dao_bao_thanh_van', ten: 'Đạo Bào Thanh Vân', loai: 'Giáp', doHiem: 'Thường', giaCoSo: 500, chiSoJson: '{"phap_phong":100,"vat_phong":200,"mp":1000}', yeuCauCanhGioi: 1, moTa: 'Đạo bào nhẹ nhàng dệt từ mây thanh.', emoji: '<:dao_bao_thanh_van:1525080280644456578>', food: 0 },
  { id: 'thuy_linh_boi', ten: 'Thủy Linh Bội', loai: 'Ngọc Bội', doHiem: 'Thường', giaCoSo: 500, chiSoJson: '{"speed":5,"crit_dmg":0.12}', yeuCauCanhGioi: 1, moTa: 'Ngọc bội hấp thụ thủy sinh chi linh.', emoji: '<:thuy_linh_boi:1525080277750255636>', food: 0 },

  // --- HỆ THỂ TU ---
  { id: 'thiet_cot_dao', ten: 'Thiết Cốt Đao', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 500, chiSoJson: '{"vat_cong":500,"crit_rate":0.03}', yeuCauCanhGioi: 1, moTa: 'Đao đúc bằng cốt sắt thô dũng mãnh.', emoji: '<:thiet_cot_dao:1525083768724000768>', food: 0 },
  { id: 'tho_bo_thuc_cu', ten: 'Thô Bố Trực Cư', loai: 'Giáp', doHiem: 'Thường', giaCoSo: 500, chiSoJson: '{"vat_phong":100,"phap_phong":200,"hp":1000}', yeuCauCanhGioi: 1, moTa: 'Y phục thô sơ dệt từ sợi gai dại.', emoji: '<:tho_bo_thuc_cu:1525083763074142318>', food: 0 },
  { id: 'khuong_thach_boi', ten: 'Khương Thạch Bội', loai: 'Ngọc Bội', doHiem: 'Thường', giaCoSo: 500, chiSoJson: '{"speed":4,"crit_dmg":0.12}', yeuCauCanhGioi: 1, moTa: 'Ngọc bội làm từ đá thô cứng cáp.', emoji: '<:khuong_thach_boi:1525083765016363158>', food: 0 },

  // --- HỆ THỐNG PHÁP BẢO CHỦ ĐỘNG ---
  // Pháp Tu
  { id: 'pb_lk_linh_phong_cham', ten: 'Linh Phong Châm', loai: 'Pháp Bảo', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Kỹ năng chủ động: Phi Châm Phá Giáp.', emoji: '<:linh_phong_cham:1525080275430670406>', food: 0 },
  { id: 'pb_lk_dan_loi_phu', ten: 'Dẫn Lôi Phù', loai: 'Pháp Bảo', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Kỹ năng chủ động: Sơ Cấp Lôi Trận.', emoji: '<:dan_loi_phu:1525080273287516240>', food: 0 },
  { id: 'pb_lk_ho_than_kinh', ten: 'Hộ Thân Kính', loai: 'Pháp Bảo', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Kỹ năng chủ động: Linh Khí Tráo.', emoji: '<:ho_than_kinh:1525080271194427452>', food: 0 },
  { id: 'pb_lk_dinh_than_phu', ten: 'Định Thân Phù', loai: 'Pháp Bảo', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Kỹ năng chủ động: Định Thân Thuật.', emoji: '<:dinh_than_phu:1525080269239877692>', food: 0 },
  { id: 'pb_lk_thanh_linh_binh', ten: 'Thanh Linh Bình', loai: 'Pháp Bảo', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Kỹ năng chủ động: Cam Lộ Thuật.', emoji: '<:thanh_linh_binh:1525080264995246120>', food: 0 },
  { id: 'pb_lk_tu_khi_ky', ten: 'Tụ Khí Kỳ', loai: 'Pháp Bảo', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Kỹ năng chủ động: Linh Lực Bộc Phát.', emoji: '<:tu_khi_ky:1525080267310497875>', food: 0 },

  // Thể Tu
  { id: 'pb_lk_toai_thach_an', ten: 'Toái Thạch Ấn', loai: 'Pháp Bảo', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Kỹ năng chủ động: Man Lực Trực Kích.', emoji: '<:toai_thach_an:1525083761237033061>', food: 0 },
  { id: 'pb_lk_hoa_tinh_dinh', ten: 'Hỏa Tinh Đỉnh', loai: 'Pháp Bảo', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Kỹ năng chủ động: Liệt Diễm Khí Kình.', emoji: '<:hoa_tinh_dinh:1525083758854930502>', food: 0 },
  { id: 'pb_lk_thach_phu_thuan', ten: 'Thạch Phù Thuẫn', loai: 'Pháp Bảo', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Kỹ năng chủ động: Nham Thạch Hộ Thể.', emoji: '<:thach_phu_thuan:1525083756866703551>', food: 0 },
  { id: 'pb_lk_u_thiet_lien', ten: 'U Thiết Liên', loai: 'Pháp Bảo', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Kỹ năng chủ động: Thiết Khóa Trầm Trọng.', emoji: '<:u_thiet_lien:1525083754647785472>', food: 0 },
  { id: 'pb_lk_da_son_sam', ten: 'Dã Sơn Sâm', loai: 'Pháp Bảo', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Kỹ năng chủ động: Đại Bổ Khí Huyết.', emoji: '<:da_son_sam:1525083752467005440>', food: 0 },
  { id: 'pb_lk_chien_co', ten: 'Chiến Cổ', loai: 'Pháp Bảo', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Kỹ năng chủ động: Thú Huyết Sôi Sục.', emoji: '<:chien_co:1525083750281515058>', food: 0 },

  // --- NGUYÊN LIỆU LUYỆN CHẾ SƠ CẤP ---
  { id: 'nguyen_lieu_luyen_khi', ten: 'Luyện Khí Thiết Sa 🪙', loai: 'Nguyên liệu', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Sắt vụn dùng để luyện khí sơ cấp.', emoji: '🪙', food: 0 },
  { id: 'so_cap_thiet_quang', ten: 'Sơ Cấp Thiết Quặng', loai: 'Nguyên liệu', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Mỏ quặng sắt cơ bản, dùng để rèn đao, đúc kiếm.', emoji: '<:so_cap_thiet_quang:1525076114295492679>', food: 0 },
  { id: 'tho_linh_dan_ty', ten: 'Thô Linh Đàn Ty', loai: 'Nguyên liệu', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Tơ thô của tằm dâu dại, dùng dệt áo thô hoặc may đạo bào.', emoji: '<:tho_linh_dan_ty:1525076109887148144>', food: 0 },
  { id: 'linh_khi_toai_thach', ten: 'Linh Khí Toái Thạch', loai: 'Nguyên liệu', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Mảnh vỡ đá linh khí chứa chút gió nhẹ, dùng để chế tạo ngọc bội cộng Tốc Độ.', emoji: '<:linh_khi_toai_thach:1525076112382623754>', food: 0 },
  { id: 'nham_hoa_tinh_hoa', ten: 'Nham Hỏa Tinh Hoa', loai: 'Nguyên liệu', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Chút vụn đá nóng từ đá núi lửa, tạo ra pháp bảo tấn công đơn.', emoji: '<:nham_hoa_tinh_hoa:1525076107509108776>', food: 0 },
  { id: 'sat_danh_moc', ten: 'Sét Đánh Mộc', loai: 'Nguyên liệu', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Khúc gỗ bị sét đánh trúng, mang điện tính lan truyền.', emoji: '<:sat_danh_moc:1525076096213581945>', food: 0 },
  { id: 'kien_thach_tam', ten: 'Kiên Thạch Tâm', loai: 'Nguyên liệu', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Lõi của các tảng đá cứng ngoài tự nhiên, dùng làm khiên bảo hộ.', emoji: '<:kien_thach_tam:1525076100655354038>', food: 0 },
  { id: 'thiet_dang_man', ten: 'Thiết Đằng Man', loai: 'Nguyên liệu', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Dây leo làm bằng rễ cây sắt dẻo dai khó đứt, dùng để trói/làm chậm địch.', emoji: '<:thiet_dang_man:1525076105302773760>', food: 0 },
  { id: 'linh_tuyen_thuy', ten: 'Linh Tuyền Thủy', loai: 'Nguyên liệu', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Nước suối chứa một chút sinh khí tinh khiết, dùng làm bình hồi phục.', emoji: '<:linh_tuyen_thuy:1525076102870073426>', food: 0 },
  { id: 'yeu_thu_huyet', ten: 'Yêu Thú Huyết', loai: 'Nguyên liệu', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Máu của các loài thú hoang sơ cấp, dùng để kích thích chiến ý/linh lực.', emoji: '<:yeu_thu_huyet:1525076098302345277>', food: 0 },
  { id: 'nguyen_lieu_truc_co', ten: 'Huyền Thiết Thạch 🪙', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 250, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Quặng huyền thiết thô ráp, cứng cáp dẻo dai dùng để rèn đúc trang bị Trúc Cơ.', emoji: '🪙', food: 0 },
  { id: 'huyen_thiet_tinh_sa', ten: 'Huyền Thiết Tinh Sa', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 250, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Quặng thiết đen tinh luyện, nguyên liệu chủ yếu để rèn đúc binh khí Trúc Cơ Kỳ.', emoji: '<:_nglieu_Truc_co_1:1525418027472916671>', food: 0 },
  { id: 'luc_ngoc_thach', ten: 'Lục Ngọc Thạch', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 250, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Khối ngọc thạch màu lục bảo ẩn chứa sinh cơ dồi dào, chuyên dùng để dệt hộ giáp Trúc Cơ Kỳ.', emoji: '<:_nglieu_Truc_co_2:1525418029650022400>', food: 0 },
  { id: 'am_duong_dong_chuong', ten: 'Âm Dương Đồng Chương', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 250, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Tấm đồng cổ khắc họa trận pháp ngũ hành linh lực, chuyên dùng để chế tác ngọc bội Trúc Cơ Kỳ.', emoji: '<:_nglieu_Truc_co_9:1525418025715761232>', food: 0 },
  { id: 'dia_hoa_chi_tinh', ten: 'Địa Hỏa Chi Tinh', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 250, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Tinh hoa kết tinh từ hỏa diệm sâu dưới lòng đất, dùng để chế tác pháp bảo tấn công đơn thể Trúc Cơ Kỳ.', emoji: '<:_nglieu_Truc_co_3:1525418020137078794>', food: 0 },
  { id: 'cuu_thien_tu_cat', ten: 'Cửu Thiên Tử Cát', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 250, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Bột cát màu tím mang theo sấm sét thiên kiếp, dùng để rèn đúc pháp bảo tấn công diện rộng Trúc Cơ Kỳ.', emoji: '<:_nglieu_Truc_co_5:1525418023685718116>', food: 0 },
  { id: 'bich_hai_bang_tinh', ten: 'Bích Hải Băng Tinh', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 250, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Phiến lá băng tinh kết tinh ở vùng biển sâu lạnh giá, chuyên dùng để rèn pháp bảo phòng hộ Trúc Cơ Kỳ.', emoji: '<:_nglieu_Truc_co_4:1525418022070653019>', food: 0 },
  { id: 'khon_tien_dang_moc', ten: 'Khổn Tiên Đằng Mộc', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 250, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Cổ mộc khô héo ngàn năm dẻo dai vô song, dùng làm cốt lõi rèn pháp bảo khống chế Trúc Cơ Kỳ.', emoji: '<:_nglieu_Truc_co_7:1525418016169398393>', food: 0 },
  { id: 'dia_xich_linh_chi', ten: 'Địa Xích Linh Chi', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 250, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Nấm linh chi đỏ hút trọn linh khí đại địa, chuyên dùng rèn đúc pháp bảo phục nguyên trị liệu Trúc Cơ Kỳ.', emoji: '<:_nglieu_Truc_co_6:1525418014290215042>', food: 0 },
  { id: 'thanh_vu_linh_sa', ten: 'Thanh Vũ Linh Sa', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 250, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Lớp linh sa mịn màu xanh lam tụ hội tinh khí đất trời, chuyên dùng rèn đúc pháp bảo tăng cường chiến ý Trúc Cơ Kỳ.', emoji: '<:_nglieu_Truc_co_8:1525418018124071054>', food: 0 },
  { id: 'nguyen_lieu_kim_dan', ten: 'Kim Đan Linh Sa 🪨', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Linh sa huyền ảo hội tụ đan hỏa linh khí dùng để rèn đúc trang bị Kim Đan.', emoji: '🪨', food: 0 },
  { id: 'huyen_thiet_van_nam', ten: 'Vạn Năm Huyền Thiết', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Quặng sắt sinh ra từ tâm Trái Đất, vô cùng cứng rắn, hấp thụ được cả linh khí lẫn sức mạnh thể chất.', emoji: '<:Huyen_thiet_van_nam:1524812777347092560>', food: 0 },
  { id: 'Thien_Tam_Linh_ty', ten: 'Thiên Tàm Linh Ty', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Tơ của nhện chúa ngàn năm, cực kỳ dẻo dai, dùng để dệt pháp bào hoặc bọc ngoài áo giáp nặng.', emoji: '<:Thien_Tam_Linh_ty:1524812779503226950>', food: 0 },
  { id: 'hon_tinh_huyet_nguyet', ten: 'Hồn Tinh Huyết Nguyệt', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Đá quý hấp thụ ánh trăng huyết, có khả năng nuôi dưỡng tinh thần và khí huyết.', emoji: '<:hon_tinh_huyet_nguyet:1524812781730140190>', food: 0 },
  { id: 'cuc_duong_hoa_thach', ten: 'Cực Dương Hỏa Thạch', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Đá chứa nhiệt lượng cực cao, tăng cường tính bạo phá.', emoji: '<:cuc_duong_hoa_thach:1524812775325434139>', food: 0 },
  { id: 'loi_tri_bang_tinh', ten: 'Lôi Trì Băng Tinh', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Kết tinh từ vùng đất sét đánh vạn năm, mang sức mạnh lan truyền.', emoji: '<:loi_tri_bang_tinh:1524812766144364677>', food: 0 },
  { id: 'Hau_tho_chi_loi', ten: 'Hậu Thổ Chi Lõi', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Trái tim của nguyên tố Đất, đại diện cho sự kiên cố.', emoji: '<:Hau_tho_chi_loi:1524812773077422332>', food: 0 },
  { id: 'u_minh_te_truc', ten: 'U Minh Tế Trúc', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Loài trúc mọc ở vùng giáp ranh âm dương, có tính chất dẻo dai, giam giữ linh hồn/thể xác.', emoji: '<:u_minh_te_truc:1524812770569228418>', food: 0 },
  { id: 'sinh_sinh_tao_hoa_dich', ten: 'Sinh Sinh Tạo Hóa Dịch', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Giọt sương ngưng tụ sinh khí tinh khiết, mang đặc tính tái tạo sinh mệnh.', emoji: '<:sinh_sinh_tao_hoa_dich:1524812768191189012>', food: 0 },
  { id: 'tinh_khong_luu_sa', ten: 'Tinh Không Lưu Sa', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Cát chảy từ tinh tú, chứa sức mạnh nguyên thủy giúp bộc phát tiềm năng.', emoji: '<:tinh_khong_luu_sa:1524812764076572882>', food: 0 },
  { id: 'nguyen_lieu_nguyen_anh', ten: 'Nguyên Anh Hỏa Tinh ☄️', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 750, chiSoJson: '{}', yeuCauCanhGioi: 16, moTa: 'Hỏa linh thể ngưng kết chứa linh quang ấm áp dùng để rèn đúc trang bị Nguyên Anh.', emoji: '☄️', food: 0 },
  { id: 'nguyen_lieu_hoa_than', ten: 'Thần Ma Chi Tinh ✨', loai: 'Nguyên liệu', doHiem: 'Cực hiếm', giaCoSo: 1250, chiSoJson: '{}', yeuCauCanhGioi: 19, moTa: 'Tinh hạch rực rỡ mang sức mạnh chuyển đổi hỗn độn dùng để rèn đúc trang bị Hóa Thần.', emoji: '✨', food: 0 },
  { id: 'chuyen_sinh_dan', ten: 'Chuyển Sinh Đan 🌀', loai: 'Đan dược', doHiem: 'Huyền thoại', giaCoSo: 9999999, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Đan dược chí tôn thượng cổ. Khi sử dụng sẽ khởi động LUÂN HỒI CHUYỂN SINH, xóa bỏ hoàn toàn tất cả dữ liệu tu tiên từ trước tới nay của đạo hữu (Nhân vật, túi đồ, sủng vật, động phủ...) để bắt đầu một kiếp sống mới! Cần CỰC KỲ CÂN NHẮC trước khi dùng.', emoji: '🌀', food: 0 },
  { id: 'dan_hp_1', ten: 'Bổ Huyết Đan (Sơ) 💊', loai: 'Đan dược', doHiem: 'Thường', giaCoSo: 50, chiSoJson: '{"hp_hoi":100}', yeuCauCanhGioi: 1, moTa: 'Phục hồi 100 điểm khí huyết (HP) bị tổn thương.', emoji: '<:dan_hp:1522644612605411379>', food: 0 },
  { id: 'dan_mp_1', ten: 'Hồi Thần Đan (Sơ) 💧', loai: 'Đan dược', doHiem: 'Thường', giaCoSo: 50, chiSoJson: '{"mp_hoi":50}', yeuCauCanhGioi: 1, moTa: 'Khôi phục 50 điểm linh lực pháp hải (MP).', emoji: '<:thuoc:1522632141698105354>', food: 0 },
  { id: 'linh_chi', ten: 'U Minh Linh Chi 🍄', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 30, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh thảo chứa ít linh khí mọc nơi ẩm ướt.', emoji: '<:linh_chi:1522610150853316778>', food: 0 },

  // ==================== CẢNH GIỚI: TRÚC CƠ (YÊU CẦU CẤP 10) ====================
  // Vũ khí Thể Tu
  { id: 'kiem_sat_nang', ten: 'Trọng Thiết Thiết Kiếm ⚔️', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 300, chiSoJson: '{"vat_cong":25}', yeuCauCanhGioi: 10, moTa: 'Thiết kiếm đúc nặng nề, chỉ có tu sĩ Trúc Cơ trở lên mới đủ lực nhấc.', emoji: '<:kiem:1522610147569041419>', food: 0 },
  { id: 'kiem_sat', ten: 'Thiết Kiếm ⚔️', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{"vat_cong":30}', yeuCauCanhGioi: 10, moTa: 'Kiếm sắt rèn đúc kỹ lưỡng, sắc bén sắc lạnh.', emoji: '<:kiem:1522610147569041419>', food: 0 },

  // Vũ khí Pháp Tu
  { id: 'truong_truc_thuong', ten: 'Phàm Trúc Trượng 🪵', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 300, chiSoJson: '{"phap_cong":25}', yeuCauCanhGioi: 10, moTa: 'Khúc trúc già tầm thường nhưng dẫn linh khí khá tốt.', emoji: '<:truong_phep:1522629314653458472>', food: 0 },
  { id: 'truong_truc', ten: 'Trúc Trượng 🎋', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{"phap_cong":30}', yeuCauCanhGioi: 10, moTa: 'Tương truyền làm bằng Linh Trúc ngàn năm, tương thích pháp lực rất tốt.', emoji: '<:truong_phep:1522629314653458472>', food: 0 },

  // --- BỘ 9 TRANG BỊ TRÚC CƠ PHÁP TU ---
  { id: 'vk_phap_truc_co', ten: 'Tử Tiêu Tiên Kiếm', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 1000, chiSoJson: '{"phap_cong":1000,"crit_rate":0.06}', yeuCauCanhGioi: 10, moTa: 'Tử Tiêu tiên kiếm hội tụ cửu thiên huyền khí, tăng mạnh pháp thuật và bạo kích.', emoji: '<:VK_PHAP_truc_co:1525394643494109277>', food: 0 },
  { id: 'giap_phap_truc_co', ten: 'Tử Vân Pháp Bào', loai: 'Giáp', doHiem: 'Hiếm', giaCoSo: 1000, chiSoJson: '{"phap_phong":200,"vat_phong":400,"mp":2000}', yeuCauCanhGioi: 10, moTa: 'Pháp bào dệt từ tử vân, phòng ngự vững chắc và tăng linh lực.', emoji: '<:GIAP_PHAP_truc_co:1525394641539825794>', food: 0 },
  { id: 'nb_phap_truc_co', ten: 'Tử Tinh Linh Bội', loai: 'Ngọc Bội', doHiem: 'Hiếm', giaCoSo: 1000, chiSoJson: '{"speed":10,"crit_dmg":0.24}', yeuCauCanhGioi: 10, moTa: 'Linh bội ngọc tử tinh giúp tinh thần minh mẫn, hành động nhanh nhẹn.', emoji: '<:NB_PHAP_truc_co:1525394637899169932>', food: 0 },
  { id: 'pb_hoi_phap_truc_co', ten: 'Linh Tuyết Phục Nguyên Bình', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Pháp bảo chủ động: Linh Tuyết Phục Nguyên.', emoji: '<:PB_HOI_PHAP_truc_co:1525394639807582308>', food: 0 },
  { id: 'pb_def_phap_truc_co', ten: 'Tử Quang Hộ Thân Kính', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Pháp bảo chủ động: Linh Quang Hộ Tráo.', emoji: '<:PB_DEF_PHAP_truc_co:1525394635709612134>', food: 0 },
  { id: 'pb_aoe_phap_truc_co', ten: 'Cửu Thiên Lôi Vân Phù', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Pháp bảo chủ động: Cửu Thiên Lôi Vân.', emoji: '<:PB_AOE_PHAP_truc_co:1525394633776037980>', food: 0 },
  { id: 'pb_don_phap_truc_co', ten: 'Tử Dương Linh Pháo', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Pháp bảo chủ động: Oanh Thiên Thần Pháo.', emoji: '<:PB_DON_PHAP_truc_co:1525394631498661899>', food: 0 },
  { id: 'pb_cc_phap_truc_co', ten: 'Huyền Băng Thần Tiên', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Pháp bảo chủ động: Hàn Băng Tỏa Phược.', emoji: '<:PB_CC_PHAP_truc_co:1525394629628006510>', food: 0 },
  { id: 'pb_buff_phap_truc_co', ten: 'Tụ Linh Tiên Phiến', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Pháp bảo chủ động: Tử Khí Hào Phong.', emoji: '<:PB_BUFF__PHAP_truc_co:1525394626989527112>', food: 0 },

  // --- BỘ 9 TRANG BỊ TRÚC CƠ THỂ TU ---
  { id: 'vk_the_truc_co', ten: 'Huyền Thiết Chiến Phủ', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 1000, chiSoJson: '{"vat_cong":1000,"crit_rate":0.06}', yeuCauCanhGioi: 10, moTa: 'Chiến phủ đúc từ huyền thiết nặng nề, tăng cực mạnh lực tấn công vật lý.', emoji: '<:VK_THE_Truc_co:1525392255400280136>', food: 0 },
  { id: 'giap_the_truc_co', ten: 'Kim Giáp Hoàng Lân', loai: 'Giáp', doHiem: 'Hiếm', giaCoSo: 1000, chiSoJson: '{"vat_phong":200,"phap_phong":400,"hp":2000}', yeuCauCanhGioi: 10, moTa: 'Khải giáp rực rỡ lân phiến hoàng kim bảo hộ sinh mệnh.', emoji: '<:GIAP_THE_Trucco:1525392249653821530>', food: 0 },
  { id: 'nb_the_truc_co', ten: 'Huyết Thạch Linh Bội', loai: 'Ngọc Bội', doHiem: 'Hiếm', giaCoSo: 1000, chiSoJson: '{"speed":8,"crit_dmg":0.24}', yeuCauCanhGioi: 10, moTa: 'Ngọc bội chuỗi hạt huyết thạch tăng tốc độ hành động và sát thương chí mạng.', emoji: '<:NB_THE_Trucco:1525392251843248208>', food: 0 },
  { id: 'pb_hoi_the_truc_co', ten: 'Huyết Hồn Linh Chi', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Pháp bảo chủ động: Đại Bổ Khí Huyết.', emoji: '<:PB_HOI_THE_Trucco:1525392240921411654>', food: 0 },
  { id: 'pb_def_the_truc_co', ten: 'Huyền Vũ Bảo Thuẫn', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Pháp bảo chủ động: Nham Thạch Hộ Thể.', emoji: '<:PB_DEF_THE_Trucco:1525392253676163102>', food: 0 },
  { id: 'pb_aoe_the_truc_co', ten: 'Kinh Hồn Tiên Chuông', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Pháp bảo chủ động: Liệt Diễm Khí Kình.', emoji: '<:PB_AOE_THE_Trucco:1525392243039539240>', food: 0 },
  { id: 'pb_don_the_truc_co', ten: 'Xích Hỏa Thương', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Pháp bảo chủ động: Man Lực Trực Kích.', emoji: '<:PB_DON_THE_Trucco:1525392247468589056>', food: 0 },
  { id: 'pb_cc_the_truc_co', ten: 'Huyền Băng Tiên Thương', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Pháp bảo chủ động: Thiết Khóa Trầm Trọng.', emoji: '<:PB_CC_THE_Trucco:1525392245296074822>', food: 0 },
  { id: 'pb_buff_the_truc_co', ten: 'Bá Vương Chiến Kỳ', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Pháp bảo chủ động: Thú Huyết Sôi Sục.', emoji: '<:PB_BUFF_THE_Trucco:1525392238241382520>', food: 0 },

  // Giáp
  { id: 'ao_vai_day', ten: 'Đạo Bào Vải Dày 🥋', loai: 'Giáp', doHiem: 'Thường', giaCoSo: 300, chiSoJson: '{"vat_phong":10,"phap_phong":10,"hp":100}', yeuCauCanhGioi: 10, moTa: 'Áo vải nhiều lớp gia cố bảo vệ tu sĩ Trúc Cơ.', emoji: '<:ao:1522624070741524530>', food: 0 },
  { id: 'ao_da', ten: 'Thú Bì Giáp 🛡️', loai: 'Giáp', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{"vat_phong":15,"phap_phong":15,"hp":150}', yeuCauCanhGioi: 10, moTa: 'Giáp làm bằng da thú yêu cấp thấp, dẻo dai bảo vệ cơ thể.', emoji: '<:ao:1522624070741524530>', food: 0 },

  // Đan dược / Thảo dược
  { id: 'dan_hp_2', ten: 'Bổ Huyết Đan (Trung) 🧪', loai: 'Đan dược', doHiem: 'Hiếm', giaCoSo: 200, chiSoJson: '{"hp_hoi":500}', yeuCauCanhGioi: 10, moTa: 'Phục hồi 500 điểm khí huyết (HP) bị tổn thương.', emoji: '<:dan_hp:1522644612605411379>', food: 0 },
  { id: 'dan_mp_2', ten: 'Hồi Thần Đan (Trung) 🌊', loai: 'Đan dược', doHiem: 'Hiếm', giaCoSo: 200, chiSoJson: '{"mp_hoi":200}', yeuCauCanhGioi: 10, moTa: 'Khôi phục 200 điểm linh lực pháp hải (MP).', emoji: '<:thuoc:1522632141698105354>', food: 0 },

  // ==================== CẢNH GIỚI: KIM ĐAN (YÊU CẦU CẤP 13) ====================
  // Vũ khí Thể Tu
  { id: 'kiem_kim_dan_thuong', ten: 'Phàm Thiết Trọng Chùy 🔨', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{"vat_cong":250,"crit_rate":0.08,"xuyen_giap":5}', yeuCauCanhGioi: 13, moTa: 'Chùy nặng rèn thô tẩm đan hỏa lực sơ khai.', emoji: '🔨', food: 0 },
  { id: 'kiem_kim_dan', ten: 'Bát Hoang Cự Chùy', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 1000, chiSoJson: '{"vat_cong":500,"crit_rate":0.15,"xuyen_giap":10}', yeuCauCanhGioi: 13, moTa: 'Cự chùy uy chấn bát hoang, nện đá vỡ vụn.', emoji: '<:Bat_hoang_cu_chuy:1524821321651982407>', food: 0 },

  // Vũ khí Pháp Tu
  { id: 'truong_kim_dan_thuong', ten: 'Phàm Thiên Phi Kiếm 🗡️', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{"phap_cong":250,"speed":8,"xuyen_giap":5}', yeuCauCanhGioi: 13, moTa: 'Phi kiếm sắt mỏng hỗ trợ ngự khí phi hành.', emoji: '🗡️', food: 0 },
  { id: 'truong_kim_dan', ten: 'Thái Hư Phi Kiếm', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 1000, chiSoJson: '{"phap_cong":500,"speed":15,"xuyen_giap":10}', yeuCauCanhGioi: 13, moTa: 'Thái Hư kiếm khí bay lượn ngưng thần vô biên.', emoji: '<:thai_hu_phi_kiem:1524815980134531223>', food: 0 },

  // Giáp
  { id: 'ao_kim_dan_thuong', ten: 'Đan Vân Bào 🥋', loai: 'Giáp', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{"vat_phong":150,"phap_phong":150,"hp":500}', yeuCauCanhGioi: 13, moTa: 'Y phục tơ lụa thêu hoa văn đan vân.', emoji: '<:ao:1522624070741524530>', food: 0 },
  { id: 'ao_kim_dan', ten: 'Cửu Long Bá Thể Giáp', loai: 'Giáp', doHiem: 'Hiếm', giaCoSo: 1000, chiSoJson: '{"vat_phong":300,"hp":1000,"dmg_red":0.05}', yeuCauCanhGioi: 13, moTa: 'Bá thể giáp mang chiến lực dũng mãnh, phòng ngự cực đại.', emoji: '<:cuu_long_ba_the_giap:1524821316845174824>', food: 0 },
  { id: 'ao_kim_dan_phap', ten: 'Lưu Ly Pháp Bào', loai: 'Giáp', doHiem: 'Hiếm', giaCoSo: 1000, chiSoJson: '{"phap_phong":300,"mp":10000,"ne":0.05}', yeuCauCanhGioi: 13, moTa: 'Pháp bào dệt bằng linh ty tơ tằm, hộ mệnh khí hải.', emoji: '<:Luu_ly_phap_bao:1524815977685057586>', food: 0 },

  // Ngọc Bội
  { id: 'ngoc_boi_kim_dan_phap', ten: 'Tụ Linh Ngọc', loai: 'Ngọc Bội', doHiem: 'Hiếm', giaCoSo: 1000, chiSoJson: '{"mp_hoi":5000,"giam_hoi_chieu":0.10,"speed":10}', yeuCauCanhGioi: 13, moTa: 'Tụ Linh Ngọc bổ trợ chân khí pháp lực.', emoji: '<:tu_linh_ngoc:1524815970739290302>', food: 0 },
  { id: 'ngoc_boi_kim_dan_the', ten: 'Huyết Ngọc Tủy', loai: 'Ngọc Bội', doHiem: 'Hiếm', giaCoSo: 1000, chiSoJson: '{"hp_hoi":500,"khang_khong_che":0.10,"speed":10}', yeuCauCanhGioi: 13, moTa: 'Huyết Ngọc Tủy tăng sinh khí huyết lực.', emoji: '<:huyet_ngoc_tuy:1524821295785574591>', food: 0 },

  // Pháp Bảo
  { id: 'pb_kd_diet_ma_cham', ten: 'Diệt Ma Châm', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{"phap_cong":80}', yeuCauCanhGioi: 13, moTa: 'Pháp bảo hệ Kim công kích cực mạnh.', emoji: '<:diet_ma_cham:1524815973251682335>', food: 0 },
  { id: 'pb_kd_ngu_loi_chau', ten: 'Ngũ Lôi Châu', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{"phap_cong":80}', yeuCauCanhGioi: 13, moTa: 'Pháp bảo tích tụ ngũ lôi công sát diện rộng.', emoji: '<:ngu_loi_chau:1524815975457886290>', food: 0 },
  { id: 'pb_kd_bat_quai_kinh', ten: 'Bát Quái Kính', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{"phap_phong":60}', yeuCauCanhGioi: 13, moTa: 'Kính bát quái hộ thể chân linh.', emoji: '<:Bat_quai_kinh:1524815987986272317>', food: 0 },
  { id: 'pb_kd_khon_tien_to', ten: 'Khổn Tiên Tố', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{"phap_phong":60}', yeuCauCanhGioi: 13, moTa: 'Sợi dây trói buộc thần thức đối phương.', emoji: '<:khon_tien_to:1524815966905569504>', food: 0 },
  { id: 'pb_kd_cam_lo_binh', ten: 'Cam Lộ Bình', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{"mp":1000}', yeuCauCanhGioi: 13, moTa: 'Bình chứa cam lộ linh dịch tẩy trần hồi phục.', emoji: '<:cam_lo_binh:1524815985066901595>', food: 0 },
  { id: 'pb_kd_that_tinh_dang', ten: 'Thất Tinh Đăng', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{"phap_cong":80}', yeuCauCanhGioi: 13, moTa: 'Đèn thất tinh tụ khí định thần.', emoji: '<:that_tinh_dang:1524815982881669342>', food: 0 },
  { id: 'pb_kd_chan_son_an', ten: 'Chấn Sơn Ấn', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{"vat_cong":80}', yeuCauCanhGioi: 13, moTa: 'Trọng ấn càn khôn áp đảo sơn hà.', emoji: '<:Chan_son_an:1524821300747436142>', food: 0 },
  { id: 'pb_kd_phan_thien_dinh', ten: 'Phần Thiên Đỉnh', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{"vat_cong":80}', yeuCauCanhGioi: 13, moTa: 'Đỉnh linh chứa thiên hỏa thiêu đốt địch.', emoji: '<:Phan_thien_dinh:1524821303012622507>', food: 0 },
  { id: 'pb_kd_huyen_vu_thuan', ten: 'Huyền Vũ Thuẫn', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{"vat_phong":60}', yeuCauCanhGioi: 13, moTa: 'Khiên phòng ngự khắc họa linh văn Huyền Vũ.', emoji: '<:huyen_vu_thuan:1524821312000757942>', food: 0 },
  { id: 'pb_kd_toa_hon_lien', ten: 'Tỏa Hồn Liên', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{"vat_phong":60}', yeuCauCanhGioi: 13, moTa: 'Xích sắt giam cầm nhục thân yêu ma.', emoji: '<:toa_hon_lien:1524821308440055899>', food: 0 },
  { id: 'pb_kd_huyet_bo_de', ten: 'Huyết Bồ Đề', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{"hp":500}', yeuCauCanhGioi: 13, moTa: 'Hạt bồ đề ngấm tinh huyết phục hồi mạch tượng.', emoji: '<:huyet_bo_de:1524821298729979998>', food: 0 },
  { id: 'pb_kd_man_hoang_co', ten: 'Man Hoang Cổ', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1200, chiSoJson: '{"vat_cong":80}', yeuCauCanhGioi: 13, moTa: 'Trống man hoang kích phát chiến ý.', emoji: '<:Man_hoang_co:1524821305613094942>', food: 0 },

  // ==================== CẢNH GIỚI: NGUYÊN ANH (YÊU CẦU CẤP 16) ====================
  // Vũ khí Thể Tu
  { id: 'kiem_nguyen_anh_thuong', ten: 'Sơn Hà Trọng Kiếm 🗡️', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 1000, chiSoJson: '{"vat_cong":50}', yeuCauCanhGioi: 16, moTa: 'Thanh kiếm nặng đúc từ sắt thiên thạch sơn hà.', emoji: '<:kiem:1522610147569041419>', food: 0 },
  { id: 'kiem_nguyen_anh', ten: 'Nguyên Anh Phá Thiên Kiếm 🗡️', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 1800, chiSoJson: '{"vat_cong":75}', yeuCauCanhGioi: 16, moTa: 'Chân kiếm phá thiên khai thiên tích địa.', emoji: '<:kiem:1522610147569041419>', food: 0 },

  // Vũ khí Pháp Tu
  { id: 'truong_nguyen_anh_thuong', ten: 'Dục Hỏa Linh Trượng ⚡', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 1000, chiSoJson: '{"phap_cong":50}', yeuCauCanhGioi: 16, moTa: 'Gậy gỗ rực lửa chứa lôi hỏa.', emoji: '<:truong_phep:1522629314653458472>', food: 0 },
  { id: 'truong_nguyen_anh', ten: 'Nguyên Thần Tiên Trượng ⚡', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 1800, chiSoJson: '{"phap_cong":75}', yeuCauCanhGioi: 16, moTa: 'Linh trượng tẩm nguyên thần linh quang.', emoji: '<:truong_phep:1522629314653458472>', food: 0 },

  // Giáp
  { id: 'ao_nguyen_anh_thuong', ten: 'Tiêu Dao Linh Bào 🥋', loai: 'Giáp', doHiem: 'Thường', giaCoSo: 1000, chiSoJson: '{"vat_phong":28,"phap_phong":28,"hp":280}', yeuCauCanhGioi: 16, moTa: 'Bào y tơ lụa mỏng thanh nhã tự tại.', emoji: '<:ao:1522624070741524530>', food: 0 },
  { id: 'ao_nguyen_anh', ten: 'Nguyên Anh Hộ Thể Giáp 🥋', loai: 'Giáp', doHiem: 'Hiếm', giaCoSo: 1800, chiSoJson: '{"vat_phong":40,"phap_phong":40,"hp":400}', yeuCauCanhGioi: 16, moTa: 'Bảo giáp dệt từ tơ tằm vàng bảo vệ nguyên anh nguyên thần.', emoji: '<:ao:1522624070741524530>', food: 0 },

  // ==================== CẢNH GIỚI: HÓA THẦN (YÊU CẦU CẤP 19) ====================
  // Vũ khí Thể Tu
  { id: 'kiem_sat_co_khi', ten: 'Cổ Thiết Trọng Binh 🗡️', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 1500, chiSoJson: '{"vat_cong":60}', yeuCauCanhGioi: 19, moTa: 'Thiết kiếm đúc từ quặng thô cổ xưa, cực kỳ thô kệch nhưng sức nặng kinh người.', emoji: '<:kiem:1522610147569041419>', food: 0 },
  { id: 'kiem_huyen_thiet', ten: 'Huyền Thiết Trọng Kiếm 🗡️', loai: 'Vũ khí', doHiem: 'Cực hiếm', giaCoSo: 2500, chiSoJson: '{"vat_cong":100}', yeuCauCanhGioi: 19, moTa: 'Trọng kiếm đúc bằng huyền thiết nặng ngàn cân, chém sắt như bùn.', emoji: '<:trong_kiem:1522632132630020116>', food: 0 },

  // Vũ khí Pháp Tu
  { id: 'truong_go_co_loi', ten: 'Cổ Mộc Lôi Trượng ⚡', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 1500, chiSoJson: '{"phap_cong":60}', yeuCauCanhGioi: 19, moTa: 'Gậy gỗ mục từ cây cổ thụ bị sét đánh ngàn năm trước, chứa chút lôi điện tàn dư.', emoji: '<:truong_phep:1522629314653458472>', food: 0 },
  { id: 'phap_bao_huyen_mon', ten: 'Huyền Môn Ngọc Bội 🔮', loai: 'Vũ khí', doHiem: 'Cực hiếm', giaCoSo: 2500, chiSoJson: '{"phap_cong":100}', yeuCauCanhGioi: 19, moTa: 'Linh bảo ngọc bội hộ thân của đệ tử Huyền Môn, hội tụ thiên địa linh khí.', emoji: '<:ngoc_boi:1522624074784964608>', food: 0 },

  // Giáp
  { id: 'ao_da_co_lan', ten: 'Cổ Lân Thú Giáp 🥋', loai: 'Giáp', doHiem: 'Thường', giaCoSo: 1500, chiSoJson: '{"vat_phong":35,"phap_phong":35,"hp":350}', yeuCauCanhGioi: 19, moTa: 'Giáp da thú yêu phong hóa ngàn năm, phòng ngự thô sơ nhưng khá chắc chắn.', emoji: '<:ao:1522624070741524530>', food: 0 },
  { id: 'giap_huyen_thiet', ten: 'Huyền Thiết Linh Giáp 🥋', loai: 'Giáp', doHiem: 'Cực hiếm', giaCoSo: 2500, chiSoJson: '{"vat_phong":50,"phap_phong":50,"hp":500}', yeuCauCanhGioi: 19, moTa: 'Giáp hộ thân đúc bằng huyền thiết pha lẫn linh thạch, phòng ngự cực cao.', emoji: '<:ao:1522624070741524530>', food: 0 },

  // ==================== CÁC LOẠI TRANG BỊ MỚI: NGỌC BỘI, CỔ BẢO, PHÁP BẢO ====================
  // Ngọc Bội
  { id: 'ngoc_boi_tan_thu', ten: 'Ngọc Bội Gỗ 🪵', loai: 'Ngọc Bội', doHiem: 'Thường', giaCoSo: 150, chiSoJson: '{"hp":30}', yeuCauCanhGioi: 1, moTa: 'Ngọc bội gỗ chứa sinh khí nhẹ.', emoji: '<:ngoc_boi:1522624074784964608>', food: 0 },
  { id: 'ngoc_boi_linh_ngoc', ten: 'Linh Ngọc Bội 📿', loai: 'Ngọc Bội', doHiem: 'Hiếm', giaCoSo: 600, chiSoJson: '{"hp":120,"mp":50}', yeuCauCanhGioi: 10, moTa: 'Ngọc bội làm từ linh thạch tốt cho khí huyết.', emoji: '<:ngoc_boi:1522624074784964608>', food: 0 },
  { id: 'ngoc_boi_tien_van', ten: 'Tiên Vân Ngọc Bội 🔮', loai: 'Ngọc Bội', doHiem: 'Cực hiếm', giaCoSo: 2800, chiSoJson: '{"hp":400,"mp":200}', yeuCauCanhGioi: 19, moTa: 'Tuyệt phẩm ngọc bội hộ thân thượng cổ.', emoji: '<:ngoc_boi:1522624074784964608>', food: 0 },

  // Cổ Bảo Chủ Động
  { id: 'co_bao_kiem_khi', ten: 'Thượng Cổ Kiếm Hoàn 🗡️', loai: 'Cổ Bảo Chủ Động', doHiem: 'Hiếm', giaCoSo: 800, chiSoJson: '{"vat_cong":15}', yeuCauCanhGioi: 1, moTa: 'Cổ bảo tự kích hoạt phóng ra kiếm khí sát thương địch.', emoji: '<:kiem:1522610147569041419>', food: 0 },
  { id: 'co_bao_dong_tu', ten: 'Càn Khôn Đỉnh 🏺', loai: 'Cổ Bảo Chủ Động', doHiem: 'Hiếm', giaCoSo: 1600, chiSoJson: '{"vat_phong":20,"hp":150}', yeuCauCanhGioi: 10, moTa: 'Cổ bảo lò luyện đập mạnh yêu thú.', emoji: '<:luyen_dan:1522610152753070230>', food: 0 },
  { id: 'co_bao_tien_dan', ten: 'Thái Thượng Hồ Lô 🍶', loai: 'Cổ Bảo Chủ Động', doHiem: 'Cực hiếm', giaCoSo: 4500, chiSoJson: '{"phap_cong":80,"mp":300}', yeuCauCanhGioi: 19, moTa: 'Hồ lô cất giấu tiên khí tự động oanh tạc địch.', emoji: '<:ho_lo:1522610145912291488>', food: 0 },

  // Pháp Bảo
  { id: 'phap_bao_ho_than', ten: 'Phù Vân Phiên 🏳️', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 700, chiSoJson: '{"phap_phong":15}', yeuCauCanhGioi: 1, moTa: 'Pháp bảo tạo khiên ngưng tụ thủy văn phòng ngự.', emoji: '<:ky:1522624065670479932>', food: 0 },
  { id: 'phap_bao_cong_kich', ten: 'Phá Thiên Chủy 🔱', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1500, chiSoJson: '{"phap_cong":30}', yeuCauCanhGioi: 10, moTa: 'Pháp bảo tấn công phóng hỏa tiễn.', emoji: '<:chuy:1522624063909003295>', food: 0 },
  { id: 'phap_bao_hon_ton', ten: 'Hỗn Độn Chung 🔔', loai: 'Pháp Bảo', doHiem: 'Cực hiếm', giaCoSo: 5000, chiSoJson: '{"vat_cong":50,"phap_cong":50,"hp":300}', yeuCauCanhGioi: 19, moTa: 'Chuông vàng chấn động tiên hải.', emoji: '<:chuong:1522624061602009279>', food: 0 },

  // Hạt giống (Trồng trọt) — food: 0 vì không phải thức ăn linh thú
  { id: 'hat_giong_tu_linh_thao', ten: 'Hạt Giống Tụ Linh Thảo', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 50, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Hạt giống Tụ Linh Thảo, trồng tại Dược Viên.', emoji: '<:HG_tu_linh_thao:1525174735464562688>', food: 0 },

  // Linh thảo thu hoạch theo phẩm chất — food: 1 (có thể cho thú ăn)
  { id: 'tu_linh_thao_luc', ten: 'Tụ Linh Thảo (Phàm)', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 50, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Tụ Linh Thảo phàm phẩm, thu hoạch từ dược viên.', emoji: '<:tu_linh_thao:1525174737687548114>', food: 1 },
  { id: 'tu_linh_thao_lam', ten: 'Tụ Linh Thảo (Ưu)', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 150, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Tụ Linh Thảo ưu phẩm, linh khí dồi dào.', emoji: '<:tu_linh_thao:1525174737687548114>', food: 1 },
  { id: 'tu_linh_thao_tim', ten: 'Tụ Linh Thảo (Siêu)', loai: 'Linh thảo', doHiem: 'Cực hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Tụ Linh Thảo siêu phẩm hấp thu nguyệt hoa.', emoji: '<:tu_linh_thao:1525174737687548114>', food: 1 },
  { id: 'tu_linh_thao_vang', ten: 'Tụ Linh Thảo (Tuyệt)', loai: 'Linh thảo', doHiem: 'Huyền thoại', giaCoSo: 1500, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Tụ Linh Thảo tuyệt phẩm trân quý vô ngần.', emoji: '<:tu_linh_thao:1525174737687548114>', food: 1 },
  { id: 'tu_linh_thao_do', ten: 'Tụ Linh Thảo (Tiên)', loai: 'Linh thảo', doHiem: 'Thần cấp', giaCoSo: 5000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Tụ Linh Thảo tiên phẩm chỉ có trong truyền thuyết.', emoji: '<:tu_linh_thao:1525174737687548114>', food: 1 },

  // Đan dược tăng Tu Vi — food: 0
  { id: 'dan_tu_vi_luyen_khi', ten: 'Luyện Khí Tu Vi Đan', loai: 'Đan dược', doHiem: 'Thường', giaCoSo: 1000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Tu vi đan phù hợp cho tu sĩ Luyện Khí Kỳ.', emoji: '<:Luyen_Khi_tu_vi_dan:1525372735394680902>', food: 0 },
  { id: 'dan_tu_vi_truc_co', ten: 'Trúc Cơ Tu Vi Đan', loai: 'Đan dược', doHiem: 'Hiếm', giaCoSo: 4000, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Tu vi đan phù hợp cho tu sĩ Trúc Cơ Kỳ.', emoji: '<:truc_co_tu_vi_dan:1525372732978626674>', food: 0 },
  { id: 'dan_tu_vi_kim_dan', ten: 'Kim Đan Tu Vi Đan', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 10000, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Tu vi đan phù hợp cho tu sĩ Kim Đan Kỳ.', emoji: '<:kim_dan_tu_vi_dan:1525372731032342608>', food: 0 },
  { id: 'dan_tu_vi_nguyen_anh', ten: 'Nguyên Anh Tu Vi Đan', loai: 'Đan dược', doHiem: 'Huyền thoại', giaCoSo: 30000, chiSoJson: '{}', yeuCauCanhGioi: 16, moTa: 'Tu vi đan phù hợp cho tu sĩ Nguyên Anh Kỳ.', emoji: '<:nguyen_anh_tu_vi_dan:1525372728843042846>', food: 0 },

  // Hạt giống & Linh thảo luyện đan tu vi
  { id: 'hat_giong_ngoc_lo_sinh_co', ten: 'Hạt Giống Ngọc Lộ Sinh Cơ Thảo 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Hạt giống Ngọc Lộ Sinh Cơ Thảo, gieo trồng tại dược viên.', emoji: '<:seed_ngoc_lo_sinh_co:1525376226208911452>', food: 0 },
  { id: 'ngoc_lo_sinh_co_thao', ten: 'Ngọc Lộ Sinh Cơ Thảo', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 1000, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Ngọc Lộ Sinh Cơ Thảo chứa sinh cơ bạt ngàn, dùng luyện đan tu vi.', emoji: '<:ngoc_lo_sinh_co_thao:1525376223805702164>', food: 1 },
  { id: 'hat_giong_kim_o_tudan', ten: 'Hạt Giống Kim Ô Tụ Đan Hoa 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Hạt giống Kim Ô Tụ Đan Hoa, gieo trồng tại dược viên.', emoji: '<:seed_kim_o_tudan:1525376221385326592>', food: 0 },
  { id: 'kim_o_tu_dan_hoa', ten: 'Kim Ô Tụ Đan Hoa', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 2500, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Kim Ô Tụ Đan Hoa tỏa ánh thái dương, dùng luyện đan tu vi.', emoji: '<:kim_o_tu_dan_hoa:1525376219011354624>', food: 1 },
  { id: 'hat_giong_tu_van_hoa_anh', ten: 'Hạt Giống Tử Vận Hóa Anh Thảo 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 16, moTa: 'Hạt giống Tử Vận Hóa Anh Thảo, gieo trồng tại dược viên.', emoji: '<:seed_tu_van_hoa_anh:1525376216838967406>', food: 0 },
  { id: 'tu_van_hoa_anh_thao', ten: 'Tử Vận Hóa Anh Thảo', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 6000, chiSoJson: '{}', yeuCauCanhGioi: 16, moTa: 'Tử Vận Hóa Anh Thảo tụ tử khí đông lai, dùng luyện đan tu vi.', emoji: '<:tu_van_hoa_anh_thao:1525376205669531819>', food: 1 },

  // Vật phẩm bổ trợ ấp trứng — food: 0
  { id: 'trung_linh_thu', ten: 'Trứng Linh Thú 🥚', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 5000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Ấp nở tại Động Phủ để nhận được linh thú trung thành.', emoji: '<:trung_thuong:1522632136568471682>', food: 0 },
  { id: 'trung_linh_thu_pham', ten: 'Trứng Linh Thú (Phàm) 🥚', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 5000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trứng linh thú phẩm chất Phàm. Ấp nở chắc chắn nhận được Linh Thú.', emoji: '<:trung_thuong:1522632136568471682>', food: 0 },
  { id: 'trung_linh_thu_linh', ten: 'Trứng Linh Thú (Linh) 🥚', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 20000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trứng linh thú phẩm chất Linh. Ấp nở có 1% tỷ lệ nở ra Thần Thú.', emoji: '<:trung_linh:1522635608881762444>', food: 0 },
  { id: 'trung_linh_thu_tien', ten: 'Trứng Linh Thú (Tiên) 🥚', loai: 'Linh thảo', doHiem: 'Cực hiếm', giaCoSo: 100000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trứng linh thú phẩm chất Tiên. Ấp nở có 3% tỷ lệ nở ra Thần Thú. Có bán ở shop.', emoji: '<:trung_tien:1522632128096108584>', food: 0 },
  { id: 'trung_linh_thu_than', ten: 'Trứng Linh Thú (Thần) 🥚', loai: 'Linh thảo', doHiem: 'Thần cấp', giaCoSo: 500000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trứng linh thú phẩm chất Thần. Ấp nở có 50% tỷ lệ nở ra Thần Thú.', emoji: '<:trung_than:1522635611133968566>', food: 0 },

  // Linh sủng đan — food: 0; Vạn yêu quả — food: 1 (thức ăn linh thú)
  { id: 'van_yeu_qua_phe', ten: 'Vạn Yêu Quả (Phế) ⚪', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Quả exp phế phẩm của sủng vật, cho ăn gia tăng 500 EXP.', emoji: '<:vyq_trang:1522629320600846418>', food: 1 },
  { id: 'van_yeu_qua_ha', ten: 'Vạn Yêu Quả (Hạ) 🟢', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 400, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Quả exp hạ phẩm của sủng vật, cho ăn gia tăng 1000 EXP.', emoji: '<:vyq_luc:1522629310270279932>', food: 1 },
  { id: 'van_yeu_qua_trung', ten: 'Vạn Yêu Quả (Trung) 🔵', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 800, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Quả exp trung phẩm của sủng vật, cho ăn gia tăng 2000 EXP.', emoji: '<:vyq_xanh:1522629316951806087>', food: 1 },
  { id: 'van_yeu_qua_thuong', ten: 'Vạn Yêu Quả (Thượng) 🟣', loai: 'Linh thảo', doHiem: 'Cực hiếm', giaCoSo: 1600, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Quả exp thượng phẩm của sủng vật, cho ăn gia tăng 4000 EXP.', emoji: '<:vyq_tim:1522629319040438392>', food: 1 },
  { id: 'van_yeu_qua_tien', ten: 'Vạn Yêu Quả (Tiên) 🟠', loai: 'Linh thảo', doHiem: 'Huyền thoại', giaCoSo: 3200, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Quả exp tiên phẩm của sủng vật, cho ăn gia tăng 8000 EXP.', emoji: '<:vyq_vang:1522629323343925308>', food: 1 },
  { id: 'van_yeu_qua_than', ten: 'Vạn Yêu Quả (Thần) 🔴', loai: 'Linh thảo', doHiem: 'Thần cấp', giaCoSo: 6400, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Quả exp thần phẩm của sủng vật, cho ăn gia tăng 16000 EXP.', emoji: '<:vyq_do:1522629312648450128>', food: 1 },

  // Gacha & Chí Bảo — food: 0
  { id: 'co_duyen_lenh', ten: 'Cơ Duyên Lệnh 🎫', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Tấm thẻ ẩn chứa cơ duyên thiên địa, dùng để quay Hồ Tạo Hóa.', food: 0 },
  { id: 'binh_tinh_hai', ten: 'Bình Tinh Hải', loai: 'Chí bảo', doHiem: 'Thần cấp', giaCoSo: 1000000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Chí bảo thượng cổ, mỗi ngày có thể trích xuất sinh cơ để ngưng tụ 2 viên Đan Thần Phẩm.', emoji: '<:binh_tinh_hai:1523244204333994016>', food: 0 },
  { id: 'can_khon_dinh', ten: 'Càn Khôn Đỉnh', loai: 'Chí bảo', doHiem: 'Thần cấp', giaCoSo: 1000000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Chí bảo thượng cổ, mỗi ngày có thể dùng 2 lần để tái lập linh văn (chỉ số phụ) của trang bị đang mặc.', emoji: '<:can_khon_dinh:1523249412950855850>', food: 0 },
  { id: 'the_vinh_vien', ten: 'Thẻ Vĩnh Viễn', loai: 'Chí bảo', doHiem: 'Thần cấp', giaCoSo: 0, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Thẻ vĩnh viễn chí bảo, mỗi ngày sử dụng nhận 2 Cơ Duyên Lệnh và 1 Tu Vi Đan phù hợp cảnh giới.', emoji: '<:the_vinh_vien:1524432820892733650>', food: 0 },
  { id: 'the_quy', ten: 'Thẻ Quý', loai: 'Chí bảo', doHiem: 'Cực hiếm', giaCoSo: 0, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Thẻ quý chí bảo thời hạn 90 ngày, mỗi ngày sử dụng nhận 2 Cơ Duyên Lệnh.', emoji: '<:the_quy:1524432824042520659>', food: 0 },
  { id: 'the_thang', ten: 'Thẻ Tháng', loai: 'Chí bảo', doHiem: 'Hiếm', giaCoSo: 0, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Thẻ tháng chí bảo thời hạn 30 ngày, mỗi ngày sử dụng nhận 2 Cơ Duyên Lệnh.', emoji: '<:the_thang:1524432822608068720>', food: 0 },
  { id: 'dich_dung_dan', ten: 'Dịch Dung Đan 🎭', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 0, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Đan dược thần bí dùng để nhận ngẫu nhiên trang phục và nền ảnh tân thủ.', emoji: '<:dich_dung_dan:1523300794701582397>', food: 0 },
  { id: 'nam_1', ten: 'Trang phục Tân Thủ Nam 1 👕', loai: 'Skin', doHiem: 'Hiếm', giaCoSo: 0, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trang phục tân thủ dành cho Nam.', emoji: '🎭', food: 0 },
  { id: 'nam_2', ten: 'Trang phục Tân Thủ Nam 2 👕', loai: 'Skin', doHiem: 'Hiếm', giaCoSo: 0, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trang phục tân thủ dành cho Nam.', emoji: '🎭', food: 0 },
  { id: 'nam_3', ten: 'Trang phục Tân Thủ Nam 3 👕', loai: 'Skin', doHiem: 'Hiếm', giaCoSo: 0, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trang phục tân thủ dành cho Nam.', emoji: '🎭', food: 0 },
  { id: 'nu_1', ten: 'Trang phục Tân Thủ Nữ 1 👗', loai: 'Skin', doHiem: 'Hiếm', giaCoSo: 0, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trang phục tân thủ dành cho Nữ.', emoji: '🎭', food: 0 },
  { id: 'nu_2', ten: 'Trang phục Tân Thủ Nữ 2 👗', loai: 'Skin', doHiem: 'Hiếm', giaCoSo: 0, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trang phục tân thủ dành cho Nữ.', emoji: '🎭', food: 0 },
  { id: 'nu_3', ten: 'Trang phục Tân Thủ Nữ 3 👗', loai: 'Skin', doHiem: 'Hiếm', giaCoSo: 0, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trang phục tân thủ dành cho Nữ.', emoji: '🎭', food: 0 },
  { id: 'backg01', ten: 'Nền Tân Thủ 1 🖼️', loai: 'Skin', doHiem: 'Hiếm', giaCoSo: 0, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Nền ảnh tân thủ 1.', emoji: '🖼️', food: 0 },
  { id: 'backg02', ten: 'Nền Tân Thủ 2 🖼️', loai: 'Skin', doHiem: 'Hiếm', giaCoSo: 0, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Nền ảnh tân thủ 2.', emoji: '🖼️', food: 0 },
  { id: 'backg03', ten: 'Nền Tân Thủ 3 🖼️', loai: 'Skin', doHiem: 'Hiếm', giaCoSo: 0, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Nền ảnh tân thủ 3.', emoji: '🖼️', food: 0 },
  { id: 'linh_sung_lenh', ten: 'Linh Sủng Lệnh 🎫', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Tấm thẻ lệnh dùng triệu gọi và chiêu mộ Linh Thú tại Vạn Thú Các.', emoji: '<:linh_sung_lenh:1525144632651153510>', food: 0 },
  { id: 'hoa_than_dan', ten: 'Hóa Thần Đan 💊', loai: 'Đan dược', doHiem: 'Thần cấp', giaCoSo: 10000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Đan dược cực phẩm chứa linh lực dồi dào, cho linh thú ăn để tăng tu vi và cảnh giới.', emoji: '<:hoa_than_pet:1522610156720881804>', food: 0 },
  { id: 'kim_phach_ha', ten: 'Yêu Phách Kim (Hạ) <:kim_phach_ha:1525148233305952276>', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 1000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Yêu phách hệ Kim hạ phẩm, dùng để nâng cấp huyết mạch sủng vật.', emoji: '<:kim_phach_ha:1525148233305952276>', food: 0 },
  { id: 'kim_phach_trung', ten: 'Yêu Phách Kim (Trung) <:kim_phach_trung:1525148231141429338>', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 3000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Yêu phách hệ Kim trung phẩm, dùng để nâng cấp huyết mạch sủng vật.', emoji: '<:kim_phach_trung:1525148231141429338>', food: 0 },
  { id: 'kim_phach_thuong', ten: 'Yêu Phách Kim (Thượng) <:kim_phach_thuong:1525148228746477658>', loai: 'Linh thảo', doHiem: 'Cực hiếm', giaCoSo: 9000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Yêu phách hệ Kim thượng phẩm, dùng để nâng cấp huyết mạch sủng vật.', emoji: '<:kim_phach_thuong:1525148228746477658>', food: 0 },
  { id: 'tho_phach_ha', ten: 'Yêu Phách Thổ (Hạ) <:tho_phach_ha:1525148226481815572>', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 1000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Yêu phách hệ Thổ hạ phẩm, dùng để nâng cấp huyết mạch sủng vật.', emoji: '<:tho_phach_ha:1525148226481815572>', food: 0 },
  { id: 'tho_phach_trung', ten: 'Yêu Phách Thổ (Trung) <:tho_phach_trung:1525148224292257913>', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 3000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Yêu phách hệ Thổ trung phẩm, dùng để nâng cấp huyết mạch sủng vật.', emoji: '<:tho_phach_trung:1525148224292257913>', food: 0 },
  { id: 'tho_phach_thuong', ten: 'Yêu Phách Thổ (Thượng) <:tho_phach_thuong:1525148221620621455>', loai: 'Linh thảo', doHiem: 'Cực hiếm', giaCoSo: 9000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Yêu phách hệ Thổ thượng phẩm, dùng để nâng cấp huyết mạch sủng vật.', emoji: '<:tho_phach_thuong:1525148221620621455>', food: 0 },
  { id: 'moc_phach_ha', ten: 'Yêu Phách Mộc (Hạ) <:moc_phach_ha:1525148219540246699>', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 1000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Yêu phách hệ Mộc hạ phẩm, dùng để nâng cấp huyết mạch sủng vật.', emoji: '<:moc_phach_ha:1525148219540246699>', food: 0 },
  { id: 'moc_phach_trung', ten: 'Yêu Phách Mộc (Trung) <:moc_phach_trung:1525148217250025572>', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 3000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Yêu phách hệ Mộc trung phẩm, dùng để nâng cấp huyết mạch sủng vật.', emoji: '<:moc_phach_trung:1525148217250025572>', food: 0 },
  { id: 'moc_phac_thuong', ten: 'Yêu Phách Mộc (Thượng) <:moc_phac_thuong:1525148214985101373>', loai: 'Linh thảo', doHiem: 'Cực hiếm', giaCoSo: 9000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Yêu phách hệ Mộc thượng phẩm, dùng để nâng cấp huyết mạch sủng vật.', emoji: '<:moc_phac_thuong:1525148214985101373>', food: 0 },
  { id: 'thuy_phac_ha', ten: 'Yêu Phách Thủy (Hạ) <:thuy_phac_ha:1525148212380307557>', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 1000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Yêu phách hệ Thủy hạ phẩm, dùng để nâng cấp huyết mạch sủng vật.', emoji: '<:thuy_phac_ha:1525148212380307557>', food: 0 },
  { id: 'thuy_phach_trung', ten: 'Yêu Phách Thủy (Trung) <:thuy_phach_trung:1525148200564949176>', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 3000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Yêu phách hệ Thủy trung phẩm, dùng để nâng cấp huyết mạch sủng vật.', emoji: '<:thuy_phach_trung:1525148200564949176>', food: 0 },
  { id: 'thuy_phach_thuong', ten: 'Yêu Phách Thủy (Thượng) <:thuy_phach_thuong:1525148197889114132>', loai: 'Linh thảo', doHiem: 'Cực hiếm', giaCoSo: 9000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Yêu phách hệ Thủy thượng phẩm, dùng để nâng cấp huyết mạch sủng vật.', emoji: '<:thuy_phach_thuong:1525148197889114132>', food: 0 },
  { id: 'hoa_phach_ha', ten: 'Yêu Phách Hỏa (Hạ) <:hoa_phach_ha:1525148195678589119>', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 1000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Yêu phách hệ Hỏa hạ phẩm, dùng để nâng cấp huyết mạch sủng vật.', emoji: '<:hoa_phach_ha:1525148195678589119>', food: 0 },
  { id: 'hoa_phach_trung', ten: 'Yêu Phách Hỏa (Trung) <:hoa_phach_trung:1525148192868401173>', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 3000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Yêu phách hệ Hỏa trung phẩm, dùng để nâng cấp huyết mạch sủng vật.', emoji: '<:hoa_phach_trung:1525148192868401173>', food: 0 },
  { id: 'hoa_phach_thuong', ten: 'Yêu Phách Hỏa (Thượng) <:hoa_phach_thuong:1525148190809002006>', loai: 'Linh thảo', doHiem: 'Cực hiếm', giaCoSo: 9000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Yêu phách hệ Hỏa thượng phẩm, dùng để nâng cấp huyết mạch sủng vật.', emoji: '<:hoa_phach_thuong:1525148190809002006>', food: 0 }
];



// ==========================================
// THÔNG TIN KỸ NĂNG MẪU (SKILLS)
// ==========================================
export const SKILLS = [
  // Kỹ năng phái Thể Tu (Vật lý)
  { id: 'huyet_khi_phun_trao', ten: 'Huyết Khí Phun Trào <:huyet_khi_phun_trao:1525086798328369283>', loai: 'Vật lý', satThuong: 0, cooldown: 9, yeuCauCanhGioi: 1, congPhapId: null, moTa: 'Đốt cháy một phần khí huyết để kích hoạt tiềm năng nhục thân, khiến cơ bắp tràn trề sức mạnh.' },
  { id: 'bang_son_quyen', ten: 'Băng Sơn Quyền <:bang_son_quyen:1525086796462162022>', loai: 'Vật lý', satThuong: 100, cooldown: 0, yeuCauCanhGioi: 1, congPhapId: null, moTa: 'Dồn toàn lực vào nắm đấm, lao đến nện mạnh xuống khiến mặt đất rung chuyển, hạn chế khả năng di chuyển của địch.' },
  { id: 'hong_hoang_kich', ten: 'Hồng Hoang Kích <:Hong_hoang_kich:1525381965010829443>', loai: 'Vật lý', satThuong: 500, cooldown: 9, yeuCauCanhGioi: 10, congPhapId: null, moTa: 'Dồn toàn bộ huyết khí vào một quyền uy mãnh, bạo phát lực lượng mang theo uy quyền vỡ đất lở núi, không thể cản phá. [Sát thương: Gây 500% Sát thương Vật lý. Hồi phục: Hút huyết khí phản hồi, lập tức hồi 5% Sinh lực tối đa khi đánh trúng mục tiêu. Buff bản thân: Tăng 15% Sát thương vật công trong 2 hiệp tiếp theo. Hiệu ứng phụ: Chắc chắn Bạo kích (100% Crit) nếu Sinh lực mục tiêu đang trên 70%. Có 30% tỷ lệ gây [Choáng/Định Thân] trong 1 hiệp. Hồi chiêu 3 hiệp]' },
  { id: 'bat_hoang_bo', ten: 'Bát Hoang Bộ <:bat_hoang_bo:1525381962565554186>', loai: 'Vật lý', satThuong: 0, cooldown: 21, yeuCauCanhGioi: 10, congPhapId: null, moTa: 'Thân pháp nhanh như chớp, vận chuyển huyết khí bùng nổ thành tàn ảnh hỏa diễm càn quét khắp chiến trường. [Hồi phục: Lập tức hồi 10% Sinh lực tối đa ngay khi thi triển. Buff bản thân: Tăng 30% Tốc độ và 20% Thân pháp (Né tránh) trong 4 hiệp. Hiệu ứng phụ: Kích hoạt trạng thái [Hỏa Lôi Đạp]: Trong thời gian duy trì, mỗi khi lướt qua (đánh trúng) kẻ địch sẽ thiêu đốt chúng, gây 40% Sát thương vật công mỗi hiệp. Hồi chiêu 7 hiệp]' },
  { id: 'bat_hoang_toai_thach_kich', ten: 'Bát Hoang Toái Thạch Kích <:bat_hoang_toai_thach_kich:1525024448137269421>', loai: 'Vật lý', satThuong: 150, cooldown: 9, yeuCauCanhGioi: 13, congPhapId: null, moTa: 'Nhân vật vận dụng toàn bộ sức mạnh cơ bắp, gây sát thương vật lý bằng 150% Vật Công lên một mục tiêu và bỏ qua 10% Vật Phòng của đối phương. - hồi chiêu 3 hiệp' },
  { id: 'cuu_long_ba_the_tran', ten: 'Cửu Long Bá Thể Trận <:cuu_long_ba_the:1525024450687537233>', loai: 'Vật lý', satThuong: 0, cooldown: 15, yeuCauCanhGioi: 13, congPhapId: null, moTa: 'Nhân vật kích hoạt khí huyết, tạo ra một lớp khiên chắn tương đương 20% HP tối đa và tăng 15% Kháng khống chế trong 3 hiệp. - hồi chiêu 5 hiệp' },
  { id: 'huyet_mach_cuong_hoa', ten: 'Huyết Mạch Cuồng Hóa <:huyet_mach_cuong_hoa:1525024458547531817>', loai: 'Vật lý', satThuong: 0, cooldown: 15, yeuCauCanhGioi: 13, congPhapId: null, moTa: 'Nhân vật thiêu đốt 10% HP hiện tại để tiến vào trạng thái cuồng nộ, giúp tăng 30% Vật Công và +20 Tốc độ trong 3 hiệp. - hồi chiêu 5 hiệp' },

  // Kỹ năng phái Pháp Tu (Phép thuật)
  { id: 'tu_khi_thuat', ten: 'Tụ Khí Thuật <:tu_khi_thuat:1525086802921394176>', loai: 'Phép thuật', satThuong: 0, cooldown: 6, yeuCauCanhGioi: 1, congPhapId: null, moTa: 'Tu sĩ vận chuyển chu thiên, dẫn dắt linh khí đất trời vào cơ thể.' },
  { id: 'linh_phao_thuat', ten: 'Linh Pháo Thuật <:linh_phao_thuat:1525086800635494522>', loai: 'Phép thuật', satThuong: 100, cooldown: 0, yeuCauCanhGioi: 1, congPhapId: null, moTa: 'Nén chân khí lại thành một viên pháo năng lượng rồi bắn thẳng vào kẻ địch.' },
  { id: 'tu_duong_chuong', ten: 'Tử Dương Chưởng <:tu_guong_chuong:1525381952536842381>', loai: 'Phép thuật', satThuong: 400, cooldown: 15, yeuCauCanhGioi: 10, congPhapId: null, moTa: 'Ngưng tụ linh lực thành chưởng ấn tử hỏa rực rỡ, thiêu đốt và phá vỡ chân khí của kẻ địch. [Sát thương: Gây 400% Sát thương Pháp thuật. Buff bản thân: Tăng 10% Pháp công trong 3 hiệp. Hiệu ứng phụ: Có 35% tỷ lệ gây trạng thái [Tán Khí] (giảm 15% Kháng Pháp của mục tiêu) trong 2 hiệp. Hồi chiêu 5 hiệp]' },
  { id: 'phap_tuong_kim_cang', ten: 'Pháp Tướng Kim Cang <:phap_tuong_kim_cang:1525381960837365871>', loai: 'Phép thuật', satThuong: 0, cooldown: 21, yeuCauCanhGioi: 10, congPhapId: null, moTa: 'Triệu hồi hư ảnh Kim Cang Hộ Pháp kim quang rực rỡ bao bọc toàn thân, vạn pháp bất xâm. [Hồi phục: Tự dưỡng thương, hồi 8% Sinh lực tối đa mỗi hiệp, kéo dài trong 5 hiệp. Buff bản thân: Tăng 30% Vật phòng và Pháp phòng trong 5 hiệp. Hiệu ứng phụ: Nhận trạng thái [Hộ Thể] (giảm 15% toàn bộ sát thương gánh chịu) trong thời gian hiệu lực. Hồi chiêu 7 hiệp]' },
  { id: 'thai_hu_van_kiem_quyet', ten: 'Thái Hư Vạn Kiếm Quyết <:thai_hu_van_kiem:1525024456840450088>', loai: 'Phép thuật', satThuong: 100, cooldown: 9, yeuCauCanhGioi: 13, congPhapId: null, moTa: 'Nhân vật tiêu hao chân khí triệu hồi vô số phi kiếm, gây sát thương phép diện rộng bằng 100% Pháp Công lên toàn bộ kẻ địch và làm giảm 10% Tốc độ của chúng. - hồi chiêu 3 hiệp' },
  { id: 'ngu_loi_oanh_dinh', ten: 'Ngũ Lôi Oanh Đỉnh <:ngu_loi_oanh_dinh:1525024452830826617>', loai: 'Phép thuật', satThuong: 180, cooldown: 9, yeuCauCanhGioi: 13, congPhapId: null, moTa: 'Nhân vật ngưng tụ sấm sét giáng xuống đầu một mục tiêu, gây sát thương phép cực mạnh bằng 180% Pháp Công kèm theo 20% tỷ lệ gây Tê Liệt (mất lượt hành động) trong 1 hiệp. - hồi chiêu 3 hiệp' },
  { id: 'dai_tu_linh_tran', ten: 'Đại Tụ Linh Trận <:dai_tu_linh_tran:1525024454911070258>', loai: 'Phép thuật', satThuong: 0, cooldown: 15, yeuCauCanhGioi: 13, congPhapId: null, moTa: 'Nhân vật trận pháp hấp thụ linh khí đất trời, ngay lập tức hồi phục 30% Chân Khí (MP) tối đa và giảm thời gian hồi chiêu của tất cả kỹ năng khác đi 1 lượt. - hồi chiêu 5 hiệp' }
];

export function getSkillMpCost(skill) {
  // Luyện Khí (level 1-9): realm index 0
  // Trúc Cơ (level 10-12): realm index 1
  // Kim Đan (level 13-15): realm index 2
  // Nguyên Anh (level 16-18): realm index 3
  // Hóa Thần (level 19-21): realm index 4
  // Phản Hư (level 22-24): realm index 5
  // Hợp Thể (level 25-27): realm index 6
  // Đại Thừa (level 28-30): realm index 7
  // Tiên Nhân (level 31+): realm index 8
  
  let realmIndex = 0;
  if (skill.yeuCauCanhGioi >= 31) realmIndex = 8;
  else if (skill.yeuCauCanhGioi >= 28) realmIndex = 7;
  else if (skill.yeuCauCanhGioi >= 25) realmIndex = 6;
  else if (skill.yeuCauCanhGioi >= 22) realmIndex = 5;
  else if (skill.yeuCauCanhGioi >= 19) realmIndex = 4;
  else if (skill.yeuCauCanhGioi >= 16) realmIndex = 3;
  else if (skill.yeuCauCanhGioi >= 13) realmIndex = 2;
  else if (skill.yeuCauCanhGioi >= 10) realmIndex = 1;
  
  let baseLuyenKhiMp = 0;
  if (skill.loai === 'Vật lý') {
    baseLuyenKhiMp = 3500;
  } else {
    baseLuyenKhiMp = 5000;
  }
  
  return Math.floor(baseLuyenKhiMp * Math.pow(1.5, realmIndex));
}

// ==========================================
// CẤU HÌNH BÍ CẢNH (DUNGEONS)
// ==========================================
export const DUNGEONS = [
  {
    id: 'tan_thu_phu_ban',
    ten: 'Tân Thủ Phụ Bản ⛰️',
    capDoYeuCau: 1,
    canhGioiYeuCauText: 'Luyện Khí',
    quaiVat: {
      ten: 'Thiết Bì Thử (Chuột Thép)',
      hp: 150,
      vatCong: 15,
      phapCong: 0,
      vatPhong: 5,
      phapPhong: 5
    },
    thuong: {
      expMin: 30,
      expMax: 50,
      stonesMin: 10,
      stonesMax: 20
    },
    drops: [
      { itemId: 'hat_giong_tu_linh_thao', tile: 0.25 },
      { itemId: 'dan_hp_1', tile: 0.50 },
      { itemId: 'dan_mp_1', tile: 0.50 },
      // Pháp Tu
      { itemId: 'thanh_phong_kiem', tile: 0.15 },
      { itemId: 'dao_bao_thanh_van', tile: 0.15 },
      { itemId: 'thuy_linh_boi', tile: 0.15 },
      { itemId: 'pb_lk_linh_phong_cham', tile: 0.05 },
      { itemId: 'pb_lk_dan_loi_phu', tile: 0.05 },
      { itemId: 'pb_lk_ho_than_kinh', tile: 0.05 },
      { itemId: 'pb_lk_dinh_than_phu', tile: 0.05 },
      { itemId: 'pb_lk_thanh_linh_binh', tile: 0.05 },
      { itemId: 'pb_lk_tu_khi_ky', tile: 0.05 },
      // Thể Tu
      { itemId: 'thiet_cot_dao', tile: 0.15 },
      { itemId: 'tho_bo_thuc_cu', tile: 0.15 },
      { itemId: 'khuong_thach_boi', tile: 0.15 },
      { itemId: 'pb_lk_toai_thach_an', tile: 0.05 },
      { itemId: 'pb_lk_hoa_tinh_dinh', tile: 0.05 },
      { itemId: 'pb_lk_thach_phu_thuan', tile: 0.05 },
      { itemId: 'pb_lk_u_thiet_lien', tile: 0.05 },
      { itemId: 'pb_lk_da_son_sam', tile: 0.05 },
      { itemId: 'pb_lk_chien_co', tile: 0.05 }
    ]
  },
  {
    id: 'u_minh_coc',
    ten: 'U Minh Cốc 💀',
    capDoYeuCau: 10,
    canhGioiYeuCauText: 'Trúc Cơ',
    quaiVat: {
      ten: 'U Minh Ma Lang (Sói U Minh)',
      hp: 650,
      vatCong: 55,
      phapCong: 0,
      vatPhong: 25,
      phapPhong: 25
    },
    thuong: {
      expMin: 150,
      expMax: 250,
      stonesMin: 50,
      stonesMax: 100
    },
    drops: [
      { itemId: 'dan_hp_2', tile: 0.50 },
      { itemId: 'dan_mp_2', tile: 0.50 },
      { itemId: 'huyen_thiet_tinh_sa', tile: 0.15 },
      { itemId: 'luc_ngoc_thach', tile: 0.15 },
      { itemId: 'am_duong_dong_chuong', tile: 0.15 },
      { itemId: 'dia_hoa_chi_tinh', tile: 0.10 },
      { itemId: 'cuu_thien_tu_cat', tile: 0.10 },
      { itemId: 'bich_hai_bang_tinh', tile: 0.10 },
      { itemId: 'khon_tien_dang_moc', tile: 0.10 },
      { itemId: 'dia_xich_linh_chi', tile: 0.10 },
      { itemId: 'thanh_vu_linh_sa', tile: 0.10 },
      // Trúc Cơ - Pháp Tu
      { itemId: 'vk_phap_truc_co', tile: 0.12 },
      { itemId: 'giap_phap_truc_co', tile: 0.12 },
      { itemId: 'nb_phap_truc_co', tile: 0.12 },
      { itemId: 'pb_hoi_phap_truc_co', tile: 0.06 },
      { itemId: 'pb_def_phap_truc_co', tile: 0.06 },
      { itemId: 'pb_aoe_phap_truc_co', tile: 0.06 },
      { itemId: 'pb_don_phap_truc_co', tile: 0.06 },
      { itemId: 'pb_cc_phap_truc_co', tile: 0.06 },
      { itemId: 'pb_buff_phap_truc_co', tile: 0.06 },
      // Trúc Cơ - Thể Tu
      { itemId: 'vk_the_truc_co', tile: 0.12 },
      { itemId: 'giap_the_truc_co', tile: 0.12 },
      { itemId: 'nb_the_truc_co', tile: 0.12 },
      { itemId: 'pb_hoi_the_truc_co', tile: 0.06 },
      { itemId: 'pb_def_the_truc_co', tile: 0.06 },
      { itemId: 'pb_aoe_the_truc_co', tile: 0.06 },
      { itemId: 'pb_don_the_truc_co', tile: 0.06 },
      { itemId: 'pb_cc_the_truc_co', tile: 0.06 },
      { itemId: 'pb_buff_the_truc_co', tile: 0.06 },
      // Chung
      { itemId: 'kiem_sat', tile: 0.10 },
      { itemId: 'truong_truc', tile: 0.10 },
      { itemId: 'ao_da', tile: 0.10 }
    ]
  },
  {
    id: 'hoa_diem_son',
    ten: 'Hỏa Diệm Sơn 🔥',
    capDoYeuCau: 19,
    canhGioiYeuCauText: 'Hóa Thần',
    quaiVat: {
      ten: 'Hỏa Viêm Yêu Linh (Kỳ Lân Lửa)',
      hp: 2800,
      vatCong: 120,
      phapCong: 150,
      vatPhong: 80,
      phapPhong: 100
    },
    thuong: {
      expMin: 800,
      expMax: 1200,
      stonesMin: 200,
      stonesMax: 400
    },
    drops: [
      { itemId: 'dan_hp_2', tile: 0.60 },
      { itemId: 'dan_mp_2', tile: 0.60 },
      { itemId: 'kiem_huyen_thiet', tile: 0.10 },
      { itemId: 'phap_bao_huyen_mon', tile: 0.10 },
      { itemId: 'giap_huyen_thiet', tile: 0.10 }
    ]
  }
];

// ==========================================
// CẤU HÌNH SỰ KIỆN LỊCH LUYỆN (ADVENTURE EVENTS)
// ==========================================
export const ADVENTURE_EVENTS = [
  {
    id: 'linh_khi_trieu_tich',
    ten: '⚡ Linh Khí Triều Tịch ⚡',
    moTa: 'Trong lúc leo lên đỉnh Ngọc Kinh Sơn, đạo hữu vô tình gặp một luồng linh khí trời đất bộc phát, cọ rửa kinh mạch, tu vi tiến triển nhanh chóng!',
    loai: 'tot',
    hieuUngJson: '{"exp":{"min":40,"max":100}}'
  },
  {
    id: 'nhat_linh_thach',
    ten: '🪙 Linh Thạch Thượng Cổ 🪙',
    moTa: 'Tại một lòng sông cạn dưới chân U Minh Cốc, đạo hữu vô tình phát hiện ra một số viên Linh Thạch thượng cổ bị chôn vùi dưới cát mịn.',
    loai: 'tot',
    hieuUngJson: '{"stones":{"min":20,"max":70}}'
  },
  {
    id: 'dong_phu_tien_boi',
    ten: '🏺 Động Phủ Tiền Bối 🏺',
    moTa: 'Đạo hữu vô tình bước qua kết giới, phát hiện một động phủ ẩn giấu của một vị tu sĩ cổ đại hóa trần. Trên bàn đá tĩnh tọa vẫn còn lưu lại di vật của người.',
    loai: 'dai_co_duyen',
    hieuUngJson: '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"🏺 **Duyên Định Động Phủ**: Đạo hữu {name} trong lúc lịch luyện phát hiện động phủ cổ xưa của tiền bối, đạt được bảo vật {itemName}!"}'
  },
  {
    id: 'linh_thao_ki_ngo',
    ten: '🌱 Kỳ Ngộ Linh Thảo 🌱',
    moTa: 'Bên vách núi dựng đứng cheo leo đầy sương mù, đạo hữu phát hiện một đóa linh chi quý chiêu tuyết đang hấp thụ tinh hoa nguyệt ảnh.',
    loai: 'tot',
    hieuUngJson: '{"itemRandom":{"loai":"Linh thảo"}}'
  },
  {
    id: 'cao_nhan_truyen_cong',
    ten: '🧙 Cao Nhân Chỉ Điểm 🧙',
    moTa: 'Đạo hữu gặp gỡ một lão giả râu tóc bạc phơ đang ngồi câu cá bên đầm lầy vô danh. Sau vài câu đàm đạo đạo lý thiên địa, lão giả vỗ vai truyền thụ linh lực rồi biến mất vào không hư.',
    loai: 'dai_co_duyen',
    hieuUngJson: '{"exp":{"min":150,"max":250},"thienDaoLuc":true,"thienDaoLucMsg":"🧙 **Tiên Nhân Chỉ Lộ**: Đạo hữu {name} kỳ ngộ cao nhân đắc đạo chỉ điểm mê tân, tu vi tăng tiến thần tốc!"}'
  },
  {
    id: 'yeu_thu_phuc_kich',
    ten: '🐾 Yêu Thú Phục Kích 🐾',
    moTa: 'Đang đi trong rừng trúc sương mù, đạo hữu bất ngờ bị một con Trúc Điệp Yêu thú từ trên cao phóng xuống tấn công. Trận chiến diễn ra chóng vánh, đạo hữu tuy chạy thoát nhưng bị thương tích đầy mình.',
    loai: 'xui_xeo',
    hieuUngJson: '{"hpPhat":0.15}'
  },
  {
    id: 'co_tran_phap',
    ten: '🌀 Cổ Trận Pháp Vây Hãm 🌀',
    moTa: 'Đạo hữu vô tình giẫm phải trận pháp huyễn cảnh bị bỏ hoang từ thời thái cổ. Trận pháp điên cuồng hút lấy linh lực của đạo hữu trước khi tự động sụp đổ giải giới.',
    loai: 'xui_xeo',
    hieuUngJson: '{"mpPhat":0.20}'
  },
  {
    id: 'co_duyen_lichluyen_1',
    ten: '🎫 Nhặt Được Cơ Duyên Lệnh 🎫',
    moTa: 'Dưới gốc cây tùng cổ thụ ngàn năm tuổi, đạo hữu vô tình phát hiện ra một miếng ngọc giản cũ màu vàng nhạt, lấp lánh ánh kim. Nhìn kỹ thì ra đó chính là một tấm Cơ Duyên Lệnh!',
    loai: 'dai_co_duyen',
    hieuUngJson: '{"itemSpecified":{"itemId":"co_duyen_lenh","quantity":3},"thienDaoLuc":true,"thienDaoLucMsg":"🎫 **Cơ Duyên Lệnh Xuất Thế**: Đạo hữu {name} trong lúc lịch luyện nhặt được Cơ Duyên Lệnh cổ xưa!"}'
  },
  {
    id: 'co_duyen_lichluyen_2',
    ten: '✨ Thượng Cổ Di Chỉ ✨',
    moTa: 'Khám phá một hang động đầy thạch nhũ lấp lánh, đạo hữu vô tình đào được chiếc rương gỗ mục nát dưới đống đổ nát, bên trong cất giấu một tấm Cơ Duyên Lệnh nguyên vẹn!',
    loai: 'tot',
    hieuUngJson: '{"itemSpecified":{"itemId":"co_duyen_lenh","quantity":1}}'
  },
  {
    id: 'co_duyen_lichluyen_3',
    ten: '👵 Lão Nhân Hào Sảng 👵',
    moTa: 'Một bà lão tu sĩ bán nước chè bên đường nhìn thấy đạo hữu có cốt cách phi phàm, cười hiền từ rồi lặng lẽ nhét vào tay đạo hữu một tấm Cơ Duyên Lệnh làm quà gặp mặt!',
    loai: 'tot',
    hieuUngJson: '{"itemSpecified":{"itemId":"co_duyen_lenh","quantity":1}}'
  }
];

// ==========================================
// THÔNG TIN KỸ NĂNG CỔ BẢO & PHÁP BẢO
// ==========================================
export const KYNANG_TRANGBI = {
  // Cổ Bảo Chủ Động
  "co_bao_kiem_khi": {
    ten: "Vô Ảnh Kiếm Khí 🗡️",
    baseDmg: 150,
    loai: "sat_thuong",
    moTa: "Tự động kích hoạt phi xuất vạn đạo kiếm khí, gây 150 sát thương."
  },
  "co_bao_dong_tu": {
    ten: "Càn Khôn Đỉnh 🏺",
    baseDmg: 350,
    loai: "sat_thuong",
    moTa: "Kích hoạt pháp bảo khổng lồ nện mạnh xuống yêu thú, gây 350 sát thương."
  },
  "co_bao_tien_dan": {
    ten: "Huyền Hỏa Chước Thiên 🍶",
    baseDmg: 800,
    loai: "sat_thuong",
    moTa: "Phun ra luồng cửu u huyền hỏa thiêu đốt yêu thú, gây 800 sát thương."
  },
  // Pháp Bảo
  "phap_bao_ho_than": {
    ten: "Phù Vân Hộ Thể 🛡️",
    baseShield: 120,
    loai: "khien",
    moTa: "Ngưng tụ sương mù khiên hộ thể, chặn 120 sát thương kế tiếp."
  },
  "phap_bao_cong_kich": {
    ten: "Hỏa Long Chủy 🔱",
    baseDmg: 320,
    loai: "sat_thuong_pb",
    moTa: "Phóng thần lao lửa oanh tạc địch nhân, gây 320 sát thương pháp bảo."
  },
  "phap_bao_hon_ton": {
    ten: "Hỗn Độn Phá Thiên 🔔",
    baseDmg: 550,
    baseShield: 250,
    loai: "hon_hop",
    moTa: "Chuông vàng gõ vang gây 550 sát thương pháp bảo và tạo khiên 250 phòng ngự."
  }
};

// ==========================================
// HÀM SINH DÒNG CHỈ SỐ ĐỘNG NGẪU NHIÊN
// ==========================================
// Helper: Cuộn ngẫu nhiên phẩm chất nguyên liệu
export function rollMaterialQuality() {
  const roll = Math.random() * 100;
  if (roll <= 1) return 'Thần Thoại';
  if (roll <= 6) return 'Sử Thi';
  if (roll <= 20) return 'Hiếm';
  if (roll <= 50) return 'Thường';
  return 'Phế Phẩm';
}

// Helper: Cuộn phẩm chất trang bị sau khi luyện chế dựa trên nguyên liệu tiêu hao
export function rollForgedQuality(materialQuality) {
  const roll = Math.random() * 100;
  if (materialQuality === 'Phế Phẩm') {
    // 50% fail | 30% Thường | 20% Hiếm
    if (roll < 50) return 'fail';
    if (roll < 80) return 'Thường';
    return 'Hiếm';
  }
  if (materialQuality === 'Thường') {
    // 10% fail | 50% Thường | 40% Hiếm (user spec: 30%, 10% dư → Hiếm)
    if (roll < 10) return 'fail';
    if (roll < 60) return 'Thường';
    return 'Hiếm';
  }
  if (materialQuality === 'Hiếm') {
    // 0% fail | 40% Thường | 55% Hiếm | 5% Sử Thi
    if (roll < 40) return 'Thường';
    if (roll < 95) return 'Hiếm';
    return 'Sử Thi';
  }
  if (materialQuality === 'Sử Thi') {
    // 0% fail | 30% Thường | 55% Hiếm | 10% Sử Thi | 5% Thần Thoại
    if (roll < 30) return 'Thường';
    if (roll < 85) return 'Hiếm';
    if (roll < 95) return 'Sử Thi';
    return 'Thần Thoại';
  }
  if (materialQuality === 'Thần Thoại') {
    // 0% fail | 0% Thường | 55% Hiếm | 35% Sử Thi | 10% Thần Thoại
    if (roll < 55) return 'Hiếm';
    if (roll < 90) return 'Sử Thi';
    return 'Thần Thoại';
  }
  return 'Thường';
}


// ==========================================
// HÀM SINH DÒNG CHỈ SỐ ĐỘNG NGẪU NHIÊN
// ==========================================
export function rollDynamicStats(item, options = {}) {
  const loai = item.loai;
  const POOLS = {
    "Vũ khí": ["vat_cong", "phap_cong", "crit_rate", "crit_dmg", "xuyen_giap"],
    "Giáp": ["vat_phong", "phap_phong", "max_mp", "max_hp"],
    "Ngọc Bội": ["max_hp", "max_mp", "ne", "lifesteal", "speed"],
    "Cổ Bảo Chủ Động": ["vat_cong", "phap_cong", "vat_phong", "phap_phong", "max_hp", "max_mp", "ne", "lifesteal", "speed"],
    "Pháp Bảo": [
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
    "khien_pb": "Hộẫn Hấp thụ Pháp bảo",
    "speed": "Tốc độ"
  };

  const QUALITIES = [
    { name: "Phế Phẩm", color: "trang", min: -5, max: 0 },
    { name: "Thường", color: "luc", min: 0, max: 5 },
    { name: "Hiếm", color: "xanh", min: 5, max: 10 },
    { name: "Sử Thi", color: "tim", min: 10, max: 15 },
    { name: "Thần Thoại", color: "cam", min: 15, max: 20 }
  ];

  let maxQualityName = 'Thần Thoại';
  if (item.yeuCauCanhGioi >= 13) {
    const eqQ = options.phamChatTrangBi || 'Thường';
    if (eqQ === 'Phế Phẩm') maxQualityName = 'Thường';
    else if (eqQ === 'Thường') maxQualityName = 'Hiếm';
    else if (eqQ === 'Hiếm') maxQualityName = 'Sử Thi';
    else if (eqQ === 'Sử Thi') maxQualityName = 'Thần Thoại';
    else if (eqQ === 'Thần Thoại') maxQualityName = 'Thần Thoại';
  }

  const maxQIdx = QUALITIES.findIndex(q => q.name === maxQualityName);

  const lines = [];
  for (const stat of selectedStats) {
    const rand = Math.random();
    let qIdx = 0;

    if (rand < 0.05) qIdx = 4;
    else if (rand < 0.20) qIdx = 3;
    else if (rand < 0.50) qIdx = 2;
    else if (rand < 0.85) qIdx = 1;
    else qIdx = 0;

    // Giới hạn phẩm chất dòng phụ theo phẩm chất của trang bị
    if (qIdx > maxQIdx && maxQIdx !== -1) {
      qIdx = maxQIdx;
    }

    const q = QUALITIES[qIdx];
    const value = parseFloat((q.min + Math.random() * (q.max - q.min)).toFixed(1));
    lines.push({
      thuocTinh: stat,
      ten: NAME_MAP[stat] || stat,
      mau: q.color,
      phamChat: q.name,
      phanTram: value
    });
  }

  return lines;
}

// Cấu hình Kỹ Năng Chủ Động của Pháp Bảo
export const KYNANG_PHAPBAO_ACTIVE = {
  // --- KỸ NĂNG CHỦ ĐỘNG PHÁP BẢO TRÚC CƠ (THỂ TU) ---
  pb_hoi_the_truc_co: {
    ten: "Đại Bổ Khí Huyết ❇️",
    loai: "hoi_hp",
    triGia: 2000,
    duration: 0,
    moTa: "Hồi phục lập tức 2000 Khí Huyết (HP)."
  },
  pb_def_the_truc_co: {
    ten: "Nham Thạch Hộ Thể 🛡️",
    loai: "thach_phu_thuan",
    triGia: 300,
    duration: 2,
    moTa: "Tăng 60% Thủ, chặn 300 sát thương trong 2 hiệp."
  },
  pb_aoe_the_truc_co: {
    ten: "Liệt Diễm Khí Kình 🔥",
    loai: "tan_cong",
    tinhScale: (stats) => Math.floor((stats?.vat_cong || 100) * 1.60),
    duration: 0,
    moTa: "Gây 160% Sát thương vật lý lên toàn bộ mục tiêu."
  },
  pb_don_the_truc_co: {
    ten: "Man Lực Trực Kích 🔨",
    loai: "tan_cong",
    tinhScale: (stats) => Math.floor((stats?.vat_cong || 100) * 3.00),
    duration: 0,
    moTa: "Gây 300% Sát thương vật lý lên 1 mục tiêu."
  },
  pb_cc_the_truc_co: {
    ten: "Thiết Khóa Trầm Trọng ⛓️",
    loai: "u_thiet_lien",
    tinhScale: (stats) => Math.floor((stats?.vat_cong || 100) * 1.60),
    speedDebuff: 10,
    duration: 2,
    moTa: "Gây 160% Sát thương vật lý và giảm 10 Tốc độ của mục tiêu trong 2 hiệp."
  },
  pb_buff_the_truc_co: {
    ten: "Thú Huyết Sôi Sục 🥁",
    loai: "chien_co",
    triGia: 40,
    critBonus: 0.10,
    duration: 2,
    moTa: "Tăng 40% Vật Công và +10% Bạo kích trong 2 hiệp."
  },

  // --- KỸ NĂNG CHỦ ĐỘNG PHÁP BẢO TRÚC CƠ ---
  pb_hoi_phap_truc_co: {
    ten: "Linh Tuyết Phục Nguyên 🏺",
    loai: "hoi_mp",
    triGia: 2000,
    duration: 0,
    moTa: "Hồi phục lập tức 2000 Chân Khí (MP)."
  },
  pb_def_phap_truc_co: {
    ten: "Linh Quang Hộ Tráo 🛡️",
    loai: "khien",
    triGia: 1600,
    duration: 2,
    moTa: "Tạo khiên chặn 1600 sát thương trong 2 hiệp."
  },
  pb_aoe_phap_truc_co: {
    ten: "Cửu Thiên Lôi Vân ⚡",
    loai: "tan_cong",
    tinhScale: (stats) => Math.floor((stats?.phap_cong || 100) * 1.60),
    duration: 0,
    moTa: "Gây 160% Sát thương phép lên toàn bộ mục tiêu."
  },
  pb_don_phap_truc_co: {
    ten: "Oanh Thiên Thần Pháo 💥",
    loai: "tan_cong",
    tinhScale: (stats) => Math.floor((stats?.phap_cong || 100) * 3.00),
    duration: 0,
    moTa: "Bắn ra pháo năng lượng cực mạnh, gây 300% Sát thương phép lên 1 mục tiêu."
  },
  pb_cc_phap_truc_co: {
    ten: "Hàn Băng Tỏa Phược ❄️",
    loai: "khong_che",
    chance: 0.80,
    duration: 1,
    moTa: "Roi băng khóa chặt đối phương, 80% tỷ lệ gây Đóng Băng (mất lượt) trong 1 hiệp."
  },
  pb_buff_phap_truc_co: {
    ten: "Tử Khí Hào Phong 🪭",
    loai: "tu_khi_ky",
    triGia: 40,
    speedBonus: 20,
    duration: 2,
    moTa: "Quạt ra tử khí linh lực, tăng 40% Pháp Công và +20 Tốc độ trong 2 hiệp."
  },

  // --- KỸ NĂNG CHỦ ĐỘNG PHÁP BẢO LUYỆN KHÍ ---
  // Pháp Tu
  pb_lk_linh_phong_cham: {
    ten: "Phi Châm Phá Giáp 🪡",
    loai: "tan_cong",
    tinhScale: (stats) => Math.floor((stats?.phap_cong || 100) * 1.50),
    duration: 0,
    moTa: "Gây 150% Sát thương phép lên 1 mục tiêu."
  },
  pb_lk_dan_loi_phu: {
    ten: "Sơ Cấp Lôi Trận ⚡",
    loai: "tan_cong",
    tinhScale: (stats) => Math.floor((stats?.phap_cong || 100) * 0.80),
    duration: 0,
    moTa: "Gây 80% Sát thương phép lên toàn bộ mục tiêu."
  },
  pb_lk_ho_than_kinh: {
    ten: "Linh Khí Tráo 🛡️",
    loai: "khien",
    triGia: 800,
    duration: 2,
    moTa: "Tạo khiên chặn 800 sát thương trong 2 hiệp."
  },
  pb_lk_dinh_than_phu: {
    ten: "Định Thân Thuật 🌀",
    loai: "khong_che",
    chance: 0.40,
    duration: 1,
    moTa: "40% tỷ lệ khiến đối phương bị Đóng Băng (mất lượt) trong 1 hiệp."
  },
  pb_lk_thanh_linh_binh: {
    ten: "Cam Lộ Thuật 💧",
    loai: "hoi_mp",
    triGia: 1000,
    duration: 0,
    moTa: "Hồi phục lập tức 1000 Chân Khí (MP)."
  },
  pb_lk_tu_khi_ky: {
    ten: "Linh Lực Bộc Phát 🚩",
    loai: "tu_khi_ky",
    triGia: 20,
    speedBonus: 10,
    duration: 2,
    moTa: "Tăng 20% Pháp Công và +10 Tốc độ trong 2 hiệp."
  },

  // Thể Tu
  pb_lk_toai_thach_an: {
    ten: "Man Lực Trực Kích 🔨",
    loai: "tan_cong",
    tinhScale: (stats) => Math.floor((stats?.vat_cong || 100) * 1.50),
    duration: 0,
    moTa: "Gây 150% Sát thương vật lý lên 1 mục tiêu."
  },
  pb_lk_hoa_tinh_dinh: {
    ten: "Liệt Diễm Khí Kình 🔥",
    loai: "tan_cong",
    tinhScale: (stats) => Math.floor((stats?.vat_cong || 100) * 0.80),
    duration: 0,
    moTa: "Gây 80% Sát thương vật lý lên toàn bộ mục tiêu."
  },
  pb_lk_thach_phu_thuan: {
    ten: "Nham Thạch Hộ Thể 🛡️",
    loai: "thach_phu_thuan",
    triGia: 150,
    duration: 2,
    moTa: "Tăng 30% Thủ, chặn 150 sát thương trong 2 hiệp."
  },
  pb_lk_u_thiet_lien: {
    ten: "Thiết Khóa Trầm Trọng ⛓️",
    loai: "u_thiet_lien",
    tinhScale: (stats) => Math.floor((stats?.vat_cong || 100) * 0.80), // Let's say it does 80% physical attack as damage
    duration: 2,
    moTa: "Gây sát thương và giảm 5 Tốc độ của mục tiêu trong 2 hiệp."
  },
  pb_lk_da_son_sam: {
    ten: "Đại Bổ Khí Huyết 🥕",
    loai: "hoi_hp",
    triGia: 1000,
    duration: 0,
    moTa: "Hồi phục lập tức 1000 Khí Huyết (HP)."
  },
  pb_lk_chien_co: {
    ten: "Thú Huyết Sôi Sục 🥁",
    loai: "chien_co",
    triGia: 20,
    duration: 2,
    moTa: "Tăng 20% Vật Công và +5% Bạo kích trong 2 hiệp."
  },

  // --- KỸ NĂNG CHỦ ĐỘNG PHÁP BẢO KIM ĐAN ---
  pb_kd_diet_ma_cham: {
    ten: "Xuyên Tâm Châm 🪡",
    loai: "tan_cong",
    tinhScale: (stats) => Math.floor((stats?.phap_cong || 300) * 1.5),
    duration: 0,
    moTa: "Gây sát thương phép khổng lồ lên 1 kẻ địch, bỏ qua 20% Pháp phòng."
  },
  pb_kd_chan_son_an: {
    ten: "Toái Đỉnh Đích ☄️",
    loai: "tan_cong",
    tinhScale: (stats) => Math.floor((stats?.vat_cong || 300) * 1.5),
    duration: 0,
    moTa: "Nhảy lên ném ấn nện xuống, gây sát thương vật lý cực mạnh."
  },
  pb_kd_ngu_loi_chau: {
    ten: "Lôi Động Cửu Thiên ⚡",
    loai: "tan_cong",
    tinhScale: (stats) => Math.floor((stats?.phap_cong || 300) * 1.0),
    duration: 0,
    moTa: "Triệu hồi thiên lôi oanh tạc toàn bộ mục tiêu, gây sát thương phép."
  },
  pb_kd_phan_thien_dinh: {
    ten: "Hỏa Long Hàng Thế 🔥",
    loai: "tan_cong",
    tinhScale: (stats) => Math.floor((stats?.vat_cong || 300) * 1.0),
    duration: 0,
    moTa: "Phóng hỏa kình lan rộng, gây sát thương vật lý diện rộng."
  },
  pb_kd_bat_quai_kinh: {
    ten: "Linh Khí Hộ Thể 🛡️",
    loai: "khien",
    tinhScale: (stats) => Math.floor((stats?.max_mp || 1000) * 0.30),
    duration: 0,
    moTa: "Tạo lớp lá chắn hấp thụ sát thương dựa trên 30% Chân Khí tối đa."
  },
  pb_kd_huyen_vu_thuan: {
    ten: "Bất Diệt Kim Thân 🛡️",
    loai: "khien",
    tinhScale: (stats) => Math.floor((stats?.vat_phong || 150) * 3.0),
    duration: 0,
    moTa: "Tạo lớp khiên bảo vệ dựa trên 300% Vật phòng."
  },
  pb_kd_khon_tien_to: {
    ten: "Trói Buộc Nguyên Thần 🎗️",
    loai: "tan_cong",
    tinhScale: (stats) => Math.floor((stats?.phap_cong || 300) * 0.5),
    duration: 0,
    moTa: "Khóa chặt mục tiêu gây sát thương nhẹ."
  },
  pb_kd_toa_hon_lien: {
    ten: "Trấn Áp Nhục Thân ⛓️",
    loai: "tan_cong",
    tinhScale: (stats) => Math.floor((stats?.vat_cong || 300) * 0.5),
    duration: 0,
    moTa: "Trói buộc giảm tốc của đối phương gây sát thương vật lý nhẹ."
  },
  pb_kd_cam_lo_binh: {
    ten: "Mộc Lĩnh Sinh Cơ 💧",
    loai: "hoi_mau_pct",
    tinhScale: () => 30,
    duration: 0,
    moTa: "Phục hồi 30% HP tối đa."
  },
  pb_kd_huyet_bo_de: {
    ten: "Huyết Mạch Sôi Sục 🩸",
    loai: "hoi_mau_pct",
    tinhScale: () => 30,
    duration: 0,
    moTa: "Phục hồi lập tức 30% HP tối đa."
  },
  pb_kd_that_tinh_dang: {
    ten: "Tụ Tinh Dẫn Khí ✨",
    loai: "tang_cong_pct",
    tinhScale: () => 50,
    duration: 5,
    moTa: "Tăng 50% Pháp Công trong 5 hiệp."
  },
  pb_kd_man_hoang_co: {
    ten: "Cuồng Hóa Chiến Ý 🥁",
    loai: "tang_cong_pct",
    tinhScale: () => 50,
    duration: 5,
    moTa: "Tăng 50% Vật Công trong 5 hiệp."
  }
};

export function layKyNangPhapBaoActive(itemOrId, stats = null) {
  const itemId = typeof itemOrId === 'string' ? itemOrId : (itemOrId?.id || '');
  const dbActiveSkill = typeof itemOrId === 'object' ? itemOrId?.activeSkill : null;

  if (dbActiveSkill) {
    return dbActiveSkill;
  }

  const baseConfig = KYNANG_PHAPBAO_ACTIVE[itemId];
  if (baseConfig) {
    const finalSkill = { ...baseConfig };
    if (typeof baseConfig.tinhScale === 'function') {
      finalSkill.triGia = baseConfig.tinhScale(stats);
      if (finalSkill.loai === 'hon_hop') {
        finalSkill.triGiaKhien = Math.floor(finalSkill.triGia / 2);
      }
    }
    return finalSkill;
  }

  // Phân tích mã ID của 100 Pháp bảo mới: pb_[lk/tc/kd/na]_[num]
  const match = itemId.match(/^pb_(lk|tc|kd|na)_(\d+)$/);
  if (match) {
    const realm = match[1]; // 'lk', 'tc', 'kd', 'na'
    const index = parseInt(match[2], 10);

    // Chỉ số động dựa trên cảnh giới yêu cầu của Pháp Bảo
    let baseDmg = 50;
    let healPct = 5;
    let buffPct = 5;
    let duration = 2;

    if (realm === 'lk') {
      baseDmg = 50 + index;
      healPct = 5;
      buffPct = 5;
      duration = 2;
    } else if (realm === 'tc') {
      baseDmg = 120 + index * 2;
      healPct = 10;
      buffPct = 10;
      duration = 3;
    } else if (realm === 'kd') {
      baseDmg = 250 + index * 3;
      healPct = 15;
      buffPct = 15;
      duration = 3;
    } else if (realm === 'na') {
      baseDmg = 400 + index * 4;
      healPct = 20;
      buffPct = 20;
      duration = 4;
    }

    // Chọn ngẫu nhiên loại kỹ năng chủ động dựa theo ID chẵn lẻ
    const typeMod = index % 3;
    if (typeMod === 0) {
      const healingNames = ["Hồi Xuân Thuật 🌿", "Sinh Mệnh Chi Quang ❇️", "Cam Lộ Linh Quang 💧", "Thủy Vân Trị Liệu 🌊", "Mộc Linh Tiên Lộ 🍃"];
      const ten = healingNames[index % healingNames.length];
      return {
        ten,
        loai: "hoi_mau_pct",
        triGia: healPct,
        duration: 0,
        moTa: `Hồi phục ${healPct}% HP tối đa của bản thân khi vào trận.`
      };
    } else if (typeMod === 1) {
      const buffNames = ["Kim Cang Thần Lực 💪", "Hóa Thần Chi Uy 🌌", "Chân Ma Chi Nộ 👹", "Tử Khí Đông Lai 🔮", "Ngũ Hành Linh Lực 🌀"];
      const ten = buffNames[index % buffNames.length];
      return {
        ten,
        loai: "tang_cong_pct",
        triGia: buffPct,
        duration,
        moTa: `Tăng ${buffPct}% Công kích trong ${duration} hiệp đầu trận.`
      };
    } else {
      const attackNames = ["Lôi Đình Vạn Quân ⚡", "U Minh Luyện Hỏa 🔥", "Băng Thiên Tuyết Địa ❄️", "Phá Thiên Nhất Kích ☄️", "Huyền Âm Kiếm Khí 🗡️"];
      const ten = attackNames[index % attackNames.length];
      return {
        ten,
        loai: "tan_cong",
        triGia: baseDmg,
        duration: 0,
        moTa: `Gây ${baseDmg} sát thương cố định lên đối phương khi vào trận.`
      };
    }
  }

  return {
    ten: "Linh Khí Bộc Phát 💥",
    loai: "tan_cong",
    triGia: 100,
    duration: 0,
    moTa: "Gây 100 sát thương cố định khi vào trận chiến."
  };
}

export function layVatPhamDotPhaTheoCapDo(level) {
  if (level >= 1 && level <= 9) {
    return { seedId: 'hat_giong_tu_linh_thao', herbId: 'tu_linh_thao_luc', pillId: 'dan_dot_pha_1' };
  } else if (level >= 10 && level <= 12) {
    return { seedId: 'hat_giong_truc_co_thao', herbId: 'linh_thao_truc_co', pillId: 'dan_dot_pha_2' };
  } else if (level >= 13 && level <= 15) {
    return { seedId: 'hat_giong_kim_dan_hoa', herbId: 'linh_thao_kim_dan', pillId: 'dan_dot_pha_3' };
  } else if (level >= 16 && level <= 18) {
    return { seedId: 'hat_giong_nguyen_anh_qua', herbId: 'linh_thao_nguyen_anh', pillId: 'dan_dot_pha_4' };
  } else if (level >= 19 && level <= 21) {
    return { seedId: 'hat_giong_hoa_than_chi', herbId: 'linh_thao_hoa_than', pillId: 'dan_dot_pha_5' };
  } else if (level >= 22 && level <= 24) {
    return { seedId: 'hat_giong_phan_hu_dang', herbId: 'linh_thao_phan_hu', pillId: 'dan_dot_pha_6' };
  } else if (level >= 25 && level <= 27) {
    return { seedId: 'hat_giong_hop_the_lien', herbId: 'linh_thao_hop_the', pillId: 'dan_dot_pha_7' };
  } else if (level >= 28 && level <= 30) {
    return { seedId: 'hat_giong_dai_thua_qua', herbId: 'linh_thao_dai_thua', pillId: 'dan_dot_pha_8' };
  }
  return null;
}

export const PET_BLOODLINE_LABELS = {
  'LT_1': 'Hạ Phẩm ⚪',
  'TT_1': 'Hạ Phẩm ⚪',
  'ha_pham': 'Hạ Phẩm ⚪',
  'trung_pham': 'Trung Phẩm 🟢',
  'trung_pham_1': 'Trung Phẩm +1 🟢',
  'cuc_pham_0': 'Cực Phẩm +0 🔵',
  'cuc_pham_1': 'Cực Phẩm +1 🔵',
  'cuc_pham_2': 'Cực Phẩm +2 🔵',
  'tien_pham_0': 'Tiên Phẩm +0 🟣',
  'tien_pham_1': 'Tiên Phẩm +1 🟣',
  'tien_pham_2': 'Tiên Phẩm +2 🟣',
  'tien_pham_3': 'Tiên Phẩm +3 🟣',
  'tien_pham_4': 'Tiên Phẩm +4 🟣',
  'tien_pham_5': 'Tiên Phẩm +5 🟣',
  'than_pham_0': 'Thần Phẩm +0 🔴',
  'than_pham_1': 'Thần Phẩm +1 🔴',
  'than_pham_2': 'Thần Phẩm +2 🔴',
  'than_pham_3': 'Thần Phẩm +3 🔴',
  'than_pham_4': 'Thần Phẩm +4 🔴',
  'than_pham_5': 'Thần Phẩm +5 🔴'
};

export const PET_QUALITY_LABELS = PET_BLOODLINE_LABELS;

export const NEW_PET_LINEAGES = {
  'hoa_hau': {
    name: 'Dòng Hỏa Hầu',
    element: 'hoa',
    stages: {
      1: { name: 'Xích Yêu Hầu', image: 'HoaHau_1.png', passives: { vat_cong: 0.05, crit_rate: 0.03 } },
      2: { name: 'Xích Luyện Hỏa Viên', image: 'HoaHau_2.png', passives: { vat_cong: 0.10, crit_rate: 0.06 } },
      3: { name: 'Viêm Vũ Thiếu Niên', image: 'HoaHau_3.png', passives: { vat_cong: 0.15, crit_rate: 0.10, speed: 5 } },
      4: { name: 'Tề Thiên Hỏa Tôn', image: 'HoaHau_4.png', passives: { vat_cong: 0.25, crit_rate: 0.15, speed: 10 } }
    }
  },
  'bang_dieu': {
    name: 'Dòng Băng Điểu',
    element: 'thuy',
    stages: {
      1: { name: 'Băng Vũ Điểu', image: 'Bang_dieu_1.png', passives: { phap_cong: 0.05, xuyen_giap: 0.05 } },
      2: { name: 'Huyền Băng Linh Tước', image: 'Bang_dieu_2.png', passives: { phap_cong: 0.10, xuyen_giap: 0.10 } },
      3: { name: 'Băng Tuyết Vũ Cơ', image: 'Bang_dieu_3.png', passives: { phap_cong: 0.15, xuyen_giap: 0.15, speed: 5 } },
      4: { name: 'Cửu Thiên Băng Hậu', image: 'Bang_dieu_4.png', passives: { phap_cong: 0.25, xuyen_giap: 0.25, speed: 10 } }
    }
  },
  'nham_giap': {
    name: 'Dòng Nham Giáp',
    element: 'tho',
    stages: {
      1: { name: 'Nham Giáp Thú', image: 'Nham_thu_1.png', passives: { vat_phong: 0.08, phap_phong: 0.08 } },
      2: { name: 'Kim Cang Cự Thú', image: 'Nham_thu_2.png', passives: { vat_phong: 0.15, phap_phong: 0.15, giam_sat_thuong: 0.05 } },
      3: { name: 'Nham Thạch Lực Sĩ', image: 'Nham_thu_3.png', passives: { vat_phong: 0.25, phap_phong: 0.25, giam_sat_thuong: 0.10 } },
      4: { name: 'Bất Diệt Sơn Thần', image: 'Nham_thu_4.png', passives: { vat_phong: 0.40, phap_phong: 0.40, giam_sat_thuong: 0.15 } }
    }
  },
  'da_mieu': {
    name: 'Dòng Dạ Miêu',
    element: 'kim',
    stages: {
      1: { name: 'Huyễn Dạ Miêu', image: 'Da_Mieu_1.png', passives: { speed: 8, hieu_ung_cx: 0.05 } },
      2: { name: 'U Minh Huyễn Báo', image: 'Da_Mieu_2.png', passives: { speed: 15, hieu_ung_cx: 0.10 } },
      3: { name: 'Ám Dạ Thích Khách', image: 'Da_Mieu_3.png', passives: { speed: 25, hieu_ung_cx: 0.15, ne: 0.10 } },
      4: { name: 'U Minh Mộng Ma', image: 'Da_Mieu_4.png', passives: { speed: 40, hieu_ung_cx: 0.25, ne: 0.15 } }
    }
  },
  'thanh_loc': {
    name: 'Dòng Thanh Lộc',
    element: 'moc',
    stages: {
      1: { name: 'Thanh Mộc Lộc', image: 'thanh_loc_1.png', passives: { max_hp: 0.10, max_mp: 0.10 } },
      2: { name: 'Tiên Tông Thần Lộc', image: 'thanh_loc_2.png', passives: { max_hp: 0.15, max_mp: 0.15, khang_hieu_ung: 0.05 } },
      3: { name: 'Sâm Lâm Tinh Linh', image: 'thanh_loc_3.png', passives: { max_hp: 0.25, max_mp: 0.25, khang_hieu_ung: 0.15, speed: 5 } },
      4: { name: 'Dược Sư Tiên Tử', image: 'thanh_loc_4.png', passives: { max_hp: 0.40, max_mp: 0.40, khang_hieu_ung: 0.30, speed: 10 } }
    }
  }
};

export const getPetQualityIndex = (rarity) => {
  // Normalize legacy rarity values
  if (rarity === 'LT_1' || rarity === 'TT_1') rarity = 'ha_pham';
  const keys = Object.keys(PET_BLOODLINE_LABELS);
  const idx = keys.indexOf(rarity);
  return idx >= 0 ? idx : 0;
};

export const getPetTotalEvolves = (pet) => {
  if (!pet) return 0;
  const q = getPetQualityIndex(pet.rarity);
  const p = pet.tienHoa || 1;
  return q * 10 + (p - 1);
};

export const getPetLevelCap = (pet) => {
  return 31;
};

export const getPetEvolutionCost = (pet) => {
  return 0; // Bloodline tier upgrades use phach instead of stones
};

export function getPetStage(rarity) {
  if (!rarity) return 1;
  if (rarity.startsWith('than_pham')) return 4;
  if (rarity.startsWith('tien_pham')) return 3;
  if (rarity.startsWith('cuc_pham')) return 2;
  return 1;
}

export function getFormattedPetName(baseName, rarity, tienHoa, isMax) {
  // Normalize legacy rarity values
  if (rarity === 'LT_1' || rarity === 'TT_1') rarity = 'ha_pham';
  const cleanName = baseName.replace(/(\s\+\d+|\[MAX\]|\[Tiến\s*[Hh]óa\]\s*)/g, '').trim();
  if (isMax || rarity === 'than_pham_5') {
    return `${cleanName} [MAX]`;
  }
  if (tienHoa > 0 && rarity !== 'ha_pham' && rarity !== 'trung_pham' && rarity !== 'trung_pham_1') {
    return `${cleanName} +${tienHoa}`;
  }
  return cleanName;
}

export let PET_TEMPLATES = {};

export const loadPetTemplatesIntoCache = (templates) => {
  PET_TEMPLATES = {};
  for (const t of templates) {
    PET_TEMPLATES[t.id] = {
      id: t.id,
      name: `${t.name} ${t.emoji}`,
      emoji: t.emoji,
      group: t.group,
      species: t.species,
      statType: t.statType,
      statValue: t.statValue,
      desc: t.desc
    };
  }
};

export const PET_TEMPLATES_SEED = [
  { id: 'hoa_hau', name: 'Hỏa Hầu', emoji: '🐒', group: 'linh_thu', species: 'hoa_hau', statType: 'vat_cong', statValue: 0.05, desc: 'Dòng Hỏa Hầu - Sát Thương Vật Lý' },
  { id: 'bang_dieu', name: 'Băng Điểu', emoji: '🐦', group: 'linh_thu', species: 'bang_dieu', statType: 'phap_cong', statValue: 0.05, desc: 'Dòng Băng Điểu - Sát Thương Phép Thuật' },
  { id: 'nham_giap', name: 'Nham Giáp', emoji: '🛡️', group: 'linh_thu', species: 'nham_giap', statType: 'vat_phong', statValue: 0.08, desc: 'Dòng Nham Giáp - Đỡ Đòn Gánh Sát Thương' },
  { id: 'da_mieu', name: 'Dạ Miêu', emoji: '🐈', group: 'linh_thu', species: 'da_mieu', statType: 'speed', statValue: 8.0, desc: 'Dòng Dạ Miêu - Khống Chế Thao Túng' },
  { id: 'thanh_loc', name: 'Thanh Lộc', emoji: '🦌', group: 'linh_thu', species: 'thanh_loc', statType: 'max_hp', statValue: 0.10, desc: 'Dòng Thanh Lộc - Hỗ Trợ Trị Liệu' }
];

export function checkHuyetMachApChe(level, rarity) {
  return { allowed: true };
}

export function getPotentialUpgradeCost(currentPotential) {
  const upgradesCount = Math.floor((currentPotential - 100) / 10);
  return Math.floor(500 * Math.pow(1.05, upgradesCount));
}

export function getRealmIndex(level) {
  if (level >= 1 && level <= 9) return 0;
  if (level >= 10 && level <= 12) return 1;
  if (level >= 13 && level <= 15) return 2;
  if (level >= 16 && level <= 18) return 3;
  if (level >= 19 && level <= 21) return 4;
  if (level >= 22 && level <= 24) return 5;
  if (level >= 25 && level <= 27) return 6;
  if (level >= 28 && level <= 30) return 7;
  if (level >= 31) return 8;
  return 0;
}

export function getPetPassiveStats(type, stage, potential, level) {
  const lineage = NEW_PET_LINEAGES[type];
  if (!lineage) return {};
  const stageConf = lineage.stages[stage];
  if (!stageConf) return {};
  
  const potentialMult = potential / 100;
  const R = getRealmIndex(level);
  const realmMult = 1.0 + R * 0.02;
  
  const stats = {};
  for (const [stat, baseVal] of Object.entries(stageConf.passives)) {
    stats[stat] = baseVal * potentialMult * realmMult;
  }
  return stats;
}

export function getPetCurrentStats(pet) {
  if (!pet) return {};
  const stage = getPetStage(pet.rarity);
  return getPetPassiveStats(pet.type, stage, pet.tuChat, pet.level);
}

export function getPetStageSkillDescription(type, stage) {
  if (type === 'hoa_hau') {
    if (stage === 1) return 'CD 3 hiệp: Gây 120% sát thương vật lý lên 1 kẻ địch, kèm hiệu ứng [Chảy Máu] (trừ 3% HP tối đa mỗi hiệp) trong 2 hiệp.';
    if (stage === 2) return 'CD 3 hiệp: Gây 160% sát thương vật lý. [Chảy Máu] tăng lên 5% HP tối đa/hiệp.';
    if (stage === 3) return 'CD 3 hiệp: Gây 200% sát thương vật lý. Nếu mục tiêu đang bị [Chảy Máu], lập tức kích nổ toàn bộ sát thương chảy máu còn lại thành một đòn bạo kích.';
    return 'CD 3 hiệp: Gây 280% sát thương vật lý, bỏ qua 20% Vật Phòng. Nếu HP mục tiêu dưới 15% sau đòn đánh, lập tức kết liễu (Execute) kẻ địch.';
  }
  if (type === 'bang_dieu') {
    if (stage === 1) return 'CD 3 hiệp: Bắn lông vũ, gây 80% sát thương phép lên toàn bộ địch.';
    if (stage === 2) return 'CD 3 hiệp: Gây 120% sát thương phép lên toàn đội địch, có 20% tỷ lệ làm giảm 5 Tốc độ của chúng trong 2 hiệp.';
    if (stage === 3) return 'CD 3 hiệp: Gây 160% sát thương phép toàn địch. Áp đặt hiệu ứng [Tê Buốt] (giảm 15% Pháp Phòng của địch) trong 2 hiệp.';
    return 'CD 3 hiệp: Gây 220% sát thương phép toàn địch. Kẻ địch bị [Tê Buốt] sẽ chịu thêm sát thương chuẩn bằng 5% HP tối đa của chúng.';
  }
  if (type === 'nham_giap') {
    if (stage === 1) return 'CD 4 hiệp: Tạo khiên cho chủ nhân bằng 15% HP tối đa, duy trì 2 hiệp.';
    if (stage === 2) return 'CD 4 hiệp: Tạo khiên bằng 25% HP tối đa. Trong thời gian có khiên, chủ nhân miễn nhiễm 1 lần sát thương chí mạng.';
    if (stage === 3) return 'CD 4 hiệp: Tạo khiên bằng 35% HP tối đa. Hút toàn bộ đòn đánh đơn mục tiêu của phe địch về phía chủ nhân (Khiêu khích) trong 1 hiệp.';
    return 'CD 4 hiệp: Tạo khiên bằng 50% HP tối đa. Phản lại 30% sát thương nhận vào cho kẻ tấn công trong suốt thời gian tồn tại của khiên.';
  }
  if (type === 'da_mieu') {
    if (stage === 1) return 'CD 4 hiệp: Sát thương phép nhỏ lên 1 địch, 60% tỷ lệ gây [Mù] (giảm 50% trúng đích) và giảm 5 Tốc Độ trong 2 hiệp.';
    if (stage === 2) return 'CD 4 hiệp: Sát thương phép trung bình. Tăng tỷ lệ gây [Mù] lên 80% và giảm 10 Tốc Độ.';
    if (stage === 3) return 'CD 4 hiệp: Gây [Mù] chắc chắn lên 1 mục tiêu. Có 50% cơ hội đánh cắp 1 buff có lợi của địch chuyển sang cho chủ nhân.';
    return 'CD 4 hiệp: Khiến 1 mục tiêu rơi vào [Mộng Yểm] (Đóng băng/Mất lượt) trong 2 hiệp. Kẻ địch trong trạng thái này mỗi hiệp tự mất 10% MP hiện tại.';
  }
  if (type === 'thanh_loc') {
    if (stage === 1) return 'CD 3 hiệp: Hồi 10% HP/MP cho chủ nhân, xóa 1 debuff.';
    if (stage === 2) return 'CD 3 hiệp: Hồi 15% HP/MP. Xóa toàn bộ debuff đang có trên người chủ nhân.';
    if (stage === 3) return 'CD 3 hiệp: Hồi 25% HP/MP. Gắn hiệu ứng [Hồi Tô]: Cứ đầu hiệp tự hồi thêm 5% HP trong 3 hiệp tiếp theo.';
    return 'CD 4 hiệp - Tăng 1 hiệp CD: Hồi lập tức 40% HP/MP. Kích hoạt [Cải Tử Hoàn Sinh]: Nếu chủ nhân bị hạ gục trong 2 hiệp tới, lập tức sống lại với 30% HP (chỉ kích hoạt 1 lần mỗi trận).';
  }
  return '';
}

export function getBloodlineUpgradeReqs(rarity, tier, type) {
  const lineage = NEW_PET_LINEAGES[type];
  if (!lineage) return null;
  const element = lineage.element;
  
  // Normalize legacy rarity values
  if (rarity === 'LT_1' || rarity === 'TT_1') rarity = 'ha_pham';
  
  if (tier < 10) {
    let phachId = `${element}_phach_ha`;
    let count = 2;
    if (rarity === 'ha_pham') {
      phachId = `${element}_phach_ha`;
      count = 2;
    } else if (rarity === 'trung_pham') {
      phachId = `${element}_phach_ha`;
      count = 3;
    } else if (rarity === 'trung_pham_1') {
      phachId = `${element}_phach_trung`;
      count = 2;
    } else if (rarity.startsWith('cuc_pham')) {
      phachId = `${element}_phach_trung`;
      count = 3;
    } else if (rarity.startsWith('tien_pham')) {
      phachId = element === 'moc' ? 'moc_phac_thuong' : `${element}_phach_thuong`;
      count = 2;
    } else if (rarity.startsWith('than_pham')) {
      phachId = element === 'moc' ? 'moc_phac_thuong' : `${element}_phach_thuong`;
      count = 4;
    }
    
    if (phachId === 'thuy_phach_ha') phachId = 'thuy_phac_ha';
    if (phachId === 'moc_phach_thuong') phachId = 'moc_phac_thuong';

    return { type: 'minor', phachId, count, nextTier: tier + 1 };
  } else {
    let nextGrade = '';
    let potentialReq = 0;
    let copiesReq = 0;
    let phachId = '';
    let phachCount = 0;
    
    if (rarity === 'ha_pham') {
      nextGrade = 'trung_pham';
      potentialReq = 200;
      copiesReq = 1;
      phachId = `${element}_phach_ha`;
      phachCount = 10;
    } else if (rarity === 'trung_pham') {
      nextGrade = 'trung_pham_1';
      potentialReq = 500;
      copiesReq = 1;
      phachId = `${element}_phach_ha`;
      phachCount = 10;
    } else if (rarity === 'trung_pham_1') {
      nextGrade = 'cuc_pham_0';
      potentialReq = 1000;
      copiesReq = 2;
      phachId = `${element}_phach_trung`;
      phachCount = 10;
    } else if (rarity === 'cuc_pham_0') {
      nextGrade = 'cuc_pham_1';
      potentialReq = 1000;
      copiesReq = 0;
      phachId = `${element}_phach_trung`;
      phachCount = 10;
    } else if (rarity === 'cuc_pham_1') {
      nextGrade = 'cuc_pham_2';
      potentialReq = 1000;
      copiesReq = 0;
      phachId = `${element}_phach_trung`;
      phachCount = 10;
    } else if (rarity === 'cuc_pham_2') {
      nextGrade = 'tien_pham_0';
      potentialReq = 2000;
      copiesReq = 3;
      phachId = element === 'moc' ? 'moc_phac_thuong' : `${element}_phach_thuong`;
      phachCount = 10;
    } else if (rarity.startsWith('tien_pham')) {
      const currentIdx = parseInt(rarity.split('_')[2]);
      if (currentIdx < 5) {
        nextGrade = `tien_pham_${currentIdx + 1}`;
        potentialReq = 2000;
        copiesReq = 0;
        phachId = element === 'moc' ? 'moc_phac_thuong' : `${element}_phach_thuong`;
        phachCount = 10;
      } else {
        nextGrade = 'than_pham_0';
        potentialReq = 4000;
        copiesReq = 4;
        phachId = element === 'moc' ? 'moc_phac_thuong' : `${element}_phach_thuong`;
        phachCount = 10;
      }
    } else if (rarity.startsWith('than_pham')) {
      const currentIdx = parseInt(rarity.split('_')[2]);
      if (currentIdx < 5) {
        nextGrade = `than_pham_${currentIdx + 1}`;
        potentialReq = 4000;
        copiesReq = 0;
        phachId = element === 'moc' ? 'moc_phac_thuong' : `${element}_phach_thuong`;
        phachCount = 10;
      } else {
        return null;
      }
    }
    
    if (phachId === 'thuy_phach_ha') phachId = 'thuy_phac_ha';
    if (phachId === 'moc_phach_thuong') phachId = 'moc_phac_thuong';

    return { type: 'major', nextGrade, potentialReq, copiesReq, phachId, phachCount, nextTier: 1 };
  }
}

export function formatFusedStats(fusedStats) {
  return '';
}


export async function tangLuongDuyen(userId1, userId2, delta = 1) {
  const { PlayerAffinity } = await import('./models/PlayerAffinity.js');
  const id1 = String(userId1) < String(userId2) ? userId1 : userId2;
  const id2 = String(userId1) < String(userId2) ? userId2 : userId1;
  let record = await PlayerAffinity.findOne({
    where: { userIdA: id1, userIdB: id2 }
  });
  if (!record) {
    record = await PlayerAffinity.create({
      userIdA: id1,
      userIdB: id2,
      points: 0
    });
  }
  record.points += delta;
  await record.save();
  return record.points;
}

export async function layLuongDuyen(userId1, userId2) {
  const { PlayerAffinity } = await import('./models/PlayerAffinity.js');
  const id1 = String(userId1) < String(userId2) ? userId1 : userId2;
  const id2 = String(userId1) < String(userId2) ? userId2 : userId1;
  const record = await PlayerAffinity.findOne({
    where: { userIdA: id1, userIdB: id2 }
  });
  return record ? record.points : 0;
}

export function taiLapChiSoPhu(dongChiSoJson, itemDetail) {
  const loai = itemDetail.loai;
  const POOLS = {
    "Vũ khí": ["vat_cong", "phap_cong", "crit_rate", "crit_dmg", "xuyen_giap"],
    "Giáp": ["vat_phong", "phap_phong", "max_mp", "max_hp"],
    "Ngọc Bội": ["max_hp", "max_mp", "ne", "lifesteal", "speed"],
    "Cổ Bảo Chủ Động": ["vat_cong", "phap_cong", "vat_phong", "phap_phong", "max_hp", "max_mp", "ne", "lifesteal", "speed"],
    "Pháp Bảo": [
      "vat_cong", "phap_cong", "vat_phong", "phap_phong", "max_hp", "max_mp", "ne", "lifesteal",
      "crit_rate_pb", "crit_dmg_pb", "sat_thuong_pb", "phap_thuong_pb", "khien_pb", "speed"
    ]
  };

  const pool = POOLS[loai];
  if (!pool) return null;

  let currentLines = [];
  let phamChatTrangBi = null;
  let chiSoChinhMult = 1.0;

  try {
    if (dongChiSoJson) {
      const parsed = JSON.parse(dongChiSoJson);
      if (Array.isArray(parsed)) {
        const meta = parsed.find(x => x && x.metadata);
        if (meta) {
          phamChatTrangBi = meta.phamChatTrangBi;
          chiSoChinhMult = meta.chiSoChinhMult;
        }
        currentLines = parsed.filter(x => x && !x.metadata);
      }
    }
  } catch (e) {}

  if (!Array.isArray(currentLines)) {
    currentLines = [];
  }

  // 1. Giữ nguyên số dòng phụ và có 10% khả năng tăng thêm dòng phụ (tối đa 5 dòng)
  let targetCount = currentLines.length;
  if (targetCount < 5 && Math.random() <= 0.10) {
    targetCount += 1;
  }
  if (targetCount === 0) targetCount = 1;

  // 2. Xác định phẩm chất cuối cùng cho từng dòng phụ
  const QUALITIES = [
    { name: "Phế Phẩm", color: "trang", min: -5, max: 0 },
    { name: "Thường", color: "luc", min: 0, max: 5 },
    { name: "Hiếm", color: "xanh", min: 5, max: 10 },
    { name: "Sử Thi", color: "tim", min: 10, max: 15 },
    { name: "Thần Thoại", color: "cam", min: 15, max: 20 },
    { name: "Nghịch Thiên", color: "do", min: 20, max: 25 }
  ];

  const getQualityIndex = (name) => {
    return QUALITIES.findIndex(q => q.name.toLowerCase() === name.toLowerCase());
  };

  let maxQualityName = 'Thần Thoại';
  if (itemDetail.yeuCauCanhGioi >= 13) {
    const eqQ = phamChatTrangBi || 'Thường';
    if (eqQ === 'Phế Phẩm') maxQualityName = 'Thường';
    else if (eqQ === 'Thường') maxQualityName = 'Hiếm';
    else if (eqQ === 'Hiếm') maxQualityName = 'Sử Thi';
    else if (eqQ === 'Sử Thi') maxQualityName = 'Thần Thoại';
    else if (eqQ === 'Thần Thoại') maxQualityName = 'Nghịch Thiên';
  }
  const maxQIdx = getQualityIndex(maxQualityName);

  const finalQualities = [];
  for (let i = 0; i < targetCount; i++) {
    let qIdx = 0;
    if (i < currentLines.length) {
      const currentQName = currentLines[i].phamChat || "Phế Phẩm";
      qIdx = getQualityIndex(currentQName);
      if (qIdx === -1) qIdx = 0;

      if (qIdx < maxQIdx && maxQIdx !== -1) {
        if (qIdx === 4) {
          if (Math.random() <= 0.01) {
            qIdx = 5;
          }
        } else {
          if (Math.random() <= 0.10) {
            qIdx += 1;
          }
        }
      }
    } else {
      const rand = Math.random();
      if (rand < 0.05) qIdx = 4;
      else if (rand < 0.20) qIdx = 3;
      else if (rand < 0.50) qIdx = 2;
      else if (rand < 0.85) qIdx = 1;
      else qIdx = 0;

      if (qIdx > maxQIdx && maxQIdx !== -1) {
        qIdx = maxQIdx;
      }
    }
    finalQualities.push(QUALITIES[qIdx]);
  }

  // 3. Tái lập ngẫu nhiên thuộc tính
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selectedStats = shuffled.slice(0, Math.min(targetCount, pool.length));

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
    "khien_pb": "Hộẫn Hấp thụ Pháp bảo",
    "speed": "Tốc độ"
  };

  const newLines = [];
  if (phamChatTrangBi) {
    newLines.push({ metadata: true, phamChatTrangBi, chiSoChinhMult });
  }

  for (let i = 0; i < selectedStats.length; i++) {
    const stat = selectedStats[i];
    const q = finalQualities[i];
    const value = parseFloat((q.min + Math.random() * (q.max - q.min)).toFixed(1));
    newLines.push({
      thuocTinh: stat,
      ten: NAME_MAP[stat] || stat,
      mau: q.color,
      phamChat: q.name,
      phanTram: value
    });
  }

  return newLines;
}

export function handlePetCombatSkill(pet, petState, ownerStats, opponentStats, battleLogs, ownerName, opponentName, currentOpponentBleed = false) {
  if (!pet) return null;
  const stage = getPetStage(pet.rarity);
  const lineage = NEW_PET_LINEAGES[pet.type];
  if (!lineage) return null;
  const stageConf = lineage.stages[stage];
  const petName = stageConf ? stageConf.name : pet.name;
  
  if (petState.cooldown > 0) {
    petState.cooldown -= 1;
    return null;
  }
  
  // Set CD
  const cd = (pet.type === 'nham_giap' || pet.type === 'da_mieu' || (pet.type === 'thanh_loc' && stage === 4)) ? 4 : 3;
  petState.cooldown = cd;
  
  const result = {
    petName,
    damage: 0,
    damageType: 'physical',
    healHp: 0,
    healMp: 0,
    shield: 0,
    debuffsToRemove: false,
    applyBleed: false,
    applyBlind: false,
    applySlow: false,
    applyTebut: false,
    applyNightmare: false,
    applyHoito: false,
    applyCaituhoansinh: false,
    stealBuff: false,
    critImmune: false,
    reflectDmg: false,
    execute: false,
    log: ''
  };

  if (pet.type === 'hoa_hau') {
    result.damageType = 'physical';
    if (stage === 1) {
      result.damage = Math.floor(ownerStats.vat_cong * 1.2);
      result.applyBleed = { turns: 2, dmg: Math.max(1, Math.floor(opponentStats.max_hp * 0.03)) };
      result.log = `🐒 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** thi triển kỹ năng, vung trảo gây \`${result.damage.toLocaleString()}\` sát thương vật lý lên **${opponentName}** và khắc sâu hiệu ứng [Chảy Máu] (trừ 3% HP tối đa mỗi hiệp) trong 2 hiệp.`;
    } else if (stage === 2) {
      result.damage = Math.floor(ownerStats.vat_cong * 1.6);
      result.applyBleed = { turns: 2, dmg: Math.max(1, Math.floor(opponentStats.max_hp * 0.05)) };
      result.log = `🐒 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** thi triển kỹ năng, hóa thành cự viên đấm mạnh gây \`${result.damage.toLocaleString()}\` sát thương vật lý lên **${opponentName}** và gây [Chảy Máu] cực đại (trừ 5% HP tối đa mỗi hiệp) trong 2 hiệp.`;
    } else if (stage === 3) {
      result.damage = Math.floor(ownerStats.vat_cong * 2.0);
      if (currentOpponentBleed && currentOpponentBleed.turns > 0) {
        const explodeDmg = Math.floor(currentOpponentBleed.turns * currentOpponentBleed.dmg * 1.5);
        result.damage += explodeDmg;
        result.clearBleed = true;
        result.log = `🐒 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** kích nổ ấn ký [Chảy Máu] trên người **${opponentName}**, gây tổng cộng \`${result.damage.toLocaleString()}\` sát thương bạo kích vật lý!`;
      } else {
        result.log = `🐒 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** vung gậy chém mạnh gây \`${result.damage.toLocaleString()}\` sát thương vật lý lên **${opponentName}**.`;
      }
    } else if (stage === 4) {
      result.damage = Math.floor(ownerStats.vat_cong * 2.8);
      result.ignoreDef = 0.20;
      result.execute = true;
      result.log = `🐒 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** vung thiết bổng bỏ qua 20% Vật Phòng, gây \`${result.damage.toLocaleString()}\` sát thương vật lý lên **${opponentName}**.`;
    }
  } else if (pet.type === 'bang_dieu') {
    result.damageType = 'magic';
    if (stage === 1) {
      result.damage = Math.floor(ownerStats.phap_cong * 0.8);
      result.log = `🐦 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** bắn lông vũ băng giá gây \`${result.damage.toLocaleString()}\` sát thương phép lên **${opponentName}**.`;
    } else if (stage === 2) {
      result.damage = Math.floor(ownerStats.phap_cong * 1.2);
      if (Math.random() <= 0.20) {
        result.applySlow = { turns: 2, amount: 5 };
        result.log = `🐦 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** oanh kích gây \`${result.damage.toLocaleString()}\` sát thương phép lên **${opponentName}** và làm giảm 5 Tốc độ của đối thủ trong 2 hiệp.`;
      } else {
        result.log = `🐦 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** oanh kích gây \`${result.damage.toLocaleString()}\` sát thương phép lên **${opponentName}**.`;
      }
    } else if (stage === 3) {
      result.damage = Math.floor(ownerStats.phap_cong * 1.6);
      result.applyTebut = { turns: 2 };
      result.log = `🐦 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** dội bão tuyết gây \`${result.damage.toLocaleString()}\` sát thương phép lên **${opponentName}** và áp đặt [Tê Buốt] (giảm 15% Pháp Phòng) trong 2 hiệp.`;
    } else if (stage === 4) {
      result.damage = Math.floor(ownerStats.phap_cong * 2.2);
      result.checkTebutBonus = true;
      result.log = `🐦 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** giải phóng băng phong gây \`${result.damage.toLocaleString()}\` sát thương phép lên **${opponentName}**.`;
    }
  } else if (pet.type === 'nham_giap') {
    if (stage === 1) {
      result.shield = Math.floor(ownerStats.max_hp * 0.15);
      result.shieldTurns = 2;
      result.log = `🛡️ **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** tạo lá chắn đá tảng hấp thụ \`${result.shield.toLocaleString()}\` sát thương trong 2 hiệp.`;
    } else if (stage === 2) {
      result.shield = Math.floor(ownerStats.max_hp * 0.25);
      result.shieldTurns = 99;
      result.critImmune = true;
      result.log = `🛡️ **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** tạo lá chắn kim cang \`${result.shield.toLocaleString()}\` HP, giúp chủ nhân miễn nhiễm sát thương chí mạng khi còn khiên!`;
    } else if (stage === 3) {
      result.shield = Math.floor(ownerStats.max_hp * 0.35);
      result.shieldTurns = 99;
      result.provoke = true;
      result.log = `🛡️ **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** tạo khiên nham thạch \`${result.shield.toLocaleString()}\` HP và khiêu khích đối thủ gánh mọi đòn đánh đơn mục tiêu.`;
    } else if (stage === 4) {
      result.shield = Math.floor(ownerStats.max_hp * 0.50);
      result.shieldTurns = 99;
      result.reflectDmg = true;
      result.log = `🛡️ **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** tạo thần trận giáp sơn thần \`${result.shield.toLocaleString()}\` HP và phản 30% sát thương nhận vào!`;
    }
  } else if (pet.type === 'da_mieu') {
    result.damageType = 'magic';
    if (stage === 1) {
      result.damage = Math.floor(ownerStats.phap_cong * 0.5);
      if (Math.random() <= 0.60) {
        result.applyBlind = { turns: 2 };
        result.applySlow = { turns: 2, amount: 5 };
        result.log = `🐈 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** cào nhẹ gây \`${result.damage.toLocaleString()}\` sát thương phép lên **${opponentName}**, gây [Mù] (giảm 50% trúng đích) và giảm 5 Tốc độ trong 2 hiệp.`;
      } else {
        result.log = `🐈 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** cào nhẹ gây \`${result.damage.toLocaleString()}\` sát thương phép lên **${opponentName}**.`;
      }
    } else if (stage === 2) {
      result.damage = Math.floor(ownerStats.phap_cong * 1.0);
      if (Math.random() <= 0.80) {
        result.applyBlind = { turns: 2 };
        result.applySlow = { turns: 2, amount: 10 };
        result.log = `🐈 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** vồ tới gây \`${result.damage.toLocaleString()}\` sát thương phép lên **${opponentName}**, gây [Mù] mạnh và giảm 10 Tốc độ trong 2 hiệp.`;
      } else {
        result.log = `🐈 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** vồ tới gây \`${result.damage.toLocaleString()}\` sát thương phép lên **${opponentName}**.`;
      }
    } else if (stage === 3) {
      result.applyBlind = { turns: 2 };
      if (Math.random() <= 0.50) {
        result.stealBuff = true;
        result.log = `🐈 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** cướp ảnh huyền bí gây [Mù] tuyệt đối lên **${opponentName}** và đánh cắp 1 hiệu ứng có lợi của họ!`;
      } else {
        result.log = `🐈 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** gây [Mù] tuyệt đối lên **${opponentName}**.`;
      }
    } else if (stage === 4) {
      result.applyNightmare = { turns: 2 };
      result.log = `🐈 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** mở ác mộng khiến **${opponentName}** dính [Mộng Yểm] (Mất lượt và mất 10% MP đầu hiệp) trong 2 hiệp!`;
    }
  } else if (pet.type === 'thanh_loc') {
    if (stage === 1) {
      result.healHp = Math.floor(ownerStats.max_hp * 0.10);
      result.healMp = Math.floor(ownerStats.max_mp * 0.10);
      result.debuffsToRemove = 'one';
      result.log = `🦌 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** tỏa lục quang hồi phục \`${result.healHp.toLocaleString()}\` HP, \`${result.healMp.toLocaleString()}\` MP và xóa bỏ 1 bất lợi.`;
    } else if (stage === 2) {
      result.healHp = Math.floor(ownerStats.max_hp * 0.15);
      result.healMp = Math.floor(ownerStats.max_mp * 0.15);
      result.debuffsToRemove = 'all';
      result.log = `🦌 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** rung sừng ngọc hồi phục \`${result.healHp.toLocaleString()}\` HP, \`${result.healMp.toLocaleString()}\` MP và hóa giải toàn bộ debuff!`;
    } else if (stage === 3) {
      result.healHp = Math.floor(ownerStats.max_hp * 0.25);
      result.healMp = Math.floor(ownerStats.max_mp * 0.25);
      result.applyHoito = { turns: 3 };
      result.log = `🦌 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** hồi \`${result.healHp.toLocaleString()}\` HP, \`${result.healMp.toLocaleString()}\` MP và kích hoạt [Hồi Tô] (tự hồi 5% HP mỗi lượt) trong 3 hiệp tiếp theo.`;
    } else if (stage === 4) {
      result.healHp = Math.floor(ownerStats.max_hp * 0.40);
      result.healMp = Math.floor(ownerStats.max_mp * 0.40);
      result.applyCaituhoansinh = { turns: 2 };
      result.log = `🦌 **Linh Thú Hộ Thể**: **${petName}** của **${ownerName}** hồi phục mạnh \`${result.healHp.toLocaleString()}\` HP, \`${result.healMp.toLocaleString()}\` MP và ban trạng thái bảo mệnh [Cải Tử Hoàn Sinh] trong 2 hiệp!`;
    }
  }
  
  return result;
}




