// Collecte l'annuaire public des membres Hexatrust : nom, fiche, site web.
// Usage : node scripts/collecte-hexatrust.mjs > data/hexatrust-membres.json
import { setTimeout as sleep } from 'node:timers/promises';

// Identifiant de robot honnête ; OBSERVATOIRE_CONTACT (adresse ou URL) y est ajouté s'il est défini.
const UA = `ObservatoireCRA/0.1 (mesure passive de signaux publics CRA${process.env.OBSERVATOIRE_CONTACT ? `; ${process.env.OBSERVATOIRE_CONTACT}` : ''})`;
const BASE = 'https://www.hexatrust.com/membres/';
const PAUSE_MS = 400;

async function get(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${res.status} sur ${url}`);
  return res.text();
}

const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&rsquo;|&lsquo;/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').trim();

// 1. Pages de l'annuaire jusqu'à la première page sans nouvelle fiche
const fiches = new Set();
for (let page = 1; page <= 30; page++) {
  const html = await get(page === 1 ? BASE : `${BASE}?sf_paged=${page}`);
  const avant = fiches.size;
  for (const [, slug] of html.matchAll(/href="https:\/\/www\.hexatrust\.com\/membres\/([a-z0-9-]+)\/"/g)) {
    if (slug === 'feed' || slug === 'page') continue; // flux RSS et pagination, pas des membres
    fiches.add(`${BASE}${slug}/`);
  }
  if (fiches.size === avant) break;
  await sleep(PAUSE_MS);
}

// 2. Chaque fiche : nom (h1) et lien du site (a.site)
const membres = [];
for (const fiche of fiches) {
  const html = await get(fiche);
  const nom = decode(html.match(/<h1[^>]*>([^<]*)/)?.[1] ?? '');
  const site = html.match(/<a href="([^"]+)" class="site"/)?.[1] ?? null;
  membres.push({ nom, site, fiche });
  await sleep(PAUSE_MS);
}

console.log(JSON.stringify({
  source: BASE,
  collecte_le: new Date().toISOString(),
  total: membres.length,
  membres,
}, null, 2));
