import { Suspense } from "react";
import AuthPageClient from "@/components/auth-client";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageClient initialMode="register" />
    </Suspense>
  );
}
