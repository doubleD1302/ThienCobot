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

-- 1.2 Tạo bảng chứa danh sách vật phẩm tĩnh
CREATE TABLE IF NOT EXISTS items (
  id VARCHAR(50) PRIMARY KEY,
  ten VARCHAR(100) NOT NULL,
  loai VARCHAR(30) NOT NULL,
  do_hiem VARCHAR(20) NOT NULL,
  gia_co_so INT NOT NULL DEFAULT 0,
  chi_so_json TEXT NOT NULL,
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
  mo_ta TEXT
);

CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id BIGINT NOT NULL,
  item_id VARCHAR(50) NOT NULL,
  so_luong INTEGER NOT NULL DEFAULT 1,
  trang_bi BOOLEAN NOT NULL DEFAULT 0,
  nang_cap_sao INTEGER NOT NULL DEFAULT 0,
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

-- ==========================================
-- 3. DỮ LIỆU MẪU (DÙNG ĐƯỢC CHO CẢ MYSQL VÀ SQLITE)
-- ==========================================

-- 3.1 Chèn dữ liệu mẫu vào bảng items (Vật phẩm mẫu)
REPLACE INTO items (id, ten, loai, do_hiem, gia_co_so, chi_so_json, mo_ta) VALUES
('kiem_go', 'Kiếm Gỗ 🪵', 'Vũ khí', 'Thường', 100, '{"vat_cong":10}', 'Thanh kiếm gỗ thô sơ cho tân thủ.'),
('kiem_sat', 'Thiết Kiếm ⚔️', 'Vũ khí', 'Hiếm', 500, '{"vat_cong":30}', 'Kiếm sắt rèn đúc kỹ lưỡng, sắc bén sắc lạnh.'),
('kiem_huyen_thiet', 'Huyền Thiết Trọng Kiếm 🗡️', 'Vũ khí', 'Cực hiếm', 2500, '{"vat_cong":100}', 'Trọng kiếm đúc bằng huyền thiết nặng ngàn cân, chém sắt như bùn.'),
('truong_go', 'Mộc Trượng 🪵', 'Vũ khí', 'Thường', 100, '{"phap_cong":10}', 'Khúc gỗ dẫn linh khí thô sơ.'),
('truong_truc', 'Trúc Trượng 🎋', 'Vũ khí', 'Hiếm', 500, '{"phap_cong":30}', 'Tương truyền làm bằng Linh Trúc ngàn năm, tương thích pháp lực rất tốt.'),
('phap_bao_huyen_mon', 'Huyền Môn Ngọc Bội 🔮', 'Vũ khí', 'Cực hiếm', 2500, '{"phap_cong":100}', 'Linh bảo ngọc bội hộ thân của đệ tử Huyền Môn, hội tụ thiên địa linh khí.'),
('ao_vai', 'Đạo Bào Vải 🥋', 'Giáp', 'Thường', 100, '{"vat_phong":5,"phap_phong":5,"hp":50}', 'Áo vải đệ tử mặc hàng ngày.'),
('ao_da', 'Thú Bì Giáp 🛡️', 'Giáp', 'Hiếm', 500, '{"vat_phong":15,"phap_phong":15,"hp":150}', 'Giáp làm bằng da thú yêu cấp thấp, dẻo dai bảo vệ cơ thể.'),
('giap_huyen_thiet', 'Huyền Thiết Linh Giáp 🥋', 'Giáp', 'Cực hiếm', 2500, '{"vat_phong":50,"phap_phong":50,"hp":500}', 'Giáp hộ thân đúc bằng huyền thiết pha lẫn linh thạch, phòng ngự cực cao.'),
('dan_hp_1', 'Bổ Huyết Đan (Sơ) 💊', 'Đan dược', 'Thường', 50, '{"hp_hoi":100}', 'Phục hồi 100 điểm khí huyết (HP) bị tổn thương.'),
('dan_hp_2', 'Bổ Huyết Đan (Trung) 🧪', 'Đan dược', 'Hiếm', 200, '{"hp_hoi":500}', 'Phục hồi 500 điểm khí huyết (HP) bị tổn thương.'),
('dan_mp_1', 'Hồi Thần Đan (Sơ) 💧', 'Đan dược', 'Thường', 50, '{"mp_hoi":50}', 'Khôi phục 50 điểm linh lực pháp hải (MP).'),
('dan_mp_2', 'Hồi Thần Đan (Trung) 🌊', 'Đan dược', 'Hiếm', 200, '{"mp_hoi":200}', 'Khôi phục 200 điểm linh lực pháp hải (MP).'),
('linh_chi', 'U Minh Linh Chi 🍄', 'Linh thảo', 'Thường', 30, '{}', 'Linh thảo chứa ít linh khí mọc nơi ẩm ướt.'),
('nhan_sam', 'Tuyết Sơn Nhân Sâm 🥕', 'Linh thảo', 'Hiếm', 120, '{}', 'Nhân sâm ngàn năm thu hoạch trên đỉnh núi tuyết hoang lạnh.');

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
('tan_thu_phu_ban', 'Tân Thủ Phụ Bản ⛰️', 1, 'Luyện Khí', '{"ten":"Thiết Bì Thử (Chuột Thép)","hp":150,"vatCong":15,"phapCong":0,"vatPhong":5,"phapPhong":5}', '{"expMin":30,"expMax":50,"stonesMin":10,"stonesMax":20}', '[{"itemId":"dan_hp_1","tile":0.50},{"itemId":"dan_mp_1","tile":0.50},{"itemId":"kiem_go","tile":0.15},{"itemId":"truong_go","tile":0.15},{"itemId":"ao_vai","tile":0.15}]'),
('u_minh_coc', 'U Minh Cốc 💀', 10, 'Trúc Cơ', '{"ten":"U Minh Ma Lang (Sói U Minh)","hp":650,"vatCong":55,"phapCong":0,"vatPhong":25,"phapPhong":25}', '{"expMin":150,"expMax":250,"stonesMin":50,"stonesMax":100}', '[{"itemId":"dan_hp_2","tile":0.50},{"itemId":"dan_mp_2","tile":0.50},{"itemId":"kiem_sat","tile":0.15},{"itemId":"truong_truc","tile":0.15},{"itemId":"ao_da","tile":0.15},{"itemId":"nhan_sam","tile":0.30}]'),
('hoa_diem_son', 'Hỏa Diệm Sơn 🔥', 19, 'Hóa Thần', '{"ten":"Hỏa Viêm Yêu Linh (Kỳ Lân Lửa)","hp":2800,"vatCong":120,"phapCong":150,"vatPhong":80,"phapPhong":100}', '{"expMin":800,"expMax":1200,"stonesMin":200,"stonesMax":400}', '[{"itemId":"dan_hp_2","tile":0.60},{"itemId":"dan_mp_2","tile":0.60},{"itemId":"kiem_huyen_thiet","tile":0.10},{"itemId":"phap_bao_huyen_mon","tile":0.10},{"itemId":"giap_huyen_thiet","tile":0.10}]');

-- 3.3 Chèn dữ liệu balo và kỹ năng mẫu cho một người chơi cụ thể (Ví dụ: ID người dùng '1234567890' - nếu tồn tại trong players)
-- INSERT OR IGNORE INTO inventory (user_id, item_id, so_luong, trang_bi, nang_cap_sao) VALUES 
-- (1234567890, 'kiem_go', 1, 1, 0),
-- (1234567890, 'ao_vai', 1, 1, 0),
-- (1234567890, 'dan_hp_1', 5, 0, 0);

-- INSERT OR IGNORE INTO player_skills (user_id, skill_id, cap_do, kinh_nghiem_skill) VALUES 
-- (1234567890, 'thanh_phong_quyen', 1, 0);
