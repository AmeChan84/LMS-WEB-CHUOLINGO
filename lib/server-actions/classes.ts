"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateJoinCode } from "@/lib/utils";
import { requireRole } from "@/lib/server-actions/auth";
import type { ActionResult } from "@/lib/server-actions/auth";
import { ClassStatus } from "@prisma/client";

const createClassSchema = z.object({
  name: z.string().min(2, "Tên lớp tối thiểu 2 ký tự"),
  subject: z.string().min(2, "Môn học tối thiểu 2 ký tự"),
  level: z.string().optional(),
  description: z.string().optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
});

export async function createClass(
  raw: z.infer<typeof createClassSchema>
): Promise<ActionResult<{ id: string; joinCode: string }>> {
  const user = await requireRole("TEACHER");
  const parsed = createClassSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Thông tin lớp học chưa hợp lệ" };
  }
  let joinCode = generateJoinCode(6);
  // Ensure uniqueness
  for (let i = 0; i < 10; i++) {
    const exists = await prisma.class.findUnique({ where: { joinCode } });
    if (!exists) break;
    joinCode = generateJoinCode(6);
  }
  const cls = await prisma.class.create({
    data: {
      ...parsed.data,
      coverImageUrl: parsed.data.coverImageUrl || null,
      teacherId: user.id,
      joinCode,
    },
  });
  revalidatePath("/teacher/classes");
  revalidatePath("/teacher/dashboard");
  return {
    success: true,
    message: "Tạo lớp học thành công",
    data: { id: cls.id, joinCode: cls.joinCode },
  };
}

export async function archiveClass(classId: string): Promise<ActionResult> {
  const user = await requireRole("TEACHER");
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.teacherId !== user.id) {
    return { success: false, error: "Bạn không có quyền với lớp học này." };
  }
  await prisma.class.update({
    where: { id: classId },
    data: { status: ClassStatus.ARCHIVED },
  });
  revalidatePath("/teacher/classes");
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath("/teacher/dashboard");
  return { success: true, message: "Lớp đã được lưu trữ." };
}

export async function removeStudentFromClass(
  classId: string,
  studentId: string
): Promise<ActionResult> {
  const user = await requireRole("TEACHER");
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.teacherId !== user.id) {
    return { success: false, error: "Không có quyền." };
  }
  await prisma.classEnrollment.deleteMany({
    where: { classId, studentId },
  });
  revalidatePath(`/teacher/classes/${classId}`);
  return { success: true, message: "Đã xóa học sinh khỏi lớp." };
}

const joinSchema = z.object({
  code: z.string().min(4, "Mã tham gia quá ngắn").max(12),
});

export async function joinClassByCode(
  raw: z.infer<typeof joinSchema>
): Promise<ActionResult<{ classId: string; className: string }>> {
  const user = await requireRole("STUDENT");
  const parsed = joinSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Mã tham gia không hợp lệ" };
  }
  const code = parsed.data.code.toUpperCase().trim();
  const cls = await prisma.class.findFirst({
    where: { joinCode: code, status: ClassStatus.ACTIVE },
  });
  if (!cls) {
    return { success: false, error: "Mã tham gia không tồn tại hoặc lớp đã bị lưu trữ." };
  }
  try {
    await prisma.classEnrollment.create({
      data: { classId: cls.id, studentId: user.id },
    });
  } catch (e: any) {
    if (/unique|duplicate/i.test(String(e?.message || ""))) {
      return {
        success: false,
        error: "Bạn đã tham gia lớp này rồi.",
      };
    }
    throw e;
  }
  revalidatePath("/student/dashboard");
  revalidatePath("/student/classes");
  return {
    success: true,
    message: "Tham gia lớp thành công.",
    data: { classId: cls.id, className: cls.name },
  };
}
