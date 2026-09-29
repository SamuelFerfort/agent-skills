# Code reference

These are generic excerpts from the reference build: a React chat widget with Streamdown and webpack,
and a Mastra agent. Adapt paths, names and the markdown renderer to your app.

## Frontend: from marker to tag (`lib/screenshots.ts`)

```ts
import catalog from '../../assets/help/screenshots.json'

export type Screenshot = { id: string; width: number; height: number; shows: string; src: string }

// webpack 5. In Vite: import.meta.glob('../../assets/help/*.webp', { eager: true, query: '?url', import: 'default' })
const files = import.meta.webpackContext('../../assets/help', { recursive: false, regExp: /\.webp$/ })
const SCREENSHOTS = new Map<string, Screenshot>(catalog.map((s) => [s.id, { ...s, src: files<string>(`./${s.id}.webp`) }]))

export const screenshotById = (id: string | undefined) => (id ? SCREENSHOTS.get(id) : undefined)

// On its own line: block HTML can't sit inside a paragraph.
const MARKER = /[ \t]*\[screenshot:([a-z0-9-]+)\][ \t]*/g
// While streaming, a half-written marker at the end must not show up as loose text.
const PARTIAL = /\[(?:s(?:c(?:r(?:e(?:e(?:n(?:s(?:h(?:o(?:t(?::[a-z0-9-]*)?)?)?)?)?)?)?)?)?)?)?$/

export function withScreenshots(text: string, streaming: boolean): string {
  if (!text.includes('[')) return text // runs on every token
  const complete = streaming ? text.replace(PARTIAL, '') : text
  // `name`, not `id`: rehype-sanitize prefixes ids with `user-content-`.
  return complete.replace(MARKER, (_, id: string) => (SCREENSHOTS.has(id) ? `\n\n<screenshot name="${id}"></screenshot>\n\n` : ''))
}

export const withoutScreenshots = (text: string) => text.replace(MARKER, '')
```

Types, if you use `webpackContext` with TypeScript:

```ts
interface ImportMeta {
  webpackContext(request: string, options?: { recursive?: boolean; regExp?: RegExp }): (<T>(id: string) => T) & { keys(): string[] }
}
```

Hooking it into the renderer (Streamdown, or react-markdown with rehype-sanitize):

```tsx
export const MARKDOWN_COMPONENTS = { /* …yours */ screenshot: Screenshot } as Components
export const ALLOWED_TAGS = { /* …yours */ screenshot: ['name'] } // sanitizer allowlist

<Streamdown components={MARKDOWN_COMPONENTS} allowedTags={ALLOWED_TAGS}>
  {withScreenshots(part.text ?? '', isStreaming)}
</Streamdown>
// Copy button: text={withoutScreenshots(text)}
```

## Frontend: the component (`Screenshot.tsx`)

```tsx
export function Screenshot({ name }: { name?: string }) {
  const shot = screenshotById(name)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  // No image, nothing: a skeleton that never loads would stay forever.
  if (!shot || failed) return null
  return (
    <>
      <button ref={ref} type="button" disabled={!loaded} onClick={() => setZoomed(true)}
        aria-label={`Zoom: ${shot.shows}`}
        className={`screenshot my-3 block max-w-full enabled:cursor-zoom-in ${loaded ? '' : 'skeleton'}`}>
        <img src={shot.src} alt={shot.shows} width={shot.width} height={shot.height} loading="lazy"
          onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      </button>
      {loaded && <Zoom isOpen={zoomed} onOpenChange={setZoomed} src={shot.src} alt={shot.shows}
        from={ref} ratio={shot.width / shot.height} />}
    </>
  )
}
```

```css
/* At most its 1x size and 360 px tall. A 10% black outline doesn't pick up the background colour. */
.screenshot { width: fit-content; overflow: hidden; border-radius: 12px; outline: 1px solid oklch(0 0 0 / 0.1); outline-offset: -1px; }
.screenshot img { display: block; width: auto; height: auto; max-width: 100%; max-height: 360px; }
```

Voice or other non-markdown channels: render the same component as the result of the tool step:

```tsx
if (toolName === 'show_screenshot') return <Screenshot name={(part.input as { id?: string } | undefined)?.id} />
```

## Backend: catalog and tool (Mastra)

```ts
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import catalog from '../../../../assets/help/screenshots.json' // resolveJsonModule; COPY it in the Dockerfile

export const SCREENSHOTS = catalog
export const SCREENSHOT_TOOL_NAME = 'show_screenshot'

const showScreenshot = createTool({
  id: SCREENSHOT_TOOL_NAME,
  description: 'Shows a screenshot of the app on screen (where an option is, what something looks like). Voice only.',
  // The enum keeps the model from inventing screenshots.
  inputSchema: z.object({ id: z.enum(SCREENSHOTS.map((s) => s.id) as [string, ...string[]]) }),
  outputSchema: z.object({ id: z.string(), shows: z.string() }),
  execute: async ({ id }) => ({ id, shows: SCREENSHOTS.find((s) => s.id === id)!.shows }),
})

export const SCREENSHOT_TOOLS = { [SCREENSHOT_TOOL_NAME]: showScreenshot }
// When assembling tools per channel: ...(isVoiceWithScreen ? SCREENSHOT_TOOLS : {})
```

## Backend: the skill

```ts
import { createSkill } from '@mastra/core/skills'

const CATALOG = SCREENSHOTS.map((s) => `- \`${s.id}\`: ${s.shows} ${s.when}`).join('\n')

const BASE = `# <App>: what it does and where everything is
<App> is … It opens in … with … on the left and … on the right.

## <Area 1: sidebar>
- Top: "<exact label>", …
## <Area 2: typing, attaching, talking>
## Answers
## What it can do
## <Channels: phone, messaging…>  (no values that change: point to the dialog)
## <Support / reporting a problem>`

const WITH_MARKERS = `## Screenshots
Use them proactively, without waiting to be asked: every time you explain where something is, what it
looks like or how it's done, add its screenshot. Write \`[screenshot:<id>]\` on its own line, right after
the sentence it illustrates. One per thing you explain and at most three per answer; never an id that
isn't on this list. Don't describe the image: the sentence before it already says what to look at.

${CATALOG}`

const IN_VOICE = `## In voice
You are speaking and the listener has the app in front of them: say in words where each thing is, with
no markers. Also show it with \`${SCREENSHOT_TOOL_NAME}\`, proactively: it appears on their screen at
that point of the conversation. At most three per answer. Don't describe the image.

${CATALOG}`

const DESCRIPTION =
  'What <App> can do and where everything is in its UI (…). Use it whenever they ask about the app itself, what it can do or how to use it; not for their data.'

const help = (extra: string) => createSkill({ name: 'app-help', description: DESCRIPTION, instructions: `${BASE}\n\n${extra}` })
export const helpSkill = help(WITH_MARKERS)
export const helpVoiceSkill = help(IN_VOICE)

// With a screen: chat with markers, voice with the tool. Without a screen: nothing.
export function helpSkillsFor(channel?: string) {
  if (channel === 'messaging' || channel === 'phone') return []
  return channel === 'voice-screen' ? [helpVoiceSkill] : [helpSkill]
}
// new Agent({ …, skills: ({ requestContext }) => helpSkillsFor(channelOf(requestContext)) })
```

## Tests (node:test)

```ts
test('every catalog entry has its image, and there are no extra images', () => {
  const ids = SCREENSHOTS.map((s) => s.id)
  const images = readdirSync(new URL('../../../../assets/help/', import.meta.url))
    .filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5))
  assert.deepEqual([...ids].sort(), images.sort())
  assert.equal(new Set(ids).size, ids.length)
  for (const s of SCREENSHOTS) {
    assert.match(s.id, /^[a-z0-9-]+$/)
    assert.ok(s.width > 0 && s.height > 0 && s.shows && s.when)
  }
})

test('each channel gets its variant', () => {
  assert.deepEqual(helpSkillsFor('web'), [helpSkill])
  assert.deepEqual(helpSkillsFor('voice-screen'), [helpVoiceSkill])
  assert.equal(helpSkillsFor('messaging').length, 0)
  assert.doesNotMatch(helpVoiceSkill.instructions, /\[screenshot:/)
  assert.ok(helpSkill.description.length <= 1024)
})
```

## Measuring the token cost

```ts
const without = new Agent({ id: 'a', model, instructions: prompt, skills: [] })
const withSkill = new Agent({ id: 'b', model, instructions: prompt, skills: [helpSkill] })
new Mastra({ agents: { without, withSkill } })
const a = await without.generate('hi', { maxSteps: 1 })
const b = await withSkill.generate('hi', { maxSteps: 1 })
console.log(b.usage.inputTokens - a.usage.inputTokens) // reference build: +672 over 10,136
```
