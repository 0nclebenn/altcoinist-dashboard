import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Sidebar from "@/components/Sidebar";
import { RoleProvider } from "@/contexts/RoleContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Altcoinist Support Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} bg-gray-950 text-gray-100`}>
          <RoleProvider>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 ml-14 overflow-auto">{children}</main>
            </div>
          </RoleProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
