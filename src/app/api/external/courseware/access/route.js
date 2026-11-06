import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { decryptStudentId, encryptStudentId } from '@/lib/token';

const COURSEWARE_SECRET_KEY = process.env.COURSEWARE_SECRET_KEY || 'nhatmy_cw_sec_8f92a4b8e19c4d379058fa16';

// Helper đối soát cấp độ lớp sang mã sách Beehive tương ứng
function getBookCodesFromClass(classInfo) {
  if (!classInfo) return [];
  const level = (classInfo.level || '').toUpperCase().trim();
  const code = (classInfo.code || '').toUpperCase().trim();

  const books = [];

  // 1. Đối soát Beehive Starter
  if (level.includes('STARTER') || level.includes('BEEHIVE_START') || code.includes('STARTER')) {
    books.push('beehive_starter');
  }
  // 2. Đối soát Beehive 1 (hoặc lớp S1/M1 có giáo trình Beehive 1)
  if (level.includes('BEEHIVE_1') || level === 'BH1' || level === 'S1' || level === 'M1') {
    books.push('beehive_1');
  }
  // 3. Đối soát Beehive 2 (hoặc lớp S2/M2)
  if (level.includes('BEEHIVE_2') || level === 'BH2' || level === 'S2' || level === 'M2') {
    books.push('beehive_2');
  }
  // 4. Đối soát Beehive 3 (hoặc lớp S3/M3)
  if (level.includes('BEEHIVE_3') || level === 'BH3' || level === 'S3' || level === 'M3') {
    books.push('beehive_3');
  }
  // 5. Đối soát Beehive 4 (hoặc lớp S4/F1/F2)
  if (level.includes('BEEHIVE_4') || level === 'BH4' || level === 'S4' || level === 'F1' || level === 'F2') {
    books.push('beehive_4');
  }

  return books;
}

// Helper an toàn parse custom book codes (JSON array hoặc comma-separated)
function parseCustomBookCodes(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(b => String(b).trim().toLowerCase()).filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(b => String(b).trim().toLowerCase()).filter(Boolean);
    }
  } catch (e) {
    // Không phải JSON, thử parse theo dấu phẩy
  }
  return String(raw)
    .split(',')
    .map(b => b.trim().toLowerCase())
    .filter(Boolean);
}

// Xử lý CORS Preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
    },
  });
}

// GET: Lấy quyền học liệu của học viên (API Contract v1.1)
export async function GET(request) {
  try {
    // 1. Kiểm tra xác thực qua Header x-api-key
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!apiKey || apiKey !== COURSEWARE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'Xác thực không hợp lệ. Vui lòng kiểm tra mã x-api-key.' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const { searchParams } = new URL(request.url);
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

    // 5. Tính toán danh sách sách theo lớp & sách tick thêm (custom)
    const activeEnrollment = student.enrollments?.[0] || null;
    const classInfo = activeEnrollment?.class || null;
    const classBookCodes = getBookCodesFromClass(classInfo);
    const customBookCodes = parseCustomBookCodes(student.customBookCodes);

    // Hợp nhất danh sách sách hợp lệ (loại bỏ trùng lặp)
    const combinedBookSet = new Set([...classBookCodes, ...customBookCodes]);
    const effectiveBookCodes = Array.from(combinedBookSet);

    // 6. Tính toán quyền truy cập (access_granted & access_reason)
    const retainGranted = Boolean(student.retainCoursewareAccess);
    const isStudentActive = normalizedStatus === 'ACTIVE';

    let accessGranted = false;
    let accessReason = 'NO_ACCESS';

    if (isStudentActive) {
      accessGranted = true;
      accessReason = 'OK';
    } else if (retainGranted) {
      // Học viên tạm nghỉ hoặc nghỉ luôn nhưng Thầy Đấu cấp quyền giữ truy cập
      accessGranted = true;
      accessReason = 'OK';
    } else {
      accessGranted = false;
      accessReason = normalizedStatus === 'PAUSED' ? 'PAUSED' : 'NO_ACCESS';
    }

    const portalToken = encryptStudentId(student.id);

    // 7. Trả về đúng định dạng Payload chuẩn API Contract v1.1
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
