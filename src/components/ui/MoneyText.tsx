import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatBDT } from "@/lib/money";

type Direction = "in" | "out" | "neutral";

export function MoneyText({
  minor,
  direction = "neutral",
  showSign = true,
  className = "",
}: {
  minor: number;
  direction?: Direction;
  showSign?: boolean;
  className?: string;
}) {
  if (direction === "neutral") {
    return <span className={`amount ${className}`}>{formatBDT(Math.abs(minor))}</span>;
  }

  const isIn = direction === "in";
  const Icon = isIn ? ArrowDownLeft : ArrowUpRight;
  const tone = isIn ? "text-success-soft-foreground" : "text-danger-soft-foreground";

  return (
    <span className={`amount inline-flex items-center gap-1 font-medium ${tone} ${className}`}>
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {showSign && (isIn ? "+" : "−")}
      {formatBDT(Math.abs(minor))}
    </span>
  );
}
