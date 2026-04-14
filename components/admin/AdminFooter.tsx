import Link from "next/link";

export function AdminFooter() {
  return (
    <footer className="border-t border-white/5 mt-auto relative z-10 bg-black/40 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
        <span className="text-[11px] text-gray-500 uppercase tracking-widest font-bold">Admin Dashboard</span>
        <Link href="/" className="text-[11px] text-gray-500 hover:text-white uppercase tracking-widest transition-colors font-bold">
          View Storefront ↗
        </Link>
      </div>
    </footer>
  );
}