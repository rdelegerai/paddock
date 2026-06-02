# Documentation Souvenir de Paddock

Dernière mise à jour : 31 mai 2026.

Ce document remplace les anciens fichiers dispersés à la racine du projet :

- `README.md`
- `PLAN_COMMERCIAL_PREMIERE_VENTE.md`
- `Nouveau Document texte.txt`

Objectif : garder une documentation courte, à jour et utile pour piloter le projet.

## Résumé du projet

Souvenir de Paddock est un service de vidéo souvenir pour pilotes de compétition automobile historique.

Le client fournit :

- le nom du pilote ;
- quelques informations sur son parcours ;
- des photos ;
- des souvenirs ou une biographie déjà écrite si elle existe.

Le service transforme ces éléments en texte de voix off, puis en vidéo courte et personnelle.

Le client n'achète pas une application ni une IA. Il achète un résultat fini : une vidéo souvenir.

## État actuel de l'offre

Offre affichée sur la landing page :

- vidéo courte ;
- environ 1 minute ;
- prix : 90 euros ;
- photos transformées en séquences vidéo ;
- montage final réalisé à la main.

Les anciennes idées de deux offres à 79 euros et 149 euros ne sont plus à jour. Elles sont remplacées par une offre unique à 90 euros, plus simple à comprendre.

## Cible prioritaire

La cible de départ n'est pas le grand public.

Priorité :

1. Clubs automobiles historiques.
2. Présidents, secrétaires ou responsables de clubs.
3. Pilotes ou anciens pilotes membres de ces clubs.
4. Familles de pilotes, via le bouche-à-oreille.

Pourquoi commencer par les clubs :

- ils regroupent directement les bonnes personnes ;
- ils connaissent les anciens pilotes ;
- ils peuvent relayer le service ;
- ils donnent de la crédibilité ;
- ils sont joignables par email sans présence terrain lourde.

## Message commercial

Message simple à garder :

> Je réalise des vidéos souvenir personnalisées pour anciens pilotes, à partir de leurs photos, de leur histoire et d'informations retrouvées en ligne.

Angle à privilégier :

- artisanal ;
- personnel ;
- sobre ;
- humain ;
- orienté souvenir familial ou souvenir de club.

À éviter :

- vendre le projet comme une application ;
- trop parler d'IA ;
- présenter l'offre comme un test au rabais ;
- ajouter trop d'options au départ.

## Première vente

Plan simple :

1. Finaliser la landing page et la vidéo exemple.
2. Préparer une liste de 50 clubs.
3. Envoyer 30 à 50 emails manuels par semaine.
4. Relancer une fois après 7 à 10 jours.
5. Envoyer les personnes intéressées vers la landing page.
6. Réaliser la première vidéo de manière très manuelle.
7. Demander un retour client et, si possible, l'autorisation de montrer un extrait.

Indicateur positif :

- au moins une vente après 50 à 100 contacts bien ciblés ;
- client satisfait ;
- production supportable à faire le soir ;
- offre comprise sans longue explication.

Signal négatif :

- aucune réponse après 100 contacts bien ciblés ;
- compliments sans paiement ;
- production trop longue ou pénible ;
- besoin de trop d'appels ou d'allers-retours.

## Email type aux clubs

```text
Bonjour,

Je crée Souvenir de Paddock, un service de vidéo souvenir pour anciens pilotes de rallye, circuit, karting ou VHC.

L'idée est simple : à partir de photos, de quelques souvenirs et d'informations retrouvées en ligne, je réalise une courte vidéo de la carrière du pilote.

Voici un exemple :
[lien vidéo]

Je pense que cela peut intéresser certains membres de votre club, ou leurs familles, notamment pour un anniversaire, une fête de club ou un souvenir familial.

Si vous le souhaitez, je peux vous envoyer le lien de présentation à partager à vos adhérents.

Bien cordialement,
Romain

PS : si ce message ne vous concerne pas, dites-le moi simplement et je ne vous recontacterai pas.
```

## Canaux à tester

Canal principal :

- emails directs aux clubs VHC, VHRS, rallye historique, Formule Ford historique, karting historique, ASA et clubs de voitures anciennes avec activité compétition.

Canaux secondaires :

- petite annonce LVA avec petit budget seulement ;
- SEO simple, utile à long terme mais pas prioritaire pour la première vente.

SEO veut dire : optimiser le site pour que Google comprenne les pages et les affiche quand quelqu'un cherche ce type de service.

Idées de requêtes SEO :

- vidéo souvenir pilote automobile ;
- cadeau ancien pilote rallye ;
- vidéo hommage pilote VHC ;
- film carrière pilote karting ;
- vidéo souvenir voiture ancienne compétition.

## Formulaire actuel

Le formulaire de la landing page demande actuellement :

- nom du pilote ;
- année de naissance si connue ;
- discipline principale ;
- années de pratique si connues ;
- ville, région ou club ;
- email ;
- début de l'histoire de pilote ;
- voitures, circuits, rallyes ou lieux importants ;
- plus beau souvenir de course ;
- difficulté ou anecdote importante ;
- personnes à remercier ou citer ;
- message final ;
- biographie, notes libres ou fichier texte ;
- photos.

Note révisée depuis l'ancien fichier texte :

- auto, moto, kart, moderne ou historique restent des pistes possibles ;
- pour le MVP actuel, la page est centrée sur l'automobile historique et le karting ;
- élargir à la moto, au trial, au cross, au rallycross ou à la caisse à savon n'est pas prioritaire avant la première vente.

MVP veut dire : première version simple utilisable, faite pour tester si l'idée intéresse vraiment des clients.

## Dossier vidéo landing page

Le dossier `video-landing-page` contient les éléments liés à la vidéo exemple de la page d'accueil.

Il est volontairement séparé de cette documentation générale.

À garder dedans :

- photos sources ;
- sélection de photos ;
- storyboard ;
- texte de voix off ;
- prompts image-to-video ;
- plans de montage ;
- fichiers de contrôle.

## État technique utile

Architecture actuelle :

- frontend statique : `index.html`, `styles.css`, `app.js` ;
- backend : Supabase Database et Supabase Edge Functions ;
- IA : OpenAI Responses API depuis `supabase/functions/generate-story` ;
- photos : Supabase Storage, bucket privé `pilot-photos`.

Supabase est le service qui gère la base de données, le stockage des photos et les petites fonctions serveur.

Projet Supabase actuel :

```bash
npx supabase link --project-ref qmhubedesoidofqrvdux
```

Fonctions Supabase utilisées :

```bash
npx supabase functions deploy generate-story
npx supabase functions deploy submit-project
npx supabase functions deploy upload-photo
npx supabase functions deploy research-driver
```

État actuel :

- génération IA active via `gpt-4.1-mini` ;
- vidéo courte ciblée à 120 à 160 mots ;
- sauvegarde dossier prête dans `video_projects` ;
- upload photos prêt via `upload-photo` ;
- paiement non branché.

## Priorité immédiate

1. Finaliser la vidéo exemple de landing page.
2. Vérifier que la landing page montre bien l'offre unique à 90 euros.
3. Préparer une liste de 50 clubs.
4. Envoyer les 30 premiers emails.
5. Mesurer les réponses avant d'ajouter des options ou de modifier le produit.
