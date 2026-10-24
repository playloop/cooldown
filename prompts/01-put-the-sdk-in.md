# Episode 1: put the SDK in and count the deaths

These are the prompts from episode 1, exactly as they were typed into Claude
Code on camera. Run them in order, one at a time, and wait for each to finish.

## Before the prompts (once)

1. Create a game for Cooldown in Playloop and copy its ingest key.
2. Put the key in `.env.local` at the repo root. That file is gitignored, so
   the key never lands in a commit:

   ```bash
   echo "VITE_PLAYLOOP_INGEST_KEY=pl_ik_your_key" > .env.local
   ```

3. Connect the Playloop MCP to Claude Code with your management key, so the
   agent can read your playtests back:

   ```bash
   claude mcp add --transport http playloop https://playloop.gg/api/mcp \
     --header "Authorization: Bearer $PLAYLOOP_MANAGEMENT_KEY"
   ```

## Prompt 1: wire the SDK

One job: send every game event to Playloop, without touching the game rules.

```text
Add the Playloop TypeScript SDK to this game. Its agent guide is https://raw.githubusercontent.com/playloop/sdk-typescript/v0.5.0/AGENTS.md, so follow it for the install and the calls. Put the mapping from GameEvent to telemetry in its own file in src/events, with a test, and subscribe it at the TODO(episode 1) in src/main.ts. Every event keeps its fields, so a death goes out with its cause. Do not change anything in src/sim. The ingest key comes from import.meta.env.VITE_PLAYLOOP_INGEST_KEY and is already in .env.local, so do not open that file. Finish with npm run check.
```

## Prompt 2: commit it

One job: one commit, only the files that changed.

```text
Commit this as one commit. Stage only the files you changed and write a plain one-line message.
```

Then run the game (`npm run dev`) and die once.

## Prompt 3: read the death back

One job: check the death arrived, with its cause, from inside the agent.

```text
Use the Playloop MCP to find the newest Cooldown session and tell me how the runner died.
```

## Prompt 4: the SDF beat

One job: draw something small in the game's own look. Each death already leaves a warm mark; make
it a flame, built from two published shapes melted together.

```text
Make the death marks small flames instead of round glows. In markHeat in src/render/shaders/scene.frag, build each mark from sdCircle and sdTriangleIsosceles in src/render/shaders/sdf.glsl, joined with smin, point up, with a slow flicker from uTime. It still only adds heat, so the colormap does the color, it stays inside the uMarkCount loop, and nothing outside src/render changes. Then run npm run check.
```

## Prompt 5: commit it

```text
Commit this as one commit. Stage only the files you changed and write a plain one-line message.
```

Then die a few times at the gap and look at the marks.

## Off camera

These landed during the episode without a prompt on screen. They are in
`ep01-end`, so a diff against your own run will show them:

- `c403b23` asks agents to keep em dashes out of their replies (the repo is
  built on camera).
- `e83fb60` adds `?debug&native`, which renders at the screen's real resolution
  for recording.
- `47e3538` makes built copies report the `production` environment and the
  build version, so real players' sessions from the itch.io build show up in
  Playloop's build and fix-first reads (the SDK defaults to `dev`).

