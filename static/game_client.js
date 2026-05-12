// IO-style game client.
//
// Renders an "agar.io"-style camera that follows the local player. The world
// is bigger than the viewport; we translate the canvas so the local player is
// in the centre, clamping to the world boundary so the edge of the arena is
// always visible when you reach it.

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('status');
  const scoreboardEl = document.getElementById('scoreboard');

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = 'status ' + (cls || '');
  }

  function fitCanvas() {
    // Render at the CSS pixel size of the canvas for crisp output.
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  // Load (or prompt for) a session.
  let session = null;
  try { session = JSON.parse(sessionStorage.getItem('iog.session') || 'null'); }
  catch (e) { session = null; }

  if (!session) {
    const username = (prompt('Pick a username (or cancel to go to the editor):') || '').trim();
    if (!username) { location.href = '/student'; return; }
    session = {
      username,
      manifest: {
        characterName: 'Default',
        color: '#5dd6ff',
        size: 24,
        speed: 220,
        maxHealth: 100,
        powers: [{
          name: 'Bolt', key: 'space', cooldownMs: 600,
          cast: {
            kind: 'projectile', color: '#ffb13b',
            speed: 480, radius: 6, lifetimeMs: 2000,
            count: 1, spreadDeg: 0,
            onHit: [{ effect: 'damage', amount: 15 }],
          },
        }],
      },
    };
  }

  // --- Networking ---------------------------------------------------------

  const wsUrl = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws';
  let ws;
  let myPid = null;
  let world = { width: 2400, height: 1600 };
  let snapshot = { players: [], projectiles: [], areas: [], meleeFx: [] };

  function connect() {
    setStatus('connecting…');
    ws = new WebSocket(wsUrl);
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({
        type: 'join',
        payload: { username: session.username, manifest: session.manifest },
      }));
    });
    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.type === 'welcome') {
        myPid = msg.pid;
        world = msg.world || world;
        setStatus('connected as ' + session.username, 'connected');
      } else if (msg.type === 'join_error') {
        setStatus('join error: ' + msg.error, 'error');
      } else if (msg.type === 'state') {
        snapshot = msg.payload;
      }
    });
    ws.addEventListener('close', () => {
      setStatus('disconnected — reconnecting…', 'error');
      myPid = null;
      setTimeout(connect, 1500);
    });
    ws.addEventListener('error', () => { /* surfaced via close */ });
  }
  connect();

  // --- Input --------------------------------------------------------------

  const keys = Object.create(null);
  const MOVE_KEYS = {
    'arrowup': 'up', 'w': 'up',
    'arrowdown': 'down', 's': 'down',
    'arrowleft': 'left', 'a': 'left',
    'arrowright': 'right', 'd': 'right',
  };

  function normalizeKey(ev) {
    let k = (ev.key || '').toLowerCase();
    if (k === ' ') k = 'space';
    return k;
  }

  function powerKeysForMe() {
    if (!myPid) return [];
    const me = snapshot.players.find(p => p.pid === myPid);
    if (!me) return [];
    return (me.powers || []).map(p => p.key);
  }

  window.addEventListener('keydown', (ev) => {
    const k = normalizeKey(ev);
    if (MOVE_KEYS[k] || powerKeysForMe().includes(k)) ev.preventDefault();
    if (keys[k]) return;
    keys[k] = true;
    if (powerKeysForMe().includes(k) && ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'fire', payload: { key: k } }));
    }
  });
  window.addEventListener('keyup', (ev) => {
    const k = normalizeKey(ev);
    keys[k] = false;
  });

  setInterval(() => {
    if (!ws || ws.readyState !== 1 || !myPid) return;
    let mx = 0, my = 0;
    for (const k in keys) {
      if (!keys[k]) continue;
      const dir = MOVE_KEYS[k];
      if (dir === 'up') my -= 1;
      else if (dir === 'down') my += 1;
      else if (dir === 'left') mx -= 1;
      else if (dir === 'right') mx += 1;
    }
    ws.send(JSON.stringify({ type: 'input', payload: { mx, my } }));
  }, 1000 / 30);

  // --- Camera + Rendering -------------------------------------------------

  function viewportSize() {
    const rect = canvas.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  function cameraOffset() {
    const me = snapshot.players.find(p => p.pid === myPid);
    const { w, h } = viewportSize();
    let cx, cy;
    if (me) { cx = me.x; cy = me.y; }
    else { cx = world.width / 2; cy = world.height / 2; }
    // Center the camera, then clamp so we don't show beyond the world.
    let ox = w / 2 - cx;
    let oy = h / 2 - cy;
    // Only clamp if the world is bigger than the viewport in that axis.
    if (world.width >= w) {
      ox = Math.min(0, ox);
      ox = Math.max(w - world.width, ox);
    } else {
      ox = (w - world.width) / 2;
    }
    if (world.height >= h) {
      oy = Math.min(0, oy);
      oy = Math.max(h - world.height, oy);
    } else {
      oy = (h - world.height) / 2;
    }
    return { ox, oy };
  }

  function drawBackground(ox, oy) {
    const { w, h } = viewportSize();
    // Dark space outside the world.
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);
    // Arena floor.
    ctx.fillStyle = '#11142a';
    ctx.fillRect(ox, oy, world.width, world.height);
    // Bright grid (visible against the floor).
    ctx.strokeStyle = '#2a3158';
    ctx.lineWidth = 1;
    const step = 80;
    const x0 = ox, y0 = oy, x1 = ox + world.width, y1 = oy + world.height;
    // Only draw lines within the viewport for speed.
    const startX = Math.max(0, Math.floor((-ox) / step) * step) + ox;
    for (let x = startX; x <= Math.min(w, x1); x += step) {
      ctx.beginPath(); ctx.moveTo(x, Math.max(0, y0)); ctx.lineTo(x, Math.min(h, y1)); ctx.stroke();
    }
    const startY = Math.max(0, Math.floor((-oy) / step) * step) + oy;
    for (let y = startY; y <= Math.min(h, y1); y += step) {
      ctx.beginPath(); ctx.moveTo(Math.max(0, x0), y); ctx.lineTo(Math.min(w, x1), y); ctx.stroke();
    }
    // World boundary outline.
    ctx.strokeStyle = '#ffb13b';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + 1, oy + 1, world.width - 2, world.height - 2);
  }

  function drawAreas(ox, oy) {
    for (const a of snapshot.areas || []) {
      ctx.fillStyle = a.color;
      ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.arc(ox + a.x, oy + a.y, a.radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ox + a.x, oy + a.y, a.radius, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawMeleeFx(ox, oy) {
    for (const m of snapshot.meleeFx || []) {
      const a = Math.atan2(m.facingY, m.facingX);
      const half = (m.arcDeg * Math.PI / 180) / 2;
      ctx.fillStyle = m.color;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(ox + m.x, oy + m.y);
      ctx.arc(ox + m.x, oy + m.y, m.range, a - half, a + half);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawProjectiles(ox, oy) {
    for (const pr of snapshot.projectiles || []) {
      ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.arc(ox + pr.x, oy + pr.y, pr.radius, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawPlayers(ox, oy) {
    for (const p of snapshot.players || []) {
      const r = p.size / 2;
      const px = ox + p.x, py = oy + p.y;
      ctx.globalAlpha = p.alive ? 1 : 0.25;
      // Status auras.
      if (p.status && p.status.shielded) {
        ctx.strokeStyle = '#a0e6ff';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(px, py, r + 6, 0, Math.PI * 2); ctx.stroke();
      }
      if (p.status && p.status.invulnerable) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(px, py, r + 3, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      // Body.
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      // Slowed/stunned tint.
      if (p.status && (p.status.slowed || p.status.stunned)) {
        ctx.fillStyle = p.status.stunned ? '#ffd24a55' : '#5dd6ff55';
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
      // Burning marker.
      if (p.status && p.status.burning) {
        ctx.fillStyle = '#ff7a00';
        for (let i = 0; i < 3; i++) {
          const ang = Math.random() * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(px + Math.cos(ang) * r * 0.7, py + Math.sin(ang) * r * 0.7, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Facing tick.
      ctx.strokeStyle = '#ffffffaa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + p.facingX * (r + 8), py + p.facingY * (r + 8));
      ctx.stroke();

      ctx.globalAlpha = 1;
      // Name + character name.
      ctx.fillStyle = '#e7e9f3';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      const label = p.username + ' · ' + p.characterName + (p.pid === myPid ? ' (you)' : '');
      ctx.fillText(label, px, py - r - 14);
      // HP bar.
      const w = Math.max(40, r * 2);
      const hpRatio = Math.max(0, p.health) / Math.max(1, p.maxHealth);
      ctx.fillStyle = '#222a3e';
      ctx.fillRect(px - w / 2, py - r - 10, w, 5);
      ctx.fillStyle = hpRatio > 0.4 ? '#51d88a' : (hpRatio > 0.2 ? '#ffb13b' : '#ff5a5a');
      ctx.fillRect(px - w / 2, py - r - 10, w * hpRatio, 5);
    }
  }

  function drawMinimap() {
    const { w, h } = viewportSize();
    const mw = 160, mh = mw * (world.height / world.width);
    const x0 = w - mw - 12, y0 = 12;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#0a0c14';
    ctx.fillRect(x0, y0, mw, mh);
    ctx.strokeStyle = '#ffb13b';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, mw - 1, mh - 1);
    for (const p of snapshot.players || []) {
      ctx.fillStyle = p.color;
      const mx = x0 + (p.x / world.width) * mw;
      const my = y0 + (p.y / world.height) * mh;
      ctx.beginPath();
      ctx.arc(mx, my, p.pid === myPid ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawScoreboard() {
    const players = (snapshot.players || []).slice().sort((a, b) => b.kills - a.kills);
    scoreboardEl.innerHTML = '';
    for (const p of players) {
      const li = document.createElement('li');
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = p.color;
      li.appendChild(sw);
      li.appendChild(document.createTextNode(
        p.username + ' (' + p.characterName + ') — K:' + p.kills + ' D:' + p.deaths
      ));
      scoreboardEl.appendChild(li);
    }
  }

  function drawMatchHud() {
    const m = snapshot.match;
    let hud = document.getElementById('matchHud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'matchHud';
      hud.className = 'match-hud';
      const wrap = document.querySelector('.arena-wrap') || canvas.parentNode || document.body;
      if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
      wrap.appendChild(hud);
    }
    if (!m) { hud.textContent = ''; return; }
    if (m.status === 'running') {
      const s = Math.floor(m.remaining);
      hud.textContent = `Round #${m.id} — ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
      hud.style.color = 'var(--text)';
    } else if (m.status === 'ended') {
      const winner = (m.lastScoreboard && m.lastScoreboard[0]) || null;
      hud.textContent = winner
        ? `Round over — winner: ${winner.username} (${winner.score} pts)`
        : 'Round over';
      hud.style.color = 'var(--accent)';
    } else {
      hud.textContent = 'Lobby — waiting for teacher to start a round';
      hud.style.color = 'var(--muted)';
    }
  }

  function loop() {
    const { ox, oy } = cameraOffset();
    drawBackground(ox, oy);
    drawAreas(ox, oy);
    drawMeleeFx(ox, oy);
    drawProjectiles(ox, oy);
    drawPlayers(ox, oy);
    drawMinimap();
    drawScoreboard();
    drawMatchHud();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
