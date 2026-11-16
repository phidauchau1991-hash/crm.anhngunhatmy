import QRCode from 'qrcode';

export const BANK_ACQ_ID = '970422'; // MB Bank
export const BANK_ACCOUNT_NO = '6119916886';
export const BANK_ACCOUNT_NAME = 'CONG TY TNHH NGOAI NGU TRI THUC VIET';

function tlv(tag, value) {
  const str = String(value);
  return `${tag}${String(str.length).padStart(2, '0')}${str}`;
}

/**
 * Chuẩn hóa nội dung chuyển khoản về ASCII không dấu để tương thích 100% app ngân hàng Việt Nam.
 */
export function sanitizeVietQRMemo(raw) {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);
}

/**
 * Tính checksum CRC-16/CCITT-FALSE theo chuẩn EMVCo / NAPAS 247.
 */
function crc16ccitt(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Tạo chuỗi payload VietQR chuẩn NAPAS 247 (trùng khớp 100% với VietQR v2 API).
 */
export function buildVietQRPayload({
  amount = 0,
  addInfo = 'HP NHAT MY',
  acqId = BANK_ACQ_ID,
  accountNo = BANK_ACCOUNT_NO,
} = {}) {
  const bankInfo = tlv('00', acqId) + tlv('01', accountNo);
  const merchantAccount = tlv('00', 'A000000727') + tlv('01', bankInfo) + tlv('02', 'QRIBFTTA');
  const amtInt = Math.max(0, Math.round(Number(amount) || 0));
  const memo = sanitizeVietQRMemo(addInfo);

  const unsignedPayload =
    tlv('00', '01') +
    tlv('01', amtInt > 0 ? '12' : '11') +
    tlv('38', merchantAccount) +
    tlv('53', '704') +
    (amtInt > 0 ? tlv('54', String(amtInt)) : '') +
    tlv('58', 'VN') +
    (memo ? tlv('62', tlv('08', memo)) : '') +
    '6304';

  return unsignedPayload + crc16ccitt(unsignedPayload);
}

/**
 * Sinh trực tiếp ảnh QR PNG Data URL nội bộ (không phụ thuộc API bên thứ 3, không bao giờ dính 429/CORS).
 */
export async function generateVietQRDataURL({
  amount = 0,
  addInfo = 'HP NHAT MY',
  acqId = BANK_ACQ_ID,
  accountNo = BANK_ACCOUNT_NO,
  width = 400,
} = {}) {
  const payload = buildVietQRPayload({ amount, addInfo, acqId, accountNo });
  return QRCode.toDataURL(payload, {
    width,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}
