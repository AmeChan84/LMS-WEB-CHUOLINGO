"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClass } from "@/lib/server-actions/classes";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  name: z.string().min(2, "Tên lớp tối thiểu 2 ký tự"),
  subject: z.string().min(2, "Môn học tối thiểu 2 ký tự"),
  level: z.string().optional(),
  description: z.string().optional(),
  coverImageUrl: z.string().optional(),
});

export default function CreateClassPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      subject: "",
      level: "",
      description: "",
      coverImageUrl: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setError(null);
    startTransition(async () => {
      const r = await createClass(values);
      if (!r.success) {
        setError(r.error);
        return;
      }
      toast.success(
        `Lớp "${values.name}" đã được tạo. Mã tham gia: ${r.data?.joinCode}`
      );
      router.push(`/teacher/classes/${r.data?.id}`);
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-sm text-muted-foreground">
            <Link href="/teacher/classes" className="hover:underline">
              My Classes
            </Link>{" "}
            / Tạo lớp mới
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Tạo lớp học mới
          </h1>
          <p className="mt-1 text-muted-foreground">
            Điền thông tin lớp học — một mã tham gia duy nhất sẽ được tạo để học sinh tham gia.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/teacher/classes">Quay lại</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin lớp học</CardTitle>
          <CardDescription>
            Bạn có thể chỉnh sửa lại các thông tin này sau.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên lớp *</FormLabel>
                      <FormControl>
                        <Input placeholder="Sinh học 10" {...field} />
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
                        <Input placeholder="Sinh học" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Cấp độ / Lớp</FormLabel>
                      <FormControl>
                        <Input placeholder="Lớp 10 / Cơ bản / Nâng cao" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả lớp học</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Giới thiệu ngắn gọn về môn học, chương trình học, cách đánh giá..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="coverImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL ảnh bìa (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-between pt-2">
                <Badge variant="outline">
                  Mã tham gia sẽ được tạo tự động sau khi lưu
                </Badge>
                <Button type="submit" size="lg" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tạo lớp...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4" />
                      Tạo lớp học
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
