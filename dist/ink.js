/**
 * Vector-backed ink input. All recognition and drawing stay on this device.
 * Original kana/kanji center-line templates, not a general OCR model.
 */

const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const clamp = (v,min,max) => Math.min(max,Math.max(min,v));
const finite = (v,fallback=0) => Number.isFinite(Number(v)) ? Number(v) : fallback;

export class InkBoard {
  constructor(canvas, options = {}) {
    if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('A canvas is required.');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {alpha:true,desynchronized:true});
    this.base = document.createElement('canvas');
    this.baseCtx = this.base.getContext('2d', {alpha:true});
    this.color = options.color || '#f4f2df';
    this.width = clamp(finite(options.width,3),0.5,60);
    this.tool = options.tool || 'pen';
    this.background = options.background || null;
    this.onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
    this.enabled = true;
    this.strokes = [];
    this.history = [];
    this.future = [];
    this.active = null;
    this.frame = 0;
    this.world = null;
    this.lastPen = -Infinity;
    this.destroyed = false;
    this.originalStyle = {touchAction:canvas.style.touchAction,userSelect:canvas.style.userSelect,cursor:canvas.style.cursor};
    canvas.style.touchAction = 'none';
    canvas.style.userSelect = 'none';
    canvas.style.cursor = 'crosshair';
    this.listeners = [];
    this.listen(canvas,'pointerdown',event=>this.down(event),{passive:false});
    this.listen(canvas,('onpointerrawupdate' in window ? 'pointerrawupdate':'pointermove'),event=>this.move(event),{passive:false});
    this.listen(canvas,'pointerup',event=>this.up(event),{passive:false});
    this.listen(canvas,'pointercancel',event=>this.cancel(event),{passive:false});
    this.listen(canvas,'lostpointercapture',event=>this.cancel(event),{passive:false});
    this.listen(canvas,'contextmenu',event=>event.preventDefault());
    this.listen(canvas,'dragstart',event=>event.preventDefault());
    this.listen(window,'resize',()=>this.resize());
    this.observer = typeof ResizeObserver === 'function' ? new ResizeObserver(()=>this.resize()):null;
    this.observer?.observe(canvas);
    this.resize();
  }
  listen(target,type,fn,options) { target.addEventListener(type,fn,options);this.listeners.push([target,type,fn,options]); }
  resize() {
    if(this.destroyed) return;
    const rect=this.canvas.getBoundingClientRect();
    if(rect.width<1 || rect.height<1) return;
    this.cssWidth=rect.width;this.cssHeight=rect.height;
    this.dpr=clamp(window.devicePixelRatio||1,1,4);
    if(!this.world) this.world={width:rect.width,height:rect.height};
    this.scale=Math.min(rect.width/this.world.width,rect.height/this.world.height);
    this.offsetX=(rect.width-this.world.width*this.scale)/2;
    this.offsetY=(rect.height-this.world.height*this.scale)/2;
    const width=Math.max(1,Math.round(rect.width*this.dpr)),height=Math.max(1,Math.round(rect.height*this.dpr));
    if(this.canvas.width!==width || this.canvas.height!==height) {this.canvas.width=width;this.canvas.height=height;this.base.width=width;this.base.height=height;}
    this.renderBase();this.render();
  }
  position(event) {
    const rect=this.canvas.getBoundingClientRect();
    // Subpixel precision without persisting long floating-point tails for every sample.
    const pointPrecision=value=>Math.round(value*1000)/1000;
    return {x:pointPrecision((event.clientX-rect.left-this.offsetX)/this.scale),y:pointPrecision((event.clientY-rect.top-this.offsetY)/this.scale),
      pressure:event.pointerType==='pen' ? Math.round(clamp(finite(event.pressure,0.5)||0.15,0.05,1)*1000)/1000:0.55,t:Math.round(finite(event.timeStamp,performance.now()))};
  }
  down(event) {
    if(!this.enabled || event.button>0) return;
    if(event.pointerType==='touch' && performance.now()-this.lastPen<850) return;
    if(this.active) {
      if(event.pointerType!=='pen' || this.active.pointerType==='pen') return;
      this.active=null;this.render();
    }
    event.preventDefault();
    if(event.pointerType==='pen') this.lastPen=performance.now();
    this.canvas.setPointerCapture?.(event.pointerId);
    const point=this.position(event);
    this.active={pointerId:event.pointerId,pointerType:event.pointerType,tool:this.tool,color:this.color,width:this.width/this.scale,viewport:clone(this.world),points:[point]};
    this.render();
  }
  move(event) {
    if(!this.active || event.pointerId!==this.active.pointerId) return;
    event.preventDefault();
    if(event.pointerType==='pen') this.lastPen=performance.now();
    const events=typeof event.getCoalescedEvents==='function' ? event.getCoalescedEvents():[];
    for(const sample of (events.length ? events:[event])) {
      const point=this.position(sample),last=this.active.points.at(-1);
      if(Math.hypot(point.x-last.x,point.y-last.y)<0.08/this.scale) continue;
      if(this.active.tool==='line') this.active.points=[this.active.points[0],point];
      else this.active.points.push(point);
    }
    this.schedule();
  }
  up(event) {
    if(!this.active || event.pointerId!==this.active.pointerId) return;
    event.preventDefault();
    this.move(event);
    const {pointerId,pointerType,...stroke}=this.active;
    this.active=null;
    this.strokes.push(stroke);this.history.push({type:'add',stroke});this.future=[];
    try {if(this.canvas.hasPointerCapture?.(pointerId)) this.canvas.releasePointerCapture(pointerId);}catch{}
    this.drawStroke(this.baseCtx,stroke);this.render();this.changed();
  }
  cancel(event) {
    if(!this.active || (event && event.pointerId!==this.active.pointerId)) return;
    // A cancelled touch/pen gesture is discarded instead of creating a stray line.
    this.active=null;this.render();
  }
  schedule() { if(!this.frame) this.frame=requestAnimationFrame(()=>{this.frame=0;this.render();}); }
  transform(ctx) {ctx.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,this.offsetX*this.dpr,this.offsetY*this.dpr);}
  drawStroke(ctx,stroke) {
    if(!stroke.points?.length) return;
    ctx.save();this.transform(ctx);
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.globalCompositeOperation=stroke.tool==='eraser' ? 'destination-out':'source-over';
    ctx.strokeStyle=stroke.color;ctx.fillStyle=stroke.color;
    const marker=stroke.tool==='highlighter';
    const points=stroke.points;
    const width=stroke.tool==='eraser'?stroke.width*5:marker?stroke.width*5:stroke.width;
    ctx.globalAlpha=marker?0.28:1;
    if(marker || stroke.tool==='line') {
      ctx.beginPath();ctx.lineWidth=width;ctx.moveTo(points[0].x,points[0].y);
      for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
      if(points.length===1)ctx.lineTo(points[0].x+0.01,points[0].y);
      ctx.stroke();
    } else if(points.length===1) {
      ctx.beginPath();ctx.arc(points[0].x,points[0].y,width*(0.4+points[0].pressure*0.6)/2,0,Math.PI*2);ctx.fill();
    } else {
      for(let i=1;i<points.length;i++) {
        const a=points[i-1],b=points[i];
        ctx.lineWidth=width*(0.4+((a.pressure+b.pressure)/2)*0.6);
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      }
    }
    ctx.restore();
  }
  renderBase() {
    this.baseCtx.setTransform(1,0,0,1,0,0);this.baseCtx.clearRect(0,0,this.base.width,this.base.height);
    for(const stroke of this.strokes) this.drawStroke(this.baseCtx,stroke);
  }
  render() {
    if(this.destroyed) return;
    this.ctx.setTransform(1,0,0,1,0,0);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    this.ctx.drawImage(this.base,0,0);
    if(this.active) this.drawStroke(this.ctx,this.active);
  }
  changed() {this.onChange(this.getStrokes(),this);}
  getStrokes() {return clone(this.strokes);}
  setStrokes(strokes) {
    const input=Array.isArray(strokes)?strokes:strokes?.strokes;
    if(!Array.isArray(input))throw new TypeError('Strokes must be an array.');
    this.active=null;
    this.strokes=input.slice(0,20000).filter(stroke=>stroke&&typeof stroke==='object').map(stroke=>{
      const obj=Array.isArray(stroke)?{points:stroke}:stroke;
      const points=Array.isArray(obj.points)?obj.points:[];
      const viewport=obj.viewport;
      const validViewport=Number.isFinite(viewport?.width)&&Number.isFinite(viewport?.height)&&viewport.width>0&&viewport.height>0;
      return {points:points.filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(0,20000).map(p=>({x:p.x,y:p.y,pressure:clamp(finite(p.pressure,.55),.05,1),t:finite(p.t)})),
        tool:['pen','chalk','line','eraser','highlighter'].includes(obj.tool)?obj.tool:'pen',color:typeof obj.color==='string'?obj.color:this.color,width:clamp(finite(obj.width,this.width),.1,200),viewport:validViewport?{width:viewport.width,height:viewport.height}:undefined};
    }).filter(stroke=>stroke.points.length);
    const viewport=this.strokes[0]?.viewport;
    if(viewport?.width>0 && viewport?.height>0)this.world={width:viewport.width,height:viewport.height};
    this.history=[];this.future=[];this.resize();
  }
  setTool(tool) {this.tool=['pen','chalk','line','eraser','highlighter'].includes(tool)?tool:'pen';this.canvas.style.cursor=this.tool==='eraser'?'cell':'crosshair';return this;}
  setColor(color) {this.color=color;return this;}
  setWidth(width) {this.width=clamp(finite(width,3),.5,60);return this;}
  setEnabled(value) {this.enabled=Boolean(value);if(!this.enabled)this.cancel();return this;}
  undo() {
    const op=this.history.pop();if(!op)return false;
    if(op.type==='add')this.strokes.pop();else if(op.type==='clear')this.strokes=op.strokes;
    this.future.push(op);this.renderBase();this.render();this.changed();return true;
  }
  redo() {
    const op=this.future.pop();if(!op)return false;
    if(op.type==='add')this.strokes.push(op.stroke);else if(op.type==='clear')this.strokes=[];
    this.history.push(op);this.renderBase();this.render();this.changed();return true;
  }
  clear() {
    this.active=null;if(!this.strokes.length){this.render();return;}
    this.history.push({type:'clear',strokes:this.strokes});this.strokes=[];this.future=[];
    this.renderBase();this.render();this.changed();
  }
  exportPNG(background=this.background) {
    if(background&&typeof background==='object')background=background.background||this.background;
    if(typeof background!=='string')background=null;
    this.render();
    const out=document.createElement('canvas');out.width=this.canvas.width;out.height=this.canvas.height;
    const ctx=out.getContext('2d');
    if(background){ctx.fillStyle=background;ctx.fillRect(0,0,out.width,out.height);}
    ctx.drawImage(this.canvas,0,0);return out.toDataURL('image/png');
  }
  exportJSON() {return JSON.stringify({version:1,strokes:this.getStrokes()});}
  importJSON(json) {this.setStrokes(typeof json==='string'?JSON.parse(json):json);this.changed();}
  destroy() {
    this.destroyed=true;this.active=null;cancelAnimationFrame(this.frame);this.observer?.disconnect();
    for(const [target,type,fn,options] of this.listeners)target.removeEventListener(type,fn,options);
    Object.assign(this.canvas.style,this.originalStyle);
  }
}

// Original stylized center-line glyphs. A vertical bar separates pen strokes.
const PATHS={
  'あ':'18,30 79,27|45,13 42,65 45,87|70,39 63,61 48,79 29,85 20,79 22,65 38,52 57,49 73,54 82,67 78,81 65,88',
  'い':'22,20 20,45 25,68 36,80 47,58|66,23 76,35 83,59',
  'う':'38,15 63,20|25,39 49,31 68,33 76,43 74,58 65,73 48,88',
  'え':'38,15 65,22|23,40 73,34 48,58 26,83 45,65 54,67 56,80 65,85 81,80',
  'お':'19,34 62,28|42,15 42,78 35,85 23,82 17,73 25,61 45,52 63,51 77,57 82,70 74,82 60,84|70,19 84,31',
  'か':'15,36 53,31 56,50 49,78 38,83 28,77|39,14 34,45 22,75|70,27 82,44 87,62',
  'き':'23,29 72,23|20,47 79,41|46,12 55,40 68,61 52,56|31,64 28,75 38,83 58,87 75,84',
  'く':'70,12 24,49 64,88',
  'け':'24,17 19,47 24,81 33,65|42,35 84,30|66,13 69,53 63,74 49,88',
  'こ':'26,25 48,20 74,23|27,64 21,76 33,82 56,84 77,80',
  'さ':'18,33 78,25|48,12 57,37 70,57 53,54|32,61 27,73 36,82 57,86 72,83',
  'し':'34,15 30,56 32,77 44,86 60,83 80,64',
  'す':'16,32 84,26|58,11 57,52 48,62 38,59 35,50 44,44 56,48 61,63 55,79 43,90',
  'せ':'13,42 87,34|67,14 66,58 59,64 49,58|33,22 34,74 43,83 66,84 81,78',
  'そ':'28,19 70,18 47,41 18,53 82,42 58,49 43,62 43,76 57,85 77,87',
  'た':'14,33 60,28|38,13 30,49 17,85|49,47 66,42 83,44|48,68 45,78 58,85 82,84',
  'ち':'17,32 80,26|48,12 36,59 53,50 69,50 81,59 80,73 68,83 47,87',
  'つ':'16,39 39,29 65,27 82,36 85,52 78,66 61,77 38,83',
  'て':'15,30 84,22 64,32 48,47 43,62 49,77 71,86',
  'と':'31,15 42,48|77,33 48,47 27,61 24,75 39,85 63,86 82,82',
  'な':'13,31 58,27|38,13 27,52 16,72|70,23 85,36|64,45 65,75 58,85 42,85 34,78 39,69 53,67 71,73 85,83',
  'に':'23,15 18,49 24,84 31,68|44,29 78,25|44,65 40,76 53,83 80,82',
  'ぬ':'24,18 31,54 44,76 57,77 67,61|62,13 48,47 31,73 20,80 14,73 16,55 34,42 57,38 76,47 84,65 80,82 68,86 61,80 65,72 76,73 85,80',
  'ね':'31,13 29,89|13,37 45,30 15,73 42,46 64,34 77,37 81,49 78,77 68,86 57,83 57,74 68,69 83,76',
  'の':'51,29 44,58 29,76 19,74 14,59 20,40 37,27 57,24 76,33 84,51 78,71 61,83',
  'は':'22,17 18,51 23,84 32,67|42,34 84,28|66,12 66,69 62,82 48,85 39,79 41,70 54,66 71,73 86,84',
  'ひ':'16,28 38,21 26,46 23,68 33,84 52,87 65,73 68,45 66,20 77,39 90,49',
  'ふ':'40,14 60,25 49,34|46,41 59,56 63,73 56,83 43,84 31,78|24,48 16,66|76,47 86,66',
  'へ':'13,52 36,29 49,35 87,70',
  'ほ':'22,16 18,50 23,84 31,68|43,24 81,19|40,45 84,40|65,23 65,73 60,84 47,86 38,80 40,72 54,68 71,75 85,85',
  'ま':'21,29 78,25|24,48 76,44|50,12 51,74 45,85 31,85 23,78 27,69 43,67 62,74 81,86',
  'み':'23,23 52,19 43,49 30,76 18,80 12,71 16,60 30,52 49,52 69,59 88,72|76,40 69,68 53,88',
  'む':'15,32 62,27|41,14 40,57 30,67 20,65 15,56 22,47 37,48 42,59 41,76 52,84 73,82 79,66|73,20 87,32',
  'め':'24,17 30,48 43,70|62,13 49,48 32,75 20,81 14,74 15,58 27,43 48,36 69,40 82,54 82,71 69,84 55,88',
  'も':'17,37 68,33|18,57 68,53|43,13 33,60 35,77 47,86 64,84 78,70',
  'や':'14,45 42,32 69,27 83,34 85,46 72,55|35,17 50,86|65,12 69,31',
  'ゆ':'21,22 18,54 25,70 34,44 48,29 68,27 82,39 83,58 73,70 54,74 40,64|59,13 58,58 52,78 42,90',
  'よ':'54,13 55,70 47,83 32,86 23,80 26,69 41,65 59,69 78,84|55,36 80,30',
  'ら':'36,13 59,23|29,35 23,61 44,51 64,48 79,57 81,70 69,82 45,88',
  'り':'28,17 25,55 36,43|66,14 68,48 62,73 46,88',
  'る':'27,19 71,17 49,40 25,63 46,50 66,48 81,59 82,72 70,84 51,88 39,83 37,75 45,71 54,75 58,85',
  'れ':'30,13 29,88|13,37 43,30 15,74 48,43 65,30 73,32 72,49 67,73 72,84 85,77',
  'ろ':'26,20 72,17 49,41 22,64 43,51 64,48 79,56 82,70 70,83 46,89',
  'わ':'31,13 29,89|13,37 45,29 15,74 43,47 62,36 77,41 84,57 80,73 63,85',
  'を':'19,29 76,24|43,12 28,53 41,43 53,45 56,70|84,40 55,53 37,67 35,77 47,85 76,84',
  'ん':'49,13 19,84 35,60 46,53 53,58 53,77 62,85 74,80 86,62',
  'ゐ':'24,23 54,18 45,47 29,75 18,81 12,73 18,56 38,44 61,43 80,54 84,72 76,85 65,83 62,75 71,70 83,77',
  'ゑ':'32,19 69,17 50,35 34,47 52,40 67,45 66,56 54,63 43,60 43,52 54,51 64,60|23,69 17,82 30,78 43,86 55,79 68,86 84,79',
  'ア':'15,23 85,21 67,44|50,36 47,63 31,85',
  'イ':'77,14 52,39 18,57|52,39 52,88',
  'ウ':'50,12 50,31|22,31 22,52|22,31 81,31 76,57 64,75 43,89',
  'エ':'25,25 76,25|51,25 51,77|15,77 86,77',
  'オ':'16,35 85,32|60,13 60,84 45,78|59,35 37,63 15,78',
  'カ':'18,34 79,32 73,78 60,85 48,78|48,14 43,50 31,72 16,85',
  'キ':'22,31 78,25|17,56 84,49|43,13 59,89',
  'ク':'41,16 29,39 17,51|38,26 80,24 72,52 55,74 30,88',
  'ケ':'31,14 24,38 14,55|27,35 86,32|62,35 55,63 36,88',
  'コ':'23,24 77,24 77,78|21,78 77,78',
  'サ':'14,36 88,32|35,14 36,58|68,13 68,52 60,73 42,88',
  'シ':'24,17 42,28|17,42 35,52|22,83 48,71 72,50 86,28',
  'ス':'22,24 77,23 62,50 40,73 17,88|56,57 84,85',
  'セ':'14,41 86,29 72,54|36,16 36,73 43,83 77,82',
  'ソ':'23,20 35,44|79,15 70,49 52,73 31,88',
  'タ':'39,15 29,36 15,52|36,26 80,23 71,52 53,75 29,89|31,46 59,62',
  'チ':'29,24 71,14|15,47 86,44|52,22 51,62 42,79 29,90',
  'ツ':'20,25 29,47|43,18 51,43|81,20 72,52 55,73 34,88',
  'テ':'26,20 77,20|15,43 87,43|53,43 51,64 43,80 29,90',
  'ト':'39,13 39,90|40,40 78,59',
  'ナ':'15,38 86,35|57,13 54,52 44,74 27,88',
  'ニ':'28,26 75,26|16,77 87,77',
  'ヌ':'23,23 79,22 66,50 46,72 21,87|33,43 81,83',
  'ネ':'43,11 59,24|21,32 80,30 55,55 19,75|51,55 51,90|63,60 85,76',
  'ノ':'74,15 65,45 47,70 23,88',
  'ハ':'33,26 26,56 12,82|64,25 78,54 87,82',
  'ヒ':'25,45 77,29|24,15 24,76 34,84 76,83',
  'フ':'19,24 83,23 75,53 58,75 34,90',
  'ヘ':'13,48 36,26 49,33 88,70',
  'ホ':'16,35 85,32|51,13 51,86 37,78|30,51 14,76|68,49 87,74',
  'マ':'15,26 86,24 57,62|35,48 65,84',
  'ミ':'31,18 74,31|30,43 69,56|25,69 77,86',
  'ム':'49,15 20,78 81,71|63,51 87,86',
  'メ':'72,15 58,48 39,72 17,89|29,34 82,77',
  'モ':'27,24 79,22|14,49 87,45|44,24 43,73 50,83 77,81',
  'ヤ':'13,40 85,27 71,51|35,14 51,88',
  'ユ':'28,28 71,27 67,76|16,76 86,76',
  'ヨ':'24,24 78,24 78,80|27,51 77,51|22,80 78,80',
  'ラ':'27,19 76,19|17,41 84,40 75,64 58,81 37,90',
  'リ':'31,16 31,53|70,14 70,51 60,75 42,89',
  'ル':'32,24 30,58 22,77 12,87|55,16 55,84 75,68 88,49',
  'レ':'29,15 29,85 58,69 84,43',
  'ロ':'24,25 24,80|24,25 78,25 78,80|24,80 78,80',
  'ワ':'23,25 23,49|23,25 82,25 75,56 61,77 39,90',
  'ヲ':'23,22 80,22 72,54 58,75 34,90|22,49 73,49',
  'ン':'22,20 41,36|24,83 51,69 74,48 87,27',
  '一':'12,50 88,50',
  '二':'25,28 76,28|13,76 88,76',
  '三':'22,22 79,22|28,49 72,49|12,78 89,78',
  '十':'12,39 88,39|51,12 51,90',
  '七':'12,42 87,30|40,12 40,78 47,86 78,84 83,71',
  '八':'35,29 27,59 13,85|62,28 74,60 89,84',
  '九':'12,35 69,30 65,77 70,86 85,84 89,72|42,12 39,49 29,74 13,89',
  '人':'51,13 43,50 30,73 12,90|46,44 63,70 87,89',
  '入':'34,14 51,30 64,63 86,89|51,32 39,64 14,89',
  '大':'13,37 88,37|50,12 48,49 33,74 13,90|49,45 66,71 88,89',
  '小':'50,12 50,84 37,78|28,35 15,66|69,34 84,66',
  '口':'24,22 24,82|24,22 78,22 78,82|24,82 78,82',
  '日':'25,15 25,86|25,15 77,15 77,86|25,49 77,49|25,86 77,86',
  '月':'27,15 27,60 20,87|27,15 76,15 76,87 62,80|27,38 76,38|27,61 76,61',
  '目':'25,13 25,88|25,13 76,13 76,88|25,37 76,37|25,61 76,61|25,88 76,88',
  '田':'18,19 18,83|18,19 82,19 82,83|50,19 50,83|18,51 82,51|18,83 82,83',
  '山':'50,13 50,82|19,37 19,82 82,82|82,36 82,82',
  '川':'21,15 21,57 15,86|49,17 49,80|79,13 79,88',
  '木':'13,37 87,37|50,12 50,90|48,39 33,64 13,82|53,41 69,66 88,82',
  '水':'50,12 50,86 36,80|16,40 38,36 29,61 12,78|81,27 58,49|53,38 67,62 88,81',
  '火':'27,30 18,51|78,25 63,43|49,12 46,51 34,74 14,89|48,47 66,74 88,89',
  '土':'21,37 80,37|50,13 50,81|12,81 88,81',
  '上':'50,13 50,81|50,39 80,39|12,81 88,81',
  '下':'13,22 88,22|49,22 49,90|49,45 78,63',
  '中':'20,29 20,69|20,29 81,29 81,69|20,69 81,69|50,12 50,90',
  '千':'26,25 75,13|13,44 87,44|50,20 50,90',
  '夕':'43,14 31,39 17,53|37,26 82,25 66,55 44,78 18,90|31,47 54,62',
  '心':'19,42 12,68|34,31 35,75 44,84 68,82 74,68|43,13 60,28|77,40 88,63',
  '手':'25,23 76,12|23,40 78,40|12,59 88,59|51,20 51,87 36,80',
  '子':'25,19 77,18 51,43|51,43 51,86 37,80|12,53 88,53',
  '女':'43,15 25,58 70,76 86,90|75,30 65,57 46,77 18,90|12,43 88,43',
  '天':'23,21 79,21|12,43 88,43|51,21 48,55 34,76 14,90|50,51 66,74 88,89',
  '王':'20,21 80,21|25,50 75,50|50,21 50,81|12,81 88,81',
  '白':'44,10 37,25|24,25 24,86|24,25 78,25 78,86|24,55 78,55|24,86 78,86',
  '古':'13,30 88,30|50,12 50,54|25,54 25,86|25,54 77,54 77,86|25,86 77,86',
  '今':'50,10 34,32 12,48|50,10 68,31 89,45|40,35 59,45|24,57 76,57 55,89',
  '文':'42,12 56,24|13,34 88,34|70,34 58,57 37,78 13,91|31,36 43,57 65,79 89,91',
  '父':'36,16 17,37|62,16 83,36|29,38 42,60 65,80 88,90|73,36 60,61 37,80 13,91',
  '六':'43,13 55,26|14,36 87,36|36,53 17,85|64,53 86,85',
  '力':'16,34 79,32 75,78 64,87 49,80|48,13 44,51 30,74 13,89',
  '万':'13,23 88,23|46,45 77,44 71,82 60,88 48,80|46,23 43,55 29,78 14,91',
};

function parsePath(path) {return path.split('|').map(stroke=>stroke.split(' ').map(pair=>{const [x,y]=pair.split(',').map(Number);return{x,y};}));}
const glyphs=Object.entries(PATHS).map(([text,path])=>({text,strokes:parsePath(path)}));
const voiced={'か':'が','き':'ぎ','く':'ぐ','け':'げ','こ':'ご','さ':'ざ','し':'じ','す':'ず','せ':'ぜ','そ':'ぞ','た':'だ','ち':'ぢ','つ':'づ','て':'で','と':'ど','は':'ば','ひ':'び','ふ':'ぶ','へ':'べ','ほ':'ぼ','う':'ゔ','カ':'ガ','キ':'ギ','ク':'グ','ケ':'ゲ','コ':'ゴ','サ':'ザ','シ':'ジ','ス':'ズ','セ':'ゼ','ソ':'ゾ','タ':'ダ','チ':'ヂ','ツ':'ヅ','テ':'デ','ト':'ド','ハ':'バ','ヒ':'ビ','フ':'ブ','ヘ':'ベ','ホ':'ボ','ウ':'ヴ'};
const halfvoiced={'は':'ぱ','ひ':'ぴ','ふ':'ぷ','へ':'ぺ','ほ':'ぽ','ハ':'パ','ヒ':'ピ','フ':'プ','ヘ':'ペ','ホ':'ポ'};
for(const glyph of [...glyphs]) {
  const strokes=glyph.strokes.map(stroke=>stroke.map(p=>({x:p.x*.8,y:p.y*.9+9})));
  if(voiced[glyph.text])glyphs.push({text:voiced[glyph.text],strokes:[...strokes,[{x:78,y:11},{x:84,y:23}],[{x:89,y:8},{x:95,y:20}]]});
  if(halfvoiced[glyph.text])glyphs.push({text:halfvoiced[glyph.text],strokes:[...strokes,[{x:85,y:8},{x:92,y:11},{x:94,y:18},{x:90,y:24},{x:83,y:24},{x:78,y:18},{x:79,y:11},{x:85,y:8}]]});
}

function normalized(strokes) {
  const all=strokes.flat();if(!all.length)return[];
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const p of all){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}
  const span=Math.max(maxX-minX,maxY-minY,1),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  return strokes.map(s=>s.map(p=>({x:(p.x-cx)/span,y:(p.y-cy)/span})));
}
function resample(points,count=24) {
  if(points.length===1)return Array.from({length:count},()=>({...points[0]}));
  const distances=[0];for(let i=1;i<points.length;i++)distances.push(distances[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
  const total=distances.at(-1);if(total<1e-8)return Array.from({length:count},()=>({...points[0]}));
  let seg=1;const out=[];
  for(let i=0;i<count;i++){const target=total*i/(count-1);while(seg<distances.length-1 && distances[seg]<target)seg++;const t=(target-distances[seg-1])/(distances[seg]-distances[seg-1]||1);out.push({x:points[seg-1].x+(points[seg].x-points[seg-1].x)*t,y:points[seg-1].y+(points[seg].y-points[seg-1].y)*t});}
  return out;
}
function pathDistance(a,b) {
  // Dynamic time warping permits uneven writing speed; a small window avoids unrelated alignments.
  const n=a.length,m=b.length,window=6;
  let previous=new Float64Array(m+1).fill(Infinity);previous[0]=0;
  for(let i=1;i<=n;i++){
    const current=new Float64Array(m+1).fill(Infinity);
    for(let j=Math.max(1,i-window);j<=Math.min(m,i+window);j++){
      const d=Math.hypot(a[i-1].x-b[j-1].x,a[i-1].y-b[j-1].y);
      current[j]=d+Math.min(previous[j],current[j-1],previous[j-1]);
    }
    previous=current;
  }
  return previous[m]/Math.max(n,m);
}
const templates=glyphs.map(glyph=>({...glyph,samples:normalized(glyph.strokes).map(s=>resample(s))}));
function inputStrokes(input) {return (Array.isArray(input)?input:input?.strokes||[]).filter(s=>!s.tool || s.tool==='pen'||s.tool==='chalk'||s.tool==='line').map(s=>(Array.isArray(s)?s:s.points||[]).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))).filter(s=>s.length);}

let kanjiTemplates=[];
let kanjiLoadPromise;
const smallKana='ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶ';
/** Install the separately licensed KanjiVG derivative data, useful in tests/workers. */
export function installGlyphData(data) {
  if(data?.samplesPerStroke!==12 || !Array.isArray(data.glyphs))throw new TypeError('Unrecognized glyph data.');
  kanjiTemplates=data.glyphs.filter(([text])=>!smallKana.includes(text)&&!/[\u3099-\u309c]/.test(text)).map(([text,encoded])=>{
    const raw=atob(encoded),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
    return {text,bytes,count:bytes.length/24};
  }).filter(t=>Number.isInteger(t.count)&&t.count>0);
  handwritingInfo.glyphCount=data.glyphs.length;
  handwritingInfo.kanji='KanjiVG';handwritingInfo.release=data.release;
  return handwritingInfo;
}
/** Optional UI helper: users explicitly choose small kana, never inferred from normalized size. */
export function toggleSmallKana(text) {
  const large='あいうえおつやゆよわかけアイウエオツヤユヨワカケ';
  return [...text].map(c=>large.includes(c)?smallKana[large.indexOf(c)]:smallKana.includes(c)?large[smallKana.indexOf(c)]:c).join('');
}
export async function loadKanjiTemplates() {
  if(kanjiTemplates.length)return handwritingInfo;
  if(!kanjiLoadPromise)kanjiLoadPromise=fetch(new URL('./kanjivg-data.json',import.meta.url)).then(response=>{
    if(!response.ok)throw new Error('手書き字形データを読み込めませんでした。');return response.json();
  }).then(installGlyphData).catch(error=>{kanjiLoadPromise=null;throw error;});
  return kanjiLoadPromise;
}
function coarseGlyphDistance(samples,template) {
  const indices=[0,7,15,23],targets=[0,4,7,11];
  let distance=0,count=0;
  if(samples.length===template.count) {
    for(let i=0;i<samples.length;i++)for(let j=0;j<indices.length;j++) {
      const a=samples[i][indices[j]],offset=i*24+targets[j]*2;
      distance+=Math.hypot(a.x-(template.bytes[offset]/255-.5),a.y-(template.bytes[offset+1]/255-.5));count++;
    }
    return distance/count;
  }
  const countPenalty=.16;
  // Stroke merges are uncommon in square kanji writing. Keep a small alternate pool.
  for(let i=0;i<samples.length;i++) {
    const k=Math.min(template.count-1,Math.floor(i*template.count/samples.length));
    for(let j=0;j<indices.length;j++){
      const a=samples[i][indices[j]],offset=k*24+targets[j]*2;
      distance+=Math.hypot(a.x-(template.bytes[offset]/255-.5),a.y-(template.bytes[offset+1]/255-.5));count++;
    }
  }
  return distance/count+countPenalty;
}
function decodeSamples(template) {
  const strokes=[];
  for(let i=0;i<template.count;i++) {
    const points=[];
    for(let j=0;j<12;j++){const offset=i*24+j*2;points.push({x:template.bytes[offset]/255-.5,y:template.bytes[offset+1]/255-.5});}
    strokes.push(resample(points));
  }
  return strokes;
}
function kanjiCandidates(samples,script) {
  const shortlist=[];
  for(const template of kanjiTemplates){
    if(Math.abs(samples.length-template.count)>1)continue;
    if(script==='hiragana'&&!/^[ぁ-ゖ]$/.test(template.text))continue;
    if(script==='katakana'&&!/^[ァ-ヶ]$/.test(template.text))continue;
    shortlist.push({template,coarse:coarseGlyphDistance(samples,template)});
  }
  shortlist.sort((a,b)=>a.coarse-b.coarse);
  return shortlist.slice(0,72).map(({template})=>{
    const target=decodeSamples(template);
    let distance=0;
    if(samples.length===target.length){
      for(let i=0;i<samples.length;i++)distance+=pathDistance(samples[i],target[i]);distance/=samples.length;
    }else distance=pathDistance(resample(samples.flat(),48),resample(target.flat(),48))+.12;
    return{text:template.text,score:clamp(1-distance*1.6,0,1),source:'kanjivg',distance};
  });
}

/** One-character candidate aid. score is shape similarity, NOT calibrated confidence. */
export function recognizeStrokes(input,{limit=8,script='all'}={}) {
  const strokes=inputStrokes(input);if(!strokes.length || strokes.length>64)return[];
  const samples=normalized(strokes).map(s=>resample(s));
  const candidates=[];
  for(const template of templates) {
    if(script==='hiragana' && !/^[ぁ-ゖ]$/.test(template.text))continue;
    if(script==='katakana' && !/^[ァ-ヶ]$/.test(template.text))continue;
    if(Math.abs(samples.length-template.samples.length)>1)continue;
    let distance=0;
    if(samples.length===template.samples.length) {
      for(let i=0;i<samples.length;i++)distance+=pathDistance(samples[i],template.samples[i]);
      distance/=samples.length;
    } else {
      // A connected/disconnected stroke is tolerated, but ranked below matching stroke counts.
      distance=pathDistance(resample(samples.flat(),48),resample(template.samples.flat(),48))+.12;
    }
    candidates.push({text:template.text,score:clamp(1-distance*1.6,0,1),source:'local',distance});
  }
  candidates.push(...kanjiCandidates(samples,script));
  const seen=new Set();
  return candidates.sort((a,b)=>a.distance-b.distance).filter(c=>!seen.has(c.text)&&seen.add(c.text)).slice(0,clamp(limit,1,30)).map(({distance,...candidate})=>candidate);
}

let recognitionWorker;
let workerRequestId=0;
const workerRequests=new Map();
function recognizeInWorker(input,options) {
  if(!recognitionWorker){
    recognitionWorker=new Worker(new URL('./recognizer-worker.js',import.meta.url),{type:'module'});
    recognitionWorker.onmessage=event=>{
      const {id,candidates,error,info}=event.data||{},request=workerRequests.get(id);
      if(!request)return;workerRequests.delete(id);clearTimeout(request.timer);
      if(info)Object.assign(handwritingInfo,info);
      if(error)request.reject(new Error(error));else request.resolve(candidates);
    };
    recognitionWorker.onerror=()=>{
      for(const request of workerRequests.values()){clearTimeout(request.timer);request.reject(new Error('手書き候補の処理を再開します。'));}
      workerRequests.clear();recognitionWorker.terminate();recognitionWorker=null;
    };
  }
  return new Promise((resolve,reject)=>{
    const id=++workerRequestId;
    const timer=setTimeout(()=>{workerRequests.delete(id);reject(new Error('手書き候補の準備に時間がかかっています。'));},18000);
    workerRequests.set(id,{resolve,reject,timer});recognitionWorker.postMessage({id,strokes:inputStrokes(input),options});
  });
}

/** Optional standard, device-backed recognition; never calls a remote service. */
export async function recognizeHandwriting(input,options={}) {
  const fallback=async()=>{
    try{if(typeof Worker==='function')return await recognizeInWorker(input,options);await loadKanjiTemplates();}catch{}
    return recognizeStrokes(input,options);
  };
  if(typeof navigator==='undefined'||typeof navigator.createHandwritingRecognizer!=='function'||typeof globalThis.HandwritingStroke!=='function')return fallback();
  let recognizer;
  try {
    recognizer=await navigator.createHandwritingRecognizer({languages:['ja']});
    const drawing=recognizer.startDrawing({recognitionType:'per-character',inputType:'stylus',alternatives:options.limit||8});
    for(const points of inputStrokes(input)){
      const stroke=new HandwritingStroke();for(const point of points)stroke.addPoint({x:point.x,y:point.y});drawing.addStroke(stroke);
    }
    const predictions=await drawing.getPrediction();
    if(!predictions?.length)return fallback();
    return predictions.filter(p=>typeof p.text==='string'&&p.text.trim()).slice(0,options.limit||8).map(p=>({text:p.text,score:null,source:'device'}));
  } catch {return fallback();} finally {try{recognizer?.finish();}catch{}}
}

export const handwritingInfo={mode:'local-candidates',glyphCount:templates.length,kana:true,kanji:'basic',oneCharacter:true,confidenceCalibrated:false};
