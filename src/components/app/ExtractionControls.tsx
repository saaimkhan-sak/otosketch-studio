"use client";

import { Wand2 } from "lucide-react";
import type { ExtractorProvider } from "@/extractors/NoteExtractor";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Select } from "@/components/ui/Field";

interface ExtractionControlsProps {
  provider: ExtractorProvider;
  allowProviderSwitcher: boolean;
  onProviderChange: (provider: ExtractorProvider) => void;
  onGenerate: () => void;
  loading: boolean;
  disabled: boolean;
}

export function ExtractionControls({
  provider,
  allowProviderSwitcher,
  onProviderChange,
  onGenerate,
  loading,
  disabled,
}: ExtractionControlsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {allowProviderSwitcher ? (
        <details className="min-w-0">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">Advanced</summary>
          <div className="mt-3 min-w-0 flex-1 space-y-2">
            <FieldLabel htmlFor="provider">Extractor</FieldLabel>
            <Select
              id="provider"
              value={provider}
              onChange={(event) => onProviderChange(event.target.value as ExtractorProvider)}
            >
              <option value="mock">Demo expected output</option>
              <option value="rules">Simple rules</option>
              <option value="ollama">Local Ollama</option>
              <option value="cloudflare">Cloudflare Worker</option>
            </Select>
          </div>
        </details>
      ) : null}
      <Button className="w-full" type="button" disabled={disabled || loading} onClick={onGenerate}>
        <Wand2 className="h-4 w-4" aria-hidden="true" />
        {loading ? "Building diagram" : "Build diagram"}
      </Button>
    </div>
  );
}
