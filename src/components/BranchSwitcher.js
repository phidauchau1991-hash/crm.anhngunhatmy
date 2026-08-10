'use client';

import { useState, useEffect } from 'react';

export default function BranchSwitcher({ isGlobalUser }) {
  const [selectedBranch, setSelectedBranch] = useState('ALL');

  useEffect(() => {
    // Read current selection from cookie if available
    const cookies = document.cookie.split(';');
    const branchCookie = cookies.find(c => c.trim().startsWith('crm_selected_branch='));
    if (branchCookie) {
      setSelectedBranch(branchCookie.split('=')[1]);
    }
  }, []);

  const handleBranchChange = (e) => {
    const val = e.target.value;
    setSelectedBranch(val);
    // Set cookie
    document.cookie = `crm_selected_branch=${val}; path=/; max-age=86400`; // 1 day
    // Reload page to apply new branch
    window.location.reload();
  };

  if (!isGlobalUser) return null;

  return (
    <div className="role-switch">
      <label htmlFor="branch-select" style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <i className="fa-solid fa-building"></i> Lọc Chi Nhánh:
      </label>
      <select 
        id="branch-select" 
        value={selectedBranch} 
        onChange={handleBranchChange}
        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '13px', outline: 'none' }}
      >
        <option value="ALL">Tất cả chi nhánh (Gộp)</option>
        <option value="CN1_BinhDuong">CN1 - Bình Dương</option>
        <option value="CN2_PhuMy">CN2 - Phú Mỹ</option>
      </select>
    </div>
  );
}
