const { readDatabase, writeDatabase } = require('../utils/database');

async function updateReportStatus(interaction, status) {
    try {
        const embed = interaction.message.embeds[0];
        if (!embed) return;

        const traderField = embed.fields.find(f => f.name === 'التاجر');
        const reportIdField = embed.fields.find(f => f.name === 'رقم التقرير');

        if (!traderField || !reportIdField) return;

        const authorId = traderField.value.match(/\d+/)?.[0];
        const reportId = parseInt(reportIdField.value.replace('#', ''));

        if (!authorId || isNaN(reportId)) return;

        const db = readDatabase();

        const userReports = db.users?.[authorId]?.reports;
        if (!userReports) return;

        const report = userReports.find(r => r.id === reportId);
        if (!report) return;

        report.status = status;
        writeDatabase(db);

        // توزيع الرتب إذا كان التقرير مقبولاً
        if (status === 'accepted') {
            const member = await interaction.guild.members.fetch(authorId).catch(() => null);
            if (member) {
                const acceptedCount = userReports.filter(r => r.status === 'accepted').length;
                await handleRolesBasedOnReports(member, acceptedCount);
            }
        }

    } catch (error) {
        console.error('❌ خطأ أثناء تحديث حالة التقرير:', error);
    }
}

async function handleRolesBasedOnReports(member, acceptedCount) {
    const trustedMerchantRole = process.env.TRUSTED_MERCHANT_ROLE_ID;
    const officialMerchantRole = process.env.MERCHANT_OFFICIAL_ROLE_ID;

    try {
        const currentRoles = member.roles.cache;
        let newRole = null;
        let message = '';

        if (acceptedCount >= 70 && !currentRoles.has(officialMerchantRole)) {
            newRole = officialMerchantRole;
            message = '🎉 مبروك! تم ترقيتك إلى **Merchant Official** بسبب وصولك لـ 5 تقارير مقبولة!';
            await member.roles.add(officialMerchantRole);
        } 
        else if (acceptedCount >= 30 && !currentRoles.has(trustedMerchantRole)) {
            newRole = trustedMerchantRole;
            message = '🎉 مبروك! تم ترقيتك إلى **Trusted Merchant** بسبب وصولك لـ 3 تقارير مقبولة!';
            await member.roles.add(trustedMerchantRole);
        }

        if (newRole && message) {
            await sendPromotionDM(member, message);
        }

    } catch (error) {
        console.error('❌ خطأ أثناء تحديث رتب التاجر:', error);
    }
}

async function sendPromotionDM(member, message) {
    try {
        await member.send({ content: message });
    } catch (error) {
        console.error('❌ فشل إرسال رسالة DM للعضو:', member.user.username);
    }
}

module.exports = { updateReportStatus };