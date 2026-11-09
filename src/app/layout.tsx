import type { Metadata } from "next";

import { monoFont, primaryFont, secondaryFont } from "@/lib/fonts";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next.js Boilerplate",
  description: "Reusable frontend starter",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={[
        primaryFont.variable,
        secondaryFont.variable,
        monoFont.variable,
        "h-full antialiased",
      ].join(" ")}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
