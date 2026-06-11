"use client";

import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { LayoutSkeleton } from "@/components/layout/layout-skeleton";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <LayoutSkeleton />;
  }

  if (!isAuthenticated) {
    return <LayoutSkeleton />;
  }

  return <>{children}</>;
}
