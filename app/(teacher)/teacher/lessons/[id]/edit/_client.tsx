"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateLesson } from "@/lib/server-actions/lessons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";

type Lesson = {
  id: string; classId: string; className: string; title: string; description: string | null;
  lessonDate: string; lessonNotes: string | null; learningObjectives: string | null; topicsCovered: string | null;
};

export function LessonEditClient({ lesson }: { lesson: Lesson }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState({
    title: lesson.title,
    description: lesson.description ?? "",
    lessonDate: lesson.lessonDate,
    lessonNotes: lesson.lessonNotes ?? "",
    learningObjectives: lesson.learningObjectives ?? "",
    topicsCovered: lesson.topicsCovered ?? "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await updateLesson(lesson.id, { classId: lesson.classId, ...form });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message || "Đã lưu bài học");
      router.push(`/teacher/lessons/${lesson.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="outline" size="sm" className="back-navigation">
        <Link href={`/teacher/lessons/${lesson.id}`}><ArrowLeft className="mr-1.5 h-4 w-4" /> Quay lại bài học</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Chỉnh sửa bài học</CardTitle>
          <CardDescription>{lesson.className} · cập nhật nội dung và thông tin bài giảng.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Tiêu đề bài học</label>
                <Input value={form.title} onChange={(e) => update("title", e.target.value)} required minLength={2} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ngày dạy</label>
                <Input type="date" value={form.lessonDate} onChange={(e) => update("lessonDate", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Chủ đề</label>
                <Input value={form.topicsCovered} onChange={(e) => update("topicsCovered", e.target.value)} placeholder="Ví dụ: Quang hợp, diệp lục..." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Mô tả bài học</label>
                <Textarea rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mục tiêu học tập</label>
                <Textarea rows={6} value={form.learningObjectives} onChange={(e) => update("learningObjectives", e.target.value)} placeholder="Mỗi mục tiêu trên một dòng" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ghi chú bài học</label>
                <Textarea rows={6} value={form.lessonNotes} onChange={(e) => update("lessonNotes", e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-5">
              <Button asChild type="button" variant="outline"><Link href={`/teacher/lessons/${lesson.id}`}>Hủy</Link></Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Lưu thay đổi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
