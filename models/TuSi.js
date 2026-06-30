import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database.js';
import * as config from '../config.js';

class TuSi extends Model {
  get linhCanList() {
    try {
      return JSON.parse(this.danhSachLinhCanJson || '[]');
    } catch (e) {
      return [];
    }
  }

  set linhCanList(value) {
    this.danhSachLinhCanJson = JSON.stringify(value || []);
  }

  layChiSo(equippedItems = []) {
    const huongTu = this.huongTu || 'Phap Tu';
    const pathConfig = config.HUONG_DI[huongTu] || config.HUONG_DI['Phap Tu'];
    const baseStats = pathConfig.base_stats;
    const growth = pathConfig.growth;

    const capDo = this.capDo || 1;
    const lvlDiff = capDo - 1;

    // 1. Chỉ số cơ bản + tăng trưởng theo cấp
    let maxHp = baseStats.hp + growth.hp * lvlDiff;
    let maxMp = baseStats.mp + growth.mp * lvlDiff;
    let vatCong = baseStats.vat_cong + growth.vat_cong * lvlDiff;
    let phapCong = baseStats.phap_cong + growth.phap_cong * lvlDiff;
    let vatPhong = baseStats.vat_phong + growth.vat_phong * lvlDiff;
    let phapPhong = baseStats.phap_phong + growth.phap_phong * lvlDiff;
    let giap = baseStats.giap + growth.giap * lvlDiff;
    let xuyenGiap = baseStats.xuyen_giap + growth.xuyen_giap * lvlDiff;
    let critRate = baseStats.crit_rate + growth.crit_rate * lvlDiff;
    let critDmg = baseStats.crit_dmg + growth.crit_dmg * lvlDiff;

    // 2. Cộng chỉ số từ trang bị đang mặc
    for (const item of equippedItems) {
      let stats = {};
      if (item && item.chiSoJson) {
        try {
          stats = JSON.parse(item.chiSoJson);
        } catch (e) {}
      } else if (item && item.chiSo) {
        stats = item.chiSo;
      }
      
      if (stats.hp) maxHp += stats.hp;
      if (stats.mp) maxMp += stats.mp;
      if (stats.vat_cong) vatCong += stats.vat_cong;
      if (stats.phap_cong) phapCong += stats.phap_cong;
      if (stats.vat_phong) vatPhong += stats.vat_phong;
      if (stats.phap_phong) phapPhong += stats.phap_phong;
      if (stats.giap) giap += stats.giap;
      if (stats.xuyen_giap) xuyenGiap += stats.xuyen_giap;
      if (stats.crit_rate) critRate += stats.crit_rate;
      if (stats.crit_dmg) critDmg += stats.crit_dmg;
    }

    // 3. Cộng hệ số linh căn
    const elements = this.linhCanList;

    if (elements.includes('Loi')) {
      critDmg += config.NGUON_LINH_CAN['Loi'].crit_dmg;
    }
    if (elements.includes('Thuy')) {
      maxHp *= config.NGUON_LINH_CAN['Thuy'].hp_mult;
      maxMp *= config.NGUON_LINH_CAN['Thuy'].mp_mult;
    }
    if (elements.includes('Tho')) {
      vatPhong *= config.NGUON_LINH_CAN['Tho'].vat_phong_mult;
      maxHp *= config.NGUON_LINH_CAN['Tho'].hp_mult;
    }
    if (elements.includes('Kim')) {
      vatCong *= config.NGUON_LINH_CAN['Kim'].vat_cong_mult;
    }
    if (elements.includes('Hoa')) {
      critRate += config.NGUON_LINH_CAN['Hoa'].crit_rate;
    }

    // 3. Phạt căn cơ do đột phá thất bại
    const phatHp = this.phatHp || 0.0;
    const phatMp = this.phatMp || 0.0;
    const phatVatCong = this.phatVatCong || 0.0;
    const phatPhapCong = this.phatPhapCong || 0.0;

    maxHp = Math.floor(maxHp * (1.0 - phatHp));
    maxMp = Math.floor(maxMp * (1.0 - phatMp));
    vatCong = Math.floor(vatCong * (1.0 - phatVatCong));
    phapCong = Math.floor(phapCong * (1.0 - phatPhapCong));

    // Đảm bảo chỉ số tối thiểu
    maxHp = Math.max(1, Math.floor(maxHp));
    maxMp = Math.max(1, Math.floor(maxMp));
    vatCong = Math.max(1, Math.floor(vatCong));
    phapCong = Math.max(1, Math.floor(phapCong));
    vatPhong = Math.max(1, Math.floor(vatPhong));
    phapPhong = Math.max(1, Math.floor(phapPhong));
    giap = Math.max(0, Math.floor(giap));
    xuyenGiap = Math.max(0, Math.floor(xuyenGiap));

    return {
      max_hp: maxHp,
      max_mp: maxMp,
      vat_cong: vatCong,
      phap_cong: phapCong,
      vat_phong: vatPhong,
      phap_phong: phapPhong,
      giap: giap,
      xuyen_giap: xuyenGiap,
      crit_rate: critRate,
      crit_dmg: critDmg,
    };
  }

  layHeSoTuLuyen() {
    let mult = 1.0;
    const elements = this.linhCanList;

    if (elements.includes('Loi')) {
      mult = config.NGUON_LINH_CAN['Loi'].tu_toc;
    } else if (elements.includes('Hoa')) {
      mult = config.NGUON_LINH_CAN['Hoa'].tu_toc;
    }

    return mult;
  }

  dongBoCanhGioi() {
    const capDo = this.capDo || 1;
    const { realmName, stageName } = config.layThongTinCanhGioi(capDo);
    this.canhGioi = realmName;

    if (realmName === 'Luyện Khí') {
      try {
        this.tang = parseInt(stageName.replace('Tầng ', ''), 10);
      } catch (e) {
        this.tang = 1;
      }
    } else {
      const mapping = { 'Sơ Kỳ': 1, 'Trung Kỳ': 2, 'Hậu Kỳ': 3, 'Chân Tiên': 1 };
      this.tang = mapping[stageName] || 1;
    }
  }

  nhanPhatDotPhaThatBai() {
    const penalty = 0.05 + Math.random() * 0.05; // 5% - 10%
    const statsToPenalize = ['hp', 'mp', 'vatCong', 'phapCong'];
    const statToPenalize = statsToPenalize[Math.floor(Math.random() * statsToPenalize.length)];

    if (statToPenalize === 'hp') {
      this.phatHp = Math.min(0.50, (this.phatHp || 0.0) + penalty);
    } else if (statToPenalize === 'mp') {
      this.phatMp = Math.min(0.50, (this.phatMp || 0.0) + penalty);
    } else if (statToPenalize === 'vatCong') {
      this.phatVatCong = Math.min(0.50, (this.phatVatCong || 0.0) + penalty);
    } else if (statToPenalize === 'phapCong') {
      this.phatPhapCong = Math.min(0.50, (this.phatPhapCong || 0.0) + penalty);
    }

    // Hạ 1 tiểu cấp nếu lớn hơn Luyện Khí tầng 1
    if (this.capDo > 1) {
      this.capDo -= 1;
      this.dongBoCanhGioi();
    }

    // Trọng thương (HP/MP về 10% giới hạn mới)
    const stats = this.layChiSo();
    this.hp = Math.max(1, Math.floor(stats.max_hp * 0.10));
    this.mp = Math.max(1, Math.floor(stats.max_mp * 0.10));

    return [statToPenalize, Math.floor(penalty * 100)];
  }
}

TuSi.init({
  idNguoiDung: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    allowNull: false,
    autoIncrement: false,
    field: 'user_id'
  },
  ten: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'ten'
  },
  gioiTinh: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'Nam',
    field: 'gioi_tinh'
  },
  huongTu: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'Phap Tu',
    field: 'huong_tu'
  },
  linhCan: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'linh_can'
  },
  danhSachLinhCanJson: {
    type: DataTypes.STRING(200),
    allowNull: false,
    defaultValue: '[]',
    field: 'linh_can_list_json'
  },
  canhGioi: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Luyện Khí',
    field: 'canh_gioi'
  },
  tang: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'tang'
  },
  capDo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'level'
  },
  linhLuc: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'linh_luc'
  },
  hp: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    field: 'hp'
  },
  mp: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    field: 'mp'
  },
  linhThach: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'linh_thach'
  },
  idTongMon: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'tong_id'
  },
  phatHp: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
    field: 'hp_penalty'
  },
  phatMp: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
    field: 'mp_penalty'
  },
  phatVatCong: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
    field: 'vat_cong_penalty'
  },
  phatPhapCong: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
    field: 'phap_cong_penalty'
  },
  lastUpdateTuVi: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_update_tuvi'
  },
  linhLucDu: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
    field: 'linh_luc_du'
  },
  linhThachDu: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
    field: 'linh_thach_du'
  }
}, {
  sequelize,
  modelName: 'TuSi',
  tableName: 'players',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

export { TuSi };
