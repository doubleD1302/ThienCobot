import { TuSi } from '../models/TuSi.js';
import { ThoiGianCho } from '../models/ThoiGianCho.js';
import { CauHinhGuild } from '../models/CauHinhGuild.js';
import * as config from '../config.js';

export class BoDieuKhienGoc {
  async layTuSi(idNguoiDung) {
    const tuSi = await TuSi.findByPk(idNguoiDung);
    if (tuSi) {
      tuSi.capNhatTheLucDaily();
      await tuSi.save();
    }
    return tuSi;
  }

  async layHoacTaoCauHinhGuild(idGuild) {
    if (!idGuild) return null;
    let setting = await CauHinhGuild.findByPk(idGuild);
    if (!setting) {
      setting = await CauHinhGuild.create({ idGuild: idGuild });
    }
    return setting;
  }

  async kiemTraVaNhanTuVi(tuSi) {
    const now = Date.now();
    const lastUpdate = tuSi.lastUpdateTuVi ? new Date(tuSi.lastUpdateTuVi).getTime() : new Date(tuSi.created_at).getTime();
    const elapsedMs = now - lastUpdate;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);

    if (elapsedMinutes >= 1) {
      const { CanhGioi } = await import('../models/CanhGioi.js');
      const { Abode } = await import('../models/Abode.js');
      const { Pet } = await import('../models/Pet.js');

      const abode = await Abode.findByPk(tuSi.idNguoiDung);
      const lvDongPhu = abode ? abode.level : 0;
      const activePet = await Pet.findOne({ where: { userId: tuSi.idNguoiDung, isActive: true } });

      const cg = await CanhGioi.findByPk(tuSi.capDo);
      const tocDoCoBan = cg ? cg.tocDoCoBan : config.BASE_EXP_PER_DAO_NIEN;
      const multiplier = tuSi.layHeSoTuLuyen(activePet);
      const elapsedDaoNien = (elapsedMinutes * 60) / config.DAO_NIEN_SECONDS;

      // Cộng thêm tốc độ tu luyện từ Động Phủ: mỗi cấp tăng +100% (cấp 1 x2, cấp 10 x11)
      const speedMult = 1 + lvDongPhu;

      const thienDao = await tuSi.layHeSoThienDao();
      const rawExp = tocDoCoBan * multiplier * speedMult * elapsedDaoNien * thienDao.expMult + (tuSi.linhLucDu || 0.0);
      const rawStones = 10 * tuSi.capDo * elapsedDaoNien * thienDao.stoneMult + (tuSi.linhThachDu || 0.0);

      const gainedExp = Math.floor(rawExp);
      const gainedStones = Math.floor(rawStones);

      tuSi.linhLuc += gainedExp;
      tuSi.linhThach += gainedStones;

      tuSi.linhLucDu = rawExp - gainedExp;
      tuSi.linhThachDu = rawStones - gainedStones;

      tuSi.lastUpdateTuVi = new Date(lastUpdate + elapsedMinutes * 60000);

      // Hồi phục 20% hp/mp mỗi Đạo Niên tu luyện
      const stats = tuSi.layChiSo([], activePet);
      tuSi.hp = Math.min(stats.max_hp, tuSi.hp + Math.floor(stats.max_hp * 0.20 * elapsedDaoNien));
      tuSi.mp = Math.min(stats.max_mp, tuSi.mp + Math.floor(stats.max_mp * 0.20 * elapsedDaoNien));

      await tuSi.save();
      return { completed: true, exp: gainedExp, stones: gainedStones };
    }

    return { completed: false, exp: 0, stones: 0 };
  }

  async kiemTraThoiGianCho(idNguoiDung, hanhDong) {
    const thoiGianCho = await ThoiGianCho.findOne({
      where: {
        idNguoiDung: idNguoiDung,
        hanhDong: hanhDong
      }
    });

    if (thoiGianCho) {
      const hetHanTime = new Date(thoiGianCho.hetHan).getTime();
      if (hetHanTime > Date.now()) {
        return thoiGianCho;
      } else {
        // Hết hạn, xóa bản ghi
        await thoiGianCho.destroy();
      }
    }
    return null;
  }

  async datThoiGianCho(idNguoiDung, hanhDong, hetHan, duLieu = null) {
    let thoiGianCho = await ThoiGianCho.findOne({
      where: {
        idNguoiDung: idNguoiDung,
        hanhDong: hanhDong
      }
    });

    if (!thoiGianCho) {
      thoiGianCho = ThoiGianCho.build({
        idNguoiDung: idNguoiDung,
        hanhDong: hanhDong
      });
    }

    thoiGianCho.hetHan = hetHan;
    if (duLieu !== null) {
      thoiGianCho.duLieu = duLieu;
    }

    await thoiGianCho.save();
    return thoiGianCho;
  }

  async xoaThoiGianCho(idNguoiDung, hanhDong) {
    const thoiGianCho = await ThoiGianCho.findOne({
      where: {
        idNguoiDung: idNguoiDung,
        hanhDong: hanhDong
      }
    });

    if (thoiGianCho) {
      await thoiGianCho.destroy();
    }
  }
}
