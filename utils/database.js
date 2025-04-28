const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.json');

// تأكد من وجود الملف
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ users: {} }, null, 2));
}

function readDatabase() {
    try {
        const data = fs.readFileSync(dbPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ خطأ أثناء قراءة قاعدة البيانات:', error);
        return { users: {} };
    }
}

function writeDatabase(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ خطأ أثناء كتابة قاعدة البيانات:', error);
    }
}

async function saveReport(authorId, accusedId, itemType, ticketNumber, reason) {
    if (!authorId || !accusedId || !itemType) {
        throw new Error('❌ جميع الحقول الأساسية مطلوبة لحفظ التقرير.');
    }

    const db = readDatabase();

    if (!db.users) {
        db.users = {};
    }

    if (!db.users[authorId]) {
        db.users[authorId] = { lastReportNumber: 0, reports: [] };
    }

    db.users[authorId].lastReportNumber += 1;

    const report = {
        id: db.users[authorId].lastReportNumber,
        authorId,
        accusedId,
        itemType,
        ticketNumber: ticketNumber || 'غير محدد',
        reason: reason || '',
        status: 'pending', // الحالة الافتراضية للتقرير
        date: new Date().toISOString(),
    };

    db.users[authorId].reports.push(report);
    writeDatabase(db);

    return report.id;
}

function migrateOldDatabase() {
    const db = readDatabase();

    if (db.lastReportNumber !== undefined && Array.isArray(db.reports)) {
        console.log('🔄 جاري ترقية قاعدة البيانات للنظام الجديد...');

        const newDb = { users: {} };

        for (const report of db.reports) {
            const authorId = report.authorId;

            if (!newDb.users[authorId]) {
                newDb.users[authorId] = {
                    lastReportNumber: 0,
                    reports: []
                };
            }

            newDb.users[authorId].lastReportNumber += 1;

            const newReport = {
                id: newDb.users[authorId].lastReportNumber,
                authorId: report.authorId,
                accusedId: report.accusedId,
                itemType: report.itemType,
                ticketNumber: report.ticketNumber || 'غير محدد',
                reason: report.reason || '',
                status: report.status || 'pending',
                date: report.date,
            };

            newDb.users[authorId].reports.push(newReport);
        }

        writeDatabase(newDb);
        console.log('✅ تم ترقية قاعدة البيانات بنجاح!');
    } else {
        console.log('✅ قاعدة البيانات بالفعل بالنظام الجديد. لا حاجة للترقية.');
    }
}

module.exports = { saveReport, migrateOldDatabase, readDatabase, writeDatabase };