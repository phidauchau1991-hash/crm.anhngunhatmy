'use client';

import React, { useState } from 'react';
import CoursewareNoticeModal from '@/components/CoursewareNoticeModal';

export default function CoursewareStudentAction({ student, classInfo = null }) {
  const [isOpen, setIsOpen] = useState(false);

  // Chuẩn hóa dữ liệu học viên truyền vào modal
  const normalizedStudent = {
    ...student,
    fullName: student.name,
    classCode: student.classCode || classInfo?.code || student.enrollments?.[0]?.classCode || 'Chưa xếp lớp',
    portalToken: student.portalToken || student.parentPortalToken || '',
    customBookCodes: student.customBookCodes || null,
    retainCoursewareAccess: Boolean(student.retainCoursewareAccess),
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn"
        style={{
          width: '100%',
          marginTop: '0.65rem',
          padding: '0.65rem 1rem',
          backgroundColor: '#0D88C4',
          color: '#FFFFFF',
          border: '1px solid #FFCA29',
          borderRadius: '8px',
          fontWeight: '700',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(13, 136, 196, 0.25)',
          transition: 'all 0.2s ease',
        }}
        title="Xuất thư thông báo cấp phát tài khoản học liệu số kèm mã QR"
      >
        <i className="fa-solid fa-book-open" style={{ color: '#FFCA29', fontSize: '1rem' }}></i>
        <span>📚 Xuất Thư Cấp Học Liệu</span>
      </button>

      <CoursewareNoticeModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        students={[normalizedStudent]}
        classInfo={classInfo || student.enrollments?.[0]?.class}
        onStudentUpdated={(stdId, codes, retain) => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }}
      />
    </>
  );
}
