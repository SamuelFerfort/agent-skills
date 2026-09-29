# agent-skills

Skills for AI coding agents (Claude Code, Cursor, Codex and others), in the
[Agent Skills](https://skills.sh) format.

```bash
npx skills add SamuelFerfort/agent-skills
```

## Skills

### [agent-app-screenshots](skills/agent-app-screenshots/SKILL.md)

Explore a web app with [agent-browser](https://github.com/vercel-labs/agent-browser), capture curated
and redacted screenshots of it, and plug them into an AI agent. The agent then explains where things
are in the app and shows the right screenshot inline, right after the sentence that explains it: with
a marker in chat, and with a tool in voice. It comes from a production chat widget.

- `SKILL.md`: the method, from the UI inventory to verifying against the real model, including the
  mistakes made along the way.
- `reference.md`: frontend (marker to component) and backend (catalog, skill, tool) code, plus tests.
- `scripts/`: capture and curation helpers for agent-browser and ImageMagick 7. They handle shadow
  DOM, crops at 2x, redaction through a single mask, transparent rounded corners and trimming.

Requirements: `agent-browser`, ImageMagick 7 (`magick`), Python 3.
