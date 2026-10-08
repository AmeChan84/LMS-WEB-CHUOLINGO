"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  RotateCcw,
  Sparkles,
  BookOpen,
  RotateCw,
} from "lucide-react";
import type {
  AnyQuestion,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  FillInBlankQuestion,
  MatchingQuestion,
  ShortAnswerQuestion,
  OrderingQuestion,
  Flashcard,
  ScenarioQuestion,
  MiniQuizQuestion,
} from "@/lib/ai/question-schema";
import { QUESTION_TYPE_LABELS } from "@/lib/ai/question-schema";

type Mode = "play" | "review";

export type QuestionRendererProps = {
  question: AnyQuestion;
  index?: number;
  mode: Mode;
  /** The student's answer value for this question id */
  answer?: any;
  /** Fires when answer changes (play mode). */
  onAnswer?: (value: any) => void;
  /** Whether to reveal correct/incorrect + explanations (review mode). */
  showFeedback?: boolean;
};

/**
 * A polymorphic renderer for all 9 question types. Keeps the API minimal
 * so it can be reused in the student player, assignment preview editor,
 * and teacher submission review.
 */
export function QuestionRenderer(props: QuestionRendererProps) {
  const { question, index, mode, answer, onAnswer, showFeedback } = props;
  const questionPoints = "points" in question ? question.points ?? 1 : 1;

  const header = (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {typeof index === "number" && (
        <Badge variant="outline" className="font-semibold">
          Câu {index + 1}
        </Badge>
      )}
      <Badge variant="secondary">{QUESTION_TYPE_LABELS[question.type]}</Badge>
      <Badge variant="outline" className="ml-auto">
        {questionPoints} điểm
      </Badge>
    </div>
  );

  let body: React.ReactNode = null;

  switch (question.type) {
    case "mc":
      body = (
        <McBody
          q={question}
          mode={mode}
          answer={answer}
          onAnswer={onAnswer}
          showFeedback={showFeedback}
        />
      );
      break;
    case "tf":
      body = (
        <TfBody
          q={question}
          mode={mode}
          answer={answer}
          onAnswer={onAnswer}
          showFeedback={showFeedback}
        />
      );
      break;
    case "fill":
      body = (
        <FillBody
          q={question}
          mode={mode}
          answer={answer}
          onAnswer={onAnswer}
          showFeedback={showFeedback}
        />
      );
      break;
    case "match":
      body = (
        <MatchBody
          q={question}
          mode={mode}
          answer={answer}
          onAnswer={onAnswer}
          showFeedback={showFeedback}
        />
      );
      break;
    case "short":
      body = (
        <ShortBody
          q={question}
          mode={mode}
          answer={answer}
          onAnswer={onAnswer}
        />
      );
      break;
    case "order":
      body = (
        <OrderBody
          q={question}
          mode={mode}
          answer={answer}
          onAnswer={onAnswer}
          showFeedback={showFeedback}
        />
      );
      break;
    case "flash":
      body = <FlashBody q={question} />;
      break;
    case "scenario":
      body = (
        <ScenarioBody
          q={question}
          mode={mode}
          answer={answer}
          onAnswer={onAnswer}
          showFeedback={showFeedback}
        />
      );
      break;
    case "quiz":
      body = (
        <MiniQuizBody
          q={question}
          mode={mode}
          answer={answer}
          onAnswer={onAnswer}
          showFeedback={showFeedback}
        />
      );
      break;
    default:
      body = (
        <div className="text-sm text-muted-foreground">
          Loại câu hỏi chưa được hỗ trợ.
        </div>
      );
  }

  return (
    <div className="space-y-3">
      {header}
      {body}
    </div>
  );
}

// -------- Individual type bodies --------

function ExplanationBlock({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 text-indigo-600 flex-shrink-0" />
        <div>
          <div className="text-sm font-semibold text-indigo-900">
            Giải thích
          </div>
          <div className="mt-1 text-sm text-indigo-800/90 whitespace-pre-wrap">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultBadge({ correct }: { correct: boolean }) {
  return correct ? (
    <Badge variant="success" className="gap-1">
      <CheckCircle2 className="h-3 w-3" /> Chính xác
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1">
      <AlertCircle className="h-3 w-3" /> Chưa chính xác
    </Badge>
  );
}

// -------- Multiple Choice --------

function McBody({
  q,
  mode,
  answer,
  onAnswer,
  showFeedback,
}: {
  q: MultipleChoiceQuestion;
  mode: Mode;
  answer?: any;
  onAnswer?: (v: any) => void;
  showFeedback?: boolean;
}) {
  const value = answer ? String(answer) : undefined;
  const correct = q.correctOptionId;

  const isCorrect = !!showFeedback && value === correct;
  const isWrong = !!showFeedback && !!value && value !== correct;

  return (
    <div className="space-y-4">
      <p className="text-base font-medium leading-relaxed">{q.question}</p>
      <RadioGroup
        value={value}
        onValueChange={mode === "play" ? onAnswer : undefined}
        disabled={mode === "review"}
        className="space-y-2"
      >
        {q.options.map((o, i) => {
          const isSel = value === o.id;
          const isCorr = o.id === correct;
          const state =
            showFeedback && isCorr
              ? "border-emerald-400 bg-emerald-50"
              : showFeedback && isSel && !isCorr
                ? "border-rose-400 bg-rose-50"
                : isSel
                  ? "border-indigo-400 bg-indigo-50/60"
                  : "";
          return (
            <label
              key={o.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 transition-all cursor-pointer",
                state,
                mode === "play"
                  ? "hover:border-indigo-300 hover:bg-muted/40"
                  : "cursor-default"
              )}
            >
              <RadioGroupItem
                id={`mc-${q.id}-${o.id}`}
                value={o.id}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <span className="text-sm">{o.text}</span>
                </div>
                {showFeedback && isCorr && (
                  <div className="mt-1 text-xs text-emerald-700">
                    Đáp án đúng
                  </div>
                )}
                {showFeedback && isSel && !isCorr && (
                  <div className="mt-1 text-xs text-rose-700">
                    Phương án bạn chọn
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </RadioGroup>
      {showFeedback && value && (
        <div className="flex items-center gap-3">
          <ResultBadge correct={isCorrect} />
        </div>
      )}
      {showFeedback && <ExplanationBlock text={q.explanation} />}
    </div>
  );
}

// -------- True / False --------

function TfBody({
  q,
  mode,
  answer,
  onAnswer,
  showFeedback,
}: {
  q: TrueFalseQuestion;
  mode: Mode;
  answer?: any;
  onAnswer?: (v: any) => void;
  showFeedback?: boolean;
}) {
  const val = answer === "true" ? true : answer === "false" ? false : answer;
  const boolVal = typeof val === "boolean" ? val : undefined;
  const correct = q.correctAnswer;
  const isCorrect = !!showFeedback && boolVal === correct;
  const isWrong = !!showFeedback && boolVal !== undefined && boolVal !== correct;

  const choose = (b: boolean) => {
    if (mode !== "play") return;
    onAnswer?.(b);
  };

  return (
    <div className="space-y-4">
      <p className="text-base font-medium leading-relaxed">{q.question}</p>
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <Button
          type="button"
          variant={boolVal === true ? "default" : "outline"}
          onClick={() => choose(true)}
          disabled={mode === "review"}
          className={cn(
            showFeedback && correct === true && "border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
            showFeedback && boolVal === true && correct !== true && "border-rose-400 bg-rose-50 text-rose-700 hover:bg-rose-100"
          )}
        >
          <CheckCircle2 className="h-4 w-4 mr-1.5" /> Đúng
        </Button>
        <Button
          type="button"
          variant={boolVal === false ? "default" : "outline"}
          onClick={() => choose(false)}
          disabled={mode === "review"}
          className={cn(
            showFeedback && correct === false && "border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
            showFeedback && boolVal === false && correct !== false && "border-rose-400 bg-rose-50 text-rose-700 hover:bg-rose-100"
          )}
        >
          <AlertCircle className="h-4 w-4 mr-1.5" /> Sai
        </Button>
      </div>
      {showFeedback && boolVal !== undefined && <ResultBadge correct={isCorrect} />}
      {showFeedback && <ExplanationBlock text={q.explanation} />}
      void isWrong;
    </div>
  );
}

// -------- Fill in the blanks --------

function FillBody({
  q,
  mode,
  answer,
  onAnswer,
  showFeedback,
}: {
  q: FillInBlankQuestion;
  mode: Mode;
  answer?: any;
  onAnswer?: (v: any) => void;
  showFeedback?: boolean;
}) {
  // For single-blank we allow string value; for multi-blank we use Record<blankId, string>
  const singleBlank = q.blanks.length === 1;

  const answers: Record<string, string> = React.useMemo(() => {
    if (answer == null) return {};
    if (typeof answer === "string") {
      const first = q.blanks[0];
      return first ? { [first.id]: answer } : {};
    }
    if (typeof answer === "object") return answer as Record<string, string>;
    return {};
  }, [answer, q.blanks]);

  const setBlank = (blankId: string, value: string) => {
    if (mode !== "play") return;
    if (singleBlank) {
      onAnswer?.(value);
    } else {
      onAnswer?.({ ...answers, [blankId]: value });
    }
  };

  // Split the question by "____" placeholders; if none, list blanks separately
  const parts = q.question.split(/_{3,}/);
  const renderInline = parts.length - 1 === q.blanks.length;

  let allCorrect = true;
  let anyAnswered = false;
  for (const b of q.blanks) {
    const val = (answers[b.id] ?? "").trim().toLowerCase();
    const expected = (b.acceptedAnswers || []).map((s) =>
      s.trim().toLowerCase()
    );
    if (val) {
      anyAnswered = true;
      if (!expected.includes(val)) allCorrect = false;
    } else {
      allCorrect = false;
    }
  }

  return (
    <div className="space-y-4">
      {renderInline ? (
        <p className="text-base font-medium leading-loose">
          {parts.map((part, i) => {
            const blank = q.blanks[i];
            return (
              <React.Fragment key={i}>
                <span>{part}</span>
                {blank && (
                  <span className="mx-1 inline-block align-middle">
                    <Input
                      value={answers[blank.id] ?? ""}
                      onChange={(e) => setBlank(blank.id, e.target.value)}
                      disabled={mode === "review"}
                      className={cn(
                        "inline-block w-auto min-w-[120px] max-w-[260px] h-8 text-center",
                        showFeedback &&
                          (answers[blank.id] ?? "") !== "" &&
                          (blank.acceptedAnswers || []).map((s) => s.toLowerCase()).includes(
                            (answers[blank.id] || "").toLowerCase().trim()
                          )
                          ? "border-emerald-400 bg-emerald-50"
                          : showFeedback && (answers[blank.id] ?? "") !== ""
                            ? "border-rose-400 bg-rose-50"
                            : ""
                      )}
                      placeholder="…"
                    />
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </p>
      ) : (
        <>
          <p className="text-base font-medium leading-relaxed">{q.question}</p>
          <div className="space-y-3">
            {q.blanks.map((b, i) => (
              <div key={b.id} className="grid gap-2">
                <Label className="text-sm">
                  Chỗ trống {i + 1}
                  {showFeedback && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (Đáp án chấp nhận: {(b.acceptedAnswers || []).join(", ")})
                    </span>
                  )}
                </Label>
                <Input
                  value={answers[b.id] ?? ""}
                  onChange={(e) => setBlank(b.id, e.target.value)}
                  disabled={mode === "review"}
                  placeholder="Nhập từ cần điền"
                  className={cn(
                    showFeedback &&
                      (answers[b.id] ?? "") !== "" &&
                      (b.acceptedAnswers || [])
                        .map((s) => s.toLowerCase())
                        .includes((answers[b.id] || "").toLowerCase().trim())
                      ? "border-emerald-400 bg-emerald-50"
                      : showFeedback && (answers[b.id] ?? "") !== ""
                        ? "border-rose-400 bg-rose-50"
                        : ""
                  )}
                />
              </div>
            ))}
          </div>
        </>
      )}
      {showFeedback && anyAnswered && <ResultBadge correct={allCorrect} />}
      {showFeedback && <ExplanationBlock text={q.explanation} />}
    </div>
  );
}

// -------- Matching --------

function MatchBody({
  q,
  mode,
  answer,
  onAnswer,
  showFeedback,
}: {
  q: MatchingQuestion;
  mode: Mode;
  answer?: any;
  onAnswer?: (v: any) => void;
  showFeedback?: boolean;
}) {
  const pairs = q.pairs || [];
  const rightItems = React.useMemo(() => pairs.map((p) => p.right), [pairs]);
  // Shuffle right side display order for play mode
  const [shuffled, setShuffled] = React.useState<number[]>([]);
  React.useEffect(() => {
    const idx = pairs.map((_, i) => i);
    if (mode === "play") {
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
    }
    setShuffled(idx);
  }, [pairs.length, mode]);

  const map: Record<string, string> =
    typeof answer === "object" && answer ? answer : {};

  const set = (leftIdx: number, rightIdx: string | null) => {
    if (mode !== "play") return;
    const next = { ...map };
    if (rightIdx == null) delete next[String(leftIdx)];
    else next[String(leftIdx)] = String(rightIdx);
    onAnswer?.(next);
  };

  const anyAnswered = Object.keys(map).length > 0;
  let pairCorrect = 0;
  if (showFeedback) {
    for (let i = 0; i < pairs.length; i++) {
      if (String(map[String(i)] ?? -1) === String(i)) pairCorrect++;
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-base font-medium leading-relaxed">{q.question}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground tracking-wider">Cột A</Label>
          {pairs.map((p, i) => {
            const chosen = map[String(i)];
            const pairOk = showFeedback && chosen === String(i);
            const pairBad = showFeedback && chosen && chosen !== String(i);
            return (
              <div
                key={i}
                className={cn(
                  "rounded-xl border bg-card p-3",
                  pairOk && "border-emerald-400 bg-emerald-50",
                  pairBad && "border-rose-400 bg-rose-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-muted text-xs font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm flex-1">{p.left}</span>
                  <Select
                    value={chosen ?? ""}
                    onValueChange={(v) => set(i, v || null)}
                    disabled={mode === "review"}
                  >
                    <SelectTrigger className="w-[140px] sm:w-[180px]">
                      <SelectValue placeholder="Ghép…" />
                    </SelectTrigger>
                    <SelectContent>
                      {shuffled.map((origIdx) => (
                        <SelectItem
                          key={origIdx}
                          value={String(origIdx)}
                        >
                          {String.fromCharCode(65 + origIdx)}.{" "}
                          {rightItems[origIdx]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground tracking-wider">Cột B</Label>
          {shuffled.map((origIdx, dispIdx) => (
            <div
              key={origIdx}
              className="rounded-xl border bg-muted/40 p-3"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center">
                  {String.fromCharCode(65 + dispIdx)}
                </span>
                <span className="text-sm flex-1">{rightItems[origIdx]}</span>
                {showFeedback && (
                  <Badge variant="outline" className="text-[10px]">
                    Đáp án đúng: A{origIdx + 1}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {showFeedback && anyAnswered && (
        <div className="flex items-center gap-3">
          <ResultBadge correct={pairCorrect === pairs.length && pairs.length > 0} />
          <span className="text-sm text-muted-foreground">
            {pairCorrect}/{pairs.length} cặp ghép đúng
          </span>
        </div>
      )}
      {showFeedback && <ExplanationBlock text={q.explanation} />}
    </div>
  );
}

// -------- Short Answer --------

function ShortBody({
  q,
  mode,
  answer,
  onAnswer,
}: {
  q: ShortAnswerQuestion;
  mode: Mode;
  answer?: any;
  onAnswer?: (v: any) => void;
}) {
  const val = typeof answer === "string" ? answer : "";
  return (
    <div className="space-y-4">
      <p className="text-base font-medium leading-relaxed">{q.question}</p>
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-xs text-amber-800">
        <span className="font-semibold">Rubric: </span>
        <span>{q.rubric}</span>
      </div>
      <Textarea
        value={val}
        onChange={(e) => mode === "play" && onAnswer?.(e.target.value)}
        disabled={mode === "review"}
        placeholder="Viết câu trả lời của bạn ở đây…"
        rows={6}
        className="resize-y"
      />
    </div>
  );
}

// -------- Ordering / Sequencing --------

function OrderBody({
  q,
  mode,
  answer,
  onAnswer,
  showFeedback,
}: {
  q: OrderingQuestion;
  mode: Mode;
  answer?: any;
  onAnswer?: (v: any) => void;
  showFeedback?: boolean;
}) {
  const correct = q.correctOrder || [];
  // Current displayed order = answer (list of ids)
  const orderIds: string[] = React.useMemo(() => {
    if (Array.isArray(answer) && answer.length === correct.length) return answer;
    // Shuffle default
    const ids = correct.map((c) => c.id);
    if (mode === "play") {
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
    }
    return ids;
  }, [answer, correct, mode]);

  const [localOrder, setLocalOrder] = React.useState<string[]>(orderIds);
  React.useEffect(() => setLocalOrder(orderIds), [orderIds]);

  const itemsById = React.useMemo(() => {
    const m: Record<string, { id: string; text: string }> = {};
    for (const c of correct) m[c.id] = c;
    return m;
  }, [correct]);

  const move = (from: number, to: number) => {
    if (mode !== "play") return;
    if (to < 0 || to >= localOrder.length) return;
    const next = [...localOrder];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    setLocalOrder(next);
    onAnswer?.(next);
  };

  const reset = () => {
    if (mode !== "play") return;
    const ids = correct.map((c) => c.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setLocalOrder(ids);
    onAnswer?.(ids);
  };

  const isCorrect =
    !!showFeedback &&
    localOrder.length === correct.length &&
    localOrder.every((v, i) => v === correct[i].id);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-base font-medium leading-relaxed flex-1">{q.question}</p>
        {mode === "play" && (
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Xáo trộn
          </Button>
        )}
      </div>
      <ol className="space-y-2">
        {localOrder.map((id, i) => {
          const ok = showFeedback && id === correct[i]?.id;
          const bad = showFeedback && id !== correct[i]?.id;
          return (
            <li
              key={id}
              className={cn(
                "flex items-center gap-2 rounded-xl border bg-card p-3",
                ok && "border-emerald-400 bg-emerald-50",
                bad && "border-rose-400 bg-rose-50"
              )}
            >
              <span className="flex flex-col flex-shrink-0 w-7 h-12 items-center justify-center gap-0.5">
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={mode === "review" || i === 0}
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-40"
                  aria-label="Lên"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={mode === "review" || i === localOrder.length - 1}
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-40"
                  aria-label="Xuống"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </span>
              <GripVertical className="h-5 w-5 text-muted-foreground" />
              <span className="w-7 h-7 rounded-md bg-indigo-100 text-indigo-700 text-sm font-semibold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-sm flex-1">{itemsById[id]?.text}</span>
              {showFeedback && (
                <Badge variant="outline" className="text-[10px]">
                  Vị trí đúng: {correct.findIndex((c) => c.id === id) + 1}
                </Badge>
              )}
            </li>
          );
        })}
      </ol>
      {showFeedback && <ResultBadge correct={isCorrect} />}
      {showFeedback && <ExplanationBlock text={q.explanation} />}
    </div>
  );
}

// -------- Flashcards --------

function FlashBody({ q }: { q: Flashcard }) {
  const [flipped, setFlipped] = React.useState(false);
  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <BookOpen className="h-3.5 w-3.5" /> Thẻ ghi nhớ — nhấp để lật
      </div>
      <div
        className="group perspective-1000 h-64 cursor-pointer"
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          className={cn(
            "relative h-full w-full transition-transform duration-500",
            "[transform-style:preserve-3d]",
            flipped && "[transform:rotateY(180deg)]"
          )}
        >
          <div className="[backface-visibility:hidden] absolute inset-0 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-6 flex flex-col items-center justify-center text-center">
            <div className="text-xs uppercase tracking-wider text-indigo-600 mb-3">
              Mặt trước
            </div>
            <div className="text-xl font-semibold text-indigo-950">
              {q.front}
            </div>
            <div className="mt-auto text-xs text-muted-foreground">
              Nhấp để xem đáp án
            </div>
          </div>
          <div className="[backface-visibility:hidden] [transform:rotateY(180deg)] absolute inset-0 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 flex flex-col items-center justify-center text-center">
            <div className="text-xs uppercase tracking-wider text-violet-600 mb-3">
              Mặt sau
            </div>
            <div className="text-xl font-semibold text-violet-950">
              {q.back}
            </div>
            <div className="mt-auto text-xs text-muted-foreground">
              Nhấp để quay lại
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------- Scenario-based --------

function ScenarioBody({
  q,
  mode,
  answer,
  onAnswer,
  showFeedback,
}: {
  q: ScenarioQuestion;
  mode: Mode;
  answer?: any;
  onAnswer?: (v: any) => void;
  showFeedback?: boolean;
}) {
  const subAns = typeof answer === "object" && answer ? answer : {};
  const setSub = (id: string, value: any) => {
    if (mode !== "play") return;
    onAnswer?.({ ...subAns, [id]: value });
  };
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-gradient-to-br from-slate-50 to-muted p-5">
        <div className="text-xs uppercase tracking-wider text-slate-600 mb-2">
          Tình huống
        </div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {q.scenario}
        </div>
      </div>
      <div className="space-y-5 pl-3 border-l-2 border-muted">
        {q.subQuestions.map((sub, i) => (
          <QuestionRenderer
            key={sub.id}
            question={sub as AnyQuestion}
            index={i}
            mode={mode}
            answer={subAns[sub.id]}
            onAnswer={(val) => setSub(sub.id, val)}
            showFeedback={showFeedback}
          />
        ))}
      </div>
    </div>
  );
}

// -------- Mini-quiz --------

function MiniQuizBody({
  q,
  mode,
  answer,
  onAnswer,
  showFeedback,
}: {
  q: MiniQuizQuestion;
  mode: Mode;
  answer?: any;
  onAnswer?: (v: any) => void;
  showFeedback?: boolean;
}) {
  const subAns = typeof answer === "object" && answer ? answer : {};
  const setSub = (id: string, value: any) => {
    if (mode !== "play") return;
    onAnswer?.({ ...subAns, [id]: value });
  };
  return (
    <Card className="border-violet-200 bg-violet-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <RotateCw className="h-4 w-4 text-violet-600" />
          <span className="text-sm font-semibold text-violet-800">
            Mini kiểm tra
          </span>
        </div>
        <div className="text-base font-semibold">{q.title}</div>
      </CardHeader>
      <CardContent className="space-y-5">
        {q.questions.map((sub, i) => (
          <QuestionRenderer
            key={sub.id}
            question={sub as AnyQuestion}
            index={i}
            mode={mode}
            answer={subAns[sub.id]}
            onAnswer={(val) => setSub(sub.id, val)}
            showFeedback={showFeedback}
          />
        ))}
      </CardContent>
    </Card>
  );
}
