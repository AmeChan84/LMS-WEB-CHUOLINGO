"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, KeyRound, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { joinClassByCode } from "@/lib/server-actions/classes";

const formSchema = z.object({
  code: z
    .string()
    .min(4, "Mã quá ngắn")
    .max(12)
    .regex(/^[A-Za-z0-9]+$/, "Mã chỉ chứa chữ và số"),
});

export default function JoinClassPage() {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setError(null);
    start(async () => {
      const r = await joinClassByCode(values);
      if (!r.success) {
        setError(r.error);
        return;
      }
      toast.success(r.message);
      router.push(`/student/classes/${r.data?.classId}`);
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">
          <Link href="/student/dashboard" className="hover:underline">
            Dashboard
          </Link>{" "}
          / Tham gia lớp học
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Tham gia lớp học
        </h1>
        <p className="mt-1 text-muted-foreground">
          Nhập mã tham gia được giáo viên cung cấp. Mã thường 6 ký tự, ví dụ:{" "}
          <span className="font-mono font-semibold">A3K9XM</span>.
        </p>
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <KeyRound className="h-5.5 w-5.5" style={{ height: "1.375rem", width: "1.375rem" }} />
            </div>
            <div>
              <CardTitle>Nhập mã lớp</CardTitle>
              <CardDescription>
                Yêu cầu mã tham gia từ giáo viên của bạn.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã tham gia lớp</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ví dụ: A3K9XM"
                        autoCapitalize="characters"
                        className="h-14 rounded-xl text-center text-2xl font-mono font-bold tracking-[0.5em] ai-gradient-text"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Tham gia lớp học
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-border/70 bg-muted/40 p-5 text-sm">
        <div className="font-semibold">💡 Lưu ý</div>
        <ul className="mt-2 list-disc ml-5 space-y-1 text-muted-foreground">
          <li>Mã lớp phân biệt hoa thường — nên nhập IN HOA như được cung cấp.</li>
          <li>Nếu bạn không có mã, hãy liên hệ giáo viên để nhận.</li>
          <li>Một học sinh có thể tham gia nhiều lớp học khác nhau.</li>
        </ul>
      </div>
    </div>
  );
}
