// Collect SOLUTION lines from chain logs (argv: log files named L<idx>*.log) into tools/solutions.json
import fs from 'node:fs';
import { LEVELS } from '../src/levels/levels';
const file = new URL('./solutions.json', import.meta.url);
let all: Record<string, string> = {};
try { all = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* new */ }
for (const f of process.argv.slice(2)) {
  const m = fs.readFileSync(f, 'utf8').match(/SOLUTION .* (\S+@\S+)\s*$/m);
  const idx = Number(f.match(/L(\d+)/)![1]) - 1;
  if (m) { all[LEVELS[idx].id] = m[1]; console.log(LEVELS[idx].id, m[1]); }
}
fs.writeFileSync(file, JSON.stringify(all, null, 2));
