/* ============================================================
   game.js – Spielregeln für ein laufendes Rätsel (ohne DOM).
   ============================================================ */
(function (KW) {
  const UMLAUT = { 'Ä': 'A', 'Ö': 'O', 'Ü': 'U', 'ß': 'S' };
  const plain = s => Array.from(s).map(ch => UMLAUT[ch] || ch).join('');

  /* Erklärt, was an einer falschen Eingabe nicht stimmt. */
  KW.explainError = function (typed, answer, wrongCount) {
    if (plain(typed) === plain(answer)) {
      return answer.includes('ß') && !typed.includes('ß')
        ? 'Fast richtig! Hier schreibt man ß – nach langem Vokal oder Doppellaut steht ß statt s.'
        : 'Fast richtig! Achte auf den Umlaut: a/ä, o/ö und u/ü sind verschiedene Buchstaben.';
    }
    if (Array.from(typed).sort().join('') === Array.from(answer).sort().join('')) {
      return /IE|EI/.test(answer)
        ? 'Alle Buchstaben stimmen, nur die Reihenfolge nicht. Merke: „ie“ klingt wie langes i, „ei“ wie „ai“.'
        : 'Alle Buchstaben stimmen, nur die Reihenfolge nicht.';
    }
    if (wrongCount === 1) return 'Nur ein Buchstabe stimmt noch nicht.';
    if (wrongCount >= answer.length - 1) return 'Das ist ein anderes Wort. Lies den Hinweis noch einmal oder hol dir einen Tipp.';
    return wrongCount + ' Buchstaben stimmen noch nicht.';
  };

  KW.Session = class {
    constructor(puzzle, saved) {
      this.puzzle = puzzle;
      const n = puzzle.rows * puzzle.cols;
      this.solution = new Array(n).fill('');
      this.cellEntries = Array.from({ length: n }, () => []);
      puzzle.entries.forEach((e, i) => e.cells.forEach((c, k) => { this.solution[c] = e.letters[k]; this.cellEntries[c].push(i); }));
      const ok = saved && saved.id === puzzle.id && saved.fill && saved.fill.length === n;
      this.fill = ok ? saved.fill.slice() : new Array(n).fill('');
      this.solved = new Set(ok ? saved.solved : []);
      this.revealed = new Set(ok ? saved.revealed : []);   // ganz aufgedeckte Wörter
      this.given = new Set(ok ? saved.given : []);          // einzeln aufgedeckte Felder
      this.tips = ok ? Object.assign({}, saved.tips) : {};
      this.missed = ok ? Object.assign({}, saved.missed) : {};
      this.penalty = ok ? saved.penalty : 0;
      this.lastTry = {};
      this.pending = {};   // Wort -> Felder, die nach einem Fehlversuch noch nicht überschrieben wurden
      this.locked = new Set();
      this.solved.forEach(i => puzzle.entries[i].cells.forEach(c => this.locked.add(c)));
      this.given.forEach(c => this.locked.add(c));
    }
    serialize() {
      return { id: this.puzzle.id, fill: this.fill, solved: [...this.solved], revealed: [...this.revealed], given: [...this.given],
        tips: this.tips, missed: this.missed, penalty: this.penalty };
    }
    typed(i) { return this.puzzle.entries[i].cells.map(c => this.fill[c] || ' ').join(''); }
    isFull(i) { return this.puzzle.entries[i].cells.every(c => this.fill[c]); }
    get complete() { return this.solved.size === this.puzzle.entries.length; }

    /* Setzt einen Buchstaben und prüft alle betroffenen, vollständig gefüllten Wörter. */
    setLetter(cell, ch) {
      if (this.locked.has(cell)) return [];
      this.fill[cell] = ch;
      this.cellEntries[cell].forEach(i => this.pending[i] && this.pending[i].delete(cell));
      return ch ? this.cellEntries[cell].map(i => this.check(i)).filter(Boolean) : [];
    }
    check(i) {
      if (this.solved.has(i) || !this.isFull(i)) return null;
      const e = this.puzzle.entries[i], typed = this.typed(i), answer = e.word.answer;
      if (typed === answer) {
        this.solved.add(i); e.cells.forEach(c => this.locked.add(c));
        return { entry: i, correct: true, clean: !this.revealed.has(i) && !this.missed[i] && !this.tips[i] };
      }
      if (this.pending[i] && this.pending[i].size) return null;   // wird gerade korrigiert: erst prüfen, wenn alle roten Felder neu sind
      const wrong = e.cells.filter(c => this.fill[c] !== this.solution[c]);
      this.pending[i] = new Set(wrong.filter(c => !this.locked.has(c)));
      const repeat = this.lastTry[i] === typed;
      this.lastTry[i] = typed;
      if (!repeat) { this.missed[i] = (this.missed[i] || 0) + 1; this.penalty += 1; }
      return { entry: i, correct: false, repeat, wrongCells: wrong, message: KW.explainError(typed, answer, wrong.length) };
    }
    /* Nächster Tipp: weitere Hinweisarten, die noch nicht gezeigt wurden. */
    clueKinds(i, translations) {
      const e = this.puzzle.entries[i];
      let main = e.clue;
      if (main === 'en' && !translations) main = 'def';
      const rest = ['def', 'ex', 'en'].filter(k => k !== main && (k !== 'en' || translations));
      return [main].concat(rest);
    }
    takeTip(i, translations) {
      const kinds = this.clueKinds(i, translations), have = this.tips[i] || 0;
      if (have >= kinds.length - 1) return false;
      this.tips[i] = have + 1; this.penalty += 1;
      return true;
    }
    revealLetter(cell) {
      if (this.locked.has(cell) || !this.solution[cell]) return null;
      this.fill[cell] = this.solution[cell];
      this.given.add(cell); this.locked.add(cell); this.penalty += 1;
      this.cellEntries[cell].forEach(i => { this.tips[i] = this.tips[i] || 0; this.missed[i] = this.missed[i] || 0; });
      return this.cellEntries[cell].map(i => { const r = this.check(i); if (r) r.clean = false; return r; }).filter(Boolean);
    }
    revealWord(i) {
      if (this.solved.has(i)) return [];
      const e = this.puzzle.entries[i];
      this.revealed.add(i); this.penalty += 3;
      e.cells.forEach(c => { this.fill[c] = this.solution[c]; });
      const touched = new Set(); e.cells.forEach(c => this.cellEntries[c].forEach(j => touched.add(j)));
      return [...touched].map(j => { const r = this.check(j); if (r && j === i) r.clean = false; return r; }).filter(Boolean);
    }
    stars() { return this.penalty <= 1 ? 3 : this.penalty <= 5 ? 2 : 1; }
  };

  /* Wertet ein fertiges Rätsel aus und schreibt alles in den Spielstand. */
  KW.finishPuzzle = function (session) {
    const S = KW.Store, d = S.data, p = session.puzzle, stage = KW.stage(p.stageId);
    const stars = session.stars(), mult = 1 + KW.STAGES.indexOf(stage) * 0.25;
    const own = p.entries.filter((e, i) => !session.revealed.has(i)).length;
    let xp = Math.round((own * 10 + stars * 10) * mult);
    if (p.kind === 'daily') xp += 40;
    if (p.kind === 'practice') xp = Math.round(xp * 0.6);
    const before = S.rank();
    let gained = xp, replay = false;

    p.entries.forEach((e, i) => {
      const w = S.wordEntry(e.word.answer);
      const clean = !session.revealed.has(i) && !session.missed[i];
      if (clean) { w.ok++; if (p.kind === 'practice' && w.auto) { w.hard = false; w.auto = false; } }
      else { w.bad++; if (session.revealed.has(i) || session.missed[i] >= 2) { if (!w.hard) w.auto = true; w.hard = true; } }
      w.seen = KW.today();
    });
    d.stats.correct += p.entries.filter((e, i) => !session.revealed.has(i)).length;
    d.stats.wrong += Object.values(session.missed).reduce((a, b) => a + b, 0);
    d.stats.hints += Object.values(session.tips).reduce((a, b) => a + b, 0) + session.given.size;
    d.stats.reveals += session.revealed.size;

    if (p.kind === 'level') {
      const old = d.levels[p.id];
      if (old) { replay = true; gained = Math.max(0, xp - old.xp); }
      d.levels[p.id] = { stars: Math.max(stars, old ? old.stars : 0), xp: Math.max(xp, old ? old.xp : 0), date: KW.today() };
    } else if (p.kind === 'daily') {
      if (d.daily[p.date] != null) { replay = true; gained = 0; }
      d.daily[p.date] = Math.max(stars, d.daily[p.date] || 0);
    } else d.stats.practice++;
    if (!replay) { d.stats.puzzles++; if (stars === 3) d.stats.perfect++; }
    d.xp += gained;
    const streakUp = S.touchStreak();
    d.session = null;
    const achievements = S.checkAchievements();
    S.save();
    const after = S.rank();
    return { stars, xp: gained, replay, streakUp, streak: d.streak.count, achievements, rankUp: after.index > before.index ? after : null,
      stageDone: p.kind === 'level' && !replay && S.stageProgress(p.stageId).done === stage.levels };
  };
})(KW);
