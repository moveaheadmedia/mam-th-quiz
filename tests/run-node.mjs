#!/usr/bin/env node
/* Runs every test suite under Node, each in a fresh context, the way a
   browser page would load it:  node tests/run-node.mjs
   Exits 1 if any suite fails. No dependencies. */
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const SUITES = {
  planner: ['assets/js/data.js', 'assets/js/planner.js', 'tests/planner.test.js'],
  i18n: ['assets/js/data.js', 'assets/js/planner.js', 'assets/js/i18n/en.js',
    'assets/js/i18n/th.js', 'tests/i18n.test.js'],
  utm: ['assets/js/utm.js', 'tests/utm.test.js'],
  forms: ['assets/js/config.js', 'assets/js/data.js', 'assets/js/engine.js',
    'assets/js/planner.js', 'tests/forms.test.js'],
};

const only = process.argv.slice(2);
let failedSuites = 0;
for (const [name, files] of Object.entries(SUITES)) {
  if (only.length && !only.includes(name)) continue;
  console.log(`\n=== ${name}`);
  /* Each suite reports through process.exitCode; give it a clean one. */
  const proc = { exitCode: 0 };
  const context = {
    console, URL, URLSearchParams, setTimeout, clearTimeout, process: proc,
    MAM_UTM_PLUGIN_SOURCE: read('tests/fixtures/mam-quform-utms-scripts.js'),
  };
  context.window = context;
  vm.createContext(context);
  try {
    for (const file of files) vm.runInContext(read(file), context, { filename: file });
  } catch (error) {
    console.log(`FAIL ${name} could not run: ${error && error.stack}`);
    proc.exitCode = 1;
  }
  if (proc.exitCode) failedSuites++;
}
console.log(failedSuites ? `\n${failedSuites} suite(s) failed` : '\nAll suites passed');
process.exitCode = failedSuites ? 1 : 0;
