import { Suspense } from "react";

import { LoginForm } from "@/app/(auth)/login/login-form";

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <Suspense fallback={<div className="text-sm text-muted">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
