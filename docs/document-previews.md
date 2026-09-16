# Aperçus PDF

Les aperçus de devis, factures et commandes portent un filigrane « PREVIEW » sur chaque page.
Le filigrane reste présent lorsque le fichier est ouvert ou enregistré depuis le navigateur.

Le titre intégré au PDF contient le type de document, sa référence et son intitulé.
Les devis et factures indiquent aussi leur version.
Une facture non numérotée porte la mention « brouillon » et son identifiant.

Le serveur fournit aussi un nom de fichier distinct avec `Content-Disposition: inline`.
Exemples :

- `preview-devis-DE-2026-000001-v2.pdf` ;
- `preview-facture-FA-2026-000001-v3.pdf` ;
- `preview-commande-CO-2026-000001.pdf`.

Lorsqu’il est ouvert ou téléchargé, le fichier porte un nom distinct.
Ce nom identifie l’aperçu au lieu du dernier segment `/preview` de l’URL.

Les aperçus appliquent la [mise en forme et l’emplacement des conditions](document-conditions.md) enregistrés dans la version.

## Affichage dans le navigateur

L’application rend l’aperçu dans une surface intégrée avec `pdf.js`.

Elle ne dépend pas du lecteur PDF du navigateur.

Un poste qui télécharge les PDF affiche donc quand même l’aperçu.

L’application télécharge les octets avec `HttpClient`, puis rend chaque page sur un canevas.

L’intercepteur HTTP renouvelle la session avant la lecture.

Le message d’erreur localisé remplace la réponse JSON de l’API.

Les boutons de zoom restent entre 50 % et 200 %.

Le fichier worker `pdf.worker.min.mjs` est publié sous `/pdfjs/`.

## Séparation des documents définitifs

Le serveur applique le filigrane uniquement aux routes d’aperçu.
Les routes de génération, de téléchargement et du portail client restent sans filigrane.
Un aperçu ne crée aucun document conservé et ne remplace aucun PDF existant.
Il ne modifie ni les versions enregistrées ni les documents signés.

## Vérification locale

Si le shell utilise des modèles Nix déjà construits, pointez les tests vers les modèles modifiés :

```sh
DOCUMENT_TEMPLATES_PATH="$PWD/packages/documents/templates" pnpm --recursive --if-present test
```

Les tests vérifient le titre, le filigrane sur chaque page et son absence dans les PDF définitifs.
