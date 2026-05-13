// Student editor: load boilerplate/example, run student JS in a sandboxed
// iframe, validate the resulting manifest with the server, then store the
// session and jump to the arena.

(function () {
  const codeEl = document.getElementById('code');
  const outEl = document.getElementById('output');
  const runBtn = document.getElementById('runBtn');
  const joinBtn = document.getElementById('joinBtn');
  const exampleSel = document.getElementById('example');
  const usernameEl = document.getElementById('username');

  let validatedManifest = null;

  // Restore previous editor state if any.
  const prev = sessionStorage.getItem('iog.editor');
  if (prev) {
    try {
      const p = JSON.parse(prev);
      if (p.code) codeEl.value = p.code;
      if (p.username) usernameEl.value = p.username;
    } catch (e) { /* ignore */ }
  }

  function persist() {
    try {
      sessionStorage.setItem('iog.editor', JSON.stringify({
        code: codeEl.value,
        username: usernameEl.value,
      }));
    } catch (e) {}
  }
  codeEl.addEventListener('input', persist);
  usernameEl.addEventListener('input', persist);

  // ---- Sprite import widget ------------------------------------------------
  const spriteSlot = document.getElementById('spriteSlot');
  const spriteFile = document.getElementById('spriteFile');
  const spriteOut = document.getElementById('spriteOut');
  const spriteCopyBtn = document.getElementById('spriteCopyBtn');
  const spriteInsertBtn = document.getElementById('spriteInsertBtn');
  let lastSnippet = '';
  if (spriteFile) {
    spriteFile.addEventListener('change', async () => {
      const files = Array.from(spriteFile.files || []).slice(0, 4);
      if (!files.length) return;
      try {
        const dataURIs = [];
        for (const f of files) {
          if (!/^image\/(png|gif)$/.test(f.type)) {
            throw new Error(`${f.name}: must be PNG or GIF`);
          }
          if (f.size > 16 * 1024) {
            throw new Error(`${f.name} is ${(f.size/1024).toFixed(1)} KB; keep under 16 KB`);
          }
          dataURIs.push(await readAsDataURL(f));
        }
        const slot = spriteSlot.value;
        const lines = dataURIs.map(u => `      "${u}"`).join(',\n');
        lastSnippet =
`// Add inside your buildCharacter return object:
sprites: {
  ${slot}: [
${lines}
  ]
}`;
        spriteOut.textContent = lastSnippet;
        spriteCopyBtn.disabled = false;
        if (spriteInsertBtn) spriteInsertBtn.disabled = false;
      } catch (e) {
        spriteOut.textContent = 'Error: ' + (e.message || e);
        spriteCopyBtn.disabled = true;
        if (spriteInsertBtn) spriteInsertBtn.disabled = true;
      }
    });
    spriteCopyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(lastSnippet);
        const orig = spriteCopyBtn.textContent;
        spriteCopyBtn.textContent = '✓ Copied!';
        setTimeout(() => { spriteCopyBtn.textContent = orig; }, 1200);
      } catch (e) {
        spriteOut.textContent += '\n\n(Could not access clipboard — select & copy manually.)';
      }
    });
    if (spriteInsertBtn) {
      spriteInsertBtn.addEventListener('click', () => {
        if (!lastSnippet) return;
        // Try to inject into the existing return { ... } in buildCharacter.
        const code = codeEl.value;
        const slotName = spriteSlot.value;
        // Strip the leading "// Add inside..." comment line + "sprites:" keyword
        // so we can splice the inner block directly into a return object.
        const inner = lastSnippet.split('\n').slice(2, -1).join('\n'); // the "  slot: [ ... ]" lines
        // Look for an existing `sprites: {` in the user code.
        const hasSprites = /\bsprites\s*:\s*\{/.test(code);
        let next;
        if (hasSprites) {
          // Insert (or replace) just this slot's array inside the existing sprites object.
          const slotRe = new RegExp(`(\\b${slotName}\\s*:\\s*\\[)[\\s\\S]*?(\\])`, 'm');
          if (slotRe.test(code)) {
            // Replace existing array contents.
            const arr = inner.replace(new RegExp(`^\\s*${slotName}\\s*:\\s*\\[`), '').replace(/\]\s*$/, '');
            next = code.replace(slotRe, `$1${arr}$2`);
          } else {
            // Add new slot inside existing sprites: { ... }.
            next = code.replace(/(sprites\s*:\s*\{)/, `$1\n${inner.replace(/^\s*/gm, '    ')},`);
          }
        } else {
          // Insert a fresh sprites block before the final `};` of the return object.
          // Prefer the LAST `};` in the file that closes `return { ... }`.
          const idx = code.lastIndexOf('};');
          if (idx === -1) {
            spriteOut.textContent += '\n\n(Could not find a return object to insert into. Paste manually.)';
            return;
          }
          // Insert before that `};` with proper indent + comma if needed.
          const before = code.slice(0, idx).replace(/[\s,]+$/, '');
          const needsComma = !before.endsWith(',');
          const insertion = `${needsComma ? ',' : ''}\n  sprites: {\n${inner.replace(/^/gm, '  ')}\n  },\n`;
          next = before + insertion + code.slice(idx);
        }
        codeEl.value = next;
        persist();
        spriteInsertBtn.textContent = '✓ Inserted!';
        setTimeout(() => { spriteInsertBtn.textContent = '↳ Insert into editor'; }, 1400);
      });
    }
  }
  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('read failed'));
      r.readAsDataURL(file);
    });
  }

  async function loadFile(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('failed to load ' + url);
    return await r.text();
  }

  async function loadExample(which) {
    let url;
    if (which === 'boilerplate') url = '/api/boilerplate/character.js';
    else url = '/api/example/' + encodeURIComponent(which) + '/character.js';
    const text = await loadFile(url);
    codeEl.value = text;
    persist();
    outEl.textContent = 'Loaded ' + which + '. Click "Run & Validate".';
    joinBtn.disabled = true;
    validatedManifest = null;
  }

  exampleSel.addEventListener('change', () => loadExample(exampleSel.value));

  // Initial load: if no saved code, fetch the boilerplate.
  if (!codeEl.value.trim()) {
    loadExample('boilerplate').catch(err => {
      outEl.textContent = 'Could not load boilerplate: ' + err.message;
    });
  }

  // Run the student's JS inside a sandboxed iframe. The iframe has no
  // network/storage access and cannot touch the parent page; it just calls
  // buildCharacter() and posts the result back via postMessage.
  function runInSandbox(code, timeoutMs) {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-scripts');
      iframe.style.display = 'none';

      const token = Math.random().toString(36).slice(2);
      const html = `<!doctype html><html><body><script>
        (function () {
          function send(payload) {
            parent.postMessage(Object.assign({__iog: ${JSON.stringify(token)}}, payload), '*');
          }
          try {
            ${code}
            if (typeof buildCharacter !== 'function') {
              send({ok: false, error: 'You must define a function called buildCharacter().'});
              return;
            }
            var result;
            try { result = buildCharacter(); }
            catch (e) { send({ok: false, error: 'buildCharacter() threw: ' + (e && e.message || e)}); return; }
            try {
              JSON.stringify(result);
            } catch (e) {
              send({ok: false, error: 'buildCharacter() must return plain JSON-friendly data.'});
              return;
            }
            send({ok: true, manifest: result});
          } catch (e) {
            send({ok: false, error: 'Script error: ' + (e && e.message || e)});
          }
        })();
      <\/script></body></html>`;
      iframe.srcdoc = html;

      let done = false;
      function cleanup() {
        window.removeEventListener('message', onMsg);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }
      function onMsg(ev) {
        const data = ev.data;
        if (!data || data.__iog !== token) return;
        if (done) return;
        done = true;
        cleanup();
        if (data.ok) resolve(data.manifest);
        else reject(new Error(data.error || 'unknown error'));
      }
      window.addEventListener('message', onMsg);
      document.body.appendChild(iframe);
      setTimeout(() => {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error('Script took too long to run.'));
      }, timeoutMs);
    });
  }

  runBtn.addEventListener('click', async () => {
    outEl.textContent = 'Running…';
    joinBtn.disabled = true;
    validatedManifest = null;
    let manifest;
    try {
      manifest = await runInSandbox(codeEl.value, 1500);
    } catch (e) {
      outEl.textContent = 'Error: ' + e.message;
      return;
    }
    // Server-side validate.
    let r;
    try {
      r = await fetch('/api/validate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(manifest),
      });
    } catch (e) {
      outEl.textContent = 'Network error: ' + e.message;
      return;
    }
    const j = await r.json();
    if (!r.ok || !j.ok) {
      outEl.textContent = 'Validation failed: ' + (j.error || r.statusText);
      if (j.report) renderReport(j.report);
      return;
    }
    validatedManifest = j.manifest;
    outEl.textContent = 'OK! Validated character:\n' + JSON.stringify(j.manifest, null, 2);
    if (j.report) renderReport(j.report);
    joinBtn.disabled = false;
  });

  function renderReport(rep) {
    const root = document.getElementById('report');
    root.hidden = false;
    const fill = document.getElementById('budgetFill');
    const pct = Math.min(100, (rep.total / rep.budget) * 100);
    fill.style.width = pct + '%';
    fill.style.background = rep.ok
      ? 'linear-gradient(90deg, #51d88a, #5dd6ff)'
      : 'linear-gradient(90deg, #ff5a5a, #ffb13b)';
    document.getElementById('budgetSummary').textContent =
      `${rep.total} / ${rep.budget} pts used (${rep.remaining} remaining)`
      + (rep.ok ? '' : '  — over budget!');
    const sUL = document.getElementById('statCosts');
    sUL.innerHTML = '';
    Object.entries(rep.stats).forEach(([k, v]) => {
      const li = document.createElement('li');
      li.textContent = `${k}: ${v} pts`;
      sUL.appendChild(li);
    });
    const pUL = document.getElementById('powerCosts');
    pUL.innerHTML = '';
    rep.powers.forEach(p => {
      const li = document.createElement('li');
      li.textContent = `${p.name} (${p.kind}, cd ${p.cooldownMs}ms): ${p.cost} pts`;
      pUL.appendChild(li);
    });
    const wUL = document.getElementById('warnings');
    wUL.innerHTML = '';
    if (rep.warnings.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'no warnings';
      li.style.color = 'var(--ok)';
      wUL.appendChild(li);
    } else {
      rep.warnings.forEach(w => {
        const li = document.createElement('li');
        li.textContent = w;
        li.style.color = 'var(--accent)';
        wUL.appendChild(li);
      });
    }
    const mUL = document.getElementById('metrics');
    mUL.innerHTML = '';
    Object.entries(rep.metrics).forEach(([k, v]) => {
      const li = document.createElement('li');
      li.textContent = `${k}: ${v}`;
      mUL.appendChild(li);
    });
  }

  joinBtn.addEventListener('click', () => {
    const username = (usernameEl.value || '').trim();
    if (!username) { outEl.textContent = 'Please enter a name first.'; return; }
    if (!validatedManifest) { outEl.textContent = 'Run & Validate first.'; return; }
    sessionStorage.setItem('iog.session', JSON.stringify({
      username, manifest: validatedManifest,
    }));
    location.href = '/game';
  });
})();
