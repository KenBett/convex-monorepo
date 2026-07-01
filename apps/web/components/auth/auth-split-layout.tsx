import type { ReactNode } from "react";

import { AuthBrandPanel } from "./auth-brand-panel";

interface AuthSplitLayoutProps {
  children: ReactNode;
}

export function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="lg:hidden">
        <AuthBrandPanel compact />
      </div>

      <div className="hidden lg:block">
        <AuthBrandPanel />
      </div>

      <div className="flex flex-1 flex-col justify-center bg-background px-6 py-10 sm:px-10 lg:px-16 lg:py-12">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
