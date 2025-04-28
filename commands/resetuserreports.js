const { SlashCommandBuilder } = require('discord.js');
const { readDatabase, writeDatabase } = require('../utils/database');
require('dotenv').config();

// دالة انتظار بسيطة
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetuserreports')
        .setDescription('🧹 تصفير تقارير مستخدم معين وحذف الروم الخاص به من كاتيجوري التقارير')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('📋 اختار المستخدم الذي تريد تصفير تقاريره')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const adminRoles = process.env.ADMIN_ROLES?.split(',') || [];

        if (!interaction.member.roles.cache.some(role => adminRoles.includes(role.id))) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية استخدام هذا الأمر.', flags: 64 });
        }

        const targetUser = interaction.options.getUser('user');
        const targetUserId = targetUser.id;

        try {
            await interaction.deferReply({ flags: 64 });

            // تصفير التقارير من قاعدة البيانات
            const db = readDatabase();

            if (!db.users || !db.users[targetUserId]) {
                return await interaction.editReply({ content: `❌ لا توجد تقارير محفوظة لهذا الشخص: <@${targetUserId}>.` });
            }

            db.users[targetUserId].reports = [];
            db.users[targetUserId].lastReportNumber = 0;
            writeDatabase(db);

            // حذف روم الشخص بناءً على الـ ID الموجود في topic الروم
            const categoryId = process.env.CATEGORY_ID;
            const category = interaction.guild.channels.cache.get(categoryId);

            if (!category) {
                return await interaction.editReply({ content: '❌ الكاتيجوري مش موجود أو مش مضبوط.' });
            }

            // ندور على الروم اللي الـ topic بتاعه يساوي ID الشخص
            const userChannel = interaction.guild.channels.cache.find(
                channel =>
                    channel.parentId === categoryId &&
                    channel.topic === targetUserId
            );

            if (userChannel) {
                await userChannel.delete().catch(error => {
                    console.error(`❌ فشل حذف الروم الخاص بالمستخدم:`, error.message);
                });

                await interaction.editReply({ content: `✅ تم تصفير تقارير <@${targetUserId}> وحذف رومه من الكاتيجوري.` });
            } else {
                await interaction.editReply({ content: `⚠️ لم يتم العثور على روم خاص بـ <@${targetUserId}> بناءً على الوصف (topic).` });
            }

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