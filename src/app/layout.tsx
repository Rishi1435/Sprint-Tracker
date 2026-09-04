import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import StudyTimer from "@/components/StudyTimer";
import ReactionListener from "@/components/ReactionListener";
import { UserProvider } from "@/lib/UserContext";

export const metadata: Metadata = {
  title: "Sprint Room — 21-Day Job Prep Tracker",
  description:
    "A shared 21-day checklist for aptitude, reasoning, verbal, CS fundamentals, Java and DSA — track your own progress and your squad's.",
  manifest: "/manifest.webmanifest",
  applicationName: "Sprint Room",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sprint Room",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  // No `themeColor` here on purpose. Next would emit one meta tag per
  // prefers-color-scheme branch, and the browser then picks by OS setting —
  // which is the wrong answer the moment someone toggles the theme by hand.
  // The boot script below writes a single tag instead, and ThemeToggle moves it.
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays enabled on purpose — locking it out fails WCAG 1.4.4.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function(){
            try {
              var theme = localStorage.getItem('theme');
              var dark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
              if (dark) document.documentElement.classList.add('dark');
              // One theme-color tag, owned by the app rather than the OS. The two
              // values mirror --bg in globals.css; ThemeToggle re-reads the real
              // computed value on every change, so a drift here self-corrects.
              var m = document.querySelector('meta[name="theme-color"]');
              if (!m) {
                m = document.createElement('meta');
                m.setAttribute('name', 'theme-color');
                document.head.appendChild(m);
              }
              m.setAttribute('content', dark ? '#0d0f14' : '#eef0f4');
            } catch(e){}
          })();
        `,
          }}
        />
      </head>
      <body className="antialiased min-h-dvh">
        <ServiceWorkerRegister />
        <UserProvider>
          <NavBar />
          <main className="pb-app mx-auto w-full max-w-[1600px] px-4 pt-5 sm:px-8 sm:pt-6 xl:px-12">
            {children}
          </main>
          <BottomNav />
          <StudyTimer />
          <ReactionListener />
        </UserProvider>
      </body>
    </html>
  );
}
