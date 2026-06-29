import { EmbedBuilder } from 'discord.js';
import * as config from '../config.js';

export const MAU_CANH_GIOI = {
  "Luyện Khí": 0x95a5a6,      // Xám
  "Trúc Cơ": 0x2ecc71,        // Xanh lá
  "Kim Đan": 0xf1c40f,        // Vàng kim
  "Nguyên Anh": 0x9b59b6,     // Tím hoàng gia
  "Hóa Thần": 0xe67e22,       // Cam
  "Phản Hư": 0x1abc9c,        // Xanh ngọc
  "Hợp Thể": 0x3498db,        // Xanh lam thiên giới
  "Đại Thừa": 0xe74c3c,       // Đỏ huyết
  "Tiên Nhân": 0xe74c3c,      // Đỏ thần thoại
};

export function layMauCanhGioi(realmName) {
  return MAU_CANH_GIOI[realmName] || 0x34495e;
}

export function taoThanhTienDo(hienTai, toiDa, doDai = 12) {
  if (toiDa <= 0) {
    return `[${'░'.repeat(doDai)}] 0%`;
  }
  const pct = Math.min(1.0, Math.max(0.0, hienTai / toiDa));
  const filled = Math.round(pct * doDai);
  const bar = '█'.repeat(filled) + '░'.repeat(doDai - filled);
  return `[\`${bar}\`] ${Math.floor(pct * 100)}%`;
}

export class BoTaoEmbed {
  static thongTin(tieuDe, moTa) {
    return new EmbedBuilder()
      .setTitle(tieuDe)
      .setDescription(moTa)
      .setColor(0x3498db)
      .setTimestamp()
      .setFooter({ text: "Thiên Đạo Tu Tiên RPG" });
  }

  static loi(moTa) {
    return new EmbedBuilder()
      .setTitle("⚠️ Nghiệp Chướng Ngăn Trở")
      .setDescription(moTa)
      .setColor(0xe74c3c)
      .setTimestamp()
      .setFooter({ text: "Thiên Đạo Tu Tiên RPG" });
  }

  static thanhCong(tieuDe, moTa) {
    return new EmbedBuilder()
      .setTitle(tieuDe)
      .setDescription(moTa)
      .setColor(0x2ecc71)
      .setTimestamp()
      .setFooter({ text: "Thiên Đạo Tu Tiên RPG" });
  }

  static hoSo(tuSi, user, chiSo) {
    const color = layMauCanhGioi(tuSi.canhGioi);
    const embed = new EmbedBuilder()
      .setTitle(`📜 Thẻ Tu Sĩ: ${tuSi.ten}`)
      .setColor(color)
      .setTimestamp()
      .setImage("https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600")
      .setFooter({ text: `ID Tu Sĩ: ${tuSi.idNguoiDung} • Thiết lập bởi Thiên Đạo` });

    if (user && typeof user.displayAvatarURL === 'function') {
      embed.setThumbnail(user.displayAvatarURL());
    }

    const pathName = config.HUONG_DI[tuSi.huongTu]?.name || 'Chưa rõ';

    embed.addFields(
      {
        name: "🥋 Căn Cơ & Hướng Đi",
        value: `• **Giới tính**: ${tuSi.gioiTinh}\n• **Hướng đi**: \`${pathName}\`\n• **Linh Căn**: ${tuSi.linhCan}`,
        inline: true
      },
      {
        name: "🏔️ Tu Vi Cảnh Giới",
        value: `• **Cảnh giới**: ${tuSi.canhGioi}\n• **Tiểu tầng**: ${tuSi.tang}\n• **Cấp độ**: ${tuSi.capDo}`,
        inline: true
      }
    );

    // Tiến độ tu vi
    const reqExp = config.layLinhLucYeuCau(tuSi.capDo);
    const progress = taoThanhTienDo(tuSi.linhLuc, reqExp);
    embed.addFields({
      name: "✨ Tu Vi Tiến Độ",
      value: `${progress} (${tuSi.linhLuc}/${reqExp} Linh Lực)`,
      inline: false
    });

    // Chỉ số cơ bản
    let hpDisplay = `❤️ **Máu (HP)**: ${tuSi.hp}/${chiSo.max_hp}`;
    if (tuSi.phatHp > 0) {
      hpDisplay += ` \`(-${Math.floor(tuSi.phatHp * 100)}% Căn cơ)\``;
    }

    let mpDisplay = `💙 **Linh Lực (MP)**: ${tuSi.mp}/${chiSo.max_mp}`;
    if (tuSi.phatMp > 0) {
      mpDisplay += ` \`(-${Math.floor(tuSi.phatMp * 100)}% Căn cơ)\``;
    }

    embed.addFields({
      name: "📊 Sinh Mệnh & Linh Năng",
      value: `${hpDisplay}\n${mpDisplay}\n• **Linh thạch**: ${tuSi.linhThach} 💎`,
      inline: false
    });

    // Chỉ số tấn công/phòng ngự
    embed.addFields(
      {
        name: "⚔️ Tấn Công",
        value: `• **Vật công**: ${chiSo.vat_cong}\n• **Pháp công**: ${chiSo.phap_cong}\n• **Bạo kích**: ${Math.floor(chiSo.crit_rate * 100)}%\n• **Bạo thương**: ${Math.floor(chiSo.crit_dmg * 100)}%`,
        inline: true
      },
      {
        name: "🛡️ Phòng Ngự",
        value: `• **Vật phòng**: ${chiSo.vat_phong}\n• **Pháp phòng**: ${chiSo.phap_phong}\n• **Giáp**: ${chiSo.giap}\n• **Xuyên giáp**: ${chiSo.xuyen_giap}`,
        inline: true
      }
    );

    return embed;
  }

  static canCo(tuSi) {
    const color = layMauCanhGioi(tuSi.canhGioi);
    const embed = new EmbedBuilder()
      .setTitle(`☯️ Căn Cơ Thiên Tư: ${tuSi.ten}`)
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: "Tu hành nghìn năm, căn cơ là gốc." });

    // Thuộc tính linh căn sở hữu
    const elements = tuSi.linhCanList;
    const descList = [];
    for (const el of elements) {
      const elInfo = config.NGUON_LINH_CAN[el];
      if (elInfo) {
        descList.push(`• **${elInfo.name}**: ${elInfo.desc}`);
      }
    }
    const elementsDesc = descList.length > 0 ? descList.join('\n') : "• Không có linh căn thụ động.";

    const pathInfo = config.HUONG_DI[tuSi.huongTu] || { name: "Chưa rõ", desc: "" };
    embed.addFields(
      {
        name: "🧬 Linh Căn Sở Hữu",
        value: `**${tuSi.linhCan}**\n${elementsDesc}`,
        inline: false
      },
      {
        name: "⚙️ Hệ Số Tăng Trưởng",
        value: `• **Tốc độ tu luyện**: x${tuSi.layHeSoTuLuyen().toFixed(1)}\n• **Hướng phát triển**: ${pathInfo.name} (${pathInfo.desc})`,
        inline: false
      }
    );

    // Tổn hại căn cơ do đột phá thất bại
    if (tuSi.phatHp > 0 || tuSi.phatMp > 0 || tuSi.phatVatCong > 0 || tuSi.phatPhapCong > 0) {
      const penalties = [];
      if (tuSi.phatHp > 0) {
        penalties.push(`• **Tổn thương HP cực đại**: -${Math.floor(tuSi.phatHp * 100)}%`);
      }
      if (tuSi.phatMp > 0) {
        penalties.push(`• **Tổn thương MP cực đại**: -${Math.floor(tuSi.phatMp * 100)}%`);
      }
      if (tuSi.phatVatCong > 0) {
        penalties.push(`• **Tổn thương Vật Công**: -${Math.floor(tuSi.phatVatCong * 100)}%`);
      }
      if (tuSi.phatPhapCong > 0) {
        penalties.push(`• **Tổn thương Pháp Công**: -${Math.floor(tuSi.phatPhapCong * 100)}%`);
      }
      embed.addFields({
        name: "🩹 Tổn Hại Căn Cơ (Do Đột Phá Thất Bại)",
        value: penalties.join('\n'),
        inline: false
      });
    } else {
      embed.addFields({
        name: "🩹 Trạng Thái Căn Cơ",
        value: "✨ Hoàn hảo không chút tổn hại.",
        inline: false
      });
    }

    return embed;
  }

  static tuVi(tuSi, thoiGianChoTuLuyen = null) {
    const color = layMauCanhGioi(tuSi.canhGioi);
    const embed = new EmbedBuilder()
      .setTitle(`🔮 Tu Vi Điểm Tính: ${tuSi.ten}`)
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: "Đường tu tiên dài đằng đẵng, kiên trì ắt thành công." });

    const reqExp = config.layLinhLucYeuCau(tuSi.capDo);
    const progress = taoThanhTienDo(tuSi.linhLuc, reqExp, 18);
    const breakthroughChance = config.layTiLeDotPha(tuSi.capDo);
    const { stageName } = config.layThongTinCanhGioi(tuSi.capDo);

    embed.addFields(
      {
        name: "📊 Cảnh Giới Hiện Tại",
        value: `✨ **${tuSi.canhGioi} - ${stageName}** (Cấp ${tuSi.capDo})`,
        inline: false
      },
      {
        name: "⚡ Linh Lực Tích Lũy",
        value: `${progress}\n\`${tuSi.linhLuc} / ${reqExp}\` Linh Lực`,
        inline: false
      }
    );

    // Dự kiến đột phá
    const isReady = tuSi.linhLuc >= reqExp;
    const statusTxt = isReady
      ? "🟢 Đã tích lũy đủ linh lực, có thể lập tức dùng `/dotpha`!"
      : `🔴 Cần thêm \`${reqExp - tuSi.linhLuc}\` linh lực để đột phá.`;

    embed.addFields({
      name: "⚔️ Dự Kiến Đột Phá",
      value: `• **Xác suất thành công**: \`${Math.floor(breakthroughChance * 100)}%\`\n• **Trạng thái**: ${statusTxt}`,
      inline: false
    });

    if (thoiGianChoTuLuyen) {
      const expirationDate = new Date(thoiGianChoTuLuyen.hetHan);
      const timeLeftMs = expirationDate.getTime() - Date.now();
      const secondsLeft = Math.max(0, Math.floor(timeLeftMs / 1000));
      const minutes = Math.floor(secondsLeft / 60);
      const seconds = secondsLeft % 60;

      embed.addFields({
        name: "🧘 Đang Thiền Định Tu Luyện",
        value: `• Thời gian còn lại: \`${minutes}m ${seconds}s\`\n• Đang hấp thu linh khí thiên địa...`,
        inline: false
      });
    }

    return embed;
  }
}
