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
  
  get thongKeAuto() {
    try {
      return JSON.parse(this.thongKeAutoJson || '{}');
    } catch (e) {
      return {};
    }
  }

  set thongKeAuto(value) {
    this.thongKeAutoJson = JSON.stringify(value || {});
  }

  async layChiSoDayDu() {
    const { Inventory } = await import('./Inventory.js');
    const { Item } = await import('./Item.js');
    const { Pet } = await import('./Pet.js');

    const equippedInv = await Inventory.findAll({
      where: { idNguoiDung: this.idNguoiDung, trangBi: true }
    });
    for (const eq of equippedInv) {
      const detail = await Item.findByPk(eq.itemId);
      if (detail) {
        eq.item = detail;
      }
    }
    let activePet = await Pet.findOne({ where: { userId: this.idNguoiDung, isActive: true } });
    if (activePet) {
      const check = config.checkHuyetMachApChe(this.capDo, activePet.rarity);
      if (!check.allowed) {
        activePet.isActive = false;
        await activePet.save();
        activePet = null;
      }
    }
    return this.layChiSo(equippedInv, activePet);
  }

  layChiSo(equippedInvList = [], activePet = null) {
    if (activePet) {
      const check = config.checkHuyetMachApChe(this.capDo, activePet.rarity);
      if (!check.allowed) {
        activePet = null;
      }
    }
    const huongTu = this.huongTu || 'Phap Tu';
    const pathConfig = config.HUONG_DI[huongTu] || config.HUONG_DI['Phap Tu'];
    const baseStats = pathConfig.base_stats;
    const growth = pathConfig.growth;

    const capDo = this.capDo || 1;
    const lvlDiff = capDo - 1;

    const classHpMult = 1.0;
    const classMpMult = 1.0;

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
    let ne = 0.0; // Né tránh mặc định
    let lifesteal = 0.0; // Hút máu mặc định
    let speed = 100;

    // Lưu chỉ số nền của tu sĩ để tính phần trăm gia tăng từ các dòng chỉ số ngẫu nhiên
    const baseHpVal = maxHp;
    const baseMpVal = maxMp;
    const baseVatCongVal = vatCong;
    const basePhapCongVal = phapCong;
    const baseVatPhongVal = vatPhong;
    const basePhapPhongVal = phapPhong;
    const baseXuyenGiapVal = xuyenGiap;
    const baseSpeedVal = speed;

    // 2. Cộng chỉ số từ các trang bị đang mặc
    for (const eq of equippedInvList) {
      const item = eq.Item || eq.item || eq;
      if (!item) continue;

      // Chỉ số nền tĩnh từ item
      let staticStats = {};
      if (item.chiSoJson) {
        try {
          staticStats = JSON.parse(item.chiSoJson);
        } catch (e) {}
      } else if (item.chiSo) {
        staticStats = item.chiSo;
      }
      
      let equipQualityMult = 1.0;
      let dynamicStats = [];
      if (eq.dongChiSoJson) {
        try {
          const parsed = JSON.parse(eq.dongChiSoJson);
          if (Array.isArray(parsed)) {
            const meta = parsed.find(x => x && x.metadata);
            if (meta && meta.chiSoChinhMult !== undefined) {
              equipQualityMult = meta.chiSoChinhMult;
            }
            dynamicStats = parsed.filter(x => x && !x.metadata);
          }
        } catch (e) {}
      }

      const starMult = (1.0 + (eq.nangCapSao || 0) * 0.10) * equipQualityMult;
      if (staticStats.hp) maxHp += staticStats.hp * starMult;
      if (staticStats.mp) maxMp += staticStats.mp * starMult;
      if (staticStats.vat_cong) vatCong += staticStats.vat_cong * starMult;
      if (staticStats.phap_cong) phapCong += staticStats.phap_cong * starMult;
      if (staticStats.vat_phong) vatPhong += staticStats.vat_phong * starMult * 2;
      if (staticStats.phap_phong) phapPhong += staticStats.phap_phong * starMult * 2;
      if (staticStats.giap) giap += staticStats.giap * starMult;
      if (staticStats.xuyen_giap) xuyenGiap += staticStats.xuyen_giap * starMult;
      if (staticStats.crit_rate) critRate += staticStats.crit_rate * starMult;
      if (staticStats.crit_dmg) critDmg += staticStats.crit_dmg * starMult;
      if (staticStats.speed) speed += staticStats.speed * starMult;
      
      for (const line of dynamicStats) {
        const multVal = line.phanTram / 100;
        switch (line.thuocTinh) {
          case 'vat_cong':
            vatCong += baseVatCongVal * multVal;
            break;
          case 'phap_cong':
            phapCong += basePhapCongVal * multVal;
            break;
          case 'vat_phong':
            vatPhong += baseVatPhongVal * multVal * 2;
            break;
          case 'phap_phong':
            phapPhong += basePhapPhongVal * multVal * 2;
            break;
          case 'max_hp':
            maxHp += baseHpVal * multVal;
            break;
          case 'max_mp':
            maxMp += baseMpVal * multVal;
            break;
          case 'crit_rate':
            critRate += multVal;
            break;
          case 'crit_dmg':
            critDmg += multVal;
            break;
          case 'xuyen_giap':
            xuyenGiap += baseXuyenGiapVal * multVal;
            break;
          case 'ne':
            ne += multVal;
            break;
          case 'lifesteal':
            lifesteal += multVal;
            break;
          case 'speed':
            speed += baseSpeedVal * multVal;
            break;
          default:
            break;
        }
      }
    }

    // 3. Cộng hệ số linh căn
    const elements = this.linhCanList || [];
    for (const el of elements) {
      const bonus = config.NGUON_LINH_CAN[el];
      if (bonus) {
        if (bonus.hp_mult) maxHp *= bonus.hp_mult;
        if (bonus.mp_mult) maxMp *= bonus.mp_mult;
        if (bonus.atk_mult) {
          vatCong *= bonus.atk_mult;
          phapCong *= bonus.atk_mult;
        }
        if (bonus.def_mult) {
          vatPhong *= bonus.def_mult;
          phapPhong *= bonus.def_mult;
        }
        if (bonus.crit_dmg) critDmg += bonus.crit_dmg;
        if (bonus.crit_rate) critRate += bonus.crit_rate;
        if (bonus.speed_mult) speed *= bonus.speed_mult;
        if (bonus.ne) ne += bonus.ne;
        if (bonus.lifesteal) lifesteal += bonus.lifesteal;
      }
    }

    // Cộng hệ số Huyết Mạch
    const hm = this.huyetMach;
    if (hm) {
      if (hm === 'LongToc') {
        if (huongTu === 'Phap Tu') {
          maxMp *= 1.10;
          phapCong *= 1.10;
        } else {
          maxHp *= 1.10;
          vatCong *= 1.10;
        }
      } else if (hm === 'MaToc') {
        if (huongTu === 'Phap Tu') {
          phapCong *= 1.10;
        } else {
          vatCong *= 1.10;
        }
        critRate += 0.10;
      } else if (hm === 'TienToc') {
        maxHp *= 1.10;
        vatPhong *= 1.10;
        phapPhong *= 1.10;
      } else if (hm === 'NhanToc') {
        if (huongTu === 'Phap Tu') {
          maxMp *= 1.20;
        } else {
          maxHp *= 1.20;
        }
      } else if (hm === 'TinhLinh') {
        speed *= 1.20;
      }
    }

    // 4. Cộng sủng vật (Pet) nếu có xuất chiến
    if (activePet) {
      const template = config.PET_TEMPLATES[activePet.type];
      if (template) {
        const scale = (activePet.level || 1) * (activePet.tuChat || 100) / 100;
        const scalePct = 1.0 + (scale - 1.0) * 0.01;
        const totalEvolves = config.getPetTotalEvolves(activePet);
        const evoMult = Math.pow(1.05, totalEvolves);
        const isThan = template.group === 'than_thu';
        const groupMult = isThan ? 1.5 : 1.0;

        let extraEvoStatsBuff = 1.0;
        if (template.species === 'ky_lan') {
          const tienHoa = activePet.tienHoa || 0;
          let lkDmgMult = 0.50;
          for (let i = 1; i <= tienHoa; i++) {
            if (lkDmgMult < 1.0) {
              lkDmgMult = lkDmgMult * 1.05;
              if (lkDmgMult > 1.0) lkDmgMult = 1.0;
            } else {
              extraEvoStatsBuff += 0.05;
            }
          }
        }

        const petStats = config.getPetCurrentStats(activePet);
        for (const [key, val] of Object.entries(petStats)) {
          const finalVal = val * extraEvoStatsBuff;
          if (key === 'vat_cong') {
            vatCong += baseVatCongVal * finalVal * scale * evoMult * groupMult;
          } else if (key === 'phap_cong') {
            phapCong += basePhapCongVal * finalVal * scale * evoMult * groupMult;
          } else if (key === 'max_hp') {
            maxHp += baseHpVal * finalVal * scale * evoMult * groupMult;
          } else if (key === 'giap') {
            giap += baseStats.giap * finalVal * scale * evoMult * groupMult;
          } else if (key === 'ne') {
            ne += finalVal * scalePct * evoMult * groupMult;
          } else if (key === 'crit_rate') {
            critRate += finalVal * scalePct * evoMult * groupMult;
          } else if (key === 'crit_dmg') {
            critDmg += finalVal * scalePct * evoMult * groupMult;
          } else if (key === 'speed') {
            speed += baseSpeedVal * finalVal * scale * evoMult * groupMult;
          } else if (key === 'song_cong') {
            if (this.huongTu === 'The Tu') {
              vatCong += baseVatCongVal * finalVal * scale * evoMult * groupMult;
            } else {
              phapCong += basePhapCongVal * finalVal * scale * evoMult * groupMult;
            }
          }
        }
      }
    }

    // Phạt căn cơ do đột phá thất bại
    const phatHp = this.phatHp || 0.0;
    const phatMp = this.phatMp || 0.0;
    const phatVatCong = this.phatVatCong || 0.0;
    const phatPhapCong = this.phatPhapCong || 0.0;

    // Giới hạn né tránh và quy đổi né tránh dư thừa thành HP
    if (ne > 0.30) {
      const excessNe = ne - 0.30;
      maxHp = maxHp * (1.0 + excessNe * 0.1);
      ne = 0.30;
    }

    maxHp = Math.floor(maxHp * (1.0 - phatHp));
    maxMp = Math.floor(maxMp * (1.0 - phatMp));
    vatCong = Math.floor(vatCong * (1.0 - phatVatCong));
    phapCong = Math.floor(phapCong * (1.0 - phatPhapCong));

    return {
      max_hp: Math.max(1, Math.floor(maxHp)),
      max_mp: Math.max(1, Math.floor(maxMp)),
      vat_cong: Math.max(1, Math.floor(vatCong)),
      phap_cong: Math.max(1, Math.floor(phapCong)),
      vat_phong: Math.max(1, Math.floor(vatPhong)),
      phap_phong: Math.max(1, Math.floor(phapPhong)),
      giap: Math.max(0, Math.floor(giap)),
      xuyen_giap: Math.max(0, Math.floor(xuyenGiap)),
      crit_rate: Math.max(0.0, critRate),
      crit_dmg: Math.max(1.0, critDmg),
      ne: Math.max(0.0, ne),
      lifesteal: Math.max(0.0, lifesteal),
      speed: Math.max(1, Math.floor(speed))
    };
  }

  layHeSoTuLuyen(activePet = null) {
    if (activePet) {
      const check = config.checkHuyetMachApChe(this.capDo, activePet.rarity);
      if (!check.allowed) {
        activePet = null;
      }
    }
    const elements = this.linhCanList;
    const count = elements.length;

    // Hệ số phạt tốc độ tu luyện theo số lượng linh căn sở hữu
    // Người sở hữu càng nhiều linh căn, căn cơ càng tạp, tu tốc càng giảm
    // Công thức: mỗi linh căn thêm giảm đi 50% lượng giảm của bước trước (giảm lũy kế)
    //  1 linh căn: 0% phạt (hệ số 1.00)
    //  2 linh căn: -30%   (hệ số 0.70)
    //  3 linh căn: -45%   (hệ số 0.55)
    //  4 linh căn: -52.5% (hệ số 0.475)
    //  5 linh căn: -56.25%(hệ số 0.4375)
    const PHAT_DA_LINH_CAN = {
      1: 1.0,
      2: 0.70,
      3: 0.55,
      4: 0.475,
      5: 0.4375
    };
    let mult = PHAT_DA_LINH_CAN[count] ?? 0.4375;

    // Bonus tốc độ đặc thù của từng linh căn (áp dụng sau hệ số phạt)
    for (const el of elements) {
      const bonus = config.NGUON_LINH_CAN[el];
      if (bonus && bonus.tu_toc) {
        mult *= bonus.tu_toc;
      }
    }

    // Tốc độ tu luyện cộng thêm từ sủng vật Lôi Điệp (nếu có và xuất chiến)
    if (activePet) {
      const template = config.PET_TEMPLATES[activePet.type];
      if (template) {
        let tuTocVal = 0;
        if (activePet.fusedStats) {
          try {
            const stats = JSON.parse(activePet.fusedStats);
            if (stats && stats.tu_toc) {
              tuTocVal = stats.tu_toc;
            }
          } catch (e) {}
        } else if (template.species === 'loi_diep') {
          tuTocVal = template.statValue;
        }

        if (tuTocVal > 0) {
          const scale = (activePet.level || 1) * (activePet.tuChat || 100) / 100;
          const scalePct = 1.0 + (scale - 1.0) * 0.01;
          const totalEvolves = config.getPetTotalEvolves(activePet);
          const evoMult = Math.pow(1.05, totalEvolves);
          const groupMult = template.group === 'than_thu' ? 1.5 : 1.0;
          mult *= (1.0 + tuTocVal * scalePct * evoMult * groupMult);
        }
      }
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
    // Trọng thương (HP/MP về 10% giới hạn hiện tại)
    const stats = this.layChiSo();
    this.hp = Math.max(1, Math.floor(stats.max_hp * 0.10));
    this.mp = Math.max(1, Math.floor(stats.max_mp * 0.10));

    return [null, 0];
  }

  capNhatTheLucDaily() {
    const todayStr = new Date().toISOString().split('T')[0];
    if (this.lastResetTheLuc !== todayStr) {
      this.theLuc = this.theLucMax || 200;
      this.lastResetTheLuc = todayStr;
    }
  }

  async layRankTuVi() {
    const { Op } = await import('sequelize');
    const count = await TuSi.count({
      where: {
        [Op.or]: [
          { capDo: { [Op.gt]: this.capDo } },
          {
            capDo: this.capDo,
            linhLuc: { [Op.gt]: this.linhLuc }
          }
        ]
      }
    });
    return count + 1;
  }

  async layHeSoThienDao() {
    if (process.env.NODE_ENV === 'test') {
      return {
        name: "Thiên Đạo Phù Trì",
        desc: "Không áp dụng trong môi trường thử nghiệm.",
        expMult: 1.0,
        stoneMult: 1.0,
        rank: 1
      };
    }
    const rank = await this.layRankTuVi();
    const isTop3 = rank <= 3;
    return {
      name: isTop3 ? "Thiên Đạo Ban Tài" : "Thiên Đạo Cần Tu",
      desc: isTop3 ? "Khí vận đỉnh phong, gia tăng +20% Linh Thạch nhận được." : "Hậu tiến chấn hưng, gia tăng +30% Linh Lực nhận được.",
      expMult: isTop3 ? 1.0 : 1.3,
      stoneMult: isTop3 ? 1.2 : 1.0,
      rank: rank
    };
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
  huyetMach: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null,
    field: 'huyet_mach'
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
    defaultValue: 15000,
    field: 'hp'
  },
  mp: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 15000,
    field: 'mp'
  },
  linhThach: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
    field: 'linh_thach'
  },
  vnd: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 100000,
    field: 'vnd'
  },
  lastUseBinhTinhHai: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'last_use_binh_tinh_hai'
  },
  lastUseCanKhonDinh: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'last_use_can_khon_dinh'
  },
  canKhonDinhCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'can_khon_dinh_count'
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
  },
  theLuc: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 200,
    field: 'the_luc'
  },
  theLucMax: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 200,
    field: 'the_luc_max'
  },
  lastResetTheLuc: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'last_reset_theluc'
  },
  thoiGianAuto: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'thoi_gian_auto'
  },
  kichHoatAuto: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'kich_hoat_auto'
  },
  thongKeAutoJson: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '{}',
    field: 'thong_ke_auto_json'
  },
  equippedBackground: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null,
    field: 'equipped_background'
  },
  equippedAura: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null,
    field: 'equipped_aura'
  },
  equippedSkin: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null,
    field: 'equipped_skin'
  },
  duyenType: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
    field: 'duyen_type'
  },
  duyenUserId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    defaultValue: null,
    field: 'duyen_user_id'
  },
  congDuc: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'cong_duc'
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
