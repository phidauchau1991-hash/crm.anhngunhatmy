import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import PlacementReportTemplate from './PlacementReportTemplate';

export default function PlacementTestModal({ isOpen, onClose, lead }) {
  const [step, setStep] = useState(1); // 1: Form, 2: Preview
  const [scores, setScores] = useState({
    listening: { score: '', max: '' },
    speaking: { score: '', max: '' },
    rw: { score: '', max: '' }
  });
  
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
      setScores({
        listening: { score: '', max: '' },
        speaking: { score: '', max: '' },
        rw: { score: '', max: '' }
      });
      setLsKeywords('');
      setRwKeywords('');
      setDevKeywords('');
      setAiResult(null);
      setError('');
    }
  }, [isOpen, lead]);

  const handleScoreChange = (skill, field, value) => {
    setScores(prev => ({
      ...prev,
      [skill]: {
        ...prev[skill],
        [field]: value
      }
    }));
  };

  const handleAIResultChange = (field, value) => {
    setAiResult(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateAI = async () => {
    if (!lead) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/ai/placement-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: lead.name,
          lsKeywords,
          rwKeywords,
          devKeywords
        })
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

  const handleCopyImage = async () => {
    if (!templateRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(templateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      canvas.toBlob(async (blob) => {
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          alert("Đã copy ảnh vào bộ nhớ tạm. Có thể dán (Ctrl+V) vào Zalo ngay!");
        } catch (err) {
          alert("Trình duyệt không hỗ trợ copy ảnh trực tiếp. Vui lòng bấm Tải Ảnh.");
        }
      });
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi tạo ảnh");
    }
    setDownloading(false);
  };

  const handleDownloadImage = async () => {
    if (!templateRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(templateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `Ket_qua_test_${lead?.name || 'Hoc_vien'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi tạo ảnh");
    }
    setDownloading(false);
  };

  if (!isOpen) return null;

  const getPercentage = (score, max) => {
    if (!max || max <= 0) return 0;
    return Math.round((Number(score) / Number(max)) * 100);
  };

  const lsPercent = getPercentage(scores.listening.score, scores.listening.max);
  const spPercent = getPercentage(scores.speaking.score, scores.speaking.max);
  const rwPercent = getPercentage(scores.rw.score, scores.rw.max);

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content glass-panel animated-scale" style={{ maxWidth: step === 2 ? '1300px' : '850px', width: '95%', maxHeight: '95vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: '#0d88c4' }}>
            <i className="fa-solid fa-file-signature"></i> Báo Cáo KQ Đánh Giá Năng Lực
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
        </div>

        {/* STEP 1: FORM */}
        {step === 1 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {/* Cột trái: Form điểm */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#1e293b' }}>1. Bảng Điểm Kỹ Năng</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontWeight: '600', color: '#475569' }}>Nghe (Listening) - <span style={{ color: '#0ea5e9' }}>{lsPercent}%</span></label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="number" placeholder="Điểm đạt" className="form-control" value={scores.listening.score} onChange={e => handleScoreChange('listening', 'score', e.target.value)} />
                      <input type="number" placeholder="Tối đa" className="form-control" value={scores.listening.max} onChange={e => handleScoreChange('listening', 'max', e.target.value)} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontWeight: '600', color: '#475569' }}>Nói (Speaking) - <span style={{ color: '#0ea5e9' }}>{spPercent}%</span></label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="number" placeholder="Điểm đạt" className="form-control" value={scores.speaking.score} onChange={e => handleScoreChange('speaking', 'score', e.target.value)} />
                      <input type="number" placeholder="Tối đa" className="form-control" value={scores.speaking.max} onChange={e => handleScoreChange('speaking', 'max', e.target.value)} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontWeight: '600', color: '#475569' }}>Đọc & Viết (Read & Write) - <span style={{ color: '#0ea5e9' }}>{rwPercent}%</span></label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="number" placeholder="Điểm đạt" className="form-control" value={scores.rw.score} onChange={e => handleScoreChange('rw', 'score', e.target.value)} />
                      <input type="number" placeholder="Tối đa" className="form-control" value={scores.rw.max} onChange={e => handleScoreChange('rw', 'max', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cột phải: Form AI */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#1e293b' }}>2. Từ Khóa Gợi Ý (Cho AI)</h3>
                
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Nhận xét Nghe & Nói</label>
                  <input type="text" placeholder="VD: Phát âm chuẩn, nghe tốt, thiếu từ vựng" value={lsKeywords} onChange={e => setLsKeywords(e.target.value)} className="form-control" />
                </div>
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Nhận xét Đọc & Viết</label>
                  <input type="text" placeholder="VD: Ngữ pháp khá, viết sai chính tả, đọc chậm" value={rwKeywords} onChange={e => setRwKeywords(e.target.value)} className="form-control" />
                </div>
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Định hướng & Phát triển</label>
                  <input type="text" placeholder="VD: Đăng ký lớp Kids 1, tập trung phản xạ" value={devKeywords} onChange={e => setDevKeywords(e.target.value)} className="form-control" />
                </div>
                
                <div style={{ marginTop: 'auto', textAlign: 'right', paddingTop: '1rem' }}>
                  {error && <span style={{ color: 'red', marginRight: '1rem' }}>{error}</span>}
                  <button 
                    onClick={generateAI} 
                    disabled={loading} 
                    style={{ background: '#0d88c4', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer' }}
                  >
                    {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-robot"></i>} Sinh Nhận Xét
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & EDIT */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
              <button 
                onClick={() => setStep(1)} 
                style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                <i className="fa-solid fa-arrow-left"></i> Nhập lại từ khóa
              </button>
              
              <div>
                <button onClick={handleCopyImage} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}>
                  <i className="fa-solid fa-copy"></i> Copy Ảnh (Zalo)
                </button>
                <button onClick={handleDownloadImage} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  <i className="fa-solid fa-download"></i> Tải Ảnh Xuống
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
              {/* Edit text column */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', background: '#fff' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#0d88c4', marginTop: 0, textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  <i className="fa-solid fa-pen-to-square"></i> Chỉnh sửa Nội dung
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '0.25rem', textAlign: 'center' }}>Nghe & Nói</label>
                    <textarea 
                      value={aiResult?.ls_comments || ''} 
                      onChange={e => handleAIResultChange('ls_comments', e.target.value)}
                      style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '0.25rem', textAlign: 'center' }}>Đọc & Viết</label>
                    <textarea 
                      value={aiResult?.rw_comments || ''} 
                      onChange={e => handleAIResultChange('rw_comments', e.target.value)}
                      style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '0.25rem', textAlign: 'center' }}>Định Hướng & Phát Triển</label>
                    <textarea 
                      value={aiResult?.conclusion || ''} 
                      onChange={e => handleAIResultChange('conclusion', e.target.value)}
                      style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Preview column */}
              <div style={{ background: '#f1f5f9', padding: '1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowX: 'auto' }}>
                <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', transition: 'transform 0.3s' }}>
                  <PlacementReportTemplate 
                    ref={templateRef} 
                    studentName={lead?.name} 
                    testDate={new Date().toLocaleDateString('vi-VN')}
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
