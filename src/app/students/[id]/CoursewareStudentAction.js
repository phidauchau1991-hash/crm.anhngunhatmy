'use client';

import React, { useState } from 'react';
import CoursewareNoticeModal from '@/components/CoursewareNoticeModal';

export default function CoursewareStudentAction({ student, classInfo = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUpdates, setHasUpdates] = useState(false);

  // Chuẩn hóa dữ liệu học viên truyền vào modal
  const normalizedStudent = {
    ...student,
    fullName: student.name,
    classCode: student.classCode || classInfo?.code || student.enrollments?.[0]?.classCode || 'Chưa xếp lớp',
    portalToken: student.portalToken || student.parentPortalToken || '',
    customBookCodes: student.customBookCodes || null,
    retainCoursewareAccess: Boolean(student.retainCoursewareAccess),
    coursewareBlocked: Boolean(student.coursewareBlocked),
    coursewareBlockedReason: student.coursewareBlockedReason || '',
    coursewareExpiresAt: student.coursewareExpiresAt || null,
    coursewareLetterExportedAt: student.coursewareLetterExportedAt || null,
  };

  const isExported = Boolean(student.coursewareLetterExportedAt);
  const isBlocked = Boolean(student.coursewareBlocked);
  const isExpired = Boolean(
    student.coursewareExpiresAt && new Date() > new Date(student.coursewareExpiresAt)
  );
  const formattedExportedDate = isExported ? new Date(student.coursewareLetterExportedAt).toLocaleDateString('vi-VN') : null;

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
          backgroundColor: isBlocked ? '#DC2626' : (isExpired ? '#D97706' : (isExported ? '#059669' : '#0D88C4')),
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
          boxShadow: isBlocked ? '0 2px 6px rgba(220, 38, 38, 0.25)' : (isExported ? '0 2px 4px rgba(5, 150, 105, 0.25)' : '0 2px 4px rgba(13, 136, 196, 0.25)'),
          transition: 'all 0.2s ease',
        }}
        title="Xuất thư / Kiểm soát quyền truy cập học liệu số kèm mã QR"
      >
        <i
          className={
            isBlocked
              ? 'fa-solid fa-lock'
              : isExpired
              ? 'fa-solid fa-hourglass-end'
              : isExported
              ? 'fa-solid fa-circle-check'
              : 'fa-solid fa-book-open'
          }
          style={{ color: '#FFCA29', fontSize: '1rem' }}
        ></i>
        <span>
          {isBlocked
            ? '🔒 Học Liệu Đang Bị Khóa'
            : isExpired
            ? '⏳ Học Liệu Đã Hết Hạn'
            : isExported
            ? `✓ Đã Cấp Thư (${formattedExportedDate})`
            : '📚 Xuất Thư Cấp Học Liệu'}
        </span>
      </button>

      <CoursewareNoticeModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          if (hasUpdates && typeof window !== 'undefined') {
            window.location.reload();
          }
        }}
        students={[normalizedStudent]}
        classInfo={classInfo || student.enrollments?.[0]?.class}
        onStudentUpdated={() => {
          setHasUpdates(true);
        }}
      />
    </>
  );
}
