# Evaluation Plan

The MVP should be evaluated on synthetic tympanoplasty and ossiculoplasty cases before any broader clinical workflow is considered.

Core metrics:

- Critical field extraction accuracy for laterality, incus state, incus-stapes joint state, stapes state, reconstruction type, and graft type.
- False-positive rendered facts not supported by source text.
- Percentage of rendered features with evidence quotes.
- Surgeon correction time per synthetic case.
- Surgeon acceptability of the simplified diagram.
- Export correctness and disclaimer visibility.

Critical failures:

- Wrong laterality.
- Invented repair.
- Invented normal anatomy from silence.
- PORP/TORP/bone cement confusion.
- Possible PHI allowed through a cloud mode.
- Approved export with unresolved critical ambiguity.

The narrow v0 should not expand until unsupported inference is effectively zero on the synthetic evaluation set.

Run the current local synthetic-corpus evaluator with:

```bash
pnpm evaluate:synthetic
```
