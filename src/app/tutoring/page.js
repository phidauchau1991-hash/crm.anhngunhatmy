'use client';

import React, { useState, useEffect, useMemo } from 'react';
import TutoringScheduleModal from './components/TutoringScheduleModal';
import TutoringLetterModal from './components/TutoringLetterModal';
import TutoringCompleteModal from './components/TutoringCompleteModal';

export default function TutoringPage() {
  const [stats, setStats] = useState({
    alertCount: 0,
    scheduledCount: 0,
    completedCount: 0,
    totalCount: 0,
    cancelledCount: 0,
    scheduledStudentsCount: 0
  });

  const [alerts, setAlerts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, SCHEDULED, COMPLETED, CANCELLED
  const [teacherFilter, setTeacherFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [schedulePrefill, setSchedulePrefill] = useState(null);

  const [isLetterOpen, setIsLetterOpen] = useState(false);
  const [letterPlan, setLetterPlan] = useState(null);

  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState({ session: null, plan: null });

  // Tải dữ liệu ban đầu
  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes, plansRes, studentsRes, classesRes, usersRes] = await Promise.all([
        fetch('/api/tutoring/stats'),
        fetch('/api/tutoring/alerts'),
        fetch('/api/tutoring'),
        fetch('/api/students'),
        fetch('/api/classes'),
        fetch('/api/users')
      ]);

      const [statsData, alertsData, plansData, studentsData, classesData, usersData] = await Promise.all([
        statsRes.json(),
        alertsRes.json(),
        plansRes.json(),
        studentsRes.json(),
        classesRes.json(),
        usersRes.json()
      ]);

      if (statsData.success) setStats(statsData.data);
      if (alertsData.success) setAlerts(alertsData.data || []);
      if (plansData.success) setPlans(plansData.data || []);
      if (studentsData.success) setStudents(studentsData.data || []);
      if (classesData.success) setClasses(classesData.data || []);
      if (usersData.success) {
        const teacherUsers = (usersData.data || []).filter(
          (u) => u.role === 'TEACHER' || u.role === 'DIRECTOR' || u.role === 'CSKH' || u.role === 'ADVISOR'
        );
        setTeachers(teacherUsers);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu phụ đạo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Bỏ qua cảnh báo học viên
  const handleDismissAlert = async (cand) => {
    if (!confirm(`Bạn có chắc muốn bỏ qua cảnh báo của học viên ${cand.studentName}?`)) return;
    try {
      const res = await fetch('/api/tutoring/alerts/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: cand.studentId,
          alertKey: cand.alertKey,
          reason: 'Người dùng bấm bỏ qua trên Dashboard'
        })
      });
      const json = await res.json();
      if (json.success) {
        setAlerts((prev) => prev.filter((a) => `${a.studentId}|${a.alertKey}` !== `${cand.studentId}|${cand.alertKey}`));
        setStats((prev) => ({ ...prev, alertCount: Math.max(0, prev.alertCount - 1) }));
      }
    } catch (e) {
      console.error(e);
      alert('Không thể bỏ qua cảnh báo');
    }
  };

  // Mở modal xếp lịch từ cảnh báo
  const handleOpenScheduleFromAlert = (cand) => {
    setSchedulePrefill(cand);
    setIsScheduleOpen(true);
  };

  // Mở modal tạo mới tự do
  const handleOpenScheduleNew = () => {
    setSchedulePrefill(null);
    setIsScheduleOpen(true);
  };

  // Sau khi tạo thành công
  const handleScheduleSuccess = (createdPlan, andExport = false) => {
    setIsScheduleOpen(false);
    setSchedulePrefill(null);
    fetchData();

    if (andExport && createdPlan) {
      setLetterPlan(createdPlan);
      setIsLetterOpen(true);
    }
  };

  // Hủy đợt phụ đạo
  const handleCancelPlan = async (plan) => {
    if (!confirm(`Bạn có chắc muốn hủy đợt phụ đạo ${plan.planCode} của học viên ${plan.student?.name}?`)) return;
    try {
      const res = await fetch(`/api/tutoring/${plan.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchData();
      } else {
        alert(json.error || 'Không thể hủy đợt phụ đạo');
      }
    } catch (e) {
      console.error(e);
      alert('Lỗi hủy đợt phụ đạo');
    }
  };

  // Mở modal đánh giá sau buổi học
  const handleOpenCompleteModal = (session, plan) => {
    setCompleteTarget({ session, plan });
    setIsCompleteOpen(true);
  };

  // Lọc danh sách theo Tab, Giáo viên và Tìm kiếm
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      // 1. Lọc theo tab
      if (activeTab === 'SCHEDULED' && plan.status !== 'SCHEDULED' && plan.status !== 'IN_PROGRESS') return false;
      if (activeTab === 'COMPLETED' && plan.status !== 'COMPLETED') return false;
      if (activeTab === 'CANCELLED' && plan.status !== 'CANCELLED') return false;

      // 2. Lọc theo giáo viên
      if (teacherFilter && plan.teacherId !== teacherFilter) return false;

      // 3. Tìm kiếm từ khóa
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const stName = (plan.student?.name || '').toLowerCase();
        const stPhone = (plan.student?.phone || '').toLowerCase();
        const code = (plan.planCode || '').toLowerCase();
        const cls = (plan.classCode || '').toLowerCase();
        const tutor = (plan.tutorName || '').toLowerCase();
        const hasRoom = (plan.sessions || []).some((s) => (s.roomName || '').toLowerCase().includes(q));

        if (!stName.includes(q) && !stPhone.includes(q) && !code.includes(q) && !cls.includes(q) && !tutor.includes(q) && !hasRoom) {
          return false;
        }
      }

      return true;
    });
  }, [plans, activeTab, teacherFilter, searchQuery]);

  return (
    <div className="tutoring-page">
      <div className="page-container">

        {/* ============ HEADER ============ */}
        <header className="page-header">
          <div className="header-icon">
            <i className="fa-solid fa-book-open-reader"></i>
          </div>
          <div className="header-text">
            <h1>Quản Lý Phụ Đạo & Bù Bài</h1>
            <p>Tự động phát hiện học viên vắng học / hổng kiến thức, điều phối lịch kèm trực tiếp và xuất thư báo phụ huynh</p>
          </div>
          <div className="header-actions">
            <button className="btn-primary-action" onClick={handleOpenScheduleNew}>
              <i className="fa-solid fa-plus"></i> Tạo Buổi Phụ Đạo Mới
            </button>
          </div>
        </header>

        {/* ============ STAT CARDS ============ */}
        <div className="stats-grid">
          <div className="stat-card danger">
            <div className="stat-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div className="stat-info">
              <div className="stat-label">Cảnh báo Cần Phụ Đạo</div>
              <div className="stat-value text-danger">{stats.alertCount}</div>
              <div className="stat-sub">{stats.scheduledStudentsCount} học viên đã lên lịch</div>
            </div>
          </div>

          <div className="stat-card primary">
            <div className="stat-icon">
              <i className="fa-solid fa-calendar-days"></i>
            </div>
            <div className="stat-info">
              <div className="stat-label">Đang Lên Lịch (Chờ học)</div>
              <div className="stat-value text-primary">{stats.scheduledCount}</div>
              <div className="stat-sub">{stats.scheduledCount} buổi học sắp tới</div>
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-icon">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div className="stat-info">
              <div className="stat-label">Đã Hoàn Thành</div>
              <div className="stat-value text-success">{stats.completedCount}</div>
              <div className="stat-sub">Đã điểm danh & đánh giá</div>
            </div>
          </div>

          <div className="stat-card navy">
            <div className="stat-icon">
              <i className="fa-solid fa-chart-pie"></i>
            </div>
            <div className="stat-info">
              <div className="stat-label">Tổng Số Buổi Tổ Chức</div>
              <div className="stat-value text-navy">{stats.totalCount}</div>
              <div className="stat-sub">{stats.cancelledCount} buổi đã hủy</div>
            </div>
          </div>
        </div>

        {/* ============ HÀNG ĐỢI CẢNH BÁO ============ */}
        <section className="warning-panel">
          <div className="warning-header">
            <div className="warning-title">
              <div className="warning-pulse">
                <span className="pulse-dot"></span>
              </div>
              <div>
                <h2>
                  <i className="fa-solid fa-bell"></i> Hàng Đợi Cảnh Báo Học Viên Cần Phụ Đạo & Bù Bài ({alerts.length})
                </h2>
                <p>Tự động quét từ hệ thống Điểm danh: Học viên vắng từ 2 buổi liên tiếp hoặc hổng kỹ năng cần bổ trợ</p>
              </div>
            </div>
            <button className="btn-create-alert" onClick={handleOpenScheduleNew}>
              <i className="fa-solid fa-plus"></i> Tạo buổi mới
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="empty-warning-state">
              <div className="empty-check-icon">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <div className="empty-text">
                <h3>Tuyệt vời! Hiện không có cảnh báo mới.</h3>
                <p>Không có học viên nào vắng từ 2 buổi liên tiếp hoặc hổng kiến thức chưa được xử lý.</p>
              </div>
            </div>
          ) : (
            <div className="warning-grid">
              {alerts.map((cand, idx) => (
                <div key={idx} className="warning-card">
                  <div className="warning-card-body">
                    <div className="warning-top-row">
                      <strong className="student-name">{cand.studentName}</strong>
                      <span className="badge-absent">
                        Vắng {cand.consecutiveAbsences} buổi
                      </span>
                    </div>

                    <div className="student-meta">
                      <div>Lớp: <span className="meta-strong">{cand.classCode}</span></div>
                      <div>SĐT: <span className="meta-phone">{cand.phone || 'Chưa có SĐT'}</span></div>
                      <div>GV chủ nhiệm: <span className="meta-teacher">{cand.teacherName}</span></div>
                    </div>

                    <div className="warning-reason-box">
                      <i className="fa-solid fa-clock-rotate-left"></i>
                      <span>{cand.reason}</span>
                    </div>
                  </div>

                  <div className="warning-card-footer">
                    <button
                      className="btn-dismiss"
                      onClick={() => handleDismissAlert(cand)}
                      title="Ẩn cảnh báo này"
                    >
                      Bỏ qua
                    </button>
                    <button
                      className="btn-schedule-now"
                      onClick={() => handleOpenScheduleFromAlert(cand)}
                    >
                      <i className="fa-solid fa-calendar-plus"></i> Xếp lịch ngay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ============ TOOLBAR (TABS + FILTERS) ============ */}
        <div className="toolbar-panel">
          <div className="status-tabs">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'SCHEDULED', label: 'Đã lên lịch' },
              { id: 'COMPLETED', label: 'Đã hoàn thành' },
              { id: 'CANCELLED', label: 'Đã hủy' }
            ].map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="filter-controls">
            <div className="teacher-select-wrap">
              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="select-custom"
              >
                <option value="">-- Tất cả giáo viên --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} {t.shortName ? `(${t.shortName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="search-input-wrap">
              <i className="fa-solid fa-magnifying-glass search-icon"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên học viên, mã đợt, phòng..."
                className="input-search"
              />
            </div>
          </div>
        </div>

        {/* ============ BẢNG DANH SÁCH ============ */}
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '13%' }}>Mã Đợt / Buổi</th>
                <th style={{ width: '18%' }}>Học Viên & Lớp</th>
                <th style={{ width: '18%' }}>Loại Buổi & Kỹ Năng</th>
                <th style={{ width: '25%' }}>Lịch Học & Phòng Học (Trực tiếp)</th>
                <th style={{ width: '12%' }}>Giáo Viên Kèm</th>
                <th style={{ width: '14%' }}>Trạng Thái</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="table-loading">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Đang tải danh sách phụ đạo & bù bài...</span>
                  </td>
                </tr>
              ) : filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    <i className="fa-regular fa-folder-open"></i>
                    <p>Chưa có buổi phụ đạo nào phù hợp với bộ lọc.</p>
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="table-row">
                    {/* 1. Mã đợt */}
                    <td className="cell-top">
                      <span className="plan-code">{plan.planCode}</span>
                      <span className="session-count-badge">
                        {plan.sessions?.length || 1} buổi học
                      </span>
                    </td>

                    {/* 2. Học viên & Lớp */}
                    <td className="cell-top">
                      <strong className="student-name-main">{plan.student?.name}</strong>
                      <span className="student-phone-sub">
                        <i className="fa-solid fa-phone"></i> {plan.student?.phone || 'Chưa có SĐT'}
                      </span>
                      <span className="class-badge">
                        {plan.classCode || 'Lớp riêng'}
                      </span>
                    </td>

                    {/* 3. Loại buổi & Kỹ năng */}
                    <td className="cell-top">
                      <span className="session-type-text">{plan.sessionType}</span>
                      <span className="focus-skill-pill">{plan.focusSkills}</span>
                      {plan.content && (
                        <p className="plan-content-preview" title={plan.content}>
                          {plan.content}
                        </p>
                      )}
                    </td>

                    {/* 4. Lịch học & Phòng học */}
                    <td className="cell-top">
                      <div className="sessions-list">
                        {(plan.sessions || []).map((s, sIdx) => (
                          <div key={s.id || sIdx} className="session-slot-item">
                            <div className="slot-info">
                              <span className="slot-num">B.{s.sessionNumber}:</span>
                              <span className="slot-date">{s.teachingDate}</span>
                              <span className="slot-time">({s.startTimeText || '16:30'} – {s.endTimeText || '17:30'})</span>
                              <span className="slot-room">📍 {s.roomName || 'Phòng học tại trung tâm'}</span>
                            </div>

                            <div className="slot-action">
                              {s.status === 'COMPLETED' ? (
                                <span className="badge-completed">
                                  <i className="fa-solid fa-check"></i> {s.attendanceStatus || 'Có mặt'} ({s.evaluation || 'Tốt'})
                                </span>
                              ) : s.status === 'CANCELLED' ? (
                                <span className="badge-cancelled">Đã hủy</span>
                              ) : (
                                <button
                                  onClick={() => handleOpenCompleteModal(s, plan)}
                                  className="btn-attend-mini"
                                  title="Điểm danh & đánh giá buổi này"
                                >
                                  <i className="fa-solid fa-check"></i> Điểm danh
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* 5. Giáo viên kèm */}
                    <td className="cell-top">
                      <strong className="tutor-name">{plan.tutorName || 'Chưa phân công'}</strong>
                    </td>

                    {/* 6. Trạng thái */}
                    <td className="cell-top">
                      {plan.status === 'COMPLETED' ? (
                        <span className="status-pill status-completed">
                          <span className="dot dot-completed"></span> Đã hoàn thành
                        </span>
                      ) : plan.status === 'IN_PROGRESS' ? (
                        <span className="status-pill status-in-progress">
                          <span className="dot dot-in-progress"></span> Đang phụ đạo
                        </span>
                      ) : plan.status === 'CANCELLED' ? (
                        <span className="status-pill status-cancelled">
                          <span className="dot dot-cancelled"></span> Đã hủy
                        </span>
                      ) : (
                        <span className="status-pill status-scheduled">
                          <span className="dot dot-scheduled"></span> Đã lên lịch
                        </span>
                      )}

                      {plan.letterExportedAt && (
                        <span className="letter-exported-tag">
                          <i className="fa-solid fa-check"></i> Đã gửi thư PH
                        </span>
                      )}
                    </td>

                    {/* 7. Thao tác */}
                    <td className="cell-top text-right">
                      <div className="action-row">
                        <button
                          onClick={() => {
                            setLetterPlan(plan);
                            setIsLetterOpen(true);
                          }}
                          className="btn-export-letter"
                          title="Xuất thư hẹn phụ huynh (gửi Zalo)"
                        >
                          <i className="fa-solid fa-envelope-open-text"></i> Xuất Thư
                        </button>

                        {plan.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancelPlan(plan)}
                            className="btn-cancel-plan"
                            title="Hủy đợt phụ đạo này"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ============ MODALS ============ */}
      <TutoringScheduleModal
        isOpen={isScheduleOpen}
        onClose={() => {
          setIsScheduleOpen(false);
          setSchedulePrefill(null);
        }}
        onSuccess={handleScheduleSuccess}
        prefillData={schedulePrefill}
        students={students}
        classes={classes}
        teachers={teachers}
      />

      <TutoringLetterModal
        isOpen={isLetterOpen}
        onClose={() => {
          setIsLetterOpen(false);
          setLetterPlan(null);
          fetchData();
        }}
        plan={letterPlan}
      />

      <TutoringCompleteModal
        isOpen={isCompleteOpen}
        onClose={() => {
          setIsCompleteOpen(false);
          setCompleteTarget({ session: null, plan: null });
        }}
        onSuccess={() => {
          setIsCompleteOpen(false);
          setCompleteTarget({ session: null, plan: null });
          fetchData();
        }}
        session={completeTarget.session}
        plan={completeTarget.plan}
      />

      {/* ============ SCOPED CSS ============ */}
      <style jsx>{`
        .tutoring-page {
          min-height: 100vh;
          background: #f8fafc;
          padding: 24px 32px;
          color: #1e293b;
          font-family: inherit;
        }
        .page-container {
          max-width: 1600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Header */
        .page-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 4px 0 8px 0;
        }
        .header-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, #0D88C4 0%, #085e8a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 24px;
          flex-shrink: 0;
          box-shadow: 0 8px 20px -6px rgba(13, 136, 196, 0.45);
        }
        .header-text {
          flex: 1;
        }
        .header-text h1 {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
          letter-spacing: -0.02em;
        }
        .header-text p {
          font-size: 13.5px;
          color: #64748b;
          margin: 0;
        }
        .header-actions {
          display: flex;
          gap: 10px;
        }
        .btn-primary-action {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #0D88C4 0%, #085e8a 100%);
          color: #ffffff;
          border: none;
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 14px -2px rgba(13, 136, 196, 0.4);
          transition: all 0.2s ease;
        }
        .btn-primary-action:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px -2px rgba(13, 136, 196, 0.55);
        }

        /* Stat Cards */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .stat-card {
          position: relative;
          background: #ffffff;
          border-radius: 14px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
          transition: all 0.2s ease;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -6px rgba(15, 23, 42, 0.1);
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
        }
        .stat-card.danger::before { background: #ef4444; }
        .stat-card.primary::before { background: #0D88C4; }
        .stat-card.success::before { background: #10b981; }
        .stat-card.navy::before { background: #085e8a; }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .stat-card.danger .stat-icon { background: #fee2e2; color: #ef4444; }
        .stat-card.primary .stat-icon { background: #e0f2fe; color: #0D88C4; }
        .stat-card.success .stat-icon { background: #d1fae5; color: #10b981; }
        .stat-card.navy .stat-icon { background: #f1f5f9; color: #085e8a; }

        .stat-info {
          flex: 1;
          min-width: 0;
        }
        .stat-label {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 28px;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 4px;
        }
        .text-danger { color: #dc2626; }
        .text-primary { color: #0D88C4; }
        .text-success { color: #059669; }
        .text-navy { color: #0f172a; }
        .stat-sub {
          font-size: 12px;
          color: #94a3b8;
        }

        /* Warning Panel */
        .warning-panel {
          background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
          border: 1px solid #fecaca;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.06);
        }
        .warning-header {
          padding: 14px 20px;
          background: #fee2e2;
          border-bottom: 1px solid #fecaca;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .warning-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .warning-pulse {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pulse-dot {
          width: 10px;
          height: 10px;
          background: #ef4444;
          border-radius: 50%;
          box-shadow: 0 0 0 rgba(239, 68, 68, 0.7);
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .warning-title h2 {
          font-size: 14px;
          font-weight: 700;
          color: #7f1d1d;
          margin: 0 0 2px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .warning-title p {
          font-size: 12px;
          color: #991b1b;
          margin: 0;
        }
        .btn-create-alert {
          background: #ef4444;
          color: #ffffff;
          border: none;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: background 0.15s ease;
        }
        .btn-create-alert:hover {
          background: #dc2626;
        }

        /* Empty state */
        .empty-warning-state {
          padding: 32px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .empty-check-icon {
          font-size: 36px;
          color: #10b981;
        }
        .empty-text h3 {
          font-size: 14px;
          font-weight: 700;
          color: #065f46;
          margin: 0 0 4px 0;
        }
        .empty-text p {
          font-size: 12.5px;
          color: #64748b;
          margin: 0;
        }

        /* Warning Grid */
        .warning-grid {
          padding: 16px 20px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 14px;
        }
        .warning-card {
          background: #ffffff;
          border: 1px solid #fee2e2;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
          transition: all 0.2s ease;
        }
        .warning-card:hover {
          border-color: #fca5a5;
          box-shadow: 0 4px 14px -4px rgba(239, 68, 68, 0.2);
        }
        .warning-top-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 6px;
        }
        .student-name {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
        }
        .badge-absent {
          background: #fee2e2;
          color: #b91c1c;
          font-size: 11px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 6px;
          white-space: nowrap;
        }
        .student-meta {
          font-size: 12px;
          color: #64748b;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .meta-strong { font-weight: 700; color: #1e293b; }
        .meta-phone { color: #334155; }
        .meta-teacher { font-weight: 600; color: #085e8a; }

        .warning-reason-box {
          background: #fff5f5;
          border: 1px solid #fee2e2;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 11.5px;
          color: #991b1b;
          display: flex;
          align-items: flex-start;
          gap: 6px;
          line-height: 1.4;
          margin-top: 8px;
        }
        .warning-reason-box i {
          margin-top: 2px;
          color: #ef4444;
        }
        .warning-card-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          padding-top: 8px;
          border-top: 1px solid #f1f5f9;
        }
        .btn-dismiss {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-dismiss:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .btn-schedule-now {
          background: #0D88C4;
          color: #ffffff;
          border: none;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          box-shadow: 0 2px 6px rgba(13, 136, 196, 0.25);
          transition: background 0.15s ease;
        }
        .btn-schedule-now:hover {
          background: #085e8a;
        }

        /* Toolbar */
        .toolbar-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        .status-tabs {
          display: flex;
          gap: 4px;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 10px;
        }
        .tab-btn {
          border: none;
          background: transparent;
          font-size: 12.5px;
          font-weight: 600;
          color: #64748b;
          padding: 6px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .tab-btn:hover {
          color: #0f172a;
        }
        .tab-btn.active {
          background: #ffffff;
          color: #0D88C4;
          font-weight: 800;
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
        }

        .filter-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .select-custom {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 12.5px;
          font-weight: 600;
          color: #334155;
          background: #ffffff;
          outline: none;
          cursor: pointer;
        }
        .select-custom:focus {
          border-color: #0D88C4;
          box-shadow: 0 0 0 3px rgba(13, 136, 196, 0.15);
        }
        .search-input-wrap {
          position: relative;
          width: 280px;
        }
        .search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 13px;
        }
        .input-search {
          width: 100%;
          padding: 8px 12px 8px 32px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 12.5px;
          color: #1e293b;
          outline: none;
          background: #ffffff;
        }
        .input-search:focus {
          border-color: #0D88C4;
          box-shadow: 0 0 0 3px rgba(13, 136, 196, 0.15);
        }

        /* Table */
        .table-wrapper {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow-x: auto;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
        }
        .custom-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
          text-align: left;
        }
        .custom-table thead {
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
        }
        .custom-table th {
          padding: 12px 14px;
          font-weight: 700;
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #475569;
          white-space: nowrap;
        }
        .custom-table tbody tr {
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.15s ease;
        }
        .custom-table tbody tr:hover {
          background: #f8fafc;
        }
        .cell-top {
          padding: 12px 14px;
          vertical-align: top;
        }
        .text-right { text-align: right; }

        .table-loading, .table-empty {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
        }
        .table-loading i {
          font-size: 24px;
          color: #0D88C4;
          display: block;
          margin-bottom: 8px;
        }
        .table-empty i {
          font-size: 32px;
          color: #cbd5e1;
          display: block;
          margin-bottom: 8px;
        }

        /* Cell Details */
        .plan-code {
          font-weight: 800;
          color: #085e8a;
          display: block;
          font-family: monospace;
          font-size: 13px;
        }
        .session-count-badge {
          display: inline-block;
          font-size: 10.5px;
          color: #64748b;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          margin-top: 3px;
        }

        .student-name-main {
          display: block;
          font-size: 13.5px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .student-phone-sub {
          display: block;
          font-size: 11.5px;
          color: #64748b;
          margin-bottom: 4px;
        }
        .student-phone-sub i {
          font-size: 10px;
          color: #94a3b8;
        }
        .class-badge {
          display: inline-block;
          background: #e0f2fe;
          color: #0369a1;
          font-weight: 700;
          font-size: 10.5px;
          padding: 2px 7px;
          border-radius: 5px;
        }

        .session-type-text {
          display: block;
          font-weight: 700;
          color: #334155;
          margin-bottom: 3px;
        }
        .focus-skill-pill {
          display: inline-block;
          background: #ede9fe;
          color: #6d28d9;
          font-weight: 700;
          font-size: 10.5px;
          padding: 2px 7px;
          border-radius: 5px;
          margin-bottom: 3px;
        }
        .plan-content-preview {
          font-size: 11px;
          color: #64748b;
          font-style: italic;
          margin: 2px 0 0 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Sessions list */
        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .session-slot-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 6px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          font-size: 11.5px;
        }
        .slot-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .slot-num {
          font-weight: 800;
          color: #085e8a;
          margin-right: 4px;
        }
        .slot-date {
          font-weight: 700;
          color: #1e293b;
          margin-right: 4px;
        }
        .slot-time {
          font-weight: 700;
          color: #b45309;
        }
        .slot-room {
          font-size: 10.5px;
          color: #64748b;
        }
        .slot-action {
          flex-shrink: 0;
        }
        .badge-completed {
          background: #d1fae5;
          color: #065f46;
          font-weight: 700;
          font-size: 10.5px;
          padding: 3px 8px;
          border-radius: 6px;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .badge-cancelled {
          background: #f1f5f9;
          color: #64748b;
          font-weight: 700;
          font-size: 10.5px;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .btn-attend-mini {
          background: #10b981;
          color: #ffffff;
          border: none;
          font-size: 10.5px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          transition: background 0.15s ease;
        }
        .btn-attend-mini:hover {
          background: #059669;
        }

        .tutor-name {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
        }

        /* Status Pill */
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .status-scheduled {
          background: #e0f2fe;
          color: #0369a1;
        }
        .dot-scheduled { background: #0D88C4; }

        .status-in-progress {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .dot-in-progress { background: #2563eb; }

        .status-completed {
          background: #d1fae5;
          color: #065f46;
        }
        .dot-completed { background: #10b981; }

        .status-cancelled {
          background: #f1f5f9;
          color: #64748b;
        }
        .dot-cancelled { background: #94a3b8; }

        .letter-exported-tag {
          display: block;
          font-size: 10.5px;
          font-weight: 700;
          color: #059669;
          margin-top: 4px;
        }

        /* Actions */
        .action-row {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 6px;
        }
        .btn-export-letter {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
          font-size: 11.5px;
          font-weight: 700;
          padding: 6px 10px;
          border-radius: 7px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .btn-export-letter:hover {
          background: #dcfce7;
          border-color: #86efac;
        }
        .btn-cancel-plan {
          background: transparent;
          border: 1px solid #e2e8f0;
          color: #94a3b8;
          width: 30px;
          height: 30px;
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-cancel-plan:hover {
          background: #fee2e2;
          border-color: #fca5a5;
          color: #ef4444;
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .tutoring-page { padding: 16px; }
          .stats-grid { grid-template-columns: 1fr; }
          .page-header { flex-direction: column; align-items: flex-start; }
          .toolbar-panel { flex-direction: column; align-items: stretch; }
          .filter-controls { flex-direction: column; }
          .search-input-wrap { width: 100%; }
        }
      `}</style>
    </div>
  );
}
