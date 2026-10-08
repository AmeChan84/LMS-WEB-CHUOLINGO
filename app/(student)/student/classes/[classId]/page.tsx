import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-actions/auth";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  BookOpenText,
  Sparkles,
  Video,
  FileText,
  Megaphone,
} from "lucide-react";
import {
  formatDate,
  formatFileSize,
  formatRelative,
} from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AssignmentStatus, SubmissionStatus } from "@prisma/client";

export default async function StudentClassDetail({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { classId } = await params;
  const { tab } = await searchParams;
  const user = await requireRole("STUDENT");
  const enrollment = await prisma.classEnrollment.findUnique({
    where: {
      classId_studentId: { classId, studentId: user.id },
    },
    include: {
      class: {
        include: {
          teacher: { select: { name: true } },
          lessons: {
            orderBy: { lessonDate: "desc" },
            include: {
              files: { orderBy: { uploadedAt: "desc" } },
            },
          },
          assignments: {
            where: { status: AssignmentStatus.PUBLISHED },
            orderBy: { createdAt: "desc" },
            include: {
              submissions: {
                where: { studentId: user.id },
                select: {
                  id: true,
                  status: true,
                  score: true,
                  submittedAt: true,
                },
                take: 1,
              },
            },
          },
          announcements: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
          _count: { select: { enrollments: true } },
        },
      },
    },
  });
  if (!enrollment) notFound();
  const cls = enrollment.class;

  const defaultTab =
    tab && ["lessons", "materials", "assignments", "announcements"].includes(tab)
      ? tab
      : "lessons";

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/70 shadow-sm">
        <div
          className="h-44 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 relative"
          style={
            cls.coverImageUrl
              ? {
                  backgroundImage: `url(${cls.coverImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <Badge className="bg-white/95 text-indigo-700 border-0 shadow-sm">
                {cls.subject || "Môn học"}
              </Badge>
              {cls.level && (
                <Badge className="bg-white/15 text-white border-white/30 backdrop-blur">
                  {cls.level}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {cls.name}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-white/85 line-clamp-2">
              {cls.description || "Không có mô tả."}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-border/70 bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
            <span>Giáo viên: {cls.teacher.name}</span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {cls._count.enrollments} học sinh
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpenText className="h-4 w-4" /> {cls.lessons.length} bài học
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> {cls.assignments.length} bài tập
            </span>
          </div>
          <Badge variant="success">
            Tham gia: {formatDate(enrollment.joinedAt)}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="h-auto flex-wrap gap-1 p-1">
          {[
            { v: "lessons", l: "Lessons & Recordings" },
            { v: "materials", l: "Materials" },
            { v: "assignments", l: "Assignments" },
            { v: "announcements", l: "Announcements" },
          ].map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="rounded-md">
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="lessons">
          <LessonsView lessons={cls.lessons} />
        </TabsContent>
        <TabsContent value="materials">
          <MaterialsView lessons={cls.lessons} />
        </TabsContent>
        <TabsContent value="assignments">
          <AssignmentsView assignments={cls.assignments as any} />
        </TabsContent>
        <TabsContent value="announcements">
          <AnnouncementsView items={cls.announcements as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LessonsView({ lessons }: { lessons: any[] }) {
  if (lessons.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <BookOpenText className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="mt-4 font-semibold">Lớp chưa có bài học</div>
          <p className="mt-1 max-w-sm mx-auto text-sm text-muted-foreground">
            Giáo viên sẽ sớm tải lên bài học và video ghi hình.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {lessons.map((l) => {
        const video = l.files.find((f: any) => f.isVideo);
        const hasVideo = !!video;
        return (
          <Card key={l.id}>
            <CardHeader className="p-5 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{l.title}</CardTitle>
                <Badge variant="outline">{formatDate(l.lessonDate)}</Badge>
              </div>
              <CardDescription className="line-clamp-2">
                {l.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              {hasVideo && (
                <div className="rounded-xl overflow-hidden border border-border/70 bg-black/95 aspect-video grid place-items-center relative">
                  <VideoPlayerPreview title={l.title} />
                </div>
              )}
              {l.files.length > 0 && (
                <div className="rounded-xl border border-border/70 divide-y divide-border/60 overflow-hidden">
                  {l.files.slice(0, 6).map((f: any) => (
                    <div
                      key={f.id}
                      className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm"
                    >
                      <div className="col-span-12 sm:col-span-7 min-w-0 flex items-center gap-2">
                        <div
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                            f.isVideo
                              ? "bg-rose-100 text-rose-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {f.isVideo ? (
                            <Video className="h-4.5 w-4.5" />
                          ) : (
                            <FileText className="h-4.5 w-4.5" />
                          )}
                        </div>
                        <span className="truncate font-medium">{f.fileName}</span>
                      </div>
                      <div className="col-span-4 sm:col-span-2 text-xs text-muted-foreground">
                        {f.fileType}
                      </div>
                      <div className="col-span-4 sm:col-span-2 text-xs text-muted-foreground">
                        {formatFileSize(f.fileSizeBytes)}
                      </div>
                      <div className="col-span-4 sm:col-span-1 flex sm:justify-end">
                        <Button size="sm" variant="ghost" asChild>
                          <a href="#" onClick={(e) => e.preventDefault()}>
                            Mở
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function VideoPlayerPreview({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/40 backdrop-blur">
        <Video className="h-8 w-8" />
      </div>
      <div className="mt-3 text-sm text-white/85">{title}</div>
      <div className="mt-1 text-xs text-white/70">
        Video sẽ phát khi bạn nhấn Play (sau khi tích hợp storage/signed URL)
      </div>
      <div className="absolute left-4 right-4 bottom-4">
        <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
          <div className="h-full w-1/4 bg-white" />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-white/80">
          <span>00:00</span>
          <span>45:32</span>
        </div>
      </div>
    </div>
  );
}

function MaterialsView({ lessons }: { lessons: any[] }) {
  const all = lessons.flatMap((l) =>
    l.files
      .filter((f: any) => !f.isVideo)
      .map((f: any) => ({ ...f, lessonTitle: l.title, lessonId: l.id }))
  );
  if (all.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="mt-4 font-semibold">Chưa có tài liệu</div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="p-5 pb-3">
        <CardTitle>Tất cả tài liệu ({all.length})</CardTitle>
        <CardDescription>PDF, slide, Word, hình ảnh…</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/70">
          {all.map((f) => (
            <div
              key={f.id}
              className="grid grid-cols-12 items-center gap-3 p-4 sm:p-5 text-sm"
            >
              <div className="col-span-12 sm:col-span-7 min-w-0 flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium line-clamp-1">{f.fileName}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground truncate">
                    Bài: {f.lessonTitle}
                  </div>
                </div>
              </div>
              <div className="col-span-4 sm:col-span-2 text-xs text-muted-foreground">
                {f.fileType}
              </div>
              <div className="col-span-4 sm:col-span-2 text-xs text-muted-foreground">
                {formatFileSize(f.fileSizeBytes)}
              </div>
              <div className="col-span-4 sm:col-span-1 flex sm:justify-end">
                <Button size="sm" variant="ghost" asChild>
                  <a href="#" onClick={(e) => e.preventDefault()}>
                    Tải
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AssignmentsView({ assignments }: { assignments: any[] }) {
  if (assignments.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Sparkles className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="mt-4 font-semibold">Chưa có bài tập</div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bài tập</TableHead>
              <TableHead>Hạn nộp</TableHead>
              <TableHead>Điểm</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((a) => {
              const sub = (a.submissions || [])[0];
              const overdue =
                a.dueDate && new Date(a.dueDate).getTime() < Date.now();
              const notStarted = !sub || sub.status === SubmissionStatus.IN_PROGRESS;
              let statusBadge: React.ReactNode;
              if (!sub || sub.status === SubmissionStatus.IN_PROGRESS) {
                statusBadge = overdue ? (
                  <Badge variant="destructive">Overdue</Badge>
                ) : (
                  <Badge variant="secondary">
                    {sub?.status === SubmissionStatus.IN_PROGRESS
                      ? "In Progress"
                      : "Not Started"}
                  </Badge>
                );
              } else if (sub.status === SubmissionStatus.SUBMITTED) {
                statusBadge = <Badge variant="info">Submitted</Badge>;
              } else if (sub.status === SubmissionStatus.GRADED) {
                statusBadge = <Badge variant="success">Graded</Badge>;
              }
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{formatDate(a.dueDate)}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatRelative(a.dueDate)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {sub?.status === SubmissionStatus.GRADED
                      ? `${Number(sub.score || 0).toFixed(1)} / ${a.totalPoints}`
                      : "—"}
                  </TableCell>
                  <TableCell>{statusBadge}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/student/assignments/${a.id}`}>
                        {notStarted ? "Làm bài →" : "Xem →"}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AnnouncementsView({ items }: { items: any[] }) {
  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Megaphone className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="mt-4 font-semibold">Chưa có thông báo</div>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((a) => (
        <Card key={a.id}>
          <CardHeader className="p-5 pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{a.title}</CardTitle>
              <Badge variant="outline">{formatRelative(a.createdAt)}</Badge>
            </div>
            <CardDescription>
              {formatDate(a.createdAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="whitespace-pre-line text-sm">{a.content}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
