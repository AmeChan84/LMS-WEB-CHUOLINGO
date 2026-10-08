"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-actions/auth";
import type { ActionResult } from "@/lib/server-actions/auth";
import {
  AssignmentStatus,
  SubmissionStatus,
} from "@prisma/client";
import type {
  GeneratedAssignment,
  AnyQuestion,
  MatchingQuestion,
  OrderingQuestion,
  FillInBlankQuestion,
  TrueFalseQuestion,
  MultipleChoiceQuestion,
  ShortAnswerQuestion,
  Flashcard,
  ScenarioQuestion,
  MiniQuizQuestion,
} from "@/lib/ai/question-schema";
import { generatedAssignmentSchema } from "@/lib/ai/question-schema";

const createAssignmentSchema = z.object({
  classId: z.string().min(1, "Vui lòng chọn lớp"),
  lessonId: z.string().optional(),
  title: z.string().min(2, "Tiêu đề tối thiểu 2 ký tự"),
  instructions: z.string().optional(),
  totalPoints: z.number().int().positive().default(10),
  dueDate: z.string().optional(),
  status: z
    .enum([
      AssignmentStatus.DRAFT,
      AssignmentStatus.PUBLISHED,
      AssignmentStatus.ARCHIVED,
    ])
    .default(AssignmentStatus.DRAFT),
  questionsJson: z.any(),
  answerKeyJson: z.any().optional(),
});

export async function saveAssignment(
  raw: z.infer<typeof createAssignmentSchema>
): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("TEACHER");
  const parsed = createAssignmentSchema.safeParse(raw);
  if (!parsed.success) {
    const msgs = Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return {
      success: false,
      error: "Thông tin bài tập chưa hợp lệ" + (msgs ? `: ${msgs}` : ""),
    };
  }
  const {
    classId,
    lessonId,
    title,
    instructions,
    totalPoints,
    dueDate,
    status,
    questionsJson,
    answerKeyJson,
  } = parsed.data;

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.teacherId !== user.id) {
    return { success: false, error: "Lớp không tồn tại hoặc không có quyền." };
  }
  if (lessonId) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { teacherId: true, classId: true },
    });
    if (!lesson || lesson.teacherId !== user.id || lesson.classId !== classId) {
      return {
        success: false,
        error: "Bài học không tồn tại hoặc không thuộc lớp này.",
      };
    }
  }

  // Schema-validate questions (silently ignore invalid if teacher edited, but warn)
  let validated: GeneratedAssignment | null = null;
  if (questionsJson) {
    try {
      const check = generatedAssignmentSchema.safeParse(questionsJson);
      if (check.success) validated = check.data;
    } catch {}
  }
  const questionsToStore =
    validated ?? (questionsJson as GeneratedAssignment | null);

  const ass = await prisma.assignment.create({
    data: {
      classId,
      lessonId: lessonId || null,
      teacherId: user.id,
      title,
      instructions: instructions || null,
      totalPoints,
      dueDate: dueDate ? new Date(dueDate) : null,
      status,
      questionsJson: questionsToStore ? (questionsToStore as any) : null,
      answerKeyJson: answerKeyJson ?? null,
    },
  });
  revalidatePath("/teacher/assignments");
  revalidatePath("/teacher/ai/generator");
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath("/teacher/dashboard");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/assignments");
  return {
    success: true,
    message:
      status === AssignmentStatus.PUBLISHED
        ? "Đã xuất bản bài tập cho học sinh"
        : "Đã lưu bản nháp",
    data: { id: ass.id },
  };
}

export async function updateAssignment(
  assignmentId: string,
  raw: Partial<z.infer<typeof createAssignmentSchema>>
): Promise<ActionResult> {
  const user = await requireRole("TEACHER");
  const ass = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { teacherId: true, classId: true },
  });
  if (!ass || ass.teacherId !== user.id) {
    return { success: false, error: "Không có quyền." };
  }
  const parsed = createAssignmentSchema.partial().safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Thông tin không hợp lệ" };
  }
  const data: any = {};
  if (parsed.data.classId !== undefined) data.classId = parsed.data.classId;
  if (parsed.data.lessonId !== undefined)
    data.lessonId = parsed.data.lessonId || null;
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.instructions !== undefined)
    data.instructions = parsed.data.instructions || null;
  if (parsed.data.totalPoints !== undefined)
    data.totalPoints = parsed.data.totalPoints;
  if (parsed.data.dueDate !== undefined)
    data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.questionsJson !== undefined)
    data.questionsJson = parsed.data.questionsJson;
  if (parsed.data.answerKeyJson !== undefined)
    data.answerKeyJson = parsed.data.answerKeyJson;

  await prisma.assignment.update({ where: { id: assignmentId }, data });
  revalidatePath(`/teacher/assignments/${assignmentId}`);
  revalidatePath("/teacher/assignments");
  revalidatePath(`/teacher/classes/${ass.classId}`);
  revalidatePath("/student/dashboard");
  revalidatePath("/student/assignments");
  return { success: true, message: "Đã cập nhật bài tập" };
}

export async function deleteAssignment(assignmentId: string): Promise<ActionResult> {
  const user = await requireRole("TEACHER");
  const ass = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { teacherId: true, classId: true },
  });
  if (!ass || ass.teacherId !== user.id) {
    return { success: false, error: "Không có quyền." };
  }
  await prisma.assignment.delete({ where: { id: assignmentId } });
  revalidatePath("/teacher/assignments");
  revalidatePath(`/teacher/classes/${ass.classId}`);
  revalidatePath("/teacher/dashboard");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/assignments");
  return { success: true, message: "Đã xóa bài tập" };
}

// -------- Submission (student) actions --------
const answersSchema = z.record(z.string(), z.any());

export async function upsertSubmission(
  assignmentId: string,
  answersJson: Record<string, any>,
  submitted: boolean = false
): Promise<ActionResult<{ submissionId: string; score?: number }>> {
  const user = await requireRole("STUDENT");
  const parsed = answersSchema.safeParse(answersJson);
  if (!parsed.success) {
    return { success: false, error: "Định dạng câu trả lời không hợp lệ" };
  }
  const ass = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      class: {
        select: {
          enrollments: {
            where: { studentId: user.id },
            select: { id: true },
          },
        },
      },
    },
  });
  if (!ass || !ass.class.enrollments.length) {
    return {
      success: false,
      error: "Bài tập không tồn tại hoặc bạn không có quyền truy cập.",
    };
  }
  if (ass.status !== AssignmentStatus.PUBLISHED && !submitted) {
    // Students can still load draft details? No — don't allow submissions for non-published
    return { success: false, error: "Bài tập chưa được mở." };
  }

  const existing = await prisma.submission.findUnique({
    where: {
      assignmentId_studentId: { assignmentId, studentId: user.id },
    },
  });
  if (existing && existing.status === SubmissionStatus.GRADED) {
    return { success: false, error: "Bài đã được chấm, không thể sửa." };
  }

  let score: number | null = null;
  let gradedAt: Date | null = null;
  const status = submitted
    ? SubmissionStatus.SUBMITTED
    : SubmissionStatus.IN_PROGRESS;

  // Auto-grade when submitted
  if (submitted && ass.questionsJson) {
    score = await autoGrade(ass.questionsJson as GeneratedAssignment, parsed.data);
    gradedAt = new Date();
  }

  let finalStatus: SubmissionStatus = status;
  // Only mark GRADED if all question types are auto-gradable (no short/flash scenario open-ended)
  if (submitted && ass.questionsJson) {
    const hasOpen = hasOpenEnded(ass.questionsJson as GeneratedAssignment);
    if (score != null && !hasOpen) {
      finalStatus = SubmissionStatus.GRADED;
    }
  }

  const data: any = {
    assignmentId,
    studentId: user.id,
    answersJson: parsed.data,
    status: finalStatus,
    submittedAt: submitted ? new Date() : existing?.submittedAt ?? null,
    gradedAt: finalStatus === SubmissionStatus.GRADED ? gradedAt : null,
    score: finalStatus === SubmissionStatus.GRADED ? score : null,
  };

  const sub = existing
    ? await prisma.submission.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.submission.create({ data });

  revalidatePath(`/student/assignments/${assignmentId}`);
  revalidatePath("/student/assignments");
  revalidatePath("/student/dashboard");
  revalidatePath(`/teacher/assignments/${assignmentId}`);
  revalidatePath("/teacher/assignments");
  revalidatePath("/teacher/dashboard");
  return {
    success: true,
    message: submitted ? "Đã nộp bài" : "Đã lưu nháp",
    data: {
      submissionId: sub.id,
      score: finalStatus === SubmissionStatus.GRADED ? (score ?? undefined) : undefined,
    },
  };
}

function hasOpenEnded(a: GeneratedAssignment): boolean {
  function qHasOpen(list: AnyQuestion[]): boolean {
    for (const q of list) {
      if (q.type === "short") return true;
      if (q.type === "flash") continue;
      if (q.type === "scenario") {
        for (const s of q.subQuestions) if (s.type === "short") return true;
      }
      if (q.type === "quiz") {
        if (qHasOpen(q.questions as AnyQuestion[])) return true;
      }
    }
    return false;
  }
  return qHasOpen(a.questions);
}

type GradableResult = { total: number; earned: number };

function gradeQuestionList(
  questions: AnyQuestion[],
  answers: Record<string, any>
): GradableResult {
  let total = 0;
  let earned = 0;
  for (const q of questions) {
    const pts = "points" in q ? Number(q.points ?? 1) : 1;
    const ans = answers[q.id];
    switch (q.type) {
      case "mc": {
        total += pts;
        if (ans === undefined) continue;
        const typed = q as MultipleChoiceQuestion;
        if (String(ans) === String(typed.correctOptionId)) earned += pts;
        break;
      }
      case "tf": {
        total += pts;
        if (ans === undefined) continue;
        const typed = q as TrueFalseQuestion;
        if (Boolean(ans) === typed.correctAnswer) earned += pts;
        break;
      }
      case "fill": {
        total += pts;
        if (ans === undefined) continue;
        const typed = q as FillInBlankQuestion;
        // ans: Record<blankId, textAnswer> OR single-string for single-blank compatibility
        let allCorrect = true;
        let anyBlank = false;
        for (const b of typed.blanks) {
          const expected = (b.acceptedAnswers || []).map((s) =>
            String(s).toLowerCase().trim()
          );
          const given =
            typeof ans === "string"
              ? ans
              : (ans as Record<string, string>)?.[b.id];
          if (given === undefined) continue;
          anyBlank = true;
          const val = String(given).toLowerCase().trim();
          if (!expected.includes(val)) {
            allCorrect = false;
            break;
          }
        }
        if (anyBlank && allCorrect) earned += pts;
        break;
      }
      case "match": {
        total += pts;
        if (typeof ans !== "object" || !ans) continue;
        const typed = q as MatchingQuestion;
        const pairs = typed.pairs || [];
        if (!pairs.length) continue;
        // ans: Record<indexLeft, indexRight> e.g. {"0":"2","1":"0"}
        let pairCorrect = 0;
        pairs.forEach((_, i) => {
          if (String(ans[String(i)]) === String(i)) pairCorrect++;
        });
        earned += (pairCorrect / pairs.length) * pts;
        break;
      }
      case "order": {
        total += pts;
        const arr = Array.isArray(ans) ? ans.map(String) : [];
        const typed = q as OrderingQuestion;
        const correctOrder = (typed.correctOrder || []).map((i) => String(i.id));
        if (!correctOrder.length) continue;
        if (
          arr.length === correctOrder.length &&
          arr.every((v, i) => v === correctOrder[i])
        ) {
          earned += pts;
        }
        break;
      }
      case "short": {
        // Open-ended: no points
        break;
      }
      case "flash": {
        // Self-study card; no grade impact
        break;
      }
      case "scenario": {
        total += pts;
        const typed = q as ScenarioQuestion;
        const subAns =
          typeof ans === "object" && ans ? (ans as Record<string, any>) : {};
        const subList: AnyQuestion[] = typed.subQuestions as AnyQuestion[];
        const sub = gradeQuestionList(subList, subAns);
        if (sub.total > 0) {
          const ratio = sub.earned / sub.total;
          earned += ratio * pts;
        }
        break;
      }
      case "quiz": {
        total += pts;
        const typed = q as MiniQuizQuestion;
        const subAns =
          typeof ans === "object" && ans ? (ans as Record<string, any>) : {};
        const subList: AnyQuestion[] = typed.questions as AnyQuestion[];
        const sub = gradeQuestionList(subList, subAns);
        if (sub.total > 0) {
          const ratio = sub.earned / sub.total;
          earned += ratio * pts;
        }
        break;
      }
    }
  }
  return { total, earned };
}

export async function autoGrade(
  assignment: GeneratedAssignment,
  answers: Record<string, any>
): Promise<number> {
  const qs: AnyQuestion[] = assignment.questions || [];
  const { total, earned } = gradeQuestionList(qs, answers);
  if (total <= 0) return 0;
  const pct = earned / total;
  // Normalize to 0-10 scale by default. Teachers override with totalPoints later.
  return Math.round(pct * 100) / 10;
}

const gradeFeedbackSchema = z.object({
  score: z.number(),
  feedback: z.string().optional(),
});

export async function gradeSubmission(
  submissionId: string,
  raw: z.infer<typeof gradeFeedbackSchema>
): Promise<ActionResult> {
  const user = await requireRole("TEACHER");
  const parsed = gradeFeedbackSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Thông tin chấm điểm không hợp lệ" };
  }
  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: { select: { teacherId: true, classId: true, id: true } } },
  });
  if (!sub || sub.assignment.teacherId !== user.id) {
    return { success: false, error: "Không có quyền." };
  }
  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      score: parsed.data.score,
      feedback: parsed.data.feedback || null,
      gradedAt: new Date(),
      status: SubmissionStatus.GRADED,
    },
  });
  revalidatePath(`/teacher/assignments/${sub.assignmentId}`);
  revalidatePath(`/student/assignments/${sub.assignmentId}`);
  revalidatePath("/teacher/assignments");
  revalidatePath("/teacher/dashboard");
  return { success: true, message: "Đã cập nhật điểm và nhận xét" };
}
