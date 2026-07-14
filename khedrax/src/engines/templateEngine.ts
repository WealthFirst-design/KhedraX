import fs from 'node:fs/promises';
import path from 'node:path';
import type { GenerationContext, ProducerEngine, ProducerResult } from '../generation/types.ts';

export class TemplateEngine implements ProducerEngine {
  name = 'template';

  async run(context: GenerationContext): Promise<ProducerResult> {
    const templateRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'templates', 'agent-base');
    const files = [
      ['agent.yaml.template', 'agent.yaml'],
      ['README.md.template', 'README.md'],
      ['docs/README.md', path.join('docs', 'README.md')],
      ['src/README.md', path.join('src', 'README.md')],
      ['skills/README.md', path.join('skills', 'README.md')],
      ['memory/README.md', path.join('memory', 'README.md')],
      ['tools/README.md', path.join('tools', 'README.md')],
      ['workflows/README.md', path.join('workflows', 'README.md')],
      ['prompts/README.md', path.join('prompts', 'README.md')],
      ['tests/README.md', path.join('tests', 'README.md')],
      ['deployment/README.md', path.join('deployment', 'README.md')],
      ['configuration/README.md', path.join('configuration', 'README.md')],
    ] as const;

    for (const [src, dest] of files) {
      const sourcePath = path.join(templateRoot, src);
      const targetPath = path.join(context.tempDir, dest);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      let content = await fs.readFile(sourcePath, 'utf8');
      content = content
        .replace(/\{\{name\}\}/g, context.dna.name)
        .replace(/\{\{type\}\}/g, context.dna.agent.type)
        .replace(/\{\{buildId\}\}/g, context.dna.buildId)
        .replace(/\{\{description\}\}/g, context.dna.description ?? '')
        .replace(/\{\{version\}\}/g, context.dna.agent.version)
        .replace(/\{\{modules\}\}/g, renderModules(context.dna.modules));
      await fs.writeFile(targetPath, content);
    }

    return { artifacts: { rendered: true } };
  }
}

function renderModules(modules: string[]): string {
  if (modules.length === 0) {
    return '[]';
  }
  return modules.map((moduleName) => `- ${moduleName}`).join('\n');
}
