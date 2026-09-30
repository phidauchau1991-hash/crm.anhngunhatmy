import React, { forwardRef } from 'react';

const PlacementReportTemplate = forwardRef(({ studentName, testDate, scores, aiResult }, ref) => {
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

  // Base style chống lỗi font html2canvas
  const safeFont = "Arial, 'Helvetica Neue', Helvetica, sans-serif";

  const thStyle = {
    padding: '10px 14px',
    textAlign: 'left',
    border: '1px solid #93c5fd',
    fontSize: '13px',
    fontWeight: '700',
    color: '#fff',
    fontFamily: safeFont,
    letterSpacing: '0',
  };

  const tdStyle = {
    padding: '11px 14px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    fontFamily: safeFont,
    letterSpacing: '0',
  };

  return (
    <div
      ref={ref}
      style={{
        width: '800px',
        background: '#ffffff',
        fontFamily: safeFont,
        color: '#1e293b',
        boxSizing: 'border-box',
        padding: '36px 40px',
        letterSpacing: '0',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #0d88c4', paddingBottom: '18px', marginBottom: '0' }}>
        <img src="/logo.png" alt="Logo" style={{ height: '60px', objectFit: 'contain' }} crossOrigin="anonymous" />
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#0d88c4', margin: 0, fontSize: '22px', textTransform: 'uppercase', fontWeight: '800', fontFamily: safeFont, letterSpacing: '1px' }}>
            KẾT QUẢ ĐÁNH GIÁ NĂNG LỰC
          </div>
          <div style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px', fontWeight: '500', fontFamily: safeFont, letterSpacing: '0' }}>
            Placement Test Report
          </div>
        </div>
      </div>

      {/* Student Info */}
      <div style={{ marginTop: '22px', marginBottom: '28px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '18px' }}>
        <div style={{ fontSize: '26px', color: '#0f172a', margin: 0, textTransform: 'uppercase', fontWeight: '700', fontFamily: safeFont, letterSpacing: '2px' }}>
          {studentName || 'Họ và Tên Học Viên'}
        </div>
        {testDate && (
          <div style={{ color: '#64748b', marginTop: '6px', fontSize: '13px', fontFamily: safeFont, letterSpacing: '0' }}>
            Ngày đánh giá (Date): <span style={{ color: '#334155', fontWeight: '600' }}>{testDate}</span>
          </div>
        )}
      </div>

      {/* Scores Table */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ color: '#0d88c4', marginBottom: '10px', fontSize: '15px', textTransform: 'uppercase', fontWeight: '700', fontFamily: safeFont, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '16px', background: '#0ea5e9', borderRadius: '3px', flexShrink: 0 }}></span>
          Bảng Điểm Đánh Giá (Score Breakdown)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0d88c4' }}>
              <th style={{ ...thStyle, textAlign: 'left', width: '40%' }}>Kỹ năng (Skill)</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Điểm đạt / Tối đa</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Tỷ lệ (%)</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Đánh giá</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...tdStyle, fontWeight: '600' }}>Nghe (Listening)</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600' }}>{scores.listening.score || 0} / {scores.listening.max || 0}</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '700', color: '#0284c7' }}>{lsPercent}%</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{getEvaluation(lsPercent)}</td>
            </tr>
            <tr style={{ background: '#f8fafc' }}>
              <td style={{ ...tdStyle, fontWeight: '600' }}>Nói (Speaking)</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600' }}>{scores.speaking.score || 0} / {scores.speaking.max || 0}</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '700', color: '#0284c7' }}>{spPercent}%</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{getEvaluation(spPercent)}</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: '600' }}>Đọc &amp; Viết (Reading &amp; Writing)</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600' }}>{scores.rw.score || 0} / {scores.rw.max || 0}</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '700', color: '#0284c7' }}>{rwPercent}%</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{getEvaluation(rwPercent)}</td>
            </tr>
            <tr style={{ background: '#dbeafe' }}>
              <td style={{ ...tdStyle, fontWeight: '800', color: '#1e40af', fontSize: '14px' }}>TỔNG KẾT (OVERALL)</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '800', color: '#1e40af', fontSize: '14px' }}>{totalScore} / {totalMax}</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '800', color: '#1e40af', fontSize: '16px' }}>{totalPercent}%</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '800', color: '#1e40af', fontSize: '14px' }}>{getEvaluation(totalPercent)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* AI Remarks */}
      <div>
        <div style={{ color: '#0d88c4', marginBottom: '12px', fontSize: '15px', textTransform: 'uppercase', fontWeight: '700', fontFamily: safeFont, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '16px', background: '#0ea5e9', borderRadius: '3px', flexShrink: 0 }}></span>
          Nhận Xét Từ Giáo Viên (Teacher's Remarks)
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#eff6ff', padding: '14px 16px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ marginBottom: '6px', color: '#1d4ed8', fontSize: '13px', fontWeight: '700', fontFamily: safeFont, letterSpacing: '0' }}>
              Nghe &amp; Nói (Listening &amp; Speaking)
            </div>
            <div style={{ color: '#334155', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-line', fontFamily: safeFont, letterSpacing: '0' }}>
              {aiResult?.ls_comments || '- Giáo viên đang cập nhật nhận xét...'}
            </div>
          </div>

          <div style={{ background: '#fffbeb', padding: '14px 16px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ marginBottom: '6px', color: '#b45309', fontSize: '13px', fontWeight: '700', fontFamily: safeFont, letterSpacing: '0' }}>
              Đọc &amp; Viết (Reading &amp; Writing)
            </div>
            <div style={{ color: '#334155', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-line', fontFamily: safeFont, letterSpacing: '0' }}>
              {aiResult?.rw_comments || '- Giáo viên đang cập nhật nhận xét...'}
            </div>
          </div>

          <div style={{ background: '#f0fdf4', padding: '14px 16px', borderRadius: '8px', borderLeft: '4px solid #22c55e' }}>
            <div style={{ marginBottom: '6px', color: '#15803d', fontSize: '13px', fontWeight: '700', fontFamily: safeFont, letterSpacing: '0' }}>
              Đánh Giá Chung &amp; Lộ Trình (Conclusion &amp; Roadmap)
            </div>
            <div style={{ color: '#166534', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-line', fontFamily: safeFont, letterSpacing: '0' }}>
              {aiResult?.conclusion || 'Trung tâm Anh ngữ Nhật Mỹ sẽ liên hệ phụ huynh để tư vấn lộ trình phù hợp nhất cho bé.'}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '28px', textAlign: 'right', color: '#475569', fontSize: '13px', fontFamily: safeFont, letterSpacing: '0', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
        <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>Giáo viên Đánh giá</div>
        <div style={{ marginTop: '3px', color: '#0d88c4', fontWeight: '600' }}>Trung tâm Anh ngữ Nhật Mỹ</div>
      </div>
    </div>
  );
});

PlacementReportTemplate.displayName = 'PlacementReportTemplate';
export default PlacementReportTemplate;
