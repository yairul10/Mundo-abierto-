export const PVP_CLIENT_VERSION=1;
export const PVP_LATEST_BUILD='3d-20261027-333';
export const PVP_UPDATE_URL='https://play.google.com/store/apps/details?id=com.cosmoslegacy.game';
export function pvpVersionConfig(env={}){
 const configured=Number(env.PVP_MIN_CLIENT_VERSION);
 return {minPvpClientVersion:Number.isSafeInteger(configured)&&configured>0?configured:PVP_CLIENT_VERSION,latestBuild:PVP_LATEST_BUILD,updateUrl:PVP_UPDATE_URL};
}
export function compatiblePvpClient(body,env){return Number.isSafeInteger(body.clientVersion)&&body.clientVersion>=pvpVersionConfig(env).minPvpClientVersion}
