/**
 * HỆ THỐNG KHẢO THÍ CHỨNG CHỈ QUỐC TẾ CAMBRIDGE - ANH NGỮ NHẬT MỸ
 * Tiêu chuẩn nhận diện: Xanh #0c83c1 - Vàng #ffcc29
 */

export const CAMBRIDGE_CONFIG = {
  TEN_TRUNG_TAM: "TRUNG TÂM ANH NGỮ NHẬT MỸ",
  TEN_NGAN: "ANH NGỮ NHẬT MỸ",
  TEN_CONG_TY: "CÔNG TY TNHH NGOẠI NGỮ TRI THỨC VIỆT",
  TEN_TAI_KHOAN_QR: "CONG TY TNHH NGOAI NGU TRI THUC VIET",
  NGAN_HANG: "MB",
  ACQ_ID: "970422", // Mã BIN MB Bank
  SO_TAI_KHOAN: "6119916886",
  MAU_XANH_THUONG_HIEU: "#0c83c1",
  MAU_VANG_THUONG_HIEU: "#ffcc29",
  HOTLINE_CHUAN: "0911.767.069",
  DON_VI_UY_QUYEN: "VN120"
};

export const DEFAULT_LEVELS_CONFIG = {
  STARTERS: 1200000,
  MOVERS: 1300000,
  FLYERS: 1400000,
  KET: 1500000,
  PET: 1600000
};

/**
 * Chuẩn hóa họ tên in hoa không dấu (Chuẩn Cambridge & Cú pháp chuyển khoản)
 */
export function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  str = str.replace(/Đ/g, 'D');
  return str.toUpperCase().trim();
}

/**
 * Định dạng số điện thoại hotline chuẩn 0xxx.xxx.xxx
 */
export function formatHotline(val) {
  if (!val) return CAMBRIDGE_CONFIG.HOTLINE_CHUAN;
  let str = val.toString().replace(/[^0-9]/g, '');
  if (str.length === 9 && !str.startsWith('0')) {
    str = '0' + str;
  }
  if (str.length === 10) {
    return str.substring(0, 4) + '.' + str.substring(4, 7) + '.' + str.substring(7);
  }
  return str;
}

/**
 * Sinh mã biên lai tự động: BL-CAM-yyMMdd-xx
 */
export function generateReceiptCode(date = new Date(), index = 1) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const seq = String(index).padStart(2, '0');
  return `BL-CAM-${yy}${mm}${dd}-${seq}`;
}

/**
 * Mẫu Email Biên lai Điện tử Thu Lệ Phí Thi Cambridge (Chuẩn theo Apps Script)
 */
export function renderReceiptEmailHtml({
  fullName,
  fullNameNoTone,
  level,
  fee,
  receiptCode,
  paymentDate,
  hotline = CAMBRIDGE_CONFIG.HOTLINE_CHUAN
}) {
  const feeFormat = (fee || 0).toLocaleString('vi-VN') + ' VNĐ';
  const timeNow = paymentDate 
    ? new Date(paymentDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 2px solid ${CAMBRIDGE_CONFIG.MAU_XANH_THUONG_HIEU}; border-radius: 10px; overflow: hidden; background-color: #ffffff;">
      <!-- HEADER -->
      <div style="background-color: ${CAMBRIDGE_CONFIG.MAU_XANH_THUONG_HIEU}; color: white; padding: 22px; text-align: center;">
        <h2 style="margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 0.5px;">${CAMBRIDGE_CONFIG.TEN_NGAN}</h2>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95;">BIÊN LAI THU LỆ PHÍ THI ĐIỆN TỬ</p>
      </div>

      <!-- BODY -->
      <div style="padding: 22px;">
        <p>Kính gửi Quý Phụ huynh học sinh <b>${fullName}</b>,</p>
        <p><b>${CAMBRIDGE_CONFIG.TEN_TRUNG_TAM}</b> trân trọng xác nhận đã nhận đủ số tiền đóng lệ phí dự thi Cambridge Quốc tế cho con:</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 5px solid ${CAMBRIDGE_CONFIG.MAU_XANH_THUONG_HIEU}; padding: 16px; border-radius: 6px; font-size: 14px; line-height: 1.9; margin: 15px 0;">
          • <b>Mã số biên lai:</b> <span style="color: #0c83c1; font-weight: bold;">${receiptCode}</span><br>
          • <b>Họ và tên thí sinh:</b> <b style="color: #d9534f; font-size: 15px;">${fullNameNoTone}</b> (${fullName})<br>
          • <b>Cấp độ dự thi:</b> <b style="color: #0c83c1;">${level}</b><br>
          • <b>Số tiền đã thu:</b> <span style="color: #10b981; font-weight: bold; font-size: 16px;">${feeFormat}</span><br>
          • <b>Thời gian nhận phí:</b> ${timeNow}<br>
          • <b>Hình thức thanh toán:</b> Chuyển khoản VietQR MB Bank (${CAMBRIDGE_CONFIG.SO_TAI_KHOAN})<br>
          • <b>Trạng thái hồ sơ:</b> <span style="background: #d1fae5; color: #065f46; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">ĐÃ HOÀN TẤT ĐĂNG KÝ HỢP LỆ</span>
        </div>

        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 14px; border-radius: 6px; font-size: 13px; color: #92400e; margin-top: 15px;">
          📌 <b>BƯỚC TIẾP THEO:</b><br>
          Hồ sơ của con đã được chốt và gửi sang <b>Hội đồng khảo thí Đại học Cambridge (${CAMBRIDGE_CONFIG.DON_VI_UY_QUYEN})</b>. Trung tâm sẽ thông báo Số báo danh, phòng thi và hướng dẫn quy chế thi cho Quý phụ huynh trước ngày thi chính thức.
        </div>

        <p style="font-size: 12px; color: #64748b; margin-top: 20px; font-style: italic;">
          * Biên lai điện tử này có giá trị xác nhận tài chính chính thức giữa Trung tâm và Quý phụ huynh.
        </p>
      </div>

      <!-- FOOTER -->
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px; text-align: center; font-size: 13px; color: #64748b; line-height: 1.6;">
        <div style="font-weight: bold; color: #334155; margin-bottom: 4px;">${CAMBRIDGE_CONFIG.TEN_NGAN}</div>
        <div style="white-space: nowrap;"><span style="color: #64748b;">Hotline hỗ trợ:</span> <b style="color: #0c83c1;">${formatHotline(hotline)}</b></div>
      </div>
    </div>
  `;
}

/**
 * Mẫu Email Xác nhận Đăng ký Ban đầu Kèm Mã VietQR và Nút Chỉnh sửa (Chuẩn Apps Script)
 */
export function renderRegistrationEmailHtml({
  fullName,
  fullNameNoTone,
  gender,
  dobStr,
  parentPhone,
  level,
  fee,
  transferContent,
  editUrl,
  closeHour = '17:00',
  deadlineStr = '',
  hotline = CAMBRIDGE_CONFIG.HOTLINE_CHUAN,
  isEdit = false
}) {
  const feeFormat = (fee || 0).toLocaleString('vi-VN') + ' VNĐ';
  const badgeTitle = isEdit ? 'PHIẾU XÁC NHẬN CẬP NHẬT THÔNG TIN' : 'PHIẾU XÁC NHẬN ĐĂNG KÝ DỰ THI';
  const qrImgUrl = `https://img.vietqr.io/image/970422-6119916886-compact2.png?amount=${fee}&addInfo=${encodeURIComponent(transferContent)}&accountName=CONG%20TY%20TNHH%20NGOAI%20NGU%20TRI%20THUC%20VIET`;

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #dcdcdc; border-radius: 10px; overflow: hidden; background-color: #ffffff;">
      <!-- HEADER -->
      <div style="background-color: ${CAMBRIDGE_CONFIG.MAU_XANH_THUONG_HIEU}; color: white; padding: 22px; text-align: center;">
        <h2 style="margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 0.5px;">${CAMBRIDGE_CONFIG.TEN_NGAN}</h2>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95;">${badgeTitle} - CẤP ĐỘ ${level}</p>
      </div>

      <!-- BODY -->
      <div style="padding: 22px;">
        <p>Kính gửi Quý Phụ huynh học sinh <b>${fullName}</b>,</p>
        <p>${isEdit ? 'Trung tâm xác nhận đã cập nhật lại thông tin mới nhất cho thí sinh.' : 'Trung tâm đã nhận được phản hồi đăng ký tham dự kỳ thi Cambridge Quốc tế cho con.'} Dưới đây là thông tin sẽ đăng ký với <b>Hội đồng thi ${CAMBRIDGE_CONFIG.DON_VI_UY_QUYEN}</b>:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; background: #fdfdfd; font-size: 14px;">
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 9px; width: 45%; font-weight: bold;">Họ và Tên (In không dấu):</td><td style="color: #d9534f; font-weight: bold; font-size: 15px;">${fullNameNoTone}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 9px; font-weight: bold;">Cấp độ đăng ký:</td><td><b style="color: #0c83c1;">${level}</b></td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 9px; font-weight: bold;">Giới tính:</td><td>${gender === 'FEMALE' ? 'Nữ' : 'Nam'}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 9px; font-weight: bold;">Ngày sinh (dd/mm/yyyy):</td><td>${dobStr || '---'}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 9px; font-weight: bold;">Số điện thoại liên hệ:</td><td>${parentPhone || '---'}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 9px; font-weight: bold;">Lệ phí thi:</td><td style="color: ${CAMBRIDGE_CONFIG.MAU_XANH_THUONG_HIEU}; font-weight: bold; font-size: 16px;">${feeFormat}</td></tr>
          <tr style="border-bottom: 1px solid #eee;"><td style="padding: 9px; font-weight: bold;">Hạn chót đóng phí:</td><td style="color: #d9534f; font-weight: bold;">${closeHour} ngày ${deadlineStr}</td></tr>
        </table>

        <!-- KHUNG MÃ VIETQR -->
        <div style="background-color: #f7fafc; border: 2px dashed ${CAMBRIDGE_CONFIG.MAU_XANH_THUONG_HIEU}; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #d9534f; font-size: 16px;">QUÉT MÃ VIETQR ĐỂ HOÀN TẤT LỆ PHÍ (${level})</h3>
          <p style="font-size: 13px; margin: 0 0 12px 0;">Phụ huynh mở App Ngân hàng bất kỳ, chọn <b>Quét QR</b> để tự động nhận đúng STK và Số tiền:</p>
          <img src="${qrImgUrl}" alt="Mã VietQR Lệ phí thi" style="max-width: 240px; width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.12); display: block; margin: 0 auto;" />
          <div style="text-align: left; background: #fff; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; margin-top: 14px; font-size: 13px; line-height: 1.8;">
            • <b>Đơn vị thụ hưởng:</b> ${CAMBRIDGE_CONFIG.TEN_CONG_TY}<br>
            • <b>Số tài khoản:</b> ${CAMBRIDGE_CONFIG.SO_TAI_KHOAN} (${CAMBRIDGE_CONFIG.NGAN_HANG})<br>
            • <b>Số tiền:</b> ${feeFormat}<br>
            • <b>Nội dung chuyển khoản:</b> <span style="background: #fff3cd; color: #856404; font-weight: bold; padding: 3px 8px; border-radius: 4px; font-size: 14px;">${transferContent}</span>
          </div>
        </div>

        <!-- KIỂM TRA THÔNG TIN & NÚT CHỈNH SỬA -->
        <div style="background-color: #fff9e6; border: 1px solid #ffeeba; padding: 15px; border-radius: 8px;">
          <h4 style="margin: 0 0 8px 0; color: #856404; font-size: 15px;">KIỂM TRA THÔNG TIN:</h4>
          <p style="margin: 0 0 10px 0; font-size: 13px;">
            - Nếu thông tin đã <b>chính xác</b>: Quý phụ huynh chỉ cần hoàn tất quét mã đóng phí.<br>
            - Nếu phát hiện <b>sai ngày sinh, sai giới tính, sai cấp độ</b>: Vui lòng bấm vào nút đỏ bên dưới để cập nhật lại ngay.
          </p>

          <div style="text-align: center; margin: 15px 0;">
            <a href="${editUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #d9534f; color: #ffffff !important; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; font-size: 14px; box-shadow: 0 2px 4px rgba(217, 83, 79, 0.3);">
              BẤM ĐỂ CHỈNH SỬA THÔNG TIN CON
            </a>
          </div>

          <p style="margin: 5px 0 0 0; font-size: 11px; color: #777; text-align: center; word-break: break-all;">
            (Hoặc chạm vào: <a href="${editUrl}" target="_blank" rel="noopener noreferrer" style="color: ${CAMBRIDGE_CONFIG.MAU_XANH_THUONG_HIEU}; font-weight: bold;">Nhấn vào đây để sửa</a>)
          </p>
        </div>

        <p style="font-size: 12px; color: #888; margin-top: 15px; font-style: italic;">
          * Sau khi hoàn tất chuyển khoản, Trung tâm sẽ đối soát và gửi Email Biên lai xác nhận chính thức cho Quý phụ huynh.
        </p>
      </div>

      <!-- FOOTER -->
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px; text-align: center; font-size: 13px; color: #64748b; line-height: 1.6;">
        <div style="font-weight: bold; color: #334155; margin-bottom: 4px;">${CAMBRIDGE_CONFIG.TEN_NGAN}</div>
        <div style="white-space: nowrap;"><span style="color: #64748b;">Hotline hỗ trợ:</span> <b style="color: #0c83c1;">${formatHotline(hotline)}</b></div>
      </div>
    </div>
  `;
}
