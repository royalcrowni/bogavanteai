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
let RATING_ROWS = [];           // raw ratings rows (for the leaderboard)
let PROFILE_NAMES = {};         // userId -> username (for the leaderboard)
let PROFILES = {};              // username -> { id, username, avatar, avatar_bg, bio }
let selectedId    = null;
let isDark        = localStorage.getItem('boga-theme') === 'dark';
let searchQuery   = '';
let priceFilter   = [];         // [] = all, else array of 1|2|3
let countryFilter = [];         // [] = all, else array of country strings
let typeFilter    = [];         // [] = all, else array of 'premium'|'casual'|'beach'
let sortBy        = 'name';
let currentPopup  = null;
let session       = null;      // supabase session
let profile       = null;      // { id, username }
let usingFallback = false;

// picking location state
let picking = false;
let pickedLatLng = null;
let pickMarker = null;

// webmaster spot-editing state
let editingSpotId = null;
let editingOriginal = null; // { lat, lng } before the edit

const $ = id => document.getElementById(id);

// ════════════════════════════════════
// MAP INIT — infinite horizontal wrap, vertical clamped (no gray bands)
// ════════════════════════════════════
const WORLD_BOUNDS = L.latLngBounds([[-85, -180], [85, 180]]);
const MAX_LAT = 85;

const map = L.map('map', {
  center: [22, -20],
  zoom: 3,
  zoomControl: false,
  worldCopyJump: true, // pan endlessly sideways — the world repeats
});
// Never allow zooming out past "the whole world fills the viewport"
function updateMinZoom() {
  const z = map.getBoundsZoom(WORLD_BOUNDS, true);
  map.setMinZoom(z);
  if (map.getZoom() < z) map.setZoom(z);
}
map.on('resize', updateMinZoom);
updateMinZoom();

// Clamp vertical panning so gray bands never show above/below the map,
// while leaving left/right completely free (infinite wrap)
let clampingLat = false;
function clampLatitude() {
  if (clampingLat) return;
  const z = map.getZoom();
  const half = map.getSize().y / 2;
  const topY = map.project(L.latLng(MAX_LAT, 0), z).y;
  const botY = map.project(L.latLng(-MAX_LAT, 0), z).y;
  const cPt = map.project(map.getCenter(), z);
  let y = cPt.y;
  if (y - half < topY) y = topY + half;
  if (y + half > botY) y = botY - half;
  if (Math.abs(y - cPt.y) > 0.5) {
    clampingLat = true;
    map.panTo(map.unproject(L.point(cPt.x, y), z), { animate: false });
    clampingLat = false;
  }
}
map.on('move', clampLatitude);
map.on('moveend', clampLatitude);

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png';
const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png';
let tileLayer = L.tileLayer(TILE_LIGHT, { maxZoom: 19, subdomains: 'abcd' }).addTo(map);

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

// Fallback avatar for users who haven't picked one yet
const AVATARS = ['🦞','🦀','🦐','🦑','🐙','🐠','🐚','⚓️','🧜‍♂️','🌊','🐟','🛥️'];
function avatarFor(username) {
  let h = 0;
  for (const c of String(username || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATARS[h % AVATARS.length];
}

// ── Profile pictures: emoji or 2 initials on a colored disc ──
const AVATAR_EMOJIS = ['🦐','🦞','🦀','🐡','🐟','🐋','🫍','🦑'];
const AVATAR_COLORS = ['#C6C6C6','#96CDE2','#FFA66F','#7EDD9B','#F0E16D','#F06D6D'];

// Curated community members (baked into the site — real sign-up needs email).
// Each has a distinct avatar + a bio in the language of their country.
const SEED_PROFILES = {
  sarahtravels92: { avatar: '🐟', avatar_bg: '#96CDE2', bio: 'Travel blogger chasing the best lobster rolls across the globe. 🦞✈️' },
  johnsmithla:    { avatar: '🦀', avatar_bg: '#FFA66F', bio: 'LA foodie with a serious weakness for lobster and fine dining. 🍽️' },
  carlosgourmet:  { avatar: '🦐', avatar_bg: '#F06D6D', bio: 'Gourmet empedernido. Persigo el mejor marisco de cada rincón del mundo. 🦞' },
  jeanpierrefood: { avatar: '🐡', avatar_bg: '#F0E16D', bio: 'Amoureux de la bonne cuisine et du homard, de Paris aux Caraïbes. 🦞' },
  yukitaka:       { avatar: '🦑', avatar_bg: '#7EDD9B', bio: '世界中の海の幸を探す旅人。ロブスターと寿司をこよなく愛す。🦞🍣' },
  chloesafari:    { avatar: '🐋', avatar_bg: '#C6C6C6', bio: "From the bush to the sea — hunting Cape Town's freshest seafood. 🦞🌊" },
};
function applySeedProfiles() {
  for (const [u, p] of Object.entries(SEED_PROFILES)) {
    if (!PROFILES[u]) PROFILES[u] = { username: u, ...p };
  }
}

function isInitialsAvatar(a) { return /^[A-ZÀ-Ü]{1,2}$/.test(a || ''); }
function deriveInitials(name) {
  return String(name || '').replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || 'AB';
}
function avatarDataFor(username) {
  const p = PROFILES[username];
  return {
    avatar: p?.avatar || avatarFor(username),
    bg: p?.avatar_bg || '#C6C6C6',
  };
}
function avatarHtml(username, cls = 'avatar-sm') {
  const { avatar, bg } = avatarDataFor(username);
  const ini = isInitialsAvatar(avatar) ? ' initials' : '';
  return `<span class="avatar-circle ${cls}${ini}" style="background:${escHtml(bg)}">${escHtml(avatar)}</span>`;
}

// Reusable emoji/initials + color picker (signup and profile edit)
function createAvatarPicker(container, state) {
  function render() {
    const usingIni = isInitialsAvatar(state.avatar);
    const tiles = AVATAR_EMOJIS.map(e =>
      `<button type="button" class="picker-tile${state.avatar === e ? ' sel' : ''}" data-av="${e}" style="background:${state.bg}">${e}</button>`
    ).join('')
    + `<button type="button" class="picker-tile initials${usingIni ? ' sel' : ''}" data-av="__ini" style="background:${state.bg}">${escHtml(usingIni ? state.avatar : state.initials)}</button>`;
    const colors = AVATAR_COLORS.map(c =>
      `<button type="button" class="picker-color${state.bg === c ? ' sel' : ''}" data-c="${c}" style="background:${c}"></button>`
    ).join('');
    container.innerHTML = `
      <div class="picker-grid">${tiles}</div>
      <div class="picker-colors">${colors}</div>
      <input class="waitlist-input picker-ini-input" maxlength="2" placeholder="AB"
             style="display:${usingIni ? '' : 'none'}" value="${escHtml(usingIni ? state.avatar : state.initials)}" />`;

    container.querySelectorAll('.picker-tile').forEach(t => t.addEventListener('click', () => {
      state.avatar = t.dataset.av === '__ini' ? state.initials : t.dataset.av;
      render();
    }));
    container.querySelectorAll('.picker-color').forEach(t => t.addEventListener('click', () => {
      state.bg = t.dataset.c;
      render();
    }));
    const ini = container.querySelector('.picker-ini-input');
    ini.addEventListener('input', () => {
      const v = ini.value.toUpperCase().replace(/[^A-ZÀ-Ü]/g, '').slice(0, 2);
      ini.value = v;
      if (v) { state.initials = v; state.avatar = v; }
      const tile = container.querySelector('.picker-tile.initials');
      if (tile) tile.textContent = v || state.initials;
    });
  }
  render();
}

// @ignacio gets the golden treatment; #2 and #3 top spotters get silver & bronze
const GOLD_USER = 'ignacio';
function isGold(username) { return username === GOLD_USER; }

let RANK_TIERS = {}; // username -> 'gold' | 'silver' | 'bronze' (by spots added)
function computeRankTiers() {
  const counts = {};
  SPOTS.forEach(s => { if (s.authorName) counts[s.authorName] = (counts[s.authorName] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  RANK_TIERS = {};
  if (sorted[0]) RANK_TIERS[sorted[0]] = 'gold';
  if (sorted[1]) RANK_TIERS[sorted[1]] = 'silver';
  if (sorted[2]) RANK_TIERS[sorted[2]] = 'bronze';
}
function nameTier(username) {
  if (isGold(username)) return 'gold'; // the webmaster is always golden
  const t = RANK_TIERS[username];
  return t === 'gold' ? 'gold' : (t || null);
}
function userNameHtml(username) {
  const name = escHtml('@' + username);
  const tier = nameTier(username);
  return `<span class="username${tier ? ` ${tier}-text` : ''}">${name}</span>`;
}
function authorBadgeHtml(username) {
  if (!username) return '';
  const safe = String(username).replace(/[^a-zA-Z0-9_]/g, '');
  return `<button class="author-badge${isGold(username) ? ' gold' : ''}" onclick="event.stopPropagation(); openUserProfile('${safe}')" title="View profile">${avatarHtml(username, 'avatar-xs')} ${userNameHtml(username)}</button>`;
}

// Country list for the add-spot dropdown (no typos allowed!)
const COUNTRIES = [
  'Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia','Austria','Azerbaijan',
  'Bahamas','Bahrain','Bangladesh','Barbados','Belgium','Belize','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Bulgaria',
  'Cambodia','Cameroon','Canada','Cape Verde','Chile','China','Colombia','Costa Rica','Croatia','Cuba','Cyprus','Czechia',
  'Denmark','Dominican Republic','Ecuador','Egypt','El Salvador','Estonia','Ethiopia',
  'Fiji','Finland','France','Georgia','Germany','Ghana','Greece','Greenland','Guatemala',
  'Haiti','Honduras','Hong Kong','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
  'Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Laos','Latvia','Lebanon','Libya','Liechtenstein','Lithuania','Luxembourg',
  'Madagascar','Malaysia','Maldives','Malta','Mauritius','Mexico','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
  'Namibia','Nepal','Netherlands','New Zealand','Nicaragua','Nigeria','North Macedonia','Norway','Oman',
  'Pakistan','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Puerto Rico','Qatar',
  'Romania','Russia','Rwanda','San Marino','Saudi Arabia','Senegal','Serbia','Seychelles','Singapore','Slovakia','Slovenia','Somalia','South Africa','South Korea','Spain','Sri Lanka','Sweden','Switzerland','Syria',
  'Taiwan','Tanzania','Thailand','Trinidad and Tobago','Tunisia','Turkey','Uganda','Ukraine','United Arab Emirates','United Kingdom','Uruguay','USA','Uzbekistan',
  'Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
];

function ratingOf(id) {
  const r = RATINGS[id];
  if (!r || !r.count) return { avg: 0, count: 0, mine: null };
  return { avg: r.sum / r.count, count: r.count, mine: r.mine ?? null };
}

function getFiltered() {
  const q = searchQuery.toLowerCase();
  return SPOTS.filter(loc =>
    (!q || loc.name.toLowerCase().includes(q) || (loc.description || '').toLowerCase().includes(q) || (loc.authorName || '').toLowerCase().includes(q))
    && (priceFilter.length === 0 || priceFilter.includes(loc.price))
    && (countryFilter.length === 0 || countryFilter.includes(loc.country))
    && (typeFilter.length === 0 || typeFilter.includes(typeOf(loc)))
  );
}

function getSorted(list) {
  const arr = [...list];
  switch (sortBy) {
    case 'price-asc':   arr.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name)); break;
    case 'price-desc':  arr.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name)); break;
    case 'rating-desc': arr.sort((a, b) => ratingOf(b.id).avg - ratingOf(a.id).avg || ratingOf(b.id).count - ratingOf(a.id).count); break;
    case 'rating-asc':  arr.sort((a, b) => ratingOf(a.id).avg - ratingOf(b.id).avg || a.name.localeCompare(b.name)); break;
    default:            arr.sort((a, b) => a.name.localeCompare(b.name));
  }
  return arr;
}

// ── Country flags ──
const COUNTRY_ISO = {
  'Albania':'AL','Algeria':'DZ','Andorra':'AD','Angola':'AO','Argentina':'AR','Armenia':'AM','Australia':'AU','Austria':'AT','Azerbaijan':'AZ',
  'Bahamas':'BS','Bahrain':'BH','Bangladesh':'BD','Barbados':'BB','Belgium':'BE','Belize':'BZ','Bolivia':'BO','Bosnia and Herzegovina':'BA','Botswana':'BW','Brazil':'BR','Bulgaria':'BG',
  'Cambodia':'KH','Cameroon':'CM','Canada':'CA','Cape Verde':'CV','Chile':'CL','China':'CN','Colombia':'CO','Costa Rica':'CR','Croatia':'HR','Cuba':'CU','Cyprus':'CY','Czechia':'CZ',
  'Denmark':'DK','Dominican Republic':'DO','Ecuador':'EC','Egypt':'EG','El Salvador':'SV','Estonia':'EE','Ethiopia':'ET',
  'Fiji':'FJ','Finland':'FI','France':'FR','Georgia':'GE','Germany':'DE','Ghana':'GH','Greece':'GR','Greenland':'GL','Guatemala':'GT',
  'Haiti':'HT','Honduras':'HN','Hong Kong':'HK','Hungary':'HU','Iceland':'IS','India':'IN','Indonesia':'ID','Iran':'IR','Iraq':'IQ','Ireland':'IE','Israel':'IL','Italy':'IT',
  'Jamaica':'JM','Japan':'JP','Jordan':'JO','Kazakhstan':'KZ','Kenya':'KE','Kuwait':'KW','Laos':'LA','Latvia':'LV','Lebanon':'LB','Libya':'LY','Liechtenstein':'LI','Lithuania':'LT','Luxembourg':'LU',
  'Madagascar':'MG','Malaysia':'MY','Maldives':'MV','Malta':'MT','Mauritius':'MU','Mexico':'MX','Moldova':'MD','Monaco':'MC','Mongolia':'MN','Montenegro':'ME','Morocco':'MA','Mozambique':'MZ','Myanmar':'MM',
  'Namibia':'NA','Nepal':'NP','Netherlands':'NL','New Zealand':'NZ','Nicaragua':'NI','Nigeria':'NG','North Macedonia':'MK','Norway':'NO','Oman':'OM',
  'Pakistan':'PK','Panama':'PA','Papua New Guinea':'PG','Paraguay':'PY','Peru':'PE','Philippines':'PH','Poland':'PL','Portugal':'PT','Puerto Rico':'PR','Qatar':'QA',
  'Romania':'RO','Russia':'RU','Rwanda':'RW','San Marino':'SM','Saudi Arabia':'SA','Senegal':'SN','Serbia':'RS','Seychelles':'SC','Singapore':'SG','Slovakia':'SK','Slovenia':'SI','Somalia':'SO','South Africa':'ZA','South Korea':'KR','Spain':'ES','Sri Lanka':'LK','Sweden':'SE','Switzerland':'CH','Syria':'SY',
  'Taiwan':'TW','Tanzania':'TZ','Thailand':'TH','Trinidad and Tobago':'TT','Tunisia':'TN','Turkey':'TR','Uganda':'UG','Ukraine':'UA','United Arab Emirates':'AE','United Kingdom':'GB','Uruguay':'UY','USA':'US','Uzbekistan':'UZ',
  'Venezuela':'VE','Vietnam':'VN','Yemen':'YE','Zambia':'ZM','Zimbabwe':'ZW',
};
function flagEmoji(country) {
  const cc = COUNTRY_ISO[country];
  if (!cc) return '🌍';
  return String.fromCodePoint(...[...cc].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}
// Shorter display labels (value stored in the DB stays the full name)
const COUNTRY_DISPLAY = { 'United Kingdom': 'UK', 'United Arab Emirates': 'UAE' };
function countryDisplay(country) { return COUNTRY_DISPLAY[country] || country; }
function countryWithFlag(country) {
  return `${flagEmoji(country)} ${escHtml(countryDisplay(country))}`;
}

// ── Spot types ──
const TYPE_EMOJI  = { premium: '⭐', casual: '🍽️', beach: '🌴' };
const TYPE_LABELS = { premium: '⭐ Premium', casual: '🍽️ Casual', beach: '🌴 Beach Shack' };
function typeOf(loc) {
  // fallback for rows created before the type column existed
  return TYPE_EMOJI[loc.type] ? loc.type : (loc.price === 3 ? 'premium' : 'casual');
}

function worldBounds(locs) {
  return locs.length ? locs.map(l => [l.lat, l.lng]) : null;
}

function showToast(msg, ms = 4200) {
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
    type: r.type,
  };
}

function setListLoading() {
  $('spotsCount').textContent = '…';
  $('spotsList').innerHTML = `<div class="empty-state"><div class="loader"></div>Casting the nets…</div>`;
}

async function loadData() {
  if (!sb) { SPOTS = SEED_SPOTS; usingFallback = true; applySeedProfiles(); return; }
  try {
    const { data, error } = await sb.from('spots').select('*');
    if (error) throw error;
    SPOTS = data.map(mapRow);
    usingFallback = false;
    await Promise.all([loadRatings(), loadProfileNames()]);
  } catch (e) {
    console.warn('Supabase unavailable, using seed data:', e.message || e);
    SPOTS = SEED_SPOTS;
    usingFallback = true;
  }
  applySeedProfiles();
  computeRankTiers();
}

async function loadRatings() {
  if (!sb || usingFallback) return;
  try {
    const { data, error } = await sb.from('ratings').select('spot_id, user_id, stars');
    if (error) throw error;
    RATING_ROWS = data;
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

// public profiles: usernames, avatars and bios
async function loadProfileNames() {
  if (!sb || usingFallback) return;
  try {
    const { data, error } = await sb.from('profiles').select('*');
    if (error) throw error;
    PROFILE_NAMES = {};
    PROFILES = {};
    data.forEach(p => {
      PROFILE_NAMES[p.id] = p.username;
      PROFILES[p.username] = p;
    });
  } catch (e) {
    console.warn('Could not load profiles:', e.message || e);
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
  return `<div style="position:relative;width:36px;height:36px;">${ring}<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#2b2118,#1a140f);display:flex;align-items:center;justify-content:center;font-size:17px;cursor:pointer;border:2px solid #D52613;box-shadow:0 2px 8px rgba(0,0,0,0.35);transform:${selected?'scale(1.12)':'scale(1)'};transition:transform 0.2s;">🦞</div></div>`;
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
  const author = authorBadgeHtml(loc.authorName);
  return `
  <div class="popup-card">
    <button class="popup-close-btn" onclick="closePopup()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="popup-header">
      <div class="popup-icon-box">${TYPE_EMOJI[typeOf(loc)]}</div>
      <div class="popup-header-info">
        <div class="popup-name-row">
          <span class="popup-name">${escHtml(loc.name)}</span>
          <span class="popup-price price-${loc.price}">${priceStr(loc.price)}</span>
        </div>
        <div class="popup-badges">
          <span class="popup-badge">${countryWithFlag(loc.country)}</span>
          ${author}
        </div>
      </div>
    </div>
    ${loc.description ? `<p class="popup-desc">${escHtml(loc.description)}</p>` : ''}
    ${starsHtml(loc)}
    <hr class="popup-divider">
    <div class="popup-footer">
      <div class="popup-actions">
        ${isWebmaster() ? `<button class="popup-share" onclick="editSpot('${escHtml(loc.id)}')" title="Edit this spot (webmaster)">✏️</button><button class="popup-share popup-delete" onclick="deleteSpot('${escHtml(loc.id)}')" title="Delete this spot (webmaster)">🗑️</button>` : ''}
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
    maxWidth: 400,
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

// ── Edit spot (webmaster only — RLS enforces it server-side too) ──
window.editSpot = function (id) {
  if (!isWebmaster()) return;
  const loc = SPOTS.find(l => l.id === id);
  if (!loc) return;
  editingSpotId = id;
  editingOriginal = { lat: loc.lat, lng: loc.lng };
  $('spotName').value = loc.name;
  $('spotDesc').value = loc.description || '';
  $('spotPrice').value = String(loc.price);
  $('spotCountry').value = loc.country;
  if (!$('spotCountry').value) $('spotCountry').selectedIndex = 0; // country not in list
  $('spotType').value = typeOf(loc);
  setPickedLocation(L.latLng(loc.lat, loc.lng));
  setAddSpotMode(true);
  $('addSpotError').classList.remove('visible');
  $('addSpotOverlay').classList.add('open');
};

function setAddSpotMode(editing) {
  $('addSpotTitle').textContent = editing ? 'Edit lobster spot' : 'Add a lobster spot';
  $('publishSpotBtn').textContent = editing ? 'Save changes 🦞' : 'Publish 🦞';
}

// ── Delete (webmaster only — RLS enforces it server-side too) ──
window.deleteSpot = async function (id) {
  if (!isWebmaster() || !sb || usingFallback) return;
  const loc = SPOTS.find(l => l.id === id);
  if (!confirm(`Delete "${loc ? loc.name : 'this spot'}" from the map? This cannot be undone.`)) return;
  const { error } = await sb.from('spots').delete().eq('id', id);
  if (error) { showToast('Could not delete — run the types/webmaster SQL first.'); return; }
  if (currentPopup) { map.closePopup(currentPopup); currentPopup = null; }
  selectedId = null;
  showToast('Spot deleted 🗑️');
  await loadData();
  renderFilters();
  buildMarkers();
  renderList();
};

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
const PRICE_LABELS = { 1: '$ — cheap', 2: '$$ — mid', 3: '$$$ — fancy' };

function renderFilters() {
  // ── Price menu ──
  const prices = [1, 2, 3];
  $('priceMenu').innerHTML = prices.map(p => {
    const n = SPOTS.filter(s => s.price === p).length;
    return `<button class="filter-opt${priceFilter.includes(p) ? ' checked' : ''}" data-price="${p}">
      <span class="filter-check"></span>
      <span class="filter-opt-label">${PRICE_LABELS[p]}</span>
      <span class="pill-count">${n}</span>
    </button>`;
  }).join('');
  $('priceMenu').querySelectorAll('.filter-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const p = parseInt(opt.dataset.price);
      priceFilter = priceFilter.includes(p) ? priceFilter.filter(x => x !== p) : [...priceFilter, p];
      onFiltersChanged();
    });
  });

  // ── Country menu ──
  const countries = [...new Set(SPOTS.map(s => s.country).filter(Boolean))].sort();
  $('countryMenu').innerHTML = countries.map(c => {
    const n = SPOTS.filter(s => s.country === c).length;
    return `<button class="filter-opt${countryFilter.includes(c) ? ' checked' : ''}" data-country="${escHtml(c)}">
      <span class="filter-check"></span>
      <span class="filter-opt-label">${countryWithFlag(c)}</span>
      <span class="pill-count">${n}</span>
    </button>`;
  }).join('');
  $('countryMenu').querySelectorAll('.filter-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const c = opt.dataset.country;
      countryFilter = countryFilter.includes(c) ? countryFilter.filter(x => x !== c) : [...countryFilter, c];
      onFiltersChanged();
    });
  });

  // ── Type menu ──
  const types = ['premium', 'casual', 'beach'];
  $('typeMenu').innerHTML = types.map(t => {
    const n = SPOTS.filter(s => typeOf(s) === t).length;
    return `<button class="filter-opt${typeFilter.includes(t) ? ' checked' : ''}" data-type="${t}">
      <span class="filter-check"></span>
      <span class="filter-opt-label">${TYPE_LABELS[t]}</span>
      <span class="pill-count">${n}</span>
    </button>`;
  }).join('');
  $('typeMenu').querySelectorAll('.filter-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const t = opt.dataset.type;
      typeFilter = typeFilter.includes(t) ? typeFilter.filter(x => x !== t) : [...typeFilter, t];
      onFiltersChanged();
    });
  });

  updateFilterLabels();
}

function updateFilterLabels() {
  const pl = $('priceLabel');
  if (!priceFilter.length) pl.textContent = 'All prices';
  else pl.textContent = priceFilter.slice().sort().map(p => priceStr(p)).join(', ');
  $('priceToggle').classList.toggle('active', priceFilter.length > 0);

  const cl = $('countryLabel');
  if (!countryFilter.length) cl.textContent = 'All countries';
  else if (countryFilter.length === 1) cl.textContent = countryWithFlag(countryFilter[0]);
  else cl.textContent = `${flagEmoji(countryFilter[0])} +${countryFilter.length} countries`;
  $('countryToggle').classList.toggle('active', countryFilter.length > 0);

  const tl = $('typeLabel');
  if (!typeFilter.length) tl.textContent = 'All types';
  else tl.textContent = typeFilter.map(t => TYPE_EMOJI[t]).join(' ');
  $('typeToggle').classList.toggle('active', typeFilter.length > 0);
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

// Dropdown open/close
function setupFilterDropdown(dropdownId, toggleId) {
  const dd = $(dropdownId), tog = $(toggleId);
  tog.addEventListener('click', e => {
    e.stopPropagation();
    const wasOpen = dd.classList.contains('open');
    document.querySelectorAll('.filter-dropdown.open').forEach(d => d.classList.remove('open'));
    dd.classList.toggle('open', !wasOpen);
  });
}
setupFilterDropdown('priceDropdown', 'priceToggle');
setupFilterDropdown('countryDropdown', 'countryToggle');
setupFilterDropdown('typeDropdown', 'typeToggle');
document.addEventListener('click', () => {
  document.querySelectorAll('.filter-dropdown.open').forEach(d => d.classList.remove('open'));
});

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
    const author = authorBadgeHtml(loc.authorName);
    return `
    <div class="spot-card${selectedId === loc.id ? ' selected' : ''}" data-id="${escHtml(loc.id)}">
      <div class="card-top">
        <span class="card-icon">${TYPE_EMOJI[typeOf(loc)]}</span>
        <div class="card-body">
          <div class="card-name-row">
            <span class="card-name">${escHtml(loc.name)}</span>
            <span class="card-price price-${loc.price}">${priceStr(loc.price)}</span>
          </div>
          ${loc.description ? `<div class="card-desc">${escHtml(loc.description)}</div>` : ''}
          <div class="card-meta-row">
            <span class="card-badge">${countryWithFlag(loc.country)}</span>
            ${author}
            ${rating}
          </div>
        </div>
      </div>
      <div class="card-bottom">
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
  priceFilter = [];
  countryFilter = [];
  typeFilter = [];
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
  if (session && profile) { openUserProfile(profile.username); return; }
  openAuth();
});
$('authModalClose').addEventListener('click', closeAuth);
$('authOverlay').addEventListener('click', e => { if (e.target === $('authOverlay')) closeAuth(); });
$('authBackBtn').addEventListener('click', () => showAuthStep('authStepEmail'));

// ── Terms & Privacy gate ──
$('termsCheck').addEventListener('change', e => {
  $('authSendLinkBtn').disabled = !e.target.checked;
});
$('termsLink').addEventListener('click', () => $('termsOverlay').classList.add('open'));
$('termsClose').addEventListener('click', () => $('termsOverlay').classList.remove('open'));
$('termsOverlay').addEventListener('click', e => { if (e.target === $('termsOverlay')) $('termsOverlay').classList.remove('open'); });
$('termsAgreeBtn').addEventListener('click', () => {
  $('termsCheck').checked = true;
  $('authSendLinkBtn').disabled = false;
  $('termsOverlay').classList.remove('open');
});

$('authSendLinkBtn').addEventListener('click', sendMagicLink);
$('authEmail').addEventListener('keydown', e => { if (e.key === 'Enter') sendMagicLink(); });

async function sendMagicLink() {
  if (!$('termsCheck').checked) { authError('You must accept the Terms of Service & Privacy Policy first.'); return; }
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
  if (profile) PROFILES[profile.username] = profile;
  updateAuthUI();
  if (!profile) {
    // First time here: pick a username + profile picture
    openAuth();
    showAuthStep('authStepUsername');
    initSignupPicker();
    $('authUsername').focus();
  } else if (isFreshLogin) {
    closeAuth();
    showToast(`Welcome back, @${profile.username}! ${avatarDataFor(profile.username).avatar}`);
  }
  await loadRatings();
  renderList(); refreshPopup();
}

async function fetchProfile() {
  if (!sb || !session) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  return data || null;
}

// Signup avatar picker state
const signupState = { avatar: '🦞', bg: '#FFA66F', initials: 'AB' };
function initSignupPicker() {
  signupState.initials = deriveInitials($('authUsername').value || '');
  createAvatarPicker($('signupPicker'), signupState);
}
$('authUsername').addEventListener('input', e => {
  if (!isInitialsAvatar(signupState.avatar)) {
    signupState.initials = deriveInitials(e.target.value);
    const tile = $('signupPicker').querySelector('.picker-tile.initials');
    if (tile) tile.textContent = signupState.initials;
  }
});

$('authUsernameBtn').addEventListener('click', saveUsername);
$('authUsername').addEventListener('keydown', e => { if (e.key === 'Enter') saveUsername(); });

async function saveUsername() {
  const username = $('authUsername').value.trim().toLowerCase().replace(/^@/, '');
  if (!/^[a-z0-9_]{2,24}$/.test(username)) { authError('2–24 characters: letters, numbers and _ only.'); return; }
  const btn = $('authUsernameBtn');
  btn.disabled = true;
  const row = { id: session.user.id, username, avatar: signupState.avatar, avatar_bg: signupState.bg, bio: '' };
  let { error } = await sb.from('profiles').insert(row);
  if (error && /avatar|bio|column|schema/i.test(error.message || '')) {
    // profiles table not migrated yet — save the basics at least
    ({ error } = await sb.from('profiles').insert({ id: session.user.id, username }));
  }
  btn.disabled = false;
  if (error) {
    authError(error.code === '23505' ? 'That username is taken. Try another one.' : 'Something went wrong. Try again.');
    return;
  }
  profile = row;
  PROFILES[username] = row;
  PROFILE_NAMES[session.user.id] = username;
  closeAuth();
  updateAuthUI();
  renderList(); refreshPopup();
  showToast(`Welcome aboard, @${username}! 🦞`);
}

async function doSignOut() {
  if (sb) await sb.auth.signOut();
  session = null; profile = null;
  $('profileOverlay').classList.remove('open');
  updateAuthUI();
  await loadRatings();
  renderList(); refreshPopup();
}

function updateAuthUI() {
  const logged = !!(session && profile);
  $('authBtn').style.display = logged ? 'none' : '';
  $('userChip').style.display = logged ? 'flex' : 'none';
  if (logged) {
    const { avatar, bg } = avatarDataFor(profile.username);
    const av = $('userChipAvatar');
    av.textContent = avatar;
    av.style.background = bg;
    av.classList.toggle('initials', isInitialsAvatar(avatar));
    $('userChipName').innerHTML = userNameHtml(profile.username);
  }
}

$('profileGearBtn').addEventListener('click', () => openUserProfile(profile.username));

// ════════════════════════════════════
// LEADERBOARD
// ════════════════════════════════════
function rankRowsHtml(entries) {
  if (!entries.length) return `<div class="rank-empty">Nobody here yet — be the first! 🦞</div>`;
  const medals = ['🥇', '🥈', '🥉'];
  return entries.map(([name, count], i) => {
    const safe = String(name).replace(/[^a-zA-Z0-9_]/g, '');
    return `
    <button class="rank-row" onclick="openUserProfile('${safe}')">
      <span class="rank-pos">${medals[i] || (i + 1) + '.'}</span>
      <span class="rank-name">${avatarHtml(name, 'avatar-xs')} ${userNameHtml(name)}</span>
      <span class="rank-score">${count}</span>
    </button>`;
  }).join('');
}

// Tabs inside the leaderboard
document.querySelectorAll('.rank-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.rank-tab').forEach(t => t.classList.toggle('active', t === tab));
    $('rankSpotters').style.display = tab.dataset.tab === 'spotters' ? '' : 'none';
    $('rankRaters').style.display = tab.dataset.tab === 'raters' ? '' : 'none';
  });
});

function openRanking() {
  closeMobileSidebar();

  // Top spotters: spots added per username
  const bySpots = {};
  SPOTS.forEach(s => { if (s.authorName) bySpots[s.authorName] = (bySpots[s.authorName] || 0) + 1; });
  const spotters = Object.entries(bySpots).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Top raters: ratings given per username
  const byRatings = {};
  RATING_ROWS.forEach(r => {
    const name = PROFILE_NAMES[r.user_id];
    if (name) byRatings[name] = (byRatings[name] || 0) + 1;
  });
  const raters = Object.entries(byRatings).sort((a, b) => b[1] - a[1]).slice(0, 10);

  $('rankSpotters').innerHTML = rankRowsHtml(spotters);
  $('rankRaters').innerHTML = rankRowsHtml(raters);
  $('rankOverlay').classList.add('open');
}

$('rankBtn').addEventListener('click', openRanking);
$('mobileRankBtn').addEventListener('click', openRanking);
$('rankClose').addEventListener('click', () => $('rankOverlay').classList.remove('open'));
$('rankOverlay').addEventListener('click', e => { if (e.target === $('rankOverlay')) $('rankOverlay').classList.remove('open'); });

// ════════════════════════════════════
// USER PROFILES (own + public)
// ════════════════════════════════════
let viewedUsername = null;
const editState = { avatar: '🦞', bg: '#C6C6C6', initials: 'AB' };

window.openUserProfile = async function (username) {
  if (!username) return;
  closeMobileSidebar();
  $('rankOverlay').classList.remove('open');

  // late-fetch the profile if we don't have it yet
  if (!PROFILES[username] && sb && !usingFallback) {
    try {
      const { data } = await sb.from('profiles').select('*').eq('username', username).maybeSingle();
      if (data) { PROFILES[username] = data; PROFILE_NAMES[data.id] = username; }
    } catch (e) { /* profile stays fallback-rendered */ }
  }

  viewedUsername = username;
  renderProfileView();
  $('profileEditPane').style.display = 'none';
  $('profileView').style.display = '';
  $('profileOverlay').classList.add('open');
};

function renderProfileView() {
  const username = viewedUsername;
  const p = PROFILES[username] || null;
  const own = !!(profile && profile.username === username);

  const { avatar, bg } = avatarDataFor(username);
  const av = $('profileAvatar');
  av.textContent = avatar;
  av.style.background = bg;
  av.classList.toggle('initials', isInitialsAvatar(avatar));

  $('profileName').innerHTML = userNameHtml(username);

  const bio = (p?.bio || '').trim();
  const bioEl = $('profileBio');
  if (bio) { bioEl.textContent = bio; bioEl.classList.remove('empty'); }
  else {
    bioEl.textContent = own ? 'No bio yet — hit Edit to tell your story 🦞' : 'No bio yet.';
    bioEl.classList.add('empty');
  }

  const added = SPOTS.filter(s => s.authorName === username);
  const ratedIds = p ? RATING_ROWS.filter(r => r.user_id === p.id).map(r => String(r.spot_id)) : [];
  const rated = SPOTS.filter(s => ratedIds.includes(s.id));
  $('statAdded').textContent = added.length;
  $('statRated').textContent = ratedIds.length;

  const item = s => `<button class="profile-spot" data-spot="${escHtml(s.id)}">🦞 ${escHtml(s.name)}</button>`;
  let lists = '';
  if (added.length) lists += `<div class="profile-list-title">Spots added</div><div class="profile-list">${added.map(item).join('')}</div>`;
  if (rated.length) lists += `<div class="profile-list-title">Spots rated</div><div class="profile-list">${rated.map(item).join('')}</div>`;
  $('profileLists').innerHTML = lists;

  // Own profile: full actions. Webmaster (@ignacio): can edit anyone with a DB row.
  const canEdit = own || (isWebmaster() && !!p?.id);
  $('profileActions').style.display = canEdit ? 'flex' : 'none';
  $('profileEditBtn').style.display = canEdit ? '' : 'none';
  $('profileSignOutBtn').style.display = own ? '' : 'none';
  $('moreSettingsLink').style.display = own ? '' : 'none';
}

function isWebmaster() { return !!(profile && profile.username === GOLD_USER); }

// Click a spot inside a profile → jump to it on the map
$('profileLists').addEventListener('click', e => {
  const btn = e.target.closest('.profile-spot');
  if (!btn) return;
  $('profileOverlay').classList.remove('open');
  handleSelect(btn.dataset.spot);
});

$('profileClose').addEventListener('click', () => $('profileOverlay').classList.remove('open'));
$('profileOverlay').addEventListener('click', e => { if (e.target === $('profileOverlay')) $('profileOverlay').classList.remove('open'); });
$('profileSignOutBtn').addEventListener('click', doSignOut);
$('moreSettingsLink').addEventListener('click', () => { window.location.href = '/info.html#delete-account'; });

// ── Edit profile (avatar + bio; username is fixed).
//    Works on the viewed profile: your own, or anyone's if you're the webmaster.
$('profileEditBtn').addEventListener('click', () => {
  const target = viewedUsername;
  const { avatar, bg } = avatarDataFor(target);
  editState.avatar = avatar;
  editState.bg = AVATAR_COLORS.includes(bg) ? bg : AVATAR_COLORS[0];
  editState.initials = isInitialsAvatar(avatar) ? avatar : deriveInitials(target);
  createAvatarPicker($('editPicker'), editState);
  $('editBio').value = PROFILES[target]?.bio || '';
  $('profileError').classList.remove('visible');
  $('profileView').style.display = 'none';
  $('profileEditPane').style.display = '';
});

$('editCancelBtn').addEventListener('click', () => {
  $('profileEditPane').style.display = 'none';
  $('profileView').style.display = '';
});

$('editSaveBtn').addEventListener('click', async () => {
  const errEl = $('profileError');
  errEl.classList.remove('visible');
  const showErr = m => { errEl.textContent = m; errEl.classList.add('visible'); };

  const target = PROFILES[viewedUsername];
  if (!target?.id) { showErr('This curated demo user lives in the code, not the database.'); return; }
  const own = !!(profile && profile.username === viewedUsername);
  if (!own && !isWebmaster()) { showErr('Something went wrong. Try again.'); return; }

  const bio = $('editBio').value.trim();
  const btn = $('editSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  const { error } = await sb.from('profiles')
    .update({ avatar: editState.avatar, avatar_bg: editState.bg, bio })
    .eq('id', target.id);
  btn.disabled = false; btn.textContent = 'Save';
  if (error) {
    showErr(/avatar|bio|column|schema/i.test(error.message || '')
      ? 'Run the profiles update SQL in Supabase first.'
      : 'Something went wrong. Try again.');
    return;
  }
  const updated = { ...target, avatar: editState.avatar, avatar_bg: editState.bg, bio };
  PROFILES[viewedUsername] = updated;
  if (own) { profile = { ...profile, ...updated }; updateAuthUI(); }
  renderList(); refreshPopup();
  renderProfileView();
  $('profileEditPane').style.display = 'none';
  $('profileView').style.display = '';
  showToast('Profile updated 🦞');
});

// ════════════════════════════════════
// ADD SPOT
// ════════════════════════════════════
// Populate the country dropdown once
$('spotCountry').innerHTML = '<option value="" disabled selected>Select a country…</option>'
  + COUNTRIES.map(c => `<option value="${escHtml(c)}">${escHtml(countryDisplay(c))}</option>`).join('');
function openAddSpot() {
  if (!session || !profile) { showToast('Sign in first to add spots 🦞'); openAuth(); return; }
  // if we were mid-edit, switch back to a clean "add" form
  if (editingSpotId) { resetAddSpotForm(); }
  $('addSpotOverlay').classList.add('open');
  $('addSpotError').classList.remove('visible');
}
function closeAddSpot() { $('addSpotOverlay').classList.remove('open'); }

function resetAddSpotForm() {
  ['spotName', 'spotDesc', 'spotCoords'].forEach(id => $(id).value = '');
  $('spotCountry').selectedIndex = 0;
  $('spotPrice').value = '2';
  $('spotType').value = 'casual';
  pickedLatLng = null;
  editingSpotId = null;
  editingOriginal = null;
  setAddSpotMode(false);
  $('spotCoords').classList.remove('coords-ok');
  $('pickLocationBtn').classList.remove('picked');
  $('pickLocationLabel').textContent = 'Pick on the map';
}

function setPickedLocation(latlng) {
  pickedLatLng = latlng;
  $('pickLocationBtn').classList.add('picked');
  $('pickLocationLabel').textContent = 'Location set ✓ (tap to change)';
  $('spotCoords').value = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
  $('spotCoords').classList.add('coords-ok');
}

// Manual coordinates ("40.4515, -3.6874" — same format Google Maps copies)
$('spotCoords').addEventListener('input', e => {
  const m = e.target.value.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) {
    e.target.classList.remove('coords-ok');
    return;
  }
  const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    e.target.classList.remove('coords-ok');
    return;
  }
  pickedLatLng = L.latLng(lat, lng);
  e.target.classList.add('coords-ok');
  $('pickLocationBtn').classList.add('picked');
  $('pickLocationLabel').textContent = 'Location set ✓ (tap to change)';
});

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
  if (confirmed && pickedLatLng) {
    setPickedLocation(pickedLatLng);
  } else {
    pickedLatLng = null;
    $('pickLocationBtn').classList.remove('picked');
    $('pickLocationLabel').textContent = 'Pick on the map';
    $('spotCoords').value = '';
    $('spotCoords').classList.remove('coords-ok');
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
  const country = $('spotCountry').value;
  const price = parseInt($('spotPrice').value);

  if (!name) { showErr('Give the spot a name.'); return; }
  if (!country) { showErr('Select the country from the list.'); return; }
  if (!pickedLatLng) { showErr('Pick the location on the map or paste its coordinates.'); return; }
  if (!sb || !session || !profile) { showErr('Something went wrong. Try again.'); return; }

  const btn = $('publishSpotBtn');
  const isEdit = !!editingSpotId;
  btn.disabled = true; btn.textContent = isEdit ? 'Saving…' : 'Publishing…';

  let data, error;
  if (isEdit) {
    // Webmaster edit: update every field; refresh the directions link only if moved
    const patch = {
      name, description, price, country,
      type: $('spotType').value,
      lat: pickedLatLng.lat, lng: pickedLatLng.lng,
    };
    const moved = !editingOriginal
      || Math.abs(editingOriginal.lat - pickedLatLng.lat) > 1e-9
      || Math.abs(editingOriginal.lng - pickedLatLng.lng) > 1e-9;
    if (moved) patch.directions_url = `https://www.google.com/maps?q=${pickedLatLng.lat},${pickedLatLng.lng}`;

    ({ data, error } = await sb.from('spots').update(patch).eq('id', editingSpotId).select().single());
    if (error && /type|column|schema/i.test(error.message || '')) {
      delete patch.type;
      ({ data, error } = await sb.from('spots').update(patch).eq('id', editingSpotId).select().single());
    }
  } else {
    const row = {
      name, description, price, country,
      type: $('spotType').value,
      lat: pickedLatLng.lat, lng: pickedLatLng.lng,
      directions_url: `https://www.google.com/maps?q=${pickedLatLng.lat},${pickedLatLng.lng}`,
      author_id: session.user.id,
      author_name: profile.username,
    };
    ({ data, error } = await sb.from('spots').insert(row).select().single());
    if (error && /type|column|schema/i.test(error.message || '')) {
      // spots table not migrated yet — publish without the type
      delete row.type;
      ({ data, error } = await sb.from('spots').insert(row).select().single());
    }
  }

  btn.disabled = false; btn.textContent = isEdit ? 'Save changes 🦞' : 'Publish 🦞';

  if (error) {
    showErr((error.message || '').includes('RATE_LIMIT')
      ? 'Easy, sailor! ⚓ You can add up to 3 spots per day.'
      : isEdit
        ? 'Could not save — run the types/webmaster SQL first.'
        : 'Something went wrong. Try again.');
    return;
  }

  closeAddSpot();
  resetAddSpotForm();
  showToast(isEdit ? 'Spot updated ✏️🦞' : 'Spot published! Thank you 🦞');
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
