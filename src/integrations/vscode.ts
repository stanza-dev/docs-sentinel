import fs from 'node:fs';
import path from 'node:path';

export function setupVSCodeTask(projectRoot: string): boolean {
  const tasksPath = path.join(projectRoot, '.vscode', 'tasks.json');
  let tasks: {
    version?: string;
    tasks?: Array<{ label: string; type: string; command: string; [key: string]: unknown }>;
  } = { version: '2.0.0', tasks: [] };

  if (fs.existsSync(tasksPath)) {
    try {
      const raw = fs.readFileSync(tasksPath, 'utf-8');
      // Strip JSONC comments
      const stripped = raw.replace(/^\s*\/\/.*$/gm, '');
      tasks = JSON.parse(stripped);
    } catch {
      // Can't parse, use default
    }
  }

  if (!tasks.tasks) tasks.tasks = [];

  // Check if already present
  const alreadyPresent = tasks.tasks.some(
    (t) => t.label === 'docs-sentinel: audit',
  );

  if (alreadyPresent) return false;

  tasks.tasks.push({
    label: 'docs-sentinel: audit',
    type: 'shell',
    command: 'npx docs-sentinel audit',
    group: 'test',
    presentation: {
      reveal: 'always',
      panel: 'new',
    },
    problemMatcher: [],
  });

  fs.mkdirSync(path.dirname(tasksPath), { recursive: true });
  fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2) + '\n', 'utf-8');
  return true;
}
