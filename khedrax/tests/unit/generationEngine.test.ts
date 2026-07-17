import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GenerationEngine } from '../../src/generation/generationEngine.ts';
import { getRegistrySnapshot } from '../../src/registry/index.ts';
import { buildAgentDNA } from '../../src/dna/loader.ts';
import { createAgent } from '../../src/cli/commands/create.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const khedraxRoot = path.resolve(repoRoot, 'khedrax');

test('Generation engine wires all producer engines in the required order', async () => {
  const registry = await getRegistrySnapshot(khedraxRoot);
  const dna = await buildAgentDNA({
    name: 'SupportBot',
    type: 'customer-support',
    outputDir: '/tmp/khedrax-out',
    modules: [],
    force: false,
    verbose: false,
    resume: undefined,
  }, registry);
  const engine = new GenerationEngine();
  const order = engine.getProducerOrder();
  assert.deepEqual(order, ['template', 'module', 'persona', 'prompt', 'memory', 'documentation']);

  const context = {
    dna,
    registry,
    tempDir: '/tmp/khedrax-temp',
    artifacts: {},
    force: true,
    khedraxRootDir: khedraxRoot,
  };
  const result = await engine.run(context);
  assert.equal(result.outputPath.includes('SupportBot'), true);
});

test('Generation engine refuses to overwrite an existing output when force is omitted', async () => {
  const registry = await getRegistrySnapshot(khedraxRoot);
  const dna = await buildAgentDNA({
    name: 'SupportBot',
    type: 'customer-support',
    outputDir: '/tmp/khedrax-out',
    modules: [],
    force: false,
    verbose: false,
    resume: undefined,
  }, registry);

  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'khedrax-force-default-'));
  const outputDir = path.join(workspace, 'out');
  const engine = new GenerationEngine();

  const first = await engine.run({
    dna,
    registry,
    tempDir: path.join(workspace, 'temp-a'),
    outputDir,
    artifacts: {},
    force: true,
    khedraxRootDir: khedraxRoot,
  });
  assert.equal(first.outputPath, outputDir);

  await assert.rejects(() => engine.run({
    dna,
    registry,
    tempDir: path.join(workspace, 'temp-b'),
    outputDir,
    artifacts: {},
    khedraxRootDir: khedraxRoot,
  }), /already exists/i);
});

test('Generation engine propagates exclusive prompt conflicts without committing output', async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'khedrax-prompt-conflict-'));
  const fixtureRoot = path.join(workspace, 'fixture');
  const outputDir = path.join(workspace, 'out');
  await fs.mkdir(path.join(fixtureRoot, 'agentTypes', 'basic'), { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, 'modules', 'alpha', 'prompts'), { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, 'modules', 'beta', 'prompts'), { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, 'templates', 'agent-base'), { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, 'personas'), { recursive: true });
  await fs.cp(path.join(khedraxRoot, 'templates', 'agent-base'), path.join(fixtureRoot, 'templates', 'agent-base'), { recursive: true });
  await fs.cp(path.join(khedraxRoot, 'personas'), path.join(fixtureRoot, 'personas'), { recursive: true });
  await fs.writeFile(path.join(fixtureRoot, 'agentTypes', 'basic', 'agentType.json'), JSON.stringify({ name: 'basic', version: '1.0.0', defaultModules: [] }, null, 2));
  await fs.writeFile(path.join(fixtureRoot, 'modules', 'alpha', 'module.json'), JSON.stringify({ name: 'alpha', version: '1.0.0', path: path.join(fixtureRoot, 'modules', 'alpha') }, null, 2));
  await fs.writeFile(path.join(fixtureRoot, 'modules', 'beta', 'module.json'), JSON.stringify({ name: 'beta', version: '1.0.0', path: path.join(fixtureRoot, 'modules', 'beta') }, null, 2));
  await fs.writeFile(path.join(fixtureRoot, 'modules', 'alpha', 'prompts', 'fragment.md'), 'Alpha prompt.');
  await fs.writeFile(path.join(fixtureRoot, 'modules', 'alpha', 'prompts', 'fragment.meta.json'), JSON.stringify({ section: 'custom', exclusive: true }, null, 2));
  await fs.writeFile(path.join(fixtureRoot, 'modules', 'beta', 'prompts', 'fragment.md'), 'Beta prompt.');
  await fs.writeFile(path.join(fixtureRoot, 'modules', 'beta', 'prompts', 'fragment.meta.json'), JSON.stringify({ section: 'custom', exclusive: true }, null, 2));

  await assert.rejects(() => createAgent({
    name: 'SupportBot',
    type: 'basic',
    outputDir,
    modules: ['alpha', 'beta'],
    force: true,
    verbose: false,
    rootDir: fixtureRoot,
  } as any), /Prompt composition conflict: modules "alpha", "beta" both claim exclusive ownership of section "custom"\./);

  await assert.rejects(async () => fs.access(outputDir));
});
