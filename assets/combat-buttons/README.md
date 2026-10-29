# Combat button artwork

Nine separate transparent 256×256 WebP images, generated from the approved Cosmos Legacy combat-controls mockup using the built-in image-generation tool. The optimized assets are bundled locally for offline play. The original generated images are retained separately from these runtime assets.

| Asset | Action |
|---|---|
| fire | Primary laser fire |
| missile | Missile |
| overload | Overload ship ability |
| shield | Fortress ship ability / PvP instant shield |
| fury | Fury ship ability / PvP fury |
| interference | PvP interference |
| paralyze | PvP paralysis |
| luck | PvP luck |
| transfer | PvP life transfer |

Prompt shared by each generated asset: one centered circular sci-fi combat button matching the approved mockup, transparent exterior, thin double brushed gunmetal rims, matte dark navy center, bright readable symbol, restrained colored accents, no letters, numbers or timer. Each action was generated separately, with its corresponding symbol: red laser crosshair, silver missile with amber exhaust, golden energy burst, cyan shield, crossed red laser bolts, violet disrupted radar waves, yellow lightning with brackets, green geometric four-point luck star, and magenta circulating life-transfer arrows.

`js/combat-buttons.js` selects the artwork and normalizes its visible diameter. `css/combat-buttons.css` draws the live progress ring, active/blocked states and one brief ready flash. Pixel art never determines availability, damage, energy cost or cooldown. Missile progress follows the existing seven-second timer. Ship progress shows the existing active effect duration; it does not introduce a new ship cooldown. PvP progress follows server timestamps.
