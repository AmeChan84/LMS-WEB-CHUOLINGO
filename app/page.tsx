import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Sparkles,
  Video,
  GraduationCap,
  Users,
  CheckCircle2,
  FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-lg tracking-tight">
              Chuolingo <span className="ai-gradient-text font-bold">LMS</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm md:flex">
            <Link
              href="#features"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Tính năng
            </Link>
            <Link
              href="#for-teachers"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Dành cho giáo viên
            </Link>
            <Link
              href="#for-students"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Dành cho học sinh
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Đăng nhập</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">
                Bắt đầu <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[500px] ai-gradient-bg -z-10" />
        <div className="container grid gap-12 py-20 lg:grid-cols-2 lg:py-28">
          <div className="flex flex-col justify-center">
            <Badge variant="ai" className="mb-4 w-fit">
              <Sparkles className="mr-1 h-3 w-3" /> AI-powered · Chuolingo LMS v1.0
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Dạy và học thông minh hơn,
              <br />
              cùng <span className="ai-gradient-text">Trí tuệ nhân tạo</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Giáo viên quản lý lớp học, tải lên bài giảng Zoom và để AI tự động
              tạo hàng trăm bài tập tương tác đa dạng dạng trong vài giây. Học
              sinh làm bài, nhận phản hồi tức thì và theo dõi tiến độ cá nhân.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="xl" className="shadow-lg">
                <Link href="/register?role=TEACHER">
                  Tôi là giáo viên
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="/register?role=STUDENT">Tôi là học sinh</Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              {[
                "Trắc nghiệm, đúng/sai, điền khuyết, nối đôi…",
                "Tích hợp Zoom recordings & tài liệu",
                "Báo cáo hiệu suất chi tiết",
                "Đều tự động chấm và giải thích",
                "Mã tham gia lớp học duy nhất",
                "Bảo vệ dữ liệu học sinh",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-20 bg-[radial-gradient(ellipse_at_center,theme(colors.ai.DEFAULT_)/0.15,transparent_60%)]" />
            <div className="relative w-full max-w-xl">
              <div className="rounded-2xl border border-border/60 bg-card card-shadow p-2">
                <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="ml-4 text-xs text-muted-foreground">
                    app.chuolingo.edu · AI Homework Generator
                  </span>
                </div>
                <div className="grid gap-3 p-4 sm:p-6">
                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">
                        Bài tập: Quang hợp thực vật
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Sinh học · Lớp 10 · 20 phút · 10 điểm
                      </div>
                    </div>
                    <Badge variant="success">Published</Badge>
                  </div>
                  <div className="grid gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded-lg bg-muted/60 p-3">
                      <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        Trắc nghiệm
                      </div>
                      <div className="font-medium">4 câu · 4 điểm</div>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-3">
                      <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        Đúng/Sai
                      </div>
                      <div className="font-medium">2 câu · 2 điểm</div>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-3">
                      <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        Điền khuyết
                      </div>
                      <div className="font-medium">2 câu · 2 điểm</div>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-3">
                      <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        Ngắn + Nối
                      </div>
                      <div className="font-medium">2 câu · 2 điểm</div>
                    </div>
                  </div>
                  <div className="rounded-lg ai-gradient-bg border border-violet-200/70 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="h-4 w-4 text-violet-700" />
                      Đã tạo bởi AI · sẵn sàng xuất bản
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      10 câu hỏi đa dạng, tự động tạo đáp án và giải thích chi tiết theo nội dung bài giảng của bạn.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline">Tính năng</Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Mọi công cụ giáo viên cần trong một nền tảng
          </h2>
          <p className="mt-4 text-muted-foreground">
            Từ quản lý lớp học đến tạo bài tập bằng AI — mọi thứ đồng bộ mượt
            mà và chuyên nghiệp.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Users,
              title: "Quản lý lớp học",
              desc: "Tạo lớp học, mã tham gia duy nhất, quản lý học sinh dễ dàng. Lưu trữ và khôi phục khi cần.",
              tint: "bg-blue-50 text-blue-700",
            },
            {
              icon: Video,
              title: "Zoom recordings & tài liệu",
              desc: "Tải video bài giảng, PDF, PPT, DOCX, hình ảnh. Tự động progress bar, streaming mượt.",
              tint: "bg-emerald-50 text-emerald-700",
            },
            {
              icon: Sparkles,
              title: "AI tạo bài tập đa dạng",
              desc: "Chỉ cần mô tả nội dung bài học — AI tạo 9 dạng câu hỏi khác nhau, kèm đáp án & giải thích.",
              tint: "bg-violet-50 text-violet-700",
            },
            {
              icon: BookOpenCheck,
              title: "Học sinh làm bài tương tác",
              desc: "Mỗi màn hình một câu, tự động lưu tiến độ, chấm điểm và giải thích ngay cho các dạng câu hỏi.",
              tint: "bg-amber-50 text-amber-700",
            },
            {
              icon: FileUp,
              title: "Chấm điểm & phản hồi",
              desc: "Tuỳ chỉnh điểm, để lại phản hồi cho từng học sinh. Export CSV báo cáo chi tiết.",
              tint: "bg-rose-50 text-rose-700",
            },
            {
              icon: GraduationCap,
              title: "Phân tích hiệu suất",
              desc: "Biểu đồ điểm trung bình, tỉ lệ hoàn thành, câu hỏi thường sai — giúp bạn nắm bắt lớp học.",
              tint: "bg-indigo-50 text-indigo-700",
            },
          ].map((f) => (
            <Card key={f.title} className="transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <CardHeader>
                <div
                  className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg ${f.tint}`}
                >
                  <f.icon className="h-5 w-5" />
                </div>
                <CardTitle>{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* For teachers */}
      <section id="for-teachers" className="container py-20">
        <div className="rounded-3xl border border-border/70 bg-card card-shadow p-8 sm:p-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge variant="info">Dành cho giáo viên</Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Giảm 80% thời gian soạn bài tập
              </h2>
              <p className="mt-4 text-muted-foreground">
                Thay vì hàng giờ soạn đề, bạn chỉ cần mô tả những gì đã dạy —
                AI đề xuất một bài tập hoàn chỉnh, bạn xem qua, sửa vài dòng và
                xuất bản. Xong.
              </p>
              <ol className="mt-8 space-y-5">
                {[
                  "Tạo lớp học, gửi mã tham gia cho học sinh",
                  "Tải video Zoom và tài liệu học liệu",
                  "Mô tả nội dung bài học → AI tạo bài tập trong 30 giây",
                  "Xem, chỉnh sửa, Publish — và chờ xem kết quả tự động chấm",
                ].map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {i + 1}
                    </div>
                    <span className="pt-1 text-sm">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-8">
                <Button asChild size="lg">
                  <Link href="/register?role=TEACHER">
                    Tạo tài khoản giáo viên <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["9 dạng", "câu hỏi tương tác"],
                ["30 giây", "tạo bài tập AI"],
                ["100%", "tự động chấm trắc nghiệm"],
                ["∞", "học sinh trên mỗi lớp"],
              ].map(([big, small]) => (
                <div
                  key={big}
                  className="rounded-2xl border border-border/60 bg-background/60 p-5"
                >
                  <div className="ai-gradient-text text-3xl font-bold">{big}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {small}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* For students */}
      <section id="for-students" className="container py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <div className="rounded-2xl border border-border/60 bg-card card-shadow p-5 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Bài tập: Quang hợp</div>
                  <div className="text-xs text-muted-foreground">
                    Sinh học 10 · Câu 5/10 · Đã làm 4 câu
                  </div>
                </div>
                <Badge variant="warning">In Progress</Badge>
              </div>
              <div className="mt-4">
                <ProgressWrapper percent={40} />
              </div>
              <div className="mt-6 rounded-xl border border-border/70 bg-background p-5">
                <div className="text-sm font-medium">
                  Câu 5. Phương trình tổng quát quang hợp?
                </div>
                <div className="mt-4 grid gap-2">
                  {[
                    "A. 6O2 + 6H2O → C6H12O6 + 6CO2",
                    "B. 6CO2 + 6H2O → C6H12O6 + 6O2 ✓",
                    "C. C6H12O6 + 6O2 → 6CO2 + 6H2O",
                    "D. CO2 + O2 → Glucose + Năng lượng",
                  ].map((opt, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border px-4 py-3 text-sm transition-colors ${
                        i === 1
                          ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                          : "border-border"
                      }`}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex justify-between text-sm text-muted-foreground">
                <Button variant="ghost" size="sm">← Trước</Button>
                <Button size="sm">Tiếp theo →</Button>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <Badge variant="success">Dành cho học sinh</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Học mỗi ngày, tiến bộ từng bước
            </h2>
            <p className="mt-4 text-muted-foreground">
              Theo dõi hạn nộp, xem lại bài giảng mọi lúc, làm bài tập tương tác
              và biết ngay đáp án đúng hay sai — không còn chờ đợi.
            </p>
            <ul className="mt-8 space-y-4 text-sm">
              {[
                "Nhập mã lớp từ giáo viên để tham gia ngay",
                "Xem lại video bài giảng có thể tua nhanh/chậm",
                "Làm bài từ từ, hệ thống tự động lưu mỗi lần trả lời",
                "Xem ngay đáp án & giải thích, nắm điểm mạnh yếu",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button asChild variant="outline" size="lg">
                <Link href="/register?role=STUDENT">
                  Tham gia lớp học ngay <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-8 py-14 text-center text-white shadow-xl sm:px-14 sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25),transparent_55%)]" />
          <div className="relative">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Sẵn sàng chuyển đổi lớp học của bạn?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/85">
              Chuolingo LMS miễn phí dùng thử. Đăng ký tài khoản giáo viên 1
              phút là sẵn sàng dạy.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="xl"
                className="bg-white text-indigo-700 hover:bg-white/90 shadow-lg"
              >
                <Link href="/register?role=TEACHER">
                  Đăng ký giáo viên · Miễn phí
                </Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="outline"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/login">Tôi đã có tài khoản</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="container flex flex-col gap-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-medium text-foreground">Chuolingo LMS</span>
            <span>· © {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/login" className="hover:text-foreground">
              Đăng nhập
            </Link>
            <Link href="/register" className="hover:text-foreground">
              Đăng ký
            </Link>
            <a href="#features" className="hover:text-foreground">
              Tính năng
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProgressWrapper({ percent }: { percent: number }) {
  const Progress = require("@/components/ui/progress").Progress as typeof import("@/components/ui/progress").Progress;
  return (
    <div>
      <Progress value={percent} />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>Tiến độ</span>
        <span className="font-medium">{percent}%</span>
      </div>
    </div>
  );
}
