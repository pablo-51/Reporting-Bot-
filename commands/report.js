const { SlashCommandBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { saveReport } = require('../utils/database');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('توثيق عملية بيع ناجحة مع عميل')
        .addUserOption(option => option.setName('client').setDescription('العميل المستلم').setRequired(true))
        .addStringOption(option => option.setName('item_type').setDescription('نوع السلعة المسلمة').setRequired(true))
        .addStringOption(option => option.setName('ticket_number').setDescription('رقم التكت الخاص بالطلب').setRequired(true))
        .addStringOption(option => option.setName('note').setDescription('ملاحظة عن عملية التسليم (اختياري)').setRequired(false))
        .addAttachmentOption(option => option.setName('image').setDescription('صورة تثبت عملية التسليم')),

    async execute(interaction, client) {
        const reportRoles = process.env.REPORT_ROLES?.split(',') || [];
        const adminRoles = process.env.ADMIN_ROLES?.split(',') || [];
        const categoryId = process.env.CATEGORY_ID;

        if (!interaction.member.roles.cache.some(role => reportRoles.includes(role.id))) {
            return interaction.reply({ content: '❌ لا تملك صلاحية توثيق عمليات التسليم.', flags: 64 });
        }

        const accused = interaction.options.getUser('client');
        const itemType = interaction.options.getString('item_type');
        const ticketNumber = interaction.options.getString('ticket_number');
        const reason = interaction.options.getString('note');
        const proof = interaction.options.getAttachment('image');

        const category = interaction.guild.channels.cache.get(categoryId);
        if (!category) return interaction.reply({ content: '❌ كاتيجوري التوثيقات غير موجود.', flags: 64 });

        let reportChannel = interaction.guild.channels.cache.find(c =>
            c.parentId === category.id && c.topic === interaction.user.id
        );

        if (!reportChannel) {
            reportChannel = await interaction.guild.channels.create({
                name: `توثيق-${interaction.user.username.replace(/[^a-zA-Z0-9-]/g, '')}`,
                type: ChannelType.GuildText,
                parent: category,
                topic: interaction.user.id.toString(),
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: interaction.user.id.toString(),
                        allow: [PermissionFlagsBits.ViewChannel],
                    },
                    ...adminRoles.map(roleId => ({
                        id: roleId,
                        allow: [PermissionFlagsBits.ViewChannel],
                    })),
                ],
            });
        }

        const reportNumber = await saveReport(interaction.user.id, accused.id, itemType, ticketNumber, reason);

        const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('📦 تقرير عملية بيع')
            .addFields(
                { name: 'التاجر', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'العميل', value: `<@${accused.id}>`, inline: true },
                { name: 'نوع السلعة', value: itemType, inline: false },
                { name: 'رقم التكت', value: ticketNumber, inline: false },
                { name: 'رقم التقرير', value: `#${reportNumber}`, inline: false },
                ...(reason ? [{ name: 'ملاحظات', value: reason, inline: false }] : [])
            )
            .setTimestamp();

        if (proof) {
            embed.setImage(proof.url);
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('accept_report')
                    .setLabel('قبول التقرير ✅')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('reject_report')
                    .setLabel('رفض التقرير ❌')
                    .setStyle(ButtonStyle.Danger)
            );

        await reportChannel.send({ embeds: [embed], components: [buttons] });

        await interaction.reply({ content: `✅ تم توثيق عملية البيع بنجاح في ${reportChannel}`, flags: 64 });
    },
};