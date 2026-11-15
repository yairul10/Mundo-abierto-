// Only authenticated accounts with a normal cloud save can enter the level table.
// Read bounded numeric fields; never expose save payloads or other players' account IDs.
export async function levelRanking(db,actor,realm='normal'){
 if(realm!=='normal')return {available:false,ranking:[],mine:null,limit:100};
 const session=db.withSession?db.withSession('first-primary'):db;
 const result=await session.prepare(`WITH saves AS (
 SELECT p.id AS account_id,COALESCE(NULLIF(trim(p.display_name),''),'Piloto') AS name,
 CASE WHEN json_valid(s.payload) THEN s.payload ELSE '{}' END AS document
 FROM player_saves s JOIN players p ON p.id=s.player_id
 ),valid AS (
 SELECT account_id,name,CAST(json_extract(document,'$.level') AS INTEGER) AS level,
 CASE WHEN json_type(document,'$.xp') IN ('integer','real') AND json_extract(document,'$.xp') BETWEEN 0 AND 9007199254740991 THEN CAST(json_extract(document,'$.xp') AS INTEGER) ELSE 0 END AS xp
 FROM saves WHERE json_type(document,'$.level')='integer' AND json_extract(document,'$.level') BETWEEN 1 AND 10000
 ),positions AS (
 SELECT *,ROW_NUMBER() OVER(ORDER BY level DESC,xp DESC,account_id) AS position FROM valid
 ) SELECT account_id,name,level,xp,position FROM positions WHERE position<=100 OR account_id=? ORDER BY position LIMIT 101`).bind(actor).all();
 const clean=row=>({name:row.name,level:row.level,xp:row.xp,position:row.position,own:row.account_id===actor});
 return {available:true,ranking:result.results.filter(r=>r.position<=100).map(clean),mine:result.results.find(r=>r.account_id===actor)?clean(result.results.find(r=>r.account_id===actor)):null,limit:100};
}
