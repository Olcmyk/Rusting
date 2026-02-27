const DEPLOY_TIMESTAMP = __DEPLOY_TIMESTAMP__;
const TOTAL_DAYS = __TOTAL_DAYS__;
const TOTAL_MS = TOTAL_DAYS * 86_400_000;

function smoothstep(x) {
  return x;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

export function getProgress(now = Date.now()) {
  const raw = clamp((now - DEPLOY_TIMESTAMP) / TOTAL_MS, 0, 1);
  return smoothstep(raw);
}

export function getRustParams(progress) {
  const p = progress;
  return {
    amount:     lerp(-1, 0.8, p),
    opacity:    lerp(0, 0.7, p),
    noise:      lerp(0, 0.7, p),
    noiseScale: lerp(0.2, 0.5, p),
    scale:      lerp(2, 4, p),
    iterations: Math.round(lerp(6, 9, p)),
    metalness:  lerp(1.0, 0.2, p),
    roughness:  lerp(0.05, 0.85, p),
  };
}

export function getRawProgress(now = Date.now()) {
  return clamp((now - DEPLOY_TIMESTAMP) / TOTAL_MS, 0, 1);
}

export { DEPLOY_TIMESTAMP, TOTAL_DAYS };
