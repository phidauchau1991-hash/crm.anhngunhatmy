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
          rwKeywords
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
      <div className="modal-content" style={{ maxWidth: '800px', width: '95%' }}>
        <div className="modal-header">
          <h2>📝 Báo Cáo Kết Quả Đánh Giá Năng Lực</h2>
          <button className="close-btn" onClick={onClose}><i className="fa-solid fa-times"></i></button>
        </div>
        
        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          
          {/* Inputs Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            
            {/* Left Column: Scores */}
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#1e293b' }}>1. Bảng Điểm Kỹ Năng</h3>
              
              {/* Listening */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569' }}>Nghe (Listening): <span style={{ color: '#0ea5e9' }}>{lsPercent}%</span></label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="number" placeholder="Điểm đạt" className="form-control" value={scores.listening.score} onChange={e => handleScoreChange('listening', 'score', e.target.value)} />
                  <span style={{ color: '#94a3b8' }}>/</span>
                  <input type="number" placeholder="Tối đa" className="form-control" value={scores.listening.max} onChange={e => handleScoreChange('listening', 'max', e.target.value)} />
                </div>
              </div>
              
              {/* Speaking */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569' }}>Nói (Speaking): <span style={{ color: '#0ea5e9' }}>{spPercent}%</span></label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="number" placeholder="Điểm đạt" className="form-control" value={scores.speaking.score} onChange={e => handleScoreChange('speaking', 'score', e.target.value)} />
                  <span style={{ color: '#94a3b8' }}>/</span>
                  <input type="number" placeholder="Tối đa" className="form-control" value={scores.speaking.max} onChange={e => handleScoreChange('speaking', 'max', e.target.value)} />
                </div>
              </div>
              
              {/* Reading & Writing */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569' }}>Đọc & Viết (Reading & Writing): <span style={{ color: '#0ea5e9' }}>{rwPercent}%</span></label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="number" placeholder="Điểm đạt" className="form-control" value={scores.rw.score} onChange={e => handleScoreChange('rw', 'score', e.target.value)} />
                  <span style={{ color: '#94a3b8' }}>/</span>
                  <input type="number" placeholder="Tối đa" className="form-control" value={scores.rw.max} onChange={e => handleScoreChange('rw', 'max', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Right Column: AI Keywords */}
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#1e293b' }}>2. Từ Khóa Nhận Xét (Cho AI)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569' }}>Nhận xét Nghe & Nói:</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    placeholder="VD: Nghe hiểu tốt, phản xạ nhanh nhưng phát âm sai âm cuối..."
                    value={lsKeywords}
                    onChange={e => setLsKeywords(e.target.value)}
                  ></textarea>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569' }}>Nhận xét Đọc & Viết:</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    placeholder="VD: Từ vựng khá, ngữ pháp chưa vững, viết còn sai chính tả nhiều..."
                    value={rwKeywords}
                    onChange={e => setRwKeywords(e.target.value)}
                  ></textarea>
                </div>
                <button 
                  onClick={generateAI} 
                  disabled={loading} 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  {loading ? '⏳ Đang nhờ AI viết...' : '✨ Nhờ AI Viết Nhận Xét'}
                </button>
                {error && <p style={{ color: 'red', margin: '0', fontSize: '0.85rem' }}>{error}</p>}
              </div>
            </div>
          </div>

          {/* AI Result & Export Section */}
          {aiResult && (
            <div style={{ background: '#f0fdf4', padding: '1.5rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid #bbf7d0' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-check-circle"></i> Báo Cáo Đã Sẵn Sàng!
              </h3>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <button 
                  className="btn btn-success" 
                  onClick={handleCopyImage}
                  disabled={downloading}
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px' }}
                >
                  <i className="fa-solid fa-copy"></i> {downloading ? 'Đang tạo ảnh...' : 'Copy Ảnh (Dán Zalo)'}
                </button>
                <button 
                  className="btn btn-outline" 
                  onClick={handleDownloadImage}
                  disabled={downloading}
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px' }}
                >
                  <i className="fa-solid fa-download"></i> {downloading ? 'Đang tạo ảnh...' : 'Tải Ảnh Xuống'}
                </button>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#166534' }}>Mẫu tin nhắn Zalo kèm theo (Click để copy):</label>
                <textarea 
                  className="form-control" 
                  rows="4" 
                  value={suggestedMessage}
                  readOnly
                  onClick={(e) => {
                    e.target.select();
                    navigator.clipboard.writeText(suggestedMessage);
                    alert("Đã copy tin nhắn Zalo!");
                  }}
                  style={{ background: '#ffffff', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}

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
