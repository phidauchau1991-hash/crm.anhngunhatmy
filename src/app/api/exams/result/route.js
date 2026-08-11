import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET all exam results for a class
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classCode = searchParams.get('classCode');
    const configId = searchParams.get('configId');

    if (!classCode || !configId) {
      return NextResponse.json({ success: false, error: 'Thiếu classCode hoặc configId' }, { status: 400 });
    }

    const results = await prisma.examResult.findMany({
      where: {
        classCode: classCode,
        configId: parseInt(configId)
      },
      include: {
        student: {
          select: { name: true, phone: true }
        },
        class: {
          select: { teacherName: true }
        }
      }
    });

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Lỗi khi lấy kết quả thi:', error);
    return NextResponse.json({ success: false, error: 'Không thể lấy dữ liệu kết quả thi' }, { status: 500 });
  }
}

// POST create or update multiple exam results
export async function POST(request) {
  try {
    const body = await request.json();
    const { classCode, configId, examDate, results } = body;

    if (!classCode || !configId || !results || !Array.isArray(results)) {
      return NextResponse.json({ success: false, error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    // Lấy config để tính điểm
    const config = await prisma.examConfig.findUnique({
      where: { id: parseInt(configId) }
    });

    if (!config) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy cấu hình đề thi' }, { status: 404 });
    }

    const upsertPromises = results.map(async (r) => {
      // Tính toán điểm số
      // 1. Quá trình (10%)
      const attendanceScore = parseFloat(r.attendanceScore) || 0;
      const hwScore = parseFloat(r.hwScore) || 0;
      const activityScore = parseFloat(r.activityScore) || 0;
      const pronunciationScore = parseFloat(r.pronunciationScore) || 0;
      const communicationScore = parseFloat(r.communicationScore) || 0;
      
      const processTotal = (attendanceScore + hwScore + activityScore + pronunciationScore + communicationScore) / 5;
      const processContribution = processTotal * (config.processWeight / 100);

      // 2. Bài thi (90%)
      const speakingScore = parseFloat(r.speakingScore) || 0;
      const listeningScore = parseFloat(r.listeningScore) || 0;
      const rwScore = parseFloat(r.rwScore) || 0;

      const speakingPercent = config.speakingMax > 0 ? (speakingScore / config.speakingMax) * config.speakingWeight : 0;
      const listeningPercent = config.listeningMax > 0 ? (listeningScore / config.listeningMax) * config.listeningWeight : 0;
      const rwPercent = config.rwMax > 0 ? (rwScore / config.rwMax) * config.rwWeight : 0;

      const examContribution = speakingPercent + listeningPercent + rwPercent;

      // 3. Tổng kết
      const totalScore = processContribution + examContribution;
      
      let grade = 'D';
      if (totalScore >= 98) grade = 'A+';
      else if (totalScore >= 95) grade = 'A';
      else if (totalScore >= 90) grade = 'B+';
      else if (totalScore >= 80) grade = 'B';
      else if (totalScore >= 75) grade = 'C+';
      else if (totalScore >= 65) grade = 'C';

      return prisma.examResult.upsert({
        where: {
          studentId_classCode_configId: {
            studentId: r.studentId,
            classCode: classCode,
            configId: parseInt(configId)
          }
        },
        update: {
          examDate: new Date(examDate || new Date()),
          attendanceScore,
          hwScore,
          activityScore,
          pronunciationScore,
          communicationScore,
          processTotal,
          speakingScore,
          listeningScore,
          rwScore,
          totalScore,
          grade,
          commentSpeaking: r.commentSpeaking,
          commentListening: r.commentListening,
          commentRW: r.commentRW,
          commentDev: r.commentDev,
          keywordSpeaking: r.keywordSpeaking,
          keywordListening: r.keywordListening,
          keywordRW: r.keywordRW
        },
        create: {
          studentId: r.studentId,
          classCode: classCode,
          configId: parseInt(configId),
          examDate: new Date(examDate || new Date()),
          attendanceScore,
          hwScore,
          activityScore,
          pronunciationScore,
          communicationScore,
          processTotal,
          speakingScore,
          listeningScore,
          rwScore,
          totalScore,
          grade,
          commentSpeaking: r.commentSpeaking,
          commentListening: r.commentListening,
          commentRW: r.commentRW,
          commentDev: r.commentDev,
          keywordSpeaking: r.keywordSpeaking,
          keywordListening: r.keywordListening,
          keywordRW: r.keywordRW
        }
      });
    });

    await Promise.all(upsertPromises);

    return NextResponse.json({ success: true, message: 'Đã lưu điểm thi thành công' });
  } catch (error) {
    console.error('Lỗi khi lưu kết quả thi:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
