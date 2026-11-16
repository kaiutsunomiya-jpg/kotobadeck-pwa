'use strict';

// 公開ページに最初から表示するCSV。端末内だけのCSVは「CSVを追加」から読み込みます。
const BUNDLED_CSV_FILES = ['韓国語単語41語_例文付き(1).csv'];
const DB_NAME = 'kotobadeck-local-sets'; // 旧版と同じDB名にし、追加済みCSVを引き継ぐ
const DECK_STORE = 'vocabulary-sets';
const REVIEW_STORE = 'review-flags';
const DB_VERSION = 2;

const app = document.getElementById('app');
const fileInput = document.getElementById('csvFileInput');
const state = {
  view: 'menu', sets: [], selectedSetId: null, selectedEntryKey: null,
  shuffled: false, reviewOnly: false, order: [],
  testEntries: [], testIndex: 0, testRevealed: false, testFinished: false,
  starred: new Set(), startupError: ''
};
const svg = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 14 4 4-4 4M18 2l4 4-4 4M2 18h2.5c3.5 0 5.5-2.5 7-5.5S15 6 18 6h4M2 6h2.5c2.1 0 3.7.9 5 2.5M15 15.5c1 1.5 2.1 2.5 3.5 2.5H22"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.3 2 4 13h7l-.3 9L20 11h-7l.3-9Z"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="15" height="16" rx="2"/><path d="M8 9h7M8 13h7M8 17h4M8 2h11a3 3 0 0 1 3 3v13"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 13V6.5a1.5 1.5 0 0 1 3 0V11m0-2a1.5 1.5 0 0 1 3 0v2m0-1a1.5 1.5 0 0 1 3 0v2m0-1a1.5 1.5 0 0 1 3 0v4c0 3-2.5 5-5.5 5H13c-1.5 0-2.7-.5-3.7-1.8L5.1 13a1.6 1.6 0 0 1 2.4-2.1L9 13Z"/></svg>',
  star: '<svg class="star-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="m12 2.8 2.94 6 6.62.96-4.78 4.66 1.13 6.59L12 17.9l-5.91 3.11 1.13-6.59-4.78-4.66 6.62-.96L12 2.8Z"/></svg>'
};

function esc(text) { return String(text ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character])); }
function basename(fileName) { return String(fileName).replace(/\.csv$/i, ''); }
function currentSet() { return state.sets.find(s => s.id === state.selectedSetId) || null; }
function reviewId(setId, entryKey) { return JSON.stringify([setId, entryKey]); }
function isStarred(entry) { return state.starred.has(reviewId(state.selectedSetId, entry.key)); }
function orderedEntries() {
  const set = currentSet();
  if (!set) return [];
  const entries = state.order.map(index => set.entries[index]).filter(Boolean);
  return state.reviewOnly ? entries.filter(isStarred) : entries;
}
function shuffleIndices(length) {
  const indices = Array.from({length}, (_, index) => index);
  for (let i=indices.length-1; i>0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  if (length>1 && indices.every((i,k)=>i===k)) [indices[0],indices[1]]=[indices[1],indices[0]];
  return indices;
}

function parseCSV(contents) {
  const text = String(contents).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let index=0; index<text.length; index++) {
    const ch = text[index];
    if (quoted) {
      if (ch === '"' && text[index+1] === '"') { field += '"'; index++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && !field.length) quoted = true;
    else if (ch === ',') { row.push(field); field=''; }
    else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[index+1] === '\n') index++;
      row.push(field); rows.push(row); row=[]; field='';
    } else field += ch;
  }
  if (quoted) throw new Error('CSVのダブルクォートが閉じられていません。');
  if (field || row.length) { row.push(field); rows.push(row); }
  const nonempty = rows.filter(row => row.some(cell => cell.trim()));
  const expected = ['単語','日本語訳','例文','例文の日本語訳'];
  if (!nonempty.length || expected.some((label,index) => nonempty[0][index]?.trim() !== label) || nonempty[0].length !== 4) {
    throw new Error('1行目は「単語,日本語訳,例文,例文の日本語訳」にしてください。');
  }
  const occur = new Map();
  const entries = nonempty.slice(1).map((fields,index) => {
    if (fields.length!==4) throw new Error(`${index+2}行目を4列にしてください。`);
    const [word,translation,example,exampleJa] = fields.map(x=>x.trim());
    if (!word) throw new Error(`${index+2}行目の単語が空です。`);
    const identity = JSON.stringify([word,translation]);
    const occurrence = occur.get(identity)||0;
    occur.set(identity,occurrence+1);
    return {key: JSON.stringify([word,translation,occurrence]), word, translation, example, exampleJa};
  });
  if (!entries.length) throw new Error('単語がありません。');
  return entries;
}
// 旧PWA版のローカルCSVにも対応：index IDしかないデータを、単語ベースのキーに変換する。
function normalizeEntries(entries) {
  const occurrence = new Map();
  return entries.map(item => {
    const word = String(item.word ?? item.term ?? '');
    const translation = String(item.translation ?? '');
    const identity = JSON.stringify([word,translation]);
    const n = occurrence.get(identity) || 0;
    occurrence.set(identity,n+1);
    return {key: JSON.stringify([word,translation,n]),word,translation,example: String(item.example ?? ''),exampleJa: String(item.exampleJa ?? item.exampleTranslation ?? '')};
  });
}
function openDB() {
  return new Promise((resolve,reject) => {
    if (!('indexedDB' in window)) return reject(new Error('保存機能に対応していません。'));
    const r = indexedDB.open(DB_NAME,DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(DECK_STORE)) db.createObjectStore(DECK_STORE,{keyPath:'id'});
      if (!db.objectStoreNames.contains(REVIEW_STORE)) db.createObjectStore(REVIEW_STORE,{keyPath:'id'});
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error('データベースを開けません。'));
  });
}
async function dbAll(storeName) {
  const db = await openDB();
  return new Promise((resolve,reject) => {
    const tx = db.transaction(storeName,'readonly');
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}
async function dbChange(storeName,operation,recordOrId) {
  const db=await openDB();
  return new Promise((resolve,reject) => {
    const tx=db.transaction(storeName,'readwrite');
    tx.objectStore(storeName)[operation](recordOrId);
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onerror=()=>{db.close();reject(tx.error || new Error('保存できませんでした。'));};
    tx.onabort=()=>{db.close();reject(tx.error || new Error('保存が中断しました。'));};
  });
}
async function saveStar(entry,newValue) {
  const id=reviewId(state.selectedSetId,entry.key);
  if (newValue) await dbChange(REVIEW_STORE,'put',{id, setId:state.selectedSetId,entryKey:entry.key});
  else await dbChange(REVIEW_STORE,'delete',id);
  if (newValue) state.starred.add(id); else state.starred.delete(id);
}
async function clearDeckStars(setId) {
  const ids=[...state.starred].filter(key=>{try{return JSON.parse(key)[0]===setId;}catch(_){return false;}});
  for (const id of ids) {await dbChange(REVIEW_STORE,'delete',id); state.starred.delete(id);}
}

function bar(left,middle,right) {
  return `<header class="bar"><div class="bar-left">${left||''}</div><div class="bar-middle">${middle||''}</div><div class="bar-right">${right||''}</div></header>`;
}
function back(action,caption='戻る') { return `<button type="button" class="button-back" data-action="${action}" aria-label="${esc(caption)}">${svg.back}<span>${esc(caption)}</span></button>`; }
function card(set) {
  return `<button type="button" class="deck" data-action="open-set" data-id="${esc(set.id)}">
  <span class="deck-icon">${svg.book}</span>
  <span class="deck-content"><span class="deck-title">${esc(set.title)}</span><span class="deck-count" style="display:block">${set.entries.length}語</span></span>
  <span class="deck-next">${svg.next}</span></button>`;
}
function renderMenu() {
  const bundled=state.sets.filter(set=>set.kind==='bundled');
  const local=state.sets.filter(set=>set.kind==='local');
  app.innerHTML=`<main class="menu scrollable"><div class="menu-content">
    <div class="brand">たんたんご！</div><div class="slogan">淡々と単語をGO！</div>
    <h2 class="section-title">単語セット</h2>
    <div class="deck-list">${bundled.map(card).join('')}${!bundled.length && !local.length ? '<div class="empty">単語セットがありません</div>':''}</div>
    ${local.length?`<div class="local-group-label">追加した単語セット</div><div class="deck-list">${local.map(set=>`<div class="local-deck-row">${card(set)}<button type="button" class="remove-deck" data-action="delete-set" data-id="${esc(set.id)}" aria-label="${esc(set.title)}を削除">削除</button></div>`).join('')}</div>`:''}
    <div class="import-box"><button type="button" class="main-button" data-action="import-csv">${svg.plus}CSVを追加</button></div>
    ${state.startupError?`<p style="color:#985b50;font-size:13px">${esc(state.startupError)}</p>`:''}
    </div></main>`;
}
function starButton(entry,extraClass='') {
  const selected=isStarred(entry);
  return `<button type="button" class="star-button ${extraClass}${selected?' is-starred':''}" data-action="toggle-star" data-entrykey="${esc(entry.key)}" aria-label="${selected?'復習から外す':'要復習に登録'}：${esc(entry.word)}" aria-pressed="${selected}">${svg.star}</button>`;
}
function renderList(scrollTop=0) {
  const set=currentSet();
  if (!set) {state.view='menu';renderMenu();return;}
  const entries=orderedEntries();
  const reviewButton=`<button type="button" class="button-icon${state.reviewOnly?' active-review':''}" data-action="toggle-review" aria-pressed="${state.reviewOnly}" aria-label="${state.reviewOnly?'全単語を表示':'要復習の単語のみ表示'}" title="要復習">${svg.star}</button>`;
  const shuffleButton=`<button type="button" class="button-icon${state.shuffled?' active-shuffle':''}" data-action="toggle-shuffle" aria-pressed="${state.shuffled}" aria-label="${state.shuffled?'CSV順に戻す':'ランダム順にする'}" title="並び替え">${svg.shuffle}</button>`;
  app.innerHTML=bar(back('go-menu'),`<button type="button" class="button-test" data-action="start-test" ${entries.length?'':'disabled'}>${svg.bolt}テスト</button>`,reviewButton+shuffleButton)+
    `<section class="study-head"><h1 class="study-name">${esc(set.title)}</h1><div class="study-sub"><b>${entries.length}語</b>${state.reviewOnly?' ・ ⭐復習':' ・ '+(state.shuffled?'ランダム順':'CSV順')}</div></section>
    <div class="column-head"><span></span><span>単語</span><span>日本語訳</span></div>
    <main class="words-scroll scrollable" id="wordsViewport"><div class="word-list">
    ${entries.length?entries.map(entry=>`<div class="word-row${state.selectedEntryKey===entry.key?' selected':''}">
      ${starButton(entry)}
      <button type="button" class="word-select" data-action="show-example" data-entrykey="${esc(entry.key)}" aria-pressed="${state.selectedEntryKey===entry.key}">
       <span class="word-text">${esc(entry.word)}</span><span class="word-translation">${esc(entry.translation)}</span></button></div>`).join(''):
      '<div class="empty">⭐を付けた単語がありません</div>'}
    </div></main>`;
  renderPanel();
  const viewport=document.getElementById('wordsViewport');
  if (viewport) viewport.scrollTop=scrollTop;
}
function renderPanel() {
  document.getElementById('examplePanel')?.remove();
  const viewport=document.getElementById('wordsViewport');
  if (!viewport) return;
  const entry=currentSet()?.entries.find(e=>e.key===state.selectedEntryKey);
  if (!entry || (state.reviewOnly&&!isStarred(entry))) {viewport.classList.remove('panel-open');return;}
  viewport.classList.add('panel-open');
  app.insertAdjacentHTML('beforeend', `<aside class="example-panel" id="examplePanel" aria-label="単語と例文">
    <div class="panel-grip"></div>
    <div class="panel-upper"><div class="panel-head"><div class="panel-term">${esc(entry.word)}</div><button type="button" class="close-panel" data-action="close-panel" aria-label="閉じる">×</button></div>
      <div class="panel-meaning">${esc(entry.translation)}</div></div>
    <div class="panel-lower"><p class="example-source">${esc(entry.example)}</p><p class="example-translation">${esc(entry.exampleJa)}</p></div>
    </aside>`);
}
function showEntry(entryKey) {
  state.selectedEntryKey=entryKey;
  document.querySelectorAll('.word-row').forEach(row=>{
    const active=row.querySelector('.word-select')?.dataset.entrykey===entryKey;
    row.classList.toggle('selected',active);
    row.querySelector('.word-select')?.setAttribute('aria-pressed',String(active));
  });
  renderPanel();
}
function testEntry() {return state.testEntries[state.testIndex];}
function renderTest() {
  const entries=state.testEntries;
  if (!entries.length) { state.view='list';renderList();return; }
  const completed=state.testFinished;
  const count=Math.min(state.testIndex+1,entries.length);
  app.innerHTML=bar(back('return-list'),'<span class="bar-title">テスト</span>',`<span class="test-counter">${count}/${entries.length}</span>`)+
   `<div class="test-progress"><div style="width:${100*(completed?1:state.testIndex/entries.length)}%"></div></div>`;
  if (completed) {
    app.insertAdjacentHTML('beforeend',`<main class="done"><div class="done-mark">✓</div><div class="done-title">テスト完了！</div><div class="done-count">${entries.length}語</div>
     <div class="done-actions"><button type="button" class="main-button" data-action="restart-test">もう一度</button><button type="button" class="light-button" data-action="return-list">一覧に戻る</button></div></main>`);
    return;
  }
  const entry=testEntry();
  const revealed=state.testRevealed;
  // 単語の位置は表と裏で同じ。例文エリアのみ下半分に出す。
  app.insertAdjacentHTML('beforeend',`<main class="test-stage">
    <button type="button" class="test-tap${revealed?' is-answer':''}" data-action="advance-test" aria-label="${revealed?'次の単語へ':'解答を見る'}">
      <div class="test-top"><div class="test-word">${esc(entry.word)}</div>
        ${revealed?`<div class="test-meaning">${esc(entry.translation)}</div>`:''}
      </div>
      <div class="test-bottom">${revealed?`<div class="test-bottom-inner"><p class="test-example">${esc(entry.example)}</p><p class="test-ja">${esc(entry.exampleJa)}</p></div>`:''}</div>
    </button>
    <div class="tap-indicator" aria-hidden="true">${svg.hand}</div>
    ${revealed?starButton(entry,'test-star'):''}
  </main>`);
}
function render(scrollTop=0) {
  if (state.view==='menu') renderMenu();
  if (state.view==='list') renderList(scrollTop);
  if (state.view==='test') renderTest();
}
let toastTimeout;
function toast(message) {
  document.querySelector('.toast')?.remove();
  const div=document.createElement('div'); div.className='toast'; div.role='status'; div.textContent=message;
  document.body.appendChild(div);
  clearTimeout(toastTimeout); toastTimeout=setTimeout(()=>div.remove(),3300);
}
async function toggleStar(entryKey,button) {
  const entry=currentSet()?.entries.find(e=>e.key===entryKey);
  if (!entry || button.disabled) return;
  button.disabled=true;
  try {
    await saveStar(entry,!isStarred(entry));
    if (state.view==='test') {
      // テスト途中の出題順は固定。復習フラグだけ変更する。
      renderTest();
    } else if (state.reviewOnly) {
      // ⭐フィルタ中に星を外した単語は、リストから即時除外する。
      const scroll=document.getElementById('wordsViewport')?.scrollTop || 0;
      if (state.selectedEntryKey===entry.key && !isStarred(entry)) state.selectedEntryKey=null;
      renderList(scroll);
    } else {
      const starred=isStarred(entry);
      button.classList.toggle('is-starred',starred);
      button.setAttribute('aria-pressed',String(starred));
      button.setAttribute('aria-label',`${starred?'復習から外す':'要復習に登録'}：${entry.word}`);
    }
  } catch (error) {toast('保存に失敗しました：'+error.message);}
  finally {button.disabled=false;}
}
app.addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');
  if (!button || button.disabled) return;
  const action=button.dataset.action;
  try {
    switch(action) {
    case 'open-set': {
      const set=state.sets.find(x=>x.id===button.dataset.id);
      if (!set) return;
      state.selectedSetId=set.id;
      state.order=set.entries.map((_,i)=>i);
      state.selectedEntryKey=null;
      state.shuffled=false; state.reviewOnly=false;
      state.view='list'; render(); return;
    }
    case 'go-menu': state.view='menu';state.selectedEntryKey=null;render();return;
    case 'show-example': showEntry(button.dataset.entrykey);return;
    case 'close-panel': showEntry(null);return;
    case 'toggle-shuffle': {
      const scroll=document.getElementById('wordsViewport')?.scrollTop||0;
      state.shuffled=!state.shuffled;
      const entries=currentSet()?.entries||[];
      state.order=state.shuffled?shuffleIndices(entries.length):entries.map((_,i)=>i);
      renderList(scroll);return;
    }
    case 'toggle-review': {
      state.reviewOnly=!state.reviewOnly;
      state.selectedEntryKey=null;
      renderList(); return;
    }
    case 'toggle-star': await toggleStar(button.dataset.entrykey,button);return;
    case 'start-test': {
      state.testEntries=orderedEntries().slice(); // テスト中は現在の対象語を固定
      if (!state.testEntries.length) {toast('テストする単語がありません');return;}
      state.testIndex=0; state.testFinished=false;state.testRevealed=false;
      state.view='test';renderTest();return;
    }
    case 'advance-test': {
      if (!state.testRevealed) state.testRevealed=true;
      else if (state.testIndex+1<state.testEntries.length) {state.testIndex++;state.testRevealed=false;}
      else state.testFinished=true;
      renderTest();return;
    }
    case 'restart-test': state.testIndex=0;state.testRevealed=false;state.testFinished=false;renderTest();return;
    case 'return-list': state.view='list';renderList();return;
    case 'import-csv': fileInput.click();return;
    case 'delete-set': {
      const set=state.sets.find(s=>s.id===button.dataset.id && s.kind==='local');
      if (!set || !confirm(`「${set.title}」を削除しますか？`)) return;
      await dbChange(DECK_STORE,'delete',set.id);
      await clearDeckStars(set.id);
      state.sets=state.sets.filter(s=>s.id!==set.id);
      renderMenu();return;
    }
    }
  } catch(error) {toast(error.message||'操作できませんでした');}
});
fileInput.addEventListener('change',async()=>{
  const files=Array.from(fileInput.files||[]);fileInput.value='';
  if (!files.length) return;
  let success=0;const errors=[];
  for (const file of files) {
    try {
      if (!/\.csv$/i.test(file.name)) throw new Error('CSVを選択してください。');
      if (file.size>15*1024*1024) throw new Error('15MB以下にしてください。');
      const entries=parseCSV(await file.text());
      const existing=state.sets.find(s=>s.kind==='local'&&s.fileName===file.name);
      const record={id: existing?.id||`local-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,
        kind:'local',fileName:file.name,title:basename(file.name),entries,savedAt:new Date().toISOString()};
      await dbChange(DECK_STORE,'put',record);
      state.sets=state.sets.filter(s=>s.id!==record.id);
      state.sets.push(record);success++;
    } catch(error) {errors.push(`${file.name}: ${error.message}`);}
  }
  state.sets.sort((a,b)=>Number(a.kind==='local')-Number(b.kind==='local'));
  renderMenu();
  if (success) toast(`${success}件追加しました`);
  if (errors.length) alert(errors.join('\n'));
});
async function boot() {
  const bundled=[];
  for (const fileName of BUNDLED_CSV_FILES) {
    try {
      const response=await fetch(`./VocabularySets/${encodeURIComponent(fileName)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const entries=parseCSV(await response.text());
      bundled.push({id:`bundled:${fileName}`,kind:'bundled',fileName,title:basename(fileName),entries});
    } catch(error) {state.startupError+=`CSVを読み込めません：${fileName} (${error.message}) `;}
  }
  let local=[];
  try {
    const [storedSets,stars]=await Promise.all([dbAll(DECK_STORE),dbAll(REVIEW_STORE)]);
    local=storedSets.map(s=>({...s,entries:normalizeEntries(s.entries || [])}));
    state.starred=new Set(stars.map(s=>s.id));
  } catch(error) {state.startupError+='端末内保存を使用できません。';}
  state.sets=[...bundled,...local];renderMenu();
  if ('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Offline cache:',error));
  }
}
boot();
