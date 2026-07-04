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

// ==========================================
// THÔNG TIN VẬT PHẨM MẪU (ITEMS)
// ==========================================
export const ITEMS = [
  // ==================== NGUYÊN LIỆU & ĐAN DƯỢC ĐỘT PHÁ ====================
  { id: 'hat_giong_luyen_khi_thao', ten: 'Hạt Giống Luyện Khí Thảo 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Hạt giống Luyện Khí Thảo, gieo trồng tại dược viên.', emoji: '<:hat_giong:1522644602266456275>' },
  { id: 'linh_thao_luyen_khi', ten: 'Luyện Khí Thảo 🌿', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh thảo hấp thu khí thiên địa sơ khởi, nguyên liệu luyện chế Luyện Khí Phá Cảnh Đan.', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'dan_dot_pha_1', ten: 'Luyện Khí Phá Cảnh Đan 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Đan dược hỗ trợ đột phá cảnh giới Luyện Khí.', emoji: '<:dan_dotpha:1522644600030756947>' },

  { id: 'hat_giong_truc_co_thao', ten: 'Hạt Giống Trúc Cơ Thảo 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Hạt giống Trúc Cơ Thảo, gieo trồng tại dược viên.', emoji: '<:hat_giong:1522644602266456275>' },
  { id: 'linh_thao_truc_co', ten: 'Trúc Cơ Thảo 🌿', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Thảo dược ngưng tụ linh lực làm nền móng nhục thân, nguyên liệu luyện chế Trúc Cơ Phá Cảnh Đan.', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'dan_dot_pha_2', ten: 'Trúc Cơ Phá Cảnh Đan 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Đan dược hỗ trợ đột phá cảnh giới Trúc Cơ.', emoji: '<:dan_dotpha:1522644600030756947>' },

  { id: 'hat_giong_kim_dan_hoa', ten: 'Hạt Giống Kim Đan Hoa 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Hạt giống Kim Đan Hoa, gieo trồng tại dược viên.', emoji: '<:hat_giong:1522644602266456275>' },
  { id: 'linh_thao_kim_dan', ten: 'Kim Đan Hoa 🌸', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Kỳ hoa ngưng kết lực quy nhất nội đan, nguyên liệu luyện chế Kim Đan Phá Cảnh Đan.', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'dan_dot_pha_3', ten: 'Kim Đan Phá Cảnh Đan 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Đan dược hỗ trợ đột phá cảnh giới Kim Đan.', emoji: '<:dan_dotpha:1522644600030756947>' },

  { id: 'hat_giong_nguyen_anh_qua', ten: 'Hạt Giống Nguyên Anh Quả 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 16, moTa: 'Hạt giống Nguyên Anh Linh Quả, gieo trồng tại dược viên.', emoji: '<:hat_giong:1522644602266456275>' },
  { id: 'linh_thao_nguyen_anh', ten: 'Nguyên Anh Linh Quả 🍒', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 16, moTa: 'Linh quả dựng dục nguyên thần anh nhi linh phách, nguyên liệu luyện chế Nguyên Anh Phá Cảnh Đan.', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'dan_dot_pha_4', ten: 'Nguyên Anh Phá Cảnh Đan 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 16, moTa: 'Đan dược hỗ trợ đột phá cảnh giới Nguyên Anh.', emoji: '<:dan_dotpha:1522644600030756947>' },

  { id: 'hat_giong_hoa_than_chi', ten: 'Hạt Giống Hóa Thần Chi 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 19, moTa: 'Hạt giống Hóa Thần Chi, gieo trồng tại dược viên.', emoji: '<:hat_giong:1522644602266456275>' },
  { id: 'linh_thao_hoa_than', ten: 'Hóa Thần Chi 🍄', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 19, moTa: 'Nấm thiêng dung hòa thân thần thức tỉnh ngộ đạo, nguyên liệu luyện chế Hóa Thần Phá Cảnh Đan.', emoji: '<:linh_chi:1522610150853316778>' },
  { id: 'dan_dot_pha_5', ten: 'Hóa Thần Phá Cảnh Đan 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 19, moTa: 'Đan dược hỗ trợ đột phá cảnh giới Hóa Thần.', emoji: '<:dan_dotpha:1522644600030756947>' },

  { id: 'hat_giong_phan_hu_dang', ten: 'Hạt Giống Phản Hư Đằng 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 22, moTa: 'Hạt giống Phản Hư Đằng, gieo trồng tại dược viên.', emoji: '<:hat_giong:1522644602266456275>' },
  { id: 'linh_thao_phan_hu', ten: 'Phản Hư Đằng 🍀', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 22, moTa: 'Dây leo cổ linh ngưng tụ pháp thân thoát ly trần thế, nguyên liệu luyện chế Phản Hư Phá Cảnh Đan.', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'dan_dot_pha_6', ten: 'Phản Hư Phá Cảnh Đan 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 22, moTa: 'Đan dược hỗ trợ đột phá cảnh giới Phản Hư.', emoji: '<:dan_dotpha:1522644600030756947>' },

  { id: 'hat_giong_hop_the_lien', ten: 'Hạt Giống Hợp Thể Liên 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 25, moTa: 'Hạt giống Hợp Thể Liên, gieo trồng tại dược viên.', emoji: '<:hat_giong:1522644602266456275>' },
  { id: 'linh_thao_hop_the', ten: 'Hợp Thể Liên 💮', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 25, moTa: 'Tòa sen hợp nhất nguyên thần và nhục thân hoàn mỹ, nguyên liệu luyện chế Hợp Thể Phá Cảnh Đan.', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'dan_dot_pha_7', ten: 'Hợp Thể Phá Cảnh Đan 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 25, moTa: 'Đan dược hỗ trợ đột phá cảnh giới Hợp Thể.', emoji: '<:dan_dotpha:1522644600030756947>' },

  { id: 'hat_giong_dai_thua_qua', ten: 'Hạt Giống Đại Thừa Quả 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 28, moTa: 'Hạt giống Đại Thừa Tinh Quả, gieo trồng tại dược viên.', emoji: '<:hat_giong:1522644602266456275>' },
  { id: 'linh_thao_dai_thua', ten: 'Đại Thừa Tinh Quả 🍇', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 28, moTa: 'Quả chín ngưng tụ thiên đạo quy nguyên phi thăng chi cơ, nguyên liệu luyện chế Đại Thừa Phá Cảnh Đan.', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'dan_dot_pha_8', ten: 'Đại Thừa Phá Cảnh Đan 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 28, moTa: 'Đan dược hỗ trợ đột phá cảnh giới Đại Thừa.', emoji: '<:dan_dotpha:1522644600030756947>' },

  // ==================== CẢNH GIỚI: LUYỆN KHÍ (YÊU CẦU CẤP 1) ====================
  // Vũ khí Thể Tu
  { id: 'kiem_go', ten: 'Kiếm Gỗ 🪵', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{"vat_cong":10}', yeuCauCanhGioi: 1, moTa: 'Thanh kiếm gỗ thô sơ cho tân thủ.', emoji: '<:kiem:1522610147569041419>' },
  { id: 'kiem_tien_tan_thu', ten: 'Tân Thủ Tiên Kiếm 🗡️', loai: 'Vũ khí', doHiem: 'Cực hiếm', giaCoSo: 1000, chiSoJson: '{"vat_cong":35}', yeuCauCanhGioi: 1, moTa: 'Thần binh rớt từ thượng giới dành cho tân thủ Luyện Khí.', emoji: '<:kiem:1522610147569041419>' },

  // Vũ khí Pháp Tu
  { id: 'truong_go', ten: 'Mộc Trượng 🪵', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{"phap_cong":10}', yeuCauCanhGioi: 1, moTa: 'Khúc gỗ dẫn linh khí thô sơ.', emoji: '<:truong_phep:1522629314653458472>' },
  { id: 'truong_tien_tan_thu', ten: 'Tân Thủ Linh Trượng 🎋', loai: 'Vũ khí', doHiem: 'Cực hiếm', giaCoSo: 1000, chiSoJson: '{"phap_cong":35}', yeuCauCanhGioi: 1, moTa: 'Linh trượng ban tặng cho tân thủ Luyện Khí có tư chất cực tốt.', emoji: '<:truong_phep:1522629314653458472>' },

  // Giáp
  { id: 'ao_vai', ten: 'Đạo Bào Vải 🥋', loai: 'Giáp', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{"vat_phong":5,"phap_phong":5,"hp":50}', yeuCauCanhGioi: 1, moTa: 'Áo vải đệ tử mặc hàng ngày.', emoji: '<:ao:1522624070741524530>' },
  { id: 'giap_tien_tan_thu', ten: 'Tân Thủ Tiên Giáp 🥋', loai: 'Giáp', doHiem: 'Cực hiếm', giaCoSo: 1000, chiSoJson: '{"vat_phong":20,"phap_phong":20,"hp":200}', yeuCauCanhGioi: 1, moTa: 'Linh giáp phòng ngự hộ thể hoàn mỹ cho tân thủ Luyện Khí.', emoji: '<:ao:1522624070741524530>' },

  // Đan dược / Thảo dược
  { id: 'nguyen_lieu_luyen_khi', ten: 'Luyện Khí Thạch 💎', loai: 'Nguyên liệu', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh thạch sơ cấp chứa ít linh khí dùng để rèn đúc trang bị Luyện Khí.', emoji: '💎' },
  { id: 'nguyen_lieu_truc_co', ten: 'Huyền Thiết Thạch 🪙', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 250, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Quặng huyền thiết thô ráp, cứng cáp dẻo dai dùng để rèn đúc trang bị Trúc Cơ.', emoji: '🪙' },
  { id: 'nguyen_lieu_kim_dan', ten: 'Kim Đan Linh Sa 🪨', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 13, moTa: 'Linh sa huyền ảo hội tụ đan hỏa linh khí dùng để rèn đúc trang bị Kim Đan.', emoji: '🪨' },
  { id: 'nguyen_lieu_nguyen_anh', ten: 'Nguyên Anh Hỏa Tinh ☄️', loai: 'Nguyên liệu', doHiem: 'Hiếm', giaCoSo: 750, chiSoJson: '{}', yeuCauCanhGioi: 16, moTa: 'Hỏa linh thể ngưng kết chứa linh quang ấm áp dùng để rèn đúc trang bị Nguyên Anh.', emoji: '☄️' },
  { id: 'nguyen_lieu_hoa_than', ten: 'Thần Ma Chi Tinh ✨', loai: 'Nguyên liệu', doHiem: 'Cực hiếm', giaCoSo: 1250, chiSoJson: '{}', yeuCauCanhGioi: 19, moTa: 'Tinh hạch rực rỡ mang sức mạnh chuyển đổi hỗn độn dùng để rèn đúc trang bị Hóa Thần.', emoji: '✨' },
  { id: 'chuyen_sinh_dan', ten: 'Chuyển Sinh Đan 🌀', loai: 'Đan dược', doHiem: 'Huyền thoại', giaCoSo: 9999999, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Đan dược chí tôn thượng cổ. Khi sử dụng sẽ khởi động LUÂN HỒI CHUYỂN SINH, xóa bỏ hoàn toàn tất cả dữ liệu tu tiên từ trước tới nay của đạo hữu (Nhân vật, túi đồ, sủng vật, động phủ...) để bắt đầu một kiếp sống mới! Cần CỰC KỲ CÂN NHẮC trước khi dùng.', emoji: '🌀' },
  { id: 'dan_hp_1', ten: 'Bổ Huyết Đan (Sơ) 💊', loai: 'Đan dược', doHiem: 'Thường', giaCoSo: 50, chiSoJson: '{"hp_hoi":100}', yeuCauCanhGioi: 1, moTa: 'Phục hồi 100 điểm khí huyết (HP) bị tổn thương.', emoji: '<:dan_hp:1522644612605411379>' },
  { id: 'dan_mp_1', ten: 'Hồi Thần Đan (Sơ) 💧', loai: 'Đan dược', doHiem: 'Thường', giaCoSo: 50, chiSoJson: '{"mp_hoi":50}', yeuCauCanhGioi: 1, moTa: 'Khôi phục 50 điểm linh lực pháp hải (MP).', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'linh_chi', ten: 'U Minh Linh Chi 🍄', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 30, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh thảo chứa ít linh khí mọc nơi ẩm ướt.', emoji: '<:linh_chi:1522610150853316778>' },

  // ==================== CẢNH GIỚI: TRÚC CƠ (YÊU CẦU CẤP 10) ====================
  // Vũ khí Thể Tu
  { id: 'kiem_sat_nang', ten: 'Trọng Thiết Thiết Kiếm ⚔️', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 300, chiSoJson: '{"vat_cong":25}', yeuCauCanhGioi: 10, moTa: 'Thiết kiếm đúc nặng nề, chỉ có tu sĩ Trúc Cơ trở lên mới đủ lực nhấc.', emoji: '<:kiem:1522610147569041419>' },
  { id: 'kiem_sat', ten: 'Thiết Kiếm ⚔️', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{"vat_cong":30}', yeuCauCanhGioi: 10, moTa: 'Kiếm sắt rèn đúc kỹ lưỡng, sắc bén sắc lạnh.', emoji: '<:kiem:1522610147569041419>' },

  // Vũ khí Pháp Tu
  { id: 'truong_truc_thuong', ten: 'Phàm Trúc Trượng 🪵', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 300, chiSoJson: '{"phap_cong":25}', yeuCauCanhGioi: 10, moTa: 'Khúc trúc già tầm thường nhưng dẫn linh khí khá tốt.', emoji: '<:truong_phep:1522629314653458472>' },
  { id: 'truong_truc', ten: 'Trúc Trượng 🎋', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{"phap_cong":30}', yeuCauCanhGioi: 10, moTa: 'Tương truyền làm bằng Linh Trúc ngàn năm, tương thích pháp lực rất tốt.', emoji: '<:truong_phep:1522629314653458472>' },

  // Giáp
  { id: 'ao_vai_day', ten: 'Đạo Bào Vải Dày 🥋', loai: 'Giáp', doHiem: 'Thường', giaCoSo: 300, chiSoJson: '{"vat_phong":10,"phap_phong":10,"hp":100}', yeuCauCanhGioi: 10, moTa: 'Áo vải nhiều lớp gia cố bảo vệ tu sĩ Trúc Cơ.', emoji: '<:ao:1522624070741524530>' },
  { id: 'ao_da', ten: 'Thú Bì Giáp 🛡️', loai: 'Giáp', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{"vat_phong":15,"phap_phong":15,"hp":150}', yeuCauCanhGioi: 10, moTa: 'Giáp làm bằng da thú yêu cấp thấp, dẻo dai bảo vệ cơ thể.', emoji: '<:ao:1522624070741524530>' },

  // Đan dược / Thảo dược
  { id: 'dan_hp_2', ten: 'Bổ Huyết Đan (Trung) 🧪', loai: 'Đan dược', doHiem: 'Hiếm', giaCoSo: 200, chiSoJson: '{"hp_hoi":500}', yeuCauCanhGioi: 10, moTa: 'Phục hồi 500 điểm khí huyết (HP) bị tổn thương.', emoji: '<:dan_hp:1522644612605411379>' },
  { id: 'dan_mp_2', ten: 'Hồi Thần Đan (Trung) 🌊', loai: 'Đan dược', doHiem: 'Hiếm', giaCoSo: 200, chiSoJson: '{"mp_hoi":200}', yeuCauCanhGioi: 10, moTa: 'Khôi phục 200 điểm linh lực pháp hải (MP).', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'nhan_sam', ten: 'Tuyết Sơn Nhân Sâm 🥕', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 120, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Nhân sâm ngàn năm thu hoạch trên đỉnh núi tuyết hoang lạnh.', emoji: '<:thuoc:1522632141698105354>' },

  // ==================== CẢNH GIỚI: KIM ĐAN (YÊU CẦU CẤP 13) ====================
  // Vũ khí Thể Tu
  { id: 'kiem_kim_dan_thuong', ten: 'Đan Hỏa Thiết Kiếm 🗡️', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{"vat_cong":40}', yeuCauCanhGioi: 13, moTa: 'Thanh kiếm đúc từ sắt thường tẩm đan hỏa lực.', emoji: '<:kiem:1522610147569041419>' },
  { id: 'kiem_kim_dan', ten: 'Kim Đan Chân Kiếm 🗡️', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 1000, chiSoJson: '{"vat_cong":55}', yeuCauCanhGioi: 13, moTa: 'Kiếm linh chứa đan khí cuồn cuộn.', emoji: '<:kiem:1522610147569041419>' },

  // Vũ khí Pháp Tu
  { id: 'truong_kim_dan_thuong', ten: 'Kim Đan Tiên Trượng 🎋', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{"phap_cong":40}', yeuCauCanhGioi: 13, moTa: 'Linh trượng làm từ trúc già ngấm dược khí.', emoji: '<:truong_phep:1522629314653458472>' },
  { id: 'truong_kim_dan', ten: 'Đan Linh Pháp Trượng 🎋', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 1000, chiSoJson: '{"phap_cong":55}', yeuCauCanhGioi: 13, moTa: 'Pháp trượng ngưng tụ đan vân pháp bảo.', emoji: '<:truong_phep:1522629314653458472>' },

  // Giáp
  { id: 'ao_kim_dan_thuong', ten: 'Đan Vân Bào 🥋', loai: 'Giáp', doHiem: 'Thường', giaCoSo: 600, chiSoJson: '{"vat_phong":20,"phap_phong":20,"hp":200}', yeuCauCanhGioi: 13, moTa: 'Y phục đơn giản tơ lụa thêu hoa văn đan vân.', emoji: '<:ao:1522624070741524530>' },
  { id: 'ao_kim_dan', ten: 'Kim Đan Pháp Y 🥋', loai: 'Giáp', doHiem: 'Hiếm', giaCoSo: 1000, chiSoJson: '{"vat_phong":30,"phap_phong":30,"hp":300}', yeuCauCanhGioi: 13, moTa: 'Pháp y hộ thân hộ mệnh khí hải.', emoji: '<:ao:1522624070741524530>' },

  // ==================== CẢNH GIỚI: NGUYÊN ANH (YÊU CẦU CẤP 16) ====================
  // Vũ khí Thể Tu
  { id: 'kiem_nguyen_anh_thuong', ten: 'Sơn Hà Trọng Kiếm 🗡️', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 1000, chiSoJson: '{"vat_cong":50}', yeuCauCanhGioi: 16, moTa: 'Thanh kiếm nặng đúc từ sắt thiên thạch sơn hà.', emoji: '<:kiem:1522610147569041419>' },
  { id: 'kiem_nguyen_anh', ten: 'Nguyên Anh Phá Thiên Kiếm 🗡️', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 1800, chiSoJson: '{"vat_cong":75}', yeuCauCanhGioi: 16, moTa: 'Chân kiếm phá thiên khai thiên tích địa.', emoji: '<:kiem:1522610147569041419>' },

  // Vũ khí Pháp Tu
  { id: 'truong_nguyen_anh_thuong', ten: 'Dục Hỏa Linh Trượng ⚡', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 1000, chiSoJson: '{"phap_cong":50}', yeuCauCanhGioi: 16, moTa: 'Gậy gỗ rực lửa chứa lôi hỏa.', emoji: '<:truong_phep:1522629314653458472>' },
  { id: 'truong_nguyen_anh', ten: 'Nguyên Thần Tiên Trượng ⚡', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 1800, chiSoJson: '{"phap_cong":75}', yeuCauCanhGioi: 16, moTa: 'Linh trượng tẩm nguyên thần linh quang.', emoji: '<:truong_phep:1522629314653458472>' },

  // Giáp
  { id: 'ao_nguyen_anh_thuong', ten: 'Tiêu Dao Linh Bào 🥋', loai: 'Giáp', doHiem: 'Thường', giaCoSo: 1000, chiSoJson: '{"vat_phong":28,"phap_phong":28,"hp":280}', yeuCauCanhGioi: 16, moTa: 'Bào y tơ lụa mỏng thanh nhã tự tại.', emoji: '<:ao:1522624070741524530>' },
  { id: 'ao_nguyen_anh', ten: 'Nguyên Anh Hộ Thể Giáp 🥋', loai: 'Giáp', doHiem: 'Hiếm', giaCoSo: 1800, chiSoJson: '{"vat_phong":40,"phap_phong":40,"hp":400}', yeuCauCanhGioi: 16, moTa: 'Bảo giáp dệt từ tơ tằm vàng bảo vệ nguyên anh nguyên thần.', emoji: '<:ao:1522624070741524530>' },

  // ==================== CẢNH GIỚI: HÓA THẦN (YÊU CẦU CẤP 19) ====================
  // Vũ khí Thể Tu
  { id: 'kiem_sat_co_khi', ten: 'Cổ Thiết Trọng Binh 🗡️', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 1500, chiSoJson: '{"vat_cong":60}', yeuCauCanhGioi: 19, moTa: 'Thiết kiếm đúc từ quặng thô cổ xưa, cực kỳ thô kệch nhưng sức nặng kinh người.', emoji: '<:kiem:1522610147569041419>' },
  { id: 'kiem_huyen_thiet', ten: 'Huyền Thiết Trọng Kiếm 🗡️', loai: 'Vũ khí', doHiem: 'Cực hiếm', giaCoSo: 2500, chiSoJson: '{"vat_cong":100}', yeuCauCanhGioi: 19, moTa: 'Trọng kiếm đúc bằng huyền thiết nặng ngàn cân, chém sắt như bùn.', emoji: '<:trong_kiem:1522632132630020116>' },

  // Vũ khí Pháp Tu
  { id: 'truong_go_co_loi', ten: 'Cổ Mộc Lôi Trượng ⚡', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 1500, chiSoJson: '{"phap_cong":60}', yeuCauCanhGioi: 19, moTa: 'Gậy gỗ mục từ cây cổ thụ bị sét đánh ngàn năm trước, chứa chút lôi điện tàn dư.', emoji: '<:truong_phep:1522629314653458472>' },
  { id: 'phap_bao_huyen_mon', ten: 'Huyền Môn Ngọc Bội 🔮', loai: 'Vũ khí', doHiem: 'Cực hiếm', giaCoSo: 2500, chiSoJson: '{"phap_cong":100}', yeuCauCanhGioi: 19, moTa: 'Linh bảo ngọc bội hộ thân của đệ tử Huyền Môn, hội tụ thiên địa linh khí.', emoji: '<:ngoc_boi:1522624074784964608>' },

  // Giáp
  { id: 'ao_da_co_lan', ten: 'Cổ Lân Thú Giáp 🥋', loai: 'Giáp', doHiem: 'Thường', giaCoSo: 1500, chiSoJson: '{"vat_phong":35,"phap_phong":35,"hp":350}', yeuCauCanhGioi: 19, moTa: 'Giáp da thú yêu phong hóa ngàn năm, phòng ngự thô sơ nhưng khá chắc chắn.', emoji: '<:ao:1522624070741524530>' },
  { id: 'giap_huyen_thiet', ten: 'Huyền Thiết Linh Giáp 🥋', loai: 'Giáp', doHiem: 'Cực hiếm', giaCoSo: 2500, chiSoJson: '{"vat_phong":50,"phap_phong":50,"hp":500}', yeuCauCanhGioi: 19, moTa: 'Giáp hộ thân đúc bằng huyền thiết pha lẫn linh thạch, phòng ngự cực cao.', emoji: '<:ao:1522624070741524530>' },

  // ==================== CÁC LOẠI TRANG BỊ MỚI: NGỌC BỘI, CỔ BẢO, PHÁP BẢO ====================
  // Ngọc Bội
  { id: 'ngoc_boi_tan_thu', ten: 'Ngọc Bội Gỗ 🪵', loai: 'Ngọc Bội', doHiem: 'Thường', giaCoSo: 150, chiSoJson: '{"hp":30}', yeuCauCanhGioi: 1, moTa: 'Ngọc bội gỗ chứa sinh khí nhẹ.', emoji: '<:ngoc_boi:1522624074784964608>' },
  { id: 'ngoc_boi_linh_ngoc', ten: 'Linh Ngọc Bội 📿', loai: 'Ngọc Bội', doHiem: 'Hiếm', giaCoSo: 600, chiSoJson: '{"hp":120,"mp":50}', yeuCauCanhGioi: 10, moTa: 'Ngọc bội làm từ linh thạch tốt cho khí huyết.', emoji: '<:ngoc_boi:1522624074784964608>' },
  { id: 'ngoc_boi_tien_van', ten: 'Tiên Vân Ngọc Bội 🔮', loai: 'Ngọc Bội', doHiem: 'Cực hiếm', giaCoSo: 2800, chiSoJson: '{"hp":400,"mp":200}', yeuCauCanhGioi: 19, moTa: 'Tuyệt phẩm ngọc bội hộ thân thượng cổ.', emoji: '<:ngoc_boi:1522624074784964608>' },

  // Cổ Bảo Chủ Động
  { id: 'co_bao_kiem_khi', ten: 'Thượng Cổ Kiếm Hoàn 🗡️', loai: 'Cổ Bảo Chủ Động', doHiem: 'Hiếm', giaCoSo: 800, chiSoJson: '{"vat_cong":15}', yeuCauCanhGioi: 1, moTa: 'Cổ bảo tự kích hoạt phóng ra kiếm khí sát thương địch.', emoji: '<:kiem:1522610147569041419>' },
  { id: 'co_bao_dong_tu', ten: 'Càn Khôn Đỉnh 🏺', loai: 'Cổ Bảo Chủ Động', doHiem: 'Hiếm', giaCoSo: 1600, chiSoJson: '{"vat_phong":20,"hp":150}', yeuCauCanhGioi: 10, moTa: 'Cổ bảo lò luyện đập mạnh yêu thú.', emoji: '<:luyen_dan:1522610152753070230>' },
  { id: 'co_bao_tien_dan', ten: 'Thái Thượng Hồ Lô 🍶', loai: 'Cổ Bảo Chủ Động', doHiem: 'Cực hiếm', giaCoSo: 4500, chiSoJson: '{"phap_cong":80,"mp":300}', yeuCauCanhGioi: 19, moTa: 'Hồ lô cất giấu tiên khí tự động oanh tạc địch.', emoji: '<:ho_lo:1522610145912291488>' },

  // Pháp Bảo
  { id: 'phap_bao_ho_than', ten: 'Phù Vân Phiên 🏳️', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 700, chiSoJson: '{"phap_phong":15}', yeuCauCanhGioi: 1, moTa: 'Pháp bảo tạo khiên ngưng tụ thủy văn phòng ngự.', emoji: '<:ky:1522624065670479932>' },
  { id: 'phap_bao_cong_kich', ten: 'Phá Thiên Chủy 🔱', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1500, chiSoJson: '{"phap_cong":30}', yeuCauCanhGioi: 10, moTa: 'Pháp bảo tấn công phóng hỏa tiễn.', emoji: '<:chuy:1522624063909003295>' },
  { id: 'phap_bao_hon_ton', ten: 'Hỗn Độn Chung 🔔', loai: 'Pháp Bảo', doHiem: 'Cực hiếm', giaCoSo: 5000, chiSoJson: '{"vat_cong":50,"phap_cong":50,"hp":300}', yeuCauCanhGioi: 19, moTa: 'Chuông vàng chấn động tiên hải.', emoji: '<:chuong:1522624061602009279>' },

  // Hạt giống (Trồng trọt)
  { id: 'hat_giong_linh_chi', ten: 'Hạt Giống Linh Chi 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 50, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Hạt giống U Minh Linh Chi, trồng tại Dược Viên.', emoji: '<:hat_giong:1522644602266456275>' },
  { id: 'hat_giong_nhan_sam', ten: 'Hạt Giống Nhân Sâm 🌰', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Hạt giống Tuyết Sơn Nhân Sâm, chứa đựng sinh cơ.', emoji: '<:hat_giong:1522644602266456275>' },

  // Linh thảo thu hoạch theo phẩm chất
  { id: 'linh_chi_luc', ten: 'U Minh Linh Chi (Phàm) 🍄', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 50, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh chi 100 năm tuổi, thu hoạch từ dược viên.', emoji: '<:linh_chi:1522610150853316778>' },
  { id: 'linh_chi_lam', ten: 'U Minh Linh Chi (Ưu) 🍄', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 150, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh chi 1000 năm tuổi, linh khí dồi dào.', emoji: '<:linh_chi:1522610150853316778>' },
  { id: 'linh_chi_tim', ten: 'U Minh Linh Chi (Siêu) 🍄', loai: 'Linh thảo', doHiem: 'Cực hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh chi vạn năm hấp thu nguyệt hoa.', emoji: '<:linh_chi:1522610150853316778>' },
  { id: 'linh_chi_vang', ten: 'U Minh Linh Chi (Tuyệt) 🍄', loai: 'Linh thảo', doHiem: 'Huyền thoại', giaCoSo: 1500, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh chi mười vạn năm trân quý vô ngần.', emoji: '<:linh_chi:1522610150853316778>' },
  { id: 'linh_chi_do', ten: 'U Minh Linh Chi (Tiên) 🍄', loai: 'Linh thảo', doHiem: 'Thần cấp', giaCoSo: 5000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Tiên dược trăm vạn năm chỉ có trong truyền thuyết.', emoji: '<:linh_chi:1522610150853316778>' },

  { id: 'nhan_sam_luc', ten: 'Tuyết Sơn Nhân Sâm (Phàm) 🥕', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 80, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Nhân sâm 100 năm tuổi tốt cho khí huyết.', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'nhan_sam_lam', ten: 'Tuyết Sơn Nhân Sâm (Ưu) 🥕', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 240, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Nhân sâm 1000 năm tuổi đào từ tuyết sơn hoang dã.', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'nhan_sam_tim', ten: 'Tuyết Sơn Nhân Sâm (Siêu) 🥕', loai: 'Linh thảo', doHiem: 'Cực hiếm', giaCoSo: 800, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Cực phẩm nhân sâm vạn năm hộ thể phục mạch.', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'nhan_sam_vang', ten: 'Tuyết Sơn Nhân Sâm (Tuyệt) 🥕', loai: 'Linh thảo', doHiem: 'Huyền thoại', giaCoSo: 2500, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Nhân sâm mười vạn năm, linh khí ngút trời.', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'nhan_sam_do', ten: 'Tuyết Sơn Nhân Sâm (Tiên) 🥕', loai: 'Linh thảo', doHiem: 'Thần cấp', giaCoSo: 8000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Tiên thảo sâm vương trăm vạn năm cải tử hoàn sinh.', emoji: '<:thuoc:1522632141698105354>' },

  // Đan dược tăng Tu Vi
  { id: 'dan_tu_vi_trang', ten: 'Tu Vi Đan (Phế) 💊', loai: 'Đan dược', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh đan phế phẩm lập tức gia tăng tu vi (Tương đương 4 Đạo Niên tu tập).', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'dan_tu_vi_luc', ten: 'Tu Vi Đan (Phàm) 💊', loai: 'Đan dược', doHiem: 'Thường', giaCoSo: 300, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh đan phàm phẩm lập tức gia tăng tu vi (Tương đương 8 Đạo Niên tu tập).', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'dan_tu_vi_lam', ten: 'Tu Vi Đan (Ưu) 💊', loai: 'Đan dược', doHiem: 'Hiếm', giaCoSo: 800, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh đan ưu phẩm lập tức gia tăng tu vi (Tương đương 16 Đạo Niên tu tập).', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'dan_tu_vi_tim', ten: 'Tu Vi Đan (Siêu) 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh đan siêu phẩm lập tức gia tăng tu vi (Tương đương 32 Đạo Niên tu tập).', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'dan_tu_vi_vang', ten: 'Tu Vi Đan (Tuyệt) 💊', loai: 'Đan dược', doHiem: 'Huyền thoại', giaCoSo: 6000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh đan tuyệt phẩm lập tức gia tăng tu vi (Tương đương 64 Đạo Niên tu tập).', emoji: '<:thuoc:1522632141698105354>' },
  { id: 'dan_tu_vi_do', ten: 'Tu Vi Đan (Tiên) 💊', loai: 'Đan dược', doHiem: 'Thần cấp', giaCoSo: 20000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Tiên linh thần đan lập tức gia tăng tu vi (Tương đương 128 Đạo Niên tu tập).', emoji: '<:thuoc:1522632141698105354>' },

  // Vật phẩm bổ trợ ấp trứng
  { id: 'trung_linh_thu', ten: 'Trứng Linh Thú 🥚', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 5000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Ấp nở tại Động Phủ để nhận được linh thú trung thành.', emoji: '<:trung_thuong:1522632136568471682>' },
  { id: 'trung_than_thu', ten: 'Trứng Thần Thú Thượng Cổ 🌟', loai: 'Linh thảo', doHiem: 'Huyền thoại', giaCoSo: 50000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trứng thần thú thượng cổ cực kỳ quý hiếm.', emoji: '<:trung_TC:1522635606394667090>' },
  { id: 'trung_linh_thu_pham', ten: 'Trứng Linh Thú (Phàm) 🥚', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 5000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trứng linh thú phẩm chất Phàm. Ấp nở chắc chắn nhận được Linh Thú.', emoji: '<:trung_thuong:1522632136568471682>' },
  { id: 'trung_linh_thu_linh', ten: 'Trứng Linh Thú (Linh) 🥚', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 20000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trứng linh thú phẩm chất Linh. Ấp nở có 1% tỷ lệ nở ra Thần Thú.', emoji: '<:trung_linh:1522635608881762444>' },
  { id: 'trung_linh_thu_tien', ten: 'Trứng Linh Thú (Tiên) 🥚', loai: 'Linh thảo', doHiem: 'Cực hiếm', giaCoSo: 100000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trứng linh thú phẩm chất Tiên. Ấp nở có 3% tỷ lệ nở ra Thần Thú. Có bán ở shop.', emoji: '<:trung_tien:1522632128096108584>' },
  { id: 'trung_linh_thu_than', ten: 'Trứng Linh Thú (Thần) 🥚', loai: 'Linh thảo', doHiem: 'Thần cấp', giaCoSo: 500000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trứng linh thú phẩm chất Thần. Ấp nở có 50% tỷ lệ nở ra Thần Thú.', emoji: '<:trung_than:1522635611133968566>' },
  { id: 'trung_than', ten: 'Trứng Thần Thú 🌟', loai: 'Linh thảo', doHiem: 'Thần cấp', giaCoSo: 500000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trứng huyền bí ngưng tụ thần uy. Ấp nở có 50% nở ra Thần Thú, 50% nở ra Linh Thú.', emoji: '<:trung_than:1522635611133968566>' },

  // Linh sủng đan & Vạn yêu quả
  { id: 'hoa_than_linh_sung_dan', ten: 'Hóa Thần Linh Sủng Đan 🔴', loai: 'Đan dược', doHiem: 'Thần cấp', giaCoSo: 1000000, chiSoJson: '{}', yeuCauCanhGioi: 19, moTa: 'Đan dược nghịch thiên cải mệnh, giúp Linh Thú đạt trạng thái MAX tiến hóa ngẫu nhiên thành Thần Thú.', emoji: '<:hoa_than_pet:1522610156720881804>' },
  { id: 'van_yeu_qua_phe', ten: 'Vạn Yêu Quả (Phế) ⚪', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 200, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Quả exp phế phẩm của sủng vật, cho ăn gia tăng 500 EXP.', emoji: '<:vyq_trang:1522629320600846418>' },
  { id: 'van_yeu_qua_ha', ten: 'Vạn Yêu Quả (Hạ) 🟢', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 400, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Quả exp hạ phẩm của sủng vật, cho ăn gia tăng 1000 EXP.', emoji: '<:vyq_luc:1522629310270279932>' },
  { id: 'van_yeu_qua_trung', ten: 'Vạn Yêu Quả (Trung) 🔵', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 800, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Quả exp trung phẩm của sủng vật, cho ăn gia tăng 2000 EXP.', emoji: '<:vyq_xanh:1522629316951806087>' },
  { id: 'van_yeu_qua_thuong', ten: 'Vạn Yêu Quả (Thượng) 🟣', loai: 'Linh thảo', doHiem: 'Cực hiếm', giaCoSo: 1600, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Quả exp thượng phẩm của sủng vật, cho ăn gia tăng 4000 EXP.', emoji: '<:vyq_tim:1522629319040438392>' },
  { id: 'van_yeu_qua_tien', ten: 'Vạn Yêu Quả (Tiên) 🟠', loai: 'Linh thảo', doHiem: 'Huyền thoại', giaCoSo: 3200, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Quả exp tiên phẩm của sủng vật, cho ăn gia tăng 8000 EXP.', emoji: '<:vyq_vang:1522629323343925308>' },
  { id: 'van_yeu_qua_than', ten: 'Vạn Yêu Quả (Thần) 🔴', loai: 'Linh thảo', doHiem: 'Thần cấp', giaCoSo: 6400, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Quả exp thần phẩm của sủng vật, cho ăn gia tăng 16000 EXP.', emoji: '<:vyq_do:1522629312648450128>' },

  // Gacha & Chí Bảo
  { id: 'co_duyen_lenh', ten: 'Cơ Duyên Lệnh 🎫', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Tấm thẻ ẩn chứa cơ duyên thiên địa, dùng để quay Hồ Tạo Hóa.' },
  { id: 'binh_tinh_hai', ten: 'Bình Tinh Hải 🏺', loai: 'Chí bảo', doHiem: 'Thần cấp', giaCoSo: 1000000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Chí bảo thượng cổ, mỗi ngày có thể trích xuất sinh cơ để ngưng tụ 2 viên Đan Thần Phẩm.' },
  { id: 'dan_than_pham', ten: 'Đan Thần Phẩm 🔴', loai: 'Đan dược', doHiem: 'Thần cấp', giaCoSo: 50000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Đan dược thần cấp trích xuất từ Bình Tinh Hải, khi nuốt lập tức gia tăng tu vi tương đương 128 Đạo Niên tu luyện.' }
];

// ==========================================
// THÔNG TIN KỸ NĂNG MẪU (SKILLS)
// ==========================================
export const SKILLS = [
  // Kỹ năng phái Thể Tu (Vật lý)
  { id: 'thanh_phong_quyen', ten: 'Thanh Phong Quyền 👊', loai: 'Vật lý', satThuong: 120, cooldown: 6, yeuCauCanhGioi: 1, congPhapId: null, moTa: 'Đấm ra một quyền tựa gió mát lướt qua, sát thương bằng 120% Vật công.' },
  { id: 'ba_vuong_kich', ten: 'Bá Vương Kích 🔱', loai: 'Vật lý', satThuong: 150, cooldown: 12, yeuCauCanhGioi: 10, congPhapId: null, moTa: 'Kích ra mạnh mẽ như Bá Vương xuất thế, sát thương bằng 150% Vật công.' },
  { id: 'ham_thien_chuong', ten: 'Hám Thiên Chưởng 💥', loai: 'Vật lý', satThuong: 200, cooldown: 18, yeuCauCanhGioi: 19, congPhapId: null, moTa: 'Tụ lực giáng chưởng chấn động thiên địa, sát thương bằng 200% Vật công.' },

  // Kỹ năng phái Pháp Tu (Phép thuật)
  { id: 'hoa_diem_thuat', ten: 'Hỏa Diễm Thuật 🔥', loai: 'Phép thuật', satThuong: 120, cooldown: 6, yeuCauCanhGioi: 1, congPhapId: null, moTa: 'Triệu hồi quả cầu lửa thiêu đốt đối thủ, sát thương bằng 120% Pháp công.' },
  { id: 'ngu_loi_thuat', ten: 'Ngự Lôi Thuật ⚡', loai: 'Phép thuật', satThuong: 150, cooldown: 12, yeuCauCanhGioi: 10, congPhapId: null, moTa: 'Dẫn lôi đình giáng xuống đầu kẻ thù, sát thương bằng 150% Pháp công.' },
  { id: 'bang_vu_thuat', ten: 'Băng Vũ Thuật ❄️', loai: 'Phép thuật', satThuong: 200, cooldown: 18, yeuCauCanhGioi: 19, congPhapId: null, moTa: 'Tạo cơn mưa băng buốt lạnh tàn phá kinh mạch, sát thương bằng 200% Pháp công.' }
];

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
      { itemId: 'dan_hp_1', tile: 0.50 },
      { itemId: 'dan_mp_1', tile: 0.50 },
      { itemId: 'kiem_go', tile: 0.15 },
      { itemId: 'truong_go', tile: 0.15 },
      { itemId: 'ao_vai', tile: 0.15 }
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
      { itemId: 'kiem_sat', tile: 0.15 },
      { itemId: 'truong_sat', tile: 0, replaceId: 'truong_truc', tile: 0.15 }, // replaceId for fallback
      { itemId: 'ao_da', tile: 0.15 },
      { itemId: 'nhan_sam', tile: 0.30 }
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
    hieuUngJson: '{"itemSpecified":{"itemId":"co_duyen_lenh","quantity":1},"thienDaoLuc":true,"thienDaoLucMsg":"🎫 **Cơ Duyên Lệnh Xuất Thế**: Đạo hữu {name} trong lúc lịch luyện nhặt được Cơ Duyên Lệnh cổ xưa!"}'
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
export function rollDynamicStats(item) {
  const loai = item.loai;
  const POOLS = {
    "Vũ khí": ["vat_cong", "phap_cong", "crit_rate", "crit_dmg", "xuyen_giap"],
    "Giáp": ["vat_phong", "phap_phong", "max_mp", "max_hp"],
    "Ngọc Bội": ["max_hp", "max_mp", "ne", "lifesteal"],
    "Cổ Bảo Chủ Động": ["vat_cong", "phap_cong", "vat_phong", "phap_phong", "max_hp", "max_mp", "ne", "lifesteal"],
    "Pháp Bảo": [
      "vat_cong", "phap_cong", "vat_phong", "phap_phong", "max_hp", "max_mp", "ne", "lifesteal",
      "crit_rate_pb", "crit_dmg_pb", "sat_thuong_pb", "phap_thuong_pb", "khien_pb"
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
    "khien_pb": "Hộẫn Hấp thụ Pháp bảo"
  };

  const lines = [];
  for (const stat of selectedStats) {
    const rand = Math.random();
    let quality, color, minPercent, maxPercent;

    if (rand < 0.05) {
      quality = "Thần Thoại";
      color = "cam";
      minPercent = 15;
      maxPercent = 20;
    } else if (rand < 0.20) {
      quality = "Sử Thi";
      color = "tim";
      minPercent = 10;
      maxPercent = 15;
    } else if (rand < 0.50) {
      quality = "Hiếm";
      color = "xanh";
      minPercent = 5;
      maxPercent = 10;
    } else if (rand < 0.85) {
      quality = "Thường";
      color = "luc";
      minPercent = 0;
      maxPercent = 5;
    } else {
      quality = "Phế Phẩm";
      color = "trang";
      minPercent = -5;
      maxPercent = 0;
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

// Cấu hình Kỹ Năng Chủ Động của Pháp Bảo
export const KYNANG_PHAPBAO_ACTIVE = {
  phap_bao_ho_than: { ten: "Phù Vân Hộ Thể 🛡️", loai: "khien", triGia: 120, duration: 0, moTa: "Ngưng tụ sương mù khiên hộ thể, chặn 120 sát thương kế tiếp." },
  phap_bao_cong_kich: { ten: "Hỏa Long Chủy 🔱", loai: "tan_cong", triGia: 320, duration: 0, moTa: "Phóng thần lao lửa oanh tạc địch nhân, gây 320 sát thương pháp bảo." },
  phap_bao_hon_ton: { ten: "Hỗn Độn Phá Thiên 🔔", loai: "hon_hop", triGia: 550, triGiaKhien: 250, duration: 0, moTa: "Chuông vàng gõ vang gây 550 sát thương pháp bảo và tạo khiên 250 phòng ngự." }
};

export function layKyNangPhapBaoActive(itemOrId) {
  const itemId = typeof itemOrId === 'string' ? itemOrId : (itemOrId?.id || '');
  const dbActiveSkill = typeof itemOrId === 'object' ? itemOrId?.activeSkill : null;

  if (dbActiveSkill) {
    return dbActiveSkill;
  }

  if (KYNANG_PHAPBAO_ACTIVE[itemId]) {
    return KYNANG_PHAPBAO_ACTIVE[itemId];
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
    return { seedId: 'hat_giong_luyen_khi_thao', herbId: 'linh_thao_luyen_khi', pillId: 'dan_dot_pha_1' };
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

export const PET_QUALITY_LABELS = {
  LT_1: 'Huyết Mạch Hoang Dã 🐾',
  LT_2: 'Huyết Mạch Linh Thuần ✨',
  LT_3: 'Huyết Mạch Vương Giả 👑',
  LT_4: 'Huyết Mạch Hoàng Kim 🌟',
  TT_1: 'Huyết Mạch Thái Cổ 🦖',
  TT_2: 'Huyết Mạch Hỗn Độn 🌀',
  TT_3: 'Huyết Mạch Hồng Hoang 🌋',
  TT_4: 'Huyết Mạch Khởi Nguyên 🌌'
};

export const getPetQualityIndex = (rarity) => {
  if (!rarity) return 0;
  if (rarity.endsWith('_1')) return 0;
  if (rarity.endsWith('_2')) return 1;
  if (rarity.endsWith('_3')) return 2;
  if (rarity.endsWith('_4')) return 3;
  return 0;
};

export const getPetTotalEvolves = (pet) => {
  if (!pet) return 0;
  const q = getPetQualityIndex(pet.rarity);
  const p = pet.tienHoa || 0;
  const extra = pet.extraEvo || 0;
  return q * 11 + p + extra;
};

export const getPetLevelCap = (pet) => {
  if (!pet) return 1;
  if (pet.isMax) return 440;
  const q = getPetQualityIndex(pet.rarity);
  const p = pet.tienHoa || 0;
  if (p < 10) {
    return q * 110 + (p + 1) * 10;
  } else {
    return q * 110 + 110;
  }
};

export const getPetEvolutionCost = (pet) => {
  if (!pet) return 0;
  const isThan = ['to_long_1', 'to_long_2', 'phuong_hoang_1', 'phuong_hoang_2', 'ky_lan_1', 'ky_lan_2', 'huyen_vu_1', 'huyen_vu_2', 'bach_ho_1', 'bach_ho_2'].includes(pet.type);
  const baseCost = isThan ? 10000 : 1000;
  const totalEvolves = getPetTotalEvolves(pet);
  return Math.floor(baseCost * Math.pow(1.25, totalEvolves));
};

export const getFormattedPetName = (baseName, rarity, tienHoa, isMax) => {
  const cleanName = baseName.replace(/(\s\+\d+|\[MAX\]|\[Tiến\s*[Hh]óa\]\s*)/g, '').trim();
  if (isMax) {
    return `${cleanName} [MAX]`;
  }
  if (tienHoa > 0) {
    return `${cleanName} +${tienHoa}`;
  }
  return cleanName;
};

// Khai báo bộ nhớ cache cho PET_TEMPLATES để tránh gọi CSDL quá nhiều lần
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
  // 15 Linh Thú (5 species)
  { id: 'ma_lang_1', name: 'Thiết Huyết Lang', emoji: '🐺', group: 'linh_thu', species: 'ma_lang', statType: 'vat_cong', statValue: 0.08, desc: 'Hộ thể: +8% Sát thương Vật lý nền' },
  { id: 'ma_lang_2', name: 'U Minh Ma Lang', emoji: '🐺', group: 'linh_thu', species: 'ma_lang', statType: 'vat_cong', statValue: 0.10, desc: 'Hộ thể: +10% Sát thương Vật lý nền' },
  { id: 'ma_lang_3', name: 'Huyết Nguyệt Lang', emoji: '🐺', group: 'linh_thu', species: 'ma_lang', statType: 'vat_cong', statValue: 0.12, desc: 'Hộ thể: +12% Sát thương Vật lý nền' },

  { id: 'loi_diep_1', name: 'Thanh Vân Điệp', emoji: '🦋', group: 'linh_thu', species: 'loi_diep', statType: 'tu_toc', statValue: 0.08, desc: 'Hộ thể: +8% Tu tốc nền' },
  { id: 'loi_diep_2', name: 'Thất Thải Lôi Điệp', emoji: '🦋', group: 'linh_thu', species: 'loi_diep', statType: 'tu_toc', statValue: 0.10, desc: 'Hộ thể: +5% Bạo kích & +10% Tu tốc nền' },
  { id: 'loi_diep_3', name: 'Mộng Ảo Điệp', emoji: '🦋', group: 'linh_thu', species: 'loi_diep', statType: 'tu_toc', statValue: 0.12, desc: 'Hộ thể: +12% Tu tốc nền' },

  { id: 'than_vien_1', name: 'Thiết Tý Viên', emoji: '🦍', group: 'linh_thu', species: 'than_vien', statType: 'max_hp', statValue: 0.10, desc: 'Hộ thể: +10% HP tối đa & +8% Hộ giáp nền' },
  { id: 'than_vien_2', name: 'Thiết Tý Thần Viên', emoji: '🦍', group: 'linh_thu', species: 'than_vien', statType: 'max_hp', statValue: 0.15, desc: 'Hộ thể: +15% HP tối đa & +10% Hộ giáp nền' },
  { id: 'than_vien_3', name: 'Kim Cương Viên', emoji: '🦍', group: 'linh_thu', species: 'than_vien', statType: 'max_hp', statValue: 0.18, desc: 'Hộ thể: +18% HP tối đa & +12% Hộ giáp nền' },

  { id: 'linh_ho_1', name: 'Song Đầu Hổ', emoji: '🐯', group: 'linh_thu', species: 'linh_ho', statType: 'vat_cong', statValue: 0.08, desc: 'Hộ thể: +8% Vật Công & +5% Tốc độ di chuyển' },
  { id: 'linh_ho_2', name: 'Bạch Ngân Linh Hổ', emoji: '🐯', group: 'linh_thu', species: 'linh_ho', statType: 'vat_cong', statValue: 0.12, desc: 'Hộ thể: +12% Vật Công & +8% Tốc độ di chuyển' },
  { id: 'linh_ho_3', name: 'U Ảnh Hổ', emoji: '🐯', group: 'linh_thu', species: 'linh_ho', statType: 'vat_cong', statValue: 0.15, desc: 'Hộ thể: +15% Vật Công & +10% Tốc độ di chuyển' },

  { id: 'linh_ho_fox_1', name: 'Tam Vĩ Yêu Hồ', emoji: '🦊', group: 'linh_thu', species: 'linh_ho_fox', statType: 'ne', statValue: 0.08, desc: 'Hộ thể: +8% Né tránh' },
  { id: 'linh_ho_fox_2', name: 'Lục Vĩ Linh Hồ', emoji: '🦊', group: 'linh_thu', species: 'linh_ho_fox', statType: 'ne', statValue: 0.12, desc: 'Hộ thể: +12% Né tránh & +5% Bạo kích' },
  { id: 'linh_ho_fox_3', name: 'Cửu Vĩ Linh Hồ', emoji: '🦊', group: 'linh_thu', species: 'linh_ho_fox', statType: 'ne', statValue: 0.15, desc: 'Hộ thể: +15% Né tránh & +8% Bạo kích' },

  // 10 Thần Thú (5 species)
  { id: 'to_long_1', name: 'Hỗn Thiên Tổ Long', emoji: '<:long:1522644627394662431>', group: 'than_thu', species: 'to_long', statType: 'max_hp', statValue: 0.20, desc: 'Chủ động: Long Thần Chi Nộ. Hộ thể: +20% HP & +20% Pháp Công' },
  { id: 'to_long_2', name: 'Thượng Cổ Tổ Long', emoji: '<:long:1522644627394662431>', group: 'than_thu', species: 'to_long', statType: 'max_hp', statValue: 0.25, desc: 'Chủ động: Long Thần Chi Nộ. Hộ thể: +25% HP & +25% Pháp Công' },

  { id: 'phuong_hoang_1', name: 'Cửu Thiên Phượng Hoàng', emoji: '<:phung:1522635618376624844>', group: 'than_thu', species: 'phuong_hoang', statType: 'max_hp', statValue: 0.25, desc: 'Chủ động: Niết Bàn Trùng Sinh. Hộ thể: +25% HP & +20% Né tránh' },
  { id: 'phuong_hoang_2', name: 'Huyết Hoàng Phượng', emoji: '<:phung:1522635618376624844>', group: 'than_thu', species: 'phuong_hoang', statType: 'max_hp', statValue: 0.28, desc: 'Chủ động: Niết Bàn Trùng Sinh. Hộ thể: +28% HP & +22% Né tránh' },

  { id: 'ky_lan_1', name: 'Bạch Ngọc Kỳ Lân', emoji: '<:lan:1522635616137908274>', group: 'than_thu', species: 'ky_lan', statType: 'max_hp', statValue: 0.20, desc: 'Chủ động: Kỳ Lân Hộ Thể. Hộ thể: +20% HP & +20% Công' },
  { id: 'ky_lan_2', name: 'Thiên Ngọc Kỳ Lân', emoji: '<:lan:1522635616137908274>', group: 'than_thu', species: 'ky_lan', statType: 'max_hp', statValue: 0.25, desc: 'Chủ động: Kỳ Lân Hộ Thể. Hộ thể: +25% HP & +25% Công' },

  { id: 'huyen_vu_1', name: 'Thần Thú Huyền Vũ', emoji: '<:quy:1522635603718570135>', group: 'than_thu', species: 'huyen_vu', statType: 'giap', statValue: 0.25, desc: 'Chủ động: Huyền Vũ Bảo Vệ. Hộ thể: +25% Giáp & +20% HP' },
  { id: 'huyen_vu_2', name: 'Thượng Cổ Hợp Quy', emoji: '<:quy:1522635603718570135>', group: 'than_thu', species: 'huyen_vu', statType: 'giap', statValue: 0.30, desc: 'Chủ động: Huyền Vũ Bảo Vệ. Hộ thể: +30% Giáp & +25% HP' },

  { id: 'bach_ho_1', name: 'Thần Thú Bạch Hổ', emoji: '<:ho:1522635613822517248>', group: 'than_thu', species: 'bach_ho', statType: 'max_hp', statValue: 0.22, desc: 'Chủ động: Bạch Hổ Sát Chiêu. Hộ thể: +22% HP & +12% Vật Công' },
  { id: 'bach_ho_2', name: 'Thái Cổ Kim Hổ', emoji: '<:ho:1522635613822517248>', group: 'than_thu', species: 'bach_ho', statType: 'max_hp', statValue: 0.25, desc: 'Chủ động: Bạch Hổ Sát Chiêu. Hộ thể: +25% HP & +15% Vật Công' }
];

export function checkHuyetMachApChe(level, rarity) {
  if (rarity === 'TT_2' && level < 19) {
    return {
      allowed: false,
      requiredRealm: 'Hóa Thần',
      msg: 'Đạo hữu dưới Hóa Thần Cảnh không thể sử dụng linh thú có Huyết Mạch Hỗn Độn.'
    };
  }
  if (rarity === 'TT_3' && level < 22) {
    return {
      allowed: false,
      requiredRealm: 'Phản Hư',
      msg: 'Đạo hữu dưới Phản Hư Cảnh không thể sử dụng linh thú có Huyết Mạch Hồng Hoang.'
    };
  }
  if (rarity === 'TT_4' && level < 25) {
    return {
      allowed: false,
      requiredRealm: 'Hợp Thể',
      msg: 'Đạo hữu dưới Hợp Thể Cảnh không thể sử dụng linh thú có Huyết Mạch Khởi Nguyên.'
    };
  }
  return { allowed: true };
}


