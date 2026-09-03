---
title: Démarrage rapide
description: Le lancer depuis un conteneur ou un fichier unique, connecter un cluster et lancer un exercice, depuis le navigateur ou depuis un terminal.
sidebar:
  order: 2
---

## Le lancer

```bash
docker run -p 8080:8080 -v restorelab:/home/restorelab/.restorelab \
  ghcr.io/restorelab/restorelab serve --listen 0.0.0.0:8080
```

Ou un binaire, depuis la [dernière
version](https://github.com/restorelab/restorelab/releases/latest) : un seul
fichier, aucun runtime, avec `SHA256SUMS` à côté :

```bash
curl -fsSL -O https://github.com/restorelab/restorelab/releases/latest/download/restorelab_v0.2.0_linux_amd64.tar.gz
tar xzf restorelab_v0.2.0_linux_amd64.tar.gz
./restorelab serve
```

Ou depuis les sources, ce qui demande Go 1.27+ et Node pour le tableau de bord :

```bash
make ui && go build -o bin/restorelab ./cmd/restorelab
bin/restorelab serve
```

C’est tout. Sans aucune configuration, `serve` démarre quand même et affiche une
adresse porteuse d’un jeton d’installation à usage unique :

```text
! RestoreLab is not configured yet.
  Open this address to set it up. The token is printed once, and used once:

      http://127.0.0.1:8080/setup?token=rls_...
```

Ouvrez-la et le navigateur demande l’adresse de votre cluster, le mot de passe
d’un administrateur, et le stockage sur lequel les exercices restaurent.
RestoreLab utilise ce mot de passe une seule fois, en mémoire, pour créer son
propre compte de service au privilège minimal, puis le jette. Seul le jeton
obtenu est conservé, scellé sous une clé maîtresse qu’il génère pour vous. Il
propose de créer le bridge isolé sur le même écran, en disant clairement
qu’aucune interface existante n’est touchée et que la configuration réseau du
nœud sera rechargée.

Quand il a terminé, le serveur se redémarre lui-même et la page où vous êtes
déjà ouvre votre session. Vous arrivez sur le tableau de bord, connecté, sans
repasser par le terminal.

Le jeton est affiché sur la console de la machine qui exécute le serveur, parce
que la personne qui installe est celle qui est assise devant. Il est dépensé par
la première requête qui **tente réellement de provisionner** : que cette
tentative réussisse ou échoue, parce qu’un jeton encore vivant après un mauvais
mot de passe serait un secret affiché sur une console et valable jusqu’à la fin
du processus. Un formulaire auquel il manque un champ ne le coûte pas : faire
redémarrer tout le serveur pour une faute de frappe n’apporte rien. La page
d’installation cesse complètement d’exister dès qu’un cluster est connecté.

:::caution[Un binaire compilé sans la chaîne d’outils front-end n’a pas d’interface]
Il le dit, au lieu de répondre 404. C’est `make ui` qui compile le tableau de
bord dans le binaire.
:::

`serve` écoute sur `127.0.0.1:8080` par défaut, et le même processus exécute le
worker qui traite ce que le tableau de bord met en file. Les deux sont
délibérés ; voir [démarrer le
serveur](/fr/reference/http-api/#démarrer-le-serveur) pour les règles d’écoute
et pour placer un proxy inverse devant.

## La même chose depuis un terminal

Toutes les capacités restent en ligne de commande. C’est ce que l’automatisation
pilote :

```bash
# Connectez votre cluster. Même traitement du mot de passe, même compte de service.
bin/restorelab connect https://pve.example.com:8006 --storage local-zfs

# voir ce qui peut être éprouvé
bin/restorelab workloads list --backups

# lancer un exercice sur la VM 101, depuis sa dernière sauvegarde
bin/restorelab recovery test 101

# émettre un jeton pour le tableau de bord, puis servir
bin/restorelab token create dashboard --operate
bin/restorelab serve
```

Commencez en lecture seule si vous préférez regarder avant de toucher à quoi que
ce soit : `connect --read-only` produit un jeton qui ne peut ni créer ni
détruire, et qui suffit à la découverte et à `recovery test --dry-run`.

Un jeton émis avec `token create` est affiché exactement une fois ; seul son
SHA-256 est conservé. `--operate` lui permet de déclencher et d’annuler des
exercices, `--manage` lui permet d’écrire le catalogue de plans, et aucun des
deux n’implique l’autre. La [référence de l’API
HTTP](/fr/reference/http-api/) contient le reste.

## Ensuite

[Votre premier exercice](/fr/start/first-drill/) déroule `recovery test 101`
phase par phase, et explique ce que signifie chaque ligne de la sortie.

