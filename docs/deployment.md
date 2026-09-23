# Déploiement du backoffice

Ce dépôt fournit l’application et le paquet npm `@sachahjkl/backoffice`.
La CI vérifie la compilation, les tests, le lint, le formatage et le contenu du paquet.
Elle ne publie aucun paquet npm et ne déploie aucune instance.

## Migration de l’instance réelle

L’instance réelle doit utiliser `https://backoffice.froment.software`.
`application.yaml` définit son job Nomad `backoffice` dans l’espace `production`.
Le volume `backoffice-production-data` est distinct du volume de l’ancien job `froment-software`.
L’ancien site vitrine conserve `froment.software` et son déploiement séparé.

1. Vérifiez les migrations appliquées à la base et celles incluses dans la nouvelle image.
2. Vérifiez en staging la vitrine indépendante de la base métier et des workers du backoffice.
3. Promouvez cette vitrine en production. Attendez l’arrêt de l’ancienne allocation avant de copier sa base.
4. Créez une sauvegarde cohérente de la base arrêtée et vérifiez-la avec l’ancienne image.
5. Restaurez la base sur le nouveau volume et copiez les secrets de production dans `nomad/jobs/backoffice`.
6. Lancez `deploy-production.yml` depuis `master`. Il vérifie le code et publie son image OCI dans GHCR.
7. Attendez la fin du workflow. Il déploie le digest publié dans l’espace Nomad `production`.
8. Le job `prepare` exige une base existante et sauvegarde la base avant les migrations.
9. Vérifiez `/api/health`, la connexion, les documents, les intégrations et les deux domaines.

Lisez [Sauvegarde et restauration](backups.md) avant de transférer les données.
Le démarrage du paquet applicatif applique les migrations avant de servir les requêtes.
Conservez une copie vérifiée avant cette opération.
La CI valide le contrat et le rendu du job Nomad. Le déploiement effectif reste une opération distincte.

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
