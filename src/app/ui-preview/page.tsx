import Typography from "@/components/shared/typography";
import { Button } from "@/components/ui/button";

export default function UIPreviewPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-8 px-6 py-16">
      <section className="space-y-3">
        <Typography
          as="span"
          variant="paragraph"
          size="sm"
          className="text-muted-foreground"
        >
          Design System / Typography
        </Typography>

        <Typography as="h1" variant="heading" size="7xl">
          Build faster.
          <br />
          Design better.
        </Typography>

        <Typography
          as="p"
          variant="paragraph"
          size="lg"
          className="max-w-xl text-muted-foreground"
        >
          A reusable typography system for building beautiful interfaces with
          Next.js, Tailwind CSS, and shadcn/ui.
        </Typography>
      </section>

      <section className="flex flex-wrap gap-3">
        <Button>Get Started</Button>
        <Button variant="secondary">Learn More</Button>
        <Button variant="outline">Documentation</Button>
      </section>

      <section className="space-y-3 border-t pt-8">
        <Typography as="h2" variant="heading" size="3xl">
          Typography Scale
        </Typography>

        <Typography as="h3" variant="heading" size="2xl">
          Heading 2XL
        </Typography>

        <Typography variant="paragraph" size="base">
          Paragraph Base — the quick brown fox jumps over the lazy dog.
        </Typography>

        <Typography variant="paragraph" size="sm">
          Small text for descriptions and metadata.
        </Typography>
      </section>
    </main>
  );
}
