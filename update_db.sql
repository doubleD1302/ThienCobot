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

-- 1.2 Tạo bảng chứa danh sách vật phẩm tĩnh
CREATE TABLE IF NOT EXISTS items (
  id VARCHAR(50) PRIMARY KEY,
  ten VARCHAR(100) NOT NULL,
  loai VARCHAR(30) NOT NULL,
  do_hiem VARCHAR(20) NOT NULL,
  gia_co_so INT NOT NULL DEFAULT 0,
  chi_so_json TEXT NOT NULL,
  yeu_cau_canh_gioi INT NOT NULL DEFAULT 1,
  mo_ta TEXT NULL
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
  mo_ta TEXT
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

-- 100 Pháp bảo cổ xưa cho tu sĩ cảnh giới Nguyên Anh trở xuống
REPLACE INTO items (id, ten, loai, do_hiem, gia_co_so, chi_so_json, yeu_cau_canh_gioi, mo_ta) VALUES
('pb_lk_1', 'Thanh Phiên 🏳️', 'Pháp Bảo', 'Hiếm', 445, '{"phap_cong":24}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_2', 'Bạch Ấn ⛩️', 'Pháp Bảo', 'Cực hiếm', 317, '{"hp":50,"vat_phong":3}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_3', 'Vô Cực Tháp 🗼', 'Pháp Bảo', 'Cực hiếm', 431, '{"hp":85,"vat_phong":5}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_4', 'Ma Bình 🍶', 'Pháp Bảo', 'Cực hiếm', 336, '{"mp":36,"phap_phong":6}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_5', 'Bát Quái Kiếm 🗡️', 'Pháp Bảo', 'Hiếm', 337, '{"vat_cong":20}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_6', 'Thất Tinh Châu 🔮', 'Pháp Bảo', 'Cực hiếm', 389, '{"phap_cong":27}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_7', 'Xích Châu 🔮', 'Pháp Bảo', 'Hiếm', 419, '{"phap_cong":25}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_8', 'Thanh Kiếm 🗡️', 'Pháp Bảo', 'Hiếm', 322, '{"vat_cong":18}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_9', 'Bạch Bình 🍶', 'Pháp Bảo', 'Thường', 309, '{"mp":20,"phap_phong":3}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_10', 'Vô Cực Tháp 🗼', 'Pháp Bảo', 'Hiếm', 341, '{"hp":125,"vat_phong":8}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_11', 'Ma Ấn ⛩️', 'Pháp Bảo', 'Hiếm', 258, '{"hp":50,"vat_phong":3}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_12', 'Bát Quái Phiên 🏳️', 'Pháp Bảo', 'Hiếm', 378, '{"phap_cong":11}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_13', 'Thất Tinh Châm 🪡', 'Pháp Bảo', 'Hiếm', 227, '{"vat_cong":17}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_14', 'Xích Phiên 🏳️', 'Pháp Bảo', 'Cực hiếm', 355, '{"phap_cong":19}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_15', 'Thanh Ấn ⛩️', 'Pháp Bảo', 'Hiếm', 296, '{"hp":60,"vat_phong":4}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_16', 'Bạch Tháp 🗼', 'Pháp Bảo', 'Thần cấp', 498, '{"hp":135,"vat_phong":9}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_17', 'Vô Cực Bình 🍶', 'Pháp Bảo', 'Thường', 307, '{"mp":26,"phap_phong":4}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_18', 'Ma Kiếm 🗡️', 'Pháp Bảo', 'Thường', 346, '{"vat_cong":12}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_19', 'Bát Quái Châu 🔮', 'Pháp Bảo', 'Hiếm', 394, '{"phap_cong":28}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_20', 'Thất Tinh Châu 🔮', 'Pháp Bảo', 'Cực hiếm', 417, '{"phap_cong":25}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_21', 'Xích Kiếm 🗡️', 'Pháp Bảo', 'Hiếm', 478, '{"vat_cong":19}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_22', 'Thanh Bình 🍶', 'Pháp Bảo', 'Cực hiếm', 334, '{"mp":28,"phap_phong":4}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_23', 'Bạch Tháp 🗼', 'Pháp Bảo', 'Hiếm', 492, '{"hp":80,"vat_phong":5}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_24', 'Vô Cực Ấn ⛩️', 'Pháp Bảo', 'Hiếm', 495, '{"hp":90,"vat_phong":6}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_lk_25', 'Ma Phiên 🏳️', 'Pháp Bảo', 'Hiếm', 296, '{"phap_cong":23}', 1, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_1', 'Cửu Thiên Châm 🪡', 'Pháp Bảo', 'Hiếm', 921, '{"vat_cong":47}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_2', 'U Kính 🔮', 'Pháp Bảo', 'Huyền thoại', 756, '{"phap_cong":48}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_3', 'Hoàng Đỉnh 🏺', 'Pháp Bảo', 'Cực hiếm', 903, '{"hp":305,"vat_phong":20}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_4', 'Thái Cổ Kiếm 🗡️', 'Pháp Bảo', 'Thường', 600, '{"vat_cong":73}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_5', 'Huyền Hồ Lô 🍶', 'Pháp Bảo', 'Cực hiếm', 742, '{"mp":104,"phap_phong":17}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_6', 'Thần Ấn ⛩️', 'Pháp Bảo', 'Thường', 649, '{"hp":205,"vat_phong":13}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_7', 'Càn Khôn Bình 🍶', 'Pháp Bảo', 'Cực hiếm', 967, '{"mp":152,"phap_phong":25}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_8', 'Cửu Thiên Ấn ⛩️', 'Pháp Bảo', 'Cực hiếm', 1051, '{"hp":225,"vat_phong":15}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_9', 'U Hồ Lô 🍶', 'Pháp Bảo', 'Cực hiếm', 858, '{"mp":118,"phap_phong":19}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_10', 'Hoàng Kiếm 🗡️', 'Pháp Bảo', 'Cực hiếm', 616, '{"vat_cong":35}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_11', 'Thái Cổ Đỉnh 🏺', 'Pháp Bảo', 'Thường', 1173, '{"hp":350,"vat_phong":23}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_12', 'Huyền Kính 🔮', 'Pháp Bảo', 'Hiếm', 1059, '{"phap_cong":78}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_13', 'Thần Châm 🪡', 'Pháp Bảo', 'Thường', 1147, '{"vat_cong":58}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_14', 'Càn Khôn Châm 🪡', 'Pháp Bảo', 'Thường', 893, '{"vat_cong":64}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_15', 'Cửu Thiên Kính 🔮', 'Pháp Bảo', 'Hiếm', 899, '{"phap_cong":38}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_16', 'U Đỉnh 🏺', 'Pháp Bảo', 'Hiếm', 1145, '{"hp":350,"vat_phong":23}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_17', 'Hoàng Kiếm 🗡️', 'Pháp Bảo', 'Hiếm', 1087, '{"vat_cong":76}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_18', 'Thái Cổ Hồ Lô 🍶', 'Pháp Bảo', 'Hiếm', 1043, '{"mp":118,"phap_phong":19}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_19', 'Huyền Ấn ⛩️', 'Pháp Bảo', 'Hiếm', 929, '{"hp":320,"vat_phong":21}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_20', 'Thần Bình 🍶', 'Pháp Bảo', 'Hiếm', 916, '{"mp":74,"phap_phong":12}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_21', 'Càn Khôn Ấn ⛩️', 'Pháp Bảo', 'Hiếm', 1197, '{"hp":315,"vat_phong":21}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_22', 'Cửu Thiên Hồ Lô 🍶', 'Pháp Bảo', 'Cực hiếm', 1061, '{"mp":146,"phap_phong":24}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_23', 'U Kiếm 🗡️', 'Pháp Bảo', 'Huyền thoại', 660, '{"vat_cong":35}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_24', 'Hoàng Đỉnh 🏺', 'Pháp Bảo', 'Thường', 918, '{"hp":200,"vat_phong":13}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_tc_25', 'Thái Cổ Kính 🔮', 'Pháp Bảo', 'Hiếm', 1047, '{"phap_cong":56}', 10, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_1', 'Bát Quái Kiếm 🗡️', 'Pháp Bảo', 'Hiếm', 1877, '{"vat_cong":108}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_2', 'Thất Tinh Châm 🪡', 'Pháp Bảo', 'Hiếm', 2405, '{"vat_cong":142}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_3', 'Xích Bình 🍶', 'Pháp Bảo', 'Huyền thoại', 2230, '{"mp":336,"phap_phong":56}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_4', 'Thanh Thước 📏', 'Pháp Bảo', 'Thường', 2249, '{"mp":196,"phap_phong":32}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_5', 'Bạch Kính 🔮', 'Pháp Bảo', 'Thường', 2299, '{"phap_cong":98}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_6', 'Vô Cực Phù 📜', 'Pháp Bảo', 'Hiếm', 1598, '{"vat_cong":129}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Lôi, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_7', 'Ma Tháp 🗼', 'Pháp Bảo', 'Hiếm', 2293, '{"hp":480,"vat_phong":32}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_8', 'Bát Quái Tháp 🗼', 'Pháp Bảo', 'Hiếm', 2925, '{"hp":635,"vat_phong":42}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_9', 'Thất Tinh Phù 📜', 'Pháp Bảo', 'Thường', 2986, '{"vat_cong":157}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Lôi, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_10', 'Xích Kính 🔮', 'Pháp Bảo', 'Hiếm', 1672, '{"phap_cong":124}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_11', 'Thanh Thước 📏', 'Pháp Bảo', 'Hiếm', 2474, '{"mp":322,"phap_phong":53}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_12', 'Bạch Bình 🍶', 'Pháp Bảo', 'Cực hiếm', 2805, '{"mp":192,"phap_phong":32}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_13', 'Vô Cực Châm 🪡', 'Pháp Bảo', 'Thần cấp', 2579, '{"vat_cong":164}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_14', 'Ma Kiếm 🗡️', 'Pháp Bảo', 'Cực hiếm', 2359, '{"vat_cong":150}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_15', 'Bát Quái Châm 🪡', 'Pháp Bảo', 'Cực hiếm', 1594, '{"vat_cong":97}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_16', 'Thất Tinh Bình 🍶', 'Pháp Bảo', 'Thường', 2614, '{"mp":232,"phap_phong":38}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_17', 'Xích Thước 📏', 'Pháp Bảo', 'Cực hiếm', 1744, '{"mp":304,"phap_phong":50}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_18', 'Thanh Kính 🔮', 'Pháp Bảo', 'Huyền thoại', 2874, '{"phap_cong":97}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_19', 'Bạch Phù 📜', 'Pháp Bảo', 'Hiếm', 1804, '{"vat_cong":162}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Lôi, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_20', 'Vô Cực Tháp 🗼', 'Pháp Bảo', 'Cực hiếm', 2201, '{"hp":485,"vat_phong":32}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_21', 'Ma Tháp 🗼', 'Pháp Bảo', 'Thường', 2892, '{"hp":770,"vat_phong":51}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_22', 'Bát Quái Phù 📜', 'Pháp Bảo', 'Hiếm', 2191, '{"vat_cong":141}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Lôi, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_23', 'Thất Tinh Kính 🔮', 'Pháp Bảo', 'Hiếm', 1590, '{"phap_cong":164}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_24', 'Xích Thước 📏', 'Pháp Bảo', 'Thường', 1736, '{"mp":346,"phap_phong":57}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_kd_25', 'Thanh Bình 🍶', 'Pháp Bảo', 'Thường', 2366, '{"mp":328,"phap_phong":54}', 13, 'Pháp bảo đệ tử tông môn thuộc hệ Mộc, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_1', 'Huyền Phù 📜', 'Pháp Bảo', 'Hiếm', 6657, '{"vat_cong":353}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Lôi, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_2', 'Thần Phù 📜', 'Pháp Bảo', 'Cực hiếm', 4932, '{"vat_cong":234}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Lôi, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_3', 'Càn Khôn Châm 🪡', 'Pháp Bảo', 'Hiếm', 4219, '{"vat_cong":209}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_4', 'Cửu Thiên Ấn ⛩️', 'Pháp Bảo', 'Thường', 6206, '{"hp":1410,"vat_phong":94}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_5', 'U Châu 🔮', 'Pháp Bảo', 'Hiếm', 3773, '{"phap_cong":327}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_6', 'Hoàng Chung 🔔', 'Pháp Bảo', 'Huyền thoại', 5552, '{"vat_cong":367}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_7', 'Thái Cổ Kính 🔮', 'Pháp Bảo', 'Hiếm', 4066, '{"phap_cong":367}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_8', 'Huyền Phiên 🏳️', 'Pháp Bảo', 'Hiếm', 5879, '{"phap_cong":349}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_9', 'Thần Kính 🔮', 'Pháp Bảo', 'Hiếm', 4689, '{"phap_cong":290}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_10', 'Càn Khôn Chung 🔔', 'Pháp Bảo', 'Thường', 5421, '{"vat_cong":256}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_11', 'Cửu Thiên Châu 🔮', 'Pháp Bảo', 'Huyền thoại', 5403, '{"phap_cong":337}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_12', 'U Ấn ⛩️', 'Pháp Bảo', 'Thường', 4730, '{"hp":1055,"vat_phong":70}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_13', 'Hoàng Châm 🪡', 'Pháp Bảo', 'Cực hiếm', 5256, '{"vat_cong":227}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_14', 'Thái Cổ Phù 📜', 'Pháp Bảo', 'Hiếm', 3664, '{"vat_cong":205}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Lôi, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_15', 'Huyền Phù 📜', 'Pháp Bảo', 'Huyền thoại', 5826, '{"vat_cong":225}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Lôi, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_16', 'Thần Châm 🪡', 'Pháp Bảo', 'Hiếm', 6097, '{"vat_cong":236}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_17', 'Càn Khôn Ấn ⛩️', 'Pháp Bảo', 'Hiếm', 3993, '{"hp":1115,"vat_phong":74}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_18', 'Cửu Thiên Châu 🔮', 'Pháp Bảo', 'Hiếm', 6855, '{"phap_cong":200}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_19', 'U Chung 🔔', 'Pháp Bảo', 'Thường', 4734, '{"vat_cong":383}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_20', 'Hoàng Kính 🔮', 'Pháp Bảo', 'Hiếm', 4495, '{"phap_cong":258}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_21', 'Thái Cổ Phiên 🏳️', 'Pháp Bảo', 'Hiếm', 5212, '{"phap_cong":332}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_22', 'Huyền Kính 🔮', 'Pháp Bảo', 'Thường', 5650, '{"phap_cong":381}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Hỏa, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_23', 'Thần Chung 🔔', 'Pháp Bảo', 'Hiếm', 4661, '{"vat_cong":323}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Kim, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_24', 'Càn Khôn Châu 🔮', 'Pháp Bảo', 'Thần cấp', 6868, '{"phap_cong":364}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thủy, rèn luyện hộ mệnh trong cảnh giới.'),
('pb_na_25', 'Cửu Thiên Ấn ⛩️', 'Pháp Bảo', 'Cực hiếm', 3975, '{"hp":1660,"vat_phong":110}', 16, 'Pháp bảo đệ tử tông môn thuộc hệ Thổ, rèn luyện hộ mệnh trong cảnh giới.');


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

