import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as XLSX from 'xlsx';
import { CAMBRIDGE_CONFIG } from '@/lib/cambridgeHelper';

// GET: Xuất danh sách thí sinh dự thi Cambridge chuẩn hóa biểu mẫu nộp Hội đồng VN120 (.xlsx)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const filter = searchParams.get('filter') || 'all'; // 'paid', 'all'

    if (!batchId) {
      return NextResponse.json({ success: false, error: 'Vui lòng cung cấp batchId' }, { status: 400 });
    }

    const batch = await prisma.cambridgeExamBatch.findUnique({
      where: { id: batchId },
      include: {
        registrations: {
          orderBy: [
            { level: 'asc' },
            { fullNameNoTone: 'asc' }
          ]
        }
      }
    });

    if (!batch) {
      return NextResponse.json({ success: false, error: 'Đợt thi không tồn tại' }, { status: 404 });
    }

    let candidates = batch.registrations;
    if (filter === 'paid') {
      candidates = candidates.filter(c => c.paymentStatus === 'DA_DONG');
    }

    const examDateFormatted = batch.examDate
      ? new Date(batch.examDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '';

    const dateFileStr = batch.examDate
      ? new Date(batch.examDate).toISOString().slice(0, 10).replace(/-/g, '')
      : 'export';

    // Tạo các dòng dữ liệu theo tiêu chuẩn Hội đồng khảo thí VN120
    const rows = [
      ['DANH SÁCH THÍ SINH ĐĂNG KÝ DỰ THI CHỨNG CHỈ CAMBRIDGE QUỐC TẾ'],
      [`Hội đồng khảo thí ủy quyền: ${batch.authorizedCenter || 'VN120'} | Đơn vị đăng ký: ${batch.centerName || CAMBRIDGE_CONFIG.TEN_TRUNG_TAM}`],
      [`Đợt thi: ${batch.title} - Ngày thi chính thức: ${examDateFormatted} - Hotline: ${batch.hotline || CAMBRIDGE_CONFIG.HOTLINE_CHUAN}`],
      [], // Dòng trống ngăn cách
      [
        'STT',
        'Họ và tên không dấu (Chuẩn Cambridge)',
        'Họ và tên thí sinh (Tiếng Việt)',
        'Giới tính',
        'Ngày sinh (dd/MM/yyyy)',
        'Cấp độ dự thi',
        'Số điện thoại phụ huynh',
        'Email phụ huynh',
        'Lệ phí dự thi (VNĐ)',
        'Tình trạng thanh toán',
        'Mã biên lai điện tử',
        'Ghi chú đăng ký'
      ]
    ];

    candidates.forEach((c, index) => {
      let genderVi = 'Nam';
      if (c.gender === 'FEMALE' || c.gender === 'NỮ' || c.gender === 'NU') {
        genderVi = 'Nữ';
      }

      const paymentStatusVi = c.paymentStatus === 'DA_DONG' ? 'Đã hoàn tất đóng phí' : 'Chưa đóng phí';

      rows.push([
        index + 1,
        c.fullNameNoTone || '',
        c.fullName || '',
        genderVi,
        c.dobStr ? `'${c.dobStr}` : (c.dob ? `'${new Date(c.dob).toLocaleDateString('vi-VN')}` : ''),
        c.level || '',
        c.parentPhone || '',
        c.parentEmail || '',
        c.fee || 0,
        paymentStatusVi,
        c.receiptCode || '',
        c.notes || 'Đã đăng ký trực tuyến'
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Căn chỉnh độ rộng cột tối ưu đọc trên Excel
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 32 }, // Họ và tên không dấu
      { wch: 28 }, // Họ và tên có dấu
      { wch: 10 }, // Giới tính
      { wch: 18 }, // Ngày sinh
      { wch: 14 }, // Cấp độ
      { wch: 18 }, // Số điện thoại
      { wch: 28 }, // Email
      { wch: 18 }, // Lệ phí
      { wch: 22 }, // Tình trạng thanh toán
      { wch: 22 }, // Mã biên lai
      { wch: 26 }, // Ghi chú
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_VN120");

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const safeBatchTitle = batch.title.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
    const fileName = `Danh_sach_Cambridge_VN120_${dateFileStr}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      }
    });
  } catch (error) {
    console.error('Error exporting VN120 excel:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi khi xuất file Excel VN120' }, { status: 500 });
  }
}
