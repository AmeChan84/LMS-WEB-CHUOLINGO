# AI-Powered Learning Management Platform (Chuolingo LMS) - Product Requirements Document

## Overview
- **Summary**: Xây dựng một nền tảng quản lý học tập đầy đủ tính năng, được hỗ trợ bởi AI, cho phép giáo viên quản lý lớp học, tải lên bài giảng Zoom và tài liệu học tập, đồng thời sử dụng AI để tự động tạo bài tập về nhà tương tác dựa trên nội dung bài giảng.
- **Purpose**: Giải quyết vấn đề giáo viên tốn nhiều thời gian để tạo bài tập, chấm điểm, và theo dõi tiến độ học tập; giúp học sinh có trải nghiệm học tập tương tác, nhận phản hồi tức thì, và theo dõi tiến độ cá nhân.
- **Target Users**: 
  - Giáo viên (Teacher): Người tạo nội dung, quản lý lớp học, tạo bài tập, xem phân tích hiệu suất
  - Học sinh (Student): Người tham gia lớp học, xem bài giảng, làm bài tập, theo dõi điểm số

## Goals
- Cung cấp hệ thống xác thực an toàn với phân quyền 2 vai trò (Teacher/Student)
- Giáo viên có thể tạo và quản lý lớp học với mã tham gia duy nhất
- Hỗ trợ tải lên video ghi hình Zoom (MP4) và nhiều loại tài liệu học tập (PDF, PPT, DOC, hình ảnh)
- Tích hợp AI để tạo bài tập tương tác đa dạng (trắc nghiệm, đúng/sai, điền khuyết, nối đôi, trả lời ngắn, sắp xếp, thẻ ghi nhớ, tình huống thực tế)
- Giao diện làm bài tập tương tác cho học sinh với phản hồi tức thì (đối với các dạng câu hỏi tự động chấm)
- Hệ thống quản lý bài tập, xem bài nộp, và phân tích hiệu suất lớp học
- Giao diện hiện đại, professional, responsive theo chuẩn SaaS (Notion, Linear, Google Classroom)
- Tất cả chức năng chính phải hoạt động thực tế, không phải UI tĩnh

## Non-Goals
- Không xây dựng hệ thống video conferencing trực tiếp (sử dụng Zoom recordings đã có)
- Không tích hợp thanh toán/nhận đăng ký trả phí
- Không xây dựng mobile app native (chỉ responsive web)
- Không hỗ trợ nhiều ngôn ngữ (giao diện tiếng Việt chính, nội dung bài học theo ngôn ngữ giáo viên nhập)
- Không tích hợp LMS bên thứ ba (Moodle, Canvas...) trong scope này
- Không tạo hệ thống chat thời gian thực giữa giáo viên-học sinh

## Background & Context
- Dự án khởi đầu mới, không có codebase sẵn có
- Cần stack hiện đại: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, Supabase Auth & Storage, OpenAI API
- Tất cả API key phải được quản lý server-side, không expose ra frontend

## Functional Requirements

### Authentication & User Roles (FR-Auth)
- **FR-Auth-1**: Teacher có thể đăng ký với tên, email, mật khẩu
- **FR-Auth-2**: Student có thể đăng ký với tên, email, mật khẩu
- **FR-Auth-3**: User có thể đăng nhập/đăng xuất
- **FR-Auth-4**: User có thể reset mật khẩu quên
- **FR-Auth-5**: Phân quyền dựa trên vai trò (RBAC) - Teacher không truy cập trang Student-only và ngược lại
- **FR-Auth-6**: Teacher chỉ quản lý được lớp của chính mình
- **FR-Auth-7**: Student chỉ truy cập được lớp đã tham gia
- **FR-Auth-8**: Session đăng nhập bền vững (persistent)

### Teacher Dashboard (FR-TD)
- **FR-TD-1**: Sidebar navigation với các mục: Dashboard, My Classes, Lesson Library, AI Homework Generator, Assignments, Students, Analytics, Settings, Sign Out
- **FR-TD-2**: Summary cards: Total Classes, Total Students, Uploaded Lessons, Active Assignments, Pending Submissions
- **FR-TD-3**: Recent activity feed
- **FR-TD-4**: Recently uploaded lessons
- **FR-TD-5**: Upcoming assignment deadlines
- **FR-TD-6**: Quick action buttons (Create Class, Upload Lesson, Generate Homework)

### Class Management (FR-Class)
- **FR-Class-1**: Teacher tạo lớp học với: tên lớp, môn học, cấp độ/lớp, mô tả, ảnh bìa (optional)
- **FR-Class-2**: Mỗi lớp có mã tham gia (join code) duy nhất
- **FR-Class-3**: Trang chi tiết lớp học gồm 7 tab: Overview, Lessons, Recordings, Materials, Assignments, Students, Analytics
- **FR-Class-4**: Teacher chỉnh sửa thông tin lớp học
- **FR-Class-5**: Teacher lưu trữ (archive) lớp học
- **FR-Class-6**: Teacher xóa học sinh khỏi lớp
- **FR-Class-7**: Student tham gia lớp bằng mã tham gia

### Lesson Uploads & Files (FR-Lesson)
- **FR-Lesson-1**: Teacher tải video ghi hình Zoom (MP4) và các định dạng video khác
- **FR-Lesson-2**: Teacher tải tài liệu: PDF, PowerPoint, Word, hình ảnh, text files
- **FR-Lesson-3**: Upload progress indicator cho file lớn
- **FR-Lesson-4**: Mỗi bài học có: tiêu đề, lớp liên kết, ngày học, video, tài liệu, tóm tắt bài học, mục tiêu học tập, chủ đề đã dạy
- **FR-Lesson-5**: Video player tích hợp: play/pause, tốc độ phát, fullscreen, progress bar, timestamp
- **FR-Lesson-6**: Quản lý file: tên, định dạng, kích thước, ngày upload; có thể thay thế/xóa
- **FR-Lesson-7**: Validate loại file và kích thước file
- **FR-Lesson-8**: Không lưu video lớn trực tiếp vào database chính
- **FR-Lesson-9**: Student chỉ xem được tài liệu của lớp đã tham gia

### AI Homework Generator (FR-AI)
- **FR-AI-1**: Teacher chọn lớp và bài học để tạo bài tập
- **FR-AI-2**: Form nhập liệu: tiêu đề bài học, ngày học, môn học, cấp độ, mô tả bài học, chủ đề đã dạy, khái niệm chính, mục tiêu học tập
- **FR-AI-3**: Additional context: paste ghi chú bài học, upload tài liệu hỗ trợ, transcript Zoom (optional)
- **FR-AI-4**: Cấu hình: độ khó, độ dài bài tập, loại câu hỏi, hạn nộp bài, hướng dẫn riêng của giáo viên
- **FR-AI-5**: AI phân tích mô tả bài học, xác định khái niệm chính, tạo bài tập phù hợp cấp độ, không thêm chủ đề liên quan, tạo đáp án và giải thích
- **FR-AI-6**: AI xuất JSON cấu trúc mà frontend có thể render
- **FR-AI-7**: Nếu thông tin không đủ, AI yêu cầu làm rõ hoặc nêu rõ các giả định
- **FR-AI-8**: Loading state khi đang generate
- **FR-AI-9**: Preview bài tập có thể edit (sửa câu hỏi, đáp án, điểm)
- **FR-AI-10**: Regenerate từng câu hỏi hoặc toàn bộ bài tập
- **FR-AI-11**: Publish bài tập đến lớp học đã chọn
- **FR-AI-12**: Các loại câu hỏi hỗ trợ: Multiple Choice (4 lựa chọn), True/False, Fill in Blanks, Matching, Short Answer, Ordering, Flashcards, Scenario-based, Mini-quiz

### Interactive Student Homework (FR-HW)
- **FR-HW-1**: Màn hình bài tập: tiêu đề, thông tin lớp/bài học, hướng dẫn giáo viên, hạn nộp, thời gian ước tính, tổng điểm, progress indicator, điều hướng câu hỏi
- **FR-HW-2**: Một câu hỏi/màn hình hoặc layout cuộn
- **FR-HW-3**: Nút Next/Previous, lưu tiến độ tự động
- **FR-HW-4**: Review đáp án trước khi nộp, hiển thị câu chưa trả lời
- **FR-HW-5**: Màn hình xác nhận sau khi nộp, tránh nộp trùng
- **FR-HW-6**: Responsive cho mobile/tablet
- **FR-HW-7**: Phản hồi tức thì (đúng/sai + giải thích) cho câu hỏi tự động chấm (teacher có thể tắt tùy chọn)
- **FR-HW-8**: Câu hỏi chủ quan lưu lại cho giáo viên review, hỗ trợ AI grading gợi ý
- **FR-HW-9**: Phân biệt rõ điểm AI gợi ý và điểm giáo viên xác nhận

### Assignment Management & Analytics (FR-Assign)
- **FR-Assign-1**: Assignment list: tiêu đề, lớp, ngày tạo, hạn nộp, số học sinh được giao, số bài đã nộp, điểm trung bình, trạng thái
- **FR-Assign-2**: Trạng thái: Draft, Published, In Progress, Completed, Archived
- **FR-Assign-3**: Teacher xem từng bài nộp của học sinh
- **FR-Assign-4**: Teacher điều chỉnh điểm, để lại feedback
- **FR-Assign-5**: Export điểm (CSV)
- **FR-Assign-6**: Xác định khái niệm học sinh thường hiểu lầm
- **FR-Assign-7**: Analytics dashboard: điểm trung bình lớp, tỉ lệ hoàn thành bài tập, xu hướng hiệu suất học sinh, câu hỏi thường sai, mục tiêu học tập có mastery thấp, tiến độ từng học sinh
- **FR-Assign-8**: Sử dụng biểu đồ trực quan, không trình bày phân tích AI như đánh giá cuối cùng về khả năng học sinh

### Student Dashboard (FR-SD)
- **FR-SD-1**: Các lớp đã tham gia
- **FR-SD-2**: Bài học mới tải lên
- **FR-SD-3**: Bài tập sắp đến hạn, quá hạn, đã hoàn thành
- **FR-SD-4**: Điểm trung bình các bài tập
- **FR-SD-5**: Thông báo gần đây từ giáo viên
- **FR-SD-6**: Trang lớp học gồm: recording bài học, tài liệu, bài tập đã publish, lịch sử bài nộp, thông báo lớp
- **FR-SD-7**: Badge trạng thái: Not Started, In Progress, Submitted, Graded, Overdue

### AI Lesson Assistant (FR-Assistant)
- **FR-Assistant-1**: Giáo viên hỏi AI các câu hỏi về bài học đã chọn (3 khái niệm quan trọng, 5 câu hỏi thêm, đơn giản hóa bài tập, tạo quiz ôn tập, xác định khái niệm dễ hiểu lầm)
- **FR-Assistant-2**: AI chỉ sử dụng thông tin của bài học đã chọn làm ngữ cảnh

## Non-Functional Requirements
- **NFR-1 (Security)**: Xác thực an toàn, RBAC, API endpoint được bảo vệ, validate input, validate file type/size, file storage an toàn, signed URL cho file private, rate limiting cho AI generation, API key server-side only
- **NFR-2 (Privacy)**: Không expose thông tin học sinh cho học sinh khác, có cơ chế đồng ý và bảo lưu recording lớp học (chứa hình ảnh/âm thanh học sinh)
- **NFR-3 (UI/UX)**: Giao diện hiện đại, sạch sẽ, tối thiểu; màu chủ đạo deep navy/indigo; gradient nhẹ cho AI; bo góc cards; shadow mềm; typography rõ ràng; khoảng cách thoáng đãng; icon nhất quán; animation nhẹ nhàng
- **NFR-4 (Responsive)**: Collapsible sidebar desktop, navigation responsive mobile, skeleton loaders, empty states với CTA hữu ích, toast notifications, modal dialogs
- **NFR-5 (Performance)**: Video streaming không lag, upload file resumable (nếu có), AI generation loading state rõ ràng
- **NFR-6 (Maintainability)**: Code modular, components tái sử dụng, TypeScript strict, typing rõ ràng
- **NFR-7 (Deployability)**: Có file env example, migration database, seed data cho dev, hướng dẫn setup rõ ràng

## Constraints
- **Technical**: Next.js 14+ App Router, TypeScript, Tailwind CSS, shadcn/ui, Lucide, React Hook Form, Zod, Next.js Server Actions/API Routes, PostgreSQL, Prisma, Supabase Auth & Storage, OpenAI API (hoặc LLM tương tự), Recharts, deploy Vercel
- **Business**: Không hardcode fake data cho bài nộp của học sinh hoặc simulate AI generation; nếu API key chưa có, cần tài liệu hướng dẫn tích hợp rõ ràng
- **Dependencies**: Cần Supabase project (Auth + Storage + Postgres) và OpenAI API key (hoặc tương đương)

## Assumptions
- Người dùng có thông tin đăng nhập Supabase và OpenAI (hoặc có thể tạo tài khoản miễn phí)
- Video recordings tối đa 2GB/file (giới hạn storage thông thường)
- Mỗi lớp có 1 teacher duy nhất (trong scope này, không hỗ trợ co-teacher)
- AI generation có thể mất 10-60 giây tùy độ dài bài tập
- Production environment sẽ có HTTPS, rate limiting, logging

## Open Questions
- [ ] Có cần hỗ trợ multiple choice có nhiều đáp án đúng không? (Mặc định: 1 đáp án đúng)
- [ ] Student có thể tự hủy tham gia lớp học không?
- [ ] Có cần hệ thống comment trên từng bài tập không? (Optional trong scope: không)

---

## Acceptance Criteria

### AC-Auth-1: Registration and Login Flow
- **Type**: `rule`
- **Given**: Người dùng mới truy cập trang đăng ký
- **When**: Điền đầy đủ thông tin (tên, email, password, chọn vai trò Teacher/Student) và submit
- **Then**: Tài khoản được tạo, user tự động đăng nhập, redirect đến dashboard tương ứng vai trò
- **Pass Condition**: Có thể đăng ký 1 tài khoản Teacher và 1 tài khoản Student, mỗi tài khoản đăng nhập thành công và xem đúng dashboard
- **Evidence**: Manual test + Prisma users table có 2 records với role tương ứng + session cookie được set

### AC-Auth-2: Role-Based Access Control
- **Type**: `rule`
- **Given**: Student đã đăng nhập
- **When**: Thử truy cập URL `/teacher/dashboard` hoặc `/teacher/classes/create`
- **Then**: Bị redirect về student dashboard hoặc hiển thị 403 Forbidden
- **Pass Condition**: 100% các route teacher-only trả về 403/redirect khi user role=student truy cập, và ngược lại
- **Evidence**: Manual test navigate + middleware/protected route code

### AC-Class-1: Class Creation and Join Code
- **Type**: `rule`
- **Given**: Teacher đã đăng nhập
- **When**: Tạo lớp học mới với tên "Sinh học 10", môn "Sinh học", cấp độ "Lớp 10"
- **Then**: Lớp được tạo trong DB, có join code duy nhất 6-8 ký tự, hiển thị trên trang chi tiết lớp
- **Pass Condition**: Student dùng mã này tham gia thành công và thấy lớp trong danh sách enrolled classes
- **Evidence**: Prisma classes + enrollments tables + UI class detail page + student dashboard

### AC-Lesson-1: Video and File Upload
- **Type**: `rule`
- **Given**: Teacher ở trang Upload Lesson của 1 lớp đã có
- **When**: Upload 1 video MP4 < 500MB và 1 file PDF, điền tiêu đề/mô tả/ngày học
- **Then**: Bài học được lưu, video hiển thị player có thể play, PDF xuất hiện trong danh sách materials, student có thể xem
- **Pass Condition**: Upload hoàn tất không lỗi, progress bar hoạt động, file lưu vào storage, record trong lessons + lesson_files tables
- **Evidence**: Upload flow UI + Storage bucket files + Prisma tables + student view playback

### AC-AI-1: AI Homework Generation and Validation
- **Type**: `rule`
- **Given**: Teacher ở AI Homework Generator, đã chọn lớp + bài học, điền mô tả chi tiết về quang hợp (photosynthesis), chọn độ khó trung bình, các dạng câu hỏi: MC + TF + FillBlank (tổng 10 câu)
- **When**: Click "Generate with AI"
- **Then**: Sau loading state, hiển thị 10 câu hỏi dạng MC/TF/FillBlank, mỗi câu có đáp án đúng + giải thích, cấu trúc JSON hợp lệ theo schema định nghĩa
- **Pass Condition**: AI trả về response parse được thành JSON, đúng schema types, có đúng số lượng câu hỏi, mỗi câu có required fields (question, options (nếu MC), correct answer, explanation)
- **Evidence**: Network tab response (hoặc server log) parsed JSON + Zod schema parse thành công + UI preview render đúng các câu hỏi

### AC-AI-2: Assignment Preview Edit and Publish
- **Type**: `rule`
- **Given**: AI đã generate assignment (theo AC-AI-1)
- **When**: Teacher sửa nội dung 1 câu hỏi MC, click Publish
- **Then**: Assignment lưu với status=published, học sinh trong lớp thấy bài tập trong dashboard với hạn nộp đã set
- **Pass Condition**: Prisma assignments table có record với status=published + class_id đúng + student dashboard hiển thị assignment mới
- **Evidence**: DB record + student dashboard UI

### AC-HW-1: Student Complete Auto-Gradable Assignment
- **Type**: `rule`
- **Given**: Student mở 1 published assignment (chứa MC + TF + FillBlank)
- **When**: Đi qua từng câu, trả lời toàn bộ, click Submit
- **Then**: Hiển thị kết quả: số điểm, từng câu đúng/sai, giải thích đáp án đúng (nếu teacher cho phép xem ngay), lưu submission vào DB
- **Pass Condition**: Prisma submissions table có answers_json + score tương ứng với đáp án đúng
- **Evidence**: Submission DB record + kết quả hiển thị trên UI điểm số

### AC-Assign-1: Teacher Review Submission
- **Type**: `rule`
- **Given**: Student đã nộp bài (AC-HW-1)
- **When**: Teacher mở trang Assignments → submission của học sinh đó
- **Then**: Teacher thấy toàn bộ câu trả lời, điểm tự động, có thể sửa điểm, để lại feedback text, save lại
- **Pass Condition**: Sau khi save, student dashboard hiển thị điểm đã cập nhật + feedback của giáo viên
- **Evidence**: Submission DB record updated (score + feedback fields) + student view

### AC-UI-1: Responsive Layout and Design Quality
- **Type**: `rubric`
- **Dimension**: Chất lượng thiết kế UI/UX và độ responsive
- **Scale**: 1-5
- **Anchors**: 1 = UI thô, không responsive, thiếu trạng thái; 3 = Giao diện chấp nhận được, desktop OK, mobile có lỗi layout nhỏ; 5 = Giao diện professional như Linear/Notion, mọi breakpoint hoạt động mượt, có skeleton, toast, empty states đẹp
- **Pass Threshold**: >= 4
- **Evidence**: Manual kiểm tra desktop (1920), tablet (768), mobile (375) + screenshot các trang chính (login, teacher dashboard, class detail, AI generator, student assignment player)

### AC-Perf-1: Core Page Load
- **Type**: `rule`
- **Given**: Người dùng đã đăng nhập, mạng 4G
- **When**: Mở trang Teacher Dashboard hoặc Student Assignment Player
- **Then**: First Contentful Paint < 3s, skeleton loader xuất hiện trong < 500ms nếu data loading
- **Pass Condition**: Lighthouse performance score >= 80 trên 3 trang chính
- **Evidence**: Lighthouse CLI report cho 3 URLs

### AC-Sec-1: Protected File Access
- **Type**: `rule`
- **Given**: 1 file PDF của lớp A (teacher A, student B tham gia)
- **When**: Student C (không tham gia lớp A) cố gắng mở direct URL của file PDF đó (hoặc gọi API lấy file)
- **Then**: Server trả về 401/403, không cho xem nội dung file
- **Pass Condition**: Signed URL expire hoặc RLS policy chặn truy cập unauthorized
- **Evidence**: Test API call với user khác vai trò + response status code

### AC-Sec-2: AI Key Not Exposed
- **Type**: `rule`
- **Given**: Source code và browser devtools
- **When**: Search toàn bộ frontend bundle và client-side code cho "sk-" pattern hoặc OPENAI_API_KEY env var
- **Then**: Không tìm thấy chuỗi API key bất kỳ nào trong client-side code
- **Pass Condition**: AI API call chỉ xảy ra server-side (server action hoặc route handler)
- **Evidence**: Grep source code "sk-" không xuất hiện trong app/ client components + network tab chỉ gọi /api/ai/* endpoint (không gọi api.openai.com trực tiếp)
