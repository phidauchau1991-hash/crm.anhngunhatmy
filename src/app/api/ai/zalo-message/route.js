import { NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/aiHelper';

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      name,
      painPoints,
      goals,
      status,
      trialClassCode,
      trialStartDate,
      followUpDate,
      followUpNote,
      notes,
      salesRep,
      isNew
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Tên học viên là bắt buộc' }, { status: 400 });
    }

    const shortName = name.trim().split(/\s+/).slice(-2).join(' ');
    const repName = salesRep ? salesRep.trim().split(/\s+/).pop() : 'Chuyên viên tư vấn';

    const systemPrompt = `Bạn là ${repName} - Chuyên viên tư vấn tại Trung tâm Anh ngữ Nhật Mỹ.
Nhiệm vụ của bạn là soạn một tin nhắn Zalo gửi Phụ huynh của bé "${name}" (gọi là bé "${shortName}") để xác nhận thông tin và chăm sóc sau buổi trao đổi/tư vấn.

QUY TẮC VĂN PHONG (NGẮN GỌN - THỰC TẾ - TRÁNH VĂN MẪU AI):
- Xưng hô thực tế: "Dạ em chào Anh/Chị" hoặc "Dạ em chào mẹ/bố bé ${shortName}", tự xưng là "${repName} bên Trung tâm Anh ngữ Nhật Mỹ".
- Giọng điệu: Ngắn gọn, lịch sự, đi thẳng vào vấn đề. TUYỆT ĐỐI KHÔNG dùng các từ sến súa, hoa mỹ như "thăm hỏi ấm áp", "lắng nghe sâu sắc", "hành trình chinh phục".
- Trình bày rõ ràng: Dùng gạch đầu dòng (-) thay vì các đoạn văn dài lê thê.
- KHÔNG dùng từ ngữ mang tính buôn bán hàng hóa (tránh "giảm giá", "chốt sale").
- Trả về KẾT QUẢ TRỰC TIẾP là đoạn tin nhắn Zalo hoàn chỉnh (không giải thích thêm, không ngoặc kép). Có thể dùng 1-2 emoji đơn giản (🌸, 📚).`;

    let userPrompt = '';

    if (isNew) {
      userPrompt = `Đây là KHÁCH HÀNG TIỀM NĂNG MỚI vừa được tiếp nhận tư vấn. Hãy viết tin nhắn Zalo chào mừng và tổng hợp nội dung tư vấn ban đầu:
- Tên bé: ${name}
${painPoints ? `- Vấn đề bé đang gặp phải (Pain points): ${painPoints}` : ''}
${goals ? `- Mục tiêu mong muốn của gia đình (Goals): ${goals}` : ''}
${status === 'Học thử' && trialClassCode ? `- Đã đăng ký trải nghiệm lớp học thử: ${trialClassCode} ${trialStartDate ? `từ ngày ${trialStartDate.substring(0, 10)}` : ''}` : ''}
${notes ? `- Ghi chú tư vấn: ${notes}` : ''}
${followUpDate ? `- Lịch hẹn liên lạc lại: ${followUpDate.substring(0, 10)} (${followUpNote || 'trao đổi thêm'})` : ''}

Hãy viết lời chào mừng, thể hiện sự thấu hiểu tình trạng của bé "${shortName}", đưa ra cam kết đồng hành và mời phụ huynh kết bạn Zalo / gửi trước tài liệu tham khảo cho bé.`;
    } else {
      userPrompt = `Đây là KHÁCH HÀNG ĐANG CHĂM SÓC, vừa có cuộc gọi/trao đổi tư vấn cập nhật hôm nay. Hãy viết tin nhắn Zalo xác nhận nội dung vừa trao đổi:
- Tên bé: ${name}
- Trạng thái chăm sóc hiện tại: ${status}
${painPoints ? `- Vấn đề quan tâm (Pain points): ${painPoints}` : ''}
${goals ? `- Mục tiêu hướng tới: ${goals}` : ''}
${status === 'Học thử' && trialClassCode ? `- Lớp học thử trải nghiệm: ${trialClassCode} ${trialStartDate ? `từ ngày ${trialStartDate.substring(0, 10)}` : ''}` : ''}
${notes ? `- Nhật ký trao đổi mới nhất hôm nay: ${notes}` : ''}
${followUpDate ? `- Hẹn lịch trao đổi tiếp theo vào ngày: ${followUpDate.substring(0, 10)} ${followUpNote ? `(Nội dung: ${followUpNote})` : ''}` : ''}

Hãy tóm tắt xúc tích những điểm vừa trao đổi hôm nay, khẳng định sự quan tâm sát sao của trung tâm với tiến độ của bé "${shortName}", và nhắn nhủ phụ huynh cứ nhắn tin qua Zalo này nếu cần hỗ trợ thêm.`;
    }

    let generatedText = await generateAIResponse(systemPrompt, userPrompt);

    if (!generatedText) {
      throw new Error('AI không trả về kết quả');
    }

    return NextResponse.json({
      success: true,
      data: generatedText.trim()
    });

  } catch (error) {
    console.error('Lỗi AI Zalo Message API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
