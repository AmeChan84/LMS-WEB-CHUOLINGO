import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-actions/auth";
import { LessonEditClient } from "./_client";

export default async function LessonEditPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const user = await requireRole("TEACHER");
  const lesson = await prisma.lesson.findUnique({
    where: { id: params.id },
    include: { class: { select: { id: true, name: true, teacherId: true } } },
  });

  if (!lesson || lesson.class.teacherId !== user.id) notFound();

  return (
    <LessonEditClient
      lesson={{
        id: lesson.id,
        classId: lesson.classId,
        className: lesson.class.name,
        title: lesson.title,
        description: lesson.description,
        lessonDate: lesson.lessonDate.toISOString().slice(0, 10),
        lessonNotes: lesson.lessonNotes,
        learningObjectives: typeof lesson.learningObjectives === "string" ? lesson.learningObjectives : JSON.stringify(lesson.learningObjectives ?? ""),
        topicsCovered: lesson.topicsCovered,
      }}
    />
  );
}
