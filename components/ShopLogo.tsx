export function ShopLogo({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const cls =
    size === "lg" ? "w-12 h-12" :
    size === "sm" ? "w-6 h-6" :
    "w-8 h-8";

  return (
    <svg
      className={`${cls} ${className} shrink-0`}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Verdant Logo"
    >
      <path
        d="M20 38C20 38 4 30 4 18C4 12.477 8.477 8 14 8H20V38Z"
        fill="#4CAF50"
      />
      <path
        d="M20 30C20 30 36 22 36 10C36 4.477 31.523 0 25 0H20V30Z"
        fill="#2E7D32"
      />
      <circle cx="10" cy="30" r="3" fill="#4CAF50" opacity="0.4" />
    </svg>
  );
}
