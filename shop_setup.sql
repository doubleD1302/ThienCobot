-- ============================================================
--  SHOP THIÊN ĐẠO TU TIÊN — SQL SETUP SCRIPT
--  Tương thích: SQLite (dùng ngay) và MySQL/TiDB (dùng phần comment)
--
--  CÁCH DÙNG:
--  • SQLite  → Chạy TOÀN BỘ file này (bỏ qua phần MySQL comment)
--  • MySQL   → Bỏ comment phần MySQL, xoá phần SQLite rồi chạy
-- ============================================================

-- ==========================================
-- PHẦN MYSQL / TiDB  (bỏ comment nếu dùng MySQL)
-- ==========================================
/*
CREATE TABLE IF NOT EXISTS shop_items (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  item_id        VARCHAR(50)  NOT NULL,
  gia_ban        INT          NOT NULL DEFAULT 0,
  gia_loai       VARCHAR(20)  NOT NULL DEFAULT 'linh_thach',
  so_luong_ton   INT          NOT NULL DEFAULT -1,
  yeu_cau_cap_do INT          NOT NULL DEFAULT 1,
  hien_thi       BOOLEAN      NOT NULL DEFAULT TRUE,
  thu_tu         INT          NOT NULL DEFAULT 0,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lich_su_mua (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT      NOT NULL,
  item_id     VARCHAR(50) NOT NULL,
  so_luong    INT         NOT NULL DEFAULT 1,
  gia_da_tra  INT         NOT NULL DEFAULT 0,
  gia_loai    VARCHAR(20) NOT NULL DEFAULT 'linh_thach',
  mua_luc     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
*/

-- ==========================================
-- PHẦN SQLITE  (mặc định - dùng khi local)
-- ==========================================

CREATE TABLE IF NOT EXISTS shop_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id        VARCHAR(50)  NOT NULL,
  gia_ban        INTEGER      NOT NULL DEFAULT 0,
  gia_loai       VARCHAR(20)  NOT NULL DEFAULT 'linh_thach',
  so_luong_ton   INTEGER      NOT NULL DEFAULT -1,
  yeu_cau_cap_do INTEGER      NOT NULL DEFAULT 1,
  hien_thi       INTEGER      NOT NULL DEFAULT 1,
  thu_tu         INTEGER      NOT NULL DEFAULT 0,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lich_su_mua (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     BIGINT      NOT NULL,
  item_id     VARCHAR(50) NOT NULL,
  so_luong    INTEGER     NOT NULL DEFAULT 1,
  gia_da_tra  INTEGER     NOT NULL DEFAULT 0,
  gia_loai    VARCHAR(20) NOT NULL DEFAULT 'linh_thach',
  mua_luc     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE
);

-- ==========================================
-- DU LIEU MAU SHOP (SQLite va MySQL deu dung duoc)
-- ==========================================

-- Gian hang tan thu (Luyen Khi - cap 1)
INSERT OR IGNORE INTO shop_items (item_id, gia_ban, gia_loai, so_luong_ton, yeu_cau_cap_do, hien_thi, thu_tu) VALUES
('dan_hp_1',         50,  'linh_thach', -1, 1,  1, 10),
('dan_mp_1',         50,  'linh_thach', -1, 1,  1, 11),
('kiem_go',         100,  'linh_thach', -1, 1,  1, 20),
('truong_go',       100,  'linh_thach', -1, 1,  1, 21),
('ao_vai',          100,  'linh_thach', -1, 1,  1, 22),
('ngoc_boi_tan_thu',150,  'linh_thach', -1, 1,  1, 23),
('phap_bao_ho_than',700,  'linh_thach', -1, 1,  1, 30),
('co_bao_kiem_khi', 800,  'linh_thach', -1, 1,  1, 31);

-- Gian hang Truc Co (cap 10)
INSERT OR IGNORE INTO shop_items (item_id, gia_ban, gia_loai, so_luong_ton, yeu_cau_cap_do, hien_thi, thu_tu) VALUES
('dan_hp_2',          200, 'linh_thach', -1, 10, 1, 40),
('dan_mp_2',          200, 'linh_thach', -1, 10, 1, 41),
('kiem_sat',          500, 'linh_thach', -1, 10, 1, 50),
('truong_truc',       500, 'linh_thach', -1, 10, 1, 51),
('ao_da',             500, 'linh_thach', -1, 10, 1, 52),
('ngoc_boi_linh_ngoc',600, 'linh_thach', -1, 10, 1, 53),
('phap_bao_cong_kich',1500,'linh_thach', -1, 10, 1, 60),
('co_bao_dong_tu',    1600,'linh_thach', -1, 10, 1, 61);

-- Gian hang Hoa Than (cap 19)
INSERT OR IGNORE INTO shop_items (item_id, gia_ban, gia_loai, so_luong_ton, yeu_cau_cap_do, hien_thi, thu_tu) VALUES
('kiem_huyen_thiet',  2500,'linh_thach', -1, 19, 1, 70),
('giap_huyen_thiet',  2500,'linh_thach', -1, 19, 1, 71),
('ngoc_boi_tien_van', 2800,'linh_thach', -1, 19, 1, 72),
('phap_bao_hon_ton',  5000,'linh_thach', -1, 19, 1, 73),
('co_bao_tien_dan',   4500,'linh_thach', -1, 19, 1, 74);
