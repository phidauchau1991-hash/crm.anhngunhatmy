import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { recalculateClassEndDate } from '@/lib/holidayHelpers';
import { extractClassShiftCode } from '@/lib/classHelper';

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      oldClassCode, 
      newLevel, 
      newStartDateStr, 
      teacherName, 
      schedule,
      shift,
      customNewClassCode 
    } = body;

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

    // Kế thừa chính xác Ca học từ lớp cũ (hoặc ca học người dùng chọn nếu đổi ca)
    const inheritedShift = extractClassShiftCode(oldClassCode);
    const finalShift = (shift && shift.trim()) ? shift.trim() : inheritedShift;

    const gvAbbr = finalTeacher ? finalTeacher.replace(/\s+/g, '') : 'GV';
    const defaultNewCode = `CN1_${newLevel}_${gvAbbr}_${finalSchedule}_${finalShift}`;
    const newClassCode = (customNewClassCode && customNewClassCode.trim()) ? customNewClassCode.trim() : defaultNewCode;

    // Kiểm tra xem mã lớp mới đã tồn tại trên hệ thống chưa
    const existingClass = await prisma.class.findUnique({
      where: { code: newClassCode }
    });
    if (existingClass) {
      return NextResponse.json({ 
        success: false, 
        error: `Mã lớp mới "${newClassCode}" đã tồn tại trên hệ thống. Vui lòng kiểm tra lại Ca học hoặc đổi Mã lớp tùy chỉnh!` 
      }, { status: 400 });
    }

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
          teacherId: oldClass.teacherId || null,
          careStaff: oldClass.careStaff || null,
          startDate: startDate,
          schedule: finalSchedule,
          expectedEndDate: startDate, // Tạm thời
          branchId: oldClass.branchId || 'CN1_BinhDuong',
        }
      });

      // Recalculate ngày kết thúc
      await recalculateClassEndDate(newClassCode, tx);

      // Kiểm tra xem lớp cũ đã học xong hết số buổi chưa
      const oldConfig = await tx.courseConfig.findUnique({ where: { level: oldClass.level } });
      const oldTotalSessions = oldConfig?.totalSessions || 32;
      const oldUniqueDates = await tx.attendance.groupBy({
        by: ['date'],
        where: { classCode: oldClassCode }
      });
      const oldSessionsRemaining = Math.max(0, oldTotalSessions - oldUniqueDates.length);

      // 2. Chuyển sỹ số toàn bộ học viên từ lớp cũ sang lớp mới và tạo hóa đơn khóa mới
      let movedCount = 0;
      for (const en of activeStudents) {
        // NẾU LỚP CŨ ĐÃ HỌC HẾT SỐ BUỔI (oldSessionsRemaining <= 0):
        // -> Đổi trạng thái enrollment lớp cũ sang 'Đã chuyển'
        // NẾU LỚP CŨ VẪN CÒN BUỔI HỌC (oldSessionsRemaining > 0):
        // -> Giữ nguyên trạng thái 'Đang học' ở lớp cũ để học nốt các buổi còn lại và bảo toàn sĩ số sổ đầu bài!
        if (oldSessionsRemaining <= 0) {
          await tx.enrollment.updateMany({
            where: { studentId: en.studentId, classCode: oldClassCode },
            data: { status: 'Đã chuyển' }
          });
        }

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
        
        // KHÔNG cộng dồn nợ cũ vào học phí cần đóng của lớp mới (tránh làm sai lệch doanh thu và đơn giá khóa học)
        // Nợ cũ được lưu giữ trên hóa đơn lớp cũ để thu đúng hóa đơn đó.
        const finalFeeToPay = baseNewFee;
        
        let promoNote = `Lên khóa tự động từ lớp ${oldClassCode} (Khóa ${newLevel})`;
        if (oldDebt > 0) {
           promoNote += ` [Nợ cũ lớp trước: ${oldDebt.toLocaleString('vi-VN')}đ]`;
        }

        // Tạo hóa đơn học phí cho khóa mới
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
