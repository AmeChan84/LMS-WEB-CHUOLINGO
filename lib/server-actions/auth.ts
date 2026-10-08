"use server"

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient, getServiceRoleClient } from "@/lib/supabase/server";
import type { UserRole } from "@prisma/client";

export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

function requireConfiguredAuthEnvironment(action: "login" | "register") {
  const dbUrl = process.env.DATABASE_URL?.trim() || "";
  const hasDb =
    /^postgres(ql)?:\/\//i.test(dbUrl) &&
    !/your_project|your_password|\[your-password\]/i.test(dbUrl);

  if (!hasDb) {
    return {
      success: false as const,
      error:
        "DATABASE_URL chưa được cấu hình đầy đủ. Hãy thay [YOUR-PASSWORD] bằng mật khẩu database trong Supabase, lưu .env.local, rồi khởi động lại ứng dụng.",
    };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (
    action === "register" &&
    USE_SUPABASE_AUTH &&
    (!serviceRoleKey || serviceRoleKey === "your_supabase_service_role_key")
  ) {
    return {
      success: false as const,
      error:
        "Đăng ký cần Supabase secret/service-role key. Lấy key trong Supabase Dashboard → Project Settings → API Keys và đặt vào SUPABASE_SERVICE_ROLE_KEY trong .env.local. Không chia sẻ key này.",
    };
  }

  return null;
}

const registerSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự")
    .regex(/[A-Za-z]/, "Mật khẩu phải chứa chữ")
    .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 số"),
  role: z.enum(["TEACHER", "STUDENT"]),
});

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

/**
 * Creates the user row in our local Postgres via Prisma.
 * In this implementation we use a dual strategy:
 *   1. Try to sign up with Supabase Auth. If Supabase is not configured
 *      (missing env vars / keys), fall back to pure Prisma + bcrypt auth
 *      for local development / demos.
 *   2. Sync role into a cookie so middleware can gate routes cheaply without DB calls.
 */
async function syncLocalProfile({
  supabaseUserId,
  email,
  name,
  role,
  passwordHash,
}: {
  supabaseUserId?: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash?: string;
}) {
  return prisma.user.upsert({
    where: { email },
    create: {
      supabaseUserId,
      email,
      name,
      role,
      passwordHash,
    },
    update: {
      name,
      role,
      ...(supabaseUserId ? { supabaseUserId } : {}),
      ...(passwordHash ? { passwordHash } : {}),
    },
  });
}

async function setRoleCookie(role: UserRole) {
  const c = await cookies();
  c.set("lms_role", role, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

const USE_SUPABASE_AUTH =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your_project_ref.supabase.co" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your_supabase_anon_key";

export async function registerUser(
  raw: z.infer<typeof registerSchema>
): Promise<ActionResult> {
  const envCheck = requireConfiguredAuthEnvironment("register");
  if (envCheck) return envCheck;

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.error.flatten().fieldErrors)) {
      fieldErrors[k] = (v as string[])[0] || "Invalid";
    }
    return { success: false, error: "Vui lòng kiểm tra lại thông tin", fieldErrors };
  }
  const { name, email, password, role } = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    if (USE_SUPABASE_AUTH) {
      const supabaseAdmin = getServiceRoleClient();
      // sign up with Supabase Admin (bypasses email confirm in dev)
      const { data: sbData, error: sbErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role },
      });
      if (sbErr) {
        if (sbErr.message.toLowerCase().includes("already registered")) {
          return { success: false, error: "Email này đã được đăng ký." };
        }
        return { success: false, error: sbErr.message };
      }
      if (!sbData.user) return { success: false, error: "Không thể tạo tài khoản" };

      await syncLocalProfile({
        supabaseUserId: sbData.user.id,
        email,
        name,
        role,
        passwordHash,
      });
      const sessionClient = await createClient();
      const { error: sessionError } = await sessionClient.auth.signInWithPassword({
        email,
        password,
      });
      if (sessionError) {
        return { success: false, error: "Tài khoản đã tạo nhưng không thể tạo phiên đăng nhập." };
      }
    } else {
      // Fallback local prisma auth
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return { success: false, error: "Email này đã được đăng ký." };
      await syncLocalProfile({ email, name, role, passwordHash });
    }

    await setRoleCookie(role);

    return {
      success: true,
      message: role === "TEACHER" ? "Tạo tài khoản giáo viên thành công!" : "Tạo tài khoản học sinh thành công!",
    };
  } catch (e: any) {
    return { success: false, error: e?.message || "Lỗi không xác định" };
  }
}

export async function loginUser(raw: z.infer<typeof loginSchema>): Promise<ActionResult<{ role: UserRole }>> {
  const envCheck = requireConfiguredAuthEnvironment("login");
  if (envCheck) return envCheck;

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.error.flatten().fieldErrors)) {
      fieldErrors[k] = (v as string[])[0] || "Invalid";
    }
    return { success: false, error: "Thông tin đăng nhập không hợp lệ", fieldErrors };
  }
  const { email, password } = parsed.data;

  try {
    let localUser;

    if (USE_SUPABASE_AUTH) {
      const sb = await createClient();
      let { data, error } = await sb.auth.signInWithPassword({ email, password });

      if (error || !data.user) {
        const legacyUser = await prisma.user.findUnique({ where: { email } });
        if (
          !legacyUser?.passwordHash ||
          !(await bcrypt.compare(password, legacyUser.passwordHash))
        ) {
          return { success: false, error: "Email hoặc mật khẩu không đúng." };
        }

        const { data: created, error: createError } =
          await getServiceRoleClient().auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name: legacyUser.name, role: legacyUser.role },
          });
        if (createError || !created.user) {
          return {
            success: false,
            error:
              createError?.message ||
              "Không thể liên kết tài khoản hiện có với Supabase Auth.",
          };
        }

        await prisma.user.update({
          where: { id: legacyUser.id },
          data: { supabaseUserId: created.user.id },
        });
        ({ data, error } = await sb.auth.signInWithPassword({ email, password }));
      }

      if (error || !data.user) {
        return {
          success: false,
          error: "Không thể tạo phiên đăng nhập Supabase. Hãy thử lại.",
        };
      }

      localUser = await prisma.user.findUnique({
        where: { supabaseUserId: data.user.id },
      });
      if (!localUser && data.user.email) {
        localUser = await prisma.user.findUnique({
          where: { email: data.user.email },
        });
        if (localUser && localUser.supabaseUserId !== data.user.id) {
          localUser = await prisma.user.update({
            where: { id: localUser.id },
            data: { supabaseUserId: data.user.id },
          });
        }
      }

      if (!localUser) {
        const role = data.user.user_metadata?.role;
        if (role !== "TEACHER" && role !== "STUDENT") {
          return {
            success: false,
            error:
              "Đăng nhập Supabase thành công nhưng tài khoản chưa được liên kết với hồ sơ LMS. Hãy đăng ký qua ứng dụng hoặc nhờ quản trị viên thiết lập vai trò.",
          };
        }
        const profileEmail = data.user.email ?? email;
        const metadataName = data.user.user_metadata?.name;
        const name =
          typeof metadataName === "string" && metadataName.trim()
            ? metadataName.trim()
            : profileEmail.split("@")[0];
        localUser = await syncLocalProfile({
          supabaseUserId: data.user.id,
          email: profileEmail,
          name,
          role,
        });
      }
    } else {
      localUser = await prisma.user.findUnique({ where: { email } });
      if (!localUser) {
        return { success: false, error: "Email hoặc mật khẩu không đúng." };
      }
      if (!localUser.passwordHash) {
        return { success: false, error: "Tài khoản này không hỗ trợ đăng nhập mật khẩu" };
      }
      const ok = await bcrypt.compare(password, localUser.passwordHash);
      if (!ok) return { success: false, error: "Email hoặc mật khẩu không đúng." };
      // Set a simple session cookie in fallback mode.
      const c = await cookies();
      c.set("lms_user_id", localUser.id, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    await setRoleCookie(localUser.role);

    return {
      success: true,
      data: { role: localUser.role },
      message: "Đăng nhập thành công",
    };
  } catch (e: any) {
    return { success: false, error: e?.message || "Lỗi không xác định" };
  }
}

export async function logoutUser(): Promise<ActionResult> {
  try {
    if (USE_SUPABASE_AUTH) {
      const sb = await createClient();
      await sb.auth.signOut().catch(() => {});
    }
    const c = await cookies();
    c.delete("lms_role");
    c.delete("lms_user_id");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "Lỗi" };
  }
}

export async function getCurrentUser() {
  try {
    let email: string | undefined;
    let supabaseUserId: string | undefined;

    if (USE_SUPABASE_AUTH) {
      const sb = await createClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return null;
      email = user.email ?? undefined;
      supabaseUserId = user.id;
    } else {
      const c = await cookies();
      const uid = c.get("lms_user_id")?.value;
      if (!uid) return null;
      return prisma.user.findUnique({ where: { id: uid } });
    }

    if (!email && !supabaseUserId) return null;
    const where = supabaseUserId
      ? { supabaseUserId }
      : { email: email! };
    const user = await prisma.user.findUnique({ where });
    if (!user && email) {
      // Sync in case of race
      return prisma.user.findUnique({ where: { email } });
    }
    return user;
  } catch {
    return null;
  }
}

export async function requireRole(role: UserRole) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) {
    redirect(user.role === "TEACHER" ? "/teacher/dashboard" : "/student/dashboard");
  }
  return user;
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới tối thiểu 8 ký tự")
      .regex(/[A-Za-z]/, "Mật khẩu phải chứa chữ")
      .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 số"),
    confirmPassword: z.string().min(8, "Vui lòng xác nhận mật khẩu mới"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export async function changePassword(raw: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Chưa đăng nhập" };

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.error.flatten().fieldErrors)) {
      fieldErrors[k] = (v as string[])[0] || "Invalid";
    }
    return { success: false, error: "Vui lòng kiểm tra lại thông tin", fieldErrors };
  }

  if (USE_SUPABASE_AUTH) {
    return {
      success: false,
      error:
        "Đăng nhập đang dùng Supabase Auth. Vui lòng đổi mật khẩu qua trang Reset Password hoặc Supabase dashboard.",
    };
  }

  try {
    if (!user.passwordHash) {
      return { success: false, error: "Tài khoản này không hỗ trợ đổi mật khẩu cục bộ" };
    }
    const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!ok) {
      return {
        success: false,
        error: "Mật khẩu hiện tại không đúng",
        fieldErrors: { currentPassword: "Mật khẩu hiện tại không đúng" },
      };
    }
    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    return { success: true, message: "Đổi mật khẩu thành công" };
  } catch (e: any) {
    return { success: false, error: e?.message || "Lỗi không xác định" };
  }
}

export async function isSupabaseAuthEnabled() {
  return USE_SUPABASE_AUTH;
}
