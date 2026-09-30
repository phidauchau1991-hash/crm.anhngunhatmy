import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import PlacementReportTemplate from './PlacementReportTemplate';

export default function PlacementTestModal({ isOpen, onClose, lead }) {
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

  const handleScoreChange = (skill, field, value) => {
    setScores(prev => ({
      ...prev,
      [skill]: {
        ...prev[skill],
        [field]: value
      }
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

  const suggestedMessage = `Dạ Trung tâm Anh ngữ Nhật Mỹ xin gửi ba/mẹ phiếu Kết quả Đánh giá Năng lực đầu vào của bé ${lead?.name || ''}.\n\nQua bài test, giáo viên nhận thấy bé có tiềm năng rất tốt. Ba/mẹ xem chi tiết điểm từng kỹ năng và nhận xét trong ảnh đính kèm nhé.\n\nDạ ba/mẹ cho trung tâm xin phép tư vấn lớp học phù hợp với bé nhà mình nha! 🥰`;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '1050px', width: '95%' }}>
        <div className="modal-header" style={{ padding: '15px 20px', borderBottom: '2px solid #f1f5f9' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '6px 12px', borderRadius: '8px' }}>
              <i className="fa-solid fa-file-signature"></i>
            </span>
            Báo Cáo Kết Quả Đánh Giá Năng Lực
          </h2>
          <button className="close-btn" onClick={onClose}><i className="fa-solid fa-times"></i></button>
        </div>
        
        <div className="modal-body" style={{ padding: '20px', maxHeight: '85vh', overflowY: 'hidden' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px', height: '100%' }}>
            
            {/* Left Column: Scores & Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-chart-pie" style={{ color: '#0ea5e9' }}></i> 1. Bảng Điểm Kỹ Năng
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569', margin: 0 }}>
                      Nghe <span style={{ color: '#0ea5e9', fontSize: '0.8rem' }}>({lsPercent}%)</span>
                    </label>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <input type="number" placeholder="Điểm" className="form-control" style={{ padding: '6px', fontSize: '0.9rem' }} value={scores.listening.score} onChange={e => handleScoreChange('listening', 'score', e.target.value)} />
                      <span style={{ color: '#94a3b8' }}>/</span>
                      <input type="number" placeholder="Tối đa" className="form-control" style={{ padding: '6px', fontSize: '0.9rem' }} value={scores.listening.max} onChange={e => handleScoreChange('listening', 'max', e.target.value)} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569', margin: 0 }}>
                      Nói <span style={{ color: '#0ea5e9', fontSize: '0.8rem' }}>({spPercent}%)</span>
                    </label>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <input type="number" placeholder="Điểm" className="form-control" style={{ padding: '6px', fontSize: '0.9rem' }} value={scores.speaking.score} onChange={e => handleScoreChange('speaking', 'score', e.target.value)} />
                      <span style={{ color: '#94a3b8' }}>/</span>
                      <input type="number" placeholder="Tối đa" className="form-control" style={{ padding: '6px', fontSize: '0.9rem' }} value={scores.speaking.max} onChange={e => handleScoreChange('speaking', 'max', e.target.value)} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569', margin: 0 }}>
                      Đọc & Viết <span style={{ color: '#0ea5e9', fontSize: '0.8rem' }}>({rwPercent}%)</span>
                    </label>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <input type="number" placeholder="Điểm" className="form-control" style={{ padding: '6px', fontSize: '0.9rem' }} value={scores.rw.score} onChange={e => handleScoreChange('rw', 'score', e.target.value)} />
                      <span style={{ color: '#94a3b8' }}>/</span>
                      <input type="number" placeholder="Tối đa" className="form-control" style={{ padding: '6px', fontSize: '0.9rem' }} value={scores.rw.max} onChange={e => handleScoreChange('rw', 'max', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 }}>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-keyboard" style={{ color: '#8b5cf6' }}></i> 2. Từ Khóa Gợi Ý (Cho AI)
                </h3>
                
                <div>
                  <input type="text" className="form-control" style={{ fontSize: '0.9rem', padding: '8px' }} placeholder="Nghe & Nói: VD: Phát âm khá, nghe tốt, thiếu từ vựng..." value={lsKeywords} onChange={e => setLsKeywords(e.target.value)} />
                </div>
                <div>
                  <input type="text" className="form-control" style={{ fontSize: '0.9rem', padding: '8px' }} placeholder="Đọc & Viết: VD: Sai ngữ pháp nhiều, đọc hiểu nhanh..." value={rwKeywords} onChange={e => setRwKeywords(e.target.value)} />
                </div>
                <div>
                  <input type="text" className="form-control" style={{ fontSize: '0.9rem', padding: '8px' }} placeholder="Định hướng & Phát triển (Tùy chọn)" value={devKeywords} onChange={e => setDevKeywords(e.target.value)} />
                </div>
                
                <button 
                  onClick={generateAI} 
                  disabled={loading} 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: 'auto', padding: '10px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'linear-gradient(to right, #0284c7, #2563eb)' }}
                >
                  {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                  {loading ? 'Đang phân tích...' : 'Tự Động Sinh Báo Cáo (AI)'}
                </button>
                {error && <p style={{ color: '#ef4444', margin: '0', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>}
              </div>
            </div>

            {/* Right Column: Result & Export */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {aiResult ? (
                <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '1px solid #bbf7d0', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-circle-check"></i> Báo Cáo Đã Sẵn Sàng!
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    <button 
                      className="btn btn-success" 
                      onClick={handleCopyImage}
                      disabled={downloading}
                      style={{ padding: '12px', fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    >
                      <i className="fa-solid fa-copy"></i> {downloading ? 'Đang xử lý...' : 'Copy Ảnh (Dán Zalo)'}
                    </button>
                    <button 
                      className="btn btn-outline" 
                      onClick={handleDownloadImage}
                      disabled={downloading}
                      style={{ padding: '12px', fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderColor: '#16a34a', color: '#16a34a' }}
                    >
                      <i className="fa-solid fa-download"></i> {downloading ? 'Đang xử lý...' : 'Tải Ảnh Xuống'}
                    </button>
                  </div>

                  <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#166534' }}>Mẫu tin nhắn Zalo kèm theo (Click để copy):</label>
                    <textarea 
                      className="form-control" 
                      value={suggestedMessage}
                      readOnly
                      onClick={(e) => {
                        e.target.select();
                        navigator.clipboard.writeText(suggestedMessage);
                        alert("Đã copy tin nhắn Zalo!");
                      }}
                      style={{ background: '#ffffff', cursor: 'pointer', flexGrow: 1, resize: 'none', border: '1px dashed #86efac' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px dashed #cbd5e1', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#64748b', textAlign: 'center' }}>
                  <i className="fa-solid fa-robot" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '15px' }}></i>
                  <h4 style={{ margin: '0 0 10px 0', color: '#475569' }}>Chưa có báo cáo</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Vui lòng nhập điểm và từ khóa gợi ý bên trái, sau đó bấm "Tự Động Sinh Báo Cáo (AI)" để xem kết quả.</p>
                </div>
              )}
            </div>

          </div>

          {/* Hidden Template for html2canvas */}
          <div style={{ width: 0, height: 0, overflow: 'hidden' }}>
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
  );
}
