# Observatoire CRA

Mesure publique, passive et reproductible de la préparation des entreprises françaises au **Cyber Resilience Act** (règlement (UE) 2024/2847). L'observatoire lit ce que les entreprises publient réellement, là où d'autres études publient ce que les entreprises déclarent.

**Résultats et méthode : https://pazificateur69.github.io/observatoire-cra/**

**Mesure n° 2026/1 du 26 octobre 2026, sur l'annuaire des membres Hexatrust :**
**116 des 139 sites mesurés (83,5 %) ne publient pas de `security.txt`**, le fichier standard (RFC 9116) qui indique où signaler une faille. 15 en publient un conforme, 11 renvoient vers une politique de divulgation, aucun ne publie d'avis CSAF. Si les 20 sites non mesurables en publiaient tous un, l'absence resterait de 73,0 % des 159 membres.

## Ce qui est mesuré

| Signal | Ce qu'on cherche | Lien avec le CRA |
|---|---|---|
| Canal de signalement | `security.txt` servi en https avec au moins un `Contact` | Point de contact pour les signalements (art. 13, applicable le 11/12/2027) ; porte d'entrée de la connaissance qui déclenche la déclaration sous 24 h (art. 14, en vigueur depuis le 11/09/2026) |
| Politique de divulgation | Champ `Policy` avec un lien https | Politique de divulgation coordonnée (annexe I, partie II, 11/12/2027) |
| Avis lisibles par machine | `provider-metadata.json` au format CSAF 2.0 | Partage d'informations sur les vulnérabilités corrigées |

Le règlement n'impose pas le format `security.txt` : c'est la manière standard et lisible par machine de publier le point de contact et la politique qu'il exige.

## Règles de la mesure

- **Uniquement des requêtes GET**, sous un identifiant de robot déclaré (`ObservatoireCRA/0.1`), vers des fichiers publiés pour être lus par des machines. Aucun test d'intrusion, aucun contournement de protection.
- **Présent** : fichier texte en https avec au moins un `Contact`. **Absent** : réponse claire qu'il n'y a rien (404, ou page du site à la place du fichier). **Indéterminé** : blocage, défi anti-robot, panne, délai dépassé après un second essai. Les indéterminés sont exclus du calcul : **le taux d'absence publié est un minimum.**
- **Conforme RFC 9116** : un seul `Expires` à date future, `text/plain`, https, `Contact` écrits comme des adresses (`mailto:`, `tel:`, `https://`), `Policy` écrits comme des liens.
- **Aucune entreprise n'est nommée publiquement.** Les résultats individuels ne sont pas publiés ; chaque entreprise peut demander les siens.

## Structure

```
scripts/
  collecte-hexatrust.mjs   collecte l'annuaire public des membres Hexatrust
  mesure.mjs               mesure les trois signaux ; --recalculer requalifie une mesure sans nouvelle requête
  page.mjs + page.css      génère la page publique site/index.html depuis les synthèses
  fiche.mjs                génère la fiche individuelle de chaque entreprise (non publiée)
data/
  hexatrust-membres.json   échantillon collecté
  synthese-AAAA-MM-JJ.json chiffres globaux de chaque mesure
site/                      page publiée sur GitHub Pages
.github/workflows/         remesure le 1er de chaque mois et republication
```

Aucune dépendance : Node 22 ou plus suffit.

## Refaire la mesure

```bash
node scripts/collecte-hexatrust.mjs > data/hexatrust-membres.json
node scripts/mesure.mjs data/hexatrust-membres.json
node scripts/page.mjs
```

Les résultats par entreprise sont écrits dans `data/prive/`, qui n'est jamais commis.

## Demander sa fiche, corriger une erreur

Écrire à **observatoire.cra@proton.me**. Chaque entreprise mesurée peut recevoir gratuitement sa fiche : ses trois signaux, ce qui a été lu et à quelle adresse, un `security.txt` prêt à adapter. Une correction justifiée est appliquée à la mesure suivante et mentionnée au registre ; une mesure publiée n'est jamais réécrite en silence.

Projet indépendant, sans lien avec Hexatrust, l'ANSSI, l'ENISA ni les institutions de l'Union européenne. Responsable : Alessandro Gagliardi.
