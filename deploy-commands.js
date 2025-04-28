const { REST, Routes } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

// تجهيز الأوامر
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data) {
        commands.push(command.data.toJSON());
    } else {
        console.warn(`⚠️ ملف ${file} لا يحتوي على 'data'. تم تجاهله.`);
    }
}

// إنشاء REST Client
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// نشر الأوامر
(async () => {
    try {
        console.log('⏳ جاري تسجيل أوامر السلاش...');

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );

        console.log('✅ تم تسجيل جميع أوامر السلاش بنجاح!');
    } catch (error) {
        console.error('❌ حدث خطأ أثناء تسجيل الأوامر:', error);
    }
})();