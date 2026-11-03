import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateVN120ExcelBuffer } from '@/lib/cambridgeExcelVN120';

// GET: Xuất danh sách thí sinh dự thi Cambridge chuẩn hóa 100% biểu mẫu Hội đồng VN120 (.xlsx)
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

    const dateFileStr = batch.examDate
      ? new Date(batch.examDate).toISOString().slice(0, 10).replace(/-/g, '')
      : 'export';

    // Tạo Buffer Excel có đầy đủ màu sắc, viền ô borders bằng ExcelJS
    const buffer = await generateVN120ExcelBuffer({ batch, candidates });
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
