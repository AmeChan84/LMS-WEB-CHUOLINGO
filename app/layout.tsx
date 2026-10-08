import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Chuolingo LMS — Nền tảng học tập hỗ trợ AI",
    template: "%s | Chuolingo LMS",
  },
  description:
    "Nền tảng quản lý học tập cho giáo viên và học sinh. Quản lý lớp học, tải lên bài giảng Zoom, tạo bài tập tương tác tự động với AI.",
  keywords: [
    "LMS",
    "Học tập",
    "Giáo viên",
    "Học sinh",
    "AI homework",
    "Chuolingo",
    "Quản lý lớp học",
  ],
  authors: [{ name: "Chuolingo" }],
  openGraph: {
    title: "Chuolingo LMS — Nền tảng học tập hỗ trợ AI",
    description:
      "Giáo viên tạo bài tập tương tác tự động bằng AI, quản lý lớp học và bài giảng Zoom. Học sinh học tập tương tác, nhận phản hồi tức thì.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
