import { NextResponse } from 'next/server';

// Bộ nhớ cache tạm thời trong RAM cho các mã VietQR đã sinh để phản hồi tức thì (0ms)
const qrCache = new Map();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const amount = Number(searchParams.get('amount')) || 0;
    const addInfo = searchParams.get('addInfo') || 'HP NHAT MY';
    const template = searchParams.get('template') || 'compact2';

    if (amount <= 0) {
      return NextResponse.json({ success: false, error: 'Số tiền phải lớn hơn 0' }, { status: 400 });
    }

    const cacheKey = `${amount}_${addInfo}_${template}`;
    if (qrCache.has(cacheKey)) {
      return NextResponse.json({
        success: true,
        cached: true,
        qrDataURL: qrCache.get(cacheKey)
      });
    }

    // Gọi trực tiếp VietQR API v2 từ server (Tránh hoàn toàn lỗi CORS trình duyệt)
    const postData = {
      accountNo: '6119916886',
      accountName: 'CONG TY TNHH NGOAI NGU TRI THUC VIET',
      acqId: '970422', // MB Bank
      amount,
      addInfo,
      format: 'text',
      template
    };

    const res = await fetch('https://api.vietqr.io/v2/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      throw new Error(`VietQR API HTTP error: ${res.status}`);
    }

    const json = await res.json();
    if (json.code === '00' && json.data?.qrDataURL) {
      const qrDataURL = json.data.qrDataURL;
      // Lưu cache (giới hạn kích thước cache để không tốn RAM)
      if (qrCache.size > 200) {
        const firstKey = qrCache.keys().next().value;
        qrCache.delete(firstKey);
      }
      qrCache.set(cacheKey, qrDataURL);

      return NextResponse.json({
        success: true,
        cached: false,
        qrDataURL
      });
    } else {
      throw new Error(json.desc || 'Không thể tạo mã VietQR');
    }

  } catch (error) {
    console.error('Error in /api/vietqr:', error);

    // Fallback: Nếu API v2 gặp sự cố, thử lấy qua endpoint ảnh SVG rồi chuyển sang Base64
    try {
      const { searchParams } = new URL(request.url);
      const amount = Number(searchParams.get('amount')) || 0;
      const addInfo = searchParams.get('addInfo') || 'HP NHAT MY';
      
      const fallbackUrl = `https://img.vietqr.io/image/970422-6119916886-cTQpC6D.svg?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=CONG%20TY%20TNHH%20NGOAI%20NGU%20TRI%20THUC%20VIET`;
      
      const svgRes = await fetch(fallbackUrl, { signal: AbortSignal.timeout(6000) });
      if (svgRes.ok) {
        const svgText = await svgRes.text();
        const base64Svg = `data:image/svg+xml;base64,${Buffer.from(svgText).toString('base64')}`;
        return NextResponse.json({
          success: true,
          fallback: true,
          qrDataURL: base64Svg
        });
      }
    } catch (fallbackError) {
      console.error('Fallback failed:', fallbackError);
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Lỗi khi tạo mã VietQR'
    }, { status: 500 });
  }
}
