// Prüft Daten und alle generierten Levels.  node test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const store = {}; globalThis.localStorage = { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } };
['core.js', 'data/a1.js', 'data/a2.js', 'data/b1.js', 'data/b2.js', 'data/c1.js', 'engine.js', 'levels.js', 'store.js', 'game.js'].forEach(f => vm.runInThisContext(src(f), { filename: f }));
let problems = 0; const bad = m => { problems++; console.log('  !', m); };
const seen = {};
for (const s of KW.STAGES) {
  const ws = KW.WORDS[s.id];
  for (const w of ws) {
    if (!w.en || !w.def || !w.ex) bad(`${s.id} ${w.lemma}: Feld fehlt`);
    if (!/^[A-ZÄÖÜß]{3,11}$/.test(w.answer)) bad(`${s.id} ${w.lemma}: Lösung "${w.answer}" ungültig`);
    if ((w.ex.match(/___/g) || []).length < 1) bad(`${s.id} ${w.lemma}: Beispiel ohne Lücke`);
    const low = w.lemma.toLowerCase();
    if (new RegExp('(^|[^a-zäöüß])' + low + '([^a-zäöüß]|$)', 'i').test(w.def)) bad(`${s.id} ${w.lemma}: Umschreibung verrät das Wort`);
    if (new RegExp('(^|[^a-zäöüß])' + low + '([^a-zäöüß]|$)', 'i').test(w.ex)) bad(`${s.id} ${w.lemma}: Beispiel verrät das Wort`);
    if (seen[w.answer]) bad(`${w.lemma}: doppelt (${seen[w.answer]} und ${s.id})`); else seen[w.answer] = s.id;
  }
  const t0 = Date.now(), levels = KW.stageLevels(s.id), ms = Date.now() - t0;
  const used = {}; let repeats = 0, minW = 99, maxW = 0, maxC = 0, maxR = 0, firstRepeat = null;
  levels.forEach(l => {
    minW = Math.min(minW, l.entries.length); maxW = Math.max(maxW, l.entries.length); maxC = Math.max(maxC, l.cols); maxR = Math.max(maxR, l.rows);
    const grid = {};
    l.entries.forEach(e => {
      if (used[e.word.answer]) { repeats++; firstRepeat = firstRepeat || l.id; } used[e.word.answer] = 1;
      e.cells.forEach((c, k) => { if (grid[c] && grid[c] !== e.letters[k]) bad(l.id + ': Kreuzung passt nicht'); grid[c] = e.letters[k]; });
    });
    // jedes Wort muss mindestens ein anderes kreuzen; keine zufälligen Nachbarschaften
    l.entries.forEach(e => { if (l.entries.length > 1 && !e.cells.some(c => l.entries.some(o => o !== e && o.cells.includes(c)))) bad(l.id + ': ' + e.word.lemma + ' kreuzt nichts'); });
    for (let r = 0; r < l.rows; r++) for (const dir of ['a', 'd']) {
      const lines = dir === 'a' ? l.rows : l.cols, len = dir === 'a' ? l.cols : l.rows;
      for (let i = 0; i < lines; i++) { let run = [];
        for (let j = 0; j <= len; j++) { const c = dir === 'a' ? i * l.cols + j : j * l.cols + i; const filled = j < len && grid[c];
          if (filled) run.push(c); else { if (run.length > 1 && !l.entries.some(e => e.dir === dir && e.cells.length === run.length && e.cells[0] === run[0])) bad(l.id + ': Buchstabenfolge ohne Wort'); run = []; } } }
      break;
    }
    const s2 = new KW.Session(l); l.entries.forEach((e, i) => e.cells.forEach((c, k) => s2.setLetter(c, e.letters[k])));
    if (!s2.complete || s2.stars() !== 3) bad(l.id + ': nicht lösbar');
  });
  console.log(`${s.id}: ${ws.length} Wörter, ${levels.length} Levels, ${minW}–${maxW} Wörter/Level, Gitter bis ${maxC}×${maxR}, ${repeats} Wiederholungen${firstRepeat ? ' ab ' + firstRepeat : ''}, ${ms} ms`);
}
const d = KW.dailyPuzzle('B1', '2026-10-08'); console.log('Tagesrätsel:', d.entries.map(e => e.word.lemma).join(', '));
console.log(KW.explainError('GRUN', 'GRÜN', 1), '|', KW.explainError('VEIR', 'VIER', 2), '|', KW.explainError('GROSS'.slice(0,4), 'GROß', 1));
console.log(problems ? problems + ' Probleme' : 'Alles in Ordnung');
