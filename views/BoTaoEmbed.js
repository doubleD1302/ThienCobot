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

  static hoSo(tuSi, user, chiSo, daoNien = null, tocDoTuLuyen = 100, reqExp = null, equippedItems = []) {
    const color = layMauCanhGioi(tuSi.canhGioi);
    const isThienDao = String(tuSi.idNguoiDung) === '541474154130571264';
    const titleText = isThienDao ? `🌌 Thiên Đạo Vô Thượng: ${tuSi.ten} 🌌` : `📜 Tiên Phả Tu Sĩ: ${tuSi.ten}`;
    
    const embed = new EmbedBuilder()
      .setTitle(titleText)
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
        value: `• **Giới tính**: ${tuSi.gioiTinh}\n` +
               (isThienDao ? `• **Danh hiệu**: \`Thiên Đạo\` 🌌\n` : '') +
               `• **Học thuyết**: \`${pathName}\`\n• **Linh căn**: \`${tuSi.linhCan}\`\n• **Tu luyện tốc độ**: \`+${tocDoTuLuyen}\` Linh lực/Đạo Niên ⚡`,
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
      value: `${hpDisplay}\n${mpDisplay}\n• **Thể lực**: \`${tuSi.theLuc || 0} / ${tuSi.theLucMax || 200}\` 🔋\n• **Linh thạch tích trữ**: \`${tuSi.linhThach.toLocaleString()}\` 🪙\n• **Số dư VND**: \`${(tuSi.vnd || 0).toLocaleString()}\` 💵`,
      inline: false
    });

    // Chỉ số tấn công/phòng ngự
    let combatStatsText = `• **Vật công**: \`${chiSo.vat_cong}\` | **Pháp công**: \`${chiSo.phap_cong}\`\n` +
      `• **Bạo kích**: \`${Math.floor(chiSo.crit_rate * 100)}%\` | **Bạo thương**: \`${Math.floor(chiSo.crit_dmg * 100)}%\`\n` +
      `• **Né tránh**: \`${Math.floor((chiSo.ne || 0) * 100)}%\` | **Hút máu**: \`${Math.floor((chiSo.lifesteal || 0) * 100)}%\``;

    embed.addFields(
      {
        name: "⚔️ Sát Thương & Chỉ số động",
        value: combatStatsText,
        inline: true
      },
      {
        name: "🛡️ Thần Phòng",
        value: `• **Vật phòng**: \`${chiSo.vat_phong}\`\n• **Pháp phòng**: \`${chiSo.phap_phong}\`\n• **Hộ giáp**: \`${chiSo.giap}\`\n• **Xuyên giáp**: \`${chiSo.xuyen_giap}\``,
        inline: true
      }
    );

    // 12 ô trang bị đang mặc (kể cả ô trống)
    const weapons = equippedItems.filter(x => x.detail.loai === 'Vũ khí');
    const armors = equippedItems.filter(x => x.detail.loai === 'Giáp');
    const ornaments = equippedItems.filter(x => x.detail.loai === 'Ngọc Bội');
    const activeTreasures = equippedItems.filter(x => x.detail.loai === 'Cổ Bảo Chủ Động');
    const dharmaTreasures = equippedItems.filter(x => x.detail.loai === 'Pháp Bảo');

    const weaponText = weapons[0] ? `**${weapons[0].detail.ten}**${weapons[0].eq.nangCapSao > 0 ? ` (+${weapons[0].eq.nangCapSao}⭐)` : ''}` : `*[Trống]*`;
    const armorText = armors[0] ? `**${armors[0].detail.ten}**${armors[0].eq.nangCapSao > 0 ? ` (+${armors[0].eq.nangCapSao}⭐)` : ''}` : `*[Trống]*`;
    const ornamentText = ornaments[0] ? `**${ornaments[0].detail.ten}**${ornaments[0].eq.nangCapSao > 0 ? ` (+${ornaments[0].eq.nangCapSao}⭐)` : ''}` : `*[Trống]*`;

    const cb1 = activeTreasures[0] ? `**${activeTreasures[0].detail.ten}**` : `*[Trống]*`;
    const cb2 = activeTreasures[1] ? `**${activeTreasures[1].detail.ten}**` : `*[Trống]*`;
    const cb3 = activeTreasures[2] ? `**${activeTreasures[2].detail.ten}**` : `*[Trống]*`;

    const pb1 = dharmaTreasures[0] ? `**${dharmaTreasures[0].detail.ten}**` : `*[Trống]*`;
    const pb2 = dharmaTreasures[1] ? `**${dharmaTreasures[1].detail.ten}**` : `*[Trống]*`;
    const pb3 = dharmaTreasures[2] ? `**${dharmaTreasures[2].detail.ten}**` : `*[Trống]*`;
    const pb4 = dharmaTreasures[3] ? `**${dharmaTreasures[3].detail.ten}**` : `*[Trống]*`;
    const pb5 = dharmaTreasures[4] ? `**${dharmaTreasures[4].detail.ten}**` : `*[Trống]*`;
    const pb6 = dharmaTreasures[5] ? `**${dharmaTreasures[5].detail.ten}**` : `*[Trống]*`;

    embed.addFields({
      name: "🛡️ 12 Ô Trang Bị Trên Người",
      value: `• 🗡️ **Vũ Khí**: ${weaponText}\n` +
        `• 🥋 **Giáp**: ${armorText}\n` +
        `• 🔮 **Ngọc Bội**: ${ornamentText}\n` +
        `• 🏺 **Cổ Bảo**: 1. ${cb1} | 2. ${cb2} | 3. ${cb3}\n` +
        `• 📿 **Pháp Bảo**: 1. ${pb1} | 2. ${pb2} | 3. ${pb3} | 4. ${pb4} | 5. ${pb5} | 6. ${pb6}`,
      inline: false
    });

    return embed;
  }

  static canCo(tuSi, daoNien = null, lvDongPhu = 0) {
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
    const absorptionCoef = tuSi.layHeSoTuLuyen() * (1 + lvDongPhu);
    embed.addFields(
      {
        name: "🌱 Linh Căn Bản Mệnh",
        value: `**${tuSi.linhCan}**\n${elementsDesc}`,
        inline: false
      },
      {
        name: "⚡ Tu Luyện Tinh Hoa",
        value: `• **Hệ số hấp thu**: \`x${absorptionCoef.toFixed(1)}\`\n• **Đạo thống truyền thừa**: \`${pathInfo.name}\` (${pathInfo.desc})`,
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

  // Helper: format dòng chỉ số phụ (đồng chỉ số) dạng inline rút gọn
  static _formatDongChiSo(dongChiSoJson) {
    if (!dongChiSoJson) return '';
    try {
      const lines = JSON.parse(dongChiSoJson);
      if (!Array.isArray(lines) || lines.length === 0) return '';
      const colorEmojis = { cam: '🟠', tim: '🟣', xanh: '🔵', luc: '🟢', trang: '⚪' };
      const formattedParts = lines.map(line => {
        const emoji = colorEmojis[line.mau] || '⚪';
        const sign = line.phanTram >= 0 ? '+' : '';
        return `${emoji} *${line.ten}* \`${sign}${line.phanTram}%\``;
      });
      return '\n  ↳ ' + formattedParts.join(' · ');
    } catch (e) { return ''; }
  }

  // Helper: phân loại và format từng dòng vật phẩm
  static _phanLoaiItems(itemsList) {
    const trangBi = [], coBaoPhapBao = [], danDuoc = [], linhThao = [];

    for (const itemObj of itemsList) {
      const { item, soLuong, trangBi: isEquipped, nangCapSao, invId, khoa, dongChiSoJson } = itemObj;
      const starText = nangCapSao > 0 ? ` (+${nangCapSao}⭐)` : '';
      const equipText = isEquipped ? ' 🛡️ **[Đang mặc]**' : '';
      const lockText = khoa ? ' 🔒' : '';

      let pillQualityText = '';
      if (item.id.startsWith('dan_dot_pha_') && dongChiSoJson) {
        try {
          const pillData = JSON.parse(dongChiSoJson);
          if (pillData && pillData.phamChat) {
            pillQualityText = ` (${pillData.phamChat} +${pillData.phanTramHoTro}%)`;
          }
        } catch (e) {}
      }

      let reqText = '';
      if (item.yeuCauCanhGioi && item.yeuCauCanhGioi > 1) {
        const cgReq = config.layThongTinCanhGioi(item.yeuCauCanhGioi);
        reqText = ` 🔒 **${cgReq.realmName}**`;
      }

      // Sử dụng mã ID duy nhất của dòng vật phẩm trong balo để phân biệt các trang bị trùng tên
      const formattedLine = `• **${item.ten}**${pillQualityText}${starText}${equipText}${lockText} x${soLuong}${reqText} | Mã: \`#${invId}\``;

      if (['Vũ khí', 'Giáp', 'Ngọc Bội'].includes(item.loai)) trangBi.push(formattedLine);
      else if (['Cổ Bảo Chủ Động', 'Pháp Bảo'].includes(item.loai)) coBaoPhapBao.push(formattedLine);
      else if (item.loai === 'Đan dược') danDuoc.push(formattedLine);
      else linhThao.push(formattedLine);
    }
    return { trangBi, coBaoPhapBao, danDuoc, linhThao };
  }

  // Helper: tạo nội dung description an toàn cho 1 sheet, chia trang nếu cần
  static _buildSheetPages(lines, emptyMsg, limit = 3800) {
    if (lines.length === 0) return [emptyMsg];
    const pages = [];
    let current = '';
    for (const line of lines) {
      const add = (current ? '\n' : '') + line;
      if ((current + add).length > limit) {
        pages.push(current);
        current = line;
      } else {
        current += add;
      }
    }
    if (current) pages.push(current);
    return pages;
  }

  /**
   * Trả về mảng 4 sheet embeds (Trang Bị / Cổ Bảo / Đan Dược / Linh Thảo).
   * Mỗi phần tử là { value, label, emoji, description, pages: [EmbedBuilder] }.
   */
  static baloSheets(tuSi, itemsList = []) {
    const { trangBi, coBaoPhapBao, danDuoc, linhThao } = BoTaoEmbed._phanLoaiItems(itemsList);
    const baseDesc = `> 💎 **Linh thạch**: \`${tuSi.linhThach}\`  |  📦 **Tổng vật phẩm**: \`${itemsList.length}\``;
    const color = layMauCanhGioi(tuSi.canhGioi);

    const buildPages = (lines, emptyMsg, sheetName, emoji) => {
      const pageContents = BoTaoEmbed._buildSheetPages(lines, emptyMsg);
      return pageContents.map((content, i) => {
        const totalPages = pageContents.length;
        return new EmbedBuilder()
          .setTitle(`🎒 Túi Trữ Vật: ${tuSi.ten}`)
          .setColor(color)
          .setDescription(
            `${baseDesc}\n\n` +
            `**${emoji} ${sheetName}**${totalPages > 1 ? ` — Trang ${i + 1}/${totalPages}` : ''}\n` +
            `${'─'.repeat(36)}\n${content}`
          )
          .setTimestamp()
          .setFooter({ text: `📋 Sheet: ${sheetName}${totalPages > 1 ? ` (${i + 1}/${totalPages})` : ''} • Thiên Đạo Tu Tiên RPG` });
      });
    };

    return [
      {
        value: 'trangbi',
        label: 'Trang Bị',
        emoji: '🛡️',
        description: `${trangBi.length} vật phẩm`,
        pages: buildPages(trangBi, '• Túi đồ trống rỗng, chưa có trang bị nào.', 'Nhóm Trang Bị', '🛡️')
      },
      {
        value: 'cobao',
        label: 'Cổ Bảo & Pháp Bảo',
        emoji: '📿',
        description: `${coBaoPhapBao.length} vật phẩm`,
        pages: buildPages(coBaoPhapBao, '• Chưa sở hữu Cổ Bảo hay Pháp Bảo nào.', 'Cổ Bảo & Pháp Bảo', '📿')
      },
      {
        value: 'danduo',
        label: 'Đan Dược',
        emoji: '💊',
        description: `${danDuoc.length} vật phẩm`,
        pages: buildPages(danDuoc, '• Không có Đan Dược nào trong túi.', 'Linh Đan Diệu Dược', '💊')
      },
      {
        value: 'linhthao',
        label: 'Linh Thảo & Vật Liệu',
        emoji: '🌱',
        description: `${linhThao.length} vật phẩm`,
        pages: buildPages(linhThao, '• Không có Linh Thảo hay Vật Liệu nào.', 'Linh Thảo & Vật Liệu', '🌱')
      }
    ];
  }

  // Wrapper cũ để không break nơi khác (nếu có)
  static balo(tuSi, itemsList = []) {
    return BoTaoEmbed.baloSheets(tuSi, itemsList)[0].pages[0];
  }



  static kyNang(tuSi, playerSkills = [], availableSkills = []) {
    const embed = new EmbedBuilder()
      .setTitle(`📖 Tàng Kinh Các: ${tuSi.ten}`)
      .setDescription(`Hướng tu luyện: **${tuSi.huongTu || 'Pháp Tu'}**`)
      .setColor(0x9b59b6)
      .setTimestamp()
      .setFooter({ text: "Đạt đủ cảnh giới yêu cầu để lĩnh hội kỹ năng mới." });

    const learnedLines = [];
    for (const psk of playerSkills) {
      const trangBiText = psk.trangBi ? '`[Đã Lắp ⚔️]` ' : '`[Chưa Lắp]` ';
      learnedLines.push(
        `• ${trangBiText}**${psk.ten} (Cấp ${psk.capDo})**\n` +
        `  *Sát thương*: \`${psk.satThuong}%\` | *Hồi chiêu*: \`${psk.cooldown}s\`\n` +
        `  *Mô tả*: _${psk.moTa}_`
      );
    }

    const availableLines = [];
    for (const sk of availableSkills) {
      const { stageName } = config.layThongTinCanhGioi(sk.yeuCauCanhGioi);
      const reqExp = config.layLinhLucYeuCau(sk.yeuCauCanhGioi);
      const cost = Math.min(100000000, Math.floor(reqExp / 100));
      availableLines.push(
        `• **${sk.ten}** (Yêu cầu: **${stageName}** · Phí: \`${cost.toLocaleString()}\` 🪙)\n` +
        `  *Sát thương*: \`${sk.satThuong}%\` | *Hồi chiêu*: \`${sk.cooldown}s\` | ID: \`${sk.id}\`\n` +
        `  *Mô tả*: _${sk.moTa}_`
      );
    }

    const buildSafeValue = (lines, emptyFallback) => {
      if (lines.length === 0) return emptyFallback;
      let result = '';
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const suffix = `*... và còn ${lines.length - i} kỹ năng khác.*`;
        if (result.length + line.length + suffix.length + (result ? 1 : 0) > 1000) {
          result += (result ? '\n' : '') + suffix;
          break;
        }
        result += (result ? '\n' : '') + line;
      }
      return result;
    };

    embed.addFields(
      {
        name: "🥋 Kỹ Năng Đã Lĩnh Hội",
        value: buildSafeValue(learnedLines, "• Chưa học kỹ năng nào. Hãy sử dụng nút để học kỹ năng cơ bản!"),
        inline: false
      },
      {
        name: "📖 Kỹ Năng Có Thể Lĩnh Hội",
        value: buildSafeValue(availableLines, "• Không có kỹ năng nào khả dụng tại cảnh giới này."),
        inline: false
      }
    );

    return embed;
  }

  static tranDauBiCanh(tuSi, dungeon, battleLogs, isWin, gainedExp, gainedStones, droppedItem = null, droppedSeed = null, thienDao = null, droppedCoDuyenLenh = false, droppedBreakthrough = null, droppedVanYeuQua = null, droppedEgg = null) {
    const color = isWin ? 0x2ecc71 : 0xe74c3c;
    const title = isWin ? `🎉 Khiêu Chiến Thành Công: ${dungeon.ten} 🎉` : `💀 Khiêu Chiến Thất Bại: ${dungeon.ten} 💀`;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(`Trận chiến diễn ra quyết liệt giữa **${tuSi.ten}** và **${dungeon.quaiVat.ten}**...`)
      .setColor(color)
      .setTimestamp();

    // Giới hạn log chiến đấu tối đa để tránh vượt quá limit 1024 ký tự của Discord field
    const displayLogs = battleLogs.length > 8 ? battleLogs.slice(-8) : battleLogs;
    let logsText = '';
    for (let i = displayLogs.length - 1; i >= 0; i--) {
      const line = displayLogs[i];
      const nextText = (logsText ? '\n' : '') + line;
      if (logsText.length + nextText.length > 1000) {
        logsText = '...\n' + logsText;
        break;
      }
      logsText = line + (logsText ? '\n' + logsText : '');
    }
    if (!logsText) logsText = 'Trận đấu diễn ra quá nhanh...';

    embed.addFields({
      name: "⚔️ Diễn Biến Trận Đánh",
      value: logsText,
      inline: false
    });

    if (isWin) {
      let rewardText = `• **Linh lực nhận được**: \`+${gainedExp}\` ✨\n• **Linh thạch nhận được**: \`+${gainedStones}\` 💎`;
      if (droppedItem) {
        rewardText += `\n• **Vật phẩm rớt ra**: **${droppedItem.ten}** 🎁`;
      }
      if (droppedSeed) {
        rewardText += `\n• **Hạt giống nhặt được**: **${droppedSeed.ten}** 🌰`;
      }
      if (droppedBreakthrough) {
        rewardText += `\n• **Phá cảnh phẩm**: **${droppedBreakthrough.ten}** 🔮`;
      }
      if (droppedCoDuyenLenh) {
        rewardText += `\n• **Cơ duyên nhặt được**: **Cơ Duyên Lệnh 🎫** x1`;
      }
      if (droppedVanYeuQua) {
        rewardText += `\n• **Linh quả nhặt được**: **${droppedVanYeuQua.ten}** 🍎`;
      }
      if (droppedEgg) {
        rewardText += `\n• **Linh thú trứng**: **${droppedEgg.ten}** 🥚`;
      }
      if (thienDao && (thienDao.expMult > 1.0 || thienDao.stoneMult > 1.0)) {
        rewardText += `\n• **Phù trì**: **${thienDao.name}** (${thienDao.expMult > 1.0 ? '+' + Math.floor((thienDao.expMult - 1) * 100) + '% Tu Vi' : '+' + Math.floor((thienDao.stoneMult - 1) * 100) + '% Linh Thạch'})`;
      }
      rewardText += `\n• **Tiêu hao thể lực**: \`-1\` 🔋 (Còn lại: \`${tuSi.theLuc}/${tuSi.theLucMax}\` 🔋)`;
      embed.addFields({
        name: "🎁 Chiến Lợi Phẩm",
        value: rewardText,
        inline: false
      });
    } else {
      embed.addFields({
        name: "⚠️ Tổn Thất Căn Cơ",
        value: `• Đạo hữu bị yêu thú đả thương nghiêm trọng, máu (HP) bị suy giảm về mức cực thấp (-30% HP tối đa).\n• Vui lòng dùng lệnh \`/nghi\` để tĩnh dưỡng hồi phục!\n• **Tiêu hao thể lực**: \`-1\` 🔋 (Còn lại: \`${tuSi.theLuc}/${tuSi.theLucMax}\` 🔋)`,
        inline: false
      });
    }

    return embed;
  }

  static chiTietVatPham(tuSi, itemObj) {
    const { item, nangCapSao, dongChiSoJson } = itemObj;
    const color = layMauCanhGioi(tuSi.canhGioi);
    const starText = nangCapSao > 0 ? ` (+${nangCapSao}⭐)` : '';
    
    const embed = new EmbedBuilder()
      .setTitle(`✨ Chi Tiết Vật Phẩm: ${item.ten}${starText}`)
      .setColor(color)
      .setDescription(item.moTa || '*Không có mô tả chi tiết cho linh bảo này.*')
      .setTimestamp();

    const basicInfo = [
      `• **Phân loại**: \`${item.loai}\``,
      `• **Độ hiếm**: \`${item.doHiem}\``
    ];
    if (item.yeuCauCanhGioi > 1) {
      const cgReq = config.layThongTinCanhGioi(item.yeuCauCanhGioi);
      basicInfo.push(`• **Cảnh giới yêu cầu**: \`${cgReq.realmName} - ${cgReq.stageName}\``);
    }
    embed.addFields({ name: 'ℹ️ Thông Tin Cơ Bản', value: basicInfo.join('\n'), inline: true });

    // Chỉ số cơ bản
    let baseStatsTxt = '';
    if (item.chiSoJson) {
      try {
        const stats = JSON.parse(item.chiSoJson);
        const parts = [];
        if (stats.vat_cong) parts.push(`• Vật Công: \`+${stats.vat_cong}\``);
        if (stats.phap_cong) parts.push(`• Pháp Công: \`+${stats.phap_cong}\``);
        if (stats.vat_phong) parts.push(`• Vật Phòng: \`+${stats.vat_phong}\``);
        if (stats.phap_phong) parts.push(`• Pháp Phòng: \`+${stats.phap_phong}\``);
        if (stats.hp) parts.push(`• Khí huyết (HP): \`+${stats.hp}\``);
        if (stats.mp) parts.push(`• Pháp lực (MP): \`+${stats.mp}\``);
        if (stats.hp_hoi) parts.push(`• Hồi HP: \`+${stats.hp_hoi}\``);
        if (stats.mp_hoi) parts.push(`• Hồi MP: \`+${stats.mp_hoi}\``);
        if (stats.exp_bonus) parts.push(`• Linh lực nhận thêm: \`+${stats.exp_bonus}\``);
        baseStatsTxt = parts.join('\n');
      } catch (e) {}
    }
    embed.addFields({ name: '📊 Chỉ Số Bản Thân', value: baseStatsTxt || '• *Không có chỉ số.*', inline: true });

    // Chỉ số ẩn / dòng linh khí
    if (dongChiSoJson) {
      try {
        const lines = JSON.parse(dongChiSoJson);
        if (Array.isArray(lines) && lines.length > 0) {
          const colorEmojis = { do: '🔴', cam: '🟠', tim: '🟣', xanh: '🔵', luc: '🟢', trang: '⚪' };
          const linesTxt = lines.map(line => {
            const emoji = colorEmojis[line.mau] || '⚪';
            const sign = line.phanTram >= 0 ? '+' : '';
            return `${emoji} **${line.ten}**: \`${sign}${line.phanTram}%\``;
          }).join('\n');
          embed.addFields({ name: '🔮 Dòng Chỉ Số Linh Khí', value: linesTxt, inline: false });
        }
      } catch (e) {}
    }

    return embed;
  }

  /**
   * Tạo embed đầy đủ cho 1 phiên đấu giá.
   * @param {object} listing - AuctionListing instance
   * @param {string} sellerName - Tên người bán
   * @param {string|null} bidderName - Tên người đang dẫn đầu (null nếu chưa có)
   */
  static dauGiaPhien(listing, sellerName, bidderName = null) {
    const DO_HIEM_COLOR = {
      'Thường':      0x95a5a6,
      'Hiếm':        0x2ecc71,
      'Cực hiếm':    0x3498db,
      'Huyền thoại': 0x9b59b6,
      'Thần cấp':    0xf1c40f
    };

    let snapshot = {};
    try { snapshot = JSON.parse(listing.itemSnapshot); } catch (e) {}

    const starText = listing.nangCapSao > 0 ? ` (+${listing.nangCapSao}⭐)` : '';
    const color = DO_HIEM_COLOR[snapshot.doHiem] || 0xe67e22;
    const timeLeft = Math.max(0, Math.ceil((new Date(listing.endsAt).getTime() - Date.now()) / 60000));
    const endsAtTs = Math.floor(new Date(listing.endsAt).getTime() / 1000);

    const embed = new EmbedBuilder()
      .setTitle(`🔨 Đấu Giá #${listing.id}: ${snapshot.ten || listing.itemId}${starText}`)
      .setColor(color)
      .setDescription(
        `> ${snapshot.moTa || '*Không có mô tả.*'}\n\n` +
        `⏳ **Kết thúc**: <t:${endsAtTs}:R> (còn ~\`${timeLeft} phút\`)\n` +
        `🧧 **Người bán**: **${sellerName}**`
      )
      .setTimestamp()
      .setFooter({ text: `Phiên #${listing.id} • Hoa hồng 5% khi thành công • Thiên Đạo Tu Tiên RPG` });

    // ── Thông tin cơ bản ────────────────────────────────────────────────
    const basicInfo = [
      `• **Phân loại**: \`${snapshot.loai || 'N/A'}\``,
      `• **Độ hiếm**: \`${snapshot.doHiem || 'N/A'}\``
    ];
    if (snapshot.yeuCauCanhGioi && snapshot.yeuCauCanhGioi > 1) {
      try {
        const cgReq = config.layThongTinCanhGioi(snapshot.yeuCauCanhGioi);
        basicInfo.push(`• **Cảnh giới yêu cầu**: \`${cgReq.realmName} - ${cgReq.stageName}\``);
      } catch (e) {}
    }
    embed.addFields({ name: 'ℹ️ Thông Tin Cơ Bản', value: basicInfo.join('\n'), inline: true });

    // ── Chỉ số cơ bản ────────────────────────────────────────────────────
    let baseStatsTxt = '';
    if (snapshot.chiSoJson) {
      try {
        const stats = JSON.parse(snapshot.chiSoJson);
        const parts = [];
        if (stats.vat_cong)   parts.push(`• Vật Công: \`+${stats.vat_cong}\``);
        if (stats.phap_cong)  parts.push(`• Pháp Công: \`+${stats.phap_cong}\``);
        if (stats.vat_phong)  parts.push(`• Vật Phòng: \`+${stats.vat_phong}\``);
        if (stats.phap_phong) parts.push(`• Pháp Phòng: \`+${stats.phap_phong}\``);
        if (stats.hp)         parts.push(`• Khí huyết (HP): \`+${stats.hp}\``);
        if (stats.mp)         parts.push(`• Pháp lực (MP): \`+${stats.mp}\``);
        if (stats.hp_hoi)     parts.push(`• Hồi HP: \`+${stats.hp_hoi}\``);
        if (stats.mp_hoi)     parts.push(`• Hồi MP: \`+${stats.mp_hoi}\``);
        if (stats.exp_bonus)  parts.push(`• Linh lực nhận thêm: \`+${stats.exp_bonus}\``);
        baseStatsTxt = parts.join('\n');
      } catch (e) {}
    }
    embed.addFields({ name: '📊 Chỉ Số Cơ Bản', value: baseStatsTxt || '• *Không có chỉ số cố định.*', inline: true });

    // ── Dòng chỉ số phụ (linh khí ngẫu nhiên) ───────────────────────────
    if (listing.dongChiSoJson) {
      try {
        const lines = JSON.parse(listing.dongChiSoJson);
        if (Array.isArray(lines) && lines.length > 0) {
          const colorEmojis = { do: '🔴', cam: '🟠', tim: '🟣', xanh: '🔵', luc: '🟢', trang: '⚪' };
          const linesTxt = lines.map(line => {
            const emoji = colorEmojis[line.mau] || '⚪';
            const sign = line.phanTram >= 0 ? '+' : '';
            return `${emoji} **${line.ten}**: \`${sign}${line.phanTram}%\``;
          }).join('\n');
          embed.addFields({ name: '🔮 Dòng Chỉ Số Linh Khí (Ngẫu Nhiên)', value: linesTxt, inline: false });
        }
      } catch (e) {}
    }

    // ── Kỹ năng active (Pháp Bảo / Cổ Bảo) ────────────────────────────
    if (snapshot.activeSkillJson) {
      try {
        const sk = JSON.parse(snapshot.activeSkillJson);
        if (sk && sk.ten) {
          const skLines = [
            `• **Tên kỹ năng**: ${sk.ten}`,
            sk.triGia    ? `• **Hiệu lực**: \`${sk.triGia}%\`` : '',
            sk.duration  ? `• **Thời gian**: \`${sk.duration} hiệp\`` : '',
            sk.moTa      ? `• **Mô tả**: _${sk.moTa}_` : ''
          ].filter(Boolean).join('\n');
          embed.addFields({ name: '⚡ Kỹ Năng Chủ Động', value: skLines, inline: false });
        }
      } catch (e) {}
    }

    // ── Thông tin đặt giá ────────────────────────────────────────────────
    const minNextBid = Math.ceil(Number(listing.currentPrice) * 1.05);
    const bidStatus = listing.currentBidderId
      ? `🟢 **${bidderName || 'Ẩn danh'}** đang dẫn đầu với \`${Number(listing.currentPrice).toLocaleString()}\` 🪙`
      : `⚪ *Chưa có ai đặt giá*`;

    embed.addFields({
      name: '💰 Thông Tin Đấu Giá',
      value: `• **Giá khởi điểm**: \`${Number(listing.startPrice).toLocaleString()}\` 🪙\n` +
             `• **Giá hiện tại**: \`${Number(listing.currentPrice).toLocaleString()}\` 🪙\n` +
             `• **Trạng thái**: ${bidStatus}\n` +
             `• **Giá tối thiểu kế tiếp**: \`${minNextBid.toLocaleString()}\` 🪙 (+5%)`,
      inline: false
    });

    return embed;
  }
}
