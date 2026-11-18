import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { decryptStudentId } from '@/lib/token';
import { evaluateCoursewareAccess, formatCoursewareExpiryVi } from '@/lib/coursewareAccess';

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

function escapeHtml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderBlockedHtml({
  badgeText,
  title,
  message,
  studentName = '',
  detailLine = '',
  accentColor = '#dc2626',
  accentBg = '#fef2f2',
  accentBorder = '#fecaca',
}) {
  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${escapeHtml(title)} — Anh ngữ Nhật Mỹ</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Be Vietnam Pro", "Segoe UI", Arial, sans-serif;
      background: linear-gradient(135deg, #f0f9ff 0%, #fffbeb 100%);
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      width: 100%;
      max-width: 480px;
      background: #ffffff;
      border: 2.5px solid #ffca29;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 18px 40px -12px rgba(13, 136, 196, 0.22);
    }
    .header {
      background: #ffffff;
      padding: 18px 22px 14px;
      border-bottom: 2.5px solid #ffca29;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header img {
      width: 54px;
      height: 54px;
      display: block;
      flex-shrink: 0;
    }
    .brand-name {
      font-size: 18px;
      font-weight: 900;
      color: #0d88c4;
      letter-spacing: 0.4px;
      line-height: 1.15;
      text-transform: uppercase;
    }
    .brand-sub {
      font-size: 12px;
      font-style: italic;
      font-weight: 600;
      color: #d97706;
      margin-top: 2px;
    }
    .body {
      padding: 26px 24px 22px;
      text-align: center;
      background: #fafdfe;
    }
    .badge {
      display: inline-block;
      background: ${accentBg};
      color: ${accentColor};
      border: 1px solid ${accentBorder};
      font-size: 12px;
      font-weight: 800;
      padding: 5px 14px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 12px;
    }
    .title {
      margin: 0 0 10px;
      font-size: 20px;
      font-weight: 800;
      color: #08557b;
      line-height: 1.3;
    }
    .student-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 14px;
      margin: 12px 0;
      font-size: 14px;
      color: #334155;
    }
    .student-box strong {
      color: #08557b;
      font-weight: 800;
    }
    .message {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin: 10px 0 0;
    }
    .detail-box {
      margin-top: 14px;
      padding: 10px 14px;
      border-radius: 10px;
      background: ${accentBg};
      border: 1px dashed ${accentBorder};
      color: ${accentColor};
      font-size: 13.5px;
      font-weight: 700;
      line-height: 1.45;
    }
    .hotline-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 18px;
      padding: 11px 22px;
      background: #0d88c4;
      color: #ffffff;
      text-decoration: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 800;
      box-shadow: 0 4px 12px rgba(13, 136, 196, 0.25);
    }
    .footer {
      background: #0d88c4;
      color: #ffffff;
      padding: 12px 18px;
      text-align: center;
      border-top: 2.5px solid #ffca29;
      font-size: 12px;
      line-height: 1.45;
    }
    .footer strong {
      color: #ffca29;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <img src="/logo.png" alt="Logo Anh ngữ Nhật Mỹ" />
      <div>
        <div class="brand-name">ANH NGỮ NHẬT MỸ</div>
        <div class="brand-sub">Dedicated to Excellence</div>
      </div>
    </div>
    <div class="body">
      <div class="badge">${escapeHtml(badgeText)}</div>
      <h1 class="title">${escapeHtml(title)}</h1>
      ${studentName ? `<div class="student-box">Học viên: <strong>${escapeHtml(studentName)}</strong></div>` : ''}
      <p class="message">${escapeHtml(message)}</p>
      ${detailLine ? `<div class="detail-box">${escapeHtml(detailLine)}</div>` : ''}
      <a class="hotline-btn" href="tel:0911767069">Hotline hỗ trợ: 0911 767 069</a>
    </div>
    <div class="footer">
      <strong>ANH NGỮ NHẬT MỸ</strong> • Hotline: 0911 767 069<br />
      Số 15, Đường D9, KDC Phú Tân, Phường Bình Dương, TP. Hồ Chí Minh
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 403,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token')?.trim();
    const studentIdParam = searchParams.get('student_id')?.trim();

    if (!token && !studentIdParam) {
      return renderBlockedHtml({
        badgeText: 'Thiếu mã xác thực',
        title: 'Không thể mở Học liệu số',
        message: 'Liên kết thiếu mã xác thực học viên. Kính mong Quý Phụ huynh quét lại mã QR trên Thư thông báo chính thức của Trung tâm.',
      });
    }

    let resolvedId = studentIdParam || '';
    if (token) {
      const decrypted = decryptStudentId(token);
      if (!decrypted) {
        return renderBlockedHtml({
          badgeText: 'Mã QR không hợp lệ',
          title: 'Không thể xác thực mã truy cập',
          message: 'Mã QR không hợp lệ hoặc đã cũ. Quý Phụ huynh vui lòng liên hệ Bộ phận Học vụ Trung tâm Anh ngữ Nhật Mỹ để được hỗ trợ cấp lại thư mới.',
        });
      }
      resolvedId = decrypted;
    }

    // Kiểm tra quyền trực tiếp trong CSDL trước khi chuyển hướng sang Web App
    let cwResult = null;
    let displayName = '';

    if (String(resolvedId).startsWith('LEAD_') || /^\d+$/.test(String(resolvedId))) {
      const numericLeadId = Number(String(resolvedId).replace(/^LEAD_/, ''));
      const lead = !Number.isNaN(numericLeadId)
        ? await prisma.lead.findUnique({ where: { id: numericLeadId } })
        : null;

      if (lead) {
        displayName = lead.name || '';
        const trialClass = lead.trialClassCode
          ? await prisma.class.findUnique({ where: { code: lead.trialClassCode } })
          : null;
        cwResult = evaluateCoursewareAccess(lead, { isTrial: true, trialClass });
      }
    }

    if (!cwResult) {
      const student = await prisma.student.findUnique({
        where: { id: resolvedId },
        include: {
          enrollments: {
            where: { status: 'Đang học' },
            include: { class: true },
            orderBy: { updatedAt: 'desc' },
          },
        },
      });

      if (student) {
        displayName = student.name || '';
        cwResult = evaluateCoursewareAccess(student, {
          isTrial: false,
          enrollments: student.enrollments || [],
        });
      }
    }

    if (!cwResult) {
      return renderBlockedHtml({
        badgeText: 'Không tìm thấy hồ sơ',
        title: 'Tài khoản Học liệu số không tồn tại',
        message: 'Hệ thống không tìm thấy hồ sơ học viên tương ứng với mã QR này. Kính mong Quý Phụ huynh liên hệ Trung tâm để được kiểm tra.',
      });
    }

    if (!cwResult.accessGranted) {
      if (cwResult.accessReason === 'BLOCKED') {
        return renderBlockedHtml({
          badgeText: 'Tài khoản tạm khóa',
          title: 'Quyền truy cập Học liệu số đang tạm khóa',
          studentName: displayName,
          message: 'Tài khoản Học liệu số của học viên hiện đã được Trung tâm tạm khóa quyền truy cập. Quý Phụ huynh vui lòng liên hệ Hotline Trung tâm để được hỗ trợ mở lại.',
          detailLine: cwResult.blockedReason ? `Lý do: ${cwResult.blockedReason}` : '',
          accentColor: '#dc2626',
          accentBg: '#fef2f2',
          accentBorder: '#fecaca',
        });
      }

      if (cwResult.accessReason === 'EXPIRED') {
        const expVi = formatCoursewareExpiryVi(cwResult.expiresAt);
        return renderBlockedHtml({
          badgeText: 'Đã hết hạn truy cập',
          title: 'Thời hạn sử dụng Học liệu số đã kết thúc',
          studentName: displayName,
          message: 'Thời gian trải nghiệm / truy cập tạm thời hệ thống Học liệu số đã hết hạn. Quý Phụ huynh vui lòng liên hệ Trung tâm để gia hạn hoặc hoàn tất thủ tục nhập học chính thức.',
          detailLine: expVi ? `Ngày hết hạn: ${expVi}` : '',
          accentColor: '#b45309',
          accentBg: '#fffbeb',
          accentBorder: '#fde68a',
        });
      }

      return renderBlockedHtml({
        badgeText: cwResult.accessReason === 'PAUSED' ? 'Đang tạm nghỉ / Bảo lưu' : 'Tạm ngưng truy cập',
        title: 'Tài khoản Học liệu số hiện đang tạm ngưng',
        studentName: displayName,
        message: 'Tài khoản Học liệu số tạm ngưng theo trạng thái học tập hiện tại trên hệ thống. Quý Phụ huynh vui lòng liên hệ Trung tâm Anh ngữ Nhật Mỹ nếu cần mở lại quyền ôn tập tại nhà.',
        accentColor: '#475569',
        accentBg: '#f1f5f9',
        accentBorder: '#cbd5e1',
      });
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
