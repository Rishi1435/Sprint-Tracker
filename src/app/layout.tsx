import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { UserProvider } from "@/lib/UserContext";

export const metadata: Metadata = {
  title: "Sprint Room — 21-Day Job Prep Tracker",
  description:
    "A shared 21-day checklist for aptitude, reasoning, verbal, CS fundamentals, Java and DSA — track your own progress and your squad's.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
      <body className="antialiased min-h-screen">
        <UserProvider>
          <NavBar />
          <main className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 xl:px-12 pb-24 pt-6">
            {children}
          </main>
        </UserProvider>
      </body>
    </html>
  );
}
