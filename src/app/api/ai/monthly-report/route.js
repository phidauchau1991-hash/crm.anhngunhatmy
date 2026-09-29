import { NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/aiHelper';

export async function POST(request) {
  try {
    const { studentName, stats, teacherKeywords } = await request.json();

    if (!studentName || !stats) {
      return NextResponse.json({ success: false, error: 'Thiếu dữ liệu đầu vào' }, { status: 400 });
    }

    const shortName = studentName.trim().split(/\s+/).pop() || 'con';

    const systemPrompt = `Bạn là một Giáo viên Anh ngữ chuyên nghiệp, tận tâm và thấu hiểu tâm lý học sinh. Bạn đang viết phần nhận xét cuối tháng cho phiếu Báo Cáo Học Tập Tháng gửi phụ huynh của học viên "${studentName}" (gọi thân mật bằng tên riêng là "${shortName}" hoặc "con").

QUY TẮC NGHIÊM NGẶT:
1. Độ dài đoạn văn: Khoảng 100 - 150 chữ (tương đương 4-6 câu). Viết thành một đoạn văn duy nhất, KHÔNG dùng gạch đầu dòng, KHÔNG dùng markdown.
2. Nội dung bắt buộc dựa trên số liệu: 
   - Con đi học ${stats.present} buổi, vắng ${stats.absent} buổi.
   - Thiếu làm Workbook ${stats.missingWb} lần, thiếu Video ${stats.missingVideo} lần.
3. Từ khóa của giáo viên: "${teacherKeywords || 'Không có ghi chú thêm'}". CHỈ dựa vào từ khóa này để đánh giá thái độ/học lực. Không tự bịa ra các ưu điểm/nhược điểm nếu từ khóa không nhắc đến.
4. Văn phong: Mềm mỏng, khích lệ. Dù bé có thiếu bài tập hay vắng nhiều, hãy dùng từ ngữ động viên, nhắc nhở khéo léo để phụ huynh dễ tiếp nhận và hợp tác nhắc nhở con. Kết thúc bằng một lời chúc hoặc kỳ vọng tiến bộ.
5. Không sử dụng các cụm từ mở đầu như "Chào phụ huynh" hay "Dưới đây là nhận xét" vì đoạn này sẽ được ghép trực tiếp vào Phiếu báo cáo. Đi thẳng vào nhận xét.`;

    const userPrompt = `Hãy viết đoạn nhận xét cho học viên ${studentName} dựa trên các thông số sau:
- Đi học: ${stats.present} buổi, Vắng: ${stats.absent} buổi
- Thiếu bài tập (WB): ${stats.missingWb} lần
- Thiếu nộp Video: ${stats.missingVideo} lần
- Ghi chú riêng của giáo viên: ${teacherKeywords}`;

    let generatedText = await generateAIResponse(systemPrompt, userPrompt);

    if (!generatedText) {
      throw new Error('AI không phản hồi');
    }

    return NextResponse.json({ success: true, data: generatedText });

  } catch (error) {
    console.error('Lỗi AI Monthly Report:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi gọi AI' }, { status: 500 });
  }
}
