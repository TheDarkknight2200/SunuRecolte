# SUNURECOLTE — Règles de développement

## Avant de coder
1. Comprendre la tâche.
2. Lire CLAUDE.md.
3. Lire CONTEXTE.md.
4. Lire TASKS.md.
5. Vérifier le code existant.
6. Faire un plan court.
7. Implémenter.
8. Tester.

## Ne pas inventer
L'IA ne doit pas inventer :
- entité ;
- champ ;
- endpoint ;
- fonctionnalité ;
- règle métier ;
- intégration externe ;
- résultat de test.

Si une décision structurante manque, demander confirmation.

## Modifications
Faire des changements petits et vérifiables.
Éviter les refactorings massifs et les dépendances inutiles.

## Code
Préférer un code simple, lisible, cohérent et explicable à l'oral.

## API
REST, DTO, validation, codes HTTP cohérents, gestion centralisée des erreurs.

## Sécurité
- jamais de mot de passe en clair ;
- jamais de secrets dans Git ;
- permissions vérifiées côté backend ;
- validation côté backend ;
- un utilisateur ne doit pas pouvoir modifier les données d'un autre.

## Git
Exemples de commits :
- feat(auth): add JWT login
- feat(recolte): add harvest CRUD
- feat(commande): add order workflow
- fix(auth): correct JWT validation

## Tests
Une fonctionnalité n'est terminée que si elle a été réellement testée.

Toujours indiquer :
- tests exécutés ;
- commandes utilisées ;
- résultat ;
- problèmes éventuels.

Ne jamais écrire « testé avec succès » sans avoir exécuté le test.

## Cohérence mémoire/code
Le mémoire doit décrire ce qui existe réellement.
Une fonctionnalité non réalisée ne doit pas être présentée comme réalisée.

## Fin de tâche
Répondre avec :
### Modifications
### Vérifications
### Suite
