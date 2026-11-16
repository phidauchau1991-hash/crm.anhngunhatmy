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

    const { searchParams } = new URL(request.url);
    const requestedClassCode = searchParams.get('classCode');

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          where: { status: { in: ['Đang học', 'Bảo lưu', 'Tạm nghỉ'] } },
          include: {
            class: true,
          },
          orderBy: {
            id: 'desc',
          },
        },
        orders: {
          include: {
            paymentLogs: { orderBy: { createdAt: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy học viên' }, { status: 404 });
    }

    // Lấy thông tin lớp học hiện tại (ưu tiên lớp theo bộ lọc nếu đang chọn, sau đó lớp Đang học, ngược lại lấy lớp Bảo lưu/Tạm nghỉ mới nhất)
    const currentEnrollment = (requestedClassCode && requestedClassCode !== 'all'
      ? student.enrollments.find(e => e.classCode === requestedClassCode)
      : null) || student.enrollments.find(e => e.status === 'Đang học') || student.enrollments[0];
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

      // Tổng số tiền đã đóng cho lớp này (loại trừ đơn sách ORD_BK, ưu tiên đơn mới nhất của lớp)
      const targetClass = classInfo?.code || currentEnrollment.classCode;
      const order = student.orders
        .filter(o => !o.id.startsWith('ORD_BK') && o.classCode === targetClass)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      classDetails = {
        classCode: targetClass,
        level: classInfo?.level || 'N/A',
        teacherName: classInfo?.teacherName || 'N/A',
        totalSessions: config?.totalSessions || 32,
        price: config?.price || 0,
        attendedSessions,
        orderId: order ? order.id : null,
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
          promoDiscount: o.promoDiscount || 0,
          feeToPay: o.feeToPay,
          amountPaid: o.amountPaid,
          paymentStatus: o.paymentStatus,
          paymentDeadline: o.paymentDeadline ? o.paymentDeadline.toISOString().split('T')[0] : null,
          paymentLogs: o.paymentLogs || [],
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
          where: { status: { in: ['Đang học', 'Bảo lưu', 'Tạm nghỉ'] } },
          orderBy: { id: 'desc' },
        },
        orders: {
          include: {
            paymentLogs: { orderBy: { createdAt: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (student?.enrollments?.length > 1) {
      student.enrollments.sort((a, b) => {
        const aActive = a.status === 'Đang học' ? 1 : 0;
        const bActive = b.status === 'Đang học' ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return b.id - a.id;
      });
    }

    if (!student) {
      // Kiểm tra xem có phải học viên học thử (Lead) với ID số nguyên hoặc LEAD_... không
      const idStr = String(id).trim();
      const isNumericLead = /^\d+$/.test(idStr) || idStr.startsWith('LEAD_');
      if (isNumericLead && (action === 'courseware' || action === 'markCoursewareExported' || (!action && body.customBookCodes !== undefined))) {
        const numericLeadId = Number(idStr.replace(/^LEAD_/, ''));
        const lead = !isNaN(numericLeadId)
          ? await prisma.lead.findUnique({ where: { id: numericLeadId } })
          : null;

        if (lead) {
          if (action === 'markCoursewareExported') {
            const updatedLead = await prisma.lead.update({
              where: { id: numericLeadId },
              data: { coursewareLetterExportedAt: new Date() },
            });
            return NextResponse.json({
              success: true,
              message: 'Đã cập nhật trạng thái xuất thư học liệu cho học viên học thử thành công.',
              student: updatedLead,
            });
          } else {
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

            const updatedLead = await prisma.lead.update({
              where: { id: numericLeadId },
              data: {
                customBookCodes: formattedCodes,
                retainCoursewareAccess: Boolean(retainCoursewareAccess),
              },
            });
            return NextResponse.json({
              success: true,
              message: 'Đã cập nhật phân quyền giáo trình học thử thành công.',
              student: updatedLead,
            });
          }
        }
      }

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

      const totalItemCost = (includeItem && itemId && !isBookGift) ? Math.round(itemPriceVal * itemQtyVal) : 0;
      if (totalItemCost > 0 && collectAmount < totalItemCost) {
        return NextResponse.json({
          success: false,
          error: `Số tiền thu đợt này (${collectAmount.toLocaleString('vi-VN')}đ) nhỏ hơn tiền giáo trình (${totalItemCost.toLocaleString('vi-VN')}đ). Vui lòng nhập tối thiểu bằng tiền giáo trình!`
        }, { status: 400 });
      }
      const tuitionPayment = Math.max(0, Math.round(collectAmount - totalItemCost));

      const updatedOrders = [];
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const receiptCode = `PT-${timestamp.slice(2, 8)}-${randomStr}`;
      const activeClassCode = body.classCode || student.enrollments[0]?.classCode || null;

      let totalTuitionApplied = 0;
      let oldDebtBeforePayment = 0;
      let remainingDebtAfterPayment = 0;
      let receiptOriginalFee = 0;
      let receiptDiscountAmount = 0;
      let receiptDiscountLabel = '';
      let receiptFeeAfterDiscount = 0;
      let receiptPreviouslyPaid = 0;

      await prisma.$transaction(async (tx) => {
        // 1. Thu tiền học phí (Ưu tiên đơn hàng chỉ định targetOrderId -> đơn lớp đang học -> FIFO theo công nợ thực tế)
        if (tuitionPayment > 0) {
          const allStudentOrders = await tx.orderFinance.findMany({
            where: { studentId: id },
            orderBy: { createdAt: 'asc' },
          });

          const rawUnpaidOrders = allStudentOrders.filter(
            o => !o.id.startsWith('ORD_BK') && (o.feeToPay - o.amountPaid) > 0
          );

          const unpaidOrders = [...rawUnpaidOrders].sort((a, b) => {
            if (body.targetOrderId) {
              if (a.id === body.targetOrderId && b.id !== body.targetOrderId) return -1;
              if (b.id === body.targetOrderId && a.id !== body.targetOrderId) return 1;
            }
            if (activeClassCode) {
              const aMatch = a.classCode === activeClassCode ? 1 : 0;
              const bMatch = b.classCode === activeClassCode ? 1 : 0;
              if (aMatch !== bMatch) return bMatch - aMatch;
            }
            return new Date(a.createdAt) - new Date(b.createdAt);
          });

          if (unpaidOrders.length === 0) {
            throw new Error('Không tìm thấy hóa đơn học phí cần thu của học viên này (hoặc học viên đã đóng đủ học phí trước đó).');
          }

          const primaryOrder = unpaidOrders[0];
          oldDebtBeforePayment = Math.round(Math.max(0, primaryOrder.feeToPay - primaryOrder.amountPaid));
          receiptFeeAfterDiscount = Math.round(primaryOrder.feeToPay || 0);
          receiptPreviouslyPaid = Math.round(primaryOrder.amountPaid || 0);

          // Đối chiếu Học phí gốc khóa học & Khoản ưu đãi/giảm trừ để hiển thị minh bạch trên Phiếu thu điện tử
          let courseCfgPrice = 0;
          if (primaryOrder.classCode) {
            const cls = await tx.class.findUnique({ where: { code: primaryOrder.classCode } });
            if (cls?.level && cls.level !== 'MONTHLY') {
              const cfg = await tx.courseConfig.findUnique({ where: { level: cls.level } });
              courseCfgPrice = Math.round(cfg?.price || 0);
            }
          }
          const recordedPromo = Math.round(primaryOrder.promoDiscount || 0);
          const policyVal = Math.round(student.specialPolicyValue || 0);
          const policyType = student.specialPolicyType && student.specialPolicyType !== 'Không giảm'
            ? student.specialPolicyType
            : '';

          if (courseCfgPrice > 0 && courseCfgPrice > receiptFeeAfterDiscount) {
            receiptOriginalFee = courseCfgPrice;
            receiptDiscountAmount = Math.max(recordedPromo, courseCfgPrice - receiptFeeAfterDiscount);
            if (receiptOriginalFee < receiptFeeAfterDiscount + receiptDiscountAmount) {
              receiptOriginalFee = receiptFeeAfterDiscount + receiptDiscountAmount;
            }
          } else if (recordedPromo > 0) {
            receiptDiscountAmount = recordedPromo;
            receiptOriginalFee = receiptFeeAfterDiscount + receiptDiscountAmount;
          } else if (policyVal > 0 && courseCfgPrice === 0) {
            receiptDiscountAmount = policyVal;
            receiptOriginalFee = receiptFeeAfterDiscount + policyVal;
          }

          if (receiptDiscountAmount > 0) {
            const promoDesc = String(primaryOrder.promoType || '');
            const hasExtraReduction = receiptDiscountAmount > policyVal && (promoDesc.includes('Khấu trừ') || promoDesc.includes('Chuyển lớp') || promoDesc.includes('Ví'));
            if (policyVal > 0 && policyType) {
              receiptDiscountLabel = receiptDiscountAmount === policyVal
                ? `Ưu đãi cố định (${policyType})`
                : hasExtraReduction
                  ? `Ưu đãi (${policyType}) & Khấu trừ`
                  : `Ưu đãi cố định (${policyType}) & Giảm trừ`;
            } else if (policyVal > 0) {
              receiptDiscountLabel = receiptDiscountAmount === policyVal ? 'Ưu đãi cố định' : 'Ưu đãi cố định & Giảm trừ';
            } else if (hasExtraReduction) {
              receiptDiscountLabel = 'Khấu trừ / Chuyển lớp / Ưu đãi';
            } else {
              receiptDiscountLabel = 'Ưu đãi / Giảm trừ học phí';
            }
          }
          const totalOutstandingDebt = unpaidOrders.reduce(
            (sum, o) => sum + Math.max(0, o.feeToPay - o.amountPaid),
            0
          );

          if (tuitionPayment > Math.ceil(totalOutstandingDebt) + 1000) {
            throw new Error(
              `Số tiền học phí thu (${tuitionPayment.toLocaleString('vi-VN')}đ) vượt quá tổng công nợ còn lại (${Math.round(totalOutstandingDebt).toLocaleString('vi-VN')}đ). Vui lòng kiểm tra lại để tránh thu trùng!`
            );
          }

          let remainingPayment = tuitionPayment;
          for (const order of unpaidOrders) {
            if (remainingPayment <= 0) break;

            const currentDebt = order.feeToPay - order.amountPaid;
            if (currentDebt <= 0) continue;

            // Tránh lẻ 0.5đ: nếu đủ trả hết nợ của hóa đơn (hoặc chỉ lệch <= 1đ), tất toán tròn đúng feeToPay
            const roundedDebt = Math.round(currentDebt);
            const clearsOrder = remainingPayment >= roundedDebt;
            const payForThisOrder = clearsOrder ? currentDebt : remainingPayment;
            const newAmountPaid = clearsOrder ? order.feeToPay : Math.round(order.amountPaid + payForThisOrder);
            const newPaymentStatus = newAmountPaid >= order.feeToPay - 0.01 ? 'Đã đóng' : 'Chưa đóng đủ';

            const noteSuffix = ` [Thu thêm: ${Math.round(payForThisOrder).toLocaleString('vi-VN')}đ qua ${paymentMethod}${notes ? `. Ghi chú: ${notes}` : ''}]`;

            const updated = await tx.orderFinance.update({
              where: { id: order.id },
              data: {
                amountPaid: newAmountPaid,
                paymentStatus: newPaymentStatus,
                promoType: order.promoType ? `${order.promoType}${noteSuffix}` : `Thu học phí${noteSuffix}`,
              },
            });

            // Lịch sử thanh toán (kèm mã phiếu thu để đối soát)
            await tx.paymentLog.create({
              data: {
                orderId: order.id,
                amount: Math.round(payForThisOrder),
                paymentMethod: paymentMethod || 'Tiền mặt',
                notes: notes ? `${notes} (${receiptCode})` : `Thu học phí (${receiptCode})`
              }
            });

            updatedOrders.push(updated);
            totalTuitionApplied += Math.round(payForThisOrder);
            remainingPayment = Math.max(0, remainingPayment - roundedDebt);
          }

          if (totalTuitionApplied <= 0) {
            throw new Error('Không thể áp dụng khoản thu học phí vào hóa đơn. Vui lòng tải lại trang và thử lại.');
          }

          const updatedPrimary = updatedOrders.find(o => o.id === primaryOrder.id);
          remainingDebtAfterPayment = updatedPrimary
            ? Math.max(0, updatedPrimary.feeToPay - updatedPrimary.amountPaid)
            : Math.max(0, oldDebtBeforePayment - totalTuitionApplied);
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
            const classCode = activeClassCode || currentEnrollment?.classCode || 'THU_GIAO_TRINH';
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
                giftName: `${inv.name} (x${itemQtyVal})`,
                branchId: student.branchId || 'CN1_BinhDuong',
              }
            });
            await tx.paymentLog.create({
              data: {
                orderId: itemOrder.id,
                amount: totalItemCost,
                paymentMethod: paymentMethod || 'Tiền mặt',
                notes: `Mua giáo trình ${inv.name} x${itemQtyVal} (${receiptCode})`,
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

      // Đồng bộ tức thì dữ liệu từ bộ nhớ đệm WAL xuống file dev.db vật lý để chống mất dữ liệu
      try {
        await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)');
      } catch (walErr) {
        console.warn('WAL checkpoint warning:', walErr?.message);
      }

      return NextResponse.json({ 
        success: true, 
        message: `Ghi nhận thu tiền thành công!`,
        data: updatedOrders,
        receiptCode,
        receiptSummary: {
          originalFee: receiptOriginalFee,
          discountAmount: receiptDiscountAmount,
          discountLabel: receiptDiscountLabel,
          feeAfterDiscount: receiptFeeAfterDiscount,
          previouslyPaid: receiptPreviouslyPaid,
          oldDebt: oldDebtBeforePayment,
          tuitionPaid: totalTuitionApplied,
          remainingDebt: remainingDebtAfterPayment,
          totalItemCost,
          totalCollected: totalTuitionApplied + totalItemCost,
        }
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
        } else if (status === 'Đang học') {
          // Nếu học viên quay lại Đang học từ Tạm nghỉ / Bảo lưu mà chưa có lớp Đang học, khôi phục lớp Bảo lưu gần nhất
          const activeEnr = await tx.enrollment.findFirst({
            where: { studentId: id, status: 'Đang học' },
          });
          if (!activeEnr) {
            const latestReserved = await tx.enrollment.findFirst({
              where: { studentId: id, status: { in: ['Bảo lưu', 'Tạm nghỉ'] } },
              orderBy: { id: 'desc' },
            });
            if (latestReserved) {
              await tx.enrollment.update({
                where: { id: latestReserved.id },
                data: { status: 'Đang học' },
              });
            }
          }
        }
      });

      try {
        await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)');
      } catch (e) {}

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
        let feeToPay = roundDown5000(Math.max(0, proRatedTuitionNew - specialDiscount));
        let currentWallet = Math.ceil((student.walletBalance || 0) / 5000) * 5000;
        let walletUsed = 0;

        if (body.useWalletBalance && currentWallet > 0 && feeToPay > 0) {
          walletUsed = Math.min(currentWallet, feeToPay);
          feeToPay = roundDown5000(Math.max(0, feeToPay - walletUsed));
          currentWallet = Math.max(0, currentWallet - walletUsed);
        }

        await prisma.$transaction(async (tx) => {
          // 1. Tạo enrollment
          await tx.enrollment.create({
            data: {
              studentId: id,
              classCode: newClassCode,
              status: 'Đang học',
            },
          });

          // 2. Tạo hóa đơn học phí khởi điểm (chống trùng ID nếu xếp lớp nhiều lần trong tháng)
          const year = String(now.getFullYear()).substring(2);
          const month = String(now.getMonth() + 1).padStart(2, '0');
          let orderId = `ORD_${year}${month}_${id.split('_')[1]}`;
          if (student.orders.some(o => o.id === orderId)) {
            const randSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
            orderId = `${orderId}_${randSuffix}`;
          }

          const walletNote = walletUsed > 0 ? ` [Đã cấn trừ Ví bảo lưu: -${walletUsed.toLocaleString('vi-VN')}đ]` : '';

          await tx.orderFinance.create({
            data: {
              id: orderId,
              studentId: id,
              classCode: newClassCode,
              promoType: `Xếp lớp khởi điểm (Khấu trừ còn ${sessionsRemainingNew}/${totalSessionsNew} buổi)${walletNote}`,
              promoDiscount: (newConfig.price - proRatedTuitionNew) + walletUsed, // Ghi nhận phần khấu trừ như discount
              feeToPay: feeToPay,
              amountPaid: 0,
              paymentStatus: feeToPay === 0 ? 'Đã đóng' : 'Chưa đóng',
              paymentPolicy: 'Đóng trước',
              paymentDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
              branchId: newClass.branchId || student.branchId || 'CN1_BinhDuong',
            },
          });

          await tx.student.update({
            where: { id },
            data: {
              status: 'Đang học',
              callbackDate: null,
              reservationAmount: 0,
              reservationDeadline: null,
              walletBalance: currentWallet,
            },
          });
        });

        try {
          await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)');
        } catch (e) {}

        return NextResponse.json({
          success: true,
          message: 'Xếp lớp khởi điểm thành công!',
          data: {
            isInitialEnrollment: true,
            newClassCode,
            feeToPay,
            walletUsed,
            walletBalance: currentWallet,
          },
        });
      }

      const oldClassCode = currentEnrollment.classCode;
      if (oldClassCode === newClassCode && currentEnrollment.status === 'Đang học') {
        return NextResponse.json({ success: false, error: 'Lớp mới trùng với lớp hiện tại' }, { status: 400 });
      }

      // A. Lấy thông tin lớp cũ để tính số tiền đã học
      const oldClass = await prisma.class.findUnique({
        where: { code: oldClassCode },
      });
      const oldConfig = oldClass ? await prisma.courseConfig.findUnique({
        where: { level: oldClass.level },
      }) : null;

      // Số buổi đã điểm danh "Có mặt" ở lớp cũ
      const attendedSessions = await prisma.attendance.count({
        where: {
          studentId: id,
          classCode: oldClassCode,
          status: 'Có mặt',
        },
      });

      // Hóa đơn của lớp cũ để xem thực đóng (BẮT BUỘC loại trừ đơn sách ORD_BK, lấy đơn mới nhất)
      const oldOrder = student.orders
        .filter(o => !o.id.startsWith('ORD_BK') && o.classCode === oldClassCode)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
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
      let newWalletBalance = Math.ceil((student.walletBalance || 0) / 5000) * 5000;
      let walletUsed = 0;

      if (difference > 0) {
        // Học phí lớp mới cao hơn -> Học sinh phải đóng thêm (Phát sinh công nợ)
        finalFeeToPay = roundDown5000(difference);
        if (body.useWalletBalance && newWalletBalance > 0 && finalFeeToPay > 0) {
          walletUsed = Math.min(newWalletBalance, finalFeeToPay);
          finalFeeToPay = roundDown5000(Math.max(0, finalFeeToPay - walletUsed));
          newWalletBalance = Math.max(0, newWalletBalance - walletUsed);
        }
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

        // 2. Tạo hóa đơn mới cho lớp mới (chống trùng ID nếu chuyển lớp nhiều lần trong cùng tháng)
        const year = String(now.getFullYear()).substring(2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        let orderId = `ORD_TR_${year}${month}_${id.split('_')[1]}`;
        if (student.orders.some(o => o.id === orderId)) {
          const randSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
          orderId = `${orderId}_${randSuffix}`;
        }

        const adjNote = adjVal !== 0 ? ` [Điều chỉnh thủ công: ${adjVal.toLocaleString()}đ. Lý do: ${manualReason}]` : '';
        const debtNote = debtOld > 0 ? ` [Nợ cũ: ${Math.round(debtOld).toLocaleString()}đ]` : '';
        const repeatNote = transferType === 'repeat' && repeatDiscountAmount > 0 ? ` [Ưu đãi học lại: -${Math.round(repeatDiscountAmount).toLocaleString('vi-VN')}đ]` : '';
        const lateralNote = transferType === 'lateral' ? ` [Chuyển ngang trọn gói]` : '';
        const walletNote = walletUsed > 0 ? ` [Đã cấn trừ Ví: -${walletUsed.toLocaleString('vi-VN')}đ]` : '';

        await tx.orderFinance.create({
          data: {
            id: orderId,
            studentId: id,
            classCode: newClassCode,
            promoType: `Chuyển lớp từ ${oldClassCode} (Lớp mới còn ${sessionsRemainingNew}/${totalSessionsNew} buổi)${repeatNote}${lateralNote}${debtNote}${walletNote}${adjNote}`,
            promoDiscount: balanceOld + repeatDiscountAmount + specialDiscount + walletUsed + (newConfig.price - proRatedTuitionNew) + (adjVal < 0 ? Math.abs(adjVal) : 0), // Ghi nhận các khoản cấn trừ và ưu đãi
            feeToPay: finalFeeToPay,
            amountPaid: finalAmountPaid,
            paymentStatus: finalFeeToPay === 0 ? 'Đã đóng' : 'Chưa đóng',
            paymentPolicy: 'Đóng trước',
            paymentDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            branchId: newClass.branchId || student.branchId || 'CN1_BinhDuong',
          },
        });

        // 3. Cập nhật Ví học viên (Wallet) & đảm bảo trạng thái Đang học
        await tx.student.update({
          where: { id },
          data: {
            status: 'Đang học',
            callbackDate: null,
            reservationAmount: 0,
            reservationDeadline: null,
            walletBalance: newWalletBalance,
          },
        });
      });

      try {
        await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)');
      } catch (e) {}

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
          walletUsed,
          walletBalance: newWalletBalance,
        },
      });
    }

    // LUỒNG 4: Bảo lưu khóa học (Status = Bảo lưu + Nhập số tiền + Hạn bảo lưu)
    if (action === 'reserve') {
      const { reservationAmount, reservationDeadline } = body;
      const amount = Math.round(parseFloat(reservationAmount) || 0);
      const prevReserved = student.status === 'Bảo lưu' ? Math.round(student.reservationAmount || 0) : 0;
      const walletDelta = amount - prevReserved;

      await prisma.$transaction(async (tx) => {
        await tx.student.update({
          where: { id },
          data: {
            status: 'Bảo lưu',
            reservationAmount: amount,
            reservationDeadline: reservationDeadline ? new Date(reservationDeadline) : null,
            ...(walletDelta !== 0 ? { walletBalance: { increment: walletDelta } } : {}),
          },
        });

        // Chốt công nợ còn lại của các hóa đơn chưa đóng thuộc lớp đang bảo lưu về số tiền đã đóng (tránh báo nợ ảo khi đang bảo lưu)
        if (body.settleOldDebt !== false) {
          const activeClasses = student.enrollments.filter((e) => e.status === 'Đang học').map((e) => e.classCode);
          if (activeClasses.length > 0) {
            const unpaidReserveOrders = await tx.orderFinance.findMany({
              where: {
                studentId: id,
                classCode: { in: activeClasses },
                paymentStatus: { not: 'Đã đóng' },
              },
            });
            for (const uo of unpaidReserveOrders) {
              await tx.orderFinance.update({
                where: { id: uo.id },
                data: {
                  feeToPay: uo.amountPaid,
                  paymentStatus: 'Đã đóng',
                  promoType: `${uo.promoType || ''} [Chốt công nợ khi Bảo lưu]`.trim(),
                },
              });
            }
          }
        }

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
