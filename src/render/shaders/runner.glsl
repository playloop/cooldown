// The runner, built from three primitives: a rounded body, a round head and two
// segment legs, melted together with smooth min. Local space: the center of the
// collision box at the origin, facing +x when facing = 1. Every size is a
// fraction of the collision box (PLAYER_HALF_W, PLAYER_HALF_H, injected from
// the config), so the drawn runner always matches the physics.

float sdRunner(vec2 p, float facing, float stride) {
  float h = PLAYER_HALF_H;
  float body = sdRoundBox(p - vec2(0.0, 0.03 * h), vec2(PLAYER_HALF_W, 0.48 * h), 0.32 * h);
  float head = sdCircle(p - vec2(0.07 * h * facing, 0.67 * h), 0.37 * h);
  float swing = 0.29 * h * sin(stride);
  float legA = sdSegment(p, vec2(-0.15 * h, -0.33 * h), vec2(-0.15 * h + swing, -0.88 * h));
  float legB = sdSegment(p, vec2(0.15 * h, -0.33 * h), vec2(0.15 * h - swing, -0.88 * h));
  // Leg thickness brings the soles down to the bottom of the box: -0.88h - 0.12h = -h.
  float legs = min(legA, legB) - 0.12 * h;
  return smin(smin(body, head, 0.21 * h), legs, 0.13 * h);
}

// The visor reads as cooler than the body, which shows which way it faces.
float sdVisor(vec2 p, float facing) {
  float h = PLAYER_HALF_H;
  return sdRoundBox(p - vec2(0.17 * h * facing, 0.71 * h), vec2(0.21 * h, 0.08 * h), 0.07 * h);
}
