import { getBookCodesFromClass, parseCustomBookCodes } from './coursewareBooks';

/**
 * Chuẩn hóa giá trị hạn dùng học liệu số (YYYY-MM-DD hoặc ISO) sang Date.
 * Ngày dạng YYYY-MM-DD được set tới 23:59:59.999 giờ Việt Nam (+07:00)
 * để học viên vẫn sử dụng trọn vẹn hết ngày hết hạn.
 */
export function parseCoursewareExpiresAt(val) {
  if (val === undefined) return undefined;
  if (val === null) return null;
  const str = String(val).trim();
  if (!str) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parsed = new Date(`${str}T23:59:59.999+07:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Định dạng ngày hết hạn theo lịch Việt Nam (DD/MM/YYYY) để hiển thị thân thiện.
 */
export function formatCoursewareExpiryVi(dateVal) {
  if (!dateVal) return '';
  try {
    const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * Định dạng YYYY-MM-DD theo múi giờ Việt Nam cho input[type="date"].
 */
export function toVnDateInputValue(dateVal) {
  if (!dateVal) return '';
  try {
    const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * Chuẩn hóa trạng thái học viên chính thức theo chuẩn API học liệu số.
 */
export function normalizeCoursewareStudentStatus(rawStatus) {
  const s = (rawStatus || '').trim();
  if (s === 'Tạm nghỉ' || s === 'Bảo lưu') return 'PAUSED';
  if (s === 'Nghỉ luôn' || s === 'Đã chuyển' || s === 'Thôi học' || s === 'Nghỉ học') return 'QUIT';
  if (s === 'Chờ xếp lớp') return 'PENDING';
  return 'ACTIVE';
}

/**
 * Đánh giá tập trung quyền truy cập Học liệu số cho cả Học viên chính thức (Student)
 * và Học viên học thử (Lead). Dùng chung cho /api/external/courseware/access và /hoclieu.
 */
export function evaluateCoursewareAccess(
  record,
  { isTrial = false, enrollments = [], trialClass = null, now = new Date() } = {}
) {
  if (!record) {
    return {
      normalizedStatus: 'QUIT',
      retainGranted: false,
      blocked: false,
      blockedReason: null,
      expiresAt: null,
      isExpired: false,
      customBookCodes: [],
      classBookCodes: [],
      effectiveBookCodes: [],
      accessGranted: false,
      accessReason: 'NO_ACCESS',
    };
  }

  const normalizedStatus = isTrial
    ? (record.status === 'Trượt' || record.status === 'Hủy' ? 'QUIT' : 'ACTIVE')
    : normalizeCoursewareStudentStatus(record.status);

  const classBookCodes = isTrial
    ? getBookCodesFromClass(trialClass)
    : [...new Set((enrollments || []).flatMap((e) => getBookCodesFromClass(e.class)))];

  const customBookCodes = parseCustomBookCodes(record.customBookCodes);
  const configuredBooks =
    customBookCodes && customBookCodes.length > 0 ? customBookCodes : classBookCodes;

  const retainGranted = Boolean(record.retainCoursewareAccess);
  const blocked = Boolean(record.coursewareBlocked);
  const blockedReason = (record.coursewareBlockedReason || '').trim() || null;

  const expiresAt = record.coursewareExpiresAt ? new Date(record.coursewareExpiresAt) : null;
  const hasValidExpiry = Boolean(expiresAt && !Number.isNaN(expiresAt.getTime()));
  const isExpired = Boolean(hasValidExpiry && now.getTime() > expiresAt.getTime());

  let accessGranted = false;
  let accessReason = 'NO_ACCESS';

  if (blocked) {
    // Ưu tiên cao nhất: công tắc khóa thủ công (độc lập trạng thái lớp)
    accessGranted = false;
    accessReason = 'BLOCKED';
  } else if (isExpired) {
    // Ưu tiên 2: hết hạn sử dụng tự động (Học thử / Cấp tạm)
    accessGranted = false;
    accessReason = 'EXPIRED';
  } else if (normalizedStatus === 'ACTIVE' || retainGranted) {
    accessGranted = true;
    accessReason = 'OK';
  } else {
    accessGranted = false;
    accessReason = normalizedStatus === 'PAUSED' ? 'PAUSED' : 'NO_ACCESS';
  }

  return {
    normalizedStatus,
    retainGranted,
    blocked,
    blockedReason,
    expiresAt: hasValidExpiry ? expiresAt : null,
    isExpired,
    customBookCodes,
    classBookCodes,
    effectiveBookCodes: accessGranted ? configuredBooks : [],
    accessGranted,
    accessReason,
  };
}

/**
 * Chuẩn hóa payload cập nhật phân quyền / khóa / hạn dùng học liệu số
 * dùng chung cho cả Học viên (Student) và Học viên học thử (Lead).
 */
export function buildCoursewareUpdateData(body = {}) {
  const {
    customBookCodes,
    retainCoursewareAccess,
    coursewareBlocked,
    coursewareBlockedReason,
    coursewareExpiresAt,
  } = body;

  const data = {};

  if (customBookCodes !== undefined) {
    let formattedCodes = '[]';
    if (Array.isArray(customBookCodes)) {
      formattedCodes = JSON.stringify([...new Set(customBookCodes.map((c) => String(c).trim()).filter(Boolean))]);
    } else if (typeof customBookCodes === 'string') {
      try {
        const parsed = JSON.parse(customBookCodes);
        formattedCodes = JSON.stringify(Array.isArray(parsed) ? parsed : []);
      } catch {
        formattedCodes = JSON.stringify([customBookCodes.trim()].filter(Boolean));
      }
    }
    data.customBookCodes = formattedCodes;
  }

  if (retainCoursewareAccess !== undefined) {
    data.retainCoursewareAccess = Boolean(retainCoursewareAccess);
  }
  if (coursewareBlocked !== undefined) {
    data.coursewareBlocked = Boolean(coursewareBlocked);
  }
  if (coursewareBlockedReason !== undefined) {
    data.coursewareBlockedReason = String(coursewareBlockedReason || '').trim() || null;
  }
  if (coursewareExpiresAt !== undefined) {
    data.coursewareExpiresAt = parseCoursewareExpiresAt(coursewareExpiresAt);
  }

  return data;
}
