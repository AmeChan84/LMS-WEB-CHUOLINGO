import { notFound } from "next/navigation";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileCheck2,
  Download,
  Users,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  Edit3,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatDateTime, formatRelative } from "@/lib/utils";
import { QuestionRenderer } from "@/components/questions/renderer";
import type { GeneratedAssignment } from "@/lib/ai/question-schema";
import { AssignmentStatus, SubmissionStatus } from "@prisma/client";
import { AssignmentSubmissionReviewClient } from "./_review-client";

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

export default async function AssignmentDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const user = await requireRole("TEACHER");
  const assignment = await prisma.assignment.findUnique({
    where: { id: params.id },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          joinCode: true,
          _count: { select: { enrollments: true } },
        },
      },
      submissions: {
        orderBy: { submittedAt: "desc" },
        include: {
          student: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  if (!assignment || assignment.teacherId !== user.id) notFound();

  const enrolledCount = assignment.class?._count.enrollments ?? 0;
  const submitted = assignment.submissions.filter(
    (s) =>
      s.status === SubmissionStatus.SUBMITTED ||
      s.status === SubmissionStatus.GRADED
  ).length;
  const inProgress = assignment.submissions.filter(
    (s) => s.status === SubmissionStatus.IN_PROGRESS
  ).length;
  const graded = assignment.submissions.filter(
    (s) => s.status === SubmissionStatus.GRADED
  ).length;
  const gradedWithScore = assignment.submissions.filter(
    (s) => s.status === SubmissionStatus.GRADED && s.score != null
  );
  const avgScore =
    gradedWithScore.length > 0
      ? gradedWithScore.reduce(
          (sum, s) => sum + Number(s.score || 0),
          0
        ) / gradedWithScore.length
      : null;

  const questionsJson =
    (assignment.questionsJson as GeneratedAssignment | null) || null;

  const csvHref = `/teacher/assignments/${assignment.id}/export.csv`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="back-navigation">
          <Link href="/teacher/assignments">
            <ArrowLeft className="h-4 w-4" /> Về danh sách
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {statusBadge(assignment.status)}
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1.5" />
                  {assignment.class?.name}
                </Badge>
                <Badge variant="outline">
                  <FileCheck2 className="h-3 w-3 mr-1.5" />
                  {assignment.totalPoints} điểm
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {assignment.title}
              </h1>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                <span>Tạo: {formatDate(assignment.createdAt)}</span>
                <span>
                  Hạn nộp: {assignment.dueDate ? formatDate(assignment.dueDate) : "Không có"}
                </span>
                {assignment.dueDate && (
                  <span className="italic">
                    ({formatRelative(assignment.dueDate)})
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button asChild variant="outline">
                <Link href={csvHref}>
                  <Download className="h-4 w-4 mr-2" /> Xuất CSV
                </Link>
              </Button>
              <Button asChild variant="ai">
                <Link
                  href={`/teacher/ai/generator?classId=${assignment.classId}&lessonId=${assignment.lessonId || ""}`}
                >
                  <Sparkles className="h-4 w-4" /> Tạo tương tự
                </Link>
              </Button>
            </div>
          </div>
          {assignment.instructions && (
            <p className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
              <span className="font-semibold mr-2">Hướng dẫn:</span>
              {assignment.instructions}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {
            key: "Đã giao",
            value: enrolledCount,
            icon: Users,
            tint: "bg-blue-50 text-blue-700",
          },
          {
            key: "Đang làm",
            value: inProgress,
            icon: Clock,
            tint: "bg-amber-50 text-amber-700",
          },
          {
            key: "Đã nộp",
            value: submitted,
            icon: CheckCircle2,
            tint: "bg-violet-50 text-violet-700",
          },
          {
            key: "Đã chấm",
            value: graded,
            icon: Edit3,
            tint: "bg-emerald-50 text-emerald-700",
          },
          {
            key: "Điểm TB",
            value: avgScore != null ? avgScore.toFixed(1) : "—",
            icon: BarChart3,
            tint: "bg-indigo-50 text-indigo-700",
          },
        ].map((s) => (
          <Card key={s.key}>
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.tint}`}
              >
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{s.key}</div>
                <div className="text-2xl font-bold tracking-tight">
                  {s.value}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="submissions" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="submissions">
            Bài nộp ({assignment.submissions.length})
          </TabsTrigger>
          <TabsTrigger value="preview">
            Xem trước bài tập
          </TabsTrigger>
        </TabsList>
        <TabsContent value="submissions" className="space-y-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Học sinh</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Điểm</TableHead>
                    <TableHead>Bắt đầu / Nộp</TableHead>
                    <TableHead>Nhận xét</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignment.submissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="py-10 text-center text-sm text-muted-foreground">
                          Chưa có học sinh nào nộp bài.
                          {enrolledCount > 0 && (
                            <>
                              <br />
                              Có {enrolledCount} học sinh được giao bài tập này.
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignment.submissions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.student.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.student.email}
                        </TableCell>
                        <TableCell>
                          <SubStatusBadge status={s.status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {s.score != null
                            ? `${Number(s.score).toFixed(1)} / ${assignment.totalPoints}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div>Bắt đầu: {formatDateTime(s.createdAt)}</div>
                          <div>
                            Nộp:{" "}
                            {s.submittedAt
                              ? formatDateTime(s.submittedAt)
                              : "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[180px] line-clamp-2">
                          {s.feedback || "—"}
                        </TableCell>
                        <TableCell>
                          <AssignmentSubmissionReviewClient
                            submissionId={s.id}
                            studentName={s.student.name}
                            status={s.status}
                            initialScore={s.score != null ? Number(s.score) : undefined}
                            initialFeedback={s.feedback ?? undefined}
                            answersJson={s.answersJson as Record<string, any>}
                            questionsJson={questionsJson}
                            totalPoints={assignment.totalPoints}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Nội dung bài tập (như học sinh sẽ thấy)</CardTitle>
              <CardDescription>
                Đây là cách bài tập hiển thị với học sinh. Chỉnh sửa bằng AI Generator hoặc JSON.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!questionsJson || !questionsJson.questions?.length ? (
                <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                  <AlertCircle className="mx-auto h-6 w-6 mb-2" />
                  Bài tập không có dữ liệu câu hỏi (JSON questions null)
                </div>
              ) : (
                questionsJson.questions.map((q, i) => (
                  <div
                    key={q.id}
                    className="rounded-xl border p-5 bg-card"
                  >
                    <QuestionRenderer
                      question={q}
                      index={i}
                      mode="review"
                      showFeedback
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SubStatusBadge({ status }: { status: SubmissionStatus }) {
  switch (status) {
    case SubmissionStatus.IN_PROGRESS:
      return <Badge variant="secondary">Đang làm</Badge>;
    case SubmissionStatus.SUBMITTED:
      return <Badge variant="info">Chờ chấm</Badge>;
    case SubmissionStatus.GRADED:
      return <Badge variant="success">Đã chấm</Badge>;
  }
}
