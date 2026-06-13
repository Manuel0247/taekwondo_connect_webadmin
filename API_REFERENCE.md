# LCC Taekwondo — API Reference

**Base URL :** `http://localhost:8000/api/v1`  
**Auth :** Bearer Token (Laravel Sanctum)  
**Content-Type :** `application/json`  
**Accept :** `application/json` ← **obligatoire dans chaque requête**

---

## Format de réponse universel

```json
// Succès
{ "success": true, "data": { ... }, "message": "..." }

// Succès paginé
{ "success": true, "data": [...], "message": "...",
  "pagination": { "page": 1, "limit": 20, "total": 45, "last_page": 3 } }

// Erreur
{ "success": false, "error": { "code": "SNAKE_CODE", "message": "...", "details": {} } }
```

**Codes d'erreur fréquents**

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHENTICATED` | 401 | Token absent ou invalide |
| `FORBIDDEN` | 403 | Rôle insuffisant |
| `NOT_FOUND` | 404 | Ressource introuvable |
| `VALIDATION_FAILED` | 422 | Données invalides (`details` contient les champs) |
| `INVALID_CREDENTIALS` | 401 | Email ou mot de passe incorrect |
| `INVITATION_EXPIRED` | 410 | Invitation expirée |

---

## 1. Authentification

### POST `/auth/register/athlete`
Crée un compte athlète.
```json
// Body
{ "nom": "Konan", "prenom": "Jean", "email": "jean@test.ci",
  "mot_de_passe": "Test@1234", "mot_de_passe_confirmation": "Test@1234" }

// 201
{ "data": { "user": {...}, "token": "1|abc..." } }
```

### POST `/auth/register/club`
Crée un compte maître de salle **et** son club (statut `en_attente`).
```json
// Body
{ "nom": "Yao", "prenom": "Franck", "email": "yao@test.ci",
  "mot_de_passe": "Test@1234", "mot_de_passe_confirmation": "Test@1234",
  "club_nom": "Club TKD Adjamé", "club_adresse": "23 Rue de la Victoire",
  "club_ville": "Abidjan", "club_code_postal": "07 BP 123" }

// 201
{ "data": { "user": {...}, "club": {...}, "token": "2|def..." } }
```

### POST `/auth/login`  *(throttle: 10/min)*
```json
// Body
{ "email": "jean@test.ci", "mot_de_passe": "Test@1234",
  "player_id": "onesignal-uuid" }   // player_id optionnel

// 200
{ "data": { "user": { "id":"uuid","nom":"...","role":"athlete" }, "token": "..." } }
```

### POST `/auth/logout`  🔒
Révoque le token courant. `data: null`

### POST `/auth/refresh`  🔒
Émet un nouveau token, révoque l'ancien.
```json
{ "data": { "token": "..." } }
```

### POST `/auth/invitation/accept`
Vérifie un token d'invitation.
```json
// Body
{ "token": "64-char-random-token" }

// 200
{ "data": { "email": "invite@ex.com", "club_id": "uuid", "invitation_id": "uuid" } }
```

---

## 2. Clubs

### GET `/clubs` — public
Paramètres query : `q`, `ville`, `discipline`, `prix_max`, `limit` (défaut 20)

### GET `/clubs/nearby` — public
Paramètres : `lat` *(requis)*, `lng` *(requis)*, `rayon` (km, défaut 25)

### GET `/clubs/search` — public
Alias de `/clubs` avec paramètre `q`.

### GET `/clubs/{uuid}` — public
Détails d'un club avec son maître de salle.

### GET `/clubs/pending` 🔒 `admin`
Liste des clubs en attente de validation.

### GET `/clubs/me` 🔒 `maitre_salle`
Mon club.

### PUT `/clubs/me` 🔒 `maitre_salle`
Modifier les infos du club (description, adresse, prix…).

### PUT `/clubs/me/logo` 🔒 `maitre_salle`
```json
{ "logo_url": "/storage/clubs/logo.png" }
```

### PUT `/clubs/me/photos` 🔒 `maitre_salle`
```json
{ "photos_urls": ["/storage/...", "/storage/..."] }
```

### PUT `/clubs/me/horaires` 🔒 `maitre_salle`
```json
{ "horaires": { "lundi": "17h-19h", "samedi": "09h-12h" } }
```

### PUT `/admin/clubs/{uuid}/validate` 🔒 `admin`
### PUT `/admin/clubs/{uuid}/reject` 🔒 `admin`
```json
{ "motif": "Documents insuffisants." }
```
### PUT `/admin/clubs/{uuid}/suspend` 🔒 `admin`

---

## 3. Athlètes

### GET `/athletes/me` 🔒 `athlete`
Mon profil athlète complet.

### PUT `/athletes/me` 🔒 `athlete`
Modifier date_naissance, sexe, categorie_poids.

### PUT `/athletes/me/photo` 🔒 `athlete`
```json
{ "photo_url": "/storage/photos/..." }
```

### PUT `/athletes/me/documents` 🔒 `athlete`
```json
{ "licence_url": "/storage/...", "certificat_medical_url": "/storage/..." }
```

### GET `/athletes/me/historique` 🔒 `athlete`
Historique des grades.

### GET `/athletes/me/badges` 🔒 `athlete`
Mes badges obtenus.

### GET `/athletes/me/classement` 🔒 `athlete`
Mes positions dans les classements.

### PUT `/athletes/me/club` 🔒 `athlete`
Rejoindre un club.
```json
{ "club_id": "uuid" }
```

### GET `/athletes/me/reservations` 🔒 `athlete`
Mes réservations de cours.

### GET `/clubs/me/athletes` 🔒 `maitre_salle`
Athlètes validés de mon club.

### GET `/clubs/me/athletes/pending` 🔒 `maitre_salle`
Demandes en attente.

### PUT `/clubs/me/athletes/{uuid}/validate` 🔒 `maitre_salle`
### PUT `/clubs/me/athletes/{uuid}/reject` 🔒 `maitre_salle`
### DELETE `/clubs/me/athletes/{uuid}` 🔒 `maitre_salle`

### PUT `/clubs/me/athletes/{uuid}/grade` 🔒 `maitre_salle`
```json
{ "grade": "vert" }
// grades : blanc | jaune | orange | vert | bleu | rouge | noir
```

### GET `/athletes/{uuid}` 🔒 `maitre_salle | admin`
### GET `/admin/athletes` 🔒 `admin`

---

## 4. Événements

### GET `/events` — public
Paramètres : `statut`, `type`, `limit`

### GET `/events/calendar` — public
Paramètres : `mois`, `annee`

### GET `/events/filter` — public
Paramètres : `type`, `statut`, `date_debut`, `date_fin`

### GET `/events/{uuid}` — public

### POST `/events` 🔒 `admin`
```json
{ "titre": "Championnat", "type": "competition",
  "adresse": "...", "latitude": 5.35, "longitude": -4.00,
  "date_debut": "2026-09-01 09:00:00", "date_fin": "2026-09-01 18:00:00",
  "places_total": 60, "statut": "brouillon",
  "date_limite_inscription": "2026-08-20 00:00:00" }
// types : competition | passage_grade | stage | cours_special
```

### PUT `/events/{uuid}` 🔒 `admin`
### DELETE `/events/{uuid}` 🔒 `admin`
### PUT `/events/{uuid}/publish` 🔒 `admin`
### PUT `/events/{uuid}/cancel` 🔒 `admin`

### GET `/events/{uuid}/inscriptions` 🔒 `admin | maitre_salle`

### POST `/events/{uuid}/inscriptions` 🔒 `maitre_salle`
Proposer des athlètes à un événement.
```json
{ "athlete_ids": ["uuid1", "uuid2"] }
```

### PUT `/events/{eId}/inscriptions/{iId}/confirm` 🔒 `admin`
### PUT `/events/{eId}/inscriptions/{iId}/reject` 🔒 `admin`
### DELETE `/events/{eId}/inscriptions/{iId}` 🔒 `admin | maitre_salle`

---

## 5. Cours

### GET `/clubs/{uuid}/courses` — public
Cours d'un club spécifique.

### GET `/clubs/me/courses` 🔒 `maitre_salle`
Mes cours.

### POST `/clubs/me/courses` 🔒 `maitre_salle`
```json
{ "titre": "Entraînement débutants", "niveau": "debutant",
  "date_debut": "2026-07-07 17:00:00", "date_fin": "2026-07-07 19:00:00",
  "places_total": 20, "est_recurrent": true,
  "recurrence": "hebdomadaire", "jours_recurrence": ["lundi", "mercredi"] }
// niveaux : debutant | intermediaire | avance | tous
// recurrence : quotidien | hebdomadaire | mensuel
```

### PUT `/clubs/me/courses/{uuid}` 🔒 `maitre_salle`
### DELETE `/clubs/me/courses/{uuid}` 🔒 `maitre_salle`
### PUT `/clubs/me/courses/{uuid}/cancel` 🔒 `maitre_salle`

### GET `/courses/{uuid}` 🔒 authentifié
### GET `/courses/{uuid}/reservations` 🔒 `maitre_salle`

### POST `/courses/{uuid}/reservations` 🔒 `athlete`
Réserver une place. Si complet → `liste_attente`.

### DELETE `/courses/{uuid}/reservations/me` 🔒 `athlete`
Annuler ma réservation.

---

## 6. Techniques

### GET `/techniques` — public
Paramètres : `discipline`, `niveau`, `type`, `limit`

### GET `/techniques/search` — public
Paramètre : `q`

### GET `/techniques/grouped` — public
Groupées par discipline et niveau.

### GET `/techniques/offline` — public
Techniques disponibles hors-ligne.

### GET `/techniques/{uuid}` — public

### POST `/techniques` 🔒 `admin`
```json
{ "nom_fr": "Coup de pied sauté", "nom_korean": "Twio chagi",
  "discipline": "taekwondo_sport", "niveau": "avance", "type": "coup_de_pied",
  "disponible_offline": true }
// disciplines : taekwondo_sport | taekwondo_traditionnel | poomsae | self_defense
// niveaux : debutant | intermediaire | avance
// types : coup_de_pied | coup_de_poing | blocage | deplacement | poomsae
```

### PUT `/techniques/{uuid}` 🔒 `admin`
### DELETE `/techniques/{uuid}` 🔒 `admin`

### POST `/techniques/{uuid}/favoris` 🔒 authentifié
### DELETE `/techniques/{uuid}/favoris` 🔒 authentifié

### GET `/users/me/favoris/techniques` 🔒 authentifié

---

## 7. Classements

### GET `/rankings` — public
Paramètres : `categorie` (poids|grade|age), `valeur`, `saison`

### GET `/rankings/club/{uuid}` — public
Classement d'un club.

### GET `/rankings/me` 🔒 `athlete`
Mes classements personnels.

### POST `/admin/rankings/recalculate` 🔒 `admin`
### PUT `/admin/rankings/athlete/{uuid}/points` 🔒 `admin`
```json
{ "points": 50, "categorie": "poids", "valeur_categorie": "-80kg", "saison": "2026" }
```

---

## 8. Badges

### GET `/badges` — public
### GET `/badges/{uuid}` — public

### POST `/badges` 🔒 `admin`
```json
{ "nom": "Champion", "description": "...", "type": "competition",
  "conditions": { "nb_events_min": 5 } }
// types : competition | grade | assiduite | anciennete | special
```

### PUT `/badges/{uuid}` 🔒 `admin`
### DELETE `/badges/{uuid}` 🔒 `admin`

### POST `/admin/badges/{uuid}/award` 🔒 `admin`
```json
{ "athlete_id": "uuid", "contexte": "Remis lors du championnat 2026" }
```

### DELETE `/admin/badges/{uuid}/revoke/{athleteId}` 🔒 `admin`
### GET `/admin/badges/{uuid}/athletes` 🔒 `admin`

---

## 9. Notifications & Préférences

### GET `/users/me/notifications` 🔒 authentifié
### PUT `/users/me/notifications/{uuid}/read` 🔒 authentifié

### PUT `/users/me/notifications/preferences` 🔒 authentifié
```json
{ "notif_cours": true, "notif_evenements": true, "notif_inscriptions": true,
  "notif_validations": true, "notif_badges": true,
  "rappel_j1": true, "rappel_h2": false }
```

### POST `/admin/notifications/broadcast` 🔒 `admin`
```json
{ "titre": "Annonce", "message": "Texte...", "type": "evenement",
  "segment": "All" }
```

---

## 10. Utilisateurs

### GET `/users/me` 🔒 authentifié
### PUT `/users/me` 🔒 authentifié
### PUT `/users/me/password` 🔒 authentifié
```json
{ "mot_de_passe_actuel": "...", "mot_de_passe": "...", "mot_de_passe_confirmation": "..." }
```
### DELETE `/users/me` 🔒 authentifié

### GET `/users` 🔒 `admin`
### DELETE `/users/{uuid}` 🔒 `admin`

---

## 11. Uploads

### GET `/uploads/config` 🔒 authentifié
Renvoie les limites (max_size, formats acceptés).

### POST `/uploads/image` 🔒 authentifié *(throttle: 5/min)*
```
multipart/form-data : file (image)
→ { "data": { "url": "/storage/uploads/image.jpg" } }
```

### POST `/uploads/document` 🔒 authentifié *(throttle: 5/min)*
```
multipart/form-data : file (pdf)
```

### POST `/uploads/video` 🔒 `admin` *(throttle: 5/min)*

### DELETE `/uploads/{path}` 🔒 authentifié

---

## 12. Devices (Push)

### POST `/devices/register` 🔒 authentifié
```json
{ "player_id": "onesignal-player-uuid", "platform": "android" }
```

---

## 13. Dashboard Admin

### GET `/admin/dashboard` 🔒 `admin`
Stats globales (users, clubs, events, courses).

### GET `/admin/dashboard/clubs` 🔒 `admin`
### GET `/admin/dashboard/athletes` 🔒 `admin`
### GET `/admin/dashboard/evenements` 🔒 `admin`
### GET `/admin/dashboard/activite` 🔒 `admin`
### GET `/admin/dashboard/export` 🔒 `admin`

---

## Comptes de test (après `php artisan migrate:fresh --seed`)

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@ligue-taekwondo.com | Admin@1234 | admin |
| franck.kouassi@lcc-tkd.ci | Maitre@1234 | maitre_salle |
| ibrahim.bamba@lcc-tkd.ci | Maitre@1234 | maitre_salle |
| jean.konan@gmail.com | Athlete@1234 | athlete |
| souleymane.ouattara@gmail.com | Athlete@1234 | athlete |
