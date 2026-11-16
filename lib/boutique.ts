// Boutique de la ligue : types et libellés partagés par les pages du webadmin.

export interface ProductCategory {
  id: string;
  nom: string;
  ordre: number;
  products_count?: number;
}

export interface Product {
  id: string;
  nom: string;
  description: string | null;
  prix: number;
  images: string[] | null;
  tailles: string[] | null;
  disponible: boolean;
  actif: boolean;
  category_id: string | null;
  category?: { id: string; nom: string } | null;
}

export type OrderStatut = "en_attente" | "confirmee" | "livree" | "annulee";

export interface OrderItem {
  id: string;
  product_id: string | null;
  nom_produit: string;
  image: string | null;
  taille: string | null;
  prix_unitaire: number;
  quantite: number;
  sous_total: number;
}

export interface Order {
  id: string;
  numero: string;
  statut: OrderStatut;
  total: number;
  telephone: string | null;
  commentaire: string | null;
  motif_annulation: string | null;
  created_at: string;
  confirmee_le: string | null;
  livree_le: string | null;
  annulee_le: string | null;
  items: OrderItem[];
  items_count?: number;
  user?: {
    id: string;
    nom: string;
    prenom: string;
    email: string | null;
    telephone: string | null;
    identifiant?: string | null;
    role?: string;
    athlete?: { club?: { id: string; nom: string } | null } | null;
    clubs?: { id: string; nom: string }[];
  };
}

export const ORDER_STATUS: Record<OrderStatut, { label: string; className: string }> = {
  en_attente: { label: "En attente", className: "bg-brand-orange/15 text-brand-orange border-brand-orange/30" },
  confirmee: { label: "Confirmée", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  livree: { label: "Livrée", className: "bg-brand-green/20 text-brand-green-light border-brand-green/40" },
  annulee: { label: "Annulée", className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export const formatFcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Message lisible depuis une erreur de l'API ({ error: { message, details } }). */
export function apiMessage(err: unknown, fallback = "Une erreur est survenue"): string {
  const e = (err as { response?: { data?: { error?: { message?: string; details?: Record<string, string[]> } } } })
    ?.response?.data?.error;
  const first = e?.details ? Object.values(e.details).flat()[0] : undefined;
  return first ?? e?.message ?? fallback;
}
