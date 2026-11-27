// CI check until the TypeScript API lands: every tracked .js file must at least parse.
import { execFileSync } from 'node:child_process';

const files = execFileSync('git', ['ls-files', 'src', 'api'], { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f.endsWith('.js'));
for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
console.log(`Syntax OK: ${files.length} files`);
