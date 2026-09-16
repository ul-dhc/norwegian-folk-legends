import type {APIRoute} from 'astro';
import {legends,collectorsById,narratorsById,placesById,countiesById,categoriesById} from '../lib/data';

export const GET:APIRoute=({site})=>{
  const base=import.meta.env.BASE_URL;
  const records=legends.map(legend=>{
    const place=legend.placeId?placesById.get(legend.placeId):null;
    const county=legend.countyId?countiesById.get(legend.countyId):null;
    const collector=legend.collectorId?collectorsById.get(legend.collectorId):null;
    const narrator=legend.narratorId?narratorsById.get(legend.narratorId):null;
    const category=legend.mlCategoryId?categoriesById.get(legend.mlCategoryId):null;
    return{id:legend.id,source_text_id:legend.sourceTextId,tittel:legend.title.no||category?.title||legend.id,tekst:legend.text.no||'',english_translation:legend.text.en||'',samler:collector?.fullName||'',informant:narrator?.fullName||'',sted:place?.name||county?.name||'',fylke:county?.name||'',ml_code:category?.code||'',ml_title:category?.title||category?.code||'',år_clean:legend.year,sted_lat:place?.coordinates?.latitude??county?.coordinates?.latitude??'',sted_lon:place?.coordinates?.longitude??county?.coordinates?.longitude??'',fylke_lat:county?.coordinates?.latitude??'',fylke_lon:county?.coordinates?.longitude??'',url:`${base}legends/${legend.id}/`};
  });
  return new Response(JSON.stringify(records),{headers:{'Content-Type':'application/json; charset=utf-8'}});
};
