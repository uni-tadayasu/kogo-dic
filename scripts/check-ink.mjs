import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import {InkBoard,installGlyphData,recognizeStrokes} from '../dist/ink.js';

// Native rasterization verifies restored ink and PNG pixels, without automating a browser.
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const require=createRequire(import.meta.url);
let createCanvas,loadImage;
try {({createCanvas,loadImage}=require(runtime?`${runtime}/@napi-rs/canvas`:'@napi-rs/canvas'));}
catch {throw new Error('The primary runtime canvas dependency is required for this check.');}

const listen=()=>{};
globalThis.window={devicePixelRatio:2,addEventListener:listen,removeEventListener:listen,onpointerrawupdate:null};
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.requestAnimationFrame=()=>1;
globalThis.cancelAnimationFrame=()=>{};
const canvas=createCanvas(800,500);
canvas.style={};canvas.addEventListener=listen;canvas.removeEventListener=listen;
let viewport={left:0,top:0,width:800,height:500};
canvas.getBoundingClientRect=()=>viewport;
const board=new InkBoard(canvas,{width:3,color:'#ffffff'});
const strokes=Array.from({length:300},(_,stroke)=>({
  tool:'pen',color:stroke%3?'#ffffff':'#f0d080',width:2.5,
  viewport:{width:800,height:500},
  points:Array.from({length:80},(_,i)=>({x:10+i*9.5,y:20+(stroke%35)*13+Math.sin(i*.3)*4,pressure:.6,t:stroke*100+i}))
}));
const start=performance.now();board.setStrokes(strokes);const restoreMs=performance.now()-start;
assert.equal(board.getStrokes().length,300);
const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
assert.ok(pixels.some((v,i)=>i%4===3&&v>0),'Restored read-only strokes must be visible.');

const before=performance.now();
board.active={...strokes[0],pointerId:1,pointerType:'pen'};
for(let i=0;i<10;i++)board.render();
const frameMs=(performance.now()-before)/10;
board.active=null;
const snapshot=board.getStrokes();
board.clear();assert.equal(board.getStrokes().length,0);
assert.equal(board.undo(),true);assert.equal(board.getStrokes().length,300);
assert.equal(board.redo(),true);assert.equal(board.getStrokes().length,0);

const url=board.exportPNG({background:'#17382f'});
const image=await loadImage(url),out=createCanvas(image.width,image.height),ctx=out.getContext('2d');
ctx.drawImage(image,0,0);assert.deepEqual([...ctx.getImageData(0,0,1,1).data],[23,56,47,255]);
board.setStrokes(snapshot);viewport={...viewport,width:400,height:400};board.resize();
assert.equal(board.getStrokes().length,300);assert.equal(board.canvas.width,800);
board.setEnabled(false);assert.equal(board.enabled,false);
assert.doesNotThrow(()=>board.setStrokes([null,'bad',{points:null},{points:[null,{}, {x:1,y:2}],viewport:{width:Infinity,height:0}}]));
assert.equal(board.getStrokes().length,1);board.destroy();

const data=JSON.parse(fs.readFileSync(new URL('../dist/kanjivg-data.json',import.meta.url)));
installGlyphData(data);
for(const text of ['あ','い','を','け','風','山','川','語','葛','書','辞','時','古']){
  const raw=Buffer.from(data.glyphs.find(g=>g[0]===text)[1],'base64'),input=[];
  for(let i=0;i<raw.length;i+=24){const points=[];for(let j=0;j<24;j+=2)points.push({x:raw[i+j]*1.15+27+Math.sin(j*1.7+i)*5,y:raw[i+j+1]*.91+42+Math.cos(j*1.3+i)*5});input.push(points);}
  assert.equal(recognizeStrokes(input,{limit:3})[0].text,text,`${text}: distorted glyph should remain the first candidate`);
}
console.log(JSON.stringify({status:'passed',strokes:300,pointsPerStroke:80,restoreMs:Math.round(restoreMs),cachedFrameMs:Number(frameMs.toFixed(2)),recognitionFixtures:13}));
