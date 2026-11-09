(function () {
  "use strict";

  const DATA = window.ECHO_DATA;
  const STORAGE_KEY = "echo-investigation-v1";
  const LANGUAGE_KEY = "echo-language";
  const screenEl = document.getElementById("phone-screen");
  const caseEl = document.getElementById("case-content");
  const modalEl = document.getElementById("modal-root");
  const statusEl = document.getElementById("status-bar");
  const toastEl = document.getElementById("toast");
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const defaultState = () => ({
    sshConnected: false, sshLoginAt: null, started: false, stage: 1, ownerWrong: 0, echoWrong: 0, gameOver: null, deadline: null, forced: false, ending: null, batteryAtEnd: null,
    unlocked: { voicemail: false, memos: false, album: false, archive: false, deleted: false },
    memoWrong: 0, deletedAttempt: false, apologySent: false, callCredit: 1, fallbackContactRevealed: false,
    viewed: [], completedGames: [], bestScores: { maze: null, mines: null }, contacts: [], terminalLog: [], muted: false
  });
  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || typeof parsed !== "object") return defaultState();
      const base = defaultState();
      const viewed = Array.isArray(parsed.viewed) ? parsed.viewed : [];
      const contacts = Array.isArray(parsed.contacts) ? parsed.contacts.filter(id => !["rina", "emma"].includes(id) || viewed.includes("photo:contact-page-large") || (id === "rina" && parsed.fallbackContactRevealed)) : [];
      const bestScores = Object.fromEntries(["maze", "mines"].map(kind => [kind, Number.isFinite(parsed.bestScores?.[kind]) && parsed.bestScores[kind] >= 0 ? parsed.bestScores[kind] : null]));
      return { ...base, ...parsed, unlocked: { ...base.unlocked, ...(parsed.unlocked || {}) }, viewed, completedGames: Array.isArray(parsed.completedGames) ? parsed.completedGames : [], bestScores, contacts, terminalLog: Array.isArray(parsed.terminalLog) ? parsed.terminalLog.filter(entry => entry && typeof entry.answer === "string" && typeof entry.result === "string").slice(-40) : [] };
    } catch { return defaultState(); }
  }
  let state = loadState();
  if (state.sshConnected && !state.sshLoginAt) { state.sshLoginAt = Date.now(); save(); }
  let language = (() => { try { return localStorage.getItem(LANGUAGE_KEY) === "zh" ? "zh" : "en"; } catch { return "en"; } })();
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  function localize(root) {
    if (!root || !document.createTreeWalker) return;
    const walker = document.createTreeWalker(root, 4);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest("script,style,.terminal-typed-value")) continue;
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const english = originalText.get(node);
      node.nodeValue = language === "zh" ? window.ECHO_TRANSLATE_ZH(english) : english;
    }
    const elements = [root, ...root.querySelectorAll("[placeholder],[aria-label],[title]")];
    for (const element of elements) {
      let originals = originalAttributes.get(element);
      if (!originals) { originals = {}; originalAttributes.set(element, originals); }
      for (const attr of ["placeholder", "aria-label", "title"]) {
        if (!element.hasAttribute(attr)) continue;
        if (!(attr in originals)) originals[attr] = element.getAttribute(attr);
        element.setAttribute(attr, language === "zh" ? window.ECHO_TRANSLATE_ZH(originals[attr]) : originals[attr]);
      }
    }
  }
  function setLanguage(next) {
    if (!["en", "zh"].includes(next) || language === next) return;
    const drafts = [...document.querySelectorAll("input[id]")].map(input => [input.id, input.value]);
    const focused = document.activeElement?.id;
    language = next;
    try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* Keep this tab's preference. */ }
    render();
    for (const [id, value] of drafts) { const input = document.getElementById(id); if (input) input.value = value; }
    if (focused) document.getElementById(focused)?.focus?.();
  }
  let ui = { screen: state.gameOver ? "game-over" : state.ending ? "ending" : state.forced ? "dialer" : state.started ? "home" : "opening", payload: null };
  let history = [];
  let modal = state.forced && !state.ending ? { type: "battery" } : null;
  let gateError = "";
  let dialError = "";
  let ringtoneRevealed = state.viewed.includes("ringtone");
  let game = null;
  let gameInterval = null;
  let toastTimeout = null;
  let audioContext = null;

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* In-memory play still works. */ }
  }
  function discover(id) {
    if (!state.viewed.includes(id)) { state.viewed.push(id); save(); }
  }
  function discoverContact(id) {
    if (!state.contacts.includes(id)) { state.contacts.push(id); save(); }
  }
  function contactName(id) {
    return DATA.contacts[id].name;
  }
  function toast(message) {
    toastEl.textContent = message;
    localize(toastEl);
    toastEl.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastEl.classList.remove("show"), 3400);
  }
  function tone(notes = [440, 660]) {
    if (state.muted) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const volume = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        volume.gain.setValueAtTime(0.0001, audioContext.currentTime + index * 0.16);
        volume.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + index * 0.16 + 0.02);
        volume.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + index * 0.16 + 0.15);
        oscillator.connect(volume).connect(audioContext.destination);
        oscillator.start(audioContext.currentTime + index * 0.16);
        oscillator.stop(audioContext.currentTime + index * 0.16 + 0.16);
      });
    } catch { /* Audio is optional. */ }
  }
  function stopGame() {
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = null;
    game = null;
  }
  function go(screen, payload = null, replace = false) {
    if (state.gameOver || (state.forced && !state.ending && screen !== "dialer" && screen !== "ending")) return;
    if (ui.screen === "game" && screen !== "game") stopGame();
    if (!replace) history.push({ ...ui });
    ui = { screen, payload };
    gateError = "";
    dialError = "";
    render();
    screenEl.scrollTop = 0;
  }
  function back() {
    if (modal) { if (modal.type !== "battery") { modal = null; renderModal(); } return; }
    if (state.gameOver || state.forced || ui.screen === "ending") return;
    if (ui.screen === "game") stopGame();
    ui = history.pop() || { screen: "home", payload: null };
    render();
    screenEl.scrollTop = 0;
  }
  function home() {
    if (modal || state.gameOver || state.forced || ui.screen === "ending") return;
    if (ui.screen === "game") stopGame();
    history = [];
    ui = { screen: "home", payload: null };
    render();
  }
  function openApp(name, replace = false) {
    if (["voicemail", "memos", "archive", "deleted", "album"].includes(name) && !state.unlocked[name]) {
      if (name === "memos" && state.memoWrong >= 3) return go("locked-out", "memos");
      if (name === "deleted" && state.deletedAttempt) return go("locked-out", "deleted");
      return go("gate", name);
    }
    const destinations = {
      messages: ["folders", null], calls: ["calls", null], voicemail: ["voicemails", null],
      settings: ["settings", null], memos: ["memos", null], photos: ["photos", "main"],
      games: ["games", null], archive: ["threads", "archive"], deleted: ["deleted", null],
      album: ["photos", "album"]
    };
    const [screen, payload] = destinations[name] || ["home", null];
    go(screen, payload, replace);
  }
  function checkDeadline() {
    if (state.stage !== 3 || state.ending || state.forced || !state.deadline) return;
    if (Date.now() >= state.deadline) {
      state.forced = true;
      if (!state.contacts.length) { state.contacts.push("rina"); state.fallbackContactRevealed = true; }
      save();
      stopGame();
      history = [];
      ui = { screen: "dialer", payload: null };
      modal = { type: "battery" };
      render();
    } else {
      renderStatus();
    }
  }
  function batteryPercent() {
    if (state.ending && state.batteryAtEnd !== null) return state.batteryAtEnd;
    if (!state.deadline) return 50;
    return Math.max(1, Math.min(50, Math.ceil(50 * (state.deadline - Date.now()) / (15 * 60 * 1000))));
  }
  function renderStatus() {
    statusEl.innerHTML = `<span>▮▮▮ &nbsp; ${state.started ? "Oct 2026" : "--:--"}</span><span>${state.callCredit ? "1 call" : "0 calls"} · ▰ ${batteryPercent()}%</span>`;
    document.querySelector(".phone-bottom").textContent = state.callCredit ? "ONE CALL LEFT" : "NO CALL CREDIT";
    localize(statusEl);
    localize(document.querySelector(".phone-bottom"));
  }
  function render() {
    document.getElementById("ssh-gate").hidden = state.sshConnected;
    document.getElementById("session-status").textContent = state.sshConnected ? "CONNECTED" : "DISCONNECTED";
    renderStatus();
    screenEl.innerHTML = renderScreen();
    renderCase();
    renderModal();
    document.getElementById("mute-button").textContent = `Sound: ${state.muted ? "Off" : "On"}`;
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = language === "zh" ? "Echo — 远程桌面调查" : "Echo — Remote Desktop Investigation";
    document.getElementById("lang-en")?.setAttribute?.("aria-pressed", String(language === "en"));
    document.getElementById("lang-zh")?.setAttribute?.("aria-pressed", String(language === "zh"));
    localize(document.body);
  }
  const button = (label, action, attrs = "", className = "screen-button") => `<button type="button" class="${className}" data-action="${action}" ${attrs}>${label}</button>`;
  function renderScreen() {
    switch (ui.screen) {
      case "game-over": return `<p class="screen-label">Investigation ended</p><h2>Game over</h2><p>Three incorrect answers to Question ${state.gameOver === "owner" ? "1" : "2"}. Start a new investigation to try again.</p>${button("Start over", "restart-request")}`;
      case "opening": return `<p class="screen-label">Library · October 2026</p><h2>An old phone</h2><p>You pause your assignment and notice a button phone on the desk. It has 50% battery, no internet, and enough credit for one outgoing call.</p><p>A message arrives. Who left the phone here—and what is Echo?</p>${button("Begin investigation", "begin")}`;
      case "home": return `<p class="screen-label">Menu</p><div class="screen-grid">${[
        ["Messages", "messages", "Texts & folders"], ["Calls", "calls", "Dialer & contacts"],
        ["Voicemail", "voicemail", state.unlocked.voicemail ? "2 recordings" : "PIN required"],
        ["Settings", "settings", "Ringtone"], ["Memos", "memos", state.unlocked.memos ? "6 entries" : "PIN required"],
        ["Photos", "photos", "Albums"], ["Games", "games", "3 games"]
      ].map(([name, action, sub]) => `<button type="button" class="screen-card" data-action="open-app" data-id="${action}"><strong>${name}</strong><span>${sub}</span></button>`).join("")}</div>`;
      case "folders": return `<p class="screen-label">Messages</p><h2>Folders</h2>${button(`Inbox · ${conversationGroups("inbox").length} conversations`, "open-folder", 'data-id="inbox"')}${button(`Echo archive ${state.unlocked.archive ? "· Open" : "· Locked"}`, "open-app", 'data-id="archive"')}${button(`Deleted ${state.unlocked.deleted ? "· Open" : "· Locked"}`, "open-app", 'data-id="deleted"')}`;
      case "threads": return renderThreads(ui.payload);
      case "thread": return renderThread(ui.payload);
      case "gate": return renderGate(ui.payload);
      case "locked-out": return `<p class="screen-label">Locked</p><h2>${ui.payload === "memos" ? "Memos erased" : "Deleted folder locked"}</h2><p>${ui.payload === "memos" ? "Three incorrect PIN entries erased the memos for this run." : "The single password attempt was incorrect. The folder remains locked for this run."}</p>${button("Return home", "home")}`;
      case "deleted": return renderDeleted();
      case "calls": return `<p class="screen-label">Calls</p><h2>Calls and contacts</h2>${button("Dial a number", "dialer")}${button("Discovered contacts", "contacts")}${button("Recent calls", "recents")}${button("Settings · Ringtone", "settings")}`;
      case "dialer": return renderDialer();
      case "contacts": return renderContacts();
      case "recents": return `<p class="screen-label">Calls</p><h2>Recent calls</h2><p>${state.ending ? `Last outgoing call: ${escape(DATA.contacts[state.ending].name)}.` : "No outgoing calls recorded on this SIM."}</p>`;
      case "settings": return renderSettings();
      case "voicemails": return renderList("Voicemail", DATA.voicemails, "voicemail");
      case "voicemail": return renderVoicemail(ui.payload);
      case "memos": return renderList("Memos", DATA.memos, "memo");
      case "memo": return renderMemo(ui.payload);
      case "photos": return renderPhotos(ui.payload);
      case "photo": return renderPhoto(ui.payload);
      case "games": return renderGames();
      case "game": return renderGame();
      case "ending": return renderEnding();
      case "evidence": return renderEvidenceScreen();
      default: return `<h2>Phone</h2>${button("Home", "home")}`;
    }
  }
  function conversationEntries(folder, id) {
    const list = folder === "archive" ? DATA.archive : DATA.inbox;
    const contact = list.find(item => item.id === id)?.contact || id;
    return list.filter(item => item.contact === contact).sort((a, b) => a.sort.localeCompare(b.sort));
  }
  function conversationGroups(folder) {
    const list = folder === "archive" ? DATA.archive : DATA.inbox;
    return [...new Set(list.map(item => item.contact))].map(contact => ({ contact, entries: conversationEntries(folder, contact) })).sort((a, b) => b.entries.at(-1).sort.localeCompare(a.entries.at(-1).sort));
  }
  function conversationName(contact) {
    return { anonymous: "Anonymous", lauren: "Lauren", rina: "Rina", collins: "Ms. Collins", unknown: "Unknown" }[contact] || contact;
  }
  function renderThreads(folder) {
    return `<p class="screen-label">${folder === "archive" ? "Echo archive" : "Inbox"}</p><h2>Conversations</h2>${conversationGroups(folder).map(group => `<button type="button" class="thread-row" data-action="open-thread" data-folder="${folder}" data-id="${group.contact}"><strong>${escape(conversationName(group.contact))}</strong><span>${escape(group.entries.at(-1).date)}</span></button>`).join("")}`;
  }
  function renderThread(payload) {
    const entries = conversationEntries(payload.folder, payload.id);
    if (!entries.length) return `<p>Conversation unavailable.</p>`;
    const contact = entries[0].contact;
    const name = conversationName(contact);
    return `<p class="screen-label">${payload.folder === "archive" ? "Echo archive" : "Inbox"}</p><h2>${name}</h2>${entries.map(item => `<p class="screen-subtitle">${escape(item.date)}</p>${item.bubbles.map(([sender, message, time]) => `<div class="message-bubble ${sender === "Perla" ? "out" : ""}"><small>${escape(sender === "Perla" ? "Me" : sender)}${time ? ` · ${escape(time)}` : ""}</small><p>${escape(message)}</p></div>`).join("")}`).join("")}`;
  }
  function renderGate(type) {
    const config = {
      voicemail: ["Voicemail", "My favorite music", 4],
      memos: ["Memos", `Four digits. ${3 - state.memoWrong} ${3 - state.memoWrong === 1 ? "try" : "tries"} remain.`, 4],
      album: ["Locked album", "I’ll take extra Cane’s sauce", 5],
      archive: ["Echo archive", "The day Echo was first taken away. Eight digits.", 8],
      deleted: ["Deleted", "Every time I start to write your name… One attempt only.", 5]
    }[type];
    if (!config) return "";
    const grid = type === "deleted" ? `<p class="screen-subtitle">Trace a letter on these keys:</p><div class="keypad-clue" aria-label="Three by three keypad">${[1,2,3,4,5,6,7,8,9].map(n => `<span>${n}</span>`).join("")}</div>` : "";
    return `<p class="screen-label">Password required</p><h2>${config[0]}</h2><p>${config[1]}</p>${grid}<form class="password-form" data-form="gate" data-kind="${type}"><label for="phone-input">Enter ${config[2]} digits</label><input id="phone-input" data-phone-input type="text" inputmode="numeric" pattern="[0-9]{${config[2]}}" maxlength="${config[2]}" autocomplete="off" required><div class="form-row"><button class="screen-button inline" type="submit">Submit</button></div></form>${gateError ? `<p class="feedback">${escape(gateError)}</p>` : ""}`;
  }
  function renderDeleted() {
    return `<p class="screen-label">Deleted · Late 2006</p><h2>Unsent message</h2><p class="screen-subtitle">To: Lauren</p><div class="artifact"><p>${escape(DATA.apology)}</p></div>${state.apologySent ? `<div class="message-bubble"><small>Lauren · Automatic reply</small><p>${escape(DATA.reply)}</p></div><p class="feedback success">Apology sent. Lauren's number is now in Contacts.</p>` : button("Send this message", "send-apology")}`;
  }
  function renderDialer() {
    return `<p class="screen-label">Calls · ${state.callCredit} credit</p><h2>Dial a number</h2><p class="screen-subtitle">${state.stage < 3 ? "Outgoing calls become available after the terminal questions." : "One confirmed outgoing call ends this investigation."}</p><form class="dial-form" data-form="dial"><label for="phone-input">Phone number</label><input id="phone-input" data-phone-input type="tel" inputmode="numeric" maxlength="11" autocomplete="off" placeholder="11 digits"><div class="form-row"><button class="screen-button inline" type="submit" ${state.stage < 3 || !state.callCredit ? "disabled" : ""}>Call</button></div></form>${dialError ? `<p class="feedback">${escape(dialError)}</p>` : ""}<h3>Discovered contacts</h3>${state.contacts.length ? state.contacts.map(id => `<button type="button" class="screen-card" data-action="fill-contact" data-id="${id}"><strong>${escape(contactName(id))}</strong><span>${escape(DATA.contacts[id].number)}</span></button>`).join("") : "<p>No contacts discovered yet.</p>"}`;
  }
  function renderContacts() {
    return `<p class="screen-label">Calls</p><h2>Discovered contacts</h2>${state.contacts.length ? state.contacts.map(id => `<div class="artifact"><strong>${escape(contactName(id))}</strong><p>${escape(DATA.contacts[id].number)}</p></div>`).join("") : "<p>No contacts discovered yet.</p>"}${button("Open dialer", "dialer")}`;
  }
  function renderSettings() {
    return `<p class="screen-label">Calls &gt; Settings</p><h2>Ringtone</h2><div class="artifact"><strong>Ringtone 01 · Selected</strong><p>A quiet, old-fashioned tune.</p></div>${button("Play ringtone", "play-ringtone")}${button("Lyrics / description", "reveal-ringtone")}${ringtoneRevealed ? `<p class="feedback success">The description in the old music library reads: “the sound of silence.”</p><p class="screen-subtitle">Phone letter groups: 2 ABC · 3 DEF · 4 GHI · 5 JKL · 6 MNO · 7 PQRS · 8 TUV · 9 WXYZ.</p>` : ""}`;
  }
  function renderList(title, list, kind) {
    return `<p class="screen-label">${title}</p><h2>${title === "Memos" ? "Diary entries" : "Saved recordings"}</h2>${list.map(item => `<button type="button" class="thread-row" data-action="open-item" data-kind="${kind}" data-id="${item.id}"><strong>${escape(item.title)}</strong>${kind === "memo" ? "" : `<span>${escape(item.date)}</span>`}</button>`).join("")}`;
  }
  function renderVoicemail(id) {
    const item = DATA.voicemails.find(x => x.id === id);
    if (!item) return "";
    return `<p class="screen-label">Voicemail · ${escape(item.date)}</p><h2>${escape(item.title)}</h2>${button("Play / Replay", "play-voicemail")}${button("Pause audio", "pause-audio")}<div class="transcript"><strong>Transcript</strong><p>${escape(item.text)}</p></div>`;
  }
  function renderMemo(id) {
    const item = DATA.memos.find(x => x.id === id);
    if (!item) return "";
    return `<p class="screen-label">Memo</p><h2>${escape(item.title)}</h2><div class="artifact"><p>${escape(item.text)}</p></div>`;
  }
  function renderPhotos(album) {
    const list = album === "album" ? DATA.album : DATA.photos;
    return `<p class="screen-label">Photos · ${album === "album" ? "Locked album" : "Main gallery"}</p><h2>${album === "album" ? "Private album" : "Gallery"}</h2>${album === "main" ? button(`Locked album ${state.unlocked.album ? "· Open" : "· Password"}`, "open-app", 'data-id="album"') : ""}${list.map(item => `<button type="button" class="thread-row photo-row" data-action="open-photo" data-album="${album}" data-id="${item.id}"><img class="gallery-thumb" src="${escape(item.image)}" alt="${escape(item.title)}" loading="lazy"><span class="photo-row-copy"><strong>${escape(item.date)}</strong></span></button>`).join("")}`;
  }
  function renderPhoto(payload) {
    const item = [...DATA.photos, ...DATA.album].find(x => x.id === payload.id);
    if (!item) return "";
    return `<p class="screen-label">Photos</p><h2>${escape(item.date)}</h2><div class="artifact"><img class="album-photo" src="${escape(item.image)}" alt="${escape(item.title)}" loading="lazy">${button("View larger", "view-photo", `data-id="${escape(item.id)}"`, "screen-button inline")}</div>`;
  }
  function renderGames() {
    return `<p class="screen-label">Games</p><h2>Choose a game</h2>${[
      ["maze", "Maze Muncher", "Collect dots for up to 60 seconds."],
      ["mines", "Minesweeper", "A 5×5 field with five mines."],
      ["runner", "Obstacle Run", "Dodge obstacles for up to 60 seconds."]
    ].map(([id, name, subtitle]) => `<button type="button" class="screen-card" data-action="open-game" data-id="${id}"><strong>${name}</strong><span>${subtitle}${state.completedGames.includes(id) ? " · Result saved" : ""}</span></button>`).join("")}`;
  }
  function renderGame() {
    if (!game) return `<p>Game unavailable.</p>`;
    const names = { maze: "Maze Muncher", mines: "Minesweeper", runner: "Obstacle Run" };
    let board = "";
    if (game.kind === "maze") board = renderMaze();
    if (game.kind === "mines") board = renderMines();
    if (game.kind === "runner") board = renderRunner();
    const record = game.status === "done" ? `<div class="artifact"><strong>Result: ${escape(game.result || "Complete")}</strong><p>Your score: ${game.score}</p><p>${game.kind === "runner" ? "Best score: 39870" : `Current phone high score: ${state.bestScores[game.kind]}`}</p></div>` : "";
    return `<p class="screen-label">Games · ${names[game.kind]}</p><h2>${names[game.kind]}</h2><p class="screen-subtitle">${game.kind === "mines" ? "Reveal safe squares. Flag suspected mines." : `Time: ${game.time}s · Score: ${game.score}`}</p>${board}${record}<div class="mini-controls">${game.status === "ready" ? button("Start", "game-start", "", "screen-button inline") : ""}${game.status === "running" || game.status === "paused" ? button(game.status === "paused" ? "Resume" : "Pause", "game-pause", "", "screen-button inline") : ""}${button("Restart", "game-restart", "", "screen-button inline")}${button("Exit", "game-exit", "", "screen-button inline")}</div>${game.status !== "done" ? button("Complete accessible attempt", "game-accessible") : ""}${game.kind === "maze" || game.kind === "runner" ? `<div class="mini-controls">${button("◀", "game-left", "", "screen-button inline")}${button("▲", "game-up", "", "screen-button inline")}${button("▼", "game-down", "", "screen-button inline")}${button("▶", "game-right", "", "screen-button inline")}</div>` : ""}`;
  }
  function renderMaze() {
    return `<p class="screen-subtitle">Arrow keys move. Collect dots; avoid the red hazard.</p><div class="mini-grid" role="grid" aria-label="Seven by seven maze">${game.map.flatMap((row, y) => [...row].map((cell, x) => {
      const player = game.player.x === x && game.player.y === y;
      const hazard = game.hazard.x === x && game.hazard.y === y;
      const dot = game.dots.has(`${x},${y}`);
      return `<span class="mini-cell ${cell === "#" ? "wall" : player ? "player" : hazard ? "hazard" : dot ? "dot" : ""}" role="gridcell" aria-label="${cell === "#" ? "Wall" : player ? "Player" : hazard ? "Hazard" : dot ? "Dot" : "Empty"}">${player ? "◆" : hazard ? "✕" : dot ? "·" : ""}</span>`;
    })).join("")}</div>`;
  }
  function renderMines() {
    return `<p class="screen-subtitle">First reveal is safe. Flag mode: ${game.flagMode ? "On" : "Off"}. Mines: 5.</p>${button(game.flagMode ? "Switch to Reveal" : "Switch to Flag", "mines-toggle") }<div class="mines-grid" role="grid" aria-label="Five by five minesweeper board">${Array.from({ length: 25 }, (_, i) => {
      const shown = game.revealed.has(i), flag = game.flags.has(i), mined = game.mines.has(i);
      const count = neighbors(i).filter(n => game.mines.has(n)).length;
      const label = shown ? mined ? "Mine" : `${count} neighboring mines` : flag ? "Flagged" : "Hidden square";
      return `<button type="button" role="gridcell" class="${shown ? "revealed" : ""}" data-action="mines-cell" data-index="${i}" aria-label="Row ${Math.floor(i / 5) + 1}, column ${i % 5 + 1}: ${label}" ${shown ? "disabled" : ""}>${shown ? mined ? "✹" : count || "" : flag ? "⚑" : ""}</button>`;
    }).join("")}</div>`;
  }
  function renderRunner() {
    return `<p class="screen-subtitle">Left and right dodge obstacles. Survive up to 60 seconds.</p><div class="runner-grid" role="grid" aria-label="Three-lane obstacle run">${Array.from({ length: 15 }, (_, i) => {
      const row = Math.floor(i / 3), lane = i % 3;
      const player = row === 4 && lane === game.lane;
      const obstacle = game.obstacles.some(o => o.row === row && o.lane === lane);
      return `<span role="gridcell" aria-label="${player ? "Player" : obstacle ? "Obstacle" : "Open lane"}">${player ? "◆" : obstacle ? "✕" : ""}</span>`;
    }).join("")}</div>`;
  }
  function renderEnding() {
    const endingNumbers = { lauren: 1, rina: 2, emma: 3, collins: 4 };
    const item = DATA.endings[state.ending];
    if (!item) return "";
    return `<p class="screen-label">Ending ${endingNumbers[state.ending]}/4</p><p class="screen-subtitle">Call completed · ${escape(DATA.contacts[state.ending].name)}</p><h2>${escape(item.title)}</h2>${item.lines.map(([speaker, line]) => `<div class="message-bubble ${speaker === "Player" ? "out" : ""}"><small>${escape(speaker)}</small><p>${escape(line)}</p></div>`).join("")}<div class="end-card">${escape(item.card)}</div><p class="screen-subtitle">Replay to explore another ending.</p>${button("Review discovered evidence", "review-evidence")}${button("Replay investigation", "restart-request")}`;
  }
  function renderEvidenceScreen() {
    return `<p class="screen-label">Case file</p><h2>Discovered evidence</h2>${state.viewed.filter(id => DATA.evidence[id]).map(id => `<div class="artifact"><strong>${escape(DATA.evidence[id][0])}</strong><p>${escape(DATA.evidence[id][1])}</p></div>`).join("") || "<p>No evidence recorded yet.</p>"}${button("Back to ending", "ending")}`;
  }
  function renderCase() {
    const loginTime = new Date(state.sshLoginAt || Date.now()).toLocaleString(language === "zh" ? "zh-CN" : "en-US", { timeZone: "Asia/Shanghai", weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    const star = "(base) StarryDreamer@Macbook-Pro ~ %";
    const perla = "(base) Perla@Macbook-Pro ~ %";
    const remote = "(venv) RemoteUser@ssh~connect ~ %";
    const ownerSuccess = "That's me! You may have found a few clues about Echo already. Can you find out more?";
    const echoSuccess = "That's right. Echo was an old project of mine, but there's more to the story. This phone has enough credit for ONLY ONE last call. You can call only one person, so choose someone you think can help you uncover the truth.";
    const line = (speaker, message) => `<p class="terminal-dialogue"><span class="terminal-prompt">${escape(speaker)}</span> <span>${escape(message)}</span></p>`;
    const answerForm = (kind, id, label) => `<form class="terminal-answer" data-form="${kind}"><label for="${id}">${remote}</label><input id="${id}" name="answer" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send" aria-label="${escape(label)}" required></form>`;
    const replies = {
      "owner-wrong-2": "Not that either. Final chance: get it or get out.",
      "owner-wrong-3": "It seems you are not the person who can help me. Try harder next time!",
      "echo-wrong-1": "I don't think that's quite it... Want to try again?",
      "echo-wrong-2": "Well… I will give you another chance. LAST CHANCE!",
      "echo-wrong-3": "It seems you are not the person who can help me. Try harder next time!"
    };
    const events = state.terminalLog || [];
    const eventHtml = entry => {
      const reply = entry.result === "owner-wrong-1" ? `Hmm, ${entry.answer}? Nope. Try again~` : entry.result === "owner-correct" ? ownerSuccess : entry.result === "echo-correct" ? echoSuccess : replies[entry.result];
      if (!reply) return "";
      const speaker = entry.result.startsWith("owner-wrong") ? star : perla;
      return `<p class="terminal-typed"><span class="terminal-prompt">${remote}</span> <span class="terminal-typed-value">${escape(entry.answer)}</span></p>${line(speaker, reply)}`;
    };
    let html = `<p class="terminal-login">Last login: ${escape(loginTime)} (Beijing time) on remote desktop</p>`;
    html += line(star, "Hey, you found your way in! Feel free to look around and gather clues. Wondering who I am? I think this phone can help you figure out my name.");
    const ownerEvents = events.filter(entry => entry.result.startsWith("owner-"));
    const echoEvents = events.filter(entry => entry.result.startsWith("echo-"));
    html += ownerEvents.map(eventHtml).join("");
    if (state.stage > 1 && !ownerEvents.some(entry => entry.result === "owner-correct")) html += line(perla, ownerSuccess);
    html += echoEvents.map(eventHtml).join("");
    if (state.stage > 2 && !echoEvents.some(entry => entry.result === "echo-correct")) html += line(perla, echoSuccess);
    if (state.gameOver) {
      html += `<div class="terminal-ended">${button("Start over", "restart-request")}</div>`;
    } else if (state.stage === 1) {
      html += answerForm("owner", "owner-answer", "Enter the owner's first name");
    } else if (state.stage === 2) {
      html += answerForm("echo", "echo-answer", "Describe Echo");
    } else if (state.ending) {
      html += line(perla, "The outgoing call used the phone's last credit.");
    } else if (state.forced) {
      html += line(perla, "The phone is about to die. Dial a number now.");
      html += `<div class="terminal-ended">${button("Open dialer", "dialer")}</div>`;
    } else {
      html += `<div class="terminal-ended">${button("Open dialer", "dialer")}</div>`;
    }
    caseEl.innerHTML = html;
    localize(caseEl);
  }
  function renderModal() {
    if (!modal) { modalEl.innerHTML = ""; return; }
    if (modal.type === "photo") {
      const item = [...DATA.photos, ...DATA.album].find(photo => photo.id === modal.id);
      if (!item) { modal = null; modalEl.innerHTML = ""; return; }
      modalEl.innerHTML = `<div class="modal-backdrop"><div class="photo-modal" role="dialog" aria-modal="true" aria-labelledby="photo-modal-title"><div class="photo-modal-top"><h2 id="photo-modal-title">${escape(item.date)}</h2><button type="button" data-action="modal-cancel">Close image</button></div><img src="${escape(item.image)}" alt="${escape(item.title)}">${item.largeCaption ? `<p>${escape(item.largeCaption)}</p>` : ""}</div></div>`;
      localize(modalEl);
      modalEl.querySelector('[data-action="modal-cancel"]')?.focus();
      return;
    }
    let title = "", message = "", confirm = "Continue", cancel = "Cancel";
    switch (modal.type) {
      case "battery": title = "Battery almost empty"; message = "The phone is about to die. Dial a number now."; confirm = "Open dialer"; cancel = "Restart investigation"; break;
      case "deleted-attempt": title = "One attempt only"; message = "Submitting this password will use the only chance to open Deleted. Continue?"; confirm = "Submit password"; break;
      case "memo-last": title = "Last Memos attempt"; message = "One more incorrect PIN will erase the memos for this run. Continue?"; confirm = "Submit PIN"; break;
      case "send": title = "Send Perla's old draft?"; message = "This will send the message to Lauren from the phone. You cannot take it back in this run."; confirm = "Send message"; break;
      case "call": title = `Call ${DATA.contacts[modal.contact].name}?`; message = "This will use the phone's only remaining credit and end this investigation."; confirm = "Place call"; break;
      case "restart": title = "Restart investigation?"; message = "This clears the current run, including clues, unlocked folders, and the ending."; confirm = "Restart"; break;
    }
    modalEl.innerHTML = `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">${escape(title)}</h2><p>${escape(message)}</p><div class="modal-actions"><button type="button" data-action="modal-cancel">${cancel}</button><button type="button" class="confirm" data-action="modal-confirm">${confirm}</button></div></div></div>`;
    localize(modalEl);
    const first = modalEl.querySelector(".modal-actions button");
    first?.focus();
  }

  function submitGate(type, value) {
    const codes = { voicemail: "8767", memos: "1231", album: "39870", archive: "20061113", deleted: "14789" };
    if (!(type in codes)) return;
    if (type === "deleted" && state.deletedAttempt) return;
    if (type === "memos" && state.memoWrong >= 3) return;
    if (value === codes[type]) {
      state.unlocked[type] = true;
      if (type === "deleted") state.deletedAttempt = true;
      save();
      if (type === "deleted") discover("deleted");
      toast(`${type === "album" ? "Album" : type === "archive" ? "Archive" : type} unlocked.`);
      openApp(type, true);
    } else if (type === "memos") {
      state.memoWrong++;
      save();
      if (state.memoWrong >= 3) go("locked-out", "memos", true);
      else { gateError = `Incorrect PIN. ${3 - state.memoWrong} ${3 - state.memoWrong === 1 ? "try" : "tries"} remain.`; render(); }
    } else if (type === "deleted") {
      state.deletedAttempt = true;
      save();
      go("locked-out", "deleted", true);
    } else { gateError = "Incorrect code. You may try again."; render(); }
  }
  function submitDial(value) {
    if (state.stage < 3 || !state.callCredit) { dialError = "Answer the Echo question before calling."; render(); return; }
    if (value.length !== 11) { dialError = "Enter an 11-digit phone number."; render(); return; }
    const id = Object.keys(DATA.contacts).find(key => DATA.contacts[key].number === value);
    if (!id || !state.contacts.includes(id)) { dialError = "No connection. This number is not among the contacts you have found."; render(); return; }
    if (id === "lauren" && !state.apologySent) { dialError = "This number has not been revealed yet."; render(); return; }
    dialError = "";
    modal = { type: "call", contact: id };
    renderModal();
  }
  function recordTerminalAnswer(kind, answer, result) {
    state.terminalLog.push({ kind, answer, result });
    if (state.terminalLog.length > 40) state.terminalLog = state.terminalLog.slice(-40);
  }
  function focusTerminalAnswer() {
    caseEl.querySelector(".terminal-answer input")?.focus({ preventScroll: true });
  }
  function wrongAnswer(kind, submitted) {
    const key = kind === "owner" ? "ownerWrong" : "echoWrong";
    state[key]++;
    recordTerminalAnswer(kind, submitted, `${kind}-wrong-${state[key]}`);
    if (state[key] >= 3) {
      state.gameOver = kind;
      stopGame();
      history = [];
      ui = { screen: "game-over", payload: null };
      save();
      render();
      return;
    }
    save();
    render();
    focusTerminalAnswer();
  }
  function handleSubmit(event) {
    const form = event.target.closest("form[data-form]");
    if (!form) return;
    event.preventDefault();
    const kind = form.dataset.form;
    if (kind === "ssh") {
      const command = form.elements.command.value.trim().replace(/\s+/g, " ").toLowerCase();
      if (command === "ssh tracing") { state.sshConnected = true; state.sshLoginAt = Date.now(); save(); render(); focusTerminalAnswer(); }
      else { document.getElementById("ssh-error").textContent = "Wrong command, please read the connection notes carefully. Typical command format: ssh xxxxx"; localize(document.getElementById("ssh-error")); }
      return;
    }
    if (!state.sshConnected || state.gameOver) return;
    if (kind === "gate") {
      const value = form.querySelector("input").value.trim();
      if (form.dataset.kind === "deleted" || (form.dataset.kind === "memos" && state.memoWrong === 2 && value !== "1231")) {
        modal = { type: form.dataset.kind === "deleted" ? "deleted-attempt" : "memo-last", value, kind: form.dataset.kind };
        renderModal();
      } else submitGate(form.dataset.kind, value);
    } else if (kind === "dial") submitDial(form.querySelector("input").value.replace(/\D/g, ""));
    else if (kind === "owner") {
      const submitted = form.elements.answer.value.trim();
      if (!submitted) return;
      if (!state.started) { state.started = true; discover("thread:new"); ui = { screen: "home", payload: null }; }
      if (["perla", "佩拉"].includes(submitted.toLowerCase())) { state.stage = 2; recordTerminalAnswer("owner", submitted, "owner-correct"); save(); tone([523, 659]); render(); focusTerminalAnswer(); }
      else wrongAnswer("owner", submitted);
    } else if (kind === "echo") {
      const submitted = form.elements.answer.value.trim();
      if (!submitted) return;
      const value = submitted.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
      const accepted = /\b(boards?|discussions?|forums?|wall)\b/.test(value) || /留言板|匿名留言|讨论|论坛|交流板|公告板|回声墙/.test(form.elements.answer.value);
      if (accepted) {
        state.stage = 3;
        state.deadline ||= Date.now() + 15 * 60 * 1000;
        recordTerminalAnswer("echo", submitted, "echo-correct");
        save();
        tone([523, 659, 784]);
        render();
        focusTerminalAnswer();
      } else wrongAnswer("echo", submitted);
    }
  }

  function handleClick(event) {
    const languageButton = event.target.closest("[data-lang]");
    if (languageButton) { setLanguage(languageButton.dataset.lang); return; }
    if (!state.sshConnected) return;
    const keyButton = event.target.closest("[data-key]");
    if (keyButton) {
      const key = keyButton.dataset.key;
      const phoneInput = screenEl.querySelector("[data-phone-input]");
      if (/^[0-9*#]$/.test(key) && phoneInput) {
        if (phoneInput.value.length < phoneInput.maxLength) phoneInput.value += key;
        phoneInput.focus();
      } else handleKey(key);
      return;
    }
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (modal && !action.startsWith("modal-")) return;
    if (state.gameOver && !["restart-request", "modal-cancel", "modal-confirm"].includes(action)) return;
    switch (action) {
      case "begin": state.started = true; save(); tone([660, 880]); discover("thread:new"); go("thread", { folder: "inbox", id: "new" }, true); break;
      case "home": home(); break;
      case "back": back(); break;
      case "open-app": openApp(target.dataset.id); break;
      case "open-folder": go("threads", target.dataset.id); break;
      case "open-thread": {
        const entries = conversationEntries(target.dataset.folder, target.dataset.id);
        entries.forEach(item => discover(`thread:${item.id}`));
        if (entries.some(item => item.id === "collins-pause")) discoverContact("collins");
        go("thread", { folder: target.dataset.folder, id: target.dataset.id });
        break;
      }
      case "open-item": discover(`${target.dataset.kind}:${target.dataset.id}`); go(target.dataset.kind, target.dataset.id); break;
      case "open-photo": {
        const item = [...DATA.photos, ...DATA.album].find(photo => photo.id === target.dataset.id);
        if (item && !item.largeCaption) discover(`photo:${item.id}`);
        go("photo", { album: target.dataset.album, id: target.dataset.id });
        break;
      }
      case "view-photo": {
        const item = [...DATA.photos, ...DATA.album].find(photo => photo.id === target.dataset.id);
        if (item && (DATA.photos.includes(item) || state.unlocked.album)) {
          discover(`photo:${item.id}`);
          if (item.id === "contact-page") { discover("photo:contact-page-large"); discoverContact("rina"); discoverContact("emma"); }
          modal = { type: "photo", id: item.id };
          renderModal();
        }
        break;
      }
      case "send-apology": if (!state.apologySent && !state.forced && !state.ending) { modal = { type: "send" }; renderModal(); } break;
      case "dialer": go("dialer"); break;
      case "contacts": go("contacts"); break;
      case "recents": go("recents"); break;
      case "settings": go("settings"); break;
      case "fill-contact": {
        if (ui.screen !== "dialer") go("dialer");
        const input = screenEl.querySelector("[data-phone-input]");
        if (input) { input.value = DATA.contacts[target.dataset.id].number; input.focus(); }
        break;
      }
      case "play-ringtone": tone([392, 440, 349, 392]); ringtoneRevealed = true; discover("ringtone"); render(); break;
      case "reveal-ringtone": ringtoneRevealed = true; discover("ringtone"); render(); break;
      case "play-voicemail": tone([440, 392]); toast("Voicemail playing. The full transcript is shown below."); break;
      case "pause-audio": if (audioContext?.state === "running") audioContext.suspend(); toast("Audio paused. Transcript remains available."); break;
      case "open-game": startGameView(target.dataset.id); break;
      case "game-start": startGame(); break;
      case "game-pause": toggleGamePause(); break;
      case "game-restart": startGameView(game.kind); break;
      case "game-exit": stopGame(); back(); break;
      case "game-accessible": completeGame("Accessible attempt completed"); break;
      case "game-left": moveGame("ArrowLeft"); break;
      case "game-right": moveGame("ArrowRight"); break;
      case "game-up": moveGame("ArrowUp"); break;
      case "game-down": moveGame("ArrowDown"); break;
      case "mines-toggle": if (game?.kind === "mines" && game.status !== "done") { game.flagMode = !game.flagMode; render(); } break;
      case "mines-cell": revealMine(Number(target.dataset.index)); break;
      case "review-evidence": go("evidence"); break;
      case "ending": go("ending"); break;
      case "show-hint": {
        const hint = !state.started ? "Begin the investigation on the phone." : state.stage === 1 ? "Look for the owner's name in voicemails and photos." : state.stage === 2 ? "Look for physical evidence of Echo in photos and records." : "Find the number in a contact you have discovered.";
        document.getElementById("hint-output").textContent = hint;
        localize(document.getElementById("hint-output"));
        break;
      }
      case "restart-request": modal = { type: "restart" }; renderModal(); break;
      case "toggle-mute": state.muted = !state.muted; save(); render(); break;
      case "modal-cancel": cancelModal(); break;
      case "modal-confirm": confirmModal(); break;
    }
  }
  function cancelModal() {
    if (!modal) return;
    if (modal.type === "battery") { modal = null; restart(); return; }
    modal = null;
    renderModal();
  }
  function confirmModal() {
    if (!modal) return;
    const current = modal;
    modal = null;
    if (current.type === "battery") { ui = { screen: "dialer", payload: null }; render(); return; }
    if (current.type === "deleted-attempt" || current.type === "memo-last") submitGate(current.kind, current.value);
    else if (current.type === "send") {
      if (!state.apologySent && !state.forced && !state.ending) {
        state.apologySent = true;
        discoverContact("lauren");
        discover("reply");
        save();
        tone([784, 659, 880]);
        toast("Lauren replied. Her new number is in Contacts.");
      }
      render();
    } else if (current.type === "call") {
      if (state.callCredit && state.stage === 3 && state.contacts.includes(current.contact)) {
        state.batteryAtEnd = batteryPercent();
        state.callCredit = 0;
        state.ending = current.contact;
        save();
        stopGame();
        history = [];
        ui = { screen: "ending", payload: null };
        tone([392, 330, 262]);
      }
      render();
    } else if (current.type === "restart") restart();
  }
  function restart() {
    stopGame();
    state = defaultState();
    ui = { screen: "opening", payload: null };
    history = [];
    modal = null;
    ringtoneRevealed = false;
    gateError = dialError = "";
    save();
    render();
    toast("Fresh investigation started.");
  }
  function handleKey(key) {
    if (!state.sshConnected) return;
    if (state.gameOver && !modal) { if (key === "Enter") screenEl.querySelector('[data-action="restart-request"]')?.click(); return; }
    if (modal) {
      if (key === "Escape" && modal.type !== "battery") cancelModal();
      return;
    }
    const input = document.activeElement;
    if (input && ["INPUT", "SELECT", "TEXTAREA"].includes(input.tagName)) return;
    if (ui.screen === "game" && game) {
      if (key.startsWith("Arrow")) { moveGame(key); return; }
      if (key === " ") { toggleGamePause(); return; }
    }
    if (/^[0-9*#]$/.test(key)) {
      const phoneInput = screenEl.querySelector("[data-phone-input]");
      if (phoneInput && phoneInput.value.length < phoneInput.maxLength) { phoneInput.value += key; phoneInput.focus(); }
      else if (ui.screen === "home" && key >= "1" && key <= "7") {
        openApp(["messages", "calls", "voicemail", "settings", "memos", "photos", "games"][Number(key) - 1]);
      }
      return;
    }
    if (key === "Escape") { back(); return; }
    if (key === "Backspace") {
      const phoneInput = screenEl.querySelector("[data-phone-input]");
      if (phoneInput?.value) { phoneInput.value = phoneInput.value.slice(0, -1); phoneInput.focus(); }
      else back();
      return;
    }
    const items = [...screenEl.querySelectorAll("button:not(:disabled)")];
    if (key === "ArrowDown" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowLeft") {
      if (!items.length) return;
      const current = items.indexOf(document.activeElement);
      const delta = key === "ArrowDown" || key === "ArrowRight" ? 1 : -1;
      items[(current + delta + items.length) % items.length].focus();
    } else if (key === "Enter") {
      if (document.activeElement?.tagName === "BUTTON") document.activeElement.click();
      else items[0]?.click();
    }
  }
  document.addEventListener("keydown", event => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key) && !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) event.preventDefault();
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
      if (event.key === "Escape") { document.activeElement.blur(); back(); }
      return;
    }
    handleKey(event.key);
  });
  document.addEventListener("click", handleClick);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("contextmenu", event => {
    const cell = event.target.closest('[data-action="mines-cell"]');
    if (cell) { event.preventDefault(); if (game?.kind === "mines" && game.status !== "done") { game.flags.has(Number(cell.dataset.index)) ? game.flags.delete(Number(cell.dataset.index)) : game.flags.add(Number(cell.dataset.index)); render(); } }
  });

  const mazeMap = ["#######", "#.....#", "#.###.#", "#...#.#", "###.#.#", "#.....#", "#######"];
  function makeGame(kind) {
    const common = { kind, status: "ready", result: "", score: 0, time: 60, ticks: 0 };
    if (kind === "maze") {
      const dots = new Set();
      mazeMap.forEach((row, y) => [...row].forEach((cell, x) => { if (cell === "." && !(x === 1 && y === 1)) dots.add(`${x},${y}`); }));
      return { ...common, map: mazeMap, player: { x: 1, y: 1 }, hazard: { x: 5, y: 5 }, dots };
    }
    if (kind === "mines") return { ...common, mines: new Set([3, 7, 12, 18, 21]), revealed: new Set(), flags: new Set(), flagMode: false, firstClick: true };
    return { ...common, lane: 1, obstacles: [] };
  }
  function startGameView(kind) {
    if (!["maze", "mines", "runner"].includes(kind)) return;
    stopGame();
    game = makeGame(kind);
    if (ui.screen === "game") { ui.payload = kind; render(); }
    else go("game", kind);
  }
  function startGame() {
    if (!game || game.status !== "ready") return;
    game.status = "running";
    gameInterval = setInterval(tickGame, 1000);
    render();
  }
  function toggleGamePause() {
    if (!game || !["running", "paused"].includes(game.status)) return;
    if (game.status === "running") { game.status = "paused"; clearInterval(gameInterval); gameInterval = null; }
    else { game.status = "running"; gameInterval = setInterval(tickGame, 1000); }
    render();
  }
  function tickGame() {
    if (!game || game.status !== "running") return;
    if (game.kind !== "mines") game.time--;
    game.ticks++;
    if (game.kind === "maze") {
      const path = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }];
      game.hazard = path[game.ticks % path.length];
      if (game.player.x === game.hazard.x && game.player.y === game.hazard.y) { completeGame("Caught by the hazard"); return; }
    }
    if (game.kind === "runner") {
      game.score += 100;
      game.obstacles.forEach(o => o.row++);
      if (game.obstacles.some(o => o.row === 4 && o.lane === game.lane)) { completeGame("Hit an obstacle"); return; }
      game.obstacles = game.obstacles.filter(o => o.row < 5);
      if (game.ticks % 2 === 0) game.obstacles.push({ row: 0, lane: [0, 2, 1, 0, 1, 2][Math.floor(game.ticks / 2) % 6] });
    }
    if (game.time <= 0) { completeGame("Time complete"); return; }
    render();
  }
  function completeGame(result) {
    if (!game || game.status === "done") return;
    clearInterval(gameInterval);
    gameInterval = null;
    game.status = "done";
    game.result = result;
    if (!state.completedGames.includes(game.kind)) state.completedGames.push(game.kind);
    if (game.kind !== "runner") state.bestScores[game.kind] = Math.max(state.bestScores[game.kind] ?? 0, game.score);
    if (game.kind === "runner") discover("game:runner");
    save();
    render();
  }
  function moveGame(key) {
    if (!game || game.status !== "running") return;
    if (game.kind === "maze") {
      const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key];
      if (!delta) return;
      const x = game.player.x + delta[0], y = game.player.y + delta[1];
      if (game.map[y]?.[x] !== ".") return;
      game.player = { x, y };
      if (game.dots.delete(`${x},${y}`)) game.score += 100;
      if (x === game.hazard.x && y === game.hazard.y) completeGame("Caught by the hazard");
      else if (!game.dots.size) completeGame("All dots collected");
      else render();
    } else if (game.kind === "runner") {
      if (key === "ArrowLeft") game.lane = Math.max(0, game.lane - 1);
      if (key === "ArrowRight") game.lane = Math.min(2, game.lane + 1);
      render();
    }
  }
  function neighbors(index) {
    const row = Math.floor(index / 5), col = index % 5, result = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr, c = col + dc;
      if ((dr || dc) && r >= 0 && r < 5 && c >= 0 && c < 5) result.push(r * 5 + c);
    }
    return result;
  }
  function revealMine(index) {
    if (!game || game.kind !== "mines" || game.status === "done") return;
    if (game.status === "ready") startGame();
    if (game.status !== "running") return;
    if (game.flagMode) {
      game.flags.has(index) ? game.flags.delete(index) : game.flags.add(index);
      render(); return;
    }
    if (game.flags.has(index)) return;
    if (game.firstClick && game.mines.has(index)) {
      game.mines.delete(index);
      const replacement = Array.from({ length: 25 }, (_, i) => i).find(i => i !== index && !game.mines.has(i));
      game.mines.add(replacement);
    }
    game.firstClick = false;
    game.revealed.add(index);
    if (game.mines.has(index)) { completeGame("A mine was revealed"); return; }
    game.score = game.revealed.size;
    if (game.revealed.size === 20) completeGame("Field cleared");
    else render();
  }

  checkDeadline();
  render();
  setInterval(checkDeadline, 1000);
})();
