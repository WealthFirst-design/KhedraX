import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GenerationEngine } from '../../src/generation/generationEngine.ts';
import { getRegistrySnapshot } from '../../src/registry/index.ts';
import { buildAgentDNA } from '../../src/dna/loader.ts';

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
  });
  assert.equal(first.outputPath, outputDir);

  await assert.rejects(() => engine.run({
    dna,
    registry,
    tempDir: path.join(workspace, 'temp-b'),
    outputDir,
    artifacts: {},
  }), /already exists/i);
});
