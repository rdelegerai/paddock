# Souvenir de Paddock

MVP pour créer une vidéo souvenir de pilote de compétition automobile historique.

## Architecture

- Frontend statique : `index.html`, `styles.css`, `app.js`.
- Backend : Supabase Database + Edge Functions.
- IA : OpenAI Responses API depuis `supabase/functions/generate-story`.
- Photos : Supabase Storage, bucket privé `pilot-photos`.

## Configuration Supabase

Projet actuel : `qmhubedesoidofqrvdux`

```bash
npx supabase link --project-ref qmhubedesoidofqrvdux
npx supabase db push
```

Secrets nécessaires :

```bash
npx supabase secrets set OPENAI_API_KEY=sk-...
npx supabase secrets set OPENAI_MODEL=gpt-4.1-mini
npx supabase secrets set OPENAI_STORY_MODEL=gpt-4.1-mini OPENAI_TEMPERATURE=0.6
```

Déploiement des fonctions :

```bash
npx supabase functions deploy generate-story
npx supabase functions deploy submit-project
npx supabase functions deploy upload-photo
npx supabase functions deploy research-driver
```

## Parcours utilisateur

1. Identifier le pilote.
2. Répondre aux 10 questions.
3. Ajouter les photos.
4. Choisir vidéo courte ou vidéo longue.
5. Générer et corriger le texte.
6. Valider le dossier.

La recherche web automatique n'est pas dans le parcours utilisateur du MVP. Elle pourra rester un outil admin plus tard.
Le paiement n'est pas encore branché : le prix est indicatif pour le test.

## État actuel

- Génération IA : active via `gpt-4.1-mini`, température `0.6`.
- Vidéo courte : cible 120 à 160 mots, environ 1 minute.
- Vidéo longue : cible 320 à 430 mots, environ 3 minutes.
- Sauvegarde dossier : prête dans `video_projects`.
- Upload photos : prêt via `upload-photo`, dans le bucket privé `pilot-photos`.
