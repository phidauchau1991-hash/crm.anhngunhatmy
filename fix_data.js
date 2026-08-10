const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const Database = require('better-sqlite3');

const db = new Database('./prisma/crm.db');
const adapter = new PrismaBetterSqlite3(db);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    // 1. Fix Class S1: CN1_S1_MsMy_7CN_Ca4
    // Missing a day before Aug 1. Let's find missing T7 or CN.
    const s1Code = 'CN1_S1_MsMy_7CN_Ca4';
    const s1Sessions = await prisma.classSession.findMany({
      where: { classCode: s1Code },
      orderBy: { date: 'asc' }
    });
    
    // Convert to YYYY-MM-DD
    const s1Dates = s1Sessions.map(s => s.dateStr);
    console.log('S1 Dates:', s1Dates);
    
    // Generate expected dates from July 11 (Session 1)
    let s1Expected = [];
    let d = new Date('2026-07-11T00:00:00Z');
    while (s1Expected.length < 11) {
      if (d.getDay() === 0 || d.getDay() === 6) {
        s1Expected.push(d.toISOString().substring(0, 10));
      }
      d.setDate(d.getDate() + 1);
    }
    console.log('S1 Expected:', s1Expected);
    
    const missingS1 = s1Expected.find(x => !s1Dates.includes(x));
    console.log('Missing S1:', missingS1);
    
    if (missingS1) {
      // Find students
      const studentsS1 = await prisma.classStudent.findMany({ where: { classCode: s1Code } });
      const teacherInfo = await prisma.class.findUnique({ where: { code: s1Code } });
      
      const newSession = await prisma.classSession.create({
        data: {
          classCode: s1Code,
          date: new Date(missingS1 + 'T00:00:00Z'),
          dateStr: missingS1,
          teacherId: teacherInfo?.teacherId,
          isSubstitute: false
        }
      });
      
      for (const st of studentsS1) {
        await prisma.attendance.create({
          data: {
            sessionId: newSession.id,
            studentId: st.studentId,
            leadId: st.leadId,
            status: 'Có mặt',
            isTrial: false
          }
        });
      }
      console.log('Inserted missing session for S1:', missingS1);
    }
    
    // Recalculate S1 session indices
    const s1SessionsAll = await prisma.classSession.findMany({
      where: { classCode: s1Code },
      orderBy: { date: 'asc' }
    });
    for (let i = 0; i < s1SessionsAll.length; i++) {
      await prisma.classSession.update({
        where: { id: s1SessionsAll[i].id },
        data: { sessionIndex: i + 1 }
      });
    }

    // 2. Fix Class M2 end date
    // Find M2 class
    const m2Class = await prisma.class.findFirst({
      where: { code: { startsWith: 'CN1_M2_' } }
    });
    if (m2Class) {
      await prisma.class.update({
        where: { code: m2Class.code },
        data: { expectedEndDate: new Date('2026-08-20T00:00:00Z') }
      });
      console.log('Updated M2 Class end date to 20/08/2026 for', m2Class.code);
    }

    // 3. Fix Class M3: CN1_M3_MsMy_24_01 missing 27/07
    const m3Code = 'CN1_M3_MsMy_24_01';
    const missingM3 = '2026-07-27';
    
    const m3Exists = await prisma.classSession.findFirst({
      where: { classCode: m3Code, dateStr: missingM3 }
    });
    
    if (!m3Exists) {
      const studentsM3 = await prisma.classStudent.findMany({ where: { classCode: m3Code } });
      const teacherInfoM3 = await prisma.class.findUnique({ where: { code: m3Code } });
      
      const newSessionM3 = await prisma.classSession.create({
        data: {
          classCode: m3Code,
          date: new Date(missingM3 + 'T00:00:00Z'),
          dateStr: missingM3,
          teacherId: teacherInfoM3?.teacherId,
          isSubstitute: false
        }
      });
      
      for (const st of studentsM3) {
        await prisma.attendance.create({
          data: {
            sessionId: newSessionM3.id,
            studentId: st.studentId,
            leadId: st.leadId,
            status: 'Có mặt',
            isTrial: false
          }
        });
      }
      console.log('Inserted missing session for M3:', missingM3);
    }
    
    // Recalculate M3 session indices
    const m3SessionsAll = await prisma.classSession.findMany({
      where: { classCode: m3Code },
      orderBy: { date: 'asc' }
    });
    for (let i = 0; i < m3SessionsAll.length; i++) {
      await prisma.classSession.update({
        where: { id: m3SessionsAll[i].id },
        data: { sessionIndex: i + 1 }
      });
    }

    console.log('Done fixing data!');
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
