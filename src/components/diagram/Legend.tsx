export function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-700">
      <span className="inline-flex items-center gap-2">
        <span className="legend-swatch border-slate-700 bg-slate-50" /> baseline anatomy
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="legend-swatch border-red-700 bg-red-50" /> finding
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="legend-swatch border-blue-700 bg-blue-50" /> repair
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="legend-swatch border-slate-400 bg-slate-100" /> not documented/unknown
      </span>
    </div>
  );
}
