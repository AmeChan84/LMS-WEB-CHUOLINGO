"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuestionRenderer } from "@/components/questions/renderer";
import { saveAssignment } from "@/lib/server-actions/assignments";
import type { ActionResult } from "@/lib/server-actions/auth";
import type {
  GeneratedAssignment,
  QuestionType,
  AnyQuestion,
} from "@/lib/ai/question-schema";
import { QUESTION_TYPE_LABELS } from "@/lib/ai/question-schema";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Save,
  Send,
  AlertCircle,
  CheckCircle2,
  Wand2,
  FileJson,
  Edit3,
  Trash2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

const toLessonText = (value: unknown) => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(", ");
  if (value == null) return "";
  return JSON.stringify(value);
};

type LessonOption = {
  id: string;
  title: string;
  lessonDate: Date | string;
  description?: string | null;
  topicsCovered?: string | null;
  learningObjectives?: unknown;
  lessonNotes?: string | null;
};

type ClassOption = {
  id: string;
  name: string;
  subject?: string | null;
  level?: string | null;
  lessons: LessonOption[];
};

const schema = z.object({
  classId: z.string().min(1, "Chọn lớp học"),
  lessonId: z.string().optional(),
  lessonTitle: z.string().min(2, "Tên bài học tối thiểu 2 ký tự"),
  lessonDate: z.string().min(1, "Chọn ngày bài học"),
  subject: z.string().min(1, "Môn học không được rỗng"),
  level: z.string().optional(),
  description: z
    .string()
    .min(10, "Vui lòng mô tả chi tiết bài học (ít nhất 10 ký tự)"),
  topicsCovered: z.string().min(2, "Liệt kê chủ đề đã dạy"),
  keyConcepts: z.string().min(2, "Khái niệm trọng tâm bắt buộc"),
  learningObjectives: z.string().optional(),
  lessonNotes: z.string().optional(),
  transcript: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  length: z.enum(["SHORT", "MEDIUM", "LONG"]).default("MEDIUM"),
  questionTypes: z
    .array(z.string())
    .min(1, "Chọn ít nhất 1 dạng câu hỏi"),
  dueDate: z.string().optional(),
  teacherInstructions: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const AVAILABLE_TYPES: QuestionType[] = [
  "mc",
  "tf",
  "fill",
  "match",
  "short",
  "order",
  "flash",
  "scenario",
  "quiz",
];

type GeneratorState = {
  loading: boolean;
  error?: string;
  setupInstructions?: string;
  insufficient?: {
    missing: string[];
    assumptions: string[];
  };
  result?: GeneratedAssignment;
};

export function AiGeneratorClient({
  classes,
  preselectClass,
  preselectLesson,
}: {
  classes: ClassOption[];
  preselectClass?: string;
  preselectLesson?: string;
}) {
  const router = useRouter();
  const [state, setState] = React.useState<GeneratorState>({ loading: false });
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [transitionPending, startTr] = useTransition();
  const [draftJsonStr, setDraftJsonStr] = React.useState<string>("");

  const classMap = React.useMemo(() => {
    const m: Record<string, ClassOption> = {};
    for (const c of classes) m[c.id] = c;
    return m;
  }, [classes]);

  const currentClassId = useWatchDefined(() => form.watch("classId"), "");
  const currentLessonId = useWatchDefined(() => form.watch("lessonId"), "");

  const currentLesson = React.useMemo(() => {
    const c = classMap[currentClassId];
    if (!c || !currentLessonId) return null;
    return c.lessons.find((l) => l.id === currentLessonId) || null;
  }, [currentClassId, currentLessonId, classMap]);

  const defaultDate = new Date();
  defaultDate.setMinutes(
    defaultDate.getMinutes() - defaultDate.getTimezoneOffset()
  );
  const dateStr = defaultDate.toISOString().slice(0, 10);
  const dueDate = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  dueDate.setMinutes(dueDate.getMinutes() - dueDate.getTimezoneOffset());
  const dueDateStr = dueDate.toISOString().slice(0, 10);

  const defaultClass = preselectClass || classes[0]?.id || "";
  const defaultLesson = preselectLesson || "";
  const preLesson = defaultClass
    ? classMap[defaultClass]?.lessons.find((l) => l.id === defaultLesson)
    : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      classId: defaultClass,
      lessonId: defaultLesson,
      lessonTitle: preLesson?.title || "",
      lessonDate: preLesson
        ? new Date(preLesson.lessonDate).toISOString().slice(0, 10)
        : dateStr,
      subject:
        (defaultClass ? classMap[defaultClass]?.subject : "") || "",
      level: defaultClass ? classMap[defaultClass]?.level || "" : "",
      description: preLesson?.description || "",
      topicsCovered: preLesson?.topicsCovered || "",
      keyConcepts: "",
      learningObjectives: toLessonText(preLesson?.learningObjectives),
      lessonNotes: preLesson?.lessonNotes || "",
      transcript: "",
      difficulty: "MEDIUM",
      length: "MEDIUM",
      questionTypes: ["mc", "tf", "fill", "short"],
      dueDate: dueDateStr,
      teacherInstructions: "",
    },
  });

  // Sync lesson values when lessonId changes
  React.useEffect(() => {
    if (!currentLesson) return;
    form.setValue("lessonTitle", currentLesson.title);
    form.setValue(
      "lessonDate",
      new Date(currentLesson.lessonDate).toISOString().slice(0, 10)
    );
    if (currentLesson.description)
      form.setValue("description", currentLesson.description);
    if (currentLesson.topicsCovered)
      form.setValue("topicsCovered", currentLesson.topicsCovered);
    if (currentLesson.learningObjectives)
      form.setValue("learningObjectives", toLessonText(currentLesson.learningObjectives));
    if (currentLesson.lessonNotes)
      form.setValue("lessonNotes", currentLesson.lessonNotes);
    if (classMap[currentClassId]?.subject)
      form.setValue("subject", classMap[currentClassId].subject || "");
    if (classMap[currentClassId]?.level)
      form.setValue("level", classMap[currentClassId].level || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLesson?.id, currentClassId]);

  const submit = (values: FormValues) => {
    startGenerate(values);
  };

  const startGenerate = async (values: FormValues) => {
    setState({ loading: true });
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          classId: values.classId,
          lessonId: values.lessonId || null,
          lessonTitle: values.lessonTitle,
          lessonDate: values.lessonDate,
          subject: values.subject,
          gradeLevel: values.level,
          description: values.description,
          topicsCovered: values.topicsCovered,
          keyConcepts: values.keyConcepts,
          learningObjectives: values.learningObjectives,
          lessonNotes: values.lessonNotes,
          transcript: values.transcript,
          difficulty: values.difficulty,
          length: values.length,
          questionTypes: values.questionTypes,
          teacherInstructions: values.teacherInstructions,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const body = await res.json();
      if (body.error) {
        setState({
          loading: false,
          error: body.error,
          setupInstructions: body.setupInstructions,
        });
        toast.error(body.error || "Lỗi tạo bài tập");
        return;
      }
      if (body.insufficient) {
        setState({
          loading: false,
          insufficient: body.insufficient as GeneratorState["insufficient"],
          result: (body.assignment || undefined) as GeneratedAssignment,
        });
        toast.warning(
          "Thông tin bài học chưa đầy đủ — AI đã đưa ra gợi ý bổ sung"
        );
        return;
      }
      if (body.assignment) {
        setState({ loading: false, result: body.assignment as GeneratedAssignment });
        toast.success("Tạo bài tập thành công! Kiểm tra và xuất bản bên dưới.");
      } else {
        setState({ loading: false, error: "Không có kết quả trả về từ AI" });
      }
    } catch (e: any) {
      setState({ loading: false, error: e?.message || "Lỗi không xác định" });
      toast.error(e?.message || "Lỗi tạo bài tập");
    }
  };

  const regenerateAll = () => {
    const v = form.getValues();
    startGenerate(v);
  };

  const openPublish = () => {
    if (!state.result) return;
    setDraftJsonStr(JSON.stringify(state.result, null, 2));
    setPublishOpen(true);
  };

  const doPublish = (publish: boolean) => {
    if (!state.result) return;
    startTr(async () => {
      const values = form.getValues();
      const fallbackResult: GeneratedAssignment = {
        title: values.lessonTitle || "Bài tập mới",
        instructions:
          values.teacherInstructions || "Làm theo hướng dẫn của từng câu hỏi.",
        totalPoints: 10,
        questions: [],
      };
      // Parse JSON if teacher edited
      let parsed: GeneratedAssignment = state.result ?? fallbackResult;
      try {
        const candidate = JSON.parse(draftJsonStr);
        if (candidate && Array.isArray(candidate.questions)) {
          parsed = candidate;
        }
      } catch (e: any) {
        toast.error("JSON không hợp lệ — hãy kiểm tra lại định dạng.");
        return;
      }
      const res: ActionResult<{ id: string }> = await saveAssignment({
        classId: values.classId,
        lessonId: values.lessonId || undefined,
        title: parsed.title || values.lessonTitle || "Bài tập mới",
        instructions:
          parsed.instructions ||
          values.teacherInstructions ||
          "Làm theo hướng dẫn của từng câu hỏi.",
        totalPoints: parsed.totalPoints || 10,
        dueDate: values.dueDate || undefined,
        status: publish ? "PUBLISHED" : "DRAFT",
        questionsJson: parsed,
      });
      if (res.success) {
        toast.success(res.message);
        setPublishOpen(false);
        router.push(
          publish
            ? `/teacher/assignments/${res.data?.id}`
            : `/teacher/assignments`
        );
      } else {
        toast.error(res.error);
      }
    });
  };

  const removeQuestion = (qid: string) => {
    if (!state.result) return;
    const next: GeneratedAssignment = {
      ...state.result,
      questions: state.result.questions.filter((q) => q.id !== qid),
    };
    setState({ ...state, result: next });
  };

  const canGenerate = !state.loading;

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                  <Wand2 className="h-4 w-4" />
                </span>
                Bước 1 — Chọn lớp & bài học
              </CardTitle>
              <CardDescription>
                Nếu bạn đã tạo bài học trong thư viện, chọn nó để tự động điền thông tin.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lớp học *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn lớp học" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                            {c.subject ? ` · ${c.subject}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lessonId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bài học (tùy chọn)</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v)}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn bài học (điền tự động)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(classMap[currentClassId]?.lessons || []).map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.title} ({formatDate(l.lessonDate)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bước 2 — Thông tin bài học & Nội dung</CardTitle>
              <CardDescription>
                Càng mô tả chi tiết, AI càng tạo ra bài tập sát với nội dung đã dạy.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="lessonTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên bài học *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="VD: Quang hợp ở thực vật" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lessonDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày dạy *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Môn học *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Sinh học, Toán, Tiếng Anh..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Khối / Cấp độ</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="VD: Lớp 10, Đại học năm 2, A1 Beginner..."
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Mô tả chi tiết bài học *</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        {...field}
                        placeholder="Hôm nay chúng ta học về quang hợp, bao gồm diệp lục, ánh sáng mặt trời, CO2, nước và cách thực vật chuyển hóa thành glucose và oxy..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="topicsCovered"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Các chủ đề đã dạy *</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} placeholder="Diệp lục, ánh sáng, CO2, H2O, glucose, oxy, hô hấp tế bào..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="keyConcepts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Khái niệm trọng tâm cần nắm *</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} placeholder="1. Phương trình quang hợp 2. Vai trò diệp lục 3. Sự khác biệt quang hợp / hô hấp..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="learningObjectives"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mục tiêu học tập</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} placeholder="- Học sinh nêu được phương trình quang hợp - Học sinh so sánh được quang hợp và hô hấp..." value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lessonNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ghi chú bài giảng / Slide nội dung</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} className="font-mono text-xs" placeholder="Dán nội dung slide, giáo án bài giảng..." value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="transcript"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Transcript Zoom (tùy chọn)</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} className="font-mono text-xs" placeholder="Dán phụ đề bài giảng Zoom để AI phân tích chi tiết hơn..." value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bước 3 — Cấu hình bài tập</CardTitle>
              <CardDescription>
                Chọn độ khó, độ dài và các dạng câu hỏi mong muốn.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-3">
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Độ khó</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EASY">Dễ</SelectItem>
                        <SelectItem value="MEDIUM">Trung bình</SelectItem>
                        <SelectItem value="HARD">Khó</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="length"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Độ dài bài tập</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SHORT">Ngắn (~5 câu)</SelectItem>
                        <SelectItem value="MEDIUM">Vừa (~10 câu)</SelectItem>
                        <SelectItem value="LONG">Dài (~20 câu)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hạn nộp (tùy chọn)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="questionTypes"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Dạng câu hỏi *</FormLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {AVAILABLE_TYPES.map((t) => {
                        const checked = field.value.includes(t);
                        return (
                          <label
                            key={t}
                            className={cn(
                              "flex items-start gap-2 rounded-xl border p-3 cursor-pointer transition-all",
                              checked
                                ? "border-indigo-400 bg-indigo-50/50"
                                : "hover:border-indigo-200"
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                const next = v
                                  ? [...field.value, t]
                                  : field.value.filter((x) => x !== t);
                                field.onChange(next);
                              }}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold">
                                {QUESTION_TYPE_LABELS[t]}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="teacherInstructions"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Yêu cầu riêng cho AI (tùy chọn)</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        {...field}
                        placeholder="VD: Tạo thêm câu đố vui, nhấn mạnh vào công thức tính, đề cập các ví dụ trong sách giáo khoa trang 25..."
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      AI chỉ dựa vào thông tin bạn cung cấp — không cố tình phát minh kiến thức
                      không được nêu trong bài học.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="sticky bottom-4 z-20 flex justify-end items-center gap-3 rounded-xl border bg-background/90 backdrop-blur p-3 shadow-md">
            <Button
              type="submit"
              disabled={!canGenerate}
              variant="ai"
              size="lg"
              className="min-w-[240px]"
            >
              {state.loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang phân tích & tạo bài tập…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Tạo bài tập với AI
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* State sections */}
      {state.loading && <GenerationLoading />}
      {!state.loading && state.error && <GenerationError state={state} />}
      {!state.loading && state.insufficient && !state.result && (
        <InsufficientWarning info={state.insufficient} />
      )}
      {!state.loading && state.result && (
        <Card className="border-indigo-200">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <Badge variant="success">Đã tạo xong</Badge>
                  <Badge variant="outline">
                    {state.result.questions.length} câu ·{" "}
                    {state.result.totalPoints} điểm
                  </Badge>
                  {state.insufficient && (
                    <Badge variant="warning">
                      <AlertCircle className="h-3 w-3 mr-1" /> Có giả định từ AI
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl">
                  {state.result.title}
                </CardTitle>
                {state.result.estimatedMinutes && (
                  <CardDescription>
                    Ước tính hoàn thành trong khoảng{" "}
                    {state.result.estimatedMinutes} phút
                  </CardDescription>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={regenerateAll}>
                  <RefreshCw className="h-4 w-4 mr-1.5" /> Tạo lại toàn bộ
                </Button>
                <Button onClick={openPublish}>
                  <Send className="h-4 w-4 mr-1.5" /> Xuất bản / Lưu nháp
                </Button>
              </div>
            </div>
            {state.insufficient && (
              <InsufficientWarning info={state.insufficient} compact />
            )}
            <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 text-sm text-indigo-900 whitespace-pre-wrap">
              <span className="font-semibold mr-2">Hướng dẫn:</span>
              {state.result.instructions}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-indigo-500" /> Xem trước câu hỏi — có thể chỉnh sửa JSON bên dưới
              </div>
            </div>

            <Accordion type="multiple" className="w-full">
              {state.result.questions.map((q, i) => (
                <AccordionItem key={q.id} value={q.id} className="rounded-lg border px-4 mb-2 last:mb-0 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <AccordionTrigger className="py-4 hover:no-underline">
                        <div className="text-left pr-4 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                              Câu {i + 1}
                            </Badge>
                            <Badge variant="outline">
                              {QUESTION_TYPE_LABELS[q.type] || q.type}
                            </Badge>
                            <Badge variant="info">
                              {"points" in q ? (q.points ?? 1) : 1} điểm
                            </Badge>
                          </div>
                          <div className="mt-1 text-sm font-medium truncate max-w-2xl">
                            {snippetForQuestion(q)}
                          </div>
                        </div>
                      </AccordionTrigger>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        onClick={() => removeQuestion(q.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <AccordionContent className="pb-5 space-y-4">
                    <QuestionRenderer
                      question={q}
                      index={i}
                      mode="review"
                      showFeedback
                      answer={exampleAnswerFor(q)}
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <Card className="border-amber-200 bg-amber-50/40">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileJson className="h-4 w-4" /> JSON cấu trúc bài tập (chỉnh sửa nâng cao)
                </CardTitle>
                <CardDescription>
                  Bạn có thể chỉnh sửa trực tiếp nội dung JSON bên dưới (sửa câu hỏi, đáp án, giải thích).
                  Khi xuất bản, hệ thống sẽ lưu đúng cấu trúc này.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={16}
                  className="font-mono text-xs"
                  value={draftJsonStr || JSON.stringify(state.result, null, 2)}
                  onChange={(e) => setDraftJsonStr(e.target.value)}
                />
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lưu bài tập</DialogTitle>
            <DialogDescription>
              Lưu thành bản nháp để chỉnh sửa sau, hoặc xuất bản để học sinh thấy bài tập ngay.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-1 text-muted-foreground">
            <div>
              <span className="font-medium">Lớp:</span>{" "}
              {classMap[form.getValues("classId")]?.name || "—"}
            </div>
            <div>
              <span className="font-medium">Hạn nộp:</span>{" "}
              {form.getValues("dueDate") || "Không có"}
            </div>
            <div>
              <span className="font-medium">Số câu:</span>{" "}
              {state.result?.questions.length || 0} ·{" "}
              <span className="font-medium">Tổng điểm:</span>{" "}
              {state.result?.totalPoints || 0}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => doPublish(false)} disabled={transitionPending}>
              {transitionPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Lưu nháp
            </Button>
            <Button onClick={() => doPublish(true)} disabled={transitionPending}>
              {transitionPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Xuất bản cho học sinh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GenerationLoading() {
  return (
    <Card className="border-dashed border-indigo-300 bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50">
      <CardContent className="py-14 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xl">
          <Sparkles className="h-7 w-7 animate-pulse" />
        </div>
        <div>
          <div className="font-semibold text-lg">
            Đang phân tích bài học và tạo hoạt động tương tác…
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            AI đang: phân tích nội dung → xác định khái niệm trọng tâm → sinh câu hỏi đa dạng
            → tạo đáp án & giải thích → kiểm tra định dạng JSON.
          </p>
        </div>
        <div className="grid gap-3 max-w-md mx-auto pt-2">
          <Skeleton className="h-4 w-5/6 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/6 mx-auto" />
          <Skeleton className="h-4 w-11/12 mx-auto" />
          <Skeleton className="h-4 w-2/3 mx-auto" />
        </div>
        <div className="text-xs text-muted-foreground pt-3">
          Thường hoàn thành trong khoảng 10 – 30 giây.
        </div>
      </CardContent>
    </Card>
  );
}

function GenerationError({ state }: { state: GeneratorState }) {
  return (
    <Card className="border-rose-300 bg-rose-50/60">
      <CardContent className="py-6 space-y-2">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-rose-900">
              Không thể tạo bài tập AI
            </div>
            <p className="text-sm text-rose-800 mt-1">{state.error}</p>
            {state.setupInstructions && (
              <pre className="mt-3 text-xs rounded-lg border bg-white/70 p-3 whitespace-pre-wrap break-words font-mono text-rose-900">
                {state.setupInstructions}
              </pre>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsufficientWarning({
  info,
  compact = false,
}: {
  info: NonNullable<GeneratorState["insufficient"]>;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50",
        compact ? "p-3" : "p-5"
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 text-sm text-amber-900 space-y-2">
          <div className="font-semibold">
            Thông tin bạn cung cấp chưa đủ chi tiết để AI tạo bài tập chính xác
          </div>
          <ul className="list-disc list-inside space-y-1">
            {info.missing.map((m) => (
              <li key={m}>Thiếu: <span className="font-medium">{m}</span></li>
            ))}
          </ul>
          {info.assumptions.length > 0 && (
            <>
              <div className="font-medium pt-1">AI đã đưa ra các giả định sau:</div>
              <ul className="list-disc list-inside space-y-1 text-amber-800/90">
                {info.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </>
          )}
          <div className="text-xs text-amber-800/80 pt-1">
            Để bài tập chính xác hơn, hãy bổ sung các thông tin trên ở form và tạo lại.
          </div>
        </div>
      </div>
    </div>
  );
}

function snippetForQuestion(q: AnyQuestion): string {
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
      return "Câu hỏi";
  }
}

function exampleAnswerFor(q: AnyQuestion): any {
  switch (q.type) {
    case "mc":
      return q.correctOptionId;
    case "tf":
      return q.correctAnswer;
    case "fill": {
      if (q.blanks.length === 1) return q.blanks[0].acceptedAnswers?.[0] || "";
      const out: Record<string, string> = {};
      for (const b of q.blanks) out[b.id] = b.acceptedAnswers?.[0] || "";
      return out;
    }
    case "match": {
      const out: Record<string, string> = {};
      q.pairs?.forEach((_, i) => (out[String(i)] = String(i)));
      return out;
    }
    case "short":
      return "— Học sinh sẽ viết câu trả lời ở đây —";
    case "order":
      return q.correctOrder.map((i) => i.id);
    default:
      return undefined;
  }
}

function useWatchDefined<T>(getter: () => T, fallback: T): T {
  const [v, setV] = React.useState<T>(fallback);
  React.useEffect(() => {
    setV(getter());
  });
  return v;
}
