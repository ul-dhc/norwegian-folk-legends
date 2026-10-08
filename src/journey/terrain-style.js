// Shared native terrain for the journey and landscape study.
export async function terrainStyle(){
 const response=await fetch('https://tiles.openfreemap.org/styles/liberty');
 if(!response.ok)throw new Error('Terrain sources unavailable');
 const original=await response.json();
 const water=original.layers.filter(l=>l.type==='fill'&&l['source-layer']==='water').map(l=>({...l,paint:{'fill-color':'#080F1D'}}));
 const roads=original.layers.filter(l=>l.type==='line'&&l['source-layer']==='transportation').map(l=>({...l,paint:{...l.paint,'line-color':'#756E60','line-opacity':.32}}));
 const style={version:8,sources:{...original.sources,elevation:{type:'raster-dem',tiles:['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],tileSize:512,encoding:'terrarium',maxzoom:12,attribution:'<a href="https://mapterhorn.com/attribution/">Mapterhorn terrain / source credits</a>'}},layers:[{id:'ground',type:'background',paint:{'background-color':'#202D3C'}},{id:'relief',type:'hillshade',source:'elevation',paint:{'hillshade-exaggeration':.65,'hillshade-shadow-color':'#080F1D','hillshade-highlight-color':'#63788B','hillshade-accent-color':'#162437','hillshade-illumination-direction':315,'hillshade-illumination-anchor':'map'}},...water,...roads]};
 return style;
}

export const MAP_TYPES=['quiet','terrain','coastlines'];
export function styleForMapType(style,type){
 const selected=MAP_TYPES.includes(type)?type:'coastlines';
 return {...style,layers:style.layers.map(layer=>{
  if(layer.id==='ground')return {...layer,paint:{...layer.paint,'background-color':selected==='coastlines'?'#152131':selected==='quiet'?'#142031':'#202D3C'}};
  const visible=layer.id==='relief'?selected==='terrain':layer['source-layer']==='transportation'?selected!=='coastlines':true;
  return {...layer,layout:{...layer.layout,visibility:visible?'visible':'none'}};
 })};
}
export function applyMapType(map,type){
 for(const layer of styleForMapType(map.getStyle(),type).layers){
  if(layer.id==='ground')map.setPaintProperty(layer.id,'background-color',layer.paint['background-color']);
  else map.setLayoutProperty(layer.id,'visibility',layer.layout.visibility);
 }
}
