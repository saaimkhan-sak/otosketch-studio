"use client";

import { useState } from "react";
import { FieldLabel, Textarea } from "@/components/ui/Field";

interface NoteInputProps {
  note: string;
  onChange: (note: string) => void;
  characterLimit?: number;
}

export function NoteInput({ note, onChange, characterLimit = 12_000 }: NoteInputProps) {
  const [expanded, setExpanded] = useState(false);
  const showCharacterCount = note.length >= characterLimit * 0.8;

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <FieldLabel htmlFor="synthetic-note">Operative note</FieldLabel>
        {showCharacterCount ? (
          <span className="text-xs text-slate-500">
            {note.length.toLocaleString()} / {characterLimit.toLocaleString()}
          </span>
        ) : null}
      </div>
      <Textarea
        id="synthetic-note"
        className={expanded ? "min-h-56" : "h-36 min-h-36"}
        value={note}
        maxLength={characterLimit}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="text-sm font-semibold text-[#35615a] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#35615a]"
        aria-expanded={expanded}
        aria-controls="synthetic-note"
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? "Show less note" : "Expand note"}
      </button>
    </div>
  );
}
