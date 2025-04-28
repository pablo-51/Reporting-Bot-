require('dotenv').config();
const { ActivityType } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const { migrateOldDatabase } = require('../utils/database'); // 🔥 استدعاء دالة الترقية هنا

// وظيفة للدخول للفويس
async function connectToVoiceChannel(client) {
    try {
        const channel = await client.channels.fetch(process.env.VOICE_CHANNEL_ID);
        if (channel && channel.isVoiceBased()) {
            joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: true,    // Deaf = مايسمعش
                selfMute: false,   // مش ميوت
            });
            console.log('✅ دخل البوت الروم الصوتي وهو Deaf!');
        } else {
            console.warn('⚠️ الروم مش فويس أو مش موجود!');
        }
    } catch (error) {
        console.error('❌ حصل خطأ أثناء محاولة دخول الفويس:', error);
    }
}

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`✅ Logged in as ${client.user.tag}!`);

        migrateOldDatabase(); // 🔥 ترقية قاعدة البيانات أوتوماتيك بمجرد تشغيل البوت

        // ضبط الحالة (ستريمنج مع رابط تويتش)
        client.user.setPresence({
            activities: [{
                name: process.env.STATUS_TEXT || 'Streaming now!',
                type: ActivityType.Streaming,
                url: process.env.STREAM_URL || 'https://www.twitch.tv/GamingArea'
            }],
            status: 'online',
        });

        console.log('✅ البوت شغال ومستعد 🚀');

        // أول ما يشتغل يدخل الفويس
        await connectToVoiceChannel(client);

        // متابعة خروج البوت من الفويس
        client.on('voiceStateUpdate', async (oldState, newState) => {
            const botId = client.user.id;

            if (oldState.member?.id === botId && oldState.channelId && !newState.channelId) {
                console.warn('⚠️ البوت طُرد أو خرج من الروم الصوتي! بيحاول يرجع...');

                setTimeout(async () => {
                    try {
                        await connectToVoiceChannel(client);
                        console.log('✅ تمت إعادة دخول البوت للفويس بنجاح!');
                    } catch (error) {
                        console.error('❌ فشل إعادة دخول البوت للفويس:', error);
                    }
                }, 3000); // يحاول يرجع بعد 3 ثواني
            }
        });
    },
};