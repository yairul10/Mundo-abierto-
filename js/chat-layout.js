// Keep saved chat coordinates usable after rotation, resizing or a corrupt preference.
export function chatLayout(value={},viewport={width:innerWidth,height:innerHeight}){
 const w=Math.max(1,viewport.width),h=Math.max(1,viewport.height),number=(n,f)=>Number.isFinite(n)?n:f;
 const width=Math.min(w-16,Math.max(Math.min(260,w-16),number(value.width,360)));
 const height=Math.min(h-16,Math.max(Math.min(170,h-16),number(value.height,250)));
 return {width,height,x:Math.max(8,Math.min(w-width-8,number(value.x,12))),y:Math.max(8,Math.min(h-height-8,number(value.y,h-height-12))),font:Math.max(11,Math.min(20,number(value.font,13)))};
}
