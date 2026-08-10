'use client';
import React, { useState, useEffect } from 'react';
import ReviewModal from '@/components/ReviewModal';

export default function ReviewActionClient({ studentId, studentName, classCode, milestone }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('adhoc');
  const [ms, setMs] = useState(milestone);

  useEffect(() => {
    // Check url params for action=review
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'review') {
        const typeParam = urlParams.get('type') || 'adhoc';
        const msParam = urlParams.get('milestone') || milestone;
        setModalType(typeParam);
        setMs(msParam);
        setIsModalOpen(true);
      }
    }
  }, [milestone]);

  return (
    <>
      <button 
        onClick={() => { setModalType('adhoc'); setIsModalOpen(true); }}
        className="btn-secondary" 
        style={{ width: '100%', marginTop: '0.5rem', background: '#8b5cf6', color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'background 0.2s' }}
        onMouseOver={e => e.target.style.background = '#7c3aed'}
        onMouseOut={e => e.target.style.background = '#8b5cf6'}
      >
        <i className="fa-solid fa-wand-magic-sparkles"></i> AI Viết Nhận Xét
      </button>

      <ReviewModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialType={modalType}
        defaultStudent={{ id: studentId, name: studentName, classCode: classCode, milestone: ms }}
      />
    </>
  );
}
