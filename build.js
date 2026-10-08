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
// Vollständige Seite im Hauptordner: GitHub Pages veröffentlicht sie direkt aus dem Branch main.
// dist/wortkreuz.html bleibt ohne Rahmen für das Claude-Artifact.
const page = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Kreuzworträtsel-Lernspiel für Deutsch: 100 Rätsel von A1 bis C1.">
<style>:root{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}</style>
${html.replace('<div id="app">', '</head>\n<body>\n<div id="app">')}</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, 'index.html'), page);
console.log('dist/wortkreuz.html', (html.length / 1024).toFixed(0) + ' KB');
