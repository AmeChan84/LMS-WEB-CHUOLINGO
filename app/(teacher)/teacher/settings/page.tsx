import { requireRole, isSupabaseAuthEnabled } from "@/lib/server-actions/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Cloud,
  Database,
  GraduationCap,
  Info,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  Video,
} from "lucide-react";
import { SettingsPasswordForm } from "./_password-client";

export const metadata = {
  title: "Cài đặt - Chuolingo LMS",
};

export default async function TeacherSettingsPage() {
  const user = await requireRole("TEACHER");
  const supabaseEnabled = await isSupabaseAuthEnabled();

  const stats = await prisma.$transaction([
    prisma.class.count({ where: { teacherId: user.id } }),
    prisma.lesson.count({ where: { teacherId: user.id } }),
    prisma.assignment.count({ where: { teacherId: user.id } }),
    prisma.classEnrollment.count({
      where: { class: { teacherId: user.id } },
    }),
  ]);

  const hasOpenAIKey =
    !!process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY !== "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

  const hasStorageConfigured =
    supabaseEnabled &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== "your_supabase_service_role_key";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cài đặt</h1>
        <p className="text-muted-foreground mt-2">
          Quản lý tài khoản, bảo mật và các tích hợp của nền tảng.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
              Thông tin tài khoản
            </CardTitle>
            <CardDescription>Thông tin hồ sơ giáo viên của bạn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between rounded-xl border bg-gradient-to-br from-slate-50 to-indigo-50/40 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-xl font-semibold text-white shadow-lg shadow-indigo-500/20">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-lg font-semibold">{user.name}</div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </div>
                </div>
              </div>
              <Badge variant="default" className="bg-indigo-600">
                <GraduationCap className="mr-1 h-3 w-3" /> Giáo viên
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="border-0 ring-1 ring-slate-200 shadow-sm">
                <CardContent className="pt-5">
                  <div className="text-xs text-muted-foreground">Tổng lớp học</div>
                  <div className="mt-1 text-2xl font-bold">{stats[0]}</div>
                </CardContent>
              </Card>
              <Card className="border-0 ring-1 ring-slate-200 shadow-sm">
                <CardContent className="pt-5">
                  <div className="text-xs text-muted-foreground">Tổng bài giảng</div>
                  <div className="mt-1 text-2xl font-bold">{stats[1]}</div>
                </CardContent>
              </Card>
              <Card className="border-0 ring-1 ring-slate-200 shadow-sm">
                <CardContent className="pt-5">
                  <div className="text-xs text-muted-foreground">Bài tập đã tạo</div>
                  <div className="mt-1 text-2xl font-bold">{stats[2]}</div>
                </CardContent>
              </Card>
              <Card className="border-0 ring-1 ring-slate-200 shadow-sm">
                <CardContent className="pt-5">
                  <div className="text-xs text-muted-foreground">Học sinh đã ghi danh</div>
                  <div className="mt-1 text-2xl font-bold">{stats[3]}</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-indigo-600" />
              Đổi mật khẩu
            </CardTitle>
            <CardDescription>
              {supabaseEnabled
                ? "Tài khoản của bạn đang dùng Supabase Auth."
                : "Thay đổi mật khẩu đăng nhập của bạn."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsPasswordForm supabaseEnabled={supabaseEnabled} userId={user.id} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            Trạng thái tích hợp
          </CardTitle>
          <CardDescription>
            Kiểm tra các dịch vụ nền tảng đã được cấu hình chưa. Nếu mục nào đang "Chưa cấu hình",
            mở file <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env.local</code>{" "}
            và điền thông tin tương ứng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Dịch vụ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-[380px]">Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" /> Xác thực (Supabase Auth)
                </TableCell>
                <TableCell>
                  {supabaseEnabled ? (
                    <Badge variant="success" className="bg-emerald-500">
                      Đã bật
                    </Badge>
                  ) : (
                    <Badge variant="warning">Prisma Local (chế độ demo)</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {supabaseEnabled
                    ? "Người dùng được quản lý bởi Supabase. Đổi mật khẩu bằng Reset Password."
                    : "Đăng nhập dùng Postgres + bcrypt. Hoàn toàn đủ dùng để demo và dev."}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <Database className="h-4 w-4 text-indigo-600" /> CSDL Postgres
                </TableCell>
                <TableCell>
                  <Badge variant="success" className="bg-emerald-500">
                    Bắt buộc
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  Biến <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">DATABASE_URL</code>{" "}
                  (Prisma). Chạy <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">npx prisma migrate dev</code>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <Video className="h-4 w-4 text-indigo-600" /> Lưu trữ (Supabase Storage)
                </TableCell>
                <TableCell>
                  {hasStorageConfigured ? (
                    <Badge variant="success" className="bg-emerald-500">
                      Đã cấu hình
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Thiếu Service Role Key</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  Tạo 3 buckets: <code>lesson-videos</code> (private),{" "}
                  <code>lesson-materials</code> (private),{" "}
                  <code>class-covers</code> (public). Signed URL sẽ được dùng để truy cập.
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-indigo-600" /> AI (OpenAI GPT)
                </TableCell>
                <TableCell>
                  {hasOpenAIKey ? (
                    <Badge variant="success" className="bg-emerald-500">
                      Đã cấu hình
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Chưa cấu hình</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  Thêm <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">OPENAI_API_KEY</code>{" "}
                  (sk-...) vào <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env.local</code>.
                  Nếu thiếu, trang AI Generator sẽ hiển thị hướng dẫn thay vì giả lập.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-indigo-600" />
            Thông tin phiên đăng nhập
          </CardTitle>
          <CardDescription>Thông tin kỹ thuật để debug hoặc gửi hỗ trợ.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div className="rounded-lg border bg-slate-50 p-4">
              <div className="text-xs uppercase text-muted-foreground mb-1">User ID</div>
              <div className="font-mono text-slate-800 break-all">{user.id}</div>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <div className="text-xs uppercase text-muted-foreground mb-1">
                Supabase User ID
              </div>
              <div className="font-mono text-slate-800 break-all">
                {user.supabaseUserId || "— (đang dùng Prisma local)"}
              </div>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <div className="text-xs uppercase text-muted-foreground mb-1">Ngày tạo</div>
              <div className="font-medium">{user.createdAt.toLocaleString("vi-VN")}</div>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <div className="text-xs uppercase text-muted-foreground mb-1">Vai trò</div>
              <div className="font-medium">{user.role}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
