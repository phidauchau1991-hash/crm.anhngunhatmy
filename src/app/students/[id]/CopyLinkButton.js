'use client';

import { useState } from 'react';

export default function CopyLinkButton({ token }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!token) return;
    const url = window.location.origin + '/parent/' + token;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        marginTop: '0.5rem',
        padding: '0.4rem 0.8rem',
        fontSize: '0.8rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        background: copied ? 'var(--color-success)' : '#ffe07a',
        color: copied ? 'white' : '#1e293b',
        border: copied ? '1px solid var(--color-success)' : '1px solid #e2b714',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: '600',
        transition: 'all 0.2s ease',
      }}
    >
      <i className={copied ? "fa-solid fa-circle-check" : "fa-regular fa-copy"}></i>
      {copied ? 'Đã sao chép!' : 'Sao chép sổ liên lạc'}
    </button>
  );
}
