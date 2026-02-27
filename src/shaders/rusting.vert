varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;
varying mat3 vTBN;

attribute vec4 tangent;

void main() {
  vUv = uv;

  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;

  vNormal = normalize(normalMatrix * normal);

  vec3 T = normalize(normalMatrix * tangent.xyz);
  vec3 N = vNormal;
  vec3 B = normalize(cross(N, T) * tangent.w);
  vTBN = mat3(T, B, N);

  gl_Position = projectionMatrix * mvPosition;
}
