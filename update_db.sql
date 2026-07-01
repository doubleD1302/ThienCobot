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

