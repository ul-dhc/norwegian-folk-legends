export function sameCollectorThread(previous,next){return Boolean(previous?.collectorId&&previous.collectorId===next?.collectorId);}
// Present-day road geometry is a visual connection, never a historical itinerary.
const cache=new Map();
export function pathSampler(path){
 const lengths=[0];for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];lengths.push(lengths.at(-1)+Math.hypot(b[0]-a[0],(b[1]-a[1])*Math.cos((a[0]+b[0])*Math.PI/360)));}
 return t=>{const distance=Math.max(0,Math.min(1,t))*lengths.at(-1);let lo=1,hi=lengths.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(lengths[mid]<distance)lo=mid+1;else hi=mid;}const i=lo,a=path[i-1],b=path[i],part=(distance-lengths[i-1])/(lengths[i]-lengths[i-1]||1);return[a[0]+(b[0]-a[0])*part,a[1]+(b[1]-a[1])*part];};
}
export async function roadPath(from,to,distance){
 if(distance<1000||distance>150000)return null;
 const key=[from,to].map(p=>p.join(',')).join(';');if(cache.has(key))return cache.get(key);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1800);
 try{
  const coordinates=[from,to].map(p=>`${p[1]},${p[0]}`).join(';');
  const response=await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`,{signal:controller.signal});
  if(!response.ok)return null;const data=await response.json(),route=data.routes?.[0];
  if(data.code!=='Ok'||!route||route.distance>distance*3||data.waypoints?.some(p=>p.distance>1500)||route.legs?.some(l=>l.steps?.some(s=>s.mode==='ferry')))return null;
  const path=[from,...route.geometry.coordinates.map(([lon,lat])=>[lat,lon]),to];
  if(path.length<3||!path.every(p=>p.every(Number.isFinite)))return null;
  if(cache.size>=80)cache.delete(cache.keys().next().value);cache.set(key,path);return path;
 }catch{return null;}finally{clearTimeout(timer);}
}
