import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { encryptStudentId } from '@/lib/token';

function roundDown5000(amount) {
  return Math.floor(amount / 5000) * 5000;
}

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
        billingType: currentEnrollment.billingType,
        monthlyRate: currentEnrollment.monthlyRate,
        monthlySessions: currentEnrollment.monthlySessions,
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
          customBookCodes: student.customBookCodes,
          retainCoursewareAccess: Boolean(student.retainCoursewareAccess),
          coursewareLetterExportedAt: student.coursewareLetterExportedAt ? student.coursewareLetterExportedAt.toISOString() : null,
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

    // LUỒNG CẤP PHÁT HỌC LIỆU SỐ (Courseware Integration)
    if (action === 'courseware' || (!action && body.customBookCodes !== undefined)) {
      const { customBookCodes, retainCoursewareAccess } = body;
      let formattedCodes = '[]';
      if (Array.isArray(customBookCodes)) {
        formattedCodes = JSON.stringify([...new Set(customBookCodes.map(c => String(c).trim()).filter(Boolean))]);
      } else if (typeof customBookCodes === 'string') {
        try {
          const parsed = JSON.parse(customBookCodes);
          formattedCodes = JSON.stringify(Array.isArray(parsed) ? parsed : []);
        } catch {
          formattedCodes = JSON.stringify([customBookCodes.trim()]);
        }
      }

      const updatedStudent = await prisma.student.update({
        where: { id },
        data: {
          customBookCodes: formattedCodes,
          retainCoursewareAccess: Boolean(retainCoursewareAccess),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Đã cập nhật phân quyền giáo trình học viên thành công.',
        student: updatedStudent,
      });
    }

    // LUỒNG ĐÁNH DẤU XUẤT THƯ HỌC LIỆU / THẺ HỌC VIÊN
    if (action === 'markCoursewareExported') {
      const updatedStudent = await prisma.student.update({
        where: { id },
        data: {
          coursewareLetterExportedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Đã cập nhật trạng thái xuất thư học liệu thành công.',
        student: updatedStudent,
      });
    }

    // LUỒNG THANH TOÁN: Thu tiền học phí (Kết hợp bán/tặng giáo trình & tặng phẩm)
    if (action === 'collectTuition' || action === 'payment') {
      const { 
        amountPaid, 
        collectAmount: collectAmtInput, 
        paymentMethod, 
        notes, 
        includeItem, 
        itemId, 
        itemPrice, 
        itemQuantity,
        itemDistributionType,
        includeGift,
        giftId,
        giftQuantity
      } = body;

      const rawVal = String(amountPaid !== undefined && amountPaid !== null && amountPaid !== '' ? amountPaid : (collectAmtInput || '0')).replace(/[^0-9-]/g, '');
      const collectAmount = parseFloat(rawVal) || 0;
      const isBookGift = itemDistributionType === 'TANG_KEM_KHOA';
      const itemPriceVal = isBookGift ? 0 : (parseFloat(String(itemPrice || '0').replace(/[^0-9-]/g, '')) || 0);
      const itemQtyVal = parseInt(itemQuantity) || 1;
      const giftQtyVal = parseInt(giftQuantity) || 1;

      if (collectAmount <= 0 && (!includeItem || itemPriceVal <= 0) && !includeGift) {
        return NextResponse.json({ success: false, error: 'Số tiền thu đợt này hoặc vật tư cấp phát phải hợp lệ' }, { status: 400 });
      }

      const totalItemCost = (includeItem && itemId && !isBookGift) ? (itemPriceVal * itemQtyVal) : 0;
      const tuitionPayment = Math.max(0, collectAmount - totalItemCost);

      const updatedOrders = [];
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const receiptCode = `PT-${timestamp.slice(2, 8)}-${randomStr}`;

      await prisma.$transaction(async (tx) => {
        // 1. Thu tiền học phí (Ưu tiên đơn hàng chỉ định targetOrderId, sau đó theo thứ tự FIFO)
        if (tuitionPayment > 0) {
          let unpaidOrders = [];
          if (body.targetOrderId) {
            const specificOrder = await tx.orderFinance.findUnique({
              where: { id: body.targetOrderId }
            });
            if (specificOrder && (specificOrder.feeToPay - specificOrder.amountPaid > 0)) {
              unpaidOrders.push(specificOrder);
            }
          }

          const otherUnpaidOrders = await tx.orderFinance.findMany({
            where: {
              studentId: id,
              id: body.targetOrderId ? { not: body.targetOrderId } : undefined,
              paymentStatus: { in: ['Chưa đóng', 'Chưa đóng đủ'] },
            },
            orderBy: { createdAt: 'asc' },
          });

          unpaidOrders = [...unpaidOrders, ...otherUnpaidOrders];

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

        // 2. Xuất bán hoặc Tặng kèm Giáo trình / Sách
        if (includeItem && itemId && itemQtyVal > 0) {
          const inv = await tx.inventory.findUnique({ where: { id: itemId } });
          if (!inv) throw new Error(`Không tìm thấy vật tư có mã ${itemId}`);
          if (inv.currentStock < itemQtyVal) {
            throw new Error(`Vật tư [${inv.name}] không đủ tồn kho (Còn: ${inv.currentStock}, Yêu cầu: ${itemQtyVal})`);
          }

          const pxCode = `PX-${timestamp}-${randomStr}`;

          // Tạo log kho
          await tx.inventoryLog.create({
            data: {
              receiptCode: pxCode,
              type: itemPriceVal > 0 ? 'XUAT_BAN' : 'XUAT_TANG',
              inventoryId: itemId,
              quantity: -itemQtyVal,
              targetType: 'STUDENT',
              targetName: student.name,
              studentId: id,
              notes: isBookGift 
                ? `Tặng kèm giáo trình theo khóa học (${inv.name} x${itemQtyVal})${notes ? `. ${notes}` : ''}`
                : `Xuất bán giáo trình kèm đợt thu học phí (${inv.name} x${itemQtyVal})${notes ? `. ${notes}` : ''}`,
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

        // 3. Xuất Tặng phẩm ghi danh / tri ân (Balo, Áo thun, Bình nước...) nếu có chọn
        if (includeGift && giftId && giftQtyVal > 0) {
          const giftInv = await tx.inventory.findUnique({ where: { id: giftId } });
          if (!giftInv) throw new Error(`Không tìm thấy quà tặng có mã ${giftId}`);
          if (giftInv.currentStock < giftQtyVal) {
            throw new Error(`Quà tặng [${giftInv.name}] không đủ tồn kho (Còn: ${giftInv.currentStock}, Yêu cầu: ${giftQtyVal})`);
          }

          const giftPxCode = `PXG-${timestamp}-${randomStr}`;

          await tx.inventoryLog.create({
            data: {
              receiptCode: giftPxCode,
              type: 'XUAT_TANG',
              inventoryId: giftId,
              quantity: -giftQtyVal,
              targetType: 'STUDENT',
              targetName: student.name,
              studentId: id,
              notes: `Tặng phẩm ghi danh / tri ân học viên (${giftInv.name} x${giftQtyVal})${notes ? `. ${notes}` : ''}`,
            }
          });

          await tx.inventory.update({
            where: { id: giftId },
            data: { currentStock: { decrement: giftQtyVal } }
          });
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: `Ghi nhận thu tiền thành công!`,
        data: updatedOrders,
        receiptCode
      });
    }

    // LUỒNG 1: Cập nhật thông tin cơ bản & chính sách & Học liệu số
    if (action === 'basic') {
      const { 
        name, 
        phone, 
        dob, 
        address, 
        nationalId, 
        specialPolicyType, 
        specialPolicyValue,
        customBookCodes,
        retainCoursewareAccess 
      } = body;

      const updateData = {
        name,
        phone,
        dob: dob ? new Date(dob) : null,
        address,
        nationalId,
        specialPolicyType,
        specialPolicyValue: parseFloat(specialPolicyValue) || 0,
        specialPolicy: specialPolicyValue > 0 ? `${specialPolicyType} (-${parseFloat(specialPolicyValue).toLocaleString()}đ)` : 'Không',
      };

      if (customBookCodes !== undefined) {
        updateData.customBookCodes = typeof customBookCodes === 'string' ? customBookCodes : JSON.stringify(customBookCodes);
      }
      if (retainCoursewareAccess !== undefined) {
        updateData.retainCoursewareAccess = Boolean(retainCoursewareAccess);
      }

      const updated = await prisma.student.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // LUỒNG TÀI CHÍNH: Cấu hình thu học phí tháng
    if (action === 'finance') {
      const { billingType, monthlyRate, monthlySessions } = body;
      
      if (!student.enrollments || student.enrollments.length === 0) {
        return NextResponse.json({ success: false, error: 'Học viên không có lớp đang học để cấu hình' }, { status: 400 });
      }

      const currentEnrollment = student.enrollments[0];
      
      const updated = await prisma.enrollment.update({
        where: { id: currentEnrollment.id },
        data: {
          billingType,
          monthlyRate,
          monthlySessions
        }
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // LUỒNG 2: Đang học / Tạm nghỉ / Nghỉ luôn
    if (action === 'statusChange') {
      const { status, callbackDate, dropoutReason, dropoutReasonType, dropoutReasonText, retainCoursewareAccess } = body;

      const finalDropoutReason = status === 'Nghỉ luôn'
        ? (dropoutReasonText ? `${dropoutReasonType || 'Khác'}: ${dropoutReasonText}` : (dropoutReason || dropoutReasonType || 'Nghỉ luôn'))
        : null;

      await prisma.$transaction(async (tx) => {
        const studentUpdate = {
          status,
          callbackDate: (status === 'Tạm nghỉ' && callbackDate) ? new Date(callbackDate) : null,
          dropoutReason: finalDropoutReason,
        };

        if (retainCoursewareAccess !== undefined) {
          studentUpdate.retainCoursewareAccess = Boolean(retainCoursewareAccess);
        }

        await tx.student.update({
          where: { id },
          data: studentUpdate,
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
      const newClass = await prisma.class.findUnique({
        where: { code: newClassCode },
      });
      if (!newClass) {
        return NextResponse.json({ success: false, error: 'Không tìm thấy lớp học mới' }, { status: 400 });
      }

      // Nếu lớp mới là Lớp Học Kèm / Đóng Theo Tháng (level === 'MONTHLY')
      if (newClass.level === 'MONTHLY') {
        await prisma.$transaction(async (tx) => {
          if (currentEnrollment && currentEnrollment.classCode !== newClassCode) {
            await tx.enrollment.update({
              where: { id: currentEnrollment.id },
              data: { status: 'Đã chuyển lớp' },
            });
          }
          await tx.enrollment.create({
            data: {
              studentId: id,
              classCode: newClassCode,
              status: 'Đang học',
              billingType: 'MONTHLY_PREPAID',
              monthlyRate: currentEnrollment?.monthlyRate || 1200000,
              monthlySessions: currentEnrollment?.monthlySessions || 8,
            },
          });
        });

        return NextResponse.json({
          success: true,
          message: `Đã xếp học viên vào lớp học theo tháng "${newClassCode}" thành công!`,
          data: { newClassCode },
        });
      }
      
      // Nếu học sinh chưa có lớp nào, thực hiện Xếp lớp khởi điểm trực tiếp (tính học phí khấu trừ)
      if (!currentEnrollment) {
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
        const feeToPay = roundDown5000(Math.max(0, proRatedTuitionNew - specialDiscount));

        await prisma.$transaction(async (tx) => {
          // 1. Tạo enrollment
          await tx.enrollment.create({
            data: {
              studentId: id,
              classCode: newClassCode,
              status: 'Đang học',
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
      const amountPaidOld = (body.overrideAmountPaidOld !== undefined && body.overrideAmountPaidOld !== null && body.overrideAmountPaidOld !== '')
        ? parseFloat(body.overrideAmountPaidOld)
        : (oldOrder ? oldOrder.amountPaid : 0);
      const feeToPayOld = oldOrder ? oldOrder.feeToPay : 0;

      const { 
        manualAdjustment, 
        manualReason,
        transferType = 'normal',
        repeatDiscountType = 'none',
        repeatDiscountValue = 0
      } = body;
      const adjVal = parseFloat(manualAdjustment) || 0;

      if (adjVal !== 0 && !manualReason) {
        return NextResponse.json({ success: false, error: 'Lý do điều chỉnh là bắt buộc khi có điền số tiền điều chỉnh thủ công' }, { status: 400 });
      }

      // Tính chi phí buổi đã học ở lớp cũ: (Học phí của lớp / Tổng số buổi) * Số buổi đã học
      const oldTotalSessions = oldConfig?.totalSessions || 32;
      let costUsedOld = 0;
      if (transferType === 'lateral') {
        // Chuyển ngang trọn gói: Không trừ tiền số buổi đã học ở lớp cũ
        costUsedOld = 0;
      } else {
        const baseOldFee = feeToPayOld > 0 ? feeToPayOld : (oldConfig?.price || 0);
        const costPerSessionOld = oldTotalSessions > 0 ? (baseOldFee / oldTotalSessions) : 0;
        costUsedOld = Math.round(costPerSessionOld * attendedSessions);
      }

      // Số tiền dư / Công nợ từ lớp cũ
      const financialDifference = amountPaidOld - costUsedOld;
      const balanceOld = financialDifference > 0 ? financialDifference : 0;
      const debtOld = financialDifference < 0 ? Math.abs(financialDifference) : 0;

      // B. Lấy thông tin lớp mới để tính học phí phải đóng
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
      const costPerSessionNew = totalSessionsNew > 0 ? (newConfig.price / totalSessionsNew) : 0;
      const proRatedTuitionNew = costPerSessionNew * sessionsRemainingNew;

      // Tính ưu đãi học lại nếu có
      let repeatDiscountAmount = 0;
      if (transferType === 'repeat') {
        const rVal = parseFloat(repeatDiscountValue) || 0;
        if (repeatDiscountType === 'percent_30') {
          repeatDiscountAmount = proRatedTuitionNew * 0.3;
        } else if (repeatDiscountType === 'percent_50') {
          repeatDiscountAmount = proRatedTuitionNew * 0.5;
        } else if (repeatDiscountType === 'free') {
          repeatDiscountAmount = proRatedTuitionNew;
        } else if (repeatDiscountType === 'custom_percent') {
          repeatDiscountAmount = (proRatedTuitionNew * rVal) / 100;
        } else if (repeatDiscountType === 'custom_vnd') {
          repeatDiscountAmount = rVal;
        }
      }

      // Áp dụng chính sách giảm học phí trọn đời của học sinh vào lớp mới
      const specialDiscount = student.specialPolicyValue || 0;
      const totalDiscountNew = repeatDiscountAmount + specialDiscount;
      const newClassFeeBase = Math.max(0, proRatedTuitionNew - totalDiscountNew);

      // Cấn trừ: Hiệu số = Học phí lớp mới (khấu trừ) - Số tiền dư lớp cũ + Công nợ cũ + Điều chỉnh thủ công
      const baseDifference = newClassFeeBase - balanceOld + debtOld;
      const difference = baseDifference + adjVal;

      let finalFeeToPay = 0;
      let finalAmountPaid = 0;
      let newWalletBalance = student.walletBalance || 0;

      if (difference > 0) {
        // Học phí lớp mới cao hơn -> Học sinh phải đóng thêm (Phát sinh công nợ)
        finalFeeToPay = roundDown5000(difference);
        finalAmountPaid = 0;
      } else {
        // Lớp mới rẻ hơn hoặc tiền dư nhiều hơn -> Tiền dư chảy vào Ví học viên
        finalFeeToPay = 0;
        finalAmountPaid = 0;
        // Có lợi cho khách: Làm tròn LÊN hàng 5000đ khi tính số dư được cộng vào ví
        const roundedExcess = Math.ceil(Math.abs(difference) / 5000) * 5000;
        newWalletBalance += roundedExcess;
      }

      // C. Thực hiện cập nhật Database
      await prisma.$transaction(async (tx) => {
        // 1. Cập nhật trạng thái lớp cũ
        await tx.enrollment.update({
          where: { id: currentEnrollment.id },
          data: { status: 'Đã chuyển lớp' },
        });

        // 1.5. Cập nhật hóa đơn cũ (Chốt công nợ vào hóa đơn cũ)
        // Bằng cách set feeToPay = amountPaidOld, công nợ/tiền thừa của lớp cũ sẽ bằng 0
        // và toàn bộ số dư/công nợ đó đã được cộng dồn vào finalFeeToPay của hóa đơn mới!
        if (oldOrder) {
          await tx.orderFinance.update({
            where: { id: oldOrder.id },
            data: { feeToPay: oldOrder.amountPaid }
          });
        }

        // Tạo enrollment mới cho lớp mới
        await tx.enrollment.create({
          data: {
            studentId: id,
            classCode: newClassCode,
            status: 'Đang học',
          },
        });

        // 2. Tạo hóa đơn mới cho lớp mới
        const year = String(now.getFullYear()).substring(2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const orderId = `ORD_TR_${year}${month}_${id.split('_')[1]}`;

        const adjNote = adjVal !== 0 ? ` [Điều chỉnh thủ công: ${adjVal.toLocaleString()}đ. Lý do: ${manualReason}]` : '';
        const debtNote = debtOld > 0 ? ` [Nợ cũ: ${Math.round(debtOld).toLocaleString()}đ]` : '';
        const repeatNote = transferType === 'repeat' && repeatDiscountAmount > 0 ? ` [Ưu đãi học lại: -${Math.round(repeatDiscountAmount).toLocaleString('vi-VN')}đ]` : '';
        const lateralNote = transferType === 'lateral' ? ` [Chuyển ngang trọn gói]` : '';

        await tx.orderFinance.create({
          data: {
            id: orderId,
            studentId: id,
            classCode: newClassCode,
            promoType: `Chuyển lớp từ ${oldClassCode} (Lớp mới còn ${sessionsRemainingNew}/${totalSessionsNew} buổi)${repeatNote}${lateralNote}${debtNote}${adjNote}`,
            promoDiscount: balanceOld + repeatDiscountAmount + specialDiscount + (newConfig.price - proRatedTuitionNew) + (adjVal < 0 ? Math.abs(adjVal) : 0), // Ghi nhận các khoản cấn trừ và ưu đãi
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
