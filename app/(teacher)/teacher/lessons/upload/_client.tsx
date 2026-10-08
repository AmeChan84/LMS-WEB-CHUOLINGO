"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { FileUploader, type UploadedFile } from "@/components/file-uploader";
import { createLesson } from "@/lib/server-actions/lessons";
import type { ActionResult } from "@/lib/server-actions/auth";
import { ArrowLeft, Loader2, Upload, Sparkles } from "lucide-react";
import Link from "next/link";

const schema = z.object({
  classId: z.string().min(1, "Vui lòng chọn lớp học"),
  title: z.string().min(2, "Tiêu đề tối thiểu 2 ký tự"),
  lessonDate: z.string().min(1, "Vui lòng chọn ngày"),
  description: z.string().max(2000, "Mô tả tối đa 2000 ký tự").optional(),
  lessonNotes: z.string().max(10000, "Ghi chú tối đa 10000 ký tự").optional(),
  learningObjectives: z.string().max(5000).optional(),
  topicsCovered: z.string().max(5000).optional(),
});

type FormValues = z.infer<typeof schema>;

type ClassOption = { id: string; name: string; subject?: string | null; coverImageUrl?: string | null };

export function LessonUploadClient({ classes }: { classes: ClassOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploaded, setUploaded] = React.useState<UploadedFile[]>([]);

  const defaultDate = new Date();
  defaultDate.setMinutes(defaultDate.getMinutes() - defaultDate.getTimezoneOffset());
  const dateStr = defaultDate.toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      classId: classes[0]?.id || "",
      title: "",
      lessonDate: dateStr,
      description: "",
      lessonNotes: "",
      learningObjectives: "",
      topicsCovered: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const res: ActionResult<{ id: string }> = await createLesson({
        ...values,
        files: uploaded.map((u) => ({
          fileName: u.fileName,
          fileType: u.fileType,
          fileSize: u.fileSize,
          storagePath: u.storagePath,
          bucket: u.bucket,
          isVideo: u.isVideo,
        })),
      });
      if (res.success) {
        toast.success(res.message || "Đã tạo bài học");
        router.push(`/teacher/lessons/${res.data?.id}`);
      } else {
        toast.error(res.error || "Tạo bài học thất bại");
      }
    });
  };

  const canSubmit = !isPending && (uploaded.length > 0 || form.watch("title").length > 1);

  return (
    <div className="space-y-5">
      <Button asChild variant="outline" size="sm" className="back-navigation w-fit">
        <Link href="/teacher/lessons">
          <ArrowLeft className="h-4 w-4" /> Về thư viện
        </Link>
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin bài học</CardTitle>
              <CardDescription>
                Nhập thông tin cơ bản và mô tả nội dung đã dạy.
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
                      disabled={classes.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn lớp" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}{" "}
                            {c.subject ? `(${c.subject})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {classes.length === 0 && (
                      <FormDescription>
                        Bạn chưa có lớp.{" "}
                        <Link
                          href="/teacher/classes/create"
                          className="underline text-primary"
                        >
                          Tạo lớp học trước
                        </Link>
                        .
                      </FormDescription>
                    )}
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
                name="title"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Tiêu đề bài học *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Bài 5 — Quang hợp ở thực vật"
                        {...field}
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
                    <FormLabel>Mô tả bài học</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Tóm tắt ngắn gọn nội dung bài học..."
                        {...field}
                        value={field.value ?? ""}
                      />
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
                      <Textarea
                        rows={4}
                        placeholder="- Học sinh hiểu được vai trò của diệp lục..."
                        {...field}
                        value={field.value ?? ""}
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
                    <FormLabel>Các chủ đề đã dạy</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Diệp lục, ánh sáng mặt trời, CO2, nước, glucose, oxy..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lessonNotes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>
                      Ghi chú bài giảng (sẽ dùng AI để tạo bài tập)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={6}
                        placeholder="Dán nội dung bài giảng chi tiết, transcript Zoom hoặc tài liệu tham khảo..."
                        className="font-mono text-xs"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                      Chi tiết hơn → AI tạo bài tập chính xác hơn.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" /> Tệp bài học & Video ghi hình
              </CardTitle>
              <CardDescription>
                Tải video Zoom (MP4/WebM/MOV lên đến 2GB), tài liệu PDF, PPT,
                DOC, hình ảnh — các tệp sẽ được lưu vào Supabase Storage riêng tư.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="text-sm font-medium mb-2">Video ghi hình</div>
                <FileUploader
                  purpose="lesson_video"
                  multiple
                  onUploaded={(files) =>
                    setUploaded((u) => [...u, ...files])
                  }
                />
              </div>
              <SeparatorThin />
              <div>
                <div className="text-sm font-medium mb-2">Tài liệu học tập</div>
                <FileUploader
                  purpose="lesson_material"
                  multiple
                  onUploaded={(files) =>
                    setUploaded((u) => [...u, ...files])
                  }
                />
              </div>
              {uploaded.length > 0 && (
                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                  Đã tải lên thành công {uploaded.length} tệp:{" "}
                  <span className="font-medium">
                    {uploaded.filter((f) => f.isVideo).length} video ·{" "}
                    {uploaded.filter((f) => !f.isVideo).length} tài liệu
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="sticky bottom-4 z-20 flex justify-end gap-2 rounded-xl border bg-background/90 backdrop-blur p-3 shadow-md">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => router.back()}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="min-w-[180px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...
                </>
              ) : (
                <>Lưu bài học</>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function SeparatorThin() {
  return <div className="h-px bg-border w-full" />;
}
