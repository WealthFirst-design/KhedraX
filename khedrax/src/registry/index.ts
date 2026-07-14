import type { RegistrySnapshot } from './types.ts';
import { listAgentTypes } from './agentTypeRegistry.ts';
import { listModules } from './moduleRegistry.ts';

export async function getRegistrySnapshot(rootDir: string): Promise<RegistrySnapshot> {
  const [agentTypes, modules] = await Promise.all([listAgentTypes(rootDir), listModules(rootDir)]);
  return { agentTypes, modules };
}
