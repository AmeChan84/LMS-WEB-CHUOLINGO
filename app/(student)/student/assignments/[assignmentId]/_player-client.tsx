"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTransition } from "react";
import { QuestionRenderer } from "@/components/questions/renderer";
import type {
  GeneratedAssignment,
  AnyQuestion,
} from "@/lib/ai/question-schema";
import { QUESTION_TYPE_LABELS } from "@/lib/ai/question-schema";
import { SubmissionStatus } from "@prisma/client";
import { upsertSubmission } from "@/lib/server-actions/assignments";
import type { ActionResult } from "@/lib/server-actions/auth";
import { cn, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  SaveAll,
  Send,
  Sparkles,
  Eye,
  XCircle,
  Trophy,
} from "lucide-react";

type Assn = {
  id: string;
  title: string;
  instructions: string;
  totalPoints: number;
  dueDate: Date | string | null;
  questions: GeneratedAssignment;
};

type Sub = {
  id: string;
  status: SubmissionStatus;
  answersJson: Record<string, any> | null;
  score?: number;
  feedback?: string;
  submittedAt?: Date;
  gradedAt?: Date;
};

type View = "play" | "review" | "results";

export function AssignmentPlayerClient({
  assignment,
  submission,
  studentName,
  showFeedback,
  allowEdit,
}: {
  assignment: Assn;
  submission: Sub | null;
  studentName: string;
  showFeedback: boolean;
  allowEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTr] = useTransition();
  const questions: AnyQuestion[] = assignment.questions.questions || [];

  const initialAnswers = submission?.answersJson &&
    typeof submission.answersJson === "object"
    ? submission.answersJson
    : {};
  const [answers, setAnswers] = React.useState<Record<string, any>>(
    initialAnswers as Record<string, any>
  );
  const [current, setCurrent] = React.useState(0);
  const [view, setView] = React.useState<View>(() => {
    if (submission?.status === SubmissionStatus.GRADED) return "results";
    if (submission?.status === SubmissionStatus.SUBMITTED) return "results";
    return "play";
  });
  const [saving, setSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(
    submission?.submittedAt ? new Date(submission.submittedAt) : null
  );
  const [confirmSubmit, setConfirmSubmit] = React.useState(false);

  const debouncedSave = React.useMemo(() => {
    return debounce((next: Record<string, any>) => {
      if (!allowEdit) return;
      setSaving(true);
      startTr(async () => {
        const res: ActionResult<any> = await upsertSubmission(
          assignment.id,
          next,
          false
        );
        setSaving(false);
        if (res.success) {
          setLastSaved(new Date());
        } else {
          toast.error(res.error || "Lỗi lưu nháp");
        }
      });
    }, 800);
  }, [assignment.id, allowEdit, startTr]);

  React.useEffect(() => {
    return () => debouncedSave.cancel?.();
  }, [debouncedSave]);

  const onAnswer = (qid: string, value: any) => {
    if (!allowEdit) return;
    const next = { ...answers, [qid]: value };
    setAnswers(next);
    debouncedSave(next);
  };

  const answeredCount = questions.filter((q) => isAnswered(q, answers)).length;
  const progressPct = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const now = new Date();
  const due = typeof assignment.dueDate === "string"
    ? new Date(assignment.dueDate)
    : assignment.dueDate;
  const timeLeft = due ? due.getTime() - now.getTime() : Infinity;
  const showTimeLeft = !!due && due.getTime() > now.getTime();

  const goSubmit = () => {
    if (!allowEdit) return;
    setConfirmSubmit(true);
  };

  const confirmedSubmit = () => {
    setConfirmSubmit(false);
    setSaving(true);
    startTr(async () => {
      const res: ActionResult<{ submissionId: string; score?: number }> =
        await upsertSubmission(assignment.id, answers, true);
      setSaving(false);
      if (res.success) {
        toast.success(res.message || "Đã nộp bài");
        setView("results");
        if (res.data?.score !== undefined) {
          toast.success(`Điểm tự động: ${res.data.score} / 10`);
        }
      } else {
        toast.error(res.error || "Lỗi nộp bài");
      }
    });
  };

  const q = questions[current];

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <Card className="h-fit lg:sticky lg:top-4">
        <CardHeader className="pb-3 space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Bài làm của bạn</CardTitle>
            <Badge variant="outline">{questions.length} câu</Badge>
          </div>
          {view === "play" && (
            <>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {answeredCount}/{questions.length} đã làm
              </div>
              <Progress value={progressPct} className="h-2" />
              {showTimeLeft && (
                <div className="text-xs font-medium flex items-center gap-1.5 text-amber-600">
                  <Clock className="h-3.5 w-3.5" />
                  Còn {humanizeDuration(timeLeft)}
                </div>
              )}
              {lastSaved && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <SaveAll className="h-3 w-3" /> Lưu nháp: {formatDateTime(lastSaved)}
                </div>
              )}
              {saving && (
                <div className="text-[11px] text-indigo-600 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Đang lưu…
                </div>
              )}
            </>
          )}
        </CardHeader>
        <CardContent className="pt-0 space-y-1.5">
          {view === "play" && (
            <div className="grid grid-cols-5 lg:grid-cols-3 gap-1.5 py-1">
              {questions.map((qq, i) => {
                const answered = isAnswered(qq, answers);
                const active = i === current;
                return (
                  <button
                    key={qq.id}
                    type="button"
                    onClick={() => setCurrent(i)}
                    className={cn(
                      "h-9 rounded-lg border text-xs font-semibold transition-all",
                      active &&
                        "bg-indigo-600 border-indigo-600 text-white shadow-md",
                      !active && answered &&
                        "bg-emerald-50 border-emerald-300 text-emerald-700",
                      !active && !answered &&
                        "bg-card border-border text-muted-foreground hover:border-indigo-300 hover:text-indigo-400"
                    )}
                    title={QUESTION_TYPE_LABELS[qq.type]}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          )}
          {view === "play" && allowEdit && (
            <div className="pt-3 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setView("review")}
              >
                <Eye className="h-4 w-4 mr-2" /> Xem lại trước khi nộp
              </Button>
              <Button
                size="sm"
                className="w-full"
                onClick={goSubmit}
                disabled={pending || saving}
              >
                {saving || pending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Nộp bài
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main content */}
      <div className="space-y-4">
        {view === "play" && q && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    Câu {current + 1} / {questions.length} —{" "}
                    <span className="font-medium text-foreground">
                      {QUESTION_TYPE_LABELS[q.type]}
                    </span>{" "}
                    · {(q as any).points ?? 1} điểm
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <QuestionRenderer
                  key={q.id}
                  question={q}
                  index={current}
                  mode={allowEdit ? "play" : "review"}
                  answer={answers[q.id]}
                  onAnswer={(val) => onAnswer(q.id, val)}
                />
              </CardContent>
            </Card>
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Câu trước
              </Button>
              <div className="text-xs text-muted-foreground">
                {studentName}
              </div>
              <Button
                onClick={() =>
                  setCurrent((c) => Math.min(questions.length - 1, c + 1))
                }
                disabled={current === questions.length - 1}
              >
                Câu sau <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {view === "review" && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Xem lại bài làm</CardTitle>
                  <div className="text-sm text-muted-foreground mt-1">
                    Kiểm tra kỹ các câu chưa làm trước khi nhấn Nộp. Sau khi nộp bạn sẽ
                    không được sửa lại.
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setView("play")}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Về làm tiếp
                  </Button>
                  <Button onClick={goSubmit} disabled={saving || pending}>
                    {saving || pending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Nộp bài ngay
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-900 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  {answeredCount === questions.length ? (
                    <>Bạn đã hoàn thành tất cả {questions.length} câu.</>
                  ) : (
                    <>
                      Bạn còn{" "}
                      <span className="font-semibold">
                        {questions.length - answeredCount} câu
                      </span>{" "}
                      chưa làm. Bạn có thể nhấn vào từng mục bên dưới để sửa.
                    </>
                  )}
                </div>
              </div>
              <Accordion type="multiple" className="w-full">
                {questions.map((qq, i) => {
                  const answered = isAnswered(qq, answers);
                  return (
                    <AccordionItem
                      key={qq.id}
                      value={qq.id}
                      className="rounded-lg border px-4 mb-2 last:mb-0"
                    >
                      <div className="flex items-center justify-between">
                        <AccordionTrigger className="py-3 hover:no-underline flex-1 min-w-0">
                          <div className="text-left pr-3 min-w-0 w-full">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant={answered ? "success" : "secondary"}
                                className={cn(
                                  answered && "bg-emerald-100 text-emerald-700"
                                )}
                              >
                                Câu {i + 1}
                              </Badge>
                              <Badge variant="outline">
                                {QUESTION_TYPE_LABELS[qq.type]}
                              </Badge>
                              <Badge variant="info">
                                {(qq as any).points ?? 1}đ
                              </Badge>
                              {!answered && (
                                <Badge
                                  variant="destructive"
                                  className="bg-rose-100 text-rose-700"
                                >
                                  Chưa làm
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 text-sm line-clamp-1 text-muted-foreground">
                              {snippet(qq)}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-3 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrent(i);
                            setView("play");
                          }}
                        >
                          Sửa
                        </Button>
                      </div>
                      <AccordionContent className="pb-4">
                        <QuestionRenderer
                          question={qq}
                          index={i}
                          mode={allowEdit ? "play" : "review"}
                          answer={answers[qq.id]}
                          onAnswer={(val) => onAnswer(qq.id, val)}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {view === "results" && (
          <ResultsView
            questions={questions}
            answers={answers}
            submission={submission}
            assignment={assignment}
            showFeedback={
              showFeedback ||
              submission?.status === SubmissionStatus.GRADED
            }
          />
        )}
      </div>

      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận nộp bài?</AlertDialogTitle>
            <AlertDialogDescription>
              Sau khi nộp bạn sẽ không thể sửa bài làm nữa.
              {answeredCount < questions.length && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-amber-900 text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Bạn còn {questions.length - answeredCount} câu chưa hoàn
                    thành — bạn có chắc muốn nộp?
                  </span>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving || pending}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmedSubmit}
              disabled={saving || pending}
            >
              {saving || pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Đang nộp…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" /> Nộp bài
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ResultsView({
  questions,
  answers,
  submission,
  assignment,
  showFeedback,
}: {
  questions: AnyQuestion[];
  answers: Record<string, any>;
  submission: Sub | null;
  assignment: Assn;
  showFeedback: boolean;
}) {
  // Count correct using same logic as auto-grade for display purposes
  const { earned, total, correctCount } = calcScoreDisplay(questions, answers);
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;
  const teacherScore = submission?.score; // teacher-scored out of 10 (by default)
  const feedback = submission?.feedback;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" /> Kết quả bài làm
            </CardTitle>
            <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-3">
              <span>
                Nộp lúc:{" "}
                {submission?.submittedAt
                  ? formatDateTime(submission.submittedAt)
                  : "—"}
              </span>
              {submission?.gradedAt && (
                <span>
                  Chấm lúc: {formatDateTime(submission.gradedAt)}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {teacherScore !== undefined ? (
              <Badge variant="success" className="text-base px-3 py-1.5">
                <Sparkles className="h-4 w-4 mr-1.5" /> Điểm: {teacherScore} / 10
              </Badge>
            ) : (
              <Badge variant="info" className="text-base px-3 py-1.5">
                Tự động: {earned.toFixed(1)} / {total.toFixed(1)} ({pct}%)
              </Badge>
            )}
          </div>
        </div>
        {feedback && (
          <div className="mt-3 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
            <div className="text-xs uppercase tracking-wider text-indigo-600 mb-1 font-semibold">
              Nhận xét của giáo viên
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-indigo-900/90">
              {feedback}
            </div>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <Badge
            variant={correctCount === questions.length ? "success" : "secondary"}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {correctCount}/{questions.length} câu đúng (câu rõ đáp án)
          </Badge>
          <Badge variant="outline">
            {questions.length - correctCount} câu cần xem lại / cần giáo viên chấm
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Accordion type="multiple" className="w-full">
          {questions.map((qq, i) => {
            const per = questionCorrectness(qq, answers[qq.id]);
            return (
              <AccordionItem
                key={qq.id}
                value={qq.id}
                className="rounded-lg border px-4 mb-2 last:mb-0 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <AccordionTrigger className="py-3 hover:no-underline min-w-0 flex-1">
                    <div className="text-left pr-4 min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">Câu {i + 1}</Badge>
                        <Badge variant="outline">
                          {QUESTION_TYPE_LABELS[qq.type]}
                        </Badge>
                        <Badge variant="info">
                          {(qq as any).points ?? 1}đ
                        </Badge>
                        {per.state === "correct" && (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Đúng
                          </Badge>
                        )}
                        {per.state === "incorrect" && (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" /> Sai
                          </Badge>
                        )}
                        {per.state === "partial" && (
                          <Badge variant="warning" className="gap-1">
                            1/2 đúng
                          </Badge>
                        )}
                        {per.state === "open" && (
                          <Badge variant="secondary" className="gap-1">
                            Cần giáo viên chấm
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 text-sm line-clamp-1 text-muted-foreground">
                        {snippet(qq)}
                      </div>
                    </div>
                  </AccordionTrigger>
                </div>
                <AccordionContent className="pb-5">
                  <QuestionRenderer
                    question={qq}
                    index={i}
                    mode="review"
                    showFeedback={showFeedback || per.state === "incorrect"}
                    answer={answers[qq.id]}
                  />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}

// -------- Helpers --------

type CorrState = "correct" | "incorrect" | "partial" | "open" | "unanswered";

function questionCorrectness(q: AnyQuestion, ans: any): {
  state: CorrState;
  earnedRatio: number; // 0..1 (for non-open types)
} {
  if (ans === undefined || ans === null || ans === "" ||
      (Array.isArray(ans) && ans.length === 0) ||
      (typeof ans === "object" && !Array.isArray(ans) && Object.keys(ans).length === 0)) {
    return { state: "unanswered", earnedRatio: 0 };
  }
  switch (q.type) {
    case "mc":
      return {
        state: String(ans) === String(q.correctOptionId) ? "correct" : "incorrect",
        earnedRatio: String(ans) === String(q.correctOptionId) ? 1 : 0,
      };
    case "tf":
      return {
        state: Boolean(ans) === q.correctAnswer ? "correct" : "incorrect",
        earnedRatio: Boolean(ans) === q.correctAnswer ? 1 : 0,
      };
    case "fill": {
      let any = false, all = true;
      for (const b of q.blanks) {
        const given =
          typeof ans === "string" ? ans : (ans as any)?.[b.id];
        if (given === undefined || given === "") {
          all = false;
          continue;
        }
        any = true;
        const val = String(given).toLowerCase().trim();
        const ok = (b.acceptedAnswers || [])
          .map((s) => s.toLowerCase().trim())
          .includes(val);
        if (!ok) all = false;
      }
      if (!any) return { state: "unanswered", earnedRatio: 0 };
      return {
        state: all ? "correct" : "incorrect",
        earnedRatio: all ? 1 : 0,
      };
    }
    case "match": {
      const pairs = q.pairs || [];
      if (!pairs.length) return { state: "unanswered", earnedRatio: 0 };
      let correct = 0;
      pairs.forEach((_, i) => {
        if (String((ans as any)?.[String(i)] ?? -1) === String(i)) correct++;
      });
      if (correct === 0) return { state: "incorrect", earnedRatio: 0 };
      if (correct === pairs.length)
        return { state: "correct", earnedRatio: 1 };
      return { state: "partial", earnedRatio: correct / pairs.length };
    }
    case "order": {
      const arr = Array.isArray(ans) ? ans.map(String) : [];
      const expected = (q.correctOrder || []).map((i) => String(i.id));
      if (!arr.length) return { state: "unanswered", earnedRatio: 0 };
      const ok =
        arr.length === expected.length &&
        arr.every((v, i) => v === expected[i]);
      return {
        state: ok ? "correct" : "incorrect",
        earnedRatio: ok ? 1 : 0,
      };
    }
    case "short":
    case "scenario":
      return { state: "open", earnedRatio: 0 };
    case "flash":
      return { state: "open", earnedRatio: 0 };
    case "quiz": {
      let earned = 0, total = 0;
      for (const sub of q.questions) {
        total += 1;
        const r = questionCorrectness(sub, (ans as any)?.[sub.id]);
        if (r.state === "correct") earned += 1;
        else if (r.state === "partial") earned += 0.5;
      }
      const ratio = total > 0 ? earned / total : 0;
      return {
        state: ratio >= 0.99 ? "correct" : ratio > 0 ? "partial" : "incorrect",
        earnedRatio: ratio,
      };
    }
    default:
      return { state: "unanswered", earnedRatio: 0 };
  }
}

function calcScoreDisplay(questions: AnyQuestion[], answers: Record<string, any>) {
  let earned = 0, total = 0, correctCount = 0;
  for (const q of questions) {
    const pts = (q as any).points ?? 1;
    const r = questionCorrectness(q, answers[q.id]);
    if (r.state === "open" || r.state === "unanswered" && q.type === "short") {
      // Don't include open-ended questions in the total
      continue;
    }
    total += pts;
    earned += r.earnedRatio * pts;
    if (r.state === "correct") correctCount++;
  }
  return { earned, total, correctCount };
}

function isAnswered(q: AnyQuestion, answers: Record<string, any>): boolean {
  const ans = answers[q.id];
  switch (q.type) {
    case "mc":
    case "tf":
      return ans !== undefined && ans !== null && ans !== "";
    case "fill": {
      if (typeof ans === "string") return ans.trim().length > 0;
      if (typeof ans !== "object" || !ans) return false;
      return q.blanks.some(
        (b) => (ans[b.id] ?? "").toString().trim().length > 0
      );
    }
    case "match": {
      if (!ans || typeof ans !== "object") return false;
      return Object.keys(ans).length > 0;
    }
    case "order":
      return Array.isArray(ans) && ans.length > 0;
    case "short":
      return typeof ans === "string" && ans.trim().length > 0;
    case "flash":
      return true; // self-study
    case "scenario":
    case "quiz": {
      const sub = (q.type === "scenario" ? q.subQuestions : q.questions) as
        | AnyQuestion[]
        | undefined;
      if (!sub?.length) return false;
      return sub.some((sq) => isAnswered(sq, (ans as Record<string, any>) || {}));
    }
    default:
      return false;
  }
}

function snippet(q: AnyQuestion): string {
  switch (q.type) {
    case "mc":
    case "tf":
    case "fill":
    case "match":
    case "short":
    case "order":
      return q.question;
    case "flash":
      return q.front;
    case "scenario":
      return `Tình huống: ${q.scenario.slice(0, 120)}${q.scenario.length > 120 ? "…" : ""}`;
    case "quiz":
      return `${q.title} (${q.questions.length} câu con)`;
    default:
      return "";
  }
}

function humanizeDuration(ms: number): string {
  if (!isFinite(ms)) return "—";
  const abs = Math.abs(ms);
  const s = Math.floor(abs / 1000);
  const d = Math.floor(s / (24 * 3600));
  const h = Math.floor((s % (24 * 3600)) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d} ngày`);
  if (h) parts.push(`${h} giờ`);
  if (m) parts.push(`${m} phút`);
  if (parts.length === 0) parts.push("vài giây");
  return parts.join(" ");
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let t: any;
  const out = (...a: any[]) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...a), delay);
  };
  out.cancel = () => t && clearTimeout(t);
  return out as T & { cancel?: () => void };
}
