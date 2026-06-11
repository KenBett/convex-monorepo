import { AuthRedirect } from "@/components/auth/auth-redirect";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthRedirect>
      <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </AuthRedirect>
  );
}
