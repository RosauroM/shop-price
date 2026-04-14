import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers";
import { ScrollToTop } from "@/components/ScrollToTop";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Premia - E-Commerce",
  description: "Modern E-Commerce Shop",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-black text-gray-100">
        {/* Global Ambient Background */}
        <div 
          className="fixed inset-0 pointer-events-none z-0" 
          style={{
            background: `
              radial-gradient(circle at 15% 50%, rgba(59, 130, 246, 0.08), transparent 50%),
              radial-gradient(circle at 85% 30%, rgba(168, 85, 247, 0.08), transparent 50%),
              radial-gradient(circle at 50% 100%, rgba(6, 182, 212, 0.08), transparent 50%)
            `
          }}
        />
        <AuthProvider>
          <div className="flex-1 relative z-10 flex flex-col min-h-screen selection:bg-blue-500/30 selection:text-blue-200">
            {children}
          </div>
          <ScrollToTop />
        </AuthProvider>
      </body>
    </html>
  );
}
