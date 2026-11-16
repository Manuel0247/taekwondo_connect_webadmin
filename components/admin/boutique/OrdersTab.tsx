"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/admin/EmptyState";
import { ORDER_STATUS, formatDateTime, formatFcfa, type Order, type OrderStatut } from "@/lib/boutique";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const FILTRES: { value: OrderStatut | ""; label: string }[] = [
  { value: "en_attente", label: "En attente" },
  { value: "confirmee", label: "Confirmées" },
  { value: "livree", label: "Livrées" },
  { value: "annulee", label: "Annulées" },
  { value: "", label: "Toutes" },
];

export function OrdersTab() {
  const [statut, setStatut] = useState<OrderStatut | "">("en_attente");
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["admin-orders", statut, debounced],
    queryFn: async () =>
      (await api.get("/admin/orders", { params: { statut: statut || undefined, q: debounced || undefined, limit: 100 } })).data.data,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Statut des commandes">
          {FILTRES.map((f) => (
            <button
              key={f.value || "toutes"}
              type="button"
              role="radio"
              aria-checked={statut === f.value}
              onClick={() => setStatut(f.value)}
              className={cn(
                "h-8 rounded-full border px-3 text-xs font-semibold transition-colors",
                statut === f.value ? "border-brand-orange bg-brand-orange text-white" : "border-brand-border text-brand-muted hover:text-white",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted" />
          <Input
            placeholder="N° de commande ou client"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 bg-brand-surface border-brand-border text-white placeholder:text-brand-muted"
            aria-label="Rechercher une commande"
          />
        </div>
      </div>

      <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg bg-brand-black" />)}
          </div>
        ) : !orders?.length ? (
          <EmptyState message={statut === "en_attente" ? "Aucune commande en attente" : "Aucune commande"} icon={ShoppingCart} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-border">
                  {["N°", "Date", "Client", "Articles", "Total", "Statut", ""].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const st = ORDER_STATUS[o.statut];
                  const articles = o.items.reduce((n, i) => n + i.quantite, 0);
                  return (
                    <tr key={o.id} className="border-b border-brand-border/50 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <Link href={`/boutique/commandes/${o.id}`} className="text-white text-sm font-semibold font-mono hover:text-brand-orange">
                          {o.numero}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-brand-muted text-sm whitespace-nowrap">{formatDateTime(o.created_at)}</td>
                      <td className="px-4 py-3 text-sm">
                        <p className="text-white">{o.user ? `${o.user.prenom} ${o.user.nom}` : "Compte supprimé"}</p>
                        {(o.telephone || o.user?.telephone) && <p className="text-brand-muted text-xs">{o.telephone ?? o.user?.telephone}</p>}
                      </td>
                      <td className="px-4 py-3 text-brand-muted text-sm">{articles}</td>
                      <td className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">{formatFcfa(o.total)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium border", st.className)}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/boutique/commandes/${o.id}`} className="inline-flex text-brand-muted hover:text-white" aria-label={`Ouvrir la commande ${o.numero}`}>
                          <ChevronRight className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
