import type { SelectHTMLAttributes, TextareaHTMLAttributes, InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold text-[#17302d]">
      {children}
    </label>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-56 w-full rounded-md border border-[#ccd8d4] bg-white px-3 py-2 text-sm leading-6 shadow-sm outline-none transition focus:border-[#35615a] focus:ring-2 focus:ring-[#dbe9e4]",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-10 w-full rounded-md border border-[#ccd8d4] bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-[#35615a] focus:ring-2 focus:ring-[#dbe9e4]",
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-10 w-full rounded-md border border-[#ccd8d4] bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-[#35615a] focus:ring-2 focus:ring-[#dbe9e4]",
        className,
      )}
      {...props}
    />
  );
}
