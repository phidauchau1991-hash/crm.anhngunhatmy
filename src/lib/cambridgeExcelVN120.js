import ExcelJS from 'exceljs';
import { removeVietnameseTones, CAMBRIDGE_CONFIG } from './cambridgeHelper.js';

/**
 * Tạo Workbook Excel chuẩn 100% biểu mẫu Hội đồng Khảo thí Cambridge VN120
 * Duy nhất 1 Sheet tên "DSHV" theo đúng chỉ đạo của Quản lý Trung tâm.
 */
export async function generateVN120ExcelBuffer({ batch, candidates = [] }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Trung Tâm Anh Ngữ Nhật Mỹ';
  wb.lastModifiedBy = 'Trung Tâm Anh Ngữ Nhật Mỹ';
  wb.created = new Date();
  wb.modified = new Date();

  const examDateFormatted = batch?.examDate
    ? new Date(batch.examDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  const centerName = batch?.centerName || CAMBRIDGE_CONFIG.TEN_TRUNG_TAM;

  // Thống kê số lượng từng cấp độ
  const counts = {
    STARTERS: 0,
    MOVERS: 0,
    FLYERS: 0,
    KET: 0,
    PET: 0,
    FCE: 0
  };

  candidates.forEach(c => {
    const lvl = (c.level || '').toUpperCase().trim();
    if (counts[lvl] !== undefined) {
      counts[lvl]++;
    } else {
      counts[lvl] = (counts[lvl] || 0) + 1;
    }
  });

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };

  // ==========================================
  // DUY NHẤT 1 SHEET: "DSHV" (Danh sách học viên)
  // ==========================================
  const ws = wb.addWorksheet('DSHV', {
    views: [{ showGridLines: true }]
  });

  ws.columns = [
    { key: 'stt', width: 7 },
    { key: 'name', width: 34 },
    { key: 'gender', width: 16 },
    { key: 'phone', width: 25 },
    { key: 'dob', width: 22 },
    { key: 'level', width: 26 },
    { key: 'note', width: 26 }
  ];

  // Dòng 1: Tiêu đề in hoa căn giữa
  const r1 = ws.getRow(1);
  r1.getCell(1).value = 'DANH SÁCH THÍ SINH THI ANH VĂN CAMBRIDGE';
  r1.getCell(1).font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FF000000' } };
  r1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.mergeCells('A1:G1');
  r1.height = 30;

  // Dòng 2: Tên trung tâm (Nhãn chữ đỏ đậm + Giá trị chữ đen đậm)
  const r2 = ws.getRow(2);
  r2.getCell(1).value = {
    richText: [
      { text: 'Tên Trung tâm: ', font: { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFF0000' } } },
      { text: centerName, font: { name: 'Arial', size: 12, bold: true, color: { argb: 'FF000000' } } }
    ]
  };
  r2.getCell(1).alignment = { vertical: 'middle' };
  ws.mergeCells('A2:G2');
  r2.height = 24;

  // Dòng 3: Ngày đăng ký thi (Nhãn chữ đỏ đậm + Ngày thi chữ đen đậm)
  const r3 = ws.getRow(3);
  r3.getCell(1).value = {
    richText: [
      { text: 'Ngày đăng ký thi: ', font: { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFF0000' } } },
      { text: examDateFormatted, font: { name: 'Arial', size: 12, bold: true, color: { argb: 'FF000000' } } }
    ]
  };
  r3.getCell(1).alignment = { vertical: 'middle' };
  ws.mergeCells('A3:G3');
  r3.height = 24;

  // Dòng 4: Cảnh báo bảo mật GDPR (chữ đỏ, tự động xuống dòng đầy đủ)
  const r4 = ws.getRow(4);
  r4.getCell(1).value = 'Lưu ý: Thông tin của thí sinh chỉ sử dụng cho mục đích đăng ký thi trên hệ thống Cambridge. Thông tin này sẽ được bảo mật và không cung cấp đến bên thứ ba theo luật pháp quốc tế (GDPR) ngày 25/05/2018.';
  r4.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFF0000' } };
  r4.getCell(1).alignment = { vertical: 'middle', wrapText: true };
  ws.mergeCells('A4:G4');
  r4.height = 32;

  // Dòng 5: Dòng trống
  ws.getRow(5).height = 10;

  // Dòng 6: Tiêu đề cột (In đậm, kẻ khung viền)
  const r6 = ws.getRow(6);
  r6.values = ['STT', 'HỌ VÀ TÊN', 'GIỚI TÍNH', 'THÔNG TIN LIÊN LẠC', 'NGÀY SINH', 'CẤP ĐỘ', 'GHI CHÚ'];
  r6.height = 25;
  for (let c = 1; c <= 7; c++) {
    const cell = r6.getCell(c);
    cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF000000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  }

  // Dòng 7: Hướng dẫn nhập liệu của VN120 (Màu đỏ, in nghiêng)
  const r7 = ws.getRow(7);
  r7.values = [
    '',
    '(Ghi đầy đủ họ và tên, viết IN, không dấu-Ví dụ: NGUYEN VAN AN)',
    '(Nam ghi MALE, Nữ ghi FEMALE)',
    '(Cung cấp số điện thoại, Đại diện trung tâm hoặc nhóm chỉ cần lấy chung 1 số)',
    "(thêm dấu ' để nhập đúng định dạng dd/mm/yyyy)",
    'STARTERS, MOVERS, FLYERS\nKET, PET, FCE',
    ''
  ];
  r7.height = 38;
  for (let c = 1; c <= 7; c++) {
    const cell = r7.getCell(c);
    cell.font = { name: 'Arial', size: 9, italic: true, bold: c === 6, color: { argb: 'FFFF0000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  }

  // Dòng 8 trở đi: Dữ liệu thí sinh thực tế
  let currentRow = 8;
  candidates.forEach((c, idx) => {
    const row = ws.getRow(currentRow);
    const fullNameNoTone = removeVietnameseTones(c.fullNameNoTone || c.fullName || '').toUpperCase();

    let gender = 'MALE';
    const g = (c.gender || '').toUpperCase().trim();
    if (g === 'FEMALE' || g === 'NỮ' || g === 'NU' || g === 'F') {
      gender = 'FEMALE';
    }

    const phone = c.parentPhone || batch?.hotline || CAMBRIDGE_CONFIG.HOTLINE_CHUAN;

    let dobStr = c.dobStr || '';
    if (!dobStr && c.dob) {
      dobStr = new Date(c.dob).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    const dobFormatted = dobStr ? `'${dobStr}` : '';

    const level = (c.level || '').toUpperCase().trim();
    const note = c.receiptCode ? `BL: ${c.receiptCode}` : (c.notes || '');

    row.values = [
      idx + 1,
      fullNameNoTone,
      gender,
      phone,
      dobFormatted,
      level,
      note
    ];
    row.height = 24;

    for (let col = 1; col <= 7; col++) {
      const cell = row.getCell(col);
      cell.font = { name: 'Arial', size: 10.5, color: { argb: 'FF000000' } };
      cell.border = thinBorder;
      cell.alignment = {
        horizontal: col === 2 ? 'left' : 'center',
        vertical: 'middle'
      };
    }
    currentRow++;
  });

  // Kẻ thêm các dòng trống có ô viền giống mẫu của VN120
  const emptyRowsToAdd = Math.max(4, 5 - candidates.length);
  for (let i = 0; i < emptyRowsToAdd; i++) {
    const row = ws.getRow(currentRow);
    row.height = 22;
    for (let col = 1; col <= 7; col++) {
      const cell = row.getCell(col);
      cell.border = thinBorder;
    }
    currentRow++;
  }

  // Dòng trống cách biệt
  currentRow++;

  // Khung lưu ý màu cam đào chuẩn VN120
  const noticeRow = ws.getRow(currentRow);
  noticeRow.getCell(1).value = 'LƯU Ý: NHẬP HỌ VÀ TÊN BẰNG CHỮ IN KHÔNG DẤU;\nKHI THÍ SINH ĐÃ ĐĂNG KÝ THI, VN120 SẼ KHÔNG HOÀN LẠI LỆ PHÍ, NGOẠI TRỪ TRƯỜNG HỢP LIÊN QUAN VẤN ĐỀ SỨC KHỎE CỦA THÍ SINH. (CÓ GIẤY XÁC NHẬN BỆNH VIỆN)';
  noticeRow.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000' } };
  noticeRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFCE4D6' } // Nền cam đào
  };
  noticeRow.getCell(1).alignment = { vertical: 'middle', wrapText: true };
  noticeRow.height = 44;
  ws.mergeCells(`A${currentRow}:G${currentRow}`);
  for (let col = 1; col <= 7; col++) {
    noticeRow.getCell(col).border = thinBorder;
  }
  currentRow++;

  // Dòng TỔNG CỘNG:
  const totalRow = ws.getRow(currentRow);
  totalRow.getCell(1).value = `TỔNG CỘNG: ${candidates.length} thí sinh`;
  totalRow.getCell(1).font = { name: 'Arial', size: 11, bold: true };
  totalRow.height = 22;
  currentRow++;

  // Thống kê chi tiết & Ký tên
  const stat1 = ws.getRow(currentRow);
  stat1.getCell(1).value = `STARTERS: ${counts.STARTERS}`;
  stat1.getCell(1).font = { name: 'Arial', size: 10.5, bold: true };
  currentRow++;

  const stat2 = ws.getRow(currentRow);
  stat2.getCell(1).value = `MOVERS: ${counts.MOVERS}`;
  stat2.getCell(1).font = { name: 'Arial', size: 10.5, bold: true };
  currentRow++;

  const stat3 = ws.getRow(currentRow);
  stat3.getCell(1).value = `FLYERS: ${counts.FLYERS}`;
  stat3.getCell(1).font = { name: 'Arial', size: 10.5, bold: true };
  stat3.getCell(5).value = 'Ngày ........ tháng ........ năm ........';
  stat3.getCell(5).font = { name: 'Arial', size: 10.5, italic: true };
  stat3.getCell(5).alignment = { horizontal: 'center' };
  ws.mergeCells(`E${currentRow}:F${currentRow}`);
  currentRow++;

  const stat4 = ws.getRow(currentRow);
  stat4.getCell(1).value = `KET: ${counts.KET}`;
  stat4.getCell(1).font = { name: 'Arial', size: 10.5, bold: true };
  stat4.getCell(5).value = 'Lập bởi';
  stat4.getCell(5).font = { name: 'Arial', size: 10.5, bold: true };
  stat4.getCell(5).alignment = { horizontal: 'center' };
  ws.mergeCells(`E${currentRow}:F${currentRow}`);
  currentRow++;

  const stat5 = ws.getRow(currentRow);
  stat5.getCell(1).value = `PET: ${counts.PET}`;
  stat5.getCell(1).font = { name: 'Arial', size: 10.5, bold: true };
  currentRow++;

  const signDuyet = ws.getRow(currentRow);
  signDuyet.getCell(1).value = 'Duyệt bởi';
  signDuyet.getCell(1).font = { name: 'Arial', size: 10.5, bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}
