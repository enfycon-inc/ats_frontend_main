import { APP_BRAND } from "@/lib/app-brand";
import { LoadingProvider } from "@/contexts/LoadingContext";
import type { Metadata } from "next";
import "./globals.css";
// next/font/google (Inter) removed: it makes a live HTTPS call to fonts.googleapis.com
// at build time, which is blocked in the GitHub Actions docker-container buildx environment.
// App and grid typography share the concrete system UI stack in globals.css.
// No remote font download is required for rendering or production builds.

export const metadata: Metadata = {
  title: `${APP_BRAND.name} - Recruitment Platform`,
  description: `${APP_BRAND.name} — a product of ${APP_BRAND.companyName}`,
  metadataBase: new URL("https://enfysync.com"),
  openGraph: {
    title: `${APP_BRAND.name} - Recruitment Platform`,
    description: "A modern, responsive Applicant Tracking System built with Next.js, Tailwind CSS, and ShadCN UI.",
    url: "https://enfysync.com",
    siteName: APP_BRAND.name,
    images: [
      {
        url: "https://enfysync.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: `${APP_BRAND.name} preview`,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_BRAND.name} - Recruitment Platform`,
    description: "A modern, responsive Applicant Tracking System built with Next.js, Tailwind CSS, and ShadCN UI.",
    images: ["https://enfysync.com/og-image.jpg"],
  },
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden overflow-y-hidden">
      <body suppressHydrationWarning className="antialiased overflow-x-hidden overflow-y-hidden">
        <LoadingProvider>
          {children}
        </LoadingProvider>
      </body>
    </html>
  );
}
