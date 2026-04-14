"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import { ShopLogo } from "@/components/ShopLogo";
import Link from "next/link";

export default function AdminLogin() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace("/admin/dashboard");
  }, [loading, user, router]);

  if (loading || user) return null;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSigningIn(true);
    setError("");
    try {
      await signIn(id, password);
    } catch (err: any) {
      setError(err.message || "Sign-in failed. Please try again.");
      setSigningIn(false);
    }
  }

  return (
    <>
      {/* ── Header ── */}
      <header className="bg-black/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShopLogo size="md" />
            <span className="font-bold text-white text-lg tracking-tight uppercase">
              Premia
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border border-white/10 px-2 py-0.5 rounded-sm">
              Admin
            </span>
          </div>
          <Link
            href="/storefront"
            className="text-xs font-medium tracking-wide text-gray-400 hover:text-white transition-colors"
          >
            ← Storefront
          </Link>
        </div>
      </header>

      {/* ── Main split layout ── */}
      <main className="flex-1 flex flex-col lg:flex-row relative z-10">

        {/* Left: marketing */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-14 lg:px-20 py-16 lg:py-24 border-b lg:border-b-0 lg:border-r border-white/5 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-lg relative z-10">
            {/* Label */}
            <div className="flex items-center gap-4 mb-10">
              <div className="h-px w-10 bg-blue-500/40" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-400">
                Admin Portal
              </span>
            </div>

            <h1 className="font-extrabold text-4xl sm:text-5xl text-white leading-[1.1] tracking-tighter mb-6">
              Advanced Pricing &amp;
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 text-transparent bg-clip-text">
                Discount Management
              </span>
            </h1>

            <p className="text-sm sm:text-base text-gray-400 leading-relaxed mb-12 max-w-md">
              A focused tool for shop owners to manage article pricing, configure
              time-limited discounts, and preview customer-facing prices on any date.
            </p>
          </div>
        </div>

        {/* Right: auth card */}
        <div className="w-full lg:w-[420px] shrink-0 flex items-center justify-center px-8 sm:px-14 py-16 bg-black/40 backdrop-blur-xl border-l-0 lg:border-l border-white/5 relative z-10">
          <div className="w-full max-w-sm">
            {/* Label */}
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px w-8 bg-purple-500/40" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-purple-400">Sign in</span>
            </div>

            <h2 className="font-extrabold text-3xl text-white mb-2 tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-gray-400 mb-8">
              Access your dashboard to manage articles and discounts.
            </p>

            {error && (
              <div className="flex items-start gap-2.5 border border-red-500/30 bg-red-500/10 text-red-400 px-4 py-3 text-sm rounded-lg mb-6">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Admin ID
                </label>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="Enter ID"
                  required
                  className="w-full bg-black/50 border border-white/10 text-white text-sm font-medium px-4 py-3.5 rounded-xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-gray-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full bg-black/50 border border-white/10 text-white text-sm font-medium px-4 py-3.5 rounded-xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-gray-600"
                />
              </div>

              <button
                type="submit"
                disabled={signingIn}
                className="w-full inline-flex items-center justify-center gap-3 bg-white text-black text-sm font-bold px-8 py-3.5 rounded-xl hover:bg-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50 transition-all duration-300 mt-2"
              >
                {signingIn ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-black px-3 text-[11px] text-gray-500 uppercase tracking-wider font-bold">
                  Secure Access
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed text-center">
              This area is restricted to authorized personnel only.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
