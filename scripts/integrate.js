#!/usr/bin/env node
/**
 * RaisedCurious — Content Integrator
 * ─────────────────────────────────────────────────────────────
 * Reads whatever content generate.js produced today and wires
 * it into the live site's data files. Runs after generate.js,
 * before git commit.
 *
 * Sources (optional — only processed if present):
 *   data/new-experiments.json    → appends to js/experiments-data.js
 *   data/new-weekend-lists.json  → appends to data/weekend-lists.json
 *   data/new-printables.json     → appends to data/printables.json
 *   data/new-outside-guides.json → appends to data/outside-guides.json
 *   data/social-posts.json       → left in place for Buffer pipeline
 *   data/newsletters.json        → left in place for Beehiiv pipeline
 *
 * Also maintains data/CHANGELOG.md with a timestamped entry of
 * everything added tonight.
 *
 * Idempotent: running it twice on the same input is safe. It
 * dedupes by id and only appends genuinely new entries.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const JS_DIR = path.join(ROOT, 'js');

// ─── utilities ────────────────────────────────────────────────

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Failed to parse ${filePath}: ${err.message}`);
    return null;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function dedupeById(existing, incoming) {
  const existingIds = new Set(existing.map(item => item.id));
  const newItems = incoming.filter(item => item && item.id && !existingIds.has(item.id));
  return { merged: [...existing, ...newItems], added: newItems };
}

// ─── experiments (special case: stored as JS, not JSON) ──────

function integrateExperiments() {
  const incomingPath = path.join(DATA_DIR, 'new-experiments.json');
  const incoming = readJsonIfExists(incomingPath);
  if (!incoming || !Array.isArray(incoming) || incoming.length === 0) return [];

  const targetPath = path.join(JS_DIR, 'experiments-data.js');
  if (!fs.existsSync(targetPath)) {
    console.warn(`Skipping experiments — ${targetPath} not found`);
    return [];
  }

  // experiments-data.js looks like: const EXPERIMENTS = [...];
  // Parse the array, merge, re-emit.
  const raw = fs.readFileSync(targetPath, 'utf8');
  const match = raw.match(/const\s+EXPERIMENTS\s*=\s*(\[[\s\S]*?\]);?\s*$/m);
  if (!match) {
    console.error('Could not parse EXPERIMENTS array from experiments-data.js');
    return [];
  }

  let existing;
  try {
    // eslint-disable-next-line no-eval
    existing = eval(match[1]);
  } catch (err) {
    console.error(`Failed to eval EXPERIMENTS array: ${err.message}`);
    return [];
  }

  const { merged, added } = dedupeById(existing, incoming);
  if (added.length === 0) {
    console.log('Experiments: no new items to integrate.');
    return [];
  }

  const header = `// RaisedCurious — experiments data (auto-maintained)\n// Last updated: ${new Date().toISOString()}\n// Total: ${merged.length} experiments\n\n`;
  const body = `const EXPERIMENTS = ${JSON.stringify(merged, null, 2)};\n\nif (typeof module !== 'undefined') module.exports = EXPERIMENTS;\n`;
  fs.writeFileSync(targetPath, header + body);

  console.log(`Experiments: added ${added.length} new → total ${merged.length}`);
  return added.map(e => `Experiment "${e.name}" (#${e.id})`);
}

// ─── generic JSON list integration ────────────────────────────

function integrateList(incomingFile, targetFile, label) {
  const incomingPath = path.join(DATA_DIR, incomingFile);
  const incoming = readJsonIfExists(incomingPath);
  if (!incoming || !Array.isArray(incoming) || incoming.length === 0) return [];

  const targetPath = path.join(DATA_DIR, targetFile);
  const existing = readJsonIfExists(targetPath) || [];
  const { merged, added } = dedupeById(existing, incoming);

  if (added.length === 0) {
    console.log(`${label}: no new items to integrate.`);
    return [];
  }

  writeJson(targetPath, merged);
  console.log(`${label}: added ${added.length} new → total ${merged.length}`);
  return added.map(item => `${label} "${item.title || item.name || item.id}"`);
}

// ─── changelog ────────────────────────────────────────────────

function updateChangelog(summaries) {
  if (summaries.length === 0) return;

  const changelogPath = path.join(DATA_DIR, 'CHANGELOG.md');
  const date = new Date().toISOString().slice(0, 10);
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/New_York' });

  const entry = `## ${date} (${dayName})\n\n${summaries.map(s => `- ${s}`).join('\n')}\n\n`;

  let existing = '';
  if (fs.existsSync(changelogPath)) {
    existing = fs.readFileSync(changelogPath, 'utf8');
  } else {
    existing = '# RaisedCurious Changelog\n\nAuto-maintained by the nightly pipeline. Most recent at top.\n\n';
  }

  // Insert new entry after header, before previous entries
  const headerEnd = existing.indexOf('\n\n', existing.indexOf('\n')) + 2;
  const newContent = existing.slice(0, headerEnd) + entry + existing.slice(headerEnd).replace(/^\n+/, '');
  fs.writeFileSync(changelogPath, newContent);

  console.log(`Changelog: logged ${summaries.length} entries for ${date}`);
}

// ─── main ─────────────────────────────────────────────────────

function main() {
  console.log(`\n━━━ Content Integrator — ${new Date().toISOString()} ━━━\n`);

  const summaries = [
    ...integrateExperiments(),
    ...integrateList('new-weekend-lists.json',  'weekend-lists.json',  'Weekend list'),
    ...integrateList('new-printables.json',     'printables.json',     'Printable'),
    ...integrateList('new-outside-guides.json', 'outside-guides.json', 'Outdoor guide'),
  ];

  updateChangelog(summaries);

  if (summaries.length === 0) {
    console.log('\nNothing new to integrate tonight. (Expected on social/newsletter days.)\n');
  } else {
    console.log(`\n✓ Integrated ${summaries.length} new pieces of content.\n`);
  }
}

main();
