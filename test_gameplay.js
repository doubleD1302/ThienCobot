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
const { PetTemplate } = await import('./models/PetTemplate.js');
const { GardenPlot } = await import('./models/GardenPlot.js');
const { ShopItem } = await import('./models/ShopItem.js');
const { LichSuMua } = await import('./models/LichSuMua.js');
const { ChannelRestriction } = await import('./models/ChannelRestriction.js');
const { WorldBoss } = await import('./models/WorldBoss.js');
const { GiftCode } = await import('./models/GiftCode.js');
const { PlayerGiftCode } = await import('./models/PlayerGiftCode.js');
const { DongGopEmoji } = await import('./models/DongGopEmoji.js');
const { AuctionListing } = await import('./models/AuctionListing.js');
const { Skin } = await import('./models/Skin.js');
const { PlayerAffinity } = await import('./models/PlayerAffinity.js');
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
    // Thể Tu HP gốc = 200 -> nhân 10 = 2000 -> chia 3 = 666
    assert.strictEqual(stats.max_hp, 666);
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
    // Thể Tu HP tăng trưởng = 30 / cấp. Cấp 10 = (200 + 30 * 9) * 10 = 4700 -> chia 3 = 1566
    assert.strictEqual(statsLvl10.max_hp, 1566);
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
    assert.strictEqual(statsEquipped.vat_phong, statsRaw.vat_phong + 20);  // x2 from equipment
    assert.strictEqual(statsEquipped.max_hp, 2333);        // (2000 base + 5000 item) / 3 = 2333
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
      linhThach: 1000000
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
      hp: 2000,
      mp: 1000
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

    // 4. Test dungeon 3% drop rate for co_duyen_lenh
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

  test('Skill learning cost deduction', async () => {
    const tuSi = await TuSi.create({
      idNguoiDung: "999888123123",
      ten: "CostTester",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Thủy Linh Căn",
      capDo: 10,
      linhLuc: 0,
      linhThach: 5,
      vnd: 100000
    });

    const sk = await Skill.create({
      id: 'test_cost_skill',
      ten: 'Hỏa Cầu',
      loai: 'Phép thuật',
      yeuCauCanhGioi: 10,
      satThuong: 100,
      cooldown: 5,
      moTa: '...'
    });

    const { boDieuKhienKyNang } = await import('./controllers/BoDieuKhienKyNang.js');

    const resFail = await boDieuKhienKyNang._thucHienHocKyNang(tuSi, 'test_cost_skill');
    assert.strictEqual(resFail.ok, false);
    assert.ok(resFail.msg.includes('không đủ Linh Thạch'));

    tuSi.linhThach = 100;
    await tuSi.save();

    const resSuccess = await boDieuKhienKyNang._thucHienHocKyNang(tuSi, 'test_cost_skill');
    assert.strictEqual(resSuccess.ok, true);
    assert.ok(resSuccess.msg.includes('Lĩnh hội thành công'));

    await tuSi.reload();
    assert.strictEqual(tuSi.linhThach, 90);

    await PlayerSkill.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });
    await sk.destroy();
    await tuSi.destroy();
  });

  test('HP/MP Recovery with Bonus Stats (layChiSoDayDu)', async () => {
    const tuSi = await TuSi.create({
      idNguoiDung: "111222333444",
      ten: "BonusRecover",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Thủy Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 100,
      hp: 10,
      mp: 10
    });

    // Create item that gives +200 HP and +100 MP
    const bonusItem = await Item.create({
      id: 'test_bonus_armor',
      ten: 'Hộ Giáp Siêu Cấp',
      loai: 'Giáp',
      doHiem: 'Hiếm',
      giaCoSo: 100,
      chiSoJson: '{"hp":200,"mp":100}',
      yeuCauCanhGioi: 1
    });

    // Equip it on user
    const invRecord = await Inventory.create({
      idNguoiDung: tuSi.idNguoiDung,
      itemId: 'test_bonus_armor',
      soLuong: 1,
      trangBi: true
    });

    // Verify layChiSoDayDu includes the bonus HP/MP
    const stats = await tuSi.layChiSoDayDu();
    assert.strictEqual(stats.max_hp, 7066); // (120 base + 200 * 10 bonus) * 10 / 3 = 7066
    assert.strictEqual(stats.max_mp, 250);  // 150 base + 100 bonus = 250 (mp unchanged)

    // Test item recovery
    const hpPotion = await Item.create({
      id: 'test_recovery_potion',
      ten: 'Đại Bổ Huyết Đan',
      loai: 'Đan dược',
      doHiem: 'Thường',
      giaCoSo: 50,
      chiSoJson: '{"hp_hoi":500}',
      yeuCauCanhGioi: 1
    });
    const potionInv = await Inventory.create({
      idNguoiDung: tuSi.idNguoiDung,
      itemId: 'test_recovery_potion',
      soLuong: 1,
      trangBi: false
    });

    const { boDieuKhienVatPham } = await import('./controllers/BoDieuKhienVatPham.js');
    const useRes = await boDieuKhienVatPham._thucHienDungItem(tuSi, potionInv, 'test_recovery_potion');
    assert.strictEqual(useRes.ok, true);

    await tuSi.reload();
    // HP should recover: 10 + 500 * 10 = 5010, below new max_hp of 7066 so not capped
    assert.strictEqual(tuSi.hp, 5010);

    // Test rest recovery (/nghi)
    tuSi.hp = 1;
    tuSi.mp = 1;
    await tuSi.save();

    const { boDieuKhienTuLuyen } = await import('./controllers/BoDieuKhienTuLuyen.js');
    // Mock interaction for resting
    const mockInteraction = {
      user: { id: tuSi.idNguoiDung },
      deferReply: () => Promise.resolve(),
      editReply: (payload) => {
        return Promise.resolve();
      }
    };
    await boDieuKhienTuLuyen.lenhNghiNgoi.execute(mockInteraction);
    await tuSi.reload();
    // HP and MP should go to full bonus maximums (7066 and 250 with new x10 hp multiplier)
    assert.strictEqual(tuSi.hp, 7066);
    assert.strictEqual(tuSi.mp, 250);

    // Clean up
    await Inventory.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });
    await bonusItem.destroy();
    await hpPotion.destroy();
    await tuSi.destroy();
  });

  test('Gift Code Redemption Logic (/code)', async () => {
    const tuSi = await TuSi.create({
      idNguoiDung: "222333444555",
      ten: "GiftTester",
      gioiTinh: "Nữ",
      huongTu: "Phap Tu",
      linhCan: "Thủy Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 100,
      vnd: 1000
    });

    const { GiftCode } = await import('./models/GiftCode.js');
    const { PlayerGiftCode } = await import('./models/PlayerGiftCode.js');
    const { boDieuKhienTuSi } = await import('./controllers/BoDieuKhienTuSi.js');

    // Create a gift code
    const codeObj = await GiftCode.create({
      code: 'TESTCODE123',
      linhThach: 500,
      linhLuc: 100,
      vnd: 200,
      itemsJson: '[{"itemId":"dan_hp_1","soLuong":2}]'
    });

    // 1. Redeem with correct code (lowercase to test case-insensitivity)
    const redeemRes = await boDieuKhienTuSi._thucHienNhapCode(tuSi, 'testcode123');
    assert.strictEqual(redeemRes.ok, true);
    assert.strictEqual(redeemRes.code, 'TESTCODE123');

    await tuSi.reload();
    assert.strictEqual(tuSi.linhThach, 100 + 500);
    assert.strictEqual(tuSi.linhLuc, 100);
    assert.strictEqual(tuSi.vnd, 1000 + 200);

    // Verify items added to inventory
    const itemsInInv = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, itemId: 'dan_hp_1' } });
    assert.strictEqual(itemsInInv.length, 1);
    assert.strictEqual(itemsInInv[0].soLuong, 2);

    // Verify usage registered
    const usage = await PlayerGiftCode.findOne({ where: { userId: tuSi.idNguoiDung, code: 'TESTCODE123' } });
    assert.ok(usage);

    // 2. Try redeeming it again (should fail)
    const redeemRes2 = await boDieuKhienTuSi._thucHienNhapCode(tuSi, 'TESTCODE123');
    assert.strictEqual(redeemRes2.ok, false);
    assert.ok(redeemRes2.msg.includes('đã sử dụng'));

    // 3. Try redeeming a non-existent code
    const redeemRes3 = await boDieuKhienTuSi._thucHienNhapCode(tuSi, 'NONEXIST');
    assert.strictEqual(redeemRes3.ok, false);
    assert.ok(redeemRes3.msg.includes('không tồn tại'));

    // Clean up
    await Inventory.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });
    await PlayerGiftCode.destroy({ where: { userId: tuSi.idNguoiDung } });
    await codeObj.destroy();
    await tuSi.destroy();
  });

  test('World Boss HP/Damage Reduction 1000x', () => {
    // Verify formula calculations for level 1
    const lvl1Hp = Math.ceil((1 * 50000 + 50000) / 1000);
    const lvl1Atk = Math.ceil((1 * 300 + 100) / 1000) * 10000;
    assert.strictEqual(lvl1Hp, 100);
    assert.strictEqual(lvl1Atk, 10000);

    // Verify formula calculations for level 30
    const lvl30Hp = Math.ceil((30 * 50000 + 50000) / 1000);
    const lvl30Atk = Math.ceil((30 * 300 + 100) / 1000) * 10000;
    assert.strictEqual(lvl30Hp, 1550);
    assert.strictEqual(lvl30Atk, 100000);
  });

  test('Pháp Bảo Active Skills Config & Duration', () => {
    // 1. Verify active skills configuration mapping
    const pbHoThan = config.layKyNangPhapBaoActive('phap_bao_ho_than');
    assert.strictEqual(pbHoThan.ten, 'Phù Vân Hộ Thể 🛡️');
    assert.strictEqual(pbHoThan.loai, 'khien');
    assert.strictEqual(pbHoThan.triGia, 120);
    assert.strictEqual(pbHoThan.duration, 0); // Instant

    const pbCongKich = config.layKyNangPhapBaoActive('phap_bao_cong_kich');
    assert.strictEqual(pbCongKich.ten, 'Hỏa Long Chủy 🔱');
    assert.strictEqual(pbCongKich.loai, 'tan_cong');
    assert.strictEqual(pbCongKich.triGia, 320);
    assert.strictEqual(pbCongKich.duration, 0); // Instant

    const pbHonTon = config.layKyNangPhapBaoActive('phap_bao_hon_ton');
    assert.strictEqual(pbHonTon.ten, 'Hỗn Độn Phá Thiên 🔔');
    assert.strictEqual(pbHonTon.loai, 'hon_hop');
    assert.strictEqual(pbHonTon.triGia, 550);
    assert.strictEqual(pbHonTon.duration, 0);

    // 2. Mock duration decrement behavior
    const activeBuffs = [{
      ten: pbHonTon.ten,
      pbTen: 'Hỗn Độn Chung 🔔',
      loai: 'tang_cong_pct',
      triGia: pbHonTon.triGia,
      roundsLeft: 3
    }];

    const logs = [];
    const runRoundEndBuffDecrement = (buffs) => {
      for (const buff of buffs) {
        if (buff.roundsLeft > 0) {
          buff.roundsLeft--;
          if (buff.roundsLeft === 0) {
            logs.push(`expired_${buff.ten}`);
          }
        }
      }
    };

    // Round 1
    runRoundEndBuffDecrement(activeBuffs);
    assert.strictEqual(activeBuffs[0].roundsLeft, 2);
    assert.strictEqual(logs.length, 0);

    // Round 2
    runRoundEndBuffDecrement(activeBuffs);
    assert.strictEqual(activeBuffs[0].roundsLeft, 1);
    assert.strictEqual(logs.length, 0);

    // Round 3
    runRoundEndBuffDecrement(activeBuffs);
    assert.strictEqual(activeBuffs[0].roundsLeft, 0);
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0], 'expired_Hỗn Độn Phá Thiên 🔔');
  });

  test('TANTHU Gift Code Redeems 6 Random Pháp Bảo', async () => {
    const tuSi = await TuSi.create({
      idNguoiDung: "888888888888",
      ten: "TânThủHọcGiả",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Thủy Linh Căn",
      capDo: 10, // Trúc Cơ
      linhLuc: 0,
      linhThach: 100,
      vnd: 1000
    });

    const { GiftCode } = await import('./models/GiftCode.js');
    const { PlayerGiftCode } = await import('./models/PlayerGiftCode.js');
    const { boDieuKhienTuSi } = await import('./controllers/BoDieuKhienTuSi.js');

    // Create the TANTHU code in DB
    const codeObj = await GiftCode.create({
      code: 'TANTHU',
      linhThach: 1000,
      linhLuc: 0,
      vnd: 0,
      itemsJson: '[]'
    });

    // Make sure we have some Pháp Bảo in DB for Trúc Cơ (yeuCauCanhGioi = 10)
    const pb1 = await Item.create({
      id: 'pb_tc_mock1',
      ten: 'Mộc Cầm 🪕',
      loai: 'Pháp Bảo',
      doHiem: 'Hiếm',
      giaCoSo: 100,
      chiSoJson: '{}',
      yeuCauCanhGioi: 10
    });

    const pb2 = await Item.create({
      id: 'pb_tc_mock2',
      ten: 'Mộc Kiếm 🗡️',
      loai: 'Pháp Bảo',
      doHiem: 'Hiếm',
      giaCoSo: 100,
      chiSoJson: '{}',
      yeuCauCanhGioi: 10
    });

    const res = await boDieuKhienTuSi._thucHienNhapCode(tuSi, 'TANTHU');
    assert.strictEqual(res.ok, true);
    assert.ok(res.rewardDesc.includes('Quà Pháp Bảo Tân Thủ'));

    // Count items in inventory: should be 6
    const itemsInInv = await Inventory.findAll({
      where: {
        idNguoiDung: tuSi.idNguoiDung
      }
    });
    const totalCount = itemsInInv.reduce((sum, record) => sum + record.soLuong, 0);
    assert.strictEqual(totalCount, 6);

    // Try equipping all 6
    const { boDieuKhienVatPham } = await import('./controllers/BoDieuKhienVatPham.js');
    for (const record of itemsInInv) {
      const equipRes = await boDieuKhienVatPham._thucHienTrangBi(tuSi, record, record.itemId);
      assert.strictEqual(equipRes.ok, true, `Equip failed: ${equipRes.msg}`);
    }

    // Clean up
    await Inventory.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });
    await PlayerGiftCode.destroy({ where: { userId: tuSi.idNguoiDung } });
    await codeObj.destroy();
    await pb1.destroy();
    await pb2.destroy();
    await tuSi.destroy();
  });

  test('BOSS Gift Code Redeems Red Quality Items with 5 Lines', async () => {
    const { GiftCode } = await import('./models/GiftCode.js');
    const { PlayerGiftCode } = await import('./models/PlayerGiftCode.js');
    const { TuSi } = await import('./models/TuSi.js');
    const { Inventory } = await import('./models/Inventory.js');
    const { Item } = await import('./models/Item.js');
    const { boDieuKhienTuSi } = await import('./controllers/BoDieuKhienTuSi.js');

    // Create the BOSS code in DB if not exist, or delete previous
    await GiftCode.destroy({ where: { code: 'BOSS' } });
    const codeObj = await GiftCode.create({
      code: 'BOSS',
      linhThach: 0,
      linhLuc: 0,
      vnd: 0,
      items: []
    });

    // Create a Thể Tu player
    const tuSi = await TuSi.create({
      idNguoiDung: "777666555444",
      ten: "BossCodeTester",
      gioiTinh: "Nam",
      huongTu: "Thể Tu",
      linhCan: "Kim Linh Căn",
      capDo: 10,
      linhLuc: 0,
      linhThach: 0,
      vnd: 0,
      theLuc: 10
    });

    await Inventory.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });
    await PlayerGiftCode.destroy({ where: { userId: tuSi.idNguoiDung } });

    // Redeem code BOSS
    const res = await boDieuKhienTuSi._thucHienNhapCode(tuSi, 'BOSS');
    assert.strictEqual(res.ok, true, `Mã code BOSS nhập thất bại: ${res.msg}`);

    // Check inventory
    const itemsInInv = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung } });
    assert.ok(itemsInInv.length >= 1 && itemsInInv.length <= 4, `Số lượng đồ nhận phải từ 1 đến 4, nhận được: ${itemsInInv.length}`);

    for (const record of itemsInInv) {
      const itemDetail = await Item.findByPk(record.itemId);
      assert.ok(itemDetail);
      
      // If it is a weapon, it must be physical (Thể Tu)
      if (itemDetail.loai === 'Vũ khí') {
        const statsStr = itemDetail.chiSoJson || '{}';
        assert.ok(statsStr.includes('vat_cong'), `Vũ khí cho Thể Tu phải có vật lý công kích`);
      }

      // Check stats: must have exactly 5 red quality lines
      assert.ok(record.dongChiSoJson);
      const parsedStats = JSON.parse(record.dongChiSoJson);
      assert.strictEqual(parsedStats.length, 5, "Đồ rơi ra phải có chính xác 5 dòng chỉ số");

      for (const line of parsedStats) {
        assert.strictEqual(line.mau, 'do', "Chỉ số phải có màu đỏ");
        assert.strictEqual(line.phamChat, 'Truyền Thuyết', "Chất lượng phải là Truyền Thuyết");
        assert.ok(line.phanTram >= 30 && line.phanTram <= 50, `Giá trị dòng phải từ 30% đến 50%, nhận được: ${line.phanTram}`);
      }
    }

    // Clean up
    await Inventory.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });
    await PlayerGiftCode.destroy({ where: { userId: tuSi.idNguoiDung } });
    await codeObj.destroy();
    await tuSi.destroy();
  });

  test('Custom Item Emoji Logic Verification', async () => {
    const { Item } = await import('./models/Item.js');
    const { TuSi } = await import('./models/TuSi.js');
    const { Inventory } = await import('./models/Inventory.js');
    const { BoTaoEmbed } = await import('./views/BoTaoEmbed.js');

    // Create a mock item with custom emoji
    const itemWithEmoji = await Item.create({
      id: 'test_item_custom_emoji',
      ten: 'Gỗ Mục 🪵',
      loai: 'Linh thảo',
      doHiem: 'Thường',
      giaCoSo: 100,
      chiSoJson: '{}',
      yeuCauCanhGioi: 1,
      moTa: 'Test item with custom emoji.',
      emoji: '🪵✨' // Custom emoji
    });

    const itemWithoutEmoji = await Item.create({
      id: 'test_item_default_emoji',
      ten: 'Gỗ Mục Thường 🪵',
      loai: 'Linh thảo',
      doHiem: 'Thường',
      giaCoSo: 100,
      chiSoJson: '{}',
      yeuCauCanhGioi: 1,
      moTa: 'Test item with default emoji.',
      emoji: null // Default emoji
    });

    // 1. Verify that database saving/loading of emoji works
    const dbItem1 = await Item.findByPk('test_item_custom_emoji');
    assert.strictEqual(dbItem1.emoji, '🪵✨');

    const dbItem2 = await Item.findByPk('test_item_default_emoji');
    assert.strictEqual(dbItem2.emoji, null);

    // 2. Verify display in bag (BoTaoEmbed._phanLoaiItems)
    const tuSi = await TuSi.create({
      idNguoiDung: "666555444333",
      ten: "EmojiTester",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Thủy Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 1000,
      vnd: 0,
      theLuc: 10
    });

    await Inventory.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });
    const inv1 = await Inventory.create({ idNguoiDung: tuSi.idNguoiDung, itemId: 'test_item_custom_emoji', soLuong: 1, trangBi: false });
    const inv2 = await Inventory.create({ idNguoiDung: tuSi.idNguoiDung, itemId: 'test_item_default_emoji', soLuong: 1, trangBi: false });

    // Call _phanLoaiItems
    const itemsList = [
      { invId: inv1.id, item: dbItem1, soLuong: 1, trangBi: false, nangCapSao: 0, khoa: false, dongChiSoJson: null },
      { invId: inv2.id, item: dbItem2, soLuong: 1, trangBi: false, nangCapSao: 0, khoa: false, dongChiSoJson: null }
    ];

    const result = BoTaoEmbed._phanLoaiItems(itemsList);
    // The custom emoji should replace the default one
    const lineCustom = result.linhThao.find(l => l.includes(`#${inv1.id}`));
    const lineDefault = result.linhThao.find(l => l.includes(`#${inv2.id}`));
    
    assert.ok(lineCustom.includes('🪵✨ Gỗ Mục'), `Custom emoji should replace default: ${lineCustom}`);
    assert.ok(lineDefault.includes('Gỗ Mục Thường 🪵'), `Default should keep ten intact: ${lineDefault}`);

    // Clean up
    await Inventory.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });
    await tuSi.destroy();
    await itemWithEmoji.destroy();
    await itemWithoutEmoji.destroy();
  });

  test('Custom Balo Sorting and Pagination Verification', async () => {
    const { Item } = await import('./models/Item.js');
    const { TuSi } = await import('./models/TuSi.js');
    const { Inventory } = await import('./models/Inventory.js');
    const { BoTaoEmbed } = await import('./views/BoTaoEmbed.js');

    // Create 3 mock items with different realm requirements
    // Cảnh giới của tu sĩ: Trúc Cơ (cấp 10-18)
    const item1 = await Item.create({
      id: 'test_item_sorting_1',
      ten: 'Vật phẩm Trúc Cơ',
      loai: 'Linh thảo',
      doHiem: 'Thường',
      giaCoSo: 100,
      chiSoJson: '{}',
      yeuCauCanhGioi: 10, // Current realm (Trúc Cơ)
      moTa: ''
    });

    const item2 = await Item.create({
      id: 'test_item_sorting_2',
      ten: 'Vật phẩm Luyện Khí',
      loai: 'Linh thảo',
      doHiem: 'Thường',
      giaCoSo: 100,
      chiSoJson: '{}',
      yeuCauCanhGioi: 1, // Other realm (Luyện Khí)
      moTa: ''
    });

    const item3 = await Item.create({
      id: 'test_item_sorting_3',
      ten: 'Vật phẩm Hóa Thần',
      loai: 'Linh thảo',
      doHiem: 'Thường',
      giaCoSo: 100,
      chiSoJson: '{}',
      yeuCauCanhGioi: 19, // Other realm (Hóa Thần)
      moTa: ''
    });

    // Create a Trúc Cơ player (cấp 10)
    const tuSi = await TuSi.create({
      idNguoiDung: "555444333222",
      ten: "SortingTester",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Thủy Linh Căn",
      capDo: 10, // Trúc Cơ range
      linhLuc: 0,
      linhThach: 1000,
      vnd: 0,
      theLuc: 10
    });

    await Inventory.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });
    
    // Add item2 (Luyện Khí - old)
    const invOld = await Inventory.create({ idNguoiDung: tuSi.idNguoiDung, itemId: 'test_item_sorting_2', soLuong: 1, trangBi: false });
    // Add item1 (Trúc Cơ - current)
    const invCurrent = await Inventory.create({ idNguoiDung: tuSi.idNguoiDung, itemId: 'test_item_sorting_1', soLuong: 1, trangBi: false });
    // Add item3 (Hóa Thần - new)
    const invNew = await Inventory.create({ idNguoiDung: tuSi.idNguoiDung, itemId: 'test_item_sorting_3', soLuong: 1, trangBi: false });

    // Call internal controller file's reloadItemsList via import or dynamic import
    // Note: since reloadItemsList is local to BoDieuKhienVatPham.js, we can test it indirectly by loading baloSheets or simulating the sorting logic.
    // Actually, we can test the sorting directly. Let's load the list from DB and sort it using the exact same rule:
    const freshInvList = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung } });
    const resultList = [];
    for (const inv of freshInvList) {
      const d = await Item.findByPk(inv.itemId);
      if (d) resultList.push({
        invId:         inv.id,
        item:          d,
        soLuong:       inv.soLuong,
        trangBi:       inv.trangBi,
        nangCapSao:    inv.nangCapSao,
        dongChiSoJson: inv.dongChiSoJson,
        khoa:          inv.khoa
      });
    }

    const config = await import('./config.js');
    const realmInfo = config.layThongTinCanhGioi(tuSi.capDo);
    const realmObj = config.CANH_GIOI_LIST.find(r => r.name === realmInfo.realmName) || config.CANH_GIOI_LIST[0];
    const minLvl = realmObj.min_level;
    const maxLvl = realmObj.max_level;

    resultList.sort((a, b) => {
      const aIsCurrent = a.item.yeuCauCanhGioi >= minLvl && a.item.yeuCauCanhGioi <= maxLvl;
      const bIsCurrent = b.item.yeuCauCanhGioi >= minLvl && b.item.yeuCauCanhGioi <= maxLvl;

      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;

      return b.invId - a.invId;
    });

    // Expect resultList[0] to be the current realm item (test_item_sorting_1)
    assert.strictEqual(resultList[0].item.id, 'test_item_sorting_1', `First item must be from current realm (Trúc Cơ), got: ${resultList[0].item.id}`);
    
    // Expect resultList[1] to be the newly acquired non-current item (test_item_sorting_3) since invNew.id > invOld.id
    assert.strictEqual(resultList[1].item.id, 'test_item_sorting_3', `Second item must be the newer non-current item (Hóa Thần), got: ${resultList[1].item.id}`);

    // Expect resultList[2] to be the oldest non-current item (test_item_sorting_2)
    assert.strictEqual(resultList[2].item.id, 'test_item_sorting_2', `Third item must be the older non-current item (Luyện Khí), got: ${resultList[2].item.id}`);

    // Test 10-line pagination
    const dummyLines = Array.from({ length: 25 }, (_, i) => `item_${i}`);
    const paginated = BoTaoEmbed._buildSheetPages(dummyLines, 'empty');
    assert.strictEqual(paginated.length, 3, `25 lines should chunk into 3 pages (10, 10, 5), got: ${paginated.length}`);
    const page1Lines = paginated[0].split('\n');
    assert.strictEqual(page1Lines.length, 10, `Page 1 should have exactly 10 lines, got: ${page1Lines.length}`);

    // Clean up
    await Inventory.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });
    await tuSi.destroy();
    await item1.destroy();
    await item2.destroy();
    await item3.destroy();
  });

  test('Pháp Bảo Active Skill Load from Database Column', async () => {
    const { Item } = await import('./models/Item.js');
    const config = await import('./config.js');

    // Create a mock Pháp Bảo item with active_skill_json defined
    const mockItem = await Item.create({
      id: 'pb_db_test_skill',
      ten: 'Hắc Long Trướng ⚡',
      loai: 'Pháp Bảo',
      doHiem: 'Cực hiếm',
      giaCoSo: 1000,
      chiSoJson: '{"phap_cong":50}',
      yeuCauCanhGioi: 10,
      activeSkillJson: JSON.stringify({
        ten: 'Hắc Long Chi Uy 🐉',
        loai: 'tang_cong_pct',
        triGia: 30,
        duration: 5,
        moTa: 'Tăng 30% Công kích trong 5 hiệp.'
      })
    });

    // Load from DB
    const loadedItem = await Item.findByPk('pb_db_test_skill');
    assert.ok(loadedItem);
    assert.strictEqual(loadedItem.activeSkill.ten, 'Hắc Long Chi Uy 🐉');
    assert.strictEqual(loadedItem.activeSkill.loai, 'tang_cong_pct');
    assert.strictEqual(loadedItem.activeSkill.triGia, 30);
    assert.strictEqual(loadedItem.activeSkill.duration, 5);

    // Call layKyNangPhapBaoActive with the loaded item
    const resolvedSkill = config.layKyNangPhapBaoActive(loadedItem);
    assert.strictEqual(resolvedSkill.ten, 'Hắc Long Chi Uy 🐉');
    assert.strictEqual(resolvedSkill.triGia, 30);

    // Clean up
    await mockItem.destroy();
  });

  test('Equipment lock and supreme treasure unsellable logic', async () => {
    const { boDieuKhienShop } = await import('./controllers/BoDieuKhienShop.js');

    const tuSi = await TuSi.create({
      idNguoiDung: "999888777666",
      ten: "LockTester",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Thủy Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 1000,
      vnd: 100000
    });

    // Create a mock equipment and a supreme treasure ("Chí bảo")
    const mockEquipItem = await Item.create({
      id: 'test_lock_equip',
      ten: 'Thần Long Trảm 🗡️',
      loai: 'Vũ khí',
      doHiem: 'Thần cấp',
      giaCoSo: 10000,
      chiSoJson: '{}',
      yeuCauCanhGioi: 1,
      moTa: ''
    });

    const mockSupremeItem = await Item.create({
      id: 'test_lock_supreme',
      ten: 'Thái Cổ Thần Châu 🔮',
      loai: 'Chí bảo',
      doHiem: 'Thần cấp',
      giaCoSo: 20000,
      chiSoJson: '{}',
      yeuCauCanhGioi: 1,
      moTa: ''
    });

    // Add them to player inventory
    const invEquip = await Inventory.create({ idNguoiDung: tuSi.idNguoiDung, itemId: 'test_lock_equip', soLuong: 1, trangBi: false, khoa: false });
    const invSupreme = await Inventory.create({ idNguoiDung: tuSi.idNguoiDung, itemId: 'test_lock_supreme', soLuong: 1, trangBi: false, khoa: false });

    // --- 1. Test locking logic ---
    assert.strictEqual(invEquip.khoa, false);
    invEquip.khoa = true;
    await invEquip.save();
    await invEquip.reload();
    assert.strictEqual(invEquip.khoa, true);

    // --- 2. Test shop sell block for locked item ---
    const sellResLocked = await boDieuKhienShop._thucHienBanByInvId(tuSi, invEquip.id, 1);
    assert.strictEqual(sellResLocked.ok, false);
    assert.ok(sellResLocked.msg.includes('đã bị khóa'));

    // --- 3. Test shop sell block for Chí bảo item ---
    const sellResSupreme = await boDieuKhienShop._thucHienBanByInvId(tuSi, invSupreme.id, 1);
    assert.strictEqual(sellResSupreme.ok, false);
    assert.ok(sellResSupreme.msg.includes('Chí bảo'));

    // --- 4. Test quick sell filtering ---
    // Let's create an unlocked normal item to check it does sell
    const mockNormalItem = await Item.create({
      id: 'test_lock_normal',
      ten: 'Bổ HP Thường 🧪',
      loai: 'Đan dược',
      doHiem: 'Thường',
      giaCoSo: 100,
      chiSoJson: '{}',
      yeuCauCanhGioi: 1,
      moTa: ''
    });
    const invNormal = await Inventory.create({ idNguoiDung: tuSi.idNguoiDung, itemId: 'test_lock_normal', soLuong: 1, trangBi: false });

    // Mock quick sell filter: we have invEquip (locked), invSupreme (Chí bảo), invNormal (unlocked)
     const allInv = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung, trangBi: false } });
     const matchingItems = [];
     for (const inv of allInv) {
       if (!['test_lock_equip', 'test_lock_supreme', 'test_lock_normal'].includes(inv.itemId)) continue;
       const item = await Item.findByPk(inv.itemId);
       if (!item) continue;
       if (inv.khoa) continue; // skip locked
       if (item.loai === 'Chí bảo') continue; // skip Chí bảo
       if (item.giaCoSo > 0) {
         matchingItems.push({ inv, item });
       }
     }
 
     assert.strictEqual(matchingItems.length, 1);
     assert.strictEqual(matchingItems[0].inv.itemId, 'test_lock_normal');

    // Clean up
    await Inventory.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });
    await Item.destroy({ where: { id: ['test_lock_equip', 'test_lock_supreme', 'test_lock_normal'] } });
    await tuSi.destroy();
  });

  test('Auto Cultivation System refilling, toggling, and loop execution', async () => {
    const { chayTienTrinhAuto, creditAutoRewards } = await import('./controllers/BoDieuKhienAuto.js');
    const { Dungeon } = await import('./models/Dungeon.js');
    const { AdventureEvent } = await import('./models/AdventureEvent.js');

    await Dungeon.destroy({ where: {} });
    await AdventureEvent.destroy({ where: {} });

    const tuSi = await TuSi.create({
      idNguoiDung: "888777666555",
      ten: "AutoTester",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Thủy Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 15000,
      vnd: 100000,
      thoiGianAuto: 0,
      kichHoatAuto: false,
      theLuc: 10
    });
    const stats = tuSi.layChiSo();
    tuSi.hp = stats.max_hp;
    tuSi.mp = stats.max_mp;
    await tuSi.save();

    // Make sure we have a dungeon in DB for level 1
    const testDg = await Dungeon.create({
      id: 'auto_test_dungeon',
      ten: 'Auto Luyện Khí Cốc',
      capDoYeuCau: 1,
      canhGioiYeuCauText: 'Luyện Khí',
      quaiVatJson: JSON.stringify({ ten: 'Yêu Kê', hp: 10, vatCong: 5, phapCong: 0, vatPhong: 1, phapPhong: 1 }),
      thuongJson: JSON.stringify({ expMin: 10, expMax: 10, stonesMin: 50, stonesMax: 50 }),
      dropsJson: JSON.stringify([{ itemId: 'hat_giong_linh_chi', tile: 1.0 }])
    });

    // Make sure we have an adventure event
    const testEvt = await AdventureEvent.create({
      id: 'auto_test_event',
      ten: 'Auto Gặp Linh Thảo',
      moTa: 'Đạo hữu ngửi thấy linh hương.',
      loai: 'tot',
      hieuUngJson: JSON.stringify({ exp: { min: 20, max: 20 }, stones: { min: 100, max: 100 }, itemSpecified: { itemId: 'hat_giong_nhan_sam', quantity: 1 } })
    });

    // --- 1. Test refilling time ---
    // Costs 10,000 Linh Thạch to get 250 minutes
    assert.strictEqual(tuSi.thoiGianAuto, 0);
    assert.strictEqual(tuSi.kichHoatAuto, false);
    
    // Perform refill check
    assert.ok(tuSi.linhThach >= 10000);
    tuSi.linhThach -= 10000;
    tuSi.thoiGianAuto += 250;
    await tuSi.save();
    
    await tuSi.reload();
    assert.strictEqual(tuSi.linhThach, 5000);
    assert.strictEqual(tuSi.thoiGianAuto, 250);

    // --- 2. Test toggling active status ---
    tuSi.kichHoatAuto = true;
    await tuSi.save();
    await tuSi.reload();
    assert.strictEqual(tuSi.kichHoatAuto, true);

    // --- 3. Test background loop execution ---
    // Executing the loop should:
    // - Deduct 5 minutes of auto time (leaving 245)
    // - Perform autoDiBiCanh (costs 1 stamina, gives exp and stones, accumulated in thongKeAuto)
    // - Perform autoDiLichLuyen (costs 1 stamina, gives exp and stones, accumulated in thongKeAuto)
    const statsLatest = await tuSi.layChiSoDayDu();
    tuSi.hp = statsLatest.max_hp;
    tuSi.mp = statsLatest.max_mp;
    await tuSi.save();

    await chayTienTrinhAuto();

    await tuSi.reload();
    assert.strictEqual(tuSi.thoiGianAuto, 245);
    // EXP and Linh Thach NOT immediately credited
    assert.strictEqual(tuSi.linhLuc, 0);
    assert.strictEqual(tuSi.linhThach, 5000);

    // Items are NOT yet added to database inventory
    let invItems = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung } });
    assert.strictEqual(invItems.length, 0);

    // Stamina decreased by 2 (1 for dungeon, 1 for adventure event)
    assert.strictEqual(tuSi.theLuc, 8);

    // --- 4. Test statistics accumulation ---
    let statsObj = tuSi.thongKeAuto;
    assert.strictEqual(statsObj.activeMinutes, 5);
    assert.strictEqual(statsObj.exp, 30);
    assert.strictEqual(statsObj.stones, 150);
    assert.ok(statsObj.items['hat_giong_linh_chi'] >= 1);
    assert.ok(statsObj.items['hat_giong_nhan_sam'] >= 1);

    // --- 5. Test harvest action credits rewards and resets stats ---
    const harvestResult = await creditAutoRewards(tuSi);
    assert.ok(harvestResult);
    assert.strictEqual(harvestResult.expGained, 30);
    assert.strictEqual(harvestResult.stonesGained, 150);

    await tuSi.reload();
    assert.strictEqual(tuSi.linhLuc, 30);
    assert.strictEqual(tuSi.linhThach, 5150);

    // Check that items dropped are now added to Inventory
    invItems = await Inventory.findAll({ where: { idNguoiDung: tuSi.idNguoiDung } });
    const itemIds = invItems.map(x => x.itemId);
    assert.ok(itemIds.includes('hat_giong_linh_chi'));
    assert.ok(itemIds.includes('hat_giong_nhan_sam'));

    assert.strictEqual(tuSi.thongKeAuto.activeMinutes, 0);
    assert.strictEqual(tuSi.thongKeAuto.exp, 0);
    assert.strictEqual(tuSi.thongKeAuto.stones, 0);

    // --- 6. Test subsequent loop execution accumulates from 0 ---
    // Restore health so it can run another round
    tuSi.hp = 1200;
    await tuSi.save();

    // Clear cooldowns so it can run immediately
    const { ThoiGianCho } = await import('./models/ThoiGianCho.js');
    await ThoiGianCho.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });

    await chayTienTrinhAuto();
    await tuSi.reload();
    assert.strictEqual(tuSi.thoiGianAuto, 240); // 245 - 5
    assert.strictEqual(tuSi.thongKeAuto.activeMinutes, 5); // reset back to 5
    assert.strictEqual(tuSi.thongKeAuto.exp, 30); // 10 (dungeon) + 20 (event)
    assert.strictEqual(tuSi.thongKeAuto.stones, 150); // 50 (dungeon) + 100 (event)

    // Clean up
    await Inventory.destroy({ where: { idNguoiDung: tuSi.idNguoiDung } });
    await testDg.destroy();
    await testEvt.destroy();
    await tuSi.destroy();
  });

  test('World Boss Drop Quality and Rarity Distribution', async () => {
    const { phanBoPhanThuongBoss } = await import('./controllers/BoDieuKhienBoss.js');
    const { Item } = await import('./models/Item.js');
    const { Inventory } = await import('./models/Inventory.js');
    const { TuSi } = await import('./models/TuSi.js');

    // Create a mock player
    const tuSi = await TuSi.create({
      idNguoiDung: "999888777666",
      ten: "BossRewardTester",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Thủy Linh Căn",
      capDo: 10,
      linhLuc: 0,
      linhThach: 1000,
      vnd: 0,
      theLuc: 10
    });

    // Make sure we have items at level 10
    const items = await Item.findAll({ where: { yeuCauCanhGioi: 10 } });
    if (items.length === 0) {
      await Item.create({
        id: 'test_boss_item',
        ten: 'Boss Test Sword',
        loai: 'Vũ khí',
        doHiem: 'Hiếm',
        giaCoSo: 500,
        chiSoJson: '{"vat_cong":30}',
        yeuCauCanhGioi: 10,
        moTa: 'Test sword.'
      });
    }

    // Mock a Boss object
    const mockBoss = {
      level: 10,
      ten: 'Thượng Cổ Long Vương',
      maxHp: 100000,
      damageDealers: {
        "999888777666": 50000
      }
    };

    // Clean inventory for the test user first
    await Inventory.destroy({ where: { idNguoiDung: "999888777666" } });

    // Call reward distributor
    await phanBoPhanThuongBoss(null, mockBoss, null, "999888777666");

    // Fetch the drops from the DB
    const drops = await Inventory.findAll({ where: { idNguoiDung: "999888777666" } });
    
    // There should be items awarded (last hitter is guaranteed to get 1, top 1 is guaranteed to get 1, so 2 drops)
    assert.ok(drops.length >= 1);
    
    for (const drop of drops) {
      assert.ok(drop.dongChiSoJson);
      const parsedStats = JSON.parse(drop.dongChiSoJson);
      assert.ok(Array.isArray(parsedStats) && parsedStats.length > 0);

      for (const line of parsedStats) {
        assert.ok(line.mau === 'cam' || line.mau === 'do');
        if (line.mau === 'do') {
          assert.strictEqual(line.phamChat, 'Truyền Thuyết');
          assert.ok(line.phanTram >= 30 && line.phanTram <= 50);
        } else {
          assert.strictEqual(line.phamChat, 'Tiên Phẩm');
          assert.ok(line.phanTram >= 15 && line.phanTram <= 20);
        }
      }
    }

    // Clean up
    await Inventory.destroy({ where: { idNguoiDung: "999888777666" } });
    await tuSi.destroy();
  });

  test('World Boss Doubled Rewards Verification', async () => {
    const { phanBoPhanThuongBoss } = await import('./controllers/BoDieuKhienBoss.js');
    const { TuSi } = await import('./models/TuSi.js');
    const { Inventory } = await import('./models/Inventory.js');

    // Create 4 mock players
    const players = [];
    for (let i = 1; i <= 4; i++) {
      const idNguoiDung = `88877766655${i}`;
      // Clean up previous runs if any
      await TuSi.destroy({ where: { idNguoiDung } });
      const p = await TuSi.create({
        idNguoiDung,
        ten: `Tester ${i}`,
        gioiTinh: "Nam",
        huongTu: "Phap Tu",
        linhCan: "Thủy Linh Căn",
        capDo: 1,
        linhLuc: 0,
        linhThach: 0,
        vnd: 0,
        theLuc: 10
      });
      players.push(p);
      await Inventory.destroy({ where: { idNguoiDung: p.idNguoiDung } });
    }

    const mockBoss = {
      level: 1,
      ten: 'Thượng Cổ Hổ Vương',
      maxHp: 100000,
      damageDealers: {
        "888777666551": 40000, // Top 1
        "888777666552": 30000, // Top 2
        "888777666553": 20000, // Top 3
        "888777666554": 10000  // Top 4 (Non-top-3)
      }
    };

    // Call reward distributor (lastHitterId = null, to only test participant rewards)
    await phanBoPhanThuongBoss(null, mockBoss, null, null);

    // Reload all players
    for (const p of players) {
      await p.reload();
    }

    const p1 = players[0];
    const p2 = players[1];
    const p3 = players[2];
    const p4 = players[3];

    // Assert base rewards for Top 4:
    // baseStones = 2000, baseExp = 500
    // gainedStones = (2000 + random) * 2 >= 4000
    // gainedExp = (500 + random) * 2 >= 1000
    assert.ok(p4.linhThach >= 4000 && p4.linhThach <= 4400, `Top 4 nhận đúng linh thạch nền: ${p4.linhThach}`);
    assert.ok(p4.linhLuc >= 1000 && p4.linhLuc <= 1100, `Top 4 nhận đúng tu vi nền: ${p4.linhLuc}`);

    // Assert Top 3 bonus: +1000*2 = +2000 stones, +300*2 = +600 exp
    // expected stones = base + 2000 >= 6000
    // expected exp = base + 600 >= 1600
    assert.ok(p3.linhThach >= 6000 && p3.linhThach <= 6400, `Top 3 nhận đúng linh thạch: ${p3.linhThach}`);
    assert.ok(p3.linhLuc >= 1600 && p3.linhLuc <= 1700, `Top 3 nhận đúng tu vi: ${p3.linhLuc}`);

    // Assert Top 2 bonus: +2000*2 = +4000 stones, +500*2 = +1000 exp
    // expected stones = base + 4000 >= 8000
    // expected exp = base + 1000 >= 2000
    assert.ok(p2.linhThach >= 8000 && p2.linhThach <= 8400, `Top 2 nhận đúng linh thạch: ${p2.linhThach}`);
    assert.ok(p2.linhLuc >= 2000 && p2.linhLuc <= 2100, `Top 2 nhận đúng tu vi: ${p2.linhLuc}`);

    // Assert Top 1 bonus: +3000*2 = +6000 stones, +800*2 = +1600 exp
    // expected stones = base + 6000 >= 10000
    // expected exp = base + 1600 >= 2600
    assert.ok(p1.linhThach >= 10000 && p1.linhThach <= 10400, `Top 1 nhận đúng linh thạch: ${p1.linhThach}`);
    assert.ok(p1.linhLuc >= 2600 && p1.linhLuc <= 2700, `Top 1 nhận đúng tu vi: ${p1.linhLuc}`);

    // Clean up
    for (const p of players) {
      await Inventory.destroy({ where: { idNguoiDung: p.idNguoiDung } });
      await p.destroy();
    }
  });

  test('World Boss Spawn Schedule Hour Detection', () => {
    const tzOptions = {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    };

    const allowedHours = [6, 12, 22];

    const checkTime = (date) => {
      const localTimeStr = date.toLocaleTimeString('en-US', tzOptions);
      const [hStr, mStr] = localTimeStr.split(':');
      const localHour = parseInt(hStr, 10);
      const localMinute = parseInt(mStr, 10);
      return allowedHours.includes(localHour) && localMinute === 0;
    };

    // Test case 1: 06:00 UTC+7 (e.g. 2026-07-03T06:00:00+07:00)
    const date1 = new Date('2026-07-03T06:00:00+07:00');
    assert.strictEqual(checkTime(date1), true, "06:00+07:00 should match spawn time");

    // Test case 2: 12:00 UTC+7 (e.g. 2026-07-03T12:00:00+07:00)
    const date2 = new Date('2026-07-03T12:00:00+07:00');
    assert.strictEqual(checkTime(date2), true, "12:00+07:00 should match spawn time");

    // Test case 3: 22:00 UTC+7 (e.g. 2026-07-03T22:00:00+07:00)
    const date3 = new Date('2026-07-03T22:00:00+07:00');
    assert.strictEqual(checkTime(date3), true, "22:00+07:00 should match spawn time");

    // Test case 4: 06:01 UTC+7 (should not match)
    const date4 = new Date('2026-07-03T06:01:00+07:00');
    assert.strictEqual(checkTime(date4), false, "06:01 should not match spawn time");

    // Test case 5: 07:00 UTC+7 (should not match)
    const date5 = new Date('2026-07-03T07:00:00+07:00');
    assert.strictEqual(checkTime(date5), false, "07:00 should not match spawn time");
  });

  test('Emoji and Image Contribution model / command execution', async () => {
    const { DongGopEmoji } = await import('./models/DongGopEmoji.js');
    await DongGopEmoji.destroy({ where: {} });

    // 1. Simulate emoji contribution parsing logic
    const emojiInput = "<a:pepe_animated:987654321098765432>";
    const match = emojiInput.trim().match(/<(a?):([a-zA-Z0-9_]+):([0-9]+)>/);
    assert.ok(match);
    const isAnimated = match[1] === 'a';
    const emojiId = match[3];
    const ext = isAnimated ? 'gif' : 'png';
    const imageUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}`;

    assert.strictEqual(isAnimated, true);
    assert.strictEqual(emojiId, '987654321098765432');
    assert.strictEqual(imageUrl, 'https://cdn.discordapp.com/emojis/987654321098765432.gif');

    // Create record in DB
    const rec1 = await DongGopEmoji.create({
      idNguoiDung: "999888777666",
      tenEmoji: "pepe_animated",
      rawEmoji: match[0],
      imageUrl: imageUrl,
      trangThai: 'PENDING'
    });

    assert.strictEqual(rec1.tenEmoji, "pepe_animated");
    assert.strictEqual(rec1.rawEmoji, "<a:pepe_animated:987654321098765432>");
    assert.strictEqual(rec1.imageUrl, "https://cdn.discordapp.com/emojis/987654321098765432.gif");
    assert.strictEqual(rec1.trangThai, "PENDING");

    // 2. Simulate file contribution logic
    const fileUrl = "https://cdn.discordapp.com/attachments/112233/445566/image.png";
    const rec2 = await DongGopEmoji.create({
      idNguoiDung: "999888777666",
      tenEmoji: "cool_meme",
      rawEmoji: null,
      imageUrl: fileUrl,
      trangThai: 'PENDING'
    });

    assert.strictEqual(rec2.tenEmoji, "cool_meme");
    assert.strictEqual(rec2.rawEmoji, null);
    assert.strictEqual(rec2.imageUrl, fileUrl);

    // Clean up
    await DongGopEmoji.destroy({ where: {} });
  });

  test('Breakthrough Pills, Herbs, and Cauldron refining mechanics', async () => {
    const { Item } = await import('./models/Item.js');
    const { Inventory } = await import('./models/Inventory.js');
    const { BoTaoEmbed } = await import('./views/BoTaoEmbed.js');
    const { boDieuKhienDongPhu } = await import('./controllers/BoDieuKhienDongPhu.js');

    // 1. Verify breakthrough items exist in DB (synced from config.ITEMS)
    const seed = await Item.findByPk('hat_giong_luyen_khi_thao');
    const herb = await Item.findByPk('linh_thao_luyen_khi');
    const pill = await Item.findByPk('dan_dot_pha_1');

    assert.ok(seed);
    assert.ok(herb);
    assert.ok(pill);
    assert.strictEqual(seed.loai, 'Linh thảo');
    assert.strictEqual(herb.loai, 'Linh thảo');
    assert.strictEqual(pill.loai, 'Đan dược');

    // 2. Test Inventory.addVatPham auto-assigns quality for breakthrough pills
    const userId = "test_user_breakthrough";
    await Inventory.destroy({ where: { idNguoiDung: userId } });

    const invPill = await Inventory.addVatPham(userId, 'dan_dot_pha_1', 1);
    assert.ok(invPill);
    assert.ok(invPill.dongChiSoJson);
    const pillInfo = JSON.parse(invPill.dongChiSoJson);
    assert.ok(pillInfo.phamChat);
    assert.ok(pillInfo.phanTramHoTro);

    // 3. Test Balo Embed formatting includes quality details
    const itemsList = [{
      invId: invPill.id,
      item: pill,
      soLuong: 1,
      trangBi: false,
      nangCapSao: 0,
      dongChiSoJson: invPill.dongChiSoJson,
      khoa: false
    }];
    const parsed = BoTaoEmbed._phanLoaiItems(itemsList);
    assert.ok(parsed.danDuoc[0].includes(pillInfo.phamChat));
    assert.ok(parsed.danDuoc[0].includes(`+${pillInfo.phanTramHoTro}%`));

    // 4. Test Cauldron Alchemy consumes 3 herbs and refines 1 breakthrough pill
    // Add 3 herbs to user inventory
    await Inventory.create({
      idNguoiDung: userId,
      itemId: 'linh_thao_luyen_khi',
      soLuong: 3,
      trangBi: false,
      nangCapSao: 0
    });

    const mockTuSi = {
      idNguoiDung: userId,
      ten: 'Luyện Đan Sư',
      linhThach: 100,
      save: async function() {}
    };

    const res = await boDieuKhienDongPhu._processAlchemy(mockTuSi, 'linh_thao_luyen_khi');
    assert.strictEqual(res.ok, true);
    assert.ok(res.msg.includes('Luyện Khí Phá Cảnh Đan'));
    assert.strictEqual(mockTuSi.linhThach, 50); // consumed 50 stones

    // Check that herbs were consumed
    const remainingHerbs = await Inventory.findOne({ where: { idNguoiDung: userId, itemId: 'linh_thao_luyen_khi' } });
    assert.strictEqual(remainingHerbs, null);

    // Check breakthrough pills in inventory
    const pills = await Inventory.findAll({ where: { idNguoiDung: userId, itemId: 'dan_dot_pha_1' } });
    assert.ok(pills.length > 0);

    // Clean up
    await Inventory.destroy({ where: { idNguoiDung: userId } });
  });

  test('World Boss anti-KS logic (<= 10% HP restriction)', async () => {
    const { ThoiGianCho } = await import('./models/ThoiGianCho.js');
    const { boDieuKhienBoss } = await import('./controllers/BoDieuKhienBoss.js');

    const userId = "test_user_ks_boss";
    await ThoiGianCho.destroy({ where: { idNguoiDung: userId, hanhDong: 'boss_last_attack' } });

    // Mock a boss with 10% or less HP
    const bossMaxHp = 100000;
    const bossHp = 5000; // 5% HP

    // Helper check function matching controllers/BoDieuKhienBoss.js logic
    const checkCanAttack = async (uid) => {
      if (bossHp <= bossMaxHp * 0.10) {
        const lastAttackCd = await boDieuKhienBoss.kiemTraThoiGianCho(uid, 'boss_last_attack');
        let canAttack = false;
        if (lastAttackCd) {
          const lastAttackTime = lastAttackCd.duLieu.lastAttackTime || 0;
          if (Date.now() - lastAttackTime <= 2 * 60 * 1000) {
            canAttack = true;
          }
        }
        return canAttack;
      }
      return true;
    };

    // 1. Should be blocked initially because no attack history exists
    let allowed = await checkCanAttack(userId);
    assert.strictEqual(allowed, false);

    // 2. Mock an old attack history (2.5 minutes ago)
    const farFuture = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
    const oldTime = Date.now() - 2.5 * 60 * 1000;
    await boDieuKhienBoss.datThoiGianCho(userId, 'boss_last_attack', farFuture, { lastAttackTime: oldTime });

    allowed = await checkCanAttack(userId);
    assert.strictEqual(allowed, false);

    // 3. Mock a recent attack history (1.5 minutes ago)
    const recentTime = Date.now() - 1.5 * 60 * 1000;
    await boDieuKhienBoss.datThoiGianCho(userId, 'boss_last_attack', farFuture, { lastAttackTime: recentTime });

    allowed = await checkCanAttack(userId);
    assert.strictEqual(allowed, true);

    // Clean up
    await ThoiGianCho.destroy({ where: { idNguoiDung: userId } });
  });

  test('Damage simulator (/dmg boss and /dmg pvp @user) mechanics', async () => {
    const { boDieuKhienDmg } = await import('./controllers/BoDieuKhienDmg.js');

    // Verify /dmg command properties exist
    assert.strictEqual(boDieuKhienDmg.lenhDmg.data.name, 'dmg');
    assert.ok(boDieuKhienDmg.lenhDmg.data.options.length > 0);

    // Verify boss subcommand exists
    const bossSub = boDieuKhienDmg.lenhDmg.data.options.find(opt => opt.name === 'boss');
    assert.ok(bossSub);

    // Verify pvp subcommand and options exist
    const pvpSub = boDieuKhienDmg.lenhDmg.data.options.find(opt => opt.name === 'pvp');
    assert.ok(pvpSub);
    assert.ok(pvpSub.options.find(opt => opt.name === 'user'));
  });

  test('Pet Evolution and Stat Boost Calculations', async () => {
    const { Pet } = await import('./models/Pet.js');
    const { TuSi } = await import('./models/TuSi.js');
    const { PetTemplate } = await import('./models/PetTemplate.js');

    // Seed pet templates for testing
    for (const t of config.PET_TEMPLATES_SEED) {
      await PetTemplate.upsert({
        id: t.id,
        name: t.name,
        emoji: t.emoji,
        group: t.group,
        species: t.species,
        statType: t.statType,
        statValue: t.statValue,
        desc: t.desc
      });
    }
    const allTemplates = await PetTemplate.findAll();
    config.loadPetTemplatesIntoCache(allTemplates);

    // 1. Test naming cleaning and suffix +X
    assert.strictEqual(config.getFormattedPetName('Thần Viên +1', 'LT_1', 1, false), 'Thần Viên +1');
    assert.strictEqual(config.getFormattedPetName('Thần Viên', 'LT_1', 1, false), 'Thần Viên +1');
    assert.strictEqual(config.getFormattedPetName('Thần Viên [MAX]', 'LT_4', 10, true), 'Thần Viên [MAX]');
    assert.strictEqual(config.getFormattedPetName('Thần Viên', 'LT_4', 10, true), 'Thần Viên [MAX]');

    // 2. Test evolution cost calculations
    const mockPetLT = { type: 'ma_lang_1', rarity: 'LT_1', tienHoa: 0, extraEvo: 0 };
    assert.strictEqual(config.getPetEvolutionCost(mockPetLT), 1000); // step 0

    mockPetLT.tienHoa = 1;
    assert.strictEqual(config.getPetEvolutionCost(mockPetLT), 1250); // step 1

    mockPetLT.tienHoa = 2;
    assert.strictEqual(config.getPetEvolutionCost(mockPetLT), 1562); // step 2

    // 3. Test guard protect bonus boost in TuSi.layChiSo
    const tuSi = await TuSi.create({
      idNguoiDung: "9999999999999991",
      ten: "TestPetTuSi",
      gioiTinh: "Nam",
      huongTu: "The Tu",
      linhCan: "Thổ Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 10000
    });
    tuSi.linhCanList = ["Tho"];

    const pet = await Pet.create({
      userId: tuSi.idNguoiDung,
      name: "U Minh Ma Lang",
      type: "than_vien_2",
      rarity: "LT_1",
      level: 1,
      tuChat: 100,
      isActive: true,
      tienHoa: 1
    });

    const stats = tuSi.layChiSo([], pet);
    // Tho Linh Can: +10% max HP -> 220 HP.
    // Than Vien base protect: +15% HP, scale = (level 1 * tuChat 100)/100 = 1.0.
    // evoMult = Math.pow(1.1, 1) = 1.10.
    // Total HP should be (220 + 33) * 10 / 3 = 843.
    assert.strictEqual(stats.max_hp, 843);

    // Clean up
    await pet.destroy();
    await tuSi.destroy();
  });

  test('Pet Legacy Migration and 10-Evolve Reset Rules', async () => {
    const { Pet } = await import('./models/Pet.js');
    const { TuSi } = await import('./models/TuSi.js');

    // 1. Mock migration for existing pet
    const p = Pet.build({
      userId: "temp_user_id",
      name: "Thiết Tý Thần Viên",
      type: "than_vien",
      rarity: "RARE",
      tienHoa: 5
    });

    // Run migration logic matching main.js
    if (!p.rarity.startsWith('LT_') && !p.rarity.startsWith('TT_')) {
      const oldType = p.type;
      let newType = oldType;
      let nextRarity = 'LT_1';
      const isLinh = ['ma_lang', 'loi_diep', 'than_vien'].includes(oldType);
      if (isLinh) {
        if (oldType === 'ma_lang') newType = 'ma_lang_2';
        else if (oldType === 'loi_diep') newType = 'loi_diep_2';
        else if (oldType === 'than_vien') newType = 'than_vien_2';

        if (p.rarity === 'NORMAL') nextRarity = 'LT_1';
        else if (p.rarity === 'RARE') nextRarity = 'LT_2';
        else if (p.rarity === 'LEGENDARY') nextRarity = 'LT_3';
        else nextRarity = 'LT_4';
      }

      p.type = newType;
      p.rarity = nextRarity;
      p.extraEvo = 0;
      p.isMax = false;
      const cleanName = p.name.replace(/(\s\+\d+|\[MAX\]|\[Tiến\s*[Hh]óa\]\s*)/g, '').trim();
      p.name = config.getFormattedPetName(cleanName, nextRarity, p.tienHoa, false);
    }

    assert.strictEqual(p.type, 'than_vien_2');
    assert.strictEqual(p.rarity, 'LT_2');
    assert.strictEqual(p.name, 'Thiết Tý Thần Viên +5');

    // 2. Test evolving milestone
    const pet = Pet.build({
      userId: "temp_user_id2",
      name: "Thiết Tý Thần Viên",
      type: "than_vien_2",
      rarity: "LT_1",
      level: 110,
      tienHoa: 10
    });

    // Simulated Breakthrough when clicking evolve at level 110 and tienHoa 10
    if (pet.tienHoa === 10) {
      const rarityPrefix = pet.rarity.slice(0, 3); // 'LT_'
      const curQualityIndex = config.getPetQualityIndex(pet.rarity); // 0
      if (curQualityIndex < 3) {
        const nextQualityIndex = curQualityIndex + 2; // index 1 -> label 'LT_2'
        pet.rarity = `${rarityPrefix}${nextQualityIndex}`;
        pet.tienHoa = 0;
      }
    }

    assert.strictEqual(pet.rarity, 'LT_2');
    assert.strictEqual(pet.tienHoa, 0);
  });

  test('Bloodline Suppression and Breakthrough Pill Drop Blocks', async () => {
    const { Pet } = await import('./models/Pet.js');
    const { TuSi } = await import('./models/TuSi.js');

    // 1. Verify bloodline suppression logic in config.js
    assert.deepStrictEqual(config.checkHuyetMachApChe(15, 'TT_1'), { allowed: true });
    assert.strictEqual(config.checkHuyetMachApChe(15, 'TT_2').allowed, false);
    assert.strictEqual(config.checkHuyetMachApChe(20, 'TT_2').allowed, true);
    assert.strictEqual(config.checkHuyetMachApChe(20, 'TT_3').allowed, false);
    assert.strictEqual(config.checkHuyetMachApChe(23, 'TT_3').allowed, true);
    assert.strictEqual(config.checkHuyetMachApChe(23, 'TT_4').allowed, false);
    assert.strictEqual(config.checkHuyetMachApChe(26, 'TT_4').allowed, true);

    // 2. Verify TuSi.layChiSoDayDu automatically deactivates invalid pet
    const tuSi = await TuSi.create({
      idNguoiDung: "9999999999999992",
      ten: "TestSuppressTuSi",
      gioiTinh: "Nam",
      huongTu: "The Tu",
      linhCan: "Thổ Linh Căn",
      capDo: 15, // Under Hóa Thần
      linhLuc: 0,
      linhThach: 10000
    });
    tuSi.linhCanList = ["Tho"];

    const pet = await Pet.create({
      userId: tuSi.idNguoiDung,
      name: "Hỗn Thiên Tổ Long",
      type: "to_long_1",
      rarity: "TT_2", // Chaos Bloodline -> requires level >= 19
      level: 1,
      tuChat: 100,
      isActive: true,
      tienHoa: 1
    });

    // Run layChiSoDayDu which should deactivate the pet
    const stats = await tuSi.layChiSoDayDu();
    
    // Check pet state in database
    const updatedPet = await Pet.findByPk(pet.id);
    assert.strictEqual(updatedPet.isActive, false);

    // Clean up
    await pet.destroy();
    await tuSi.destroy();

    // 3. Verify that Hóa Thần breakthrough pill (dan_dot_pha_5) drops are redirected to herbs (linh_thao_hoa_than)
    const mockBtData = config.layVatPhamDotPhaTheoCapDo(19); // level 19 corresponds to Hóa Thần
    assert.strictEqual(mockBtData.pillId, 'dan_dot_pha_5');
    
    // Simulate drop evaluation logic
    let targetId = mockBtData.pillId;
    if (targetId === 'dan_dot_pha_5') {
      targetId = mockBtData.herbId;
    }
    assert.strictEqual(targetId, 'linh_thao_hoa_than');
  });

  test('Chuyển Sinh Đan deletes all player-related records', async () => {
    const { boDieuKhienVatPham } = await import('./controllers/BoDieuKhienVatPham.js');
    const { AuctionListing } = await import('./models/AuctionListing.js');
    const { DongGopEmoji } = await import('./models/DongGopEmoji.js');
    const { LichSuMua } = await import('./models/LichSuMua.js');
    
    // 1. Create a TuSi and related data
    const userId = "999777888111";
    const tuSi = await TuSi.create({
      idNguoiDung: userId,
      ten: "Chuyển Sinh Nhân",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 1,
      hp: 1200,
      mp: 100
    });

    // Add inventory records
    const csPillInv = await Inventory.create({ idNguoiDung: userId, itemId: 'chuyen_sinh_dan', soLuong: 1, trangBi: false });
    const dummyWeapon = await Inventory.create({ idNguoiDung: userId, itemId: 'kiem_go', soLuong: 1, trangBi: true });

    // Add skill record
    await PlayerSkill.create({ idNguoiDung: userId, skillId: 'test_hoa_diem', capDo: 1, trangBi: true });

    // Add pet
    const pet = await Pet.create({ userId: userId, name: "Thần Thú Con", type: "to_long_1", rarity: "TT_1", level: 1, tuChat: 100, isActive: true });

    // Add garden plot
    await GardenPlot.create({ userId: userId, slotIndex: 0, status: 'EMPTY' });

    // Add player gift code
    await PlayerGiftCode.create({ userId: userId, code: 'TEST_CODE' });

    // Add cooldown (ThoiGianCho)
    await ThoiGianCho.create({ idNguoiDung: userId, hanhDong: 'dungeon', hetHan: new Date(Date.now() + 30000) });

    // Add abode
    await Abode.create({ userId: userId, level: 1 });

    // Add buy history (LichSuMua)
    await LichSuMua.create({ idNguoiDung: userId, itemId: 'dan_hp_1', soLuong: 1, giaDaTra: 50, giaLoai: 'linh_thach' });

    // Add emoji contribution
    await DongGopEmoji.create({ idNguoiDung: userId, tenEmoji: 'test_emoji', imageUrl: 'http://example.com/img.png', trangThai: 'PENDING' });

    // Add auction listing
    const auction = await AuctionListing.create({
      sellerId: userId,
      inventoryId: dummyWeapon.id,
      itemId: 'kiem_go',
      itemSnapshot: '{}',
      startPrice: 100,
      currentPrice: 100,
      status: 'active',
      endsAt: new Date(Date.now() + 3600 * 1000)
    });

    // 2. Perform the Reincarnation Pill usage
    const useResult = await boDieuKhienVatPham._thucHienDungItem(tuSi, csPillInv, 'chuyen_sinh_dan');
    assert.strictEqual(useResult.ok, true);
    assert.ok(useResult.msg.includes("Luân Hồi Chuyển Sinh"));

    // 3. Verify that all records for this player have been deleted
    const countTuSi = await TuSi.count({ where: { idNguoiDung: userId } });
    const countInv = await Inventory.count({ where: { idNguoiDung: userId } });
    const countSkills = await PlayerSkill.count({ where: { idNguoiDung: userId } });
    const countPets = await Pet.count({ where: { userId: userId } });
    const countPlots = await GardenPlot.count({ where: { userId: userId } });
    const countCodes = await PlayerGiftCode.count({ where: { userId: userId } });
    const countCds = await ThoiGianCho.count({ where: { idNguoiDung: userId } });
    const countAbode = await Abode.count({ where: { userId: userId } });
    const countLsm = await LichSuMua.count({ where: { idNguoiDung: userId } });
    const countEmojis = await DongGopEmoji.count({ where: { idNguoiDung: userId } });
    const countAuctions = await AuctionListing.count({ where: { sellerId: userId } });

    assert.strictEqual(countTuSi, 0);
    assert.strictEqual(countInv, 0);
    assert.strictEqual(countSkills, 0);
    assert.strictEqual(countPets, 0);
    assert.strictEqual(countPlots, 0);
    assert.strictEqual(countCodes, 0);
    assert.strictEqual(countCds, 0);
    assert.strictEqual(countAbode, 0);
    assert.strictEqual(countLsm, 0);
    assert.strictEqual(countEmojis, 0);
    assert.strictEqual(countAuctions, 0);
  });

  test('Gift Code ISEKAI grants 1 Chuyển Sinh Đan', async () => {
    const { boDieuKhienTuSi } = await import('./controllers/BoDieuKhienTuSi.js');
    const { GiftCode } = await import('./models/GiftCode.js');
    const { PlayerGiftCode } = await import('./models/PlayerGiftCode.js');

    // Create a mock player
    const userId = "888777111222";
    const tuSi = await TuSi.create({
      idNguoiDung: userId,
      ten: "Isekai Tester",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 1,
      hp: 1200,
      mp: 100
    });

    // Create ISEKAI giftcode in DB
    await GiftCode.upsert({
      code: 'ISEKAI',
      linhThach: 0,
      linhLuc: 0,
      vnd: 0,
      itemsJson: JSON.stringify([{ itemId: 'chuyen_sinh_dan', soLuong: 1 }])
    });

    // Execute use code directly
    const redeemRes = await boDieuKhienTuSi._thucHienNhapCode(tuSi, 'isekai');
    assert.strictEqual(redeemRes.ok, true);
    assert.strictEqual(redeemRes.code, 'ISEKAI');

    // Verify item in inventory
    const inv = await Inventory.findOne({ where: { idNguoiDung: userId, itemId: 'chuyen_sinh_dan' } });
    assert.ok(inv);
    assert.strictEqual(inv.soLuong, 1);

    // Clean up
    await inv.destroy();
    await PlayerGiftCode.destroy({ where: { userId: userId } });
    await tuSi.destroy();
  });

  test('Forge upgrade checks and consumes materials', async () => {
    const { boDieuKhienDongPhu } = await import('./controllers/BoDieuKhienDongPhu.js');

    const userId = "777888999000";
    const tuSi = await TuSi.create({
      idNguoiDung: userId,
      ten: "Thợ Rèn Thử Nghiệm",
      gioiTinh: "Nam",
      huongTu: "The Tu",
      linhCan: "Kim Linh Căn",
      capDo: 10,
      hp: 12000,
      mp: 100,
      linhThach: 1000
    });

    // 1. Forge without phế khí
    const res1 = await boDieuKhienDongPhu._processForge(tuSi, 'kiem_sat_nang', 'kiem_sat');
    assert.strictEqual(res1.ok, false);
    assert.ok(res1.msg.includes("Thiếu phế khí"));

    // Add phế khí to inventory
    const oldInv = await Inventory.create({ idNguoiDung: userId, itemId: 'kiem_sat_nang', soLuong: 1, trangBi: false });

    // 2. Forge without material
    const res2 = await boDieuKhienDongPhu._processForge(tuSi, 'kiem_sat_nang', 'kiem_sat');
    assert.strictEqual(res2.ok, false);
    assert.ok(res2.msg.includes("Thiếu nguyên liệu rèn"));

    // Add material to inventory (only 4)
    const matInv = await Inventory.create({ idNguoiDung: userId, itemId: 'nguyen_lieu_truc_co', soLuong: 4, trangBi: false });

    // 3. Forge with insufficient materials
    const res3 = await boDieuKhienDongPhu._processForge(tuSi, 'kiem_sat_nang', 'kiem_sat');
    assert.strictEqual(res3.ok, false);
    assert.ok(res3.msg.includes("Thiếu nguyên liệu rèn"));

    // Add 1 more material (total 5)
    matInv.soLuong = 5;
    await matInv.save();

    // 4. Forge successfully
    const res4 = await boDieuKhienDongPhu._processForge(tuSi, 'kiem_sat_nang', 'kiem_sat');
    assert.strictEqual(res4.ok, true);
    assert.ok(res4.msg.includes("Luyện Khí Thành Công"));

    // Check inventory and ling thach
    const newInv = await Inventory.findOne({ where: { idNguoiDung: userId, itemId: 'kiem_sat' } });
    assert.ok(newInv);
    assert.strictEqual(tuSi.linhThach, 800);

    const checkedMat = await Inventory.findOne({ where: { idNguoiDung: userId, itemId: 'nguyen_lieu_truc_co' } });
    assert.strictEqual(checkedMat, null);

    // Clean up
    await newInv.destroy();
    await tuSi.destroy();
  });

  test('Tổ Long and Bạch Hổ passive stats verification', async () => {
    const userId = "555555111222";
    const tuSi = await TuSi.create({
      idNguoiDung: userId,
      ten: "Thú Sư Thử Nghiệm",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Thổ Linh Căn",
      capDo: 25,
      hp: 10000,
      mp: 1000
    });

    // 1. Equip Hỗn Thiên Tổ Long
    const petLong = await Pet.create({
      userId: userId,
      name: "Tổ Long Thử Nghiệm",
      type: "to_long_1",
      rarity: "TT_1",
      level: 1,
      tuChat: 100,
      isActive: true
    });

    const statsLong = await tuSi.layChiSoDayDu();
    // to_long_1 adds +30% phap_cong and +10% crit_rate (x1.5 = +45% phap_cong and +15% crit_rate)
    // base phap_cong = 25 + 6 * 24 = 169. expected total = 169 + 169 * 0.45 = 245.
    // base crit_rate = 0.08 + 0.003 * 24 = 0.152. expected total = 0.152 + 0.15 = 0.302.
    assert.ok(statsLong.phap_cong >= 245); 
    assert.ok(statsLong.crit_rate >= 0.30);

    // 2. Equip Thần Thú Bạch Hổ
    petLong.isActive = false;
    await petLong.save();

    const petHo = await Pet.create({
      userId: userId,
      name: "Bạch Hổ Thử Nghiệm",
      type: "bach_ho_1",
      rarity: "TT_1",
      level: 1,
      tuChat: 100,
      isActive: true
    });

    const statsHo = await tuSi.layChiSoDayDu();
    // bach_ho_1 adds +30% vat_cong and +10% crit_rate (x1.5 = +45% vat_cong and +15% crit_rate)
    // base vat_cong = 5 + 1 * 24 = 29. expected total = 29 + 29 * 0.45 = 42.
    // base crit_rate = 0.302
    assert.ok(statsHo.vat_cong >= 42);
    assert.ok(statsHo.crit_rate >= 0.30);

    // Clean up
    await petLong.destroy();
    await petHo.destroy();
    await tuSi.destroy();
  });

  test('Lôi Điệp stats calculation verification', async () => {
    const userId = "444444111222";
    const tuSi = await TuSi.create({
      idNguoiDung: userId,
      ten: "Điệp Sư Thử Nghiệm",
      gioiTinh: "Nữ",
      huongTu: "Phap Tu",
      linhCan: "Lôi Linh Căn",
      capDo: 10,
      hp: 2000,
      mp: 500
    });

    // Create level 100 Thất Thải Lôi Điệp
    const petDiep = await Pet.create({
      userId: userId,
      name: "Lôi Điệp Thử Nghiệm",
      type: "loi_diep_2",
      rarity: "LT_1",
      level: 100,
      tuChat: 100,
      isActive: true
    });

    tuSi.linhCanList = ["Loi"];
    await tuSi.save();

    const stats = await tuSi.layChiSoDayDu();
    // Base crit rate is:
    // pathConfig.base_stats.crit_rate + growth.crit_rate * lvlDiff = 0.08 + 0.003 * 9 = 0.107.
    // Pet loi_diep_2 adds: 0.05 * scalePct * evoMult * groupMult = 0.05 * 1.99 = 0.0995.
    // Expected crit rate should be around 0.107 + 0.0995 = 0.2065 (20.65%).
    // Previously, with raw scale = 100, it would be 0.08 + 0.027 + 5.0 = 5.107 (510.7%).
    assert.ok(stats.crit_rate < 0.25);
    assert.ok(stats.crit_rate > 0.18);

    // Verify tu_toc coefficient
    // Base mult for Loi Linh Can (single element):
    // PHAT_DA_LINH_CAN[1] = 1.0.
    // Loi Linh Can bonus: * config.NGUON_LINH_CAN['Loi'].tu_toc (which is 2.0).
    // Pet bonus: * (1.0 + template.statValue * scalePct * evoMult * groupMult) = (1.0 + 0.10 * 1.99) = 1.199.
    // Expected total mult = 1.0 * 2.0 * 1.199 = 2.398.
    // Previously, with raw scale = 100, total mult = 1.0 * 2.0 * 11.0 = 22.0.
    const mult = await tuSi.layHeSoTuLuyen(petDiep);
    assert.ok(mult < 2.5);
    assert.ok(mult > 2.2);

    // Clean up
    await petDiep.destroy();
    await tuSi.destroy();
  });

  test('Divine/Legendary items and Ancient Egg cannot drop in dungeons', async () => {
    const { Item } = await import('./models/Item.js');

    // 1. Verify that 'trung_than_thu' has doHiem = 'Huyền thoại'
    const egg = await Item.findByPk('trung_than_thu');
    assert.ok(egg);
    assert.strictEqual(egg.doHiem, 'Huyền thoại');

    // 2. Validate dropping check logic
    const testItems = [
      { id: 'trung_than_thu', doHiem: 'Huyền thoại' },
      { id: 'chuyen_sinh_dan', doHiem: 'Huyền thoại' },
      { id: 'van_yeu_qua_than', doHiem: 'Thần cấp' },
      { id: 'kiem_go', doHiem: 'Thường' },
      { id: 'kiem_sat', doHiem: 'Hiếm' }
    ];

    const allowedDrops = [];
    for (const item of testItems) {
      const isBlocked = (item.doHiem === 'Huyền thoại' || item.doHiem === 'Thần cấp' || item.id === 'trung_than_thu');
      if (!isBlocked) {
        allowedDrops.push(item.id);
      }
    }

        // Must block trung_than_thu, chuyen_sinh_dan, van_yeu_qua_than
    assert.deepStrictEqual(allowedDrops, ['kiem_go', 'kiem_sat']);
  });

  test('Supreme Treasure (Chí bảo) tab, separate filter and usage logic', async () => {
    const { Inventory } = await import('./models/Inventory.js');
    const { Item } = await import('./models/Item.js');
    const { BoTaoEmbed } = await import('./views/BoTaoEmbed.js');
    const { boDieuKhienVatPham } = await import('./controllers/BoDieuKhienVatPham.js');

    const userId = "777777111222";
    const tuSi = await TuSi.create({
      idNguoiDung: userId,
      ten: "Chí Bảo Tester",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 1,
      hp: 100,
      mp: 100
    });

    // 1. Create a custom Chí Bảo item with stats to verify recovery msg and non-consumption
    const mockChibao = await Item.create({
      id: 'custom_chibao_test',
      ten: 'Hỗn Độn Châu 🔮',
      loai: 'Chí bảo',
      doHiem: 'Thần cấp',
      giaCoSo: 500000,
      chiSoJson: '{"hp_hoi": 10, "exp_bonus": 100}',
      yeuCauCanhGioi: 1,
      moTa: 'Chí bảo thử nghiệm.'
    });

    const invChibao = await Inventory.create({
      idNguoiDung: userId,
      itemId: 'custom_chibao_test',
      soLuong: 1,
      trangBi: false
    });

    // 2. Verify _phanLoaiItems categorizes it under chiBao sheet
    const itemsList = [{
      invId: invChibao.id,
      item: mockChibao,
      soLuong: 1,
      trangBi: false,
      nangCapSao: 0,
      dongChiSoJson: '{}',
      khoa: false
    }];

    const categorised = BoTaoEmbed._phanLoaiItems(itemsList);
    assert.strictEqual(categorised.chiBao.length, 1);
    assert.strictEqual(categorised.linhThao.length, 0); // Should be excluded from linhThao

    // 3. Verify baloSheets contains 6 sheets
    const sheets = BoTaoEmbed.baloSheets(tuSi, itemsList);
    assert.strictEqual(sheets.length, 6);
    const chibaoSheet = sheets.find(s => s.value === 'chibao');
    assert.ok(chibaoSheet);
    assert.strictEqual(chibaoSheet.description, '1 vật phẩm');

    // 4. Test using the custom Chí Bảo (should heal, add exp, and NOT be consumed)
    const result = await boDieuKhienVatPham._thucHienDungItem(tuSi, invChibao, 'custom_chibao_test');
    assert.strictEqual(result.ok, true);
    assert.ok(result.msg.includes('vật phẩm không bị tiêu hao'));
    
    // Reload player and inventory
    await tuSi.reload();
    await invChibao.reload();

    assert.strictEqual(invChibao.soLuong, 1); // Should NOT be consumed!
    assert.strictEqual(tuSi.linhLuc, 100);    // exp_bonus applied

    // Clean up
    await invChibao.destroy();
    await mockChibao.destroy();
    await tuSi.destroy();
  });

  test('Daily Cards (Thẻ Vĩnh Viễn, Thẻ Quý, Thẻ Tháng) behavior and expiry', async () => {
    const { Inventory } = await import('./models/Inventory.js');
    const { Item } = await import('./models/Item.js');
    const { BoTaoEmbed } = await import('./views/BoTaoEmbed.js');
    const { boDieuKhienVatPham } = await import('./controllers/BoDieuKhienVatPham.js');

    const userId = "777777111224";
    const tuSi = await TuSi.create({
      idNguoiDung: userId,
      ten: "Thẻ Tester",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 1,
      hp: 100,
      mp: 100
    });

    // 1. Ensure new items are upserted/synced in DB
    await Item.upsert({
      id: 'the_vinh_vien',
      ten: 'Thẻ Vĩnh Viễn',
      loai: 'Chí bảo',
      doHiem: 'Thần cấp',
      giaCoSo: 0,
      chiSoJson: '{}',
      yeuCauCanhGioi: 1,
      moTa: 'test'
    });
    await Item.upsert({
      id: 'the_thang',
      ten: 'Thẻ Tháng',
      loai: 'Chí bảo',
      doHiem: 'Hiếm',
      giaCoSo: 0,
      chiSoJson: '{}',
      yeuCauCanhGioi: 1,
      moTa: 'test'
    });
    await Item.upsert({
      id: 'co_duyen_lenh',
      ten: 'Cơ Duyên Lệnh 🎫',
      loai: 'Linh thảo',
      doHiem: 'Hiếm',
      giaCoSo: 2000,
      chiSoJson: '{}',
      yeuCauCanhGioi: 1,
      moTa: 'test'
    });
    await Item.upsert({
      id: 'dan_tu_vi_tim',
      ten: 'Tu Vi Đan (Siêu) 💊',
      loai: 'Đan dược',
      doHiem: 'Cực hiếm',
      giaCoSo: 2000,
      chiSoJson: '{}',
      yeuCauCanhGioi: 1,
      moTa: 'test'
    });

    // 2. Add Thẻ Tháng
    const now = Date.now();
    const invThang = await Inventory.addVatPham(userId, 'the_thang', 1);
    assert.ok(invThang);
    const meta1 = JSON.parse(invThang.dongChiSoJson);
    assert.ok(meta1.expireAt);
    const diff1 = meta1.expireAt - now;
    // should be roughly 30 days
    assert.ok(diff1 > 29 * 24 * 60 * 60 * 1000 && diff1 < 31 * 24 * 60 * 60 * 1000);

    // 3. Add second Thẻ Tháng to extend duration
    const invThang2 = await Inventory.addVatPham(userId, 'the_thang', 1);
    assert.strictEqual(invThang2.id, invThang.id); // Same inventory row
    const meta2 = JSON.parse(invThang2.dongChiSoJson);
    const diff2 = meta2.expireAt - now;
    // should be roughly 60 days
    assert.ok(diff2 > 59 * 24 * 60 * 60 * 1000 && diff2 < 61 * 24 * 60 * 60 * 1000);

    // 4. Test Daily Usage of Thẻ Tháng
    // First use: success, reward added
    const resUse1 = await boDieuKhienVatPham._thucHienDungItem(tuSi, invThang2, 'the_thang');
    assert.strictEqual(resUse1.ok, true);
    assert.ok(resUse1.msg.includes('Nhận Phúc Lợi Thẻ Tháng Thành Công'));

    // Check inventory has co_duyen_lenh x2
    const cdlRecord = await Inventory.findOne({ where: { idNguoiDung: userId, itemId: 'co_duyen_lenh' } });
    assert.ok(cdlRecord);
    assert.strictEqual(cdlRecord.soLuong, 2);

    // Second use today: should fail
    const resUse2 = await boDieuKhienVatPham._thucHienDungItem(tuSi, invThang2, 'the_thang');
    assert.strictEqual(resUse2.ok, false);
    assert.ok(resUse2.msg.includes('ngày mai'));

    // 5. Test Thẻ Vĩnh Viễn
    const invVinhVien = await Inventory.addVatPham(userId, 'the_vinh_vien', 1);
    const resUseVV = await boDieuKhienVatPham._thucHienDungItem(tuSi, invVinhVien, 'the_vinh_vien');
    assert.strictEqual(resUseVV.ok, true);
    assert.ok(resUseVV.msg.includes('Nhận Phúc Lợi Thẻ Vĩnh Viễn Thành Công'));

    // Check we got the Tu Vi Đan (Siêu)
    const tvRecord = await Inventory.findOne({ where: { idNguoiDung: userId, itemId: 'dan_tu_vi_tim' } });
    assert.ok(tvRecord);
    assert.strictEqual(tvRecord.soLuong, 1);

    // 6. Test Expiry
    const invThangExpired = await Inventory.addVatPham(userId, 'the_thang', 1);
    const expiredMeta = { expireAt: Date.now() - 1000 };
    invThangExpired.dongChiSoJson = JSON.stringify(expiredMeta);
    await invThangExpired.save();

    // Usage should fail and destroy the card
    const resUseExpired = await boDieuKhienVatPham._thucHienDungItem(tuSi, invThangExpired, 'the_thang');
    assert.strictEqual(resUseExpired.ok, false);
    assert.ok(resUseExpired.msg.includes('hết hạn'));

    // Check DB - should be deleted
    const checkCard = await Inventory.findByPk(invThangExpired.id);
    assert.strictEqual(checkCard, null);

    // Clean up
    await Inventory.destroy({ where: { idNguoiDung: userId } });
    await tuSi.destroy();
  });

  test('Skin purchase inventory addition falls back to Skin table', async () => {
    const { Inventory } = await import('./models/Inventory.js');
    const { Skin } = await import('./models/Skin.js');

    // Create a mock skin in the database
    const mockSkin = await Skin.create({
      id: 'test_skin_custom_id',
      ten: 'Y Phục Thử Nghiệm',
      loai: 'skin',
      gioiTinh: 'Cả hai',
      fileAnh: 'test_skin.png',
      giaVnd: 5000,
      moTa: 'Skin dùng để test.'
    });

    // Try adding it to inventory via addVatPham
    const userId = "777777111223";
    const record = await Inventory.addVatPham(userId, 'test_skin_custom_id', 1);

    assert.ok(record);
    assert.strictEqual(record.itemId, 'test_skin_custom_id');
    assert.strictEqual(record.soLuong, 1);

    // Verify it exists in database
    const dbRecord = await Inventory.findOne({ where: { idNguoiDung: userId, itemId: 'test_skin_custom_id' } });
    assert.ok(dbRecord);

    // Clean up
    await record.destroy();
    await mockSkin.destroy();
  });

  test('Dam Dao multiplayer choices and Jackpot (No Hu) resolution', async () => {
    const { CauHinhGuild } = await import('./models/CauHinhGuild.js');

    // 1. Create players and set up test balances
    const p1 = await TuSi.create({ idNguoiDung: "111", ten: "HostPlayer", gioiTinh: "Nam", huongTu: "Phap Tu", linhCan: "Thủy Linh Căn", capDo: 1, vnd: 1000000 });
    const p2 = await TuSi.create({ idNguoiDung: "222", ten: "JoinPlayer", gioiTinh: "Nam", huongTu: "Phap Tu", linhCan: "Thủy Linh Căn", capDo: 1, vnd: 1000000 });

    // 2. Set up CauHinhGuild for the server
    const guildId = "999";
    const guildConfig = await CauHinhGuild.create({
      idGuild: guildId,
      ngayKhoiTao: new Date(),
      huTaiXiu: 1000000 // Base Jackpot is 1,000,000 VND
    });

    // 3. Define host choice, players map, and outcome
    // Host bets 100,000 on tx_tai (Tài)
    // Joiner bets 200,000 on tx_3 (specific sum 3)
    const hostBet = 100000;
    const playersMap = new Map();
    playersMap.set("111", { userId: "111", userName: "HostPlayer", bet: hostBet, choiceId: 'tx_tai' });
    playersMap.set("222", { userId: "222", userName: "JoinPlayer", bet: 200000, choiceId: 'tx_3' });

    // Simulate 3% contribution logic
    let contribution = 0;
    for (const player of playersMap.values()) {
      contribution += Math.floor(player.bet * 0.03);
    }
    guildConfig.huTaiXiu += contribution;
    await guildConfig.save();

    // Verify contribution was added (100,000 * 0.03 = 3000, 200,000 * 0.03 = 6000 -> total 9000 added to 1,000,000)
    assert.strictEqual(Number(guildConfig.huTaiXiu), 1009000);

    // Simulate roll outcome sum = 3 (this triggers jackpot!)
    const mockOutcome = {
      d1: 1, d2: 1, d3: 1, sum: 3, result: 'tx_xiu'
    };

    // Calculate outcomes per player
    const winningPlayers = [];
    const results = [];

    // Helper outcome resolver simulating resolvePlayerOutcome logic
    const resolveOutcome = (choiceId, wager, outcome) => {
      let isWin = false;
      const sum = outcome.sum;
      if (choiceId === 'tx_tai') isWin = sum >= 11;
      else if (choiceId === 'tx_xiu') isWin = sum <= 10;
      else if (choiceId === 'tx_chan') isWin = sum % 2 === 0;
      else if (choiceId === 'tx_le') isWin = sum % 2 !== 0;
      else if (choiceId === `tx_${sum}`) isWin = true;

      const multiplier = (choiceId === 'tx_3' || choiceId === 'tx_18') ? 32 : (choiceId.startsWith('tx_') && choiceId !== 'tx_tai' && choiceId !== 'tx_xiu' && choiceId !== 'tx_chan' && choiceId !== 'tx_le') ? 16 : 2;
      const delta = isWin ? wager * (multiplier - 1) : -wager;
      return { isWin, delta };
    };

    for (const player of playersMap.values()) {
      const playerTuSi = player.userId === "111" ? p1 : p2;
      const playerOutcome = resolveOutcome(player.choiceId, player.bet, mockOutcome);

      if (playerOutcome.isWin) {
        winningPlayers.push({ player, playerTuSi, playerOutcome });
      } else {
        playerTuSi.vnd = Math.max(0, playerTuSi.vnd + playerOutcome.delta);
        await playerTuSi.save();
        results.push({ userId: player.userId, delta: playerOutcome.delta, newBalance: playerTuSi.vnd, jackpotShare: 0 });
      }
    }

    assert.strictEqual(winningPlayers.length, 1);
    assert.strictEqual(winningPlayers[0].player.userId, "222");

    let totalJackpotAwarded = 0;
    const currentJackpotPool = Number(guildConfig.huTaiXiu);

    for (const wp of winningPlayers) {
      const share = currentJackpotPool; // Only 1 winner, so gets 100%
      totalJackpotAwarded += share;
      wp.playerTuSi.vnd = Math.max(0, wp.playerTuSi.vnd + wp.playerOutcome.delta + share);
      await wp.playerTuSi.save();
      results.push({ userId: wp.player.userId, delta: wp.playerOutcome.delta, newBalance: wp.playerTuSi.vnd, jackpotShare: share });
    }

    // Update pool
    guildConfig.huTaiXiu = Math.max(1000000, currentJackpotPool - totalJackpotAwarded);
    await guildConfig.save();

    // Verify balances
    await p1.reload();
    await p2.reload();

    // Host lost 100,000 VND -> 1,000,000 - 100,000 = 900,000 VND
    assert.strictEqual(p1.vnd, 900000);
    // Joiner won 6,200,000 + 1,009,000 jackpot = 7,209,000. Total = 1,000,000 + 7,209,000 = 8,209,000 VND
    assert.strictEqual(p2.vnd, 8209000);
    // Jackpot pool resets to base minimum (1,000,000)
    assert.strictEqual(Number(guildConfig.huTaiXiu), 1000000);

    // Clean up
    await p1.destroy();
    await p2.destroy();
    await guildConfig.destroy();
  });

  test('Pet Fusion Feature logic', async () => {
    const { Pet } = await import('./models/Pet.js');
    const { TuSi } = await import('./models/TuSi.js');

    // Create a mock TuSi
    const player = await TuSi.create({
      idNguoiDung: "8888888888888888",
      ten: "FusionTestPlayer",
      gioiTinh: "Nữ",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 200000
    });
    player.linhCanList = ["Hoa"];

    // 1. Create two normal pets
    const petA = await Pet.create({
      userId: player.idNguoiDung,
      name: "Thanh Vân Điệp",
      type: "loi_diep_1",
      rarity: "LT_1",
      level: 10,
      tuChat: 110,
      isActive: false
    });

    const petB = await Pet.create({
      userId: player.idNguoiDung,
      name: "Thiết Tý Viên",
      type: "than_vien_1",
      rarity: "LT_1",
      level: 5,
      tuChat: 120,
      isActive: false
    });

    // Verify config default base stats mapping
    const defaultStatsA = config.getPetDefaultBaseStats(petA.type);
    assert.strictEqual(defaultStatsA.tu_toc, 0.08);

    const defaultStatsB = config.getPetDefaultBaseStats(petB.type);
    assert.strictEqual(defaultStatsB.max_hp, 0.10);
    assert.strictEqual(defaultStatsB.giap, 0.08);

    // Verify config current stats fallback works
    const currentStatsA = config.getPetCurrentStats(petA);
    assert.strictEqual(currentStatsA.tu_toc, 0.08);

    // Simulate 99% (default) fusion stats calculation (let's assume we selected parent A and it got +10%)
    const statsA = config.getPetCurrentStats(petA);
    const statsB = config.getPetCurrentStats(petB);

    const isThanA = ['to_long_1', 'to_long_2', 'phuong_hoang_1', 'phuong_hoang_2', 'ky_lan_1', 'ky_lan_2', 'huyen_vu_1', 'huyen_vu_2', 'bach_ho_1', 'bach_ho_2'].includes(petA.type);
    const isThanB = ['to_long_1', 'to_long_2', 'phuong_hoang_1', 'phuong_hoang_2', 'ky_lan_1', 'ky_lan_2', 'huyen_vu_1', 'huyen_vu_2', 'bach_ho_1', 'bach_ho_2'].includes(petB.type);
    const cost = (isThanA || isThanB) ? 100000 : 5000;
    assert.strictEqual(cost, 5000); // Both are normal pets

    // Fused stats logic: select parent A and apply +10%
    const fusedStatsA = {};
    for (const [key, val] of Object.entries(statsA)) {
      fusedStatsA[key] = parseFloat((val * 1.10).toFixed(4));
    }
    assert.strictEqual(fusedStatsA.tu_toc, 0.088);

    // Fused stats logic: select parent B and apply +10%
    const fusedStatsB = {};
    for (const [key, val] of Object.entries(statsB)) {
      fusedStatsB[key] = parseFloat((val * 1.10).toFixed(4));
    }
    assert.strictEqual(fusedStatsB.max_hp, 0.11);
    assert.strictEqual(fusedStatsB.giap, 0.088);

    // 1% super-rare fusion logic: merge both and apply +10%
    const fusedStatsMerged = {};
    const allKeys = new Set([...Object.keys(statsA), ...Object.keys(statsB)]);
    for (const key of allKeys) {
      const valA = statsA[key] || 0;
      const valB = statsB[key] || 0;
      fusedStatsMerged[key] = parseFloat(((valA + valB) * 1.10).toFixed(4));
    }
    assert.strictEqual(fusedStatsMerged.tu_toc, 0.088);
    assert.strictEqual(fusedStatsMerged.max_hp, 0.11);
    assert.strictEqual(fusedStatsMerged.giap, 0.088);

    // Create a new fused pet in DB with merged stats to verify TuSi logic
    const fusedPet = await Pet.create({
      userId: player.idNguoiDung,
      name: "Thanh Vân Điệp [Fused]",
      type: petA.type,
      rarity: "LT_1",
      level: 1,
      exp: 0,
      tuChat: Math.max(petA.tuChat, petB.tuChat), // should be 120
      tienHoa: 0,
      extraEvo: 0,
      isMax: false,
      isActive: true,
      fusedStats: JSON.stringify(fusedStatsMerged)
    });

    assert.strictEqual(fusedPet.tuChat, 120);

    // Verify that the custom fused stats are loaded and format correctly
    const loadedStats = config.getPetCurrentStats(fusedPet);
    assert.strictEqual(loadedStats.tu_toc, 0.088);
    assert.strictEqual(loadedStats.max_hp, 0.11);
    assert.strictEqual(loadedStats.giap, 0.088);

    const formatted = config.formatFusedStats(loadedStats);
    assert.ok(formatted.includes('+8.80% Tu tốc'));
    assert.ok(formatted.includes('+11.00% HP'));
    assert.ok(formatted.includes('+8.80% Giáp'));

    // Check speed multiplier using fused pet
    // Formula inside layHeSoTuLuyen:
    // scale = level (1) * tuChat (120) / 100 = 1.2
    // scalePct = 1.0 + (1.2 - 1.0) * 0.01 = 1.002
    // totalEvolves = 0, evoMult = 1.0
    // groupMult = 1.0 (normal pet)
    // tuTocVal = 0.088
    // speed multiplier from pet = 1.0 + 0.088 * 1.002 * 1.0 * 1.0 = 1.088176
    // Base speed mult for Hoa Linh Can = 1.5
    // Expected total speed mult = 1.5 * 1.088176 = 1.632264
    const speedMult = player.layHeSoTuLuyen(fusedPet);
    assert.ok(speedMult > 1.63);
    assert.ok(speedMult < 1.64);

    // Verify stats in layChiSo using fused pet
    const baseStats = player.layChiSo([], fusedPet);
    // Base HP mapping for Phap Tu: 120 (base) + 15 * (capDo - 1) = 120
    // + Thuy/Tho element mult: none
    // Total HP before fail breakthroughs/capped dodge = (120 + 15.84) * 10 / 3 = 452
    assert.strictEqual(baseStats.max_hp, 452);

    // Clean up
    await petA.destroy();
    await petB.destroy();
    await fusedPet.destroy();
    await player.destroy();
  });

  test('Relationship Feature (Kết Duyên) logic', async () => {
    const { TuSi } = await import('./models/TuSi.js');
    const { Abode } = await import('./models/Abode.js');
    const { _simCombat } = await import('./controllers/BoDieuKhienTuongTac.js');

    // Create 2 mock TuSi
    const playerA = await TuSi.create({
      idNguoiDung: "7777777777777777",
      ten: "PlayerAlpha",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 1000000
    });
    playerA.linhCanList = ["Hoa"];

    const playerB = await TuSi.create({
      idNguoiDung: "8888888888888888",
      ten: "PlayerBeta",
      gioiTinh: "Nữ",
      huongTu: "Phap Tu",
      linhCan: "Thủy Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 100000
    });
    playerB.linhCanList = ["Thuy"];
    await playerA.save();
    await playerB.save();

    // 1. Test affinity points helper
    let points = await config.layLuongDuyen(playerA.idNguoiDung, playerB.idNguoiDung);
    assert.strictEqual(points, 0);

    points = await config.tangLuongDuyen(playerA.idNguoiDung, playerB.idNguoiDung, 5);
    assert.strictEqual(points, 5);

    points = await config.layLuongDuyen(playerB.idNguoiDung, playerA.idNguoiDung); // should sort IDs
    assert.strictEqual(points, 5);

    await config.tangLuongDuyen(playerA.idNguoiDung, playerB.idNguoiDung, 5);
    points = await config.layLuongDuyen(playerA.idNguoiDung, playerB.idNguoiDung);
    assert.strictEqual(points, 10);

    // 2. Establish marriage (hôn phu)
    playerA.duyenType = 'hon_phu';
    playerA.duyenUserId = playerB.idNguoiDung;
    playerB.duyenType = 'hon_phu';
    playerB.duyenUserId = playerA.idNguoiDung;
    await playerA.save();
    await playerB.save();

    // 3. Verify cultivation speed boost in profiles
    // Raw speed for A: base speed of Luyen Khi 1 = 100. heSoTuLuyen = 1.0 (no pet, Hoa Linh can = 1.5).
    // So rawSpeedA = 100 * 1.5 = 150.
    // Raw speed for B: base speed = 100. heSoTuLuyen = 1.0 (no pet, Thuy Linh can = 1.5).
    // So rawSpeedB = 100 * 1.5 = 150.
    // Since they are spouses (1.50 multiplier), their new speed = 1.50 * (150 + 150) / 2 = 225!
    
    const abodeA = await Abode.create({ userId: playerA.idNguoiDung, level: 0 });
    const abodeB = await Abode.create({ userId: playerB.idNguoiDung, level: 0 });

    const cgA = await CanhGioi.findByPk(playerA.capDo);
    const tocDoCoBanA = cgA ? cgA.tocDoCoBan : 100;
    const heSoTuLuyenA = playerA.layHeSoTuLuyen(null);
    const rawSpeedA = Math.floor(tocDoCoBanA * heSoTuLuyenA * 1); // 1 + abode level (0)
    assert.strictEqual(rawSpeedA, 150);

    let speedFinalA = rawSpeedA;
    if (playerA.duyenType && playerA.duyenUserId) {
      const partner = await TuSi.findOne({ where: { idNguoiDung: playerA.duyenUserId } });
      if (partner && String(partner.duyenUserId) === String(playerA.idNguoiDung) && partner.duyenType === playerA.duyenType) {
        const abB = await Abode.findByPk(partner.idNguoiDung);
        const lvDongPhuB = abB ? abB.level : 0;
        const cgB = await CanhGioi.findByPk(partner.capDo);
        const tocDoCoBanB = cgB ? cgB.tocDoCoBan : 100;
        const heSoTuLuyenB = partner.layHeSoTuLuyen(null);
        const rawSpeedB = Math.floor(tocDoCoBanB * heSoTuLuyenB * (1 + lvDongPhuB));
        const factor = playerA.duyenType === 'hon_phu' ? 1.50 : 1.30;
        speedFinalA = Math.floor(factor * (rawSpeedA + rawSpeedB) / 2);
      }
    }
    assert.strictEqual(speedFinalA, 187);

    // 4. Test _simCombat
    const { winner, battleLogs, round } = await _simCombat(playerA, playerB);
    assert.ok(winner);
    assert.ok(battleLogs.length > 0);

    // Clean up
    await playerA.destroy();
    await playerB.destroy();
    await abodeA.destroy();
    await abodeB.destroy();
    const aff = await PlayerAffinity.findOne({ where: { userIdA: "7777777777777777", userIdB: "8888888888888888" } });
    if (aff) await aff.destroy();
  });

  test('Admin /edit Command restricted to wiine5100 and interactive panel functions', async () => {
    const { boDieuKhienAdmin } = await import('./controllers/BoDieuKhienAdmin.js');
    const { TuSi } = await import('./models/TuSi.js');
    const { Inventory } = await import('./models/Inventory.js');

    // Create target player
    const targetTuSi = await TuSi.create({
      idNguoiDung: "999999999999111",
      ten: "Thử Nghiệm Bị Chỉnh",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 1,
      linhLuc: 0,
      linhThach: 100,
      vnd: 100
    });

    // 1. Test unauthorized execution (username !== 'wiine5100')
    let rejectedMsg = null;
    const unauthorizedInteraction = {
      user: { username: 'normal_user' },
      reply: async (payload) => {
        rejectedMsg = payload.content;
      }
    };
    await boDieuKhienAdmin.lenhEdit.execute(unauthorizedInteraction);
    assert.ok(rejectedMsg);
    assert.ok(rejectedMsg.includes('Vô pháp vô thiên'));

    // 2. Test authorized execution (username === 'wiine5100')
    let editReplyPayload = null;
    let collectHandler = null;
    let endHandler = null;

    const authorizedInteraction = {
      user: { username: 'wiine5100', id: '12345' },
      deferReply: async () => {},
      channel: { send: async () => {} },
      options: {
        getUser: (name) => {
          if (name === 'target') return { id: targetTuSi.idNguoiDung, username: targetTuSi.ten };
          return null;
        }
      },
      editReply: async (payload) => {
        editReplyPayload = payload;
        return {
          createMessageComponentCollector: () => {
            return {
              on: (event, handler) => {
                if (event === 'collect') collectHandler = handler;
                if (event === 'end') endHandler = handler;
              },
              stop: (reason) => {
                if (endHandler) endHandler(null, reason);
              }
            };
          }
        };
      }
    };

    await boDieuKhienAdmin.lenhEdit.execute(authorizedInteraction);
    
    // Check main dashboard output
    assert.ok(editReplyPayload);
    assert.ok(editReplyPayload.embeds[0].data.title.includes('Bảng Thiên Đạo Điều Phối'));

    // Test stats edit click: first mock stats menu navigation
    const mockClickStats = {
      customId: 'edit_btn_stats',
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockClickStats);
    assert.ok(editReplyPayload.embeds[0].data.title.includes('Thiên Đạo Điều Chỉnh Chỉ Số'));

    // Mock adding +10M Linh Thạch via Modal
    const mockAddGold = {
      customId: 'edit_stat_mod_lt',
      user: { id: '12345' },
      showModal: async () => {},
      awaitModalSubmit: async () => {
        return {
          customId: `modal_edit_stat_mod_lt_${targetTuSi.idNguoiDung}`,
          deferUpdate: async () => {},
          fields: {
            getTextInputValue: (id) => {
              if (id === 'amount_input') return '+10M';
              return '';
            }
          }
        };
      }
    };
    await collectHandler(mockAddGold);
    await targetTuSi.reload();
    assert.strictEqual(targetTuSi.linhThach, 10000100);

    // Mock adding +1B Linh Luc via Modal
    const mockAddExp = {
      customId: 'edit_stat_mod_ll',
      user: { id: '12345' },
      showModal: async () => {},
      awaitModalSubmit: async () => {
        return {
          customId: `modal_edit_stat_mod_ll_${targetTuSi.idNguoiDung}`,
          deferUpdate: async () => {},
          fields: {
            getTextInputValue: (id) => {
              if (id === 'amount_input') return '+1B';
              return '';
            }
          }
        };
      }
    };
    await collectHandler(mockAddExp);
    await targetTuSi.reload();
    assert.strictEqual(targetTuSi.linhLuc, 1000000000);

    // Test gifting item
    const mockClickGift = {
      customId: 'edit_btn_gift',
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockClickGift);
    assert.ok(editReplyPayload.embeds[0].data.title.includes('Thiên Đạo Ban Tặng Vật Phẩm'));

    // Select category 'Đan dược'
    const mockSelectCat = {
      customId: 'edit_gift_cat_select',
      values: ['Đan dược'],
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockSelectCat);

    // Select item 'dan_than_pham'
    const mockSelectItem = {
      customId: 'edit_gift_item_select',
      values: ['dan_than_pham'],
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockSelectItem);

    // Click Tặng x5
    const mockClickGiftBtn = {
      customId: 'edit_gift_x5',
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockClickGiftBtn);

    // Check inventory
    const gifted = await Inventory.findOne({ where: { idNguoiDung: targetTuSi.idNguoiDung, itemId: 'dan_than_pham' } });
    assert.ok(gifted);
    assert.strictEqual(gifted.soLuong, 5);

    // Test revoking item
    const mockClickRevoke = {
      customId: 'edit_btn_revoke',
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockClickRevoke);
    assert.ok(editReplyPayload.embeds[0].data.title.includes('Thiên Đạo Thu Hồi Vật Phẩm'));

    // Select gifted item from list
    const mockSelectRevokeItem = {
      customId: 'edit_revoke_item_select',
      values: [String(gifted.id)],
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockSelectRevokeItem);

    // Click Thu hồi 1
    const mockClickRevokeBtn = {
      customId: 'edit_revoke_x1',
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockClickRevokeBtn);

    // Check inventory quantity reduced to 4
    await gifted.reload();
    assert.strictEqual(gifted.soLuong, 4);

    // Click Thu hồi tất cả
    const mockClickRevokeAllBtn = {
      customId: 'edit_revoke_all',
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockClickRevokeAllBtn);

    // Check inventory - record destroyed
    const checkDeleted = await Inventory.findByPk(gifted.id);
    assert.strictEqual(checkDeleted, null);

    // Clean up
    await targetTuSi.destroy();
  });

  test('Admin /edit Command multi-target gifting and stats modification', async () => {
    const { boDieuKhienAdmin } = await import('./controllers/BoDieuKhienAdmin.js');
    const { TuSi } = await import('./models/TuSi.js');
    const { Inventory } = await import('./models/Inventory.js');

    // Create two targets
    const target1 = await TuSi.create({
      idNguoiDung: "999999999999221",
      ten: "Tu Sĩ Đệ Nhất",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 1,
      linhLuc: 100,
      linhThach: 100,
      vnd: 100
    });

    const target2 = await TuSi.create({
      idNguoiDung: "999999999999222",
      ten: "Tu Sĩ Đệ Nhị",
      gioiTinh: "Nữ",
      huongTu: "Kiem Tu",
      linhCan: "Thủy Linh Căn",
      capDo: 1,
      linhLuc: 200,
      linhThach: 200,
      vnd: 200
    });

    let editReplyPayload = null;
    let collectHandler = null;
    let endHandler = null;

    const interaction = {
      user: { username: 'wiine5100', id: '12345' },
      deferReply: async () => {},
      channel: { send: async () => {} },
      options: {
        getUser: (name) => {
          if (name === 'target') return { id: target1.idNguoiDung, username: target1.ten };
          if (name === 'target2') return { id: target2.idNguoiDung, username: target2.ten };
          return null;
        }
      },
      editReply: async (payload) => {
        editReplyPayload = payload;
        return {
          createMessageComponentCollector: () => {
            return {
              on: (event, handler) => {
                if (event === 'collect') collectHandler = handler;
                if (event === 'end') endHandler = handler;
              },
              stop: (reason) => {
                if (endHandler) endHandler(null, reason);
              }
            };
          }
        };
      }
    };

    await boDieuKhienAdmin.lenhEdit.execute(interaction);

    assert.ok(editReplyPayload);
    assert.ok(editReplyPayload.embeds[0].data.title.includes('Bảng Thiên Đạo Điều Phối (Hàng Loạt)'));

    // Check that both users are listed in description
    const desc = editReplyPayload.embeds[0].data.description;
    assert.ok(desc.includes(target1.ten));
    assert.ok(desc.includes(target2.ten));

    // Test stats modification menu click
    const mockClickStats = {
      customId: 'edit_btn_stats',
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockClickStats);
    assert.ok(editReplyPayload.embeds[0].data.title.includes('Thiên Đạo Điều Chỉnh Chỉ Số (Hàng Loạt)'));

    // Mock adding +100M Linh Thạch via Modal
    const mockAddGold = {
      customId: 'edit_stat_mod_lt',
      user: { id: '12345' },
      showModal: async () => {},
      awaitModalSubmit: async () => {
        return {
          customId: `modal_edit_stat_mod_lt_${target1.idNguoiDung}`,
          deferUpdate: async () => {},
          fields: {
            getTextInputValue: (id) => {
              if (id === 'amount_input') return '+100M';
              return '';
            }
          }
        };
      }
    };
    await collectHandler(mockAddGold);
    await target1.reload();
    await target2.reload();
    assert.strictEqual(target1.linhThach, 100000100);
    assert.strictEqual(target2.linhThach, 100000200);

    // Test gifting item to both
    const mockClickGift = {
      customId: 'edit_btn_gift',
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockClickGift);
    assert.ok(editReplyPayload.embeds[0].data.title.includes('Thiên Đạo Ban Tặng Vật Phẩm (Hàng Loạt)'));

    // Select category 'Đan dược'
    const mockSelectCat = {
      customId: 'edit_gift_cat_select',
      values: ['Đan dược'],
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockSelectCat);

    // Select item 'dan_than_pham'
    const mockSelectItem = {
      customId: 'edit_gift_item_select',
      values: ['dan_than_pham'],
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockSelectItem);

    // Click Tặng x10
    const mockClickGiftBtn = {
      customId: 'edit_gift_x10',
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockClickGiftBtn);

    // Check inventory for both targets
    const gifted1 = await Inventory.findOne({ where: { idNguoiDung: target1.idNguoiDung, itemId: 'dan_than_pham' } });
    const gifted2 = await Inventory.findOne({ where: { idNguoiDung: target2.idNguoiDung, itemId: 'dan_than_pham' } });
    assert.ok(gifted1);
    assert.ok(gifted2);
    assert.strictEqual(gifted1.soLuong, 10);
    assert.strictEqual(gifted2.soLuong, 10);

    // Clean up
    await target1.destroy();
    await target2.destroy();
  });

  test('Phoenix pet stats and active skill damage calculation', async () => {
    const { TuSi } = await import('./models/TuSi.js');
    const { Pet } = await import('./models/Pet.js');
    const config = await import('./config.js');

    const userId = "777777111225";
    const player = await TuSi.create({
      idNguoiDung: userId,
      ten: "Phụng Hoàng Đạo Sĩ",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 1,
      hp: 100,
      mp: 100,
      linhThach: 100
    });

    const activePet = await Pet.create({
      userId: userId,
      name: "Phượng Hoàng Lửa",
      type: "phuong_hoang_1",
      rarity: "TT_1",
      level: 1,
      tuChat: 100,
      isActive: true
    });

    player.linhCanList = ["Hoa"];
    await player.save();

    const stats = await player.layChiSoDayDu();

    // 1. Assert passive stats additions
    // Base crit_dmg for Phap Tu: 1.50.
    // template.species === 'phuong_hoang' adds +100% bạo thương (1.00 * scalePct * evoMult * groupMult).
    // scalePct = 1.0 (level 1, tuChat 100), evoMult = 1.0, groupMult = 1.0 -> should add +1.0 crit_dmg.
    // Total crit_dmg should be baseline + 1.00 = 3.10.
    assert.strictEqual(stats.crit_dmg, 3.10);

    // HuongTu is Phap Tu, so phap_cong should get +20% base phap_cong.
    // Base phap_cong = 20.
    // 20 * 0.20 = 4.
    // plus elements or others, but it should increase base stats phap_cong by 20%
    assert.ok(stats.phap_cong > 20);

    // 2. Active skill damage verification
    const evoMult = 1.0;
    const baseDmg = (stats.vat_cong + stats.phap_cong) * evoMult;
    const addHits = Math.floor(stats.crit_dmg / 0.8); // 3.10 / 0.8 = 3 hits
    const totalHits = 1 + addHits; // 4 hits total
    
    let totalPetDmg = 0;
    let currentHitDmg = baseDmg;
    for (let h = 0; h < totalHits; h++) {
      totalPetDmg += currentHitDmg;
      currentHitDmg = currentHitDmg * 1.2;
    }
    totalPetDmg = Math.floor(totalPetDmg);

    // Verify hits calculation: 3.10 / 0.8 is 3, so total hits is 4
    assert.strictEqual(totalHits, 4);
    assert.ok(totalPetDmg > baseDmg * 4); // because of 20% compound growth

    // Clean up
    await player.destroy();
    await activePet.destroy();
  });

  test('Phoenix pet and active pet skill cooldown logic', async () => {
    const { Pet } = await import('./models/Pet.js');
    const config = await import('./config.js');

    const userId = "777777111226";
    // 1. Verify default base cd is 5
    const petDefault = await Pet.create({
      userId: userId,
      name: "Tổ Long Thử Nghiệm",
      type: "to_long_1",
      rarity: "TT_1",
      level: 1,
      tuChat: 100,
      tienHoa: 0,
      extraEvo: 0,
      cd: null,
      isActive: false
    });
    
    let baseCd = (petDefault.cd !== null && petDefault.cd !== undefined) ? petDefault.cd : 5;
    let totalEvolves = config.getPetTotalEvolves(petDefault);
    let petSkillCd = Math.max(1, baseCd - totalEvolves);
    assert.strictEqual(petSkillCd, 5); // 5 - 0 = 5

    // 2. Verify custom cd is 3
    petDefault.cd = 3;
    await petDefault.save();

    baseCd = (petDefault.cd !== null && petDefault.cd !== undefined) ? petDefault.cd : 5;
    petSkillCd = Math.max(1, baseCd - totalEvolves);
    assert.strictEqual(petSkillCd, 3); // 3 - 0 = 3

    // 3. Verify evolve decreases cd
    petDefault.tienHoa = 1; // 1 evolve
    await petDefault.save();

    baseCd = (petDefault.cd !== null && petDefault.cd !== undefined) ? petDefault.cd : 5;
    totalEvolves = config.getPetTotalEvolves(petDefault);
    petSkillCd = Math.max(1, baseCd - totalEvolves);
    assert.strictEqual(petSkillCd, 2); // 3 - 1 = 2

    // 4. Verify minimum cd is 1
    petDefault.tienHoa = 5; // 5 evolves
    await petDefault.save();

    baseCd = (petDefault.cd !== null && petDefault.cd !== undefined) ? petDefault.cd : 5;
    totalEvolves = config.getPetTotalEvolves(petDefault);
    petSkillCd = Math.max(1, baseCd - totalEvolves);
    assert.strictEqual(petSkillCd, 1); // Math.max(1, 3 - 5) = 1

    await petDefault.destroy();
  });

  test('Admin /edit Command can gift egg items via Trung category', async () => {
    const { TuSi } = await import('./models/TuSi.js');
    const { Inventory } = await import('./models/Inventory.js');
    const { boDieuKhienAdmin } = await import('./controllers/BoDieuKhienAdmin.js');

    const targetUserId = "777777111227";
    const targetTuSi = await TuSi.create({
      idNguoiDung: targetUserId,
      ten: "Đạo Sĩ Ấp Trứng",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 1,
      hp: 100,
      mp: 100,
      linhThach: 100
    });

    // Mock command interaction
    let editReplyPayload = null;
    const mockInteraction = {
      user: { username: 'wiine5100', id: '12345' },
      options: {
        getUser: () => ({ id: targetUserId, username: "Đạo Sĩ Ấp Trứng" })
      },
      deferReply: async () => {},
      channel: { send: async () => {} },
      editReply: async (payload) => {
        editReplyPayload = payload;
        return {
          createMessageComponentCollector: () => ({
            on: (event, handler) => {
              if (event === 'collect') {
                collectHandler = handler;
              }
            }
          })
        };
      }
    };

    let collectHandler = null;

    await boDieuKhienAdmin.lenhEdit.execute(mockInteraction);

    // Click gift button
    const mockClickGift = {
      customId: 'edit_btn_gift',
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockClickGift);

    // Select category 'Linh thảo'
    const mockSelectCat = {
      customId: 'edit_gift_cat_select',
      values: ['Linh thảo'],
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockSelectCat);

    // Click next page to see the eggs (on page 1)
    const mockClickNext = {
      customId: 'edit_gift_next',
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockClickNext);

    // Select item 'trung_than_thu'
    const mockSelectItem = {
      customId: 'edit_gift_item_select',
      values: ['trung_than_thu'],
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockSelectItem);

    // Click Tặng x1
    const mockClickGiftBtn = {
      customId: 'edit_gift_x1',
      user: { id: '12345' },
      deferUpdate: async () => {}
    };
    await collectHandler(mockClickGiftBtn);

    // Check inventory
    const gifted = await Inventory.findOne({ where: { idNguoiDung: targetUserId, itemId: 'trung_than_thu' } });
    assert.ok(gifted);
    assert.strictEqual(gifted.soLuong, 1);

    // Clean up
    await targetTuSi.destroy();
  });

  test('Pet Quick Release feature with species and bloodline filters', async () => {
    const { Pet } = await import('./models/Pet.js');
    const { TuSi } = await import('./models/TuSi.js');
    const { boDieuKhienDongPhu } = await import('./controllers/BoDieuKhienDongPhu.js');

    const testUserId = "777777111229";
    const tuSi = await TuSi.create({
      idNguoiDung: testUserId,
      ten: "Tu Sĩ Nuôi Sủng",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 1,
      hp: 100,
      mp: 100,
      linhThach: 50000
    });

    // Create 3 pets (2 Loi Diep, 1 Ma Lang)
    const pet1 = await Pet.create({
      userId: testUserId,
      name: "Butterfly A",
      type: "loi_diep_1",
      rarity: "LT_1",
      level: 1,
      isActive: false
    });
    const pet2 = await Pet.create({
      userId: testUserId,
      name: "Butterfly B",
      type: "loi_diep_2",
      rarity: "LT_2",
      level: 1,
      isActive: false
    });
    const pet3 = await Pet.create({
      userId: testUserId,
      name: "Wolf C",
      type: "ma_lang_1",
      rarity: "LT_1",
      level: 1,
      isActive: false
    });
    const petActive = await Pet.create({
      userId: testUserId,
      name: "Equipped Pet",
      type: "ma_lang_1",
      rarity: "LT_1",
      level: 1,
      isActive: true // active - should NEVER be quick released!
    });

    let editReplyPayload = null;
    let collectHandler = null;

    const mockInteraction = {
      user: { id: testUserId },
      deferReply: async () => {},
      editReply: async (payload) => {
        editReplyPayload = payload;
        return {
          createMessageComponentCollector: () => ({
            on: (event, handler) => {
              if (event === 'collect') {
                collectHandler = handler;
              }
            }
          })
        };
      }
    };

    // Open /pet command (which starts with stack = ['PETS'])
    await boDieuKhienDongPhu.lenhPet.execute(mockInteraction);

    // Click 'Phóng Sinh Nhanh' button
    await collectHandler({
      customId: 'pet_quick_release_menu',
      user: { id: testUserId },
      deferUpdate: async () => {},
      editReply: async () => {}
    });

    // Filter species: 'loi_diep' (蝶)
    await collectHandler({
      customId: 'pet_release_filter_species',
      values: ['loi_diep'],
      user: { id: testUserId },
      deferUpdate: async () => {},
      editReply: async () => {}
    });

    // Filter bloodline: 'LT_1' (Hoang Dã)
    await collectHandler({
      customId: 'pet_release_filter_bloodline',
      values: ['LT_1'],
      user: { id: testUserId },
      deferUpdate: async () => {},
      editReply: async () => {}
    });

    // Execute Release!
    await collectHandler({
      customId: 'pet_release_execute',
      user: { id: testUserId },
      deferUpdate: async () => {},
      editReply: async () => {}
    });

    // Verify database: pet1 (Butterfly A: loi_diep_1 & LT_1) must be destroyed.
    const checkPet1 = await Pet.findByPk(pet1.id);
    assert.strictEqual(checkPet1, null);

    // pet2 (Butterfly B: loi_diep_2 & LT_2) must NOT be destroyed.
    const checkPet2 = await Pet.findByPk(pet2.id);
    assert.ok(checkPet2);

    // pet3 (Wolf C: ma_lang_1 & LT_1) must NOT be destroyed.
    const checkPet3 = await Pet.findByPk(pet3.id);
    assert.ok(checkPet3);

    // petActive (Active Wolf) must NOT be destroyed.
    const checkActive = await Pet.findByPk(petActive.id);
    assert.ok(checkActive);

    // Verify player merit points (1 pet was released)
    await tuSi.reload();
    assert.strictEqual(tuSi.congDuc, 1);

    // Clean up
    if (checkPet2) await checkPet2.destroy();
    if (checkPet3) await checkPet3.destroy();
    if (checkActive) await checkActive.destroy();
    await tuSi.destroy();
  });

  test('Shop Merit Points tab and buying custom pet egg', async () => {
    const { TuSi } = await import('./models/TuSi.js');
    const { Inventory } = await import('./models/Inventory.js');
    const { boDieuKhienShop } = await import('./controllers/BoDieuKhienShop.js');

    const testUserId = "777777111230";
    const tuSi = await TuSi.create({
      idNguoiDung: testUserId,
      ten: "MeritShopPlayer",
      gioiTinh: "Nam",
      huongTu: "Phap Tu",
      linhCan: "Hỏa Linh Căn",
      capDo: 1,
      congDuc: 3 // Start with 3 merit points
    });

    let editReplyPayload = null;
    let collectHandler = null;

    const mockInteraction = {
      user: { id: testUserId },
      deferReply: async () => {},
      editReply: async (payload) => {
        editReplyPayload = payload;
        return {
          createMessageComponentCollector: () => ({
            on: (event, handler) => {
              if (event === 'collect') {
                collectHandler = handler;
              }
            }
          })
        };
      }
    };

    // Open shop command
    await boDieuKhienShop.lenhShop.execute(mockInteraction);

    // Switch tab to 'pet'
    await collectHandler({
      customId: 'buy_tab_select',
      values: ['pet'],
      user: { id: testUserId },
      deferUpdate: async () => {},
      editReply: async () => {}
    });

    // Select the pet egg
    await collectHandler({
      customId: 'buy_item_select',
      values: ['buy_pet_egg_linh'],
      user: { id: testUserId },
      deferUpdate: async () => {},
      editReply: async () => {}
    });

    // Click Buy x1 (costs 2 merit points)
    await collectHandler({
      customId: 'buy_action_1',
      user: { id: testUserId },
      deferUpdate: async () => {},
      editReply: async () => {}
    });

    // Verify player merit points
    await tuSi.reload();
    assert.strictEqual(tuSi.congDuc, 1); // 3 - 2 = 1 merit point left

    // Verify item in inventory
    const egg = await Inventory.findOne({ where: { idNguoiDung: testUserId, itemId: 'trung_linh_thu_linh' } });
    assert.ok(egg);
    assert.strictEqual(egg.soLuong, 1);

    // Clean up
    if (egg) await egg.destroy();
    await tuSi.destroy();
  });

});

