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
  BookOpenText,
  Upload,
  Search,
  ArrowRight,
  Video,
  FileText,
  Calendar,
  GraduationCap,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export default async function LessonLibraryPage(
  props: { searchParams?: Promise<{ q?: string }> }
) {
  const searchParams = await props.searchParams;
  const user = await requireRole("TEACHER");
  const q = (searchParams?.q || "").trim();

  const where: any = { teacherId: user.id };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { topicsCovered: { contains: q, mode: "insensitive" } },
      { class: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const lessons = await prisma.lesson.findMany({
    where,
    include: {
      class: { select: { id: true, name: true } },
      files: { orderBy: { uploadedAt: "desc" } },
    },
    orderBy: { lessonDate: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Thư viện bài học
          </h1>
          <p className="mt-1 text-muted-foreground">
            Quản lý bài giảng, video ghi hình và tài liệu học tập.
          </p>
        </div>
        <Button asChild>
          <Link href="/teacher/lessons/upload">
            <Upload className="h-4 w-4" /> Upload bài học mới
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <form action="" method="get">
            <Input
              name="q"
              placeholder="Tìm bài học, chủ đề, lớp…"
              defaultValue={q}
              className="pl-9"
            />
          </form>
        </div>
      </div>

      {lessons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-muted">
              <BookOpenText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-5 text-lg font-semibold">
              Chưa có bài học nào
            </div>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Tải lên video ghi hình Zoom, tài liệu PDF, slide bài giảng để
              học sinh truy cập bất cứ lúc nào.
            </p>
            <Button asChild className="mt-6">
              <Link href="/teacher/lessons/upload">
                <PlusCircle className="h-4 w-4" /> Tạo bài học đầu tiên
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((l) => {
            const video = l.files.find((f) => f.isVideo);
            const docs = l.files.filter((f) => !f.isVideo).length;
            return (
              <Link
                key={l.id}
                href={`/teacher/lessons/${l.id}`}
                className="group"
              >
                <Card className="h-full overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                  <div className="h-36 w-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                      {video && (
                        <Badge className="bg-white/90 text-indigo-700 gap-1">
                          <Video className="h-3 w-3" /> Video
                        </Badge>
                      )}
                      {docs > 0 && (
                        <Badge className="bg-white/90 text-fuchsia-700 gap-1">
                          <FileText className="h-3 w-3" /> {docs} TL
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base line-clamp-2 min-h-[3rem]">
                      {l.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-1 flex items-center gap-1 mt-1">
                      <GraduationCap className="h-3 w-3" />
                      {l.class?.name || "Chưa phân lớp"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDate(l.lessonDate)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                      Xem chi tiết <ArrowRight className="h-3 w-3" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
