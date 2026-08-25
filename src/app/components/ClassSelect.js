import React from 'react';
import { formatClassCode } from '@/lib/classHelper';

export default function ClassSelect({ classes, value, onChange, placeholder = "-- Chọn lớp --", ...props }) {
  if (!classes || !Array.isArray(classes)) return <select value={value} onChange={onChange} {...props}><option value="">{placeholder}</option></select>;

  // Filter out ended classes and active classes
  const now = new Date();
  
  // Create groups by level
  const activeGroups = {};
  const endedClasses = [];

  classes.forEach(c => {
    let isEnded = false;
    if (c.status === 'Kết thúc' || c.status === 'Đã kết thúc') {
      isEnded = true;
    } else if (c.expectedEndDate) {
      const endD = new Date(c.expectedEndDate);
      if (endD < now) isEnded = true;
    }

    if (isEnded) {
      endedClasses.push(c);
    } else {
      const level = c.level || (c.code ? c.code.split('_')[1] : 'Khác') || 'Khác';
      if (!activeGroups[level]) activeGroups[level] = [];
      activeGroups[level].push(c);
    }
  });

  return (
    <select value={value} onChange={onChange} {...props}>
      <option value="">{placeholder}</option>
      
      {Object.keys(activeGroups).sort().map(level => (
        <optgroup key={level} label={`--- Cấp độ ${level} ---`}>
          {activeGroups[level].map(c => (
            <option key={c.code} value={c.code}>
              {formatClassCode(c.code)} {c.teacherName ? `- ${c.teacherName}` : ''}
            </option>
          ))}
        </optgroup>
      ))}

      {endedClasses.length > 0 && (
        <optgroup label="--- Lớp đã kết thúc ---">
          {endedClasses.map(c => (
            <option key={c.code} value={c.code} style={{ color: '#94a3b8' }}>
              [Đã đóng] {formatClassCode(c.code)}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
