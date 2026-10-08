import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-actions/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TeacherAnalyticsCharts } from "@/components/analytics-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Users,
  FileCheck2,
  Award,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BookOpenText,
} from "lucide-react";
import Link from "next/link";
import { AssignmentStatus, ClassStatus, SubmissionStatus } from "@prisma/client";

export default async function TeacherAnalyticsPage() {
  const user = await requireRole("TEACHER");

  const classes = await prisma.class.findMany({
    where: { teacherId: user.id, status: ClassStatus.ACTIVE },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      _count: {
        select: { enrollments: true, lessons: true, assignments: true },
      },
      assignments: {
        where: { status: AssignmentStatus.PUBLISHED },
        include: {
          submissions: {
            where: {
              status: { in: [SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED] },
            },
            select: {
              id: true,
            },
          },
          _count: {
            select: { submissions: true },
          },
        },
      },
      enrollments: {
        select: {
          student: {
            select: {
              submissions: {
                where: {
                  assignment: { teacherId: user.id },
                  status: SubmissionStatus.GRADED,
                  score: { not: null },
                },
                select: { score: true },
              },
            },
          },
        },
      },
    },
  });

  // Per class: avg score, completion rate
  const classData = classes.map((c) => {
    const allGradedScores: number[] = [];
    for (const enr of c.enrollments) {
      for (const s of enr.student.submissions)
        if (s.score != null) allGradedScores.push(Number(s.score));
    }
    const avgScore = allGradedScores.length
      ? allGradedScores.reduce((a, b) => a + b, 0) / allGradedScores.length
      : 0;

    const enrolled = c._count.enrollments;
    const totalAssigned = c.assignments.reduce((s, a) => s + enrolled, 0);
    const submitted = c.assignments.reduce((s, a) => s + a._count.submissions, 0);
    const completionPct =
      totalAssigned > 0 ? Math.round((submitted / totalAssigned) * 100) : 0;

    return {
      name: c.name,
      avgScore: Math.round(avgScore * 10) / 10,
      completionPct,
      hs: enrolled,
      assignments: c._count.assignments,
      lessons: c._count.lessons,
    };
  });

  // Assignment-level stats for tables (low mastery)
  const assignments = await prisma.assignment.findMany({
    where: { teacherId: user.id, status: AssignmentStatus.PUBLISHED },
    take: 20,
    orderBy: { createdAt: "desc" },
    include: {
      class: { select: { id: true, name: true, _count: { select: { enrollments: true } } } },
      submissions: {
        where: {
          status: SubmissionStatus.GRADED,
          score: { not: null },
        },
        select: { score: true },
      },
    },
  });

  const assnTable = assignments.map((a) => {
    const enrolled = a.class._count.enrollments;
    const scores = a.submissions.map((s) => Number(s.score || 0));
    const avg =
      scores.length > 0
        ? scores.reduce((x, y) => x + y, 0) / scores.length
        : null;
    const submitted = a.submissions.length;
    return {
      id: a.id,
      title: a.title,
      className: a.class.name,
      classId: a.class.id,
      avg,
      enrolled,
      submitted,
      rate:
        enrolled > 0 ? Math.round((submitted / enrolled) * 100) : 0,
    };
  });

  // Trend line (submissions last 7 days, fake buckets by createdAt date)
  const recent = await prisma.submission.findMany({
    where: {
      assignment: { teacherId: user.id },
      createdAt: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
      },
    },
    select: { createdAt: true, status: true },
  });
  const byDate = new Map<string, { date: string; nộp: number; chấm: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    byDate.set(k, { date: k.slice(5), nộp: 0, chấm: 0 });
  }
  for (const s of recent) {
    const k = new Date(s.createdAt).toISOString().slice(0, 10);
    const row = byDate.get(k);
    if (row) {
      if (
        s.status === SubmissionStatus.SUBMITTED ||
        s.status === SubmissionStatus.GRADED
      )
        row.nộp += 1;
      if (s.status === SubmissionStatus.GRADED) row.chấm += 1;
    }
  }
  const trend = [...byDate.values()];

  // Totals
  const totalEnrolled = classes.reduce((s, c) => s + c._count.enrollments, 0);
  const totalLessons = classes.reduce((s, c) => s + c._count.lessons, 0);
  const totalAssignments = classes.reduce((s, c) => s + c._count.assignments, 0);
  const avgOverall =
    classData.length && classData.some((c) => c.avgScore > 0)
      ? classData
          .filter((c) => c.avgScore > 0)
          .reduce((s, c) => s + c.avgScore, 0) /
        classData.filter((c) => c.avgScore > 0).length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Phân tích tổng quan
          </h1>
          <p className="mt-1 text-muted-foreground">
            Thống kê tiến độ lớp học, kết quả bài tập và xu hướng hoạt động trong 14 ngày gần đây.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/teacher/classes">
            Xem chi tiết theo lớp <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Lớp học",
            val: classes.length,
            icon: BookOpenText,
            tint: "bg-blue-50 text-blue-700",
          },
          {
            label: "Học sinh",
            val: totalEnrolled,
            icon: Users,
            tint: "bg-indigo-50 text-indigo-700",
          },
          {
            label: "Bài giảng",
            val: totalLessons,
            icon: Sparkles,
            tint: "bg-violet-50 text-violet-700",
          },
          {
            label: "Bài tập",
            val: totalAssignments,
            icon: FileCheck2,
            tint: "bg-emerald-50 text-emerald-700",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.tint}`}
              >
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-xl font-bold tracking-tight">{s.val}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <TeacherAnalyticsCharts classData={classData} trend={trend} />

      {/* Low mastery warning */}
      <Card className="border-amber-300 bg-amber-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Bài tập có điểm trung bình thấp (cần ôn lại)
          </CardTitle>
          <CardDescription>
            Các bài có điểm TB {"<"} 5/10 có thể cho thấy kiến thức học sinh chưa vững.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <TableInline className={undefined} />
          <LowMasteryTable data={assnTable.filter((a) => a.avg != null && a.avg < 5)} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCheck2 className="h-4 w-4 text-violet-500" />
            Tất cả bài tập gần đây
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <AllAssignmentsTable data={assnTable} />
        </CardContent>
      </Card>

      <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
        <div>
          <strong className="text-foreground">Lưu ý:</strong> Thống kê AI mang tính
          tham khảo, không thay thế đánh giá chuyên môn của giáo viên. Luôn xem xét
          ngữ cảnh từng học sinh và từng lớp trước khi đưa ra kết luận cuối cùng.
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: I, label }: { icon: any; label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center py-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <I className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="mt-3 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

// Placeholder to satisfy import ordering
function TableInline(_: { className: undefined | string }) {
  return null;
}

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function LowMasteryTable({
  data,
}: {
  data: {
    id: string;
    title: string;
    className: string;
    classId: string;
    avg: number | null;
    enrolled: number;
    submitted: number;
    rate: number;
  }[];
}) {
  if (data.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-emerald-800">
        🎉 Tốt lắm! Không có bài tập nào có điểm trung bình thấp.
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Bài tập</TableHead>
          <TableHead>Lớp</TableHead>
          <TableHead className="text-right">Đã giao</TableHead>
          <TableHead className="text-right">Nộp (%)</TableHead>
          <TableHead className="text-right">Điểm TB</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((a) => (
          <TableRow key={a.id}>
            <TableCell>
              <Link
                href={`/teacher/assignments/${a.id}`}
                className="font-medium hover:text-indigo-600 line-clamp-1"
              >
                {a.title}
              </Link>
            </TableCell>
            <TableCell>
              <Link
                href={`/teacher/classes/${a.classId}`}
                className="text-sm text-muted-foreground hover:text-indigo-600"
              >
                {a.className}
              </Link>
            </TableCell>
            <TableCell className="text-right tabular-nums">{a.enrolled}</TableCell>
            <TableCell className="text-right tabular-nums">{a.rate}%</TableCell>
            <TableCell className="text-right tabular-nums font-semibold text-rose-700">
              {a.avg?.toFixed(1) ?? "—"}
            </TableCell>
            <TableCell>
              <Link href={`/teacher/assignments/${a.id}`}>
                <Button variant="ghost" size="sm">
                  Xem <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AllAssignmentsTable({
  data,
}: {
  data: {
    id: string;
    title: string;
    className: string;
    classId: string;
    avg: number | null;
    enrolled: number;
    submitted: number;
    rate: number;
  }[];
}) {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Chưa có bài tập nào được xuất bản.
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Bài tập</TableHead>
          <TableHead>Lớp</TableHead>
          <TableHead className="text-right">Đã giao</TableHead>
          <TableHead className="text-right">Đã nộp</TableHead>
          <TableHead className="text-right">Nộp %</TableHead>
          <TableHead className="text-right">Điểm TB</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((a) => (
          <TableRow key={a.id}>
            <TableCell>
              <Link
                href={`/teacher/assignments/${a.id}`}
                className="font-medium hover:text-indigo-600 line-clamp-1"
              >
                {a.title}
              </Link>
            </TableCell>
            <TableCell>
              <Link
                href={`/teacher/classes/${a.classId}`}
                className="text-sm text-muted-foreground hover:text-indigo-600"
              >
                {a.className}
              </Link>
            </TableCell>
            <TableCell className="text-right tabular-nums">{a.enrolled}</TableCell>
            <TableCell className="text-right tabular-nums">{a.submitted}</TableCell>
            <TableCell className="text-right tabular-nums">{a.rate}%</TableCell>
            <TableCell className="text-right tabular-nums font-semibold">
              {a.avg?.toFixed(1) ?? "—"}
            </TableCell>
            <TableCell>
              <Link href={`/teacher/assignments/${a.id}`}>
                <Button variant="ghost" size="sm">
                  Chi tiết <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
