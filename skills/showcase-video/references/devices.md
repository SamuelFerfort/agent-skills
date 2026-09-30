# Devices: a vocabulary for making each film different

A film should use a few of these, chosen because they fit *this* product's DNA (logo
shapes, core verb, magic moment, domain imagery). Don't use a device because it worked
last time. The profile's *Past videos* lists what this user has already seen.
Implementation notes point at `engine.md`.

## Contents
Openings · Presenting the UI · Metaphors for invisible work · Transitions · Typography ·
Rhythm and structure · Endings · Matching devices to products

---

## Openings (the first 2–3 s must hook)
- **The question, huge.** The user's real question typed full-screen and cropped by the
  frame, then the camera pulls back to reveal it sitting in the composer.
- **The pain first.** The before-state in 2 s: a stack of paper, 40 tabs, a ringing
  phone. Then it collapses into the product.
- **Logo shapes as the world.** The camera travels *through* a shape of the logo (a
  ring, a chip, a stroke), which opens into the product. The logo is revealed at the end.
- **The magic moment, cold.** Open on the "oh" instant, then rewind and explain.
- **A real artefact.** The domain's object in extreme close-up (a document, a plate, a
  prescription, an invoice) that the product then reads.
- **Counter or clock.** A number ticking (time saved, documents processed) that the
  film then justifies.
- **Sound first.** Black, a single UI sound, then the first frame lands on the downbeat.

## Presenting the UI
- **Isolated component** on plain ground: just the composer, just the result card. No
  window chrome.
- **Extreme close-up** cropped by the frame (a search bar edge, a badge). Tactile.
- **Tilted 3D plane** with a slow continuous glide and depth-of-field blur
  (`perspective`, `rotateX` about 20–30°, a blur layer). Restrained and premium.
- **Exploded layers.** The UI separates in Z into its layers (background, cards, text),
  then snaps back. Good for "how it works".
- **Wall or grid** of many outputs, to show breadth. Pull back from one item to reveal
  dozens.
- **Split view:** input left, result right, lines connecting them (`makeLink`).
- **Device in context:** a phone or laptop frame, built in device points, with touch taps
  (`tapAt`), the native sheets and camera UI.
- **The real window, wide, once:** credibility that it's a real product.

## Metaphors for invisible work
AI retrieval, indexing, extraction and delegation have no UI. Draw them.

- **Particles from the brand's own shapes** (droplets, strokes, dots) dissolve out of
  the query, travel to the sources, and return as the answer.
- **Scan beam** sweeping pages, with fragments flying into an index counter.
- **Comet lines** from a phrase into the form field it fills, or from a citation into
  its source passage.
- **Orbit and hub:** sources orbit the product's mark and fire in turn as they're used.
- **Lens:** a magnifier passing over data, revealing the structure beneath.
- **Growth:** a dot growing into a tree or network as knowledge accumulates.
- **Assembly:** the answer building itself from pieces that fly in from their sources.

## Transitions
Prefer transformations to hard cuts.

- **Morph:** element A becomes element B (a headline becomes the composer, a chart
  thumbnail becomes the full chart, a card becomes a cart).
- **Portal:** dive through an element into the next scene. Centre it first (see
  `engine.md`).
- **Shrink into:** the whole scene collapses into an element of the next.
- **Match cut:** the same shape or position in two different contexts.
- **Wipe shaped like the logo:** a mask in the brand's shape.
- **Whip pan:** a motion-blurred fast camera move, with the new scene arriving at the
  end.
- **Hard cut on the downbeat:** for bursts. Clean, rhythmic, sparing.
- **Colour or world flip:** dark to light (or back) at a section change, to mark a new
  chapter.

## Typography
- **Full-screen phrases,** 3–6 words, one beat each, rising word by word
  (`riseWords`).
- **Typed titles** with a caret, synced to key ticks.
- **Rolling placeholder:** the composer's placeholder cycles through real user prompts.
- **Kinetic emphasis:** one word scales, changes weight or colour on the beat.
- **Captions attached to UI:** a short label pinned to the element it describes, with a
  leader line.

## Rhythm and structure
- **One continuous camera.** No cuts: every scene is a place in one world. Needs careful
  staging, and it's very elegant.
- **Cut-driven:** 1–3 s shots alternating type and UI, with a burst in the middle.
- **Chaptered:** 3–4 titled chapters ("Ask" · "Verify" · "Act"), each with its own
  device.
- **Loop:** the end state is the opening state, so the film can loop on a website.
- **Burst:** 6–10 very short shots on 8th notes (outputs, formats, integrations), then
  silence.
- **Breath:** the music drops out for a bar before the magic moment.

## Endings
- **Logo, name, one useful line, URL.** The default; make its entrance specific to the
  brand's shapes.
- **Return to the opening image,** now resolved (the pile of paper is gone).
- **Store badges beat** on the last drop if there is a mobile app.
- **The product's own hero animation** rebuilt faithfully, if it has one. Users love
  seeing it.

## Matching devices to products

| Product trait | Devices that fit |
|---|---|
| Answers with sources (RAG, search) | Citation → passage comet lines, split view, scan-beam indexing, orbit and hub |
| Fills or extracts (forms, documents) | Comet lines phrase → field, exploded form, assembly |
| Generates (UI, text, images) | Wall of outputs, rolling placeholder, morph prompt → result |
| Data and analytics | Mini-chart grows into a full chart, lens, counter opening |
| Mobile-first | Device in context, touch taps, native camera or sheets, store badges |
| Voice | Waveform built from the logo's shape, captions, a silent visual rhythm (no voiceover unless asked) |
| Workflow or automation | Assembly line, chaptered structure, one continuous camera across steps |
