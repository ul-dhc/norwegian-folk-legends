import {createDashboard} from './dashboard';
import type {types as collection, topics as topicData} from './data';
type Type=typeof collection[number];
type Topic=typeof topicData[number];
const {types,topics,base}=JSON.parse(document.getElementById('ml-data')!.textContent!) as {types:Type[];topics:Topic[];base:string};
const lang=()=>document.documentElement.dataset.uiLang==='en'?'en':'no';
let selectedTopic:Topic|undefined;
let selectedType:Type|undefined;
const codeKey=(type:Type)=>type.code.replace(/\s/g,'');
const dashboard=createDashboard({types,topics,base,lang,scopeChange:(topic,type)=>{selectedTopic=topic;selectedType=type;sync(true);render();},stateChange:()=>sync(true)});
async function read(){
 const params=new URLSearchParams(location.search);
 if(location.hash==='#network')params.set('view','network');else if(location.hash==='#overview')params.set('view','overview');
 if(params.get('view')!=='overview')await dashboard.loadNetwork();
 selectedType=types.find(type=>codeKey(type).toLowerCase()===(params.get('type')||'').replace(/\s/g,'').toLowerCase());
 selectedTopic=topics.find(topic=>topic.id===(selectedType?.topic||params.get('topic')));
 dashboard.read(params);
}
function sync(push=false){
 const params=new URLSearchParams();
 dashboard.write(params);
 if(selectedTopic)params.set('topic',selectedTopic.id);
 if(selectedType)params.set('type',codeKey(selectedType));
 history[push?'pushState':'replaceState']({},'',location.pathname+(params.size?'?'+params:'')+'#'+dashboard.view);
 updateTabLinks(params);
}
function render(){dashboard.render({topic:selectedTopic,type:selectedType});}
window.addEventListener('ui-language-change',render);
function updateTabLinks(params:URLSearchParams){
 document.querySelectorAll<HTMLAnchorElement>('[data-data-view]').forEach(link=>{const next=new URLSearchParams(params);next.set('view',link.dataset.dataView!);link.href=location.pathname+(next.size?'?'+next:'')+'#'+link.dataset.dataView;});
}
const restore=async()=>{await read();render();updateTabLinks(new URLSearchParams(location.search));};
window.addEventListener('popstate',restore);
window.addEventListener('hashchange',restore);
document.querySelector('.data-overview-tabs')?.addEventListener('click',async event=>{
 const link=(event.target as Element).closest<HTMLAnchorElement>('[data-data-view]');
 if(!link||(event as MouseEvent).metaKey||(event as MouseEvent).ctrlKey||(event as MouseEvent).shiftKey||(event as MouseEvent).altKey)return;
 event.preventDefault();await dashboard.setView(link.dataset.dataView!);
});
void restore();
