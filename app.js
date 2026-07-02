// ════════════════════════════════════
// BOGAVANTE.AI — APP
// ════════════════════════════════════

// ── Supabase config ──
const SUPABASE_URL = 'https://gbnppneilzoltxksngqg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VboDDk1pn7us5GvaTcsEUA_tZgqe0Bj';

const sb = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ════════════════════════════════════
// FALLBACK SEED DATA
// Used only if Supabase is unreachable, so the site never shows an empty map.
// ════════════════════════════════════
const SEED_SPOTS = [
  { id:'1',  name:"The Stoned Crab",           description:"Best Lobster in the Keys",               price:2, country:"USA",         lastVisited:"2025-07-15", lat:24.7136,           lng:-81.0785,           directionsUrl:"https://maps.app.goo.gl/rkJcZKvjPFn9df6k6", authorName:"ignacio" },
  { id:'2',  name:"Carmín",                    description:"Very bad Lobster, Taste Poorly.",        price:1, country:"Puerto Rico", lastVisited:"2024-04-15", lat:18.4578102,        lng:-65.9861679,        directionsUrl:"https://maps.app.goo.gl/N4hiwDeJFzzavsQu6", authorName:"ignacio" },
  { id:'3',  name:"Hoy Como Ayer",             description:"Great Lobster",                          price:1, country:"Puerto Rico", lastVisited:"2022-12-15", lat:18.13894,          lng:-67.18094,          directionsUrl:"https://maps.app.goo.gl/PZjXokodTxpbyG8CA", authorName:"ignacio" },
  { id:'4',  name:"Los Montes de Galicia",     description:"Expensive Lobster and very bad taste.",  price:3, country:"Spain",       lastVisited:"2026-02-15", lat:40.434849,         lng:-3.668375,          directionsUrl:"https://maps.app.goo.gl/2BarrHgRBNxBKqf39", authorName:"ignacio" },
  { id:'5',  name:"Casa Gallega",              description:"Best Lobster in Madrid.",                price:3, country:"Spain",       lastVisited:"2025-12-15", lat:40.4171263,        lng:-3.7073245,         directionsUrl:"https://maps.app.goo.gl/DVPQnBqT9rFXN6qW6", authorName:"ignacio" },
  { id:'6',  name:"S'Amarador",                description:"Great Menorcan Lobster.",                price:2, country:"Spain",       lastVisited:"2024-09-15", lat:40.0018990,        lng:3.8359444,          directionsUrl:"https://maps.app.goo.gl/kaweAS8bsQnsd4UAA", authorName:"ignacio" },
  { id:'7',  name:"Boater's Grill",            description:"Amazing Lobster, great price.",          price:1, country:"USA",         lastVisited:"2025-12-15", lat:25.675467,         lng:-80.161461,         directionsUrl:"https://maps.app.goo.gl/zEoVxFSRpAzHvoTR8", authorName:"ignacio" },
  { id:'8',  name:"Luke's Lobster",            description:"You can taste this isn't fresh Lobster.",price:2, country:"USA",         lastVisited:"2023-12-15", lat:40.7594852,        lng:-73.9799833,        directionsUrl:"https://maps.app.goo.gl/XjVQTa5LyJc5PXoH6", authorName:"ignacio" },
  { id:'9',  name:"Cavalier South Beach Hotel",description:"Great Lobster Raviolis 🍝.",             price:1, country:"USA",         lastVisited:"2025-07-15", lat:25.7844410,        lng:-80.1300338,        directionsUrl:"https://maps.app.goo.gl/GLrGp6QUX14Ty7um9", authorName:"ignacio" },
  { id:'10', name:"Sa Llagosta",               description:"",                                       price:3, country:"Spain",       lastVisited:null,         lat:40.0557959729479,  lng:4.131086779679226,  directionsUrl:"https://maps.app.goo.gl/hCWHuTKbfwukH3tr8", authorName:"ignacio" },
  { id:'11', name:"Marisquería D'Berto",       description:"",                                       price:2, country:"Spain",       lastVisited:"2021-09-15", lat:42.485767,         lng:-8.860930,          directionsUrl:"https://maps.app.goo.gl/x8oQP87XkGoVjryg7", authorName:"ignacio" },
  { id:'12', name:"Juanito Kojua",             description:"",                                       price:2, country:"Spain",       lastVisited:"2021-09-15", lat:43.323593973800946, lng:-1.986100345313789, directionsUrl:"https://maps.app.goo.gl/bVkeoLH1a7qLjyAK6", authorName:"ignacio" },
];

// ════════════════════════════════════
// STATE
// ════════════════════════════════════
let SPOTS = [];                 // active dataset (Supabase or seed)
let RATINGS = {};               // spotId -> { sum, count, mine }
let selectedId    = null;
let isDark        = localStorage.getItem('boga-theme') === 'dark';
let searchQuery   = '';
let priceFilter   = null;       // null | 1 | 2 | 3
let countryFilter = null;       // null | country string
let sortBy        = 'name';
let currentPopup  = null;
let session       = null;      // supabase session
let profile       = null;      // { id, username }
let usingFallback = false;

// picking location state
let picking = false;
let pickedLatLng = null;
let pickMarker = null;

const $ = id => document.getElementById(id);

// ════════════════════════════════════
// MAP INIT — clamped to the world so no gray bands ever show
// ════════════════════════════════════
const WORLD_BOUNDS = L.latLngBounds([[-85, -180], [85, 180]]);

const map = L.map('map', {
  center: [22, -20],
  zoom: 3,
  zoomControl: false,
  maxBounds: WORLD_BOUNDS,
  maxBoundsViscosity: 1.0,
});
L.control.zoom({ position: 'topright' }).addTo(map);

// Never allow zooming out past "the whole world fills the viewport"
function updateMinZoom() {
  const z = map.getBoundsZoom(WORLD_BOUNDS, true);
  map.setMinZoom(z);
  if (map.getZoom() < z) map.setZoom(z);
}
map.on('resize', updateMinZoom);
updateMinZoom();

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png';
const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png';
let tileLayer = L.tileLayer(TILE_LIGHT, { maxZoom: 19, subdomains: 'abcd' }).addTo(map);

const LocateControl = L.Control.extend({
  options: { position: 'topright' },
  onAdd() {
    const btn = L.DomUtil.create('button', 'locate-btn');
    btn.title = 'My location';
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`;
    L.DomEvent.on(btn, 'click', e => { L.DomEvent.stopPropagation(e); map.locate({ setView: true, maxZoom: 13 }); });
    return btn;
  }
});
new LocateControl().addTo(map);

// ════════════════════════════════════
// HELPERS
// ════════════════════════════════════
function priceStr(p) { return '$'.repeat(p); }

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function safeUrl(u, lat, lng) {
  if (u && /^https:\/\//i.test(u)) return u;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Not visited yet';
  const d = new Date(dateStr), now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months <= 0) return 'this month';
  if (months === 1) return '1 month ago';
  if (months < 24) return `${months} months ago`;
  return `${Math.floor(months / 12)} years ago`;
}

// Deterministic "random" avatar per username
const AVATARS = ['🦞','🦀','🦐','🦑','🐙','🐠','🐚','⚓️','🧜‍♂️','🌊','🐟','🛥️'];
function avatarFor(username) {
  let h = 0;
  for (const c of String(username || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATARS[h % AVATARS.length];
}

function ratingOf(id) {
  const r = RATINGS[id];
  if (!r || !r.count) return { avg: 0, count: 0, mine: null };
  return { avg: r.sum / r.count, count: r.count, mine: r.mine ?? null };
}

function getFiltered() {
  const q = searchQuery.toLowerCase();
  return SPOTS.filter(loc =>
    (!q || loc.name.toLowerCase().includes(q) || (loc.description || '').toLowerCase().includes(q) || (loc.authorName || '').toLowerCase().includes(q))
    && (priceFilter === null || loc.price === priceFilter)
    && (countryFilter === null || loc.country === countryFilter)
  );
}

function getSorted(list) {
  const arr = [...list];
  switch (sortBy) {
    case 'price':  arr.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name)); break;
    case 'rating': arr.sort((a, b) => ratingOf(b.id).avg - ratingOf(a.id).avg || ratingOf(b.id).count - ratingOf(a.id).count); break;
    case 'visit':  arr.sort((a, b) => (b.lastVisited || '').localeCompare(a.lastVisited || '')); break;
    default:       arr.sort((a, b) => a.name.localeCompare(b.name));
  }
  return arr;
}

function worldBounds(locs) {
  return locs.length ? locs.map(l => [l.lat, l.lng]) : null;
}

function showToast(msg, ms = 2400) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('visible'), ms);
}

// ════════════════════════════════════
// DATA LOADING (Supabase with seed fallback)
// ════════════════════════════════════
function mapRow(r) {
  return {
    id: String(r.id),
    name: r.name,
    description: r.description || '',
    price: r.price,
    country: r.country,
    lat: r.lat, lng: r.lng,
    directionsUrl: r.directions_url,
    lastVisited: r.last_visited,
    authorName: r.author_name,
  };
}

function setListLoading() {
  $('spotsCount').textContent = '…';
  $('spotsList').innerHTML = `<div class="empty-state"><div class="loader"></div>Casting the nets…</div>`;
}

async function loadData() {
  if (!sb) { SPOTS = SEED_SPOTS; usingFallback = true; return; }
  try {
    const { data, error } = await sb.from('spots').select('*');
    if (error) throw error;
    SPOTS = data.map(mapRow);
    usingFallback = false;
    await loadRatings();
  } catch (e) {
    console.warn('Supabase unavailable, using seed data:', e.message || e);
    SPOTS = SEED_SPOTS;
    usingFallback = true;
  }
}

async function loadRatings() {
  if (!sb || usingFallback) return;
  try {
    const { data, error } = await sb.from('ratings').select('spot_id, user_id, stars');
    if (error) throw error;
    RATINGS = {};
    const uid = session?.user?.id;
    data.forEach(r => {
      const id = String(r.spot_id);
      if (!RATINGS[id]) RATINGS[id] = { sum: 0, count: 0, mine: null };
      RATINGS[id].sum += r.stars;
      RATINGS[id].count += 1;
      if (uid && r.user_id === uid) RATINGS[id].mine = r.stars;
    });
  } catch (e) {
    console.warn('Could not load ratings:', e.message || e);
  }
}

// ════════════════════════════════════
// MARKERS
// ════════════════════════════════════
const leafletMarkers = {};

function markerHtml(selected) {
  const ring = selected
    ? `<div style="position:absolute;inset:-5px;border-radius:50%;border:3px solid #ffb347;pointer-events:none;"></div>`
    : '';
  return `<div style="position:relative;width:36px;height:36px;">${ring}<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#2b2118,#1a140f);display:flex;align-items:center;justify-content:center;font-size:17px;cursor:pointer;border:2px solid #DE6E38;box-shadow:0 2px 8px rgba(0,0,0,0.35);transform:${selected?'scale(1.12)':'scale(1)'};transition:transform 0.2s;">🦞</div></div>`;
}

function makeIcon(selected) {
  return L.divIcon({ className: '', html: markerHtml(selected), iconSize: [36, 36], iconAnchor: [18, 18] });
}

function buildMarkers() {
  Object.values(leafletMarkers).forEach(m => m.remove());
  Object.keys(leafletMarkers).forEach(k => delete leafletMarkers[k]);
  getFiltered().forEach(loc => {
    const m = L.marker([loc.lat, loc.lng], { icon: makeIcon(loc.id === selectedId) }).addTo(map);
    m.on('click', e => {
      if (picking) return;
      L.DomEvent.stopPropagation(e);
      handleSelect(loc.id);
    });
    leafletMarkers[loc.id] = m;
  });
}

function updateMarkerIcons() {
  Object.entries(leafletMarkers).forEach(([mid, m]) => m.setIcon(makeIcon(mid === selectedId)));
}

// ════════════════════════════════════
// POPUP
// ════════════════════════════════════
function starsHtml(loc) {
  const { avg, count, mine } = ratingOf(loc.id);
  const display = mine ?? Math.round(avg);
  let btns = '';
  for (let i = 1; i <= 5; i++) {
    btns += `<button class="star-btn${i <= display ? ' lit' : ''}" onclick="rateSpot('${escHtml(loc.id)}',${i})" title="${i}">🦞</button>`;
  }
  let info;
  if (!session) info = count ? `${avg.toFixed(1)} · ${count} rating${count === 1 ? '' : 's'}` : 'Sign in to rate';
  else info = count ? `${avg.toFixed(1)} · ${count} rating${count === 1 ? '' : 's'}` : 'No ratings yet';
  return `<div class="popup-rating"><div class="star-row">${btns}</div><span class="popup-rating-info">${info}</span></div>`;
}

function buildPopupHtml(loc) {
  const author = loc.authorName
    ? `<span class="author-badge">${avatarFor(loc.authorName)} ${escHtml('@' + loc.authorName)}</span>` : '';
  return `
  <div class="popup-card">
    <button class="popup-close-btn" onclick="closePopup()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="popup-header">
      <div class="popup-icon-box">🦞</div>
      <div class="popup-header-info">
        <div class="popup-name-row">
          <span class="popup-name">${escHtml(loc.name)}</span>
          <span class="popup-price price-${loc.price}">${priceStr(loc.price)}</span>
        </div>
        <div class="popup-badges">
          <span class="popup-badge">${escHtml(loc.country)}</span>
          ${author}
        </div>
      </div>
    </div>
    ${loc.description ? `<p class="popup-desc">${escHtml(loc.description)}</p>` : ''}
    ${starsHtml(loc)}
    <hr class="popup-divider">
    <div class="popup-footer">
      <span class="popup-time">${timeAgo(loc.lastVisited)}</span>
      <div class="popup-actions">
        <button class="popup-share" onclick="shareSpot('${escHtml(loc.id)}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          Share
        </button>
        <a class="popup-dir" href="${escHtml(safeUrl(loc.directionsUrl, loc.lat, loc.lng))}" target="_blank" rel="noopener">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Directions
        </a>
      </div>
    </div>
  </div>`;
}

function openPopup(loc) {
  if (currentPopup) { map.closePopup(currentPopup); currentPopup = null; }
  currentPopup = L.popup({
    className: 'spot-popup',
    closeButton: false,
    autoClose: false,
    closeOnClick: false,
    closeOnEscapeKey: true,
    maxWidth: 340,
    offset: [0, -20],
  })
  .setLatLng([loc.lat, loc.lng])
  .setContent(buildPopupHtml(loc))
  .openOn(map);
}

function refreshPopup() {
  if (!currentPopup || !selectedId) return;
  const loc = SPOTS.find(l => l.id === selectedId);
  if (loc) currentPopup.setContent(buildPopupHtml(loc));
}

function closePopup() {
  if (currentPopup) { map.closePopup(currentPopup); currentPopup = null; }
  selectedId = null;
  updateMarkerIcons();
  renderList();
  const pts = worldBounds(getFiltered());
  if (pts) map.fitBounds(pts, { padding: [60, 60], maxZoom: 12 });
}
window.closePopup = closePopup;

// ── Share ──
window.shareSpot = function (id) {
  const url = `${location.origin}${location.pathname}?spot=${encodeURIComponent(id)}`;
  const done = () => showToast('Link copied! 🦞');
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done, done);
  else done();
};

// ── Rate ──
window.rateSpot = async function (id, stars) {
  if (!session || !profile) { openAuth(); return; }
  if (usingFallback || !sb) return;
  const prev = RATINGS[id] ? { ...RATINGS[id] } : null;
  const r = RATINGS[id] || (RATINGS[id] = { sum: 0, count: 0, mine: null });
  if (r.mine !== null) { r.sum = r.sum - r.mine + stars; }
  else { r.sum += stars; r.count += 1; }
  r.mine = stars;
  refreshPopup(); renderList();
  const { error } = await sb.from('ratings').upsert({ spot_id: id, user_id: session.user.id, stars });
  if (error) {
    if (prev) RATINGS[id] = prev; else delete RATINGS[id];
    refreshPopup(); renderList();
    showToast('Something went wrong. Try again.');
  } else {
    showToast('Rating saved 🦞', 1400);
  }
};

// ════════════════════════════════════
// FILTER PILLS
// ════════════════════════════════════
function renderFilters() {
  const priceWrap = $('priceFilters');
  const prices = [null, 1, 2, 3];
  priceWrap.innerHTML = prices.map(p => {
    const n = p === null ? SPOTS.length : SPOTS.filter(s => s.price === p).length;
    const label = p === null ? 'All' : priceStr(p);
    return `<button class="pill${priceFilter === p ? ' active' : ''}" data-price="${p ?? ''}">${label} <span class="pill-count">${n}</span></button>`;
  }).join('');
  priceWrap.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const v = pill.dataset.price;
      priceFilter = v === '' ? null : parseInt(v);
      onFiltersChanged();
    });
  });

  const countries = [...new Set(SPOTS.map(s => s.country).filter(Boolean))].sort();
  const cWrap = $('countryFilters');
  cWrap.innerHTML = [`<button class="pill${countryFilter === null ? ' active' : ''}" data-country="">🌍 All</button>`]
    .concat(countries.map(c =>
      `<button class="pill${countryFilter === c ? ' active' : ''}" data-country="${escHtml(c)}">${escHtml(c)} <span class="pill-count">${SPOTS.filter(s => s.country === c).length}</span></button>`
    )).join('');
  cWrap.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      countryFilter = pill.dataset.country === '' ? null : pill.dataset.country;
      onFiltersChanged();
    });
  });

  // country datalist for the add-spot form
  $('countryList').innerHTML = countries.map(c => `<option value="${escHtml(c)}">`).join('');
}

function onFiltersChanged() {
  if (currentPopup) { map.closePopup(currentPopup); currentPopup = null; }
  selectedId = null;
  renderFilters();
  buildMarkers();
  renderList();
  const pts = worldBounds(getFiltered());
  if (pts) map.fitBounds(pts, { padding: [60, 60], maxZoom: 12 });
}

// ════════════════════════════════════
// RENDER LIST
// ════════════════════════════════════
function renderList() {
  const filtered  = getSorted(getFiltered());
  const displayed = selectedId ? filtered.filter(l => l.id === selectedId) : filtered;
  const n = displayed.length;

  $('spotsCount').textContent = `${n} ${n === 1 ? 'spot' : 'spots'}`;

  if (!n) {
    $('spotsList').innerHTML = `<div class="empty-state"><span class="empty-emoji">🦞</span>No lobsters here… try other filters</div>`;
    return;
  }

  $('spotsList').innerHTML = displayed.map(loc => {
    const { avg, count } = ratingOf(loc.id);
    const rating = count
      ? `<span class="rating-badge">🦞 ${avg.toFixed(1)} <span class="rating-count">(${count})</span></span>` : '';
    const author = loc.authorName
      ? `<span class="author-badge">${avatarFor(loc.authorName)} ${escHtml('@' + loc.authorName)}</span>` : '';
    return `
    <div class="spot-card${selectedId === loc.id ? ' selected' : ''}" data-id="${escHtml(loc.id)}">
      <div class="card-top">
        <span class="card-icon">🦞</span>
        <div class="card-body">
          <div class="card-name-row">
            <span class="card-name">${escHtml(loc.name)}</span>
            <span class="card-price price-${loc.price}">${priceStr(loc.price)}</span>
          </div>
          ${loc.description ? `<div class="card-desc">${escHtml(loc.description)}</div>` : ''}
          <div class="card-meta-row">
            <span class="card-badge">${escHtml(loc.country)}</span>
            ${author}
            ${rating}
          </div>
        </div>
      </div>
      <div class="card-bottom">
        <span class="card-time">${timeAgo(loc.lastVisited)}</span>
        <a class="directions-link" href="${escHtml(safeUrl(loc.directionsUrl, loc.lat, loc.lng))}" target="_blank" rel="noopener" data-directions>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          <span class="dir-full">Directions</span><span class="dir-short">Dir</span>
        </a>
      </div>
    </div>`;
  }).join('');

  $('spotsList').querySelectorAll('.spot-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('[data-directions]')) return;
      handleSelect(card.dataset.id);
    });
  });
}

// ════════════════════════════════════
// SELECT / DESELECT
// ════════════════════════════════════
function handleSelect(id) {
  if (selectedId === id && currentPopup) { closePopup(); return; }
  selectedId = id;
  const loc = SPOTS.find(l => l.id === id);
  if (!loc) return;

  map.flyTo([loc.lat, loc.lng], 14, { duration: 1.1 });
  updateMarkerIcons();
  renderList();
  openPopup(loc);
  closeMobileSidebar();
}

map.on('click', e => {
  if (picking) { onPickMapClick(e); return; }
  if (currentPopup || selectedId !== null) closePopup();
});

// ════════════════════════════════════
// DARK MODE
// ════════════════════════════════════
function applyTheme(dark) {
  isDark = dark;
  localStorage.setItem('boga-theme', dark ? 'dark' : 'light');
  document.body.classList.toggle('dark', dark);
  document.querySelectorAll('.moon-icon').forEach(el => el.style.display = dark ? 'none' : '');
  document.querySelectorAll('.sun-icon').forEach(el => el.style.display = dark ? '' : 'none');
  tileLayer.setUrl(dark ? TILE_DARK : TILE_LIGHT);
  refreshPopup();
}
$('themeBtn').addEventListener('click', () => applyTheme(!isDark));
$('mobileThemeBtn').addEventListener('click', () => applyTheme(!isDark));

// ════════════════════════════════════
// REFRESH
// ════════════════════════════════════
async function doRefresh() {
  if (currentPopup) { map.closePopup(currentPopup); currentPopup = null; }
  selectedId  = null;
  searchQuery = '';
  priceFilter = null;
  countryFilter = null;
  $('searchInput').value = '';
  setListLoading();
  await loadData();
  renderFilters();
  buildMarkers();
  renderList();
  const pts = worldBounds(SPOTS);
  if (pts) map.fitBounds(pts, { padding: [60, 60], maxZoom: 12 });
}

const refreshIcon = $('refreshIcon');
refreshIcon.parentElement.addEventListener('click', () => {
  refreshIcon.classList.add('spinning');
  refreshIcon.addEventListener('animationend', () => refreshIcon.classList.remove('spinning'), { once: true });
  doRefresh();
});

// ════════════════════════════════════
// SEARCH & SORT
// ════════════════════════════════════
$('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value;
  if (currentPopup) { map.closePopup(currentPopup); currentPopup = null; }
  selectedId = null;
  buildMarkers();
  renderList();
});

$('sortSelect').addEventListener('change', e => {
  sortBy = e.target.value;
  renderList();
});

// ════════════════════════════════════
// MOBILE SIDEBAR
// ════════════════════════════════════
function openMobileSidebar() {
  $('sidebar').classList.add('open');
  $('sidebarBackdrop').classList.add('open');
}
function closeMobileSidebar() {
  $('sidebar').classList.remove('open');
  $('sidebarBackdrop').classList.remove('open');
}
$('hamburgerBtn').addEventListener('click', () => {
  $('sidebar').classList.contains('open') ? closeMobileSidebar() : openMobileSidebar();
});
$('sidebarBackdrop').addEventListener('click', closeMobileSidebar);

// ════════════════════════════════════
// ABOUT MODAL
// ════════════════════════════════════
$('aboutBtn').addEventListener('click', () => $('aboutOverlay').classList.add('open'));
$('modalCloseX').addEventListener('click', () => $('aboutOverlay').classList.remove('open'));
$('modalCloseBtn').addEventListener('click', () => $('aboutOverlay').classList.remove('open'));
$('aboutOverlay').addEventListener('click', e => {
  if (e.target === $('aboutOverlay')) $('aboutOverlay').classList.remove('open');
});

// ════════════════════════════════════
// AUTH (Supabase magic link, no password)
// ════════════════════════════════════
function authError(msg) {
  const el = $('authError');
  el.textContent = msg || '';
  el.classList.toggle('visible', !!msg);
}

function showAuthStep(step) {
  ['authStepEmail', 'authStepSent', 'authStepUsername'].forEach(id => {
    $(id).style.display = id === step ? '' : 'none';
  });
  authError('');
}

function openAuth() {
  closeMobileSidebar();
  $('authOverlay').classList.add('open');
  if (session && !profile) showAuthStep('authStepUsername');
  else showAuthStep('authStepEmail');
}
function closeAuth() { $('authOverlay').classList.remove('open'); authError(''); }

$('authBtn').addEventListener('click', openAuth);
$('mobileAuthBtn').addEventListener('click', () => {
  if (session && profile) { showToast(`${avatarFor(profile.username)} @${profile.username}`); return; }
  openAuth();
});
$('authModalClose').addEventListener('click', closeAuth);
$('authOverlay').addEventListener('click', e => { if (e.target === $('authOverlay')) closeAuth(); });
$('authBackBtn').addEventListener('click', () => showAuthStep('authStepEmail'));

$('authSendLinkBtn').addEventListener('click', sendMagicLink);
$('authEmail').addEventListener('keydown', e => { if (e.key === 'Enter') sendMagicLink(); });

async function sendMagicLink() {
  const email = $('authEmail').value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { authError('Enter a valid email.'); return; }
  if (!sb) { authError('Something went wrong. Try again.'); return; }
  const btn = $('authSendLinkBtn');
  btn.disabled = true; btn.textContent = 'Sending…';
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // On production this is https://bogavante.ai — the link brings you straight back
      emailRedirectTo: location.origin + location.pathname,
    },
  });
  btn.disabled = false; btn.textContent = 'Send magic link';
  if (error) { authError(error.message); return; }
  $('authEmailEcho').textContent = email;
  showAuthStep('authStepSent');
}

// Called when a session appears (page load, or returning from the magic link)
async function onSignedIn(isFreshLogin) {
  profile = await fetchProfile();
  updateAuthUI();
  if (!profile) {
    // First time here: pick a username
    openAuth();
    showAuthStep('authStepUsername');
    $('authUsername').focus();
  } else if (isFreshLogin) {
    closeAuth();
    showToast(`Welcome back, @${profile.username}! ${avatarFor(profile.username)}`);
  }
  await loadRatings();
  renderList(); refreshPopup();
}

async function fetchProfile() {
  if (!sb || !session) return null;
  const { data } = await sb.from('profiles').select('id, username').eq('id', session.user.id).maybeSingle();
  return data || null;
}

$('authUsernameBtn').addEventListener('click', saveUsername);
$('authUsername').addEventListener('keydown', e => { if (e.key === 'Enter') saveUsername(); });

async function saveUsername() {
  const username = $('authUsername').value.trim().toLowerCase().replace(/^@/, '');
  if (!/^[a-z0-9_]{2,24}$/.test(username)) { authError('2–24 characters: letters, numbers and _ only.'); return; }
  const btn = $('authUsernameBtn');
  btn.disabled = true;
  const { error } = await sb.from('profiles').insert({ id: session.user.id, username });
  btn.disabled = false;
  if (error) {
    authError(error.code === '23505' ? 'That username is taken. Try another one.' : 'Something went wrong. Try again.');
    return;
  }
  profile = { id: session.user.id, username };
  closeAuth();
  updateAuthUI();
  showToast(`Welcome aboard, @${username}! ${avatarFor(username)}`);
}

$('signOutBtn').addEventListener('click', async () => {
  if (sb) await sb.auth.signOut();
  session = null; profile = null;
  updateAuthUI();
  await loadRatings();
  renderList(); refreshPopup();
});

function updateAuthUI() {
  const logged = !!(session && profile);
  $('authBtn').style.display = logged ? 'none' : '';
  $('userChip').style.display = logged ? 'flex' : 'none';
  if (logged) {
    $('userChipAvatar').textContent = avatarFor(profile.username);
    $('userChipName').textContent = '@' + profile.username;
  }
}

// ════════════════════════════════════
// ADD SPOT
// ════════════════════════════════════
function openAddSpot() {
  if (!session || !profile) { showToast('Sign in first to add spots 🦞'); openAuth(); return; }
  $('addSpotOverlay').classList.add('open');
  $('addSpotError').classList.remove('visible');
}
function closeAddSpot() { $('addSpotOverlay').classList.remove('open'); }

function resetAddSpotForm() {
  ['spotName', 'spotDesc', 'spotCountry'].forEach(id => $(id).value = '');
  $('spotPrice').value = '2';
  pickedLatLng = null;
  $('pickLocationBtn').classList.remove('picked');
  $('pickLocationLabel').textContent = 'Pick on the map';
}

$('addSpotBtn').addEventListener('click', openAddSpot);
$('addSpotClose').addEventListener('click', closeAddSpot);
$('addSpotOverlay').addEventListener('click', e => { if (e.target === $('addSpotOverlay')) closeAddSpot(); });

// ── Location picking ──
$('pickLocationBtn').addEventListener('click', startPicking);

function startPicking() {
  picking = true;
  closeAddSpot();
  closeMobileSidebar();
  $('pickBanner').style.display = 'flex';
  $('pickConfirmBtn').style.display = pickedLatLng ? '' : 'none';
  $('map').classList.add('picking');
}

function onPickMapClick(e) {
  pickedLatLng = e.latlng;
  if (pickMarker) pickMarker.remove();
  pickMarker = L.marker(e.latlng, { icon: makeIcon(true) }).addTo(map);
  $('pickConfirmBtn').style.display = '';
}

function endPicking(confirmed) {
  picking = false;
  $('pickBanner').style.display = 'none';
  $('map').classList.remove('picking');
  if (pickMarker) { pickMarker.remove(); pickMarker = null; }
  if (!confirmed) pickedLatLng = null;
  const btn = $('pickLocationBtn');
  if (confirmed && pickedLatLng) {
    btn.classList.add('picked');
    $('pickLocationLabel').textContent = 'Location set ✓ (tap to change)';
  } else {
    btn.classList.remove('picked');
    $('pickLocationLabel').textContent = 'Pick on the map';
  }
  $('addSpotOverlay').classList.add('open');
}

$('pickConfirmBtn').addEventListener('click', () => endPicking(true));
$('pickCancelBtn').addEventListener('click', () => endPicking(false));

// ── Publish ──
$('publishSpotBtn').addEventListener('click', async () => {
  const errEl = $('addSpotError');
  const showErr = m => { errEl.textContent = m; errEl.classList.add('visible'); };
  errEl.classList.remove('visible');

  const name = $('spotName').value.trim();
  const description = $('spotDesc').value.trim();
  const country = $('spotCountry').value.trim();
  const price = parseInt($('spotPrice').value);

  if (!name) { showErr('Give the spot a name.'); return; }
  if (!country) { showErr('Which country is it in?'); return; }
  if (!pickedLatLng) { showErr('Pick the location on the map.'); return; }
  if (!sb || !session || !profile) { showErr('Something went wrong. Try again.'); return; }

  const btn = $('publishSpotBtn');
  btn.disabled = true; btn.textContent = 'Publishing…';

  const row = {
    name, description, price, country,
    lat: pickedLatLng.lat, lng: pickedLatLng.lng,
    directions_url: `https://www.google.com/maps?q=${pickedLatLng.lat},${pickedLatLng.lng}`,
    author_id: session.user.id,
    author_name: profile.username,
  };
  const { data, error } = await sb.from('spots').insert(row).select().single();

  btn.disabled = false; btn.textContent = 'Publish 🦞';

  if (error) {
    showErr((error.message || '').includes('RATE_LIMIT')
      ? 'Easy, sailor! ⚓ You can only add one spot per hour.'
      : 'Something went wrong. Try again.');
    return;
  }

  closeAddSpot();
  resetAddSpotForm();
  showToast('Spot published! Thank you 🦞');
  await loadData();
  renderFilters();
  buildMarkers();
  renderList();
  if (data) handleSelect(String(data.id));
});

// ════════════════════════════════════
// BOOT
// ════════════════════════════════════
(async function boot() {
  applyTheme(isDark);
  setListLoading();

  if (sb) {
    // Fires on initial load AND when returning from the magic link.
    sb.auth.onAuthStateChange((event, s) => {
      session = s;
      if (event === 'SIGNED_IN' && !profile) onSignedIn(true);
      if (event === 'SIGNED_OUT') { profile = null; updateAuthUI(); }
    });
    const { data } = await sb.auth.getSession();
    session = data.session;
    if (session) await onSignedIn(false);
  }
  updateAuthUI();

  await loadData();
  renderFilters();
  renderList();
  buildMarkers();

  // deep link: ?spot=<id>
  const deepId = new URLSearchParams(location.search).get('spot');
  if (deepId && SPOTS.some(s => s.id === deepId)) {
    handleSelect(deepId);
  } else {
    const pts = worldBounds(SPOTS);
    if (pts) map.fitBounds(pts, { padding: [60, 60], maxZoom: 12 });
  }
})();
