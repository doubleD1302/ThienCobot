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
          moTa: detail.moTa
        });
        learnedIds.add(detail.id);
      }
    }

    const playerClass = tuSi.huongTu || 'Phap Tu';
    const expectedType = playerClass === 'The Tu' ? 'Vật lý' : 'Phép thuật';
    const allSkills = await Skill.findAll({
      where: { loai: expectedType }
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

    await PlayerSkill.create({
      idNguoiDung: tuSi.idNguoiDung,
      skillId: skillId,
      capDo: 1,
      kinhNghiemSkill: 0
    });

    return { ok: true, msg: `Lĩnh hội thành công chiêu thức **${skillDetail.ten}**!` };
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
                const { layThongTinCanhGioi } = config;
                const { stageName } = layThongTinCanhGioi(sk.yeuCauCanhGioi);
                return {
                  label: `Lĩnh hội: ${sk.ten}`.slice(0, 100),
                  value: sk.id,
                  emoji: '📖',
                  description: `Yêu cầu: ${stageName} (Cấp ${sk.yeuCauCanhGioi})`.slice(0, 100)
                };
              }))
          );
        }

        const rowButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('skill_close')
            .setLabel('❌ Đóng Tàng Kinh Các')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
        );

        return [rowMenu, rowButtons];
      };

      // Tải dữ liệu ban đầu
      let { playerSkillsList, availableSkills } = await this.layDanhSachKyNangData(tuSi);
      const embed = BoTaoEmbed.kyNang(tuSi, playerSkillsList, availableSkills);

      const msg = await interaction.editReply({
        embeds: [embed],
        components: buildComponents(availableSkills)
      });

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

        if (i.customId === 'skill_learn_select') {
          const skillId = i.values[0];
          if (!skillId || skillId === '__empty__') return;

          // Thực hiện học kỹ năng
          const result = await this._thucHienHocKyNang(tuSi, skillId);

          if (result.ok) {
            await i.followUp({
              embeds: [BoTaoEmbed.thanhCong('🥋 Lĩnh Hội Thành Công', result.msg)],
              ephemeral: true
            });
            // Tải lại danh sách
            const refreshed = await this.layDanhSachKyNangData(tuSi);
            playerSkillsList = refreshed.playerSkillsList;
            availableSkills = refreshed.availableSkills;

            await interaction.editReply({
              embeds: [BoTaoEmbed.kyNang(tuSi, playerSkillsList, availableSkills)],
              components: buildComponents(availableSkills)
            });
          } else {
            await i.followUp({
              embeds: [BoTaoEmbed.loi(result.msg)],
              ephemeral: true
            });
          }
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
            const current = await this.layDanhSachKyNangData(tuSi);
            await interaction.editReply({
              components: buildComponents(current.availableSkills, true)
            });
          }
        } catch (_) {}
      });
    }
  };
}

const controller = new BoDieuKhienKyNang();
export const danhSachLenhKyNang = [controller.lenhKyNang];
export { controller as boDieuKhienKyNang };
