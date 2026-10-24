// The thermal-camera palette and the noise that keeps flat areas alive.

// matplotlib's "inferno" colormap (CC0, by Nathaniel J. Smith and Stefan van
// der Walt) as a degree-6 polynomial, least-squares fitted to its 256-entry
// table. One multiply-add chain per pixel instead of a texture lookup.
vec3 inferno(float t) {
  const vec3 c0 = vec3(0.000214, 0.001635, -0.037130);
  const vec3 c1 = vec3(0.105874, 0.566364, 4.117926);
  const vec3 c2 = vec3(11.617115, -3.947723, -16.257323);
  const vec3 c3 = vec3(-41.709277, 17.457724, 44.645117);
  const vec3 c4 = vec3(77.157454, -33.415679, -82.253923);
  const vec3 c5 = vec3(-71.287667, 32.553880, 73.588132);
  const vec3 c6 = vec3(25.092619, -12.222155, -23.115650);
  return clamp(c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6))))), 0.0, 1.0);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Value noise: smooth random hills, 0..1.
float valueNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
