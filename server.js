// mini-services/game-service/index.ts
var import_http = require("http");
var import_fs = require("fs");
var import_path = require("path");
var import_socket = require("socket.io");
var MIN_PLAYERS = 3;
var MAX_PLAYERS = 8;
var HIDE_MS = 30000;
var SEEK_MS = 300000;
var SEARCH_MS = 4000;
var SEARCH_COOLDOWN_MS = 2000;
var MOVE_MS = 6000;
var MOVE_COOLDOWN_MS = 1e4;
var REJOIN_GRACE_MS = 15000;
var CHAT_HISTORY_MAX = 200;
var TICK_MS = 250;
var MAX_ROOMS = 60;
var SPOTS = [
  { id: "s01", emoji: "\uD83D\uDEAA", label: "Almari" },
  { id: "s02", emoji: "\uD83C\uDF33", label: "Ped ke peeche" },
  { id: "s03", emoji: "\uD83D\uDE97", label: "Gaadi ke neeche" },
  { id: "s04", emoji: "\uD83D\uDCE6", label: "Bada Dabba" },
  { id: "s05", emoji: "\uD83D\uDECF️", label: "Bed ke neeche" },
  { id: "s06", emoji: "\uD83D\uDECB️", label: "Sofa ke peeche" },
  { id: "s07", emoji: "\uD83E\uDEA3", label: "Bucket me" },
  { id: "s08", emoji: "\uD83C\uDF3F", label: "Jhaadiyon me" },
  { id: "s09", emoji: "\uD83E\uDEB5", label: "Lakdi ka dher" },
  { id: "s10", emoji: "\uD83D\uDEC1", label: "Bathtub" },
  { id: "s11", emoji: "\uD83C\uDF83", label: "Kaddu ke peeche" },
  { id: "s12", emoji: "\uD83E\uDE9F", label: "Pard ke peeche" },
  { id: "s13", emoji: "\uD83E\uDDFA", label: "Kapdon ki Tokri" },
  { id: "s14", emoji: "\uD83D\uDED2", label: "Sabzi Thela" },
  { id: "s15", emoji: "\uD83D\uDD73️", label: "Chuhe ka Bill" },
  { id: "s16", emoji: "\uD83C\uDF6F", label: "Madhumakkhi Chatta" },
  { id: "s17", emoji: "\uD83C\uDFDA️", label: "Purana Kamra" },
  { id: "s18", emoji: "\uD83D\uDEBD", label: "Bathroom" },
  { id: "s19", emoji: "☂️", label: "Purana Chhata" },
  { id: "s20", emoji: "\uD83D\uDC04", label: "Gai ka Got" },
  { id: "s21", emoji: "\uD83C\uDF5A", label: "Bhaand Baraamda" },
  { id: "s22", emoji: "\uD83E\uDEA5", label: "Toothpaste ki Pipe" },
  { id: "s23", emoji: "\uD83E\uDDF8", label: "Khilona Box" },
  { id: "s24", emoji: "\uD83E\uDEB4", label: "Gamle ke peeche" },
  { id: "s25", emoji: "\uD83E\uDDF9", label: "Jhaadu ke peeche" },
  { id: "s26", emoji: "\uD83D\uDEF7", label: "Sledge ke neeche" },
  { id: "s27", emoji: "\uD83D\uDC2B", label: "Unth ke peeche" },
  { id: "s28", emoji: "\uD83D\uDE9C", label: "Tractor ke neeche" },
  { id: "s29", emoji: "\uD83C\uDF36️", label: "Mirchi ka Dher" },
  { id: "s30", emoji: "\uD83E\uDE9F", label: "Khidki ke Bahar" },
  { id: "s31", emoji: "\uD83E\uDD41", label: "Dhol ke andar" },
  { id: "s32", emoji: "\uD83E\uDEA3", label: "Pani ki Tanki" },
  { id: "s33", emoji: "\uD83C\uDF3D", label: "Makka ke Khet" },
  { id: "s34", emoji: "\uD83C\uDF42", label: "Patto ke Dher" },
  { id: "s35", emoji: "\uD83E\uDDF1", label: "Deewar ka Gaddha" },
  { id: "s36", emoji: "\uD83E\uDEB5", label: "Khtai ke Neeche" },
  { id: "s37", emoji: "\uD83D\uDC13", label: "Murgi ke Chhalle" },
  { id: "s38", emoji: "\uD83D\uDEF6", label: "Naav ke Andar" },
  { id: "s39", emoji: "\uD83C\uDF09", label: "Pul ke Neeche" },
  { id: "s40", emoji: "\uD83D\uDD73️", label: "Ghar ka Kabristan" },
  { id: "s41", emoji: "\uD83E\uDE9E", label: "Sheeshe ke Peeche" },
  { id: "s42", emoji: "\uD83D\uDEE2️", label: "Tel ka Drum" },
  { id: "s43", emoji: "\uD83D\uDC34", label: "Ghodi ka Aangan" },
  { id: "s44", emoji: "\uD83C\uDF3B", label: "Surajmukhi Khet" },
  { id: "s45", emoji: "\uD83E\uDDFA", label: "Khaali Gamla" },
  { id: "s46", emoji: "\uD83D\uDE82", label: "Train ki Dibba" },
  { id: "s47", emoji: "⛺", label: "Tent ke Andar" },
  { id: "s48", emoji: "\uD83C\uDF84", label: "Christmas Tree" }
];
var AVATARS = ["\uD83D\uDC2F", "\uD83E\uDD81", "\uD83D\uDC35", "\uD83D\uDC36", "\uD83D\uDC31", "\uD83D\uDC30", "\uD83D\uDC3C", "\uD83D\uDC38"];
var rooms = new Map;
var uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
var now = () => Date.now();
var CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function genRoomCode() {
  for (let attempt = 0;attempt < 200; attempt++) {
    let code = "";
    for (let i = 0;i < 4; i++)
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(code))
      return code;
  }
  return "ROOM" + Math.floor(Math.random() * 9000 + 1000);
}
function spotLabel(spotId) {
  const s = SPOTS.find((x) => x.id === spotId);
  return s ? `${s.emoji} ${s.label}` : "?";
}
function pickAvatar(room) {
  const used = new Set([...room.players.values()].map((p) => p.avatar));
  const free = AVATARS.filter((a) => !used.has(a));
  return free.length > 0 ? free[Math.floor(Math.random() * free.length)] : AVATARS[Math.floor(Math.random() * AVATARS.length)];
}
function sanitizeName(raw) {
  if (typeof raw !== "string")
    return null;
  const name = raw.replace(/\s+/g, " ").trim().slice(0, 16);
  return name.length >= 1 ? name : null;
}
function systemMessage(text, visibility = "all") {
  return { id: uid(), playerId: "system", name: "System", avatar: "\uD83D\uDCE3", text, at: now(), kind: "system", visibility };
}
function pushChat(room, msg) {
  room.chat.push(msg);
  if (room.chat.length > CHAT_HISTORY_MAX)
    room.chat.splice(0, room.chat.length - CHAT_HISTORY_MAX);
}
function getPlayerBySocket(room, socketId) {
  for (const p of room.players.values())
    if (p.socketId === socketId)
      return p;
  return;
}
function activeHiders(room) {
  return [...room.players.values()].filter((p) => p.role === "hider" && !p.found);
}
function allHiders(room) {
  return [...room.players.values()].filter((p) => p.role === "hider");
}
function currentSeeker(room) {
  return [...room.players.values()].find((p) => p.role === "seeker");
}
function connectedPlayers(room) {
  return [...room.players.values()].filter((p) => p.connected);
}
function io() {
  return globalThis.__io;
}
function emitChat(room, msg) {
  for (const p of connectedPlayers(room)) {
    if (msg.visibility === "hiders" && p.role !== "hider")
      continue;
    if (p.socketId)
      io().to(p.socketId).emit("chat:message", msg);
  }
}
function sendChatHistory(room, socket, role) {
  for (const msg of room.chat) {
    if (msg.visibility === "hiders" && role !== "hider")
      continue;
    socket.emit("chat:message", msg);
  }
}
function broadcastRoom(room) {
  for (const p of connectedPlayers(room)) {
    if (p.socketId)
      io().to(p.socketId).emit("room:state", buildView(room, p.id));
  }
}
function broadcastEvent(room, event) {
  for (const p of connectedPlayers(room)) {
    if (p.socketId)
      io().to(p.socketId).emit("game:event", event);
  }
}
function buildView(room, viewerId) {
  const viewer = room.players.get(viewerId);
  const inGame = room.phase === "hiding" || room.phase === "seeking";
  const showLocations = viewer?.role === "hider" && inGame;
  const revealAll = room.phase === "ended";
  const players = [...room.players.values()].sort((a, b) => a.joinedAt - b.joinedAt).map((p) => {
    const base = {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      role: inGame || room.phase === "ended" ? p.role : "hider",
      isHost: p.isHost,
      connected: p.connected
    };
    if (inGame) {
      base.found = p.found && p.role === "hider";
      if (showLocations && p.role === "hider") {
        base.spotId = p.spotId;
        base.movingTo = p.movingTo;
        base.moveEndsAt = p.moveEndsAt;
        base.moveReadyAt = p.moveReadyAt;
      }
    }
    if (revealAll) {
      base.found = p.found && p.role === "hider";
      base.revealSpot = p.role === "hider" ? p.foundAtSpot ?? p.spotId : null;
    }
    return base;
  });
  const me = viewer;
  const you = me ? {
    id: me.id,
    name: me.name,
    avatar: me.avatar,
    role: me.role,
    isHost: me.isHost,
    spotId: me.spotId,
    movingTo: me.movingTo,
    moveEndsAt: me.moveEndsAt,
    moveReadyAt: me.moveReadyAt,
    found: me.found && me.role === "hider",
    searchReadyAt: room.searchReadyAt
  } : null;
  const hidersAll = allHiders(room);
  const hidersFound = hidersAll.filter((p) => p.found);
  const view = {
    code: room.code,
    phase: room.phase,
    phaseEndsAt: room.phaseEndsAt,
    serverNow: now(),
    round: room.round,
    players,
    you,
    spots: SPOTS,
    searching: room.searching,
    hidersTotal: hidersAll.length,
    hidersFoundCount: hidersFound.length,
    winner: room.winner,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    timings: { HIDE_MS, SEEK_MS, SEARCH_MS, SEARCH_COOLDOWN_MS, MOVE_MS, MOVE_COOLDOWN_MS },
    wins: Object.fromEntries(room.wins),
    chatVisibility: inGame ? viewer?.role === "hider" ? "hiders" : "all" : "all"
  };
  if (viewer?.role === "seeker") {
    view.searchHistory = room.searchHistory.slice(-8).reverse();
  }
  if (room.phase === "ended") {
    view.survivors = hidersAll.filter((p) => !p.found).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar }));
    view.reveal = allHiders(room).filter((p) => p.foundAtSpot || p.spotId).map((p) => ({ playerId: p.id, spotId: p.foundAtSpot ?? p.spotId }));
  }
  return view;
}
function createRoom() {
  const room = {
    code: genRoomCode(),
    createdAt: now(),
    phase: "lobby",
    phaseEndsAt: 0,
    players: new Map,
    searching: null,
    searchReadyAt: 0,
    searchHistory: [],
    chat: [],
    winner: null,
    round: 1,
    lastSeekerId: null,
    seekerOrder: [],
    wins: new Map,
    loop: null,
    lastTickEmit: 0
  };
  rooms.set(room.code, room);
  room.loop = setInterval(() => roomTick(room), TICK_MS);
  return room;
}
function destroyRoomIfEmpty(room) {
  if (room.players.size === 0) {
    if (room.loop)
      clearInterval(room.loop);
    rooms.delete(room.code);
  }
}
function transferHostIfNeeded(room) {
  const host = [...room.players.values()].find((p) => p.isHost);
  if (!host) {
    const next = [...room.players.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (next) {
      for (const p of room.players.values())
        p.isHost = false;
      next.isHost = true;
      pushChat(room, systemMessage(`\uD83D\uDC51 ${next.name} ab naya host hai`));
    }
  }
}
function removePlayer(room, playerId, reason) {
  const p = room.players.get(playerId);
  if (!p)
    return;
  room.players.delete(playerId);
  room.seekerOrder = room.seekerOrder.filter((id) => id !== playerId);
  pushChat(room, systemMessage(`\uD83D\uDC4B ${p.name} room se chala gaya (${reason})`));
  transferHostIfNeeded(room);
  if (room.phase === "hiding" || room.phase === "seeking") {
    if (p.role === "seeker") {
      abortToLobby(room, `\uD83D\uDD0D Seeker (${p.name}) chala gaya — round cancel ho gaya!`);
      return;
    }
    const connected = connectedPlayers(room);
    if (connected.length < MIN_PLAYERS) {
      abortToLobby(room, "\uD83D\uDC65 Kam players reh gaye — round cancel ho gaya!");
      return;
    }
    if (activeHiders(room).length === 0) {
      endGame(room, "seeker", "\uD83C\uDFF3️ Sab hiders nikal gaye — seeker jeet gaya!");
      return;
    }
  }
  broadcastRoom(room);
  emitChat(room, room.chat[room.chat.length - 1]);
  destroyRoomIfEmpty(room);
}
function abortToLobby(room, message) {
  room.phase = "lobby";
  room.phaseEndsAt = 0;
  room.searching = null;
  room.searchReadyAt = 0;
  room.winner = null;
  for (const p of room.players.values()) {
    p.role = "hider";
    p.spotId = null;
    p.movingTo = null;
    p.found = false;
    p.foundAtSpot = null;
    p.moveEndsAt = 0;
    p.moveReadyAt = 0;
  }
  pushChat(room, systemMessage(message));
  const last = room.chat[room.chat.length - 1];
  broadcastRoom(room);
  emitChat(room, last);
  broadcastEvent(room, { type: "round-cancel", message });
}
function startRound(room) {
  const players = [...room.players.values()].sort((a, b) => a.joinedAt - b.joinedAt);
  let seeker;
  const orderIds = room.seekerOrder.filter((id) => room.players.has(id));
  const candidates = orderIds.length > 0 ? orderIds : players.map((p) => p.id);
  const prevIdx = room.lastSeekerId ? candidates.indexOf(room.lastSeekerId) : -1;
  if (prevIdx >= 0 && candidates.length > 1) {
    for (let i = 1;i <= candidates.length; i++) {
      const candidateId = candidates[(prevIdx + i) % candidates.length];
      const candidate = room.players.get(candidateId);
      if (candidate && candidate.connected) {
        seeker = candidate;
        break;
      }
    }
  }
  if (!seeker) {
    const connected = players.filter((p) => p.connected);
    const pool = connected.length > 0 ? connected : players;
    seeker = pool[Math.floor(Math.random() * pool.length)];
  }
  for (const p of players) {
    p.role = "hider";
    p.spotId = null;
    p.movingTo = null;
    p.moveEndsAt = 0;
    p.moveReadyAt = 0;
    p.found = false;
    p.foundAtSpot = null;
  }
  seeker.role = "seeker";
  room.lastSeekerId = seeker.id;
  room.seekerOrder = players.map((p) => p.id);
  room.phase = "hiding";
  room.phaseEndsAt = now() + HIDE_MS;
  room.searching = null;
  room.searchReadyAt = 0;
  room.searchHistory = [];
  room.winner = null;
  pushChat(room, systemMessage(`\uD83C\uDFAC Round ${room.round} shuru! \uD83D\uDD0D ${seeker.name} dhundhne wala hai — aankhein band rakho!`));
  pushChat(room, systemMessage(`\uD83D\uDE48 Hiders, apni jagah chuno — ${HIDE_MS / 1000} second me!`));
  broadcastRoom(room);
  for (const msg of room.chat.slice(-2))
    emitChat(room, msg);
  broadcastEvent(room, { type: "round-start", seekerName: seeker.name });
}
function beginSeeking(room) {
  for (const p of activeHiders(room)) {
    if (!p.spotId) {
      p.spotId = SPOTS[Math.floor(Math.random() * SPOTS.length)].id;
    }
  }
  room.phase = "seeking";
  room.phaseEndsAt = now() + SEEK_MS;
  room.searching = null;
  room.searchReadyAt = 0;
  pushChat(room, systemMessage(`⏰ Seeker aa gaya! ${SEEK_MS / 60000} minute me sab hiders dhundhna hai! Chhupne walo, bach ke rahna \uD83D\uDE08`));
  broadcastRoom(room);
  emitChat(room, room.chat[room.chat.length - 1]);
  broadcastEvent(room, { type: "seek-start" });
}
function endGame(room, winner, message) {
  room.phase = "ended";
  room.phaseEndsAt = 0;
  room.searching = null;
  room.winner = winner;
  const seeker = currentSeeker(room);
  if (winner === "seeker") {
    if (seeker)
      room.wins.set(seeker.id, (room.wins.get(seeker.id) ?? 0) + 1);
  } else {
    for (const p of activeHiders(room)) {
      room.wins.set(p.id, (room.wins.get(p.id) ?? 0) + 1);
    }
  }
  pushChat(room, systemMessage(message));
  broadcastRoom(room);
  emitChat(room, room.chat[room.chat.length - 1]);
  broadcastEvent(room, { type: "game-over", winner, message });
}
function roomTick(room) {
  const t = now();
  let dirty = false;
  try {
    if (room.phase === "hiding" && t >= room.phaseEndsAt) {
      beginSeeking(room);
      return;
    }
    if (room.phase === "seeking" && t >= room.phaseEndsAt) {
      const survivors = activeHiders(room).map((p) => `${p.avatar} ${p.name}`).join(", ");
      endGame(room, "hiders", `\uD83C\uDFC6 Time up! Chhupne wale jeet gaye! Ye bach gaye: ${survivors || "koi nahi"}`);
      return;
    }
    if (room.searching && t >= room.searching.endsAt) {
      const searchedSpot = room.searching.spotId;
      const caught = activeHiders(room).filter((p) => p.spotId === searchedSpot);
      room.searchHistory.push({ spotId: searchedSpot, caughtNames: caught.map((p) => p.name), at: t });
      if (room.searchHistory.length > 30)
        room.searchHistory.shift();
      if (caught.length > 0) {
        for (const p of caught) {
          p.found = true;
          p.foundAtSpot = searchedSpot;
          p.movingTo = null;
          p.moveEndsAt = 0;
        }
        const names = caught.map((p) => `${p.avatar} ${p.name}`).join(", ");
        pushChat(room, systemMessage(`\uD83D\uDEA8 ${names} ${spotLabel(searchedSpot)} me PAKDA GAYA!`));
        emitChat(room, room.chat[room.chat.length - 1]);
        broadcastEvent(room, { type: "caught", names: caught.map((p) => p.name), spotId: searchedSpot });
        if (activeHiders(room).length === 0) {
          room.searching = null;
          room.searchReadyAt = t + SEARCH_COOLDOWN_MS;
          endGame(room, "seeker", "\uD83C\uDF89 Dhundhne wale jeet gaye — SAB PAKDE GAYE!");
          return;
        }
      } else {
        broadcastEvent(room, { type: "empty", spotId: searchedSpot });
      }
      room.searching = null;
      room.searchReadyAt = t + SEARCH_COOLDOWN_MS;
      dirty = true;
    }
    for (const p of room.players.values()) {
      if (p.role === "hider" && p.movingTo && t >= p.moveEndsAt) {
        p.spotId = p.movingTo;
        p.movingTo = null;
        p.moveEndsAt = 0;
        p.moveReadyAt = t + MOVE_COOLDOWN_MS;
        dirty = true;
      }
    }
    for (const p of [...room.players.values()]) {
      if (!p.connected && p.disconnectedAt && t - p.disconnectedAt > REJOIN_GRACE_MS) {
        removePlayer(room, p.id, "connection toot gaya");
        if (!rooms.has(room.code))
          return;
      }
    }
    if (t - room.lastTickEmit >= 1000) {
      room.lastTickEmit = t;
      for (const p of connectedPlayers(room)) {
        if (p.socketId)
          io().to(p.socketId).emit("game:tick", { serverNow: t, phaseEndsAt: room.phaseEndsAt, phase: room.phase });
      }
    }
    if (dirty)
      broadcastRoom(room);
  } catch (err) {
    console.error(`[room ${room.code}] tick error:`, err);
  }
}
var STATIC_MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};
function findIndexHtml() {
  const candidates = [
    import_path.join(process.cwd(), "index.html"),
    import_path.join(process.cwd(), "public", "index.html")
  ];
  for (const c of candidates)
    if (import_fs.existsSync(c))
      return c;
  return null;
}
function serveStatic(req, res) {
  const urlPath = (req.url ?? "/").split("?")[0];
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.end("method not allowed");
    return;
  }
  if (urlPath === "/healthz") {
    res.statusCode = 200;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("ok");
    return;
  }
  const target = urlPath === "/" || urlPath === "/index.html" ? findIndexHtml() : null;
  if (!target) {
    res.statusCode = 404;
    res.end("not found");
    return;
  }
  try {
    const html = import_fs.readFileSync(target);
    res.statusCode = 200;
    res.setHeader("content-type", STATIC_MIME[".html"]);
    res.setHeader("cache-control", "no-cache");
    res.end(html);
  } catch {
    res.statusCode = 500;
    res.end("read error");
  }
}
var httpServer = import_http.createServer(serveStatic);
var ioInstance = new import_socket.Server(httpServer, {
  path: "/socket.io",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000
});
globalThis.__io = ioInstance;
ioInstance.on("connection", (socket) => {
  console.log(`[conn] ${socket.id}`);
  socket.on("room:create", (data, cb) => {
    const name = sanitizeName(data?.name);
    if (!name)
      return cb?.({ ok: false, error: "Naam daalo pehle!" });
    if (rooms.size >= MAX_ROOMS)
      return cb?.({ ok: false, error: "Bahut zyada rooms hain, thodi der baad try karo" });
    const room = createRoom();
    const playerId = uid();
    const player = {
      id: playerId,
      socketId: socket.id,
      name,
      avatar: pickAvatar(room),
      role: "hider",
      spotId: null,
      movingTo: null,
      moveEndsAt: 0,
      moveReadyAt: 0,
      found: false,
      foundAtSpot: null,
      isHost: true,
      connected: true,
      disconnectedAt: 0,
      joinedAt: now()
    };
    room.players.set(playerId, player);
    room.seekerOrder.push(playerId);
    socket.join(room.code);
    pushChat(room, systemMessage(`\uD83C\uDF89 ${name} ne room banaya. Code apne doston ko bhejo!`));
    cb?.({ ok: true, roomCode: room.code, playerId });
    broadcastRoom(room);
    emitChat(room, room.chat[room.chat.length - 1]);
    console.log(`[room:create] ${name} -> ${room.code}`);
  });
  socket.on("room:join", (data, cb) => {
    const name = sanitizeName(data?.name);
    const code = String(data?.roomCode ?? "").trim().toUpperCase();
    if (!name)
      return cb?.({ ok: false, error: "Naam daalo pehle!" });
    const room = rooms.get(code);
    if (!room)
      return cb?.({ ok: false, error: "Room nahi mila — code check karo!" });
    if (room.phase === "hiding" || room.phase === "seeking") {
      return cb?.({ ok: false, error: "Game chal raha hai! Round khatam hone ke baad try karo." });
    }
    if (room.players.size >= MAX_PLAYERS)
      return cb?.({ ok: false, error: "Room full hai (max 8 players)!" });
    const playerId = uid();
    const player = {
      id: playerId,
      socketId: socket.id,
      name,
      avatar: pickAvatar(room),
      role: "hider",
      spotId: null,
      movingTo: null,
      moveEndsAt: 0,
      moveReadyAt: 0,
      found: false,
      foundAtSpot: null,
      isHost: false,
      connected: true,
      disconnectedAt: 0,
      joinedAt: now()
    };
    room.players.set(playerId, player);
    room.seekerOrder.push(playerId);
    socket.join(room.code);
    pushChat(room, systemMessage(`\uD83D\uDC4B ${name} room me aaya! (${room.players.size}/${MAX_PLAYERS})`));
    cb?.({ ok: true, roomCode: room.code, playerId });
    broadcastRoom(room);
    emitChat(room, room.chat[room.chat.length - 1]);
    sendChatHistory(room, socket, "hider");
    console.log(`[room:join] ${name} -> ${room.code}`);
  });
  socket.on("room:rejoin", (data, cb) => {
    const code = String(data?.roomCode ?? "").trim().toUpperCase();
    const playerId = String(data?.playerId ?? "");
    const room = rooms.get(code);
    const player = room?.players.get(playerId);
    if (!room || !player)
      return cb?.({ ok: false, error: "Session expire ho gaya — dobara join karo" });
    player.socketId = socket.id;
    player.connected = true;
    player.disconnectedAt = 0;
    socket.join(room.code);
    pushChat(room, systemMessage(`\uD83D\uDD01 ${player.name} wapas aa gaya!`));
    cb?.({ ok: true, roomCode: room.code, playerId, name: player.name });
    broadcastRoom(room);
    sendChatHistory(room, socket, player.role);
    console.log(`[room:rejoin] ${player.name} -> ${room.code}`);
  });
  socket.on("game:start", (_data, cb) => {
    const room = findRoomBySocket(socket.id);
    if (!room)
      return cb?.({ ok: false, error: "Room nahi mila" });
    const player = getPlayerBySocket(room, socket.id);
    if (!player?.isHost)
      return cb?.({ ok: false, error: "Sirf host game start kar sakta hai" });
    if (room.phase !== "lobby" && room.phase !== "ended")
      return cb?.({ ok: false, error: "Game pehle se chal raha hai" });
    const connected = connectedPlayers(room);
    if (connected.length < MIN_PLAYERS)
      return cb?.({ ok: false, error: `Kam se kam ${MIN_PLAYERS} players chahiye!` });
    if (room.phase === "ended")
      room.round++;
    startRound(room);
    cb?.({ ok: true });
  });
  socket.on("game:restart", (_data, cb) => {
    const room = findRoomBySocket(socket.id);
    if (!room)
      return cb?.({ ok: false, error: "Room nahi mila" });
    const player = getPlayerBySocket(room, socket.id);
    if (!player?.isHost)
      return cb?.({ ok: false, error: "Sirf host restart kar sakta hai" });
    if (room.phase !== "ended")
      return cb?.({ ok: false, error: "Game abhi chal raha hai" });
    room.phase = "lobby";
    room.winner = null;
    for (const p of room.players.values()) {
      p.role = "hider";
      p.spotId = null;
      p.movingTo = null;
      p.found = false;
      p.foundAtSpot = null;
      p.moveEndsAt = 0;
      p.moveReadyAt = 0;
    }
    pushChat(room, systemMessage("\uD83D\uDD04 Naya round taiyaar! Host game start karega."));
    cb?.({ ok: true });
    broadcastRoom(room);
    emitChat(room, room.chat[room.chat.length - 1]);
  });
  socket.on("hide:choose", (data) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.phase !== "hiding")
      return;
    const player = getPlayerBySocket(room, socket.id);
    if (!player || player.role !== "hider" || player.found)
      return;
    const spotId = String(data?.spotId ?? "");
    if (!SPOTS.some((s) => s.id === spotId))
      return;
    player.spotId = spotId;
    player.movingTo = null;
    broadcastRoom(room);
  });
  socket.on("seek:search", (data, cb) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.phase !== "seeking")
      return cb?.({ ok: false, error: "Abhi seeking time nahi hai" });
    const player = getPlayerBySocket(room, socket.id);
    if (!player || player.role !== "seeker")
      return cb?.({ ok: false, error: "Sirf seeker search kar sakta hai" });
    if (room.searching)
      return cb?.({ ok: false, error: "Pehle current search khatam hone do" });
    if (now() < room.searchReadyAt)
      return cb?.({ ok: false, error: "Thoda saans lo! Cooldown chal raha hai" });
    const spotId = String(data?.spotId ?? "");
    if (!SPOTS.some((s) => s.id === spotId))
      return cb?.({ ok: false, error: "Galat jagah" });
    room.searching = { spotId, startedAt: now(), endsAt: now() + SEARCH_MS };
    broadcastRoom(room);
    broadcastEvent(room, { type: "search-start", spotId, endsAt: room.searching.endsAt, seekerName: player.name });
    cb?.({ ok: true });
  });
  socket.on("hide:move", (data, cb) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.phase !== "seeking")
      return cb?.({ ok: false, error: "Abhi move nahi kar sakte" });
    const player = getPlayerBySocket(room, socket.id);
    if (!player || player.role !== "hider" || player.found)
      return cb?.({ ok: false, error: "Tum move nahi kar sakte" });
    if (!player.spotId)
      return cb?.({ ok: false, error: "Pehle chhupo toh sahi!" });
    if (player.movingTo)
      return cb?.({ ok: false, error: "Tum already move kar rahe ho" });
    if (now() < player.moveReadyAt)
      return cb?.({ ok: false, error: "Move cooldown chal raha hai — ruko!" });
    if (room.searching && room.searching.spotId === player.spotId) {
      return cb?.({ ok: false, error: "\uD83D\uDE31 Seeker tumhare spot pe hai — bhaag nahi sakte!" });
    }
    const spotId = String(data?.spotId ?? "");
    if (!SPOTS.some((s) => s.id === spotId))
      return cb?.({ ok: false, error: "Galat jagah" });
    if (spotId === player.spotId)
      return cb?.({ ok: false, error: "Wahi toh ho tum!" });
    player.movingTo = spotId;
    player.moveEndsAt = now() + MOVE_MS;
    broadcastRoom(room);
    broadcastEvent(room, { type: "move", playerId: player.id, to: spotId });
    cb?.({ ok: true });
  });
  socket.on("chat:send", (data) => {
    const room = findRoomBySocket(socket.id);
    if (!room)
      return;
    const player = getPlayerBySocket(room, socket.id);
    if (!player)
      return;
    const text = String(data?.text ?? "").trim().slice(0, 300);
    if (!text)
      return;
    const inGame = room.phase === "hiding" || room.phase === "seeking";
    const visibility = inGame && player.role === "hider" ? "hiders" : "all";
    const msg = {
      id: uid(),
      playerId: player.id,
      name: player.name,
      avatar: player.avatar,
      text,
      at: now(),
      kind: "user",
      visibility
    };
    pushChat(room, msg);
    emitChat(room, msg);
  });
  socket.on("room:leave", () => {
    const room = findRoomBySocket(socket.id);
    if (!room)
      return;
    const player = getPlayerBySocket(room, socket.id);
    if (player)
      removePlayer(room, player.id, "khud chala gaya");
  });
  socket.on("disconnect", () => {
    const room = findRoomBySocket(socket.id);
    if (!room)
      return;
    const player = getPlayerBySocket(room, socket.id);
    if (!player)
      return;
    if (room.phase === "lobby" || room.phase === "ended") {
      removePlayer(room, player.id, "chala gaya");
    } else {
      player.connected = false;
      player.disconnectedAt = now();
      pushChat(room, systemMessage(`⚠️ ${player.name} ka connection toota... (${REJOIN_GRACE_MS / 1000}s me wapas aa sakta hai)`));
      broadcastRoom(room);
      emitChat(room, room.chat[room.chat.length - 1]);
    }
  });
  socket.on("error", (err) => console.error(`[socket error] ${socket.id}:`, err));
});
function findRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (getPlayerBySocket(room, socketId))
      return room;
  }
  return;
}
setInterval(() => {
  const t = now();
  for (const room of [...rooms.values()]) {
    const allDisconnected = [...room.players.values()].every((p) => !p.connected);
    if (room.players.size === 0 || allDisconnected && t - room.createdAt > REJOIN_GRACE_MS && t - Math.max(...[...room.players.values()].map((p) => p.disconnectedAt || room.createdAt)) > REJOIN_GRACE_MS) {
      if (room.loop)
        clearInterval(room.loop);
      rooms.delete(room.code);
      console.log(`[cleanup] room ${room.code} deleted`);
    }
  }
}, 10 * 60 * 1000).unref?.();
var PORT = Number(process.env.PORT) || 3003;
httpServer.listen(PORT, () => {
  console.log(`\uD83D\uDC35 Chhupa Chhupi game service running on port ${PORT}`);
});
process.on("SIGTERM", () => {
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  httpServer.close(() => process.exit(0));
});
