import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {analyzeText,conjugate,analyzePoem,speechText,poemExamples} from '../dist/language.js';
const entries=JSON.parse(await fs.readFile('content/entries.json','utf8'));
assert(entries.length>=300,'Dictionary corpus should contain at least 300 distinct entries');
const ids=new Set();
for(const e of entries){assert(!ids.has(e.id),'Duplicate ID '+e.id);ids.add(e.id);for(const key of ['headword','reading','pronunciation','partOfSpeech','summary','usage'])assert(typeof e[key]==='string'&&e[key].length,`${e.id}: missing ${key}`);assert(!/[\p{Script=Han}]/u.test(e.reading),`${e.id}: reading must be kana`);assert(!/[\p{Script=Han}]/u.test(e.pronunciation),`${e.id}: pronunciation must be kana`);assert(e.meanings.length&&e.examples.length,`${e.id}: explanations/examples missing`);for(const f of conjugate(e)){assert(f.form&&f.value,`${e.id}: empty conjugation`);assert(!/undefined|NaN/.test(f.value),`${e.id}: invalid conjugation`);}}
for(const name of ['app','ink','language','recognizer-worker','speech'])execFileSync(process.execPath,['--check',`dist/${name}.js`]);
const haiku=analyzePoem('春の雨\n窓に小さな\n川をひく','haiku','はるのあめ\nまどにちいさな\nかわをひく',entries);assert.deepEqual(haiku.lines.map(x=>x.mora),[5,7,5]);assert.equal(haiku.isRegular,true);
assert.equal(analyzePoem('未知の空\n光の彼方\n人の影','haiku','',entries).needsReading,true);
assert.equal(analyzePoem('春の雨\n窓に小さな\n川をひく','haiku','はるのあめ',entries).needsReading,true);
for(const example of poemExamples){const result=analyzePoem(example.text,example.type,example.reading,entries);assert.equal(result.isRegular,true,example.type+' example rhythm');}
assert(analyzeText('未知XYZ', 'classical-modern',entries).output.includes('XYZ'),'Unknown input must be retained');
assert.equal(analyzeText('いとをかし。','classical-modern',entries).output,'とても趣がある。');
assert(speechText('清少納言',entries).includes('せいしょうなごん'));
const index=await fs.readFile('dist/index.html','utf8'),style=await fs.readFile('dist/style.css','utf8');
for(const match of (index+'\n'+style).matchAll(/(?:src=|href=|url\()\s*["'](\.\/[^"')?#]+)/g)){await fs.access('dist/'+match[1].slice(2));}
for(const f of ['dist/kanjivg-data.json','dist/kanjivg-license.txt','dist/assets/Yomogi-OFL.txt'])await fs.access(f);
console.log(`PASS: ${entries.length} entry schemas, unique IDs, conjugations, poem meter/uncertainty, translation fallback, speech reading, JS syntax and local assets.`);

assert.equal(conjugate(entries.find(e=>e.headword==='いみじ'))[3].value,'いみじき・いみじかる');
assert.equal(analyzeText('思はず。','classical-modern',entries).output,'思わない。');
assert.equal(speechText('来たり。来ず。',entries),'きたり。こず。');
