// Compare rendered values so external UI updates are respected as well.
export function setHudText(element,value){
 const text=String(value);
 if(element.textContent!==text)element.textContent=text;
}
export function setHudWidth(element,value){
 const width=value+'%';
 if(element.style.width!==width)element.style.width=width;
}
