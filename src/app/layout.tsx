import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import { Suspense } from "react";
import Header from "@/components/Header";
import NavigationProgress from "@/components/NavigationProgress";
import { CHURCH } from "@/lib/church";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: CHURCH.name, template: `%s · ${CHURCH.name}` },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#234e52" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${lora.variable} flex min-h-dvh flex-col font-sans antialiased`}>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line py-6 text-center text-sm text-muted">
          © {new Date().getFullYear()} {CHURCH.name}
        </footer>
      </body>
    </html>
  );
}
