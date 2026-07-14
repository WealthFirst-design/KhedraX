Before writing any code in this repo, read:
- /KHEDRAX_CONSTITUTION.md — non-negotiable architectural rules
- /SYSTEM_ARCHITECTURE.md — engine map, dependency graph, ownership matrix

These two documents govern every engineering decision in KhedraX. Consult
them before making any architectural choice that isn't already spelled out
in the work package you've been given.

## How to use the work packages

Each `/docs/work-packages/WORK_PACKAGE_NN.md` is implementation-ready: it
specifies the engineering objective, folder structure, interfaces,
inputs/outputs, validation rules, edge cases, and acceptance criteria.
It contains every decision you need. Do not:
- invent folder structures, interfaces, or engines not listed in it
- implement a *later* work package's scope early, even if it seems easy
  (e.g. don't deepen a stub engine unless the current work package says to)
- add configuration options, CLI flags, or files "while you're in there"
  that the work package doesn't call for

## Hard rules from the Constitution (most likely to be violated by habit)

- The CLI never contains business logic (Constitution #2).
- Nothing is hardcoded that can be filesystem/registry data — no closed
  TypeScript union types for agent types, modules, or personas
  (Constitution #3).
- Every engine's "Never" list in `SYSTEM_ARCHITECTURE.md`'s Ownership
  Matrix is a hard constraint, not a suggestion.
- No `TODO`, `PLACEHOLDER`, or silent stub function bodies — a v1 "thin"
  engine implementation must be real and documented as intentional, not a
  no-op (Constitution #10).
- Generated projects must never reference KhedraX at runtime — no imports,
  no `package.json` dependency, no comment mentioning the generator
  (Constitution #14).

## If something seems to conflict

If a work package's instructions seem to require violating the Constitution
or an engine's ownership boundary, stop and flag it in a comment or PR
description rather than silently resolving the conflict yourself.
