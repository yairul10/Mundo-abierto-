// Visual budgets only. Gameplay ranges, targets and damage never depend on these.
const BUDGETS=Object.freeze({
 verylow:Object.freeze({cloudSteps:14,bursts:4,fragments:2,effectDistance:2200,lightningSegments:1,previewFps:15}),
 low:Object.freeze({cloudSteps:18,bursts:6,fragments:3,effectDistance:3200,lightningSegments:2,previewFps:20}),
 medium:Object.freeze({cloudSteps:24,bursts:9,fragments:4,effectDistance:5000,lightningSegments:3,previewFps:30}),
 high:Object.freeze({cloudSteps:28,bursts:12,fragments:6,effectDistance:9000,lightningSegments:3,previewFps:30})
});
export function effectBudget(level){return BUDGETS[level]||BUDGETS.medium}
// Preserve both ends and the integrated optical depth when reducing cloud samples.
export function cloudSample(index,steps){const f=index*27/(steps-1);return {distance:60+f*95+f*f*4.5,stepLength:(99.5+f*9)*28/steps}}
