const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const out = process.argv[2];
  const errors = [];
  const wrap = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + require('fs').readFileSync(require('path').join(__dirname, '..', 'dist', 'wortkreuz.html'), 'utf8') + '</body></html>';
  require('fs').writeFileSync(out + '/page.html', wrap);
  const run = async (name, vp, scheme, touch) => {
    const ctx = await b.newContext({ viewport: vp, colorScheme: scheme, hasTouch: touch, isMobile: touch });
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(name + ': ' + e.message)); p.on('console', m => m.type() === 'error' && errors.push(name + ': ' + m.text()));
    await p.goto('file://' + out + '/page.html'); await p.waitForTimeout(700);
    await p.screenshot({ path: `${out}/${name}-home.png`, fullPage: true });
    if (touch) await p.evaluate(() => { KW.Store.data.settings.keyboard = 'always'; KW.Store.save(); });
    await p.click('[data-act=play]'); await p.waitForTimeout(300);
    // ein Fehlversuch, ein Tipp, dann alles lösen
    const info = await p.evaluate(() => { const l = KW.level('A1-01'); return l.entries.map(e => e.word.answer); });
    const wrong = Array.from(info[0]).reverse().join('');
    if (touch) for (const ch of wrong) await p.click(`.kb [data-k="${ch}"]`); else await p.keyboard.type(wrong.toLowerCase());
    await p.click('[data-act=tip]'); await p.waitForTimeout(200);
    await p.screenshot({ path: `${out}/${name}-game.png`, fullPage: !touch });
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    for (let i = 0; i < info.length; i++) {
      await p.evaluate(i => document.querySelector(`[data-act=entry][data-e="${i}"]`).click(), i);
      const letters = await p.evaluate(i => { const s = JSON.parse(localStorage.getItem('wortkreuz.save.v1')).session, L = KW.level('A1-01'), e = L.entries[i];
        if (s.solved.includes(i)) return ''; const locked = new Set(); s.solved.forEach(j => L.entries[j].cells.forEach(c => locked.add(c)));
        return e.cells.map((c, k) => locked.has(c) ? '' : e.letters[k]).join(''); }, i);
      await p.keyboard.type(letters.toLowerCase());
      if (i === 1) await p.screenshot({ path: `${out}/${name}-mid.png`, fullPage: !touch });
    }
    await p.waitForTimeout(1600);
    await p.screenshot({ path: `${out}/${name}-result.png`, fullPage: true });
    const state = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('wortkreuz.save.v1')); return { xp: d.xp, levels: d.levels, streak: d.streak, words: Object.keys(d.words).length, ach: Object.keys(d.achievements), screen: document.querySelector('h1').textContent }; });
    await p.reload(); await p.waitForTimeout(400);
    const after = await p.evaluate(() => document.querySelector('.play').textContent);
    await p.click('[data-act=levels]'); await p.waitForTimeout(300); await p.screenshot({ path: `${out}/${name}-levels.png` });
    console.log(name, 'overflow', ov, JSON.stringify(state), '| nach Neuladen:', after);
    await ctx.close();
  };
  await run('phone-light', { width: 390, height: 800 }, 'light', true);
  await run('desk-dark', { width: 1200, height: 860 }, 'dark', false);
  console.log(errors.length ? errors.join('\n') : 'keine Fehler in der Konsole');
  await b.close();
})();
