import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getHolidayForDate } from '@/lib/holidayHelpers';

// GET: Lấy danh sách lớp học kèm theo sĩ số và số buổi động
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') || '';
    
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');

    let filter = level ? { level } : {};

    if (userRole === 'TEACHER' && userId) {
      const summaries = await prisma.attendanceSummary.findMany({
        where: { teacherId: userId },
        select: { classCode: true }
      });
      const subClassCodes = summaries.map(s => s.classCode);
      
      filter = {
        ...filter,
        OR: [
          { teacherId: userId },
          { code: { in: subClassCodes } }
        ]
      };
    }

    // Lấy lớp học kèm sỹ số học viên hiện tại (chỉ đếm học viên đang học)
    const classes = await prisma.class.findMany({
      where: filter,
      include: {
        enrollments: {
          where: { status: 'Đang học' }
        },
        teacher: {
          select: {
            shortName: true,
            fullName: true
          }
        }
      },
      orderBy: {
        code: 'asc',
      },
    });

    const formattedClasses = await Promise.all(classes.map(async (cls) => {
      // Lấy số buổi khóa học từ CourseConfig
      const config = await prisma.courseConfig.findUnique({
        where: { level: cls.level },
      });

      const totalSessions = config?.totalSessions || 32;

      // Đếm số buổi đã học bằng cách lấy danh sách các ngày điểm danh duy nhất của lớp này
      const uniqueDates = await prisma.attendance.groupBy({
        by: ['date'],
        where: { classCode: cls.code },
      });

      const sessionsTaught = uniqueDates.length;
      const sessionsRemaining = Math.max(0, totalSessions - sessionsTaught);

      const finalTeacherName = cls.teacher ? (cls.teacher.shortName || cls.teacher.fullName) : cls.teacherName;

      return {
        code: cls.code,
        level: cls.level,
        capDo: config ? config.capDo : 'Khác',
        teacherName: finalTeacherName || 'Chưa phân công',
        teacherId: cls.teacherId,
        startDate: new Date(cls.startDate).toLocaleDateString('vi-VN'),
        startDateIso: new Date(cls.startDate).toISOString().split('T')[0],
        schedule: (() => {
          if (cls.schedule.includes('|')) {
            const parts = cls.schedule.split('|');
            return parts[0].trim();
          }
          const days = [];
          if (cls.schedule.includes('2')) days.push('Thứ 2');
          if (cls.schedule.includes('3')) days.push('Thứ 3');
          if (cls.schedule.includes('4')) days.push('Thứ 4');
          if (cls.schedule.includes('5')) days.push('Thứ 5');
          if (cls.schedule.includes('6')) days.push('Thứ 6');
          if (cls.schedule.includes('7')) days.push('Thứ 7');
          if (cls.schedule.includes('8') || cls.schedule.includes('CN') || cls.schedule.toUpperCase().includes('C')) days.push('Chủ Nhật');
          return days.join(', ') || cls.schedule;
        })(),
        scheduleRaw: cls.schedule,
        careStaff: cls.careStaff || 'Chưa phân công',
        expectedEndDate: cls.expectedEndDate && new Date(cls.expectedEndDate).getFullYear() > 2090 ? 'Học liên tục' : new Date(cls.expectedEndDate).toLocaleDateString('vi-VN'),
        expectedEndDateIso: new Date(cls.expectedEndDate).toISOString().split('T')[0],
        studentCount: cls.enrollments.length,
        totalSessions,
        sessionsTaught,
        sessionsRemaining,
      };
    }));

    return NextResponse.json({ success: true, data: formattedClasses });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách lớp học:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tạo lớp học mới và tự động tính toán ngày kết thúc dự kiến
export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      customCode, 
      code: inputCode, 
      isMonthly, 
      level, 
      teacherName, 
      teacherId, 
      careStaff, 
      startDateStr, 
      schedule, 
      shiftHours,
      shift 
    } = body;

    const branchId = request.headers.get('x-user-branch') || "CN1";
    const branchPrefix = branchId.split('_')[0]; // e.g. CN1_BinhDuong -> CN1

    // TRƯỜNG HỢP 1: TẠO LỚP HỌC CHO HỌC VIÊN THÁNG / LỚP TÙY CHỈNH (KHÔNG CẦN NGÀY KHAI GIẢNG, TÊN TỰ NHẬP)
    if (isMonthly || customCode) {
      const classCode = (customCode || inputCode || '').trim();
      if (!classCode) {
        return NextResponse.json({ success: false, error: 'Vui lòng nhập tên / mã lớp học' }, { status: 400 });
      }

      // Kiểm tra xem tên / mã lớp đã tồn tại chưa
      const existingClass = await prisma.class.findUnique({
        where: { code: classCode },
      });
      if (existingClass) {
        return NextResponse.json({ 
          success: false, 
          error: `Lớp học "${classCode}" đã tồn tại trên hệ thống. Vui lòng đặt tên khác hoặc chọn lớp này!` 
        }, { status: 400 });
      }

      // Lịch học & Ca học
      let fullSchedule = (schedule || '').trim();
      if (shiftHours && shiftHours.trim()) {
        fullSchedule = fullSchedule ? `${fullSchedule} | ${shiftHours.trim()}` : shiftHours.trim();
      }
      if (!fullSchedule) fullSchedule = '—';

      // Giáo viên
      let finalTeacherName = teacherName ? teacherName.trim() : 'Chưa phân công';
      if (teacherId) {
        const teacherObj = await prisma.user.findUnique({ where: { id: teacherId } });
        if (teacherObj) {
          finalTeacherName = teacherObj.shortName || teacherObj.fullName;
        }
      }

      // Lớp tháng học liên tục xuyên suốt, không có ngày khai giảng hay ngày kết thúc cố định
      const startDate = startDateStr ? new Date(startDateStr) : new Date();
      startDate.setHours(0, 0, 0, 0);
      const expectedEndDate = new Date('2099-12-31T23:59:59.999Z');

      const newClass = await prisma.class.create({
        data: {
          code: classCode,
          level: level || 'MONTHLY',
          teacherName: finalTeacherName,
          teacherId: teacherId || null,
          careStaff: careStaff || null,
          startDate,
          schedule: fullSchedule,
          expectedEndDate,
          branchId: branchId || 'CN1_BinhDuong',
        },
      });

      return NextResponse.json({ 
        success: true, 
        data: {
          ...newClass,
          expectedEndDateStr: 'Học liên tục',
        } 
      });
    }

    // TRƯỜNG HỢP 2: TẠO LỚP HỌC THEO KHÓA CỐ ĐỊNH
    if (!level || !startDateStr || !schedule) {
      return NextResponse.json({ success: false, error: 'Cấp độ, ngày khai giảng và lịch học là bắt buộc' }, { status: 400 });
    }

    const courseConfig = await prisma.courseConfig.findUnique({
      where: { level },
    });

    if (!courseConfig) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy cấu hình khóa học tương ứng' }, { status: 400 });
    }

    const totalSessions = courseConfig.totalSessions;

    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);

    let finalTeacherName = teacherName;
    if (teacherId) {
      const teacherObj = await prisma.user.findUnique({ where: { id: teacherId } });
      if (teacherObj) {
        finalTeacherName = teacherObj.shortName || teacherObj.fullName;
      }
    }

    const gvAbbr = finalTeacherName ? finalTeacherName.replace(/\s+/g, '') : 'GV';

    // Xử lý Ca học (shift): Ưu tiên shift truyền vào, chuẩn hóa thành Ca1, Ca2, Ca3, Ca4...
    let finalShift = 'Ca1';
    if (shift) {
      const clean = shift.trim().toLowerCase();
      if (clean === '01' || clean === 'ca1' || clean === 'k1' || clean === '1') finalShift = 'Ca1';
      else if (clean === '02' || clean === 'ca2' || clean === 'k2' || clean === '2') finalShift = 'Ca2';
      else if (clean === '03' || clean === 'ca3' || clean === 'k3' || clean === '3') finalShift = 'Ca3';
      else if (clean === '04' || clean === 'ca4' || clean === 'k4' || clean === '4') finalShift = 'Ca4';
      else if (clean === '05' || clean === 'ca5' || clean === 'k5' || clean === '5') finalShift = 'Ca5';
      else if (clean === '06' || clean === 'ca6' || clean === 'k6' || clean === '6') finalShift = 'Ca6';
      else finalShift = shift.trim();
    }

    const classPrefix = `${branchPrefix}_${level}_${gvAbbr}_${schedule}_`;
    const classCode = (customCode && customCode.trim()) ? customCode.trim() : `${classPrefix}${finalShift}`;

    // Kiểm tra trùng mã lớp
    const existingClass = await prisma.class.findUnique({
      where: { code: classCode }
    });
    if (existingClass) {
      return NextResponse.json({ 
        success: false, 
        error: `Mã lớp học "${classCode}" đã tồn tại. Vui lòng chọn Ca học khác hoặc nhập Mã lớp tùy chỉnh!` 
      }, { status: 400 });
    }

    const holidays = await prisma.holiday.findMany();

    const targetDays = [];
    if (schedule.includes('2')) targetDays.push(1);
    if (schedule.includes('3')) targetDays.push(2);
    if (schedule.includes('4')) targetDays.push(3);
    if (schedule.includes('5')) targetDays.push(4);
    if (schedule.includes('6')) targetDays.push(5);
    if (schedule.includes('7')) targetDays.push(6);
    if (schedule.includes('8') || schedule.includes('CN') || schedule.toUpperCase().includes('C')) targetDays.push(0);

    if (targetDays.length === 0) {
      return NextResponse.json({ success: false, error: 'Lịch học không hợp lệ.' }, { status: 400 });
    }

    let currentDate = new Date(startDate);
    let sessionsCount = 0;

    while (sessionsCount < totalSessions) {
      const dayOfWeek = currentDate.getDay();
      const isDayHoliday = getHolidayForDate(currentDate, classCode, schedule, holidays);

      if (targetDays.includes(dayOfWeek) && !isDayHoliday) {
        sessionsCount++;
        if (sessionsCount === totalSessions) {
          break;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const expectedEndDate = new Date(currentDate);

    const newClass = await prisma.class.create({
      data: {
        code: classCode,
        level,
        teacherName: finalTeacherName || 'Chưa phân công',
        teacherId: teacherId || null,
        careStaff: careStaff || 'Chưa phân công',
        startDate,
        schedule,
        expectedEndDate,
        branchId: branchId || "CN1_BinhDuong",
      },
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        ...newClass,
        expectedEndDateStr: expectedEndDate.toLocaleDateString('vi-VN'),
      } 
    });
  } catch (error) {
    console.error('Lỗi khi tạo lớp học:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Cập nhật thông tin lớp học (Mã lớp mới, Ngày khai giảng, lịch học, GV...) và tính lại ngày kết thúc dự kiến
export async function PUT(request) {
  try {
    const body = await request.json();
    const { code, newCode, startDateStr, schedule, teacherName, teacherId, careStaff } = body;

    if (!code || !startDateStr || !schedule) {
      return NextResponse.json({ success: false, error: 'Mã lớp, ngày khai giảng và lịch học là bắt buộc' }, { status: 400 });
    }

    const cls = await prisma.class.findUnique({
      where: { code },
    });

    if (!cls) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy lớp học' }, { status: 404 });
    }

    const courseConfig = await prisma.courseConfig.findUnique({
      where: { level: cls.level },
    });

    if (!courseConfig) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy cấu hình khóa học cho lớp này' }, { status: 400 });
    }

    const totalSessions = courseConfig.totalSessions;
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);

    const holidays = await prisma.holiday.findMany();

    const targetDays = [];
    if (schedule.includes('2')) targetDays.push(1);
    if (schedule.includes('3')) targetDays.push(2);
    if (schedule.includes('4')) targetDays.push(3);
    if (schedule.includes('5')) targetDays.push(4);
    if (schedule.includes('6')) targetDays.push(5);
    if (schedule.includes('7')) targetDays.push(6);
    if (schedule.includes('8') || schedule.includes('CN') || schedule.toUpperCase().includes('C')) targetDays.push(0);

    if (targetDays.length === 0) {
      return NextResponse.json({ success: false, error: 'Lịch học không hợp lệ.' }, { status: 400 });
    }

    let currentDate = new Date(startDate);
    let sessionsCount = 0;

    const targetClassCodeForHoliday = (newCode && newCode.trim()) ? newCode.trim() : code;
    while (sessionsCount < totalSessions) {
      const dayOfWeek = currentDate.getDay();
      const isDayHoliday = getHolidayForDate(currentDate, targetClassCodeForHoliday, schedule, holidays);

      if (targetDays.includes(dayOfWeek) && !isDayHoliday) {
        sessionsCount++;
        if (sessionsCount === totalSessions) {
          break;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const expectedEndDate = new Date(currentDate);

    let finalTeacherName = teacherName;
    if (teacherId) {
      const teacherObj = await prisma.user.findUnique({ where: { id: teacherId } });
      if (teacherObj) {
        finalTeacherName = teacherObj.shortName || teacherObj.fullName;
      }
    }

    const finalNewCode = (newCode && newCode.trim()) ? newCode.trim() : code;

    // TRƯỜNG HỢP ĐỔI MÃ LỚP HỌC (finalNewCode !== code)
    if (finalNewCode !== code) {
      // 1. Kiểm tra xem mã lớp mới đã tồn tại chưa
      const existing = await prisma.class.findUnique({ where: { code: finalNewCode } });
      if (existing) {
        return NextResponse.json({ 
          success: false, 
          error: `Mã lớp mới "${finalNewCode}" đã tồn tại trên hệ thống. Vui lòng chọn mã khác!` 
        }, { status: 400 });
      }

      // 2. Chuyển đổi an toàn tuyệt đối qua transaction
      const updatedClass = await prisma.$transaction(async (tx) => {
        // Tạo lớp mới với finalNewCode
        const created = await tx.class.create({
          data: {
            code: finalNewCode,
            level: cls.level,
            startDate,
            schedule,
            expectedEndDate,
            teacherName: finalTeacherName || cls.teacherName,
            teacherId: teacherId !== undefined ? teacherId : cls.teacherId,
            careStaff: careStaff !== undefined ? careStaff : cls.careStaff,
            branchId: cls.branchId || 'CN1_BinhDuong',
          }
        });

        // Chuyển toàn bộ bản ghi con sang finalNewCode
        await tx.enrollment.updateMany({ where: { classCode: code }, data: { classCode: finalNewCode } });
        await tx.orderFinance.updateMany({ where: { classCode: code }, data: { classCode: finalNewCode } });
        await tx.attendance.updateMany({ where: { classCode: code }, data: { classCode: finalNewCode } });
        await tx.attendanceSummary.updateMany({ where: { classCode: code }, data: { classCode: finalNewCode } });
        await tx.examResult.updateMany({ where: { classCode: code }, data: { classCode: finalNewCode } });
        await tx.monthlyInvoice.updateMany({ where: { classCode: code }, data: { classCode: finalNewCode } });
        await tx.tutoringPlan.updateMany({ where: { classCode: code }, data: { classCode: finalNewCode } });
        await tx.lead.updateMany({ where: { trialClassCode: code }, data: { trialClassCode: finalNewCode } });

        // Xóa lớp cũ sau khi tất cả dữ liệu đã được di dời sang lớp mới an toàn
        await tx.class.delete({ where: { code } });

        return created;
      });

      return NextResponse.json({ 
        success: true, 
        message: `Đổi mã lớp thành công: [${code}] -> [${finalNewCode}]`,
        data: {
          ...updatedClass,
          expectedEndDateStr: expectedEndDate.toLocaleDateString('vi-VN'),
        } 
      });
    }

    // NẾU GIỮ NGUYÊN MÃ LỚP CŨ: CẬP NHẬT THÔNG THƯỜNG
    const updatedClass = await prisma.class.update({
      where: { code },
      data: {
        startDate,
        schedule,
        expectedEndDate,
        teacherName: finalTeacherName || cls.teacherName,
        teacherId: teacherId !== undefined ? teacherId : cls.teacherId,
        careStaff: careStaff !== undefined ? careStaff : cls.careStaff,
      },
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        ...updatedClass,
        expectedEndDateStr: expectedEndDate.toLocaleDateString('vi-VN'),
      } 
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật lớp học:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa lớp học theo mã lớp
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ success: false, error: 'Mã lớp học là bắt buộc' }, { status: 400 });
    }

    const existingClass = await prisma.class.findUnique({
      where: { code },
    });

    if (!existingClass) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy lớp học cần xóa' }, { status: 404 });
    }

    await prisma.class.delete({
      where: { code },
    });

    return NextResponse.json({ success: true, message: `Đã xóa lớp học ${code} thành công` });
  } catch (error) {
    console.error('Lỗi khi xóa lớp học:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
