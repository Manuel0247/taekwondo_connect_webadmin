@AGENTS.md

Tu dois développer l'espace d'administration    web admin  **LCC Taekwondo** (Ligue Communale de Cocody), une application de gestion d'une ligue de Taekwondo en Côte d'Ivoire.

L'API backend est déjà entièrement développée en **Laravel 12** et disponible à `http://localhost:8000/api/v1`. Chaque requête doit inclure `Accept: application/json`. L'authentification est via **Bearer Token** (Laravel Sanctum). Le fichier `API_REFERENCE.md` dans ce dossier contient la documentation complète de tous les endpoints.
Le logo de l'appli qui doit faire aussi partie du  se rouve dans le fichier  app
Dans ce projet implémente un design unique et propre et limites les dégradés inutiles 

- **admin** — gestion globale de la ligue

---

## 2. Charte graphique (extraite du logo officiel LCC)

```
Couleurs principales :
  Orange    #E8650A   — couleur primaire, CTA, icônes actives
  Vert      #1B7A3F   — couleur secondaire, succès, validation
  Noir      #0A0A0A   — background app, header, sidebar admin
  Blanc     #FFFFFF   — texte sur fond sombre, cartes

Couleurs secondaires :
  Orange clair   #F5A05C   — états hover/pressed sur orange
  Vert clair     #2EA55A   — états hover, badges actifs
  Gris foncé     #1C1C1E   — surface cards en dark mode
  Gris medium    #3A3A3C   — bordures, séparateurs
  Gris clair     #F2F2F7   — background sections light
  Texte secondaire #8E8E93  — sous-titres, métadonnées

Typographie :
  Mobile  → Inter (Google Fonts / Expo Font)
  Web     → Inter (next/font)
  Poids   : 400 (body), 600 (subtitle), 700 (title), 800 (hero)

Icônes :
  Mobile  → @expo/vector-icons (Ionicons)
  Web     → lucide-react

Radius de bordure :
  sm : 8px  |  md : 12px  |  lg : 16px  |  xl : 24px  |  full : 9999px
```
# LCC Taekwondo — Interface Admin Next.js

## 4. Interface Admin — Next.js

### Stack technique

```
Framework    : Next.js  (App Router)
UI           : Tailwind CSS + shadcn/ui (components)
HTTP         : Axios ou fetch natif avec Server/Client components
État         : TanStack Query v5 (client) + Server Actions (mutations)
Auth         : middleware Next.js + cookie httpOnly (token stocké)
Charts       : recharts
Tables       : @tanstack/react-table
Forms        : react-hook-form + zod
Icons        : lucide-react
Fonts        : next/font (Inter)
```

### Structure de dossiers

```
app/
├── (auth)/
│   └── login/page.tsx
├── (admin)/
│   ├── layout.tsx           // Sidebar + Header
│   ├── dashboard/page.tsx
│   ├── clubs/
│   │   ├── page.tsx         // Liste + validation
│   │   └── [id]/page.tsx
│   ├── athletes/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── events/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── courses/page.tsx
│   ├── techniques/
│   │   ├── page.tsx
│   │   └── new/page.tsx
│   ├── badges/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── rankings/page.tsx
│   ├── notifications/page.tsx
│   └── users/page.tsx
components/
├── admin/
│   ├── Sidebar.tsx
│   ├── TopBar.tsx
│   ├── StatsCard.tsx
│   ├── DataTable.tsx
│   ├── ClubStatusBadge.tsx
│   ├── ClubValidationModal.tsx
│   ├── GradeChip.tsx
│   ├── EventForm.tsx
│   ├── TechniqueForm.tsx
│   ├── BadgeForm.tsx
│   ├── BroadcastModal.tsx
│   └── ConfirmDialog.tsx
└── ui/                      // shadcn components (Button, Card, Dialog, etc.)
```

### Sidebar Admin

```
MENU :
  📊  Dashboard        /admin/dashboard
  🏢  Clubs            /admin/clubs         (badge: clubs en attente)
  👥  Athlètes         /admin/athletes
  🏆  Événements       /admin/events
  📚  Techniques       /admin/techniques
  🎖   Badges           /admin/badges
  📈  Classements      /admin/rankings
  🔔  Notifications    /admin/notifications
  👤  Utilisateurs     /admin/users

Style sidebar :
  Fond          : bg-[#0A0A0A]
  Texte actif   : text-[#E8650A] bg-[#E8650A]/10 border-l-2 border-[#E8650A]
  Texte inactif : text-[#8E8E93] hover:text-white hover:bg-white/5
```

### Pages Admin — Spécifications

#### `dashboard/page.tsx`
- 4 KPI cards en haut : Total Clubs, Total Athlètes, Événements ce mois, Cours actifs
- Graphique bar : inscriptions par mois (recharts)
- Graphique donut : répartition des grades
- Tableau "Clubs en attente de validation" avec boutons Valider/Refuser
- Tableau "Dernières inscriptions athlètes"

#### `clubs/page.tsx`
- Filtres : statut (tous/en_attente/valide/suspendu), ville
- `DataTable` : nom, ville, maître, nb_athlètes, statut badge, actions
- Actions inline : Valider ✓ | Refuser ✗ | Suspendre ⏸
- Modal de confirmation avec motif de refus

#### `events/page.tsx`
- Bouton "+ Créer un événement" → drawer latéral ou page /events/new
- `DataTable` : titre, type badge, date, places, statut, actions
- Actions : Publier | Annuler | Éditer | Voir inscriptions

#### `events/new/page.tsx`
- Formulaire complet avec react-hook-form + zod
- DateTimePicker pour date_debut et date_fin
- Champ adresse + carte Google Maps pour pointer la localisation
- Toggle pour `statut` (brouillon / publier immédiatement)

#### `techniques/page.tsx`
- Grille de cards avec filtre par discipline et niveau
- Bouton "+ Ajouter"
- Modal de création/édition : upload illustration + URL vidéo

#### `rankings/page.tsx`
- Tabs : Par grade | Par poids | Par âge
- Sélecteur de saison
- Tableau des classements avec position, points, athlète, club
- Bouton "Recalculer" → `POST /admin/rankings/recalculate`
- Bouton "+ Ajouter des points" → modal

#### `notifications/page.tsx`
- Formulaire broadcast : titre, message, type (select), segment
- Historique des derniers broadcasts envoyés

---

### Design system Admin

#### Variables CSS Tailwind (`tailwind.config.ts`)
```typescript
colors: {
  brand: {
    orange:        '#E8650A',
    'orange-light': '#F5A05C',
    green:         '#1B7A3F',
    'green-light':  '#2EA55A',
    black:         '#0A0A0A',
    surface:       '#1C1C1E',
    border:        '#3A3A3C',
    muted:         '#8E8E93',
  }
}
```

Personnaliser `components.json` :
```json
{ "style": "default", "baseColor": "neutral", "cssVariables": true }
```

Surcharger la variable CSS primaire :
```css
/* globals.css */
:root { --primary: 28 53% 37%; }   /* vert LCC */
.dark { --primary: 28 53% 37%; }
```

---

## 5. Gestion des états & patterns communs

### Chargement / erreur
```tsx
// Toujours utiliser ce pattern dans chaque screen
if (isLoading) return <Skeleton />;
if (isError) return <ErrorState onRetry={refetch} message={error.message} />;
if (!data?.length) return <EmptyState message="Aucun résultat" />;
```


```

### Toast / feedback
 couleurs LCC
- Web : shadcn `<Sonner />` (toast en bas à droite)
- Succès : fond vert `#1B7A3F`
- Erreur : fond rouge `#DC2626`

### Upload de fichiers
```typescript
// Toujours uploader via POST /uploads/image avant de sauvegarder la ressource
const upload = async (uri: string) => {
  const formData = new FormData();
  formData.append('file', { uri, type: 'image/jpeg', name: 'photo.jpg' } as any);
  const { data } = await api.post('/uploads/image', formData,
    { headers: { 'Content-Type': 'multipart/form-data' } });
  return data.data.url;
};
```
---





---

## 8. Variables d'environnement


### Admin (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---
