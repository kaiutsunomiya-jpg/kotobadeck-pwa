'use strict';

// 追加したい公開用CSVは、この配列にファイル名を追加してください。
// iPhone上だけに保存したいCSVは、メニューの「CSVを追加」から読み込めます。
const BUNDLED_CSV_FILES = ['韓国語単語41語_例文付き(1).csv'];
const DB_NAME = 'kotobadeck-local-sets';
const DB_STORE = 'vocabulary-sets';
const app = document.getElementById('app');
const fileInput = document.getElementById('csvFileInput');

const state = {
  view: 'menu',
  sets: [],
  selectedSetId: null,
  selectedEntryId: null,
  shuffled: false,
  order: [],
  testIndex: 0,
  testRevealed: false,
  testFinished: false,
  startupError: '',
};

const icon = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 14 4 4-4 4M18 2l4 4-4 4M2 18h2.5c3.5 0 5.5-2.5 7-5.5S15 6 18 6h4M2 6h2.5c2.1 0 3.7.9 5 2.5M15 15.5c1 1.5 2.1 2.5 3.5 2.5H22"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.3 2 4 13h7l-.3 9L20 11h-7l.3-9Z"/></svg>',
  cards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="15" height="16" rx="2"/><path d="M8 9h7M8 13h7M8 17h4M8 2h11a3 3 0 0 1 3 3v13"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
  add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9 17l11-11"/></svg>',
  tap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 13V6.5a1.5 1.5 0 0 1 3 0V11m0-2a1.5 1.5 0 0 1 3 0v2m0-1a1.5 1.5 0 0 1 3 0v2m0-1a1.5 1.5 0 0 1 3 0v4c0 3-2.5 5-5.5 5H13c-1.5 0-2.7-.5-3.7-1.8L5.1 13a1.6 1.6 0 0 1 2.4-2.1L9 13Z"/></svg>',
};

function escapeHTML(text) {
  return String(text ?? '').replace(/[&<>"']/g, value => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[value]));
}
function basename(filename) { return String(filename).replace(/\.csv$/i, ''); }
function currentSet() { return state.sets.find(set => set.id === state.selectedSetId) || null; }
function currentEntries() { const set = currentSet(); return set ? state.order.map(index => set.entries[index]) : []; }
function shuffleIndices(size) {
  const result = Array.from({ length: size }, (_, i) => i);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  // 2語以上の場合は偶然元の順序になっても並べ替えとして見えるようにする。
  if (size > 1 && result.every((value, index) => value === index)) [result[0], result[1]] = [result[1], result[0]];
  return result;
}

// RFC 4180互換の基本的な引用符・改行・カンマ処理。UTF-8 BOMにも対応。
function parseCSV(contents) {
  let text = String(contents).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { quoted = false; }
      else { cell += ch; }
    } else if (ch === '"' && cell === '') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell); cell = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else {
      cell += ch;
    }
  }
  if (quoted) throw new Error('CSV内の引用符（"）が閉じられていません。');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const nonempty = rows.filter(row => row.some(cell => cell.trim().length));
  if (!nonempty.length) throw new Error('CSVが空です。');
  const expected = ['単語', '日本語訳', '例文', '例文の日本語訳'];
  const header = nonempty[0].map(col => col.trim());
  if (header.length !== 4 || expected.some((name, i) => header[i] !== name)) {
    throw new Error('1行目は「単語,日本語訳,例文,例文の日本語訳」にしてください。');
  }
  const entries = nonempty.slice(1).map((cells, rowIndex) => {
    if (cells.length !== 4) throw new Error(`${rowIndex + 2}行目の列数が4ではありません。引用符やカンマを確認してください。`);
    const [word, translation, example, exampleJa] = cells.map(value => value.trim());
    if (!word) throw new Error(`${rowIndex + 2}行目の単語が空です。`);
    return { id: rowIndex, word, translation, example, exampleJa };
  });
  if (!entries.length) throw new Error('単語が1件もありません。');
  return entries;
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('このブラウザでは端末内保存を利用できません。'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('保存領域を開けません。'));
  });
}
async function getLocalSets() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const request = tx.objectStore(DB_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}
async function putLocalSet(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(record);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error('保存に失敗しました。')); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error('保存が中断されました。')); };
  });
}
async function deleteLocalSet(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

function header({ left = '', middle = '', right = '', clear = false } = {}) {
  return `<header class="app-header${clear ? ' app-header--clear' : ''}">
    <div class="header-left">${left}</div><div class="header-center">${middle}</div><div class="header-right">${right}</div>
  </header>`;
}
function backButton(action, caption) {
  return `<button type="button" class="nav-button" data-action="${action}" aria-label="${escapeHTML(caption)}">${icon.back}<span>${escapeHTML(caption)}</span></button>`;
}
function renderMenu() {
  const sets = state.sets;
  const builtins = sets.filter(set => set.kind === 'bundled');
  const local = sets.filter(set => set.kind === 'local');
  const card = (set) => `<button type="button" class="set-card" data-action="open-set" data-id="${escapeHTML(set.id)}">
    <span class="set-mark">${icon.cards}</span>
    <span class="set-content"><span class="set-name">${escapeHTML(set.title)}</span><span class="set-meta" style="display:block">${set.entries.length}語・${set.kind === 'local' ? 'iPhone内に保存' : '同梱CSV'}</span></span>
    <span class="set-arrow">${icon.arrow}</span></button>`;
  app.innerHTML = `${header({ middle: '<div class="header-title">KotobaDeck</div>' })}
    <main class="menu-page scroll-area"><div class="menu-inner">
      <section class="hero">
        <div class="hero-line"><img class="hero-icon" src="./icons/apple-touch-icon.png" alt="KotobaDeck アイコン">
          <div><div class="eyebrow">YOUR LITTLE WORD LIBRARY</div><h1>ことばを、ひとつずつ。</h1></div>
        </div>
        <p>読みたい単語セットを選んで、今日の学習を始めましょう。</p>
      </section>
      <div class="section-head"><h2>単語セット</h2><span class="mini-counter">${sets.length}セット</span></div>
      ${state.startupError ? `<div class="error-panel">${escapeHTML(state.startupError)}</div>` : ''}
      <div class="set-stack">${builtins.map(card).join('') || '<p class="import-caption">同梱CSVがありません。</p>'}</div>
      ${local.length ? `<div class="local-label">このiPhoneに追加したセット</div><div class="set-stack">${local.map(set => `<div class="local-set-row">${card(set)}<button type="button" class="delete-button" data-action="delete-set" data-id="${escapeHTML(set.id)}" aria-label="${escapeHTML(set.title)}を削除">削除</button></div>`).join('')}</div>` : ''}
      <div class="import-panel">
        <div class="import-title">新しい単語セットを追加</div>
        <p class="import-caption">CSVを「ファイル」アプリから選択すると、このiPhoneに保存されます。Xcode・Mac・再公開は不要です。</p>
        <button type="button" class="primary-button" data-action="import-csv">${icon.add}CSVを追加</button>
      </div>
      <p class="notice">CSV形式：単語,日本語訳,例文,例文の日本語訳<br>インポートした単語はこのWebアプリの端末内ストレージに保存されます。端末のデータ消去やアプリ削除で失われることがあるため、元のCSVを保管してください。</p>
    </div></main>`;
}
function renderList() {
  const set = currentSet();
  if (!set) { state.view = 'menu'; renderMenu(); return; }
  const shuffleText = state.shuffled ? 'CSV順に戻す' : 'ランダムにする';
  app.innerHTML = `${header({
    left: backButton('go-menu','セット'),
    middle: `<button type="button" class="center-action" data-action="start-test">${icon.bolt} テスト</button>`,
    right: `<button type="button" class="icon-button" data-action="toggle-shuffle" aria-pressed="${state.shuffled}" aria-label="${shuffleText}" title="${shuffleText}">${icon.shuffle}<span style="font-size:12px">${state.shuffled ? 'ランダム' : 'CSV順'}</span></button>`
  })}
    <section class="study-heading"><h1 class="study-title">${escapeHTML(set.title)}</h1>
      <div class="study-info"><span class="count-accent">${set.entries.length}語</span><span>・</span><span>${state.shuffled ? 'ランダム順' : 'CSVの登録順'}</span></div>
    </section>
    <div class="study-table-head"><span>単語</span><span>日本語訳</span></div>
    <main id="listViewport" class="list-viewport scroll-area" aria-label="単語一覧">
      <div class="word-stack">${currentEntries().map(entry => `<button type="button" class="word-row${state.selectedEntryId === entry.id ? ' selected' : ''}" data-action="show-example" data-entry="${entry.id}" aria-pressed="${state.selectedEntryId === entry.id}" aria-label="${escapeHTML(entry.word)}、${escapeHTML(entry.translation)}。例文を見る">
        <span class="word-term">${escapeHTML(entry.word)}</span><span class="word-meaning">${escapeHTML(entry.translation)}</span>
      </button>`).join('')}</div>
    </main>`;
  renderPanel();
}
function renderPanel() {
  document.getElementById('detailPanel')?.remove();
  const list = document.getElementById('listViewport');
  if (!list) return;
  list.classList.toggle('has-panel', state.selectedEntryId !== null);
  if (state.selectedEntryId === null) return;
  const entry = currentSet()?.entries.find(e => e.id === state.selectedEntryId);
  if (!entry) return;
  app.insertAdjacentHTML('beforeend', `<aside class="example-panel" id="detailPanel" aria-label="単語の例文">
    <div class="panel-handle" aria-hidden="true"></div>
    <div class="panel-header"><div><div class="panel-kicker">EXAMPLE</div><div class="panel-title">${escapeHTML(entry.word)}</div></div>
    <button type="button" class="close-button" data-action="close-example" aria-label="例文パネルを閉じる">×</button></div>
    <div class="panel-content"><div class="example-label">例文</div><p class="example-korean">${escapeHTML(entry.example) || '（例文なし）'}</p>
      <hr class="line"><div class="example-label">例文の日本語訳</div><p class="example-ja">${escapeHTML(entry.exampleJa) || '（訳なし）'}</p>
    </div></aside>`);
}
function updateSelection(entryId) {
  state.selectedEntryId = entryId;
  document.querySelectorAll('.word-row').forEach(element => {
    const selected = Number(element.dataset.entry) === entryId;
    element.classList.toggle('selected', selected);
    element.setAttribute('aria-pressed', String(selected));
  });
  renderPanel();
}
function renderTest() {
  const entries = currentEntries();
  const total = entries.length;
  if (!total) { state.view = 'list'; renderList(); return; }
  const count = Math.min(state.testIndex + 1, total);
  app.innerHTML = `${header({
    left: backButton('return-list', '戻る'),
    middle: '<div class="header-title">単語テスト</div>',
    right: `<span class="test-progress" aria-label="テスト進捗 ${count} / ${total}">${count} / ${total}</span>`
  })}
    <div class="test-progress-line" aria-hidden="true"><div class="test-progress-fill" style="width:${100 * (state.testFinished ? 1 : state.testIndex / total)}%"></div></div>
    ${state.testFinished ? `<div class="test-page"><div class="test-surface" style="cursor:auto">
      <div class="finished-mark">${icon.check}</div><div class="finished-title">おつかれさま！</div>
      <div class="finished-subtitle">${total}語のテストを最後まで終えました。</div>
      <div class="finished-actions"><button type="button" class="primary-button" data-action="restart-test">もう一度</button><button type="button" class="secondary-button" data-action="return-list">単語一覧へ</button></div>
    </div></div>` : renderTestStep(entries[state.testIndex])}`;
}
function renderTestStep(entry) {
  if (!state.testRevealed) return `<div class="test-page">
    <button type="button" class="test-surface" data-action="advance-test" aria-label="日本語訳と例文を表示">
      <span class="test-eyebrow">WORD</span><span class="test-word">${escapeHTML(entry.word)}</span>
      <span class="test-prompt">${icon.tap} 画面をタップして答えを見る</span>
    </button></div>`;
  return `<div class="test-page">
    <button type="button" class="test-surface" data-action="advance-test" aria-label="次の単語へ進む">
      <div class="test-answer-wrap"><div class="test-eyebrow" style="text-align:center">ANSWER</div>
        <div class="test-answer-top">${escapeHTML(entry.word)}</div>
        <div class="test-meaning">${escapeHTML(entry.translation)}</div>
        <div class="answer-card"><div class="test-answer-label">例文</div><p class="test-example">${escapeHTML(entry.example) || '（例文なし）'}</p>
          <hr class="line"><div class="test-answer-label">例文の日本語訳</div><p class="test-example-ja">${escapeHTML(entry.exampleJa) || '（訳なし）'}</p></div>
      </div><span class="test-prompt">${icon.tap} タップして${state.testIndex === state.order.length - 1 ? 'テストを終了' : '次の単語へ'}</span>
    </button></div>`;
}
function render() {
  if (state.view === 'menu') renderMenu();
  else if (state.view === 'list') renderList();
  else if (state.view === 'test') renderTest();
}

let toastTimer;
function toast(message) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast'; el.role = 'status'; el.textContent = message;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 3500);
}

app.addEventListener('click', async event => {
  const target = event.target.closest('button[data-action]');
  if (!target || target.disabled) return;
  const action = target.dataset.action;
  try {
    if (action === 'import-csv') { fileInput.click(); return; }
    if (action === 'open-set') {
      const set = state.sets.find(s => s.id === target.dataset.id);
      if (!set) return;
      state.selectedSetId = set.id;
      state.shuffled = false;
      state.order = set.entries.map((_, index) => index);
      state.selectedEntryId = null;
      state.view = 'list'; renderList(); return;
    }
    if (action === 'delete-set') {
      const set = state.sets.find(s => s.id === target.dataset.id);
      if (!set || set.kind !== 'local' || !window.confirm(`「${set.title}」をこのiPhoneから削除しますか？\n元のCSVファイルは削除されません。`)) return;
      await deleteLocalSet(set.id);
      state.sets = state.sets.filter(s => s.id !== set.id);
      renderMenu(); toast('単語セットを削除しました。'); return;
    }
    if (action === 'go-menu') { state.view = 'menu'; state.selectedEntryId = null; renderMenu(); return; }
    if (action === 'toggle-shuffle') {
      state.shuffled = !state.shuffled;
      const set = currentSet();
      state.order = state.shuffled ? shuffleIndices(set.entries.length) : set.entries.map((_, i) => i);
      renderList(); return;
    }
    if (action === 'show-example') { updateSelection(Number(target.dataset.entry)); return; }
    if (action === 'close-example') { updateSelection(null); return; }
    if (action === 'start-test') { state.view = 'test'; state.testIndex = 0; state.testRevealed = false; state.testFinished = false; renderTest(); return; }
    if (action === 'return-list') { state.view = 'list'; renderList(); return; }
    if (action === 'restart-test') { state.testIndex = 0; state.testRevealed = false; state.testFinished = false; renderTest(); return; }
    if (action === 'advance-test') {
      if (!state.testRevealed) state.testRevealed = true;
      else if (state.testIndex >= state.order.length - 1) state.testFinished = true;
      else { state.testIndex++; state.testRevealed = false; }
      renderTest();
    }
  } catch (error) { toast('操作に失敗しました：' + error.message); }
});

fileInput.addEventListener('change', async () => {
  const files = Array.from(fileInput.files || []);
  fileInput.value = ''; // 同じCSVを再度選択できるようにする
  if (!files.length) return;
  let success = 0, errors = [];
  for (const file of files) {
    try {
      if (!/\.csv$/i.test(file.name)) throw new Error('CSVファイルを選んでください。');
      if (file.size > 15 * 1024 * 1024) throw new Error('ファイルが大きすぎます（上限15MB）。');
      const entries = parseCSV(await file.text());
      const existing = state.sets.find(set => set.kind === 'local' && set.fileName === file.name);
      const record = {
        id: existing?.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'local', title: basename(file.name), fileName: file.name, entries,
        savedAt: new Date().toISOString()
      };
      await putLocalSet(record); // 保存に成功してから画面に反映する
      if (existing) state.sets = state.sets.filter(set => set.id !== existing.id);
      state.sets.push(record);
      success++;
    } catch (error) { errors.push(`${file.name}: ${error.message}`); }
  }
  state.sets.sort((a,b) => (a.kind === 'bundled' ? 0 : 1) - (b.kind === 'bundled' ? 0 : 1));
  renderMenu();
  if (success) toast(`${success}件のCSVを保存しました。`);
  if (errors.length) window.alert('読み込めないファイルがありました。\n' + errors.join('\n'));
});

async function boot() {
  const bundles = [];
  for (const fileName of BUNDLED_CSV_FILES) {
    try {
      const response = await fetch(`./VocabularySets/${encodeURIComponent(fileName)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const entries = parseCSV(await response.text());
      bundles.push({ id: `bundled:${fileName}`, kind: 'bundled', fileName, title: basename(fileName), entries });
    } catch (error) {
      state.startupError += `同梱CSV「${fileName}」を読み込めませんでした（${error.message}）。`;
    }
  }
  let local = [];
  try { local = await getLocalSets(); }
  catch (error) { toast('このブラウザではCSVの端末内保存を利用できない可能性があります。'); }
  state.sets = [...bundles, ...local];
  renderMenu();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Offline cache unavailable:', error));
  }
}
boot();
