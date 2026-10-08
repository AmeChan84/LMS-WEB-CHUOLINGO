import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-actions/auth";
import {
  AssignmentStatus,
  SubmissionStatus,
  ClassStatus,
} from "@prisma/client";
import type { GeneratedAssignment } from "@/lib/ai/question-schema";
import { AssignmentPlayerClient } from "./_player-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatRelative } from "@/lib/utils";
import {
  ArrowLeft,
  Clock,
  Award,
  AlertTriangle,
  Sparkles,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import { getSignedDownloadUrl } from "@/lib/server-actions/storage";

export default async function StudentAssignmentPage(props: {
  params: Promise<{ assignmentId: string }>;
}) {
  const params = await props.params;
  const user = await requireRole("STUDENT");

  const assignment = await prisma.assignment.findUnique({
    where: { id: params.assignmentId },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          enrollments: { where: { studentId: user.id } },
          teacher: { select: { name: true } },
          status: true,
        },
      },
      lesson: {
        select: {
          id: true,
          title: true,
          files: {
            where: { isVideo: false },
            orderBy: { uploadedAt: "desc" },
            take: 5,
            select: {
              id: true,
              fileName: true,
              fileType: true,
              fileSizeBytes: true,
              storagePath: true,
              storageBucket: true,
              uploadedAt: true,
            },
          },
        },
      },
    },
  });

  if (!assignment) notFound();
  const enrolled = assignment.class.enrollments.length > 0;
  if (!enrolled || assignment.class.status !== ClassStatus.ACTIVE) notFound();

  // Draft: block students from viewing
  if (assignment.status === AssignmentStatus.DRAFT) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-12">
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="py-10 text-center space-y-3">
            <LockKeyhole className="mx-auto h-10 w-10 text-amber-600" />
            <h1 className="text-xl font-semibold">Bài tập chưa được mở</h1>
            <p className="text-muted-foreground text-sm">
              Giáo viên chưa xuất bản bài tập này cho học sinh. Quay lại sau nhé.
            </p>
            <Button asChild variant="outline" className="back-navigation mt-3">
              <Link href="/student/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Về trang chủ
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const submission = await prisma.submission.findUnique({
    where: {
      assignmentId_studentId: {
        assignmentId: assignment.id,
        studentId: user.id,
      },
    },
  });

  const now = new Date();
  const overdue =
    assignment.dueDate &&
    assignment.dueDate < now &&
    (!submission ||
      (submission.status !== SubmissionStatus.SUBMITTED &&
        submission.status !== SubmissionStatus.GRADED));
  const closed =
    assignment.dueDate && assignment.dueDate < now &&
    submission?.status !== SubmissionStatus.GRADED;

  const questions =
    (assignment.questionsJson as GeneratedAssignment | null) || null;

  // Resolve any download links for lesson files
  const materialsWithUrl = assignment.lesson?.files?.length
    ? await Promise.all(
        assignment.lesson.files.map(async (f) => {
          const r = await getSignedDownloadUrl(
            f.storageBucket || "lesson-materials",
            f.storagePath,
            60 * 60 * 3
          );
          return { ...f, url: r.success && r.data ? r.data.url : null };
        })
      )
    : [];

  const showResults = submission?.status === SubmissionStatus.GRADED;
    const showFeedback = !!assignment.dueDate &&
    new Date() >= new Date(assignment.dueDate.getTime());

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="back-navigation">
          <Link href="/student/assignments">
            <ArrowLeft className="h-4 w-4 mr-1" /> Về danh sách bài tập
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {assignment.class.name}
                </Badge>
                <Badge variant="outline">
                  <Award className="h-3 w-3 mr-1" /> {assignment.totalPoints} điểm
                </Badge>
                {overdue && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Quá hạn
                  </Badge>
                )}
                {submission?.status === SubmissionStatus.GRADED && (
                  <Badge variant="success">
                    <Sparkles className="h-3 w-3 mr-1" /> Đã chấm
                  </Badge>
                )}
                {submission?.status === SubmissionStatus.SUBMITTED && (
                  <Badge variant="info">Đã nộp</Badge>
                )}
                {submission?.status === SubmissionStatus.IN_PROGRESS && (
                  <Badge variant="secondary">Đang làm</Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {assignment.title}
              </h1>
              <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
                <span>GV: {assignment.class.teacher?.name || "—"}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Hạn: {assignment.dueDate ? formatDateTime(assignment.dueDate) : "Không có"}
                  {assignment.dueDate && (
                    <span className="text-muted-foreground/80">
                      ({formatRelative(assignment.dueDate)})
                    </span>
                  )}
                </span>
                {questions?.estimatedMinutes && (
                  <span>
                    ước tính ~{questions.estimatedMinutes} phút
                  </span>
                )}
              </div>
            </div>
          </div>
          {assignment.instructions && (
            <div className="mt-3 rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap">
              <span className="font-semibold mr-2">Hướng dẫn:</span>
              {assignment.instructions}
            </div>
          )}
        </CardHeader>
      </Card>

      {overdue && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">
            Đã quá hạn nộp bài
          </AlertTitle>
          <AlertDescription className="text-amber-800 text-sm">
            Bạn vẫn có thể xem lại bài làm của mình, nhưng kết quả có thể không được tính điểm.
          </AlertDescription>
        </Alert>
      )}

      {materialsWithUrl.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Tài liệu bài học liên quan
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/70 p-0">
            {materialsWithUrl.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 p-4 text-sm"
              >
                <div className="text-muted-foreground">📎</div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{f.fileName}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(f.uploadedAt)}
                  </div>
                </div>
                {f.url ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={f.url} target="_blank" rel="noreferrer">
                      Mở
                    </a>
                  </Button>
                ) : (
                  <Badge variant="secondary">Storage chưa cấu hình</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!questions || !questions.questions?.length ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center space-y-2">
            <AlertTriangle className="mx-auto h-9 w-9 text-amber-500" />
            <div className="font-semibold">Bài tập chưa có nội dung câu hỏi</div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Giáo viên có thể đang điều chỉnh nội dung. Quay lại sau hoặc
              báo với giáo viên để được hỗ trợ.
            </p>
          </CardContent>
        </Card>
      ) : (
        <AssignmentPlayerClient
          assignment={{
            id: assignment.id,
            title: assignment.title,
            instructions: assignment.instructions || "",
            totalPoints: assignment.totalPoints,
            dueDate: assignment.dueDate,
            questions,
          }}
          submission={
            submission
              ? {
                  id: submission.id,
                  status: submission.status,
                  answersJson:
                    (submission.answersJson as Record<string, any>) || null,
                  score:
                    submission.score != null ? Number(submission.score) : undefined,
                  feedback: submission.feedback || undefined,
                  submittedAt: submission.submittedAt ?? undefined,
                  gradedAt: submission.gradedAt ?? undefined,
                }
              : null
          }
          studentName={user.name}
          showFeedback={Boolean(
            showResults ||
              (submission?.status === SubmissionStatus.SUBMITTED &&
                (!assignment.dueDate || closed || overdue))
          )}
          allowEdit={
            (!closed &&
              (!assignment.dueDate ||
                assignment.dueDate >= new Date())) ||
            (submission?.status === SubmissionStatus.IN_PROGRESS &&
              !submission.submittedAt)
          }
        />
      )}
    </div>
  );
}
