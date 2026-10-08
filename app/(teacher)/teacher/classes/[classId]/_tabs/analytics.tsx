import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClassAnalyticsChart } from "@/components/analytics-charts";
import { AssignmentStatus, SubmissionStatus } from "@prisma/client";
import { Sparkles, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function ClassAnalyticsTab({
  classId,
}: {
  classId: string;
}) {
  // Per-assignment scores
  const assignments = await prisma.assignment.findMany({
    where: { classId },
    orderBy: { createdAt: "asc" },
    include: {
      submissions: {
        where: { status: { in: [SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED] } },
        select: { score: true, maxScore: true, answersJson: true },
      },
      _count: { select: { submissions: true } },
    },
  });
  const enrollmentsCount = await prisma.classEnrollment.count({
    where: { classId },
  });

  const chartData = assignments.map((a) => {
    const avg =
      a.submissions.length > 0
        ? a.submissions.reduce(
            (acc, s) => acc + Number(s.score || s.maxScore || 0),
            0
          ) / a.submissions.length
        : 0;
    const completionRate =
      enrollmentsCount === 0
        ? 0
        : Math.round((a._count.submissions / enrollmentsCount) * 100);
    return {
      name: a.title.length > 20 ? a.title.slice(0, 20) + "…" : a.title,
      ĐiểmTB: Number(avg.toFixed(1)),
      HoànThành: completionRate,
    };
  });

  const totalSubmissions = assignments.reduce(
    (acc, a) => acc + a.submissions.length,
    0
  );
  const avgAll =
    totalSubmissions > 0
      ? assignments.reduce(
          (acc, a) =>
            acc +
            a.submissions.reduce(
              (a2, s) => a2 + Number(s.score || s.maxScore || 0),
              0
            ),
          0
        ) / totalSubmissions
      : 0;

  const publishedCount = assignments.filter(
    (a) => a.status === AssignmentStatus.PUBLISHED
  ).length;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="p-5 pb-3">
          <CardTitle>Điểm trung bình & Tỉ lệ hoàn thành</CardTitle>
          <CardDescription>
            Theo từng bài tập đã publish trong lớp.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {chartData.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Sparkles className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="mt-4 font-semibold">Chưa có dữ liệu</div>
              <p className="mt-1 max-w-sm mx-auto text-sm text-muted-foreground">
                Xuất bản bài tập và chờ học sinh nộp bài để xem phân tích.
              </p>
            </div>
          ) : (
            <ClassAnalyticsChart chartData={chartData} />
          )}
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base">Tổng quan</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-4">
            <Stat label="Học sinh" value={enrollmentsCount} />
            <Stat label="Bài tập publish" value={publishedCount} />
            <Stat label="Tổng bài nộp" value={totalSubmissions} />
            <Stat label="Điểm TB toàn lớp" value={avgAll.toFixed(1)} accent />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Câu hỏi thường sai (sample)
            </CardTitle>
            <CardDescription>
              Khi có đủ bài nộp, hệ thống sẽ nêu rõ những khái niệm học sinh hay nhầm lẫn.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-sm text-muted-foreground">
            <ul className="list-disc ml-5 space-y-1">
              <li>Khác biệt giữa quang hợp và hô hấp tế bào</li>
              <li>Vai trò của diệp lục trong giai đoạn sáng</li>
              <li>Cách tính điểm theo thứ tự bước giai đoạn Calvin</li>
            </ul>
            <div className="mt-4 text-[11px]">
              ⚠️ Phân tích AI là tham khảo, không phải đánh giá cuối cùng.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-3">
        <CardHeader className="p-5 pb-3">
          <CardTitle>Chi tiết theo bài tập</CardTitle>
          <CardDescription>
            Click tiêu đề để xem chi tiết bài nộp của từng học sinh.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {assignments.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Chưa có bài tập nào
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bài tập</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hạn nộp</TableHead>
                  <TableHead>Đã nộp</TableHead>
                  <TableHead className="text-right">Điểm TB</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => {
                  const avg =
                    a.submissions.length > 0
                      ? a.submissions.reduce(
                          (acc, s) => acc + Number(s.score || 0),
                          0
                        ) / a.submissions.length
                      : 0;
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Link
                          className="hover:underline font-medium"
                          href={`/teacher/assignments/${a.id}`}
                        >
                          {a.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            a.status === AssignmentStatus.PUBLISHED
                              ? "success"
                              : "secondary"
                          }
                        >
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(a.dueDate)}</TableCell>
                      <TableCell>
                        {a._count.submissions}/{enrollmentsCount}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {a.submissions.length > 0 ? avg.toFixed(1) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-xl font-bold ${accent ? "ai-gradient-text" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
