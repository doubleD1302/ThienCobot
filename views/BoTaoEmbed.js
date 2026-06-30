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
    return `[${'▱'.repeat(doDai)}] 0%`;
  }
  const pct = Math.min(1.0, Math.max(0.0, hienTai / toiDa));
  const filled = Math.round(pct * doDai);
  const bar = '▰'.repeat(filled) + '▱'.repeat(doDai - filled);
  return `[ \`${bar}\` ] **${Math.floor(pct * 100)}%**`;
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
      .setTitle("👹 Nghiệp Chướng Ngăn Trở")
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

  static hoSo(tuSi, user, chiSo, daoNien = null, tocDoTuLuyen = 100, reqExp = null) {
    const color = layMauCanhGioi(tuSi.canhGioi);
    const embed = new EmbedBuilder()
      .setTitle(`📜 Tiên Phả Tu Sĩ: ${tuSi.ten}`)
      .setColor(color)
      .setTimestamp()
      .setImage("https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600");

    if (daoNien !== null) {
      embed.setDescription(`🌌 **Đạo Niên thứ ${daoNien} của Máy Chủ**`);
    }

    embed.setFooter({ text: `Mã số định danh: ${tuSi.idNguoiDung} • Thiên Cơ Đại Lục` });

    if (user && typeof user.displayAvatarURL === 'function') {
      embed.setThumbnail(user.displayAvatarURL());
    }

    const pathName = config.HUONG_DI[tuSi.huongTu]?.name || 'Chưa rõ';

    embed.addFields(
      {
        name: "☯️ Linh Căn & Đạo Pháp",
        value: `• **Giới tính**: ${tuSi.gioiTinh}\n• **Học thuyết**: \`${pathName}\`\n• **Linh căn**: \`${tuSi.linhCan}\`\n• **Tu luyện tốc độ**: \`+${tocDoTuLuyen}\` Linh lực/Đạo Niên ⚡`,
        inline: true
      },
      {
        name: "🏔️ Cảnh Giới Huyền Môn",
        value: `• **Cảnh giới**: \`${tuSi.canhGioi}\`\n• **Tiểu tầng**: \`Tầng ${tuSi.tang}\`\n• **Tu vi cấp**: \`Cấp ${tuSi.capDo}\``,
        inline: true
      }
    );

    // Tiến độ tu vi
    const targetReqExp = reqExp !== null ? reqExp : config.layLinhLucYeuCau(tuSi.capDo);
    const progress = taoThanhTienDo(tuSi.linhLuc, targetReqExp);
    embed.addFields({
      name: "🌌 Tu Vi Tiến Độ",
      value: `${progress} (\`${tuSi.linhLuc} / ${targetReqExp}\` Linh Lực)`,
      inline: false
    });

    // Chỉ số cơ bản
    let hpDisplay = `🩸 **Khí Huyết (HP)**: \`${tuSi.hp} / ${chiSo.max_hp}\``;
    if (tuSi.phatHp > 0) {
      hpDisplay += ` \`(-${Math.floor(tuSi.phatHp * 100)}% Căn cơ)\``;
    }

    let mpDisplay = `🌀 **Thần Thức (MP)**: \`${tuSi.mp} / ${chiSo.max_mp}\``;
    if (tuSi.phatMp > 0) {
      mpDisplay += ` \`(-${Math.floor(tuSi.phatMp * 100)}% Căn cơ)\``;
    }

    embed.addFields({
      name: "🩺 Khí Huyết & Thần Thức",
      value: `${hpDisplay}\n${mpDisplay}\n• **Linh thạch tích trữ**: \`${tuSi.linhThach}\` 🪙`,
      inline: false
    });

    // Chỉ số tấn công/phòng ngự
    embed.addFields(
      {
        name: "⚔️ Sát Thương",
        value: `• **Vật công**: \`${chiSo.vat_cong}\`\n• **Pháp công**: \`${chiSo.phap_cong}\`\n• **Bạo kích**: \`${Math.floor(chiSo.crit_rate * 100)}%\`\n• **Bạo thương**: \`${Math.floor(chiSo.crit_dmg * 100)}%\``,
        inline: true
      },
      {
        name: "🛡️ Thần Phòng",
        value: `• **Vật phòng**: \`${chiSo.vat_phong}\`\n• **Pháp phòng**: \`${chiSo.phap_phong}\`\n• **Hộ giáp**: \`${chiSo.giap}\`\n• **Xuyên giáp**: \`${chiSo.xuyen_giap}\``,
        inline: true
      }
    );

    return embed;
  }

  static canCo(tuSi, daoNien = null) {
    const color = layMauCanhGioi(tuSi.canhGioi);
    const embed = new EmbedBuilder()
      .setTitle(`🧬 Tiên Thiên Căn Cơ: ${tuSi.ten}`)
      .setColor(color)
      .setTimestamp();

    if (daoNien !== null) {
      embed.setDescription(`🌌 **Đạo Niên thứ ${daoNien} của Máy Chủ**`);
    }

    embed.setFooter({ text: "Tu hành vạn载, căn cơ lập bản." });

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
        name: "🌱 Linh Căn Bản Mệnh",
        value: `**${tuSi.linhCan}**\n${elementsDesc}`,
        inline: false
      },
      {
        name: "⚡ Tu Luyện Tinh Hoa",
        value: `• **Hệ số hấp thu**: \`x${tuSi.layHeSoTuLuyen().toFixed(1)}\`\n• **Đạo thống truyền thừa**: \`${pathInfo.name}\` (${pathInfo.desc})`,
        inline: false
      }
    );

    // Tổn hại căn cơ do đột phá thất bại
    if (tuSi.phatHp > 0 || tuSi.phatMp > 0 || tuSi.phatVatCong > 0 || tuSi.phatPhapCong > 0) {
      const penalties = [];
      if (tuSi.phatHp > 0) {
        penalties.push(`• **Tổn thương HP cực đại**: \`-${Math.floor(tuSi.phatHp * 100)}%\``);
      }
      if (tuSi.phatMp > 0) {
        penalties.push(`• **Tổn thương MP cực đại**: \`-${Math.floor(tuSi.phatMp * 100)}%\``);
      }
      if (tuSi.phatVatCong > 0) {
        penalties.push(`• **Tổn thương Vật Công**: \`-${Math.floor(tuSi.phatVatCong * 100)}%\``);
      }
      if (tuSi.phatPhapCong > 0) {
        penalties.push(`• **Tổn thương Pháp Công**: \`-${Math.floor(tuSi.phatPhapCong * 100)}%\``);
      }
      embed.addFields({
        name: "💔 Tổn Hại Căn Cơ (Đột Phá Thất Bại)",
        value: penalties.join('\n'),
        inline: false
      });
    } else {
      embed.addFields({
        name: "✨ Trạng Thái Căn Cơ",
        value: "🟢 Hoàn hảo vô khuyết, căn cơ vững vàng.",
        inline: false
      });
    }

    return embed;
  }

  static tuVi(tuSi, thoiGianChoTuLuyen = null, daoNien = null, reqExp = null, tocDoTuLuyen = 100) {
    const color = layMauCanhGioi(tuSi.canhGioi);
    const embed = new EmbedBuilder()
      .setTitle(`🔮 Tiên Cảnh Quy Nguyên: ${tuSi.ten}`)
      .setColor(color)
      .setTimestamp();

    if (daoNien !== null) {
      embed.setDescription(`🌌 **Đạo Niên thứ ${daoNien} của Máy Chủ**`);
    }

    embed.setFooter({ text: "Đường tu tiên dài đằng đẵng, kiên trì ắt thành công." });

    const targetReqExp = reqExp !== null ? reqExp : config.layLinhLucYeuCau(tuSi.capDo);
    const progress = taoThanhTienDo(tuSi.linhLuc, targetReqExp, 18);
    const breakthroughChance = config.layTiLeDotPha(tuSi.capDo);
    const { stageName } = config.layThongTinCanhGioi(tuSi.capDo);

    embed.addFields(
      {
        name: "🏔️ Hiện Tại Cảnh Giới",
        value: `✨ **${tuSi.canhGioi} - ${stageName}** (Cấp ${tuSi.capDo})`,
        inline: false
      },
      {
        name: "🌀 Khí Hải Tích Lũy",
        value: `${progress}\n\`${tuSi.linhLuc} / ${targetReqExp}\` Linh Lực`,
        inline: false
      }
    );

    // Dự kiến đột phá
    const isReady = tuSi.linhLuc >= targetReqExp;
    const statusTxt = isReady
      ? "🟢 Cực hạn viên mãn, có thể lập tức dùng `/dotpha`!"
      : `🔴 Cần tích lũy thêm \`${targetReqExp - tuSi.linhLuc}\` Linh Lực để đột phá.`;

    embed.addFields({
      name: "☯️ Cơ Duyên Đột Phá",
      value: `• **Tỷ lệ thành công**: \`${Math.floor(breakthroughChance * 100)}%\`\n• **Mệnh số trạng thái**: ${statusTxt}\n• **Tốc độ tu luyện**: \`+${tocDoTuLuyen}\` Linh Lực/Đạo Niên (~\`+${(tocDoTuLuyen * 60 / config.DAO_NIEN_SECONDS).toFixed(1)}\` Linh Lực/phút) ⚡`,
      inline: false
    });

    return embed;
  }

  static thongBaoTuLuyenXong(tuSi, daoNien, exp, stones) {
    return new EmbedBuilder()
      .setTitle("🧘 Đại Chu Thiên Hoàn Tất 🧘")
      .setDescription(
        `🌌 **Vào Đạo Niên thứ ${daoNien} của Máy Chủ**\n\n` +
        `Đạo hữu **${tuSi.ten}** đã từ trong tĩnh tọa tỉnh lại, linh khí xung quanh dần tiêu tán.\n` +
        `Nhờ kiên trì thiền định, đạo hữu nhận được:\n` +
        `• **Linh lực tích lũy**: \`+${exp}\` ✨\n` +
        `• **Linh thạch bổ sung**: \`+${stones}\` 🪙`
      )
      .setColor(0x2ecc71)
      .setTimestamp()
      .setFooter({ text: "Chúc đạo hữu sớm ngày đắc đạo thành tiên!" });
  }

  static loiBaoTriHosting() {
    return new EmbedBuilder()
      .setTitle("🌌 Thiên Đạo Trầm Luân - Bí Cảnh Đóng Cửa")
      .setDescription(
        `⚡ **Thiên Địa Biến Động**: Linh khí chấn động, kết giới giữa nhân giới và bí cảnh tạm thời bị đứt gãy!\n\n` +
        `🌀 **Thiên Đạo Thông Báo**: Kết nối đến linh mạch (Hosting/Database) đã bị gián đoạn. Thiên giới đang tiến hành chữa trị vết nứt không gian (Bảo trì/Cập nhật).\n\n` +
        `🧘 **Khuyên Bảo**: Chư vị đạo hữu vui lòng tĩnh tọa thiền định, dưỡng tinh thần để đợi thông đạo mở lại. Cảm ơn đạo hữu đã kiên nhẫn cảm thông!`
      )
      .setColor(0xe74c3c)
      .setTimestamp()
      .setFooter({ text: "Thiên Thiên Cáo Thị • Vui lòng thử lại sau" });
  }
}

