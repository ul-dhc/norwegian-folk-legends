import {Map,setWorkerUrl,NavigationControl} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import * as L from 'leaflet';
import {terrainStyle} from '../journey/terrain-style.js';
setWorkerUrl(workerUrl);
const el=id=>document.getElementById(id),root=el('terrain-study');
root.querySelectorAll('nav button,nav select,nav input').forEach(c=>c.disabled=true);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const old=L.map('old-map',{zoomControl:false,attributionControl:true,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false,keyboard:false,fadeAnimation:false}).setView([63.79,11.48],9);
const opts={maxZoom:16,keepBuffer:4,updateWhenIdle:false,updateWhenZooming:true};
const url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}';
L.tileLayer(url,{...opts,minNativeZoom:2,maxNativeZoom:2}).addTo(old);
L.tileLayer(url,{...opts,attribution:'Terrain © Esri and contributors'}).addTo(old);
old.createPane('studyRelief').style.zIndex=250;
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',{...opts,pane:'studyRelief',maxNativeZoom:7,attribution:'Hillshade © Esri, USGS, NOAA'}).addTo(old);
let modern,records,selected;const demTiles=new Set();let vectorReady=false;let failures=0;
function status(){el('status').textContent=failures?'Some map data could not load. Check your connection and reload.':`New map: ${vectorReady?'roads loaded':'loading roads'} · ${demTiles.size?'terrain loaded':'loading elevation'} · drag or zoom the new map to compare.`;}
function jump(){selected=records.find(r=>r.source_text_id===el('place').value);if(!selected)return;const center=[selected.lon,selected.lat],zoom=Number(el('scale').value);modern.flyTo({center,zoom,duration:reduced?0:1600});renderStory();}
function renderStory(){el('story-title').textContent=selected.tittel||selected.ml_title||selected.sted;el('story-text').textContent=selected.tekst.trim().split(/\s+/u).slice(0,45).join(' ')+'…';}
try{
 const [style,dataResponse]=await Promise.all([terrainStyle(),fetch(root.dataset.endpoint)]);
 if(!dataResponse.ok)throw new Error('Map sources unavailable');
 records=(await dataResponse.json()).records;

 modern=new Map({container:'new-map',style,center:[11.48,63.79],zoom:8,minZoom:4,maxZoom:12,pitch:0,bearing:0,attributionControl:{compact:true}});
 modern.addControl(new NavigationControl({showCompass:false}),'bottom-left');
 modern.on('move',()=>{const c=modern.getCenter();old.setView([c.lat,c.lng],modern.getZoom()+1,{animate:false});});
 modern.on('error',()=>{failures++;status();});
 modern.on('sourcedata',event=>{if(event.sourceId==='elevation'&&event.isSourceLoaded)demTiles.add('loaded');if(event.sourceId!=='elevation'&&event.isSourceLoaded)vectorReady=true;status();});
 modern.on('load',()=>{root.querySelectorAll('nav button,nav select,nav input').forEach(c=>c.disabled=false);jump();status();});
 el('place').addEventListener('change',jump);el('scale').addEventListener('change',jump);
 el('relief').addEventListener('input',()=>modern.setPaintProperty('relief','hillshade-exaggeration',Number(el('relief').value)));
 el('view').addEventListener('click',()=>{const expanded=root.classList.toggle('expanded');el('view').setAttribute('aria-pressed',String(expanded));el('view').textContent=expanded?'Show comparison':'Expand new map';modern.resize();old.invalidateSize();});
 el('reading').addEventListener('click',()=>{el('story').hidden=!el('story').hidden;el('reading').setAttribute('aria-pressed',String(!el('story').hidden));});
 const observer=new ResizeObserver(()=>{modern.resize();old.invalidateSize();});observer.observe(el('new-panel'));
 window.addEventListener('pagehide',()=>{observer.disconnect();modern.remove();old.remove();},{once:true});
}catch(error){el('status').textContent='Could not initialize the comparison. Please reload; the existing journey is unchanged.';console.error(error);}
