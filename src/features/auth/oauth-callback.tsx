"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { getHttpErrorDetails } from "@/lib/axios";

import { useCompleteOAuth } from "./api";

// Finishes an OAuth login: the backend redirects here with the result in the
// URL fragment.
export function OAuthCallback() {
  const router = useRouter();
  const started = useRef(false);

  // Mutation
  const { mutate, isError, error } = useCompleteOAuth({
    mutationConfig: {
      onSuccess: () => router.replace("/dashboard"),
    },
  });

  useEffect(() => {
    // The refresh token works once, so this must not run twice.
    if (started.current) {
      return;
    }

    started.current = true;

    const fragment = window.location.hash;

    // Take the tokens out of the address bar and the browser history.
    window.history.replaceState(null, "", window.location.pathname);

    mutate(fragment);
  }, [mutate]);

  if (!isError) {
    return (
      <p role="status" className="text-muted-foreground">
        Signing you in...
      </p>
    );
  }

  // Error Details
  const errorDetails = getHttpErrorDetails(error);

  return (
    <div role="alert" className="space-y-3">
      <p className="text-sm text-destructive">
        Sign in failed (HTTP {errorDetails.status ?? "N/A"}).
      </p>

      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
        {JSON.stringify(
          errorDetails.data ?? {
            message: error.message,
            code: errorDetails.code,
          },
          null,
          2,
        )}
      </pre>

      <Link href="/login" className="text-sm underline underline-offset-4">
        Back to sign in
      </Link>
    </div>
  );
}
