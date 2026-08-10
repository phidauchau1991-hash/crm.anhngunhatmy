import { NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/aiHelper';

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      studentName,
      age
    } = body;

    if (!studentName) {
      return NextResponse.json({ success: false, error: 'Tên học viên là bắt buộc' }, { status: 400 });
    }

    // Lấy 1-2 chữ cuối của tên để gọi cho thân mật
    const shortName = studentName.trim().split(/\s+/).slice(-2).join(' ');

    const systemPrompt = `Bạn là nhân viên Giáo vụ/CSKH tại Trung tâm Anh ngữ Nhật Mỹ.
Nhiệm vụ: Viết một tin nhắn Zalo gửi phụ huynh để chúc mừng sinh nhật cho bé "${studentName}" (gọi thân mật là bé/con "${shortName}").

YÊU CẦU QUAN TRỌNG VỀ GIỌNG VĂN (TRÁNH VĂN MẪU AI):
- KHÔNG dùng các từ sáo rỗng, sến súa như "thăm hỏi ấm áp", "nhân dịp con tròn", "thật nồng nhiệt", "nhân ngày đặc biệt".
- Xưng hô thực tế: "Dạ em chào ba/mẹ bé ${shortName} ạ", xưng "em" (đại diện trung tâm).
- Gọi tên bé bằng tên ngắn "${shortName}", TUYỆT ĐỐI không gọi cả họ và tên (Ví dụ: gọi "bạn Duy Vương", không gọi "BÙI DUY VƯƠNG").
- Lời chúc cần tự nhiên, chân thành, giống như một cô giáo/chị nhân viên ở trung tâm nhắn tin cho phụ huynh.
- Tuyệt đối KHÔNG đề cập đến bất kỳ chương trình khuyến mãi giảm giá hay tặng quà vật chất nào. Chỉ gửi lời chúc tinh thần thuần túy.
- Trả về KẾT QUẢ TRỰC TIẾP là đoạn tin nhắn Zalo (không cần giải thích thêm, không dùng ngoặc kép bọc ngoài). Gắn thêm 1-2 emoji vui tươi như 🎂🎉.`;

    const userPrompt = `Hãy viết tin nhắn chúc mừng sinh nhật cho bé ${shortName} ${age ? `(bé bước sang tuổi ${age})` : ''}.`;

    let generatedText = await generateAIResponse(systemPrompt, userPrompt);

    if (!generatedText) {
      throw new Error('AI không trả về kết quả');
    }

    return NextResponse.json({
      success: true,
      data: generatedText.trim()
    });

  } catch (error) {
    console.error('Lỗi AI Birthday Wish API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
