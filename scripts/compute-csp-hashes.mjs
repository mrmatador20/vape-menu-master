#!/usr/bin/env node
/**
 * Recompute SHA-256 hashes for every inline <script> in index.html.
 *
 * Run after editing any inline <script> block (JSON-LD, etc.) and update
 * the CSP `script-src` directive in:
 *   - index.html  (meta http-equiv Content-Security-Policy)
 *   - src/lib/securityHeaders.ts  (CSP_POLICY['script-src'])
 *
 * Usage:  node scripts/compute-csp-hashes.mjs
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const regex = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;

let match;
let i = 0;
console.log('CSP script-src hashes for index.html inline <script> blocks:\n');
while ((match = regex.exec(html)) !== null) {
  i++;
  const content = match[1];
  const digest = createHash('sha256').update(content, 'utf8').digest('base64');
  const preview = content.trim().slice(0, 60).replace(/\s+/g, ' ');
  console.log(`#${i}  'sha256-${digest}'`);
  console.log(`     ${preview}${content.length > 60 ? '…' : ''}\n`);
}
if (i === 0) console.log('No inline <script> blocks found.');
