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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  FileCheck2,
  Search,
  PlusCircle,
  Sparkles,
  ArrowRight,
  Download,
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatRelative } from "@/lib/utils";
import {
  AssignmentStatus,
  ClassStatus,
  SubmissionStatus,
} from "@prisma/client";

function statusBadge(s: AssignmentStatus) {
  switch (s) {
    case AssignmentStatus.DRAFT:
      return <Badge variant="secondary">Nháp</Badge>;
    case AssignmentStatus.PUBLISHED:
      return <Badge variant="success">Đã xuất bản</Badge>;
    case AssignmentStatus.COMPLETED:
      return <Badge variant="info">Đã hoàn thành</Badge>;
    case AssignmentStatus.ARCHIVED:
      return <Badge variant="outline">Lưu trữ</Badge>;
  }
}

export default async function AssignmentsListPage(props: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const user = await requireRole("TEACHER");
  const q = (searchParams?.q || "").trim();
  const statusFilter = searchParams?.status || "ALL";

  const where: any = { teacherId: user.id };
  if (statusFilter !== "ALL") where.status = statusFilter;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { instructions: { contains: q, mode: "insensitive" } },
      { class: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const assignments = await prisma.assignment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          _count: { select: { enrollments: true } },
        },
      },
      _count: {
        select: {
          submissions: true,
        },
      },
      submissions: {
        select: {
          status: true,
          score: true,
        },
      },
    },
    take: 100,
  });

  const rows = assignments.map((a) => {
    const enrolled = a.class._count.enrollments ?? 0;
    const submitted = a._count.submissions;
    const graded = a.submissions.filter(
      (s) => s.status === SubmissionStatus.GRADED && s.score != null
    );
    const avg =
      graded.length > 0
        ? graded.reduce((sum, s) => sum + Number(s.score || 0), 0) /
          graded.length
        : null;
    return { assignment: a, enrolled, submitted, avg };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Quản lý bài tập
          </h1>
          <p className="mt-1 text-muted-foreground">
            Theo dõi bài tập, xem bài nộp, chấm điểm và phân tích kết quả của học sinh.
          </p>
        </div>
        <Button asChild variant="ai">
          <Link href="/teacher/ai/generator">
            <Sparkles className="h-4 w-4" /> Tạo bài tập với AI
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form className="relative flex-1 md:max-w-md" method="get">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            placeholder="Tìm theo tên, lớp, nội dung..."
            defaultValue={q}
            className="pl-9"
          />
        </form>
        <form method="get">
          {q && <input type="hidden" name="q" value={q} />}
          <Select
            name="status"
            defaultValue={statusFilter}
            onValueChange={(v) => {
              const f = document.getElementById(
                "status-form-target"
              ) as HTMLFormElement | null;
              if (f) f.requestSubmit();
            }}
          >
            <SelectTrigger className="w-[180px]" id="status-form-target">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              <SelectItem value={AssignmentStatus.DRAFT}>Nháp</SelectItem>
              <SelectItem value={AssignmentStatus.PUBLISHED}>
                Đã xuất bản
              </SelectItem>
              <SelectItem value={AssignmentStatus.COMPLETED}>
                Đã hoàn thành
              </SelectItem>
              <SelectItem value={AssignmentStatus.ARCHIVED}>
                Lưu trữ
              </SelectItem>
            </SelectContent>
          </Select>
          <button type="submit" className="sr-only">
            Lọc
          </button>
        </form>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            key: "Tổng",
            value: rows.length,
            tint: "bg-blue-50 text-blue-700",
          },
          {
            key: "Xuất bản",
            value: rows.filter((r) => r.assignment.status === "PUBLISHED")
              .length,
            tint: "bg-emerald-50 text-emerald-700",
          },
          {
            key: "Bài nộp",
            value: rows.reduce((s, r) => s + r.submitted, 0),
            tint: "bg-violet-50 text-violet-700",
          },
          {
            key: "Điểm TB",
            value:
              rows.filter((r) => r.avg != null).length > 0
                ? (
                    rows
                      .filter((r) => r.avg != null)
                      .reduce((s, r) => s + (r.avg || 0), 0) /
                    rows.filter((r) => r.avg != null).length
                  ).toFixed(1)
                : "—",
            tint: "bg-amber-50 text-amber-700",
          },
        ].map((s) => (
          <Card key={s.key}>
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.tint}`}
              >
                <FileCheck2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">
                  {s.key}
                </div>
                <div className="text-xl font-bold tracking-tight">
                  {s.value}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-muted">
              <FileCheck2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-4 text-lg font-semibold">Chưa có bài tập</div>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Sử dụng AI để tạo bộ bài tập tương tác dựa trên bài học của bạn chỉ
              trong vài giây.
            </p>
            <Button asChild variant="ai" className="mt-5">
              <Link href="/teacher/ai/generator">
                <Sparkles className="h-4 w-4" /> Tạo bài tập đầu tiên
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bài tập</TableHead>
                  <TableHead>Lớp</TableHead>
                  <TableHead>Tạo</TableHead>
                  <TableHead>Hạn nộp</TableHead>
                  <TableHead className="text-right">Đã giao</TableHead>
                  <TableHead className="text-right">Đã nộp</TableHead>
                  <TableHead className="text-right">Điểm TB</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ assignment, enrolled, submitted, avg }) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <Link
                        href={`/teacher/assignments/${assignment.id}`}
                        className="font-medium hover:text-indigo-600 line-clamp-1"
                      >
                        {assignment.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/teacher/classes/${assignment.classId}`}
                        className="text-sm text-muted-foreground hover:text-indigo-600"
                      >
                        {assignment.class?.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(assignment.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {assignment.dueDate ? (
                          <>
                            <span className="text-sm">
                              {formatDate(assignment.dueDate)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatRelative(assignment.dueDate)}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Không hạn
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {enrolled}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {submitted}/{enrolled}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {avg != null ? avg.toFixed(1) : "—"}
                    </TableCell>
                    <TableCell>{statusBadge(assignment.status)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/teacher/assignments/${assignment.id}`}
                      >
                        <Button variant="ghost" size="sm">
                          Xem
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
