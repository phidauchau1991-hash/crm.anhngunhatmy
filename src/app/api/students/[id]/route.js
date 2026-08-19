import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { encryptStudentId } from '@/lib/token';

// GET: Lấy thông tin chi tiết học sinh phục vụ việc chỉnh sửa / tính toán chuyển lớp
export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          where: { status: 'Đang học' },
          include: {
            class: true,
          },
        },
        orders: true,
      },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy học viên' }, { status: 404 });
    }

    // Lấy thông tin lớp học hiện tại
    const currentEnrollment = student.enrollments[0];
    let classDetails = null;

    if (currentEnrollment) {
      const classInfo = currentEnrollment.class;
      const config = classInfo ? await prisma.courseConfig.findUnique({
        where: { level: classInfo.level },
      }) : null;

      // Đếm số buổi đã học (điểm danh "Có mặt")
      const attendedSessions = classInfo ? await prisma.attendance.count({
        where: {
          studentId: id,
          classCode: classInfo.code,
          status: 'Có mặt',
        },
      }) : 0;

      // Tổng số tiền đã đóng cho lớp này
      const order = student.orders.find(o => o.classCode === (classInfo?.code || currentEnrollment.classCode));

      classDetails = {
        classCode: classInfo?.code || currentEnrollment.classCode,
        level: classInfo?.level || 'N/A',
        teacherName: classInfo?.teacherName || 'N/A',
        totalSessions: config?.totalSessions || 32,
        price: config?.price || 0,
        attendedSessions,
        amountPaid: order ? order.amountPaid : 0,
        feeToPay: order ? order.feeToPay : 0,
      };
    }

    // Lấy lịch sử điểm danh của học viên kèm nhận xét chung của lớp
    const attendances = await prisma.attendance.findMany({
      where: { studentId: id },
      orderBy: { date: 'desc' },
    });

    const attendanceWithSummary = await Promise.all(attendances.map(async (att) => {
      const summary = await prisma.attendanceSummary.findUnique({
        where: {
          classCode_date: {
            classCode: att.classCode,
            date: att.date,
          },
        },
      });
      return {
        id: att.id,
        classCode: att.classCode,
        date: att.date.toISOString().split('T')[0],
        status: att.status,
        checkInTime: att.checkInTime || '',
        teacherNotes: att.teacherNotes || '',
        classNotes: summary?.classNotes || '',
      };
    }));

    const attendanceByClass = {};
    attendanceWithSummary.forEach((att) => {
      if (!attendanceByClass[att.classCode]) {
        attendanceByClass[att.classCode] = [];
      }
      attendanceByClass[att.classCode].push(att);
    });

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.name,
          phone: student.phone,
          dob: student.dob ? student.dob.toISOString().split('T')[0] : '',
          address: student.address,
          nationalId: student.nationalId,
          specialPolicyType: student.specialPolicyType,
          specialPolicyValue: student.specialPolicyValue,
          status: student.status,
          callbackDate: student.callbackDate ? student.callbackDate.toISOString().split('T')[0] : '',
          walletBalance: student.walletBalance,
          reservationAmount: student.reservationAmount,
          reservationDeadline: student.reservationDeadline ? student.reservationDeadline.toISOString().split('T')[0] : '',
          dropoutReason: student.dropoutReason,
          parentPortalToken: encryptStudentId(student.id),
        },
        currentClass: classDetails,
        attendanceHistory: attendanceByClass,
        orders: student.orders.map(o => ({
          id: o.id,
          classCode: o.classCode,
          promoType: o.promoType || '',
          feeToPay: o.feeToPay,
          amountPaid: o.amountPaid,
          paymentStatus: o.paymentStatus,
          paymentDeadline: o.paymentDeadline ? o.paymentDeadline.toISOString().split('T')[0] : null,
        })),
      },
    });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết học viên:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Cập nhật học viên theo các luồng nghiệp vụ đại tu (Edit, Chuyển lớp, Bảo lưu, Nghỉ luôn)
export async function PUT(request, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { action } = body; // 'basic', 'statusChange', 'classTransfer', 'reserve', 'dropout'

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          where: { status: 'Đang học' }
        },
        orders: true,
      },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy học viên' }, { status: 404 });
    }

    const now = new Date();

    // LUỒNG THANH TOÁN: Thu tiền học phí (Kết hợp bán giáo trình/vật tư tùy chọn)
    if (action === 'collectTuition' || action === 'payment') {
      const { amountPaid, collectAmount: collectAmtInput, paymentMethod, notes, includeItem, itemId, itemPrice, itemQuantity } = body;
      const rawVal = String(amountPaid !== undefined && amountPaid !== null && amountPaid !== '' ? amountPaid : (collectAmtInput || '0')).replace(/[^0-9-]/g, '');
      const collectAmount = parseFloat(rawVal) || 0;
      const itemPriceVal = parseFloat(String(itemPrice || '0').replace(/[^0-9-]/g, '')) || 0;
      const itemQtyVal = parseInt(itemQuantity) || 1;

      if (collectAmount <= 0 && (!includeItem || itemPriceVal <= 0)) {
        return NextResponse.json({ success: false, error: 'Số tiền thu đợt này phải lớn hơn 0' }, { status: 400 });
      }

      const totalItemCost = (includeItem && itemId) ? (itemPriceVal * itemQtyVal) : 0;
      const tuitionPayment = Math.max(0, collectAmount - totalItemCost);

      const updatedOrders = [];

      await prisma.$transaction(async (tx) => {
        // 1. Thu tiền học phí theo thứ tự FIFO
        if (tuitionPayment > 0) {
          const unpaidOrders = await tx.orderFinance.findMany({
            where: {
              studentId: id,
              paymentStatus: { in: ['Chưa đóng', 'Chưa đóng đủ'] },
            },
            orderBy: { createdAt: 'asc' },
          });

          let remainingPayment = tuitionPayment;
          for (const order of unpaidOrders) {
            if (remainingPayment <= 0) break;

            const currentDebt = order.feeToPay - order.amountPaid;
            if (currentDebt <= 0) continue;

            const payForThisOrder = Math.min(remainingPayment, currentDebt);
            const newAmountPaid = order.amountPaid + payForThisOrder;
            const newPaymentStatus = newAmountPaid >= order.feeToPay ? 'Đã đóng' : 'Chưa đóng đủ';

            const noteSuffix = ` [Thu thêm: ${payForThisOrder.toLocaleString()}đ qua ${paymentMethod}${notes ? `. Ghi chú: ${notes}` : ''}]`;

            const updated = await tx.orderFinance.update({
              where: { id: order.id },
              data: {
                amountPaid: newAmountPaid,
                paymentStatus: newPaymentStatus,
                promoType: order.promoType ? `${order.promoType}${noteSuffix}` : `Thu học phí${noteSuffix}`,
              },
            });

            // Lịch sử thanh toán
            await tx.paymentLog.create({
              data: {
                orderId: order.id,
                amount: payForThisOrder,
                paymentMethod: paymentMethod || 'Tiền mặt',
                notes: notes || 'Thu học phí'
              }
            });

            updatedOrders.push(updated);
            remainingPayment -= payForThisOrder;
          }
        }

        // 2. Xuất bán Giáo trình / Vật tư tùy chọn kèm theo
        if (includeItem && itemId && itemQtyVal > 0) {
          const inv = await tx.inventory.findUnique({ where: { id: itemId } });
          if (!inv) throw new Error(`Không tìm thấy vật tư có mã ${itemId}`);
          if (inv.currentStock < itemQtyVal) {
            throw new Error(`Vật tư [${inv.name}] không đủ tồn kho (Còn: ${inv.currentStock}, Yêu cầu: ${itemQtyVal})`);
          }

          const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
          const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
          const receiptCode = `PX-${timestamp}-${randomStr}`;

          // Tạo log kho
          await tx.inventoryLog.create({
            data: {
              receiptCode,
              type: itemPriceVal > 0 ? 'XUAT_BAN' : 'XUAT_TANG',
              inventoryId: itemId,
              quantity: -itemQtyVal,
              targetType: 'STUDENT',
              targetName: student.name,
              studentId: id,
              notes: `Xuất bán/tặng kèm đợt thu học phí${notes ? `. ${notes}` : ''}`,
            }
          });

          // Trừ tồn kho
          await tx.inventory.update({
            where: { id: itemId },
            data: { currentStock: { decrement: itemQtyVal } }
          });

          // Nếu có thu tiền giáo trình, tự động tạo hóa đơn tài chính
          if (totalItemCost > 0) {
            const currentEnrollment = student.enrollments[0];
            const classCode = currentEnrollment?.classCode || 'THU_GIAO_TRINH';
            const year = String(now.getFullYear()).substring(2);
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const orderId = `ORD_BK_${year}${month}_${randomStr}`;

            const itemOrder = await tx.orderFinance.create({
              data: {
                id: orderId,
                studentId: id,
                classCode,
                promoType: `Mua giáo trình/vật tư đi kèm học phí (${inv.name} x${itemQtyVal}) [Qua ${paymentMethod}]`,
                promoDiscount: 0,
                feeToPay: totalItemCost,
                amountPaid: totalItemCost,
                paymentStatus: 'Đã đóng',
                paymentPolicy: 'Đóng trước',
                paymentDeadline: now,
                giftName: `${inv.name} (x${itemQtyVal})`
              }
            });
            updatedOrders.push(itemOrder);
          }
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: `Ghi nhận thu tiền thành công!`,
        data: updatedOrders 
      });
    }

    // LUỒNG 1: Cập nhật thông tin cơ bản & chính sách
    if (action === 'basic') {
      const { name, phone, dob, address, nationalId, specialPolicyType, specialPolicyValue } = body;

      const updated = await prisma.student.update({
        where: { id },
        data: {
          name,
          phone,
          dob: dob ? new Date(dob) : null,
          address,
          nationalId,
          specialPolicyType,
          specialPolicyValue: parseFloat(specialPolicyValue) || 0,
          specialPolicy: specialPolicyValue > 0 ? `${specialPolicyType} (-${parseFloat(specialPolicyValue).toLocaleString()}đ)` : 'Không',
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // LUỒNG 2: Đang học / Tạm nghỉ / Nghỉ luôn
    if (action === 'statusChange') {
      const { status, callbackDate, dropoutReason, dropoutReasonType, dropoutReasonText } = body;

      const finalDropoutReason = status === 'Nghỉ luôn'
        ? (dropoutReasonText ? `${dropoutReasonType || 'Khác'}: ${dropoutReasonText}` : (dropoutReason || dropoutReasonType || 'Nghỉ luôn'))
        : null;

      await prisma.$transaction(async (tx) => {
        await tx.student.update({
          where: { id },
          data: {
            status,
            callbackDate: (status === 'Tạm nghỉ' && callbackDate) ? new Date(callbackDate) : null,
            dropoutReason: finalDropoutReason,
          },
        });

        // Nếu học viên Tạm nghỉ hoặc Nghỉ luôn, rút tên khỏi lớp học active để dọn sạch danh sách điểm danh
        if (status === 'Tạm nghỉ' || status === 'Nghỉ luôn') {
          await tx.enrollment.updateMany({
            where: { studentId: id, status: 'Đang học' },
            data: { status: status === 'Tạm nghỉ' ? 'Bảo lưu' : 'Nghỉ học' }
          });
        }
      });

      return NextResponse.json({ success: true, message: `Đã chuyển trạng thái học viên thành "${status}" thành công!` });
    }

    // LUỒNG 3: Chuyển lớp (Tính toán cấn trừ công nợ & Ví học viên)
    if (action === 'classTransfer' || action === 'transfer') {
      const { newClassCode } = body;

      if (!newClassCode) {
        return NextResponse.json({ success: false, error: 'Mã lớp học mới là bắt buộc' }, { status: 400 });
      }

      const currentEnrollment = student.enrollments[0];
      
      // Nếu học sinh chưa có lớp nào, thực hiện Xếp lớp khởi điểm trực tiếp (tính học phí khấu trừ)
      if (!currentEnrollment) {
        const newClass = await prisma.class.findUnique({
          where: { code: newClassCode },
        });
        if (!newClass) {
          return NextResponse.json({ success: false, error: 'Không tìm thấy lớp học mới' }, { status: 400 });
        }
        const newConfig = await prisma.courseConfig.findUnique({
          where: { level: newClass.level },
        });
        if (!newConfig) {
          return NextResponse.json({ success: false, error: 'Không tìm thấy cấu hình khóa học cho lớp mới' }, { status: 400 });
        }

        // Đếm số buổi đã học ở lớp mới để tính số buổi còn lại
        const uniqueDatesNew = await prisma.attendance.groupBy({
          by: ['date'],
          where: { classCode: newClassCode },
        });
        const sessionsTaughtNew = uniqueDatesNew.length;
        const totalSessionsNew = newConfig.totalSessions;
        const sessionsRemainingNew = Math.max(0, totalSessionsNew - sessionsTaughtNew);

        // Tính học phí khấu trừ của lớp mới
        const costPerSessionNew = newConfig.price / totalSessionsNew;
        const proRatedTuitionNew = costPerSessionNew * sessionsRemainingNew;

        const specialDiscount = student.specialPolicyValue || 0;
        const feeToPay = Math.max(0, proRatedTuitionNew - specialDiscount);

        await prisma.$transaction(async (tx) => {
          // 1. Tạo enrollment
          await tx.enrollment.create({
            data: {
              studentId: id,
              classCode: newClassCode,
            },
          });

          // 2. Tạo hóa đơn học phí khởi điểm
          const year = String(now.getFullYear()).substring(2);
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const orderId = `ORD_${year}${month}_${id.split('_')[1]}`;

          await tx.orderFinance.create({
            data: {
              id: orderId,
              studentId: id,
              classCode: newClassCode,
              promoType: `Xếp lớp khởi điểm (Khấu trừ còn ${sessionsRemainingNew}/${totalSessionsNew} buổi)`,
              promoDiscount: newConfig.price - proRatedTuitionNew, // Ghi nhận phần khấu trừ như discount
              feeToPay: feeToPay,
              amountPaid: 0,
              paymentStatus: feeToPay === 0 ? 'Đã đóng' : 'Chưa đóng',
              paymentDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        });

        return NextResponse.json({
          success: true,
          message: 'Xếp lớp khởi điểm thành công!',
          data: {
            isInitialEnrollment: true,
            newClassCode,
            feeToPay,
          },
        });
      }

      const oldClassCode = currentEnrollment.classCode;
      if (oldClassCode === newClassCode) {
        return NextResponse.json({ success: false, error: 'Lớp mới trùng với lớp hiện tại' }, { status: 400 });
      }

      // A. Lấy thông tin lớp cũ để tính số tiền đã học
      const oldClass = await prisma.class.findUnique({
        where: { code: oldClassCode },
      });
      const oldConfig = await prisma.courseConfig.findUnique({
        where: { level: oldClass.level },
      });

      // Số buổi đã điểm danh "Có mặt" ở lớp cũ
      const attendedSessions = await prisma.attendance.count({
        where: {
          studentId: id,
          classCode: oldClassCode,
          status: 'Có mặt',
        },
      });

      // Hóa đơn của lớp cũ để xem thực đóng
      const oldOrder = student.orders.find(o => o.classCode === oldClassCode);
      const amountPaidOld = oldOrder ? oldOrder.amountPaid : 0;
      const feeToPayOld = oldOrder ? oldOrder.feeToPay : 0;

      const { manualAdjustment, manualReason } = body;
      const adjVal = parseFloat(manualAdjustment) || 0;

      if (adjVal !== 0 && !manualReason) {
        return NextResponse.json({ success: false, error: 'Lý do điều chỉnh là bắt buộc khi có điền số tiền điều chỉnh thủ công' }, { status: 400 });
      }

      // Tính chi phí buổi đã học ở lớp cũ: (Học phí phải đóng / Tổng số buổi) * Số buổi đã học
      const oldTotalSessions = oldConfig?.totalSessions || 32;
      const costPerSessionOld = feeToPayOld / oldTotalSessions;
      const costUsedOld = costPerSessionOld * attendedSessions;

      // Số tiền dư / Công nợ từ lớp cũ
      const financialDifference = amountPaidOld - costUsedOld;
      const balanceOld = financialDifference > 0 ? financialDifference : 0;
      const debtOld = financialDifference < 0 ? Math.abs(financialDifference) : 0;

      // B. Lấy thông tin lớp mới để tính học phí phải đóng
      const newClass = await prisma.class.findUnique({
        where: { code: newClassCode },
      });
      const newConfig = await prisma.courseConfig.findUnique({
        where: { level: newClass.level },
      });

      if (!newConfig) {
        return NextResponse.json({ success: false, error: 'Không tìm thấy cấu hình khóa học cho lớp mới' }, { status: 400 });
      }

      // Đếm số buổi đã học ở lớp mới để tính số buổi còn lại
      const uniqueDatesNew = await prisma.attendance.groupBy({
        by: ['date'],
        where: { classCode: newClassCode },
      });
      const sessionsTaughtNew = uniqueDatesNew.length;
      const totalSessionsNew = newConfig.totalSessions;
      const sessionsRemainingNew = Math.max(0, totalSessionsNew - sessionsTaughtNew);

      // Tính học phí khấu trừ của lớp mới
      const costPerSessionNew = newConfig.price / totalSessionsNew;
      const proRatedTuitionNew = costPerSessionNew * sessionsRemainingNew;

      // Áp dụng chính sách giảm học phí trọn đời của học sinh vào lớp mới
      const specialDiscount = student.specialPolicyValue || 0;
      const newClassFeeBase = Math.max(0, proRatedTuitionNew - specialDiscount);

      // Cấn trừ: Hiệu số = Học phí lớp mới (khấu trừ) - Số tiền dư lớp cũ + Công nợ cũ + Điều chỉnh thủ công
      const baseDifference = newClassFeeBase - balanceOld + debtOld;
      const difference = baseDifference + adjVal;

      let finalFeeToPay = 0;
      let finalAmountPaid = 0;
      let newWalletBalance = student.walletBalance || 0;

      if (difference > 0) {
        // Học phí lớp mới cao hơn -> Học sinh phải đóng thêm (Phát sinh công nợ)
        finalFeeToPay = difference;
        finalAmountPaid = 0;
      } else {
        // Lớp mới rẻ hơn hoặc tiền dư nhiều hơn -> Tiền dư chảy vào Ví học viên
        finalFeeToPay = 0;
        finalAmountPaid = 0;
        newWalletBalance += Math.abs(difference);
      }

      // C. Thực hiện cập nhật Database
      await prisma.$transaction(async (tx) => {
        // 1. Cập nhật xếp lớp (Bảo toàn enrollment cũ, tạo enrollment mới)
        await tx.enrollment.updateMany({
          where: { studentId: id, status: 'Đang học' },
          data: { status: 'Đã chuyển' }
        });

        await tx.enrollment.create({
          data: {
            studentId: id,
            classCode: newClassCode,
          },
        });

        // 2. Tạo hóa đơn mới cho lớp mới
        const year = String(now.getFullYear()).substring(2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const orderId = `ORD_TR_${year}${month}_${id.split('_')[1]}`;

        const adjNote = adjVal !== 0 ? ` [Điều chỉnh thủ công: ${adjVal.toLocaleString()}đ. Lý do: ${manualReason}]` : '';
        const debtNote = debtOld > 0 ? ` [Nợ cũ: ${Math.round(debtOld).toLocaleString()}đ]` : '';

        await tx.orderFinance.create({
          data: {
            id: orderId,
            studentId: id,
            classCode: newClassCode,
            promoType: `Chuyển lớp từ ${oldClassCode} (Lớp mới còn ${sessionsRemainingNew}/${totalSessionsNew} buổi)${debtNote}${adjNote}`,
            promoDiscount: balanceOld + (newConfig.price - proRatedTuitionNew) - adjVal - debtOld, // Ghi nhận các khoản cấn trừ và công nợ
            feeToPay: finalFeeToPay,
            amountPaid: finalAmountPaid,
            paymentStatus: finalFeeToPay === 0 ? 'Đã đóng' : 'Chưa đóng',
            paymentDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        // 3. Cập nhật Ví học viên (Wallet)
        await tx.student.update({
          where: { id },
          data: {
            walletBalance: newWalletBalance,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Chuyển lớp thành công!',
        data: {
          attendedSessions,
          costUsedOld,
          balanceOld,
          debtOld,
          newClassFeeBase,
          difference,
          walletBalance: newWalletBalance,
        },
      });
    }

    // LUỒNG 4: Bảo lưu khóa học (Status = Bảo lưu + Nhập số tiền + Hạn bảo lưu)
    if (action === 'reserve') {
      const { reservationAmount, reservationDeadline } = body;
      const amount = parseFloat(reservationAmount) || 0;

      await prisma.$transaction(async (tx) => {
        await tx.student.update({
          where: { id },
          data: {
            status: 'Bảo lưu',
            reservationAmount: amount,
            reservationDeadline: reservationDeadline ? new Date(reservationDeadline) : null,
            walletBalance: { increment: amount } // Tự động cộng vào ví học viên
          },
        });

        // Rút tên khỏi sĩ số lớp học (Bảo toàn danh sách nhưng không đếm vào sĩ số)
        await tx.enrollment.updateMany({
          where: { studentId: id, status: 'Đang học' },
          data: { status: 'Bảo lưu' }
        });
      });

      return NextResponse.json({ success: true, message: 'Bảo lưu thành công và tự động rút khỏi lớp' });
    }

    // LUỒNG 5: Nghỉ luôn (Status = Nghỉ luôn + Bắt buộc lý do)
    if (action === 'dropout') {
      const { dropoutReason } = body;

      if (!dropoutReason) {
        return NextResponse.json({ success: false, error: 'Lý do nghỉ luôn là bắt buộc' }, { status: 400 });
      }

      // Cập nhật trạng thái và hủy enrollment hiện tại để giải phóng sĩ số lớp
      await prisma.$transaction(async (tx) => {
        await tx.student.update({
          where: { id },
          data: {
            status: 'Nghỉ luôn',
            dropoutReason,
          },
        });

        await tx.enrollment.updateMany({
          where: { studentId: id, status: 'Đang học' },
          data: { status: 'Nghỉ học' }
        });
      });

      return NextResponse.json({ success: true, message: 'Đã hoàn tất thủ tục Nghỉ luôn cho học viên.' });
    }

    return NextResponse.json({ success: false, error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error) {
    console.error('Lỗi khi cập nhật học viên:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
