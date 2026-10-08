# Chuolingo LMS — Nền tảng Học tập tích hợp AI

Nền tảng LMS (Learning Management System) được xây dựng cho **Giáo viên** và **Học sinh**, cho phép:

- 🧑‍🏫 **Giáo viên**: Tạo lớp học, upload video Zoom ghi hình + tài liệu bài giảng, gọi AI để tự động sinh bài tập tương tác 9 dạng câu hỏi, xuất bản, chấm điểm và phân tích kết quả.
- 🧑‍🎓 **Học sinh**: Đăng ký, tham gia lớp bằng `join code`, xem video + tài liệu, làm bài tập tương tác với tự động lưu (auto-save), tự động chấm với feedback tức thì, theo dõi tiến độ và điểm.

Công nghệ: **Next.js 15 App Router + TypeScript + Tailwind CSS + shadcn/ui + Prisma (PostgreSQL) + Supabase Auth/Storage + OpenAI GPT (structured JSON)**.

---

## 🚀 Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cài đặt ban đầu](#2-cài-đặt-ban-đầu)
3. [Cấu hình biến môi trường](#3-cấu-hình-biến-môi-trường)
4. [Thiết lập CSDL Postgres](#4-thiết-lập-csdl-postgres)
5. [Thiết lập Supabase (tùy chọn nhưng khuyến nghị)](#5-thiết-lập-supabase-tùy-chọn-nhưng-khuyến-nghị)
6. [Tích hợp AI (OpenAI)](#6-tích-hợp-ai-openai)
7. [Thêm dữ liệu mẫu (seed)](#7-thêm-dữ-liệu-mẫu-seed)
8. [Chạy dự án](#8-chạy-dự-án)
9. [Deploy lên Vercel](#9-deploy-lên-vercel)
10. [Cấu trúc thư mục chính](#10-cấu-trúc-thư-mục-chính)
11. [Các tài khoản demo](#11-các-tài-khoản-demo)
12. [Khắc phục sự cố thường gặp](#12-khắc-phục-sự-cố-thường-gặp)

---

## 1. Yêu cầu hệ thống

| Công cụ    | Phiên bản tối thiểu | Ghi chú                                              |
|------------|---------------------|------------------------------------------------------|
| **Node.js**| 20.10 LTS trở lên   | Cần để chạy npm/npx (download từ nodejs.org).        |
| npm / pnpm / yarn | Phiên bản đi kèm Node | Mặc định dùng `npm` (thư viện lock sẽ là `package-lock.json`). |
| **PostgreSQL** | 14+             | Có thể dùng Supabase Postgres, Neon, Railway, hoặc localhost. |
| Trình duyệt | Chrome/Firefox/Safari bản mới nhất | Test UI/UX. |

> 💡 **Quan trọng**: Nếu máy bạn chưa có Node.js — các lệnh `npm install`, `npx prisma migrate` sẽ KHÔNG chạy được.
> Cài Node.js trước: https://nodejs.org/en/download (chọn LTS).

---

## 2. Cài đặt ban đầu

Mở Terminal / PowerShell / CMD vào thư mục dự án:

```bash
# 1. Di chuyển đến thư mục dự án
cd "c:\Users\vupro\Downloads\LMS WEB CHUOLINGO"

# 2. Cài đặt toàn bộ dependencies (có thể mất 3-10 phút)
npm install
```

Đợi thông báo `added xxx packages in xxxs` là thành công.

---

## 3. Cấu hình biến môi trường

Copy file `.env.example` thành `.env.local`:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env.local

# Windows (CMD)
copy .env.example .env.local

# macOS / Linux
cp .env.example .env.local
```

Mở file `.env.local` bằng trình soạn thảo (VS Code, Notepad…) và điền các giá trị theo các bước bên dưới.

---

## 4. Thiết lập CSDL Postgres

Chuolingo dùng **Prisma ORM** để làm việc với Postgres. Bạn cần cung cấp 2 biến:

| Biến           | Mục đích                                                              |
|----------------|-----------------------------------------------------------------------|
| `DATABASE_URL` | Chuỗi kết nối Postgres (với suffix `?schema=public`)                  |
| `DIRECT_URL`   | Chuỗi kết nối Postgres **KHÔNG** có suffix schema (cần cho migrate)   |

### Cách 1 — Dùng Postgres của Supabase (khuyến nghị)

1. Đăng nhập https://supabase.com → New project (chọn region gần VN nhất, ví dụ Singapore).
2. Vào **Project Settings → Database**, kéo xuống mục **Connection string → URI**.
3. Copy URI dán vào `DATABASE_URL`, thêm suffix `?schema=public` ở cuối.
4. Copy URI tương tự (không có suffix) vào `DIRECT_URL`.
5. Password là DB password bạn đã nhập lúc tạo project.

Ví dụ:
```
DATABASE_URL="postgresql://postgres:MatKhauCuoiCung@db.abcxyz123.supabase.co:5432/postgres?schema=public"
DIRECT_URL="postgresql://postgres:MatKhauCuoiCung@db.abcxyz123.supabase.co:5432/postgres"
```

### Cách 2 — Dùng localhost Postgres (PGAdmin, Docker…)

Tạo database tên `chuolingo_lms` và user có quyền owner, điền URL theo pattern:

```
DATABASE_URL="postgresql://user:password@localhost:5432/chuolingo_lms?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/chuolingo_lms"
```

---

## 5. Thiết lập Supabase (tùy chọn nhưng khuyến nghị)

> 💡 **CHẾ ĐỘ DEMO KHÔNG CẦN SUPABASE**: Nếu bạn **KHÔNG điền** `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
> hệ thống sẽ tự động fallback sang **Prisma + bcrypt auth** lưu cookie đơn giản. Tính năng đăng ký/đăng nhập/quyền
> vẫn hoạt động 100% (bỏ qua bước này OK).
>
> Supabase BẮT BUỘC khi bạn muốn: lưu video/tệp lớn lên Storage (tính năng upload bài giảng với
> video lớn sẽ báo lỗi nếu thiếu signed URL).

### Bước 5.1 — Lấy Auth keys

Vào Supabase project → **Project Settings → API**:

| Biến                         | Lấy từ đâu                                          |
|------------------------------|-----------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`   | Project URL (bắt đầu `https://...supabase.co`)      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon public` key (safe để expose ở client)      |
| `SUPABASE_SERVICE_ROLE_KEY`  | `service_role` key (**BÍ MẬT** — chỉ dùng server)   |

> ❌ **KHÔNG** bao giờ commit `SUPABASE_SERVICE_ROLE_KEY` hay push file `.env.local` lên git public.
> `.gitignore` đã tự động ignore file này.

### Bước 5.2 — Thiết lập Storage buckets

Chuolingo cần 3 buckets (Supabase Storage → Create bucket):

| Tên bucket          | Loại    | Mục đích                                             | Giới hạn file mẫu        |
|---------------------|---------|------------------------------------------------------|--------------------------|
| `lesson-videos`     | Private | Video ghi hình lớp học (Zoom MP4, MOV…)              | ≤ 2 GB / file            |
| `lesson-materials`  | Private | PDF, PPTX, DOCX, hình ảnh tài liệu học tập           | ≤ 200 MB / file          |
| `class-covers`      | Public  | Ảnh bìa lớp học                                      | ≤ 10 MB / file (ảnh)     |

Sau khi tạo xong 3 buckets, bạn có thể (tùy chọn) thêm RLS policy đơn giản để bảo vệ private buckets:

```sql
-- ====== lesson_videos (private) ======
create policy "Duy nhất học sinh ghi danh và giáo viên xem video"
  on storage.objects for select
  using (
    bucket_id = 'lesson-videos'
    and (
      -- Giáo viên sở hữu lesson
      (storage.foldername(name))[1] in (
        select cast("teacherId" as text) from "Lesson" where "teacherId" = auth.uid()
      )
      or
      -- Hoặc học sinh có trong enrollment của class đó
      (storage.foldername(name))[2] in (
        select cast("classId" as text) from "ClassEnrollment" e
        join "Lesson" l on l."classId" = e."classId"
        where e."studentId" = auth.uid()
      )
    )
  );

-- ====== lesson_materials (private) ======
create policy "Duy nhất học sinh ghi danh và giáo viên xem tài liệu"
  on storage.objects for select
  using (
    bucket_id = 'lesson-materials'
    and (
      (storage.foldername(name))[1] in (select cast("teacherId" as text) from "Lesson" where "teacherId" = auth.uid())
      or
      (storage.foldername(name))[2] in (
        select cast("classId" as text) from "ClassEnrollment" e
        join "Lesson" l on l."classId" = e."classId"
        where e."studentId" = auth.uid()
      )
    )
  );
```

> 💡 **Tạm thời chưa cần RLS**: Nếu bạn mới dev/test, có thể bỏ qua bước SQL trên — Storage signed URL đã tự tạo URL có thời hạn để truy cập.

### Bước 5.3 — Auth Email Confirm

- Vào **Authentication → Providers → Email**.
- Toggle OFF **Confirm email** (môi trường dev/test), hoặc giữ ON + cấu hình Email template ở tab **Email Templates**.
- Production nên bật ON Confirm email + Reset password email.

---

## 6. Tích hợp AI (OpenAI)

Chuolingo dùng OpenAI GPT (**chỉ gọi server-side**) để sinh bài tập JSON có cấu trúc.

### Bước 6.1 — Lấy API Key

1. Truy cập https://platform.openai.com/ → Đăng nhập.
2. Vào **API keys** → Create new secret key.
3. Copy key và dán vào biến trong `.env.local`:

```
OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
OPENAI_MODEL="gpt-4o-mini"
```

> 💡 **Mô hình gợi ý**:
> - `gpt-4o-mini` (mặc định): Rẻ (0.15$ / 1M token input), nhanh, đủ tốt cho phần lớn bài tập.
> - `gpt-4o`: Chất lượng cao hơn, đắt gấp ~10 lần, phù hợp bài tập khó (Luyện thi THPT, Đại học…).

### 6.2 — Nếu chưa có API Key (chế độ cấu hình)

Hệ thống **KHÔNG bao giờ giả lập phản hồi AI**. Nếu thiếu `OPENAI_API_KEY`, trang AI Generator sẽ
hiển thị panel đỏ lỗi kèm hướng dẫn cấu hình đầy đủ thay vì hardcode bài tập giả.

---

## 7. Thêm dữ liệu mẫu (seed)

Sau khi Postgres đã sẵn sàng (điền xong `DATABASE_URL`):

```bash
# 1. Chạy migration tạo bảng (Classes, Lessons, Assignments, Submissions...)
npx prisma migrate dev

# 2. Generate Prisma Client (chạy 1 lần sau mỗi lần đổi schema.prisma)
npx prisma generate

# 3. Insert dữ liệu mẫu (seed): 1 giáo viên, 5 học sinh, 1 lớp Sinh học, 1 bài giảng, 1 bài tập, 1 nộp bài đã chấm
npx prisma db seed
```

---

## 8. Chạy dự án

```bash
npm run dev
```

Sau 10-30 giây, terminal sẽ hiển thị:

```
  ▲ Next.js 15.x.x
  - Local:        http://localhost:3000
```

Mở trình duyệt truy cập http://localhost:3000

---

## 9. Deploy lên Vercel

1. Push code lên **GitHub private repo** (cẩn thận KHÔNG bao giờ push `.env.local`).
2. Truy cập https://vercel.com/new → Import repo.
3. Trong phần **Environment Variables**, copy paste toàn bộ nội dung `.env.local` vào (từng dòng một hoặc bulk).
4. Deploy!

Một vài lưu ý:
- **Supabase Auth**: Thêm `https://your-project.vercel.app/auth/callback` vào **Supabase → Authentication → URL Configuration → Redirect URLs** (bên cạnh `http://localhost:3000/auth/callback` cho dev).
- **Storage CORS**: Supabase Storage → Settings → CORS Origins, thêm `https://your-project.vercel.app`.
- **Prisma migrate on Vercel**: Framework preset Next.js của Vercel sẽ chạy `prisma generate` tự động. Cần migrate production DB thì chạy lệnh local với `DIRECT_URL` production: `npx prisma migrate deploy`.

---

## 10. Cấu trúc thư mục chính

```
LMS WEB CHUOLINGO/
├── app/
│   ├── (auth)/                         # Trang đăng ký / đăng nhập / reset
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (teacher)/teacher/              # Teacher area (bảo vệ middleware)
│   │   ├── dashboard/
│   │   ├── classes/                    # CRUD lớp học (7 trang + 5 tabs)
│   │   ├── lessons/                    # Upload library + chi tiết bài giảng
│   │   ├── ai/generator/               # 3 bước sinh bài tập AI
│   │   ├── assignments/                # DS / chi tiết / chấm điểm / CSV export
│   │   ├── students/                   # Danh sách học sinh + join code copy
│   │   ├── analytics/                  # Recharts bar + line charts
│   │   └── settings/                   # Profile + đổi MK + trạng thái tích hợp
│   ├── (student)/student/              # Student area (middleware check STUDENT)
│   │   ├── dashboard/
│   │   ├── classes/                    # Tham gia lớp / xem bài giảng
│   │   ├── assignments/                # DS bài tập + assignment player
│   │   └── settings/
│   └── api/ai/generate/route.ts        # Server-only gọi OpenAI, trả về JSON bài tập
│
├── components/
│   ├── ui/                             # 26+ shadcn primitives (button, card, dialog...)
│   ├── questions/renderer.tsx          # Render 9 dạng câu hỏi (MC/TF/Fill/Match/Short/Order/Flashcard/Scenario/Miniquiz)
│   ├── file-uploader.tsx               # Drag-drop + XHR upload progress + signed URL
│   ├── video-player.tsx                # HTML5 video custom skin (speed, seek, fullscreen)
│   ├── app-shell.tsx                   # Layout sidebar + main
│   └── nav.tsx / app-sidebar.tsx
│
├── lib/
│   ├── prisma.ts                       # Singleton Prisma client
│   ├── supabase/{server,client,middleware}.ts
│   ├── ai/                             # Prompt engineering + Zod schema câu hỏi
│   │   ├── question-schema.ts          # discriminatedUnion 9 dạng
│   │   └── prompt.ts
│   └── server-actions/                 # "use server" handlers
│       ├── auth.ts                     # register/login/logout/changePassword + requireRole
│       ├── classes.ts
│       ├── storage.ts                  # signed upload URL / download / delete
│       ├── lessons.ts
│       └── assignments.ts              # saveAssignment / upsertSubmission + autoGrade engine
│
├── prisma/
│   ├── schema.prisma                   # 8 entities + 3 enum
│   └── seed.ts                         # Dữ liệu mẫu
│
├── .env.example                        # Template biến môi trường (sao chép ra .env.local)
├── .gitignore
├── next.config.mjs
├── tailwind.config.ts                  # shadcn new-york + navy/indigo palette
├── tsconfig.json
├── package.json
├── middleware.ts                       # Auth role gating + PKCE Supabase session refresh
└── README.md
```

---

## 11. Các tài khoản demo

Sau khi chạy `npx prisma db seed` (bước 7), các tài khoản sau có thể đăng nhập:

| Vai trò   | Tên đăng nhập (email)          | Mật khẩu       | Dùng cho…                                        |
|-----------|--------------------------------|----------------|--------------------------------------------------|
| Giáo viên | `teacher@chuolingo.edu.vn`     | `Teacher123!`  | Tạo lớp, upload bài giảng, gọi AI sinh bài tập.  |
| Học sinh  | `an.nguyen@chuolingo.edu.vn`   | `Student123!`  | Làm bài tập, xem điểm (đã có bài nộp mẫu 8.5)    |
| Học sinh  | `binh.le@chuolingo.edu.vn`     | `Student123!`  | Test empty submissions flow.                     |
| Học sinh  | `chau.vo@chuolingo.edu.vn`     | `Student123!`  |                                                  |
| Học sinh  | `dao.tran@chuolingo.edu.vn`    | `Student123!`  |                                                  |
| Học sinh  | `em.hoang@chuolingo.edu.vn`    | `Student123!`  |                                                  |

Lớp Sinh học 10A có **Mã tham gia lớp (join code)** sẽ được hiển thị trên trang **Lớp học** của giáo viên (nút 📋 Copy mã) và học sinh dùng `/student/classes/join` để nhập.

---

## 12. Khắc phục sự cố thường gặp

| Lỗi                                                                        | Cách khắc phục                                                                                                                                                        |
|----------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `The term 'npx' / 'node' is not recognized…`                               | **Chưa cài Node.js**. Tải Node.js 20.10+ LTS từ https://nodejs.org rồi cài lại. Sau đó **đóng hoàn toàn terminal và mở lại**.                                          |
| `Prisma: Environment variable not found: DATABASE_URL`                     | Chưa có file `.env.local`. Xem lại Bước 3 sao chép file. Hoặc các biến lỗi chính tả.                                                                                  |
| `prisma migrate dev` lỗi `Authentication failed`                           | Password Postgres sai, hoặc IP máy bạn chưa được whitelist (Supabase → Settings → Database → IP allowlist thêm `0.0.0.0/0` cho dev).                               |
| Video không phát được                                                      | (a) Chưa cấu hình Supabase Storage buckets (Bước 5.2). (b) File > 2GB hoặc bucket `lesson-videos` đang public mà code dùng signed URL.                              |
| Trang AI Generator hiển thị **"Chưa cấu hình AI"**                         | Thiếu `OPENAI_API_KEY`. Xem Bước 6 — hệ thống không bao giờ giả lập kết quả AI, sẽ luôn báo lỗi setup.                                                               |
| Đăng nhập bằng tài khoản seed không được                                   | Đã chạy `npx prisma db seed` chưa? Nếu dùng Supabase Auth (có `NEXT_PUBLIC_SUPABASE_URL`) thì user Prisma chỉ tồn tại ở DB, Supabase Auth cần tạo lại bằng đăng ký mới (seed hiện chỉ tạo row Prisma, không tạo Supabase user). Dùng chế độ fallback (bỏ Supabase env) thì đăng nhập được ngay. |
| Export CSV tiếng Việt bị lỗi font trong Excel                              | File CSV đã có UTF-8 BOM `\uFEFF`. Nếu mở Excel 2010 cũ vẫn lỗi: Data → From Text/CSV → chọn file → File origin 65001 (Unicode UTF-8).                             |
| `next.config.mjs` không áp dụng                                            | Khởi động lại `npm run dev` sau mỗi lần sửa file config.                                                                                                             |

---

Bắt đầu lại các lệnh chính nếu bạn cần reset 100% DB:

```bash
# ⚠️ XÓA TOÀN BỘ DỮ LIỆU
npx prisma migrate reset   # Enter Y để xác nhận
npx prisma generate
npx prisma db seed
npm run dev
```

Chúc bạn thành công xây dựng nền tảng giáo dục AI của riêng mình! 🎉
