# Structural audit closure v2

This branch is the clean continuation of the repository cleanup/audit closure after the previous audit branch diverged.

## First database gate correction

The canonical backend E2E now treats the organization-wide `complete_lesson` rule as an explicit product invariant rather than unexpected ledger drift.

The test requires:

- exactly one active/published `complete_lesson` rule for the organization;
- trigger `learning.activity.completed`;
- exactly `+5` points;
- final balance to include diagnostic points + fixture journey rules + lesson completion points;
- final ledger count/sum to include the lesson completion entry as well.

This preserves the product rule while restoring a correct reproducibility contract.
