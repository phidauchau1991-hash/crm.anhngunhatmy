import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const revalidate = 0;

// GET: Tra cứu danh sách đánh giá theo studentId hoặc leadId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const leadId = searchParams.get('leadId');
    const type = searchParams.get('type');
    const latestOnly = searchParams.get('latestOnly') === 'true';

    if (!studentId && !leadId) {
      return NextResponse.json({ success: false, error: 'Cần cung cấp studentId hoặc leadId' }, { status: 400 });
    }

    const whereClause = {};

    if (studentId && leadId) {
      whereClause.OR = [
        { studentId },
        { leadId: parseInt(leadId) }
      ];
    } else if (studentId) {
      whereClause.studentId = studentId;
    } else if (leadId) {
      whereClause.leadId = parseInt(leadId);
    }

    if (type) {
      whereClause.type = type;
    }

    const assessments = await prisma.studentAssessment.findMany({
      where: whereClause,
      orderBy: { assessmentDate: 'desc' },
      take: latestOnly ? 1 : undefined,
    });

    // Parse JSON helpers for convenience
    const parsedData = assessments.map(a => {
      let parsedScores = null;
      let parsedKeywords = null;
      let parsedComments = null;

      try { if (a.scores) parsedScores = JSON.parse(a.scores); } catch (e) { parsedScores = a.scores; }
      try { if (a.keywords) parsedKeywords = JSON.parse(a.keywords); } catch (e) { parsedKeywords = a.keywords; }
      try { if (a.comments) parsedComments = JSON.parse(a.comments); } catch (e) { parsedComments = a.comments; }

      return {
        ...a,
        scoresData: parsedScores,
        keywordsData: parsedKeywords,
        commentsData: parsedComments,
      };
    });

    if (latestOnly) {
      return NextResponse.json({ success: true, data: parsedData[0] || null });
    }

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu đánh giá:', error);
    return NextResponse.json({ success: false, error: 'Không thể lấy dữ liệu đánh giá' }, { status: 500 });
  }
}

// POST: Tạo mới hoặc cập nhật phiếu đánh giá
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      id,
      studentId,
      leadId,
      classCode,
      type = 'PLACEMENT_TEST',
      title,
      assessmentDate,
      assessorName,
      scores,
      totalScore,
      maxScore = 100,
      keywords,
      comments,
      notes
    } = body;

    if (!studentId && !leadId) {
      return NextResponse.json({ success: false, error: 'Phiếu đánh giá phải gắn với studentId hoặc leadId' }, { status: 400 });
    }

    const stringifyIfNeeded = (val) => {
      if (val === undefined || val === null) return null;
      if (typeof val === 'string') return val;
      return JSON.stringify(val);
    };

    const payload = {
      studentId: studentId || null,
      leadId: leadId ? parseInt(leadId) : null,
      classCode: classCode || null,
      type,
      title: title || (type === 'PLACEMENT_TEST' ? 'Đánh giá Năng lực Đầu vào' : type === 'TRIAL_EVALUATION' ? 'Nhận xét Học thử' : 'Nhận xét Định kỳ / Đột xuất'),
      assessmentDate: assessmentDate ? new Date(assessmentDate) : new Date(),
      assessorName: assessorName || null,
      scores: stringifyIfNeeded(scores),
      totalScore: totalScore !== undefined && totalScore !== null ? parseFloat(totalScore) : null,
      maxScore: maxScore ? parseFloat(maxScore) : 100,
      keywords: stringifyIfNeeded(keywords),
      comments: stringifyIfNeeded(comments),
      notes: notes || null
    };

    let result;
    if (id) {
      result = await prisma.studentAssessment.update({
        where: { id: parseInt(id) },
        data: payload
      });
    } else {
      result = await prisma.studentAssessment.create({
        data: payload
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Đã lưu phiếu đánh giá thành công!',
      data: result
    });
  } catch (error) {
    console.error('Lỗi khi lưu phiếu đánh giá:', error);
    return NextResponse.json({ success: false, error: 'Không thể lưu phiếu đánh giá: ' + error.message }, { status: 500 });
  }
}

// DELETE: Xóa phiếu đánh giá nếu cần
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu ID phiếu đánh giá cần xóa' }, { status: 400 });
    }

    await prisma.studentAssessment.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true, message: 'Đã xóa phiếu đánh giá thành công!' });
  } catch (error) {
    console.error('Lỗi khi xóa phiếu đánh giá:', error);
    return NextResponse.json({ success: false, error: 'Không thể xóa phiếu đánh giá' }, { status: 500 });
  }
}
