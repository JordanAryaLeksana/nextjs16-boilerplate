import { OAuthCallback } from "@/features/auth/oauth-callback";

// The backend redirects here after an OAuth login.
export default function OAuthSuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <OAuthCallback />
    </main>
  );
}
