"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { gradeSubmission } from "@/lib/server-actions/assignments";
import type { ActionResult } from "@/lib/server-actions/auth";
import type { GeneratedAssignment, AnyQuestion } from "@/lib/ai/question-schema";
import { QUESTION_TYPE_LABELS } from "@/lib/ai/question-schema";
import { QuestionRenderer } from "@/components/questions/renderer";
import { SubmissionStatus } from "@prisma/client";
import { Edit3, Loader2 } from "lucide-react";

const schema = z.object({
  score: z.coerce
    .number()
    .min(0, "Điểm tối thiểu 0")
    .max(1000, "Điểm quá cao"),
  feedback: z.string().max(5000, "Nhận xét quá dài").optional(),
});

export function AssignmentSubmissionReviewClient({
  submissionId,
  studentName,
  status,
  initialScore,
  initialFeedback,
  answersJson,
  questionsJson,
  totalPoints,
}: {
  submissionId: string;
  studentName: string;
  status: SubmissionStatus;
  initialScore?: number;
  initialFeedback?: string;
  answersJson: Record<string, any> | null;
  questionsJson: GeneratedAssignment | null;
  totalPoints: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTr] = useTransition();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      score: initialScore ?? 0,
      feedback: initialFeedback ?? "",
    },
  });

  React.useEffect(() => {
    form.reset({
      score: initialScore ?? 0,
      feedback: initialFeedback ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialScore, initialFeedback]);

  const submit = (values: z.infer<typeof schema>) => {
    startTr(async () => {
      const res: ActionResult = await gradeSubmission(submissionId, values);
      if (res.success) {
        toast.success(res.message || "Đã lưu điểm");
        setOpen(false);
      } else {
        toast.error(res.error || "Lỗi lưu điểm");
      }
    });
  };

  return (
    <>
      <Button
        variant={status === SubmissionStatus.GRADED ? "outline" : "default"}
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Edit3 className="h-3.5 w-3.5 mr-1.5" />
        {status === SubmissionStatus.IN_PROGRESS
          ? "Xem nháp"
          : status === SubmissionStatus.SUBMITTED
            ? "Chấm"
            : "Sửa điểm"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {studentName} — Chấm & nhận xét bài nộp
            </DialogTitle>
            <DialogDescription>
              Xem câu trả lời chi tiết của học sinh, nhập điểm và để lại lời nhắc nhở.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-6 my-2 pr-1">
            {!questionsJson ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground text-center">
                Bài tập gốc không có dữ liệu câu hỏi (null questionsJson)
              </div>
            ) : !answersJson ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground text-center">
                Học sinh chưa trả lời câu nào (answersJson rỗng)
              </div>
            ) : (
              <Accordion type="multiple" className="w-full">
                {questionsJson.questions.map((q: AnyQuestion, i: number) => {
                  const ans = answersJson[q.id];
                  return (
                    <AccordionItem
                      key={q.id}
                      value={q.id}
                      className="rounded-lg border px-4 mb-2 last:mb-0 overflow-hidden"
                      defaultValue={i === 0 ? q.id : undefined}
                    >
                      <div className="flex items-center justify-between">
                        <AccordionTrigger className="py-3 hover:no-underline">
                          <div className="text-left pr-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">Câu {i + 1}</Badge>
                              <Badge variant="outline">
                                {QUESTION_TYPE_LABELS[q.type] || q.type}
                              </Badge>
                              <Badge variant="info">
                                {"points" in q ? (q.points ?? 1) : 1} điểm
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                      </div>
                      <AccordionContent className="pb-4 space-y-3">
                        <div className="rounded-xl border bg-muted/30 p-4">
                          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                            Câu trả lời của học sinh
                          </div>
                          <AnswerDisplay q={q} answer={ans} />
                        </div>
                        <QuestionRenderer
                          question={q}
                          index={i}
                          mode="review"
                          showFeedback
                          answer={ans}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}

            <div className="grid gap-4 md:grid-cols-2 pt-2 border-t">
              <Form {...form}>
                <form
                  id={`grade-${submissionId}`}
                  onSubmit={form.handleSubmit(submit)}
                  className="contents"
                >
                  <FormField
                    control={form.control}
                    name="score"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Điểm (tổng {totalPoints})
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="feedback"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nhận xét giáo viên</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={4}
                            {...field}
                            placeholder="Nhận xét chi tiết, góp ý cho học sinh..."
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form={`grade-${submissionId}`}
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Đang lưu
                </>
              ) : (
                <>Lưu điểm & nhận xét</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AnswerDisplay({
  q,
  answer,
}: {
  q: AnyQuestion;
  answer: any;
}) {
  if (answer === undefined || answer === null || answer === "") {
    return (
      <span className="text-sm text-muted-foreground italic">
        (Học sinh không trả lời)
      </span>
    );
  }
  const pretty = (v: any): React.ReactNode => {
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (Array.isArray(v))
      return (
        <ol className="list-decimal list-inside space-y-1 text-sm">
          {v.map((x, i) => (
            <li key={i}>{typeof x === "object" ? JSON.stringify(x) : String(x)}</li>
          ))}
        </ol>
      );
    if (typeof v === "object") {
      const entries = Object.entries(v);
      if (entries.length === 0)
        return <span className="italic text-muted-foreground">(trống)</span>;
      return (
        <ul className="text-sm space-y-1">
          {entries.map(([k, val]) => (
            <li key={k}>
              <span className="font-medium">{k}:</span> {pretty(val as any)}
            </li>
          ))}
        </ul>
      );
    }
    return JSON.stringify(v);
  };
  return <div className="text-sm leading-relaxed whitespace-pre-wrap">{pretty(answer)}</div>;
}
