import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

import { createOrUpdateAuthUser } from "./lib/createAuthUser";

const MOBILE_SCHEME = "heroui-native-app://";

function getAllowedRedirectPrefixes(): string[] {
  const prefixes = new Set<string>([
    process.env.SITE_URL ?? "http://localhost:3000",
    "http://localhost:3000",
    MOBILE_SCHEME,
  ]);

  const extraOrigins = process.env.ALLOWED_REDIRECT_ORIGINS;
  if (extraOrigins) {
    for (const origin of extraOrigins.split(",")) {
      const trimmed = origin.trim();
      if (trimmed) {
        prefixes.add(trimmed);
      }
    }
  }

  return [...prefixes];
}

function isAllowedRedirect(redirectTo: string): boolean {
  if (redirectTo.startsWith("exp://")) {
    return true;
  }

  return getAllowedRedirectPrefixes().some((prefix) =>
    redirectTo.startsWith(prefix),
  );
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    async redirect({ redirectTo }) {
      if (isAllowedRedirect(redirectTo)) {
        return redirectTo;
      }
      throw new Error(`Invalid redirectTo: ${redirectTo}`);
    },
    async createOrUpdateUser(ctx, args) {
      return await createOrUpdateAuthUser(ctx, args);
    },
  },
});
