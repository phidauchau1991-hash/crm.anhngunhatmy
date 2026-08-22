const Database = require('better-sqlite3');

function run() {
  const db = new Database('./dev.db');
  
  console.log('=== TASK 2: XÓA HÓA ĐƠN TRÙNG LẶP CỦA AN NHIÊN ===');
  
  // Bùi Lê An Nhiên có 2 hóa đơn cho S3: ORD_TR_2608_033 (chuyển lớp - đúng) và ORD_2608_033 (xếp lớp khởi điểm - sai/trùng)
  // Ta sẽ xóa ORD_2608_033
  
  const delOrder = db.prepare("DELETE FROM OrderFinance WHERE id = 'ORD_2608_033' AND studentId = 'HV2607_033'").run();
  console.log('Xóa hóa đơn lỗi:', delOrder.changes, 'hóa đơn');
  
  // Kiểm tra lại
  const orders = db.prepare("SELECT id, feeToPay FROM OrderFinance WHERE studentId = 'HV2607_033'").all();
  console.log('Các hóa đơn hiện tại của Bùi Lê An Nhiên:', orders);
  
  db.close();
}
run();
