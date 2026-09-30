import { NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/aiHelper';

export async function POST(request) {
  try {
    const body = await request.json();
    const { studentName, lsKeywords, rwKeywords, devKeywords } = body;

    const systemPrompt = `Bạn là một Chuyên gia Đánh giá Năng lực (English Assessor) tại "Trung tâm Anh ngữ Nhật Mỹ". Bạn đang viết phiếu nhận xét kết quả bài test đầu vào (Placement Test) cho học viên.
Mục tiêu: Đánh giá chuyên nghiệp, khích lệ và đặc biệt là tư vấn lộ trình khéo léo để thuyết phục phụ huynh đăng ký học (chốt sale).
KẾT QUẢ TRẢ VỀ PHẢI LÀ ĐỊNH DẠNG JSON TUYỆT ĐỐI (không có markdown fences \`\`\`json).
Cấu trúc JSON bắt buộc:
{
  "ls_comments": "- Điểm mạnh...\\n- Cần cải thiện...",
  "rw_comments": "- Điểm mạnh...\\n- Cần cải thiện...",
  "conclusion": "Đánh giá chung về tiềm năng và đề xuất phụ huynh đăng ký khóa học phù hợp tại Nhật Mỹ (chốt sale nhẹ nhàng, chuyên nghiệp)."
}
Ghi chú: Mỗi phần comments nên viết 2 ý (bullet points), mỗi ý bắt đầu bằng dấu "- ". Phần conclusion viết 1 đoạn văn ngắn khoảng 3-4 câu, dựa vào Định hướng & Phát triển mà giáo viên cung cấp (nếu có).`;

    const userPrompt = `Tên học viên: ${studentName || 'Học viên'}
Từ khóa kỹ năng Nghe & Nói: ${lsKeywords || 'Chưa có thông tin'}
Từ khóa kỹ năng Đọc & Viết: ${rwKeywords || 'Chưa có thông tin'}
Từ khóa Định hướng & Phát triển: ${devKeywords || 'Hãy tự đề xuất lộ trình phù hợp dựa trên năng lực của học viên.'}`;

    const aiResponseText = await generateAIResponse(systemPrompt, userPrompt);
    
    // Clean up
    let cleanJsonString = aiResponseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    
    let resultData;
    try {
      resultData = JSON.parse(cleanJsonString);
    } catch (parseError) {
      console.error('Error parsing AI response JSON:', parseError, 'Text:', cleanJsonString);
      return NextResponse.json({ success: false, error: 'AI không trả về định dạng JSON hợp lệ.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: resultData });
  } catch (error) {
    console.error('Error in placement-report API:', error);
    return NextResponse.json({ success: false, error: 'Đã xảy ra lỗi khi tạo nhận xét AI.' }, { status: 500 });
  }
}
