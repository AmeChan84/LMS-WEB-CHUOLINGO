import Link from "next/link";
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
  FileCheck2,
  PlusCircle,
  Clock,
  Users,
  CheckCircle2,
} from "lucide-react";
import { AssignmentStatus, type Assignment } from "@prisma/client";
import { formatDate, formatRelative } from "@/lib/utils";

type A = Assignment & { _count: { submissions: number } };

export default function ClassAssignmentsTab({
  classId,
  assignments,
}: {
  classId: string;
  assignments: A[];
}) {
  return (
    <Card>
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Bài tập lớp học</CardTitle>
            <CardDescription>
              {assignments.length} bài tập · Tạo mới với AI.
            </CardDescription>
          </div>
          <Button asChild variant="ai">
            <Link href={`/teacher/ai/generator?classId=${classId}`}>
              <PlusCircle className="h-4 w-4" /> Tạo bài tập AI
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {assignments.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <FileCheck2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="mt-4 font-semibold">Chưa có bài tập nào</div>
            <p className="mt-1 max-w-md mx-auto text-sm text-muted-foreground">
              Sử dụng AI Homework Generator để tạo bài tập đa dạng chỉ với vài
              dòng mô tả nội dung bài học.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/70">
            {assignments.map((a) => {
              const isOverdue =
                a.dueDate && a.status === AssignmentStatus.PUBLISHED
                  ? a.dueDate.getTime() < Date.now()
                  : false;
              return (
                <li key={a.id} className="p-4 sm:p-5">
                  <Link
                    href={`/teacher/assignments/${a.id}`}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium line-clamp-1">{a.title}</span>
                        <Badge
                          variant={
                            a.status === AssignmentStatus.PUBLISHED
                              ? "success"
                              : a.status === AssignmentStatus.DRAFT
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {a.status === AssignmentStatus.PUBLISHED
                            ? "Published"
                            : a.status}
                        </Badge>
                        {a.difficulty && (
                          <Badge variant="outline">{a.difficulty}</Badge>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Hạn:{" "}
                          {formatDate(a.dueDate)}
                        </span>
                        {a.dueDate && (
                          <span
                            className={
                              isOverdue ? "text-destructive font-medium" : ""
                            }
                          >
                            {formatRelative(a.dueDate)}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" /> Đã nộp:{" "}
                          {a._count.submissions}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Tổng điểm:{" "}
                          {a.totalPoints}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Xem chi tiết →
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
