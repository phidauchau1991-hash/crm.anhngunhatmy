const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'components', 'CoursewareNoticeModal.js');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'zIndex: 9999,',
  'zIndex: 99999,'
);

// Fallback tên học viên
content = content.replace(
  /{activeStudent\?\.name}/g,
  '{activeStudent?.name || activeStudent?.fullName || "Học viên"}'
);

fs.writeFileSync(file, content, 'utf8');
console.log('✅ Đã cập nhật zIndex và tên fallback cho CoursewareNoticeModal!');
