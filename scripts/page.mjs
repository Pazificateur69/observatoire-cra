// Génère la page publique site/index.html à partir des synthèses data/synthese-*.json.
// Aucun chiffre n'est écrit à la main : tout vient des fichiers de mesure.
// Seules les synthèses (chiffres globaux) sont lues ; aucune donnée par entreprise.
//
// Usage : node scripts/page.mjs
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// À renseigner avant publication, par variables d'environnement (ou dans les variables du dépôt
// GitHub pour la remesure mensuelle). Tant que le contact est vide, la page l'indique
// et le security.txt du site n'est pas généré.
const CONTACT = process.env.OBSERVATOIRE_CONTACT_PAGE ?? ''; // ex. 'mailto:contact@domaine.fr'
const AUTEUR = process.env.OBSERVATOIRE_AUTEUR ?? ''; // ex. 'Prénom Nom'
const SITE = process.env.OBSERVATOIRE_SITE ?? ''; // ex. 'https://observatoire-cra.fr' (pour le Canonical du security.txt)

const fichiers = (await readdir('data')).filter((f) => /^synthese-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
if (!fichiers.length) throw new Error('Aucune synthèse dans data/ : lancer scripts/mesure.mjs d\'abord.');
const syntheses = await Promise.all(fichiers.map(async (f) => JSON.parse(await readFile(`data/${f}`, 'utf8'))));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const dec = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ent = new Intl.NumberFormat('fr-FR');
const pct = (n, d) => `${dec.format((100 * n) / d)} %`;
const fuseau = { timeZone: 'Europe/Paris' };
const dateLongue = (iso) => new Intl.DateTimeFormat('fr-FR', { ...fuseau, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
const dateCourte = (iso) => new Intl.DateTimeFormat('fr-FR', { ...fuseau, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso)).replaceAll('/', '.');
const dateIso = (iso) => new Intl.DateTimeFormat('sv-SE', fuseau).format(new Date(iso));

// Numéro de mesure : année / rang dans l'année
const numeros = [];
for (const s of syntheses) {
  const an = dateIso(s.mesure_le).slice(0, 4);
  numeros.push(`${an}/${numeros.filter((n) => n.startsWith(`${an}/`)).length + 1}`);
}
const s = syntheses.at(-1);
const numero = numeros.at(-1);
const m = s.mesurables;
const avecPolitique = s.politique.nombre;
const canalSeul = s.canal.nombre - avecPolitique;
const sansCanal = s.sans_canal.nombre;
const st = s.parmi_les_security_txt;
const exclus = s.sites_non_renseignes + s.injoignables + s.indetermines;
const quantite = (n, un, plusieurs) => (n === 0 ? `aucun ${un}` : `${ent.format(n)} ${n > 1 ? plusieurs : un}`);

// Notes de marge, numérotées dans l'ordre d'apparition
const notes = [];
const note = (html) => { notes.push(html); const k = notes.length; return `<sup><a href="#n${k}" id="r${k}" aria-describedby="n${k}">${k}</a></sup>`; };
const notesDe = (debut) => notes.slice(debut).map((html, i) => {
  const k = debut + i + 1;
  return `<p id="n${k}"><a href="#r${k}" aria-label="Retour à l'appel de note ${k}">${k}</a> ${html}</p>`;
}).join('\n        ');

const releve = [
  ...Array(avecPolitique).fill('<i class="plein"></i>'),
  ...Array(canalSeul).fill('<i class="hachure"></i>'),
  ...Array(sansCanal).fill('<i></i>'),
].join('');

const articles = [
  ['constat', 'Article premier', 'Constat'],
  ['mesure', 'Article 2', 'Ce qui est mesuré'],
  ['calendrier', 'Article 3', 'Pourquoi maintenant'],
  ['methode', 'Article 4', 'Méthode'],
  ['limites', 'Article 5', 'Limites'],
  ['registre', 'Annexe I', 'Registre des mesures'],
  ['fiche', 'Annexe II', 'Demander sa fiche'],
];
const sommaire = () => articles.map(([id, num, titre]) =>
  `<li><a href="#${id}"><span>${num}</span>${titre}</a></li>`).join('\n        ');

const contact = CONTACT
  ? `<a href="${esc(CONTACT)}">${esc(CONTACT.replace(/^mailto:/, ''))}</a>`
  : '<span class="a-definir">adresse de contact à définir avant publication</span>';

// --- Article premier ---
let n0 = notes.length;
const a1 = `
      <section id="constat" class="article" aria-labelledby="t-constat">
        <div class="texte">
          <h2 id="t-constat">Article premier — Constat</h2>
          <p class="constat"><em>${ent.format(sansCanal)}</em> des ${ent.format(m)} sites mesurés <span class="nw">ne publient pas</span> de security.txt.</p>
          <p class="alinea"><span class="num">1.</span> Le security.txt est le fichier standard, décrit par la RFC&nbsp;9116, qui indique où signaler une faille de sécurité. ${st.conformes_rfc9116 > 1 ? `${ent.format(st.conformes_rfc9116)} sites seulement en publient un conforme à la norme` : 'Presque aucun site n\'en publie un conforme à la norme'}&nbsp;; ${ent.format(avecPolitique)} y renvoient vers une politique de divulgation&nbsp;; ${s.csaf.nombre ? `${ent.format(s.csaf.nombre)} publient` : 'aucun ne publie'} d'avis de sécurité lisibles par machine (CSAF)${note(`Champ&nbsp;: annuaire public des ${ent.format(s.membres)} membres <a href="${esc(s.echantillon.source)}">Hexatrust</a>, groupement d'entreprises françaises de cybersécurité, collecté le ${dateLongue(s.echantillon.collecte_le)}. ${ent.format(exclus)} sites non mesurables sont exclus du calcul (voir l'article&nbsp;4).`)}.</p>
          <figure class="figure-releve">
            <figcaption><span class="fig">Figure&nbsp;1</span> Relevé des ${ent.format(m)} sites mesurés, un repère par site</figcaption>
            <div class="releve" role="img" aria-label="${ent.format(avecPolitique)} sites avec security.txt et politique de divulgation, ${ent.format(canalSeul)} avec security.txt seul, ${ent.format(sansCanal)} sans aucun fichier.">${releve}</div>
            <ul class="legende">
              <li><i class="plein"></i>security.txt et politique de divulgation <b>${ent.format(avecPolitique)}</b></li>
              <li><i class="hachure"></i>security.txt seul <b>${ent.format(canalSeul)}</b></li>
              <li><i></i>aucun fichier <b>${ent.format(sansCanal)}</b></li>
            </ul>
          </figure>
          <p class="alinea"><span class="num">2.</span> Depuis le 11&nbsp;septembre 2026, les fabricants de produits comportant des éléments numériques doivent déclarer sous 24&nbsp;heures toute vulnérabilité activement exploitée dont ils ont connaissance${note('Règlement (UE) 2024/2847 du 23&nbsp;octobre 2024 (Cyber Resilience Act), article&nbsp;14.')}. Un canal public de signalement est la porte par laquelle cette connaissance arrive.</p>
          <p class="alinea"><span class="num">3.</span> Le taux de ${pct(sansCanal, m)} est un minimum&nbsp;: tout site qui bloque, défie ou ne répond pas est compté hors calcul, jamais comme absent.</p>
        </div>
        <aside class="notes" aria-label="Notes de l'article premier">
        ${notesDe(n0)}
          <p class="note-libre">Aucune entreprise n'est nommée. Chacune peut demander sa fiche (annexe&nbsp;II).</p>
        </aside>
      </section>`;

// --- Article 2 ---
n0 = notes.length;
const exemple = [
  'Contact: mailto:securite@editeur.example',
  'Expires: 2027-10-26T00:00:00Z',
  'Policy: https://editeur.example/divulgation',
  'Preferred-Languages: fr, en',
  'Canonical: https://editeur.example/.well-known/security.txt',
  'CSAF: https://editeur.example/.well-known/csaf/provider-metadata.json',
].join('\n');
const a2 = `
      <section id="mesure" class="article" aria-labelledby="t-mesure">
        <div class="texte">
          <h2 id="t-mesure">Article 2 — Ce qui est mesuré</h2>
          <p class="alinea">L'observatoire lit trois signaux publiés pour être lus par des machines. Chacun porte le nom littéral du champ ou du fichier cherché.</p>
          <dl class="signaux">
            <div>
              <dt><code>Contact:</code> <span>le canal de signalement</span></dt>
              <dd>Un fichier <code>security.txt</code> servi en https, à l'adresse <code>/.well-known/security.txt</code>, avec au moins un champ <code>Contact</code>. C'est l'adresse à laquelle un chercheur signale une faille. <b>${quantite(s.canal.nombre, 'site', 'sites')} sur ${ent.format(m)}, ${pct(s.canal.nombre, m)}.</b></dd>
            </div>
            <div>
              <dt><code>Policy:</code> <span>la politique de divulgation</span></dt>
              <dd>Un champ <code>Policy</code> dont la valeur est un lien https vers les règles de signalement et de divulgation coordonnée&nbsp;: délais, engagements, conduite attendue. Une phrase écrite à la place du lien n'est pas comptée. <b>${quantite(avecPolitique, 'site', 'sites')}, ${pct(avecPolitique, m)}.</b></dd>
            </div>
            <div>
              <dt><code>CSAF</code> <span>les avis lisibles par machine</span></dt>
              <dd>Un fichier <code>provider-metadata.json</code> au format CSAF&nbsp;2.0, qui permet aux clients de récupérer automatiquement les avis de sécurité d'un éditeur${note('Common Security Advisory Framework, standard OASIS. Cherché via le champ <code>CSAF</code> du security.txt, à <code>/.well-known/csaf/provider-metadata.json</code> et sur <code>csaf.data.security.&lt;domaine&gt;</code>.')}. <b>${s.csaf.nombre ? `${quantite(s.csaf.nombre, 'site', 'sites')}, ${pct(s.csaf.nombre, m)}` : 'Aucun site'}.</b></dd>
            </div>
          </dl>
          <figure class="specimen">
            <figcaption><span class="fig">Figure&nbsp;2</span> Exemple de security.txt complet, à l'échelle réelle. Fichier fictif&nbsp;: le domaine <code>editeur.example</code> est réservé aux exemples.</figcaption>
            <pre><code>${exemple.split('\n').map((l) => `<span class="l">${esc(l)}</span>`).join('')}</code></pre>
          </figure>
          <table class="tableau">
            <caption><span class="fig">Tableau&nbsp;1</span> Détail du relevé du ${dateLongue(s.mesure_le)}</caption>
            <tbody>
              <tr><th scope="row">Membres de l'annuaire</th><td>${ent.format(s.membres)}</td><td></td></tr>
              <tr class="retrait"><th scope="row">site non renseigné (réseau social)</th><td>${ent.format(s.sites_non_renseignes)}</td><td></td></tr>
              <tr class="retrait"><th scope="row">site injoignable</th><td>${ent.format(s.injoignables)}</td><td></td></tr>
              <tr class="retrait"><th scope="row">réponse indéterminée (blocage, défi anti-robot, délai)</th><td>${ent.format(s.indetermines)}</td><td></td></tr>
              <tr class="total"><th scope="row">Sites mesurables</th><td>${ent.format(m)}</td><td>100,0&nbsp;%</td></tr>
              <tr><th scope="row">sans security.txt</th><td>${ent.format(sansCanal)}</td><td>${pct(sansCanal, m)}</td></tr>
              <tr><th scope="row">avec security.txt</th><td>${ent.format(s.canal.nombre)}</td><td>${pct(s.canal.nombre, m)}</td></tr>
              <tr class="retrait"><th scope="row">dont conforme à la RFC&nbsp;9116${note('Conforme&nbsp;: un champ <code>Contact</code>, un seul champ <code>Expires</code> à une date future, fichier servi en <code>text/plain</code> et en https, champs <code>Contact</code> écrits comme des adresses (<code>mailto:</code>, <code>tel:</code>, <code>https://</code>) et champs <code>Policy</code> comme des liens (RFC&nbsp;9116, sections 2.5 et 3).')}</th><td>${ent.format(st.conformes_rfc9116)}</td><td>${pct(st.conformes_rfc9116, m)}</td></tr>
              <tr class="retrait"><th scope="row">dont sans date d'expiration</th><td>${ent.format(st.sans_expires)}</td><td></td></tr>
              <tr class="retrait"><th scope="row">dont expiré</th><td>${ent.format(st.expires)}</td><td></td></tr>
              <tr class="retrait"><th scope="row">dont à l'ancien emplacement (<code>/security.txt</code>)</th><td>${ent.format(st.emplacement_herite)}</td><td></td></tr>
              <tr class="retrait"><th scope="row">dont adresse de contact écrite sans <code>mailto:</code></th><td>${ent.format(st.contact_mal_forme ?? 0)}</td><td></td></tr>
              <tr class="retrait"><th scope="row">dont champ <code>Policy</code> rédigé en phrase, sans lien</th><td>${ent.format(st.policy_sans_lien ?? 0)}</td><td></td></tr>
              <tr><th scope="row">avec politique de divulgation</th><td>${ent.format(avecPolitique)}</td><td>${pct(avecPolitique, m)}</td></tr>
              <tr><th scope="row">avec avis CSAF</th><td>${ent.format(s.csaf.nombre)}</td><td>${pct(s.csaf.nombre, m)}</td></tr>
            </tbody>
          </table>
        </div>
        <aside class="notes" aria-label="Notes de l'article 2">
        ${notesDe(n0)}
        </aside>
      </section>`;

// --- Article 3 ---
n0 = notes.length;
const a3 = `
      <section id="calendrier" class="article" aria-labelledby="t-calendrier">
        <div class="texte">
          <h2 id="t-calendrier">Article 3 — Pourquoi maintenant</h2>
          <ol class="echeances">
            <li>
              <time datetime="2026-09-11">11 septembre 2026</time>
              <p><b>En vigueur.</b> Les fabricants déclarent toute vulnérabilité activement exploitée&nbsp;: alerte précoce sous 24&nbsp;heures, notification sous 72&nbsp;heures, rapport final au plus tard 14&nbsp;jours après la disponibilité d'un correctif. Ils déclarent aussi tout incident grave touchant la sécurité de leurs produits, avec les mêmes délais de 24 et 72&nbsp;heures et un rapport final dans le mois qui suit la notification. Les déclarations passent par la plateforme unique de l'ENISA${note('Commission européenne, <a href="https://digital-strategy.ec.europa.eu/en/policies/cra-reporting">Cyber Resilience Act — Reporting obligations</a>.')}. L'obligation vaut aussi pour les produits déjà sur le marché.</p>
            </li>
            <li>
              <time datetime="2027-12-11">11 décembre 2027</time>
              <p><b>À venir.</b> Le reste du règlement s'applique, dont l'obligation de mettre en place une politique de divulgation coordonnée des vulnérabilités et de fournir une adresse de contact pour les signalements${note('Règlement (UE) 2024/2847, annexe&nbsp;I, partie&nbsp;II, et article&nbsp;13 (point de contact unique).')}.</p>
            </li>
          </ol>
          <p class="alinea">Le règlement n'impose pas le format security.txt. Il impose un point de contact et une politique de divulgation&nbsp;; le security.txt est la manière standard et lisible par machine de les publier. Son absence ne prouve pas qu'une entreprise n'a aucun canal, elle prouve que ce canal n'est pas publié là où les chercheurs et les outils le cherchent.</p>
        </div>
        <aside class="notes" aria-label="Notes de l'article 3">
        ${notesDe(n0)}
        </aside>
      </section>`;

// --- Article 4 ---
n0 = notes.length;
const a4 = `
      <section id="methode" class="article" aria-labelledby="t-methode">
        <div class="texte">
          <h2 id="t-methode">Article 4 — Méthode</h2>
          <ol class="etapes">
            <li><b>Échantillon.</b> L'annuaire public des membres Hexatrust est collecté en entier, sans tri, le ${dateLongue(s.echantillon.collecte_le)}&nbsp;: ${ent.format(s.membres)} membres, éditeurs comme prestataires de services. L'annuaire ne permet pas de les distinguer, et aucun classement n'est fait à la main.</li>
            <li><b>Requêtes.</b> Pour chaque site, uniquement des requêtes GET, sous un identifiant de robot déclaré (<code>ObservatoireCRA</code>), vers des fichiers publiés pour être lus par des machines. Aucun test d'intrusion, aucun formulaire, aucune page privée.</li>
            <li><b>Recherche du security.txt.</b> À <code>/.well-known/security.txt</code> sur l'hôte déclaré, le domaine nu et sa variante <code>www</code>, puis à l'ancien emplacement <code>/security.txt</code>. Une redirection vers un autre domaine de la même entreprise est acceptée.</li>
            <li><b>Classement.</b> <em>Présent</em>&nbsp;: un fichier texte servi en https avec au moins un <code>Contact</code>. <em>Absent</em>&nbsp;: le serveur répond clairement qu'il n'y a rien (erreur 404, ou page du site renvoyée à la place du fichier). <em>Indéterminé</em>&nbsp;: blocage, défi anti-robot, panne ou délai dépassé après un second essai. Les indéterminés sont exclus du calcul.</li>
            <li><b>Contrôle.</b> Lors de la première mesure, tous les sites classés présents et seize sites classés absents ont été vérifiés à la main&nbsp;; un faux positif (fiche d'annuaire pointant vers un réseau social) et un défi anti-robot compté à tort comme absent ont été corrigés avant publication. Les règles de forme (adresse de contact, lien de politique) ont ensuite été appliquées aux fichiers déjà lus, sans nouvelle requête&nbsp;: une politique rédigée en phrase a été retirée du décompte.</li>
            <li><b>Reproductibilité.</b> Les scripts sont publics&nbsp;: <code>node scripts/collecte-hexatrust.mjs</code>, puis <code>node scripts/mesure.mjs</code>. Les chiffres de cette page sont générés depuis la synthèse, sans saisie manuelle.</li>
          </ol>
        </div>
        <aside class="notes" aria-label="Notes de l'article 4">
          <p class="note-libre">Mesure du ${dateLongue(s.mesure_le)}, ${new Intl.DateTimeFormat('fr-FR', { ...fuseau, hour: '2-digit', minute: '2-digit' }).format(new Date(s.mesure_le))} (heure de Paris).</p>
        </aside>
      </section>`;

// --- Article 5 ---
const a5 = `
      <section id="limites" class="article" aria-labelledby="t-limites">
        <div class="texte">
          <h2 id="t-limites">Article 5 — Limites</h2>
          <ol class="etapes">
            <li>Le security.txt n'est pas le seul canal possible. Une entreprise peut publier une adresse de signalement ailleurs sur son site&nbsp;; elle n'est alors pas trouvable par les outils automatiques, mais elle existe.</li>
            <li>L'échantillon mélange fabricants et prestataires de services. Le CRA s'applique aux fabricants de produits comportant des éléments numériques&nbsp;; un cabinet de conseil ou un logiciel fourni uniquement en ligne (SaaS) en est en principe exclu.</li>
            <li>Une mesure est un instantané. Un fichier publié le lendemain n'apparaît qu'à la mesure suivante.</li>
            <li>${ent.format(exclus)} sites sur ${ent.format(s.membres)} n'ont pas pu être mesurés. Si les ${ent.format(s.indetermines)} sites indéterminés publiaient tous un security.txt, le taux d'absence serait encore de ${pct(sansCanal, m + s.indetermines)} des ${ent.format(m + s.indetermines)} sites joignables&nbsp;; si les ${ent.format(exclus)} sites non mesurés en publiaient tous un, il serait de ${pct(sansCanal, s.membres)} des ${ent.format(s.membres)} membres.</li>
            <li>Aucune entreprise n'est nommée. Les résultats individuels ne sont communiqués qu'à l'entreprise concernée, sur demande.</li>
          </ol>
        </div>
        <aside class="notes" aria-label="Notes de l'article 5"></aside>
      </section>`;

// --- Annexe I : registre ---
const lignes = syntheses.map((x, i) => `
              <tr>
                <td data-label="N°">${numeros[i]}</td>
                <td data-label="Date"><time datetime="${dateIso(x.mesure_le)}">${dateCourte(x.mesure_le)}</time></td>
                <td data-label="Échantillon">${esc(x.echantillon.nom)}</td>
                <td data-label="Sites mesurés">${ent.format(x.mesurables)}</td>
                <td data-label="Sans security.txt">${pct(x.sans_canal.nombre, x.mesurables)}</td>
                <td data-label="Conformes RFC 9116">${pct(x.parmi_les_security_txt.conformes_rfc9116, x.mesurables)}</td>
                <td data-label="Politique">${pct(x.politique.nombre, x.mesurables)}</td>
                <td data-label="CSAF">${pct(x.csaf.nombre, x.mesurables)}</td>
              </tr>`).join('');
const a6 = `
      <section id="registre" class="article" aria-labelledby="t-registre">
        <div class="texte large">
          <h2 id="t-registre">Annexe I — Registre des mesures</h2>
          <p class="alinea">Chaque mesure reste au registre. Les mesures suivantes s'ajoutent à la suite, sans modifier les précédentes.</p>
          <div class="defile" tabindex="0" role="region" aria-label="Registre des mesures, défilable">
          <table class="tableau registre">
            <thead>
              <tr><th scope="col">N°</th><th scope="col">Date</th><th scope="col">Échantillon</th><th scope="col">Sites mesurés</th><th scope="col">Sans security.txt</th><th scope="col">Conformes RFC&nbsp;9116</th><th scope="col">Politique</th><th scope="col">CSAF</th></tr>
            </thead>
            <tbody>${lignes}
            </tbody>
          </table>
          </div>
        </div>
      </section>`;

// --- Annexe II : fiche ---
const a7 = `
      <section id="fiche" class="article" aria-labelledby="t-fiche">
        <div class="texte">
          <h2 id="t-fiche">Annexe II — Demander sa fiche</h2>
          <p class="alinea">Chaque entreprise mesurée peut recevoir gratuitement sa fiche&nbsp;: les trois signaux pour ses domaines, ce qui a été trouvé et à quelle adresse, un security.txt prêt à adapter, et les échéances du CRA qui la concernent.</p>
          <p class="alinea">La même adresse sert à signaler une erreur de classement&nbsp;: toute correction justifiée est appliquée à la mesure suivante et mentionnée au registre.</p>
          <p class="contact">${contact}</p>
        </div>
      </section>
      <p class="cloture">Fait le ${dateLongue(s.mesure_le)}, pour l'Observatoire CRA${AUTEUR ? `,<br><span class="signataire">${esc(AUTEUR)}</span>` : '.'}</p>`;

// Le rail marque l'article dont le titre a passé 40 % de la hauteur d'écran (le dernier en bas de page).
const script = `const liens=[...document.querySelectorAll('.rail a')];const sections=liens.map(a=>document.getElementById(a.hash.slice(1)));let attente=false;const maj=()=>{attente=false;const seuil=innerHeight*.4;let i=0;sections.forEach((s,k)=>{if(s.getBoundingClientRect().top<=seuil)i=k});if(innerHeight+scrollY>=document.documentElement.scrollHeight-2)i=sections.length-1;liens.forEach((a,k)=>k===i?a.setAttribute('aria-current','location'):a.removeAttribute('aria-current'))};addEventListener('scroll',()=>{if(!attente){attente=true;requestAnimationFrame(maj)}},{passive:true});addEventListener('resize',maj);maj();`;
const empreinte = createHash('sha256').update(script).digest('base64');

const css = await readFile('scripts/page.css', 'utf8');
const description = `${ent.format(sansCanal)} des ${ent.format(m)} sites de membres Hexatrust mesurés le ${dateLongue(s.mesure_le)} ne publient pas de security.txt. Mesure indépendante et reproductible de la préparation au Cyber Resilience Act.`;

// Typographie française. Dans Charter, l'espace insécable (U+00A0) est deux fois plus
// large qu'une espace : fine insécable (U+202F) devant la ponctuation haute, et groupes
// insécables à espace normale pour « RFC 9116 », « 24 heures », etc.
const typo = (h) => h
  .replace(/&nbsp;([;:!?%])/g, ' $1')
  .replace(/([\p{L}\p{N}]+)&nbsp;([\p{L}\p{N}]+)/gu, '<span class="nw">$1 $2</span>');

const html = typo(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-${empreinte}'; img-src 'self'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="light dark">
<title>Observatoire CRA — Mesure n° ${numero}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="Observatoire CRA — Mesure n° ${numero}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="article">
<link rel="icon" href="favicon.svg" type="image/svg+xml">${SITE ? `\n<link rel="canonical" href="${esc(SITE.replace(/\/$/, ''))}/">\n<meta property="og:url" content="${esc(SITE.replace(/\/$/, ''))}/">` : ''}
<style>
${css}
</style>
</head>
<body>
  <a class="evitement" href="#constat">Aller au constat</a>
  <header class="tete">
    <a class="marque" href="#haut"><b>Observatoire CRA</b> · indépendant</a>
    <span class="tete-num">Mesure n° ${numero}</span>
    <time datetime="${dateIso(s.mesure_le)}">${dateCourte(s.mesure_le)}</time>
  </header>
  <div class="cadre">
    <nav class="rail" aria-label="Articles de la mesure">
      <ol>
        ${sommaire()}
      </ol>
    </nav>
    <main id="haut">
      <div class="intitule">
        <h1><span class="acte">Mesure n° ${numero} de l'Observatoire CRA du ${dateLongue(s.mesure_le)}</span> relative à la publication, par les membres de l'annuaire Hexatrust, d'un canal de signalement des vulnérabilités au regard du règlement (UE) 2024/2847 (Cyber Resilience Act)</h1>
      </div>
      <details class="sommaire">
        <summary>Sommaire <span>· ${articles.length} parties</span></summary>
        <nav aria-label="Sommaire">
          <ol>
          ${sommaire()}
          </ol>
        </nav>
      </details>${a1}${a2}${a3}${a4}${a5}${a6}${a7}
    </main>
  </div>
  <footer class="pied">
    <p><b>Observatoire CRA</b> — projet indépendant, sans lien avec Hexatrust, l'ANSSI, l'ENISA ni les institutions de l'Union européenne.${AUTEUR ? ` Responsable&nbsp;: ${esc(AUTEUR)}.` : ''}</p>
    <p>Références&nbsp;: <a href="https://www.rfc-editor.org/rfc/rfc9116">RFC&nbsp;9116</a> · <a href="https://eur-lex.europa.eu/eli/reg/2024/2847/oj">Règlement (UE) 2024/2847</a> · <a href="https://docs.oasis-open.org/csaf/csaf/v2.0/csaf-v2.0.html">CSAF&nbsp;2.0</a> · <a href="${esc(s.echantillon.source)}">Annuaire Hexatrust</a></p>
  </footer>
  <script>${script}</script>
</body>
</html>
`);
if (html.includes('&nbsp;')) throw new Error('Espace insécable non traitée dans la page.');

await mkdir('site', { recursive: true });
await writeFile('site/index.html', html);
await writeFile('site/.nojekyll', ''); // GitHub Pages : servir le dossier .well-known
await writeFile('site/favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" fill="#5a2d82"/></svg>\n');
// RFC 9116 §3 : un security.txt n'est valable qu'à la racine du domaine. Sur un sous-chemin
// (GitHub Pages de projet), c'est le security.txt du domaine qui s'applique.
const racine = SITE && new URL(SITE).pathname.replace(/\/$/, '') === '';
if (CONTACT && racine) {
  const expire = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);
  await mkdir('site/.well-known', { recursive: true });
  await writeFile('site/.well-known/security.txt', [
    `Contact: ${CONTACT}`,
    `Expires: ${expire}T00:00:00Z`,
    'Preferred-Languages: fr, en',
    ...(SITE ? [`Canonical: ${SITE}/.well-known/security.txt`] : []),
    '',
  ].join('\n'));
}
console.log(`site/index.html écrit (mesure n° ${numero}, ${notes.length} notes)${!CONTACT ? ' — contact vide' : !racine ? ' — site hors racine : security.txt laissé au domaine' : ' — security.txt généré'}`);
