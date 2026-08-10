const xlsx = require('xlsx');
const path = require('path');

const filePath = 'd:\\2. TÀI LIỆU LỖI THỜI\\4. CRM NHẬT MỸ\\File_Mau_Import_NhatMy. M3 24.xlsx';
const workbook = xlsx.readFile(filePath);

console.log("=== SHEETS IN EXCEL FILE ===");
console.log(workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n--- SHEET: ${sheetName} ---`);
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  console.log(data);
});
