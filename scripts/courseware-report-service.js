const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');

const DB_PATH = process.env.DB_PATH || '/var/www/nhat-my-crm/dev.db';

function getDb() {
  return new Database(DB_PATH);
}

function formatDateVN(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function get14DayReportData(filterClassCode = null) {
  const db = getDb();
  try {
    let classesQuery = "SELECT code, level, teacherName, careStaff, schedule FROM Class";
    let params = [];
    if (filterClassCode) {
      classesQuery += " WHERE code = ?";
      params.push(filterClassCode);
    }
    classesQuery += " ORDER BY code ASC";

    const classes = db.prepare(classesQuery).all(...params);

    const now = new Date();
    const cycleStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    let totalStudents = 0;
    let activeTotal = 0;
    let warnTotal = 0;
    let dangerTotal = 0;

    const classSummaries = [];
    const allStudentsList = [];

    for (const c of classes) {
      const students = db.prepare(`
        SELECT s.id, s.name, s.phone, s.status, s.coursewareStudyMinutes, s.coursewareLastActiveAt, s.coursewareCurrentProgress
        FROM Student s
        JOIN Enrollment e ON s.id = e.studentId
        WHERE e.classCode = ? AND e.status = 'Đang học'
        ORDER BY s.name ASC
      `).all(c.code);

      if (students.length === 0) continue;

      let cActive = 0;
      let cWarn = 0;
      let cDanger = 0;

      for (const st of students) {
        const mins = st.coursewareStudyMinutes || 0;
        let stStatus = 'danger';
        if (mins >= 45) {
          stStatus = 'active';
          cActive++;
        } else if (mins > 0) {
          stStatus = 'warn';
          cWarn++;
        } else {
          cDanger++;
        }

        allStudentsList.push({
          id: st.id,
          name: st.name,
          phone: st.phone,
          classCode: c.code,
          durationMinutes: mins,
          lastActive: st.coursewareLastActiveAt || 'Chưa từng vào học',
          currentProgress: st.coursewareCurrentProgress || 'Chưa học',
          status: stStatus
        });
      }

      totalStudents += students.length;
      activeTotal += cActive;
      warnTotal += cWarn;
      dangerTotal += cDanger;

      const activeRate = students.length > 0 ? Math.round((cActive / students.length) * 100) : 0;

      classSummaries.push({
        code: c.code,
        teacher: c.teacherName || 'Chưa phân công',
        schedule: c.schedule || '',
        careStaff: c.careStaff || 'Chưa phân công',
        total: students.length,
        active: cActive,
        warn: cWarn,
        danger: cDanger,
        activeRate: activeRate
      });
    }

    const overallRate = totalStudents > 0 ? Math.round((activeTotal / totalStudents) * 100) : 0;

    return {
      cycleStart: formatDateVN(cycleStart),
      cycleEnd: formatDateVN(now),
      generatedAt: now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      totalClasses: classSummaries.length,
      totalStudents,
      activeTotal,
      warnTotal,
      dangerTotal,
      overallRate,
      classes: classSummaries,
      students: allStudentsList
    };
  } finally {
    db.close();
  }
}

function buildReportHtml(reportData) {
  const { cycleStart, cycleEnd, generatedAt, totalClasses, totalStudents, activeTotal, warnTotal, dangerTotal, overallRate, classes } = reportData;

  const classRows = classes.map((c, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${c.code}</td>
      <td style="padding: 10px 12px; color: #475569;">${c.teacher}</td>
      <td style="padding: 10px 12px; text-align: center; color: #334155; font-weight: bold;">${c.total}</td>
      <td style="padding: 10px 12px; text-align: center; color: #16a34a; font-weight: bold;">${c.active}</td>
      <td style="padding: 10px 12px; text-align: center; color: #d97706; font-weight: bold;">${c.warn}</td>
      <td style="padding: 10px 12px; text-align: center; color: #dc2626; font-weight: bold;">${c.danger}</td>
      <td style="padding: 10px 12px; text-align: center; font-weight: bold; color: ${c.activeRate >= 50 ? '#16a34a' : (c.activeRate >= 20 ? '#d97706' : '#dc2626')};">
        ${c.activeRate}%
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo Cáo Định Kỳ 14 Ngày · Anh Ngữ Nhật Mỹ</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5;">
  <div style="max-width: 680px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
    
    <!-- HEADER -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <div style="font-size: 13px; font-weight: 700; letter-spacing: 2px; color: #38bdf8; text-transform: uppercase; margin-bottom: 6px;">
        🌸 ANH NGỮ NHẬT MỸ
      </div>
      <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
        BÁO CÁO ĐỊNH KỲ 14 NGÀY
      </h1>
      <div style="font-size: 14px; color: #94a3b8;">
        Tiến Độ Ôn Tập Học Liệu Số Tại Nhà (Oxford Beehive)
      </div>
      <div style="display: inline-block; margin-top: 14px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); padding: 5px 14px; border-radius: 20px; font-size: 12px; color: #bae6fd; font-weight: 600;">
        📅 Chu kỳ: ${cycleStart} ➔ ${cycleEnd} · Xuất lúc: ${generatedAt}
      </div>
    </div>

    <!-- NỘI DUNG CHÍNH -->
    <div style="padding: 24px;">
      
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569;">
        Kính gửi <strong>Thầy Châu Phi Đấu & Đội ngũ Quản lý Học vụ</strong>,
        <br><br>
        Hệ thống tự động tổng hợp kết quả luyện tập học liệu số của học viên toàn trung tâm trong <strong>14 ngày vừa qua</strong>. Dưới đây là bức tranh tổng thể để Thầy và Thầy Cô theo dõi và đôn đốc phụ huynh kịp thời:
      </p>

      <!-- 3 THẺ CHỈ SỐ KPI -->
      <div style="display: flex; gap: 12px; margin-bottom: 24px; text-align: center;">
        
        <!-- ACTIVE -->
        <div style="flex: 1; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 16px 8px;">
          <div style="font-size: 24px; font-weight: 900; color: #16a34a; margin-bottom: 4px;">
            ${activeTotal} <span style="font-size: 13px; font-weight: 600; color: #15803d;">(${overallRate}%)</span>
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase;">
            🟢 Chăm Chỉ
          </div>
          <div style="font-size: 11px; color: #4ade80; margin-top: 4px;">≥ 45 phút học</div>
        </div>

        <!-- WARN -->
        <div style="flex: 1; background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 12px; padding: 16px 8px;">
          <div style="font-size: 24px; font-weight: 900; color: #d97706; margin-bottom: 4px;">
            ${warnTotal}
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #92400e; text-transform: uppercase;">
            🟡 Cần Đôn Đốc
          </div>
          <div style="font-size: 11px; color: #f59e0b; margin-top: 4px;">&lt; 45 phút học</div>
        </div>

        <!-- DANGER -->
        <div style="flex: 1; background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 12px; padding: 16px 8px;">
          <div style="font-size: 24px; font-weight: 900; color: #dc2626; margin-bottom: 4px;">
            ${dangerTotal}
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #991b1b; text-transform: uppercase;">
            🔴 Chưa Kích Hoạt
          </div>
          <div style="font-size: 11px; color: #ef4444; margin-top: 4px;">0 phút học</div>
        </div>

      </div>

      <!-- NÚT CTA CHÍNH (CALL TO ACTION) -->
      <div style="text-align: center; margin: 28px 0;">
        <a href="https://nhatmy-learning-app.vercel.app/lab/dashboard.html" 
           style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 800; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4); letter-spacing: 0.3px;">
          👉 MỞ DASHBOARD THEO LỚP ĐỂ NHẮN ZALO PHỤ HUYNH
        </a>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
          Bấm nút trên để mở nhanh danh sách từng lớp và sao chép tin nhắn Zalo gửi phụ huynh chỉ với 1 chạm
        </div>
      </div>

      <!-- BẢNG TỔNG HỢP THEO LỚP -->
      <div style="margin-top: 24px;">
        <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
          <span>🏫 Chi Tiết Hoạt Động Theo Từng Lớp (${totalClasses} Lớp · ${totalStudents} Học Viên)</span>
        </div>
        
        <div style="border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
            <thead>
              <tr style="background: #f1f5f9; color: #475569; font-weight: 700; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 10px 12px;">Mã Lớp</th>
                <th style="padding: 10px 12px;">Giáo Viên</th>
                <th style="padding: 10px 12px; text-align: center;">Sĩ Số</th>
                <th style="padding: 10px 12px; text-align: center;">🟢 Chăm</th>
                <th style="padding: 10px 12px; text-align: center;">🟡 Nhắc</th>
                <th style="padding: 10px 12px; text-align: center;">🔴 Chưa</th>
                <th style="padding: 10px 12px; text-align: center;">Tỷ Lệ</th>
              </tr>
            </thead>
            <tbody>
              ${classRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- LƯU Ý VẬN HÀNH -->
      <div style="margin-top: 24px; background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 12px; color: #475569;">
        <strong>💡 Hướng Dẫn Hành Động Trong Kỳ Báo Cáo 14 Ngày:</strong><br>
        1. <strong>Nhóm 🟢 Chăm chỉ:</strong> Thầy Cô khen ngợi bé trên nhóm lớp hoặc tin nhắn Zalo để duy trì động lực.<br>
        2. <strong>Nhóm 🟡 Cần đôn đốc:</strong> Gửi mẫu tin nhắn nhắc nhở Ba Mẹ dành 15 phút mỗi tối mở App cho con ôn từ vựng.<br>
        3. <strong>Nhóm 🔴 Chưa kích hoạt:</strong> Nhân viên CSKH gọi điện hoặc gửi lại mã QR hỗ trợ phụ huynh mở sách lần đầu.
      </div>

    </div>

    <!-- FOOTER -->
    <div style="background: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
      <div style="font-weight: 700; color: #1e293b; margin-bottom: 4px;">
        Trung tâm Anh Ngữ Nhật Mỹ
      </div>
      <div>
        Hotline: <strong style="color: #0284c7;">0911 767 069</strong>
      </div>
      <div style="margin-top: 8px; font-size: 11px; color: #94a3b8;">
        Hệ thống tự động kích hoạt chuông báo định kỳ mỗi 14 ngày. Thư này được gửi tự động từ máy chủ CRM.
      </div>
    </div>

  </div>
</body>
</html>
  `;
}

async function sendBiweeklyReport(toEmail = 'academic@anhngunhatmy.edu.vn', filterClassCode = null) {
  const reportData = get14DayReportData(filterClassCode);
  const html = buildReportHtml(reportData);

  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
      user: 'academic@anhngunhatmy.edu.vn',
      pass: '1aWMQdULwuDF'
    }
  });

  const subject = `🔔 [Anh Ngữ Nhật Mỹ] Báo Cáo Định Kỳ 14 Ngày · Tiến Độ Học Liệu Số (${reportData.cycleStart} - ${reportData.cycleEnd})`;

  const info = await transporter.sendMail({
    from: '"Anh Ngữ Nhật Mỹ" <cambridge@anhngunhatmy.edu.vn>',
    replyTo: 'academic@anhngunhatmy.edu.vn',
    to: toEmail,
    subject: subject,
    html: html
  });

  console.log(`[BiweeklyReport] Đã gửi báo cáo thành công tới: ${toEmail} (MessageId: ${info.messageId})`);

  return {
    success: true,
    messageId: info.messageId,
    sentTo: toEmail,
    reportData
  };
}

module.exports = {
  get14DayReportData,
  buildReportHtml,
  sendBiweeklyReport
};
