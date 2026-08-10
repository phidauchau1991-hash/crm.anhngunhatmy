import { Outfit } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import LogoutButton from "@/components/LogoutButton";
import BranchSwitcher from "@/components/BranchSwitcher";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

export const metadata = {
  title: "CRM Anh Ngữ Nhật Mỹ",
  description: "Hệ thống quản lý Học viên & Vận hành toàn diện",
};

export default async function RootLayout({ children }) {
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') || '';
  const isParentPortal = pathname.startsWith('/parent');
  const isLoginPage = pathname === '/login';

  const userRole = headerList.get('x-user-role') || 'DIRECTOR';
  const username = headerList.get('x-user-username') || 'Giám đốc';
  
  const isGlobalUser = ['DIRECTOR', 'REGIONAL_MANAGER', 'CHIEF_ACCOUNTANT', 'SALES_MANAGER', 'ACADEMIC_MANAGER'].some(r => userRole.includes(r));

  if (isParentPortal || isLoginPage) {
    return (
      <html lang="vi" className={outfit.variable}>
        <head>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#1e293b" />
          <link rel="apple-touch-icon" href="/logo.png" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        </head>
        <body style={{ margin: 0, padding: 0, backgroundColor: 'var(--color-bg)' }}>
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="vi" className={outfit.variable}>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <div className="app-container">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-header">
              <div className="logo-placeholder">
                <i className="fa-solid fa-graduation-cap"></i>
              </div>
              <div className="logo-text">
                <h3>NHẬT MỸ</h3>
                <span>Dedicated To Excellence</span>
              </div>
            </div>
            
            <nav className="sidebar-nav">
              {userRole !== 'TEACHER' && (
                <a href="/" className="nav-item active">
                  <i className="fa-solid fa-chart-line"></i>
                  <span>Tổng quan</span>
                </a>
              )}
              
              {(userRole !== 'TEACHER') && (
                <a href="/leads" className="nav-item">
                  <i className="fa-solid fa-user-plus"></i>
                  <span>KHTN (Leads)</span>
                </a>
              )}

              {(userRole !== 'TEACHER') && (
                <a href="/students" className="nav-item">
                  <i className="fa-solid fa-user-graduate"></i>
                  <span>Học viên & Phụ huynh</span>
                </a>
              )}

              {userRole !== 'ACCOUNTANT' && (
                <a href="/classes" className="nav-item">
                  <i className="fa-solid fa-chalkboard-user"></i>
                  <span>Lớp học</span>
                </a>
              )}

              <a href="/attendance" className="nav-item">
                <i className="fa-solid fa-list-check"></i>
                <span>Điểm danh</span>
              </a>

              {(userRole === 'DIRECTOR' || userRole === 'MANAGER' || userRole === 'CSKH' || userRole === 'ADVISOR') && (
                <a href="/exams" className="nav-item">
                  <i className="fa-solid fa-ranking-star"></i>
                  <span>Đánh giá & Báo cáo</span>
                </a>
              )}

              {(userRole === 'DIRECTOR' || userRole === 'MANAGER' || userRole === 'ACCOUNTANT' || userRole === 'CSKH' || userRole === 'ADVISOR') && (
                <a href="/finance" className="nav-item">
                  <i className="fa-solid fa-wallet"></i>
                  <span>Học phí & Công nợ</span>
                </a>
              )}

              {(userRole === 'DIRECTOR' || userRole === 'MANAGER') && (
                <a href="/inventory" className="nav-item">
                  <i className="fa-solid fa-boxes-stacked"></i>
                  <span>Quản lý kho</span>
                </a>
              )}

              {(userRole === 'DIRECTOR' || userRole === 'MANAGER' || userRole === 'CSKH' || userRole === 'ADVISOR') && (
                <a href="/holidays" className="nav-item">
                  <i className="fa-solid fa-calendar-minus"></i>
                  <span>Ngày nghỉ</span>
                </a>
              )}

              {userRole === 'DIRECTOR' && (
                <a href="/configs" className="nav-item">
                  <i className="fa-solid fa-gears"></i>
                  <span>Cấu hình</span>
                </a>
              )}

              {(userRole === 'DIRECTOR' || userRole === 'MANAGER') && (
                <a href="/users" className="nav-item">
                  <i className="fa-solid fa-users-gear"></i>
                  <span>Nhân sự & Phân quyền</span>
                </a>
              )}
            </nav>
            
            <div className="sidebar-footer">
              <div className="user-profile">
                <i className="fa-solid fa-circle-user"></i>
                <div className="user-info">
                  <p>{username}</p>
                  <span>{userRole}</span>
                </div>
              </div>
              <LogoutButton />
            </div>
          </aside>

          {/* Main Area */}
          <div className="main-wrapper">
            <header className="main-header">
              <div className="header-search">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input type="text" placeholder="Tìm kiếm nhanh học viên, lớp học..." />
              </div>
              <div className="header-actions">
                <BranchSwitcher isGlobalUser={isGlobalUser} />
                <div className="notification-bell">
                  <i className="fa-regular fa-bell"></i>
                  <span className="badge"></span>
                </div>
              </div>
            </header>

            <main className="content-container">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
