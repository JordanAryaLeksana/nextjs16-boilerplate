import Typography from "@/components/shared/typography";

// Shown while a page is still loading on the server.
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Typography role="status" className="text-muted-foreground">
        Loading...
      </Typography>
    </main>
  );
}
