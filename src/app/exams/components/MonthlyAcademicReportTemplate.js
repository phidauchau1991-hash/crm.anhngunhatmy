import React, { forwardRef } from 'react';

const MonthlyAcademicReportTemplate = forwardRef(({ data }, ref) => {
  if (!data) return null;

  const { studentName, monthYear, className, stats, aiComment, diaries } = data;
  const { present = 0, absent = 0, missingWb = 0, missingVideo = 0 } = stats || {};

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const StatBox = ({ label, value, color, bg }) => (
    <div style={{ flex: 1, padding: '16px 12px', background: bg, borderRadius: '12px', border: `1px solid ${color}40`, textAlign: 'center' }}>
      <div style={{ fontSize: '13px', color: color, fontWeight: '700', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: '800', color: '#111827' }}>{value}</div>
    </div>
  );

  return (
    <div ref={ref} id="monthly-academic-report-template" style={{ width: '800px', backgroundColor: '#ffffff', padding: '0', fontFamily: 'Arial, sans-serif', position: 'relative', overflow: 'hidden', fontVariantLigatures: 'none', letterSpacing: 'normal' }}>
      
      {/* HEADER BANNER */}
      <div style={{ background: '#0D88C4', padding: '30px 40px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <img src="/logo.png" alt="Logo" crossOrigin="anonymous" style={{ width: '80px', height: '80px', objectFit: 'contain', background: 'white', padding: '5px', borderRadius: '50%' }} />
        <div style={{ color: 'white' }}>
          <h1 style={{ margin: '0 0 5px 0', fontSize: '26px', fontWeight: '800', letterSpacing: '1px' }}>PHIẾU BÁO CÁO HỌC TẬP THÁNG</h1>
          <div style={{ fontSize: '16px', opacity: 0.9 }}>Tháng {monthYear} | Hệ thống Đào tạo Nhật Mỹ</div>
        </div>
      </div>

      {/* STUDENT INFO CARD */}
      <div style={{ margin: '30px 40px', padding: '20px 25px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Học viên</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>{studentName}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Lớp học</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>{className}</div>
        </div>
      </div>

      {/* SECTION 1: STATS */}
      <div style={{ padding: '0 40px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: '#0D88C4', color: 'white', borderRadius: '6px', fontSize: '15px' }}>1</span>
          Thống kê Chuyên cần & Bài tập
        </h2>
        <div style={{ display: 'flex', gap: '15px' }}>
          <StatBox label="ĐI HỌC" value={`${present} buổi`} color="#16a34a" bg="#f0fdf4" />
          <StatBox label="VẮNG" value={`${absent} buổi`} color="#dc2626" bg="#fef2f2" />
          <StatBox label="THIẾU WORKBOOK" value={`${missingWb} lần`} color="#d97706" bg="#fffbeb" />
          <StatBox label="THIẾU VIDEO" value={`${missingVideo} lần`} color="#7c3aed" bg="#f5f3ff" />
        </div>
      </div>

      {/* SECTION 2: AI COMMENT */}
      <div style={{ padding: '0 40px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: '#0D88C4', color: 'white', borderRadius: '6px', fontSize: '15px' }}>2</span>
          Nhận xét của Giáo viên
        </h2>
        <div style={{ padding: '20px', background: '#f0f9ff', borderLeft: '4px solid #0D88C4', borderRadius: '8px', fontSize: '16px', lineHeight: '1.7', color: '#334155', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>
          {aiComment || 'Chưa có nhận xét cho tháng này.'}
        </div>
      </div>

      {/* SECTION 3: DIARIES */}
      <div style={{ padding: '0 40px', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: '#0D88C4', color: 'white', borderRadius: '6px', fontSize: '15px' }}>3</span>
          Nhật ký giảng dạy của lớp
        </h2>
        {!diaries || diaries.length === 0 ? (
          <div style={{ padding: '20px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', fontSize: '15px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
            Không có ghi chép nhật ký giảng dạy trong tháng này.
          </div>
        ) : (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            {diaries.map((d, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '20px', padding: '15px 20px', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderTop: idx === 0 ? 'none' : '1px solid #f1f5f9' }}>
                <div style={{ flexShrink: 0, width: '90px', fontSize: '14px', fontWeight: '700', color: '#0D88C4', paddingTop: '2px' }}>
                  {formatDate(d.date)}
                </div>
                <div style={{ flex: 1, fontSize: '15px', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' }}>
                  {d.classNotes}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ padding: '20px 40px 30px', borderTop: '2px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '450px', lineHeight: '1.6' }}>
          Phiếu báo cáo được xuất tự động từ Hệ thống Quản trị Trung tâm Anh ngữ Nhật Mỹ.<br/>Mọi thắc mắc phụ huynh vui lòng liên hệ trực tiếp Giáo viên chủ nhiệm.
        </div>
        <div style={{ textAlign: 'center', minWidth: '200px' }}>
          <div style={{ fontSize: '15px', color: '#64748b', fontWeight: 'bold', marginBottom: '60px' }}>Giáo viên chủ nhiệm</div>
          <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px', fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
            (Ký và ghi rõ họ tên)
          </div>
        </div>
      </div>

    </div>
  );
});

MonthlyAcademicReportTemplate.displayName = 'MonthlyAcademicReportTemplate';
export default MonthlyAcademicReportTemplate;
