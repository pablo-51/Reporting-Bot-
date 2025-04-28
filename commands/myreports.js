const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readDatabase } = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('myreports')
        .setDescription('عرض تفاصيل جميع تقارير البيع التي وثقتها'),

    async execute(interaction, client) {
        const db = readDatabase();
        const userId = interaction.user.id;

        const userData = db.users?.[userId];

        if (!userData || !userData.reports || userData.reports.length === 0) {
            return interaction.reply({ content: '📄 لا توجد لديك تقارير بيع موثقة.', flags: 64 });
        }

        const totalReports = userData.reports.length;
        const acceptedReports = userData.reports.filter(r => r.status === 'accepted').length;
        const rejectedReports = userData.reports.filter(r => r.status === 'rejected').length;

        const latestReport = userData.reports[userData.reports.length - 1];
        const ticketNumber = latestReport.ticketNumber || 'غير محدد';

        const accusedCount = {};
        userData.reports.forEach(report => {
            accusedCount[report.accusedId] = (accusedCount[report.accusedId] || 0) + 1;
        });

        const topAccusedId = Object.keys(accusedCount).sort((a, b) => accusedCount[b] - accusedCount[a])[0];
        const topAccusedCount = accusedCount[topAccusedId];

        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle('📋 ملخص تقارير البيع الخاصة بك')
            .addFields(
                { name: '📦 عدد تقارير البيع الكلي', value: `**${totalReports}** تقرير`, inline: false },
                { name: '✅ عدد التقارير المقبولة', value: `**${acceptedReports}** تقرير`, inline: true },
                { name: '❌ عدد التقارير المرفوضة', value: `**${rejectedReports}** تقرير`, inline: true },
                { name: '🕐 آخر تقرير بيع', value: `• العميل: <@${latestReport.accusedId}>\n• نوع السلعة: ${latestReport.itemType}\n• رقم التكت: ${ticketNumber}\n• ملاحظات: ${latestReport.reason || 'لا توجد ملاحظة'}`, inline: false },
                { name: '🏆 أكثر عميل استلم منك', value: `<@${topAccusedId}> - **${topAccusedCount}** مرة`, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });
    },
};