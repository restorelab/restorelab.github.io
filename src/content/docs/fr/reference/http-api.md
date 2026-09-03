---
title: API HTTP
description: Authentification et portées, le flux d’événements, et comment une écriture se produit réellement.
sidebar:
  order: 3
---

RestoreLab expose l’historique de ses exercices, l’état de votre parc, et les
exercices eux-mêmes en HTTP, sous `/api/v1`. Lire nécessite un jeton ;
déclencher, annuler et nettoyer nécessitent un jeton créé explicitement avec le
droit de le faire.

Cette page est le modèle derrière l’API. La référence point d’accès par point
d’accès se trouve dans la [référence d’API](/api/), générée depuis le [document
OpenAPI 3.1](/openapi.yaml).

:::note[La référence d’API reste en anglais]
Les pages sous `/api/` sont générées depuis le document OpenAPI par un greffon
qui n’a pas de support multilingue. Cette page-ci, le modèle, est traduite ; la
référence engendrée ne l’est pas.
:::

## Comment une écriture se produit réellement

Aucun gestionnaire de `internal/api` n’appelle une méthode de fournisseur qui
mute : `Restore`, `Start`, `Stop`, `Delete` ou `AllocateWorkloadID`. Cela reste
vrai maintenant que l’API peut déclencher un exercice, et ce n’est pas une
promesse tenue par relecture de code : le faux fournisseur contre lequel
s’exécutent les tests des gestionnaires fait échouer le test sur-le-champ si
l’une de ces méthodes est atteinte, et un second test cherche ces noms dans le
paquet en dehors des fichiers `_test.go`.

Ce que fait `POST /recovery-runs` à la place, c’est écrire une ligne. Un worker
(dans le même processus par défaut, ou sur une autre machine) revendique cette
ligne et exécute l’exercice à travers le même `recovery.Engine` que celui de la
CLI, avec toutes les protections que le moteur porte déjà. L’API et le worker ne
s’appellent jamais l’un l’autre ; ils partagent une base de données et rien
d’autre, et c’est ce qui fait de leur séparation un choix de déploiement plutôt
qu’une réécriture.

La seule exception est `POST /cleanup/{vmid}`, qui se termine bien par un
`Delete`. Il passe cet appel par `worker.Cleanup`, pour que le seul paquet
détenant une méthode de fournisseur qui mute reste celui qui porte les
protections et les tests qui les couvrent.

## Démarrer le serveur

```text
restorelab serve
restorelab serve --listen 127.0.0.1:9000
```

`serve` écoute sur `127.0.0.1:8080` par défaut. C’est délibéré : un RestoreLab
qui apparaîtrait sur toutes les interfaces dès que quelqu’un tape `serve` serait
une surprise, et les surprises sur des surfaces d’API sont la manière dont des
clusters finissent lisibles par des inconnus.

TLS n’est pas géré par RestoreLab. Placez devant lui un proxy inverse (nginx,
Caddy, ce que vous exploitez déjà) :

```nginx
server {
    listen 443 ssl;
    server_name restorelab.example.com;

    ssl_certificate     /etc/letsencrypt/live/restorelab.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/restorelab.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;

        # Nécessaire, pas cosmétique : la protection CSRF du tableau de bord
        # compare Origin à Host, donc un proxy qui réécrit Host transforme
        # chaque écriture en 403.
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Le tableau de bord a besoin de ce TLS. Un client porteur d’un jeton peut parler
à RestoreLab en clair sur un réseau de confiance ; un navigateur ne peut pas,
parce que le cookie de session est `Secure`. Voir
[déploiement](/fr/guides/deployment/).

Écouter sur autre chose que la boucle locale exige au moins un jeton d’API
vivant. Sans lui, `serve` refuse de démarrer plutôt que d’exposer une API non
authentifiée :

```text
$ restorelab serve --listen 0.0.0.0:8080
error: refusing to listen on 0.0.0.0:8080 with no API token: create one with `restorelab token create <name>`
```

`serve` ne le contrôle qu’une fois, au démarrage, en listant les jetons et en
comptant ceux qui sont vivants. Donc un serveur qui démarre avec un jeton et
dont ce jeton est révoqué plus tard continue de tourner ; rien ne recontrôle
l’écoute à chaque requête.

Par défaut, `serve` répond aux requêtes et exécute aussi les exercices que ces
requêtes mettent en file. Les deux moitiés ne se parlent jamais qu’à travers la
base de données, elles peuvent donc être séparées :

```text
restorelab serve --no-listen                        le worker seul
restorelab serve --no-worker --worker-elsewhere     l’API seule
```

`--no-worker` seul est refusé, et ce refus est le point important. Un serveur
qui accepte `POST /recovery-runs` sans personne pour vider la file répond `201
Created` à un appelant qui attendra ensuite indéfiniment : l’exécution est
réellement en file, la réponse est réellement correcte, et l’exercice n’aura
jamais lieu. Rien ne peut vérifier depuis l’intérieur du processus qu’un worker
existe ailleurs (un worker sur une autre machine ne laisse aucune trace avant de
revendiquer quelque chose), donc la conception honnête est de faire dire la
chose à l’exploitant plutôt que de la deviner.

## Portées

Un jeton détient un ou plusieurs niveaux d’accès :

| Portée | Ce qu’elle autorise |
| --- | --- |
| `read` | toutes les routes `GET`, y compris le flux d’événements en direct et le catalogue de plans |
| `operate` | `read`, plus le déclenchement d’un exercice, son annulation, et le nettoyage d’une charge de travail temporaire |
| `manage` | `read`, plus la création, la modification et la suppression des plans stockés |

`read` est la valeur par défaut et est impliquée par tout jeton, y compris un
jeton `operate` : un compte qui pourrait lancer un exercice mais pas le regarder
serait une chose étrange à remettre à quiconque.

**`operate` et `manage` ne s’impliquent pas l’une l’autre**, dans aucun sens, et
c’est toute la raison pour laquelle `manage` existe comme portée distincte
plutôt que comme marge supplémentaire dans `operate`. Déclencher un exercice et
décider ce qu’un exercice *est* sont deux pouvoirs différents. Un jeton remis à
un tableau de bord pour qu’il lance et annule n’a rien à faire à réécrire la
définition de ce qu’il lance, et un jeton donné à un travail d’intégration
continue pour qu’il fasse `plan apply` depuis un dépôt git n’a rien à faire à
restaurer des sauvegardes de lui-même. Un jeton peut détenir les deux ; il doit
le dire.

Une écriture tentée avec un jeton `read` est un **403, pas un 401** :

```json
{
  "type": "https://restorelab.dev/problems/insufficient-scope",
  "title": "This token may not do that",
  "status": 403,
  "detail": "this endpoint needs the \"operate\" scope; create a token with `restorelab token create <name> --operate`"
}
```

La distinction n’est pas de la pédanterie. Un 401 signifie « nous ne savons pas
qui vous êtes » et envoie l’appelant régénérer un jeton qui n’avait jamais rien
de cassé ; un 403 signifie « nous savons exactement qui vous êtes, et ceci n’est
pas à vous de le faire », ce qui est la seule réponse qui désigne le vrai
correctif. L’authentification s’exécute en premier, donc une requête anonyme
obtient bien son 401.

## La session navigateur

Un navigateur ne peut pas détenir un jeton porteur en sécurité, et `EventSource`
ne peut pas poser d’en-tête `Authorization` du tout. Le tableau de bord échange
donc un jeton contre un cookie de session, une fois, avec
`POST /api/v1/session`, et le navigateur le porte à partir de là.

Une session **nomme un jeton et ne porte rien qui lui soit propre**. Les portées
sont lues sur la ligne du jeton à chaque requête, jamais recopiées dans la
session, et c’est ce qui fait que `restorelab token revoke` ferme toute session
ouverte avec ce jeton à la requête suivante plutôt que dans douze heures. Un
cookie est une autre manière de présenter le même identifiant, jamais une
manière d’en détenir davantage.

Le cookie est préfixé `__Host-`, `HttpOnly`, `Secure`, `SameSite=Strict`,
`Path=/`, sans `Domain`, et `Max-Age=43200` : douze heures, absolues, jamais
prolongées. Une expiration glissante serait plus confortable, puisque personne
ne serait déconnecté au milieu d’un exercice, mais un onglet resté ouvert à
interroger une liste détiendrait alors une session indéfiniment, et celle-ci
peut détruire des machines. Douze heures couvrent une journée de travail ;
revenir demain, c’est se reconnecter.

Deux conséquences à connaître avant de déployer :

- **Le HTTP en clair est refusé hors boucle locale.** Parce que le cookie est
  toujours `Secure`, un navigateur sur `http://192.168.1.5:8080` ne stockerait
  rien : la connexion semblerait réussir, chaque requête ensuite serait anonyme,
  et aucune erreur nulle part ne l’expliquerait. La route refuse donc d’abord,
  avec un 400 qui nomme la cause. La boucle locale est exemptée, parce que les
  navigateurs traitent `localhost` comme une origine digne de confiance.
- **Chaque écriture authentifiée par cookie doit porter un `Origin`
  correspondant.** `SameSite=Strict` arrête un autre *site*, mais pas un
  sous-domaine frère, qui est le même site pour un cookie et une origine
  différente pour tout le reste. La référence est le `Host` de la requête elle-même : le tableau de bord est servi par ce même binaire, donc l’origine
  légitime est par construction celle qui vient d’être atteinte, et une valeur à
  configurer est une valeur qu’on peut se tromper à écrire. C’est pourquoi le
  proxy inverse ci-dessus doit transmettre le `Host` d’origine : un proxy qui le
  réécrit transforme chaque écriture du tableau de bord en 403. La protection ne
  s’applique jamais à une requête porteuse de jeton, et `GET`, `HEAD` et
  `OPTIONS` sont exemptées quel que soit l’identifiant.

## La référence des points d’accès

Chaque route, ses paramètres, ses schémas de requête et de réponse, et la portée
qu’elle exige sont dans la [référence d’API](/api/). Le contrat lui-même est
publié comme [`/openapi.yaml`](/openapi.yaml), pour qu’un client puisse en être
généré.

