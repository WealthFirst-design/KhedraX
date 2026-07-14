# KhedraX Work Package #1 — Fix Pass
### Resolves review findings before Work Package #2/#3 proceed

Governing documents: `KHEDRAX_CONSTITUTION.md` v1.0, `SYSTEM_ARCHITECTURE.md` v1.0,
`WORK_PACKAGE_01.md`. This is not new scope — it is a correctness pass against
requirements already specified in Work Package #1 that the current
implementation does not meet. Do not add functionality beyond what's listed
here, and do not begin Work Package #2/#3 scope (Persona/Prompt depth) in
this pass.

Each item below is a real bug or a missing requirement found by inspecting
the actual code, not a style preference. Fix them in the order listed —
later items depend on earlier ones being correct.

---

## Bug 1 (blocking): CLI bypasses the Workflow Engine entirely

**Problem:** `src/cli/commands/create.ts` calls `GenerationEngine` directly.
`runWorkflow`, `Checkpoint`, `loadCheckpoint`/`saveCheckpoint`, and
`createAgentWorkflow.ts` exist but are only exercised by the e2e test — the
real CLI path never checkpoints anything, and `--resume` doesn't exist as a
flag. This breaks the CLI → Workflow Engine → Generation Engine dependency
graph from `SYSTEM_ARCHITECTURE.md`.

**Fix:**
- Delete the bespoke, hardcoded `createAgentWorkflow.ts` (it hardcodes
  `name: 'SupportBot'`) — replace it with a generic `buildCreateAgentStep(options: CreateAgentOptions): WorkflowStep` factory that closes over real CLI options instead of hardcoded values.
- `commands/create.ts` must: build a `Checkpoint` (load an existing one via
  `loadCheckpoint(buildId)` if `--resume <buildId>` was passed, otherwise
  create a fresh one with a new `buildId`), call `runWorkflow([buildCreateAgentStep(options)], checkpoint)`, then `saveCheckpoint` after each step completes (this belongs inside `runWorkflow`, not bolted on after — modify `runWorkflow` in `workflow/runner.ts` to call `saveCheckpoint` after every successful step, not just return the final checkpoint object).
- `src/cli/bin/khedrax.ts` must parse `--resume <buildId>`, `--force`, `--modules <a,b,c>`, and `--verbose` — none of these are currently read from `argv`. `--modules` should split on `,` and trim whitespace.

## Bug 2 (blocking, data-loss risk): Packaging Engine unconditionally deletes existing output

**Problem:** `packagingEngine.ts` runs `fs.rm(outputPath, { recursive: true, force: true })` unconditionally before renaming, regardless of whether the caller passed `--force`. Combined with `--force` not being parsed by the CLI at all, every second `khedrax create` run silently destroys the first.

**Fix:**
- Add a `force: boolean` field to `PackagingOptions`.
- Before removing `outputPath`, check `fs.stat(outputPath)`. If it exists
  and is non-empty and `force` is `false`, throw a clear error (`Output path already exists: ${outputPath}. Use --force to overwrite.`) and do not touch the existing directory.
- This check must happen in Packaging Engine (it's the only engine that
  writes to `outputDir`, per the ownership matrix) — do not duplicate this
  check in the CLI or Validation Engine as the actual enforcement point,
  though Validation Engine may still emit an early warning (see Bug 6).

## Bug 3 (blocking for WP3): Module prompt fragments are never found

**Problem:** `moduleEngine.ts` copies a module's `prompts/` directory
straight into `tempDir/prompts/`. `promptEngine.ts` looks for fragments at
`tempDir/prompts/<moduleName>/fragment.md` — a path that never exists, so
every fragment read silently fails.

**Fix — pick the namespaced-copy approach, not the flat-read approach**
(namespacing is required regardless, since two modules could otherwise
collide on `fragment.md`):
- In `moduleEngine.ts`, copy each module's `implementation/`, `configuration/`,
  `prompts/`, and `tests/` into `tempDir/<entry>/<moduleName>/` instead of
  directly into `tempDir/<entry>/`. Example: `memory` module's
  `prompts/fragment.md` lands at `tempDir/prompts/memory/fragment.md`.
- Update `promptEngine.ts`'s read path only if needed to match — it should
  already expect `tempDir/prompts/<moduleName>/fragment.md`, so this is
  primarily a Module Engine fix, not a Prompt Engine fix.
- This also resolves Bug 5 below for free (collision detection becomes
  structural — two modules can no longer collide on the same relative path
  because each gets its own namespaced subfolder).

## Bug 4 (blocking): `agent.yaml` is permanently incorrect

**Problem:** `templates/agent-base/agent.yaml.template` has unsubstituted
`{{buildId}}`, `{{description}}`, `{{version}}` placeholders, and hardcodes
`modules: []`. `templateEngine.ts`'s substitution only replaces `{{name}}`
and `{{type}}`.

**Fix:**
- Extend `agent.yaml.template`'s placeholder set to include everything
  Template Engine will substitute: `{{buildId}}`, `{{description}}`,
  `{{version}}`, and `{{modules}}` (rendered as a YAML list, not `[]`).
- Update `templateEngine.ts`'s substitution to replace all of: `{{name}}`,
  `{{type}}`, `{{buildId}}`, `{{description}}` (fall back to empty string
  if `dna.description` is undefined), `{{version}}`, and `{{modules}}`
  (render as `- moduleName` lines, or `[]` only when the array is
  genuinely empty).
- Delete `writeAgentSpec()` from `dna/loader.ts` and its call from
  `generationEngine.ts` entirely (see Bug 5) — Template Engine becomes the
  single writer of `agent.yaml`.

## Bug 5 (architecture boundary violation): Generation Engine writes a file directly

**Problem:** `generationEngine.ts` calls `writeAgentSpec(tempDir, context.dna)`
before running any producer engine. This is template-rendering logic living
in the orchestrator, which the ownership matrix explicitly forbids
("Generation Engine ... Never: contains template rendering logic itself").
It's also dead work today since Template Engine immediately overwrites the
same file.

**Fix:** Remove the `writeAgentSpec` call from `generationEngine.ts` and the
function itself from `dna/loader.ts` (folded into Bug 4's fix — Template
Engine now owns writing `agent.yaml` exclusively, from the very first write).

## Bug 6 (missing requirement): No Node.js version guard

**Fix:** Add a check at the top of `src/cli/bin/khedrax.ts` — if
`process.versions.node` major version is `< 18`, print a clear error and
`process.exit(1)` before any other work happens.

## Bug 7 (missing requirement): No pre-existing-output check surfaced early

**Fix:** In `validateDna.ts`, add a **warning** (not an error — Packaging
Engine is the actual enforcement point per Bug 2) when the target output
path already exists and `--force` was not passed, so the CLI can print a
helpful message before doing any generation work at all, rather than
failing only at the very last step.

## Bug 8 (code quality): Self-referential type imports

**Problem:** `packagingEngine.ts` and `workflow/runner.ts` each contain
`import type { X } from './same-file.ts'` while also declaring `X` locally
in that file. Harmless under `--experimental-strip-types` but would fail a
real `tsc --noEmit` check.

**Fix:** Delete the self-import line in both files. Add `"typecheck": "tsc --noEmit"` to `package.json` scripts and run it as part of CI/`npm test` going forward, so this class of bug is caught automatically rather than by manual review.

## Bug 9 (naming/structure deviation from WP1 §4)

**Fix:** Split `src/registry/agentTypeRegistry.ts` into `agentTypeRegistry.ts`
(agent type discovery only) and `moduleRegistry.ts` (module discovery only),
matching the folder structure specified in Work Package #1. Keep
`getRegistrySnapshot()` as a thin composition of both in a shared location
(e.g. `registry/index.ts`) so callers don't need to change their imports.

## Bug 10 (minor, confirm intent): "placeholder" wording in module stub docs

`modules/memory/implementation/README.md` and `.../tests/README.md`
literally contain the word "placeholder." Reword these to describe the
memory module's v1 scope as intentional and thin (mirroring how the work
packages describe v1 pass-through engines), e.g. "Memory module v1 scaffold
— configuration and prompt fragment only; no runtime implementation yet."
This isn't a functional bug, but "placeholder" is the exact word Constitution
#10 singles out.

---

## Required regression tests (add all of these — do not just fix silently)

1. **Resume test:** start a `create` run, kill it after the `module` step
   completes (simulate by manually invoking the workflow step functions up
   to that point and stopping), then resume via the same `buildId`. Assert
   the final output is byte-identical (checksum) to a non-interrupted run
   with the same DNA.
2. **Double-run-without-force test:** run `create` once successfully, run it
   again with the same name and no `--force`, assert it throws before
   touching the output directory, and assert the first run's files are
   unchanged (checksum comparison before/after the second attempt).
3. **Double-run-with-force test:** same as above but with `--force`, assert
   the second run's output replaces the first cleanly.
4. **New-agentType-discovery test:** in a temp copy of the repo (or a temp
   `agentTypes/` override directory, whichever the current `getRegistrySnapshot(rootDir)` signature supports), write a new `agentType.json` at test time with no source change, and assert `khedrax create` accepts `--type` referencing it.
5. **Module prompt fragment test:** generate a project using the `memory`
   module and assert `prompts/memory/fragment.md`'s content actually appears
   in the generated `prompts/README.md` — this is the regression test for
   Bug 3, and it should have failed before the fix and pass after.
6. **agent.yaml content test:** generate a project and assert the written
   `agent.yaml` contains no `{{...}}` placeholder text anywhere, and that
   its `modules:` section matches `dna.modules` exactly, not `[]`.
7. **Node version guard test:** this one may be manual/documented rather
   than automated if mocking `process.versions.node` is awkward in the
   current test setup — but confirm it's covered one way or the other.

## Acceptance Criteria (re-verifies WP1 §9, scored against the review)

1. AC#1 passes on inspection, not just a truthy check: generated `agent.yaml`
   is fully substituted and its `modules:` list matches DNA exactly.
2. AC#5 passes: kill-and-resume produces checksum-identical output to a
   non-interrupted run.
3. AC#6 passes: double-run without `--force` leaves the first run's files
   byte-for-byte unchanged and exits non-zero.
4. AC#4 has a real test: a new `agentTypes/` entry is usable with zero
   source change.
5. `npm run typecheck` (new script) passes with zero errors — proving Bug 8
   is actually fixed, not just visually removed.
6. All 7 original tests plus the 7 new regression tests above pass.
7. No occurrence of the literal string `{{` remains in any file under a
   freshly generated project's output.

