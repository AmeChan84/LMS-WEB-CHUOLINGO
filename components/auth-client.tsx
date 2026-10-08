"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  GraduationCap,
  BookOpen,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loginUser, registerUser } from "@/lib/server-actions/auth";

const formSchema = z.object({
  name: z.string().min(2, "Tên tối thiểu 2 ký tự").optional(),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
  role: z.enum(["TEACHER", "STUDENT"]),
});

type Mode = "login" | "register";

export default function AuthPageClient({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleFromUrl = searchParams.get("role");
  const [mode, setMode] = useState<Mode>(
    roleFromUrl === "TEACHER" || roleFromUrl === "STUDENT" ? "register" : initialMode
  );
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: (searchParams.get("role") as any) || (initialMode === "register" ? "STUDENT" : "STUDENT"),
    },
    mode: "onChange",
  });

  useEffect(() => {
    const roleFromURL = searchParams.get("role");
    if (roleFromURL === "TEACHER" || roleFromURL === "STUDENT") {
      form.setValue("role", roleFromURL);
      setMode("register");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modeIsRegister = mode === "register";
  const role = form.watch("role");

  function onSubmit(values: z.infer<typeof formSchema>) {
    setError(null);
    startTransition(async () => {
      try {
        let result;
        if (modeIsRegister) {
          if (!values.name) {
            setError("Vui lòng nhập họ và tên");
            return;
          }
          result = await registerUser({
            ...values,
            name: values.name ?? "",
          });
        } else {
          result = await loginUser({ email: values.email, password: values.password });
        }
        if (!result.success) {
          setError(result.error);
          if (result.fieldErrors) {
            Object.entries(result.fieldErrors).forEach(([k, v]) => {
              form.setError(k as any, { message: v });
            });
          }
          return;
        }
        toast.success(result.message || (modeIsRegister ? "Đăng ký thành công!" : "Đăng nhập thành công!"));
        const r = result.data as any;
        const finalRole = modeIsRegister ? values.role : r?.role || role;
        router.replace(finalRole === "TEACHER" ? "/teacher/dashboard" : "/student/dashboard");
      } catch (e: any) {
        setError(e?.message || "Có lỗi xảy ra, vui lòng thử lại sau.");
      }
    });
  }

  return (
    <Card className="card-shadow border-border/70">
      <CardHeader className="space-y-1">
        <div className="mb-1">
          <Badge variant={modeIsRegister ? "ai" : "secondary"}>
            {modeIsRegister ? "Tạo tài khoản mới" : "Đăng nhập"}
          </Badge>
        </div>
        <CardTitle className="text-2xl tracking-tight">
          {modeIsRegister
            ? "Chào mừng bạn đến với Chuolingo LMS"
            : "Đăng nhập tài khoản"}
        </CardTitle>
        <CardDescription>
          {modeIsRegister
            ? "Tạo tài khoản để bắt đầu quản lý lớp hoặc tham gia học tập."
            : "Nhập email và mật khẩu để tiếp tục."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {modeIsRegister && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={role === "TEACHER" ? "default" : "outline"}
              onClick={() => form.setValue("role", "TEACHER")}
              className="h-auto py-4 flex-col gap-2"
            >
              <GraduationCap className="h-5 w-5" />
              <div className="text-sm font-semibold">Giáo viên</div>
              <div className="text-[11px] opacity-80 font-normal">
                Tạo lớp & bài tập
              </div>
            </Button>
            <Button
              type="button"
              variant={role === "STUDENT" ? "default" : "outline"}
              onClick={() => form.setValue("role", "STUDENT")}
              className="h-auto py-4 flex-col gap-2"
            >
              <BookOpen className="h-5 w-5" />
              <div className="text-sm font-semibold">Học sinh</div>
              <div className="text-[11px] opacity-80 font-normal">
                Tham gia lớp học
              </div>
            </Button>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {modeIsRegister && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Họ và tên</FormLabel>
                    <FormControl>
                      <Input placeholder="Nguyễn Văn A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@school.edu.vn"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete={modeIsRegister ? "new-password" : "current-password"}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:bg-muted"
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between pt-2 text-sm">
              {mode === "login" && (
                <Link
                  href="/reset-password"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Quên mật khẩu?
                </Link>
              )}
              {modeIsRegister ? (
                <Link
                  href="/login"
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  onClick={() => setMode("login")}
                >
                  Đã có tài khoản? Đăng nhập
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  onClick={() => setMode("register")}
                >
                  Chưa có tài khoản? Đăng ký
                </Link>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {modeIsRegister ? "Đang tạo tài khoản..." : "Đang đăng nhập..."}
                </>
              ) : (
                <>
                  {modeIsRegister ? "Tạo tài khoản" : "Đăng nhập"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </Form>

        <div className="pt-1">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                hoặc dùng thử
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
              <div className="font-semibold">Giáo viên</div>
              <div className="text-muted-foreground mt-0.5">
                teacher@demo.com / Demo123456
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
              <div className="font-semibold">Học sinh</div>
              <div className="text-muted-foreground mt-0.5">
                student@demo.com / Demo123456
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
