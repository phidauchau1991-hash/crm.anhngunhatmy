'use client';
import { useState, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import Link from 'next/link';
import { ExportImageWrapper, ScoreReportTemplate, CommentsReportTemplate, ExamNoticeTemplate, PromotionNoticeTemplate } from './components/ReportTemplates';

export default function ExamsPage() {
  const [activeTab, setActiveTab] = useState('config');
  const [classes, setClasses] = useState([]);
  const [configs, setConfigs] = useState([]);
  
  // --- Config State ---
  const [configForm, setConfigForm] = useState({
    id: null,
    level: '',
    examType: 'Cuối khóa',
    processWeight: 10,
    examWeight: 90,
    speakingWeight: 30,
    speakingMax: 40,
    listeningWeight: 20,
    listeningMax: 26,
    rwWeight: 40,
    rwMax: 36
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // --- Notice State (For Image 3 & 4) ---
  const [noticeType, setNoticeType] = useState('exam'); // 'exam' or 'promotion'
  const [noticeForm, setNoticeForm] = useState({
    speakingDate: '',
    rwDate: '',
    notes: 'Ba mẹ nhắc bé mang đầy đủ bút chì, tẩy và sáp màu nhé ạ!',
    newCourseLevel: '',
    startDate: '',
    schedule: '',
    discount: 0
  });
  const [courseConfigs, setCourseConfigs] = useState([]);

  // --- Result State ---
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedConfig, setSelectedConfig] = useState('');
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSavingResults, setIsSavingResults] = useState(false);
  const [message, setMessage] = useState(null);
  
  // --- AI State ---
  const [aiKeywords, setAiKeywords] = useState({});
  const [isGeneratingAi, setIsGeneratingAi] = useState({}); // track loading per student
  const [bilingualMode, setBilingualMode] = useState(false); // Tùy chọn song ngữ Việt-Anh
  const [previewModalData, setPreviewModalData] = useState(null); // { student, ...result } for AI comment review/edit
  const [noticeMode, setNoticeMode] = useState('general'); // 'general' or 'personalized'
  const [studentNotices, setStudentNotices] = useState({}); // { [studentId]: { selected, discount, isGiftBook } }
  const [previewStudentId, setPreviewStudentId] = useState(null);
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState('');

  useEffect(() => {
    fetchClasses();
    fetchConfigs();
    fetchCourseConfigs();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetch(`/api/students?classCode=${selectedClass}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStudents(data.data);
            const noticesObj = {};
            data.data.forEach(s => {
              noticesObj[s.id] = { selected: true, discount: 0, isGiftBook: false };
            });
            setStudentNotices(noticesObj);
            if (data.data.length > 0) setPreviewStudentId(data.data[0].id);
          }
        })
        .catch(console.error);
    } else {
      setStudents([]);
      setStudentNotices({});
      setPreviewStudentId(null);
    }
  }, [selectedClass]);

  const fetchCourseConfigs = async () => {
    try {
      const res = await fetch('/api/course-configs');
      const data = await res.json();
      if (data.success) setCourseConfigs(data.data);
    } catch (error) {
      console.error('Error fetching course configs:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes');
      const data = await res.json();
      if (data.success) setClasses(data.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/exams/config');
      const data = await res.json();
      if (data.success) setConfigs(data.data);
    } catch (error) {
      console.error('Error fetching configs:', error);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/exams/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Đã lưu cấu hình thành công!' });
        fetchConfigs();
        setConfigForm({ ...configForm, id: null }); // reset for new
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi kết nối' });
    } finally {
      setIsSavingConfig(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleEditConfig = (c) => {
    setConfigForm(c);
  };

  const handleLoadClass = async () => {
    if (!selectedClass || !selectedConfig) return;
    try {
      // Get students for class
      const clsRes = await fetch(`/api/students?classCode=${selectedClass}`);
      const clsData = await clsRes.json();
      
      // Get existing results
      const resRes = await fetch(`/api/exams/result?classCode=${selectedClass}&configId=${selectedConfig}`);
      const resData = await resRes.json();

      if (clsData.success) {
        setStudents(clsData.data);
        
        // Merge existing results or initialize empty
        const initialResults = clsData.data.map(student => {
          const existing = resData.data?.find(r => r.studentId === student.id);
          return existing || {
            studentId: student.id,
            attendanceScore: 10,
            hwScore: 10,
            activityScore: 10,
            pronunciationScore: 10,
            communicationScore: 10,
            speakingScore: 0,
            listeningScore: 0,
            rwScore: 0,
            commentSpeaking: '',
            commentListening: '',
            commentRW: '',
            commentDev: ''
          };
        });
        setResults(initialResults);

        // Load keywords
        const initialKeywords = {};
        clsData.data.forEach(student => {
          const existing = resData.data?.find(r => r.studentId === student.id);
          initialKeywords[student.id] = {
            speaking: existing?.keywordSpeaking || '',
            listening: existing?.keywordListening || '',
            rw: existing?.keywordRW || ''
          };
        });
        setAiKeywords(initialKeywords);
      }
    } catch (error) {
      console.error('Error loading class data:', error);
    }
  };

  const handleResultChange = (studentId, field, value) => {
    setResults(prev => prev.map(r => 
      r.studentId === studentId ? { ...r, [field]: value } : r
    ));
  };

  const handleKeywordChange = (studentId, field, value) => {
    setAiKeywords(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [field]: value
      }
    }));
  };

  const handleGenerateAi = async (student) => {
    const studentKeywords = aiKeywords[student.id] || {};
    setIsGeneratingAi(prev => ({ ...prev, [student.id]: true }));
    
    try {
      const res = await fetch('/api/ai/exam-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
          studentName: student.name,
          speakingKeywords: studentKeywords.speaking,
          listeningKeywords: studentKeywords.listening,
          rwKeywords: studentKeywords.rw,
          bilingual: bilingualMode
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        handleResultChange(student.id, 'commentSpeaking', data.data.speaking);
        handleResultChange(student.id, 'commentListening', data.data.listening);
        handleResultChange(student.id, 'commentRW', data.data.rw);
        handleResultChange(student.id, 'commentDev', data.data.dev);
      } else {
        alert('Lỗi khi sinh nhận xét: ' + data.error);
      }
    } catch (error) {
      alert('Lỗi kết nối AI');
    } finally {
      setIsGeneratingAi(prev => ({ ...prev, [student.id]: false }));
    }
  };

  const handleSaveResults = async () => {
    setIsSavingResults(true);
    try {
      const payloadResults = results.map(r => ({
        ...r,
        keywordSpeaking: aiKeywords[r.studentId]?.speaking || '',
        keywordListening: aiKeywords[r.studentId]?.listening || '',
        keywordRW: aiKeywords[r.studentId]?.rw || ''
      }));

      const res = await fetch('/api/exams/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classCode: selectedClass,
          configId: selectedConfig,
          examDate,
          results: payloadResults
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Đã lưu điểm thi thành công!' });
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi kết nối' });
    } finally {
      setIsSavingResults(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleBatchExportNotices = async () => {
    if (!selectedClass || !noticeForm.newCourseLevel) return;
    const selectedStudents = students.filter(s => studentNotices[s.id]?.selected);
    if (selectedStudents.length === 0) {
      alert('Vui lòng tick chọn ít nhất 1 học viên để tải ảnh.');
      return;
    }
    setIsBatchExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const JSZip = (await import('jszip')).default;
      const { saveAs } = await import('file-saver');
      const zip = new JSZip();

      for (let i = 0; i < selectedStudents.length; i++) {
        const s = selectedStudents[i];
        setBatchProgress(`Đang nén ảnh ${i + 1}/${selectedStudents.length}: ${s.name}...`);
        const targetId = `batch-notice-${s.id}`;
        const elem = document.getElementById(targetId);
        if (elem) {
          const canvas = await html2canvas(elem, { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff',
            logging: false
          });
          const dataUrl = canvas.toDataURL('image/png');
          const base64Data = dataUrl.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
          zip.file(`Khoa_Moi_${s.name.replace(/\s+/g, '_')}.png`, base64Data, { base64: true });
          await new Promise(r => setTimeout(r, 200)); // small delay for UI rendering
        }
      }

      setBatchProgress(`Đang tải file ZIP xuống...`);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `Thong_Bao_Khoa_Moi_${classes.find(c => c.code === selectedClass)?.code || 'Lop'}.zip`);
      
      alert(`Đã hoàn tất tải xuống bộ ZIP gồm ${selectedStudents.length} ảnh thư thông báo cá nhân hóa!`);
    } catch (err) {
      console.error('Error batch exporting to zip:', err);
      alert('Đã xảy ra lỗi khi nén và tải ảnh hàng loạt.');
    } finally {
      setIsBatchExporting(false);
      setBatchProgress('');
    }
  };

  const activeConfig = configs.find(c => c.id === parseInt(selectedConfig));

  return (
    <div className="page-container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
          🎓 Đánh Giá & Báo Cáo Khóa Học
        </h1>
        <Link href="/" className="btn-secondary">
          <i className="fa-solid fa-arrow-left"></i> Quay lại Dashboard
        </Link>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '8px', background: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#166534' : '#991b1b' }}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('config')}
          style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', background: activeTab === 'config' ? '#0D88C4' : 'transparent', color: activeTab === 'config' ? 'white' : '#475569', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          ⚙️ Cấu hình Đề thi (Admin)
        </button>
        <button 
          onClick={() => setActiveTab('input')}
          style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', background: activeTab === 'input' ? '#0D88C4' : 'transparent', color: activeTab === 'input' ? 'white' : '#475569', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          📝 Nhập Điểm & Sinh Nhận Xét
        </button>
        <button 
          onClick={() => setActiveTab('notices')}
          style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', background: activeTab === 'notices' ? '#0D88C4' : 'transparent', color: activeTab === 'notices' ? 'white' : '#475569', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          📢 Tạo Thư Thông Báo (Tự động)
        </button>
      </div>

      {/* Tab 1: Config */}
      {activeTab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Form */}
          <div className="card" style={{ padding: '2rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1e293b' }}>{configForm.id ? 'Sửa Cấu Hình' : 'Tạo Cấu Hình Mới'}</h2>
            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#475569' }}>Cấp độ (Level)</label>
                <input type="text" value={configForm.level} onChange={e => setConfigForm({...configForm, level: e.target.value})} placeholder="VD: M2, S3, KET" required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#0f172a' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#475569' }}>Loại kỳ thi</label>
                <select value={configForm.examType} onChange={e => setConfigForm({...configForm, examType: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#0f172a' }}>
                  <option value="Giữa khóa">Giữa khóa</option>
                  <option value="Cuối khóa">Cuối khóa</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '0.25rem', display: 'block' }}>Trọng số Quá trình (%)</label>
                  <input type="number" value={configForm.processWeight} onChange={e => setConfigForm({...configForm, processWeight: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '0.25rem', display: 'block' }}>Trọng số Bài thi (%)</label>
                  <input type="number" value={configForm.examWeight} onChange={e => setConfigForm({...configForm, examWeight: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
              </div>
              
              <h3 style={{ marginTop: '0.5rem', fontWeight: 'bold', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Cấu trúc Bài Thi ({configForm.examWeight}%)</h3>
              
              {/* Speaking */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderLeft: '4px solid #0D88C4', paddingLeft: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', color: '#475569' }}>Trọng số NÓI (%)</label>
                  <input type="number" value={configForm.speakingWeight} onChange={e => setConfigForm({...configForm, speakingWeight: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '0.25rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', color: '#475569' }}>Điểm Tối Đa (Câu)</label>
                  <input type="number" value={configForm.speakingMax} onChange={e => setConfigForm({...configForm, speakingMax: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '0.25rem' }} />
                </div>
              </div>
              
              {/* Listening */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderLeft: '4px solid #10b981', paddingLeft: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', color: '#475569' }}>Trọng số NGHE (%)</label>
                  <input type="number" value={configForm.listeningWeight} onChange={e => setConfigForm({...configForm, listeningWeight: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '0.25rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', color: '#475569' }}>Điểm Tối Đa (Câu)</label>
                  <input type="number" value={configForm.listeningMax} onChange={e => setConfigForm({...configForm, listeningMax: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '0.25rem' }} />
                </div>
              </div>
              
              {/* R&W */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderLeft: '4px solid #FFCA29', paddingLeft: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', color: '#475569' }}>Trọng số ĐỌC & VIẾT (%)</label>
                  <input type="number" value={configForm.rwWeight} onChange={e => setConfigForm({...configForm, rwWeight: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '0.25rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', color: '#475569' }}>Điểm Tối Đa (Câu)</label>
                  <input type="number" value={configForm.rwMax} onChange={e => setConfigForm({...configForm, rwMax: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '0.25rem' }} />
                </div>
              </div>

              <button type="submit" disabled={isSavingConfig} style={{ padding: '0.875rem', marginTop: '1rem', background: '#0D88C4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'background 0.2s' }}>
                {isSavingConfig ? 'Đang lưu...' : 'Lưu Cấu Hình'}
              </button>
              {configForm.id && (
                <button type="button" onClick={() => setConfigForm({ id: null, level: '', examType: 'Cuối khóa', processWeight: 10, examWeight: 90, speakingWeight: 30, speakingMax: 40, listeningWeight: 20, listeningMax: 26, rwWeight: 40, rwMax: 36 })} style={{ padding: '0.875rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Hủy Sửa</button>
              )}
            </form>
          </div>
          
          {/* List */}
          <div className="card" style={{ padding: '2rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1e293b' }}>Danh sách Cấu hình Đã tạo</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '1rem 0.5rem', color: '#475569', fontWeight: '600' }}>Khóa/Level</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#475569', fontWeight: '600' }}>Kỳ thi</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#475569', fontWeight: '600' }}>Max Nói</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#475569', fontWeight: '600' }}>Max Nghe</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#475569', fontWeight: '600' }}>Max Đọc Viết</th>
                    <th style={{ padding: '1rem 0.5rem', color: '#475569', fontWeight: '600' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem', fontWeight: 'bold' }}>{c.level}</td>
                      <td style={{ padding: '1rem' }}>{c.examType}</td>
                      <td style={{ padding: '1rem' }}>{c.speakingMax} (Trọng số: {c.speakingWeight}%)</td>
                      <td style={{ padding: '1rem' }}>{c.listeningMax} (Trọng số: {c.listeningWeight}%)</td>
                      <td style={{ padding: '1rem' }}>{c.rwMax} (Trọng số: {c.rwWeight}%)</td>
                      <td style={{ padding: '1rem' }}>
                        <button onClick={() => handleEditConfig(c)} style={{ background: '#fef3c7', color: '#d97706', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Sửa</button>
                      </td>
                    </tr>
                  ))}
                  {configs.length === 0 && (
                    <tr><td colSpan="6" style={{ padding: '1rem', textAlign: 'center' }}>Chưa có cấu hình nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Input Scores */}
      {activeTab === 'input' && (
        <div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Chọn Lớp</label>
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="input-field" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <option value="">-- Chọn Lớp --</option>
                {classes.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Chọn Cấu Hình Đề Thi</label>
              <select value={selectedConfig} onChange={e => setSelectedConfig(e.target.value)} className="input-field" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <option value="">-- Chọn Đề --</option>
                {configs.map(c => <option key={c.id} value={c.id}>{c.level} - {c.examType}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Ngày thi</label>
              <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="input-field" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={handleLoadClass} disabled={!selectedClass || !selectedConfig} style={{ padding: '0.75rem 1.5rem', background: (!selectedClass || !selectedConfig) ? '#cbd5e1' : 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: (!selectedClass || !selectedConfig) ? 'not-allowed' : 'pointer', fontWeight: 'bold', height: '45px' }}>
                Tải Danh Sách
              </button>
            </div>
          </div>

          {students.length > 0 && activeConfig && (
            <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', fontSize: '0.9rem' }}>
                        <th style={{ padding: '1rem', borderRight: '1px solid #e2e8f0', width: '15%' }}>Học viên</th>
                        <th style={{ padding: '1rem', borderRight: '1px solid #e2e8f0', width: '22%' }}>Điểm Quá Trình (Thang 10)</th>
                        <th style={{ padding: '1rem', borderRight: '1px solid #e2e8f0', width: '15%', background: '#fef3c7' }}>NÓI (Speaking)</th>
                        <th style={{ padding: '1rem', borderRight: '1px solid #e2e8f0', width: '15%', background: '#e0f2fe' }}>NGHE (Listening)</th>
                        <th style={{ padding: '1rem', borderRight: '1px solid #e2e8f0', width: '15%', background: '#ede9fe' }}>ĐỌC VIẾT (R&W)</th>
                        <th style={{ padding: '1rem', textAlign: 'center', width: '18%', background: '#dcfce7' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(student => {
                        const r = results.find(res => res.studentId === student.id);
                        if (!r) return null;
                        return (
                          <tr key={student.id} style={{ borderBottom: '1px solid #e2e8f0', '&:hover': { background: '#f8fafc' } }}>
                            <td style={{ padding: '1rem', borderRight: '1px solid #e2e8f0', fontWeight: 'bold' }}>{student.name}</td>
                            
                            {/* Process Scores Stacked */}
                            <td style={{ padding: '0.75rem', borderRight: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{color: '#64748b'}}>Đ.danh:</span>
                                  <input type="number" min="0" max="10" step="0.5" value={r.attendanceScore} onChange={e => handleResultChange(student.id, 'attendanceScore', e.target.value)} style={{ width: '45px', padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{color: '#64748b'}}>BTVN:</span>
                                  <input type="number" min="0" max="10" step="0.5" value={r.hwScore} onChange={e => handleResultChange(student.id, 'hwScore', e.target.value)} style={{ width: '45px', padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{color: '#64748b'}}>H.động:</span>
                                  <input type="number" min="0" max="10" step="0.5" value={r.activityScore} onChange={e => handleResultChange(student.id, 'activityScore', e.target.value)} style={{ width: '45px', padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{color: '#64748b'}}>P.âm:</span>
                                  <input type="number" min="0" max="10" step="0.5" value={r.pronunciationScore} onChange={e => handleResultChange(student.id, 'pronunciationScore', e.target.value)} style={{ width: '45px', padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gridColumn: 'span 2' }}>
                                  <span style={{color: '#64748b'}}>Giao tiếp:</span>
                                  <input type="number" min="0" max="10" step="0.5" value={r.communicationScore} onChange={e => handleResultChange(student.id, 'communicationScore', e.target.value)} style={{ width: '45px', padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center' }} />
                                </div>
                              </div>
                            </td>

                            {/* Speaking */}
                            <td style={{ padding: '0.75rem', borderRight: '1px solid #e2e8f0', background: '#fef3c7' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                  <span style={{fontWeight: 'bold', color: '#b45309'}}>ĐIỂM (Max {activeConfig.speakingMax}):</span>
                                  <input type="number" min="0" max={activeConfig.speakingMax} step="0.5" value={r.speakingScore} onChange={e => handleResultChange(student.id, 'speakingScore', e.target.value)} style={{ width: '55px', padding: '0.3rem', border: '1px solid #f59e0b', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold', color: '#b45309' }} />
                                </div>
                                <input type="text" placeholder="Từ khóa nhận xét..." value={aiKeywords[student.id]?.speaking || ''} onChange={e => handleKeywordChange(student.id, 'speaking', e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #fcd34d', borderRadius: '4px', fontSize: '0.8rem' }} />
                              </div>
                            </td>

                            {/* Listening */}
                            <td style={{ padding: '0.75rem', borderRight: '1px solid #e2e8f0', background: '#e0f2fe' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                  <span style={{fontWeight: 'bold', color: '#0369a1'}}>ĐIỂM (Max {activeConfig.listeningMax}):</span>
                                  <input type="number" min="0" max={activeConfig.listeningMax} step="0.5" value={r.listeningScore} onChange={e => handleResultChange(student.id, 'listeningScore', e.target.value)} style={{ width: '55px', padding: '0.3rem', border: '1px solid #38bdf8', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold', color: '#0369a1' }} />
                                </div>
                                <input type="text" placeholder="Từ khóa nhận xét..." value={aiKeywords[student.id]?.listening || ''} onChange={e => handleKeywordChange(student.id, 'listening', e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #7dd3fc', borderRadius: '4px', fontSize: '0.8rem' }} />
                              </div>
                            </td>

                            {/* Reading & Writing */}
                            <td style={{ padding: '0.75rem', borderRight: '1px solid #e2e8f0', background: '#ede9fe' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                  <span style={{fontWeight: 'bold', color: '#6d28d9'}}>ĐIỂM (Max {activeConfig.rwMax}):</span>
                                  <input type="number" min="0" max={activeConfig.rwMax} step="0.5" value={r.rwScore} onChange={e => handleResultChange(student.id, 'rwScore', e.target.value)} style={{ width: '55px', padding: '0.3rem', border: '1px solid #a78bfa', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold', color: '#6d28d9' }} />
                                </div>
                                <input type="text" placeholder="Từ khóa nhận xét..." value={aiKeywords[student.id]?.rw || ''} onChange={e => handleKeywordChange(student.id, 'rw', e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #c4b5fd', borderRadius: '4px', fontSize: '0.8rem' }} />
                              </div>
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '0.75rem', textAlign: 'center', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', color: bilingualMode ? '#2563eb' : '#94a3b8' }}>
                                    <input type="checkbox" checked={bilingualMode} onChange={e => setBilingualMode(e.target.checked)} style={{ width: '14px', height: '14px', accentColor: '#2563eb' }} />
                                    VI-EN
                                  </label>
                                  <button 
                                    onClick={() => handleGenerateAi(student)}
                                    disabled={isGeneratingAi[student.id]}
                                    style={{ flex: 1, background: 'var(--color-secondary)', color: 'white', border: 'none', padding: '0.4rem', borderRadius: '6px', cursor: isGeneratingAi[student.id] ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                                    title="Sinh Nhận xét bằng AI"
                                  >
                                    {isGeneratingAi[student.id] ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-wand-magic-sparkles"></i> AI Viết</>}
                                  </button>
                                </div>
                                
                                <button 
                                  onClick={() => setPreviewModalData({ student, ...r })}
                                  style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }} 
                                >
                                  <i className="fa-solid fa-eye"></i> Xem / Sửa
                                </button>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                                  <ExportImageWrapper targetId={`score-report-${student.id}`} filename={`Bang_Diem_${student.name.replace(/\s/g, '_')}.png`}>
                                    <ScoreReportTemplate student={student} config={activeConfig} result={r} />
                                  </ExportImageWrapper>
                                  <ExportImageWrapper targetId={`comment-report-${student.id}`} filename={`Nhan_Xet_${student.name.replace(/\s/g, '_')}.png`}>
                                    <CommentsReportTemplate student={student} result={r} />
                                  </ExportImageWrapper>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button onClick={handleSaveResults} disabled={isSavingResults} style={{ background: 'var(--color-primary)', color: 'white', border: 'none', padding: '1rem 2rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: isSavingResults ? 'not-allowed' : 'pointer' }}>
                  {isSavingResults ? 'Đang Lưu...' : '💾 LƯU BẢNG ĐIỂM & NHẬN XÉT'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview & Edit AI Comment Modal */}
      {previewModalData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '1200px', maxHeight: '90vh', overflowY: 'auto', padding: '25px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0D88C4', paddingBottom: '15px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0D88C4', fontSize: '24px' }}>👁️ Xem trước & Chỉnh sửa Nhận xét</h3>
                <span style={{ color: '#64748b', fontSize: '16px' }}>Học viên: <b>{previewModalData.student.name}</b></span>
              </div>
              <button onClick={() => setPreviewModalData(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <div style={{ backgroundColor: '#fef3c7', padding: '12px 15px', borderRadius: '8px', borderLeft: '4px solid #f59e0b', fontSize: '14px', color: '#92400e', lineHeight: '1.5' }}>
              💡 <b>Mẹo:</b> Anh có thể chỉnh sửa thủ công các ý nhận xét dưới đây cho hoàn thiện. Mỗi kỹ năng nên có đúng <b>2 ý</b> (mỗi ý 12-15 từ, bắt đầu bằng dấu gạch ngang <code>-</code>) để đảm bảo in vừa đẹp trên 1 trang giấy A4!
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#0D88C4', marginBottom: '5px' }}>Speaking (Nói):</label>
                <textarea 
                  value={previewModalData.commentSpeaking || ''} 
                  onChange={e => setPreviewModalData({...previewModalData, commentSpeaking: e.target.value})}
                  rows={4} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', lineHeight: '1.5', fontFamily: 'inherit' }} 
                  placeholder="- Ý 1...&#10;- Ý 2..."
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#0D88C4', marginBottom: '5px' }}>Listening (Nghe):</label>
                <textarea 
                  value={previewModalData.commentListening || ''} 
                  onChange={e => setPreviewModalData({...previewModalData, commentListening: e.target.value})}
                  rows={4} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', lineHeight: '1.5', fontFamily: 'inherit' }} 
                  placeholder="- Ý 1...&#10;- Ý 2..."
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#0D88C4', marginBottom: '5px' }}>Reading & Writing (Đọc & Viết):</label>
                <textarea 
                  value={previewModalData.commentRW || ''} 
                  onChange={e => setPreviewModalData({...previewModalData, commentRW: e.target.value})}
                  rows={4} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', lineHeight: '1.5', fontFamily: 'inherit' }} 
                  placeholder="- Ý 1...&#10;- Ý 2..."
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#0D88C4', marginBottom: '5px' }}>Định hướng phát triển:</label>
                <textarea 
                  value={previewModalData.commentDev || ''} 
                  onChange={e => setPreviewModalData({...previewModalData, commentDev: e.target.value})}
                  rows={4} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', lineHeight: '1.5', fontFamily: 'inherit' }} 
                  placeholder="- Ý 1...&#10;- Ý 2..."
                />
              </div>
            </div>

            {/* Live Preview of Reports */}
            <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Comments Report */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, color: '#334155' }}>📋 Phiếu Nhận Xét A4</h4>
                  <button onClick={() => {
                     const el = document.getElementById(`modal-comment-report-${previewModalData.student.id}`);
                     if(el) {
                       import('html2canvas').then(html2canvas => {
                         html2canvas.default(el, { scale: 2, useCORS: true, backgroundColor: '#fff', logging: false }).then(canvas => {
                           const link = document.createElement('a');
                           link.download = `Nhan_Xet_${previewModalData.student.name.replace(/\s/g, '_')}.png`;
                           link.href = canvas.toDataURL('image/png');
                           link.click();
                         });
                       });
                     }
                  }} style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                    <i className="fa-solid fa-download"></i> Tải Nhận Xét
                  </button>
                </div>
                <div style={{ border: '2px dashed #cbd5e1', padding: '15px', borderRadius: '12px', background: '#f8fafc', zoom: 0.55, overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
                  <div id={`modal-comment-report-${previewModalData.student.id}`}>
                    <CommentsReportTemplate student={previewModalData.student} result={previewModalData} />
                  </div>
                </div>
              </div>

              {/* Score Report */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, color: '#334155' }}>📋 Bảng Điểm Cuối Khóa</h4>
                  <button onClick={() => {
                     const el = document.getElementById(`modal-score-report-${previewModalData.student.id}`);
                     if(el) {
                       import('html2canvas').then(html2canvas => {
                         html2canvas.default(el, { scale: 2, useCORS: true, backgroundColor: '#fff', logging: false }).then(canvas => {
                           const link = document.createElement('a');
                           link.download = `Bang_Diem_${previewModalData.student.name.replace(/\s/g, '_')}.png`;
                           link.href = canvas.toDataURL('image/png');
                           link.click();
                         });
                       });
                     }
                  }} style={{ padding: '6px 12px', background: '#0D88C4', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                    <i className="fa-solid fa-download"></i> Tải Bảng Điểm
                  </button>
                </div>
                <div style={{ border: '2px dashed #cbd5e1', padding: '15px', borderRadius: '12px', background: '#f8fafc', zoom: 0.55, overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
                  <div id={`modal-score-report-${previewModalData.student.id}`}>
                    <ScoreReportTemplate student={previewModalData.student} config={configs.find(c => c.id === parseInt(selectedConfig))} result={previewModalData} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setPreviewModalData(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}>
                Hủy bỏ
              </button>
              <button 
                onClick={async () => {
                  const updatedRes = {
                    ...results.find(res => res.studentId === previewModalData.student.id),
                    commentSpeaking: previewModalData.commentSpeaking,
                    commentListening: previewModalData.commentListening,
                    commentRW: previewModalData.commentRW,
                    commentDev: previewModalData.commentDev,
                  };
                  
                  // Update UI immediately
                  setResults(results.map(res => res.studentId === previewModalData.student.id ? updatedRes : res));
                  setPreviewModalData(null);
                  
                  // Save to Database immediately
                  try {
                    await fetch('/api/exams/result', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        classCode: selectedClass,
                        configId: selectedConfig,
                        examDate: examDate,
                        results: [{
                          ...updatedRes,
                          keywordSpeaking: aiKeywords[updatedRes.studentId]?.speaking || '',
                          keywordListening: aiKeywords[updatedRes.studentId]?.listening || '',
                          keywordRW: aiKeywords[updatedRes.studentId]?.rw || ''
                        }]
                      })
                    });
                    setMessage({ type: 'success', text: 'Đã lưu nhận xét thành công!' });
                    setTimeout(() => setMessage(null), 3000);
                  } catch(e) {
                    console.error("Lỗi lưu nhận xét", e);
                  }
                }} 
                style={{ padding: '10px 25px', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
              >
                💾 Cập nhật & Hoàn thiện Nhận xét
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Notices (Thư Thông Báo) */}
      {activeTab === 'notices' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Form Create Notice */}
          <div className="card" style={{ padding: '2rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1e293b' }}>Cấu hình Thông Báo</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#475569' }}>Lớp học áp dụng</label>
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}>
                <option value="">-- Chọn Lớp --</option>
                {classes.map(c => (
                  <option key={c.code} value={c.code}>{c.code} ({c.studentCount || 0} HV)</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <button onClick={() => setNoticeType('exam')} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', fontWeight: 'bold', border: noticeType === 'exam' ? '2px solid #0D88C4' : '1px solid #cbd5e1', background: noticeType === 'exam' ? '#f0f9ff' : 'white', color: noticeType === 'exam' ? '#0D88C4' : '#64748b', cursor: 'pointer' }}>
                <i className="fa-solid fa-calendar-days"></i> Lịch thi
              </button>
              <button onClick={() => setNoticeType('promotion')} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', fontWeight: 'bold', border: noticeType === 'promotion' ? '2px solid #FFCA29' : '1px solid #cbd5e1', background: noticeType === 'promotion' ? '#fefce8' : 'white', color: noticeType === 'promotion' ? '#d97706' : '#64748b', cursor: 'pointer' }}>
                <i className="fa-solid fa-graduation-cap"></i> Khóa mới
              </button>
            </div>

            {noticeType === 'exam' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#475569' }}>Ngày thi Nói (Speaking)</label>
                  <input type="text" value={noticeForm.speakingDate} onChange={e => setNoticeForm({...noticeForm, speakingDate: e.target.value})} placeholder="VD: Thứ Bảy, 25/07/2026" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#475569' }}>Ngày thi Đọc & Viết</label>
                  <input type="text" value={noticeForm.rwDate} onChange={e => setNoticeForm({...noticeForm, rwDate: e.target.value})} placeholder="VD: Chủ Nhật, 26/07/2026" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#475569' }}>Lời dặn dò từ Giáo viên</label>
                  <textarea value={noticeForm.notes} onChange={e => setNoticeForm({...noticeForm, notes: e.target.value})} rows={4} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#475569' }}>Khóa học tiếp theo</label>
                    <select value={noticeForm.newCourseLevel} onChange={e => setNoticeForm({...noticeForm, newCourseLevel: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <option value="">-- Chọn Khóa Mới --</option>
                      {courseConfigs.map(c => (
                        <option key={c.id} value={c.level}>{c.level} - {c.capDo} ({c.totalSessions} buổi)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#475569' }}>Chế độ thông báo</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        type="button" 
                        onClick={() => setNoticeMode('general')} 
                        style={{ flex: 1, padding: '0.75rem 0.5rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', border: noticeMode === 'general' ? '2px solid #0D88C4' : '1px solid #cbd5e1', background: noticeMode === 'general' ? '#f0f9ff' : 'white', color: noticeMode === 'general' ? '#0D88C4' : '#64748b', cursor: 'pointer' }}
                      >
                        🌐 Mẫu chung
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setNoticeMode('personalized')} 
                        style={{ flex: 1, padding: '0.75rem 0.5rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', border: noticeMode === 'personalized' ? '2px solid #10b981' : '1px solid #cbd5e1', background: noticeMode === 'personalized' ? '#ecfdf5' : 'white', color: noticeMode === 'personalized' ? '#059669' : '#64748b', cursor: 'pointer' }}
                      >
                        👤 Thư cá nhân ({students.length})
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#475569' }}>Ngày khai giảng</label>
                    <input type="text" value={noticeForm.startDate} onChange={e => setNoticeForm({...noticeForm, startDate: e.target.value})} placeholder="VD: 15/08/2026" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#475569' }}>Ngày kết thúc dự kiến</label>
                    <input type="text" value={noticeForm.endDate || ''} onChange={e => setNoticeForm({...noticeForm, endDate: e.target.value})} placeholder="Tự động tính theo số buổi" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>

                {noticeMode === 'personalized' && (
                  <div style={{ marginTop: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.9rem' }}>👤 Cấu hình Ưu đãi & Tặng sách cho Học viên:</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600', color: '#0D88C4' }}>
                        <input 
                          type="checkbox" 
                          checked={students.length > 0 && students.every(s => studentNotices[s.id]?.selected)} 
                          onChange={e => {
                            const checked = e.target.checked;
                            const next = { ...studentNotices };
                            students.forEach(s => {
                              next[s.id] = { ...(next[s.id] || { discount: 0, isGiftBook: false }), selected: checked };
                            });
                            setStudentNotices(next);
                          }}
                        /> Chọn tất cả ({students.length})
                      </label>
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                            <th style={{ padding: '0.5rem', width: '40px', textAlign: 'center' }}>Chọn</th>
                            <th style={{ padding: '0.5rem' }}>Học viên</th>
                            <th style={{ padding: '0.5rem', width: '120px' }}>Ưu đãi (đ)</th>
                            <th style={{ padding: '0.5rem', width: '90px', textAlign: 'center' }}>Đã có sách</th>
                            <th style={{ padding: '0.5rem', width: '90px', textAlign: 'center' }}>Tặng sách</th>
                            <th style={{ padding: '0.5rem', width: '70px', textAlign: 'center' }}>Xem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map(s => {
                            const sn = studentNotices[s.id] || { selected: true, discount: 0, isGiftBook: false, hasBook: false };
                            const isFocused = previewStudentId === s.id;
                            return (
                              <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0', background: isFocused ? '#f0f9ff' : 'white' }}>
                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={!!sn.selected} 
                                    onChange={e => setStudentNotices({...studentNotices, [s.id]: { ...sn, selected: e.target.checked }})} 
                                  />
                                </td>
                                <td style={{ padding: '0.5rem', fontWeight: isFocused ? 'bold' : 'normal', color: isFocused ? '#0D88C4' : '#333' }}>
                                  {s.name} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({s.id})</span>
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                  <input 
                                    type="number" 
                                    value={sn.discount || 0} 
                                    onChange={e => setStudentNotices({...studentNotices, [s.id]: { ...sn, discount: parseInt(e.target.value) || 0 }})} 
                                    style={{ width: '100%', padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                                  />
                                </td>
                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={!!sn.hasBook} 
                                    onChange={e => setStudentNotices({...studentNotices, [s.id]: { ...sn, hasBook: e.target.checked }})} 
                                  />
                                </td>
                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={!!sn.isGiftBook} 
                                    onChange={e => setStudentNotices({...studentNotices, [s.id]: { ...sn, isGiftBook: e.target.checked }})} 
                                  />
                                </td>
                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                  <button 
                                    type="button" 
                                    onClick={() => setPreviewStudentId(s.id)} 
                                    style={{ background: isFocused ? '#0D88C4' : '#e2e8f0', color: isFocused ? 'white' : '#475569', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}
                                  >
                                    👁️
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview & Export */}
          <div className="card" style={{ padding: '2rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>Xem trước & Xuất Ảnh</h2>
              {selectedClass ? (
                noticeType === 'promotion' && noticeMode === 'personalized' ? (
                  <button 
                    type="button"
                    onClick={handleBatchExportNotices} 
                    disabled={isBatchExporting || students.filter(s => studentNotices[s.id]?.selected).length === 0}
                    style={{ background: isBatchExporting ? '#94a3b8' : '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: 'bold', cursor: isBatchExporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(16,185,129,0.3)' }}
                  >
                    {isBatchExporting ? (
                      <><i className="fa-solid fa-spinner fa-spin"></i> {batchProgress || 'Đang tải...'}</>
                    ) : (
                      <><i className="fa-solid fa-layer-group"></i> 🚀 Tải Ảnh Hàng Loạt ({students.filter(s => studentNotices[s.id]?.selected).length} HV)</>
                    )}
                  </button>
                ) : (
                  <ExportImageWrapper 
                    targetId={noticeType === 'exam' ? 'exam-notice-report' : 'promotion-notice-report'} 
                    filename={noticeType === 'exam' ? `Lich_Thi_${classes.find(c => c.code === selectedClass)?.code}.png` : `Khoa_Moi_${noticeMode === 'personalized' ? 'Ca_Nhan' : 'Chung'}_${classes.find(c => c.code === selectedClass)?.code}.png`}
                  >
                    {/* Invisible render for export */}
                    <div style={{ display: 'none' }}></div>
                  </ExportImageWrapper>
                )
              ) : (
                <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>Vui lòng chọn Lớp học</span>
              )}
            </div>

            {selectedClass ? (
              <div style={{ border: '2px dashed #cbd5e1', padding: '1rem', borderRadius: '12px', background: '#f8fafc', zoom: 0.6, overflowX: 'auto' }}>
                {noticeType === 'exam' ? (
                  <ExamNoticeTemplate 
                    className={classes.find(c => c.code === selectedClass)?.code} 
                    examDates={{ speaking: noticeForm.speakingDate, rw: noticeForm.rwDate }} 
                    notes={noticeForm.notes} 
                  />
                ) : (
                  noticeForm.newCourseLevel && courseConfigs.find(c => c.level === noticeForm.newCourseLevel) ? (() => {
                    const activeCourse = courseConfigs.find(c => c.level === noticeForm.newCourseLevel);
                    const focusedStudent = students.find(s => s.id === previewStudentId) || students[0];
                    const sn = focusedStudent ? (studentNotices[focusedStudent.id] || { discount: 0, isGiftBook: false, hasBook: false }) : { discount: 0, isGiftBook: false, hasBook: false };
                    return (
                      <PromotionNoticeTemplate 
                        className={classes.find(c => c.code === selectedClass)?.code}
                        newCourse={activeCourse}
                        startDate={noticeForm.startDate}
                        endDate={noticeForm.endDate}
                        discount={noticeMode === 'personalized' ? (sn.discount || 0) : 0}
                        isGiftBook={noticeMode === 'personalized' ? (sn.isGiftBook || false) : false}
                        hasBook={noticeMode === 'personalized' ? (sn.hasBook || false) : false}
                        studentName={noticeMode === 'personalized' && focusedStudent ? focusedStudent.name : ''}
                        isPersonalized={noticeMode === 'personalized'}
                      />
                    );
                  })() : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Vui lòng chọn Khóa học tiếp theo để xem trước</div>
                  )
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>
                Chưa chọn Lớp học. Hãy chọn lớp ở cột bên trái để bắt đầu tạo thông báo.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden Container for Batch Notice Export */}
      {activeTab === 'notices' && noticeType === 'promotion' && noticeMode === 'personalized' && (
        <div style={{ position: 'absolute', left: '-9999px', top: '0', width: '794px', overflow: 'hidden', zIndex: -1 }}>
          {students.map(s => {
            const sn = studentNotices[s.id] || { selected: true, discount: 0, isGiftBook: false, hasBook: false };
            const activeCourse = courseConfigs.find(c => c.level === noticeForm.newCourseLevel);
            if (!activeCourse || !sn.selected) return null;
            return (
              <div key={s.id} id={`batch-notice-${s.id}`}>
                <PromotionNoticeTemplate 
                  className={classes.find(c => c.code === selectedClass)?.code}
                  newCourse={activeCourse}
                  startDate={noticeForm.startDate}
                  endDate={noticeForm.endDate}
                  discount={sn.discount || 0}
                  isGiftBook={sn.isGiftBook || false}
                  hasBook={sn.hasBook || false}
                  studentName={s.name}
                  isPersonalized={true}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
