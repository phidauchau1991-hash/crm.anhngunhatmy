'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function ParentPortalPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('grades'); // 'grades', 'attendance', 'inventory'

  useEffect(() => {
    if (!token) return;

    const fetchPortalData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/parent?token=${token}`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Không thể tải dữ liệu sổ liên lạc.');
        }
      } catch (err) {
        console.error(err);
        setError('Kết nối máy chủ thất bại. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchPortalData();
  }, [token]);

  if (loading) {
    return (
      <div className="portal-loading">
        <div className="loader">
          <i className="fa-solid fa-graduation-cap fa-bounce brand-spinner"></i>
          <p>Đang kết nối Sổ liên lạc điện tử...</p>
        </div>
        <style>{`
          .portal-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #0f172a;
            color: #f8fafc;
            font-family: system-ui, sans-serif;
          }
          .loader {
            text-align: center;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          .brand-spinner {
            font-size: 3rem;
            color: #FFCA29;
          }
          .loader p {
            font-size: 0.95rem;
            color: #94a3b8;
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="portal-error">
        <div className="error-card">
          <i className="fa-solid fa-triangle-exclamation error-icon"></i>
          <h2>Đã xảy ra lỗi</h2>
          <p>{error || 'Mã liên kết không hợp lệ.'}</p>
          <div className="support-info">
            Vui lòng liên hệ Văn phòng Anh Ngữ Nhật Mỹ để được hỗ trợ cấp lại mã liên kết.
          </div>
        </div>
        <style>{`
          .portal-error {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #0f172a;
            padding: 1.5rem;
            font-family: system-ui, sans-serif;
          }
          .error-card {
            background: #1e293b;
            border: 1px solid rgba(239, 68, 68, 0.2);
            padding: 2.5rem 1.5rem;
            border-radius: 16px;
            text-align: center;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          }
          .error-icon {
            font-size: 3.5rem;
            color: #ef4444;
            margin-bottom: 1rem;
          }
          .error-card h2 {
            color: #f8fafc;
            margin-bottom: 0.5rem;
            font-size: 1.4rem;
          }
          .error-card p {
            color: #94a3b8;
            font-size: 0.95rem;
            line-height: 1.5;
            margin-bottom: 1.5rem;
          }
          .support-info {
            background: rgba(255, 202, 41, 0.1);
            color: #FFCA29;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            line-height: 1.4;
          }
        `}</style>
      </div>
    );
  }

  const { student, stats, enrollments, attendanceHistory, inventoryLogs } = data;
  const currentEnrollment = enrollments[0]; // Active class enrollment

  return (
    <div className="portal-container">
      {/* Brand Header */}
      <header className="portal-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-badge">
              <i className="fa-solid fa-graduation-cap"></i>
            </div>
            <div>
              <h1>NHẬT MỸ</h1>
              <p>DEDICATED TO EXCELLENCE</p>
            </div>
          </div>
          <span className="portal-title-badge">SỔ LIÊN LẠC ĐIỆN TỬ</span>
        </div>
      </header>

      {/* Main Body */}
      <main className="portal-main">
        {/* PWA Install Banner */}
        <div className="pwa-install-banner" style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <i className="fa-solid fa-mobile-screen-button" style={{ color: '#3b82f6', fontSize: '1.25rem', marginTop: '0.2rem' }}></i>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', color: '#60a5fa', fontSize: '0.9rem', fontWeight: '600' }}>Cài đặt App Nhật Mỹ</h4>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem', lineHeight: '1.4' }}>
              Bấm vào biểu tượng <strong>⫶</strong> (hoặc <i className="fa-solid fa-arrow-up-from-bracket"></i> Share) trên trình duyệt ➔ Chọn <strong>'Thêm vào màn hình chính'</strong> để truy cập Sổ liên lạc nhanh như 1 App.
            </p>
          </div>
        </div>

        {/* Student Profile Card */}
        <section className="student-profile-card">
          <div className="profile-top">
            <div className="avatar-circle">
              <i className="fa-solid fa-user-graduate"></i>
            </div>
            <div className="profile-name-info">
              <h2>{student.name}</h2>
              <div className="profile-ids">
                <span className="id-badge">Mã HV: {student.id}</span>
                <span className={`status-badge ${student.status === 'Đang học' ? 'status-active' : 'status-inactive'}`}>
                  {student.status}
                </span>
              </div>
            </div>
          </div>

          <div className="profile-details-grid">
            <div className="p-detail">
              <i className="fa-solid fa-cake-candles"></i>
              <div>
                <label>Ngày sinh</label>
                <p>{student.dob ? new Date(student.dob).toLocaleDateString('vi-VN') : 'N/A'}</p>
              </div>
            </div>
            <div className="p-detail">
              <i className="fa-solid fa-school-flag"></i>
              <div>
                <label>Lớp học hiện tại</label>
                <p>{currentEnrollment ? currentEnrollment.classCode : 'Chưa xếp lớp'}</p>
              </div>
            </div>
            {currentEnrollment && (
              <>
                <div className="p-detail">
                  <i className="fa-solid fa-user-tie"></i>
                  <div>
                    <label>Giáo viên phụ trách</label>
                    <p>{currentEnrollment.teacherName}</p>
                  </div>
                </div>
                <div className="p-detail">
                  <i className="fa-solid fa-calendar-days"></i>
                  <div>
                    <label>Lịch học</label>
                    <p>Thứ {currentEnrollment.schedule.split('').join(' & ')}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Dashboard Stats */}
        <section className="stats-grid">
          {/* Card 1: Attendance */}
          <div className="stat-card">
            <div className="stat-icon-wrapper attendance-icon">
              <i className="fa-solid fa-calendar-check"></i>
            </div>
            <div className="stat-info">
              <label>Đã tham gia</label>
              <h3>{stats.totalSessionsAttended} buổi</h3>
              <p>Tỷ lệ chuyên cần: <strong>{stats.presenceRate}%</strong></p>
            </div>
          </div>

          {/* Card 2: Tuition */}
          <div className="stat-card">
            <div className="stat-icon-wrapper tuition-icon">
              <i className="fa-solid fa-file-invoice-dollar"></i>
            </div>
            <div className="stat-info">
              <label>Học phí đã đóng</label>
              <h3 className="text-success">{stats.totalPaid.toLocaleString('vi-VN')}đ</h3>
              <p>
                Còn lại:{' '}
                <span className={stats.outstanding > 0 ? 'text-danger font-bold' : 'text-success font-bold'}>
                  {stats.outstanding.toLocaleString('vi-VN')}đ
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Main Sections Tabs */}
        <div className="tabs-nav-bar">
          <button 
            className={`tab-link ${activeTab === 'grades' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('grades')}
          >
            <i className="fa-solid fa-star"></i>
            <span>Kết quả học tập</span>
          </button>
          <button 
            className={`tab-link ${activeTab === 'attendance' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <i className="fa-solid fa-calendar-days"></i>
            <span>Điểm danh</span>
          </button>
          <button 
            className={`tab-link ${activeTab === 'inventory' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <i className="fa-solid fa-gift"></i>
            <span>Nhận giáo trình & Quà</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="tab-viewport">
          {/* TAB 1: TÌNH HÌNH HỌC TẬP */}
          {activeTab === 'grades' && (
            <div className="tab-pane-content animated-fade">
              {enrollments.length === 0 ? (
                <div className="empty-panel">
                  <i className="fa-solid fa-circle-info"></i>
                  <p>Học sinh chưa có thông tin kết quả học tập lớp học nào.</p>
                </div>
              ) : (
                enrollments.map((enroll) => (
                  <div key={enroll.id} className="class-grade-card">
                    <h3 className="class-title-header">
                      <i className="fa-solid fa-graduation-cap"></i> Lớp {enroll.classCode}
                    </h3>

                    {/* Midterm Grades */}
                    <div className="grades-section">
                      <h4><i className="fa-solid fa-chart-simple"></i> Điểm Giữa kỳ (Mid-term)</h4>
                      <div className="grade-metrics-grid">
                        <div className="metric-box">
                          <label>Nghe (Listening)</label>
                          <span className="score-val">{enroll.midTermListening ?? '-'}</span>
                          <div className="score-bar"><div className="score-fill" style={{ width: `${(enroll.midTermListening || 0) * 10}%` }}></div></div>
                        </div>
                        <div className="metric-box">
                          <label>Nói (Speaking)</label>
                          <span className="score-val">{enroll.midTermSpeaking ?? '-'}</span>
                          <div className="score-bar"><div className="score-fill" style={{ width: `${(enroll.midTermSpeaking || 0) * 10}%` }}></div></div>
                        </div>
                        <div className="metric-box">
                          <label>Đọc (Reading)</label>
                          <span className="score-val">{enroll.midTermReading ?? '-'}</span>
                          <div className="score-bar"><div className="score-fill" style={{ width: `${(enroll.midTermReading || 0) * 10}%` }}></div></div>
                        </div>
                        <div className="metric-box">
                          <label>Viết (Writing)</label>
                          <span className="score-val">{enroll.midTermWriting ?? '-'}</span>
                          <div className="score-bar"><div className="score-fill" style={{ width: `${(enroll.midTermWriting || 0) * 10}%` }}></div></div>
                        </div>
                      </div>
                    </div>

                    {/* Final Grades */}
                    <div className="grades-section" style={{ marginTop: '1.5rem' }}>
                      <h4><i className="fa-solid fa-award"></i> Điểm Cuối kỳ (Final)</h4>
                      <div className="grade-metrics-grid">
                        <div className="metric-box">
                          <label>Nghe (Listening)</label>
                          <span className="score-val score-final">{enroll.finalListening ?? '-'}</span>
                          <div className="score-bar"><div className="score-fill final-fill" style={{ width: `${(enroll.finalListening || 0) * 10}%` }}></div></div>
                        </div>
                        <div className="metric-box">
                          <label>Nói (Speaking)</label>
                          <span className="score-val score-final">{enroll.finalSpeaking ?? '-'}</span>
                          <div className="score-bar"><div className="score-fill final-fill" style={{ width: `${(enroll.finalSpeaking || 0) * 10}%` }}></div></div>
                        </div>
                        <div className="metric-box">
                          <label>Đọc (Reading)</label>
                          <span className="score-val score-final">{enroll.finalReading ?? '-'}</span>
                          <div className="score-bar"><div className="score-fill final-fill" style={{ width: `${(enroll.finalReading || 0) * 10}%` }}></div></div>
                        </div>
                        <div className="metric-box">
                          <label>Viết (Writing)</label>
                          <span className="score-val score-final">{enroll.finalWriting ?? '-'}</span>
                          <div className="score-bar"><div className="score-fill final-fill" style={{ width: `${(enroll.finalWriting || 0) * 10}%` }}></div></div>
                        </div>
                      </div>
                    </div>

                    {/* Teacher General Remarks */}
                    <div className="teacher-remarks-box">
                      <h4><i className="fa-regular fa-comment-dots"></i> Nhận xét từ Giáo viên</h4>
                      <p className="remark-text">
                        {enroll.teacherNotes ? `"${enroll.teacherNotes}"` : 'Chưa có nhận xét chung từ giáo viên cho khóa học này.'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: LỊCH SỬ ĐIỂM DANH */}
          {activeTab === 'attendance' && (
            <div className="tab-pane-content animated-fade">
              {attendanceHistory.length === 0 ? (
                <div className="empty-panel">
                  <i className="fa-solid fa-calendar-xmark"></i>
                  <p>Chưa ghi nhận lịch sử điểm danh nào.</p>
                </div>
              ) : (
                <div className="attendance-timeline">
                  {attendanceHistory.map((att) => {
                    const statusClass = 
                      att.status === 'Có mặt' ? 'att-present' :
                      att.status === 'Vắng có phép' ? 'att-excused' : 'att-unexcused';
                    const iconName = 
                      att.status === 'Có mặt' ? 'fa-solid fa-circle-check' :
                      att.status === 'Vắng có phép' ? 'fa-solid fa-circle-minus' : 'fa-solid fa-circle-xmark';

                    return (
                      <div key={att.id} className="attendance-item">
                        <div className={`attendance-status-line ${statusClass}`}>
                          <div className="status-circle-icon">
                            <i className={iconName}></i>
                          </div>
                        </div>
                        <div className="attendance-item-body">
                          <div className="att-item-header">
                            <span className="att-date">{new Date(att.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <span className={`att-badge ${statusClass}`}>{att.status}</span>
                          </div>
                          <div className="att-item-details">
                            <p className="att-class">Lớp học: <strong>{att.classCode}</strong> {att.checkInTime && <span className="checkin-time">({att.checkInTime})</span>}</p>
                            {att.teacherNotes && (
                              <p className="att-note-teacher">
                                <i className="fa-regular fa-comment"></i> Nhận xét riêng: <span>{att.teacherNotes}</span>
                              </p>
                            )}
                            {att.classNotes && (
                              <p className="att-note-class">
                                <i className="fa-solid fa-chalkboard-user"></i> Nội dung buổi học: <span>{att.classNotes}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VẬT TƯ NHẬN PHÁT */}
          {activeTab === 'inventory' && (
            <div className="tab-pane-content animated-fade">
              {inventoryLogs.length === 0 ? (
                <div className="empty-panel">
                  <i className="fa-solid fa-box-open"></i>
                  <p>Học sinh chưa có lịch sử nhận sách hay quà tặng nào.</p>
                </div>
              ) : (
                <div className="inventory-logs-list">
                  {inventoryLogs.map((log) => (
                    <div key={log.id} className="inventory-log-card">
                      <div className="log-icon-type">
                        <i className={log.category === 'Giáo trình' ? 'fa-solid fa-book' : 'fa-solid fa-shirt'}></i>
                      </div>
                      <div className="log-body">
                        <div className="log-header-info">
                          <h4>{log.inventoryName}</h4>
                          <span className="log-category-badge">{log.category}</span>
                        </div>
                        <div className="log-detail-rows">
                          <div className="log-row">
                            <span>Số lượng nhận:</span>
                            <strong className="text-primary">{log.quantity} cái/quyển</strong>
                          </div>
                          <div className="log-row">
                            <span>Ngày cấp phát:</span>
                            <span>{new Date(log.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                          {log.notes && (
                            <div className="log-notes">
                              <i className="fa-solid fa-info-circle"></i> Ghi chú: {log.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Zalo Button */}
        <a 
          href="https://zalo.me/0901234567" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="floating-zalo-btn"
          title="Liên hệ Zalo Trung tâm"
        >
          <div className="zalo-icon-wrapper">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Icon_of_Zalo.svg/1024px-Icon_of_Zalo.svg.png" alt="Zalo" />
          </div>
          <span className="zalo-tooltip">Hỗ trợ Zalo</span>
        </a>
      </main>

      {/* Styled JSX for parent portal */}
      <style>{`
        .portal-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #0f172a;
          min-height: 100vh;
          color: #f8fafc;
          font-family: var(--font-sans), system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          box-shadow: 0 0 40px rgba(0,0,0,0.5);
        }

        /* Header Style */
        .portal-header {
          background: linear-gradient(135deg, #085e8a 0%, #0D88C4 100%);
          border-bottom: 2px solid #FFCA29;
          padding: 1.25rem 1rem;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }
        .logo-badge {
          background-color: #FFCA29;
          color: #085e8a;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
        }
        .logo-section h1 {
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          margin: 0;
          color: #ffffff;
          line-height: 1.1;
        }
        .logo-section p {
          font-size: 0.6rem;
          font-weight: 700;
          color: #ffe07a;
          margin: 0;
          letter-spacing: 1px;
        }
        .portal-title-badge {
          background-color: rgba(255,255,255,0.15);
          color: #ffffff;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.35rem 0.65rem;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.2);
          letter-spacing: 0.5px;
        }

        /* Main Scroll Area */
        .portal-main {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          flex-grow: 1;
        }

        /* Student Profile Card */
        .student-profile-card {
          background: #1e293b;
          border-radius: 16px;
          padding: 1.25rem;
          border: 1px solid #334155;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .profile-top {
          display: flex;
          align-items: center;
          gap: 1rem;
          border-bottom: 1px dashed #334155;
          padding-bottom: 1rem;
          margin-bottom: 1rem;
        }
        .avatar-circle {
          background-color: rgba(13, 136, 196, 0.15);
          color: #4bb4e6;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          border: 1.5px solid rgba(13, 136, 196, 0.3);
        }
        .profile-name-info h2 {
          font-size: 1.2rem;
          font-weight: 800;
          color: #f8fafc;
          margin: 0 0 0.25rem 0;
        }
        .profile-ids {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .id-badge {
          font-family: monospace;
          background-color: #334155;
          color: #cbd5e1;
          font-size: 0.75rem;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-weight: 600;
        }
        .status-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }
        .status-active {
          background-color: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        .status-inactive {
          background-color: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }
        .profile-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }
        @media (max-width: 480px) {
          .profile-details-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
        }
        .p-detail {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.8rem;
        }
        .p-detail i {
          color: #FFCA29;
          margin-top: 0.15rem;
          font-size: 0.95rem;
          width: 16px;
        }
        .p-detail label {
          color: #94a3b8;
          font-weight: 600;
          display: block;
          margin-bottom: 0.1rem;
        }
        .p-detail p {
          color: #f1f5f9;
          font-weight: 700;
          margin: 0;
        }

        /* Statistics Section */
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .stat-card {
          background: #1e293b;
          border-radius: 12px;
          padding: 1rem;
          border: 1px solid #334155;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .stat-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
        .attendance-icon {
          background-color: rgba(13, 136, 196, 0.15);
          color: #0D88C4;
        }
        .tuition-icon {
          background-color: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        .stat-info label {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 600;
          display: block;
        }
        .stat-info h3 {
          font-size: 1.05rem;
          font-weight: 800;
          margin: 0.1rem 0;
          line-height: 1.2;
        }
        .stat-info p {
          font-size: 0.7rem;
          color: #cbd5e1;
          margin: 0;
        }
        .text-success { color: #10b981 !important; }
        .text-danger { color: #ef4444 !important; }
        .font-bold { font-weight: 700; }

        /* Tabs Nav Bar */
        .tabs-nav-bar {
          display: flex;
          background: #1e293b;
          border-radius: 12px;
          padding: 0.25rem;
          border: 1px solid #334155;
          margin-top: 0.5rem;
        }
        .tab-link {
          flex: 1;
          background: none;
          border: none;
          padding: 0.65rem 0.25rem;
          border-radius: 8px;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          transition: all 0.2s ease;
        }
        .tab-link i {
          font-size: 1.1rem;
        }
        .tab-link span {
          font-size: 0.7rem;
          font-weight: 700;
        }
        .tab-link:hover {
          color: #f8fafc;
        }
        .tab-active {
          background-color: #0D88C4;
          color: #ffffff !important;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.15);
        }

        /* Tab Content Panel */
        .tab-viewport {
          margin-top: 0.25rem;
          min-height: 300px;
        }
        .tab-pane-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .empty-panel {
          background-color: #1e293b;
          border-radius: 12px;
          padding: 3rem 1.5rem;
          text-align: center;
          color: #94a3b8;
          border: 1px solid #334155;
        }
        .empty-panel i {
          font-size: 2.2rem;
          margin-bottom: 0.75rem;
          color: #64748b;
        }
        .empty-panel p {
          font-size: 0.85rem;
          margin: 0;
        }

        /* Grades Tab Layout */
        .class-grade-card {
          background-color: #1e293b;
          border-radius: 16px;
          padding: 1.25rem;
          border: 1px solid #334155;
        }
        .class-title-header {
          font-size: 1.1rem;
          font-weight: 800;
          color: #FFCA29;
          margin: 0 0 1.25rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-bottom: 1.5px solid #334155;
          padding-bottom: 0.75rem;
        }
        .grades-section h4 {
          font-size: 0.85rem;
          font-weight: 700;
          color: #e2e8f0;
          margin: 0 0 0.85rem 0;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .grade-metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .metric-box {
          background-color: #0f172a;
          border-radius: 10px;
          padding: 0.75rem;
          border: 1px solid #1e293b;
          position: relative;
        }
        .metric-box label {
          font-size: 0.7rem;
          color: #94a3b8;
          font-weight: 600;
          display: block;
          margin-bottom: 0.2rem;
        }
        .score-val {
          font-size: 1.4rem;
          font-weight: 800;
          color: #4bb4e6;
        }
        .score-final {
          color: #FFCA29;
        }
        .score-bar {
          height: 4px;
          background-color: #1e293b;
          border-radius: 2px;
          margin-top: 0.4rem;
          overflow: hidden;
        }
        .score-fill {
          height: 100%;
          background-color: #4bb4e6;
          border-radius: 2px;
        }
        .final-fill {
          background-color: #FFCA29;
        }

        /* Teacher General Remarks */
        .teacher-remarks-box {
          margin-top: 1.5rem;
          background-color: rgba(255, 202, 41, 0.05);
          border: 1.5px dashed rgba(255, 202, 41, 0.2);
          border-radius: 12px;
          padding: 1rem;
        }
        .teacher-remarks-box h4 {
          font-size: 0.85rem;
          font-weight: 700;
          color: #FFCA29;
          margin: 0 0 0.5rem 0;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .remark-text {
          font-size: 0.8rem;
          line-height: 1.5;
          color: #e2e8f0;
          margin: 0;
          font-style: italic;
        }

        /* Attendance Timeline Layout */
        .attendance-timeline {
          display: flex;
          flex-direction: column;
          position: relative;
          padding-left: 1rem;
        }
        .attendance-timeline::before {
          content: '';
          position: absolute;
          left: 16px;
          top: 0;
          bottom: 0;
          width: 2px;
          background-color: #334155;
          z-index: 1;
        }
        .attendance-item {
          display: flex;
          gap: 1rem;
          position: relative;
          margin-bottom: 1.25rem;
          z-index: 2;
        }
        .attendance-status-line {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .status-circle-icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background-color: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          border: 2px solid;
          z-index: 10;
        }
        .att-present .status-circle-icon { color: #10b981; border-color: #10b981; background-color: rgba(16, 185, 129, 0.15); }
        .att-excused .status-circle-icon { color: #f59e0b; border-color: #f59e0b; background-color: rgba(245, 158, 11, 0.15); }
        .att-unexcused .status-circle-icon { color: #ef4444; border-color: #ef4444; background-color: rgba(239, 68, 68, 0.15); }

        .attendance-item-body {
          background-color: #1e293b;
          border-radius: 12px;
          padding: 0.85rem 1rem;
          border: 1px solid #334155;
          flex-grow: 1;
        }
        .att-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #334155;
          padding-bottom: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .att-date {
          font-size: 0.8rem;
          font-weight: 700;
          color: #f1f5f9;
        }
        .att-badge {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
        }
        .att-badge.att-present { background-color: rgba(16, 185, 129, 0.15); color: #10b981; }
        .att-badge.att-excused { background-color: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .att-badge.att-unexcused { background-color: rgba(239, 68, 68, 0.15); color: #ef4444; }

        .att-item-details {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .att-class {
          font-size: 0.75rem;
          color: #94a3b8;
          margin: 0;
        }
        .checkin-time {
          color: #4bb4e6;
          font-weight: 700;
        }
        .att-note-teacher, .att-note-class {
          font-size: 0.75rem;
          margin: 0;
          line-height: 1.4;
          display: flex;
          align-items: flex-start;
          gap: 0.3rem;
        }
        .att-note-teacher i { color: #f59e0b; margin-top: 0.15rem; }
        .att-note-class i { color: #4bb4e6; margin-top: 0.15rem; }
        .att-note-teacher span, .att-note-class span {
          color: #cbd5e1;
        }

        /* Textbook & Gifts List */
        .inventory-logs-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .inventory-log-card {
          background-color: #1e293b;
          border-radius: 12px;
          border: 1px solid #334155;
          padding: 1rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }
        .log-icon-type {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background-color: rgba(255, 202, 41, 0.1);
          color: #FFCA29;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
        }
        .log-body {
          flex-grow: 1;
        }
        .log-header-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }
        .log-header-info h4 {
          font-size: 0.9rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
          line-height: 1.2;
        }
        .log-category-badge {
          background-color: #334155;
          color: #cbd5e1;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.15rem 0.45rem;
          border-radius: 12px;
        }
        .log-detail-rows {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .log-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #94a3b8;
        }
        .log-row strong {
          color: #e2e8f0;
        }
        .log-notes {
          font-size: 0.75rem;
          color: #FFCA29;
          background-color: rgba(255, 202, 41, 0.05);
          padding: 0.4rem 0.6rem;
          border-radius: 6px;
          margin-top: 0.4rem;
          border: 1px solid rgba(255, 202, 41, 0.1);
        }

        /* Animations */
        .animated-fade {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Floating Zalo Button */
        .floating-zalo-btn {
          position: fixed;
          bottom: 25px;
          right: 25px;
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          z-index: 9999;
          animation: bounceZalo 2s infinite ease-in-out;
        }
        
        .zalo-icon-wrapper {
          width: 55px;
          height: 55px;
          background-color: #0068FF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 104, 255, 0.4);
          transition: transform 0.3s ease;
        }
        
        .floating-zalo-btn:hover .zalo-icon-wrapper {
          transform: scale(1.1);
        }
        
        .zalo-icon-wrapper img {
          width: 35px;
          height: 35px;
          object-fit: contain;
        }
        
        .zalo-tooltip {
          background-color: #0068FF;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(0, 104, 255, 0.3);
          white-space: nowrap;
          pointer-events: none;
        }

        @keyframes bounceZalo {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @media (max-width: 600px) {
          .floating-zalo-btn {
            bottom: 20px;
            right: 20px;
          }
          .zalo-tooltip {
            display: none; /* Hide text on small screens to save space */
          }
        }
      `}</style>
    </div>
  );
}
