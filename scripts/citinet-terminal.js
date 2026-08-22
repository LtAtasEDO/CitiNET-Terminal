const CT_ID = "citinet-terminal";
const CT_VERSION = "0.7.5-beta.1";
const CT_DB_KEY = "db";
const CT_DB_VERSION = 5;
const CT_SOCKET = `module.${CT_ID}`;
const CT_BINDING_FLAG = "binding";
const CT_UNLOCK_FLAG = "unlocks";
const CT_READ_FLAG = "readContent";
const CT_TRACE_FLAG = "traceStates";
const CT_HBL_ID = "hexcode-breach-lite";
const CT_SC_ID = "foundryvtt-simple-calendar";

let ctCalendarHookBound = false;

const ctEsc = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const ctClone = value => foundry.utils.deepClone(value);
const ctId = () => foundry.utils.randomID(12);
const ctScene = () => canvas?.scene ?? game.scenes?.active ?? game.scenes?.current ?? null;
const ctNum = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const ctClamp = (value, min, max) => Math.min(max, Math.max(min, ctNum(value, min)));
const ctSlug = value => String(value || "terminal").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "terminal";
const ctLines = value => String(value || "").split(/\r?\n/g).map(line => line.trim()).filter(Boolean);

function ctSimpleCalendar() {
  const module = game.modules?.get(CT_SC_ID);
  if (module && !module.active) return null;
  return globalThis.SimpleCalendar?.api ? globalThis.SimpleCalendar : null;
}

function ctCalendarDateTime() {
  const calendar = ctSimpleCalendar();
  if (!calendar) return null;
  try { return calendar.api.currentDateTime?.() ?? calendar.api.getCurrentDate?.() ?? null; }
  catch (error) {
    console.warn(`${CT_ID} | Simple Calendar date/time lookup failed.`, error);
    return null;
  }
}

function ctNow() {
  const calendar = ctSimpleCalendar();
  if (!calendar) return 0;
  try {
    const direct = Number(calendar.api.timestamp?.());
    if (Number.isFinite(direct)) return direct;
    const current = ctCalendarDateTime();
    const converted = Number(current ? calendar.api.dateToTimestamp?.(current) : NaN);
    return Number.isFinite(converted) ? converted : 0;
  } catch (error) {
    console.warn(`${CT_ID} | Simple Calendar timestamp lookup failed.`, error);
    return 0;
  }
}

function ctCalendarDisplay() {
  const calendar = ctSimpleCalendar();
  if (!calendar) return { ready: false, date: "CALENDAR OFFLINE", time: "--:--", display: "CALENDAR OFFLINE" };
  try {
    let formatted = calendar.api.currentDateTimeDisplay?.() ?? null;
    if (!formatted) {
      const current = ctCalendarDateTime();
      formatted = current ? calendar.api.formatDateTime?.(current) : null;
    }
    const date = String(formatted?.date || "").trim();
    const time = String(formatted?.time || "").trim();
    if (date || time) return { ready: true, date, time, display: [date, time].filter(Boolean).join(" // ") };
  } catch (error) {
    console.warn(`${CT_ID} | Simple Calendar display formatting failed.`, error);
  }
  return { ready: false, date: "CALENDAR OFFLINE", time: "--:--", display: "CALENDAR OFFLINE" };
}

function ctDefaultTrace() {
  return { enabled: false, max: 100, baseCost: 5, warnAt: 60, lockOnFull: true, revision: 1 };
}

function ctDefaultNetpage() {
  return {
    id: "welcome",
    title: "CitiNet Local Gateway",
    category: "LOCAL",
    excerpt: "Local gateway index and connection diagnostics.",
    body: "<p>This is a fictional CitiNet gateway. The Gamemaster can replace this page and add new netpages from CitiNet Terminal Manager.</p>",
    image: "",
    gallery: [],
    shardExport: ctDefaultShardExport(),
    traceCost: 0,
    published: true,
    createdAt: ctNow(),
    updatedAt: ctNow()
  };
}

function ctDefaultShardExport() {
  return { enabled: false, requireCheck: false, skill: "basic-tech", dv: 13 };
}

function ctEmptyRandomTable() {
  return { uuid: "", name: "", formula: "1d20", drawCount: 1, results: [] };
}

function ctNewTerminal(type = "computer", name = "New Terminal") {
  const vehicle = type === "autofixer";
  const scene = ctScene();
  return {
    id: ctId(),
    name: String(name || (vehicle ? "Autofixer Terminal" : "New Terminal")),
    subtitle: vehicle ? "AUTOFIXER // AUTHORIZED SALES NODE" : "SECURE LOCAL EXCHANGE",
    type: vehicle ? "autofixer" : "computer",
    startView: vehicle ? "autofixer" : "home",
    citinetMode: "cached",
    sceneOnly: true,
    sceneId: scene?.id || "",
    tileUuid: "",
    enabled: { inbox: !vehicle, files: !vehicle, citinet: !vehicle, autofixer: vehicle },
    trace: ctDefaultTrace(),
    emails: [],
    files: [],
    vehicles: [],
    createdAt: ctNow(),
    updatedAt: ctNow()
  };
}

function ctDefaultDB() {
  const welcome = ctDefaultNetpage();
  return { _ver: CT_DB_VERSION, terminals: {}, netpages: { [welcome.id]: welcome }, netpageOrder: [welcome.id] };
}

function ctNormalizeShardExport(value) {
  const raw = value && typeof value === "object" ? value : {};
  return {
    enabled: Boolean(raw.enabled),
    requireCheck: Boolean(raw.requireCheck),
    skill: raw.skill === "electronics-security-tech" ? "electronics-security-tech" : "basic-tech",
    dv: ctClamp(Math.trunc(ctNum(raw.dv, 13)), 6, 29)
  };
}

function ctNormalizeRandomTable(value) {
  const raw = value && typeof value === "object" ? value : {};
  return {
    uuid: String(raw.uuid || ""),
    name: String(raw.name || ""),
    formula: String(raw.formula || "1d20"),
    drawCount: ctClamp(Math.trunc(ctNum(raw.drawCount, 1)), 1, 20),
    results: Array.isArray(raw.results) ? raw.results.map(result => ({
      text: String(result?.text || ""),
      img: String(result?.img || result?.icon || ""),
      range: Array.isArray(result?.range) ? result.range.slice(0, 2).map(number => Math.trunc(ctNum(number, 0))) : [],
      weight: Math.max(1, Math.trunc(ctNum(result?.weight, 1)))
    })) : []
  };
}

function ctNormalizeContent(raw = {}, kind = "file") {
  const base = {
    id: String(raw.id || ctId()),
    image: String(raw.image || ""),
    gallery: Array.isArray(raw.gallery) ? raw.gallery.map(String).filter(Boolean) : ctLines(raw.gallery),
    shardExport: ctNormalizeShardExport(raw.shardExport),
    randomTable: ctNormalizeRandomTable(raw.randomTable),
    traceCost: Math.max(0, Math.trunc(ctNum(raw.traceCost, 0))),
    published: raw.published !== false,
    lockPuzzleId: String(raw.lockPuzzleId || ""),
    lockPuzzleName: String(raw.lockPuzzleName || ""),
    lockSceneId: String(raw.lockSceneId || ""),
    lockRevision: Math.max(1, Math.trunc(ctNum(raw.lockRevision, 1))),
    createdAt: ctNum(raw.createdAt, ctNow()),
    updatedAt: ctNum(raw.updatedAt, ctNow())
  };
  if (kind === "email") return {
    ...base,
    subject: String(raw.subject || "New Message"),
    from: String(raw.from || "Unknown Sender"),
    to: String(raw.to || "Local User"),
    date: String(raw.date || ""),
    body: String(raw.body || "")
  };
  if (kind === "netpage") return {
    ...base,
    title: String(raw.title || "New Netpage"),
    category: String(raw.category || "CITINET"),
    excerpt: String(raw.excerpt || ""),
    body: String(raw.body || ""),
    lockPuzzleId: "",
    lockPuzzleName: "",
    lockSceneId: ""
  };
  return {
    ...base,
    title: String(raw.title || "New File"),
    fileType: String(raw.fileType || "DATA"),
    date: String(raw.date || ""),
    body: String(raw.body || "")
  };
}

function ctNormalizeVehicle(raw = {}) {
  const fallbackPrice = ctReadPrice(raw.raw || raw);
  return {
    id: String(raw.id || ctId()),
    uuid: String(raw.uuid || ""),
    name: String(raw.name || raw.raw?.name || "Unknown Vehicle"),
    img: String(raw.img || raw.raw?.img || "icons/svg/wing.svg"),
    price: Math.max(0, Math.trunc(ctNum(raw.price, fallbackPrice))),
    raw: raw.raw && typeof raw.raw === "object" ? ctClone(raw.raw) : null,
    createdAt: ctNum(raw.createdAt, ctNow())
  };
}

function ctNormalizeTerminal(raw = {}) {
  const base = ctNewTerminal(raw.type, raw.name);
  const terminal = foundry.utils.mergeObject(base, raw, { inplace: false, insertKeys: true, overwrite: true });
  delete terminal.headerImage;
  terminal.id = String(raw.id || base.id);
  terminal.name = String(raw.name || base.name);
  terminal.subtitle = String(raw.subtitle || base.subtitle);
  terminal.type = raw.type === "autofixer" ? "autofixer" : "computer";
  terminal.startView = ["home", "inbox", "files", "citinet", "autofixer"].includes(raw.startView) ? raw.startView : base.startView;
  terminal.citinetMode = raw.citinetMode === "online" ? "online" : "cached";
  terminal.sceneId = String(raw.sceneId || "");
  terminal.tileUuid = String(raw.tileUuid || "");
  terminal.sceneOnly = raw.sceneOnly !== false;
  terminal.enabled = {
    inbox: raw.enabled?.inbox !== false && terminal.type !== "autofixer",
    files: raw.enabled?.files !== false && terminal.type !== "autofixer",
    citinet: raw.enabled?.citinet !== false && terminal.type !== "autofixer",
    autofixer: raw.enabled?.autofixer === true || terminal.type === "autofixer"
  };
  terminal.trace = foundry.utils.mergeObject(ctDefaultTrace(), raw.trace || {}, { inplace: false });
  terminal.trace.enabled = Boolean(terminal.trace.enabled);
  terminal.trace.max = Math.max(1, Math.trunc(ctNum(terminal.trace.max, 100)));
  terminal.trace.baseCost = Math.max(0, Math.trunc(ctNum(terminal.trace.baseCost, 5)));
  terminal.trace.warnAt = ctClamp(Math.trunc(ctNum(terminal.trace.warnAt, 60)), 0, terminal.trace.max);
  terminal.trace.lockOnFull = terminal.trace.lockOnFull !== false;
  terminal.trace.revision = Math.max(1, Math.trunc(ctNum(terminal.trace.revision, 1)));
  terminal.emails = Array.isArray(raw.emails) ? raw.emails.map(entry => ctNormalizeContent(entry, "email")) : [];
  terminal.files = Array.isArray(raw.files) ? raw.files.map(entry => ctNormalizeContent(entry, "file")) : [];
  terminal.vehicles = Array.isArray(raw.vehicles) ? raw.vehicles.map(ctNormalizeVehicle) : [];
  terminal.createdAt = ctNum(raw.createdAt, ctNow());
  terminal.updatedAt = ctNum(raw.updatedAt, ctNow());
  return terminal;
}

function ctNormalizeDB(value) {
  const raw = value && typeof value === "object" ? ctClone(value) : ctDefaultDB();
  const db = { _ver: CT_DB_VERSION, terminals: {}, netpages: {}, netpageOrder: [] };
  for (const [id, terminal] of Object.entries(raw.terminals || {})) {
    const normalized = ctNormalizeTerminal({ ...terminal, id: terminal?.id || id });
    db.terminals[normalized.id] = normalized;
  }
  for (const [id, page] of Object.entries(raw.netpages || {})) {
    const normalized = ctNormalizeContent({ ...page, id: page?.id || id }, "netpage");
    db.netpages[normalized.id] = normalized;
  }
  if (!Object.keys(db.netpages).length) {
    const welcome = ctDefaultNetpage();
    db.netpages[welcome.id] = welcome;
  }
  const requested = Array.isArray(raw.netpageOrder) ? raw.netpageOrder.map(String) : [];
  db.netpageOrder = [...requested.filter(id => db.netpages[id]), ...Object.keys(db.netpages).filter(id => !requested.includes(id))];
  return db;
}

function ctRegisterSettings() {
  game.settings.register(CT_ID, CT_DB_KEY, {
    name: "CitiNet Terminal Database",
    scope: "world",
    config: false,
    type: Object,
    default: ctDefaultDB()
  });
}

async function ctLoadDB() {
  return ctNormalizeDB(game.settings.get(CT_ID, CT_DB_KEY));
}

async function ctSaveDB(db, { terminalId = null } = {}) {
  if (!game.user.isGM) throw new Error("Only a GM may update CitiNet Terminal data.");
  const saved = await game.settings.set(CT_ID, CT_DB_KEY, ctNormalizeDB(db));
  ctRefreshOpenWindows(terminalId, { skipEditor: true });
  game.socket.emit(CT_SOCKET, { op: "refresh", terminalId });
  return saved;
}

function ctGetActor() {
  return canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? null;
}

function ctIsNetrunner(actor) {
  if (!actor) return false;
  const apiCheck = game.modules.get(CT_HBL_ID)?.api?.isNetrunner;
  if (typeof apiCheck === "function") {
    try { return Boolean(apiCheck(actor)); }
    catch (_error) { /* use the matching local check below */ }
  }
  return actor.items?.some(item => {
    if (item.type !== "role") return false;
    const roleName = String(item.name || "").trim().toLowerCase();
    const mainAbility = String(item.system?.mainRoleAbility || "").trim().toLowerCase();
    return roleName === "netrunner" || mainAbility === "interface";
  }) ?? false;
}

function ctIsMemoryChipItem(item) {
  const name = String(item?.name || "").trim().toLowerCase().replace(/\s+/g, " ");
  return name === "memory chip" && (item?.type === "gear" || item?.type === "cyberware");
}

function ctMemoryChipState(actor) {
  const items = actor?.items ? Array.from(actor.items) : [];
  const chips = items.filter(ctIsMemoryChipItem).filter(item => item.type !== "gear" || ctNum(item.system?.amount, 1) > 0);
  const installedIds = new Set();
  for (const item of items) {
    const list = item.system?.installedItems?.list;
    if (!Array.isArray(list)) continue;
    for (const id of list) installedIds.add(String(id));
  }

  for (const chip of chips) {
    const chipId = String(chip.id || chip._id || "");
    if (chip.type === "cyberware" && chipId && installedIds.has(chipId)) {
      return { ready: true, item: chip, state: "installed" };
    }
    const equipped = String(chip.system?.equipped || "").trim().toLowerCase();
    if (chip.type === "gear" && (equipped === "carried" || equipped === "equipped")) {
      return { ready: true, item: chip, state: equipped };
    }
  }

  const hasGear = chips.some(item => item.type === "gear");
  const hasCyberware = chips.some(item => item.type === "cyberware");
  if (hasGear && hasCyberware) {
    return { ready: false, warning: `${actor.name} owns a Memory Chip, but it must be carried, equipped, or installed before exporting. Update the Actor sheet and retry.` };
  }
  if (hasGear) {
    return { ready: false, warning: `${actor.name} owns a Memory Chip, but it must be carried or equipped before exporting. Update the Actor sheet and retry.` };
  }
  if (hasCyberware) {
    return { ready: false, warning: `${actor.name} owns Memory Chip cyberware, but it must be installed before exporting. Install it on the Actor sheet and retry.` };
  }
  return { ready: false, warning: `${actor.name} does not have a Memory Chip. Add one as carried or equipped gear, or as installed cyberware, then retry.` };
}

function ctReadPath(object, path) {
  return path.split(".").reduce((value, key) => value == null ? undefined : value[key], object);
}

function ctFirstValue(object, paths) {
  for (const path of paths) {
    const value = ctReadPath(object, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function ctReadPrice(object) {
  const value = ctFirstValue(object, [
    "system.price.market", "system.price.value", "system.price", "system.cost.market", "system.cost.value", "system.cost"
  ]);
  return Math.max(0, Math.trunc(ctNum(value, 0)));
}

async function ctAdjustWealth(actor, delta, reason = "CitiNet Transaction") {
  const wealth = ctClone(actor.system?.wealth || {});
  const before = ctNum(wealth.value, 0);
  wealth.value = before + Math.trunc(delta);
  wealth.transactions ||= [];
  const direction = delta >= 0 ? "Increased" : "Decreased";
  wealth.transactions.push([`${direction} by ${Math.abs(Math.trunc(delta))} to ${Math.trunc(wealth.value)}`, reason]);
  return actor.update({ "system.wealth": wealth });
}

async function ctFromUuid(uuid) {
  if (!uuid) return null;
  try { return await fromUuid(uuid); } catch (_error) { return null; }
}

function ctDocumentReference(doc) {
  if (!doc) return "";
  if (doc.uuid) return String(doc.uuid);
  if (doc.pack && doc.id) return `Compendium.${doc.pack}.Item.${doc.id}`;
  return doc.id ? `Item.${doc.id}` : "";
}

function ctSelectedTiles() {
  return (canvas?.tiles?.controlled || []).map(tile => tile.document || tile).filter(tile => tile?.documentName === "Tile");
}

function ctBindingCount(terminalId) {
  let count = 0;
  for (const scene of game.scenes || []) {
    count += scene.tiles?.filter(tile => tile.getFlag(CT_ID, CT_BINDING_FLAG)?.terminalId === terminalId).length || 0;
  }
  return count;
}

async function ctBindSelectedTiles(terminalId) {
  if (!game.user.isGM) return ui.notifications.warn("Only the GM can bind CitiNet Terminal Tiles.");
  const db = await ctLoadDB();
  const terminal = db.terminals[terminalId];
  if (!terminal) return ui.notifications.warn(`Terminal not found: ${terminalId}`);
  const scene = ctScene();
  const tiles = ctSelectedTiles();
  if (!scene || !tiles.length) return ui.notifications.warn("Select one or more Tiles with Foundry's Tile Controls first.");
  const binding = { terminalId, terminalName: terminal.name, sceneId: scene.id, boundAt: ctNow(), version: 1 };
  await Promise.all(tiles.map(tile => tile.setFlag(CT_ID, CT_BINDING_FLAG, binding)));
  terminal.sceneId = scene.id;
  terminal.tileUuid = tiles[0].uuid || terminal.tileUuid;
  terminal.updatedAt = ctNow();
  await ctSaveDB(db, { terminalId });
  ui.notifications.info(`Bound ${tiles.length} Tile${tiles.length === 1 ? "" : "s"} to ${terminal.name}.`);
  return tiles.length;
}

async function ctUnbindTerminal(terminalId) {
  if (!game.user.isGM) return 0;
  const targets = [];
  for (const scene of game.scenes || []) {
    for (const tile of scene.tiles || []) {
      if (tile.getFlag(CT_ID, CT_BINDING_FLAG)?.terminalId === terminalId) targets.push(tile);
    }
  }
  await Promise.all(targets.map(tile => tile.unsetFlag(CT_ID, CT_BINDING_FLAG)));
  return targets.length;
}

function ctFormRoot(html) {
  const root = html?.[0] || html;
  return root?.tagName === "FORM" ? root : root?.querySelector?.("form") || null;
}

function ctDragData(event) {
  try {
    const data = TextEditor.getDragEventData(event);
    if (data) return data;
  } catch (_error) { /* try plain text below */ }
  try { return JSON.parse(event.dataTransfer?.getData("text/plain") || "null"); }
  catch (_parseError) { return null; }
}

async function ctResolveDroppedDocument(event, expectedType) {
  const data = ctDragData(event);
  if (!data || data.type !== expectedType) return null;
  let doc = data.uuid ? await ctFromUuid(data.uuid) : null;
  if (!doc && data.pack && (data.id || data._id)) doc = await game.packs.get(data.pack)?.getDocument(data.id || data._id);
  if (!doc && (data.id || data._id)) {
    const collection = expectedType === "RollTable" ? game.tables : expectedType === "Item" ? game.items : null;
    doc = collection?.get(data.id || data._id) || null;
  }
  return doc?.documentName === expectedType ? doc : null;
}

function ctSnapshotRollTable(table) {
  const results = table?.results?.contents || Array.from(table?.results || []);
  return ctNormalizeRandomTable({
    uuid: String(table?.uuid || ""),
    name: String(table?.name || "RollTable"),
    formula: String(table?.formula || `1d${Math.max(1, results.length)}`),
    drawCount: 1,
    results: results.map(result => ({
      text: String(result?.text || ""),
      img: String(result?.img || result?.icon || ""),
      range: Array.isArray(result?.range) ? result.range : [],
      weight: result?.weight
    }))
  });
}

async function ctScenePuzzleOptions() {
  const module = game.modules.get(CT_HBL_ID);
  const api = module?.active ? module.api : null;
  if (!api?.listScenePuzzles) return [];
  try {
    const puzzles = await api.listScenePuzzles();
    return Object.values(puzzles || {}).map(puzzle => ({ id: puzzle.id, name: puzzle.name, sceneId: ctScene()?.id || "" }));
  } catch (error) {
    console.warn(`${CT_ID} | Could not list Hexcode Breach puzzles`, error);
    return [];
  }
}

function ctDialogClass(app, html, extraClass = "") {
  const element = html?.[0]?.closest?.(".app") || app?.element?.[0];
  element?.classList?.add("citinet-dialog-host");
  if (extraClass) element?.classList?.add(extraClass);
}

function ctPromptName(title, fallback) {
  return new Promise(resolve => {
    let settled = false;
    const finish = value => { if (!settled) { settled = true; resolve(value); } };
    const dialog = new Dialog({
      title,
      content: `<form class="citinet-dialog"><label>Name<input type="text" name="name" value="${ctEsc(fallback)}" autofocus></label></form>`,
      buttons: {
        create: { label: "Create", icon: '<i class="fas fa-plus"></i>', callback: html => finish(String(new FormData(ctFormRoot(html)).get("name") || fallback).trim()) },
        cancel: { label: "Cancel", callback: () => finish(null) }
      },
      default: "create",
      render: html => ctDialogClass(dialog, html),
      close: () => finish(null)
    }, { width: 420 });
    dialog.render(true);
  });
}

async function ctConfirm(title, content, yes = "Confirm") {
  return Dialog.confirm({ title, content, yes: () => true, no: () => false, defaultYes: false }, { classes: ["citinet-dialog-host"] });
}

async function ctContentEditor(kind, source, puzzleOptions = []) {
  const item = ctNormalizeContent(source || {}, kind);
  const isEmail = kind === "email";
  const isFile = kind === "file";
  const isNetpage = kind === "netpage";
  let randomTable = ctNormalizeRandomTable(item.randomTable || ctEmptyRandomTable());
  const shardExport = ctNormalizeShardExport(item.shardExport);
  const title = source?.id ? `Edit ${isEmail ? "Email" : isFile ? "File" : "CitiNet Page"}` : `New ${isEmail ? "Email" : isFile ? "File" : "CitiNet Page"}`;
  if (item.lockPuzzleId && !puzzleOptions.some(puzzle => puzzle.id === item.lockPuzzleId)) {
    puzzleOptions = [...puzzleOptions, { id: item.lockPuzzleId, name: item.lockPuzzleName || "Previously assigned puzzle", sceneId: item.lockSceneId || "" }];
  }
  const lockOptions = [
    `<option value="">No Hexcode lock</option>`,
    ...puzzleOptions.map(puzzle => `<option value="${ctEsc(puzzle.id)}" ${item.lockPuzzleId === puzzle.id ? "selected" : ""}>${ctEsc(puzzle.name)} (${ctEsc(puzzle.id)})</option>`)
  ].join("");
  const primaryFields = isEmail ? `
    <label class="citinet-wide">Subject<input name="subject" value="${ctEsc(item.subject)}" required></label>
    <label>From<input name="from" value="${ctEsc(item.from)}"></label>
    <label>To<input name="to" value="${ctEsc(item.to)}"></label>
    <label>Date / timestamp<input name="date" value="${ctEsc(item.date)}"></label>` : isFile ? `
    <label class="citinet-wide">Title<input name="title" value="${ctEsc(item.title)}" required></label>
    <label>File type<input name="fileType" value="${ctEsc(item.fileType)}"></label>
    <label>Date / timestamp<input name="date" value="${ctEsc(item.date)}"></label>` : `
  <label class="citinet-wide">Page title<input name="title" value="${ctEsc(item.title)}" required></label>
    <label>Category<input name="category" value="${ctEsc(item.category)}"></label>
    <label>Card excerpt<input name="excerpt" value="${ctEsc(item.excerpt)}"><div class="citinet-dialog-help">Short preview shown beneath this page title in the CitiNet directory.</div></label>`;
  const lockField = !isNetpage ? `
    <label class="citinet-wide citinet-dialog-lock">Hexcode Breach Lite lock
      <select name="lockPuzzleId" ${game.modules.get(CT_HBL_ID)?.active ? "" : "disabled"}>${lockOptions}</select>
      <div class="citinet-dialog-help">${game.modules.get(CT_HBL_ID)?.active ? "Puzzles belong to the active scene. A changed lock invalidates earlier player unlocks." : "Hexcode Breach Lite v1.0.0 is not active; this content will remain unlocked."}</div>
    </label>` : "";
  const randomTableField = isFile ? `<section class="citinet-dialog-section citinet-wide">
    <div class="citinet-dialog-section-head"><div><strong>Randomized File Data</strong><span>Optional. Drop a RollTable to append one or more randomized text results when this file opens. Result images also join the gallery.</span></div></div>
    <div class="citinet-rolltable-drop ${randomTable.uuid ? "has-table" : ""}" data-rolltable-drop>
      <i class="fas fa-dice-d20"></i><div><strong data-rolltable-name>${ctEsc(randomTable.name || "Drop RollTable Here")}</strong><small data-rolltable-status>${randomTable.uuid ? `${randomTable.results.length} snapshotted results // ${randomTable.formula}` : "World and compendium RollTables are supported."}</small></div>
      <button type="button" data-remove-rolltable ${randomTable.uuid ? "" : "hidden"}><i class="fas fa-trash"></i> Remove</button>
    </div>
    <label>Results drawn per open<input type="number" name="randomTableDrawCount" min="1" max="20" value="${randomTable.drawCount}"></label>
    <div class="citinet-dialog-help">A draw stays fixed while the terminal window remains open. Reopening the terminal creates a fresh draw.</div>
  </section>` : "";
  const shardExportField = `<section class="citinet-dialog-section citinet-wide citinet-shard-editor">
    <div class="citinet-dialog-section-head"><div><strong>Export to Shard (Memory Chip)</strong><span>Optional player action. Every Actor needs a carried/equipped Memory Chip or installed Memory Chip cyberware. Netrunners bypass only the configured DV; everyone else rolls manually and the required skill and DV are posted to chat.</span></div></div>
    <div class="citinet-shard-grid">
      <label class="citinet-inline-check"><input type="checkbox" name="shardExportEnabled" ${shardExport.enabled ? "checked" : ""}> Allow Shard export</label>
      <label class="citinet-inline-check"><input type="checkbox" name="shardExportRequireCheck" data-shard-requires ${shardExport.requireCheck ? "checked" : ""}> Require manual DV check</label>
      <div class="citinet-shard-check-fields" data-shard-fields ${shardExport.requireCheck ? "" : "hidden"}>
        <label>Skill<select name="shardExportSkill"><option value="basic-tech" ${shardExport.skill === "basic-tech" ? "selected" : ""}>Basic Tech</option><option value="electronics-security-tech" ${shardExport.skill === "electronics-security-tech" ? "selected" : ""}>Electronics/Security Tech</option></select></label>
        <label>DV for success<input type="number" name="shardExportDV" min="6" max="29" value="${shardExport.dv}"></label>
      </div>
    </div>
  </section>`;
  const content = `<form class="citinet-dialog citinet-dialog-grid">
    ${primaryFields}
    <section class="citinet-dialog-section citinet-wide">
      <div class="citinet-dialog-section-head"><div><strong>Primary Image</strong><span>Shown above the body. Wide banners scale down to fit; smaller icon art keeps its natural size instead of stretching. CitiNet pages also use it as their directory thumbnail.</span></div><button type="button" data-pick-image><i class="fas fa-image"></i> Browse</button></div>
      <input name="image" value="${ctEsc(item.image)}" placeholder="icons/... or modules/...">
    </section>
    <label class="citinet-wide">Body (HTML and Foundry document links supported)<textarea name="body">${ctEsc(item.body)}</textarea><div class="citinet-dialog-help">Web addresses remain display-only text and can never open an external browser from this simulated network.</div></label>
    ${randomTableField}
    <section class="citinet-dialog-section citinet-wide">
      <div class="citinet-dialog-section-head"><div><strong>Gallery Images</strong><span>Additional clickable thumbnails shown after the body. Add one Foundry image path per line.</span></div><div><button type="button" data-add-gallery-image><i class="fas fa-plus"></i> Add Image</button><button type="button" data-clear-gallery><i class="fas fa-eraser"></i> Clear</button></div></div>
      <textarea name="gallery" data-gallery-paths placeholder="icons/example.webp&#10;modules/example/another.webp">${ctEsc(item.gallery.join("\n"))}</textarea>
      <div class="citinet-gallery-preview" data-gallery-preview></div>
    </section>
    <label>Additional trace cost<input type="number" name="traceCost" min="0" max="1000" value="${item.traceCost}"></label>
    <label class="citinet-inline-check"><input type="checkbox" name="published" ${item.published ? "checked" : ""}> Published / visible</label>
    ${lockField}
    ${shardExportField}
  </form>`;
  return new Promise(resolve => {
    let settled = false;
    const finish = value => { if (!settled) { settled = true; resolve(value); } };
    const viewportHeight = Math.max(520, Number(globalThis.innerHeight || 900));
    const viewportWidth = Math.max(520, Number(globalThis.innerWidth || 1200));
    const dialogHeight = Math.max(460, Math.min(820, viewportHeight - 90));
    const dialogWidth = Math.max(500, Math.min(760, viewportWidth - 70));
    const dialog = new Dialog({
      title,
      content,
      buttons: {
        save: {
          label: "Save",
          icon: '<i class="fas fa-save"></i>',
          callback: html => {
            const fd = new FormData(ctFormRoot(html));
            const submittedLockId = game.modules.get(CT_HBL_ID)?.active ? String(fd.get("lockPuzzleId") || "") : item.lockPuzzleId;
            const selectedPuzzle = puzzleOptions.find(puzzle => puzzle.id === submittedLockId);
            const previousLock = item.lockPuzzleId;
            const next = ctNormalizeContent({
              ...item,
              subject: fd.get("subject"), from: fd.get("from"), to: fd.get("to"),
              title: fd.get("title"), fileType: fd.get("fileType"), category: fd.get("category"), excerpt: fd.get("excerpt"),
              date: fd.get("date"), body: fd.get("body"), image: fd.get("image"), gallery: ctLines(fd.get("gallery")),
              shardExport: {
                enabled: fd.has("shardExportEnabled"),
                requireCheck: fd.has("shardExportRequireCheck"),
                skill: fd.get("shardExportSkill"),
                dv: fd.get("shardExportDV")
              },
              randomTable: isFile ? { ...randomTable, drawCount: fd.get("randomTableDrawCount") } : ctEmptyRandomTable(),
              traceCost: fd.get("traceCost"), published: fd.has("published"),
              lockPuzzleId: selectedPuzzle?.id || "", lockPuzzleName: selectedPuzzle?.name || "", lockSceneId: selectedPuzzle?.sceneId || "",
              lockRevision: previousLock === (selectedPuzzle?.id || "") ? item.lockRevision : item.lockRevision + 1,
              updatedAt: ctNow()
            }, kind);
            finish(next);
          }
        },
        cancel: { label: "Cancel", callback: () => finish(null) }
      },
      default: "save",
      render: html => {
        ctDialogClass(dialog, html, "citinet-content-editor-host");
        const root = html?.[0];
        const form = ctFormRoot(html);
        const galleryInput = form?.querySelector?.("[data-gallery-paths]");
        const galleryPreview = form?.querySelector?.("[data-gallery-preview]");
        const refreshGallery = () => {
          if (!galleryPreview) return;
          const paths = ctLines(galleryInput?.value);
          galleryPreview.innerHTML = paths.length ? paths.map(path => `<img src="${ctEsc(path)}" data-preview-image="${ctEsc(path)}" alt="Gallery preview">`).join("") : `<span>No gallery images selected.</span>`;
        };
        refreshGallery();
        galleryInput?.addEventListener("input", refreshGallery);
        root?.querySelector?.("[data-pick-image]")?.addEventListener("click", event => {
          event.preventDefault();
          const input = root.querySelector("[name='image']");
          new FilePicker({ type: "image", current: input?.value || "", callback: path => { if (input) input.value = path; } }).browse();
        });
        root?.querySelector?.("[data-add-gallery-image]")?.addEventListener("click", event => {
          event.preventDefault();
          new FilePicker({ type: "image", callback: path => {
            if (!galleryInput) return;
            galleryInput.value = [...ctLines(galleryInput.value), path].join("\n");
            refreshGallery();
          } }).browse();
        });
        root?.querySelector?.("[data-clear-gallery]")?.addEventListener("click", event => {
          event.preventDefault();
          if (galleryInput) galleryInput.value = "";
          refreshGallery();
        });
        galleryPreview?.addEventListener("click", event => {
          const src = event.target?.dataset?.previewImage;
          if (src) new ImagePopout(src, { title: "Gallery Preview" }).render(true);
        });
        const shardRequires = form?.querySelector?.("[data-shard-requires]");
        const shardFields = form?.querySelector?.("[data-shard-fields]");
        const refreshShardFields = () => { if (shardFields) shardFields.hidden = !shardRequires?.checked; };
        shardRequires?.addEventListener("change", refreshShardFields);
        refreshShardFields();
        const tableDrop = form?.querySelector?.("[data-rolltable-drop]");
        const refreshTable = () => {
          if (!tableDrop) return;
          tableDrop.classList.toggle("has-table", Boolean(randomTable.uuid));
          const name = tableDrop.querySelector("[data-rolltable-name]");
          const status = tableDrop.querySelector("[data-rolltable-status]");
          const remove = tableDrop.querySelector("[data-remove-rolltable]");
          if (name) name.textContent = randomTable.name || "Drop RollTable Here";
          if (status) status.textContent = randomTable.uuid ? `${randomTable.results.length} snapshotted results // ${randomTable.formula}` : "World and compendium RollTables are supported.";
          if (remove) remove.hidden = !randomTable.uuid;
        };
        tableDrop?.addEventListener("dragover", event => { event.preventDefault(); tableDrop.classList.add("is-drag"); });
        tableDrop?.addEventListener("dragleave", event => { event.preventDefault(); tableDrop.classList.remove("is-drag"); });
        tableDrop?.addEventListener("drop", async event => {
          event.preventDefault();
          tableDrop.classList.remove("is-drag");
          const table = await ctResolveDroppedDocument(event, "RollTable");
          if (!table) return ui.notifications.warn("Drop a world or compendium RollTable here.");
          randomTable = ctSnapshotRollTable(table);
          refreshTable();
          ui.notifications.info(`Added RollTable ${table.name}.`);
        });
        tableDrop?.querySelector?.("[data-remove-rolltable]")?.addEventListener("click", event => {
          event.preventDefault();
          randomTable = ctEmptyRandomTable();
          refreshTable();
        });
      },
      close: () => finish(null)
    }, { width: dialogWidth, height: dialogHeight, resizable: true });
    dialog.render(true);
  });
}

let ctManagerApp = null;

class CitiNetManagerApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "citinet-terminal-manager",
      title: "CitiNet Terminal Manager",
      template: `modules/${CT_ID}/templates/manager.hbs`,
      width: 900,
      height: 760,
      resizable: true,
      classes: ["citinet-terminal-manager"]
    });
  }

  async getData() {
    const db = await ctLoadDB();
    const terminals = Object.values(db.terminals).sort((a, b) => a.name.localeCompare(b.name)).map(terminal => ({
      ...terminal,
      icon: terminal.type === "autofixer" ? "fa-car-side" : "fa-desktop",
      typeLabel: terminal.type === "autofixer" ? "Autofixer" : "Computer",
      citinetModeLabel: terminal.citinetMode === "online" ? "CitiNet Online" : "CitiNet Cache",
      sceneLabel: terminal.sceneId ? (game.scenes.get(terminal.sceneId)?.name || "Missing Scene") : "Any Scene",
      bindingLabel: `${ctBindingCount(terminal.id)} Tile binding${ctBindingCount(terminal.id) === 1 ? "" : "s"}`,
      emailCount: terminal.emails.length,
      fileCount: terminal.files.length,
      vehicleCount: terminal.vehicles.length
    }));
    const netpages = db.netpageOrder.map(id => db.netpages[id]).filter(Boolean);
    return {
      terminals,
      terminalCount: terminals.length,
      netpages,
      helperCommand: `return game.citinet({
  args: typeof args === "undefined" ? null : args,
  tile: typeof tile === "undefined" ? null : tile,
  token: typeof token === "undefined" ? null : token,
  actor: typeof actor === "undefined" ? null : actor
});`
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.on("click", "[data-action]", event => this._onAction(event));
  }

  async _onAction(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const action = button.dataset.action;
    const terminalId = button.closest("[data-terminal-id]")?.dataset.terminalId;
    const netpageId = button.closest("[data-netpage-id]")?.dataset.netpageId;
    if (action === "new-computer" || action === "new-autofixer") {
      const type = action === "new-autofixer" ? "autofixer" : "computer";
      const name = await ctPromptName(type === "autofixer" ? "New Autofixer Terminal" : "New Computer Terminal", type === "autofixer" ? "Autofixer Terminal" : "New Terminal");
      if (!name) return;
      const terminal = ctNewTerminal(type, name);
      const db = await ctLoadDB();
      db.terminals[terminal.id] = terminal;
      await ctSaveDB(db, { terminalId: terminal.id });
      this.render(false);
      return ctOpenEditor(terminal.id);
    }
    if (action === "new-netpage") {
      const page = await ctContentEditor("netpage", null, []);
      if (!page) return;
      const db = await ctLoadDB();
      db.netpages[page.id] = page;
      db.netpageOrder.push(page.id);
      await ctSaveDB(db);
      return this.render(false);
    }
    if (action === "edit") return ctOpenEditor(terminalId);
    if (action === "preview") return ctOpenTerminal(terminalId, { gmPreview: true });
    if (action === "bind") { await ctBindSelectedTiles(terminalId); return this.render(false); }
    if (action === "reset-trace") { await ctResetTrace(terminalId); return this.render(false); }
    if (action === "delete") {
      const db = await ctLoadDB();
      const terminal = db.terminals[terminalId];
      if (!terminal) return;
      if (!await ctConfirm("Delete Terminal", `<p>Delete <b>${ctEsc(terminal.name)}</b> and remove all of its Tile bindings?</p>`)) return;
      delete db.terminals[terminalId];
      await ctUnbindTerminal(terminalId);
      await ctSaveDB(db, { terminalId });
      return this.render(false);
    }
    if (action === "edit-netpage") {
      const db = await ctLoadDB();
      const page = db.netpages[netpageId];
      if (!page) return;
      const edited = await ctContentEditor("netpage", page, []);
      if (!edited) return;
      db.netpages[netpageId] = edited;
      await ctSaveDB(db);
      return this.render(false);
    }
    if (action === "delete-netpage") {
      const db = await ctLoadDB();
      const page = db.netpages[netpageId];
      if (!page || !await ctConfirm("Delete CitiNet Page", `<p>Delete <b>${ctEsc(page.title)}</b>?</p>`)) return;
      delete db.netpages[netpageId];
      db.netpageOrder = db.netpageOrder.filter(id => id !== netpageId);
      await ctSaveDB(db);
      return this.render(false);
    }
    if (action === "netpage-up" || action === "netpage-down") {
      const db = await ctLoadDB();
      ctMoveEntry(db.netpageOrder, netpageId, action === "netpage-up" ? -1 : 1);
      await ctSaveDB(db);
      return this.render(false);
    }
    if (action === "create-macro") return ctCreateHelperMacro();
  }
}

function ctMoveEntry(array, id, delta) {
  const index = array.findIndex(entry => typeof entry === "string" ? entry === id : entry.id === id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= array.length) return false;
  [array[index], array[target]] = [array[target], array[index]];
  return true;
}

class CitiNetTerminalEditorApp extends FormApplication {
  constructor(terminalId, options = {}) {
    super({}, options);
    this.terminalId = terminalId;
    this.terminal = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "citinet-terminal-editor",
      title: "CitiNet Terminal Editor",
      template: `modules/${CT_ID}/templates/terminal-editor.hbs`,
      width: 920,
      height: 820,
      resizable: true,
      closeOnSubmit: false,
      submitOnChange: false,
      classes: ["citinet-terminal-editor"]
    });
  }

  async _ensureTerminal() {
    if (this.terminal) return this.terminal;
    const db = await ctLoadDB();
    const terminal = db.terminals[this.terminalId];
    if (!terminal) return null;
    this.terminal = ctClone(terminal);
    return this.terminal;
  }

  async getData() {
    const terminal = await this._ensureTerminal();
    if (!terminal) return { missing: true };
    const scene = ctScene();
    return {
      terminal,
      typeOptions: [
        { value: "computer", label: "Computer", selected: terminal.type === "computer" },
        { value: "autofixer", label: "Autofixer", selected: terminal.type === "autofixer" }
      ],
      startOptions: [
        { value: "home", label: "Home", selected: terminal.startView === "home" },
        { value: "inbox", label: "Inbox", selected: terminal.startView === "inbox" },
        { value: "files", label: "Local Files", selected: terminal.startView === "files" },
        { value: "citinet", label: "CitiNet", selected: terminal.startView === "citinet" },
        { value: "autofixer", label: "Autofixer", selected: terminal.startView === "autofixer" }
      ],
      citinetModeOptions: [
        { value: "cached", label: "Cached / Offline", selected: terminal.citinetMode !== "online" },
        { value: "online", label: "Online (Roleplay)", selected: terminal.citinetMode === "online" }
      ],
      emails: terminal.emails.map(item => ({ ...item, locked: Boolean(item.lockPuzzleId), lockName: item.lockPuzzleName || item.lockPuzzleId })),
      files: terminal.files.map(item => ({
        ...item,
        locked: Boolean(item.lockPuzzleId),
        lockName: item.lockPuzzleName || item.lockPuzzleId,
        randomized: Boolean(item.randomTable?.uuid),
        randomTableName: item.randomTable?.name || "RollTable"
      })),
      vehicles: terminal.vehicles.map(item => ({ ...item, sourceLabel: item.uuid || "Embedded snapshot" })),
      sceneLabel: scene?.name || "No active scene",
      bindingCount: ctBindingCount(terminal.id)
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.on("click", "[data-action]", event => this._onAction(event));
    html.on("change", "[data-vehicle-price]", event => {
      const id = event.currentTarget.closest("[data-id]")?.dataset.id;
      const vehicle = this.terminal?.vehicles.find(entry => entry.id === id);
      if (vehicle) vehicle.price = Math.max(0, Math.trunc(ctNum(event.currentTarget.value, 0)));
    });
    html.on("click", "[data-picker-target]", event => {
      event.preventDefault();
      const name = event.currentTarget.dataset.pickerTarget;
      const input = ctFormRoot(html)?.querySelector(`[name='${name}']`);
      new FilePicker({ type: "image", current: input?.value || "", callback: path => { if (input) input.value = path; } }).browse();
    });
    const drop = html?.[0]?.querySelector?.(".citinet-vehicle-drop");
    drop?.addEventListener("dragover", event => { event.preventDefault(); drop.classList.add("is-drag"); });
    drop?.addEventListener("dragleave", event => { event.preventDefault(); drop.classList.remove("is-drag"); });
    drop?.addEventListener("drop", event => this._onVehicleDrop(event));
  }

  async _onAction(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    const row = event.currentTarget.closest("[data-kind][data-id]");
    const kind = row?.dataset.kind;
    const id = row?.dataset.id;
    const list = kind === "email" ? this.terminal.emails : kind === "file" ? this.terminal.files : null;
    if (action === "add-email" || action === "add-file") {
      const addKind = action === "add-email" ? "email" : "file";
      const item = await ctContentEditor(addKind, null, await ctScenePuzzleOptions());
      if (!item) return;
      this.terminal[addKind === "email" ? "emails" : "files"].push(item);
      return this.render(false);
    }
    if (action === "edit-content" && list) {
      const index = list.findIndex(entry => entry.id === id);
      if (index < 0) return;
      const item = await ctContentEditor(kind, list[index], await ctScenePuzzleOptions());
      if (!item) return;
      list[index] = item;
      return this.render(false);
    }
    if (action === "delete-content" && list) {
      const item = list.find(entry => entry.id === id);
      if (!item || !await ctConfirm("Delete Content", `<p>Delete <b>${ctEsc(item.subject || item.title)}</b>?</p>`)) return;
      this.terminal[kind === "email" ? "emails" : "files"] = list.filter(entry => entry.id !== id);
      return this.render(false);
    }
    if ((action === "content-up" || action === "content-down") && list) {
      ctMoveEntry(list, id, action === "content-up" ? -1 : 1);
      return this.render(false);
    }
    const vehicleRow = event.currentTarget.closest(".citinet-vehicle-row[data-id]");
    const vehicleId = vehicleRow?.dataset.id;
    if (action === "delete-vehicle") {
      this.terminal.vehicles = this.terminal.vehicles.filter(entry => entry.id !== vehicleId);
      return this.render(false);
    }
    if (action === "vehicle-up" || action === "vehicle-down") {
      ctMoveEntry(this.terminal.vehicles, vehicleId, action === "vehicle-up" ? -1 : 1);
      return this.render(false);
    }
    if (action === "preview") {
      await this.submit({ preventClose: true });
      return ctOpenTerminal(this.terminalId, { gmPreview: true, forceNew: true });
    }
    if (action === "bind") {
      await this.submit({ preventClose: true });
      await ctBindSelectedTiles(this.terminalId);
      return this.render(false);
    }
    if (action === "close") return this.close();
  }

  async _onVehicleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove("is-drag");
    let data = null;
    try { data = TextEditor.getDragEventData(event); } catch (_error) { /* continue */ }
    if (!data) {
      try { data = JSON.parse(event.dataTransfer?.getData("text/plain") || "null"); } catch (_error) { data = null; }
    }
    if (data?.type !== "Item") return ui.notifications.warn("Drop a Cyberpunk RED Vehicle Item here.");
    let doc = data.uuid ? await ctFromUuid(data.uuid) : null;
    if (!doc && data.pack && (data.id || data._id)) doc = await game.packs.get(data.pack)?.getDocument(data.id || data._id);
    if (!doc && (data.id || data._id)) doc = game.items.get(data.id || data._id);
    if (!doc || doc.documentName !== "Item") return ui.notifications.warn("That Item could not be resolved.");
    if (String(doc.type || "").toLowerCase() !== "vehicle") return ui.notifications.warn(`${doc.name} is not a Cyberpunk RED Vehicle Item.`);
    const uuid = ctDocumentReference(doc);
    const raw = doc.toObject();
    const existing = this.terminal.vehicles.find(entry => entry.uuid === uuid);
    if (existing) {
      existing.name = doc.name;
      existing.img = doc.img;
      existing.raw = raw;
      existing.price = ctReadPrice(doc);
      ui.notifications.info(`Refreshed ${doc.name} in this catalog.`);
    } else {
      this.terminal.vehicles.push(ctNormalizeVehicle({ uuid, name: doc.name, img: doc.img, price: ctReadPrice(doc), raw }));
      ui.notifications.info(`Added ${doc.name} to this catalog.`);
    }
    return this.render(false);
  }

  async _updateObject(_event, formData) {
    const terminal = await this._ensureTerminal();
    if (!terminal) return;
    const traceRevision = Math.max(1, Math.trunc(ctNum(terminal.trace?.revision, 1)));
    terminal.name = String(formData.name || terminal.name).trim();
    terminal.subtitle = String(formData.subtitle || "").trim();
    terminal.type = formData.type === "autofixer" ? "autofixer" : "computer";
    terminal.startView = String(formData.startView || "home");
    terminal.citinetMode = formData.citinetMode === "online" ? "online" : "cached";
    terminal.sceneOnly = Boolean(formData.sceneOnly);
    terminal.enabled = {
      inbox: Boolean(formData["enabled.inbox"]), files: Boolean(formData["enabled.files"]),
      citinet: Boolean(formData["enabled.citinet"]), autofixer: Boolean(formData["enabled.autofixer"])
    };
    terminal.trace = {
      enabled: Boolean(formData["trace.enabled"]),
      max: Math.max(1, Math.trunc(ctNum(formData["trace.max"], 100))),
      baseCost: Math.max(0, Math.trunc(ctNum(formData["trace.baseCost"], 5))),
      warnAt: Math.max(0, Math.trunc(ctNum(formData["trace.warnAt"], 60))),
      lockOnFull: Boolean(formData["trace.lockOnFull"]),
      revision: traceRevision
    };
    terminal.trace.warnAt = Math.min(terminal.trace.warnAt, terminal.trace.max);
    if (terminal.sceneOnly && !terminal.sceneId) terminal.sceneId = ctScene()?.id || "";
    terminal.updatedAt = ctNow();
    const db = await ctLoadDB();
    db.terminals[terminal.id] = ctNormalizeTerminal(terminal);
    await ctSaveDB(db, { terminalId: terminal.id });
    ui.notifications.info(`Saved ${terminal.name}.`);
    this.terminal = ctClone(db.terminals[terminal.id]);
    ctManagerApp?.render(false);
  }
}

const ctPlayerApps = new Map();
const ctPendingBreaches = new WeakMap();

function ctOpenManager() {
  if (!game.user.isGM) return ui.notifications.warn("Only the GM can open CitiNet Terminal Manager.");
  if (ctManagerApp?.rendered) {
    ctManagerApp.bringToTop();
    ctManagerApp.render(false);
    return ctManagerApp;
  }
  ctManagerApp = new CitiNetManagerApp();
  return ctManagerApp.render(true);
}

let ctEditorApp = null;
function ctOpenEditor(terminalId) {
  if (!game.user.isGM) return ui.notifications.warn("Only the GM can edit CitiNet terminals.");
  if (ctEditorApp?.rendered && ctEditorApp.terminalId === terminalId) {
    ctEditorApp.bringToTop();
    return ctEditorApp;
  }
  if (ctEditorApp?.rendered) ctEditorApp.close();
  ctEditorApp = new CitiNetTerminalEditorApp(terminalId);
  return ctEditorApp.render(true);
}

function ctReadUserFlag(flag) {
  const value = game.user?.getFlag(CT_ID, flag);
  return value && typeof value === "object" ? ctClone(value) : {};
}

function ctUnlockKey(terminal, kind, item) {
  return [terminal.id, kind, item.id, item.lockPuzzleId || "none", item.lockRevision || 1].join(":");
}

function ctIsUnlocked(terminal, kind, item) {
  if (game.user.isGM || !item?.lockPuzzleId) return true;
  return Boolean(ctReadUserFlag(CT_UNLOCK_FLAG)[ctUnlockKey(terminal, kind, item)]);
}

async function ctGrantUnlock(terminal, kind, item) {
  const unlocks = ctReadUserFlag(CT_UNLOCK_FLAG);
  unlocks[ctUnlockKey(terminal, kind, item)] = { unlockedAt: ctNow(), puzzleId: item.lockPuzzleId };
  await game.user.setFlag(CT_ID, CT_UNLOCK_FLAG, unlocks);
}

function ctReadKey(terminalId, kind, itemId) {
  return `${terminalId}:${kind}:${itemId}`;
}

function ctIsRead(terminalId, kind, itemId) {
  return Boolean(ctReadUserFlag(CT_READ_FLAG)[ctReadKey(terminalId, kind, itemId)]);
}

async function ctMarkRead(terminalId, kind, itemId) {
  const reads = ctReadUserFlag(CT_READ_FLAG);
  const key = ctReadKey(terminalId, kind, itemId);
  if (reads[key]) return;
  reads[key] = ctNow();
  await game.user.setFlag(CT_ID, CT_READ_FLAG, reads);
}

async function ctMarkUnread(terminalId, kind, itemId) {
  const reads = ctReadUserFlag(CT_READ_FLAG);
  const key = ctReadKey(terminalId, kind, itemId);
  if (!(key in reads)) return;
  delete reads[key];
  await game.user.setFlag(CT_ID, CT_READ_FLAG, reads);
}

function ctTraceState(terminal) {
  const states = ctReadUserFlag(CT_TRACE_FLAG);
  const raw = states[terminal.id] || {};
  const max = Math.max(1, terminal.trace.max);
  const revision = Math.max(1, Math.trunc(ctNum(terminal.trace.revision, 1)));
  const storedRevision = Math.trunc(ctNum(raw.revision, 0));
  if (storedRevision !== revision) return { progress: 0, traced: false, warned: false, updatedAt: 0, revision };
  const progress = ctClamp(Math.trunc(ctNum(raw.progress, 0)), 0, max);
  return { progress, traced: Boolean(raw.traced || progress >= max), warned: Boolean(raw.warned), updatedAt: ctNum(raw.updatedAt, 0), revision };
}

async function ctStoreTraceState(terminal, state) {
  const states = ctReadUserFlag(CT_TRACE_FLAG);
  states[terminal.id] = {
    ...state,
    revision: Math.max(1, Math.trunc(ctNum(terminal.trace.revision, 1))),
    updatedAt: ctNow()
  };
  await game.user.setFlag(CT_ID, CT_TRACE_FLAG, states);
}

async function ctResetTrace(terminalId) {
  if (!game.user.isGM) return;
  const db = await ctLoadDB();
  const terminal = db.terminals[terminalId];
  if (!terminal) return;
  if (!await ctConfirm("Reset Trace Records", `<p>Reset <b>${ctEsc(terminal.name)}</b> trace progress for every user?</p>`)) return;
  terminal.trace.revision = Math.max(1, Math.trunc(ctNum(terminal.trace.revision, 1))) + 1;
  terminal.updatedAt = ctNow();
  db.terminals[terminalId] = ctNormalizeTerminal(terminal);
  await ctSaveDB(db, { terminalId });
  game.socket.emit(CT_SOCKET, { op: "trace-reset", terminalId, revision: terminal.trace.revision });
  ui.notifications.info(`Reset all trace records for ${terminal.name}.`);
}

function ctContentTraceCost(terminal, db, view, id) {
  if (view === "email") return terminal.emails.find(item => item.id === id)?.traceCost || 0;
  if (view === "file") return terminal.files.find(item => item.id === id)?.traceCost || 0;
  if (view === "netpage") return db.netpages[id]?.traceCost || 0;
  return 0;
}

function ctTraceAlert(terminal, state, level) {
  game.socket.emit(CT_SOCKET, {
    op: "trace-alert",
    level,
    terminalId: terminal.id,
    terminalName: terminal.name,
    userId: game.user.id,
    userName: game.user.name,
    actorName: ctGetActor()?.name || "No Actor",
    sceneId: ctScene()?.id || "",
    sceneName: ctScene()?.name || "No active scene",
    progress: state.progress,
    maximum: terminal.trace.max,
    at: ctNow()
  });
}

async function ctResolveVehicle(entry) {
  const doc = entry.uuid ? await ctFromUuid(entry.uuid) : null;
  const raw = doc?.toObject?.() || (entry.raw ? ctClone(entry.raw) : null);
  if (!raw) return { ...entry, raw: null, available: false, description: "" };
  const system = raw.system || {};
  const display = value => {
    if (value == null || value === "") return null;
    if (typeof value === "object") {
      const current = value.value ?? value.current ?? value.max;
      const max = value.max;
      if (current != null && max != null && current !== max) return `${current} / ${max}`;
      return current ?? max ?? null;
    }
    return value;
  };
  return {
    ...entry,
    name: doc?.name || raw.name || entry.name,
    img: doc?.img || raw.img || entry.img,
    raw,
    available: true,
    brand: display(ctFirstValue(raw, ["system.brand", "system.manufacturer", "system.make", "system.vehicle.brand"])),
    sdp: display(ctFirstValue(raw, ["system.sdp", "system.sdp.value", "system.derivedStats.sdp", "system.vehicle.sdp"])),
    seats: display(ctFirstValue(raw, ["system.seats", "system.passengers", "system.vehicle.seats", "system.occupancy"])),
    combatMove: display(ctFirstValue(raw, ["system.combatMove", "system.move", "system.stats.move", "system.vehicle.move"])),
    narrativeSpeed: display(ctFirstValue(raw, ["system.narrativeSpeed", "system.speed", "system.vehicle.speed", "system.mph"])),
    description: String(ctFirstValue(raw, ["system.description.value", "system.description", "system.notes", "system.details.description"]) || "")
  };
}

async function ctEnrich(content) {
  let enriched = String(content || "");
  try {
    enriched = await TextEditor.enrichHTML(enriched, { async: true, secrets: game.user.isGM, links: false });
  } catch (_error) { /* keep the original body */ }
  return ctSecureTerminalHtml(enriched);
}

function ctSecureTerminalHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  for (const element of template.content.querySelectorAll("*")) {
    for (const attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
    }
    element.removeAttribute("target");
  }
  for (const element of template.content.querySelectorAll("area[href], link[href]")) element.removeAttribute("href");
  for (const element of template.content.querySelectorAll("form[action], [formaction]")) {
    element.removeAttribute("action");
    element.removeAttribute("formaction");
  }
  for (const element of template.content.querySelectorAll("meta[http-equiv]")) element.remove();
  for (const anchor of template.content.querySelectorAll("a")) {
    anchor.removeAttribute("rel");
    const foundryDocument = anchor.classList.contains("content-link") && (anchor.hasAttribute("data-uuid") || anchor.hasAttribute("data-id"));
    const foundryRoll = anchor.classList.contains("inline-roll") && (anchor.hasAttribute("data-formula") || anchor.hasAttribute("data-roll"));
    if (foundryDocument || foundryRoll) {
      anchor.removeAttribute("href");
      continue;
    }
    const href = String(anchor.getAttribute("href") || "").trim();
    const replacement = document.createElement("span");
    replacement.className = "citinet-inert-link";
    replacement.textContent = anchor.textContent || href;
    replacement.title = "Simulated CitiNet address — external navigation disabled";
    if (href) replacement.dataset.citinetAddress = href;
    anchor.replaceWith(replacement);
  }
  return template.innerHTML;
}

function ctPageTitle(kicker, title, subtitle = "") {
  return `<header class="citinet-page-title"><div class="citinet-kicker">${ctEsc(kicker)}</div><h2>${ctEsc(title)}</h2>${subtitle ? `<p>${ctEsc(subtitle)}</p>` : ""}</header>`;
}

function ctHeroHtml(item) {
  return item.image ? `<img class="citinet-hero" src="${ctEsc(item.image)}" data-image-src="${ctEsc(item.image)}" alt="${ctEsc(item.subject || item.title || "Terminal image")}">` : "";
}

function ctGalleryHtml(item, extraGallery = []) {
  const images = [...new Set([...(item.gallery || []), ...(extraGallery || [])].filter(Boolean))];
  return images.length ? `<div class="citinet-gallery">${images.map(src => `<img src="${ctEsc(src)}" data-image-src="${ctEsc(src)}" alt="Gallery image">`).join("")}</div>` : "";
}

function ctWeightedResult(results) {
  const total = results.reduce((sum, result) => sum + Math.max(1, ctNum(result.weight, 1)), 0);
  let pick = Math.random() * Math.max(1, total);
  for (const result of results) {
    pick -= Math.max(1, ctNum(result.weight, 1));
    if (pick <= 0) return result;
  }
  return results[results.length - 1] || null;
}

async function ctDrawRandomTable(table) {
  const normalized = ctNormalizeRandomTable(table);
  if (!normalized.uuid || !normalized.results.length) return { html: "", images: [] };
  const drawn = [];
  for (let index = 0; index < normalized.drawCount; index += 1) {
    let selected = null;
    try {
      const roll = await new Roll(normalized.formula || "1d20").evaluate({ async: true });
      const total = Math.trunc(ctNum(roll.total, 0));
      selected = normalized.results.find(result => result.range.length >= 2 && total >= result.range[0] && total <= result.range[1]) || null;
    } catch (error) {
      console.warn(`${CT_ID} | Could not evaluate snapshotted RollTable formula ${normalized.formula}`, error);
    }
    drawn.push(selected || ctWeightedResult(normalized.results));
  }
  const valid = drawn.filter(Boolean);
  const textBlocks = [];
  for (const result of valid) {
    if (result.text) textBlocks.push(`<div class="citinet-random-result">${await ctEnrich(result.text)}</div>`);
  }
  const images = valid.map(result => result.img).filter(Boolean);
  const html = textBlocks.length ? `<section class="citinet-random-data"><header><i class="fas fa-dice-d20"></i><span>RANDOMIZED DATA // ${ctEsc(normalized.name)}</span></header>${textBlocks.join("")}</section>` : "";
  return { html, images };
}

function ctShardSkillLabel(skill) {
  return skill === "electronics-security-tech" ? "Electronics/Security Tech" : "Basic Tech";
}

function ctShardExportHtml(item, kind, isNetrunner = false) {
  const config = ctNormalizeShardExport(item.shardExport);
  if (!config.enabled) return "";
  const requirement = isNetrunner && config.requireCheck
    ? "Memory Chip required // Interface bypasses DV"
    : config.requireCheck
      ? `Memory Chip required // ${ctShardSkillLabel(config.skill)} DV ${config.dv}`
      : "Memory Chip required // no skill check";
  return `<section class="citinet-shard-export"><div><i class="fas fa-microchip"></i><span>MEMORY CHIP OUTPUT</span><strong>${ctEsc(requirement)}</strong></div><button type="button" data-action="export-shard" data-kind="${ctEsc(kind)}" data-id="${ctEsc(item.id)}"><i class="fas fa-file-export"></i> Export to Shard</button></section>`;
}

function ctLockHtml(item, kind, gmPreview = false, isNetrunner = false) {
  const detail = gmPreview
    ? `GM Preview is simulating the player lock. Select a Netrunner Token before launching; a successful breach reveals this ${kind} only until this preview closes.`
    : isNetrunner
      ? `Authorized Netrunner access is required. A successful breach unlocks only this ${kind} for your user.`
      : `This ${kind} requires an authorized Netrunner. Other Roles may continue using the rest of the terminal.`;
  const action = gmPreview || isNetrunner
    ? `<button type="button" data-action="breach" data-kind="${kind}" data-id="${ctEsc(item.id)}"><i class="fas fa-code"></i> Initiate Hexcode Breach</button>`
    : `<p><strong>NETRUNNER ACCESS REQUIRED</strong></p>`;
  return `<div class="citinet-lock-screen"><div><i class="fas fa-lock"></i><h2>ENCRYPTED CONTENT</h2><p>${ctEsc(item.lockPuzzleName || "Hexcode Breach required")}</p><p>${ctEsc(detail)}</p>${action}</div></div>`;
}

class CitiNetPlayerApp extends Application {
  constructor(terminalId, options = {}) {
    const unique = options.forceNew ? `-${ctId()}` : "";
    super({ ...options, id: `citinet-terminal-${terminalId}${unique}` });
    this.terminalId = terminalId;
    this.gmPreview = Boolean(options.gmPreview && game.user.isGM);
    this.history = [];
    this.historyIndex = -1;
    this.purchasing = new Set();
    this.randomDraws = new Map();
    this.previewUnlocks = new Set();
    this.trace = null;
    this.actor = null;
    this.isNetrunner = false;
    this.traceAware = false;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "CitiNet Terminal",
      template: `modules/${CT_ID}/templates/player-terminal.hbs`,
      width: 940,
      height: 700,
      resizable: true,
      classes: ["citinet-terminal"]
    });
  }

  async getData() {
    this.db = await ctLoadDB();
    this.terminal = this.db.terminals[this.terminalId];
    if (!this.terminal) return { missing: true, bodyHtml: ctPageTitle("ERROR", "Terminal not found") };
    this.actor = ctGetActor();
    this.isNetrunner = ctIsNetrunner(this.actor);
    this.traceAware = this.gmPreview || this.isNetrunner;
    if (!this.history.length) {
      const startView = this._allowedStartView(this.terminal.startView);
      this.history = [{ view: startView, id: null }];
      this.historyIndex = 0;
    }
    this.trace = this.gmPreview
      ? { progress: 0, traced: false, warned: false }
      : ctTraceState(this.terminal);
    const current = this.history[this.historyIndex] || { view: "home", id: null };
    const traceLocked = this.terminal.trace.enabled && this.trace.traced && this.terminal.trace.lockOnFull && !this.gmPreview;
    const bodyHtml = traceLocked ? this._tracedHtml() : await this._buildBody(current.view, current.id);
    const reads = ctReadUserFlag(CT_READ_FLAG);
    const visibleEmails = this.terminal.emails.filter(item => item.published || game.user.isGM);
    const unreadCount = visibleEmails.filter(item => !reads[ctReadKey(this.terminal.id, "email", item.id)]).length;
    const navGroup = current.view === "email" ? "inbox" : current.view === "file" ? "files" : current.view === "netpage" ? "citinet" : current.view === "vehicle" ? "autofixer" : current.view;
    const maximum = this.terminal.trace.max;
    const hasCitinet = Boolean(this.terminal.enabled.citinet);
    const citinetOnline = hasCitinet && this.terminal.citinetMode === "online";
    const browsingCitinet = current.view === "citinet" || current.view === "netpage";
    return {
      terminal: { ...this.terminal, slug: ctSlug(this.terminal.name) },
      bodyHtml,
      route: this._route(current),
      canBack: this.historyIndex > 0,
      canForward: this.historyIndex < this.history.length - 1,
      nav: { home: navGroup === "home", inbox: navGroup === "inbox", files: navGroup === "files", citinet: navGroup === "citinet", autofixer: navGroup === "autofixer" },
      unreadCount,
      operatorName: this.actor?.name || game.user.name,
      trace: { ...this.terminal.trace, enabled: this.terminal.trace.enabled && this.traceAware, ...this.trace, percent: Math.round((this.trace.progress / maximum) * 100) },
      traced: traceLocked,
      addressScheme: browsingCitinet ? (citinetOnline ? "citinet" : "cache") : "local",
      connection: { online: citinetOnline, icon: citinetOnline ? "fa-signal" : (hasCitinet ? "fa-database" : "fa-hard-drive"), label: citinetOnline ? "ONLINE" : (hasCitinet ? "CACHED" : "LOCAL") },
      statusText: traceLocked
        ? (this.traceAware ? "TRACE COMPLETE // CONNECTION COMPROMISED" : "SESSION TERMINATED // SECURITY HANDSHAKE FAILED")
        : (this.gmPreview
          ? "GM PREVIEW // SECURITY SIMULATION"
          : (citinetOnline
            ? (this.traceAware ? "ROLEPLAY NET UPLINK // TRACE AWARE" : "ROLEPLAY NET UPLINK // ONLINE")
            : (hasCitinet ? (this.traceAware ? "LOCAL CACHE // NO CITINET TRACE" : "LOCAL CACHE") : "LOCAL TERMINAL SESSION"))),
      calendar: ctCalendarDisplay()
    };
  }

  _allowedStartView(requested) {
    const enabled = this.terminal.enabled;
    if (requested === "inbox" && enabled.inbox) return requested;
    if (requested === "files" && enabled.files) return requested;
    if (requested === "citinet" && enabled.citinet) return requested;
    if (requested === "autofixer" && enabled.autofixer) return requested;
    return "home";
  }

  _route(state) {
    if (!state?.id) return state?.view || "home";
    return `${state.view}/${state.id}`;
  }

  _tracedHtml() {
    if (!this.traceAware) {
      return `<div class="citinet-traced-screen is-obscured"><div><i class="fas fa-plug-circle-xmark"></i><h2>CONNECTION TERMINATED</h2><p>The terminal closed the session after a security handshake failure. Reconnect later or contact the local administrator.</p></div></div>`;
    }
    return `<div class="citinet-traced-screen"><div><i class="fas fa-crosshairs"></i><h2>TRACE COMPLETE</h2><p>This terminal session has been identified and locked. The Gamemaster must reset this terminal's trace records before access can resume.</p></div></div>`;
  }

  _isContentUnlocked(kind, item) {
    if (!item?.lockPuzzleId) return true;
    if (this.gmPreview) return this.previewUnlocks.has(ctUnlockKey(this.terminal, kind, item));
    if (game.user.isGM) return true;
    this.actor = ctGetActor();
    this.isNetrunner = ctIsNetrunner(this.actor);
    if (!this.isNetrunner) return false;
    return ctIsUnlocked(this.terminal, kind, item);
  }

  _hasLiveTrace() {
    if (this.gmPreview || !this.terminal?.trace?.enabled) return false;
    this.actor = ctGetActor();
    this.isNetrunner = ctIsNetrunner(this.actor);
    this.traceAware = this.isNetrunner;
    return true;
  }

  _isTraceLocked() {
    if (!this._hasLiveTrace() || !this.terminal.trace.lockOnFull) return false;
    this.trace = ctTraceState(this.terminal);
    return this.trace.traced;
  }

  async _buildBody(view, id) {
    if (view === "home") return this._homeHtml();
    if (view === "inbox") return this._inboxHtml();
    if (view === "email") return this._emailHtml(id);
    if (view === "files") return this._filesHtml();
    if (view === "file") return this._fileHtml(id);
    if (view === "citinet") return this._citinetHtml();
    if (view === "netpage") return this._netpageHtml(id);
    if (view === "autofixer") return this._autofixerHtml();
    if (view === "vehicle") return this._vehicleHtml(id);
    return this._homeHtml();
  }

  _homeHtml() {
    const terminal = this.terminal;
    const tiles = [];
    if (terminal.enabled.inbox) tiles.push(["inbox", "fa-envelope", "Inbox", `${terminal.emails.filter(item => item.published || game.user.isGM).length} local messages`]);
    if (terminal.enabled.files) tiles.push(["files", "fa-folder-open", "Local Files", `${terminal.files.filter(item => item.published || game.user.isGM).length} indexed files`]);
    if (terminal.enabled.citinet) tiles.push(["citinet", "fa-globe", "CitiNet", `${this.db.netpageOrder.filter(id => this.db.netpages[id]?.published || game.user.isGM).length} ${terminal.citinetMode === "online" ? "online" : "cached"} netpages`]);
    if (terminal.enabled.autofixer) tiles.push(["autofixer", "fa-car-side", "Autofixer", `${terminal.vehicles.length} vehicles available`]);
    return `${ctPageTitle("LOCAL TERMINAL", "Home", terminal.subtitle)}<div class="citinet-home-grid">${tiles.map(([view, icon, title, subtitle]) => `<article class="citinet-home-tile" data-nav-view="${view}"><i class="fas ${icon}"></i><div><strong>${ctEsc(title)}</strong><span>${ctEsc(subtitle)}</span></div></article>`).join("") || `<div class="citinet-empty">This terminal has no enabled sections.</div>`}</div>`;
  }

  _inboxHtml() {
    const reads = ctReadUserFlag(CT_READ_FLAG);
    const emails = this.terminal.emails.filter(item => item.published || game.user.isGM);
    const list = emails.map(item => {
      const locked = !this._isContentUnlocked("email", item);
      const unread = !reads[ctReadKey(this.terminal.id, "email", item.id)];
      const icon = locked ? "fa-lock" : unread ? "fa-envelope" : "fa-envelope-open-text";
      return `<article class="citinet-list-card ${locked ? "is-locked" : ""} ${unread ? "is-unread" : "is-read"}" data-nav-view="email" data-nav-id="${ctEsc(item.id)}"><i class="fas ${icon}"></i><div><strong>${ctEsc(item.subject)}</strong><small>${ctEsc(item.from)} → ${ctEsc(item.to)}</small></div><div class="citinet-mail-state"><b>${unread ? "UNREAD" : "READ"}</b><time>${ctEsc(item.date || "LOCAL")}</time></div></article>`;
    }).join("");
    return `${ctPageTitle("LOCAL MAIL", "Inbox", `${emails.length} message${emails.length === 1 ? "" : "s"}`)}<div class="citinet-list">${list || `<div class="citinet-empty">Inbox empty.</div>`}</div>`;
  }

  async _emailHtml(id) {
    const item = this.terminal.emails.find(entry => entry.id === id && (entry.published || game.user.isGM));
    if (!item) return `${ctPageTitle("LOCAL MAIL", "Message unavailable")}<div class="citinet-empty">The requested email does not exist.</div>`;
    if (!this._isContentUnlocked("email", item)) return ctLockHtml(item, "email", this.gmPreview, this.isNetrunner);
    if (!game.user.isGM) await ctMarkRead(this.terminal.id, "email", item.id);
    const readControls = this.gmPreview
      ? `<div class="citinet-read-controls is-preview"><span><i class="fas fa-eye"></i> GM PREVIEW // a player opening this email marks it READ</span></div>`
      : `<div class="citinet-read-controls"><span><i class="fas fa-envelope-open-text"></i> READ</span>${this.isNetrunner ? `<button type="button" data-action="mark-unread" data-id="${ctEsc(item.id)}"><i class="fas fa-envelope"></i> Mark Unread</button>` : ""}</div>`;
    return `<article class="citinet-article">${ctPageTitle("MESSAGE", item.subject, item.date)}<div class="citinet-article-meta"><span>From</span><strong>${ctEsc(item.from)}</strong><span>To</span><strong>${ctEsc(item.to)}</strong></div>${readControls}${ctHeroHtml(item)}<div class="citinet-richtext">${await ctEnrich(item.body)}</div>${ctGalleryHtml(item)}${ctShardExportHtml(item, "email", this.isNetrunner)}</article>`;
  }

  _filesHtml() {
    const files = this.terminal.files.filter(item => item.published || game.user.isGM);
    const list = files.map(item => {
      const locked = !this._isContentUnlocked("file", item);
      return `<article class="citinet-list-card ${locked ? "is-locked" : ""}" data-nav-view="file" data-nav-id="${ctEsc(item.id)}"><i class="fas ${locked ? "fa-lock" : "fa-file-lines"}"></i><div><strong>${ctEsc(item.title)}</strong><small>${ctEsc(item.fileType)} // ID ${ctEsc(item.id)}</small></div><time>${ctEsc(item.date || "LOCAL")}</time></article>`;
    }).join("");
    return `${ctPageTitle("LOCAL STORAGE", "Files", `${files.length} indexed object${files.length === 1 ? "" : "s"}`)}<div class="citinet-list">${list || `<div class="citinet-empty">No local files.</div>`}</div>`;
  }

  async _fileHtml(id) {
    const item = this.terminal.files.find(entry => entry.id === id && (entry.published || game.user.isGM));
    if (!item) return `${ctPageTitle("LOCAL STORAGE", "File unavailable")}<div class="citinet-empty">The requested file does not exist.</div>`;
    if (!this._isContentUnlocked("file", item)) return ctLockHtml(item, "file", this.gmPreview, this.isNetrunner);
    if (!game.user.isGM) await ctMarkRead(this.terminal.id, "file", item.id);
    if (!this.randomDraws.has(item.id)) this.randomDraws.set(item.id, await ctDrawRandomTable(item.randomTable));
    const random = this.randomDraws.get(item.id) || { html: "", images: [] };
    return `<article class="citinet-article">${ctPageTitle(item.fileType, item.title, item.date)}${ctHeroHtml(item)}<div class="citinet-richtext">${await ctEnrich(item.body)}</div>${random.html}${ctGalleryHtml(item, random.images)}${ctShardExportHtml(item, "file", this.isNetrunner)}</article>`;
  }

  _citinetHtml() {
    const pages = this.db.netpageOrder.map(id => this.db.netpages[id]).filter(page => page && (page.published || game.user.isGM));
    const online = this.terminal.citinetMode === "online";
    const list = pages.map(page => `<article class="citinet-list-card citinet-netpage-card" data-nav-view="netpage" data-nav-id="${ctEsc(page.id)}">${page.image ? `<img class="citinet-list-thumb" src="${ctEsc(page.image)}" alt="${ctEsc(page.title)}">` : `<i class="fas fa-globe"></i>`}<div><strong>${ctEsc(page.title)}</strong><small>${ctEsc(page.excerpt || page.category)}</small></div><time>${ctEsc(page.category)}</time></article>`).join("");
    return `${ctPageTitle(online ? "CITINET UPLINK" : "CACHED NETWORK", "CitiNet", online ? "Simulated live CitiNet connection — terminal trace rules apply" : "Offline local netpages — CitiNet browsing adds no trace") }<div class="citinet-list">${list || `<div class="citinet-empty">No CitiNet pages are published.</div>`}</div>`;
  }

  async _netpageHtml(id) {
    const item = this.db.netpages[id];
    if (!item || (!item.published && !game.user.isGM)) return `${ctPageTitle("CITINET", "Page unavailable")}<div class="citinet-empty">The cached page could not be resolved.</div>`;
    return `<article class="citinet-article">${ctPageTitle(item.category, item.title, item.excerpt)}${ctHeroHtml(item)}<div class="citinet-richtext">${await ctEnrich(item.body)}</div>${ctGalleryHtml(item)}${ctShardExportHtml(item, "netpage", this.isNetrunner)}</article>`;
  }

  async _autofixerHtml() {
    const vehicles = await Promise.all(this.terminal.vehicles.map(ctResolveVehicle));
    const cards = vehicles.map(vehicle => `<article class="citinet-vehicle-card" data-nav-view="vehicle" data-nav-id="${ctEsc(vehicle.id)}"><img src="${ctEsc(vehicle.img)}" alt="${ctEsc(vehicle.name)}"><div><h3>${ctEsc(vehicle.name)}</h3><div class="citinet-price">${vehicle.price.toLocaleString()} eb</div><p>${ctEsc(vehicle.brand || (vehicle.available ? "Vehicle Item ready" : "Source missing — snapshot unavailable"))}</p></div></article>`).join("");
    return `${ctPageTitle("AUTHORIZED VEHICLE SALES", "Autofixer", "Immediate payment // direct Vehicle Item transfer")}<div class="citinet-vehicle-grid">${cards || `<div class="citinet-empty">No vehicles are listed.</div>`}</div>`;
  }

  async _vehicleHtml(id) {
    const entry = this.terminal.vehicles.find(vehicle => vehicle.id === id);
    if (!entry) return `${ctPageTitle("AUTOFIXER", "Vehicle unavailable")}<div class="citinet-empty">The selected vehicle is no longer listed.</div>`;
    const vehicle = await ctResolveVehicle(entry);
    const stats = [["Brand", vehicle.brand], ["SDP / HP", vehicle.sdp], ["Seats", vehicle.seats], ["Combat MOVE", vehicle.combatMove], ["Narrative Speed", vehicle.narrativeSpeed]].filter(([, value]) => value != null);
    return `<article class="citinet-article">${ctPageTitle("AUTOFIXER LISTING", vehicle.name, `${vehicle.price.toLocaleString()} eb`)}<div class="citinet-vehicle-detail"><img src="${ctEsc(vehicle.img)}" data-image-src="${ctEsc(vehicle.img)}" alt="${ctEsc(vehicle.name)}"><div><div class="citinet-stat-grid">${stats.map(([label, value]) => `<div><span>${ctEsc(label)}</span><strong>${ctEsc(value)}</strong></div>`).join("") || `<div><span>Item Data</span><strong>Open listing</strong></div>`}</div><div class="citinet-richtext">${await ctEnrich(vehicle.description)}</div><button type="button" class="citinet-purchase" data-action="purchase" data-id="${ctEsc(vehicle.id)}" ${vehicle.available ? "" : "disabled"}><i class="fas fa-credit-card"></i> Pay ${vehicle.price.toLocaleString()} eb &amp; Receive Vehicle Item</button></div></div></article>`;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.on("click auxclick", ".citinet-body a", event => {
      const anchor = event.currentTarget;
      const foundryDocument = anchor.classList.contains("content-link") && (anchor.hasAttribute("data-uuid") || anchor.hasAttribute("data-id"));
      const foundryRoll = anchor.classList.contains("inline-roll") && (anchor.hasAttribute("data-formula") || anchor.hasAttribute("data-roll"));
      if (foundryDocument || foundryRoll) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      ui.notifications.info("External navigation is disabled. CitiNet Terminal is a simulated network.");
    });
    html.on("click", "[data-nav-view]", event => {
      event.preventDefault();
      const target = event.currentTarget;
      this.navigate(target.dataset.navView, target.dataset.navId || null);
    });
    html.on("click", "[data-action]", event => this._onAction(event));
    html.on("click", "[data-image-src]", event => {
      const src = event.currentTarget.dataset.imageSrc;
      if (src) new ImagePopout(src, { title: event.currentTarget.alt || this.terminal.name }).render(true);
    });
  }

  async _onAction(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    if (action === "back") return this.goHistory(-1);
    if (action === "forward") return this.goHistory(1);
    if (action === "home") return this.navigate("home", null);
    if (action === "breach") return ctStartBreach(this, event.currentTarget.dataset.kind, event.currentTarget.dataset.id);
    if (action === "mark-unread") return this.markEmailUnread(event.currentTarget.dataset.id);
    if (action === "export-shard") return this.exportToShard(event.currentTarget.dataset.kind, event.currentTarget.dataset.id);
    if (action === "purchase") return this.purchaseVehicle(event.currentTarget.dataset.id, event.currentTarget);
  }

  async navigate(view, id = null) {
    if (!this.terminal) return;
    if (this._isTraceLocked()) {
      return ui.notifications.warn(this.traceAware ? "TRACE COMPLETE — this terminal is locked." : "CONNECTION TERMINATED — this session is locked.");
    }
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({ view, id });
    this.historyIndex = this.history.length - 1;
    await this._applyTrace(view, id);
    return this.render(false);
  }

  async goHistory(delta) {
    const next = this.historyIndex + delta;
    if (next < 0 || next >= this.history.length) return;
    if (this._isTraceLocked()) {
      return ui.notifications.warn(this.traceAware ? "TRACE COMPLETE — this terminal is locked." : "CONNECTION TERMINATED — this session is locked.");
    }
    this.historyIndex = next;
    const state = this.history[this.historyIndex];
    await this._applyTrace(state.view, state.id);
    return this.render(false);
  }

  async _applyTrace(view, id) {
    if (!this._hasLiveTrace()) return;
    if ((view === "citinet" || view === "netpage") && this.terminal.citinetMode !== "online") return;
    const state = ctTraceState(this.terminal);
    if (state.traced) { this.trace = state; return; }
    const previous = state.progress;
    const cost = this.terminal.trace.baseCost + ctContentTraceCost(this.terminal, this.db, view, id);
    state.progress = Math.min(this.terminal.trace.max, previous + Math.max(0, cost));
    const crossedWarning = !state.warned && this.terminal.trace.warnAt > 0 && previous < this.terminal.trace.warnAt && state.progress >= this.terminal.trace.warnAt;
    const crossedFull = previous < this.terminal.trace.max && state.progress >= this.terminal.trace.max;
    if (crossedWarning) {
      state.warned = true;
      if (this.traceAware) ui.notifications.warn(`TRACE WARNING — ${state.progress}/${this.terminal.trace.max}`);
      ctTraceAlert(this.terminal, state, "warning");
    }
    if (crossedFull) {
      state.traced = true;
      ui.notifications.error(this.traceAware ? "TRACE COMPLETE — CONNECTION COMPROMISED" : "CONNECTION TERMINATED — SESSION LOCKED");
      ctTraceAlert(this.terminal, state, "complete");
    }
    await ctStoreTraceState(this.terminal, state);
    this.trace = state;
  }

  async markEmailUnread(emailId) {
    const actor = ctGetActor();
    if (!ctIsNetrunner(actor)) return ui.notifications.warn("Only a Netrunner can deliberately restore an email's unread state.");
    const item = this.terminal?.emails.find(email => email.id === emailId && (email.published || game.user.isGM));
    if (!item) return ui.notifications.warn("That email is no longer available.");
    await ctMarkUnread(this.terminal.id, "email", item.id);
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({ view: "inbox", id: null });
    this.historyIndex = this.history.length - 1;
    ui.notifications.info(`${item.subject} marked unread.`);
    return this.render(false);
  }

  async exportToShard(kind, itemId) {
    const db = await ctLoadDB();
    const terminal = db.terminals[this.terminalId];
    if (!terminal) return ui.notifications.warn("This terminal is no longer available.");
    let item = null;
    if (kind === "email") item = terminal.emails.find(entry => entry.id === itemId);
    if (kind === "file") item = terminal.files.find(entry => entry.id === itemId);
    if (kind === "netpage") item = db.netpages[itemId];
    if (!item || (!item.published && !game.user.isGM)) return ui.notifications.warn("That content is no longer available.");
    if (item.lockPuzzleId && !this._isContentUnlocked(kind, item)) {
      return ui.notifications.warn("This content must be unlocked by an authorized Netrunner through Hexcode Breach before it can be exported.");
    }
    const config = ctNormalizeShardExport(item.shardExport);
    if (!config.enabled) return ui.notifications.warn("Shard export is disabled for this content.");
    const actor = ctGetActor();
    if (!actor) return ui.notifications.warn("Select a Token or assign a Player Character before exporting.");
    const memoryChip = ctMemoryChipState(actor);
    if (!memoryChip.ready) return ui.notifications.warn(memoryChip.warning);
    const isNetrunner = ctIsNetrunner(actor);
    const bypassedCheck = config.requireCheck && isNetrunner;
    const title = item.subject || item.title || "Terminal Data";
    const typeLabel = kind === "email" ? "EMAIL" : kind === "file" ? "LOCAL FILE" : "CITINET PAGE";
    const pendingCheck = config.requireCheck && !isNetrunner;
    const status = pendingCheck ? "MANUAL CHECK REQUIRED" : "EXPORT COMPLETE";
    const statusClass = pendingCheck ? "is-pending" : "is-success";
    const detail = bypassedCheck
      ? "Netrunner Interface bypassed the transfer DV. Data copied to the Shard."
      : pendingCheck
        ? `Roll ${ctShardSkillLabel(config.skill)} manually. DV ${config.dv} is required for a successful copy to the Shard.`
        : "No skill check was required. Data copied to the Shard.";
    const badge = bypassedCheck
      ? `<span><i class="fas fa-code"></i> NETRUNNER BYPASS</span>`
      : pendingCheck
        ? `<span><i class="fas fa-dice-d10"></i> ${ctEsc(ctShardSkillLabel(config.skill))} DV ${config.dv}</span>`
        : `<span><i class="fas fa-check"></i> NO CHECK</span>`;
    const chipBadge = `<span><i class="fas fa-microchip"></i> CHIP ${ctEsc(memoryChip.state.toUpperCase())}</span>`;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="citinet-chat-card citinet-shard-chat ${statusClass}"><header><div><span>MEMORY CHIP OUTPUT // ${ctEsc(typeLabel)}</span><h3>${ctEsc(title)}</h3></div><i class="fas fa-microchip"></i></header><div class="citinet-chat-status">${ctEsc(status)}</div><p><b>${ctEsc(actor.name)}</b> accessed <b>${ctEsc(terminal.name)}</b>.</p><p>${ctEsc(detail)}</p><footer>${chipBadge}${badge}</footer></div>`
    });
    ui.notifications[pendingCheck ? "warn" : "info"](pendingCheck ? `${ctShardSkillLabel(config.skill)} DV ${config.dv} posted to chat.` : `${title} exported to Shard.`);
  }

  async purchaseVehicle(vehicleId, button) {
    if (this.purchasing.has(vehicleId)) return;
    const actor = ctGetActor();
    if (!actor) return ui.notifications.warn("Select a Token or assign a Player Character before purchasing.");
    if (!actor.isOwner) return ui.notifications.warn(`You do not own ${actor.name}.`);
    const db = await ctLoadDB();
    const terminal = db.terminals[this.terminalId];
    const entry = terminal?.vehicles.find(vehicle => vehicle.id === vehicleId);
    if (!entry) return ui.notifications.warn("That vehicle is no longer listed.");
    const vehicle = await ctResolveVehicle(entry);
    if (!vehicle.available || !vehicle.raw) return ui.notifications.warn("The Vehicle Item source and saved snapshot are unavailable.");
    const cost = Math.max(0, Math.trunc(entry.price));
    const funds = ctNum(actor.system?.wealth?.value, 0);
    if (cost > funds) return ui.notifications.warn(`${actor.name} cannot afford ${vehicle.name} (${cost.toLocaleString()} eb).`);
    this.purchasing.add(vehicleId);
    if (button) button.disabled = true;
    let paid = false;
    try {
      if (cost > 0) {
        await ctAdjustWealth(actor, -cost, `Autofixer: ${vehicle.name}`);
        paid = true;
      }
      const itemData = ctClone(vehicle.raw);
      delete itemData._id;
      await actor.createEmbeddedDocuments("Item", [itemData]);
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="citinet-chat-card"><b>${ctEsc(terminal.name)}</b>: <b>${ctEsc(actor.name)}</b> purchased <i>${ctEsc(vehicle.name)}</i> for <b>${cost.toLocaleString()} eb</b>.<br><b>El Capitán</b> from Autofixer will be in touch to arrange delivery of your preem new ride, choom!</div>`
      });
      ui.notifications.info(`Purchase confirmed — El Capitán will arrange delivery of ${vehicle.name}.`);
    } catch (error) {
      console.error(`${CT_ID} | Vehicle purchase failed`, error);
      if (paid) {
        try { await ctAdjustWealth(actor, cost, `Autofixer Refund: ${vehicle.name}`); }
        catch (refundError) { console.error(`${CT_ID} | Automatic refund failed`, refundError); ui.notifications.error("Purchase and automatic refund failed. The GM must correct the Actor ledger."); }
      }
      ui.notifications.error("Vehicle purchase failed. Payment was refunded when possible.");
    } finally {
      this.purchasing.delete(vehicleId);
      if (button) button.disabled = false;
    }
  }

  async close(options) {
    const result = await super.close(options);
    if (ctPlayerApps.get(this.terminalId) === this) ctPlayerApps.delete(this.terminalId);
    return result;
  }
}

async function ctStartBreach(playerApp, kind, itemId) {
  const terminal = playerApp.terminal;
  const list = kind === "email" ? terminal.emails : kind === "file" ? terminal.files : [];
  const item = list.find(entry => entry.id === itemId);
  if (!item?.lockPuzzleId) return ui.notifications.warn("This content has no Hexcode lock.");
  if (playerApp._isContentUnlocked(kind, item)) return playerApp.render(false);
  const scene = ctScene();
  if (item.lockSceneId && scene?.id !== item.lockSceneId) return ui.notifications.warn(`This lock belongs to ${game.scenes.get(item.lockSceneId)?.name || "a different scene"}.`);
  const module = game.modules.get(CT_HBL_ID);
  const api = module?.active ? module.api : null;
  if (!api?.openPuzzle) return ui.notifications.warn("Hexcode Breach Lite v1.0.0 is not active.");
  const actor = ctGetActor();
  if (!actor) return ui.notifications.warn("Select the triggering Netrunner's Token or assign a Player Character.");
  if (!ctIsNetrunner(actor)) {
    const message = playerApp.gmPreview
      ? "GM Preview is simulating live security. Select a Netrunner Token or assign a Netrunner Character before launching Hexcode Breach."
      : "Only an Actor with the Netrunner Role or Interface Role Ability can initiate Hexcode Breach.";
    return ui.notifications.warn(message);
  }
  const breachApp = await api.openPuzzle(item.lockPuzzleId, { actor });
  if (!breachApp) return null;
  ctPendingBreaches.set(breachApp, { playerApp, terminalId: terminal.id, kind, itemId, puzzleId: item.lockPuzzleId, userId: game.user.id, gmPreview: playerApp.gmPreview });
  return breachApp;
}

async function ctOpenTerminal(terminalId, options = {}) {
  const db = await ctLoadDB();
  const terminal = db.terminals[terminalId];
  if (!terminal) return ui.notifications.warn(`CitiNet terminal not found: ${terminalId}`);
  const sceneId = ctScene()?.id || "";
  if (terminal.sceneOnly && terminal.sceneId && terminal.sceneId !== sceneId && !game.user.isGM) return ui.notifications.warn("This terminal is not available on the active scene.");
  if (!options.forceNew) {
    const existing = ctPlayerApps.get(terminalId);
    if (existing?.rendered) {
      existing.bringToTop();
      existing.render(false);
      return existing;
    }
  }
  const app = new CitiNetPlayerApp(terminalId, options);
  if (!options.forceNew) ctPlayerApps.set(terminalId, app);
  return app.render(true);
}

async function ctResolveTileDocument(value) {
  if (!value) return null;
  if (value.documentName === "Tile") return value;
  if (value.document?.documentName === "Tile") return value.document;
  if (value.object?.documentName === "Tile") return value.object;
  if (value.object?.document?.documentName === "Tile") return value.object.document;
  const uuid = typeof value === "string" ? value : value.uuid;
  if (uuid) {
    const doc = await ctFromUuid(uuid);
    if (doc?.documentName === "Tile") return doc;
  }
  const id = typeof value === "string" ? value : value.id ?? value._id;
  return id ? ctScene()?.tiles?.get(id) || null : null;
}

async function ctFindTriggerTile(context) {
  const roots = Array.isArray(context) ? context : [context];
  const queue = roots.map(value => ({ value, depth: 0 }));
  const seen = new Set();
  const directTileKeys = ["tile", "tileDocument", "triggeringTile", "triggerTile", "sourceTile", "originTile"];
  const nestedContextKeys = [
    "args", "context", "payload", "data", "value", "action", "trigger", "origin", "event", "result", "options",
    "method", "scope", "document", "entity", "object", "token", "tokens", "actor"
  ];
  let fallbackTile = null;
  let inspected = 0;
  while (queue.length && inspected < 300) {
    const { value: candidate, depth } = queue.shift();
    if (!candidate) continue;
    inspected += 1;
    if (Array.isArray(candidate)) {
      if (depth < 8) queue.unshift(...candidate.map(value => ({ value, depth: depth + 1 })));
      continue;
    }
    if (typeof candidate === "object") {
      if (seen.has(candidate)) continue;
      seen.add(candidate);
    }
    const tile = await ctResolveTileDocument(candidate);
    if (tile) {
      fallbackTile ||= tile;
      if (tile.getFlag?.(CT_ID, CT_BINDING_FLAG)?.terminalId) return tile;
    }
    if (typeof candidate !== "object" || depth >= 8) continue;

    const queuedKeys = new Set();
    const enqueue = (key, prioritize = false) => {
      if (queuedKeys.has(key)) return;
      let nested;
      try { nested = candidate[key]; }
      catch (_error) { return; }
      if (nested == null) return;
      queuedKeys.add(key);
      const entry = { value: nested, depth: depth + 1 };
      if (prioritize) queue.unshift(entry);
      else queue.push(entry);
    };
    for (let index = directTileKeys.length - 1; index >= 0; index -= 1) enqueue(directTileKeys[index], true);
    for (const key of nestedContextKeys) enqueue(key);
    try { for (const key of Object.keys(candidate)) enqueue(key); }
    catch (_error) { /* Some Foundry/MATT proxies do not expose enumerable keys. */ }
  }
  return fallbackTile || ctSelectedTiles()[0] || null;
}

function ctExplicitTerminalId(input, db, depth = 0, seen = new Set()) {
  if (input == null || depth > 8) return null;
  if (typeof input === "string") {
    const match = input.match(/terminalId\s*=\s*([^,;]+)/i);
    const value = String(match?.[1] || input).replace(/[<>"'()\[\]\s]/g, "");
    return db.terminals[value] ? value : null;
  }
  if (Array.isArray(input)) {
    for (const entry of input) {
      const found = ctExplicitTerminalId(entry, db, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }
  if (typeof input === "object") {
    if (seen.has(input)) return null;
    seen.add(input);
    const direct = input.terminalId ?? input.citinetTerminalId;
    if (direct && db.terminals[String(direct)]) return String(direct);
    for (const key of ["args", "context", "payload", "data", "value", "action"]) {
      if (input[key] == null) continue;
      const found = ctExplicitTerminalId(input[key], db, depth + 1, seen);
      if (found) return found;
    }
  }
  return null;
}

async function ctOpenFromArgs(args = null) {
  const db = await ctLoadDB();
  const explicit = ctExplicitTerminalId(args, db);
  if (explicit) return ctOpenTerminal(explicit);
  const tile = await ctFindTriggerTile(args);
  const binding = tile?.getFlag?.(CT_ID, CT_BINDING_FLAG);
  if (binding?.terminalId) {
    if (binding.sceneId && binding.sceneId !== ctScene()?.id) return ui.notifications.warn("This terminal Tile belongs to a different scene.");
    return ctOpenTerminal(binding.terminalId);
  }
  if (game.user.isGM) return ctOpenManager();
  return ui.notifications.warn("CitiNet Terminal could not identify a bound Tile.");
}

async function ctCreateHelperMacro() {
  if (!game.user.isGM) return ui.notifications.warn("Only the GM can create the CitiNet helper macro.");
  const name = "CitiNet Terminal — Open Bound Tile";
  const command = `return game.citinet({
  args: typeof args === "undefined" ? null : args,
  tile: typeof tile === "undefined" ? null : tile,
  token: typeof token === "undefined" ? null : token,
  actor: typeof actor === "undefined" ? null : actor
});`;
  let macro = game.macros.getName(name);
  const img = `modules/${CT_ID}/assets/citinet-terminal.svg`;
  if (macro) await macro.update({ type: "script", command, img });
  else macro = await Macro.create({ name, type: "script", command, img, flags: { [CT_ID]: { launcher: true } } });
  ui.notifications.info(`${macro?.name || name} is ready.`);
  macro?.sheet?.render(true);
  return macro;
}

function ctPrimaryActiveGM() {
  return (game.users || []).filter(user => user.active && user.isGM).sort((a, b) => String(a.id).localeCompare(String(b.id)))[0] || null;
}

async function ctHandleTraceAlert(message) {
  if (!game.user.isGM || ctPrimaryActiveGM()?.id !== game.user.id) return;
  const gmIds = (game.users || []).filter(user => user.active && user.isGM).map(user => user.id);
  const complete = message.level === "complete";
  const heading = complete ? "TRACE COMPLETE" : "TRACE WARNING";
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "CitiNet Traceback" }),
    whisper: gmIds,
    content: `<div class="citinet-chat-card"><h3>${heading}</h3><p><b>${ctEsc(message.userName)}</b> as <b>${ctEsc(message.actorName)}</b> accessed <b>${ctEsc(message.terminalName)}</b> on <b>${ctEsc(message.sceneName)}</b>.</p><p>Trace: <b>${Math.trunc(ctNum(message.progress, 0))} / ${Math.trunc(ctNum(message.maximum, 100))}</b></p></div>`
  });
  ui.notifications[complete ? "error" : "warn"](`${heading}: ${message.terminalName} // ${message.userName}`);
}

function ctBindSocket() {
  if (game.socket._citinetTerminalBound === CT_VERSION) return;
  game.socket.on(CT_SOCKET, message => {
    if (!message) return;
    if (message.op === "refresh") ctRefreshOpenWindows(message.terminalId || null);
    if (message.op === "trace-reset") {
      ctRefreshOpenWindows(message.terminalId || null);
      if (!game.user.isGM) ui.notifications.info("The GM reset this terminal's trace record.");
    }
    if (message.op === "trace-alert") ctHandleTraceAlert(message);
  });
  game.socket._citinetTerminalBound = CT_VERSION;
}

function ctRefreshOpenWindows(terminalId = null, { skipEditor = false } = {}) {
  ctManagerApp?.rendered && ctManagerApp.render(false);
  if (!skipEditor && ctEditorApp?.rendered && (!terminalId || ctEditorApp.terminalId === terminalId)) {
    ctEditorApp.terminal = null;
    ctEditorApp.render(false);
  }
  for (const [id, app] of ctPlayerApps) if (app.rendered && (!terminalId || id === terminalId)) app.render(false);
}

function ctRefreshCalendarDisplays() {
  const calendar = ctCalendarDisplay();
  for (const app of ctPlayerApps.values()) {
    if (!app.rendered) continue;
    const root = app.element?.[0] || app.element;
    const clock = root?.querySelector?.(".citinet-calendar");
    const label = clock?.querySelector?.("[data-calendar-display]");
    if (!clock || !label) {
      app.render(false);
      continue;
    }
    clock.classList.toggle("is-offline", !calendar.ready);
    label.textContent = calendar.display;
  }
}

function ctBindCalendarHooks() {
  if (ctCalendarHookBound) return true;
  const calendar = ctSimpleCalendar();
  if (!calendar) return false;
  const hookName = calendar.Hooks?.DateTimeChange || "simple-calendar-date-time-change";
  Hooks.on(hookName, ctRefreshCalendarDisplays);
  ctCalendarHookBound = true;
  ctRefreshCalendarDisplays();
  return true;
}

Hooks.once("init", () => {
  ctRegisterSettings();
});

Hooks.once("ready", () => {
  ctBindSocket();
  if (!ctBindCalendarHooks()) Hooks.once("simple-calendar-ready", ctBindCalendarHooks);
  const api = {
    version: CT_VERSION,
    openManager: ctOpenManager,
    openEditor: ctOpenEditor,
    openTerminal: ctOpenTerminal,
    openFromArgs: ctOpenFromArgs,
    bindSelectedTiles: ctBindSelectedTiles,
    createHelperMacro: ctCreateHelperMacro,
    loadDB: ctLoadDB,
    saveDB: ctSaveDB
  };
  const module = game.modules.get(CT_ID);
  if (module) module.api = api;
  game.citinetTerminal = api;
  game.citinet = args => ctOpenFromArgs(args);
  globalThis.CitiNetTerminal = api;
  console.log(`${CT_ID} | Ready v${CT_VERSION}. Use game.citinet(args).`);
});

Hooks.on("getSceneControlButtons", controls => {
  if (!game.user.isGM) return;
  const tokenControls = controls.find(control => control.name === "token");
  if (!tokenControls) return;
  tokenControls.tools ||= [];
  if (tokenControls.tools.some(tool => tool.name === "citinet-terminal-manager")) return;
  tokenControls.tools.push({
    name: "citinet-terminal-manager",
    title: "CitiNet Terminal Manager",
    icon: "fas fa-terminal",
    button: true,
    visible: true,
    onClick: ctOpenManager
  });
});

Hooks.on("closeHBLPlayerApp", async breachApp => {
  const pending = ctPendingBreaches.get(breachApp);
  if (!pending || pending.userId !== game.user.id) return;
  ctPendingBreaches.delete(breachApp);
  const successful = Boolean(breachApp.finished && breachApp.puzzle?.id === pending.puzzleId && breachApp.puzzle?.sequences?.some(sequence => sequence.solved));
  if (!successful) return;
  const db = await ctLoadDB();
  const terminal = db.terminals[pending.terminalId];
  const list = pending.kind === "email" ? terminal?.emails : terminal?.files;
  const item = list?.find(entry => entry.id === pending.itemId && entry.lockPuzzleId === pending.puzzleId);
  if (!terminal || !item) return ui.notifications.warn("Breach succeeded, but the protected content or its lock changed.");
  if (pending.gmPreview) {
    pending.playerApp?.previewUnlocks?.add(ctUnlockKey(terminal, pending.kind, item));
    ui.notifications.info(`${item.subject || item.title} unlocked for this GM Preview session.`);
  } else {
    await ctGrantUnlock(terminal, pending.kind, item);
    ui.notifications.info(`${item.subject || item.title} unlocked for ${game.user.name}.`);
  }
  pending.playerApp?.rendered && pending.playerApp.render(false);
});

Hooks.on("deleteTile", tile => {
  if (tile.getFlag?.(CT_ID, CT_BINDING_FLAG)) ctRefreshOpenWindows();
});

Hooks.on("updateTile", (_tile, changes) => {
  if (changes?.flags?.[CT_ID] !== undefined) ctRefreshOpenWindows();
});
