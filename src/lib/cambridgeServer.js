import crypto from 'crypto';
import { removeVietnameseTones } from './cambridgeHelper.js';

const EDIT_TOKEN_SECRET = process.env.CAMBRIDGE_EDIT_SECRET || process.env.COURSEWARE_SECRET_KEY || 'nhatmy_cambridge_edit_sec_2026';

/**
 * Tạo chữ ký HMAC ngắn bảo vệ link tự chỉnh sửa đăng ký Cambridge của phụ huynh
 */
export function createCambridgeEditToken(registrationId) {
  return crypto
    .createHmac('sha256', EDIT_TOKEN_SECRET)
    .update(`cambridge_reg_${String(registrationId)}`)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Xác thực chữ ký link tự chỉnh sửa đăng ký Cambridge
 */
export function verifyCambridgeEditToken(registrationId, sig) {
  if (!registrationId || !sig || typeof sig !== 'string') return false;
  const expected = createCambridgeEditToken(registrationId);
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

/**
 * Kiểm tra hạn chót đăng ký Cambridge theo múi giờ Việt Nam (+07:00)
 */
export function evaluateBatchDeadline(batch) {
  let isClosed = batch?.status !== 'OPEN';
  let deadlineDateTime = null;
  let deadlineStr = '';

  if (batch?.registrationDeadline) {
    const d = new Date(batch.registrationDeadline);
    if (!isNaN(d.getTime())) {
      const vnDateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      const parts = (batch.closeHour || '17:00').split(':');
      const hh = String(parseInt(parts[0], 10) || 0).padStart(2, '0');
      const mm = String(parseInt(parts[1], 10) || 0).padStart(2, '0');
      deadlineDateTime = new Date(`${vnDateStr}T${hh}:${mm}:59+07:00`);
      deadlineStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
      if (new Date() > deadlineDateTime) {
        isClosed = true;
      }
    }
  }

  return { isClosed, deadlineDateTime, deadlineStr };
}

/**
 * Sinh mã biên lai Cambridge duy nhất trong ngày (BL-CAM-yyMMdd-xx) theo giờ Việt Nam
 * Tìm số thứ tự lớn nhất hiện có + 1 để tránh trùng mã khi có hồ sơ bị xóa
 */
export async function generateNextCambridgeReceiptCode(prisma, date = new Date()) {
  const vnDateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD
  const [yyyy, mm, dd] = vnDateStr.split('-');
  const yy = yyyy.slice(-2);
  const todayPrefix = `BL-CAM-${yy}${mm}${dd}-`;

  const existingCodes = await prisma.cambridgeRegistration.findMany({
    where: { receiptCode: { startsWith: todayPrefix } },
    select: { receiptCode: true }
  });

  let maxSeq = 0;
  for (const row of existingCodes) {
    if (!row.receiptCode) continue;
    const suffix = row.receiptCode.slice(todayPrefix.length);
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num > maxSeq) maxSeq = num;
  }

  const nextSeq = String(maxSeq + 1).padStart(2, '0');
  return `${todayPrefix}${nextSeq}`;
}

/**
 * Chuẩn hóa chuỗi họ tên để đối chiếu an toàn (tránh ghép nhầm anh/chị/em cùng SĐT)
 */
function normalizeComparableName(str) {
  return removeVietnameseTones(str || '').replace(/\s+/g, ' ').trim().toUpperCase();
}

/**
 * Tìm Student khớp an toàn theo họ tên (ưu tiên trùng cả SĐT lẫn tên, không link mù theo mỗi SĐT)
 */
export async function findMatchedStudentForCambridge(prisma, { fullNameUpper, parentPhone }) {
  const targetName = normalizeComparableName(fullNameUpper);
  const cleanPhone = parentPhone ? parentPhone.replace(/[^0-9]/g, '') : '';

  if (cleanPhone) {
    const phoneMatches = await prisma.student.findMany({
      where: { phone: { contains: cleanPhone.slice(-9) } },
      select: { id: true, name: true }
    });
    const exactByPhoneAndName = phoneMatches.find(
      s => normalizeComparableName(s.name) === targetName
    );
    if (exactByPhoneAndName) return exactByPhoneAndName.id;
  }

  if (targetName) {
    const allStudents = await prisma.student.findMany({
      select: { id: true, name: true }
    });
    const exactNameMatches = allStudents.filter(
      s => normalizeComparableName(s.name) === targetName
    );
    if (exactNameMatches.length === 1) {
      return exactNameMatches[0].id;
    }
  }

  return null;
}
