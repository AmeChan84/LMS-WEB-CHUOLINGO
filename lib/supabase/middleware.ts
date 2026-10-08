import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authRoutes = ["/login", "/register", "/reset-password", "/"];
  const isAuthRoute = authRoutes.some(
    (r) => pathname === r || (r !== "/" && pathname.startsWith(r + "/"))
  );
  const protectedPrefixes = ["/teacher", "/student", "/onboarding"];
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  const role = request.cookies.get("lms_role")?.value;

  const hasSupabaseConfig =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your_project_ref.supabase.co" &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your_supabase_anon_key";

  // Local development/demo mode: use the signed role/session cookies created by
  // the Prisma+bcrypt fallback auth flow instead of constructing a Supabase client
  // with placeholder environment variables.
  if (!hasSupabaseConfig) {
    const hasLocalSession = !!request.cookies.get("lms_user_id")?.value;

    if (hasLocalSession && isAuthRoute) {
      if (role === "TEACHER") {
        return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
      }
      if (role === "STUDENT") {
        return NextResponse.redirect(new URL("/student/dashboard", request.url));
      }
    }

    if (!hasLocalSession && isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/teacher") && role === "STUDENT") {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
    if (pathname.startsWith("/student") && role === "TEACHER") {
      return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
    }

    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options as CookieOptions);
            request.cookies.set(name, value);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    if (isAuthRoute) {
      if (role === "TEACHER") {
        return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
      }
      if (role === "STUDENT") {
        return NextResponse.redirect(new URL("/student/dashboard", request.url));
      }
    }
  } else if (isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/teacher") && role && role !== "TEACHER") {
    return NextResponse.redirect(new URL("/student/dashboard", request.url));
  }
  if (pathname.startsWith("/student") && role && role !== "STUDENT") {
    return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
  }

  return response;
}
