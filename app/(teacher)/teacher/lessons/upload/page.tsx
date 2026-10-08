import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploader, type UploadedFile } from "@/components/file-uploader";
import { ClassStatus } from "@prisma/client";
import { LessonUploadClient } from "./_client";

export default async function UploadLessonPage() {
  const user = await requireRole("TEACHER");

  const classes = await prisma.class.findMany({
    where: { teacherId: user.id, status: ClassStatus.ACTIVE },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, subject: true, coverImageUrl: true },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Upload bài học mới
        </h1>
        <p className="mt-1 text-muted-foreground">
          Tải lên video ghi hình Zoom, tài liệu học tập và mô tả chi tiết bài giảng.
        </p>
      </div>

      <LessonUploadClient classes={classes} />
    </div>
  );
}
