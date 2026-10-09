import {revealReadingLines} from './reading-reveal.js';
import {archiveMarkup,selectArchivePage,archivePages,archiveUrl} from './archive.js';
import moeRoads from './moe-roads.json';
import manuscript from '../assets/moe/manuscript-sin473.png?url';
import liv from '../assets/moe/liv-bratterud.jpg?url';
import childhood from '../assets/moe/childhood.jpg?url';
import samlaPortrait from '../assets/moe/samla-portrait.jpg?url';
import portrait from '../assets/moe/portrait.png?url';
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
let typingChars=[],typingIndex=0,typingDuration=0,typingNode=null,narrationDone=null,narrationCue=null;
const typingClock=new ReadingClock(typeNext);
// Keep the familiar reading-time range, but give typing a clearly perceptible range.
const typingScale=value=>value<=100?.5+(value-70)/60:1+(value-100)*.015;
function characterDelay(char){return /[.!?…]/u.test(char)?380:/[,;:]/u.test(char)?170:char===' '?45:32;}
function typeNext(){
 const node=typingNode;if(!node)return;
 node.textContent=typingChars.slice(0,++typingIndex).join('');
 if(narrationCue&&typingIndex>=narrationCue.at){const cue=narrationCue;narrationCue=null;cue.run();}
 if(typingIndex<typingChars.length){typingClock.reset(characterDelay(typingChars[typingIndex-1])*typingScale(readingTime));if(!paused&&!document.hidden)typingClock.resume();}
 else {node.classList.add('finished');narrationDone?.();}
}
const clock=new ReadingClock(()=>advanceAfterReveal());
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
 el('journey-reading-time-label').textContent=en?'Reading and typing pace':'Lese- og skrivehastighet';
 el('journey-reading-less').textContent=en?'Slower':'Langsommere';
 el('journey-reading-more').textContent=en?'Faster':'Raskere';
 const seconds=Math.round(passageDuration('word '.repeat(100))*readingTime/100000);
 const readingNote=mode==='moe'?(en?`Time follows passage length · about ${Math.round((100/145*60+3.5)*readingTime/100)} seconds per 100 words`:`Lesetiden følger tekstlengden · omtrent ${Math.round((100/145*60+3.5)*readingTime/100)} sekunder per 100 ord`):(en?`About ${seconds} seconds per 100 words`:`Omtrent ${seconds} sekunder per 100 ord`);
 el('journey-reading-time').value=270-readingTime;
 el('journey-reading-time').setAttribute('aria-valuetext',(en?'Typing speed and reading time · ':'Skrivehastighet og lesetid · ')+readingNote);
 el('journey-reading-time-note').textContent=(en?`Typing: ${(1/typingScale(readingTime)).toFixed(1)}× normal speed · changes immediately. `:`Skriving: ${(1/typingScale(readingTime)).toFixed(1)}× normal hastighet · endres med en gang. `)+readingNote;
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
 root.classList.toggle('paused',paused);root.classList.toggle('still-art',still);
 root.setAttribute('aria-label',language()==='en'?'Legend journey':'Sagnreise');
 el('journey-reading').setAttribute('aria-label',language()==='en'?'Legend':'Sagn');
 root.querySelector('.journey-controls').setAttribute('aria-label',language()==='en'?'Journey controls':'Reisekontroller');
}
function welcome(){
 const theme=currentTheme();

 el('journey-welcome').innerHTML=`<h1>${esc(mode==='moe'?'Moltke Moe':theme?t().thread:t().title)}</h1><p>${esc(mode==='moe'?moeIntro[language()]:theme?theme.intro[language()]:t().intro)}</p><div class="journey-modes" role="group" aria-label="${t().modeLabel}"><button data-mode="weave" aria-pressed="${mode==='weave'}">${t().weave}</button><button data-mode="thread" aria-pressed="${mode==='thread'}">${t().thread}</button><button data-mode="moe" aria-pressed="${mode==='moe'}">Moltke Moe</button></div>${mode==='moe'?'':`<p class="journey-mode-note">${mode==='weave'?t().weaveNote:t().threadNote}</p>`}${mode==='thread'?`<div class="journey-themes" role="group" aria-label="${language()==='en'?'Choose a theme':'Velg et tema'}">${Object.entries(THEMES).map(([key,theme])=>`<button type="button" data-theme-thread="${key}" aria-pressed="${themeKey===key}" style="--theme-colour:${theme.colour}"><span>${esc(theme[language()])}</span><small>${esc(theme.description[language()])}</small></button>`).join('')}</div>`:''}${ready?`<div class="journey-welcome-actions"><button type="button" class="journey-primary" data-begin="inline">${t().begin}</button></div>`:`<p role="status">${failed?t().failed:t().loading}</p>`}`;
 if(versionChanged)status(t().old);controls();
}
function capacity(text,title,encounter=false){
 // Measure the same type at the actual available width: never put a scrollbar
 // inside a legend, even after fullscreen, resizing or changing text size.
 const width=innerWidth>=900?Math.min(600,root.clientWidth*.45):Math.min(innerHeight<540?800:730,root.clientWidth-(innerWidth<700?44:64));
 const maxHeight=root.clientHeight-(innerHeight<540?180:innerWidth<700?245:235)-(encounter?(innerWidth<900?root.clientHeight*.27:42):0);
 const measure=document.createElement('div');measure.className='journey-passage';
 Object.assign(measure.style,{position:'absolute',visibility:'hidden',pointerEvents:'none',width:width+'px',height:'auto',maxHeight:'none',top:'0'});root.append(measure);
 const titleStyle=getComputedStyle(el('journey-title'));
 Object.assign(measure.style,{fontFamily:titleStyle.fontFamily,fontSize:titleStyle.fontSize,lineHeight:titleStyle.lineHeight,width:Math.max(1,width-60)+'px'});
 measure.textContent=title;
 const titleHeight=Math.min(measure.getBoundingClientRect().height,parseFloat(titleStyle.lineHeight)*(innerHeight<540?1:2));
 for(const property of ['font-family','font-size','line-height'])measure.style.removeProperty(property);
 measure.style.width=width+'px';
 const line=parseFloat(getComputedStyle(measure).lineHeight);
 const space=Math.max(line,maxHeight-titleHeight-(innerHeight<540?55:innerWidth<700?75:89)-(mode==='moe'?64:0));
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
 if(mode==='moe'){scenes=moeScenes(route,allRecords,r=>passages(textFor(r),capacity(textFor(r),heading(r),r.source_text_id==='SIN263')),{portrait,childhood,liv,manuscript});return;}
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
const readingDuration=s=>mode==='moe'?(s.effect==='encounter'?Math.max(10000,s.text.trim().split(/\s+/u).length/210*60000+2000):Math.max(12000,s.text.trim().split(/\s+/u).length/145*60000+3500)):passageDuration(s.text);
function schedule(ms,showProgress=false){
 ms=Math.max(ms,typingDuration?typingDuration+4500:0);clock.reset(ms);
 if(showProgress&&!matchMedia('(prefers-reduced-motion: reduce)').matches){progressAnimation=el('journey-time-fill').animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:ms,fill:'forwards'});if(paused)progressAnimation.pause();}
 if(!paused&&!document.hidden)clock.resume();
}
function narrate(node,text,onComplete=null){
 const animate=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 typingChars=Array.from(text);typingIndex=0;
 const hold=2400*readingTime/100;
 typingDuration=typingChars.reduce((sum,c)=>sum+characterDelay(c),0)*typingScale(readingTime)+250;
 node.innerHTML=`<span class="journey-sr-only">${esc(text)}</span><span class="journey-type-layout" aria-hidden="true"><span class="journey-type-space">${esc(text)}</span><span class="journey-typed${animate?'':' finished'}">${animate?'':esc(text)}</span></span>`;
 typingNode=node.querySelector('.journey-typed');
 // Advance from actual typing completion, including pauses and background tabs.
 narrationDone=()=>{onComplete?.();clock.reset((onComplete?3400:scene()?.j==='all'?700:2400)*readingTime/100);if(!paused&&!document.hidden)clock.resume();};
 if(animate){typingClock.reset(250);if(!paused&&!document.hidden)typingClock.resume();}
 else {clock.reset(text.trim().split(/\s+/u).length/180*60000*readingTime/100+hold);if(!paused&&!document.hidden)clock.resume();}
 return typingDuration+hold;
}
function caption(text,label=''){
 const node=el('journey-caption');
 typingChars=Array.from(text);typingIndex=0;
 const animate=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 typingDuration=animate?typingChars.reduce((sum,c)=>sum+characterDelay(c),0)*typingScale(readingTime):0;
 node.innerHTML=(label?`<small>${esc(label)}</small>`:'')+`<span class="journey-sr-only">${esc(text)}</span><span class="journey-type-layout" aria-hidden="true"><span class="journey-type-space">${esc(text)}</span><span class="journey-typed${animate?'':' finished'}">${animate?'':esc(text)}</span></span>`;node.hidden=false;
 if(animate){typingClock.reset(450);if(!paused&&!document.hidden)typingClock.resume();}
 typingNode=node.querySelector('.journey-typed');narrationDone=null;
 node.style.animation='none';void node.offsetWidth;node.style.animation='';
}
function bridge(i){
 const theme=currentTheme();
 return theme?creditedBridge(theme.stops[i][language()],route[i],language(),i):continuousBridge(route[i-1]||previousRecord,route[i],links[i],language(),bridgeChoices.get(completed+i)||0);
}
function summaryMarkup(){
 if(mode==='moe')return `<div class="journey-summary"><p>${language()==='en'?'Two legends · Liv Bratterud · Tølløv Krossvegjen · Moltke Moe':'To sagn · Liv Bratterud · Tølløv Krossvegjen · Moltke Moe'}</p><p>${language()==='en'?'Collected in Bø · Liv’s story leads to Heddal.':'Samlet i Bø · Livs fortelling fører til Heddal.'}</p></div>`;
 const summary=journeySummary(route,language());
 return `<div class="journey-summary"><p class="journey-summary-counts">${esc(summary.counts)}</p>${['places','collectors','narrators'].map(key=>`<p>${esc(summary[key])}</p>`).join('')}</div>`;
}
const lifePhotos=()=>[
 {image:childhood,crop:{viewBox:"465 550 265 255",width:1280,height:2167},label:language()==='en'?'Moltke as a boy · detail of the family portrait':'Moltke som gutt · utsnitt av familiebildet',credit:'C. T. Thorkildsen / Nasjonalbiblioteket · blds_06261'},
 {image:samlaPortrait,crop:{viewBox:"74 88 245 236",width:384,height:589},label:language()==='en'?'Moltke Moe · archival portrait':'Moltke Moe · arkivportrett',credit:'Norsk Folkeminnesamling · NFS Foto 50 / SAMLA'},
 {image:portrait,crop:{viewBox:"380 365 440 425",width:1200,height:1194},label:language()==='en'?'1911 · in his working room':'1911 · i arbeidsrommet',credit:'Maal og Minne / Wikimedia Commons'}
];
function showLifePhotos(art,duration){
 const stationary=still||matchMedia('(prefers-reduced-motion: reduce)').matches;
 art.classList.add('life-photos');art.classList.toggle('life-photos-still',stationary);
 art.innerHTML=lifePhotos().map(p=>`<figure>${p.crop?`<svg class="life-boy-detail" viewBox="${p.crop.viewBox}" role="img" aria-label="${esc(p.label)}"><image href="${esc(p.image)}" width="${p.crop.width}" height="${p.crop.height}"/></svg>`:`<img src="${esc(p.image)}" alt="${esc(p.label)}"/>`}<figcaption>${esc(p.label)}</figcaption></figure>`).join('');
 if(stationary)return null;
 const curves=[[[0,1],[.19,1],[.34,0],[1,0]],[[0,0],[.19,0],[.34,1],[.55,1],[.70,0],[1,0]],[[0,0],[.55,0],[.70,1],[.85,1],[1,0]]];
 const animations=[...art.children].map((figure,i)=>figure.animate(curves[i].map(([offset,opacity])=>({offset,opacity})),{duration,easing:'linear',fill:'both'}));
 // Only after the last portrait has settled does it disperse into the landscape.
 animations.push(art.lastElementChild.querySelector('img,svg').animate([{filter:'blur(0px)',transform:'scale(1)',offset:0},{filter:'blur(0px)',transform:'scale(1)',offset:.85},{filter:'blur(8px)',transform:'scale(1.045)',offset:1}],{duration,fill:'both'}));
 return {pause(){animations.forEach(a=>a.pause());},play(){animations.forEach(a=>a.play());},cancel(){animations.forEach(a=>a.cancel());}};
}
function dispersePhoto(photo,duration,from=.78,to=0,hold=.42){
 const state=opacity=>({opacity,filter:`blur(${(1-opacity/.78)*9}px)`,transform:`scale(${1+(1-opacity/.78)*.045})`});
 return photo.animate([
  {...state(from),offset:0},{...state(from),offset:hold},
  {...state(to),offset:1}
 ],{duration,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
}
let legendReveal=null,photoDissolve=null,lastPhotoPassage=-1;
let sceneFadeSerial=0,sceneFades=[],lastPaintedScene='';
const sceneSurfaces=()=>['journey-welcome','journey-reading','journey-caption','journey-ending','journey-moe-card','journey-moe-art','journey-archive'].map(el).filter(node=>!node.hidden);
function cancelSceneFades(){
 sceneFadeSerial++;sceneFades.forEach(animation=>animation.cancel());sceneFades=[];
 root.classList.remove('scene-changing');
}
async function showScene(preserveMap=false){
 const s=scene();if(!s)return;
 const key=[s.kind,s.j,s.i,s.p].join(':');
 const animate=mode==='moe'&&!still&&!preserveMap&&key!==lastPaintedScene;
 cancelSceneFades();const serial=sceneFadeSerial;
 root.classList.toggle('moe-ambient',mode==='moe');
 if(!animate){renderScene(preserveMap);lastPaintedScene=key;return;}
 clock.stop();typingClock.stop();progressAnimation?.cancel();sceneToken++;
 root.classList.add('scene-changing');
 const keepPhoto=((s.j==='liv'||s.effect==='encounter')&&el('journey-moe-art').dataset.encounter==='liv')||(s.j==='manuscript'&&el('journey-moe-art').classList.contains('manuscript-preview'));
 const network=root.querySelector('.leaflet-journeyNetwork-pane');
 const keepNetwork=keepPhoto||['all','network','collector'].includes(s.j);
 const surfaces=()=>[...sceneSurfaces().filter(node=>!(keepPhoto&&node.id==='journey-moe-art')),...(!keepNetwork&&network?[network]:[])];
 const fade=(node,from,to,duration,delay=0)=>{
  const animation=node.animate([{opacity:from},{opacity:to}],{duration,delay,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'});
  sceneFades.push(animation);return animation;
 };
 const outgoing=surfaces().map(node=>fade(node,Number(getComputedStyle(node).opacity),0,node.id==='journey-moe-art'?650:450));
 await Promise.all(outgoing.map(animation=>animation.finished.catch(()=>{})));
 if(serial!==sceneFadeSerial||!started)return;
 renderScene(preserveMap);lastPaintedScene=key;
 outgoing.forEach(animation=>animation.cancel());sceneFades=[];
 const incoming=surfaces().map(node=>fade(node,0,1,node.id==='journey-moe-art'?1200:900,100));
 // Reading time begins after the dissolve, so slower transitions cost no reading time.
 clock.pause();typingClock.pause();progressAnimation?.pause();legendReveal?.pause();photoDissolve?.pause();
 await Promise.all(incoming.map(animation=>animation.finished.catch(()=>{})));
 if(serial!==sceneFadeSerial||!started)return;
 incoming.forEach(animation=>animation.cancel());sceneFades=[];root.classList.remove('scene-changing');
 if(!paused&&!document.hidden){clock.resume();typingClock.resume();progressAnimation?.play();legendReveal?.play();photoDissolve?.play();}
}
function renderScene(preserveMap=false){
 const continuingIntroduction=scene()?.kind==='introduction'&&root.dataset.scene==='introduction';
 legendReveal?.cancel();legendReveal=null;el('journey-text-window').style.height='';root.classList.remove('legend-revealing');
 clock.stop();typingClock.stop();typingDuration=0;typingNode=null;narrationDone=null;narrationCue=null;if(!preserveMap&&!continuingIntroduction){map?.cancel();if(!(mode==='moe'&&['all','network','collector'].includes(scene()?.j)))map?.clearConstellation();}progressAnimation?.cancel();progressAnimation=null;
 const token=++sceneToken,s=scene();if(!s)return;
 const r=route[s.i];const livReading=s.kind==='read'&&s.effect==='encounter',keepPhoto=livReading||s.j==='liv',photoRetained=keepPhoto&&el('journey-moe-art').dataset.encounter==='liv';root.classList.toggle('liv-reading',livReading);root.classList.toggle('archive-open',s.j==='archive');root.dataset.scene=s.kind;el('journey-route-note').textContent='';root.style.setProperty('--collector-colour',collectorColour(r));
 for(const id of ['journey-welcome','journey-reading','journey-caption','journey-ending','journey-moe-card','journey-moe-art','journey-archive']){if(id==='journey-moe-art'&&photoRetained)continue;el(id).hidden=true;}


 if(!livReading){photoDissolve?.cancel();photoDissolve=null;lastPhotoPassage=-1;}
 if(!keepPhoto)delete el('journey-moe-art').dataset.encounter;
 el('journey-photo-place').hidden=true;
 el('journey-photo-place').textContent=s.image?(s.target?.sted||r?.sted||''):'';
 status('');controls();
 if(s.kind==='moe'){
  const en=language()==='en',card=el('journey-moe-card');


  el('journey-source').hidden=true;
  if(!preserveMap){
   if(s.j==='all'){map?.intro(allRecords,true,false,true);if(paused)map?.pause();}
   else if(s.j==='roads'){map?.roadNetwork(moeRoads,paused);if(paused)map?.pause();}
   else if(s.j==='landscape')map?.storyLandscape(route[0],s.target);
   else if(s.j==='network'){map?.isolateCollector(allRecords,'collector-moltke-moe');if(paused)map?.pause();}
   else if(s.j==='return'||s.j==='archive')map?.connections(allRecords.filter(r=>r.collectorId==='collector-moltke-moe'),'collector','#D2B957',true);
   else if(s.target&&!photoRetained)map?.focus(s.target,Boolean(s.image));
  }
  const art=el('journey-moe-art');
  if(s.j==='liv')art.dataset.encounter='liv';else delete art.dataset.encounter;
  art.className='journey-moe-art '+(s.effect||'photograph');
  art.innerHTML=s.image?`<img class="moe-original" src="${esc(s.image)}" alt=""/>${s.figures?`<img class="moe-figures" src="${esc(s.figures)}" alt=""/>`:''}`:'';
  if(s.effect==='manuscript')art.innerHTML=`<div class="manuscript-focus-page"><img class="moe-original" src="${esc(s.image)}" alt=""/><div class="manuscript-upper-wash" aria-hidden="true"></div></div>`;
  art.hidden=!s.image;
  card.classList.toggle('has-image',Boolean(s.image));
  const count=allRecords.filter(r=>r.collectorId==='collector-moltke-moe').length;
  card.innerHTML=`<span class="moe-chapter">${esc(s.chapter?(typeof s.chapter==='string'?s.chapter:s.chapter[language()]):(en?'FROM A VOICE TO AN ARCHIVE':'FRA EN STEMME TIL ET ARKIV'))}</span>${s.j==='network'?`<strong class="moe-count">${count}<small>${en?'records shown here · part of a much larger collection':'opptegnelser vist her · del av en langt større samling'}</small></strong>`:''}<p>${esc(s.text[language()])}</p>${s.image?`<button class="moe-inspect" data-inspect-original>${s.effect==='manuscript'||s.effect==='archive'?(en?'View manuscript':'Se manuskriptet'):(en?'View photograph':'Se fotografiet')}</button>`:''}${s.manuscript?`<a class="moe-manuscript" href="${esc(s.manuscript)}" target="_blank" rel="noopener">${en?'Open the notebook in SAMLA':'Åpne notatboken i SAMLA'}</a>`:''}${s.explore?`<div class="moe-archive-choices"><a href="${esc(moeSources.find(([name])=>name.startsWith('Liv Bratterud ·'))[1])}" target="_blank" rel="noopener">${en?'Find Liv in SAMLA':'Finn Liv i SAMLA'}</a><a href="${esc(moeSources.find(([name])=>name.startsWith('Therese Foldvik'))[1])}" target="_blank" rel="noopener">${en?'Discover Moltke’s working life':'Oppdag Moltkes arbeidsliv'}</a></div>`:''}${s.j==='return'?`<a class="moe-manuscript" href="${esc(moeSources.find(([name])=>name.startsWith('Therese Foldvik'))[1])}" target="_blank" rel="noopener">${en?'Read more on SAMLA':'Les mer på SAMLA'}</a>`:''}${s.credit?`<small class="moe-credit">${esc(s.credit)}</small>`:''}`;card.hidden=false;
  if(s.j==='archive'){
   art.hidden=true;card.hidden=true;
   const archive=el('journey-archive');archive.innerHTML=archiveMarkup(language(),moeSources,allRecords);archive.hidden=false;
  }
  if(!s.explore){
   const childhoodFade=s.j==='childhood'&&!still&&!matchMedia('(prefers-reduced-motion: reduce)').matches?()=>{
    photoDissolve=dispersePhoto(art.querySelector('.moe-original'),3200*readingTime/100,.78,0,0);
   }:null;
   const duration=narrate(card.querySelector('p'),s.text[language()],childhoodFade);
   if(s.j==='all')map?.timeOpeningReveal(typingDuration*.95);
   if(s.j==='roads'){
    const at=s.text[language()].indexOf(en?'Our first stop':'Første stopp');
    const run=()=>map?.highlightPlace(route[0]);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)run();else narrationCue={at:Math.max(1,at),run};
   }
   art.style.setProperty('--narration-duration',duration+'ms');
   if(s.j==='collector'){
    photoDissolve=showLifePhotos(art,duration-1500);
    el('journey-moe-card').querySelector('[data-inspect-original]').textContent=en?'View photographs':'Se fotografiene';
    if(paused||document.hidden)photoDissolve?.pause();
   }else if(s.j!=='childhood'&&s.effect==='whole-photo'&&!still&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    photoDissolve=dispersePhoto(art.querySelector('.moe-original'),duration-1500);
    if(paused||document.hidden)photoDissolve.pause();
   }
  }
 }else if(s.kind==='theme-opening'){
  const theme=currentTheme();
  el('journey-source').hidden=true;el('journey-progress').textContent='';
  if(!preserveMap)map?.connections(records.filter(r=>r.ml_code===theme.code),'theme',theme.colour);
  caption(theme.intro[language()]);schedule(14000);
 }else if(s.kind==='introduction'){
  if(!preserveMap&&!continuingIntroduction)map?.intro(records);
  el('journey-source').hidden=true;el('journey-progress').textContent='';
  caption(s.text);schedule(10000);
 }else if(s.kind==='travel'||s.kind==='story-travel'){
  const isStory=s.kind==='story-travel',target=isStory?s.place:r;
  if(isStory){}
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
  if(!preserveMap)map?.focus(r,Boolean(s.image));
  // A brief, wordless arrival gives the landscape room before the legend.
  schedule(2200);
 }else if(s.kind==='read'){
  el('journey-reading').hidden=false;
  if(mode!=='moe'&&!livReading&&!matchMedia('(prefers-reduced-motion: reduce)').matches)el('journey-passage').animate([{opacity:0},{opacity:1}],{duration:1400});
  const teller=r.source_text_id==='SIN263'?'Liv':'Tølløv';
  el('journey-title').textContent=mode==='moe'?(language()==='en'?(s.p?`${teller} continues…`:`And so, ${teller} tells Moltke…`):(s.p?`${teller} fortsetter …`:`Så forteller ${teller} Moltke …`)):heading(r);el('journey-title').title=heading(r);
  el('journey-page').textContent=s.total>1?format(t().part,{n:s.p+1,total:s.total}):'';
  el('journey-passage').classList.remove('liv-voice');
  el('journey-passage').classList.toggle('voice-readable',paused);
  el('journey-reading-original').hidden=!livReading;
  if(livReading){
   const art=el('journey-moe-art');
   // Keep the original photograph in place from the introduction through Liv’s passages.
   if(art.dataset.encounter!=='liv'){
    art.className='journey-moe-art liv-photo';
    art.innerHTML=`<img class="moe-original" src="${esc(s.image)}" alt=""/>`;
    art.dataset.encounter='liv';
   }
   art.hidden=false;if(!preserveMap&&!photoRetained)map?.focus(r,true);
   el('journey-reading-original').textContent=language()==='en'?'View photograph · 1878':'Se fotografiet · 1878';
  }
  if(s.effect==='manuscript-preview'){
   if(!preserveMap)map?.focus(r,true);
   const art=el('journey-moe-art');art.className='journey-moe-art manuscript-preview';art.innerHTML=`<img src="${esc(s.image)}" alt=""/>`;art.hidden=false;
  }
  el('journey-passage').textContent=s.text;
  const english=language()==='en'&&!original&&Boolean(r.english_translation?.trim());
  el('journey-passage').lang=english?'en':'no';
  el('journey-byline').classList.add('collector-key');el('journey-byline').textContent=[known(r.informant)?format(t().narrator,{name:r.informant}):'',known(r.samler)?format(t().collected,{name:r.samler}):'',r.år_clean,english?t().english:t().original].filter(Boolean).join(' · ');
  const duration=readingDuration(s)*readingTime/100;let enteredAt=0;
  if(mode==='moe'&&!still&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   root.classList.add('legend-revealing');
   legendReveal=revealReadingLines(el('journey-passage'),duration-5000);
   // Manual navigation while paused gives the reader the complete passage.
   if(paused)legendReveal.currentTime=legendReveal.revealEnd;
   if(paused||document.hidden)legendReveal.pause();
  }
  if(livReading){
   const art=el('journey-moe-art'),photo=art.querySelector('.moe-original');
   let figures=art.querySelector('.liv-figures');
   if(!figures){figures=document.createElement('div');figures.className='liv-figures';const silhouette=document.createElement('img');silhouette.src=s.image;silhouette.alt='';silhouette.className='liv-mask';figures.append(silhouette);art.append(figures);}
   const continuing=photoDissolve&&s.p>=lastPhotoPassage;
   const backgroundFrom=continuing?Number(getComputedStyle(photo).opacity):(s.p?0:.78);
   const figuresFrom=continuing?Number(getComputedStyle(figures).opacity):(s.p?.78:0);
   const closeTransform=innerWidth>=900?'translate(12%, -6%) scale(1.3)':'translate(0, -3%) scale(1.16)';
   const transformFrom=continuing?getComputedStyle(figures).transform:(s.p?closeTransform:'scale(1)');
   photoDissolve?.cancel();photoDissolve=null;lastPhotoPassage=s.p;
   if(!still&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const revealDuration=duration-1000,settle=backgroundFrom>.05?Math.min(.45,8000/revealDuration):0;
    const farewell=s.p===s.total-1,fadeStart=Math.max(settle+.15,1-6000/revealDuration);
    const glow='drop-shadow(0 0 2px #f2d99b99) drop-shadow(0 0 6px #d2b95744) blur(0px)';
    const landscapeZoom=map?.encounterZoom(r,revealDuration,0);
    const animations=[
     figures.animate([{filter:'blur(0px)',offset:0},{filter:'blur(0px)',offset:settle},{filter:glow,offset:Math.min(fadeStart,settle+.15)},{filter:glow,offset:fadeStart},{filter:farewell?'drop-shadow(0 0 2px transparent) drop-shadow(0 0 6px transparent) blur(9px)':glow,offset:1}],{duration:revealDuration,fill:'both'}),
     photo.animate([{opacity:backgroundFrom},{opacity:0,offset:settle},{opacity:0}],{duration:revealDuration,fill:'both'}),
     figures.animate([{opacity:figuresFrom},{opacity:.78,offset:settle},{opacity:.78,offset:fadeStart},{opacity:farewell?0:.78,offset:1}],{duration:revealDuration,fill:'both'}),
     ...[photo,figures].map(image=>image.animate([{transform:transformFrom,offset:0},{transform:closeTransform,offset:1}],{duration:revealDuration,easing:'cubic-bezier(.25,.35,.55,1)',fill:'both'})),
     ...(landscapeZoom?[landscapeZoom]:[])
    ];
    photoDissolve={
     pause(){animations.forEach(a=>a.pause());},play(){animations.forEach(a=>a.play());},cancel(){animations.forEach(a=>a.cancel());},
     get currentTime(){return animations[0].currentTime;},set currentTime(value){animations.forEach(a=>a.currentTime=value);},
     effect:{getTiming:()=>animations[0].effect.getTiming(),updateTiming(timing){animations.forEach(a=>a.effect.updateTiming(timing));}}
    };
    if(paused||document.hidden)photoDissolve.pause();
   }
  }
  schedule(duration-enteredAt,true);
 }else if(s.kind==='insight'){
  caption(s.insight[language()]);schedule(14000);
 }else if(s.kind==='long'){
  caption(t().longText);schedule(14000);
 }else if(s.kind==='collector'||s.kind==='narrator'){
  const narrator=s.kind==='narrator',key=narrator?'narratorId':'collectorId',id=r[key];
  const members=records.filter(x=>x[key]===id);
  if(!preserveMap)map?.connections(members,s.kind,collectorColour(r));



  caption(format(narrator?t().narratorNetwork:t().collector,{name:narrator?r.informant:r.samler,count:members.length})+(networkEdges(members).nodes.length===1?' '+t().onePlace:''));schedule(14000);
 }else if(s.kind==='weave'){

  if(!preserveMap)map?.overview(route);caption('');schedule(7000);
 }else if(s.kind==='story-hold'){

  caption('“'+s.place.quote+'”',format(t().storyHold,{from:r.sted,place:s.place.name}));
  schedule(passageDuration(s.place.quote)*readingTime/100);
 }else{

  el('journey-ending').hidden=false;
  el('journey-ending').classList.toggle('ending-actions-only',mode==='moe');
  el('journey-ending').innerHTML=`<h2>${mode==='moe'?(language()==='en'?'The voices remain':'Stemmene blir igjen'):currentTheme()?esc(currentTheme()[language()]):t().end}</h2><p>${mode==='moe'?(language()==='en'?'A photograph preserves an encounter. A notebook preserves words. Continue exploring their traces in SAMLA.':'Et fotografi bevarer et møte. En notatbok bevarer ord. Utforsk sporene videre i SAMLA.'):currentTheme()?esc(currentTheme().ending[language()]):t().endText}</p>${summaryMarkup()}<div class="journey-welcome-actions"><button type="button" class="journey-primary" data-again>${mode==='moe'?(language()==='en'?'Replay this journey':'Spill reisen på nytt'):currentTheme()?(language()==='en'?'Replay this theme':'Spill temaet på nytt'):t().again}</button>${currentTheme()||mode==='moe'?`<button type="button" data-choose-theme>${language()==='en'?'Choose another journey':'Velg en annen reise'}</button>`:''}<button type="button" data-share>${t().share}</button></div><p class="journey-ending-note">${mode==='moe'?(language()==='en'?'A pilot connecting the legend dataset, SAMLA and museum collections.':'En pilot som knytter sammen sagndatasettet, SAMLA og museumssamlinger.'):t().method}</p>`;
  if(mode==='moe')el('journey-ending').innerHTML=`<div class="journey-welcome-actions"><button type="button" class="journey-primary" data-again>${language()==='en'?'Replay':'Spill på nytt'}</button><button type="button" data-choose-theme>${language()==='en'?'New story':'Ny fortelling'}</button><button type="button" data-share>${language()==='en'?'Share':'Del'}</button></div>`;
  if(!preserveMap){if(mode==='moe')map?.closingNetwork(allRecords);else map?.overview(route,true);}root.classList.remove('controls-resting');
 }
 revealControls();
}
async function advanceAfterReveal(){
 const pending=mode==='moe'&&scene()?.j==='return'?map?.networkRevealAnimations():[];
 if(pending?.length){
  const token=sceneToken;
  // Fast narration must not cut off distant endpoints. CSS animation completion
  // also respects pauses, reduced motion and switching to a still map.
  await Promise.all(pending.map(animation=>animation.finished.catch(()=>{})));
  if(token!==sceneToken||!started)return;
  clock.reset(1000);
  if(!paused&&!document.hidden)clock.resume();
  return;
 }
 advance();
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
function pause(){if(!started||scene()?.kind==='end')return;paused=true;el('journey-passage').classList.add('voice-readable');clock.pause();typingClock.pause();map?.pause();progressAnimation?.pause();legendReveal?.pause();photoDissolve?.pause();controls();revealControls();}
function resume(){paused=false;clock.resume();typingClock.resume();map?.resume();progressAnimation?.play();legendReveal?.play();photoDissolve?.play();controls();revealControls();}
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
 if(active==='read'){showScene(true);map?.focus(record(),Boolean(scene()?.image));if(paused)map?.pause();}
 else if(active==='moe'||active==='end')showScene(true);
}
root.addEventListener('click',async event=>{
 if(event.target.closest('a'))pause();
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.mapType){selectedMap=button.dataset.mapType;map?.setMapType(selectedMap);try{localStorage.setItem('journey-map-type-v3',selectedMap);}catch{}mapSettings();}
 else if(button.dataset.themeThread){themeKey=button.dataset.themeThread;route=[];restored=false;welcome();}
 else if(button.dataset.mode){mode=button.dataset.mode;route=[];restored=false;welcome();}
 else if(button.hasAttribute('data-archive-page')){
  const archive=el('journey-archive');selectArchivePage(archive,Number(button.dataset.archivePage),language());
 }
 else if(button.hasAttribute('data-archive-enlarge')){
  pause();const page=archivePages[Number(el('journey-archive').dataset.selectedPage)];
  el('journey-info-title').textContent=(language()==='en'?'Manuscript page ':'Manuskriptside ')+page.page;
  el('journey-info-content').innerHTML=`<img class="moe-inspected" src="${page.image}" alt="NFS Moltke Moe 7, ${page.page}"/><p>NFS Moltke Moe 7 · ${language()==='en'?'Digitized image provided by':'Digitalisert bilde fra'} SAMLA</p><a href="${archiveUrl(page.scan)}" target="_blank" rel="noopener">${language()==='en'?'Open this page in SAMLA':'Åpne denne siden i SAMLA'}</a>`;el('journey-info').showModal();
 }
 else if(button.hasAttribute('data-inspect-original')){
  pause();const s=scene();
  if(s.j==='collector'){
   el('journey-info-title').textContent=language()==='en'?'Moltke through the years':'Moltke gjennom årene';
   el('journey-info-content').innerHTML=lifePhotos().map(p=>`<figure><img class="moe-inspected" src="${esc(p.image)}" alt="${esc(p.label)}"/><figcaption>${esc(p.label)} · ${esc(p.credit)}</figcaption></figure>`).join('');
   el('journey-info').showModal();return;
  }
  el('journey-info-title').textContent=s.effect==='manuscript'||s.effect==='archive'?(language()==='en'?'Manuscript':'Manuskript'):(language()==='en'?'Photograph':'Fotografi');
  el('journey-info-content').innerHTML=`<img class="moe-inspected" src="${esc(s.image)}" alt="${esc(s.credit)}"/><p>${esc(s.credit)}</p>${s.effect==='encounter'?`<p>${language()==='en'?'The photograph is shown intact. Its date, 1878, is earlier than the legend record shown in this journey.':'Fotografiet vises i sin helhet. Det er fra 1878, før sagnopptegnelsen som vises i reisen.'}</p>`:''}`;el('journey-info').showModal();
 }
 else if(button.dataset.begin)start();
 else if(button.hasAttribute('data-again'))start(true);
 else if(button.hasAttribute('data-choose-theme'))el('journey-close').click();
 else if(button.hasAttribute('data-share')){syncUrl();try{await navigator.clipboard.writeText(location.href);status(t().copied);}catch{status(t().copyFailed);}}
});
el('journey-info-toggle').addEventListener('click',()=>{
 pause();const en=language()==='en';
 el('journey-info-title').textContent=en?'Sources & photographs':'Kilder og fotografier';
 el('journey-info-content').innerHTML=`<p>${en?'This pilot follows relationships in the dataset, not a reconstructed itinerary. Biographical map points are approximate town or district locations. Source texts are preserved; where no English translation is available, the Norwegian text is shown.':'Piloten følger forbindelser i datasettet, ikke en rekonstruert reiserute. Biografiske kartpunkter er omtrentlige by- eller områdesteder. Kildetekstene er bevart; der engelsk oversettelse mangler, vises norsk tekst.'}</p><p>${en?'The road sequence uses present-day OpenStreetMap geometry via OSRM between nearby catalogue locations. It is a visual network, not an itinerary. Where no road route is available, places are shown as points only. Regional catalogue points are approximate.':'Veisekvensen bruker dagens OpenStreetMap-geometri via OSRM mellom nærliggende katalogsteder. Nettverket er ikke en reiserute. Der ingen veirute er tilgjengelig, vises stedene bare som punkter. Regionale katalogpunkter er omtrentlige.'} <a href="https://project-osrm.org/" target="_blank" rel="noopener">OSRM</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a></p><h3>Moltke Moe</h3><ul>${moeSources.map(([name,url])=>`<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a></li>`).join('')}</ul><h3>${en?'Featured legends':'Utvalgte sagn'}</h3><ul>${moeRoute(allRecords).map(r=>`<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.source_text_id)} · ${esc(r.informant)} · ${esc(r.archiveSignature)}</a>${r.sourceUrl?` · <a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">${en?'Original catalogue':'Originalkatalog'}</a>`:''}</li>`).join('')}</ul>`;
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
el('journey-close').addEventListener('click',async()=>{cancelSceneFades();legendReveal?.cancel();legendReveal=null;photoDissolve?.cancel();photoDissolve=null;lastPhotoPassage=-1;lastPaintedScene='';clock.stop();typingClock.stop();typingDuration=0;map?.cancel();progressAnimation?.cancel();audio.pause();started=false;paused=false;sceneIndex=-1;sceneToken++;clearTimeout(restTimer);root.classList.remove('controls-resting','is-fullscreen','liv-reading','archive-open');document.body.classList.remove('journey-active','journey-fullscreen');if(document.fullscreenElement)await document.exitFullscreen();for(const id of ['journey-reading','journey-caption','journey-ending','journey-moe-card','journey-moe-art','journey-archive','journey-photo-place'])el(id).hidden=true;el('journey-welcome').hidden=false;map?.reset();map?.intro(records,mode==='moe');root.dataset.scene='intro';welcome();root.scrollIntoView({behavior:'instant',block:'start'});});
el('journey-reading-time').addEventListener('input',event=>{
 const previous=readingTime;
 readingTime=270-Number(event.target.value);
 try{localStorage.setItem('journey-reading-time',String(readingTime));}catch{}
 const ratio=readingTime/previous,typingRatio=typingScale(readingTime)/typingScale(previous);
 if(typingNode&&typingIndex<typingChars.length){
  typingClock.pause();typingClock.reset(typingClock.remaining*typingRatio);
  typingDuration*=typingRatio;
  if(scene()?.j==='all')map?.timeOpeningReveal(typingDuration*.95,true);
  if(!paused&&!document.hidden)typingClock.resume();
 }
 if(scene()?.kind!=='read'){
  clock.pause();clock.reset(clock.remaining*ratio);
  if(!paused&&!document.hidden)clock.resume();
  if(['travel','story-travel'].includes(scene()?.kind)){
   const remainingTyping=typingChars.slice(typingIndex).reduce((sum,c)=>sum+characterDelay(c),0)*typingScale(readingTime);
   map?.refreshTravel(remainingTyping+2500,()=>advance());
  }
 }
 if(scene()?.kind==='read'){
  // Preserve how far the reader has progressed; don't restart the legend or camera.
  clock.pause();
  const remaining=clock.remaining*readingTime/previous;
  const duration=readingDuration(scene())*readingTime/100;
  if(legendReveal){const timing=legendReveal.effect.getTiming(),fraction=Number(legendReveal.currentTime||0)/timing.duration;legendReveal.effect.updateTiming({duration:duration-5000});legendReveal.currentTime=fraction*(duration-5000);}
  if(photoDissolve){const timing=photoDissolve.effect.getTiming(),fraction=Number(photoDissolve.currentTime||0)/timing.duration;photoDissolve.effect.updateTiming({duration:timing.duration*readingTime/previous});photoDissolve.currentTime=fraction*timing.duration*readingTime/previous;}
  clock.reset(remaining);
  if(progressAnimation){progressAnimation.effect.updateTiming({duration});progressAnimation.currentTime=Math.max(0,duration-remaining);}
  if(!paused&&!document.hidden)clock.resume();
 }
 mapSettings();revealControls();
});
el('journey-motion').addEventListener('click',()=>{still=!still;map?.setStill(still);if(scene()?.kind==='read'||scene()?.kind==='moe')showScene(true);controls();revealControls();});
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
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{if(event.matches){still=true;map?.setStill(true);if(scene()?.kind==='read'||scene()?.kind==='moe')showScene(true);}controls();});
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
 map?.setStill(still);map?.intro(records,mode==='moe');root.dataset.scene='intro';welcome();
}catch(error){console.error('Journey initialization failed',error);failed=true;welcome();}
