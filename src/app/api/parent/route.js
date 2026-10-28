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
        assessments: {
          orderBy: { assessmentDate: 'desc' },
        },
        examResults: {
          include: {
            config: true,
            class: true,
          },
          orderBy: { examDate: 'desc' },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy học viên trong hệ thống.' }, { status: 404 });
    }

    // Nạp thêm đánh giá thời kỳ Lead (nếu có bài kiểm tra đầu vào trước khi chuyển đổi)
    let leadAssessments = [];
    if (student.phone) {
      try {
        const matchedLead = await prisma.lead.findFirst({ where: { phone: student.phone } });
        if (matchedLead) {
          leadAssessments = await prisma.studentAssessment.findMany({
            where: { leadId: matchedLead.id, studentId: null },
            orderBy: { assessmentDate: 'desc' },
          });
        }
      } catch (err) {
        console.error('Lỗi truy vấn leadAssessments:', err);
      }
    }

    const mergedAssessments = [...(student.assessments || []), ...leadAssessments].sort(
      (a, b) => new Date(b.assessmentDate || b.createdAt) - new Date(a.assessmentDate || a.createdAt)
    );

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

    const activeEnrollment = student.enrollments.find(e => e.status === 'Đang học') || student.enrollments[0];
    const currentClassCode = activeEnrollment?.classCode;
    const tuitionOrders = student.orders.filter(o => !o.id.startsWith('ORD_BK'));
    const currentOrder = currentClassCode ? tuitionOrders.find(o => o.classCode === currentClassCode) : (tuitionOrders[tuitionOrders.length - 1] || null);

    let totalToPay = 0;
    let totalPaid = 0;
    let outstanding = 0;
    let historicalDebt = 0;

    if (currentOrder) {
      totalToPay = currentOrder.feeToPay;
      totalPaid = currentOrder.amountPaid;
      outstanding = Math.max(0, currentOrder.feeToPay - currentOrder.amountPaid);
    }
    historicalDebt = tuitionOrders
      .filter(o => currentOrder ? o.id !== currentOrder.id : true)
      .reduce((sum, o) => sum + Math.max(0, o.feeToPay - o.amountPaid), 0);

    const allTimeTotalPaid = student.orders.reduce((sum, o) => sum + o.amountPaid, 0);

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
          historicalDebt,
          allTimeTotalPaid,
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
        assessments: mergedAssessments.map(a => {
          let scores = null;
          let keywords = null;
          let comments = null;
          try { scores = a.scores ? JSON.parse(a.scores) : null; } catch {}
          try { keywords = a.keywords ? JSON.parse(a.keywords) : null; } catch {}
          try { comments = a.comments ? JSON.parse(a.comments) : null; } catch {}
          return {
            id: a.id,
            type: a.type,
            title: a.title,
            classCode: a.classCode,
            assessmentDate: a.assessmentDate ? new Date(a.assessmentDate).toISOString().split('T')[0] : '',
            totalScore: a.totalScore,
            maxScore: a.maxScore,
            scores,
            keywords,
            comments,
            notes: a.notes || '',
            assessorName: a.assessorName || 'Giáo viên',
          };
        }),
        examResults: (student.examResults || []).map(e => {
          let scores = null;
          try { scores = e.scores ? JSON.parse(e.scores) : null; } catch {}
          return {
            id: e.id,
            examName: e.config?.examName || 'Kỳ thi',
            examType: e.config?.examType || 'Kỳ thi',
            classCode: e.classCode,
            examDate: e.examDate ? new Date(e.examDate).toISOString().split('T')[0] : '',
            totalScore: e.totalScore,
            maxScore: e.maxScore,
            grade: e.grade || '',
            teacherNotes: e.teacherNotes || '',
            aiFeedback: e.aiFeedback || '',
            scores,
          };
        }),
      },
    });
  } catch (error) {
    console.error('Lỗi API Parent Portal:', error);
    return NextResponse.json({ success: false, error: 'Đã xảy ra lỗi hệ thống.', detail: error.message, stack: error.stack }, { status: 500 });
  }
}
