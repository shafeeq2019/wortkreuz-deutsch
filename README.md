# Wortkreuz Deutsch

Ein Kreuzworträtsel-Lernspiel zum Deutschlernen: 100 Rätsel von A1 bis C1, Wortliste mit Artikel,
Übersetzung und Beispielsatz, Tagesrätsel, Übungsrätsel aus eigenen Wörtern, XP, Sterne, Lernserie
und Erfolge. Läuft ohne Server und ohne Abhängigkeiten als eine einzige HTML-Seite.

## Starten

```
node build.js      # erzeugt dist/wortkreuz.html
node test.js       # prüft die Wortdaten und alle generierten Levels
```

`dist/wortkreuz.html` enthält die Seite ohne `<html>`-Rahmen (so wird sie als Claude-Artifact
veröffentlicht). Zum lokalen Öffnen reicht jeder Browser; sauberer ist ein Rahmen mit
`<meta charset="utf-8">` und Viewport-Angabe darum.

## Aufbau

| Datei | Aufgabe |
| --- | --- |
| `src/data/*.js` | Wortdatenbank, eine Datei pro Lernstufe |
| `src/core.js` | Lernstufen, Wort-Parser, Zufall mit fester Saat |
| `src/engine.js` | Kreuzworträtsel-Generator (ohne DOM) |
| `src/levels.js` | Baut Levels, Tagesrätsel und Übungsrätsel aus den Wörtern |
| `src/store.js` | Spielstand (LocalStorage), Lernserie, Ränge, Erfolge |
| `src/game.js` | Spielregeln für ein laufendes Rätsel, Auswertung |
| `src/ui.js`, `src/styles.css` | Oberfläche |
| `build.js` | Fügt alles zu einer Seite zusammen |
| `test.js` | Daten- und Levelprüfung |
| `tools/` | Browser-Durchläufe mit Playwright (optional) |

## Wörter hinzufügen

Eine Zeile pro Wort in der passenden Datei unter `src/data/`:

```
das Haus|house|Ein Gebäude. Dort wohnt man.|Wir wohnen in einem kleinen ___ mit Garten.
```

Format: `[Artikel ]Wort|Englisch|Umschreibung|Beispielsatz mit ___`. Die Lösung darf 3 bis 11
Buchstaben haben und weder in der Umschreibung noch im Beispielsatz vorkommen; `node test.js`
prüft das. Es gibt keine handgebauten Levels: Neue Wörter ergeben automatisch neue Rätsel.
Achtung: Dabei ändern sich die bestehenden Rätsel einer Stufe, weil die Wörter neu verteilt werden.

Eine neue Lernstufe braucht einen Eintrag in `KW.STAGES` (`src/core.js`), eine Datendatei und
deren Namen in `build.js` und `test.js`.

## Bekannte Grenzen

- In A2 bis C1 reicht der Wortschatz nicht ganz für 20 Levels ohne Wiederholung; die letzten
  Levels sind als Wiederholung markiert. Rund 40 weitere Wörter je Stufe beheben das.
- Der Spielstand liegt im Browser und wird nicht zwischen Geräten abgeglichen.
- Hinweise und Beispielsätze sind nur formal geprüft, nicht von einer Lehrkraft gegengelesen.
