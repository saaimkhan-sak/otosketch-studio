import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-[#123b3a] text-white hover:bg-[#0d302f] focus-visible:outline-[#123b3a]",
        variant === "secondary" && "border border-[#ccd8d4] bg-white text-[#17302d] hover:bg-[#f1f6f3] focus-visible:outline-[#35615a]",
        variant === "danger" && "bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700",
        className,
      )}
      {...props}
    />
  );
}
