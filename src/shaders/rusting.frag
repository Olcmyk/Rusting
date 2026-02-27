precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;
varying mat3 vTBN;

// Metal textures
uniform sampler2D metalColorMap;
uniform sampler2D metalNormalMap;
uniform sampler2D metalRoughnessMap;
uniform sampler2D metalMetalnessMap;

// Rust textures
uniform sampler2D rustColorMap;
uniform sampler2D rustNormalMap;
uniform sampler2D rustRoughnessMap;
uniform sampler2D rustAOMap;

// Rust parameters
uniform float rustProgress;
uniform float noiseScale;
uniform float edgeSharpness;
uniform float noiseOctaves;

// Lighting
uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform float lightIntensity;
uniform float ambientIntensity;

const float PI = 3.14159265359;

// Simplex noise functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i.xyxy).xy;
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Fractal Brownian Motion for more natural rust patterns
float fbm(vec2 uv, float octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (float i = 0.0; i < 6.0; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(uv * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// Generate rust mask with natural patterns
float generateRustMask(vec2 uv, float progress) {
  float noise1 = fbm(uv * noiseScale, noiseOctaves);
  float noise2 = fbm(uv * noiseScale * 2.3 + vec2(100.0), max(1.0, noiseOctaves - 1.0));
  float noise3 = snoise(uv * noiseScale * 0.5 + vec2(50.0));

  float combinedNoise = noise1 * 0.6 + noise2 * 0.3 + noise3 * 0.1;
  combinedNoise = combinedNoise * 0.5 + 0.5;

  float threshold = 1.0 - progress;
  float edge = edgeSharpness * 0.5;
  return smoothstep(threshold - edge, threshold + edge, combinedNoise);
}

// PBR Functions
float DistributionGGX(vec3 N, vec3 H, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float NdotH2 = NdotH * NdotH;
  float nom = a2;
  float denom = (NdotH2 * (a2 - 1.0) + 1.0);
  denom = PI * denom * denom;
  return nom / max(denom, 0.0001);
}

float GeometrySchlickGGX(float NdotV, float roughness) {
  float r = (roughness + 1.0);
  float k = (r * r) / 8.0;
  float nom = NdotV;
  float denom = NdotV * (1.0 - k) + k;
  return nom / max(denom, 0.0001);
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
  float NdotV = max(dot(N, V), 0.0);
  float NdotL = max(dot(N, L), 0.0);
  float ggx2 = GeometrySchlickGGX(NdotV, roughness);
  float ggx1 = GeometrySchlickGGX(NdotL, roughness);
  return ggx1 * ggx2;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

void main() {
  // Sample metal textures
  vec4 metalColor = texture2D(metalColorMap, vUv);
  vec3 metalNormalTex = texture2D(metalNormalMap, vUv).rgb;
  float metalRoughness = texture2D(metalRoughnessMap, vUv).r;
  float metalMetalness = texture2D(metalMetalnessMap, vUv).r;

  // Sample rust textures
  vec4 rustColor = texture2D(rustColorMap, vUv);
  vec3 rustNormalTex = texture2D(rustNormalMap, vUv).rgb;
  float rustRoughness = texture2D(rustRoughnessMap, vUv).r;
  float rustAO = texture2D(rustAOMap, vUv).r;

  // Generate rust mask
  float mask = generateRustMask(vUv, rustProgress);

  // Blend all properties
  vec3 albedo = mix(metalColor.rgb, rustColor.rgb, mask);
  albedo = pow(albedo, vec3(2.2)); // sRGB to linear

  vec3 blendedNormalTex = mix(metalNormalTex, rustNormalTex, mask);

  float roughness = mix(metalRoughness, rustRoughness, mask);
  roughness = clamp(roughness, 0.04, 1.0);

  float metalness = mix(metalMetalness, 0.0, mask);
  float ao = mix(1.0, rustAO, mask);

  // Calculate normal in world space
  vec3 normal = blendedNormalTex * 2.0 - 1.0;
  vec3 N = normalize(vTBN * normal);
  vec3 V = normalize(vViewPosition);

  // Calculate F0
  vec3 F0 = vec3(0.04);
  F0 = mix(F0, albedo, metalness);

  // Direct lighting
  vec3 L = normalize(lightDirection);
  vec3 H = normalize(V + L);

  float NDF = DistributionGGX(N, H, roughness);
  float G = GeometrySmith(N, V, L, roughness);
  vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);

  vec3 numerator = NDF * G * F;
  float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
  vec3 specular = numerator / denominator;

  vec3 kS = F;
  vec3 kD = vec3(1.0) - kS;
  kD *= 1.0 - metalness;

  float NdotL = max(dot(N, L), 0.0);
  vec3 Lo = (kD * albedo / PI + specular) * lightColor * lightIntensity * NdotL;

  // Simple ambient
  vec3 ambient = albedo * ambientIntensity * ao;

  // Final color
  vec3 color = ambient + Lo;

  // Tone mapping
  color = color / (color + vec3(1.0));

  // Gamma correction
  color = pow(color, vec3(1.0 / 2.2));

  gl_FragColor = vec4(color, 1.0);
}
