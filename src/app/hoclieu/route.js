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

  // Fallback an toàn sang Web App Vercel hoặc Subdomain học liệu
  return 'https://beehive-oxford.vercel.app';
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token')?.trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thiếu mã token truy cập học liệu số. Vui lòng quét lại mã QR trên Thư thông báo.',
        },
        { status: 400 }
      );
    }

    const base = getCoursewareTargetBase();
    const targetUrl = new URL(base);
    targetUrl.searchParams.set('token', token);

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
