import fs from 'node:fs/promises';
import path from 'node:path';
import type { AgentTypeDescriptor } from './types.ts';

export async function listAgentTypes(rootDir: string): Promise<Record<string, AgentTypeDescriptor>> {
  const agentTypesDir = path.join(rootDir, 'agentTypes');
  const agentTypes: Record<string, AgentTypeDescriptor> = {};
  const entries = await listDirectories(agentTypesDir);

  for (const entry of entries) {
    const descriptorPath = path.join(agentTypesDir, entry, 'agentType.json');
    try {
      const content = JSON.parse(await fs.readFile(descriptorPath, 'utf8')) as AgentTypeDescriptor;
      agentTypes[entry] = {
        ...content,
        name: entry,
        defaultModules: content.defaultModules ?? [],
      };
    } catch {
      console.warn(`Skipping malformed agent type: ${entry}`);
    }
  }

  return agentTypes;
}

async function listDirectories(root: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

export async function getAgentTypeDescriptor(rootDir: string, typeName: string): Promise<AgentTypeDescriptor | undefined> {
  const snapshot = await import('./index.ts').then((mod) => mod.getRegistrySnapshot(rootDir));
  return snapshot.agentTypes[typeName];
}
