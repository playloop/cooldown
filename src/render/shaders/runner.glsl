// The runner, built from three primitives: a rounded body, a round head and two
// segment legs, melted together with smooth min. Local space: center of the
// body at the origin, feet at y = -0.75, facing +x when facing = 1.

float sdRunner(vec2 p, float facing, float stride) {
  float body = sdRoundBox(p - vec2(0.0, 0.02), vec2(0.3, 0.36), 0.24);
  float head = sdCircle(p - vec2(0.05 * facing, 0.5), 0.28);
  float swing = 0.22 * sin(stride);
  float legA = sdSegment(p, vec2(-0.11, -0.25), vec2(-0.11 + swing, -0.66));
  float legB = sdSegment(p, vec2(0.11, -0.25), vec2(0.11 - swing, -0.66));
  float legs = min(legA, legB) - 0.1;
  return smin(smin(body, head, 0.16), legs, 0.1);
}

// The visor reads as cooler than the body, which shows which way it faces.
float sdVisor(vec2 p, float facing) {
  return sdRoundBox(p - vec2(0.13 * facing, 0.53), vec2(0.16, 0.06), 0.055);
}
