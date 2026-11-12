const TIPS = [
 {level:1, text:'Abre la Tienda en el menú de tres líneas para comprar y mejorar en vuelo.'},
 {level:1, text:'Compra un robot reparador para reparar tu nave sin volver a la base.'},
 {level:1, text:'Al aterrizar encontrarás Hangar y Ensamblaje.'},
 {level:1, text:'En el menú de tres líneas encontrarás la Tienda y los ajustes de gráficos y volumen.'},
 {level:1, text:'Toca el minimapa para ver los sectores y los requisitos para desbloquearlos.'},
 {level:1, text:'Desde «Acomodar controles» puedes mover los botones y el joystick a tu gusto.'},
 {level:1, text:'Consulta el botón de misiones para ver tus objetivos y las recompensas disponibles.'},
 {level:10, text:'Tu mascota puede combatir, recoger recursos o hacer ambas cosas. Elige su modo desde su icono.'},
 {level:10, text:'Puedes cambiar la formación de tus drones durante el vuelo desde el botón de formación.'},
 {level:10, text:'Conserva los materiales que dejan los enemigos. Los necesitarás para el ensamblaje.'},
 {level:30, text:'En la base cooperativa encontrarás Hangar y Ensamblaje cooperativo. La Tienda está en el menú.'},
 {level:40, text:'Las naves tienen habilidades diferentes. Consulta sus características en el hangar antes de equiparlas.'}
];

export function loadingTipsForLevel(level){
 const currentLevel=Number.isFinite(Number(level))?Number(level):1;
 return TIPS.filter(tip=>tip.level<=Math.max(1,currentLevel)).map(tip=>tip.text);
}

export function mountLoadingTips(element,{level=1}={}){
 const tips=loadingTipsForLevel(level);
 let index=Math.floor(Math.random()*tips.length);
 function show(){element.textContent=tips[index]}
 show();
 element.hidden=false;
 const timer=setInterval(()=>{
  if(document.hidden)return;
  index=(index+1)%tips.length;
  show();
 },7000);
 return ()=>{clearInterval(timer);element.hidden=true};
}

