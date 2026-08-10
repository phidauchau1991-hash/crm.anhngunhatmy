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

    let config;
    if (id) {
      // Update
      config = await prisma.examConfig.update({
        where: { id: parseInt(id) },
        data: {
          level,
          examType,
          processWeight: parseFloat(processWeight) || 10,
          examWeight: parseFloat(examWeight) || 90,
          speakingWeight: parseFloat(speakingWeight) || 30,
          speakingMax: parseFloat(speakingMax) || 40,
          listeningWeight: parseFloat(listeningWeight) || 20,
          listeningMax: parseFloat(listeningMax) || 26,
          rwWeight: parseFloat(rwWeight) || 40,
          rwMax: parseFloat(rwMax) || 36,
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
        update: {
          processWeight: parseFloat(processWeight) || 10,
          examWeight: parseFloat(examWeight) || 90,
          speakingWeight: parseFloat(speakingWeight) || 30,
          speakingMax: parseFloat(speakingMax) || 40,
          listeningWeight: parseFloat(listeningWeight) || 20,
          listeningMax: parseFloat(listeningMax) || 26,
          rwWeight: parseFloat(rwWeight) || 40,
          rwMax: parseFloat(rwMax) || 36,
        },
        create: {
          level,
          examType,
          processWeight: parseFloat(processWeight) || 10,
          examWeight: parseFloat(examWeight) || 90,
          speakingWeight: parseFloat(speakingWeight) || 30,
          speakingMax: parseFloat(speakingMax) || 40,
          listeningWeight: parseFloat(listeningWeight) || 20,
          listeningMax: parseFloat(listeningMax) || 26,
          rwWeight: parseFloat(rwWeight) || 40,
          rwMax: parseFloat(rwMax) || 36,
        },
      });
    }

    return NextResponse.json({ success: true, data: config, message: 'Đã lưu cấu hình thành công' });
  } catch (error) {
    console.error('Lỗi khi lưu cấu hình thi:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
