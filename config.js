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
  // ==================== CẢNH GIỚI: LUYỆN KHÍ (YÊU CẦU CẤP 1) ====================
  // Vũ khí Thể Tu
  { id: 'kiem_go', ten: 'Kiếm Gỗ 🪵', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{"vat_cong":10}', yeuCauCanhGioi: 1, moTa: 'Thanh kiếm gỗ thô sơ cho tân thủ.' },
  { id: 'kiem_tien_tan_thu', ten: 'Tân Thủ Tiên Kiếm 🗡️', loai: 'Vũ khí', doHiem: 'Cực hiếm', giaCoSo: 1000, chiSoJson: '{"vat_cong":35}', yeuCauCanhGioi: 1, moTa: 'Thần binh rớt từ thượng giới dành cho tân thủ Luyện Khí.' },

  // Vũ khí Pháp Tu
  { id: 'truong_go', ten: 'Mộc Trượng 🪵', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{"phap_cong":10}', yeuCauCanhGioi: 1, moTa: 'Khúc gỗ dẫn linh khí thô sơ.' },
  { id: 'truong_tien_tan_thu', ten: 'Tân Thủ Linh Trượng 🎋', loai: 'Vũ khí', doHiem: 'Cực hiếm', giaCoSo: 1000, chiSoJson: '{"phap_cong":35}', yeuCauCanhGioi: 1, moTa: 'Linh trượng ban tặng cho tân thủ Luyện Khí có tư chất cực tốt.' },

  // Giáp
  { id: 'ao_vai', ten: 'Đạo Bào Vải 🥋', loai: 'Giáp', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{"vat_phong":5,"phap_phong":5,"hp":50}', yeuCauCanhGioi: 1, moTa: 'Áo vải đệ tử mặc hàng ngày.' },
  { id: 'giap_tien_tan_thu', ten: 'Tân Thủ Tiên Giáp 🥋', loai: 'Giáp', doHiem: 'Cực hiếm', giaCoSo: 1000, chiSoJson: '{"vat_phong":20,"phap_phong":20,"hp":200}', yeuCauCanhGioi: 1, moTa: 'Linh giáp phòng ngự hộ thể hoàn mỹ cho tân thủ Luyện Khí.' },

  // Đan dược / Thảo dược
  { id: 'dan_hp_1', ten: 'Bổ Huyết Đan (Sơ) 💊', loai: 'Đan dược', doHiem: 'Thường', giaCoSo: 50, chiSoJson: '{"hp_hoi":100}', yeuCauCanhGioi: 1, moTa: 'Phục hồi 100 điểm khí huyết (HP) bị tổn thương.' },
  { id: 'dan_mp_1', ten: 'Hồi Thần Đan (Sơ) 💧', loai: 'Đan dược', doHiem: 'Thường', giaCoSo: 50, chiSoJson: '{"mp_hoi":50}', yeuCauCanhGioi: 1, moTa: 'Khôi phục 50 điểm linh lực pháp hải (MP).' },
  { id: 'linh_chi', ten: 'U Minh Linh Chi 🍄', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 30, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh thảo chứa ít linh khí mọc nơi ẩm ướt.' },

  // ==================== CẢNH GIỚI: TRÚC CƠ (YÊU CẦU CẤP 10) ====================
  // Vũ khí Thể Tu
  { id: 'kiem_sat_nang', ten: 'Trọng Thiết Thiết Kiếm ⚔️', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 300, chiSoJson: '{"vat_cong":25}', yeuCauCanhGioi: 10, moTa: 'Thiết kiếm đúc nặng nề, chỉ có tu sĩ Trúc Cơ trở lên mới đủ lực nhấc.' },
  { id: 'kiem_sat', ten: 'Thiết Kiếm ⚔️', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{"vat_cong":30}', yeuCauCanhGioi: 10, moTa: 'Kiếm sắt rèn đúc kỹ lưỡng, sắc bén sắc lạnh.' },

  // Vũ khí Pháp Tu
  { id: 'truong_truc_thuong', ten: 'Phàm Trúc Trượng 🪵', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 300, chiSoJson: '{"phap_cong":25}', yeuCauCanhGioi: 10, moTa: 'Khúc trúc già tầm thường nhưng dẫn linh khí khá tốt.' },
  { id: 'truong_truc', ten: 'Trúc Trượng 🎋', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{"phap_cong":30}', yeuCauCanhGioi: 10, moTa: 'Tương truyền làm bằng Linh Trúc ngàn năm, tương thích pháp lực rất tốt.' },

  // Giáp
  { id: 'ao_vai_day', ten: 'Đạo Bào Vải Dày 🥋', loai: 'Giáp', doHiem: 'Thường', giaCoSo: 300, chiSoJson: '{"vat_phong":10,"phap_phong":10,"hp":100}', yeuCauCanhGioi: 10, moTa: 'Áo vải nhiều lớp gia cố bảo vệ tu sĩ Trúc Cơ.' },
  { id: 'ao_da', ten: 'Thú Bì Giáp 🛡️', loai: 'Giáp', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{"vat_phong":15,"phap_phong":15,"hp":150}', yeuCauCanhGioi: 10, moTa: 'Giáp làm bằng da thú yêu cấp thấp, dẻo dai bảo vệ cơ thể.' },

  // Đan dược / Thảo dược
  { id: 'dan_hp_2', ten: 'Bổ Huyết Đan (Trung) 🧪', loai: 'Đan dược', doHiem: 'Hiếm', giaCoSo: 200, chiSoJson: '{"hp_hoi":500}', yeuCauCanhGioi: 10, moTa: 'Phục hồi 500 điểm khí huyết (HP) bị tổn thương.' },
  { id: 'dan_mp_2', ten: 'Hồi Thần Đan (Trung) 🌊', loai: 'Đan dược', doHiem: 'Hiếm', giaCoSo: 200, chiSoJson: '{"mp_hoi":200}', yeuCauCanhGioi: 10, moTa: 'Khôi phục 200 điểm linh lực pháp hải (MP).' },
  { id: 'nhan_sam', ten: 'Tuyết Sơn Nhân Sâm 🥕', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 120, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Nhân sâm ngàn năm thu hoạch trên đỉnh núi tuyết hoang lạnh.' },

  // ==================== CẢNH GIỚI: HÓA THẦN (YÊU CẦU CẤP 19) ====================
  // Vũ khí Thể Tu
  { id: 'kiem_sat_co_khi', ten: 'Cổ Thiết Trọng Binh 🗡️', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 1500, chiSoJson: '{"vat_cong":60}', yeuCauCanhGioi: 19, moTa: 'Thiết kiếm đúc từ quặng thô cổ xưa, cực kỳ thô kệch nhưng sức nặng kinh người.' },
  { id: 'kiem_huyen_thiet', ten: 'Huyền Thiết Trọng Kiếm 🗡️', loai: 'Vũ khí', doHiem: 'Cực hiếm', giaCoSo: 2500, chiSoJson: '{"vat_cong":100}', yeuCauCanhGioi: 19, moTa: 'Trọng kiếm đúc bằng huyền thiết nặng ngàn cân, chém sắt như bùn.' },

  // Vũ khí Pháp Tu
  { id: 'truong_go_co_loi', ten: 'Cổ Mộc Lôi Trượng ⚡', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 1500, chiSoJson: '{"phap_cong":60}', yeuCauCanhGioi: 19, moTa: 'Gậy gỗ mục từ cây cổ thụ bị sét đánh ngàn năm trước, chứa chút lôi điện tàn dư.' },
  { id: 'phap_bao_huyen_mon', ten: 'Huyền Môn Ngọc Bội 🔮', loai: 'Vũ khí', doHiem: 'Cực hiếm', giaCoSo: 2500, chiSoJson: '{"phap_cong":100}', yeuCauCanhGioi: 19, moTa: 'Linh bảo ngọc bội hộ thân của đệ tử Huyền Môn, hội tụ thiên địa linh khí.' },

  // Giáp
  { id: 'ao_da_co_lan', ten: 'Cổ Lân Thú Giáp 🥋', loai: 'Giáp', doHiem: 'Thường', giaCoSo: 1500, chiSoJson: '{"vat_phong":35,"phap_phong":35,"hp":350}', yeuCauCanhGioi: 19, moTa: 'Giáp da thú yêu phong hóa ngàn năm, phòng ngự thô sơ nhưng khá chắc chắn.' },
  { id: 'giap_huyen_thiet', ten: 'Huyền Thiết Linh Giáp 🥋', loai: 'Giáp', doHiem: 'Cực hiếm', giaCoSo: 2500, chiSoJson: '{"vat_phong":50,"phap_phong":50,"hp":500}', yeuCauCanhGioi: 19, moTa: 'Giáp hộ thân đúc bằng huyền thiết pha lẫn linh thạch, phòng ngự cực cao.' },

  // ==================== CÁC LOẠI TRANG BỊ MỚI: NGỌC BỘI, CỔ BẢO, PHÁP BẢO ====================
  // Ngọc Bội
  { id: 'ngoc_boi_tan_thu', ten: 'Ngọc Bội Gỗ 🪵', loai: 'Ngọc Bội', doHiem: 'Thường', giaCoSo: 150, chiSoJson: '{"hp":30}', yeuCauCanhGioi: 1, moTa: 'Ngọc bội gỗ chứa sinh khí nhẹ.' },
  { id: 'ngoc_boi_linh_ngoc', ten: 'Linh Ngọc Bội 📿', loai: 'Ngọc Bội', doHiem: 'Hiếm', giaCoSo: 600, chiSoJson: '{"hp":120,"mp":50}', yeuCauCanhGioi: 10, moTa: 'Ngọc bội làm từ linh thạch tốt cho khí huyết.' },
  { id: 'ngoc_boi_tien_van', ten: 'Tiên Vân Ngọc Bội 🔮', loai: 'Ngọc Bội', doHiem: 'Cực hiếm', giaCoSo: 2800, chiSoJson: '{"hp":400,"mp":200}', yeuCauCanhGioi: 19, moTa: 'Tuyệt phẩm ngọc bội hộ thân thượng cổ.' },

  // Cổ Bảo Chủ Động
  { id: 'co_bao_kiem_khi', ten: 'Thượng Cổ Kiếm Hoàn 🗡️', loai: 'Cổ Bảo Chủ Động', doHiem: 'Hiếm', giaCoSo: 800, chiSoJson: '{"vat_cong":15}', yeuCauCanhGioi: 1, moTa: 'Cổ bảo tự kích hoạt phóng ra kiếm khí sát thương địch.' },
  { id: 'co_bao_dong_tu', ten: 'Càn Khôn Đỉnh 🏺', loai: 'Cổ Bảo Chủ Động', doHiem: 'Hiếm', giaCoSo: 1600, chiSoJson: '{"vat_phong":20,"hp":150}', yeuCauCanhGioi: 10, moTa: 'Cổ bảo lò luyện đập mạnh yêu thú.' },
  { id: 'co_bao_tien_dan', ten: 'Thái Thượng Hồ Lô 🍶', loai: 'Cổ Bảo Chủ Động', doHiem: 'Cực hiếm', giaCoSo: 4500, chiSoJson: '{"phap_cong":80,"mp":300}', yeuCauCanhGioi: 19, moTa: 'Hồ lô cất giấu tiên khí tự động oanh tạc địch.' },

  // Pháp Bảo
  { id: 'phap_bao_ho_than', ten: 'Phù Vân Phiên 🏳️', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 700, chiSoJson: '{"phap_phong":15}', yeuCauCanhGioi: 1, moTa: 'Pháp bảo tạo khiên ngưng tụ thủy văn phòng ngự.' },
  { id: 'phap_bao_cong_kich', ten: 'Phá Thiên Chủy 🔱', loai: 'Pháp Bảo', doHiem: 'Hiếm', giaCoSo: 1500, chiSoJson: '{"phap_cong":30}', yeuCauCanhGioi: 10, moTa: 'Pháp bảo tấn công phóng hỏa tiễn.' },
  { id: 'phap_bao_hon_ton', ten: 'Hỗn Độn Chung 🔔', loai: 'Pháp Bảo', doHiem: 'Cực hiếm', giaCoSo: 5000, chiSoJson: '{"vat_cong":50,"phap_cong":50,"hp":300}', yeuCauCanhGioi: 19, moTa: 'Chuông vàng chấn động tiên hải.' },

  // Hạt giống (Trồng trọt)
  { id: 'hat_giong_linh_chi', ten: 'Hạt Giống Linh Chi 🌰', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 50, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Hạt giống U Minh Linh Chi, trồng tại Dược Viên.' },
  { id: 'hat_giong_nhan_sam', ten: 'Hạt Giống Nhân Sâm 🌰', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Hạt giống Tuyết Sơn Nhân Sâm, chứa đựng sinh cơ.' },

  // Linh thảo thu hoạch theo phẩm chất
  { id: 'linh_chi_luc', ten: 'U Minh Linh Chi (Phàm) 🍄', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 50, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh chi 100 năm tuổi, thu hoạch từ dược viên.' },
  { id: 'linh_chi_lam', ten: 'U Minh Linh Chi (Ưu) 🍄', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 150, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh chi 1000 năm tuổi, linh khí dồi dào.' },
  { id: 'linh_chi_tim', ten: 'U Minh Linh Chi (Siêu) 🍄', loai: 'Linh thảo', doHiem: 'Cực hiếm', giaCoSo: 500, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh chi vạn năm hấp thu nguyệt hoa.' },
  { id: 'linh_chi_vang', ten: 'U Minh Linh Chi (Tuyệt) 🍄', loai: 'Linh thảo', doHiem: 'Huyền thoại', giaCoSo: 1500, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh chi mười vạn năm trân quý vô ngần.' },
  { id: 'linh_chi_do', ten: 'U Minh Linh Chi (Tiên) 🍄', loai: 'Linh thảo', doHiem: 'Thần cấp', giaCoSo: 5000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Tiên dược trăm vạn năm chỉ có trong truyền thuyết.' },

  { id: 'nhan_sam_luc', ten: 'Tuyết Sơn Nhân Sâm (Phàm) 🥕', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 80, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Nhân sâm 100 năm tuổi tốt cho khí huyết.' },
  { id: 'nhan_sam_lam', ten: 'Tuyết Sơn Nhân Sâm (Ưu) 🥕', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 240, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Nhân sâm 1000 năm tuổi đào từ tuyết sơn hoang dã.' },
  { id: 'nhan_sam_tim', ten: 'Tuyết Sơn Nhân Sâm (Siêu) 🥕', loai: 'Linh thảo', doHiem: 'Cực hiếm', giaCoSo: 800, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Cực phẩm nhân sâm vạn năm hộ thể phục mạch.' },
  { id: 'nhan_sam_vang', ten: 'Tuyết Sơn Nhân Sâm (Tuyệt) 🥕', loai: 'Linh thảo', doHiem: 'Huyền thoại', giaCoSo: 2500, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Nhân sâm mười vạn năm, linh khí ngút trời.' },
  { id: 'nhan_sam_do', ten: 'Tuyết Sơn Nhân Sâm (Tiên) 🥕', loai: 'Linh thảo', doHiem: 'Thần cấp', giaCoSo: 8000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Tiên thảo sâm vương trăm vạn năm cải tử hoàn sinh.' },

  // Đan dược tăng Tu Vi
  { id: 'dan_tu_vi_trang', ten: 'Tu Vi Đan (Phế) 💊', loai: 'Đan dược', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh đan phế phẩm lập tức gia tăng tu vi (Tương đương 4 Đạo Niên tu tập).' },
  { id: 'dan_tu_vi_luc', ten: 'Tu Vi Đan (Phàm) 💊', loai: 'Đan dược', doHiem: 'Thường', giaCoSo: 300, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh đan phàm phẩm lập tức gia tăng tu vi (Tương đương 8 Đạo Niên tu tập).' },
  { id: 'dan_tu_vi_lam', ten: 'Tu Vi Đan (Ưu) 💊', loai: 'Đan dược', doHiem: 'Hiếm', giaCoSo: 800, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh đan ưu phẩm lập tức gia tăng tu vi (Tương đương 16 Đạo Niên tu tập).' },
  { id: 'dan_tu_vi_tim', ten: 'Tu Vi Đan (Siêu) 💊', loai: 'Đan dược', doHiem: 'Cực hiếm', giaCoSo: 2000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh đan siêu phẩm lập tức gia tăng tu vi (Tương đương 32 Đạo Niên tu tập).' },
  { id: 'dan_tu_vi_vang', ten: 'Tu Vi Đan (Tuyệt) 💊', loai: 'Đan dược', doHiem: 'Huyền thoại', giaCoSo: 6000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh đan tuyệt phẩm lập tức gia tăng tu vi (Tương đương 64 Đạo Niên tu tập).' },
  { id: 'dan_tu_vi_do', ten: 'Tu Vi Đan (Tiên) 💊', loai: 'Đan dược', doHiem: 'Thần cấp', giaCoSo: 20000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Tiên linh thần đan lập tức gia tăng tu vi (Tương đương 128 Đạo Niên tu tập).' },

  // Vật phẩm bổ trợ ấp trứng
  { id: 'trung_linh_thu', ten: 'Trứng Linh Thú 🥚', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 5000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Ấp nở tại Động Phủ để nhận được linh thú trung thành.' },
  { id: 'trung_than_thu', ten: 'Trứng Thần Thú Thượng Cổ 🌟', loai: 'Linh thảo', doHiem: 'Huyền thoại', giaCoSo: 50000, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Trứng thần thú thượng cổ cực kỳ quý hiếm.' },

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
  phap_bao_ho_than: { ten: "Thủy Vân Trị Liệu", loai: "hoi_mau_pct", triGia: 15, duration: 0, moTa: "Hồi phục 15% HP tối đa khi vào trận chiến." },
  phap_bao_cong_kich: { ten: "Liệt Diễm Tiễn", loai: "tan_cong", triGia: 250, duration: 0, moTa: "Gây 250 sát thương cố định khi vào trận chiến." },
  phap_bao_hon_ton: { ten: "Hỗn Độn Thần Lực", loai: "tang_cong_pct", triGia: 20, duration: 3, moTa: "Tăng 20% Công kích trong 3 hiệp đầu trận." }
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
