import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getDismissedKeys } from '@/lib/alertDismissals';

export async function GET() {
  try {
    const dismissed = await getDismissedKeys();

    // Tải trước các phiếu đánh giá đã lưu để không báo nhắc lại cho những mốc đã viết nhận xét
    const existingAssessments = await prisma.studentAssessment.findMany({
      where: {
        type: { in: ['TRIAL_EVALUATION', 'PERIODIC_REVIEW', 'ADHOC_REVIEW'] }
      },
      select: {
        leadId: true,
        studentId: true,
        classCode: true,
        type: true,
        keywords: true,
        assessmentDate: true,
        createdAt: true
      }
    });

    // ==========================================
    // 1. Cảnh báo Học thử (Trial Student Alerts)
    // Chỉ tính Lead đang ở trạng thái 'Học thử' để tránh báo ma cho Lead đã chốt/trượt
    // ==========================================
    const trialAttendances = await prisma.attendance.findMany({
      where: {
        leadId: { not: null },
        status: 'Có mặt',
        lead: { status: 'Học thử' }
      },
      include: {
        lead: true
      },
    });

    const trialCounts = {};
    trialAttendances.forEach((att) => {
      const key = `${att.leadId}_${att.classCode}`;
      if (!trialCounts[key]) {
        trialCounts[key] = {
          count: 0,
          lead: att.lead,
          classCode: att.classCode,
        };
      }
      trialCounts[key].count += 1;
    });

    const trialAlerts = [];
    for (const key in trialCounts) {
      const { count, lead, classCode } = trialCounts[key];
      if (!lead || count < 2) continue;

      const milestone = count >= 4 ? 4 : 2;
      const alertKey = `trial|${lead.id}|${classCode}|${milestone}`;
      if (dismissed.has(alertKey)) continue;

      // Bỏ qua nếu đã có phiếu nhận xét học thử cho mốc tương đương
      const alreadyEvaluated = existingAssessments.some((a) => {
        if (a.type !== 'TRIAL_EVALUATION' || a.leadId !== lead.id) return false;
        if (a.classCode && a.classCode !== classCode) return false;
        try {
          const kw = a.keywords ? JSON.parse(a.keywords) : {};
          const evaluatedSessions = parseInt(kw?.sessions, 10) || 2;
          return evaluatedSessions >= milestone;
        } catch {
          return true;
        }
      });
      if (alreadyEvaluated) continue;

      trialAlerts.push({
        leadId: lead.id,
        leadName: lead.name,
        phone: lead.phone,
        classCode: classCode,
        trialClassCode: lead.trialClassCode,
        totalSessions: count,
        milestone: `${milestone}_sessions`,
        key: alertKey,
      });
    }

    // ==========================================
    // 2. Cảnh báo Nhận xét Định kỳ (Periodic Review Alerts)
    // ==========================================
    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: 'Đang học',
        student: { status: 'Đang học' },
      },
      include: {
        student: true,
      },
    });

    const studentAttendances = await prisma.attendance.findMany({
      where: {
        studentId: { not: null },
        status: 'Có mặt',
      },
      select: {
        studentId: true,
        classCode: true,
        date: true,
      },
      orderBy: { date: 'asc' },
    });

    // Gom nhóm theo studentId_classCode kèm danh sách ngày để đối chiếu mốc
    const studentAttDates = {};
    studentAttendances.forEach((att) => {
      const key = `${att.studentId}_${att.classCode}`;
      if (!studentAttDates[key]) studentAttDates[key] = [];
      studentAttDates[key].push(att.date);
    });

    // Các mốc cần cảnh báo nhận xét định kỳ (giữ cửa sổ +2 buổi để không bị mất cảnh báo ngay khi qua buổi kế tiếp)
    const milestones = [8, 16, 24, 32, 36];
    const reviewAlerts = [];

    enrollments.forEach((enr) => {
      const key = `${enr.studentId}_${enr.classCode}`;
      const dates = studentAttDates[key] || [];
      const count = dates.length;

      // Chọn mốc lớn nhất nằm trong cửa sổ [m, m + 2]
      const matchedMilestone = [...milestones].reverse().find(m => count >= m && count <= m + 2);
      if (!matchedMilestone) return;

      const alertKey = `review|${enr.studentId}|${enr.classCode}|${matchedMilestone}`;
      if (dismissed.has(alertKey)) return;

      const milestoneDate = dates[matchedMilestone - 1] ? new Date(dates[matchedMilestone - 1]) : null;
      if (milestoneDate) milestoneDate.setHours(0, 0, 0, 0);

      const alreadyReviewed = existingAssessments.some((a) => {
        if (a.type !== 'PERIODIC_REVIEW' && a.type !== 'ADHOC_REVIEW') return false;
        if (a.studentId !== enr.studentId) return false;
        if (a.classCode && a.classCode !== enr.classCode) return false;
        if (!milestoneDate) return true;
        const aDate = new Date(a.assessmentDate || a.createdAt);
        return aDate >= milestoneDate;
      });
      if (alreadyReviewed) return;

      reviewAlerts.push({
        studentId: enr.studentId,
        studentName: enr.student?.name,
        classCode: enr.classCode,
        sessionCount: count,
        milestone: matchedMilestone,
        key: alertKey,
      });
    });

    // Trả về kết quả
    return NextResponse.json({
      success: true,
      data: {
        trialAlerts,
        reviewAlerts,
      },
    });

  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu cảnh báo:', error);
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi khi tính toán cảnh báo' },
      { status: 500 }
    );
  }
}
