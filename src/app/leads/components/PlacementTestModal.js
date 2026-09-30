import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import PlacementReportTemplate from './PlacementReportTemplate';

const DEFAULT_WEIGHTS = { listening: 30, speaking: 30, rw: 40 };

export default function PlacementTestModal({ isOpen, onClose, lead }) {
  const [step, setStep] = useState(1);
  const [scores, setScores] = useState({
    listening: { score: '', max: '', weight: DEFAULT_WEIGHTS.listening },
    speaking:  { score: '', max: '', weight: DEFAULT_WEIGHTS.speaking  },
    rw:        { score: '', max: '', weight: DEFAULT_WEIGHTS.rw        },
  });
  const [testDate, setTestDate]     = useState('');
  const [lsKeywords, setLsKeywords] = useState('');
  const [rwKeywords, setRwKeywords] = useState('');
  const [devKeywords, setDevKeywords] = useState('');
  const [aiResult, setAiResult]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [downloading, setDownloading] = useState(false);
  const templateRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setScores({
        listening: { score: '', max: '', weight: DEFAULT_WEIGHTS.listening },
        speaking:  { score: '', max: '', weight: DEFAULT_WEIGHTS.speaking  },
        rw:        { score: '', max: '', weight: DEFAULT_WEIGHTS.rw        },
      });
      setLsKeywords(''); setRwKeywords(''); setDevKeywords('');
      setAiResult(null); setError('');
      setTestDate(new Date().toLocaleDateString('vi-VN'));
    }
  }, [isOpen, lead]);

  const handleScoreChange = (skill, field, value) => {
    setScores(prev => ({ ...prev, [skill]: { ...prev[skill], [field]: value } }));
  };
  const handleAIResultChange = (field, value) => setAiResult(prev => ({ ...prev, [field]: value }));

  const generateAI = async () => {
    if (!lead) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/ai/placement-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName: lead.name, lsKeywords, rwKeywords, devKeywords })
      });
      const data = await res.json();
      if (data.success) { setAiResult(data.data); setStep(2); }
      else setError(data.error || 'Lỗi khi gọi AI');
    } catch { setError('Lỗi kết nối máy chủ'); }
    setLoading(false);
  };

  const captureCanvas = async () => html2canvas(templateRef.current, {
    scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, allowTaint: false,
  });

  const handleCopyImage = async () => {
    setDownloading(true);
    try {
      const canvas = await captureCanvas();
      canvas.toBlob(async blob => {
        try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); alert('Đã copy ảnh! Dán Ctrl+V vào Zalo nhé!'); }
        catch { alert('Trình duyệt không hỗ trợ copy ảnh trực tiếp. Dùng nút Tải Ảnh.'); }
      });
    } catch { alert('Có lỗi khi tạo ảnh'); }
    setDownloading(false);
  };

  const handleDownloadImage = async () => {
    setDownloading(true);
    try {
      const canvas = await captureCanvas();
      const link = document.createElement('a');
      link.download = `KQ_Test_${lead?.name || 'HocVien'}.png`;
      link.href = canvas.toDataURL('image/png'); link.click();
    } catch { alert('Có lỗi khi tạo ảnh'); }
    setDownloading(false);
  };

  if (!isOpen) return null;

  // Live % calculations
  const getPct = (score, max) => (!max || max <= 0) ? 0 : Math.round((Number(score) / Number(max)) * 100);
  const getContrib = (score, max, weight) => (!max || max <= 0) ? 0 : Math.round((Number(score) / Number(max)) * Number(weight) * 100) / 100;

  const lsPct = getPct(scores.listening.score, scores.listening.max);
  const spPct = getPct(scores.speaking.score,  scores.speaking.max);
  const rwPct = getPct(scores.rw.score,        scores.rw.max);
  const lsContrib = getContrib(scores.listening.score, scores.listening.max, scores.listening.weight);
  const spContrib = getContrib(scores.speaking.score,  scores.speaking.max,  scores.speaking.weight);
  const rwContrib = getContrib(scores.rw.score,        scores.rw.max,        scores.rw.weight);
  const totalContrib = Math.round((lsContrib + spContrib + rwContrib) * 100) / 100;
  const totalWeight  = Number(scores.listening.weight||0) + Number(scores.speaking.weight||0) + Number(scores.rw.weight||0);

  const pctBadge = (p) => ({
    display: 'inline-block', padding: '2px 9px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', marginLeft: '6px',
    background: p >= 70 ? '#d1fae5' : p >= 50 ? '#fef3c7' : '#fee2e2',
    color:      p >= 70 ? '#065f46' : p >= 50 ? '#92400e' : '#991b1b',
  });

  const inputSm = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content glass-panel animated-scale" style={{ maxWidth: step === 2 ? '1350px' : '950px', width: '97%', maxHeight: '95vh', overflowY: 'auto', borderRadius: '16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 26px', background: 'linear-gradient(135deg, #0d88c4, #1e40af)', borderRadius: '16px 16px 0 0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '5px 10px', borderRadius: '8px' }}><i className="fa-solid fa-file-signature"></i></span>
            Báo Cáo KQ Đánh Giá Năng Lực
            {lead && <span style={{ fontSize: '0.95rem', fontWeight: '500', opacity: 0.85 }}>— {lead.name}</span>}
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '34px', height: '34px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div style={{ padding: '24px 26px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

            {/* Left: Score table */}
            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '22px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 18px 0', fontSize: '1.05rem', color: '#0d88c4', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-chart-bar"></i> Bảng Điểm Kỹ Năng
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.88rem', display: 'block', marginBottom: '5px' }}>Ngày làm bài</label>
                <input type="text" value={testDate} onChange={e => setTestDate(e.target.value)} placeholder="VD: 30/09/2026" style={inputSm} />
              </div>

              {/* Score rows */}
              {[
                { key: 'listening', label: 'Nghe (Listening)', pct: lsPct, contrib: lsContrib },
                { key: 'speaking',  label: 'Nói (Speaking)',   pct: spPct, contrib: spContrib },
                { key: 'rw',        label: 'Đọc & Viết (R&W)', pct: rwPct, contrib: rwContrib },
              ].map(({ key, label, pct, contrib }) => (
                <div key={key} style={{ marginBottom: '16px', background: '#fff', borderRadius: '10px', padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', color: '#374151', fontSize: '0.88rem' }}>{label}</span>
                    <span style={pctBadge(pct)}>{pct}%</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: '6px', alignItems: 'center' }}>
                    <input type="number" placeholder="Điểm đạt" style={{ ...inputSm, textAlign: 'center' }} value={scores[key].score} onChange={e => handleScoreChange(key, 'score', e.target.value)} />
                    <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>/</span>
                    <input type="number" placeholder="Tối đa" style={{ ...inputSm, textAlign: 'center' }} value={scores[key].max} onChange={e => handleScoreChange(key, 'max', e.target.value)} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f0f9ff', borderRadius: '8px', padding: '4px 10px', border: '1px solid #bae6fd', whiteSpace: 'nowrap' }}>
                      <input type="number" min="1" max="100" style={{ width: '40px', border: 'none', background: 'transparent', fontSize: '0.88rem', fontWeight: '700', color: '#0284c7', textAlign: 'center', outline: 'none' }} value={scores[key].weight} onChange={e => handleScoreChange(key, 'weight', e.target.value)} />
                      <span style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: '600' }}>% trọng số</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#64748b', textAlign: 'right' }}>
                    Điểm đóng góp: <strong style={{ color: '#0284c7' }}>{contrib} / {scores[key].weight}</strong>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div style={{ background: '#dbeafe', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #93c5fd' }}>
                <span style={{ fontWeight: '800', color: '#1e40af', fontSize: '0.95rem' }}>TỔNG KẾT (100 điểm)</span>
                <span style={{ fontWeight: '800', color: '#1e40af', fontSize: '1.2rem' }}>{totalContrib} / 100</span>
              </div>
            </div>

            {/* Right: AI Keywords */}
            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '22px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 18px 0', fontSize: '1.05rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-wand-magic-sparkles"></i> Từ Khóa Gợi Ý (Cho AI)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                {[
                  { label: 'Nhận xét Nghe & Nói', placeholder: 'VD: Phát âm chuẩn, nghe tốt, thiếu từ vựng, phản xạ còn chậm...', value: lsKeywords, onChange: setLsKeywords, color: '#1d4ed8', icon: 'fa-headphones' },
                  { label: 'Nhận xét Đọc & Viết',  placeholder: 'VD: Ngữ pháp khá, đọc chậm, viết sai chính tả...', value: rwKeywords,  onChange: setRwKeywords,  color: '#b45309', icon: 'fa-book-open' },
                  { label: 'Định hướng & Phát triển', placeholder: 'VD: Nên vào lớp Kids 1, tập trung kỹ năng nói...', value: devKeywords, onChange: setDevKeywords, color: '#15803d', icon: 'fa-road' },
                ].map(({ label, placeholder, value, onChange, color, icon }) => (
                  <div key={icon}>
                    <label style={{ fontWeight: '700', color, fontSize: '0.88rem', display: 'block', marginBottom: '5px' }}>
                      <i className={`fa-solid ${icon}`} style={{ marginRight: '6px' }}></i>{label}
                    </label>
                    <textarea rows={3} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
                      style={{ ...inputSm, resize: 'vertical', minHeight: '76px', lineHeight: '1.5' }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '18px', textAlign: 'right' }}>
                {error && <span style={{ color: '#ef4444', marginRight: '12px', fontSize: '0.88rem' }}>{error}</span>}
                <button onClick={generateAI} disabled={loading}
                  style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #7c3aed, #1d4ed8)', color: '#fff', padding: '11px 26px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                  <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-robot'}`}></i>
                  {loading ? 'Đang phân tích...' : 'Sinh Nhận Xét'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW */}
        {step === 2 && (
          <div style={{ padding: '18px 26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px', background: '#f8fafc', borderRadius: '10px', padding: '11px 14px', border: '1px solid #e2e8f0' }}>
              <button onClick={() => setStep(1)} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <i className="fa-solid fa-arrow-left"></i> Nhập lại từ khóa
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleCopyImage} disabled={downloading} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: downloading ? 'not-allowed' : 'pointer', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                  <i className="fa-solid fa-copy"></i> Copy Ảnh (Zalo)
                </button>
                <button onClick={handleDownloadImage} disabled={downloading} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: downloading ? 'not-allowed' : 'pointer', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                  <i className="fa-solid fa-download"></i> Tải Ảnh Xuống
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '18px' }}>
              {/* Edit panel */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '0.95rem', color: '#0d88c4', margin: '0 0 4px 0', textAlign: 'center', fontWeight: '700' }}>
                  <i className="fa-solid fa-pen-to-square"></i> Chỉnh sửa Nội dung
                </h3>
                {[
                  { field: 'ls_comments', label: 'Nghe & Nói', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                  { field: 'rw_comments', label: 'Đọc & Viết',  color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
                  { field: 'conclusion',  label: 'Định Hướng & Lộ Trình', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
                ].map(({ field, label, color, bg, border }) => (
                  <div key={field} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color, marginBottom: '4px' }}>{label}</label>
                    <textarea value={aiResult?.[field] || ''} onChange={e => handleAIResultChange(field, e.target.value)}
                      style={{ flex: 1, minHeight: '130px', padding: '8px', borderRadius: '8px', border: `1px solid ${border}`, fontSize: '0.83rem', resize: 'vertical', lineHeight: '1.6', background: bg }} />
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div style={{ background: '#e2e8f0', padding: '18px', borderRadius: '12px', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
                <div style={{ transform: 'scale(0.78)', transformOrigin: 'top center' }}>
                  <PlacementReportTemplate ref={templateRef} studentName={lead?.name} testDate={testDate} scores={scores} aiResult={aiResult} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
