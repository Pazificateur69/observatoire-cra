// Génère la fiche individuelle de chaque entreprise mesurée (HTML imprimable en PDF)
// et un index CSV pour le suivi des envois. Tout reste dans data/prive/ (non publié).
//
// Usage : node scripts/fiche.mjs            (toutes les fiches de la dernière mesure)
//         node scripts/fiche.mjs wallix     (seulement les entreprises dont le nom ou l'hôte contient « wallix »)
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';

const mesures = (await readdir('data/prive')).filter((f) => /^mesure-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
if (!mesures.length) throw new Error('Aucune mesure dans data/prive/ : lancer scripts/mesure.mjs d\'abord.');
const { synthese: s, resultats } = JSON.parse(await readFile(`data/prive/${mesures.at(-1)}`, 'utf8'));
const filtre = (process.argv[2] ?? '').toLowerCase();

// Tout ce qui vient d'un site mesuré est échappé : un security.txt peut contenir n'importe quoi.
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ent = new Intl.NumberFormat('fr-FR');
const dec = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (n, d) => `${dec.format((100 * n) / d)} %`;
const fuseau = { timeZone: 'Europe/Paris' };
const dateLongue = (iso) => new Intl.DateTimeFormat('fr-FR', { ...fuseau, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
const horodatage = (iso) => new Intl.DateTimeFormat('fr-FR', { ...fuseau, dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso));
const apexDe = (h) => h.split('.').slice(-2).join('.');
const mesurables = s.mesurables;

const ETAT = {
  present: ['plein', 'Présent'],
  absent: ['', 'Absent'],
  indetermine: ['hachure', 'Indéterminé'],
  injoignable: ['hachure', 'Site injoignable'],
  site_non_renseigne: ['hachure', 'Site non renseigné'],
};
const repere = (classe) => `<i class="repere ${classe}" aria-hidden="true"></i>`;

function constats(r) {
  const st = r.securitytxt;
  const liste = [];
  if (r.canal === 'indetermine') {
    liste.push('Notre robot, qui s\'identifie comme <code>ObservatoireCRA</code>, n\'a pas pu lire votre site (blocage, défi anti-robot ou délai dépassé). Si vous publiez un security.txt, autorisez l\'accès à <code>/.well-known/security.txt</code> aux robots : les outils de signalement automatiques doivent pouvoir le lire.');
  }
  if (r.canal === 'injoignable') liste.push(`Votre site déclaré (<code>${esc(r.hote)}</code>) n'a pas répondu lors de la mesure, même après un second essai.`);
  if (r.canal === 'site_non_renseigne') liste.push('Le site indiqué dans l\'annuaire Hexatrust est un réseau social : il n\'a pas pu être mesuré. Corriger l\'annuaire permettra de vous inclure à la prochaine mesure.');
  if (r.canal === 'absent') liste.push(`Aucun security.txt n'est publié sur <code>${esc(r.hote)}</code>, ni sur le domaine nu ou sa variante <code>www</code>, ni à l'ancien emplacement. Un chercheur qui découvre une faille dans vos produits n'a pas d'adresse standard où la signaler.`);
  if (st) {
    if (!st.expires.length) liste.push('Le champ <code>Expires</code> manque. Il est obligatoire dans la RFC 9116 : sans lui, les outils ne savent pas si les informations sont à jour.');
    else if (st.expire) liste.push(`Le fichier a expiré (<code>Expires: ${esc(st.expires[0])}</code>). Les outils le considèrent comme périmé : mettez la date à jour.`);
    if (!/^text\/plain/i.test(st.type ?? '')) liste.push(`Le fichier est servi en <code>${esc(st.type || 'type inconnu')}</code> au lieu de <code>text/plain</code>, comme l'exige la RFC 9116.`);
    if (st.emplacement === 'herite') liste.push('Le fichier est à l\'ancien emplacement <code>/security.txt</code>. Publiez-le à <code>/.well-known/security.txt</code>, ou redirigez cette adresse vers lui.');
    if (!st.contact_uri) liste.push(`Un champ <code>Contact</code> n'est pas écrit sous forme d'adresse (<code>${esc(st.contact.find((v) => !/^(https:\/\/|mailto:|tel:)/i.test(v)))}</code>). La RFC 9116 demande <code>mailto:</code> devant une adresse électronique, <code>tel:</code> devant un numéro, ou un lien <code>https://</code>.`);
    if (st.policy.length && !st.policy_liens.length) liste.push(`Le champ <code>Policy</code> contient une phrase (<code>${esc(st.policy[0].slice(0, 80))}</code>) au lieu d'un lien vers votre politique de divulgation. Les outils ne peuvent pas le suivre : il n'est pas compté comme politique publiée.`);
    if (!st.policy.length) liste.push('Aucun champ <code>Policy</code> ne renvoie vers votre politique de divulgation. Le CRA en exige une à partir du 11 décembre 2027.');
    if (st.conforme_rfc9116 && st.policy_liens.length) liste.push('Votre security.txt est conforme à la RFC 9116 et renvoie vers une politique de divulgation.');
  }
  if (r.signaux && !r.signaux.csaf) liste.push('Aucun fichier CSAF n\'a été trouvé. Si vous publiez des avis de sécurité, le format CSAF 2.0 permet à vos clients de les récupérer automatiquement.');
  return liste;
}

function modele(r) {
  const apex = apexDe(r.hote);
  const expire = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);
  return [
    '# À adapter : remplacez l\'adresse et la page de politique par les vôtres.',
    `Contact: mailto:security@${apex}`,
    `Expires: ${expire}T00:00:00Z`,
    '# Page qui décrit comment signaler une faille et ce que vous vous engagez à faire.',
    `Policy: https://${r.hote}/securite`,
    'Preferred-Languages: fr, en',
    `Canonical: https://${r.hote}/.well-known/security.txt`,
  ].join('\n');
}

const css = `
  :root{--encre:#161616;--gris:#5e5e5e;--filet:#d9dad6;--marge:#f2f3f0;--tampon:#5a2d82;
    --serif:Charter,"Bitstream Charter","Iowan Old Style",Cambria,Georgia,serif;--sans:-apple-system,"Segoe UI",system-ui,Roboto,Arial,sans-serif;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
  *{box-sizing:border-box}
  body{margin:0;background:#fff;color:var(--encre);font:16px/1.55 var(--serif)}
  .page{max-width:760px;margin:0 auto;padding:40px 32px 64px}
  .tete{display:flex;justify-content:space-between;gap:16px;padding-bottom:10px;border-bottom:1px solid var(--encre);font:500 12.5px/1.3 var(--sans)}
  h1{font-size:28px;line-height:1.2;font-weight:600;margin:28px 0 6px}
  .sous{margin:0 0 28px;color:var(--gris);font:14px/1.5 var(--sans)}
  h2{font:600 15px/1.3 var(--sans);margin:32px 0 12px;padding-bottom:6px;border-bottom:1px solid var(--filet)}
  table{width:100%;border-collapse:collapse;font:14px/1.4 var(--sans);font-variant-numeric:tabular-nums}
  th,td{text-align:left;padding:8px 0;border-bottom:1px solid var(--filet);vertical-align:top}
  td+td,th+th{padding-left:14px}
  .signaux td:first-child{width:28px}
  .repere{display:inline-block;width:11px;height:11px;border:1.5px solid var(--encre);vertical-align:-1px}
  .plein{background:var(--encre)}
  .hachure{background:repeating-linear-gradient(45deg,var(--encre) 0 1.5px,transparent 1.5px 3.8px)}
  ul{padding-left:1.2em;margin:0}
  li{margin-bottom:8px}
  code{font-family:var(--mono);font-size:.86em;background:var(--marge);padding:.05em .3em;border-radius:2px;overflow-wrap:anywhere}
  pre{margin:0;padding:16px 18px;background:var(--marge);border:1px solid var(--filet);font:13px/1.65 var(--mono);white-space:pre-wrap;overflow-wrap:anywhere}
  pre code{background:none;padding:0;font-size:inherit}
  .preuves td{font-family:var(--mono);font-size:12.5px;overflow-wrap:anywhere}
  .note{font:13px/1.5 var(--sans);color:var(--gris)}
  .chiffre{color:var(--tampon);font-weight:600}
  @media print{.page{padding:0}a{color:inherit}}
`;

function fiche(r) {
  const etat = ETAT[r.canal] ?? ETAT.indetermine;
  const st = r.securitytxt;
  const ligne = (nom, present, detail) => `<tr><td>${repere(present === null ? 'hachure' : present ? 'plein' : '')}</td><td><b>${nom}</b></td><td>${present === null ? 'Indéterminé' : present ? 'Présent' : 'Absent'}</td><td>${detail}</td></tr>`;
  const sig = r.signaux;
  const essais = (r.essais ?? []).map((e) => `<tr><td>${esc(e.url)}</td><td>${e.statut || esc(e.erreur ?? '—')}</td><td>${esc(e.classe)}</td></tr>`).join('');
  const champs = st ? [
    ...st.contact.map((v) => ['Contact', v]),
    ...st.expires.map((v) => ['Expires', v]),
    ...st.policy.map((v) => ['Policy', v]),
    ...st.csaf.map((v) => ['CSAF', v]),
  ].map(([k, v]) => `<tr><td><code>${k}</code></td><td>${esc(v)}</td></tr>`).join('') : '';

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>Fiche Observatoire CRA — ${esc(r.nom)}</title><style>${css}</style></head>
<body><div class="page">
  <div class="tete"><span><b>Observatoire CRA</b> · indépendant</span><span>Fiche individuelle · mesure du ${dateLongue(s.mesure_le)}</span></div>
  <h1>${esc(r.nom)}</h1>
  <p class="sous">Site mesuré : <code>${esc(r.site)}</code> · ${horodatage(s.mesure_le)} (heure de Paris) · document confidentiel, adressé à l'entreprise concernée uniquement.</p>

  <h2>Vos trois signaux</h2>
  <table class="signaux"><tbody>
    ${ligne('Canal de signalement', sig ? sig.canal : null, st ? `security.txt trouvé à <code>${esc(st.finale)}</code>` : 'Fichier security.txt (RFC 9116)')}
    ${ligne('Politique de divulgation', sig ? sig.politique : null, st?.policy_liens.length ? `<code>${esc(st.policy_liens[0])}</code>` : st?.policy.length ? 'Champ Policy présent mais sans lien' : 'Champ Policy du security.txt')}
    ${ligne('Avis lisibles par machine', sig ? sig.csaf : null, r.csaf ? `<code>${esc(r.csaf.url)}</code>` : 'Fichier provider-metadata.json au format CSAF 2.0')}
  </tbody></table>
  <p class="note">${repere(etat[0])} État général : ${etat[1]}.</p>

  <h2>Ce que nous avons constaté</h2>
  <ul>${constats(r).map((c) => `<li>${c}</li>`).join('')}</ul>

  ${champs ? `<h2>Contenu lu dans votre security.txt</h2><table><tbody>${champs}</tbody></table>` : ''}

  <h2>Un security.txt prêt à adapter</h2>
  <p>À publier en texte brut (<code>text/plain</code>), en https, à l'adresse <code>https://${esc(r.hote)}/.well-known/security.txt</code>.</p>
  <pre><code>${esc(modele(r))}</code></pre>

  <h2>Ce que dit le Cyber Resilience Act</h2>
  <ul>
    <li><b>Depuis le 11 septembre 2026</b>, un fabricant de produits comportant des éléments numériques déclare toute vulnérabilité activement exploitée : alerte précoce sous 24 heures, notification sous 72 heures, rapport final sous 14 jours après la disponibilité d'un correctif, via la plateforme unique de l'ENISA.</li>
    <li><b>À partir du 11 décembre 2027</b>, il doit disposer d'une politique de divulgation coordonnée des vulnérabilités et d'un point de contact pour les signalements.</li>
  </ul>
  <p class="note">Le règlement n'impose pas le format security.txt ; c'est la manière standard et lisible par machine de publier ce point de contact. Un logiciel fourni uniquement en ligne (SaaS) et un prestataire de services sont en principe hors du champ du CRA.</p>

  <h2>Votre position dans l'échantillon</h2>
  <p>Sur les ${ent.format(mesurables)} membres d'Hexatrust dont le site a pu être mesuré, <span class="chiffre">${ent.format(s.sans_canal.nombre)}</span> (${pct(s.sans_canal.nombre, mesurables)}) ne publient pas de security.txt, ${ent.format(s.parmi_les_security_txt.conformes_rfc9116)} en publient un conforme à la norme, ${ent.format(s.politique.nombre)} renvoient vers une politique de divulgation et ${s.csaf.nombre ? ent.format(s.csaf.nombre) : 'aucun ne'} publie${s.csaf.nombre > 1 ? 'nt' : ''} d'avis CSAF.</p>

  <h2>Preuves de la mesure</h2>
  <table class="preuves"><thead><tr><th>Adresse interrogée</th><th>Réponse</th><th>Classement</th></tr></thead><tbody>
    <tr><td>https://${esc(r.hote)}/</td><td>${r.accueil?.statut || esc(r.accueil?.erreur ?? '—')}</td><td>page d'accueil</td></tr>
    ${essais}
  </tbody></table>
  <p class="note">Requêtes GET uniquement, sous l'identifiant de robot <code>ObservatoireCRA</code>, vers des fichiers publiés pour être lus par des machines. Une erreur de classement ? Répondez à l'envoi de cette fiche : toute correction justifiée est appliquée à la mesure suivante.</p>
</div></body></html>
`;
}

const slug = (h) => h.replace(/[^a-z0-9.-]/gi, '_');
const choisis = resultats.filter((r) => !filtre || r.nom.toLowerCase().includes(filtre) || r.hote.includes(filtre));
await mkdir('data/prive/fiches', { recursive: true });
for (const r of choisis) await writeFile(`data/prive/fiches/${slug(r.hote)}.html`, fiche(r));

const csv = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
const lignes = [['entreprise', 'site', 'etat', 'canal', 'conforme_rfc9116', 'politique', 'csaf', 'contact_security_txt', 'fiche', 'envoyee_le', 'reponse', 'notes']];
for (const r of resultats) {
  lignes.push([
    r.nom, r.site, r.canal,
    r.signaux ? (r.signaux.canal ? 'oui' : 'non') : '?',
    r.securitytxt ? (r.securitytxt.conforme_rfc9116 ? 'oui' : 'non') : '',
    r.signaux ? (r.signaux.politique ? 'oui' : 'non') : '?',
    r.signaux ? (r.signaux.csaf ? 'oui' : 'non') : '?',
    r.securitytxt?.contact.join(' ') ?? '',
    `fiches/${slug(r.hote)}.html`, '', '', '',
  ]);
}
await writeFile('data/prive/fiches/index.csv', `﻿${lignes.map((l) => l.map(csv).join(';')).join('\n')}\n`);
console.log(`${choisis.length} fiche(s) écrite(s) dans data/prive/fiches/ ; index.csv à jour (${resultats.length} lignes).`);
