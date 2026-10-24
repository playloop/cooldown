// Signed distance functions: negative inside a shape, positive outside, zero on
// the edge. All of these are the standard published 2D primitives from Inigo
// Quilez, https://iquilezles.org/articles/distfunctions2d/

float sdBox(vec2 p, vec2 halfSize) {
  vec2 d = abs(p) - halfSize;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdRoundBox(vec2 p, vec2 halfSize, float radius) {
  return sdBox(p, halfSize - radius) - radius;
}

float sdCircle(vec2 p, float radius) {
  return length(p) - radius;
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

// Isosceles triangle with its tip at the origin and its base at y = q.y.
float sdTriangleIsosceles(vec2 p, vec2 q) {
  p.x = abs(p.x);
  vec2 a = p - q * clamp(dot(p, q) / dot(q, q), 0.0, 1.0);
  vec2 b = p - q * vec2(clamp(p.x / q.x, 0.0, 1.0), 1.0);
  float s = -sign(q.y);
  vec2 d = min(vec2(dot(a, a), s * (p.x * q.y - p.y * q.x)), vec2(dot(b, b), s * (p.y - q.y)));
  return -sqrt(d.x) * sign(d.y);
}

// Polynomial smooth minimum: a union that melts shapes together over distance k.
// https://iquilezles.org/articles/smin/
float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

// Turns a distance into a crisp 0..1 fill, antialiased over one pixel.
float fill(float d, float pixel) {
  return smoothstep(pixel, -pixel, d);
}
