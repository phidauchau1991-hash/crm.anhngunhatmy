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

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setType(initialType);
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
      setGeneratedResult(null);
      // reset fields
      setAttitude(''); setSkills(''); setPotential('');
      setSpeaking(''); setListening(''); setRw('');
    }
  }, [isOpen, initialType, defaultStudent]);

  if (!isOpen) return null;

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
          setGeneratedResult(data.data);
          setStep(2);
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
        } else {
          alert('Lỗi: ' + data.error);
        }
      }
    } catch (err) {
      alert('Đã xảy ra lỗi khi gọi AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const el = document.getElementById('review-preview-card');
    if (!el) return;
    try {
      const dataUrl = await htmlToImage.toPng(el, { quality: 1, backgroundColor: '#fff' });
      const link = document.createElement('a');
      link.download = `NhanXet_${studentName.replace(/\s+/g, '_')}_${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      alert('Lỗi khi tạo ảnh: ' + error.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto', zIndex: 9999 }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--color-primary)' }}>
            <i className="fa-solid fa-wand-magic-sparkles"></i> AI Viết Nhận Xét
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
        </div>

        {step === 1 && (
          <div>
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

            <div style={{ marginTop: '2rem', textAlign: 'right' }}>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                style={{ background: 'var(--color-primary)', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: isGenerating ? 'not-allowed' : 'pointer' }}
              >
                {isGenerating ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-robot"></i>} Sinh Nhận Xét
              </button>
            </div>
          </div>
        )}

        {step === 2 && generatedResult && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <button onClick={() => setStep(1)} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                <i className="fa-solid fa-arrow-left"></i> Quay lại sửa
              </button>
              <button onClick={handleDownload} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                <i className="fa-solid fa-download"></i> Tải Ảnh Nhận Xét
              </button>
            </div>

            <div style={{ overflowX: 'auto', background: '#f1f5f9', padding: '2rem', borderRadius: '8px', display: 'flex', justifyContent: 'center' }}>
              {type === 'trial' ? (
                <TrialReportTemplate student={{ name: studentName, classCode }} result={generatedResult} sessions={sessions} />
              ) : (
                <PeriodicReportTemplate student={{ name: studentName, classCode }} result={generatedResult} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
