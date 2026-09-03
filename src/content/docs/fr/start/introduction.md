---
title: Introduction
description: Ce que fait RestoreLab, et pourquoi vérifier une sauvegarde ne suffit pas.
sidebar:
  order: 1
---

RestoreLab restaure automatiquement vos sauvegardes dans des environnements
isolés, démarre les charges de travail, valide les services, mesure votre temps
de reprise réel, et nettoie tout derrière lui.

```text
La vérification de sauvegarde dit :    RestoreLab dit :

  ✓ La sauvegarde existe                 ✓ VM restaurée
  ✓ La somme de contrôle est valide      ✓ OS démarré
                                         ✓ PostgreSQL démarré
                                         ✓ API répondant HTTP 200
                                         ✓ Reprise effectuée en 2m06
```

Une sauvegarde qui se restaure n’est pas la même chose qu’un service qui
revient. La VM démarre mais PostgreSQL ne se lance pas. La base démarre mais le
schéma est incohérent. L’API répond mais Redis n’a jamais été restauré. La
reprise prend 45 minutes pour un RTO de 15 minutes. RestoreLab éprouve toute la
chaîne, périodiquement, et le prouve.

## La chaîne

```text
La sauvegarde existe → disponible → la restauration réussit → l’invité démarre
    → l’OS est joignable → les services démarrent → l’application répond
    → les dépendances sont utilisables → RTO mesuré
```

Chaque exercice de restauration s’exécute contre une charge de travail
temporaire sur un réseau isolé, jamais contre la production, et chaque ressource
temporaire créée par RestoreLab porte une métadonnée de propriété, pour que le
nettoyage ne puisse jamais toucher ce qu’il n’a pas créé.

Cette sûreté n’est pas une note de bas de page : c’est ce qui rend l’outil
exécutable contre un cluster auquel vous tenez.

- **Isolé par défaut** : les restaurations arrivent sur un bridge dédié sans
  lien montant, la configuration réseau héritée de la sauvegarde est réécrite,
  et une exécution est refusée quand l’isolation ne peut pas être vérifiée.
- **Ne touche jamais la production** : chaque ressource temporaire est créée par
  RestoreLab avec la métadonnée `restorelab_managed=true`, et la suppression
  refuse toute charge de travail qui ne la porte pas.
- **Des identifiants temporaires seulement** : les restaurations vont dans une
  plage de VMID réservée (9000–9999 par défaut), jamais par-dessus une charge de
  travail existante.
- **Le nettoyage s’exécute toujours** : y compris après un échec, un dépassement
  de délai ou une annulation ; un nettoyage en échec est une alerte bruyante et
  nommée, jamais un orphelin silencieux.
- **Un exercice interrompu n’est jamais rejoué** : une exécution dont le worker
  est mort est marquée en échec et nettoyée, pas retentée. Un exercice est
  destructeur et non idempotent : le relancer restaurerait une seconde fois et
  laisserait la première charge de travail temporaire orpheline.
- **Aucun secret en clair** : les jetons d’API sont scellés en AES-256-GCM sous
  une clé maîtresse qui n’est jamais stockée dans le fichier de configuration.
- **Privilège minimal par défaut** : `connect` crée un compte de service
  cantonné à un pool de ressources dédié, parce qu’une installation sûre qui
  tient en une commande est celle que les gens déploient vraiment.

Le raisonnement complet, y compris le modèle de menace et ce contre quoi
RestoreLab ne protège pas, est dans le [modèle de
sécurité](/fr/reference/security/).

## État

Alpha, en développement actif. La chaîne d’exercices de restauration Proxmox
fonctionne de bout en bout derrière la CLI et a été éprouvée contre un vrai
cluster, l’historique des exercices est conservé automatiquement, les plans de
restauration vivent dans la base, et l’API HTTP sert cet historique autant
qu’elle déclenche de nouveaux exercices, via un worker qui vide une file
d’attente.

L’interface web est la priorité, et sa première moitié est là. Le tableau de
bord pilote l’outil dès aujourd’hui : il montre ce qui tourne, ce qui a tourné,
ce qui est protégé et si le cluster est correctement configuré, les phases d’un
exercice se remplissant en direct pendant qu’il se déroule. Il lance des
exercices, les annule, détruit ce qu’ils laissent derrière eux, et rédige le
catalogue de plans, le binaire lui-même validant chaque document à la frappe.

Un plan n’a plus besoin d’être lancé à la main. Un plan porteur d’un `schedule`
met ses propres exercices en file, et un créneau échu pendant que le serveur
était éteint est ignoré plutôt que rattrapé des heures plus tard. Voir [la
planification](/fr/guides/scheduling/).

:::caution[Deux choses n’ont jamais vu de vrai matériel]
La découverte **Proxmox Backup Server** et les **contrôles réseau** sont
implémentés et couverts par des tests unitaires, mais n’ont jamais été exécutés
contre une vraie infrastructure, parce que le cluster sur lequel tout ceci a été
construit n’a ni l’un ni l’autre. Les contrôles réseau ont besoin d’une route
vers le bridge isolé. Voir [isolation réseau](/fr/guides/network-isolation/).
Tout le reste a été piloté contre un cluster Proxmox VE 9 en service.
:::

| Domaine | État |
| --- | --- |
| Fournisseur Proxmox VE (restauration / durcissement / démarrage / statut / suppression) | livré |
| Découverte Proxmox Backup Server | livré, jamais exécuté contre un vrai PBS |
| Moteur de restauration (isolation, capacité, nettoyage, RTO, notation) | livré |
| Contrôles : ping, tcp, http/https, dns | livré, jamais exécuté contre un vrai bridge isolé |
| Contrôles dans l’invité via le QEMU guest agent (aucune route réseau nécessaire) | livré |
| CLI (`init`, `provider`, `workloads`, `backups`, `recovery`, `cleanup`) | livré |
| Rapports : terminal, JSON, HTML autonome | livré |
| Installation en une commande (`connect`) créant un compte de service au privilège minimal | livré |
| Diagnostics `doctor` et `network create` pour le bridge isolé | livré |
| Historique des exercices, SQLite par défaut, PostgreSQL en option (`runs`, `db`) | livré |
| API HTTP + authentification par jeton et portées (`serve`, `token`) | livré |
| Score de confiance de restauration, calculé depuis l’historique stocké | livré |
| Niveau de preuve : ce que chaque exercice a établi, et le plafond que ça met sur le score | livré |
| Déclenchement et annulation d’exercices via HTTP, worker, file d’attente, flux d’événements en direct | livré |
| Plans de restauration stockés en base, édités via HTTP ou avec `plan` | livré |
| Cookie de session navigateur, pour qu’un tableau de bord s’authentifie et lise le flux d’événements | livré |
| Tableau de bord web, servi par le binaire : vue d’ensemble, historique, exercice en direct, charges de travail, diagnostics | livré |
| Lancement et annulation d’exercices depuis le navigateur, et destruction de ce qu’ils laissent derrière eux | livré |
| Rédaction du catalogue de plans dans le navigateur, validé par le binaire à la frappe | livré |
| Installation initiale dans le navigateur, en remplacement des commandes d’installation | livré |
| Exercices planifiés : le cron d’un plan met ses propres exercices en file, sans personne | livré |
| Contrôles SSH / PostgreSQL / MySQL, notifications | en cours |
| Sondes distantes, RBAC, OIDC | prévu |

L’organisation des paquets derrière tout cela, et l’ordre dans lequel la feuille
de route est construite, sont dans la [référence
d’architecture](/fr/reference/architecture/).

## Ensuite

Lancez-le et connectez un cluster dans le [démarrage
rapide](/fr/start/quick-start/).

