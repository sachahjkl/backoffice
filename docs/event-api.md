# API événementielle

## Objectif

L’API événementielle transmet des faits métier après leur validation définitive.
Elle complète l’API HTTP sans exposer le fonctionnement interne du serveur.

OpenAPI décrit la gestion des abonnements et des livraisons.
AsyncAPI décrit les événements et le protocole de livraison.

La première version publie uniquement `software.froment.invoice.issued.v1`.

## Architecture

Une transaction SQLite modifie les données métier et ajoute un événement dans `outbox_events`.
La transaction ne contient aucun appel réseau.

Après le commit, un worker Effect crée les livraisons destinées aux abonnements actifs.
Le worker envoie ensuite les webhooks et conserve chaque résultat dans SQLite.

Une file en mémoire peut accélérer le réveil du worker.
Elle ne remplace jamais l’outbox SQLite.

## Format CloudEvents

Les webhooks utilisent CloudEvents en mode JSON structuré.
La requête utilise `Content-Type: application/cloudevents+json`.

```json
{
  "specversion": "1.0",
  "id": "0199a2c1-7e62-7d90-a412-95e718be5142",
  "source": "urn:froment:installation:0199a2be-c821-7bf4-a6dc-046d83016574",
  "type": "software.froment.invoice.issued.v1",
  "subject": "invoice/01K6K5XFXJATJFD92RD6QFCW8B",
  "time": "2026-10-02T12:00:00.000Z",
  "datacontenttype": "application/json",
  "dataschema": "https://froment.software/events/schemas/software.froment.invoice.issued.v1.json",
  "correlationid": "0199a2bf-e17a-71f2-b7f4-35dd1aa0f398",
  "causationid": "0199a2c0-c82f-725c-b720-da4300040d47",
  "data": {
    "invoiceId": "01K6K5XFXJATJFD92RD6QFCW8B",
    "invoiceNumber": "F-2026-0042",
    "revisionId": "01K6K5YQZRNNM5688T2S1N4DDK",
    "version": 2,
    "currency": "EUR",
    "netTotalCents": 100000,
    "vatTotalCents": 20000,
    "totalCents": 120000
  }
}
```

`id`, `correlationid` et `causationid` utilisent des UUIDv7 en minuscules.
Les identifiants métier utilisent les ULID existants.

`source` contient l’UUID persistant de l’installation.
Un clone autonome doit régénérer cet UUID explicitement.

Le couple `(source, id)` identifie un événement CloudEvents.
Un consommateur utilise ce couple pour dédupliquer les messages.

`traceparent` et `tracestate` suivent le format W3C quand une trace existe.
Ils ne remplacent pas les identifiants de corrélation et de causalité.

## Noms et versions

Chaque type commence par le domaine inversé `software.froment`.
Le nom décrit un fait passé.

Une modification compatible conserve le suffixe `v1`.
Une modification incompatible crée un nouveau type, comme `software.froment.invoice.issued.v2`.

Un événement publié reste immuable.
Un rejeu conserve son identifiant, sa date, sa source et sa charge utile.

## Abonnements

Un abonnement contient une URL HTTPS et une liste de types exacts.
La première version n’accepte aucun wildcard.

Le serveur vérifie une nouvelle URL avant d’activer l’abonnement.
Une modification d’URL impose une nouvelle vérification.

La vérification refuse les redirections.
Elle refuse aussi les adresses loopback, privées et link-local par défaut.

`WEBHOOK_ALLOW_PRIVATE_DESTINATIONS=true` autorise ces adresses pour une installation autohébergée.
Cette option n’autorise pas HTTP en production.

## Permissions

L’API utilise quatre permissions dédiées :

- `webhook.subscription.read` consulte les abonnements.
- `webhook.subscription.manage` crée, modifie et désactive les abonnements.
- `webhook.delivery.read` consulte les tentatives et leurs erreurs.
- `webhook.delivery.replay` rejoue une livraison.

Le rôle administrateur intégré reçoit ces permissions.
Les jetons API ne peuvent pas les recevoir dans la première version.

## Secrets et signatures

`WEBHOOK_SIGNING_KEY` contient une clé maîtresse de 32 octets en base64url.
Le serveur dérive un secret distinct pour chaque abonnement.
SQLite ne conserve pas le secret dérivé.

L’API affiche le secret uniquement lors de la création ou de la rotation.
Une version de clé permet une rotation future de la clé maîtresse.

Le serveur signe l’horodatage et les octets exacts du corps avec HMAC-SHA256.

```text
Froment-Signature: t=1790932800,k=v1,v1=abcdef...
```

Le consommateur refuse une signature âgée de plus de cinq minutes.

## Livraison

La livraison garantit un traitement au moins une fois.
Elle ne garantit pas un traitement exactement une fois.

Chaque appel dispose de dix secondes.
Toute réponse `2xx` termine la livraison.

Une autre réponse ou une erreur réseau programme une nouvelle tentative.
Chaque livraison reçoit au plus dix tentatives avec backoff exponentiel et jitter.

Une livraison en attente bloque les événements suivants du même abonnement.
Un échec définitif libère ensuite la file de cet abonnement.

Le worker utilise un bail et un compteur de génération.
Une réponse tardive ne peut donc pas remplacer le résultat d’un worker plus récent.

## Historique, rejeu et rétention

L’API expose les abonnements, les livraisons et la dernière erreur limitée.
Elle ne conserve pas le corps d’une réponse distante.

Un rejeu crée une nouvelle livraison pour le même événement.
Il ne crée pas un nouvel événement métier.

Les événements terminés et leurs livraisons restent disponibles pendant 30 jours.
Le nettoyage conserve les événements qui ont encore une livraison active.

## Données et sécurité

La charge utile contient uniquement les données nécessaires au fait publié.
Elle ne contient aucun jeton, secret, document ou contenu d’audit.

Les montants utilisent des centimes entiers.
Les dates utilisent UTC et le format RFC 3339 avec des millisecondes.

Le client HTTP valide la destination pendant chaque connexion.
Cette validation empêche un changement DNS vers une adresse interdite.

Le client refuse les redirections et ne charge pas le corps des réponses.
Ces règles limitent les risques de SSRF et de consommation mémoire distante.

## Documentation et contrôles

Le serveur publie la spécification sur `/api/asyncapi.json`.
Il publie les schémas immuables sous `/api/events/schemas/`.

Les contrats Effect restent la source des messages.
Les checks valident les exemples AsyncAPI avec ces contrats.

Les tests couvrent la transaction, la reprise, l’ordre, la signature et la déduplication.
Ils couvrent aussi les permissions, le rejeu et la protection SSRF.
