'use client';

import { useState, useEffect } from 'react';

const parseScheduleString = (str) => {
  if (!str) return [];
  const days = [];
  if (str.includes('2')) days.push('2');
  if (str.includes('3')) days.push('3');
  if (str.includes('4')) days.push('4');
  if (str.includes('5')) days.push('5');
  if (str.includes('6')) days.push('6');
  if (str.includes('7')) days.push('7');
  if (str.includes('CN') || str.includes('8') || str.toUpperCase().includes('C')) days.push('CN');
  return days;
};

const orderMap = { '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, 'CN': 7 };
const joinScheduleArray = (arr) => {
  return arr
    .filter((v, i, self) => self.indexOf(v) === i)
    .sort((a, b) => orderMap[a] - orderMap[b])
    .join('');
};

const getHolidayForDate = (date, classCode, schedule, holidays) => {
  if (!holidays || !Array.isArray(holidays)) return null;
  const normalizedTime = new Date(date).setHours(0, 0, 0, 0);

  for (const h of holidays) {
    const start = new Date(h.startDate).setHours(0, 0, 0, 0);
    const end = new Date(h.endDate).setHours(0, 0, 0, 0);

    if (normalizedTime >= start && normalizedTime <= end) {
      if (h.scope === 'GLOBAL') return h;
      if (h.scope === 'SHIFT' && h.targetId === schedule) return h;
      if (h.scope === 'CLASS' && h.targetId === classCode) return h;
    }
  }
  return null;
};

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [courseConfigs, setCourseConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'completed'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form State
  const [formData, setFormData] = useState({
    level: '',
    teacherName: '',
    teacherId: '',
    careStaff: '',
    startDateStr: '',
    schedule: '35', // Mặc định thứ 3-5
  });

  const [previewEndDate, setPreviewEndDate] = useState('');
  const [holidays, setHolidays] = useState([]);

  // Class Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [editFormData, setEditFormData] = useState({
    startDateStr: '',
    schedule: '',
    teacherName: '',
    teacherId: '',
    careStaff: '',
  });
  const [editPreviewEndDate, setEditPreviewEndDate] = useState('');

  // Class Upgrade (Lên khóa cả lớp) Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeClass, setUpgradeClass] = useState(null);
  const [upgradeForm, setUpgradeForm] = useState({
    newLevel: '',
    newStartDateStr: '',
    teacherName: '',
    schedule: '',
  });

  const openUpgradeModal = (cls) => {
    setUpgradeClass(cls);
    
    // Gợi ý cấp độ tiếp theo
    const currentCfgIdx = courseConfigs.findIndex(c => c.level === cls.level);
    const nextCfg = currentCfgIdx !== -1 && currentCfgIdx + 1 < courseConfigs.length ? courseConfigs[currentCfgIdx + 1] : null;

    setUpgradeForm({
      newLevel: nextCfg ? nextCfg.level : '',
      newStartDateStr: '',
      teacherName: cls.teacherName || '',
      schedule: cls.scheduleRaw || '35',
    });
    setIsUpgradeModalOpen(true);
    setMessage({ type: '', text: '' });
  };

  const openEditClassModal = (cls) => {
    setSelectedClass(cls);
    
    // Parse "DD/MM/YYYY" to "YYYY-MM-DD"
    const parts = cls.startDate.split('/');
    let formattedDate = '';
    if (parts.length === 3) {
      formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    
    setEditFormData({
      startDateStr: formattedDate,
      schedule: cls.scheduleRaw || '',
      teacherName: cls.teacherName || '',
      teacherId: cls.teacherId || '',
      careStaff: cls.careStaff || '',
    });
    setIsEditModalOpen(true);
    setMessage({ type: '', text: '' });
  };

  // Tải danh sách lớp học
  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/classes');
      const result = await res.json();
      if (result.success) {
        setClasses(result.data);
      }
    } catch (e) {
      console.error('Lỗi khi tải lớp học:', e);
    } finally {
      setLoading(false);
    }
  };

  // Tải cấu hình khóa học
  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/course-configs');
      const result = await res.json();
      if (result.success) {
        setCourseConfigs(result.data);
      }
    } catch (e) {
      console.error('Lỗi khi tải cấu hình khóa học:', e);
    }
  };

  // Tải danh sách ngày nghỉ
  const fetchHolidays = async () => {
    try {
      const res = await fetch('/api/holidays');
      const result = await res.json();
      if (result.success) {
        setHolidays(result.data);
      }
    } catch (e) {
      console.error('Lỗi khi tải ngày nghỉ:', e);
    }
  };

  const [users, setUsers] = useState([]);
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const result = await res.json();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (e) {
      console.error('Lỗi khi tải danh sách người dùng:', e);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchConfigs();
    fetchHolidays();
    fetchUsers();
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) setUserRole(data.data.role);
      });
  }, []);

  // Tính toán nháp Ngày kết thúc dự kiến ở Client
  useEffect(() => {
    if (!formData.level || !formData.startDateStr || !formData.schedule) {
      setPreviewEndDate('');
      return;
    }

    const config = courseConfigs.find(c => c.level === formData.level);
    if (!config) return;

    const totalSessions = config.totalSessions;
    const startDate = new Date(formData.startDateStr);
    
    // Ánh xạ thứ trong lịch học
    const targetDays = [];
    const parsed = parseScheduleString(formData.schedule);
    if (parsed.includes('2')) targetDays.push(1);
    if (parsed.includes('3')) targetDays.push(2);
    if (parsed.includes('4')) targetDays.push(3);
    if (parsed.includes('5')) targetDays.push(4);
    if (parsed.includes('6')) targetDays.push(5);
    if (parsed.includes('7')) targetDays.push(6);
    if (parsed.includes('CN')) targetDays.push(0);

    if (targetDays.length === 0) {
      setPreviewEndDate('Lịch học không hợp lệ');
      return;
    }

    let currentDate = new Date(startDate);
    let sessionsCount = 0;
    
    while (sessionsCount < totalSessions) {
      const dayOfWeek = currentDate.getDay();
      const isDayHoliday = getHolidayForDate(currentDate, 'NEW_CLASS', formData.schedule, holidays);
      
      if (targetDays.includes(dayOfWeek) && !isDayHoliday) {
        sessionsCount++;
        if (sessionsCount === totalSessions) {
          break;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setPreviewEndDate(currentDate.toLocaleDateString('vi-VN'));
  }, [formData.level, formData.startDateStr, formData.schedule, courseConfigs, holidays]);

  const handleCheckboxChange = (day) => {
    let currentSchedule = parseScheduleString(formData.schedule);
    if (currentSchedule.includes(day)) {
      currentSchedule = currentSchedule.filter(d => d !== day);
    } else {
      currentSchedule.push(day);
    }
    setFormData(prev => ({
      ...prev,
      schedule: joinScheduleArray(currentSchedule),
    }));
  };

  // Tính toán Ngày kết thúc dự kiến cho Form chỉnh sửa lớp
  useEffect(() => {
    if (!selectedClass || !editFormData.startDateStr || !editFormData.schedule) {
      setEditPreviewEndDate('');
      return;
    }

    const config = courseConfigs.find(c => c.level === selectedClass.level);
    if (!config) return;

    const totalSessions = config.totalSessions;
    const startDate = new Date(editFormData.startDateStr);
    
    const targetDays = [];
    const parsed = parseScheduleString(editFormData.schedule);
    if (parsed.includes('2')) targetDays.push(1);
    if (parsed.includes('3')) targetDays.push(2);
    if (parsed.includes('4')) targetDays.push(3);
    if (parsed.includes('5')) targetDays.push(4);
    if (parsed.includes('6')) targetDays.push(5);
    if (parsed.includes('7')) targetDays.push(6);
    if (parsed.includes('CN')) targetDays.push(0);

    if (targetDays.length === 0) {
      setEditPreviewEndDate('Lịch học không hợp lệ');
      return;
    }

    let currentDate = new Date(startDate);
    let sessionsCount = 0;
    
    while (sessionsCount < totalSessions) {
      const dayOfWeek = currentDate.getDay();
      const isDayHoliday = getHolidayForDate(currentDate, selectedClass.code, editFormData.schedule, holidays);
      
      if (targetDays.includes(dayOfWeek) && !isDayHoliday) {
        sessionsCount++;
        if (sessionsCount === totalSessions) {
          break;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setEditPreviewEndDate(currentDate.toLocaleDateString('vi-VN'));
  }, [editFormData.startDateStr, editFormData.schedule, selectedClass, courseConfigs, holidays]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/classes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: selectedClass.code,
          startDateStr: editFormData.startDateStr,
          schedule: editFormData.schedule,
          teacherName: editFormData.teacherName,
          teacherId: editFormData.teacherId,
          careStaff: editFormData.careStaff,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setMessage({ type: 'success', text: `Cập nhật lớp thành công!` });
        fetchClasses();
        setTimeout(() => setIsEditModalOpen(false), 2000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Có lỗi xảy ra khi cập nhật lớp.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Kết nối API thất bại.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpgradeSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/classes/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldClassCode: upgradeClass.code,
          newLevel: upgradeForm.newLevel,
          newStartDateStr: upgradeForm.newStartDateStr,
          teacherName: upgradeForm.teacherName,
          schedule: upgradeForm.schedule,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        fetchClasses();
        setTimeout(() => setIsUpgradeModalOpen(false), 2500);
      } else {
        setMessage({ type: 'error', text: result.error || 'Có lỗi xảy ra khi nâng khóa.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Kết nối API thất bại.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async (code) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa lớp học ${code}? Tất cả dữ liệu liên quan đến lớp này sẽ bị xóa.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/classes?code=${encodeURIComponent(code)}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        alert(`Đã xóa lớp học ${code} thành công!`);
        fetchClasses();
      } else {
        alert(result.error || 'Không thể xóa lớp học.');
      }
    } catch (err) {
      alert('Kết nối API thất bại.');
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'teacherId') {
        const selectedUser = users.find(u => u.id === value);
        if (selectedUser) {
          newData.teacherName = selectedUser.fullName || selectedUser.username;
        } else {
          newData.teacherName = '';
        }
      }
      return newData;
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'teacherId') {
        const selectedUser = users.find(u => u.id === value);
        if (selectedUser) {
          newData.teacherName = selectedUser.fullName || selectedUser.username;
        } else {
          newData.teacherName = '';
        }
      }
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (result.success) {
        setMessage({ type: 'success', text: `Tạo lớp thành công! Mã lớp: ${result.data.code}` });
        setFormData({
          level: '',
          teacherName: '',
          careStaff: '',
          startDateStr: '',
          schedule: '35',
        });
        fetchClasses();
        setTimeout(() => setIsModalOpen(false), 2000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Có lỗi xảy ra khi tạo lớp.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Kết nối API thất bại.' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClasses = classes.filter(cls => {
    if (statusFilter === 'active') return cls.sessionsRemaining > 0;
    if (statusFilter === 'completed') return cls.sessionsRemaining <= 0;
    return true;
  });

  return (
    <div className="classes-container">
      {/* Header */}
      <div className="page-header-actions">
        <div>
          <h1><i className="fa-solid fa-school"></i> Quản lý Lớp học</h1>
          <p>Danh sách các lớp học hiện tại, tiến độ giảng dạy và danh sách học viên.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            className="filter-select" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontWeight: '600', color: 'var(--color-text)', background: 'var(--color-bg)' }}
          >
            <option value="all">Tất cả lớp học</option>
            <option value="active">Đang hoạt động</option>
            <option value="completed">Đã kết thúc (Đủ số buổi)</option>
          </select>
          {!userRole?.includes('TEACHER') && (
            <button className="btn btn-primary animated-scale" onClick={() => setIsModalOpen(true)}>
              <i className="fa-solid fa-plus"></i> Thêm lớp học mới
            </button>
          )}
        </div>
      </div>

      {/* Classes Table */}
      <div className="table-container glass-panel">
        {loading ? (
          <div className="loading-state">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <p>Đang tải danh sách lớp học...</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="empty-table-state">
            <i className="fa-solid fa-school-circle-xmark"></i>
            <p>Không có lớp học nào phù hợp.</p>
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mã Lớp Học</th>
                <th>Cấp độ</th>
                <th>Giáo viên phụ trách</th>
                <th>CSKH phụ trách</th>
                <th>Ngày khai giảng</th>
                <th>Lịch học tuần</th>
                <th>Ngày kết thúc dự kiến</th>
                <th style={{ textAlign: 'center' }}>Sỹ số</th>
                {/* 3 THÔNG SỐ ĐỘNG (ĐẠI TU) */}
                <th style={{ textAlign: 'center' }}>Khóa (Số buổi)</th>
                <th style={{ textAlign: 'center' }}>Đã học</th>
                <th style={{ textAlign: 'center' }}>Còn lại</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map((cls) => {
                const isCompleted = cls.sessionsRemaining <= 0;
                return (
                <tr key={cls.code} className="table-row" style={isCompleted ? { backgroundColor: '#f1f5f9', opacity: 0.7, filter: 'grayscale(0.5)' } : {}}>
                  <td className="class-code">
                    {cls.code}
                    {isCompleted && <span style={{display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal'}}>Đã kết thúc</span>}
                  </td>
                  <td>
                    <span className="badge-level">{cls.level}</span>
                  </td>
                  <td className="teacher-name">{cls.teacherName}</td>
                  <td className="teacher-name" style={{ color: '#0ea5e9' }}>{cls.careStaff}</td>
                  <td>{cls.startDate}</td>
                  <td>{cls.schedule}</td>
                  <td style={{ fontWeight: '600', color: 'var(--color-primary-dark)' }}>{cls.expectedEndDate}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`student-count-badge ${cls.studentCount === 0 ? 'zero-students' : ''}`}>
                      {cls.studentCount} học viên
                    </span>
                  </td>
                  
                  {/* Hiển thị 3 thông số động */}
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{cls.totalSessions}</td>
                  <td style={{ textAlign: 'center', color: 'var(--color-success)', fontWeight: 'bold' }}>{cls.sessionsTaught}</td>
                  <td style={{ textAlign: 'center', color: cls.sessionsRemaining <= 5 ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: 'bold' }}>{cls.sessionsRemaining}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="action-buttons">
                      {!userRole?.includes('TEACHER') && (
                        <button 
                          className="action-btn upgrade-btn" 
                          title="🚀 Nâng khóa / Lên lớp hàng loạt cho cả lớp" 
                          style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                          onClick={() => openUpgradeModal(cls)}
                        >
                          <i className="fa-solid fa-rocket"></i>
                        </button>
                      )}
                      <a href={`/classes/${encodeURIComponent(cls.code)}`} className="action-btn view-btn" title="Sổ Đầu Bài (Chi tiết Lớp)" style={{ background: 'rgba(13, 136, 196, 0.12)', color: '#0D88C4' }}>
                        <i className="fa-solid fa-book-open-reader"></i>
                      </a>
                      <a href={`/attendance?classCode=${cls.code}`} className="action-btn" title="Điểm danh" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                        <i className="fa-solid fa-calendar-check"></i>
                      </a>
                      {!userRole?.includes('TEACHER') && (
                        <>
                          <button className="action-btn edit-btn" title="Chỉnh sửa lớp học" onClick={() => openEditClassModal(cls)}>
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button className="action-btn delete-btn" title="Xóa lớp học" onClick={() => handleDeleteClass(cls.code)}>
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Tạo lớp học mới */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2><i className="fa-solid fa-folder-plus"></i> Khai giảng / Mở Lớp Học Mới</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>

            {message.text && (
              <div className={`alert-box alert-${message.type}`}>
                <i className={message.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}></i>
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>1. Chọn Khóa / Cấp độ học *</label>
                <select name="level" value={formData.level} onChange={handleInputChange} required>
                  <option value="">-- Chọn Khóa / Cấp độ học --</option>
                  {Object.entries(
                    courseConfigs.reduce((acc, cfg) => {
                      const groupKey = `${cfg.program} - ${cfg.capDo || 'Khác'}`;
                      if (!acc[groupKey]) acc[groupKey] = [];
                      acc[groupKey].push(cfg);
                      return acc;
                    }, {})
                  ).map(([groupLabel, items]) => (
                    <optgroup key={groupLabel} label={`📌 ${groupLabel}`}>
                      {items.map(cfg => (
                        <option key={cfg.id} value={cfg.level}>
                          Khóa {cfg.level} ({cfg.totalSessions} buổi - {cfg.price ? cfg.price.toLocaleString('vi-VN') : 0}đ - {cfg.bookName || 'Tự do'})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>2. Giáo viên phụ trách</label>
                  <select
                    name="teacherId"
                    value={formData.teacherId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">-- Chọn Giáo viên --</option>
                    {users.filter(u => u.role.includes('TEACHER') || u.role.includes('DIRECTOR')).map(u => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.username} ({u.username})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>3. Nhân viên CSKH phụ trách</label>
                  <select
                    name="careStaff"
                    value={formData.careStaff}
                    onChange={handleInputChange}
                  >
                    <option value="">-- Chọn CSKH --</option>
                    {users.filter(u => u.role.includes('CSKH') || u.role.includes('ADVISOR') || u.role.includes('DIRECTOR')).map(u => (
                      <option key={u.id} value={u.fullName || u.username}>
                        {u.fullName || u.username} ({u.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>4. Ngày khai giảng *</label>
                  <input 
                    type="date" 
                    name="startDateStr" 
                    value={formData.startDateStr} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>5. Lịch học tuần *</label>
                  <div className="schedule-checkboxes-container">
                    {[
                      { label: 'T2', value: '2' },
                      { label: 'T3', value: '3' },
                      { label: 'T4', value: '4' },
                      { label: 'T5', value: '5' },
                      { label: 'T6', value: '6' },
                      { label: 'T7', value: '7' },
                      { label: 'CN', value: 'CN' },
                    ].map(day => {
                      const isChecked = parseScheduleString(formData.schedule).includes(day.value);
                      return (
                        <label key={day.value} className={`checkbox-label ${isChecked ? 'checked-pill' : ''}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxChange(day.value)}
                            style={{ display: 'none' }}
                          />
                          <span>{day.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {previewEndDate && (
                <div className="preview-end-date-box">
                  <i className="fa-regular fa-clock"></i>
                  <span>Ngày kết thúc ước tính: <strong>{previewEndDate}</strong></span>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>Tạo lớp học</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh sửa lớp học */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2><i className="fa-solid fa-pen-to-square"></i> Chỉnh sửa thông tin Lớp học</h2>
              <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>&times;</button>
            </div>

            {message.text && (
              <div className={`alert-box alert-${message.type}`}>
                <i className={message.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}></i>
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="modal-form">
              <div className="form-group">
                <label>Mã Lớp Học (Không thể chỉnh sửa)</label>
                <input type="text" value={selectedClass?.code || ''} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Giáo viên phụ trách mới</label>
                  <select
                    name="teacherId"
                    value={editFormData.teacherId}
                    onChange={handleEditInputChange}
                    required
                  >
                    <option value="">-- Chọn Giáo viên --</option>
                    {users.filter(u => u.role.includes('TEACHER') || u.role.includes('DIRECTOR')).map(u => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.username} ({u.username})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Nhân viên CSKH phụ trách</label>
                  <select
                    name="careStaff"
                    value={editFormData.careStaff}
                    onChange={handleEditInputChange}
                  >
                    <option value="">-- Chọn CSKH --</option>
                    {users.filter(u => u.role.includes('CSKH') || u.role.includes('ADVISOR') || u.role.includes('DIRECTOR')).map(u => (
                      <option key={u.id} value={u.fullName || u.username}>
                        {u.fullName || u.username} ({u.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Ngày khai giảng *</label>
                  <input 
                    type="date" 
                    name="startDateStr" 
                    value={editFormData.startDateStr} 
                    onChange={(e) => setEditFormData(prev => ({ ...prev, startDateStr: e.target.value }))} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Lịch học tuần *</label>
                  <div className="schedule-checkboxes-container">
                    {[
                      { label: 'T2', value: '2' },
                      { label: 'T3', value: '3' },
                      { label: 'T4', value: '4' },
                      { label: 'T5', value: '5' },
                      { label: 'T6', value: '6' },
                      { label: 'T7', value: '7' },
                      { label: 'CN', value: 'CN' },
                    ].map(day => {
                      const isChecked = parseScheduleString(editFormData.schedule).includes(day.value);
                      const handleEditCheckboxChange = () => {
                        let currentSchedule = parseScheduleString(editFormData.schedule);
                        if (currentSchedule.includes(day.value)) {
                          currentSchedule = currentSchedule.filter(d => d !== day.value);
                        } else {
                          currentSchedule.push(day.value);
                        }
                        setEditFormData(prev => ({
                          ...prev,
                          schedule: joinScheduleArray(currentSchedule),
                        }));
                      };
                      return (
                        <label key={day.value} className={`checkbox-label ${isChecked ? 'checked-pill' : ''}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={handleEditCheckboxChange}
                            style={{ display: 'none' }}
                          />
                          <span>{day.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {editPreviewEndDate && (
                <div className="preview-end-date-box">
                  <i className="fa-regular fa-clock"></i>
                  <span>Ngày kết thúc ước tính mới: <strong>{editPreviewEndDate}</strong></span>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nâng khóa / Lên lớp mới cho cả lớp */}
      {isUpgradeModalOpen && upgradeClass && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2><i className="fa-solid fa-rocket" style={{ color: '#10b981' }}></i> Nâng khóa & Lên Lớp mới cả lớp</h2>
              <button className="close-btn" onClick={() => setIsUpgradeModalOpen(false)}>&times;</button>
            </div>

            {message.text && (
              <div className={`alert-box alert-${message.type}`}>
                <i className={message.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}></i>
                <span>{message.text}</span>
              </div>
            )}

            <div style={{ padding: '0.8rem 1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '1.25rem' }}>
              <p style={{ margin: 0, fontWeight: '700', color: '#047857' }}>
                📌 Lớp hiện tại: <span style={{ color: 'var(--color-primary-dark)' }}>{upgradeClass.code}</span> (Khóa {upgradeClass.level})
              </p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                👥 Số lượng học viên sẽ tự động chuyển sang lớp mới: <strong>{upgradeClass.studentCount} học viên</strong>
              </p>
            </div>

            <form onSubmit={handleUpgradeSubmit} className="modal-form">
              <div className="form-group">
                <label>1. Chọn Khóa / Cấp độ tiếp theo *</label>
                <select 
                  value={upgradeForm.newLevel} 
                  onChange={(e) => setUpgradeForm(prev => ({ ...prev, newLevel: e.target.value }))} 
                  required
                >
                  <option value="">-- Chọn Khóa học mới --</option>
                  {Object.entries(
                    courseConfigs.reduce((acc, cfg) => {
                      const groupKey = `${cfg.program} - ${cfg.capDo || 'Khác'}`;
                      if (!acc[groupKey]) acc[groupKey] = [];
                      acc[groupKey].push(cfg);
                      return acc;
                    }, {})
                  ).map(([groupLabel, items]) => (
                    <optgroup key={groupLabel} label={`📌 ${groupLabel}`}>
                      {items.map(cfg => (
                        <option key={cfg.id} value={cfg.level}>
                          Khóa {cfg.level} ({cfg.totalSessions} buổi - {cfg.price ? cfg.price.toLocaleString('vi-VN') : 0}đ - {cfg.bookName || 'Tự do'})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>2. Tên Giáo viên phụ trách (Giữ nguyên hoặc đổi)</label>
                <input 
                  type="text" 
                  value={upgradeForm.teacherName} 
                  onChange={(e) => setUpgradeForm(prev => ({ ...prev, teacherName: e.target.value }))} 
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>3. Ngày khai giảng lớp mới *</label>
                  <input 
                    type="date" 
                    value={upgradeForm.newStartDateStr} 
                    onChange={(e) => setUpgradeForm(prev => ({ ...prev, newStartDateStr: e.target.value }))} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>4. Ca học / Lịch học tuần *</label>
                  <select 
                    value={upgradeForm.schedule} 
                    onChange={(e) => setUpgradeForm(prev => ({ ...prev, schedule: e.target.value }))}
                  >
                    <option value="246">Thứ 2 - 4 - 6</option>
                    <option value="35">Thứ 3 - 5</option>
                    <option value="7CN">Thứ 7 - Chủ Nhật</option>
                  </select>
                </div>
              </div>

              <p className="field-note" style={{ marginTop: '0.75rem', color: 'var(--color-success)', fontWeight: '600' }}>
                <i className="fa-solid fa-circle-check"></i> Hệ thống tự động khởi tạo Mã lớp mới, chuyển sỹ số cả lớp và lập hóa đơn học phí mới cho từng học viên.
              </p>

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsUpgradeModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }} disabled={submitting}>
                  <i className="fa-solid fa-rocket"></i> Xác nhận Nâng khóa Cả Lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSS Cục bộ */}
      <style>{`
        .schedule-checkboxes-container {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
          margin-top: 0.35rem;
        }

        .checkbox-label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          padding: 0.5rem 0.8rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 700;
          transition: all var(--transition-fast);
          user-select: none;
          color: var(--color-text-muted);
          min-width: 45px;
          text-align: center;
        }

        .checkbox-label:hover {
          border-color: var(--color-primary);
          background: rgba(13, 136, 196, 0.05);
          color: var(--color-primary-dark);
        }

        .checkbox-label.checked-pill {
          background: var(--color-primary);
          color: white !important;
          border-color: var(--color-primary);
          box-shadow: 0 2px 4px rgba(13, 136, 196, 0.3);
        }

        .classes-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .page-header-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .page-header-actions h1 {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--color-text);
        }

        .page-header-actions p {
          color: var(--color-text-muted);
          font-size: 0.9rem;
        }

        .table-container {
          padding: 0;
          overflow: hidden;
          border-radius: 12px;
        }

        .custom-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .custom-table th {
          background-color: rgba(13, 136, 196, 0.05);
          color: var(--color-text);
          font-weight: 700;
          padding: 1rem;
          font-size: 0.85rem;
          border-bottom: 2px solid var(--color-border);
        }

        .custom-table td {
          padding: 1rem;
          font-size: 0.85rem;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text);
        }

        .table-row:hover {
          background-color: rgba(13, 136, 196, 0.02);
        }

        .class-code {
          font-family: monospace;
          font-weight: 700;
          color: var(--color-primary-dark);
        }

        .badge-level {
          background: rgba(100, 116, 139, 0.1);
          color: var(--color-text);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .teacher-name {
          font-weight: 600;
        }

        .student-count-badge {
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-success);
          padding: 0.25rem 0.6rem;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.75rem;
        }

        .student-count-badge.zero-students {
          background: rgba(100, 116, 139, 0.1);
          color: var(--color-text-muted);
        }

        .action-buttons {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .view-btn { color: var(--color-success); }
        .view-btn:hover { background: var(--color-success); color: white; border-color: var(--color-success); }

        .edit-btn { color: var(--color-primary); }
        .edit-btn:hover { background: var(--color-primary); color: white; border-color: var(--color-primary); }

        .delete-btn { color: var(--color-danger); }
        .delete-btn:hover { background: var(--color-danger); color: white; border-color: var(--color-danger); }

        .loading-state, .empty-table-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 5rem;
          gap: 1rem;
          color: var(--color-text-muted);
        }

        .loading-state i {
          font-size: 2.5rem;
          color: var(--color-primary);
        }

        .empty-table-state i {
          font-size: 3rem;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          width: 90%;
          background: var(--color-surface);
          padding: 2rem;
          position: relative;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 1rem;
          margin-bottom: 1.5rem;
        }

        .modal-header h2 {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          color: var(--color-text-muted);
          line-height: 1;
        }

        .close-btn:hover {
          color: var(--color-text);
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .form-group label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-text);
        }

        .form-group input, .form-group select {
          padding: 0.6rem 0.8rem;
          border-radius: 6px;
          border: 1px solid var(--color-border);
          background: var(--color-bg);
          color: var(--color-text);
          font-family: inherit;
          font-size: 0.9rem;
          transition: border-color var(--transition-fast);
        }

        .form-group input:focus, .form-group select:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .preview-end-date-box {
          background: rgba(13, 136, 196, 0.05);
          border: 1px solid rgba(13, 136, 196, 0.1);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .preview-end-date-box i {
          font-size: 1.1rem;
          color: var(--color-primary);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          border-top: 1px solid var(--color-border);
          padding-top: 1.5rem;
          margin-top: 1rem;
        }

        .alert-box {
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .alert-success {
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-success);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-danger);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .animated-scale {
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
