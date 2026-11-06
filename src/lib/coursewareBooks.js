/**
 * Danh mục giáo trình & học liệu chuẩn hóa của Trung tâm Anh ngữ Nhật - Mỹ
 */
export const AVAILABLE_COURSEWARE_BOOKS = [
  { code: 'beehive_starter', title: 'Beehive Starter', level: 'Mầm non / Pre-Starters', color: '#E11D48' },
  { code: 'beehive_1', title: 'Beehive 1', level: 'Tiểu học / Starters 1', color: '#EA580C' },
  { code: 'beehive_2', title: 'Beehive 2', level: 'Tiểu học / Movers 1', color: '#D97706' },
  { code: 'beehive_3', title: 'Beehive 3', level: 'Tiểu học / Movers 2', color: '#059669' },
  { code: 'beehive_4', title: 'Beehive 4', level: 'Tiểu học / Flyers', color: '#0284C7' },
  { code: 'think_starters', title: 'Think Starters', level: 'Trung học cơ sở', color: '#7C3AED' },
  { code: 'ket_b1', title: 'B1 Preliminary (PET)', level: 'Luyện thi Cambridge', color: '#4F46E5' },
];

/**
 * Lấy danh sách mã sách mặc định dựa trên thông tin lớp học
 */
export function getBookCodesFromClass(classInfo) {
  if (!classInfo) return [];
  const level = (classInfo.level || '').toUpperCase().trim();
  const code = (classInfo.code || classInfo.classCode || '').toUpperCase().trim();

  const books = [];

  if (level.includes('STARTER') || level.includes('BEEHIVE_START') || code.includes('STARTER')) {
    books.push('beehive_starter');
  }
  if (level.includes('BEEHIVE_1') || level === 'BH1' || level === 'S1' || level === 'M1' || code.includes('BH1') || code.includes('S1')) {
    books.push('beehive_1');
  }
  if (level.includes('BEEHIVE_2') || level === 'BH2' || level === 'S2' || level === 'M2' || code.includes('BH2') || code.includes('S2')) {
    books.push('beehive_2');
  }
  if (level.includes('BEEHIVE_3') || level === 'BH3' || level === 'S3' || level === 'M3' || code.includes('BH3') || code.includes('S3')) {
    books.push('beehive_3');
  }
  if (level.includes('BEEHIVE_4') || level === 'BH4' || level === 'S4' || level === 'F1' || level === 'F2' || code.includes('BH4')) {
    books.push('beehive_4');
  }

  // Mặc định nếu chưa match được mà có chứa 'BEEHIVE'
  if (books.length === 0 && (level.includes('BEEHIVE') || code.includes('BEEHIVE'))) {
    books.push('beehive_1');
  }

  return books;
}

/**
 * Parse chuỗi customBookCodes từ DB (hỗ trợ JSON mảng hoặc danh sách phân cách bằng dấu phẩy)
 */
export function parseCustomBookCodes(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(b => String(b).trim().toLowerCase()).filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(b => String(b).trim().toLowerCase()).filter(Boolean);
    }
  } catch (e) {
    // Không phải JSON, xử lý chuỗi phân tách dấu phẩy
  }
  return String(raw)
    .split(',')
    .map(b => b.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Tổng hợp toàn bộ giáo trình thực tế của học viên (Sách lớp + Sách cấp thêm)
 */
export function getEffectiveBooksForStudent(student, classInfo = null) {
  const targetClass = classInfo || {
    code: student.classCode || student.className || '',
    level: student.level || student.classLevel || student.classCode || '',
  };

  const classBooks = getBookCodesFromClass(targetClass);
  const customBooks = parseCustomBookCodes(student.customBookCodes);

  // Gộp và loại trùng
  const combinedSet = new Set([...classBooks, ...customBooks]);
  const bookCodes = Array.from(combinedSet);

  // Map sang object có title & color
  return bookCodes.map(code => {
    const found = AVAILABLE_COURSEWARE_BOOKS.find(b => b.code.toLowerCase() === code.toLowerCase());
    if (found) return found;
    return {
      code,
      title: code.replace(/_/g, ' ').toUpperCase(),
      level: 'Học liệu bổ trợ',
      color: '#0B2A4A',
    };
  });
}
