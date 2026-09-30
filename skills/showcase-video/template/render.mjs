// Frame-exact renderer: headless Chromium seeks the page to each frame's time and
// screenshots it; ffmpeg encodes the PNG stream. Modes:
//   node render.mjs serve [--port 4173]                     live preview with sound, for humans
//   node render.mjs preview 3.2 12 [--dsf 1]                → out/preview-<t>.png (full size)
//   node render.mjs sheet 1 2.5 4 … [--out f.png]           → one labelled contact sheet
//   node render.mjs sheet --from 9.6 --to 10.4 --step 0.05  (filmstrip across a cut)
//   node render.mjs review [--scene id] [--tag name]        → out/review/<tag>/: a sheet per scene,
//                                                             a filmstrip per planned cut, lint.md
//   node render.mjs render [--workers 2] [--dsf 2] [--from 0 --to 12] [--name video] → out/<name>.mkv
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { DURATION, FPS, W, H, SCENES } from './timeline.js'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(ROOT, 'out')
fs.mkdirSync(OUT, { recursive: true })
const args = process.argv.slice(2)
const mode = args[0]
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : def
}
const times = () => args.slice(1).filter((a, i, all) => /^[\d.]+$/.test(a) && !/^--/.test(all[i - 1] ?? ''))
const range = (a, b, st) => {
  const ts = []
  for (let t = a; t <= b + 1e-9; t += st) ts.push(Math.round(t * 1000) / 1000)
  return ts
}

// Duplicate keys in timeline.js's T silently override earlier ones (a real bug that shipped once).
{
  const src = fs.readFileSync(path.join(ROOT, 'timeline.js'), 'utf8')
  const a = src.indexOf('export const T = {')
  const keys = [...src.slice(a, src.indexOf('\n}', a)).matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1])
  const dup = keys.filter((k, i) => keys.indexOf(k) !== i)
  if (dup.length) console.error(`timeline.js: duplicate keys in T: ${[...new Set(dup)].join(', ')}`)
}

const TYPES = { '.json': 'application/json', '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' }
function serve(port = 0) {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname))
      fs.readFile(p.endsWith('/') ? path.join(p, 'index.html') : p, (err, buf) => {
        if (err) return rsp.writeHead(404).end()
        rsp.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(buf)
      })
    })
    srv.listen(port, '127.0.0.1', () => res(srv))
  })
}

if (mode === 'serve') {
  const srv = await serve(Number(opt('port', 4173)))
  const base = `http://127.0.0.1:${srv.address().port}/index.html`
  console.log(`live preview (with out/audio.wav if rendered): ${base}?play   ·   from 26 s: ${base}?play=26   ·   one frame: ${base}?t=18.5`)
  console.log('space pause · ←/→ ±1 s · shift ±0.1 s · h hide timecode · Ctrl-C to stop')
  await new Promise(() => {})
}

// Playwright from a local install, $PLAYWRIGHT, the global npm root, or mise.
async function loadPlaywright() {
  const home = os.homedir()
  const npmRoot = spawnSync('npm', ['root', '-g'], { encoding: 'utf8' }).stdout?.trim()
  const candidates = [process.env.PLAYWRIGHT, 'playwright', npmRoot && `${npmRoot}/playwright/index.mjs`, `${home}/.local/share/mise/installs/npm-playwright/latest/node_modules/playwright/index.mjs`].filter(Boolean)
  for (const c of candidates) {
    try {
      return await import(c.startsWith('/') ? pathToFileURL(c).href : c)
    } catch {}
  }
  throw new Error('playwright not found: npm i -g playwright && npx playwright install chromium-headless-shell (or set PLAYWRIGHT=/path/to/playwright/index.mjs)')
}
// The headless shell renders faster than full Chromium; the newest installed one wins.
function chromePath() {
  if (process.env.CHROME) return process.env.CHROME
  const dir = process.platform === 'darwin' ? path.join(os.homedir(), 'Library/Caches/ms-playwright') : path.join(os.homedir(), '.cache/ms-playwright')
  const shells = fs.existsSync(dir) ? fs.readdirSync(dir).filter((d) => d.startsWith('chromium_headless_shell-')).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1])) : []
  for (const s of shells)
    for (const sub of ['chrome-headless-shell-linux64', 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell-mac-x64']) {
      const p = path.join(dir, s, sub, 'chrome-headless-shell')
      if (fs.existsSync(p)) return p
    }
  return undefined
}

let pageErrors = 0
async function openPage(browser, url, dsf) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dsf })
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && (pageErrors++, console.error('[page]', m.text())))
  page.on('pageerror', (e) => (pageErrors++, console.error('[pageerror]', e.message)))
  await page.goto(url)
  await page.evaluate(() => window.__ready)
  const cdp = await ctx.newCDPSession(page)
  const shot = async (t, scale = 1) => {
    await page.evaluate((t) => window.__seek(t), t)
    const clip = scale === 1 ? undefined : { x: 0, y: 0, width: W, height: H, scale }
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, clip })
    return Buffer.from(data, 'base64')
  }
  return { page, shot }
}

// Small labelled frames tiled into one image: read it to judge a whole scene or a cut at a glance.
async function sheet(shot, ts, out, cols = 6, scale = 0.25) {
  const dir = fs.mkdtempSync(path.join(OUT, 'sheet-'))
  const files = []
  for (const [i, t] of ts.entries()) {
    const f = path.join(dir, `${String(i).padStart(3, '0')}.png`)
    fs.writeFileSync(f, await shot(t, scale))
    spawnSync('magick', [f, '-gravity', 'southwest', '-fill', 'white', '-undercolor', '#000a', '-pointsize', '15', '-annotate', '+4+4', `${t}s`, f])
    files.push(f)
  }
  spawnSync('magick', ['montage', ...files, '-tile', `${cols}x`, '-geometry', '+3+3', '-background', '#222', out])
  fs.rmSync(dir, { recursive: true })
  return out
}

// Text that is visible but partly outside the frame at time t (clipped bubbles, captions
// pushed off-screen). Intentional crops show up too: the reviewer decides.
async function offFrameText(page, t) {
  await page.evaluate((t) => window.__seek(t), t)
  return page.evaluate(({ W, H }) => {
    const hits = []
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const text = n.textContent.trim()
      const el = n.parentElement
      if (!text || !el || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
      let o = 1
      for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity)
      if (o < 0.3) continue
      const r = document.createRange()
      r.selectNodeContents(n)
      for (const b of r.getClientRects()) {
        const inside = b.right > 0 && b.bottom > 0 && b.left < W && b.top < H
        const out = b.left < -1 || b.top < -1 || b.right > W + 1 || b.bottom > H + 1
        if (b.width > 1 && inside && out) hits.push(text.slice(0, 60))
      }
    }
    return [...new Set(hits)]
  }, { W, H })
}

const { chromium } = await loadPlaywright()
const srv = await serve()
const url = `http://127.0.0.1:${srv.address().port}/index.html`
const browser = await chromium.launch({ executablePath: chromePath(), args: ['--font-render-hinting=none', '--force-color-profile=srgb', '--disable-lcd-text'] })

if (mode === 'preview') {
  const { shot } = await openPage(browser, url, Number(opt('dsf', 1)))
  for (const a of times()) {
    const f = path.join(OUT, `preview-${a}.png`)
    fs.writeFileSync(f, await shot(Number(a)))
    console.log(f)
  }
} else if (mode === 'sheet') {
  const ts = opt('from') !== undefined ? range(Number(opt('from')), Number(opt('to', Number(opt('from')) + 1)), Number(opt('step', 0.1))) : times().map(Number)
  const { shot } = await openPage(browser, url, 1)
  console.log(await sheet(shot, ts, opt('out', path.join(OUT, `sheet-${ts[0]}-${ts[ts.length - 1]}.png`)), Number(opt('cols', 6)), Number(opt('scale', 0.25))))
} else if (mode === 'review') {
  // The review pack for one loop iteration: what the reviewer looks at, plus machine lint.
  const tag = opt('tag', new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'))
  const dir = path.join(OUT, 'review', tag)
  fs.mkdirSync(dir, { recursive: true })
  const only = opt('scene')
  const scenes = SCENES.filter(([id]) => !only || id === only)
  const { page, shot } = await openPage(browser, url, 1)
  const lines = [`# Review pack ${tag}`, '']
  for (const [id, a, b] of scenes) {
    const st = Math.max(0.25, Math.round(((b - a) / 36) * 20) / 20)
    lines.push(`- scene \`${id}\` ${a}–${b} s (every ${st} s): ${path.basename(await sheet(shot, range(a, b - 0.01, st), path.join(dir, `scene-${id}.png`)))}`)
  }
  const cuts = [...new Set(SCENES.map(([, a]) => a))].filter((c) => c > 0 && (!only || scenes.some(([, a, b]) => c === a || c === b)))
  for (const c of cuts) lines.push(`- cut at ${c} s (±0.3 s every 0.05 s): ${path.basename(await sheet(shot, range(Math.max(0, c - 0.3), Math.min(DURATION, c + 0.3), 0.05), path.join(dir, `cut-${c}.png`), 13, 0.2))}`)
  lines.push('', '## Lint: text partly outside the frame', '')
  const seen = new Map()
  for (const [, a, b] of scenes)
    for (const t of range(a, b - 0.01, 0.25)) for (const s of await offFrameText(page, t)) seen.set(s, [...(seen.get(s) || []), t])
  if (!seen.size) lines.push('none')
  for (const [s, ts] of seen) lines.push(`- "${s}" at ${ts[0]}–${ts[ts.length - 1]} s`)
  if (pageErrors) lines.push('', `## ${pageErrors} page error(s) — see the console output`)
  fs.writeFileSync(path.join(dir, 'lint.md'), lines.join('\n') + '\n')
  console.log(lines.join('\n'))
  console.log(`\n${dir}`)
} else if (mode === 'render') {
  const name = opt('name', 'video')
  const workers = Number(opt('workers', 2))
  const dsf = Number(opt('dsf', 2))
  const f0 = Math.round(Number(opt('from', 0)) * FPS)
  const f1 = Math.round(Number(opt('to', DURATION)) * FPS)
  const total = f1 - f0
  const per = Math.ceil(total / workers)
  const started = Date.now()
  let done = 0
  const chunks = []
  await Promise.all(
    Array.from({ length: workers }, async (_, w) => {
      const a = f0 + w * per
      const b = Math.min(f1, a + per)
      if (a >= b) return
      const file = path.join(OUT, `${name}-chunk-${String(w).padStart(2, '0')}.mkv`)
      chunks[w] = file
      const { shot } = await openPage(browser, url, dsf)
      // dsf 2 = supersampled (3840×2160 → lanczos down): crisper text and hairlines.
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
        '-vf', `scale=${W}:${H}:flags=lanczos,format=yuv444p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '8', '-g', '120', file], { stdio: ['pipe', 'inherit', 'inherit'] })
      const closed = new Promise((r) => ff.on('close', r))
      for (let f = a; f < b; f++) {
        const buf = await shot(f / FPS)
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
        done++
        if (done % 60 === 0) {
          const el = (Date.now() - started) / 1000
          process.stdout.write(`\r${done}/${total} frames · ${(done / el).toFixed(1)} fps · eta ${Math.round(((total - done) * el) / done)}s   `)
        }
      }
      ff.stdin.end()
      await closed
    }),
  )
  console.log(`\nrendered ${total} frames in ${Math.round((Date.now() - started) / 1000)}s`)
  const list = path.join(OUT, `${name}-chunks.txt`)
  fs.writeFileSync(list, chunks.filter(Boolean).map((c) => `file '${c}'`).join('\n'))
  await new Promise((r) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(OUT, `${name}.mkv`)], { stdio: 'inherit' }).on('close', r))
  for (const c of chunks.filter(Boolean)) fs.rmSync(c, { force: true })
  console.log(path.join(OUT, `${name}.mkv`))
} else {
  console.error('usage: node render.mjs serve | preview <t…> | sheet <t…> | sheet --from a --to b --step s | review [--scene id] | render [--workers n --dsf n --from a --to b --name x]')
}
if (pageErrors) console.error(`${pageErrors} page error(s) — fix before trusting these frames`)
await browser.close()
srv.close()
process.exit(pageErrors ? 1 : 0)
