# SUNURECOLTE — Design frontend de référence

> Source de vérité du design de l'interface SunuRecolte.
> Toute nouvelle interface (page, composant, écran) doit respecter ce document.
> En cas de contradiction avec un autre document, la hiérarchie de `PROJECT_RULES.md` §9 s'applique
> (`PROJECT_RULES.md` > `CONTEXTE.md` > `ARCHITECTURE.md` > `REGLES_DEVELOPPEMENT.md` > `TASKS.md`).

## 1. Portée

Ce document décrit :

- l'identité visuelle (logo, favicon, palette, typographie, iconographie) ;
- les design tokens et leur implémentation SCSS ;
- les composants transverses et leurs états (idle, chargement, succès, vide, erreur, désactivé) ;
- les règles de responsive, d'accessibilité, d'animation et d'usage des images ;
- les interdictions visuelles ;
- les conventions Angular/SCSS ;
- la stratégie de stockage du jeton JWT côté frontend.

Il s'applique à `frontend/` (application Angular) et à toute évolution future de l'interface.

## 2. Identité du produit

- **Nom** : SunuRecolte (« sunu » = « notre » en wolof).
- **Objet** : mise en relation directe entre producteurs agricoles et acheteurs dans la région de Dakar.
- **Ton** : sobre, professionnel, factuel. On décrit ce que la plateforme fait réellement, sans
  marketing excessif, sans promesse non tenue.
- **Principes** : lisibilité avant décoration ; crédibilité agricole (vert profond, terre, neutres chauds) ;
  une seule action principale visible par écran ; aucune fioriture graphique.

## 3. Logo

- **Concept** : marque géométrique dessinée à la main en SVG — un carré aux coins arrondis vert profond
  contenant une feuille stylisée couleur crème, prolongée d'une tige. Géométrie simple (deux arcs
  symétriques), lisible dès 16 px, sans dégradé ni effet.
- **Fichier** : `frontend/public/logo-sunu-recolte.svg` (SVG, autoportant, fond inclus).
- **Wordmark** : le nom « SunuRecolte » est écrit en HTML à côté de la marque
  (`<img src="logo-sunu-recolte.svg">` + texte), jamais fondu dans l'image : il reste
  sélectionnable, traduisible et accessible.
- **Règles d'usage** :
  - hauteur d'affichage recommandée : 28 px (en-tête), 40 px (pages d'authentification) ;
  - ne pas déformer (proportions conservées), ne pas recolorer, ne pas ajouter d'ombre ni de rotation ;
  - zone de respiration minimale : la hauteur de la marque de chaque côté ;
  - la marque n'est jamais remplacée par un emoji ni par une icône de bibliothèque.
- **Attribut `alt`** : « SunuRecolte » lorsque la marque est le seul contenu du lien ;
  `alt=""` lorsqu'un texte « SunuRecolte » adjacent est déjà présent.

## 4. Favicon

- **Fichiers** :
  - `frontend/public/favicon.svg` (favicon vectoriel, marque seule) ;
  - `frontend/public/favicon.ico` (16/32/48 px, même marque, pour les navigateurs plus anciens).
- La favicon Angular par défaut est supprimée du projet : la favicon de l'onglet doit être
  celle de SunuRecolte, sans exception.
- Le fond vert plein garantit la visibilité de l'onglet en thème clair comme en thème sombre.

## 5. Palette

Palette agricole sobre : vert profond (végétal), ocre (terre), neutres chauds.

| Rôle | Token | Valeur | Usage |
|---|---|---|---|
| Primaire | `--couleur-primaire` | `#2F5D3A` | actions principales, liens actifs, en-tête |
| Primaire sombre | `--couleur-primaire-sombre` | `#24482D` | survol / actif des actions principales |
| Primaire clair | `--couleur-primaire-clair` | `#E8EFE8` | fonds légers, sélection, survol discret |
| Accent (terre) | `--couleur-accent` | `#A4652F` | usage rare : mise en avant ponctuelle, jamais pour une action destructive |
| Fond de page | `--couleur-fond` | `#F7F6F2` | arrière-plan général (blanc cassé chaud) |
| Surface | `--couleur-surface` | `#FFFFFF` | cartes, formulaires, en-tête |
| Texte principal | `--couleur-texte` | `#1E2420` | corps de texte, titres |
| Texte secondaire | `--couleur-texte-secondaire` | `#5A6159` | légendes, aides, métadonnées |
| Bordure | `--couleur-bordure` | `#DDD9D0` | séparateurs, contours de champs |
| Succès | `--couleur-succes` | `#1F7A46` | confirmations |
| Avertissement | `--couleur-avertissement` | `#8A6512` | avertissements |
| Erreur | `--couleur-erreur` | `#B3261E` | erreurs, actions destructives |
| Erreur sombre | `--couleur-erreur-sombre` | `#8F1E17` | survol / actif d'une action destructive |
| Info | `--couleur-info` | `#29527A` | informations neutres |
| Texte sur couleur pleine | `--couleur-texte-inverse` | `#FFFFFF` | texte des boutons pleins et badges foncés |
| Fond succès | `--couleur-succes-clair` | `#E7F2EA` | fond des messages et badges de succès |
| Fond avertissement | `--couleur-avertissement-clair` | `#F7F0E2` | fond des messages d'avertissement |
| Fond erreur | `--couleur-erreur-clair` | `#FBEAE9` | fond des messages et badges d'erreur |
| Fond info | `--couleur-info-clair` | `#E9EFF5` | fond des messages et badges d'information |

Les cinq dernières lignes sont des dérivés des couleurs de statut, utilisés uniquement comme fonds très
clairs (§10.3) ou comme couleur de survol (§10.1) ; aucune autre couleur n'est autorisée.

Règles :

- les couleurs de la palette sont les seules autorisées ; aucune couleur « au jugé » dans un composant ;
- le vert primaire ne porte jamais de texte sur fond vert clair sans vérification de contraste ;
- l'accent terre ne sert pas à signaler une action destructive (réservé à `--couleur-erreur`) ;
- les états de survol/focus modifient la couleur du token voisin, jamais une couleur inventée.

## 6. Typographie

- **Une seule famille de texte** : pile système sans-serif
  `"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`.
  Aucune police externe pour le texte : le rendu est immédiat et identique hors connexion.
- **Une seule famille d'icônes** : Material Symbols Outlined (auto-hébergée, voir §9).

| Token | Taille | Graisse | Usage |
|---|---|---|---|
| `--taille-xs` | 0.75 rem (12 px) | 400/600 | badges, mentions légales, aides |
| `--taille-sm` | 0.875 rem (14 px) | 400/600 | texte secondaire, libellés, tableaux |
| `--taille-md` | 1 rem (16 px) | 400/600 | corps de texte, champs, boutons |
| `--taille-lg` | 1.125 rem (18 px) | 600 | sous-titres, titres de carte |
| `--taille-xl` | 1.375 rem (22 px) | 600 | titre de page secondaire |
| `--taille-2xl` | 1.75 rem (28 px) | 600 | titre de page principale |
| `--taille-3xl` | 2.25 rem (36 px) | 600 | titre d'accueil (une seule occurrence par page) |

- Graisses utilisées : 400 (courant), 600 (titres, libellés d'action). Pas de 700+ ni de 300.
- Interlignes : 1.5 pour le corps, 1.25 pour les titres.
- Longueur de ligne de lecture : 60–75 caractères (largeur de colonne de texte plafonnée).
- Aucun texte en capitales intégral hormis les micro-libellés de tableau (12 px) et jamais sur plusieurs phrases.

## 7. Espacements, rayons, ombres, bordures

- **Espacements** (échelle de 4 px) : `--espace-1` 4 px, `--espace-2` 8 px, `--espace-3` 12 px,
  `--espace-4` 16 px, `--espace-5` 24 px, `--espace-6` 32 px, `--espace-7` 48 px, `--espace-8` 64 px.
- **Rayons** : `--rayon-sm` 4 px (badges, petits blocs), `--rayon-md` 6 px (boutons, champs),
  `--rayon-lg` 8 px (cartes). Aucun rayon « pilule » (≥ 999 px) pour les boutons ou les champs.
- **Ombres** : une seule ombre autorisée, très discrète, pour les surfaces superposées :
  `--ombre-surface: 0 1px 2px rgba(30, 36, 32, 0.08)`. Pas d'ombre au repos sur les cartes posées
  dans le flux (une bordure suffit).
- **Bordures** : `1px solid var(--couleur-bordure)` par défaut ; `2px` uniquement pour l'anneau de focus.

## 8. Design tokens

Implémentation : `frontend/src/styles/_tokens.scss` (custom properties CSS déclarées dans `:root`,
importées par `styles.scss`). Ce fichier est la source exacte des valeurs ; l'extrait ci-dessous en
donne la structure. Seuls les tokens définis là sont autorisés ; tout nouveau token doit d'abord être
ajouté ici avant usage.

```scss
:root {
  /* Couleurs */          /* --couleur-primaire #2f5d3a, --couleur-primaire-sombre #24482d,       */
                           /* --couleur-primaire-clair #e8efe8, --couleur-accent #a4652f,          */
                           /* --couleur-fond #f7f6f2, --couleur-surface #ffffff,                   */
                           /* --couleur-texte #1e2420, --couleur-texte-secondaire #5a6159,         */
                           /* --couleur-texte-inverse #ffffff, --couleur-bordure #ddd9d0,          */
                           /* --couleur-succes #1f7a46, --couleur-avertissement #8a6512,           */
                           /* --couleur-erreur #b3261e, --couleur-erreur-sombre #8f1e17,           */
                           /* --couleur-info #29527a, plus les quatre fonds clairs de statut.      */

  /* Typographie */
  --police-texte: "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  --taille-xs: 0.75rem;  --taille-sm: 0.875rem; --taille-md: 1rem;   --taille-lg: 1.125rem;
  --taille-xl: 1.375rem; --taille-2xl: 1.75rem; --taille-3xl: 2.25rem;

  /* Espacements, rayons, ombre */
  --espace-1: 4px; --espace-2: 8px; --espace-3: 12px; --espace-4: 16px;
  --espace-5: 24px; --espace-6: 32px; --espace-7: 48px; --espace-8: 64px;
  --rayon-sm: 4px; --rayon-md: 6px; --rayon-lg: 8px;
  --ombre-surface: 0 1px 2px rgba(30, 36, 32, 0.08);

  /* Mise en page */
  --largeur-contenu: 1140px;
  --duree-transition: 150ms;
}
```

- Les composants Angular consomment ces custom properties (`var(--couleur-primaire)`) ;
  ils ne redéfinissent jamais une couleur en dur.
- Les points de rupture SCSS (`_points-rupture.scss`) : `$point-mobile: 480px`, `$point-tablette: 768px`,
  `$point-desktop: 1100px`. Les media queries utilisent ces variables, jamais une valeur littérale.

## 9. Iconographie

- **Bibliothèque unique** : Material Symbols Outlined (police variable, auto-hébergée dans
  `frontend/public/fonts/material-symbols-subset.woff2`, aucune autre bibliothèque d'icônes
  n'est autorisée). `@font-face` déclaré dans `frontend/src/styles/_icones.scss`.
- **Sous-ensemble contrôlé** : la police complète pèse ~4 Mo ; seul un sous-ensemble de **35 icônes**
  réellement utilisées est embarqué (~30 Ko). Les ligatures ayant été retirées lors du sous-ensemble,
  **une icône est référencée par son point de code Unicode (zone à usage privé), jamais par son nom** :

  ```html
  <span class="materiel-icone" aria-hidden="true">&#xe5d2;</span>
  ```

- **Correspondance nom → point de code** (source : fichier officiel `codepoints` de Material Symbols) :

  | Nom officiel | Point de code | Nom officiel | Point de code |
  |---|---|---|---|
  | `account_circle` | `f20b` | `location_on` | `f1db` |
  | `add` | `e145` | `lock` | `e899` |
  | `admin_panel_settings` | `ef3d` | `logout` | `e9ba` |
  | `agriculture` | `ea79` | `menu` | `e5d2` |
  | `arrow_back` | `e5c4` | `notifications` | `e7f5` |
  | `arrow_forward` | `e5c8` | `payments` | `ef63` |
  | `check_circle` | `f0be` | `person` | `f0d3` |
  | `dashboard` | `e871` | `price_change` | `f04a` |
  | `delete` | `e92e` | `receipt_long` | `ef6e` |
  | `edit` | `f097` | `refresh` | `e5d5` |
  | `error` | `f8b6` | `schedule` | `efd6` |
  | `group` | `ea21` | `search` | `ef7a` |
  | `help` | `e8fd` | `shopping_cart` | `e8cc` |
  | `history` | `e8b3` | `storefront` | `ea12` |
  | `info` | `e88e` | `tune` | `e429` |
  | `inventory_2` | `e1a1` | `visibility` | `e8f4` |
  | `local_shipping` | `e558` | `visibility_off` | `e8f5` |
  | `warning` | `f083` | | |

- **Ajouter une icône** : l'ajouter au tableau ci-dessus puis régénérer le sous-ensemble depuis la
  police officielle (`material-symbols-outlined.woff2`, téléchargée depuis Google Fonts) :

  ```bash
  python -m fontTools.subset material-symbols-outlined.woff2 \
    --unicodes="U+E145,U+E1A1,U+E429,U+E558,U+E5C4,U+E5C8,U+E5D2,U+E5D5,U+E7F5,U+E871,U+E88E,U+E899,U+E8B3,U+E8CC,U+E8F4,U+E8F5,U+E8FD,U+E92E,U+E9BA,U+EA12,U+EA21,U+EA79,U+EF3D,U+EF63,U+EF6E,U+EF7A,U+EFD6,U+F04A,U+F083,U+F097,U+F0BE,U+F0D3,U+F1DB,U+F20B,U+F8B6" \
    --flavor=woff2 --layout-features='' \
    --output-file=material-symbols-subset.woff2
  ```

  (la liste `--unicodes` reprend exactement les points de code du tableau ci-dessus ; les axes
  variables `FILL`/`GRAD`/`opsz`/`wght` sont conservés.)
- Taille : 20 px dans les boutons, les champs et les messages, 24 px partout ailleurs
  (en-têtes, états d'interface, listes) ; la règle est appliquée par `_icones.scss`.
- **Toute icône seule (sans texte visible adjacent) porte un `aria-label` explicite** :

  ```html
  <button type="button" aria-label="Supprimer la récolte">
    <span class="materiel-icone" aria-hidden="true">&#xe92e;</span>
  </button>
  ```

- Une icône décorative (accompagnée d'un texte) porte `aria-hidden="true"` ; elle n'est jamais
  le seul support d'une information.
- **Aucun emoji n'est utilisé comme élément d'interface** : ni bouton, ni menu, ni icône, ni puce,
  ni décoration, ni contenu de notification. Les emojis sont également proscrits dans les libellés,
  les messages et les données d'exemple.

## 10. Composants transverses

Implémentation : classes globales dans `frontend/src/styles/` (base + composants) ; un composant
Angular ne redéfinit pas un bouton ou un champ, il réutilise ces classes.

### 10.1 Boutons (`.bouton`)

- Base : hauteur 40 px (36 px en variante compacte `.bouton--compact`), padding horizontal `--espace-4`,
  rayon `--rayon-md`, `font-size: --taille-md`, graisse 600, transition `--duree-transition`.
- Variantes : `.bouton--primaire` (fond vert, texte blanc), `.bouton--secondaire` (fond surface,
  bordure, texte primaire), `.bouton--discret` (sans fond ni bordure, texte primaire),
  `.bouton--danger` (fond erreur, texte blanc).
- États : survol (couleur sombre), `:focus-visible` (anneau 2 px `--couleur-primaire`, offset 2 px),
  `:disabled` (opacité 0.55, `cursor: not-allowed`, aucune transformation).
- Un bouton pleine largeur (`.bouton--large`) est réservé aux formulaires d'authentification.
- Le libellé décrit l'action (« Se connecter », « Créer mon compte ») ; jamais « Cliquez ici ».
- Un état de chargement remplace le libellé par « … » et désactive le bouton (`disabled` +
  `aria-busy="true"`), sans spinner décoratif.

### 10.2 Formulaires (`.champ`)

- Structure : `<label>` visible au-dessus du champ, champ, message d'erreur en dessous.
  Un champ n'a jamais un placeholder tenant lieu de libellé.
- Champ : hauteur 40 px, padding `--espace-3`, bordure 1 px, rayon `--rayon-md`, fond surface,
  `font-size: --taille-md`.
- Focus : bordure `--couleur-primaire` + anneau 2 px translucide ; jamais de suppression d'outline
  sans remplacement.
- Erreur : bordure `--couleur-erreur`, message en `--taille-sm` `--couleur-erreur`,
  champ marqué `aria-invalid="true"` et `aria-describedby` pointant vers le message.
- Aide (`.champ__aide`) en `--couleur-texte-secondaire`, jamais en rouge.
- Les champs obligatoires sont signalés par une mention explicite (« obligatoire »), pas par un
  astérisque seul.

### 10.3 Messages (`.message`)

- Bloc `role="status"` (succès, info) ou `role="alert"` (erreur), avec icône Material Symbols
  + texte.
- Variantes : `.message--succes`, `.message--erreur`, `.message--info`, `.message--avertissement` ;
  fond très clair de la couleur correspondante, bordure gauche 3 px, rayon `--rayon-md`.
- Les messages d'erreur affichés à l'utilisateur sont compréhensibles et en français :
  jamais de trace technique, de nom d'exception, de requête SQL, de jeton ni de détail Spring.

### 10.4 Cartes (`.carte`)

- Fond surface, bordure 1 px, rayon `--rayon-lg`, padding `--espace-5`.
- Pas d'ombre au repos ; l'ombre `--ombre-surface` est réservée aux surfaces réellement superposées.
- Une carte contient un titre (`--taille-lg`, 600) et un contenu ; elle n'est pas un simple
  conteneur décoratif.

### 10.5 Navigation

- **En-tête public** : marque + nom, zone de liens à droite (Accueil, Connexion, Inscription).
- **En-tête connecté** : marque + nom, lien vers l'espace du rôle, nom de l'utilisateur et rôle,
  bouton discret « Se déconnecter ».
- L'en-tête est identique sur toutes les pages (un seul composant), hauteur minimale 64 px, fond
  surface, bordure basse 1 px, contenu contraint à `--largeur-contenu`.
- La page active est signalée visuellement et par `aria-current="page"` (`ariaCurrentWhenActive`),
  jamais par une couleur criarde. Le lien « Accueil » utilise `routerLinkActiveOptions: { exact: true }`
  pour ne pas rester actif sur toutes les pages.
- Sur mobile (≤ 480 px), les liens **ne sont pas repliés** dans un menu : ils passent simplement à la
  ligne (`flex-wrap`), l'en-tête s'agrandissant en hauteur. Décision prise à l'implémentation : trois
  liens au plus coexistent, un menu replié (`<details>`) n'apportait rien et ajoutait un état à gérer,
  donc à tester.
- **Pied de page** : une seule ligne sobre (mention du projet, année, lien GitHub du dépôt),
  sans colonnes marketing.

### 10.6 Tableaux

- En-têtes en `--taille-xs`, 600, couleur secondaire, séparateur 1 px sous l'en-tête.
- Lignes séparées par un filet 1 px ; pas de zébrage.
- Nombres alignés à droite, textes à gauche ; sur mobile, un tableau peut devenir une liste
  de cartes-lignes si la largeur ne suffit pas (la transformation est documentée sur le composant).

### 10.7 Badges (`.badge`)

- Utilisés pour les statuts et les rôles : texte `--taille-xs`, 600, bordure 1 px, rayon `--rayon-sm`,
  fond très clair de la couleur du statut.
- Un badge n'est jamais cliquable et ne remplace pas un bouton.

## 11. États d'interface

Chaque écran qui charge ou affiche des données gère explicitement six états. Aucun écran ne reste
vide sans explication.

| État | Attendu |
|---|---|
| idle | état initial avant toute action : contenu statique ou invitation à agir |
| chargement | message texte « Chargement… » + `aria-busy="true"` ; squelette sobre autorisé pour les listes (jamais de spinner plein écran clignotant) |
| succès | message `.message--succes` avec `role="status"`, action suivante clairement proposée |
| vide | titre court + phrase expliquant pourquoi c'est vide + action utile (ex. « Aucune récolte publiée pour le moment. ») |
| erreur | message `.message--erreur` compréhensible, avec possibilité de réessayer quand c'est pertinent |
| désactivé | contrôle visible mais inactif (`disabled`), avec la raison accessible (`aria-describedby`) si elle n'est pas évidente |

## 12. Responsive

- Approche mobile-first ; trois largeurs de référence à vérifier avant toute livraison :
  **375 px** (mobile), **768 px** (tablette), **1366 px** et plus (desktop).
- Points de rupture : `$point-mobile: 480px`, `$point-tablette: 768px`, `$point-desktop: 1100px`.
- Grille : conteneur `--largeur-contenu` centré, gouttières `--espace-4` (mobile) /
  `--espace-4` (tablette) / `--espace-5` (desktop).
- Une colonne sur mobile, deux colonnes maximum sur tablette/desktop pour les formulaires et cartes.
- Zones tactiles ≥ 44 × 44 px sur mobile.
- Aucun défilement horizontal : les débordements sont traités (liste, tableau transformé, texte tronqué
  avec `title`).
- Le texte reste lisible sans zoom (jamais de `font-size` inférieur à 12 px).

## 13. Accessibilité

- Contraste texte/fond conforme WCAG AA (≥ 4.5:1 pour le texte courant).
- Navigation complète au clavier ; `:focus-visible` toujours visible (anneau 2 px).
- Un seul `<h1>` par page ; hiérarchie de titres continue.
- Formulaires : `<label>` associé, erreurs reliées par `aria-describedby`, messages en `role="alert"`.
- Icônes seules : `aria-label` explicite (§9).
- Langue du document : `lang="fr"` ; titres de document explicites
  (« SunuRecolte — Connexion », « SunuRecolte — Inscription », « SunuRecolte — Accueil »).
- Lien d'évitement (« Aller au contenu ») en première position de la page.

## 14. Animations

- Durée unique `--duree-transition: 150ms`, courbe `ease-out`.
- Seules les animations fonctionnelles sont autorisées : apparition d'un message, transition de focus,
  état de survol. Aucune animation décorative, aucun rebond, aucune parallaxe.
- `@media (prefers-reduced-motion: reduce)` désactive les transitions non essentielles.
- Aucune animation ne retarde l'accès à une information ou à une action.

## 15. Images

- Aucune image décorative générique ; une image est utilisée seulement si elle apporte une information
  (photo d'une récolte, par exemple).
- Les visuels de marque sont des SVG maîtrisés (logo, favicon) ; pas d'image générée par IA.
- `alt` pertinent pour les images informatives, `alt=""` pour les images purement décoratives.
- Les images ne remplacent jamais un intitulé de section ou un libellé d'action.

## 16. Contenu et rédaction

- Textes courts, factuels, en français ; pas de lorem ipsum, pas de faux témoignages,
  pas de fausses statistiques, pas de faux compteurs d'utilisateurs.
- Les chiffres affichés proviennent de l'API réelle ou de valeurs explicitement simulées et signalées
  comme telles.
- Les messages d'erreur sont actionnables (« Vérifiez votre adresse email. ») et ne divulguent aucun
  détail technique.

## 17. Interdictions visuelles

Sont interdits, sans exception :

- emojis comme élément d'interface (icône, bouton, menu, décoration, contenu) ;
- dégradés (violets, bleus ou autres) à but décoratif ;
- glassmorphism, effet de verre, transparences décoratives ;
- halos lumineux (glow), néons, effets « gaming » ;
- cartes utilisées partout, y compris pour du texte simple ;
- rayons de bordure excessifs (boutons/champs pilule, cartes très arrondies) ;
- ombres portées lourdes ou multiples ;
- boutons « pill » uniformes sur toute l'interface ;
- animations décoratives, mouvements permanents, carrousels automatiques ;
- faux graphiques, fausses statistiques, faux témoignages, faux logos de partenaires ;
- hero générique de type SaaS avec promesse creuse ;
- lorem ipsum ;
- plus d'une famille de texte et plus d'une bibliothèque d'icônes.

## 18. Conventions Angular et SCSS

- **Angular moderne** : composants *standalone* (pas de `NgModule`), `provideHttpClient`,
  `provideRouter`, *reactive forms*, *signals* pour l'état local et le service d'authentification.
- Noms de fichiers en kebab-case, sans suffixe de type pour les composants (convention du scaffold
  Angular 20+) : `connexion.ts`, `auth.service.ts`, `auth.guard.ts`.
- Structure :

  ```text
  frontend/src/app/
  ├── core/            # modèles, services, interception, guards, configuration (aucun visuel)
  ├── features/        # écrans par domaine (auth, producteur, acheteur, admin, accueil)
  ├── partage/         # composants visuels réutilisables (en-tête, pied de page…)
  ├── app.ts / app.html / app.scss
  ├── app.config.ts
  └── app.routes.ts
  ```

- **SCSS** :
  - `styles.scss` : base (reset raisonnable, typographie des titres, liens, focus global) ;
  - `styles/_tokens.scss`, `styles/_points-rupture.scss`, `styles/_composants.scss` ;
  - BEM allégé : `.bloc__element--variante` ; pas de sélecteurs d'éléments profonds ;
  - styles de composant encapsulés par défaut ; un style transverse va dans `styles/` ;
  - aucune couleur, taille d'espacement ou rayon écrit en dur dans un composant : uniquement des tokens.
- **Aucune bibliothèque UI externe** (pas de Tailwind, Bootstrap, Angular Material, PrimeNG…) et
  aucune bibliothèque d'icônes supplémentaire sans justification écrite dans ce document.

## 19. Sécurité frontend et stratégie JWT

- **Le frontend n'est jamais l'autorité de sécurité** : il améliore l'expérience (masquer ce qui est
  inaccessible, rediriger proprement), mais toutes les décisions réelles sont prises par le backend.
  Un utilisateur qui contourne les guards se heurte aux réponses `401`/`403` de l'API.
- **Stockage du jeton** : `localStorage`, clés préfixées `sunurecolte.` :
  - `sunurecolte.jeton` : le JWT renvoyé par `POST /api/auth/inscription` ou `/connexion` ;
  - `sunurecolte.utilisateur` : identité minimale renvoyée par l'API (id, nom, prénom, email, rôle),
    utilisée uniquement pour l'affichage ; le rôle réel est relu en base par le backend.
- **Récupération** : uniquement par `AuthService` (`inject(AuthService)`), jamais par lecture directe
  de `localStorage` dans un composant ; l'intercepteur lit le jeton via le service.
- **Suppression** : à la déconnexion, sur réponse `401` d'un appel API, et lorsqu'un jeton
  localement expiré est détecté avant navigation. Le refus `403` ne déclenche jamais de déconnexion.
- **Limite assumée** : `localStorage` est accessible au JavaScript de la page ; une faille XSS pourrait
  lire le jeton. Mesures : Angular échappe les valeurs par défaut, aucun `innerHTML` sur des données
  utilisateur, aucune bibliothèque tierce injectée, aucune donnée sensible en `localStorage` au-delà du
  jeton et de l'identité affichée. Une évolution vers un cookie `HttpOnly` supposerait un changement
  du contrat d'authentification du backend : hors périmètre du MVP, documenté ici comme limite.
- **Interdits absolus** : journaliser le jeton, l'afficher à l'écran, le committer, le placer dans une
  capture d'écran ou dans un fichier de test versionné ; les tests utilisent des jetons fabriqués
  (valeurs factices), jamais un jeton réel.
- **Gestion des refus** :
  - `401` : le jeton est invalide ou expiré → suppression de l'authentification locale puis redirection
    vers `/connexion` ;
  - `403` : l'utilisateur est authentifié mais n'a pas les droits → aucun déconnexion, affichage d'un
    message d'accès refusé ; un `403` n'est jamais transformé en `401`.

## 20. Discipline des conteneurs et mise en page globale (Phase 4.1)

- **`.contenu-principal`** (dans `app.scss`) est le conteneur racine du contenu routable.
  Il a un padding **horizontal** de `--espace-4` (mobile) / `--espace-5` (≥ 768 px), ce qui garantit
  qu'aucun contenu ne touche jamais les bords de l'écran.
- Les pages qui ont besoin d'un fond pleine largeur (hero, bandeaux) utilisent des **marges négatives**
  pour annuler ce padding : `margin-left: calc(-1 * var(--espace-4))` et le padding correspondant est
  rétabli dans la section.
- Le contenu interne de chaque section utilise `.conteneur` pour contraindre sa largeur à
  `--largeur-contenu` (1140 px) et centrer.
- **Pattern `.page-interieure`** : page avec un `<h1>` et un bloc `.etat` contenant un `.etat__icone`
  (icône Material Symbols à 40 px), un titre et une description. Largeur max 32 rem. Utilisé pour les
  pages coquilles (espace producteur, acheteur, admin) et les pages d'erreur (403, 404).

## 21. Section hero (Phase 4.1)

- La homepage comporte une section `.hero` avec le fond `--couleur-primaire` (vert profond) qui
  s'étend sur toute la largeur de la zone de contenu (full-bleed via marges négatives).
- Sur mobile (< 768 px) : mise en page monocolonne, texte uniquement.
- Sur tablette/desktop (≥ 768 px) : mise en page bicolonne — texte à gauche, illustration SVG
  agricole à droite (`hero__svg`, 320 × 213 px, `border-radius: --rayon-lg`).
- L'illustration est un SVG inline en couleurs de la palette (vert profond, vert végétal, accent
  terre), représentant un champ de récoltes stylisé. Elle est `aria-hidden="true"`.
- Les boutons du hero sont des variantes inversées (`hero__btn-primaire` = blanc sur vert,
  `hero__btn-secondaire` = transparent + bordure blanche) définies dans `accueil.scss` — ils ne
  modifient pas les classes `.bouton` globales.
- Le texte d'accroche (« Plateforme agricole · Région de Dakar ») est en `--taille-sm`, 600,
  majuscules, opacité 65%.
- Le titre hero utilise `--taille-2xl` (mobile) / `--taille-3xl` (≥ 768 px) pour maximiser la
  lisibilité selon l'espace disponible.

## 22. Navbar — état actif et identité utilisateur (Phase 4.1)

- **État actif** : le lien actif dans la navbar a une couleur `--couleur-primaire` et un trait
  horizontal de 2 px `border-radius: 1px` positionné 3 px sous le texte (pseudo-élément `::after`).
  C'est un traitement discret, sans gros badge ni fond coloré.
- **Identité connectée** : le bloc identité est un `flex-direction: column` avec le nom en
  `.entete__identite-nom` (font-weight: 600, couleur texte principale) et le badge de rôle en
  dessous. La hiérarchie visuelle est immédiate : nom > rôle.
- **Bouton de déconnexion** : porte l'icône `logout` (&#xe9ba;) pour accélérer la reconnaissance
  visuelle ; le texte « Se déconnecter » reste présent pour l'accessibilité.

## 23. Pages d'authentification — branding (Phase 4.1)

- Les pages `/connexion` et `/inscription` affichent un lien `.auth__marque` en tête de section,
  avec le logo SVG à 40 px et le wordmark « SunuRecolte » en `--taille-xl`, 600.
- Ce lien renvoie à l'accueil (`routerLink="/"`).
- Sur les pages d'authentification, la navbar globale reste présente, mais le logo répété dans le
  formulaire renforce le contexte de marque pour un utilisateur non connecté qui arrive directement
  sur ces pages.

## 24. Faire évoluer l'interface

Pour ajouter un écran :

1. vérifier que l'écran respecte ce document (identité, palette, typographie, composants, états) ;
2. réutiliser les classes de `styles/` avant de créer un style local ;
3. gérer les six états d'interface (§11) ;
4. vérifier mobile 375 px, tablette 768 px, desktop 1366 px ;
5. vérifier l'accessibilité (`aria-label`, focus, contrastes, titres) ;
6. vérifier qu'aucune interdiction du §17 n'est présente.

Toute nouvelle règle visuelle transverse doit d'abord être ajoutée à ce document, puis implémentée.
