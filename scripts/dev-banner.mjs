// Printed by the root `predev` hook so `pnpm dev` clearly announces where each
// service listens, instead of leaving you to guess between the API and web ports.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Read ports from the root .env if present, falling back to the documented defaults.
const env = {};
try {
  const raw = readFileSync(fileURLToPath(new URL('../.env', import.meta.url)), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  // No .env yet — defaults below are fine for a first run.
}

const apiPort = env.PORT || '3000';
const webPort = '5173'; // Vite's default; it auto-increments if the port is taken (watch its output).

const rows = [
  ['Web app (Vue)', `http://localhost:${webPort}`, '← open this'],
  ['API', `http://localhost:${apiPort}`, 'no root route (404 is expected)'],
  ['API docs (Scalar)', `http://localhost:${apiPort}/docs`, ''],
  ['API OpenAPI spec', `http://localhost:${apiPort}/openapi.json`, ''],
  ['API health', `http://localhost:${apiPort}/healthz`, ''],
];

const label = Math.max(...rows.map((r) => r[0].length));
const url = Math.max(...rows.map((r) => r[1].length));

console.log('\n  Starting dev servers (parallel):\n');
for (const [name, href, note] of rows) {
  console.log(`  ${name.padEnd(label)}  ${href.padEnd(url)}  ${note}`);
}
console.log('\n  Vite may pick 5174+ if 5173 is busy — check its output below.\n');
