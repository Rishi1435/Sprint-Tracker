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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6366f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d14" },
  ],
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
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function(){
            try {
              var theme = localStorage.getItem('theme');
              if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              }
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
