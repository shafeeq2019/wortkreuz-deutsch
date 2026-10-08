# Wortkreuz Deutsch

A crossword game for learning German: 100 puzzles from CEFR level A1 to C1, a personal word list
with article, translation and example sentence, a daily puzzle, practice puzzles built from your
own words, XP, stars, streaks and achievements. It runs as a single HTML page with no server and
no dependencies. The game's interface is in German.

## Getting started

```
node build.js      # writes index.html and dist/wortkreuz.html
node test.js       # checks the word data and every generated level
```

The build writes two files: `index.html` in the repository root is the complete page, for hosting
or for opening locally in a browser. `dist/wortkreuz.html` is the same page without the `<html>`
wrapper, which is the form a Claude artifact expects.

## Deployment

The game is live at https://shafeeq2019.github.io/wortkreuz-deutsch/

GitHub Pages serves the `main` branch directly (Settings → Pages → Source: "Deploy from a branch",
`main`, `/ (root)`), so the built `index.html` is committed. Run `node build.js` before committing
changes under `src/`; the CI workflow fails if the committed build is out of date. The game is a
static page, so any static host works as well.

Progress is stored per web address: a player's save on one URL does not carry over to another.

## Structure

| File | Purpose |
| --- | --- |
| `src/data/*.js` | Word bank, one file per level |
| `src/core.js` | Levels (A1–C1), word parser, seeded random numbers |
| `src/engine.js` | Crossword generator (no DOM) |
| `src/levels.js` | Builds levels, daily puzzles and practice puzzles from the words |
| `src/store.js` | Save game (LocalStorage), streak, ranks, achievements |
| `src/game.js` | Rules for a running puzzle, scoring |
| `src/ui.js`, `src/styles.css` | Interface |
| `build.js` | Bundles everything into one page |
| `test.js` | Data and level checks |
| `tools/` | Browser playthroughs with Playwright (optional) |

## Adding words

One line per word in the matching file under `src/data/`:

```
das Haus|house|Ein Gebäude. Dort wohnt man.|Wir wohnen in einem kleinen ___ mit Garten.
```

Format: `[article ]word|English|German paraphrase|example sentence with ___`. The answer must be
3 to 11 letters long and must not appear in the paraphrase or the example sentence; `node test.js`
checks this. There are no hand-built levels: new words produce new puzzles automatically.
Note that adding words changes the existing puzzles of that level, because the words are
redistributed.

A new level needs an entry in `KW.STAGES` (`src/core.js`), a data file, and that file's name in
`build.js` and `test.js`.

## Known limits

- In A2 to C1 the word bank is slightly too small for 20 levels without repeats; the last levels
  are marked as review. About 40 more words per level would fix this.
- Progress is stored in the browser and is not synced between devices.
- Clues and example sentences have only been checked formally, not proofread by a teacher.
