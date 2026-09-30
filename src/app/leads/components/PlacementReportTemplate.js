import React, { forwardRef } from 'react';

const PlacementReportTemplate = forwardRef(({ studentName, testDate, scores, aiResult }, ref) => {
  // Weighted score calculation
  const lsWeight = Number(scores?.listening?.weight || 30);
  const spWeight = Number(scores?.speaking?.weight  || 30);
  const rwWeight = Number(scores?.rw?.weight        || 40);

  const getContrib = (score, max, weight) => {
    if (!max || max <= 0) return 0;
    return Math.round((Number(score) / Number(max)) * weight * 100) / 100;
  };

  const getSkillPct = (score, max) => {
    if (!max || max <= 0) return 0;
    return Math.round((Number(score) / Number(max)) * 100);
  };

  const lsPct     = getSkillPct(scores?.listening?.score, scores?.listening?.max);
  const spPct     = getSkillPct(scores?.speaking?.score,  scores?.speaking?.max);
  const rwPct     = getSkillPct(scores?.rw?.score,        scores?.rw?.max);
  const lsContrib = getContrib(scores?.listening?.score, scores?.listening?.max, lsWeight);
  const spContrib = getContrib(scores?.speaking?.score,  scores?.speaking?.max,  spWeight);
  const rwContrib = getContrib(scores?.rw?.score,        scores?.rw?.max,        rwWeight);
  const totalContrib = Math.round((lsContrib + spContrib + rwContrib) * 100) / 100;
  const totalWeight  = lsWeight + spWeight + rwWeight;

  const getEval = (pct) => {
    if (pct >= 85) return 'Xuất sắc';
    if (pct >= 70) return 'Khá - Tốt';
    if (pct >= 50) return 'Trung bình';
    return 'Cần cố gắng';
  };

  const font = "Arial, Helvetica, sans-serif";

  return (
    <div
      ref={ref}
      id="placement-report-capture"
      style={{
        width: '800px',
        background: '#ffffff',
        fontFamily: font,
        color: '#1e293b',
        boxSizing: 'border-box',
        padding: '32px 38px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #0d88c4', paddingBottom: '16px' }}>
        <img src="/logo.png" alt="Logo" style={{ height: '56px', objectFit: 'contain' }} crossOrigin="anonymous" />
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#0d88c4', fontSize: '20px', textTransform: 'uppercase', fontWeight: '800', fontFamily: font }}>
            Kết Quả Đánh Giá Năng Lực
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', fontFamily: font }}>
            Placement Test Report
          </div>
        </div>
      </div>

      {/* Student Info */}
      <div style={{ textAlign: 'center', padding: '16px 0 18px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '24px', color: '#0f172a', fontWeight: '700', textTransform: 'uppercase', fontFamily: font }}>
          {studentName || 'Họ và Tên Học Viên'}
        </div>
        {testDate && (
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px', fontFamily: font }}>
            Ngày đánh giá: {testDate}
          </div>
        )}
      </div>

      {/* Scores Table */}
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <div style={{ color: '#0d88c4', fontSize: '13px', textTransform: 'uppercase', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '7px', fontFamily: font }}>
          <span style={{ display: 'inline-block', width: '5px', height: '14px', background: '#0ea5e9', borderRadius: '3px', flexShrink: 0 }}></span>
          Bảng Điểm Đánh Giá (Score Breakdown)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: font }}>
          <thead>
            <tr style={{ background: '#0d88c4' }}>
              {['Kỹ năng (Skill)', 'Điểm đạt / Tối đa', 'Tỷ lệ % kỹ năng', 'Trọng số', 'Điểm đóng góp'].map((h, i) => (
                <th key={i} style={{ padding: '9px 12px', border: '1px solid #93c5fd', fontSize: '12px', fontWeight: '700', color: '#fff', textAlign: i === 0 ? 'left' : 'center', fontFamily: font }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600', fontFamily: font }}>Nghe (Listening)</td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', fontWeight: '600', fontFamily: font }}>{scores?.listening?.score || 0} / {scores?.listening?.max || 0}</td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', fontWeight: '700', color: '#0284c7', fontFamily: font }}>{lsPct}%</td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', color: '#6b7280', fontFamily: font }}>{lsWeight}%</td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', fontWeight: '700', fontFamily: font }}>{lsContrib}</td>
            </tr>
            <tr style={{ background: '#f8fafc' }}>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600', fontFamily: font }}>Nói (Speaking)</td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', fontWeight: '600', fontFamily: font }}>{scores?.speaking?.score || 0} / {scores?.speaking?.max || 0}</td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', fontWeight: '700', color: '#0284c7', fontFamily: font }}>{spPct}%</td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', color: '#6b7280', fontFamily: font }}>{spWeight}%</td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', fontWeight: '700', fontFamily: font }}>{spContrib}</td>
            </tr>
            <tr>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600', fontFamily: font }}>Đọc &amp; Viết (Reading &amp; Writing)</td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', fontWeight: '600', fontFamily: font }}>{scores?.rw?.score || 0} / {scores?.rw?.max || 0}</td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', fontWeight: '700', color: '#0284c7', fontFamily: font }}>{rwPct}%</td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', color: '#6b7280', fontFamily: font }}>{rwWeight}%</td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', fontWeight: '700', fontFamily: font }}>{rwContrib}</td>
            </tr>
            <tr style={{ background: '#dbeafe' }}>
              <td style={{ padding: '10px 12px', border: '1px solid #93c5fd', fontSize: '13px', fontWeight: '800', color: '#1e40af', fontFamily: font }}>TỔNG KẾT (OVERALL)</td>
              <td style={{ padding: '10px 12px', border: '1px solid #93c5fd', fontSize: '12px', textAlign: 'center', color: '#64748b', fontFamily: font }}>—</td>
              <td style={{ padding: '10px 12px', border: '1px solid #93c5fd', fontSize: '12px', textAlign: 'center', color: '#64748b', fontFamily: font }}>—</td>
              <td style={{ padding: '10px 12px', border: '1px solid #93c5fd', fontSize: '13px', textAlign: 'center', fontWeight: '800', color: '#1e40af', fontFamily: font }}>{totalWeight}%</td>
              <td style={{ padding: '10px 12px', border: '1px solid #93c5fd', fontSize: '15px', textAlign: 'center', fontWeight: '800', color: '#1e40af', fontFamily: font }}>{totalContrib} / 100</td>
            </tr>
          </tbody>
        </table>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '5px', fontStyle: 'italic', fontFamily: font }}>
          * Điểm đóng góp = Tỷ lệ kỹ năng × Trọng số (tổng {totalWeight}% = 100 điểm)
        </div>
      </div>

      {/* AI Remarks */}
      <div>
        <div style={{ color: '#0d88c4', fontSize: '13px', textTransform: 'uppercase', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '7px', fontFamily: font }}>
          <span style={{ display: 'inline-block', width: '5px', height: '14px', background: '#0ea5e9', borderRadius: '3px', flexShrink: 0 }}></span>
          Nhận Xét Từ Giáo Viên (Teacher's Remarks)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ background: '#eff6ff', padding: '12px 14px', borderRadius: '7px', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ marginBottom: '5px', color: '#1d4ed8', fontSize: '12px', fontWeight: '700', fontFamily: font }}>Nghe &amp; Nói (Listening &amp; Speaking)</div>
            <div style={{ color: '#334155', fontSize: '12px', lineHeight: '1.7', whiteSpace: 'pre-line', fontFamily: font }}>{aiResult?.ls_comments || '- Giáo viên đang cập nhật nhận xét...'}</div>
          </div>

          <div style={{ background: '#fffbeb', padding: '12px 14px', borderRadius: '7px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ marginBottom: '5px', color: '#b45309', fontSize: '12px', fontWeight: '700', fontFamily: font }}>Đọc &amp; Viết (Reading &amp; Writing)</div>
            <div style={{ color: '#334155', fontSize: '12px', lineHeight: '1.7', whiteSpace: 'pre-line', fontFamily: font }}>{aiResult?.rw_comments || '- Giáo viên đang cập nhật nhận xét...'}</div>
          </div>

          <div style={{ background: '#f0fdf4', padding: '12px 14px', borderRadius: '7px', borderLeft: '4px solid #22c55e' }}>
            <div style={{ marginBottom: '5px', color: '#15803d', fontSize: '12px', fontWeight: '700', fontFamily: font }}>Đánh Giá Chung &amp; Lộ Trình (Conclusion &amp; Roadmap)</div>
            <div style={{ color: '#166534', fontSize: '12px', lineHeight: '1.7', whiteSpace: 'pre-line', fontFamily: font }}>{aiResult?.conclusion || 'Trung tâm Anh ngữ Nhật Mỹ sẽ liên hệ phụ huynh để tư vấn lộ trình phù hợp nhất cho bé.'}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '24px', textAlign: 'right', fontSize: '12px', color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '12px', fontFamily: font }}>
        <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a', fontFamily: font }}>Giáo viên Đánh giá</div>
        <div style={{ marginTop: '2px', color: '#0d88c4', fontWeight: '600', fontFamily: font }}>Trung tâm Anh ngữ Nhật Mỹ</div>
      </div>
    </div>
  );
});

PlacementReportTemplate.displayName = 'PlacementReportTemplate';
export default PlacementReportTemplate;
