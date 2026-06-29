import { TuSi } from '../models/TuSi.js';
import { ThoiGianCho } from '../models/ThoiGianCho.js';
import { CauHinhGuild } from '../models/CauHinhGuild.js';
import * as config from '../config.js';

export class BoDieuKhienGoc {
  async layTuSi(idNguoiDung) {
    return await TuSi.findByPk(idNguoiDung);
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
    // 1. Tìm bản ghi thời gian chờ tu luyện thủ công
    const thoiGianCho = await ThoiGianCho.findOne({
      where: {
        idNguoiDung: tuSi.idNguoiDung,
        hanhDong: 'cultivate'
      }
    });

    if (thoiGianCho) {
      const hetHanTime = new Date(thoiGianCho.hetHan).getTime();
      if (hetHanTime <= Date.now()) {
        // Đã tu luyện xong! Tiến hành phát thưởng
        const duLieu = thoiGianCho.duLieu || {};
        const daoNien = duLieu.dao_nien || 1;
        const totalDurationSeconds = daoNien * config.DAO_NIEN_SECONDS;
        const startTime = hetHanTime - totalDurationSeconds * 1000;

        let lastUpdate = duLieu.last_update;
        if (!lastUpdate) {
          lastUpdate = startTime;
        }

        // Tính toán phần thưởng còn lại chưa nhận
        const remainingMs = Math.max(0, hetHanTime - lastUpdate);
        const remainingSeconds = remainingMs / 1000;
        const remainingDaoNien = remainingSeconds / config.DAO_NIEN_SECONDS;

        // Tính toán linh lực & linh thạch nhận được
        const { CanhGioi } = await import('../models/CanhGioi.js');
        const cg = await CanhGioi.findByPk(tuSi.capDo);
        const tocDoCoBan = cg ? cg.tocDoCoBan : config.BASE_EXP_PER_DAO_NIEN;
        const multiplier = tuSi.layHeSoTuLuyen();
        const gainedExp = Math.floor(tocDoCoBan * multiplier * remainingDaoNien);
        const gainedStones = Math.floor(10 * tuSi.capDo * remainingDaoNien);

        // Cộng thưởng phần còn lại
        tuSi.linhLuc += gainedExp;
        tuSi.linhThach += gainedStones;

        // Hồi phục 20% máu/pháp lực cực đại mỗi Đạo Niên tu luyện
        const stats = tuSi.layChiSo();
        tuSi.hp = Math.min(stats.max_hp, tuSi.hp + Math.floor(stats.max_hp * 0.20 * remainingDaoNien));
        tuSi.mp = Math.min(stats.max_mp, tuSi.mp + Math.floor(stats.max_mp * 0.20 * remainingDaoNien));

        // Xóa thời gian chờ và lưu trạng thái
        await thoiGianCho.destroy();
        await tuSi.save();

        const totalGainedExp = Math.floor(tocDoCoBan * multiplier * daoNien);
        const totalGainedStones = Math.floor(10 * tuSi.capDo * daoNien);

        return { completed: true, exp: totalGainedExp, stones: totalGainedStones };
      }
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
