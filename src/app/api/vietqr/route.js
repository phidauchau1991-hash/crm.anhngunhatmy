import { NextResponse } from 'next/server';
import { generateVietQRDataURL } from '@/lib/vietqr';

// Bộ nhớ cache tạm thời trong RAM cho các mã VietQR đã sinh nội bộ để phản hồi 0ms
const qrCache = new Map();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const amount = Number(searchParams.get('amount')) || 0;
    const addInfo = searchParams.get('addInfo') || 'HP NHAT MY';

    if (amount <= 0) {
      return NextResponse.json({ success: false, error: 'Số tiền phải lớn hơn 0' }, { status: 400 });
    }

    const cacheKey = `${Math.round(amount)}_${addInfo}`;
    if (qrCache.has(cacheKey)) {
      return NextResponse.json({
        success: true,
        cached: true,
        local: true,
        qrDataURL: qrCache.get(cacheKey)
      });
    }

    const qrDataURL = await generateVietQRDataURL({ amount, addInfo, width: 420 });

    if (qrCache.size > 500) {
      const firstKey = qrCache.keys().next().value;
      qrCache.delete(firstKey);
    }
    qrCache.set(cacheKey, qrDataURL);

    return NextResponse.json({
      success: true,
      cached: false,
      local: true,
      qrDataURL
    });
  } catch (error) {
    console.error('Error in /api/vietqr:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Lỗi khi tạo mã VietQR'
    }, { status: 500 });
  }
}
