"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen grid place-items-center p-6 bg-background text-foreground">
          <div className="max-w-md text-center">
            <h2 className="text-2xl font-bold">Đã xảy ra lỗi</h2>
            <p className="mt-2 text-muted-foreground">
              {error?.message || "Một lỗi không mong muốn đã xảy ra."}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button onClick={reset} variant="outline">
                Thử lại
              </Button>
              <Button asChild>
                <Link href="/">Quay về trang chủ</Link>
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
