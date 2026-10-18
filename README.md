# Portfolio · Mike Allan Tagne Fotso

Site statique (HTML, CSS, JavaScript, sans framework ni dépendance) publié sur GitHub Pages :
**https://mike-tagne-3il.github.io/**

## Structure

```
index.html            Page unique : accueil, positionnement, projets, lab DevOps, expérience, contact
404.html              Page d'erreur
assets/css/styles.css Tokens de design + composants
assets/js/main.js     Moteur de ressorts, panneau projet, scrollspy, pipeline, copie de l'e-mail
assets/img/           Portrait (WebP + JPEG, 480 et 800 px), image de partage 1200×630, icônes
robots.txt, sitemap.xml, .nojekyll
```

Chaque projet a son propre lien : `#infrastructure`, `#supervision`, `#authforte`, `#homebox`.

## Direction artistique

- **Mood** : précis, calme, confiant.
- **Couleur** : la page suit le réglage clair/sombre du système. Le bleu est réservé à ce qui est cliquable, l'ambre à la gouvernance. Contrastes WCAG mesurés : texte courant 7,8:1 (clair) et 9,8:1 (sombre), niveau AAA.
- **Typographie** : police système (SF sur Apple, Segoe sur Windows), aucune police téléchargée. Échelle nommée : Display, Large Title, Title 1 à 3, Headline, Body 17/26, Subhead, Footnote, Caption. Monospace système pour les références (ISO, ATT&CK).
- **Espace** : grille de 8 pt (4 pour les ajustements). Rayons concentriques : carte 28, marge intérieure 12, élément intérieur 16.
- **Matériau** : le verre (flou + saturation) n'est utilisé que sur la barre de navigation et le bouton de fermeture.

## Tokens

Tous dans `:root` de `styles.css` : couleurs (`--bg`, `--surface`, `--label`, `--label-2`, `--accent`, `--gov`…), typographie (`--t-display` → `--t-caption`), espacements (`--s-1` → `--s-10`), rayons (`--r-card`, `--r-inner`, `--r-pill`), mouvement (`--ease`, `--d-micro`, `--d-ui`, `--d-section`).

## Décisions de motion

| Élément | Technique | Valeurs |
|---|---|---|
| Appui sur un bouton ou une carte | Retour visuel dès l'appui (`pointerdown`) | scale 0,97, 90–180 ms |
| Indicateur de navigation, sélecteur Technique/Gouvernance | Ressort | amortissement 1,0, réponse 0,35–0,4 s |
| Carte → panneau projet | Ressort piloté par une valeur p ∈ [0,1], `clip-path` depuis le rectangle de la carte | amortissement 1,0, réponse 0,5 s, interruptible dans les deux sens |
| Glisser pour fermer | Suivi 1:1, résistance vers le haut, projection de l'élan au lâcher | seuil 160 px projeté ; retour avec amortissement 0,8 |
| Entrée de l'accueil | Une fois, décalage de 60 ms | 560 ms, `cubic-bezier(0.32, 0.72, 0, 1)`. Le titre (LCP) bouge sans s'effacer. |
| Révélation des sections | Une fois par bloc, jamais rejouée | translateY 20 px + opacité, 500 ms |
| Pipeline DevOps | S'allume une fois, de gauche à droite (de haut en bas sur téléphone) | 1,3 s |

Mouvement réduit : fondus de 150 ms, pas de glissement, pas de rebond, flux des schémas figés.
Transparence réduite : barre opaque. Contraste élevé : séparateurs renforcés.

## Accessibilité

Navigation clavier complète, lien d'évitement, focus visible, panneau en `role="dialog"` avec focus piégé, fermeture par Échap et retour du focus sur la carte, reste de la page en `inert` pendant l'ouverture. Zones de clic d'au moins 44 px. Sans JavaScript, tout le contenu des projets reste lisible dans la page.

## Contrôle qualité (18 octobre 2026, en local)

Lighthouse mobile et ordinateur : Performance 100, Accessibilité 100, Bonnes pratiques 100, SEO 100. LCP 1,5 s (mobile simulé), CLS 0, TBT 0 ms.
Aucun débordement horizontal à 390, 820 et 1440 px, en clair comme en sombre.

## Dette technique

- Le `clip-path` animé du panneau provoque un repaint (sans recalcul de mise en page) à chaque image. C'est fluide sur un appareil récent, mais ce n'est pas une animation purement composée par le GPU.
- Les schémas sont en SVG dans le HTML. Pour en modifier un, il faut éditer les coordonnées à la main.
- Pas de captures réelles des projets : à ajouter dans les panneaux quand elles existent.

## Mettre à jour

Modifier les fichiers, puis `git add . && git commit -m "…" && git push`. GitHub Pages republie en une minute environ.
