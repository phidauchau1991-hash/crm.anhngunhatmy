const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'app', 'students', '[id]', 'page.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Thêm import
if (!content.includes('CoursewareStudentAction')) {
  content = content.replace(
    'import TuitionNoticeAction from "./TuitionNoticeAction";',
    'import TuitionNoticeAction from "./TuitionNoticeAction";\nimport CoursewareStudentAction from "./CoursewareStudentAction";'
  );
}

// 2. Thêm button component dưới TuitionNoticeAction
if (!content.includes('<CoursewareStudentAction')) {
  content = content.replace(
    '<TuitionNoticeAction student={student} />',
    '<TuitionNoticeAction student={student} />\n              <CoursewareStudentAction student={{ ...student, portalToken: encryptedToken }} classInfo={student.enrollments?.[0]?.class} />'
  );
}

fs.writeFileSync(file, content, 'utf8');
console.log('✅ Đã tích hợp CoursewareStudentAction vào trang chi tiết học viên students/[id]/page.js!');
