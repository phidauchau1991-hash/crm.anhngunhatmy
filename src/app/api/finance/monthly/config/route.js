import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getBranchFilter } from '@/lib/rbac';

export async function GET(request) {
  try {
    const userRole = request.headers.get('x-user-role');
    const branchId = request.headers.get('x-user-branch');
    const selectedBranch = request.headers.get('x-selected-branch');
    const branchFilter = getBranchFilter(userRole, branchId, selectedBranch, 'finance');

    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: 'Đang học',
        billingType: { in: ['MONTHLY_PREPAID', 'MONTHLY_POSTPAID'] },
        student: {
          status: 'Đang học',
          ...branchFilter,
        },
      },
      include: {
        student: true,
        class: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
    return NextResponse.json(enrollments);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách cấu hình học phí tháng:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      enrollmentId, 
      studentId: existingStudentId,
      isNewStudent,
      name,
      phone,
      dob,
      address,
      nationalId,
      classCode,
      billingType, 
      monthlyRate, 
      monthlySessions,
      notes 
    } = body;

    // 1. Trường hợp cập nhật Enrollment đã có (Chỉnh sửa học viên)
    if (enrollmentId) {
      if (classCode) {
        const targetCls = await prisma.class.findUnique({ where: { code: classCode } });
        if (!targetCls || targetCls.level !== 'MONTHLY') {
          return NextResponse.json(
            { error: `Lớp "${classCode}" thuộc hệ theo Khóa, không thể gán làm Học phí Tháng!` },
            { status: 400 }
          );
        }
      }
      const updated = await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          billingType: billingType || 'MONTHLY_PREPAID',
          monthlyRate: parseFloat(monthlyRate) || 0,
          monthlySessions: parseInt(monthlySessions, 10) || 0,
          ...(classCode ? { classCode } : {}),
        },
        include: {
          student: true,
          class: true,
        },
      });

      // Cập nhật thông tin học viên (Họ tên, SĐT, CCCD, Ngày sinh, Địa chỉ)
      if (updated.studentId) {
        await prisma.student.update({
          where: { id: updated.studentId },
          data: {
            ...(name ? { name: name.trim() } : {}),
            ...(nationalId !== undefined ? { nationalId: nationalId ? nationalId.trim() : null } : {}),
            ...(phone !== undefined ? { phone: phone ? phone.trim() : null } : {}),
            ...(address !== undefined ? { address: address ? address.trim() : null } : {}),
            ...(dob ? { dob: new Date(dob) } : {}),
          },
        });
      }

      return NextResponse.json({ success: true, data: updated });
    }

    // 2. Trường hợp tạo học viên hoàn toàn mới
    let finalStudentId = existingStudentId;
    if (isNewStudent) {
      if (!name) {
        return NextResponse.json({ error: 'Họ và tên học viên là bắt buộc' }, { status: 400 });
      }

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
          nextSerial = parseInt(parts[1], 10) + 1;
        }
      }
      finalStudentId = `${prefix}${String(nextSerial).padStart(3, '0')}`;

      const formattedPhone = phone ? phone.toString().trim() : null;
      const formattedPhoneFinal = (formattedPhone && /^[1-9][0-9]*$/.test(formattedPhone)) ? '0' + formattedPhone : formattedPhone;
      const formattedCCCD = nationalId ? nationalId.toString().trim() : finalStudentId;

      const userBranch = request.headers.get('x-user-branch');
      await prisma.student.create({
        data: {
          id: finalStudentId,
          name: name.trim(),
          phone: formattedPhoneFinal,
          dob: dob ? new Date(dob) : null,
          address: address ? address.trim() : null,
          nationalId: formattedCCCD,
          specialPolicyType: 'Không giảm',
          specialPolicy: 'Không',
          referralCode: finalStudentId,
          branchId: userBranch || 'CN1_BinhDuong',
          status: 'Đang học',
        },
      });
    }

    if (!finalStudentId) {
      return NextResponse.json({ error: 'Chưa xác định được học viên' }, { status: 400 });
    }

    // Nếu là học viên cũ nhưng có truyền CCCD/SĐT mới -> Cập nhật luôn
    if (existingStudentId) {
      await prisma.student.update({
        where: { id: existingStudentId },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(nationalId !== undefined ? { nationalId: nationalId ? nationalId.trim() : null } : {}),
          ...(address !== undefined ? { address: address ? address.trim() : null } : {}),
          ...(phone !== undefined ? { phone: phone ? phone.trim() : null } : {}),
          ...(dob ? { dob: new Date(dob) } : {}),
        },
      });
    }

    if (!classCode) {
      return NextResponse.json({ error: 'Chưa chọn lớp học' }, { status: 400 });
    }

    const classInfo = await prisma.class.findUnique({ where: { code: classCode } });
    if (!classInfo || classInfo.level !== 'MONTHLY') {
      return NextResponse.json(
        { error: `Lớp "${classCode}" là lớp theo Khóa cố định, không thể đưa vào danh sách Học phí Tháng!` },
        { status: 400 }
      );
    }

    // 3. Xếp lớp / Cập nhật Enrollment cho học viên này
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: finalStudentId,
        classCode: classCode,
      },
    });

    const parsedRate = parseFloat(monthlyRate) || 0;
    const parsedSessions = parseInt(monthlySessions, 10) || 0;

    let enrollmentRecord;
    if (existingEnrollment) {
      enrollmentRecord = await prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          status: 'Đang học',
          billingType: billingType || 'MONTHLY_PREPAID',
          monthlyRate: parsedRate,
          monthlySessions: parsedSessions,
        },
        include: {
          student: true,
          class: true,
        },
      });
    } else {
      enrollmentRecord = await prisma.enrollment.create({
        data: {
          studentId: finalStudentId,
          classCode: classCode,
          status: 'Đang học',
          billingType: billingType || 'MONTHLY_PREPAID',
          monthlyRate: parsedRate,
          monthlySessions: parsedSessions,
        },
        include: {
          student: true,
          class: true,
        },
      });
    }

    return NextResponse.json({ success: true, data: enrollmentRecord });
  } catch (error) {
    console.error('Lỗi khi lưu cấu hình học phí tháng:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// Xóa học viên:
// - permanent = true: Xóa vĩnh viễn khỏi toàn bộ hệ thống (dành cho học viên demo / tạo thử)
// - permanent = false: Xóa khỏi danh sách học phí tháng (xóa enrollment, độc lập hoàn toàn, không liên quan học theo khóa)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const enrollmentId = parseInt(searchParams.get('enrollmentId'), 10);
    const permanent = searchParams.get('permanent') === 'true';
    const force = searchParams.get('force') === 'true';

    if (!enrollmentId) {
      return NextResponse.json({ error: 'Thiếu enrollmentId' }, { status: 400 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { class: true },
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin phân lớp của học viên' }, { status: 404 });
    }

    const studentId = enrollment.studentId;

    if (permanent && studentId) {
      const userRole = request.headers.get('x-user-role') || '';
      const roles = userRole.split(',').map((r) => r.trim());
      if (!roles.includes('DIRECTOR') && !roles.includes('REGIONAL_MANAGER')) {
        return NextResponse.json(
          { error: 'Chỉ Giám đốc mới được phép xóa vĩnh viễn học viên khỏi hệ thống' },
          { status: 403 }
        );
      }

      // Xóa vĩnh viễn học viên và mọi bản ghi liên quan trong CSDL (bao gồm TutoringPlan để không vướng Restrict)
      await prisma.$transaction(async (tx) => {
        const plans = await tx.tutoringPlan.findMany({ where: { studentId }, select: { id: true } });
        if (plans.length > 0) {
          await tx.tutoringSession.deleteMany({ where: { planId: { in: plans.map((p) => p.id) } } });
          await tx.tutoringPlan.deleteMany({ where: { studentId } });
        }
        await tx.studentAssessment.deleteMany({ where: { studentId } });
        await tx.cambridgeRegistration.deleteMany({ where: { studentId } });
        await tx.attendance.deleteMany({ where: { studentId } });
        await tx.monthlyInvoice.deleteMany({ where: { studentId } });
        await tx.orderFinance.deleteMany({ where: { studentId } });
        await tx.inventoryLog.deleteMany({ where: { studentId } });
        await tx.examResult.deleteMany({ where: { studentId } });
        await tx.certificate.deleteMany({ where: { studentId } });
        await tx.enrollment.deleteMany({ where: { studentId } });
        await tx.student.delete({ where: { id: studentId } });
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Đã xóa vĩnh viễn học viên và toàn bộ dữ liệu liên quan khỏi hệ thống hoàn toàn.' 
      });
    }

    // Bảo vệ lớp Khóa: Không bao giờ cho phép "Xóa khỏi tháng" nếu enrollment thuộc lớp Khóa
    if (enrollment.class && enrollment.class.level !== 'MONTHLY') {
      return NextResponse.json(
        { error: `Lớp "${enrollment.classCode}" là lớp theo Khóa, không thể xóa bằng thao tác "Xóa khỏi tháng"! Hãy chuyển học viên về hệ Khóa thay vì xóa.` },
        { status: 400 }
      );
    }

    // Kiểm tra công nợ hóa đơn tháng chưa thu của học viên ở lớp này
    const unpaidMonthlyCount = await prisma.monthlyInvoice.count({
      where: {
        studentId,
        classCode: enrollment.classCode,
        status: { in: ['UNPAID', 'PARTIAL'] },
      },
    });
    if (unpaidMonthlyCount > 0 && !force) {
      return NextResponse.json(
        {
          requiresConfirm: true,
          error: `Học viên này vẫn còn ${unpaidMonthlyCount} hóa đơn học phí tháng chưa thu ở lớp "${enrollment.classCode}". Nếu rút khỏi lớp tháng, hóa đơn cũ vẫn lưu để đối soát. Bạn có chắc muốn tiếp tục?`,
        },
        { status: 409 }
      );
    }

    // Xóa học viên khỏi danh sách tháng (chỉ xóa enrollment lớp tháng này)
    await prisma.enrollment.delete({
      where: { id: enrollmentId },
    });

    const remainingActive = await prisma.enrollment.count({
      where: { studentId, status: 'Đang học' },
    });

    return NextResponse.json({ 
      success: true, 
      message: remainingActive > 0
        ? `Đã rút học viên khỏi lớp tháng "${enrollment.classCode}" (Hồ sơ và lớp học khác của học viên vẫn được giữ nguyên).`
        : `Đã rút học viên khỏi danh sách lớp tháng "${enrollment.classCode}".`
    });
  } catch (error) {
    console.error('Lỗi khi xóa học viên khỏi danh sách tháng:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
