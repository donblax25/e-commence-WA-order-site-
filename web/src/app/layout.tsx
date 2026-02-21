import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "WA Commerce",
  description: "WhatsApp integrated e-commerce app"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-sand text-ink">
        <header className="sticky top-0 z-20 border-b border-clay/60 bg-sand/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-xl font-semibold">WA Commerce</Link>
            <nav className="flex items-center gap-4">
              <Link href="/cart">Cart</Link>
              <Link href="/admin">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-60px)] max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
