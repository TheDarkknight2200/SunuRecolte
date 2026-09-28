// Configuration d'exécution de production.
// L'API est supposée servie sous la même origine que le frontend (proxy inverse) :
// URL relative, à adapter au déploiement réel. Voir ARCHITECTURE.md.
export const environment = {
  production: true,
  apiUrl: '/api',
};
