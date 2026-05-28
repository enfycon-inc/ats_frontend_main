import { LoadingProvider } from "@/contexts/LoadingContext";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Enfysync - ATS Recruitment Platform",
  description: "Enfysync - Applicant Tracking System built with Next.js, TypeScript, ShadCN UI & Tailwind",
  metadataBase: new URL("https://enfysync.com"),
  openGraph: {
    title: "Enfysync - ATS Recruitment Platform",
    description: "A modern, responsive Applicant Tracking System built with Next.js, Tailwind CSS, and ShadCN UI.",
    url: "https://enfysync.com",
    siteName: "Enfysync",
    images: [
      {
        url: "https://enfysync.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Enfysync ATS Platform Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Enfysync - ATS Recruitment Platform",
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <LoadingProvider>
          {children}
        </LoadingProvider>
      </body>
    </html>
  );
}
