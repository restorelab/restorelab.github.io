---
title: Votre premier exercice
description: Un exercice de restauration commenté phase par phase, de la découverte de la sauvegarde au nettoyage.
sidebar:
  order: 3
---

Un exercice restaure la dernière sauvegarde d’une charge de travail dans un
environnement isolé, la démarre, exécute les contrôles demandés, mesure le temps
de reprise, puis détruit la charge temporaire. Rien n’est touché sur la charge de
travail de production.

```bash
bin/restorelab recovery test 101
```

Sans `--check`, un contrôle TCP sur le port 22 est utilisé : il prouve que
l’invité a démarré, a configuré son réseau, et a lancé un service.

```text
[✓] Connected to Proxmox
[✓] VM 101 found
[✓] Backup found
[✓] Restore started
[✓] Temporary VM created
[✓] VM booted
[✓] TCP/22 reachable
[✓] VM removed

Recovery successful
RTO: 2m17s
```

## Ce qui se passe, phase par phase

Le moteur est une machine à états linéaire avec une garantie : à partir du
moment où une charge de travail temporaire pourrait exister, le nettoyage
s’exécute — en cas de succès, d’échec, de dépassement de délai, d’annulation ou
de panique.

```text
QUEUED
  ↓ discover_backup        résout la plus récente ou une précise, applique max_age
DISCOVERING_BACKUP
  ↓ prepare_environment    vérifie l’isolation et la capacité, alloue un ID temporaire
PREPARING_ENVIRONMENT
  ↓ restore                crée la charge temporaire, attend la tâche,
RESTORING                    puis la durcit (réécriture réseau, limites, métadonnées)
  ↓ start
STARTING
  ↓ wait_for_guest         interroge le statut jusqu’à démarré et adressable
WAITING_FOR_GUEST
  ↓ run_checks             ping / tcp / http / dns, avec réessais
RUNNING_CHECKS
  ↓ generate_report
GENERATING_REPORT
  ↓ cleanup                arrêt + suppression, sur un contexte détaché
CLEANING_UP
  ↓
SUCCESS | DEGRADED | FAILED | CLEANUP_FAILED
```

Ligne par ligne, en regard de la sortie ci-dessus :

**`Connected to Proxmox`** — le fournisseur avec lequel RestoreLab a été
configuré a répondu. Si plusieurs sont configurés, `--provider` en désigne un.

**`VM 101 found`** — l’identifiant de charge de travail que vous avez passé
correspond à une charge réelle sur le cluster. C’est la VM de production, et
elle est lue, jamais écrite.

**`Backup found`** — `discover_backup`. Le point de restauration le plus récent
est résolu, et son âge est contrôlé face au `max_age` du plan. Une sauvegarde
plus ancienne que ce que le plan autorise fait échouer l’exécution ici, avant
que rien ne soit créé — et c’est bien l’intention : un exercice qui restaurerait
en silence un instantané de trois semaines rapporterait une reprise dont
personne ne pourrait réellement se servir.

**`Restore started`** — `prepare_environment` a déjà été exécuté à ce stade.
L’isolation est vérifiée, la capacité est vérifiée, et un identifiant temporaire
est alloué depuis la plage réservée, `9000–9999` par défaut. Une exécution est
refusée quand l’isolation ne peut pas être vérifiée ; voir [isolation
réseau](/fr/guides/network-isolation/).

**`Temporary VM created`** — `restore` a terminé, et la charge de travail
temporaire a été durcie : la configuration réseau héritée de la sauvegarde est
réécrite sur le bridge isolé, les limites de CPU et de mémoire sont appliquées,
et la métadonnée `restorelab_managed=true` est apposée. C’est cette métadonnée
qui permet à la suppression de refuser tout ce que RestoreLab n’a pas créé.

**`VM booted`** — `start`, puis `wait_for_guest` : le statut est interrogé
jusqu’à ce que la charge de travail soit démarrée et adressable.

**`TCP/22 reachable`** — `run_checks`. Chaque contrôle est réessayé selon son
propre rythme avant d’être déclaré en échec, parce qu’un service qui a besoin de
onze secondes pour s’attacher à son port est un service qui est revenu.

**`VM removed`** — `cleanup`. Arrêt, puis suppression, sur un contexte détaché,
pour qu’une exécution annulée ou expirée nettoie quand même derrière elle. Un
nettoyage qui échoue règle l’exécution en `CLEANUP_FAILED`, avec le nœud et
l’identifiant dans l’erreur : un orphelin bruyant plutôt qu’un orphelin
silencieux.

**`Recovery successful` / `RTO: 2m17s`** — le verdict. Le RTO est mesuré du
début de l’exécution à la fin des contrôles. Le nettoyage et la génération du
rapport sont exclus : c’est l’intendance de RestoreLab, pas une partie de la
reprise qu’une activité subirait.

## Comment un exercice est noté

| Verdict | Quand |
| --- | --- |
| `SUCCESS` | tous les contrôles critiques sont passés et la cible de RTO est tenue |
| `DEGRADED` | la reprise a eu lieu, mais un contrôle non critique a échoué ou la cible de RTO est dépassée |
| `FAILED` | une étape a échoué, ou un contrôle critique a échoué |

Un exercice est destructeur et non idempotent : rien n’est donc jamais rejoué.
Une exécution dont le worker est mort est réglée en échec et nettoyée, jamais
retentée — la relancer allouerait un second identifiant temporaire, restaurerait
une seconde fois, et laisserait la première charge de travail orpheline.

## Contrôler plus qu’un port

`--check` est répétable, et l’un des types de contrôle n’a besoin d’aucune route
vers le réseau isolé :

```bash
bin/restorelab recovery test 101 \
  --check 'cmd:systemctl is-active postgresql' \
  --check tcp:22 \
  --check 'http://{{ .ip }}:8080/health'
```

Un contrôle `cmd:` s’exécute à l’intérieur de l’invité restauré via le QEMU
guest agent : il n’a donc besoin d’aucune route réseau vers le réseau isolé de
restauration. L’interpréteur est choisi d’après l’OS de l’invité lui-même —
`cmd` sous Windows, `/bin/sh` ailleurs — de sorte que le même `--check`
fonctionne sur l’un comme sur l’autre.

Des drapeaux utiles le temps de prendre vos repères :

| Drapeau | Ce qu’il fait |
| --- | --- |
| `--dry-run` | résout la sauvegarde et valide le plan sans rien restaurer |
| `--keep` | conserve la charge de travail temporaire au lieu de la détruire (débogage) |
| `--report <path>` | écrit le rapport dans un fichier — `.json`, `.html` ou `.txt` selon l’extension |
| `--node`, `--storage`, `--pool`, `--network` | forcent l’endroit où la restauration atterrit |

## Après l’exercice

Chaque exercice est enregistré. `restorelab runs list` montre les exercices
passés, du plus récent au plus ancien, et `restorelab runs show <run-id>` en
rejoue un intégralement — le même historique que lit le tableau de bord, et
celui depuis lequel le score de confiance de restauration est calculé.

Une fois la forme d’un exercice arrêtée, écrivez-la comme un plan de
restauration plutôt que de passer des drapeaux : voir [plans de
restauration](/fr/guides/recovery-plans/) pour le format de plan et tous les
types de contrôle.
