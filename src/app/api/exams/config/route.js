import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET all exam configs
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const examType = searchParams.get('examType');

    const whereClause = {};
    if (level) whereClause.level = level;
    if (examType) whereClause.examType = examType;

    const configs = await prisma.examConfig.findMany({
      where: whereClause,
      orderBy: [{ level: 'asc' }, { examType: 'asc' }],
    });

    return NextResponse.json({ success: true, data: configs });
  } catch (error) {
    console.error('Lỗi khi lấy cấu hình thi:', error);
    return NextResponse.json({ success: false, error: 'Không thể lấy dữ liệu cấu hình thi' }, { status: 500 });
  }
}

// POST create or update an exam config
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      id,
      level,
      examType,
      processWeight,
      examWeight,
      speakingWeight,
      speakingMax,
      listeningWeight,
      listeningMax,
      rwWeight,
      rwMax,
    } = body;

    if (!level || !examType) {
      return NextResponse.json({ success: false, error: 'Thiếu cấp độ hoặc loại kỳ thi' }, { status: 400 });
    }

    const parseWeight = (val, defaultVal) => {
      if (val === undefined || val === null || val === '') return defaultVal;
      const num = parseFloat(val);
      return Number.isFinite(num) ? num : NaN;
    };

    const pw = parseWeight(processWeight, 10);
    const ew = parseWeight(examWeight, 90);
    const sw = parseWeight(speakingWeight, 30);
    const sm = parseWeight(speakingMax, 40);
    const lw = parseWeight(listeningWeight, 20);
    const lm = parseWeight(listeningMax, 26);
    const rww = parseWeight(rwWeight, 40);
    const rwm = parseWeight(rwMax, 36);

    if ([pw, ew, sw, sm, lw, lm, rww, rwm].some(v => !Number.isFinite(v) || v < 0)) {
      return NextResponse.json({ success: false, error: 'Các giá trị trọng số và điểm tối đa phải là số >= 0' }, { status: 400 });
    }
    if (Math.abs((pw + ew) - 100) > 0.01) {
      return NextResponse.json({ success: false, error: `Tổng Trọng số Quá trình (${pw}%) + Bài thi (${ew}%) phải bằng 100% (hiện tại: ${pw + ew}%)` }, { status: 400 });
    }
    if (Math.abs((sw + lw + rww) - ew) > 0.01) {
      return NextResponse.json({ success: false, error: `Tổng trọng số Nói (${sw}%) + Nghe (${lw}%) + Đọc Viết (${rww}%) phải bằng Trọng số Bài thi (${ew}%)` }, { status: 400 });
    }
    if ((sw > 0 && sm <= 0) || (lw > 0 && lm <= 0) || (rww > 0 && rwm <= 0)) {
      return NextResponse.json({ success: false, error: 'Điểm tối đa của kỹ năng có trọng số > 0% phải lớn hơn 0' }, { status: 400 });
    }

    const weightFields = {
      processWeight: pw,
      examWeight: ew,
      speakingWeight: sw,
      speakingMax: sm,
      listeningWeight: lw,
      listeningMax: lm,
      rwWeight: rww,
      rwMax: rwm,
    };

    let config;
    if (id) {
      // Update
      config = await prisma.examConfig.update({
        where: { id: parseInt(id) },
        data: {
          level,
          examType,
          ...weightFields,
        },
      });
    } else {
      // Create or Update based on level & examType unique constraint
      config = await prisma.examConfig.upsert({
        where: {
          level_examType: {
            level,
            examType,
          },
        },
        update: weightFields,
        create: {
          level,
          examType,
          ...weightFields,
        },
      });
    }

    return NextResponse.json({ success: true, data: config, message: 'Đã lưu cấu hình thành công' });
  } catch (error) {
    console.error('Lỗi khi lưu cấu hình thi:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
