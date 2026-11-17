// Cosmetic browser preview: never changes ownership, ship stats or the active save.
export function wantsObsidianPreview(search,multiplayer){
 return multiplayer===false && new URLSearchParams(search).get('obsidianPreview')==='1';
}
export function displayedShip(shipId,preview){
 return preview?'obsidian':shipId;
}
