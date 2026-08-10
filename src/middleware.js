import { NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

const publicPaths = ['/login', '/api/auth/login', '/api/webhook/lead'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // Bỏ qua static files, _next, etc.
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname.startsWith('/api/cron')
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Cho phép public paths
  if (
    publicPaths.includes(pathname) ||
    pathname.startsWith('/parent') ||
    pathname.startsWith('/api/parent')
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Lấy token từ cookie
  const token = request.cookies.get('crm_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Xác thực token
  const payload = await verifyToken(token);
  if (!payload) {
    // Token hết hạn hoặc không hợp lệ
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('crm_token');
    return response;
  }

  // Set user info to headers so API can use it
  requestHeaders.set('x-user-id', payload.id);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-user-username', payload.username);
  if (payload.branchId) requestHeaders.set('x-user-branch', payload.branchId);

  const selectedBranch = request.cookies.get('crm_selected_branch')?.value;
  if (selectedBranch) {
    requestHeaders.set('x-selected-branch', selectedBranch);
  }

  // ==================
  // PHÂN QUYỀN (RBAC)
  // ==================
  const roles = payload.role ? payload.role.split(',') : [];

  // Giám đốc và Quản lý vùng/chi nhánh không giới hạn (tuy Manager có thể bị chặn ở frontend một số tính năng)
  const isSuperUser = roles.some(r => ['DIRECTOR', 'MANAGER', 'REGIONAL_MANAGER'].includes(r));

  if (!isSuperUser) {
    let allowedPaths = [];
    let redirectPath = '/';

    if (roles.some(r => ['CSKH', 'ADVISOR', 'SALES_MANAGER'].includes(r))) {
      allowedPaths = ['/', '/students', '/leads', '/classes', '/attendance', '/finance', '/exams', '/holidays'];
      redirectPath = '/';
    } else if (roles.some(r => ['ACCOUNTANT', 'CHIEF_ACCOUNTANT'].includes(r))) {
      allowedPaths = ['/', '/finance', '/students', '/attendance'];
      redirectPath = '/finance';
    } else if (roles.some(r => ['ACADEMIC_MANAGER'].includes(r))) {
      allowedPaths = ['/', '/classes', '/attendance', '/exams', '/holidays', '/students'];
      redirectPath = '/classes';
    } else if (roles.includes('TEACHER')) {
      // Giáo viên KHÔNG được vào trang chủ (/), chỉ vào /attendance, /classes
      allowedPaths = ['/attendance', '/classes'];
      redirectPath = '/attendance';
    }

    // Nếu route hiện tại KHÔNG nằm trong allowedPaths
    // path gốc '/' chỉ tính là match chính xác.
    const isAllowed = allowedPaths.some(path => 
      path === '/' ? pathname === '/' : (pathname === path || pathname.startsWith(path + '/'))
    );

    if (!isAllowed) {
      if (!pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL(redirectPath, request.url));
      } else {
        // Có thể bổ sung block API nếu cần thiết
      }
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
