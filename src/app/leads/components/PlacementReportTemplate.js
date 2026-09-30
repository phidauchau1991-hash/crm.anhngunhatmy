import React, { forwardRef } from 'react';

const PlacementReportTemplate = forwardRef(({ studentName, testDate, scores, aiResult }, ref) => {
  // Helpers
  const getPercentage = (score, max) => {
    if (!max || max <= 0) return 0;
    return Math.round((Number(score) / Number(max)) * 100);
  };

  const getEvaluation = (percent) => {
    if (percent >= 85) return 'Xuất sắc';
    if (percent >= 70) return 'Khá - Tốt';
    if (percent >= 50) return 'Trung bình';
    return 'Cần cố gắng';
  };

  const lsPercent = getPercentage(scores.listening.score, scores.listening.max);
  const spPercent = getPercentage(scores.speaking.score, scores.speaking.max);
  const rwPercent = getPercentage(scores.rw.score, scores.rw.max);

  const totalScore = Number(scores.listening.score || 0) + Number(scores.speaking.score || 0) + Number(scores.rw.score || 0);
  const totalMax = Number(scores.listening.max || 0) + Number(scores.speaking.max || 0) + Number(scores.rw.max || 0);
  const totalPercent = getPercentage(totalScore, totalMax);

  return (
    <div
      ref={ref}
      style={{
        
        width: '800px',
        background: '#ffffff',
        fontFamily: "'Inter', sans-serif",
        color: '#1e293b',
        boxSizing: 'border-box',
        padding: '40px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #0d88c4', paddingBottom: '20px' }}>
        <img src="/logo.png" alt="Logo" style={{ height: '70px', objectFit: 'contain' }} crossOrigin="anonymous" />
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ color: '#0d88c4', margin: 0, fontSize: '26px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Kết Quả Đánh Giá Năng Lực
          </h1>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '15px', fontWeight: '500' }}>
            Placement Test Report
          </p>
        </div>
      </div>

      {/* Student Info */}
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', color: '#0f172a', margin: 0, textTransform: 'uppercase', fontWeight: '800' }}>
          {studentName || 'Họ và Tên Học Viên'}
        </h2>
        <p style={{ color: '#64748b', marginTop: '8px', fontSize: '16px' }}>
          Ngày đánh giá (Date): <span style={{ color: '#334155', fontWeight: '600' }}>{testDate || '...'}</span>
        </p>
      </div>

      {/* Scores Table */}
      <div style={{ marginTop: '35px' }}>
        <h3 style={{ color: '#0d88c4', margin: '0 0 15px 0', fontSize: '18px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '18px', background: '#0ea5e9', borderRadius: '4px' }}></span>
          Bảng Điểm Đánh Giá (Score Breakdown)
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}>
          <thead>
            <tr style={{ background: '#0d88c4', color: '#ffffff' }}>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #cbd5e1', fontSize: '15px' }}>Kỹ năng (Skill)</th>
              <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #cbd5e1', fontSize: '15px' }}>Điểm đạt / Tối đa</th>
              <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #cbd5e1', fontSize: '15px' }}>Tỷ lệ (%)</th>
              <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #cbd5e1', fontSize: '15px' }}>Đánh giá</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '12px', border: '1px solid #cbd5e1', fontWeight: '600' }}>Nghe (Listening)</td>
              <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: '600' }}>{scores.listening.score || 0} / {scores.listening.max || 0}</td>
              <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: '700', color: '#0284c7' }}>{lsPercent}%</td>
              <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: '600' }}>{getEvaluation(lsPercent)}</td>
            </tr>
            <tr style={{ background: '#f8fafc' }}>
              <td style={{ padding: '12px', border: '1px solid #cbd5e1', fontWeight: '600' }}>Nói (Speaking)</td>
              <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: '600' }}>{scores.speaking.score || 0} / {scores.speaking.max || 0}</td>
              <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: '700', color: '#0284c7' }}>{spPercent}%</td>
              <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: '600' }}>{getEvaluation(spPercent)}</td>
            </tr>
            <tr>
              <td style={{ padding: '12px', border: '1px solid #cbd5e1', fontWeight: '600' }}>Đọc & Viết (Reading & Writing)</td>
              <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: '600' }}>{scores.rw.score || 0} / {scores.rw.max || 0}</td>
              <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: '700', color: '#0284c7' }}>{rwPercent}%</td>
              <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: '600' }}>{getEvaluation(rwPercent)}</td>
            </tr>
            <tr style={{ background: '#e0f2fe', color: '#0369a1' }}>
              <td style={{ padding: '14px 12px', border: '1px solid #bae6fd', fontWeight: '800', fontSize: '16px' }}>TỔNG KẾT (OVERALL)</td>
              <td style={{ padding: '14px 12px', textAlign: 'center', border: '1px solid #bae6fd', fontWeight: '800', fontSize: '16px' }}>{totalScore} / {totalMax}</td>
              <td style={{ padding: '14px 12px', textAlign: 'center', border: '1px solid #bae6fd', fontWeight: '800', fontSize: '18px' }}>{totalPercent}%</td>
              <td style={{ padding: '14px 12px', textAlign: 'center', border: '1px solid #bae6fd', fontWeight: '800', fontSize: '16px' }}>{getEvaluation(totalPercent)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* AI Remarks */}
      <div style={{ marginTop: '35px' }}>
        <h3 style={{ color: '#0d88c4', margin: '0 0 15px 0', fontSize: '18px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '18px', background: '#0ea5e9', borderRadius: '4px' }}></span>
          Nhận Xét Từ Giáo Viên (Teacher's Remarks)
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* LS Comments */}
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #0ea5e9' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#0369a1', fontSize: '16px' }}>Nghe & Nói (Listening & Speaking)</h4>
            <div style={{ color: '#334155', fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
              {aiResult?.ls_comments || '- Giáo viên đang cập nhật nhận xét...'}
            </div>
          </div>

          {/* RW Comments */}
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#d97706', fontSize: '16px' }}>Đọc & Viết (Reading & Writing)</h4>
            <div style={{ color: '#334155', fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
              {aiResult?.rw_comments || '- Giáo viên đang cập nhật nhận xét...'}
            </div>
          </div>

          {/* Conclusion */}
          <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #22c55e' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#15803d', fontSize: '16px' }}>Đánh Giá Chung & Lộ Trình (Conclusion & Roadmap)</h4>
            <div style={{ color: '#166534', fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-line', fontWeight: '500' }}>
              {aiResult?.conclusion || 'Trung tâm Anh ngữ Nhật Mỹ sẽ liên hệ phụ huynh để tư vấn lộ trình phù hợp nhất cho bé.'}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '40px', textAlign: 'right', color: '#475569', fontSize: '14px' }}>
        <p style={{ margin: '0 0 5px 0' }}>Trân trọng,</p>
        <p style={{ margin: 0, fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>Giáo viên Đánh giá</p>
        <p style={{ margin: '5px 0 0 0', color: '#0d88c4', fontWeight: '600' }}>Trung tâm Anh ngữ Nhật Mỹ</p>
      </div>
    </div>
  );
});

PlacementReportTemplate.displayName = 'PlacementReportTemplate';
export default PlacementReportTemplate;
