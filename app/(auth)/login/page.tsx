import { Suspense } from "react";
import AuthPageClient from "@/components/auth-client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageClient initialMode="login" />
    </Suspense>
  );
}
