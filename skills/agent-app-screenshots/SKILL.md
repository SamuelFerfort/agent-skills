---
name: agent-app-screenshots
description: Explore a web app with agent-browser, capture curated and redacted screenshots of it, and plug them into an AI agent so it can explain where things are and show the right screenshot inline, at the exact point of its answer. Use when an agent needs to know an app's UI (its own chat widget or any product it supports), when adding screenshots to an agent's answers, or when building a "how do I…" help skill with images.
---

# App screenshots for agents

At the end of this process, an agent answers "how do I link WhatsApp?" or "where is my history?" with
the exact labels of the app. On its own, it also shows the screenshot of that part of the screen
right after the sentence that explains it. In a chat it does this with a marker in its text. In
channels where its text is not rendered as markdown (voice with a screen, for example) it uses a
tool. Channels without a screen get no screenshots.

The method has two halves:

1. **Capture.** Navigate the app with `agent-browser`, capture at 2x, redact anything personal, clean
   the edges and write a catalog.
2. **Wire into the agent.** A skill (or prompt section) with the app knowledge and the screenshot
   rules, a marker or tool so the agent can place a screenshot, and a frontend component that renders
   it.

It comes from a production build: a chat widget, a Mastra agent, Streamdown for markdown, webpack
and a voice mode. That stack is the tested example, not a requirement. `reference.md` has the code
and `scripts/` has the capture helpers.

## 0. Decide before you start

Ask the user only what the code can't tell you:

- **Which app and which agent.** Either the agent's own UI or another product the agent supports.
- **Channels.** Chat with a screen, voice with a screen, phone, messaging. Screenshots only where
  there is a screen.
- **Where the images live.** The recommended place is the repo, next to the frontend. The bundler
  emits them with content hashes and the frontend deploy ships them to the same CDN as the app, so
  there is no extra upload step, no cache problems, and a test can check that every catalog id has
  an image. A separate bucket with a manifest the frontend downloads only pays off when non-developers
  change the screenshots often.
- **Account to capture with.** Prefer one with demo data. With a real account, redact everything
  personal: titles, names, figures, codes, phone numbers.
- **Sensitive values shown on screen,** such as a support phone number. Ask whether they may appear.
  Until someone decides, use obviously fake placeholders (`+34 900 000 000`) and redact them.

## 1. Inventory the UI from the code

Before opening the browser, read the code:

- **i18n files.** Every visible label: navigation, dialogs, composer, message actions, errors. The
  agent will use these exact labels.
- **Navigation.** Sidebars, headers, footers, context menus and keyboard shortcuts.
- **Flags that hide parts of the UI.** Both build-time flags (such as webpack `DefinePlugin`) and
  runtime flags. List them and turn them all on for the capture.
- **Existing demos or help views with sample data.** They are the best source of screenshots of
  results: real UI components with no real data.

Then write the list of candidate screenshots: landing screen, composer, navigation, every dialog,
every kind of result (figures, chart, table, cards, confirmation, document, download) and every
channel. The reference build ended up with 29.

## 2. An environment with everything on

- Run the app with all flags and all processes. A voice mode, for example, may need a separate proxy
  that the normal `dev` script does not start.
- Configure it like production (same voice transport, same models), so the screenshots match what
  users see.
- **Login.** If the OAuth popup returns to the production callback instead of your local server, sign
  in with a session token in the URL.
- Copy `scripts/` to a working folder and export `SESSION` (the agent-browser session name) and `OUT`
  (the output folder).

## 3. Capture with agent-browser

```bash
agent-browser --session "$SESSION" --headed open "http://localhost:4005/#token=…"
agent-browser --session "$SESSION" set viewport 1440 900 2   # 2x device scale
agent-browser --session "$SESSION" snapshot -i               # interactive elements with refs
```

- **No debug mode.** If the test page opens the widget with debug info, reopen it without.
- **Shadow DOM.** agent-browser selectors do not pierce it.
  - `scripts/q.sh` runs JS with a `$$` that walks nested shadow roots.
  - `scripts/mark.sh` tags the element with `data-cap`.
  - `scripts/shot.sh` measures that element and crops it out of a full 2x screenshot, with padding.
- **Clicks.**
  - `scripts/click.sh` uses `el.click()`, which works for most things.
  - Anything that opens a popup window, or a react-aria menu, needs a real click: `agent-browser
    click @e8` (a ref from `snapshot -i`), or `mouse move X Y`, `mouse down`, `mouse up`.
  - A JS click is not a user gesture, so the browser blocks the popup.
- **Animated demos.** With `set media light reduced-motion`, a player that honours reduced motion
  shows each scene in its final state. Switch scenes with the player's own buttons. Otherwise,
  capture several frames and pick a stable one.
- **Content taller than its card.** If a speech bubble comes out cut at the top, remove the
  container's fixed height with JS before capturing.
- **Tabs.** Closing the active tab can take the app tab with it, and the session too. Capture
  standalone pages in a separate `--session`.
- **Server-rendered pages you can't reach locally,** such as a production-only login step: render them
  locally with the server function that builds them and fake data, then capture the file.

## 4. Curate

- **Redact.** `shot.sh <id> <selector> <padding> <selectors to redact…>` blurs through a single mask.
  - Each area is clipped to the visible part of its scrolling container. Otherwise off-screen list
    rows land on top of the footer and blur it.
  - `wrap.sh '<regex>'` wraps only the matching text in a span, so a number inside a sentence can be
    blurred without blurring the sentence.
- **Menus over redacted lists.** Paint the menu's rectangle black in the mask so its own text stays
  sharp.
- **Corners.** A crop that touches the edge of a rounded modal picks up whatever is behind it.
  `corners.sh` removes 1 px from those edges and makes the rounded corners transparent, using the
  container's radius at the capture scale. Check all four corners of every UI screenshot, for example
  against a magenta background.
- **Trim to content.** `trim.sh` adds a white border before `-trim`. On a rounded card the corner
  pixel is grey, and `-trim` then treats grey as the background and removes nothing. After that it
  adds a uniform margin.
- **Format.** WebP at quality 82, kept at 2x. That comes to about 25 KB per screenshot.
- **Review.** Show the user a contact sheet (`magick montage`) before publishing anything.

## 5. The catalog, the single source of truth

`screenshots.json` sits next to the images. The backend reads it to build the skill text and the
tool enum, and the frontend reads it for alt text, size and URL:

```json
[{ "id": "sidebar", "width": 243, "height": 818,
   "shows": "The whole sidebar: \"New chat\", search and collapse at the top; …",
   "when": "When they ask where the history is or what the left-hand menu has." }]
```

- `id` uses only `[a-z0-9-]`. It is what the model writes.
- `width` and `height` are pixels at 1x, half the WebP size. They reserve the space so the text
  doesn't jump when the image loads.
- `shows` says what is visible, with the exact labels. It doubles as the alt text.
- `when` says when to show it.

## 6. Wire it into the agent

As a skill: in Mastra it is `createSkill({ name, description, instructions })`. The prompt always
carries only the name and description, and the body arrives through the `skill` tool when the model
asks for it. In a framework without skills, it is a prompt section loaded on demand.

- **Description.** What it covers, plus "use it whenever they ask about the app itself, what it can
  do or how to use it; not for their data". That last part keeps it from loading on business
  questions.
- **Body.** Organise it by area (navigation, composer, results, what it can do, each channel, what to
  do if something is missing) and use the exact i18n labels. Leave out values that change, such as
  phone numbers: point to the dialog that shows them.
- **Screenshot rules for chat:**
  - use screenshots proactively, without waiting to be asked;
  - write `[screenshot:<id>]` on its own line, right after the sentence it illustrates;
  - one per thing explained and at most three per answer;
  - only ids from the list;
  - don't describe the image.

  Generate the list from the catalog (`- \`id\`: shows when`).
- **Per-channel variants.** A single `skill(extra)` function builds the marker version, the tool
  version and the no-screenshot version. The agent's skills resolver picks one by channel.
- **Measure the cost.** In the reference build it was +672 input tokens per turn over 10,136, or
  6.6%: the skill block plus Mastra's three skill tools.

## 7. Render the screenshot in the chat

Details are in `reference.md`.

- Before the markdown renderer, turn the marker into a block-level custom tag:
  `\n\n<screenshot name="id"></screenshot>\n\n`. Block HTML can't sit inside a paragraph.
- **Use a `name` attribute, not `id`.** `rehype-sanitize`, used by Streamdown and react-markdown,
  prefixes `id` with `user-content-`, and the component can't find the screenshot. This fails
  silently.
- Add the tag and its attribute to the sanitizer allowlist, and the component to the components map.
- **While streaming,** strip a half-written marker at the end of the text with a regex of prefixes,
  so `[screen` never flashes.
- An id that is not in the catalog renders nothing. Strip markers when the user copies the answer.
- **Fast path.** If the text has no `[`, return it untouched. This runs on every token.
- **Component.**
  - `width`, `height` and alt text from the catalog, a `max-height` of about 360 px, and a 1 px
    black outline at 10% opacity.
  - A skeleton until the image loads, and zoom on click.
  - On `onError`, render nothing. Otherwise it stays a skeleton forever.
- **Images from the bundle.**
  - In webpack: `import.meta.webpackContext(dir, { regExp: /\.webp$/ })`.
  - In Vite: `import.meta.glob('…/*.webp', { eager: true, query: '?url' })`.
  - The URL comes out hashed and served from each environment's CDN. With `publicPath: 'auto'` there
    is nothing to configure per environment.

## 8. Channels where the text isn't markdown (voice with a screen)

- In voice, the visible text is the voice model's transcript. A marker would not render, and it would
  be read out loud.
- **Tool `show_screenshot({ id })`** with `z.enum(catalog ids)`, so the model can't invent a
  screenshot. The frontend renders the screenshot as that tool step's result, at its place in the
  turn.
- **Voice instructions:** say it in words ("the sidebar on the left, at the very bottom") and call
  the tool proactively.
- If the voice model delegates to a text agent, give the skill and the tool to the delegate. The voice
  model itself doesn't change.

## 9. Backend and deploy

- The backend imports the same JSON (`resolveJsonModule`). If the Docker build only copies the
  backend folder, add `COPY assets/…/screenshots.json` or the image build fails.
- The images ship with the frontend deploy: chunks and assets first, the entrypoint last. Check that
  the CDN serves `content-type: image/webp`, and upload them separately with `--content-type
  image/webp` if needed.
- A backend deploy doesn't publish the frontend, and the other way round. You need both.

## 10. Verify against the real model

1. With the real prompt:
   - Does it load the skill when asked about the app, and not for a data question?
   - Does it put the marker right after the sentence?
   - Does it use screenshots without being asked?
2. In the browser: the screenshot renders, loads, and zoom opens with a real click.
3. Reload the thread: the screenshot still shows from the saved message.
4. Voice: the screenshot appears in its place in the turn. A useful test is Playwright with
   `--use-fake-device-for-media-stream` and a silent WAV, typing to the voice session and logging the
   bubble's structure every 200 ms.
5. Production: if your test browser can't reach the internet, check through the API (open a session,
   ask in chat, look for the marker in the stream) and `curl` the entrypoint, the chunk and one image
   from the CDN.

## Minimum tests

- Every catalog id has an image and there are no extra images; ids are valid and unique; fields are
  complete.
- The channel resolver returns the right variant for each channel and none for channels without a
  screen.
- The voice variant contains no `[screenshot:` and names the tool.
- The tool returns what the screenshot shows.

Skip tests that hold by construction. "The skill text contains every id" proves nothing if the text
is generated from the catalog.

## Mistakes already made

- **`<T>(…) =>` in a `.ts` file.** Babel with the TSX preset parses it as JSX and the frontend doesn't
  build, while `tsc` reports nothing. Use `function`, and run the real build before calling it done.
- **`id` on the marker tag.** The sanitizer prefixes it and the screenshot never appears.
- **Blurring area by area with `-region`.** With dozens of areas it takes minutes. Use one mask:
  `\( +clone -blur 0x16 \( mask \) -alpha off -compose CopyOpacity -composite \) -compose Over
  -composite`.
- **`read -r W H < <(magick identify …)` under `set -e`.** `identify` prints no trailing newline and
  the script dies silently. Use two assignments.
- **ImageMagick 7's three-image mask.** Its semantics changed and it blurred everything. Use
  `CopyOpacity`.
- **`pkill -f` with a pattern that matches its own command line.** It kills itself.
- **A scannable placeholder QR.** A made-up QR that opens a real chat confuses people. Either blur
  it, or generate it from the real data without the one-time code and check it with `zbarimg`.
- **Screenshots of forms.** They look real. It's an image, so clicking only zooms.
- **Overwriting the build output.** Any other bundler command in that folder invalidates it. Build
  with every environment variable right before uploading.
