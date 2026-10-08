// Measure the current typesetting so each visual line shares one gentle fade.
// Keep natural wrapping, selectable text and the complete source in the DOM.
export function revealReadingLines(passage,duration){
 const words=passage.textContent.match(/\S+\s*/gu)||[];
 passage.replaceChildren(...words.map(text=>{
  const span=document.createElement('span');span.className='reading-word';span.textContent=text;return span;
 }));
 const lines=[];
 for(const word of passage.children){
  const top=word.offsetTop;
  let line=lines.at(-1);
  if(!line||Math.abs(line.top-top)>2){line={top,words:[]};lines.push(line);}
  line.words.push(word);
 }
 const revealEnd=Math.min(22000,duration*.35),fade=Math.min(1400,revealEnd/Math.max(1,lines.length));
 const animations=lines.flatMap((line,index)=>{
  // The opening line is there immediately. Later lines settle into place.
  const start=lines.length>1?index*(revealEnd-fade)/(lines.length-1):0;
  const frames=index===0?[{opacity:1},{opacity:1}]:[
   {opacity:0,offset:0},{opacity:0,offset:start/duration},
   {opacity:1,offset:(start+fade)/duration},{opacity:1,offset:1}
  ];
  return line.words.map(word=>word.animate(frames,{duration,easing:'linear',fill:'both'}));
 });
 return {
  revealEnd,
  play(){animations.forEach(a=>a.play());},
  pause(){animations.forEach(a=>a.pause());},
  cancel(){animations.forEach(a=>a.cancel());},
  get currentTime(){return animations[0]?.currentTime||0;},
  set currentTime(time){animations.forEach(a=>a.currentTime=time);},
  effect:{getTiming:()=>({duration}),updateTiming(timing){duration=timing.duration;animations.forEach(a=>a.effect.updateTiming(timing));}}
 };
}
