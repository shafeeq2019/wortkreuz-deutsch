/* ============================================================
   levels.js – erzeugt alle Levels aus der Wortdatenbank.
   Es gibt keine handgebauten Einzel-Levels: mehr Wörter in den
   Datendateien ergeben automatisch frische Rätsel.
   ============================================================ */
(function (KW) {
  const cache = {};

  /* Welche Hinweisart ein Wort als Haupt-Hinweis bekommt (fest pro Wort). */
  KW.clueKind = function (word, stage) {
    const mix = stage.clue, total = mix.en + mix.def + mix.ex;
    let x = KW.hash('clue:' + word.answer) % total;
    if (word.def.startsWith('Redewendung')) return 'def';
    if (x < mix.en) return 'en';
    x -= mix.en;
    return x < mix.def ? 'def' : 'ex';
  };

  function finish(id, kind, stage, grid, extra) {
    return Object.assign({ id, kind, stageId: stage.id, rows: grid.rows, cols: grid.cols,
      entries: grid.entries.map(e => ({ word: e.word, letters: e.letters, row: e.row, col: e.col, dir: e.dir, num: e.num, cells: e.cells, clue: KW.clueKind(e.word, stage) })) }, extra);
  }

  /* Alle Levels einer Stufe. Nicht verbaute Wörter wandern zurück in die
     Warteschlange, damit sich Wörter so spät wie möglich wiederholen. */
  KW.stageLevels = function (stageId) {
    if (cache[stageId]) return cache[stageId];
    const stage = KW.stage(stageId), pool = KW.WORDS[stageId] || [];
    const rand = KW.rng(KW.hash('stage:' + stageId));
    let queue = KW.shuffle(pool, rand), round = 1;
    const out = [];
    for (let i = 0; i < stage.levels; i++) {
      const t = stage.levels > 1 ? i / (stage.levels - 1) : 0;
      const target = Math.round(stage.words[0] + (stage.words[1] - stage.words[0]) * t + (i % 3 === 2 ? 0.4 : 0));
      const offer = [];
      while (offer.length < target + 3) {
        if (!queue.length) { queue = KW.shuffle(pool, rand); round++; }
        const w = queue.shift();
        if (!offer.includes(w)) offer.push(w);
      }
      const grid = KW.buildCrossword(offer, target, rand, 40);
      queue = grid.unused.concat(queue);
      out.push(finish(stageId + '-' + String(i + 1).padStart(2, '0'), 'level', stage, grid,
        { index: i, number: KW.STAGES.indexOf(stage) * 20 + i + 1, review: round > 1 }));
    }
    return cache[stageId] = out;
  };
  KW.level = function (id) {
    const [stageId, n] = id.split('-');
    return (KW.stageLevels(stageId) || [])[parseInt(n, 10) - 1] || null;
  };
  KW.totalLevels = () => KW.STAGES.reduce((n, s) => n + s.levels, 0);

  /* Tagesrätsel: jeden Tag ein neues, auf allen Geräten dasselbe. */
  KW.dailyPuzzle = function (stageId, date) {
    const stage = KW.stage(stageId), rand = KW.rng(KW.hash('daily:' + stageId + ':' + date));
    const offer = KW.shuffle(KW.WORDS[stageId], rand).slice(0, 11);
    return finish('daily-' + date + '-' + stageId, 'daily', stage, KW.buildCrossword(offer, 8, rand, 50), { date });
  };

  /* Übungsrätsel aus der persönlichen Wortliste. */
  KW.practicePuzzle = function (answers, seed) {
    const words = answers.map(a => KW.WORD_INDEX[a]).filter(Boolean);
    if (words.length < 4) return null;
    const rand = KW.rng(KW.hash('practice:' + seed));
    const offer = KW.shuffle(words, rand).slice(0, 12);
    const stage = KW.stage(offer[0].stage);
    const grid = KW.buildCrossword(offer, 7, rand, 60);
    if (grid.entries.length < 3) return null;
    const p = finish('practice-' + seed, 'practice', stage, grid, {});
    p.entries.forEach(e => { e.clue = KW.clueKind(e.word, KW.stage(e.word.stage)); });
    return p;
  };
})(KW);
