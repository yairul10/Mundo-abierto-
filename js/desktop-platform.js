// Native PC detection is explicit: a tablet with a mouse keeps its touch UI.
export function desktopMode(win=window){
 if(win.Capacitor?.isNativePlatform?.()||win.Capacitor?.Plugins?.CosmosPlayGames)return win.COSMOS_PC===true;
 return win.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches===true&&!(win.navigator?.maxTouchPoints>0);
}
export async function initDesktopPlatform(win=window){
 const plugin=win.Capacitor?.Plugins?.CosmosPlayGames;win.COSMOS_PC=false;
 if(typeof plugin?.platform==='function'){
  let timer;try{const result=await Promise.race([plugin.platform(),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),1500)})]);win.COSMOS_PC=result?.pc===true}catch{}finally{clearTimeout(timer)}
 }
 win.document.body.classList.toggle('desktop-controls',desktopMode(win));win.dispatchEvent(new Event('resize'));return desktopMode(win);
}
