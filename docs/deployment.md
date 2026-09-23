# Déploiement du backoffice

Ce dépôt fournit l’application et le paquet npm `@sachahjkl/backoffice`.
La CI vérifie la compilation, les tests, le lint, le formatage et le contenu du paquet.
Elle ne publie aucun paquet et ne déploie aucune instance.

## Instances

Chaque instance installe une version publiée du paquet npm.
Son dépôt définit le domaine, le volume persistant, les secrets et le déploiement.
Définissez `ENTERPRISE_NAME` et `ENTERPRISE_LOGO_URL` dans la configuration de l’instance.
Le serveur lit ces valeurs si la base ne contient pas de marque personnalisée.

1. Sauvegardez la base actuelle et vérifiez la copie avec la version en service.
2. Arrêtez les anciens workers avant de transférer une base vers une autre instance.
3. Restaurez la base vers un volume distinct et protégez ses secrets.
4. Définissez `PUBLIC_ORIGIN`, `APP_ENV`, `NODE_ENV` et `DATABASE_PATH` dans l’instance.
5. Démarrez le serveur avec la version qui contient les migrations requises.
6. Vérifiez `/api/health`, la connexion, les documents et les intégrations.

Lisez [Sauvegarde et restauration](backups.md) avant de transférer les données.
Le démarrage du paquet applicatif applique les migrations avant de servir les requêtes.
Conservez une copie vérifiée avant cette opération.
Ce dépôt ne configure ni domaine, ni volume, ni job Nomad d’une instance.

## Démonstration

Placez la démonstration dans un dépôt séparé.
Donnez-lui sa propre CI, son propre domaine, sa base SQLite et ses secrets.
Ne connectez pas la démonstration au volume, aux jetons ou aux prestataires de l’instance réelle.
Configurez une politique d’indexation adaptée au domaine de démonstration.

## Publication npm

Le paquet applicatif se construit avec `pnpm build:app`.
Contrôlez son contenu avec `npm pack --dry-run ./packages/app`.
Le check Nix `npm-package` vérifie les fichiers requis, dont les migrations, les modèles de documents et les actifs web.
Configurez explicitement un trusted publisher npm lié à ce dépôt et à un workflow de publication avant toute publication automatique.
Aucun workflow de publication n’est actif dans ce dépôt.
