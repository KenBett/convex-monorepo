import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

const MOBILE_SCHEME = "heroui-native-app://";

function isAllowedRedirect(redirectTo: string): boolean {
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  return (
    redirectTo.startsWith(siteUrl) ||
    redirectTo.startsWith("http://localhost:3000") ||
    redirectTo.startsWith(MOBILE_SCHEME) ||
    redirectTo.startsWith("exp://")
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
  },
});
