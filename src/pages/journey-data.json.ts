import type {APIRoute} from 'astro';
import {createHash} from 'node:crypto';
import storyPlaces from '../journey/places.json';
import {legends,collectorsById,narratorsById,placesById,countiesById,categoriesById} from '../lib/data';

export const GET:APIRoute=({site})=>{
  const base=import.meta.env.BASE_URL;
  const records=legends.map(legend=>{
    const place=legend.placeId?placesById.get(legend.placeId):null;
    const county=legend.countyId?countiesById.get(legend.countyId):null;
    const collector=legend.collectorId?collectorsById.get(legend.collectorId):null;
    const narrator=legend.narratorId?narratorsById.get(legend.narratorId):null;
    const category=legend.mlCategoryId?categoriesById.get(legend.mlCategoryId):null;
    const coordinates=place?.coordinates??county?.coordinates;
    return{placeId:legend.placeId,collectorId:legend.collectorId,narratorId:legend.narratorId,categoryId:legend.mlCategoryId,lat:coordinates?.latitude??null,lon:coordinates?.longitude??null,precision:place?.coordinates?'catalogue':'region',storyPlaces:(storyPlaces as Record<string,unknown[]>)[legend.sourceTextId]||[],sourceUrl:legend.sourceUrl,archiveSignature:legend.archiveSignature,id:legend.id,source_text_id:legend.sourceTextId,tittel:legend.title.no||category?.title||legend.id,tekst:legend.text.no||'',english_translation:legend.text.en||'',samler:collector?.fullName||'',informant:narrator?.fullName||'',sted:place?.name||county?.name||'',fylke:county?.name||'',ml_code:category?.code||'',ml_title:category?.title||category?.code||'',år_clean:legend.year,sted_lat:place?.coordinates?.latitude??county?.coordinates?.latitude??'',sted_lon:place?.coordinates?.longitude??county?.coordinates?.longitude??'',fylke_lat:county?.coordinates?.latitude??'',fylke_lon:county?.coordinates?.longitude??'',url:`${base}legends/${legend.id}/`};
  });
  return new Response(JSON.stringify({version:createHash('sha256').update(JSON.stringify(records)).digest('hex').slice(0,12),records}),{headers:{'Content-Type':'application/json; charset=utf-8'}});
};
