import Link from "next/link";
import { BookOpenCheck, ChevronLeft } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left: illustration */}
      <div className="relative hidden overflow-hidden lg:flex flex-col justify-between p-10 bg-[radial-gradient(ellipse_at_top_left,theme(colors.primary)_0%,#0f172a_55%)] text-white">
        <div className="absolute inset-0 ai-gradient-bg opacity-40" />
        <div className="relative flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold tracking-tight">
            Chuolingo <span className="ai-gradient-text font-bold">LMS</span>
          </span>
        </div>
        <div className="relative space-y-6 max-w-md">
          <h2 className="text-4xl font-bold leading-tight">
            Dạy và học <br />
            <span className="text-indigo-300">thông minh hơn</span> với AI
          </h2>
          <p className="text-white/80 leading-relaxed">
            Giáo viên tiết kiệm hàng giờ mỗi tuần khi soạn bài tập. Học sinh
            nhận phản hồi tức thì, tiến bộ từng ngày.
          </p>
          <ul className="grid gap-3 text-sm">
            {[
              "AI tự động tạo 9 dạng bài tập tương tác",
              "Upload Zoom recordings & tài liệu học tập",
              "Biểu đồ hiệu suất chi tiết theo từng lớp",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                <span className="text-white/90">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-white/60">
          © {new Date().getFullYear()} Chuolingo LMS · An toàn & bảo mật dữ liệu
        </div>
      </div>

      {/* Right: form */}
      <div className="flex min-h-screen flex-col">
        <div className="container relative flex h-16 items-center">
          <Link
            href="/"
            className="back-navigation inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm"
          >
            <ChevronLeft className="h-4 w-4" /> Quay về
          </Link>
        </div>
        <div className={cn("container flex flex-1 items-center justify-center py-10 lg:py-14")}>
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
