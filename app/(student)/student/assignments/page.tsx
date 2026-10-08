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
  Input,
} from "@/components/ui/input";
import {
  FileCheck2,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  Award,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { cn, formatDate, formatRelative } from "@/lib/utils";
import {
  AssignmentStatus,
  ClassStatus,
  SubmissionStatus,
} from "@prisma/client";

type Filter = "all" | "upcoming" | "overdue" | "inprogress" | "submitted" | "graded" | "completed";

export default async function StudentAssignmentsPage(props: {
  searchParams?: Promise<{ q?: string; filter?: string }>;
}) {
  const searchParams = await props.searchParams;
  const user = await requireRole("STUDENT");
  const q = (searchParams?.q || "").trim();
  const filter = (searchParams?.filter as Filter) || "all";

  const baseWhere: any = {
    status: { in: [AssignmentStatus.PUBLISHED, AssignmentStatus.COMPLETED] },
    class: {
      status: ClassStatus.ACTIVE,
      enrollments: { some: { studentId: user.id } },
    },
  };
  if (q) {
    baseWhere.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { instructions: { contains: q, mode: "insensitive" } },
      { class: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const now = new Date();

  const raw = await prisma.assignment.findMany({
    where: baseWhere,
    orderBy: { dueDate: "asc" },
    include: {
      class: { select: { id: true, name: true } },
      submissions: { where: { studentId: user.id }, take: 1 },
    },
    take: 200,
  });

  const rows = raw.map((a) => {
    const sub = a.submissions[0];
    const isSubmitted =
      sub?.status === SubmissionStatus.SUBMITTED ||
      sub?.status === SubmissionStatus.GRADED;
    const overdue =
      a.dueDate && a.dueDate < now && !isSubmitted;
    return { assignment: a, sub, isSubmitted, overdue };
  });

  const filtered = rows.filter(({ assignment, sub, isSubmitted, overdue }) => {
    switch (filter) {
      case "upcoming":
        return !isSubmitted && (!assignment.dueDate || assignment.dueDate >= now);
      case "overdue":
        return !!overdue;
      case "inprogress":
        return sub?.status === SubmissionStatus.IN_PROGRESS;
      case "submitted":
        return sub?.status === SubmissionStatus.SUBMITTED;
      case "graded":
        return sub?.status === SubmissionStatus.GRADED;
      case "completed":
        return isSubmitted;
      default:
        return true;
    }
  });

  const counts: Record<Filter, number> = {
    all: rows.length,
    upcoming: rows.filter(
      (r) => !r.isSubmitted && (!r.assignment.dueDate || r.assignment.dueDate >= now)
    ).length,
    overdue: rows.filter((r) => r.overdue).length,
    inprogress: rows.filter(
      (r) => r.sub?.status === SubmissionStatus.IN_PROGRESS
    ).length,
    submitted: rows.filter(
      (r) => r.sub?.status === SubmissionStatus.SUBMITTED
    ).length,
    graded: rows.filter((r) => r.sub?.status === SubmissionStatus.GRADED).length,
    completed: rows.filter((r) => r.isSubmitted).length,
  };

  const filterChips: { key: Filter; label: string; icon: any; tint: string }[] = [
    { key: "all", label: "Tất cả", icon: FileCheck2, tint: "bg-muted" },
    { key: "upcoming", label: "Cần làm", icon: Clock, tint: "bg-amber-50 text-amber-700" },
    { key: "overdue", label: "Quá hạn", icon: AlertCircle, tint: "bg-rose-50 text-rose-700" },
    { key: "inprogress", label: "Đang làm", icon: Clock, tint: "bg-blue-50 text-blue-700" },
    { key: "submitted", label: "Chờ chấm", icon: CheckCircle2, tint: "bg-violet-50 text-violet-700" },
    { key: "graded", label: "Đã chấm", icon: Award, tint: "bg-emerald-50 text-emerald-700" },
  ];

  const scoreLabel = (sub: typeof rows[0]["sub"], totalPoints: number) => {
    if (!sub) return null;
    if (sub.status === SubmissionStatus.GRADED && sub.score != null) {
      const pct = totalPoints > 0 ? (Number(sub.score) / totalPoints) * 10 : 0;
      return {
        text: `${Number(sub.score).toFixed(1)} / ${totalPoints}`,
        pct,
      };
    }
    return null;
  };

  const statusBadge = (row: (typeof rows)[0]) => {
    const { assignment, sub, overdue } = row;
    if (!sub) {
      if (overdue) {
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" /> Quá hạn
          </Badge>
        );
      }
      return <Badge variant="outline">Chưa bắt đầu</Badge>;
    }
    switch (sub.status) {
      case SubmissionStatus.IN_PROGRESS:
        if (overdue)
          return (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" /> Quá hạn
            </Badge>
          );
        return <Badge variant="secondary">Đang làm</Badge>;
      case SubmissionStatus.SUBMITTED:
        return <Badge variant="info">Chờ chấm</Badge>;
      case SubmissionStatus.GRADED:
        return <Badge variant="success">Đã chấm</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Bài tập của tôi
          </h1>
          <p className="mt-1 text-muted-foreground">
            Theo dõi tiến độ, nộp bài và xem điểm các bài tập trong lớp của bạn.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            k: "Cần làm",
            v: counts.upcoming,
            tint: "bg-amber-50 text-amber-700",
            icon: Clock,
          },
          {
            k: "Quá hạn",
            v: counts.overdue,
            tint: "bg-rose-50 text-rose-700",
            icon: AlertCircle,
          },
          {
            k: "Đang làm",
            v: counts.inprogress,
            tint: "bg-blue-50 text-blue-700",
            icon: Sparkles,
          },
          {
            k: "Đã chấm",
            v: counts.graded,
            tint: "bg-emerald-50 text-emerald-700",
            icon: Award,
          },
        ].map((s) => (
          <Card key={s.k}>
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.tint}`}
              >
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{s.k}</div>
                <div className="text-xl font-bold tracking-tight">{s.v}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form className="relative flex-1 md:max-w-md" method="get">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            placeholder="Tìm theo tên bài, lớp..."
            defaultValue={q}
            className="pl-9"
          />
        </form>
        <div className="flex flex-wrap gap-2">
          {filterChips.map((c) => (
            <form key={c.key} method="get" className="contents">
              {q && <input type="hidden" name="q" value={q} />}
              <Button
                asChild
                type="button"
                size="sm"
                variant={filter === c.key ? "default" : "outline"}
                className={cn(
                  filter !== c.key && "bg-transparent hover:bg-muted"
                )}
              >
                <Link
                  href={`/student/assignments?q=${encodeURIComponent(q)}&filter=${c.key}`}
                  className="inline-flex gap-1.5 items-center"
                >
                  <c.icon className="h-3.5 w-3.5" />
                  {c.label}
                  <span className="text-[10px] opacity-70 tabular-nums">
                    ({counts[c.key]})
                  </span>
                </Link>
              </Button>
            </form>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-muted">
              <FileCheck2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="mt-4 text-lg font-semibold">
              Không có bài tập nào
            </div>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Khi giáo viên giao bài tập, bạn sẽ thấy chúng ở đây.
            </p>
            <Button asChild className="mt-5" size="sm" variant="outline">
              <Link href="/student/classes">
                Vào lớp học <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bài tập</TableHead>
                  <TableHead>Lớp</TableHead>
                  <TableHead>Hạn nộp</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Điểm</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(({ assignment, sub, isSubmitted, overdue }) => {
                  const scored = scoreLabel(sub, assignment.totalPoints);
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <Link
                          href={`/student/assignments/${assignment.id}`}
                          className="font-medium hover:text-indigo-600 line-clamp-1"
                        >
                          {assignment.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/student/classes/${assignment.classId}`}
                          className="text-sm text-muted-foreground hover:text-indigo-600"
                        >
                          {assignment.class.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {assignment.dueDate ? (
                            <>
                              <span className="text-sm">
                                {formatDate(assignment.dueDate)}
                              </span>
                              <span
                                className={cn(
                                  "text-xs",
                                  overdue
                                    ? "text-rose-600 font-medium"
                                    : "text-muted-foreground"
                                )}
                              >
                                {formatRelative(assignment.dueDate)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Không hạn
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {statusBadge({ assignment, sub, isSubmitted, overdue })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {scored ? `${scored.text}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Link href={`/student/assignments/${assignment.id}`}>
                          <Button
                            size="sm"
                            variant={
                              sub?.status === SubmissionStatus.GRADED
                                ? "outline"
                                : overdue
                                  ? "destructive"
                                  : sub?.status === SubmissionStatus.SUBMITTED
                                    ? "outline"
                                    : "default"
                            }
                          >
                            {sub?.status === SubmissionStatus.GRADED
                              ? "Xem kết quả"
                              : sub?.status === SubmissionStatus.SUBMITTED
                                ? "Xem bài nộp"
                                : overdue
                                  ? "Xem bài"
                                  : sub?.status === SubmissionStatus.IN_PROGRESS
                                    ? "Tiếp tục"
                                    : "Bắt đầu"}
                            <ArrowRight className="ml-1.5 h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
