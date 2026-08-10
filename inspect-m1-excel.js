const xlsx = require('xlsx');

const filePath = 'd:\\2. TÀI LIỆU LỖI THỜI\\4. CRM NHẬT MỸ\\File_Mau_Import_NhatMy. M3 24.xlsx';

const workbook = xlsx.readFile(filePath);
const studentSheet = workbook.Sheets['Học Viên'];
const rawRows = xlsx.utils.sheet_to_json(studentSheet, { header: 1 });

console.log('--- ALL RAW ROWS FOR M1 CLASS ---');
rawRows.forEach((row, idx) => {
  const rowStr = JSON.stringify(row);
  if (rowStr.includes('M1')) {
    console.log(`Row ${idx}:`, rowStr);
  }
});
