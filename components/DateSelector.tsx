"use client";

interface DateSelectorProps {
  date: string;
  today: string;
  onChange: (date: string) => void;
}

export function DateSelector({ date, today, onChange }: DateSelectorProps) {
  return (
    <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 shadow-sm w-fit backdrop-blur-sm hover:border-white/20 transition-colors">
      <svg
        className="w-4 h-4 text-gray-500 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
        />
      </svg>
      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Prices for</span>
      <input
        type="date"
        value={date}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm text-white font-bold focus:outline-none w-36 cursor-pointer [color-scheme:dark]"
      />
      {date !== today && (
        <button
          onClick={() => onChange(today)}
          className="text-[10px] uppercase tracking-widest text-blue-400 hover:text-blue-300 font-bold border-l border-white/10 pl-3 ml-1 transition-colors"
        >
          Today
        </button>
      )}
    </div>
  );
}