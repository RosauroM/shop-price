"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShopLogo } from "@/components/ShopLogo";

export function StorefrontHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-black/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3 shrink-0">
          <ShopLogo size="md" />
          <Link href="/storefront" className="font-bold text-white text-lg tracking-tight">
            PREMIA
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-10">
          <Link 
            href="/storefront" 
            className={`text-sm font-medium tracking-wide transition-colors duration-200 ${pathname === "/storefront" ? "text-white" : "text-gray-400 hover:text-white"}`}
          >
            Home
          </Link>
          <Link 
            href="/storefront/collection" 
            className={`text-sm font-medium tracking-wide transition-colors duration-200 ${pathname?.includes("/storefront/collection") ? "text-white" : "text-gray-400 hover:text-white"}`}
          >
            Collections
          </Link>
        </nav>
        <Link href="/admin" className="text-xs font-medium text-gray-400 hover:text-white transition-colors">
          Admin
        </Link>
      </div>
    </header>
  );
}