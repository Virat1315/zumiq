import { Suspense } from "react";
import { LoginClient } from "@/components/login-client";

export const metadata = { title: "Sign in · ZUMIQ" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
