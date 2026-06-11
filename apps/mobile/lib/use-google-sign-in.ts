import { useAuthActions } from "@convex-dev/auth/react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";

WebBrowser.maybeCompleteAuthSession();

function getCodeFromUrl(url: string): string | null {
  const parsed = Linking.parse(url);
  const code = parsed.queryParams?.code;
  return typeof code === "string" ? code : null;
}

export function useGoogleSignIn() {
  const { signIn } = useAuthActions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const redirectTo = Linking.createURL("/");
      const result = await signIn("google", { redirectTo });

      if (result.redirect) {
        const browserResult = await WebBrowser.openAuthSessionAsync(
          result.redirect.toString(),
          redirectTo,
        );

        if (browserResult.type !== "success") {
          return;
        }

        const code = getCodeFromUrl(browserResult.url);
        if (!code) {
          setError("Sign-in was cancelled or failed.");
          return;
        }

        await signIn("google", { code });
      }
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Sign-in failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [signIn]);

  return { signInWithGoogle, isLoading, error };
}
