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
