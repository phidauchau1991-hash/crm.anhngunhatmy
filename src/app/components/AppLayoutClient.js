'use client';

import { useState, useEffect } from 'react';
import LogoutButton from '@/components/LogoutButton';
import BranchSwitcher from '@/components/BranchSwitcher';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AppLayoutClient({ children, userRole, username, isGlobalUser }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  const navItems = [
    { href: '/', icon: 'fa-chart-line', label: 'Tổng quan', roles: ['DIRECTOR', 'MANAGER', 'CSKH', 'ADVISOR', 'ACCOUNTANT'] },
    { href: '/leads', icon: 'fa-user-plus', label: 'KHTN (Leads)', roles: ['DIRECTOR', 'MANAGER', 'CSKH', 'ADVISOR'] },
    { href: '/students', icon: 'fa-user-graduate', label: 'Học viên & Phụ huynh', roles: ['DIRECTOR', 'MANAGER', 'CSKH', 'ADVISOR', 'ACCOUNTANT'] },
    { href: '/classes', icon: 'fa-chalkboard-user', label: 'Lớp học', roles: ['DIRECTOR', 'MANAGER', 'CSKH', 'ADVISOR', 'TEACHER'] },
    { href: '/attendance', icon: 'fa-list-check', label: 'Điểm danh', roles: ['DIRECTOR', 'MANAGER', 'CSKH', 'ADVISOR', 'TEACHER'] },
    { href: '/exams', icon: 'fa-ranking-star', label: 'Đánh giá & Báo cáo', roles: ['DIRECTOR', 'MANAGER', 'CSKH', 'ADVISOR', 'TEACHER'] },
    { href: '/finance', icon: 'fa-wallet', label: 'Học phí & Công nợ', roles: ['DIRECTOR', 'MANAGER', 'ACCOUNTANT', 'CSKH', 'ADVISOR'] },
    { href: '/inventory', icon: 'fa-boxes-stacked', label: 'Quản lý kho', roles: ['DIRECTOR', 'MANAGER'] },
    { href: '/holidays', icon: 'fa-calendar-minus', label: 'Ngày nghỉ', roles: ['DIRECTOR', 'MANAGER', 'CSKH', 'ADVISOR'] },
    { href: '/configs', icon: 'fa-gears', label: 'Cấu hình', roles: ['DIRECTOR'] },
    { href: '/users', icon: 'fa-users-gear', label: 'Nhân sự & Phân quyền', roles: ['DIRECTOR', 'MANAGER'] }
  ];

  const hasRole = (roles) => roles.some(r => userRole.includes(r));

  return (
    <div className="app-container">
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 998
          }}
        />
      )}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-placeholder">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <div className="logo-text">
            <h3>NHẬT MỸ</h3>
            <span>Dedicated To Excellence</span>
          </div>
          <button 
            className="close-sidebar-btn" 
            onClick={() => setIsSidebarOpen(false)}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer', display: 'none' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.filter(item => hasRole(item.roles)).map(item => {
             const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
             return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <i className={`fa-solid ${item.icon}`}></i>
                <span>{item.label}</span>
              </Link>
             )
          })}
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

      <div className="main-wrapper">
        <header className="main-header" style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.5rem', background: '#fff', borderBottom: '1px solid var(--color-border)', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '1rem' }}>
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsSidebarOpen(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-primary-dark)', fontSize: '1.25rem', cursor: 'pointer', display: 'none' }}
            >
              <i className="fa-solid fa-bars"></i>
            </button>
            
            <div className="header-search" style={{ position: 'relative', maxWidth: '350px', width: '100%', display: 'flex', alignItems: 'center' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '1rem', color: 'var(--color-text-muted)' }}></i>
              <input type="text" placeholder="Tìm kiếm nhanh học viên, lớp học..." style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
            </div>
          </div>
          
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <BranchSwitcher isGlobalUser={isGlobalUser} />
            <div className="notification-bell" style={{ position: 'relative', cursor: 'pointer' }}>
              <i className="fa-regular fa-bell" style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)' }}></i>
              <span className="badge" style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--color-danger)', width: '8px', height: '8px', borderRadius: '50%' }}></span>
            </div>
          </div>
        </header>

        <main className="content-container">
          {children}
        </main>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            top: 0;
            left: -280px;
            height: 100vh;
            z-index: 999;
            transition: left 0.3s ease;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
          }
          .sidebar.open {
            left: 0;
          }
          .sidebar .close-sidebar-btn {
            display: block !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
          .header-search {
            display: none !important; /* Hide search on small mobile to save space */
          }
        }
        @media (min-width: 769px) {
          .mobile-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
