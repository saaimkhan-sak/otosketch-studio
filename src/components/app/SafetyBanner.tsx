import { ShieldAlert } from "lucide-react";

export function SafetyBanner() {
  return (
    <div className="no-print border-b border-amber-300 bg-amber-50 px-3 py-3 text-amber-950 sm:px-4">
      <div className="mx-auto flex min-w-0 max-w-screen-2xl items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="min-w-0 text-sm leading-5">Synthetic demo — do not enter patient information.</p>
      </div>
    </div>
  );
}
