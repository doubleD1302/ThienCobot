import test from 'node:test';
import assert from 'node:assert';

// Set NODE_ENV to test before importing models so that database opens in memory
process.env.NODE_ENV = 'test';

const { sequelize } = await import('./database.js');
const { TuSi } = await import('./models/TuSi.js');
const { CauHinhGuild } = await import('./models/CauHinhGuild.js');
const { CanhGioi } = await import('./models/CanhGioi.js');
const { ThoiGianCho } = await import('./models/ThoiGianCho.js');
const { Item } = await import('./models/Item.js');
const { Inventory } = await import('./models/Inventory.js');
const { Skill } = await import('./models/Skill.js');
const { PlayerSkill } = await import('./models/PlayerSkill.js');
const config = await import('./config.js');

test.describe('Tu Tien Gameplay Mechanics Tests', () => {
  
  test.before(async () => {
    // Sync models to the in-memory SQLite database
    await sequelize.sync({ force: true });

    // Seed realms (CanhGioi) data for testing
    const seedData = [];
    for (let lvl = 1; lvl <= 31; lvl++) {
      const baseSpeed = Math.floor(100 * (1.10 ** (lvl - 1)));
      seedData.push({
        capDo: lvl,
        tenCanhGioi: lvl <= 9 ? "Luyện Khí" : "Trúc Cơ",
        tenTang: lvl <= 9 ? `Tầng ${lvl}` : "Sơ Kỳ",
        linhLucYeuCau: Math.floor(100 * (1.30 ** (lvl - 1))),
        tocDoCoBan: baseSpeed
      });
    }
    await CanhGioi.bulkCreate(seedData);
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

  test('Automatic cultivation updates based on elapsed minutes', async () => {
    const { BoDieuKhienGoc } = await import('./controllers/BoDieuKhienGoc.js');
    
    // Tạo nhân vật test
    const tuSi = await TuSi.create({
      idNguoiDung: "5555555555555555",
      ten: "Hàn Lập",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Mộc Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 0,
      linhLucDu: 0.0,
      linhThachDu: 0.0
    });
    tuSi.linhCanList = ["Moc"];
    
    // Giả lập thời điểm cập nhật cuối cùng là 5 phút trước
    const now = Date.now();
    const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
    tuSi.lastUpdateTuVi = fiveMinutesAgo;
    await tuSi.save();

    const controller = new BoDieuKhienGoc();
    const result = await controller.kiemTraVaNhanTuVi(tuSi);

    assert.strictEqual(result.completed, true);
    // 5 phút = 5/15 = 1/3 Đạo Niên. 
    // Exp: 100 * 1.0 * (1/3) = 33.33 -> 33
    // Stones: 10 * 1 * (1/3) = 3.33 -> 3
    assert.strictEqual(result.exp, 33);
    assert.strictEqual(result.stones, 3);
    assert.strictEqual(tuSi.linhLuc, 33);
    assert.strictEqual(tuSi.linhThach, 3);
    
    // Kiểm tra số dư float được tích lũy đúng
    assert.ok(tuSi.linhLucDu > 0.3 && tuSi.linhLucDu < 0.4);
    assert.ok(tuSi.linhThachDu > 0.3 && tuSi.linhThachDu < 0.4);

    // Thời gian update mới phải đúng bằng: mốc cũ + 5 phút
    const expectedTime = fiveMinutesAgo.getTime() + 5 * 60 * 1000;
    assert.strictEqual(new Date(tuSi.lastUpdateTuVi).getTime(), expectedTime);

    await tuSi.destroy();
  });

  test('Automatic cultivation carries over fractional remainders and sub-minute time', async () => {
    const { BoDieuKhienGoc } = await import('./controllers/BoDieuKhienGoc.js');
    
    // Tạo nhân vật test
    const tuSi = await TuSi.create({
      idNguoiDung: "6666666666666666",
      ten: "Hàn Lập Phụ",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Mộc Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 0,
      linhLucDu: 0.0,
      linhThachDu: 0.0
    });
    tuSi.linhCanList = ["Moc"];
    
    // Giả lập thời điểm cập nhật cuối cùng là 1.5 phút trước (90 giây)
    const now = Date.now();
    const ninetySecondsAgo = new Date(now - 90 * 1000);
    tuSi.lastUpdateTuVi = ninetySecondsAgo;
    await tuSi.save();

    const controller = new BoDieuKhienGoc();
    const result = await controller.kiemTraVaNhanTuVi(tuSi);

    // Chỉ cập nhật cho 1 phút chẵn, 30 giây lẻ sẽ được giữ lại
    assert.strictEqual(result.completed, true);
    // 1 phút = 1/15 Đạo Niên. 
    // Exp: 100 * 1.0 * (1/15) = 6.67 -> 6
    // Stones: 10 * 1 * (1/15) = 0.67 -> 0
    assert.strictEqual(result.exp, 6);
    assert.strictEqual(result.stones, 0);
    assert.strictEqual(tuSi.linhLuc, 6);
    assert.strictEqual(tuSi.linhThach, 0);

    // Số dư
    assert.ok(tuSi.linhLucDu > 0.6 && tuSi.linhLucDu < 0.7);
    assert.ok(tuSi.linhThachDu > 0.6 && tuSi.linhThachDu < 0.7);

    // Thời gian update mới phải dịch chuyển đúng 1 phút
    const expectedTime = ninetySecondsAgo.getTime() + 60 * 1000;
    assert.strictEqual(new Date(tuSi.lastUpdateTuVi).getTime(), expectedTime);

    await tuSi.destroy();
  });

  test('layChiSo with equipped items increases stats', async () => {
    const { Item } = await import('./models/Item.js');
    
    const tuSi = await TuSi.create({
      idNguoiDung: "7777777777777777",
      ten: "Lục Cảnh",
      gioiTinh: "Nam",
      huongTu: "The Tu",
      linhCan: "Kim Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 0
    });
    tuSi.linhCanList = ["Kim"];
    await tuSi.save();

    const kiemGo = Item.build({
      id: "test_kiem_go",
      ten: "Kiếm Gỗ Cổ",
      loai: "Vũ khí",
      doHiem: "Thường",
      giaCoSo: 100
    });
    kiemGo.chiSo = { vat_cong: 15 };

    const giapDa = Item.build({
      id: "test_giap_da",
      ten: "Giáp Da Rách",
      loai: "Giáp",
      doHiem: "Thường",
      giaCoSo: 100
    });
    giapDa.chiSo = { vat_phong: 10, hp: 50 };

    const statsRaw = tuSi.layChiSo([]);
    const statsEquipped = tuSi.layChiSo([kiemGo, giapDa]);

    // Thể Tu: Kim Linh Căn nhân x1.2 Công vật lý
    const expectedBaseAtk = 25; // level 1 base_stats.vat_cong
    const expectedAtkWithItem = Math.floor((expectedBaseAtk + 15) * 1.2);
    
    assert.strictEqual(statsEquipped.vat_cong, expectedAtkWithItem);
    assert.strictEqual(statsEquipped.vat_phong, statsRaw.vat_phong + 10);
    assert.strictEqual(statsEquipped.max_hp, statsRaw.max_hp + 50);

    await tuSi.destroy();
  });

  test('Skill learning logic and cảnh giới restriction', async () => {
    const { Skill } = await import('./models/Skill.js');
    const { PlayerSkill } = await import('./models/PlayerSkill.js');
    const { boDieuKhienKyNang } = await import('./controllers/BoDieuKhienKyNang.js');
    
    const tuSi = await TuSi.create({
      idNguoiDung: "8888888888888888",
      ten: "Lục Cảnh Đệ Tử",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 0
    });
    tuSi.linhCanList = ["Hoa"];
    await tuSi.save();

    // Seed test skills
    await Skill.findOrCreate({
      where: { id: "test_hoa_diem" },
      defaults: {
        ten: "Hỏa Diễm Thử Nghiệm",
        loai: "Phép thuật",
        satThuong: 120,
        cooldown: 6,
        yeuCauCanhGioi: 1
      }
    });

    await Skill.findOrCreate({
      where: { id: "test_ngu_loi" },
      defaults: {
        ten: "Ngự Lôi Thử Nghiệm",
        loai: "Phép thuật",
        satThuong: 150,
        cooldown: 12,
        yeuCauCanhGioi: 10
      }
    });

    // Giả lập lệnh gọi của Discord để học skill cấp 1 (Hợp lệ)
    let replyEmbeds = [];
    const interactionMock1 = {
      user: { id: "8888888888888888" },
      options: {
        getSubcommand: () => 'hoc',
        getString: () => 'test_hoa_diem'
      },
      deferReply: async () => {},
      editReply: async (payload) => {
        replyEmbeds = payload.embeds;
      }
    };

    await boDieuKhienKyNang.lenhKyNang.execute(interactionMock1);

    const checkPsk = await PlayerSkill.findOne({
      where: { idNguoiDung: tuSi.idNguoiDung, skillId: "test_hoa_diem" }
    });
    assert.ok(checkPsk);
    assert.strictEqual(checkPsk.capDo, 1);

    // Thử học skill cấp 10 (Trúc Cơ) trong khi tu sĩ mới level 1 (Luyện Khí) -> Phải thất bại
    const interactionMock2 = {
      user: { id: "8888888888888888" },
      options: {
        getSubcommand: () => 'hoc',
        getString: () => 'test_ngu_loi'
      },
      deferReply: async () => {},
      editReply: async (payload) => {
        replyEmbeds = payload.embeds;
      }
    };

    await boDieuKhienKyNang.lenhKyNang.execute(interactionMock2);
    const checkPsk2 = await PlayerSkill.findOne({
      where: { idNguoiDung: tuSi.idNguoiDung, skillId: "test_ngu_loi" }
    });
    assert.strictEqual(checkPsk2, null); // Phải null vì level bất túc

    await tuSi.destroy();
  });

});

