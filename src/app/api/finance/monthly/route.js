import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getBranchFilter } from '@/lib/rbac';

function toVnDateStr(d) {
  const vn = new Date(new Date(d).getTime() + 7 * 3600 * 1000);
  return `${String(vn.getUTCDate()).padStart(2, '0')}/${String(vn.getUTCMonth() + 1).padStart(2, '0')}`;
}

function computeMonthlyStatus(totalToPay, amountPaid) {
  const due = Number(totalToPay || 0);
  const paid = Number(amountPaid || 0);
  if (due <= 0 || paid >= due - 0.0001) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'UNPAID';
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthYear = searchParams.get('monthYear'); // VD: "09/2026"

    if (!monthYear) {
      return NextResponse.json({ error: 'Thiếu tham số monthYear' }, { status: 400 });
    }

    const [month, year] = monthYear.split('/');
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    if (!month || !year || isNaN(monthNum) || isNaN(yearNum)) {
      return NextResponse.json({ error: 'Định dạng monthYear không hợp lệ (MM/YYYY)' }, { status: 400 });
    }

    const userRole = request.headers.get('x-user-role');
    const branchId = request.headers.get('x-user-branch');
    const selectedBranch = request.headers.get('x-selected-branch');
    const branchFilter = getBranchFilter(userRole, branchId, selectedBranch, 'finance');

    // Khoảng thời gian chuẩn theo VN (00:00 ngày 1 VN -> trước 00:00 ngày 1 tháng sau VN)
    const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0) - 7 * 3600 * 1000);
    const endDate = new Date(Date.UTC(yearNum, monthNum, 1, 0, 0, 0) - 7 * 3600 * 1000);

    // Lấy học viên học phí tháng (đang học tại chi nhánh hoặc đã có hóa đơn tháng này)
    const existingMonthInvoices = await prisma.monthlyInvoice.findMany({
      where: {
        monthYear,
        ...(Object.keys(branchFilter).length > 0 ? { student: branchFilter } : {}),
      },
      include: {
        paymentLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    const invoiceMap = new Map(
      existingMonthInvoices.map((inv) => [`${inv.studentId}|${inv.classCode}`, inv])
    );

    const enrollments = await prisma.enrollment.findMany({
      where: {
        billingType: {
          in: ['MONTHLY_PREPAID', 'MONTHLY_POSTPAID'],
        },
        ...(Object.keys(branchFilter).length > 0 ? { student: branchFilter } : {}),
        OR: [
          { status: 'Đang học', student: { status: 'Đang học' } },
          ...existingMonthInvoices.map((inv) => ({
            studentId: inv.studentId,
            classCode: inv.classCode,
          })),
        ],
      },
      include: {
        student: true,
        class: true,
      },
    });

    const data = [];

    // Tìm tháng trước để kế thừa nợ cũ
    let prevM = monthNum - 1;
    let prevY = yearNum;
    if (prevM === 0) {
      prevM = 12;
      prevY -= 1;
    }
    const prevMonthYear = `${prevM.toString().padStart(2, '0')}/${prevY}`;

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
      attendances.forEach((att) => {
        const dateStr = toVnDateStr(att.date);
        if (att.status === 'Có mặt' || att.status === 'Đi trễ') {
          datesPresent.push(dateStr);
        } else if (
          att.status === 'Vắng' ||
          att.status === 'Vắng có phép' ||
          att.status === 'Vắng không phép'
        ) {
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
        if (prevInvoice.status === 'PAID' || (prevInvoice.amountPaid || 0) >= (prevInvoice.totalToPay || 0) - 0.0001) {
          autoCarryDebt = 0;
        } else {
          const remaining = Math.max(0, (prevInvoice.totalToPay || 0) - (prevInvoice.amountPaid || 0));
          autoCarryDebt += remaining;
        }
      }

      // 2. TÌM HÓA ĐƠN THÁNG HIỆN TẠI TRONG DB
      const currentInvoice = invoiceMap.get(`${enr.studentId}|${enr.classCode}`) || null;

      const monthlySessions = enr.monthlySessions || 0;
      const monthlyRate = enr.monthlyRate || 0;
      const feePerSession = (monthlyRate && monthlySessions) ? Math.round(monthlyRate / monthlySessions) : 0;

      // 🔒 NGUYÊN TẮC BẢO VỆ NỢ CŨ (ANTI-OVERWRITE)
      let effectivePreviousDebt = Math.round(autoCarryDebt);
      if (currentInvoice) {
        if (
          prevInvoice &&
          (prevInvoice.status === 'PAID' || (prevInvoice.amountPaid || 0) >= (prevInvoice.totalToPay || 0) - 0.0001) &&
          currentInvoice.status === 'UNPAID' &&
          (currentInvoice.amountPaid || 0) === 0
        ) {
          effectivePreviousDebt = 0;
        } else if (currentInvoice.previousDebtLocked || (currentInvoice.previousDebt > 0 && !prevInvoice)) {
          effectivePreviousDebt = Math.round(currentInvoice.previousDebt);
        }
      }

      // TÍNH TOÁN CÁC THÔNG SỐ LIVE THEO ĐIỂM DANH
      let liveCurrentFee = 0;
      let liveExcessMissing = 0;
      let liveTotalToPay = 0;

      if (enr.billingType === 'MONTHLY_PREPAID') {
        liveCurrentFee = Math.round(monthlyRate);
        if (!prevInvoice && actualSessions < monthlySessions) {
          liveExcessMissing = 0;
        } else {
          liveExcessMissing = Math.round((actualSessions - monthlySessions) * (monthlyRate && monthlySessions ? monthlyRate / monthlySessions : 0));
        }
        liveTotalToPay = Math.max(0, Math.round(liveCurrentFee + effectivePreviousDebt + liveExcessMissing));
      } else {
        // POSTPAID (Đóng sau)
        liveCurrentFee = Math.round(actualSessions * (monthlyRate && monthlySessions ? monthlyRate / monthlySessions : 0));
        liveExcessMissing = 0;
        liveTotalToPay = Math.max(0, Math.round(liveCurrentFee + effectivePreviousDebt));
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
        status = computeMonthlyStatus(totalToPay, amountPaid);

        if (status === 'UNPAID' && amountPaid === 0 && !currentInvoice.isLocked) {
          if (
            currentInvoice.actualSessions !== actualSessions ||
            Math.round(currentInvoice.totalToPay) !== Math.round(liveTotalToPay) ||
            Math.round(currentInvoice.previousDebt) !== Math.round(effectivePreviousDebt)
          ) {
            needsUpdate = true;
            currentFee = liveCurrentFee;
            excessMissing = liveExcessMissing;
            totalToPay = liveTotalToPay;
            previousDebt = effectivePreviousDebt;
          }
        }
      } else {
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
        studentStatus: enr.student.status,
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
        paymentLogs: currentInvoice?.paymentLogs || [],
        needsUpdate,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu học phí tháng:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}

async function upsertSingleMonthlyInvoice(item) {
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
  } = item;

  const existing = await prisma.monthlyInvoice.findUnique({
    where: {
      studentId_classCode_monthYear: {
        studentId,
        classCode,
        monthYear,
      },
    },
  });

  const pDebt = Math.round(parseFloat(previousDebt) || 0);
  const cFee = Math.round(parseFloat(currentFee) || 0);
  const eMissing = Math.round(parseFloat(excessMissing) || 0);
  const calculatedTotal = Math.max(0, cFee + pDebt + eMissing);
  const finalTotalToPay =
    totalToPay !== undefined && totalToPay !== null
      ? Math.max(0, Math.round(parseFloat(totalToPay) || 0))
      : calculatedTotal;

  const shouldLockDebt = previousDebtLocked !== undefined ? !!previousDebtLocked : pDebt > 0;

  if (existing) {
    const nextAmountPaid =
      amountPaid !== undefined && amountPaid !== null ? Math.round(parseFloat(amountPaid) || 0) : existing.amountPaid;
    const nextStatus = computeMonthlyStatus(finalTotalToPay, nextAmountPaid);
    return await prisma.monthlyInvoice.update({
      where: { id: existing.id },
      data: {
        committedSessions:
          committedSessions !== undefined && committedSessions !== null ? parseInt(committedSessions, 10) : existing.committedSessions,
        actualSessions:
          actualSessions !== undefined && actualSessions !== null ? parseInt(actualSessions, 10) : existing.actualSessions,
        feePerSession:
          feePerSession !== undefined && feePerSession !== null ? Math.round(parseFloat(feePerSession) || 0) : existing.feePerSession,
        previousDebt: pDebt,
        currentFee: cFee,
        excessMissing: eMissing,
        totalToPay: finalTotalToPay,
        amountPaid: nextAmountPaid,
        status: nextStatus,
        previousDebtLocked: shouldLockDebt,
        isLocked: isLocked !== undefined ? !!isLocked : existing.isLocked,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });
  }

  const uniqueId = Math.floor(Math.random() * 10000);
  const paymentCode = `HP${monthYear.replace('/', '')}${studentId}${uniqueId}`;
  const initialPaid = Math.round(parseFloat(amountPaid) || 0);
  const initialStatus = computeMonthlyStatus(finalTotalToPay, initialPaid);

  return await prisma.monthlyInvoice.create({
    data: {
      studentId,
      classCode,
      monthYear,
      billingType,
      committedSessions: parseInt(committedSessions, 10) || 0,
      actualSessions: parseInt(actualSessions, 10) || 0,
      feePerSession: Math.round(parseFloat(feePerSession) || 0),
      previousDebt: pDebt,
      currentFee: cFee,
      excessMissing: eMissing,
      totalToPay: finalTotalToPay,
      amountPaid: initialPaid,
      previousDebtLocked: shouldLockDebt,
      isLocked: !!isLocked,
      paymentCode,
      status: initialStatus,
      notes: notes || null,
    },
  });
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Hỗ trợ chốt sổ hàng loạt nhiều hóa đơn
    if (body.action === 'batchGenerate' && Array.isArray(body.items)) {
      const results = [];
      for (const item of body.items) {
        const inv = await upsertSingleMonthlyInvoice(item);
        results.push(inv);
      }
      try {
        await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)');
      } catch (_) {}
      return NextResponse.json({
        success: true,
        count: results.length,
        invoices: results,
      });
    }

    const invoice = await upsertSingleMonthlyInvoice(body);
    try {
      await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)');
    } catch (_) {}
    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error('Lỗi khi chốt/cập nhật hóa đơn tháng:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
