"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { cn, formatFileSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  X,
  FileVideo,
  FileText,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { requestUploadSignedUrl } from "@/lib/server-actions/storage";

export type UploadedFile = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  bucket: string;
  isVideo: boolean;
};

type Purpose = "lesson_video" | "lesson_material" | "class_cover";

type Props = {
  purpose: Purpose;
  lessonId?: string;
  multiple?: boolean;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  onUploaded: (files: UploadedFile[]) => void;
  className?: string;
  variant?: "default" | "compact";
};

type QueuedFile = {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  result?: UploadedFile;
};

function iconFor(file: File, isVideo: boolean) {
  if (isVideo) return FileVideo;
  if (file.type.startsWith("image/")) return ImageIcon;
  return FileText;
}

export function FileUploader({
  purpose,
  lessonId,
  multiple = true,
  accept,
  maxFiles = 10,
  onUploaded,
  className,
  variant = "default",
}: Props) {
  const [queue, setQueue] = React.useState<QueuedFile[]>([]);
  const activeCount = queue.filter(
    (q) => q.status === "uploading" || q.status === "pending"
  ).length;

  const processQueue = React.useCallback(async () => {
    setQueue((prev) => {
      const next = [...prev];
      for (const q of next) {
        if (q.status === "pending") {
          void runUpload(q.id);
          break;
        }
      }
      return next;
    });
  }, []);

  const setFileStatus = React.useCallback(
    (id: string, patch: Partial<QueuedFile>) => {
      setQueue((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ...patch } : q))
      );
    },
    []
  );

  const runUpload = async (qid: string) => {
    setFileStatus(qid, { status: "uploading", progress: 1 });
    const row = queue.find((q) => q.id === qid);
    if (!row) return;
    try {
      const signed = await requestUploadSignedUrl({
        lessonId,
        fileName: row.file.name,
        fileSize: row.file.size,
        contentType: row.file.type || "application/octet-stream",
        purpose,
      });
      if (!signed.success || !signed.data) {
        setFileStatus(qid, {
          status: "error",
          error: "Không thể tạo URL tải lên",
        });
        scheduleNext();
        return;
      }
      // PUT to signed URL with XHR to show progress
      const uploaded = await uploadViaXhr(
        signed.data.uploadUrl,
        row.file,
        (p) => setFileStatus(qid, { progress: p })
      );
      if (!uploaded) {
        setFileStatus(qid, { status: "error", error: "Tải lên thất bại" });
        scheduleNext();
        return;
      }
      const result: UploadedFile = {
        id: qid,
        fileName: row.file.name,
        fileType: row.file.type || "application/octet-stream",
        fileSize: row.file.size,
        storagePath: signed.data.storagePath,
        bucket: signed.data.bucket,
        isVideo: signed.data.isVideo,
      };
      setFileStatus(qid, {
        status: "done",
        progress: 100,
        result,
      });
      onUploaded([result]);
      scheduleNext();
    } catch (e: any) {
      setFileStatus(qid, {
        status: "error",
        error: e?.message || "Lỗi tải lên",
      });
      scheduleNext();
    }
  };

  const scheduleNext = () => {
    setTimeout(() => processQueue(), 50);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple,
    accept,
    maxFiles,
    onDrop: (files) => {
      const added: QueuedFile[] = files.map((f) => ({
        id: Math.random().toString(36).slice(2, 10),
        file: f,
        progress: 0,
        status: "pending",
      }));
      setQueue((prev) => [...prev, ...added]);
      // Kick off processing
      setTimeout(() => processQueue(), 30);
    },
  });

  const removeFile = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "group relative cursor-pointer rounded-xl border-2 border-dashed transition-all",
          isDragActive
            ? "border-indigo-400 bg-indigo-50/60"
            : "border-border hover:border-indigo-300 hover:bg-muted/40",
          variant === "compact" ? "p-4" : "p-8"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm transition-transform group-hover:scale-105">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-medium">
              Kéo & thả tệp vào đây hoặc nhấp để chọn
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {purpose === "lesson_video"
                ? "Hỗ trợ MP4, WebM, MOV (tối đa 2GB)"
                : purpose === "class_cover"
                  ? "Ảnh PNG/JPG/WebP (tối đa 10MB)"
                  : "PDF, PPT, DOC, hình ảnh, văn bản (tối đa 200MB)"}
            </div>
          </div>
          <Button size="sm" variant="outline" type="button">
            Chọn tệp
          </Button>
        </div>
      </div>

      {queue.length > 0 && (
        <ul className="space-y-2">
          {queue.map((q) => {
            const isVideo =
              q.result?.isVideo ??
              /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(q.file.name);
            const Icon = iconFor(q.file, isVideo);
            return (
              <li
                key={q.id}
                className="flex items-start gap-3 rounded-xl border bg-card p-3"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                    isVideo
                      ? "bg-violet-50 text-violet-600"
                      : "bg-blue-50 text-blue-600"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {q.file.name}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatFileSize(q.file.size)}
                    </span>
                    <span className="ml-auto flex-shrink-0">
                      {q.status === "uploading" && (
                        <Badge variant="info" className="gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Đang tải
                        </Badge>
                      )}
                      {q.status === "done" && (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Xong
                        </Badge>
                      )}
                      {q.status === "error" && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Lỗi
                        </Badge>
                      )}
                      {q.status === "pending" && (
                        <Badge variant="secondary">Chờ</Badge>
                      )}
                    </span>
                    {(q.status === "done" || q.status === "error") && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0"
                        onClick={() => removeFile(q.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Progress
                    value={q.progress}
                    className={cn(
                      "mt-2 h-1.5",
                      q.status === "error" && "bg-destructive/20"
                    )}
                  />
                  {q.status === "error" && q.error && (
                    <div className="mt-1 text-xs text-destructive">
                      {q.error}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {activeCount > 0 && (
        <div className="text-xs text-muted-foreground">
          {activeCount} tệp đang xử lý…
        </div>
      )}
    </div>
  );
}

function uploadViaXhr(
  signedUrl: string,
  file: File,
  onProgress: (p: number) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl, true);
    const mime = file.type || "application/octet-stream";
    xhr.setRequestHeader("Content-Type", mime);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve(true);
      } else {
        resolve(false);
      }
    };
    xhr.onerror = () => resolve(false);
    xhr.onabort = () => resolve(false);
    xhr.send(file);
  });
}
