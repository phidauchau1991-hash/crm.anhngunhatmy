const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'app', 'api', 'classes', '[code]', 'portal', 'route.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Thêm encryptStudentId import
if (!content.includes('encryptStudentId')) {
  content = content.replace(
    "import prisma from '@/lib/db';",
    "import prisma from '@/lib/db';\nimport { encryptStudentId } from '@/lib/token';"
  );
}

// 2. Cập nhật processStudent
const oldTarget = `    // Helper to calculate student stats
    const processStudent = (id, name, isTrial) => {
      let totalAbsent = 0;
      let totalWb = 0;
      let totalVideo = 0;
      
      const studentAttendances = attendances.filter(a => isTrial ? a.leadId === id : a.studentId === id);
      
      matrix[id] = {};
      
      studentAttendances.forEach(a => {
        const dateStr = new Date(a.date).toISOString();
        matrix[id][dateStr] = {
          status: a.status,
          missingWb: a.missingWb,
          missingVideo: a.missingVideo,
          copyError: a.copyError,
          teacherNotes: a.teacherNotes
        };
        
        if (a.status === 'Vắng không phép' || a.status === 'Vắng có phép' || a.status === 'Nghỉ có phép') {
          totalAbsent++;
        }
        if (a.missingWb) totalWb++;
        if (a.missingVideo) totalVideo++;
      });
      
      studentsData.push({
        id,
        name,
        isTrial,
        totalAbsent,
        totalWb,
        totalVideo,
        isHistorical: !isTrial && !enrolledIds.has(id) // Đánh dấu học viên đã chuyển lớp/nghỉ
      });
    };

    allStudents.forEach(s => processStudent(s.id, s.name, false));
    trialLeads.forEach(l => processStudent(l.id, l.name, true));`;

const newCode = `    // Helper to calculate student stats
    const processStudent = (s, isTrial) => {
      const id = s.id;
      const name = s.name;
      let totalAbsent = 0;
      let totalWb = 0;
      let totalVideo = 0;
      
      const studentAttendances = attendances.filter(a => isTrial ? a.leadId === id : a.studentId === id);
      
      matrix[id] = {};
      
      studentAttendances.forEach(a => {
        const dateStr = new Date(a.date).toISOString();
        matrix[id][dateStr] = {
          status: a.status,
          missingWb: a.missingWb,
          missingVideo: a.missingVideo,
          copyError: a.copyError,
          teacherNotes: a.teacherNotes
        };
        
        if (a.status === 'Vắng không phép' || a.status === 'Vắng có phép' || a.status === 'Nghỉ có phép') {
          totalAbsent++;
        }
        if (a.missingWb) totalWb++;
        if (a.missingVideo) totalVideo++;
      });
      
      studentsData.push({
        id,
        name,
        phone: s.phone || '',
        classCode: classCode,
        level: classInfo?.level || '',
        status: s.status || (isTrial ? 'Học thử' : 'Đang học'),
        customBookCodes: s.customBookCodes || null,
        retainCoursewareAccess: Boolean(s.retainCoursewareAccess),
        portalToken: !isTrial && id ? encryptStudentId(id) : '',
        isTrial,
        totalAbsent,
        totalWb,
        totalVideo,
        isHistorical: !isTrial && !enrolledIds.has(id) // Đánh dấu học viên đã chuyển lớp/nghỉ
      });
    };

    allStudents.forEach(s => processStudent(s, false));
    trialLeads.forEach(l => processStudent(l, true));`;

if (content.includes('allStudents.forEach(s => processStudent(s.id, s.name, false));')) {
  content = content.replace(oldTarget, newCode);
  console.log('✅ Đã cập nhật processStudent trong class portal API!');
} else {
  console.log('⚠️ processStudent đã được cập nhật trước đó hoặc không khớp.');
}

fs.writeFileSync(file, content, 'utf8');
console.log('Hoàn tất patch class portal API route!');
