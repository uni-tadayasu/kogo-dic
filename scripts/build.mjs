import fs from 'node:fs/promises';
await fs.mkdir('dist/data',{recursive:true});
for(const name of ['entries.json','sources.json'])await fs.copyFile('content/'+name,'dist/data/'+name);
const entries=JSON.parse(await fs.readFile('dist/data/entries.json','utf8'));
await fs.writeFile('dist/data/edition.json',JSON.stringify({title:'古語辞典｜葛西書店',edition:'2026.11.25',entries:entries.length,scope:'original-learning-dictionary',completeHistoricalLexicon:false,handwritingCharacters:6603,translation:'dictionary-reference',poetry:['haiku','senryu','tanka']},null,2));
console.log(`Prepared ${entries.length} original dictionary entries.`);
