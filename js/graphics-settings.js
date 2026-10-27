// Device-local preferences, independent of pilot saves and test/normal modes.
export const GRAPHICS_KEY='mundoAbierto.graphics';
export const QUALITY={
 low:{label:'Baja',pixelRatio:.75,maxPixels:1000000,debrisDistance:1300,detailDistance:2600,lights:false,sparks:3},
 medium:{label:'Media',pixelRatio:1,maxPixels:1800000,debrisDistance:2300,detailDistance:3900,lights:false,sparks:6},
 high:{label:'Alta',pixelRatio:1.6,maxPixels:3500000,debrisDistance:4500,detailDistance:6500,lights:true,sparks:10}
};
export function normalizeGraphics(value){return ['auto',...Object.keys(QUALITY)].includes(value)?value:'auto'}
export function renderRatio(profile,width,height,dpr=1){return Math.min(dpr,profile.pixelRatio,Math.sqrt(profile.maxPixels/Math.max(1,width*height)))}
export function createGraphicsController({mode='auto',initial='medium',onChange=()=>{}}={}){
 let choice=normalizeGraphics(mode),level=choice==='auto'?initial:choice;
 if(!QUALITY[level])level='medium';
 let seconds=0,frames=0,bad=0,good=0,warmup=8,cooldown=0;
 const levels=['low','medium','high'];
 function reset(){seconds=frames=bad=good=0;warmup=8;cooldown=0}
 function change(next){if(next!==level){level=next;onChange(level,choice)}}
 return {
  get mode(){return choice},get level(){return level},get profile(){return QUALITY[level]},
  select(next){choice=normalizeGraphics(next);reset();level=choice==='auto'?'medium':choice;onChange(level,choice)},
  recover(){reset();change('low')},
  sample(dt,eligible=true){
   if(choice!=='auto')return;
   if(!eligible||!Number.isFinite(dt)||dt<=0||dt>2){seconds=frames=bad=good=0;warmup=8;return}
   if(warmup>0){warmup-=dt;return}
   cooldown=Math.max(0,cooldown-dt);seconds+=dt;frames++;
   if(seconds<3)return;
   const fps=frames/seconds;seconds=frames=0;
   bad=fps<38?bad+1:0;good=fps>56?good+1:0;
   const i=levels.indexOf(level);
   if(!cooldown&&bad>=2&&i>0){change(levels[i-1]);bad=good=0;cooldown=15}
   else if(!cooldown&&good>=10&&i<2){change(levels[i+1]);bad=good=0;cooldown=30}
  }
 };
}
export function mountGraphicsSettings(controller,{parent,storage,onSelect=()=>{}}){
 const section=document.createElement('section');section.className='graphics-settings';
 section.innerHTML='<h3>Gráficos</h3><label for="graphicsQuality">Calidad gráfica</label><select id="graphicsQuality"><option value="auto">Automática (recomendada)</option><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select><p id="graphicsStatus" class="inventory-note" role="status"></p><p class="inventory-note">Se aplica al instante y se guarda en este dispositivo. Baja reduce la nitidez, las luces del motor y los restos decorativos lejanos.</p>';
 parent.insertBefore(section,parent.querySelector('h3'));const select=section.querySelector('select'),status=section.querySelector('#graphicsStatus');
 function refresh(){select.value=controller.mode;status.textContent=(controller.mode==='auto'?'Automática · calidad actual: ':'Calidad actual: ')+controller.profile.label}
 select.onchange=()=>{controller.select(select.value);try{storage.setItem(GRAPHICS_KEY,controller.mode)}catch{}onSelect();refresh()};refresh();return {refresh};
}
