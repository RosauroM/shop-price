import { ShopLogo } from "@/components/ShopLogo";

export function StorefrontFooter() {
  return (
    <footer className="border-t border-white/5 relative z-10 bg-black/40 backdrop-blur-xl mt-auto">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShopLogo size="sm" />
          <div>
            <p className="text-sm font-bold text-white tracking-tight">PREMIA</p>
            <p className="text-xs text-gray-500 mt-0.5">Premium articles, transparent pricing.</p>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Premia &nbsp;·&nbsp; All prices include VAT
        </p>
      </div>
    </footer>
  );
}