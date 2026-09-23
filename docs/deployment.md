# Déploiement du backoffice

Ce dépôt fournit l’application et le paquet npm `@sachahjkl/backoffice`.
La CI vérifie la compilation, les tests, le lint, le formatage et le contenu du paquet.
Elle ne publie aucun paquet et ne déploie aucune instance.

## Migration de l’instance réelle

L’instance réelle doit utiliser `https://backoffice.froment.software`.
L’ancien site vitrine conserve `froment.software` et son déploiement séparé.
La configuration Nomad historique ciblait le domaine de la vitrine et a été supprimée de ce dépôt.

1. Sauvegardez la base actuelle avec l’outil de sauvegarde SQLite et vérifiez la copie.
2. Préparez un volume persistant et restaurez la base vers un nouveau fichier sur l’hôte cible.
3. Conservez les secrets de l’instance réelle, notamment les clés d’authentification et de chiffrement.
4. Configurez le routage HTTPS et `PUBLIC_ORIGIN=https://backoffice.froment.software`.
5. Définissez `APP_ENV=production`, `NODE_ENV=production` et `DATABASE_PATH` pour cette instance.
6. Configurez séparément les identifiants des intégrations et la politique de sauvegarde.
7. Démarrez le serveur avec la version correspondant aux migrations de la base.
8. Vérifiez `/api/health`, la connexion, les documents et les intégrations avant la bascule DNS.

Lisez [Sauvegarde et restauration](backups.md) avant de transférer les données.
Le démarrage du paquet applicatif applique les migrations avant de servir les requêtes.
Conservez une copie vérifiée avant cette opération.
Le déploiement du serveur et la bascule DNS restent des opérations distinctes des workflows GitHub de ce dépôt.

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
