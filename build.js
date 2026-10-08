// Fügt die Quelldateien zu einer einzigen Seite zusammen:  node build.js
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const scripts = ['core.js', 'data/a1.js', 'data/a2.js', 'data/b1.js', 'data/b2.js', 'data/c1.js', 'engine.js', 'levels.js', 'store.js', 'game.js', 'ui.js'];
const html = `<title>Wortkreuz Deutsch</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&display=swap">
<style>
${read('styles.css')}</style>
<div id="app"></div>
<script>
${scripts.map(f => '/* ===== ' + f + ' ===== */\n' + read(f)).join('\n')}</script>
`;
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'wortkreuz.html'), html);
console.log('dist/wortkreuz.html', (html.length / 1024).toFixed(0) + ' KB');
