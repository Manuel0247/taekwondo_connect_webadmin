"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
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
  nom_fr: z.string().min(1),
  nom_korean: z.string().optional(),
  discipline: z.enum(["taekwondo_sport", "taekwondo_traditionnel", "poomsae", "self_defense"]),
  niveau: z.enum(["debutant", "intermediaire", "avance"]),
  type: z.enum(["coup_de_pied", "coup_de_poing", "blocage", "deplacement", "poomsae"]),
});
type FormData = z.infer<typeof schema>;

interface Technique { id: string; nom_fr: string; nom_korean?: string; discipline: string; niveau: string; type: string; }

const niveauColors: Record<string, string> = {
  debutant: "bg-green-500/15 text-green-400",
  intermediaire: "bg-yellow-500/15 text-yellow-400",
  avance: "bg-red-500/15 text-red-400",
};

export default function TechniquesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTech, setEditTech] = useState<Technique | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Technique | null>(null);

  const { data: techniques, isLoading } = useQuery<Technique[]>({
    queryKey: ["techniques"],
    queryFn: async () => (await api.get("/techniques")).data.data,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { discipline: "taekwondo_sport", niveau: "debutant", type: "coup_de_pied" },
  });

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      editTech ? api.put(`/techniques/${editTech.id}`, data) : api.post("/techniques", data),
    onSuccess: () => {
      toast.success(editTech ? "Technique modifiée" : "Technique créée");
      queryClient.invalidateQueries({ queryKey: ["techniques"] });
      setModalOpen(false); setEditTech(null); reset();
    },
    onError: () => toast.error("Erreur"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/techniques/${id}`),
    onSuccess: () => { toast.success("Technique supprimée"); queryClient.invalidateQueries({ queryKey: ["techniques"] }); setDeleteTarget(null); },
    onError: () => toast.error("Erreur"),
  });

  const openCreate = () => { setEditTech(null); reset(); setModalOpen(true); };
  const openEdit = (t: Technique) => {
    setEditTech(t);
    setValue("nom_fr", t.nom_fr);
    setValue("nom_korean", t.nom_korean ?? "");
    setValue("discipline", t.discipline as FormData["discipline"]);
    setValue("niveau", t.niveau as FormData["niveau"]);
    setValue("type", t.type as FormData["type"]);
    setModalOpen(true);
  };

  const filtered = (techniques ?? []).filter((t) =>
    t.nom_fr.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Techniques" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted" />
            <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-brand-surface border-brand-border text-white placeholder:text-brand-muted" />
          </div>
          <Button onClick={openCreate} className="bg-brand-orange hover:bg-brand-orange-light text-white">
            <Plus className="size-4 mr-1.5" />Ajouter
          </Button>
        </div>

        <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg bg-brand-black" />)}</div>
          ) : !filtered.length ? <EmptyState message="Aucune technique" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-border">
                    {["Nom", "Coréen", "Discipline", "Niveau", "Type", ""].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-b border-brand-border/50 hover:bg-white/2">
                      <td className="px-5 py-3 text-white text-sm font-medium">{t.nom_fr}</td>
                      <td className="px-5 py-3 text-brand-muted text-sm italic">{t.nom_korean ?? "—"}</td>
                      <td className="px-5 py-3 text-brand-muted text-sm">{t.discipline.replace(/_/g, " ")}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${niveauColors[t.niveau] ?? ""}`}>
                          {t.niveau}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-brand-muted text-sm">{t.type.replace(/_/g, " ")}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(t)} className="text-brand-muted hover:text-white h-7 w-7 p-0">
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(t)} className="text-brand-muted hover:text-red-400 h-7 w-7 p-0">
                            <Trash2 className="size-3.5" />
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
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-brand-surface border-brand-border text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editTech ? "Modifier" : "Nouvelle technique"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4 mt-2">
            {[["Nom en français", "nom_fr", "Coup de pied sauté…"], ["Nom coréen", "nom_korean", "Twio chagi…"]].map(([label, name, ph]) => (
              <div key={name} className="space-y-1.5">
                <Label className="text-white">{label}</Label>
                <Input placeholder={ph} className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted" {...register(name as keyof FormData)} />
                {errors[name as keyof FormData] && <p className="text-red-400 text-xs">{errors[name as keyof FormData]?.message as string}</p>}
              </div>
            ))}
            {[
              { label: "Discipline", name: "discipline", options: [["taekwondo_sport","TKD Sport"],["taekwondo_traditionnel","TKD Trad."],["poomsae","Poomsae"],["self_defense","Self-défense"]] },
              { label: "Niveau", name: "niveau", options: [["debutant","Débutant"],["intermediaire","Intermédiaire"],["avance","Avancé"]] },
              { label: "Type", name: "type", options: [["coup_de_pied","Coup de pied"],["coup_de_poing","Coup de poing"],["blocage","Blocage"],["deplacement","Déplacement"],["poomsae","Poomsae"]] },
            ].map(({ label, name, options }) => (
              <div key={name} className="space-y-1.5">
                <Label className="text-white">{label}</Label>
                <Select defaultValue={editTech?.[name as keyof Technique] as string ?? options[0][0]} onValueChange={(v) => setValue(name as keyof FormData, v as never)}>
                  <SelectTrigger className="bg-brand-black border-brand-border text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-brand-surface border-brand-border text-white">
                    {options.map(([val, lbl]) => <SelectItem key={val} value={val}>{lbl}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <Button type="submit" disabled={saveMutation.isPending} className="w-full bg-brand-orange hover:bg-brand-orange-light text-white">
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : (editTech ? "Enregistrer" : "Créer")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Supprimer la technique" description={`Supprimer "${deleteTarget?.nom_fr}" ?`}
        variant="destructive" confirmLabel="Supprimer" loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget!.id)} />
    </div>
  );
}
