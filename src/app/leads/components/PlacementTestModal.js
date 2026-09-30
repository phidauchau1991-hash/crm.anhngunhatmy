import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import PlacementReportTemplate from './PlacementReportTemplate';

export default function PlacementTestModal({ isOpen, onClose, lead }) {
  const [step, setStep] = useState(1);
  const [scores, setScores] = useState({
    listening: { score: '', max: '' },
    speaking: { score: '', max: '' },
    rw: { score: '', max: '' }
  });
  const [testDate, setTestDate] = useState('');
  const [lsKeywords, setLsKeywords] = useState('');
  const [rwKeywords, setRwKeywords] = useState('');
  const [devKeywords, setDevKeywords] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const templateRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setScores({ listening: { score: '', max: '' }, speaking: { score: '', max: '' }, rw: { score: '', max: '' } });
      setLsKeywords('');
      setRwKeywords('');
      setDevKeywords('');
      setAiResult(null);
      setError('');
      setTestDate(new Date().toLocaleDateString('vi-VN'));
    }
  }, [isOpen, lead]);

  const handleScoreChange = (skill, field, value) => {
    setScores(prev => ({ ...prev, [skill]: { ...prev[skill], [field]: value } }));
  };

  const handleAIResultChange = (field, value) => {
    setAiResult(prev => ({ ...prev, [field]: value }));
  };

  const generateAI = async () => {
    if (!lead) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/placement-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName: lead.name, lsKeywords, rwKeywords, devKeywords })
      });
      const data = await res.json();
      if (data.success) {
        setAiResult(data.data);
        setStep(2);
      } else {
        setError(data.error || 'Lỗi khi gọi AI');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ');
    }
    setLoading(false);
  };

  const captureCanvas = async () => {
    if (!templateRef.current) return null;
    return await html2canvas(templateRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: false,
    });
  };

  const handleCopyImage = async () => {
    setDownloading(true);
    try {
      const canvas = await captureCanvas();
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          alert('Đã copy ảnh vào bộ nhớ tạm. Có thể dán (Ctrl+V) vào Zalo ngay!');
        } catch {
          alert('Trình duyệt không hỗ trợ copy ảnh. Vui lòng dùng nút Tải Ảnh.');
        }
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
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch { alert('Có lỗi khi tạo ảnh'); }
    setDownloading(false);
  };

  if (!isOpen) return null;

  const getPercentage = (score, max) => {
    if (!max || max <= 0) return 0;
    return Math.round((Number(score) / Number(max)) * 100);
  };

  const lsP = getPercentage(scores.listening.score, scores.listening.max);
  const spP = getPercentage(scores.speaking.score, scores.speaking.max);
  const rwP = getPercentage(scores.rw.score, scores.rw.max);

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontWeight: '700', color: '#374151', fontSize: '0.9rem', display: 'block', marginBottom: '6px' };
  const scoreRowStyle = { display: 'flex', gap: '10px', alignItems: 'center' };
  const pctBadge = (p) => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700',
    background: p >= 70 ? '#d1fae5' : p >= 50 ? '#fef3c7' : '#fee2e2',
    color: p >= 70 ? '#065f46' : p >= 50 ? '#92400e' : '#991b1b',
  });

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div
        className="modal-content glass-panel animated-scale"
        style={{ maxWidth: step === 2 ? '1350px' : '920px', width: '97%', maxHeight: '95vh', overflowY: 'auto', borderRadius: '16px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '2px solid #e2e8f0', background: 'linear-gradient(135deg, #0d88c4 0%, #1e40af 100%)', borderRadius: '16px 16px 0 0' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 10px', borderRadius: '8px' }}>
              <i className="fa-solid fa-file-signature"></i>
            </span>
            Báo Cáo KQ Đánh Giá Năng Lực
            {lead && <span style={{ fontSize: '1rem', fontWeight: '500', opacity: 0.85 }}>— {lead.name}</span>}
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* STEP 1: FORM */}
        {step === 1 && (
          <div style={{ padding: '28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>

            {/* Cột trái: Điểm */}
            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#0d88c4', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-chart-bar"></i> Bảng Điểm Kỹ Năng
              </h3>

              {/* Date */}
              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>Ngày làm bài</label>
                <input type="text" value={testDate} onChange={e => setTestDate(e.target.value)} placeholder="VD: 30/09/2026" style={inputStyle} />
              </div>

              {/* Listening */}
              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>
                  Nghe (Listening)&nbsp;
                  <span style={pctBadge(lsP)}>{lsP}%</span>
                </label>
                <div style={scoreRowStyle}>
                  <input type="number" placeholder="Điểm đạt" style={{ ...inputStyle, flex: 1 }} value={scores.listening.score} onChange={e => handleScoreChange('listening', 'score', e.target.value)} />
                  <span style={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '1.2rem' }}>/</span>
                  <input type="number" placeholder="Tối đa" style={{ ...inputStyle, flex: 1 }} value={scores.listening.max} onChange={e => handleScoreChange('listening', 'max', e.target.value)} />
                </div>
              </div>

              {/* Speaking */}
              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>
                  Nói (Speaking)&nbsp;
                  <span style={pctBadge(spP)}>{spP}%</span>
                </label>
                <div style={scoreRowStyle}>
                  <input type="number" placeholder="Điểm đạt" style={{ ...inputStyle, flex: 1 }} value={scores.speaking.score} onChange={e => handleScoreChange('speaking', 'score', e.target.value)} />
                  <span style={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '1.2rem' }}>/</span>
                  <input type="number" placeholder="Tối đa" style={{ ...inputStyle, flex: 1 }} value={scores.speaking.max} onChange={e => handleScoreChange('speaking', 'max', e.target.value)} />
                </div>
              </div>

              {/* Reading & Writing */}
              <div>
                <label style={labelStyle}>
                  Đọc &amp; Viết (Reading &amp; Writing)&nbsp;
                  <span style={pctBadge(rwP)}>{rwP}%</span>
                </label>
                <div style={scoreRowStyle}>
                  <input type="number" placeholder="Điểm đạt" style={{ ...inputStyle, flex: 1 }} value={scores.rw.score} onChange={e => handleScoreChange('rw', 'score', e.target.value)} />
                  <span style={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '1.2rem' }}>/</span>
                  <input type="number" placeholder="Tối đa" style={{ ...inputStyle, flex: 1 }} value={scores.rw.max} onChange={e => handleScoreChange('rw', 'max', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Cột phải: Từ khóa AI */}
            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-wand-magic-sparkles"></i> Từ Khóa Gợi Ý (Cho AI)
              </h3>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ ...labelStyle, color: '#1d4ed8' }}>
                    <i className="fa-solid fa-headphones" style={{ marginRight: '6px' }}></i>
                    Nhận xét Nghe &amp; Nói
                  </label>
                  <textarea
                    rows={3}
                    placeholder="VD: Phát âm chuẩn, nghe hiểu tốt, thiếu từ vựng, phản xạ còn chậm..."
                    value={lsKeywords}
                    onChange={e => setLsKeywords(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: '#b45309' }}>
                    <i className="fa-solid fa-book-open" style={{ marginRight: '6px' }}></i>
                    Nhận xét Đọc &amp; Viết
                  </label>
                  <textarea
                    rows={3}
                    placeholder="VD: Ngữ pháp khá, đọc chậm, viết sai chính tả, cần luyện thêm..."
                    value={rwKeywords}
                    onChange={e => setRwKeywords(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: '#15803d' }}>
                    <i className="fa-solid fa-road" style={{ marginRight: '6px' }}></i>
                    Định hướng &amp; Phát triển
                  </label>
                  <textarea
                    rows={3}
                    placeholder="VD: Nên vào lớp Kids 1, tập trung kỹ năng nói, luyện phản xạ..."
                    value={devKeywords}
                    onChange={e => setDevKeywords(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                {error && <span style={{ color: '#ef4444', marginRight: '12px', fontSize: '0.9rem' }}>{error}</span>}
                <button
                  onClick={generateAI}
                  disabled={loading}
                  style={{
                    background: loading ? '#94a3b8' : 'linear-gradient(135deg, #7c3aed, #1d4ed8)',
                    color: '#fff', padding: '12px 28px', borderRadius: '10px', border: 'none',
                    fontWeight: '700', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 12px rgba(124,58,237,0.3)'
                  }}
                >
                  <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-robot'}`}></i>
                  {loading ? 'Đang phân tích...' : 'Sinh Nhận Xét'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & EDIT */}
        {step === 2 && (
          <div style={{ padding: '20px 28px' }}>
            {/* Action bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', background: '#f8fafc', borderRadius: '10px', padding: '12px 16px', border: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setStep(1)}
                style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fa-solid fa-arrow-left"></i> Nhập lại từ khóa
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleCopyImage}
                  disabled={downloading}
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: downloading ? 'not-allowed' : 'pointer', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <i className="fa-solid fa-copy"></i> Copy Ảnh (Zalo)
                </button>
                <button
                  onClick={handleDownloadImage}
                  disabled={downloading}
                  style={{ background: '#10b981', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: downloading ? 'not-allowed' : 'pointer', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <i className="fa-solid fa-download"></i> Tải Ảnh Xuống
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
              {/* Edit panel */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1rem', color: '#0d88c4', margin: '0 0 14px 0', textAlign: 'center', fontWeight: '700' }}>
                  <i className="fa-solid fa-pen-to-square"></i> Chỉnh sửa Nội dung
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1d4ed8', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '10px', height: '10px', background: '#3b82f6', borderRadius: '50%', display: 'inline-block' }}></span>
                      Nghe &amp; Nói
                    </label>
                    <textarea
                      value={aiResult?.ls_comments || ''}
                      onChange={e => handleAIResultChange('ls_comments', e.target.value)}
                      style={{ flex: 1, minHeight: '130px', padding: '8px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.85rem', resize: 'vertical', lineHeight: '1.6', background: '#eff6ff' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#b45309', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '50%', display: 'inline-block' }}></span>
                      Đọc &amp; Viết
                    </label>
                    <textarea
                      value={aiResult?.rw_comments || ''}
                      onChange={e => handleAIResultChange('rw_comments', e.target.value)}
                      style={{ flex: 1, minHeight: '130px', padding: '8px', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '0.85rem', resize: 'vertical', lineHeight: '1.6', background: '#fffbeb' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#15803d', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%', display: 'inline-block' }}></span>
                      Định Hướng &amp; Lộ Trình
                    </label>
                    <textarea
                      value={aiResult?.conclusion || ''}
                      onChange={e => handleAIResultChange('conclusion', e.target.value)}
                      style={{ flex: 1, minHeight: '130px', padding: '8px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.85rem', resize: 'vertical', lineHeight: '1.6', background: '#f0fdf4' }}
                    />
                  </div>
                </div>
              </div>

              {/* Preview panel */}
              <div style={{ background: '#e2e8f0', padding: '20px', borderRadius: '12px', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
                <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center' }}>
                  <PlacementReportTemplate
                    ref={templateRef}
                    studentName={lead?.name}
                    testDate={testDate}
                    scores={scores}
                    aiResult={aiResult}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
