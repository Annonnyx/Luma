import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";

import "lenis/dist/lenis.css";
import "./globals.css";

import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { MOTION_OK_QUERY } from "@/lib/motion";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lume, des lunettes avant tout",
  description:
    "Lume dessine des lunettes classiques qui affichent, pour vous seul, ce dont vous avez besoin. Lunettes, lentilles et bague de contrôle.",
};

export const viewport: Viewport = {
  themeColor: "#e2e4e0",
  colorScheme: "light",
};

// Inline in <head> (next/script defers even `beforeInteractive` inline code to its runtime).
// Before first paint: hides intro elements, and turns on the cinematic layout when
// motion is allowed so a restored scroll position lands in the right scene.
// After 4 s, reveals the intro anyway and drops the layout if no sequence took it.
const INTRO_GATE = `(function(d){d.classList.add("js");if(matchMedia("${MOTION_OK_QUERY}").matches)d.classList.add("cinematic");setTimeout(function(){d.classList.add("intro-fallback");if(!d.hasAttribute("data-cinematic"))d.classList.remove("cinematic")},4000)})(document.documentElement);`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={archivo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_GATE }} />
      </head>
      <body>
        <a
          href="#contenu"
          className="type-caption fixed top-3 left-3 z-[100] -translate-y-24 rounded-full bg-graphite px-5 py-3 text-mineral transition-transform duration-500 ease-out-expo focus-visible:translate-y-0"
        >
          Aller au contenu
        </a>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
