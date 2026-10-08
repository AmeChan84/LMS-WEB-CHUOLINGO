import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GraduationCap,
  PlusCircle,
  Search,
  Users,
  BookOpenText,
  ChevronRight,
} from "lucide-react";
import { ClassStatus } from "@prisma/client";

export default async function ClassesPage() {
  const user = await requireRole("TEACHER");
  const classes = await prisma.class.findMany({
    where: { teacherId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      _count: {
        select: {
          enrollments: true,
          lessons: true,
          assignments: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            My Classes
          </h1>
          <p className="mt-1 text-muted-foreground">
            Quản lý tất cả các lớp học bạn đang dạy.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Tìm kiếm lớp..." className="pl-9 w-full sm:w-64" />
          </div>
          <Button asChild>
            <Link href="/teacher/classes/create">
              <PlusCircle className="h-4 w-4" /> Tạo lớp mới
            </Link>
          </Button>
        </div>
      </div>

      {classes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <GraduationCap className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-5 text-lg font-semibold">
              Bạn chưa có lớp học nào
            </div>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Tạo lớp học đầu tiên, chia sẻ mã tham gia cho học sinh để bắt đầu.
            </p>
            <Button asChild className="mt-6">
              <Link href="/teacher/classes/create">
                <PlusCircle className="h-4 w-4" /> Tạo lớp đầu tiên
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((c) => (
            <Link
              key={c.id}
              href={`/teacher/classes/${c.id}`}
              className="group"
            >
              <Card className="h-full overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <div
                  className="relative h-32 bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-600"
                  style={
                    c.coverImageUrl
                      ? {
                          backgroundImage: `url(${c.coverImageUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    {c.status === ClassStatus.ARCHIVED ? (
                      <Badge variant="secondary">Đã lưu trữ</Badge>
                    ) : (
                      <Badge className="bg-white/95 text-indigo-700 shadow-sm">
                        {c.subject || "Môn học"}
                      </Badge>
                    )}
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <Badge variant="outline" className="bg-white/90 border-0 text-xs">
                      Mã: <span className="ml-1 font-mono font-semibold">{c.joinCode}</span>
                    </Badge>
                  </div>
                </div>
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-lg line-clamp-1">
                    {c.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                    {c.description || (c.level ? `Cấp độ: ${c.level}` : "Không có mô tả")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {c._count.enrollments} học sinh
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpenText className="h-3.5 w-3.5" />
                      {c._count.lessons} bài
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 transition-opacity group-hover:opacity-100 -mr-2"
                  >
                    Xem chi tiết
                    <ChevronRight className="h-4 w-4" />
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
