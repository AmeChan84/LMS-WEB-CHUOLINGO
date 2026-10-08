import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_MODEL, buildPrompt, getOpenAI, type AIGenerateInput } from "@/lib/ai/prompt";
import { generatedAssignmentSchema } from "@/lib/ai/question-schema";
import { getCurrentUser } from "@/lib/server-actions/auth";

const inputSchema = z.object({
  lessonInfo: z.object({
    title: z.string().min(1),
    subject: z.string().optional(),
    level: z.string().optional(),
    date: z.string().optional(),
    description: z.string().min(1),
    topics: z.string().optional(),
    keyConcepts: z.string().optional(),
    objectives: z.array(z.string()).optional(),
  }),
  aiSettings: z.object({
    difficulty: z.enum(["Easy", "Medium", "Hard"]),
    length: z.enum(["Short", "Medium", "Long"]),
    questionTypes: z
      .array(z.enum(["mc", "tf", "fill", "match", "short", "order", "flash", "scenario"]))
      .min(1),
    teacherInstructions: z.string().optional(),
  }),
  context: z
    .object({
      notes: z.string().optional(),
      transcript: z.string().optional(),
      documentSummary: z.string().optional(),
    })
    .optional(),
});

// In-memory per-IP/user rate limiter (10 req/min)
const rateLimitMap = new Map<string, { count: number; reset: number }>();

function checkRateLimit(key: string) {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.reset < now) {
    rateLimitMap.set(key, { count: 1, reset: now + 60 * 1000 });
    return { ok: true };
  }
  entry.count++;
  if (entry.count > 10) return { ok: false };
  return { ok: true };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "TEACHER") {
      return NextResponse.json(
        { error: "unauthorized", message: "Bạn cần đăng nhập bằng tài khoản giáo viên." },
        { status: 401 }
      );
    }

    // Rate-limit authenticated teachers by IP.
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "anon";
    const rl = checkRateLimit(ip);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "rate_limited", message: "Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút." },
        { status: 429 }
      );
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith("your-")) {
      return NextResponse.json(
        {
          error: "ai_not_configured",
          setupInstructions:
            "Tính năng AI chưa được cấu hình. Vui lòng thêm OPENAI_API_KEY vào file .env.local. Lấy key tại: https://platform.openai.com/api-keys",
        },
        { status: 503 }
      );
    }

    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { system, user } = buildPrompt(parsed.data as AIGenerateInput);

    const openai = getOpenAI();
    let content = "";
    try {
      const res = await openai.chat.completions.create({
        model: AI_MODEL,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      content = res.choices[0]?.message.content || "{}";
    } catch (aiErr: any) {
      return NextResponse.json(
        {
          error: "ai_error",
          message: aiErr?.message || "Lỗi gọi AI.",
        },
        { status: 502 }
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "ai_invalid_json", rawContent: content.slice(0, 500) },
        { status: 502 }
      );
    }

    // Insufficient content path
    if (
      parsedJson &&
      typeof parsedJson === "object" &&
      "insufficient" in parsedJson &&
      (parsedJson as Record<string, unknown>).insufficient === true
    ) {
      return NextResponse.json(
        {
          insufficient: true,
          clarificationQuestions: (parsedJson as any).clarificationQuestions || [],
          assumptions: (parsedJson as any).assumptions || [],
        },
        { status: 200 }
      );
    }

    const validated = generatedAssignmentSchema.safeParse(parsedJson);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: "ai_schema_mismatch",
          details: validated.error.flatten(),
          rawSample: JSON.stringify(parsedJson).slice(0, 800),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ assignment: validated.data });
  } catch (e: any) {
    return NextResponse.json(
      { error: "internal_error", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}
