// Retain source images for quality changes; keep only one GPU texture per backdrop.
export function backgroundSize(image,level,maxWidth=Infinity){
 const cap={verylow:768,low:1024,medium:1536}[level]??Infinity;
 const width=Math.max(1,Math.min(image.width,maxWidth,cap));
 return {width:Math.round(width),height:Math.max(1,Math.round(image.height*width/image.width))};
}
export function createBackgroundTextures(T,{level,createCanvas=()=>document.createElement('canvas')}={}){
 const entries=[];
 function rebuild(entry){
  const size=backgroundSize(entry.image,level(),entry.maxWidth);
  if(entry.width===size.width&&entry.height===size.height)return;
  let next;
  try{
   if(entry.prepare)next=entry.prepare(entry.image,size.width,size.height);
   else {const canvas=createCanvas();canvas.width=size.width;canvas.height=size.height;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.drawImage(entry.image,0,0,size.width,size.height);next=new T.CanvasTexture(canvas)}
   if(!next)return;
  }catch{return} // Keep the last working backdrop if resizing is unavailable.
  next.mapping=T.EquirectangularReflectionMapping;next.colorSpace=T.SRGBColorSpace;
  const previous=entry.texture;entry.texture=next;entry.width=size.width;entry.height=size.height;
  entry.assign(next);previous.dispose();
 }
 return {
  register(texture,assign,{prepare=null,maxWidth=Infinity}={}){
   const entry={image:texture.image,texture,assign,prepare,maxWidth,width:null,height:null};entries.push(entry);
   // Install a working fallback before attempting the optional resize.
   assign(texture);rebuild(entry);
  },
  refresh(){for(const entry of entries)rebuild(entry)}
 };
}
