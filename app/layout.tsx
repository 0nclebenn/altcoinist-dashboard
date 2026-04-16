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
        <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
          <div className="flex">
            <Sidebar />
            <main className="flex-1 ml-56 p-8 min-h-screen">{children}</main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
