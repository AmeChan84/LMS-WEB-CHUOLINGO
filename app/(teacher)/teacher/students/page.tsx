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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  GraduationCap,
  Award,
  BookOpenText,
  BarChart3,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { ClassStatus, SubmissionStatus } from "@prisma/client";

export default async function StudentsPage(props: {
  searchParams?: Promise<{ q?: string; classId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const user = await requireRole("TEACHER");
  const q = (searchParams?.q || "").trim();
  const classFilter = searchParams?.classId || "ALL";

  const classes = await prisma.class.findMany({
    where: { teacherId: user.id, status: ClassStatus.ACTIVE },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, joinCode: true },
  });

  const classWhere: any = { teacherId: user.id, status: ClassStatus.ACTIVE };
  if (classFilter !== "ALL") classWhere.id = classFilter;

  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      class: classWhere,
      ...(q
        ? {
            student: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      class: { select: { id: true, name: true } },
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          _count: {
            select: {
              enrollments: {
                where: { class: { teacherId: user.id } },
              },
              submissions: {
                where: {
                  assignment: { teacherId: user.id },
                  status: {
                    in: [
                      SubmissionStatus.SUBMITTED,
                      SubmissionStatus.GRADED,
                    ],
                  },
                },
              },
            },
          },
          submissions: {
            where: { assignment: { teacherId: user.id } },
            select: { score: true, status: true },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  // Aggregate per student
  type Row = {
    id: string;
    name: string;
    email: string;
    joinedAt: Date;
    classes: string[];
    submitted: number;
    graded: number;
    avg: number | null;
  };

  const byStudent = new Map<string, Row>();
  for (const e of enrollments) {
    const existing = byStudent.get(e.student.id);
    const graded = e.student.submissions.filter(
      (s) => s.status === SubmissionStatus.GRADED && s.score != null
    );
    const avg =
      graded.length > 0
        ? graded.reduce((sum, s) => sum + Number(s.score || 0), 0) /
          graded.length
        : null;
    if (existing) {
      existing.classes.push(e.class.name);
      existing.submitted += e.student._count.submissions;
      existing.graded += graded.length;
      if (avg != null) {
        existing.avg =
          existing.avg != null ? (existing.avg + avg) / 2 : avg;
      }
    } else {
      byStudent.set(e.student.id, {
        id: e.student.id,
        name: e.student.name,
        email: e.student.email,
        joinedAt: e.joinedAt,
        classes: [e.class.name],
        submitted: e.student._count.submissions,
        graded: graded.length,
        avg,
      });
    }
  }
  const rows = [...byStudent.values()];

  const copyJoinCode = (code: string) => {
    // client-side only, this comment forces file to be RSC, handled by UI button via client JS
    void code;
  };
  void copyJoinCode;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Học sinh
        </h1>
        <p className="mt-1 text-muted-foreground">
          Danh sách học sinh trong các lớp bạn quản lý — theo dõi tiến độ và kết quả học tập.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tổng HS</div>
              <div className="text-xl font-bold tracking-tight">
                {rows.length}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Số lớp</div>
              <div className="text-xl font-bold tracking-tight">
                {classes.length}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <BookOpenText className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Bài nộp</div>
              <div className="text-xl font-bold tracking-tight">
                {rows.reduce((s, r) => s + r.submitted, 0)}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Điểm TB</div>
              <div className="text-xl font-bold tracking-tight">
                {rows.some((r) => r.avg != null)
                  ? (
                      rows
                        .filter((r) => r.avg != null)
                        .reduce((s, r) => s + (r.avg || 0), 0) /
                      rows.filter((r) => r.avg != null).length
                    ).toFixed(1)
                  : "—"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class join codes */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {classes.map((c) => (
          <Card key={c.id} className="overflow-hidden">
            <div className="h-16 bg-gradient-to-br from-indigo-500 to-violet-600 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
            </div>
            <CardContent className="-mt-8 px-4 pb-4">
              <Link href={`/teacher/classes/${c.id}`}>
                <div className="rounded-lg border bg-background shadow-sm p-3 inline-flex flex-col">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Mã tham gia
                  </div>
                  <div className="font-mono font-bold tracking-widest text-lg flex items-center gap-1">
                    {c.joinCode}
                    <button
                      type="button"
                      className="text-xs text-primary"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(c.joinCode);
                        } catch {}
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Link>
              <div className="mt-2 text-sm font-medium line-clamp-1">
                {c.name}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form method="get" className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            placeholder="Tìm theo tên, email..."
            defaultValue={q}
            className="pl-9"
          />
        </form>
        <form method="get" className="flex gap-2">
          {q && <input type="hidden" name="q" value={q} />}
          <select
            name="classId"
            defaultValue={classFilter}
            onChange={(e) => (e.target.form as HTMLFormElement).requestSubmit()}
            className="h-9 px-3 rounded-md border bg-background text-sm"
          >
            <option value="ALL">Tất cả lớp</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </form>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            Danh sách học sinh ({rows.length})
          </CardTitle>
          <CardDescription>
            Thống kê chi tiết theo từng học sinh trong các lớp bạn quản lý.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Học sinh</TableHead>
                <TableHead>Lớp</TableHead>
                <TableHead>Tham gia</TableHead>
                <TableHead className="text-right">Bài nộp</TableHead>
                <TableHead className="text-right">Đã chấm</TableHead>
                <TableHead className="text-right">Điểm TB</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      Chưa có học sinh nào. Chia sẻ mã tham gia lớp học để học sinh
                      đăng ký vào nhé.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.classes.map((c) => (
                          <Badge key={c} variant="secondary" className="text-[11px]">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(r.joinedAt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {r.submitted}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.graded}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {r.avg != null ? r.avg.toFixed(1) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
