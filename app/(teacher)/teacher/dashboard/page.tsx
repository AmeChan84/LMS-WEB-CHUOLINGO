import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-actions/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Users,
  BookOpenText,
  FileCheck2,
  Clock,
  PlusCircle,
  Upload,
  Sparkles,
  ArrowRight,
  Video,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import {
  formatDate,
  formatRelative,
} from "@/lib/utils";
import { AssignmentStatus, SubmissionStatus, ClassStatus } from "@prisma/client";

export default async function TeacherDashboard() {
  const user = await requireRole("TEACHER");

  // Stats
  const [
    totalClasses,
    totalStudents,
    uploadedLessons,
    activeAssignments,
    pendingSubmissions,
  ] = await Promise.all([
    prisma.class.count({
      where: { teacherId: user.id, status: ClassStatus.ACTIVE },
    }),
    prisma.classEnrollment.count({
      where: { class: { teacherId: user.id, status: ClassStatus.ACTIVE } },
    }),
    prisma.lesson.count({ where: { teacherId: user.id } }),
    prisma.assignment.count({
      where: {
        teacherId: user.id,
        status: { in: [AssignmentStatus.PUBLISHED] },
        dueDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.submission.count({
      where: {
        assignment: { teacherId: user.id },
        status: { in: [SubmissionStatus.SUBMITTED] },
      },
    }),
  ]);

  // Recently uploaded lessons
  const recentLessons = await prisma.lesson.findMany({
    where: { teacherId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      class: { select: { id: true, name: true } },
      files: { take: 2, orderBy: { uploadedAt: "desc" } },
    },
  });

  // Upcoming deadlines
  const upcomingDeadlines = await prisma.assignment.findMany({
    where: {
      teacherId: user.id,
      status: AssignmentStatus.PUBLISHED,
      dueDate: { gte: new Date() },
    },
    orderBy: { dueDate: "asc" },
    take: 5,
    include: {
      class: { select: { name: true } },
      _count: { select: { submissions: { where: { status: { not: SubmissionStatus.IN_PROGRESS } } } } },
    },
  });

  const stats = [
    {
      label: "Total Classes",
      value: totalClasses,
      icon: GraduationCap,
      tint: "bg-blue-50 text-blue-700",
      href: "/teacher/classes",
    },
    {
      label: "Total Students",
      value: totalStudents,
      icon: Users,
      tint: "bg-emerald-50 text-emerald-700",
      href: "/teacher/students",
    },
    {
      label: "Uploaded Lessons",
      value: uploadedLessons,
      icon: BookOpenText,
      tint: "bg-amber-50 text-amber-700",
      href: "/teacher/lessons",
    },
    {
      label: "Active Assignments",
      value: activeAssignments,
      icon: FileCheck2,
      tint: "bg-violet-50 text-violet-700",
      href: "/teacher/assignments",
    },
    {
      label: "Pending Submissions",
      value: pendingSubmissions,
      icon: Clock,
      tint: "bg-rose-50 text-rose-700",
      href: "/teacher/assignments",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {new Date().toLocaleDateString("vi-VN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Chào mừng trở lại, {user.name.split(" ").slice(-1)[0]} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Đây là tổng quan về các lớp học, bài tập và hoạt động gần nhất của bạn.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/teacher/classes/create">
              <PlusCircle className="h-4 w-4" /> Tạo lớp học
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/teacher/lessons/upload">
              <Upload className="h-4 w-4" /> Upload bài học
            </Link>
          </Button>
          <Button asChild variant="ai">
            <Link href="/teacher/ai/generator">
              <Sparkles className="h-4 w-4" /> Tạo bài tập AI
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group">
            <Card className="transition-all group-hover:-translate-y-0.5 group-hover:shadow-md h-full">
              <CardContent className="flex items-center gap-3 p-4 sm:p-5">
                <div
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${s.tint}`}
                >
                  <s.icon className="h-5.5 w-5.5" style={{ height: "1.375rem", width: "1.375rem" }} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground truncate">{s.label}</div>
                  <div className="text-2xl font-bold tracking-tight">{s.value}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent lessons */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              Bài học mới tải lên
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/teacher/lessons">
                Xem tất cả <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          {recentLessons.length === 0 ? (
            <EmptyLessonsCard />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {recentLessons.map((l) => (
                <Link
                  key={l.id}
                  href={`/teacher/classes/${l.classId}?tab=lessons`}
                  className="group"
                >
                  <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                    <div className="h-36 w-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 relative overflow-hidden rounded-t-xl">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
                      <div className="absolute bottom-3 left-3">
                        <Badge className="bg-white/90 text-indigo-700">
                          <Video className="mr-1 h-3 w-3" />
                          {l.files.some((f) => f.isVideo) ? "Có video" : "Tài liệu"}
                        </Badge>
                      </div>
                    </div>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base line-clamp-1">
                        {l.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-1">
                        {l.class?.name || "Chưa phân lớp"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDate(l.lessonDate)}</span>
                      <span>{l.files.length} tệp</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Deadlines */}
          <div className="flex items-center justify-between pt-4">
            <h2 className="text-lg font-semibold tracking-tight">
              Hạn nộp bài sắp tới
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/teacher/assignments">
                Xem tất cả <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <EmptyDeadlinesCard />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-border/80">
                  {upcomingDeadlines.map((a) => {
                    const isDueSoon =
                      a.dueDate &&
                      a.dueDate.getTime() - Date.now() < 3 * 24 * 3600 * 1000;
                    return (
                      <li key={a.id}>
                        <Link
                          href={`/teacher/assignments/${a.id}`}
                          className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/40"
                        >
                          <div className="min-w-0">
                            <div className="font-medium line-clamp-1">
                              {a.title}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                              {a.class?.name} · {a._count.submissions} đã nộp
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <Badge variant={isDueSoon ? "warning" : "info"}>
                              {formatRelative(a.dueDate)}
                            </Badge>
                            <div className="text-[11px] text-muted-foreground">
                              {formatDate(a.dueDate)}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Activity feed */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Hoạt động gần đây</h2>
          <ActivityFeed teacherId={user.id} />
        </div>
      </div>
    </div>
  );
}

function EmptyLessonsCard() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <BookOpenText className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="mt-4 font-semibold">Chưa có bài học nào</div>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Tải lên bài học đầu tiên — video Zoom ghi hình, tài liệu PDF, slide bài giảng.
        </p>
        <Button asChild className="mt-5" size="sm">
          <Link href="/teacher/lessons/upload">
            <Upload className="h-4 w-4" /> Upload bài học đầu tiên
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyDeadlinesCard() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          <FileCheck2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="mt-3 font-semibold">Không có hạn nộp sắp tới</div>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          Tạo bài tập cho lớp học của bạn với AI chỉ trong vài giây.
        </p>
        <Button asChild className="mt-4" variant="ai" size="sm">
          <Link href="/teacher/ai/generator">
            <Sparkles className="h-4 w-4" /> Tạo bài tập bằng AI
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

async function ActivityFeed({ teacherId }: { teacherId: string }) {
  const [
    recentClasses,
    recentAssignments,
    gradedSubmissions,
  ] = await Promise.all([
    prisma.class.findMany({
      where: { teacherId },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.assignment.findMany({
      where: { teacherId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { class: { select: { name: true } } },
    }),
    prisma.submission.findMany({
      where: { assignment: { teacherId }, status: SubmissionStatus.SUBMITTED },
      orderBy: { submittedAt: "desc" },
      take: 4,
      include: {
        student: { select: { name: true } },
        assignment: { select: { title: true } },
      },
    }),
  ]);

  type Event =
    | { t: Date; kind: "class"; title: string; desc: string; icon: typeof GraduationCap; tint: string }
    | { t: Date; kind: "assignment"; title: string; desc: string; icon: typeof FileCheck2; tint: string }
    | { t: Date; kind: "submit"; title: string; desc: string; icon: typeof Users; tint: string };

  const events: Event[] = [
    ...recentClasses.map(
      (c) =>
        ({
          t: c.createdAt,
          kind: "class",
          title: `Đã tạo lớp ${c.name}`,
          desc: c.subject || "Lớp học mới",
          icon: GraduationCap,
          tint: "bg-blue-100 text-blue-700",
        }) as Event
    ),
    ...recentAssignments.map(
      (a) =>
        ({
          t: a.createdAt,
          kind: "assignment",
          title: `Xuất bản: ${a.title}`,
          desc: a.class?.name || "",
          icon: FileCheck2,
          tint: "bg-violet-100 text-violet-700",
        }) as Event
    ),
    ...gradedSubmissions.map(
      (s) =>
        ({
          t: s.submittedAt || s.createdAt,
          kind: "submit",
          title: `${s.student.name} đã nộp bài`,
          desc: s.assignment.title,
          icon: Users,
          tint: "bg-emerald-100 text-emerald-700",
        }) as Event
    ),
  ];

  events.sort((a, b) => b.t.getTime() - a.t.getTime());
  const recent = events.slice(0, 8);

  if (recent.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="mt-3 font-semibold">Chưa có hoạt động</div>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Hoạt động trên lớp, bài tập và bài nộp sẽ xuất hiện ở đây.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-2">
        <ol className="relative border-l border-border/70 ml-3">
          {recent.map((e, idx) => (
            <li key={idx} className="pl-6 pb-4 last:pb-0 relative">
              <span
                className={`absolute -left-[13px] top-1 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background ${e.tint}`}
              >
                <e.icon className="h-3 w-3" />
              </span>
              <div className="text-sm font-medium">{e.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">
                {e.desc}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground/80">
                {formatRelative(e.t)}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
