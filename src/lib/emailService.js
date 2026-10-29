import nodemailer from 'nodemailer';

/**
 * Dịch vụ gửi Email tự động cho Hệ thống CRM Nhật Mỹ
 * Tích hợp SMTP linh hoạt: Hỗ trợ Gmail Workspace, SMTP Server riêng,
 * và chế độ Giả lập an toàn (Simulated Mode) khi chưa cấu hình SMTP.
 */

let cachedTransporter = null;

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null; // Chế độ mô phỏng nếu chưa có tài khoản SMTP
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false // Chống lỗi chứng chỉ SSL môi trường nội bộ
      }
    });
  }

  return cachedTransporter;
}

/**
 * Gửi email đơn lẻ hoặc hàng loạt
 * @param {Object} options
 * @param {string} options.to - Địa chỉ email người nhận
 * @param {string} options.subject - Tiêu đề email
 * @param {string} options.htmlBody - Nội dung HTML của email
 * @param {Array} [options.attachments] - File đính kèm (nếu có)
 * @returns {Promise<{success: boolean, simulated?: boolean, messageId?: string, error?: string}>}
 */
export async function sendEmail({ to, subject, htmlBody, attachments = [] }) {
  try {
    if (!to || !to.includes('@')) {
      return { success: false, error: 'Địa chỉ email người nhận không hợp lệ' };
    }

    const transporter = getTransporter();
    const fromAddress = process.env.SMTP_FROM || (process.env.SMTP_USER ? `"Anh Ngữ Nhật Mỹ" <${process.env.SMTP_USER}>` : '"Anh Ngữ Nhật Mỹ" <cambridge@nhatmy.edu.vn>');

    if (!transporter) {
      console.log(`[EmailService - SIMULATED MODE] Gửi thư thành công (Mô phỏng):`);
      console.log(`  -> Người nhận: ${to}`);
      console.log(`  -> Tiêu đề: ${subject}`);
      console.log(`  -> Thời gian: ${new Date().toISOString()}`);
      return {
        success: true,
        simulated: true,
        messageId: `simulated-${Date.now()}`
      };
    }

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html: htmlBody,
      attachments
    });

    console.log(`[EmailService] Thư đã được gửi thành công: ${info.messageId} -> ${to}`);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId
    };
  } catch (error) {
    console.error(`[EmailService ERROR] Không thể gửi email tới ${to}:`, error);
    return {
      success: false,
      error: error.message || 'Lỗi khi gửi thư điện tử'
    };
  }
}
