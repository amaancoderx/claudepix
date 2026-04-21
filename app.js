/* ==========================================================
   Pixel Animation Library — app logic
   ========================================================== */

// Manifest: discovered animations. Each entry points to a file
// in /animations/. Category is derived from filename prefix
// (everything before the first underscore), capitalized.
// If no underscore → category = "Idle" (fallback rule).
const MANIFEST = [
  'idle_breathe.html',
  'idle_blink.html',
  'idle_look_around.html',
  'expression_wink.html',
  'expression_surprise.html',
  'expression_sleep.html',
  'dance_bounce.html',
  'dance_sway.html',
  'work_coding.html',
  'work_think.html',
  'dance_bounce_dj.html',
  'dance_sway_dj.html',
  'dance_djmix.html',
];

// Friendly display names for known prefixes; unknowns fall back to Title Case.
const CATEGORY_ALIASES = {
  'idle': 'Idle',
  'expression': 'Expressions',
  'dance': 'Dance',
  'work': 'Work',
  'code': 'Coding',
  'coding': 'Coding',
};

function deriveCategory(filename) {
  const base = filename.replace(/\.html?$/i, '');
  const prefix = base.split('_')[0];
  if (!base.includes('_')) return 'Idle';              // no prefix → Idle fallback
  if (CATEGORY_ALIASES[prefix]) return CATEGORY_ALIASES[prefix];
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

function displayName(filename) {
  return filename.replace(/\.html?$/i, '').replace(/_/g, ' ');
}

// ============================================================
// Load all animation files (fetch their source + inline metadata)
// ============================================================
async function loadAll() {
  // We also need the engine source (inlined later into standalone exports)
  const engineSrc = await (await fetch('animations/creature-engine.js')).text();

  const entries = await Promise.all(MANIFEST.map(async (file) => {
    const path = 'animations/' + file;
    let raw = '', description = '';
    try {
      const res = await fetch(path);
      raw = await res.text();
      const m = raw.match(/description:\s*"([^"]+)"/);
      if (m) description = m[1];
    } catch (e) {
      console.warn('Failed to load', path, e);
    }

    // Inline the engine so the exported file is fully self-contained.
    // This preserves the original PRESET code (with all computed frames)
    // exactly as-is — no extraction or re-serialization needed.
    const standalone = inlineEngine(raw, engineSrc);

    return {
      file,
      path,
      name: displayName(file),
      category: deriveCategory(file),
      description: description || 'Pixel creature animation preset.',
      code: standalone,   // <-- what Copy / View / Download all use
      frames: null,        // populated later from live iframe on load
    };
  }));
  return entries;
}

function inlineEngine(rawHtml, engineSrc) {
  // Replace the <script src="creature-engine.js"></script> reference with
  // the inlined engine source so the exported file works standalone.
  return rawHtml.replace(
    /<script\s+src=["']creature-engine\.js["']\s*><\/script>/i,
    '<script>\n' + engineSrc + '\n</script>'
  );
}

// ============================================================
// State
// ============================================================
const state = {
  animations: [],
  activeCat: 'All',
  query: '',
  previewAll: false,
  speed: 1,
};

// ============================================================
// DOM refs
// ============================================================
const catGroup   = document.getElementById('cat-group');
const cardsEl    = document.getElementById('cards');
const emptyEl    = document.getElementById('empty');
const qEl        = document.getElementById('q');
const resCount   = document.getElementById('result-count');
const crumbs     = document.getElementById('filter-crumbs');
const heroCount  = document.getElementById('hero-count');
const statPre    = document.getElementById('stat-presets');
const statCat    = document.getElementById('stat-cats');
const speedInput = document.getElementById('speed');
const speedLabel = document.getElementById('speed-label');
const previewAllBtn = document.getElementById('btn-preview-all');
const gridArea   = document.querySelector('.grid-area');

// ============================================================
// Rendering
// ============================================================
function render() {
  const CAT_RANK = { 'Work': 0, 'Dance': 1, 'Expressions': 2, 'Idle': 3 };

  // Filter
  const q = state.query.trim().toLowerCase();
  const list = state.animations.filter(a => {
    if (state.activeCat !== 'All' && a.category !== state.activeCat) return false;
    if (!q) return true;
    return (a.name.toLowerCase().includes(q)
         || a.description.toLowerCase().includes(q)
         || a.category.toLowerCase().includes(q));
  }).sort((a, b) => {
    const ra = CAT_RANK[a.category] ?? 99;
    const rb = CAT_RANK[b.category] ?? 99;
    return ra - rb;
  });

  // Empty state
  emptyEl.style.display = list.length ? 'none' : 'block';
  cardsEl.style.display = list.length ? '' : 'none';

  // Count / crumbs
  const totalMsg = `${list.length.toString().padStart(2, '0')} / ${state.animations.length.toString().padStart(2, '0')} presets shown`;
  resCount.textContent = totalMsg;
  const crumbsTxt = [
    state.activeCat !== 'All' ? `category: ${state.activeCat.toLowerCase()}` : null,
    q ? `query: "${q}"` : null,
  ].filter(Boolean).join('  ·  ') || 'showing all';
  crumbs.textContent = crumbsTxt;

  // Render cards
  cardsEl.innerHTML = '';
  list.forEach(a => cardsEl.appendChild(renderCard(a)));

  // Preview-all mode class on the grid area
  gridArea.classList.toggle('preview-all', state.previewAll);
}

function renderCard(a) {
  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `
    <div class="preview-wrap">
      <iframe src="${a.path}?speed=${state.speed}" loading="lazy" title="${a.name}"></iframe>
      <div class="corner"><span class="live"></span> live</div>
    </div>
    <div class="card-body">
      <h3 class="name">${a.name} <span class="cat-tag">${a.category}</span></h3>
      <p class="desc">${a.description}</p>
    </div>
    <div class="card-actions">
      <button data-action="copy">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><path d="M7 3V1.5H1.5V7H3"/></svg>
        copy
      </button>
      <button data-action="view">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z"/><circle cx="6" cy="6" r="1.5"/></svg>
        view
      </button>
      <button data-action="download">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 1v7M3 5.5 6 8.5 9 5.5M1.5 10.5h9"/></svg>
        download mp4
      </button>
    </div>
  `;

  // Pass speed to iframe once loaded; also capture live PRESET frames
  const iframe = card.querySelector('iframe');
  iframe.addEventListener('load', () => {
    syncIframeSpeed(iframe);
    try {
      const w = iframe.contentWindow;
      if (w.PRESET && w.PRESET.frames && w.PRESET.frames.length) {
        a.frames = w.PRESET.frames;
      } else if (w.FRAMES && w.FRAMES.length) {
        a.frames = w.FRAMES;
        if (w.PAL) a.palette = w.PAL;
      }
    } catch (e) {}
  });

  card.querySelectorAll('.card-actions button').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.action;
      if (act === 'copy') doCopy(a, btn);
      else if (act === 'view') openModal(a);
      else if (act === 'download') doDownload(a);
    });
  });

  return card;
}

function renderCategories() {
  // Dynamic detection — only categories that actually appear.
  // "Idle" is always shown even if empty (fallback).
  const counts = new Map();
  counts.set('Idle', 0); // ensure Idle always visible
  state.animations.forEach(a => {
    counts.set(a.category, (counts.get(a.category) || 0) + 1);
  });
  const CATEGORY_ORDER = ['All', 'Work', 'Dance', 'Expressions', 'Idle'];
  const remaining = Array.from(counts.keys())
    .filter(k => !CATEGORY_ORDER.includes(k))
    .sort();
  const ordered = [...CATEGORY_ORDER, ...remaining];

  catGroup.querySelectorAll('.cat').forEach(n => n.remove());
  ordered.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat' + (state.activeCat === cat ? ' active' : '');
    const count = cat === 'All' ? state.animations.length : (counts.get(cat) || 0);
    btn.innerHTML = `<span>${cat.toLowerCase()}</span><span class="count">${String(count).padStart(2, '0')}</span>`;
    btn.addEventListener('click', () => {
      state.activeCat = cat;
      renderCategories();
      render();
    });
    catGroup.appendChild(btn);
  });
}

// ============================================================
// Iframe speed sync — tweak the creature-engine playback speed
// across every preview whenever the slider changes.
// ============================================================
function syncIframeSpeed(iframe) {
  try {
    const w = iframe.contentWindow;
    // The engine exposes mount(); each preview file stores its api on
    // window.__api. We'll patch files to do that, but we can also set
    // a global on the iframe that the engine checks. Simpler: post a msg.
    w.postMessage({ type: '__set_speed', speed: state.speed }, '*');
  } catch (e) {}
}
function syncAllIframes() {
  document.querySelectorAll('.preview-wrap iframe').forEach(syncIframeSpeed);
}

// ============================================================
// Clipboard helper — tries modern API, falls back to execCommand
// ============================================================
function copyText(text, msg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast(msg)).catch(() => execCopy(text, msg));
  } else {
    execCopy(text, msg);
  }
}
function execCopy(text, msg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); toast(msg); } catch (e) { toast('clipboard unavailable'); }
  document.body.removeChild(ta);
}

// ============================================================
// Copy / Download / View-code actions
// ============================================================
async function doCopy(a, btn) {
  const orig = btn.innerHTML;
  btn.innerHTML = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6.5 5 9 10 3"/></svg> <span class="copied">copied</span>`;
  setTimeout(() => { btn.innerHTML = orig; }, 1400);
  copyText(a.code, `copied ${a.name}.html`);
}

function doDownloadHTML(a) {
  const blob = new Blob([a.code], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = a.file;
  link.click();
  URL.revokeObjectURL(url);
  toast(`downloaded ${a.file}`);
}

async function doDownload(a) {
  // If frames weren't captured yet, try pulling from the live iframe
  if (!a.frames || !a.frames.length) {
    try {
      const iframe = [...document.querySelectorAll('iframe')].find(f => f.src.includes(a.file));
      const w = iframe && iframe.contentWindow;
      if (w) {
        if (w.PRESET && w.PRESET.frames && w.PRESET.frames.length) {
          a.frames = w.PRESET.frames;
        } else if (w.FRAMES && w.FRAMES.length) {
          a.frames = w.FRAMES;
          if (w.PAL) a.palette = w.PAL;
        }
      }
    } catch (e) {}
  }

  if (!a.frames || !a.frames.length) {
    doDownloadHTML(a);
    return;
  }

  toast(`recording ${a.name}…`);

  const SIZE = 400;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const CELL = SIZE / 20;
  const pal = a.palette || ['transparent', '#CD7F6A', '#0f0f0f'];

  function paintFrame(frame) {
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 20; c++) {
        const v = frame[r][c];
        if (v > 0) {
          const color = pal[v];
          if (color && color !== 'transparent') {
            ctx.fillStyle = color;
            ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
          }
        }
      }
    }
  }

  const MIME_CANDIDATES = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm',
  ];
  const mimeType = MIME_CANDIDATES.find(t => {
    try { return MediaRecorder.isTypeSupported(t); } catch { return false; }
  }) || 'video/webm';
  const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = a.file.replace(/\.html?$/i, `.${ext}`);
    link.click();
    URL.revokeObjectURL(url);
    toast(`downloaded ${a.name}.${ext}`);
  };

  const LOOPS = 3;
  const speed = state.speed;
  const frames = a.frames;

  paintFrame(frames[0].frame || (window.PixelEngine && window.PixelEngine.CREATURE));
  recorder.start();

  let fi = 0;
  let loop = 0;

  function scheduleNext() {
    const hold = Math.max(16, Math.round(frames[fi].hold / speed));
    setTimeout(() => {
      fi++;
      if (fi >= frames.length) { fi = 0; loop++; }
      if (loop >= LOOPS) { recorder.stop(); return; }
      paintFrame(frames[fi].frame || (window.PixelEngine && window.PixelEngine.CREATURE));
      scheduleNext();
    }, hold);
  }
  scheduleNext();
}

// ============================================================
// Modal — view code
// ============================================================
const modal       = document.getElementById('modal');
const modalName   = document.getElementById('modal-name');
const modalCat    = document.getElementById('modal-cat');
const modalCode   = document.getElementById('modal-code');
const modalClose  = document.getElementById('modal-close');
const modalCopy   = document.getElementById('modal-copy');
const modalDl     = document.getElementById('modal-download');

let currentModalAnim = null;

function openModal(a) {
  currentModalAnim = a;
  modalName.textContent = a.name;
  modalCat.textContent = a.category;
  modalCode.innerHTML = highlight(a.code);
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// Intercept manual Ctrl+C / right-click copy from the code block
// so users always get clean, untagged source — never highlighted HTML.
modalCode.addEventListener('copy', (e) => {
  if (!currentModalAnim) return;
  e.preventDefault();
  e.clipboardData.setData('text/plain', currentModalAnim.code);
  toast('copied to clipboard');
});
function closeModal() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
  currentModalAnim = null;
}
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
modalCopy.addEventListener('click', () => {
  if (!currentModalAnim) return;
  copyText(currentModalAnim.code, 'copied to clipboard');
});
modalDl.addEventListener('click', () => { if (currentModalAnim) doDownload(currentModalAnim); });

// Very small HTML/JS syntax highlighter (escapes first, then colorizes)
function highlight(src) {
  const esc = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="t-com">$1</span>')
    .replace(/(\/\*[\s\S]*?\*\/|\/\/.*)/g, '<span class="t-com">$1</span>')
    .replace(/(&lt;\/?[\w-]+)/g, '<span class="t-tag">$1</span>')
    .replace(/"([^"\n]*)"/g, '<span class="t-str">"$1"</span>')
    .replace(/\b(const|let|var|function|return|if|else|for|while|new|this|window|document|async|await)\b/g, '<span class="t-kw">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="t-num">$1</span>');
}

// ============================================================
// Toast
// ============================================================
const toastEl = document.getElementById('toast');
const toastMsg = document.getElementById('toast-msg');
let toastT;
function toast(msg) {
  toastMsg.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

// ============================================================
// Mobile sidebar toggle
// ============================================================
const menuBtn     = document.getElementById('menu-btn');
const sideEl      = document.querySelector('.side');
const sideOverlay = document.getElementById('side-overlay');

function openSidebar() {
  sideEl.classList.add('open');
  sideOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  sideEl.classList.remove('open');
  sideOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

menuBtn.addEventListener('click', () => {
  sideEl.classList.contains('open') ? closeSidebar() : openSidebar();
});
sideOverlay.addEventListener('click', closeSidebar);

// Close sidebar when a category is picked on mobile
document.getElementById('cat-group').addEventListener('click', () => {
  if (window.innerWidth <= 767) closeSidebar();
});

// ============================================================
// Search + shortcuts
// ============================================================
qEl.addEventListener('input', e => { state.query = e.target.value; render(); });

window.addEventListener('keydown', (e) => {
  // '/' focuses search unless already typing in an input
  if (e.key === '/' && document.activeElement !== qEl) {
    e.preventDefault(); qEl.focus(); qEl.select();
  } else if (e.key === 'Escape') {
    if (modal.classList.contains('open')) { closeModal(); return; }
    if (state.query || state.activeCat !== 'All') {
      state.query = ''; qEl.value = '';
      state.activeCat = 'All';
      renderCategories(); render();
    }
  } else if (e.key === 'p' && document.activeElement !== qEl) {
    togglePreviewAll();
  }
});

// ============================================================
// Preview-all mode
// ============================================================
function togglePreviewAll() {
  state.previewAll = !state.previewAll;
  previewAllBtn.classList.toggle('primary', state.previewAll);
  previewAllBtn.classList.toggle('action', true);
  document.getElementById('tw-preview-all').checked = state.previewAll;
  render();
}
previewAllBtn.addEventListener('click', togglePreviewAll);

// ============================================================
// Speed slider
// ============================================================
speedInput.addEventListener('input', (e) => {
  state.speed = parseFloat(e.target.value);
  speedLabel.textContent = state.speed.toFixed(2) + '×';
  syncAllIframes();
});

// ============================================================
// Tweaks
// ============================================================
const TWEAKS = /*EDITMODE-BEGIN*/{
  "accent": "#CD7F6A",
  "previewAll": false,
  "dense": false
}/*EDITMODE-END*/;

const tweaksPanel = document.getElementById('tweaks');
const twPreviewAll = document.getElementById('tw-preview-all');
const twDense = document.getElementById('tw-dense');

function applyTweaks(t) {
  document.documentElement.style.setProperty('--accent', t.accent);
  // update hl + tag borders — derive a 12% opacity version
  document.documentElement.style.setProperty('--hl', hexToRgba(t.accent, 0.12));
  state.previewAll = !!t.previewAll;
  previewAllBtn.classList.toggle('primary', state.previewAll);
  document.body.classList.toggle('dense', !!t.dense);
  if (t.dense) {
    cardsEl.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
  } else {
    cardsEl.style.gridTemplateColumns = '';
  }
  document.querySelectorAll('.tweaks .sw').forEach(s =>
    s.classList.toggle('active', s.dataset.color.toLowerCase() === t.accent.toLowerCase()));
  twPreviewAll.checked = state.previewAll;
  twDense.checked = !!t.dense;
}
function hexToRgba(hex, a) {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0,2), 16), g = parseInt(m.slice(2,4), 16), b = parseInt(m.slice(4,6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function updateTweaks(partial) {
  Object.assign(TWEAKS, partial);
  applyTweaks(TWEAKS);
  try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: partial }, '*'); } catch (e) {}
}
document.querySelectorAll('.tweaks .sw').forEach(sw => {
  sw.addEventListener('click', () => updateTweaks({ accent: sw.dataset.color }));
});
twPreviewAll.addEventListener('change', e => {
  updateTweaks({ previewAll: e.target.checked });
  render();
});
twDense.addEventListener('change', e => updateTweaks({ dense: e.target.checked }));
applyTweaks(TWEAKS);

window.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === '__activate_edit_mode') {
    tweaksPanel.classList.add('open');
    tweaksPanel.setAttribute('aria-hidden', 'false');
  } else if (d.type === '__deactivate_edit_mode') {
    tweaksPanel.classList.remove('open');
    tweaksPanel.setAttribute('aria-hidden', 'true');
  }
});
// Register the listener first, then announce availability (spec order).
try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}

// ============================================================
// Boot
// ============================================================
(async function init() {
  const list = await loadAll();
  state.animations = list;
  // Stats
  const catSet = new Set(list.map(a => a.category));
  heroCount.textContent = list.length;
  statPre.textContent = list.length;
  statCat.textContent = catSet.size;
  renderCategories();
  render();
})();
