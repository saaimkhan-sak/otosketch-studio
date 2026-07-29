"use client";

import { syntheticCases } from "@/fixtures/syntheticCases";
import { FieldLabel, Select } from "@/components/ui/Field";

interface ExampleCasePickerProps {
  selectedCaseId: string;
  onSelect: (caseId: string) => void;
}

export function ExampleCasePicker({ selectedCaseId, onSelect }: ExampleCasePickerProps) {
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor="example-case">Example case</FieldLabel>
      <Select id="example-case" value={selectedCaseId} onChange={(event) => onSelect(event.target.value)}>
        {syntheticCases.map((fixture) => (
          <option key={fixture.id} value={fixture.id}>
            {fixture.title}
          </option>
        ))}
      </Select>
    </div>
  );
}
