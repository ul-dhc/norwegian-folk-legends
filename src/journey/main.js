import liv from '../assets/moe/liv-bratterud.jpg?url';
import childhood from '../assets/moe/childhood.jpg?url';
import portrait from '../assets/moe/portrait.png?url';
import informants from '../assets/moe/informants.jpg?url';
import {moeRoute,moeScenes,moeIntro,moeSources} from './moe.js';
import {createElement,Maximize,Minimize} from 'lucide';
import {compose,routeFromIds,describeRoute,known,ReadingClock,continueRoute,normalText,networkEdges} from './engine.js';
import {format} from './language.js';
import {passages,passageDuration,networkScenes,samePlaceBridge,translatedSceneIndex} from './cinema.js';
import {sameCollectorThread} from './roads.js';
import {collectorColour,shortEnough,journeyEligible,colourThreads} from './appearance.js';
import {cinema} from './cinema-language.js';
import {THEMES,themeRoute} from './themes.js';
import {creditedBridge,journeySummary,continuousBridge,roadBridge} from './credits.js';
import {createJourneyMap} from './map.js';
import {insightCandidates,chooseInsight} from './insights.js';
const root=document.querySelector('#legend-journey'),el=id=>document.getElementById(id);
const language=()=>document.documentElement.dataset.uiLang==='en'?'en':'no',t=()=>cinema[language()];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const audio=el('journey-audio');
let collectionFacts={},allRecords=[];
let records=[],route=[],links=[],scenes=[],version='',sceneIndex=-1,ready=false,failed=false,started=false,paused=false;
let readingTime=100;
try{const saved=Number(localStorage.getItem('journey-reading-time'));if(Number.isFinite(saved)&&saved>=70&&saved<=200)readingTime=Math.round(saved/10)*10;}catch{}
let still=matchMedia('(prefers-reduced-motion: reduce)').matches,map=null,progressAnimation=null,restTimer=null,resizeTimer=null,sceneToken=0;
const shownNetworks=new Set();
const usedInsights=new Set(),insightPlan=new Map();let lastInsightKind=null;
const bridgeChoices=new Map(),bridgeCounts=new Map();
let themeKey='water';
const currentTheme=()=>mode==='thread'?THEMES[themeKey]:null;
let mode='weave',visited=new Set(),completed=0,previousRecord=null,recentPlaces=[];
let restored=false,versionChanged=false,original=false;
let openingHistory=[];
try{const saved=JSON.parse(localStorage.getItem('journey-recent-openings')||'[]');if(Array.isArray(saved))openingHistory=saved.filter(r=>Number.isFinite(r?.lat)&&Number.isFinite(r?.lon)).slice(-6);}catch{}
let typingChars=[],typingIndex=0,typingDuration=0;
const typingClock=new ReadingClock(typeNext);
function characterDelay(char){return /[.!?…]/u.test(char)?380:/[,;:]/u.test(char)?170:char===' '?45:32;}
function typeNext(){
 const node=el('journey-caption').querySelector('.journey-typed');if(!node)return;
 node.textContent=typingChars.slice(0,++typingIndex).join('');
 if(typingIndex<typingChars.length){typingClock.reset(characterDelay(typingChars[typingIndex-1]));if(!paused&&!document.hidden)typingClock.resume();}
 else node.classList.add('finished');
}
const clock=new ReadingClock(()=>advance());
const scene=()=>scenes[sceneIndex];
const record=()=>route[scene()?.i??0];
const textFor=r=>language()==='en'&&!original&&r.english_translation?.trim()?r.english_translation:r.tekst;
const heading=r=>r.tittel||r.ml_title||r.id;
let selectedMap='coastlines';
try{const saved=localStorage.getItem('journey-map-type-v3');if(['quiet','terrain','coastlines'].includes(saved))selectedMap=saved;}catch{}
function mapSettings(){
 const en=language()==='en';
 el('journey-settings-toggle').setAttribute('aria-label',en?'Journey settings':'Reiseinnstillinger');
 el('journey-settings-title').textContent=en?'Journey settings':'Reiseinnstillinger';
 el('journey-map-settings-title').textContent=en?'Map atmosphere':'Kartets uttrykk';
 el('journey-reading-time-label').textContent=en?'Reading time':'Lesetid';
 el('journey-reading-less').textContent=en?'Less time':'Kortere tid';
 el('journey-reading-more').textContent=en?'More time':'Lengre tid';
 const seconds=Math.round(passageDuration('word '.repeat(100))*readingTime/100000);
 const readingNote=en?`About ${seconds} seconds per 100 words`:`Omtrent ${seconds} sekunder per 100 ord`;
 el('journey-reading-time').value=readingTime;
 el('journey-reading-time').setAttribute('aria-valuetext',readingNote);
 el('journey-reading-time-note').textContent=readingNote;
 const names=en?{terrain:['Terrain','Mountains and roads'],quiet:['Quiet landscape','Water and roads, without relief'],coastlines:['Coastlines','Land, fjords and lakes · no roads']}:{terrain:['Terreng','Fjell og veier'],quiet:['Rolig landskap','Vann og veier, uten relieff'],coastlines:['Kystlinjer','Land, fjorder og innsjøer · uten veier']};
 root.querySelectorAll('[data-map-type]').forEach(button=>{const text=names[button.dataset.mapType];button.querySelector('span').textContent=text[0];button.querySelector('small').textContent=text[1];button.setAttribute('aria-pressed',String(button.dataset.mapType===selectedMap));});
}
function closeSettings(){el('journey-settings').hidden=true;el('journey-settings-toggle').setAttribute('aria-expanded','false');root.classList.remove('settings-open');}
const status=message=>{el('journey-status').textContent=message;};
function revealControls(){root.classList.remove('controls-resting');clearTimeout(restTimer);if(started&&!paused&&scene()?.kind!=='end')restTimer=setTimeout(()=>root.classList.add('controls-resting'),4500);}
function controls(){
 mapSettings();
 const active=started&&scene()?.kind!=='end';
 root.querySelector('.journey-controls').hidden=!active;
 el('journey-close').hidden=!started;el('journey-close').setAttribute('aria-label',language()==='en'?'Leave the journey':'Forlat reisen');
 el('journey-pause').hidden=!active;el('journey-next').hidden=!active;el('journey-back').hidden=!active;
 el('journey-back').disabled=sceneIndex<=0;
 el('journey-pause').textContent=paused?'▶ '+t().resume:'Ⅱ '+t().pause;
 el('journey-next').textContent=t().next+' ›';el('journey-back').textContent='‹ '+t().back;
 el('journey-sound').textContent=language()==='en'?'Music':'Musikk';el('journey-sound').setAttribute('aria-pressed',String(!audio.paused));
 el('journey-motion').textContent=t().still;el('journey-motion').setAttribute('aria-pressed',String(still));
 el('journey-motion').disabled=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const isFullscreen=Boolean(document.fullscreenElement||root.classList.contains('is-fullscreen'));
 el('journey-fullscreen').replaceChildren(createElement(isFullscreen?Minimize:Maximize,{width:18,height:18,'stroke-width':1.8,'aria-hidden':'true'}));
 el('journey-fullscreen').setAttribute('aria-label',isFullscreen?t().exit:t().fullscreen);
 el('journey-credit').textContent=t().credit;
 el('journey-progress').textContent=active?(mode==='moe'?`${sceneIndex+1} / ${scenes.length-1}`:mode==='weave'?`${completed+(scene()?.i??0)+1} · ∞`:format(t().progress,{n:(scene()?.i??0)+1,total:route.length})):'';
 el('journey-source').hidden=!active||scene()?.kind==='moe';el('journey-source').textContent=t().source;if(active)el('journey-source').href=record().url;
 root.classList.toggle('paused',paused);
 root.setAttribute('aria-label',language()==='en'?'Legend journey':'Sagnreise');
 el('journey-reading').setAttribute('aria-label',language()==='en'?'Legend':'Sagn');
 root.querySelector('nav').setAttribute('aria-label',language()==='en'?'Journey controls':'Reisekontroller');
}
function welcome(){
 const theme=currentTheme();
 el('journey-location-kind').textContent='NORSKE SAGN';el('map-heading').textContent='Norge';
 el('journey-welcome').innerHTML=`<h1>${esc(mode==='moe'?'Moltke Moe':theme?t().thread:t().title)}</h1><p>${esc(mode==='moe'?moeIntro[language()]:theme?theme.intro[language()]:t().intro)}</p><div class="journey-modes" role="group" aria-label="${t().modeLabel}"><button data-mode="weave" aria-pressed="${mode==='weave'}">${t().weave}</button><button data-mode="thread" aria-pressed="${mode==='thread'}">${t().thread}</button><button data-mode="moe" aria-pressed="${mode==='moe'}">Moltke Moe</button></div><p class="journey-mode-note">${mode==='moe'?(language()==='en'?'A collector’s world · Five legends · Archival photographs':'En samlers verden · Fem sagn · Arkivfotografier'):mode==='weave'?t().weaveNote:t().threadNote}</p>${mode==='thread'?`<div class="journey-themes" role="group" aria-label="${language()==='en'?'Choose a theme':'Velg et tema'}">${Object.entries(THEMES).map(([key,theme])=>`<button type="button" data-theme-thread="${key}" aria-pressed="${themeKey===key}" style="--theme-colour:${theme.colour}"><span>${esc(theme[language()])}</span><small>${esc(theme.description[language()])}</small></button>`).join('')}</div>`:''}${ready?`<div class="journey-welcome-actions"><button type="button" class="journey-primary" data-begin="inline">${t().begin}</button></div>`:`<p role="status">${failed?t().failed:t().loading}</p>`}`;
 if(versionChanged)status(t().old);controls();
}
function capacity(text,title){
 // Measure the same type at the actual available width: never put a scrollbar
 // inside a legend, even after fullscreen, resizing or changing text size.
 const width=innerWidth>=900?Math.min(600,root.clientWidth*.45):Math.min(innerHeight<540?800:730,root.clientWidth-(innerWidth<700?44:64));
 const maxHeight=root.clientHeight-(innerHeight<540?180:innerWidth<700?245:235);
 const measure=document.createElement('div');measure.className='journey-passage';
 Object.assign(measure.style,{position:'absolute',visibility:'hidden',pointerEvents:'none',width:width+'px',height:'auto',maxHeight:'none',top:'0'});root.append(measure);
 const titleStyle=getComputedStyle(el('journey-title'));
 Object.assign(measure.style,{fontFamily:titleStyle.fontFamily,fontSize:titleStyle.fontSize,lineHeight:titleStyle.lineHeight,width:Math.max(1,width-60)+'px'});
 measure.textContent=title;
 const titleHeight=Math.min(measure.getBoundingClientRect().height,parseFloat(titleStyle.lineHeight)*(innerHeight<540?1:2));
 for(const property of ['font-family','font-size','line-height'])measure.style.removeProperty(property);
 measure.style.width=width+'px';
 const line=parseFloat(getComputedStyle(measure).lineHeight);
 const space=Math.max(line,maxHeight-titleHeight-(innerHeight<540?55:innerWidth<700?75:89));
 let count=180;
 // Use real source words, including long Norwegian words, rather than averages.
 while(count>8){
  let fits=true;
  for(const page of passages(text,count)){measure.textContent=page.text;if(measure.getBoundingClientRect().height>space){fits=false;break;}}
  if(fits)break;count-=3;
 }
 measure.remove();return Math.max(8,count);
}
function buildScenes(){
 scenes=[];
 if(mode==='moe'){scenes=moeScenes(route,allRecords,r=>passages(textFor(r),capacity(textFor(r),heading(r))),{portrait,informants,childhood,liv});return;}
 const theme=currentTheme();
 const networks=new Map((theme?[]:networkScenes(route,links,shownNetworks)).map(s=>[s.i,s]));
 if(!theme&&completed===0)t().introduction.forEach((text,j)=>scenes.push({kind:'introduction',i:0,j,text:format(text,collectionFacts)}));
 if(theme)scenes.push({kind:'theme-opening',i:0});
 route.forEach((r,i)=>{
  if(!theme&&!bridgeChoices.has(completed+i)){
   const kind=links[i]?.kind||'opening',count=bridgeCounts.get(kind)||0;
   bridgeChoices.set(completed+i,count);bridgeCounts.set(kind,count+1);
  }
  if(networks.has(i))scenes.push(networks.get(i));
  scenes.push({kind:'travel',i},{kind:'context',i});
  const pages=shortEnough(r)?passages(textFor(r),capacity(textFor(r),heading(r))):[];
  if(!shortEnough(r))scenes.push({kind:'long',i});
  pages.forEach((page,p)=>scenes.push({kind:'read',i,p,total:pages.length,...page}));
  if(!theme&&(completed+i)%4===2){
   const position=completed+i;
   if(!insightPlan.has(position)){const insight=chooseInsight(insightCandidates(records,r),usedInsights,lastInsightKind,usedInsights.size%3===0);insightPlan.set(position,insight);if(insight){usedInsights.add(insight.key);lastInsightKind=insight.kind;}}
   const insight=insightPlan.get(position);if(insight)scenes.push({kind:'insight',i,insight});
  }
  (theme?[]:r.storyPlaces||[]).forEach((place,j)=>scenes.push({kind:'story-travel',i,j,place},{kind:'story-hold',i,j,place}));
 });
 scenes.push({kind:mode==='weave'?'weave':'end',i:route.length-1});
}
function schedule(ms,showProgress=false){
 ms=Math.max(ms,typingDuration?typingDuration+4500:0);clock.reset(ms);
 if(showProgress&&!matchMedia('(prefers-reduced-motion: reduce)').matches){progressAnimation=el('journey-time-fill').animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:ms,fill:'forwards'});if(paused)progressAnimation.pause();}
 if(!paused&&!document.hidden)clock.resume();
}
function caption(text,label=''){
 const node=el('journey-caption');
 typingChars=Array.from(text);typingIndex=0;
 const animate=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 typingDuration=animate?typingChars.reduce((sum,c)=>sum+characterDelay(c),0):0;
 node.innerHTML=(label?`<small>${esc(label)}</small>`:'')+`<span class="journey-sr-only">${esc(text)}</span><span class="journey-type-layout" aria-hidden="true"><span class="journey-type-space">${esc(text)}</span><span class="journey-typed${animate?'':' finished'}">${animate?'':esc(text)}</span></span>`;node.hidden=false;
 if(animate){typingClock.reset(450);if(!paused&&!document.hidden)typingClock.resume();}
 node.style.animation='none';void node.offsetWidth;node.style.animation='';
}
function bridge(i){
 const theme=currentTheme();
 return theme?creditedBridge(theme.stops[i][language()],route[i],language(),i):continuousBridge(route[i-1]||previousRecord,route[i],links[i],language(),bridgeChoices.get(completed+i)||0);
}
function summaryMarkup(){
 if(mode==='moe')return `<div class="journey-summary"><p>${language()==='en'?'Five legends · Four narrator names · Moltke Moe':'Fem sagn · Fire fortellernavn · Moltke Moe'}</p><p>${language()==='en'?'Legend catalogue places: Heddal and Bø.':'Sagnets katalogsteder: Heddal og Bø.'}</p></div>`;
 const summary=journeySummary(route,language());
 return `<div class="journey-summary"><p class="journey-summary-counts">${esc(summary.counts)}</p>${['places','collectors','narrators'].map(key=>`<p>${esc(summary[key])}</p>`).join('')}</div>`;
}
function showScene(preserveMap=false){
 clock.stop();typingClock.stop();typingDuration=0;if(!preserveMap){map?.cancel();if(!(mode==='moe'&&scene()?.j==='network'))map?.clearConstellation();}progressAnimation?.cancel();progressAnimation=null;
 const token=++sceneToken,s=scene();if(!s)return;
 const r=route[s.i];root.dataset.scene=s.kind;el('journey-route-note').textContent='';root.style.setProperty('--collector-colour',collectorColour(r));
 for(const id of ['journey-welcome','journey-reading','journey-caption','journey-ending','journey-moe-card'])el(id).hidden=true;
 el('journey-location-kind').textContent=t().place;el('map-heading').textContent=r.sted;
 el('journey-location-detail').textContent=r.precision==='region'?t().region:(r.fylke&&r.fylke!==r.sted?r.fylke:'');
 status('');controls();
 if(s.kind==='moe'){
  const en=language()==='en',card=el('journey-moe-card');
  el('journey-location-kind').textContent=en?'A collector’s world':'En samlers verden';el('map-heading').textContent=s.title;
  el('journey-location-detail').textContent=s.target?(en?'Approximate place · narrative stop':'Omtrentlig sted · fortellerstopp'):(en?'Archival connections, not an itinerary':'Arkivforbindelser, ikke en reiserute');
  el('journey-source').hidden=true;
  if(!preserveMap){
   if(s.j==='all')map?.intro(allRecords,true);
   else if(s.j==='network')map?.isolateCollector(allRecords,'collector-moltke-moe');
   else if(s.j==='return')map?.connections(allRecords.filter(r=>r.collectorId==='collector-moltke-moe'),'collector','#D2B957');
   else if(s.target)map?.focus(s.target);
  }
  card.classList.toggle('has-image',Boolean(s.image));
  card.innerHTML=`${s.image?`<figure><img src="${esc(s.image)}" alt="${esc(s.credit)}"/><figcaption>${esc(s.credit)}</figcaption></figure>`:''}<div><p>${esc(s.text[language()])}</p>${s.manuscript?`<a class="moe-manuscript" href="${esc(s.manuscript)}" target="_blank" rel="noopener">${en?'Open manuscript in Samla':'Åpne manuskriptet i Samla'}</a>`:''}<small>${en?'Explore the sources in Info.':'Utforsk kildene i Info.'}</small></div>`;card.hidden=false;
  schedule(Math.max(16000,passageDuration(s.text[language()])*readingTime/100));
 }else if(s.kind==='theme-opening'){
  const theme=currentTheme();
  el('journey-location-kind').textContent=language()==='en'?'One theme, many places':'Ett tema, mange steder';el('map-heading').textContent=theme[language()];el('journey-location-detail').textContent=t().networkNote;el('journey-source').hidden=true;el('journey-progress').textContent='';
  if(!preserveMap)map?.connections(records.filter(r=>r.ml_code===theme.code),'theme',theme.colour);
  caption(theme.intro[language()]);schedule(14000);
 }else if(s.kind==='introduction'){
  el('journey-location-kind').textContent='NORSKE SAGN';el('map-heading').textContent='Norge';el('journey-location-detail').textContent='';
  el('journey-source').hidden=true;el('journey-progress').textContent='';
  caption(s.text);schedule(10000);
 }else if(s.kind==='travel'||s.kind==='story-travel'){
  const isStory=s.kind==='story-travel',target=isStory?s.place:r;
  if(isStory){el('journey-location-kind').textContent=s.place.role==='family'?t().family:t().story;el('map-heading').textContent=`${r.sted} → ${s.place.name}`;el('journey-location-detail').textContent='';}
  const sentence=isStory?format(s.place.role==='family'?t().familyTravel:t().storyTravel,{from:r.sted,place:s.place.name}):bridge(s.i);
  caption(sentence);
  // Wait for the route decision before typing: never promise a road when routing
  // falls back to an arc, and never replace a sentence midway through typing.
  if(map)typingClock.pause();
  const done=()=>{if(token===sceneToken)advance();};
  const onRoute=kind=>{
   if(token!==sceneToken||kind==='pending')return;
   const position=completed+s.i;
   caption(kind==='road'&&!isStory&&position%3===1?roadBridge(r,language(),position):sentence);
   el('journey-route-note').textContent=kind==='road'?t().roadNote:'';
   map.refreshTravel(typingDuration+2500,done);
  };
  if(map&&preserveMap){const kind=map.refreshTravel(typingDuration+2500,done,onRoute);onRoute(kind);}
  else if(map){map.travel(target,{story:isStory,allowRoad:!isStory&&(Boolean(currentTheme())||sameCollectorThread(route[s.i-1]||previousRecord,r)),kind:isStory?'story':links[s.i]?.kind,colour:collectorColour(r),minDuration:typingDuration+2500,onRoute,done});if(paused)map.pause();}
  else schedule(7000);
 }else if(s.kind==='context'){
  if(!preserveMap)map?.focus(r);
  // A brief, wordless arrival gives the landscape room before the legend.
  schedule(2200);
 }else if(s.kind==='read'){
  el('journey-reading').hidden=false;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)el('journey-passage').animate([{opacity:0},{opacity:1}],{duration:1400});
  el('journey-title').textContent=heading(r);el('journey-title').title=heading(r);
  el('journey-page').textContent=s.total>1?format(t().part,{n:s.p+1,total:s.total}):'';
  el('journey-passage').textContent=s.text;
  const english=language()==='en'&&!original&&Boolean(r.english_translation?.trim());
  el('journey-passage').lang=english?'en':'no';
  el('journey-byline').classList.add('collector-key');el('journey-byline').textContent=[known(r.informant)?format(t().narrator,{name:r.informant}):'',known(r.samler)?format(t().collected,{name:r.samler}):'',r.år_clean,english?t().english:t().original].filter(Boolean).join(' · ');
  schedule(passageDuration(s.text)*readingTime/100,true);
 }else if(s.kind==='insight'){
  caption(s.insight[language()]);schedule(14000);
 }else if(s.kind==='long'){
  caption(t().longText);schedule(14000);
 }else if(s.kind==='collector'||s.kind==='narrator'){
  const narrator=s.kind==='narrator',key=narrator?'narratorId':'collectorId',id=r[key];
  const members=records.filter(x=>x[key]===id);
  if(!preserveMap)map?.connections(members,s.kind,collectorColour(r));
  el('map-heading').textContent=narrator?r.informant:r.samler;
  el('journey-location-kind').textContent=narrator?t().voiceNetwork:t().collectorNetwork;
  el('journey-location-detail').textContent=narrator?t().networkNote:t().collectorHubNote;
  caption(format(narrator?t().narratorNetwork:t().collector,{name:narrator?r.informant:r.samler,count:members.length})+(networkEdges(members).nodes.length===1?' '+t().onePlace:''));schedule(14000);
 }else if(s.kind==='weave'){
  el('map-heading').textContent=t().weave;el('journey-location-kind').textContent='NORSKE SAGN';el('journey-location-detail').textContent=t().networkNote;
  if(!preserveMap)map?.overview(route);caption('');schedule(7000);
 }else if(s.kind==='story-hold'){
  el('journey-location-kind').textContent=s.place.role==='family'?t().family:t().story;el('map-heading').textContent=s.place.name;el('journey-location-detail').textContent=s.place.precision==='region'?t().region:'';
  caption('“'+s.place.quote+'”',format(t().storyHold,{from:r.sted,place:s.place.name}));
  schedule(passageDuration(s.place.quote)*readingTime/100);
 }else{
  el('journey-location-kind').textContent='NORSKE SAGN';el('map-heading').textContent='Norge';el('journey-location-detail').textContent='';
  el('journey-ending').hidden=false;
  el('journey-ending').innerHTML=`<h2>${mode==='moe'?(language()==='en'?'The voices remain':'Stemmene blir igjen'):currentTheme()?esc(currentTheme()[language()]):t().end}</h2><p>${mode==='moe'?(language()==='en'?'Five legends, several voices, one collector. Return to the map, or follow the manuscript links in Info.':'Fem sagn, flere stemmer, én samler. Gå tilbake til kartet, eller følg manuskriptlenkene i Info.'):currentTheme()?esc(currentTheme().ending[language()]):t().endText}</p>${summaryMarkup()}<div class="journey-welcome-actions"><button type="button" class="journey-primary" data-again>${mode==='moe'?(language()==='en'?'Replay this journey':'Spill reisen på nytt'):currentTheme()?(language()==='en'?'Replay this theme':'Spill temaet på nytt'):t().again}</button>${currentTheme()||mode==='moe'?`<button type="button" data-choose-theme>${language()==='en'?'Choose another journey':'Velg en annen reise'}</button>`:''}<button type="button" data-share>${t().share}</button></div><p class="journey-ending-note">${mode==='moe'?(language()==='en'?'A pilot connecting the legend dataset, Samla and museum collections.':'En pilot som knytter sammen sagndatasettet, Samla og museumssamlinger.'):t().method}</p>`;
  if(!preserveMap){if(mode==='moe')map?.intro(allRecords,true);else map?.overview(route,true);}root.classList.remove('controls-resting');
 }
 revealControls();
}
function advance(){
 // Next completes the geographic segment before the next scene cancels animation.
 map?.finishTravel();
 if(scene()?.kind==='weave'){
  scenes.filter(s=>s.networkKey).forEach(s=>shownNetworks.add(s.networkKey));
  previousRecord=route.at(-1);completed+=route.length;
  route=colourThreads(continueRoute(records.filter(shortEnough),previousRecord,visited,Math.random,recentPlaces),previousRecord);recentPlaces=[...recentPlaces,...route].slice(-6);links=describeRoute([previousRecord,...route]).slice(1);
  buildScenes();sceneIndex=0;showScene();return;
 }
 if(sceneIndex<scenes.length-1){sceneIndex++;showScene();}
}
function pause(){if(!started||scene()?.kind==='end')return;paused=true;clock.pause();typingClock.pause();map?.pause();progressAnimation?.pause();controls();revealControls();}
function resume(){paused=false;clock.resume();typingClock.resume();map?.resume();progressAnimation?.play();controls();revealControls();}
function togglePause(){paused?resume():pause();}
function syncUrl(){const url=new URL(location.href);url.hash=new URLSearchParams({v:version,mode,...(currentTheme()?{theme:themeKey}:{}),route:route.map(r=>r.source_text_id).join(',')}).toString();window.history.replaceState(null,'',url);}
function start(random=true){
 if(!ready)return;
 if(mode==='moe')route=moeRoute(records);
 else if(currentTheme())route=themeRoute(records,themeKey);
 else if(random||!restored||!route.length)route=compose(records.filter(shortEnough),Math.random,restored&&route.length?[...openingHistory,route[0]]:openingHistory);
 if(mode!=='moe'&&!currentTheme()&&route.length){openingHistory=[...openingHistory,{placeId:route[0].placeId,lat:route[0].lat,lon:route[0].lon}].slice(-6);try{localStorage.setItem('journey-recent-openings',JSON.stringify(openingHistory));}catch{}}
 restored=false;
 if(mode!=='moe'&&!currentTheme())route=colourThreads(route);links=describeRoute(route);if(!route.length)return;previousRecord=null;completed=0;shownNetworks.clear();visited=new Set(route.map(r=>normalText(r.tekst)));recentPlaces=route.slice(-6);
 usedInsights.clear();insightPlan.clear();lastInsightKind=null;bridgeChoices.clear();bridgeCounts.clear();started=true;document.body.classList.add('journey-active');paused=false;sceneIndex=0;buildScenes();syncUrl();map?.reset();map?.setStill(still);
 root.scrollIntoView({behavior:'instant',block:'start'});root.focus({preventScroll:true});showScene();
}
async function fullscreen(){
 if(document.fullscreenElement){await document.exitFullscreen();return;}
 if(root.classList.contains('is-fullscreen')){root.classList.remove('is-fullscreen');document.body.classList.remove('journey-fullscreen');resize();controls();return;}
 try{if(!root.requestFullscreen)throw new Error('Fullscreen unavailable');await root.requestFullscreen();}
 catch{root.classList.add('is-fullscreen');document.body.classList.add('journey-fullscreen');resize();controls();}
}
function resize(){
 map?.resize();if(!started)return;
 const previous=scene();if(!previous)return;
 const active=previous.kind;buildScenes();
 let replacement=scenes.findIndex(s=>s.i===previous.i&&s.kind===active&&(active==='read'?s.offset<=previous.offset&&s.end>previous.offset:s.j===previous.j));
 sceneIndex=replacement<0?Math.min(sceneIndex,scenes.length-1):replacement;
 // Reflow complete passages with adequate fresh reading time. Keep the same
 // word position rather than jumping to the next legend after a resize.
 if(active==='read'){showScene();map?.focus(record());if(paused)map?.pause();}
 else if(active==='moe')showScene();
}
root.addEventListener('click',async event=>{
 if(event.target.closest('a'))pause();
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.mapType){selectedMap=button.dataset.mapType;map?.setMapType(selectedMap);try{localStorage.setItem('journey-map-type-v3',selectedMap);}catch{}mapSettings();}
 else if(button.dataset.themeThread){themeKey=button.dataset.themeThread;route=[];restored=false;welcome();}
 else if(button.dataset.mode){mode=button.dataset.mode;route=[];restored=false;welcome();}
 else if(button.dataset.begin)start();
 else if(button.hasAttribute('data-again'))start(true);
 else if(button.hasAttribute('data-choose-theme'))el('journey-close').click();
 else if(button.hasAttribute('data-share')){syncUrl();try{await navigator.clipboard.writeText(location.href);status(t().copied);}catch{status(t().copyFailed);}}
});
el('journey-info-toggle').addEventListener('click',()=>{
 pause();const en=language()==='en';
 el('journey-info-title').textContent=en?'Sources & photographs':'Kilder og fotografier';
 el('journey-info-content').innerHTML=`<p>${en?'This pilot follows relationships in the dataset, not a reconstructed itinerary. Biographical map points are approximate town or district locations. Source texts are preserved; where no English translation is available, the Norwegian text is shown.':'Piloten følger forbindelser i datasettet, ikke en rekonstruert reiserute. Biografiske kartpunkter er omtrentlige by- eller områdesteder. Kildetekstene er bevart; der engelsk oversettelse mangler, vises norsk tekst.'}</p><h3>Moltke Moe</h3><ul>${moeSources.map(([name,url])=>`<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a></li>`).join('')}</ul><h3>${en?'Featured legends':'Utvalgte sagn'}</h3><ul>${moeRoute(allRecords).map(r=>`<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.source_text_id)} · ${esc(r.informant)} · ${esc(r.archiveSignature)}</a>${r.sourceUrl?` · <a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">${en?'Original catalogue':'Originalkatalog'}</a>`:''}</li>`).join('')}</ul>`;
 el('journey-info').showModal();
});
el('journey-info-close').addEventListener('click',()=>el('journey-info').close());
el('journey-settings-toggle').addEventListener('click',()=>{const open=el('journey-settings').hidden;el('journey-settings').hidden=!open;el('journey-settings-toggle').setAttribute('aria-expanded',String(open));root.classList.toggle('settings-open',open);revealControls();});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#journey-settings,#journey-settings-toggle'))closeSettings();});
root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!el('journey-settings').hidden){event.stopImmediatePropagation();closeSettings();el('journey-settings-toggle').focus();}});
el('journey-pause').addEventListener('click',togglePause);
el('journey-next').addEventListener('click',()=>{advance();});
el('journey-back').addEventListener('click',()=>{if(sceneIndex>0){sceneIndex--;showScene();}});
el('journey-fullscreen').addEventListener('click',fullscreen);
el('journey-close').addEventListener('click',async()=>{clock.stop();typingClock.stop();typingDuration=0;map?.cancel();progressAnimation?.cancel();audio.pause();started=false;paused=false;sceneIndex=-1;sceneToken++;clearTimeout(restTimer);root.classList.remove('controls-resting','is-fullscreen');document.body.classList.remove('journey-active','journey-fullscreen');if(document.fullscreenElement)await document.exitFullscreen();for(const id of ['journey-reading','journey-caption','journey-ending','journey-moe-card'])el(id).hidden=true;el('journey-welcome').hidden=false;map?.reset();map?.intro(records);root.dataset.scene='intro';welcome();root.scrollIntoView({behavior:'instant',block:'start'});});
el('journey-reading-time').addEventListener('input',event=>{
 const previous=readingTime;
 readingTime=Number(event.target.value);
 try{localStorage.setItem('journey-reading-time',String(readingTime));}catch{}
 if(scene()?.kind==='read'){
  // Preserve how far the reader has progressed; don't restart the legend or camera.
  clock.pause();
  const remaining=clock.remaining*readingTime/previous;
  const duration=passageDuration(scene().text)*readingTime/100;
  clock.reset(remaining);
  if(progressAnimation){progressAnimation.effect.updateTiming({duration});progressAnimation.currentTime=Math.max(0,duration-remaining);}
  if(!paused&&!document.hidden)clock.resume();
 }
 mapSettings();revealControls();
});
el('journey-motion').addEventListener('click',()=>{still=!still;map?.setStill(still);controls();revealControls();});
el('journey-sound').addEventListener('click',async()=>{if(!audio.paused)audio.pause();else{try{audio.volume=.16;await audio.play();}catch{status(t().audioFailed);}}controls();revealControls();});
el('journey-source').addEventListener('click',pause);
root.addEventListener('pointermove',revealControls);root.addEventListener('focusin',revealControls);root.addEventListener('touchstart',revealControls,{passive:true});
root.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&root.classList.contains('is-fullscreen')){root.classList.remove('is-fullscreen');document.body.classList.remove('journey-fullscreen');resize();controls();}
 if(event.target.closest('button,a,input,select,textarea'))return;
 if(event.code==='Space'&&started){event.preventDefault();togglePause();}
 if(event.key==='ArrowRight'&&started){event.preventDefault();advance();}
 if(event.key==='ArrowLeft'&&sceneIndex>0){event.preventDefault();sceneIndex--;showScene();}
});
window.addEventListener('ui-language-change',()=>{
 if(!started){welcome();return;}
 const previous=scene();if(!previous)return;
 buildScenes();
 const replacement=translatedSceneIndex(scenes,previous);
 sceneIndex=replacement<0?Math.min(sceneIndex,scenes.length-1):replacement;
 // Refresh the words without cancelling a flight, replaying a network, or pausing.
 showScene(true);
});
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,160);});
document.addEventListener('fullscreenchange',()=>{controls();clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,160);});
new MutationObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,160);}).observe(document.documentElement,{attributes:true,attributeFilter:['style']});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{if(event.matches){still=true;map?.setStill(true);}controls();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();audio.pause();controls();}});
window.addEventListener('pagehide',()=>{clock.pause();typingClock.pause();map?.pause();audio.pause();});
welcome();
try{
 try{map=createJourneyMap(el('journey-map'),()=>status(t().tiles));}catch(error){console.warn('Map unavailable',error);}
 const response=await fetch(root.dataset.endpoint);if(!response.ok)throw new Error('Data unavailable');
 const data=await response.json();allRecords=data.records;
 const years=data.records.map(r=>String(r.år_clean||'')).filter(y=>/^\d{4}$/.test(y)).map(Number);
 collectionFacts={recordCount:data.records.length,collectorCount:new Set(data.records.filter(r=>known(r.samler)).map(r=>r.collectorId||r.samler)).size,firstYear:Math.min(...years),lastYear:Math.max(...years)};
 records=data.records.filter(journeyEligible);version=data.version;if(!records?.length)throw new Error('Empty collection');ready=true;
 const saved=new URLSearchParams(location.hash.slice(1));mode=['thread','moe'].includes(saved.get('mode'))?saved.get('mode'):'weave';if(mode==='thread'&&THEMES[saved.get('theme')]){themeKey=saved.get('theme');route=themeRoute(records,themeKey);restored=Boolean(route.length);versionChanged=saved.get('v')!==version;}else if(mode==='weave'&&saved.has('route')){const ids=saved.get('route').split(',');const restoredRoute=routeFromIds(records,ids);if(restoredRoute.length===ids.length){route=restoredRoute;restored=true;versionChanged=saved.get('v')!==version;}}
 map?.setStill(still);map?.intro(records);root.dataset.scene='intro';welcome();
}catch(error){console.error('Journey initialization failed',error);failed=true;welcome();}
