import type { Metadata } from "next";

import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <div className="flex flex-col gap-6 rounded-[0.875rem] bg-surface p-6 shadow-sm dark:shadow-none">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>

      <GoogleSignInButton />

      <p className="text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link className="font-medium text-foreground underline" href="/sign-up">
          Sign up
        </Link>
      </p>
    </div>
  );
}
