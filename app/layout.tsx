import "./globals.css";
import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans } from "next/font/google";
import ThemeClient from "./components/ThemeClient";
import ServiceWorker from "./components/ServiceWorker";

const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const plex = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Guess Game",
  description: "Image and document flash-card challenges"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${space.variable} ${plex.variable} app-shell`}> 
        <ThemeClient />
        <ServiceWorker />
        {children}
      </body>
    </html>
  );
}
