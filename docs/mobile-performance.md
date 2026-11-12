# Mobile performance pass

The Android bundle includes all client changes through frontend build 441:

- Device-local 30/60 FPS drawing limits; simulation and network cadence are independent.
- Very low quality and conservative automatic startup, with cap-aware adaptation.
- Periodic HUD refresh at 10 Hz; explicit HUD actions remain immediate.
- Background scene drawing at 10 Hz behind the full-screen hangar and shop.
- 100 static asteroid transforms grouped into 20 geometry/material batches. Navigation still uses individual transforms, and bounds refresh on sector changes.
- Quality-dependent cloud samples, lightning geometry, explosion counts, fragments, effect distance and preview FPS.
- Backdrop texture caps of 768/1024/1536 pixels for Very low/Low/Medium; High restores original detail. Ascuas retains its existing 1536-pixel maximum and seam processing. Replacements dispose old GPU textures.
- Inferno flame billboards render front faces only and use conservative bounds for camera culling, including the Pro nozzles and full flame length.

These budgets affect presentation only. Damage, enemies, rewards, combat ranges and cooperative synchronization retain their rules.

## Deliberately retained

Camera far distance and gameplay fog are unchanged: lowering these globally can hide valid targets and alter map visibility. Do not force FrontSide or frustum culling on arbitrary imported models, portals or shader effects without bounds/topology checks. Global tone mapping is unchanged to preserve ship colors. The Battery Status API does not expose a reliable Android power-saving or thermal signal, so it does not drive quality.

## Validation

Unit checks cover draw cadence, adaptive quality, HUD writes, effect budgets, background resizing/restoration and GPU disposal. Additional local Three.js 0.180 checks cover instance transforms/bounds, explosion cleanup and Inferno camera culling. CI runs the full existing gameplay suite before building Android.

No phone temperature or sustained GPU improvement has been measured. A real-device session remains necessary to quantify the result. The local headless browser could not launch, so this pass has no new screenshot-based visual validation.
