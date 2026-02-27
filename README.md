# Rusting

A metal sphere oxidizing in real time.

The sphere starts as polished metal and slowly rusts over the configured duration. The frontend renders the current oxidation state based on elapsed time since deployment. Meanwhile, this repository's GitHub language bar shifts from Metal to Rust — the code itself is rusting.

## Status

- Oxidation: 0.0%
- Metal: 3 lines
- Rust: 0 lines

### Language Composition
```
████████████████████████████████████████████████████████████████████████████████
Metal: 100.0%                                                        Rust: 0.0%
```

## How it works

**Frontend**: Three.js WebGPU renders an icosahedron with procedural rust textures from [tsl-textures](https://github.com/boytchev/tsl-textures). The oxidation percentage is computed from `(now - deployTimestamp) / totalDays` with smoothstep easing.

**Language bar**: `.gitattributes` hides frontend code from linguist. The `self/` directory contains `metal.metal` and `rust.rs` — files of `#` comment lines. A daily GitHub Action moves one line from Metal to Rust, gradually shifting the repository's detected language ratio.

## Deploy

Deployed via Vercel. Edit `vercel.json` to change the total duration:

```
"buildCommand": "cd frontend && TOTAL_DAYS=3650 npm run build"
```

## Debug

Add `?debug` to the URL to show a progress slider for previewing the full oxidation timeline.
