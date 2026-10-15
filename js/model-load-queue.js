// One decode/mount at a time; waiting sectors never block current-sector jobs.
export function createModelLoadQueue({schedule=fn=>setTimeout(fn,80),eligible=()=>true,priority=()=>0,prepare=()=>{}}={}){
 const waiting=[];let busy=false;
 function pump(){
  if(busy)return;let index=-1;for(let i=0;i<waiting.length;i++){if(!eligible(waiting[i].path))continue;if(index<0||priority(waiting[i].path)<priority(waiting[index].path))index=i}if(index<0)return;
  const job=waiting.splice(index,1)[0];busy=true;
  schedule(()=>{
   const finish=()=>{busy=false;job.resolve();pump()};
   const fail=error=>{try{if(job.onError)job.onError(error);else console.warn('No se pudo cargar '+job.path,error)}finally{finish()}};
   try{job.loader.load(job.path,gltf=>{try{prepare(gltf);job.onLoad?.(gltf)}catch(error){console.error('Error al montar '+job.path,error)}finally{finish()}},job.onProgress,fail)}catch(error){fail(error)}
  });
 }
 return {pump,load(loader,path,onLoad,onProgress,onError){return new Promise(resolve=>{waiting.push({loader,path,onLoad,onProgress,onError,resolve});pump()})},get busy(){return busy}};
}
