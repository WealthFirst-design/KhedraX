import fs from 'node:fs/promises';
import path from 'node:path';
import type { ModuleDescriptor } from './types.ts';

export async function listModules(rootDir: string): Promise<Record<string, ModuleDescriptor>> {
  const modulesDir = path.join(rootDir, 'modules');
  const modules: Record<string, ModuleDescriptor> = {};
  const entries = await listDirectories(modulesDir);

  for (const entry of entries) {
    const descriptorPath = path.join(modulesDir, entry, 'module.json');
    try {
      const content = JSON.parse(await fs.readFile(descriptorPath, 'utf8')) as ModuleDescriptor;
      modules[entry] = {
        ...content,
        name: entry,
        path: path.join(modulesDir, entry),
      };
    } catch {
      console.warn(`Skipping malformed module: ${entry}`);
    }
  }

  return modules;
}

async function listDirectories(root: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}
