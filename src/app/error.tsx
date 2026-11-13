"use client";

import { useEffect } from "react";

import Typography from "@/components/shared/typography";
import { Button } from "@/components/ui/button";

// Shown when a page throws while rendering.
export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    // Send this to an error reporting service once the project has one.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <section role="alert" className="space-y-2">
        <Typography as="h1" variant="heading" size="4xl">
          Something went wrong
        </Typography>

        <Typography className="text-muted-foreground">
          This page could not be displayed. Try again, or come back later.
        </Typography>
      </section>

      <div>
        <Button onClick={() => retry()}>Try again</Button>
      </div>
    </main>
  );
}
