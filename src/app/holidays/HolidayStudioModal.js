import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import HolidayNoticeTemplate from '../components/HolidayNoticeTemplate';

export default function HolidayStudioModal({ isOpen, onClose, holiday }) {
  const templateRef = useRef(null);
  const [formData, setFormData] = useState({
    holidayName: '',
    startDate: '',
    endDate: '',
    returnDate: '',
    message: 'Kính chúc Quý phụ huynh và các em học sinh một kỳ nghỉ lễ thật vui vẻ và ý nghĩa!'
  });
  const [aiContent, setAiContent] = useState({ zaloOptions: [], fbOptions: [] });
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState('Zalo');

  useEffect(() => {
    if (holiday && isOpen) {
      setFormData({
        holidayName: holiday.name || '',
        startDate: holiday.startDate ? new Date(holiday.startDate).toLocaleDateString('vi-VN') : '',
        endDate: holiday.endDate ? new Date(holiday.endDate).toLocaleDateString('vi-VN') : '',
        returnDate: '', 
        message: 'Kính chúc Quý phụ huynh và các em học sinh một kỳ nghỉ lễ thật vui vẻ và ý nghĩa!'
      });
      fetchAiContent(holiday.name);
    }
  }, [holiday, isOpen]);

  const fetchAiContent = async (name) => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/holiday-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holidayName: name })
      });
      const data = await res.json();
      if (data.success) {
        setAiContent(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleCopyImage = async () => {
    if (!templateRef.current) return;
    try {
      const canvas = await html2canvas(templateRef.current, { useCORS: true, scale: 2 });
      canvas.toBlob(async (blob) => {
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          alert('Đã copy ảnh vào clipboard!');
        } catch (err) {
          alert('Không thể copy ảnh. Vui lòng thử Tải Ảnh.');
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadImage = async () => {
    if (!templateRef.current) return;
    try {
      const canvas = await html2canvas(templateRef.current, { useCORS: true, scale: 2 });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `Thong_Bao_Nghi_Le_${formData.holidayName || 'Holiday'}.png`;
      a.click();
    } catch (err) {
      console.error(err);
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    alert('Đã copy nội dung!');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal-content glass-panel" style={{ width: '90%', maxWidth: '900px', backgroundColor: 'var(--color-bg)', padding: '2rem', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--color-primary-dark)' }}>🎨 Studio Thông Báo: {holiday?.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <h3 style={{ marginBottom: '1rem', fontWeight: 'bold' }}>Tùy chỉnh Ảnh Thông Báo</h3>
            <div className="form-group mb-2">
              <label className="block text-sm font-semibold mb-1">Tên ngày lễ</label>
              <input type="text" value={formData.holidayName} onChange={(e) => setFormData({...formData, holidayName: e.target.value})} className="w-full p-2 border rounded-md" />
            </div>
            <div className="form-group mb-2">
              <label className="block text-sm font-semibold mb-1">Từ ngày</label>
              <input type="text" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} className="w-full p-2 border rounded-md" />
            </div>
            <div className="form-group mb-2">
              <label className="block text-sm font-semibold mb-1">Đến ngày</label>
              <input type="text" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} className="w-full p-2 border rounded-md" />
            </div>
            <div className="form-group mb-2">
              <label className="block text-sm font-semibold mb-1">Ngày học lại</label>
              <input type="text" value={formData.returnDate} onChange={(e) => setFormData({...formData, returnDate: e.target.value})} className="w-full p-2 border rounded-md" placeholder="VD: Thứ Hai, 04/09/2023" />
            </div>
            <div className="form-group mb-4">
              <label className="block text-sm font-semibold mb-1">Lời chúc</label>
              <textarea value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} className="w-full p-2 border rounded-md" rows={3}></textarea>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary flex-1" onClick={handleCopyImage} style={{ padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-copy"></i> Copy Ảnh
              </button>
              <button className="btn flex-1" style={{ backgroundColor: '#10b981', color: 'white', padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }} onClick={handleDownloadImage}>
                <i className="fa-solid fa-download"></i> Tải Ảnh
              </button>
            </div>
          </div>

          <div>
            <h3 style={{ marginBottom: '1rem', fontWeight: 'bold' }}>Nội dung gợi ý (AI Content)</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button className={`btn ${activeTab === 'Zalo' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('Zalo')} style={{ flex: 1 }}>Zalo</button>
              <button className={`btn ${activeTab === 'Facebook' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('Facebook')} style={{ flex: 1 }}>Facebook</button>
            </div>
            
            {loadingAi ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <i className="fa-solid fa-spinner fa-spin"></i> Đang tạo nội dung...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {(activeTab === 'Zalo' ? aiContent.zaloOptions : aiContent.fbOptions).map((opt, idx) => (
                  <div key={idx} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', position: 'relative', whiteSpace: 'pre-wrap', backgroundColor: 'var(--color-bg)' }}>
                    <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{opt}</div>
                    <button 
                      onClick={() => copyText(opt)} 
                      style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <HolidayNoticeTemplate ref={templateRef} data={formData} />
      </div>
    </div>
  );
}
