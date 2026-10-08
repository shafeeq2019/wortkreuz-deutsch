/* ============================================================
   store.js – Spielstand. Liegt im LocalStorage des Browsers;
   ein späteres Backend müsste nur load() und save() ersetzen.
   ============================================================ */
(function (KW) {
  const KEY = 'wortkreuz.save.v1';
  const fresh = () => ({
    v: 1, stage: 'A1', xp: 0,
    levels: {},            // id -> { stars, xp, date }
    daily: {},             // Datum -> Sterne
    stats: { correct: 0, wrong: 0, hints: 0, reveals: 0, puzzles: 0, perfect: 0, practice: 0 },
    streak: { count: 0, best: 0, last: '' },
    words: {},             // LÖSUNG -> { ok, bad, hard, seen }
    achievements: {},      // id -> Datum
    session: null,         // angefangenes Rätsel
    settings: { theme: 'system', translations: true, markErrors: true, keyboard: 'auto', motion: true }
  });

  const Store = KW.Store = {
    data: fresh(), persistent: true,
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const saved = JSON.parse(raw), base = fresh();
          this.data = Object.assign(base, saved, {
            stats: Object.assign(base.stats, saved.stats), streak: Object.assign(base.streak, saved.streak),
            settings: Object.assign(base.settings, saved.settings)
          });
        }
      } catch (e) { this.persistent = false; }
      if (!KW.stage(this.data.stage)) this.data.stage = 'A1';
      return this.data;
    },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); this.persistent = true; }
      catch (e) { this.persistent = false; }
    },
    reset() { this.data = fresh(); this.save(); },

    /* ---- Fortschritt ---- */
    isDone(id) { return !!this.data.levels[id]; },
    isUnlocked(level) {
      return level.index === 0 || this.isDone(KW.stageLevels(level.stageId)[level.index - 1].id);
    },
    nextLevel(stageId) {
      const list = KW.stageLevels(stageId);
      return list.find(l => !this.isDone(l.id)) || null;
    },
    stageProgress(stageId) {
      const list = KW.stageLevels(stageId);
      const done = list.filter(l => this.isDone(l.id));
      return { done: done.length, total: list.length, stars: done.reduce((n, l) => n + this.data.levels[l.id].stars, 0) };
    },
    totalDone() { return Object.keys(this.data.levels).length; },
    totalStars() { return Object.values(this.data.levels).reduce((n, l) => n + l.stars, 0); },

    /* ---- Lernserie ---- */
    streakNow() {
      const s = this.data.streak, t = KW.today();
      const y = new Date(); y.setDate(y.getDate() - 1);
      return (s.last === t || s.last === KW.today(y)) ? s.count : 0;
    },
    touchStreak() {
      const s = this.data.streak, t = KW.today();
      if (s.last === t) return false;
      s.count = this.streakNow() + 1; s.last = t; s.best = Math.max(s.best, s.count);
      return true;
    },

    /* ---- Wortliste ---- */
    wordEntry(answer) {
      return this.data.words[answer] = this.data.words[answer] || { ok: 0, bad: 0, hard: false, seen: KW.today() };
    },
    learnedWords() {
      return Object.keys(this.data.words).filter(a => KW.WORD_INDEX[a]).map(a => Object.assign({ word: KW.WORD_INDEX[a] }, this.data.words[a]));
    },

    /* ---- Rang aus XP ---- */
    rank() {
      const names = ['Neuling', 'Wortsammler', 'Silbenjäger', 'Satzbauer', 'Vielleser', 'Sprachfreund', 'Wortakrobat', 'Sprachprofi', 'Wortmeister'];
      const step = 300, i = Math.min(names.length - 1, Math.floor(this.data.xp / step));
      const last = i === names.length - 1;
      return { name: names[i], index: i + 1, into: last ? step : this.data.xp - i * step, step, next: last ? null : names[i + 1] };
    }
  };

  /* ---- Erfolge: jede Regel prüft nur den Spielstand ---- */
  KW.ACHIEVEMENTS = [
    { id: 'first',    name: 'Erster Schritt',  text: 'Löse dein erstes Rätsel.',                 test: d => d.stats.puzzles >= 1 },
    { id: 'perfect',  name: 'Fehlerfrei',      text: 'Löse ein Rätsel mit drei Sternen.',         test: d => d.stats.perfect >= 1 },
    { id: 'perfect5', name: 'Sternensammler',  text: 'Hole zehnmal drei Sterne.',                 test: d => d.stats.perfect >= 10 },
    { id: 'streak3',  name: 'Dranbleiber',     text: 'Lerne drei Tage in Folge.',                 test: d => d.streak.best >= 3 },
    { id: 'streak7',  name: 'Eine ganze Woche', text: 'Lerne sieben Tage in Folge.',              test: d => d.streak.best >= 7 },
    { id: 'streak30', name: 'Gewohnheitstier', text: 'Lerne 30 Tage in Folge.',                   test: d => d.streak.best >= 30 },
    { id: 'words50',  name: 'Wortschatzkiste', text: 'Sammle 50 Wörter in deiner Wortliste.',     test: d => Object.keys(d.words).length >= 50 },
    { id: 'words200', name: 'Wandelndes Lexikon', text: 'Sammle 200 Wörter in deiner Wortliste.', test: d => Object.keys(d.words).length >= 200 },
    { id: 'daily1',   name: 'Tagesform',       text: 'Löse ein Tagesrätsel.',                     test: d => Object.keys(d.daily).length >= 1 },
    { id: 'daily7',   name: 'Stammgast',       text: 'Löse sieben Tagesrätsel.',                  test: d => Object.keys(d.daily).length >= 7 },
    { id: 'practice', name: 'Übung macht den Meister', text: 'Löse ein Übungsrätsel aus deiner Wortliste.', test: d => d.stats.practice >= 1 }
  ].concat(KW.STAGES.map(s => ({
    id: 'stage' + s.id, name: s.id + ' geschafft', text: 'Löse alle ' + s.levels + ' Rätsel der Stufe ' + s.id + '.',
    test: d => Object.keys(d.levels).filter(k => k.startsWith(s.id + '-')).length >= s.levels
  })));
  Store.checkAchievements = function () {
    const fresh = [];
    KW.ACHIEVEMENTS.forEach(a => {
      if (!this.data.achievements[a.id] && a.test(this.data)) { this.data.achievements[a.id] = KW.today(); fresh.push(a); }
    });
    return fresh;
  };
})(KW);
