import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getCoursewareTargetBase() {
  const envUrl = process.env.COURSEWARE_URL || process.env.NEXT_PUBLIC_COURSEWARE_URL || '';
  if (envUrl && envUrl.trim().length > 0) {
    try {
      const parsed = new URL(envUrl.trim());
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return envUrl.trim().replace(/\/+$/, '');
      }
    } catch {
      // Bỏ qua nếu cấu hình sai định dạng URL
    }
  }

  // Web App Giáo trình Tương tác Số chính thức của Nhật Mỹ trên Vercel
  return 'https://nhatmy-learning-app.vercel.app';
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token')?.trim();
    const studentId = searchParams.get('student_id')?.trim();

    if (!token && !studentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thiếu mã xác thực học liệu số. Vui lòng quét lại mã QR trên Thư thông báo.',
        },
        { status: 400 }
      );
    }

    const base = getCoursewareTargetBase();
    // Chuyển hướng trực tiếp vào Tủ sách /lab/bookshelf.html để đảm bảo tải đúng tài nguyên
    const targetUrl = new URL('/lab/bookshelf.html', base);
    
    // Giữ nguyên và chuyển tiếp toàn bộ query params sang Web App (token, student_id, ...)
    searchParams.forEach((val, key) => {
      targetUrl.searchParams.set(key, val);
    });

    // Chuyển hướng 307 an toàn tới Web App Học liệu
    const res = NextResponse.redirect(targetUrl.toString(), 307);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');

    return res;
  } catch (error) {
    console.error('Lỗi điều hướng học liệu số:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ khi chuyển hướng học liệu số' },
      { status: 500 }
    );
  }
}
