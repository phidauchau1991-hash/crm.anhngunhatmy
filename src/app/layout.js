import { Outfit } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import AppLayoutClient from "@/components/AppLayoutClient";

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
        <AppLayoutClient userRole={userRole} username={username} isGlobalUser={isGlobalUser}>
          {children}
        </AppLayoutClient>
      </body>
    </html>
  );
}
