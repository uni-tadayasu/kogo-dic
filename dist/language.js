/**
 * 古語辞典｜葛西書店 — small, explainable, browser-only language tools.
 * This is a dictionary/rule aid, not an unrestricted machine translator.
 * No input is sent to a service. Generated text is always a reference candidate.
 */

const FORMS = ['未然形', '連用形', '終止形', '連体形', '已然形', '命令形'];
const CONNECTIONS = [
  '打消・推量などの助動詞につながる形。接続は語によって異なります。',
  '動作を続けたり、過去・完了の助動詞などにつながる形。',
  '文を言い切るときの基本の形。',
  '名詞を修飾する形。「ぞ・なむ・や・か」の結びにも使います。',
  '「ば・ど・ども」などにつながる形。「こそ」の結びにも使います。',
  '命令を表す形。存在しない語もあります。'
];
const ROWS = {
  'ア': ['あ', 'い', 'う', 'え'], 'カ': ['か', 'き', 'く', 'け'],
  'ガ': ['が', 'ぎ', 'ぐ', 'げ'], 'サ': ['さ', 'し', 'す', 'せ'],
  'ザ': ['ざ', 'じ', 'ず', 'ぜ'], 'タ': ['た', 'ち', 'つ', 'て'],
  'ダ': ['だ', 'ぢ', 'づ', 'で'], 'ナ': ['な', 'に', 'ぬ', 'ね'],
  'ハ': ['は', 'ひ', 'ふ', 'へ'], 'バ': ['ば', 'び', 'ぶ', 'べ'],
  'マ': ['ま', 'み', 'む', 'め'], 'ヤ': ['や', 'い', 'ゆ', 'え'],
  'ラ': ['ら', 'り', 'る', 'れ'], 'ワ': ['わ', 'ゐ', 'う', 'ゑ']
};
const AUXILIARIES = {
  'ず': {values:['ず・ざら','ず・ざり','ず','ぬ・ざる','ね・ざれ','ざれ'],connection:'未然形に接続。打消を表します。'},
  'き': {values:['せ','—','き','し','しか','—'],connection:'連用形に接続。経験した過去。カ変・サ変には特別な接続があります。'},
  'けり': {values:['けら','—','けり','ける','けれ','—'],connection:'連用形に接続。過去・詠嘆。未然形は限られた形に現れます。'},
  'つ': {values:['て','て','つ','つる','つれ','てよ'],connection:'連用形に接続。完了・強意など。'},
  'ぬ': {values:['な','に','ぬ','ぬる','ぬれ','ね'],connection:'連用形に接続する完了・強意。「ず」の連体形「ぬ」と区別します。'},
  'たり': {values:['たら','たり','たり','たる','たれ','たれ'],connection:'完了・存続なら連用形に接続。断定の「たり」は体言に接続します。'},
  'り': {values:['ら','り','り','る','れ','れ'],connection:'四段の已然形・サ変の未然形に接続。完了・存続を表します。'},
  'む': {values:['—','—','む','む','め','—'],connection:'未然形に接続。推量・意志・勧誘など、文脈で意味を判断します。'},
  'むず': {values:['—','—','むず','むずる','むずれ','—'],connection:'未然形に接続。「む」に近い推量・意志など。'},
  'らむ': {values:['—','—','らむ','らむ','らめ','—'],connection:'終止形（ラ変型は連体形）に接続。現在の推量など。'},
  'けむ': {values:['—','—','けむ','けむ','けめ','—'],connection:'連用形に接続。過去の推量など。'},
  'べし': {values:['べく・べから','べく・べかり','べし','べき・べかる','べけれ','—'],connection:'終止形（ラ変型は連体形）に接続。推量・意志・可能・当然・命令・適当など。'},
  'まじ': {values:['まじく・まじから','まじく・まじかり','まじ','まじき・まじかる','まじけれ','—'],connection:'終止形（ラ変型は連体形）に接続。打消推量・打消意志・不可能など。'},
  'じ': {values:['—','—','じ','じ','じ','—'],connection:'未然形に接続。打消推量・打消意志など。'},
  'まし': {values:['ましか・ませ','—','まし','まし','ましか','—'],connection:'未然形に接続。反実仮想・ためらいの意志など。'},
  'めり': {values:['—','めり','めり','める','めれ','—'],connection:'終止形（ラ変型は連体形）に接続。主に見た様子からの推定。'},
  'らし': {values:['—','—','らし','らし','らし','—'],connection:'終止形（ラ変型は連体形）に接続。根拠のある推定。'},
  'なり': {values:['なら','なり・に','なり','なる','なれ','なれ'],connection:'断定の「なり」は体言・連体形に接続。伝聞・推定の「なり」と区別します。'},
  'る': {values:['れ','れ','る','るる','るれ','れよ'],connection:'四段・ナ変・ラ変の未然形に接続。受身・可能・自発・尊敬。'},
  'らる': {values:['られ','られ','らる','らるる','らるれ','られよ'],connection:'四段・ナ変・ラ変以外の未然形に接続。受身・可能・自発・尊敬。'},
  'す': {values:['せ','せ','す','する','すれ','せよ'],connection:'四段・ナ変・ラ変の未然形に接続。使役・尊敬。'},
  'さす': {values:['させ','させ','さす','さする','さすれ','させよ'],connection:'四段・ナ変・ラ変以外の未然形に接続。使役・尊敬。'},
  'しむ': {values:['しめ','しめ','しむ','しむる','しむれ','しめよ'],connection:'未然形に接続。使役・尊敬。'},
  'まほし': {values:['まほしく・まほしから','まほしく・まほしかり','まほし','まほしき・まほしかる','まほしけれ','—'],connection:'未然形に接続。希望を表します。'},
  'たし': {values:['たく・たから','たく・たかり','たし','たき・たかる','たけれ','—'],connection:'連用形に接続。希望を表します。'},
  'ごとし': {values:['ごとく','ごとく','ごとし','ごとき','—','—'],connection:'体言・連体形、助詞「の・が」などに接続。比況・例示を表します。'}
};

const string = value => typeof value === 'string' ? value : value == null ? '' : String(value);
const normalize = value => string(value).normalize('NFKC').replace(/\r\n?/g, '\n');
const hiragana = value => normalize(value).replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const cleanLemma = value => hiragana(value).replace(/[（(][^）)]*[）)]/g, '').replace(/[・‐－―\s]/g, '');
const plainConjugation = entry => string(typeof entry?.conjugation === 'object' ? entry.conjugation?.type || entry.conjugation?.name : entry?.conjugation);
const baseOf = entry => cleanLemma(entry?.reading || entry?.headword || '');
const auxText = entry => [entry?.id,entry?.summary,entry?.usage,entry?.headword,plainConjugation(entry)].map(string).join(' ');
const formValues = value => string(value).split(/[・／/]/).map(x => x.replace(/[（(][^）)]*[）)]/g, '').trim()).filter(x => x && x !== '—');

function orthographicForms(surface,entry) {
  const old=baseOf(entry),head=normalize(entry.headword).replace(/[（(][^）)]*[）)]/g,'').trim();
  if(!head || head===old || !/\p{Script=Han}/u.test(head)) return [surface];
  const changingKanji={'来':['こ','き','く'],'得':['え','う'],'経':['へ','ふ'],'寝':['ね','ぬ']}[head];
  if(changingKanji?.some(kana=>surface.startsWith(kana))) return [surface,head+surface.slice(1)];
  let suffix=0;
  while(suffix<old.length&&suffix<head.length&&old[old.length-1-suffix]===head[head.length-1-suffix]) suffix++;
  const oldStem=old.slice(0,old.length-suffix),headStem=head.slice(0,head.length-suffix);
  if(oldStem&&surface.startsWith(oldStem)) return [...new Set([surface,headStem+surface.slice(oldStem.length)])];
  if(/カ変|カ行変格/.test(plainConjugation(entry))&&/来/.test(head)&&/^[こきく]/.test(surface)) return [surface,'来'+surface.slice(1)];
  return [surface];
}

/** Return six classical conjugation forms, or [] for an unsupported/noninflecting word. */
export function conjugate(entry) {
  if (!entry || typeof entry !== 'object') return [];
  let base = baseOf(entry);
  const kind = plainConjugation(entry);
  const pos = string(entry.partOfSpeech);
  let values, connection = '';
  if (/助動詞/.test(pos) && AUXILIARIES[base]) {
    const aux = AUXILIARIES[base];
    values = [...aux.values];
    connection = aux.connection;
    const explicitKind=[entry.id,entry.headword,kind].map(string).join(' ');
    const auditoryNari=/伝聞|推定/.test(explicitKind)||(/伝聞|推定/.test(auxText(entry))&&!/断定/.test(auxText(entry)));
    if (base === 'なり' && auditoryNari && !/断定/.test(string(entry.headword))) {
      values = ['—','なり','なり','なる','なれ','—'];
      connection = '伝聞・推定の「なり」。終止形（ラ変型は連体形）に接続します。';
    }
    if (base === 'たり' && /断定/.test(auxText(entry))) {
      values[1] = 'たり・と';
      connection = '断定の「たり」。主に漢語の体言に接続します。';
    }
  } else if (/シク|しく/.test(kind)) {
    const voiced=base.endsWith('じ');
    const stem = /[しじ]$/.test(base) ? base.slice(0,-1) : base;
    values = ['しく・しから','しく・しかり','し','しき・しかる','しけれ','しかれ'].map(s => s.split('・').map(x=>stem+(voiced?x.replace(/^し/,'じ'):x)).join('・'));
    connection = '本活用とカリ活用を併記しています。助動詞を続けるときなどにカリ活用を用います。';
  } else if (/ク活用|^ク$|く活用/.test(kind)) {
    const stem = base.endsWith('し') ? base.slice(0,-1) : base;
    values = ['く・から','く・かり','し','き・かる','けれ','かれ'].map(s => s.split('・').map(x=>stem+x).join('・'));
    connection = '本活用とカリ活用を併記しています。未然形の「く」は用法が限られます。';
  } else if (/ナリ|なり/.test(kind) || (/形容動詞/.test(pos) && base.endsWith('なり'))) {
    const stem = base.replace(/なり$/, '');
    values = ['なら','なり・に','なり','なる','なれ','なれ'].map(s => s.split('・').map(x=>stem+x).join('・'));
  } else if (/タリ|たり/.test(kind) || (/形容動詞/.test(pos) && base.endsWith('たり'))) {
    const stem = base.replace(/たり$/, '');
    values = ['たら','たり・と','たり','たる','たれ','たれ'].map(s => s.split('・').map(x=>stem+x).join('・'));
  } else if (/カ変|カ行変格/.test(kind)) {
    const stem = base.endsWith('く') ? base.slice(0,-1) : '';
    values = ['こ','き','く','くる','くれ','こ・こよ'].map(s=>s.split('・').map(x=>stem+x).join('・'));
  } else if (/サ変|サ行変格/.test(kind)) {
    const voiced=base.endsWith('ず');
    const stem = base.replace(/[すず]$/, '');
    values = (voiced?['ぜ','じ','ず','ずる','ずれ','ぜよ']:['せ','し','す','する','すれ','せよ']).map(s=>stem+s);
  } else if (/ナ変|ナ行変格/.test(kind)) {
    const stem = base.replace(/ぬ$/, '');
    values = ['な','に','ぬ','ぬる','ぬれ','ね'].map(s=>stem+s);
  } else if (/ラ変|ラ行変格/.test(kind)) {
    const stem = base.replace(/り$/, '');
    values = ['ら','り','り','る','れ','れ'].map(s=>stem+s);
  } else if (/上一段|下一段/.test(kind)) {
    if (!base.endsWith('る')) return [];
    const stem = base.slice(0,-1);
    values = [stem,stem,base,base,stem+'れ',stem+'よ'];
  } else if (/四段|上二段|下二段/.test(kind)) {
    const rowName = kind.match(/([アカガサザタダナハバマヤラワ])行/)?.[1];
    const last = base.slice(-1);
    const row = rowName ? ROWS[rowName] : Object.values(ROWS).find(r=>r[2] === last);
    if (!row || !base) return [];
    const stem = base.slice(0,-1);
    if (/四段/.test(kind)) values = [row[0],row[1],row[2],row[2],row[3],row[3]].map(s=>stem+s);
    if (/上二段/.test(kind)) values = [row[1],row[1],row[2],row[2]+'る',row[2]+'れ',row[1]+'よ'].map(s=>stem+s);
    if (/下二段/.test(kind)) values = [row[3],row[3],row[2],row[2]+'る',row[2]+'れ',row[3]+'よ'].map(s=>stem+s);
  }
  if (!values) return [];
  return FORMS.map((form,i)=>({form,value:values[i],connection:values[i] === '—' ? 'この活用形はありません。' : (connection ? connection+' '+CONNECTIONS[i] : CONNECTIONS[i])}));
}

const MODERN_GODAN = {
  'う':['わ','い','って','った','おう'], 'く':['か','き','いて','いた','こう'],
  'ぐ':['が','ぎ','いで','いだ','ごう'], 'す':['さ','し','して','した','そう'],
  'つ':['た','ち','って','った','とう'], 'ぬ':['な','に','んで','んだ','のう'],
  'ぶ':['ば','び','んで','んだ','ぼう'], 'む':['ま','み','んで','んだ','もう'],
  'る':['ら','り','って','った','ろう']
};

function modernForms(word, entry) {
  word = normalize(word).replace(/[。.!！]$/, '').trim();
  const kind = plainConjugation(entry), pos = string(entry?.partOfSpeech);
  if (!word || word.length > 24 || /[；;、。〜～…]/.test(word)) return null;
  if (/形容詞/.test(pos) && word.endsWith('い')) {
    const stem = word.slice(0,-1);
    return {base:word,negative:stem+'くない',past:stem+'かった',adverb:stem+'く',conditional:stem+'ければ'};
  }
  if (/形容動詞/.test(pos) && word.endsWith('だ')) {
    const stem=word.slice(0,-1);
    return {base:word,negative:stem+'でない',past:stem+'だった',adverb:stem+'に',attributive:stem+'な'};
  }
  if (!/動詞/.test(pos) || /助動詞|形容動詞/.test(pos)) return null;
  if (word.endsWith('する')) {
    const stem=word.slice(0,-2);
    return {base:word,negative:stem+'しない',past:stem+'した',te:stem+'して',stem:stem+'し',polite:stem+'します',volitional:stem+'しよう',want:stem+'したい'};
  }
  if (word === '来る' || word === 'くる') {
    const kanji=word === '来る';
    return {base:word,negative:kanji?'来ない':'こない',past:kanji?'来た':'きた',te:kanji?'来て':'きて',stem:kanji?'来':'き',polite:kanji?'来ます':'きます',volitional:kanji?'来よう':'こよう',want:kanji?'来たい':'きたい'};
  }
  // The modern translation may be a completely different verb. Its conjugation
  // must therefore not be inferred from the classical entry's conjugation.
  if(word.endsWith('ございます')||word.endsWith('おります')) return null;
  const godanException=/(?:帰|返|切|斬|知|走|入|要|減|喋|滑|参|散|焦|練)る$/.test(word)||['かえる','きる','しる','はしる','はいる','へる','しゃべる','すべる','まいる','ちる','あせる'].includes(word);
  const oneSyllableIchidan=/(?:見|寝|着|出|得|煮|似|居|射|鋳|み|ね|き|で|え|に|い)る$/.test(word);
  const kanaIchidan=/[いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ]る$/.test(word);
  const ichidan=word.endsWith('る') && !godanException && (oneSyllableIchidan||kanaIchidan);
  if (ichidan) {
    const stem=word.slice(0,-1);
    return {base:word,negative:stem+'ない',past:stem+'た',te:stem+'て',stem,polite:stem+'ます',volitional:stem+'よう',want:stem+'たい'};
  }
  const row=MODERN_GODAN[word.slice(-1)],stem=word.slice(0,-1);
  if (!row) return null;
  const isIku=/[行往い]く$/.test(word);
  const politeStem=/(?:くださ|おっしゃ|いらっしゃ|なさ)る$/.test(word)?stem+'い':stem+row[1];
  return {base:word,negative:word.endsWith('ある')?word.slice(0,-2)+'ない':stem+row[0]+'ない',past:isIku?stem+'った':stem+row[3],te:isIku?stem+'って':stem+row[2],stem:stem+row[1],polite:politeStem+'ます',volitional:stem+row[4],want:stem+row[1]+'たい'};
}

function modernMeanings(entry) {
  const raw=Array.isArray(entry?.modern)?entry.modern.join('／'):string(entry?.modern);
  const fallback=string(entry?.meanings?.[0]?.definition || entry?.summary);
  return (raw || fallback).split(/[／/；;、。・]/).map(s=>s.trim().replace(/[（(][^）)]*[）)]/g,'').replace(/^[〜～…]+|[〜～…]+$/g,'')).filter(s=>s && s.length<=24&&!/[〜～…]/.test(s)).slice(0,5);
}

// Whole expressions are deliberately few and explain their contextual choices.
const PHRASES = [
  ['しづかに降りをり','静かに降っています','「しづかに」は形容動詞「しづかなり」の連用形。「降り」は四段動詞の連用形、「をり」は続いている状態を表す補助動詞として使った参考表現です。現代語の「ます」の丁寧さは別に調整します。'],
  ['春はあけぼの','春は明け方がよい','名詞を述語とする表現に、文脈上の評価「よい」を補った参考訳です。'],
  ['いとをかし','とても趣がある','「をかし」は美しい・おもしろいなどにもなります。ここでは趣への感動と読みます。'],
  ['いとあはれなり','とてもしみじみと心にしみる','「あはれ」の意味は、悲しみ・愛情など、対象によって変わります。'],
  ['花は盛りに','花は満開のときに','「盛り」は勢いが最も充実している時期です。'],
  ['月はくまなきを','月は雲に隠れないものを','「くまなし」を月の光に関する意味で読んでいます。'],
  ['つれづれなるままに','することもなく物思いにふけるままに','「つれづれ」は退屈・孤独などの意味もあります。'],
  ['え言はず','言うことができない','「え」と打消の呼応により、不可能を表します。'],
  ['え行かず','行くことができない','「え」と打消の呼応により、不可能を表します。'],
  ['え見ず','見ることができない','「え」と打消の呼応により、不可能を表します。'],
  ['な行きそ','行ってはいけない','「な」＋連用形＋「そ」の禁止です。'],
  ['な泣きそ','泣かないでほしい','「な」＋連用形＋「そ」の禁止を、柔らかい依頼として訳しています。'],
  ['な忘れそ','忘れないでほしい','「な」＋連用形＋「そ」の禁止です。'],
  ['いかがせむ','どうしようか','疑問の「いかが」と意志の「む」の組合せです。'],
  ['いかで見む','なんとかして見たい','「いかで」はここでは願望を伴います。疑問の用法もあります。'],
  ['言ふまでもなし','言うまでもない','「言ふ」の歴史的仮名遣いを現代の表記にしています。'],
  ['さもありぬべし','もっともなことだ','「さもありぬべし」は当然さを認める表現として読めます。'],
  ['世の中は','世の中は','「世の中」は人生・男女の仲などを指すこともあり、文脈で確認します。'],
  ['今は昔','今から見れば昔のことだが','説話の書き出しに使う言い方です。']
];

const BRIDGES = [
  ['春','春','名詞'],['雨','雨','名詞'],['月','月','名詞'],['花','花','名詞'],['空','空','名詞'],
  ['風','風','名詞'],['山','山','名詞'],['川','川','名詞'],['海','海','名詞'],['星','星','名詞'],
  ['いと','とても','副詞'],['いと','非常に','副詞'],['いみじく','たいへん','副詞'],
  ['をかし','趣がある','形容詞'],['うるはし','美しい','形容詞'],['うつくし','かわいらしい','形容詞'],
  ['あはれなり','しみじみと心にしみる','形容動詞'],['あやし','不思議だ','形容詞'],
  ['あさまし','驚きあきれるほどだ','形容詞'],['かたじけなし','ありがたい','形容詞'],
  ['ありがたし','めったにない','形容詞'],['よし','よい','形容詞'],['よし','良い','形容詞'],
  ['わろし','よくない','形容詞'],['つれづれなり','退屈だ','形容動詞'],
  ['あけぼの','明け方','名詞'],['つとめて','早朝','名詞'],['よひ','宵','名詞'],
  ['けふ','今日','名詞'],['けふ','きょう','名詞'],['きのふ','昨日','名詞'],['あす','明日','名詞'],
  ['こぞ','去年','名詞'],['ことし','今年','名詞'],['つきごろ','長い間','名詞'],
  ['われ','私','代名詞'],['われ','わたし','代名詞'],['なんぢ','あなた','代名詞'],
  ['こころ','心','名詞'],['もの','物','名詞'],['ところ','場所','名詞'],
  ['いづこ','どこ','代名詞'],['いかに','どのように','副詞'],['など','なぜ','副詞'],
  ['いかで','なんとかして','副詞'],['やう','様子','名詞'],['やう','よう','名詞'],
  ['ゆゑ','理由','名詞'],['ゆゑ','わけ','名詞'],['げに','なるほど','副詞'],
  ['まことに','本当に','副詞'],['いまだ','まだ','副詞'],['つひに','とうとう','副詞'],
  ['やがて','そのまま','副詞'],['とみに','すぐに','副詞'],['さらに','まったく','副詞'],
  ['かく','このように','副詞'],['さ','そのように','副詞'],['いとど','ますます','副詞'],
  ['なほ','やはり','副詞'],['やうやう','だんだん','副詞'],['とく','早く','副詞'],
  ['いつしか','早くも','副詞'],['おのづから','自然に','副詞'],['みづから','自分で','副詞'],
  ['かたへ','そば','名詞'],['あたり','付近','名詞'],['かしこ','あそこ','代名詞'],
  ['かれ','あの人','代名詞'],['これ','この人','代名詞'],['さる','そのような','連体詞'],
  ['かかる','このような','連体詞'],['いかなる','どのような','連体詞'],
  ['さりながら','しかし','接続詞'],['されば','それゆえ','接続詞'],['さて','それで','接続詞'],
  ['また','また','副詞'],['ともに','一緒に','副詞'],['なり','である','助動詞']
];

const PARTICLES = {
  'は':['は','係助詞','話題を示します。'], 'を':['を','格助詞','動作の対象などを示します。'],
  'が':['が','格助詞','主格・連体修飾など。古語では「の」と訳す場合があります。'],
  'の':['の','格助詞','連体修飾・主格など。前後の構造を確認してください。'],
  'に':['に','格助詞','場所・時点・対象など。別の品詞の「に」もあります。'],
  'へ':['へ','格助詞','移動の方向を示します。'], 'と':['と','格助詞','引用・並列などを示します。'],
  'も':['も','係助詞','同類・追加・強調などを表します。'], 'より':['から','格助詞','起点・比較などを表します。'],
  'まで':['まで','副助詞','範囲の終わりなどを示します。'], 'のみ':['だけ','副助詞','限定を表します。'],
  'ばかり':['ほど','副助詞','程度・限定など。文脈で判断します。'],
  'ども':['けれども','接続助詞','已然形に接続して逆接を表す場合があります。'],
  'ど':['けれども','接続助詞','已然形に接続する逆接を候補にしています。'],
  'て':['て','接続助詞','連用形に接続して前後をつなぎます。'],
  'ば':['ならば／ので','接続助詞','未然形＋ばは仮定、已然形＋ばは確定条件が基本です。'],
  'ぞ':['こそ','係助詞','強調。結びは通常、連体形になります。'],
  'こそ':['こそ','係助詞','強調。結びは通常、已然形になります。'],
  'なむ':['まさに','係助詞','係助詞なら結びは連体形。終助詞などの「なむ」もあります。'],
  'や':['か','係助詞','疑問・反語など。詠嘆の「や」とは別に確認します。'],
  'か':['か','係助詞','疑問・反語など。結びは通常、連体形になります。'],
  'かな':['だなあ','終助詞','詠嘆を表します。'], 'かし':['よ','終助詞','念押し・強調を表します。']
};

const cache = new WeakMap();
const EMPTY_ENTRIES = [];

function makeIndex(entries, direction) {
  const safeEntries=Array.isArray(entries)?entries:EMPTY_ENTRIES;
  let saved=cache.get(safeEntries);
  if (saved?.[direction]) return saved[direction];
  const index=new Map();
  function add(surface, output, data={}) {
    surface=normalize(surface).trim(); output=string(output);
    if (!surface || surface.length>100 || !output) return;
    const key=surface[0];
    if (!index.has(key)) index.set(key,[]);
    const list=index.get(key);
    const existing=list.find(x=>x.surface===surface && x.output===output && x.entryId===data.entryId);
    if(existing) { if(data.form && existing.form && !existing.form.includes(data.form)) existing.form += '／'+data.form; return; }
    list.push({surface,output,lemma:surface,meaning:output,pos:'語句',form:'—',priority:0,...data});
  }
  const classical=direction!=='modern-classical';
  for (const entry of safeEntries) {
    if (!entry?.headword || !entry?.reading) continue;
    const primary=modernMeanings(entry)[0];
    if (!primary) continue;
    const words=[...new Set([entry.headword,entry.reading,...(Array.isArray(entry.aliases)?entry.aliases:[])].map(x=>normalize(x).replace(/[（(][^）)]*[）)]/g,'').trim()).filter(Boolean))];
    const data={lemma:entry.headword,meaning:primary,pos:entry.partOfSpeech||'語',entryId:entry.id,note:entry.caution||'',priority:20};
    const forms=conjugate(entry), modern=modernForms(primary,entry);
    if (classical) {
      for(const w of words) add(w,primary,{...data,form:forms.length?'終止形（見出し形）':'活用なし'});
      for(const row of forms) for(const w of formValues(row.value)) {
        let out=primary;
        if(row.form==='連用形') out=modern?.adverb || modern?.stem || primary;
        if(row.form==='連体形') out=modern?.attributive || primary;
        for(const spelling of orthographicForms(w,entry)) add(spelling,out,{...data,form:row.form,priority:12,note:data.note+(data.note?' ':'')+'同じ語形が複数の活用形になる場合があります。'});
      }
    } else {
      for(const meaning of modernMeanings(entry)) add(meaning,string(entry.headword).replace(/[（(][^）)]*[）)]/g,''),{...data,meaning:entry.summary||primary,form:'見出し形の候補',priority:12});
    }
    if (!forms.length || !modern) continue;
    const mizen=formValues(forms[0].value)[0],renyou=formValues(forms[1].value)[0],shushi=formValues(forms[2].value)[0];
    const useful=[];
    if (/動詞/.test(string(entry.partOfSpeech)) && !/助動詞|形容動詞/.test(string(entry.partOfSpeech))) {
      if(mizen && modern.negative) {
        useful.push([mizen+'ず',modern.negative,'未然形＋打消「ず」','打消の「ず」を使っています。']);
        useful.push([mizen+'ぬ',modern.negative,'未然形＋打消「ず」の連体形','未然形の後の「ぬ」は、打消の「ず」の連体形を候補にしています。']);
      }
      if(renyou && modern.past) {
        useful.push([renyou+'き',modern.past,'連用形＋過去「き」','「き」は経験した過去を表すことがあります。']);
        useful.push([renyou+'けり',modern.past,'連用形＋過去「けり」','「けり」は過去のほか詠嘆にもなります。']);
        useful.push([renyou+'ける',modern.past,'連用形＋「けり」の連体形','「ける」が名詞を修飾するか、係り結びかを確認してください。']);
        useful.push([renyou+'つ',modern.past,'連用形＋完了「つ」','完了の読みを候補にしています。']);
        useful.push([renyou+'ぬ',modern.past,'連用形＋完了「ぬ」','連用形の後の「ぬ」は完了の候補。打消の「ぬ」と区別します。']);
      }
      if(renyou && modern.te) useful.push([renyou+'て',modern.te,'連用形＋接続助詞「て」','動作を次へつなぐ形です。']);
      if(renyou && modern.te) {
        useful.push([renyou+'たり',modern.te+'いる','連用形＋完了・存続「たり」','続いている状態を候補にしています。文脈によっては「〜た」と完了の意味に取ります。']);
        useful.push([renyou+'たる',modern.te+'いる','連用形＋「たり」の連体形','名詞を修飾する存続の候補です。完了の意味になることもあります。']);
      }
      if(mizen && modern.volitional) useful.push([mizen+'む',modern.volitional,'未然形＋「む」','意志の訳を候補にしました。「だろう」という推量なども可能です。']);
      if(mizen && modern.want) useful.push([mizen+'まほし',modern.want,'未然形＋希望「まほし」','希望を表します。']);
      const rHenkaku=/ラ変|ラ行変格/.test(plainConjugation(entry));
      const bekiStem=rHenkaku?formValues(forms[3].value)[0]:shushi;
      if(bekiStem) useful.push([bekiStem+'べし',primary+'べきだ',(rHenkaku?'連体形':'終止形')+'＋「べし」','当然の訳を候補にしました。推量・可能・意志などもあります。ラ変型には連体形で接続します。']);
    }
    for(const [old,now,form,note] of useful) {
      if(classical) for(const spelling of orthographicForms(old,entry)) add(spelling,now,{...data,form,note,priority:35});
      else add(now,old,{...data,form,note,priority:30});
    }
    if(!classical && modern.polite && shushi) add(modern.polite,shushi,{...data,form:'文末表現の候補',note:'現代語の丁寧さは、この候補ではそのまま再現できません。相手に応じて敬語を確認してください。',priority:20});
  }
  for(const [old,now,pos] of BRIDGES) {
    const found=safeEntries.find(e=>e.reading===old || e.headword===old);
    const data={lemma:found?.headword||old,meaning:classical?now:old,pos,entryId:found?.id,priority:classical?21:25,note:'多義語は代表的な意味だけを候補にしています。'};
    add(classical?old:now,classical?now:old,data);
  }
  for(const [old,now,note] of PHRASES) add(classical?old:now,classical?now:old,{lemma:old,meaning:now,pos:'連語・表現',form:'文脈付きの例',note,priority:80});
  for(const [surface,[output,pos,note]] of Object.entries(PARTICLES)) {
    if(classical) add(surface,output,{pos,note,priority:-10,form:'活用なし'});
    else if(['は','を','が','の','に','へ','と','も','まで','て','こそ','か'].includes(surface)) add(surface,surface,{pos,note,priority:-10,form:'活用なし'});
  }
  if(!classical) {
    add('です','なり',{lemma:'なり',meaning:'断定の文末表現',pos:'助動詞',note:'丁寧さや敬語関係は別に確認する必要があります。',priority:25});
    add('である','なり',{lemma:'なり',meaning:'断定',pos:'助動詞',priority:30});
    add('だから','されば',{lemma:'されば',meaning:'前の内容を受けた順接',pos:'接続詞',priority:30});
    add('けれども','されど',{lemma:'されど',meaning:'逆接',pos:'接続詞',priority:30});
  }
  for(const list of index.values()) list.sort((a,b)=>b.surface.length-a.surface.length || b.priority-a.priority);
  saved=saved||{};saved[direction]=index;cache.set(safeEntries,saved);
  return index;
}

function getMatches(text, offset, index) {
  const list=index.get(text[offset])||[];
  return list.filter(c=>text.startsWith(c.surface,offset));
}

/**
 * Explainable, bounded phrase/lexeme conversion. coverage is a ratio 0..1 of
 * matched non-punctuation characters, NOT translation accuracy/confidence.
 */
export function analyzeText(text, direction='classical-modern', entries=EMPTY_ENTRIES) {
  const input=normalize(text).slice(0,10000);
  const actualDirection=direction==='modern-classical'?'modern-classical':'classical-modern';
  if(!input.trim()) return {output:'',summary:'単語や文章を入力すると、対応する語句と活用の候補を確認できます。',tokens:[],notes:[],coverage:0,limitations:['対応する語彙・定型表現に基づく参考候補です。']};
  const index=makeIndex(entries,actualDirection), tokens=[];
  let offset=0, matchedChars=0,totalChars=0;
  while(offset<input.length) {
    const char=String.fromCodePoint(input.codePointAt(offset));
    if(/[\s\p{P}\p{S}]/u.test(char)) {
      tokens.push({surface:char,lemma:char,meaning:'区切り',pos:'記号',form:'—',output:char,known:true});offset+=char.length;continue;
    }
    const matches=getMatches(input,offset,index);
    if(matches.length) {
      const best=matches[0];
      const alternatives=[...new Set(matches.filter(m=>m.surface===best.surface && m.output!==best.output).map(m=>m.output))].slice(0,3);
      const note=[best.note,alternatives.length?'別の語義・訳候補：'+alternatives.join('／')+'。':''].filter(Boolean).join(' ');
      tokens.push({surface:best.surface,lemma:best.lemma,meaning:best.meaning,pos:best.pos,form:best.form,entryId:best.entryId,note,output:best.output,alternatives,known:true});
      matchedChars+=Array.from(best.surface).length;totalChars+=Array.from(best.surface).length;offset+=best.surface.length;
    } else {
      let unknown=char;offset+=char.length;
      while(offset<input.length) {
        const next=String.fromCodePoint(input.codePointAt(offset));
        if(/[\s\p{P}\p{S}]/u.test(next)||getMatches(input,offset,index).length) break;
        unknown+=next;offset+=next.length;
      }
      totalChars+=Array.from(unknown).length;
      tokens.push({surface:unknown,lemma:'未解析',meaning:'対応する語句を確定できません',pos:'未解析',form:'未判定',note:'読みや区切りを変えて調べるか、単語として検索してください。',output:unknown,known:false});
    }
  }
  const unknown=tokens.filter(t=>!t.known);
  const notes=[];
  if(unknown.length) notes.push('未解析の「'+unknown.slice(0,5).map(t=>t.surface).join('」「')+'」は元の表記を残しています。');
  if(tokens.some(t=>t.alternatives?.length)) notes.push('同じ語に複数の意味があります。表の「別の語義・訳候補」も確認してください。');
  if(/こそ/.test(input)) notes.push('「こそ」が係助詞なら、文末・節末が已然形になる係り結びを確認してください。');
  if(/ぞ|なむ/.test(input)) notes.push('「ぞ・なむ」が係助詞なら、結びは通常連体形です。同じ表記の別語には適用しません。');
  if(/ぬ/.test(input)) notes.push('「ぬ」は完了の助動詞、打消「ず」の連体形などの区別が必要です。前の活用形と意味を確認します。');
  if(/なり/.test(input)) notes.push('「なり」は断定、伝聞・推定、動詞「なる」の形などを区別する必要があります。');
  const significant=tokens.filter(t=>t.pos!=='記号');
  const n=significant.filter(t=>t.known).length;
  const coverage=totalChars?matchedChars/totalChars:0;
  const summary=actualDirection==='modern-classical'
    ? `${n}か所の語句・表現を古語の候補に対応づけました。${unknown.length?'未解析の部分を残した下書きです。':'語順・敬語・時代差を確認して使う参考文です。'}`
    : `${n}か所の語句・活用を読み解きました。${unknown.length?'未解析の部分があり、全文の意味は確定していません。':'語義と文脈を照らし合わせるための参考訳です。'}`;
  const limitations=[
    '辞典と文法規則を使う参考候補です。自由文を文脈まで理解する翻訳AIではありません。',
    '主語の省略、掛詞、敬語の向き、反語、長い複文などは確定できません。',
    '一致率は収録語句との照合割合であり、訳の正しさを示す数値ではありません。'
  ];
  if(normalize(text).length>10000) limitations.unshift('解析対象は先頭10,000文字までです。続きは分けて入力してください。');
  return {output:tokens.map(t=>t.output).join(''),summary,tokens,notes,coverage,limitations,mode:'dictionary-reference',direction:actualDirection};
}

const PROPER_READINGS = {
  '葛西書店':'かさいしょてん','古語辞典':'こごじてん','清少納言':'せいしょうなごん','紫式部':'むらさきしきぶ',
  '紀貫之':'きのつらゆき','在原業平':'ありわらのなりひら','吉田兼好':'よしだけんこう','鴨長明':'かものちょうめい',
  '松尾芭蕉':'まつおばしょう','与謝蕪村':'よさぶそん','小林一茶':'こばやしいっさ','正岡子規':'まさおかしき',
  '枕草子':'まくらのそうし','源氏物語':'げんじものがたり','竹取物語':'たけとりものがたり',
  '伊勢物語':'いせものがたり','土佐日記':'とさにっき','蜻蛉日記':'かげろうにっき','更級日記':'さらしなにっき',
  '徒然草':'つれづれぐさ','方丈記':'ほうじょうき','万葉集':'まんようしゅう','古今和歌集':'こきんわかしゅう',
  '新古今和歌集':'しんこきんわかしゅう','平家物語':'へいけものがたり','奥の細道':'おくのほそみち',
  '歴史的仮名遣い':'れきしてきかなづかい','未然形':'みぜんけい','連用形':'れんようけい',
  '終止形':'しゅうしけい','連体形':'れんたいけい','已然形':'いぜんけい','命令形':'めいれいけい',
  '係り結び':'かかりむすび','形容動詞':'けいようどうし','助動詞':'じょどうし','四段活用':'よだんかつよう',
  '上二段':'かみにだん','下二段':'しもにだん','上一段':'かみいちだん','下一段':'しもいちだん',
  'カ変':'かへん','サ変':'さへん','ナ変':'なへん','ラ変':'らへん','御簾':'みす','狩衣':'かりぎぬ',
  '直衣':'のうし','烏帽子':'えぼし','几帳':'きちょう','局':'つぼね'
};

function inflectedPronunciation(entry,surface) {
  const old=baseOf(entry),spoken=hiragana(entry.pronunciation||entry.reading);
  if(surface===old) return spoken;
  if(old===spoken) return surface;
  if(old.endsWith('ふ') && /四段|二段/.test(plainConjugation(entry)) && spoken.endsWith('う')) {
    const oldStem=old.slice(0,-1),newStem=spoken.slice(0,-1);
    if(surface.startsWith(oldStem)) {
      const ending=surface.slice(oldStem.length);
      return newStem+ending.replace(/^[はひふへほ]/,c=>({'は':'わ','ひ':'い','ふ':'う','へ':'え','ほ':'お'}[c]));
    }
  }
  if(/動詞/.test(string(entry.partOfSpeech))&&!/形容動詞|助動詞/.test(string(entry.partOfSpeech))&&old.length>1&&spoken.length>1) {
    const oldStem=old.slice(0,-1),newStem=spoken.slice(0,-1);
    if(surface.startsWith(oldStem)) return newStem+surface.slice(oldStem.length).replace(/[ぢづゐゑ]/g,c=>({'ぢ':'じ','づ':'ず','ゐ':'い','ゑ':'え'}[c]));
  }
  let suffix=0;
  while(suffix<old.length && suffix<spoken.length && old[old.length-1-suffix]===spoken[spoken.length-1-suffix]) suffix++;
  if(suffix) {
    const from=old.slice(0,old.length-suffix),to=spoken.slice(0,spoken.length-suffix);
    if(from && surface.startsWith(from)) return to+surface.slice(from.length);
  }
  return surface;
}

/** Kana reading hints for speech synthesis. Does not claim historical phonetic reconstruction. */
export function speechText(text, entries=EMPTY_ENTRIES, mode='modern') {
  const input=normalize(text);
  if(mode==='raw') return input;
  const replacements=new Map(Object.entries(PROPER_READINGS));
  for(const entry of Array.isArray(entries)?entries:[]) {
    if(!entry?.reading) continue;
    const reading=hiragana(entry.pronunciation||entry.reading);
    if(!reading || /[\p{Script=Han}]/u.test(reading)) continue;
    for(const name of [entry.headword,entry.reading]) {
      const key=string(name).replace(/[（(][^）)]*[）)]/g,'').trim();
      if(key && (key.length>1 || /\p{Script=Han}/u.test(key))) replacements.set(key,mode==='historical'?hiragana(entry.reading):reading);
    }
    if(mode!=='historical') {
      const forms=conjugate(entry);
      const changingKanji=/^(?:来|得|経|寝)$/.test(string(entry.headword));
      for(const row of forms) for(const form of formValues(row.value)) {
        const spoken=inflectedPronunciation(entry,form);
        for(const spelling of orthographicForms(form,entry)) {
          if(changingKanji&&spelling===entry.headword) continue;
          if((spelling.length>1 || /\p{Script=Han}/u.test(spelling)) && spoken!==spelling) replacements.set(spelling,spoken);
        }
      }
      if(changingKanji && forms.length) {
        for(const [rowIndex,endings] of [[0,['ず','ざり','ざる','む','じ','まほし']],[1,['て','けり','ける','たり','たる','つ','つる']]]) {
          const stem=formValues(forms[rowIndex].value)[0];
          if(!stem) continue;
          for(const ending of endings) for(const spelling of orthographicForms(stem+ending,entry)) replacements.set(spelling,inflectedPronunciation(entry,stem)+ending);
        }
      }
    }
  }
  const index=new Map();
  for(const [from,to] of replacements) {
    if(!index.has(from[0])) index.set(from[0],[]);
    index.get(from[0]).push([from,to]);
  }
  for(const list of index.values()) list.sort((a,b)=>b[0].length-a[0].length);
  let result='',i=0;
  while(i<input.length) {
    let match;
    for(const item of index.get(input[i])||[]) {
      if(!input.startsWith(item[0],i)) continue;
      const from=item[0];
      // Avoid reading a single kanji inside a larger unknown compound.
      if(from.length===1 && /\p{Script=Han}/u.test(from) && (/\p{Script=Han}/u.test(input[i-1]||'') || /\p{Script=Han}/u.test(input[i+1]||''))) continue;
      match=item;break;
    }
    if(match) {result+=match[1];i+=match[0].length;} else {const c=String.fromCodePoint(input.codePointAt(i));result+=c;i+=c.length;}
  }
  return result.replace(/[「」『』【】]/g,' ').replace(/[／/]/g,'、').replace(/\n{2,}/g,'。\n');
}

export const poemExamples = [
  {type:'haiku',label:'俳句',title:'春の雨',text:'春の雨\n窓に小さな\n川をひく',reading:'はるのあめ\nまどにちいさな\nかわをひく',summary:'窓を伝って流れる春の雨を、小さな川に見立てた作例です。身近な景色の中に動きを見つけています。',note:'葛西書店の学習用オリジナル作例。季語「春の雨」。切れ字を使わない作例です。'},
  {type:'senryu',label:'川柳',title:'探しもの',text:'探しもの\n手の中にあり\nまた笑う',reading:'さがしもの\nてのなかにあり\nまたわらう',summary:'探していた物が手の中にあると気づく、身近なおかしさを詠んだ作例です。',note:'葛西書店の学習用オリジナル作例。季語は必須ではありません。'},
  {type:'tanka',label:'短歌',title:'帰り道',text:'帰り道\n小さな灯り\n窓に見て\n今日の言葉を\n胸にしまいぬ',reading:'かえりみち\nちいさなあかり\nまどにみて\nきょうのことばを\nむねにしまいぬ',summary:'帰り道に窓の灯りを見て、その日の言葉を大切に心へ収めた作例です。',note:'葛西書店の学習用オリジナル作例。「しまいぬ」の「ぬ」は完了です。'}
];

const SEASON_WORDS = [
  ['春風','春','はるかぜ'],['春の朝','春','はるのあさ'],['春の雨','春','はるのあめ'],['春雨','春','はるさめ'],['春休み','春','はるやすみ'],
  ['桜','春','さくら'],['花見','春','はなみ'],['菜の花','春','なのはな'],['梅','春','うめ'],['霞','春','かすみ'],
  ['山笑ふ','春','やまわらう'],['山笑う','春','やまわらう'],['雪どけ','春','ゆきどけ'],['子猫','春','こねこ'],
  ['蛙','春','かわず'],['かえる','春','かえる'],['鶯','春','うぐいす'],['蝶','春','ちょう'],
  ['五月雨','夏','さみだれ'],['梅雨','夏','つゆ'],['蛍','夏','ほたる'],['青葉','夏','あおば'],
  ['新緑','夏','しんりょく'],['蝉','夏','せみ'],['夕立','夏','ゆうだち'],['風鈴','夏','ふうりん'],
  ['金魚','夏','きんぎょ'],['入道雲','夏','にゅうどうぐも'],['夏休み','夏','なつやすみ'],
  ['秋風','秋','あきかぜ'],['秋の空','秋','あきのそら'],['紅葉','秋','もみじ'],['朝顔','秋','あさがお'],
  ['菊','秋','きく'],['萩','秋','はぎ'],['鈴虫','秋','すずむし'],['天の川','秋','あまのがわ'],
  ['新米','秋','しんまい'],['稲妻','秋','いなずま'],['夜長','秋','よなが'],['夜寒','秋','よさむ'],
  ['星月夜','秋','ほしづきよ'],['ぶどう','秋','ぶどう'],['月','秋','つき'],
  ['木枯らし','冬','こがらし'],['木枯し','冬','こがらし'],['息白し','冬','いきしろし'],['白い息','冬','しろいいき'],
  ['雪','冬','ゆき'],['霜','冬','しも'],['氷','冬','こおり'],['炬燵','冬','こたつ'],['焚火','冬','たきび'],
  ['落葉','冬','おちば'],['枯葉','冬','かれは'],['クリスマス','冬','くりすます'],
  ['初詣','新年','はつもうで'],['初夢','新年','はつゆめ'],['門松','新年','かどまつ'],['お年玉','新年','おとしだま'],
  ['春','春','はる'],['夏','夏','なつ'],['秋','秋','あき'],['冬','冬','ふゆ'],['花','春','はな']
];

function splitPoem(value,expected) {
  const text=normalize(value).trim();
  if(!text) return [];
  let parts=text.split(/[\n／/]+/).map(x=>x.trim()).filter(Boolean);
  if(parts.length===1) {
    const spaced=text.split(/[ \u3000]+/).filter(Boolean);
    if(spaced.length===expected) parts=spaced;
  }
  return parts;
}

function countMora(value) {
  const text=hiragana(value),units=[],warnings=[];
  let unknown=false;
  for(const c of Array.from(text)) {
    if(/[\s\p{P}\p{S}]/u.test(c) && c!=='ー') continue;
    if(/[ゃゅょぁぃぅぇぉゎ]/.test(c)) {
      const prev=units.at(-1);
      const canJoin=prev && (/[ゃゅょ]/.test(c) ? /[きぎしじちぢにひびぴみり]$/.test(prev) : /[ぁ-ゖ]$/.test(prev)&&!/[んっゃゅょぁぃぅぇぉゎ]$/.test(prev));
      if(canJoin) units[units.length-1]+=c;
      else {units.push(c);warnings.push('単独の小書き仮名「'+c+'」は仮に1音と数えました。読みを確認してください。');}
    } else if(/[ぁ-ゖー]/.test(c)) units.push(c);
    else if(/[ゝゞ]/.test(c)) {unknown=true;warnings.push('繰り返し記号は、実際に読む仮名へ直してください。');}
    else {unknown=true;}
  }
  return {mora:unknown?null:units.length,units,unknown,warnings};
}

function seasonCandidates(text) {
  const found=[],occupied=[];
  const candidates=SEASON_WORDS.flatMap(([word,season,reading])=>[
    {surface:word,word,season},
    ...(reading!==word&&reading.length>1?[{surface:reading,word,season}]:[])
  ]).sort((a,b)=>b.surface.length-a.surface.length);
  for(const candidate of candidates) {
    let start=0,index;
    while((index=text.indexOf(candidate.surface,start))!==-1) {
      const end=index+candidate.surface.length;
      const kanaOnly=/^[ぁ-ゖー]+$/.test(candidate.surface);
      const before=text[index-1]||'',after=text[end]||'';
      const beginsWord=!before||/[\s\p{P}\p{S}]/u.test(before);
      const endsWord=!after||/[\s\p{P}\p{S}]/u.test(after);
      const kanaEmbedded=kanaOnly&&!beginsWord&&!endsWord;
      const shortKanjiEmbedded=candidate.surface.length===1&&/\p{Script=Han}/u.test(candidate.surface)&&(/\p{Script=Han}/u.test(before)||/\p{Script=Han}/u.test(after));
      if(!kanaEmbedded&&!shortKanjiEmbedded&&!occupied.some(([a,b])=>index<b&&end>a)) {
        occupied.push([index,end]);found.push({word:candidate.surface,canonical:candidate.word,season:candidate.season,index,note:'語の一致による候補です。季語として使われているかは文脈・歳時記で確認してください。'});
      }
      start=end;
    }
  }
  return found.sort((a,b)=>a.index-b.index);
}

/**
 * Count Japanese mora from the author's explicit kana reading. If kanji remain,
 * the count is intentionally unknown. Phrase boundaries are not fabricated.
 */
export function analyzePoem(text,type='haiku',reading='',entries=EMPTY_ENTRIES) {
  const actualType=['haiku','senryu','tanka'].includes(type)?type:'haiku';
  const label={haiku:'俳句',senryu:'川柳',tanka:'短歌'}[actualType];
  const targetPattern=actualType==='tanka'?[5,7,5,7,7]:[5,7,5];
  const input=normalize(text).slice(0,3000);
  const textLines=splitPoem(input,targetPattern.length);
  let readingLines=Array.isArray(reading)?reading.map(normalize):splitPoem(reading,targetPattern.length);
  const exampleMatch=poemExamples.find(p=>p.type===actualType && p.text.replace(/\s/g,'')===input.replace(/\s/g,''));
  if(!readingLines.length && exampleMatch && textLines.length===targetPattern.length) readingLines=splitPoem(exampleMatch.reading,targetPattern.length);
  const explicit=Boolean(string(reading).trim());
  const notes=[],suggestions=[];
  let needsReading=false;
  const readingAligned=readingLines.length===textLines.length;
  if(readingLines.length && !readingAligned) notes.push('本文と読みの行数が違います。同じ位置で改行してから、行ごとの音数を確認してください。');
  const lines=textLines.map((line,i)=>{
    const supplied=readingAligned?readingLines[i]:'';
    const candidate=supplied||line;
    const counted=countMora(candidate);
    const uncertain=counted.unknown || Boolean(readingLines.length&&!readingAligned);
    if(uncertain) needsReading=true;
    const target=textLines.length===1?targetPattern.reduce((a,b)=>a+b,0):targetPattern[i]??null;
    return {text:line,reading:candidate,mora:uncertain?null:counted.mora,target,exact:!uncertain&&counted.mora===target,uncertain,units:counted.units,readingSource:supplied?(explicit?'user':'example'):'kana',warnings:counted.warnings};
  });
  for(const line of lines) notes.push(...line.warnings);
  const totalMora=needsReading?null:lines.reduce((n,line)=>n+(line.mora||0),0);
  const isRegular=lines.length===targetPattern.length && !needsReading && lines.every(line=>line.exact);
  const seasons=seasonCandidates(input);
  const uniqueSeasons=[...new Set(seasons.map(s=>s.season))];
  const kireji=[];
  for(let i=0;i<textLines.length;i++) {
    const line=textLines[i].replace(/[\s。！!？?、」』]+$/g,'');
    const end=line.match(/(かな|けり|や)$/)?.[1];
    if(end) kireji.push({word:end,line:i+1,note:end==='や'?'詠嘆・切れの候補。疑問や並列の助詞との区別が必要です。':'句末の切れ字候補です。文法上の働きも確認してください。'});
  }
  if(needsReading) suggestions.push('読み欄に、実際に読むひらがな・カタカナを本文と同じ行数で入力してください。漢字の読みは断定していません。');
  if(lines.length && lines.length!==targetPattern.length) suggestions.push(`${label}の定型を確認するには、${targetPattern.join('・')}の各句を${targetPattern.length}行に分けてください。合計音数だけでは句割りを判定できません。`);
  for(let i=0;i<lines.length;i++) {
    const line=lines[i];
    if(line.mora!==null&&line.target!==null&&line.mora!==line.target&&lines.length===targetPattern.length) {
      const delta=line.mora-line.target;
      suggestions.push(`${i+1}句目は目安の${line.target}音に対して${Math.abs(delta)}音${delta>0?'多い':'少ない'}形です。${delta>0?'重なる説明や助詞を見直すと、言葉を絞れます。':'見えた物の名前や動きを一つ具体的にすると、内容を保って整えられます。'}`);
    }
  }
  if(actualType==='haiku') {
    if(!seasons.length) suggestions.push('登録した季語は見つかりませんでした。有季の句を作るなら、中心にする季節の具体物を一つ選んでみてください。未収録の季語や無季俳句もあります。');
    if(seasons.length>1) suggestions.push('季語の候補が複数あります。どれを中心に読むか、季節の重なりに意図があるかを確認してください。複数あるだけで誤りとは限りません。');
    if(kireji.length>1) suggestions.push('切れ字候補が複数あります。意味や息継ぎが細かく分かれすぎていないか、声に出して確認してください。');
    if(!kireji.length) notes.push('「や・かな・けり」の句末候補は見つかりませんでした。切れ字を使わない俳句もあります。');
  } else if(actualType==='senryu') {
    notes.push('川柳には季語・切れ字の必須条件はありません。人物の動作や日常の発見に注目します。');
    suggestions.push('説明しすぎず、行動や会話で気づきを見せられるか考えてみましょう。');
  } else {
    notes.push('短歌には季語の必須条件はありません。上句と下句のつながりや、結句の余韻も大切です。');
    suggestions.push('上の三句で見えた景色と、下の二句で動いた気持ちがどうつながるかを確認してみましょう。');
  }
  if(isRegular) suggestions.unshift('指定した読みでは定型に合っています。次に、残したい場面や言葉がはっきり伝わるかを声に出して確かめてください。');
  notes.push('音数は拍（モーラ）で数えます。「きゃ」は1音、「っ・ん・ー」はそれぞれ1音です。単独の小書き仮名は確認が必要です。');
  notes.push('字余り・字足らずも表現の選択です。定型との一致は作品の優劣を判定するものではありません。');
  notes.push('季語・切れ字は登録語との一致による候補です。掛詞、固有名詞、文脈上の否定などまでは確定できません。');
  let summary;
  if(!input.trim()) summary=`${label}と読みを入力して、音数や言葉の候補を確認しましょう。`;
  else if(exampleMatch) summary=exampleMatch.summary;
  else {
    const subjects=seasons.slice(0,3).map(s=>'「'+s.word+'」');
    const scene=subjects.length?subjects.join('・')+'という季節の言葉が見つかりました。':'登録した季語からは季節を確定できませんでした。';
    summary=scene+(actualType==='senryu'?'日常の出来事や気づきとして、誰が何をしているかを確かめて読む参考作品です。':actualType==='tanka'?'描かれた景色と気持ちのつながりを、各句を追って確かめるための参考分析です。':'景色・動き・感動の中心を、語の取り合わせから確かめるための参考分析です。');
  }
  const knownWords=(Array.isArray(entries)?entries:[]).filter(e=>e.reading&&e.reading.length>1&&(input.includes(e.headword)||input.includes(e.reading))).slice(0,8).map(e=>({word:e.headword,meaning:e.summary,entryId:e.id}));
  return {type:actualType,label,lines,totalMora,targetPattern,needsReading,isRegular,needsSegmentation:lines.length!==targetPattern.length,seasonWords:seasons,seasonCount:seasons.length,seasonOverlap:seasons.length>1,distinctSeasons:uniqueSeasons,kireji,kirejiCount:kireji.length,summary,suggestions:[...new Set(suggestions)],notes:[...new Set(notes)],knownWords,example:poemExamples.find(p=>p.type===actualType),mode:'rule-reference'};
}
