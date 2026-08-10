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

    // Lấy lớp học kèm sỹ số học viên hiện tại
    const classes = await prisma.class.findMany({
      where: filter,
      include: {
        enrollments: true,
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

      return {
        code: cls.code,
        level: cls.level,
        teacherName: cls.teacherName || 'Chưa phân công',
        teacherId: cls.teacherId,
        startDate: new Date(cls.startDate).toLocaleDateString('vi-VN'),
        startDateIso: new Date(cls.startDate).toISOString().split('T')[0],
        schedule: (() => {
          const days = [];
          if (cls.schedule.includes('2')) days.push('Thứ 2');
          if (cls.schedule.includes('3')) days.push('Thứ 3');
          if (cls.schedule.includes('4')) days.push('Thứ 4');
          if (cls.schedule.includes('5')) days.push('Thứ 5');
          if (cls.schedule.includes('6')) days.push('Thứ 6');
          if (cls.schedule.includes('7')) days.push('Thứ 7');
          if (cls.schedule.includes('8') || cls.schedule.includes('CN') || cls.schedule.toUpperCase().includes('C')) days.push('Chủ Nhật');
          return days.join(', ');
        })(),
        scheduleRaw: cls.schedule,
        careStaff: cls.careStaff || 'Chưa phân công',
        expectedEndDate: new Date(cls.expectedEndDate).toLocaleDateString('vi-VN'),
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
    const { level, teacherName, teacherId, careStaff, startDateStr, schedule } = body;

    if (!level || !startDateStr || !schedule) {
      return NextResponse.json({ success: false, error: 'Cấp độ, ngày khai giảng và lịch học là bắt buộc' }, { status: 400 });
    }

    const branchId = request.headers.get('x-user-branch') || "CN1";
    const branchPrefix = branchId.split('_')[0]; // e.g. CN1_BinhDuong -> CN1

    const courseConfig = await prisma.courseConfig.findUnique({
      where: { level },
    });

    if (!courseConfig) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy cấu hình khóa học tương ứng' }, { status: 400 });
    }

    const totalSessions = courseConfig.totalSessions;

    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);

    const gvAbbr = teacherName ? teacherName.replace(/\s+/g, '') : 'GV';
    const classPrefix = `${branchPrefix}_${level}_${gvAbbr}_${schedule}_`;

    const latestClass = await prisma.class.findFirst({
      where: {
        code: {
          startsWith: classPrefix,
        },
      },
      orderBy: {
        code: 'desc',
      },
    });

    let nextSerial = 1;
    if (latestClass) {
      const parts = latestClass.code.split('_');
      const serialPart = parts[parts.length - 1];
      nextSerial = parseInt(serialPart) + 1;
    }
    const classCode = `${classPrefix}${String(nextSerial).padStart(2, '0')}`;

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
        teacherName: teacherName || 'Chưa phân công',
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

// PUT: Cập nhật thông tin lớp học (Ngày khai giảng, lịch học, GV...) và tính lại ngày kết thúc dự kiến
export async function PUT(request) {
  try {
    const body = await request.json();
    const { code, startDateStr, schedule, teacherName, teacherId, careStaff } = body;

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

    while (sessionsCount < totalSessions) {
      const dayOfWeek = currentDate.getDay();
      const isDayHoliday = getHolidayForDate(currentDate, code, schedule, holidays);

      if (targetDays.includes(dayOfWeek) && !isDayHoliday) {
        sessionsCount++;
        if (sessionsCount === totalSessions) {
          break;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const expectedEndDate = new Date(currentDate);

    const updatedClass = await prisma.class.update({
      where: { code },
      data: {
        startDate,
        schedule,
        expectedEndDate,
        teacherName: teacherName || cls.teacherName,
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

