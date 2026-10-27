export const CHAT_LANGUAGES=Object.freeze(['es','en','pt','fr','de','it','tr']);
export const chatLanguage=value=>CHAT_LANGUAGES.includes(value)?value:'es';
// Whole-token matching avoids censoring innocent words containing short substrings.
// Regional slang and common obfuscation are covered; context still requires reports.
const words=new Set(('puta putas puto putos mierda mierdas mierda ctm ctmre conchetumadre conchesumadre conchadetumadre culiao culiado culiada weon weona huevon huevona aweonao aweonado maricon maricones pendejo pendeja cabron cabrona bastardo bastarda fuck fucking fucker motherfucker shit bullshit asshole bitch bitches bastard cunt dickhead porra caralho merda foda fodase putain merde connard salope scheisse arschloch cazzo stronzo vaffanculo siktir sikik orospu pic yarrak amk').split(' '));
export function censorChat(text){
 return String(text).replace(/[\p{L}\p{N}@$]+(?:[._*\-!]*[\p{L}\p{N}@$]+)*/gu,token=>{
  const normalized=token.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/ı/g,'i').replace(/[013457@$!]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s','!':'i'}[c])).replace(/[._*\-]/g,'');
  return words.has(normalized)?'***':token;
 });
}
const pending=new WeakMap();
async function waitTranslation(job){let timer;try{return await Promise.race([job,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('translation_timeout')),8000)})])}finally{clearTimeout(timer)}}
export async function translateChat(ctx,env,message,target){
 if(message.language===target)return message.text;
 const cached=ctx.storage.sql.exec('SELECT text FROM chat_translations WHERE message_id=? AND language=?',message.id,target).toArray()[0];if(cached)return cached.text;
 if(env.CHAT_TRANSLATION_ENABLED!=='true'||!env.AI)throw Error('translation_unavailable');
 let jobs=pending.get(ctx);if(!jobs){jobs=new Map();pending.set(ctx,jobs)}const key=message.id+':'+target;
 if(jobs.has(key))return waitTranslation(jobs.get(key));if(jobs.size>=2)throw Error('translation_busy');
 const day=new Date().toISOString().slice(0,10);
 // Persistent per-room cap bounds model invocations even after reconnect/restart.
 ctx.storage.transactionSync(()=>{
  const used=ctx.storage.sql.exec('SELECT used FROM chat_translation_budget WHERE day=?',day).toArray()[0]?.used||0;
  if(used>=1000)throw Error('translation_limit');
  ctx.storage.sql.exec('INSERT INTO chat_translation_budget VALUES(?,1) ON CONFLICT(day) DO UPDATE SET used=used+1',day);
  ctx.storage.sql.exec('DELETE FROM chat_translation_budget WHERE day<>?',day);
 });
 const job=(async()=>{
  const result=await env.AI.run('@cf/meta/m2m100-1.2b',{text:message.text,source_lang:message.language,target_lang:target});
  if(typeof result?.translated_text!=='string'||!result.translated_text.trim()||result.translated_text.length>2000)throw Error('translation_failed');
  const text=censorChat(result.translated_text.trim());
  // A deletion may happen while the model is working. Never restore deleted text.
  const alive=ctx.storage.sql.exec('SELECT id FROM chat_messages WHERE id=? AND deleted=0',message.id).toArray()[0];
  if(!alive)throw Error('message_unavailable');
  ctx.storage.sql.exec('INSERT OR REPLACE INTO chat_translations VALUES(?,?,?)',message.id,target,text);return text;
 })();jobs.set(key,job);job.then(()=>jobs.delete(key),()=>jobs.delete(key));return waitTranslation(job);
}
