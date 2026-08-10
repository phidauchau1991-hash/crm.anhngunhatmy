'use client';

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <button className="logout-btn" onClick={handleLogout} title="Đăng xuất">
      <i className="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất
    </button>
  );
}
