"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Archive, Edit3 } from "lucide-react";
import { ClassStatus, type Class as PrismaClass } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { archiveClass } from "@/lib/server-actions/classes";

type ClassLike = PrismaClass & {
  _count: { enrollments: number; lessons: number; assignments: number; announcements: number };
};

export default function ClassOverviewTab({ cls }: { cls: ClassLike }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copying, setCopying] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editName, setEditName] = useState(cls.name);
  const [editDesc, setEditDesc] = useState(cls.description || "");

  function copyCode() {
    setCopying(true);
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(cls.joinCode).catch(() => {});
    }
    toast.success("Đã copy mã tham gia: " + cls.joinCode);
    setTimeout(() => setCopying(false), 1500);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Thông tin lớp học</CardTitle>
              <CardDescription>
                Tạo lúc {new Date(cls.createdAt).toLocaleDateString("vi-VN")}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit3 className="h-4 w-4" /> Sửa thông tin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Chỉnh sửa lớp học</DialogTitle>
                    <DialogDescription>
                      Cập nhật tên và mô tả lớp học.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tên lớp</Label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mô tả</Label>
                      <Textarea
                        rows={4}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpenEdit(false)}>
                      Hủy
                    </Button>
                    <Button
                      onClick={async () => {
                        setBusy(true);
                        try {
                          toast.message(
                            "Demo: tính năng sửa thông tin yêu cầu DB write."
                          );
                        } finally {
                          setBusy(false);
                          setOpenEdit(false);
                        }
                      }}
                      disabled={busy}
                    >
                      Lưu thay đổi
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Archive className="h-4 w-4" /> Lưu trữ
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Lưu trữ lớp học?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Lớp sẽ không còn hiển thị cho học sinh. Bạn có thể khôi phục lại sau.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={async () => {
                        setBusy(true);
                        const r = await archiveClass(cls.id);
                        setBusy(false);
                        if (!r.success) return toast.error(r.error);
                        toast.success("Lớp đã được lưu trữ");
                        router.push("/teacher/classes");
                      }}
                    >
                      Xác nhận lưu trữ
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0 grid gap-5 sm:grid-cols-2">
          <div className="space-y-5">
            <InfoLine label="Tên lớp" value={cls.name} />
            <InfoLine label="Môn học" value={cls.subject || "—"} />
            <InfoLine label="Cấp độ" value={cls.level || "—"} />
            <InfoLine label="Giáo viên" value={cls.teacherId ? "Bạn (Owner)" : "—"} />
            <InfoLine
              label="Trạng thái"
              value={
                <Badge variant={cls.status === ClassStatus.ACTIVE ? "success" : "secondary"}>
                  {cls.status === ClassStatus.ACTIVE ? "Hoạt động" : "Đã lưu trữ"}
                </Badge>
              }
            />
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Mã tham gia lớp học
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 rounded-lg bg-card px-4 py-2.5 font-mono text-lg font-bold tracking-widest ai-gradient-text">
                  {cls.joinCode}
                </div>
                <Button size="sm" onClick={copyCode} disabled={copying} variant="outline">
                  <Copy className="h-4 w-4" />
                  {copying ? "Đã copy" : "Copy"}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Chia sẻ mã này cho học sinh để họ tham gia lớp tại trang{" "}
                <Link href="/student/classes/join" className="underline">
                  Tham gia lớp
                </Link>
                .
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { k: "Học sinh", v: cls._count.enrollments },
                { k: "Bài học", v: cls._count.lessons },
                { k: "Bài tập", v: cls._count.assignments },
              ].map((x) => (
                <div
                  key={x.k}
                  className="rounded-xl border border-border/70 bg-card p-3"
                >
                  <div className="text-2xl font-bold tracking-tight">{x.v}</div>
                  <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {x.k}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base">Hành động nhanh</CardTitle>
          <CardDescription>Lựa chọn theo luồng công việc.</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-2">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href={`/teacher/lessons/upload?classId=${cls.id}`}>
              📘 Tải lên bài học mới
            </Link>
          </Button>
          <Button asChild variant="ai" className="w-full justify-start">
            <Link href={`/teacher/ai/generator?classId=${cls.id}`}>
              ✨ Tạo bài tập bằng AI
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href={`/teacher/assignments?classId=${cls.id}`}>
              📋 Xem tất cả bài tập
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href={`/teacher/classes/${cls.id}?tab=students`}>
              👥 Quản lý học sinh
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="col-span-2 font-medium text-foreground flex items-center gap-2">
        {value}
      </div>
    </div>
  );
}
