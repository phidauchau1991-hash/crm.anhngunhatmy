'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState('TEACHER');
  const [currentBranchId, setCurrentBranchId] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    shortName: '',
    phone: '',
    role: 'TEACHER',
    branchId: 'CN1_BinhDuong',
    isActive: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        if (data.meta) {
          setCurrentUserRole(data.meta.currentUserRole);
          setCurrentBranchId(data.meta.currentBranchId);
        }
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '',
        fullName: user.fullName || '',
        shortName: user.shortName || '',
        phone: user.phone || '',
        role: user.role,
        branchId: user.branchId || currentBranchId,
        isActive: user.isActive
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        fullName: '',
        shortName: '',
        phone: '',
        role: 'TEACHER',
        branchId: currentBranchId || 'CN1_BinhDuong',
        isActive: true
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const isEdit = !!editingUser;
    const url = isEdit ? `/api/users/${editingUser.id}` : '/api/users';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        setShowModal(false);
        fetchUsers();
      } else {
        alert(data.error || 'Lỗi lưu thông tin');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn vô hiệu hóa tài khoản này?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
    } catch (err) {
      alert('Lỗi vô hiệu hóa');
    }
  };

  const getRoleName = (roleStr) => {
    const rolesMap = {
      DIRECTOR: 'Giám đốc',
      MANAGER: 'Quản lý',
      ACCOUNTANT: 'Kế toán',
      ADVISOR: 'Tư vấn viên',
      CSKH: 'CSKH',
      TEACHER: 'Giáo viên'
    };
    if (!roleStr) return '';
    return roleStr.split(',').map(r => rolesMap[r] || r).join(', ');
  };

  return (
    <div className="page-container">
      <PageHeader 
        title="Quản lý Nhân sự & Phân quyền" 
        subtitle="Quản lý tài khoản đăng nhập của Giáo viên, Kế toán, CSKH"
      />

      <div className="page-actions">
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <i className="fa-solid fa-user-plus"></i> Thêm nhân viên
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <i className="fa-solid fa-circle-notch fa-spin"></i>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-table-state">
            <i className="fa-regular fa-folder-open"></i>
            <p>Chưa có tài khoản nhân sự nào.</p>
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tên đăng nhập</th>
                <th>Họ tên</th>
                <th>SĐT</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="table-row">
                  <td className="std-id">{u.username}</td>
                  <td className="std-name">{u.fullName}</td>
                  <td>{u.phone || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {u.role.split(',').map(r => (
                        <span key={r} className={`role-badge ${r.toLowerCase()}`}>
                          {getRoleName(r)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${u.isActive ? 'active' : 'inactive'}`}>
                      {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn edit-btn" onClick={() => handleOpenModal(u)} title="Sửa">
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      {u.isActive && u.username !== 'admin' && (
                        <button className="action-btn" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => handleDelete(u.id)} title="Khóa tài khoản">
                          <i className="fa-solid fa-lock"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingUser ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên mới'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Tên đăng nhập (VD: gv.MsHuong)</label>
                <input 
                  type="text" 
                  value={formData.username} 
                  onChange={e => setFormData({...formData, username: e.target.value})} 
                  disabled={!!editingUser}
                  required 
                />
              </div>

              <div className="form-group">
                <label>{editingUser ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu'}</label>
                <input 
                  type="password" 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                  required={!editingUser} 
                />
              </div>

              <div className="form-group">
                <label>Họ và tên đầy đủ</label>
                <input 
                  type="text" 
                  value={formData.fullName} 
                  onChange={e => setFormData({...formData, fullName: e.target.value})} 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Tên hiển thị trên CRM (VD: Ms My)</label>
                <input 
                  type="text" 
                  value={formData.shortName} 
                  onChange={e => setFormData({...formData, shortName: e.target.value})} 
                  placeholder="Để trống sẽ tự động lấy Họ và tên"
                />
              </div>

              <div className="form-group">
                <label>Chi nhánh</label>
                <select 
                  value={formData.branchId} 
                  onChange={e => setFormData({...formData, branchId: e.target.value})} 
                  disabled={!(currentUserRole.includes('DIRECTOR') || currentUserRole.includes('REGIONAL_MANAGER'))}
                  className="form-control"
                >
                  <option value="CN1_BinhDuong">CN1 - Bình Dương</option>
                  <option value="CN2_PhuMy">CN2 - Phú Mỹ</option>
                </select>
              </div>

              <div className="form-group">
                <label>Vai trò (Có thể chọn nhiều)</label>
                <div className="roles-checkbox-grid">
                  {[
                    { value: 'TEACHER', label: 'Giáo viên' },
                    { value: 'CSKH', label: 'Chăm sóc khách hàng' },
                    { value: 'ADVISOR', label: 'Tư vấn viên' },
                    { value: 'ACCOUNTANT', label: 'Kế toán' },
                    { value: 'ACADEMIC_MANAGER', label: 'Trưởng phòng Đào tạo' },
                    { value: 'SALES_MANAGER', label: 'Trưởng phòng Kinh doanh' },
                    { value: 'CHIEF_ACCOUNTANT', label: 'Kế toán trưởng' },
                    { value: 'MANAGER', label: 'Quản lý chi nhánh' },
                    { value: 'REGIONAL_MANAGER', label: 'Quản lý Vùng' },
                    { value: 'DIRECTOR', label: 'Giám đốc hệ thống' }
                  ].filter(r => {
                    // Trưởng chi nhánh không thấy các role cấp cao
                    if (!(currentUserRole.includes('DIRECTOR') || currentUserRole.includes('REGIONAL_MANAGER'))) {
                      return !['DIRECTOR', 'REGIONAL_MANAGER', 'CHIEF_ACCOUNTANT', 'SALES_MANAGER', 'ACADEMIC_MANAGER'].includes(r.value);
                    }
                    return true;
                  }).map(r => (
                    <label key={r.value} className="role-checkbox">
                      <input 
                        type="checkbox" 
                        checked={formData.role ? formData.role.split(',').includes(r.value) : false}
                        onChange={(e) => {
                          const currentRoles = formData.role ? formData.role.split(',').filter(Boolean) : [];
                          if (e.target.checked) {
                            if (!currentRoles.includes(r.value)) currentRoles.push(r.value);
                          } else {
                            const index = currentRoles.indexOf(r.value);
                            if (index > -1) currentRoles.splice(index, 1);
                          }
                          setFormData({...formData, role: currentRoles.join(',')});
                        }}
                        disabled={editingUser?.username === 'admin' && r.value !== 'DIRECTOR'}
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </div>

              {editingUser && editingUser.username !== 'admin' && (
                <div className="form-group checkbox-group">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={formData.isActive} 
                      onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                    />
                    Cho phép đăng nhập (Hoạt động)
                  </label>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-actions { margin-bottom: 20px; display: flex; justify-content: flex-end; }
        .role-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600; }
        .role-badge.director, .role-badge.manager { background: #fee2e2; color: #ef4444; }
        .role-badge.teacher { background: #e0e7ff; color: #4f46e5; }
        .role-badge.cskh, .role-badge.advisor { background: #dcfce7; color: #16a34a; }
        .role-badge.accountant { background: #fef08a; color: #ca8a04; }
        
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; }
        .status-badge.active { background: #dcfce7; color: #16a34a; }
        .status-badge.inactive { background: #f1f5f9; color: #64748b; }
        
        .checkbox-group label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .checkbox-group input { width: auto; }
        
        .roles-checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
        .role-checkbox { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer; color: #334155; font-weight: 500; }
        .role-checkbox input { width: 16px; height: 16px; margin: 0; cursor: pointer; accent-color: var(--color-primary); }
      `}</style>
    </div>
  );
}
