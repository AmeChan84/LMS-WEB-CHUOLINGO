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
import { VideoPlayer } from "@/components/video-player";
import {
  Video,
  FileText,
  Download,
  Trash2,
  Edit3,
  ArrowLeft,
  Sparkles,
  GraduationCap,
  CalendarDays,
  Target,
  ListChecks,
  BookOpenText,
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatFileSize, cn } from "@/lib/utils";
import { getSignedDownloadUrl } from "@/lib/server-actions/storage";
import { deleteLessonFile } from "@/lib/server-actions/lessons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function LessonDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const user = await requireRole("TEACHER");
  const lesson = await prisma.lesson.findUnique({
    where: { id: params.id },
    include: {
      class: {
        select: { id: true, name: true, teacherId: true, joinCode: true },
      },
      files: { orderBy: { uploadedAt: "desc" } },
      assignments: {
        where: { teacherId: user.id },
        take: 5,
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!lesson || lesson.class?.teacherId !== user.id) notFound();

  const videoFiles = lesson.files.filter((f) => f.isVideo);
  const docFiles = lesson.files.filter((f) => !f.isVideo);

  // Resolve signed URLs (or null when Supabase not configured)
  const resolvedFiles = await Promise.all(
    lesson.files.map(async (f) => {
      const r = await getSignedDownloadUrl(f.storageBucket || "lesson-materials", f.storagePath, 60 * 60 * 6);
      return {
        ...f,
        url: r.success && r.data ? r.data.url : null,
      };
    })
  );
  const videoWithUrls = resolvedFiles.filter((f) => f.isVideo);
  const docsWithUrls = resolvedFiles.filter((f) => !f.isVideo);
  const learningObjectivesText =
    typeof lesson.learningObjectives === "string"
      ? lesson.learningObjectives
      : Array.isArray(lesson.learningObjectives)
        ? lesson.learningObjectives.join(", ")
        : lesson.learningObjectives == null
          ? ""
          : JSON.stringify(lesson.learningObjectives);
  const topicsCoveredText =
    typeof lesson.topicsCovered === "string"
      ? lesson.topicsCovered
      : lesson.topicsCovered == null
        ? ""
        : JSON.stringify(lesson.topicsCovered);
  const lessonNotesText =
    typeof lesson.lessonNotes === "string"
      ? lesson.lessonNotes
      : lesson.lessonNotes == null
        ? ""
        : JSON.stringify(lesson.lessonNotes);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/teacher/lessons">
            <ArrowLeft className="h-4 w-4" /> Về thư viện
          </Link>
        </Button>
      </div>

      {/* Hero */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit">
                <GraduationCap className="h-3 w-3 mr-1.5" />
                {lesson.class.name} · Mã lớp: {lesson.class.joinCode}
              </Badge>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {lesson.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  Ngày dạy: {formatDate(lesson.lessonDate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Video className="h-4 w-4" />
                  {videoFiles.length} video
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  {docFiles.length} tài liệu
                </span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button asChild variant="outline">
                <Link href={`/teacher/lessons/${lesson.id}/edit`}>
                  <Edit3 className="h-4 w-4" /> Chỉnh sửa
                </Link>
              </Button>
              <Button asChild variant="ai">
                <Link
                  href={`/teacher/ai/generator?lessonId=${lesson.id}&classId=${lesson.classId}`}
                >
                  <Sparkles className="h-4 w-4" /> Tạo bài tập AI
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {!resolvedFiles.length && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTitle className="text-amber-900">Bài học chưa có tệp nào</AlertTitle>
          <AlertDescription className="text-amber-800/90 text-sm">
            Học sinh sẽ không thể xem video hay tài liệu. Bạn có thể chỉnh sửa bài học để bổ sung.
          </AlertDescription>
        </Alert>
      )}

      {/* Videos */}
      {videoWithUrls.length > 0 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Video className="h-5 w-5 text-indigo-600" /> Video ghi hình
            </h2>
            <p className="text-sm text-muted-foreground">
              Học sinh xem trực tiếp trên nền tảng với trình phát tích hợp.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {videoWithUrls.map((v) => (
              <Card key={v.id} className="overflow-hidden">
                <div className="bg-black">
                  {v.url ? (
                    <VideoPlayer src={v.url} />
                  ) : (
                    <div className="aspect-video flex items-center justify-center text-xs text-white/80">
                      Cấu hình Supabase Storage để phát video
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{v.fileName}</CardTitle>
                      <CardDescription>
                        {formatFileSize(v.fileSizeBytes)} · Upload{" "}
                        {formatDate(v.uploadedAt)}
                      </CardDescription>
                    </div>
                    <form action={async (formData) => {
                      "use server";
                      const fid = String(formData.get("fileId"));
                      await deleteLessonFile(fid);
                    }}>
                      <input type="hidden" name="fileId" value={v.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {docsWithUrls.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-fuchsia-600" /> Tài liệu học tập
            </h2>
            <p className="text-sm text-muted-foreground">
              Học sinh có thể xem hoặc tải về để ôn tập.
            </p>
          </div>
          <Card>
            <CardContent className="divide-y divide-border/80 p-0">
              {docsWithUrls.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40"
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl",
                      /\.(png|jpe?g|gif|webp)$/i.test(d.fileName)
                        ? "bg-amber-50 text-amber-700"
                        : "bg-blue-50 text-blue-700"
                    )}
                  >
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">
                      {d.fileName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.fileType || "Tệp"} · {formatFileSize(d.fileSizeBytes)} ·{" "}
                      {formatDate(d.uploadedAt)}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {d.url ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={d.url} target="_blank" rel="noreferrer">
                          <Download className="h-3.5 w-3.5 mr-1" /> Tải
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="secondary">Storage chưa cấu hình</Badge>
                    )}
                    <form action={async (formData) => {
                      "use server";
                      const fid = String(formData.get("fileId"));
                      await deleteLessonFile(fid);
                    }}>
                      <input type="hidden" name="fileId" value={d.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lesson summary */}
      <div className="grid gap-5 md:grid-cols-2">
        {(lesson.description || learningObjectivesText || topicsCoveredText || lessonNotesText) && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenText className="h-5 w-5" /> Nội dung bài giảng
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              {lesson.description && (
                <div className="space-y-2">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    Mô tả
                  </Badge>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {lesson.description}
                  </p>
                </div>
              )}
              {learningObjectivesText && (
                <div className="space-y-2">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    <Target className="h-3 w-3 mr-1" /> Mục tiêu
                  </Badge>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {learningObjectivesText}
                  </p>
                </div>
              )}
              {topicsCoveredText && (
                <div className="space-y-2">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    <ListChecks className="h-3 w-3 mr-1" /> Chủ đề
                  </Badge>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {topicsCoveredText}
                  </p>
                </div>
              )}
              {lessonNotesText && (
                <div className="space-y-2">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    <Sparkles className="h-3 w-3 mr-1 text-violet-500" /> Ghi chú bài giảng
                  </Badge>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap font-mono text-muted-foreground max-h-60 overflow-auto">
                    {lessonNotesText}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Linked assignments */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-violet-500" /> Bài tập liên kết
            </CardTitle>
            <CardDescription>
              Các bài tập được tạo từ nội dung bài học này.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lesson.assignments.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Chưa có bài tập nào. Hãy sử dụng AI để tạo bài tập từ bài học
                này chỉ trong vài giây.
              </div>
            ) : (
              <ul className="divide-y divide-border/80 -mx-6">
                {lesson.assignments.map((a) => (
                  <li key={a.id} className="px-6">
                    <Link
                      href={`/teacher/assignments/${a.id}`}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {a.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(a.createdAt)} · {a.totalPoints} điểm ·
                          Hạn: {formatDate(a.dueDate)}
                        </div>
                      </div>
                      <Badge variant="outline">{a.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Button asChild variant="ai" size="sm">
                <Link
                  href={`/teacher/ai/generator?lessonId=${lesson.id}&classId=${lesson.classId}`}
                >
                  <Sparkles className="h-4 w-4" /> Tạo bài tập mới từ bài học
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
