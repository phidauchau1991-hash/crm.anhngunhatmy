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
          orderBy: {
            id: 'desc',
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
        monthlyInvoices: {
          orderBy: { id: 'desc' },
        },
        monthlyAcademicReports: {
          orderBy: { id: 'desc' },
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

    // Sắp xếp enrollments sao cho lớp Đang học luôn đứng đầu (enrollments[0])
    const sortedEnrollments = [...(student.enrollments || [])].sort((a, b) => {
      const aActive = a.status === 'Đang học' ? 1 : 0;
      const bActive = b.status === 'Đang học' ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return b.id - a.id;
    });

    const activeEnrollment = sortedEnrollments.find(e => e.status === 'Đang học') || sortedEnrollments[0];
    const currentClassCode = activeEnrollment?.classCode;
    const tuitionOrders = student.orders.filter(o => !o.id.startsWith('ORD_BK'));
    const matchingClassOrders = currentClassCode ? tuitionOrders.filter(o => o.classCode === currentClassCode) : [];
    const currentOrder = matchingClassOrders.length > 0
      ? [...matchingClassOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
      : (tuitionOrders.length > 0 ? [...tuitionOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] : null);

    let totalToPay = 0;
    let totalPaid = 0;
    let outstanding = 0;
    let historicalDebt = 0;

    const monthlyPaidTotal = (student.monthlyInvoices || []).reduce((sum, m) => sum + (m.amountPaid || 0), 0);
    const monthlyOutstandingTotal = (student.monthlyInvoices || []).reduce(
      (sum, m) => sum + Math.max(0, (m.totalToPay || 0) - (m.amountPaid || 0)),
      0
    );
    const isMonthlyActive = Boolean(
      activeEnrollment &&
      (activeEnrollment.billingType === 'MONTHLY_PREPAID' ||
       activeEnrollment.billingType === 'MONTHLY_POSTPAID' ||
       activeEnrollment.class?.level === 'MONTHLY')
    );

    if (currentOrder && !isMonthlyActive) {
      totalToPay = currentOrder.feeToPay;
      totalPaid = currentOrder.amountPaid;
      outstanding = Math.max(0, currentOrder.feeToPay - currentOrder.amountPaid);
    } else if (isMonthlyActive) {
      const latestMonthly = (student.monthlyInvoices || [])[0];
      totalToPay = latestMonthly ? latestMonthly.totalToPay : (activeEnrollment?.monthlyRate || 0);
      totalPaid = monthlyPaidTotal;
      outstanding = monthlyOutstandingTotal;
    }
    historicalDebt = tuitionOrders
      .filter(o => (currentOrder && !isMonthlyActive) ? o.id !== currentOrder.id : true)
      .reduce((sum, o) => sum + Math.max(0, o.feeToPay - o.amountPaid), 0);

    const allTimeTotalPaid = student.orders.reduce((sum, o) => sum + o.amountPaid, 0) + monthlyPaidTotal;

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

    // Truy vấn tiến độ Học liệu số tại nhà từ StudySession & Student
    let courseware = {
      url: `/hoclieu?token=${encodeURIComponent(token)}`,
      studyMinutes14d: 0,
      totalStudyMinutes: 0,
      lastLesson: null,
      lastActiveAt: null,
      activated: false,
    };
    try {
      const cwStats = await prisma.$queryRaw`
        SELECT
          COALESCE(SUM(CASE WHEN createdAt >= datetime('now', '-14 days') THEN durationSeconds ELSE 0 END), 0) AS sec14d,
          COALESCE(SUM(durationSeconds), 0) AS totalSec,
          MAX(createdAt) AS lastAt
        FROM StudySession
        WHERE studentId = ${student.id}
      `;
      const row = cwStats?.[0] || {};
      const lastLessonRow = await prisma.$queryRaw`
        SELECT lessonTitle FROM StudySession
        WHERE studentId = ${student.id} AND lessonTitle IS NOT NULL AND lessonTitle != ''
        ORDER BY id DESC LIMIT 1
      `;
      const mins14 = Math.round(Number(row.sec14d || 0) / 60.0);
      const minsTotal = Math.round(Number(row.totalSec || 0) / 60.0);
      courseware = {
        url: `/hoclieu?token=${encodeURIComponent(token)}`,
        studyMinutes14d: mins14,
        totalStudyMinutes: minsTotal,
        lastLesson: lastLessonRow?.[0]?.lessonTitle || null,
        lastActiveAt: row.lastAt || null,
        activated: Boolean(row.lastAt || minsTotal > 0),
      };
    } catch (_) {}

    return NextResponse.json({
      success: true,
      data: {
        courseware,
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
        enrollments: sortedEnrollments.map(e => ({
          id: e.id,
          classCode: e.classCode,
          status: e.status || 'Đang học',
          level: e.class?.level || '',
          teacherName: e.class?.teacherName || 'N/A',
          startDate: e.class?.startDate ? new Date(e.class.startDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'N/A',
          expectedEndDate: e.class?.expectedEndDate ? new Date(e.class.expectedEndDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'N/A',
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
          const cfg = e.config || {};
          const examType = cfg.examType || 'Kỳ thi';
          const level = cfg.level || '';
          const examName = level ? `${level} - ${examType}` : examType;
          const scores = {
            process: {
              label: 'Quá trình',
              score: Number(((e.processTotal ?? 0)).toFixed(1)),
              max: 10,
              weight: cfg.processWeight ?? 10,
            },
            speaking: {
              label: 'Nói (Speaking)',
              score: e.speakingScore ?? 0,
              max: cfg.speakingMax ?? 40,
              weight: cfg.speakingWeight ?? 30,
            },
            listening: {
              label: 'Nghe (Listening)',
              score: e.listeningScore ?? 0,
              max: cfg.listeningMax ?? 26,
              weight: cfg.listeningWeight ?? 20,
            },
            rw: {
              label: 'Đọc & Viết (R&W)',
              score: e.rwScore ?? 0,
              max: cfg.rwMax ?? 36,
              weight: cfg.rwWeight ?? 40,
            },
          };
          const comments = {
            speaking: e.commentSpeaking || '',
            listening: e.commentListening || '',
            rw: e.commentRW || '',
            dev: e.commentDev || '',
          };
          const combinedNotes = [
            e.commentSpeaking ? `• Speaking: ${e.commentSpeaking}` : '',
            e.commentListening ? `• Listening: ${e.commentListening}` : '',
            e.commentRW ? `• Reading & Writing: ${e.commentRW}` : '',
          ].filter(Boolean).join('\n');

          return {
            id: e.id,
            examName,
            examType,
            level,
            classCode: e.classCode,
            examDate: e.examDate ? new Date(e.examDate).toISOString().split('T')[0] : '',
            totalScore: e.totalScore !== null && e.totalScore !== undefined ? Number(Number(e.totalScore).toFixed(1)) : null,
            maxScore: 100,
            grade: e.grade || '',
            teacherNotes: combinedNotes,
            aiFeedback: e.commentDev || '',
            comments,
            scores,
          };
        }),
        monthlyInvoices: (student.monthlyInvoices || []).map(inv => ({
          id: inv.id,
          classCode: inv.classCode,
          monthYear: inv.monthYear,
          billingType: inv.billingType,
          actualSessions: inv.actualSessions,
          committedSessions: inv.committedSessions,
          totalToPay: inv.totalToPay,
          amountPaid: inv.amountPaid,
          status: inv.status,
          paymentCode: inv.paymentCode,
        })),
        monthlyReports: (student.monthlyAcademicReports || []).map(rep => ({
          id: rep.id,
          classCode: rep.classCode,
          monthYear: rep.monthYear,
          teacherKeywords: rep.teacherKeywords || '',
          aiComment: rep.aiComment || '',
        })),
      },
    });
  } catch (error) {
    console.error('Lỗi API Parent Portal:', error);
    return NextResponse.json({ success: false, error: 'Đã xảy ra lỗi hệ thống.', detail: error.message, stack: error.stack }, { status: 500 });
  }
}
