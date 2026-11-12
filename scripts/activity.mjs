#!/usr/bin/env node
// Builds src/data/activity.json from my GitHub contribution calendar (the same
// numbers my public profile shows, private contributions included as counts).
//
// Only dates and counts are written: no repo names or messages, so private
// repos stay private.
//
// Runs on every deploy (see .github/workflows/deploy.yml, which also rebuilds daily).
// Locally: npm run activity   (needs the GitHub CLI; any token can read a public calendar)

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gh = (args) => execFileSync('gh', args, { encoding: 'utf8' });
// in Actions the token belongs to a bot, so ask for the repo owner's calendar by name
const login = process.env.GITHUB_REPOSITORY_OWNER || gh(['api', 'user', '--jq', '.login']).trim();
const query = 'query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}';
const res = JSON.parse(gh(['api', 'graphql', '-f', `query=${query}`, '-f', `login=${login}`]));

const cc = res.data.user.contributionsCollection;
const cal = cc.contributionCalendar;
const days = cal.weeks.flatMap((w) => w.contributionDays);
const counts = days.map((d) => d.contributionCount);

const total = counts.reduce((a, b) => a + b, 0);
if (total !== cal.totalContributions) throw new Error(`calendar days add up to ${total}, GitHub says ${cal.totalContributions}`);

const outFile = join(repoRoot, 'src/data/activity.json');
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ login, generated: days.at(-1).date, start: days[0].date, counts }) + '\n');
console.log(`${total} contributions on ${counts.filter(Boolean).length} days → ${outFile}`);
