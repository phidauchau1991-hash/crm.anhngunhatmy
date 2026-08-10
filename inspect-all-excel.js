const xlsx = require('xlsx');

const filePath = 'd:\\2. TÀI LIỆU LỖI THỜI\\4. CRM NHẬT MỸ\\File_Mau_Import_NhatMy. M3 24.xlsx';
const workbook = xlsx.readFile(filePath);

console.log('=== INSPECTING SHEET HỌC VIÊN ===');
const studentSheet = workbook.Sheets['Học Viên'];
const rows = xlsx.utils.sheet_to_json(studentSheet, { header: 1 });

rows.forEach((row, i) => {
  if (i === 0 || row.length === 0) return;
  const name = row[0];
  const cccd = row[1];
  const phone = row[2];
  const dob = row[3];
  const address = row[4];
  const classCode = row[5];
  const fee = row[6];
  const paid = row[7];
  const attended = row[8];

  console.log(`Row ${i}: Name: "${name}" | Phone: ${JSON.stringify(phone)} | Class: "${classCode}" | CCCD: ${cccd}`);
});
