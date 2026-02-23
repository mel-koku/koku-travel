import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Koku Travel - Discover Japan with Local Experts",
  description:
    "Discover curated travel guides, itineraries, and inspiration from local experts. Plan your perfect trip to Japan with personalized recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://mbjcxrfuuczlauavashs.supabase.co" />
        <link rel="preconnect" href="https://cdn.sanity.io" />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
