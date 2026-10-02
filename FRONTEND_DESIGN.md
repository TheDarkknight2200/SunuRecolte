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
| Encre (action) | `--couleur-encre` | `#1E2420` | action principale et filet fort des trois écrans maîtres (§38) |
| Encre sombre | `--couleur-encre-sombre` | `#121610` | survol / actif d'une action encre |
| Filet neutre | `--couleur-filet` | `#E3E3E0` | séparateurs de lignes sur fond blanc (§38) |
| Voile | `--voile` | `rgba(30, 36, 32, 0.55)` | fond de la modale de confirmation (§31) |

Les quatre lignes de fonds très clairs (`-clair`) sont des dérivés des couleurs de statut, utilisés uniquement
comme fonds de message ou de badge (§10.3) ou comme couleur de survol (§10.1) ; aucune autre couleur n'est
autorisée.

**`--couleur-encre` n'est pas une teinte nouvelle** : c'est la valeur même de `--couleur-texte`, portée par un
rôle sémantique distinct pour que les écrans maîtres puissent rendre une action noire sans toucher à la couleur
du texte (§38). `--couleur-encre-sombre` en est la version assombrie d'environ un tiers, utilisée au survol et à
l'état actif, exactement comme `--couleur-primaire-sombre` l'est pour `--couleur-primaire`.

Règles :

- les couleurs de la palette sont les seules autorisées ; aucune couleur « au jugé » dans un composant ;
- les tokens ajoutés par la refonte (§39.1) complètent ce tableau : ce sont les seules autres couleurs autorisées ;
- le vert primaire ne porte jamais de texte sur fond vert clair sans vérification de contraste ;
- l'accent terre ne sert pas à signaler une action destructive (réservé à `--couleur-erreur`) ;
- les états de survol/focus modifient la couleur du token voisin, jamais une couleur inventée ;
- **le vert reste disponible** : couleur de marque (logo, liens, `badge--primaire`, état de succès) et couleur
  d'action de tous les écrans qui ne sont pas encore alignés sur les références visuelles. Il cesse d'être la
  couleur des actions principales sur les trois écrans maîtres, où l'encre la remplace (§38) ;
- de même, `--couleur-fond` (crème) reste le fond de l'application ; les seuls écrans maîtres rendent leur page
  sur `--couleur-surface` par le modificateur `.page--surface` (§10.4, règle d'arbitrage en §38.1).

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
- **Bordures** : `1px solid var(--couleur-bordure)` par défaut ; `2px` pour l'anneau de focus et pour le filet
  fort qui termine une ligne d'en-tête de tableau (§10.6), jamais pour autre chose.
- **Filets composites** : `--filet-fort: 2px solid var(--couleur-encre)` (sous l'en-tête d'un tableau dense,
  au-dessus d'un bloc de totaux) et `--filet-ligne: 1px solid var(--couleur-filet)` (entre deux lignes). Ces deux
  tokens portent à la fois l'épaisseur et la couleur pour qu'aucun écran n'ait à les recomposer.
- **Empilement** : `--z-voile: 20`, seule valeur d'élévation du projet, portée par le fond de modale (§31).
  Aucun autre `z-index` n'est autorisé dans un style de composant.

## 8. Design tokens

Implémentation : `frontend/src/styles/_tokens.scss` (custom properties CSS déclarées dans `:root`,
importées par `styles.scss`). Ce fichier est la source exacte des valeurs ; l'extrait ci-dessous en
donne la structure. Seuls les tokens définis là sont autorisés ; tout nouveau token doit d'abord être
ajouté ici avant usage. **L'extrait ci-dessous est structurel** : les valeurs de la palette et les tokens
ajoutés par la refonte sont en §5 et §39.1, qui font foi.

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

  /* Encre et filets des écrans maîtres (§5, §7, §38) */
  --couleur-encre: #1e2420;   --couleur-encre-sombre: #121610;   --couleur-filet: #e3e3e0;
  --filet-fort: 2px solid var(--couleur-encre);
  --filet-ligne: 1px solid var(--couleur-filet);
  --voile: rgba(30, 36, 32, 0.55);

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
  --z-voile: 20;
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
  `.bouton--danger` (fond erreur, texte blanc), `.bouton--encre` (fond `--couleur-encre`, texte blanc,
  survol `--couleur-encre-sombre`) — variante d'action principale des trois écrans maîtres (§38).
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

### 10.4 Cartes (`.carte`) et surface de page (`.page--surface`)

- Fond surface, bordure 1 px, rayon `--rayon-lg`, padding `--espace-5`.
- Pas d'ombre au repos ; l'ombre `--ombre-surface` est réservée aux surfaces réellement superposées.
- Une carte contient un titre (`--taille-lg`, 600) et un contenu ; elle n'est pas un simple
  conteneur décoratif.
- **`page--surface`** : modificateur posé sur la racine de page d'un écran maître (Catalogue, Détail
  commande, Administration) pour rendre **toute la page** sur `--couleur-surface` (blanc) là où la référence
  visuelle est monochrome. C'est un modificateur de page, pas une carte : aucun bordure, aucun rayon, aucune
  ombre, et **il ne remplace ni `--couleur-fond` ni le fond de `body`** (§5, §6) — les autres pages restent sur
  le fond crème. Mécanisme : une règle globale transforme la zone de contenu qui *contient* cette page
  (`main:has(.page--surface)`), ce qui évite de repeindre `body` pour trois écrans et évite surtout une surface
  blanche en carton découpée par les gouttières de la mise en page. Un navigateur sans `:has()` garde le fond
  crème : l'écart est de nuance, aucune information ne disparaît. Son seul effet recherché est de faire lire
  les filets `--filet-ligne` sur blanc (§10.6).

### 10.5 Navigation

- **En-tête public** : marque + nom, zone de liens à droite (Accueil, Connexion, Inscription).
- **En-tête connecté** : marque + nom, pile d'actions (cloche, sac, burger), liens d'espace à droite, nom de
  l'utilisateur et rôle, bouton discret « Se déconnecter ».
- L'en-tête est identique sur toutes les pages (un seul composant), hauteur minimale 64 px, fond
  surface, bordure basse 1 px, contenu contraint à `--largeur-contenu`.
- La page active est signalée visuellement et par `aria-current="page"` (`ariaCurrentWhenActive`),
  jamais par une couleur criarde. Le lien « Accueil » utilise `routerLinkActiveOptions: { exact: true }`
  pour ne pas rester actif sur toutes les pages.
- Le lien de l'espace d'un rôle est actif par **préfixe** : il reste marqué actif sur la liste et sur le
  détail de ses commandes. Comme l'espace acheteur pointe sur une page sœur (`/acheteur/commandes`) et non
  sur un parent, un seul lien porte `aria-current="page"` à la fois. Le sac n'est pas dans cette liste :
  c'est un bouton (§25), il ne porte donc ni `routerLink` ni `aria-current`.
- **Une seule ligne d'en-tête, à toutes les largeurs** : `.entete__contenu` est en `flex-wrap: nowrap`, la
  marque et la pile d'actions en `flex: none`. Aucun contenu visible de cette ligne ne passe à la ligne ni ne
  déborde à 375 px. Ce sont les **liens** qui cèdent la place, sous forme de panneau replié — la règle
  ancienne (« les liens passent à la ligne sous `--point-tablette`, seuil relevé de 480 px à 768 px après une
  QA réelle à ~510 px ») est **remplacée** par le burger ci-dessous.
- **Menu burger (`.entete__menu`)** : sous `--point-desktop` (1100 px), les liens sont repliés derrière un
  bouton rond de 44 × 44 px (§12), glyphe `menu`. Le motif est une **navigation disclosure, pas une modale** :
  `aria-expanded` sur le bouton, `aria-controls="navigation-principale"` pointant sur le `<nav>`, **aucun**
  `aria-modal`, **aucun** `aria-haspopup`, **aucun** piège de focus — les liens du panneau déplié restent dans
  l'ordre de tabulation naturel. Échap ferme le panneau **et rend le focus au bouton** ; un clic sur un lien du
  panneau ferme le panneau, la marque fait de même. À partir de 1100 px, les liens reprennent leur ligne à droite
  et le bouton disparaît (`display: none`) : il n'existe plus à ces largeurs.
- **Seuil choisi : `--point-desktop` (1100 px), non `--point-tablette` (768 px).** La pile cloche + sac + burger
  remplace le lien texte « Panier » ; entre 768 et 1100 px, trois liens, l'identité et « Se déconnecter » avec
  cette pile ne tiennent plus sur une ligne. Le panneau se déplie donc jusqu'à 1100 px. **Non vérifié en
  navigateur** : le rendu réel aux quatre largeurs de contrôle (375 / 768 / 1024 / 1366) reste à jouer.
- **Sac (`.entete__panier`)** : bouton rond, glyphe `shopping_cart`, rendu **seulement** à un acheteur ; il ouvre
  le panier latéral (§33) en appelant `TiroirPanierService.ouvrir()`, le mécanisme déjà en place. Son `aria-label`
  porte le compte — « Ouvrir le panier, 3 articles » — et son compteur est la pastille d'angle `.badge` (§25).
  Il n'a plus d'adresse : `/acheteur/panier` reste atteignable par le bouton « Voir le panier complet » du tiroir.
- **Cloche (`.entete__notifications`)** : lien vers `/notifications`, glyphe `notifications`, rendu pour **tout**
  rôle connecté — acheteur, producteur et administrateur (§29). Le compteur de non-lues est sa pastille d'angle,
  **absente à 0**, et son `aria-label` dit le compte — « Notifications, 3 non lues », « Notifications » quand il
  n'y en a aucune. Le conteneur garde `aria-live="polite"` : un changement de nombre est annoncé sans
  interrompre la navigation clavier.
- Le libellé du lien d'espace suit le rôle : « Mes récoltes » (producteur), « Mes commandes » (acheteur),
  « Administration » (`/admin`) pour un administrateur, qui ne voit alors que trois liens — Catalogue,
  Tableau de bord, Administration — le sac n'étant pas son domaine (§37). La cloche, elle, est rendue pour les
  trois rôles (§29).
- **Pied de page** : une seule ligne sobre (mention du projet, année, lien GitHub du dépôt),
  sans colonnes marketing.
- **Onglets d'espace (`.onglets`)** : bandeau de navigation **entre routes sœurs d'un même espace**, réservé à
  l'administration (§38.3). Un `<nav class="onglets" aria-label="Sections de l'administration">` contenant trois
  liens `.onglets__lien`, chacun en `routerLink`, `routerLinkActive="onglets__lien--actif"` **et**
  `ariaCurrentWhenActive="page"`. L'onglet actif se lit par un filet bas de 2 px en encre et un texte en encre ;
  l'onglet inactif reste en texte secondaire, sans fond ni boîte. Ce n'est pas un composant à état : aucune
  sélection locale, aucun contenu masqué, aucune route fusionnée — chaque onglet est un lien, et le bouton du
  navigateur reste le seul arbitre de la page affichée.
- **Action secondaire en lien (`.lien-action`)** : là où une action d'accompagnement n'a pas besoin d'être une
  surface cliquable pleine (voir la fiche, ouvrir un détail), elle est rendue par un lien souligné en encre,
  et non par un `.bouton--discret`. Le lien garde la hauteur tactile de 40 px (44 px sous 768 px, §12) pour
  rester atteignable au doigt.

### 10.6 Tableaux

- En-têtes en `--taille-xs`, 600, couleur secondaire, séparateur 1 px sous l'en-tête ; sur les écrans maîtres,
  le séparateur devient le filet fort `--filet-fort` (2 px encre, §7).
- Lignes séparées par un filet 1 px ; pas de zébrage. Sur les écrans maîtres, `--filet-ligne` (gris neutre).
- **`.tableau--maitre`** : modificateur qui porte ces deux filets d'écran maître (`--filet-fort` sous l'en-tête,
  `--filet-ligne` entre les lignes) sans toucher au `.tableau` générique, dont les écrans non alignés restent
  séparés par `--couleur-bordure`. Une classe explicite plutôt qu'un sélecteur hérité de `.page--surface` : la
  densité d'un tableau se décide ligne à ligne, pas en fonction du fond de la page.
- Nombres alignés à droite, textes à gauche ; sur mobile, un tableau peut devenir une liste
  de cartes-lignes si la largeur ne suffit pas (la transformation est documentée sur le composant).
- **Cellule double (`.cellule-double`)** : une ligne dense porte souvent un libellé fort et une micro-précision
  (produit + producteur/localité, nom + courriel). Structure : `.cellule-double` contenant
  `.cellule-double__titre` (`--taille-md`, 600, encre) et `.cellule-double__detail` (`--taille-sm`, secondaire).
  C'est le motif de cellule des trois écrans maîtres ; il remplace l'association titre de carte + paragraphe
  secondaire.
- **Pile d'actions (`.tableau__actions`)** : dernière colonne, liens `.lien-action` alignés à droite et
  séparés par un point médian rendu en `--couleur-texte-secondaire` ; jamais de bouton plein dans cette colonne,
  sauf l'action principale explicite d'une ligne (§38.3).
- `.tableau` est un style **global** : une conversion cartes → tableau déplace du CSS du fichier de composant
  vers `styles/_composants.scss`, donc hors du budget `anyComponentStyle` (§18).

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
- **Tableau dense sous `$point-tablette`** : une table de référence n'est jamais réduite à un défilement
  horizontal global. La variante `.tableau--empile` transforme chaque ligne en bloc : l'en-tête de colonne est
  masqué visuellement, chaque cellule reprend son libellé en micro-libellé au-dessus de sa valeur (libellé fourni
  par l'attribut `data-libelle` de la cellule, jamais par un contenu inventé en CSS), et la colonne d'actions
  passe en dernière position du bloc. Le tableau reste un `<table>` et garde sa sémantique de ligne.
- Une référence visuelle produite à 1440 px n'est pas une preuve pour 375 px : chaque écran converti en
  composition dense est revu aux quatre largeurs de référence (375, 768, 1024, 1366) avant d'être considéré
  comme aligné.

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
  - aucune couleur, taille d'espacement ou rayon écrit en dur dans un composant : uniquement des tokens ;
  - **budget de styles par composant** : `angular.json` borne `anyComponentStyle` à 4 ko en avertissement et
    8 ko en erreur, mesurés sur le CSS compilé et minifié d'un composant. Un dépassement se corrige en réduisant
    le CSS — règle sans effet (marge avalée par un `margin-bottom` déjà porté ailleurs), membres aux
    déclarations identiques fusionnés sous un seul sélecteur — et jamais en retouchant ces seuils : la
    configuration des budgets n'est pas modifiée par une phase d'implémentation.
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

## 25. Panier (Phase 5.5)

- Le panier est un état local du frontend (`localStorage`, clé préfixée `sunurecolte.`) : il n'existe
  ni entité, ni table, ni endpoint de panier. Il sert uniquement à composer une commande.
- **Compteur de lignes dans l'en-tête** : `.badge` compact (`--taille-xs`, 600) en pastille d'angle du **bouton
  sac** rond (§10.5) ; au-delà de 99, le compteur affiche `99+`. Le badge reste non cliquable (§10.7) : c'est le
  bouton qui l'est, et son `aria-label` reprend le même compte.
- **Ligne de panier** : même vocabulaire qu'une ligne du panier latéral (§39) — produit à gauche,
  montants et quantité groupés au centre, « Retirer » à droite, séparateur 1 px, pas de zébrage (§10.6).
  Sous `$point-tablette`, la ligne reprend la carte-ligne de §32 avec la classe globale `.carte`.
  Le nom de la récolte est porté par `.carte__titre` (classe globale) avec la typographie éditoriale
  d'une ligne du tiroir (`--police-titre`, `--taille-xl`) ; producteur, stock connu et aide de saisie
  sont en `--taille-xs`, couleur secondaire. « Retirer » est une `.lien-action`, pas un bouton secondaire.
- **Aucun visuel de récolte sur une ligne** : `LignePanier` est un snapshot local qui ne porte **pas**
  `imageUrl` (§25) — la page n'affiche donc ni photo ni emplacement réservé (§38.4, §15).
- **Mention d'une ligne** : le motif rendu par `motifLigne()` (récolte non disponible, ou totalité du
  stock connu déjà au panier) porte le traitement de la mention du tiroir — `--taille-xs`, couleur
  secondaire, `role="status"` — et jamais une couleur seule : le texte dit ce que l'acheteur peut faire.
- **Récapitulatif** : une `.carte` globale, total en chiffre dominant (`--police-titre`, `--taille-xl`)
  et action principale pleine largeur (`.bouton--large`). Il est **à droite** de la liste à partir de
  `$point-desktop` et **sous la liste** en dessous ; la page est plafonnée et centrée par `.conteneur` (§20).
- **Quantité** : champ numérique + deux boutons `.bouton--compact` portant chacun un `aria-label`
  explicite (« Augmenter la quantité de … », « Diminuer la quantité de … ») (§9). Le champ prend la
  pilule de §39.1, ses chiffres restent tabulaires ; un champ désactivé l'est par `disabled`, avec son
  aide « Récolte non disponible : quantité à laisser telle quelle. ».
- **Total** : toujours accompagné de la mention « total indicatif, confirmé au serveur » en `--taille-xs`,
  couleur secondaire. Le frontend n'est la source ni du prix, ni du stock, ni de la disponibilité.
- **Ligne indisponible** : une ligne épuisée, retirée du catalogue ou introuvable n'est **jamais**
  masquée silencieusement ; elle reste visible avec son état (§11) et l'action attendue (la retirer).

## 26. Tunnel de commande (Phase 5.5)

- Deux zones dans l'ordre : « Récapitulatif », puis « Réception », chacune avec un titre
  (`--taille-lg`, 600).
- **Mode de réception** (`RETRAIT` / `LIVRAISON`) : `fieldset` avec `legend` et radios ;
  zone tactile ≥ 44 × 44 px (§12).
- L'option retenue est identifiable **autrement que par la couleur** : bordure 2 px `--couleur-primaire`,
  fond `--couleur-primaire-clair` et état natif du radio.
- En `LIVRAISON`, adresse et téléphone sont obligatoires, avec la mention explicite « obligatoire »
  (§10.2) ; en `RETRAIT`, ces champs ne sont pas affichés.
- **Récapitulatif obligatoire avant toute soumission** : les lignes, quantités et montants relisibles
  précèdent le bouton principal (« Passer la commande »).
- **Trois temps, jamais moins** : saisie, puis révision, puis confirmation. Aucun `POST /api/commandes`
  n'est déclenché depuis l'écran de saisie ; la révision relit le mode et, en livraison, l'adresse,
  le téléphone et les instructions avant le bouton d'envoi.
- **Vocabulaire des boutons** : « Vérifier la commande » (saisie → révision), « Passer la commande »
  (révision → envoi), « Modifier les informations » (révision → saisie). « Confirmer » qualifie le
  changement de statut rendu par l'API (§28) et n'est jamais un libellé de ce tunnel.
- **Pas de modale de confirmation** : la révision en page remplit ce rôle (§31 reste réservé aux
  actions destructives).
- Après un envoi refusé, la page garde la révision, le message du serveur et un bouton
  « Réessayer l'envoi » ; panier et saisies ne sont jamais effacés, et le panier n'est vidé qu'après
  une création réellement confirmée par la réponse du serveur.
- **Focus** : le titre `Réception` (révision) ou `Commande enregistrée.` (succès) reçoit le focus
  (`tabindex="-1"`) ; après un refus, le bloc `role="alert"` le reçoit.

## 27. Badges de statut de commande (Phase 5.5)

Mapping statut → couleurs (§5 ; §10.7 applique la couleur au texte et son fond très clair au badge) :

| Statut | Couleur | Fond |
|---|---|---|
| `EN_ATTENTE` | `--couleur-avertissement` | `--couleur-avertissement-clair` |
| `CONFIRMEE` | `--couleur-info` | `--couleur-info-clair` |
| `PRETE` | `--couleur-primaire` | `--couleur-primaire-clair` |
| `LIVREE` | `--couleur-succes` | `--couleur-succes-clair` |
| `ANNULEE` | `--couleur-erreur` | `--couleur-erreur-clair` |

- Le **texte** du statut accompagne toujours sa couleur : la couleur ne porte jamais seule l'information.
- Ces couleurs sont rendues par des variantes globales de `.badge` (`src/styles/_composants.scss`) :
  `badge--avertissement` pour `EN_ATTENTE`, `badge--info` pour `CONFIRMEE`, `badge--primaire` pour `PRETE`,
  `badge--succes` pour `LIVREE`, `badge--erreur` pour `ANNULEE`.
- La table de correspondance est un constant unique, `VARIANTES_BADGE_COMMANDE`
  (`src/app/core/modeles/referentiels.ts`), à utiliser par tout écran qui affiche un statut de commande :
  une page ne choisit pas sa variante.
- `EN_ATTENTE` est le seul statut qu'un acheteur peut voir à la création d'une commande : le backend force
  cette valeur (`POST /api/commandes`). Le tunnel de commande (§26) affiche donc `badge--avertissement`.
- `PRETE` est habillé par `badge--primaire` (`--couleur-primaire` sur `--couleur-primaire-clair`) depuis la
  consultation des commandes (§33), qui affiche les statuts intermédiaires.

## 28. Paiement simulé (Phase 5.5)

- Tout écran ou bloc relatif à un paiement porte le texte :
  « Paiement simulé — aucune transaction réelle n'est effectuée. » (§16 : une valeur simulée est signalée).
- Un paiement `EN_ATTENTE` s'affiche « En attente ».
- Les libellés « payé », « réussi » et « confirmé » sont **interdits** dans le flux de la Phase 5.5 :
  le backend ne produit pas encore ces états (§17).
- L'écran qui présente ce flux (`/acheteur/paiement/:id`) est documenté en §34.

## 29. Notifications (Phase 5.5)

**Écran transversal.** `/notifications` est une page de `features/notifications`, **hors** de
`features/acheteur` : le backend envoie des notifications aux deux rôles métier (un producteur est notifié
à chaque commande reçue, un acheteur à chaque changement de statut). Elle est protégée par `authGuard`
**seul**, sans `roleGuard` — ACHETEUR, PRODUCTEUR et ADMIN y accèdent, conformément à `SecurityConfig`
(aucune règle d'autorisation ne concerne `/api/notifications`, la route tombe sous
`.anyRequest().authenticated()`).

- **Compteur de non-lues calculé côté frontend** à partir de `GET /api/notifications`
  (`notifications.filter(n => !n.lu).length`) : **aucun endpoint de comptage n'existe** dans l'API, et il ne
  faut pas en inventer. Le frontend n'envoie **jamais** `utilisateurId` — ni en paramètre, ni en corps, ni
  depuis `localStorage` ou la route : l'identité du destinataire vient du jeton (§19).
- **Compteur de non-lues dans l'en-tête**, pastille d'angle de la **cloche** — le lien `.entete__notifications`
  vers `/notifications` (§10.5) — dans un conteneur `aria-live="polite"` ; il se met à jour à la
  navigation, après un marquage lu et par le bouton « Actualiser » de la page. **Aucun `setInterval`,
  aucun polling** : le MVP n'a pas de temps réel. Son `aria-label` dit le compte (« Notifications, 3 non lues »),
  ou simplement « Notifications » quand il n'y a rien à lire.
- Le compteur est plafonné à **`99+`** au-delà de 99 lignes non lues et disparaît à 0. Le compteur lui-même reste
  un **`.badge`** (§10.7) : il n'est pas un lien et ne devient pas un bouton — c'est la cloche qui le porte qui
  est le lien. Il n'est jamais affiché à un
  visiteur anonyme, et `GET /api/notifications` n'est **jamais** appelé sans session validée — un appel
  anonyme renverrait `401` et déclencherait la purge de la session (§19).
- **Aucune actualisation automatique.** Les trois seules causes d'un `GET /api/notifications` sont :
  l'ouverture ou la navigation vers `/notifications`, le bouton « Actualiser » de cette page, et le
  rafraîchissement local après un marquage comme lue réussi. Pas de WebSocket, pas d'`EventSource`, pas de
  notification push, pas d'e-mail ni de SMS.
- **Une lecture en vol est partagée, jamais mise en cache.** Au rechargement du navigateur, l'en-tête et la page
  `/notifications` se montent l'un et l'autre et demandent la liste à la même milliseconde : `mesNotifications()`
  renvoie l'`Observable` déjà parti (`shareReplay` + `refCount`, avec remise à zéro en `finalize` si c'est bien
  lui qui se termine) au lieu d'émettre un second `GET` identique. Dès que la réponse est reçue ou perdue, la
  lecture suivante repart au serveur : « Actualiser » et « Réessayer » restent des requêtes réelles (§11).
- **Accès à la liste : la cloche de l'en-tête, le Tableau de bord et les espaces principaux** (lien
  « Notifications »). La cloche est l'entrée courte (§10.5) ; le point d'entrée est aussi proposé sur
  `/tableau-de-bord`, sur les pages d'atterrissage d'espace — `/producteur/recoltes` (`#lien-notifications-producteur`)
  et `/acheteur/commandes` (`#lien-notifications-acheteur`) — et sur les écrans de l'ADMIN (`/admin`,
  `/admin/utilisateurs`, `/admin/recoltes`, `/admin/prix-marche`). La cloche est une **action d'en-tête**, pas
  une entrée de la navigation : le `<nav>` garde ses trois liens d'espace au plus (§10.5) et n'en reçoit pas un
  quatrième ; ces entrées d'écran restent des liens d'espace, elles ne remplacent pas la cloche.
- Une notification non lue est signalée par un **texte** (« Non lue ») en plus de tout traitement visuel ;
  l'état lu ne repose pas sur la seule absence de couleur.
- Le passage à l'état lu passe par un **bouton explicite** « Marquer comme lue », jamais par un simple
  clic sur la ligne. Le clic envoie **une** requête `PUT /api/notifications/{id}/lue` et l'état affiché est
  ensuite **celui de la réponse du serveur** : le frontend ne pose jamais `lu = true` avant elle (§19,
  le frontend n'est pas l'autorité). Si le `PUT` échoue, l'état précédent et le compteur sont conservés.
- Liste sobre : titre, message, date (§30), état.
- Les six états de §11 s'appliquent à la page : un chargement ne rend jamais un faux état vide, et l'erreur
  propose « Réessayer ».

## 30. Montants, quantités et dates (Phase 5.5)

- **Montants** : `formaterMontant` uniquement (séparateur de milliers français, `FCFA` accolé) ;
  aucune mise en forme locale (`toFixed`, symbole `€` ou `$`).
- **Quantités** : `formaterQuantite`, avec l'unité renvoyée par le serveur.
- **Dates simples** `AAAA-MM-JJ` (ex. date de disponibilité) : `formaterDate` → `JJ/MM/AAAA`.
- **Horodatages** `AAAA-MM-JJTHH:MM` (ex. date de création d'une commande ou d'une notification) :
  `formaterDateHeure` → `JJ/MM/AAAA à HH:MM`.
- Ces fonctions recomposent la chaîne renvoyée par le backend **sans instancier `Date`** : le frontend
  n'introduit aucun décalage de fuseau.
- **Valeur absente** : `—` ; jamais `null`, `undefined` ou une case vide.
- **Format assumé contre la maquette** : les références visuelles (§38) écrivent les dates sur un mode
  éditorial (« 14 septembre 2024 », « 03 jan. 2024 »). `formaterDate` et `formaterDateHeure` **ne changent pas** :
  le projet conserve `JJ/MM/AAAA` et `JJ/MM/AAAA à HH:MM` partout, y compris sur les trois écrans maîtres. La
  différence est un écart visuel voulu, documenté ici, et non une correction à faire.

## 31. Modales de confirmation (Phase 5.5)

Patron validé en Phase 5.4, à réutiliser tel quel :

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointant sur le titre de la modale ;
- `Escape` écouté sur le `document` : la modale se ferme quel que soit l'élément focusé ;
- piège de focus sur `Tab` **et** `Shift+Tab` (les deux sont à intercepter : `keydown.tab` ne couvre pas
  `Shift+Tab`) ;
- focus initial sur le bouton qui **referme sans effet** — « Annuler » pour une suppression (Phase 5.4),
  « Garder la commande » pour une annulation (§33) —, jamais sur le bouton destructif ;
- retour du focus au déclencheur à la fermeture ; si le déclencheur n'existe plus (élément supprimé),
  le focus est posé sur un élément explicitement désigné et encore présent ;
- bouton destructif en `.bouton--danger`, avec un libellé qui nomme l'effet réel
  (« Annuler la commande », pas « OK »).

**Motif visuel globalisé (Phase 5.10).** La voile et la boîte de la modale ne sont plus redessinées par chaque
page : `frontend/src/styles/_composants.scss` fournit `.voile` (fond `--voile`, `z-index: var(--z-voile)`,
couvrant tout l'écran, centrage de la boîte), `.modale` (fond surface, bordure 1 px, rayon `--rayon-lg`,
padding `--espace-5`, largeur bornée à 26 rem, ombre `--ombre-surface` parce que la boîte est réellement
superposée — seul cas autorisé par §7) et `.modale__actions` (boutons groupés à droite, `flex-wrap`,
`gap: --espace-3`). Les règles ci-dessus — rôle, `aria-modal`, Escape global, piège de focus dans les
deux sens, focus initial non destructif, retour du focus — sont **comportementales** et restent portées par chaque
composant : aucune de ces pages n'est refactorée pour le seul plaisir de centraliser, et une modale dont le
comportement a été validé en QA ne change pas de logique d'un coup. Le branchement des cinq modales existantes
sur `.voile` / `.modale` se fait écran par écran, aux étapes 2 à 4, et chaque branchement est une raison de
revérifier le focus (§31) plutôt qu'une simple suppression de CSS local.

## 32. Listes de lignes (Phase 5.5)

- Une ligne (panier, récapitulatif, détail de commande) porte : produit, unité et quantité,
  prix unitaire, sous-total.
- Textes à gauche, chiffres à droite (§10.6).
- Sur mobile, les lignes deviennent des cartes-lignes (§10.6).
- Aucun tableau de totaux ni bloc statistique superflu : seules les valeurs renvoyées par le serveur
  sont affichées.

## 33. Consultation et annulation des commandes (Phase 5.5)

Écrans « Mes commandes » (`/acheteur/commandes`) et « Détail de la commande »
(`/acheteur/commandes/:id`), protégés par `authGuard` puis `roleGuard` avec `data.roles: ['ACHETEUR']`,
chargés paresseusement. `/acheteur` n'est plus une page d'attente : c'est une redirection vers la liste,
et le lien d'en-tête « Mes commandes » — réservé à un acheteur — pointe dessus.

**Ce qui est affiché vient du serveur, jamais du client.**

- La liste est `GET /api/commandes` : l'identité de l'acheteur est portée par le jeton, relue en base, et
  **aucun `acheteurId` n'est envoyé** en paramètre ni en corps.
- Une ligne de liste : identifiant de commande, date et heure (§30), statut (§27), mode de réception,
  nombre de lignes, **total calculé par le serveur**, et un lien « Voir le détail ».
- Les lignes du détail reprennent les valeurs de `CommandeResponse`. Les instantanés du panier ne sont
  **jamais** substitués aux montants d'une commande enregistrée.
- Le total d'une commande créée est un montant définitif : il s'écrit « Total ». La mention
  « Total indicatif » reste propre au tunnel de commande (§26), avant l'enregistrement.
- Aucun filtre, aucun tri, aucune pagination : la seule règle d'affichage est celle que l'API fournit.

**Réception.** En `LIVRAISON`, l'adresse, le téléphone et les instructions sont affichés, une valeur
absente rendue par `—` (§30). En `RETRAIT`, aucune adresse n'est inventée : une notice explique que la
commande se récupère auprès du producteur.

**Annulation.** Elle est pilotée par les transitions que le backend admet
(`CommandeService.TRANSITIONS_AUTORISEES` : `EN_ATTENTE → ANNULEE`, `CONFIRMEE → ANNULEE`) ; `PRETE`,
`LIVREE` et `ANNULEE` n'offrent aucun bouton. La constante `STATUTS_ANNULABLES` du composant est un reflet
de cette table, pas une règle concurrente : le frontend n'est jamais l'autorité (§19). Si le statut a changé
entre le chargement de la page et le clic, le serveur refuse la transition (400) et son message est affiché
tel quel.

- Aucun appel avant la confirmation de la modale (§31).
- `PATCH /api/commandes/{id}/statut` avec pour seul corps `{ "statut": "ANNULEE" }` : l'identifiant vient
  de la route, aucun autre champ n'est envoyé par le client.
- Deux clics ne produisent **qu'une** requête : le bouton est désactivé et marqué `aria-busy` pendant
  l'appel, et le composant garde sa propre garde d'exécution.
- Après succès, le statut affiché est **celui de la réponse du serveur** ; il n'est jamais réécrit
  localement en `ANNULEE`.
- Le frontend n'appelle aucune route de récolte pour « rendre » du stock : la restauration est côté
  service, et rien ici ne doit laisser croire qu'elle est déclenchée par la page.

**États.** Chargement (`aria-busy`), erreur avec « Réessayer », liste vide (« Vous n'avez pas encore de
commande. » et un lien « Parcourir le catalogue » vers `/recoltes`), liste. Sur une fiche : introuvable
(404) distinct d'une erreur de chargement ; un 403 reste un accès refusé, sans déconnexion ni purge
(§19). Aucun écran de paiement, aucun vocabulaire de paiement payé/réussi (§28).

**Zone tactile.** Les actions de ces deux pages — « Voir le détail », « Retour à mes commandes »,
« Annuler la commande » et les boutons de la modale — sont en `.bouton--compact` (36 px, §10.1) rehaussée à
`min-height: 44 px` (§12) dans leur zone d'actions.

## 34. Écran de paiement simulé (Phase 5.5)

Écran « Paiement simulé » (`/acheteur/paiement/:id`), protégé par `authGuard` puis `roleGuard` avec
`data.roles: ['ACHETEUR']`, chargé paresseusement, atteint par le lien « Payer la commande » de la fiche
de commande (§33). Titre de page : « SunuRecolte — Paiement simulé ».

**Ce que le backend admet réellement, et rien de plus.** `PaiementService.creer` refuse `ANNULEE` et
`LIVREE` par un 400, accepte `EN_ATTENTE`, `CONFIRMEE` et `PRETE`, écrit **toujours** un paiement
`EN_ATTENTE` portant une référence `SIMU-…`, et reprend le montant à `commande.getTotal()`. Dans l'API
actuelle, **aucun chemin ne produit `REUSSI` ni `ECHOUE`** : l'écran n'écrit donc jamais l'un de ces
statuts, ne le suggère jamais dans un libellé, et ne propose aucune action qui le ferait croire (§28).
`STATUTS_PAYABLES` du composant est le reflet de cette table de service, pas une règle concurrente ; la
seule autorité reste le serveur (403 si la commande n'est pas au titulaire du jeton, 400 si un paiement
existe déjà).

**Deux lectures à l'ouverture, dans cet ordre** : `GET /api/commandes/{id}`, puis
`GET /api/paiements/commande/{id}` pour savoir si une intention a déjà été enregistrée.

- 404 sur la seconde lecture = aucun paiement encore : c'est la réponse normale du backend, le formulaire
  est proposé.
- 200 = la fiche du paiement enregistré est affichée, **sans formulaire** : un seul paiement par commande.
- Si le statut de la commande rend le paiement impossible (`ANNULEE`, `LIVREE`), aucun formulaire ni lien
  n'est affiché : la phrase reprend le motif posé par le backend. Le CTA de la fiche de commande est
  construit sur les trois mêmes statuts, donc un `LIVREE`/`ANNULEE` n'offre de toute façon aucune entrée.
- Une erreur sur la seconde lecture (500, panne) bloque la soumission et s'affiche avec « Réessayer » :
  on n'envoie pas un POST dont on ignore s'il créerait un doublon.

**Montant.** Il vient de `CommandeResponse.total`, formaté par `formaterMontant` (§30). Le panier local
(`PanierService.totalIndicatif()`) n'est **jamais** relu ici : une commande enregistrée a un montant
définitif, calculé par le serveur. Le `commandeId` envoyé est celui renvoyé par le serveur, pas celui lu
dans l'URL ; aucun `acheteurId`, aucun montant, aucun champ de carte n'est transmis.

**Formulaire.** Un `fieldset` + `legend`, deux radios d'un même groupe (`WAVE`, `ORANGE_MONEY`), choisis
au clavier, l'état retenu rendu par autre chose que la seule couleur (§12, §13). Aucun champ numéro de
carte, CVV, IBAN, compte, mot de passe, OTP ou code secret — cet écran ne collecte aucun identifiant
financier (§17). `POST /api/paiements` avec pour seul corps `{ "commandeId": …, "moyenPaiement": … }` ;
le bouton est désactivé et marqué `aria-busy` pendant l'appel (« Enregistrement… »), deux clics ne
produisent **qu'une** requête, et aucun POST part sans moyen de paiement choisi.

**Résultat.** Il est lu dans `PaiementResponse` et nulle part ailleurs. Le titre rendu après une
simulation est « Simulation enregistrée — paiement en attente. », le statut est affiché avec son libellé
du référentiel (§27), `dateConfirmation` absente rend `—` (§30), et la référence `SIMU-…` est présentée
comme une référence de simulation, jamais comme une référence bancaire ou de transaction mobile. La
mention « Paiement simulé — aucune transaction réelle n'est effectuée. » est rendue **hors** des branches
d'état : elle est visible à chaque instant, en chargement comme en résultat (§28). La zone de résultat
porte `role="status"` et le focus y est posé (`tabindex="-1"` sur son titre).

**Erreurs.** 400 : le message du serveur, mot pour mot (paiement déjà enregistré, commande annulée ou
livrée). 403 : accès refusé, sans déconnexion ni purge (§19). 404 sur la commande : écran « introuvable »,
sans seconde lecture. 401 : laissé à `authInterceptor` (purge et redirection). Panne réseau : texte
générique via `messageErreurApi`. Jamais de trace technique, de détail Spring ni de jeton dans l'interface.

**Ce que cet écran ne fait pas.** Aucune notification, aucun WebSocket, aucun polling, aucun rechargement
automatique après la simulation : la réponse du serveur suffit. Pas de récapitulatif des lignes de la
commande, déjà rendu sur la fiche (§33). Aucun accès à une API Wave ou Orange Money réelle.

**Zone tactile.** Options de paiement à `min-height: 44 px` sur mobile (§12), ramenées à 36 px dès la
tablette avec les boutons d'actions, en deux colonnes.

## 35. Statuts de commande côté producteur (Phase 5.6)

Écran « Commandes reçues » (`/producteur/commandes`), `features/producteur/commandes-recues/`, protégé par
`authGuard` puis `roleGuard` avec `data.roles: ['PRODUCTEUR']`, chargé paresseusement. Titre de page :
« SunuRecolte — Commandes reçues ».

**Pourquoi un écran distinct et non une extension des écrans acheteur.** `CommandeService` n'admet
`CONFIRMEE`, `PRETE` et `LIVREE` que de la part d'un producteur concerné ou de l'ADMIN
(`verifierDroitDeChangerStatut`) : un acheteur qui tenterait ces transitions reçoit un 403. Les écrans de
§33 restent donc **inchangés** — l'acheteur n'y voit que consultation et annulation — et aucune règle de
§33 n'est déplacée ici.

**Données.** `GET /api/commandes` sans aucun paramètre : pour un producteur, le serveur filtre sur le jeton
et renvoie toute commande comportant au moins une de ses lignes, triée par `dateCreation` décroissante.
Aucun `producteurId` n'est envoyé, aucun filtre, tri ni pagination inventés (§33). Les montants, quantités,
statuts et lignes affichés sont **ceux de la réponse du serveur**.

**Une seule action par commande, jamais une action impossible.** La table `TRANSITIONS_AUTORISEES` de
`CommandeService` borne le cycle : `EN_ATTENTE → CONFIRMEE`, `CONFIRMEE → PRETE`, `PRETE → LIVREE`.
`LIVREE` et `ANNULEE` sont terminaux : aucune action n'y est proposée. Libellés (voix active, l'effet réel
est nommé — §16) :

| Statut affiché | Action | Transition demandée |
|---|---|---|
| `EN_ATTENTE` | « Confirmer la commande » | `CONFIRMEE` |
| `CONFIRMEE` | « Marquer comme prête » | `PRETE` |
| `PRETE` | « Marquer comme livrée » | `LIVREE` |
| `LIVREE`, `ANNULEE` | aucune | — |

La table du composant (`ETAPES_SUIVANTES`) est un **reflet** de celle du service, pas une règle concurrente :
le frontend n'est jamais l'autorité (§19), et un statut changé entre-temps se refuse par 400 avec le message
du serveur affiché tel quel.

**Ce que l'API autorise mais que l'écran ne propose pas.** `EN_ATTENTE → ANNULEE` et `CONFIRMEE → ANNULEE`
sont aussi ouverts à un producteur concerné. L'annulation reste pilotée par l'acheteur (§33) : la proposer
ici serait un second point d'annulation, avec sa modale (§31) et son état de plus, hors du cycle demandé.
Rien dans l'interface ne laisse donc croire que le producteur peut annuler.

**Action.** `PATCH /api/commandes/{id}/statut`, corps `{ "statut": … }` uniquement ; l'identifiant vient de
la commande chargée, jamais de l'URL ni d'une saisie. Pas de modale : le patron de §31 couvre les
confirmations **destructives** (suppression, annulation) ; ici l'action fait avancer la commande d'un cran,
elle est nommée par son effet réel et son résultat est rendu par le statut de la réponse. Deux clics ne produisent
**qu'une** requête : bouton `disabled`, `aria-busy`, libellé « … », et garde d'exécution dans le composant.
Après succès, le statut et les lignes de la carte sont **remplacés par la réponse du serveur** ; la
notification « Suivi de commande » que ce `PATCH` provoque côté backend reste le seul avertissement envoyé à
l'acheteur — cet écran n'envoie aucune notification lui-même.

**Retour visuel.** Une carte sur laquelle une action a réussi porte un message `.message--succes`
(`role="status"`) reprenant le nouveau statut. Si le bouton a disparu (statut terminal), le focus est posé
sur ce message (`tabindex="-1"`), seule destination explicite une fois le déclencheur retiré (§31).

**Erreurs.** 400 : le message du serveur, mot pour mot, dans la carte concernée ; la commande garde le statut
affiché. 403 : accès refusé, sans déconnexion ni purge (§19). 401 : laissé à `authInterceptor`. Panne réseau
ou 500 : texte générique via `messageErreurApi`. Jamais de trace technique dans l'interface (§16).

**Contenu d'une carte.** En-tête « Commande n° {{id}} » + badge de statut (§27, `VARIANTES_BADGE_COMMANDE`,
le texte du libellé conservé à côté de la couleur) ; champs date et heure, acheteur (`nomAcheteur` renvoyé
par le serveur), réception, lignes, total (§30) ; **liste des lignes** (§32 : produit, unité et quantité, prix
unitaire, sous-total — c'est ce que le producteur a à préparer) ; réception en `LIVRAISON` : adresse,
téléphone et instructions, une valeur absente rendue par `—`, et en `RETRAIT` une notice, sans adresse
inventée (§33).

**États (§11).** Chargement (`aria-busy`, « Chargement des commandes reçues… »), erreur avec « Réessayer »,
vide (« Aucune commande reçue pour le moment. » + lien « Voir mes récoltes »), liste. Un chargement ne rend
jamais un faux état vide.

**Navigation.** Le lien d'entrée est dans l'en-tête de « Mes récoltes » (« Commandes reçues ») et le lien de
retour dans celle-ci : l'en-tête global ne reçoit pas d'entrée de navigation de plus, « Commandes reçues » reste
hors de son `<nav>` (§10.5, même arbitrage qu'en §29). Le lien d'espace de l'en-tête reste actif par préfixe sur
les deux pages producteur (§10.5).

**Ce que cet écran ne fait pas.** Aucun paiement, aucun vocabulaire de paiement (§28), aucune annulation
offerte au producteur, aucune notification envoyée, aucun appel de récolte, **aucun polling, aucun
`setInterval`, aucun `WebSocket`, aucun `EventSource`** : la liste est relue à l'ouverture de la page et par
« Réessayer » après une erreur.

**Limite connue, héritée du contrat serveur.** `LigneCommandeResponse` ne porte aucun identifiant de
producteur : sur une commande qui mélange plusieurs producteurs, la réponse du serveur présente **toutes** ses
lignes à chacun d'eux. Le frontend ne filtre pas ces lignes à l'aveugle — une commande tronquée localement
serait plus trompeuse qu'un excédent visible, et le serveur, lui, accepte bien le `PATCH` sur cette commande.
La distinction relève d'une décision backend (champ ajouté au DTO ou filtrage dans `CommandeService`), pas
d'un tri inventé ici.

## 36. Profil producteur (Phase 5.8, étendu : les sept champs du compte et de l'exploitation)

Écran « Profil » (`/producteur/profil`), `features/producteur/profil/`, protégé par `authGuard` puis
`roleGuard` avec `data.roles: ['PRODUCTEUR']`, chargé paresseusement. Titre de page : « SunuRecolte — Profil ».
Même patron de page que §35 : surtitr « Espace producteur », un seul `<h1>`, entrée depuis l'en-tête de
« Mes récoltes », lien de retour vers « Mes récoltes ».

**Deux groupes.** Un `<fieldset>` « Compte » (prénom, nom, adresse e-mail, téléphone) et un `<fieldset>`
« Exploitation » (localisation, filière, description), chacun avec son `<legend>`. Une note ferme le premier
groupe : « Le rôle du compte et le mot de passe ne se modifient pas depuis cet écran. »

**Données.** `GET /api/producteurs/moi` sans aucun paramètre envoyé : l'identité vient du jeton, et le
serveur renvoie un 403 pour tout rôle qui n'est pas producteur (ADMIN compris). La modification passe par
`PUT /api/producteurs/moi` : même URL, même source de vérité. **Aucun identifiant ne sort de l'écran** — ni
dans l'URL, ni dans le corps — donc un producteur ne peut pas viser le compte d'un autre.
`PUT /api/producteurs/{id}` reste en service pour un autre contrat (les trois seules colonnes d'exploitation,
par le propriétaire ou l'ADMIN, §25) et n'est plus appelé par le frontend. L'`id` renvoyé par `moi()` continue
de servir d'`producteurId` aux formulaires de récolte (§29, §30).

**Sept champs éditables.** Compte : `prenom` (texte, obligatoire, `autocomplete="given-name"`), `nom`
(texte, obligatoire, `family-name`), `email` (`type="email"`, obligatoire, `autocomplete="email"`),
`téléphone` (`type="tel"`, obligatoire, `autocomplete="tel"`). Exploitation : `localisationExploitation`
(libellé « Localisation de l'exploitation », texte, facultatif), `filiere` (liste de sélection,
**obligatoire**), `description` (zone de texte, facultatif). Ces sept noms sont exactement ceux du DTO Java
`ModifierProfilProducteurRequest` : aucun champ inventé, aucun champ du record oublié. La liste des filières
est peuplée à partir des référentiels existants (`FILIERES`, `LIBELLES_FILIERE`, §26).

**Contrat d'envoi — non négociable.** `ProducteurService.modifierMoi` réécrit le compte **et** l'exploitation à
chaque appel, sans fusion partielle : une propriété omise efface la valeur en base. Le corps du `PUT` contient
donc **toujours** les sept propriétés, même celles que l'utilisateur n'a pas touchées. Une chaîne vide est
envoyée `null` (comportement `texteOuNull()` de §29), jamais `""`, et l'identité est `trim()` avant envoi.
Un objet partiel est un défaut de conception, pas une optimisation.

**Bornage local.** Longueurs reprises colonne par colonne du schéma réel : `utilisateurs.prenom` et `nom`
`varchar(100)`, `email` `varchar(150)`, `telephone` `varchar(20)`,
`producteurs.localisation_exploitation` `varchar(255)`. Chaque champ porte le `maxlength` correspondant et le
même `Validators.maxLength` côté formulaire ; la description, colonne `TEXT`, n'est bornée nulle part, parce
que le schéma ne l'est pas. Ce bornage est une précaution d'usage, pas une règle de sécurité — l'autorité
reste le backend (§19).

**Adresse e-mail.** `type="email"`, `Validators.email` et `domaineEmailComplet` : un confort de saisie, l'autorité
en la matière étant le `@Email` du DTO. `Validators.email` comme `@Email` acceptent un domaine sans point
(`awa@exemple` est passé jusqu'en base lors de la QA 5.8-bis), d'où ce contrôle supplémentaire, partagé par les
trois formulaires qui saisissent une adresse (connexion, inscription, profil) via
`core/utilitaires/validation-email.ts` : il est **plus strict** que le backend, jamais plus permissif, et son
message explique la réparation — « Il manque l'extension du domaine, par exemple prenom@exemple.sn. ». Une aide visible prévient du changement de connexion (« Sert à vous connecter : notez
le changement pour la prochaine connexion. »). Si l'adresse appartient déjà à un autre compte, le backend
répond **400** avec un message seul — « Un compte existe déjà avec cette adresse email. » — et jamais une
erreur 500 pour ce conflit prévisible ; `BusinessException` ne portant pas de carte de champs, ce message
s'affiche en `.message--erreur`, pas sous le champ, et le frontend n'invente pas une attribution de champ que
l'API ne renvoie pas. Conserver sa propre adresse reste valide : le serveur exclut le titulaire avant de
conclure au doublon, et normalise l'adresse en minuscules.

**Téléphone.** Obligatoire, 20 caractères, `type="tel"`. **Aucune unicité** : le schéma ne porte aucune
contrainte `unique` sur `utilisateurs.telephone`, et `existsByTelephone()` n'est appelé nulle part du backend.
Aucune règle inventée non plus : pas de format « sénégalais », pas de préfixe, pas de regex — deux comptes
peuvent légalement porter le même numéro, rien dans l'interface ne doit laisser croire le contraire.

**Validation.** `prenom`, `nom`, `email`, `telephone` et `filiere` obligatoires : validation native
(`required`, `aria-required="true"`) plus le message du serveur si le champ arrive absent (`@NotBlank`,
`@NotNull`, §31). Un 400 avec `erreurs.<champ>` remplit `erreursParChamp` et affiche l'erreur sous le champ
concerné ; un 400 sans détail de champ remplit le message global ; 403, 401 et panne réseau sont traités comme
en §35 (le 403 reste un refus d'accès, **sans déconnexion ni purge**, et ne devient jamais un 401).

**Six états (§11).** Chargement (`aria-busy`, formulaire absent : on ne préremplit pas un formulaire vide
puis peuplé), erreur de chargement avec « Réessayer », formulaire en cours de saisie, envoi en cours, succès,
erreur d'envoi. Bouton « Enregistrer les modifications » : `disabled` pendant l'envoi, `aria-busy`, libellé
« … », et garde d'exécution dans le composant — deux clics ne produisent **qu'une** requête.

**Après succès.** Le formulaire est **reprérempli à partir de la réponse du serveur** (`ProducteurResponse`
retournée par le `PUT`), et non de l'objet envoyé : c'est la valeur persistée qui est affichée. Message
`.message--succes` (`role="status"`) : « Profil mis à jour. » Le focus reste sur le bouton réactivé, seul
élément ayant persisté. La session locale (§19) est **rafraîchie** par `AuthService.mettreAJourIdentite` :
prénom, nom et e-mail du fichier de session sont remplacés, pour que l'en-tête affiche l'identité courante
au lieu de celle de l'inscription. Le jeton n'est **pas** touché — changer d'adresse ne déconnecte pas,
l'autorité restant le backend qui relit le compte en base à chaque requête — et `utilisateurId` comme `role`
sont conservés tels quels ; l'objet écrit est une copie, jamais une mutation de la session en place.

**Après erreur.** Message `.message--erreur` (`role="alert"`, §10.3) avec le texte du serveur mot pour mot ;
la saisie de l'utilisateur est conservée, rien n'est effacé, aucune redirection.

**Accessibilité (§10.2, §13).** Un `<label class="champ__libelle">` visible par champ, mention
« (obligatoire) » sur les cinq champs obligatoires, `aria-invalid` et `aria-describedby` pointant vers
`<p … class="champ__erreur">` généré conditionnellement, aide discrète sous l'e-mail, le téléphone, la
localisation et la description. `autocomplete` sur les quatre champs de compte pour que le gestionnaire du
navigateur propose la bonne valeur. Navigation clavier complète, focus visible (§10.1).

**Responsive (§12).** Une colonne à 375 px ; chaque `.profil-producteur__rangee` (prénom + nom, e-mail +
téléphone, localisation + filière) passe en deux colonnes dès la tablette (`min-width: 768 px`), la description
restant pleine largeur ; bouton d'action `min-height: 44 px` sur mobile. Largeur de lecture plafonnée
(`max-width: 44 rem`), même gabarit que §29.

**Ce que cet écran ne fait pas.** Aucun changement de mot de passe, aucun avatar, aucun lien vers l'Admin.
`id`, `utilisateurId`, `role`, `actif` et `dateCreation` ne sont pas seulement masqués à l'interface : ils
n'existent pas dans le DTO d'écriture, et le serveur ignore toute propriété hors contrat. La relation
`Producteur` ↔ `Utilisateur` n'est ni lue ni réécrite ici.

## 37. Espace administrateur (Phase 5.9 : comptes, récoltes et prix indicatifs)

Quatre routes, chacune protégée par `authGuard` **puis** `roleGuard` avec `data.roles: ['ADMIN']` et chargée
paresseusement : `/admin` (`EspaceAdmin`, « SunuRecolte — Espace administrateur »), `/admin/utilisateurs`
(`Utilisateurs`, « SunuRecolte — Utilisateurs »), `/admin/recoltes` (`RecoltesAdmin`,
« SunuRecolte — Récoltes ») et `/admin/prix-marche` (`PrixMarche`, « SunuRecolte — Prix indicatifs »).
Fichiers : `features/admin/`. Ces quatre routes sont **les premières du projet réservées à un seul rôle** ;
avant elles, l'ADMIN n'était qu'un rôle de secours en écriture sur les ressources d'autrui (§25, §33).
La protection est vérifiée sur la table de routes réelle dans `src/app/routes-admin.spec.ts`, fichier qui
n'importe et ne monte **aucun** composant (§18).

**Aucune route personnelle n'est utilisée ici.** L'administration porte toujours sur une ressource désignée par
son identifiant : `mes-recoltes`, `/producteurs/moi` et `/acheteurs/moi` sont des endpoints de titulaire, et un
ADMIN y reçoit un 403 (§36). C'est une conséquence du contrat backend, pas une préférence d'interface.

**Entrée et gabarit.** L'en-tête connecté d'un administrateur porte trois liens — Catalogue, Tableau de bord,
« Administration » — et jamais « Panier », réservé à l'acheteur (§10.5, §25). Chaque écran reprend le patron des
espaces de rôle : surtitre « Espace administrateur », un seul `<h1>`, lien de retour vers `/admin`, contenu
contraint à `--largeur-contenu`, six états gérés (§11), aucune nouvelle couleur (§5), aucune bibliothèque de
composants (§17).

**`/admin` n'est pas un tableau de bord.** La page d'entrée est une liste de trois cartes — « Gérer les
utilisateurs », « Modérer les récoltes », « Gérer les prix indicatifs » — plus un lien discret vers les
notifications (§29). Aucun chiffre, aucun graphique, aucune statistique : le backend n'expose **aucun** endpoint
de comptage ni d'agrégation, et afficher un nombre que personne ne calcule serait du faux contenu (§17). Les
données ne sont chargées que sur l'écran qui les administre.

### 37.1 Comptes utilisateurs

- **Données.** `GET /api/utilisateurs`, avec en option un filtre `role`. La réponse est
  `UtilisateurResponse` : `id`, `nom`, `prenom`, `email`, `telephone`, `role`, `dateCreation`, `actif`. Ni le
  mot de passe ni son hash BCrypt ne sortent du service (§19 côté serveur). Le tri vient du serveur
  (`dateCreation DESC`, puis `id DESC`) et n'est jamais recalculé côté client ; aucune pagination, le volume du
  MVP (une région) ne la justifie pas. Une ligne affiche nom complet, email, téléphone, rôle (`LIBELLES_ROLE`),
  date de création (`formaterDateHeure`, §30) et état.
- **Une seule action.** `PATCH /api/utilisateurs/{id}/actif` avec un corps `{ "actif": true | false }`. Le
  contenu d'un compte — nom, email, rôle, mot de passe — n'est administrable **par aucune route** du backend,
  donc par aucun écran : le proposer serait promettre un endpoint inexistant.
- **Confirmation.** La désactivation est l'action la plus lourde de l'espace (elle coupe l'accès d'un compte
  éventuellement en session) : elle passe par une modale de confirmation aux conventions de §31 — `role="dialog"`,
  `aria-modal="true"`, `aria-labelledby`, focus posé sur « Annuler » à l'ouverture, Tab et Shift+Tab piégés dans le
  sous-arbre, Escape écouté sur le `document` et non sur l'overlay, focus rendu au bouton déclencheur à la
  fermeture (ou à « Actualiser » si ce bouton n'est plus connecté). Le bouton de la modale se nomme
  « Désactiver » ou « Réactiver » selon l'état lu, jamais « Confirmer » ; le libellé du bouton de liste porte le
  nom du compte visé, pour que l'intention soit audible avant l'activation clavier.
- **Anti double soumission.** Un signal `enCours` porte l'identifiant dont le `PATCH` est en vol : tous les
  boutons de la liste et les deux boutons de la modale sont `disabled`, le bouton trait porte `aria-busy="true"`
  et son libellé devient « … ». Deux clics ne produisent qu'un appel.
- **Résultat.** La ligne est remplacée par la **réponse du serveur**, jamais par un état écrit localement, et un
  message `.message--succes` (`role="status"`) nomme le compte concerné. En cas de refus — 400
  (auto-désactivation : « Vous ne pouvez pas modifier l'état de votre propre compte. »), 403, 404 — le message du
  backend s'affiche **dans la modale restée ouverte**, le focus revient sur « Annuler », et il n'y a ni
  déconnexion ni purge de session : un 403 ne devient jamais un 401 (§19).
- **Effet réel d'une désactivation.** Le filtre JWT relit le compte en base à chaque requête et écarte un compte
  inactif : le jeton pourtant valide d'un compte désactivé reçoit un **401** à la requête suivante (comportement
  vérifié par le test backend `unJetonDunCompteDesactiveRepond401`). C'est ce que dit la modale, et ce que
  l'interface ne peut pas contredire.
- **Limite assumée.** Le filtre `?role=` de l'API n'est pas exposé à l'écran : sans lui la liste complète tient
  sur un écran, et une liste de sélection de rôle serait un contrôle d'interface sans équivalent testé.

### 37.2 Modération des récoltes

- **Données.** `GET /api/recoltes` — le endpoint public du catalogue (§25), volontairement : la liste administrée
  est la liste **complète**, récoltes épuisées comprises, et non une liste filtrée « pour l'admin » que le
  backend ne fournit pas. `mes-recoltes` n'est jamais appelé ici.
- **Une seule action.** `PATCH /api/recoltes/{id}/statut`, corps `{ "statut": … }` (DTO `StatutRecolteRequest`,
  distinct de `RecolteRequest`, qui ne porte **jamais** de statut : le producteur ne saisit pas son statut, il
  résulte du cycle de vie du stock). Le domaine ne connaît que deux statuts, contrainte `ck_recoltes_statut` en
  base : la modération est donc un **aller-retour** `DISPONIBLE ⇄ EPUISEE`, libellés « Marquer comme épuisée » et
  « Marquer comme disponible ». Aucun statut de retrait, de validation ou de blocage n'a été inventé.
- **Pas de modale ici.** Le changement est immédiatement réversible depuis la même ligne — le bouton qui vient
  d'agir reste présent avec l'autre destination — et §31 demande une confirmation pour ce qui ne peut pas être
  annulé à l'écran. Une confirmation pour un geste réversible en un clic serait du bruit.
- **Ni création, ni modification, ni suppression** : le contenu d'une récolte reste la propriété de son
  producteur (§29). Le statut affiché après un `PATCH` est celui renvoyé par le serveur ; les états vide,
  chargement (`aria-busy`) et erreur avec « Réessayer » sont gérés comme sur les autres écrans (§11).
- **Ce que l'écran ne peut pas empêcher.** Un ADMIN peut marquer `DISPONIBLE` une récolte dont le stock est à
  zéro : `changerStatut` écrit le statut demandé, sans règle de cohérence avec `quantiteDisponible` — le modèle
  approuvé n'en porte aucune, et l'interface n'invente pas une règle que l'API n'applique pas.

### 37.3 Prix indicatifs de marché

Un seul écran pour les quatre opérations du contrat réel : lecture `GET /api/prix-marche` (publique), écriture
`POST /api/prix-marche`, `PUT /api/prix-marche/{id}` et `DELETE /api/prix-marche/{id}` (les trois réservées à
l'ADMIN par `SecurityConfig`, et le GET public reste public).

- **Formulaire unique, deux usages.** Le même bloc sert à la création (titre « Nouveau prix indicatif », bouton
  « Ajouter le prix ») et à la modification (titre « Modifier un prix indicatif », bouton
  « Enregistrer les modifications ») ; « Modifier » charge la ligne dans ce formulaire, avec une note indiquant
  l'identifiant en édition et un bouton « Annuler » qui l'abandonne sans requête.
- **Bornes reprises du DTO Java**, vérifiées avant l'envoi pour éviter un aller-retour inutile : `produit`
  obligatoire, 150 caractères ; `unite` obligatoire, 30 ; `prixMoyen` obligatoire, `0.01` à `99 999 999.99` ;
  `marcheReference` facultatif, 150. `dateMiseAJour` n'est **jamais** envoyé : c'est l'entité qui le remplit, et
  l'écran l'affiche en lecture seule (`formaterDateHeure`).
- **L'API reste seule autorité.** Si elle refuse, son message et ses `erreurs` par champ reprennent la main sur
  le message local (§10.2, §31). Une saisie `type="number"` livrant une chaîne, toute comparaison et tout envoi
  passent par une conversion numérique explicite.
- **Suppression confirmée** par une modale de même convention que §37.1 (`role="dialog"`, focus piégé, Escape
  global, bouton « Retirer le prix » distinct de « Annuler »), avec un `DELETE` en vol et un seul.
- **Limite assumée.** Aucune unicité de `(produit, marcheReference)` n'existe dans le schéma : rien à l'écran ne
  laisse croire qu'ajouter une ligne ferait doublon avec une ligne existante.

### 37.4 Statuts de commande vus de l'ADMIN

L'ADMIN reste une partie prenante transverse sur `PATCH /api/commandes/{id}/statut` (§33) : il **ne peut pas**
contourner les transitions métier. Un refus suit le même chemin que pour un acheteur ou un producteur —
« La commande est déjà au statut … » ou « Transition de statut interdite : … vers … » (400) — et l'annulation
décrémente toujours le stock et annule le paiement en attente côté serveur. Aucun écran d'administration des
commandes n'a été créé : la capacité existe côté API, elle n'a pas d'interface, et cette sous-phase n'invente pas
un écran sans contrat de liste administrable dédié.

### 37.5 Ce que l'espace administrateur ne fait pas

Pas de dashboard analytique, pas de graphique, pas de statistique, pas d'export, pas de création de compte, pas
de changement de mot de passe ou de rôle, pas de livraison ni de transporteur, pas de deuxième facteur, pas de
journal d'audit. Les guards `authGuard`/`roleGuard` sont du confort de navigation : seule l'API autorise, et un
rôle non ADMIN qui appelle l'une de ces routes reçoit 401 sans jeton, 403 avec un jeton d'un autre rôle —
vérifié par les tests backend, pas par l'interface (§19).

## 38. Alignement sur les références visuelles validées (Phase 5.10)

Trois maquettes MagicPath sont **validées comme références visuelles officielles** et servent de point de
comparaison pour toute décision de mise en page : **Catalogue des récoltes**, **Détail commande** et
**Administration** (aperçu `https://designs.magicpath.ai/v1/eager-space-1210`). Elles sont une référence
**visuelle** : elles ne décrivent ni le contrat de l'API, ni les fonctionnalités existantes, ni un scénario de
données. Cette section fixe les arbitrages pris entre elles et l'interface réellement livrée.

### 38.1 Palette : une hiérarchie d'encre, pas une nouvelle palette

Les trois références se lisent presque en monochrome : **fond blanc pur, action principale en encre, filets
forts en encre ou gris foncé, filets secondaires en gris neutre, textes noir et gris, aucune ombre
décorative**. Cet alignement est adopté comme **hiérarchie d'action**, et non comme remplacement de la palette.

- `--couleur-encre` (§5) porte l'action principale des trois écrans maîtres, via `.bouton--encre` (§10.1). Ce
  n'est pas une couleur ajoutée au système : c'est `--couleur-texte`, nommé pour un rôle.
- **Le vert `--couleur-primaire` n'est supprimé ni repeint.** Il reste la couleur de la marque (lien,
  navigation, en-tête) et l'action principale de **tout écran non encore aligné** — accueil, authentification,
  tableau de bord, espaces producteur et acheteur hors des trois périmètres, profil, notifications, erreurs.
  De même `--couleur-accent`, `--couleur-succès` et les couleurs d'état gardent leurs usages (§5, §27) : un
  statut n'est jamais repeint en encre pour ressembler à une maquette.
- **Le crème `--couleur-fond` reste le fond global** (`body`, §6). Les trois écrans maîtres posent leur surface
  blanche avec le modificateur `.page--surface` (§10.4) : changer `--couleur-fond` ou `body` aurait aligné les
  maquettes en décalant, sans raison, les vingt autres pages.
- Les ombres restent interdites hors des deux usages de §7 ; les références ne contiennent aucune ombre, ce qui
  confirme la règle plutôt qu'il ne la change.

### 38.2 Dates : le format livré garde son format

Les références affichent des dates dans une autre graphie. **Le format de `core/utilitaires/formatage.ts` ne
change pas** : `14/09/2024 à 14:30` (§30). Un alignement typographique des dates toucherait dix écrans et les
tests de formatage pour un gain purement décoratif ; l'écart est **voulu et documenté ici**, pas une omission.

### 38.3 Administration : une navigation partagée, pas des routes fusionnées

La référence « Administration » montre **un** écran avec trois sections. L'API et le routeur en expose trois :
`/admin/utilisateurs`, `/admin/recoltes`, `/admin/prix-marche`, chacune sous `roleGuard` ADMIN avec son propre
contrat. La maquette est donc suivie **au niveau de la navigation**, pas au niveau du routage :

- un composant partagé `partage/admin-navigation` présente les trois entrées en `.onglets` (§10.5), avec
  `routerLink`, `routerLinkActive` et `ariaCurrentWhenActive="page"` ;
- **les routes ne sont pas fusionnées** : `app.routes.ts` ne change que si le nouveau composant l'exige
  techniquement, et une telle exception est expliquée avant d'être écrite ;
- le composant est **purement présentation et navigation** : il n'appelle aucun service, ne connaît aucun DTO,
  ne porte aucune logique d'autorisation (§19 — le frontend n'est pas l'autorité).

### 38.4 Donnée réelle : règle absolue

**Une maquette n'autorise ni à inventer une donnée, ni à en supprimer une.** Chaque élément d'une composition
alignée doit correspondre à un champ réellement renvoyé par l'API ; chaque élément présent à l'écran et absent
de la maquette est une fonctionnalité conservée, pas un défaut à corriger.

Concrètement, sont **conservés** parce que réels et fonctionnels :

- **Catalogue** : les filtres du service `RecolteService`, les états chargement / erreur / vide, la quantité
  disponible avec son minimum et son maximum, le statut, la date, la localisation, l'ajout au panier et le lien
  vers le détail (§11, §25, §27).
- **Détail commande** : le statut et son badge (§27), la date, la réception, les lignes, le total, le paiement,
  l'annulation, la modale de confirmation et tout le volet accessibilité — piège de focus, Escape, retour du
  focus (§31, §33, §34).
- **Administration** : **toutes** les colonnes réellement retournées par chaque endpoint, le bouton
  d'actualisation, l'accès aux notifications, la modération de statut, le CRUD des prix indicatifs et le
  changement d'activité des comptes (§37).

Et trois éléments de la référence **ne sont pas implémentés**, parce qu'aucun DTO ne les porte :

| Élément de la maquette | Preuve d'absence |
| --- | --- |
| Frais de livraison (détail commande) | `CommandeResponse` n'expose que `total` ; aucun champ de livraison n'existe dans le modèle approuvé |
| Sous-total de marchandises séparé | `CommandeResponse` n'a pas de second montant ; les `sousTotal` sont par ligne (`LigneCommandeResponse`) |
| Producteur affiché par ligne de commande | `LigneCommandeResponse` = `{ id, recolteId, produit, unite, quantite, prixUnitaire, sousTotal }`, sans producteur ni localité |

Y ajouter une valeur aurait voulu dire l'inventer à l'écran ou la demander au client (§19 : les montants ne
sont jamais acceptés depuis le client). **Amendement (§39)** : `RecolteResponse.imageUrl` est une adresse saisie
par le producteur dans son formulaire, donc servie par l'API quand elle existe. Un écran de récolte ne dessine un
bloc d'image **que** lorsque cette adresse est non nulle — le catalogue et le détail restent typographiques sinon
(§10.6). Aucun fichier image n'est ajouté à `public/` pour garnir une récolte sans photo.

### 38.5 Responsive : une table dense n'est pas une table transportée

Les références sont produites en large desktop. **Une largeur de maquette n'est pas une preuve pour 375 px**,
et `overflow-x` global est exclu : faire défiler horizontalement une page entière pour préserver un tableau de
cinq colonnes est une régression d'usage, pas une solution. Sous `$point-tablette`, une table dense passe en
`.tableau--empile` (§12) : un bloc par ligne, en-tête masqué, libellé de colonne porté par
`data-libelle` et affiché en pseudo-élément, actions en dernier. Le `<table>` et les en-têtes logique restent
dans le DOM, donc un lecteur d'écran garde l'association cellule / en-tête. Les quatre largeurs de contrôle
sont **375 / 768 / 1024 / 1366 px** (§12).

### 38.6 Périmètre et ordre

L'alignement est conduit en quatre étapes, chacune validée avant la suivante : socle documentaire et
design system (§38.1 à §38.5, tokens et classes de `_composants.scss`), puis Catalogue, puis Détail commande,
puis Administration. Une étape ne convertit pas les écrans des suivantes, ne touche ni aux DTO, ni aux
services, ni aux guards, ni au panier, et n'ajoute aucune dépendance. Les tests sont adaptés **seulement** là
où la structure HTML change réellement ; aucun test n'est supprimé ni désactivé pour faire passer un style.

## 39. Refonte visuelle (maquette Figma, octobre 2026)

Cette section **remplace** les règles ci-dessous de §6, §7 (rayons et ombres), §14 et §17 pour l'ensemble de l'interface :

- **Typographie (§6)** : titres en Fraunces (`--police-titre`, italique pour le mot d'accent), texte en DM Sans
  (`--police-texte`). Les deux polices sont **auto-hébergées** via `@fontsource-variable/*` (aucune requête
  externe, rendu identique hors connexion).
- **Palette (§5)** : valeurs des tokens mises à jour dans `_tokens.scss` (vert forêt `#203d2e`, terre cuite
  `#b66b3b`, crème `#f8f7f1`) ; les noms de tokens sont inchangés, donc tous les écrans suivent.
  Nouveaux tokens : `--couleur-sable`, `--couleur-foret-profonde`, `--couleur-sable-accent`,
  `--rayon-pilule`, `--duree-mouvement`, `--police-titre`, et ceux de §39.1.
- **Formes (§17)** : boutons et badges en pilule (`--rayon-pilule`).
- **Animations (§14)** : survol des cartes de récolte (élévation de 4 px, zoom lent de la photo), glissement de la
  flèche des boutons, ouverture du panier latéral (`--duree-mouvement`, 300 ms). Toutes sont neutralisées par
  `prefers-reduced-motion`. Aucune animation permanente ni carrousel automatique.
- **En-tête** : trois actions rondes en pilule (`--rayon-pilule`, 44 × 44 px, bordure `--couleur-bordure`, survol
  `--couleur-primaire` + texte `--couleur-fond`) — **sac** (acheteur), **cloche** (tout rôle connecté), **burger**
  (sous 1100 px). Les comptes sont des `.badge` en pastille d'angle, jamais des surfaces cliquables distinctes.
  Les liens sont repliés en **navigation disclosure** sous `--point-desktop` et reprennent leur ligne à droite au
  dessus. Détail des règles, des `aria-label` et du seuil : §10.5.
- **Panier latéral** : composant `app-panier-tiroir`, ouvert par le **bouton sac** rond de l'en-tête (§10.5) ; le
  sac n'a pas d'adresse, `/acheteur/panier` reste atteint par le tiroir. Son action principale est
  **« Continuer à explorer »** : elle ferme le tiroir sans
  naviguer ; l'accès à la commande et au panier complet reste assuré par « Voir le panier complet »
  (`/acheteur/panier`), qui mène lui-même à l'étape de commande (§26). Le tiroir ne fait que refléter
  `PanierService` ; la commande reste calculée et validée par le serveur. L'ajout rapide depuis l'accueil ne
  l'ouvre plus : il rend une notice (§39.2).
- **Images (§15)** : la photo du hero est une photographie d'illustration ; les cartes de récolte utilisent
  `imageUrl` de l'API.
- **Puce de statut d'une récolte** : `.recolte__statut` et sa variante `.recolte__statut--epuise` vivent désormais
  dans `styles/_composants.scss`, **promues à l'identique** depuis la carte « Récolte du moment » de l'accueil. Les
  trois copies locales (accueil, catalogue, fiche) sont supprimées : une règle unique, posée **sur le visuel** d'une
  récolte, partagée par les trois écrans. Ses trois valeurs (`padding: 6px 12px`, `font-size: 0.625rem`,
  `rgba(32, 61, 46, 0.88)`) viennent de la règle d'origine et restent hors de la table §39.1 : elles y figureront si
  un quatrième écran les reprend un jour, en attendant elles ne sont pas dupliquées.
- **Catalogue (étape 4 de l'alignement)** : la liste dense (`<table>` à sept colonnes) devient la **grille de cartes
  de récolte** de l'accueil — une colonne sous `$point-mobile`, deux de `$point-mobile` à `$point-desktop`, quatre
  au-delà. Une carte porte le visuel (seulement quand `imageUrl` est non nul), le produit, le producteur, la
  description, les colonnes restantes de l'ancienne table (disponibilité, bornes de commande, prix, date et lieu)
  **uniquement quand l'API les fournit**, puis les actions. Le statut se pose **sur la photo** avec la puce promue
  ci-dessus ; sans photo, il revient au `.badge` du titre : **un seul indicateur à la fois**, comme sur la fiche. Ni
  filière ni catégorie n'apparaissent sur la carte : `RecolteResponse` ne les expose pas (§38.4). La barre de filtres
  reprend celle de la maquette : **pastilles** de filière et de statut — « Toutes » et « Tous » portent l'absence de
  critère — et champ de recherche **sur la même ligne**. Elles réutilisent `.bouton` : la pastille active est en
  `.bouton--encre` et marquée `aria-pressed="true"`, les autres en `.bouton--secondaire` avec `aria-pressed="false"`.
  Un clic sur une pastille note le critère et **ne lance aucune requête** : la recherche part toujours du bouton
  « Rechercher », avec les mêmes paramètres d'URL qu'auparavant (§38.4). Une récolte non ajoutable (statut ou stock)
  garde ses deux boutons — texte et « + » — **focusables** en `aria-disabled="true"` (jamais `disabled`), avec le
  motif en `role="status"` relié par `aria-describedby`, et le composant refuse tout clic : rien n'est ajouté, aucune
  notice n'est émise. Le succès est « `[produit] ajouté au panier` » (§39.2), dans les mêmes mots que l'accueil et la
  fiche. Les quatre états (§11) restent inchangés. `.tableau--empile` (§38.5) ne s'applique plus à cette page, qui
  n'a plus de table ; il reste la règle des autres tableaux.
- **Fiche de récolte `/recoltes/:id` (étape 5 de l'alignement)** : la route reste une **page** (lien partageable,
  aucun piège de focus) et non une modale, avec la mise en page de la maquette produit : **deux colonnes** à partir
  de `$point-tablette` — le visuel à gauche, les informations et les actions à droite — empilées sous ce seuil, le
  visuel en premier. Le statut se pose **sur la photo** avec les classes de la carte de récolte de l'accueil
  (`.recolte__statut`, variante `--epuise`) ; quand aucune photo n'est affichée (`imageUrl` null ou image qui ne
  charge pas), il revient au `.badge` du titre : **un seul indicateur à la fois**, jamais deux. « Ajouter au
  panier » est le bouton primaire de la colonne droite et ajoute `QUANTITE_INITIALE` unité, avec le libellé « Quantité
  ajoutée : … » existant — cet écran n'a **pas** de sélecteur de quantité. Une récolte non ajoutable (statut ou
  stock) garde son bouton **focusable** en `aria-disabled="true"` (jamais `disabled`), son motif en `role="status"`
  relié par `aria-describedby`, et le composant refuse tout clic sur ce bouton : rien n'est ajouté, aucune notice
  n'est émise. Le succès est « `[produit] ajouté au panier` » (§39.2), le refus `messageRefusAjout()`. Les trois
  états §11 (chargement, erreur avec « Réessayer », introuvable) restent inchangés, reposés sur les seuls tokens
  existants.

### 39.1 Tokens de la refonte

Ce tableau est la liste à jour des couleurs, rayons, ombres et voiles introduits par la maquette. Aucune autre
valeur n'est autorisée (§5) : une teinte ou un rayon absent d'ici doit d'abord être ajouté ici, puis dans
`_tokens.scss`, avant d'apparaître dans un écran.

| Rôle | Token | Valeur | Usage |
|---|---|---|---|
| Vert survol | `--couleur-primaire-survol` | `#365a43` | survol et état actif des actions vertes (`--couleur-primaire`, `--couleur-encre`) |
| Sauge | `--couleur-sauge` | `#b5c3a6` | `::selection` ; ne porte jamais de texte |
| Fond d'image | `--couleur-fond-image` | `#e9e6db` | fond d'un bloc d'image avant et pendant le chargement |
| Voile de modale | `--voile` | `rgba(16, 37, 26, 0.7)` | fond des modales (§31), sous `--flou-voile` |
| Voile de tiroir | `--voile-tiroir` | `rgba(16, 37, 26, 0.6)` | fond du panier latéral et des tiroirs, **sans flou** |
| Flou de voile | `--flou-voile` | `blur(8px)` | `backdrop-filter` du seul voile de modale |
| Rayon de surface | `--rayon-surface` | `3px` | cartes, modales, panneaux et surfaces de même nature |
| Ombre d'élévation | `--ombre-elevation` | `0 25px 50px -12px rgba(0, 0, 0, 0.25)` | panneau superposé qui borde l'écran : tiroir du panier, menu latéral |
| Ombre de carte au survol | `--ombre-carte-survol` | `0 20px 50px rgba(28, 54, 39, 0.1)` | élévation d'une carte de récolte au survol (accueil, catalogue) |
| Ombre de notice | `--ombre-toast` | `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)` | pilule de la notice de retour d'action (§39.2) |
| Empilement de la notice | `--z-toast` | `70` | niveau de la notice : au-dessus du tiroir (`50` et `51`) et de `--z-voile` |

- **Rayons** : `--rayon-surface` (3 px) pour les surfaces, `--rayon-pilule` (999 px) pour les boutons, badges,
  pastilles et champs de quantité. `--rayon-md` (6 px) reste la valeur des champs de saisie, des messages et du
  lien d'évitement jusqu'à l'alignement de leur écran ; `--rayon-lg` (8 px) ne sert plus aux surfaces du design
  system. Aucune valeur intermédiaire (4 px, 12 px, 16 px) n'est introduite.
- **Ombres** : `--ombre-surface` reste la seule ombre des surfaces posées dans le flux, et une carte ne porte
  jamais d'ombre au repos (une bordure suffit). Un panneau superposé qui **borde l'écran** (tiroir du panier,
  menu latéral) est rendu par `--ombre-elevation` — jamais par une ombre directionnelle écrite en dur dans un
  composant. La modale de confirmation, elle, reste à `--ombre-surface` et au `--rayon-surface` : la maquette ne la
  dessine pas, et §31 garde la main jusqu'à son alignement. L'élévation au survol d'une **carte de récolte** est
  rendu par `--ombre-carte-survol` (accueil et catalogue) : elle ne s'applique qu'au survol, jamais au repos, et
  seulement aux cartes de récolte — ni aux tableaux, ni aux panneaux d'administration.
- **Voiles** : `#10251a` à 70 % pour une modale, avec `--flou-voile`, et 60 % pour un tiroir, **sans flou** — la
  maquette ne floute que le fond de la modale produit. Le flou est la seule exception acceptée à « pas d'effet
  gratuit » (§17) : il sépare le panneau du contenu sans bordure ni épaisseur. Il reste décoratif — sans
  `backdrop-filter`, le voile demeure plein et le panneau lisible.
- **Survol des actions vertes** : le survol **éclaircit** le vert (`--couleur-primaire-survol`) au lieu de
  l'assombrir, et le texte garde `--couleur-texte-inverse` (contraste 7,8:1 sur `#365a43`). Aucun survol n'inverse
  fond et texte, aucun survol n'utilise une teinte de survol d'une autre famille.
- **Polices** : Fraunces (`--police-titre`, titres et chiffres éditoriaux, italique pour le mot d'accent) et
  DM Sans (`--police-texte`, corps) sont auto-hébergées par `@fontsource-variable/*` et déclarées dans
  `angular.json`. Aucune webfont n'est chargée depuis un CDN, y compris pour un écran en cours d'alignement.
- **Périmètre de la maquette** : `figma-reference/` ne couvre que l'accueil. Pour tout autre écran, la référence
  est ce §39, les tokens de §39.1 et les quatre écrans validés (accueil, en-tête, pied de page, panier latéral).

### 39.2 Notice de retour d'action (`ToastService` + `app-toast`)

La notice est le **mécanisme unique de retour d'action** de l'application : elle confirme ou infirme une action
déclenchée par l'utilisateur (ajout au panier, enregistrement, statut modifié), sans jamais remplacer un
état d'écran. Elle est migrée **écran par écran**. Écrans qui l'utilisent aujourd'hui : les ajouts rapides de
l'accueil et du catalogue, puis le **LOT 1 « parcours acheteur »** — `/acheteur/panier` (`refus()`), `/recoltes`
(`succesPanier()` et `refusPanier()` du bouton texte), `/recoltes/:id` (les deux mêmes) et
`/acheteur/commandes/:id` (`succesAnnulation()`), puis le **LOT 2 « parcours producteur »** —
`/producteur/commandes` (refus de transition : le `messageErreurApi()` du PATCH, texte mot pour mot repris
du signal `refus()`) et `/producteur/profil` (succès d'enregistrement : « Profil mis à jour. »), puis le
**LOT 4 « récoltes du producteur »** — `/producteur/recoltes` pour le **retrait d'une récolte** (« « X » a été
supprimée du catalogue. », texte mot pour mot). Seul écran migré où le texte ne vient pas du signal de l'écran :
`messageSucces()` rend le message d'arrivée (voir le tableau ci-dessous) et n'est plus écrit par la suppression,
qui porte elle-même sa phrase à la notice. Les bannières
`.message--succes` et `.message--erreur` des autres écrans restent en place jusqu'à leur étape.

Sur un écran migré, le **signal du composant reste la source du texte** : la notice est émise à partir du même
message (`messageRefusAjout()`, `La commande n° … a été annulée.`, etc.), mot pour mot. `ToastService` n'écrit
aucun libellé et n'est jamais l'autorité d'un succès.

- **API** : `afficher(message, type)` avec `type` parmi `'succes' | 'erreur' | 'info'` (défaut `info`),
  `masquer()`, `suspendre()`, `reprendre()`. **Une seule notice à la fois** : la nouvelle remplace l'ancienne et
  repart sur sa propre durée. `ToastService` est un service **visuel** : il n'appelle aucune API, ne connaît ni le
  panier ni l'authentification, et n'est jamais l'autorité d'un succès — ce succès lui est transmis par l'écran.
- **Durées** : succès et info **2500 ms**, erreur **5000 ms**. Le minuteur est **en pause** pendant que la notice
  est survolée ou qu'un de ses éléments a le focus, et repart au retrait du survol ou du focus. Une erreur porte
  un **bouton de fermeture** (« Fermer la notification ») ; succès et info n'en portent pas, ils se retirent
  seuls. Un message long reste donc traitable par l'utilisateur, et aucune notice n'est éternelle.
- **Position** : en bas de l'écran, centrée ; sous `$point-mobile`, pleine largeur moins les marges, au-dessus de
  la safe-area (`env(safe-area-inset-bottom)`). Elle ne déplace pas le contenu et ne piège pas le focus.
- **Entrée et sortie** : la pilule monte depuis le bas (`translateY` + `opacity`) en `--duree-mouvement`
  (300 ms), reste visible pendant sa durée, puis redescend et est retirée du DOM. Sous
  `prefers-reduced-motion: reduce`, le reset global de §14 (`_base.scss`, `!important` sur toute durée) neutralise
  **aussi** le fondu : la notice apparaît et disparaît instantanément. C'est plus strict que le simple fondu visé,
  et c'est assumé : le reset global sert toute l'interface et n'est pas rétréci pour un seul composant.
- **Accessibilité** : les régions de notification sont **permanentes dans le DOM** (montées dans `app.html`, après
  le tiroir), le message seul entre et sort. Deux régions, jamais une seule dont le rôle changerait :
  `role="status" aria-live="polite"` pour succès et info, `role="alert"` pour erreur. Une notice n'est jamais le
  seul porteur d'une information durable : l'état d'écran (compteur du panier, libellé, tableau) reste la source.
- **Variante par type** :

  | Type | Fond | Texte | Icône (§9, sous-ensemble existant) | Rôle | Durée |
  |---|---|---|---|---|---|
  | `succes` | `--couleur-primaire` (#203d2e) | `--couleur-texte-inverse` (contraste 11,9:1) | `check_circle` `f0be` | `status` / `polite` | 2500 ms |
  | `info` | `--couleur-info` (#29527a) | `--couleur-texte-inverse` (contraste 7,6:1) | `info` `e88e` | `status` / `polite` | 2500 ms |
  | `erreur` | `--couleur-erreur` (#b3261e) | `--couleur-texte-inverse` (contraste 6,5:1) | `error` `f8b6` | `alert` | 5000 ms |

  Aucun texte technique dans une notice : le message vient du `message` renvoyé par le backend ou d'un texte court
  rédigé par l'écran qui détient la donnée (§11 et §16 — ni trace, ni SQL, ni contenu de jeton).
  `ToastService` ne fait que transporter le texte ; il n'en connaît ni la source ni la grammaire. Le succès d'un
  ajout au panier est « `[produit] ajouté au panier` », le refus reprend `messageRefusAjout()`.
- **Empilement et panier latéral** : `--z-toast` (70) place la notice au-dessus du tiroir (50 et 51) et des
  modales (`--z-voile`, 20). Parce que le tiroir est modal et que son action principale est collée en bas de
  l'écran, **aucune notice n'est rendue pendant qu'il est ouvert** : le composant lit `TiroirPanierService.ouvert()`
  et rend ses régions vides. **Rien n'est perdu pour autant** : le composant met la notice **en attente** —
  `suspendre()` gèle le temps restant à l'ouverture, `reprendre()` le relance à la fermeture. La notice est donc
  rendue **une seule fois**, avec le temps qu'il lui restait, sans doublon si le tiroir s'ouvre et se ferme
  plusieurs fois, et une notice déjà en sortie n'est jamais ressuscitée. Corollaire obligatoire : l'ajout rapide
  de l'accueil, qui ouvrait le tiroir, ne l'ouvre plus et rend sa notice — sans cette dérogation la notice serait
  systématiquement masquée. Limite connue et assumée : le tiroir ne piège pas encore le focus de la page, donc un
  refus déclenché au clavier **derrière** un tiroir ouvert est retardé jusqu'à sa fermeture plutôt que perdu.
- **Refus d'une ligne du tiroir (LOT 2)** : un refus **déjà au panier** ne devient **jamais** une notice globale.
  Il est porté par la ligne elle-même, en mention discrète sous le pas (`role="status"`, reliée au « + » par
  `aria-describedby`), parce que le tiroir est modal et que la correction se lit à l'endroit même du geste. Le
  « + » est neutralisé **au plafond du stock connu** (`quantite >= quantiteDisponible`) en `aria-disabled` — et non
  `disabled`, pour ne pas perdre le focus — avec la mention « Stock maximum atteint » ; un refus que ce plafond ne
  couvre pas (quantité fractionnaire) reste affiché sous la ligne. La phrase du refus vient de
  `messageRefusQuantite()` (`core/utilitaires/panier-affichage.ts`) : **source unique**, partagée avec la page
  `/acheteur/panier`, qui l'envoie elle en notice.
- **Ligne non disponible dans le tiroir (LOT 3)** : le tiroir obéit au **même** blocage que la page. Une ligne dont
  le snapshot n'est plus `DISPONIBLE` neutralise son « + » en `aria-disabled`, porte sous la ligne le motif de la
  page — `messageLigneBloquee()`, **mot pour mot** — en `role="status"` et relié par `aria-describedby`, et garde
  le « − » et « Retirer » utilisables : rien n'est jamais masqué ni retiré automatiquement (§25). La règle
  `estLigneBloquee()` et sa phrase vivent dans `core/utilitaires/panier-affichage.ts`, **source unique** des deux
  écrans comme au LOT 2. Quand statut bloqué et plafond de stock se cumulent, **le statut prime** : une seule
  mention, jamais deux.
- **Ajout rapide (`+`)** : la pilule ronde d'une carte de récolte ajoute `QUANTITE_INITIALE` unité et applique
  **exactement** les mêmes règles que le bouton texte de la même carte : même garde `estAjoutPossible()`, mêmes
  bornes de commande, même refus de `PanierService`, et **récolte épuisée ou stock insuffisant = bouton rendu
  `aria-disabled="true"` avec son motif** (§39) — jamais `disabled`, pour qu'il reste atteignable au clavier et que
  le motif se lise ; la garde du composant refuse le clic. Elle affiche une notice de succès **seulement si**
  `PanierService.ajouter()` a renvoyé `true` ; sinon c'est une notice d'erreur portant le motif du refus. Un refus
  du service ne produit jamais de notice de succès. Sur l'accueil, le « + » n'est rendu que pour une récolte
  disponible ; sur `/recoltes`, il est rendu bloqué, comme le bouton texte de la carte et celui de la fiche. Depuis
  le LOT 1, le bouton texte obéit à la même règle sur `/recoltes` et `/recoltes/:id` : les deux partagent le même
  refus et la carte ne porte plus de bannière.
- **Règle d'exclusion — ce qui reste en bannière** : un retour n'est migré que s'il est **gratuit** (aucune
  correction attendue dans l'instant) et **non attaché à un champ**. Restent donc en bannière :

  | Écran | Bannière | Motif de non-migration |
  |---|---|---|
  | `/acheteur/commande` | `erreur()` (`commande.html:112`) | cible de focus (`#erreurMessage`, `tabindex="-1"`, `focusAttendu('erreur')`) **et** porte le bouton « Réessayer l'envoi » ; le même signal porte deux messages de validation du formulaire de réception |
  | `/acheteur/paiement/:id` | `erreurSoumission()` (`paiement.html:133`) | désigné par l'`aria-describedby` du fieldset « Moyen de paiement » : le message corrige une saisie et doit rester attaché au champ ; le même signal porte « Choisissez un moyen de paiement pour continuer. » |
  | `/producteur/commandes` | `succes()` rendu par `succesPour()` (`commandes-recues.html:110`) | cible du focus après une transition réussie (`#zoneSucces`, `role="status"`, `tabindex="-1"`, `focusSurSucces()`) ; les specs assertent `document.activeElement` |
  | `/producteur/profil` | `erreurGenerale()` (`profil-producteur.html:40`) | signal **mixte**, non scindé : porte à la fois la validation d'un champ (filière obligatoire) et l'échec du PUT ; la correction attendue est une saisie |
  | `/producteur/recoltes` | `messageSucces()` (`mes-recoltes.html:36`) | **message d'arrivée** porté par `?recolteCreee` / `?recolteModifiee` : confirmation d'un événement déjà passé, comme `compteCree()`, à lire en arrivant et tant qu'on la lit. Le retrait d'une récolte (LOT 4) part en notice **sans écrire ce signal** : la bannière partagée n'est pas scindée |
  | toute **modale** | `detail-commande.html:189`, `prix-marche.html:307`, `mes-recoltes.html:159`, `utilisateurs.html:171`, `recoltes-admin.html:143` | une notice hors de la modale sortirait le message du contexte fermé et masquerait le bouton à reprendre |
  | `/connexion`, `/inscription` | `erreur()`, `erreurGenerale()` | échec de formulaire : la correction est la saisie elle-même, le message doit persister jusqu'à la correction |
  | `/tableau-de-bord` | `compteCree()` | confirmation d'un événement déjà passé, pas le retour d'une action immédiate ; doit rester lue à l'arrivée sur l'écran |
  | **états de chargement** | les 17 bannières rendues à la place du contenu | ce ne sont pas des retours d'action : la notice ne remplace jamais un état d'écran |

  Un `erreurStockage()` rendu en `message--avertissement` (panier) n'est pas concerné par le LOT 1.

## 40. Tableau de bord (Phase 5.11, LOT 9)

`/tableau-de-bord` — écran d'arrivée d'un compte connecté (`authGuard`), tous rôles. Aucun bloc ni raccourci
par rôle n'existe et n'est ajouté : le rôle n'agit que sur deux rendus existants, le libellé du badge et le
`href` de « Accéder à mon espace » (`espaceParRole()` : `/producteur`, `/acheteur/commandes`, `/admin`).

- **Plafond §20** : le contenu est enveloppé dans `<div class="conteneur">` **imbriqué** dans
  `<section class="tableau-de-bord">`, comme sur les écrans déjà alignés — jamais
  `.tableau-de-bord.conteneur`. `.conteneur` apporte `--largeur-contenu` (1140 px), le centrage et les
  gouttières ; le rythme vertical est porté par `.tableau-de-bord .conteneur` (`flex-direction: column`,
  `gap: --espace-5`), donc `h1` et les bannières portent `margin: 0`. L'ancien `max-width: 36rem` local,
  non centré, est **retiré** : la carte ne contraint plus sa largeur elle-même et prend celle du conteneur.
- **Carte** : `class="carte tableau-de-bord__carte"` — fond, bordure, `--rayon-surface` et `padding: --espace-5`
  viennent du global §10.4 ; `__carte` n'ajoute que son rythme interne (`flex`, `gap: --espace-4`) et le
  `margin: 0` de `.carte__titre`.
- **Champs d'identité** : `dl` en grille **une colonne**, deux à partir de `$point-tablette`
  (`repeat(2, minmax(0, 1fr))`), `gap: --espace-3`. `dt` en `--taille-xs`, 600,
  `--couleur-texte-secondaire`, majuscules, `letter-spacing: 0.02em` ; `dd` en `margin-top: --espace-1` avec
  `font-variant-numeric: tabular-nums` — vocabulaire identique à la fiche récolte (§39) et aux champs de
  commande (§33).
- **États inchangés** : `.etat[aria-busy]` pendant le chargement, `.message--erreur` avec son bouton
  « Réessayer » (message du backend repris tel quel, texte générique sinon, aucune requête quand la session
  locale est absente), `.message--succes` `role="status"` pour `?compteCree=1` — cette bannière reste en
  bannière, §39.2 l'y autorise. Pas de `.page--surface` : §38.1 réserve ce fond aux trois écrans maîtres.
- **Aucune teinte, aucun rayon, aucune police, aucune largeur nouveaux.**
- **Tests** : `tableau-de-bord.spec.ts` (17 tests) couvre l'identité des cinq champs, le rôle lu depuis le
  serveur, les trois destinations, la bannière d'arrivée, les trois chemins d'erreur et la structure nouvelle
  (conteneur unique, `h1` unique, états dans le conteneur). **Non observé en navigateur réel** : les quatre
  largeurs 375 / 768 / 1024 / 1366 restent à contrôler (§38.5).

## 41. Parcours de commande acheteur (Phase 5.11, LOT 10)

`/acheteur/commande` et `/acheteur/paiement/:id` — les deux dernières étapes du tunnel, sans maquette : seule
compte l'alignement sur le vocabulaire déjà refait (panier §25, tableau de bord §40). Aucune logique n'est
modifiée : les montants restent lus sur la commande du serveur, jamais sur le panier local (§2), le paiement
reste simulé (§34), les modes de réception et les moyens de paiement restent exactement ceux d'avant.

- **Plafond §20 sur les deux écrans** : le contenu est enveloppé dans `<div class="conteneur">` **imbriqué**
  dans `<section class="commande">` et `<section class="paiement">`, comme au panier et au tableau de bord —
  jamais `.commande.conteneur`. Le rythme vertical est porté par `.commande .conteneur` et
  `.paiement .conteneur` (`flex-direction: column`, `gap: --espace-5`) ; l'unité de rythme fait passer le
  paiement de `--espace-4` à `--espace-5`, la commande l'avait déjà.
- **Deux colonnes dès `$point-desktop`, comme au panier** : le nouveau `<div class="commande__corps">`
  enveloppe le récapitulatif et la zone de réception, et passe en `grid` à
  `minmax(0, 1.8fr) minmax(0, 1fr)` avec `gap: --espace-6` et `align-items: start` — les mêmes proportions
  que `.panier__corps`. En dessous de 1100 px, les deux blocs s'empilent. Le paiement reste une colonne
  unique : il n'a qu'un résumé et un formulaire, et rien n'est ajouté pour l'élargir.
- **Titres de carte sur la classe globale** : les cinq titres de carte (`Récapitulatif`, les deux `Réception`,
  `Commande`, le titre de résultat du paiement) portent `.carte__titre` (§10.4) et non plus leur classe
  locale : la règle globale leur est byte-identique, aucune promotion n'a donc été nécessaire dans
  `_composants.scss`. Ne reste en classe locale que `.commande__zone-titre`, l'intitulé d'une zone **à
  l'intérieur** d'une carte (« Lignes de la commande »). Le `outline: none` du titre de résultat-focus
  (`tabindex="-1"`) est repris en `.paiement .carte__titre:focus`.
- **Chiffre dominant (§30)** : le total du récapitulatif (`.commande__total-valeur`) et le montant à payer
  (`.paiement__total`) passent en `--police-titre` + `--taille-xl`, comme le pied du panier — `tabular-nums`
  et le poids 600 sont conservés.
- **Arbitrage des largeurs locales — formulaire = colonne étroite centrée dans le conteneur**. Le `max-width`
  d'un formulaire ne se décrète pas écran par écran : il reprend la **valeur déjà présente** sur l'écran et se
  centre dans sa carte (`margin-inline: auto`), sans jamais en inventer une. `commande.scss` conserve donc son
  `32rem` existant et ajoute le centrage ; `paiement.scss` n'ajoute **aucune** largeur, puisqu'aucune
  n'existait. À ce lot, les trois largeurs locales encore non centrées — `detail-recolte` (46 rem),
  `formulaire-recolte` et `profil-producteur` (44 rem) — ne sont pas touchées. Les deux formulaires
  producteur ont été alignés depuis (**§41.2**) et sortent de la liste de suivi : **reste à aligner
  `detail-recolte` (46 rem)**.
- **États conservés, notices sans changement de type** : `.etat[aria-busy]` de chargement, bannière
  d'erreur avec son bouton « Réessayer » (elle reste bannière, §39.2 : cible de focus et porte l'action),
  écran de succès de la commande, bannière §28 « aucune transaction réelle » rendue hors des branches d'état,
  refus de paiement et fieldset « Moyen de paiement » inchangés. `h1` unique par écran, aucune hiérarchie
  modifiée là où elle était déjà correcte.
- **Aucune teinte, aucun rayon, aucune police, aucune largeur nouveaux.**
- **Tests** : `commande.spec.ts` passe de 34 à 38, `paiement.spec.ts` de 51 à 55 — les quatre ajouts par écran
  portent sur la structure nouvelle (conteneur unique, cartes globales, `h1` unique, états dans le
  conteneur). Une seule assertion existante a été re-ciblée, **avec la même chaîne** : le titre
  « Récapitulatif » est lu via `.commande__recap .carte__titre` au lieu de `.commande__zone-titre`. Aucune
  assertion supprimée ni assouplie. **Non observé en navigateur réel** : les quatre largeurs
  375 / 768 / 1024 / 1366 restent à contrôler (§38.5).

### 41.1 Liste et détail des commandes (LOT 11)

`/acheteur/commandes` et `/acheteur/commandes/:id`. Les deux écrans portaient **déjà** le plafond §20
(`<div class="conteneur">` imbriqué, étape 8 pour la liste, Phase 5.10 Étape 3 pour le détail) et la liste était
**déjà** une `li.carte` avec `h2.carte__titre`, badge de statut et lien « Voir le détail ». Ce lot ne fait donc
que trois ajustements, et consigne deux décisions.

- **Rythme** : `.detail-commande .conteneur` passe de `--espace-4` à `--espace-5` — les cinq écrans du parcours
  d'achat (panier, commande, paiement, liste, détail) respirent désormais à l'identique.
- **Chiffre dominant** : `.commandes__total` prend `--police-titre` + `--taille-xl`, poids 600 conservé,
  `tabular-nums` déjà porté par `.commandes__champs dd` — même écriture que `.panier__total-valeur` (§30) et que
  le total du tunnel (§41).
- **Capitules** : `.commandes__champs dt` reçoit `text-transform: uppercase` et `letter-spacing: 0.02em`, comme
  `.commande__chiffres dt` et les champs du paiement.
- **Décision — les lignes du détail restent un `<table>`.** `detail-commande.html` garde
  `table.tableau.tableau--maitre.tableau--empile` lié à son titre par `aria-labelledby="lignes-titre"` : c'est
  §38.5 qui l'exige, parce que l'empilement sous `$point-tablette` doit conserver l'association cellule / en-tête
  (`th scope="col"` dans le DOM, libellé de colonne repris par `data-libelle`). Une mise en cartes aurait été
  silencieuse : **aucune** assertion ne regardait le `<table>`. Trois tests de protection ont donc été écrits
  **avant** le restylage (`detail-commande.spec.ts`, 40 → 43) — `<table>` + classes denses + titre lié, les
  quatre `th scope`, les huit `data-libelle` d'une commande à deux lignes. Toute conversion future des lignes en
  cartes rougit la suite et doit d'abord révoquer §38.5 dans ce document.
- **Décision — aucun bloc paiement sur ce détail, tant que le contrat ne l'expose pas.** `CommandeResponse` ne
  porte aucun champ de paiement et `detail-commande.ts` n'émet **aucun** appel de paiement (`payable()` ne pilote
  que le lien). La consultation d'un paiement enregistré reste l'écran §34, qui relit la commande et le paiement.
  Afficher ici un moyen, un statut ou une référence de paiement exigerait soit un appel nouveau, soit un champ
  inventé — l'un et l'autre hors règles.
- **Ce que ce lot n'a pas fait, à dessein** : la liste reste en **une colonne**, sans grille multi-colonne, sans
  filtre, sans tri et sans pagination (§33) ; aucune `.carte` nouvelle, aucun token, aucune classe globale
  nouvelle, `styles/_composants.scss` non touché ; les `.ts` et les `.html` des deux écrans sont inchangés.
- **Tests** : `detail-commande.spec.ts` 40 → 43, `commandes.spec.ts` 25 **inchangées** (la classe
  `.commandes__total` est déjà épinglée par une assertion existante, un test supplémentaire n'aurait rien
  protégé de plus). **Non observé en navigateur réel** : les quatre largeurs 375 / 768 / 1024 / 1366.

### 41.2 Formulaires producteur — colonne étroite centrée dans le conteneur (LOT 12)

`/producteur/recoltes/nouvelle`, `/producteur/recoltes/:id/modifier` et `/producteur/profil`. Ces deux écrans
portaient déjà le rythme `--espace-5`, les `.carte` et `.champ` globaux, mais **aucun `.conteneur`** : leur
racine (`.formulaire-recolte`, `.profil-producteur`) appliquait `display: flex` et `max-width: 44rem` **sans
centrage**, la colonne restait collée à la gouttière gauche.

- **Règle — un formulaire est une colonne étroite centrée dans le conteneur** : le contenu de la `<section>` est
  enveloppé dans `<div class="conteneur">`, comme sur panier, commande, paiement, liste et détail des commandes
  (§41, §41.1). Le socle global (`styles/_base.scss`) fournit `width: 100%`, `margin: 0 auto` et les gouttières.
- **44rem conservé, aucune largeur nouvelle** : le `max-width` passe de la racine de section sur
  `.formulaire-recolte .conteneur` et `.profil-producteur .conteneur`, avec le rythme vertical `--espace-5` ; la
  règle de racine est supprimée, comme sur les six écrans déjà refaits. `margin-inline: auto` **n'a pas été
  ajouté** — le global `.conteneur` porte déjà `margin: 0 auto`, et la règle du composant (spécificité 0,2,0)
  l'emporte sur la globale (0,1,0) pour `max-width`. Conséquence à connaître : `box-sizing: border-box` étant
  global, les 44rem incluent désormais les gouttières, la colonne utile vaut donc 44rem moins 2 × `--espace-4`
  (mobile) ou 2 × `--espace-5` (≥ tablette).
- **Rien d'autre ne change** : `--espace-4` des groupes, légendes, cartes, `.champ`, `__rangee` en deux colonnes
  sous `$point-tablette`, `__note`, tailles de boutons, ainsi que tous les ids, classes et `aria-describedby`
  assertés (les 7 champs du profil, ceux de la récolte, `#formulaire-soumettre`, `#profil-soumettre`,
  `#erreur-reessayer`, `#profil-reessayer`) sont inchangés. Aucun token, aucune teinte, aucun rayon, aucune
  police nouveaux ; `styles/_composants.scss`, les `.ts`, services, routes et guards non touchés.
- **États conservés** : `.etat[aria-busy]` de chargement, écran « Récolte introuvable », message d'accès refusé,
  bannière d'erreur avec son bouton « Réessayer » et bannière `erreurGenerale()` restent des bannières (§39.2)
  et sont rendus dans la même colonne que le formulaire.
- **Tests** : le filet de structure a été écrit **avant** le restylage, sur le gabarit alors non modifié —
  `formulaire-recolte.spec.ts` 23 → 26 et `profil-producteur.spec.ts` 31 → 34 (`h1` unique et son libellé,
  `<form>` unique, chargement / erreur / formulaire dans le même parent), exécuté vert **60/60** avant tout
  changement de gabarit. Après le restylage, un test de conteneur par écran (26 → 27, 34 → 35 ; **62/62**)
  vérifie que le `.conteneur` est **unique**, enfant direct de la `<section>`, et qu'il porte à la fois le `h1`,
  l'état de chargement et le formulaire. **Aucune assertion existante n'a été modifiée, supprimée ni assouplie.**
- **Non observé en navigateur réel** : les quatre largeurs 375 / 768 / 1024 / 1366, et le centrage effectif du
  plafond — jsdom ne rend pas la cascade SCSS.
