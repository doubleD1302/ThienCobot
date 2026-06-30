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
  { id: 'giap_huyen_thiet', ten: 'Huyền Thiết Linh Giáp 🥋', loai: 'Giáp', doHiem: 'Cực hiếm', giaCoSo: 2500, chiSoJson: '{"vat_phong":50,"phap_phong":50,"hp":500}', yeuCauCanhGioi: 19, moTa: 'Giáp hộ thân đúc bằng huyền thiết pha lẫn linh thạch, phòng ngự cực cao.' }
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
  { id: 'linh_khi_trieu_tich', ten: '⚡ Linh Khí Triều Tịch ⚡', moTa: 'Trong lúc leo lên đỉnh Ngọc Kinh Sơn, đạo hữu vô tình gặp một luồng linh khí trời đất bộc phát, cọ rửa kinh mạch, tu vi tiến triển nhanh chóng!', loai: 'tot', hieuUngJson: '{"exp":{"min":40,"max":100}}' },
  { id: 'nhat_linh_thach', ten: '🪙 Linh Thạch Thượng Cổ 🪙', moTa: 'Tại một lòng sông cạn dưới chân U Minh Cốc, đạo hữu vô tình phát hiện ra một số viên Linh Thạch thượng cổ bị chôn vùi dưới cát mịn.', loai: 'tot', hieuUngJson: '{"stones":{"min":20,"max":70}}' },
  { id: 'dong_phu_tien_boi', ten: '🏺 Động Phủ Tiền Bối 🏺', moTa: 'Đạo hữu vô tình bước qua kết giới, phát hiện một động phủ ẩn giấu của một vị tu sĩ cổ đại hóa trần. Trên bàn đá tĩnh tọa vẫn còn lưu lại di vật của người.', loai: 'dai_co_duyen', hieuUngJson: '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"🏺 **Duyên Định Động Phủ**: Đạo hữu {name} trong lúc lịch luyện phát hiện động phủ cổ xưa của tiền bối, đạt được bảo vật {itemName}!"}' },
  { id: 'linh_thao_ki_ngo', ten: '🌱 Kỳ Ngộ Linh Thảo 🌱', moTa: 'Bên vách núi dựng đứng cheo leo đầy sương mù, đạo hữu phát hiện một đóa linh chi quý chiêu tuyết đang hấp thụ tinh hoa nguyệt ảnh.', loai: 'tot', hieuUngJson: '{"itemRandom":{"loai":"Linh thảo"}}' },
  { id: 'cao_nhan_truyen_cong', ten: '🧙 Cao Nhân Chỉ Điểm 🧙', moTa: 'Đạo hữu gặp gỡ một lão giả râu tóc bạc phơ đang ngồi câu cá bên đầm lầy vô danh. Sau vài câu đàm đạo đạo lý thiên địa, lão giả vỗ vai truyền thụ linh lực rồi biến mất vào không hư.', loai: 'dai_co_duyen', hieuUngJson: '{"exp":{"min":150,"max":250},"thienDaoLuc":true,"thienDaoLucMsg":"🧙 **Tiên Nhân Chỉ Lộ**: Đạo hữu {name} kỳ ngộ cao nhân đắc đạo chỉ điểm mê tân, tu vi tăng tiến thần tốc!"}' },
  { id: 'yeu_thu_phuc_kich', ten: '🐾 Yêu Thú Phakov Kích 🐾', moTa: 'Đang đi trong rừng trúc sương mù, đạo hữu bất ngờ bị một con Trúc Điệp Yêu thú từ trên cao phóng xuống tấn công. Trận chiến diễn ra chóng vánh, đạo hữu tuy chạy thoát nhưng bị thương tích đầy mình.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.15}' },
  { id: 'co_tran_phap', ten: '🌀 Cổ Trận Pháp Vây Hãm 🌀', moTa: 'Đạo hữu vô tình giẫm phải trận pháp huyễn cảnh bị bỏ hoang từ thời thái cổ. Trận pháp điên cuồng hút lấy linh lực của đạo hữu trước khi tự động sụp đổ giải giới.', loai: 'xui_xeo', hieuUngJson: '{"mpPhat":0.20}' },
  // ==================== CƠ DUYÊN TỐT (TOT): 45 SỰ KIỆN ====================
  { id: 'linh_khi_1', ten: '🌊 Thác Nước Tẩy Tủy 🌊', moTa: 'Đạo hữu ngồi dưới dòng thác linh lực đổ xuống từ chín tầng trời, cặn bã trong kinh mạch bị cuốn trôi sạch sẽ.', loai: 'tot', hieuUngJson: '{"exp":{"min":40,"max":80}}' },
  { id: 'linh_khi_2', ten: '🌌 Thiên Địa Tử Khí 🌌', moTa: 'Lúc bình minh, đạo hữu nuốt một luồng đông lai tử khí từ chân trời, chân nguyên dâng trào mạnh mẽ.', loai: 'tot', hieuUngJson: '{"exp":{"min":50,"max":90}}' },
  { id: 'linh_khi_3', ten: '💎 Linh Thạch Phế Khoáng 💎', moTa: 'Lạc vào một khu mỏ linh thạch đã bỏ hoang, đạo hữu chăm chỉ đào bới tìm thấy một số linh thạch sót lại.', loai: 'tot', hieuUngJson: '{"stones":{"min":15,"max":45}}' },
  { id: 'linh_khi_4', ten: '💊 Di Tích Đan Phôi 💊', moTa: 'Tìm được một viên đan dược bán thành phẩm bị vứt bỏ, dược lực tuy phân tán nhưng vẫn còn tác dụng bồi bổ.', loai: 'tot', hieuUngJson: '{"itemRandom":{"loai":"Đan dược"}}' },
  { id: 'linh_khi_5', ten: '☁️ Thải Vân Chi Khí ☁️', moTa: 'Một đóa ngũ sắc thải vân trôi qua che đỉnh đầu, tản phát ra một luồng linh khí dịu mát làm đạo hữu sảng khoái.', loai: 'tot', hieuUngJson: '{"exp":{"min":30,"max":60}}' },
  { id: 'linh_khi_6', ten: '💧 Linh Hồ Ngộ Đạo 💧', moTa: 'Đạo hữu ngâm mình trong hồ nước ấm tự nhiên chứa linh dịch tích tụ vạn năm, gột rửa tâm cảnh.', loai: 'tot', hieuUngJson: '{"exp":{"min":45,"max":85}}' },
  { id: 'linh_khi_7', ten: '🍼 U Cốc Linh Nhũ 🍼', moTa: 'Trong thạch động sâu thẳm dưới U Minh Cốc, đạo hữu hứng được vài giọt thạch nhũ linh khí tinh khiết.', loai: 'tot', hieuUngJson: '{"exp":{"min":50,"max":100}}' },
  { id: 'linh_khi_8', ten: '🌸 Vạn Niên Đan Quế 🌸', moTa: 'Hái được vài cánh hoa Đan Quế vạn năm rụng bên bờ suối, có thể dùng làm dược liệu quý.', loai: 'tot', hieuUngJson: '{"itemRandom":{"loai":"Linh thảo"}}' },
  { id: 'linh_khi_9', ten: '🍉 Tiên Nhân Thực Độc 🍉', moTa: 'Ăn bừa một quả dã quả chín mọng đỏ rực bên đường, may mắn đây là tiên quả vô hại bổ sung linh lực.', loai: 'tot', hieuUngJson: '{"exp":{"min":20,"max":60}}' },
  { id: 'linh_khi_10', ten: '🔥 Thái Dương Tinh Hỏa 🔥', moTa: 'Hấp thụ một luồng nhiệt năng tinh khiết của ánh nắng mặt trời giữa trưa, nung nấu pháp lực.', loai: 'tot', hieuUngJson: '{"exp":{"min":35,"max":75}}' },
  { id: 'linh_khi_11', ten: '🌙 Thái Âm Nguyệt Hoa 🌙', moTa: 'Tĩnh tọa lúc trăng tròn, thu nhận nguyệt quang buốt lạnh làm dịu linh hồn và làm đầy đan điền.', loai: 'tot', hieuUngJson: '{"exp":{"min":35,"max":75}}' },
  { id: 'linh_khi_12', ten: '⭐ Tinh Thần Lực Lượng ⭐', moTa: 'Đại trận tinh tú thời cổ đại hé mở, một tia sáng tinh hà bắn thẳng vào trán đạo hữu khai thông khiếu huyệt.', loai: 'tot', hieuUngJson: '{"exp":{"min":40,"max":80}}' },
  { id: 'linh_khi_13', ten: '🍓 Tiên Quả Chín Đỏ 🍓', moTa: 'Tìm thấy một cây bụi tiên thảo trĩu quả đỏ rực, đạo hữu khéo léo hái cất vào túi trữ vật.', loai: 'tot', hieuUngJson: '{"itemRandom":{"loai":"Linh thảo"}}' },
  { id: 'linh_khi_14', ten: '🛡️ Nhặt Được Binh Khí Cũ 🛡️', moTa: 'Dưới hố bùn cổ chiến trường, đạo hữu đào được một thanh phế kiếm còn nguyên vẹn cán.', loai: 'tot', hieuUngJson: '{"itemRandom":{"loai":"Vũ khí"}}' },
  { id: 'linh_khi_15', ten: '🥋 Nhặt Được Giáp Rách 🥋', moTa: 'Nhặt được chiếc hộ tâm kính cũ rách bên cạnh bộ xương khô, lau chùi đi vẫn còn dùng được.', loai: 'tot', hieuUngJson: '{"itemRandom":{"loai":"Giáp"}}' },
  { id: 'linh_khi_16', ten: '🐰 Động Vật Tri Linh 🐰', moTa: 'Một chú thỏ con có linh tính ngậm một viên linh thạch đặt trước chân đạo hữu như để cảm tạ ân không sát sinh.', loai: 'tot', hieuUngJson: '{"stones":{"min":10,"max":30}}' },
  { id: 'linh_khi_17', ten: '🌪️ Ngũ Hành Triều Tịch 🌪️', moTa: 'Linh khí ngũ hành bốn phương bất ngờ triều bộc xoay quanh đạo hữu, giúp gia tăng linh lực.', loai: 'tot', hieuUngJson: '{"exp":{"min":50,"max":90}}' },
  { id: 'linh_khi_18', ten: '🌱 Tử Đan Dược Thảo 🌱', moTa: 'Vô tình phát hiện một khóm linh thảo quý hiếm ẩn giấu sau bụi cây gai nhọn.', loai: 'tot', hieuUngJson: '{"itemRandom":{"loai":"Linh thảo"}}' },
  { id: 'linh_khi_19', ten: '👴 Cổ Tu Chỉ Diểm 👴', moTa: 'Gặp tàn hồn của một vị tu sĩ cổ đại hiền từ, người truyền dạy cho đạo hữu một vài khẩu quyết vận khí.', loai: 'tot', hieuUngJson: '{"exp":{"min":60,"max":110}}' },
  { id: 'linh_khi_20', ten: '⛲ Địa Linh Chi Tuyền ⛲', moTa: 'Phát hiện mạch nước xuân phun trào mang theo linh khí ngào ngạt, đạo hữu tranh thủ xếp bằng hấp thụ.', loai: 'tot', hieuUngJson: '{"exp":{"min":45,"max":80}}' },
  { id: 'linh_khi_21', ten: '⚡ Lôi Đình Tẩy Luyện ⚡', moTa: 'Trời đổ giông bão, đạo hữu mạo hiểm đón nhận dư lôi để trui rèn và tống khứ tạp niệm đan điền.', loai: 'tot', hieuUngJson: '{"exp":{"min":50,"max":90}}' },
  { id: 'linh_khi_22', ten: '♟️ Bàn Cờ Cổ Nhân ♟️', moTa: 'Giải thành công một thế cờ tàn trên bàn đá rêu phong hoang dã, tâm trí thông suốt đốn ngộ.', loai: 'tot', hieuUngJson: '{"exp":{"min":40,"max":75}}' },
  { id: 'linh_khi_23', ten: '🐢 Huyền Vũ Phún Linh 🐢', moTa: 'Huyền Vũ thú dưới đầm sâu ngoi lên thở ra một ngụm tiên khí rồi lặn mất, linh khí bao bọc đạo hữu.', loai: 'tot', hieuUngJson: '{"exp":{"min":55,"max":95}}' },
  { id: 'linh_khi_24', ten: '🪶 Phượng Hoàng Tàn Lông 🪶', moTa: 'Tìm thấy một chiếc lông vũ rực lửa đã tắt ngúm của Phượng Hoàng cổ xưa, bán được kha khá linh thạch.', loai: 'tot', hieuUngJson: '{"stones":{"min":20,"max":60}}' },
  { id: 'linh_khi_25', ten: '🐯 Bạch Hổ Tầm Tung 🐯', moTa: 'Men theo dấu chân Bạch Hổ thần thú, đạo hữu tìm được một nơi tu luyện bí ẩn vô cùng yên tĩnh.', loai: 'tot', hieuUngJson: '{"exp":{"min":40,"max":85}}' },
  { id: 'linh_khi_26', ten: '🐉 Thanh Long Thổ Châu 🐉', moTa: 'Thần long lướt qua mây xanh làm rơi xuống một hạt long châu vụn, tỏa ra linh quang ấm áp.', loai: 'tot', hieuUngJson: '{"exp":{"min":50,"max":100}}' },
  { id: 'linh_khi_27', ten: '💊 Di Tích Linh Đan 💊', moTa: 'Khai quật đưới gốc cây cổ thụ một bình gốm nhỏ niêm phong kỹ chứa đan dược cổ.', loai: 'tot', hieuUngJson: '{"itemRandom":{"loai":"Đan dược"}}' },
  { id: 'linh_khi_28', ten: '🌾 Thảo Dược Hóa Linh 🌾', moTa: 'Một đóa linh thảo sắp hóa hình trốn chạy vô tình vấp ngã trúng tay đạo hữu.', loai: 'tot', hieuUngJson: '{"itemRandom":{"loai":"Linh thảo"}}' },
  { id: 'linh_khi_29', ten: '🏥 Đan Các Phế Tích 🏥', moTa: 'Tìm kiếm trong tàn tích của một môn phái cổ xưa, phát hiện tủ đan dược còn vài lọ nguyên vẹn.', loai: 'tot', hieuUngJson: '{"itemRandom":{"loai":"Đan dược"}}' },
  { id: 'linh_khi_30', ten: '⛏️ Huyền Thiết Khoáng Mạch ⛏️', moTa: 'Phát hiện một mỏ huyền thiết nhỏ lộ thiên, đạo hữu thu thập quặng bán lấy linh thạch.', loai: 'tot', hieuUngJson: '{"stones":{"min":30,"max":60}}' },
  { id: 'linh_khi_31', ten: '🌀 Tụ Linh Trận Dư Ba 🌀', moTa: 'Bước vào phạm vi một tụ linh trận đã tàn lụi nhưng vẫn còn tích tụ chút linh khí loãng.', loai: 'tot', hieuUngJson: '{"exp":{"min":40,"max":70}}' },
  { id: 'linh_khi_32', ten: '🍀 Hỗn Độn Thanh Liên 🍀', moTa: 'Nhìn thấy đóa hoa sen thanh khiết mọc giữa vũng bùn độc, đốn ngộ đạo lý bùn sen không nhiễm.', loai: 'tot', hieuUngJson: '{"exp":{"min":60,"max":120}}' },
  { id: 'linh_khi_33', ten: '🌿 Huyền Cơ Thảo 🌿', moTa: 'Hái được một ngọn cỏ Huyền Cơ lay động theo nhịp thở của trời đất.', loai: 'tot', hieuUngJson: '{"itemRandom":{"loai":"Linh thảo"}}' },
  { id: 'linh_khi_34', ten: '🍶 Nguyệt Hạ Độc Ẩm 🍶', moTa: 'Ngồi uống một bầu rượu nhạt dưới ánh trăng, bỗng cảm thấy tâm cảnh nhẹ nhõm, kinh mạch thư giãn.', loai: 'tot', hieuUngJson: '{"exp":{"min":30,"max":50}}' },
  { id: 'linh_khi_35', ten: '🪷 Bích Thủy Liên Hoa 🪷', moTa: 'Hái được đóa sen bích thủy nghìn năm tỏa mùi thơm dịu nhẹ thanh tâm.', loai: 'tot', hieuUngJson: '{"itemRandom":{"loai":"Linh thảo"}}' },
  { id: 'linh_khi_36', ten: '🦊 Linh Thú Dẫn Lộ 🦊', moTa: 'Một chú linh cáo nhỏ dẫn đạo hữu tới một đống đá giấu đầy túi trữ vật của kẻ xấu tạ thế.', loai: 'tot', hieuUngJson: '{"stones":{"min":20,"max":50}}' },
  { id: 'linh_khi_37', ten: '🏜️ Động Cát Thượng Cổ 🏜️', moTa: 'Cơn gió lốc sa mạc thổi bay cát lộ ra lối vào mật thất cổ kính, đạo hữu vào nhặt được linh thạch cổ.', loai: 'tot', hieuUngJson: '{"stones":{"min":25,"max":60}}' },
  { id: 'linh_khi_38', ten: '👃 Tiên Đan Dược Hương 👃', moTa: 'Chỉ ngửi thấy mùi dược hương bay ra từ đan lô cổ rỉ sét bên đường cũng giúp thông suốt khí hải.', loai: 'tot', hieuUngJson: '{"exp":{"min":35,"max":70}}' },
  { id: 'linh_khi_39', ten: '🌈 Ngũ Sắc Tường Vân 🌈', moTa: 'Nhìn thấy cầu vồng tiên giới hiện ra trên nền trời xanh, đốn ngộ về sự tuần hoàn của ngũ hành.', loai: 'tot', hieuUngJson: '{"exp":{"min":45,"max":85}}' },
  { id: 'linh_khi_40', ten: '❄️ Linh Sương Tẩy Căn ❄️', moTa: 'Trận linh sương lạnh lẽo phủ xuống nhục thân, thanh lọc toàn bộ độc tố tích tụ lâu ngày.', loai: 'tot', hieuUngJson: '{"exp":{"min":50,"max":90}}' },
  { id: 'linh_khi_41', ten: '👥 Cố Nhân Đàm Đạo 👥', moTa: 'Gặp gỡ một vị đạo hữu đồng đạo cùng đàm luận đạo pháp suốt đêm, thu hoạch được nhiều tâm đắc.', loai: 'tot', hieuUngJson: '{"exp":{"min":30,"max":70}}' },
  { id: 'linh_khi_42', ten: '🪙 Nhặt Linh Thạch Vụn 🪙', moTa: 'Trên đường đi, đạo hữu nhặt nhạnh được một số mẩu linh thạch vụn rớt ra từ xe áp tải tiêu cục.', loai: 'tot', hieuUngJson: '{"stones":{"min":10,"max":30}}' },
  { id: 'linh_khi_43', ten: '🗿 Dã Ngoại Quái Thạch 🗿', moTa: 'Ngồi nghỉ chân trên một tảng đá kỳ lạ, hóa ra đây là một khối linh thạch thô chưa khai thác.', loai: 'tot', hieuUngJson: '{"exp":{"min":20,"max":50}}' },
  { id: 'linh_khi_44', ten: '☄️ Thiên Tinh Thạch ☄️', moTa: 'Một mảnh thiên tinh thạch bốc cháy rớt xuống sa mạc ngay trước mắt đạo hữu mang theo linh thạch tinh thuần.', loai: 'tot', hieuUngJson: '{"stones":{"min":35,"max":75}}' },
  { id: 'linh_khi_45', ten: '🦩 Di Cốt Tiên Hạc 🦩', moTa: 'Tìm thấy phần hài cốt tiên hạc tu hành ngàn năm, nhặt được thảo dược mọc cộng sinh xung quanh.', loai: 'tot', hieuUngJson: '{"itemRandom":{"loai":"Linh thảo"}}' },
  // ==================== ĐẠI CƠ DUYÊN (DAI_CO_DUYEN): 25 SỰ KIỆN ====================
  { id: 'dai_duyen_1', ten: '💀 Tiên Nhân Di Thể 💀', moTa: 'Tìm thấy một bộ xương khô phát ra kim quang rực rỡ ẩn sâu trong sơn động, đạt được tiên nhân di vật.', loai: 'dai_co_duyen', hieuUngJson: '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"💀 **Tiên Nhân Di Diện**: Đạo hữu {name} tìm thấy bộ xương cốt tiên nhân, đắc được bảo vật {itemName}!"}' },
  { id: 'dai_duyen_2', ten: '🔮 Huyền Môn Linh Tàng 🔮', moTa: 'Vô tình chạm vào cơ quan phá giải đại trận phong ấn tàn tích cổ tông môn, khai quật cổ linh tàng.', loai: 'dai_co_duyen', hieuUngJson: '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"🔮 **Huyền Môn Linh Tàng**: Đạo hữu {name} vô tình phá giải trận pháp linh tàng, đạt được chí bảo {itemName}!"}' },
  { id: 'dai_duyen_3', ten: '🗡️ Thượng Cổ Kiếm Ý 🗡️', moTa: 'Đứng trước vách đá dựng đứng in sâu một vết chém khổng lồ, đạo hữu cảm ngộ được luồng kiếm ý bá đạo chưa tan.', loai: 'dai_co_duyen', hieuUngJson: '{"exp":{"min":200,"max":350},"thienDaoLuc":true,"thienDaoLucMsg":"🗡️ **Thái Thượng Kiếm Ý**: Đạo hữu {name} lĩnh ngộ thượng cổ kiếm ý lưu lại trên vách đá, tu vi đột phá mạnh mẽ!"}' },
  { id: 'dai_duyen_4', ten: '📖 Vô Tự Thiên Thư 📖', moTa: 'Trong cổ thư điện nhặt được cuốn thiên thư không chữ, thần thức nhập vào đốn ngộ chân đạo đại lục.', loai: 'dai_co_duyen', hieuUngJson: '{"exp":{"min":220,"max":400},"thienDaoLuc":true,"thienDaoLucMsg":"📖 **Thiên Thư Ngộ Đạo**: Đạo hữu {name} nhìn thấu Vô Tự Thiên Thư, càn khôn đại chấn, tu vi thăng tiến đại phúc!"}' },
  { id: 'dai_duyen_5', ten: '🐉 Long Tộc Huyết Trì 🐉', moTa: 'Tìm thấy vũng máu chân long ngàn năm ẩn tích dưới lòng đất rực lửa, đạo hữu nhảy vào tẩy tủy tôi luyện gân cốt.', loai: 'dai_co_duyen', hieuUngJson: '{"exp":{"min":250,"max":450},"thienDaoLuc":true,"thienDaoLucMsg":"🐉 **Long Tộc Huyết Trì**: Đạo hữu {name} tắm máu rồng cổ xưa, nhục thân tráng kiện, nhận được tẩy cốt nghịch thiên!"}' },
  { id: 'dai_duyen_6', ten: '🧙 Tiên Nhân Mộng Cảnh 🧙', moTa: 'Nằm ngủ dưới gốc thông cổ thụ, đạo hữu gặp tiên nhân hiện hồn về truyền dạy pháp môn hô hấp thượng cổ trong giấc mộng.', loai: 'dai_co_duyen', hieuUngJson: '{"exp":{"min":180,"max":300},"thienDaoLuc":true,"thienDaoLucMsg":"🧙 **Tiên Nhân Chỉ Lộ**: Đạo hữu {name} kỳ ngộ cao nhân đắc đạo chỉ điểm mê tân, tu vi tăng tiến thần tốc!"}' },
  { id: 'dai_duyen_7', ten: '💰 Tà Tu Sào Huyệt 💰', moTa: 'Một mình thâm nhập ổ của toán tà ma ngoại đạo bị thiên phạt, thu dọn toàn bộ bảo vật cất giấu của bọn chúng.', loai: 'dai_co_duyen', hieuUngJson: '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"💰 **Tà Tu Linh Bảo**: Đạo hữu {name} tiệt sát sào huyệt tà tu, lục lọi được chí bảo {itemName}!"}' },
  { id: 'dai_duyen_8', ten: '☄️ Vẫn Thạch Khai Môn ☄️', moTa: 'Khối sao băng mang theo quặng thạch vũ trụ rơi trúng đầm lầy tạo ra vụ nổ lớn rải rác vạn thạch anh.', loai: 'dai_co_duyen', hieuUngJson: '{"stones":{"min":150,"max":300},"thienDaoLuc":true,"thienDaoLucMsg":"☄️ **Thiên Thạch Phi Tiên**: Đạo hữu {name} nhặt được khối vẫn thạch thiên ngoại chứa tinh thuần linh thạch!"}' },
  { id: 'dai_duyen_9', ten: '🏺 Đan Vương Phế Tích 🏺', moTa: 'Vào nhầm đan phòng hoang phế của Đan Vương cổ đại, lượm lặt linh đơn dị dược ẩn sâu dưới đáy lò luyện.', loai: 'dai_co_duyen', hieuUngJson: '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"🏺 **Đan Vương Di Vật**: Đạo hữu {name} khai quật Đan Vương phế tích, đạt được {itemName} cực phẩm!"}' },
  { id: 'dai_duyen_10', ten: '🌿 Vạn Niên Cửu Nhiễm Thảo 🌿', moTa: 'Tầm được một ngọn linh dược cửu nhiễm chín nghìn năm bừng bừng linh khí thượng cổ.', loai: 'dai_co_duyen', hieuUngJson: '{"itemRandom":{"loai":"Linh thảo"},"thienDaoLuc":true,"thienDaoLucMsg":"🌿 **Kỳ Thảo Vương**: Đạo hữu {name} tầm được Vạn Niên Linh Thảo ngút trời vận khí!"}' },
  { id: 'dai_duyen_11', ten: '🍎 Ngũ Sắc Tiên Quả 🍎', moTa: 'Hái và nuốt chửng trái cây biến dị rực rỡ ngũ sắc mọc bên vực sâu vạn trượng, mở rộng đan điền.', loai: 'dai_co_duyen', hieuUngJson: '{"exp":{"min":210,"max":380},"thienDaoLuc":true,"thienDaoLucMsg":"🍎 **Ngũ Sắc Tiên Quả**: Đạo hữu {name} ăn được tiên quả biến dị thượng cổ, thoát thai hoán cốt!"}' },
  { id: 'dai_duyen_12', ten: '🗡️ Cổ Kiếm Trận Khai 🗡️', moTa: 'Vượt qua muôn vàn sát khí cổ kiếm trận, thuần phục được một kiện phi kiếm có linh tính thượng cổ.', loai: 'dai_co_duyen', hieuUngJson: '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"🗡️ **Tiên Kiếm Trận**: Đạo hữu {name} thu phục được phi kiếm {itemName} trong cổ kiếm trận!"}' },
  { id: 'dai_duyen_13', ten: '🐾 Thần Thú Giảng Đạo 🐾', moTa: 'Lắng nghe tiếng gầm khai sáng của một tôn thần thú viễn cổ đang ngủ say trong đầm lầy hỗn độn.', loai: 'dai_co_duyen', hieuUngJson: '{"exp":{"min":160,"max":280},"thienDaoLuc":true,"thienDaoLucMsg":"🐾 **Chí Tôn Chỉ Điểm**: Đạo hữu {name} gặp yêu thú chí tôn chỉ dạy vận linh pháp môn!"}' },
  { id: 'dai_duyen_14', ten: '🐉 Long Châu Hóa Lộc 🐉', moTa: 'Nhặt được mảnh long châu bị nứt do thiên kiếp lôi đình đánh trúng của chân long thượng giới.', loai: 'dai_co_duyen', hieuUngJson: '{"stones":{"min":100,"max":250},"thienDaoLuc":true,"thienDaoLucMsg":"🐉 **Long Châu Hóa Lộc**: Đạo hữu {name} nhận được chúc phúc Chân Long, hóa giải kiếp số và nhặt nhiều linh thạch!"}' },
  { id: 'dai_duyen_15', ten: '💧 Côn Luân Tiên Tuyền 💧', moTa: 'Được ngâm mình dưới giếng linh xuân trên đỉnh Côn Luân băng phủ, phục hồi toàn bộ căn cốt.', loai: 'dai_co_duyen', hieuUngJson: '{"exp":{"min":200,"max":300},"thienDaoLuc":true,"thienDaoLucMsg":"💧 **Côn Luân Linh Tuyển**: Đạo hữu {name} uống ngụm linh xuân trên đỉnh Côn Luân, linh lực đại trướng!"}' },
  { id: 'dai_duyen_16', ten: '⚡ Lôi Đế Ngọc Giản ⚡', moTa: 'Nhặt được ngọc giản thất lạc của Lôi Đế thượng giới, chứa đầy lôi điện linh lực tu luyện.', loai: 'dai_co_duyen', hieuUngJson: '{"exp":{"min":240,"max":420},"thienDaoLuc":true,"thienDaoLucMsg":"⚡ **Lôi Đế Kiếp**: Đạo hữu {name} nhận được ngọc giản truyền thừa của Lôi Đế thượng cổ!"}' },
  { id: 'dai_duyen_17', ten: '🌌 Cực Hạn Tâm Cảnh 🌌', moTa: 'Trải qua thử thách ảo ảnh ngàn kiếp luân hồi trong động quỷ cô độc, tôi luyện ý chí vững chãi.', loai: 'dai_co_duyen', hieuUngJson: '{"exp":{"min":150,"max":320},"thienDaoLuc":true,"thienDaoLucMsg":"🌌 **Huyễn Cảnh Ngộ Đạo**: Đạo hữu {name} vượt qua thất tình lục dục huyễn cảnh, tâm cảnh đại đột phá!"}' },
  { id: 'dai_duyen_18', ten: '🏰 Cổ Tiên Phủ Mở 🏰', moTa: 'Tiên phủ ngủ yên mười vạn năm đột nhiên xuất thế, đạo hữu chui lọt vào mật thất lấy đi linh bảo.', loai: 'dai_co_duyen', hieuUngJson: '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"🏰 **Tiên Phủ Khai Mở**: Đạo hữu {name} tham gia đoạt bảo tại cổ tiên phủ, giành được {itemName}!"}' },
  { id: 'dai_duyen_19', ten: '💊 Tông Sư Chuyển Pháp 💊', moTa: 'Kỳ ngộ Đan Đạo Tông Sư đang tìm đệ tử chân truyền, được lão gia hướng dẫn vận khí hóa dược.', loai: 'dai_co_duyen', hieuUngJson: '{"exp":{"min":180,"max":270},"thienDaoLuc":true,"thienDaoLucMsg":"💊 **Đan Đạo Chỉ Điểm**: Đạo hữu {name} được Đan Đạo Tông sư truyền thụ tâm đắc hóa luyện dược lực!"}' },
  { id: 'dai_duyen_20', ten: '🧠 Linh Thức Khai Mở 🧠', moTa: 'Ngồi thiền ngộ đạo dưới gốc bồ đề ngàn năm giúp thần thức đột ngột khai khiếu cực mạnh.', loai: 'dai_co_duyen', hieuUngJson: '{"exp":{"min":200,"max":350},"thienDaoLuc":true,"thienDaoLucMsg":"🧠 **Thần Thức Khai Mở**: Đạo hữu {name} thức tỉnh đại linh thức càn khôn cọ rửa tu vi!"}' },
  { id: 'dai_duyen_21', ten: '🐢 Thần Quy Ban Lộc 🐢', moTa: 'Thượng Cổ Thần Quy rùa vàng ngoi lên khỏi sông lớn ban tặng cho đạo hữu một túi linh thạch khổng lồ.', loai: 'dai_co_duyen', hieuUngJson: '{"stones":{"min":120,"max":280},"thienDaoLuc":true,"thienDaoLucMsg":"🐢 **Thủy Tổ Kỳ Ngộ**: Đạo hữu {name} bái kiến Thượng Cổ Thần Quy, được ban tặng tài bảo!"}' },
  { id: 'dai_duyen_22', ten: '🌟 Tinh Tú Triều Tụ 🌟', moTa: 'Vũ trụ dị biến, các tinh sao xếp thẳng hàng ban xuống luồng quang mang bao phủ đạo hữu tịnh tu.', loai: 'dai_co_duyen', hieuUngJson: '{"exp":{"min":220,"max":360},"thienDaoLuc":true,"thienDaoLucMsg":"🌟 **Tinh Tú Triều Bái**: Đạo hữu {name} ngồi thiền đúng lúc tinh tú triều tụ bộc phát sức mạnh vũ trụ!"}' },
  { id: 'dai_duyen_23', ten: '📜 Huyền Môn Bí Quyển 📜', moTa: 'Tại đáy đầm sâu lượm được hộp sắt chứa bí kíp thất lạc huyền diệu của bổn môn tiên phẩm.', loai: 'dai_co_duyen', hieuUngJson: '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"📜 **Bí Điển Hữu Duyên**: Đạo hữu {name} tầm được cổ tịch Huyền Môn, bên trong cất giấu {itemName}!"}' },
  { id: 'dai_duyen_24', ten: '🔥 Địa Tâm Cổ Hỏa 🔥', moTa: 'Vấp chân ngã vào động lửa ngầm chứa Địa Tâm Hỏa, may mắn chịu đựng được nhiệt độ và rèn cốt sắt.', loai: 'dai_co_duyen', hieuUngJson: '{"exp":{"min":190,"max":310},"thienDaoLuc":true,"thienDaoLucMsg":"🔥 **Địa Hỏa Tẩy Luyện**: Đạo hữu {name} lấy Địa Tâm Cổ Hỏa tôi luyện nhục thân cường đại!"}' },
  { id: 'dai_duyen_25', ten: '💎 Đại Phú Lộc 💎', moTa: 'Ngã vực sâu đè chết một tôn tà tu đang chạy trốn, thừa hưởng toàn bộ bao bố linh thạch của hắn.', loai: 'dai_co_duyen', hieuUngJson: '{"stones":{"min":200,"max":400},"thienDaoLuc":true,"thienDaoLucMsg":"💎 **Đệ Nhất Vận Khí**: Đạo hữu {name} ngã vực sâu không chết, nhặt được túi linh thạch khổng lồ!"}' },
  // ==================== VẬN RỦI (XUI_XEO): 30 SỰ KIỆN ====================
  { id: 'van_rui_1', ten: '🦋 Yêu Điệp Hút Hồn 🦋', moTa: 'Gặp đàn bướm yêu vây quanh huyễn hoặc tinh thần, pháp hải của đạo hữu bị tiêu hao trầm trọng.', loai: 'xui_xeo', hieuUngJson: '{"mpPhat":0.15}' },
  { id: 'van_rui_2', ten: '⚡ Lôi Kiếp Cắn Trả ⚡', moTa: 'Thời tiết thay đổi giáng xuống một đạo thần lôi lạc đánh trúng nhục thân đạo hữu đang đi.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.12}' },
  { id: 'van_rui_3', ten: '🔥 Tẩu Hỏa Nhập Ma 🔥', moTa: 'Trong lúc vội vã vận hành linh lực trên đường đi, đạo hữu bị hỗn loạn chân khí làm tổn thương đan điền.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.20}' },
  { id: 'van_rui_4', ten: '☣️ Độc Vụ Trận ☣️', moTa: 'Vô tình bước vào vùng đầm lầy mù sương chứa đầy khí độc yêu thú tích tụ lâu ngày.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.10}' },
  { id: 'van_rui_5', ten: '💨 Cổ Độc Chi Khí 💨', moTa: 'Khai quật nhầm ngôi mộ chứa cơ quan bẫy độc của cổ tu sĩ bảo vệ di thể.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.15}' },
  { id: 'van_rui_6', ten: '👹 Huyết Ma Sát Khí 👹', moTa: 'Bị sát khí của Huyết Ma tông môn từ xa quét trúng đầu óc khiến pháp hải chấn động nứt nẻ.', loai: 'xui_xeo', hieuUngJson: '{"mpPhat":0.25}' },
  { id: 'van_rui_7', ten: '🧟 U Minh Cương Thi 🧟', moTa: 'Gặp cương thi ngàn năm nhảy ra từ quan tài đá vồ trúng bả vai đạo hữu gây nhiễm tà khí độc.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.18}' },
  { id: 'van_rui_8', ten: '🥷 Tà Tu Sát Thần 🥷', moTa: 'Bị toán tà tu lẻn vào rình rập phóng phi đao ám sát, đạo hữu tuy chống trả thoát được nhưng chấn thương.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.15}' },
  { id: 'van_rui_9', ten: '🌌 Huyễn Cảnh Mê Hồn 🌌', moTa: 'Lạc lối trong đào hoa trận pháp mê hoặc tâm thần khiến đạo hữu tiêu hao nhiều pháp lực phá giải.', loai: 'xui_xeo', hieuUngJson: '{"mpPhat":0.15}' },
  { id: 'van_rui_10', ten: '🔥 Hỏa Diệm Khí Độc 🔥', moTa: 'Hỏa sơn bộc phát tàn phát khí nóng làm bỏng rộp da thịt và suy giảm huyết khí đạo hữu.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.12}' },
  { id: 'van_rui_11', ten: '❄️ Băng Phong Cốt ❄️', moTa: 'Luồng gió lạnh thấu xương từ đỉnh tuyết sơn thổi xuống đóng băng tạm thời các kinh mạch.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.14}' },
  { id: 'van_rui_12', ten: '🕳️ Rơi Vực Thẳm 🕳️', moTa: 'Đang đi bộ ngắm tiên cảnh thì sụt chân rơi xuống khe nứt núi đá do chấn động địa chấn địa tầng.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.25}' },
  { id: 'van_rui_13', ten: '🐍 Độc Xà Cắn 🐍', moTa: 'Bị một con thanh xà ẩn núp trên cành tre đớp trúng cổ chân truyền độc lực tàn phá cơ thể.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.10}' },
  { id: 'van_rui_14', ten: '🦅 Kim Sí Điêu Quét 🦅', moTa: 'Thần điêu khổng lồ lướt qua quắp trúng bả vai quăng đạo hữu xuống bụi gai gai góc.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.15}' },
  { id: 'van_rui_15', ten: '🦊 Cửu Vĩ Yêu Hồ 🦊', moTa: 'Gặp Hồ Ly chín đuôi trêu đùa rút cạn pháp lực bằng mị thuật rồi thả đi.', loai: 'xui_xeo', hieuUngJson: '{"mpPhat":0.30}' },
  { id: 'van_rui_16', ten: '🪵 Địa Ngục Mộc Gai 🪵', moTa: 'Giẫm trúng cạm bẫy gai bằng linh mộc chứa kịch độc rải rác ngoài hoang dã.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.08}' },
  { id: 'van_rui_17', ten: '💀 Hồn Phách Lung Lay 💀', moTa: 'Tiếng hú ma mị từ nghĩa địa tà ma chấn động thần hồn đạo hữu làm kiệt quệ linh tính pháp hải.', loai: 'xui_xeo', hieuUngJson: '{"mpPhat":0.20}' },
  { id: 'van_rui_18', ten: '🛡️ Thiên Binh Dư Ba 🛡️', moTa: 'Lạc vào trận chiến của đại thế lực phái tiên nhân từ xa, dư ba kiếm khí quét qua làm tổn thương.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.16}' },
  { id: 'van_rui_19', ten: '🌀 Cổ Trận Hút Linh 🌀', moTa: 'Trận pháp thời cổ bẫy thú hút sạch pháp lực lưu thông trong cơ thể đạo hữu.', loai: 'xui_xeo', hieuUngJson: '{"mpPhat":0.25}' },
  { id: 'van_rui_20', ten: '🌫️ Sương Mù Lạc Lối 🌫️', moTa: 'Bị sương mù dày đặc che khuất tầm nhìn, loay hoay vận pháp lực duy trì hộ thể thoát ra.', loai: 'xui_xeo', hieuUngJson: '{"mpPhat":0.10}' },
  { id: 'van_rui_21', ten: '⚡ Thiên Đố Thần Lôi ⚡', moTa: 'Tư chất quá tốt làm thiên đạo đố kỵ giáng xuống một lôi phạt cảnh cáo nổ banh xác.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.18}' },
  { id: 'van_rui_22', ten: '🪡 Tà Tu Phi Châm 🪡', moTa: 'Bị trúng độc châm rậm rạp tẩm độc dược tàn phá sinh cơ đan điền.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.11}' },
  { id: 'van_rui_23', ten: '❄️ Băng Hàn Pháp Hải ❄️', moTa: 'Pháp lực trong đan điền bị luồng hàn khí vạn năm đông cứng tạm thời tiêu hao sức mạnh.', loai: 'xui_xeo', hieuUngJson: '{"mpPhat":0.20}' },
  { id: 'van_rui_24', ten: '🌋 Viêm Thú Phun Lửa 🌋', moTa: 'Con yêu thú rực lửa chui ra từ nham thạch thiêu rụi đạo bào và làm bỏng nặng cơ thể.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.15}' },
  { id: 'van_rui_25', ten: '🕸️ Ngũ Độc Cổ Trận 🕸️', moTa: 'Bị vây khốn trong trận pháp tà môn của Ngũ Độc Giáo, chất độc ăn mòn sinh cơ kinh người.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.22}' },
  { id: 'van_rui_26', ten: '🍄 Đoạt Phách Linh Cô 🍄', moTa: 'Hái nhầm loại nấm kịch độc phát ra bào tử mê ảo cắn rách khí hải đan điền.', loai: 'xui_xeo', hieuUngJson: '{"mpPhat":0.25}' },
  { id: 'van_rui_27', ten: '🌀 Không Không Huyễn Trận 🌀', moTa: 'Càng vùng vẫy phá trận càng bị tiêu hao linh lực vô ích trước khi phá được vây hãm.', loai: 'xui_xeo', hieuUngJson: '{"mpPhat":0.15}' },
  { id: 'van_rui_28', ten: '🧌 Cự Nhân Chấn Địa 🧌', moTa: 'Yêu thú cự nhân bước qua giẫm nát mặt đất tạo địa chấn cực lớn thổi bay đạo hữu chấn thương.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.10}' },
  { id: 'van_rui_29', ten: '🌫️ Độc Mộc Chướng Khí 🌫️', moTa: 'Hít phải chướng khí độc bốc ra từ đống gỗ mục nát trong rừng rậm rạp yêu yêu quái vật.', loai: 'xui_xeo', hieuUngJson: '{"hpPhat":0.15}' },
  { id: 'van_rui_30', ten: '🔄 Càn Khôn Nghịch Loạn 🔄', moTa: 'Không khí nghịch hành chèn ép toàn bộ sức mạnh tinh thần và pháp hải của đạo hữu kiệt quệ.', loai: 'xui_xeo', hieuUngJson: '{"mpPhat":0.25}' }
];
