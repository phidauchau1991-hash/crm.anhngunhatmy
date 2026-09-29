'use client';
import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import MonthlyAcademicReportTemplate from './MonthlyAcademicReportTemplate';
import ClassSelect from '@/app/components/ClassSelect';

export default function MonthlyReportTab({ classes }) {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [studentsData, setStudentsData] = useState([]);
  const [classDiaries, setClassDiaries] = useState([]);
  
  const [teacherKeywords, setTeacherKeywords] = useState({});
  const [aiComments, setAiComments] = useState({});
  const [isGeneratingAi, setIsGeneratingAi] = useState({});
  
  const [previewStudent, setPreviewStudent] = useState(null);
  const templateRef = useRef(null);

  // Initialize selectedMonth to current month
  useEffect(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    setSelectedMonth(`${mm}/${yyyy}`);
  }, []);

  const fetchData = async () => {
    if (!selectedMonth || !selectedClass) {
      alert('Vui lòng chọn tháng và lớp học');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports/monthly?monthYear=${encodeURIComponent(selectedMonth)}&classCode=${encodeURIComponent(selectedClass)}`);
      const data = await res.json();
      
      if (data.success) {
        setStudentsData(data.students);
        setClassDiaries(data.diaries);
        
        // Reset inputs
        setTeacherKeywords({});
        setAiComments({});
      } else {
        alert(data.error || 'Lỗi lấy dữ liệu');
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi hệ thống');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAi = async (student) => {
    const keywords = teacherKeywords[student.id] || '';
    if (!keywords.trim()) {
      const confirmRun = window.confirm('Bạn chưa nhập từ khóa nhận xét cho học viên này. AI sẽ tự viết nhận xét chung chung. Bạn có muốn tiếp tục?');
      if (!confirmRun) return;
    }

    setIsGeneratingAi(prev => ({ ...prev, [student.id]: true }));
    try {
      const res = await fetch('/api/ai/monthly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: student.name,
          stats: student.stats,
          teacherKeywords: keywords
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setAiComments(prev => ({ ...prev, [student.id]: data.data }));
      } else {
        alert(data.error || 'Lỗi gọi AI');
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi kết nối AI');
    } finally {
      setIsGeneratingAi(prev => ({ ...prev, [student.id]: false }));
    }
  };

  const handleExportImage = async (student) => {
    setPreviewStudent(student);
    // Give state time to update the hidden template
    setTimeout(async () => {
      if (!templateRef.current) return;
      
      const element = templateRef.current;
      const parent = element.parentElement;
      const oldTransform = parent ? parent.style.transform : '';
      const oldHeight = parent ? parent.style.height : '';
      
      if (parent) {
        parent.style.transform = 'none';
        parent.style.height = 'auto';
      }

      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });
        
        const dataUrl = canvas.toDataURL('image/png');
        
        // Try to copy to clipboard
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          await navigator.clipboard.write([
            new window.ClipboardItem({ 'image/png': blob })
          ]);
          alert('Đã copy ảnh vào Clipboard! Bạn có thể dán vào Zalo.');
        } catch (clipErr) {
          console.warn('Lỗi copy clipboard, chuyển sang tải file', clipErr);
          // Fallback to download
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `Bao_Cao_${selectedMonth.replace('/', '_')}_${student.name.replace(/\s+/g, '_')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        
      } catch (error) {
        console.error('Lỗi xuất ảnh:', error);
        alert('Không thể tạo ảnh. Vui lòng thử lại.');
      } finally {
        if (parent) {
          parent.style.transform = oldTransform;
          parent.style.height = oldHeight;
        }
        setPreviewStudent(null);
      }
    }, 500);
  };

  return (
    <div className="card" style={{ padding: '2rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1e293b' }}>
        Tạo Phiếu Báo Cáo Học Tập (Học Viên Tháng)
      </h2>

      {/* FILTER SECTION */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#475569' }}>Tháng / Năm</label>
          <input 
            type="text" 
            placeholder="MM/YYYY (vd: 09/2026)" 
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
          />
        </div>
        <div style={{ flex: 2 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#475569' }}>Lớp học</label>
          <ClassSelect 
            value={selectedClass} 
            onChange={e => setSelectedClass(e.target.value)} 
            classes={classes} 
            placeholder="-- Chọn Lớp --" 
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} 
          />
        </div>
        <button 
          onClick={fetchData}
          disabled={isLoading}
          style={{ padding: '0.75rem 2rem', background: '#0D88C4', color: 'white', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', height: '46px' }}
        >
          {isLoading ? 'Đang tải...' : 'Lấy Dữ Liệu'}
        </button>
      </div>

      {/* STUDENTS TABLE */}
      {studentsData.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '1rem', borderRight: '1px solid #e2e8f0', width: '15%' }}>Học viên</th>
                <th style={{ padding: '1rem', borderRight: '1px solid #e2e8f0', width: '15%' }}>Thống kê</th>
                <th style={{ padding: '1rem', borderRight: '1px solid #e2e8f0', width: '25%' }}>Từ khóa nhận xét (GV gõ)</th>
                <th style={{ padding: '1rem', borderRight: '1px solid #e2e8f0', width: '30%' }}>Nhận xét AI (Có thể sửa)</th>
                <th style={{ padding: '1rem', textAlign: 'center', width: '15%' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {studentsData.map(student => (
                <tr key={student.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '1rem', borderRight: '1px solid #e2e8f0', fontWeight: 'bold' }}>
                    {student.name}
                  </td>
                  <td style={{ padding: '1rem', borderRight: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#16a34a' }}>Đã đi: <b>{student.stats.present}</b></div>
                    <div style={{ color: '#dc2626' }}>Vắng: <b>{student.stats.absent}</b></div>
                    <div style={{ color: '#d97706' }}>Thiếu WB: <b>{student.stats.missingWb}</b></div>
                    <div style={{ color: '#7c3aed' }}>Thiếu Vid: <b>{student.stats.missingVideo}</b></div>
                  </td>
                  <td style={{ padding: '1rem', borderRight: '1px solid #e2e8f0' }}>
                    <textarea 
                      placeholder="vd: Nghe tốt, phản xạ nhanh, cần chăm làm WB hơn..."
                      value={teacherKeywords[student.id] || ''}
                      onChange={e => setTeacherKeywords(prev => ({ ...prev, [student.id]: e.target.value }))}
                      style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                    />
                    <button 
                      onClick={() => handleGenerateAi(student)}
                      disabled={isGeneratingAi[student.id]}
                      style={{ marginTop: '0.5rem', width: '100%', background: '#f59e0b', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '6px', fontWeight: 'bold', cursor: isGeneratingAi[student.id] ? 'not-allowed' : 'pointer' }}
                    >
                      {isGeneratingAi[student.id] ? 'Đang viết...' : '🤖 AI Viết Nhận Xét'}
                    </button>
                  </td>
                  <td style={{ padding: '1rem', borderRight: '1px solid #e2e8f0' }}>
                    <textarea 
                      placeholder="Kết quả AI sẽ hiện ở đây..."
                      value={aiComments[student.id] || ''}
                      onChange={e => setAiComments(prev => ({ ...prev, [student.id]: e.target.value }))}
                      style={{ width: '100%', minHeight: '120px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical', background: '#f0f9ff' }}
                    />
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    <button 
                      onClick={() => handleExportImage(student)}
                      disabled={!aiComments[student.id]}
                      style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1rem', borderRadius: '6px', fontWeight: 'bold', cursor: !aiComments[student.id] ? 'not-allowed' : 'pointer', width: '100%', opacity: !aiComments[student.id] ? 0.5 : 1 }}
                    >
                      <i className="fa-solid fa-download"></i> Tải Ảnh Báo Cáo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          Chưa có dữ liệu. Vui lòng chọn Tháng và Lớp.
        </div>
      )}

      {/* HIDDEN TEMPLATE FOR EXPORT */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <MonthlyAcademicReportTemplate 
          ref={templateRef}
          data={previewStudent ? {
            studentName: previewStudent.name,
            monthYear: selectedMonth,
            className: selectedClass,
            stats: previewStudent.stats,
            aiComment: aiComments[previewStudent.id],
            diaries: classDiaries
          } : null}
        />
      </div>
    </div>
  );
}
