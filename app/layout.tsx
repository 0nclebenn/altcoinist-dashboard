import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Altcoinist Support Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} bg-gray-950 text-gray-100`}>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 ml-56 overflow-auto">{children}</main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
