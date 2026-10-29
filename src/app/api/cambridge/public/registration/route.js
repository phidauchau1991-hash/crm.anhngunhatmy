import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET: Lấy thông tin đăng ký của thí sinh để phụ huynh chỉnh sửa
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const idNum = parseInt(id, 10);
    if (!id || isNaN(idNum)) {
      return NextResponse.json({ success: false, error: 'Mã hồ sơ không hợp lệ' }, { status: 400 });
    }

    const registration = await prisma.cambridgeRegistration.findUnique({
      where: { id: idNum },
      include: {
        batch: {
          select: {
            id: true,
            title: true,
            examDate: true,
            registrationDeadline: true,
            closeHour: true,
            status: true,
            levelsConfig: true
          }
        }
      }
    });

    if (!registration) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy hồ sơ đăng ký' }, { status: 404 });
    }

    // Không cho phép sửa nếu đã hoàn tất đóng tiền
    if (registration.paymentStatus === 'DA_DONG') {
      return NextResponse.json({
        success: false,
        error: 'Hồ sơ này đã được Kế toán xác nhận đóng phí chính thức và chuyển sang Hội đồng thi. Để điều chỉnh thông tin, Quý phụ huynh vui lòng liên hệ trực tiếp Hotline trung tâm!',
        isPaid: true
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      registration: {
        id: registration.id,
        batchId: registration.batchId,
        fullName: registration.fullName,
        fullNameNoTone: registration.fullNameNoTone,
        gender: registration.gender,
        dob: registration.dob,
        dobStr: registration.dobStr,
        parentPhone: registration.parentPhone,
        parentEmail: registration.parentEmail,
        level: registration.level,
        fee: registration.fee,
        notes: registration.notes,
        batch: registration.batch
      }
    });
  } catch (error) {
    console.error('Error fetching public registration:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tải hồ sơ thí sinh' }, { status: 500 });
  }
}
