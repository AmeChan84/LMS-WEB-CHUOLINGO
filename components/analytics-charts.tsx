"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, Award } from "lucide-react";

export function TeacherAnalyticsCharts({
  classData,
  trend,
}: {
  classData: {
    name: string;
    avgScore: number;
    completionPct: number;
    hs: number;
    assignments: number;
    lessons: number;
  }[];
  trend: { date: string; nộp: number; chấm: number }[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            Điểm TB & Tỷ lệ hoàn thành theo lớp
          </CardTitle>
          <CardDescription>
            So sánh trung bình điểm và tỷ lệ học sinh hoàn thành bài tập giữa các lớp.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 h-80">
          {classData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Chưa có lớp học để hiển thị
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="avgScore" fill="url(#colorScore)" name="Điểm TB (scale 10)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="completionPct" fill="url(#colorComp)" name="Hoàn thành (%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-emerald-500" />
            Hoạt động nộp bài 14 ngày gần nhất
          </CardTitle>
          <CardDescription>
            Xu hướng số bài tập được nộp và chấm mỗi ngày.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="nộp" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="chấm" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export function ClassAnalyticsChart({
  chartData,
}: {
  chartData: { name: string; ĐiểmTB: number; HoànThành: number }[];
}) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="name" fontSize={11} stroke="#64748b" />
          <YAxis yAxisId="left" fontSize={11} stroke="#64748b" />
          <YAxis yAxisId="right" orientation="right" fontSize={11} stroke="#64748b" />
          <Tooltip
            contentStyle={{
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Bar yAxisId="left" dataKey="ĐiểmTB" fill="url(#colorScore)" radius={[6, 6, 0, 0]} />
          <Bar yAxisId="right" dataKey="HoànThành" fill="url(#colorComp)" radius={[6, 6, 0, 0]} />
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0.6} />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
