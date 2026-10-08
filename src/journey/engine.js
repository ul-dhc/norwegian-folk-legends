// Pure route composition. Connections describe this dataset, never historical travel.
export const DEMO = ['SIN204', 'SIN616', 'SIN1362', 'SIN439', 'SIN306'];
export const normalText = text => (text || '').normalize('NFKC').replace(/\s+/gu, ' ').trim().toLowerCase();
export const known = value => Boolean(value && !/^(ukjent|unknown|nan)$/iu.test(value.trim()));
export function links(a, b) {
  const result = [];
  const shared = a.storyPlaces?.find(p => b.storyPlaces?.some(q => q.key === p.key));
  if (shared) result.push({kind:'story', value:shared.name});
  if (a.narratorId && a.narratorId === b.narratorId && known(b.informant)) result.push({kind:'narrator',value:b.informant});
  if (a.placeId && a.placeId === b.placeId) result.push({kind:'place',value:b.sted});
  if (a.collectorId && a.collectorId === b.collectorId && known(b.samler)) result.push({kind:'collector',value:b.samler});
  if (a.categoryId && a.categoryId === b.categoryId) result.push({kind:'category',value:b.ml_code});
  return result;
}
export function chooseLink(a, b, recent = []) {
  return links(a,b).sort((x,y) => recent.filter(k=>k===x.kind).length - recent.filter(k=>k===y.kind).length)[0] || {kind:'elsewhere'};
}
export const mapped = r => Number.isFinite(r.lat) && Number.isFinite(r.lon);
export function routeFromIds(records, ids) {
  const lookup = new Map(records.map(r=>[r.source_text_id,r]));
  const used = new Set();
  return ids.slice(0,5).map(id=>lookup.get(id)).filter(r=> {
    if (!r || !mapped(r) || used.has(normalText(r.tekst))) return false;
    used.add(normalText(r.tekst)); return true;
  });
}
// Keep six recent stops out of the next destination choice, even across batches.
export const PLACE_COOLDOWN=6;
export function avoidRecentPlaces(candidates,history){
 const recent=history.slice(-PLACE_COOLDOWN);
 const samePlace=(a,b)=>(a.placeId&&b.placeId&&a.placeId===b.placeId)||
  (mapped(a)&&mapped(b)&&Math.abs(a.lat-b.lat)<.001&&Math.abs(a.lon-b.lon)<.001);
 const ranked=candidates.map(r=>({r,last:recent.findLastIndex(p=>samePlace(r,p))}));
 // If the collection is small, return to the least recently visited location.
 const oldest=Math.min(...ranked.map(x=>x.last));
 return ranked.filter(x=>x.last===oldest).map(x=>x.r);
}
export function compose(records, random = Math.random, openingHistory = []) {
  const pool = records.filter(r=>mapped(r) && normalText(r.tekst));
  if (!pool.length) return [];
  const openings = pool.filter(r=>r.tekst.split(/\s+/u).length < 220);
  const startPool = avoidRecentPlaces(openings.length ? openings : pool,openingHistory);
  // Choose a location first so prolific places do not dominate the openings.
  const groups=new Map();
  for(const record of startPool){const key=`${record.lat},${record.lon}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(record);}
  const locations=[...groups.values()],location=locations[Math.floor(random()*locations.length)];
  const route = [location[Math.floor(random()*location.length)]];
  const used = new Set([normalText(route[0].tekst)]), recent=[];
  while (route.length < 5) {
    const previous = route.at(-1);
    const candidates = avoidRecentPlaces(pool.filter(r=>!used.has(normalText(r.tekst))),route).map(r=> {
      const link = chooseLink(previous,r,recent.slice(-2));
      const variety = recent.slice(-2).filter(k=>k===link.kind).length;
      const length = r.tekst.split(/\s+/u).length;
      return {r,link,score:(link.kind==='elsewhere'?-100:10) + (['narrator','story'].includes(link.kind)?3:0) - variety*5 - (length>350?3:0) + random()*4};
    }).sort((a,b)=>b.score-a.score);
    if (!candidates.length) break;
    const {r,link}=candidates[0];route.push(r);used.add(normalText(r.tekst));recent.push(link.kind);
  }
  return route;
}
// One cancellable reading timer; pausing preserves the exact remaining time.
export class ReadingClock {
  constructor(callback, {now=()=>performance.now(), schedule=(fn,ms)=>setTimeout(fn,ms), cancel=id=>clearTimeout(id)}={}) {
    Object.assign(this,{callback,now,schedule,cancel});this.remaining=0;this.timer=null;
  }
  reset(ms) { this.pause(); this.remaining=ms; }
  resume() {
    if(this.timer!==null || this.remaining<=0) return;
    this.started=this.now();this.timer=this.schedule(()=>{this.timer=null;this.remaining=0;this.callback();},this.remaining);
  }
  pause() {
    if(this.timer!==null){this.cancel(this.timer);this.remaining=Math.max(0,this.remaining-(this.now()-this.started));this.timer=null;}
  }
  stop() {this.pause();this.remaining=0;}
}
export function readingTime(text) {return Math.max(18000, text.split(/\s+/u).length/170*60000 + 7000);}

export function describeRoute(route) {
  const result=[];
  route.forEach((r,i)=>result.push(i?chooseLink(route[i-1],r,result.slice(-2).filter(Boolean).map(x=>x.kind)):null));
  return result;
}

// Continue from the previous telling. Exhaust the available texts before revisiting.
export function continueRoute(records, previous, visited = new Set(), random = Math.random, recentPlaces = []) {
 const pool=records.filter(r=>mapped(r)&&normalText(r.tekst));
 const result=[];let last=previous;const recent=[];
 const placeHistory=[...recentPlaces];if(previous&&placeHistory.at(-1)!==previous)placeHistory.push(previous);
 for(let i=0;i<5&&pool.length;i++){
  let available=pool.filter(r=>!visited.has(normalText(r.tekst))&&normalText(r.tekst)!==normalText(last?.tekst));
  if(!available.length){visited.clear();available=pool.filter(r=>normalText(r.tekst)!==normalText(last?.tekst));}
  if(!available.length)available=pool;
  available=avoidRecentPlaces(available,placeHistory);
  const ranked=available.map(r=>{const link=last?chooseLink(last,r,recent.slice(-2)):{kind:'elsewhere'};return {r,link,score:(link.kind==='elsewhere'?0:20)-(recent.slice(-2).includes(link.kind)?5:0)+(last?.placeId!==r.placeId?3:0)+random()*4};}).sort((a,b)=>b.score-a.score);
  const {r,link}=ranked[0];result.push(r);visited.add(normalText(r.tekst));recent.push(link.kind);last=r;placeHistory.push(r);
 }
 return result;
}
// A minimal geographic tree links real associated locations; no invented person-location.
export function networkEdges(items) {
 const nodes=[...new Map(items.filter(mapped).map(r=>[[r.lat,r.lon].join(','),r])).values()];
 if(nodes.length<2)return {nodes,edges:[]};
 const reached=[nodes[0]],remaining=nodes.slice(1),edges=[];
 while(remaining.length){let best=Infinity,a,b,index=0;for(const from of reached)remaining.forEach((to,i)=>{const d=(from.lat-to.lat)**2+((from.lon-to.lon)*Math.cos(from.lat*Math.PI/180))**2;if(d<best){best=d;a=from;b=to;index=i;}});edges.push([a,b]);reached.push(b);remaining.splice(index,1);}
 return {nodes,edges};
}
