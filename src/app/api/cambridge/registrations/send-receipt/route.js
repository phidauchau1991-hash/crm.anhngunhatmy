import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { renderReceiptEmailHtml, generateReceiptCode, CAMBRIDGE_CONFIG } from '@/lib/cambridgeHelper';
import { sendEmail } from '@/lib/emailService';

// POST: Gửi Email Biên lai điện tử cho thí sinh đã đóng phí
export async function POST(request) {
  try {
    const body = await request.json();
    const { batchId, registrationIds } = body;

    const requestUser = request.headers.get('x-user-username') || 'CRM Admin';

    let candidates = [];

    if (Array.isArray(registrationIds) && registrationIds.length > 0) {
      // Gửi cho danh sách ID cụ thể được chọn
      const parsedIds = registrationIds.map(i => parseInt(i, 10)).filter(n => !isNaN(n));
      candidates = await prisma.cambridgeRegistration.findMany({
        where: {
          id: { in: parsedIds },
          paymentStatus: 'DA_DONG'
        },
        include: {
          batch: true
        }
      });
    } else if (batchId) {
      // Gửi cho tất cả thí sinh đã đóng tiền nhưng chưa gửi email biên lai trong đợt thi
      candidates = await prisma.cambridgeRegistration.findMany({
        where: {
          batchId: batchId,
          paymentStatus: 'DA_DONG',
          receiptSentAt: null
        },
        include: {
          batch: true
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Vui lòng cung cấp batchId hoặc danh sách registrationIds'
      }, { status: 400 });
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không có thí sinh nào cần gửi biên lai (Đã gửi hết hoặc chưa đóng phí)',
        sent: 0,
        failed: 0,
        details: []
      });
    }

    const results = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const candidate of candidates) {
      const email = candidate.parentEmail ? candidate.parentEmail.trim() : '';

      if (!email || !email.includes('@')) {
        failedCount++;
        results.push({
          id: candidate.id,
          fullName: candidate.fullName,
          status: 'FAILED',
          error: 'Phụ huynh chưa cung cấp địa chỉ Email'
        });
        continue;
      }

      // Đảm bảo có mã biên lai
      let receiptCode = candidate.receiptCode;
      if (!receiptCode) {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayPrefix = `BL-CAM-${yy}${mm}${dd}-`;

        const countToday = await prisma.cambridgeRegistration.count({
          where: { receiptCode: { startsWith: todayPrefix } }
        });
        receiptCode = generateReceiptCode(now, countToday + 1);

        await prisma.cambridgeRegistration.update({
          where: { id: candidate.id },
          data: { receiptCode }
        });
      }

      const hotline = candidate.batch?.hotline || CAMBRIDGE_CONFIG.HOTLINE_CHUAN;

      const htmlBody = renderReceiptEmailHtml({
        fullName: candidate.fullName,
        fullNameNoTone: candidate.fullNameNoTone,
        level: candidate.level,
        fee: candidate.fee,
        receiptCode,
        paymentDate: candidate.paymentDate || new Date(),
        hotline
      });

      const subject = `[BIÊN LAI ĐIỆN TỬ] Xác nhận lệ phí thi Cambridge ${candidate.level} - ${candidate.fullNameNoTone}`;

      const emailResult = await sendEmail({
        to: email,
        subject,
        htmlBody
      });

      if (emailResult.success) {
        sentCount++;
        const sentTime = new Date();
        await prisma.cambridgeRegistration.update({
          where: { id: candidate.id },
          data: {
            receiptSentAt: sentTime,
            receiptSentBy: requestUser
          }
        });

        results.push({
          id: candidate.id,
          fullName: candidate.fullName,
          email,
          receiptCode,
          status: 'SUCCESS',
          simulated: !!emailResult.simulated,
          sentAt: sentTime
        });
      } else {
        failedCount++;
        results.push({
          id: candidate.id,
          fullName: candidate.fullName,
          email,
          status: 'FAILED',
          error: emailResult.error || 'Lỗi khi kết nối máy chủ gửi mail'
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: candidates.length,
      sent: sentCount,
      failed: failedCount,
      details: results
    });
  } catch (error) {
    console.error('Error in send-receipt API:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Lỗi hệ thống khi gửi email biên lai'
    }, { status: 500 });
  }
}
