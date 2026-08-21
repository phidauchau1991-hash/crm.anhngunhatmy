import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { recalculateClassEndDate } from '@/lib/holidayHelpers';

export async function POST(request) {
  try {
    const body = await request.json();
    const { oldClassCode, newLevel, newStartDateStr, teacherName, schedule } = body;

    if (!oldClassCode || !newLevel || !newStartDateStr) {
      return NextResponse.json({ success: false, error: 'Mã lớp cũ, Mã khóa mới và Ngày khai giảng mới là bắt buộc' }, { status: 400 });
    }

    const oldClass = await prisma.class.findUnique({
      where: { code: oldClassCode },
      include: { enrollments: true }
    });

    if (!oldClass) {
      return NextResponse.json({ success: false, error: 'Lớp học cũ không tồn tại' }, { status: 404 });
    }

    const newConfig = await prisma.courseConfig.findUnique({
      where: { level: newLevel }
    });

    if (!newConfig) {
      return NextResponse.json({ success: false, error: `Không tìm thấy cấu hình khóa học "${newLevel}" trong hệ thống` }, { status: 404 });
    }

    const finalTeacher = teacherName || oldClass.teacherName || 'Ms My';
    const finalSchedule = schedule || oldClass.schedule || '35';
    const startDate = new Date(newStartDateStr);
    startDate.setHours(0, 0, 0, 0);

    const gvAbbr = finalTeacher ? finalTeacher.replace(/\s+/g, '') : 'GV';
    const classPrefix = `CN1_${newLevel}_${gvAbbr}_${finalSchedule}_`;

    const latestClass = await prisma.class.findFirst({
      where: { code: { startsWith: classPrefix } },
      orderBy: { code: 'desc' }
    });

    let nextSerial = 1;
    if (latestClass) {
      const parts = latestClass.code.split('_');
      const serialPart = parts[parts.length - 1];
      nextSerial = (parseInt(serialPart) || 0) + 1;
    }
    const newClassCode = `${classPrefix}${String(nextSerial).padStart(2, '0')}`;

    const now = new Date();
    const yearMonthPrefix = `${String(now.getFullYear()).substring(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const activeStudents = oldClass.enrollments.filter(e => e.status === 'Đang học');

      const result = await prisma.$transaction(async (tx) => {
      // Dọn dẹp các điểm danh mồ côi (nếu mã lớp này vô tình bị trùng với 1 lớp đã xóa trong quá khứ)
      await tx.attendance.deleteMany({ where: { classCode: newClassCode } });
      await tx.attendanceSummary.deleteMany({ where: { classCode: newClassCode } });

      // 1. Tạo lớp mới
      const createdClass = await tx.class.create({
        data: {
          code: newClassCode,
          level: newLevel,
          teacherName: finalTeacher,
          startDate: startDate,
          schedule: finalSchedule,
          expectedEndDate: startDate, // Tạm thời
        }
      });

      // Recalculate ngày kết thúc
      await recalculateClassEndDate(newClassCode, tx);

      // 2. Chuyển sỹ số toàn bộ học viên từ lớp cũ sang lớp mới và tạo hóa đơn khóa mới
      let movedCount = 0;
      for (const en of activeStudents) {
        // Đổi trạng thái enrollment lớp cũ thay vì xóa để bảo toàn lịch sử
        await tx.enrollment.updateMany({
          where: { studentId: en.studentId, classCode: oldClassCode },
          data: { status: 'Đã chuyển' }
        });

        // Tạo enrollment lớp mới
        await tx.enrollment.create({
          data: {
            studentId: en.studentId,
            classCode: newClassCode,
            status: 'Đang học'
          }
        });

        // Tính toán công nợ cũ (Học phí phải đóng - Đã đóng)
        const oldOrder = await tx.orderFinance.findFirst({
          where: { studentId: en.studentId, classCode: oldClassCode }
        });
        const feeToPayOld = oldOrder ? oldOrder.feeToPay : 0;
        const amountPaidOld = oldOrder ? oldOrder.amountPaid : 0;
        const oldDebt = Math.max(0, feeToPayOld - amountPaidOld);

        // Lấy thông tin ưu đãi đặc biệt của học viên
        const student = await tx.student.findUnique({ where: { id: en.studentId } });
        const specialDiscount = student?.specialPolicyValue || 0;
        const baseNewFee = Math.max(0, newConfig.price - specialDiscount);
        
        // Cộng dồn nợ cũ vào học phí cần đóng của lớp mới
        const finalFeeToPay = baseNewFee + oldDebt;
        
        let promoNote = `Lên khóa tự động từ lớp ${oldClassCode} (Khóa ${newLevel})`;
        if (oldDebt > 0) {
           promoNote += ` [Nợ cũ: ${oldDebt.toLocaleString('vi-VN')}đ]`;
        }

        // Tạo hóa đơn học phí cho khóa mới (Sử dụng studentId đầy đủ để tránh trùng lặp thay vì split)
        const orderId = `ORD_UP_${yearMonthPrefix}_${en.studentId}`;
        await tx.orderFinance.upsert({
          where: { id: orderId },
          update: { feeToPay: finalFeeToPay, classCode: newClassCode, promoType: promoNote },
          create: {
            id: orderId,
            studentId: en.studentId,
            classCode: newClassCode,
            promoType: promoNote,
            promoDiscount: specialDiscount,
            feeToPay: finalFeeToPay,
            amountPaid: 0,
            paymentStatus: finalFeeToPay === 0 ? 'Đã đóng' : 'Chưa đóng',
            paymentPolicy: 'Đóng trước',
            paymentDeadline: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
          }
        });

        movedCount++;
      }

      return { newClassCode, movedCount };
    });

    return NextResponse.json({
      success: true,
      message: `Nâng khóa thành công! Đã tạo lớp mới [${result.newClassCode}] và tự động chuyển ${result.movedCount} học viên sang lớp mới.`,
      data: result
    });

  } catch (error) {
    console.error('Lỗi khi nâng lớp hàng loạt:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
