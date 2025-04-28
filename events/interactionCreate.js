const { updateReportStatus } = require('../utils/reportStatus');
const { EmbedBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');
require('dotenv').config();

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isCommand() && !interaction.isButton() && !interaction.isModalSubmit()) return;

        // تنفيذ أوامر السلاش
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error('❌ حصل خطأ أثناء تنفيذ الأمر:', error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: '❌ حصل خطأ أثناء تنفيذ الأمر.', flags: 64 });
                } else {
                    await interaction.reply({ content: '❌ حصل خطأ أثناء تنفيذ الأمر.', flags: 64 });
                }
            }
        }

        // التعامل مع ضغط الأزرار
        if (interaction.isButton()) {
            const allowedAcceptRoles = process.env.ALLOWED_ACCEPT_ROLES?.split(',') || [];
            const allowedRejectRoles = process.env.ALLOWED_REJECT_ROLES?.split(',') || [];

            const member = interaction.member;
            const memberRoles = member.roles.cache.map(role => role.id);

            switch (interaction.customId) {
                case 'accept_report':
                    if (!memberRoles.some(roleId => allowedAcceptRoles.includes(roleId))) {
                        return interaction.reply({ content: '❌ ليس لديك صلاحية قبول التقرير.', flags: 64 });
                    }

                    await updateReportStatus(interaction, 'accepted');

                    await interaction.update({
                        embeds: interaction.message.embeds,
                        components: []
                    });

                    const acceptEmbed = new EmbedBuilder()
                        .setColor('Green')
                        .setTitle('✅ تم قبول التقرير')
                        .setDescription(`تم قبول التقرير بواسطة <@${interaction.user.id}>.`)
                        .setTimestamp();

                    await interaction.channel.send({
                        embeds: [acceptEmbed],
                        reply: { messageReference: interaction.message.id }
                    });
                    break;

                case 'reject_report':
                    if (!memberRoles.some(roleId => allowedRejectRoles.includes(roleId))) {
                        return interaction.reply({ content: '❌ ليس لديك صلاحية رفض التقرير.', flags: 64 });
                    }

                    // إنشاء مودال باستخدام ModalBuilder الرسمي
                    const modal = new ModalBuilder()
                        .setCustomId(`reject_modal_${interaction.message.id}`)
                        .setTitle('📋 سبب رفض التقرير')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('reason')
                                    .setLabel('اكتب سبب الرفض هنا:')
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setMinLength(5)
                                    .setMaxLength(300)
                                    .setRequired(true)
                            )
                        );

                    await interaction.showModal(modal);
                    break;

                default:
                    await interaction.reply({ content: '❌ هذا الزر غير مدعوم.', flags: 64 });
                    break;
            }
        }

        // التعامل مع المودال بعد كتابة سبب الرفض
        if (interaction.isModalSubmit()) {
            if (!interaction.customId.startsWith('reject_modal_')) return;

            const allowedRejectRoles = process.env.ALLOWED_REJECT_ROLES?.split(',') || [];
            const memberRoles = interaction.member.roles.cache.map(role => role.id);

            if (!memberRoles.some(roleId => allowedRejectRoles.includes(roleId))) {
                return interaction.reply({ content: '❌ ليس لديك صلاحية رفض التقارير.', flags: 64 });
            }

            const reason = interaction.fields.getTextInputValue('reason');
            const originalMessageId = interaction.customId.replace('reject_modal_', '');

            try {
                const channel = interaction.channel;
                const message = await channel.messages.fetch(originalMessageId).catch(() => null);

                if (!message) {
                    return interaction.reply({ content: '❌ لم يتم العثور على رسالة التقرير الأصلية.', flags: 64 });
                }

                await updateReportStatus(interaction, 'rejected');

                await message.edit({
                    embeds: message.embeds,
                    components: [],
                });

                const rejectEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('❌ تم رفض التقرير')
                    .setDescription(`تم رفض التقرير بواسطة <@${interaction.user.id}>\n📄 السبب: ${reason}`)
                    .setTimestamp();

                await channel.send({
                    embeds: [rejectEmbed],
                    reply: { messageReference: message.id }
                });

                await interaction.reply({ content: '✅ تم رفض التقرير ومعالجة الرسالة.', flags: 64 });

            } catch (error) {
                console.error('❌ حصل خطأ أثناء رفض التقرير:', error);
                await interaction.reply({ content: '❌ حصل خطأ أثناء تنفيذ أمر الرفض.', flags: 64 });
            }
        }
    },
};