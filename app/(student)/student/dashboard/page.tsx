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
  BookCheck,
  BookOpen,
  Clock,
  GraduationCap,
  CalendarDays,
  PlusCircle,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Video,
  FileText,
  Award,
  Bell,
} from "lucide-react";
import Link from "next/link";
import {
  formatDate,
  formatRelative,
} from "@/lib/utils";
import {
  AssignmentStatus,
  SubmissionStatus,
  ClassStatus,
} from "@prisma/client";
import type { Submission, Assignment } from "@prisma/client";

type SubmissionWithAssignment = Submission & {
  assignment: Assignment & {
    class: { id: string; name: string };
  };
};

function getSubmissionStatusBadge(
  assignment: Assignment & { dueDate: Date | null },
  submission?: Submission
) {
  const now = new Date();
  const dueDate = assignment.dueDate;
  const overdue =
    dueDate &&
    dueDate < now &&
    (!submission || submission.status === SubmissionStatus.IN_PROGRESS);

  if (submission?.status === SubmissionStatus.GRADED) {
    return <Badge variant="success">Đã chấm</Badge>;
  }
  if (submission?.status === SubmissionStatus.SUBMITTED) {
    return <Badge variant="info">Đã nộp</Badge>;
  }
  if (submission?.status === SubmissionStatus.IN_PROGRESS) {
    if (overdue)
      return (
        <Badge variant="destructive">
          <AlertCircle className="mr-1 h-3 w-3" /> Quá hạn
        </Badge>
      );
    return <Badge variant="secondary">Đang làm</Badge>;
  }
  // Not started
  if (overdue)
    return (
      <Badge variant="destructive">
        <AlertCircle className="mr-1 h-3 w-3" /> Quá hạn
      </Badge>
    );
  return <Badge variant="outline">Chưa bắt đầu</Badge>;
}

export default async function StudentDashboard() {
  const user = await requireRole("STUDENT");

  const now = new Date();

  // Stats
  const [
    enrolledClasses,
    submittedCount,
    gradedCount,
    averageScoreRaw,
    upcomingCount,
    overdueCount,
  ] = await Promise.all([
    prisma.classEnrollment.count({
      where: {
        studentId: user.id,
        class: { status: ClassStatus.ACTIVE },
      },
    }),
    prisma.submission.count({
      where: {
        studentId: user.id,
        status: {
          in: [SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED],
        },
      },
    }),
    prisma.submission.count({
      where: {
        studentId: user.id,
        status: SubmissionStatus.GRADED,
      },
    }),
    prisma.submission.aggregate({
      where: {
        studentId: user.id,
        status: SubmissionStatus.GRADED,
        score: { not: null },
      },
      _avg: { score: true },
    }),
    prisma.assignment.count({
      where: {
        status: AssignmentStatus.PUBLISHED,
        class: {
          enrollments: { some: { studentId: user.id } },
        },
        dueDate: { gte: now },
        submissions: {
          none: {
            studentId: user.id,
            status: { in: [SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED] },
          },
        },
      },
    }),
    prisma.assignment.count({
      where: {
        status: AssignmentStatus.PUBLISHED,
        class: {
          enrollments: { some: { studentId: user.id } },
        },
        dueDate: { lt: now },
        submissions: {
          none: {
            studentId: user.id,
            status: { in: [SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED] },
          },
        },
      },
    }),
  ]);

  const averageScore =
    averageScoreRaw._avg.score != null ? Number(averageScoreRaw._avg.score) : null;

  // Enrolled classes with recent lessons & counts
  const classes = await prisma.class.findMany({
    where: {
      status: ClassStatus.ACTIVE,
      enrollments: { some: { studentId: user.id } },
    },
    include: {
      teacher: { select: { name: true } },
      _count: {
        select: {
          lessons: true,
          assignments: {
            where: { status: AssignmentStatus.PUBLISHED },
          },
        },
      },
      lessons: {
        take: 1,
        orderBy: { lessonDate: "desc" },
        include: { files: { take: 1 } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  // All assignments student can see (published + enrolled class)
  const allAssignments = await prisma.assignment.findMany({
    where: {
      status: AssignmentStatus.PUBLISHED,
      class: {
        enrollments: { some: { studentId: user.id } },
      },
    },
    include: {
      class: { select: { id: true, name: true } },
      submissions: {
        where: { studentId: user.id },
        take: 1,
      },
    },
    orderBy: { dueDate: "asc" },
    take: 50,
  });

  // Split assignments
  const overdue: SubmissionWithAssignment[] = [];
  const upcoming: SubmissionWithAssignment[] = [];
  const completed: SubmissionWithAssignment[] = [];

  for (const a of allAssignments) {
    const sub = a.submissions[0] as Submission | undefined;
    const enriched = (sub
      ? { ...sub, assignment: a }
      : ({
          assignment: a,
        } as unknown as SubmissionWithAssignment)) as SubmissionWithAssignment;
    const isDone =
      sub?.status === SubmissionStatus.SUBMITTED ||
      sub?.status === SubmissionStatus.GRADED;
    const isOverdue = a.dueDate && a.dueDate < now && !isDone;
    if (isOverdue) overdue.push(enriched);
    else if (isDone) completed.push(enriched);
    else upcoming.push(enriched);
  }

  const upcomingSlice = upcoming.slice(0, 5);
  const completedSlice = completed.slice(0, 5);
  const overdueSlice = overdue.slice(0, 5);

  // Recent announcements
  const announcements = await prisma.announcement.findMany({
    where: {
      class: {
        enrollments: { some: { studentId: user.id } },
      },
    },
    include: {
      class: { select: { name: true, id: true } },
      teacher: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const stats = [
    {
      label: "Lớp học",
      value: enrolledClasses,
      icon: GraduationCap,
      tint: "bg-blue-50 text-blue-700",
      href: "/student/classes",
    },
    {
      label: "Bài tập sắp tới",
      value: upcomingCount,
      icon: Clock,
      tint: "bg-amber-50 text-amber-700",
      href: "/student/assignments",
    },
    {
      label: "Quá hạn",
      value: overdueCount,
      icon: AlertCircle,
      tint: "bg-rose-50 text-rose-700",
      href: "/student/assignments?filter=overdue",
    },
    {
      label: "Hoàn thành",
      value: submittedCount,
      icon: CheckCircle2,
      tint: "bg-emerald-50 text-emerald-700",
      href: "/student/assignments?filter=completed",
    },
    {
      label: "Điểm TB",
      value: averageScore != null ? averageScore.toFixed(1) : "—",
      icon: Award,
      tint: "bg-violet-50 text-violet-700",
      href: "/student/assignments",
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
            Chào mừng, {user.name.split(" ").slice(-1)[0]} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Tiếp tục hành trình học tập của bạn hôm nay nhé.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/student/classes/join">
              <PlusCircle className="h-4 w-4" /> Tham gia lớp học
            </Link>
          </Button>
          <Button asChild>
            <Link href="/student/assignments">
              <BookCheck className="h-4 w-4" /> Xem bài tập
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
                  <s.icon
                    className="h-5.5 w-5.5"
                    style={{ height: "1.375rem", width: "1.375rem" }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground truncate">
                    {s.label}
                  </div>
                  <div className="text-2xl font-bold tracking-tight">
                    {s.value}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Upcoming + overdue + completed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overdue */}
          {overdueSlice.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-rose-500" /> Quá hạn cần
                  hoàn thành
                </h2>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/student/assignments?filter=overdue">
                    Xem tất cả <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <Card className="border-rose-200 bg-rose-50/40">
                <CardContent className="p-0">
                  <ul className="divide-y divide-rose-200/70">
                    {overdueSlice.map((row) => {
                      const a = row.assignment;
                      return (
                        <li key={a.id}>
                          <Link
                            href={`/student/assignments/${a.id}`}
                            className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-rose-100/50"
                          >
                            <div className="min-w-0">
                              <div className="font-medium line-clamp-1">
                                {a.title}
                              </div>
                              <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                                {a.class.name}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              {getSubmissionStatusBadge(
                                a as Assignment & { dueDate: Date | null }
                              )}
                              <div className="text-[11px] text-muted-foreground">
                                Hạn: {formatDate(a.dueDate)}
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Upcoming assignments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                Bài tập cần làm
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/student/assignments?filter=upcoming">
                  Xem tất cả <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            {upcomingSlice.length === 0 ? (
              <EmptyAssignmentsCard />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border/80">
                    {upcomingSlice.map((row) => {
                      const a = row.assignment;
                      const sub = row.id ? row : undefined;
                      const dueSoon =
                        a.dueDate &&
                        a.dueDate.getTime() - now.getTime() <
                          2 * 24 * 3600 * 1000;
                      return (
                        <li key={a.id}>
                          <Link
                            href={`/student/assignments/${a.id}`}
                            className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/40"
                          >
                            <div className="min-w-0">
                              <div className="font-medium line-clamp-1">
                                {a.title}
                              </div>
                              <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                                {a.class.name} · {a.totalPoints} điểm
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              {getSubmissionStatusBadge(
                                a as Assignment & { dueDate: Date | null },
                                sub
                              )}
                              <div className="text-[11px] text-muted-foreground">
                                {dueSoon
                                  ? formatRelative(a.dueDate)
                                  : formatDate(a.dueDate)}
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

          {/* Completed / graded assignments */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                Bài tập đã hoàn thành
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/student/assignments?filter=completed">
                  Xem tất cả <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            {completedSlice.length === 0 ? (
              <EmptyCompletedCard />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border/80">
                    {completedSlice.map((row) => {
                      const a = row.assignment;
                      const sub = row;
                      return (
                        <li key={a.id}>
                          <Link
                            href={`/student/assignments/${a.id}`}
                            className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/40"
                          >
                            <div className="min-w-0">
                              <div className="font-medium line-clamp-1">
                                {a.title}
                              </div>
                              <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                                {a.class.name}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              {sub.status === SubmissionStatus.GRADED &&
                              sub.score != null ? (
                                <Badge
                                  variant={
                                    Number(sub.score) >=
                                    (a.totalPoints ?? 10) * 0.8
                                      ? "success"
                                      : Number(sub.score) >=
                                          (a.totalPoints ?? 10) * 0.5
                                        ? "warning"
                                        : "destructive"
                                  }
                                >
                                  {Number(sub.score).toFixed(1)} / {a.totalPoints}đ
                                </Badge>
                              ) : (
                                <Badge variant="info">Đang chấm</Badge>
                              )}
                              <div className="text-[11px] text-muted-foreground">
                                Nộp {formatRelative(sub.submittedAt)}
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

          {/* Enrolled classes grid */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                Lớp học của tôi
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/student/classes">
                  Xem tất cả <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            {classes.length === 0 ? (
              <EmptyClassesCard />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {classes.map((c) => (
                  <Link
                    key={c.id}
                    href={`/student/classes/${c.id}`}
                    className="group"
                  >
                    <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md overflow-hidden">
                      <div
                        className="h-28 w-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 relative"
                        style={{
                          backgroundImage: c.coverImageUrl
                            ? `url(${c.coverImageUrl})`
                            : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <div className="absolute bottom-2 left-3 right-3 text-white">
                          <Badge className="bg-white/90 text-indigo-700 text-[10px]">
                            {c.subject || "Môn học"}
                          </Badge>
                        </div>
                      </div>
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base line-clamp-1">
                          {c.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-1">
                          GV: {c.teacher?.name || "—"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />{" "}
                          {c._count.lessons} bài
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />{" "}
                          {c._count.assignments} bài tập
                        </span>
                        {c.lessons[0]?.files?.some((f: any) => f.isVideo) && (
                          <span className="ml-auto flex items-center gap-1 text-indigo-600">
                            <Video className="h-3.5 w-3.5" /> Video mới
                          </span>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Announcements */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Bell className="h-5 w-5" /> Thông báo mới
          </h2>
          {announcements.length === 0 ? (
            <EmptyAnnouncementsCard />
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <Link
                  key={a.id}
                  href={`/student/classes/${a.classId}`}
                  className="block"
                >
                  <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {a.class.name}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {formatRelative(a.createdAt)}
                        </span>
                      </div>
                      <CardTitle className="text-sm font-semibold mt-2 line-clamp-2">
                        {a.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-xs text-muted-foreground line-clamp-3">
                      {a.content}
                      <div className="mt-2 text-[11px]">
                        — {a.teacher.name}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyAssignmentsCard() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <BookCheck className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="mt-4 font-semibold">Không có bài tập sắp tới</div>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Khi giáo viên giao bài tập, bạn sẽ thấy chúng xuất hiện ở đây.
        </p>
        <Button asChild className="mt-5" size="sm" variant="outline">
          <Link href="/student/classes">
            <GraduationCap className="h-4 w-4" /> Vào lớp học
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyCompletedCard() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="mt-3 font-semibold">Chưa hoàn thành bài tập nào</div>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Lịch sử các bài đã nộp và điểm số sẽ hiển thị ở đây.
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyClassesCard() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <GraduationCap className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="mt-4 font-semibold">Bạn chưa tham gia lớp nào</div>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Nhập mã lớp được giáo viên cung cấp để bắt đầu tham gia học tập.
        </p>
        <Button asChild className="mt-5" size="sm">
          <Link href="/student/classes/join">
            <PlusCircle className="h-4 w-4" /> Tham gia lớp học
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyAnnouncementsCard() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          <Bell className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="mt-3 font-semibold">Chưa có thông báo</div>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Thông báo từ giáo viên sẽ xuất hiện tại đây.
        </p>
      </CardContent>
    </Card>
  );
}
