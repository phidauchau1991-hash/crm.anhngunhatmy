import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { decryptStudentId } from '@/lib/token';

export const revalidate = 0;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Thiếu mã liên kết sổ liên lạc.' }, { status: 400 });
    }

    const studentId = decryptStudentId(token);

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Mã liên kết không hợp lệ hoặc đã hết hạn.' }, { status: 400 });
    }

    // 1. Fetch student info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            class: true,
          },
        },
        orders: true,
        certificates: {
          orderBy: { createdAt: 'desc' }
        },
        inventoryLogs: {
          include: {
            inventory: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy học viên trong hệ thống.' }, { status: 404 });
    }

    // 2. Fetch attendance history
    const attendances = await prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
    });

    // Resolve attendance with class notes/summaries
    const attendanceHistory = await Promise.all(
      attendances.map(async (att) => {
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
          date: att.date ? new Date(att.date).toISOString().split('T')[0] : '',
          status: att.status,
          checkInTime: att.checkInTime || '',
          teacherNotes: att.teacherNotes || '',
          classNotes: summary?.classNotes || '',
        };
      })
    );

    // 3. Calculate statistics
    const totalSessionsChecked = attendances.length;
    const totalSessionsAttended = attendances.filter(att => att.status === 'Có mặt').length;
    
    let presenceRate = 100;
    if (totalSessionsChecked > 0) {
      presenceRate = Math.round((totalSessionsAttended / totalSessionsChecked) * 1000) / 10;
    }

    let totalToPay = 0;
    let totalPaid = 0;
    student.orders.forEach(order => {
      totalToPay += order.feeToPay;
      totalPaid += order.amountPaid;
    });

    const outstanding = Math.max(0, totalToPay - totalPaid);

    // 4. Format inventory logs
    const inventoryLogs = student.inventoryLogs.map(log => ({
      id: log.id,
      receiptCode: log.receiptCode || 'N/A',
      type: log.type,
      inventoryId: log.inventoryId,
      inventoryName: log.inventory?.name || 'Vật tư',
      category: log.inventory?.category || 'Chưa phân loại',
      quantity: Math.abs(log.quantity), // show absolute quantity
      notes: log.notes || '',
      createdAt: log.createdAt ? new Date(log.createdAt).toISOString().split('T')[0] : '',
    }));

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.name,
          phone: student.phone || 'N/A',
          dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : 'N/A',
          address: student.address || 'N/A',
          status: student.status,
          walletBalance: student.walletBalance || 0,
        },
        stats: {
          totalSessionsAttended,
          presenceRate,
          totalToPay,
          totalPaid,
          outstanding,
        },
        enrollments: student.enrollments.map(e => ({
          id: e.id,
          classCode: e.classCode,
          teacherName: e.class?.teacherName || 'N/A',
          startDate: e.class?.startDate ? new Date(e.class.startDate).toISOString().split('T')[0] : 'N/A',
          expectedEndDate: e.class?.expectedEndDate ? new Date(e.class.expectedEndDate).toISOString().split('T')[0] : 'N/A',
          schedule: e.class?.schedule || '',
          midTermListening: e.midTermListening,
          midTermSpeaking: e.midTermSpeaking,
          midTermReading: e.midTermReading,
          midTermWriting: e.midTermWriting,
          finalListening: e.finalListening,
          finalSpeaking: e.finalSpeaking,
          finalReading: e.finalReading,
          finalWriting: e.finalWriting,
          teacherNotes: e.teacherNotes || '',
        })),
        attendanceHistory,
        certificates: (student.certificates || []).map(cert => ({
          id: cert.id,
          examName: cert.examName,
          examDate: cert.examDate ? cert.examDate.toISOString().split('T')[0] : null,
          score: cert.score || 'N/A',
          notes: cert.notes || '',
        })),
        inventoryLogs,
      },
    });
  } catch (error) {
    console.error('Lỗi API Parent Portal:', error);
    return NextResponse.json({ success: false, error: 'Đã xảy ra lỗi hệ thống.', detail: error.message, stack: error.stack }, { status: 500 });
  }
}
