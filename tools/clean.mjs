import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Resolved against the project root, so the result does not depend on the cwd.
const root = new URL('../', import.meta.url);
const targets = ['build', 'dist', 'node_modules'];

for (const target of targets) {
  await rm(fileURLToPath(new URL(target, root)), {
    recursive: true,
    force: true,
    maxRetries: 3,
  });
  console.log(`Removed ${target}`);
}
