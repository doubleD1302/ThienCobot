import { TuSi } from '../models/TuSi.js';
import { ThoiGianCho } from '../models/ThoiGianCho.js';

export class BoDieuKhienGoc {
  async layTuSi(idNguoiDung) {
    return await TuSi.findByPk(idNguoiDung);
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
