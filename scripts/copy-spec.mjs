#!/usr/bin/env node
// Publishes the OpenAPI contract as a static asset.
//
// The committed source is `spec/openapi.yaml`. `public/openapi.yaml` is a build
// artefact - it is gitignored - so that the file the site serves at
// /openapi.yaml can never drift from the one the linter checks.

import { copyFile, mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'spec/openapi.yaml');
const destination = resolve(root, 'public/openapi.yaml');

try {
  await access(source);
} catch {
  console.error(`copy-spec: ${source} does not exist.`);
  console.error('The OpenAPI contract is the committed source; nothing can be published without it.');
  process.exit(1);
}

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);

console.log('copy-spec: spec/openapi.yaml -> public/openapi.yaml');
