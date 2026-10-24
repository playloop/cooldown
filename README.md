# Cooldown

A tiny browser platformer. Dash in the air and you leave a white-hot streak.
Stand on it before it cools.

The whole game is drawn by one fragment shader that looks like a thermal
camera, so the color of a streak tells you how long it has left.

## Play it locally

```bash
npm install
npm run dev
```

Arrows or A/D to move, Space or Z to jump, X or Shift to dash.

## Follow along

Every episode has two tags. Read the [episode 1 prompts](prompts/01-put-the-sdk-in.md)
before checking out the start tag, which does not contain the prompts file yet.
Then run the prompts in Claude Code and compare what you get with the end tag:

```bash
git checkout ep01-start            # the game before the episode
# read the prompts from main while working at the start tag:
git show main:prompts/01-put-the-sdk-in.md
# run those prompts in Claude Code, one at a time
git diff ep01-start ep01-end       # what the episode changed
```

Your agent will not write exactly the same code, and that is fine. The end tag
also holds the few small changes made off camera; each prompts file lists them.

## Work on it

```bash
npm run check   # typecheck, lint, tests, build
```

[AGENTS.md](AGENTS.md) explains the structure and the rules.
[docs/EPISODES.md](docs/EPISODES.md) is what gets built next.

## License

MIT. See [LICENSE](LICENSE).
