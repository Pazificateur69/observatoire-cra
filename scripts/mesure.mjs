// Mesure passive de trois signaux publics liés au Cyber Resilience Act
// (règlement (UE) 2024/2847) sur chaque site d'une liste d'entreprises.
//
//   1. canal     : un security.txt (RFC 9116) servi en https avec au moins un Contact
//   2. politique : un champ Policy dans ce security.txt (politique de divulgation)
//   3. csaf      : un provider-metadata.json CSAF 2.0 joignable (avis lisibles par machine)
//
// Uniquement des requêtes GET, sous un identifiant de robot honnête, vers des fichiers
// publiés pour être lus par des robots. Un site qui bloque, défie ou ne répond pas est
// « indéterminé », jamais « absent » : le taux d'absence publié est donc un minimum.
//
// Usage : node scripts/mesure.mjs data/hexatrust-membres.json
import { readFile, writeFile, mkdir } from 'node:fs/promises';

// Identifiant de robot honnête ; OBSERVATOIRE_CONTACT (adresse ou URL) y est ajouté s'il est défini.
const UA = `ObservatoireCRA/0.1 (mesure passive de signaux publics CRA${process.env.OBSERVATOIRE_CONTACT ? `; ${process.env.OBSERVATOIRE_CONTACT}` : ''})`;
const TIMEOUT_MS = 10_000;
const WORKERS = 8;
const RESEAUX = ['twitter.com', 'x.com', 'linkedin.com', 'facebook.com', 'instagram.com', 'youtube.com'];
// Pages anti-robot (Cloudflare, défis JavaScript/cookies, captchas)
const DEFI = /cf-chl|challenge-platform|captcha|just a moment|attention required|requires js|enable javascript|window\.location/i;
const maintenant = new Date();

// Un nouvel essai, avec un délai doublé, si le premier échoue au niveau réseau
async function lire(url, essai = 1) {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'text/plain, application/json;q=0.9, */*;q=0.1' },
      signal: AbortSignal.timeout(essai * TIMEOUT_MS),
    });
    const corps = (await res.text()).slice(0, 200_000);
    return { url, statut: res.status, finale: res.url, type: res.headers.get('content-type') ?? '', corps };
  } catch (e) {
    if (essai === 1) return lire(url, 2);
    return { url, statut: 0, erreur: e.cause?.code ?? e.name };
  }
}

const estHtml = (corps) => /<(!doctype|html|head|body)\b/i.test(corps.slice(0, 2000));
const estDefi = (r) => estHtml(r.corps) && r.corps.length < 20_000 && DEFI.test(r.corps);
const apexDe = (hote) => hote.split('.').slice(-2).join('.');
const estReseau = (hote) => RESEAUX.some((d) => hote === d || hote.endsWith(`.${d}`));

// « absent » : le serveur dit clairement qu'il n'y a rien (404, ou sa page de site à la place du fichier).
// « indetermine » : la réponse ne permet pas de conclure (blocage, défi anti-robot, panne, délai).
function nature(r) {
  if (r.statut === 404 || r.statut === 410) return 'absent';
  if (r.statut >= 200 && r.statut < 300) return estDefi(r) ? 'indetermine' : 'contenu';
  return 'indetermine';
}

function champsSecurityTxt(corps) {
  // Retire l'indicateur d'ordre des octets et la signature PGP éventuelle (RFC 9116 §2.3)
  const texte = corps.replace(/^﻿/, '').replace(/^-----BEGIN PGP SIGNATURE-----[\s\S]*$/m, '');
  const champs = {};
  for (const ligne of texte.split(/\r?\n/)) {
    const m = ligne.match(/^\s*([A-Za-z-]+)\s*:\s*(.+?)\s*$/);
    if (m) (champs[m[1].toLowerCase()] ??= []).push(m[2]);
  }
  return champs;
}

// Qualifie un security.txt déjà lu. Séparé de la lecture pour pouvoir requalifier
// une mesure enregistrée sans refaire de requête (option --recalculer).
function qualifier(st, date) {
  const expires = st.expires.length === 1 ? new Date(st.expires[0]) : null;
  const dateLisible = expires !== null && !Number.isNaN(expires.getTime());
  st.expire = dateLisible ? expires < date : null;
  // RFC 9116 §2.5.7 : Policy est un lien https ; une phrase n'est pas une politique publiée
  st.policy_liens = st.policy.filter((p) => /^https:\/\//i.test(p));
  // RFC 9116 §2.5.3 : Contact est une URI (mailto:, https://, tel:)
  st.contact_uri = st.contact.every((v) => /^(https:\/\/|mailto:|tel:)/i.test(v));
  // §2.5.5 et §3 : un seul Expires futur, servi en text/plain, champs Contact et Policy bien formés
  st.conforme_rfc9116 = Boolean(dateLisible && expires > date && /^text\/plain/i.test(st.type ?? '')
    && st.contact_uri && st.policy_liens.length === st.policy.length);
  return st;
}

function securityTxt(r) {
  if (nature(r) !== 'contenu' || estHtml(r.corps) || !r.finale.startsWith('https://')) return null;
  const c = champsSecurityTxt(r.corps);
  if (!c.contact?.length) return null;
  return qualifier({
    url: r.url,
    finale: r.finale,
    autre_domaine: apexDe(new URL(r.finale).hostname) !== apexDe(new URL(r.url).hostname),
    type: r.type,
    contact: c.contact,
    policy: c.policy ?? [],
    csaf: c.csaf ?? [],
    expires: c.expires ?? [],
  }, maintenant);
}

async function mesurer(membre) {
  const hote = new URL(membre.site).hostname.toLowerCase();
  const apex = apexDe(hote);
  const candidats = [...new Set([hote, apex, `www.${apex}`])];
  const res = { nom: membre.nom, site: membre.site, hote };

  if (estReseau(hote)) return { ...res, canal: 'site_non_renseigne', signaux: null };

  let accueil = await lire(`https://${hote}/`);
  if (accueil.statut === 0) accueil = await lire(`http://${hote}/`);
  res.joignable = accueil.statut > 0;
  res.accueil = { statut: accueil.statut, erreur: accueil.erreur };
  if (!res.joignable) return { ...res, canal: 'injoignable', signaux: null };

  // 1. security.txt : /.well-known/ sur chaque hôte candidat, puis l'emplacement hérité
  const urls = [
    ...candidats.map((h) => `https://${h}/.well-known/security.txt`),
    ...candidats.map((h) => `https://${h}/security.txt`),
  ];
  const essais = [];
  let st = null;
  for (const url of urls) {
    const r = await lire(url);
    st = securityTxt(r);
    const n = r.statut === 0 ? 'indetermine' : nature(r);
    essais.push({ url, statut: r.statut, erreur: r.erreur, classe: st ? 'present' : n === 'contenu' ? 'absent' : n });
    if (st) { st.emplacement = url.includes('/.well-known/') ? 'well-known' : 'herite'; break; }
  }
  res.essais = essais;
  res.securitytxt = st;
  // Sans fichier trouvé, on suit la réponse de l'hôte déclaré : on ne conclut que s'il a répondu clairement.
  res.canal = st ? 'present' : essais[0].classe;

  // 3. CSAF : champ CSAF du security.txt, /.well-known/csaf/, puis csaf.data.security.<domaine>
  res.csaf = null;
  const csafUrls = [
    ...(st?.csaf ?? []).filter((u) => u.startsWith('https://')),
    ...candidats.map((h) => `https://${h}/.well-known/csaf/provider-metadata.json`),
    `https://csaf.data.security.${apex}/`,
  ];
  for (const url of [...new Set(csafUrls)]) {
    const r = await lire(url);
    if (nature(r) !== 'contenu') continue;
    try {
      const j = JSON.parse(r.corps);
      if (j?.publisher && (j.canonical_url || j.metadata_version)) { res.csaf = { url, finale: r.finale }; break; }
    } catch { /* pas du JSON : pas un provider-metadata */ }
  }

  res.signaux = res.canal === 'indetermine' && !res.csaf ? null : {
    canal: res.canal === 'present',
    politique: Boolean(st?.policy_liens.length),
    csaf: Boolean(res.csaf),
  };
  return res;
}

async function pool(items, n, fn) {
  const sortie = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; sortie[k] = await fn(items[k]); }
  }));
  return sortie;
}

const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);

function synthetiser(resultats, mesureLe, echantillon) {
  const mesurables = resultats.filter((r) => r.signaux);
  const part = (f) => { const n = mesurables.filter(f).length; return { nombre: n, pct: pct(n, mesurables.length) }; };
  const present = resultats.filter((r) => r.canal === 'present');
  return {
    mesure_le: mesureLe,
    echantillon,
    membres: resultats.length,
    sites_non_renseignes: resultats.filter((r) => r.canal === 'site_non_renseigne').length,
    injoignables: resultats.filter((r) => r.canal === 'injoignable').length,
    indetermines: resultats.filter((r) => r.joignable && !r.signaux).length,
    mesurables: mesurables.length,
    canal: part((r) => r.signaux.canal),
    sans_canal: part((r) => !r.signaux.canal),
    politique: part((r) => r.signaux.politique),
    csaf: part((r) => r.signaux.csaf),
    aucun_signal: part((r) => !r.signaux.canal && !r.signaux.politique && !r.signaux.csaf),
    parmi_les_security_txt: {
      nombre: present.length,
      conformes_rfc9116: present.filter((r) => r.securitytxt.conforme_rfc9116).length,
      expires: present.filter((r) => r.securitytxt.expire === true).length,
      sans_expires: present.filter((r) => r.securitytxt.expires.length === 0).length,
      emplacement_herite: present.filter((r) => r.securitytxt.emplacement === 'herite').length,
      via_autre_domaine: present.filter((r) => r.securitytxt.autre_domaine).length,
      contact_mal_forme: present.filter((r) => !r.securitytxt.contact_uri).length,
      policy_sans_lien: present.filter((r) => r.securitytxt.policy.length && !r.securitytxt.policy_liens.length).length,
    },
    score: [0, 1, 2, 3].map((s) => mesurables.filter((r) => r.signaux.canal + r.signaux.politique + r.signaux.csaf === s).length),
  };
}

let resultats;
let synthese;
if (process.argv[2] === '--recalculer') {
  // Requalifie une mesure enregistrée avec les règles actuelles, sans nouvelle requête :
  // la date et les réponses observées restent celles du jour de la mesure.
  const ancienne = JSON.parse(await readFile(process.argv[3], 'utf8'));
  const date = new Date(ancienne.synthese.mesure_le);
  resultats = ancienne.resultats;
  for (const r of resultats) {
    if (r.securitytxt) qualifier(r.securitytxt, date);
    if (r.signaux) r.signaux.politique = Boolean(r.securitytxt?.policy_liens.length);
  }
  synthese = { ...synthetiser(resultats, ancienne.synthese.mesure_le, ancienne.synthese.echantillon), requalifiee_le: maintenant.toISOString() };
} else {
  const source = JSON.parse(await readFile(process.argv[2], 'utf8'));
  const membres = source.membres.filter((m) => m.site);
  resultats = await pool(membres, WORKERS, mesurer);
  synthese = synthetiser(resultats, maintenant.toISOString(), { nom: 'Annuaire des membres Hexatrust', source: source.source, collecte_le: source.collecte_le });
}

const jourMesure = synthese.mesure_le.slice(0, 10);
await mkdir('data/prive', { recursive: true });
await writeFile(`data/prive/mesure-${jourMesure}.json`, JSON.stringify({ synthese, resultats }, null, 2));
await writeFile(`data/synthese-${jourMesure}.json`, JSON.stringify(synthese, null, 2));
console.log(JSON.stringify(synthese, null, 2));
