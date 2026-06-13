"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Award, Pencil, Trash2, Loader2 } from "lucide-react";
import { TopBar } from "@/components/admin/TopBar";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
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

const schema = z.object({
  nom: z.string().min(1, "Nom requis"),
  description: z.string().optional(),
  type: z.enum(["competition", "grade", "assiduite", "anciennete", "special"]),
});
type FormData = z.infer<typeof schema>;

interface Badge { id: string; nom: string; description?: string; type: string; }

const typeColors: Record<string, string> = {
  competition: "text-yellow-400 bg-yellow-400/10",
  grade: "text-blue-400 bg-blue-400/10",
  assiduite: "text-green-400 bg-green-400/10",
  anciennete: "text-purple-400 bg-purple-400/10",
  special: "text-brand-orange bg-brand-orange/10",
};

export default function BadgesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editBadge, setEditBadge] = useState<Badge | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Badge | null>(null);

  const { data: badges, isLoading } = useQuery<Badge[]>({
    queryKey: ["badges"],
    queryFn: async () => (await api.get("/badges")).data.data,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "competition" },
  });

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      editBadge ? api.put(`/badges/${editBadge.id}`, data) : api.post("/badges", data),
    onSuccess: () => {
      toast.success(editBadge ? "Badge modifié" : "Badge créé");
      queryClient.invalidateQueries({ queryKey: ["badges"] });
      setModalOpen(false); setEditBadge(null); reset();
    },
    onError: () => toast.error("Erreur"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/badges/${id}`),
    onSuccess: () => { toast.success("Badge supprimé"); queryClient.invalidateQueries({ queryKey: ["badges"] }); setDeleteTarget(null); },
    onError: () => toast.error("Erreur"),
  });

  const openEdit = (b: Badge) => {
    setEditBadge(b);
    setValue("nom", b.nom);
    setValue("description", b.description ?? "");
    setValue("type", b.type as FormData["type"]);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Badges" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex justify-end">
          <Button onClick={() => { setEditBadge(null); reset(); setModalOpen(true); }}
            className="bg-brand-orange hover:bg-brand-orange-light text-white">
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
              <div key={b.id} className="bg-brand-surface rounded-xl border border-brand-border p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${typeColors[b.type] ?? "bg-gray-400/10 text-gray-400"}`}>
                    <Award className="size-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(b)} className="text-brand-muted hover:text-white h-7 w-7 p-0">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(b)} className="text-brand-muted hover:text-red-400 h-7 w-7 p-0">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <h3 className="text-white font-semibold text-sm">{b.nom}</h3>
                <p className="text-brand-muted text-xs mt-1 line-clamp-2">{b.description ?? "—"}</p>
                <span className="mt-2 inline-flex px-2 py-0.5 rounded-full text-xs bg-white/5 text-brand-muted">{b.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-brand-surface border-brand-border text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editBadge ? "Modifier le badge" : "Nouveau badge"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4 mt-2">
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
              <Select defaultValue={editBadge?.type ?? "competition"} onValueChange={(v) => setValue("type", v as FormData["type"])}>
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
        title="Supprimer le badge" description={`Supprimer "${deleteTarget?.nom}" ?`}
        variant="destructive" confirmLabel="Supprimer" loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget!.id)} />
    </div>
  );
}
