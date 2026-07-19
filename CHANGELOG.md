# KhedraX Architecture Changelog

Tracks architecture version changes, per `VERSIONING_POLICY.md`. Distinct
from KhedraX's own code release history.

## v1.0 — Locked at Work Package #9

Retroactive entry: Work Packages #1 through #9 all operated within a single
architecture version. No work package in this range required a v1.x bump
under the versioning policy's own rules, since the policy didn't exist yet
— this entry establishes v1.0 as the baseline those packages collectively
produced, effective at the versioning policy's introduction.

- **WP1** — DNA System, Registry System, Workflow Engine, Generation Engine
  (orchestrating Template Engine + Module Engine), Packaging Engine
  (minimum-viable)
- **WP1 Fix Passes** — Workflow Engine wiring, safe overwrite defaults,
  module prompt-fragment namespacing, `agent.yaml` rendering correctness
- **WP2** — Persona Engine (real implementation): persona registry,
  constraint derivation, capability mapping, behavioral profile generation
- **WP3** — Prompt Engine (real implementation): layered composition,
  conflict resolution, prompt assembly pipeline
- **WP4** — Module Engine expansion: discord, email, github, rag modules
  (data-only, zero engine changes — confirmed by review)
- **WP5** — Documentation Engine (real implementation): persona/module-aware
  root README and detailed docs/README
- **WP6** — Memory Engine (real implementation): memory backend registry,
  config resolution, module memory-requirement cross-referencing
- **WP7** — Packaging Engine (real implementation): dependency manifest,
  hardened standalone scan (leaked build-time path detection)
- **WP8** — Validation Engine: duplicate-module detection, pre-flight
  exclusive-prompt-section conflict check (shared logic with Prompt Engine)
- **WP9** — Backlog cleanup: checkpoint relocation to Workflow Engine,
  `--persona` CLI flag, js-yaml dependency verification

**Baseline frozen:** 13 engines, the dependency graph and ownership matrix
in `SYSTEM_ARCHITECTURE.md`, and `AgentDNA`'s top-level shape, all as of
this point.

---

<!--
Future entries go above this line, most recent first. Format:

## vX.Y — <one-line description>
- Work package: WP<N>
- What changed and why
-->

