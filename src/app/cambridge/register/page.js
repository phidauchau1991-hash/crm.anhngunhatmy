'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { removeVietnameseTones, formatHotline, CAMBRIDGE_CONFIG, DEFAULT_LEVELS_CONFIG } from '@/lib/cambridgeHelper';

const LEVEL_METADATA = {
  STARTERS: { name: 'STARTERS', desc: 'Pre A1' },
  MOVERS: { name: 'MOVERS', desc: 'A1' },
  FLYERS: { name: 'FLYERS', desc: 'A2' },
  KET: { name: 'KET', desc: 'A2 Key' },
  PET: { name: 'PET', desc: 'B1 Preliminary' }
};

function RegisterContent() {
  const searchParams = useSearchParams();
  const batchIdParam = searchParams.get('batchId') || '';
  const editIdParam = searchParams.get('editId') || searchParams.get('id') || '';

  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState(null);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    fullName: '',
    gender: 'MALE',
    dob: '',
    parentPhone: '',
    parentEmail: '',
    level: 'STARTERS',
    notes: '',
    agreed: false
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');

  // 1. Fetch Batch Info & Registration (if in Edit mode)
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        // Lấy thông tin đợt thi
        const batchUrl = batchIdParam ? `/api/cambridge/public/batch?batchId=${batchIdParam}` : '/api/cambridge/public/batch';
        const batchRes = await fetch(batchUrl);
        const batchJson = await batchRes.json();

        if (!batchJson.success || !batchJson.batch) {
          setError(batchJson.error || 'Không tìm thấy đợt thi.');
          setLoading(false);
          return;
        }

        setBatch(batchJson.batch);

        // Đảm bảo cấp độ được chọn nằm trong danh sách cấp độ mở của đợt thi
        const availableLevels = batchJson.batch.activeLevels || ['STARTERS', 'MOVERS', 'FLYERS', 'KET', 'PET'];
        const initialLevel = availableLevels[0] || 'STARTERS';

        if (!editIdParam) {
          setFormData(prev => ({
            ...prev,
            level: availableLevels.includes(prev.level) ? prev.level : initialLevel
          }));
        }

        // Nếu có editId, tải dữ liệu thí sinh cũ
        if (editIdParam) {
          setIsEditMode(true);
          const regRes = await fetch(`/api/cambridge/public/registration?id=${editIdParam}`);
          const regJson = await regRes.json();

          if (regJson.success && regJson.registration) {
            const reg = regJson.registration;
            let dobIso = '';
            if (reg.dob) {
              try {
                dobIso = new Date(reg.dob).toISOString().slice(0, 10);
              } catch (e) {}
            }

            setFormData({
              fullName: reg.fullName || '',
              gender: reg.gender || 'MALE',
              dob: dobIso,
              parentPhone: reg.parentPhone || '',
              parentEmail: reg.parentEmail || '',
              level: reg.level || 'STARTERS',
              notes: reg.notes || '',
              agreed: true
            });
          } else {
            setError(regJson.error || 'Không thể tải thông tin hồ sơ cần sửa.');
          }
        }
      } catch (err) {
        console.error('Error loading registration portal:', err);
        setError('Lỗi kết nối máy chủ. Vui lòng thử lại sau!');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [batchIdParam, editIdParam]);

  // Cấp độ và biểu phí
  const levelsConfig = batch?.levelsConfig || DEFAULT_LEVELS_CONFIG;
  const activeLevels = (batch?.activeLevels && batch.activeLevels.length > 0)
    ? batch.activeLevels
    : ['STARTERS', 'MOVERS', 'FLYERS', 'KET', 'PET'];
  const currentFee = Number(levelsConfig[formData.level]) || DEFAULT_LEVELS_CONFIG[formData.level] || 1200000;
  const fullNameNoTone = removeVietnameseTones(formData.fullName);
  const transferContentPreview = `CAM - ${fullNameNoTone || 'HOTEN'}`;

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(key);
    setTimeout(() => setCopySuccess(''), 2500);
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError('Vui lòng điền Họ và tên thí sinh');
      return;
    }
    if (!formData.dob) {
      setError('Vui lòng chọn ngày tháng năm sinh của thí sinh');
      return;
    }
    if (!formData.parentPhone.trim()) {
      setError('Vui lòng điền số điện thoại phụ huynh');
      return;
    }
    if (!formData.parentEmail.trim() || !formData.parentEmail.includes('@')) {
      setError('Vui lòng điền địa chỉ email chính xác để nhận phiếu xác nhận');
      return;
    }
    if (!formData.agreed) {
      setError('Quý phụ huynh vui lòng tích chọn đồng ý cam kết quy chế thi');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        batchId: batch.id,
        registrationId: editIdParam || undefined,
        fullName: formData.fullName.trim(),
        gender: formData.gender,
        dob: formData.dob,
        parentPhone: formData.parentPhone.trim(),
        parentEmail: formData.parentEmail.trim(),
        level: formData.level,
        notes: formData.notes.trim()
      };

      const res = await fetch('/api/cambridge/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setSubmitResult(data);
        setSubmitSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setError(data.error || 'Có lỗi xảy ra khi gửi đăng ký.');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối máy chủ. Vui lòng kiểm tra đường truyền.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: '4px solid #e2e8f0',
          borderTopColor: '#0c83c1',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ marginTop: '1rem', color: '#0c83c1', fontWeight: 'bold' }}>
          Đang tải cổng đăng ký Cambridge...
        </p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
      backgroundSize: '24px 24px',
      padding: '1.5rem 1rem'
    }}>
      <div style={{
        maxWidth: '680px',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0'
      }}>
        {/* ============ BRAND HEADER ============ */}
        <div style={{
          background: 'linear-gradient(135deg, #0c83c1 0%, #08537a 100%)',
          color: 'white',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          position: 'relative'
        }}>
          {/* Top Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(5px)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
            marginBottom: '10px'
          }}>
            <i className="fa-solid fa-award" style={{ color: '#ffcc29' }}></i>
            HỘI ĐỒNG THI ĐẠI HỌC CAMBRIDGE ({batch?.authorizedCenter || 'VN120'})
          </div>

          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: 'clamp(1.25rem, 5.5vw, 1.75rem)',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap'
          }}>
            {CAMBRIDGE_CONFIG.TEN_NGAN}
          </h1>

          <div style={{
            fontSize: '1rem',
            opacity: 0.95,
            fontWeight: '600',
            color: '#ffcc29'
          }}>
            {batch?.title || 'Kỳ thi Chứng chỉ Quốc tế Cambridge'}
          </div>

          {batch && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginTop: '14px',
              fontSize: '0.825rem',
              color: 'rgba(255, 255, 255, 0.9)'
            }}>
              <span><i className="fa-regular fa-calendar-check"></i> Ngày thi: <b>{batch.examDateFormatted || 'Đang cập nhật'}</b></span>
              <span>•</span>
              <span><i className="fa-regular fa-clock"></i> Hạn chót: <b style={{ color: '#fef08a' }}>{batch.deadlineFormatted || 'Đang cập nhật'}</b></span>
            </div>
          )}
        </div>

        {/* ============ EDIT MODE BADGE ============ */}
        {isEditMode && !submitSuccess && (
          <div style={{
            background: '#fef3c7',
            borderBottom: '1px solid #fde68a',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            color: '#92400e'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-pen-to-square"></i>
              <span><b>Chế độ chỉnh sửa:</b> Quý phụ huynh đang cập nhật lại thông tin thí sinh.</span>
            </div>
          </div>
        )}

        {/* ============ ERROR BANNER ============ */}
        {error && (
          <div style={{
            margin: '1.25rem 1.5rem 0',
            padding: '1rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '10px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '1.2rem', flexShrink: 0 }}></i>
            <span>{error}</span>
          </div>
        )}

        {/* ============ DEADLINE CLOSED WARNING ============ */}
        {batch?.isClosed && !isEditMode && (
          <div style={{
            margin: '1.25rem 1.5rem',
            padding: '1.25rem',
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '12px',
            textAlign: 'center',
            color: '#9f1239'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>
              <i className="fa-solid fa-lock"></i>
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 'bold' }}>
              ĐỢT ĐĂNG KÝ ĐÃ KHÓA
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>
              Đợt thi này đã kết thúc tiếp nhận hồ sơ trực tuyến để gửi danh sách sang Hội đồng thi Cambridge.
            </p>
            <div style={{
              display: 'inline-block',
              background: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              border: '1px solid #fecdd3'
            }}>
              Hotline hỗ trợ đặc biệt: <a href={`tel:${batch.hotline}`} style={{ color: '#0c83c1', textDecoration: 'none' }}>{batch.hotline}</a>
            </div>
          </div>
        )}

        {/* ============ SUCCESS CONFIRMATION SCREEN ============ */}
        {submitSuccess && submitResult ? (
          <div style={{ padding: '2rem 1.5rem' }}>
            {/* Success Icon */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: '#d1fae5',
                color: '#10b981',
                fontSize: '2rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
              }}>
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <h2 style={{ margin: '12px 0 6px 0', color: '#065f46', fontSize: '1.45rem', fontWeight: '800' }}>
                {submitResult.isEdit ? 'CẬP NHẬT THÀNH CÔNG!' : 'ĐĂNG KÝ DỰ THI THÀNH CÔNG!'}
              </h2>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
                Phiếu xác nhận và hướng dẫn thanh toán đã được gửi tới email:
              </p>
              <div style={{ fontWeight: 'bold', color: '#0c83c1', fontSize: '0.95rem', marginTop: '2px' }}>
                {submitResult.registration?.parentEmail}
              </div>
            </div>

            {/* Candidate Summary Card (Thiết kế dòng xếp tầng tối ưu cho mobile) */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}>
              <div style={{
                fontSize: '0.78rem',
                fontWeight: '800',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '1px solid #e2e8f0',
                whiteSpace: 'nowrap'
              }}>
                Thông tin thí sinh đăng ký
              </div>

              {/* 1. Họ và tên tiếng Việt */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '2px' }}>
                  Họ và tên tiếng Việt:
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {submitResult.registration?.fullName}
                </div>
              </div>

              {/* 2. Tên in trên chứng chỉ Cambridge */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '2px' }}>
                  Họ tên in trên chứng chỉ Cambridge:
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0c83c1', fontFamily: 'monospace', letterSpacing: '0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {submitResult.registration?.fullNameNoTone}
                </div>
              </div>

              {/* 3. Cấp độ & Ngày sinh */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '2px' }}>
                    Cấp độ dự thi:
                  </div>
                  <span style={{
                    display: 'inline-block',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontWeight: '800',
                    fontSize: '0.85rem'
                  }}>
                    {submitResult.registration?.level}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '2px' }}>
                    Ngày sinh:
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#334155' }}>
                    {submitResult.registration?.dobStr || '---'}
                  </div>
                </div>
              </div>
            </div>

            {/* VietQR Frame */}
            <div style={{
              background: '#f8fafc',
              border: '2px dashed #0c83c1',
              borderRadius: '14px',
              padding: '1.5rem',
              textAlign: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ margin: '0 0 6px 0', color: '#e11d48', fontSize: '1.1rem', fontWeight: '800' }}>
                QUÉT MÃ VIETQR ĐỂ HOÀN TẤT LỆ PHÍ
              </h3>
              <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#64748b' }}>
                Mở ứng dụng Ngân hàng bất kỳ, chọn <b>Quét QR</b> để tự động nhận đúng STK, Số tiền và Cú pháp:
              </p>

              {/* QR Image */}
              {submitResult.qrDataURL ? (
                <div>
                  <div style={{ display: 'inline-block', padding: '8px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <img
                      src={submitResult.qrDataURL}
                      alt="Mã VietQR Lệ phí thi"
                      style={{ maxWidth: '240px', width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
                    />
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <a
                      href={submitResult.qrDataURL}
                      download={`VietQR_Cambridge_${submitResult.registration?.fullNameNoTone || 'NhatMy'}.png`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        textDecoration: 'none'
                      }}
                    >
                      <i className="fa-solid fa-download"></i> Tải ảnh mã QR về máy
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2rem', color: '#64748b' }}>Đang tạo mã QR...</div>
              )}

              {/* Bank Transfer Details with 1-Click Copy (Thiết kế dòng xếp tầng tối ưu cho mobile) */}
              <div style={{
                textAlign: 'left',
                background: 'white',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '16px',
                marginTop: '1.25rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                {/* 1. Ngân hàng thụ hưởng */}
                <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '2px' }}>
                    Ngân hàng thụ hưởng:
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap' }}>
                    MB Bank (Ngân hàng TMCP Quân Đội)
                  </div>
                </div>

                {/* 2. Số tài khoản */}
                <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
                    Số tài khoản nhận phí:
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0c83c1', fontFamily: 'monospace', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
                      {submitResult.bankInfo?.accountNo}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(submitResult.bankInfo?.accountNo, 'stk')}
                      style={{
                        padding: '5px 12px',
                        background: '#e0f2fe',
                        border: '1px solid #bae6fd',
                        color: '#0369a1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {copySuccess === 'stk' ? '✓ Đã chép' : 'Chép STK'}
                    </button>
                  </div>
                </div>

                {/* 3. Chủ tài khoản */}
                <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '2px' }}>
                    Chủ tài khoản:
                  </div>
                  <div style={{
                    fontSize: 'clamp(0.75rem, 3.8vw, 0.95rem)',
                    fontWeight: '800',
                    color: '#1e293b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {submitResult.bankInfo?.accountName}
                  </div>
                </div>

                {/* 4. Số tiền lệ phí */}
                <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
                    Số tiền lệ phí thi:
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#10b981', whiteSpace: 'nowrap' }}>
                      {(submitResult.bankInfo?.amount || 0).toLocaleString('vi-VN')} đ
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(submitResult.bankInfo?.amount), 'sotien')}
                      style={{
                        padding: '5px 12px',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        color: '#047857',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {copySuccess === 'sotien' ? '✓ Đã chép' : 'Chép tiền'}
                    </button>
                  </div>
                </div>

                {/* 5. Nội dung chuyển khoản */}
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
                    Nội dung chuyển khoản (bắt buộc đúng cú pháp):
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      fontWeight: '900',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: 'clamp(0.85rem, 3.8vw, 1.05rem)',
                      whiteSpace: 'nowrap',
                      border: '1px dashed #f59e0b'
                    }}>
                      {submitResult.bankInfo?.transferContent}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(submitResult.bankInfo?.transferContent, 'noidung')}
                      style={{
                        padding: '6px 12px',
                        background: '#fef3c7',
                        border: '1px solid #fcd34d',
                        color: '#92400e',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {copySuccess === 'noidung' ? '✓ Đã chép' : 'Chép cú pháp'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Notices */}
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '0.85rem',
              color: '#92400e',
              lineHeight: 1.6,
              marginBottom: '1.5rem'
            }}>
              📌 <b>LƯU Ý QUAN TRỌNG:</b><br />
              • Sau khi nhận chuyển khoản, Bộ phận kế toán sẽ kiểm tra và <b>gửi Email Biên lai thu phí điện tử chính thức</b> cho Quý phụ huynh.<br />
              • Quý phụ huynh có thể kiểm tra hộp thư đến (hoặc hòm thư Spam/Quảng cáo) để xem lại phiếu xác nhận đăng ký.
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setSubmitSuccess(false);
                  setIsEditMode(true);
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  color: '#475569',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-pen"></i> Chỉnh sửa thông tin
              </button>

              <button
                type="button"
                onClick={() => {
                  setSubmitSuccess(false);
                  setIsEditMode(false);
                  setFormData({
                    fullName: '',
                    gender: 'MALE',
                    dob: '',
                    parentPhone: '',
                    parentEmail: '',
                    level: 'STARTERS',
                    notes: '',
                    agreed: false
                  });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#0c83c1',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-plus"></i> Đăng ký thêm bé khác
              </button>
            </div>
          </div>
        ) : (
          /* ============ REGISTRATION FORM ============ */
          (!batch?.isClosed || isEditMode) && (
            <form onSubmit={handleSubmit} style={{ padding: '1.75rem 1.5rem' }}>
              {/* Introduction Text */}
              <div style={{
                background: '#f8fafc',
                borderLeft: '4px solid #0c83c1',
                padding: '12px 14px',
                borderRadius: '0 8px 8px 0',
                fontSize: '0.875rem',
                color: '#475569',
                lineHeight: 1.6,
                marginBottom: '1.5rem'
              }}>
                Kính gửi Quý Phụ huynh, nhằm chuẩn bị danh sách chính thức gửi <b>Hội đồng khảo thí Đại học Cambridge ({batch?.authorizedCenter || 'VN120'})</b>, kính mời Quý phụ huynh điền thông tin đăng ký cho con bên dưới.
              </div>

              {/* Field 1: Họ và tên thí sinh (Bắt buộc chữ in hoa chuẩn VN120) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>
                  1. Họ và tên học sinh (Bắt buộc chữ in hoa) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value.toUpperCase() })}
                  placeholder="Ví dụ: CHÂU NHẬT TRƯỜNG"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    color: '#0f172a',
                    textTransform: 'uppercase',
                    fontWeight: 'bold'
                  }}
                  required
                />
                {fullNameNoTone && (
                  <div style={{
                    marginTop: '6px',
                    fontSize: '0.8rem',
                    color: '#0c83c1',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <i className="fa-solid fa-id-card"></i> In trên chứng chỉ Cambridge: <code>{fullNameNoTone}</code>
                  </div>
                )}
              </div>

              {/* Field 2: Giới tính (Thiết kế dòng riêng thoáng đãng) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>
                  2. Giới tính <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { val: 'MALE', label: 'Nam' },
                    { val: 'FEMALE', label: 'Nữ' }
                  ].map(g => (
                    <button
                      type="button"
                      key={g.val}
                      onClick={() => setFormData({ ...formData, gender: g.val })}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '10px',
                        border: formData.gender === g.val ? '2px solid #0c83c1' : '1.5px solid #cbd5e1',
                        background: formData.gender === g.val ? '#f0f9ff' : 'white',
                        color: formData.gender === g.val ? '#0c83c1' : '#475569',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {formData.gender === g.val && <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>}
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 3: Ngày sinh (Dòng riêng 100% không bị hụt) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>
                  3. Ngày tháng năm sinh của thí sinh <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    color: '#0f172a',
                    background: 'white'
                  }}
                  required
                />
              </div>

              {/* Field 4: SĐT Phụ huynh (Dòng riêng 100% không bị hụt) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>
                  4. Số điện thoại Phụ huynh (Zalo) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  placeholder="Ví dụ: 0775516982"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    color: '#0f172a'
                  }}
                  required
                />
              </div>

              {/* Field 5: Email Phụ huynh (Dòng riêng 100% không bị hụt) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>
                  5. Email Phụ huynh (Nhận phiếu đăng ký & biên lai) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  value={formData.parentEmail}
                  onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                  placeholder="Ví dụ: phuhuynh@gmail.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    color: '#0f172a'
                  }}
                  required
                />
              </div>

              {/* Field 6: Chọn cấp độ dự thi (Chỉ hiển thị các cấp độ được mở trong đợt thi này) */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
                  6. Cấp độ dự thi Cambridge <span style={{ color: '#ef4444' }}>*</span>
                </label>

                {activeLevels.length === 1 ? (
                  /* Giao diện tinh gọn, cân đối khi đợt thi chỉ mở duy nhất 1 cấp độ */
                  <div style={{
                    background: '#f0fdf4',
                    border: '2px solid #10b981',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ✓ CẤP ĐỘ ÁP DỤNG ĐỢT THI NÀY
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#065f46', background: '#dcfce7', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                        {LEVEL_METADATA[activeLevels[0]]?.desc || 'Cambridge'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#065f46', letterSpacing: '0.5px' }}>
                        {activeLevels[0]}
                      </div>
                      <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.8rem', color: '#047857', marginRight: '6px' }}>Lệ phí:</span>
                        <span style={{ fontSize: '1.3rem', fontWeight: '900', color: '#047857', whiteSpace: 'nowrap' }}>
                          {(Number(levelsConfig[activeLevels[0]]) || 1200000).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Giao diện chọn cấp độ khi đợt thi có từ 2 cấp độ trở lên */
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${activeLevels.length <= 3 ? '130px' : '110px'}, 1fr))`, gap: '8px' }}>
                      {activeLevels.map(lvlKey => {
                        const isSelected = formData.level === lvlKey;
                        const meta = LEVEL_METADATA[lvlKey] || { name: lvlKey, desc: '' };
                        const feeVal = Number(levelsConfig[lvlKey]) || DEFAULT_LEVELS_CONFIG[lvlKey] || 1200000;
                        return (
                          <div
                            key={lvlKey}
                            onClick={() => setFormData({ ...formData, level: lvlKey })}
                            style={{
                              padding: '10px 8px',
                              borderRadius: '10px',
                              border: isSelected ? '2px solid #0c83c1' : '1px solid #cbd5e1',
                              background: isSelected ? '#f0f9ff' : 'white',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.15s ease',
                              boxShadow: isSelected ? '0 2px 8px rgba(12,131,193,0.18)' : 'none'
                            }}
                          >
                            <div style={{ fontWeight: '800', color: isSelected ? '#0c83c1' : '#334155', fontSize: '0.95rem' }}>
                              {meta.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{meta.desc}</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#10b981', marginTop: '4px', whiteSpace: 'nowrap' }}>
                              {feeVal.toLocaleString('vi-VN')} đ
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Selected Fee Display */}
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      marginTop: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.9rem'
                    }}>
                      <span style={{ color: '#475569' }}>Lệ phí cấp độ <b>{formData.level}</b>:</span>
                      <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#10b981' }}>
                        {currentFee.toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Field 7: Ghi chú */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>
                  7. Ghi chú thêm (nếu có)
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ví dụ: Bé đang học lớp Panda, cần hỗ trợ ca sáng..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {/* Field 8: Cam kết GDPR & VN120 (Checkbox bắt buộc) */}
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '1.5rem'
              }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', color: '#78350f', lineHeight: 1.5 }}>
                  <input
                    type="checkbox"
                    checked={formData.agreed}
                    onChange={(e) => setFormData({ ...formData, agreed: e.target.checked })}
                    style={{ marginTop: '3px', width: '18px', height: '18px', cursor: 'pointer' }}
                    required
                  />
                  <span>
                    Tôi đồng ý cung cấp thông tin cho <b>Hội đồng thi Cambridge</b> (theo chuẩn bảo mật GDPR) và xác nhận lệ phí thi theo cấp độ đã đăng ký sẽ không được hoàn lại theo quy định của VN120 (trừ trường hợp y tế có giấy xác nhận bệnh viện).
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0c83c1 0%, #09618f 100%)',
                  color: 'white',
                  fontSize: '1.05rem',
                  fontWeight: '800',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 12px rgba(12, 131, 193, 0.35)',
                  letterSpacing: '0.5px'
                }}
              >
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Đang xử lý đăng ký...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane"></i> {isEditMode ? 'CẬP NHẬT THÔNG TIN & XEM MÃ VIETQR' : 'XÁC NHẬN ĐĂNG KÝ & XEM MÃ VIETQR'}
                  </>
                )}
              </button>
            </form>
          )
        )}

        {/* Footer */}
        <div style={{
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          padding: '14px 1.5rem',
          textAlign: 'center',
          fontSize: '0.825rem',
          color: '#64748b'
        }}>
          <div><b>{CAMBRIDGE_CONFIG.TEN_TRUNG_TAM}</b></div>
          <div style={{ marginTop: '2px' }}>
            Hotline khảo thí: <b style={{ color: '#0c83c1' }}>{batch?.hotline || CAMBRIDGE_CONFIG.HOTLINE_CHUAN}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CambridgeRegisterPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        color: '#0c83c1',
        fontWeight: 'bold'
      }}>
        Đang tải trang đăng ký...
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
