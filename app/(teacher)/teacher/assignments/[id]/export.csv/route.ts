import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-actions/auth";
import { SubmissionStatus } from "@prisma/client";

export async function GET(
  _req: Request,
  segment: { params: Promise<{ id: string }> }
) {
  const { id } = await segment.params;
  const user = await requireRole("TEACHER");
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      class: {
        select: { name: true },
      },
      submissions: {
        orderBy: { submittedAt: "asc" },
        include: {
          student: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!assignment || assignment.teacherId !== user.id) {
    return NextResponse.json(
      { error: "Not found or no permission" },
      { status: 404 }
    );
  }

  // Escape CSV field (RFC 4180)
  const C = (s: any) => {
    const v = s === null || s === undefined ? "" : String(s);
    if (/[",\n\r]/.test(v)) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const lines: string[] = [];
  lines.push(
    [
      "Mã HS",
      "Họ tên",
      "Email",
      "Trạng thái",
      "Điểm",
      "Nhận xét",
      "Bắt đầu lúc",
      "Nộp lúc",
      "Chấm lúc",
    ]
      .map(C)
      .join(",")
  );

  for (const s of assignment.submissions) {
    lines.push(
      [
        s.student.id,
        s.student.name,
        s.student.email,
        submissionLabel(s.status),
        s.score ?? "",
        s.feedback ?? "",
        s.createdAt.toISOString(),
        s.submittedAt?.toISOString() ?? "",
        s.gradedAt?.toISOString() ?? "",
      ]
        .map(C)
        .join(",")
    );
  }

  const csv = "\uFEFF" + lines.join("\r\n"); // BOM for Excel UTF-8
  const safeTitle = (assignment.title || "grades").replace(
    /[^A-Za-z0-9_-]/g,
    "_"
  );
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${safeTitle}_grades.csv"`,
    },
  });
}

function submissionLabel(s: SubmissionStatus) {
  switch (s) {
    case SubmissionStatus.IN_PROGRESS:
      return "Đang làm";
    case SubmissionStatus.SUBMITTED:
      return "Chờ chấm";
    case SubmissionStatus.GRADED:
      return "Đã chấm";
  }
}
