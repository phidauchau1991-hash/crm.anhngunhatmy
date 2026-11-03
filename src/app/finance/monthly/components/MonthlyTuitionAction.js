'use client';

import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import MonthlyNoticeTemplate from './MonthlyNoticeTemplate';

export default function MonthlyTuitionAction({ record, inlinePreview = false }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const templateRef = useRef(null);

  // Helper tính toán tháng liền kề
  const getAdjacentMonths = (my) => {
    if (!my || !my.includes('/')) return { current: my || '', prev: '', next: '' };
    const [mm, yyyy] = my.split('/');
    const m = parseInt(mm, 10);
    const y = parseInt(yyyy, 10);
    if (isNaN(m) || isNaN(y)) return { current: my, prev: '', next: '' };

    let pm = m - 1, py = y;
    if (pm === 0) { pm = 12; py -= 1; }

    let nm = m + 1, ny = y;
    if (nm === 13) { nm = 1; ny += 1; }

    return {
      current: my,
      prev: `${pm.toString().padStart(2, '0')}/${py}`,
      next: `${nm.toString().padStart(2, '0')}/${ny}`
    };
  };

  const { current: reviewedMonth, prev: defaultDebtMonth, next: nextMonth } = getAdjacentMonths(record.monthYear);
  const targetNoticeMonth = record.billingType === 'MONTHLY_PREPAID' ? nextMonth : reviewedMonth;
  const actualDebtMonth = record.debtMonth || defaultDebtMonth;

  const finalAmount = record.totalToPay || 0;
  
  // Tạo nội dung chuyển khoản và URL VietQR đồng bộ
  const nameNoAccent = record.studentName?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D") || '';
  const firstName = nameNoAccent.trim().split(' ').pop().toUpperCase();
  const transferContent = `${firstName} HP THANG ${targetNoticeMonth.replace('/', '')}`;
  
  const fallbackQrUrl = `https://img.vietqr.io/image/MB-6119916886-compact2.jpg?amount=${finalAmount}&addInfo=${encodeURIComponent(transferContent)}&accountName=CONG TY TNHH NGOAI NGU TRI THUC VIET`;

  useEffect(() => {
    if (!inlinePreview && !isModalOpen) return;
    let isMounted = true;
    fetch(`/api/vietqr?amount=${finalAmount}&addInfo=${encodeURIComponent(transferContent)}`)
      .then((r) => r.json())
      .then((res) => {
        if (isMounted && res.success && res.qrDataURL) {
          setQrDataUrl(res.qrDataURL);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [inlinePreview, isModalOpen, finalAmount, transferContent]);

  const noticeData = {
    ...record,
    debtMonth: actualDebtMonth,
    qrUrl: qrDataUrl || fallbackQrUrl,
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
          alert('Đã copy thư báo vào Clipboard! Bạn có thể dán (Ctrl+V) vào Zalo ngay.');
        } catch (err) {
          console.error(err);
          alert('Trình duyệt không hỗ trợ copy ảnh trực tiếp. Sẽ tải ảnh xuống thay thế.');
          handleDownloadImage(canvas);
        }
      });
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi tạo ảnh thư báo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadImage = (preGeneratedCanvas) => {
    if (preGeneratedCanvas && preGeneratedCanvas.toDataURL) {
        downloadCanvas(preGeneratedCanvas);
        return;
    }
    
    if (!templateRef.current) return;
    
    setIsGenerating(true);
    html2canvas(templateRef.current, { scale: 2, useCORS: true, logging: false })
      .then(downloadCanvas)
      .catch(err => {
        console.error(err);
        alert('Có lỗi xảy ra khi tải ảnh thư báo.');
      })
      .finally(() => setIsGenerating(false));
  };

  const downloadCanvas = (canvas) => {
    const link = document.createElement('a');
    link.download = `ThuBao_${record.studentName.replace(/\s+/g, '_')}_Thang_${targetNoticeMonth.replace('/', '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Nếu là chế độ xem trước inline, chỉ render template không cần button/modal
  if (inlinePreview) {
    return <MonthlyNoticeTemplate noticeData={noticeData} />;
  }

  return (
    <>
      <button 
        className="btn btn-sm" 
        style={{ backgroundColor: '#10b981', color: 'white', marginLeft: '5px' }}
        onClick={() => setIsModalOpen(true)}
      >
        <i className="fa-solid fa-image"></i> Thư báo
      </button>

      {/* Hidden template for capturing */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <MonthlyNoticeTemplate ref={templateRef} noticeData={noticeData} />
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px', width: '90%' }}>
            <div className="modal-header">
              <h2><i className="fa-solid fa-envelope-open-text"></i> Xem trước thư báo HP</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center', marginBottom: '-20%' }}>
                <MonthlyNoticeTemplate noticeData={noticeData} />
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                onClick={handleCopyImage} 
                className="btn-primary" 
                style={{ flex: 1, padding: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                disabled={isGenerating}
              >
                {isGenerating ? 'Đang tạo...' : <><i className="fa-solid fa-copy"></i> Copy Ảnh (Dán Zalo)</>}
              </button>
              <button 
                onClick={() => handleDownloadImage()} 
                className="btn-secondary" 
                style={{ flex: 1, padding: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                disabled={isGenerating}
              >
                <i className="fa-solid fa-download"></i> Tải Ảnh Xuống
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
