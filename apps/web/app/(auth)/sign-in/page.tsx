import type { Metadata } from "next";

import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <div className="flex flex-col gap-6 rounded-xl bg-surface p-8 text-surface-foreground shadow-sm dark:shadow-none">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted">
          Sign in to {siteConfig.name} with your Google account
        </p>
      </div>

      <GoogleSignInButton />

      <p className="text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link className="font-medium text-foreground underline" href="/sign-up">
          Sign up
        </Link>
      </p>
    </div>
  );
}
