// Records a page at device resolution by grabbing CDP screenshots in a loop (~15–25 fps). Chrome's screencast
// API only sends CSS-pixel frames, and Playwright's recordVideo pads a 1x frame, so neither is sharp enough.
// Writes numbered JPEGs plus an ffconcat list with the real frame timings; encode.sh turns that into clips.
import {mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

export {chromium, webkit, devices} from '../ux/node_modules/playwright/index.mjs';
const here = dirname(fileURLToPath(import.meta.url));
export const SHOTS = join(here, '../../public/shots');
export const now = () => Date.now() / 1000;

// fn runs the interaction; marks it returns as {slow: [[from, to, factor]]} (epoch seconds) speed up waiting.
export async function cast(page, name, fn) {
  const dir = join(tmpdir(), 'portfolio-clips', name);
  rmSync(dir, {recursive: true, force: true}); mkdirSync(dir, {recursive: true});
  const cdp = await page.context().newCDPSession(page);
  const vp = page.viewportSize(); const dpr = await page.evaluate(() => devicePixelRatio);
  const frames = []; let running = true;
  const loop = (async () => {
    while (running) {
      const t = now();
      try {
        // clip is in document coordinates, so it follows the scroll position
        const {result} = await cdp.send('Runtime.evaluate', {expression: '[scrollX, scrollY]', returnByValue: true});
        const [x, y] = result.value;
        const {data} = await cdp.send('Page.captureScreenshot',
          {format: 'jpeg', quality: 90, optimizeForSpeed: true, clip: {x, y, width: vp.width, height: vp.height, scale: dpr}});
        writeFileSync(join(dir, `${String(frames.length).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64')); frames.push(t);
      } catch { await new Promise(r => setTimeout(r, 30)); }
    }
  })();
  const marks = (await fn()) || {};
  running = false; await loop;
  const stop = now();
  let list = 'ffconcat version 1.0\n';
  frames.forEach((t, i) => {
    let d = i + 1 < frames.length ? frames[i + 1] - t : Math.max(0.1, stop - t);
    for (const [from, to, factor] of marks.slow || []) if (t > from && t < to) d /= factor;
    list += `file ${String(i).padStart(5, '0')}.jpg\nduration ${d.toFixed(4)}\n`;
  });
  list += `file ${String(frames.length - 1).padStart(5, '0')}.jpg\n`; // concat ignores the last duration unless the file repeats
  writeFileSync(join(dir, 'list.txt'), list);
  console.log(`${name}: ${frames.length} frames, ${(frames.length / (stop - frames[0])).toFixed(1)} fps`);
  return dir;
}

// Encodes to OUT.webm/.mp4/.jpg. opts: width, speed, crop 'w:h:x:y' (frame px), dur (max s), poster (s).
export function encode(dir, out, {width, speed = 1, crop, dur, poster = 0}) {
  execFileSync(join(here, 'encode.sh'), [dir, out, String(width), String(speed)], {
    stdio: 'inherit', env: {...process.env, CROP: crop || '', DUR: dur ? String(dur) : '', POSTER: String(poster)}});
}
