import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { CAMBRIDGE_CONFIG, DEFAULT_LEVELS_CONFIG, formatHotline } from '@/lib/cambridgeHelper';

// GET: Lấy thông tin công khai của đợt thi Cambridge cho phụ huynh đăng ký
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    let batch = null;
    if (batchId) {
      batch = await prisma.cambridgeExamBatch.findUnique({
        where: { id: batchId }
      });
    } else {
      // Nếu không truyền batchId, lấy đợt thi đang mở gần nhất
      batch = await prisma.cambridgeExamBatch.findFirst({
        where: { status: 'OPEN' },
        orderBy: { examDate: 'asc' }
      });

      // Nếu không có đợt nào OPEN, lấy đợt thi mới nhất
      if (!batch) {
        batch = await prisma.cambridgeExamBatch.findFirst({
          orderBy: { examDate: 'desc' }
        });
      }
    }

    if (!batch) {
      return NextResponse.json({
        success: false,
        error: 'Hiện tại chưa có đợt thi Cambridge nào được mở đăng ký.'
      }, { status: 404 });
    }

    // Kiểm tra hạn chót
    let isClosed = batch.status !== 'OPEN';
    let deadlineDateTime = null;

    if (batch.registrationDeadline) {
      const deadline = new Date(batch.registrationDeadline);
      const [hours, minutes] = (batch.closeHour || '17:00').split(':').map(n => parseInt(n, 10) || 0);
      deadline.setHours(hours, minutes, 59, 999);
      deadlineDateTime = deadline;

      if (new Date() > deadline) {
        isClosed = true;
      }
    }

    let parsedLevelsConfig = DEFAULT_LEVELS_CONFIG;
    try {
      if (typeof batch.levelsConfig === 'string') {
        parsedLevelsConfig = JSON.parse(batch.levelsConfig);
      } else if (batch.levelsConfig && typeof batch.levelsConfig === 'object') {
        parsedLevelsConfig = batch.levelsConfig;
      }
    } catch (e) {
      parsedLevelsConfig = DEFAULT_LEVELS_CONFIG;
    }

    const examDateFormatted = batch.examDate
      ? new Date(batch.examDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '';

    const deadlineFormatted = batch.registrationDeadline
      ? `${batch.closeHour || '17:00'} ngày ${new Date(batch.registrationDeadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
      : '';

    return NextResponse.json({
      success: true,
      batch: {
        id: batch.id,
        title: batch.title,
        examDate: batch.examDate,
        examDateFormatted,
        registrationDeadline: batch.registrationDeadline,
        deadlineFormatted,
        closeHour: batch.closeHour || '17:00',
        hotline: formatHotline(batch.hotline),
        authorizedCenter: batch.authorizedCenter || 'VN120',
        centerName: batch.centerName || CAMBRIDGE_CONFIG.TEN_TRUNG_TAM,
        companyName: batch.companyName || CAMBRIDGE_CONFIG.TEN_CONG_TY,
        bankAccount: batch.bankAccount || CAMBRIDGE_CONFIG.SO_TAI_KHOAN,
        bankAccountName: batch.bankAccountName || CAMBRIDGE_CONFIG.TEN_TAI_KHOAN_QR,
        bankName: batch.bankName || CAMBRIDGE_CONFIG.NGAN_HANG,
        levelsConfig: parsedLevelsConfig,
        status: batch.status,
        isClosed
      }
    });
  } catch (error) {
    console.error('Error fetching public batch:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tải thông tin đợt thi' }, { status: 500 });
  }
}
