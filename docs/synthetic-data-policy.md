# Synthetic Data Policy

This prototype is synthetic-data-only.

Do not enter, commit, log, upload, or export real patient information. Do not use lightly deidentified clinical notes unless an institutional privacy process has approved that workflow.

The app includes client-side PHI-like pattern checks, but those checks are only guardrails. They are not a de-identification process and do not make the app HIPAA-compliant.

For the MVP:

- No database stores operative notes.
- Raw note text is not logged.
- Cloud extraction is disabled by default.
- Exports exclude the raw operative note.
- All bundled cases must be fictional.

Static privacy guard:

```bash
pnpm verify:privacy
```
