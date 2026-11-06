import prisma from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { encryptStudentId } from "@/lib/token";
import CopyLinkButton from "./CopyLinkButton";
import ReviewActionClient from "./ReviewActionClient";
import TuitionNoticeAction from "./TuitionNoticeAction";
import CoursewareStudentAction from "./CoursewareStudentAction";
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
      assessments: {
        orderBy: { assessmentDate: 'desc' },
      },
      examResults: {
        include: {
          config: true,
          class: true,
        },
        orderBy: { examDate: 'desc' },
      },
    },
  });

  if (!student) {
    notFound();
  }

  const encryptedToken = encryptStudentId(student.id);

  // Lấy thêm assessments tạo từ giai đoạn Lead (nếu có bài test/học thử trước khi convert)
  let leadAssessments = [];
  if (student.phone) {
    try {
      const matchedLead = await prisma.lead.findFirst({ where: { phone: student.phone } });
      if (matchedLead) {
        leadAssessments = await prisma.studentAssessment.findMany({
          where: { leadId: matchedLead.id, studentId: null },
          orderBy: { assessmentDate: 'desc' },
        });
      }
    } catch (err) {
      console.error('Lỗi truy vấn leadAssessments:', err);
    }
  }

  const allAssessments = [...(student.assessments || []), ...leadAssessments].sort(
    (a, b) => new Date(b.assessmentDate || b.createdAt) - new Date(a.assessmentDate || a.createdAt)
  );

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

  // 1. Thêm sự kiện đánh giá (Placement Test, Học thử, Nhận xét định kỳ/đột xuất)
  allAssessments.forEach(ass => {
    let scores = {};
    let comments = {};
    try { scores = ass.scores ? JSON.parse(ass.scores) : {}; } catch {}
    try { comments = ass.comments ? JSON.parse(ass.comments) : {}; } catch {}

    let title = '';
    let desc = '';
    let icon = 'fa-solid fa-file-signature';
    let color = 'bg-primary';

    if (ass.type === 'PLACEMENT_TEST') {
      title = `Khảo sát Năng lực Đầu vào: ${ass.totalScore ? `${ass.totalScore}/100 điểm` : 'Đã thực hiện'}`;
      const scoreParts = [];
      if (scores.listening?.score) scoreParts.push(`Nghe: ${scores.listening.score}/${scores.listening.max || 100}`);
      if (scores.speaking?.score) scoreParts.push(`Nói: ${scores.speaking.score}/${scores.speaking.max || 100}`);
      if (scores.rw?.score) scoreParts.push(`Đọc & Viết: ${scores.rw.score}/${scores.rw.max || 100}`);

      const commentParts = [];
      if (comments.conclusion) commentParts.push(`Định hướng: ${comments.conclusion}`);
      else {
        if (comments.ls_comments) commentParts.push(`Nghe Nói: ${comments.ls_comments}`);
        if (comments.rw_comments) commentParts.push(`Đọc Viết: ${comments.rw_comments}`);
      }

      desc = [scoreParts.join(' | '), commentParts.join(' — ')].filter(Boolean).join(' • ') || 'Đã lưu kết quả kiểm tra đầu vào.';
      icon = 'fa-solid fa-file-signature';
      color = 'bg-primary';
    } else if (ass.type === 'TRIAL_EVALUATION') {
      title = `Đánh giá Quá trình Học thử ${ass.classCode ? `(Lớp ${ass.classCode})` : ''}`;
      const parts = [];
      if (comments.attitude) parts.push(`Thái độ: ${comments.attitude}`);
      if (comments.skills) parts.push(`Kỹ năng: ${comments.skills}`);
      if (comments.potential) parts.push(`Tiềm năng: ${comments.potential}`);
      if (comments.recommendation || comments.advice) parts.push(`Lời khuyên: ${comments.recommendation || comments.advice}`);
      desc = parts.join(' • ') || 'Đã lưu đánh giá học thử.';
      icon = 'fa-solid fa-user-clock';
      color = 'bg-primary';
    } else {
      title = `Nhận xét Học viên [${ass.type === 'PERIODIC_REVIEW' ? 'Định kỳ' : 'Đột xuất'}] ${ass.classCode ? `(Lớp ${ass.classCode})` : ''}`;
      const parts = [];
      if (comments.speaking) parts.push(`Nói: ${comments.speaking}`);
      if (comments.listening) parts.push(`Nghe: ${comments.listening}`);
      if (comments.rw) parts.push(`Đọc Viết: ${comments.rw}`);
      if (comments.dev) parts.push(`Định hướng: ${comments.dev}`);
      desc = parts.join(' • ') || 'Đã lưu nhận xét học viên.';
      icon = 'fa-solid fa-comment-dots';
      color = 'bg-success';
    }

    timelineEvents.push({
      date: ass.assessmentDate || ass.createdAt,
      type: 'assessment',
      title,
      desc,
      icon,
      color,
    });
  });

  // 2. Thêm sự kiện kết quả thi chính thức từ ExamResult
  (student.examResults || []).forEach(exam => {
    const examName = exam.config?.examName || 'Bài thi';
    const examTypeLabel = exam.config?.examType === 'MIDTERM' ? 'Giữa kỳ' : exam.config?.examType === 'FINAL' ? 'Cuối kỳ' : 'Kỳ thi';
    const scoreInfo = `Điểm: ${exam.totalScore ?? '-'}/${exam.maxScore || 100} (${exam.grade || 'Đạt'})`;
    const feedback = exam.teacherNotes ? `GV: ${exam.teacherNotes}` : (exam.aiFeedback ? `AI: ${exam.aiFeedback}` : '');

    timelineEvents.push({
      date: exam.examDate || exam.createdAt,
      type: 'exam',
      title: `Kết quả thi ${examTypeLabel}: ${examName} (Lớp ${exam.classCode})`,
      desc: [scoreInfo, feedback].filter(Boolean).join(' — ') || 'Đã ghi nhận kết quả thi.',
      icon: 'fa-solid fa-graduation-cap',
      color: 'bg-warning',
    });
  });

  // 3. Thêm sự kiện điểm danh vào timeline
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

  // 4. Thêm sự kiện đăng ký lớp
  student.enrollments.forEach(enroll => {
    timelineEvents.push({
      date: enroll.createdAt,
      type: 'enrollment',
      title: `Nhập học lớp ${enroll.classCode}`,
      desc: `Giáo viên phụ trách: ${enroll.class?.teacherName || 'N/A'}. Bắt đầu học từ ${enroll.class?.startDate ? new Date(enroll.class.startDate).toLocaleDateString('vi-VN') : 'N/A'}.`,
      icon: 'fa-solid fa-school-flag',
      color: 'bg-primary'
    });

    // Nếu có điểm số cũ từ Enrollment
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

  // 5. Thêm sự kiện đóng tiền
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

  // 6. Thêm sự kiện chứng chỉ
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

  // Trích xuất các bài đánh giá quan trọng cho khối Overview
  const placementTest = allAssessments.find(a => a.type === 'PLACEMENT_TEST');
  let placementScores = null;
  let placementComments = null;
  if (placementTest) {
    try { placementScores = placementTest.scores ? JSON.parse(placementTest.scores) : null; } catch {}
    try { placementComments = placementTest.comments ? JSON.parse(placementTest.comments) : null; } catch {}
  }

  const trialEvaluation = allAssessments.find(a => a.type === 'TRIAL_EVALUATION');
  let trialComments = null;
  let trialKeywords = null;
  if (trialEvaluation) {
    try { trialComments = trialEvaluation.comments ? JSON.parse(trialEvaluation.comments) : null; } catch {}
    try { trialKeywords = trialEvaluation.keywords ? JSON.parse(trialEvaluation.keywords) : null; } catch {}
  }

  const latestExam = student.examResults?.[0];
  const latestReview = allAssessments.find(a => a.type === 'PERIODIC_REVIEW' || a.type === 'ADHOC_REVIEW');
  let latestReviewComments = null;
  if (latestReview) {
    try { latestReviewComments = latestReview.comments ? JSON.parse(latestReview.comments) : null; } catch {}
  }

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
            <div style={{ marginTop: '0.5rem', width: '100%' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>Sổ liên lạc điện tử: </span>
              <CopyLinkButton token={encryptedToken} />
              <ReviewActionClient studentId={student.id} studentName={student.name} classCode={student.enrollments?.[0]?.classCode || ''} />
              <TuitionNoticeAction student={student} />
              <CoursewareStudentAction student={{ ...student, portalToken: encryptedToken }} classInfo={student.enrollments?.[0]?.class} />
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

        {/* Right Column: Learning Journey & Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* HỒ SƠ NĂNG LỰC & TIẾN TRÌNH HỌC TẬP (LEARNING JOURNEY) */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0d88c4', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-compass-drafting"></i> Hồ sơ Năng lực & Tiến trình Đánh giá Suốt Vòng Đời
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  Lưu trữ xuyên suốt từ Khảo sát đầu vào, Học thử, Kỳ thi chính thức đến các đợt Nhận xét định kỳ
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', background: '#eff6ff', color: '#1d4ed8', padding: '4px 12px', borderRadius: '20px', fontWeight: '700', border: '1px solid #bfdbfe' }}>
                {allAssessments.length + (student.examResults?.length || 0)} Lần Đánh Giá & Thi
              </span>
            </div>

            {/* 4 Khối Cột Mốc Năng Lực */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              
              {/* 1. Placement Test */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', borderTop: '4px solid #0d88c4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0d88c4', textTransform: 'uppercase' }}>
                    <i className="fa-solid fa-file-signature"></i> Khảo sát đầu vào
                  </span>
                  {placementTest && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {placementTest.assessmentDate ? new Date(placementTest.assessmentDate).toLocaleDateString('vi-VN') : ''}
                    </span>
                  )}
                </div>
                {placementTest ? (
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>
                      {placementTest.totalScore ?? '-'}<span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'normal' }}> / 100 điểm</span>
                    </div>
                    {placementScores && (
                      <div style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span>Nghe: <strong>{placementScores.listening?.score || '-'}</strong></span>
                        <span>Nói: <strong>{placementScores.speaking?.score || '-'}</strong></span>
                        <span>Đọc Viết: <strong>{placementScores.rw?.score || '-'}</strong></span>
                      </div>
                    )}
                    {placementComments?.conclusion && (
                      <p style={{ fontSize: '0.78rem', color: '#047857', background: '#ecfdf5', padding: '4px 8px', borderRadius: '6px', margin: 0, border: '1px solid #a7f3d0', lineHeight: '1.4' }}>
                        <strong>Lộ trình:</strong> {placementComments.conclusion}
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>Chưa có bài khảo sát đầu vào.</p>
                )}
              </div>

              {/* 2. Trial Evaluation */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', borderTop: '4px solid #8b5cf6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#8b5cf6', textTransform: 'uppercase' }}>
                    <i className="fa-solid fa-user-clock"></i> Đánh giá học thử
                  </span>
                  {trialEvaluation && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {trialEvaluation.assessmentDate ? new Date(trialEvaluation.assessmentDate).toLocaleDateString('vi-VN') : ''}
                    </span>
                  )}
                </div>
                {trialEvaluation ? (
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                      Lớp {trialEvaluation.classCode || 'Học thử'} • {trialKeywords?.sessions || 2} buổi
                    </div>
                    {trialComments?.attitude && (
                      <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 4px 0', lineHeight: '1.3' }}>
                        <strong>Thái độ:</strong> {trialComments.attitude}
                      </p>
                    )}
                    {(trialComments?.recommendation || trialComments?.advice) && (
                      <p style={{ fontSize: '0.78rem', color: '#6d28d9', background: '#f5f3ff', padding: '4px 8px', borderRadius: '6px', margin: 0, border: '1px solid #ddd6fe', lineHeight: '1.4' }}>
                        <strong>Khuyên:</strong> {trialComments.recommendation || trialComments.advice}
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>Chưa có đánh giá học thử.</p>
                )}
              </div>

              {/* 3. Latest Official Exam */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', borderTop: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>
                    <i className="fa-solid fa-graduation-cap"></i> Kỳ thi gần nhất
                  </span>
                  {latestExam && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {latestExam.examDate ? new Date(latestExam.examDate).toLocaleDateString('vi-VN') : ''}
                    </span>
                  )}
                </div>
                {latestExam ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>
                        {latestExam.config?.examName || 'Bài thi chính thức'}
                      </span>
                      <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#d97706' }}>
                        {latestExam.totalScore ?? '-'}/{latestExam.maxScore || 100}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                        Lớp {latestExam.classCode}
                      </span>
                      {latestExam.grade && (
                        <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#065f46', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                          Xếp loại: {latestExam.grade}
                        </span>
                      )}
                    </div>
                    {latestExam.teacherNotes && (
                      <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, fontStyle: 'italic', lineHeight: '1.3' }}>
                        "{latestExam.teacherNotes}"
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>Chưa có kết quả kỳ thi nào.</p>
                )}
              </div>

              {/* 4. Latest Review */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', borderTop: '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#059669', textTransform: 'uppercase' }}>
                    <i className="fa-solid fa-comment-dots"></i> Nhận xét gần nhất
                  </span>
                  {latestReview && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {latestReview.assessmentDate ? new Date(latestReview.assessmentDate).toLocaleDateString('vi-VN') : ''}
                    </span>
                  )}
                </div>
                {latestReview ? (
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                      {latestReview.title || 'Nhận xét học viên'}
                    </div>
                    {latestReviewComments?.speaking && (
                      <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 3px 0', lineHeight: '1.3' }}>
                        <strong>Nói:</strong> {latestReviewComments.speaking}
                      </p>
                    )}
                    {latestReviewComments?.dev && (
                      <p style={{ fontSize: '0.78rem', color: '#047857', background: '#ecfdf5', padding: '4px 8px', borderRadius: '6px', margin: 0, border: '1px solid #a7f3d0', lineHeight: '1.4' }}>
                        <strong>Định hướng:</strong> {latestReviewComments.dev}
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>Chưa có nhận xét định kỳ.</p>
                )}
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
