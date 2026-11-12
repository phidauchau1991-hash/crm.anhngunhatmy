import path from 'path';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { decryptStudentId, encryptStudentId } from '@/lib/token';
import { getBookCodesFromClass, parseCustomBookCodes } from '@/lib/coursewareBooks';

const COURSEWARE_SECRET_KEY = process.env.COURSEWARE_SECRET_KEY || 'nhatmy_cw_sec_8f92a4b8e19c4d379058fa16';

function runtimeRequire(mod) {
  const req = eval('require');
  return req(mod);
}

function formatRelativeTime(dStr) {
  if (!dStr) return 'Chưa từng vào học';
  try {
    const d = new Date(dStr.endsWith('Z') ? dStr : `${dStr}Z`);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `Hôm nay ${hh}:${mm}`;
    }
    if (days === 1) return 'Hôm qua';
    if (days < 14) return `${days} ngày trước`;
    return 'Trên 2 tuần trước';
  } catch {
    return dStr;
  }
}

// Xử lý CORS Preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
    },
  });
}

// GET: Lấy quyền học liệu, dữ liệu telemetry Dashboard hoặc xem trước báo cáo 14 ngày
export async function GET(request) {
  try {
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!apiKey || apiKey !== COURSEWARE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'Xác thực không hợp lệ. Vui lòng kiểm tra mã x-api-key.' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || searchParams.get('mode');

    if (action === 'report_preview' || action === 'report_info') {
      try {
        const reportService = runtimeRequire(path.join(process.cwd(), 'scripts', 'courseware-report-service.js'));
        const classCode = searchParams.get('class_code') || null;
        const reportData = reportService.get14DayReportData(classCode);
        return NextResponse.json(
          { success: true, report: reportData },
          {
            status: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'no-store, max-age=0',
            },
          }
        );
      } catch (err) {
        return NextResponse.json(
          { success: false, error: err.message },
          { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    // 1.1 Tải danh sách lớp đang hoạt động + dữ liệu học thật 14 ngày phục vụ Dashboard
    if (action === 'classes' || action === 'dashboard') {
      const classes = await prisma.class.findMany({
        include: {
          enrollments: {
            where: { status: 'Đang học' },
            include: { student: true },
          },
          teacher: {
            select: {
              shortName: true,
              fullName: true,
            },
          },
        },
        orderBy: { code: 'asc' },
      });

      const Database = runtimeRequire('better-sqlite3');
      const db = new Database(path.join(process.cwd(), 'dev.db'));
      let formattedClasses = [];

      try {
        const stmt14 = db.prepare(
          "SELECT COALESCE(SUM(durationSeconds), 0)/60 as m14 FROM StudySession WHERE studentId = ? AND createdAt >= datetime('now', '-14 days')"
        );
        const stmtTel = db.prepare(
          'SELECT coursewareLastActiveAt, coursewareCurrentProgress, coursewareActivatedAt FROM Student WHERE id = ?'
        );

        formattedClasses = classes
          .map((cls) => {
            const teacherName = cls.teacher
              ? cls.teacher.shortName || cls.teacher.fullName
              : cls.teacherName || 'Chưa phân công';
            const classBooks = getBookCodesFromClass(cls);

            const students = cls.enrollments.map((en) => {
              const s = en.student;
              const customBooks = parseCustomBookCodes(s.customBookCodes);
              const effectiveBooks = customBooks && customBooks.length > 0 ? customBooks : classBooks;
              const tel = stmtTel.get(s.id) || {};
              const s14 = stmt14.get(s.id) || { m14: 0 };
              const m14 = Math.round(s14.m14 || 0);
              const isAct = Boolean(tel.coursewareActivatedAt || m14 > 0);

              let stStatus = 'danger';
              if (m14 >= 45) stStatus = 'active';
              else if (m14 > 0) stStatus = 'warn';

              return {
                id: s.id,
                name: s.name,
                phone: s.phone || '',
                status: stStatus,
                last_active: formatRelativeTime(tel.coursewareLastActiveAt),
                duration_minutes: m14,
                current_progress: tel.coursewareCurrentProgress || (effectiveBooks[0] ? effectiveBooks.join(', ') : 'Chưa học'),
                activated: isAct,
                custom_book_codes: customBooks,
                effective_book_codes: effectiveBooks,
                retain_access: Boolean(s.retainCoursewareAccess),
              };
            });

            return {
              code: cls.code,
              level: cls.level,
              teacher_name: teacherName,
              care_staff: cls.careStaff || 'Chưa phân công',
              schedule: cls.schedule || '',
              active_students_count: students.length,
              students,
            };
          })
          .filter((cls) => cls.active_students_count > 0);
      } finally {
        db.close();
      }

      return NextResponse.json(
        {
          success: true,
          total_classes: formattedClasses.length,
          classes: formattedClasses,
        },
        {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, max-age=0',
          },
        }
      );
    }

    const token = searchParams.get('token');
    const studentIdParam = searchParams.get('student_id') || searchParams.get('studentId');

    if (!token && !studentIdParam) {
      return NextResponse.json(
        { success: false, error: 'Thiếu tham số định danh: cần cung cấp "token" hoặc "student_id".' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 2. Phân giải mã học viên từ Token hoặc ID
    let studentId = studentIdParam;
    if (token) {
      const decrypted = decryptStudentId(token);
      if (!decrypted) {
        return NextResponse.json(
          { success: false, error: 'Mã token học viên không hợp lệ hoặc đã hết hạn.' },
          { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }
      studentId = decrypted;
    }

    // 3. Tìm kiếm học viên trong CSDL CRM
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          where: { status: 'Đang học' },
          include: { class: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: `Không tìm thấy học viên với mã: ${studentId}` },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 4. Chuẩn hóa trạng thái học viên
    let normalizedStatus = 'ACTIVE';
    const rawStatus = (student.status || '').trim();
    if (rawStatus === 'Tạm nghỉ' || rawStatus === 'Bảo lưu') {
      normalizedStatus = 'PAUSED';
    } else if (rawStatus === 'Nghỉ luôn' || rawStatus === 'Đã chuyển') {
      normalizedStatus = 'QUIT';
    } else if (rawStatus === 'Chờ xếp lớp') {
      normalizedStatus = 'PENDING';
    }

    // 5. Tính toán danh sách giáo trình được cấp phát
    const activeEnrollment = student.enrollments?.[0] || null;
    const classInfo = activeEnrollment?.class || null;
    const classBookCodes = getBookCodesFromClass(classInfo);
    const customBookCodes = parseCustomBookCodes(student.customBookCodes);
    const effectiveBookCodes = customBookCodes && customBookCodes.length > 0 ? customBookCodes : classBookCodes;

    // 6. Tính toán quyền truy cập
    const retainGranted = Boolean(student.retainCoursewareAccess);
    const isStudentActive = normalizedStatus === 'ACTIVE';

    let accessGranted = false;
    let accessReason = 'NO_ACCESS';

    if (isStudentActive || retainGranted) {
      accessGranted = true;
      accessReason = 'OK';
    } else {
      accessGranted = false;
      accessReason = normalizedStatus === 'PAUSED' ? 'PAUSED' : 'NO_ACCESS';
    }

    const portalToken = encryptStudentId(student.id);

    return NextResponse.json(
      {
        success: true,
        student: {
          student_id: student.id,
          student_name: student.name,
          phone: student.phone || '',
          status: normalizedStatus,
          portal_token: portalToken,
          class_info: classInfo
            ? {
                class_id: classInfo.code,
                class_name: classInfo.code,
                level: classInfo.level,
                teacher_name: classInfo.teacherName || '',
              }
            : null,
          retain_courseware_access: retainGranted,
          custom_book_codes: customBookCodes,
          effective_book_codes: accessGranted ? effectiveBookCodes : [],
          access_granted: accessGranted,
          access_reason: accessReason,
          effective_date: (student.updatedAt || new Date()).toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Lỗi khi kiểm tra quyền học liệu số:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ nội bộ', details: error.message },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

// POST: Ghi nhận Learning Heartbeat hoặc gửi Email báo cáo 14 ngày
export async function POST(request) {
  try {
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!apiKey || apiKey !== COURSEWARE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'Xác thực không hợp lệ.' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    let body = {};
    try {
      body = await request.json();
    } catch {}

    if (body.action === 'send_report') {
      try {
        const reportService = runtimeRequire(path.join(process.cwd(), 'scripts', 'courseware-report-service.js'));
        const targetEmail = body.to_email || 'academic@anhngunhatmy.edu.vn';
        const classCode = body.class_code || null;
        const res = await reportService.sendBiweeklyReport(targetEmail, classCode);
        return NextResponse.json(
          {
            success: true,
            message: 'Đã gửi chuông báo định kỳ 14 ngày thành công!',
            messageId: res.messageId,
            sentTo: res.sentTo,
            summary: {
              totalClasses: res.reportData.totalClasses,
              totalStudents: res.reportData.totalStudents,
              activeTotal: res.reportData.activeTotal,
              warnTotal: res.reportData.warnTotal,
              dangerTotal: res.reportData.dangerTotal,
              overallRate: res.reportData.overallRate,
              cycleStart: res.reportData.cycleStart,
              cycleEnd: res.reportData.cycleEnd,
            },
          },
          { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      } catch (err) {
        return NextResponse.json(
          { success: false, error: `Lỗi gửi báo cáo: ${err.message}` },
          { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    const studentId = body.student_id || body.studentId;
    const bookCode = body.book_code || body.bookCode || '';
    const lessonTitle = body.lesson_title || body.lessonTitle || '';
    const durationSeconds = Math.max(1, Math.min(3600, parseInt(body.duration_seconds || body.durationSeconds || 60, 10)));

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu mã học viên student_id.' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const Database = runtimeRequire('better-sqlite3');
    const db = new Database(path.join(process.cwd(), 'dev.db'));
    try {
      db.prepare(
        'INSERT INTO StudySession (studentId, bookCode, lessonTitle, durationSeconds) VALUES (?, ?, ?, ?)'
      ).run(studentId, bookCode, lessonTitle, durationSeconds);

      const minutesAdd = Math.round(durationSeconds / 60);
      db.prepare(
        "UPDATE Student SET coursewareLastActiveAt = CURRENT_TIMESTAMP, coursewareCurrentProgress = CASE WHEN ? != '' THEN ? ELSE coursewareCurrentProgress END, coursewareStudyMinutes = COALESCE(coursewareStudyMinutes, 0) + ?, coursewareActivatedAt = COALESCE(coursewareActivatedAt, CURRENT_TIMESTAMP), updatedAt = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(lessonTitle, lessonTitle, minutesAdd, studentId);
    } finally {
      db.close();
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Heartbeat recorded',
        student_id: studentId,
        recorded_seconds: durationSeconds,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err) {
    console.error('Lỗi khi ghi nhận heartbeat:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ', details: err.message },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
