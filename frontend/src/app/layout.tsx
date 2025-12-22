import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  weight: ["400", "500", "600", "700"],
  variable: "--font-bricolage-grotesque",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Signull | Collaborative Word Game",
  description:
    "A collaborative word guessing game where teams work together to reveal secret words through clever clues and connections.",
  manifest: "/favicon/manifest.json",
  icons: {
    icon: [
      { url: "/favicon/icon1.png" },
      { url: "/favicon/icon0.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={bricolageGrotesque.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
