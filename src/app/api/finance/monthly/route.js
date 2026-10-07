import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const monthYear = searchParams.get('monthYear');

  if (!monthYear) {
    return NextResponse.json({ error: 'Thiếu tham số monthYear' }, { status: 400 });
  }

  // monthYear format: "09/2026"
  const [mm, yyyy] = monthYear.split('/');
  const month = parseInt(mm, 10);
  const year = parseInt(yyyy, 10);

  // Tính tháng trước
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const prevMonthYear = `${prevMonth.toString().padStart(2, '0')}/${prevYear}`;

  try {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        billingType: { in: ['MONTHLY_PREPAID', 'MONTHLY_POSTPAID'] },
      },
      include: {
        student: true,
        class: true,
      },
    });

    const data = [];

    for (const enr of enrollments) {
      // Tính số buổi đi học thực tế trong tháng
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

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
        const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        if (att.status === 'Có mặt') {
          datesPresent.push(dateStr);
        } else if (att.status === 'Vắng') {
          datesAbsent.push(dateStr);
        }
      });

      const actualSessions = datesPresent.length;

      // Lấy hóa đơn tháng trước để tính nợ cũ
      const prevInvoice = await prisma.monthlyInvoice.findUnique({
        where: {
          studentId_classCode_monthYear: {
            studentId: enr.studentId,
            classCode: enr.classCode,
            monthYear: prevMonthYear,
          },
        },
      });

      let previousDebt = 0;
      if (prevInvoice) {
        if (prevInvoice.status === 'UNPAID') {
          previousDebt += (prevInvoice.totalToPay - (prevInvoice.amountPaid || 0));
        }
        if (enr.billingType === 'MONTHLY_PREPAID') {
          previousDebt += prevInvoice.excessMissing;
        }
      }

      // Kiểm tra xem đã tạo hóa đơn tháng này chưa
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

      let excessMissing = 0;
      let currentFee = 0;
      let totalToPay = 0;
      let needsUpdate = false;

      // LUÔN TÍNH TOÁN DỮ LIỆU ĐỘNG THEO ĐIỂM DANH HIỆN TẠI
      let liveCurrentFee = 0;
      let liveExcessMissing = 0;
      let liveTotalToPay = 0;
      let livePreviousDebt = previousDebt;
      let liveAmountPaid = 0;

      if (enr.billingType === 'MONTHLY_PREPAID') {
        liveCurrentFee = monthlyRate;
        liveExcessMissing = (actualSessions - monthlySessions) * feePerSession;
        liveTotalToPay = liveCurrentFee + previousDebt + liveExcessMissing;
      } else {
        // POSTPAID
        liveCurrentFee = actualSessions * feePerSession;
        liveExcessMissing = 0;
        liveTotalToPay = liveCurrentFee + previousDebt;
      }

      // Nếu đã có hóa đơn trong DB, lấy các số liệu đã chốt
      if (currentInvoice) {
        currentFee = currentInvoice.currentFee;
        excessMissing = currentInvoice.excessMissing;
        previousDebt = currentInvoice.previousDebt;
        totalToPay = currentInvoice.totalToPay;
        let amountPaid = currentInvoice.amountPaid || 0;

        // KIỂM TRA LỆCH DỮ LIỆU (Chỉ khi chưa thanh toán)
        if (currentInvoice.status === 'UNPAID') {
          if (
            currentInvoice.actualSessions !== actualSessions ||
            currentInvoice.totalToPay !== liveTotalToPay
          ) {
            needsUpdate = true;
            currentFee = liveCurrentFee;
            excessMissing = liveExcessMissing;
            totalToPay = liveTotalToPay;
            previousDebt = livePreviousDebt;
          }
        }
      } else {
        // Nếu chưa chốt, dùng luôn live
        currentFee = liveCurrentFee;
        excessMissing = liveExcessMissing;
        totalToPay = liveTotalToPay;
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
        totalToPay,
        amountPaid: currentInvoice ? (currentInvoice.amountPaid || 0) : 0,
        monthYear,
        status: currentInvoice ? currentInvoice.status : 'NOT_GENERATED',
        invoiceId: currentInvoice?.id || null,
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

    // Nếu đã có hóa đơn -> Cho phép cập nhật số tiền / nợ cũ
    if (existing) {
      const updated = await prisma.monthlyInvoice.update({
        where: { id: existing.id },
        data: {
          committedSessions: committedSessions !== undefined && committedSessions !== null ? parseInt(committedSessions, 10) : existing.committedSessions,
          actualSessions: actualSessions !== undefined && actualSessions !== null ? parseInt(actualSessions, 10) : existing.actualSessions,
          feePerSession: feePerSession !== undefined && feePerSession !== null ? parseFloat(feePerSession) : existing.feePerSession,
          previousDebt: previousDebt !== undefined && previousDebt !== null ? parseFloat(previousDebt) : existing.previousDebt,
          currentFee: currentFee !== undefined && currentFee !== null ? parseFloat(currentFee) : existing.currentFee,
          excessMissing: excessMissing !== undefined && excessMissing !== null ? parseFloat(excessMissing) : existing.excessMissing,
          totalToPay: totalToPay !== undefined && totalToPay !== null ? parseFloat(totalToPay) : existing.totalToPay,
          amountPaid: amountPaid !== undefined && amountPaid !== null ? parseFloat(amountPaid) : existing.amountPaid,
        },
      });
      return NextResponse.json({ success: true, invoice: updated });
    }

    // Nếu chưa có -> Tạo mới
    const uniqueId = Math.floor(Math.random() * 10000);
    const paymentCode = `HP${monthYear.replace('/', '')}${studentId}${uniqueId}`;

    const invoice = await prisma.monthlyInvoice.create({
      data: {
        studentId,
        classCode,
        monthYear,
        billingType,
        committedSessions: parseInt(committedSessions, 10) || 0,
        actualSessions: parseInt(actualSessions, 10) || 0,
        feePerSession: parseFloat(feePerSession) || 0,
        previousDebt: parseFloat(previousDebt) || 0,
        currentFee: parseFloat(currentFee) || 0,
        excessMissing: parseFloat(excessMissing) || 0,
        totalToPay: parseFloat(totalToPay) || 0,
        amountPaid: parseFloat(amountPaid) || 0,
        paymentCode,
        status: 'UNPAID',
      },
    });

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error('Lỗi khi chốt/cập nhật hóa đơn tháng:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
