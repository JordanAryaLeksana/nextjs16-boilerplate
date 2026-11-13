import Link from "next/link";

import Typography from "@/components/shared/typography";
import { Button } from "@/components/ui/button";

// Starter index. Replace it when the project starts (see the new-project skill).
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <section className="space-y-3">
        <Typography as="h1" variant="heading" size="5xl">
          Next.js Boilerplate
        </Typography>

        <Typography size="lg" className="max-w-xl text-muted-foreground">
          A starting point with data fetching, forms, client state, and sign in
          already wired up. Each page below is a working example.
        </Typography>
      </section>

      {/* Sign In */}
      <section className="space-y-3">
        <Typography as="h2" variant="heading" size="xl">
          Sign in
        </Typography>

        <Typography size="sm" className="text-muted-foreground">
          Needs a backend. Set NEXT_PUBLIC_API_BASE_URL first.
        </Typography>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>

          {/* Not prefetched: without a session this path redirects. */}
          <Button asChild variant="outline">
            <Link href="/dashboard" prefetch={false}>
              Dashboard (needs a session)
            </Link>
          </Button>
        </div>
      </section>

      {/* Examples */}
      <section className="space-y-3">
        <Typography as="h2" variant="heading" size="xl">
          Examples
        </Typography>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/query-preview">Queries and forms</Link>
          </Button>

          <Button asChild variant="outline">
            <Link href="/zustand-preview">Client state</Link>
          </Button>

          <Button asChild variant="outline">
            <Link href="/ui-preview">Typography and buttons</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
