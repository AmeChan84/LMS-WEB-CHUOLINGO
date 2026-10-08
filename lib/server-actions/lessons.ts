"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-actions/auth";
import type { ActionResult } from "@/lib/server-actions/auth";
import { deleteStorageFile } from "@/lib/server-actions/storage";

const createLessonSchema = z.object({
  classId: z.string().min(1, "Vui lòng chọn lớp"),
  title: z.string().min(2, "Tiêu đề tối thiểu 2 ký tự"),
  description: z.string().optional(),
  lessonDate: z.string().min(1, "Vui lòng chọn ngày học"),
  lessonNotes: z.string().optional(),
  learningObjectives: z.string().optional(),
  topicsCovered: z.string().optional(),
});

const fileRecordSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().int().positive(),
  storagePath: z.string().min(1),
  bucket: z.string().min(1),
  isVideo: z.boolean().optional(),
});

export async function createLesson(
  raw: z.infer<typeof createLessonSchema> & {
    files?: z.infer<typeof fileRecordSchema>[];
  }
): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("TEACHER");
  const parsed = createLessonSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Thông tin bài học chưa hợp lệ" };
  }
  const { classId, title, description, lessonDate, lessonNotes, learningObjectives, topicsCovered } = parsed.data;

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.teacherId !== user.id) {
    return { success: false, error: "Lớp không tồn tại hoặc bạn không có quyền." };
  }

  const filesRaw = raw.files ?? [];
  const files: z.infer<typeof fileRecordSchema>[] = [];
  for (const f of filesRaw) {
    const r = fileRecordSchema.safeParse(f);
    if (!r.success) continue;
    files.push(r.data);
  }

  const lesson = await prisma.lesson.create({
    data: {
      classId,
      teacherId: user.id,
      title,
      description: description || null,
      lessonDate: new Date(lessonDate),
      lessonNotes: lessonNotes || null,
      learningObjectives: learningObjectives ? [learningObjectives] : Prisma.JsonNull,
      topicsCovered: topicsCovered || null,
      files: files.length
        ? {
            create: files.map((f) => ({
              fileName: f.fileName,
              fileType: f.fileType,
              fileSizeBytes: f.fileSize,
              storagePath: f.storagePath,
              storageBucket: f.bucket,
              isVideo: !!f.isVideo,
            })),
          }
        : undefined,
    },
  });

  revalidatePath("/teacher/lessons");
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath("/teacher/dashboard");
  return {
    success: true,
    message: "Tạo bài học thành công",
    data: { id: lesson.id },
  };
}

export async function updateLesson(
  lessonId: string,
  raw: Partial<z.infer<typeof createLessonSchema>> & {
    files?: z.infer<typeof fileRecordSchema>[];
  }
): Promise<ActionResult> {
  const user = await requireRole("TEACHER");
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { class: { select: { teacherId: true, id: true } } },
  });
  if (!lesson || lesson.class.teacherId !== user.id) {
    return { success: false, error: "Không có quyền sửa bài học này." };
  }
  const parsed = createLessonSchema.partial().safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Thông tin không hợp lệ" };
  }
  if (parsed.data.classId !== undefined && parsed.data.classId !== lesson.classId) {
    const targetClass = await prisma.class.findUnique({ where: { id: parsed.data.classId } });
    if (!targetClass || targetClass.teacherId !== user.id) {
      return { success: false, error: "Lớp mới không tồn tại hoặc bạn không có quyền." };
    }
  }

  const filesRaw = raw.files ?? [];
  const validFiles: z.infer<typeof fileRecordSchema>[] = [];
  for (const f of filesRaw) {
    const r = fileRecordSchema.safeParse(f);
    if (r.success) validFiles.push(r.data);
  }

  const data: any = {};
  if (parsed.data.classId !== undefined) data.classId = parsed.data.classId;
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.description !== undefined)
    data.description = parsed.data.description || null;
  if (parsed.data.lessonDate !== undefined)
    data.lessonDate = new Date(parsed.data.lessonDate);
  if (parsed.data.lessonNotes !== undefined)
    data.lessonNotes = parsed.data.lessonNotes || null;
  if (parsed.data.learningObjectives !== undefined)
    data.learningObjectives = parsed.data.learningObjectives
      ? [parsed.data.learningObjectives]
      : Prisma.JsonNull;
  if (parsed.data.topicsCovered !== undefined)
    data.topicsCovered = parsed.data.topicsCovered || null;

  await prisma.lesson.update({
    where: { id: lessonId },
    data,
  });

  if (validFiles.length) {
    await prisma.lessonFile.createMany({
      data: validFiles.map((f) => ({
        lessonId,
        fileName: f.fileName,
        fileType: f.fileType,
        fileSizeBytes: f.fileSize,
        storagePath: f.storagePath,
        storageBucket: f.bucket,
        isVideo: !!f.isVideo,
      })),
    });
  }

  revalidatePath(`/teacher/lessons/${lessonId}`);
  revalidatePath(`/teacher/classes/${lesson.classId}`);
  revalidatePath("/teacher/lessons");
  revalidatePath("/teacher/dashboard");
  return { success: true, message: "Cập nhật bài học thành công" };
}

export async function deleteLessonFile(fileId: string): Promise<ActionResult> {
  const user = await requireRole("TEACHER");
  const f = await prisma.lessonFile.findUnique({
    where: { id: fileId },
    include: {
      lesson: { select: { teacherId: true, id: true, classId: true } },
    },
  });
  if (!f || f.lesson.teacherId !== user.id) {
    return { success: false, error: "Không có quyền." };
  }
  if (f.storageBucket && f.storagePath) {
    await deleteStorageFile(f.storageBucket, f.storagePath).catch(() => {});
  }
  await prisma.lessonFile.delete({ where: { id: fileId } });
  revalidatePath(`/teacher/lessons/${f.lessonId}`);
  revalidatePath(`/teacher/classes/${f.lesson.classId}`);
  return { success: true, message: "Đã xóa tệp" };
}

export async function deleteLesson(lessonId: string): Promise<ActionResult> {
  const user = await requireRole("TEACHER");
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      files: true,
      class: { select: { teacherId: true, id: true } },
    },
  });
  if (!lesson || lesson.class.teacherId !== user.id) {
    return { success: false, error: "Không có quyền." };
  }
  // Try to delete storage
  for (const f of lesson.files) {
    if (f.storageBucket && f.storagePath) {
      await deleteStorageFile(f.storageBucket, f.storagePath).catch(() => {});
    }
  }
  await prisma.lesson.delete({ where: { id: lessonId } });
  revalidatePath("/teacher/lessons");
  revalidatePath(`/teacher/classes/${lesson.classId}`);
  revalidatePath("/teacher/dashboard");
  return { success: true, message: "Đã xóa bài học" };
}
