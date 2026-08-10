import prisma from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { encryptStudentId } from "@/lib/token";
import CopyLinkButton from "./CopyLinkButton";
import ReviewActionClient from "./ReviewActionClient";
export const revalidate = 0;

export default async function StudentDetailPage({ params }) {
  // Await params for Next.js 15+ compatibility
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          class: true,
        },
      },
      orders: {
        include: {
          class: true,
        },
      },
      certificates: true,
    },
  });

  if (!student) {
    notFound();
  }

  const encryptedToken = encryptStudentId(student.id);

  // Lấy lịch sử điểm danh của học viên kèm nhận xét chung của lớp
  const attendances = await prisma.attendance.findMany({
    where: { studentId: id },
    include: {
      class: true,
    },
    orderBy: {
      date: 'desc',
    },
  });

  const attendanceWithSummary = await Promise.all(attendances.map(async (att) => {
    const summary = await prisma.attendanceSummary.findUnique({
      where: {
        classCode_date: {
          classCode: att.classCode,
          date: att.date,
        },
      },
    });
    return {
      ...att,
      classNotes: summary?.classNotes || '',
    };
  }));

  // Sắp xếp dòng thời gian học tập & giao dịch thành một timeline chung
  const timelineEvents = [];

  // Thêm sự kiện điểm danh vào timeline
  attendanceWithSummary.forEach(att => {
    const details = [];
    if (att.checkInTime) details.push(`Đi trễ: ${att.checkInTime}`);
    if (att.teacherNotes) details.push(`Nhận xét riêng: ${att.teacherNotes}`);
    if (att.classNotes) details.push(`Nhật ký chung của lớp: ${att.classNotes}`);

    const descText = details.join(' | ') || 'Không có ghi chú thêm.';

    timelineEvents.push({
      date: att.date,
      type: 'attendance',
      title: `Điểm danh lớp ${att.classCode}: ${att.status}`,
      desc: descText,
      icon: att.status === 'Có mặt' ? 'fa-solid fa-calendar-check' : 'fa-solid fa-calendar-times',
      color: att.status === 'Có mặt' ? 'bg-success' : att.status === 'Vắng có phép' ? 'bg-warning' : 'bg-danger'
    });
  });

  // Thêm sự kiện đăng ký lớp
  student.enrollments.forEach(enroll => {
    timelineEvents.push({
      date: enroll.createdAt,
      type: 'enrollment',
      title: `Nhập học lớp ${enroll.classCode}`,
      desc: `Giáo viên phụ trách: ${enroll.class.teacherName || 'N/A'}. Bắt đầu học từ ${new Date(enroll.class.startDate).toLocaleDateString('vi-VN')}.`,
      icon: 'fa-solid fa-school-flag',
      color: 'bg-primary'
    });

    // Nếu có điểm số
    if (enroll.midTermListening || enroll.midTermSpeaking || enroll.midTermReading || enroll.midTermWriting) {
      timelineEvents.push({
        date: enroll.updatedAt,
        type: 'midterm',
        title: `Kết quả thi Giữa khóa - Lớp ${enroll.classCode}`,
        desc: `Nghe: ${enroll.midTermListening || 0} | Nói: ${enroll.midTermSpeaking || 0} | Đọc: ${enroll.midTermReading || 0} | Viết: ${enroll.midTermWriting || 0}. Nhận xét: ${enroll.teacherNotes || 'Chưa cập nhật'}`,
        icon: 'fa-solid fa-square-poll-vertical',
        color: 'bg-warning'
      });
    }
  });

  // Thêm sự kiện đóng tiền
  student.orders.forEach(order => {
    timelineEvents.push({
      date: order.createdAt,
      type: 'payment',
      title: `Phát sinh hóa đơn học phí ${order.id}`,
      desc: `Tổng học phí cần đóng: ${order.feeToPay.toLocaleString('vi-VN')}đ. Thực đóng đợt này: ${order.amountPaid.toLocaleString('vi-VN')}đ. Trạng thái: ${order.paymentStatus}. Tặng phẩm kèm theo: ${order.giftName || 'Không'}`,
      icon: 'fa-solid fa-money-check-dollar',
      color: 'bg-success'
    });
  });

  // Thêm sự kiện chứng chỉ
  student.certificates.forEach(cert => {
    timelineEvents.push({
      date: cert.createdAt,
      type: 'certificate',
      title: `Nhận Chứng chỉ: ${cert.examName}`,
      desc: `Điểm số đạt được: ${cert.score || 'Đang chờ'}. Ghi chú: ${cert.notes || 'Không'}`,
      icon: 'fa-solid fa-award',
      color: 'bg-danger'
    });
  });

  // Sắp xếp timeline theo thứ tự thời gian giảm dần
  timelineEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="profile-container">
      <div className="profile-back-link">
        <Link href="/students" className="back-btn">
          <i className="fa-solid fa-arrow-left-long"></i> Quay lại danh sách
        </Link>
      </div>

      {/* Info Card */}
      <div className="profile-grid">
        <div className="info-card glass-panel">
          <div className="profile-header">
            <div className="avatar-large">
              <i className="fa-solid fa-user-graduate"></i>
            </div>
            <h2>{student.name}</h2>
            <span className="student-badge">{student.id}</span>
            <div style={{ marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>Sổ liên lạc điện tử: </span>
              <CopyLinkButton token={encryptedToken} />
              <ReviewActionClient studentId={student.id} studentName={student.name} classCode={student.enrollments?.[0]?.classCode || ''} />
            </div>
          </div>

          <div className="profile-details-list">
            <div className="detail-item">
              <i className="fa-solid fa-phone"></i>
              <div>
                <span>Số điện thoại</span>
                <p>{student.phone || 'N/A'}</p>
              </div>
            </div>
            <div className="detail-item">
              <i className="fa-solid fa-id-card"></i>
              <div>
                <span>Số định danh / CCCD</span>
                <p>{student.nationalId || 'N/A'}</p>
              </div>
            </div>
            <div className="detail-item">
              <i className="fa-solid fa-cake-candles"></i>
              <div>
                <span>Ngày sinh</span>
                <p>{student.dob ? new Date(student.dob).toLocaleDateString('vi-VN') : 'N/A'}</p>
              </div>
            </div>
            <div className="detail-item">
              <i className="fa-solid fa-location-dot"></i>
              <div>
                <span>Địa chỉ</span>
                <p>{student.address || 'N/A'}</p>
              </div>
            </div>
            <div className="detail-item">
              <i className="fa-solid fa-percent"></i>
              <div>
                <span>Chính sách giảm giá trọn đời</span>
                <p>
                  {student.specialPolicyType && student.specialPolicyType !== 'Không giảm'
                    ? `${student.specialPolicyType} (Giảm ${student.specialPolicyValue?.toLocaleString('vi-VN')}đ)`
                    : student.specialPolicy || 'Không có chính sách giảm'}
                </p>
              </div>
            </div>
            <div className="detail-item">
              <i className="fa-solid fa-share-nodes"></i>
              <div>
                <span>Mã giới thiệu (Affiliate)</span>
                <p className="ref-code">{student.referralCode || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Area */}
        <div className="timeline-card glass-panel">
          <div className="card-header">
            <h3><i className="fa-solid fa-timeline"></i> Nhật ký hoạt động & Dòng thời gian</h3>
          </div>
          <div className="card-body">
            {timelineEvents.length === 0 ? (
              <div className="empty-timeline">
                <i className="fa-solid fa-clock-rotate-left"></i>
                <p>Chưa có lịch sử hoạt động học tập nào được ghi nhận cho học sinh này.</p>
              </div>
            ) : (
              <div className="timeline">
                {timelineEvents.map((event, idx) => (
                  <div className="timeline-event" key={idx}>
                    <div className="timeline-event-badge">
                      <div className={`event-icon-circle ${event.color}`}>
                        <i className={event.icon}></i>
                      </div>
                    </div>
                    <div className="timeline-event-content">
                      <span className="event-date">
                        {new Date(event.date).toLocaleDateString('vi-VN', {
                          year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      <h4>{event.title}</h4>
                      <p>{event.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .profile-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-primary-dark);
          transition: transform 0.2s;
        }

        .back-btn:hover {
          transform: translateX(-4px);
        }

        .profile-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 2rem;
        }

        @media (max-width: 992px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
        }

        .info-card {
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          height: fit-content;
        }

        .profile-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          text-align: center;
          width: 100%;
        }

        .avatar-large {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: rgba(13, 136, 196, 0.1);
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          margin-bottom: 0.5rem;
          border: 2px solid rgba(13, 136, 196, 0.2);
        }

        .profile-header h2 {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--color-text);
        }

        .student-badge {
          font-family: monospace;
          font-weight: 700;
          background: var(--color-border);
          color: var(--color-text-muted);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
        }

        .profile-details-list {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          border-top: 1px solid var(--color-border);
          padding-top: 1.5rem;
        }

        .detail-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .detail-item i {
          font-size: 1.1rem;
          color: var(--color-primary);
          margin-top: 0.2rem;
          width: 20px;
          text-align: center;
        }

        .detail-item span {
          display: block;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-weight: 500;
        }

        .detail-item p {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text);
          margin-top: 0.1rem;
        }

        .ref-code {
          color: var(--color-primary-dark) !important;
          font-family: monospace;
          letter-spacing: 0.5px;
        }

        .timeline-card {
          padding: 2rem;
        }

        .card-header {
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 1rem;
          margin-bottom: 1.5rem;
        }

        .card-header h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .empty-timeline {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          gap: 1rem;
          color: var(--color-text-muted);
          text-align: center;
        }

        .empty-timeline i {
          font-size: 3rem;
        }

        /* Timeline Graphics */
        .timeline {
          position: relative;
          padding-left: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .timeline::before {
          content: '';
          position: absolute;
          left: 9px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--color-border);
        }

        .timeline-event {
          position: relative;
        }

        .timeline-event-badge {
          position: absolute;
          left: -2rem;
          top: 0.25rem;
        }

        .event-icon-circle {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          color: white;
          border: 2px solid var(--color-surface);
          box-shadow: var(--shadow-sm);
        }

        .bg-primary { background-color: var(--color-primary); }
        .bg-warning { background-color: var(--color-warning); color: #1e293b; }
        .bg-success { background-color: var(--color-success); }
        .bg-danger { background-color: var(--color-danger); }

        .timeline-event-content {
          background: rgba(255, 255, 255, 0.4);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 1rem;
          transition: transform 0.2s;
        }

        .timeline-event-content:hover {
          transform: translateX(4px);
        }

        .event-date {
          display: block;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .timeline-event-content h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--color-text);
        }

        .timeline-event-content p {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin-top: 0.25rem;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
