import {loadKanjiTemplates,recognizeStrokes,handwritingInfo} from './ink.js';

self.onmessage=async event=>{
  const {id,strokes,options}=event.data||{};
  try {
    await loadKanjiTemplates();
    self.postMessage({id,candidates:recognizeStrokes(strokes,options),info:handwritingInfo});
  }catch(error){
    // Original kana/basic kanji remain usable when the optional larger data cannot load.
    self.postMessage({id,candidates:recognizeStrokes(strokes,options),info:{...handwritingInfo,dataWarning:'字形データを読み込めなかったため、基本かな・漢字候補を表示しています。'}});
  }
};
