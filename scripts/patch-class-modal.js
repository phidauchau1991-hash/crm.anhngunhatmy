const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'app', 'classes', '[code]', 'page.js');
let content = fs.readFileSync(file, 'utf8');

const modalCode = `      {/* Modal Xuất Thư Học Liệu & Thẻ Học Viên Cho Lớp */}
      <CoursewareNoticeModal
        isOpen={isCoursewareModalOpen}
        onClose={() => {
          setIsCoursewareModalOpen(false);
          setCoursewareSingleStudent(null);
        }}
        students={coursewareSingleStudent ? [coursewareSingleStudent] : (students || [])}
        classInfo={classInfo}
      />
    </div>
  );
}`;

if (!content.includes('<CoursewareNoticeModal')) {
  content = content.replace('    </div>\n  );\n}', modalCode);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ Đã thêm CoursewareNoticeModal vào cuối trang classes/[code]/page.js!');
} else {
  console.log('CoursewareNoticeModal đã tồn tại trong classes/[code]/page.js');
}
