/* ============================================================
   ui.js – Oberfläche. Liest aus KW.Store und KW.Session,
   enthält selbst keine Spielregeln.
   ============================================================ */
(function (KW) {
  const S = KW.Store, root = document.getElementById('app');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const svg = (d, fill) => `<svg viewBox="0 0 24 24" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${d}</svg>`;
  const I = {
    star: svg('<path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z"/>', true),
    flame: svg('<path d="M12.5 2c.6 3.4-2 5-3.6 7.2C7.6 11 7 12.600 7 14.300a5.300 5.300 0 0 0 10.600 0c0-2-.9-3.600-2-4.900-.3 1.300-1 2.100-1.900 2.500.6-3.300-.3-7-1.200-9.900z"/>', true),
    bolt: svg('<path d="M13.500 2L4.500 13.500H11l-1 8.500 9-11.500h-6.500z"/>', true),
    back: svg('<path d="M15 5l-7 7 7 7"/>'), next: svg('<path d="M9 5l7 7-7 7"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    bulb: svg('<path d="M9 18h6M10 21h4M8.500 14.500A6 6 0 1 1 15.500 14.500c-.700.600-1 1.300-1 2H9.500c0-.700-.300-1.400-1-2z"/>'),
    letter: svg('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9.500 16l2.500-8 2.500 8M10.300 13.500h3.400"/>'),
    eye: svg('<path d="M2 12s3.600-6.500 10-6.500S22 12 22 12s-3.600 6.500-10 6.500S2 12 2 12z"/><circle cx="12" cy="12" r="2.800"/>'),
    del: svg('<path d="M9 5h11v14H9l-6-7z"/><path d="M12.500 9.500l5 5M17.500 9.500l-5 5"/>'),
    flag: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
    medal: svg('<circle cx="12" cy="14" r="6"/><path d="M8.500 9L6 3h4l2 4 2-4h4l-2.500 6"/>')
  };
  const stars = (n, big) => `<span class="stars${big ? ' big' : ''}" role="img" aria-label="${n} von 3 Sternen">${[0, 1, 2].map(i => `<span class="${i < n ? 'on' : ''}" style="--i:${i}">${I.star}</span>`).join('')}</span>`;
  const coarse = () => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };

  const ui = { screen: 'home', tabStage: null, filter: 'all', result: null, resetArmed: false };
  let G = null;   // laufendes Spiel: { s, sel, cur, bad:Set, fb }

  /* ---------- Design ---------- */
  const hostTheme = document.documentElement.getAttribute('data-theme');
  function applyTheme() {
    const t = S.data.settings.theme, el = document.documentElement;
    if (t === 'system') { hostTheme ? el.setAttribute('data-theme', hostTheme) : el.removeAttribute('data-theme'); }
    else el.setAttribute('data-theme', t);
  }

  /* ---------- Navigation ---------- */
  function go(screen) { ui.screen = screen; ui.resetArmed = false; render(); window.scrollTo(0, 0); }
  function render() {
    root.innerHTML = ({ home, levels, game, result, words, awards, settings })[ui.screen]();
    if (ui.screen === 'game') paintGame();
  }
  const topBar = (title, sub, right) => `<header class="bar"><button class="icon-btn" data-act="home" aria-label="Zur Startseite">${I.back}</button><h1>${title}${sub ? `<span class="sub">${sub}</span>` : ''}</h1>${right || ''}</header>`;

  /* ---------- Startbildschirm ---------- */
  function home() {
    const d = S.data, st = KW.stage(d.stage), prog = S.stageProgress(st.id), next = S.nextLevel(st.id), rank = S.rank();
    const sess = d.session && d.session.ref, today = KW.today(), dailyDone = d.daily[today] != null;
    const learned = Object.keys(d.words).length, hard = Object.values(d.words).filter(w => w.hard).length;
    const got = Object.keys(d.achievements).length;
    const play = sess
      ? `<button class="btn primary play" data-act="resume"><span>Weiterspielen<small>${esc(sess.label)} · angefangen</small></span>${I.next}</button>`
      : next ? `<button class="btn primary play" data-act="play" data-id="${next.id}"><span>Spielen<small>${st.id} · Rätsel ${next.index + 1} von ${st.levels}</small></span>${I.next}</button>`
        : `<button class="btn primary play" data-act="levels"><span>Stufe ${st.id} geschafft<small>Wähle eine neue Stufe oder spiele ein Rätsel erneut</small></span>${I.next}</button>`;
    return `<div class="screen">
      <div class="home-top"><span class="wordmark">Wortkreuz</span>
        <span class="seg"><span class="chip flame" title="Lernserie">${I.flame}${S.streakNow()} ${S.streakNow() === 1 ? 'Tag' : 'Tage'}</span><span class="chip xp" title="Erfahrungspunkte">${I.bolt}${d.xp} XP</span></span></div>
      <section class="hero">
        <div class="logo" aria-hidden="true">
          <b style="grid-area:1/3">K</b><b style="grid-area:2/1">W</b><b style="grid-area:2/2">O</b><b class="x" style="grid-area:2/3">R</b><b style="grid-area:2/4">T</b>
          <b style="grid-area:3/3">E</b><b style="grid-area:4/3">U</b><b style="grid-area:5/3">Z</b></div>
        <div><h1>Deutsch lernen, Wort für Wort.</h1><p>${KW.totalLevels()} Kreuzworträtsel von A1 bis C1. Jedes gelöste Wort landet mit Artikel, Übersetzung und Beispielsatz in deiner Wortliste.</p></div>
      </section>
      ${play}
      <section class="card stage-card">
        <div class="stage-head"><div><span class="label">Deine Lernstufe</span><h2>${st.id} · ${st.name}</h2></div>
          <div class="seg" role="group" aria-label="Lernstufe wählen">${KW.STAGES.map(s => `<button data-act="stage" data-id="${s.id}" aria-pressed="${s.id === st.id}">${s.id}</button>`).join('')}</div></div>
        <p class="muted small">${st.blurb}</p>
        <div class="meter" role="img" aria-label="${prog.done} von ${prog.total} Rätseln gelöst"><i style="width:${prog.done / prog.total * 100}%"></i></div>
        <div class="row small"><span>${prog.done} von ${prog.total} Rätseln gelöst</span><span class="muted">${prog.stars} von ${prog.total * 3} Sternen</span></div>
      </section>
      <div class="duo">
        <button class="card daily" data-act="daily">
          <span class="row"><span class="label">Tagesrätsel · ${new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}</span><span class="tag ${dailyDone ? 'done' : ''}">${dailyDone ? 'Gelöst' : '+40 XP'}</span></span>
          <h2>${dailyDone ? 'Für heute geschafft' : 'Acht Wörter aus ' + st.id}</h2>
          <span class="muted small">${dailyDone ? 'Morgen wartet ein neues Rätsel. Du kannst das heutige noch einmal spielen.' : 'Jeden Tag ein neues Rätsel. Es hält deine Lernserie am Laufen.'}</span>
        </button>
        <section class="card">
          <span class="row"><span class="label">Rang ${rank.index}</span><span class="small muted">${rank.next ? rank.into + ' / ' + rank.step + ' XP' : 'Höchster Rang'}</span></span>
          <h2>${rank.name}</h2>
          <div class="meter"><i style="width:${rank.into / rank.step * 100}%"></i></div>
          <span class="muted small">${rank.next ? 'Nächster Rang: ' + rank.next : 'Du hast alle Ränge erreicht.'}</span>
        </section>
      </div>
      <nav class="menu">
        <button class="btn" data-act="levels">Level auswählen<small>${S.totalDone()} von ${KW.totalLevels()} gelöst</small></button>
        <button class="btn" data-act="words">Wortliste<small>${learned} ${learned === 1 ? 'Wort' : 'Wörter'}${hard ? ', ' + hard + ' schwierig' : ''}</small></button>
        <button class="btn" data-act="awards">Erfolge<small>${got} von ${KW.ACHIEVEMENTS.length} erreicht</small></button>
        <button class="btn" data-act="settings">Einstellungen<small>Design, Hinweise, Tastatur</small></button>
      </nav>
      ${S.persistent ? '' : '<p class="note">Dieser Browser erlaubt gerade kein Speichern. Dein Fortschritt gilt nur, solange die Seite offen ist.</p>'}
    </div>`;
  }

  /* ---------- Levelwahl ---------- */
  function levels() {
    const id = ui.tabStage || S.data.stage, st = KW.stage(id), list = KW.stageLevels(id), next = S.nextLevel(id), prog = S.stageProgress(id);
    return `<div class="screen">${topBar('Level auswählen', `${st.id} · ${st.name} · ${prog.done} von ${prog.total} gelöst`)}
      <div class="seg" role="group" aria-label="Lernstufe">${KW.STAGES.map(s => `<button data-act="tab" data-id="${s.id}" aria-pressed="${s.id === id}">${s.id}</button>`).join('')}</div>
      <p class="muted small">${st.blurb}. Jedes gelöste Rätsel schaltet das nächste frei. Du kannst jederzeit in einer anderen Stufe beginnen.</p>
      <div class="levels">${list.map(l => {
        const rec = S.data.levels[l.id], open = S.isUnlocked(l);
        return `<button class="lv ${rec ? 'done' : open ? (next && next.id === l.id ? 'next' : '') : 'locked'}" ${open ? `data-act="play" data-id="${l.id}"` : 'disabled'} aria-label="Rätsel ${l.index + 1}${rec ? ', ' + rec.stars + ' Sterne' : open ? '' : ', gesperrt'}">
          ${l.review ? '<em title="Enthält Wörter zur Wiederholung">Wdh.</em>' : ''}<b>${l.index + 1}</b>${rec ? stars(rec.stars) : open ? `<span class="small muted">${l.entries.length} Wörter</span>` : I.lock}</button>`;
      }).join('')}</div></div>`;
  }

  /* ---------- Spiel ---------- */
  function puzzleLabel(p) {
    return p.kind === 'daily' ? 'Tagesrätsel ' + p.stageId : p.kind === 'practice' ? 'Übungsrätsel' : p.stageId + ' · Rätsel ' + (p.index + 1);
  }
  function refOf(p, extra) { return Object.assign({ kind: p.kind, id: p.id, stageId: p.stageId, date: p.date, label: puzzleLabel(p) }, extra); }
  function start(puzzle, ref, resume) {
    const s = new KW.Session(puzzle, resume ? S.data.session : null);
    G = { s, sel: 0, cur: 0, bad: new Set(), fb: null, ref };
    const first = puzzle.entries.findIndex((e, i) => !s.solved.has(i));
    select(first < 0 ? 0 : first, true);
    persist(); go('game');
  }
  function persist() { S.data.session = Object.assign(G.s.serialize(), { ref: G.ref }); S.save(); }
  function resume() {
    const ses = S.data.session, r = ses && ses.ref; let p = null;
    if (r) p = r.kind === 'level' ? KW.level(r.id) : r.kind === 'daily' ? (r.date === KW.today() ? KW.dailyPuzzle(r.stageId, r.date) : null) : KW.practicePuzzle(r.answers || [], r.seed);
    if (!p || p.id !== ses.id) { S.data.session = null; S.save(); return go('home'); }
    start(p, r, true);
  }
  function select(i, jump) {
    G.sel = i;
    const e = G.s.puzzle.entries[i];
    if (jump || !e.cells.includes(G.cur)) G.cur = e.cells.find(c => !G.s.locked.has(c) && !G.s.fill[c]) ?? e.cells.find(c => !G.s.locked.has(c)) ?? e.cells[0];
  }
  const CLUE_LABEL = { en: 'Übersetzung', def: 'Umschreibung', ex: 'Lückensatz' };
  function clueText(e, kind) {
    return kind === 'en' ? `Englisch: „${esc(e.word.en)}“` : kind === 'ex' ? esc(e.word.ex) : esc(e.word.def);
  }
  function game() {
    const p = G.s.puzzle, set = S.data.settings, showKb = set.keyboard === 'always' || (set.keyboard === 'auto' && coarse());
    const starts = {}; p.entries.forEach(e => { starts[e.cells[0]] = e.num; });
    const cells = G.s.solution.map((ch, c) => ch ? `<button class="cell" data-act="cell" data-c="${c}" style="grid-area:${Math.floor(c / p.cols) + 1}/${c % p.cols + 1}" tabindex="-1">${starts[c] ? `<i class="n">${starts[c]}</i>` : ''}<span></span></button>` : '').join('');
    const list = dir => p.entries.map((e, i) => e.dir === dir ? `<li data-e="${i}"><button data-act="entry" data-e="${i}"><b>${e.num}</b><span>${clueText(e, G.s.clueKinds(i, set.translations)[0])} <span class="muted">(${e.letters.length})</span></span></button></li>` : '').join('');
    const row = keys => `<div>${Array.from(keys).map(k => `<button data-act="key" data-k="${k}">${k}</button>`).join('')}</div>`;
    const kb = showKb
      ? `<div class="kb" aria-label="Tastatur">${row('QWERTZUIOPÜ')}${row('ASDFGHJKLÖÄ')}<div>${Array.from('YXCVBNMß').map(k => `<button data-act="key" data-k="${k}">${k}</button>`).join('')}<button class="wide" data-act="key" data-k="DEL" aria-label="Löschen">${I.del}</button></div></div>`
      : `<input id="sysin" class="sysin" type="text" value=" " aria-label="Buchstaben eingeben" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" enterkeyhint="next"><div class="kb mini"><div><span>Sonderzeichen:</span>${Array.from('ÄÖÜß').map(k => `<button data-act="key" data-k="${k}">${k}</button>`).join('')}</div></div>`;
    return `<div class="screen">${topBar(puzzleLabel(p), '<span id="count"></span>', '<span id="live" class="chip"></span>')}
      <div class="game">
        <div class="board-wrap"><div class="board" id="board" style="--cols:${p.cols}" role="group" aria-label="Kreuzworträtsel">${cells}</div></div>
        <details class="lists" id="lists" ${coarse() ? '' : 'open'}><summary>Alle Hinweise</summary><div class="cols">
          <div><span class="label">Waagerecht</span><ol>${list('a')}</ol></div><div><span class="label">Senkrecht</span><ol>${list('d')}</ol></div></div></details>
        <div class="dock">
          <div class="clue" id="clue" aria-live="polite"></div>
          <div class="tools">
            <button class="btn" data-act="tip" id="tip">${I.bulb}<span>Tipp</span></button>
            <button class="btn" data-act="letter">${I.letter}<span>Buchstabe</span></button>
            <button class="btn" data-act="word">${I.eye}<span>Wort<span class="long"> aufdecken</span></span></button>
          </div>${kb}
        </div>
      </div></div>`;
  }
  function paintGame() {
    const s = G.s, p = s.puzzle, e = p.entries[G.sel], set = S.data.settings;
    const inSel = new Set(e.cells);
    root.querySelectorAll('.cell').forEach(el => {
      const c = +el.dataset.c, done = s.cellEntries[c].some(i => s.solved.has(i));
      el.lastElementChild.textContent = s.fill[c] || '';
      el.classList.toggle('sel', inSel.has(c)); el.classList.toggle('cur', c === G.cur);
      el.classList.toggle('ok', done); el.classList.toggle('given', !done && s.given.has(c));
      el.classList.toggle('bad', G.bad.has(c) && !done);
    });
    root.querySelectorAll('#lists li').forEach(li => { const i = +li.dataset.e; li.classList.toggle('on', i === G.sel); li.classList.toggle('done', s.solved.has(i)); });
    const kinds = s.clueKinds(G.sel, set.translations), shown = s.tips[G.sel] || 0, solved = s.solved.has(G.sel);
    const extra = kinds.slice(1, 1 + shown).map(k => `<div class="extra">${CLUE_LABEL[k]}: ${clueText(e, k)}</div>`).join('');
    document.getElementById('clue').innerHTML = `<div class="meta"><b>${e.num} ${e.dir === 'a' ? 'waagerecht' : 'senkrecht'}</b><span>${CLUE_LABEL[kinds[0]]}</span><span>${e.word.kind} · ${e.letters.length} Buchstaben</span></div>
      <div class="text">${clueText(e, kinds[0])}</div>${extra}${G.fb ? `<div class="fb ${G.fb.type}">${G.fb.html}</div>` : ''}`;
    const tip = document.getElementById('tip'); tip.disabled = solved || shown >= kinds.length - 1;
    document.getElementById('count').textContent = `${s.solved.size} von ${p.entries.length} Wörtern`;
    document.getElementById('live').innerHTML = stars(s.stars());
  }
  function animate(cells, cls) {
    if (!S.data.settings.motion) return;
    cells.forEach((c, k) => { const el = root.querySelector(`.cell[data-c="${c}"]`); if (!el) return; el.style.setProperty('--i', k); el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 1100); });
  }
  function handle(results) {
    const s = G.s, p = s.puzzle; let good = null, bad = null;
    results.forEach(r => {
      const e = p.entries[r.entry];
      if (r.correct) { good = r; e.cells.forEach(c => G.bad.delete(c)); }
      else if (!bad || r.entry === G.sel) bad = r;
    });
    if (good) {
      const w = p.entries[good.entry].word;
      G.fb = { type: 'good', html: `Richtig: <b>${esc(KW.display(w))}</b> – ${esc(w.en)}${w.article ? ' · Nomen schreibt man groß.' : ''}` };
    } else if (bad) {
      if (S.data.settings.markErrors) bad.wrongCells.forEach(c => G.bad.add(c));
      G.fb = { type: 'bad', html: esc(bad.message) + (S.data.settings.markErrors ? ' Die falschen Felder sind rot markiert.' : '') };
    }
    persist();
    if (s.complete) { paintGame(); results.filter(r => r.correct).forEach(r => animate(p.entries[r.entry].cells, 'pop')); return setTimeout(finish, S.data.settings.motion ? 950 : 200); }
    if (good && s.solved.has(G.sel)) {
      const n = p.entries.length; let j = G.sel;
      for (let k = 1; k <= n; k++) { const i = (G.sel + k) % n; if (!s.solved.has(i)) { j = i; break; } }
      select(j, true);
    }
    paintGame();
    results.forEach(r => r.correct ? animate(p.entries[r.entry].cells, 'pop') : (r.entry === (bad && bad.entry) && animate(p.entries[r.entry].cells, 'shake')));
  }
  function type(ch) {
    const s = G.s, e = s.puzzle.entries[G.sel];
    let cell = G.cur;
    if (s.locked.has(cell)) { const nx = e.cells.slice(e.cells.indexOf(cell) + 1).find(c => !s.locked.has(c)); if (nx == null) return; cell = G.cur = nx; }
    G.bad.delete(cell); G.fb = null;
    const results = s.setLetter(cell, ch);
    const rest = e.cells.slice(e.cells.indexOf(cell) + 1);
    const nx = rest.find(c => !s.locked.has(c) && !s.fill[c]) ?? rest.find(c => !s.locked.has(c));
    if (nx != null) G.cur = nx;
    handle(results);
  }
  function erase() {
    const s = G.s, e = s.puzzle.entries[G.sel]; let k = e.cells.indexOf(G.cur);
    if (s.locked.has(G.cur) || !s.fill[G.cur]) { do k--; while (k >= 0 && s.locked.has(e.cells[k])); if (k < 0) return; G.cur = e.cells[k]; }
    s.fill[G.cur] = ''; G.bad.delete(G.cur); G.fb = null; persist(); paintGame();
  }
  function tapCell(c) {
    const s = G.s, mine = s.cellEntries[c];
    if (c === G.cur && mine.length > 1) G.sel = mine.find(i => i !== G.sel);
    else if (!mine.includes(G.sel)) G.sel = mine.find(i => !s.solved.has(i)) ?? mine[0];
    G.cur = c; G.fb = null; paintGame();
  }
  function move(dr, dc) {
    const p = G.s.puzzle, r = Math.floor(G.cur / p.cols) + dr, c = G.cur % p.cols + dc;
    if (r < 0 || c < 0 || r >= p.rows || c >= p.cols || !G.s.solution[r * p.cols + c]) return;
    G.cur = r * p.cols + c;
    const want = dc ? 'a' : 'd', mine = G.s.cellEntries[G.cur];
    G.sel = mine.find(i => p.entries[i].dir === want) ?? (mine.includes(G.sel) ? G.sel : mine[0]);
    paintGame();
  }
  function step(dir) {
    const s = G.s, n = s.puzzle.entries.length;
    for (let k = 1; k <= n; k++) { const i = (G.sel + dir * k + n * n) % n; if (!s.solved.has(i)) { select(i, true); break; } }
    G.fb = null; paintGame();
  }
  function finish() {
    if (!G || !G.s.complete || ui.screen !== 'game') return;
    ui.result = { res: KW.finishPuzzle(G.s), session: G.s, ref: G.ref };
    go('result'); confetti(ui.result.res.stars);
  }
  function confetti(n) {
    if (!S.data.settings.motion || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const box = document.createElement('div'); box.className = 'confetti';
    const colors = ['var(--accent)', 'var(--marker)', 'var(--green)', 'var(--red)', 'var(--gold)'];
    for (let i = 0; i < n * 14; i++) { const el = document.createElement('i'); el.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % 5]};animation-delay:${Math.random() * .5}s;animation-duration:${1.4 + Math.random()}s`; box.appendChild(el); }
    document.body.appendChild(box); setTimeout(() => box.remove(), 3200);
  }

  /* ---------- Ergebnis ---------- */
  function sentence(w) {
    const word = w.ex.startsWith('___') ? w.lemma[0].toUpperCase() + w.lemma.slice(1) : w.lemma;
    return esc(w.ex).replace(/___/g, `<b>${esc(word)}</b>`);
  }
  function wordRow(w, rec, withStats) {
    return `<div class="w"><div><h3>${w.article ? `<i>${w.article}</i> ` : ''}${esc(w.lemma)}</h3><span class="en">${esc(w.en)} · ${w.stage}${w.kind !== 'Wort' ? ' · ' + w.kind : ''}</span></div>
      <button class="hard" data-act="hard" data-w="${esc(w.answer)}" aria-pressed="${!!rec.hard}" aria-label="Als schwierig markieren" title="Als schwierig markieren">${I.flag}</button>
      <div class="ex">${sentence(w)}</div>${withStats ? `<div class="st">${esc(w.def)}<br>${rec.ok}× sicher gelöst · ${rec.bad}× mit Fehler oder Hilfe</div>` : ''}</div>`;
  }
  function result() {
    const { res, session } = ui.result, p = session.puzzle, st = KW.stage(p.stageId);
    const title = ['Geschafft!', 'Gut gemacht!', 'Ausgezeichnet!'][res.stars - 1];
    const why = res.stars === 3 ? 'Ohne Hilfe und fast ohne Fehler gelöst.' : `Tipps, aufgedeckte Felder und Fehlversuche kosten Sterne (${session.penalty} Punkte Abzug). Spiel das Rätsel erneut für drei Sterne.`;
    const nextLv = p.kind === 'level' ? KW.stageLevels(p.stageId)[p.index + 1] : null;
    const nextStage = KW.STAGES[KW.STAGES.indexOf(st) + 1];
    const main = p.kind === 'level'
      ? (nextLv ? `<button class="btn primary" data-act="play" data-id="${nextLv.id}">Nächstes Rätsel ${I.next}</button>`
        : nextStage ? `<button class="btn primary" data-act="stage-go" data-id="${nextStage.id}">Weiter mit ${nextStage.id} ${I.next}</button>` : `<button class="btn primary" data-act="home">Zur Startseite</button>`)
      : `<button class="btn primary" data-act="${S.nextLevel(S.data.stage) ? 'play' : 'home'}" data-id="${(S.nextLevel(S.data.stage) || {}).id || ''}">Weiter lernen ${I.next}</button>`;
    return `<div class="screen result">
      <div class="big">${[0, 1, 2].map(i => `<span class="${i < res.stars ? 'on' : ''}" style="--i:${i}">${I.star}</span>`).join('')}</div>
      <div><h1>${title}</h1><p class="muted">${puzzleLabel(p)} · ${why}</p></div>
      <div class="gains"><span class="chip xp">${I.bolt}+${res.xp} XP${res.replay ? ' (Wiederholung)' : ''}</span><span class="chip flame">${I.flame}${res.streak} ${res.streak === 1 ? 'Tag' : 'Tage'} Lernserie${res.streakUp ? ' · heute verlängert' : ''}</span></div>
      ${res.rankUp ? `<div class="card unlock">${I.medal}<div><b>Neuer Rang: ${res.rankUp.name}</b><br><span class="small">Du hast Rang ${res.rankUp.index} erreicht.</span></div></div>` : ''}
      ${res.achievements.map(a => `<div class="card unlock">${I.medal}<div><b>Erfolg: ${a.name}</b><br><span class="small">${a.text}</span></div></div>`).join('')}
      ${res.stageDone ? `<div class="card unlock">${I.medal}<div><b>Stufe ${st.id} abgeschlossen</b><br><span class="small">Alle ${st.levels} Rätsel gelöst.</span></div></div>` : ''}
      <div class="actions">${main}<button class="btn" data-act="replay">Noch einmal spielen</button><button class="btn" data-act="home">Startseite</button></div>
      <div><span class="label">Wörter aus diesem Rätsel</span><p class="muted small">Lies jeden Satz einmal laut. Mit der Fahne merkst du dir Wörter zum Üben vor.</p></div>
      <div class="card review">${p.entries.map(e => wordRow(e.word, S.wordEntry(e.word.answer))).join('')}</div>
    </div>`;
  }

  /* ---------- Wortliste ---------- */
  function words() {
    const all = S.learnedWords().sort((a, b) => (b.hard - a.hard) || a.word.lemma.localeCompare(b.word.lemma, 'de'));
    const hard = all.filter(w => w.hard), list = ui.filter === 'hard' ? hard : all;
    const pool = hard.length >= 4 ? hard : all;
    return `<div class="screen">${topBar('Wortliste', `${all.length} gelernt · ${hard.length} schwierig`)}
      <div class="filters"><div class="seg" role="group" aria-label="Filter"><button data-act="filter" data-id="all" aria-pressed="${ui.filter === 'all'}">Alle</button><button data-act="filter" data-id="hard" aria-pressed="${ui.filter === 'hard'}">Schwierige</button></div>
        <button class="btn primary" data-act="practice" ${pool.length < 4 ? 'disabled' : ''}>Übungsrätsel ${hard.length >= 4 ? 'aus schwierigen Wörtern' : 'aus meinen Wörtern'}</button></div>
      ${pool.length < 4 ? '<p class="muted small">Ab vier Wörtern in der Liste baut das Spiel daraus ein eigenes Übungsrätsel.</p>' : ''}
      ${list.length ? `<div class="card review">${list.map(w => wordRow(w.word, w, true)).join('')}</div>`
        : `<div class="card empty">${ui.filter === 'hard' ? 'Noch keine schwierigen Wörter. Wörter, die du aufdeckst oder zweimal falsch schreibst, erscheinen hier automatisch.' : 'Hier sammeln sich alle Wörter, die du in Rätseln gelöst hast.'}</div>`}
    </div>`;
  }

  /* ---------- Erfolge ---------- */
  function awards() {
    const d = S.data, total = d.stats.correct + d.stats.wrong;
    return `<div class="screen">${topBar('Erfolge', `${Object.keys(d.achievements).length} von ${KW.ACHIEVEMENTS.length} erreicht`)}
      <div class="facts">
        <div><b>${d.stats.puzzles}</b><span>Rätsel gelöst</span></div><div><b>${S.totalStars()}</b><span>Sterne in Levels</span></div>
        <div><b>${d.stats.correct}</b><span>richtige Wörter</span></div><div><b>${d.stats.wrong}</b><span>Fehlversuche</span></div>
        <div><b>${total ? Math.round(d.stats.correct / total * 100) + ' %' : '–'}</b><span>Trefferquote</span></div><div><b>${d.streak.best}</b><span>längste Serie (Tage)</span></div>
      </div>
      <div class="awards">${KW.ACHIEVEMENTS.map(a => `<div class="award ${d.achievements[a.id] ? 'on' : ''}">${d.achievements[a.id] ? I.medal : I.lock}<div><b>${a.name}</b><span>${a.text}</span></div></div>`).join('')}</div>
    </div>`;
  }

  /* ---------- Einstellungen ---------- */
  function settings() {
    const s = S.data.settings;
    const seg = (key, opts) => `<div class="seg" role="group">${opts.map(([v, t]) => `<button data-act="set" data-key="${key}" data-val="${v}" aria-pressed="${s[key] === v}">${t}</button>`).join('')}</div>`;
    const sw = (key, label) => `<button class="switch" role="switch" data-act="toggle" data-key="${key}" aria-checked="${!!s[key]}" aria-label="${label}"></button>`;
    return `<div class="screen">${topBar('Einstellungen')}
      <section class="card">
        <div class="set"><div><b>Lernstufe</b><p>Bestimmt, welche Rätsel „Spielen“ und das Tagesrätsel verwenden.</p></div><div class="seg" role="group">${KW.STAGES.map(x => `<button data-act="stage" data-id="${x.id}" aria-pressed="${x.id === S.data.stage}">${x.id}</button>`).join('')}</div></div>
        <div class="set"><div><b>Design</b><p>Hell wie ein Schulheft oder dunkel wie eine Tafel.</p></div>${seg('theme', [['system', 'System'], ['light', 'Hell'], ['dark', 'Dunkel']])}</div>
        <div class="set"><div><b>Englische Übersetzungen</b><p>Als Hinweisart und als Tipp. Ausgeschaltet lernst du nur mit deutschen Umschreibungen.</p></div>${sw('translations', 'Englische Übersetzungen')}</div>
        <div class="set"><div><b>Falsche Buchstaben markieren</b><p>Zeigt nach einem Fehlversuch, welche Felder nicht stimmen.</p></div>${sw('markErrors', 'Falsche Buchstaben markieren')}</div>
        <div class="set"><div><b>Animationen</b><p>Bewegung beim Lösen und Konfetti am Ende.</p></div>${sw('motion', 'Animationen')}</div>
        <div class="set"><div><b>Tastatur</b><p>„Eingebaut“ zeigt die Spieltastatur mit ä, ö, ü und ß. „Vom Gerät“ öffnet beim Antippen eines Feldes die Tastatur deines Handys. „Automatisch“ wählt auf Handys die eingebaute.</p></div>${seg('keyboard', [['auto', 'Automatisch'], ['always', 'Eingebaut'], ['never', 'Vom Gerät']])}</div>
      </section>
      <section class="card">
        <div class="set"><div><b>Spielstand</b><p>${S.persistent ? 'Dein Fortschritt wird in diesem Browser gespeichert und bleibt nach dem Schließen erhalten. Auf anderen Geräten beginnt ein eigener Spielstand.' : 'Dieser Browser erlaubt gerade kein Speichern.'}</p></div>
          ${ui.resetArmed ? `<div class="seg"><button class="btn danger" data-act="reset-yes">Wirklich alles löschen</button><button class="btn" data-act="reset-no">Abbrechen</button></div>` : `<button class="btn danger" data-act="reset">Spielstand zurücksetzen</button>`}</div>
      </section></div>`;
  }

  /* ---------- Ereignisse ---------- */
  const actions = {
    home: () => go('home'), levels: () => { ui.tabStage = S.data.stage; go('levels'); }, words: () => go('words'), awards: () => go('awards'), settings: () => go('settings'),
    stage: el => { S.data.stage = el.dataset.id; S.save(); render(); },
    'stage-go': el => { S.data.stage = ui.tabStage = el.dataset.id; S.save(); go('levels'); },
    tab: el => { ui.tabStage = el.dataset.id; render(); },
    play: el => { const l = KW.level(el.dataset.id); if (l && S.isUnlocked(l)) start(l, refOf(l)); },
    resume,
    daily: () => { const p = KW.dailyPuzzle(S.data.stage, KW.today()); start(p, refOf(p)); },
    practice: () => {
      const all = S.learnedWords(), hard = all.filter(w => w.hard), pool = (hard.length >= 4 ? hard : all).map(w => w.word.answer), seed = Date.now().toString(36);
      const p = KW.practicePuzzle(pool, seed); if (p) start(p, refOf(p, { answers: pool, seed }));
    },
    replay: () => { const r = ui.result.ref, p = ui.result.session.puzzle; start(p, r); },
    filter: el => { ui.filter = el.dataset.id; render(); },
    hard: el => { const w = S.wordEntry(el.dataset.w); w.hard = !w.hard; w.auto = false; S.save(); el.setAttribute('aria-pressed', w.hard); },
    set: el => { S.data.settings[el.dataset.key] = el.dataset.val; S.save(); applyTheme(); render(); },
    toggle: el => { const k = el.dataset.key; S.data.settings[k] = !S.data.settings[k]; S.save(); render(); },
    reset: () => { ui.resetArmed = true; render(); }, 'reset-no': () => { ui.resetArmed = false; render(); },
    'reset-yes': () => { S.reset(); G = null; applyTheme(); go('home'); },
    cell: el => tapCell(+el.dataset.c),
    entry: el => { select(+el.dataset.e, true); G.fb = null; paintGame(); },
    key: el => el.dataset.k === 'DEL' ? erase() : type(el.dataset.k),
    tip: () => { if (G.s.takeTip(G.sel, S.data.settings.translations)) { G.fb = null; persist(); paintGame(); } },
    letter: () => {
      const s = G.s, e = s.puzzle.entries[G.sel];
      const c = !s.locked.has(G.cur) ? G.cur : e.cells.find(x => !s.locked.has(x));
      if (c == null) return;
      const res = s.revealLetter(c); if (!res) return;
      G.bad.delete(c); G.fb = { type: 'info', html: 'Ein Buchstabe wurde eingetragen. Das kostet einen Punkt bei den Sternen.' };
      const nx = e.cells.find(x => !s.locked.has(x) && !s.fill[x]); if (nx != null) G.cur = nx;
      res.length ? handle(res) : (persist(), paintGame());
    },
    word: () => { if (!G.s.solved.has(G.sel)) handle(G.s.revealWord(G.sel)); }
  };
  root.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (el && !el.disabled && actions[el.dataset.act]) actions[el.dataset.act](el);
    if (el && ui.screen === 'game' && /^(cell|entry|key|tip|letter|word|play|resume|daily|practice|replay)$/.test(el.dataset.act)) focusSys();
  });
  /* Handy-Tastatur: Ein unsichtbares Textfeld nimmt die Eingabe an. Es enthält immer ein Leerzeichen,
     damit auch die Löschtaste ein Ereignis auslöst. */
  let sysPrev = ' ';
  function focusSys() { const el = document.getElementById('sysin'); if (el && document.activeElement !== el) { el.value = sysPrev = ' '; try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } try { el.setSelectionRange(1, 1); } catch (e) {} } }
  root.addEventListener('input', ev => {
    const el = ev.target; if (el.id !== 'sysin' || !G) return;
    const v = el.value;
    if (v.length < sysPrev.length) { for (let i = v.length; i < sysPrev.length; i++) erase(); }
    else Array.from(v.replace(/ /g, '')).slice(Array.from(sysPrev.replace(/ /g, '')).length).forEach(c => { const ch = KW.upper(c); if (KW.isLetter(ch) && ui.screen === 'game') type(ch); });
    sysPrev = v;
    if (!ev.isComposing || v.length > 24) el.value = sysPrev = ' ';
  });
  root.addEventListener('compositionend', ev => { if (ev.target.id === 'sysin') ev.target.value = sysPrev = ' '; });
  document.addEventListener('keydown', ev => {
    if (ui.screen !== 'game' || !G || ev.ctrlKey || ev.metaKey || ev.altKey && !/^[äöüßÄÖÜ]$/.test(ev.key)) return;
    const k = ev.key;
    if (k === 'Backspace' || k === 'Delete') { ev.preventDefault(); return erase(); }
    if (k === 'ArrowLeft') { ev.preventDefault(); return move(0, -1); } if (k === 'ArrowRight') { ev.preventDefault(); return move(0, 1); }
    if (k === 'ArrowUp') { ev.preventDefault(); return move(-1, 0); } if (k === 'ArrowDown') { ev.preventDefault(); return move(1, 0); }
    if (k === 'Tab' || k === 'Enter') { if (ev.target.closest && ev.target.closest('.icon-btn, .tools, summary') && k === 'Enter') return; ev.preventDefault(); return step(ev.shiftKey ? -1 : 1); }
    if (k === ' ') { ev.preventDefault(); return tapCell(G.cur); }
    if (k.length === 1) { const ch = KW.upper(k); if (KW.isLetter(ch)) { ev.preventDefault(); type(ch); } }
  });

  /* ---------- Start ---------- */
  S.load(); applyTheme();
  S.streakNow() || (S.data.streak.count = 0);
  render();
  KW.ui = { go, start };
})(KW);
