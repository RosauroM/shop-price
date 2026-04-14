"use client";

import Link from "next/link";
import { ShopLogo } from "@/components/ShopLogo";
import { useAuth } from "@/app/providers";

export function AdminHeader() {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-black/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <ShopLogo size="md" />
            <span className="font-bold text-white text-lg tracking-tight uppercase">
              Premia
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border border-white/10 px-2 py-0.5 rounded-sm">
              Admin
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-5">
          {user ? (
            <>
              <Link
                href="/admin/dashboard"
                className="hidden sm:inline-flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-bold px-4 py-2 rounded-full transition-all duration-200"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/categories"
                className="hidden sm:inline-flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-bold px-4 py-2 rounded-full transition-all duration-200"
              >
                Categories
              </Link>
              <Link
                href="/admin/discounts"
                className="hidden sm:inline-flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 text-xs font-bold px-4 py-2 rounded-full transition-all duration-200"
              >
                Bulk Discounts
              </Link>
              <Link
                href="/"
                className="hidden sm:inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold px-4 py-2 rounded-full transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                View Storefront
              </Link>
              <div className="w-px h-6 bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt={user.displayName ?? ""} className="w-8 h-8 rounded-full border border-white/10" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-gray-400 text-xs font-bold select-none">
                    {(user.displayName?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => signOut()}
                  className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                  </svg>
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
            >
              ← Storefront
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}