"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Award, Pencil, Trash2, Loader2, ImagePlus, Users } from "lucide-react";
import { TopBar } from "@/components/admin/TopBar";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { BadgeIcon } from "@/components/admin/BadgeIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { mediaUrl } from "@/lib/media";

const schema = z.object({
  nom: z.string().min(1, "Nom requis"),
  description: z.string().optional(),
  type: z.enum(["competition", "grade", "assiduite", "anciennete", "special"]),
});
type FormData = z.infer<typeof schema>;

interface Badge { id: string; nom: string; description?: string; type: string; icone_url?: string | null; }

const ACCEPT_ICON = "image/png,image/jpeg,image/webp";
const MAX_ICON_MB = 5;

function apiErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
}

export default function BadgesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editBadge, setEditBadge] = useState<Badge | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Badge | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  const { data: badges, isLoading } = useQuery<Badge[]>({
    queryKey: ["badges"],
    queryFn: async () => (await api.get("/badges")).data.data,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "competition" },
  });
  const type = watch("type");

  const closeModal = () => {
    setModalOpen(false);
    setEditBadge(null);
    setIconFile(null);
    setIconPreview(null);
    reset({ nom: "", description: "", type: "competition" });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = editBadge ? await api.put(`/badges/${editBadge.id}`, data) : await api.post("/badges", data);
      const badgeId: string = res.data.data?.id ?? editBadge?.id;
      // L'icône s'envoie une fois le badge créé (il faut son identifiant)
      if (iconFile && badgeId) {
        const formData = new FormData();
        formData.append("model", "badge");
        formData.append("model_id", badgeId);
        formData.append("collection", "icone");
        formData.append("file", iconFile);
        await api.post("/uploads/image", formData, { headers: { "Content-Type": "multipart/form-data" } });
      }
    },
    onSuccess: () => {
      toast.success(editBadge ? "Badge modifié" : "Badge créé");
      queryClient.invalidateQueries({ queryKey: ["badges"] });
      closeModal();
    },
    onError: (err) => toast.error("Enregistrement impossible", { description: apiErrorMessage(err) }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/badges/${id}`),
    onSuccess: () => { toast.success("Badge supprimé"); queryClient.invalidateQueries({ queryKey: ["badges"] }); setDeleteTarget(null); },
    onError: (err) => toast.error("Suppression impossible", { description: apiErrorMessage(err) }),
  });

  const openCreate = () => {
    closeModal();
    setModalOpen(true);
  };

  const openEdit = (b: Badge) => {
    setEditBadge(b);
    reset({ nom: b.nom, description: b.description ?? "", type: b.type as FormData["type"] });
    setIconFile(null);
    setIconPreview(mediaUrl(b.icone_url) ?? null);
    setModalOpen(true);
  };

  const onIconChange = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_ICON_MB * 1024 * 1024) {
      toast.error(`Icône trop lourde (max ${MAX_ICON_MB} Mo)`);
      return;
    }
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Badges" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex justify-end">
          <Button onClick={openCreate} className="bg-brand-orange hover:bg-brand-orange-light text-white">
            <Plus className="size-4 mr-1.5" />Créer un badge
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl bg-brand-surface" />)}
          </div>
        ) : !badges?.length ? <EmptyState message="Aucun badge" icon={Award} /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((b) => (
              <div key={b.id} className="bg-brand-surface rounded-xl border border-brand-border p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <BadgeIcon badge={b} />
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(b)} className="text-brand-muted hover:text-white h-7 w-7 p-0" title="Modifier">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(b)} className="text-brand-muted hover:text-red-400 h-7 w-7 p-0" title="Supprimer">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <h3 className="text-white font-semibold text-sm">{b.nom}</h3>
                <p className="text-brand-muted text-xs mt-1 line-clamp-2">{b.description || "—"}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-border/50">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-white/5 text-brand-muted">{b.type}</span>
                  <Link href={`/badges/${b.id}`} className="inline-flex items-center gap-1 text-xs text-brand-orange hover:text-brand-orange-light">
                    <Users className="size-3.5" />Détenteurs
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="bg-brand-surface border-brand-border text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editBadge ? "Modifier le badge" : "Nouveau badge"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-white">Icône</Label>
              <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-dashed border-brand-border p-3 hover:bg-white/5">
                {iconPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={iconPreview} alt="Aperçu" className="size-12 rounded-lg object-cover bg-brand-black" />
                ) : (
                  <div className="size-12 rounded-lg bg-brand-black flex items-center justify-center">
                    <ImagePlus className="size-5 text-brand-muted" />
                  </div>
                )}
                <span className="text-sm text-brand-muted">
                  {iconFile ? iconFile.name : iconPreview ? "Changer l'icône" : `PNG, JPG ou WebP — ${MAX_ICON_MB} Mo max`}
                </span>
                <input type="file" accept={ACCEPT_ICON} className="hidden" onChange={(e) => onIconChange(e.target.files?.[0])} />
              </label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white">Nom</Label>
              <Input className="bg-brand-black border-brand-border text-white" {...register("nom")} />
              {errors.nom && <p className="text-red-400 text-xs">{errors.nom.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-white">Description</Label>
              <Input className="bg-brand-black border-brand-border text-white" {...register("description")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white">Type</Label>
              <Select value={type} onValueChange={(v) => setValue("type", v as FormData["type"])}>
                <SelectTrigger className="bg-brand-black border-brand-border text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-brand-surface border-brand-border text-white">
                  {[["competition","Compétition"],["grade","Grade"],["assiduite","Assiduité"],["anciennete","Ancienneté"],["special","Spécial"]].map(([v,l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={saveMutation.isPending} className="w-full bg-brand-orange hover:bg-brand-orange-light text-white">
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : (editBadge ? "Enregistrer" : "Créer")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Supprimer le badge" description={`Supprimer "${deleteTarget?.nom}" ? Les athlètes qui l'ont le perdront.`}
        variant="destructive" confirmLabel="Supprimer" loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget!.id)} />
    </div>
  );
}
