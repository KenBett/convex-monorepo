import type { Metadata } from "next";

import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-6 rounded-[0.875rem] bg-surface p-6 shadow-sm dark:shadow-none">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted">
          Get started with {siteConfig.name} using Google
        </p>
      </div>

      <GoogleSignInButton label="Sign up with Google" />

      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link className="font-medium text-foreground underline" href="/sign-in">
          Sign in
        </Link>
      </p>
    </div>
  );
}
