/* ============================================================
   core.js – Namensraum, Lernstufen, Wort-Parser, Zufall
   ============================================================ */
var KW = globalThis.KW = globalThis.KW || {};

/* Lernstufen. Neue Stufe = neuer Eintrag hier + eine Datendatei. */
KW.STAGES = [
  { id: 'A1', name: 'Anfänger',            blurb: 'Alltagswörter, Farben, Zahlen, Essen, Familie', levels: 20, words: [5, 6], clue: { en: 4, def: 3, ex: 3 } },
  { id: 'A2', name: 'Grundkenntnisse',     blurb: 'Wohnen, Wetter, Reisen, häufige Verben',        levels: 20, words: [6, 7], clue: { en: 2, def: 4, ex: 4 } },
  { id: 'B1', name: 'Mittelstufe',         blurb: 'Arbeit, Behörden, Gefühle, Umschreibungen',     levels: 20, words: [6, 7], clue: { en: 0, def: 6, ex: 4 } },
  { id: 'B2', name: 'Fortgeschritten',     blurb: 'Abstrakte Begriffe und Redewendungen',          levels: 20, words: [7, 8], clue: { en: 0, def: 7, ex: 3 } },
  { id: 'C1', name: 'Sehr fortgeschritten', blurb: 'Seltene Wörter, Idiomatik, feine Unterschiede', levels: 20, words: [7, 8], clue: { en: 0, def: 7, ex: 3 } }
];
KW.stage = id => KW.STAGES.find(s => s.id === id);

KW.WORDS = {};      // Stufe -> Wortobjekte
KW.WORD_INDEX = {}; // Lösung (GROSS) -> Wortobjekt

/* Großschreibung, die das ß erhält ('ß'.toUpperCase() wäre 'SS'). */
KW.upper = s => Array.from(s).map(ch => ch === 'ß' ? 'ß' : ch.toUpperCase()).join('');
KW.isLetter = ch => /^[A-ZÄÖÜß]$/.test(ch);

/* Zeilenformat: [Artikel ]Wort|Englisch|Umschreibung|Beispielsatz mit ___ */
KW.addWords = function (stageId, text) {
  const list = KW.WORDS[stageId] = KW.WORDS[stageId] || [];
  text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).forEach(line => {
    const [head, en, def, ex] = line.split('|').map(s => (s || '').trim());
    const m = head.match(/^(der|die|das)\s+(.+)$/);
    const lemma = m ? m[2] : head;
    const w = { lemma, article: m ? m[1] : '', answer: KW.upper(lemma), en, def, ex, stage: stageId };
    w.kind = w.article ? 'Nomen' : (/^[a-zäöü]/.test(lemma) && /e[lr]?n$/.test(lemma) && lemma.length > 3 && !KW.NOT_VERBS.has(lemma) ? 'Verb' : 'Wort');
    list.push(w);
    if (!KW.WORD_INDEX[w.answer]) KW.WORD_INDEX[w.answer] = w;
  });
};
KW.NOT_VERBS = new Set(['sieben', 'zehn', 'neun', 'bescheiden', 'gelassen', 'umstritten', 'angemessen', 'zufrieden', 'verschroben', 'unverhohlen', 'nüchtern', 'hanebüchen', 'anstrengend', 'teuer', 'dunkel', 'sauber', 'heikel', 'penibel']);
KW.display = w => (w.article ? w.article + ' ' : '') + w.lemma;

/* Deterministischer Zufall: gleiche Saat -> gleiches Rätsel auf jedem Gerät. */
KW.hash = function (str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
KW.rng = function (seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
KW.shuffle = function (arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
KW.today = function (d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
