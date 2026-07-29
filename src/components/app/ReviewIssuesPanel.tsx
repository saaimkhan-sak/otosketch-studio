"use client";

import { AlertTriangle, CircleHelp } from "lucide-react";
import type { OperativeCase } from "@/domain/schema";

interface ReviewIssuesPanelProps {
  operativeCase: OperativeCase;
}

export function ReviewIssuesPanel({ operativeCase }: ReviewIssuesPanelProps) {
  const hasAmbiguities = operativeCase.ambiguities.length > 0;
  const hasUnsupportedClaims = operativeCase.unsupportedClaims.length > 0;

  if (!hasAmbiguities && !hasUnsupportedClaims) return null;

  return (
    <section className="surface p-5">
      <h2 className="section-heading">Review issues</h2>
      <div className="mt-4 space-y-3">
        {hasAmbiguities ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
          >
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Ambiguities
            </p>
            <ul className="mt-2 space-y-2">
              {operativeCase.ambiguities.map((ambiguity, index) => (
                <li key={`${ambiguity.message}-${index}`}>
                  <p>
                    <span className="font-medium capitalize">{ambiguity.severity}:</span>{" "}
                    {ambiguity.message}
                  </p>
                  {ambiguity.sourceText ? (
                    <blockquote className="mt-1 border-l-4 border-amber-500 pl-3 text-amber-900">
                      {ambiguity.sourceText}
                    </blockquote>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {hasUnsupportedClaims ? (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <p className="flex items-center gap-2 font-medium">
              <CircleHelp className="h-4 w-4" aria-hidden="true" />
              Unsupported claims
            </p>
            <ul className="mt-2 space-y-2">
              {operativeCase.unsupportedClaims.map((claim, index) => (
                <li key={`${claim.claim}-${index}`}>
                  <p>{claim.claim}</p>
                  <p className="mt-1 text-red-800">{claim.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
