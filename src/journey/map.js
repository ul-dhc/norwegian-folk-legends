import * as L from 'leaflet';
import {journeyRenderer} from './renderer.js';
import {maplibreGL} from '@maplibre/maplibre-gl-leaflet';
import {setWorkerUrl} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {terrainStyle,styleForMapType,applyMapType,MAP_TYPES} from './terrain-style.js';
setWorkerUrl(workerUrl);
import {roadPath,pathSampler} from './roads.js';
import {collectorColour} from './appearance.js';
import {networkEdges,known} from './engine.js';
const point=r=>[r.lat,r.lon];
export function createJourneyMap(container,onError){
 const map=L.map(container,{zoomControl:false,scrollWheelZoom:false,dragging:false,doubleClickZoom:false,touchZoom:false,boxZoom:false,keyboard:false,minZoom:3,maxZoom:10,zoomAnimation:true,fadeAnimation:false}).setView([63,12],5);
 let destroyed=false,terrainMap=null,terrainReady=false,mapType='coastlines';
 try{const saved=localStorage.getItem('journey-map-type-v3');if(MAP_TYPES.includes(saved))mapType=saved;}catch{}
 // Keep geographic threads in Leaflet; render elevation and roads natively below them.
 terrainStyle().then(style=>{
  if(destroyed)return;
  // Hide unused relief before MapLibre starts fetching/decoding elevation tiles.
  // Bound off-screen tile retention as the journey crosses many zoom levels.
  const landscape=maplibreGL({style:styleForMapType(style,mapType),maxTileCacheSize:64,padding:.15,updateInterval:16,interactive:false}).addTo(map);
  terrainMap=landscape.getMaplibreMap();terrainMap.on('error',onError);
  terrainMap.on('load',()=>{terrainReady=true;applyMapType(terrainMap,mapType);});
 }).catch(onError);
 const traces=L.layerGroup().addTo(map),constellation=L.layerGroup().addTo(map),effects=L.layerGroup().addTo(map);
 let head=null,current=null,raf=null,movement=null,still=false,destinationLabel=null,closingCoords=null ,fullOverview=false,introZoom=null,zoomActive=false,activeFrame=null;
 const remembered=new Map(),seenEdges=new Set(),travelledEdges=new Map(),visitedDots=new Map();
 const networkPane=map.createPane('journeyNetwork');networkPane.style.zIndex=410;networkPane.style.pointerEvents='none';
 const networkRenderer=journeyRenderer(L,'journeyNetwork');
 // Only the temporary networks breathe; travelled threads keep a steady presence.
 const tracePane=map.createPane('journeyTraces');tracePane.style.zIndex=411;tracePane.style.pointerEvents='none';
 const renderer=journeyRenderer(L,'journeyTraces');
 function remember(coords){remembered.set(coords.join(','),coords);}
 function markVisited(coords,color){
  const key=coords.join(',');
  // Shared locations use one dot, anchored exactly to the thread endpoint.
  if(visitedDots.has(key))return;
  const dot=L.circleMarker(coords,{renderer,className:'journey-visited-dot',radius:3.2,color,weight:1.1,opacity:.85,fill:false,interactive:false}).addTo(traces);
  visitedDots.set(key,dot);
 }
 function lineBetween(a,b,color,group=traces){
  const key=[a.join(','),b.join(',')].sort().join('|')+color;
  if(group===traces&&seenEdges.has(key))return;
  if(group===traces)seenEdges.add(key);
  const line=L.polyline([a,b],{renderer:networkRenderer,className:'journey-thread',color,weight:.85,opacity:.58,interactive:false}).addTo(group);
  line.getElement().style.color=color;
  return line;
 }
 function connections(items,kind,group=constellation,reveal=false,colour=null){
  const {nodes,edges}=networkEdges(items),color=colour||collectorColour(items[0]);
  const hub=nodes.length?[nodes.reduce((sum,r)=>sum+r.lat,0)/nodes.length,nodes.reduce((sum,r)=>sum+r.lon,0)/nodes.length]:null;
  const revealLine=(line,i)=>{if(!reveal||still)return;const element=line?.getElement();if(!element)return;element.setAttribute('pathLength','1');element.classList.add('journey-spoke-reveal');element.style.animationDelay=(1600+Math.min(i*65,1200))+'ms';};
  if(kind==='collector'&&hub){nodes.forEach((r,i)=>revealLine(lineBetween(hub,point(r),color,group),i));}
  else edges.forEach(([a,b],i)=>revealLine(lineBetween(point(a),point(b),color,group),i));
  nodes.forEach((r,i)=>{const coords=point(r);if(group===traces)remember(coords);const dot=L.circleMarker(coords,{renderer:networkRenderer,className:'journey-neon-point',radius:1.8,color,weight:0,opacity:1,fill:true,fillOpacity:.8,interactive:false}).addTo(group);if(reveal&&!still){const element=dot.getElement();element.classList.add('journey-endpoint-reveal');element.style.animationDelay=(2800+Math.min(i*65,1200))+'ms';}});
  if(kind==='collector'&&hub&&nodes.length>1){L.marker(hub,{icon:L.divIcon({className:'journey-collector-hub'+(reveal&&!still?' journey-hub-reveal':''),html:`<span style="--hub-colour:${color}"></span>`,iconSize:[64,64],iconAnchor:[32,32]}),interactive:false,keyboard:false}).addTo(group);}
  return nodes;
 }
 function breathe(value){networkPane.classList.toggle('journey-network-breathing',value&&!still&&!container.classList.contains('journey-network-overview'));}

 const icon=(story,color)=>L.divIcon({className:'journey-orb'+(story?' story':''),html:`<span class="journey-orb-core" style="--orb-colour:${color}"></span>`,iconSize:[32,32],iconAnchor:[16,16]});
 function setHead(coords,story=false,color='#58C4B0'){if(!head)head=L.marker(coords,{icon:icon(story,color),interactive:false,keyboard:false}).addTo(traces);else{head.setIcon(icon(story,color));head.setLatLng(coords);}current=coords;remember(coords);}
 function framing(coords,zoom,reading=false,animate=true,duration=2.8,photo=false,calm=false){
  if(!coords.length)return;
  introZoom?.cancel();introZoom=null;zoomActive=false;
  activeFrame={coords,zoom,reading,photo};
  map.invalidateSize({pan:false});
  map.options.zoomSnap=.25;
  const height=map.getSize().y;
  const wide=map.getSize().x>=900;
  const paddingTopLeft=[35,Math.min(115,height*.2)],paddingBottomRight=[reading&&wide?Math.min(610,map.getSize().x*.49):35,Math.min(height*(reading&&!wide?.57:.23),height-180)];
  // Move the camera, never the geographic marker, to keep portraits clear.
  if(photo){paddingTopLeft[0]=35;paddingBottomRight[0]=35;paddingTopLeft[1]=height*.10;paddingBottomRight[1]=height*(wide?.56:.74);}
  const options={maxZoom:zoom,paddingTopLeft,paddingBottomRight,animate:animate&&!still,duration,...(calm?{curve:.4}:{})};
  map.stop();if(options.animate)map.flyToBounds(L.latLngBounds(coords),options);else map.fitBounds(L.latLngBounds(coords),options);
 }
 function clearDestination(){if(destinationLabel){map.removeLayer(destinationLabel);destinationLabel=null;}}
 function showDestination(target){
  const name=target.name||target.sted;if(!name)return;
  const coords=point(target),key=coords.join(',')+name;
  if(destinationLabel?.destinationKey===key)return;
  clearDestination();
  const text=document.createElement('span');text.textContent=name;
  destinationLabel=L.tooltip({permanent:true,direction:'right',offset:[14,0],className:'journey-destination-label',opacity:1,interactive:false}).setLatLng(coords).setContent(text).addTo(map);
  destinationLabel.destinationKey=key;
 }
 function startIntroZoom(amount=1.12,duration=24000,origin=[.45,.5]){
  const landscape=map.getPane('mapPane');
  const from=parseFloat(getComputedStyle(landscape).scale)||1;
  introZoom?.cancel();introZoom=null;zoomActive=false;
  if(still||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  // Scale the landscape and its threads together, avoiding repeated tile re-projection.
  zoomActive=true;
  landscape.style.transformOrigin=`${container.clientWidth*origin[0]}px ${container.clientHeight*origin[1]}px`;
  introZoom=landscape.animate([{scale:String(from)},{scale:String(from*amount)}],{
   duration,easing:'cubic-bezier(.25,.1,.25,1)',fill:'forwards'
  });
 }
 function stopFrame(){if(raf!==null)cancelAnimationFrame(raf);raf=null;}
 function cancel(){
  zoomActive=false;introZoom?.pause();stopFrame();effects.clearLayers();
  // Interrupted/restarted flights must not leave a truncated cached edge.
  if(movement?.line)traces.removeLayer(movement.line);
  movement=null;map.stop();
 }
 function finishTravel(reframe=true){
  const m=movement;if(!m)return;
  stopFrame();movement=null;map.stop();effects.clearLayers();
  m.line?.setLatLngs(m.path);
  if(m.line){const previous=travelledEdges.get(m.edgeKey);if(previous)traces.removeLayer(previous);travelledEdges.set(m.edgeKey,m.line);}
  setHead(m.to,m.story,m.color);remember(m.to);showDestination(m.target);
  if(!m.story)markVisited(m.to,m.color);
  if(reframe)framing([m.from,m.to],m.zoom,false,false);
 }
 function drawMotion(now){
  const m=movement;if(!m)return;
  m.elapsed+=Math.max(0,now-m.last);m.last=now;
  const progress=Math.max(0,Math.min(1,(m.elapsed-m.camera)/m.duration));
  const eased=progress*progress*(3-2*progress),pos=m.curve(eased);
  if(progress>=.7)showDestination(m.target);
  if(!still){head.setLatLng(pos);const sample=m.path.slice(0,Math.floor(eased*(m.path.length-1))+1);sample.push(pos);m.line?.setLatLngs(eased>0?sample:[]);}
  if(progress>=1&&m.elapsed>=Math.max(m.camera+m.duration,m.minDuration)){
   finishTravel(false);m.done();
  }else raf=requestAnimationFrame(drawMotion);
 }
 function resume(){
  if(introZoom&&!still&&zoomActive)introZoom.play();
  const m=movement;if(!m||raf!==null)return;m.last=performance.now();
  if(m.elapsed<m.camera)framing([m.from,m.to],m.zoom,false,true,(m.camera-m.elapsed)/1000);
  raf=requestAnimationFrame(drawMotion);
 }
 function frameClosing(){
  if(!closingCoords?.length)return;
  map.invalidateSize({pan:false});
  map.options.zoomSnap=0;
  const bounds=L.latLngBounds(closingCoords),nw=map.project(bounds.getNorthWest(),0),se=map.project(bounds.getSouthEast(),0);
  const zoom=Math.min(7,Math.log2((container.clientWidth-48)/(se.x-nw.x)),Math.log2((container.clientHeight-160)/(se.y-nw.y)));
  map.setView(map.unproject(nw.add(se).divideBy(2),0),zoom,{animate:false});
 }
 const observer=new ResizeObserver(()=>{map.invalidateSize({pan:false});frameClosing();});observer.observe(container);
 return {
  intro(records,all=false,reading=false,opening=false){
   // Welcome and opening share the same geography and paths. Begin changes only the text.
   if(opening&&fullOverview&&constellation.getLayers().length){breathe(false);startIntroZoom();return;}
   this.reset();fullOverview=all;
   const groups=new Map();
   for(const r of records){if(!r.collectorId||!known(r.samler))continue;if(!groups.has(r.collectorId))groups.set(r.collectorId,[]);groups.get(r.collectorId).push(r);}
   [...groups.values()].sort((a,b)=>b.length-a.length).slice(0,all?Infinity:18).forEach(items=>{const group=L.layerGroup().addTo(constellation);group.collectorId=items[0].collectorId;connections(items,'collector',group);});
   const voices=new Map();for(const r of records){if(!r.narratorId||!known(r.informant))continue;if(!voices.has(r.narratorId))voices.set(r.narratorId,[]);voices.get(r.narratorId).push(r);}
   [...voices.values()].sort((a,b)=>b.length-a.length).slice(0,all?Infinity:12).forEach(items=>connections(items,'narrator',constellation));
   framing(records.filter(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lon)).map(point),6,reading,false);breathe(false);
   container.classList.add('journey-network-overview');
   constellation.eachLayer(group=>{
    const quiet=layer=>{const element=layer.getElement?.();if(element)element.classList.add('journey-network-quiet');};
    if(group.eachLayer)group.eachLayer(quiet);else quiet(group);
   });
   if(opening)startIntroZoom();
  },
  closingNetwork(records){
   this.intro(records,true,false);
   closingCoords=records.filter(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lon)).map(point);
   frameClosing();requestAnimationFrame(frameClosing);
  },
  isolateCollector(records,id){
   // Rebuild a full overview so replay/back always yields the same transition.
   if(!constellation.getLayers().some(group=>group.collectorId===id))this.intro(records,true);
   fullOverview=false;
   constellation.eachLayer(group=>{
    const keep=group.collectorId===id;
    const fade=layer=>{const element=layer.getElement?.();if(element){
     const opacity=getComputedStyle(element).opacity;
     element.style.opacity=opacity;
     element.getBoundingClientRect();
     element.style.transition=still?'none':'opacity 6s ease';element.style.opacity=keep?'1':'0';if(keep)element.classList.add('moe-featured-star');
    }};
    if(group.eachLayer)group.eachLayer(fade);else fade(group);
   });
   startIntroZoom(1.1,20000);breathe(false);
  },
  setStill(value){still=value;if(value){introZoom?.cancel();introZoom=null;breathe(false);effects.clearLayers();container.classList.add('journey-effects-still');}else{container.classList.remove('journey-effects-still');breathe(true);}if(value){map.stop();if(movement){movement.elapsed=movement.camera+movement.duration;}}},
  reset(){activeFrame=null;networkPane.classList.remove('moe-slow-network');map.options.zoomSnap=1;introZoom?.cancel();introZoom=null;container.classList.remove('journey-network-overview');closingCoords=null;cancel();clearDestination();traces.clearLayers();constellation.clearLayers();head=null;current=null;remembered.clear();seenEdges.clear();travelledEdges.clear();visitedDots.clear();breathe(false);},
  travel(target,{story=false,allowRoad=false,kind='place',colour=null,minDuration=0,onRoute=()=>{},done=()=>{}}={}){
   closingCoords=null;cancel();clearDestination();breathe(false);
   const to=point(target),from=current||to,color=colour||collectorColour(target);
   const distance=L.latLng(from).distanceTo(to),same=distance<1000;
   const mid=[(from[0]+to[0])/2,(from[1]+to[1])/2];
   const curve=t=>{const bend=Math.min(1.4,Math.abs(to[0]-from[0])*.1);return [(1-t)**2*from[0]+2*(1-t)*t*mid[0]+t*t*to[0],(1-t)**2*from[1]+2*(1-t)*t*(mid[1]+bend)+t*t*to[1]];};
   const path=Array.from({length:41},(_,i)=>curve(i/40));
   const edgeKey=[from.join(','),to.join(',')].sort().join('|')+color;
   const line=distance>.5?L.polyline([],{renderer,className:'journey-thread',noClip:true,smoothFactor:0,color,weight:1.4,opacity:.58,interactive:false}).addTo(traces):null;
   if(line)line.getElement().style.color=color;
   setHead(from,story,color);
   const camera=still?0:2000,duration=Math.max(still?1200:same?1600:6400,minDuration-camera);
   movement={routeKind:'arc',target,from,to,path,line,edgeKey,curve,color,story,camera,duration,minDuration,elapsed:0,last:performance.now(),zoom:target.precision==='region'?6:8,done};
   const active=movement;
   active.onRoute=onRoute;
   if(allowRoad&&!still&&!story&&target.precision!=='region'){
    active.routeKind='pending';
    roadPath(from,to,distance).then(road=>{
    if(movement!==active)return;
    active.routeKind='arc';
    if(road&&active.elapsed<active.camera){
     active.curve=pathSampler(road);active.path=Array.from({length:1201},(_,i)=>active.curve(i/1200));
     // Reach the next place briskly; let any unfinished paratext settle at arrival.
     active.duration=4500;active.routeKind='road';
    }
    active.onRoute(active.routeKind);
   });
   }else onRoute('arc');
   if(still){showDestination(target);setHead(to,story,color);line?.setLatLngs(path);framing([from,to],7,false,false);}
   else framing([from,to],movement.zoom,false,true,camera/1000);
   raf=requestAnimationFrame(drawMotion);
  },
  storyLandscape(from,target){
   clearDestination();constellation.clearLayers();breathe(false);
   const coords=[point(from),point(target)],colour='#D2B957';
   L.polyline(coords,{renderer:networkRenderer,color:colour,weight:1.2,opacity:.65,dashArray:'3 7',interactive:false}).addTo(constellation);
   for(const [index,place] of [from,target].entries()){
    L.circleMarker(coords[index],{radius:3,color:colour,weight:1,fillColor:colour,fillOpacity:.8,interactive:false}).addTo(constellation);
    const label=document.createElement('span');label.textContent=place.sted;
    L.tooltip({permanent:true,direction:'right',offset:[12,0],className:'journey-destination-label',opacity:1,interactive:false}).setLatLng(coords[index]).setContent(label).addTo(constellation);
   }
   map.invalidateSize({pan:false});framing(coords,9,true);
  },
  roadNetwork(network,paused=false){
   clearDestination();constellation.clearLayers();traces.clearLayers();head=null;breathe(false);
   const coords=new Map();
   network.edges.forEach((edge,i)=>{
    coords.set(edge.from.join(','),edge.from);coords.set(edge.to.join(','),edge.to);
    // Unrouted places remain visible, without inventing a straight road connection.
    if(edge.kind!=='road')return;
    const line=L.polyline(edge.path,{renderer:networkRenderer,className:'moe-road-thread',color:'#D2B957',weight:1.5,opacity:.8,interactive:false,smoothFactor:.4}).addTo(constellation);
    const element=line.getElement();
    if(!still){element.setAttribute('pathLength','1');element.style.setProperty('--road-duration',(11000+i%5*800)+'ms');element.style.setProperty('--road-delay',(i%4*300)+'ms');element.classList.add('moe-road-unfold');}
   });
   for(const position of coords.values())L.circleMarker(position,{renderer:networkRenderer,radius:2,color:'#D2B957',weight:0,fill:true,fillOpacity:.85,interactive:false}).addTo(constellation);
   // One direct pullback reveals the roads; no second zoom reverses it.
   framing([...coords.values()],6,true,!paused,5,false,true);
  },
  encounterZoom(target,duration,settle){
   if(still||matchMedia('(prefers-reduced-motion: reduce)').matches)return null;
   const landscape=map.getPane('mapPane'),anchor=map.latLngToContainerPoint(point(target));
   const from=parseFloat(getComputedStyle(landscape).scale)||1;
   introZoom?.cancel();zoomActive=true;
   landscape.style.transformOrigin=`${anchor.x}px ${anchor.y}px`;
   introZoom=landscape.animate([{scale:String(from),offset:0},{scale:String(from),offset:settle},{scale:'1.28',offset:1}],{duration,easing:'ease-in-out',fill:'both'});
   return introZoom;
  },
  highlightPlace(target){if(!target)return;showDestination(target);setHead(point(target),false,'#F3DEA0');},
  focus(target,photo=false){
   closingCoords=null;breathe(false);if(!target)return;
   if(photo){traces.clearLayers();head=null;}
   showDestination(target);setHead(point(target),Boolean(target.key),photo?'#F3DEA0':collectorColour(target));
   if(!photo&&!target.key)markVisited(point(target),collectorColour(target));
   framing([point(target)],target.precision==='region'?7:9,true,true,2.8,photo);
  },
  networkRevealAnimations(){return [...networkPane.querySelectorAll('.journey-spoke-reveal,.journey-endpoint-reveal')].flatMap(node=>node.getAnimations()).filter(animation=>animation.playState!=='finished'&&animation.playState!=='idle');},
  connections(items,kind,colour,quiet=false){clearDestination();traces.clearLayers();head=null;constellation.clearLayers();const nodes=connections(items,kind,constellation,true,colour);if(quiet){constellation.eachLayer(layer=>{if(layer instanceof L.Marker)constellation.removeLayer(layer);});}networkPane.classList.toggle('moe-slow-network',quiet);framing(nodes.map(point),7,quiet);breathe(!quiet);},
  clearConstellation(){constellation.clearLayers();container.classList.remove('journey-network-overview');fullOverview=false;},
  overview(route,closing=false){clearDestination();const coords=[...remembered.values(),...route.map(point)];closingCoords=closing?coords:null;if(closing){map.invalidateSize({pan:false});frameClosing();}else framing(coords,7,false);breathe(true);},
  pause(){introZoom?.pause();if(movement&&raf!==null){movement.elapsed+=performance.now()-movement.last;stopFrame();}map.stop();},
  resume,
  setMapType(type){if(!MAP_TYPES.includes(type))return;mapType=type;if(terrainReady)applyMapType(terrainMap,type);},
  refreshTravel(readingTime,done,onRoute){
   if(!movement)return null;
   movement.minDuration=movement.elapsed+readingTime;
   movement.done=done;
   if(onRoute)movement.onRoute=onRoute;
   return movement.routeKind;
  },
  finishTravel,
  cancel,
  resize(){map.invalidateSize({pan:false});if(activeFrame){const {coords,zoom,reading,photo}=activeFrame;framing(coords,zoom,reading,false,2.8,photo);}},
  destroy(){destroyed=true;introZoom?.cancel();introZoom=null;cancel();observer.disconnect();map.remove();}
 };
}
