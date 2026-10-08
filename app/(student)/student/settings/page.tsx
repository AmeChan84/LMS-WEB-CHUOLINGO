import { requireRole, isSupabaseAuthEnabled } from "@/lib/server-actions/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpenCheck, GraduationCap, Info, KeyRound, Mail, User } from "lucide-react";
import { SettingsPasswordForm } from "./_password-client";

export const metadata = {
  title: "Cài đặt - Chuolingo LMS",
};

export default async function StudentSettingsPage() {
  const user = await requireRole("STUDENT");
  const supabaseEnabled = await isSupabaseAuthEnabled();

  const [classCount, submittedCount, avgScoreRaw] = await Promise.all([
    prisma.classEnrollment.count({ where: { studentId: user.id } }),
    prisma.submission.count({
      where: { studentId: user.id, status: { in: ["SUBMITTED", "GRADED"] } },
    }),
    prisma.submission.aggregate({
        where: { studentId: user.id, score: { not: null } },
        _avg: { score: true },
      }),
    ]);

  const avgScore =
    avgScoreRaw._avg.score != null
      ? Math.round(Number(avgScoreRaw._avg.score) * 10) / 10
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cài đặt</h1>
        <p className="text-muted-foreground mt-2">
          Quản lý tài khoản và bảo mật cho học sinh.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
              Thông tin cá nhân
            </CardTitle>
            <CardDescription>Thông tin hồ sơ học sinh của bạn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between rounded-xl border bg-gradient-to-br from-slate-50 to-indigo-50/40 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-semibold text-white shadow-lg shadow-emerald-500/20">
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
              <Badge variant="success" className="bg-emerald-500">
                <GraduationCap className="mr-1 h-3 w-3" /> Học sinh
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Card className="border-0 ring-1 ring-slate-200 shadow-sm">
                <CardContent className="pt-5">
                  <div className="text-xs text-muted-foreground">Lớp tham gia</div>
                  <div className="mt-1 text-2xl font-bold">{classCount}</div>
                </CardContent>
              </Card>
              <Card className="border-0 ring-1 ring-slate-200 shadow-sm">
                <CardContent className="pt-5">
                  <div className="text-xs text-muted-foreground">Đã nộp bài</div>
                  <div className="mt-1 text-2xl font-bold">{submittedCount}</div>
                </CardContent>
              </Card>
              <Card className="border-0 ring-1 ring-slate-200 shadow-sm">
                <CardContent className="pt-5">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <BookOpenCheck className="h-3 w-3" /> Điểm TB
                  </div>
                  <div className="mt-1 text-2xl font-bold">{avgScore}</div>
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
                ? "Tài khoản đang dùng Supabase Auth."
                : "Thay đổi mật khẩu đăng nhập."}
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
            <Info className="h-5 w-5 text-indigo-600" />
            Thông tin phiên
          </CardTitle>
          <CardDescription>Thông tin kỹ thuật để hỗ trợ.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div className="rounded-lg border bg-muted p-4">
              <div className="text-xs uppercase text-muted-foreground mb-1">User ID</div>
              <div className="font-mono break-all">{user.id}</div>
            </div>
            <div className="rounded-lg border bg-muted p-4">
              <div className="text-xs uppercase text-muted-foreground mb-1">Supabase User ID</div>
              <div className="font-mono break-all">
                {user.supabaseUserId || "— (đang dùng Prisma local)"}
              </div>
            </div>
            <div className="rounded-lg border bg-muted p-4">
              <div className="text-xs uppercase text-muted-foreground mb-1">Ngày tạo</div>
              <div className="font-medium">{user.createdAt.toLocaleString("vi-VN")}</div>
            </div>
            <div className="rounded-lg border bg-muted p-4">
              <div className="text-xs uppercase text-muted-foreground mb-1">Vai trò</div>
              <div className="font-medium">{user.role}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
