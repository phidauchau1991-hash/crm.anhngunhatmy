import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    // 1. Lấy cấu hình cảnh báo
    let config = await prisma.alertConfig.findFirst();
    if (!config) {
      config = {
        consecutiveAbsences: 2,
        totalAbsencesLimit: 5,
        missingWbLimit: 2,
        missingVideoLimit: 2,
        copyErrorLimit: 2,
      };
    }

    // 2. Lấy tất cả học viên và lớp học (Enrollments)
    const enrollments = await prisma.enrollment.findMany({
      include: {
        student: true,
      },
    });

    // 3. Lấy tất cả bản ghi điểm danh
    const attendances = await prisma.attendance.findMany({
      orderBy: { date: 'desc' }, // Quan trọng để tính liên tiếp
    });

    const alertsResult = [];

    // 4. Tính toán cho từng học viên trong từng lớp
    for (const enrollment of enrollments) {
      const studentId = enrollment.studentId;
      const classCode = enrollment.classCode;
      
      const studentAttendances = attendances.filter(a => a.studentId === studentId && a.classCode === classCode);
      if (studentAttendances.length === 0) continue;

      let consecutiveAbsences = 0;
      let totalAbsences = 0;
      let consecutiveMissingWb = 0;
      let consecutiveMissingVideo = 0;
      let consecutiveCopyError = 0;

      // Tính tổng
      for (const a of studentAttendances) {
        if (a.status === 'Vắng không phép' || a.status === 'Vắng có phép') totalAbsences++;
      }

      // Tính liên tiếp (từ mới nhất về cũ)
      let countAbsence = true;
      let countWb = true;
      let countVideo = true;
      let countCopy = true;

      for (const a of studentAttendances) {
        if (a.status === 'Chưa điểm danh') continue;
        
        if (countAbsence) {
          if (a.status === 'Vắng không phép' || a.status === 'Vắng có phép') {
            consecutiveAbsences++;
          } else if (a.status === 'Có mặt') {
            countAbsence = false; 
          }
        }
        
        if (countWb) {
          if (a.missingWb) consecutiveMissingWb++;
          else countWb = false;
        }
        
        if (countVideo) {
          if (a.missingVideo) consecutiveMissingVideo++;
          else countVideo = false;
        }
        
        if (countCopy) {
          if (a.copyError) consecutiveCopyError++;
          else countCopy = false;
        }

        // Dừng khi tất cả các chuỗi liên tiếp đều bị đứt
        if (!countAbsence && !countWb && !countVideo && !countCopy) break;
      }

      const studentAlerts = [];

      if (consecutiveAbsences >= config.consecutiveAbsences) {
        studentAlerts.push({ type: 'consecutiveAbsences', value: consecutiveAbsences, limit: config.consecutiveAbsences, message: `Nghỉ ${consecutiveAbsences} buổi liên tiếp` });
      }
      if (totalAbsences >= config.totalAbsencesLimit) {
        studentAlerts.push({ type: 'totalAbsences', value: totalAbsences, limit: config.totalAbsencesLimit, message: `Nghỉ tổng cộng ${totalAbsences} buổi` });
      }
      if (consecutiveMissingWb >= config.missingWbLimit) {
        studentAlerts.push({ type: 'missingWb', value: consecutiveMissingWb, limit: config.missingWbLimit, message: `Thiếu WB ${consecutiveMissingWb} buổi liên tiếp` });
      }
      if (consecutiveMissingVideo >= config.missingVideoLimit) {
        studentAlerts.push({ type: 'missingVideo', value: consecutiveMissingVideo, limit: config.missingVideoLimit, message: `Thiếu Video ${consecutiveMissingVideo} buổi liên tiếp` });
      }
      if (consecutiveCopyError >= config.copyErrorLimit) {
        studentAlerts.push({ type: 'copyError', value: consecutiveCopyError, limit: config.copyErrorLimit, message: `Lỗi Copy ${consecutiveCopyError} buổi liên tiếp` });
      }

      if (studentAlerts.length > 0) {
        alertsResult.push({
          studentId: enrollment.student.id,
          studentName: enrollment.student.name,
          classCode,
          phone: enrollment.student.phone,
          alerts: studentAlerts,
        });
      }
    }

    // Sort: students with consecutive absences first, then by total alerts
    alertsResult.sort((a, b) => {
      const aConsecutive = a.alerts.some(al => al.type === 'consecutiveAbsences');
      const bConsecutive = b.alerts.some(al => al.type === 'consecutiveAbsences');
      if (aConsecutive && !bConsecutive) return -1;
      if (!aConsecutive && bConsecutive) return 1;
      return b.alerts.length - a.alerts.length;
    });

    return NextResponse.json({ success: true, data: alertsResult });
  } catch (error) {
    console.error('Lỗi khi tính toán cảnh báo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
