import {initialPvpPilot,offlineRoster} from './pvp-loadout.js?v=312';
const WORLD_FIELDS=['x','y','z','yaw','pitch','sector','granTitanState','carrierState'];
export function createHangarEditor(source={}){
 const original=JSON.parse(JSON.stringify(source)),editor=initialPvpPilot(original);
 for(const key of WORLD_FIELDS)if(Object.hasOwn(original,key))editor[key]=original[key];
 editor.quests=original.quests||{};editor.boosters=original.boosters||{};
 editor.hp=Math.max(0,Math.min(editor.maxHp,Number(original.hp??editor.maxHp)));editor.energy=editor.maxEnergy;
 return editor;
}
export function serializeHangarEditor(editor,latest={}){
 const copy=JSON.parse(JSON.stringify(editor)),roster=offlineRoster(copy),q=roster.profiles[roster.selected];
 const ratio=copy.maxHp>0?Math.max(0,Math.min(1,copy.hp/copy.maxHp)):1;
 for(const key of ['maxHp','maxEnergy','attack','defense','speed'])copy[key]=q[key];
 copy.hp=Math.min(copy.maxHp,ratio*copy.maxHp);copy.energy=Math.max(0,Math.min(copy.maxEnergy,copy.energy));
 for(const key of WORLD_FIELDS){if(Object.hasOwn(latest,key))copy[key]=JSON.parse(JSON.stringify(latest[key]));else delete copy[key]}
 return copy;
}
