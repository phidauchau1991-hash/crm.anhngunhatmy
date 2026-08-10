import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    // ==========================================
    // 1. Cảnh báo Học thử (Trial Student Alerts)
    // ==========================================
    
    // Lấy tất cả điểm danh của học viên học thử (có leadId) trạng thái 'Có mặt'
    const trialAttendances = await prisma.attendance.findMany({
      where: {
        leadId: {
          not: null,
        },
        status: 'Có mặt',
      },
      include: {
        lead: true, // Join với bảng Lead để lấy thông tin
      },
    });

    // Gom nhóm theo leadId và classCode để đếm số buổi
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

    // Lọc ra những học viên có đúng 2 hoặc 4 buổi học
    const trialAlerts = [];
    for (const key in trialCounts) {
      const { count, lead, classCode } = trialCounts[key];
      if (count === 2 || count === 4) {
        trialAlerts.push({
          leadId: lead?.id,
          leadName: lead?.name,
          phone: lead?.phone,
          classCode: classCode,
          trialClassCode: lead?.trialClassCode,
          totalSessions: count,
          milestone: `${count}_sessions`,
        });
      }
    }

    // ==========================================
    // 2. Cảnh báo Nhận xét Định kỳ (Periodic Review Alerts)
    // ==========================================
    
    // Lấy tất cả dữ liệu ghi danh kèm thông tin học viên
    const enrollments = await prisma.enrollment.findMany({
      include: {
        student: true,
      },
    });

    // Lấy tất cả điểm danh của học viên chính thức trạng thái 'Có mặt'
    const studentAttendances = await prisma.attendance.findMany({
      where: {
        studentId: {
          not: null,
        },
        status: 'Có mặt',
      },
    });

    // Gom nhóm để đếm số buổi theo studentId và classCode
    const studentCounts = {};
    studentAttendances.forEach((att) => {
      const key = `${att.studentId}_${att.classCode}`;
      if (!studentCounts[key]) {
        studentCounts[key] = 0;
      }
      studentCounts[key] += 1;
    });

    // Các mốc cần cảnh báo nhận xét định kỳ
    const milestones = [8, 16, 24, 32, 36];
    const reviewAlerts = [];

    // Kiểm tra số buổi học của từng bản ghi danh
    enrollments.forEach((enr) => {
      const key = `${enr.studentId}_${enr.classCode}`;
      const count = studentCounts[key] || 0;
      
      // Nếu số buổi khớp với một trong các mốc nhận xét
      if (milestones.includes(count)) {
        reviewAlerts.push({
          studentId: enr.studentId,
          studentName: enr.student?.name,
          classCode: enr.classCode,
          sessionCount: count,
          milestone: count,
        });
      }
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
