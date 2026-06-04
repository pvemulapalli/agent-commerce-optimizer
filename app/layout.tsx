import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { APP_VERSION_LABEL } from "@/lib/app-version";
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
    default: "AI Commerce Optimization Platform",
    template: `%s | ${APP_VERSION_LABEL}`,
  },
  description:
    "Commerce Optimizer helps merchants understand how AI systems discover, interpret, and interact with their storefronts — with evidence-backed findings and actionable recommendations.",
  openGraph: {
    title: "AI Commerce Optimization Platform",
    description:
      "Analyze machine-readable signals, uncover optimization opportunities, and receive evidence-backed recommendations to improve AI commerce visibility.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Commerce Optimization Platform",
    description:
      "Evidence-backed AI commerce optimization with live storefront crawls, findings, and recommended fixes.",
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    shortcut: ["/favicon.ico"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-text-primary">
        <ThemeProvider>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
