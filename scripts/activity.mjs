#!/usr/bin/env node
// Builds src/data/activity.json from my GitHub contribution calendar (the same
// numbers my public profile shows, private contributions included as counts).
//
// Only dates and counts are written: no repo names or messages, so private
// repos stay private.
//
// usage: npm run activity            (needs the GitHub CLI, logged in as me)

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const query = '{viewer{login contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}';
const res = JSON.parse(execFileSync('gh', ['api', 'graphql', '-f', `query=${query}`], { encoding: 'utf8' }));

const { login, contributionsCollection: cc } = res.data.viewer;
const cal = cc.contributionCalendar;
const days = cal.weeks.flatMap((w) => w.contributionDays);
const counts = days.map((d) => d.contributionCount);

const total = counts.reduce((a, b) => a + b, 0);
if (total !== cal.totalContributions) throw new Error(`calendar days add up to ${total}, GitHub says ${cal.totalContributions}`);

const outFile = join(repoRoot, 'src/data/activity.json');
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ login, generated: days.at(-1).date, start: days[0].date, counts }) + '\n');
console.log(`${total} contributions on ${counts.filter(Boolean).length} days → ${outFile}`);
