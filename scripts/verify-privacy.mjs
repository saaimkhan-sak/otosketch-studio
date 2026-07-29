import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";

const forbiddenPatterns = [
  { pattern: /\blocalStorage\b/, label: "localStorage" },
  { pattern: /\bsessionStorage\b/, label: "sessionStorage" },
  { pattern: /\bindexedDB\b/, label: "indexedDB" },
  { pattern: /\bconsole\.(log|info|debug|warn|error)\b/, label: "console logging" },
];

const files = [];
for await (const file of glob(["src/**/*.{ts,tsx}", "worker/src/**/*.{ts,tsx}", "functions/**/*.{ts,tsx}"], {
  exclude: ["src/tests/**"],
})) {
  files.push(file);
}

const violations = [];
for (const file of files) {
  const text = await readFile(file, "utf8");
  for (const { pattern, label } of forbiddenPatterns) {
    if (pattern.test(text)) {
      violations.push({ file, label });
    }
  }
}

if (violations.length > 0) {
  console.error(JSON.stringify({ ok: false, violations }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, scannedFiles: files.length }, null, 2));
}
