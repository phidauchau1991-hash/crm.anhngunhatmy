import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        billingType: { in: ['MONTHLY_PREPAID', 'MONTHLY_POSTPAID'] },
      },
      include: {
        student: true,
        class: true,
      },
      orderBy: {
        id: 'desc',
      }
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
      classCode,
      billingType, 
      monthlyRate, 
      monthlySessions,
      notes 
    } = body;

    // 1. Trường hợp cập nhật Enrollment đã có
    if (enrollmentId) {
      const updated = await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          billingType: billingType || 'MONTHLY_PREPAID',
          monthlyRate: parseFloat(monthlyRate) || 0,
          monthlySessions: billingType === 'MONTHLY_PREPAID' ? (parseInt(monthlySessions, 10) || 0) : null,
        },
        include: {
          student: true,
          class: true,
        }
      });
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

      await prisma.student.create({
        data: {
          id: finalStudentId,
          name: name.trim(),
          phone: formattedPhoneFinal,
          dob: dob ? new Date(dob) : null,
          address: address || null,
          nationalId: finalStudentId,
          specialPolicyType: 'Không giảm',
          specialPolicy: 'Không',
          referralCode: finalStudentId,
          branchId: 'CN1',
          status: 'Đang học',
        }
      });
    }

    if (!finalStudentId) {
      return NextResponse.json({ error: 'Chưa xác định được học viên' }, { status: 400 });
    }

    if (!classCode) {
      return NextResponse.json({ error: 'Chưa chọn lớp học' }, { status: 400 });
    }

    // 3. Xếp lớp / Cập nhật Enrollment cho học viên này
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: finalStudentId,
        classCode: classCode,
      }
    });

    const parsedRate = parseFloat(monthlyRate) || 0;
    const parsedSessions = billingType === 'MONTHLY_PREPAID' ? (parseInt(monthlySessions, 10) || 0) : null;

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
        }
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
        }
      });
    }

    return NextResponse.json({ success: true, data: enrollmentRecord });
  } catch (error) {
    console.error('Lỗi khi lưu cấu hình học phí tháng:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
