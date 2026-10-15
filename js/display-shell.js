// A stable top-level document keeps browser fullscreen/orientation across portal navigation.
export function useDisplayShell(win=window){return win===win.top&&!win.MUNDO_OFFLINE&&/^https?:$/.test(win.location.protocol)}
export function mountDisplayShell(){
 if(!useDisplayShell())return false;
 const frame=document.createElement('iframe');frame.id='gameFrame';frame.title='Mundo Abierto';frame.allow='fullscreen; autoplay';frame.allowFullscreen=true;
 const url=new URL(location.href);url.searchParams.set('embedded','1');frame.src=url.href;
 const style=document.createElement('style');style.textContent='body.game-shell{margin:0;overflow:hidden}body.game-shell> :not(#gameFrame):not(#orientationGate){display:none!important}#gameFrame{position:fixed;inset:0;width:100%;height:100%;height:100dvh;border:0;background:#050914}body.game-shell.portrait-blocked #gameFrame{pointer-events:none}';document.head.appendChild(style);
 window.MUNDO_DISPLAY={async requestLandscape(){try{if(document.documentElement.requestFullscreen&&!document.fullscreenElement)await document.documentElement.requestFullscreen();if(screen.orientation?.lock)await screen.orientation.lock('landscape')}catch(error){console.info('El navegador requiere giro manual:',error)}dispatchEvent(new Event('resize'))}};
 frame.addEventListener('load',()=>{try{const current=new URL(frame.contentWindow.location.href);if(current.origin!==location.origin)return;current.searchParams.delete('embedded');history.replaceState(null,'',current.pathname+current.search+current.hash)}catch{}});
 document.body.classList.add('game-shell');document.body.appendChild(frame);return true;
}
