const TEST_SAVE='mundoAbierto.qaPlayer';
// Freeze outgoing saves before reload triggers beforeunload/pagehide handlers.
export function createTestProgressReset({storage,isTest,isPvp,reload}){
 let pending=false;
 return {get pending(){return pending},reset(){
  if(pending||!isTest()||isPvp())return false;
  pending=true;
  try{storage.removeItem(TEST_SAVE);if(storage.getItem(TEST_SAVE)!==null)throw Error('No se pudo borrar la partida de pruebas');reload();return true}
  catch(error){pending=false;throw error}
 }};
}
