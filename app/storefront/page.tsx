"use client";

export default function StorefrontPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative z-10 overflow-hidden border-b border-white/5 bg-transparent flex items-center justify-center min-h-screen">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 py-24 sm:py-36 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-3 mb-8 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-medium tracking-wide text-gray-300">New Collection</span>
          </div>

          <h1
            className="font-extrabold text-5xl sm:text-7xl lg:text-8xl text-white leading-[1.1] tracking-tighter mb-8 animate-fade-in-up"
            style={{ animationDelay: "100ms" }}
          >
            Elevate Your <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 text-transparent bg-clip-text">
              Everyday Lifestyle
            </span>
          </h1>

          <p
            className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-xl mx-auto mb-12 animate-fade-in-up"
            style={{ animationDelay: "200ms" }}
          >
            Discover curated products with transparent pricing, live discounts, and VAT included — absolute clarity, no surprises.
          </p>

          <a
            href="/storefront/collection"
            className="inline-flex items-center justify-center gap-3 bg-white text-black text-sm font-bold px-8 py-4 rounded-full hover:bg-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-0.5 transition-all duration-300 shrink-0 animate-fade-in-up"
            style={{ animationDelay: "300ms" }}
          >
            Explore Collection
            <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      </section>
    </>
  );
}
