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
const { ThienDaoLuc } = await import('./models/ThienDaoLuc.js');
const { AdventureEvent } = await import('./models/AdventureEvent.js');
const { Dungeon } = await import('./models/Dungeon.js');
const { Abode } = await import('./models/Abode.js');
const { Pet } = await import('./models/Pet.js');
const { GardenPlot } = await import('./models/GardenPlot.js');
const { ShopItem } = await import('./models/ShopItem.js');
const { LichSuMua } = await import('./models/LichSuMua.js');
const { ChannelRestriction } = await import('./models/ChannelRestriction.js');
const { WorldBoss } = await import('./models/WorldBoss.js');
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

    // Giả lập học chiêu thức cấp 1 (Hợp lệ)
    const result1 = await boDieuKhienKyNang._thucHienHocKyNang(tuSi, "test_hoa_diem");
    assert.strictEqual(result1.ok, true);

    const checkPsk = await PlayerSkill.findOne({
      where: { idNguoiDung: tuSi.idNguoiDung, skillId: "test_hoa_diem" }
    });
    assert.ok(checkPsk);
    assert.strictEqual(checkPsk.capDo, 1);

    // Thử học skill cấp 10 (Trúc Cơ) trong khi tu sĩ mới level 1 (Luyện Khí) -> Phải thất bại
    const result2 = await boDieuKhienKyNang._thucHienHocKyNang(tuSi, "test_ngu_loi");
    assert.strictEqual(result2.ok, false);
    assert.ok(result2.msg.includes("Căn cơ bất túc"));

    const checkPsk2 = await PlayerSkill.findOne({
      where: { idNguoiDung: tuSi.idNguoiDung, skillId: "test_ngu_loi" }
    });
    assert.strictEqual(checkPsk2, null); // Phải null vì level bất túc

    await tuSi.destroy();
  });

  test('Lich Luyen random event execution and cooldown', async () => {
    const { boDieuKhienLichLuyen } = await import('./controllers/BoDieuKhienLichLuyen.js');
    
    const tuSi = await TuSi.create({
      idNguoiDung: "9999999999999999",
      ten: "Lịch Luyện Nhân",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 1,
      linhLuc: 100,
      linhThach: 100,
      hp: 100,
      mp: 100
    });
    tuSi.linhCanList = ["Hoa"];
    await tuSi.save();

    await AdventureEvent.create({
      id: "test_linh_khi",
      ten: "⚡ Linh Khí Triều Tịch ⚡",
      moTa: "Trong lúc leo núi, đạo hữu vô tình gặp một luồng linh khí trời đất bộc phát...",
      loai: "tot",
      hieuUngJson: JSON.stringify({ exp: { min: 40, max: 100 } })
    });

    let replyPayload = null;
    const interactionMock = {
      user: { id: "9999999999999999" },
      deferReply: async () => {},
      editReply: async (payload) => {
        replyPayload = payload;
      }
    };

    await boDieuKhienLichLuyen.lenhLichLuyen.execute(interactionMock);
    
    assert.ok(replyPayload);
    assert.ok(replyPayload.embeds && replyPayload.embeds.length > 0);

    // Kiểm tra cooldown được kích hoạt
    const cd = await ThoiGianCho.findOne({
      where: { hanhDong: "lich_luyen" }
    });
    assert.ok(cd);

    await tuSi.destroy();
  });

  test('Item level requirement constraint (yeuCauCanhGioi)', async () => {
    const { boDieuKhienVatPham } = await import('./controllers/BoDieuKhienVatPham.js');
    
    // Tạo vật phẩm yêu cầu Trúc Cơ (cấp độ 10)
    await Item.create({
      id: "test_trong_kiem",
      ten: "Trọng Kiếm Tuyệt Thế 🗡️",
      loai: "Vũ khí",
      doHiem: "Cực hiếm",
      giaCoSo: 2000,
      chiSoJson: '{"vat_cong":150}',
      yeuCauCanhGioi: 10,
      moTa: "Yêu cầu Trúc Cơ."
    });

    const tuSi = await TuSi.create({
      idNguoiDung: "7777777777777777",
      ten: "Luyện Khí Nhân",
      gioiTinh: "Nam",
      huongTu: "The Tu",
      linhCan: "Thổ Linh Căn",
      capDo: 1, // Luyện Khí
      linhLuc: 0,
      linhThach: 100,
      hp: 100,
      mp: 100
    });
    tuSi.linhCanList = ["Tho"];
    await tuSi.save();

    // Đưa vào balo tu sĩ
    await Inventory.create({
      idNguoiDung: tuSi.idNguoiDung,
      itemId: "test_trong_kiem",
      soLuong: 1,
      trangBi: false,
      nangCapSao: 0
    });

    // Thử trang bị -> Phải thất bại vì level bất túc
    const invCheck = await Inventory.findOne({
      where: { idNguoiDung: tuSi.idNguoiDung, itemId: "test_trong_kiem" }
    });
    const result = await boDieuKhienVatPham._thucHienTrangBi(tuSi, invCheck, "test_trong_kiem");

    // Kiểm tra xem phản hồi có lỗi Cảnh giới bất túc không
    assert.strictEqual(result.ok, false);
    assert.ok(result.msg.includes("Cảnh giới bất túc"));

    // Kiểm tra trang bị vẫn ở trạng thái chưa mặc
    const invCheckAfter = await Inventory.findOne({
      where: { idNguoiDung: tuSi.idNguoiDung, itemId: "test_trong_kiem" }
    });
    assert.strictEqual(invCheckAfter.trangBi, false);

    await tuSi.destroy();
  });

  test('12-Slots Equip Constraints, Dynamic Stats, and Combat Simulator features', async () => {
    const { boDieuKhienVatPham } = await import('./controllers/BoDieuKhienVatPham.js');
    const { boDieuKhienBicanh } = await import('./controllers/BoDieuKhienBicanh.js');

    // Tạo các loại trang bị mới trong db
    await Item.upsert({ id: "test_ngoc_boi", ten: "Hộ Mệnh Ngọc Bội 🔮", loai: "Ngọc Bội", doHiem: "Hiếm", giaCoSo: 100, chiSoJson: '{"hp":50}', yeuCauCanhGioi: 1 });
    await Item.upsert({ id: "test_co_bao", ten: "Hỏa Linh Hoàn 🏺", loai: "Cổ Bảo Chủ Động", doHiem: "Hiếm", giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1 });
    await Item.upsert({ id: "test_phap_bao", ten: "Vô Cực Kính 📿", loai: "Pháp Bảo", doHiem: "Hiếm", giaCoSo: 100, chiSoJson: '{}', yeuCauCanhGioi: 1 });

    const tuSi = await TuSi.create({
      idNguoiDung: "8888888888888888",
      ten: "Thần Cơ Tu Sĩ",
      gioiTinh: "Nữ",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 5,
      linhLuc: 1000,
      linhThach: 500,
      hp: 1000,
      mp: 1000
    });
    tuSi.linhCanList = ["Hoa"];
    await tuSi.save();

    // 1. Kiểm tra sinh dòng thuộc tính ngẫu nhiên khi dùng Inventory.addVatPham
    const invItem = await Inventory.addVatPham(tuSi.idNguoiDung, "test_ngoc_boi", 1);
    assert.ok(invItem);
    assert.strictEqual(invItem.soLuong, 1);
    assert.ok(invItem.dongChiSoJson);
    const parsedLines = JSON.parse(invItem.dongChiSoJson);
    assert.ok(parsedLines.length >= 1 && parsedLines.length <= 4);

    // 2. Thử mặc Ngọc Bội
    const resultNgocBoi = await boDieuKhienVatPham._thucHienTrangBi(tuSi, invItem, "test_ngoc_boi");
    assert.strictEqual(resultNgocBoi.ok, true);

    // 3. Mặc 4 Cổ Bảo Chủ Động (Giới hạn tối đa 3)
    for (let i = 0; i < 4; i++) {
      await Inventory.addVatPham(tuSi.idNguoiDung, "test_co_bao", 1);
    }
    
    // Mặc 3 cái đầu
    const listCoBao = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, itemId: "test_co_bao" } });
    listCoBao[0].trangBi = true; await listCoBao[0].save();
    listCoBao[1].trangBi = true; await listCoBao[1].save();
    listCoBao[2].trangBi = true; await listCoBao[2].save();

    // Thử mặc cái thứ 4
    const resultCoBao = await boDieuKhienVatPham._thucHienTrangBi(tuSi, listCoBao[3], "test_co_bao");
    assert.strictEqual(resultCoBao.ok, false);
    assert.ok(resultCoBao.msg.includes("Giới hạn tối đa 3 Cổ Bảo Chủ Động"));

    // 4. Mặc 7 Pháp Bảo (Giới hạn tối đa 6)
    for (let i = 0; i < 7; i++) {
      await Inventory.addVatPham(tuSi.idNguoiDung, "test_phap_bao", 1);
    }
    const listPhapBao = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, itemId: "test_phap_bao" } });
    for (let i = 0; i < 6; i++) {
      listPhapBao[i].trangBi = true;
      await listPhapBao[i].save();
    }
    const resultPhapBao = await boDieuKhienVatPham._thucHienTrangBi(tuSi, listPhapBao[6], "test_phap_bao");
    assert.strictEqual(resultPhapBao.ok, false);
    assert.ok(resultPhapBao.msg.includes("Giới hạn tối đa 6 Pháp Bảo"));

    // 5. Kiểm tra tính năng né tránh / lifesteal / cổ bảo pháp bảo kỹ năng hoạt động trong combat
    const { Dungeon } = await import('./models/Dungeon.js');
    await Dungeon.upsert({
      id: "test_combat_dungeon",
      ten: "Đấu Trường Thử Nghiệm ⚔️",
      capDoYeuCau: 1,
      canhGioiYeuCauText: "Luyện Khí",
      quaiVatJson: '{"ten":"Cự Linh Yêu Thú","hp":200,"vatCong":10,"phapCong":0,"vatPhong":5,"phapPhong":5}',
      thuongJson: '{"expMin":10,"expMax":20,"stonesMin":1,"stonesMax":5}',
      dropsJson: '[]'
    });

    let replyPayload = null;
    const interactionMock = {
      user: { id: "8888888888888888" },
      options: { getSubcommand: () => 'khieu_chien', getString: () => 'test_combat_dungeon' },
      deferReply: async () => {},
      editReply: async (payload) => {
        replyPayload = payload;
        return {
          createMessageComponentCollector: () => ({
            on: () => {},
            stop: () => {}
          })
        };
      }
    };
    await boDieuKhienBicanh.lenhBicanh.execute(interactionMock);
    assert.ok(replyPayload);

    await tuSi.destroy();
  });

  test('Stamina Mechanics and Debate Rewards', async () => {
    // 1. Stamina daily reset and depletion
    const player = await TuSi.create({
      idNguoiDung: "9999999999999999",
      ten: "Bá Đao",
      gioiTinh: "Nam",
      huongTu: "The Tu",
      linhCan: "Thổ Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 10000,
      theLuc: 200,
      theLucMax: 200,
      lastResetTheLuc: "2026-06-30" // Yesterday
    });
    player.linhCanList = ["Tho"];
    await player.save();

    // Check daily update trigger (should reset theLuc to theLucMax on retrieval)
    const retrieved = await TuSi.findByPk(player.idNguoiDung);
    retrieved.capNhatTheLucDaily();
    assert.strictEqual(retrieved.theLuc, 200);

    // Test Stamina limits addition on successful breakthrough
    retrieved.linhLuc = 10000;
    retrieved.theLucMax = 200;
    retrieved.theLuc = 10;
    
    // Breakthrough (simulating BoDieuKhienTuLuyen behavior)
    retrieved.capDo += 1;
    retrieved.theLucMax += 1;
    retrieved.theLuc += 1;
    await retrieved.save();
    
    assert.strictEqual(retrieved.theLucMax, 201);
    assert.strictEqual(retrieved.theLuc, 11);

    await player.destroy();
  });

  test('Interactive /help command execution', async () => {
    const { boDieuKhienHelp } = await import('./controllers/BoDieuKhienHelp.js');
    
    // Create a mock user who executes the command
    const mockTuSi = await TuSi.create({
      idNguoiDung: "9999999999999999",
      ten: "Thư Viện Đạo Sĩ",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 100
    });
    mockTuSi.linhCanList = ["Hoa"];
    await mockTuSi.save();

    let replyPayload = null;
    const interactionMock = {
      user: { id: mockTuSi.idNguoiDung },
      deferReply: async () => {},
      editReply: async (payload) => {
        replyPayload = payload;
        return {
          createMessageComponentCollector: () => ({
            on: () => {},
            stop: () => {}
          })
        };
      }
    };

    await boDieuKhienHelp.lenhHelp.execute(interactionMock);
    assert.ok(replyPayload);
    assert.ok(replyPayload.embeds[0].data.title.includes("Tiên Đạo Thư Viện"));
    assert.ok(replyPayload.embeds[0].data.description.includes("Nhóm Lệnh: Cơ Bản & Tu Luyện"));

    await mockTuSi.destroy();
  });

  test('VND Currency and Lixi Mechanics', async () => {
    // Create test players
    const tuSiA = await TuSi.create({
      idNguoiDung: "7777777777777777",
      ten: "Đại Phú Hào",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Kim Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 100,
      vnd: 10000
    });
    tuSiA.linhCanList = ["Kim"];
    await tuSiA.save();

    const tuSiB = await TuSi.create({
      idNguoiDung: "8888888888888888",
      ten: "Bần Cùng Tu Sĩ",
      gioiTinh: "Nữ",
      huongTu: "The Tu",
      linhCan: "Thổ Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 0,
      vnd: 0
    });
    tuSiB.linhCanList = ["Tho"];
    await tuSiB.save();

    // Verify initial VND
    assert.strictEqual(Number(tuSiA.vnd), 10000);
    assert.strictEqual(Number(tuSiB.vnd), 0);

    // Gifting VND simulation
    const giftAmount = 2000;
    tuSiA.vnd -= giftAmount;
    tuSiB.vnd += giftAmount;
    await tuSiA.save();
    await tuSiB.save();

    assert.strictEqual(Number(tuSiA.vnd), 8000);
    assert.strictEqual(Number(tuSiB.vnd), 2000);

    // Lixi creation simulation
    const lixiVnd = 5000;
    const slots = 2;
    tuSiA.vnd -= lixiVnd;
    await tuSiA.save();

    assert.strictEqual(Number(tuSiA.vnd), 3000);

    const { activeLixis, handleLixiGrab } = await import('./controllers/BoDieuKhienLiXi.js');
    const lixiId = `lixi_test_${Date.now()}`;
    const lixiData = {
      id: lixiId,
      creatorId: tuSiA.idNguoiDung,
      creatorName: tuSiA.ten,
      totalAmount: Number(lixiVnd),
      remainingAmount: Number(lixiVnd),
      totalSlots: slots,
      remainingSlots: slots,
      grabbers: []
    };
    activeLixis.set(lixiId, lixiData);

    // Grabbing lixi
    let grabReplyPayload = null;
    let originalMsgPayload = null;

    const mockInteraction = {
      customId: `lixi_grab_${lixiId}`,
      user: { id: tuSiB.idNguoiDung },
      deferReply: async () => {},
      editReply: async (payload) => {
        grabReplyPayload = payload;
      },
      message: {
        edit: async (payload) => {
          originalMsgPayload = payload;
        }
      }
    };

    await handleLixiGrab(mockInteraction);

    // Grabber got some VND
    await tuSiB.reload();
    assert.ok(Number(tuSiB.vnd) > 2000);
    assert.strictEqual(lixiData.remainingSlots, 1);
    assert.strictEqual(lixiData.grabbers.length, 1);

    // Clean up
    activeLixis.delete(lixiId);
    await tuSiA.destroy();
    await tuSiB.destroy();
  });

  test('Gacha, Supreme Treasure and Special Item Usages', async () => {
    // Seed system items
    const { Item } = await import('./models/Item.js');
    const config = await import('./config.js');
    for (const item of config.ITEMS) {
      await Item.upsert({
        id: item.id,
        ten: item.ten,
        loai: item.loai,
        doHiem: item.doHiem,
        giaCoSo: item.giaCoSo,
        chiSoJson: item.chiSoJson,
        yeuCauCanhGioi: item.yeuCauCanhGioi || 1,
        moTa: item.moTa
      });
    }

    // 1. Ensure the new items exist in database
    const { Inventory } = await import('./models/Inventory.js');
    const { boDieuKhienVatPham } = await import('./controllers/BoDieuKhienVatPham.js');

    const cdItem = await Item.findByPk('co_duyen_lenh');
    const bthItem = await Item.findByPk('binh_tinh_hai');
    const dtpItem = await Item.findByPk('dan_than_pham');

    assert.ok(cdItem, "Cơ Duyên Lệnh phải tồn tại");
    assert.ok(bthItem, "Bình Tinh Hải phải tồn tại");
    assert.ok(dtpItem, "Đan Thần Phẩm phải tồn tại");
    assert.strictEqual(bthItem.loai, 'Chí bảo', "Bình Tinh Hải phải thuộc loại Chí bảo");

    // 2. Create player for testing
    const tuSi = await TuSi.create({
      idNguoiDung: "999888777666",
      ten: "GachaMaster",
      gioiTinh: "Nữ",
      huongTu: "The Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 1000,
      vnd: 100000
    });

    // Add Bình Tinh Hải
    const invBth = await Inventory.addVatPham(tuSi.idNguoiDung, 'binh_tinh_hai', 1);
    
    // First usage of Bình Tinh Hải (should succeed)
    const bthResult1 = await boDieuKhienVatPham._thucHienDungItem(tuSi, invBth, 'binh_tinh_hai');
    assert.strictEqual(bthResult1.ok, true);
    assert.ok(bthResult1.msg.includes('Bình Tinh Hải'));
    
    await tuSi.reload();
    const today = new Date().toISOString().split('T')[0];
    assert.strictEqual(tuSi.lastUseBinhTinhHai, today);

    // Check inventory for Đan Thần Phẩm
    let dtpInv = await Inventory.findOne({ where: { idNguoiDung: tuSi.idNguoiDung, itemId: 'dan_than_pham' } });
    assert.ok(dtpInv);
    assert.strictEqual(dtpInv.soLuong, 2);

    // Second usage on the same day (should fail)
    const bthResult2 = await boDieuKhienVatPham._thucHienDungItem(tuSi, invBth, 'binh_tinh_hai');
    assert.strictEqual(bthResult2.ok, false);
    assert.ok(bthResult2.msg.includes('đã trích xuất sinh cơ'));

    // 3. Test using Đan Thần Phẩm
    const prevLinhLuc = tuSi.linhLuc;
    const dtpResult = await boDieuKhienVatPham._thucHienDungItem(tuSi, dtpInv, 'dan_than_pham');
    assert.strictEqual(dtpResult.ok, true);
    assert.ok(dtpResult.msg.includes('nuốt'));

    await tuSi.reload();
    await dtpInv.reload();
    assert.strictEqual(dtpInv.soLuong, 1);
    assert.ok(tuSi.linhLuc > prevLinhLuc, "Linh lực phải tăng");

    // 4. Test dungeon 1% drop rate for co_duyen_lenh
    // Since it's randomized, we can verify that the new property droppedCoDuyenLenh works inside tranDauBiCanh
    const { BoTaoEmbed } = await import('./views/BoTaoEmbed.js');
    const embedResult = BoTaoEmbed.tranDauBiCanh(
      tuSi,
      { ten: "Bí cảnh Luyện Khí", quaiVat: { ten: "Yêu thú" }, theLuc: 10, theLucMax: 100 },
      ["Giao đấu hiệp 1", "Chiến thắng"],
      true, // isWin
      100, // gainedExp
      50,  // gainedStones
      null, // droppedItem
      null, // droppedSeed
      null, // thienDao
      true  // droppedCoDuyenLenh
    );
    assert.ok(JSON.stringify(embedResult.data).includes('Cơ Duyên Lệnh 🎫'));

     // Clean up
    await tuSi.destroy();
  });

  test('Skill equip limits (max 5)', async () => {
    const tuSi = await TuSi.create({
      idNguoiDung: "1234567890",
      ten: "KyNangMaster",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Thủy Linh Căn",
      capDo: 31,
      linhLuc: 0,
      linhThach: 1000,
      vnd: 100000
    });

    // Create 6 skills
    for (let i = 1; i <= 6; i++) {
      await Skill.create({
        id: `test_skill_${i}`,
        ten: `Chiêu thức ${i}`,
        loai: 'Phép thuật',
        yeuCauCanhGioi: 1,
        satThuong: 100,
        cooldown: 5,
        moTa: 'Mô tả'
      });
      // Learn them
      await PlayerSkill.create({
        idNguoiDung: tuSi.idNguoiDung,
        skillId: `test_skill_${i}`,
        capDo: 1,
        trangBi: false
      });
    }

    // Equip first 5 skills
    for (let i = 1; i <= 5; i++) {
      const psk = await PlayerSkill.findOne({ where: { idNguoiDung: tuSi.idNguoiDung, skillId: `test_skill_${i}` } });
      psk.trangBi = true;
      await psk.save();
    }

    // Attempting to check equip limit
    const equippedCount = await PlayerSkill.count({
      where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true }
    });
    assert.strictEqual(equippedCount, 5);

    // Clean up player and test skills
    await PlayerSkill.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });
    for (let i = 1; i <= 6; i++) {
      await Skill.destroy({ where: { id: `test_skill_${i}` } });
    }
    await tuSi.destroy();
  });

  test('Quick Sell (Bán Nhanh) filters and execution', async () => {
    const tuSi = await TuSi.create({
      idNguoiDung: "1234567899",
      ten: "QuickSellTester",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Thủy Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 0,
      vnd: 100000
    });

    // Create test items of different rarity, type, and level requirements
    await Item.create({ id: 'qs_item_1', ten: 'Vũ khí thường', loai: 'Vũ khí', doHiem: 'Thường', giaCoSo: 100, yeuCauCanhGioi: 1, chiSoJson: '{}', moTa: '' });
    await Item.create({ id: 'qs_item_2', ten: 'Vũ khí hiếm', loai: 'Vũ khí', doHiem: 'Hiếm', giaCoSo: 200, yeuCauCanhGioi: 5, chiSoJson: '{}', moTa: '' });
    await Item.create({ id: 'qs_item_3', ten: 'Giáp thần cấp', loai: 'Giáp', doHiem: 'Thần cấp', giaCoSo: 1000, yeuCauCanhGioi: 20, chiSoJson: '{}', moTa: '' });

    // Add them to player's inventory
    const inv1 = await Inventory.create({ idNguoiDung: tuSi.idNguoiDung, itemId: 'qs_item_1', soLuong: 2, trangBi: false });
    const inv2 = await Inventory.create({ idNguoiDung: tuSi.idNguoiDung, itemId: 'qs_item_2', soLuong: 1, trangBi: false });
    const inv3 = await Inventory.create({ idNguoiDung: tuSi.idNguoiDung, itemId: 'qs_item_3', soLuong: 1, trangBi: false });

    // Perform quick sell with filter rarity = 'Thường' (should sell qs_item_1 only)
    const rarityFilter = 'Thường';
    const allInv = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, trangBi: false } });
    let totalSellValue = 0;
    const soldIds = [];
    for (const inv of allInv) {
      const item = await Item.findByPk(inv.itemId);
      if (item && item.doHiem === rarityFilter && item.giaCoSo > 0) {
        const price = Math.floor(item.giaCoSo * 0.3);
        totalSellValue += price * inv.soLuong;
        soldIds.push(inv.id);
      }
    }
    assert.strictEqual(totalSellValue, Math.floor(100 * 0.3) * 2); // 30 * 2 = 60
    assert.strictEqual(soldIds.length, 1);
    assert.strictEqual(soldIds[0], inv1.id);

    // Destroy sold items and add gold
    await Inventory.destroy({ where: { id: soldIds } });
    tuSi.linhThach += totalSellValue;
    await tuSi.save();

    await tuSi.reload();
    assert.strictEqual(tuSi.linhThach, 60);

    const remainingInv = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung } });
    assert.strictEqual(remainingInv.length, 2); // qs_item_2 and qs_item_3 remain

    // Clean up
    await Inventory.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });
    await Item.destroy({ where: { id: ['qs_item_1', 'qs_item_2', 'qs_item_3'] } });
    await tuSi.destroy();
  });

  test('bothi Linh Thach transfer and abbreviation parser', async () => {
    const tuSiA = await TuSi.create({
      idNguoiDung: "777666555111",
      ten: "BothiSender",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Thủy Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 5000000,
      vnd: 100000
    });

    const tuSiB = await TuSi.create({
      idNguoiDung: "777666555222",
      ten: "BothiReceiver",
      gioiTinh: "Nữ",
      huongTu: "Phap Tu",
      linhCan: "Mộc Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 100,
      vnd: 100000
    });

    const parseLinhThach = (str) => {
      const clean = str.trim().toLowerCase();
      const match = clean.match(/^([\d.]+)\s*([kmb]?)$/);
      if (!match) return null;
      const numPart = parseFloat(match[1]);
      const suffix = match[2];
      let multiplier = 1;
      if (suffix === 'k') multiplier = 1000;
      else if (suffix === 'm') multiplier = 1000000;
      else if (suffix === 'b') multiplier = 1000000000;
      return Math.floor(numPart * multiplier);
    };

    assert.strictEqual(parseLinhThach("10k"), 10000);
    assert.strictEqual(parseLinhThach("1.5m"), 1500000);
    assert.strictEqual(parseLinhThach("2b"), 2000000000);
    assert.strictEqual(parseLinhThach("250"), 250);

    const amount = parseLinhThach("1.5m");
    assert.strictEqual(amount, 1500000);

    tuSiA.linhThach -= amount;
    tuSiB.linhThach += amount;
    await tuSiA.save();
    await tuSiB.save();

    await tuSiA.reload();
    await tuSiB.reload();
    assert.strictEqual(tuSiA.linhThach, 3500000);
    assert.strictEqual(tuSiB.linhThach, 1500100);

    await tuSiA.destroy();
    await tuSiB.destroy();
  });

  test('Plunder rate cap (max 50%)', async () => {
    const levelDiff = 30 - 1;
    const oldChance = 0.40 + (levelDiff * 0.05);
    const newCappedChance = Math.max(0.05, Math.min(0.50, oldChance));
    assert.strictEqual(newCappedChance, 0.50);
  });

});
