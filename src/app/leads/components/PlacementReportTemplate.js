import React, { forwardRef } from 'react';

const PlacementReportTemplate = forwardRef(({ studentName, testDate, scores, aiResult }, ref) => {
  // Base safe font - fix html2canvas Vietnamese duplicate char bug
  const safeFont = "Arial, Helvetica, sans-serif";

  // Base text style to prevent html2canvas duplication
  const baseText = {
    fontFamily: safeFont,
    letterSpacing: '0px',
    textRendering: 'geometricPrecision',
    WebkitFontSmoothing: 'antialiased',
    fontVariant: 'normal',
  };

  // Weighted score calculation
  const lsWeight   = Number(scores.listening.weight  || 30);
  const spWeight   = Number(scores.speaking.weight   || 30);
  const rwWeight   = Number(scores.rw.weight         || 40);

  const getContrib = (score, max, weight) => {
    if (!max || max <= 0) return 0;
    return Math.round((Number(score) / Number(max)) * weight * 100) / 100;
  };

  const getSkillPct = (score, max) => {
    if (!max || max <= 0) return 0;
    return Math.round((Number(score) / Number(max)) * 100);
  };

  const lsPct   = getSkillPct(scores.listening.score, scores.listening.max);
  const spPct   = getSkillPct(scores.speaking.score,  scores.speaking.max);
  const rwPct   = getSkillPct(scores.rw.score,        scores.rw.max);

  const lsContrib = getContrib(scores.listening.score, scores.listening.max, lsWeight);
  const spContrib = getContrib(scores.speaking.score,  scores.speaking.max,  spWeight);
  const rwContrib = getContrib(scores.rw.score,        scores.rw.max,        rwWeight);

  const totalContrib = Math.round((lsContrib + spContrib + rwContrib) * 100) / 100;
  const totalWeight  = lsWeight + spWeight + rwWeight;

  const getEval = (pct) => {
    if (pct >= 85) return 'Xuất sắc';
    if (pct >= 70) return 'Khá - Tốt';
    if (pct >= 50) return 'Trung bình';
    return 'Cần cố gắng';
  };

  const thStyle = {
    ...baseText,
    padding: '9px 12px',
    border: '1px solid #93c5fd',
    fontSize: '12px',
    fontWeight: '700',
    color: '#fff',
    whiteSpace: 'nowrap',
  };

  const tdStyle = {
    ...baseText,
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    fontSize: '12px',
  };

  return (
    <div
      ref={ref}
      style={{
        ...baseText,
        width: '800px',
        background: '#ffffff',
        boxSizing: 'border-box',
        padding: '32px 38px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #0d88c4', paddingBottom: '16px', marginBottom: '0' }}>
        <img src="/logo.png" alt="Logo" style={{ height: '56px', objectFit: 'contain' }} crossOrigin="anonymous" />
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...baseText, color: '#0d88c4', fontSize: '20px', textTransform: 'uppercase', fontWeight: '800' }}>
            KET QUA DANH GIA NANG LUC
          </div>
          <div style={{ ...baseText, fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
            Placement Test Report
          </div>
        </div>
      </div>

      {/* Student Info */}
      <div style={{ textAlign: 'center', padding: '16px 0 18px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ ...baseText, fontSize: '24px', color: '#0f172a', fontWeight: '700', textTransform: 'uppercase' }}>
          {studentName || 'Ho va Ten Hoc Vien'}
        </div>
        {testDate && (
          <div style={{ ...baseText, fontSize: '12px', color: '#64748b', marginTop: '5px' }}>
            Ngay danh gia: {testDate}
          </div>
        )}
      </div>

      {/* Scores Table */}
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <div style={{ ...baseText, color: '#0d88c4', fontSize: '13px', textTransform: 'uppercase', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ display: 'inline-block', width: '5px', height: '14px', background: '#0ea5e9', borderRadius: '3px', flexShrink: 0 }}></span>
          Bang Diem Danh Gia (Score Breakdown)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0d88c4' }}>
              <th style={{ ...thStyle, textAlign: 'left', width: '30%' }}>Ky nang (Skill)</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Diem dat / Toi da</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Ty le % ky nang</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Trong so</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Diem dong gop</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...tdStyle, fontWeight: '600' }}>Nghe (Listening)</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600' }}>{scores.listening.score || 0} / {scores.listening.max || 0}</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '700', color: '#0284c7' }}>{lsPct}%</td>
              <td style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>{lsWeight}%</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '700' }}>{lsContrib}</td>
            </tr>
            <tr style={{ background: '#f8fafc' }}>
              <td style={{ ...tdStyle, fontWeight: '600' }}>Noi (Speaking)</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600' }}>{scores.speaking.score || 0} / {scores.speaking.max || 0}</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '700', color: '#0284c7' }}>{spPct}%</td>
              <td style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>{spWeight}%</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '700' }}>{spContrib}</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: '600' }}>Doc &amp; Viet (Reading &amp; Writing)</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600' }}>{scores.rw.score || 0} / {scores.rw.max || 0}</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '700', color: '#0284c7' }}>{rwPct}%</td>
              <td style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>{rwWeight}%</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '700' }}>{rwContrib}</td>
            </tr>
            <tr style={{ background: '#dbeafe' }}>
              <td style={{ ...tdStyle, fontWeight: '800', color: '#1e40af', fontSize: '13px' }}>TONG KET (OVERALL)</td>
              <td style={{ ...tdStyle, textAlign: 'center', color: '#64748b', fontSize: '11px' }}>—</td>
              <td style={{ ...tdStyle, textAlign: 'center', color: '#64748b', fontSize: '11px' }}>—</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '800', color: '#1e40af' }}>{totalWeight}%</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '800', color: '#1e40af', fontSize: '15px' }}>{totalContrib} / 100</td>
            </tr>
          </tbody>
        </table>
        <div style={{ ...baseText, fontSize: '11px', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>
          * Diem dong gop = Ty le ky nang x Trong so (tong {totalWeight}% = 100 diem)
        </div>
      </div>

      {/* AI Remarks */}
      <div>
        <div style={{ ...baseText, color: '#0d88c4', fontSize: '13px', textTransform: 'uppercase', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ display: 'inline-block', width: '5px', height: '14px', background: '#0ea5e9', borderRadius: '3px', flexShrink: 0 }}></span>
          Nhan Xet Tu Giao Vien (Teacher's Remarks)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ background: '#eff6ff', padding: '12px 14px', borderRadius: '7px', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ ...baseText, marginBottom: '5px', color: '#1d4ed8', fontSize: '12px', fontWeight: '700' }}>Nghe &amp; Noi (Listening &amp; Speaking)</div>
            <div style={{ ...baseText, color: '#334155', fontSize: '12px', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{aiResult?.ls_comments || '- Giao vien dang cap nhat nhan xet...'}</div>
          </div>

          <div style={{ background: '#fffbeb', padding: '12px 14px', borderRadius: '7px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ ...baseText, marginBottom: '5px', color: '#b45309', fontSize: '12px', fontWeight: '700' }}>Doc &amp; Viet (Reading &amp; Writing)</div>
            <div style={{ ...baseText, color: '#334155', fontSize: '12px', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{aiResult?.rw_comments || '- Giao vien dang cap nhat nhan xet...'}</div>
          </div>

          <div style={{ background: '#f0fdf4', padding: '12px 14px', borderRadius: '7px', borderLeft: '4px solid #22c55e' }}>
            <div style={{ ...baseText, marginBottom: '5px', color: '#15803d', fontSize: '12px', fontWeight: '700' }}>Danh Gia Chung &amp; Lo Trinh (Conclusion &amp; Roadmap)</div>
            <div style={{ ...baseText, color: '#166534', fontSize: '12px', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{aiResult?.conclusion || 'Trung tam Anh ngu Nhat My se lien he phu huynh de tu van lo trinh phu hop nhat cho be.'}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ ...baseText, marginTop: '24px', textAlign: 'right', fontSize: '12px', color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
        <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>Giao vien Danh gia</div>
        <div style={{ marginTop: '2px', color: '#0d88c4', fontWeight: '600' }}>Trung tam Anh ngu Nhat My</div>
      </div>
    </div>
  );
});

PlacementReportTemplate.displayName = 'PlacementReportTemplate';
export default PlacementReportTemplate;
