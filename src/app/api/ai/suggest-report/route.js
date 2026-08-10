import { NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/aiHelper';

// Tự động rút gọn và chuẩn hóa tên học sinh (VD: "TRỊNH THỊ HẢI YẾN" -> "Hải Yến")
function getFriendlyName(fullName) {
  if (!fullName) return 'con';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) {
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  }
  const lastTwo = parts.slice(-2).join(' ');
  return lastTwo.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}

const BENEFIT_BANK = {
  missingVideo: [
    "tăng sự tự tin khi nói tiếng Anh và phản xạ giao tiếp tự nhiên",
    "giúp thầy cô theo sát và sửa nét phát âm chuẩn từng chút cho con",
    "bật nói câu dài trôi chảy không bị e ngại trước đám đông",
    "lưu lại hành trình tiến bộ vượt bậc của con theo từng tuần"
  ],
  missingWb: [
    "củng cố vững chắc từ vựng và ngữ pháp vừa học trên lớp",
    "xây dựng nền tảng Anh văn chắc chắn giúp con đạt điểm cao ở trường",
    "rèn thói quen tự giác tư học và tính trách nhiệm từ nhỏ",
    "đảm bảo con không bị hổng kiến thức cho bài học tiếp theo"
  ],
  copyError: [
    "ghi nhớ chính xác mặt chữ (Spelling), tránh lỗi sai chính tả đáng tiếc",
    "rèn luyện tính kiên nhẫn, chỉn chu và cẩn thận trong từng nét chữ",
    "kích thích trí nhớ vận động giúp thuộc từ vựng lâu hơn gấp 3 lần"
  ]
};

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      studentName, 
      status, 
      teacherNotes, 
      missingWb, 
      missingVideo, 
      copyError,
      adjustmentNotes, // Chi tiết lỗi GV ghi chú
      alerts = [], // Cảnh báo từ Dashboard
      type = 'session', // 'session' (báo cáo buổi học) hoặc 'alert' (nhắc nhở cảnh báo ngưỡng)
      lessonContent = {},
      tone = 'encouraging' // 'encouraging', 'solution', 'formal'
    } = body;

    if (!studentName) {
      return NextResponse.json({ success: false, error: 'Tên học viên là bắt buộc' }, { status: 400 });
    }

    const shortName = getFriendlyName(studentName);
    // --- 1. GỌI QUA AI HELPER ---
    try {
      let systemPrompt = `Bạn là một Giáo viên & Chuyên gia CSKH tận tâm tại Trung tâm Anh ngữ Nhật Mỹ. 
Nhiệm vụ của bạn là viết tin nhắn Zalo ngắn gọn, tự nhiên, gần gũi như người thật trao đổi với Phụ huynh của bé "${shortName}".

QUY TẮC PHONG CÁCH VĂN PHONG (TỰ NHIÊN - TÂN TÂM):
- Gọi tên bé tự nhiên: "bé ${shortName}" hoặc "con", tuyệt đối KHÔNG dùng họ tên in hoa dài dòng.
- Xưng hô: "thầy/cô" hoặc "em (bên trung tâm Nhật Mỹ)".
- NGUYÊN TẮC LỢI ÍCH (BENEFIT-DRIVEN): Khi nhắc làm bài tập (Video/WB/Copy), luôn lồng ghép nhẹ nhàng lợi ích cho bé (giúp con tự tin, phát âm chuẩn, đạt điểm cao ở trường, rèn cẩn thận).
- Giọng điệu chọn: ${
  tone === 'solution'
    ? 'Đồng hành & Gợi mở giải pháp (Gợi ý cách ba mẹ hỗ trợ con nhẹ nhàng)'
    : tone === 'formal'
    ? 'Trân trọng & Chuyên nghiệp (Lịch sự, mạch lạc)'
    : 'Ấm áp, Thân thiện & Động viên (Mặc định, đầy năng lượng tích cực)'
}`;

      let userPrompt = '';
      if (type === 'alert') {
        userPrompt = `Viết tin nhắn Zalo NHẮC NHỞ CẢNH BÁO TẬN TÂM cho Ba/Mẹ bé ${shortName}:
- Lý do cảnh báo: ${alerts.map(a => a.message).join(', ') || 'Cần chú ý học tập'}
- Mục tiêu: Báo tin để Ba/Mẹ biết và phối hợp, không gây cảm giác mắng vốn, tập trung vào sự tiến bộ của con.`;
      } else {
        userPrompt = `Viết tin nhắn BÁO CÁO BUỔI HỌC cho Ba/Mẹ bé ${shortName}:
- Điểm danh: ${status || 'Có mặt'}
- Lời phê GV: ${teacherNotes || 'Học ngoan, tích cực phát biểu.'}
- Vi phạm nếu có: ${missingVideo ? 'Chưa nộp Video' : ''} ${missingWb ? 'Chưa làm WB' : ''} ${copyError ? 'Lỗi copy' : ''}
${adjustmentNotes ? `- Chi tiết GV ghi chú: ${adjustmentNotes}` : ''}`;
      }

      const generatedText = await generateAIResponse(systemPrompt, userPrompt);
      if (generatedText) {
        return NextResponse.json({ success: true, data: generatedText.trim(), source: 'ai' });
      }
    } catch (err) {
      console.warn('Fallthrough to Benefit Engine:', err);
    }

    // --- 2. FALLBACK ENGINE: MẪU CÂU TỰ NHIÊN DỰ PHÒNG ---
    let message = '';

    // A. TIN NHẮC CẢNH BÁO THEO NGƯỠNG (DÙNG CHO DASHBOARD ALERT MODAL)
    if (type === 'alert') {
      const alertMsgs = alerts.map(a => a.message).join(' và ');

      if (tone === 'encouraging') {
        const openers = [
          `Dạ em chào Ba/Mẹ bé ${shortName} ạ! ❤️\nThầy cô bên Trung tâm Nhật Mỹ nhắn tin trao đổi với gia đình một chút ạ.`,
          `Dạ chào Ba/Mẹ bé ${shortName} thân mến! 🌟\nTrung tâm xin phép gửi lời hỏi thăm đến con và gia đình ạ.`
        ];
        message = `${getRandomItem(openers)}\n\nTheo dõi tiến trình học tập, thầy cô thấy dạo này con đang gặp tình trạng: ${alertMsgs || 'cần cố gắng thêm'}.\n\nChắc dạo này con hơi bận lịch học trên trường, nên thầy cô nhờ Ba/Mẹ nhắc nhẹ con dành ít phút ôn lại bài nhé. Việc này sẽ giúp con không bị hổng kiến thức và tự tin hơn ở các buổi học sau đấy ạ.\n\nCảm ơn Ba/Mẹ luôn đồng hành cùng trung tâm ạ!`;
      } else if (tone === 'solution') {
        message = `Dạ chào Ba/Mẹ bé ${shortName} ạ!\n\nTrung tâm Anh ngữ Nhật Mỹ xin gửi thông tin nắm bắt tình hình của con. Hiện tại con đang có dấu hiệu: ${alertMsgs || 'cần hỗ trợ'}.\n\nĐể giúp con nhanh chóng lấy lại đà học tập và đạt kết quả tốt nhất, thầy cô đề xuất Ba/Mẹ phối hợp nhắc con làm bổ sung bài tập trước buổi học tới nhé ạ. Thầy cô trên lớp sẽ luôn ưu tiên hỗ trợ con thêm.\n\nNhờ Ba/Mẹ phản hồi nếu con gặp khó khăn gì nhé ạ! 🤝`;
      } else {
        message = `Kính gửi Phụ huynh học sinh ${shortName},\n\nTrung tâm Anh ngữ Nhật Mỹ trân trọng thông báo tình hình chuyên cần và bài tập của con: ${alertMsgs || 'cần lưu ý'}.\n\nKính mong Quý Phụ huynh phối hợp nhắc nhở con hoàn thành bài học để đảm bảo chất lượng tiếp thu tốt nhất. Cảm ơn sự hợp tác của Quý Phụ huynh!`;
      }
    } 
    // B. TIN BÁO CÁO BUỔI HỌC (DÙNG CHO BẢNG ĐIỂM DANH)
    else {
      const isPresent = status === 'Có mặt' || status === 'Chưa điểm danh';
      const hasViolations = missingWb || missingVideo || copyError;

      if (tone === 'encouraging') {
        const greetings = [
          `Chào Ba/Mẹ bé ${shortName} ạ! ❤️`,
          `Dạ em chào Ba/Mẹ bé ${shortName} thân mến! 🌟`,
          `Dạ chào gia đình bé ${shortName} ạ! ✨`
        ];
        message = `${getRandomItem(greetings)}\n\n`;
        
        if (isPresent) {
          const praises = [
            `Hôm nay con đến lớp ngoan và học tập rất hợp tác.`,
            `Hôm nay con tham gia buổi học đầy đủ và vui vẻ cùng các bạn.`
          ];
          message += `${getRandomItem(praises)} ${teacherNotes ? `Lời phê từ GV: "${teacherNotes}"` : ''}\n`;
        } else {
          message += `Buổi học hôm nay con vắng mặt (${status}). Thầy cô rất nhớ con và mong buổi sau con lại đi học đầy đủ nhé ạ!\n`;
        }

        if (hasViolations) {
          message += `\nThầy cô nhờ Ba/Mẹ nhắc nhẹ con:\n`;
          if (missingVideo) message += `• 🎥 **Quay Video:** Dành 1-2 phút quay bài nói giúp con **${getRandomItem(BENEFIT_BANK.missingVideo)}**.\n`;
          if (missingWb) message += `• 📝 **Workbook:** Dành 15 phút làm bài giúp con **${getRandomItem(BENEFIT_BANK.missingWb)}**.\n`;
          if (copyError) message += `• ✏️ **Chép từ:** Viết lại từ vựng giúp con **${getRandomItem(BENEFIT_BANK.copyError)}**.\n`;
          if (adjustmentNotes) {
            message += `\nChi tiết GV ghi chú:\n`;
            adjustmentNotes.split('\n').filter(l => l.trim()).forEach(line => {
              message += `  - ${line.trim()}\n`;
            });
          }
          message += `\nCảm ơn Ba/Mẹ đã đồng hành cùng con và trung tâm ạ! 🥰`;
        } else {
          message += `\nCon hoàn thành bài tập chu đáo lắm ạ. Ba/Mẹ thưởng cho con lời khen nhé! Cảm ơn gia đình ạ! 🌟`;
        }
      } else if (tone === 'solution') {
        message = `Dạ chào Ba/Mẹ bé ${shortName} ạ!\n\nThông tin buổi học hôm nay của con:\n- Điểm danh: ${isPresent ? 'Có mặt' : status}\n- Nhận xét: ${teacherNotes || 'Học tập ngoan'}\n`;
        if (hasViolations) {
          message += `\nĐể giúp con củng cố bài tốt nhất, nhờ Ba/Mẹ gợi ý con làm bổ sung:\n`;
          if (missingVideo) message += `+ Video bài nói (giúp con ${getRandomItem(BENEFIT_BANK.missingVideo)})\n`;
          if (missingWb) message += `+ Bài tập Workbook (giúp con ${getRandomItem(BENEFIT_BANK.missingWb)})\n`;
          if (copyError) message += `+ Chép từ vựng (giúp con ${getRandomItem(BENEFIT_BANK.copyError)})\n`;
          message += `Thầy cô luôn sẵn sàng hỗ trợ con đầu buổi sau ạ! 🤝`;
        }
      } else {
        message = `Kính gửi Phụ huynh học sinh ${shortName},\n\nTrung tâm Anh ngữ Nhật Mỹ xin gửi báo cáo buổi học:\n- Trạng thái: ${isPresent ? 'Có mặt đầy đủ' : status}\n- Đánh giá: ${teacherNotes || 'Đạt yêu cầu'}\n`;
        if (hasViolations) {
          message += `Kính đề nghị Phụ huynh nhắc nhở con hoàn thành bài tập còn thiếu để đảm bảo tiến độ học tập trên lớp. Trân trọng!`;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tạo tin nhắn AI thành công!',
      data: message,
      source: 'natural_benefit_engine'
    });

  } catch (error) {
    console.error('Lỗi AI Suggest API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
