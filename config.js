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
  // Vũ khí Thể Tu
  { id: 'kiem_go', ten: 'Kiếm Gỗ 🪵', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{"vat_cong":10}', yeuCauCanhGioi: 1, moTa: 'Thanh kiếm gỗ thô sơ cho tân thủ.' },
  { id: 'kiem_sat', ten: 'Thiết Kiếm ⚔️', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{"vat_cong":30}', yeuCauCanhGioi: 10, moTa: 'Kiếm sắt rèn đúc kỹ lưỡng, sắc bén sắc lạnh.' },
  { id: 'kiem_huyen_thiet', ten: 'Huyền Thiết Trọng Kiếm 🗡️', loai: 'Vũ khí', doHiem: 'Cực hiếm', giaCoSo: 2500, chiSoJson: '{"vat_cong":100}', yeuCauCanhGioi: 19, moTa: 'Trọng kiếm đúc bằng huyền thiết nặng ngàn cân, chém sắt như bùn.' },
  
  // Vũ khí Pháp Tu
  { id: 'truong_go', ten: 'Mộc Trượng 🪵', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{"phap_cong":10}', yeuCauCanhGioi: 1, moTa: 'Khúc gỗ dẫn linh khí thô sơ.' },
  { id: 'truong_truc', ten: 'Trúc Trượng 🎋', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{"phap_cong":30}', yeuCauCanhGioi: 10, moTa: 'Tương truyền làm bằng Linh Trúc ngàn năm, tương thích pháp lực rất tốt.' },
  { id: 'phap_bao_huyen_mon', ten: 'Huyền Môn Ngọc Bội 🔮', loai: 'Vũ khí', doHiem: 'Cực hiếm', giaCoSo: 2500, chiSoJson: '{"phap_cong":100}', yeuCauCanhGioi: 19, moTa: 'Linh bảo ngọc bội hộ thân của đệ tử Huyền Môn, hội tụ thiên địa linh khí.' },

  // Giáp (Dùng chung)
  { id: 'ao_vai', ten: 'Đạo Bào Vải 🥋', loai: 'Giáp', doHiem: 'Thường', giaCoSo: 100, chiSoJson: '{"vat_phong":5,"phap_phong":5,"hp":50}', yeuCauCanhGioi: 1, moTa: 'Áo vải đệ tử mặc hàng ngày.' },
  { id: 'ao_da', ten: 'Thú Bì Giáp 🛡️', loai: 'Giáp', doHiem: 'Hiếm', giaCoSo: 500, chiSoJson: '{"vat_phong":15,"phap_phong":15,"hp":150}', yeuCauCanhGioi: 10, moTa: 'Giáp làm bằng da thú yêu cấp thấp, dẻo dai bảo vệ cơ thể.' },
  { id: 'giap_huyen_thiet', ten: 'Huyền Thiết Linh Giáp 🥋', loai: 'Giáp', doHiem: 'Cực hiếm', giaCoSo: 2500, chiSoJson: '{"vat_phong":50,"phap_phong":50,"hp":500}', yeuCauCanhGioi: 19, moTa: 'Giáp hộ thân đúc bằng huyền thiết pha lẫn linh thạch, phòng ngự cực cao.' },

  // Đan dược
  { id: 'dan_hp_1', ten: 'Bổ Huyết Đan (Sơ) 💊', loai: 'Đan dược', doHiem: 'Thường', giaCoSo: 50, chiSoJson: '{"hp_hoi":100}', yeuCauCanhGioi: 1, moTa: 'Phục hồi 100 điểm khí huyết (HP) bị tổn thương.' },
  { id: 'dan_hp_2', ten: 'Bổ Huyết Đan (Trung) 🧪', loai: 'Đan dược', doHiem: 'Hiếm', giaCoSo: 200, chiSoJson: '{"hp_hoi":500}', yeuCauCanhGioi: 10, moTa: 'Phục hồi 500 điểm khí huyết (HP) bị tổn thương.' },
  { id: 'dan_mp_1', ten: 'Hồi Thần Đan (Sơ) 💧', loai: 'Đan dược', doHiem: 'Thường', giaCoSo: 50, chiSoJson: '{"mp_hoi":50}', yeuCauCanhGioi: 1, moTa: 'Khôi phục 50 điểm linh lực pháp hải (MP).' },
  { id: 'dan_mp_2', ten: 'Hồi Thần Đan (Trung) 🌊', loai: 'Đan dược', doHiem: 'Hiếm', giaCoSo: 200, chiSoJson: '{"mp_hoi":200}', yeuCauCanhGioi: 10, moTa: 'Khôi phục 200 điểm linh lực pháp hải (MP).' },

  // Linh thảo & Vật liệu
  { id: 'linh_chi', ten: 'U Minh Linh Chi 🍄', loai: 'Linh thảo', doHiem: 'Thường', giaCoSo: 30, chiSoJson: '{}', yeuCauCanhGioi: 1, moTa: 'Linh thảo chứa ít linh khí mọc nơi ẩm ướt.' },
  { id: 'nhan_sam', ten: 'Tuyết Sơn Nhân Sâm 🥕', loai: 'Linh thảo', doHiem: 'Hiếm', giaCoSo: 120, chiSoJson: '{}', yeuCauCanhGioi: 10, moTa: 'Nhân sâm ngàn năm thu hoạch trên đỉnh núi tuyết hoang lạnh.' }
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
  }
];
