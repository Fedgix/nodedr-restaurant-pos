import { Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
export function Logo({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      role="img"
      aria-label="Fedgix Restaurant OS"
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white",
        className,
      )}
    >
      <Utensils size={size * 0.6} />
    </span>
  );
}
