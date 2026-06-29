import test from 'node:test';
import assert from 'node:assert';

// Set NODE_ENV to test before importing models so that database opens in memory
process.env.NODE_ENV = 'test';

import { sequelize } from './database.js';
import { TuSi } from './models/TuSi.js';
import { CauHinhGuild } from './models/CauHinhGuild.js';
import * as config from './config.js';

test.describe('Tu Tien Gameplay Mechanics Tests', () => {
  
  test.before(async () => {
    // Sync models to the in-memory SQLite database
    await sequelize.sync({ force: true });
  });

  test.after(async () => {
    await sequelize.close();
  });

  test('Linh Can Roll Distributions', () => {
    const results = {
      "Ngũ Linh Căn": 0,
      "Lôi Linh Căn": 0,
      "Tứ Linh Căn": 0,
      "Tam Linh Căn": 0,
      "Song Linh Căn": 0,
      "Đơn Linh Căn": 0
    };

    // Roll 1000 times
    for (let i = 0; i < 1000; i++) {
      const { elements, displayName } = config.rollLinhCan();
      assert.ok(elements.length >= 1, "Danh sách thuộc tính linh căn không được rỗng");

      if (displayName.includes("Ngũ")) {
        results["Ngũ Linh Căn"]++;
        assert.strictEqual(elements.length, 5);
      } else if (displayName.includes("Lôi")) {
        results["Lôi Linh Căn"]++;
        assert.deepStrictEqual(elements, ["Loi"]);
      } else if (displayName.includes("Tứ")) {
        results["Tứ Linh Căn"]++;
        assert.strictEqual(elements.length, 4);
      } else if (displayName.includes("Tam")) {
        results["Tam Linh Căn"]++;
        assert.strictEqual(elements.length, 3);
      } else if (displayName.includes("Song")) {
        results["Song Linh Căn"]++;
        assert.strictEqual(elements.length, 2);
      } else {
        results["Đơn Linh Căn"]++;
        assert.strictEqual(elements.length, 1);
      }
    }

    console.log('\n[Roll Test (1000 rolls)]:', results);
  });

  test('Tu Si Creation, Base Stats and Growth', async () => {
    const tuSi = TuSi.build({
      idNguoiDung: "1234567890123456",
      ten: "Lý Thất Dạ",
      gioiTinh: "Nam",
      huongTu: "The Tu",
      linhCan: "Lôi Linh Căn"
    });
    tuSi.linhCanList = ["Loi"];
    tuSi.dongBoCanhGioi();

    // Kiểm tra đồng bộ hóa cảnh giới ban đầu
    assert.strictEqual(tuSi.canhGioi, "Luyện Khí");
    assert.strictEqual(tuSi.tang, 1);
    assert.strictEqual(tuSi.capDo, 1);

    // Kiểm tra chỉ số cơ bản
    const stats = tuSi.layChiSo();
    // Thể Tu HP gốc = 200
    assert.strictEqual(stats.max_hp, 200);
    // Thể Tu MP gốc = 50
    assert.strictEqual(stats.max_mp, 50);
    // Lôi Linh Căn: bạo thương tăng thêm 30% -> 1.50 + 0.30 = 1.80
    assert.strictEqual(Math.round(stats.crit_dmg * 100) / 100, 1.80);
    // Lôi Linh Căn: tu tốc x2.0
    assert.strictEqual(tuSi.layHeSoTuLuyen(), 2.0);

    // Kiểm tra chỉ số tăng trưởng ở Cấp 10 (Trúc Cơ Sơ Kỳ)
    tuSi.capDo = 10;
    tuSi.dongBoCanhGioi();
    assert.strictEqual(tuSi.canhGioi, "Trúc Cơ");
    assert.strictEqual(tuSi.tang, 1);

    const statsLvl10 = tuSi.layChiSo();
    // Thể Tu HP tăng trưởng = 30 / cấp. Cấp 10 = 200 + 30 * 9 = 470
    assert.strictEqual(statsLvl10.max_hp, 470);
    // Thể Tu MP tăng trưởng = 5 / cấp. Cấp 10 = 50 + 5 * 9 = 95
    assert.strictEqual(statsLvl10.max_mp, 95);
  });

  test('Player Breakthrough Failure Penalties', async () => {
    const tuSi = TuSi.build({
      idNguoiDung: "9876543210987654",
      ten: "Tiêu Viêm",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn"
    });
    tuSi.linhCanList = ["Hoa"];
    tuSi.capDo = 5;
    tuSi.dongBoCanhGioi();

    assert.strictEqual(tuSi.phatHp, 0.0);

    const [statDamaged, penaltyPct] = tuSi.nhanPhatDotPhaThatBai();
    
    // Kiểm tra giảm cấp độ
    assert.strictEqual(tuSi.capDo, 4);
    assert.ok(penaltyPct >= 5 && penaltyPct <= 10, "Hình phạt căn cơ phải dao động từ 5% đến 10%");

    const statsAfter = tuSi.layChiSo();
    const penaltyFieldName = `phat${statDamaged.charAt(0).toUpperCase() + statDamaged.slice(1)}`;
    assert.ok(tuSi[penaltyFieldName] > 0, "Trường phạt tương ứng phải được ghi nhận trị số lớn hơn 0");

    // Kiểm tra HP/MP bị cắn trả về 10%
    assert.strictEqual(tuSi.hp, Math.max(1, Math.floor(statsAfter.max_hp * 0.10)));
    assert.strictEqual(tuSi.mp, Math.max(1, Math.floor(statsAfter.max_mp * 0.10)));
  });
  
  test('Realm Mapping logic', () => {
    const realms = [
      { level: 1, realm: "Luyện Khí", tang: 1 },
      { level: 9, realm: "Luyện Khí", tang: 9 },
      { level: 10, realm: "Trúc Cơ", tang: 1 },
      { level: 12, realm: "Trúc Cơ", tang: 3 },
      { level: 13, realm: "Kim Đan", tang: 1 },
      { level: 30, realm: "Đại Thừa", tang: 3 },
      { level: 31, realm: "Tiên Nhân", tang: 1 }
    ];

    for (const testCase of realms) {
      const info = config.layThongTinCanhGioi(testCase.level);
      assert.strictEqual(info.realmName, testCase.realm, `Cấp ${testCase.level} phải ứng với cảnh giới ${testCase.realm}`);
    }
  });

  test('Cau Hinh Guild and Dao Nien Calculations', async () => {
    const setting = CauHinhGuild.build({
      idGuild: "1122334455667788",
      ngayKhoiTao: new Date(Date.now() - 32 * 60 * 1000) // 32 minutes ago
    });

    // 32 minutes / 15 minutes = 2.13 -> Math.floor(2.13) + 1 = 3 Đạo Niên
    assert.strictEqual(setting.layDaoNienHienTai(), 3, "32 phút trước phải bằng Đạo Niên thứ 3");

    setting.ngayKhoiTao = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    // 5 minutes / 15 minutes = 0.33 -> Math.floor(0.33) + 1 = 1 Đạo Niên
    assert.strictEqual(setting.layDaoNienHienTai(), 1, "5 phút trước phải bằng Đạo Niên thứ 1");
  });

});

