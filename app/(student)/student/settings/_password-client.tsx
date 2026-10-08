"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Loader2, Lock } from "lucide-react";
import { changePassword } from "@/lib/server-actions/auth";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string()
      .min(8, "Tối thiểu 8 ký tự")
      .regex(/[A-Za-z]/, "Phải chứa chữ")
      .regex(/[0-9]/, "Phải chứa ít nhất 1 số"),
    confirmPassword: z.string().min(8, "Vui lòng xác nhận"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type FormVal = z.infer<typeof schema>;

export function SettingsPasswordForm({
  supabaseEnabled,
  userId,
}: {
  supabaseEnabled: boolean;
  userId: string;
}) {
  const [pending, startTrans] = useTransition();

  const form = useForm<FormVal>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = (data: FormVal) => {
    startTrans(async () => {
      const res = await changePassword(data);
      if (res.success) {
        toast.success(res.message || "Đổi mật khẩu thành công");
        form.reset();
      } else {
        toast.error(res.error || "Không đổi được mật khẩu");
        if (res.fieldErrors) {
          Object.entries(res.fieldErrors).forEach(([k, v]) => {
            form.setError(k as keyof FormVal, { message: v });
          });
        }
      }
    });
  };

  if (supabaseEnabled) {
    return (
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Sử dụng Supabase Auth</AlertTitle>
          <AlertDescription className="text-sm mt-1 text-muted-foreground">
            Hệ thống đang dùng Supabase để đăng nhập. Đổi mật khẩu vui lòng dùng tính năng{" "}
            <a
              href="/reset-password"
              className="font-medium text-indigo-600 hover:underline"
            >
              Quên mật khẩu
            </a>
            .
          </AlertDescription>
        </Alert>
        <p className="text-xs text-muted-foreground break-all">
          User ID: <code>{userId}</code>
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu hiện tại</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" className="pl-9" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu mới</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" className="pl-9" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Xác nhận mật khẩu mới</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" className="pl-9" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={pending}
          >
            Đặt lại
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              "Đổi mật khẩu"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
