"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, Plus, Loader2 } from "lucide-react";
import { TopBar } from "@/components/admin/TopBar";
import { EmptyState } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { z } from "zod";
import api from "@/lib/api";

const pointsSchema = z.object({
  athlete_id: z.string().min(1),
  points: z.number().int().min(1),
  categorie: z.enum(["poids", "grade", "age"]),
  valeur_categorie: z.string().min(1),
  saison: z.string().min(4),
});
type PointsForm = z.infer<typeof pointsSchema>;

interface Ranking { id: string; position: number; points: number; athlete?: { prenom: string; nom: string }; club?: { nom: string }; }

export default function RankingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("grade");
  const [saison, setSaison] = useState("2026");
  const [modalOpen, setModalOpen] = useState(false);

  const { data: rankings, isLoading } = useQuery<Ranking[]>({
    queryKey: ["rankings", tab, saison],
    queryFn: async () => (await api.get("/rankings", { params: { categorie: tab, saison } })).data.data,
  });

  const recalcMutation = useMutation({
    mutationFn: () => api.post("/admin/rankings/recalculate"),
    onSuccess: () => { toast.success("Classements recalculés"); queryClient.invalidateQueries({ queryKey: ["rankings"] }); },
    onError: () => toast.error("Erreur"),
  });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<PointsForm>({
    resolver: zodResolver(pointsSchema) as unknown as Resolver<PointsForm>,
    defaultValues: { categorie: "grade", saison: "2026" },
  });

  const addPointsMutation = useMutation({
    mutationFn: (data: PointsForm) => api.put(`/admin/rankings/athlete/${data.athlete_id}/points`, data),
    onSuccess: () => {
      toast.success("Points ajoutés");
      queryClient.invalidateQueries({ queryKey: ["rankings"] });
      setModalOpen(false); reset();
    },
    onError: () => toast.error("Erreur"),
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Classements" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-white text-sm">Saison :</Label>
            <Select value={saison} onValueChange={setSaison}>
              <SelectTrigger className="w-28 bg-brand-surface border-brand-border text-white h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-brand-surface border-brand-border text-white">
                {["2026", "2025", "2024"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => recalcMutation.mutate()} disabled={recalcMutation.isPending}
              className="border-brand-border text-white hover:bg-white/5 h-9">
              {recalcMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <RefreshCw className="size-4 mr-1.5" />}
              Recalculer
            </Button>
            <Button onClick={() => setModalOpen(true)} className="bg-brand-orange hover:bg-brand-orange-light text-white h-9">
              <Plus className="size-4 mr-1.5" />Ajouter des points
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-brand-surface border border-brand-border">
            {[["grade","Par grade"],["poids","Par poids"],["age","Par âge"]].map(([v,l]) => (
              <TabsTrigger key={v} value={v} className="data-[state=active]:bg-brand-orange data-[state=active]:text-white text-brand-muted">
                {l}
              </TabsTrigger>
            ))}
          </TabsList>
          {["grade","poids","age"].map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-4">
              <div className="bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
                {isLoading ? (
                  <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg bg-brand-black" />)}</div>
                ) : !rankings?.length ? <EmptyState message="Aucun classement" /> : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-brand-border">
                        {["#","Athlète","Club","Points"].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-brand-muted text-xs font-medium uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map((r) => (
                        <tr key={r.id} className="border-b border-brand-border/50 hover:bg-white/2">
                          <td className="px-5 py-3">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                              ${r.position === 1 ? "bg-yellow-500 text-white" : r.position === 2 ? "bg-gray-400 text-white" : r.position === 3 ? "bg-amber-600 text-white" : "bg-brand-black text-brand-muted"}`}>
                              {r.position}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-white text-sm font-medium">{r.athlete?.prenom} {r.athlete?.nom}</td>
                          <td className="px-5 py-3 text-brand-muted text-sm">{r.club?.nom ?? "—"}</td>
                          <td className="px-5 py-3 text-brand-orange font-bold text-sm">{r.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-brand-surface border-brand-border text-white max-w-md">
          <DialogHeader><DialogTitle className="text-white">Ajouter des points</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => addPointsMutation.mutate(d))} className="space-y-4 mt-2">
            {[["ID Athlète", "athlete_id", "uuid…"], ["Points", "points", "50"], ["Valeur catégorie", "valeur_categorie", "-80kg"], ["Saison", "saison", "2026"]].map(([lbl, name, ph]) => (
              <div key={name} className="space-y-1.5">
                <Label className="text-white">{lbl}</Label>
                <Input type={name === "points" ? "number" : "text"} placeholder={ph}
                  className="bg-brand-black border-brand-border text-white placeholder:text-brand-muted"
                  {...register(name as keyof PointsForm)} />
                {errors[name as keyof PointsForm] && <p className="text-red-400 text-xs">{errors[name as keyof PointsForm]?.message as string}</p>}
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-white">Catégorie</Label>
              <Select defaultValue="grade" onValueChange={(v) => setValue("categorie", v as PointsForm["categorie"])}>
                <SelectTrigger className="bg-brand-black border-brand-border text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-brand-surface border-brand-border text-white">
                  {[["grade","Grade"],["poids","Poids"],["age","Âge"]].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={addPointsMutation.isPending} className="w-full bg-brand-orange hover:bg-brand-orange-light text-white">
              {addPointsMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Ajouter"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
