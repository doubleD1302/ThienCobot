-- ============================================================
--  ĐỘNG PHỦ & BẢNG XẾP HẠNG — THIẾT LẬP CƠ SỞ DỮ LIỆU
--  Tương thích: SQLite (mặc định) và MySQL/TiDB
-- ============================================================

-- ==========================================
-- 1. BẢNG MỚI CHO ĐỘNG PHỦ, DƯỢC VIÊN & SỦNG VẬT
-- ==========================================

-- Bảng Động Phủ
CREATE TABLE IF NOT EXISTS abodes (
  user_id       BIGINT PRIMARY KEY,
  level         INTEGER NOT NULL DEFAULT 0, -- 0 = chưa xây, 1-10 = cấp động phủ
  garden_level  INTEGER NOT NULL DEFAULT 1, -- cấp độ dược viên
  water_count   INTEGER NOT NULL DEFAULT 0, -- số lần tưới nước trong ngày
  last_watered  DATE NULL,                  -- ngày tưới nước gần nhất để reset
  pill_count    INTEGER NOT NULL DEFAULT 0, -- số đan dược sử dụng trong ngày
  last_pill     DATE NULL,                  -- ngày ăn đan dược gần nhất để reset
  last_song_tu  DATE NULL,                  -- ngày song tu gần nhất để reset
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE
);

-- Bảng Ô Đất Trồng (Dược Viên)
CREATE TABLE IF NOT EXISTS garden_plots (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      BIGINT NOT NULL,
  slot_index   INTEGER NOT NULL,                     -- ô đất số mấy (0 đến 25)
  seed_item_id VARCHAR(50) NULL,                     -- mã hạt giống (null nếu trống)
  planted_at   DATETIME NULL,                        -- ngày trồng
  status       VARCHAR(20) NOT NULL DEFAULT 'EMPTY', -- EMPTY, PLANTED, READY
  FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE
);

-- Bảng Sủng Vật (Pets)
CREATE TABLE IF NOT EXISTS pets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      BIGINT NOT NULL,
  name         VARCHAR(100) NOT NULL,                -- tên sủng vật
  type         VARCHAR(50) NOT NULL,                 -- loài (ma_lang, loi_diep, than_vien, to_long, phuong_hoang, ky_lan)
  rarity       VARCHAR(20) NOT NULL DEFAULT 'NORMAL',-- NORMAL (Linh thú), ANCIENT (Thần thú thượng cổ)
  level        INTEGER NOT NULL DEFAULT 1,
  exp          INTEGER NOT NULL DEFAULT 0,
  tu_chat      INTEGER NOT NULL DEFAULT 100,         -- tư chất sủng vật (ảnh hưởng chỉ số cộng thêm)
  is_active    BOOLEAN NOT NULL DEFAULT 0,           -- 1 = đang xuất chiến hộ thể, 0 = nghỉ ngơi
  FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE
);

-- ==========================================
-- 2. ĐĂNG KÝ VẬT PHẨM MỚI VÀO BẢNG ITEMS
-- ==========================================

-- Hạt Giống (Rớt ra từ boss, bí cảnh, lịch luyện)
INSERT OR REPLACE INTO items (id, ten, loai, do_hiem, gia_co_so, chi_so_json, yeu_cau_canh_gioi, mo_ta) VALUES
('hat_giong_linh_chi', 'Hạt Giống Linh Chi 🌰', 'Linh thảo', 'Thường', 50, '{}', 1, 'Hạt giống U Minh Linh Chi, có thể đem trồng tại Dược Viên của Động phủ.'),
('hat_giong_nhan_sam', 'Hạt Giống Nhân Sâm 🌰', 'Linh thảo', 'Hiếm', 100, '{}', 1, 'Hạt giống Tuyết Sơn Nhân Sâm, chứa đựng linh năng mạnh mẽ.');

-- Linh thảo thu hoạch theo phẩm chất
INSERT OR REPLACE INTO items (id, ten, loai, do_hiem, gia_co_so, chi_so_json, yeu_cau_canh_gioi, mo_ta) VALUES
('linh_chi_luc', 'U Minh Linh Chi (Phàm) 🍄', 'Linh thảo', 'Thường', 50, '{}', 1, 'Linh chi 100 năm tuổi, thu hoạch từ dược viên.'),
('linh_chi_lam', 'U Minh Linh Chi (Ưu) 🍄', 'Linh thảo', 'Hiếm', 150, '{}', 1, 'Linh chi 1000 năm tuổi, linh khí dồi dào.'),
('linh_chi_tim', 'U Minh Linh Chi (Siêu) 🍄', 'Linh thảo', 'Cực hiếm', 500, '{}', 1, 'Linh chi vạn năm hấp thu nguyệt hoa.'),
('linh_chi_vang', 'U Minh Linh Chi (Tuyệt) 🍄', 'Linh thảo', 'Huyền thoại', 1500, '{}', 1, 'Linh chi mười vạn năm trân quý vô ngần.'),
('linh_chi_do', 'U Minh Linh Chi (Tiên) 🍄', 'Linh thảo', 'Thần cấp', 5000, '{}', 1, 'Tiên dược trăm vạn năm chỉ có trong truyền thuyết.'),

('nhan_sam_luc', 'Tuyết Sơn Nhân Sâm (Phàm) 🥕', 'Linh thảo', 'Thường', 80, '{}', 1, 'Nhân sâm 100 năm tuổi tốt cho khí huyết.'),
('nhan_sam_lam', 'Tuyết Sơn Nhân Sâm (Ưu) 🥕', 'Linh thảo', 'Hiếm', 240, '{}', 1, 'Nhân sâm 1000 năm tuổi đào từ tuyết sơn hoang dã.'),
('nhan_sam_tim', 'Tuyết Sơn Nhân Sâm (Siêu) 🥕', 'Linh thảo', 'Cực hiếm', 800, '{}', 1, 'Cực phẩm nhân sâm vạn năm hộ thể phục mạch.'),
('nhan_sam_vang', 'Tuyết Sơn Nhân Sâm (Tuyệt) 🥕', 'Linh thảo', 'Huyền thoại', 2500, '{}', 1, 'Nhân sâm mười vạn năm, linh khí ngút trời.'),
('nhan_sam_do', 'Tuyết Sơn Nhân Sâm (Tiên) 🥕', 'Linh thảo', 'Thần cấp', 8000, '{}', 1, 'Tiên thảo sâm vương trăm vạn năm cải tử hoàn sinh.');

-- Đan Dược Tu Vi & Linh Thảo
INSERT OR REPLACE INTO items (id, ten, loai, do_hiem, gia_co_so, chi_so_json, yeu_cau_canh_gioi, mo_ta) VALUES
('dan_tu_vi_luyen_khi', 'Luyện Khí Tu Vi Đan', 'Đan dược', 'Thường', 1000, '{}', 1, 'Tu vi đan phù hợp cho tu sĩ Luyện Khí Kỳ.'),
('dan_tu_vi_truc_co', 'Trúc Cơ Tu Vi Đan', 'Đan dược', 'Hiếm', 4000, '{}', 10, 'Tu vi đan phù hợp cho tu sĩ Trúc Cơ Kỳ.'),
('dan_tu_vi_kim_dan', 'Kim Đan Tu Vi Đan', 'Đan dược', 'Cực hiếm', 10000, '{}', 13, 'Tu vi đan phù hợp cho tu sĩ Kim Đan Kỳ.'),
('dan_tu_vi_nguyen_anh', 'Nguyên Anh Tu Vi Đan', 'Đan dược', 'Huyền thoại', 30000, '{}', 16, 'Tu vi đan phù hợp cho tu sĩ Nguyên Anh Kỳ.'),
('hat_giong_ngoc_lo_sinh_co', 'Hạt Giống Ngọc Lộ Sinh Cơ Thảo', 'Linh thảo', 'Thường', 200, '{}', 10, 'Hạt giống Ngọc Lộ Sinh Cơ Thảo, gieo trồng tại dược viên.'),
('ngoc_lo_sinh_co_thao', 'Ngọc Lộ Sinh Cơ Thảo', 'Linh thảo', 'Hiếm', 1000, '{}', 10, 'Ngọc Lộ Sinh Cơ Thảo chứa sinh cơ bạt ngàn, dùng luyện đan tu vi.'),
('hat_giong_kim_o_tudan', 'Hạt Giống Kim Ô Tụ Đan Hoa', 'Linh thảo', 'Thường', 200, '{}', 13, 'Hạt giống Kim Ô Tụ Đan Hoa, gieo trồng tại dược viên.'),
('kim_o_tu_dan_hoa', 'Kim Ô Tụ Đan Hoa', 'Linh thảo', 'Hiếm', 2500, '{}', 13, 'Kim Ô Tụ Đan Hoa tỏa ánh thái dương, dùng luyện đan tu vi.'),
('hat_giong_tu_van_hoa_anh', 'Hạt Giống Tử Vận Hóa Anh Thảo', 'Linh thảo', 'Thường', 200, '{}', 16, 'Hạt giống Tử Vận Hóa Anh Thảo, gieo trồng tại dược viên.'),
('tu_van_hoa_anh_thao', 'Tử Vận Hóa Anh Thảo', 'Linh thảo', 'Hiếm', 6000, '{}', 16, 'Tử Vận Hóa Anh Thảo tụ tử khí đông lai, dùng luyện đan tu vi.');

-- Trứng Linh thú
INSERT OR REPLACE INTO items (id, ten, loai, do_hiem, gia_co_so, chi_so_json, yeu_cau_canh_gioi, mo_ta) VALUES
('trung_linh_thu', 'Trứng Linh Thú 🥚', 'Linh thảo', 'Hiếm', 5000, '{}', 1, 'Trứng chứa sinh cơ của yêu thú hiền lành, có thể ấp nở tại Động Phủ.');
