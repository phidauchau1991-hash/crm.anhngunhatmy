'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ClassPortalPage() {
  const params = useParams();
  const router = useRouter();
  const [classCode, setClassCode] = useState('');
  const [activeTab, setActiveTab] = useState('attendance'); 
  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState(null);

  const fetchPortalData = async (code) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/classes/${encodeURIComponent(code)}/portal`);
      const json = await res.json();
      if (json.success) {
        setPortalData(json.data);
      } else {
        alert(json.error || 'Lỗi tải dữ liệu');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params?.code) {
      const code = decodeURIComponent(params.code);
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setClassCode(code);
      fetchPortalData(code);
    }
  }, [params]);

  if (loading) {
    return <div className="page-container" style={{ textAlign: 'center', padding: '3rem' }}>Đang tải Sổ Đầu Bài...</div>;
  }

  if (!portalData) {
    return <div className="page-container" style={{ textAlign: 'center', padding: '3rem' }}>Không có dữ liệu!</div>;
  }

  const { classInfo, students, sessions, matrix, grades } = portalData;

  // Render Functions for Matrix Cells
  const renderAttendanceCell = (studentId, dateIso) => {
    const record = matrix[studentId]?.[dateIso];
    if (!record) return <td key={dateIso} className="text-center">-</td>;
    
    let label = 'x';
    let bg = 'transparent';
    let color = 'var(--color-success)';

    if (record.status.includes('Vắng')) {
      label = 'v';
      bg = '#fee2e2'; // red-100
      color = '#ef4444'; // red-500
    }

    return (
      <td key={dateIso} className="text-center" style={{ backgroundColor: bg, color: color, fontWeight: 'bold' }} title={record.teacherNotes}>
        {label}
      </td>
    );
  };

  const renderViolationCell = (studentId, dateIso) => {
    const record = matrix[studentId]?.[dateIso];
    if (!record) return <td key={dateIso} className="text-center">-</td>;
    
    const issues = [];
    if (record.missingWb) issues.push('[WB]');
    if (record.missingVideo) issues.push('[VD]');
    if (record.copyError) issues.push('[CP]');

    if (issues.length === 0) return <td key={dateIso} className="text-center"></td>;

    return (
      <td key={dateIso} className="text-center" style={{ backgroundColor: '#fef3c7', color: '#d97706', fontSize: '0.8rem', fontWeight: 'bold' }}>
        {issues.join(' ')}
      </td>
    );
  };

  const formatDateShort = (isoString) => {
    const d = new Date(isoString);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const formatDateFull = (isoString) => {
    if (!isoString) return 'Chưa xác định';
    const d = new Date(isoString);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div className="page-container" style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div className="dashboard-header glass-panel" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button className="back-btn" onClick={() => router.push('/classes')}>
            <i className="fa-solid fa-arrow-left"></i> Quay lại danh sách lớp
          </button>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: 0 }}>
            <i className="fa-solid fa-chalkboard-user" style={{ color: 'var(--color-primary, #facc15)' }}></i>
            Sổ Đầu Bài: <span style={{ color: 'var(--color-primary-dark, #ca8a04)' }}>{classCode}</span>
          </h1>
          <p className="page-subtitle" style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            <i className="fa-solid fa-user-tie" style={{marginRight: '5px'}}></i> 
            Giáo viên: <strong>{classInfo?.teacher?.fullName || 'Chưa phân công'}</strong>
            <span style={{margin: '0 10px'}}>|</span>
            <i className="fa-regular fa-calendar" style={{marginRight: '5px'}}></i> 
            Ngày bắt đầu: <strong>{formatDateFull(classInfo?.startDate)}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-action btn-primary" onClick={() => router.push(`/attendance?classCode=${classCode}`)}>
            <i className="fa-solid fa-calendar-check"></i> Điểm danh hôm nay
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="tabs-container">
        <button className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
          <i className="fa-solid fa-list-check"></i> Điểm danh
        </button>
        <button className={`tab-btn ${activeTab === 'violations' ? 'active' : ''}`} onClick={() => setActiveTab('violations')}>
          <i className="fa-solid fa-triangle-exclamation"></i> Bài tập & Vi phạm
        </button>
        <button className={`tab-btn ${activeTab === 'grades' ? 'active' : ''}`} onClick={() => setActiveTab('grades')}>
          <i className="fa-solid fa-star"></i> Bảng điểm
        </button>
        <button className={`tab-btn ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>
          <i className="fa-solid fa-book-open-reader"></i> Nhật ký Giảng dạy
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        
        {activeTab === 'attendance' && (
          <div>
            <h2 style={{ color: '#1e293b', marginBottom: '1rem' }}><i className="fa-solid fa-list-check"></i> Ma trận Điểm danh</h2>
            <table className="custom-table" style={{ whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, zIndex: 2, background: '#f8fafc' }}>Tên Học Sinh</th>
                  <th className="text-center" style={{ background: '#f1f5f9' }}>Số Buổi Vắng</th>
                  {sessions.map((session, idx) => (
                    <th key={session.id} className="text-center">
                      Buổi {idx + 1}<br/>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>({formatDateShort(session.date)})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="table-row">
                    <td style={{ position: 'sticky', left: 0, zIndex: 1, background: 'white', fontWeight: 'bold' }}>
                      {student.name} {student.isTrial && <span className="badge" style={{fontSize:'0.7rem', background:'#fef08a'}}>Học thử</span>}
                    </td>
                    <td className="text-center" style={{ fontWeight: 'bold', color: student.totalAbsent > 0 ? '#ef4444' : 'inherit' }}>
                      {student.totalAbsent}
                    </td>
                    {sessions.map(session => renderAttendanceCell(student.id, session.date))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'violations' && (
          <div>
            <h2 style={{ color: '#1e293b', marginBottom: '1rem' }}><i className="fa-solid fa-triangle-exclamation"></i> Thống kê Bài tập & Vi phạm</h2>
            <table className="custom-table" style={{ whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, zIndex: 2, background: '#f8fafc' }}>Tên Học Sinh</th>
                  <th className="text-center" style={{ background: '#fef3c7', color: '#d97706' }}>Tổng Thiếu WB</th>
                  <th className="text-center" style={{ background: '#ffedd5', color: '#ea580c' }}>Tổng Thiếu Video</th>
                  {sessions.map((session, idx) => (
                    <th key={session.id} className="text-center">Buổi {idx + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="table-row">
                    <td style={{ position: 'sticky', left: 0, zIndex: 1, background: 'white', fontWeight: 'bold' }}>
                      {student.name}
                    </td>
                    <td className="text-center" style={{ fontWeight: 'bold', color: student.totalWb > 0 ? '#d97706' : 'inherit' }}>
                      {student.totalWb}
                    </td>
                    <td className="text-center" style={{ fontWeight: 'bold', color: student.totalVideo > 0 ? '#ea580c' : 'inherit' }}>
                      {student.totalVideo}
                    </td>
                    {sessions.map(session => renderViolationCell(student.id, session.date))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'grades' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ color: '#1e293b', margin: 0 }}><i className="fa-solid fa-star"></i> Bảng điểm</h2>
            </div>
            <table className="custom-table" style={{ whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <th rowSpan="2" style={{ position: 'sticky', left: 0, zIndex: 2, background: '#f8fafc', borderRight: '1px solid #e2e8f0' }}>Tên Học Sinh</th>
                  <th colSpan="6" className="text-center" style={{ background: '#f0fdf4', borderRight: '1px solid #e2e8f0' }}>ĐÁNH GIÁ GIỮA KHÓA</th>
                  <th colSpan="6" className="text-center" style={{ background: '#e0f2fe' }}>ĐÁNH GIÁ CUỐI KHÓA</th>
                </tr>
                <tr>
                  <th className="text-center" style={{ background: '#f8fafc' }}>Quá trình</th>
                  <th className="text-center" style={{ background: '#f8fafc' }}>Nói</th>
                  <th className="text-center" style={{ background: '#f8fafc' }}>Nghe</th>
                  <th className="text-center" style={{ background: '#f8fafc' }}>Đọc Viết</th>
                  <th className="text-center" style={{ background: '#f8fafc', fontWeight: 'bold' }}>Tổng Điểm</th>
                  <th className="text-center" style={{ background: '#f8fafc', fontWeight: 'bold', borderRight: '1px solid #e2e8f0' }}>Xếp loại</th>
                  
                  <th className="text-center" style={{ background: '#f8fafc' }}>Quá trình</th>
                  <th className="text-center" style={{ background: '#f8fafc' }}>Nói</th>
                  <th className="text-center" style={{ background: '#f8fafc' }}>Nghe</th>
                  <th className="text-center" style={{ background: '#f8fafc' }}>Đọc Viết</th>
                  <th className="text-center" style={{ background: '#f8fafc', fontWeight: 'bold' }}>Tổng Điểm</th>
                  <th className="text-center" style={{ background: '#f8fafc', fontWeight: 'bold' }}>Xếp loại</th>
                </tr>
              </thead>
              <tbody>
                {grades?.map((g) => {
                  return (
                    <tr key={g.id} className="table-row">
                      <td style={{ position: 'sticky', left: 0, zIndex: 1, background: 'white', fontWeight: 'bold', borderRight: '1px solid #e2e8f0' }}>{g.name}</td>
                      <td className="text-center">{g.midTerm?.processTotal ?? '-'}</td>
                      <td className="text-center">{g.midTerm?.speakingScore ?? '-'}</td>
                      <td className="text-center">{g.midTerm?.listeningScore ?? '-'}</td>
                      <td className="text-center">{g.midTerm?.rwScore ?? '-'}</td>
                      <td className="text-center" style={{ fontWeight: 'bold', color: '#ef4444' }}>{g.midTerm?.totalScore ?? '-'}</td>
                      <td className="text-center" style={{ fontWeight: 'bold', color: '#3b82f6', borderRight: '1px solid #e2e8f0' }}>{g.midTerm?.grade ?? '-'}</td>
                      
                      <td className="text-center">{g.finalTerm?.processTotal ?? '-'}</td>
                      <td className="text-center">{g.finalTerm?.speakingScore ?? '-'}</td>
                      <td className="text-center">{g.finalTerm?.listeningScore ?? '-'}</td>
                      <td className="text-center">{g.finalTerm?.rwScore ?? '-'}</td>
                      <td className="text-center" style={{ fontWeight: 'bold', color: '#ef4444' }}>{g.finalTerm?.totalScore ?? '-'}</td>
                      <td className="text-center" style={{ fontWeight: 'bold', color: '#3b82f6' }}>{g.finalTerm?.grade ?? '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'log' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ color: '#1e293b', margin: 0 }}><i className="fa-solid fa-book-open-reader"></i> Nhật ký Giảng dạy</h2>
              <button className="btn-action btn-secondary" onClick={() => window.print()}>
                <i className="fa-solid fa-print"></i> Xuất File PDF / In Sổ
              </button>
            </div>
            
            <table className="custom-table print-friendly">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Ngày Học</th>
                  <th style={{ width: '60px' }}>Buổi</th>
                  <th>Từ Vựng / Hoạt Động</th>
                  <th>Cấu Trúc Ngữ Pháp</th>
                  <th>BTVN Giao Mới</th>
                  <th>Nhận Xét Lớp</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, idx) => (
                  <tr key={session.id} className="table-row">
                    <td style={{ fontWeight: 'bold' }}>{formatDateShort(session.date)}</td>
                    <td className="text-center">{idx + 1}</td>
                    <td>{session.vocabularyTopic || '-'}</td>
                    <td>{session.grammarTopic || '-'}</td>
                    <td>
                      {session.hwWbPages && <div>• WB: {session.hwWbPages}</div>}
                      {session.hwCopyLines && <div>• Copy: {session.hwCopyLines}</div>}
                      {session.hwVideoDeadline && <div>• Video: {session.hwVideoDeadline}</div>}
                    </td>
                    <td style={{ fontStyle: 'italic', color: '#475569' }}>{session.classNotes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      <style jsx>{`
        .text-center { text-align: center; }
        .custom-table { width: 100%; border-collapse: collapse; }
        .custom-table th, .custom-table td { padding: 0.75rem; border: 1px solid #e2e8f0; }
        .table-row:hover td { background-color: #f8fafc; }
        
        .btn-action {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.95rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary { background: var(--color-primary, #facc15); color: #0f172a; box-shadow: 0 4px 6px -1px rgba(234, 179, 8, 0.2); }
        .btn-primary:hover { filter: brightness(0.95); transform: translateY(-1px); }
        .btn-secondary { background: #e2e8f0; color: #1e293b; }
        .btn-secondary:hover { background: #cbd5e1; }
        
        .back-btn {
          background: none; border: none; color: #64748b; cursor: pointer; 
          margin-bottom: 0.8rem; display: inline-flex; align-items: center; gap: 0.5rem; 
          font-size: 0.95rem; font-weight: 500; transition: color 0.2s; padding: 0;
        }
        .back-btn:hover { color: #0f172a; }

        .tabs-container {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem;
          background: #f1f5f9;
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .tab-btn {
          flex: 1;
          padding: 0.8rem 1rem;
          background: transparent;
          border: none;
          border-radius: 0.5rem;
          color: #64748b;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .tab-btn:hover { background: #e2e8f0; color: #1e293b; }
        .tab-btn.active { 
          color: #0f172a; 
          background: var(--color-primary, #facc15); 
          box-shadow: 0 4px 6px -1px rgba(234, 179, 8, 0.3);
        }
        
        @media print {
          .dashboard-header, .tabs-container, .btn-secondary { display: none !important; }
          .page-container { padding: 0; background: white; }
          .glass-panel { box-shadow: none; border: none; }
          .print-friendly { width: 100%; }
        }
      `}</style>
    </div>
  );
}
