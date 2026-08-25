'use client';

import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import TrialInviteTemplate from '../components/TrialInviteTemplate';

export default function TrialInviteModal({ isOpen, onClose, lead }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const templateRef = useRef(null);

  // Form State
  const [studentName, setStudentName] = useState(lead?.name || '');
  const [className, setClassName] = useState(lead?.trialClassCode || '');
  const [startDate, setStartDate] = useState('');
  const [studyDays, setStudyDays] = useState('');
  const [studyHours, setStudyHours] = useState('');
  const [endDate, setEndDate] = useState('');
  const [centerPrep, setCenterPrep] = useState('Bộ tài liệu học thử độc quyền, vở bút viết, nước uống và không gian lớp học tương tác vui nhộn.');
  const [parentPrep, setParentPrep] = useState('Trang phục thoải mái, nụ cười tự tin và có mặt trước giờ học 05-10 phút để con làm quen với lớp nhé!');
  const [suggestedMessage, setSuggestedMessage] = useState('');

  useEffect(() => {
    if (lead) {
      setStudentName(lead.name || '');
      setClassName(lead.trialClassCode || '');
      
      let formattedDate = '';
      if (lead.trialStartDate) {
         const dateObj = new Date(lead.trialStartDate);
         if (!isNaN(dateObj.getTime())) {
             formattedDate = dateObj.toLocaleDateString('vi-VN');
         }
      }
      setStartDate(formattedDate);
      
      let guessedTime = '';
      if (lead.trialClassCode) {
         if (lead.trialClassCode.includes('T7') || lead.trialClassCode.includes('CN') || lead.trialClassCode.includes('7CN')) {
             guessedTime = 'Thứ 7, Chủ Nhật';
         } else if (lead.trialClassCode.includes('246') || lead.trialClassCode.includes('24')) {
             guessedTime = 'Thứ 2, Thứ 4, Thứ 6';
         } else if (lead.trialClassCode.includes('35') || lead.trialClassCode.includes('357')) {
             guessedTime = 'Thứ 3, Thứ 5';
         }
      }
      setStudyDays(guessedTime);
      setStudyHours('');
      setEndDate('');
      
      setSuggestedMessage(`Dạ Trung tâm Anh ngữ Nhật Mỹ xin gửi ba/mẹ thư mời học thử của bé ${lead.name || ''}. \n\nBa/mẹ lưu ảnh này lại để nhớ lịch học của bé nhé. Trung tâm đã chuẩn bị sẵn sàng để chào đón bé rồi ạ! ❤️`);
    }
  }, [lead]);

  const templateData = {
    studentName,
    className,
    studyDays,
    studyHours,
    startDate,
    endDate,
    centerPrep,
    parentPrep
  };

  const handleCopyImage = async () => {
    if (!templateRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(templateRef.current, { scale: 2, useCORS: true, logging: false });
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('Đã copy thư mời vào Clipboard! Bạn có thể dán (Ctrl+V) vào Zalo ngay.');
        } catch (err) {
          console.error(err);
          alert('Trình duyệt không hỗ trợ copy ảnh trực tiếp. Vui lòng Tải Ảnh Xuống.');
        }
      });
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi tạo ảnh.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!templateRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(templateRef.current, { scale: 2, useCORS: true, logging: false });
      const link = document.createElement('a');
      link.download = `ThuMoiHocThu_${studentName.replace(/\\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi tải ảnh.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(suggestedMessage);
    alert('Đã copy đoạn chat!');
  };

  if (!isOpen) return null;

  return (
    <>
      <TrialInviteTemplate ref={templateRef} data={templateData} />
      
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '650px', width: '90%' }}>
          <div className="modal-header">
            <h2><i className="fa-solid fa-ticket-simple"></i> Tạo Thư Mời Học Thử</h2>
            <button className="close-btn" onClick={onClose}>
              <i className="fa-solid fa-times"></i>
            </button>
          </div>
          
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Tên Học Viên</label>
                <input 
                  type="text" 
                  value={studentName} 
                  onChange={e => setStudentName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Lớp Học Thử</label>
                <input 
                  type="text" 
                  value={className} 
                  onChange={e => setClassName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Ngày Học</label>
                <input 
                  type="text" 
                  value={studyDays} 
                  onChange={e => setStudyDays(e.target.value)}
                  placeholder="VD: Thứ 3, Thứ 5"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Giờ Học</label>
                <input 
                  type="text" 
                  value={studyHours} 
                  onChange={e => setStudyHours(e.target.value)}
                  placeholder="VD: 17:30 - 19:00"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Ngày Bắt Đầu</label>
                <input 
                  type="text" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  placeholder="VD: 20/08/2026"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Ngày Kết Thúc (Dự kiến)</label>
                <input 
                  type="text" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  placeholder="VD: 22/08/2026 (2 buổi)"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Trung Tâm Chuẩn Bị</label>
              <textarea 
                value={centerPrep} 
                onChange={e => setCenterPrep(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Ba Mẹ & Bé Chuẩn Bị</label>
              <textarea 
                value={parentPrep} 
                onChange={e => setParentPrep(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
              />
            </div>

            <div style={{ backgroundColor: '#f0f9ff', padding: '1rem', borderRadius: '8px', border: '1px dashed #bae6fd' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', color: '#0369a1' }}>Gợi ý tin nhắn Zalo kèm theo</label>
              <textarea 
                value={suggestedMessage} 
                onChange={e => setSuggestedMessage(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
              />
              <button 
                onClick={handleCopyText}
                style={{ marginTop: '0.5rem', background: '#0ea5e9', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                <i className="fa-regular fa-copy"></i> Copy Đoạn Chat
              </button>
            </div>
          </div>
          
          <div className="modal-footer" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button 
              onClick={handleCopyImage} 
              className="btn-primary" 
              style={{ flex: 1, padding: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              disabled={isGenerating}
            >
              {isGenerating ? 'Đang tạo...' : <><i className="fa-solid fa-copy"></i> Copy Ảnh (Dán Zalo)</>}
            </button>
            <button 
              onClick={handleDownloadImage} 
              className="btn-secondary" 
              style={{ flex: 1, padding: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#10b981', color: 'white' }}
              disabled={isGenerating}
            >
              <i className="fa-solid fa-download"></i> Tải Ảnh Xuống
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
