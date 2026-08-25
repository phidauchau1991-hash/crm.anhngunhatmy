import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { holidayName = 'Ngày Lễ' } = body;

    const data = {
      zaloOptions: [
        `🎉 THÔNG BÁO NGHỈ LỄ ${holidayName} 🎉\n\nKính gửi Quý phụ huynh,\nTrung tâm Ngoại ngữ Nhật Mỹ xin thông báo lịch nghỉ lễ ${holidayName} sắp tới.\nKính chúc Quý phụ huynh và các em học sinh một kỳ nghỉ vui vẻ, an toàn và tràn đầy hạnh phúc! 💖\n\nTrân trọng,\nTrung tâm Ngoại ngữ Nhật Mỹ`,
        `📢 LỊCH NGHỈ LỄ ${holidayName.toUpperCase()} 📢\n\nTrung tâm Nhật Mỹ trân trọng thông báo đến Quý phụ huynh lịch nghỉ lễ ${holidayName}.\nChúc các em học sinh có những ngày nghỉ ngơi thư giãn để nạp lại năng lượng! ✨\nMọi thắc mắc xin vui lòng liên hệ Zalo trung tâm.\n\nTrân trọng!`,
        `🌸 NGHỈ LỄ ${holidayName.toUpperCase()} 🌸\n\nKính chúc Quý phụ huynh và các học viên một kỳ nghỉ lễ ${holidayName} ấm áp bên gia đình. Trung tâm xin gửi thông báo nghỉ lễ như trên ảnh.\nHẹn gặp lại các em học sinh sau kỳ nghỉ!\n\nNhật Mỹ English Center.`
      ],
      fbOptions: [
        `🎉 [THÔNG BÁO] LỊCH NGHỈ LỄ ${holidayName.toUpperCase()} 🎉\n\nKính gửi Quý phụ huynh và các em học sinh yêu quý,\n\nTrung tâm Ngoại ngữ Nhật Mỹ xin trân trọng thông báo lịch nghỉ lễ ${holidayName}.\n\n🌟 Kính chúc Quý phụ huynh cùng gia đình một kỳ nghỉ lễ thật nhiều niềm vui, hạnh phúc và bình an.\n🌟 Chúc các bạn học viên có những ngày nghỉ ngơi thật sảng khoái để chuẩn bị cho những bài học thú vị sắp tới nhé!\n\n#NhatMy #NghiLe #Holiday #TiengAnh`,
        `🌟 LỊCH NGHỈ LỄ ${holidayName.toUpperCase()} - TRUNG TÂM NHẬT MỸ 🌟\n\nLoa loa loa 📢 Các bạn học viên chú ý lịch nghỉ lễ ${holidayName} của trung tâm nhé!\n\nTrung tâm chúc toàn thể Quý phụ huynh và các bạn học sinh có một kỳ nghỉ lễ tuyệt vời, an toàn và tràn ngập tiếng cười! 🥰\n\nHẹn gặp lại các bạn sau lễ nha! 👋\n\n#TrungTamNhatMy #ThongBaoNghiLe`,
        `🎊 THÔNG BÁO LỊCH NGHỈ ${holidayName.toUpperCase()} 🎊\n\nTrung tâm Ngoại ngữ Nhật Mỹ xin thông báo lịch nghỉ lễ ${holidayName} đến toàn thể Quý phụ huynh và các em học sinh.\n\nKính chúc mọi người có những ngày nghỉ thật ý nghĩa và trọn vẹn bên những người thân yêu. ❤️\n\n#NhatMyEnglish #NghiLe${holidayName.replace(/\s+/g, '')}`
      ]
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Lỗi khi tạo nội dung AI:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
