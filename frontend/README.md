# SunuRecolte — Frontend Angular

Interface web de SunuRecolte (Angular 21, composants standalone, SCSS, Reactive Forms).
L'API consommée est le backend Spring Boot du dépôt (`../sunurecolte-backend`, port 8080).

## Commandes

```bash
npm install     # dépendances
npm start       # serveur de développement : http://localhost:4200
npm test        # tests unitaires (Vitest, sans navigateur)
npm run build   # build de production dans dist/
```

Le backend doit être démarré (voir le `README.md` à la racine du dépôt). L'URL de l'API est
centralisée dans `src/environments/` — aucune URL n'est écrite en dur dans les services.

## Documentation

- `../FRONTEND_DESIGN.md` : identité visuelle, tokens et règles d'interface (fait autorité).
- `../ARCHITECTURE.md` : architecture générale et flux frontend.
- `../AGENTS.md` : règles de travail du dépôt.
