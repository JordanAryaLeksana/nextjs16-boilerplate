import Link from "next/link";

import Typography from "@/components/shared/typography";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <section className="space-y-2">
        <Typography as="h1" variant="heading" size="4xl">
          Page not found
        </Typography>

        <Typography className="text-muted-foreground">
          The page you are looking for does not exist or has moved.
        </Typography>
      </section>

      <div>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
