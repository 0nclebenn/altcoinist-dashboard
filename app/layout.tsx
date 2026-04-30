import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Sidebar from "@/components/Sidebar";
import { RoleProvider } from "@/contexts/RoleContext";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Altcoinist Support Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <body className={`${inter.className} bg-black text-white antialiased`}>
          <RoleProvider>
            {/* Ambient orb — page-level brand glow, sits behind every route */}
            <div
              aria-hidden="true"
              className="pointer-events-none fixed top-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full opacity-[0.05] z-0"
              style={{ background: "#38FF93", filter: "blur(150px)" }}
            />
            <div className="flex h-screen overflow-hidden relative">
              <Sidebar />
              <main className="flex-1 ml-14 overflow-auto relative z-10">{children}</main>
            </div>
          </RoleProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
