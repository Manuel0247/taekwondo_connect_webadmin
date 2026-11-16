"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingCart, Tags } from "lucide-react";
import { TopBar } from "@/components/admin/TopBar";
import { OrdersTab } from "@/components/admin/boutique/OrdersTab";
import { ProductsTab } from "@/components/admin/boutique/ProductsTab";
import { CategoriesTab } from "@/components/admin/boutique/CategoriesTab";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

type Onglet = "commandes" | "produits" | "categories";

const ONGLETS: { value: Onglet; label: string; icon: typeof Package }[] = [
  { value: "commandes", label: "Commandes", icon: ShoppingCart },
  { value: "produits", label: "Produits", icon: Package },
  { value: "categories", label: "Catégories", icon: Tags },
];

export default function BoutiquePage() {
  const [onglet, setOnglet] = useState<Onglet>("commandes");

  const { data: pending = 0 } = useQuery({
    queryKey: ["orders-pending-count"],
    queryFn: async () => (await api.get("/admin/orders/pending-count")).data.data.count as number,
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Boutique" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div role="tablist" aria-label="Boutique" className="inline-flex rounded-lg border border-brand-border bg-brand-surface p-1">
          {ONGLETS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={onglet === value}
              onClick={() => setOnglet(value)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors",
                onglet === value ? "bg-brand-orange text-white" : "text-brand-muted hover:text-white",
              )}
            >
              <Icon className="size-4" />
              {label}
              {value === "commandes" && pending > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs leading-none",
                    onglet === value ? "bg-white text-brand-orange" : "bg-brand-orange text-white",
                  )}
                >
                  {pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {onglet === "commandes" && <OrdersTab />}
        {onglet === "produits" && <ProductsTab />}
        {onglet === "categories" && <CategoriesTab />}
      </div>
    </div>
  );
}
