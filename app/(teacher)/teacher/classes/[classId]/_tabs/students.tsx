"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserRoundMinus, Mail, User as UserIcon } from "lucide-react";
import type { ClassEnrollment, User as PrismaUser } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/utils";
import { removeStudentFromClass } from "@/lib/server-actions/classes";

type Enrollment = ClassEnrollment & {
  student: Pick<PrismaUser, "id" | "name" | "email" | "createdAt">;
};

export default function ClassStudentsTab({
  classId,
  enrollments,
}: {
  classId: string;
  enrollments: Enrollment[];
}) {
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const filtered = enrollments.filter((e) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      e.student.name.toLowerCase().includes(s) ||
      e.student.email.toLowerCase().includes(s)
    );
  });

  return (
    <Card>
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Học sinh trong lớp</CardTitle>
            <CardDescription>
              {enrollments.length} học sinh · Xóa học sinh khỏi lớp nếu cần.
            </CardDescription>
          </div>
          <Input
            className="sm:max-w-xs"
            placeholder="Tìm học sinh theo tên/email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <UserIcon className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="mt-4 font-semibold">Chưa có học sinh nào</div>
            <p className="mt-1 max-w-sm mx-auto text-sm text-muted-foreground">
              Chia sẻ mã tham gia lớp học để học sinh đăng ký tham gia.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/70">
            {filtered.map((enr) => (
              <li
                key={enr.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">
                    {enr.student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{enr.student.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 truncate">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        {enr.student.email}
                      </span>
                      <span>Tham gia: {formatDate(enr.joinedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <Badge variant="secondary">Đã tham gia</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                      >
                        <UserRoundMinus className="h-4 w-4" /> Xóa
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Xóa học sinh khỏi lớp?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Hành động này không thể hoàn tác. Học sinh sẽ không còn
                          truy cập bài giảng và bài tập của lớp nữa.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() =>
                            startTransition(async () => {
                              const r = await removeStudentFromClass(
                                classId,
                                enr.studentId
                              );
                              if (!r.success) toast.error(r.error);
                              else {
                                toast.success(
                                  `Đã xóa ${enr.student.name} khỏi lớp.`
                                );
                              }
                            })
                          }
                        >
                          Xác nhận xóa
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
