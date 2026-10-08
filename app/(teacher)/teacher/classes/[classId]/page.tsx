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
import { Button } from "@/components/ui/button";
import {
  Copy,
  Edit3,
  Archive,
  Users,
  BookOpenText,
  Upload,
  Sparkles,
  Trash2,
  PlusCircle,
  Video,
  FileText,
} from "lucide-react";
import {
  formatDate,
  formatRelative,
  formatFileSize,
} from "@/lib/utils";
import ClassOverviewTab from "./_tabs/overview";
import ClassStudentsTab from "./_tabs/students";
import ClassAnalyticsTab from "./_tabs/analytics";
import ClassAssignmentsTab from "./_tabs/assignments";
import ClassLessonsTab from "./_tabs/lessons";

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { classId } = await params;
  const { tab } = await searchParams;
  const user = await requireRole("TEACHER");
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      teacher: { select: { name: true, email: true } },
      _count: {
        select: {
          enrollments: true,
          lessons: true,
          assignments: true,
          announcements: true,
        },
      },
      lessons: {
        orderBy: { lessonDate: "desc" },
        take: 10,
        include: {
          files: { orderBy: { uploadedAt: "desc" }, take: 5 },
        },
      },
      assignments: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          _count: { select: { submissions: true } },
        },
      },
      enrollments: {
        include: {
          student: { select: { id: true, name: true, email: true, createdAt: true } },
        },
        orderBy: { joinedAt: "desc" },
      },
    },
  });
  if (!cls || cls.teacherId !== user.id) notFound();

  const defaultTab =
    tab &&
    ["overview", "lessons", "recordings", "materials", "assignments", "students", "analytics"].includes(
      tab
    )
      ? tab
      : "overview";

  // Aggregate recordings/materials
  const recordings = cls.lessons.flatMap((l) =>
    l.files.filter((f) => f.isVideo).map((f) => ({ ...f, lessonTitle: l.title, lessonId: l.id }))
  );
  const materials = cls.lessons.flatMap((l) =>
    l.files.filter((f) => !f.isVideo).map((f) => ({ ...f, lessonTitle: l.title, lessonId: l.id }))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="relative overflow-hidden rounded-2xl border border-border/70 shadow-sm"
      >
        <div
          className="h-48 bg-gradient-to-br from-indigo-600 via-blue-700 to-violet-700 relative"
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
            <div className="flex flex-wrap items-center gap-3 pb-1 text-xs">
              <Badge className="bg-white/95 text-indigo-700 border-0">
                {cls.subject || "Môn học"}
              </Badge>
              {cls.level && (
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur">
                  Cấp độ: {cls.level}
                </Badge>
              )}
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur">
                Mã tham gia:{" "}
                <span className="ml-1 font-mono font-semibold tracking-wide">
                  {cls.joinCode}
                </span>
              </Badge>
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
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {cls._count.enrollments} học sinh
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpenText className="h-4 w-4" /> {cls._count.lessons} bài học
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> {cls._count.assignments} bài tập
            </span>
            <span>Giáo viên: {cls.teacher.name}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/teacher/lessons/upload?classId=${cls.id}`}>
                <Upload className="h-4 w-4" /> Tải bài học
              </Link>
            </Button>
            <Button
              size="sm"
              variant="ai"
              asChild
            >
              <Link
                href={`/teacher/ai/generator?classId=${cls.id}`}
              >
                <Sparkles className="h-4 w-4" /> Tạo bài tập AI
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="h-auto flex-wrap gap-1 p-1">
          {[
            { v: "overview", l: "Overview" },
            { v: "lessons", l: "Lessons" },
            { v: "recordings", l: "Recordings" },
            { v: "materials", l: "Materials" },
            { v: "assignments", l: "Assignments" },
            { v: "students", l: "Students" },
            { v: "analytics", l: "Analytics" },
          ].map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="rounded-md">
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <ClassOverviewTab cls={cls} />
        </TabsContent>
        <TabsContent value="lessons">
          <ClassLessonsTab classId={cls.id} lessons={cls.lessons} />
        </TabsContent>
        <TabsContent value="recordings">
          <RecordingsTab recordings={recordings} />
        </TabsContent>
        <TabsContent value="materials">
          <MaterialsTab materials={materials} />
        </TabsContent>
        <TabsContent value="assignments">
          <ClassAssignmentsTab classId={cls.id} assignments={cls.assignments} />
        </TabsContent>
        <TabsContent value="students">
          <ClassStudentsTab classId={cls.id} enrollments={cls.enrollments} />
        </TabsContent>
        <TabsContent value="analytics">
          <ClassAnalyticsTab classId={cls.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecordingsTab({
  recordings,
}: {
  recordings: {
    id: string;
    fileName: string;
    fileType: string;
    fileSizeBytes: bigint;
    lessonId: string;
    lessonTitle: string;
    uploadedAt: Date;
  }[];
}) {
  if (recordings.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Video className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="mt-4 font-semibold">Chưa có video ghi hình nào</div>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Video Zoom của các bài học sẽ xuất hiện ở đây sau khi bạn tải lên.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="p-5 pb-3">
        <CardTitle>Video ghi hình bài học</CardTitle>
        <CardDescription>
          {recordings.length} video · Click để xem
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid gap-px bg-border/50">
          {recordings.map((f) => (
            <div
              key={f.id}
              className="grid grid-cols-12 items-center gap-3 bg-card p-4 sm:p-5"
            >
              <div className="col-span-12 sm:col-span-7 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                    <Video className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium line-clamp-1">{f.fileName}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Thuộc bài:{" "}
                      <Link
                        href={`/teacher/classes/${f.lessonId}`}
                        className="hover:underline"
                      >
                        {f.lessonTitle}
                      </Link>{" "}
                      · {formatDate(f.uploadedAt)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-6 sm:col-span-2 text-xs text-muted-foreground">
                {f.fileType}
              </div>
              <div className="col-span-6 sm:col-span-2 text-xs text-muted-foreground">
                {formatFileSize(f.fileSizeBytes)}
              </div>
              <div className="col-span-12 sm:col-span-1 flex sm:justify-end">
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/teacher/classes/${f.lessonId}?tab=lessons`}>
                    Xem
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MaterialsTab({
  materials,
}: {
  materials: {
    id: string;
    fileName: string;
    fileType: string;
    fileSizeBytes: bigint;
    lessonId: string;
    lessonTitle: string;
    uploadedAt: Date;
  }[];
}) {
  if (materials.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="mt-4 font-semibold">Chưa có tài liệu nào</div>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Tải lên PDF, slide, tài liệu Word để học sinh truy cập mọi lúc.
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link href="/teacher/lessons/upload">
              <PlusCircle className="h-4 w-4" /> Tải tài liệu
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="p-5 pb-3">
        <CardTitle>Tài liệu học tập</CardTitle>
        <CardDescription>
          {materials.length} tệp · PDF, PPT, DOC, hình ảnh...
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid gap-px bg-border/50">
          {materials.map((f) => (
            <div
              key={f.id}
              className="grid grid-cols-12 items-center gap-3 bg-card p-4 sm:p-5"
            >
              <div className="col-span-12 sm:col-span-7 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium line-clamp-1">{f.fileName}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Bài:{" "}
                      <Link
                        href={`/teacher/classes/${f.lessonId}`}
                        className="hover:underline"
                      >
                        {f.lessonTitle}
                      </Link>{" "}
                      · {formatDate(f.uploadedAt)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-6 sm:col-span-2 text-xs text-muted-foreground">
                {f.fileType}
              </div>
              <div className="col-span-6 sm:col-span-2 text-xs text-muted-foreground">
                {formatFileSize(f.fileSizeBytes)}
              </div>
              <div className="col-span-12 sm:col-span-1 flex sm:justify-end">
                <Badge variant="outline">OK</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
