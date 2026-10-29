import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { CAMBRIDGE_CONFIG, DEFAULT_LEVELS_CONFIG, formatHotline } from '@/lib/cambridgeHelper';

// GET: Lấy danh sách toàn bộ các Đợt thi Cambridge kèm thống kê KPI
export async function GET() {
  try {
    const batches = await prisma.cambridgeExamBatch.findMany({
      orderBy: { examDate: 'desc' },
      include: {
        registrations: {
          select: {
            id: true,
            fee: true,
            paymentStatus: true,
            receiptSentAt: true,
            level: true
          }
        }
      }
    });

    const formattedBatches = batches.map(batch => {
      const totalCandidates = batch.registrations.length;
      const paidCandidates = batch.registrations.filter(r => r.paymentStatus === 'DA_DONG').length;
      const unpaidCandidates = totalCandidates - paidCandidates;
      const totalCollected = batch.registrations
        .filter(r => r.paymentStatus === 'DA_DONG')
        .reduce((sum, r) => sum + (r.fee || 0), 0);
      const totalExpected = batch.registrations.reduce((sum, r) => sum + (r.fee || 0), 0);
      const receiptsSentCount = batch.registrations.filter(r => r.receiptSentAt !== null).length;

      // Phân bổ theo từng cấp độ
      const levelCounts = {
        STARTERS: batch.registrations.filter(r => r.level === 'STARTERS').length,
        MOVERS: batch.registrations.filter(r => r.level === 'MOVERS').length,
        FLYERS: batch.registrations.filter(r => r.level === 'FLYERS').length,
        KET: batch.registrations.filter(r => r.level === 'KET').length,
        PET: batch.registrations.filter(r => r.level === 'PET').length,
      };

      // Đảm bảo levelsConfig parse được
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

      return {
        id: batch.id,
        title: batch.title,
        examDate: batch.examDate,
        registrationDeadline: batch.registrationDeadline,
        closeHour: batch.closeHour || '17:00',
        hotline: batch.hotline || CAMBRIDGE_CONFIG.HOTLINE_CHUAN,
        authorizedCenter: batch.authorizedCenter || 'VN120',
        companyName: batch.companyName || CAMBRIDGE_CONFIG.TEN_CONG_TY,
        centerName: batch.centerName || CAMBRIDGE_CONFIG.TEN_TRUNG_TAM,
        bankAccount: batch.bankAccount || CAMBRIDGE_CONFIG.SO_TAI_KHOAN,
        bankAccountName: batch.bankAccountName || CAMBRIDGE_CONFIG.TEN_TAI_KHOAN_QR,
        bankName: batch.bankName || CAMBRIDGE_CONFIG.NGAN_HANG,
        levelsConfig: parsedLevelsConfig,
        status: batch.status,
        notes: batch.notes,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
        stats: {
          totalCandidates,
          paidCandidates,
          unpaidCandidates,
          totalCollected,
          totalExpected,
          receiptsSentCount,
          levelCounts
        }
      };
    });

    return NextResponse.json({ success: true, batches: formattedBatches });
  } catch (error) {
    console.error('Error fetching Cambridge batches:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi khi tải danh sách đợt thi' }, { status: 500 });
  }
}

// POST: Tạo mới một đợt thi Cambridge
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title,
      examDate,
      registrationDeadline,
      closeHour = '17:00',
      hotline = CAMBRIDGE_CONFIG.HOTLINE_CHUAN,
      authorizedCenter = CAMBRIDGE_CONFIG.DON_VI_UY_QUYEN,
      companyName = CAMBRIDGE_CONFIG.TEN_CONG_TY,
      centerName = CAMBRIDGE_CONFIG.TEN_TRUNG_TAM,
      bankAccount = CAMBRIDGE_CONFIG.SO_TAI_KHOAN,
      bankAccountName = CAMBRIDGE_CONFIG.TEN_TAI_KHOAN_QR,
      bankName = CAMBRIDGE_CONFIG.NGAN_HANG,
      levelsConfig,
      status = 'OPEN',
      notes = ''
    } = body;

    if (!title || !examDate || !registrationDeadline) {
      return NextResponse.json({
        success: false,
        error: 'Vui lòng điền đầy đủ Tiêu đề, Ngày thi và Hạn chót đăng ký'
      }, { status: 400 });
    }

    const configToSave = typeof levelsConfig === 'object' 
      ? JSON.stringify(levelsConfig) 
      : (levelsConfig || JSON.stringify(DEFAULT_LEVELS_CONFIG));

    const newBatch = await prisma.cambridgeExamBatch.create({
      data: {
        title: title.trim(),
        examDate: new Date(examDate),
        registrationDeadline: new Date(registrationDeadline),
        closeHour: closeHour.trim(),
        hotline: formatHotline(hotline),
        authorizedCenter: authorizedCenter.trim(),
        companyName: companyName.trim(),
        centerName: centerName.trim(),
        bankAccount: bankAccount.trim(),
        bankAccountName: bankAccountName.trim(),
        bankName: bankName.trim(),
        levelsConfig: configToSave,
        status,
        notes: notes ? notes.trim() : null
      }
    });

    return NextResponse.json({ success: true, batch: newBatch });
  } catch (error) {
    console.error('Error creating Cambridge batch:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi khi tạo đợt thi' }, { status: 500 });
  }
}
