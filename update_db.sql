-- SQL Update Script for Thien Co RPG Bot
-- Dùng cho DataGrip để cập nhật bảng `players`

-- ==========================================
-- 1. DÀNH CHO MYSQL / TiDB
-- ==========================================
-- ALTER TABLE players ADD COLUMN last_update_tuvi DATETIME NULL;
-- ALTER TABLE players ADD COLUMN linh_luc_du DOUBLE NOT NULL DEFAULT 0.0;
-- ALTER TABLE players ADD COLUMN linh_thach_du DOUBLE NOT NULL DEFAULT 0.0;


-- ==========================================
-- 2. DÀNH CHO SQLITE (Mặc định cục bộ)
-- ==========================================
ALTER TABLE players ADD COLUMN last_update_tuvi DATETIME NULL;
ALTER TABLE players ADD COLUMN linh_luc_du REAL NOT NULL DEFAULT 0.0;
ALTER TABLE players ADD COLUMN linh_thach_du REAL NOT NULL DEFAULT 0.0;
