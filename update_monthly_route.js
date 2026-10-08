const fs = require('fs');

const routeCode = `import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthYear = searchParams.get('monthYear'); // VD: "09/2026"

    if (!monthYear) {
      return NextResponse.json({ error: 'Thiếu tham số monthYear' }, { status: 400 });
    }

    const [month, year] = monthYear.split('/');
    if (!month || !year) {
      return NextResponse.json({ error: 'Định dạng monthYear không hợp lệ (MM/YYYY)' }, { status: 400 });
    }

    // Xác định khoảng thời gian của tháng được chọn
    const startDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const endDate = new Date(parseInt(year, 10), parseInt(month, 10), 1);

    // Lấy tất cả học viên có billingType là MONTHLY_PREPAID hoặc MONTHLY_POSTPAID
    const enrollments = await prisma.enrollment.findMany({
      where: {
        billingType: {
          in: ['MONTHLY_PREPAID', 'MONTHLY_POSTPAID'],
        },
      },
      include: {
        student: true,
        class: true,
      },
    });

    const data = [];

    // Tìm tháng trước để kế thừa nợ cũ
    let prevM = parseInt(month, 10) - 1;
    let prevY = parseInt(year, 10);
    if (prevM === 0) {
      prevM = 12;
      prevY -= 1;
    }
    const prevMonthYear = \`\${prevM.toString().padStart(2, '0')}/\${prevY}\`;

    for (const enr of enrollments) {
      // Đếm số buổi học thực tế trong tháng
      const attendances = await prisma.attendance.findMany({
        where: {
          studentId: enr.studentId,
          classCode: enr.classCode,
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
      });

      const datesPresent = [];
      const datesAbsent = [];
      attendances.forEach(att => {
        const d = new Date(att.date);
        const dateStr = \`\${d.getDate().toString().padStart(2, '0')}/\${(d.getMonth() + 1).toString().padStart(2, '0')}\`;
        if (att.status === 'Có mặt') {
          datesPresent.push(dateStr);
        } else if (att.status === 'Vắng') {
          datesAbsent.push(dateStr);
        }
      });

      const actualSessions = datesPresent.length;

      // 1. TÌM HÓA ĐƠN THÁNG TRƯỚC ĐỂ LẤY NỢ CŨ CHUYỂN SANG
      const prevInvoice = await prisma.monthlyInvoice.findUnique({
        where: {
          studentId_classCode_monthYear: {
            studentId: enr.studentId,
            classCode: enr.classCode,
            monthYear: prevMonthYear,
          },
        },
      });

      let autoCarryDebt = 0;
      if (prevInvoice) {
        // Nợ còn lại của tháng trước = totalToPay - amountPaid
        const remaining = Math.max(0, (prevInvoice.totalToPay || 0) - (prevInvoice.amountPaid || 0));
        autoCarryDebt += remaining;

        if (enr.billingType === 'MONTHLY_PREPAID') {
          autoCarryDebt += (prevInvoice.excessMissing || 0);
        }
      }

      // 2. TÌM HÓA ĐƠN THÁNG HIỆN TẠI TRONG DB
      const currentInvoice = await prisma.monthlyInvoice.findUnique({
        where: {
          studentId_classCode_monthYear: {
            studentId: enr.studentId,
            classCode: enr.classCode,
            monthYear: monthYear,
          },
        },
      });

      const monthlySessions = enr.monthlySessions || 0;
      const monthlyRate = enr.monthlyRate || 0;
      const feePerSession = (monthlyRate && monthlySessions) ? monthlyRate / monthlySessions : 0;

      // 🔒 NGUYÊN TẮC BẢO VỆ NỢ CŨ (ANTI-OVERWRITE):
      // Nếu hóa đơn hiện tại đã được khóa (previousDebtLocked = true) hoặc có nợ cũ > 0 mà tháng trước chưa có invoice,
      // TUYỆT ĐỐI KHÔNG ghi đè về 0! Giữ nguyên previousDebt đã lưu.
      let effectivePreviousDebt = autoCarryDebt;
      if (currentInvoice) {
        if (currentInvoice.previousDebtLocked || (currentInvoice.previousDebt > 0 && !prevInvoice)) {
          effectivePreviousDebt = currentInvoice.previousDebt;
        }
      }

      // TÍNH TOÁN CÁC THÔNG SỐ LIVE THEO ĐIỂM DANH
      let liveCurrentFee = 0;
      let liveExcessMissing = 0;
      let liveTotalToPay = 0;

      if (enr.billingType === 'MONTHLY_PREPAID') {
        liveCurrentFee = monthlyRate;
        liveExcessMissing = (actualSessions - monthlySessions) * feePerSession;
        liveTotalToPay = liveCurrentFee + effectivePreviousDebt + liveExcessMissing;
      } else {
        // POSTPAID (Đóng sau)
        liveCurrentFee = actualSessions * feePerSession;
        liveExcessMissing = 0;
        liveTotalToPay = liveCurrentFee + effectivePreviousDebt;
      }

      let currentFee = 0;
      let excessMissing = 0;
      let previousDebt = effectivePreviousDebt;
      let totalToPay = 0;
      let amountPaid = 0;
      let status = 'NOT_GENERATED';
      let needsUpdate = false;

      if (currentInvoice) {
        currentFee = currentInvoice.currentFee;
        excessMissing = currentInvoice.excessMissing;
        previousDebt = currentInvoice.previousDebt;
        totalToPay = currentInvoice.totalToPay;
        amountPaid = currentInvoice.amountPaid || 0;
        status = currentInvoice.status;

        // CHỈ KIỂM TRA LỆCH VÀ BÁO CẬP NHẬT KHI:
        // - Hóa đơn chưa khóa (isLocked = false)
        // - Chưa từng đóng tiền (amountPaid === 0)
        // - Trạng thái UNPAID
        if (currentInvoice.status === 'UNPAID' && amountPaid === 0 && !currentInvoice.isLocked) {
          if (
            currentInvoice.actualSessions !== actualSessions ||
            currentInvoice.totalToPay !== liveTotalToPay
          ) {
            needsUpdate = true;
            currentFee = liveCurrentFee;
            excessMissing = liveExcessMissing;
            totalToPay = liveTotalToPay;
            previousDebt = effectivePreviousDebt;
          }
        }
      } else {
        // Chưa chốt sổ -> Dùng luôn thông số live
        currentFee = liveCurrentFee;
        excessMissing = liveExcessMissing;
        totalToPay = liveTotalToPay;
        previousDebt = effectivePreviousDebt;
      }

      data.push({
        enrollmentId: enr.id,
        studentId: enr.studentId,
        studentName: enr.student.name,
        studentPhone: enr.student.phone,
        studentNationalId: enr.student.nationalId,
        classCode: enr.classCode,
        billingType: enr.billingType,
        committedSessions: monthlySessions,
        actualSessions,
        datesPresent,
        datesAbsent,
        feePerSession,
        monthlyRate,
        currentFee,
        excessMissing,
        previousDebt,
        previousDebtLocked: currentInvoice?.previousDebtLocked || false,
        isLocked: currentInvoice?.isLocked || false,
        totalToPay,
        amountPaid,
        monthYear,
        status,
        invoiceId: currentInvoice?.id || null,
        notes: currentInvoice?.notes || null,
        needsUpdate,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu học phí tháng:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      studentId,
      classCode,
      monthYear,
      billingType,
      committedSessions,
      actualSessions,
      feePerSession,
      previousDebt,
      currentFee,
      excessMissing,
      totalToPay,
      amountPaid,
      previousDebtLocked,
      isLocked,
      notes,
    } = body;

    const existing = await prisma.monthlyInvoice.findUnique({
      where: {
        studentId_classCode_monthYear: {
          studentId,
          classCode,
          monthYear,
        },
      },
    });

    const pDebt = parseFloat(previousDebt) || 0;
    const cFee = parseFloat(currentFee) || 0;
    const eMissing = parseFloat(excessMissing) || 0;
    const calculatedTotal = cFee + pDebt + eMissing;
    const finalTotalToPay = (totalToPay !== undefined && totalToPay !== null) ? parseFloat(totalToPay) : calculatedTotal;

    // Tự động khóa nợ cũ nếu có nhập nợ cũ > 0 hoặc yêu cầu khóa
    const shouldLockDebt = (previousDebtLocked !== undefined) ? !!previousDebtLocked : (pDebt > 0);

    // Nếu đã có hóa đơn -> Cho phép cập nhật số tiền / nợ cũ
    if (existing) {
      const updated = await prisma.monthlyInvoice.update({
        where: { id: existing.id },
        data: {
          committedSessions: committedSessions !== undefined && committedSessions !== null ? parseInt(committedSessions, 10) : existing.committedSessions,
          actualSessions: actualSessions !== undefined && actualSessions !== null ? parseInt(actualSessions, 10) : existing.actualSessions,
          feePerSession: feePerSession !== undefined && feePerSession !== null ? parseFloat(feePerSession) : existing.feePerSession,
          previousDebt: pDebt,
          currentFee: cFee,
          excessMissing: eMissing,
          totalToPay: finalTotalToPay,
          amountPaid: amountPaid !== undefined && amountPaid !== null ? parseFloat(amountPaid) : existing.amountPaid,
          previousDebtLocked: shouldLockDebt,
          isLocked: isLocked !== undefined ? !!isLocked : existing.isLocked,
          notes: notes !== undefined ? notes : existing.notes,
        },
      });
      return NextResponse.json({ success: true, invoice: updated });
    }

    // Nếu chưa có -> Tạo mới
    const uniqueId = Math.floor(Math.random() * 10000);
    const paymentCode = \`HP\${monthYear.replace('/', '')}\${studentId}\${uniqueId}\`;

    const invoice = await prisma.monthlyInvoice.create({
      data: {
        studentId,
        classCode,
        monthYear,
        billingType,
        committedSessions: parseInt(committedSessions, 10) || 0,
        actualSessions: parseInt(actualSessions, 10) || 0,
        feePerSession: parseFloat(feePerSession) || 0,
        previousDebt: pDebt,
        currentFee: cFee,
        excessMissing: eMissing,
        totalToPay: finalTotalToPay,
        amountPaid: parseFloat(amountPaid) || 0,
        previousDebtLocked: shouldLockDebt,
        isLocked: !!isLocked,
        paymentCode,
        status: 'UNPAID',
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error('Lỗi khi chốt/cập nhật hóa đơn tháng:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/finance/monthly/route.js', routeCode);
console.log('Successfully wrote src/app/api/finance/monthly/route.js');
