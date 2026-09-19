# Intégration Chariow — Passerelle de Paiement SaaS ManuX

Ce document détaille l'architecture, la configuration et le fonctionnement du système de paiement par abonnement et licence pour **ManuX**, propulsé par **Chariow**.

---

## 1. Vue d'ensemble & Architecture

L'intégration repose sur un modèle sécurisé full-stack :
- Le **frontend React** n'a jamais accès aux clés secrètes Chariow ni à la clé `service_role` de Supabase.
- Le serveur Node/Express (`server.ts`) expose des routes d'API sécurisées :
  - `POST /api/payments/chariow/checkout` : initialise une session de paiement officielle avec validation de session Supabase.
  - `POST /api/webhooks/chariow` : écoute les événements de vente Chariow (Pulse), vérifie l'idempotence, met à jour le profil Supabase, active la licence et déclenche le cycle de 30 jours.
  - `GET /api/payments/status` : contrôle l'état des abonnements et exécute la vérification des expirations.

```
[Utilisateur Frontend]
       │
       ▼ (Clic "Souscrire Plan Créateur / Pro")
[POST /api/payments/chariow/checkout] (Auth Bearer Token Supabase)
       │
       ├─► Résout l'utilisateur et le Product ID officiel
       ├─► Appelle l'API Chariow ou forme l'URL sécurisée de paiement
       ▼
[Page de Paiement Chariow] (Client règle via Mobile Money / Carte)
       │
       ▼ (Confirmation de vente / Génération de licence)
[POST /api/webhooks/chariow] (Webhook Chariow Pulse)
       │
       ├─► Vérifie l'idempotence (provider_sale_id unique)
       ├─► Associe l'utilisateur ManuX (custom_metadata.manux_user_id ou email)
       ├─► Enregistre dans `payment_transactions` & `subscription_events`
       ├─► Met à jour `profiles` (subscription_plan='creator'|'pro', cycle 30j)
       └─► Stocke la clé de licence Chariow générée (`license_key`)
```

---

## 2. Mapping des Produits & Forfaits Officiels

Les forfaits sont strictement reliés aux Product IDs créés sur Chariow :

| Forfait ManuX | ID Produit Chariow | Prix Mensuel | Devise | URL Hébergée Chariow |
| :--- | :--- | :--- | :--- | :--- |
| **Plan Gratuit** | N/A | $0.00 | USD | Intégré à l'inscription |
| **Plan Créateur** | `prd_bqe0zdzi` | $2.50 | USD | `https://manux.mychariow.com/prd_bqe0zdzi` |
| **Plan Pro** | `prd_lsy7udh2` | $9.00 | USD | `https://manux.mychariow.com/prd_lsy7udh2` |

---

## 3. Variables d'Environnement Requises

Dans le fichier `.env` ou les paramètres de secrets :

```env
# Clé d'API Chariow officielle (Server-side uniquement)
CHARIOW_API_KEY="votrequi_commence_par_sk_..."

# Clé secrète Webhook Pulse Chariow (Optionnelle pour signature)
CHARIOW_WEBHOOK_SECRET="votre_secret_webhook"

# Clé Supabase Service Role (Server-side uniquement)
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
```

---

## 4. Configuration du Webhook Chariow (Pulse)

Dans votre tableau de bord Chariow :
1. Allez dans **Paramètres** → **Webhooks** (ou Pulse).
2. Ajoutez l'URL de votre webhook ManuX :
   ```
   https://manux.xttools.site/api/webhooks/chariow
   ```
3. Cochez les événements : `successful_sale`, `sale.completed`, `order.paid`.
4. Enregistrez.

---

## 5. Gestion du Cycle de 30 Jours & Compte à Rebours

1. **Activation :** Dès réception du webhook pour une vente réussie, `subscription_started_at` est initialisé à `NOW()` et `subscription_expires_at` à `NOW() + INTERVAL '30 days'`.
2. **Avertissement :** Quand `daysRemaining <= 5`, le dashboard affiche une alerte ambrée invitant le créateur à renouveler sa formule.
3. **Expiration & Déclassement :** Si le compte arrive à 0 jour et que `subscription_expires_at < NOW()`, la fonction SQL `check_subscription_expirations()` ou le serveur remet automatiquement le compte au `Plan Gratuit`.
4. **Idempotence :** La table `payment_transactions` possède une contrainte `UNIQUE(provider, provider_sale_id)` évitant tout double traitement d'un même webhook.

---

## 6. Migration SQL

Pour appliquer les tables et fonctions nécessaires dans Supabase SQL Editor :
Exécutez le script complet présent dans :
- `/supabase_migration.sql` ou `/supabase/migrations/20260917_chariow_payments.sql`
