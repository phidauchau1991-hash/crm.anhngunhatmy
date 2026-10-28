import React, { useState, useRef, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import PlacementReportTemplate from './PlacementReportTemplate';

const DEFAULT_WEIGHTS = { listening: 30, speaking: 30, rw: 40 };

export default function PlacementTestModal({ isOpen, onClose, lead }) {
  const [step, setStep] = useState(1);
  const [scores, setScores] = useState({
    listening: { score: '', max: '', weight: DEFAULT_WEIGHTS.listening },
    speaking:  { score: '', max: '', weight: DEFAULT_WEIGHTS.speaking  },
    rw:        { score: '', max: '', weight: DEFAULT_WEIGHTS.rw        },
  });
  const [testDate, setTestDate]       = useState('');
  const [lsKeywords, setLsKeywords]   = useState('');
  const [rwKeywords, setRwKeywords]   = useState('');
  const [devKeywords, setDevKeywords] = useState('');
  const [aiResult, setAiResult]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [downloading, setDownloading] = useState(false);

  // Persistence State
  const [assessmentId, setAssessmentId] = useState(null);
  const [isSaving, setIsSaving]         = useState(false);
  const [saveStatus, setSaveStatus]     = useState('');
  const [hasExisting, setHasExisting]   = useState(false);

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
      setAssessmentId(null); setSaveStatus(''); setHasExisting(false);
      setTestDate(new Date().toLocaleDateString('vi-VN'));

      // Tự động nạp dữ liệu kiểm tra năng lực đã lưu trước đó nếu có
      if (lead?.id) {
        fetch(`/api/assessments?leadId=${lead.id}&type=PLACEMENT_TEST&latestOnly=true`)
          .then(res => res.json())
          .then(res => {
            if (res.success && res.data) {
              const prev = res.data;
              setAssessmentId(prev.id);
              setHasExisting(true);
              if (prev.assessmentDate) {
                try {
                  const d = new Date(prev.assessmentDate);
                  if (!isNaN(d.getTime())) setTestDate(d.toLocaleDateString('vi-VN'));
                } catch {}
              }
              if (prev.scoresData && typeof prev.scoresData === 'object') {
                setScores(prev.scoresData);
              }
              if (prev.keywordsData && typeof prev.keywordsData === 'object') {
                setLsKeywords(prev.keywordsData.lsKeywords || '');
                setRwKeywords(prev.keywordsData.rwKeywords || '');
                setDevKeywords(prev.keywordsData.devKeywords || '');
              }
              if (prev.commentsData && typeof prev.commentsData === 'object') {
                setAiResult(prev.commentsData);
              }
              const updated = new Date(prev.updatedAt || prev.createdAt);
              setSaveStatus(`Đã lưu hồ sơ lúc ${updated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${updated.toLocaleDateString('vi-VN')}`);
            }
          })
          .catch(err => console.error('Lỗi khi tải kết quả khảo sát cũ:', err));
      }
    }
  }, [isOpen, lead]);

  const handleScoreChange = (skill, field, value) =>
    setScores(prev => ({ ...prev, [skill]: { ...prev[skill], [field]: value } }));

  const handleAIResultChange = (field, value) =>
    setAiResult(prev => ({ ...prev, [field]: value }));

  const getPct     = (s, m) => (!m || m <= 0) ? 0 : Math.round((Number(s) / Number(m)) * 100);
  const getContrib = (s, m, w) => (!m || m <= 0) ? 0 : Math.round((Number(s) / Number(m)) * Number(w) * 100) / 100;

  const lsPct = getPct(scores.listening.score, scores.listening.max);
  const spPct = getPct(scores.speaking.score,  scores.speaking.max);
  const rwPct = getPct(scores.rw.score,        scores.rw.max);
  const lsC   = getContrib(scores.listening.score, scores.listening.max, scores.listening.weight);
  const spC   = getContrib(scores.speaking.score,  scores.speaking.max,  scores.speaking.weight);
  const rwC   = getContrib(scores.rw.score,        scores.rw.max,        scores.rw.weight);
  const totalC = Math.round((lsC + spC + rwC) * 100) / 100;
  const totalW = Number(scores.listening.weight||0) + Number(scores.speaking.weight||0) + Number(scores.rw.weight||0);

  // Hàm lưu kết quả vào CSDL
  const handleSaveAssessment = async (overrideComments = null, showToast = true) => {
    if (!lead?.id) return false;
    setIsSaving(true);
    try {
      const payload = {
        id: assessmentId || undefined,
        leadId: lead.id,
        type: 'PLACEMENT_TEST',
        title: `Kiểm tra năng lực đầu vào - ${lead.name}`,
        assessmentDate: testDate,
        scores: scores,
        totalScore: totalC,
        maxScore: 100,
        keywords: { lsKeywords, rwKeywords, devKeywords },
        comments: overrideComments !== null ? overrideComments : aiResult,
        assessorName: 'Giáo viên khảo sát',
      };

      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setAssessmentId(data.data.id);
        const now = new Date();
        const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('vi-VN');
        setSaveStatus(`Đã lưu hồ sơ lúc ${timeStr} ngày ${dateStr}`);
        setHasExisting(true);
        if (showToast) {
          alert('✅ Đã lưu kết quả bài kiểm tra và nhận xét vào hồ sơ học viên thành công!');
        }
        return true;
      } else {
        alert('Lỗi lưu hồ sơ: ' + (data.error || 'Không xác định'));
        return false;
      }
    } catch (err) {
      console.error('Lỗi lưu assessment:', err);
      alert('Lỗi kết nối khi lưu: ' + err.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const generateAI = async () => {
    if (!lead) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/ai/placement-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName: lead.name, lsKeywords, rwKeywords, devKeywords })
      });
      const data = await res.json();
      if (data.success) { 
        setAiResult(data.data); 
        setStep(2); 
        // Tự động lưu vào cơ sở dữ liệu ngay sau khi AI sinh nhận xét
        await handleSaveAssessment(data.data, false);
      }
      else setError(data.error || 'Lỗi khi gọi AI');
    } catch { setError('Lỗi kết nối máy chủ'); }
    setLoading(false);
  };

  const getDataUrl = async () => {
    const el = templateRef.current;
    if (!el) throw new Error('Template element not found');
    return await htmlToImage.toPng(el, { quality: 1, pixelRatio: 2 });
  };

  const handleCopyImage = async () => {
    setDownloading(true);
    try {
      const dataUrl = await getDataUrl();
      const res   = await fetch(dataUrl);
      const blob  = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('Đã copy ảnh! Dán Ctrl+V vào Zalo nhé!');
    } catch (err) {
      console.error(err);
      alert('Lỗi copy ảnh: ' + err.message + '. Hãy thử nút Tải Ảnh Xuống.');
    }
    setDownloading(false);
  };

  const handleDownloadImage = async () => {
    setDownloading(true);
    try {
      const dataUrl = await getDataUrl();
      const link = document.createElement('a');
      link.download = `KQ_Test_${lead?.name || 'HocVien'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi tạo ảnh: ' + err.message);
    }
    setDownloading(false);
  };

  if (!isOpen) return null;

  const pctBadge = (p) => ({
    display: 'inline-block', padding: '2px 9px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', marginLeft: '6px',
    background: p >= 70 ? '#d1fae5' : p >= 50 ? '#fef3c7' : '#fee2e2',
    color:      p >= 70 ? '#065f46' : p >= 50 ? '#92400e' : '#991b1b',
  });

  const inputSm = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' };

  const skillRows = [
    { key: 'listening', label: 'Nghe (Listening)',           pct: lsPct, contrib: lsC },
    { key: 'speaking',  label: 'Nói (Speaking)',             pct: spPct, contrib: spC },
    { key: 'rw',        label: 'Đọc & Viết (Reading & Writing)', pct: rwPct, contrib: rwC },
  ];

  const editFields = [
    { field: 'ls_comments', label: 'Nghe & Nói',               color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
    { field: 'rw_comments', label: 'Đọc & Viết',               color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    { field: 'conclusion',  label: 'Định Hướng & Lộ Trình',    color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  ];

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content glass-panel animated-scale" style={{ maxWidth: step === 2 ? '1350px' : '950px', width: '97%', maxHeight: '95vh', overflowY: 'auto', borderRadius: '16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 26px', background: 'linear-gradient(135deg, #0d88c4, #1e40af)', borderRadius: '16px 16px 0 0' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '5px 10px', borderRadius: '8px' }}><i className="fa-solid fa-file-signature"></i></span>
              Báo Cáo KQ Đánh Giá Năng Lực
              {lead && <span style={{ fontSize: '0.95rem', fontWeight: '500', opacity: 0.85 }}>— {lead.name}</span>}
            </h2>
            {saveStatus && (
              <span style={{ fontSize: '0.78rem', color: '#bbf7d0', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <i className="fa-solid fa-check-double"></i> {saveStatus}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '34px', height: '34px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* STEP 1: INPUT FORM */}
        {step === 1 && (
          <div style={{ padding: '24px 26px' }}>
            {hasExisting && (
              <div style={{ marginBottom: '18px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.88rem', color: '#065f46', fontWeight: '600' }}>
                  <i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i>
                  {saveStatus || 'Đã có bài kiểm tra được lưu trong hệ thống.'}
                </span>
                {aiResult && (
                  <button 
                    type="button" 
                    onClick={() => setStep(2)}
                    style={{ background: '#059669', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="fa-solid fa-eye"></i> Xem Báo Cáo Đã Lưu
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Left: Scores */}
              <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '22px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 18px 0', fontSize: '1.05rem', color: '#0d88c4', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-chart-bar"></i> Bảng Điểm Kỹ Năng
                </h3>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.88rem', display: 'block', marginBottom: '5px' }}>Ngày làm bài</label>
                  <input type="text" value={testDate} onChange={e => setTestDate(e.target.value)} placeholder="VD: 30/09/2026" style={inputSm} />
                </div>

                {skillRows.map(({ key, label, pct, contrib }) => (
                  <div key={key} style={{ marginBottom: '14px', background: '#fff', borderRadius: '10px', padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '700', color: '#374151', fontSize: '0.88rem' }}>{label}</span>
                      <span style={pctBadge(pct)}>{pct}%</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: '6px', alignItems: 'center' }}>
                      <input type="number" placeholder="Điểm đạt" style={{ ...inputSm, textAlign: 'center' }} value={scores[key].score} onChange={e => handleScoreChange(key, 'score', e.target.value)} />
                      <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>/</span>
                      <input type="number" placeholder="Tối đa" style={{ ...inputSm, textAlign: 'center' }} value={scores[key].max} onChange={e => handleScoreChange(key, 'max', e.target.value)} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#f0f9ff', borderRadius: '8px', padding: '4px 8px', border: '1px solid #bae6fd', whiteSpace: 'nowrap' }}>
                        <input type="number" min="1" max="100" style={{ width: '36px', border: 'none', background: 'transparent', fontSize: '0.88rem', fontWeight: '700', color: '#0284c7', textAlign: 'center', outline: 'none' }} value={scores[key].weight} onChange={e => handleScoreChange(key, 'weight', e.target.value)} />
                        <span style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: '600' }}>% TrS</span>
                      </div>
                    </div>
                    <div style={{ marginTop: '5px', fontSize: '0.78rem', color: '#64748b', textAlign: 'right' }}>
                      Điểm đóng góp: <strong style={{ color: '#0284c7' }}>{contrib} / {scores[key].weight}</strong>
                    </div>
                  </div>
                ))}

                <div style={{ background: '#dbeafe', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #93c5fd' }}>
                  <span style={{ fontWeight: '800', color: '#1e40af', fontSize: '0.95rem' }}>TỔNG KẾT (100 điểm)</span>
                  <span style={{ fontWeight: '800', color: '#1e40af', fontSize: '1.2rem' }}>{totalC} / 100</span>
                </div>
              </div>

              {/* Right: AI Keywords */}
              <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '22px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 18px 0', fontSize: '1.05rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-wand-magic-sparkles"></i> Từ Khóa Gợi Ý (Cho AI)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                  {[
                    { label: 'Nhận xét Nghe & Nói',       val: lsKeywords,  set: setLsKeywords,  color: '#1d4ed8', ph: 'VD: Phát âm chuẩn, nghe tốt, thiếu từ vựng...', icon: 'fa-headphones' },
                    { label: 'Nhận xét Đọc & Viết',        val: rwKeywords,  set: setRwKeywords,  color: '#b45309', ph: 'VD: Ngữ pháp khá, đọc chậm, viết sai chính tả...', icon: 'fa-book-open' },
                    { label: 'Định hướng & Phát triển',    val: devKeywords, set: setDevKeywords, color: '#15803d', ph: 'VD: Nên vào lớp Kids 1, tập trung kỹ năng nói...', icon: 'fa-road' },
                  ].map(({ label, val, set, color, ph, icon }) => (
                    <div key={icon}>
                      <label style={{ fontWeight: '700', color, fontSize: '0.88rem', display: 'block', marginBottom: '5px' }}>
                        <i className={`fa-solid ${icon}`} style={{ marginRight: '6px' }}></i>{label}
                      </label>
                      <textarea rows={3} placeholder={ph} value={val} onChange={e => set(e.target.value)} style={{ ...inputSm, resize: 'vertical', minHeight: '76px', lineHeight: '1.5' }} />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <button 
                    type="button"
                    onClick={() => handleSaveAssessment(null, true)} 
                    disabled={isSaving}
                    style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                  >
                    <i className={`fa-solid ${isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
                    {isSaving ? 'Đang lưu...' : 'Lưu Điểm & Từ Khóa'}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {error && <span style={{ color: '#ef4444', fontSize: '0.88rem' }}>{error}</span>}
                    <button onClick={generateAI} disabled={loading}
                      style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #7c3aed, #1d4ed8)', color: '#fff', padding: '11px 24px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                      <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-robot'}`}></i>
                      {loading ? 'Đang phân tích...' : 'Sinh Nhận Xét AI'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW + EDIT */}
        {step === 2 && (
          <div style={{ padding: '18px 26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px', background: '#f8fafc', borderRadius: '10px', padding: '11px 14px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '8px' }}>
              <button onClick={() => setStep(1)} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <i className="fa-solid fa-arrow-left"></i> Nhập lại từ khóa
              </button>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => handleSaveAssessment(aiResult, true)} 
                  disabled={isSaving} 
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '7px', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' }}
                >
                  <i className={`fa-solid ${isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i> 
                  {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
                <button onClick={handleCopyImage} disabled={downloading} style={{ background: '#0d88c4', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: downloading ? 'not-allowed' : 'pointer', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                  <i className="fa-solid fa-copy"></i> {downloading ? 'Đang xử lý...' : 'Copy Ảnh (Zalo)'}
                </button>
                <button onClick={handleDownloadImage} disabled={downloading} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: downloading ? 'not-allowed' : 'pointer', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                  <i className="fa-solid fa-download"></i> {downloading ? 'Đang xử lý...' : 'Tải Ảnh Xuống'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '18px' }}>
              {/* Edit panel */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  <h3 style={{ fontSize: '0.95rem', color: '#0d88c4', margin: 0, fontWeight: '700' }}>
                    <i className="fa-solid fa-pen-to-square"></i> Chỉnh sửa Nội dung
                  </h3>
                  {saveStatus && <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '600' }}>Đã lưu</span>}
                </div>
                {editFields.map(({ field, label, color, bg, border }) => (
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
