export type ArticleStatus = "active" | "scheduled" | "none";
export type DiscountStatus = "active" | "scheduled" | "expired";

export function StatusBadge({ status }: { status: ArticleStatus }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 whitespace-nowrap shadow-[0_0_10px_rgba(59,130,246,0.1)]">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        Active Discount
      </span>
    );
  }
  if (status === "scheduled") {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        Scheduled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-white/5 text-gray-400 border border-white/10 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-500/50" />
      No Discount
    </span>
  );
}

export function DiscountStatusBadge({ status }: { status: DiscountStatus }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        Active
      </span>
    );
  }
  if (status === "scheduled") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        Scheduled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/5 text-gray-500 border border-white/10">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-500/50" />
      Expired
    </span>
  );
}
