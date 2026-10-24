# Original episode backlog (archived)

Superseded by [the current plan](EPISODES.md) on October 24, 2026.
These were proposals, not a record of filmed work. Cold pulses, checkpoints,
and a boss are outside the ten-room expansion.

# Episodes

The rolling backlog for the build-along series. Each episode adds one thing to
the game, measures it with one Playloop feature, teaches one shader idea, and
makes one honest point about building a game with a coding agent. The order
matters: each episode uses what the one before it added.

Keep at least ten episodes ahead of what has been filmed. Each episode's
prompts live beside its code in `prompts/NN-slug.md`, tightened before the
session and run exactly as written.

Playloop names below are real MCP tools and SDK calls. Anything marked
**(trial or paid)** needs the 14-day trial or a paid plan; everything else,
including every MCP read, works on the free plan.

---

## 1. Put the SDK in and count the deaths

- **The game gains:** the Playloop TypeScript SDK, subscribed to the event bus.
  `player_died` goes out with its cause (`spikes`, `streak_cooled`, or
  `fell_out`, which only a broken room can produce), room and position. The
  simulation does not change at all.
- **Playloop measures it with:** `client.telemetry.track`, then `list_sessions`,
  `get_session` and `get_event_stats` to see the deaths arrive.
- **Shader beat:** none. The point is that analytics plugs into a seam, not
  into the game rules.
- **Teaching point:** the agent wires the SDK from its own `AGENTS.md`. Give
  every death a cause on day one, because "where" without "why" cannot be fixed.

## 2. Where do people die?

- **The game gains:** `player_pos` sampled ten times a second, with the room
  name, so Playloop can build a heatmap.
- **Playloop measures it with:** `get_heatmap`, read by the agent.
- **Shader beat:** the warm death marks already in the game are a falloff
  `exp(-distance)`, the same idea a heatmap uses. Show both side by side.
- **Teaching point:** post the build and let strangers play it before you
  change anything. Your own deaths are not data.

## 3. The agent fixes the gap

- **The game gains:** one number changed in room 3, chosen from the data.
- **Playloop measures it with:** `get_fix_first`, then `list_builds` and
  `get_event_stats` filtered by build to compare deaths before and after.
- **Shader beat:** the streak's color is its timer. Walk through `endHeats` and
  why two numbers per streak are enough.
- **Teaching point:** one change, one new build version, then measure. The
  room tests encode the intent (hard but possible), so the fix updates a test
  on purpose and says so.

## 4. Checkpoints as warm vents

- **The game gains:** a vent mid-room that saves your spot.
- **Playloop measures it with:** `create_funnel` over `room_entered` steps and
  `get_funnel_result` to see how far people get.
- **Shader beat:** a soft radial glow and rising heat shimmer.
- **Teaching point:** a funnel turns "people quit" into "people quit here".

## 5. A/B test the streak lifetime

- **The game gains:** streak lifetime read from an experiment, 1.1 s against
  1.4 s.
- **Playloop measures it with:** `client.experiments.variant` in the game;
  `create_experiment`, `start_experiment`, `get_experiment_comparison` and
  `pick_experiment_winner` from the agent. The AI digest on the comparison is
  **(trial or paid)**; the raw per-variant numbers are not.
- **Shader beat:** none needed: the color already shows the lifetime.
- **Teaching point:** the agent proposes the experiment and players pick the
  winner. Nobody argues about feel.

## 6. Session state: what a run looked like

- **The game gains:** `client.state` set with the last room reached, deaths
  and best time, and a personal best on the cleared screen.
- **Playloop measures it with:** `get_session`, which carries the state into
  the session's plain-language summary.
- **Shader beat:** a hot flash on a new best.
- **Teaching point:** events are for what happened; state is for how it ended.

## 7. A feedback form after the gap

- **The game gains:** a one-question prompt the first time you clear room 3.
- **Playloop measures it with:** `client.feedback.submit`;
  `create_feedback_form` and `list_feedback_responses` from the agent.
- **Shader beat:** the screen cools to blue-black behind the form.
- **Teaching point:** ask at the moment that matters, once.

## 8. Cold rooms

- **The game gains:** heat becomes a world rule. A room has a temperature, and
  streaks cool faster in a cold one.
- **Playloop measures it with:** `create_experiment` with the cold room on or
  off, then `get_experiment_comparison` on deaths.
- **Shader beat:** domain-warped frost noise creeping in from the edges.
- **Teaching point:** a rule beats a one-off. One number in the room data
  changes how every streak behaves there.

## 9. Gamepad support

- **The game gains:** a gamepad source that feeds the same input latch.
- **Playloop measures it with:** an `input_device` event and
  `get_event_stats` to see how many people use a pad.
- **Shader beat:** none.
- **Teaching point:** the input layer was built to be swapped; this proves it.

## 10. Angled dashes make ramps

- **The game gains:** up and down diagonal dashes, so a streak can be a slope.
- **Playloop measures it with:** death events by cause and room, and
  `get_heatmap` to see if people use the new angle.
- **Shader beat:** a rotated capsule, which is the segment SDF with a radius.
- **Teaching point:** a new mechanic means new collision tests first.

## 11. Ice walls your streak melts through

- **The game gains:** ice that melts where a streak touches it.
- **Playloop measures it with:** a feedback form ("does melting feel good?")
  and `list_feedback_responses`; clustered themes via `get_feedback_themes`
  **(trial or paid)**.
- **Shader beat:** smooth min melting two shapes together.
- **Teaching point:** some things you can only learn by asking.

## 12. Handle a lost WebGL context

- **The game gains:** recovery when the GPU drops the context, and a clear
  message if WebGL2 is missing.
- **Playloop measures it with:** the SDK's crash reports, then
  `get_crash_groups` and `list_crashes`.
- **Shader beat:** what the browser throws away and what you must rebuild.
- **Teaching point:** crashes are data too, and they group by signature.

## 13. A quality setting for weak GPUs

- **The game gains:** render scale (full or half) chosen from measured frame time.
- **Playloop measures it with:** a `frame_time` event and `get_event_stats`;
  `get_metric_trend` to check crash and drop rates do not climb.
- **Shader beat:** rendering small and scaling up; why per-pixel cost is the budget.
- **Teaching point:** a slow frame kills a player for the wrong reason and
  poisons your death data.

## 14. Seekers

- **The game gains:** enemies that hunt the hottest thing on screen, which is
  often your fresh streak.
- **Playloop measures it with:** a new cause, `killed_by_seeker`, against
  `spikes` and `streak_cooled` in `get_event_stats`.
- **Shader beat:** angular seekers from triangles, with a glowing eye.
- **Teaching point:** add a cause, never reuse one.

## 15. Juice

- **The game gains:** screen shake on death, sparks when a streak breaks, and
  sound for the cool-down.
- **Playloop measures it with:** `get_retention` before and after the juice build.
- **Shader beat:** sparks as tiny SDF capsules.
- **Teaching point:** feel is measurable when you measure the right thing:
  whether people come back.

## 16. Heat shimmer over the whole frame

- **The game gains:** a full-screen distortion pass driven by the heat field.
- **Playloop measures it with:** `get_crash_groups` and
  `get_platform_breakdown` to catch older GPUs failing on the new pass.
- **Shader beat:** offsetting the lookup by the heat gradient.
- **Teaching point:** a pretty pass is a risk. Ship it, then look for who it broke.

## 17. Compare two builds properly

- **The game gains:** nothing new: a tuning pass on rooms 1 to 4.
- **Playloop measures it with:** `compare_builds` **(trial or paid)**, which
  sorts friction into resolved, smaller, carried over and introduced.
- **Shader beat:** none.
- **Teaching point:** "it feels better" against "these three problems went away".

## 18. A live playtest night

- **The game gains:** a fifth room, revealed during a live session.
- **Playloop measures it with:** `get_live_activity` while people play, then
  `get_activity_digest` for the night.
- **Shader beat:** whatever the new room needs.
- **Teaching point:** watching the numbers move live is the most honest demo.

## 19. Playtest keys and testers

- **The game gains:** a hard mode for invited testers.
- **Playloop measures it with:** `list_playtest_batches`, `list_playtest_keys`
  and `get_tester_journey` to follow one tester through every session.
- **Shader beat:** a colder palette for hard mode.
- **Teaching point:** a tester's whole journey beats a pile of single sessions.

## 20. Embers for explorers

- **The game gains:** optional embers off the main path.
- **Playloop measures it with:** `list_tester_archetypes`, to see whether
  speedrunners and explorers both exist in your players.
- **Shader beat:** ember particles that drift on the convection noise.
- **Teaching point:** design for the players you have, not the ones you imagine.

## 21. The cold boss

- **The game gains:** a boss that cools your streaks as it passes.
- **Playloop measures it with:** death events per attempt, and
  `get_build_drop_reasons` for why people quit at the boss.
- **Shader beat:** layered SDF rings and an animated core.
- **Teaching point:** a boss is a set of rules, so it gets tests like everything else.

## 22. Boss version two, from the data

- **The game gains:** the boss retuned from what players did.
- **Playloop measures it with:** `get_fix_first` and `compare_builds`
  **(trial or paid)** on boss v1 against v2.
- **Shader beat:** telegraphs: heat that builds before an attack.
- **Teaching point:** the agent reads, proposes, and you decide.

## 23. A week in review

- **The game gains:** a polish pass picked from the week's signals.
- **Playloop measures it with:** `get_activity_digest` for the week and
  `get_activity` for the trend.
- **Shader beat:** a title screen that shows the week's deaths as heat.
- **Teaching point:** a routine beats heroics. Same questions every week.
