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
