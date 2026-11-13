// Habla Mucho reading game with a fake microphone: hold to record, real analysis, per-word colours.
// MIC is a WAV of someone reading "Hola, me llamo Ana y vivo en Brasil." (e.g. a past game run's audio.wav from
// /api/runs/<id>/files/audio.wav, padded with silence). Each take adds a run to the local lab history.
import {chromium, cast, encode, SHOTS, now} from './cast.mjs';
const mic = process.env.MIC; if (!mic) throw new Error('set MIC=/path/to/reading.wav');
const b = await chromium.launch({args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${mic}`]});
const p = await (await b.newContext({viewport: {width: 1280, height: 800}, deviceScaleFactor: 1.5, permissions: ['microphone']})).newPage();
await p.goto('http://127.0.0.1:5173/#jogo'); await p.waitForTimeout(2500);
const dir = await cast(p, 'habla-game', async () => {
  await p.waitForTimeout(1200);
  const bb = await p.getByRole('button', {name: 'Gravar minha leitura'}).boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForTimeout(5600); await p.mouse.up();
  const release = now() + 0.8;
  await p.getByText(/Ainda não passou|Passou|Muito bem|Parabéns/).first().waitFor({timeout: 60000});
  const done = now() - 0.6;
  await p.waitForTimeout(3500);
  return {slow: [[release, done, 4]]}; // analysis wait plays 4x faster
});
await b.close();
encode(dir, `${SHOTS}/habla-mucho/game`, {width: 720, crop: '1320:1100:300:20', dur: 14, poster: 13.5});
