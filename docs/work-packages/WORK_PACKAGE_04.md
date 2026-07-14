# KhedraX Work Package #4
### Module Engine expansion — discord, email, github, rag

Governing documents: `KHEDRAX_CONSTITUTION.md` v1.0, `SYSTEM_ARCHITECTURE.md` v1.0,
`WORK_PACKAGE_01.md`, `WORK_PACKAGE_02.md`, `WORK_PACKAGE_03.md`. This
prompt is implementation-ready. Do not make architectural decisions —
every decision has already been made in the governing documents.

Unlike Work Packages #2 and #3, this package should require **zero changes
to any engine's source code.** Module Engine, Persona Engine, Prompt
Engine, Template Engine, and Packaging Engine were all built to be generic
over an arbitrary set of modules discovered from `modules/` — per
Constitution #3 ("nothing is hardcoded that can be data") and Constitution
#13 ("composition over specialization"). This package is the test of that
promise: four new modules, added entirely as data, with no code changes.
If implementing this package turns out to require touching engine source
code, stop and report exactly why — that's a signal the earlier work
packages left a gap, not something to route around silently.

---

## 1. Engineering Objective

Add four new real modules — `discord`, `email`, `github`, `rag` — each
following the exact structure and data shape the `memory` module already
established in Work Package #1/#2/#3: `module.json` (with `capabilities`
and `constraints`), `implementation/`, `configuration/`, `prompts/fragment.md`
(+ `prompts/fragment.meta.json`), `tests/`. Wire `rag` into the existing
`research` agent type's `defaultModules` (mirroring how `customer-support`
already defaults to `memory`), and prove all five modules (the four new
ones plus `memory`) compose correctly together in a single generation with
no collisions.

## 2. Why This Exists

Work Package #1 built the Module Engine generically; every work package
since has only ever exercised it with one real module. This is the first
real test of composition at scale — multiple modules' `implementation/`,
`configuration/`, `prompts/`, and `tests/` all merging into one project
simultaneously, multiple modules' constraints and capabilities all flowing
through Persona Engine's dedup logic, and multiple modules' prompt
fragments all composing through Prompt Engine's default-section ordering
(Work Package #3 §6: priority descending, then module name ascending).
This is also where a namespace collision would first become visible if
Work Package #1 Fix Pass's per-module namespacing (`tempDir/<entry>/<moduleName>/`)
had any remaining gaps — it's Module Engine's original untested edge case
(WP1 §7: "two modules writing to the same relative path") finally exercised
for real.

## 3. Architecture Boundaries

- Every module gets its own directory under `modules/`; nothing about a
  specific module's identity may leak into any engine's source code.
- Follow the memory module's exact file shape. Do not invent a different
  module.json field or file layout for these four — consistency matters
  more here than any one module's specific realism.
- Do not add a hardcoded `path` field to any new `module.json` — the
  registry loader overwrites it at load time regardless (Module Registry's
  established behavior), and a hardcoded absolute path in a checked-in file
  is misleading even though harmless. Omit it entirely in the new files
  (the existing `memory/module.json`'s hardcoded `path` is a pre-existing
  minor wart — leave it alone, don't fix it as part of this package,
  that's unrelated scope).
- None of these four modules should set `requiresMemory: true` — they're
  independent integrations, not extensions of the memory module. Coupling
  them would violate composition-over-specialization (Constitution #13).

## 4. Folder Structure to Create

```
khedrax/
├── modules/
│   ├── discord/
│   │   ├── module.json
│   │   ├── implementation/README.md
│   │   ├── configuration/default.json
│   │   ├── prompts/fragment.md
│   │   ├── prompts/fragment.meta.json
│   │   └── tests/README.md
│   ├── email/
│   │   └── (same shape)
│   ├── github/
│   │   └── (same shape)
│   └── rag/
│       └── (same shape)
├── agentTypes/
│   └── research/agentType.json   (MODIFY: add "defaultModules": ["rag"])
└── tests/unit/
    └── moduleExpansion.test.ts   (NEW — see §7)
```

## 5. Data for Each Module

**`modules/discord/module.json`:**
```json
{
  "name": "discord",
  "version": "1.0.0",
  "capabilities": [
    "Send and receive messages in Discord text channels.",
    "React to and moderate messages within a Discord server."
  ],
  "constraints": [
    "Never DM a user without an explicit trigger from that user.",
    "Never delete or moderate messages outside channels the agent has been explicitly granted access to."
  ]
}
```
`configuration/default.json`: `{ "intents": ["GUILD_MESSAGES", "MESSAGE_CONTENT"], "commandPrefix": "!" }`
`prompts/fragment.md`: `This module provides Discord integration scaffolding: sending messages, reading channel context, and responding to configured triggers.`

**`modules/email/module.json`:**
```json
{
  "name": "email",
  "version": "1.0.0",
  "capabilities": [
    "Send and receive email messages on behalf of the agent.",
    "Parse incoming email threads for relevant context."
  ],
  "constraints": [
    "Never send an email without a clear, agent-appropriate subject and sender identity.",
    "Never forward or expose the full content of a private email thread to an unrelated recipient."
  ]
}
```
`configuration/default.json`: `{ "provider": "smtp", "fromAddressPlaceholder": "agent@example.com" }`
`prompts/fragment.md`: `This module provides email scaffolding: composing, sending, and parsing email messages relevant to the agent's task.`

**`modules/github/module.json`:**
```json
{
  "name": "github",
  "version": "1.0.0",
  "capabilities": [
    "Read repository issues, pull requests, and file contents.",
    "Create or comment on issues and pull requests."
  ],
  "constraints": [
    "Never push directly to a protected branch.",
    "Never merge a pull request without an explicit instruction to do so."
  ]
}
```
`configuration/default.json`: `{ "defaultBranch": "main", "requireApprovalForMerge": true }`
`prompts/fragment.md`: `This module provides GitHub integration scaffolding: reading repository state and interacting with issues and pull requests.`

**`modules/rag/module.json`:**
```json
{
  "name": "rag",
  "version": "1.0.0",
  "capabilities": [
    "Retrieve relevant passages from a configured knowledge base to ground responses.",
    "Cite retrieved sources when answering questions."
  ],
  "constraints": [
    "Never present retrieved content as the agent's own knowledge without attribution.",
    "Never fabricate a citation for content that was not actually retrieved."
  ]
}
```
`configuration/default.json`: `{ "vectorStore": "in-memory", "topK": 5 }`
`prompts/fragment.md`: `This module provides retrieval-augmented generation scaffolding: querying a configured knowledge base and grounding responses in retrieved passages.`

**Every module's `prompts/fragment.meta.json`:**
```json
{ "section": "instructions", "priority": 0, "exclusive": false }
```
(matches the memory module's existing metadata exactly — all five modules
share the default section, which is the realistic case; none of these
integrations have a structural reason to claim a custom section or
exclusivity in v1)

**Every module's `implementation/README.md` and `tests/README.md`:**
Word these the same way Work Package #1 Fix Pass's Bug #10 asked for the
memory module's wording to be — e.g. `Discord module v1 scaffold —
configuration and prompt fragment only; no runtime implementation yet.` —
**not** the word "placeholder" (Constitution #10). Note: the existing
`memory/implementation/README.md` and `memory/tests/README.md` still say
"placeholder" from before that fix was ever applied to module data
specifically — you may fix those two files' wording as part of this
package for consistency, since you're already establishing the pattern for
four new modules, but it's optional and not a blocking acceptance
criterion.

**`agentTypes/research/agentType.json`** — change `"defaultModules": []` to
`"defaultModules": ["rag"]`.

## 6. What NOT to build

- No actual Discord/email/GitHub/vector-database client code, API
  integration, or credentials handling. This is scaffold-only, matching
  every other module's v1 scope (Constitution #10 — thin-but-real, not a
  fake promise of functionality that doesn't exist).
- No new agent types beyond wiring `research` → `rag`. Do not add
  `discordModerator` or other types from the original product examples —
  that's out of scope for a module-data package (Constitution #11).
- No engine code changes (see the framing note at the top of this document).

## 7. Required Test: multi-module composition

Add `tests/unit/moduleExpansion.test.ts` that generates one project with
**all five modules together** (`memory`, `discord`, `email`, `github`,
`rag`) via `createAgent()` — the real CLI path, not a synthetic registry —
and asserts:

1. Generation succeeds (no collision errors from Module Engine).
2. `agent.yaml`'s `modules:` list contains all five, in the order requested.
3. `implementation/`, `configuration/`, `tests/` each contain five
   module-namespaced subdirectories (one per module), confirming Work
   Package #1 Fix Pass's namespacing still holds at this scale.
4. `prompts/README.md`'s `## Capabilities` section contains all ten
   capability lines (two per module).
5. `prompts/README.md`'s `## Instructions` section contains all five
   modules' fragments, ordered alphabetically by module name (all five
   share `priority: 0` and the default section, so Work Package #3 §6's
   tie-break rule — module name ascending — determines the order:
   `discord, email, github, memory, rag`).
6. `prompts/README.md`'s `## Constraints` section contains all constraints
   from all five modules plus (if a persona is active) the persona's own
   constraints, all deduped per Work Package #2 §6 — verify no duplicate
   constraint strings appear even though this wasn't previously tested with
   more than one module contributing constraints.

## 8. Acceptance Criteria

1. `khedrax create ResearchBot --type research --force` (no `--modules`
   flag — relying on the new `research` → `rag` default) produces an
   `agent.yaml` with `modules:\n  - rag`. Paste the actual file content.
2. `khedrax create FullStackBot --type basic --modules
   memory,discord,email,github,rag --force` succeeds and produces a project
   with all five modules' files correctly namespaced and merged — paste the
   directory listing of `implementation/`, `configuration/`, and `tests/`
   showing five subdirectories each.
3. The multi-module composition test from §7 passes.
4. `npm test` and `npm run typecheck` both pass — paste raw terminal output
   directly (per the established pattern from the last two rounds) rather
   than re-zipping, since that's proven to avoid the recurring
   `node_modules` packaging gap.
5. No file under `khedrax/src/engines/`, `khedrax/src/generation/`,
   `khedrax/src/persona/`, or `khedrax/src/prompt/` was modified by this
   package. Confirm with `git diff --stat` scoped to those directories
   showing no output.

