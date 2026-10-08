const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), out = process.argv[2];
  require('fs').writeFileSync(out + '/page.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + require('fs').readFileSync(require('path').join(__dirname, '..', 'dist', 'wortkreuz.html'), 'utf8') + '</body></html>');
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + out + '/page.html');
  await p.evaluate(() => { KW.Store.data.settings.keyboard = 'never'; KW.Store.save(); });
  await p.tap('[data-act=play]'); await p.waitForTimeout(200);
  const L = await p.evaluate(() => KW.level('A1-01').entries.map(e => ({ c: e.cells[0], w: e.letters.join('') })));
  await p.tap(`.cell[data-c="${L[0].c}"]`);
  console.log('Fokus nach Tippen auf Feld:', await p.evaluate(() => document.activeElement.id));
  await p.keyboard.insertText('x'); await p.keyboard.insertText('y');           // wie Android: nur input-Ereignisse
  let st = () => p.evaluate(() => JSON.parse(localStorage.getItem('wortkreuz.save.v1')).session.fill.filter(Boolean).join(''));
  console.log('nach x,y:', await st());
  await p.evaluate(() => { const el = document.getElementById('sysin'); el.value = ''; el.dispatchEvent(new InputEvent('input', { bubbles: true })); });
  console.log('nach Löschtaste:', await st());
  await p.evaluate(() => { const el = document.getElementById('sysin'); el.value = ''; el.dispatchEvent(new InputEvent('input', { bubbles: true })); });
  for (const ch of L[0].w.toLowerCase()) await p.keyboard.insertText(ch);
  console.log('Wort getippt:', await st(), '| gelöst:', await p.evaluate(() => JSON.parse(localStorage.getItem('wortkreuz.save.v1')).session.solved), '| Fokus:', await p.evaluate(() => document.activeElement.id));
  await p.tap('[data-act=tip]'); console.log('Fokus nach Tipp:', await p.evaluate(() => document.activeElement.id), '| Überlauf:', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), errs);
  await b.close();
})();
