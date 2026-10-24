// The whole frame is one heat value per pixel, pushed through the inferno
// colormap at the end. Each layer below takes the heat so far and returns it
// with its own contribution: hotter things are brighter, and a streak's color
// is literally how long it has left.
// Constants (WORLD_W, MAX_SOLIDS, ...) are injected from the TypeScript config.

uniform vec2 uRes;
uniform float uTime;
uniform float uRoomSeed;
uniform vec4 uSolids[MAX_SOLIDS];
uniform int uSolidCount;
uniform vec4 uSpikes[MAX_SPIKES];
uniform int uSpikeCount;
uniform vec4 uStreaks[MAX_STREAKS];
uniform vec2 uStreakHeat[MAX_STREAKS];
uniform int uStreakCount;
uniform vec4 uMarks[MAX_MARKS];
uniform int uMarkCount;
uniform float uMarkScale;
uniform vec4 uPlayer;
uniform float uPlayerVisible;
uniform float uStride;
uniform vec4 uBurst;
uniform vec4 uExit;

out vec4 outColor;

float groundDistance(vec2 p) {
  float d = 1e5;
  for (int i = 0; i < uSolidCount; i++) d = min(d, sdBox(p - uSolids[i].xy, uSolids[i].zw));
  return d;
}

// A row of upward spikes. The row is split into a whole number of equal teeth.
float spikeRowDistance(vec2 p, vec4 row) {
  float width = (row.y - row.x) / row.w;
  float cell = clamp(floor((p.x - row.x) / width), 0.0, row.w - 1.0);
  float cx = row.x + (cell + 0.5) * width;
  float tipY = row.z + SPIKE_H;
  return sdTriangleIsosceles(vec2(p.x - cx, tipY - p.y), vec2(0.5 * width, SPIKE_H));
}

// 1 inside a spike row's pit, fading at its edges.
float inPit(vec2 p, vec4 row) {
  return smoothstep(row.x - 0.4, row.x + 0.4, p.x) * smoothstep(row.y + 0.4, row.y - 0.4, p.x);
}

// Cold air with slow rising convection.
float airHeat(vec2 p) {
  return 0.07 + 0.05 * valueNoise(p * vec2(0.5, 0.35) + vec2(uRoomSeed * 7.3, -uTime * 0.6));
}

// Far structures, barely warmer than air, for depth. Shifted per room.
float backdropHeat(float h, vec2 p, float px) {
  float shift = mod(uRoomSeed * 5.0, 9.0);
  float far = min(sdBox(p - vec2(9.0 + shift, 11.0), vec2(0.6, 7.0)), sdBox(p - vec2(19.5 + shift * 0.5, 12.5), vec2(0.4, 5.5)));
  far = min(far, sdBox(p - vec2(16.0, 16.6), vec2(13.0, 0.25)));
  return mix(h, 0.13, fill(far, px) * 0.8);
}

// Rock with a sensor-sharpened rim, and pits that hold heat around their spikes.
float groundHeat(float h, vec2 p, float px) {
  float pitGlow = 0.0;
  float pitFloor = 0.0;
  for (int i = 0; i < uSpikeCount; i++) {
    float pit = inPit(p, uSpikes[i]);
    pitGlow += pit * 0.42 * exp(-max(p.y - uSpikes[i].z, 0.0) * 0.55);
    pitFloor = max(pitFloor, pit * step(p.y, uSpikes[i].z));
  }
  h += pitGlow;
  float d = groundDistance(p);
  float rock = 0.19 + 0.05 * valueNoise(p * 1.5) + 0.03 * valueNoise(p * 7.0) + 0.024 * step(0.5, fract(p.y * 0.5));
  rock = max(rock, pitFloor * (0.6 + 0.12 * valueNoise(p * 3.0 + uTime)));
  h = mix(h, rock, fill(d, px));
  return h + 0.22 * exp(-abs(d) * 10.0) * (1.0 - pitFloor);
}

// Cold steel spikes, dark against the hot pit.
float spikeHeat(float h, vec2 p, float px) {
  float d = 1e5;
  for (int i = 0; i < uSpikeCount; i++) d = min(d, spikeRowDistance(p, uSpikes[i]));
  h = mix(h, 0.035, fill(d, px));
  return h + 0.06 * exp(-abs(d) * 18.0) * step(0.0, d);
}

// The exit: a warm vent with heat rising through it.
float exitHeat(float h, vec2 p, float px) {
  vec2 q = p - uExit.xy;
  float d = sdBox(q, uExit.zw);
  float rise = 1.0 - clamp((q.y + uExit.w) / (2.0 * uExit.w), 0.0, 1.0);
  float shimmer = valueNoise(vec2(p.x * 3.0, p.y * 1.5 - uTime * 2.5));
  h = mix(h, max(h, 0.36 + 0.34 * shimmer * rise), fill(d, px));
  return h + 0.2 * exp(-abs(d) * 6.0);
}

// A small flame: a round bulb melted into an upward tip. Local space: the bulb
// center at the origin. The tip height and lean flicker slowly, out of step per mark.
float sdFlame(vec2 q, float phase) {
  float top = 0.62 * (0.88 + 0.08 * sin(uTime * 1.7 + phase) + 0.04 * sin(uTime * 2.9 + phase * 1.3));
  q.x -= 0.07 * sin(uTime * 1.1 + phase) * clamp(q.y / top, 0.0, 1.0);
  float bulb = sdCircle(q, 0.2);
  float tip = sdTriangleIsosceles(vec2(q.x, top - q.y), vec2(0.18, top));
  return smin(bulb, tip, 0.12);
}

// Body heat left where you died before in this room, burning as a small flame.
float markHeat(float h, vec2 p, float px) {
  for (int i = 0; i < uMarkCount; i++) {
    // Scaling a distance field: evaluate in the shrunk space, then scale the distance back up.
    float d = sdFlame((p - uMarks[i].xy) / uMarkScale, hash(uMarks[i].xy) * 6.2831853) * uMarkScale;
    // A hotter inner flame inside the outer one, and a soft glow around both.
    h += uMarks[i].z * (0.2 * fill(d, px) + 0.14 * fill(d + 0.08, px) + 0.12 * exp(-max(d, 0.0) * 5.0));
  }
  return h;
}

// The streaks. Heat is linear from one end to the other, so two numbers per
// streak rebuild every point. Solid while heat is above zero.
float streakHeat(float h, vec2 p, float px) {
  for (int i = 0; i < uStreakCount; i++) {
    vec4 s = uStreaks[i];
    float x0 = min(s.x, s.y), x1 = max(s.x, s.y);
    float along = abs(s.y - s.x) < 1e-4 ? 1.0 : (clamp(p.x, x0, x1) - s.x) / (s.y - s.x);
    float heat = clamp(mix(uStreakHeat[i].x, uStreakHeat[i].y, along), 0.0, 1.0);
    vec2 center = vec2(0.5 * (x0 + x1), s.z - 0.5 * STREAK_THICKNESS);
    vec2 halfSize = vec2(0.5 * (x1 - x0) + 0.18, 0.5 * STREAK_THICKNESS);
    float d = sdRoundBox(p - center, halfSize, 0.16);
    float solid = step(1e-4, heat);
    h = mix(h, 0.18 + 0.82 * heat, fill(d, px) * solid);
    h += 0.55 * heat * exp(-max(d, 0.0) * 2.6) * solid;
    h += (1.0 - solid) * 0.05 * exp(-abs(d) * 14.0);
  }
  return h;
}

// The runner is the hottest thing in frame, with afterimages while dashing.
float runnerHeat(float h, vec2 p, float px) {
  vec2 q = p - uPlayer.xy;
  float facing = uPlayer.z;
  float d = sdRunner(q, facing, uStride);
  for (int i = 1; i <= 3; i++) {
    float fi = float(i);
    float ghost = sdRunner(q + vec2(facing * fi * 0.85, 0.0), facing, uStride);
    h = max(h, uPlayer.w * (0.75 - fi * 0.17) * fill(ghost, px));
  }
  h += 0.35 * exp(-max(d, 0.0) * 2.2);
  h = mix(h, 0.97, fill(d, px));
  return mix(h, 0.62, fill(sdVisor(q, facing), px));
}

// Death: a hot ring and sparks flying out.
float burstHeat(float h, vec2 p) {
  vec2 b = p - uBurst.xy;
  float age = uBurst.z;
  float ring = abs(length(b) - age * 7.0) - 0.08 * (1.0 - age);
  h += (1.0 - age) * 0.9 * exp(-max(ring, 0.0) * 6.0);
  float turn = atan(b.y, b.x) / 6.2831853 * 14.0;
  float r = length(b) - age * (4.0 + 3.0 * hash(vec2(floor(turn), 1.0)));
  return h + (1.0 - age) * step(abs(r), 0.18) * step(fract(turn), 0.25);
}

// Pixel sizes in the camera effects are written for a 720-pixel-tall canvas; this scales them so
// the look is the same at any resolution.
float pixelScale() {
  return uRes.y / 720.0;
}

// The camera: scanlines, grain and a vignette.
vec3 sensor(vec3 col, vec2 uv) {
  col *= 0.94 + 0.06 * sin(gl_FragCoord.y / pixelScale() * 3.14159);
  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.035;
  return col * (1.0 - 0.35 * pow(length(uv - 0.5) * 1.25, 2.5));
}

// Camera overlay: corner brackets and the heat scale, top right.
vec3 overlay(vec3 col, vec2 uv) {
  vec2 c = abs(uv - 0.5) * uRes / uRes.y;
  vec2 e = vec2(0.5 * uRes.x / uRes.y, 0.5) - 0.045;
  float bracket = min(sdSegment(c, e, e - vec2(0.06, 0.0)), sdSegment(c, e, e - vec2(0.0, 0.06)));
  col = mix(col, vec3(0.92), smoothstep(0.0022, 0.0008, bracket));
  // Kept high on the screen, above every exit, so it never covers the doorway.
  vec2 bar = gl_FragCoord.xy - vec2(uRes.x - 44.0 * pixelScale(), uRes.y * 0.68);
  if (abs(bar.x) < 6.0 * pixelScale() && bar.y > 0.0 && bar.y < uRes.y * 0.2) col = inferno(bar.y / (uRes.y * 0.2));
  return col;
}

void main() {
  vec2 p = gl_FragCoord.xy / uRes.y * WORLD_H;
  float px = WORLD_H / uRes.y;
  float h = airHeat(p);
  h = backdropHeat(h, p, px);
  h = groundHeat(h, p, px);
  h = spikeHeat(h, p, px);
  h = exitHeat(h, p, px);
  h = markHeat(h, p, px);
  h = streakHeat(h, p, px);
  if (uPlayerVisible > 0.5) h = runnerHeat(h, p, px);
  if (uBurst.w > 0.5) h = burstHeat(h, p);
  vec2 uv = gl_FragCoord.xy / uRes;
  outColor = vec4(overlay(sensor(inferno(clamp(h, 0.0, 1.0)), uv), uv), 1.0);
}
