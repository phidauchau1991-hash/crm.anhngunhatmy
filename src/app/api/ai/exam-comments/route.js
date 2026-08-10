import { NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/aiHelper';

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      studentName,
      speakingKeywords,
      listeningKeywords,
      rwKeywords,
      bilingual
    } = body;

    if (!studentName) {
      return NextResponse.json({ success: false, error: 'Tên học viên là bắt buộc' }, { status: 400 });
    }

    const shortName = studentName.trim().split(/\s+/).pop() || 'con';

    const systemPrompt = `Bạn là một Giáo viên Anh ngữ chuyên nghiệp, tận tâm đang viết nhận xét kết quả cuối khóa cho học viên "${studentName}" (gọi thân mật bằng tên riêng là "${shortName}" hoặc "con").
QUY TẮC NGHIÊM NGẶT (RẤT QUAN TRỌNG):
1. Mỗi phần (speaking, listening, rw, dev) CHỈ viết đúng 2 ý (bullet points), mỗi ý bắt đầu bằng dấu "- ".
2. Độ dài tiêu chuẩn: Mỗi ý BẮT BUỘC phải dài từ 12 đến 15 từ. KHÔNG viết quá ngắn (dưới 10 từ), KHÔNG viết dài (trên 18 từ) để luôn đảm bảo toàn bộ phiếu nhận xét hiển thị vừa vặn trong 1 trang giấy A4.
3. Sử dụng tên riêng: Thường xuyên dùng tên riêng "${shortName}" hoặc "${studentName}" trong các ý nhận xét thay vì nói trống không (ví dụ: "${shortName} có vốn từ vựng phong phú...", "${shortName} nghe tốt các đoạn thoại...").
4. Nêu RÕ LỢI ÍCH: Ở mỗi ý nhận xét, BẮT BUỘC phải giải thích thêm LỢI ÍCH (mang lại điều tốt đẹp gì cho con) khi phát huy ưu điểm hoặc khắc phục nhược điểm đó (Ví dụ: "...giúp ${shortName} tự tin giao tiếp tự nhiên với người nước ngoài", "...giúp con phản xạ làm bài thi chính xác và nhanh hơn").
5. Định hướng phát triển: Đưa ra giải pháp và lời khuyên thiết thực để phụ huynh đồng hành cùng con tại nhà giúp con nâng cao trình độ.${bilingual ? `
6. BẮT BUỘC viết thêm phiên bản tiếng Anh cho TẤT CẢ các phần. Phiên bản tiếng Anh phải được viết dưới góc độ một giáo viên tiếng Anh chuyên nghiệp viết báo cáo tiến độ học tập chính thức cho học viên.
7. Trả về kết quả DƯỚI DẠNG JSON với cấu trúc chính xác như sau, không có markdown (không dùng \`\`\`json):
{
  "speaking": "- Ý tiếng Việt 1\\n- Ý tiếng Việt 2",
  "speaking_en": "- English point 1\\n- English point 2",
  "listening": "- Ý tiếng Việt 1\\n- Ý tiếng Việt 2",
  "listening_en": "- English point 1\\n- English point 2",
  "rw": "- Ý tiếng Việt 1\\n- Ý tiếng Việt 2",
  "rw_en": "- English point 1\\n- English point 2",
  "dev": "- Ý tiếng Việt 1\\n- Ý tiếng Việt 2",
  "dev_en": "- English point 1\\n- English point 2"
}` : `
6. Trả về kết quả DƯỚI DẠNG JSON với cấu trúc chính xác như sau, không có markdown (không dùng \`\`\`json):
{
  "speaking": "- Ý 1\\n- Ý 2",
  "listening": "- Ý 1\\n- Ý 2",
  "rw": "- Ý 1\\n- Ý 2",
  "dev": "- Ý 1\\n- Ý 2"
}`}`;

    const userPrompt = `TỪ KHÓA CỦA GIÁO VIÊN:
- Speaking: ${speakingKeywords || 'Không có dữ liệu, hãy nhận xét chung là phát âm tốt, từ vựng phong phú'}
- Listening: ${listeningKeywords || 'Không có dữ liệu, hãy nhận xét chung là nghe hiểu tốt từ đơn và hội thoại'}
- Reading & Writing: ${rwKeywords || 'Không có dữ liệu, hãy nhận xét chung là làm bài cẩn thận, nắm vững ngữ pháp'}
`;

    let generatedText = await generateAIResponse(systemPrompt, userPrompt);

    if (!generatedText) {
      throw new Error('AI không trả về kết quả');
    }

    // Clean up potential markdown from the response
    if (generatedText.startsWith('```json')) {
      generatedText = generatedText.replace(/```json\n/g, '').replace(/\n```/g, '');
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(generatedText);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', generatedText);
      throw new Error('Định dạng phản hồi từ AI không hợp lệ');
    }

    return NextResponse.json({
      success: true,
      data: parsedResult
    });

  } catch (error) {
    console.error('Lỗi AI Exam Comments API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
