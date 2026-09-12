import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppShell } from "@/components/layout/AppShell";
import { ThemeSync } from "@/components/layout/ThemeSync";
import { STORAGE_KEY } from "@/store/useAppStore";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ApplyPath — job application organizer",
    template: "%s · ApplyPath",
  },
  description:
    "Track every application, tailor your resume per role, and log every reply. Your data stays in your browser.",
  applicationName: "ApplyPath",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a10" },
  ],
};

/**
 * Applies the saved theme during HTML parsing so there is no light-mode flash
 * before React hydrates. Reads the same localStorage key the store persists to.
 */
const themeBootstrap = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    var preference = "system";
    if (stored) {
      var parsed = JSON.parse(stored);
      preference = (parsed && parsed.state && parsed.state.settings && parsed.state.settings.theme) || "system";
    }
    var dark = preference === "dark" ||
      (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } catch (error) {
    document.documentElement.dataset.theme = "light";
  }
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full">
        <ThemeSync />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
