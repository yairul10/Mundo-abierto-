# Cooperative mobile rendering

This pass reduces client presentation cost, leaving server simulation, input,
target ranges, health, rewards and damage unchanged.

- Very low/low cooperative clouds use one opaque analytic cloud-bank hit with
  the existing animated noise, colour and flash uniforms, instead of 14/18
  volumetric march samples per pixel. Medium/high retain their 24/28-step path.
- Low tiers keep ambient flashes without constructing TubeGeometry arcs during
  a strike. Medium/high retain the existing branching lightning geometry.
- Noise atlas initialization fills RGBA bytes directly instead of allocating an
  array for every texel.
- Cooperative NPC visual detail is limited to 2200–3100 units from the player,
  above weapon/companion targeting ranges. Far entities retain server state,
  goals and health, and resume presentation nearby. Threat/projectile processing
  remains active. Far rig animations and destruction bursts are skipped.
- Ordinary PvP arenas keep unlimited NPC detail. Hidden local graveyard debris
  no longer runs its detail scan inside shared maps.

Validation: existing Node tests and `tools/check-cooperative-mobile.mjs`, using
Three.js 0.180.0. The scene check verifies zero lightning meshes on low tiers,
remaining flash activity, disposal, retained NPC state and nearby restoration.
It is not a GPU/FPS benchmark. Shader appearance and sustained responsiveness
still need checking on the affected Redmi Note 14, at very low and a 30 FPS cap,
including a new enemy wave and several minutes of combat.


## Texture-layer corridor

All quality tiers now use 2/2/3/4 cloud texture samples per background pixel
(very low/low/medium/high), replacing the former 24/28 volume steps on medium/high
(each step fetched four atlas samples). One opaque fullscreen draw closes the
cylindrical walls and both ends, without transparent billboard overdraw. A shared
256×256 RGBA periodic texture with mipmaps replaces the 528×528 volume atlas.
Texture generation runs once on entry, never during a frame.

Nested radii give apparent parallax as the camera moves. Cloud detail blends
into opaque haze between 2200 and 4300 units, so only nearby visual sectors need
detail; no mesh or texture is allocated per corridor sector. This is an analytic
closed surface approximation, not streamed gameplay or volumetric clouds. It
loses true depth inside the cloud banks and their volumetric self-shading.
Enemies and server simulation keep their existing rules and detail culling.
Lightning uses one geometry segment per control point at medium/high; low tiers
retain flashes alone. Quality changes update the layer count without rebuilding.

Scene checks cover the texture memory budget, wrap mode, camera tracking, layer
counts and resource disposal. The shader also compiled and linked in a headless Mesa GLES2 context. Offscreen
renders at the corridor entry, middle and end stayed opaque for all layer counts;
the middle and end images were visually checked. Chromium startup was blocked
by process socket permissions, so the full browser game still needs checking.
These checks do not establish Redmi frame rates;
compare medium/high during the same encounter on that phone before claiming a
measured speedup. The image quality change is limited to the cooperative map.
