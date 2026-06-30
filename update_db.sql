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
('giap_huyen_thiet', 'Huyền Thiết Linh Giáp 🥋', 'Giáp', 'Cực hiếm', 2500, '{"vat_phong":50,"phap_phong":50,"hp":500}', 19, 'Giáp hộ thân đúc bằng huyền thiết pha lẫn linh thạch, phòng ngự cực cao.');

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

-- 3.5 Chèn dữ liệu mẫu vào bảng adventure_events (Sự kiện lịch luyện mẫu)
REPLACE INTO adventure_events (id, ten, mo_ta, loai, hieu_ung_json) VALUES
('linh_khi_trieu_tich', '⚡ Linh Khí Triều Tịch ⚡', 'Trong lúc leo lên đỉnh Ngọc Kinh Sơn, đạo hữu vô tình gặp một luồng linh khí trời đất bộc phát, cọ rửa kinh mạch, tu vi tiến triển nhanh chóng!', 'tot', '{"exp":{"min":40,"max":100}}'),
('nhat_linh_thach', '🪙 Linh Thạch Thượng Cổ 🪙', 'Tại một lòng sông cạn dưới chân U Minh Cốc, đạo hữu vô tình phát hiện ra một số viên Linh Thạch thượng cổ bị chôn vùi dưới cát mịn.', 'tot', '{"stones":{"min":20,"max":70}}'),
('dong_phu_tien_boi', '🏺 Động Phủ Tiền Bối 🏺', 'Đạo hữu vô tình bước qua kết giới, phát hiện một động phủ ẩn giấu của một vị tu sĩ cổ đại hóa trần. Trên bàn đá tĩnh tọa vẫn còn lưu lại di vật của người.', 'dai_co_duyen', '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"🏺 **Duyên Định Động Phủ**: Đạo hữu {name} trong lúc lịch luyện phát hiện động phủ cổ xưa của tiền bối, đạt được bảo vật {itemName}!"}'),
('linh_thao_ki_ngo', '🌱 Kỳ Ngộ Linh Thảo 🌱', 'Bên vách núi dựng đứng cheo leo đầy sương mù, đạo hữu phát hiện một đóa linh chi quý chiêu tuyết đang hấp thụ tinh hoa nguyệt ảnh.', 'tot', '{"itemRandom":{"loai":"Linh thảo"}}'),
('cao_nhan_truyen_cong', '🧙 Cao Nhân Chỉ Điểm 🧙', 'Đạo hữu gặp gỡ một lão giả râu tóc bạc phơ đang ngồi câu cá bên đầm lầy vô danh. Sau vài câu đàm đạo đạo lý thiên địa, lão giả vỗ vai truyền thụ linh lực rồi biến mất vào không hư.', 'dai_co_duyen', '{"exp":{"min":150,"max":250},"thienDaoLuc":true,"thienDaoLucMsg":"🧙 **Tiên Nhân Chỉ Lộ**: Đạo hữu {name} kỳ ngộ cao nhân đắc đạo chỉ điểm mê tân, tu vi tăng tiến thần tốc!"}'),
('yeu_thu_phuc_kich', '🐾 Yêu Thú Phakov Kích 🐾', 'Đang đi trong rừng trúc sương mù, đạo hữu bất ngờ bị một con Trúc Điệp Yêu thú từ trên cao phóng xuống tấn công. Trận chiến diễn ra chóng vánh, đạo hữu tuy chạy thoát nhưng bị thương tích đầy mình.', 'xui_xeo', '{"hpPhat":0.15}'),
('co_tran_phap', '🌀 Cổ Trận Pháp Vây Hãm 🌀', 'Đạo hữu vô tình giẫm phải trận pháp huyễn cảnh bị bỏ hoang từ thời thái cổ. Trận pháp điên cuồng hút lấy linh lực của đạo hữu trước khi tự động sụp đổ giải giới.', 'xui_xeo', '{"mpPhat":0.20}'),
-- ==================== CƠ DUYÊN TỐT (TOT): 45 SỰ KIỆN ====================
('linh_khi_1', '🌊 Thác Nước Tẩy Tủy 🌊', 'Đạo hữu ngồi dưới dòng thác linh lực đổ xuống từ chín tầng trời, cặn bã trong kinh mạch bị cuốn trôi sạch sẽ.', 'tot', '{"exp":{"min":40,"max":80}}'),
('linh_khi_2', '🌌 Thiên Địa Tử Khí 🌌', 'Lúc bình minh, đạo hữu nuốt một luồng đông lai tử khí từ chân trời, chân nguyên dâng trào mạnh mẽ.', 'tot', '{"exp":{"min":50,"max":90}}'),
('linh_khi_3', '💎 Linh Thạch Phế Khoáng 💎', 'Lạc vào một khu mỏ linh thạch đã bỏ hoang, đạo hữu chăm chỉ đào bới tìm thấy một số linh thạch sót lại.', 'tot', '{"stones":{"min":15,"max":45}}'),
('linh_khi_4', '💊 Di Tích Đan Phôi 💊', 'Tìm được một viên đan dược bán thành phẩm bị vứt bỏ, dược lực tuy phân tán nhưng vẫn còn tác dụng bồi bổ.', 'tot', '{"itemRandom":{"loai":"Đan dược"}}'),
('linh_khi_5', '☁️ Thải Vân Chi Khí ☁️', 'Một đóa ngũ sắc thải vân trôi qua che đỉnh đầu, tản phát ra một luồng linh khí dịu mát làm đạo hữu sảng khoái.', 'tot', '{"exp":{"min":30,"max":60}}'),
('linh_khi_6', '💧 Linh Hồ Ngộ Đạo 💧', 'Đạo hữu ngâm mình trong hồ nước ấm tự nhiên chứa linh dịch tích tụ vạn năm, gột rửa tâm cảnh.', 'tot', '{"exp":{"min":45,"max":85}}'),
('linh_khi_7', '🍼 U Cốc Linh Nhũ 🍼', 'Trong thạch động sâu thẳm dưới U Minh Cốc, đạo hữu hứng được vài giọt thạch nhũ linh khí tinh khiết.', 'tot', '{"exp":{"min":50,"max":100}}'),
('linh_khi_8', '🌸 Vạn Niên Đan Quế 🌸', 'Hái được vài cánh hoa Đan Quế vạn năm rụng bên bờ suối, có thể dùng làm dược liệu quý.', 'tot', '{"itemRandom":{"loai":"Linh thảo"}}'),
('linh_khi_9', '🍉 Tiên Nhân Thực Độc 🍉', 'Ăn bừa một quả dã quả chín mọng đỏ rực bên đường, may mắn đây là tiên quả vô hại bổ sung linh lực.', 'tot', '{"exp":{"min":20,"max":60}}'),
('linh_khi_10', '🔥 Thái Dương Tinh Hỏa 🔥', 'Hấp thụ một luồng nhiệt năng tinh khiết của ánh nắng mặt trời giữa trưa, nung nấu pháp lực.', 'tot', '{"exp":{"min":35,"max":75}}'),
('linh_khi_11', '🌙 Thái Âm Nguyệt Hoa 🌙', 'Tĩnh tọa lúc trăng tròn, thu nhận nguyệt quang buốt lạnh làm dịu linh hồn và làm đầy đan điền.', 'tot', '{"exp":{"min":35,"max":75}}'),
('linh_khi_12', '⭐ Tinh Thần Lực Lượng ⭐', 'Đại trận tinh tú thời cổ đại hé mở, một tia sáng tinh hà bắn thẳng vào trán đạo hữu khai thông khiếu huyệt.', 'tot', '{"exp":{"min":40,"max":80}}'),
('linh_khi_13', '🍓 Tiên Quả Chín Đỏ 🍓', 'Tìm thấy một cây bụi tiên thảo trĩu quả đỏ rực, đạo hữu khéo léo hái cất vào túi trữ vật.', 'tot', '{"itemRandom":{"loai":"Linh thảo"}}'),
('linh_khi_14', '🛡️ Nhặt Được Binh Khí Cũ 🛡️', 'Dưới hố bùn cổ chiến trường, đạo hữu đào được một thanh phế kiếm còn nguyên vẹn cán.', 'tot', '{"itemRandom":{"loai":"Vũ khí"}}'),
('linh_khi_15', '🥋 Nhặt Được Giáp Rách 🥋', 'Nhặt được chiếc hộ tâm kính cũ rách bên cạnh bộ xương khô, lau chùi đi vẫn còn dùng được.', 'tot', '{"itemRandom":{"loai":"Giáp"}}'),
('linh_khi_16', '🐰 Động Vật Tri Linh 🐰', 'Một chú thỏ con có linh tính ngậm một viên linh thạch đặt trước chân đạo hữu như để cảm tạ ân không sát sinh.', 'tot', '{"stones":{"min":10,"max":30}}'),
('linh_khi_17', '🌪️ Ngũ Hành Triều Tịch 🌪️', 'Linh khí ngũ hành bốn phương bất ngờ triều bộc xoay quanh đạo hữu, giúp gia tăng linh lực.', 'tot', '{"exp":{"min":50,"max":90}}'),
('linh_khi_18', '🌱 Tử Đan Dược Thảo 🌱', 'Vô tình phát hiện một khóm linh thảo quý hiếm ẩn giấu sau bụi cây gai nhọn.', 'tot', '{"itemRandom":{"loai":"Linh thảo"}}'),
('linh_khi_19', '👴 Cổ Tu Chỉ Diểm 👴', 'Gặp tàn hồn của một vị tu sĩ cổ đại hiền từ, người truyền dạy cho đạo hữu một vài khẩu quyết vận khí.', 'tot', '{"exp":{"min":60,"max":110}}'),
('linh_khi_20', '⛲ Địa Linh Chi Tuyền ⛲ Fountain', 'Phát hiện mạch nước xuân phun trào mang theo linh khí ngào ngạt, đạo hữu tranh thủ xếp bằng hấp thụ.', 'tot', '{"exp":{"min":45,"max":80}}'),
('linh_khi_21', '⚡ Lôi Đình Tẩy Luyện ⚡', 'Trời đổ giông bão, đạo hữu mạo hiểm đón nhận dư lôi để trui rèn và tống khứ tạp niệm đan điền.', 'tot', '{"exp":{"min":50,"max":90}}'),
('linh_khi_22', '♟️ Bàn Cờ Cổ Nhân ♟️', 'Giải thành công một thế cờ tàn trên bàn đá rêu phong hoang dã, tâm trí thông suốt đốn ngộ.', 'tot', '{"exp":{"min":40,"max":75}}'),
('linh_khi_23', '🐢 Huyền Vũ Phún Linh 🐢', 'Huyền Vũ thú dưới đầm sâu ngoi lên thở ra một ngụm tiên khí rồi lặn mất, linh khí bao bọc đạo hữu.', 'tot', '{"exp":{"min":55,"max":95}}'),
('linh_khi_24', '🪶 Phượng Hoàng Tàn Lông 🪶', 'Tìm thấy một chiếc lông vũ rực lửa đã tắt ngúm của Phượng Hoàng cổ xưa, bán được kha khá linh thạch.', 'tot', '{"stones":{"min":20,"max":60}}'),
('linh_khi_25', '🐯 Bạch Hổ Tầm Tung 🐯', 'Men theo dấu chân Bạch Hổ thần thú, đạo hữu tìm được một nơi tu luyện bí ẩn vô cùng yên tĩnh.', 'tot', '{"exp":{"min":40,"max":85}}'),
('linh_khi_26', '🐉 Thanh Long Thổ Châu 🐉', 'Thần long lướt qua mây xanh làm rơi xuống một hạt long châu vụn, tỏa ra linh quang ấm áp.', 'tot', '{"exp":{"min":50,"max":100}}'),
('linh_khi_27', '💊 Di Tích Linh Đan 💊', 'Khai quật đưới gốc cây cổ thụ một bình gốm nhỏ niêm phong kỹ chứa đan dược cổ.', 'tot', '{"itemRandom":{"loai":"Đan dược"}}'),
('linh_khi_28', '🌾 Thảo Dược Hóa Linh 🌾', 'Một đóa linh thảo sắp hóa hình trốn chạy vô tình vấp ngã trúng tay đạo hữu.', 'tot', '{"itemRandom":{"loai":"Linh thảo"}}'),
('linh_khi_29', '🏥 Đan Các Phế Tích 🏥', 'Tìm kiếm trong tàn tích của một môn phái cổ xưa, phát hiện tủ đan dược còn vài lọ nguyên vẹn.', 'tot', '{"itemRandom":{"loai":"Đan dược"}}'),
('linh_khi_30', '⛏️ Huyền Thiết Khoáng Mạch ⛏️', 'Phát hiện một mỏ huyền thiết nhỏ lộ thiên, đạo hữu thu thập quặng bán lấy linh thạch.', 'tot', '{"stones":{"min":30,"max":60}}'),
('linh_khi_31', '🌀 Tụ Linh Trận Dư Ba 🌀', 'Bước vào phạm vi một tụ linh trận đã tàn lụi nhưng vẫn còn tích tụ chút linh khí loãng.', 'tot', '{"exp":{"min":40,"max":70}}'),
('linh_khi_32', '🍀 Hỗn Độn Thanh Liên 🍀', 'Nhìn thấy đóa hoa sen thanh khiết mọc giữa vũng bùn độc, đốn ngộ đạo lý bùn sen không nhiễm.', 'tot', '{"exp":{"min":60,"max":120}}'),
('linh_khi_33', '🌿 Huyền Cơ Thảo 🌿', 'Hái được một ngọn cỏ Huyền Cơ lay động theo nhịp thở của trời đất.', 'tot', '{"itemRandom":{"loai":"Linh thảo"}}'),
('linh_khi_34', '🍶 Nguyệt Hạ Độc Ẩm 🍶', 'Ngồi uống một bầu rượu nhạt dưới ánh trăng, bỗng cảm thấy tâm cảnh nhẹ nhõm, kinh mạch thư giãn.', 'tot', '{"exp":{"min":30,"max":50}}'),
('linh_khi_35', '🪷 Bích Thủy Liên Hoa 🪷', 'Hái được đóa sen bích thủy nghìn năm tỏa mùi thơm dịu nhẹ thanh tâm.', 'tot', '{"itemRandom":{"loai":"Linh thảo"}}'),
('linh_khi_36', '🦊 Linh Thú Dẫn Lộ 🦊', 'Một chú linh cáo nhỏ dẫn đạo hữu tới một đống đá giấu đầy túi trữ vật của kẻ xấu tạ thế.', 'tot', '{"stones":{"min":20,"max":50}}'),
('linh_khi_37', '🏜️ Động Cát Thượng Cổ 🏜️', 'Cơn gió lốc sa mạc thổi bay cát lộ ra lối vào mật thất cổ kính, đạo hữu vào nhặt được linh thạch cổ.', 'tot', '{"stones":{"min":25,"max":60}}'),
('linh_khi_38', '👃 Tiên Đan Dược Hương 👃', 'Chỉ ngửi thấy mùi dược hương bay ra từ đan lô cổ rỉ sét bên đường cũng giúp thông suốt khí hải.', 'tot', '{"exp":{"min":35,"max":70}}'),
('linh_khi_39', '🌈 Ngũ Sắc Tường Vân 🌈', 'Nhìn thấy cầu vồng tiên giới hiện ra trên nền trời xanh, đốn ngộ về sự tuần hoàn của ngũ hành.', 'tot', '{"exp":{"min":45,"max":85}}'),
('linh_khi_40', '❄️ Linh Sương Tẩy Căn ❄️', 'Trận linh sương lạnh lẽo phủ xuống nhục thân, thanh lọc toàn bộ độc tố tích tụ lâu ngày.', 'tot', '{"exp":{"min":50,"max":90}}'),
('linh_khi_41', '👥 Cố Nhân Đàm Đạo 👥', 'Gặp gỡ một vị đạo hữu đồng đạo cùng đàm luận đạo pháp suốt đêm, thu hoạch được nhiều tâm đắc.', 'tot', '{"exp":{"min":30,"max":70}}'),
('linh_khi_42', '🪙 Nhặt Linh Thạch Vụn 🪙', 'Trên đường đi, đạo hữu nhặt nhạnh được một số mẩu linh thạch vụn rớt ra từ xe áp tải tiêu cục.', 'tot', '{"stones":{"min":10,"max":30}}'),
('linh_khi_43', '🗿 Dã Ngoại Quái Thạch 🗿', 'Ngồi nghỉ chân trên một tảng đá kỳ lạ, hóa ra đây là một khối linh thạch thô chưa khai thác.', 'tot', '{"exp":{"min":20,"max":50}}'),
('linh_khi_44', '☄️ Thiên Tinh Thạch ☄️', 'Một mảnh thiên tinh thạch bốc cháy rớt xuống sa mạc ngay trước mắt đạo hữu mang theo linh thạch tinh thuần.', 'tot', '{"stones":{"min":35,"max":75}}'),
('linh_khi_45', '🦩 Di Cốt Tiên Hạc 🦩', 'Tìm thấy phần hài cốt tiên hạc tu hành ngàn năm, nhặt được thảo dược mọc cộng sinh xung quanh.', 'tot', '{"itemRandom":{"loai":"Linh thảo"}}'),

-- ==================== ĐẠI CƠ DUYÊN (DAI_CO_DUYEN): 25 SỰ KIỆN ====================
('dai_duyen_1', '💀 Tiên Nhân Di Thể 💀', 'Tìm thấy một bộ xương khô phát ra kim quang rực rỡ ẩn sâu trong sơn động, đạt được tiên nhân di vật.', 'dai_co_duyen', '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"💀 **Tiên Nhân Di Diện**: Đạo hữu {name} tìm thấy bộ xương cốt tiên nhân, đắc được bảo vật {itemName}!"}'),
('dai_duyen_2', '🔮 Huyền Môn Linh Tàng 🔮', 'Vô tình chạm vào cơ quan phá giải đại trận phong ấn tàn tích cổ tông môn, khai quật cổ linh tàng.', 'dai_co_duyen', '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"🔮 **Huyền Môn Linh Tàng**: Đạo hữu {name} vô tình phá giải trận pháp linh tàng, đạt được chí bảo {itemName}!"}'),
('dai_duyen_3', '🗡️ Thượng Cổ Kiếm Ý 🗡️', 'Đứng trước vách đá dựng đứng in sâu một vết chém khổng lồ, đạo hữu cảm ngộ được luồng kiếm ý bá đạo chưa tan.', 'dai_co_duyen', '{"exp":{"min":200,"max":350},"thienDaoLuc":true,"thienDaoLucMsg":"🗡️ **Thái Thượng Kiếm Ý**: Đạo hữu {name} lĩnh ngộ thượng cổ kiếm ý lưu lại trên vách đá, tu vi đột phá mạnh mẽ!"}'),
('dai_duyen_4', '📖 Vô Tự Thiên Thư 📖', 'Trong cổ thư điện nhặt được cuốn thiên thư không chữ, thần thức nhập vào đốn ngộ chân đạo đại lục.', 'dai_co_duyen', '{"exp":{"min":220,"max":400},"thienDaoLuc":true,"thienDaoLucMsg":"📖 **Thiên Thư Ngộ Đạo**: Đạo hữu {name} nhìn thấu Vô Tự Thiên Thư, càn khôn đại chấn, tu vi thăng tiến đại phúc!"}'),
('dai_duyen_5', '🐉 Long Tộc Huyết Trì 🐉', 'Tìm thấy vũng máu chân long ngàn năm ẩn tích dưới lòng đất rực lửa, đạo hữu nhảy vào tẩy tủy tôi luyện gân cốt.', 'dai_co_duyen', '{"exp":{"min":250,"max":450},"thienDaoLuc":true,"thienDaoLucMsg":"🐉 **Long Tộc Huyết Trì**: Đạo hữu {name} tắm máu rồng cổ xưa, nhục thân tráng kiện, nhận được tẩy cốt nghịch thiên!"}'),
('dai_duyen_6', '🧙 Tiên Nhân Mộng Cảnh 🧙', 'Nằm ngủ dưới gốc thông cổ thụ, đạo hữu gặp tiên nhân hiện hồn về truyền dạy pháp môn hô hấp thượng cổ trong giấc mộng.', 'dai_co_duyen', '{"exp":{"min":180,"max":300},"thienDaoLuc":true,"thienDaoLucMsg":"🧙 **Tiên Nhân Chỉ Lộ**: Đạo hữu {name} kỳ ngộ cao nhân đắc đạo chỉ điểm mê tân, tu vi tăng tiến thần tốc!"}'),
('dai_duyen_7', '💰 Tà Tu Sào Huyệt 💰', 'Một mình thâm nhập ổ của toán tà ma ngoại đạo bị thiên phạt, thu dọn toàn bộ bảo vật cất giấu của bọn chúng.', 'dai_co_duyen', '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"💰 **Tà Tu Linh Bảo**: Đạo hữu {name} tiệt sát sào huyệt tà tu, lục lọi được chí bảo {itemName}!"}'),
('dai_duyen_8', '☄️ Vẫn Thạch Khai Môn ☄️', 'Khối sao băng mang theo quặng thạch vũ trụ rơi trúng đầm lầy tạo ra vụ nổ lớn rải rác vạn thạch anh.', 'dai_co_duyen', '{"stones":{"min":150,"max":300},"thienDaoLuc":true,"thienDaoLucMsg":"☄️ **Thiên Thạch Phi Tiên**: Đạo hữu {name} nhặt được khối vẫn thạch thiên ngoại chứa tinh thuần linh thạch!"}'),
('dai_duyen_9', '🏺 Đan Vương Phế Tích 🏺', 'Vào nhầm đan phòng hoang phế của Đan Vương cổ đại, lượm lặt linh đơn dị dược ẩn sâu dưới đáy lò luyện.', 'dai_co_duyen', '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"🏺 **Đan Vương Di Vật**: Đạo hữu {name} khai quật Đan Vương phế tích, đạt được {itemName} cực phẩm!"}'),
('dai_duyen_10', '🌿 Vạn Niên Cửu Nhiễm Thảo 🌿', 'Tầm được một ngọn linh dược cửu nhiễm chín nghìn năm bừng bừng linh khí thượng cổ.', 'dai_co_duyen', '{"itemRandom":{"loai":"Linh thảo"},"thienDaoLuc":true,"thienDaoLucMsg":"🌿 **Kỳ Thảo Vương**: Đạo hữu {name} tầm được Vạn Niên Linh Thảo ngút trời vận khí!"}'),
('dai_duyen_11', '🍎 Ngũ Sắc Tiên Quả 🍎', 'Hái và nuốt chửng trái cây biến dị rực rỡ ngũ sắc mọc bên vực sâu vạn trượng, mở rộng đan điền.', 'dai_co_duyen', '{"exp":{"min":210,"max":380},"thienDaoLuc":true,"thienDaoLucMsg":"🍎 **Ngũ Sắc Tiên Quả**: Đạo hữu {name} ăn được tiên quả biến dị thượng cổ, thoát thai hoán cốt!"}'),
('dai_duyen_12', '🗡️ Cổ Kiếm Trận Khai 🗡️', 'Vượt qua muôn vàn sát khí cổ kiếm trận, thuần phục được một kiện phi kiếm có linh tính thượng cổ.', 'dai_co_duyen', '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"🗡️ **Tiên Kiếm Trận**: Đạo hữu {name} thu phục được phi kiếm {itemName} trong cổ kiếm trận!"}'),
('dai_duyen_13', '🐾 Thần Thú Giảng Đạo 🐾', 'Lắng nghe tiếng gầm khai sáng của một tôn thần thú viễn cổ đang ngủ say trong đầm lầy hỗn độn.', 'dai_co_duyen', '{"exp":{"min":160,"max":280},"thienDaoLuc":true,"thienDaoLucMsg":"🐾 **Chí Tôn Chỉ Điểm**: Đạo hữu {name} gặp yêu thú chí tôn chỉ dạy vận linh pháp môn!"}'),
('dai_duyen_14', '🐉 Long Châu Hóa Lộc 🐉', 'Nhặt được mảnh long châu bị nứt do thiên kiếp lôi đình đánh trúng của chân long thượng giới.', 'dai_co_duyen', '{"stones":{"min":100,"max":250},"thienDaoLuc":true,"thienDaoLucMsg":"🐉 **Long Châu Hóa Lộc**: Đạo hữu {name} nhận được chúc phúc Chân Long, hóa giải kiếp số và nhặt nhiều linh thạch!"}'),
('dai_duyen_15', '💧 Côn Luân Tiên Tuyền 💧', 'Được ngâm mình dưới giếng linh xuân trên đỉnh Côn Luân băng phủ, phục hồi toàn bộ căn cốt.', 'dai_co_duyen', '{"exp":{"min":200,"max":300},"thienDaoLuc":true,"thienDaoLucMsg":"💧 **Côn Luân Linh Tuyển**: Đạo hữu {name} uống ngụm linh xuân trên đỉnh Côn Luân, linh lực đại trướng!"}') ,
('dai_duyen_16', '⚡ Lôi Đế Ngọc Giản ⚡', 'Nhặt được ngọc giản thất lạc của Lôi Đế thượng giới, chứa đầy lôi điện linh lực tu luyện.', 'dai_co_duyen', '{"exp":{"min":240,"max":420},"thienDaoLuc":true,"thienDaoLucMsg":"⚡ **Lôi Đế Kiếp**: Đạo hữu {name} nhận được ngọc giản truyền thừa của Lôi Đế thượng cổ!"}'),
('dai_duyen_17', '🌌 Cực Hạn Tâm Cảnh 🌌', 'Trải qua thử thách ảo ảnh ngàn kiếp luân hồi trong động quỷ cô độc, tôi luyện ý chí vững chãi.', 'dai_co_duyen', '{"exp":{"min":150,"max":320},"thienDaoLuc":true,"thienDaoLucMsg":"🌌 **Huyễn Cảnh Ngộ Đạo**: Đạo hữu {name} vượt qua thất tình lục dục huyễn cảnh, tâm cảnh đại đột phá!"}'),
('dai_duyen_18', '🏰 Cổ Tiên Phủ Mở 🏰', 'Tiên phủ ngủ yên mười vạn năm đột nhiên xuất thế, đạo hữu chui lọt vào mật thất lấy đi linh bảo.', 'dai_co_duyen', '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"🏰 **Tiên Phủ Khai Mở**: Đạo hữu {name} tham gia đoạt bảo tại cổ tiên phủ, giành được {itemName}!"}'),
('dai_duyen_19', '💊 Tông Sư Chuyển Pháp 💊', 'Kỳ ngộ Đan Đạo Tông Sư đang tìm đệ tử chân truyền, được lão gia hướng dẫn vận khí hóa dược.', 'dai_co_duyen', '{"exp":{"min":180,"max":270},"thienDaoLuc":true,"thienDaoLucMsg":"💊 **Đan Đạo Chỉ Điểm**: Đạo hữu {name} được Đan Đạo Tông sư truyền thụ tâm đắc hóa luyện dược lực!"}'),
('dai_duyen_20', '🧠 Linh Thức Khai Mở 🧠', 'Ngồi thiền ngộ đạo dưới gốc bồ đề ngàn năm giúp thần thức đột ngột khai khiếu cực mạnh.', 'dai_co_duyen', '{"exp":{"min":200,"max":350},"thienDaoLuc":true,"thienDaoLucMsg":"🧠 **Thần Thức Khai Mở**: Đạo hữu {name} thức tỉnh đại linh thức càn khôn cọ rửa tu vi!"}'),
('dai_duyen_21', '🐢 Thần Quy Ban Lộc 🐢', 'Thượng Cổ Thần Quy rùa vàng ngoi lên khỏi sông lớn ban tặng cho đạo hữu một túi linh thạch khổng lồ.', 'dai_co_duyen', '{"stones":{"min":120,"max":280},"thienDaoLuc":true,"thienDaoLucMsg":"🐢 **Thủy Tổ Kỳ Ngộ**: Đạo hữu {name} bái kiến Thượng Cổ Thần Quy, được ban tặng tài bảo!"}'),
('dai_duyen_22', '🌟 Tinh Tú Triều Tụ 🌟', 'Vũ trụ dị biến, các tinh sao xếp thẳng hàng ban xuống luồng quang mang bao phủ đạo hữu tịnh tu.', 'dai_co_duyen', '{"exp":{"min":220,"max":360},"thienDaoLuc":true,"thienDaoLucMsg":"🌟 **Tinh Tú Triều Bái**: Đạo hữu {name} ngồi thiền đúng lúc tinh tú triều tụ bộc phát sức mạnh vũ trụ!"}'),
('dai_duyen_23', '📜 Huyền Môn Bí Quyển 📜', 'Tại đáy đầm sâu lượm được hộp sắt chứa bí kíp thất lạc huyền diệu của bổn môn tiên phẩm.', 'dai_co_duyen', '{"itemRandomEligible":true,"thienDaoLuc":true,"thienDaoLucMsg":"📜 **Bí Điển Hữu Duyên**: Đạo hữu {name} tầm được cổ tịch Huyền Môn, bên trong cất giấu {itemName}!"}'),
('dai_duyen_24', '🔥 Địa Tâm Cổ Hỏa 🔥', 'Vấp chân ngã vào động lửa ngầm chứa Địa Tâm Hỏa, may mắn chịu đựng được nhiệt độ và rèn cốt sắt.', 'dai_co_duyen', '{"exp":{"min":190,"max":310},"thienDaoLuc":true,"thienDaoLucMsg":"🔥 **Địa Hỏa Tẩy Luyện**: Đạo hữu {name} lấy Địa Tâm Cổ Hỏa tôi luyện nhục thân cường đại!"}'),
('dai_duyen_25', '💎 Đại Phú Lộc 💎', 'Ngã vực sâu đè chết một tôn tà tu đang chạy trốn, thừa hưởng toàn bộ bao bố linh thạch của hắn.', 'dai_co_duyen', '{"stones":{"min":200,"max":400},"thienDaoLuc":true,"thienDaoLucMsg":"💎 **Đệ Nhất Vận Khí**: Đạo hữu {name} ngã vực sâu không chết, nhặt được túi linh thạch khổng lồ!"}'),

-- ==================== VẬN RỦI (XUI_XEO): 30 SỰ KIỆN ====================
('van_rui_1', '🦋 Yêu Điệp Hút Hồn 🦋', 'Gặp đàn bướm yêu vây quanh huyễn hoặc tinh thần, pháp hải của đạo hữu bị tiêu hao trầm trọng.', 'xui_xeo', '{"mpPhat":0.15}'),
('van_rui_2', '⚡ Lôi Kiếp Cắn Trả ⚡', 'Thời tiết thay đổi giáng xuống một đạo thần lôi lạc đánh trúng nhục thân đạo hữu đang đi.', 'xui_xeo', '{"hpPhat":0.12}'),
('van_rui_3', '🔥 Tẩu Hỏa Nhập Ma 🔥', 'Trong lúc vội vã vận hành linh lực trên đường đi, đạo hữu bị hỗn loạn chân khí làm tổn thương đan điền.', 'xui_xeo', '{"hpPhat":0.20}'),
('van_rui_4', '☣️ Độc Vụ Trận ☣️', 'Vô tình bước vào vùng đầm lầy mù sương chứa đầy khí độc yêu thú tích tụ lâu ngày.', 'xui_xeo', '{"hpPhat":0.10}'),
('van_rui_5', '💨 Cổ Độc Chi Khí 💨', 'Khai quật nhầm ngôi mộ chứa cơ quan bẫy độc của cổ tu sĩ bảo vệ di thể.', 'xui_xeo', '{"hpPhat":0.15}'),
('van_rui_6', '👹 Huyết Ma Sát Khí 👹', 'Bị sát khí của Huyết Ma tông môn từ xa quét trúng đầu óc khiến pháp hải chấn động nứt nẻ.', 'xui_xeo', '{"mpPhat":0.25}'),
('van_rui_7', '🧟 U Minh Cương Thi 🧟', 'Gặp cương thi ngàn năm nhảy ra từ quan tài đá vồ trúng bả vai đạo hữu gây nhiễm tà khí độc.', 'xui_xeo', '{"hpPhat":0.18}'),
('van_rui_8', '🥷 Tà Tu Sát Thần 🥷', 'Bị toán tà tu lẻn vào rình rập phóng phi đao ám sát, đạo hữu tuy chống trả thoát được nhưng chấn thương.', 'xui_xeo', '{"hpPhat":0.15}'),
('van_rui_9', '🌌 Huyễn Cảnh Mê Hồn 🌌', 'Lạc lối trong đào hoa trận pháp mê hoặc tâm thần khiến đạo hữu tiêu hao nhiều pháp lực phá giải.', 'xui_xeo', '{"mpPhat":0.15}'),
('van_rui_10', '🔥 Hỏa Diệm Khí Độc 🔥', 'Hỏa sơn bộc phát tàn phát khí nóng làm bỏng rộp da thịt và suy giảm huyết khí đạo hữu.', 'xui_xeo', '{"hpPhat":0.12}'),
('van_rui_11', '❄️ Băng Phong Cốt ❄️', 'Luồng gió lạnh thấu xương từ đỉnh tuyết sơn thổi xuống đóng băng tạm thời các kinh mạch.', 'xui_xeo', '{"hpPhat":0.14}'),
('van_rui_12', '🕳️ Rơi Vực Thẳm 🕳️', 'Đang đi bộ ngắm tiên cảnh thì sụt chân rơi xuống khe nứt núi đá do chấn động địa chấn địa tầng.', 'xui_xeo', '{"hpPhat":0.25}'),
('van_rui_13', '🐍 Độc Xà Cắn 🐍', 'Bị một con thanh xà ẩn núp trên cành tre đớp trúng cổ chân truyền độc lực tàn phá cơ thể.', 'xui_xeo', '{"hpPhat":0.10}'),
('van_rui_14', '🦅 Kim Sí Điêu Quét 🦅', 'Thần điêu khổng lồ lướt qua quắp trúng bả vai quăng đạo hữu xuống bụi gai gai góc.', 'xui_xeo', '{"hpPhat":0.15}'),
('van_rui_15', '🦊 Cửu Vĩ Yêu Hồ 🦊', 'Gặp Hồ Ly chín đuôi trêu đùa rút cạn pháp lực bằng mị thuật rồi thả đi.', 'xui_xeo', '{"mpPhat":0.30}'),
('van_rui_16', '🪵 Địa Ngục Mộc Gai 🪵', 'Giẫm trúng cạm bẫy gai bằng linh mộc chứa kịch độc rải rác ngoài hoang dã.', 'xui_xeo', '{"hpPhat":0.08}'),
('van_rui_17', '💀 Hồn Phách Lung Lay 💀', 'Tiếng hú ma mị từ nghĩa địa tà ma chấn động thần hồn đạo hữu làm kiệt quệ linh tính pháp hải.', 'xui_xeo', '{"mpPhat":0.20}'),
('van_rui_18', '🛡️ Thiên Binh Dư Ba 🛡️', 'Lạc vào trận chiến của đại thế lực phái tiên nhân từ xa, dư ba kiếm khí quét qua làm tổn thương.', 'xui_xeo', '{"hpPhat":0.16}'),
('van_rui_19', '🌀 Cổ Trận Hút Linh 🌀', 'Trận pháp thời cổ bẫy thú hút sạch pháp lực lưu thông trong cơ thể đạo hữu.', 'xui_xeo', '{"mpPhat":0.25}'),
('van_rui_20', '🌫️ Sương Mù Lạc Lối 🌫️', 'Bị sương mù dày đặc che khuất tầm nhìn, loay hoay vận pháp lực duy trì hộ thể thoát ra.', 'xui_xeo', '{"mpPhat":0.10}'),
('van_rui_21', '⚡ Thiên Đố Thần Lôi ⚡', 'Tư chất quá tốt làm thiên đạo đố kỵ giáng xuống một lôi phạt cảnh cáo nổ banh xác.', 'xui_xeo', '{"hpPhat":0.18}'),
('van_rui_22', '🪡 Tà Tu Phi Châm 🪡', 'Bị trúng độc châm rậm rạp tẩm độc dược tàn phá sinh cơ đan điền.', 'xui_xeo', '{"hpPhat":0.11}'),
('van_rui_23', '❄️ Băng Hàn Pháp Hải ❄️', 'Pháp lực trong đan điền bị luồng hàn khí vạn năm đông cứng tạm thời tiêu hao sức mạnh.', 'xui_xeo', '{"mpPhat":0.20}'),
('van_rui_24', '🌋 Viêm Thú Phun Lửa 🌋', 'Con yêu thú rực lửa chui ra từ nham thạch thiêu rụi đạo bào và làm bỏng nặng cơ thể.', 'xui_xeo', '{"hpPhat":0.15}'),
('van_rui_25', '🕸️ Ngũ Độc Cổ Trận 🕸️', 'Bị vây khốn trong trận pháp tà môn của Ngũ Độc Giáo, chất độc ăn mòn sinh cơ kinh người.', 'xui_xeo', '{"hpPhat":0.22}'),
('van_rui_26', '🍄 Đoạt Phách Linh Cô 🍄', 'Hái nhầm loại nấm kịch độc phát ra bào tử mê ảo cắn rách khí hải đan điền.', 'xui_xeo', '{"mpPhat":0.25}'),
('van_rui_27', '🌀 Không Không Huyễn Trận 🌀', 'Càng vùng vẫy phá trận càng bị tiêu hao linh lực vô ích trước khi phá được vây hãm.', 'xui_xeo', '{"mpPhat":0.15}'),
('van_rui_28', '🧌 Cự Nhân Chấn Địa 🧌', 'Yêu thú cự nhân bước qua giẫm nát mặt đất tạo địa chấn cực lớn thổi bay đạo hữu chấn thương.', 'xui_xeo', '{"hpPhat":0.10}'),
('van_rui_29', '🌫️ Độc Mộc Chướng Khí 🌫️', 'Hít phải chướng khí độc bốc ra từ đống gỗ mục nát trong rừng rậm rạp yêu yêu quái vật.', 'xui_xeo', '{"hpPhat":0.15}'),
('van_rui_30', '🔄 Càn Khôn Nghịch Loạn 🔄', 'Không khí nghịch hành chèn ép toàn bộ sức mạnh tinh thần và pháp hải của đạo hữu kiệt quệ.', 'xui_xeo', '{"mpPhat":0.25}');

-- 3.3 Chèn dữ liệu balo và kỹ năng mẫu cho một người chơi cụ thể (Ví dụ: ID người dùng '1234567890' - nếu tồn tại trong players)
-- INSERT OR IGNORE INTO inventory (user_id, item_id, so_luong, trang_bi, nang_cap_sao) VALUES 
-- (1234567890, 'kiem_go', 1, 1, 0),
-- (1234567890, 'ao_vai', 1, 1, 0),
-- (1234567890, 'dan_hp_1', 5, 0, 0);

-- INSERT OR IGNORE INTO player_skills (user_id, skill_id, cap_do, kinh_nghiem_skill) VALUES 
-- (1234567890, 'thanh_phong_quyen', 1, 0);
