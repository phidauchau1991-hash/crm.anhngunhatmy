const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'app', 'finance', 'monthly', 'page.js');
let content = fs.readFileSync(file, 'utf8');

// Ưu tiên previewTemplateRef thay vì hiddenPrintRef
content = content.replace(
  /const el = hiddenPrintRef\.current \|\| previewTemplateRef\.current;/g,
  'const el = previewTemplateRef.current || hiddenPrintRef.current;'
);

// Cho phép allowTaint và bắt lỗi chụp ảnh chi tiết hơn
content = content.replace(
  'allowTaint: false,',
  'allowTaint: true,'
);

content = content.replace(
  "left: '-99999px',",
  "left: '0',\n            opacity: 0,"
);

fs.writeFileSync(file, content, 'utf8');
console.log('✅ Đã sửa lỗi chụp ảnh thư báo học phí tháng thành công!');
