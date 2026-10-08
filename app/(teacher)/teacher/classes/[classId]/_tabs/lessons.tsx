import Link from "next/link";
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
  PlusCircle,
  Video,
  FileText,
  Calendar,
} from "lucide-react";
import type { Lesson, LessonFile } from "@prisma/client";
import { formatDate, formatFileSize } from "@/lib/utils";

type L = Lesson & { files: (LessonFile & {})[] };

export default function ClassLessonsTab({
  classId,
  lessons,
}: {
  classId: string;
  lessons: L[];
}) {
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href={`/teacher/lessons/upload?classId=${classId}`}>
            <PlusCircle className="h-4 w-4" /> Tải bài học mới
          </Link>
        </Button>
      </div>
      {lessons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <BookOpenText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-5 text-lg font-semibold">
              Chưa có bài học nào cho lớp này
            </div>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Tải video ghi hình Zoom, PDF, slide bài giảng để học sinh học tập mọi lúc.
            </p>
            <Button asChild className="mt-6">
              <Link href={`/teacher/lessons/upload?classId=${classId}`}>
                <PlusCircle className="h-4 w-4" /> Tải bài học đầu tiên
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {lessons.map((l) => {
            const hasVideo = l.files.some((f) => f.isVideo);
            const docs = l.files.filter((f) => !f.isVideo);
            return (
              <Card
                key={l.id}
                className="overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="h-36 w-full relative">
                  {hasVideo ? (
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500 via-fuchsia-600 to-indigo-700">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
                      <div className="absolute inset-0 grid place-items-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur ring-1 ring-white/40">
                          <Video className="h-7 w-7 text-white" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
                      <div className="absolute inset-0 grid place-items-center">
                        <FileText className="h-10 w-10 text-white/90" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3">
                    <Badge className="bg-white/95 text-foreground text-xs border-0 shadow-sm">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDate(l.lessonDate)}
                    </Badge>
                  </div>
                </div>
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-base line-clamp-2 min-h-[2.75rem]">
                    {l.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                    {l.description || "Không có mô tả."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-2 space-y-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="outline" className="gap-1">
                      {l.files.length} tệp
                    </Badge>
                    {hasVideo && (
                      <Badge variant="info" className="gap-1">
                        <Video className="h-3 w-3" /> Video
                      </Badge>
                    )}
                    {docs.length > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <FileText className="h-3 w-3" /> Tài liệu:{" "}
                        {docs.length}
                      </Badge>
                    )}
                  </div>
                  {l.files.length > 0 && (
                    <ul className="text-xs divide-y divide-border/60 rounded-lg border border-border/70 overflow-hidden">
                      {l.files.slice(0, 3).map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center justify-between px-3 py-2"
                        >
                          <span className="truncate pr-2">{f.fileName}</span>
                          <span className="text-muted-foreground flex-shrink-0">
                            {formatFileSize(f.fileSizeBytes)}
                          </span>
                        </li>
                      ))}
                      {l.files.length > 3 && (
                        <li className="px-3 py-2 text-muted-foreground">
                          + {l.files.length - 3} tệp khác…
                        </li>
                      )}
                    </ul>
                  )}
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/teacher/lessons/${l.id}`}>
                      Mở bài học →
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
