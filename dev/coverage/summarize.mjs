// Reads the lcov reports both suites produce and prints one line-coverage number.
//
// Line coverage, not statements or branches: it is the number people expect a coverage
// badge to mean, and it is the only metric both c8 and vitest's v8 provider report the
// same way. The combined figure weights by lines rather than averaging the two
// percentages, so a small tree cannot swing it.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');

const TREES = [
    {
        name: 'frontend',
        lcov: 'coverage/ytdl-material/lcov.info',
        // lcov SF: paths are relative to wherever the tool ran, which differs per tree.
        base: ROOT,
        // Everything under src that is not a test, a type declaration, or generated.
        expected: () => walk(path.join(ROOT, 'src'), (f) =>
            f.endsWith('.ts')
            && !f.endsWith('.spec.ts')
            && !f.endsWith('.d.ts')
            && !f.includes('/api-types/')
            && !f.includes('/testing/')
            && !f.endsWith('/test-setup.ts'))
    },
    {
        name: 'backend',
        lcov: 'backend/coverage/lcov.info',
        base: path.join(ROOT, 'backend'),
        expected: () => walk(path.join(ROOT, 'backend'), (f) =>
            f.endsWith('.js')
            && !f.includes('/node_modules/')
            && !f.includes('/test/')
            && !f.includes('/public/')
            && !f.includes('/appdata/')
            && !f.includes('/coverage/')
            && !f.endsWith('.config.js'), ['node_modules', 'public', 'appdata', 'coverage', 'users', 'audio', 'video', 'subscriptions', 'test'])
    }
];

function walk(dir, keep, skip_dirs = []) {
    const found = [];
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        if (entry.isDirectory()) {
            if (skip_dirs.includes(entry.name)) continue;
            found.push(...walk(path.join(dir, entry.name), keep, skip_dirs));
        } else {
            const full = path.join(dir, entry.name);
            if (keep(full)) found.push(full);
        }
    }
    return found;
}

// LF is the number of instrumented lines in a file, LH the number that were hit.
function readLcov(file, base) {
    if (!fs.existsSync(file)) return null;
    const text = fs.readFileSync(file, 'utf8');
    let found = 0;
    let hit = 0;
    const files = [];
    for (const record of text.split('end_of_record')) {
        const sf = record.match(/^SF:(.+)$/m);
        if (!sf) continue;
        files.push(path.resolve(base, sf[1]));
        found += Number((record.match(/^LF:(\d+)$/m) || [, 0])[1]);
        hit += Number((record.match(/^LH:(\d+)$/m) || [, 0])[1]);
    }
    return {found, hit, files};
}

const pct = (hit, found) => found === 0 ? 0 : (hit / found) * 100;

let total_found = 0;
let total_hit = 0;
let missing_any = false;

console.log('');
for (const tree of TREES) {
    const report = readLcov(path.join(ROOT, tree.lcov), tree.base);
    if (!report) {
        console.log(`  ${tree.name.padEnd(9)} no report at ${tree.lcov} -- run dev/coverage/coverage.sh`);
        process.exitCode = 1;
        continue;
    }

    total_found += report.found;
    total_hit += report.hit;
    console.log(`  ${tree.name.padEnd(9)} ${pct(report.hit, report.found).toFixed(1).padStart(5)}%  (${report.hit}/${report.found} lines, ${report.files.length} files)`);

    // A file that is on disk but absent from the report is not counted as uncovered --
    // it is not counted at all, which quietly inflates the result. Say so rather than
    // let the number drift away from what it claims to measure.
    const reported = new Set(report.files);
    const missing = tree.expected().filter(f => !reported.has(f));
    if (missing.length) {
        missing_any = true;
        console.log(`  ${''.padEnd(9)} ${missing.length} file(s) missing from the report:`);
        for (const file of missing) console.log(`  ${''.padEnd(11)}${path.relative(ROOT, file)}`);
    }
}

const combined = pct(total_hit, total_found);
const rounded = combined.toFixed(1);
// shields.io's own thresholds for coverage badges.
const color = combined >= 80 ? 'brightgreen' : combined >= 60 ? 'yellow' : combined >= 40 ? 'orange' : 'red';

console.log('');
console.log(`  combined  ${rounded.padStart(5)}%  (${total_hit}/${total_found} lines)`);
console.log('');
console.log('  README badge:');
console.log(`  https://img.shields.io/badge/coverage-${rounded}%25-${color}`);
console.log('');

if (missing_any) {
    console.log('  Files missing from a report are excluded from the percentage above, so the');
    console.log('  real figure is slightly lower than what is printed. See CONTRIBUTING.md.');
    console.log('');
}
