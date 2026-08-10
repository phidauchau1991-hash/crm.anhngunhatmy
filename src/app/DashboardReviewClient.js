'use client';
import React, { useState, useEffect } from 'react';
import ReviewModal from '@/components/ReviewModal';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DashboardReviewClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ type: 'trial', student: null });
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'review_trial') {
      const name = searchParams.get('name') || '';
      const classCode = searchParams.get('classCode') || '';
      const sessions = searchParams.get('sessions') || '';
      
      setModalData({
        type: 'trial',
        student: { name, classCode, milestone: sessions }
      });
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const handleClose = () => {
    setIsModalOpen(false);
    // Remove query params
    router.replace('/', { scroll: false });
  };

  return (
    <ReviewModal 
      isOpen={isModalOpen}
      onClose={handleClose}
      initialType={modalData.type}
      defaultStudent={modalData.student}
    />
  );
}
