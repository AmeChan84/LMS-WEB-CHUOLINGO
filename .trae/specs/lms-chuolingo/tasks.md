# AI-Powered Learning Management Platform (Chuolingo LMS) - Implementation Plan

## Task 1: Initialize Project - Next.js 14, TypeScript, Tailwind, Prisma, Supabase
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Khởi tạo Next.js 14 App Router project với TypeScript
  - Cài đặt Tailwind CSS 3, shadcn/ui CLI, Lucide icons
  - Setup Prisma với PostgreSQL provider, generate Prisma Client
  - Tạo file `.env.example` với các biến cần thiết (DATABASE_URL, SUPABASE_*, OPENAI_API_KEY...)
  - Install core dependencies: @supabase/ssr, @hookform/resolvers, zod, react-hook-form, recharts
  - Khởi tạo shadcn/ui với theme navy/indigo (primary color)
- **Acceptance Criteria Addressed**: NFR-6, NFR-7
- **Test Requirements**:
  - `rule` TR-1.1: `npx next build` chạy thành công không lỗi TypeScript
  - `rule` TR-1.2: `npx prisma generate` chạy thành công, Prisma Client usable
  - `rule` TR-1.3: Shadcn button component được add vào project và render được trong 1 trang test
- **Notes**: Sử dụng `--typescript --tailwind --eslint --app` khi init Next.js

## Task 2: Design System, Shadcn Components, Layout, Public Pages
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Add các shadcn components cần thiết: button, input, card, label, form, dialog, toast, sonner, table, tabs, dropdown-menu, avatar, badge, separator, progress, select, checkbox, radio-group, switch, textarea, skeleton, alert, tooltip, breadcrumb, sheet
  - Setup app/layout.tsx với metadata, font (Inter), theme provider
  - Tạo các public pages: `/` (landing đơn giản với login/register CTA), `/login`, `/register`, `/reset-password`
  - Tạo trang 404 và error.tsx
  - Setup middleware.ts cho route protection basic
- **Acceptance Criteria Addressed**: NFR-3, NFR-4
- **Test Requirements**:
  - `rule` TR-2.1: `/login` và `/register` page render 2 form đăng nhập/đăng ký với field tên, email, password, role selector
  - `rule` TR-2.2: TypeScript strict mode không lỗi
  - `rubric` TR-2.3: Thiết kế landing + auth pages; scale 1-5; anchors 1=rỗng 3=chấp nhận 5=đẹp SaaS; threshold >=4; evidence=screenshot
- **Notes**: Đặt auth pages ở `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`

## Task 3: Database Schema (Prisma) - Users, Classes, Enrollments, Lessons, LessonFiles, Assignments, Submissions, Announcements
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Define Prisma schema với các entities và relationships:
    - User (id, name, email, password_hash, role: TEACHER|STUDENT, created_at, updated_at)
    - Class (id, teacher_id FK→User, name, subject, description, join_code unique, cover_image_url?, status: ACTIVE|ARCHIVED, created_at)
    - ClassEnrollment (id, class_id FK, student_id FK→User, joined_at) - unique (class_id, student_id)
    - Lesson (id, class_id FK, teacher_id FK, title, description, lesson_date, lesson_notes, learning_objectives String[]?, created_at)
    - LessonFile (id, lesson_id FK, file_name, file_type, file_size_bytes, storage_path, is_video Boolean, uploaded_at)
    - Assignment (id, class_id FK, lesson_id FK?, teacher_id FK, title, instructions, questions_json Json, answer_key_json Json, total_points Int, due_date DateTime?, status: DRAFT|PUBLISHED|COMPLETED|ARCHIVED, show_feedback_immediately Boolean default true, created_at)
    - Submission (id, assignment_id FK, student_id FK, answers_json Json, score Decimal?, ai_suggested_score Decimal?, feedback Text?, status: IN_PROGRESS|SUBMITTED|GRADED, submitted_at?, graded_at?) - unique (assignment_id, student_id)
    - Announcement (id, class_id FK, teacher_id FK, title, content, created_at)
  - Add indexes vào foreign keys và join_code
  - Add onDelete: Cascade hợp lý
  - Write Prisma migration `0001_init` và seed script (Prisma.Seed) tạo 2 users demo (teacher@demo.com/student@demo.com pass=Demo123456) + 1 lớp mẫu
- **Acceptance Criteria Addressed**: FR-Auth-1, FR-Auth-2, FR-Class-1, FR-Class-2, FR-Lesson-4, FR-Assign-2
- **Test Requirements**:
  - `rule` TR-3.1: `npx prisma migrate dev --name init` chạy thành công trên DB test
  - `rule` TR-3.2: `npx tsx prisma/seed.ts` chạy thành công, Users table có 2 records role TEACHER và STUDENT
  - `rule` TR-3.3: Prisma schema pass `prisma validate`

## Task 4: Supabase Auth Integration - Register, Login, Logout, Password Reset, Session, Protected Routes
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 3
- **Description**:
  - Tạo Supabase client helper: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/middleware.ts`
  - Tạo server actions cho auth: registerTeacher, registerStudent, login, logout, resetPassword
  - Auth callback route `/auth/callback` để exchange code lấy session
  - Cập nhật middleware.ts: check Supabase session, redirect login nếu chưa auth, phân biệt route teacher-only (/teacher/*) và student-only (/student/*)
  - Tạo wrapper component `<ProtectedRoute allowedRoles={[...]}>` và role context
  - Đồng bộ user Supabase → Prisma DB (user profile): trigger khi signup hoặc login first time, upsert vào users table với role và email
  - Update password validation trong form (>= 8 ký tự, có số)
- **Acceptance Criteria Addressed**: FR-Auth-1..8, AC-Auth-1, AC-Auth-2, NFR-1
- **Test Requirements**:
  - `rule` TR-4.1: Register teacher@test.com → login thành công → redirect `/teacher/dashboard`; register student@test.com → redirect `/student/dashboard`
  - `rule` TR-4.2: User học sinh (role=student) navigate `/teacher/dashboard` → 403 hoặc redirect về student dashboard
  - `rule` TR-4.3: Logout action xóa session, redirect login page

## Task 5: Teacher Dashboard Layout - Sidebar Navigation, Header, Shell, Summary Cards
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - Tạo `app/(teacher)/layout.tsx` với sidebar collapse/expand, header có avatar/signout, main content area
  - Sidebar items (như spec): Dashboard, My Classes, Lesson Library, AI Homework Generator, Assignments, Students, Analytics, Settings
  - Tạo `app/(teacher)/teacher/dashboard/page.tsx` với:
    - 5 summary cards (Total Classes, Total Students, Uploaded Lessons, Active Assignments, Pending Submissions) - data lấy từ Prisma queries
    - Recent activity list (fake activity feed từ DB hoặc mock tạm cho các entities mới create)
    - Recently uploaded lessons (từ lessons table order by created_at desc limit 5)
    - Upcoming deadlines (assignments published + due_date > now order by due_date limit 5)
    - 3 Quick action buttons (Create Class → /teacher/classes/create, Upload Lesson → /teacher/lessons/upload, Generate Homework → /teacher/ai/generator)
- **Acceptance Criteria Addressed**: FR-TD-1..6
- **Test Requirements**:
  - `rule` TR-5.1: Sidebar có đủ 9 items, mỗi item navigate đúng URL tương ứng
  - `rule` TR-5.2: 5 summary cards hiển thị đúng số liệu đếm từ DB (dùng seed data kiểm tra)
  - `rubric` TR-5.3: Layout dashboard đẹp, responsive; scale 1-5; anchors 1=rỗng 3=bình thường 5=SaaS đẹp; threshold >=4; evidence=screenshot desktop

## Task 6: Class Management - Create/Edit/List/Detail, Join Code, Archive, Enroll
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - Tạo `app/(teacher)/teacher/classes/page.tsx`: danh sách lớp học của teacher hiện tại, search, filter, card grid
  - Tạo `/teacher/classes/create`: Form tạo lớp mới (tên, môn, cấp độ, mô tả, ảnh bìa upload). Generate join code ngẫu nhiên 6 ký tự alphanumeric (unique check).
  - Tạo `/teacher/classes/[classId]/page.tsx`: class shell với 7 tabs (Overview, Lessons, Recordings, Materials, Assignments, Students, Analytics) - dùng shadcn Tabs
    - Tab Overview: class info, join code hiển thị với copy button, edit button, archive button
    - Tab Students: danh sách học sinh trong lớp, action xóa khỏi lớp
    - Còn lại các tab khác sẽ fill ở tasks sau (hiện empty state)
  - Student side: `app/(student)/student/classes/join/page.tsx` form nhập join code → gọi server action kiểm tra → tạo ClassEnrollment → redirect đến class detail student
  - Tạo `app/(student)/student/classes/[classId]/page.tsx` shell với tabs Lessons, Materials, Assignments, Announcements (cho student view)
- **Acceptance Criteria Addressed**: FR-Class-1..7, AC-Class-1
- **Test Requirements**:
  - `rule` TR-6.1: Teacher tạo lớp "Sinh học 10" → join code được generate 6 chars → Student nhập join code này ở join page → enrollment record tạo → student thấy lớp trong danh sách classes
  - `rule` TR-6.2: Teacher click "Archive" trên class detail → class status chuyển ARCHIVED → student không thấy nữa trong danh sách active
  - `rule` TR-6.3: Join code sai hoặc không tồn tại → form báo lỗi không tạo enrollment

## Task 7: Lesson Upload System - File Upload to Supabase Storage, Lesson CRUD, Video Player
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 6
- **Description**:
  - Setup Supabase Storage buckets: `lesson-videos` (private), `lesson-materials` (private), `class-covers` (public)
  - Write RLS policies cho buckets: teacher chỉ upload vào lớp mình sở hữu; student chỉ download file của lớp mình tham gia
  - Tạo server actions: uploadFileToStorage (tạo signed URL upload → client upload → save record LessonFile), deleteFile
  - Tạo component `FileUploader` với drag & drop, progress bar dùng shadcn progress, validate loại file và kích thước (video <= 2GB, doc <= 100MB)
  - Video player component: tích hợp ReactPlayer hoặc custom HTML5 video với controls: play/pause, rate 0.5x-2x, fullscreen, seek bar, time display
  - Trang teacher: `/teacher/lessons/upload` form tạo bài học mới (chọn lớp, tiêu đề, ngày học, tóm tắt, mục tiêu học tập, upload video, upload materials)
  - Tab Lessons của class detail (teacher): list bài học, click vào mở chi tiết → hiển thị video player + materials list
  - Student class detail → Tab Lessons: list bài học, click mở xem video và tài liệu (sử dụng signed URL time-limited)
- **Acceptance Criteria Addressed**: FR-Lesson-1..9, AC-Lesson-1, AC-Sec-1
- **Test Requirements**:
  - `rule` TR-7.1: Upload video MP4 100MB thành công → LessonFile record lưu, storage bucket có file → student có thể play video trong class detail
  - `rule` TR-7.2: Student không thuộc lớp mở direct URL signed URL của file (hoặc gọi API) → nhận 403/expired URL
  - `rule` TR-7.3: Video player có đủ controls: play, pause, speed adjust, fullscreen, progress bar có thể seek
- **Notes**: Sử dụng tus/resumable upload nếu có thể; tối thiểu là progress bar với XMLHttpRequest/fetch progress event

## Task 8: Define AI Question Schema (Zod) + API Route /api/ai/generate-assignment
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Define Zod schemas cho từng loại câu hỏi trong `lib/ai/question-schema.ts`:
    - MultipleChoice: {id, type:'mc', question, options:[{id,text}], correctOptionId, explanation, points}
    - TrueFalse: {id, type:'tf', question, correctAnswer:bool, explanation, points}
    - FillBlank: {id, type:'fill', question, blanks:[{id,acceptedAnswers:string[]}], explanation, points}
    - Matching: {id, type:'match', question, pairs:[{left,right}], explanation, points}
    - ShortAnswer: {id, type:'short', question, rubric, points}
    - Ordering: {id, type:'order', question, correctOrder:[{id,text}], explanation, points}
    - Flashcard: {id, type:'flash', front, back}
    - Scenario: {id, type:'scenario', scenario, subQuestions:[mc|tf|short]}
    - MiniQuiz: {id, type:'quiz', title, questions:[...]}
    - Assignment: {title, instructions, questions[], totalPoints, estimatedMinutes}
  - Build prompt engineering system prompt + user prompt template (lấy info từ form)
  - Tạo API route `app/api/ai/generate/route.ts` POST nhận {lessonInfo, aiSettings, context} → gọi OpenAI Chat Completions với `response_format: { type: "json_object" }` hoặc structured output → validate với Zod schema → trả về JSON hợp lệ
  - Implement rate limiting (ví dụ: 10 requests/phút/user) và error handling (API key thiếu, quota exceeded)
  - Tạo file integration guide nếu API key chưa set (trả về thông báo rõ ràng trong UI, không lỗi 500)
- **Acceptance Criteria Addressed**: FR-AI-1..7, FR-AI-12, AC-AI-1, AC-Sec-2
- **Test Requirements**:
  - `rule` TR-8.1: Gọi API /api/ai/generate với mô tả "photosynthesis, lớp 10, 5 câu MC, 3 TF, 2 FillBlank" → response JSON parse được và zodAssignmentSchema.parse() success
  - `rule` TR-8.2: Search client bundle NOT find "sk-" hoặc OPENAI_API_KEY → chỉ gọi /api/ai/*
  - `rule` TR-8.3: Không có OpenAI key → API trả về {error, setupInstructions} không 500, UI hiển thị hướng dẫn setup
- **Notes**: Support thay thế model qua env var (default gpt-4o-mini hoặc gpt-4o structured output nếu có)

## Task 9: AI Homework Generator Page (Teacher) - Form, Loading, Preview, Edit, Regenerate, Publish
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 7, Task 8
- **Description**:
  - Tạo `app/(teacher)/teacher/ai/generator/page.tsx` layout 2 phần: form trái + preview phải (hoặc tabs)
  - Form bao gồm 2 section (theo spec):
    - Lesson Information: select lớp (danh sách teacher's classes), select bài học (lọc theo lớp), tiêu đề, ngày học, môn, cấp độ, mô tả bài học, chủ đề, khái niệm, mục tiêu
    - Additional AI Context: textarea ghi chú, file upload tài liệu phụ, textarea transcript, difficulty (Easy/Medium/Hard), length (Short:5q, Medium:10q, Long:20q), multi-select question types, due date picker, instructions
  - Submit button "Generate with AI" → loading state "Analyzing your lesson..." với skeleton preview
  - Sau khi API trả về → render editor preview: mỗi câu hỏi là 1 accordion edit được (sửa nội dung câu, đáp án, điểm, giải thích)
  - Action buttons per question: "Regenerate This Question" (gọi API tạo lại 1 câu theo type đó)
  - Action top-level: "Regenerate All", "Edit Instructions", "Publish Assignment"
  - Publish → modal confirm chọn lớp + set due date → lưu vào assignments table status=published hoặc draft (tùy chọn)
- **Acceptance Criteria Addressed**: FR-AI-1..11, AC-AI-1, AC-AI-2
- **Test Requirements**:
  - `rule` TR-9.1: Điền form đầy đủ, click Generate → thấy loading → sau khi xong, preview hiển thị đúng số lượng câu hỏi theo length setting, mỗi câu có thể edit và save lại
  - `rule` TR-9.2: Click Publish → Assignment record tạo trong DB với class_id, teacher_id, questions_json, status=PUBLISHED
  - `rule` TR-9.3: Click "Regenerate This Question" trên 1 câu MC → câu đó được thay thế bằng câu mới cùng loại, số lượng câu không đổi
- **Notes**: Preview dùng render chung components với student player (task 11) nhưng trong chế độ edit

## Task 10: Assignment Management Page + Submission List for Teacher
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 9
- **Description**:
  - Tạo `app/(teacher)/teacher/assignments/page.tsx`: data table assignments (tất cả của teacher), các cột: Title, Class, Created, Due Date, Assigned (số học sinh), Submitted, Average Score, Status (badge Draft/Published/In Progress/Completed/Archived). Filter/search.
  - Tạo `/teacher/assignments/[assignmentId]/page.tsx`:
    - Thông tin tổng quan: số đã nộp/chưa nộp, điểm trung bình, phân phối điểm (chart nhỏ)
    - Danh sách submissions theo học sinh: tên học sinh, trạng thái (In Progress/Submitted/Graded), điểm, nộp lúc, graded lúc. Click vào mở submission detail
    - Submission detail modal/page: hiển thị từng câu trả lời của học sinh, đáp án đúng, điểm tự động (auto-graded), trường edit điểm, textarea feedback, nút "Save Grade"
    - Export CSV điểm (danh sách học sinh + điểm + feedback)
- **Acceptance Criteria Addressed**: FR-Assign-1..6, AC-Assign-1
- **Test Requirements**:
  - `rule` TR-10.1: Student nộp bài (task 11) → trang assignment detail teacher thấy dòng student đó với status Submitted, điểm tự động
  - `rule` TR-10.2: Teacher edit điểm từ 8→9, để feedback "Good job!", save → student view thấy điểm + feedback đã cập nhật
  - `rule` TR-10.3: Click Export CSV → file CSV tải về có đúng cột: student_email, student_name, score, feedback

## Task 11: Student Assignment Player - Interactive Questions, Auto-Grading, Submission
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 9
- **Description**:
  - Tạo `app/(student)/student/assignments/[assignmentId]/page.tsx`:
    - Header: assignment title, class info, teacher instructions, due date, estimated time, total points
    - Progress indicator (hoàn thành bao nhiêu %), question navigation sidebar (badge số thứ tự câu, màu xanh=có đáp án, xám=chưa)
    - Question renderer component render từng loại:
      - MC: 4 radio/lựa chọn, chọn 1 đáp án
      - TF: 2 nút True/False
      - FillBlank: text input(s) vào vị trí trống
      - Matching: 2 cột select pair left-right hoặc drag-drop (dùng thư viện nếu cần hoặc implement click-to-pair đơn giản)
      - Short: textarea trả lời
      - Ordering: drag-sort items (dùng @dnd-kit/sortable nếu shadcn có hoặc implement đơn giản với arrows)
      - Flashcard: flip animation card front/back
      - Scenario/MiniQuiz: hiển thị scenario + sub questions
    - Auto-save progress mỗi khi học sinh chọn/trả lời (lưu answers_json với status=IN_PROGRESS, upsert submission)
    - Nút Previous/Next giữa các câu
    - Review page trước khi Submit: tổng hợp các câu đã/chưa trả lời, confirm submit
    - Submit → khóa answers, chuyển status=SUBMITTED, chấm tự động các câu MC/TF/FillBlank/Matching/Ordering (so sánh answers_json với answer_key_json) → lưu score vào submission
    - Results page (nếu assignment.setting show_feedback_immediately=true): hiển thị từng câu đúng/sai, giải thích, tổng điểm đạt
- **Acceptance Criteria Addressed**: FR-HW-1..9, AC-HW-1
- **Test Requirements**:
  - `rule` TR-11.1: Student hoàn thành 10 câu (MC+TF+Fill), submit → tính điểm tự động chính xác (ví dụ 8/10 đúng → 80 điểm) và lưu score vào DB
  - `rule` TR-11.2: Auto-save: trả lời 5 câu → refresh page → các câu đó vẫn có đáp án lưu (kiểm tra submission status=IN_PROGRESS, answers_json không null)
  - `rule` TR-11.3: Matching câu hỏi có 3 cặp → học sinh nối đúng 2/3 → auto chấm 2/3 điểm tương ứng
  - `rubric` TR-11.4: Trải nghiệm làm bài mượt, tương tác tốt; scale 1-5; anchors 1=lag/crash 3=bình thường 5=mượt, feedback rõ ràng; threshold >=4; evidence=video test

## Task 12: Student Dashboard - Classes, Upcoming/Overdue/Completed, Average Score
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 4, Task 6
- **Description**:
  - Tạo `app/(student)/student/dashboard/page.tsx`:
    - Header chào mừng + avatar
    - Summary cards: Số lớp tham gia, Điểm trung bình (average of graded submissions), Bài tập sắp đến hạn, Quá hạn
    - Card grid "My Classes": mỗi lớp có cover, tên, môn, teacher, join date. Click vào class detail
    - Section "Upcoming Homework": list published assignments chưa nộp, sắp xếp theo due date, badge "Not Started" / "In Progress" với progress bar nếu đã bắt đầu
    - Section "Overdue": list assignments quá hạn chưa nộp, badge đỏ "Overdue"
    - Section "Completed": list bài đã graded, điểm + badge "Graded"
    - Section "Recent Announcements" từ các lớp học
- **Acceptance Criteria Addressed**: FR-SD-1..7
- **Test Requirements**:
  - `rule` TR-12.1: Student có 1 lớp, 1 published assignment due date trong tương lai → dashboard thấy card lớp và assignment ở Upcoming với badge Not Started
  - `rule` TR-12.2: Assignment quá hạn chưa nộp → hiển thị ở Overdue section với badge đỏ
  - `rule` TR-12.3: Bài tập đã được giáo viên chấm điểm → Completed section hiển thị điểm + badge Graded

## Task 13: Analytics Dashboard (Teacher) - Recharts, Class Performance, Question Analysis
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 10
- **Description**:
  - Tạo `app/(teacher)/teacher/analytics/page.tsx` analytics tổng quan toàn bộ các lớp:
    - Tổng hợp tổng quan: số lớp, học sinh, bài tập, bài nộp
    - Biểu đồ Average Score per Class (bar chart)
    - Line chart "Performance Trend" (điểm trung bình theo tuần của 4 tuần gần nhất)
    - Completion Rate (%) per Assignment (horizontal bar)
  - Trong class detail → Tab Analytics (teacher):
    - Thống kê theo lớp: điểm trung bình, trung vị, phân phối điểm (histogram)
    - Completion rate (%) cho từng assignment
    - "Frequently Missed Questions": 5 câu hỏi có tỉ lệ sai cao nhất (tính từ tất cả submissions trong lớp), kèm giải thích gợi ý ôn tập
    - "Low Mastery Objectives": nếu lesson có learning objectives được gắn tag vào câu hỏi → show các objectives có tỉ lệ đúng dưới 50%
    - Individual Student Progress: table mỗi học sinh với điểm trung bình, số bài đã nộp, số bài trễ hạn
  - Add disclaimer "Phân tích AI và dữ liệu thống kê chỉ mang tính tham khảo cho giáo viên, không phải đánh giá cuối cùng về năng lực học sinh"
- **Acceptance Criteria Addressed**: FR-Assign-7, FR-Assign-8
- **Test Requirements**:
  - `rule` TR-13.1: Có ít nhất 3 submissions với điểm khác nhau → bar chart phân phối điểm render được với Recharts (không crash, không trắng màn hình)
  - `rule` TR-13.2: "Frequently Missed Questions" hiển thị đúng 5 câu có % sai cao nhất (tính toán manual đối chiếu)
  - `rubric` TR-13.3: Biểu đồ rõ ràng, có label, không bị cắt text trên mobile; scale 1-5; anchors 1=trống/bị vỡ 3=bình thường 5=sạch sẽ, dễ đọc; threshold >=4; evidence=screenshot

## Task 14: Settings Page + AI Lesson Assistant (Optional)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 9
- **Description**:
  - Tạo `/teacher/settings/page.tsx`: profile (tên, email), đổi mật khẩu, cài đặt default AI (mặc định difficulty, length, question types), quản lý thông báo
  - (Optional) AI Lesson Assistant panel: Mở trên 1 bài học cụ thể (tab trong lesson detail hoặc modal)
    - Chat interface đơn giản với preset prompts:
      1. 3 khái niệm quan trọng nhất từ bài học
      2. Tạo 5 câu hỏi thêm về chủ đề khó nhất
      3. Đơn giản hóa bài tập (giảm độ khó cho học sinh yếu)
      4. Tạo quiz ôn tập
      5. Xác định khái niệm học sinh dễ hiểu lầm
    - Call API `/api/ai/lesson-assistant` route handler, pass lesson content làm context, response dạng text hoặc structured
- **Acceptance Criteria Addressed**: FR-Assistant-1, FR-Assistant-2
- **Test Requirements**:
  - `rule` TR-14.1: Settings page đổi tên giáo viên → lưu vào DB và header hiển thị tên mới
  - `rule` TR-14.2: AI Lesson Assistant prompt "3 khái niệm chính" → API trả về 3 points chỉ dựa trên nội dung bài học (context được pass)

## Task 15: Seed Data, Polish - Empty States, Skeletons, Toasts, Error Handling, Responsive, Lighthouse
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1-14 (tất cả trước)
- **Description**:
  - Nâng cấp seed.ts: thêm 2-3 lớp, 10 bài học, 30+ học sinh demo, 5 assignments, 20 submissions với đa dạng điểm → đảm bảo analytics có dữ liệu
  - Add empty states cho tất cả list pages (dùng shadcn empty state pattern với icon + CTA button tạo mới/tham gia lớp)
  - Add skeleton loaders cho tất cả pages lấy dữ liệu async (dashboard, class list, assignments list, submissions)
  - Wrap tất cả server actions với try-catch, trả về action result {error?} pattern, toast notifications (sonner) cho success/error
  - Responsive polish: test các breakpoint 375, 768, 1024, 1440. Đảm bảo sidebar responsive (sheet trên mobile), cards responsive grid, tables cuộn ngang trên mobile
  - Accessibility: keyboard navigation, alt text cho ảnh, labels cho form fields, ARIA attributes
  - Lighthouse audit cho 3 trang chính, đảm bảo performance >=80
- **Acceptance Criteria Addressed**: NFR-3, NFR-4, NFR-5, AC-UI-1, AC-Perf-1
- **Test Requirements**:
  - `rule` TR-15.1: Access teacher dashboard khi không có lớp (empty state) → thấy empty state với CTA "Create Class" thay vì màn hình trắng
  - `rule` TR-15.2: Lighthouse CLI audit cho 3 URLs đạt performance >= 80
  - `rule` TR-15.3: Responsive 375px (iPhone SE): không có overflow-x, sidebar ẩn và có nút mở sheet
  - `rubric` TR-15.4: Tổng thể chất lượng polish; scale 1-5; anchors 1=nhiều lỗi nhỏ 3=chấp nhận 5=SaaS professional; threshold >=4; evidence=screenshot + Lighthouse report

## Task 16: End-to-End Manual Test Pass + README Setup Instructions
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 15
- **Description**:
  - Thực hiện kịch bản test E2E đầy đủ như sau (ghi nhận kết quả từng bước):
    1. Register teacher → login → dashboard
    2. Tạo lớp → copy join code
    3. Register student → nhập join code → vào lớp
    4. Teacher tạo bài học + upload PDF + upload video ngắn
    5. Student vào lớp xem video + tải PDF
    6. Teacher AI Generator tạo 10 câu assignment → publish
    7. Student làm bài + submit → thấy kết quả auto
    8. Teacher review submission → sửa điểm + feedback
    9. Student thấy điểm đã update → dashboard thống kê cập nhật
    10. Teacher xem Analytics → biểu đồ render OK
  - Viết file README.md (cho dev setup):
    - Prerequisites (Node 20+, Supabase project, OpenAI key)
    - Hướng dẫn tạo Supabase project + Auth, Storage buckets setup (chi tiết từng bước)
    - Setup env vars (copy .env.example → .env.local, điền values)
    - Prisma migrate + seed
    - Run dev server (npm run dev)
    - Production deployment notes (Vercel)
  - Final build test: `npm run build` success, không lỗi TypeScript, không warning nghiêm trọng
- **Acceptance Criteria Addressed**: Tất cả AC tổng hợp
- **Test Requirements**:
  - `rule` TR-16.1: 10 bước E2E kịch bản đều pass (ghi rõ kết quả từng bước trong completion evidence)
  - `rule` TR-16.2: `npm run build` exit 0 không lỗi TypeScript
  - `rule` TR-16.3: Người mới đọc README làm theo các bước thì setup được project (review cấu trúc hướng dẫn)
