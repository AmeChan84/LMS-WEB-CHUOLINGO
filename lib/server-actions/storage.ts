"use server";

import { z } from "zod";
import { getServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentUser, requireRole } from "@/lib/server-actions/auth";
import type { ActionResult } from "@/lib/server-actions/auth";
import { shortId } from "@/lib/utils";

const BUCKETS = {
  LESSON_VIDEOS: "lesson-videos",
  LESSON_MATERIALS: "lesson-materials",
  CLASS_COVERS: "class-covers",
} as const;

type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/avi",
]);

const VIDEO_EXTS = [
  ".mp4",
  ".webm",
  ".mov",
  ".mkv",
  ".avi",
  ".m4v",
];

const MATERIAL_MIMES = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

function getBucketForFileName(name: string, mime?: string): {
  bucket: BucketName;
  isVideo: boolean;
} {
  const lower = name.toLowerCase();
  const isVideo =
    VIDEO_EXTS.some((ext) => lower.endsWith(ext)) ||
    (mime && VIDEO_MIMES.has(mime));
  if (isVideo) return { bucket: BUCKETS.LESSON_VIDEOS, isVideo: true };
  return { bucket: BUCKETS.LESSON_MATERIALS, isVideo: false };
}

const signedUploadSchema = z.object({
  lessonId: z.string().optional(),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  contentType: z.string().min(1),
  purpose: z.enum(["lesson_video", "lesson_material", "class_cover"]),
});

/**
 * Returns a signed URL the client can PUT the raw file bytes to.
 * Never exposes Supabase storage URLs / service role key to the client.
 */
export async function requestUploadSignedUrl(
  raw: z.infer<typeof signedUploadSchema>
): Promise<
  ActionResult<{
    uploadUrl: string;
    storagePath: string;
    bucket: string;
    isVideo: boolean;
  }>
> {
  const user = await requireRole("TEACHER");
  const parsed = signedUploadSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Thông tin tệp không hợp lệ" };
  }
  const { fileName, fileSize, contentType, purpose } = parsed.data;

  // Size limits
  const maxSize =
    purpose === "lesson_video"
      ? 2 * 1024 * 1024 * 1024 // 2GB
      : purpose === "class_cover"
        ? 10 * 1024 * 1024 // 10MB
        : 200 * 1024 * 1024; // 200MB for materials

  if (fileSize > maxSize) {
    return {
      success: false,
      error: `Tệp quá lớn (tối đa ${Math.round(maxSize / (1024 * 1024))} MB)`,
    };
  }

  // Basic type sanity
  if (purpose === "lesson_video") {
    const { isVideo } = getBucketForFileName(fileName, contentType);
    if (!isVideo) {
      return {
        success: false,
        error: "Tệp video không đúng định dạng (MP4, WebM, MOV...)",
      };
    }
  } else if (purpose === "lesson_material") {
    const lower = fileName.toLowerCase();
    const okExt =
      lower.endsWith(".pdf") ||
      lower.endsWith(".ppt") ||
      lower.endsWith(".pptx") ||
      lower.endsWith(".doc") ||
      lower.endsWith(".docx") ||
      lower.endsWith(".txt") ||
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".gif");
    if (!okExt && contentType && !MATERIAL_MIMES.has(contentType)) {
      return {
        success: false,
        error: "Định dạng tài liệu không được hỗ trợ",
      };
    }
  } else if (purpose === "class_cover") {
    const lower = fileName.toLowerCase();
    if (
      !lower.endsWith(".png") &&
      !lower.endsWith(".jpg") &&
      !lower.endsWith(".jpeg") &&
      !lower.endsWith(".webp")
    ) {
      return { success: false, error: "Ảnh bìa chỉ hỗ trợ PNG/JPG/WebP" };
    }
  }

  const sb = getServiceRoleClient();
  let bucket: BucketName = BUCKETS.LESSON_MATERIALS;
  let isVideo = false;
  if (purpose === "lesson_video") {
    bucket = BUCKETS.LESSON_VIDEOS;
    isVideo = true;
  } else if (purpose === "class_cover") {
    bucket = BUCKETS.CLASS_COVERS;
  } else {
    const resolved = getBucketForFileName(fileName, contentType);
    bucket = resolved.bucket;
    isVideo = resolved.isVideo;
  }

  const safeName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
  const storagePath = `${user.id}/${shortId("", 10)}_${safeName}`;

  try {
    const { data, error } = await sb.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath);
    if (error || !data) {
      return {
        success: false,
        error:
          error?.message ||
          "Không thể tạo URL tải lên. Kiểm tra lại cấu hình Supabase Storage và bucket.",
      };
    }
    return {
      success: true,
      data: {
        uploadUrl: data.signedUrl,
        storagePath,
        bucket,
        isVideo,
      },
    };
  } catch (e: any) {
    return {
      success: false,
      error: e?.message || "Lỗi tạo URL tải lên",
    };
  }
}

/**
 * Creates a short-lived signed URL for downloading a private file.
 * Called by server components when rendering links to materials/videos for authorized users.
 */
export async function getSignedDownloadUrl(
  bucket: BucketName | string,
  storagePath: string,
  expiresInSeconds = 60 * 60 * 2
): Promise<ActionResult<{ url: string }>> {
  // Require any authenticated user; role-specific ownership checks happen at the caller.
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Chưa đăng nhập" };
  }
  const sb = getServiceRoleClient();
  try {
    const { data, error } = await sb.storage
      .from(bucket as any)
      .createSignedUrl(storagePath, expiresInSeconds);
    if (error || !data) {
      return {
        success: false,
        error: error?.message || "Không thể tạo URL truy cập tệp",
      };
    }
    return { success: true, data: { url: data.signedUrl } };
  } catch (e: any) {
    return { success: false, error: e?.message || "Lỗi" };
  }
}

/**
 * Deletes a file from storage when the teacher removes a LessonFile row.
 */
export async function deleteStorageFile(
  bucket: BucketName | string,
  storagePath: string
): Promise<ActionResult> {
  await requireRole("TEACHER");
  const sb = getServiceRoleClient();
  try {
    const { error } = await sb.storage
      .from(bucket as any)
      .remove([storagePath]);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "Lỗi xóa tệp" };
  }
}
