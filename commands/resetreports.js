const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { readDatabase, writeDatabase } = require('../utils/database');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetreports')
        .setDescription('🧹 تصفير قاعدة البيانات وحذف جميع رومات التقارير (خاص بالإدارة فقط)'),

    async execute(interaction, client) {
        const adminRoles = process.env.ADMIN_ROLES?.split(',') || [];

        if (!interaction.member.roles.cache.some(role => adminRoles.includes(role.id))) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية استخدام هذا الأمر.', flags: 64 });
        }

        try {
            await interaction.deferReply({ flags: 64 });

            await interaction.editReply({ content: '⌛ جاري تصفير قاعدة البيانات وحذف رومات التقارير...' });

            const db = readDatabase();

            if (!db.users || Object.keys(db.users).length === 0) {
                return await interaction.editReply({ content: '❌ لا توجد أي تقارير في قاعدة البيانات.' });
            }

            for (const userId in db.users) {
                db.users[userId].reports = [];
                db.users[userId].lastReportNumber = 0;
            }
            writeDatabase(db);

            const categoryId = process.env.CATEGORY_ID;
            const category = interaction.guild.channels.cache.get(categoryId);
            if (!category) {
                return await interaction.editReply({ content: '❌ الكاتيجوري غير موجود أو مش مضبوط في .env' });
            }

            const reportChannels = interaction.guild.channels.cache.filter(
                channel => channel.parentId === categoryId && channel.type === ChannelType.GuildText
            );

            for (const [, channel] of reportChannels) {
                await channel.delete().catch(error => {
                    console.error(`❌ فشل حذف الروم ${channel.id}:`, error.message);
                });
            }

            await interaction.editReply({ content: '✅ تم تصفير قاعدة البيانات وحذف كل رومات التقارير بنجاح.' });

        } catch (error) {
            console.error('❌ حصل خطأ أثناء تنفيذ الأمر:', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: '❌ حصل خطأ أثناء تنفيذ الأمر.' });
            } else {
                await interaction.reply({ content: '❌ حصل خطأ أثناء تنفيذ الأمر.', flags: 64 });
            }
        }
    },
};