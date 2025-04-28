const { ChannelType } = require('discord.js');
require('dotenv').config();

async function cleanupOldReports(client) {
    const categoryId = process.env.CATEGORY_ID;
    const category = await client.channels.fetch(categoryId).catch(() => null);
    if (!category) return console.error('❌ الكاتيجوري غير موجود أو مش قادر أوصل له!');

    const now = Date.now();
    const fifteenDays = 15 * 24 * 60 * 60 * 1000; // 15 يوم بالميلي ثانية

    const channels = category.children.cache.filter(c => c.type === ChannelType.GuildText);

    for (const channel of channels.values()) {
        try {
            const messages = await channel.messages.fetch({ limit: 1 }).catch(() => null);
            const lastMessage = messages?.first();

            if (!lastMessage) {
                console.log(`🗑️ قناة ${channel.name} فاضية بدون رسائل، هتتحذف.`);
                await channel.delete();
                continue;
            }

            if (now - lastMessage.createdTimestamp > fifteenDays) {
                await channel.delete();
                console.log(`🗑️ تم حذف قناة ${channel.name} بسبب عدم النشاط لمدة 15 يوم.`);
            } else {
                console.log(`📄 قناة ${channel.name} نشطة، مش هتتحذف.`);
            }
        } catch (error) {
            console.error(`❌ فشل حذف قناة ${channel.name}:`, error.message);
        }
    }
}

module.exports = { cleanupOldReports };