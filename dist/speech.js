export class Reader {
  constructor({onState=()=>{},onItem=()=>{}}={}){
    this.onState=onState;this.onItem=onItem;this.queue=[];this.item=0;this.chunk=0;this.parts=[];this.playing=false;this.paused=false;this.loop=false;this.continuous=false;this.rate=1;this.volume=1;this.voiceName='';this.serial=0;this.utterance=null;
    this.available='speechSynthesis' in globalThis&&'SpeechSynthesisUtterance' in globalThis;
    if(this.available){speechSynthesis.addEventListener('voiceschanged',()=>this.emit());window.addEventListener('pagehide',()=>this.stop());}
  }
  get voices(){return this.available?speechSynthesis.getVoices().filter(v=>/^ja(?:-|_)/i.test(v.lang)):[];}
  emit(message){this.onState({playing:this.playing,paused:this.paused,item:this.item,total:this.queue.length,label:this.queue[this.item]?.label||'',message:message||'',available:this.available});}
  setQueue(queue,index=0){this.stop(false);this.queue=queue.filter(q=>typeof q.text==='function'||q.text?.trim());this.item=Math.max(0,Math.min(index,this.queue.length-1));this.emit();}
  start(){
    if(!this.available){this.emit('このブラウザは読み上げに対応していません。');return;}
    if(!this.queue.length){this.emit('読み上げる文章がありません。');return;}
    if(this.paused){speechSynthesis.resume();this.paused=false;this.playing=true;this.emit();return;}
    this.serial++;speechSynthesis.cancel();this.playing=true;this.paused=false;this.readItem();
  }
  toggle(){if(this.playing&&!this.paused){speechSynthesis.pause();this.paused=true;this.emit();}else this.start();}
  readItem(){
    const q=this.queue[this.item];if(!q){this.stop();return;}
    this.parts=chunkText(typeof q.text==='function'?q.text():q.text);this.chunk=0;this.onItem(q,this.item);this.emit();this.say();
  }
  say(){
    if(!this.playing||this.paused)return;
    if(this.chunk>=this.parts.length){this.finishItem();return;}
    const serial=this.serial,u=new SpeechSynthesisUtterance(this.parts[this.chunk]);this.utterance=u;
    const voices=this.voices;u.voice=voices.find(v=>v.name===this.voiceName)||voices.find(v=>v.default)||voices[0]||null;u.lang='ja-JP';u.rate=this.rate;u.pitch=1;u.volume=this.volume;
    u.onend=()=>{if(serial!==this.serial)return;this.chunk++;this.say();};
    u.onerror=e=>{if(serial!==this.serial)return;if(e.error==='interrupted'||e.error==='canceled')return;this.playing=false;this.paused=false;this.emit(e.error==='not-allowed'?'再生ボタンをもう一度押してください。':'音声を再生できませんでした。日本語音声と音量をご確認ください。');};
    speechSynthesis.speak(u);
  }
  finishItem(){
    if(this.continuous&&this.item<this.queue.length-1){this.item++;this.readItem();}
    else if(this.loop){if(this.continuous)this.item=0;this.readItem();}
    else{this.playing=false;this.paused=false;this.emit('読み上げが終わりました。');}
  }
  stop(notify=true){this.serial++;if(this.available)speechSynthesis.cancel();this.playing=false;this.paused=false;this.utterance=null;if(notify)this.emit();}
  next(){const active=this.playing;this.stop(false);this.item=this.item+1<this.queue.length?this.item+1:0;if(active)this.start();else{this.onItem(this.queue[this.item],this.item);this.emit();}}
  previous(){const active=this.playing;this.stop(false);this.item=Math.max(0,this.item-1);if(active)this.start();else{this.onItem(this.queue[this.item],this.item);this.emit();}}
}
function chunkText(text){const out=[];for(const sentence of text.replace(/\s+/g,' ').match(/[^。！？\n]+[。！？]?/g)||[]){let rest=sentence.trim();while(rest.length>115){let cut=Math.max(rest.lastIndexOf('、',115),rest.lastIndexOf(' ',115));if(cut<25)cut=110;else cut++;out.push(rest.slice(0,cut));rest=rest.slice(cut);}if(rest)out.push(rest);}return out;}
