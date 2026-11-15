export const LEVEL_REVIEW=Object.freeze({largeJump:10,rapidGain:5,rapidWindowMs:300000,rapidMinLevel:30});
export function levelReviewFlags(row){
 const flags=[];
 if(row.newLevel===null)flags.push('invalid_level');
 if(row.oldLevel!==null&&row.newLevel!==null){const delta=row.newLevel-row.oldLevel;
  if(delta<0)flags.push('level_decreased');if(delta>=LEVEL_REVIEW.largeJump)flags.push('large_jump');
  if(row.oldLevel>=LEVEL_REVIEW.rapidMinLevel&&delta>=LEVEL_REVIEW.rapidGain&&row.elapsedMs!==null&&row.elapsedMs>=0&&row.elapsedMs<=LEVEL_REVIEW.rapidWindowMs)flags.push('rapid_gain');
 }
 return flags;
}
const condition=`h.new_level IS NULL OR (h.old_level IS NOT NULL AND (h.new_level<h.old_level OR h.new_level-h.old_level>=${LEVEL_REVIEW.largeJump} OR (h.old_level>=${LEVEL_REVIEW.rapidMinLevel} AND h.new_level-h.old_level>=${LEVEL_REVIEW.rapidGain} AND h.previous_save_at IS NOT NULL AND h.observed_at-h.previous_save_at BETWEEN 0 AND ${LEVEL_REVIEW.rapidWindowMs})))`;
export async function levelAudit(db,{query='',pilot='',before=null,flagged=true}={}){
 if(typeof query!=='string'||query.length>80||typeof pilot!=='string'||pilot&&!/^[a-f0-9-]{36}$/i.test(pilot)||before!==null&&(!Number.isSafeInteger(before)||before<1))throw Object.assign(Error('invalid_audit_query'),{code:'invalid_audit_query',status:400});
 const session=db.withSession?db.withSession('first-primary'):db;
 const q=query.normalize('NFKC').trim().toLocaleLowerCase('es');
 const result=await session.prepare(`SELECT h.*,COALESCE(NULLIF(trim(p.display_name),''),'Piloto') AS name
 FROM level_history h JOIN players p ON p.id=h.player_id
 WHERE (?='' OR instr(lower(p.display_name),?)>0) AND (?='' OR h.player_id=?) AND h.id<? AND (?=0 OR (${condition}))
 ORDER BY h.id DESC LIMIT 101`).bind(q,q,pilot,pilot,before??Number.MAX_SAFE_INTEGER,flagged?1:0).all();
 const rows=result.results.slice(0,100).map(row=>{
  const entry={id:row.id,pilot:row.player_id,name:row.name,revision:row.revision,source:row.source,oldLevel:row.old_level,newLevel:row.new_level,oldXp:row.old_xp,newXp:row.new_xp,oldValue:row.old_value,newValue:row.new_value,previousSaveAt:row.previous_save_at,time:row.observed_at,elapsedMs:row.previous_save_at===null?null:row.observed_at-row.previous_save_at};
  return {...entry,delta:entry.oldLevel===null||entry.newLevel===null?null:entry.newLevel-entry.oldLevel,flags:levelReviewFlags(entry)};
 });
 return {rows,limit:100,nextCursor:result.results.length>100?rows.at(-1).id:null,criteria:LEVEL_REVIEW,pilot,query,flagged};
}
