import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const raw=process.env.ANDROID_SIGNING_BUNDLE;
if(!raw)throw new Error('Falta el secreto ANDROID_SIGNING_BUNDLE. No se genera una firma temporal.');
const bundle=JSON.parse(raw);
if(!bundle.keystore||!bundle.password||!bundle.alias)throw new Error('Secreto de firma incompleto');
const dir=process.env.RUNNER_TEMP;
if(!dir)throw new Error('RUNNER_TEMP no disponible');
mkdirSync(dir,{recursive:true});
const path=dir+'/mundo-abierto-offline.keystore';
writeFileSync(path,Buffer.from(bundle.keystore,'base64'),{mode:0o600});
for(const [key,value] of Object.entries({MUNDO_KEYSTORE:path,MUNDO_KEY_PASSWORD:bundle.password,MUNDO_KEY_ALIAS:bundle.alias})){
 if(/[\r\n]/.test(value))throw new Error('Valor de firma inválido');
 writeFileSync(process.env.GITHUB_ENV,key+'='+value+'\n',{flag:'a'});
}
console.log('Firma permanente preparada');
