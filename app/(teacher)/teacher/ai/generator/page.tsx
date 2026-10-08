import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-actions/auth";
import { ClassStatus } from "@prisma/client";
import { AiGeneratorClient } from "./_client";

export default async function AiGeneratorPage(props: {
  searchParams?: Promise<{ classId?: string; lessonId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const user = await requireRole("TEACHER");

  const classes = await prisma.class.findMany({
    where: { teacherId: user.id, status: ClassStatus.ACTIVE },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      subject: true,
      level: true,
      lessons: {
        orderBy: { lessonDate: "desc" },
        select: {
          id: true,
          title: true,
          lessonDate: true,
          description: true,
          topicsCovered: true,
          learningObjectives: true,
          lessonNotes: true,
        },
      },
    },
  });

  const preselectClass = searchParams?.classId || "";
  const preselectLesson = searchParams?.lessonId || "";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-100 via-violet-100 to-fuchsia-100 px-3 py-1 text-xs font-semibold text-indigo-700 mb-3">
          <span className="ai-gradient-text">AI-POWERED</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Trình tạo bài tập bằng AI
        </h1>
        <p className="mt-1 text-muted-foreground max-w-3xl">
          Mô tả bài học của bạn — AI sẽ phân tích nội dung, mục tiêu và kiến thức trọng
          tâm để tự động tạo bộ bài tập tương tác đa dạng, kèm đáp án và giải thích.
        </p>
      </div>
      <AiGeneratorClient
        classes={classes}
        preselectClass={preselectClass}
        preselectLesson={preselectLesson}
      />
    </div>
  );
}
