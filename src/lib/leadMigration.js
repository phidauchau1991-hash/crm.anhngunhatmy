/**
 * Chuyển toàn bộ lịch sử từ Lead (Điểm danh học thử, Bài test đầu vào / Nhận xét học thử,
 * Học liệu số) sang Học viên chính thức mới tạo và cập nhật Lead thành "Đã chốt".
 * Dùng chung cho cả luồng Ghi danh Khóa (/api/students) và Chốt Học viên Tháng (/api/finance/monthly/config).
 */
export async function migrateLeadHistoryToStudent(prisma, convertLeadId, studentId) {
  const leadIdInt = parseInt(convertLeadId, 10);
  if (Number.isNaN(leadIdInt) || !studentId) return;

  // 1. Gộp điểm danh học thử (giữ nguyên leadId để phân biệt buổi học thử miễn phí khi tính tiền tháng)
  const migratedAtt = await prisma.attendance.updateMany({
    where: {
      leadId: leadIdInt,
      studentId: null,
    },
    data: { studentId },
  });
  console.log(`[Lead→HV] Gộp ${migratedAtt.count} bản ghi điểm danh từ Lead #${leadIdInt} sang HV ${studentId}`);

  // 2. Gộp bài Test đầu vào & Đánh giá học thử
  const migratedAssessments = await prisma.studentAssessment.updateMany({
    where: {
      leadId: leadIdInt,
      studentId: null,
    },
    data: { studentId },
  });
  console.log(`[Lead→HV] Gộp ${migratedAssessments.count} bài test & đánh giá từ Lead #${leadIdInt} sang HV ${studentId}`);

  // 3. Chuyển lịch sử Học liệu số & phân quyền sách (không copy hạn dùng thử coursewareExpiresAt)
  const leadCwKey = `LEAD_${leadIdInt}`;
  try {
    const leadRecord = await prisma.lead.findUnique({ where: { id: leadIdInt } });
    if (leadRecord) {
      await prisma.$executeRaw`UPDATE StudySession SET studentId = ${studentId} WHERE studentId = ${leadCwKey} OR studentId = ${String(leadIdInt)}`;
      const sessStats = await prisma.$queryRaw`SELECT COALESCE(SUM(durationSeconds), 0) AS totalSec, MIN(createdAt) AS firstAt, MAX(createdAt) AS lastAt FROM StudySession WHERE studentId = ${studentId}`;
      const totalMin = Math.round(Number(sessStats?.[0]?.totalSec || 0) / 60.0);

      if (leadRecord.customBookCodes || leadRecord.retainCoursewareAccess) {
        await prisma.student.update({
          where: { id: studentId },
          data: {
            ...(leadRecord.customBookCodes ? { customBookCodes: leadRecord.customBookCodes } : {}),
            ...(leadRecord.retainCoursewareAccess ? { retainCoursewareAccess: true } : {}),
          },
        });
      }
      if (totalMin > 0 || sessStats?.[0]?.firstAt) {
        await prisma.$executeRaw`
          UPDATE Student
          SET coursewareStudyMinutes = ${totalMin},
              coursewareActivatedAt = COALESCE(coursewareActivatedAt, ${sessStats[0].firstAt}),
              coursewareLastActiveAt = COALESCE(${sessStats[0].lastAt}, coursewareLastActiveAt)
          WHERE id = ${studentId}
        `;
      }
    }
  } catch (cwErr) {
    console.warn('[Lead→HV] Lỗi chuyển dữ liệu học liệu số:', cwErr?.message);
  }

  // 4. Đánh dấu Lead thành "Đã chốt"
  await prisma.lead
    .update({
      where: { id: leadIdInt },
      data: { status: 'Đã chốt' },
    })
    .catch(() => {});
}
