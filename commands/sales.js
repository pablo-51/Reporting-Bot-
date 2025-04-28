const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readDatabase } = require('../utils/database');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sales')
        .setDescription('📊 عرض تقارير مستخدم معين')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('📋 اختر المستخدم لعرض تقاريره')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const adminRoles = process.env.ADMIN_ROLES?.split(',') || [];

        if (!interaction.member.roles.cache.some(role => adminRoles.includes(role.id))) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية استخدام هذا الأمر.', flags: 64 });
        }

        const targetUser = interaction.options.getUser('user');
        const targetUserId = targetUser.id;

        const db = readDatabase();

        if (!db.users || !db.users[targetUserId] || db.users[targetUserId].reports.length === 0) {
            return interaction.reply({ content: `❌ لا توجد أي تقارير محفوظة للمستخدم: <@${targetUserId}>`, flags: 64 });
        }

        const userReports = db.users[targetUserId].reports;

        const acceptedReports = userReports.filter(report => report.status === 'accepted').length;
        const rejectedReports = userReports.filter(report => report.status === 'rejected').length;
        const pendingReports = userReports.filter(report => !report.status).length;

        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle(`📊 إحصائيات التقارير لـ ${targetUser.username}`)
            .addFields(
                { name: '📄 إجمالي التقارير', value: `${userReports.length}`, inline: true },
                { name: '✅ التقارير المقبولة', value: `${acceptedReports}`, inline: true },
                { name: '❌ التقارير المرفوضة', value: `${rejectedReports}`, inline: true },
                { name: '⏳ تقارير قيد الانتظار', value: `${pendingReports}`, inline: true }
            )
            .setFooter({ text: `طلب بواسطة ${interaction.user.username}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};