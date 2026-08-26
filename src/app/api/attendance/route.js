import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getHolidayForDate } from '@/lib/holidayHelpers';

// GET: Lấy danh sách điểm danh cho một lớp học vào ngày cụ thể
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classCode = searchParams.get('classCode');
    const dateStr = searchParams.get('date'); // YYYY-MM-DD

    if (!classCode) {
      return NextResponse.json({ success: false, error: 'Mã lớp học là bắt buộc' }, { status: 400 });
    }

    // Thiết lập ngày điểm danh (Mặc định hôm nay, bỏ qua giờ giấc, ép chuỗi ISO UTC để tránh lệch múi giờ)
    let targetDate;
    if (dateStr) {
      targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    } else {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      targetDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    }

    const classInfo = await prisma.class.findUnique({
      where: { code: classCode },
    });
    if (!classInfo) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy lớp học' }, { status: 404 });
    }

    const holidays = await prisma.holiday.findMany();
    const isHoliday = getHolidayForDate(targetDate, classCode, classInfo.schedule, holidays);

    if (isHoliday) {
      return NextResponse.json({
        success: true,
        data: {
          records: [],
          classNotes: '',
          isHoliday: true,
          holidayName: isHoliday.name,
          teacherId: classInfo.teacherId, // Mặc định là GV chính
          isSubstitute: false
        }
      });
    }

    // 2. Lấy log điểm danh của ngày cụ thể
    const attendanceLogs = await prisma.attendance.findMany({
      where: {
        classCode,
        date: targetDate,
      },
    });

    // 1. Lấy tất cả học sinh đang đăng ký học lớp này
    const allEnrollments = await prisma.enrollment.findMany({
      where: { classCode },
      include: {
        student: true,
      },
    });

    // Lọc học sinh: Chỉ lấy những học sinh Đang học, hoặc đã có record điểm danh trong ngày này
    const enrollments = allEnrollments.filter(e => 
      e.status === 'Đang học' || attendanceLogs.some(log => log.studentId === e.studentId && !log.isTrial)
    );

    const students = enrollments.map(e => e.student);

    // 1.1 Lấy danh sách Lead đang Học Thử ở lớp này
    const trialLeads = await prisma.lead.findMany({
      where: {
        status: 'Học thử',
        trialClassCode: classCode,
      },
    });

    // Lọc Lead có trialStartDate hợp lệ (ngày điểm danh >= ngày bắt đầu học thử nếu được thiết lập)
    const validTrialLeads = trialLeads.filter(lead => {
      if (!lead.trialStartDate) return true;
      const start = new Date(lead.trialStartDate);
      start.setHours(0, 0, 0, 0);
      return targetDate >= start;
    });



    // 2.1 Lấy nhật ký/nhận xét chung của lớp
    const summary = await prisma.attendanceSummary.findUnique({
      where: {
        classCode_date: {
          classCode,
          date: targetDate,
        },
      },
    });

    // Tính toán BUỔI THỨ MẤY của lớp dựa vào số ngày đã điểm danh trước đó
    const pastSessionsCount = await prisma.attendanceSummary.count({
      where: {
        classCode,
        date: { lt: targetDate },
      },
    });
    const classSessionNumber = pastSessionsCount + 1;

    // 3. Tính toán cộng dồn số buổi đi học/nghỉ của từng học sinh chính thức
    const studentData = await Promise.all(students.map(async (student) => {
      const totalPresent = await prisma.attendance.count({
        where: {
          studentId: student.id,
          classCode,
          status: 'Có mặt',
        },
      });

      const totalAbsent = await prisma.attendance.count({
        where: {
          studentId: student.id,
          classCode,
          status: { in: ['Vắng không phép', 'Vắng có phép', 'Nghỉ có phép'] },
        },
      });

      const totalExcused = await prisma.attendance.count({
        where: {
          studentId: student.id,
          classCode,
          status: { in: ['Vắng có phép', 'Nghỉ có phép'] },
        },
      });

      const todayLog = attendanceLogs.find(log => log.studentId === student.id);

      return {
        id: student.id,
        name: student.name,
        phone: student.phone || 'N/A',
        nationalId: student.nationalId || 'N/A',
        isTrial: false,
        status: todayLog ? todayLog.status : 'Chưa điểm danh',
        checkInTime: todayLog ? todayLog.checkInTime || '' : '',
        teacherNotes: todayLog ? todayLog.teacherNotes || '' : '',
        missingWb: todayLog ? todayLog.missingWb : false,
        missingVideo: todayLog ? todayLog.missingVideo : false,
        copyError: todayLog ? todayLog.copyError : false,
        adjustmentNotes: todayLog ? todayLog.adjustmentNotes || '' : '',
        totalPresent,
        totalAbsent,
        totalExcused,
      };
    }));

    // 3.1 Tính toán điểm danh cho các Lead học thử
    const trialData = await Promise.all(validTrialLeads.map(async (lead) => {
      const totalPresent = await prisma.attendance.count({
        where: {
          leadId: lead.id,
          classCode,
          status: 'Có mặt',
        },
      });

      const totalAbsent = await prisma.attendance.count({
        where: {
          leadId: lead.id,
          classCode,
          status: { in: ['Vắng không phép', 'Vắng có phép', 'Nghỉ có phép'] },
        },
      });

      const totalExcused = await prisma.attendance.count({
        where: {
          leadId: lead.id,
          classCode,
          status: { in: ['Vắng có phép', 'Nghỉ có phép'] },
        },
      });

      const todayLog = attendanceLogs.find(log => log.leadId === lead.id);

      return {
        id: `LEAD_${lead.id}`,
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone || 'N/A',
        nationalId: 'Học thử',
        isTrial: true,
        trialLabel: 'Học thử',
        status: todayLog ? todayLog.status : 'Chưa điểm danh',
        checkInTime: todayLog ? todayLog.checkInTime || '' : '',
        teacherNotes: todayLog ? todayLog.teacherNotes || '' : '',
        totalPresent,
        totalAbsent,
        totalExcused,
      };
    }));

    const finalData = [...studentData, ...trialData];

    return NextResponse.json({
      success: true,
      data: {
        records: finalData,
        classSessionNumber,
        classNotes: summary?.classNotes || '',
        teacherId: summary?.teacherId || classInfo.teacherId, // Mặc định GV chính
        isSubstitute: summary?.isSubstitute || false,
        vocabularyTopic: summary?.vocabularyTopic || '',
        grammarTopic: summary?.grammarTopic || '',
        readingTopic: summary?.readingTopic || '',
        hwWbPages: summary?.hwWbPages || '',
        hwCopyLines: summary?.hwCopyLines || '',
        hwVideoDeadline: summary?.hwVideoDeadline || '',
        hwOther: summary?.hwOther || '',
      },
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin điểm danh:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Xác nhận điểm danh
export async function POST(request) {
  try {
    const { 
      classCode, 
      date, 
      records, 
      classNotes,
      teacherId,
      isSubstitute,
      vocabularyTopic,
      grammarTopic,
      readingTopic,
      hwWbPages,
      hwCopyLines,
      hwVideoDeadline,
      hwOther
    } = await request.json();

    if (!classCode || !date || !records || !Array.isArray(records)) {
      return NextResponse.json({ success: false, error: 'Thông tin gửi lên không hợp lệ' }, { status: 400 });
    }

    // Ép chuỗi ISO UTC để tránh lệch múi giờ trong database SQLite
    const targetDate = new Date(`${date}T00:00:00.000Z`);

    const classInfo = await prisma.class.findUnique({
      where: { code: classCode },
    });
    if (!classInfo) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy lớp học' }, { status: 404 });
    }

    const holidays = await prisma.holiday.findMany();
    const isHoliday = getHolidayForDate(targetDate, classCode, classInfo.schedule, holidays);
    if (isHoliday) {
      return NextResponse.json({ success: false, error: `Hôm nay là ngày nghỉ: ${isHoliday.name}, không thể điểm danh.` }, { status: 400 });
    }

    // Lưu Nhận xét chung và Nội dung bài học của lớp
    await prisma.attendanceSummary.upsert({
      where: { classCode_date: { classCode, date: targetDate } },
      update: {
        classNotes: classNotes ?? undefined,
        teacherId: teacherId === "" ? null : (teacherId ?? undefined),
        isSubstitute: isSubstitute ?? undefined,
        vocabularyTopic: vocabularyTopic ?? undefined,
        grammarTopic: grammarTopic ?? undefined,
        readingTopic: readingTopic ?? undefined,
        hwWbPages: hwWbPages ?? undefined,
        hwCopyLines: hwCopyLines ?? undefined,
        hwVideoDeadline: hwVideoDeadline ?? undefined,
        hwOther: hwOther ?? undefined,
      },
      create: {
        classCode,
        date: targetDate,
        classNotes: classNotes || null,
        teacherId: teacherId || null,
        isSubstitute: isSubstitute || false,
        vocabularyTopic: vocabularyTopic || null,
        grammarTopic: grammarTopic || null,
        readingTopic: readingTopic || null,
        hwWbPages: hwWbPages || null,
        hwCopyLines: hwCopyLines || null,
        hwVideoDeadline: hwVideoDeadline || null,
        hwOther: hwOther || null,
      },
    });

    // Ghi đè hoặc thêm mới trạng thái điểm danh cho từng học viên / Lead học thử
    const promises = records.map((record) => {
      const { studentId, leadId, isTrial, status, checkInTime, teacherNotes, missingWb, missingVideo, copyError, adjustmentNotes } = record;
      
      const isLeadTrial = isTrial || (studentId && String(studentId).startsWith('LEAD_')) || !!leadId;
      const actualLeadId = leadId || (isLeadTrial && studentId ? parseInt(String(studentId).replace('LEAD_', '')) : null);

      if (isLeadTrial && actualLeadId) {
        return prisma.attendance.upsert({
          where: { leadId_classCode_date: { leadId: actualLeadId, classCode, date: targetDate } },
          update: {
            status,
            checkInTime: checkInTime || null,
            teacherNotes: teacherNotes || null,
            missingWb: !!missingWb,
            missingVideo: !!missingVideo,
            copyError: !!copyError,
            adjustmentNotes: adjustmentNotes || null,
          },
          create: {
            leadId: actualLeadId,
            classCode,
            date: targetDate,
            status,
            checkInTime: checkInTime || null,
            teacherNotes: teacherNotes || null,
            missingWb: !!missingWb,
            missingVideo: !!missingVideo,
            copyError: !!copyError,
            adjustmentNotes: adjustmentNotes || null,
          },
        });
      } else {
        return prisma.attendance.upsert({
          where: { studentId_classCode_date: { studentId, classCode, date: targetDate } },
          update: {
            status,
            checkInTime: checkInTime || null,
            teacherNotes: teacherNotes || null,
            missingWb: !!missingWb,
            missingVideo: !!missingVideo,
            copyError: !!copyError,
            adjustmentNotes: adjustmentNotes || null,
          },
          create: {
            studentId,
            classCode,
            date: targetDate,
            status,
            checkInTime: checkInTime || null,
            teacherNotes: teacherNotes || null,
            missingWb: !!missingWb,
            missingVideo: !!missingVideo,
            copyError: !!copyError,
            adjustmentNotes: adjustmentNotes || null,
          },
        });
      }
    });

    await Promise.all(promises);

    return NextResponse.json({ success: true, message: 'Ghi nhận điểm danh thành công!' });
  } catch (error) {
    console.error('Lỗi khi xác nhận điểm danh:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
