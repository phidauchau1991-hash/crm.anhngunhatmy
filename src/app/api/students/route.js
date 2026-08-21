import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getDateRangeFromPreset } from '@/lib/dateHelpers';
import { getBranchFilter } from '@/lib/rbac';

// GET: Lấy danh sách học viên kèm theo Lớp học và Hóa đơn để tính toán trạng thái
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || ''; // 'paid', 'unpaid', 'partial', 'all'
    const studentStatus = searchParams.get('studentStatus') || ''; // 'Đang học', 'Tạm nghỉ', 'Bảo lưu', 'Nghỉ luôn', 'all'
    const preset = searchParams.get('preset') || 'all';
    const customStart = searchParams.get('startDate') || '';
    const customEnd = searchParams.get('endDate') || '';
    const birthdayMonth = searchParams.get('birthdayMonth') || 'all';

    const classCode = searchParams.get('classCode') || '';

    const { startDate, endDate } = getDateRangeFromPreset(preset, customStart, customEnd);

    const userRole = request.headers.get('x-user-role');
    const branchId = request.headers.get('x-user-branch');
    const selectedBranch = request.headers.get('x-selected-branch');
    const branchFilter = getBranchFilter(userRole, branchId, selectedBranch, 'all');

    let where = {
      ...branchFilter,
    };

    if (classCode && classCode !== 'all') {
      where.AND = [
        ...(where.AND || []),
        {
          enrollments: { 
            some: { 
              classCode: classCode,
              status: { in: ['Đang học', 'Bảo lưu'] }
            } 
          }
        }
      ];
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { id: { contains: search } },
        { phone: { contains: search } },
        { nationalId: { contains: search } },
      ];
    }

    if (studentStatus && studentStatus !== 'all') {
      if (studentStatus === 'Nghỉ luôn' || studentStatus === 'Thôi học') {
        where.OR = [
          ...(where.OR || []),
          { status: 'Nghỉ luôn' },
          { status: 'Thôi học' }
        ];
      } else {
        where.status = studentStatus;
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // Lấy danh sách học viên
    const students = await prisma.student.findMany({
      where,
      include: {
        enrollments: {
          where: { status: 'Đang học' },
          include: {
            class: true,
          },
        },
        orders: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Tính toán trạng thái thanh toán và thông tin hiển thị cho từng học viên
    const formattedStudents = students.map((student) => {
      let paymentStatus = 'Chưa đóng';
      let totalToPay = 0;
      let totalPaid = 0;

      if (student.orders.length > 0) {
        student.orders.forEach((order) => {
          totalToPay += order.feeToPay;
          totalPaid += order.amountPaid;
        });

        if (totalPaid >= totalToPay && totalToPay > 0) {
          paymentStatus = 'Đã đóng đủ';
        } else if (totalPaid > 0 && totalPaid < totalToPay) {
          paymentStatus = 'Chưa đóng đủ';
        } else {
          paymentStatus = 'Chưa đóng';
        }
      }

      // Format hiển thị chính sách miễn giảm
      let displayPolicy = 'Không';
      if (student.specialPolicyType && student.specialPolicyType !== 'Không giảm') {
        const val = student.specialPolicyValue || 0;
        displayPolicy = `${student.specialPolicyType} (Giảm ${val.toLocaleString('vi-VN')}đ)`;
      } else if (student.specialPolicy) {
        displayPolicy = student.specialPolicy;
      }

      return {
        id: student.id,
        name: student.name,
        phone: student.phone || 'N/A',
        dob: student.dob ? new Date(student.dob).toLocaleDateString('vi-VN') : 'N/A',
        dobRaw: student.dob,
        address: student.address || 'N/A',
        nationalId: student.nationalId || 'N/A',
        specialPolicy: displayPolicy,
        specialPolicyType: student.specialPolicyType || 'Không giảm',
        specialPolicyValue: student.specialPolicyValue || 0,
        referralCode: student.referralCode || 'N/A',
        classCode: student.enrollments[0]?.classCode || 'Chưa xếp lớp',
        className: student.enrollments[0]?.class?.teacherName 
          ? `${student.enrollments[0]?.classCode} (${student.enrollments[0]?.class?.teacherName})`
          : 'Chưa xếp lớp',
        totalToPay,
        totalPaid,
        debt: totalToPay - totalPaid,
        paymentStatus,
        status: student.status,
        walletBalance: student.walletBalance || 0,
        callbackDate: student.callbackDate,
        reservationAmount: student.reservationAmount || 0,
        reservationDeadline: student.reservationDeadline,
        dropoutReason: student.dropoutReason,
        createdAt: student.createdAt,
      };
    });

    // Lọc theo trạng thái thanh toán và tháng sinh
    const filteredStudents = formattedStudents.filter((student) => {
      // 1. Lọc thanh toán
      if (status && status !== 'all') {
        if (status === 'paid' && student.paymentStatus !== 'Đã đóng đủ') return false;
        if (status === 'unpaid' && student.paymentStatus !== 'Chưa đóng') return false;
        if (status === 'partial' && student.paymentStatus !== 'Chưa đóng đủ') return false;
      }

      // 2. Lọc tháng sinh
      if (birthdayMonth && birthdayMonth !== 'all' && student.dobRaw) {
        // dobRaw format is usually 'YYYY-MM-DD'
        const d = new Date(student.dobRaw);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth() + 1;
          if (m.toString() !== birthdayMonth) return false;
        } else {
          return false;
        }
      } else if (birthdayMonth && birthdayMonth !== 'all' && !student.dobRaw) {
        return false; // required birthday month but student has no birthday
      }

      return true;
    });

    // Tính toán summary số lượng học viên theo trạng thái
    let summaryWhere = { ...branchFilter };
    if (search) summaryWhere.OR = where.OR;
    if (classCode && classCode !== 'all') summaryWhere.enrollments = { some: { classCode: classCode, status: { in: ['Đang học', 'Bảo lưu'] } } };

    const allMatchingStudents = await prisma.student.findMany({
      where: summaryWhere
    });

    const statusSummary = {
      total: allMatchingStudents.length,
      studying: allMatchingStudents.filter(s => s.status === 'Đang học').length,
      paused: allMatchingStudents.filter(s => s.status === 'Tạm nghỉ').length,
      reserved: allMatchingStudents.filter(s => s.status === 'Bảo lưu').length,
      dropout: allMatchingStudents.filter(s => s.status === 'Nghỉ luôn' || s.status === 'Thôi học').length,
    };

    return NextResponse.json({
      success: true,
      data: filteredStudents,
      statusSummary,
      filter: { preset, customStart, customEnd, studentStatus }
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách học viên:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Cập nhật thông tin học viên (hoặc thêm Lead thành Học viên)
export async function PUT(request) {
  try {
    const userRole = request.headers.get('x-user-role');
    const branchId = request.headers.get('x-user-branch');
    const selectedBranch = request.headers.get('x-selected-branch');
    const branchFilter = getBranchFilter(userRole, branchId, selectedBranch, 'finance');

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID học viên là bắt buộc' }, { status: 400 });
    }

    const body = await request.json();

    // Kiểm tra quyền truy cập học viên theo branch
    const existingStudent = await prisma.student.findFirst({
      where: { id, ...branchFilter }
    });

    if (!existingStudent) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy học viên hoặc không có quyền truy cập' }, { status: 404 });
    }

    const formattedPhone = body.phone ? body.phone.toString().trim() : null;
    const formattedPhoneFinal = (formattedPhone && /^[1-9][0-9]*$/.test(formattedPhone)) ? '0' + formattedPhone : formattedPhone;
    
    const formattedCCCD = body.nationalId ? body.nationalId.toString().trim() : null;
    const formattedCCCDFinal = (formattedCCCD && /^[1-9][0-9]*$/.test(formattedCCCD)) ? '0' + formattedCCCD : formattedCCCD;

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        name: body.name,
        phone: formattedPhoneFinal,
        dob: body.dob ? new Date(body.dob) : null,
        address: body.address,
        nationalId: formattedCCCDFinal,
        specialPolicyType: body.specialPolicyType,
        specialPolicyValue: parseFloat(body.specialPolicyValue) || 0,
        status: body.status,
        callbackDate: body.callbackDate ? new Date(body.callbackDate) : null,
        dropoutReason: body.dropoutReason,
        reservationAmount: parseFloat(body.reservationAmount) || 0,
        reservationDeadline: body.reservationDeadline ? new Date(body.reservationDeadline) : null,
      }
    });

    return NextResponse.json({ success: true, data: updatedStudent });
  } catch (error) {
    console.error('Lỗi khi cập nhật học viên:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tạo học viên mới & xếp lớp tự động
export async function POST(request) {
  try {
    const userRole = request.headers.get('x-user-role');
    const branchId = request.headers.get('x-user-branch');
    const selectedBranch = request.headers.get('x-selected-branch');
    const branchFilter = getBranchFilter(userRole, branchId, selectedBranch, 'finance');
    
    const body = await request.json();
    const { 
      name, 
      phone, 
      dob, 
      address, 
      nationalId, 
      specialPolicyType, 
      specialPolicyValue, 
      classCode, 
      amountPaid, 
      promoType, 
      promoDiscount,
      promoReason,
      customFee,
      customReason,
      paymentPolicy
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Tên học viên là bắt buộc' }, { status: 400 });
    }
    if (!nationalId) {
      return NextResponse.json({ success: false, error: 'Số định danh / CCCD là bắt buộc' }, { status: 400 });
    }

    // 1. Tự động sinh mã học viên dạng HVYYMM_NNN (ví dụ: HV2606_004)
    const now = new Date();
    const year = String(now.getFullYear()).substring(2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `HV${year}${month}_`;

    const latestStudent = await prisma.student.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: 'desc' },
    });

    let nextSerial = 1;
    if (latestStudent) {
      const parts = latestStudent.id.split('_');
      if (parts.length === 2) {
        nextSerial = parseInt(parts[1]) + 1;
      }
    }
    const studentId = `${prefix}${String(nextSerial).padStart(3, '0')}`;

    // 2. Tạo bản ghi học viên
    const formattedPhone = phone ? phone.toString().trim() : null;
    const formattedPhoneFinal = (formattedPhone && /^[1-9][0-9]*$/.test(formattedPhone)) ? '0' + formattedPhone : formattedPhone;
    
    const formattedCCCD = nationalId ? nationalId.toString().trim() : null;
    const formattedCCCDFinal = (formattedCCCD && /^[1-9][0-9]*$/.test(formattedCCCD)) ? '0' + formattedCCCD : formattedCCCD;

    const policyVal = parseFloat(specialPolicyValue) || 0;
    const newStudent = await prisma.student.create({
      data: {
        id: studentId,
        name,
        phone: formattedPhoneFinal,
        dob: dob ? new Date(dob) : null,
        address,
        nationalId: formattedCCCDFinal,
        specialPolicyType: specialPolicyType || 'Không giảm',
        specialPolicyValue: policyVal,
        specialPolicy: policyVal > 0 ? `${specialPolicyType || 'Ưu đãi'} (-${policyVal.toLocaleString('vi-VN')}đ)` : 'Không',
        referralCode: studentId,
        branchId: branchId || process.env.DEFAULT_BRANCH_ID || "CN1",
      },
    });

    // 3. Nếu chọn lớp, thực hiện Xếp lớp & Tạo hóa đơn Học phí
    if (classCode && classCode !== 'none') {
      await prisma.enrollment.create({
        data: {
          studentId,
          classCode,
          status: 'Đang học',
        },
      });

      const classInfo = await prisma.class.findUnique({
        where: { code: classCode },
      });

      if (classInfo) {
        const courseConfig = await prisma.courseConfig.findUnique({
          where: { level: classInfo.level },
        });

        if (courseConfig) {
          // Đếm số buổi đã dạy ở lớp để tính số buổi còn lại
          const uniqueDatesNew = await prisma.attendance.groupBy({
            by: ['date'],
            where: { classCode: classCode },
          });
          const sessionsTaughtNew = uniqueDatesNew.length;
          const totalSessionsNew = courseConfig.totalSessions;
          const sessionsRemainingNew = Math.max(0, totalSessionsNew - sessionsTaughtNew);

          // Tính học phí khấu trừ của lớp (làm tròn xuống hàng chục nghìn)
          const costPerSessionNew = courseConfig.price / totalSessionsNew;
          const rawProRatedNew = costPerSessionNew * sessionsRemainingNew;
          const proRatedTuitionNew = Math.floor(rawProRatedNew / 10000) * 10000;

          // Kiểm tra xem có ghi đè học phí thực thu thỏa thuận không
          const parsedCustomFee = parseFloat(customFee) || 0;

          let feeToPay = 0;
          let finalPromoType = '';
          let totalDiscount = 0;

          if (parsedCustomFee > 0) {
            feeToPay = parsedCustomFee;
            finalPromoType = `Học phí thỏa thuận` + (customReason ? ` (Lý do: ${customReason})` : '');
            totalDiscount = Math.max(0, courseConfig.price - parsedCustomFee);
          } else {
            const discountFixed = policyVal; // Trừ thẳng mức giảm cố định của học viên
            const discountSeasonal = parseFloat(promoDiscount) || 0; // Trừ giảm thêm mùa vụ
            feeToPay = Math.max(0, proRatedTuitionNew - discountFixed - discountSeasonal);
            finalPromoType = `Khấu trừ còn ${sessionsRemainingNew}/${totalSessionsNew} buổi` + (discountSeasonal > 0 
              ? ` + ${promoType || 'Ưu đãi mùa vụ'}${promoReason ? ` (Lý do: ${promoReason})` : ''}` 
              : '');
            totalDiscount = (courseConfig.price - proRatedTuitionNew) + discountSeasonal;
          }

          const paidAmount = parseFloat(amountPaid) || 0;
          const paymentStatus = paidAmount >= feeToPay ? 'Đã đóng' : paidAmount > 0 ? 'Chưa đóng đủ' : 'Chưa đóng';

          // Tạo hóa đơn học phí
          const orderId = `ORD_${year}${month}_${studentId.split('_')[1]}`;

          await prisma.orderFinance.create({
            data: {
              id: orderId,
              studentId,
              classCode,
              promoType: finalPromoType,
              promoDiscount: totalDiscount,
              feeToPay,
              amountPaid: paidAmount,
              paymentStatus,
              paymentPolicy: paymentPolicy || 'Đóng trước',
              paymentDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Hạn 7 ngày
            },
          });
        }
      }
    }

    // 4. Nếu có chọn tặng phẩm/giáo trình đi kèm, thực hiện xuất kho tự động
    const { giftInventoryId, giftQuantity, giftNotes } = body;
    if (giftInventoryId && giftInventoryId !== '') {
      const parsedQty = parseInt(giftQuantity) || 1;
      
      const inv = await prisma.inventory.findUnique({
        where: { id: giftInventoryId }
      });
      
      if (inv && inv.currentStock >= parsedQty) {
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        const receiptCode = `PX-${timestamp}-${randomStr}`;

        await prisma.inventoryLog.create({
          data: {
            receiptCode,
            type: 'XUAT_TANG',
            inventoryId: giftInventoryId,
            quantity: -parsedQty,
            targetType: 'STUDENT',
            targetName: name,
            studentId: studentId,
            notes: giftNotes || 'Tặng kèm khi nhập học',
          }
        });

        await prisma.inventory.update({
          where: { id: giftInventoryId },
          data: {
            currentStock: {
              decrement: parsedQty
            }
          }
        });
      }
    }

    return NextResponse.json({ success: true, data: newStudent });
  } catch (error) {
    console.error('Lỗi khi tạo học viên mới:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
