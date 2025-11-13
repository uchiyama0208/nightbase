import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nightbase",
    template: "%s | Nightbase"
  },
  description: "Nightbase official website built with Next.js 16.",
  metadataBase: new URL("https://nightbase.io")
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container">
            <span className="logo">Nightbase</span>
            <nav className="nav">
              <a href="#features">Features</a>
              <a href="#technology">Technology</a>
              <a href="#contact">Contact</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="container">
            <p>© {new Date().getFullYear()} Nightbase. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
