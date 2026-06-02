# Finalisation avant mise en ligne

Dernière mise à jour : 2 juin 2026.

Objectif : suivre les dernières tâches avant de mettre Souvenir de Paddock en ligne et accepter les premières commandes.

## Décisions validées

- Prix de lancement : 79 euros.
- Vidéo : environ 1 minute.
- Délai annoncé : 7 jours calendaires maximum après paiement et réception des éléments complets.
- Email public : contact@souvenirdepaddock.com.
- Email interne : rdeleger.ai@gmail.com.
- Email client : à demander juste avant paiement, pas au début du questionnaire.
- Usage prévu de la vidéo : privé, familial ou dans le cadre du club.
- Droit à l'image : prévenir le client que toute diffusion publique relève de sa responsabilité.

## Clause droit à l'image retenue

> La vidéo est destinée à un usage privé, familial ou dans le cadre du club. Toute diffusion publique, notamment sur internet ou les réseaux sociaux, relève de la responsabilité du client, qui doit obtenir les autorisations nécessaires des personnes concernées.

Cette formulation évite de demander des autorisations excessives pour un usage privé, tout en couvrant la diffusion publique.

## Checklist technique

### 1. Formulaire avant paiement

- [x] Ajouter l'email client obligatoire juste avant paiement.
- [x] Ajouter une case d'acceptation des CGV.
- [x] Ajouter une case d'information sur le délai de 7 jours.
- [x] Ajouter une case d'information sur le droit à l'image.
- [x] Bloquer la validation si ces éléments ne sont pas remplis.

### 2. CGV et pages légales

- [x] Ajouter la clause droit à l'image retenue dans les CGV.
- [ ] Choisir un médiateur de la consommation.
- [ ] Remplacer la mention provisoire du médiateur dans les CGV.
- [ ] Ajouter l'hébergeur définitif quand le site sera en ligne.

### 3. Base de données Supabase

- [x] Ajouter le statut de paiement.
- [x] Ajouter l'ID de session Stripe.
- [x] Ajouter l'email client dans un champ dédié.
- [x] Ajouter la date de paiement.
- [x] Ajouter les dates d'acceptation des CGV, du délai et de l'information droit à l'image.
- [x] Ajouter un token privé pour ouvrir un dossier client/admin.
- [x] Adapter `submit-project` pour enregistrer ces informations.

### 4. Paiement Stripe

- [x] Créer ou vérifier le compte Stripe en mode test.
- [x] Créer une fonction Supabase `create-checkout-session`.
- [x] Rediriger le client vers Stripe Checkout après validation du dossier.
- [x] Créer une fonction webhook Stripe.
- [x] Après paiement confirmé par webhook, marquer le dossier comme payé.
- [x] Ajouter les variables serveur Supabase : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`.
- [x] Configurer dans Stripe le webhook vers `https://qmhubedesoidofqrvdux.supabase.co/functions/v1/stripe-webhook`.
- [x] Tester une commande complète avec une carte de test Stripe.

Variables à ajouter dans Supabase :

- `STRIPE_SECRET_KEY` : clé secrète Stripe, d'abord en mode test.
- `STRIPE_WEBHOOK_SECRET` : secret généré par Stripe après création du webhook.
- `SITE_URL` : adresse publique du site, par exemple `https://souvenirdepaddock.com` quand le domaine sera relié.

Webhook Stripe à créer :

- URL : `https://qmhubedesoidofqrvdux.supabase.co/functions/v1/stripe-webhook`
- Événement à écouter : `checkout.session.completed`

Test Stripe à faire avant mise en ligne :

- Utiliser le mode test Stripe.
- Passer une commande complète depuis le site.
- Vérifier que le client arrive sur Stripe Checkout.
- Payer avec une carte de test Stripe.
- Vérifier dans Supabase que le dossier passe en `payment_status = paid`.

Résultat du test du 1er juin 2026 :

- Commande test complète réalisée.
- Dossier `Henri Marchal` créé dans Supabase.
- Paiement Stripe test confirmé.
- Webhook Stripe reçu.
- Dossier passé en `payment_status = paid`.
- `paid_at` renseigné correctement.

### 5. Notification email

- [x] Choisir un service d'envoi email : Resend.
- [x] Ajouter l'envoi email dans le webhook Stripe après paiement confirmé.
- [x] Envoyer un email à rdeleger.ai@gmail.com après paiement confirmé.
- [x] Envoyer un email de confirmation au client après paiement confirmé.
- [x] Inclure dans l'email interne : ID dossier, nom du pilote, email client, texte final et nombre de photos.
- [x] Ajouter des champs de suivi pour éviter les doublons d'emails.
- [x] Ajouter les variables serveur Supabase : `RESEND_API_KEY`, `EMAIL_FROM`, `NOTIFICATION_EMAIL`, `REPLY_TO_EMAIL`.
- [x] Déployer la migration de suivi email.
- [x] Déployer la fonction `stripe-webhook`.
- [x] Tester une commande complète avec paiement Stripe test et vérifier les deux emails.
- [x] Corriger la signature de l'email client en production après redéploiement de `stripe-webhook`.
- [ ] Corriger ou adapter `SITE_URL` pour éviter le retour vers un serveur local arrêté.

Variables email à ajouter dans Supabase :

- `RESEND_API_KEY` : clé secrète Resend.
- `EMAIL_FROM` : adresse d'expédition validée dans Resend, par exemple `Souvenir de Paddock <commande@souvenirdepaddock.com>`.
- `NOTIFICATION_EMAIL` : email interne qui reçoit les commandes, actuellement `rdeleger.ai@gmail.com`.
- `REPLY_TO_EMAIL` : email de réponse pour les clients, actuellement `rdeleger.ai@gmail.com`.

### 6. Dossier admin

- [ ] Créer une page privée de consultation du dossier.
- [ ] Afficher les réponses, le texte final et les photos.
- [ ] Protéger l'accès par token privé.
- [ ] Générer des liens temporaires vers les photos stockées dans Supabase.

### 7. Mise en ligne

- [x] Acheter le nom de domaine.
- [x] Préparer la configuration Netlify.
- [x] Déployer le site statique sur Netlify.
- [x] Relier le domaine au site.
- [ ] Configurer Supabase production.
- [ ] Configurer Stripe production.
- [ ] Faire une commande test complète.

Configuration Netlify préparée :

- `netlify.toml` : indique à Netlify comment générer et publier le site.
- `tools/build-site.mjs` : génère le dossier `dist`.
- `dist` : dossier public à publier, avec seulement les fichiers visibles du site.

Important : le site public ne doit pas exposer les dossiers techniques `supabase`, `documentation`, `tools` ou `video-landing-page`.

Déploiement Netlify :

- URL Netlify de production : `https://souvenirdepaddock.netlify.app`.
- Déploiement réalisé depuis le dossier `dist`.
- Domaine relié dans Netlify : `souvenirdepaddock.com`.
- DNS Namecheap configurés :
  - `A Record` `@` vers `75.2.60.5`.
  - `CNAME` `www` vers `souvenirdepaddock.netlify.app`.
- Les enregistrements Resend visibles ont été conservés.

Email public :

- Redirection Namecheap configurée : `contact@souvenirdepaddock.com` vers `rdeleger.ai@gmail.com`.
- Email public remplacé dans la landing page, les CGV et la page confidentialité.
- Les réponses aux emails reçus par redirection partiront depuis Gmail tant qu'aucune boîte mail professionnelle n'est configurée.

## Prochaine tâche recommandée

Vérifier le domaine public et finaliser les mentions légales.

Pourquoi : le paiement, le webhook et les deux emails fonctionnent. Le site statique est déployé sur Netlify et les DNS Namecheap ont été configurés. Il faut attendre la propagation DNS, vérifier le domaine public, puis compléter les obligations légales.

Première action concrète :

1. Refaire une commande Stripe test complète depuis `https://souvenirdepaddock.com`.
2. Vérifier le retour après paiement sur le vrai domaine.
3. Vérifier les deux emails après paiement.
4. Choisir un médiateur de la consommation et remplacer la mention provisoire dans les CGV.

## Reprise prochaine session

Point de départ :

- Le site est déjà déployé sur Netlify : `https://souvenirdepaddock.netlify.app`.
- Le domaine `souvenirdepaddock.com` est acheté chez Namecheap et relié à Netlify côté DNS.
- `SITE_URL` est indiqué comme configuré dans Supabase avec `https://souvenirdepaddock.com`.
- Les emails automatiques fonctionnent : email interne et email client validés par test Stripe.
- L'email public `contact@souvenirdepaddock.com` redirige vers `rdeleger.ai@gmail.com`.

À faire en premier à la reprise :

1. Refaire une commande Stripe test complète depuis `https://souvenirdepaddock.com`.
2. Vérifier le retour après paiement sur le vrai domaine.
3. Vérifier les deux emails après paiement.
4. Compléter le médiateur dans les CGV.

DNS veut dire : réglages du nom de domaine. Cela dira à `souvenirdepaddock.com` d'afficher le site hébergé chez Netlify.

À ne pas oublier ensuite :

- Vérifier que `https://souvenirdepaddock.com` affiche bien la landing page.
- Refaire une commande Stripe test complète depuis le vrai domaine.
- Vérifier le retour après paiement sur le vrai domaine.
- Choisir le médiateur de la consommation et remplacer la mention provisoire dans les CGV.
- Configurer Stripe en mode production avant les vraies ventes.

## Dernières modifications avant mise à jour Netlify

Objectif : limiter les mises à jour Netlify gratuites en regroupant les dernières corrections avant un seul redéploiement.

Modifications préparées :

- Favicon SVG ajouté : `assets/favicon.svg`.
- Favicon relié à la landing page, aux CGV et à la page confidentialité.
- Footer mobile corrigé : email, confidentialité et CGV alignés à droite.
- Image héros mobile recadrée pour mieux afficher le visage du pilote.
- Dossier `dist` régénéré localement.

À tester avant le prochain déploiement Netlify :

- Ouvrir le site local ou le futur déploiement Netlify sur mobile.
- Vérifier que le visage du pilote est visible dans le héros mobile.
- Vérifier que le footer mobile est cohérent : contact, confidentialité et CGV à droite.
- Vérifier que le favicon apparaît dans l'onglet du navigateur.

GitHub :

- Dépôt distant : `https://github.com/rdelegerai/paddock.git`.
- Branche : `main`.
- Règle de travail retenue : après chaque série de modifications validées, commit et push sur GitHub.

## Avancement du 2 juin 2026

- Ancien `documentation/README.md` archivé car il indiquait encore 90 euros.
- Nouveau `documentation/README.md` réduit à un pointeur vers le document fiable.
- Code d'email ajouté dans `supabase/functions/stripe-webhook`.
- Email interne prévu pour recevoir les informations utiles à la préparation de la vidéo.
- Email client prévu pour confirmer la commande et le délai annoncé.
- Champs ajoutés en base : `owner_notified_at` et `customer_notified_at`.
- Domaine Resend vérifié : `souvenirdepaddock.com`.
- Secrets Resend indiqués comme ajoutés dans Supabase.
- Migration `20260602100000_add_email_notification_fields.sql` déployée sur Supabase.
- Fonction `stripe-webhook` redéployée sur Supabase, active en version 7.
- Test Stripe réel du 2 juin : paiement confirmé, email interne reçu et email client reçu.
- Anomalie constatée : retour après paiement vers `127.0.0.1:8080` avec serveur local non actif.
- Correction email client passée de `Romain` à `Renan`, fonction `stripe-webhook` redéployée en version 8.
- Secret Supabase `SITE_URL` indiqué comme mis à jour vers `https://souvenirdepaddock.com`.
- Configuration Netlify ajoutée et génération locale `dist` réussie.
- Redirection email `contact@souvenirdepaddock.com` vers `rdeleger.ai@gmail.com` indiquée comme fonctionnelle.
- Email public remplacé dans `index.html`, `cgv.html` et `confidentialite.html`.
- Site statique déployé sur Netlify : `https://souvenirdepaddock.netlify.app`.
- Domaine `souvenirdepaddock.com` ajouté dans Netlify.
- DNS Namecheap configurés pour Netlify : `@` vers `75.2.60.5`, `www` vers `souvenirdepaddock.netlify.app`.
- Domaine `souvenirdepaddock.com` affiche la landing page.
- HTTPS validé : `https://souvenirdepaddock.com` fonctionne.

## Avancement du 1er juin 2026 au soir

- Parcours de commande Supabase + Stripe validé en mode test.
- Paiement test complet réussi.
- Retour visuel après paiement corrigé.
- Parcours des 3 étapes amélioré : génération automatique du texte après questionnaire, scroll vers l'étape suivante, suppression du bouton inutile "Générer le texte".
- Raccourci créé sur le Bureau : `Rappel mouvement Paddock`.
- Le rappel mouvement est désactivé pour ce soir.
