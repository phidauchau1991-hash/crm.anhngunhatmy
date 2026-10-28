'use client';
import React, { useState, useEffect } from 'react';
import { TrialReportTemplate, PeriodicReportTemplate } from '@/app/exams/components/ReportTemplates';
import * as htmlToImage from 'html-to-image';

export default function ReviewModal({ isOpen, onClose, initialType = 'adhoc', defaultStudent = null }) {
  const [step, setStep] = useState(1); // 1: Form, 2: Preview
  const [type, setType] = useState(initialType);
  const [studentName, setStudentName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [bilingual, setBilingual] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Trial keywords
  const [attitude, setAttitude] = useState('');
  const [skills, setSkills] = useState('');
  const [potential, setPotential] = useState('');
  const [sessions, setSessions] = useState(2);
  
  // Periodic/Adhoc keywords
  const [speaking, setSpeaking] = useState('');
  const [listening, setListening] = useState('');
  const [rw, setRw] = useState('');

  const [generatedResult, setGeneratedResult] = useState(null);

  // Persistence State
  const [reviewId, setReviewId]       = useState(null);
  const [isSaving, setIsSaving]       = useState(false);
  const [saveStatus, setSaveStatus]   = useState('');
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setType(initialType);
      setGeneratedResult(null);
      setReviewId(null);
      setSaveStatus('');
      setHasExisting(false);

      if (defaultStudent) {
        setStudentName(defaultStudent.name || '');
        setClassCode(defaultStudent.classCode || '');
        if (defaultStudent.milestone) {
          const num = parseInt(defaultStudent.milestone);
          if (!isNaN(num)) setSessions(num);
        }
      } else {
        setStudentName('');
        setClassCode('');
      }

      // Reset fields
      setAttitude(''); setSkills(''); setPotential('');
      setSpeaking(''); setListening(''); setRw('');

      // Nạp nhận xét đã lưu trước đó nếu có
      const isLead = defaultStudent?.isLead || !defaultStudent?.id;
      const targetStudentId = !isLead ? defaultStudent?.id : null;
      const targetLeadId = isLead ? (defaultStudent?.leadId || defaultStudent?.id) : (defaultStudent?.leadId || null);

      const targetType = initialType === 'trial' ? 'TRIAL_EVALUATION' : 'ADHOC_REVIEW';
      const q = targetStudentId ? `studentId=${targetStudentId}` : (targetLeadId ? `leadId=${targetLeadId}` : null);

      if (q) {
        fetch(`/api/assessments?${q}&type=${targetType}&latestOnly=true`)
          .then(res => res.json())
          .then(res => {
            if (res.success && res.data) {
              const prev = res.data;
              setReviewId(prev.id);
              setHasExisting(true);

              if (prev.classCode && !classCode) {
                setClassCode(prev.classCode);
              }

              if (prev.keywordsData && typeof prev.keywordsData === 'object') {
                const kw = prev.keywordsData;
                if (initialType === 'trial') {
                  if (kw.sessions) setSessions(parseInt(kw.sessions) || 2);
                  if (kw.attitude) setAttitude(kw.attitude);
                  if (kw.skills) setSkills(kw.skills);
                  if (kw.potential) setPotential(kw.potential);
                } else {
                  if (kw.speaking) setSpeaking(kw.speaking);
                  if (kw.listening) setListening(kw.listening);
                  if (kw.rw) setRw(kw.rw);
                  if (kw.bilingual !== undefined) setBilingual(Boolean(kw.bilingual));
                }
              }

              if (prev.commentsData && typeof prev.commentsData === 'object') {
                setGeneratedResult(prev.commentsData);
              }

              const updated = new Date(prev.updatedAt || prev.createdAt);
              setSaveStatus(`Đã lưu hồ sơ lúc ${updated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${updated.toLocaleDateString('vi-VN')}`);
            }
          })
          .catch(err => console.error('Lỗi khi tải nhận xét cũ:', err));
      }
    }
  }, [isOpen, initialType, defaultStudent]);

  if (!isOpen) return null;

  // Lưu nhận xét vào CSDL
  const handleSaveReview = async (overrideResult = null, showToast = true) => {
    setIsSaving(true);
    try {
      const isLead = defaultStudent?.isLead || !defaultStudent?.id;
      const effectiveStudentId = !isLead ? defaultStudent?.id : null;
      const effectiveLeadId = isLead ? (defaultStudent?.leadId || defaultStudent?.id) : (defaultStudent?.leadId || null);

      const targetType = type === 'trial' ? 'TRIAL_EVALUATION' : 'ADHOC_REVIEW';
      const defaultTitle = type === 'trial'
        ? `Đánh giá học thử (${sessions} buổi) - ${studentName}`
        : `Nhận xét định kỳ / đột xuất - ${studentName}`;

      const payload = {
        id: reviewId || undefined,
        studentId: effectiveStudentId,
        leadId: effectiveLeadId,
        classCode: classCode || defaultStudent?.classCode || '',
        type: targetType,
        title: defaultTitle,
        assessmentDate: new Date().toISOString(),
        keywords: type === 'trial'
          ? { attitude, skills, potential, sessions }
          : { speaking, listening, rw, bilingual },
        comments: overrideResult !== null ? overrideResult : generatedResult,
        assessorName: 'Giáo viên phụ trách',
      };

      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setReviewId(data.data.id);
        const now = new Date();
        const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('vi-VN');
        setSaveStatus(`Đã lưu hồ sơ lúc ${timeStr} ngày ${dateStr}`);
        setHasExisting(true);
        if (showToast) {
          alert('✅ Đã lưu nhận xét vào hồ sơ học viên thành công!');
        }
        return true;
      } else {
        alert('Lỗi lưu: ' + (data.error || 'Không xác định'));
        return false;
      }
    } catch (err) {
      console.error('Lỗi lưu review:', err);
      alert('Lỗi kết nối khi lưu: ' + err.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!studentName) {
      alert('Vui lòng nhập tên học viên');
      return;
    }
    
    setIsGenerating(true);
    try {
      if (type === 'trial') {
        const res = await fetch('/api/ai/trial-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName,
            sessionsAttended: sessions,
            behaviorKeywords: attitude,
            speakingKeywords: skills,
            listeningKeywords: skills,
            rwKeywords: potential, // Mượn trường để gửi
            tone: 'encouraging'
          })
        });
        const data = await res.json();
        if (data.success) {
          const raw = data.data || {};
          const normalized = {
            ...raw,
            attitude: raw.attitude ?? '',
            skills: raw.skills ?? '',
            potential: raw.potential ?? '',
            recommendation: raw.recommendation ?? raw.advice ?? '',
            advice: raw.recommendation ?? raw.advice ?? '',
          };
          setGeneratedResult(normalized);
          setStep(2);
          // Tự động lưu nhận xét vừa sinh vào cơ sở dữ liệu
          await handleSaveReview(normalized, false);
        } else {
          alert('Lỗi: ' + data.error);
        }
      } else {
        const res = await fetch('/api/ai/exam-comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName,
            speakingKeywords: speaking,
            listeningKeywords: listening,
            rwKeywords: rw,
            bilingual
          })
        });
        const data = await res.json();
        if (data.success) {
          setGeneratedResult(data.data);
          setStep(2);
          // Tự động lưu nhận xét vừa sinh vào cơ sở dữ liệu
          await handleSaveReview(data.data, false);
        } else {
          alert('Lỗi: ' + data.error);
        }
      }
    } catch (err) {
      alert('Đã xảy ra lỗi khi gọi AI: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const el = document.getElementById('review-preview-card');
    if (!el) return;
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const blob = await htmlToImage.toBlob(el, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
      if (!blob) throw new Error('Không tạo được ảnh');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `NhanXet_${studentName.replace(/\s+/g, '_')}_${new Date().getTime()}.png`;
      link.href = url;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (error) {
      alert('Lỗi khi tạo ảnh: ' + error.message);
    }
  };

  const handleCopy = async () => {
    const el = document.getElementById('review-preview-card');
    if (!el) return;
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const blob = await htmlToImage.toBlob(el, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
      if (!blob) throw new Error('Không tạo được ảnh');
      if (!navigator.clipboard || typeof window.ClipboardItem === 'undefined') {
        throw new Error('Trình duyệt không hỗ trợ copy ảnh. Vui lòng bấm Tải Ảnh.');
      }
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      alert('Đã copy ảnh vào bộ nhớ tạm. Có thể dán (Ctrl+V) vào Zalo ngay!');
    } catch (err) {
      console.error('Error copying image:', err);
      alert('Lỗi copy ảnh: ' + (err.message || 'Vui lòng bấm Tải Ảnh.'));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel animated-scale" style={{ maxWidth: step === 2 ? '1200px' : '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto', zIndex: 9999 }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: 'var(--color-primary)' }}>
              <i className="fa-solid fa-wand-magic-sparkles"></i> AI Viết Nhận Xét & Báo Cáo
            </h2>
            {saveStatus && (
              <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: '600', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <i className="fa-solid fa-check-circle"></i> {saveStatus}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
        </div>

        {step === 1 && (
          <div>
            {hasExisting && (
              <div style={{ marginBottom: '1.25rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.88rem', color: '#065f46', fontWeight: '600' }}>
                  <i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i>
                  {saveStatus || 'Đã có bản nhận xét gần nhất trong hệ thống.'}
                </span>
                {generatedResult && (
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

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <select value={type} onChange={e => setType(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                <option value="adhoc">Định kỳ / Đột xuất</option>
                <option value="trial">Học thử</option>
              </select>
              <input type="text" placeholder="Tên học viên" value={studentName} onChange={e => setStudentName(e.target.value)} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input type="text" placeholder="Mã lớp (nếu có)" value={classCode} onChange={e => setClassCode(e.target.value)} style={{ width: '150px', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>

            {type === 'trial' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Số buổi học thử</label>
                  <input type="number" min="1" value={sessions} onChange={e => setSessions(parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Thái độ & Hòa nhập</label>
                  <input type="text" placeholder="VD: ngoan, nhút nhát, thích chơi trò chơi" value={attitude} onChange={e => setAttitude(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Kỹ năng nổi bật</label>
                  <input type="text" placeholder="VD: phát âm to rõ, nghe hiểu câu lệnh tốt" value={skills} onChange={e => setSkills(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Tiềm năng & Định hướng</label>
                  <input type="text" placeholder="VD: tiếp thu nhanh, cần luyện nói thêm" value={potential} onChange={e => setPotential(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Kỹ năng Nói (Speaking)</label>
                  <input type="text" placeholder="VD: tự tin, phát âm chuẩn" value={speaking} onChange={e => setSpeaking(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Kỹ năng Nghe (Listening)</label>
                  <input type="text" placeholder="VD: phản xạ tốt, nghe hiểu nhanh" value={listening} onChange={e => setListening(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Đọc & Viết (Read/Write)</label>
                  <input type="text" placeholder="VD: nắm ngữ pháp, viết cẩn thận" value={rw} onChange={e => setRw(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
                    <input type="checkbox" checked={bilingual} onChange={e => setBilingual(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#2563eb' }} />
                    <span style={{ color: bilingual ? '#2563eb' : '#333' }}>Kèm Tiếng Anh (Song ngữ Việt - Anh)</span>
                  </label>
                </div>
              </div>
            )}

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <button 
                type="button"
                onClick={() => handleSaveReview(null, true)}
                disabled={isSaving}
                style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px' }}
              >
                <i className={`fa-solid ${isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
                {isSaving ? 'Đang lưu...' : 'Lưu Nháp Từ Khóa'}
              </button>

              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                style={{ background: 'var(--color-primary)', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: isGenerating ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(13,136,196,0.3)' }}
              >
                <i className={`fa-solid ${isGenerating ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
                {isGenerating ? 'Đang phân tích...' : 'Sinh Nhận Xét AI'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && generatedResult && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button onClick={() => setStep(1)} className="btn-secondary" style={{ padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-arrow-left"></i> Nhập lại từ khóa
              </button>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => handleSaveReview(generatedResult, true)} 
                  disabled={isSaving} 
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' }}
                >
                  <i className={`fa-solid ${isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
                  {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi Vào Hồ Sơ'}
                </button>
                <button onClick={handleCopy} style={{ background: '#0D88C4', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-copy"></i> Copy Ảnh (Dán Zalo)
                </button>
                <button onClick={handleDownload} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-download"></i> Tải Ảnh Nhận Xét
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
              
              {/* Cột 1: Live Editor */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#fff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--color-primary-dark)', fontSize: '1.1rem' }}>
                    <i className="fa-solid fa-pen-nib"></i> Chỉnh sửa Nội dung
                  </h3>
                  {saveStatus && <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>Đã lưu vào hồ sơ</span>}
                </div>
                {type === 'trial' ? (
                  <>
                    <div>
                      <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Thái độ & Hòa nhập</label>
                      <textarea
                        value={generatedResult?.attitude || ''}
                        onChange={e => setGeneratedResult(prev => ({ ...prev, attitude: e.target.value }))}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '60px', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Kỹ năng Ngôn ngữ</label>
                      <textarea
                        value={generatedResult?.skills || ''}
                        onChange={e => setGeneratedResult(prev => ({ ...prev, skills: e.target.value }))}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '60px', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Tiềm năng & Định hướng</label>
                      <textarea
                        value={generatedResult?.potential || ''}
                        onChange={e => setGeneratedResult(prev => ({ ...prev, potential: e.target.value }))}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '60px', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Lời khuyên cho Phụ huynh</label>
                      <textarea
                        value={generatedResult?.recommendation ?? generatedResult?.advice ?? ''}
                        onChange={e => setGeneratedResult(prev => ({ ...prev, recommendation: e.target.value, advice: e.target.value }))}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '60px', fontFamily: 'inherit' }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Kỹ năng Nói (Speaking)</label>
                      <textarea
                        value={generatedResult?.speaking || ''}
                        onChange={e => setGeneratedResult(prev => ({ ...prev, speaking: e.target.value }))}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '60px', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Kỹ năng Nghe (Listening)</label>
                      <textarea
                        value={generatedResult?.listening || ''}
                        onChange={e => setGeneratedResult(prev => ({ ...prev, listening: e.target.value }))}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '60px', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Đọc & Viết (Read/Write)</label>
                      <textarea
                        value={generatedResult?.rw || ''}
                        onChange={e => setGeneratedResult(prev => ({ ...prev, rw: e.target.value }))}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '60px', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Định hướng phát triển</label>
                      <textarea
                        value={generatedResult?.dev || ''}
                        onChange={e => setGeneratedResult(prev => ({ ...prev, dev: e.target.value }))}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '60px', fontFamily: 'inherit' }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Cột 2: Preview */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ overflowX: 'auto', background: '#f1f5f9', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', flex: 1, alignItems: 'flex-start' }}>
                  {type === 'trial' ? (
                    <TrialReportTemplate student={{ name: studentName, classCode }} result={generatedResult} sessions={sessions} />
                  ) : (
                    <PeriodicReportTemplate student={{ name: studentName, classCode }} result={generatedResult} />
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
