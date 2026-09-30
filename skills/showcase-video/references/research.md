# Research: reference videos and the real product

## Contents
1. Reference launch videos: method
2. Library: what the analyzed videos teach
3. Case studies: how two past films turned DNA into devices
4. The real product: fidelity checklist
5. The product's visual DNA
6. Fact-checking and real content

---

## 1. Reference launch videos: method

```bash
scripts/analyze_refs.py search "v0 vercel launch" "Linear launch video" "<category> launch"
scripts/analyze_refs.py analyze ~/Videos/<product>-showcase/refs v0=By9wCB9IZp0 linear-agent=mRql2VJ99gM …
scripts/analyze_refs.py analyze <dir> mine=~/Downloads/launch.mp4     # local files work too
```

**What to pick:**
- 2–3 launches from the product's category, plus 2–3 best-in-class launches (AI labs,
  dev tools, Apple-style keynotes).
- Prefer official channels and recent uploads.
- Aim for 4–6 in total. More adds reading time without adding new techniques.

**What to extract from each one:**
- **Structure.** Count the cuts. A median shot of 1–5 s means cutting; 0 cuts means a
  continuous camera. Note where the fast bursts sit.
- **World.** Is it light, dark, or alternating? Warm or cool?
- **Camera distance.** Extreme close-up, isolated component, full UI, or wall/grid.
- **Transitions.** Hard cut, morph (element A becomes element B), camera move, or
  match cut.
- **Typography.** Are phrases full screen? Typed? How long do they stay?
- **Music.** Where does loudness drop (a breath before a section) and where does it hit?
  Read `loudness_every_2s` in refs.json.
- **People.** Interviews or founder-to-camera? The transcript word count tells you.
  Usually this doesn't apply to a code-built video.

**How to report:** write a table (video · duration · cuts · median shot · world · *what it
does in one sentence*). Follow it with 4–6 techniques, each mapped to a scene in the
planned video. Link the videos. Keep the contact sheets in `refs/` so the user
can look at them too.

The downloads are for private study. Never reuse their footage, music or distinctive
signature moments.

## 2. Library: what the analyzed videos teach

These were analyzed in September 2026. Re-run the analyzer before quoting the numbers
again (videos get re-uploaded), and add fresh references from the product's own category
every time: this library is a starting point, not the answer.

| Video | Dur. | Cuts | Shot | World | What it does |
|---|---|---|---|---|---|
| [Introducing v0](https://www.youtube.com/watch?v=By9wCB9IZp0) | 48 s | 0 | one camera | white | "What will you ship?" becomes the prompt bar. The placeholder rolls through real prompts, the bar becomes the generated UI, and the UI becomes a wall of generations. |
| [Introducing Claude Fable 5.1](https://www.youtube.com/watch?v=ROF2Nv_KjOM) | 85 s | 25 | 3.4 s mean | warm paper | Interview intercut with abstract metaphors: a dot growing into a tree, lenses over data, floating documents connecting. |
| [Introducing GPT-5](https://www.youtube.com/watch?v=boJG84Jcf-4) | 89 s | 13 | 1.3 s median | white | Full-screen phrases alternate with isolated UI pieces, never a whole window: just the composer, a chart, a document. It has a 10-cuts-in-10-s burst mid-film, and the music dips to about −25 LUFS at section changes. |
| [Introducing Linear Agent](https://www.youtube.com/watch?v=mRql2VJ99gM) | 55 s | 0 | one camera | black | A single 3D glide over a tilted UI with depth-of-field blur. Very restrained. |
| [New Raycast](https://www.youtube.com/watch?v=Mi173xGb0ZA) | 39 s | 7 | 5.5 s | black | Extreme close-ups: the search bar cropped by the frame, emoji as 3D tiles. It closes on typed titles. |
| [Raycast AI in 55 s](https://www.youtube.com/watch?v=rnpSOiXG9AE) | 56 s | 13 | 4.3 s | mixed | Founder to camera with screenshots and captions. The least polished, useful as a contrast. |

**Techniques that came out of it:**
1. **Vary camera distance.** Alternate an extreme close-up (one component cropped by the
   frame), an isolated floating component, the full UI and a wall. Never hold one
   framing for more than ~6 s.
2. **Show components without their window.** A composer, a chart or a result card alone
   on plain ground reads cleaner than a tiny full app.
3. **Chain scenes by transformation, not cuts.** One element becomes the next: phrase →
   composer, mini-chart → full chart, card → cart.
4. **Use metaphors for invisible work.** Retrieval, indexing and delegation have no UI;
   draw them. Examples: a question dissolving into particles that travel to the
   sources, a scan beam over pages, fragments flying into an index.
5. **Give typography its own beats.** Short full-screen phrases (GPT-5, Raycast).
6. **Rhythm.** Shots of 3–5 s with one fast burst in the middle. Let the music breathe
   (drop out) right before each new section.

## 3. Case studies: how two past films turned DNA into devices

These are here to show the *reasoning* (product trait → device). They are not scenes to
reuse: the profile's past videos and the sameness check exist to prevent exactly that.

**Case A: an AI assistant for pharmacies** (light UI, logo made of droplets).
- The headline became the composer, with its placeholder rolling through real pharmacy
  questions (v0's morph).
- The question dissolved into the logo's own droplets, which travelled to four data
  sources and came back as the answer: the logo's shapes used as the retrieval metaphor.
- A mini-chart grew into the full chart (transformation).
- A burst of the product's outputs (PDF, spreadsheet, scheduled routine) played on 8th
  notes (GPT-5's burst).
- The first version held "window right, text left" for 18 s. The user called it
  monotonous, and that is why the reference research exists.

**Case B: a legal assistant with cited answers, web and mobile** (dark UI, line-art
emblem with a lettered chip at its centre).
- The emblem traced itself, then the camera dove through its chip into the app (a
  portal).
- Citation badges opened the real statute page with the passage highlighted (the
  product's core verb is *cite*).
- Dictated statements flew as comet lines into the form fields they filled (the core
  verb *fill*).
- An uploaded PDF was scanned by a beam into an index, then cited in a split view with
  lines to each passage.
- The whole app shrank into the web login hero's emblem, then a store-badges beat, then
  the phone: photo of a licence plate → cited answer.

What made both work: every device came from something specific to the product. What went
wrong in early cuts:
- an invented UI element;
- the wrong logo file;
- a light theme on a dark app;
- a concept too close to the brand's previous video.

## 4. The real product: fidelity checklist

Collect these with parallel Explore agents, reading from `main` (`git show main:<path>`
and `git ls-tree -r main --name-only | grep …`), never by checking out:

| What | Usually in | Why |
|---|---|---|
| Theme tokens (light **and** dark) | `globals.css` (`:root` / `.dark`), a tailwind config, mobile `theme.ts` / constants | The whole palette. Use the dark theme if the app has one (the user preferred it). |
| Logo source files | `public/`, `assets/`, the brand folder, the app icon in `app.json` | Trace the real file. Check you have the *current* mark: repos often keep an outdated `logo.png` next to the real one, so ask when two candidates exist. |
| UI strings | i18n dictionaries (`es.json` …), component literals | Real placeholder texts, button labels, greetings |
| Key flow components | the pages and components for each feature shown | Layout, spacing, radii, badge shapes, states (loading, streaming, citations) |
| Icons | `lucide-react` (or other) and its version | `gen-icons.mjs` copies the exact glyphs |
| Fonts | `layout.tsx` font imports, `@font-face` | Save them as local woff2 in `assets/fonts/` |
| Motion | `cubic-bezier`, spring configs, existing animated components (login hero, onboarding) | Reuse the product's own easings. Rebuilding an existing hero faithfully delighted the user. |
| Mobile app | the Expo/native theme, screens, native sheets and camera | Build the phone in device points (e.g. 393×852 for an iPhone), then scale |
| Store presence | App Store / Play links, app icon | For the "also on iOS / Android" beat |

**Store badges:** `scripts/store_badges.sh <google-lang> <apple-locale>` fetches the
official ones and trims Google's padding. Use them unmodified: both stores' guidelines
forbid edits. If Apple's generator is down, retry, or use Apple's marketing page. Render
both at the **same visual height**.

Also check `~/Videos/` for an earlier video of the same brand. It shows what the user
has already seen, so don't repeat it.

## 5. The product's visual DNA

Write this list before proposing directions. It is what makes this film different from
the last one:

- **Shapes.** What is the logo made of (rings, strokes, droplets, a chip, a letterform)?
  Those shapes can become particles, masks, paths and portals.
- **Signature UI moments.** What does the product do that looks unlike anything else (a
  streaming answer with citation badges, a form filling itself, a chart building)?
- **The core verb.** Search, cite, fill, draft, predict, schedule, translate…
- **The magic moment.** The instant a user thinks "oh". The film builds to it.
- **Domain imagery.** The real-world objects of the users' work: documents, plates,
  prescriptions, invoices, maps.
- **The invisible work.** What happens that has no UI (retrieval, indexing, delegation),
  and a metaphor for it drawn from the shapes above.
- **Tone.** Calm and exact, playful, urgent? It sets tempo, key, world (dark or light)
  and easing.

Then map these to `devices.md`. The same device used for a different verb is fine; the
same film with a different logo is not.

## 6. Fact-checking and real content

- **Every claim on screen must be true:** a law article, a fine amount, a statistic,
  a feature.
  - Prefer an official API or register over a web page. Spain's legislation, for
    example, is on the BOE open-data API:
    `https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/<BOE-ID>/texto/bloque/<article>`.
  - Note the source next to the constant in `timeline.js`.
- **Documents shown in a viewer:** `scripts/pdf_passage.py file.pdf <page> "quoted passage"`
  renders the real page and returns one box per line of the passage, for the highlight
  overlay. It ignores accents, case and hyphenation; check a preview when it reports a
  fuzzy score. Check that the page numbering matches what the app would show.
- **Example data.** Take it from the product's real flows. Production data is used
  read-only, and only if the user allows it. Anonymize anything personal. For
  fictional documents (an uploaded PDF), invent generic ones rather than imitating a
  real organization's document.
- **The user's content.** Mark anything shown as a photo or illustration in the asset
  sheet as generated or real, so the user can decide.
