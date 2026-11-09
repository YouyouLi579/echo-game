# Echo investigation game

This is a local, buildless HTML/CSS/JavaScript implementation of the [requirements document](../Requirements%20Document.md). No packages, account, or backend are needed.

## Run

Open `index.html` in a modern browser. If your browser restricts local files, start a small static server from the project root so the shared image assets are available:

```sh
cd ..
python3 -m http.server 8765
```

Then visit `http://localhost:8765/coding_files/`.

## Files

- `index.html` — page layout and phone controls
- `style.css` — responsive layout and phone styling
- `data.js` — story text, artifacts, contacts, and endings
- `app.js` — navigation, puzzles, mini-games, saving, and ending logic

The game saves progress in browser local storage. Use **Restart** or **Replay investigation** to begin a new run. Audio is optional; all story clues and calls have readable text.
