"use client";

import { useEffect } from "react";

import Typography from "@/components/shared/typography";
import { Button } from "@/components/ui/button";
import { useLogout, useSession } from "@/features/auth/api";

// Example of a page that needs a session (see src/proxy.ts).
export default function DashboardPage() {
  // Query
  const { data: session, isPending, isError } = useSession();

  // Mutation
  const logout = useLogout();

  // The proxy only checks that the cookie exists. A session the backend no
  // longer accepts resolves to null here. A full page load drops everything
  // the previous user left in memory.
  useEffect(() => {
    if (session === null) {
      window.location.replace("/login");
    }
  }, [session]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <Typography as="h1" variant="heading" size="4xl">
        Dashboard
      </Typography>

      {/* Loading */}
      {isPending && (
        <Typography className="text-muted-foreground">
          Loading session...
        </Typography>
      )}

      {/* Error */}
      {isError && (
        <Typography role="alert" className="text-destructive">
          The session could not be loaded. Check that the API is reachable.
        </Typography>
      )}

      {/* Session */}
      {session && (
        <section className="space-y-4 rounded-lg border p-5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{session.user.name}</dd>

            <dt className="text-muted-foreground">Email</dt>
            <dd>{session.user.email}</dd>

            <dt className="text-muted-foreground">Role</dt>
            <dd>{session.user.role}</dd>
          </dl>

          <Button
            variant="outline"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            {logout.isPending ? "Signing out..." : "Sign out"}
          </Button>
        </section>
      )}
    </main>
  );
}
