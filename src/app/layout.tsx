import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { AppFrame } from "@/components/layout/AppFrame";
import { ThemeSync } from "@/components/layout/ThemeSync";
import { STORAGE_KEY } from "@/store/useAppStore";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-jakarta",
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
    { media: "(prefers-color-scheme: light)", color: "#fdfbff" },
    { media: "(prefers-color-scheme: dark)", color: "#111318" },
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
    var preference = "dark";
    var atmosphere = "apple";
    var settings = null;
    if (stored) {
      var parsed = JSON.parse(stored);
      settings = parsed && parsed.state && parsed.state.settings;
      preference = (settings && settings.theme) || "dark";
      atmosphere = (settings && settings.atmosphere) || "apple";
    }
    if (atmosphere !== "terminal" && atmosphere !== "apple" && atmosphere !== "image") atmosphere = "apple";
    var dark = preference === "dark" ||
      (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.atmosphere = atmosphere;
    var dim = settings && settings.atmosphereDim;
    dim = typeof dim === "number" ? dim : 55;
    if (dim < 0) dim = 0;
    if (dim > 100) dim = 100;
    document.documentElement.style.setProperty("--atmosphere-dim", String(dim / 100));
    var image = settings && settings.atmosphereImage;
    if (atmosphere === "image" && image) {
      document.documentElement.style.setProperty("--atmosphere-image", "url(" + JSON.stringify(image) + ")");
    }
  } catch (error) {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.dataset.atmosphere = "apple";
  }
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="h-full overflow-hidden">
        <ThemeSync />
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
