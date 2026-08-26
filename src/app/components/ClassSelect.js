import React from 'react';
import { formatClassCode } from '@/lib/classHelper';

export default function ClassSelect({ classes, value, onChange, placeholder = "-- Chọn lớp --", ...props }) {
  if (!classes || !Array.isArray(classes)) return <select value={value} onChange={onChange} {...props}><option value="">{placeholder}</option></select>;

  const now = new Date();
  const activeGroups = {};
  const endedClasses = [];

  classes.forEach(c => {
    let isEnded = false;
    
    // Ưu tiên dùng sessionsRemaining nếu có (từ API trả về)
    if (c.sessionsRemaining !== undefined) {
      if (c.sessionsRemaining <= 0) isEnded = true;
    } else {
      // Fallback nếu API cũ
      if (c.status === 'Kết thúc' || c.status === 'Đã kết thúc') {
        isEnded = true;
      } else if (c.expectedEndDate) {
        const endD = new Date(c.expectedEndDate);
        if (endD < now) isEnded = true;
      }
    }

    if (isEnded) {
      endedClasses.push(c);
    } else {
      // Lấy capDo từ API, nếu không có thì fallback
      const groupName = c.capDo || 'Khác';
      if (!activeGroups[groupName]) activeGroups[groupName] = [];
      activeGroups[groupName].push(c);
    }
  });

  return (
    <select value={value} onChange={onChange} {...props}>
      <option value="">{placeholder}</option>
      
      {Object.keys(activeGroups).sort().map(group => (
        <optgroup key={group} label={`--- Cấp độ ${group} ---`}>
          {activeGroups[group].map(c => (
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
