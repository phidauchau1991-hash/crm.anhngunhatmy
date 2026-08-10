'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        // Redirect to appropriate dashboard
        const role = data.data.role || '';
        const roles = role.split(',');
        const isOnlyAccountant = roles.length === 1 && roles[0] === 'ACCOUNTANT';
        const isOnlyTeacher = roles.length === 1 && roles[0] === 'TEACHER';

        if (isOnlyAccountant) {
          window.location.href = '/finance';
        } else if (isOnlyTeacher) {
          window.location.href = '/attendance';
        } else {
          window.location.href = '/';
        }
      } else {
        setError(data.error || 'Đăng nhập thất bại.');
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="login-logo">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <h2>NHẬT MỸ CRM</h2>
          <p>Hệ thống Quản lý Vận hành Toàn diện</p>
        </div>

        {error && <div className="login-error"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Tên đăng nhập (VD: gv.MsHuong)</label>
            <div className="input-with-icon">
              <i className="fa-solid fa-user"></i>
              <input 
                type="text" 
                placeholder="Nhập tên đăng nhập..." 
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Mật khẩu</label>
            <div className="input-with-icon">
              <i className="fa-solid fa-lock"></i>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Nhập mật khẩu..." 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'ĐĂNG NHẬP'}
          </button>
        </form>

        <div className="login-footer">
          <p>Dành riêng cho nhân viên Trung tâm Ngoại ngữ Nhật Mỹ</p>
          <p>© 2026 Bản quyền thuộc về Nhật Mỹ Edu</p>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          width: 100vw;
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          font-family: var(--font-sans);
        }
        .login-box {
          background: rgba(255, 255, 255, 0.95);
          padding: 3rem;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          width: 100%;
          max-width: 420px;
          backdrop-filter: blur(10px);
        }
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .login-logo {
          width: 70px;
          height: 70px;
          background: var(--color-primary);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin: 0 auto 1rem;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
        }
        .login-header h2 {
          color: #1e293b;
          font-weight: 700;
          margin-bottom: 0.5rem;
          letter-spacing: 1px;
        }
        .login-header p {
          color: #64748b;
          font-size: 0.9rem;
        }
        .login-error {
          background: #fee2e2;
          color: #ef4444;
          padding: 10px 15px;
          border-radius: 8px;
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #fca5a5;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #334155;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .input-with-icon {
          position: relative;
        }
        .input-with-icon i {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        .input-with-icon input {
          width: 100%;
          padding: 12px 15px 12px 40px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 1rem;
          transition: all 0.3s ease;
          font-family: inherit;
        }
        .input-with-icon input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .toggle-password-btn {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 1rem;
          padding: 0;
          transition: color 0.2s;
        }
        .toggle-password-btn:hover {
          color: #475569;
        }
        .toggle-password-btn:focus {
          outline: none;
        }
        .login-submit-btn {
          width: 100%;
          padding: 14px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          letter-spacing: 1px;
        }
        .login-submit-btn:hover:not(:disabled) {
          background: var(--color-primary-dark);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        .login-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .login-footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.8rem;
          color: #94a3b8;
        }
        .login-footer p {
          margin: 0.2rem 0;
        }
      `}</style>
    </div>
  );
}
