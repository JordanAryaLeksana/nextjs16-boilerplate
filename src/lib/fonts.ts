import { Geist, Geist_Mono, Inter } from "next/font/google";

export const primaryFont = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-primary-loaded",
});

export const secondaryFont = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-secondary-loaded",
});

export const monoFont = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-loaded",
});
