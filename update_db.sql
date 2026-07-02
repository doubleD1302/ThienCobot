-- SQL Update Script for Thien Co RPG Bot - Giai đoạn 2
-- Dùng cho DataGrip để cập nhật cấu trúc database và chèn dữ liệu mẫu

-- ==========================================
-- 1. DÀNH CHO MYSQL / TiDB
-- ==========================================
/*
-- 1.1 Thêm các cột tuvi tự động nếu chưa có vào bảng players
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_update_tuvi DATETIME NULL;
ALTER TABLE players ADD COLUMN IF NOT EXISTS linh_luc_du DOUBLE NOT NULL DEFAULT 0.0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS linh_thach_du DOUBLE NOT NULL DEFAULT 0.0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS the_luc INT NOT NULL DEFAULT 200;
ALTER TABLE players ADD COLUMN IF NOT EXISTS the_luc_max INT NOT NULL DEFAULT 200;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_reset_theluc DATE NULL;
ALTER TABLE players ADD COLUMN IF NOT EXISTS thoi_gian_auto INT NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS kich_hoat_auto BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS thong_ke_auto_json TEXT NULL;

-- 1.2 Tạo bảng chứa danh sách vật phẩm tĩnh
CREATE TABLE IF NOT EXISTS items (
  id VARCHAR(50) PRIMARY KEY,
  ten VARCHAR(100) NOT NULL,
  loai VARCHAR(30) NOT NULL,
  do_hiem VARCHAR(20) NOT NULL,
  gia_co_so INT NOT NULL DEFAULT 0,
  chi_so_json TEXT NOT NULL,
  yeu_cau_canh_gioi INT NOT NULL DEFAULT 1,
  mo_ta TEXT NULL,
  active_skill_json TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.3 Tạo bảng balo / túi đồ người chơi
CREATE TABLE IF NOT EXISTS inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  item_id VARCHAR(50) NOT NULL,
  so_luong INT NOT NULL DEFAULT 1,
  trang_bi BOOLEAN NOT NULL DEFAULT FALSE,
  nang_cap_sao INT NOT NULL DEFAULT 0,
  dong_chi_so_json TEXT NULL,
  khoa BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.4 Tạo bảng chứa kỹ năng môn phái tĩnh
CREATE TABLE IF NOT EXISTS skills (
  id VARCHAR(50) PRIMARY KEY,
  ten VARCHAR(100) NOT NULL,
  loai VARCHAR(30) NOT NULL,
  sat_thuong INT NOT NULL DEFAULT 0,
  cooldown INT NOT NULL DEFAULT 0,
  yeu_cau_canh_gioi INT NOT NULL DEFAULT 1,
  cong_phap_id VARCHAR(50) NULL,
  mo_ta TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.5 Tạo bảng chứa kỹ năng người chơi đã học
CREATE TABLE IF NOT EXISTS player_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  skill_id VARCHAR(50) NOT NULL,
  cap_do INT NOT NULL DEFAULT 1,
  kinh_nghiem_skill INT NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.6 Tạo bảng chứa danh sách bí cảnh phụ bản
CREATE TABLE IF NOT EXISTS dungeons (
  id VARCHAR(50) PRIMARY KEY,
  ten VARCHAR(100) NOT NULL,
  cap_do_yeu_cau INT NOT NULL DEFAULT 1,
  canh_gioi_yeu_cau_text VARCHAR(50) NOT NULL,
  quai_vat_json TEXT NOT NULL,
  thuong_json TEXT NOT NULL,
  drops_json TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.7 Tạo bảng Thiên Đạo Lục (Ký sự)
CREATE TABLE IF NOT EXISTS thien_dao_luc (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dao_nien INT NOT NULL DEFAULT 1,
  su_kien TEXT NOT NULL,
  loai VARCHAR(50) NOT NULL DEFAULT 'System',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.8 Tạo bảng Sự kiện cơ duyên lịch luyện (Adventure events)
CREATE TABLE IF NOT EXISTS adventure_events (
  id VARCHAR(50) PRIMARY KEY,
  ten VARCHAR(100) NOT NULL,
  mo_ta TEXT NOT NULL,
  loai VARCHAR(30) NOT NULL,
  hieu_ung_json TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.9 Tạo bảng Gift Code và lịch sử sử dụng Gift Code cho MySQL
CREATE TABLE IF NOT EXISTS gift_codes (
  code VARCHAR(50) PRIMARY KEY,
  linh_thach INT NOT NULL DEFAULT 0,
  linh_luc INT NOT NULL DEFAULT 0,
  vnd INT NOT NULL DEFAULT 0,
  items_json TEXT NOT NULL,
  expired_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS player_gift_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  code VARCHAR(50) NOT NULL,
  used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE,
  FOREIGN KEY (code) REFERENCES gift_codes(code) ON DELETE CASCADE,
  UNIQUE(user_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
*/

-- ==========================================
-- 2. DÀNH CHO SQLITE (Mặc định chạy ở local)
-- ==========================================

-- 2.1 Tạo các bảng nếu chưa có
CREATE TABLE IF NOT EXISTS items (
  id VARCHAR(50) PRIMARY KEY,
  ten VARCHAR(100) NOT NULL,
  loai VARCHAR(30) NOT NULL,
  do_hiem VARCHAR(20) NOT NULL,
  gia_co_so INTEGER NOT NULL DEFAULT 0,
  chi_so_json TEXT NOT NULL,
  yeu_cau_canh_gioi INTEGER NOT NULL DEFAULT 1,
  mo_ta TEXT,
  active_skill_json TEXT
);

CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id BIGINT NOT NULL,
  item_id VARCHAR(50) NOT NULL,
  so_luong INTEGER NOT NULL DEFAULT 1,
  trang_bi BOOLEAN NOT NULL DEFAULT 0,
  nang_cap_sao INTEGER NOT NULL DEFAULT 0,
  dong_chi_so_json TEXT NULL,
  FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skills (
  id VARCHAR(50) PRIMARY KEY,
  ten VARCHAR(100) NOT NULL,
  loai VARCHAR(30) NOT NULL,
  sat_thuong INTEGER NOT NULL DEFAULT 0,
  cooldown INTEGER NOT NULL DEFAULT 0,
  yeu_cau_canh_gioi INTEGER NOT NULL DEFAULT 1,
  cong_phap_id VARCHAR(50),
  mo_ta TEXT
);

CREATE TABLE IF NOT EXISTS player_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id BIGINT NOT NULL,
  skill_id VARCHAR(50) NOT NULL,
  cap_do INTEGER NOT NULL DEFAULT 1,
  kinh_nghiem_skill INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- 2.6 Tạo bảng bí cảnh
CREATE TABLE IF NOT EXISTS dungeons (
  id VARCHAR(50) PRIMARY KEY,
  ten VARCHAR(100) NOT NULL,
  cap_do_yeu_cau INTEGER NOT NULL DEFAULT 1,
  canh_gioi_yeu_cau_text VARCHAR(50) NOT NULL,
  quai_vat_json TEXT NOT NULL,
  thuong_json TEXT NOT NULL,
  drops_json TEXT NOT NULL
);

-- 2.7 Tạo bảng Thiên Đạo Lục
CREATE TABLE IF NOT EXISTS thien_dao_luc (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dao_nien INTEGER NOT NULL DEFAULT 1,
  su_kien TEXT NOT NULL,
  loai VARCHAR(50) NOT NULL DEFAULT 'System',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.8 Tạo bảng Sự kiện lịch luyện
CREATE TABLE IF NOT EXISTS adventure_events (
  id VARCHAR(50) PRIMARY KEY,
  ten VARCHAR(100) NOT NULL,
  mo_ta TEXT NOT NULL,
  loai VARCHAR(30) NOT NULL,
  hieu_ung_json TEXT NOT NULL
);

-- 2.9 Tạo bảng Gift Code và lịch sử sử dụng Gift Code cho SQLite
CREATE TABLE IF NOT EXISTS gift_codes (
  code VARCHAR(50) PRIMARY KEY,
  linh_thach INTEGER NOT NULL DEFAULT 0,
  linh_luc INTEGER NOT NULL DEFAULT 0,
  vnd INTEGER NOT NULL DEFAULT 0,
  items_json TEXT NOT NULL DEFAULT '[]',
  expired_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_gift_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id BIGINT NOT NULL,
  code VARCHAR(50) NOT NULL,
  used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE,
  FOREIGN KEY (code) REFERENCES gift_codes(code) ON DELETE CASCADE,
  UNIQUE(user_id, code)
);

-- ==========================================
-- 3. DỮ LIỆU MẪU (DÙNG ĐƯỢC CHO CẢ MYSQL VÀ SQLITE)
-- ==========================================

-- 3.1 Chèn dữ liệu mẫu vào bảng items (Vật phẩm mẫu)
REPLACE INTO items (id, ten, loai, do_hiem, gia_co_so, chi_so_json, yeu_cau_canh_gioi, mo_ta) VALUES
-- LUYỆN KHÍ (YÊU CẦU CẤP 1)
('kiem_go', 'Kiếm Gỗ 🪵', 'Vũ khí', 'Thường', 100, '{"vat_cong":10}', 1, 'Thanh kiếm gỗ thô sơ cho tân thủ.'),
('kiem_tien_tan_thu', 'Tân Thủ Tiên Kiếm 🗡️', 'Vũ khí', 'Cực hiếm', 1000, '{"vat_cong":35}', 1, 'Thần binh rớt từ thượng giới dành cho tân thủ Luyện Khí.'),
('truong_go', 'Mộc Trượng 🪵', 'Vũ khí', 'Thường', 100, '{"phap_cong":10}', 1, 'Khúc gỗ dẫn linh khí thô sơ.'),
('truong_tien_tan_thu', 'Tân Thủ Linh Trượng 🎋', 'Vũ khí', 'Cực hiếm', 1000, '{"phap_cong":35}', 1, 'Linh trượng ban tặng cho tân thủ Luyện Khí có tư chất cực tốt.'),
('ao_vai', 'Đạo Bào Vải 🥋', 'Giáp', 'Thường', 100, '{"vat_phong":5,"phap_phong":5,"hp":50}', 1, 'Áo vải đệ tử mặc hàng ngày.'),
('giap_tien_tan_thu', 'Tân Thủ Tiên Giáp 🥋', 'Giáp', 'Cực hiếm', 1000, '{"vat_phong":20,"phap_phong":20,"hp":200}', 1, 'Linh giáp phòng ngự hộ thể hoàn mỹ cho tân thủ Luyện Khí.'),
('dan_hp_1', 'Bổ Huyết Đan (Sơ) 💊', 'Đan dược', 'Thường', 50, '{"hp_hoi":100}', 1, 'Phục hồi 100 điểm khí huyết (HP) bị tổn thương.'),
('dan_mp_1', 'Hồi Thần Đan (Sơ) 💧', 'Đan dược', 'Thường', 50, '{"mp_hoi":50}', 1, 'Khôi phục 50 điểm linh lực pháp hải (MP).'),
('linh_chi', 'U Minh Linh Chi 🍄', 'Linh thảo', 'Thường', 30, '{}', 1, 'Linh thảo chứa ít linh khí mọc nơi ẩm ướt.'),

-- TRÚC CƠ (YÊU CẦU CẤP 10)
('kiem_sat_nang', 'Trọng Thiết Thiết Kiếm ⚔️', 'Vũ khí', 'Thường', 300, '{"vat_cong":25}', 10, 'Thiết kiếm đúc nặng nề, chỉ có tu sĩ Trúc Cơ trở lên mới đủ lực nhấc.'),
('kiem_sat', 'Thiết Kiếm ⚔️', 'Vũ khí', 'Hiếm', 500, '{"vat_cong":30}', 10, 'Kiếm sắt rèn đúc kỹ lưỡng, sắc bén sắc lạnh.'),
('truong_truc_thuong', 'Phàm Trúc Trượng 🪵', 'Vũ khí', 'Thường', 300, '{"phap_cong":25}', 10, 'Khúc trúc già tầm thường nhưng dẫn linh khí khá tốt.'),
('truong_truc', 'Trúc Trượng 🎋', 'Vũ khí', 'Hiếm', 500, '{"phap_cong":30}', 10, 'Tương truyền làm bằng Linh Trúc ngàn năm, tương thích pháp lực rất tốt.'),
('ao_vai_day', 'Đạo Bào Vải Dày 🥋', 'Giáp', 'Thường', 300, '{"vat_phong":10,"phap_phong":10,"hp":100}', 10, 'Áo vải nhiều lớp gia cố bảo vệ tu sĩ Trúc Cơ.'),
('ao_da', 'Thú Bì Giáp 🛡️', 'Giáp', 'Hiếm', 500, '{"vat_phong":15,"phap_phong":15,"hp":150}', 10, 'Giáp làm bằng da thú yêu cấp thấp, dẻo dai bảo vệ cơ thể.'),
('dan_hp_2', 'Bổ Huyết Đan (Trung) 🧪', 'Đan dược', 'Hiếm', 200, '{"hp_hoi":500}', 10, 'Phục hồi 500 điểm khí huyết (HP) bị tổn thương.'),
('dan_mp_2', 'Hồi Thần Đan (Trung) 🌊', 'Đan dược', 'Hiếm', 200, '{"mp_hoi":200}', 10, 'Khôi phục 200 điểm linh lực pháp hải (MP).'),
('nhan_sam', 'Tuyết Sơn Nhân Sâm 🥕', 'Linh thảo', 'Hiếm', 120, '{}', 10, 'Nhân sâm ngàn năm thu hoạch trên đỉnh núi tuyết hoang lạnh.'),

-- HÓA THẦN (YÊU CẦU CẤP 19)
('kiem_sat_co_khi', 'Cổ Thiết Trọng Binh 🗡️', 'Vũ khí', 'Thường', 1500, '{"vat_cong":60}', 19, 'Thiết kiếm đúc từ quặng thô cổ xưa, cực kỳ thô kệch nhưng sức nặng kinh người.'),
('kiem_huyen_thiet', 'Huyền Thiết Trọng Kiếm 🗡️', 'Vũ khí', 'Cực hiếm', 2500, '{"vat_cong":100}', 19, 'Trọng kiếm đúc bằng huyền thiết nặng ngàn cân, chém sắc như bùn.'),
('truong_go_co_loi', 'Cổ Mộc Lôi Trượng ⚡', 'Vũ khí', 'Thường', 1500, '{"phap_cong":60}', 19, 'Gậy gỗ mục từ cây cổ thụ bị sét đánh ngàn năm trước, chứa chút lôi điện tàn dư.'),
('phap_bao_huyen_mon', 'Huyền Môn Ngọc Bội 🔮', 'Vũ khí', 'Cực hiếm', 2500, '{"phap_cong":100}', 19, 'Linh bảo ngọc bội hộ thân của đệ tử Huyền Môn, hội tụ thiên địa linh khí.'),
('ao_da_co_lan', 'Cổ Lân Thú Giáp 🥋', 'Giáp', 'Thường', 1500, '{"vat_phong":35,"phap_phong":35,"hp":350}', 19, 'Giáp da thú yêu phong hóa ngàn năm, phòng ngự thô sơ nhưng khá chắc chắn.'),
('giap_huyen_thiet', 'Huyền Thiết Linh Giáp 🥋', 'Giáp', 'Cực hiếm', 2500, '{"vat_phong":50,"phap_phong":50,"hp":500}', 19, 'Giáp hộ thân đúc bằng huyền thiết pha lẫn linh thạch, phòng ngự cực cao.'),
-- NGỌC BỘI
('ngoc_boi_tan_thu', 'Ngọc Bội Gỗ 🪵', 'Ngọc Bội', 'Thường', 150, '{"hp":30}', 1, 'Ngọc bội gỗ chứa sinh khí nhẹ.'),
('ngoc_boi_linh_ngoc', 'Linh Ngọc Bội 📿', 'Ngọc Bội', 'Hiếm', 600, '{"hp":120,"mp":50}', 10, 'Ngọc bội làm từ linh thạch tốt cho khí huyết.'),
('ngoc_boi_tien_van', 'Tiên Vân Ngọc Bội 🔮', 'Ngọc Bội', 'Cực hiếm', 2800, '{"hp":400,"mp":200}', 19, 'Tuyệt phẩm ngọc bội hộ thân thượng cổ.'),
-- CỔ BẢO CHỦ ĐỘNG
('co_bao_kiem_khi', 'Thượng Cổ Kiếm Hoàn 🗡️', 'Cổ Bảo Chủ Động', 'Hiếm', 800, '{"vat_cong":15}', 1, 'Cổ bảo tự kích hoạt phóng ra kiếm khí sát thương địch.'),
('co_bao_dong_tu', 'Càn Khôn Đỉnh 🏺', 'Cổ Bảo Chủ Động', 'Hiếm', 1600, '{"vat_phong":20,"hp":150}', 10, 'Cổ bảo lò luyện đập mạnh yêu thú.'),
('co_bao_tien_dan', 'Thái Thượng Hồ Lô 🍶', 'Cổ Bảo Chủ Động', 'Cực hiếm', 4500, '{"phap_cong":80,"mp":300}', 19, 'Hồ lô cất giấu tiên khí tự động oanh tạc địch.'),
-- PHÁP BẢO
('phap_bao_ho_than', 'Phù Vân Phiên 🏳️', 'Pháp Bảo', 'Hiếm', 700, '{"phap_phong":15}', 1, 'Pháp bảo tạo khiên ngưng tụ thủy văn phòng ngự.'),
('phap_bao_cong_kich', 'Phá Thiên Chủy 🔱', 'Pháp Bảo', 'Hiếm', 1500, '{"phap_cong":30}', 10, 'Pháp bảo tấn công phóng hỏa tiễn.'),
('phap_bao_hon_ton', 'Hỗn Độn Chung 🔔', 'Pháp Bảo', 'Cực hiếm', 5000, '{"vat_cong":50,"phap_cong":50,"hp":300}', 19, 'Chuông vàng chấn động tiên hải.');

-- 100 Pháp bảo cổ xưa cho tu sĩ cảnh giới Nguyên Anh trở xuống với kỹ năng chủ động riêng biệt
REPLACE INTO items (id, ten, loai, do_hiem, gia_co_so, chi_so_json, yeu_cau_canh_gioi, mo_ta, active_skill_json) VALUES
('pb_lk_1', 'Thanh Phiên 🏳️', 'Pháp Bảo', 'Thường', 348, '{"phap_cong":22}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Hóa Thần Chi Uy 🌌","loai":"tang_cong_pct","triGia":5,"duration":2,"moTa":"Tăng 5% Công kích trong 2 hiệp đầu trận."}'),
('pb_lk_2', 'Bạch Ấn ⛩️', 'Pháp Bảo', 'Hiếm', 447, '{"hp":85,"vat_phong":5}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Băng Thiên Tuyết Địa ❄️","loai":"tan_cong","triGia":52,"duration":0,"moTa":"Gây 52 sát thương cố định lên đối phương khi vào trận."}'),
('pb_lk_3', 'Vô Cực Tháp 🗼', 'Pháp Bảo', 'Hiếm', 379, '{"hp":55,"vat_phong":3}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Thủy Vân Trị Liệu 🌊","loai":"hoi_mau_pct","triGia":5,"duration":0,"moTa":"Hồi phục 5% HP tối đa của bản thân khi vào trận."}'),
('pb_lk_4', 'Ma Bình 🍶', 'Pháp Bảo', 'Huyền thoại', 343, '{"mp":32,"phap_phong":5}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Ngũ Hành Linh Lực 🌀","loai":"tang_cong_pct","triGia":5,"duration":2,"moTa":"Tăng 5% Công kích trong 2 hiệp đầu trận."}'),
('pb_lk_5', 'Bát Quái Kiếm 🗡️', 'Pháp Bảo', 'Cực hiếm', 262, '{"vat_cong":26}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Lôi Đình Vạn Quân ⚡","loai":"tan_cong","triGia":55,"duration":0,"moTa":"Gây 55 sát thương cố định lên đối phương khi vào trận."}'),
('pb_lk_6', 'Thất Tinh Châu 🔮', 'Pháp Bảo', 'Hiếm', 361, '{"phap_cong":18}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Sinh Mệnh Chi Quang ❇️","loai":"hoi_mau_pct","triGia":5,"duration":0,"moTa":"Hồi phục 5% HP tối đa của bản thân khi vào trận."}'),
('pb_lk_7', 'Xích Châu 🔮', 'Pháp Bảo', 'Cực hiếm', 284, '{"phap_cong":15}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Chân Ma Chi Nộ 👹","loai":"tang_cong_pct","triGia":5,"duration":2,"moTa":"Tăng 5% Công kích trong 2 hiệp đầu trận."}'),
('pb_lk_8', 'Thanh Kiếm 🗡️', 'Pháp Bảo', 'Cực hiếm', 200, '{"vat_cong":11}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Phá Thiên Nhất Kích ☄️","loai":"tan_cong","triGia":58,"duration":0,"moTa":"Gây 58 sát thương cố định lên đối phương khi vào trận."}'),
('pb_lk_9', 'Bạch Bình 🍶', 'Pháp Bảo', 'Thường', 385, '{"mp":26,"phap_phong":4}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Mộc Linh Tiên Lộ 🍃","loai":"hoi_mau_pct","triGia":5,"duration":0,"moTa":"Hồi phục 5% HP tối đa của bản thân khi vào trận."}'),
('pb_lk_10', 'Vô Cực Tháp 🗼', 'Pháp Bảo', 'Hiếm', 208, '{"hp":65,"vat_phong":4}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Kim Cang Thần Lực 💪","loai":"tang_cong_pct","triGia":5,"duration":2,"moTa":"Tăng 5% Công kích trong 2 hiệp đầu trận."}'),
('pb_lk_11', 'Ma Ấn ⛩️', 'Pháp Bảo', 'Hiếm', 471, '{"hp":110,"vat_phong":7}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"U Minh Luyện Hỏa 🔥","loai":"tan_cong","triGia":61,"duration":0,"moTa":"Gây 61 sát thương cố định lên đối phương khi vào trận."}'),
('pb_lk_12', 'Bát Quái Phiên 🏳️', 'Pháp Bảo', 'Hiếm', 322, '{"phap_cong":27}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Cam Lộ Linh Quang 💧","loai":"hoi_mau_pct","triGia":5,"duration":0,"moTa":"Hồi phục 5% HP tối đa của bản thân khi vào trận."}'),
('pb_lk_13', 'Thất Tinh Châm 🪡', 'Pháp Bảo', 'Hiếm', 411, '{"vat_cong":12}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Tử Khí Đông Lai 🔮","loai":"tang_cong_pct","triGia":5,"duration":2,"moTa":"Tăng 5% Công kích trong 2 hiệp đầu trận."}'),
('pb_lk_14', 'Xích Phiên 🏳️', 'Pháp Bảo', 'Hiếm', 238, '{"phap_cong":26}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Huyền Âm Kiếm Khí 🗡️","loai":"tan_cong","triGia":64,"duration":0,"moTa":"Gây 64 sát thương cố định lên đối phương khi vào trận."}'),
('pb_lk_15', 'Thanh Ấn ⛩️', 'Pháp Bảo', 'Hiếm', 237, '{"hp":110,"vat_phong":7}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Hồi Xuân Thuật 🌿","loai":"hoi_mau_pct","triGia":5,"duration":0,"moTa":"Hồi phục 5% HP tối đa của bản thân khi vào trận."}'),
('pb_lk_16', 'Bạch Tháp 🗼', 'Pháp Bảo', 'Hiếm', 460, '{"hp":70,"vat_phong":4}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Hóa Thần Chi Uy 🌌","loai":"tang_cong_pct","triGia":5,"duration":2,"moTa":"Tăng 5% Công kích trong 2 hiệp đầu trận."}'),
('pb_lk_17', 'Vô Cực Bình 🍶', 'Pháp Bảo', 'Hiếm', 282, '{"mp":50,"phap_phong":8}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Băng Thiên Tuyết Địa ❄️","loai":"tan_cong","triGia":67,"duration":0,"moTa":"Gây 67 sát thương cố định lên đối phương khi vào trận."}'),
('pb_lk_18', 'Ma Kiếm 🗡️', 'Pháp Bảo', 'Hiếm', 316, '{"vat_cong":29}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Thủy Vân Trị Liệu 🌊","loai":"hoi_mau_pct","triGia":5,"duration":0,"moTa":"Hồi phục 5% HP tối đa của bản thân khi vào trận."}'),
('pb_lk_19', 'Bát Quái Châu 🔮', 'Pháp Bảo', 'Thường', 417, '{"phap_cong":15}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Ngũ Hành Linh Lực 🌀","loai":"tang_cong_pct","triGia":5,"duration":2,"moTa":"Tăng 5% Công kích trong 2 hiệp đầu trận."}'),
('pb_lk_20', 'Thất Tinh Châu 🔮', 'Pháp Bảo', 'Hiếm', 256, '{"phap_cong":27}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Lôi Đình Vạn Quân ⚡","loai":"tan_cong","triGia":70,"duration":0,"moTa":"Gây 70 sát thương cố định lên đối phương khi vào trận."}'),
('pb_lk_21', 'Xích Kiếm 🗡️', 'Pháp Bảo', 'Thường', 453, '{"vat_cong":27}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Sinh Mệnh Chi Quang ❇️","loai":"hoi_mau_pct","triGia":5,"duration":0,"moTa":"Hồi phục 5% HP tối đa của bản thân khi vào trận."}'),
('pb_lk_22', 'Thanh Bình 🍶', 'Pháp Bảo', 'Hiếm', 327, '{"mp":38,"phap_phong":6}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Chân Ma Chi Nộ 👹","loai":"tang_cong_pct","triGia":5,"duration":2,"moTa":"Tăng 5% Công kích trong 2 hiệp đầu trận."}'),
('pb_lk_23', 'Bạch Tháp 🗼', 'Pháp Bảo', 'Hiếm', 376, '{"hp":80,"vat_phong":5}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Phá Thiên Nhất Kích ☄️","loai":"tan_cong","triGia":73,"duration":0,"moTa":"Gây 73 sát thương cố định lên đối phương khi vào trận."}'),
('pb_lk_24', 'Vô Cực Ấn ⛩️', 'Pháp Bảo', 'Hiếm', 255, '{"hp":115,"vat_phong":7}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Mộc Linh Tiên Lộ 🍃","loai":"hoi_mau_pct","triGia":5,"duration":0,"moTa":"Hồi phục 5% HP tối đa của bản thân khi vào trận."}'),
('pb_lk_25', 'Ma Phiên 🏳️', 'Pháp Bảo', 'Hiếm', 266, '{"phap_cong":21}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Kim Cang Thần Lực 💪","loai":"tang_cong_pct","triGia":5,"duration":2,"moTa":"Tăng 5% Công kích trong 2 hiệp đầu trận."}'),
('pb_tc_1', 'Cửu Thiên Châm 🪡', 'Pháp Bảo', 'Hiếm', 1176, '{"vat_cong":72}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Hóa Thần Chi Uy 🌌","loai":"tang_cong_pct","triGia":10,"duration":3,"moTa":"Tăng 10% Công kích trong 3 hiệp đầu trận."}'),
('pb_tc_2', 'U Kính 🔮', 'Pháp Bảo', 'Cực hiếm', 942, '{"phap_cong":46}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Băng Thiên Tuyết Địa ❄️","loai":"tan_cong","triGia":124,"duration":0,"moTa":"Gây 124 sát thương cố định lên đối phương khi vào trận."}'),
('pb_tc_3', 'Hoàng Đỉnh 🏺', 'Pháp Bảo', 'Hiếm', 608, '{"hp":385,"vat_phong":25}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Thủy Vân Trị Liệu 🌊","loai":"hoi_mau_pct","triGia":10,"duration":0,"moTa":"Hồi phục 10% HP tối đa của bản thân khi vào trận."}'),
('pb_tc_4', 'Thái Cổ Kiếm 🗡️', 'Pháp Bảo', 'Hiếm', 755, '{"vat_cong":52}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Ngũ Hành Linh Lực 🌀","loai":"tang_cong_pct","triGia":10,"duration":3,"moTa":"Tăng 10% Công kích trong 3 hiệp đầu trận."}'),
('pb_tc_5', 'Huyền Hồ Lô 🍶', 'Pháp Bảo', 'Cực hiếm', 733, '{"mp":146,"phap_phong":24}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Lôi Đình Vạn Quân ⚡","loai":"tan_cong","triGia":130,"duration":0,"moTa":"Gây 130 sát thương cố định lên đối phương khi vào trận."}'),
('pb_tc_6', 'Thần Ấn ⛩️', 'Pháp Bảo', 'Hiếm', 693, '{"hp":250,"vat_phong":16}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Sinh Mệnh Chi Quang ❇️","loai":"hoi_mau_pct","triGia":10,"duration":0,"moTa":"Hồi phục 10% HP tối đa của bản thân khi vào trận."}'),
('pb_tc_7', 'Càn Khôn Bình 🍶', 'Pháp Bảo', 'Huyền thoại', 1095, '{"mp":108,"phap_phong":18}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Chân Ma Chi Nộ 👹","loai":"tang_cong_pct","triGia":10,"duration":3,"moTa":"Tăng 10% Công kích trong 3 hiệp đầu trận."}'),
('pb_tc_8', 'Cửu Thiên Ấn ⛩️', 'Pháp Bảo', 'Hiếm', 1084, '{"hp":325,"vat_phong":21}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Phá Thiên Nhất Kích ☄️","loai":"tan_cong","triGia":136,"duration":0,"moTa":"Gây 136 sát thương cố định lên đối phương khi vào trận."}'),
('pb_tc_9', 'U Hồ Lô 🍶', 'Pháp Bảo', 'Hiếm', 774, '{"mp":132,"phap_phong":22}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Mộc Linh Tiên Lộ 🍃","loai":"hoi_mau_pct","triGia":10,"duration":0,"moTa":"Hồi phục 10% HP tối đa của bản thân khi vào trận."}'),
('pb_tc_10', 'Hoàng Kiếm 🗡️', 'Pháp Bảo', 'Thường', 972, '{"vat_cong":51}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Kim Cang Thần Lực 💪","loai":"tang_cong_pct","triGia":10,"duration":3,"moTa":"Tăng 10% Công kích trong 3 hiệp đầu trận."}'),
('pb_tc_11', 'Thái Cổ Đỉnh 🏺', 'Pháp Bảo', 'Thường', 947, '{"hp":390,"vat_phong":26}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"U Minh Luyện Hỏa 🔥","loai":"tan_cong","triGia":142,"duration":0,"moTa":"Gây 142 sát thương cố định lên đối phương khi vào trận."}'),
('pb_tc_12', 'Huyền Kính 🔮', 'Pháp Bảo', 'Thường', 759, '{"phap_cong":64}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Cam Lộ Linh Quang 💧","loai":"hoi_mau_pct","triGia":10,"duration":0,"moTa":"Hồi phục 10% HP tối đa của bản thân khi vào trận."}'),
('pb_tc_13', 'Thần Châm 🪡', 'Pháp Bảo', 'Thần cấp', 1169, '{"vat_cong":53}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Tử Khí Đông Lai 🔮","loai":"tang_cong_pct","triGia":10,"duration":3,"moTa":"Tăng 10% Công kích trong 3 hiệp đầu trận."}'),
('pb_tc_14', 'Càn Khôn Châm 🪡', 'Pháp Bảo', 'Cực hiếm', 612, '{"vat_cong":57}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Huyền Âm Kiếm Khí 🗡️","loai":"tan_cong","triGia":148,"duration":0,"moTa":"Gây 148 sát thương cố định lên đối phương khi vào trận."}'),
('pb_tc_15', 'Cửu Thiên Kính 🔮', 'Pháp Bảo', 'Hiếm', 1149, '{"phap_cong":49}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Hồi Xuân Thuật 🌿","loai":"hoi_mau_pct","triGia":10,"duration":0,"moTa":"Hồi phục 10% HP tối đa của bản thân khi vào trận."}'),
('pb_tc_16', 'U Đỉnh 🏺', 'Pháp Bảo', 'Cực hiếm', 941, '{"hp":365,"vat_phong":24}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Hóa Thần Chi Uy 🌌","loai":"tang_cong_pct","triGia":10,"duration":3,"moTa":"Tăng 10% Công kích trong 3 hiệp đầu trận."}'),
('pb_tc_17', 'Hoàng Kiếm 🗡️', 'Pháp Bảo', 'Huyền thoại', 1039, '{"vat_cong":72}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Băng Thiên Tuyết Địa ❄️","loai":"tan_cong","triGia":154,"duration":0,"moTa":"Gây 154 sát thương cố định lên đối phương khi vào trận."}'),
('pb_tc_18', 'Thái Cổ Hồ Lô 🍶', 'Pháp Bảo', 'Hiếm', 738, '{"mp":156,"phap_phong":26}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Thủy Vân Trị Liệu 🌊","loai":"hoi_mau_pct","triGia":10,"duration":0,"moTa":"Hồi phục 10% HP tối đa của bản thân khi vào trận."}'),
('pb_tc_19', 'Huyền Ấn ⛩️', 'Pháp Bảo', 'Hiếm', 869, '{"hp":255,"vat_phong":17}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Ngũ Hành Linh Lực 🌀","loai":"tang_cong_pct","triGia":10,"duration":3,"moTa":"Tăng 10% Công kích trong 3 hiệp đầu trận."}'),
('pb_tc_20', 'Thần Bình 🍶', 'Pháp Bảo', 'Hiếm', 1009, '{"mp":98,"phap_phong":16}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Lôi Đình Vạn Quân ⚡","loai":"tan_cong","triGia":160,"duration":0,"moTa":"Gây 160 sát thương cố định lên đối phương khi vào trận."}'),
('pb_tc_21', 'Càn Khôn Ấn ⛩️', 'Pháp Bảo', 'Thường', 642, '{"hp":330,"vat_phong":22}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Sinh Mệnh Chi Quang ❇️","loai":"hoi_mau_pct","triGia":10,"duration":0,"moTa":"Hồi phục 10% HP tối đa của bản thân khi vào trận."}'),
('pb_tc_22', 'Cửu Thiên Hồ Lô 🍶', 'Pháp Bảo', 'Thường', 806, '{"mp":92,"phap_phong":15}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Chân Ma Chi Nộ 👹","loai":"tang_cong_pct","triGia":10,"duration":3,"moTa":"Tăng 10% Công kích trong 3 hiệp đầu trận."}'),
('pb_tc_23', 'U Kiếm 🗡️', 'Pháp Bảo', 'Hiếm', 972, '{"vat_cong":51}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Phá Thiên Nhất Kích ☄️","loai":"tan_cong","triGia":166,"duration":0,"moTa":"Gây 166 sát thương cố định lên đối phương khi vào trận."}'),
('pb_tc_24', 'Hoàng Đỉnh 🏺', 'Pháp Bảo', 'Thường', 830, '{"hp":270,"vat_phong":18}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Mộc Linh Tiên Lộ 🍃","loai":"hoi_mau_pct","triGia":10,"duration":0,"moTa":"Hồi phục 10% HP tối đa của bản thân khi vào trận."}'),
('pb_tc_25', 'Thái Cổ Kính 🔮', 'Pháp Bảo', 'Thường', 871, '{"phap_cong":46}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Kim Cang Thần Lực 💪","loai":"tang_cong_pct","triGia":10,"duration":3,"moTa":"Tăng 10% Công kích trong 3 hiệp đầu trận."}'),
('pb_kd_1', 'Bát Quái Kiếm 🗡️', 'Pháp Bảo', 'Hiếm', 2561, '{"vat_cong":98}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Hóa Thần Chi Uy 🌌","loai":"tang_cong_pct","triGia":15,"duration":3,"moTa":"Tăng 15% Công kích trong 3 hiệp đầu trận."}'),
('pb_kd_2', 'Thất Tinh Châm 🪡', 'Pháp Bảo', 'Hiếm', 2412, '{"vat_cong":102}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Băng Thiên Tuyết Địa ❄️","loai":"tan_cong","triGia":256,"duration":0,"moTa":"Gây 256 sát thương cố định lên đối phương khi vào trận."}'),
('pb_kd_3', 'Xích Bình 🍶', 'Pháp Bảo', 'Hiếm', 1959, '{"mp":258,"phap_phong":43}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Thủy Vân Trị Liệu 🌊","loai":"hoi_mau_pct","triGia":15,"duration":0,"moTa":"Hồi phục 15% HP tối đa của bản thân khi vào trận."}'),
('pb_kd_4', 'Thanh Thước 📏', 'Pháp Bảo', 'Hiếm', 2863, '{"mp":342,"phap_phong":57}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Ngũ Hành Linh Lực 🌀","loai":"tang_cong_pct","triGia":15,"duration":3,"moTa":"Tăng 15% Công kích trong 3 hiệp đầu trận."}'),
('pb_kd_5', 'Bạch Kính 🔮', 'Pháp Bảo', 'Huyền thoại', 2087, '{"phap_cong":160}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Lôi Đình Vạn Quân ⚡","loai":"tan_cong","triGia":265,"duration":0,"moTa":"Gây 265 sát thương cố định lên đối phương khi vào trận."}'),
('pb_kd_6', 'Vô Cực Phù 📜', 'Pháp Bảo', 'Thường', 2365, '{"vat_cong":122}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Lôi, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Sinh Mệnh Chi Quang ❇️","loai":"hoi_mau_pct","triGia":15,"duration":0,"moTa":"Hồi phục 15% HP tối đa của bản thân khi vào trận."}'),
('pb_kd_7', 'Ma Tháp 🗼', 'Pháp Bảo', 'Hiếm', 1660, '{"hp":720,"vat_phong":48}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Chân Ma Chi Nộ 👹","loai":"tang_cong_pct","triGia":15,"duration":3,"moTa":"Tăng 15% Công kích trong 3 hiệp đầu trận."}'),
('pb_kd_8', 'Bát Quái Tháp 🗼', 'Pháp Bảo', 'Huyền thoại', 2729, '{"hp":820,"vat_phong":54}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Phá Thiên Nhất Kích ☄️","loai":"tan_cong","triGia":274,"duration":0,"moTa":"Gây 274 sát thương cố định lên đối phương khi vào trận."}'),
('pb_kd_9', 'Thất Tinh Phù 📜', 'Pháp Bảo', 'Thường', 2611, '{"vat_cong":118}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Lôi, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Mộc Linh Tiên Lộ 🍃","loai":"hoi_mau_pct","triGia":15,"duration":0,"moTa":"Hồi phục 15% HP tối đa của bản thân khi vào trận."}'),
('pb_kd_10', 'Xích Kính 🔮', 'Pháp Bảo', 'Huyền thoại', 2758, '{"phap_cong":105}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Kim Cang Thần Lực 💪","loai":"tang_cong_pct","triGia":15,"duration":3,"moTa":"Tăng 15% Công kích trong 3 hiệp đầu trận."}'),
('pb_kd_11', 'Thanh Thước 📏', 'Pháp Bảo', 'Hiếm', 1814, '{"mp":200,"phap_phong":33}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"U Minh Luyện Hỏa 🔥","loai":"tan_cong","triGia":283,"duration":0,"moTa":"Gây 283 sát thương cố định lên đối phương khi vào trận."}'),
('pb_kd_12', 'Bạch Bình 🍶', 'Pháp Bảo', 'Hiếm', 1756, '{"mp":250,"phap_phong":41}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Cam Lộ Linh Quang 💧","loai":"hoi_mau_pct","triGia":15,"duration":0,"moTa":"Hồi phục 15% HP tối đa của bản thân khi vào trận."}'),
('pb_kd_13', 'Vô Cực Châm 🪡', 'Pháp Bảo', 'Thường', 2081, '{"vat_cong":126}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Tử Khí Đông Lai 🔮","loai":"tang_cong_pct","triGia":15,"duration":3,"moTa":"Tăng 15% Công kích trong 3 hiệp đầu trận."}'),
('pb_kd_14', 'Ma Kiếm 🗡️', 'Pháp Bảo', 'Thường', 2821, '{"vat_cong":104}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Huyền Âm Kiếm Khí 🗡️","loai":"tan_cong","triGia":292,"duration":0,"moTa":"Gây 292 sát thương cố định lên đối phương khi vào trận."}'),
('pb_kd_15', 'Bát Quái Châm 🪡', 'Pháp Bảo', 'Hiếm', 2125, '{"vat_cong":163}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Hồi Xuân Thuật 🌿","loai":"hoi_mau_pct","triGia":15,"duration":0,"moTa":"Hồi phục 15% HP tối đa của bản thân khi vào trận."}'),
('pb_kd_16', 'Thất Tinh Bình 🍶', 'Pháp Bảo', 'Thường', 2051, '{"mp":250,"phap_phong":41}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Hóa Thần Chi Uy 🌌","loai":"tang_cong_pct","triGia":15,"duration":3,"moTa":"Tăng 15% Công kích trong 3 hiệp đầu trận."}'),
('pb_kd_17', 'Xích Thước 📏', 'Pháp Bảo', 'Thường', 2842, '{"mp":194,"phap_phong":32}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Băng Thiên Tuyết Địa ❄️","loai":"tan_cong","triGia":301,"duration":0,"moTa":"Gây 301 sát thương cố định lên đối phương khi vào trận."}'),
('pb_kd_18', 'Thanh Kính 🔮', 'Pháp Bảo', 'Cực hiếm', 2625, '{"phap_cong":138}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Thủy Vân Trị Liệu 🌊","loai":"hoi_mau_pct","triGia":15,"duration":0,"moTa":"Hồi phục 15% HP tối đa của bản thân khi vào trận."}'),
('pb_kd_19', 'Bạch Phù 📜', 'Pháp Bảo', 'Hiếm', 1927, '{"vat_cong":132}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Lôi, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Ngũ Hành Linh Lực 🌀","loai":"tang_cong_pct","triGia":15,"duration":3,"moTa":"Tăng 15% Công kích trong 3 hiệp đầu trận."}'),
('pb_kd_20', 'Vô Cực Tháp 🗼', 'Pháp Bảo', 'Hiếm', 2667, '{"hp":480,"vat_phong":32}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Lôi Đình Vạn Quân ⚡","loai":"tan_cong","triGia":310,"duration":0,"moTa":"Gây 310 sát thương cố định lên đối phương khi vào trận."}'),
('pb_kd_21', 'Ma Tháp 🗼', 'Pháp Bảo', 'Hiếm', 2792, '{"hp":710,"vat_phong":47}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Sinh Mệnh Chi Quang ❇️","loai":"hoi_mau_pct","triGia":15,"duration":0,"moTa":"Hồi phục 15% HP tối đa của bản thân khi vào trận."}'),
('pb_kd_22', 'Bát Quái Phù 📜', 'Pháp Bảo', 'Hiếm', 2217, '{"vat_cong":99}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Lôi, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Chân Ma Chi Nộ 👹","loai":"tang_cong_pct","triGia":15,"duration":3,"moTa":"Tăng 15% Công kích trong 3 hiệp đầu trận."}'),
('pb_kd_23', 'Thất Tinh Kính 🔮', 'Pháp Bảo', 'Thường', 2361, '{"phap_cong":98}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Phá Thiên Nhất Kích ☄️","loai":"tan_cong","triGia":319,"duration":0,"moTa":"Gây 319 sát thương cố định lên đối phương khi vào trận."}'),
('pb_kd_24', 'Xích Thước 📏', 'Pháp Bảo', 'Hiếm', 2518, '{"mp":210,"phap_phong":35}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Mộc Linh Tiên Lộ 🍃","loai":"hoi_mau_pct","triGia":15,"duration":0,"moTa":"Hồi phục 15% HP tối đa của bản thân khi vào trận."}'),
('pb_kd_25', 'Thanh Bình 🍶', 'Pháp Bảo', 'Hiếm', 1560, '{"mp":356,"phap_phong":59}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Kim Cang Thần Lực 💪","loai":"tang_cong_pct","triGia":15,"duration":3,"moTa":"Tăng 15% Công kích trong 3 hiệp đầu trận."}'),
('pb_na_1', 'Huyền Phù 📜', 'Pháp Bảo', 'Thần cấp', 5736, '{"vat_cong":338}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Lôi, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Hóa Thần Chi Uy 🌌","loai":"tang_cong_pct","triGia":20,"duration":4,"moTa":"Tăng 20% Công kích trong 4 hiệp đầu trận."}'),
('pb_na_2', 'Thần Phù 📜', 'Pháp Bảo', 'Thường', 3505, '{"vat_cong":365}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Lôi, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Băng Thiên Tuyết Địa ❄️","loai":"tan_cong","triGia":408,"duration":0,"moTa":"Gây 408 sát thương cố định lên đối phương khi vào trận."}'),
('pb_na_3', 'Càn Khôn Châm 🪡', 'Pháp Bảo', 'Cực hiếm', 5245, '{"vat_cong":373}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Thủy Vân Trị Liệu 🌊","loai":"hoi_mau_pct","triGia":20,"duration":0,"moTa":"Hồi phục 20% HP tối đa của bản thân khi vào trận."}'),
('pb_na_4', 'Cửu Thiên Ấn ⛩️', 'Pháp Bảo', 'Huyền thoại', 4171, '{"hp":1455,"vat_phong":97}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Ngũ Hành Linh Lực 🌀","loai":"tang_cong_pct","triGia":20,"duration":4,"moTa":"Tăng 20% Công kích trong 4 hiệp đầu trận."}'),
('pb_na_5', 'U Châu 🔮', 'Pháp Bảo', 'Hiếm', 4453, '{"phap_cong":350}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Lôi Đình Vạn Quân ⚡","loai":"tan_cong","triGia":420,"duration":0,"moTa":"Gây 420 sát thương cố định lên đối phương khi vào trận."}'),
('pb_na_6', 'Hoàng Chung 🔔', 'Pháp Bảo', 'Hiếm', 5697, '{"vat_cong":292}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Sinh Mệnh Chi Quang ❇️","loai":"hoi_mau_pct","triGia":20,"duration":0,"moTa":"Hồi phục 20% HP tối đa của bản thân khi vào trận."}'),
('pb_na_7', 'Thái Cổ Kính 🔮', 'Pháp Bảo', 'Hiếm', 6429, '{"phap_cong":298}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Chân Ma Chi Nộ 👹","loai":"tang_cong_pct","triGia":20,"duration":4,"moTa":"Tăng 20% Công kích trong 4 hiệp đầu trận."}'),
('pb_na_8', 'Huyền Phiên 🏳️', 'Pháp Bảo', 'Cực hiếm', 5076, '{"phap_cong":233}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Phá Thiên Nhất Kích ☄️","loai":"tan_cong","triGia":432,"duration":0,"moTa":"Gây 432 sát thương cố định lên đối phương khi vào trận."}'),
('pb_na_9', 'Thần Kính 🔮', 'Pháp Bảo', 'Hiếm', 4728, '{"phap_cong":311}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Mộc Linh Tiên Lộ 🍃","loai":"hoi_mau_pct","triGia":20,"duration":0,"moTa":"Hồi phục 20% HP tối đa của bản thân khi vào trận."}'),
('pb_na_10', 'Càn Khôn Chung 🔔', 'Pháp Bảo', 'Cực hiếm', 4739, '{"vat_cong":232}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Kim Cang Thần Lực 💪","loai":"tang_cong_pct","triGia":20,"duration":4,"moTa":"Tăng 20% Công kích trong 4 hiệp đầu trận."}'),
('pb_na_11', 'Cửu Thiên Châu 🔮', 'Pháp Bảo', 'Hiếm', 6675, '{"phap_cong":234}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"U Minh Luyện Hỏa 🔥","loai":"tan_cong","triGia":444,"duration":0,"moTa":"Gây 444 sát thương cố định lên đối phương khi vào trận."}'),
('pb_na_12', 'U Ấn ⛩️', 'Pháp Bảo', 'Cực hiếm', 5434, '{"hp":1985,"vat_phong":132}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Cam Lộ Linh Quang 💧","loai":"hoi_mau_pct","triGia":20,"duration":0,"moTa":"Hồi phục 20% HP tối đa của bản thân khi vào trận."}'),
('pb_na_13', 'Hoàng Châm 🪡', 'Pháp Bảo', 'Cực hiếm', 5569, '{"vat_cong":380}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Tử Khí Đông Lai 🔮","loai":"tang_cong_pct","triGia":20,"duration":4,"moTa":"Tăng 20% Công kích trong 4 hiệp đầu trận."}'),
('pb_na_14', 'Thái Cổ Phù 📜', 'Pháp Bảo', 'Hiếm', 4736, '{"vat_cong":305}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Lôi, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Huyền Âm Kiếm Khí 🗡️","loai":"tan_cong","triGia":456,"duration":0,"moTa":"Gây 456 sát thương cố định lên đối phương khi vào trận."}'),
('pb_na_15', 'Huyền Phù 📜', 'Pháp Bảo', 'Huyền thoại', 4515, '{"vat_cong":211}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Lôi, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Hồi Xuân Thuật 🌿","loai":"hoi_mau_pct","triGia":20,"duration":0,"moTa":"Hồi phục 20% HP tối đa của bản thân khi vào trận."}'),
('pb_na_16', 'Thần Châm 🪡', 'Pháp Bảo', 'Hiếm', 4006, '{"vat_cong":286}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Hóa Thần Chi Uy 🌌","loai":"tang_cong_pct","triGia":20,"duration":4,"moTa":"Tăng 20% Công kích trong 4 hiệp đầu trận."}'),
('pb_na_17', 'Càn Khôn Ấn ⛩️', 'Pháp Bảo', 'Hiếm', 4812, '{"hp":1650,"vat_phong":110}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Băng Thiên Tuyết Địa ❄️","loai":"tan_cong","triGia":468,"duration":0,"moTa":"Gây 468 sát thương cố định lên đối phương khi vào trận."}'),
('pb_na_18', 'Cửu Thiên Châu 🔮', 'Pháp Bảo', 'Hiếm', 6942, '{"phap_cong":303}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Thủy Vân Trị Liệu 🌊","loai":"hoi_mau_pct","triGia":20,"duration":0,"moTa":"Hồi phục 20% HP tối đa của bản thân khi vào trận."}'),
('pb_na_19', 'U Chung 🔔', 'Pháp Bảo', 'Hiếm', 4248, '{"vat_cong":391}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Ngũ Hành Linh Lực 🌀","loai":"tang_cong_pct","triGia":20,"duration":4,"moTa":"Tăng 20% Công kích trong 4 hiệp đầu trận."}'),
('pb_na_20', 'Hoàng Kính 🔮', 'Pháp Bảo', 'Hiếm', 4849, '{"phap_cong":271}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Lôi Đình Vạn Quân ⚡","loai":"tan_cong","triGia":480,"duration":0,"moTa":"Gây 480 sát thương cố định lên đối phương khi vào trận."}'),
('pb_na_21', 'Thái Cổ Phiên 🏳️', 'Pháp Bảo', 'Hiếm', 4459, '{"phap_cong":389}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Sinh Mệnh Chi Quang ❇️","loai":"hoi_mau_pct","triGia":20,"duration":0,"moTa":"Hồi phục 20% HP tối đa của bản thân khi vào trận."}'),
('pb_na_22', 'Huyền Kính 🔮', 'Pháp Bảo', 'Hiếm', 6668, '{"phap_cong":375}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Chân Ma Chi Nộ 👹","loai":"tang_cong_pct","triGia":20,"duration":4,"moTa":"Tăng 20% Công kích trong 4 hiệp đầu trận."}'),
('pb_na_23', 'Thần Chung 🔔', 'Pháp Bảo', 'Thường', 5787, '{"vat_cong":367}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Phá Thiên Nhất Kích ☄️","loai":"tan_cong","triGia":492,"duration":0,"moTa":"Gây 492 sát thương cố định lên đối phương khi vào trận."}'),
('pb_na_24', 'Càn Khôn Châu 🔮', 'Pháp Bảo', 'Hiếm', 6878, '{"phap_cong":284}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Mộc Linh Tiên Lộ 🍃","loai":"hoi_mau_pct","triGia":20,"duration":0,"moTa":"Hồi phục 20% HP tối đa của bản thân khi vào trận."}'),
('pb_na_25', 'Cửu Thiên Ấn ⛩️', 'Pháp Bảo', 'Hiếm', 6107, '{"hp":1065,"vat_phong":71}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.', '{"ten":"Kim Cang Thần Lực 💪","loai":"tang_cong_pct","triGia":20,"duration":4,"moTa":"Tăng 20% Công kích trong 4 hiệp đầu trận."}');

-- 注: Đối với MySQL, bạn hãy thay đổi "REPLACE INTO" thành "REPLACE INTO" hoặc "INSERT INTO ... ON DUPLICATE KEY UPDATE".

-- 3.2 Chèn dữ liệu mẫu vào bảng skills (Kỹ năng mẫu)
REPLACE INTO skills (id, ten, loai, sat_thuong, cooldown, yeu_cau_canh_gioi, cong_phap_id, mo_ta) VALUES
('thanh_phong_quyen', 'Thanh Phong Quyền 👊', 'Vật lý', 120, 6, 1, NULL, 'Đấm ra một quyền tựa gió mát lướt qua, sát thương bằng 120% Vật công.'),
('ba_vuong_kich', 'Bá Vương Kích 🔱', 'Vật lý', 150, 12, 10, NULL, 'Kích ra mạnh mẽ như Bá Vương xuất thế, sát thương bằng 150% Vật công.'),
('ham_thien_chuong', 'Hám Thiên Chưởng 💥', 'Vật lý', 200, 18, 19, NULL, 'Tụ lực giáng chưởng chấn động thiên địa, sát thương bằng 200% Vật công.'),
('hoa_diem_thuat', 'Hỏa Diễm Thuật 🔥', 'Phép thuật', 120, 6, 1, NULL, 'Triệu hồi quả cầu lửa thiêu đốt đối thủ, sát thương bằng 120% Pháp công.'),
('ngu_loi_thuat', 'Ngự Lôi Thuật ⚡', 'Phép thuật', 150, 12, 10, NULL, 'Dẫn lôi đình giáng xuống đầu kẻ thù, sát thương bằng 150% Pháp công.'),
('bang_vu_thuat', 'Băng Vũ Thuật ❄️', 'Phép thuật', 200, 18, 19, NULL, 'Tạo cơn mưa băng buốt lạnh tàn phá kinh mạch, sát thương bằng 200% Pháp công.');

-- 3.4 Chèn dữ liệu mẫu vào bảng dungeons (Bí cảnh mẫu)
REPLACE INTO dungeons (id, ten, cap_do_yeu_cau, canh_gioi_yeu_cau_text, quai_vat_json, thuong_json, drops_json) VALUES
('tan_thu_phu_ban', 'Tân Thủ Phụ Bản ⛰️', 1, 'Luyện Khí', '{"ten":"Thiết Bì Thử (Chuột Thép)","hp":150,"vatCong":15,"phapCong":0,"vatPhong":5,"phapPhong":5}', '{"expMin":30,"expMax":50,"stonesMin":10,"stonesMax":20}', '[{"itemId":"dan_hp_1","tile":0.50},{"itemId":"dan_mp_1","tile":0.50},{"itemId":"kiem_go","tile":0.15},{"itemId":"truong_go","tile":0.15},{"itemId":"ao_vai","tile":0.15},{"itemId":"ngoc_boi_tan_thu","tile":0.15},{"itemId":"phap_bao_ho_than","tile":0.10},{"itemId":"co_bao_kiem_khi","tile":0.10}]'),
('u_minh_coc', 'U Minh Cốc 💀', 10, 'Trúc Cơ', '{"ten":"U Minh Ma Lang (Sói U Minh)","hp":650,"vatCong":55,"phapCong":0,"vatPhong":25,"phapPhong":25}', '{"expMin":150,"expMax":250,"stonesMin":50,"stonesMax":100}', '[{"itemId":"dan_hp_2","tile":0.50},{"itemId":"dan_mp_2","tile":0.50},{"itemId":"kiem_sat","tile":0.15},{"itemId":"truong_truc","tile":0.15},{"itemId":"ao_da","tile":0.15},{"itemId":"nhan_sam","tile":0.30},{"itemId":"ngoc_boi_linh_ngoc","tile":0.15},{"itemId":"phap_bao_cong_kich","tile":0.10},{"itemId":"co_bao_dong_tu","tile":0.10}]'),
('hoa_diem_son', 'Hỏa Diệm Sơn 🔥', 19, 'Hóa Thần', '{"ten":"Hỏa Viêm Yêu Linh (Kỳ Lân Lửa)","hp":2800,"vatCong":120,"phapCong":150,"vatPhong":80,"phapPhong":100}', '{"expMin":800,"expMax":1200,"stonesMin":200,"stonesMax":400}', '[{"itemId":"dan_hp_2","tile":0.60},{"itemId":"dan_mp_2","tile":0.60},{"itemId":"kiem_huyen_thiet","tile":0.10},{"itemId":"phap_bao_huyen_mon","tile":0.10},{"itemId":"giap_huyen_thiet","tile":0.10},{"itemId":"ngoc_boi_tien_van","tile":0.10},{"itemId":"phap_bao_hon_ton","tile":0.08},{"itemId":"co_bao_tien_dan","tile":0.08}]');

-- 3.5 Chèn dữ liệu mẫu vào bảng adventure_events (Sự kiện lịch luyện mẫu)
REPLACE INTO adventure_events (id, ten, mo_ta, loai, hieu_ung_json) VALUES
('linh_khi_trieu_tich', '⚡ Linh Khí Triều Tịch ⚡', 'Trong lúc leo lên đỉnh Ngọc Kinh Sơn, đạo hữu vô tình gặp một luồng linh khí trời đất bộc phát, cọ rửa kinh mạch, tu vi tiến triển nhanh chóng!', 'tot', '{"exp":{"min":40,"max":100}}'),
('nhat_linh_thach', '🪙 Linh Thạch Thượng Cổ 🪙', 'Tại một lòng sông cạn dưới chân U Minh Cốc, đạo hữu vô tình phát hiện ra một số viên Linh Thạch thượng cổ bị chôn vùi dưới cát mịn.', 'tot', '{"stones":{"min":20,"max":70}}'),
('dong_phu_tien_boi', '🏺 Động Phủ Tiền Bối 🏺', 'Đạo hữu vô tình bước qua kết giới, phát hiện một động phủ ẩn giấu của một vị tu sĩ cổ đại hóa trần. Trên bàn đá tĩnh tọa vẫn còn lưu lại di vật của người.', 'dai_co_duyen', '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"🏺 **Duyên Định Động Phủ**: Đạo hữu {name} trong lúc lịch luyện phát hiện động phủ cổ xưa của tiền bối, đạt được bảo vật {itemName}!"}'),
('linh_thao_ki_ngo', '🌱 Kỳ Ngộ Linh Thảo 🌱', 'Bên vách núi dựng đứng cheo leo đầy sương mù, đạo hữu phát hiện một đóa linh chi quý chiêu tuyết đang hấp thụ tinh hoa nguyệt ảnh.', 'tot', '{"itemRandom":{"loai":"Linh thảo"}}'),
('cao_nhan_truyen_cong', '🧙 Cao Nhân Chỉ Điểm 🧙', 'Đạo hữu gặp gỡ một lão giả râu tóc bạc phơ đang ngồi câu cá bên đầm lầy vô danh. Sau vài câu đàm đạo đạo lý thiên địa, lão giả vỗ vai truyền thụ linh lực rồi biến mất vào không hư.', 'dai_co_duyen', '{"exp":{"min":150,"max":250},"thienDaoLuc":true,"thienDaoLucMsg":"🧙 **Tiên Nhân Chỉ Lộ**: Đạo hữu {name} kỳ ngộ cao nhân đắc đạo chỉ điểm mê tân, tu vi tăng tiến thần tốc!"}'),
('yeu_thu_phuc_kich', '🐾 Yêu Thú Phakov Kích 🐾', 'Đang đi trong rừng trúc sương mù, đạo hữu bất ngờ bị một con Trúc Điệp Yêu thú từ trên cao phóng xuống tấn công. Trận chiến diễn ra chóng vánh, đạo hữu tuy chạy thoát nhưng bị thương tích đầy mình.', 'xui_xeo', '{"hpPhat":0.15}'),
('co_tran_phap', '🌀 Cổ Trận Pháp Vây Hãm 🌀', 'Đạo hữu vô tình giẫm phải trận pháp huyễn cảnh bị bỏ hoang từ thời thái cổ. Trận pháp điên cuồng hút lấy linh lực của đạo hữu trước khi tự động sụp đổ giải giới.', 'xui_xeo', '{"mpPhat":0.20}');

-- 3.3 Chèn dữ liệu balo và kỹ năng mẫu cho một người chơi cụ thể (Ví dụ: ID người dùng '1234567890' - nếu tồn tại trong players)
-- INSERT OR IGNORE INTO inventory (user_id, item_id, so_luong, trang_bi, nang_cap_sao) VALUES 
-- (1234567890, 'kiem_go', 1, 1, 0),
-- (1234567890, 'ao_vai', 1, 1, 0),
-- (1234567890, 'dan_hp_1', 5, 0, 0);

-- INSERT OR IGNORE INTO player_skills (user_id, skill_id, cap_do, kinh_nghiem_skill) VALUES 
-- (1234567890, 'thanh_phong_quyen', 1, 0);

-- 3.6 Chèn các Gift Code mẫu

