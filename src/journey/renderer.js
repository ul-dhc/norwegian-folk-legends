// Leaflet normally scales the previous SVG viewport throughout flyToBounds.
// Reproject on each camera move so earlier off-screen paths enter the viewport
// immediately, and thin strokes / small rings retain their screen dimensions.
export function journeyRenderer(L,pane){
 const JourneySVG=L.SVG.extend({
  getEvents(){return {...L.SVG.prototype.getEvents.call(this),move:this._reset};}
 });
 return new JourneySVG({pane,padding:.2});
}
