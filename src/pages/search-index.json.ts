import type {APIRoute} from 'astro';
import {legends} from '../lib/data';
export const GET:APIRoute=()=>new Response(JSON.stringify(legends.map(item=>({id:item.id,no:[item.title.no,item.text.no].filter(Boolean).join(' '),en:[item.title.en,item.text.en].filter(Boolean).join(' ')}))),{headers:{'Content-Type':'application/json; charset=utf-8'}});
