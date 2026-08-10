import { NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/aiHelper';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      studentName,
      sessionsAttended,
      speakingKeywords,
      listeningKeywords,
      rwKeywords,
      behaviorKeywords,
      tone
    } = body;

    // Kiểm tra tên học sinh bắt buộc
    if (!studentName) {
      return NextResponse.json(
        { success: false, error: 'Thiếu tên học sinh' },
        { status: 400 }
      );
    }

    // Lấy tên ngắn của học sinh
    const shortName = studentName.split(' ').pop();
    const currentTone = tone || 'encouraging';

    // Xây dựng system prompt hướng dẫn AI đóng vai giáo viên viết nhận xét
    const systemPrompt = `Bạn là một giáo viên tiếng Anh tại trung tâm Anh ngữ Nhật Mỹ. Nhiệm vụ của bạn là viết Nhận xét Học thử (Trial Student Report) cho phụ huynh.
Giọng điệu: ${currentTone === 'encouraging' ? 'Ấm áp, khích lệ và mang tính thuyết phục để phụ huynh đăng ký học chính thức' : 'Chuyên nghiệp, chân thành, mang tính xây dựng và thuyết phục'}.
Hãy gọi tên ngắn của học sinh ("${shortName}") thường xuyên trong phần nhận xét.

Bạn phải trả về định dạng JSON thuần túy, tuyệt đối KHÔNG có markdown, KHÔNG có code block, KHÔNG bọc trong \`\`\`json \`\`\`.
Cấu trúc JSON bắt buộc:
{
  "attitude": "Thái độ & Hòa nhập (đúng 2 gạch đầu dòng, mỗi gạch 12-15 từ)",
  "skills": "Kỹ năng Ngôn ngữ quan sát được (đúng 2 gạch đầu dòng)",
  "potential": "Tiềm năng & Đề xuất lộ trình (đúng 2 gạch đầu dòng)",
  "recommendation": "Lời khuyên cho Phụ huynh (1 đến 2 gạch đầu dòng)"
}
Lưu ý: Bắt đầu mỗi ý bằng dấu gạch ngang '-' và xuống dòng bằng '\\n'.`;

    // Xây dựng user prompt chứa thông tin đầu vào
    const userPrompt = `Thông tin học sinh học thử:
- Họ và tên: ${studentName}
- Số buổi đã tham gia: ${sessionsAttended || 1}
- Điểm nổi bật phần Nói (Speaking): ${speakingKeywords || 'Không có thông tin cụ thể'}
- Điểm nổi bật phần Nghe (Listening): ${listeningKeywords || 'Không có thông tin cụ thể'}
- Điểm nổi bật phần Đọc/Viết (Reading/Writing): ${rwKeywords || 'Không có thông tin cụ thể'}
- Thái độ và hành vi (Behavior): ${behaviorKeywords || 'Không có thông tin cụ thể'}

Dựa vào các thông tin trên, hãy sinh ra báo cáo theo đúng định dạng JSON yêu cầu.`;

    // Gọi AI helper
    const aiResponseStr = await generateAIResponse(systemPrompt, userPrompt);
    
    // Làm sạch chuỗi trả về để loại bỏ markdown code block nếu AI lỡ thêm vào
    const cleanedStr = aiResponseStr.replace(/^```(json)?\n?|```$/gm, '').trim();
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedStr);
    } catch (parseError) {
      console.error('Lỗi khi phân tích JSON từ AI:', parseError, cleanedStr);
      return NextResponse.json(
        { success: false, error: 'Phản hồi từ AI không đúng định dạng JSON' },
        { status: 500 }
      );
    }

    // Trả về JSON thành công
    return NextResponse.json({
      success: true,
      data: parsedData
    });
  } catch (error) {
    console.error('Lỗi tại API trial-report:', error);
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
