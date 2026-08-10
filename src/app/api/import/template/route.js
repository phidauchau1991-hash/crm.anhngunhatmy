import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

export async function GET() {
  try {
    const wb = xlsx.utils.book_new();

    // 1. Sheet Lớp Học
    const classData = [
      {
        'Mã lớp': 'CN1_S1_MsMy_35_01',
        'Khóa học': 'S1',
        'Giáo viên': 'Ms My',
        'Ngày khai giảng': '01/06/2026',
        'Lịch học tuần': '35',
        'Số buổi đã học thực tế': '10'
      },
      {
        'Mã lớp': 'CN1_S2_MrDau_7CN_01',
        'Khóa học': 'S2',
        'Giáo viên': 'Mr Dau',
        'Ngày khai giảng': '15/06/2026',
        'Lịch học tuần': '7CN',
        'Số buổi đã học thực tế': '5'
      }
    ];
    const wsClass = xlsx.utils.json_to_sheet(classData);
    xlsx.utils.book_append_sheet(wb, wsClass, 'Lớp Học');

    // 2. Sheet Học Viên
    const studentData = [
      {
        'Họ và Tên': 'Nguyễn Văn An',
        'CCCD / Định danh': '079201004567',
        'Số điện thoại': '0901234567',
        'Ngày sinh': '15/05/2015',
        'Địa chỉ': '123 Đường 3/2, Quận 10, TPHCM',
        'Mã lớp xếp vào': 'CN1_S1_MsMy_35_01',
        'Học phí thỏa thuận': '3000000',
        'Số tiền đã đóng': '2000000',
        'Số buổi đã đi học': '8'
      },
      {
        'Họ và Tên': 'Trần Thị Bình',
        'CCCD / Định danh': '079201009876',
        'Số điện thoại': '0987654321',
        'Ngày sinh': '20/10/2016',
        'Địa chỉ': '456 Lê Hồng Phong, Quận 5, TPHCM',
        'Mã lớp xếp vào': 'CN1_S2_MrDau_7CN_01',
        'Học phí thỏa thuận': '3150000',
        'Số tiền đã đóng': '3150000',
        'Số buổi đã đi học': '5'
      }
    ];
    const wsStudent = xlsx.utils.json_to_sheet(studentData);
    xlsx.utils.book_append_sheet(wb, wsStudent, 'Học Viên');

    // Write to buffer
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="File_Mau_Import_NhatMy.xlsx"',
      },
    });
  } catch (error) {
    console.error('Lỗi khi tạo file mẫu Excel:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
