import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { decryptStudentId, encryptStudentId } from '@/lib/token';
import { getBookCodesFromClass, parseCustomBookCodes } from '@/lib/coursewareBooks';

const COURSEWARE_SECRET_KEY = process.env.COURSEWARE_SECRET_KEY || 'nhatmy_cw_sec_8f92a4b8e19c4d379058fa16';

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

    // 5. Tính toán danh sách giáo trình được cấp phát
    const activeEnrollment = student.enrollments?.[0] || null;
    const classInfo = activeEnrollment?.class || null;
    const classBookCodes = getBookCodesFromClass(classInfo);
    const customBookCodes = parseCustomBookCodes(student.customBookCodes);

    // Quyết định danh sách sách hợp lệ:
    // - Nếu học viên đã được phân quyền sách tùy chỉnh cụ thể (customBookCodes có phần tử),
    //   lấy CHÍNH XÁC danh sách sách đó (đúng ý định admin/thầy giáo).
    // - Nếu chưa cấu hình phân quyền riêng (customBookCodes rỗng/null), mặc định lấy theo lớp.
    const effectiveBookCodes = (customBookCodes && customBookCodes.length > 0)
      ? customBookCodes
      : classBookCodes;

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
