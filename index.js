require('dotenv').config(); // تحميل متغيرات البيئة

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { cleanupOldReports } = require('./utils/cleanup');
const { migrateOldDatabase } = require('./utils/database'); // استدعاء الترقية

// ترقية قاعدة البيانات للنظام الجديد مرة واحدة
migrateOldDatabase();

// إنشاء الكلاينت
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// تجهيز كولكشن للأوامر
client.commands = new Collection();

// تحميل الأوامر
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.warn(`⚠️ الأمر في ${file} ناقص "data" أو "execute". تم تجاهله.`);
    }
}

// تحميل الإيفنتات
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// تسجيل دخول البوت
client.login(process.env.TOKEN)
    .then(() => console.log('✅ تم تسجيل الدخول بنجاح!'))
    .catch(err => console.error('❌ فشل تسجيل الدخول:', err));

// تنظيف التقارير القديمة كل 12 ساعة
setInterval(() => {
    console.log('🧹 بدء تنظيف التقارير القديمة...');
    cleanupOldReports(client);
}, 12 * 60 * 60 * 1000); // كل 12 ساعة