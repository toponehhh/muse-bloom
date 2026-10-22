export const progressKey = 'muse-style-room-progress-v1';
export const themes = [
  {name:'Café morning',text:'An easy outfit for coffee, a book, and nowhere to rush.',goals:['Ivory cotton','Blue denim'],pair:[0,0]},
  {name:'Pastel hour',text:'Soft textures and lilac tones for a catch-up with friends.',goals:['Rosy knit','Lilac pleats'],pair:[1,1]},
  {name:'Gallery day',text:'A crisp collar and flowing trousers. Quietly put together.',goals:['A neat collar','Fluid trousers'],pair:[2,2]},
];
const index = value => Number.isInteger(value) && value >= 0 && value < 3;
export function readProgress(storage) {
  const empty = {schema:1,top:0,bottom:0,theme:0,completed:[],sound:false,paused:false};
  try {
    const data = JSON.parse(storage.getItem(progressKey));
    if (!data || data.schema !== 1) return empty;
    return {...empty,top:index(data.top)?data.top:0,bottom:index(data.bottom)?data.bottom:0,
      theme:index(data.theme)?data.theme:0,completed:[...new Set(Array.isArray(data.completed)?data.completed.filter(index):[])],
      sound:data.sound===true,paused:data.paused===true};
  } catch { return empty; }
}
export function writeProgress(storage,state,completed) {
  try {
    storage.setItem(progressKey,JSON.stringify({schema:1,top:state.top,bottom:state.bottom,theme:state.theme,
      completed:[...completed],sound:state.sound,paused:state.paused}));
    return true;
  } catch { return false; }
}
export function matchesTheme(top,bottom,theme) {
  return index(theme) && themes[theme].pair[0]===top && themes[theme].pair[1]===bottom;
}
export function nextTheme(current,completed) {
  for(let step=1;step<=themes.length;step++) {
    const i=(current+step)%themes.length;
    if(!completed.includes(i))return i;
  }
  return null;
}
