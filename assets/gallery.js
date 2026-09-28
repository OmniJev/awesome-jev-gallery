(function () {
  const DATA = JSON.parse(document.getElementById('data').textContent);
  const ALL = DATA.entries;
  const SEC = Object.fromEntries(DATA.sections.map((s) => [s.key, s]));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  // ---------- state
  function colKey() { return 'jev-cols-' + (window.innerWidth < 640 ? 'm' : window.innerWidth < 1100 ? 't' : 'd'); }
  const state = {
    q: '', sec: '', sort: store.get('jev-sort', 'curated'),
    cols: store.get(colKey(), Math.max(2, Math.min(6, Math.round(window.innerWidth / 440)))),
    seed: Math.random(),
  };
  let shown = [];
  const hay = new Map(ALL.map((c) => [c.key, [c.name, c.sub, c.blurb, c.why, c.org, c.venue, c.year, SEC[c.section].label, c.repo, c.hf].join('\n').toLowerCase()]));

  // ---------- pixel icons, drawn at twice their grid size so every pixel lands on the screen grid
  function pxIcon(rows) {
    const w = rows[0].length, h = rows.length;
    let d = '';
    rows.forEach((r, y) => { for (let x = 0; x < w; x++) if (r[x] === '#') d += `M${x} ${y}h1v1h-1z`; });
    return `<svg class="px" width="${w * 2}" height="${h * 2}" viewBox="0 0 ${w} ${h}" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
  }
  const I_STAR = pxIcon(['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.']);
  const I_HEART = pxIcon(['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...']);
  const I_GLOBE = pxIcon(['..####..', '.#.##.#.', '#..##..#', '########', '#..##..#', '.#.##.#.', '..####..']);
  const I_DOC = pxIcon(['#####..', '#...##.', '#....##', '#.....#', '#.###.#', '#.....#', '#.###.#', '#######']);
  const I_HF = pxIcon(['..####..', '.#....#.', '#.#..#.#', '#......#', '#.#..#.#', '#..##..#', '.#....#.', '..####..']);
  const I_GH = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';

  // ---------- helpers
  function rng(seed) { let s = Math.floor(seed * 2 ** 31) || 1; return () => { s = (s * 48271) % 2147483647; return s / 2147483647; }; }
  const stars = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
  const domain = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

  // ---------- filter + sort
  function compute() {
    const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    let list = ALL.filter((c) => (!state.sec || c.section === state.sec) && (!terms.length || terms.every((w) => hay.get(c.key).includes(w))));
    if (state.sort === 'random') { const r = rng(state.seed); list = list.map((c) => [r(), c]).sort((a, b) => a[0] - b[0]).map((x) => x[1]); }
    else if (state.sort === 'stars') { list = list.slice().sort((a, b) => ((b.stars || b.likes || 0) - (a.stars || a.likes || 0)) || (a.order - b.order)); }
    else if (state.sort === 'newest') { list = list.slice().sort((a, b) => ((b.date || '').localeCompare(a.date || '')) || (a.order - b.order)); }
    shown = list;
  }
  function cardHTML(c) {
    const s = SEC[c.section];
    const text = c.blurb || (c.why ? c.why[0].toUpperCase() + c.why.slice(1) : '');
    const n = c.stars ? `<span class="n">${I_STAR}${stars(c.stars)}</span>`
      : c.likes ? `<span class="n">${I_HEART}${stars(c.likes)}</span>` : '';
    // who made it: the GitHub avatar when we have one, else the site's own mark
    const who = c.repo ? `${c.avatar ? `<img src="${esc(c.avatar)}" alt="">` : I_GH}<span>${esc(c.org)}</span>`
      : c.hf ? `${I_HF}<span>${esc(c.hf.split('/')[0])}</span>`
      : c.arxiv ? `${I_DOC}<span>${esc(c.venue || 'arXiv')}</span>`
      : `${I_GLOBE}<span>${esc(domain(c.url))}</span>`;
    return `<a class="card" href="${esc(c.url)}" target="_blank" rel="noopener" data-key="${esc(c.key)}" title="${esc(s.label)}" style="--sc:var(--s-${c.section})">
      <div class="win-t"><span class="t">${esc(c.name)}</span>${n}</div>
      <div class="ph"><img loading="lazy" src="${esc(c.thumb)}" width="800" height="500" alt=""></div>
      <div class="why">${esc(text)}</div>
      <div class="foot">${who}</div>
    </a>`;
  }
  function render() {
    compute();
    $('#grid').style.setProperty('--cols', state.cols);
    $('#grid').innerHTML = shown.map(cardHTML).join('');
    $('#empty').hidden = shown.length > 0;
    $('#count').textContent = shown.length === ALL.length ? `${ALL.length} on the wall` : `${shown.length} of ${ALL.length}`;
    $$('#sort button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sort === state.sort)));
  }
  function applyCols() { $('#colN').textContent = state.cols; store.set(colKey(), state.cols); render(); }
  function pressSec() { $$('#pills button').forEach((p) => p.setAttribute('aria-pressed', String(p.dataset.sec === state.sec))); }

  // ---------- section tabs (one at a time; the active one again = all)
  $('#pills').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.sec = (b.dataset.sec === state.sec) ? '' : b.dataset.sec;
    pressSec();
    history.replaceState(null, '', state.sec ? '?sec=' + state.sec : location.pathname);
    render();
  });

  // ---------- controls
  let qT; $('#q').addEventListener('input', (e) => { clearTimeout(qT); qT = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 150); });
  $('#sort').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.sort === 'random' && state.sort === 'random') state.seed = Math.random();  // random again = shuffle again
    state.sort = b.dataset.sort; store.set('jev-sort', state.sort); render();
  });
  $('#colDec').addEventListener('click', () => { state.cols = Math.max(1, state.cols - 1); applyCols(); });
  $('#colInc').addEventListener('click', () => { state.cols = Math.min(6, state.cols + 1); applyCols(); });
  const root = document.documentElement, tb = $('#theme');
  const theme = () => root.getAttribute('data-theme') || 'light';
  const label = () => { tb.textContent = theme() === 'dark' ? 'Light' : 'Dark'; };
  if (store.get('jev-theme', null)) root.setAttribute('data-theme', store.get('jev-theme'));
  label();
  tb.addEventListener('click', () => { const t = theme() === 'dark' ? 'light' : 'dark'; root.setAttribute('data-theme', t); store.set('jev-theme', t); label(); });
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === 'Escape' && typing) { document.activeElement.blur(); return; }
    if (e.key === '/' && !typing) { e.preventDefault(); $('#q').focus({ preventScroll: true }); $('#q').scrollIntoView({ block: 'center' }); $('#q').select(); }
  });

  // ---------- the tagline types itself out once, like the OneJev banner
  const sub = $('#sub');
  if (sub && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const full = sub.textContent, cur = document.createElement('span');
    cur.className = 'cursor';
    let i = 0;
    sub.textContent = ''; sub.append(cur);
    const tick = () => { i++; sub.textContent = full.slice(0, i); sub.append(cur); if (i < full.length) setTimeout(tick, 30); };
    setTimeout(tick, 600);
  }

  // ---------- init
  const m = location.search.match(/[?&]q=([^&]+)/);
  if (m) { $('#q').value = decodeURIComponent(m[1].replace(/\+/g, ' ')); state.q = $('#q').value.trim(); }
  const ms = location.search.match(/[?&]sec=([a-z]+)/);
  if (ms && SEC[ms[1]]) state.sec = ms[1];
  if (!['curated', 'stars', 'newest', 'random'].includes(state.sort)) state.sort = 'curated';
  pressSec();
  applyCols();
})();
