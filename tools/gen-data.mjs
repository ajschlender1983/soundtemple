// Heart Weather — seeded synthetic data generator (run locally with: node tools/gen-data.mjs)
// Deterministic (mulberry32). Produces data/sessions.json, data/locations.json, data/users.json
// and copies+optimizes real session art into sessions/.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAPPING = '/Users/adamschlenderwork/Desktop/Opus/SoundBed/session-library/_mapping.json';
const SESS_ART_DIR = path.join(ROOT, 'sessions');
const DATA_DIR = path.join(ROOT, 'data');
fs.mkdirSync(SESS_ART_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---- seeded PRNG ----
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(0x5EED);
const rrange = (a, b) => a + (b - a) * rnd();
const rint = (a, b) => Math.floor(rrange(a, b + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const clip = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const rnorm = (mean, sd) => { let s = 0; for (let i = 0; i < 6; i++) s += rnd(); return mean + (s - 3) / 3 * sd * 1.732; };
const rbeta = (a, b) => {
  let x = 0; for (let i = 0; i < a; i++) x += -Math.log(rnd() + 1e-9);
  let y = 0; for (let i = 0; i < b; i++) y += -Math.log(rnd() + 1e-9);
  return x / (x + y);
};

// ---- sessions: copy + optimize real art (execFileSync — no shell) ----
const mapping = JSON.parse(fs.readFileSync(MAPPING, 'utf8')).filter(s => s.art_src && fs.existsSync(s.art_src));
const sessions = [];
for (const s of mapping) {
  const out = path.join(SESS_ART_DIR, s.filename + '.jpg');
  try {
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '-Z', '640', s.art_src, '--out', out], { stdio: 'ignore' });
    sessions.push({
      key: s.filename,
      title: (s.title || s.filename).replace(/ _ /g, ' · '),
      category: s.category || 'Session',
      meta: (s.meta_line || s.category || '').replace(/ · /g, ' · '),
      description: s.description || '',
      art: 'sessions/' + s.filename + '.jpg'
    });
  } catch (e) { /* skip art that fails to convert */ }
}
fs.writeFileSync(path.join(DATA_DIR, 'sessions.json'), JSON.stringify(sessions));
const sessionKeys = sessions.map(s => s.key);
const CAT_GAIN = { 'Guided': 0.45, 'Brainwave Entrainment': 0.40, 'Chakras': 0.32, 'Frequency': 0.30, 'Immersive Music': 0.24, 'Natural Soundscapes': 0.30 };

// ---- locations: real US seeds + padded US cities ----
const US_SEEDS = [
  { name: 'Bathhouse ATX', city: 'Austin, TX', lat: 30.27, lon: -97.74, status: 'broadcast', coherence: 0.92 },
  { name: 'Red Rock Sedona', city: 'Sedona, AZ', lat: 34.87, lon: -111.76, status: 'active', coherence: 0.81 },
  { name: 'Sierra Tahoe', city: 'Lake Tahoe, CA', lat: 39.10, lon: -120.03, status: 'active', coherence: 0.74 },
];
const US_CITIES = [
  ['New York, NY', 40.71, -74.00], ['Brooklyn, NY', 40.68, -73.94], ['Los Angeles, CA', 34.05, -118.24],
  ['San Francisco, CA', 37.77, -122.42], ['Oakland, CA', 37.80, -122.27], ['Ojai, CA', 34.45, -119.24],
  ['Big Sur, CA', 36.27, -121.81], ['Joshua Tree, CA', 34.13, -116.31], ['San Diego, CA', 32.72, -117.16],
  ['Sacramento, CA', 38.58, -121.49], ['Nevada City, CA', 39.26, -121.02], ['Seattle, WA', 47.61, -122.33],
  ['Portland, OR', 45.52, -122.68], ['Bend, OR', 44.06, -121.31], ['Eugene, OR', 44.05, -123.09],
  ['Denver, CO', 39.74, -104.99], ['Boulder, CO', 40.01, -105.27], ['Telluride, CO', 37.94, -107.81],
  ['Salt Lake City, UT', 40.76, -111.89], ['Boise, ID', 43.62, -116.21], ['Santa Fe, NM', 35.69, -105.94],
  ['Taos, NM', 36.41, -105.57], ['Phoenix, AZ', 33.45, -112.07], ['Tucson, AZ', 32.22, -110.97],
  ['Marfa, TX', 30.31, -104.02], ['Dallas, TX', 32.78, -96.80], ['Houston, TX', 29.76, -95.37],
  ['San Antonio, TX', 29.42, -98.49], ['New Orleans, LA', 29.95, -90.07], ['Nashville, TN', 36.16, -86.78],
  ['Asheville, NC', 35.60, -82.55], ['Charlotte, NC', 35.23, -80.84], ['Raleigh, NC', 35.78, -78.64],
  ['Charleston, SC', 32.78, -79.93], ['Savannah, GA', 32.08, -81.09], ['Atlanta, GA', 33.75, -84.39],
  ['Miami, FL', 25.76, -80.19], ['Orlando, FL', 28.54, -81.38], ['Chicago, IL', 41.88, -87.63],
  ['Madison, WI', 43.07, -89.40], ['Minneapolis, MN', 44.98, -93.27], ['Ann Arbor, MI', 42.28, -83.74],
  ['Detroit, MI', 42.33, -83.05], ['Kansas City, MO', 39.10, -94.58], ['St. Louis, MO', 38.63, -90.20],
  ['Boston, MA', 42.36, -71.06], ['Philadelphia, PA', 39.95, -75.17], ['Pittsburgh, PA', 40.44, -79.99],
  ['Washington, DC', 38.91, -77.04], ['Richmond, VA', 37.54, -77.44], ['Burlington, VT', 44.48, -73.21],
  ['Portland, ME', 43.66, -70.26], ['Woodstock, NY', 42.04, -74.12], ['Ithaca, NY', 42.44, -76.50],
  ['Hudson, NY', 42.25, -73.79],
];
const VENUE_WORDS = ['Sanctuary', 'Sound Temple', 'Resonance Room', 'The Hum', 'Coherence Lab', 'Still Point', 'The Field', 'Vibratorium', 'Deep Rest', 'The Chamber', 'Heart Space', 'Tone Studio', 'The Grove', 'Frequency House'];
const statusFor = (c) => c > 0.7 ? 'active' : c > 0.4 ? 'online' : 'dormant';

const locations = [];
US_SEEDS.forEach((s, i) => locations.push({ id: 'loc_' + i, ...s, venueZoom: 15.5 }));
while (locations.length < 100) {
  const i = locations.length;
  const city = US_CITIES[i % US_CITIES.length];
  const c = clip(rbeta(2.4, 3.0), 0.08, 0.95);
  locations.push({
    id: 'loc_' + i,
    name: pick(VENUE_WORDS) + ' ' + city[0].split(',')[0],
    city: city[0],
    lat: city[1] + rrange(-0.06, 0.06),
    lon: city[2] + rrange(-0.06, 0.06),
    status: statusFor(c),
    coherence: +c.toFixed(3),
    venueZoom: 15.5,
  });
}

// ---- users: 500 distributed across locations ----
const ADJ = ['Quiet', 'Still', 'Tidal', 'Amber', 'Soft', 'Open', 'Bright', 'Deep', 'Gentle', 'Rooted', 'Luminous', 'Velvet', 'Ember', 'Mossy', 'Slow', 'Sage', 'Golden', 'Hollow', 'Tender', 'Clear', 'Lunar', 'Cedar', 'Wild', 'Drifting', 'Hushed', 'Warm', 'Pale', 'Distant', 'Woven', 'Brave'];
const NOUN = ['Harbor', 'Cedar', 'Ember', 'Meridian', 'Hum', 'Field', 'Tide', 'Grove', 'Stone', 'River', 'Aurora', 'Willow', 'Vale', 'Bloom', 'Reed', 'Cove', 'Wren', 'Fen', 'Dawn', 'Hush', 'Lantern', 'Current', 'Thicket', 'Marrow', 'Echo', 'Cinder', 'Heron', 'Brook', 'Pine', 'Sparrow'];
const HEAVY = ['grief', 'uncertainty', 'a hard goodbye', 'overwhelm', 'loneliness', 'my health', 'holding it together', 'a heavy world', 'letting go', 'a tired body', 'a big decision', 'missing someone'];
const JOY = ['a small ritual', 'someone I love', 'my own progress', 'being outside', 'creating something', 'rest', 'laughter', 'a fresh start', 'simply today', 'morning light', 'music', 'a deep breath'];

const weights = locations.map(l => 0.4 + l.coherence);
const wsum = weights.reduce((a, b) => a + b, 0);
const counts = locations.map((l, i) => Math.max(1, Math.round(500 * weights[i] / wsum)));
let total = counts.reduce((a, b) => a + b, 0);
let gi = 0;
while (total > 500) { if (counts[gi % counts.length] > 1) { counts[gi % counts.length]--; total--; } gi++; }
while (total < 500) { counts[gi % counts.length]++; total++; gi++; }

function hrvSeries(baseline, trait, sessionCat) {
  const n = 72, theta = 0.18, sigma = 4.2;
  const gain = (CAT_GAIN[sessionCat] || 0.3);
  const sessStart = rint(20, 34), sessLen = rint(6, 12);
  let v = 0; const deltas = []; const peakIdx = sessStart + sessLen;
  for (let t = 0; t < n; t++) {
    v += -theta * v + rnorm(0, sigma);
    let bump = 0;
    if (t >= sessStart && t < sessStart + sessLen) bump = gain * baseline * 0.5 * ((t - sessStart) / sessLen);
    else if (t >= sessStart + sessLen) bump = gain * baseline * 0.5 * Math.exp(-(t - (sessStart + sessLen)) / 7);
    deltas.push(Math.round(v + bump * (trait > 0.25 ? 1 : 0.2)));
  }
  return { baseline: Math.round(baseline), stepMin: 5, deltas, peakIdx };
}

const users = [];
let uid = 0;
locations.forEach((loc, li) => {
  for (let k = 0; k < counts[li]; k++) {
    const age = rint(22, 68);
    const baseRmssd = clip(rnorm(70 - 0.5 * age, 12), 16, 95);
    const trait = rbeta(2.5, 3.0);
    const coherence = clip(loc.coherence * 0.55 + trait * 0.45 + rnorm(0, 0.08), 0.05, 0.98);
    const favCat = pick(sessions).category;
    const favs = [];
    const nf = rint(2, 4);
    for (let f = 0; f < nf; f++) favs.push(pick(sessionKeys));
    const id = 'u_' + (uid++).toString(36).padStart(3, '0');
    users.push({
      id,
      handle: pick(ADJ) + ' ' + pick(NOUN),
      sigilSeed: Math.floor(rnd() * 1e9),
      locationId: loc.id,
      lat: +(loc.lat + rrange(-0.012, 0.012)).toFixed(5),
      lon: +(loc.lon + rrange(-0.012, 0.012)).toFixed(5),
      coherence: +coherence.toFixed(3),
      rmssd: Math.round(baseRmssd),
      sdnn: Math.round(baseRmssd * rnorm(1.4, 0.12)),
      restingHr: Math.round(rnorm(64, 7)),
      breathRate: +(4 + coherence * 8).toFixed(1),
      phaseOffset: +(rnd() * Math.PI * 2).toFixed(3),
      heavy: pick(HEAVY),
      joy: pick(JOY),
      wow: +clip(coherence * 4 + rnorm(1, 0.6), 1, 5).toFixed(1),
      favorites: [...new Set(favs)].slice(0, 4),
      messageable: rnd() < 0.55,
      hrv: hrvSeries(baseRmssd, trait, favCat),
    });
  }
});

const byLoc = {};
users.forEach(u => { byLoc[u.locationId] = (byLoc[u.locationId] || 0) + 1; });
locations.forEach(l => { l.userCount = byLoc[l.id] || 0; l.sessionsToday = Math.round(l.userCount * (0.3 + l.coherence * 0.5)); });

fs.writeFileSync(path.join(DATA_DIR, 'locations.json'), JSON.stringify(locations));
fs.writeFileSync(path.join(DATA_DIR, 'users.json'), JSON.stringify(users));

console.log('sessions:', sessions.length, '| locations:', locations.length, '| users:', users.length);
console.log('avg coherence:', (locations.reduce((a, b) => a + b.coherence, 0) / locations.length).toFixed(3));
