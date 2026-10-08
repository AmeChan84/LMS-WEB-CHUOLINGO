import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-actions/auth";
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
  GraduationCap,
  PlusCircle,
  Users,
  BookOpenText,
  FileCheck2,
  ChevronRight,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ClassStatus } from "@prisma/client";

export default async function StudentClassesPage() {
  const user = await requireRole("STUDENT");
  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      studentId: user.id,
      class: { status: ClassStatus.ACTIVE },
    },
    include: {
      class: {
        include: {
          _count: {
            select: { lessons: true, assignments: true, enrollments: true },
          },
          teacher: { select: { name: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Lớp của tôi
          </h1>
          <p className="mt-1 text-muted-foreground">
            {enrollments.length} lớp học bạn đang tham gia.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Tìm kiếm lớp..." className="pl-9 w-full sm:w-64" />
          </div>
          <Button asChild variant="ai">
            <Link href="/student/classes/join">
              <PlusCircle className="h-4 w-4" /> Tham gia lớp mới
            </Link>
          </Button>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <GraduationCap className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-5 text-lg font-semibold">
              Bạn chưa tham gia lớp nào
            </div>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Nhập mã tham gia từ giáo viên để bắt đầu học tập.
            </p>
            <Button asChild className="mt-6">
              <Link href="/student/classes/join">
                <PlusCircle className="h-4 w-4" /> Tham gia lớp đầu tiên
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {enrollments.map(({ class: cls, joinedAt }) => (
            <Link
              key={cls.id}
              href={`/student/classes/${cls.id}`}
              className="group"
            >
              <Card className="h-full overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                <div
                  className="relative h-32 bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-600"
                  style={
                    cls.coverImageUrl
                      ? {
                          backgroundImage: `url(${cls.coverImageUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-white/95 text-indigo-700 shadow-sm">
                      {cls.subject || "Môn học"}
                    </Badge>
                  </div>
                </div>
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-lg line-clamp-1">
                    {cls.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                    Giáo viên: {cls.teacher.name || "Chưa cập nhật"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {cls._count.enrollments} bạn
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpenText className="h-3.5 w-3.5" />
                    {cls._count.lessons} bài học
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FileCheck2 className="h-3.5 w-3.5" />
                    {cls._count.assignments} bài tập
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto opacity-0 group-hover:opacity-100 -mr-2"
                  >
                    Mở lớp <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
