export const PVP_CLIENT_VERSION=4;
// Raise the required protocol only after its Android release is available in Play.
export const PVP_MIN_CLIENT_VERSION=2;
export const PVP_LATEST_BUILD='3d-20261027-337';
export const PVP_UPDATE_URL='https://play.google.com/store/apps/details?id=com.cosmoslegacy.game';
export function pvpVersionConfig(env={}){
 const configured=Number(env.PVP_MIN_CLIENT_VERSION);
 return {minPvpClientVersion:Number.isSafeInteger(configured)&&configured>0?Math.max(PVP_MIN_CLIENT_VERSION,configured):PVP_MIN_CLIENT_VERSION,latestBuild:PVP_LATEST_BUILD,updateUrl:PVP_UPDATE_URL};
}
export function compatiblePvpClient(body,env){return Number.isSafeInteger(body.clientVersion)&&body.clientVersion>=pvpVersionConfig(env).minPvpClientVersion}
