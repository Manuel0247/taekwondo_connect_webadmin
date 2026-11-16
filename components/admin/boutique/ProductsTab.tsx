"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Loader2, Package, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useCategories } from "./CategoriesTab";
import { apiMessage, formatFcfa, type Product } from "@/lib/boutique";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const fieldCls = "bg-brand-black border-brand-border text-white placeholder:text-brand-muted";
const MAX_PHOTOS = 8;

function uploadError(err: unknown): string {
  const res = (err as { response?: { status?: number; data?: { error?: { details?: Record<string, string[]> } } } })?.response;
  const detail = res?.data?.error?.details?.file?.[0];
  if (detail === "validation.max.file") return "L'image dépasse 5 Mo.";
  if (detail === "validation.mimes" || detail === "validation.image") return "Format non supporté : JPG, PNG ou WebP.";
  if (res?.status === 429) return "Trop d'envois en peu de temps, réessayez dans une minute.";
  return apiMessage(err, "Envoi de la photo impossible");
}

export function ProductsTab() {
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["admin-products"],
    queryFn: async () => (await api.get("/admin/shop/products", { params: { limit: 100 } })).data.data,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["shop-categories"] });
  };

  const toggle = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<Product, "disponible" | "actif">> }) =>
      api.put(`/admin/shop/products/${id}`, patch),
    onSuccess: refresh,
    onError: (e) => toast.error(apiMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/shop/products/${id}`),
    onSuccess: () => {
      toast.success("Produit supprimé");
      setToDelete(null);
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e)),
  });

  const needle = q.trim().toLowerCase();
  const filtered = (products ?? []).filter(
    (p) => (!categoryId || p.category_id === categoryId) && (!needle || p.nom.toLowerCase().includes(needle)),
  );
  // Le produit en cours d'édition est relu dans la liste (photos ajoutées entre-temps)
  const current = editing && editing !== "new" ? (products ?? []).find((p) => p.id === editing.id) ?? editing : editing;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted" />
          <Input placeholder="Rechercher un produit…" value={q} onChange={(e) => setQ(e.target.value)} className={cn(fieldCls, "pl-9 bg-brand-surface")} />
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-10 rounded-md border border-brand-border bg-brand-surface px-3 text-sm text-white"
          aria-label="Filtrer par catégorie"
        >
          <option value="">Toutes les catégories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
        <Button onClick={() => setEditing("new")} className="bg-brand-orange hover:bg-brand-orange-light text-white ml-auto">
          <Plus className="size-4 mr-1.5" />Ajouter un produit
        </Button>
      </div>

      <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg bg-brand-black" />)}
          </div>
        ) : !filtered.length ? (
          <EmptyState message={products?.length ? "Aucun produit ne correspond" : "Aucun produit : ajoutez le premier"} icon={Package} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-border">
                  {["", "Produit", "Catégorie", "Prix", "Tailles", "Disponible", "En vente", ""].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className={cn("border-b border-brand-border/50", !p.actif && "opacity-60")}>
                    <td className="pl-4 py-2 w-16">
                      <div className="size-12 rounded-lg overflow-hidden border border-brand-border bg-brand-black grid place-items-center">
                        {p.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl(p.images[0])} alt="" className="size-full object-cover" />
                        ) : (
                          <Package className="size-5 text-brand-muted" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setEditing(p)} className="text-white text-sm font-medium hover:text-brand-orange text-left">
                        {p.nom}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-brand-muted text-sm">{p.category?.nom ?? "—"}</td>
                    <td className="px-4 py-3 text-white text-sm whitespace-nowrap">{formatFcfa(p.prix)}</td>
                    <td className="px-4 py-3 text-brand-muted text-xs max-w-40 truncate">{p.tailles?.join(", ") || "Taille unique"}</td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={p.disponible}
                        label={p.disponible ? "Disponible" : "Épuisé"}
                        onChange={(v) => toggle.mutate({ id: p.id, patch: { disponible: v } })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={p.actif}
                        label={p.actif ? "Visible" : "Masqué"}
                        onChange={(v) => toggle.mutate({ id: p.id, patch: { actif: v } })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => setEditing(p)} className="text-brand-muted hover:text-white" aria-label={`Modifier ${p.nom}`}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setToDelete(p)} className="text-brand-muted hover:text-red-400" aria-label={`Supprimer ${p.nom}`}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductDialog
        key={current === "new" ? "new" : current?.id ?? "none"}
        product={current}
        onClose={() => setEditing(null)}
        onSaved={(p, created) => {
          refresh();
          // Après création, on reste dans la fenêtre pour ajouter les photos
          if (created) setEditing(p);
          else setEditing(null);
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Supprimer « ${toDelete?.nom} » ?`}
        description="Le produit disparaît de la boutique. Les commandes déjà passées le gardent dans leur détail. Pour le retirer temporairement, décochez plutôt « En vente »."
        confirmLabel="Supprimer"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-xs font-medium"
    >
      <span className={cn("relative h-5 w-9 rounded-full transition-colors", checked ? "bg-brand-green" : "bg-brand-border")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </span>
      <span className={checked ? "text-white" : "text-brand-muted"}>{label}</span>
    </button>
  );
}

function ProductDialog({
  product,
  onClose,
  onSaved,
}: {
  product: Product | "new" | null;
  onClose: () => void;
  onSaved: (p: Product, created: boolean) => void;
}) {
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const existing = product && product !== "new" ? product : null;
  const fileRef = useRef<HTMLInputElement>(null);

  const [nom, setNom] = useState(existing?.nom ?? "");
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? "");
  const [prix, setPrix] = useState(existing ? String(existing.prix) : "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [tailles, setTailles] = useState(existing?.tailles?.join(", ") ?? "");
  const [disponible, setDisponible] = useState(existing?.disponible ?? true);
  const [actif, setActif] = useState(existing?.actif ?? true);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const images = existing?.images ?? [];

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        nom: nom.trim(),
        category_id: categoryId || null,
        prix: Number(prix),
        description: description.trim() || null,
        tailles: tailles.split(/[,;]/).map((t) => t.trim()).filter(Boolean),
        disponible,
        actif,
      };
      const res = existing
        ? await api.put(`/admin/shop/products/${existing.id}`, payload)
        : await api.post("/admin/shop/products", payload);
      return res.data.data as Product;
    },
    onSuccess: (p) => {
      toast.success(existing ? "Produit mis à jour" : "Produit créé : ajoutez maintenant ses photos");
      onSaved(p, !existing);
    },
    onError: (e) => setError(apiMessage(e)),
  });

  const setImages = useMutation({
    mutationFn: (next: string[]) => api.put(`/admin/shop/products/${existing!.id}`, { images: next }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
    onError: (e) => toast.error(apiMessage(e)),
  });

  const upload = async (files: FileList) => {
    if (!existing) return;
    const list = Array.from(files).slice(0, MAX_PHOTOS - images.length);
    for (const file of list) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} : image trop lourde (max 5 Mo)`);
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const fd = new FormData();
        fd.append("model", "produit");
        fd.append("model_id", existing.id);
        fd.append("collection", "images");
        fd.append("file", file);
        await api.post("/uploads/image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      } catch (e) {
        toast.error(uploadError(e));
      } finally {
        setUploading((n) => n - 1);
      }
    }
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const removeImage = (path: string) => {
    setImages.mutate(images.filter((i) => i !== path));
    api.delete(`/uploads/${path}`).catch(() => {});
  };

  const prixValide = prix.trim() !== "" && !isNaN(Number(prix)) && Number(prix) >= 0;
  const canSave = nom.trim() !== "" && prixValide && !save.isPending;

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-brand-surface border-brand-border text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{existing ? existing.nom : "Nouveau produit"}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (canSave) save.mutate();
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-white" htmlFor="p-nom">Nom</Label>
              <Input id="p-nom" className={fieldCls} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Dobok enfant WT" maxLength={150} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white" htmlFor="p-cat">Catégorie</Label>
              <select
                id="p-cat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="h-10 w-full rounded-md border border-brand-border bg-brand-black px-3 text-sm text-white"
              >
                <option value="">Sans catégorie</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white" htmlFor="p-prix">Prix en FCFA</Label>
              <Input id="p-prix" className={fieldCls} inputMode="numeric" value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="15000" />
              {prix.trim() !== "" && !prixValide && <p className="text-xs text-red-400">Montant invalide</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-white" htmlFor="p-tailles">Tailles proposées (facultatif)</Label>
              <Input id="p-tailles" className={fieldCls} value={tailles} onChange={(e) => setTailles(e.target.value)} placeholder="110, 120, 130, 140 ou S, M, L" />
              <p className="text-xs text-brand-muted">Séparées par des virgules. Vide = taille unique : le client n&apos;a pas de taille à choisir.</p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-white" htmlFor="p-desc">Description (facultatif)</Label>
              <textarea
                id="p-desc"
                rows={3}
                className={cn("w-full rounded-md border px-3 py-2 text-sm", fieldCls)}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <Switch checked={disponible} label={disponible ? "Disponible" : "Épuisé (visible, non commandable)"} onChange={setDisponible} />
            <Switch checked={actif} label={actif ? "En vente" : "Masqué de la boutique"} onChange={setActif} />
          </div>

          {/* Photos : ajoutées une fois le produit créé (l'envoi a besoin de son identifiant) */}
          <div className="space-y-2 border-t border-brand-border pt-4">
            <Label className="text-white">Photos</Label>
            {!existing ? (
              <p className="text-sm text-brand-muted">Enregistrez le produit pour pouvoir ajouter ses photos.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-3">
                  {images.map((path, i) => (
                    <div key={path} className="relative size-24 rounded-lg overflow-hidden border border-brand-border bg-brand-black group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl(path)} alt="" className="size-full object-cover" />
                      {i === 0 && (
                        <span className="absolute left-1 top-1 rounded bg-brand-orange px-1.5 py-0.5 text-[10px] font-bold">Principale</span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 p-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={i === 0 || setImages.isPending}
                          onClick={() => setImages.mutate([path, ...images.filter((x) => x !== path)])}
                          className="p-1 text-white disabled:opacity-30"
                          aria-label="Mettre en photo principale"
                          title="Photo principale"
                        >
                          <Star className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={setImages.isPending}
                          onClick={() => removeImage(path)}
                          className="p-1 text-red-400"
                          aria-label="Retirer la photo"
                          title="Retirer"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {images.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading > 0}
                      className="size-24 rounded-lg border border-dashed border-brand-border grid place-items-center text-brand-muted hover:border-brand-orange hover:text-white transition-colors"
                      aria-label="Ajouter des photos"
                    >
                      {uploading > 0 ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  hidden
                  onChange={(e) => {
                    if (e.target.files?.length) upload(e.target.files);
                    e.target.value = "";
                  }}
                />
                <p className="text-xs text-brand-muted">JPG, PNG ou WebP, 5 Mo maximum, {MAX_PHOTOS} photos au plus. La première est affichée dans la liste.</p>
              </>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-brand-border bg-transparent text-white hover:bg-white/5">
              Fermer
            </Button>
            <Button type="submit" disabled={!canSave} className="bg-brand-orange hover:bg-brand-orange-light text-white">
              {save.isPending && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {existing ? "Enregistrer" : "Créer le produit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
