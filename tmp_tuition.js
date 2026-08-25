'use client';

import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import TuitionNoticeTemplate from '../../components/TuitionNoticeTemplate';

export default function TuitionNoticeAction({ student }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const templateRef = useRef(null);

  // Form State
  const [targetClassCode, setTargetClassCode] = useState('');
  const [displayClassName, setDisplayClassName] = useState('');
  const [displayTeacherName, setDisplayTeacherName] = useState('');
  
  const [totalWeeks, setTotalWeeks] = useState(18);
  const [missedWeeks, setMissedWeeks] = useState(0);
  const [bookFee, setBookFee] = useState(250000);
  
  const [giftsText, setGiftsText] = useState('Áo thun, Balo');
  const [giftValue, setGiftValue] = useState(150000);
  const [dueDate, setDueDate] = useState('');
  const [transferContent, setTransferContent] = useState('');
  
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  
  useEffect(() => {
    if (isModalOpen && classes.length === 0) {
      fetch('/api/classes').then(r => r.json()).then(res => setClasses(res.data || []));
      fetch('/api/course-configs').then(r => r.json()).then(res => setConfigs(res.data || []));
    }
  }, [isModalOpen]);

  // Handle class selection
  useEffect(() => {
    const targetClass = classes.find(c => c.code === targetClassCode);
    if (targetClass) {
      // Clean up class name: remove CN1_ and _XX (numbers)
      let clean = targetClass.code.replace(/^CN1_/, '');
      // Try to remove the middle number (like _35)
      clean = clean.replace(/_\d+(_Ca\d+)$/, '$1');
      setDisplayClassName(`${clean} - ${targetClass.schedule || ''}`);
      
      // Auto-generate transfer content
      const nameNoAccent = student.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
  useEffect(() => {
    if (targetClassCode && classes.length > 0) {
      const targetClass = classes.find(c => c.code === targetClassCode);
      if (targetClass) {
        setDisplayClassName(`${targetClass.code} - ${targetClass.teacherName}`);
        
        // Find config matching the class level
        const config = configs.find(c => c.level === targetClass.level);
        if (config) {
          setTotalWeeks(config.durationWeeks || 0);
        } else {
          setTotalWeeks(0);
        }
        
        if (targetClass.isSubstitute && targetClass.substituteTeacherId) {
          setDisplayTeacherName(targetClass.substituteTeacherId);
        } else {
          setDisplayTeacherName(targetClass.teacherName || '');
        }

        // AUTO FILL FOR NEXT_INSTALLMENT
        const order = student.orders?.find(o => o.classCode === targetClassCode);
        if (order) {
          const debt = Math.max(0, order.feeToPay - order.amountPaid);
          setInstallmentAmount(debt);
          if (order.paymentDeadline) {
            setDueDate(new Date(order.paymentDeadline).toLocaleDateString('vi-VN'));
          }
        } else {
          setInstallmentAmount(0);
        }

        // Auto-generate transfer content
        const nameNoAccent = student.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
        const firstName = nameNoAccent.split(' ').pop().toUpperCase();
        const shortClass = targetClass.code.split('_')[0]; // e.g. S3
        setTransferContent(`${firstName} HP KHOA ${shortClass.toUpperCase()}`);

      }
    }
  }, [targetClassCode, classes, configs, student.orders, student.name]);

  // Derived state
  const targetClass = classes.find(c => c.code === targetClassCode) || null;
  const config = configs.find(c => c.level === targetClass?.level) || null;
  const targetOrder = student.orders?.find(o => o.classCode === targetClassCode) || null;

  const totalFee = config?.price || 0;
  const feePerWeek = totalWeeks > 0 ? totalFee / totalWeeks : 0;
  
  // Thuật toán làm tròn thông minh của User: Làm tròn LÊN tiền nghỉ học (nearest 10,000)
  const exactMissedFee = feePerWeek * missedWeeks;
  const roundedMissedFee = Math.ceil(exactMissedFee / 10000) * 10000;
  
  const remainingWeeks = Math.max(0, totalWeeks - missedWeeks);
  
  // Tiền còn lại = Tổng - Tiền nghỉ đã làm tròn (Luôn ra số đẹp)
  const exactRemainingFee = Math.max(0, totalFee - roundedMissedFee);
  
  // Mức hỗ trợ
  let calculatedDiscount = 0;
  if (discountPercent > 0) {
    calculatedDiscount = exactRemainingFee * (discountPercent / 100);
  } else if (discountAmount > 0) {
    calculatedDiscount = discountAmount;
  }
  
  let finalRemainingFee = Math.max(0, exactRemainingFee - calculatedDiscount);
  // Làm tròn xuống 5000 có lợi cho khách
  finalRemainingFee = Math.floor(finalRemainingFee / 5000) * 5000;
  
  const finalAmount = noticeType === 'NEW_ENROLLMENT' ? (finalRemainingFee + Number(bookFee)) : (Number(installmentAmount) + Number(bookFee));

  // Parse gifts
  const giftsArray = giftsText.split(',').map(s => s.trim()).filter(Boolean);

  const getQrUrl = () => {
    if (!targetClassCode) return '';
    return `https://img.vietqr.io/image/970422-6119916886-cTQpC6D.jpg?amount=${finalAmount}&addInfo=${encodeURIComponent(transferContent)}&accountName=CONG%20TY%20TNHH%20NGOAI%20NGU%20TRI%20THUC%20VIET`;
  };

  const templateData = {
    noticeType,
    studentName: student.name,
    shortName: student.name.split(' ').pop(),
    className: displayClassName,
    classCode: displayClassName.split(' ')[0], // just the code part
    teacherName: displayTeacherName,
    totalWeeks,
    totalFee,
    missedWeeks,
    missedFee: roundedMissedFee,
    remainingWeeks,
    originalRemainingFee: exactRemainingFee,
    discountReason: discountReason || 'Mức hỗ trợ từ Trung tâm',
    discountPercent,
    discountValue: calculatedDiscount,
    remainingFee: finalRemainingFee,
    bookFee: Number(bookFee),
    gifts: giftsArray,
    giftValue: Number(giftValue),
    dueDate,
    finalAmount,
    transferContent,
    qrUrl: getQrUrl(),
    // Data for NEXT_INSTALLMENT
    orderTotalFee: targetOrder?.feeToPay || 0,
    orderPaidAmount: targetOrder?.amountPaid || 0,
    installmentAmount: Number(installmentAmount)
  };

  const handleCopyImage = async () => {
    if (!targetClassCode) {
      alert('Vui lòng chọn lớp học');
      return;
    }
    
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
    
    if (!targetClassCode) {
      alert('Vui lòng chọn lớp học');
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
    link.download = `ThuBao_${student.name.replace(/\s+/g, '_')}_${targetClassCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="btn-secondary" 
        style={{ width: '100%', marginTop: '0.5rem', background: '#22c55e', color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'background 0.2s' }}
        onMouseOver={e => e.target.style.background = '#16a34a'}
        onMouseOut={e => e.target.style.background = '#22c55e'}
      >
        <i className="fa-solid fa-envelope-open-text"></i> Tạo Thư Báo HP
      </button>

      {/* Render component thư báo (ẩn) để chụp */}
      <TuitionNoticeTemplate ref={templateRef} data={templateData} />

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', width: '90%' }}>
            <div className="modal-header">
              <h2><i className="fa-solid fa-envelope-open-text"></i> Cấu hình Thư Báo Học Phí</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Loại thư báo</label>
                <select 
                  value={noticeType} 
                  onChange={(e) => setNoticeType(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold', color: '#0d88c4' }}
                >
                  <option value="NEW_ENROLLMENT">1. Ghi danh mới / Học thử / Bảo lưu</option>
                  <option value="NEXT_INSTALLMENT">2. Thông báo đóng học phí đợt tiếp theo (Nợ)</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Lớp học dự kiến</label>
                <select 
                  value={targetClassCode} 
                  onChange={(e) => setTargetClassCode(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">-- Chọn lớp --</option>
                  {classes.map(c => (
                    <option key={c.code} value={c.code}>{c.code} - {c.teacherName}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Tên lớp hiển thị (Rút gọn)</label>
                  <input 
                    type="text" 
                    value={displayClassName} 
                    onChange={e => setDisplayClassName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Tên GV hiển thị</label>
                  <input 
                    type="text" 
                    value={displayTeacherName} 
                    onChange={e => setDisplayTeacherName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
              </div>

              {noticeType === 'NEW_ENROLLMENT' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Tổng số tuần (của khóa)</label>
                      <input 
                        type="number" 
                        value={totalWeeks} 
                        onChange={e => setTotalWeeks(Number(e.target.value))}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Số tuần vào trễ (để trừ ra)</label>
                      <input 
                        type="number" 
                        value={missedWeeks} 
                        onChange={e => setMissedWeeks(Number(e.target.value))}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Lý do hỗ trợ / giảm giá</label>
                      <input 
                        type="text" 
                        value={discountReason} 
                        onChange={e => setDiscountReason(e.target.value)}
                        placeholder="VD: Hỗ trợ học viên bảo lưu"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Giảm (%)</label>
                        <input 
                          type="number" 
                          value={discountPercent} 
                          onChange={e => setDiscountPercent(Number(e.target.value))}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Giảm (đ)</label>
                        <input 
                          type="number" 
                          value={discountAmount} 
                          onChange={e => setDiscountAmount(Number(e.target.value))}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {noticeType === 'NEXT_INSTALLMENT' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: '#fff7ed', padding: '1rem', borderRadius: '8px', border: '1px solid #fdba74' }}>
                  <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Tổng học phí toàn khóa (đ)</label>
                    <input 
                      type="text" 
                      value={targetOrder ? targetOrder.feeToPay.toLocaleString('vi-VN') : '0'} 
                      disabled
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#f1f5f9' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Đã thanh toán đợt trước (đ)</label>
                    <input 
                      type="text" 
                      value={targetOrder ? targetOrder.amountPaid.toLocaleString('vi-VN') : '0'} 
                      disabled
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#f1f5f9' }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', color: '#ea580c' }}>Số tiền thu đợt này (đ)</label>
                    <input 
                      type="number" 
                      value={installmentAmount} 
                      onChange={e => setInstallmentAmount(Number(e.target.value))}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '2px solid #ea580c', fontWeight: 'bold' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Tiền giáo trình (đ)</label>
                  <input 
                    type="number" 
                    value={bookFee} 
                    onChange={e => setBookFee(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '8px' }}>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Quà tặng kèm (Cách nhau dấu phẩy)</label>
                  <input 
                    type="text" 
                    value={giftsText} 
                    onChange={e => setGiftsText(e.target.value)}
                    placeholder="Áo thun, Balo..."
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Tổng Giá trị quà tặng (đ)</label>
                  <input 
                    type="number" 
                    value={giftValue} 
                    onChange={e => setGiftValue(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Nội dung chuyển khoản</label>
                <input 
                  type="text" 
                  value={transferContent} 
                  onChange={e => setTransferContent(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Hạn chót thanh toán (Tùy chọn)</label>
                <input 
                  type="text" 
                  value={dueDate} 
                  onChange={e => setDueDate(e.target.value)}
                  placeholder="VD: 20-08-2026"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px dashed #cbd5e1', marginTop: '0.5rem' }}>
                {noticeType === 'NEW_ENROLLMENT' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Học phí khóa {totalWeeks} tuần:</span>
                      <strong>{totalFee.toLocaleString('vi-VN')} đ</strong>
                    </div>
                    {missedWeeks > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b' }}>
                        <span>Trừ tiền nghỉ {missedWeeks} tuần (Đã làm tròn LÊN):</span>
                        <strong>-{roundedMissedFee.toLocaleString('vi-VN')} đ</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Học phí {remainingWeeks} tuần:</span>
                      <strong>{exactRemainingFee.toLocaleString('vi-VN')} đ</strong>
                    </div>
                    {calculatedDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#16a34a' }}>
                        <span>Hỗ trợ ({discountPercent > 0 ? `${discountPercent}%` : 'Trực tiếp'}):</span>
                        <strong>-{calculatedDiscount.toLocaleString('vi-VN')} đ</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#0d88c4' }}>
                      <span>Học phí sau hỗ trợ:</span>
                      <strong>{finalRemainingFee.toLocaleString('vi-VN')} đ</strong>
                    </div>
                  </>
                )}
                {noticeType === 'NEXT_INSTALLMENT' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#ea580c' }}>
                    <span>Học phí đợt này:</span>
                    <strong>{Number(installmentAmount).toLocaleString('vi-VN')} đ</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Tiền giáo trình:</span>
                  <strong>{Number(bookFee).toLocaleString('vi-VN')} đ</strong>
                </div>
                {Number(giftValue) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b' }}>
                    <span>Tổng Giá trị quà tặng:</span>
                    <strong>{Number(giftValue).toLocaleString('vi-VN')} đ</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold' }}>KHÁCH CẦN ĐÓNG:</span>
                  <strong style={{ color: 'red', fontSize: '1.2rem' }}>{finalAmount.toLocaleString('vi-VN')} đ</strong>
                </div>
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
