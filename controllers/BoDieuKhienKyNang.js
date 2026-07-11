import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';

import { BoDieuKhienGoc } from './BoDieuKhienGoc.js';
import { BoTaoEmbed } from '../views/BoTaoEmbed.js';
import { PlayerSkill } from '../models/PlayerSkill.js';
import { Skill } from '../models/Skill.js';
import * as config from '../config.js';

class BoDieuKhienKyNang extends BoDieuKhienGoc {
  constructor() {
    super();
  }

  async layDanhSachKyNangData(tuSi) {
    const learned = await PlayerSkill.findAll({
      where: { idNguoiDung: tuSi.idNguoiDung }
    });

    const playerSkillsList = [];
    const learnedIds = new Set();
    for (const psk of learned) {
      const detail = await Skill.findByPk(psk.skillId);
      if (detail) {
        playerSkillsList.push({
          id: detail.id,
          ten: detail.ten,
          loai: detail.loai,
          satThuong: detail.satThuong,
          cooldown: detail.cooldown,
          capDo: psk.capDo,
          trangBi: psk.trangBi,
          moTa: detail.moTa
        });
        learnedIds.add(detail.id);
      }
    }

    const playerClass = tuSi.huongTu || 'Phap Tu';
    const expectedType = playerClass === 'The Tu' ? 'Vật lý' : 'Phép thuật';
    const { Op } = await import('sequelize');
    const allSkills = await Skill.findAll({
      where: {
        loai: expectedType,
        yeuCauCanhGioi: { [Op.lte]: tuSi.capDo }
      }
    });

    const availableSkills = [];
    for (const sk of allSkills) {
      if (!learnedIds.has(sk.id)) {
        availableSkills.push(sk);
      }
    }

    return { playerSkillsList, availableSkills };
  }

  // Helper method to learn skills
  async _thucHienHocKyNang(tuSi, skillId) {
    const skillDetail = await Skill.findByPk(skillId);
    if (!skillDetail) {
      return { ok: false, msg: `Không tìm thấy thông tin chiêu thức.` };
    }

    const playerClass = tuSi.huongTu || 'Phap Tu';
    const expectedType = playerClass === 'The Tu' ? 'Vật lý' : 'Phép thuật';
    if (skillDetail.loai !== expectedType && skillDetail.congPhapId === null) {
      return { ok: false, msg: `Chiêu thức \`${skillDetail.ten}\` không phù hợp với hướng tu đao thống.` };
    }

    const existing = await PlayerSkill.findOne({
      where: { idNguoiDung: tuSi.idNguoiDung, skillId: skillId }
    });
    if (existing) {
      return { ok: false, msg: `Đạo hữu đã lĩnh hội chiêu thức này rồi.` };
    }

    if (tuSi.capDo < skillDetail.yeuCauCanhGioi) {
      const { layThongTinCanhGioi } = config;
      const { stageName } = layThongTinCanhGioi(skillDetail.yeuCauCanhGioi);
      return { ok: false, msg: `Căn cơ bất túc! Yêu cầu cảnh giới tối thiểu: **${stageName}** (Cấp ${skillDetail.yeuCauCanhGioi}).` };
    }

    // Tính toán phí Linh Thạch: 1/100 tu vi cần của cảnh giới đó, max 100m, riêng Kim Đan là 100k
    const reqExp = config.layLinhLucYeuCau(skillDetail.yeuCauCanhGioi);
    let cost = Math.min(100000000, Math.floor(reqExp / 100));
    if (skillDetail.yeuCauCanhGioi === 13) {
      cost = 100000;
    }

    if (tuSi.linhThach < cost) {
      return { ok: false, msg: `Đạo hữu không đủ Linh Thạch! Lĩnh hội chiêu thức này cần **${cost.toLocaleString()}** Linh Thạch (thiếu **${(cost - tuSi.linhThach).toLocaleString()}** Linh Thạch).` };
    }

    tuSi.linhThach -= cost;
    await tuSi.save();

    await PlayerSkill.create({
      idNguoiDung: tuSi.idNguoiDung,
      skillId: skillId,
      capDo: 1,
      kinhNghiemSkill: 0
    });

    return { ok: true, msg: `Lĩnh hội thành công chiêu thức **${skillDetail.ten}**! Khấu trừ **${cost.toLocaleString()}** Linh Thạch.` };
  }

  async xayDungEmbedHuongDanKyNang(tuSi, realmName) {
    const playerClass = tuSi.huongTu || 'Phap Tu';
    const expectedType = playerClass === 'The Tu' ? 'Vật lý' : 'Phép thuật';
    const allSkills = await Skill.findAll({
      where: { loai: expectedType }
    });

    const filteredSkills = allSkills.filter(sk => {
      const { realmName: skRealm } = config.layThongTinCanhGioi(sk.yeuCauCanhGioi);
      return skRealm === realmName;
    });

    const embed = new EmbedBuilder()
      .setTitle(`📚 Bí Kíp Chiêu Thức - Cảnh Giới: ${realmName}`)
      .setDescription(`Hướng tu luyện: **${playerClass === 'The Tu' ? 'Thể Tu (Vật lý)' : 'Pháp Tu (Phép thuật)'}**\n\nDưới đây là toàn bộ chiêu thức tông môn thuộc cảnh giới **${realmName}**:`)
      .setColor(0xe74c3c)
      .setTimestamp();

    let listText = '';
    if (filteredSkills.length === 0) {
      listText = '*Không có chiêu thức nào khả dụng ở cảnh giới này.*';
    } else {
      for (const sk of filteredSkills) {
        listText += `• **${sk.ten}** (Yêu cầu: Cấp \`${sk.yeuCauCanhGioi}\`)\n` +
                    `  *Sát thương*: \`${sk.satThuong}%\` | *Hồi chiêu*: \`${Math.max(1, Math.round(sk.cooldown / 3))} hiệp\`\n` +
                    `  *Mô tả*: _${sk.moTa || 'Chưa có mô tả.'}_\n\n`;
      }
    }

    embed.addFields({
      name: `🥋 Chiêu Thức Phái ${playerClass === 'The Tu' ? 'Thể Tu' : 'Pháp Tu'}`,
      value: listText.slice(0, 1023),
      inline: false
    });

    return embed;
  }

  lenhKyNang = {
    data: new SlashCommandBuilder()
      .setName('skill')
      .setDescription('Mở Tàng Kinh Các để xem và lĩnh hội chiêu thức phép thuật'),

    execute: async (interaction) => {
      await interaction.deferReply();
      const tuSi = await this.layTuSi(interaction.user.id);
      if (!tuSi) {
        return await interaction.editReply({
          embeds: [BoTaoEmbed.loi("Ngươi chưa có nhân vật! Hãy gõ `/start [tên]` để khởi đầu nhân duyên.")]
        });
      }

      const realmsList = ['Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần', 'Phản Hư', 'Hợp Thể', 'Đại Thừa', 'Tiên Nhân'];
      const { realmName: currentRealm } = config.layThongTinCanhGioi(tuSi.capDo);
      let guideRealmIndex = realmsList.indexOf(currentRealm);
      if (guideRealmIndex === -1) guideRealmIndex = 0;

      let viewMode = 'main'; // 'main', 'guide', 'equip', hoặc 'upgrade'

      const buildComponents = (availableSkills, disabled = false) => {
        const rowMenu = new ActionRowBuilder();
        if (availableSkills.length === 0) {
          rowMenu.addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('skill_learn_select')
              .setPlaceholder('⚠️ Đã lĩnh hội toàn bộ kỹ năng khả dụng')
              .setDisabled(true)
              .addOptions([{ label: '(Trống)', value: '__empty__' }])
          );
        } else {
          rowMenu.addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('skill_learn_select')
              .setPlaceholder('🔽 Chọn một chiêu thức để lĩnh hội...')
              .setDisabled(disabled)
              .addOptions(availableSkills.slice(0, 25).map(sk => {
                const { layThongTinCanhGioi, layLinhLucYeuCau } = config;
                const { stageName } = layThongTinCanhGioi(sk.yeuCauCanhGioi);
                const reqExp = layLinhLucYeuCau(sk.yeuCauCanhGioi);
                let cost = Math.min(100000000, Math.floor(reqExp / 100));
                if (sk.yeuCauCanhGioi === 13) {
                  cost = 100000;
                }
                return {
                  label: `Lĩnh hội: ${sk.ten}`.slice(0, 100),
                  value: sk.id,
                  emoji: '📖',
                  description: `Cấp ${sk.yeuCauCanhGioi} (${stageName}) | Phí: ${cost.toLocaleString()} LThach`.slice(0, 100)
                };
              }))
          );
        }

        const rowButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('skill_equip_mode')
            .setLabel('⚔️ Trang Bị')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
          new ButtonBuilder()
            .setCustomId('skill_upgrade_mode')
            .setLabel('⚡ Nâng Cấp')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
          new ButtonBuilder()
            .setCustomId('skill_all_guide')
            .setLabel('📚 Tất Cả')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
          new ButtonBuilder()
            .setCustomId('skill_close')
            .setLabel('❌ Đóng')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
        );

        return [rowMenu, rowButtons];
      };

      const buildGuideComponents = (disabled = false) => {
        const rowMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('skill_guide_realm_select')
            .setPlaceholder('🔽 Chọn cảnh giới muốn tra cứu chiêu thức...')
            .setDisabled(disabled)
            .addOptions(realmsList.map((r, idx) => ({
              label: `Cảnh giới: ${r}`,
              value: idx.toString(),
              emoji: '⛩️',
              default: idx === guideRealmIndex
            })))
        );

        const rowButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('skill_guide_back')
            .setLabel('↩️ Quay Lại')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
          new ButtonBuilder()
            .setCustomId('skill_close')
            .setLabel('❌ Đóng Tàng Kinh Các')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
        );

        return [rowMenu, rowButtons];
      };

      const buildEquipComponents = (playerSkillsList, disabled = false) => {
        const rowMenu = new ActionRowBuilder();
        if (playerSkillsList.length === 0) {
          rowMenu.addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('skill_equip_select')
              .setPlaceholder('⚠️ Chưa lĩnh hội kỹ năng nào để trang bị')
              .setDisabled(true)
              .addOptions([{ label: '(Trống)', value: '__empty__' }])
          );
        } else {
          rowMenu.addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('skill_equip_select')
              .setPlaceholder('🔽 Chọn một chiêu thức để Lắp / Tháo trang bị...')
              .setDisabled(disabled)
              .addOptions(playerSkillsList.slice(0, 25).map(psk => {
                const statusStr = psk.trangBi ? '[ĐÃ LẮP]' : '[CHƯA LẮP]';
                return {
                  label: `${statusStr} ${psk.ten}`.slice(0, 100),
                  value: psk.id,
                  emoji: psk.trangBi ? '⚔️' : '📖',
                  description: `Cấp ${psk.capDo} | Sát thương: ${psk.satThuong}%`.slice(0, 100)
                };
              }))
          );
        }

        const rowButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('skill_equip_back')
            .setLabel('↩️ Quay Lại')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
          new ButtonBuilder()
            .setCustomId('skill_close')
            .setLabel('❌ Đóng Tàng Kinh Các')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
        );

        return [rowMenu, rowButtons];
      };

      const buildUpgradeComponents = (playerSkillsList, disabled = false) => {
        const rowMenu = new ActionRowBuilder();
        if (playerSkillsList.length === 0) {
          rowMenu.addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('skill_upgrade_select')
              .setPlaceholder('⚠️ Chưa lĩnh hội kỹ năng nào để nâng cấp')
              .setDisabled(true)
              .addOptions([{ label: '(Trống)', value: '__empty__' }])
          );
        } else {
          rowMenu.addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('skill_upgrade_select')
              .setPlaceholder('🔽 Chọn một chiêu thức để Nâng Cấp (+1% hiệu quả)...')
              .setDisabled(disabled)
              .addOptions(playerSkillsList.slice(0, 25).map(psk => {
                const isLuyenKhi = ['tu_khi_thuat', 'linh_phao_thuat', 'huyet_khi_phun_trao', 'bang_son_quyen'].includes(psk.id);
                const baseCost = isLuyenKhi ? 1000 : 5000;
                const nextCost = Math.floor(baseCost * Math.pow(1.20, psk.capDo - 1));
                const labelStr = psk.capDo >= 50 ? `[MAX] ${psk.ten}` : `Nâng cấp: ${psk.ten} (Cấp ${psk.capDo} ➔ ${psk.capDo + 1})`;
                const descStr = psk.capDo >= 50 ? 'Đã đạt cấp tối đa +50' : `Tốn ${nextCost.toLocaleString()} Linh Thạch`;
                return {
                  label: labelStr.slice(0, 100),
                  value: psk.id,
                  emoji: '⚡',
                  description: descStr.slice(0, 100)
                };
              }))
          );
        }

        const rowButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('skill_upgrade_back')
            .setLabel('↩️ Quay Lại')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
          new ButtonBuilder()
            .setCustomId('skill_close')
            .setLabel('❌ Đóng')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
        );

        return [rowMenu, rowButtons];
      };

      const renderInterface = async () => {
        if (viewMode === 'main') {
          const { playerSkillsList, availableSkills } = await this.layDanhSachKyNangData(tuSi);
          const embed = BoTaoEmbed.kyNang(tuSi, playerSkillsList, availableSkills);
          await interaction.editReply({
            embeds: [embed],
            components: buildComponents(availableSkills)
          });
        } else if (viewMode === 'guide') {
          const realmName = realmsList[guideRealmIndex];
          const embed = await this.xayDungEmbedHuongDanKyNang(tuSi, realmName);
          await interaction.editReply({
            embeds: [embed],
            components: buildGuideComponents()
          });
        } else if (viewMode === 'equip') {
          const { playerSkillsList } = await this.layDanhSachKyNangData(tuSi);
          const equippedCount = playerSkillsList.filter(s => s.trangBi).length;
          
          const embed = new EmbedBuilder()
            .setTitle(`⚔️ Lắp Đặt Chiêu Thức: ${tuSi.ten}`)
            .setDescription(
              `Hãy chọn các chiêu thức đã học từ danh mục bên dưới để **Lắp (Trang bị)** hoặc **Tháo** khi chiến đấu.\n\n` +
              `• **Số lượng đã trang bị**: \`${equippedCount} / 5\` ⚔️\n\n` +
              `**Danh sách chiêu thức đã học**:\n` +
              (playerSkillsList.map(psk => {
                const statusEmoji = psk.trangBi ? '🟢 **[Đang Lắp]**' : '⚪ *[Chưa Lắp]*';
                return `${statusEmoji} **${psk.ten} (Cấp ${psk.capDo})**`;
              }).join('\n') || '_Chưa học chiêu thức nào._')
            )
            .setColor(0x2ecc71)
            .setTimestamp()
            .setFooter({ text: 'Giới hạn tối đa 5 kỹ năng được lắp cùng lúc.' });

          await interaction.editReply({
            embeds: [embed],
            components: buildEquipComponents(playerSkillsList)
          });
        } else if (viewMode === 'upgrade') {
          const { playerSkillsList } = await this.layDanhSachKyNangData(tuSi);
          
          const embed = new EmbedBuilder()
            .setTitle(`⚡ Nâng Cấp Chiêu Thức: ${tuSi.ten}`)
            .setDescription(
              `Hãy chọn một chiêu thức đã học từ danh mục bên dưới để nâng cấp tăng hiệu quả.\n\n` +
              `• **Giới hạn cấp tối đa**: \`+50\`\n` +
              `• **Hiệu quả mỗi cấp**: \`+1% hiệu quả\` *(Riêng kỹ năng Kim Đan)*\n\n` +
              `**Danh sách chiêu thức đã học**:\n` +
              (playerSkillsList.map(psk => {
                const isLuyenKhi = ['tu_khi_thuat', 'linh_phao_thuat', 'huyet_khi_phun_trao', 'bang_son_quyen'].includes(psk.id);
                const baseCost = isLuyenKhi ? 1000 : 5000;
                const nextCost = Math.floor(baseCost * Math.pow(1.20, psk.capDo - 1));
                const costStr = psk.capDo >= 50 ? 'Đã đạt cấp tối đa' : `Tốn ${nextCost.toLocaleString()} Linh Thạch`;
                return `• **${psk.ten} (Cấp ${psk.capDo}/50)** — *${costStr}*`;
              }).join('\n') || '_Chưa học chiêu thức nào._')
            )
            .setColor(0xe67e22)
            .setTimestamp();

          await interaction.editReply({
            embeds: [embed],
            components: buildUpgradeComponents(playerSkillsList)
          });
        }
      };

      // Tải giao diện ban đầu
      await renderInterface();

      const msg = await interaction.fetchReply();

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 180_000
      });

      collector.on('collect', async i => {
        await i.deferUpdate();

        if (i.customId === 'skill_close') {
          collector.stop('closed');
          return;
        }

        if (i.customId === 'skill_all_guide') {
          viewMode = 'guide';
          await renderInterface();
          return;
        }

        if (i.customId === 'skill_guide_back' || i.customId === 'skill_equip_back' || i.customId === 'skill_upgrade_back') {
          viewMode = 'main';
          await renderInterface();
          return;
        }

        if (i.customId === 'skill_equip_mode') {
          viewMode = 'equip';
          await renderInterface();
          return;
        }

        if (i.customId === 'skill_upgrade_mode') {
          viewMode = 'upgrade';
          await renderInterface();
          return;
        }

        if (i.customId === 'skill_guide_realm_select') {
          guideRealmIndex = parseInt(i.values[0], 10);
          await renderInterface();
          return;
        }

        if (i.customId === 'skill_learn_select') {
          const skillId = i.values[0];
          if (!skillId || skillId === '__empty__') return;

          const result = await this._thucHienHocKyNang(tuSi, skillId);

          if (result.ok) {
            await i.followUp({
              embeds: [BoTaoEmbed.thanhCong('🥋 Lĩnh Hội Thành Công', result.msg)],
              ephemeral: true
            });
            await renderInterface();
          } else {
            await i.followUp({
              embeds: [BoTaoEmbed.loi(result.msg)],
              ephemeral: true
            });
          }
        }

        if (i.customId === 'skill_equip_select') {
          const skillId = i.values[0];
          if (!skillId || skillId === '__empty__') return;

          const pskRecord = await PlayerSkill.findOne({
            where: { idNguoiDung: tuSi.idNguoiDung, skillId: skillId }
          });
          if (!pskRecord) {
            await i.followUp({
              embeds: [BoTaoEmbed.loi('Không tìm thấy bản ghi kỹ năng đã học.')],
              ephemeral: true
            });
            return;
          }

          if (pskRecord.trangBi) {
            // Tháo trang bị
            pskRecord.trangBi = false;
            await pskRecord.save();
            await i.followUp({
              embeds: [BoTaoEmbed.thanhCong('⚔️ Tháo Chiêu Thức', `Đạo hữu đã tháo trang bị chiêu thức thành công!`)],
              ephemeral: true
            });
          } else {
            // Lắp trang bị (check 5)
            const equippedCount = await PlayerSkill.count({
              where: { idNguoiDung: tuSi.idNguoiDung, trangBi: true }
            });
            if (equippedCount >= 5) {
              await i.followUp({
                embeds: [BoTaoEmbed.loi('Chỉ được trang bị tối đa 5 chiêu thức! Vui lòng tháo bớt chiêu thức khác trước.')],
                ephemeral: true
              });
              return;
            }

            pskRecord.trangBi = true;
            await pskRecord.save();
            await i.followUp({
              embeds: [BoTaoEmbed.thanhCong('⚔️ Trang Bị Chiêu Thức', `Đạo hữu đã lắp trang bị chiêu thức thành công!`)],
              ephemeral: true
            });
          }

          await renderInterface();
        }

        if (i.customId === 'skill_upgrade_select') {
          const skillId = i.values[0];
          if (!skillId || skillId === '__empty__') return;

          const pskRecord = await PlayerSkill.findOne({
            where: { idNguoiDung: tuSi.idNguoiDung, skillId: skillId }
          });
          if (!pskRecord) {
            await i.followUp({
              embeds: [BoTaoEmbed.loi('Không tìm thấy bản ghi kỹ năng đã học.')],
              ephemeral: true
            });
            return;
          }

          if (pskRecord.capDo >= 50) {
            await i.followUp({
              embeds: [BoTaoEmbed.loi('Chiêu thức này đã đạt cấp độ tối đa +50.')],
              ephemeral: true
            });
            return;
          }

          const isLuyenKhi = ['tu_khi_thuat', 'linh_phao_thuat', 'huyet_khi_phun_trao', 'bang_son_quyen'].includes(pskRecord.skillId);
          const baseCost = isLuyenKhi ? 1000 : 5000;
          const cost = Math.floor(baseCost * Math.pow(1.20, pskRecord.capDo - 1));
          if (tuSi.linhThach < cost) {
            await i.followUp({
              embeds: [BoTaoEmbed.loi(`Không đủ linh thạch để nâng cấp! Cần **${cost.toLocaleString()}** Linh Thạch.`)],
              ephemeral: true
            });
            return;
          }

          tuSi.linhThach -= cost;
          await tuSi.save();

          pskRecord.capDo += 1;
          await pskRecord.save();

          const skillDetail = await Skill.findByPk(skillId);
          await i.followUp({
            embeds: [BoTaoEmbed.thanhCong('⚡ Nâng Cấp Chiêu Thức Thành Công', `Đạo hữu đã nâng cấp chiêu thức **${skillDetail?.ten || skillId}** lên Cấp **${pskRecord.capDo}**!\nKhấu trừ **${cost.toLocaleString()}** Linh Thạch.`)],
            ephemeral: true
          });

          await renderInterface();
        }
      });

      collector.on('end', async (_, reason) => {
        try {
          if (reason === 'closed') {
            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle('📖 Tàng Kinh Các — Đã Đóng')
                  .setDescription('Cánh cửa Tàng Kinh Các đã khép lại.')
                  .setColor(0x7f8c8d)
                  .setTimestamp()
              ],
              components: []
            });
          } else {
            if (viewMode === 'main') {
              const current = await this.layDanhSachKyNangData(tuSi);
              await interaction.editReply({
                components: buildComponents(current.availableSkills, true)
              });
            } else if (viewMode === 'guide') {
              await interaction.editReply({
                components: buildGuideComponents(true)
              });
            } else if (viewMode === 'equip') {
              const current = await this.layDanhSachKyNangData(tuSi);
              await interaction.editReply({
                components: buildEquipComponents(current.playerSkillsList, true)
              });
            } else if (viewMode === 'upgrade') {
              const current = await this.layDanhSachKyNangData(tuSi);
              await interaction.editReply({
                components: buildUpgradeComponents(current.playerSkillsList, true)
              });
            }
          }
        } catch (_) { }
      });
    }
  };
}

const controller = new BoDieuKhienKyNang();
export const danhSachLenhKyNang = [controller.lenhKyNang];
export { controller as boDieuKhienKyNang };
