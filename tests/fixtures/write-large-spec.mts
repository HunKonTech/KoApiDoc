// Writes the generated large specs next to this file (git-ignored), e.g.
// to attach them to a Confluence page by hand: `npm run fixtures:large`.
import { writeFileSync } from 'node:fs';
import { generateLargeSpec, LARGE_SAMPLES } from './largeSpec.ts';

for (const [name, options] of Object.entries(LARGE_SAMPLES)) {
  const file = new URL(`./${name}.json`, import.meta.url);
  const text = JSON.stringify(generateLargeSpec(options));
  writeFileSync(file, text);
  console.log(`${file.pathname}: ${options.operations} operations, ${text.length} bytes`);
}
