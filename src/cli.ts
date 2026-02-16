import { Command } from 'commander';
import { runInit, findProjectRoot } from './commands/init.js';
import { runCheck } from './commands/check.js';
import { runAudit } from './commands/audit.js';
import type { ReportFormat } from './types.js';

declare const PKG_VERSION: string;

const program = new Command();

program
  .name('docs-sentinel')
  .description('Keep documentation fresh by tracking references between docs and source code')
  .version(PKG_VERSION);

program
  .command('init')
  .description('Scan docs, add frontmatter, and configure tool integrations')
  .option('--dry-run', 'Preview changes without modifying files')
  .option('--no-tools', 'Skip tool integration setup')
  .option('--no-frontmatter', 'Skip frontmatter generation')
  .option('--docs-dir <path>', 'Documentation directory (default: ./docs)')
  .action(async (opts) => {
    const projectRoot = findProjectRoot(process.cwd());
    if (!projectRoot) {
      console.error('Error: Could not find project root (.git or package.json)');
      process.exit(1);
    }
    await runInit(projectRoot, {
      dryRun: opts.dryRun,
      tools: opts.tools,
      frontmatter: opts.frontmatter,
      docsDir: opts.docsDir,
    });
  });

program
  .command('check')
  .description('Check which docs reference a given source file')
  .requiredOption('--file <path>', 'Source file to check')
  .option('--quiet', 'Only output if there are matches')
  .option('--format <format>', 'Output format: terminal, json', 'terminal')
  .action(async (opts) => {
    await runCheck({
      file: opts.file,
      quiet: opts.quiet,
      format: opts.format as ReportFormat,
    });
  });

program
  .command('audit')
  .description('Full documentation health audit')
  .option('--format <format>', 'Output format: terminal, json, markdown', 'terminal')
  .option('--no-git', 'Skip git history, use filesystem timestamps')
  .action(async (opts) => {
    await runAudit({
      format: opts.format as ReportFormat,
      noGit: !opts.git,
    });
  });

program.parse();
