"use client";

// Shown when the root layout itself throws. It replaces the whole document, so
// it has its own <html> and <body> and cannot rely on the app's styles.
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <main role="alert">
          <h1>Something went wrong</h1>
          <p>The app could not be displayed. Try again, or come back later.</p>
          <button type="button" onClick={() => retry()}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
