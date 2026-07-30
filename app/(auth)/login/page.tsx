import { Suspense } from "react";

import { LoginForm } from "@/app/(auth)/login/login-form";
import { getAppSettings } from "@/lib/settings";

export default async function LoginPage() {
  const settings = await getAppSettings();

  return (
    <div className="w-full max-w-md">
      <Suspense fallback={<div className="text-sm text-muted">Loading...</div>}>
        <LoginForm
          companyName={settings.companyName}
          companyTagline={settings.companyTagline}
        />
      </Suspense>
    </div>
  );
}
