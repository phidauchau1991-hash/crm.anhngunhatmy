import { NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/aiHelper';

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      studentName,
      amount,
      deadline,
      policy,
      tone = 'encouraging' 
    } = body;

    if (!studentName) {
      return NextResponse.json({ success: false, error: 'Tên học viên là bắt buộc' }, { status: 400 });
    }

    // Lấy 1-2 chữ cuối của tên để gọi cho thân mật (ví dụ: Nguyễn Thành Công -> Thành Công)
    const shortName = studentName.trim().split(/\s+/).slice(-2).join(' ');

    const systemPrompt = `Bạn là nhân viên Giáo vụ/CSKH thực tế tại Trung tâm Anh ngữ Nhật Mỹ.
Nhiệm vụ: Viết một tin nhắn Zalo gửi phụ huynh để nhắc nhở đóng học phí cho bé "${studentName}" (gọi thân mật là bé/bạn "${shortName}").

YÊU CẦU QUAN TRỌNG VỀ GIỌNG VĂN (TRÁNH VĂN MẪU AI):
- KHÔNG dùng các từ sáo rỗng, sến súa như "thăm hỏi ấm áp", "hành trình chinh phục", "kỳ học tiếp theo", "xin nhắc lịch".
- Xưng hô thực tế: "Dạ chị/mẹ ơi", "Dạ em chào ba/mẹ bé ${shortName} ạ", xưng "em" (đại diện trung tâm).
- Gọi tên bé bằng tên ngắn "${shortName}", TUYỆT ĐỐI không gọi cả họ và tên (Ví dụ: gọi "bạn Thành Công", không gọi "NGUYỄN THÀNH CÔNG").
- Văn phong trò chuyện thân thiện, mềm mại, gần gũi giống người thật đang chat Zalo (ví dụ: "Dạ chị ơi. Tới đây chị thu xếp hoàn thành HP khóa này của bạn ${shortName} giúp em với chị nhé! Lớp đã khai giảng...").
- TUYỆT ĐỐI KHÔNG nhắc đến "khóa học sắp tới" hay "chính sách đóng học phí trước/sau". Chỉ tập trung nhắc phụ huynh hoàn thành học phí cho khóa học HIỆN TẠI ("khóa này") vì học viên đang thiếu nợ học phí.
- Trình bày rõ số tiền và hạn đóng. Không gạch đầu dòng quá cứng nhắc, có thể lồng ghép vào câu nói tự nhiên.
- Giọng điệu yêu cầu: ${
  tone === 'solution'
    ? 'Đồng hành & Gợi mở (Lịch sự, hỗ trợ nếu ba mẹ cần)'
    : tone === 'formal'
    ? 'Trân trọng & Chuyên nghiệp (Rõ ràng, thông báo thông tin minh bạch)'
    : 'Thân thiện & Tự nhiên (Nhẹ nhàng, giống như nhân viên chăm sóc khách hàng đang chat Zalo)'
}
- KẾT QUẢ: Chỉ trả về nội dung tin nhắn, không có ngoặc kép, không có giải thích.`;

    const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    const userPrompt = `Hãy viết tin nhắn nhắc học phí với các thông tin sau:
- Số tiền cần đóng cho khóa này: ${formattedAmount}
- Hạn chót (nếu có): ${deadline ? new Date(deadline).toLocaleDateString('vi-VN') : 'Sớm nhất có thể'}
`;

    let generatedText = await generateAIResponse(systemPrompt, userPrompt);

    if (!generatedText) {
      throw new Error('AI không trả về kết quả');
    }

    return NextResponse.json({
      success: true,
      data: generatedText.trim()
    });

  } catch (error) {
    console.error('Lỗi AI Tuition Reminder API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
