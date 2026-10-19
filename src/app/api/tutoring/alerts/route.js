import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    // 1. Lấy danh sách ghi nhận bỏ qua / đã xử lý
    const dismissedRecords = await prisma.tutoringAlertDismissal.findMany();
    const dismissedSet = new Set(dismissedRecords.map(d => `${d.studentId}|${d.alertKey}`));

    // 2. Lấy các học viên đang có đợt phụ đạo SCHEDULED hoặc IN_PROGRESS (đã lên lịch rồi thì không báo nữa)
    const activePlans = await prisma.tutoringPlan.findMany({
      where: {
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      },
      select: { studentId: true, classCode: true }
    });
    const scheduledStudentSet = new Set(activePlans.map(p => `${p.studentId}|${p.classCode || ''}`));

    // 3. Lấy cấu hình ngưỡng cảnh báo nếu có
    let config = await prisma.alertConfig.findFirst();
    const consecutiveLimit = config?.consecutiveAbsences || 2;

    // 4. Lấy tất cả enrollments của học viên đang học
    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: 'Đang học'
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true
          }
        },
        class: {
          select: {
            code: true,
            level: true,
            teacherName: true,
            teacherId: true
          }
        }
      }
    });

    // 5. Lấy toàn bộ bản ghi điểm danh
    const attendances = await prisma.attendance.findMany({
      orderBy: { date: 'desc' }
    });

    const candidates = [];

    for (const enr of enrollments) {
      const studentId = enr.studentId;
      const classCode = enr.classCode;

      // Nếu học viên này đã được lên lịch phụ đạo cho lớp này rồi -> bỏ qua
      if (scheduledStudentSet.has(`${studentId}|${classCode}`) || scheduledStudentSet.has(`${studentId}|`)) {
        continue;
      }

      const studentAtts = attendances.filter(a => a.studentId === studentId && a.classCode === classCode);
      if (studentAtts.length === 0) continue;

      let consecutiveAbsences = 0;
      const missedDates = [];

      for (const a of studentAtts) {
        if (a.status === 'Chưa điểm danh') continue;

        if (a.status === 'Vắng không phép' || a.status === 'Vắng có phép') {
          consecutiveAbsences++;
          const dStr = new Date(a.date).toLocaleDateString('vi-VN');
          missedDates.push(dStr);
        } else if (a.status === 'Có mặt') {
          break; // Đứt chuỗi vắng liên tiếp
        }
      }

      if (consecutiveAbsences >= consecutiveLimit) {
        const alertKey = `att_consecutive_${consecutiveAbsences}`;
        if (dismissedSet.has(`${studentId}|${alertKey}`)) {
          continue;
        }

        candidates.push({
          studentId: enr.student.id,
          studentName: enr.student.name,
          phone: enr.student.phone || 'Chưa có SĐT',
          classCode: enr.class.code,
          level: enr.class.level,
          teacherName: enr.class.teacherName || 'Chưa phân công',
          teacherId: enr.class.teacherId || null,
          consecutiveAbsences,
          missedDates,
          alertKey,
          reason: `Vắng ${consecutiveAbsences} buổi liên tiếp (${missedDates.slice(0, 3).join(', ')}${missedDates.length > 3 ? '...' : ''})`,
          recommendedSessionType: 'Bù bài học viên vắng (Makeup)',
          recommendedSkills: 'Tổng hợp / Toàn diện'
        });
      }
    }

    // Sắp xếp: học viên vắng nhiều buổi hơn lên trước
    candidates.sort((a, b) => b.consecutiveAbsences - a.consecutiveAbsences);

    return NextResponse.json({
      success: true,
      data: candidates,
      total: candidates.length
    });
  } catch (error) {
    console.error('Lỗi quét cảnh báo phụ đạo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
