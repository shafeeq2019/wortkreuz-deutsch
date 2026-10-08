/* ============================================================
   engine.js – Kreuzworträtsel-Generator (ohne DOM, läuft auch in Node)
   Eingabe: Wortobjekte. Ausgabe: Gitter mit sich kreuzenden Einträgen.
   ============================================================ */
(function (KW) {
  const MAX_SHORT = 11, MAX_LONG = 12;

  function tryLayout(words, target, rand) {
    const cells = new Map();           // "r,c" -> { ch, a: bool, d: bool }
    const placed = [];
    let minR = 0, maxR = 0, minC = 0, maxC = 0;
    const key = (r, c) => r + ',' + c;
    const get = (r, c) => cells.get(key(r, c));

    function fits(letters, r, c, dir) {
      const dr = dir === 'd' ? 1 : 0, dc = dir === 'a' ? 1 : 0, n = letters.length;
      if (get(r - dr, c - dc) || get(r + dr * n, c + dc * n)) return null;
      let cross = 0;
      for (let k = 0; k < n; k++) {
        const rr = r + dr * k, cc = c + dc * k, cell = get(rr, cc);
        if (cell) {
          if (cell.ch !== letters[k] || cell[dir]) return null;
          cross++;
        } else if (get(rr - dc, cc - dr) || get(rr + dc, cc + dr)) return null;
      }
      if (cross === n) return null;
      const h = Math.max(maxR, r + dr * (n - 1)) - Math.min(minR, r) + 1;
      const w = Math.max(maxC, c + dc * (n - 1)) - Math.min(minC, c) + 1;
      if (Math.min(h, w) > MAX_SHORT || Math.max(h, w) > MAX_LONG) return null;
      return cross * 100 - h * w;
    }
    function put(word, letters, r, c, dir) {
      const dr = dir === 'd' ? 1 : 0, dc = dir === 'a' ? 1 : 0;
      letters.forEach((ch, k) => {
        const rr = r + dr * k, cc = c + dc * k, cell = get(rr, cc) || { ch };
        cell[dir] = true; cells.set(key(rr, cc), cell);
        minR = Math.min(minR, rr); maxR = Math.max(maxR, rr); minC = Math.min(minC, cc); maxC = Math.max(maxC, cc);
      });
      placed.push({ word, letters, row: r, col: c, dir });
    }

    const order = words.map(w => ({ w, k: w.answer.length + rand() * 3 })).sort((x, y) => y.k - x.k).map(x => x.w);
    const first = order.shift();
    put(first, Array.from(first.answer), 0, 0, rand() < 0.5 ? 'a' : 'd');
    let crossings = 0, progress = true;
    while (order.length && placed.length < target && progress) {
      progress = false;
      for (let i = 0; i < order.length && placed.length < target; i++) {
        const letters = Array.from(order[i].answer);
        let best = null;
        for (const p of placed) {
          const dir = p.dir === 'a' ? 'd' : 'a';
          for (let pk = 0; pk < p.letters.length; pk++) for (let k = 0; k < letters.length; k++) {
            if (p.letters[pk] !== letters[k]) continue;
            const cr = p.row + (p.dir === 'd' ? pk : 0), cc = p.col + (p.dir === 'a' ? pk : 0);
            const r = cr - (dir === 'd' ? k : 0), c = cc - (dir === 'a' ? k : 0);
            const s = fits(letters, r, c, dir);
            if (s === null) continue;
            const score = s + rand() * 20;
            if (!best || score > best.score) best = { score, r, c, dir };
          }
        }
        if (best) {
          const before = cells.size;
          put(order[i], letters, best.r, best.c, best.dir);
          crossings += letters.length - (cells.size - before);
          order.splice(i, 1); i--; progress = true;
        }
      }
    }
    const h = maxR - minR + 1, w = maxC - minC + 1;
    return { placed, minR, minC, rows: h, cols: w, score: placed.length * 10000 + crossings * 150 - h * w - Math.abs(h - w) * 3 };
  }

  /* Baut ein Rätsel aus bis zu `target` der angebotenen Wörter. */
  KW.buildCrossword = function (words, target, rand, attempts) {
    let best = null;
    for (let i = 0; i < (attempts || 40); i++) {
      const lay = tryLayout(words, target, rand);
      if (!best || lay.score > best.score) best = lay;
    }
    const flip = best.cols > best.rows;            // hochkant passt besser aufs Handy
    let entries = best.placed.map(p => {
      const r = p.row - best.minR, c = p.col - best.minC;
      return flip ? { word: p.word, letters: p.letters, row: c, col: r, dir: p.dir === 'a' ? 'd' : 'a' }
                  : { word: p.word, letters: p.letters, row: r, col: c, dir: p.dir };
    });
    const rows = flip ? best.cols : best.rows, cols = flip ? best.rows : best.cols;
    entries.sort((x, y) => x.row - y.row || x.col - y.col || (x.dir === 'a' ? -1 : 1));
    let num = 0, last = '';
    entries.forEach(e => {
      const k = e.row + ',' + e.col;
      if (k !== last) { num++; last = k; }
      e.num = num;
      e.cells = e.letters.map((_, i) => (e.row + (e.dir === 'd' ? i : 0)) * cols + e.col + (e.dir === 'a' ? i : 0));
    });
    const used = new Set(entries.map(e => e.word));
    return { rows, cols, entries, unused: words.filter(w => !used.has(w)) };
  };
})(KW);
