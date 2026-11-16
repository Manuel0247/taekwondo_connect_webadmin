"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { apiMessage, type ProductCategory } from "@/lib/boutique";
import api from "@/lib/api";

const fieldCls = "bg-brand-black border-brand-border text-white placeholder:text-brand-muted";

export function useCategories() {
  return useQuery<ProductCategory[]>({
    queryKey: ["shop-categories"],
    queryFn: async () => (await api.get("/shop/categories")).data.data,
  });
}

export function CategoriesTab() {
  const qc = useQueryClient();
  const { data: categories, isLoading } = useCategories();
  const [nom, setNom] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNom, setEditNom] = useState("");
  const [toDelete, setToDelete] = useState<ProductCategory | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["shop-categories"] });
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const create = useMutation({
    mutationFn: (n: string) => api.post("/admin/shop/categories", { nom: n, ordre: categories?.length ?? 0 }),
    onSuccess: () => {
      toast.success("Catégorie ajoutée");
      setNom("");
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e)),
  });

  const rename = useMutation({
    mutationFn: ({ id, n }: { id: string; n: string }) => api.put(`/admin/shop/categories/${id}`, { nom: n }),
    onSuccess: () => {
      toast.success("Catégorie renommée");
      setEditId(null);
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/shop/categories/${id}`),
    onSuccess: () => {
      toast.success("Catégorie supprimée");
      setToDelete(null);
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e)),
  });

  return (
    <div className="max-w-2xl space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (nom.trim()) create.mutate(nom.trim());
        }}
      >
        <Input
          className={fieldCls}
          placeholder="Nouvelle catégorie (ex. Tenues, Protections, Accessoires)"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          aria-label="Nom de la catégorie"
          maxLength={100}
        />
        <Button type="submit" disabled={!nom.trim() || create.isPending} className="bg-brand-orange hover:bg-brand-orange-light text-white">
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4 mr-1.5" />}
          Ajouter
        </Button>
      </form>

      <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg bg-brand-black" />)}
          </div>
        ) : !categories?.length ? (
          <EmptyState message="Aucune catégorie : ajoutez-en une pour classer vos produits" />
        ) : (
          <ul className="divide-y divide-brand-border">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                {editId === c.id ? (
                  <form
                    className="flex flex-1 gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (editNom.trim()) rename.mutate({ id: c.id, n: editNom.trim() });
                    }}
                  >
                    <Input className={fieldCls} value={editNom} onChange={(e) => setEditNom(e.target.value)} autoFocus aria-label="Nouveau nom" />
                    <Button type="submit" size="icon" disabled={rename.isPending} className="bg-brand-green hover:bg-brand-green/90 text-white" aria-label="Enregistrer">
                      {rename.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    </Button>
                    <Button type="button" size="icon" variant="ghost" onClick={() => setEditId(null)} className="text-brand-muted hover:text-white" aria-label="Annuler">
                      <X className="size-4" />
                    </Button>
                  </form>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{c.nom}</p>
                      <p className="text-brand-muted text-xs">
                        {c.products_count ?? 0} produit{(c.products_count ?? 0) > 1 ? "s" : ""} en vente
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditId(c.id);
                        setEditNom(c.nom);
                      }}
                      className="text-brand-muted hover:text-white"
                      aria-label={`Renommer ${c.nom}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setToDelete(c)} className="text-brand-muted hover:text-red-400" aria-label={`Supprimer ${c.nom}`}>
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Supprimer « ${toDelete?.nom} » ?`}
        description="Les produits de cette catégorie restent en vente, sans catégorie."
        confirmLabel="Supprimer"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}
